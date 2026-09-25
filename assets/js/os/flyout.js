/**
 * Gestion des panneaux volants (menu Démarrer, paramètres rapides, centre de notifications, widgets…) :
 * un seul ouvert à la fois, fermeture au clic extérieur et sur Échap.
 */
import { bus } from '../core/bus.js';

const flyouts = new Map();
let openName = null;

export function registerFlyout(name, { element, buttons = [], onOpen, onClose }) {
    flyouts.set(name, { element, buttons, onOpen, onClose });
    buttons.forEach((button) => button.setAttribute('aria-expanded', 'false'));
}

export function isOpen(name) {
    return openName === name;
}

export function openFlyout(name, options) {
    if (openName === name) return;
    closeFlyouts();
    const flyout = flyouts.get(name);
    if (!flyout) return;
    openName = name;
    flyout.element.hidden = false;
    flyout.buttons.forEach((button) => {
        button.classList.add('is-pressed');
        button.setAttribute('aria-expanded', 'true');
    });
    requestAnimationFrame(() => requestAnimationFrame(() => flyout.element.classList.add('is-open')));
    flyout.onOpen?.(options);
    bus.emit('flyout:open', name);
}

export function closeFlyouts() {
    if (!openName) return;
    const flyout = flyouts.get(openName);
    const name = openName;
    openName = null;
    flyout.element.classList.remove('is-open');
    flyout.buttons.forEach((button) => {
        button.classList.remove('is-pressed');
        button.setAttribute('aria-expanded', 'false');
    });
    clearTimeout(flyout.hideTimer);
    flyout.hideTimer = setTimeout(() => {
        if (openName !== name) flyout.element.hidden = true;
    }, 220);
    flyout.onClose?.();
    bus.emit('flyout:close', name);
}

export function toggleFlyout(name, options) {
    if (openName === name) closeFlyouts();
    else openFlyout(name, options);
}

document.addEventListener('pointerdown', (event) => {
    if (!openName) return;
    const flyout = flyouts.get(openName);
    if (flyout.element.contains(event.target)) return;
    if (flyout.buttons.some((button) => button.contains(event.target))) return;
    if (event.target.closest('.ctx-menu')) return;
    closeFlyouts();
}, true);

document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && openName) closeFlyouts();
});
