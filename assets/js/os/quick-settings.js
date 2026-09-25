/**
 * Paramètres rapides : les tuiles et curseurs ont un vrai effet (mode sombre, éclairage nocturne,
 * luminosité, volume, Ne pas déranger…).
 */
import { $, $$, html, raw } from '../core/dom.js';
import { bus } from '../core/bus.js';
import { ui } from '../core/icons.js';
import { store } from '../core/store.js';
import { registerFlyout, closeFlyouts } from './flyout.js';
import { system } from './system.js';
import { launch } from './apps.js';
import { notifications } from './notifications.js';

const tiles = [
    { id: 'wifi', label: 'Wi-Fi', sub: 'Portfolio-5G', icon: ui.wifi, chevron: true },
    { id: 'bluetooth', label: 'Bluetooth', sub: 'Non connecté', icon: ui.bluetooth, chevron: true },
    { id: 'airplane', label: 'Mode avion', icon: ui.airplane },
    { id: 'dark', label: 'Mode sombre', icon: ui.moon },
    { id: 'night', label: 'Éclairage nocturne', icon: ui.nightLight },
    { id: 'focus', label: 'Ne pas déranger', icon: ui.bellOff },
];

let root;

function isOn(id) {
    switch (id) {
        case 'dark': return system.mode === 'dark';
        case 'night': return system.nightLight;
        case 'focus': return notifications.doNotDisturb;
        default: return store.get(`qs-${id}`, id === 'wifi' || id === 'bluetooth');
    }
}

function toggle(id) {
    switch (id) {
        case 'dark': system.toggleMode(); break;
        case 'night': system.setNightLight(!system.nightLight); break;
        case 'focus': notifications.setDoNotDisturb(!notifications.doNotDisturb); break;
        case 'airplane': {
            const next = !isOn('airplane');
            store.set('qs-airplane', next);
            if (next) { store.set('qs-wifi', false); store.set('qs-bluetooth', false); }
            break;
        }
        default: store.set(`qs-${id}`, !isOn(id));
    }
    render();
}

export function initQuickSettings() {
    root = $('#quick-settings');
    root.innerHTML = html`
        <div class="qs-body">
            <div class="qs-tiles">
                ${tiles.map((tile) => raw(html`
                    <div class="qs-tile" data-tile="${tile.id}">
                        <button class="qs-tile-btn" type="button" aria-pressed="false" aria-label="${tile.label}">
                            ${raw(tile.icon)}
                            ${tile.chevron ? raw(`<span class="qs-tile-chevron">${ui.chevronRight}</span>`) : ''}
                        </button>
                        <span class="qs-tile-label">${tile.label}</span>
                    </div>`))}
            </div>

            <label class="qs-slider">
                <span class="qs-slider-icon">${raw(ui.sun)}</span>
                <input type="range" min="30" max="100" data-slider="brightness" aria-label="Luminosité">
            </label>
            <label class="qs-slider">
                <span class="qs-slider-icon qs-volume-icon">${raw(ui.volume)}</span>
                <input type="range" min="0" max="100" data-slider="volume" aria-label="Volume">
            </label>
        </div>
        <footer class="qs-footer">
            <span class="qs-battery">${raw(ui.batteryCharging)} <span>100 %</span></span>
            <span class="qs-footer-actions">
                <button class="qs-footer-btn" type="button" aria-label="Modifier les paramètres rapides" title="Modifier les paramètres rapides" disabled>${raw(ui.edit)}</button>
                <button class="qs-footer-btn" type="button" data-action="settings" aria-label="Tous les paramètres" title="Tous les paramètres">${raw(ui.settings)}</button>
            </span>
        </footer>`;

    root.addEventListener('click', (event) => {
        const tile = event.target.closest('.qs-tile-btn');
        if (tile) toggle(tile.parentElement.dataset.tile);
        if (event.target.closest('[data-action="settings"]')) {
            closeFlyouts();
            launch('settings');
        }
    });

    $$('[data-slider]', root).forEach((slider) => {
        slider.addEventListener('input', () => {
            const value = Number(slider.value);
            if (slider.dataset.slider === 'brightness') system.setBrightness(value);
            else system.setVolume(value);
            paintSlider(slider);
        });
    });

    registerFlyout('quick', { element: root, buttons: [$('.tb-quick')], onOpen: render });
    bus.on('system:change', () => root.classList.contains('is-open') && render());
    bus.on('notifications:change', () => root.classList.contains('is-open') && render());
}

function paintSlider(slider) {
    const min = Number(slider.min);
    const percent = ((Number(slider.value) - min) / (Number(slider.max) - min)) * 100;
    slider.style.setProperty('--fill', `${percent}%`);
}

function render() {
    $$('.qs-tile', root).forEach((tile) => {
        const on = isOn(tile.dataset.tile);
        tile.classList.toggle('is-on', on);
        $('.qs-tile-btn', tile).setAttribute('aria-pressed', String(on));
    });
    const brightness = $('[data-slider="brightness"]', root);
    const volume = $('[data-slider="volume"]', root);
    brightness.value = system.brightness;
    volume.value = system.volume;
    paintSlider(brightness);
    paintSlider(volume);
    $('.qs-volume-icon', root).innerHTML = system.volume === 0 ? ui.volumeMute : ui.volume;
}
