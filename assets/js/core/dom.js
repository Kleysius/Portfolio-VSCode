/**
 * Petits utilitaires DOM sans dépendance.
 */

export const $ = (selector, root = document) => root.querySelector(selector);
export const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const escapeHtml = (value = '') => String(value).replace(/[&<>"']/g, (c) => ESCAPES[c]);

/** Marque une chaîne comme HTML de confiance (non échappée dans `html`). */
class SafeHtml {
    constructor(value) { this.value = value; }
    toString() { return this.value; }
}
export const raw = (value) => new SafeHtml(value);

const stringify = (value) => {
    if (value == null || value === false) return '';
    if (Array.isArray(value)) return value.map(stringify).join('');
    if (value instanceof SafeHtml) return value.value;
    return escapeHtml(value);
};

/** Template tag : échappe automatiquement les interpolations. */
export const html = (strings, ...values) =>
    raw(strings.reduce((out, str, i) => out + str + (i < values.length ? stringify(values[i]) : ''), ''));

/** Crée un élément à partir d'un template HTML (un seul nœud racine). */
export const el = (markup) => {
    const tpl = document.createElement('template');
    tpl.innerHTML = String(markup).trim();
    return tpl.content.firstElementChild;
};

/** Écoute un évènement, éventuellement délégué via un sélecteur. Retourne une fonction de désinscription. */
export function on(target, type, selectorOrHandler, maybeHandler, options) {
    const delegated = typeof selectorOrHandler === 'string';
    const handler = delegated
        ? (event) => {
            const match = event.target.closest?.(selectorOrHandler);
            if (match && target.contains(match)) maybeHandler(event, match);
        }
        : selectorOrHandler;
    const opts = delegated ? options : maybeHandler;
    target.addEventListener(type, handler, opts);
    return () => target.removeEventListener(type, handler, opts);
}

/** Ferme un élément flottant lors d'un clic extérieur ou d'Échap. */
export function onDismiss(element, close, { ignore = [] } = {}) {
    const onPointer = (event) => {
        if (element.contains(event.target)) return;
        if (ignore.some((node) => node?.contains?.(event.target))) return;
        close();
    };
    const onKey = (event) => { if (event.key === 'Escape') close(); };
    // Différé pour ignorer le clic qui a ouvert l'élément
    const timer = setTimeout(() => {
        document.addEventListener('pointerdown', onPointer, true);
        document.addEventListener('keydown', onKey);
    });
    return () => {
        clearTimeout(timer);
        document.removeEventListener('pointerdown', onPointer, true);
        document.removeEventListener('keydown', onKey);
    };
}

/** Positionne un élément flottant dans le viewport à partir d'un point. */
export function placeInViewport(element, x, y, { margin = 8 } = {}) {
    element.style.left = '0px';
    element.style.top = '0px';
    const { width, height } = element.getBoundingClientRect();
    const maxX = window.innerWidth - width - margin;
    const maxY = window.innerHeight - height - margin;
    element.style.left = `${Math.max(margin, Math.min(x, maxX))}px`;
    element.style.top = `${Math.max(margin, Math.min(y, maxY))}px`;
}

export const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
export const isTouch = () => window.matchMedia('(pointer: coarse)').matches;
export const isCompact = () => window.matchMedia('(max-width: 768px)').matches;

export const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
export const nextFrame = () => new Promise((resolve) => requestAnimationFrame(() => resolve()));

export const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

let uid = 0;
export const uniqueId = (prefix = 'id') => `${prefix}-${++uid}`;
