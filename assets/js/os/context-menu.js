/**
 * Menus contextuels (style Windows 11 ou VS Code), avec sous-menus et navigation clavier.
 *
 * item = { label, icon, shortcut, action, disabled, checked, submenu: item[] } | { separator: true }
 */
import { el, escapeHtml, onDismiss, placeInViewport } from '../core/dom.js';
import { ui } from '../core/icons.js';

let current = null;

export function closeContextMenu() {
    current?.close();
}

const VSCODE_VARS = ['--vs-menu-bg', '--vs-menu-fg', '--vs-menu-border', '--vs-menu-selection-bg', '--vs-menu-selection-fg', '--vs-shadow'];

/** Les menus sont rendus hors de VS Code : on recopie les couleurs du thème actif. */
function inheritVscodeTheme(menu) {
    const host = document.querySelector('.window.is-active .vscode') ?? document.querySelector('.vscode');
    if (!host) return;
    const style = getComputedStyle(host);
    VSCODE_VARS.forEach((name) => menu.style.setProperty(name, style.getPropertyValue(name)));
}

function buildMenu(items, variant, topActions, depth, close) {
    const menu = el(`<div class="ctx-menu ctx-menu--${variant}" role="menu"></div>`);
    if (variant === 'vscode' && depth > 0) inheritVscodeTheme(menu);
    menu.dataset.depth = depth;

    if (topActions?.length) {
        const bar = el('<div class="ctx-top-actions"></div>');
        topActions.forEach((action) => {
            const button = el(`<button class="ctx-top-btn" type="button" title="${escapeHtml(action.label)}" aria-label="${escapeHtml(action.label)}">${action.icon}</button>`);
            button.disabled = !!action.disabled;
            button.addEventListener('click', () => { close(); action.action?.(); });
            bar.append(button);
        });
        menu.append(bar, el('<div class="ctx-separator" role="separator"></div>'));
    }

    items.filter(Boolean).forEach((item) => {
        if (item.separator) {
            menu.append(el('<div class="ctx-separator" role="separator"></div>'));
            return;
        }
        const row = el(`
            <button class="ctx-item" type="button" role="menuitem" ${item.disabled ? 'disabled' : ''}>
                <span class="ctx-icon">${item.checked ? ui.check : (item.icon ?? '')}</span>
                <span class="ctx-label">${escapeHtml(item.label)}</span>
                ${item.shortcut ? `<span class="ctx-shortcut">${escapeHtml(item.shortcut)}</span>` : ''}
                ${item.submenu ? `<span class="ctx-chevron">${ui.chevronRight}</span>` : ''}
            </button>`);

        if (item.submenu) {
            let submenu = null;
            const open = () => {
                menu.querySelectorAll(':scope > .ctx-item.is-open').forEach((other) => other !== row && other.dispatchEvent(new Event('ctx-close')));
                if (submenu) return;
                submenu = buildMenu(item.submenu, variant, null, depth + 1, close);
                document.body.append(submenu);
                const rect = row.getBoundingClientRect();
                placeInViewport(submenu, rect.right - 4, rect.top - 4);
                if (submenu.getBoundingClientRect().left < rect.right - 10) {
                    submenu.style.left = `${Math.max(8, rect.left - submenu.offsetWidth + 4)}px`;
                }
                row.classList.add('is-open');
                requestAnimationFrame(() => submenu?.classList.add('is-open'));
            };
            row.addEventListener('pointerenter', open);
            row.addEventListener('click', open);
            row.addEventListener('ctx-close', () => {
                submenu?.remove();
                submenu = null;
                row.classList.remove('is-open');
            });
            row.addEventListener('keydown', (event) => {
                if (event.key === 'ArrowRight') {
                    open();
                    submenu?.querySelector('.ctx-item:not(:disabled)')?.focus();
                }
            });
            menu.addEventListener('ctx-teardown', () => submenu?.remove());
        } else {
            row.addEventListener('pointerenter', () => {
                menu.querySelectorAll(':scope > .ctx-item.is-open').forEach((other) => other.dispatchEvent(new Event('ctx-close')));
            });
            row.addEventListener('click', () => {
                close();
                item.action?.();
            });
        }
        menu.append(row);
    });

    menu.addEventListener('keydown', (event) => {
        const rows = [...menu.querySelectorAll(':scope > .ctx-item:not(:disabled)')];
        const index = rows.indexOf(document.activeElement);
        if (event.key === 'ArrowDown') { event.preventDefault(); rows[(index + 1) % rows.length]?.focus(); }
        if (event.key === 'ArrowUp') { event.preventDefault(); rows[(index - 1 + rows.length) % rows.length]?.focus(); }
        if (event.key === 'ArrowLeft' && depth > 0) { event.preventDefault(); menu.remove(); }
    });
    return menu;
}

/** Ouvre un menu contextuel à la position (x, y). */
export function showContextMenu({ x, y, items, variant = 'win', topActions = null, anchor = null }) {
    closeContextMenu();

    let stopDismiss = () => {};
    const close = () => {
        stopDismiss();
        document.querySelectorAll('.ctx-menu').forEach((node) => {
            node.dispatchEvent(new Event('ctx-teardown'));
            node.remove();
        });
        anchor?.classList.remove('is-menu-open');
        if (current?.menu === menu) current = null;
    };

    const menu = buildMenu(items, variant, topActions, 0, close);
    if (variant === 'vscode') inheritVscodeTheme(menu);
    document.body.append(menu);
    placeInViewport(menu, x, y);
    anchor?.classList.add('is-menu-open');
    requestAnimationFrame(() => menu.classList.add('is-open'));

    stopDismiss = onDismiss(menu, close, { ignore: [{ contains: (node) => !!node?.closest?.('.ctx-menu') }] });
    current = { menu, close };
    return current;
}
