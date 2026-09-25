/**
 * Panneau Widgets : météo en direct, profil, statistiques GitHub, fil des projets, like.
 */
import { $, html, raw } from '../core/dom.js';
import { bus } from '../core/bus.js';
import { ui, appIconUrl } from '../core/icons.js';
import { registerFlyout, closeFlyouts } from './flyout.js';
import { launch } from './apps.js';
import { profile } from '../data/profile.js';
import { projects } from '../data/projects.js';
import { technologies } from '../data/skills.js';
import { getWeather } from '../services/weather.js';
import { getGithubProfile } from '../services/github.js';
import { likes } from '../services/likes.js';

let root;

export function initWidgets() {
    root = $('#widgets-panel');
    root.innerHTML = html`
        <header class="wg-header">
            <span class="wg-clock"></span>
            <div class="wg-header-actions">
                <button class="wg-icon-btn" type="button" aria-label="Ajouter des widgets" disabled>${raw(ui.plus)}</button>
                <span class="wg-avatar"><img src="${appIconUrl('user')}" alt=""></span>
            </div>
        </header>

        <div class="wg-grid">
            <article class="wg-card wg-weather">
                <header class="wg-card-title">${raw(ui.location)} <span>Marseille</span></header>
                <div class="wg-weather-now">
                    <span class="wg-weather-emoji">☀️</span>
                    <span class="wg-weather-temp">--<sup>°C</sup></span>
                    <span class="wg-weather-meta"></span>
                </div>
                <div class="wg-weather-days"></div>
            </article>

            <article class="wg-card wg-profile">
                <img class="wg-profile-avatar" src="${appIconUrl('user')}" alt="">
                <div>
                    <strong>${profile.fullName}</strong>
                    <span>${profile.title}</span>
                </div>
                <div class="wg-profile-actions">
                    <button class="btn btn-accent" type="button" data-launch="about">Qui suis-je ?</button>
                    <button class="btn" type="button" data-launch="contact">Contact</button>
                </div>
            </article>

            <article class="wg-card wg-github">
                <header class="wg-card-title"><img src="${appIconUrl('github')}" alt=""> <span>GitHub</span></header>
                <div class="wg-stats">
                    <div><strong data-stat="repos">–</strong><span>Dépôts</span></div>
                    <div><strong data-stat="followers">–</strong><span>Abonnés</span></div>
                    <div><strong data-stat="likes">–</strong><span>J'aime</span></div>
                </div>
                <button class="btn wg-like" type="button">${raw(ui.heart)} <span>J'aime ce portfolio</span></button>
            </article>

            <section class="wg-feed">
                <h2>Projets à la une</h2>
                ${projects.map((project) => raw(html`
                    <article class="wg-news" data-project="${project.id}" tabindex="0" role="button">
                        <img src="${project.image}" alt="" loading="lazy">
                        <div class="wg-news-body">
                            <span class="wg-news-source">${profile.fullName} · ${project.stack.map((id) => technologies[id].name).join(', ')}</span>
                            <h3>${project.name} — ${project.title}</h3>
                        </div>
                    </article>`))}
            </section>
        </div>`;

    root.addEventListener('click', (event) => {
        const target = event.target.closest('[data-launch]');
        if (target) {
            closeFlyouts();
            launch('vscode', { open: target.dataset.launch === 'about' ? 'src/about.md' : 'src/contact.html', preview: true });
        }
        const news = event.target.closest('[data-project]');
        if (news) {
            closeFlyouts();
            launch('vscode', { project: news.dataset.project });
        }
        if (event.target.closest('.wg-like')) likes.toggle();
    });

    registerFlyout('widgets', {
        element: root,
        buttons: [$('.tb-widgets')],
        onOpen: () => {
            updateClock();
            loadWeather();
            loadGithub();
            updateLikes();
        },
    });
    bus.on('likes:change', updateLikes);
}

function updateClock() {
    $('.wg-clock', root).textContent = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

async function loadWeather() {
    const weather = await getWeather();
    $('.wg-weather-emoji', root).textContent = weather.emoji;
    $('.wg-weather-temp', root).innerHTML = `${weather.temperature}<sup>°C</sup>`;
    $('.wg-weather-meta', root).innerHTML = html`<strong>${weather.label}</strong><span>Humidité ${weather.humidity} % · Vent ${weather.wind} km/h</span>`.value;
    $('.wg-weather-days', root).innerHTML = weather.daily.map((day) => html`
        <div class="wg-day"><span>${day.day}</span><span>${day.emoji}</span><strong>${day.max}°</strong><small>${day.min}°</small></div>`.value).join('');
}

async function loadGithub() {
    const data = await getGithubProfile();
    if (!data) return;
    $('[data-stat="repos"]', root).textContent = data.repos;
    $('[data-stat="followers"]', root).textContent = data.followers;
}

function updateLikes() {
    if (!root) return;
    $('[data-stat="likes"]', root).textContent = likes.count ?? '–';
    const button = $('.wg-like', root);
    button.classList.toggle('is-liked', likes.liked);
    $('span', button).textContent = likes.liked ? 'Merci !' : 'J\'aime ce portfolio';
}
