/**
 * Groupe d'éditeurs : onglets (aperçu en italique, épinglage, glisser-déposer, menu contextuel),
 * fil d'Ariane, actions d'éditeur et vues (code, aperçu, accueil, extension, paramètres).
 */
import { el, html, raw, escapeHtml } from '../../core/dom.js';
import { codicon, fileIcon, fileIcons } from '../../core/icons.js';
import { files, languageNames } from '../../data/workspace.js';
import { technologies } from '../../data/skills.js';
import { createCodeView } from './code-view.js';
import { welcomeView, previews, extensionView, settingsView } from './previews.js';
import { markdownOutline } from './markdown.js';
import { showContextMenu } from '../../os/context-menu.js';

export class EditorService {
    constructor(wb, root) {
        this.wb = wb;
        this.tabs = [];
        this.activeId = null;
        this.root = root;
        this.tabsEl = root.querySelector('.vs-tabs');
        this.actionsEl = root.querySelector('.vs-editor-actions');
        this.breadcrumbsEl = root.querySelector('.vs-breadcrumbs');
        this.container = root.querySelector('.vs-editor-container');
        this.bindTabs();
        this.render();
    }

    get active() {
        return this.tabs.find((tab) => tab.id === this.activeId) ?? null;
    }

    /* ------------------------------------------------------------------ */
    /* Ouverture                                                            */
    /* ------------------------------------------------------------------ */
    openTab(descriptor, { transient = false, focus = true } = {}) {
        let tab = this.tabs.find((t) => t.id === descriptor.id);
        if (!tab) {
            // Un onglet d'aperçu (italique) est remplacé par le suivant
            const previewTab = transient ? this.tabs.find((t) => t.transient) : null;
            tab = { ...descriptor, transient };
            if (previewTab) {
                const index = this.tabs.indexOf(previewTab);
                previewTab.view?.remove();
                this.tabs.splice(index, 1, tab);
            } else {
                const index = this.tabs.indexOf(this.active);
                this.tabs.splice(index === -1 ? this.tabs.length : index + 1, 0, tab);
            }
        } else if (!transient) {
            tab.transient = false;
        }
        this.activate(tab.id, { focus });
        return tab;
    }

    openFile(path, { transient = false, line, focus = true, preview = false } = {}) {
        const file = files.get(path);
        if (!file) return null;
        if (file.language === 'image') return this.openImage(path, { transient });
        if (preview && file.preview) return this.openPreview(path, { transient });
        const tab = this.openTab({
            id: `file:${path}`,
            kind: 'code',
            path,
            title: file.name,
            icon: fileIcon(file.name),
            tooltip: `~\\Documents\\Portfolio-VSCode\\${path.replace(/\//g, '\\')}`,
        }, { transient, focus });
        if (line) requestAnimationFrame(() => tab.code?.revealLine(line, true));
        return tab;
    }

    openPreview(path, { transient = false, options = {} } = {}) {
        const file = files.get(path);
        const tab = this.openTab({
            id: `preview:${path}`,
            kind: 'preview',
            path,
            title: `Aperçu ${file.name}`,
            icon: fileIcons.preview,
            options,
        }, { transient });
        return tab;
    }

    openImage(path, { transient = false } = {}) {
        const file = files.get(path);
        return this.openTab({ id: `image:${path}`, kind: 'image', path, title: file.name, icon: fileIcons.image }, { transient });
    }

    openWelcome() {
        return this.openTab({ id: 'welcome', kind: 'welcome', title: 'Bienvenue', icon: fileIcons.welcome });
    }

    openExtension(id) {
        return this.openTab({ id: `ext:${id}`, kind: 'extension', techId: id, title: `Extension : ${technologies[id].name}`, icon: fileIcons.extension });
    }

    openSettings() {
        return this.openTab({ id: 'settings', kind: 'settings', title: 'Paramètres', icon: fileIcons.settingsUi });
    }

