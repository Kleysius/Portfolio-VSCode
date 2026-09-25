/**
 * Préférences persistées (localStorage) avec abonnement aux changements.
 * Toutes les lectures/écritures sont protégées : navigation privée, stockage bloqué…
 */
const PREFIX = 'portfolio:';
const listeners = new Map();

function read(key, fallback) {
    try {
        const value = localStorage.getItem(PREFIX + key);
        return value === null ? fallback : JSON.parse(value);
    } catch {
        return fallback;
    }
}

function write(key, value) {
    try {
        localStorage.setItem(PREFIX + key, JSON.stringify(value));
    } catch { /* stockage indisponible */ }
}

export const store = {
    get: read,
    set(key, value) {
        write(key, value);
        listeners.get(key)?.forEach((fn) => fn(value));
    },
    update(key, fallback, updater) {
        const next = updater(read(key, fallback));
        this.set(key, next);
        return next;
    },
    subscribe(key, fn) {
        if (!listeners.has(key)) listeners.set(key, new Set());
        listeners.get(key).add(fn);
        return () => listeners.get(key).delete(fn);
    },
};

export const session = {
    get(key, fallback) {
        try {
            const value = sessionStorage.getItem(PREFIX + key);
            return value === null ? fallback : JSON.parse(value);
        } catch {
            return fallback;
        }
    },
    set(key, value) {
        try { sessionStorage.setItem(PREFIX + key, JSON.stringify(value)); } catch { /* ignoré */ }
    },
};
