/**
 * Barre des tâches Windows 11 : widgets météo, Démarrer, recherche, affichage des tâches,
 * applications épinglées/en cours (avec aperçus au survol), icônes cachées, indicateur de
 * langue, zone de notification, horloge et « Afficher le bureau » (Aero Peek).
 */
import { $, $$, el, html, raw, escapeHtml, clamp } from '../core/dom.js';
import { bus } from '../core/bus.js';
import { ui, appIconUrl } from '../core/icons.js';
import { apps, launch } from './apps.js';
import { wm } from './window-manager.js';
import { toggleFlyout, closeFlyouts } from './flyout.js';
import { showContextMenu } from './context-menu.js';
import { system } from './system.js';
import { notifications, notify } from './notifications.js';
import { getWeather } from '../services/weather.js';
import { likes } from '../services/likes.js';
import { toggleTaskView } from './task-view.js';
import { hideTooltip } from './tooltip.js';

const PINNED = ['explorer', 'edge', 'vscode', 'terminal'];

let taskbar;
let appsZone;

export function initTaskbar() {
    taskbar = $('#taskbar');
    taskbar.innerHTML = html`
        <button class="tb-widgets" type="button" aria-label="Widgets">
            <span class="tb-weather-icon" aria-hidden="true">☀️</span>
            <span class="tb-weather-text">
                <span class="tb-weather-temp">--°C</span>
                <span class="tb-weather-desc">Météo</span>
            </span>
        </button>

        <div class="tb-center">
            <button class="tb-btn tb-start" type="button" aria-label="Démarrer" data-tip="Démarrer">
                <img src="${appIconUrl('start')}" alt="" draggable="false">
            </button>
            <button class="tb-search" type="button" aria-label="Rechercher" data-tip="Rechercher">
                ${raw(ui.search)}<span>Rechercher</span>
            </button>
            <button class="tb-btn tb-taskview" type="button" aria-label="Affichage des tâches" data-tip="Affichage des tâches">
                ${raw(ui.taskView)}
            </button>
            <div class="tb-apps" role="list"></div>
        </div>

        <div class="tb-tray">
            <button class="tb-tray-btn tb-overflow" type="button" aria-label="Afficher les icônes cachées" data-tip="Afficher les icônes cachées">${raw(ui.chevronUp)}</button>
            <button class="tb-tray-btn tb-like" type="button" aria-label="J'aime ce portfolio">
                ${raw(ui.heart)}<span class="tb-like-count"></span>
            </button>
            <button class="tb-tray-btn tb-lang" type="button" aria-label="Langue d'entrée" data-tip="Français (France)\nClavier Français\n\nPour changer de méthode d'entrée, appuyez sur Windows + Espace.">
                <span>FRA</span>
            </button>
            <button class="tb-tray-btn tb-quick" type="button" aria-label="Paramètres rapides">
                <span class="tb-quick-wifi" data-tip="Portfolio-5G\nAccès Internet">${raw(ui.wifi)}</span>
                <span class="tb-quick-volume" data-tip="">${raw(ui.volume)}</span>
                <span class="tb-quick-battery" data-tip="Batterie : 100 %\nBranchée, en charge">${raw(ui.batteryCharging)}</span>
            </button>
            <button class="tb-tray-btn tb-clock" type="button" aria-label="Horloge et notifications">
                <span class="tb-clock-text">
                    <span class="tb-time"></span>
                    <span class="tb-date"></span>
                </span>
                <span class="tb-bell">${raw(ui.bell)}<span class="tb-bell-badge" hidden></span></span>
            </button>
            <button class="tb-show-desktop" type="button" aria-label="Afficher le Bureau" data-tip="Afficher le Bureau"></button>
        </div>`;

    appsZone = $('.tb-apps', taskbar);

    $('.tb-start', taskbar).addEventListener('click', () => toggleFlyout('start'));
    $('.tb-search', taskbar).addEventListener('click', () => toggleFlyout('start', { search: true }));
    $('.tb-widgets', taskbar).addEventListener('click', () => toggleFlyout('widgets'));
    $('.tb-quick', taskbar).addEventListener('click', () => toggleFlyout('quick'));
    $('.tb-clock', taskbar).addEventListener('click', () => toggleFlyout('notifications'));
    $('.tb-taskview', taskbar).addEventListener('click', () => toggleTaskView());
    $('.tb-like', taskbar).addEventListener('click', () => likes.toggle());
    $('.tb-overflow', taskbar).addEventListener('click', (event) => toggleOverflow(event.currentTarget));
    $('.tb-lang', taskbar).addEventListener('click', (event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        showContextMenu({
            x: rect.left - 120,
            y: rect.top - 110,
            items: [
                { label: 'Français (France) — Clavier Français', icon: '<span class="ctx-lang">FRA</span>', checked: true },
                { separator: true },
                { label: 'Plus de paramètres de clavier', icon: ui.settings, action: () => launch('settings', { page: 'time' }) },
            ],
        });
    });

    initShowDesktop();
    initVolumeWheel();

    taskbar.addEventListener('contextmenu', (event) => {
        event.preventDefault();
        if (event.target.closest('[data-app-button]')) return;
        if (event.target.closest('.tb-clock')) {
            showContextMenu({
                x: event.clientX - 200,
                y: event.clientY - 140,
                items: [
                    { label: 'Ajuster la date et l\'heure', icon: ui.clock, action: () => launch('settings', { page: 'time' }) },
                    { label: 'Paramètres des notifications', icon: ui.bell, action: () => launch('settings', { page: 'system' }) },
                ],
            });
            return;
        }
        showContextMenu({
            x: event.clientX,
            y: event.clientY - 90,
            items: [
                { label: 'Gestionnaire des tâches', icon: ui.apps, action: () => toggleTaskView() },
                { separator: true },
                { label: 'Paramètres de la barre des tâches', icon: ui.settings, action: () => launch('settings', { page: 'personalization' }) },
            ],
        });
    });

    renderApps();
    bus.on('window:open', renderApps);
    bus.on('window:close', renderApps);
    bus.on('window:change', renderApps);
    bus.on('window:focus', renderApps);

    updateClock();
    setInterval(updateClock, 1000);
    updateTray();
    bus.on('system:change', updateTray);
    bus.on('notifications:change', updateTray);
    bus.on('likes:change', updateLikes);
    updateLikes();

    getWeather().then((weather) => {
        $('.tb-weather-icon', taskbar).textContent = weather.emoji;
        $('.tb-weather-temp', taskbar).textContent = `${weather.temperature}°C`;
        $('.tb-weather-desc', taskbar).textContent = weather.label;
        $('.tb-widgets', taskbar).dataset.tip = `${weather.city} : ${weather.temperature}°C, ${weather.label.toLowerCase()}`;
    });
}

