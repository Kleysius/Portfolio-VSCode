/**
 * Windows Terminal : onglets multiples, PowerShell simulé.
 */
import { el, html, raw } from '../core/dom.js';
import { appIconUrl, ui } from '../core/icons.js';
import { wm } from '../os/window-manager.js';
import { resolvePath, filesystem } from '../data/filesystem.js';
import { showContextMenu } from '../os/context-menu.js';
import { launch } from '../os/apps.js';
import { Shell, createTerminalView } from './shell.js';

const svg = (markup) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(markup)}`;
const PS_ICON = `data:image/svg+xml;charset=utf-8,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><rect x="1" y="2" width="14" height="12" rx="2" fill="#2671be"/><path d="m4 5 3.5 3L4 11" fill="none" stroke="#fff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M8.5 11h3.5" stroke="#fff" stroke-width="1.5" stroke-linecap="round"/></svg>')}`;

const CMD_ICON = svg('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><rect x="1" y="2" width="14" height="12" rx="1.5" fill="#1f1f1f" stroke="#8a8a8a"/><path d="M1 4.5h14" stroke="#8a8a8a"/><path d="m3.5 7 2 1.5-2 1.5" fill="none" stroke="#fff" stroke-linecap="round" stroke-linejoin="round"/><path d="M7 11h3" stroke="#fff" stroke-linecap="round"/></svg>');
const UBUNTU_ICON = svg('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><circle cx="8" cy="8" r="7" fill="#e95420"/><circle cx="8" cy="8" r="3.2" fill="none" stroke="#fff" stroke-width="1.4"/><circle cx="3.6" cy="8" r="1.3" fill="#fff" stroke="#e95420" stroke-width=".6"/><circle cx="10.2" cy="4.2" r="1.3" fill="#fff" stroke="#e95420" stroke-width=".6"/><circle cx="10.2" cy="11.8" r="1.3" fill="#fff" stroke="#e95420" stroke-width=".6"/></svg>');

/** Profils Windows Terminal : chacun a son icône, son invite, sa bannière et sa couleur de fond. */
const PROFILES = {
    pwsh: {
        title: 'Windows PowerShell',
        icon: PS_ICON,
        background: '#0c0c0c',
        shortcut: 'Ctrl+Maj+1',
        banner: [
            'Windows PowerShell',
            'Copyright (C) Microsoft Corporation. Tous droits réservés.',
            '',
            'Installez la dernière version de PowerShell pour de nouvelles fonctionnalités et améliorations ! https://aka.ms/PSWindows',
            '',
            `Bienvenue ! Tapez <span class="t-yellow">help</span> pour la liste des commandes, ou <span class="t-yellow">neofetch</span> pour commencer.`,
            '',
        ],
    },
    cmd: {
        title: 'Invite de commandes',
        icon: CMD_ICON,
        background: '#0c0c0c',
        shortcut: 'Ctrl+Maj+2',
        banner: [
            'Microsoft Windows [version 10.0.26100.2033]',
            '(c) Microsoft Corporation. Tous droits réservés.',
            '',
        ],
    },
    wsl: {
        title: 'Ubuntu',
        icon: UBUNTU_ICON,
        background: '#300a24',
        shortcut: 'Ctrl+Maj+3',
        banner: [
            'Welcome to Ubuntu 24.04.1 LTS (GNU/Linux 5.15.167.4-microsoft-standard-WSL2 x86_64)',
            '',
            ' * Documentation:  https://help.ubuntu.com',
            ' * Management:     https://landscape.canonical.com',
            ' * Support:        https://ubuntu.com/pro',
            '',
            'This message is shown once a day. To disable it please create the',
            '/home/thomas/.hushlogin file.',
        ],
    },
};

