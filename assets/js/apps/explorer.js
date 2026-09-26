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
import { bus } from '../core/bus.js';
import { recycleBin, confirmEmptyBin } from '../os/desktop.js';
import { files as workspaceFiles } from '../data/workspace.js';

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
    if (item.type === 'recycled') return `<img src="${escapeHtml(item.iconSrc)}" alt="">`;
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
    recycled: 'Raccourci',
}[item.type] ?? 'Fichier');

/** Métadonnées stables (date, taille) dérivées du nom : le tri par colonne reste cohérent. */
function meta(item) {
    let hash = 0;
    for (const char of item.name) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
    const date = new Date(2026, 8, 25 - (hash % 60), 8 + (hash % 10), hash % 60);
    const size = item.type === 'folder' ? null : Math.max(1, Math.round((item.content?.length ?? 20000 + (hash % 900) * 97) / 1024));
    return { date, size };
}

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
                <span class="fe-recycle-actions" hidden>
                    <span class="fe-tool-sep"></span>
                    <button class="fe-tool" type="button" data-tool="empty-bin">${raw(ui.trash)} Vider la Corbeille</button>
                    <button class="fe-tool" type="button" data-tool="restore-all">${raw(ui.restart)} Restaurer tous les éléments</button>
                </span>
                <button class="fe-tool fe-tool-preview" type="button" data-tool="preview" data-tip="Volet de visualisation (Alt+P)">${raw(ui.view)} Aperçu</button>
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
                <aside class="fe-preview os-scroll" hidden aria-label="Volet de visualisation"></aside>
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
        mica: true,
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
    let sort = { key: 'name', dir: 1 };
    let previewOpen = store.get('fe-preview', false);

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
        if (current.special === 'recycle') {
            return recycleBin.items().map((item) => ({ type: 'recycled', name: item.name, id: item.id, iconSrc: item.icon }));
        }
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
        const byKey = {
            name: (a, b) => a.name.localeCompare(b.name, 'fr', { numeric: true }),
            type: (a, b) => typeLabel(a).localeCompare(typeLabel(b)) || a.name.localeCompare(b.name),
            date: (a, b) => meta(a).date - meta(b).date,
            size: (a, b) => (meta(a).size ?? -1) - (meta(b).size ?? -1),
        }[sort.key];
        // Les dossiers restent groupés en tête, comme dans Windows
        list.sort((a, b) => Number(b.type === 'folder') - Number(a.type === 'folder') || byKey(a, b) * sort.dir);
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
        root.querySelector('.fe-recycle-actions').hidden = current?.special !== 'recycle';
        root.querySelector('[data-tool="empty-bin"]').disabled = !recycleBin.items().length;
        root.querySelector('[data-tool="restore-all"]').disabled = !recycleBin.items().length;

        if (current === 'home') { renderPreview(null); return renderHome(); }
        if (current.special === 'pc') return renderThisPc();

        const list = items();
        content.className = `fe-content os-scroll is-${view}`;
        if (!list.length) {
            content.innerHTML = html`<p class="fe-empty">${current.special === 'recycle' ? 'La Corbeille est vide. Tout comme ma liste de bugs 😉' : search.value ? 'Aucun élément ne correspond à votre recherche.' : 'Ce dossier est vide.'}</p>`;
        } else if (view === 'details') {
            content.innerHTML = html`
                <div class="fe-details-header">
                    ${[['name', 'Nom'], ['date', current.special === 'recycle' ? 'Date de suppression' : 'Modifié le'], ['type', 'Type'], ['size', 'Taille']].map(([key, label]) => raw(html`
                        <button type="button" data-sort="${key}" class="${sort.key === key ? 'is-sorted' : ''}">${label}${sort.key === key ? raw(`<span class="fe-sort-arrow">${sort.dir === 1 ? ui.chevronUp : ui.chevronDown}</span>`) : ''}</button>`))}
                </div>
                ${list.map((item, i) => raw(html`
                    <button class="fe-item fe-row" type="button" data-index="${i}">
                        <span class="fe-row-name">${raw(iconFor(item, false))}<span>${item.name}</span></span>
                        <span>${meta(item).date.toLocaleDateString('fr-FR')} ${meta(item).date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
                        <span>${typeLabel(item)}</span>
                        <span class="fe-size">${meta(item).size ? `${meta(item).size.toLocaleString('fr-FR')} Ko` : ''}</span>
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
        renderPreview(null);
    }

    /* ---------------- Volet de visualisation ---------------- */
    function renderPreview(item) {
        const pane = root.querySelector('.fe-preview');
        pane.hidden = !previewOpen;
        root.querySelector('.fe-tool-preview').classList.toggle('is-pressed', previewOpen);
        if (!previewOpen) return;
        if (!item) {
            pane.innerHTML = '<p class="fe-preview-empty">Sélectionnez un fichier pour afficher un aperçu.</p>';
            return;
        }
        let body = '';
        if (item.type === 'image') body = html`<img class="fe-preview-image" src="${item.src}" alt="">`.value;
        else if (item.type === 'text') body = html`<pre class="fe-preview-text">${item.content}</pre>`.value;
        else if (item.type === 'code') body = html`<pre class="fe-preview-text">${workspaceFiles.get(item.path)?.content ?? ''}</pre>`.value;
        else body = `<div class="fe-preview-icon">${iconFor(item)}</div>`;
        pane.innerHTML = html`
            ${raw(body)}
            <div class="fe-preview-info">
                <strong>${item.title ?? item.name}</strong>
                <span>${typeLabel(item)}${item.type === 'folder' ? ` · ${item.children?.length ?? 0} élément(s)` : ''}</span>
                ${item.url ? raw(html`<span>${item.url}</span>`) : ''}
            </div>`.value;
    }

    function togglePreview() {
        previewOpen = !previewOpen;
        store.set('fe-preview', previewOpen);
        const selected = content.querySelector('.fe-item.is-selected');
        renderPreview(selected?.dataset.index !== undefined ? content.list[Number(selected.dataset.index)] : null);
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

    /** Barre d'adresse éditable : un clic affiche le chemin complet, Entrée y navigue. */
    function editAddress() {
        const bar = root.querySelector('.fe-breadcrumb');
        const value = current === 'home' ? 'Accueil' : current.special ? current.name : current.path;
        bar.innerHTML = '';
        const input = el('<input class="fe-address-input" type="text" spellcheck="false" aria-label="Adresse">');
        input.value = value;
        bar.append(input);
        bar.classList.add('is-editing');
        input.focus();
        input.select();
        const done = () => { bar.classList.remove('is-editing'); renderBreadcrumb(); };
        input.addEventListener('keydown', async (event) => {
            if (event.key === 'Escape') done();
            if (event.key !== 'Enter') return;
            const target = input.value.trim();
            if (/^accueil$/i.test(target)) { done(); navigate(''); return; }
            if (/^(corbeille|ce pc)$/i.test(target)) { done(); navigate(target.toLowerCase() === 'corbeille' ? 'Corbeille' : 'Ce PC'); return; }
            const node = resolvePath(filesystem, target.replace(/^C:\\Users\\[^\\]+\\?/i, ''));
            if (node?.type === 'folder') { done(); navigate(node.path); return; }
            if (node) { done(); openItem(node); return; }
            const { showDialog } = await import('../os/dialog.js');
            await showDialog({
                title: 'Explorateur de fichiers',
                message: `Windows ne trouve pas « ${target} ». Vérifiez l'orthographe et réessayez.`,
                icon: ui.info,
                buttons: [{ label: 'OK', value: true, primary: true }],
            });
            input.focus();
        });
        input.addEventListener('blur', () => setTimeout(() => { if (bar.classList.contains('is-editing') && document.activeElement !== input) done(); }, 100));
    }

    async function openItem(item) {
        if (item.type === 'recycled') {
            const { showDialog } = await import('../os/dialog.js');
            const answer = await showDialog({
                title: item.name,
                message: 'Cet élément se trouve dans la Corbeille. Pour l\'ouvrir, restaurez-le d\'abord.',
                icon: `<img src="${escapeHtml(item.iconSrc)}" alt="">`,
                buttons: [{ label: 'Restaurer', value: true, primary: true }, { label: 'Annuler', value: false }],
            });
            if (answer) recycleBin.restore([item.id]);
            return;
        }
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
        else if (event.target.closest('.fe-breadcrumb') && !event.target.closest('input')) editAddress();
    });

    root.querySelector('.fe-sidebar').addEventListener('click', (event) => {
        const item = event.target.closest('[data-path]');
        if (item) navigate(item.dataset.path);
    });

    search.addEventListener('input', render);

    content.addEventListener('click', (event) => {
        const item = event.target.closest('.fe-item');
        content.querySelectorAll('.fe-item').forEach((node) => node.classList.toggle('is-selected', node === item));
        const sortButton = event.target.closest('[data-sort]');
        if (sortButton) {
            sort = sort.key === sortButton.dataset.sort ? { key: sort.key, dir: -sort.dir } : { key: sortButton.dataset.sort, dir: 1 };
            render();
            return;
        }
        if (item?.dataset.index) {
            const entry = content.list[Number(item.dataset.index)];
            root.querySelector('.fe-selected').textContent = `1 élément sélectionné${meta(entry).size ? `  ${meta(entry).size.toLocaleString('fr-FR')} Ko` : ''}`;
            renderPreview(entry);
        }
        if (item && matchMedia('(pointer: coarse)').matches) item.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    });
    content.addEventListener('dblclick', (event) => {
        const item = event.target.closest('.fe-item');
        if (!item) return;
        if (item.dataset.path !== undefined) navigate(item.dataset.path);
        else if (item.dataset.recent !== undefined) openItem(content.list[Number(item.dataset.recent)]);
        else openItem(content.list[Number(item.dataset.index)]);
    });
    root.addEventListener('keydown', (event) => {
        if (event.altKey && event.key.toLowerCase() === 'p') { event.preventDefault(); togglePreview(); }
    });
    let typed = '';
    let typedTimer;
    content.addEventListener('keydown', (event) => {
        // Saisie au clavier : sélectionne le premier élément commençant par les lettres tapées
        if (event.key.length === 1 && !event.ctrlKey && !event.altKey && !event.metaKey && content.list) {
            typed += event.key.toLowerCase();
            clearTimeout(typedTimer);
            typedTimer = setTimeout(() => { typed = ''; }, 800);
            const index = content.list.findIndex((entry) => entry.name.toLowerCase().startsWith(typed));
            const node = content.querySelector(`[data-index="${index}"]`);
            if (node) { node.focus(); node.click(); }
        }
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
            items: item?.type === 'recycled' ? [
                { label: 'Restaurer', icon: ui.restart, action: () => recycleBin.restore([item.id]) },
                { label: 'Supprimer', icon: ui.trash, action: () => confirmEmptyBin() },
            ] : item ? [
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
                { label: 'Trier par', icon: ui.sort, submenu: [['name', 'Nom'], ['date', 'Modifié le'], ['type', 'Type'], ['size', 'Taille']].map(([key, label]) => ({ label, checked: sort.key === key, action: () => { sort = { key, dir: 1 }; render(); } })) },
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
        if (tool === 'empty-bin') { confirmEmptyBin(); return; }
        if (tool === 'restore-all') { recycleBin.restoreAll(); return; }
        if (tool === 'preview') { togglePreview(); return; }
        const rect = event.target.closest('button').getBoundingClientRect();
        if (tool === 'view') showContextMenu({ x: rect.left, y: rect.bottom + 4, items: [
            { label: 'Grandes icônes', icon: ui.grid, checked: view === 'grid', shortcut: 'Ctrl+Maj+2', action: () => setView('grid') },
            { label: 'Détails', icon: ui.list, checked: view === 'details', shortcut: 'Ctrl+Maj+6', action: () => setView('details') },
            { separator: true },
            { label: 'Volet de visualisation', icon: ui.view, checked: previewOpen, shortcut: 'Alt+P', action: togglePreview },
        ] });
        if (tool === 'sort') showContextMenu({ x: rect.left, y: rect.bottom + 4, items: [
            ...[['name', 'Nom'], ['date', 'Modifié le'], ['type', 'Type'], ['size', 'Taille']].map(([key, label]) => ({ label, checked: sort.key === key, action: () => { sort = { key, dir: 1 }; render(); } })),
            { separator: true },
            { label: 'Croissant', checked: sort.dir === 1, action: () => { sort = { ...sort, dir: 1 }; render(); } },
            { label: 'Décroissant', checked: sort.dir === -1, action: () => { sort = { ...sort, dir: -1 }; render(); } },
        ] });
        if (tool === 'more') showContextMenu({ x: rect.left - 180, y: rect.bottom + 4, items: [
            { label: 'Ouvrir dans le Terminal', icon: ui.terminal, action: () => launch('terminal', { cwd: current?.path }) },
            { label: 'Ouvrir le portfolio dans VS Code', icon: `<img src="${appIconUrl('vscode')}" alt="">`, action: () => launch('vscode') },
        ] });
    });

    const offRecycle = bus.on('recycle:change', () => current?.special === 'recycle' && render());
    win.on('close', offRecycle);

    navigate(path);
    win.handleArgs = (args) => args.path !== undefined && navigate(args.path);
    return win;
}
