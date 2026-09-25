/**
 * Windows Terminal : onglets multiples, PowerShell simulé.
 */
import { el, html, raw } from '../core/dom.js';
import { appIconUrl, ui } from '../core/icons.js';
import { wm } from '../os/window-manager.js';
import { resolvePath, filesystem } from '../data/filesystem.js';
import { Shell, createTerminalView } from './shell.js';

const PS_ICON = `data:image/svg+xml;charset=utf-8,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><rect x="1" y="2" width="14" height="12" rx="2" fill="#2671be"/><path d="m4 5 3.5 3L4 11" fill="none" stroke="#fff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M8.5 11h3.5" stroke="#fff" stroke-width="1.5" stroke-linecap="round"/></svg>')}`;

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

    const addSession = (startCwd) => {
        const shell = new Shell({ cwd: startCwd ?? filesystem });
        const session = { title: 'Windows PowerShell' };
        shell.onExit = () => closeSession(session);
        session.view = createTerminalView({
            shell,
            className: 'wt-term',
            banner: [
                'Windows PowerShell',
                'Copyright (C) Microsoft Corporation. Tous droits réservés.',
                '',
                'Installez la dernière version de PowerShell pour de nouvelles fonctionnalités et améliorations ! https://aka.ms/PSWindows',
                '',
                `Bienvenue ! Tapez <span class="t-yellow">help</span> pour la liste des commandes, ou <span class="t-yellow">neofetch</span> pour commencer.`,
                '',
            ],
        });
        session.tab = el(html`
            <div class="wt-tab" role="tab" tabindex="0">
                <img src="${PS_ICON}" alt="">
                <span>Windows PowerShell</span>
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

    root.querySelector('.wt-new-tab').addEventListener('click', () => addSession(active?.view && filesystem));
    root.querySelector('.wt-dropdown').addEventListener('click', () => addSession(filesystem));
    win.on('focus', () => active?.view.focus());

    const first = addSession(cwd ? resolvePath(filesystem, cwd) ?? filesystem : filesystem);
    if (command) first.view.run(command);
    return win;
}
