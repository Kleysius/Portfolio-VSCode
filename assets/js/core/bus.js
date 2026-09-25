/** Bus d'évènements global minimaliste. */
const handlers = new Map();

export const bus = {
    on(event, fn) {
        if (!handlers.has(event)) handlers.set(event, new Set());
        handlers.get(event).add(fn);
        return () => handlers.get(event)?.delete(fn);
    },
    once(event, fn) {
        const off = this.on(event, (...args) => { off(); fn(...args); });
        return off;
    },
    emit(event, ...args) {
        handlers.get(event)?.forEach((fn) => fn(...args));
    },
};
