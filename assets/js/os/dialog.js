/**
 * Boîtes de dialogue Windows 11 (ContentDialog) : modales, focus piégé, Échap = Annuler.
 */
import { el, html, raw } from '../core/dom.js';
import { sounds } from '../core/sound.js';

/**
 * @param {{ title: string, message: string, icon?: string, buttons: { label: string, value: any, primary?: boolean }[] }} options
 * @returns {Promise<any>} la valeur du bouton choisi (ou `null` si Échap)
 */
export function showDialog({ title, message, icon = '', buttons }) {
    return new Promise((resolve) => {
        const overlay = el(html`
            <div class="dialog-overlay" role="presentation">
                <div class="dialog" role="alertdialog" aria-modal="true" aria-labelledby="dialog-title">
                    <div class="dialog-body">
                        ${icon ? raw(`<div class="dialog-icon">${icon}</div>`) : ''}
                        <div>
                            <h2 id="dialog-title">${title}</h2>
                            <p>${message}</p>
                        </div>
                    </div>
                    <footer class="dialog-footer">
                        ${buttons.map((button, i) => raw(html`<button class="btn ${button.primary ? 'btn-accent' : ''}" type="button" data-index="${i}">${button.label}</button>`))}
                    </footer>
                </div>
            </div>`);
        const close = (value) => {
            overlay.classList.remove('is-open');
            document.removeEventListener('keydown', onKey, true);
            setTimeout(() => overlay.remove(), 150);
            resolve(value);
        };
        const onKey = (event) => {
            if (event.key === 'Escape') { event.stopPropagation(); close(null); }
            if (event.key === 'Tab') {
                const focusable = [...overlay.querySelectorAll('button')];
                const index = focusable.indexOf(document.activeElement);
                event.preventDefault();
                focusable[(index + (event.shiftKey ? -1 : 1) + focusable.length) % focusable.length].focus();
            }
        };
        overlay.addEventListener('click', (event) => {
            const button = event.target.closest('[data-index]');
            if (button) close(buttons[Number(button.dataset.index)].value);
            else if (event.target === overlay) {
                // Clic hors de la boîte : Windows fait clignoter la fenêtre et joue un « ding »
                overlay.querySelector('.dialog').classList.remove('is-flashing');
                void overlay.offsetWidth;
                overlay.querySelector('.dialog').classList.add('is-flashing');
                sounds.ding();
            }
        });
        document.addEventListener('keydown', onKey, true);
        document.body.append(overlay);
        requestAnimationFrame(() => {
            overlay.classList.add('is-open');
            (overlay.querySelector('.btn-accent') ?? overlay.querySelector('button')).focus();
        });
    });
}
