/**
 * Gestionnaire de fenêtres façon Windows 11 :
 * déplacement, redimensionnement, ancrage (Snap) aux bords, dispositions d'ancrage,
 * agrandissement, réduction animée vers la barre des tâches, gestion du focus.
 */
import { $, el, html, raw, clamp, isCompact, prefersReducedMotion, uniqueId } from '../core/dom.js';
import { bus } from '../core/bus.js';
import { ui } from '../core/icons.js';

const TASKBAR_HEIGHT = 48;
const EDGE = 4;
const layer = () => $('#windows');
const preview = () => $('#snap-preview');

const windows = new Map();
let zIndex = 10;
let activeId = null;
let cascade = 0;

/** Zones des dispositions d'ancrage (fractions de l'espace de travail). */
const SNAP_LAYOUTS = [
    [{ x: 0, y: 0, w: 0.5, h: 1 }, { x: 0.5, y: 0, w: 0.5, h: 1 }],
    [{ x: 0, y: 0, w: 0.66, h: 1 }, { x: 0.66, y: 0, w: 0.34, h: 1 }],
    [{ x: 0, y: 0, w: 0.5, h: 1 }, { x: 0.5, y: 0, w: 0.5, h: 0.5 }, { x: 0.5, y: 0.5, w: 0.5, h: 0.5 }],
    [{ x: 0, y: 0, w: 0.5, h: 0.5 }, { x: 0.5, y: 0, w: 0.5, h: 0.5 }, { x: 0, y: 0.5, w: 0.5, h: 0.5 }, { x: 0.5, y: 0.5, w: 0.5, h: 0.5 }],
];

const workArea = () => ({ width: window.innerWidth, height: window.innerHeight - TASKBAR_HEIGHT });

const zoneToRect = (zone) => {
    const area = workArea();
    return {
        left: Math.round(zone.x * area.width),
        top: Math.round(zone.y * area.height),
        width: Math.round(zone.w * area.width),
        height: Math.round(zone.h * area.height),
    };
};

class AppWindow {
    constructor(options) {
        this.id = uniqueId('win');
        this.appId = options.appId;
        this.options = options;
        this.title = options.title;
        this.icon = options.icon;
        this.state = 'normal'; // normal | maximized | snapped | minimized
        this.listeners = {};
        this.minWidth = options.minWidth ?? 360;
        this.minHeight = options.minHeight ?? 240;
        this.build();
    }

    build() {
        const { frame = 'default', className = '', resizable = true } = this.options;
        this.el = el(html`
            <section class="window ${className} ${frame === 'custom' ? 'window--custom' : ''}" role="dialog" aria-label="${this.title}" data-app="${this.appId}" tabindex="-1">
                ${frame === 'custom' ? '' : raw(html`
                    <header class="window-titlebar" data-drag>
                        <img class="window-icon" src="${this.icon}" alt="" draggable="false">
                        <span class="window-title">${this.title}</span>
                    </header>`)}
                <div class="window-body"></div>
                ${resizable ? raw(['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'].map((dir) => `<div class="resize-handle resize-${dir}" data-resize="${dir}"></div>`).join('')) : ''}
            </section>`);

        this.controls = el(html`
            <div class="window-controls">
                <button class="wc-btn wc-min" type="button" aria-label="Réduire" title="Réduire">${raw(ui.minimize)}</button>
                <button class="wc-btn wc-max" type="button" aria-label="Agrandir" title="Agrandir">${raw(ui.maximize)}</button>
                <button class="wc-btn wc-close" type="button" aria-label="Fermer" title="Fermer">${raw(ui.close)}</button>
            </div>`);
        if (!resizable) this.controls.querySelector('.wc-max').disabled = true;
        $('.window-titlebar', this.el)?.append(this.controls);

        this.body = $('.window-body', this.el);
        if (this.options.content) this.body.append(this.options.content);

        this.bindControls();
        this.bindDrag();
        this.bindResize();
        this.el.addEventListener('pointerdown', () => this.focus(), true);
    }

    on(event, fn) {
        (this.listeners[event] ??= new Set()).add(fn);
        return () => this.listeners[event].delete(fn);
    }

    emit(event, ...args) {
        this.listeners[event]?.forEach((fn) => fn(...args));
    }

