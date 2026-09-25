/**
 * Affichage des tâches : vignettes « vivantes » (clones figés) de toutes les fenêtres ouvertes.
 */
import { $, el, html } from '../core/dom.js';
import { wm } from './window-manager.js';
import { closeFlyouts } from './flyout.js';

let open = false;

export function toggleTaskView() {
    if (open) closeTaskView();
    else openTaskView();
}

function closeTaskView() {
    const view = $('#task-view');
    open = false;
    view.classList.remove('is-open');
    setTimeout(() => { if (!open) view.hidden = true; }, 200);
    document.removeEventListener('keydown', onKey);
}

function onKey(event) {
    if (event.key === 'Escape') closeTaskView();
}

function openTaskView() {
    closeFlyouts();
    const view = $('#task-view');
    const windows = wm.all().filter((win) => !win.closing);
    open = true;

    view.innerHTML = html`
        <div class="task-view-grid">
            ${windows.length ? '' : html`<p class="task-view-empty">Aucune application ouverte</p>`}
        </div>
        <div class="task-view-desktops">
            <div class="task-view-desktop is-current">
                <div class="task-view-desktop-thumb"></div>
                <span>Bureau 1</span>
            </div>
            <button class="task-view-desktop task-view-new" type="button" disabled>
                <div class="task-view-desktop-thumb">+</div>
                <span>Nouveau bureau</span>
            </button>
        </div>`;

    const grid = $('.task-view-grid', view);
    windows.forEach((win) => {
        const rect = win.el.getBoundingClientRect();
        const scale = Math.min(320 / rect.width, 200 / rect.height);
        const card = el(html`
            <div class="task-card" tabindex="0" role="button" aria-label="${win.title}">
                <div class="task-card-header">
                    <img src="${win.icon}" alt="">
                    <span>${win.title}</span>
                    <button class="task-card-close" type="button" aria-label="Fermer">✕</button>
                </div>
                <div class="task-card-thumb" style="width:${rect.width * scale}px;height:${rect.height * scale}px"></div>
            </div>`);

        // Clone statique de la fenêtre (sans iframes pour éviter de les recharger)
        const clone = win.el.cloneNode(true);
        clone.querySelectorAll('iframe').forEach((frame) => frame.replaceWith(el('<div class="iframe-placeholder"></div>')));
        clone.classList.remove('is-minimized', 'is-opening', 'is-closing');
        clone.removeAttribute('id');
        Object.assign(clone.style, {
            position: 'absolute', left: '0', top: '0', zIndex: '0',
            width: `${rect.width}px`, height: `${rect.height}px`,
            transform: `scale(${scale})`, transformOrigin: '0 0', pointerEvents: 'none',
        });
        $('.task-card-thumb', card).append(clone);

        card.addEventListener('click', (event) => {
            if (event.target.closest('.task-card-close')) {
                win.close();
                card.remove();
                return;
            }
            closeTaskView();
            win.focus();
        });
        card.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') card.click();
        });
        grid.append(card);
    });

    view.hidden = false;
    requestAnimationFrame(() => view.classList.add('is-open'));
    view.onclick = (event) => {
        if (event.target === view || event.target === grid) closeTaskView();
    };
    document.addEventListener('keydown', onKey);
}
