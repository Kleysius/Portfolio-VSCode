/**
 * Notifications Windows : toasts éphémères + historique affiché dans le centre de notifications.
 */
import { $, el, html, raw } from '../core/dom.js';
import { bus } from '../core/bus.js';
import { ui } from '../core/icons.js';
import { sounds } from '../core/sound.js';

const history = [];
let doNotDisturb = false;

const timeLabel = (date) => date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

export const notifications = {
    get list() { return history; },
    get doNotDisturb() { return doNotDisturb; },
    setDoNotDisturb(value) {
        doNotDisturb = value;
        bus.emit('notifications:change');
    },
    clear() {
        history.length = 0;
        bus.emit('notifications:change');
    },
    remove(id) {
        const index = history.findIndex((item) => item.id === id);
        if (index !== -1) history.splice(index, 1);
        bus.emit('notifications:change');
    },
};

let counter = 0;

/**
 * Affiche une notification.
 * @param {{ app: string, icon: string, title: string, body?: string, image?: string, actions?: {label:string, action:Function}[], onClick?: Function, silent?: boolean }} notification
 */
export function notify(notification) {
    const item = { ...notification, id: ++counter, date: new Date() };
    history.unshift(item);
    bus.emit('notifications:change');
    if (!doNotDisturb && !notification.silent) showToast(item);
    return item;
}

function showToast(item) {
    const container = $('#toasts');
    const toast = el(html`
        <div class="toast" role="status" aria-live="polite">
            <div class="toast-header">
                <img class="toast-app-icon" src="${item.icon}" alt="">
                <span class="toast-app">${item.app}</span>
                <button class="toast-more" type="button" aria-label="Plus d'options">${raw(ui.more)}</button>
                <button class="toast-close" type="button" aria-label="Ignorer">${raw(ui.close)}</button>
            </div>
            <div class="toast-content">
                ${item.image ? raw(html`<img class="toast-image" src="${item.image}" alt="">`) : ''}
                <div>
                    <p class="toast-title">${item.title}</p>
                    ${item.body ? raw(html`<p class="toast-body">${item.body}</p>`) : ''}
                </div>
            </div>
            ${item.actions?.length ? raw(html`<div class="toast-actions">${item.actions.map((action, i) => raw(html`<button class="btn ${i === 0 ? 'btn-accent' : ''}" type="button" data-action="${i}">${action.label}</button>`))}</div>`) : ''}
        </div>`);

    const dismiss = () => {
        toast.classList.add('is-leaving');
        setTimeout(() => toast.remove(), 250);
    };
    let timer = setTimeout(dismiss, 6500);
    toast.addEventListener('pointerenter', () => clearTimeout(timer));
    toast.addEventListener('pointerleave', () => { timer = setTimeout(dismiss, 3000); });
    toast.querySelector('.toast-close').addEventListener('click', (event) => { event.stopPropagation(); dismiss(); });
    toast.querySelectorAll('[data-action]').forEach((button) => {
        button.addEventListener('click', (event) => {
            event.stopPropagation();
            item.actions[Number(button.dataset.action)].action();
            notifications.remove(item.id);
            dismiss();
        });
    });
    toast.addEventListener('click', (event) => {
        if (event.target.closest('button')) return;
        item.onClick?.();
        dismiss();
    });

    container.append(toast);
    sounds.notify();
    requestAnimationFrame(() => requestAnimationFrame(() => toast.classList.add('is-visible')));
}

export { timeLabel };