    /* ---------------- Contrôles ---------------- */
    bindControls() {
        const [min, max, close] = this.controls.children;
        min.addEventListener('click', (event) => { event.stopPropagation(); this.minimize(); });
        max.addEventListener('click', (event) => { event.stopPropagation(); this.toggleMaximize(); });
        close.addEventListener('click', (event) => { event.stopPropagation(); this.close(); });

        // Dispositions d'ancrage au survol du bouton « Agrandir »
        let hoverTimer;
        max.addEventListener('pointerenter', () => {
            if (isCompact() || this.options.resizable === false) return;
            hoverTimer = setTimeout(() => showSnapLayouts(this, max), 550);
        });
        max.addEventListener('pointerleave', () => clearTimeout(hoverTimer));
        max.addEventListener('pointerdown', () => clearTimeout(hoverTimer));
    }

    /* ---------------- Déplacement + Snap ---------------- */
    bindDrag() {
        this.el.addEventListener('pointerdown', (event) => {
            const handle = event.target.closest('[data-drag]');
            if (!handle || event.button !== 0 || isCompact()) return;
            if (event.target.closest('button, a, input, textarea, select, [data-no-drag]')) return;

            const startX = event.clientX;
            const startY = event.clientY;
            let rect = this.el.getBoundingClientRect();
            let offsetX = startX - rect.left;
            const offsetY = startY - rect.top;
            let moved = false;
            let snapZone = null;

            const onMove = (move) => {
                if (!moved && Math.hypot(move.clientX - startX, move.clientY - startY) < 4) return;
                if (!moved) {
                    moved = true;
                    document.body.classList.add('is-dragging-window');
                    // L'aperçu d'ancrage passe au-dessus des autres fenêtres, mais sous celle qu'on déplace
                    preview().style.zIndex = ++zIndex;
                    this.el.style.zIndex = ++zIndex;
                    if (this.state === 'maximized' || this.state === 'snapped') {
                        // Restaure la taille précédente en gardant la souris au même endroit relatif
                        const ratio = offsetX / rect.width;
                        this.state = 'normal';
                        this.el.classList.remove('is-maximized');
                        this.applyRect(this.restoreRect ?? this.defaultRect());
                        rect = this.el.getBoundingClientRect();
                        offsetX = rect.width * ratio;
                        this.syncMaxButton();
                    }
                }
                const left = move.clientX - offsetX;
                const top = clamp(move.clientY - offsetY, 0, workArea().height - 32);
                this.el.style.left = `${left}px`;
                this.el.style.top = `${top}px`;

                snapZone = detectSnapZone(move.clientX, move.clientY);
                showSnapPreview(snapZone);
            };

            const onUp = () => {
                document.removeEventListener('pointermove', onMove);
                document.removeEventListener('pointerup', onUp);
                document.body.classList.remove('is-dragging-window');
                showSnapPreview(null);
                if (!moved) return;
                if (snapZone === 'max') this.maximize();
                else if (snapZone) this.snap(snapZone);
                else this.restoreRect = this.currentRect();
            };

            document.addEventListener('pointermove', onMove);
            document.addEventListener('pointerup', onUp);
        });

        this.el.addEventListener('dblclick', (event) => {
            if (!event.target.closest('[data-drag]') || event.target.closest('button, a, input, [data-no-drag]')) return;
            this.toggleMaximize();
        });
    }

