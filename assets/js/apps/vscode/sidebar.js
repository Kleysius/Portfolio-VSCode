/**
 * Barre latérale : Explorateur, Recherche, Contrôle de code source, Exécuter et déboguer, Extensions.
 */
import { el, html, raw, escapeHtml, isCompact } from '../../core/dom.js';
import { codicon, fileIcon } from '../../core/icons.js';
import { store } from '../../core/store.js';
import { workspace, files } from '../../data/workspace.js';
import { skillGroups, technologies } from '../../data/skills.js';
import { profile } from '../../data/profile.js';
import { getCommits } from '../../services/github.js';
import { markdownOutline } from './markdown.js';
import { techIcon } from './previews.js';
import { showContextMenu } from '../../os/context-menu.js';

const VIEWS = {
    explorer: { title: 'Explorateur', icon: 'files', shortcut: 'Ctrl+Maj+E' },
    search: { title: 'Rechercher', icon: 'search', shortcut: 'Ctrl+Maj+F' },
    scm: { title: 'Contrôle de code source', icon: 'source-control', shortcut: 'Ctrl+Maj+G' },
    run: { title: 'Exécuter et déboguer', icon: 'debug-alt', shortcut: 'Ctrl+Maj+D' },
    extensions: { title: 'Extensions', icon: 'extensions', shortcut: 'Ctrl+Maj+X' },
};

export { VIEWS };

export class Sidebar {
    constructor(wb, root) {
        this.wb = wb;
        this.root = root;
        this.header = root.querySelector('.vs-sidebar-title');
        this.headerActions = root.querySelector('.vs-sidebar-actions');
        this.content = root.querySelector('.vs-sidebar-content');
        this.expanded = new Set(store.get('vs-expanded', ['src']));
        this.sections = store.get('vs-sections', { editors: false, workspace: true, outline: true, timeline: false });
        this.views = {};
        this.current = null;
    }

    show(id) {
        this.current = id;
        this.header.textContent = VIEWS[id].title.toUpperCase();
        if (!this.views[id]) {
            this.views[id] = this[`build_${id}`]();
            this.content.append(this.views[id]);
        }
        Object.entries(this.views).forEach(([key, view]) => { view.hidden = key !== id; });
        this.renderHeaderActions();
        if (id === 'explorer') this.refreshExplorer();
        if (id === 'search') requestAnimationFrame(() => this.views.search.querySelector('.vs-search-input').focus());
    }

    renderHeaderActions() {
        const actions = {
            explorer: [],
            search: [['refresh', 'Actualiser'], ['clear-all', 'Effacer les résultats de la recherche'], ['collapse-all', 'Tout réduire']],
            scm: [['check', 'Valider (Ctrl+Entrée)'], ['refresh', 'Actualiser'], ['ellipsis', 'Autres actions...']],
            run: [['ellipsis', 'Autres actions...']],
            extensions: [['filter', 'Filtrer les extensions...'], ['refresh', 'Actualiser'], ['clear-all', 'Effacer les résultats de la recherche'], ['ellipsis', 'Autres actions...']],
        }[this.current] ?? [];
        this.headerActions.innerHTML = [...actions, ['ellipsis', 'Actions de vue']]
            .filter((action, i, list) => list.findIndex((a) => a[0] === action[0]) === i)
            .map(([icon, title]) => `<button class="vs-icon-btn" type="button" title="${escapeHtml(title)}" aria-label="${escapeHtml(title)}">${codicon(icon)}</button>`).join('');
    }