/* ------------------------------------------------------------------ */
/* Applications : réconciliation des boutons (pas de reconstruction)   */
/* ------------------------------------------------------------------ */
function renderApps() {
    const running = wm.all().filter((win) => !win.closing);
    const ids = [...new Set([...PINNED, ...running.map((win) => win.appId)])];
    const active = wm.active();
    const existing = new Map($$('[data-app-button]', appsZone).map((node) => [node.dataset.appButton, node]));

    existing.forEach((node, id) => {
        if (!ids.includes(id)) {
            node.classList.add('is-leaving');
            setTimeout(() => node.remove(), 180);
            existing.delete(id);
        }
    });

    ids.forEach((id, index) => {
        let button = existing.get(id);
        if (!button) {
            button = createAppButton(id);
            if (!PINNED.includes(id)) button.classList.add('is-entering');
            requestAnimationFrame(() => button.classList.remove('is-entering'));
        }
        if (appsZone.children[index] !== button) appsZone.insertBefore(button, appsZone.children[index] ?? null);

        const wins = running.filter((win) => win.appId === id);
        const app = apps[id];
        button.classList.toggle('is-running', wins.length > 0);
        button.classList.toggle('is-active', active?.appId === id);
        button.classList.toggle('is-multi', wins.length > 1);
        button.classList.toggle('is-minimized', wins.length > 0 && wins.every((win) => win.state === 'minimized'));
        button.setAttribute('aria-label', wins.length === 1 ? wins[0].title : app.name);
    });
}

