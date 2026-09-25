/**
 * Centre de notifications + calendrier (remplace FullCalendar par un composant maison léger).
 */
import { $, el, html, raw } from '../core/dom.js';
import { bus } from '../core/bus.js';
import { ui } from '../core/icons.js';
import { registerFlyout } from './flyout.js';
import { notifications, timeLabel } from './notifications.js';

let root;
let viewDate = new Date();

export function initNotificationCenter() {
    root = $('#notification-center');
    root.innerHTML = html`
        <section class="nc-card nc-notifications">
            <header class="nc-header">
                <h2>Notifications</h2>
                <button class="btn btn-small" type="button" data-action="clear">Tout effacer</button>
            </header>
            <div class="nc-list"></div>
        </section>
        <section class="nc-card nc-calendar">
            <header class="nc-header nc-calendar-header">
                <h2 class="nc-today"></h2>
                <button class="nc-collapse" type="button" aria-label="Réduire le calendrier">${raw(ui.chevronDown)}</button>
            </header>
            <div class="nc-calendar-body">
                <div class="cal-nav">
                    <span class="cal-title"></span>
                    <span>
                        <button class="cal-arrow" type="button" data-step="-1" aria-label="Mois précédent">${raw(ui.chevronUp)}</button>
                        <button class="cal-arrow" type="button" data-step="1" aria-label="Mois suivant">${raw(ui.chevronDown)}</button>
                    </span>
                </div>
                <div class="cal-grid" role="grid"></div>
            </div>
            <footer class="nc-focus">
                <button class="nc-focus-btn" type="button" data-action="minus" aria-label="Moins">−</button>
                <span class="nc-focus-time">30 min</span>
                <button class="nc-focus-btn" type="button" data-action="plus" aria-label="Plus">+</button>
                <button class="btn nc-focus-start" type="button" data-action="focus">${raw(ui.focus)} Concentration</button>
            </footer>
        </section>`;

    let focusMinutes = 30;
    root.addEventListener('click', (event) => {
        const action = event.target.closest('[data-action]')?.dataset.action;
        if (action === 'clear') notifications.clear();
        if (action === 'minus') focusMinutes = Math.max(5, focusMinutes - 5);
        if (action === 'plus') focusMinutes = Math.min(240, focusMinutes + 5);
        if (action === 'minus' || action === 'plus') $('.nc-focus-time', root).textContent = `${focusMinutes} min`;
        if (action === 'focus') notifications.setDoNotDisturb(!notifications.doNotDisturb);

        const step = event.target.closest('[data-step]');
        if (step) {
            viewDate = new Date(viewDate.getFullYear(), viewDate.getMonth() + Number(step.dataset.step), 1);
            renderCalendar();
        }
        const dismiss = event.target.closest('.nc-item-close');
        if (dismiss) notifications.remove(Number(dismiss.dataset.id));
        const item = event.target.closest('.nc-item');
        if (item && !dismiss) notifications.list.find((n) => n.id === Number(item.dataset.id))?.onClick?.();
        if (event.target.closest('.nc-collapse')) root.classList.toggle('is-calendar-collapsed');
    });

    registerFlyout('notifications', {
        element: root,
        buttons: [$('.tb-clock')],
        onOpen: () => {
            viewDate = new Date();
            renderCalendar();
            renderList();
        },
    });
    bus.on('notifications:change', () => {
        renderList();
        $('.nc-focus-start', root).classList.toggle('btn-accent', notifications.doNotDisturb);
    });
}

function renderList() {
    const list = $('.nc-list', root);
    if (!notifications.list.length) {
        list.innerHTML = '<p class="nc-empty">Aucune nouvelle notification</p>';
        return;
    }
    list.replaceChildren(...notifications.list.map((item) => el(html`
        <article class="nc-item" data-id="${item.id}">
            <header>
                <img src="${item.icon}" alt=""><span>${item.app}</span>
                <time>${timeLabel(item.date)}</time>
                <button class="nc-item-close" type="button" data-id="${item.id}" aria-label="Ignorer">${raw(ui.close)}</button>
            </header>
            <p class="nc-item-title">${item.title}</p>
            ${item.body ? raw(html`<p class="nc-item-body">${item.body}</p>`) : ''}
        </article>`)));
}

function renderCalendar() {
    const today = new Date();
    $('.nc-today', root).textContent = today.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
    $('.cal-title', root).textContent = viewDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });

    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const first = new Date(year, month, 1);
    const offset = (first.getDay() + 6) % 7; // semaine commençant le lundi
    const start = new Date(year, month, 1 - offset);
    const days = ['lu', 'ma', 'me', 'je', 've', 'sa', 'di'];

    const cells = days.map((day) => `<span class="cal-weekday" role="columnheader">${day}</span>`);
    for (let i = 0; i < 42; i++) {
        const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
        const classes = ['cal-day'];
        if (date.getMonth() !== month) classes.push('is-outside');
        if (date.toDateString() === today.toDateString()) classes.push('is-today');
        cells.push(`<button class="${classes.join(' ')}" type="button" role="gridcell" aria-label="${date.toLocaleDateString('fr-FR', { dateStyle: 'full' })}">${date.getDate()}</button>`);
    }
    $('.cal-grid', root).innerHTML = cells.join('');
}
