/**
 * Bureau : icônes sur grille (déplaçables, sélection multiple au lasso), menu contextuel Windows 11.
 */
import { $, $$, el, html, clamp, isTouch } from '../core/dom.js';
import { store } from '../core/store.js';
import { ui, appIconUrl } from '../core/icons.js';
import { launch, openFsItem } from './apps.js';
import { showContextMenu } from './context-menu.js';
import { system } from './system.js';
import { wm } from './window-manager.js';
import { games } from '../data/projects.js';
import { findByPath } from '../data/filesystem.js';

const ICONS = [
    { id: 'pc', label: 'Ce PC', icon: appIconUrl('pc'), open: () => launch('explorer', { path: '' }) },
    { id: 'recycle', label: 'Corbeille', icon: appIconUrl('recycle'), open: () => launch('explorer', { path: 'Corbeille' }) },
    { id: 'vscode', label: 'Visual Studio Code', icon: appIconUrl('vscode'), open: () => launch('vscode') },
    { id: 'projects', label: 'Projets', icon: appIconUrl('folder'), open: () => launch('explorer', { path: 'Projets' }) },
    { id: 'about', label: 'À propos de moi.txt', icon: appIconUrl('textfile'), open: () => openFsItem(findByPath('Documents\\À propos de moi.txt')) },
    { id: 'terminal', label: 'Terminal', icon: appIconUrl('terminal'), open: () => launch('terminal') },
    { id: 'github', label: 'GitHub', icon: appIconUrl('github'), open: () => launch('github'), shortcut: true },
    { id: 'linkedin', label: 'LinkedIn', icon: appIconUrl('linkedin'), open: () => launch('linkedin'), shortcut: true },
    ...games.map((game) => ({ id: game.id, label: game.name, icon: game.icon, open: () => launch(game.id), shortcut: true })),
];

const SIZES = { large: 96, medium: 76, small: 60 };

let container;
let layout = {};
let cell = { width: 84, height: 98 };

const cellSize = () => {
    const size = store.get('desktop-icon-size', 'medium');
    const base = SIZES[size];
    return { width: base + 8, height: base + 22 + (size === 'small' ? 0 : 6) };
};

const rows = () => Math.max(1, Math.floor((window.innerHeight - 48 - 12) / cell.height));

/** Place les icônes sans position enregistrée dans la première case libre (colonne par colonne). */
function computeLayout(reset = false) {
    cell = cellSize();
    const saved = reset ? {} : store.get('desktop-layout', {});
    const occupied = new Set();
    const maxRows = rows();
    layout = {};
    ICONS.forEach((icon) => {
        const pos = saved[icon.id];
        if (pos && pos.row < maxRows && !occupied.has(`${pos.col}:${pos.row}`)) {
            layout[icon.id] = pos;
            occupied.add(`${pos.col}:${pos.row}`);
        }
    });
    let index = 0;
    ICONS.forEach((icon) => {
        if (layout[icon.id]) return;
        let pos;
        do {
            pos = { col: Math.floor(index / maxRows), row: index % maxRows };
            index++;
        } while (occupied.has(`${pos.col}:${pos.row}`));
        layout[icon.id] = pos;
        occupied.add(`${pos.col}:${pos.row}`);
    });
}

function positionIcons() {
    $$('.desktop-icon', container).forEach((node) => {
        const pos = layout[node.dataset.id];
        node.style.transform = `translate(${pos.col * cell.width + 4}px, ${pos.row * cell.height + 6}px)`;
    });
}

function render() {
    computeLayout();
    container.style.setProperty('--icon-size', `${SIZES[store.get('desktop-icon-size', 'medium')] * 0.55}px`);
    container.style.setProperty('--cell-width', `${cell.width}px`);
    container.style.setProperty('--cell-height', `${cell.height}px`);
    container.replaceChildren(...ICONS.map((icon) => el(html`
        <button class="desktop-icon ${icon.shortcut ? 'is-shortcut' : ''}" type="button" role="option" aria-selected="false" data-id="${icon.id}">
            <span class="desktop-icon-img"><img src="${icon.icon}" alt="" draggable="false"></span>
            <span class="desktop-icon-label">${icon.label}</span>
        </button>`)));
    positionIcons();
    container.hidden = !store.get('desktop-show-icons', true);
}