    /* ================================================================== */
    /* Explorateur                                                          */
    /* ================================================================== */
    build_explorer() {
        const view = el(html`
            <div class="vs-view vs-explorer">
                <section class="vs-pane" data-section="editors">
                    <header class="vs-pane-header" tabindex="0">${raw(codicon('chevron-right'))}<span>Éditeurs ouverts</span></header>
                    <div class="vs-pane-body vs-open-editors"></div>
                </section>
                <section class="vs-pane is-grow" data-section="workspace">
                    <header class="vs-pane-header" tabindex="0">${raw(codicon('chevron-right'))}<span>${workspace.name}</span>
                        <span class="vs-pane-actions">
                            <button class="vs-icon-btn" type="button" title="Nouveau fichier..." data-explorer="new-file">${raw(codicon('new-file'))}</button>
                            <button class="vs-icon-btn" type="button" title="Nouveau dossier..." data-explorer="new-folder">${raw(codicon('new-folder'))}</button>
                            <button class="vs-icon-btn" type="button" title="Actualiser l'explorateur" data-explorer="refresh">${raw(codicon('refresh'))}</button>
                            <button class="vs-icon-btn" type="button" title="Réduire les dossiers dans l'explorateur" data-explorer="collapse">${raw(codicon('collapse-all'))}</button>
                        </span>
                    </header>
                    <div class="vs-pane-body vs-tree" role="tree" aria-label="Fichiers"></div>
                </section>
                <section class="vs-pane" data-section="outline">
                    <header class="vs-pane-header" tabindex="0">${raw(codicon('chevron-right'))}<span>Structure</span></header>
                    <div class="vs-pane-body vs-outline"></div>
                </section>
                <section class="vs-pane" data-section="timeline">
                    <header class="vs-pane-header" tabindex="0">${raw(codicon('chevron-right'))}<span>Chronologie</span></header>
                    <div class="vs-pane-body vs-timeline"></div>
                </section>
            </div>`);

        view.addEventListener('click', (event) => {
            const header = event.target.closest('.vs-pane-header');
            if (header && !event.target.closest('.vs-pane-actions')) {
                const key = header.parentElement.dataset.section;
                this.sections[key] = !this.sections[key];
                store.set('vs-sections', this.sections);
                this.refreshExplorer();
                return;
            }
            const action = event.target.closest('[data-explorer]')?.dataset.explorer;
            if (action === 'collapse') { this.expanded.clear(); this.persistExpanded(); this.renderTree(); }
            if (action === 'refresh') { view.querySelector('.vs-tree').classList.add('is-refreshing'); setTimeout(() => view.querySelector('.vs-tree').classList.remove('is-refreshing'), 300); }
            if (action === 'new-file' || action === 'new-folder') this.wb.notify('info', 'Cet espace de travail est en lecture seule. Mais vous pouvez me contacter pour en discuter !', [{ label: 'Me contacter', run: () => this.wb.openFileByName('contact.html', { preview: true }) }]);

            const node = event.target.closest('[data-path]');
            if (node) {
                const path = node.dataset.path;
                if (!node.dataset.folder && event.detail >= 2) {
                    this.wb.editor.openFile(path);
                    if (isCompact()) this.wb.toggleSidebar(false);
                } else if (node.dataset.folder) {
                    if (this.expanded.has(path)) this.expanded.delete(path);
                    else this.expanded.add(path);
                    this.persistExpanded();
                    this.renderTree();
                } else {
                    this.wb.editor.openFile(path, { transient: true, focus: false });
                }
                this.select(path);
            }
            const openEditor = event.target.closest('[data-open-editor]');
            if (openEditor) {
                if (event.target.closest('.vs-open-editor-close')) this.wb.editor.close(openEditor.dataset.openEditor);
                else this.wb.editor.activate(openEditor.dataset.openEditor);
            }
            const outline = event.target.closest('[data-outline-line]');
            if (outline) this.wb.editor.active?.code?.revealLine(Number(outline.dataset.outlineLine), true);
        });

        view.addEventListener('keydown', (event) => {
            const node = event.target.closest('[data-path]');
            if (node && event.key === 'Enter') node.click();
            if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
                const nodes = [...view.querySelectorAll('.vs-tree [data-path]')];
                const next = nodes[nodes.indexOf(document.activeElement) + (event.key === 'ArrowDown' ? 1 : -1)];
                if (next) { event.preventDefault(); next.focus(); }
            }
        });