    /* ------------------------------------------------------------------ */
    /* Vues                                                                 */
    /* ------------------------------------------------------------------ */
    createView(tab) {
        const wb = this.wb;
        const file = tab.path ? files.get(tab.path) : null;
        switch (tab.kind) {
            case 'code': {
                const code = createCodeView(file, {
                    settings: wb.settings,
                    onCursor: (pos) => {
                        if (this.activeId === tab.id) {
                            wb.statusbar.set('cursor', `Ln ${pos.line}, Col ${pos.col}`);
                            this.renderBreadcrumbs();
                        }
                    },
                    onOpenFile: (name) => wb.openFileByName(name),
                    onOpenLink: (url) => wb.openExternal(url),
                    onReadOnly: () => wb.statusbar.flash('Impossible de modifier dans l\'éditeur en lecture seule'),
                });
                tab.code = code;
                return code.element;
            }
            case 'preview': {
                const view = previews[file.preview](wb, file, tab.options);
                view.classList.add('vs-preview-view');
                return view;
            }
            case 'image': return previews.image(wb, file);
            case 'welcome': return welcomeView(wb);
            case 'extension': return extensionView(wb, tab.techId);
            case 'settings': return settingsView(wb);
            default: return el('<div></div>');
        }
    }

    activate(id, { focus = true } = {}) {
        const tab = this.tabs.find((t) => t.id === id);
        if (!tab) return;
        this.activeId = id;
        if (!tab.view) {
            tab.view = this.createView(tab);
            tab.view.classList.add('vs-editor-view');
            this.container.append(tab.view);
        }
        this.tabs.forEach((t) => { if (t.view) t.view.hidden = t.id !== id; });
        if (tab.kind === 'code') {
            tab.code.redraw();
            if (focus) requestAnimationFrame(() => tab.code.focus());
        }
        if (tab.kind === 'preview' && tab.options?.project) tab.view.revealProject?.(tab.options.project);
        this.render();
        this.wb.onEditorChange(tab);
    }

    close(id) {
        const index = this.tabs.findIndex((t) => t.id === id);
        if (index === -1) return;
        const [tab] = this.tabs.splice(index, 1);
        tab.view?.remove();
        if (this.activeId === id) {
            const next = this.tabs[index] ?? this.tabs[index - 1];
            this.activeId = null;
            if (next) this.activate(next.id);
            else {
                this.render();
                this.wb.onEditorChange(null);
            }
        } else {
            this.render();
        }
    }

    closeAll() {
        [...this.tabs].forEach((tab) => this.close(tab.id));
    }

    closeOthers(id) {
        this.tabs.filter((tab) => tab.id !== id).forEach((tab) => this.close(tab.id));
    }

    closeToTheRight(id) {
        const index = this.tabs.findIndex((tab) => tab.id === id);
        this.tabs.slice(index + 1).forEach((tab) => this.close(tab.id));
    }

    cycle(step) {
        if (this.tabs.length < 2) return;
        const index = this.tabs.findIndex((tab) => tab.id === this.activeId);
        this.activate(this.tabs[(index + step + this.tabs.length) % this.tabs.length].id);
    }

    togglePreview() {
        const tab = this.active;
        if (!tab?.path) return;
        const file = files.get(tab.path);
        if (tab.kind === 'code' && file.preview) this.openPreview(tab.path);
        else if (tab.kind === 'preview') this.openFile(tab.path);
    }

    applySettings() {
        this.tabs.forEach((tab) => tab.code?.applySettings());
        this.tabs.find((tab) => tab.kind === 'settings')?.view?.refresh?.();
    }

    /* ------------------------------------------------------------------ */
    /* Rendu : onglets, actions, fil d'Ariane                               */
    /* ------------------------------------------------------------------ */
    render() {
        this.tabsEl.innerHTML = this.tabs.map((tab) => html`
            <div class="vs-tab ${tab.id === this.activeId ? 'is-active' : ''} ${tab.transient ? 'is-transient' : ''}"
                 role="tab" aria-selected="${tab.id === this.activeId}" draggable="true" data-tab="${tab.id}" title="${tab.tooltip ?? tab.title}">
                <span class="vs-tab-icon">${raw(tab.icon)}</span>
                <span class="vs-tab-label">${tab.title}</span>
                ${tab.path && files.get(tab.path)?.git ? raw(`<span class="vs-tab-git is-${files.get(tab.path).git}">${files.get(tab.path).git}</span>`) : ''}
                <button class="vs-tab-close" type="button" aria-label="Fermer" title="Fermer (Alt+W)">${raw(codicon('close'))}</button>
            </div>`.value).join('');
        this.root.classList.toggle('is-empty', this.tabs.length === 0);
        this.tabsEl.querySelector('.is-active')?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
        this.renderActions();
        this.renderBreadcrumbs();
    }