const select = (nodes, additive = false) => {
    $$('.desktop-icon', container).forEach((node) => {
        const selected = nodes.includes(node) || (additive && node.classList.contains('is-selected'));
        node.classList.toggle('is-selected', selected);
        node.setAttribute('aria-selected', String(selected));
    });
};

const openIcon = (node) => ICONS.find((icon) => icon.id === node.dataset.id)?.open();

export function initDesktop() {
    container = $('#desktop-icons');
    const desktop = $('#desktop');
    render();
    window.addEventListener('resize', () => { computeLayout(); positionIcons(); });

    /* --- Interaction avec les icônes --- */
    container.addEventListener('pointerdown', (event) => {
        const node = event.target.closest('.desktop-icon');
        if (!node || event.button !== 0) return;
        event.stopPropagation();
        wm.blurAll();

        if (event.ctrlKey) {
            node.classList.toggle('is-selected');
            return;
        }
        if (!node.classList.contains('is-selected')) select([node]);

        const startX = event.clientX;
        const startY = event.clientY;
        const dragged = $$('.desktop-icon.is-selected', container);
        let dragging = false;

        const onMove = (move) => {
            const dx = move.clientX - startX;
            const dy = move.clientY - startY;
            if (!dragging && Math.hypot(dx, dy) < 5) return;
            dragging = true;
            dragged.forEach((icon) => {
                const pos = layout[icon.dataset.id];
                icon.classList.add('is-dragging');
                icon.style.transform = `translate(${pos.col * cell.width + 4 + dx}px, ${pos.row * cell.height + 6 + dy}px)`;
            });
        };
        const onUp = (up) => {
            document.removeEventListener('pointermove', onMove);
            document.removeEventListener('pointerup', onUp);
            if (!dragging) {
                if (up.pointerType === 'touch' || isTouch()) openIcon(node);
                return;
            }
            const dCol = Math.round((up.clientX - startX) / cell.width);
            const dRow = Math.round((up.clientY - startY) / cell.height);
            const maxRows = rows();
            const maxCols = Math.max(1, Math.floor(window.innerWidth / cell.width));
            const moving = new Set(dragged.map((icon) => icon.dataset.id));
            const taken = new Set(Object.entries(layout).filter(([id]) => !moving.has(id)).map(([, p]) => `${p.col}:${p.row}`));
            const targets = dragged.map((icon) => {
                const pos = layout[icon.dataset.id];
                return { id: icon.dataset.id, col: clamp(pos.col + dCol, 0, maxCols - 1), row: clamp(pos.row + dRow, 0, maxRows - 1) };
            });
            const valid = targets.every((target) => !taken.has(`${target.col}:${target.row}`));
            if (valid) {
                targets.forEach((target) => { layout[target.id] = { col: target.col, row: target.row }; });
                store.set('desktop-layout', layout);
            }
            dragged.forEach((icon) => icon.classList.remove('is-dragging'));
            positionIcons();
        };
        document.addEventListener('pointermove', onMove);
        document.addEventListener('pointerup', onUp);
    });

    container.addEventListener('dblclick', (event) => {
        const node = event.target.closest('.desktop-icon');
        if (node) openIcon(node);
    });

    container.addEventListener('keydown', (event) => {
        const node = event.target.closest('.desktop-icon');
        if (!node) return;
        if (event.key === 'Enter') $$('.desktop-icon.is-selected', container).forEach(openIcon);
        if (event.key.startsWith('Arrow')) {
            event.preventDefault();
            const pos = layout[node.dataset.id];
            const delta = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] }[event.key];
            const target = Object.entries(layout).find(([, p]) => p.col === pos.col + delta[0] && p.row === pos.row + delta[1]);
            if (target) {
                const next = $(`.desktop-icon[data-id="${target[0]}"]`, container);
                select([next]);
                next.focus();
            }
        }
    });
    container.addEventListener('focusin', (event) => {
        const node = event.target.closest('.desktop-icon');
        if (node && !node.classList.contains('is-selected')) select([node]);
    });

    /* --- Sélection au lasso --- */
    const rect = $('#selection-rect');
    desktop.addEventListener('pointerdown', (event) => {
        if (event.button !== 0 || event.target.closest('.desktop-icon')) return;
        wm.blurAll();
        select([]);
        const startX = event.clientX;
        const startY = event.clientY;
        const onMove = (move) => {
            const x = Math.min(startX, move.clientX);
            const y = Math.min(startY, move.clientY);
            const w = Math.abs(move.clientX - startX);
            const h = Math.abs(move.clientY - startY);
            if (w + h < 4) return;
            rect.hidden = false;
            Object.assign(rect.style, { left: `${x}px`, top: `${y}px`, width: `${w}px`, height: `${h}px` });
            const hits = $$('.desktop-icon', container).filter((node) => {
                const box = node.getBoundingClientRect();
                return box.right > x && box.left < x + w && box.bottom > y && box.top < y + h;
            });
            select(hits);
        };
        const onUp = () => {
            rect.hidden = true;
            document.removeEventListener('pointermove', onMove);
            document.removeEventListener('pointerup', onUp);
        };
        document.addEventListener('pointermove', onMove);
        document.addEventListener('pointerup', onUp);
    });

    /* --- Menus contextuels --- */
    desktop.addEventListener('contextmenu', (event) => {
        event.preventDefault();
        const node = event.target.closest('.desktop-icon');
        if (node) {
            if (!node.classList.contains('is-selected')) select([node]);
            showContextMenu({
                x: event.clientX,
                y: event.clientY,
                topActions: [
                    { label: 'Couper', icon: ui.cut, disabled: true },
                    { label: 'Copier', icon: ui.copy, disabled: true },
                    { label: 'Renommer', icon: ui.rename, disabled: true },
                    { label: 'Partager', icon: ui.share, disabled: true },
                    { label: 'Supprimer', icon: ui.trash, disabled: true },
                ],
                items: [
                    { label: 'Ouvrir', icon: ui.open, shortcut: 'Entrée', action: () => openIcon(node) },
                    { label: 'Épingler à l\'écran de démarrage', icon: ui.star, disabled: true },
                    { separator: true },
                    { label: 'Propriétés', icon: ui.info, shortcut: 'Alt+Entrée', disabled: true },
                ],
            });
            return;
        }

        const size = store.get('desktop-icon-size', 'medium');
        const setSize = (value) => {
            store.set('desktop-icon-size', value);
            render();
        };
        showContextMenu({
            x: event.clientX,
            y: event.clientY,
            items: [
                {
                    label: 'Affichage', icon: ui.view, submenu: [
                        { label: 'Grandes icônes', checked: size === 'large', action: () => setSize('large') },
                        { label: 'Icônes moyennes', checked: size === 'medium', action: () => setSize('medium') },
                        { label: 'Petites icônes', checked: size === 'small', action: () => setSize('small') },
                        { separator: true },
                        {
                            label: 'Afficher les icônes du Bureau', checked: store.get('desktop-show-icons', true), action: () => {
                                store.set('desktop-show-icons', !store.get('desktop-show-icons', true));
                                render();
                            },
                        },
                    ],
                },
                {
                    label: 'Trier par', icon: ui.sort, submenu: [
                        { label: 'Nom', action: () => sortIcons((a, b) => a.label.localeCompare(b.label, 'fr')) },
                        { label: 'Type d\'élément', action: () => sortIcons((a, b) => Number(!!a.shortcut) - Number(!!b.shortcut)) },
                    ],
                },
                { label: 'Actualiser', icon: ui.refresh, action: refresh },
                { separator: true },
                {
                    label: 'Nouveau', icon: ui.plus, submenu: [
                        { label: 'Document texte', icon: `<img src="${appIconUrl('textfile')}" alt="">`, action: () => launch('notepad', { name: 'Nouveau document texte.txt', content: '' }) },
                    ],
                },
                { separator: true },
                { label: 'Fond d\'écran suivant', icon: ui.image, action: () => system.nextWallpaper() },
                { label: 'Paramètres d\'affichage', icon: ui.desktop, action: () => launch('settings', { page: 'system' }) },
                { label: 'Personnaliser', icon: ui.palette, action: () => launch('settings', { page: 'personalization' }) },
                { separator: true },
                { label: 'Ouvrir dans le Terminal', icon: ui.terminal, action: () => launch('terminal', { cwd: 'Bureau' }) },
            ],
        });
    });
}

function sortIcons(compare) {
    const sorted = [...ICONS].sort(compare);
    const maxRows = rows();
    layout = Object.fromEntries(sorted.map((icon, i) => [icon.id, { col: Math.floor(i / maxRows), row: i % maxRows }]));
    store.set('desktop-layout', layout);
    positionIcons();
}

function refresh() {
    container.classList.add('is-refreshing');
    setTimeout(() => container.classList.remove('is-refreshing'), 180);
}
