/**
 * Paramètres Windows 11 : Système (infos « matérielles » = profil), Personnalisation
 * (fond d'écran, mode, couleur d'accentuation), Comptes, Windows Update.
 */
import { el, html, raw } from '../core/dom.js';
import { appIconUrl, ui } from '../core/icons.js';
import { bus } from '../core/bus.js';
import { wm } from '../os/window-manager.js';
import { system } from '../os/system.js';
import { launch } from '../os/apps.js';
import { wallpapers, accentColors } from '../data/wallpapers.js';
import { profile } from '../data/profile.js';
import { projects } from '../data/projects.js';
import { skillGroups, technologies } from '../data/skills.js';

const PAGES = [
    { id: 'system', label: 'Système', icon: ui.desktop, color: '#0078d4' },
    { id: 'personalization', label: 'Personnalisation', icon: ui.palette, color: '#e3008c' },
    { id: 'apps', label: 'Applications', icon: ui.apps, color: '#6264a7' },
    { id: 'accounts', label: 'Comptes', icon: ui.person, color: '#10893e' },
    { id: 'time', label: 'Heure et langue', icon: ui.globe, color: '#00b7c3' },
    { id: 'about', label: 'À propos', icon: ui.info, color: '#767676' },
    { id: 'update', label: 'Windows Update', icon: ui.update, color: '#0063b1' },
];