    renderActions() {
        const tab = this.active;
        const file = tab?.path ? files.get(tab.path) : null;
        const actions = [];
        if (tab?.kind === 'code' && file?.preview) actions.push(['open-preview', 'Ouvrir l\'aperçu (Ctrl+Maj+V)', 'preview']);
        if (tab?.kind === 'preview') actions.push(['go-to-file', 'Ouvrir le fichier source', 'source']);
        if (tab) actions.push(['split-horizontal', 'Fractionner l\'éditeur à droite (Ctrl+\\)', 'split']);
        if (tab) actions.push(['ellipsis', 'Autres actions...', 'more']);
        this.actionsEl.innerHTML = actions.map(([icon, title, action]) => `<button class="vs-icon-btn" type="button" title="${escapeHtml(title)}" aria-label="${escapeHtml(title)}" data-action="${action}">${codicon(icon)}</button>`).join('');
    }

    renderBreadcrumbs() {
        const tab = this.active;
        if (!tab) {
            this.breadcrumbsEl.innerHTML = '';
            return;
        }
        const parts = [];
        if (tab.path) {
            const segments = tab.path.split('/');
            segments.slice(0, -1).forEach((segment) => parts.push(`<span class="vs-crumb">${escapeHtml(segment)}</span>`));
            parts.push(`<span class="vs-crumb">${fileIcon(segments.at(-1))}${escapeHtml(segments.at(-1))}</span>`);
            const file = files.get(tab.path);
            if (tab.kind === 'code' && file.language === 'markdown' && tab.code) {
                const heading = markdownOutline(file.content).filter((h) => h.line <= tab.code.cursor.line).at(-1);
                if (heading) parts.push(`<span class="vs-crumb">${codicon('symbol-string')}${escapeHtml(heading.text)}</span>`);
            }
            if (tab.kind === 'preview') parts.push(`<span class="vs-crumb">${codicon('open-preview')}Aperçu</span>`);
        } else {
            parts.push(`<span class="vs-crumb">${tab.icon}${escapeHtml(tab.title)}</span>`);
        }
        this.breadcrumbsEl.innerHTML = parts.join(`<span class="vs-crumb-sep">${codicon('chevron-right')}</span>`);
    }

