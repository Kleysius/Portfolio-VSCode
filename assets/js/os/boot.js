/**
 * Séquence de démarrage : écran de boot → écran de verrouillage → connexion → bureau.
 * Gère aussi les actions d'alimentation (verrouiller, veille, arrêter, redémarrer).
 */
import { $, html, raw, wait, prefersReducedMotion } from '../core/dom.js';
import { session } from '../core/store.js';
import { appIconUrl, ui } from '../core/icons.js';
import { bus } from '../core/bus.js';
import { profile } from '../data/profile.js';
import { closeFlyouts } from './flyout.js';

let clockTimer;

function formatLockClock() {
    const now = new Date();
    return {
        time: now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
        date: now.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }),
    };
}

/** Affiche l'écran de verrouillage ; résout quand l'utilisateur s'est connecté. */
function showLockScreen() {
    const lock = $('#lock-screen');
    const { time, date } = formatLockClock();
    lock.innerHTML = html`
        <div class="lock-clock">
            <span class="lock-time">${time}</span>
            <span class="lock-date">${date}</span>
        </div>
        <p class="lock-hint">Cliquez ou appuyez sur une touche pour déverrouiller</p>
        <div class="lock-status">${raw(ui.wifi)}${raw(ui.batteryCharging)}</div>

        <form class="login" autocomplete="off">
            <img class="login-avatar" src="${appIconUrl('user')}" alt="">
            <h2 class="login-name">${profile.fullName}</h2>
            <button class="login-button" type="submit">Se connecter</button>
            <p class="login-hint">Aucun mot de passe requis — bienvenue !</p>
            <div class="login-welcome" hidden>
                <div class="boot-spinner is-small"><i></i><i></i><i></i><i></i><i></i></div>
                <span>Bienvenue</span>
            </div>
        </form>`;
    lock.hidden = false;
    lock.classList.remove('is-unlocked', 'is-login', 'is-leaving');
    requestAnimationFrame(() => lock.classList.add('is-visible'));

    clearInterval(clockTimer);
    clockTimer = setInterval(() => {
        const next = formatLockClock();
        $('.lock-time', lock).textContent = next.time;
        $('.lock-date', lock).textContent = next.date;
    }, 1000);

    return new Promise((resolve) => {
        const reveal = (event) => {
            if (lock.classList.contains('is-login')) return;
            if (event?.type === 'keydown' && ['Shift', 'Control', 'Alt', 'Meta', 'Tab'].includes(event.key)) return;
            lock.classList.add('is-login');
            setTimeout(() => $('.login-button', lock).focus(), 250);
        };
        lock.addEventListener('pointerdown', reveal);
        lock.addEventListener('wheel', reveal, { passive: true });
        document.addEventListener('keydown', reveal);

        $('.login', lock).addEventListener('submit', async (event) => {
            event.preventDefault();
            document.removeEventListener('keydown', reveal);
            $('.login-button', lock).hidden = true;
            $('.login-hint', lock).hidden = true;
            $('.login-welcome', lock).hidden = false;
            await wait(prefersReducedMotion() ? 0 : 900);
            clearInterval(clockTimer);
            lock.classList.add('is-leaving');
            await wait(400);
            lock.hidden = true;
            lock.classList.remove('is-visible');
            resolve();
        }, { once: true });
    });
}

async function hideBootScreen() {
    const boot = $('#boot-screen');
    boot.classList.add('is-hidden');
    await wait(500);
    boot.hidden = true;
}

/** Point d'entrée : joue la séquence de démarrage si nécessaire. */
export async function bootSequence() {
    const params = new URLSearchParams(location.search);
    const alreadyLogged = session.get('logged', false);
    const skip = params.has('skip') || prefersReducedMotion();

    if (alreadyLogged || skip) {
        await hideBootScreen();
        session.set('logged', true);
        return { firstLogin: false };
    }

    await wait(1800);
    const lockReady = showLockScreen();
    await hideBootScreen();
    await lockReady;
    session.set('logged', true);
    return { firstLogin: true };
}

/* ------------------------------------------------------------------ */
/* Alimentation                                                         */
/* ------------------------------------------------------------------ */
function overlay(className, content = '') {
    const node = document.createElement('div');
    node.className = `power-overlay ${className}`;
    node.innerHTML = content;
    document.body.append(node);
    requestAnimationFrame(() => node.classList.add('is-visible'));
    return node;
}

const spinner = '<div class="boot-spinner"><i></i><i></i><i></i><i></i><i></i></div>';

export const power = {
    async lock() {
        closeFlyouts();
        await showLockScreen();
        bus.emit('session:unlock');
    },
    async sleep() {
        closeFlyouts();
        const node = overlay('is-sleep');
        await wait(600);
        node.addEventListener('pointerdown', async () => {
            const lockReady = showLockScreen();
            node.remove();
            await lockReady;
        }, { once: true });
    },
    async restart() {
        overlay('is-shutdown', `${spinner}<span>Redémarrage en cours...</span>`);
        session.set('logged', false);
        await wait(2200);
        location.reload();
    },
    async shutdown() {
        const node = overlay('is-shutdown', `${spinner}<span>Arrêt en cours...</span>`);
        session.set('logged', false);
        await wait(2200);
        node.innerHTML = '<button class="power-on" type="button" aria-label="Allumer">⏻</button>';
        node.classList.add('is-off');
        node.querySelector('.power-on').addEventListener('click', () => location.reload());
    },
};
