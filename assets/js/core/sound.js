/**
 * Sons système synthétisés (Web Audio) : aucun fichier à télécharger.
 * Le volume suit le curseur des Paramètres rapides.
 */
import { store } from './store.js';

let context = null;

function audio() {
    // Pas d'AudioContext avant une interaction de l'utilisateur (politique d'autoplay)
    if (!context && navigator.userActivation && !navigator.userActivation.hasBeenActive) return null;
    if (!context) {
        const Context = window.AudioContext || window.webkitAudioContext;
        if (!Context) return null;
        context = new Context();
    }
    if (context.state === 'suspended') context.resume().catch(() => {});
    return context;
}

/** Joue une suite de notes { freq, at, duration } avec une enveloppe douce. */
function play(notes, level = 0.18) {
    const volume = store.get('volume', 60) / 100;
    if (volume === 0) return;
    const ctx = audio();
    if (!ctx || ctx.state !== 'running') return;
    const master = ctx.createGain();
    master.gain.value = level * volume;
    master.connect(ctx.destination);
    const now = ctx.currentTime + 0.01;
    notes.forEach(({ freq, at, duration, type = 'sine' }) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = type;
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0, now + at);
        gain.gain.linearRampToValueAtTime(1, now + at + 0.012);
        gain.gain.exponentialRampToValueAtTime(0.001, now + at + duration);
        osc.connect(gain).connect(master);
        osc.start(now + at);
        osc.stop(now + at + duration + 0.05);
    });
}

export const sounds = {
    /** Notification (proche du son « Notify System Generic » de Windows 11). */
    notify: () => play([
        { freq: 1046.5, at: 0, duration: 0.5 },
        { freq: 1568, at: 0.09, duration: 0.7 },
        { freq: 2093, at: 0.09, duration: 0.35, type: 'triangle' },
    ], 0.12),
    /** Son « ding » de Windows (erreur / action impossible). */
    ding: () => play([
        { freq: 880, at: 0, duration: 0.6 },
        { freq: 1318.5, at: 0, duration: 0.5, type: 'triangle' },
    ], 0.12),
    /** Petit « tic » de réglage du volume. */
    tick: () => play([{ freq: 1200, at: 0, duration: 0.12 }], 0.1),
};