        view.addEventListener('contextmenu', (event) => {
            const node = event.target.closest('[data-path]');
            if (!node) return;
            event.preventDefault();
            const path = node.dataset.path;
            const file = files.get(path);
            showContextMenu({
                x: event.clientX,
                y: event.clientY,
                variant: 'vscode',
                items: node.dataset.folder ? [
                    { label: 'Nouveau fichier...', disabled: true },
                    { label: 'Nouveau dossier...', disabled: true },
                    { separator: true },
                    { label: 'Ouvrir dans le terminal intégré', action: () => this.wb.panel.show('terminal') },
                    { label: 'Rechercher dans le dossier...', shortcut: 'Maj+Alt+F', action: () => this.wb.commands.run('workbench.view.search') },
                    { separator: true },
                    { label: 'Copier le chemin d\'accès relatif', action: () => navigator.clipboard?.writeText(path) },
                ] : [
                    { label: 'Ouvrir sur le côté', shortcut: 'Ctrl+Entrée', action: () => this.wb.editor.openFile(path) },
                    { label: 'Ouvrir l\'aperçu', disabled: !file.preview, action: () => this.wb.editor.openPreview(path) },
                    { label: 'Révéler dans l\'Explorateur de fichiers', shortcut: 'Maj+Alt+R', action: () => this.wb.launchExplorer() },
                    { label: 'Ouvrir dans le terminal intégré', action: () => this.wb.panel.show('terminal') },
                    { separator: true },
                    { label: 'Ouvrir la chronologie', action: () => { this.sections.timeline = true; this.refreshExplorer(); } },
                    { separator: true },
                    { label: 'Copier le chemin d\'accès relatif', shortcut: 'Ctrl+K Ctrl+Maj+Alt+C', action: () => navigator.clipboard?.writeText(path) },
                    { separator: true },
                    { label: 'Renommer...', shortcut: 'F2', disabled: true },
                    { label: 'Supprimer', shortcut: 'Suppr', disabled: true },
                ],
            });
        });
        return view;
    }

    persistExpanded() {
        store.set('vs-expanded', [...this.expanded]);
    }

    refreshExplorer() {
        const view = this.views.explorer;
        if (!view) return;
        view.querySelectorAll('.vs-pane').forEach((pane) => {
            const open = !!this.sections[pane.dataset.section];
            pane.classList.toggle('is-open', open);
        });
        this.renderTree();
        this.renderOpenEditors();
        this.renderOutline();
        this.renderTimeline();
    }

    renderTree() {
        const tree = this.views.explorer?.querySelector('.vs-tree');
        if (!tree) return;
        const activePath = this.wb.editor?.active?.path;
        const rows = [];
        const walk = (node, depth) => {
            const children = [...node.children].sort((a, b) => Number(!!b.children) - Number(!!a.children) || a.name.localeCompare(b.name));
            children.forEach((child) => {
                const isFolder = !!child.children;
                const open = this.expanded.has(child.path);
                const git = isFolder ? (child.children.some((c) => c.git) ? 'dot' : '') : child.git;
                rows.push(html`
                    <div class="vs-tree-row ${child.path === activePath ? 'is-active' : ''} ${git ? `is-git-${git === 'dot' ? 'dot' : git}` : ''}"
                         role="treeitem" tabindex="-1" data-path="${child.path}" ${isFolder ? raw(`data-folder="1" aria-expanded="${open}"`) : ''}
                         style="--depth:${depth}">
                        ${raw('<span class="vs-tree-indent"></span>'.repeat(depth))}
                        <span class="vs-tree-twistie">${isFolder ? raw(codicon(open ? 'chevron-down' : 'chevron-right')) : ''}</span>
                        <span class="vs-tree-icon">${raw(fileIcon(child.name, { folder: isFolder, open }))}</span>
                        <span class="vs-tree-label">${child.name}</span>
                        ${git && git !== 'dot' ? raw(`<span class="vs-tree-badge">${git}</span>`) : ''}
                        ${git === 'dot' ? raw('<span class="vs-tree-dot"></span>') : ''}
                    </div>`.value);
                if (isFolder && open) walk(child, depth + 1);
            });
        };
        walk(workspace, 0);
        tree.innerHTML = rows.join('');
    }

    select(path) {
        this.views.explorer?.querySelectorAll('.vs-tree-row').forEach((row) => row.classList.toggle('is-selected', row.dataset.path === path));
    }

    reveal(path) {
        const parts = path.split('/');
        for (let i = 1; i < parts.length; i++) this.expanded.add(parts.slice(0, i).join('/'));
        this.persistExpanded();
        this.sections.workspace = true;
        this.wb.showView('explorer');
        this.renderTree();
        this.select(path);
        this.views.explorer.querySelector(`[data-path="${CSS.escape(path)}"]`)?.scrollIntoView({ block: 'nearest' });
    }

    renderOpenEditors() {
        const container = this.views.explorer?.querySelector('.vs-open-editors');
        if (!container) return;
        const editor = this.wb.editor;
        container.innerHTML = editor.tabs.map((tab) => html`
            <div class="vs-tree-row ${tab.id === editor.activeId ? 'is-active' : ''}" data-open-editor="${tab.id}">
                <button class="vs-open-editor-close" type="button" aria-label="Fermer">${raw(codicon('close'))}</button>
                <span class="vs-tree-icon">${raw(tab.icon)}</span>
                <span class="vs-tree-label ${tab.transient ? 'is-italic' : ''}">${tab.title}</span>
                ${tab.path ? raw(`<span class="vs-tree-description">${escapeHtml(tab.path.split('/').slice(0, -1).join('/'))}</span>`) : ''}
            </div>`.value).join('');
    }

    renderOutline() {
        const container = this.views.explorer?.querySelector('.vs-outline');
        if (!container) return;
        const tab = this.wb.editor.active;
        const file = tab?.path ? files.get(tab.path) : null;
        if (!file?.content) {
            container.innerHTML = '<p class="vs-pane-message">L\'éditeur actif ne peut pas fournir d\'informations de structure.</p>';
            return;
        }
        let symbols = [];
        if (file.language === 'markdown') {
            symbols = markdownOutline(file.content).map((h) => ({ name: h.text, line: h.line, depth: h.level - 1, icon: 'symbol-string' }));
        } else if (file.language === 'json') {
            const lines = file.content.split('\n');
            if (file.content.trimStart().startsWith('[')) {
                // Tableau d'objets : un symbole par élément, nommé d'après sa propriété « name »
                symbols = lines.map((line, i) => ({ match: line.match(/^\s{4}"name":\s*"([^"]+)"/), i }))
                    .filter(({ match }) => match)
                    .map(({ match, i }) => ({ name: match[1], line: i, depth: 0, icon: 'symbol-module' }));
            } else {
                const keys = lines.map((line, i) => ({ match: line.match(/^(\s*)"([^"]+)":/), i })).filter(({ match }) => match);
                const unit = Math.min(...keys.map(({ match }) => match[1].length)) || 2;
                symbols = keys
                    .filter(({ match }) => match[1].length <= unit * 2)
                    .map(({ match, i }) => ({ name: match[2], line: i + 1, depth: match[1].length / unit - 1, icon: 'symbol-key' }));
            }
        } else if (file.language === 'typescript') {
            symbols = file.content.split('\n').map((line, i) => ({ match: line.match(/^(?:export\s+)?(type|interface|const|function)\s+(\w+)|^\s{4}(\w+)\??:/), i }))
                .filter(({ match }) => match)
                .map(({ match, i }) => ({ name: match[2] ?? match[3], line: i + 1, depth: match[3] ? 1 : 0, icon: { type: 'symbol-class', interface: 'symbol-interface', const: 'symbol-variable', function: 'symbol-method' }[match[1]] ?? 'symbol-field' }));
        } else if (file.language === 'html') {
            symbols = file.content.split('\n').map((line, i) => ({ match: line.match(/^(\s*)<([a-z][\w-]*)([^>]*)>/i), i }))
                .filter(({ match }) => match)
                .map(({ match, i }) => ({ name: match[2] + (match[3].match(/class="([^"]+)"/)?.[1] ? `.${match[3].match(/class="([^"]+)"/)[1]}` : '') + (match[3].match(/id="([^"]+)"/)?.[1] ? `#${match[3].match(/id="([^"]+)"/)[1]}` : ''), line: i + 1, depth: Math.floor(match[1].length / 4), icon: 'symbol-misc' }));
        }
        container.innerHTML = symbols.map((symbol) => html`
            <div class="vs-tree-row" data-outline-line="${symbol.line}" style="--depth:${symbol.depth}">
                ${raw('<span class="vs-tree-indent"></span>'.repeat(Math.max(0, symbol.depth)))}
                <span class="vs-tree-icon vs-symbol-icon">${raw(codicon(symbol.icon))}</span>
                <span class="vs-tree-label">${symbol.name}</span>
            </div>`.value).join('') || '<p class="vs-pane-message">Aucun symbole trouvé dans le document.</p>';
    }

    async renderTimeline() {
        const container = this.views.explorer?.querySelector('.vs-timeline');
        if (!container || !this.sections.timeline) return;
        container.innerHTML = '<p class="vs-pane-message">Chargement...</p>';
        const commits = await getCommits(20);
        container.innerHTML = commits.slice(0, 8).map((commit) => html`
            <div class="vs-tree-row" title="${commit.message}">
                <span class="vs-tree-icon">${raw(codicon('git-commit'))}</span>
                <span class="vs-tree-label">${commit.message}</span>
                <span class="vs-tree-description">${relativeDate(commit.date)}</span>
            </div>`.value).join('') || '<p class="vs-pane-message">Aucune chronologie disponible.</p>';
    }

    /* ================================================================== */
    /* Recherche                                                            */
    /* ================================================================== */
    build_search() {
        const view = el(html`
            <div class="vs-view vs-search">
                <div class="vs-search-form">
                    <button class="vs-icon-btn vs-search-toggle-replace" type="button" title="Activer/désactiver le remplacement">${raw(codicon('chevron-right'))}</button>
                    <div class="vs-search-fields">
                        <div class="vs-input-box">
                            <input class="vs-input vs-search-input" type="text" placeholder="Rechercher" aria-label="Rechercher" spellcheck="false">
                            <span class="vs-input-options">
                                <button class="vs-toggle" type="button" data-option="case" title="Respecter la casse (Alt+C)">${raw(codicon('case-sensitive'))}</button>
                                <button class="vs-toggle" type="button" data-option="word" title="Mot entier (Alt+W)">${raw(codicon('whole-word'))}</button>
                                <button class="vs-toggle" type="button" data-option="regex" title="Utiliser une expression régulière (Alt+R)">${raw(codicon('regex'))}</button>
                            </span>
                        </div>
                        <div class="vs-input-box vs-replace-box" hidden>
                            <input class="vs-input" type="text" placeholder="Remplacer" aria-label="Remplacer" disabled>
                            <span class="vs-input-options"><button class="vs-toggle" type="button" disabled>${raw(codicon('replace-all'))}</button></span>
                        </div>
                    </div>
                </div>
                <p class="vs-search-summary"></p>
                <div class="vs-search-results"></div>
            </div>`);
        const input = view.querySelector('.vs-search-input');
        const options = { case: false, word: false, regex: false };
        const run = () => this.search(view, input.value, options);
        input.addEventListener('input', run);
        view.querySelectorAll('[data-option]').forEach((button) => button.addEventListener('click', () => {
            options[button.dataset.option] = !options[button.dataset.option];
            button.classList.toggle('is-checked', options[button.dataset.option]);
            run();
        }));
        view.querySelector('.vs-search-toggle-replace').addEventListener('click', (event) => {
            const box = view.querySelector('.vs-replace-box');
            box.hidden = !box.hidden;
            event.currentTarget.innerHTML = codicon(box.hidden ? 'chevron-right' : 'chevron-down');
        });
        view.addEventListener('click', (event) => {
            const match = event.target.closest('[data-match]');
            if (match) {
                const [path, line, start, length] = match.dataset.match.split('|');
                const tab = this.wb.editor.openFile(path, { transient: true });
                requestAnimationFrame(() => tab?.code?.highlightRange(Number(line), Number(start), Number(length)));
            }
            const fileHeader = event.target.closest('.vs-search-file');
            if (fileHeader) fileHeader.parentElement.classList.toggle('is-collapsed');
        });
        return view;
    }

    search(view, query, options) {
        const results = view.querySelector('.vs-search-results');
        const summary = view.querySelector('.vs-search-summary');
        if (!query) {
            results.innerHTML = '';
            summary.textContent = '';
            return;
        }
        let regex;
        try {
            const source = options.regex ? query : query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            regex = new RegExp(options.word ? `\\b${source}\\b` : source, options.case ? 'g' : 'gi');
        } catch {
            summary.textContent = 'Expression régulière non valide.';
            return;
        }
        let total = 0;
        const groups = [];
        files.forEach((file) => {
            if (!file.content) return;
            const matches = [];
            file.content.split('\n').forEach((line, i) => {
                regex.lastIndex = 0;
                let match;
                while ((match = regex.exec(line)) && matches.length < 200) {
                    if (!match[0]) break;
                    matches.push({ line: i + 1, start: match.index, length: match[0].length, text: line });
                }
            });
            if (matches.length) {
                total += matches.length;
                groups.push({ file, matches });
            }
        });
        summary.textContent = total ? `${total} résultat${total > 1 ? 's' : ''} dans ${groups.length} fichier${groups.length > 1 ? 's' : ''}` : 'Aucun résultat trouvé. Vérifiez vos paramètres dans les exclusions configurées.';
        results.innerHTML = groups.map(({ file, matches }) => html`
            <div class="vs-search-group">
                <div class="vs-tree-row vs-search-file">
                    ${raw(codicon('chevron-down'))}
                    <span class="vs-tree-icon">${raw(fileIcon(file.name))}</span>
                    <span class="vs-tree-label">${file.name}</span>
                    <span class="vs-tree-description">${file.path.split('/').slice(0, -1).join('/')}</span>
                    <span class="vs-badge">${matches.length}</span>
                </div>
                ${matches.map((m) => {
                    const before = m.text.slice(Math.max(0, m.start - 24), m.start).trimStart();
                    return raw(html`<div class="vs-tree-row vs-search-match" data-match="${file.path}|${m.line}|${m.start}|${m.length}" title="${m.text.trim()}">
                        <span>${m.start > 24 ? '…' : ''}${before}<mark>${m.text.substr(m.start, m.length)}</mark>${m.text.slice(m.start + m.length, m.start + m.length + 60)}</span>
                    </div>`);
                })}
            </div>`.value).join('');
    }

    focusSearch(value) {
        this.show('search');
        const input = this.views.search.querySelector('.vs-search-input');
        if (value) {
            input.value = value;
            input.dispatchEvent(new Event('input'));
        }
        input.focus();
        input.select();
    }

    /* ================================================================== */
    /* Contrôle de code source                                              */
    /* ================================================================== */
    build_scm() {
        const changes = [...files.values()].filter((file) => file.git);
        const view = el(html`
            <div class="vs-view vs-scm">
                <div class="vs-scm-commit">
                    <textarea class="vs-input vs-scm-message" rows="1" placeholder="Message (Ctrl+Entrée pour valider sur « main »)" aria-label="Message de validation"></textarea>
                    <button class="vs-button vs-scm-commit-btn" type="button">${raw(codicon('check'))} Valider</button>
                </div>
                <section class="vs-pane is-open">
                    <header class="vs-pane-header">${raw(codicon('chevron-right'))}<span>Modifications</span><span class="vs-badge">${changes.length}</span></header>
                    <div class="vs-pane-body">
                        ${changes.map((file) => raw(html`
                            <div class="vs-tree-row is-git-${file.git}" data-scm="${file.path}">
                                <span class="vs-tree-icon">${raw(fileIcon(file.name))}</span>
                                <span class="vs-tree-label">${file.name}</span>
                                <span class="vs-tree-description">${file.path.split('/').slice(0, -1).join('/')}</span>
                                <span class="vs-tree-badge">${file.git}</span>
                            </div>`))}
                    </div>
                </section>
                <section class="vs-pane is-open is-grow">
                    <header class="vs-pane-header">${raw(codicon('chevron-right'))}<span>Graphique</span>
                        <span class="vs-pane-actions"><button class="vs-icon-btn" type="button" data-scm-action="github" title="Ouvrir sur GitHub">${raw(codicon('github'))}</button></span>
                    </header>
                    <div class="vs-pane-body vs-scm-graph"><p class="vs-pane-message">Chargement de l'historique...</p></div>
                </section>
            </div>`);

        const message = view.querySelector('.vs-scm-message');
        const commit = () => {
            if (!message.value.trim()) {
                this.wb.notify('warning', 'Aucun message de validation fourni.');
                message.focus();
                return;
            }
            this.wb.notify('info', `Validation « ${message.value.trim()} » : merci, mais je garde la main sur mon dépôt 😄`);
            message.value = '';
        };
        view.querySelector('.vs-scm-commit-btn').addEventListener('click', commit);
        message.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' && event.ctrlKey) commit();
        });
        view.addEventListener('click', (event) => {
            const file = event.target.closest('[data-scm]');
            if (file) this.wb.editor.openFile(file.dataset.scm);
            const commitRow = event.target.closest('[data-commit-url]');
            if (commitRow) this.wb.openExternal(commitRow.dataset.commitUrl);
            if (event.target.closest('[data-scm-action="github"]')) this.wb.openExternal(profile.links.repo);
            const header = event.target.closest('.vs-pane-header');
            if (header && !event.target.closest('.vs-pane-actions')) header.parentElement.classList.toggle('is-open');
        });

        getCommits(20).then((commits) => {
            const graph = view.querySelector('.vs-scm-graph');
            graph.innerHTML = commits.map((commit, i) => html`
                <div class="vs-tree-row vs-commit" data-commit-url="${commit.url}" title="${commit.message}\n${commit.author}, ${commit.date.toLocaleString('fr-FR')}">
                    <span class="vs-commit-graph ${i === 0 ? 'is-head' : ''} ${i === commits.length - 1 ? 'is-last' : ''}"><i></i></span>
                    <span class="vs-tree-label">${commit.message}</span>
                    ${i === 0 ? raw('<span class="vs-commit-ref">main</span><span class="vs-commit-ref is-remote">origin/main</span>') : ''}
                    <span class="vs-tree-description">${commit.author}</span>
                </div>`.value).join('') || '<p class="vs-pane-message">Historique indisponible hors ligne.</p>';
        });
        return view;
    }

    /* ================================================================== */
    /* Exécuter et déboguer                                                 */
    /* ================================================================== */
    build_run() {
        const view = el(html`
            <div class="vs-view vs-run">
                <div class="vs-run-start">
                    <button class="vs-button vs-run-button" type="button">Exécuter et déboguer</button>
                    <p>Pour personnaliser Exécuter et déboguer, <a href="#" data-run="open">créez un fichier launch.json</a>.</p>
                    <p>Lancez le portfolio en mode débogage : la barre d'état change de couleur et la console de débogage s'anime.</p>
                    <button class="vs-button is-secondary" type="button" data-run="terminal">${raw(codicon('terminal'))} Afficher tous les scripts npm</button>
                </div>
                <section class="vs-pane is-open"><header class="vs-pane-header">${raw(codicon('chevron-right'))}<span>Espion</span></header>
                    <div class="vs-pane-body vs-watch">
                        <div class="vs-tree-row"><span class="vs-debug-name">motivation</span>: <span class="vs-debug-value">Infinity</span></div>
                        <div class="vs-tree-row"><span class="vs-debug-name">cafe</span>: <span class="vs-debug-value is-string">"☕ indispensable"</span></div>
                        <div class="vs-tree-row"><span class="vs-debug-name">experienceChimie</span>: <span class="vs-debug-value">${profile.yearsChemistry}</span></div>
                    </div>
                </section>
                <section class="vs-pane is-open"><header class="vs-pane-header">${raw(codicon('chevron-right'))}<span>Points d'arrêt</span></header>
                    <div class="vs-pane-body">
                        <div class="vs-tree-row"><input type="checkbox" class="vs-checkbox" checked disabled> <span class="vs-breakpoint"></span> <span class="vs-tree-label">Exceptions interceptées</span></div>
                        <div class="vs-tree-row"><input type="checkbox" class="vs-checkbox" disabled> <span class="vs-breakpoint"></span> <span class="vs-tree-label">Exceptions non interceptées</span></div>
                    </div>
                </section>
            </div>`);
        view.querySelector('.vs-run-button').addEventListener('click', () => this.wb.startDebugging());
        view.addEventListener('click', (event) => {
            const action = event.target.closest('[data-run]')?.dataset.run;
            if (action === 'open') { event.preventDefault(); this.wb.editor.openFile('package.json'); }
            if (action === 'terminal') this.wb.panel.run('npm run dev');
        });
        return view;
    }

    /* ================================================================== */
    /* Extensions (= compétences)                                           */
    /* ================================================================== */
    build_extensions() {
        const view = el(html`
            <div class="vs-view vs-extensions">
                <div class="vs-ext-search"><input class="vs-input" type="text" placeholder="Rechercher des extensions dans Marketplace" aria-label="Rechercher des extensions"></div>
                <div class="vs-ext-groups">
                    ${skillGroups.map((group) => raw(html`
                        <section class="vs-pane is-open" data-group="${group.id}">
                            <header class="vs-pane-header">${raw(codicon('chevron-right'))}<span>${group.label}</span><span class="vs-badge">${group.items.length}</span></header>
                            <div class="vs-pane-body">
                                ${group.items.map((id) => raw(html`
                                    <div class="vs-ext-item" data-extension="${id}" data-search="${`${technologies[id].name} ${technologies[id].description}`.toLowerCase()}" tabindex="0" role="button">
                                        <span class="vs-ext-item-icon">${raw(techIcon(id, 32))}</span>
                                        <span class="vs-ext-item-body">
                                            <span class="vs-ext-item-name">${technologies[id].name}</span>
                                            <span class="vs-ext-item-desc">${technologies[id].description}</span>
                                            <span class="vs-ext-item-publisher">${raw(codicon('verified-filled'))} ${technologies[id].publisher}</span>
                                        </span>
                                        <button class="vs-icon-btn vs-ext-item-gear" type="button" title="Gérer" tabindex="-1">${raw(codicon('settings-gear'))}</button>
                                    </div>`))}
                            </div>
                        </section>`))}
                </div>
            </div>`);
        view.querySelector('input').addEventListener('input', (event) => {
            const query = event.target.value.toLowerCase();
            view.querySelectorAll('.vs-ext-item').forEach((item) => { item.hidden = !item.dataset.search.includes(query); });
            view.querySelectorAll('.vs-pane').forEach((pane) => { pane.hidden = !pane.querySelector('.vs-ext-item:not([hidden])'); });
        });
        view.addEventListener('click', (event) => {
            const header = event.target.closest('.vs-pane-header');
            if (header) header.parentElement.classList.toggle('is-open');
            const item = event.target.closest('[data-extension]');
            if (item) {
                view.querySelectorAll('.vs-ext-item').forEach((node) => node.classList.toggle('is-selected', node === item));
                this.wb.editor.openExtension(item.dataset.extension);
            }
        });
        view.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') event.target.closest('[data-extension]')?.click();
        });
        return view;
    }
}

export function relativeDate(date) {
    const seconds = (Date.now() - date.getTime()) / 1000;
    const rtf = new Intl.RelativeTimeFormat('fr', { numeric: 'auto' });
    const units = [['year', 31536000], ['month', 2592000], ['week', 604800], ['day', 86400], ['hour', 3600], ['minute', 60]];
    for (const [unit, size] of units) if (seconds >= size) return rtf.format(-Math.floor(seconds / size), unit);
    return 'à l\'instant';
}