function createAppButton(id) {
    const app = apps[id];
    const button = el(html`
        <button class="tb-btn tb-app" type="button" role="listitem" data-app-button="${id}" aria-label="${app.name}" data-tip="${app.name}">
            <img src="${app.icon}" alt="" draggable="false">
            <span class="tb-indicator"></span>
        </button>`);

    const windowsOf = () => wm.byApp(id);

    button.addEventListener('click', () => {
        hidePreview(true);
        const wins = windowsOf();
        if (!wins.length) {
            button.classList.remove('is-bouncing');
            void button.offsetWidth;
            button.classList.add('is-bouncing');
            launch(id);
            return;
        }
        if (wins.length > 1) {
            showPreview(button, true);
            return;
        }
        const [target] = wins;
        if (target.isActive()) target.minimize();
        else target.focus();
    });

    // Aperçu des fenêtres au survol
    let hoverTimer;
    button.addEventListener('pointerenter', (event) => {
        if (event.pointerType === 'touch') return;
        clearTimeout(hoverTimer);
        hoverTimer = setTimeout(() => showPreview(button), preview ? 0 : 450);
    });
    button.addEventListener('pointerleave', () => {
        clearTimeout(hoverTimer);
        schedulePreviewHide();
    });

    button.addEventListener('contextmenu', (event) => {
        event.preventDefault();
        event.stopPropagation();
        hidePreview(true);
        const wins = windowsOf();
        const rect = button.getBoundingClientRect();
        showContextMenu({
            x: rect.left,
            y: rect.top - 8 - 44 * (wins.length ? 3 : 2),
            anchor: button,
            items: [
                { label: app.name, icon: `<img src="${escapeHtml(app.icon)}" alt="">`, action: () => launch(id) },
                { label: PINNED.includes(id) ? 'Détacher de la barre des tâches' : 'Épingler à la barre des tâches', icon: ui.star, disabled: true },
                wins.length ? { label: wins.length > 1 ? 'Fermer toutes les fenêtres' : 'Fermer la fenêtre', icon: ui.close, action: () => wins.forEach((win) => win.close()) } : null,
            ],
        });
    });
    return button;
}

/* ------------------------------------------------------------------ */
/* Aperçus des fenêtres                                                 */
/* ------------------------------------------------------------------ */
let preview = null;
let previewHideTimer;

function schedulePreviewHide() {
    clearTimeout(previewHideTimer);
    previewHideTimer = setTimeout(() => hidePreview(), 250);
}

function hidePreview(immediate = false) {
    clearTimeout(previewHideTimer);
    if (!preview) return;
    const node = preview.node;
    preview = null;
    document.body.classList.remove('is-peeking');
    wm.all().forEach((win) => win.el.classList.remove('is-peeked'));
    node.classList.remove('is-open');
    setTimeout(() => node.remove(), immediate ? 0 : 150);
}