    /* ---------------- Redimensionnement ---------------- */
    bindResize() {
        this.el.querySelectorAll('[data-resize]').forEach((handle) => {
            handle.addEventListener('pointerdown', (event) => {
                if (event.button !== 0 || this.state === 'maximized') return;
                event.preventDefault();
                event.stopPropagation();
                const dir = handle.dataset.resize;
                const start = this.currentRect();
                const startX = event.clientX;
                const startY = event.clientY;
                document.body.classList.add('is-resizing-window');
                document.body.dataset.resizeDir = dir;

                const onMove = (move) => {
                    const dx = move.clientX - startX;
                    const dy = move.clientY - startY;
                    const next = { ...start };
                    if (dir.includes('e')) next.width = Math.max(this.minWidth, start.width + dx);
                    if (dir.includes('s')) next.height = Math.max(this.minHeight, start.height + dy);
                    if (dir.includes('w')) {
                        next.width = Math.max(this.minWidth, start.width - dx);
                        next.left = start.left + start.width - next.width;
                    }
                    if (dir.includes('n')) {
                        next.height = Math.max(this.minHeight, start.height - dy);
                        next.top = Math.max(0, start.top + start.height - next.height);
                    }
                    this.applyRect(next);
                    this.emit('resize');
                };
                const onUp = () => {
                    document.removeEventListener('pointermove', onMove);
                    document.removeEventListener('pointerup', onUp);
                    document.body.classList.remove('is-resizing-window');
                    delete document.body.dataset.resizeDir;
                    this.state = 'normal';
                    this.el.classList.remove('is-maximized');
                    this.syncMaxButton();
                    this.restoreRect = this.currentRect();
                };
                document.addEventListener('pointermove', onMove);
                document.addEventListener('pointerup', onUp);
            });
        });
    }

    /* ---------------- Géométrie ---------------- */
    currentRect() {
        return {
            left: this.el.offsetLeft,
            top: this.el.offsetTop,
            width: this.el.offsetWidth,
            height: this.el.offsetHeight,
        };
    }

    defaultRect() {
        const area = workArea();
        const width = Math.min(this.options.width ?? 960, area.width - 24);
        const height = Math.min(this.options.height ?? 640, area.height - 24);
        const offset = (cascade++ % 6) * 28;
        return {
            width,
            height,
            left: Math.max(0, Math.round((area.width - width) / 2) + offset - 56),
            top: Math.max(0, Math.round((area.height - height) / 2) + offset - 56),
        };
    }

    applyRect({ left, top, width, height }) {
        Object.assign(this.el.style, { left: `${left}px`, top: `${top}px`, width: `${width}px`, height: `${height}px` });
    }

    animate(fn) {
        if (prefersReducedMotion()) return fn();
        this.el.classList.add('is-animating');
        fn();
        clearTimeout(this.animTimer);
        this.animTimer = setTimeout(() => {
            this.el.classList.remove('is-animating');
            this.emit('resize');
        }, 220);
    }

    /* ---------------- États ---------------- */
    maximize() {
        if (this.state === 'normal') this.restoreRect = this.currentRect();
        this.state = 'maximized';
        this.el.classList.add('is-maximized');
        const area = workArea();
        this.animate(() => this.applyRect({ left: 0, top: 0, width: area.width, height: area.height }));
        this.syncMaxButton();
        bus.emit('window:change', this);
    }

    restore() {
        this.state = 'normal';
        this.el.classList.remove('is-maximized');
        this.animate(() => this.applyRect(this.restoreRect ?? this.defaultRect()));
        this.syncMaxButton();
        bus.emit('window:change', this);
    }

    toggleMaximize() {
        if (this.options.resizable === false) return;
        if (this.state === 'maximized' || this.state === 'snapped') this.restore();
        else this.maximize();
    }

    snap(zone) {
        if (this.state === 'normal') this.restoreRect = this.currentRect();
        const zones = {
            left: { x: 0, y: 0, w: 0.5, h: 1 },
            right: { x: 0.5, y: 0, w: 0.5, h: 1 },
            'top-left': { x: 0, y: 0, w: 0.5, h: 0.5 },
            'top-right': { x: 0.5, y: 0, w: 0.5, h: 0.5 },
            'bottom-left': { x: 0, y: 0.5, w: 0.5, h: 0.5 },
            'bottom-right': { x: 0.5, y: 0.5, w: 0.5, h: 0.5 },
        };
        const fraction = typeof zone === 'string' ? zones[zone] : zone;
        this.state = 'snapped';
        this.el.classList.remove('is-maximized');
        this.animate(() => this.applyRect(zoneToRect(fraction)));
        this.syncMaxButton();
        this.focus();
    }

    syncMaxButton() {
        const button = this.controls.querySelector('.wc-max');
        const restored = this.state === 'maximized' || this.state === 'snapped';
        button.innerHTML = restored ? ui.restore : ui.maximize;
        button.title = restored ? 'Niveau inférieur' : 'Agrandir';
        button.setAttribute('aria-label', button.title);
    }