    bindTabs() {
        this.tabsEl.addEventListener('click', (event) => {
            const tabEl = event.target.closest('.vs-tab');
            if (!tabEl) return;
            if (event.target.closest('.vs-tab-close')) this.close(tabEl.dataset.tab);
            else this.activate(tabEl.dataset.tab);
        });
        this.tabsEl.addEventListener('dblclick', (event) => {
            const tabEl = event.target.closest('.vs-tab');
            const tab = this.tabs.find((t) => t.id === tabEl?.dataset.tab);
            if (tab) {
                tab.transient = false;
                this.render();
            }
        });
        this.tabsEl.addEventListener('auxclick', (event) => {
            const tabEl = event.target.closest('.vs-tab');
            if (tabEl && event.button === 1) this.close(tabEl.dataset.tab);
        });
        this.tabsEl.addEventListener('wheel', (event) => {
            if (Math.abs(event.deltaY) > Math.abs(event.deltaX)) this.tabsEl.scrollLeft += event.deltaY;
        }, { passive: true });

        // Glisser-déposer pour réordonner
        let dragged = null;
        this.tabsEl.addEventListener('dragstart', (event) => {
            dragged = event.target.closest('.vs-tab')?.dataset.tab;
            event.dataTransfer.effectAllowed = 'move';
            event.dataTransfer.setData('text/plain', dragged);
        });
        this.tabsEl.addEventListener('dragover', (event) => {
            if (!dragged) return;
            event.preventDefault();
            this.tabsEl.querySelectorAll('.is-drop-target').forEach((node) => node.classList.remove('is-drop-target'));
            event.target.closest('.vs-tab')?.classList.add('is-drop-target');
        });
        this.tabsEl.addEventListener('drop', (event) => {
            event.preventDefault();
            const target = event.target.closest('.vs-tab')?.dataset.tab;
            if (dragged && target && dragged !== target) {
                const from = this.tabs.findIndex((t) => t.id === dragged);
                const [tab] = this.tabs.splice(from, 1);
                this.tabs.splice(this.tabs.findIndex((t) => t.id === target), 0, tab);
                this.render();
            }
            dragged = null;
        });
        this.tabsEl.addEventListener('dragend', () => {
            dragged = null;
            this.tabsEl.querySelectorAll('.is-drop-target').forEach((node) => node.classList.remove('is-drop-target'));
        });

        this.tabsEl.addEventListener('contextmenu', (event) => {
            const tabEl = event.target.closest('.vs-tab');
            if (!tabEl) return;
            event.preventDefault();
            const id = tabEl.dataset.tab;
            const tab = this.tabs.find((t) => t.id === id);
            showContextMenu({
                x: event.clientX,
                y: event.clientY,
                variant: 'vscode',
                items: [
                    { label: 'Fermer', shortcut: 'Alt+W', action: () => this.close(id) },
                    { label: 'Fermer les autres', action: () => this.closeOthers(id) },
                    { label: 'Fermer à droite', action: () => this.closeToTheRight(id) },
                    { label: 'Tout fermer', shortcut: 'Ctrl+K W', action: () => this.closeAll() },
                    { separator: true },
                    { label: 'Copier le chemin d\'accès', disabled: !tab.path, action: () => navigator.clipboard?.writeText(tab.tooltip ?? tab.path) },
                    { label: 'Copier le chemin d\'accès relatif', disabled: !tab.path, action: () => navigator.clipboard?.writeText(tab.path) },
                    { separator: true },
                    { label: 'Révéler dans la vue de l\'explorateur', disabled: !tab.path, action: () => this.wb.sidebar.reveal(tab.path) },
                    { label: 'Garder ouvert', disabled: !tab.transient, action: () => { tab.transient = false; this.render(); } },
                ],
            });
        });

        this.actionsEl.addEventListener('click', (event) => {
            const action = event.target.closest('[data-action]')?.dataset.action;
            if (action === 'preview' || action === 'source') this.togglePreview();
            if (action === 'split') this.wb.notify('info', 'Le fractionnement de l\'éditeur n\'est pas disponible dans ce portfolio... mais le reste l\'est ! 😉');
            if (action === 'more') {
                const rect = event.target.closest('button').getBoundingClientRect();
                const code = this.active?.code;
                showContextMenu({
                    x: rect.right - 220,
                    y: rect.bottom + 2,
                    variant: 'vscode',
                    items: [
                        { label: 'Afficher les éditeurs ouverts', action: () => this.wb.commands.run('workbench.action.showAllEditors') },
                        { separator: true },
                        { label: 'Tout fermer', action: () => this.closeAll() },
                        { separator: true },
                        { label: 'Replier tout', disabled: !code, action: () => code?.foldAll() },
                        { label: 'Déplier tout', disabled: !code, action: () => code?.unfoldAll() },
                        { label: 'Retour automatique à la ligne', shortcut: 'Alt+Z', action: () => this.wb.commands.run('editor.action.toggleWordWrap') },
                    ],
                });
            }
        });

        this.breadcrumbsEl.addEventListener('click', () => this.wb.commands.run('workbench.action.quickOpen'));
    }

    languageOf(tab) {
        if (!tab?.path) return null;
        const file = files.get(tab.path);
        return languageNames[file.language] ?? file.language;
    }
}
