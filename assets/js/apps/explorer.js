/**
 * Explorateur de fichiers Windows 11 : navigation, historique, fil d'Ariane, recherche,
 * affichage grille/détails, volet de navigation et barre d'état.
 */
import { el, html, raw, escapeHtml } from '../core/dom.js';
import { appIconUrl, ui } from '../core/icons.js';
import { wm } from '../os/window-manager.js';
import { apps, launch, openFsItem } from '../os/apps.js';
import { showContextMenu } from '../os/context-menu.js';
import { filesystem, resolvePath } from '../data/filesystem.js';
import { store } from '../core/store.js';

const NAV = [
    { label: 'Accueil', path: '', icon: ui.home },
    { separator: true },
    { label: 'Bureau', path: 'Bureau', icon: ui.desktop, pinned: true },
    { label: 'Documents', path: 'Documents', icon: ui.documents, pinned: true },
    { label: 'Images', path: 'Images', icon: ui.pictures, pinned: true },
    { label: 'Projets', path: 'Projets', icon: null, pinned: true },
    { label: 'Téléchargements', path: 'Téléchargements', icon: ui.downloads, pinned: true },
    { label: 'Musique', path: 'Musique', icon: ui.music, pinned: true },
    { separator: true },
    { label: 'Ce PC', path: 'Ce PC', icon: null, pc: true },
];

const RECYCLE = { type: 'folder', name: 'Corbeille', path: 'Corbeille', children: [], special: 'recycle' };
const THIS_PC = { type: 'folder', name: 'Ce PC', path: 'Ce PC', children: [], special: 'pc' };

function iconFor(item, large = true) {
    if (item.type === 'folder') return `<img src="${appIconUrl('folder')}" alt="">`;
    if (item.type === 'image') return large
        ? `<img src="${escapeHtml(item.thumb ?? item.src)}" alt="" class="fe-thumb" loading="lazy">`
        : `<img src="${appIconUrl('photos')}" alt="">`;
    if (item.type === 'app') return `<img src="${escapeHtml(item.iconSrc ?? apps[item.app]?.icon)}" alt="">`;
    if (item.type === 'link') return `<img src="${appIconUrl('web')}" alt="">`;
    if (item.type === 'code') return `<img src="${appIconUrl('vscode')}" alt="">`;
    return `<img src="${appIconUrl('textfile')}" alt="">`;
}

const typeLabel = (item) => ({
    folder: 'Dossier de fichiers',
    image: 'Fichier WEBP',
    app: 'Raccourci',
    link: 'Raccourci Internet',
    code: `Fichier ${item.name.split('.').pop().toUpperCase()}`,
    text: 'Document texte',
}[item.type] ?? 'Fichier');

