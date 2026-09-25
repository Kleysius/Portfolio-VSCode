/**
 * Bloc-notes Windows 11 : onglets, menus, barre d'état (position, zoom, fin de ligne, encodage).
 */
import { el, html, raw } from '../core/dom.js';
import { appIconUrl, ui } from '../core/icons.js';
import { wm } from '../os/window-manager.js';
import { showContextMenu } from '../os/context-menu.js';

export function open({ name = 'Sans titre.txt', content = '' } = {}) {
    const root = el(html`
        <div class="np">
            <header class="np-titlebar" data-drag>
                <img class="np-icon" src="${appIconUrl('notepad')}" alt="">
                <div class="np-tab is-active">
                    <span class="np-tab-dot" hidden></span>
                    <span class="np-tab-title">${name}</span>
                    <button class="np-tab-close" type="button" aria-label="Fermer l'onglet">${raw(ui.close)}</button>
                </div>
                <button class="np-new-tab" type="button" aria-label="Nouvel onglet" disabled>${raw(ui.plus)}</button>
                <div class="np-drag-space"></div>
            </header>
            <nav class="np-menubar">
                <button type="button" data-menu="file">Fichier</button>
                <button type="button" data-menu="edit">Modifier</button>
                <button type="button" data-menu="view">Affichage</button>
                <button class="np-settings" type="button" aria-label="Paramètres">${raw(ui.settings)}</button>
            </nav>
            <textarea class="np-editor" spellcheck="false" aria-label="Contenu du document"></textarea>
            <footer class="np-statusbar">
                <span class="np-pos">Ln 1, Col 1</span>
                <span class="np-count"></span>
                <span class="np-zoom">100 %</span>
                <span>Windows (CRLF)</span>
                <span>UTF-8</span>
            </footer>
        </div>`);

    const win = wm.open({
        appId: 'notepad',
        title: `${name} - Bloc-notes`,
        icon: appIconUrl('notepad'),
        frame: 'custom',
        width: 760,
        height: 540,
        className: 'window--notepad',
        content: root,
    });
    root.querySelector('.np-titlebar').append(win.controls);

    const editor = root.querySelector('.np-editor');
    editor.value = content.replace(/\r\n/g, '\n');
    let zoom = 100;
    let original = editor.value;

    const update = () => {
        const before = editor.value.slice(0, editor.selectionStart);
        const line = before.split('\n').length;
        const col = before.length - before.lastIndexOf('\n');
        root.querySelector('.np-pos').textContent = `Ln ${line}, Col ${col}`;
        root.querySelector('.np-count').textContent = `${editor.value.length} caractère${editor.value.length > 1 ? 's' : ''}`;
        const dirty = editor.value !== original;
        root.querySelector('.np-tab-dot').hidden = !dirty;
        root.querySelector('.np-tab-close').hidden = dirty;
        win.setTitle(`${dirty ? '*' : ''}${name} - Bloc-notes`);
    };
    const setZoom = (value) => {
        zoom = Math.max(50, Math.min(300, value));
        editor.style.fontSize = `${(15 * zoom) / 100}px`;
        root.querySelector('.np-zoom').textContent = `${zoom} %`;
    };

    ['input', 'click', 'keyup', 'select'].forEach((type) => editor.addEventListener(type, update));
    editor.addEventListener('keydown', (event) => {
        if (event.ctrlKey && (event.key === '+' || event.key === '=')) { event.preventDefault(); setZoom(zoom + 10); }
        if (event.ctrlKey && event.key === '-') { event.preventDefault(); setZoom(zoom - 10); }
        if (event.ctrlKey && event.key === '0') { event.preventDefault(); setZoom(100); }
        if (event.ctrlKey && event.key.toLowerCase() === 's') {
            event.preventDefault();
            original = editor.value;
            update();
        }
    });
    root.querySelector('.np-tab-close').addEventListener('click', () => win.close());
    root.querySelector('.np-menubar').addEventListener('click', (event) => {
        const button = event.target.closest('[data-menu]');
        if (!button) return;
        const rect = button.getBoundingClientRect();
        const menus = {
            file: [
                { label: 'Nouvel onglet', shortcut: 'Ctrl+N', disabled: true },
                { label: 'Enregistrer', shortcut: 'Ctrl+S', action: () => { original = editor.value; update(); } },
                { separator: true },
                { label: 'Fermer la fenêtre', shortcut: 'Ctrl+Maj+W', action: () => win.close() },
            ],
            edit: [
                { label: 'Tout sélectionner', shortcut: 'Ctrl+A', action: () => { editor.focus(); editor.select(); } },
                { label: 'Copier', shortcut: 'Ctrl+C', action: () => navigator.clipboard?.writeText(editor.value.slice(editor.selectionStart, editor.selectionEnd)) },
                { separator: true },
                { label: 'Heure/Date', shortcut: 'F5', action: () => { editor.setRangeText(new Date().toLocaleString('fr-FR'), editor.selectionStart, editor.selectionEnd, 'end'); update(); } },
            ],
            view: [
                { label: 'Zoom avant', shortcut: 'Ctrl+Plus', action: () => setZoom(zoom + 10) },
                { label: 'Zoom arrière', shortcut: 'Ctrl+Moins', action: () => setZoom(zoom - 10) },
                { label: 'Restaurer le zoom par défaut', shortcut: 'Ctrl+0', action: () => setZoom(100) },
                { separator: true },
                { label: 'Retour automatique à la ligne', checked: !root.classList.contains('no-wrap'), action: () => root.classList.toggle('no-wrap') },
            ],
        };
        showContextMenu({ x: rect.left, y: rect.bottom + 2, items: menus[button.dataset.menu], anchor: button });
    });

    setZoom(100);
    update();
    requestAnimationFrame(() => editor.focus());
    win.on('focus', () => editor.focus({ preventScroll: true }));
    return win;
}
