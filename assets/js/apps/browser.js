/**
 * Microsoft Edge : onglets, barre d'adresse, nouvel onglet avec liens rapides,
 * iframe pour les sites intégrables et page d'erreur fidèle sinon.
 */
import { el, html, raw } from '../core/dom.js';
import { appIconUrl, ui } from '../core/icons.js';
import { wm } from '../os/window-manager.js';
import { games, projects } from '../data/projects.js';
import { profile } from '../data/profile.js';

const NEW_TAB = 'edge://newtab';

const QUICK_LINKS = [
    { label: 'GitHub', url: profile.links.github, icon: appIconUrl('github') },
    { label: 'LinkedIn', url: profile.links.linkedin, icon: appIconUrl('linkedin') },
    ...games.map((game) => ({ label: game.name, url: game.url, icon: game.icon })),
];

/** Un site est-il affichable dans une iframe ici ? */
function canEmbed(url) {
    try {
        const target = new URL(url);
        if (location.protocol === 'https:' && target.protocol === 'http:') return { ok: false, reason: 'mixed' };
        if (target.origin === location.origin || target.hostname.endsWith('github.io')) return { ok: true };
        return { ok: false, reason: 'refused' };
    } catch {
        return { ok: false, reason: 'invalid' };
    }
}

function normalize(input) {
    const value = input.trim();
    if (!value) return NEW_TAB;
    if (/^edge:\/\//.test(value)) return value;
    if (/^https?:\/\//i.test(value)) return value;
    if (/^[\w-]+(\.[\w-]+)+(:\d+)?(\/.*)?$/.test(value)) return `https://${value}`;
    return `https://www.bing.com/search?q=${encodeURIComponent(value)}`;
}

export function open({ url = NEW_TAB } = {}) {
    const root = el(html`
        <div class="edge">
            <header class="edge-titlebar" data-drag>
                <button class="edge-profile" type="button" aria-label="Profil"><img src="${appIconUrl('user')}" alt=""></button>
                <div class="edge-tabs" role="tablist"></div>
                <button class="edge-new-tab" type="button" aria-label="Nouvel onglet" title="Nouvel onglet (Ctrl+T)">${raw(ui.plus)}</button>
                <div class="edge-drag-space"></div>
            </header>
            <div class="edge-toolbar">
                <button class="edge-btn" type="button" data-nav="back" aria-label="Précédent">${raw(ui.arrowLeft)}</button>
                <button class="edge-btn" type="button" data-nav="forward" aria-label="Suivant">${raw(ui.arrowRight)}</button>
                <button class="edge-btn" type="button" data-nav="refresh" aria-label="Actualiser">${raw(ui.refresh)}</button>
                <button class="edge-btn" type="button" data-nav="home" aria-label="Accueil">${raw(ui.home)}</button>
                <form class="edge-address">
                    <span class="edge-lock">${raw(ui.lock)}</span>
                    <input type="text" aria-label="Barre d'adresse" spellcheck="false" autocomplete="off">
                    <button class="edge-btn edge-star" type="button" aria-label="Ajouter aux favoris">${raw(ui.star)}</button>
                </form>
                <button class="edge-btn" type="button" data-nav="external" aria-label="Ouvrir dans un nouvel onglet du navigateur" title="Ouvrir dans un vrai onglet">${raw(ui.external)}</button>
                <button class="edge-btn" type="button" aria-label="Paramètres et plus" disabled>${raw(ui.more)}</button>
            </div>
            <div class="edge-favorites">
                ${QUICK_LINKS.slice(0, 6).map((link) => raw(html`<button type="button" data-url="${link.url}"><img src="${link.icon}" alt="">${link.label}</button>`))}
            </div>
            <div class="edge-viewport"></div>
        </div>`);

    const win = wm.open({
        appId: 'edge',
        title: 'Nouvel onglet - Microsoft Edge',
        icon: appIconUrl('edge'),
        frame: 'custom',
        width: 1080,
        height: 700,
        className: 'window--edge',
        content: root,
    });
    root.querySelector('.edge-titlebar').append(win.controls);

    const tabsEl = root.querySelector('.edge-tabs');
    const viewport = root.querySelector('.edge-viewport');
    const address = root.querySelector('.edge-address input');
    const tabs = [];
    let active = null;

    const titleOf = (tab) => {
        if (tab.url === NEW_TAB) return 'Nouvel onglet';
        const game = games.find((g) => tab.url.startsWith(g.url));
        if (game) return game.name;
        try { return new URL(tab.url).hostname; } catch { return tab.url; }
    };

    function renderTabs() {
        tabsEl.innerHTML = tabs.map((tab, i) => html`
            <div class="edge-tab ${tab === active ? 'is-active' : ''}" role="tab" data-tab="${i}" title="${titleOf(tab)}">
                ${tab.loading ? raw('<span class="edge-spinner"></span>') : raw(html`<img src="${tab.url === NEW_TAB ? appIconUrl('edge') : (games.find((g) => tab.url.startsWith(g.url))?.icon ?? appIconUrl('web'))}" alt="">`)}
                <span>${titleOf(tab)}</span>
                <button class="edge-tab-close" type="button" aria-label="Fermer l'onglet">${raw(ui.close)}</button>
            </div>`.value).join('');
    }

    function renderPage(tab) {
        tab.page?.remove();
        let page;
        if (tab.url === NEW_TAB) {
            page = el(html`
                <div class="edge-newtab" style="background-image:var(--wallpaper)">
                    <div class="edge-newtab-inner">
                        <form class="edge-search">
                            <input type="search" placeholder="Rechercher sur le web" aria-label="Rechercher sur le web">
                            <button type="submit" aria-label="Rechercher">${raw(ui.search)}</button>
                        </form>
                        <div class="edge-quicklinks">
                            ${QUICK_LINKS.map((link) => raw(html`
                                <button class="edge-quicklink" type="button" data-url="${link.url}">
                                    <span><img src="${link.icon}" alt=""></span>${link.label}
                                </button>`))}
                        </div>
                        <section class="edge-feed">
                            <h2>Projets de ${profile.firstName}</h2>
                            <div class="edge-feed-grid">
                                ${projects.map((project) => raw(html`
                                    <article class="edge-card" data-url="${project.url ?? ''}">
                                        <img src="${project.image}" alt="" loading="lazy">
                                        <div><h3>${project.name}</h3><p>${project.title}</p></div>
                                    </article>`))}
                            </div>
                        </section>
                    </div>
                </div>`);
            page.querySelector('.edge-search').addEventListener('submit', (event) => {
                event.preventDefault();
                const query = page.querySelector('input').value.trim();
                if (query) window.open(`https://www.bing.com/search?q=${encodeURIComponent(query)}`, '_blank', 'noopener');
            });
        } else {
            const check = canEmbed(tab.url);
            if (check.ok) {
                page = el(html`<iframe class="edge-frame" src="${tab.url}" title="${titleOf(tab)}" loading="lazy" allow="fullscreen" referrerpolicy="no-referrer"></iframe>`);
                tab.loading = true;
                page.addEventListener('load', () => { tab.loading = false; renderTabs(); });
            } else {
                const host = titleOf(tab);
                page = el(html`
                    <div class="edge-error">
                        <div class="edge-error-inner">
                            <div class="edge-error-icon">🙁</div>
                            <h1>${check.reason === 'mixed' ? 'Cette page a été bloquée' : `${host} n'autorise pas la connexion.`}</h1>
                            <p>${check.reason === 'mixed'
                                ? 'Ce site utilise une connexion non sécurisée (HTTP) et ne peut pas être affiché dans ce navigateur intégré.'
                                : 'Ce site refuse d\'être affiché dans un cadre intégré (X-Frame-Options).'}</p>
                            <p class="edge-error-url">${tab.url}</p>
                            <button class="btn btn-accent" type="button" data-real="${tab.url}">${raw(ui.external)} Ouvrir dans un nouvel onglet</button>
                            <p class="edge-error-code">${check.reason === 'mixed' ? 'ERR_BLOCKED_BY_CLIENT' : 'ERR_BLOCKED_BY_RESPONSE'}</p>
                        </div>
                    </div>`);
            }
        }
        tab.page = page;
        viewport.append(page);
    }

    function activate(tab) {
        active = tab;
        tabs.forEach((t) => { if (t.page) t.page.hidden = t !== tab; });
        if (!tab.page) renderPage(tab);
        address.value = tab.url === NEW_TAB ? '' : tab.url;
        address.placeholder = 'Rechercher ou entrer une adresse web';
        root.querySelector('.edge-lock').innerHTML = tab.url.startsWith('http:') ? '⚠️' : ui.lock;
        root.querySelector('[data-nav="back"]').disabled = tab.index <= 0;
        root.querySelector('[data-nav="forward"]').disabled = tab.index >= tab.history.length - 1;
        win.setTitle(`${titleOf(tab)} - Microsoft Edge`);
        renderTabs();
    }

    function go(tab, url, push = true) {
        tab.url = url;
        if (push) {
            tab.history.splice(tab.index + 1);
            tab.history.push(url);
            tab.index = tab.history.length - 1;
        }
        tab.page?.remove();
        tab.page = null;
        activate(tab);
    }

    function addTab(url = NEW_TAB) {
        const tab = { url, history: [url], index: 0 };
        tabs.push(tab);
        activate(tab);
        return tab;
    }

    function closeTab(tab) {
        const index = tabs.indexOf(tab);
        tabs.splice(index, 1);
        tab.page?.remove();
        if (!tabs.length) win.close();
        else if (tab === active) activate(tabs[Math.max(0, index - 1)]);
        else renderTabs();
    }

    tabsEl.addEventListener('click', (event) => {
        const tabEl = event.target.closest('[data-tab]');
        if (!tabEl) return;
        const tab = tabs[Number(tabEl.dataset.tab)];
        if (event.target.closest('.edge-tab-close')) closeTab(tab);
        else activate(tab);
    });
    root.querySelector('.edge-new-tab').addEventListener('click', () => addTab());
    root.querySelector('.edge-address').addEventListener('submit', (event) => {
        event.preventDefault();
        const url = normalize(address.value);
        if (url.startsWith('https://www.bing.com/')) window.open(url, '_blank', 'noopener');
        else go(active, url);
        address.blur();
    });
    address.addEventListener('focus', () => address.select());
    root.querySelector('.edge-toolbar').addEventListener('click', (event) => {
        const nav = event.target.closest('[data-nav]')?.dataset.nav;
        if (nav === 'back' && active.index > 0) { active.index--; go(active, active.history[active.index], false); }
        if (nav === 'forward' && active.index < active.history.length - 1) { active.index++; go(active, active.history[active.index], false); }
        if (nav === 'refresh') go(active, active.url, false);
        if (nav === 'home') go(active, NEW_TAB);
        if (nav === 'external' && active.url !== NEW_TAB) window.open(active.url, '_blank', 'noopener');
    });
    root.addEventListener('click', (event) => {
        const link = event.target.closest('[data-url]');
        if (link?.dataset.url) go(active, link.dataset.url);
        const real = event.target.closest('[data-real]');
        if (real) window.open(real.dataset.real, '_blank', 'noopener');
    });

    addTab(url);
    win.handleArgs = (args) => args.url && addTab(args.url);
    return win;
}

