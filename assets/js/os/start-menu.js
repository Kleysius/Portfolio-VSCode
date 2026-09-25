/**
 * Menu Démarrer de Windows 11 : applications épinglées, recommandations (projets),
 * liste de toutes les applications, recherche instantanée et menu d'alimentation.
 */
import { $, $$, el, html, raw, escapeHtml } from '../core/dom.js';
import { ui, appIconUrl, fileIcon } from '../core/icons.js';
import { fuzzyMatch, highlightMatches } from '../core/fuzzy.js';
import { apps, launch } from './apps.js';
import { registerFlyout, closeFlyouts } from './flyout.js';
import { showContextMenu } from './context-menu.js';
import { profile } from '../data/profile.js';
import { projects } from '../data/projects.js';
import { technologies } from '../data/skills.js';
import { files } from '../data/workspace.js';
import { filesystem } from '../data/filesystem.js';
import { power } from './boot.js';

const PINNED = ['vscode', 'explorer', 'terminal', 'edge', 'settings', 'notepad', 'photos', 'morpion', 'puissance4', 'calculatrice', 'snake', 'github', 'linkedin'];

const SETTINGS_PAGES = [
    { label: 'Changer le fond d\'écran', page: 'personalization', keywords: 'fond ecran wallpaper arriere plan' },
    { label: 'Choisir le mode clair ou sombre', page: 'personalization', keywords: 'theme mode sombre clair dark light' },
    { label: 'Couleur d\'accentuation', page: 'personalization', keywords: 'couleur accent' },
    { label: 'Informations système', page: 'about', keywords: 'a propos systeme pc specifications' },
    { label: 'Windows Update', page: 'update', keywords: 'mise a jour update' },
];

let root;
let searchInput;

