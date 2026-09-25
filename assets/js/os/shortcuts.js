/**
 * Raccourcis clavier globaux (ceux que le navigateur laisse passer).
 */
import { toggleFlyout } from './flyout.js';
import { toggleTaskView } from './task-view.js';
import { launch } from './apps.js';
import { wm } from './window-manager.js';

export function initShortcuts() {
    let metaAlone = false;

    document.addEventListener('keydown', (event) => {
        metaAlone = event.key === 'Meta';
        const key = event.key.toLowerCase();

        if (event.ctrlKey && event.shiftKey && event.key === 'Escape') {
            event.preventDefault();
            toggleTaskView();
        } else if (event.ctrlKey && event.key === 'Escape') {
            event.preventDefault();
            toggleFlyout('start');
        } else if (event.ctrlKey && event.altKey && key === 't') {
            event.preventDefault();
            launch('terminal');
        } else if (event.ctrlKey && event.altKey && key === 'e') {
            event.preventDefault();
            launch('explorer');
        } else if (event.ctrlKey && event.altKey && key === 'd') {
            event.preventDefault();
            wm.minimizeAll();
        } else if (event.altKey && event.key === 'F4') {
            event.preventDefault();
            wm.active()?.close();
        }
    });

    document.addEventListener('keyup', (event) => {
        if (event.key === 'Meta' && metaAlone) toggleFlyout('start');
        metaAlone = false;
    });
}