export function open({ page = 'system' } = {}) {
    const root = el(html`
        <div class="st">
            <header class="st-titlebar" data-drag>
                <button class="st-back" type="button" aria-label="Retour">${raw(ui.arrowLeft)}</button>
                <span class="st-title">Paramètres</span>
            </header>
            <div class="st-main">
                <nav class="st-nav os-scroll">
                    <button class="st-user" type="button" data-page="accounts">
                        <img src="${appIconUrl('user')}" alt="">
                        <span><strong>${profile.fullName}</strong><small>Compte local · ${profile.title}</small></span>
                    </button>
                    <label class="st-search">
                        <input class="os-input" type="search" placeholder="Rechercher un paramètre" aria-label="Rechercher un paramètre">
                        ${raw(ui.search)}
                    </label>
                    ${PAGES.map((item) => raw(html`
                        <button class="st-nav-item" type="button" data-page="${item.id}">
                            <span class="st-nav-icon" style="color:${item.color}">${raw(item.icon)}</span>${item.label}
                        </button>`))}
                </nav>
                <main class="st-content os-scroll"></main>
            </div>
        </div>`);

    const win = wm.open({
        appId: 'settings',
        title: 'Paramètres',
        icon: appIconUrl('settings'),
        frame: 'custom',
        width: 1000,
        height: 680,
        className: 'window--settings',
        mica: true,
        content: root,
    });
    root.querySelector('.st-titlebar').append(win.controls);

    const content = root.querySelector('.st-content');
    const history = [];
    let current = null;

    const renderers = {
        system: () => html`
            <h1>Système</h1>
            <section class="st-hero">
                <div class="st-hero-device"><img src="${wallpapers[system.wallpaper].thumb}" alt=""></div>
                <div>
                    <strong>PORTFOLIO-THOMAS</strong>
                    <span>${profile.title}</span>
                    <button class="st-link" type="button" data-page="about">Renommer</button>
                </div>
                <div class="st-hero-tile">${raw(ui.update)}<span><strong>Windows Update</strong><small>Vous êtes à jour</small></span></div>
            </section>
            ${card(ui.sun, 'Affichage', 'Luminosité, éclairage nocturne, fond d\'écran', 'personalization')}
            ${card(ui.volume, 'Son', `Volume : ${system.volume} %`, null)}
            ${card(ui.bell, 'Notifications', 'Alertes des applications et du système', null)}
            ${card(ui.info, 'Informations système', 'Spécifications de l\'appareil (et de son propriétaire)', 'about')}`,

        personalization: () => html`
            <h1>Personnalisation</h1>
            <section class="st-preview">
                <div class="st-preview-screen" style="background-image:url('${wallpapers[system.wallpaper].src}')">
                    <div class="st-preview-window"><span></span></div>
                    <div class="st-preview-taskbar"></div>
                </div>
                <div class="st-wallpapers">
                    <h2>Sélectionnez un fond d'écran</h2>
                    <div class="st-wallpaper-grid">
                        ${wallpapers.map((wallpaper, i) => raw(html`
                            <button class="st-wallpaper ${i === system.wallpaper ? 'is-selected' : ''}" type="button" data-wallpaper="${i}" aria-label="${wallpaper.name}">
                                <img src="${wallpaper.thumb}" alt="" loading="lazy">
                            </button>`))}
                    </div>
                </div>
            </section>
            <div class="st-card">
                <span class="st-card-icon">${raw(ui.palette)}</span>
                <span class="st-card-text"><strong>Choisir votre mode</strong><small>Change les couleurs de Windows et des applications</small></span>
                <select class="st-select" data-setting="mode">
                    <option value="dark" ${system.mode === 'dark' ? 'selected' : ''}>Sombre</option>
                    <option value="light" ${system.mode === 'light' ? 'selected' : ''}>Clair</option>
                </select>
            </div>
            <div class="st-card is-column">
                <div class="st-card-row">
                    <span class="st-card-icon">${raw(ui.palette)}</span>
                    <span class="st-card-text"><strong>Couleur d'accentuation</strong><small>Utilisée par le menu Démarrer, les boutons, les sélections…</small></span>
                </div>
                <div class="st-accents">
                    ${accentColors.map((color) => raw(html`
                        <button class="st-accent ${color === system.accent ? 'is-selected' : ''}" type="button" data-accent="${color}" style="--swatch:${color}" aria-label="Couleur ${color}"></button>`))}
                </div>
            </div>
            <div class="st-card">
                <span class="st-card-icon">${raw(ui.nightLight)}</span>
                <span class="st-card-text"><strong>Éclairage nocturne</strong><small>Utiliser des couleurs plus chaudes pour aider à dormir</small></span>
                <input type="checkbox" class="toggle" data-setting="night" ${system.nightLight ? 'checked' : ''} aria-label="Éclairage nocturne">
            </div>
            <div class="st-card">
                <span class="st-card-icon">${raw(ui.cursor)}</span>
                <span class="st-card-text"><strong>Pointeur de la souris</strong><small>Utiliser les pointeurs Windows (flèche, main, occupé en arrière-plan)</small></span>
                <input type="checkbox" class="toggle" data-setting="cursors" ${system.winCursors ? 'checked' : ''} aria-label="Pointeurs Windows">
            </div>`,

        apps: () => html`
            <h1>Applications installées</h1>
            <p class="st-intro">Les « applications » installées sur ce profil sont mes compétences 😉</p>
            ${skillGroups.map((group) => raw(html`
                <h2 class="st-subtitle">${group.label}</h2>
                ${group.items.map((id) => raw(html`
                    <div class="st-card">
                        ${technologies[id].icon ? raw(html`<img class="st-card-img ${technologies[id].invert ? 'is-invert' : ''}" src="${technologies[id].icon}" alt="">`) : raw(`<span class="st-card-icon st-tech-dot" style="--tech:${technologies[id].color}"></span>`)}
                        <span class="st-card-text"><strong>${technologies[id].name}</strong><small>${technologies[id].publisher} · ${technologies[id].description}</small></span>
                    </div>`))}`))}`,

        accounts: () => html`
            <h1>Comptes</h1>
            <section class="st-account">
                <img src="${appIconUrl('user')}" alt="">
                <div>
                    <strong>${profile.fullName}</strong>
                    <span>${profile.title}</span>
                    <span>${profile.location}</span>
                </div>
            </section>
            ${card(appIconUrl('github'), 'GitHub', `@${profile.handle}`, null, profile.links.github)}
            ${card(appIconUrl('linkedin'), 'LinkedIn', 'thomas-sebasti', null, profile.links.linkedin)}
            ${card(ui.mail, 'Me contacter', 'Formulaire de contact dans VS Code', 'contact')}`,

        time: () => html`
            <h1>Heure et langue</h1>
            <div class="st-clock">${new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}<small>${new Date().toLocaleDateString('fr-FR', { dateStyle: 'full' })}</small></div>
            ${card(ui.clock, 'Fuseau horaire', Intl.DateTimeFormat().resolvedOptions().timeZone, null)}
            ${card(ui.globe, 'Langue d\'affichage', 'Français (France)', null)}`,

        about: () => html`
            <h1>Informations système</h1>
            <section class="st-hero">
                <div class="st-hero-device"><img src="${wallpapers[system.wallpaper].thumb}" alt=""></div>
                <div><strong>PORTFOLIO-THOMAS</strong><span>${profile.fullName}</span></div>
            </section>
            <div class="st-specs">
                <h2>${raw(ui.info)} Spécifications de l'appareil</h2>
                <dl>
                    <dt>Nom de l'appareil</dt><dd>PORTFOLIO-THOMAS</dd>
                    <dt>Processeur</dt><dd>Cerveau de chimiste · ${profile.experience}</dd>
                    <dt>Mémoire installée</dt><dd>${profile.degree} + formation Ri7</dd>
                    <dt>Type du système</dt><dd>Développeur web, système d'exploitation curieux</dd>
                    <dt>Projets réalisés</dt><dd>${projects.length}</dd>
                    <dt>Stylet et fonction tactile</dt><dd>Compatible souris, clavier et écran tactile</dd>
                </dl>
                <h2>${raw(ui.desktop)} Spécifications de Windows</h2>
                <dl>
                    <dt>Édition</dt><dd>Windows 11 Portfolio</dd>
                    <dt>Version</dt><dd>24H2</dd>
                    <dt>Expérience</dt><dd>HTML, CSS & JavaScript vanilla — modules ES</dd>
                    <dt>Navigateur</dt><dd>${navigator.userAgent.match(/(Firefox|Edg|Chrome|Safari)\/[\d.]+/)?.[0]?.replace('Edg', 'Edge') ?? 'Inconnu'}</dd>
                </dl>
            </div>`,

        update: () => html`
            <h1>Windows Update</h1>
            <section class="st-update">
                <span class="st-update-icon">${raw(ui.update)}</span>
                <div>
                    <strong class="st-update-title">Vous êtes à jour</strong>
                    <small class="st-update-sub">Dernière vérification : aujourd'hui, ${new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</small>
                </div>
                <button class="btn btn-accent" type="button" data-action="check-updates">Rechercher des mises à jour</button>
            </section>
            ${card(ui.clock, 'Historique des mises à jour', 'v2.0 — Refonte complète : Windows 11 + VS Code plus vrais que nature', null)}`,
    };

    function card(icon, title, subtitle, target, href) {
        const iconHtml = icon.startsWith('data:') ? `<img class="st-card-img" src="${icon}" alt="">` : `<span class="st-card-icon">${icon}</span>`;
        return raw(html`
            <button class="st-card is-clickable" type="button" ${target ? raw(`data-page="${target}"`) : ''} ${href ? raw(`data-href="${href}"`) : ''}>
                ${raw(iconHtml)}
                <span class="st-card-text"><strong>${title}</strong><small>${subtitle}</small></span>
                <span class="st-card-chevron">${raw(ui.chevronRight)}</span>
            </button>`);
    }

    function show(id, push = true) {
        if (id === 'contact') {
            launch('vscode', { open: 'src/contact.html', preview: true });
            return;
        }
        if (!renderers[id]) return;
        if (push && current) history.push(current);
        current = id;
        content.innerHTML = renderers[id]().value;
        content.scrollTop = 0;
        root.querySelectorAll('.st-nav-item').forEach((item) => item.classList.toggle('is-active', item.dataset.page === id));
        root.querySelector('.st-back').disabled = !history.length;
    }

    root.addEventListener('click', (event) => {
        const pageBtn = event.target.closest('[data-page]');
        if (pageBtn) show(pageBtn.dataset.page);
        const href = event.target.closest('[data-href]');
        if (href) window.open(href.dataset.href, '_blank', 'noopener');
        const wallpaper = event.target.closest('[data-wallpaper]');
        if (wallpaper) system.setWallpaper(Number(wallpaper.dataset.wallpaper));
        const accent = event.target.closest('[data-accent]');
        if (accent) system.setAccent(accent.dataset.accent);
        if (event.target.closest('[data-action="check-updates"]')) checkUpdates();
    });
    root.querySelector('.st-back').addEventListener('click', () => history.length && show(history.pop(), false));
    root.addEventListener('change', (event) => {
        const setting = event.target.dataset.setting;
        if (setting === 'mode') system.setMode(event.target.value);
        if (setting === 'night') system.setNightLight(event.target.checked);
        if (setting === 'cursors') system.setWinCursors(event.target.checked);
    });
    root.querySelector('.st-search input').addEventListener('input', (event) => {
        const query = event.target.value.toLowerCase();
        root.querySelectorAll('.st-nav-item').forEach((item) => { item.hidden = query && !item.textContent.toLowerCase().includes(query); });
    });

    function checkUpdates() {
        const title = content.querySelector('.st-update-title');
        const sub = content.querySelector('.st-update-sub');
        const button = content.querySelector('[data-action="check-updates"]');
        const icon = content.querySelector('.st-update-icon');
        button.disabled = true;
        icon.classList.add('is-spinning');
        title.textContent = 'Recherche de mises à jour...';
        setTimeout(() => {
            icon.classList.remove('is-spinning');
            title.textContent = 'Vous êtes à jour';
            sub.textContent = `Dernière vérification : aujourd'hui, ${new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
            button.disabled = false;
        }, 2200);
    }

    const off = bus.on('system:change', () => {
        if (['personalization', 'system'].includes(current)) {
            const scroll = content.scrollTop;
            show(current, false);
            content.scrollTop = scroll;
        }
    });
    win.on('close', off);

    show(page, false);
    win.handleArgs = (args) => args.page && show(args.page);
    return win;
}