export function initStartMenu() {
    root = $('#start-menu');
    root.innerHTML = html`
        <div class="start-search">
            ${raw(ui.search)}
            <input type="search" placeholder="Rechercher des applications, des paramètres et des documents" aria-label="Rechercher" autocomplete="off" spellcheck="false">
        </div>

        <div class="start-views">
            <section class="start-view start-home">
                <div class="start-section-header">
                    <h2>Épinglé</h2>
                    <button class="btn btn-small" type="button" data-view="all">Toutes les applications ${raw(ui.chevronRight)}</button>
                </div>
                <div class="start-pinned" role="list">
                    ${PINNED.map((id) => raw(html`
                        <button class="start-app" type="button" role="listitem" data-app="${id}">
                            <img src="${apps[id].icon}" alt="" draggable="false">
                            <span>${apps[id].name.replace('Explorateur de fichiers', 'Explorateur').replace('Microsoft ', '')}</span>
                        </button>`))}
                </div>

                <div class="start-section-header">
                    <h2>Nos recommandations</h2>
                    <button class="btn btn-small" type="button" data-open="projects">Plus ${raw(ui.chevronRight)}</button>
                </div>
                <div class="start-recommended">
                    ${projects.slice(0, 6).map((project) => raw(html`
                        <button class="start-reco" type="button" data-project="${project.id}">
                            <img src="${project.image}" alt="" loading="lazy">
                            <span class="start-reco-text">
                                <span class="start-reco-title">${project.name}</span>
                                <span class="start-reco-sub">${project.stack.slice(0, 3).map((id) => technologies[id].name).join(' · ')}</span>
                            </span>
                        </button>`))}
                </div>
            </section>

            <section class="start-view start-all" hidden>
                <div class="start-section-header">
                    <h2>Toutes les applications</h2>
                    <button class="btn btn-small" type="button" data-view="home">${raw(ui.chevronLeft)} Précédent</button>
                </div>
                <div class="start-all-list"></div>
            </section>

            <section class="start-view start-results" hidden aria-live="polite"></section>
        </div>

        <footer class="start-footer">
            <button class="start-user" type="button" title="${profile.fullName}">
                <img src="${appIconUrl('user')}" alt="">
                <span>${profile.fullName}</span>
            </button>
            <button class="start-power" type="button" aria-label="Marche/Arrêt" title="Marche/Arrêt">${raw(ui.power)}</button>
        </footer>`;

    searchInput = $('.start-search input', root);
    renderAllApps();

    root.addEventListener('click', (event) => {
        const app = event.target.closest('[data-app]');
        if (app) { closeFlyouts(); launch(app.dataset.app); return; }

        const project = event.target.closest('[data-project]');
        if (project) { closeFlyouts(); launch('vscode', { project: project.dataset.project }); return; }

        const file = event.target.closest('[data-file]');
        if (file) { closeFlyouts(); launch('vscode', { open: file.dataset.file }); return; }

        const folder = event.target.closest('[data-folder]');
        if (folder) { closeFlyouts(); launch('explorer', { path: folder.dataset.folder }); return; }

        const settings = event.target.closest('[data-settings]');
        if (settings) { closeFlyouts(); launch('settings', { page: settings.dataset.settings }); return; }

        const view = event.target.closest('[data-view]');
        if (view) showView(view.dataset.view);

        if (event.target.closest('[data-open="projects"]')) { closeFlyouts(); launch('explorer', { path: 'Projets' }); }
        if (event.target.closest('.start-user')) { closeFlyouts(); launch('vscode', { open: 'src/about.md', preview: true }); }
    });

    root.addEventListener('contextmenu', (event) => {
        const app = event.target.closest('[data-app]');
        if (!app) return;
        event.preventDefault();
        showContextMenu({
            x: event.clientX,
            y: event.clientY,
            items: [
                { label: 'Ouvrir', icon: ui.open, action: () => { closeFlyouts(); launch(app.dataset.app); } },
                { label: 'Détacher du menu Démarrer', icon: ui.star, disabled: true },
            ],
        });
    });

    $('.start-power', root).addEventListener('click', (event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        showContextMenu({
            x: rect.left - 60,
            y: rect.top - 170,
            items: [
                { label: 'Verrouiller', icon: ui.lock, action: () => { closeFlyouts(); power.lock(); } },
                { label: 'Mettre en veille', icon: ui.sleep, action: () => { closeFlyouts(); power.sleep(); } },
                { label: 'Arrêter', icon: ui.power, action: () => { closeFlyouts(); power.shutdown(); } },
                { label: 'Redémarrer', icon: ui.restart, action: () => { closeFlyouts(); power.restart(); } },
            ],
        });
    });

    searchInput.addEventListener('input', () => search(searchInput.value));
    searchInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') $('.start-result.is-selected', root)?.click();
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault();
            const results = $$('.start-result', root);
            const index = results.findIndex((node) => node.classList.contains('is-selected'));
            const next = results[(index + (event.key === 'ArrowDown' ? 1 : -1) + results.length) % results.length];
            results.forEach((node) => node.classList.toggle('is-selected', node === next));
            next?.scrollIntoView({ block: 'nearest' });
        }
    });

    // Taper n'importe où pendant que le menu est ouvert lance la recherche
    root.addEventListener('keydown', (event) => {
        if (event.target === searchInput || event.key.length !== 1 || event.ctrlKey || event.metaKey || event.altKey) return;
        searchInput.focus();
    });

    registerFlyout('start', {
        element: root,
        buttons: [$('.tb-start'), $('.tb-search')],
        onOpen: (options = {}) => {
            searchInput.value = '';
            showView('home');
            if (options.search) root.classList.add('is-search-mode');
            setTimeout(() => searchInput.focus({ preventScroll: true }), 50);
        },
        onClose: () => root.classList.remove('is-search-mode'),
    });
}

function showView(name) {
    $$('.start-view', root).forEach((view) => { view.hidden = true; });
    $(`.start-${name}`, root).hidden = false;
    $('.start-views', root).dataset.view = name;
}