    minimize() {
        if (this.state === 'minimized') return;
        this.previousState = this.state;
        this.state = 'minimized';
        const target = document.querySelector(`.taskbar [data-app-button="${this.appId}"]`);
        if (target && !prefersReducedMotion()) {
            const from = this.el.getBoundingClientRect();
            const to = target.getBoundingClientRect();
            const dx = to.left + to.width / 2 - (from.left + from.width / 2);
            const dy = to.top + to.height / 2 - (from.top + from.height / 2);
            this.el.style.setProperty('--min-transform', `translate(${dx}px, ${dy}px) scale(0.1)`);
        } else {
            this.el.style.setProperty('--min-transform', 'translateY(40px) scale(0.9)');
        }
        this.el.classList.add('is-minimized');
        if (activeId === this.id) setActive(null);
        bus.emit('window:change', this);
    }

    unminimize() {
        if (this.state !== 'minimized') return;
        this.state = this.previousState ?? 'normal';
        this.el.classList.remove('is-minimized');
        this.focus();
    }

    focus() {
        if (this.state === 'minimized') {
            this.unminimize();
            return;
        }
        if (activeId === this.id) return;
        this.el.style.zIndex = ++zIndex;
        setActive(this.id);
        this.emit('focus');
    }

    isActive() {
        return activeId === this.id;
    }

    setTitle(title) {
        this.title = title;
        this.el.setAttribute('aria-label', title);
        const node = $('.window-title', this.el);
        if (node) node.textContent = title;
        bus.emit('window:change', this);
    }

    close() {
        if (this.closing) return;
        this.closing = true;
        this.emit('close');
        this.el.classList.add('is-closing');
        const remove = () => {
            this.el.remove();
            windows.delete(this.id);
            if (activeId === this.id) {
                activeId = null;
                focusTopmost();
            }
            bus.emit('window:close', this);
        };
        if (prefersReducedMotion()) remove();
        else setTimeout(remove, 160);
    }
}

/* ------------------------------------------------------------------ */
/* Aides Snap                                                           */
/* ------------------------------------------------------------------ */
function detectSnapZone(x, y) {
    const { width } = workArea();
    const corner = 80;
    if (y <= EDGE) return x < corner ? 'top-left' : x > width - corner ? 'top-right' : 'max';
    if (x <= EDGE) return y < corner ? 'top-left' : y > workArea().height - corner ? 'bottom-left' : 'left';
    if (x >= width - EDGE) return y < corner ? 'top-right' : y > workArea().height - corner ? 'bottom-right' : 'right';
    return null;
}

function showSnapPreview(zone) {
    const node = preview();
    if (!zone) {
        node.classList.remove('is-visible');
        return;
    }
    const zones = {
        max: { x: 0, y: 0, w: 1, h: 1 },
        left: { x: 0, y: 0, w: 0.5, h: 1 },
        right: { x: 0.5, y: 0, w: 0.5, h: 1 },
        'top-left': { x: 0, y: 0, w: 0.5, h: 0.5 },
        'top-right': { x: 0.5, y: 0, w: 0.5, h: 0.5 },
        'bottom-left': { x: 0, y: 0.5, w: 0.5, h: 0.5 },
        'bottom-right': { x: 0.5, y: 0.5, w: 0.5, h: 0.5 },
    };
    const rect = zoneToRect(zones[zone]);
    Object.assign(node.style, {
        left: `${rect.left + 8}px`,
        top: `${rect.top + 8}px`,
        width: `${rect.width - 16}px`,
        height: `${rect.height - 16}px`,
    });
    node.classList.add('is-visible');
}

