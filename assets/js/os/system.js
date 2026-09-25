/**
 * Réglages système appliqués en direct : fond d'écran, mode clair/sombre, couleur d'accentuation,
 * luminosité, éclairage nocturne. Persistés dans le localStorage.
 */
import { store } from '../core/store.js';
import { bus } from '../core/bus.js';
import { wallpapers } from '../data/wallpapers.js';

const root = document.documentElement;

export const system = {
    get wallpaper() { return store.get('wallpaper', 0); },
    get mode() { return store.get('mode', 'dark'); },
    get accent() { return store.get('accent', '#0078d4'); },
    get brightness() { return store.get('brightness', 100); },
    get volume() { return store.get('volume', 60); },
    get nightLight() { return store.get('nightLight', false); },

    setWallpaper(index) {
        const next = ((index % wallpapers.length) + wallpapers.length) % wallpapers.length;
        store.set('wallpaper', next);
        applyWallpaper(next);
        bus.emit('system:change', 'wallpaper');
    },
    nextWallpaper() { this.setWallpaper(this.wallpaper + 1); },

    setMode(mode) {
        store.set('mode', mode);
        root.dataset.mode = mode;
        bus.emit('system:change', 'mode');
    },
    toggleMode() { this.setMode(this.mode === 'dark' ? 'light' : 'dark'); },

    setAccent(color) {
        store.set('accent', color);
        applyAccent(color);
        bus.emit('system:change', 'accent');
    },

    setBrightness(value) {
        store.set('brightness', value);
        root.style.setProperty('--os-brightness', `${Math.max(30, value) / 100}`);
        bus.emit('system:change', 'brightness');
    },

    setVolume(value) {
        store.set('volume', value);
        bus.emit('system:change', 'volume');
    },

    setNightLight(enabled) {
        store.set('nightLight', enabled);
        root.classList.toggle('night-light', enabled);
        bus.emit('system:change', 'nightLight');
    },
};

function applyWallpaper(index) {
    const layer = document.getElementById('wallpaper');
    // URL absolue : une url() dans une variable CSS est résolue par rapport à la feuille qui l'utilise
    const src = new URL(wallpapers[index].src, document.baseURI).href;
    const img = new Image();
    img.onload = () => {
        // Fondu enchaîné entre l'ancien et le nouveau fond
        const next = document.createElement('div');
        next.className = 'wallpaper-layer';
        next.style.backgroundImage = `url("${src}")`;
        layer.append(next);
        requestAnimationFrame(() => next.classList.add('is-visible'));
        setTimeout(() => [...layer.children].slice(0, -1).forEach((node) => node.remove()), 900);
    };
    img.src = src;
    root.style.setProperty('--wallpaper', `url("${src}")`);
}

/** Dérive les nuances d'accentuation (clair/sombre) à partir d'une couleur. */
function applyAccent(hex) {
    const n = parseInt(hex.slice(1), 16);
    const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    const mix = (target, amount) => [r, g, b].map((c) => Math.round(c + (target - c) * amount));
    const toCss = (rgb) => `rgb(${rgb.join(' ')})`;
    root.style.setProperty('--accent', hex);
    root.style.setProperty('--accent-rgb', `${r} ${g} ${b}`);
    root.style.setProperty('--accent-light', toCss(mix(255, 0.45)));
    root.style.setProperty('--accent-dark', toCss(mix(0, 0.2)));
}

export function initSystem() {
    root.dataset.mode = system.mode;
    applyAccent(system.accent);
    applyWallpaper(system.wallpaper);
    root.style.setProperty('--os-brightness', `${Math.max(30, system.brightness) / 100}`);
    root.classList.toggle('night-light', system.nightLight);
}