function renderAllApps() {
    const list = Object.entries(apps).sort(([, a], [, b]) => a.name.localeCompare(b.name, 'fr'));
    let letter = '';
    const container = $('.start-all-list', root);
    list.forEach(([id, app]) => {
        const first = app.name[0].toUpperCase();
        if (first !== letter) {
            letter = first;
            container.append(el(`<div class="start-letter">${escapeHtml(letter)}</div>`));
        }
        container.append(el(html`
            <button class="start-all-item" type="button" data-app="${id}">
                <img src="${app.icon}" alt="" draggable="false"><span>${app.name}</span>
            </button>`));
    });
}

function search(query) {
    const results = $('.start-results', root);
    if (!query.trim()) {
        showView('home');
        return;
    }
    showView('results');

    const score = (text, keywords = '') => fuzzyMatch(query, text) ?? (keywords && fuzzyMatch(query, keywords) ? { score: 1, indices: [] } : null);
    const byScore = (a, b) => b.match.score - a.match.score;
    const iconImg = (src, className = '') => `<img src="${escapeHtml(src)}" alt="" class="${className}">`;

    // Chaque catégorie produit des entrées homogènes : { label, sub, icon, attr, match }
    const categories = [
        ['Applications', Object.entries(apps).map(([id, app]) => ({
            label: app.name, sub: 'Application', icon: iconImg(app.icon), attr: `data-app="${id}"`, match: score(app.name, app.keywords),
        }))],
        ['Dossiers', filesystem.children.filter((node) => node.type === 'folder').map((folder) => ({
            label: folder.name, sub: folder.path, icon: iconImg(appIconUrl('folder')), attr: `data-folder="${escapeHtml(folder.name)}"`, match: score(folder.name),
        }))],
        ['Projets', projects.map((project) => ({
            label: `${project.name} — ${project.title}`, sub: 'Projet', icon: iconImg(project.image, 'is-thumb'), attr: `data-project="${project.id}"`,
            match: score(`${project.name} — ${project.title}`, `projet ${project.stack.join(' ')}`),
        }))],
        ['Documents', [...files.values()].filter((file) => file.content).map((file) => ({
            label: file.name, sub: file.path, icon: `<span class="start-result-fileicon">${fileIcon(file.name)}</span>`, attr: `data-file="${file.path}"`, match: score(file.name),
        }))],
        ['Paramètres', SETTINGS_PAGES.map((page) => ({
            label: page.label, sub: 'Paramètres système', icon: iconImg(appIconUrl('settings')), attr: `data-settings="${page.page}"`, match: score(page.label, page.keywords),
        }))],
    ].map(([title, entries]) => [title, entries.filter((entry) => entry.match).sort(byScore)]).filter(([, entries]) => entries.length);

    const all = categories.flatMap(([, entries]) => entries);
    const best = [...all].sort(byScore)[0];
    const row = (entry) => `
        <button class="start-result" type="button" ${entry.attr}>
            ${entry.icon}
            <span><span class="start-result-label">${highlightMatches(entry.label, entry.match.indices, escapeHtml)}</span><small>${escapeHtml(entry.sub)}</small></span>
        </button>`;

    results.innerHTML = `
        <div class="start-results-grid">
            <div class="start-results-list">
                ${categories.map(([title, entries]) => `<h3>${title}</h3>${entries.map(row).join('')}`).join('')
                    || `<p class="start-no-result">Aucun résultat pour « ${escapeHtml(query)} »</p>`}
            </div>
            ${best ? `
                <aside class="start-best">
                    ${best.icon}
                    <strong>${escapeHtml(best.label)}</strong>
                    <small>${escapeHtml(best.sub)}</small>
                    <hr>
                    <button class="start-best-action" type="button" ${best.attr}>${ui.open} Ouvrir</button>
                </aside>` : ''}
        </div>`;
    $('.start-result', results)?.classList.add('is-selected');
}