let snapFlyout = null;
function showSnapLayouts(win, anchor) {
    snapFlyout?.remove();
    snapFlyout = el(html`
        <div class="snap-layouts" role="menu" aria-label="Dispositions d'ancrage">
            ${SNAP_LAYOUTS.map((layout, i) => raw(html`
                <div class="snap-layout" data-layout="${i}">
                    ${layout.map((zone, j) => raw(`<button class="snap-zone" data-zone="${j}" style="left:${zone.x * 100}%;top:${zone.y * 100}%;width:${zone.w * 100}%;height:${zone.h * 100}%" aria-label="Zone ${j + 1}"></button>`))}
                </div>`))}
        </div>`);
    document.body.append(snapFlyout);
    const rect = anchor.getBoundingClientRect();
    const width = snapFlyout.offsetWidth;
    snapFlyout.style.left = `${clamp(rect.left + rect.width / 2 - width / 2, 8, window.innerWidth - width - 8)}px`;
    snapFlyout.style.top = `${rect.bottom + 6}px`;
    requestAnimationFrame(() => snapFlyout?.classList.add('is-open'));

    snapFlyout.addEventListener('click', (event) => {
        const zone = event.target.closest('.snap-zone');
        if (!zone) return;
        const layout = SNAP_LAYOUTS[zone.parentElement.dataset.layout];
        win.snap(layout[zone.dataset.zone]);
        closeFlyout();
    });

    const closeFlyout = () => {
        snapFlyout?.remove();
        snapFlyout = null;
        document.removeEventListener('pointermove', onMove);
    };
    const onMove = (event) => {
        if (!snapFlyout) return;
        const over = snapFlyout.contains(event.target) || anchor.contains(event.target);
        if (!over) {
            clearTimeout(snapFlyout.leaveTimer);
            snapFlyout.leaveTimer = setTimeout(() => {
                if (snapFlyout && !snapFlyout.matches(':hover') && !anchor.matches(':hover')) closeFlyout();
            }, 250);
        }
    };
    document.addEventListener('pointermove', onMove);
}

/* ------------------------------------------------------------------ */
/* Focus                                                                */
/* ------------------------------------------------------------------ */
function setActive(id) {
    activeId = id;
    windows.forEach((win) => win.el.classList.toggle('is-active', win.id === id));
    bus.emit('window:focus', id ? windows.get(id) : null);
}

function focusTopmost() {
    const candidates = [...windows.values()].filter((win) => win.state !== 'minimized' && !win.closing);
    candidates.sort((a, b) => Number(b.el.style.zIndex) - Number(a.el.style.zIndex));
    if (candidates[0]) candidates[0].focus();
    else setActive(null);
}

/* ------------------------------------------------------------------ */
/* API publique                                                         */
/* ------------------------------------------------------------------ */
export const wm = {
    open(options) {
        const win = new AppWindow(options);
        windows.set(win.id, win);
        layer().append(win.el);

        if (isCompact() || options.maximized) {
            win.restoreRect = win.defaultRect();
            win.state = 'maximized';
            win.el.classList.add('is-maximized');
            const area = workArea();
            win.applyRect({ left: 0, top: 0, width: area.width, height: area.height });
            win.syncMaxButton();
        } else {
            const rect = win.defaultRect();
            if (options.x != null) rect.left = options.x;
            if (options.y != null) rect.top = options.y;
            win.applyRect(rect);
            win.restoreRect = rect;
        }

        win.el.classList.add('is-opening');
        requestAnimationFrame(() => requestAnimationFrame(() => win.el.classList.remove('is-opening')));
        win.focus();
        bus.emit('window:open', win);
        return win;
    },
    get: (id) => windows.get(id),
    all: () => [...windows.values()],
    byApp: (appId) => [...windows.values()].filter((win) => win.appId === appId && !win.closing),
    active: () => (activeId ? windows.get(activeId) : null),
    blurAll: () => setActive(null),
    minimizeAll() {
        const visible = [...windows.values()].filter((win) => win.state !== 'minimized');
        if (visible.length) {
            this.shownDesktop = visible;
            visible.forEach((win) => win.minimize());
        } else if (this.shownDesktop) {
            this.shownDesktop.forEach((win) => win.unminimize());
            this.shownDesktop = null;
        }
    },
};

// Ré-adapte les fenêtres agrandies/ancrées quand le navigateur est redimensionné
window.addEventListener('resize', () => {
    const area = workArea();
    windows.forEach((win) => {
        if (win.state === 'maximized' || isCompact()) {
            win.applyRect({ left: 0, top: 0, width: area.width, height: area.height });
        } else {
            const rect = win.currentRect();
            win.applyRect({
                ...rect,
                width: Math.min(rect.width, area.width),
                height: Math.min(rect.height, area.height),
                left: clamp(rect.left, 0, Math.max(0, area.width - 120)),
                top: clamp(rect.top, 0, Math.max(0, area.height - 40)),
            });
        }
        win.emit('resize');
    });
});