function showPreview(button, sticky = false) {
    const id = button.dataset.appButton;
    const wins = wm.byApp(id);
    if (!wins.length) return;
    if (preview?.id === id) return;
    hidePreview(true);
    hideTooltip();

    const node = el('<div class="tb-preview" role="menu"></div>');
    wins.forEach((win) => {
        const rect = win.el.getBoundingClientRect();
        const width = win.state === 'minimized' ? Number.parseFloat(win.el.style.width) || rect.width : rect.width;
        const height = win.state === 'minimized' ? Number.parseFloat(win.el.style.height) || rect.height : rect.height;
        const scale = Math.min(200 / width, 120 / height);
        const card = el(html`
            <div class="tb-preview-card" role="menuitem" tabindex="0">
                <div class="tb-preview-header">
                    <img src="${win.icon}" alt="">
                    <span>${win.title}</span>
                    <button class="tb-preview-close" type="button" aria-label="Fermer">${raw(ui.close)}</button>
                </div>
                <div class="tb-preview-thumb" style="width:${width * scale}px;height:${height * scale}px"></div>
            </div>`);
        const clone = win.el.cloneNode(true);
        clone.querySelectorAll('iframe').forEach((frame) => frame.replaceWith(el('<div class="iframe-placeholder"></div>')));
        clone.classList.remove('is-minimized', 'is-opening', 'is-closing', 'is-peeked');
        Object.assign(clone.style, {
            position: 'absolute', left: '0', top: '0', zIndex: '0', transition: 'none',
            width: `${width}px`, height: `${height}px`, transform: `scale(${scale})`, transformOrigin: '0 0', pointerEvents: 'none',
        });
        card.querySelector('.tb-preview-thumb').append(clone);

        card.addEventListener('click', (event) => {
            if (event.target.closest('.tb-preview-close')) {
                win.close();
                card.remove();
                if (!node.children.length) hidePreview(true);
                return;
            }
            hidePreview(true);
            win.focus();
        });
        // Aperçu sur le bureau (« peek ») : les autres fenêtres s'effacent
        card.addEventListener('pointerenter', () => {
            if (win.state === 'minimized') return;
            document.body.classList.add('is-peeking');
            wm.all().forEach((other) => other.el.classList.toggle('is-peeked', other === win));
        });
        card.addEventListener('pointerleave', () => {
            document.body.classList.remove('is-peeking');
            win.el.classList.remove('is-peeked');
        });
        node.append(card);
    });

    node.addEventListener('pointerenter', () => clearTimeout(previewHideTimer));
    node.addEventListener('pointerleave', schedulePreviewHide);
    document.body.append(node);
    const rect = button.getBoundingClientRect();
    node.style.left = `${clamp(rect.left + rect.width / 2 - node.offsetWidth / 2, 8, window.innerWidth - node.offsetWidth - 8)}px`;
    node.style.bottom = `${window.innerHeight - rect.top + 8}px`;
    requestAnimationFrame(() => node.classList.add('is-open'));
    preview = { id, node, sticky };
}

/* ------------------------------------------------------------------ */
/* Icônes cachées                                                       */
/* ------------------------------------------------------------------ */
let overflow = null;
function toggleOverflow(anchor) {
    if (overflow) {
        overflow.remove();
        overflow = null;
        anchor.classList.remove('is-pressed');
        return;
    }
    closeFlyouts();
    const items = [
        { label: 'Sécurité Windows\nAucune action requise.', icon: ui.shield, action: () => notify({ app: 'Sécurité Windows', icon: appIconUrl('settings'), title: 'Votre appareil est protégé', body: 'Aucune menace détectée. Ce portfolio a passé l\'analyse avec succès ✅' }) },
        { label: 'GitHub — Kleysius', img: appIconUrl('github'), action: () => launch('github') },
        { label: 'LinkedIn', img: appIconUrl('linkedin'), action: () => launch('linkedin') },
        { label: 'Visual Studio Code', img: appIconUrl('vscode'), action: () => launch('vscode') },
        { label: 'Bluetooth\nAucun appareil connecté', icon: ui.bluetooth, action: () => toggleFlyout('quick') },
    ];
    overflow = el(html`
        <div class="tb-overflow-flyout">
            ${items.map((item, i) => raw(html`
                <button class="tb-overflow-item" type="button" data-index="${i}" data-tip="${item.label}" aria-label="${item.label.split('\n')[0]}">
                    ${item.img ? raw(`<img src="${item.img}" alt="">`) : raw(item.icon)}
                </button>`))}
        </div>`);
    document.body.append(overflow);
    const rect = anchor.getBoundingClientRect();
    overflow.style.left = `${clamp(rect.left + rect.width / 2 - overflow.offsetWidth / 2, 8, window.innerWidth - overflow.offsetWidth - 8)}px`;
    overflow.style.bottom = `${window.innerHeight - rect.top + 10}px`;
    anchor.classList.add('is-pressed');
    requestAnimationFrame(() => overflow?.classList.add('is-open'));
    overflow.addEventListener('click', (event) => {
        const button = event.target.closest('[data-index]');
        if (!button) return;
        items[Number(button.dataset.index)].action();
        toggleOverflow(anchor);
    });
    const dismiss = (event) => {
        if (!overflow || overflow.contains(event.target) || anchor.contains(event.target)) return;
        document.removeEventListener('pointerdown', dismiss, true);
        if (overflow) toggleOverflow(anchor);
    };
    setTimeout(() => document.addEventListener('pointerdown', dismiss, true));
}