export function open({ cwd, command } = {}) {
    const root = el(html`
        <div class="wt">
            <header class="wt-titlebar" data-drag>
                <div class="wt-tabs" role="tablist"></div>
                <button class="wt-new-tab" type="button" title="Nouvel onglet (Ctrl+Maj+T)" aria-label="Nouvel onglet">${raw(ui.plus)}</button>
                <button class="wt-dropdown" type="button" title="Ouvrir un nouvel onglet" aria-label="Plus d'options">${raw(ui.chevronDown)}</button>
                <div class="wt-drag-space"></div>
            </header>
            <div class="wt-body"></div>
        </div>`);

    const win = wm.open({
        appId: 'terminal',
        title: 'Windows PowerShell',
        icon: appIconUrl('terminal'),
        frame: 'custom',
        width: 860,
        height: 520,
        className: 'window--terminal',
        content: root,
    });
    root.querySelector('.wt-titlebar').append(win.controls);

    const tabsEl = root.querySelector('.wt-tabs');
    const body = root.querySelector('.wt-body');
    const sessions = [];
    let active = null;

    const activate = (session) => {
        active = session;
        sessions.forEach((s) => {
            s.view.element.hidden = s !== session;
            s.tab.classList.toggle('is-active', s === session);
            s.tab.setAttribute('aria-selected', String(s === session));
        });
        win.setTitle(session.title);
        requestAnimationFrame(() => session.view.focus());
    };

    const closeSession = (session) => {
        const index = sessions.indexOf(session);
        sessions.splice(index, 1);
        session.tab.remove();
        session.view.element.remove();
        if (!sessions.length) win.close();
        else if (active === session) activate(sessions[Math.max(0, index - 1)]);
    };

    const addSession = (startCwd, profileId = 'pwsh') => {
        const profile = PROFILES[profileId];
        const shell = new Shell({ cwd: startCwd ?? filesystem, profile: profileId });
        const session = { title: profile.title, profile: profileId };
        shell.onExit = () => closeSession(session);
        session.view = createTerminalView({ shell, className: `wt-term is-${profileId}`, banner: profile.banner });
        session.view.element.style.background = profile.background;
        session.tab = el(html`
            <div class="wt-tab" role="tab" tabindex="0" style="--wt-tab-bg: ${profile.background}">
                <img src="${profile.icon}" alt="">
                <span>${profile.title}</span>
                <button class="wt-tab-close" type="button" aria-label="Fermer l'onglet">${raw(ui.close)}</button>
            </div>`);
        session.tab.addEventListener('click', (event) => {
            if (event.target.closest('.wt-tab-close')) closeSession(session);
            else activate(session);
        });
        session.tab.addEventListener('auxclick', (event) => { if (event.button === 1) closeSession(session); });
        tabsEl.append(session.tab);
        body.append(session.view.element);
        sessions.push(session);
        activate(session);
        return session;
    };

    const profileMenu = () => {
        const rect = root.querySelector('.wt-dropdown').getBoundingClientRect();
        showContextMenu({
            x: rect.left,
            y: rect.bottom + 4,
            anchor: root.querySelector('.wt-dropdown'),
            items: [
                ...Object.entries(PROFILES).map(([id, profile]) => ({
                    label: profile.title,
                    icon: `<img class="wt-profile-icon" src="${profile.icon}" alt="">`,
                    shortcut: profile.shortcut,
                    action: () => addSession(filesystem, id),
                })),
                { separator: true },
                { label: 'Paramètres', icon: ui.settings, shortcut: 'Ctrl+,', action: () => launch('settings') },
                { label: 'Palette de commandes', shortcut: 'Ctrl+Maj+P', disabled: true },
                { label: 'À propos', action: () => active?.view.run('neofetch') },
            ],
        });
    };

    root.querySelector('.wt-new-tab').addEventListener('click', () => addSession(filesystem, active?.profile));
    root.querySelector('.wt-dropdown').addEventListener('click', profileMenu);
    root.addEventListener('keydown', (event) => {
        if (!event.ctrlKey) return;
        const key = event.key.toLowerCase();
        if (event.shiftKey && key === 't') addSession(filesystem, active?.profile);
        else if (event.shiftKey && key === 'w') closeSession(active);
        else if (event.shiftKey && /^Digit[1-3]$/.test(event.code)) addSession(filesystem, Object.keys(PROFILES)[Number(event.code.slice(-1)) - 1]);
        else if (key === 'tab' && sessions.length > 1) {
            const index = sessions.indexOf(active);
            activate(sessions[(index + (event.shiftKey ? -1 : 1) + sessions.length) % sessions.length]);
        } else return;
        event.preventDefault();
    });
    win.on('focus', () => active?.view.focus());

    const first = addSession(cwd ? resolvePath(filesystem, cwd) ?? filesystem : filesystem);
    if (command) first.view.run(command);
    return win;
}
