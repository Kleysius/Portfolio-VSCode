/**
 * Barre des tâches Windows 11 : widgets météo, Démarrer, recherche, affichage des tâches,
 * applications épinglées/en cours, zone de notification et horloge.
 */
import { $, el, html, raw, escapeHtml } from '../core/dom.js';
import { bus } from '../core/bus.js';
import { ui, appIconUrl } from '../core/icons.js';
import { apps, launch } from './apps.js';
import { wm } from './window-manager.js';
import { toggleFlyout } from './flyout.js';
import { showContextMenu } from './context-menu.js';
import { system } from './system.js';
import { notifications } from './notifications.js';
import { getWeather } from '../services/weather.js';
import { likes } from '../services/likes.js';
import { toggleTaskView } from './task-view.js';

const PINNED = ['explorer', 'edge', 'vscode', 'terminal'];

let taskbar;
let appsZone;

export function initTaskbar() {
    taskbar = $('#taskbar');
    taskbar.innerHTML = html`
        <button class="tb-widgets" type="button" data-flyout="widgets" aria-label="Widgets">
            <span class="tb-weather-icon" aria-hidden="true">☀️</span>
            <span class="tb-weather-text">
                <span class="tb-weather-temp">--°C</span>
                <span class="tb-weather-desc">Météo</span>
            </span>
        </button>

        <div class="tb-center">
            <button class="tb-btn tb-start" type="button" data-flyout="start" aria-label="Démarrer" title="Démarrer">
                <img src="${appIconUrl('start')}" alt="" draggable="false">
            </button>
            <button class="tb-search" type="button" data-flyout="search" aria-label="Rechercher">
                ${raw(ui.search)}<span>Rechercher</span>
            </button>
            <button class="tb-btn tb-taskview" type="button" aria-label="Affichage des tâches" title="Affichage des tâches">
                ${raw(ui.taskView)}
            </button>
            <div class="tb-apps" role="list"></div>
        </div>

        <div class="tb-tray">
            <button class="tb-tray-btn tb-like" type="button" aria-label="J'aime ce portfolio" title="J'aime ce portfolio">
                ${raw(ui.heart)}<span class="tb-like-count"></span>
            </button>
            <button class="tb-tray-btn tb-quick" type="button" data-flyout="quick" aria-label="Paramètres rapides">
                <span class="tb-quick-wifi">${raw(ui.wifi)}</span>
                <span class="tb-quick-volume">${raw(ui.volume)}</span>
                <span class="tb-quick-battery">${raw(ui.battery)}</span>
            </button>
            <button class="tb-tray-btn tb-clock" type="button" data-flyout="notifications" aria-label="Horloge et notifications">
                <span class="tb-clock-text">
                    <span class="tb-time"></span>
                    <span class="tb-date"></span>
                </span>
                <span class="tb-bell">${raw(ui.bell)}<span class="tb-bell-badge" hidden></span></span>
            </button>
            <button class="tb-show-desktop" type="button" aria-label="Afficher le Bureau" title="Afficher le Bureau"></button>
        </div>`;

    appsZone = $('.tb-apps', taskbar);

    $('.tb-start', taskbar).addEventListener('click', () => toggleFlyout('start'));
    $('.tb-search', taskbar).addEventListener('click', () => toggleFlyout('start', { search: true }));
    $('.tb-widgets', taskbar).addEventListener('click', () => toggleFlyout('widgets'));
    $('.tb-quick', taskbar).addEventListener('click', () => toggleFlyout('quick'));
    $('.tb-clock', taskbar).addEventListener('click', () => toggleFlyout('notifications'));
    $('.tb-taskview', taskbar).addEventListener('click', () => toggleTaskView());
    $('.tb-show-desktop', taskbar).addEventListener('click', () => wm.minimizeAll());
    $('.tb-like', taskbar).addEventListener('click', () => likes.toggle());

    taskbar.addEventListener('contextmenu', (event) => {
        event.preventDefault();
        if (event.target.closest('[data-app-button]')) return;
        showContextMenu({
            x: event.clientX,
            y: event.clientY,
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
    });
}

function renderApps() {
    const running = wm.all().filter((win) => !win.closing);
    const ids = [...new Set([...PINNED, ...running.map((win) => win.appId)])];
    const active = wm.active();

    appsZone.replaceChildren(...ids.map((id) => {
        const app = apps[id];
        const wins = running.filter((win) => win.appId === id);
        const isActive = active?.appId === id;
        const title = wins.length === 1 ? wins[0].title : app.name;
        const button = el(html`
            <button class="tb-btn tb-app ${wins.length ? 'is-running' : ''} ${isActive ? 'is-active' : ''} ${wins.length > 1 ? 'is-multi' : ''}"
                    type="button" role="listitem" data-app-button="${id}" aria-label="${title}" title="${title}">
                <img src="${app.icon}" alt="" draggable="false">
                <span class="tb-indicator"></span>
            </button>`);

        button.addEventListener('click', () => {
            if (!wins.length) {
                button.classList.add('is-bouncing');
                launch(id);
                return;
            }
            const target = wins.find((win) => win.isActive()) ?? wins[wins.length - 1];
            if (target.isActive()) target.minimize();
            else target.focus();
        });

        button.addEventListener('contextmenu', (event) => {
            event.preventDefault();
            event.stopPropagation();
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
    }));
}

function updateClock() {
    const now = new Date();
    $('.tb-time', taskbar).textContent = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    $('.tb-date', taskbar).textContent = now.toLocaleDateString('fr-FR');
    $('.tb-clock', taskbar).title = now.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

function updateTray() {
    $('.tb-quick-volume', taskbar).innerHTML = system.volume === 0 ? ui.volumeMute : ui.volume;
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
    button.title = likes.liked ? 'Merci pour le like ! (cliquer pour retirer)' : 'J\'aime ce portfolio';
}