/* ------------------------------------------------------------------ */
/* Volume à la molette + OSD                                            */
/* ------------------------------------------------------------------ */
let osd = null;
let osdTimer;
function showVolumeOsd() {
    if (!osd) {
        osd = el(`<div class="volume-osd" role="status"><span class="volume-osd-icon"></span><span class="volume-osd-track"><i></i></span><span class="volume-osd-value"></span></div>`);
        document.body.append(osd);
    }
    const volume = system.volume;
    osd.querySelector('.volume-osd-icon').innerHTML = volume === 0 ? ui.volumeMute : ui.volume;
    osd.querySelector('i').style.width = `${volume}%`;
    osd.querySelector('.volume-osd-value').textContent = volume;
    requestAnimationFrame(() => osd.classList.add('is-visible'));
    clearTimeout(osdTimer);
    osdTimer = setTimeout(() => osd.classList.remove('is-visible'), 1600);
}

function initVolumeWheel() {
    $('.tb-quick', taskbar).addEventListener('wheel', (event) => {
        event.preventDefault();
        const step = event.deltaY < 0 ? 2 : -2;
        system.setVolume(clamp(system.volume + step, 0, 100));
        showVolumeOsd();
    }, { passive: false });
}

/* ------------------------------------------------------------------ */
/* Afficher le bureau + Aero Peek                                       */
/* ------------------------------------------------------------------ */
function initShowDesktop() {
    const button = $('.tb-show-desktop', taskbar);
    let timer;
    button.addEventListener('click', () => {
        document.body.classList.remove('is-aero-peek');
        wm.minimizeAll();
    });
    button.addEventListener('pointerenter', () => {
        timer = setTimeout(() => document.body.classList.add('is-aero-peek'), 700);
    });
    button.addEventListener('pointerleave', () => {
        clearTimeout(timer);
        document.body.classList.remove('is-aero-peek');
    });
}

/* ------------------------------------------------------------------ */
/* Horloge, zone de notification                                        */
/* ------------------------------------------------------------------ */
function updateClock() {
    const now = new Date();
    $('.tb-time', taskbar).textContent = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    $('.tb-date', taskbar).textContent = now.toLocaleDateString('fr-FR');
    const full = now.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    $('.tb-clock', taskbar).dataset.tip = full.charAt(0).toUpperCase() + full.slice(1);
}

function updateTray() {
    const volume = system.volume;
    const volumeNode = $('.tb-quick-volume', taskbar);
    volumeNode.innerHTML = volume === 0 ? ui.volumeMute : ui.volume;
    volumeNode.dataset.tip = volume === 0 ? 'Haut-parleurs : muet' : `Haut-parleurs (Realtek(R) Audio) : ${volume} %`;
    const count = notifications.list.length;
    const badge = $('.tb-bell-badge', taskbar);
    badge.hidden = count === 0;
    badge.textContent = count > 9 ? '9+' : String(count);
    $('.tb-bell', taskbar).innerHTML = (notifications.doNotDisturb ? ui.bellOff : ui.bell) + badge.outerHTML;
}

function updateLikes() {
    const button = $('.tb-like', taskbar);
    button.classList.toggle('is-liked', likes.liked);
    $('.tb-like-count', taskbar).textContent = likes.count ?? '';
    button.dataset.tip = likes.liked
        ? `Merci pour le like ! ❤\n${likes.count ?? ''} personnes aiment ce portfolio\n(cliquer pour retirer)`
        : `J'aime ce portfolio${likes.count != null ? `\n${likes.count} personnes l'aiment déjà` : ''}`;
}