export function open({ path = '' } = {}) {
    const root = el(html`
        <div class="fe">
            <header class="fe-titlebar" data-drag>
                <div class="fe-tab is-active">
                    <img src="${appIconUrl('explorer')}" alt="">
                    <span class="fe-tab-title">Accueil</span>
                    <button class="fe-tab-close" type="button" aria-label="Fermer l'onglet">${raw(ui.close)}</button>
                </div>
                <button class="fe-new-tab" type="button" aria-label="Nouvel onglet" disabled>${raw(ui.plus)}</button>
                <div class="fe-drag-space"></div>
            </header>
            <div class="fe-addressbar">
                <button class="fe-nav" type="button" data-nav="back" aria-label="Précédent">${raw(ui.arrowLeft)}</button>
                <button class="fe-nav" type="button" data-nav="forward" aria-label="Suivant">${raw(ui.arrowRight)}</button>
                <button class="fe-nav" type="button" data-nav="up" aria-label="Dossier parent">${raw(ui.arrowUp)}</button>
                <button class="fe-nav" type="button" data-nav="refresh" aria-label="Actualiser">${raw(ui.refresh)}</button>
                <div class="fe-breadcrumb" role="navigation" aria-label="Chemin"></div>
                <label class="fe-search">
                    <input type="search" placeholder="Rechercher" aria-label="Rechercher dans le dossier">
                    ${raw(ui.search)}
                </label>
            </div>
            <div class="fe-toolbar">
                <button class="fe-tool fe-tool-new" type="button" disabled>${raw(ui.plus)} Nouveau ${raw(ui.chevronDown)}</button>
                <span class="fe-tool-sep"></span>
                <button class="fe-tool" type="button" disabled aria-label="Couper">${raw(ui.cut)}</button>
                <button class="fe-tool" type="button" disabled aria-label="Copier">${raw(ui.copy)}</button>
                <button class="fe-tool" type="button" disabled aria-label="Coller">${raw(ui.paste)}</button>
                <button class="fe-tool" type="button" disabled aria-label="Renommer">${raw(ui.rename)}</button>
                <button class="fe-tool" type="button" disabled aria-label="Partager">${raw(ui.share)}</button>
                <button class="fe-tool" type="button" disabled aria-label="Supprimer">${raw(ui.trash)}</button>
                <span class="fe-tool-sep"></span>
                <button class="fe-tool" type="button" data-tool="sort">${raw(ui.sort)} Trier ${raw(ui.chevronDown)}</button>
                <button class="fe-tool" type="button" data-tool="view">${raw(ui.view)} Afficher ${raw(ui.chevronDown)}</button>
                <button class="fe-tool" type="button" data-tool="more" aria-label="Voir plus">${raw(ui.more)}</button>
            </div>
            <div class="fe-main">
                <nav class="fe-sidebar os-scroll" aria-label="Volet de navigation">
                    ${NAV.map((item) => (item.separator ? raw('<hr>') : raw(html`
                        <button class="fe-side-item" type="button" data-path="${item.path}">
                            ${item.icon ? raw(`<span class="fe-side-icon">${item.icon}</span>`) : raw(`<img src="${appIconUrl(item.pc ? 'pc' : 'folder')}" alt="">`)}
                            <span>${item.label}</span>
                            ${item.pinned ? raw('<span class="fe-pin">📌</span>') : ''}
                        </button>`)))}
                </nav>
                <section class="fe-content os-scroll" tabindex="0" aria-label="Contenu du dossier"></section>
            </div>
            <footer class="fe-statusbar">
                <span class="fe-count"></span>
                <span class="fe-selected"></span>
                <span class="fe-view-switch">
                    <button type="button" data-view="details" aria-label="Détails">${raw(ui.list)}</button>
                    <button type="button" data-view="grid" aria-label="Grandes icônes">${raw(ui.grid)}</button>
                </span>
            </footer>
        </div>`);

    const win = wm.open({
        appId: 'explorer',
        title: 'Explorateur de fichiers',
        icon: appIconUrl('explorer'),
        frame: 'custom',
        width: 980,
        height: 620,
        className: 'window--explorer',
        content: root,
    });
    root.querySelector('.fe-titlebar').append(win.controls);
    root.querySelector('.fe-tab-close').addEventListener('click', () => win.close());

    const content = root.querySelector('.fe-content');
    const search = root.querySelector('.fe-search input');
    const history = [];
    let historyIndex = -1;
    let current = null;
    let view = store.get('fe-view', 'grid');
    let sort = 'name';

    const resolve = (target) => {
        if (target === '' || target == null) return 'home';
        if (target === 'Corbeille') return RECYCLE;
        if (target === 'Ce PC') return THIS_PC;
        return resolvePath(filesystem, target.replace(/^C:\\Users\\[^\\]+\\?/i, '')) ?? 'home';
    };

    function navigate(target, push = true) {
        current = resolve(target);
        if (push) {
            history.splice(historyIndex + 1);
            history.push(current);
            historyIndex = history.length - 1;
        }
        search.value = '';
        render();
    }

    function title() {
        if (current === 'home') return 'Accueil';
        return current.name;
    }

    function items() {
        if (current === 'home') return [];
        let list = [...current.children];
        const query = search.value.trim().toLowerCase();
        if (query) {
            const all = [];
            (function walk(node) {
                node.children?.forEach((child) => {
                    if (child.name.toLowerCase().includes(query)) all.push(child);
                    walk(child);
                });
            }(current));
            list = all;
        }
        list.sort((a, b) => (sort === 'type'
            ? typeLabel(a).localeCompare(typeLabel(b)) || a.name.localeCompare(b.name)
            : Number(b.type === 'folder') - Number(a.type === 'folder') || a.name.localeCompare(b.name, 'fr')));
        return list;
    }

    function render() {
        const name = title();
        root.querySelector('.fe-tab-title').textContent = name;
        win.setTitle(`${name} - Explorateur de fichiers`);
        root.querySelector('[data-nav="back"]').disabled = historyIndex <= 0;
        root.querySelector('[data-nav="forward"]').disabled = historyIndex >= history.length - 1;
        root.querySelector('[data-nav="up"]').disabled = current === 'home' || !current.parent;
        root.querySelectorAll('.fe-side-item').forEach((item) => {
            const path = item.dataset.path;
            const matches = current === 'home' ? path === '' : current.special === 'pc' ? path === 'Ce PC' : current.path?.endsWith(`\\${path}`) && path;
            item.classList.toggle('is-active', !!matches);
        });
        root.querySelectorAll('[data-view]').forEach((button) => button.classList.toggle('is-active', button.dataset.view === view));
        renderBreadcrumb();

        if (current === 'home') return renderHome();
        if (current.special === 'pc') return renderThisPc();

        const list = items();
        content.className = `fe-content os-scroll is-${view}`;
        if (!list.length) {
            content.innerHTML = html`<p class="fe-empty">${current.special === 'recycle' ? 'La Corbeille est vide. Tout comme ma liste de bugs 😉' : search.value ? 'Aucun élément ne correspond à votre recherche.' : 'Ce dossier est vide.'}</p>`;
        } else if (view === 'details') {
            content.innerHTML = html`
                <div class="fe-details-header"><span>Nom</span><span>Modifié le</span><span>Type</span><span>Taille</span></div>
                ${list.map((item, i) => raw(html`
                    <button class="fe-item fe-row" type="button" data-index="${i}">
                        <span class="fe-row-name">${raw(iconFor(item, false))}<span>${item.name}</span></span>
                        <span>${new Date(2024, 2, 17 - i).toLocaleDateString('fr-FR')} 12:20</span>
                        <span>${typeLabel(item)}</span>
                        <span>${item.type === 'folder' ? '' : `${Math.max(1, Math.round((item.content?.length ?? 48000 + i * 7919) / 1024))} Ko`}</span>
                    </button>`))}`;
        } else {
            content.innerHTML = list.map((item, i) => html`
                <button class="fe-item fe-tile" type="button" data-index="${i}" title="${item.name}">
                    <span class="fe-tile-icon">${raw(iconFor(item))}</span>
                    <span class="fe-tile-label">${item.name}</span>
                </button>`.value).join('');
        }
        content.list = list;
        root.querySelector('.fe-count').textContent = `${list.length} élément${list.length > 1 ? 's' : ''}`;
        root.querySelector('.fe-selected').textContent = '';
    }

    function renderHome() {
        const quick = filesystem.children.filter((child) => child.type === 'folder');
        const recent = [
            resolvePath(filesystem, 'Documents\\À propos de moi.txt'),
            ...resolvePath(filesystem, 'Images\\Captures d\'écran').children.slice(0, 4),
            resolvePath(filesystem, 'Documents\\Portfolio-VSCode\\README.md'),
        ].filter(Boolean);
        content.className = 'fe-content os-scroll is-home';
        content.innerHTML = html`
            <section class="fe-home-section">
                <h2>${raw(ui.chevronDown)} Accès rapide</h2>
                <div class="fe-quick">
                    ${quick.map((folder) => raw(html`
                        <button class="fe-item fe-quick-item" type="button" data-path="${folder.name}">
                            <img src="${appIconUrl('folder')}" alt="">
                            <span><strong>${folder.name}</strong><small>Stocké localement</small></span>
                        </button>`))}
                </div>
            </section>
            <section class="fe-home-section">
                <h2>${raw(ui.chevronDown)} Récent</h2>
                <div class="fe-recent">
                    ${recent.map((item, i) => raw(html`
                        <button class="fe-item fe-row" type="button" data-recent="${i}">
                            <span class="fe-row-name">${raw(iconFor(item, false))}<span>${item.name}</span></span>
                            <span>${new Date(2024, 2, 17 - i).toLocaleDateString('fr-FR')}</span>
                            <span>${item.parent?.path.replace(filesystem.path, '~') ?? ''}</span>
                        </button>`))}
                </div>
            </section>`;
        content.list = recent;
        root.querySelector('.fe-count').textContent = `${quick.length + recent.length} éléments`;
    }

    function renderThisPc() {
        content.className = 'fe-content os-scroll is-pc';
        content.innerHTML = html`
            <section class="fe-home-section">
                <h2>${raw(ui.chevronDown)} Périphériques et lecteurs</h2>
                <div class="fe-drives">
                    <button class="fe-item fe-drive" type="button" data-path="">
                        <img src="${appIconUrl('pc')}" alt="">
                        <span><strong>Windows (C:)</strong><span class="fe-drive-bar"><i style="width:62%"></i></span><small>189 Go libres sur 476 Go</small></span>
                    </button>
                    <button class="fe-item fe-drive" type="button" data-path="Projets">
                        <img src="${appIconUrl('folder')}" alt="">
                        <span><strong>Projets (D:)</strong><span class="fe-drive-bar"><i style="width:28%"></i></span><small>Des idées à l'infini</small></span>
                    </button>
                </div>
            </section>`;
        root.querySelector('.fe-count').textContent = '2 éléments';
    }

    function renderBreadcrumb() {
        const crumbs = [];
        if (current === 'home') crumbs.push({ label: 'Accueil', path: '' });
        else if (current.special) crumbs.push({ label: current.name, path: current.path });
        else {
            let node = current;
            while (node && node !== filesystem) {
                crumbs.unshift({ label: node.name, path: node.path });
                node = node.parent;
            }
            crumbs.unshift({ label: filesystem.name, path: filesystem.path });
        }
        root.querySelector('.fe-breadcrumb').innerHTML = html`
            <img src="${appIconUrl(current === 'home' ? 'explorer' : 'folder')}" alt="">
            ${raw(ui.chevronRight)}
            ${crumbs.map((crumb, i) => raw(html`<button type="button" data-crumb="${crumb.path}">${crumb.label}</button>${i < crumbs.length - 1 ? raw(ui.chevronRight) : ''}`))}`.value;
        root.querySelector('.fe-search input').placeholder = `Rechercher dans : ${title()}`;
    }

    function openItem(item) {
        if (item.type === 'folder') navigate(item.path);
        else openFsItem(item);
    }

    /* ---------------- Évènements ---------------- */
    root.querySelector('.fe-addressbar').addEventListener('click', (event) => {
        const nav = event.target.closest('[data-nav]')?.dataset.nav;
        if (nav === 'back' && historyIndex > 0) { historyIndex--; current = history[historyIndex]; render(); }
        if (nav === 'forward' && historyIndex < history.length - 1) { historyIndex++; current = history[historyIndex]; render(); }
        if (nav === 'up' && current !== 'home' && current.parent) navigate(current.parent === filesystem ? filesystem.path : current.parent.path);
        if (nav === 'refresh') { content.style.opacity = '0'; setTimeout(() => { content.style.opacity = ''; render(); }, 120); }
        const crumb = event.target.closest('[data-crumb]');
        if (crumb) navigate(crumb.dataset.crumb);
    });

    root.querySelector('.fe-sidebar').addEventListener('click', (event) => {
        const item = event.target.closest('[data-path]');
        if (item) navigate(item.dataset.path);
    });

    search.addEventListener('input', render);

    content.addEventListener('click', (event) => {
        const item = event.target.closest('.fe-item');
        content.querySelectorAll('.fe-item').forEach((node) => node.classList.toggle('is-selected', node === item));
        if (item?.dataset.index) root.querySelector('.fe-selected').textContent = '1 élément sélectionné';
        if (item && matchMedia('(pointer: coarse)').matches) item.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    });
    content.addEventListener('dblclick', (event) => {
        const item = event.target.closest('.fe-item');
        if (!item) return;
        if (item.dataset.path !== undefined) navigate(item.dataset.path);
        else if (item.dataset.recent !== undefined) openItem(content.list[Number(item.dataset.recent)]);
        else openItem(content.list[Number(item.dataset.index)]);
    });
    content.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') event.target.closest('.fe-item')?.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
        if (event.key === 'Backspace') root.querySelector('[data-nav="back"]').click();
    });
    content.addEventListener('contextmenu', (event) => {
        event.preventDefault();
        const node = event.target.closest('.fe-item');
        const item = node?.dataset.index !== undefined ? content.list[Number(node.dataset.index)] : null;
        showContextMenu({
            x: event.clientX,
            y: event.clientY,
            items: item ? [
                { label: 'Ouvrir', icon: ui.open, action: () => openItem(item) },
                item.type === 'code' ? { label: 'Ouvrir avec Code', icon: `<img src="${appIconUrl('vscode')}" alt="">`, action: () => openItem(item) } : null,
                { separator: true },
                { label: 'Copier le chemin d\'accès', icon: ui.copy, action: () => navigator.clipboard?.writeText(item.path) },
                { label: 'Propriétés', icon: ui.info, disabled: true },
            ] : [
                { label: 'Affichage', icon: ui.view, submenu: [
                    { label: 'Grandes icônes', checked: view === 'grid', action: () => setView('grid') },
                    { label: 'Détails', checked: view === 'details', action: () => setView('details') },
                ] },
                { label: 'Trier par', icon: ui.sort, submenu: [
                    { label: 'Nom', checked: sort === 'name', action: () => { sort = 'name'; render(); } },
                    { label: 'Type', checked: sort === 'type', action: () => { sort = 'type'; render(); } },
                ] },
                { separator: true },
                { label: 'Ouvrir dans le Terminal', icon: ui.terminal, action: () => launch('terminal', { cwd: current?.path }) },
            ],
        });
    });

    const setView = (next) => {
        view = next;
        store.set('fe-view', view);
        render();
    };
    root.querySelector('.fe-view-switch').addEventListener('click', (event) => {
        const button = event.target.closest('[data-view]');
        if (button) setView(button.dataset.view);
    });
    root.querySelector('.fe-toolbar').addEventListener('click', (event) => {
        const tool = event.target.closest('[data-tool]')?.dataset.tool;
        if (!tool) return;
        const rect = event.target.closest('button').getBoundingClientRect();
        if (tool === 'view') showContextMenu({ x: rect.left, y: rect.bottom + 4, items: [
            { label: 'Grandes icônes', icon: ui.grid, checked: view === 'grid', action: () => setView('grid') },
            { label: 'Détails', icon: ui.list, checked: view === 'details', action: () => setView('details') },
        ] });
        if (tool === 'sort') showContextMenu({ x: rect.left, y: rect.bottom + 4, items: [
            { label: 'Nom', checked: sort === 'name', action: () => { sort = 'name'; render(); } },
            { label: 'Type', checked: sort === 'type', action: () => { sort = 'type'; render(); } },
        ] });
        if (tool === 'more') showContextMenu({ x: rect.left - 180, y: rect.bottom + 4, items: [
            { label: 'Ouvrir dans le Terminal', icon: ui.terminal, action: () => launch('terminal', { cwd: current?.path }) },
            { label: 'Ouvrir le portfolio dans VS Code', icon: `<img src="${appIconUrl('vscode')}" alt="">`, action: () => launch('vscode') },
        ] });
    });

    navigate(path);
    win.handleArgs = (args) => args.path !== undefined && navigate(args.path);
    return win;
}
