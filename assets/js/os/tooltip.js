/**
 * Infobulles : remplace les infobulles natives du navigateur (attribut `title`) par celles de
 * Windows 11 — ou par le « hover » de VS Code quand l'élément est dans VS Code.
 */
const SHOW_DELAY = 600;
const VSCODE_VARS = ['--vs-widget-bg', '--vs-widget-border', '--vs-editor-fg', '--vs-shadow'];

let tip = null;
let timer = null;
let current = null;
let lastHide = 0;

function ensureTip() {
    if (!tip) {
        tip = document.createElement('div');
        tip.className = 'os-tooltip';
        tip.setAttribute('role', 'tooltip');
        document.body.append(tip);
    }
    return tip;
}

/** Transfère `title` vers `data-tip` pour neutraliser l'infobulle native (en gardant un nom accessible). */
function adopt(element) {
    const title = element.getAttribute('title');
    if (title !== null) {
        if (title) element.dataset.tip = title;
        if (!element.hasAttribute('aria-label') && !element.textContent.trim() && title) element.setAttribute('aria-label', title);
        element.removeAttribute('title');
    }
    return element.dataset.tip;
}

function place(element, pointer) {
    const node = ensureTip();
    const rect = element.getBoundingClientRect();
    const box = node.getBoundingClientRect();
    const margin = 8;
    let x;
    let y;
    if (element.closest('.taskbar')) {
        // Barre des tâches : au-dessus de l'élément, centré
        x = rect.left + rect.width / 2 - box.width / 2;
        y = rect.top - box.height - 10;
    } else if (node.classList.contains('is-vscode')) {
        // VS Code : sous l'élément (ou au-dessus s'il n'y a pas la place)
        x = rect.left + rect.width / 2 - box.width / 2;
        y = rect.bottom + 6;
        if (y + box.height > window.innerHeight - margin) y = rect.top - box.height - 6;
    } else {
        // Windows : sous le pointeur
        x = pointer.x - 2;
        y = pointer.y + 22;
        if (y + box.height > window.innerHeight - margin) y = pointer.y - box.height - 10;
    }
    node.style.left = `${Math.max(margin, Math.min(x, window.innerWidth - box.width - margin))}px`;
    node.style.top = `${Math.max(margin, y)}px`;
}

function show(element, pointer) {
    const text = element.dataset.tip;
    if (!text || !element.isConnected) return;
    const node = ensureTip();
    const vscode = element.closest('.vscode');
    node.className = `os-tooltip ${vscode ? 'is-vscode' : ''}`;
    if (vscode) {
        const style = getComputedStyle(vscode);
        VSCODE_VARS.forEach((name) => node.style.setProperty(name, style.getPropertyValue(name)));
    }
    node.textContent = text;
    node.hidden = false;
    place(element, pointer);
    requestAnimationFrame(() => node.classList.add('is-visible'));
}

export function hideTooltip() {
    clearTimeout(timer);
    current = null;
    if (tip && !tip.hidden) {
        tip.classList.remove('is-visible');
        tip.hidden = true;
        lastHide = Date.now();
    }
}

export function initTooltips() {
    document.addEventListener('pointerover', (event) => {
        if (event.pointerType === 'touch') return;
        const element = event.target.closest?.('[title], [data-tip]');
        if (!element || element === current) return;
        const text = adopt(element);
        hideTooltip();
        if (!text) return;
        current = element;
        const pointer = { x: event.clientX, y: event.clientY };
        // Une infobulle juste fermée se rouvre immédiatement sur la voisine (comme Windows)
        const delay = Date.now() - lastHide < 400 ? 60 : SHOW_DELAY;
        timer = setTimeout(() => show(element, pointer), delay);
    }, true);

    document.addEventListener('pointerout', (event) => {
        if (current && !current.contains(event.relatedTarget)) hideTooltip();
    }, true);
    ['pointerdown', 'wheel', 'keydown'].forEach((type) => document.addEventListener(type, hideTooltip, { capture: true, passive: true }));
    window.addEventListener('blur', hideTooltip);
}
