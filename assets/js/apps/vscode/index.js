/**
 * Visual Studio Code : workbench complet (barre de titre + menus, barre d'activité, barre latérale,
 * éditeurs, panneau, barre d'état, palette de commandes, notifications, thèmes, raccourcis clavier).
 */
import { el, html, raw, escapeHtml, clamp, isCompact } from '../../core/dom.js';
import { codicon, appIconUrl, fileIcon } from '../../core/icons.js';
import { store } from '../../core/store.js';
import { bus } from '../../core/bus.js';
import { wm } from '../../os/window-manager.js';
import { launch } from '../../os/apps.js';
import { showContextMenu, closeContextMenu } from '../../os/context-menu.js';
import { files, findFile, languageNames } from '../../data/workspace.js';
import { projects } from '../../data/projects.js';
import { profile } from '../../data/profile.js';
import { likes } from '../../services/likes.js';
import { EditorService } from './editor.js';
import { Sidebar, VIEWS } from './sidebar.js';
import { Panel } from './panel.js';
import { QuickInput } from './quick-input.js';
import { themes, themeById } from './themes.js';
import { markdownOutline } from './markdown.js';

const DEFAULT_SETTINGS = {
    theme: 'dark-modern',
    fontSize: 14,
    wordWrap: 'auto',
    minimap: true,
    ligatures: true,
    cursorBlinking: 'blink',
};

class Workbench {
    constructor(args) {
        this.settings = { ...DEFAULT_SETTINGS, ...store.get('vs-settings', {}) };
        this.layout = {
            sidebar: store.get('vs-sidebar', !isCompact()),
            sidebarWidth: store.get('vs-sidebar-width', 250),
            panel: store.get('vs-panel', false),
            panelHeight: store.get('vs-panel-height', 220),
            view: 'explorer',
        };
        this.commands = createCommands(this);
        this.build();
        this.window = wm.open({
            appId: 'vscode',
            title: 'Bienvenue - PORTFOLIO-THOMAS - Visual Studio Code',
            icon: appIconUrl('vscode'),
            frame: 'custom',
            width: 1180,
            height: 740,
            minWidth: 420,
            minHeight: 300,
            className: 'window--vscode',
            content: this.root,
        });
        this.window.handleArgs = (next) => this.handleArgs(next);
        this.root.querySelector('.vs-titlebar-right').append(this.window.controls);
        this.window.on('resize', () => {
            this.editor.active?.code?.redraw();
            this.fitMenubar();
        });
        requestAnimationFrame(() => this.fitMenubar());
        this.window.on('close', () => this.dispose());

        this.editor = new EditorService(this, this.root.querySelector('.vs-editor-group'));
        this.sidebar = new Sidebar(this, this.root.querySelector('.vs-sidebar'));
        this.panel = new Panel(this, this.root.querySelector('.vs-panel'));
        this.quickInput = new QuickInput(this.root);

        this.applyTheme(this.settings.theme);
        this.applyLayout();
        this.showView('explorer', { force: true, reveal: false });
        const panelVisible = this.layout.panel;
        this.panel.show('terminal');
        this.togglePanel(panelVisible);
        this.bindKeyboard();
        this.bindMenubar();
        this.bindActivityBar();
        this.bindSashes();
        this.bindStatusbar();

        this.unsubscribers = [bus.on('likes:change', () => this.updateLikes())];
        this.updateLikes();

        if (store.get('vs-show-welcome', true)) this.editor.openWelcome();
        else this.editor.openPreview('README.md');
        this.handleArgs(args);

        if (!store.get('vs-recommendations-shown', false)) {
            setTimeout(() => {
                this.notify('info', 'Voulez-vous installer les extensions recommandées pour ce dépôt ? (Spoiler : ce sont mes compétences)', [
                    { label: 'Afficher les recommandations', run: () => this.showView('extensions') },
                    { label: 'Ne plus afficher', run: () => store.set('vs-recommendations-shown', true), secondary: true },
                ]);
            }, 4500);
        }
    }

    dispose() {
        this.unsubscribers.forEach((off) => off());
        document.removeEventListener('keydown', this.onKeyDown, true);
    }

    handleArgs(args = {}) {
        if (args.open) {
            const file = findFile(args.open);
            if (file) this.editor.openFile(file.path, { preview: !!args.preview, line: args.line });
        }
        if (args.project) this.openProject(args.project);
    }

    /* ------------------------------------------------------------------ */
    /* Construction du DOM                                                  */
    /* ------------------------------------------------------------------ */
    build() {
        this.root = el(html`
            <div class="vscode" data-vs-theme="${this.settings.theme}">
                <header class="vs-titlebar" data-drag>
                    <div class="vs-titlebar-left">
                        <img class="vs-app-icon" src="${appIconUrl('vscode')}" alt="" draggable="false">
                        <button class="vs-hamburger vs-icon-btn" type="button" aria-label="Menu de l'application">${raw(codicon('menu'))}</button>
                        <nav class="vs-menubar" role="menubar">
                            ${MENUS.map((menu) => raw(html`<button class="vs-menu-item" type="button" role="menuitem" data-menu="${menu.id}">${menu.label}</button>`))}
                            <button class="vs-menu-item vs-menu-overflow" type="button" role="menuitem" aria-label="Plus" hidden>${raw(codicon('ellipsis'))}</button>
                        </nav>
                    </div>
                    <div class="vs-titlebar-center">
                        <button class="vs-icon-btn vs-nav-btn" type="button" data-command="workbench.action.navigateBack" title="Retour (Alt+LeftArrow)">${raw(codicon('arrow-left'))}</button>
                        <button class="vs-icon-btn vs-nav-btn" type="button" data-command="workbench.action.navigateForward" title="Suivant (Alt+RightArrow)" disabled>${raw(codicon('arrow-right'))}</button>
                        <button class="vs-command-center" type="button" data-command="workbench.action.quickOpen" title="Rechercher dans les fichiers (Ctrl+P)">
                            ${raw(codicon('search'))}<span>PORTFOLIO-THOMAS</span>
                        </button>
                        <button class="vs-icon-btn vs-copilot" type="button" title="Ouvrir la conversation (Ctrl+Alt+I)" data-command="portfolio.chat">${raw(codicon('copilot'))}</button>
                    </div>
                    <div class="vs-titlebar-right">
                        <div class="vs-layout-controls">
                            <button class="vs-icon-btn" type="button" data-command="workbench.action.toggleSidebarVisibility" title="Activer/désactiver la barre latérale principale (Ctrl+B)" data-layout="sidebar"></button>
                            <button class="vs-icon-btn" type="button" data-command="workbench.action.togglePanel" title="Activer/désactiver le panneau (Ctrl+J)" data-layout="panel"></button>
                            <button class="vs-icon-btn" type="button" data-command="workbench.action.selectTheme" title="Personnaliser la disposition...">${raw(codicon('layout'))}</button>
                        </div>
                    </div>
                </header>
                <div class="vs-progress" hidden><i></i></div>

                <div class="vs-main">
                    <nav class="vs-activitybar" aria-label="Barre d'activité">
                        <div class="vs-activity-top">
                            ${Object.entries(VIEWS).map(([id, view]) => raw(html`
                                <button class="vs-activity" type="button" data-view="${id}" title="${view.title} (${view.shortcut})" aria-label="${view.title}">
                                    ${raw(codicon(view.icon))}
                                    ${id === 'scm' ? raw('<span class="vs-activity-badge">3</span>') : ''}
                                </button>`))}
                        </div>
                        <div class="vs-activity-bottom">
                            <button class="vs-activity" type="button" data-activity="accounts" title="Comptes" aria-label="Comptes">${raw(codicon('account'))}</button>
                            <button class="vs-activity" type="button" data-activity="manage" title="Gérer" aria-label="Gérer">${raw(codicon('settings-gear'))}<span class="vs-activity-badge is-dot"></span></button>
                        </div>
                    </nav>

                    <aside class="vs-sidebar" aria-label="Barre latérale principale">
                        <header class="vs-sidebar-header">
                            <h2 class="vs-sidebar-title"></h2>
                            <div class="vs-sidebar-actions"></div>
                        </header>
                        <div class="vs-sidebar-content"></div>
                    </aside>
                    <div class="vs-sash vs-sash-vertical" data-sash="sidebar"></div>

                    <div class="vs-workarea">
                        <div class="vs-editor-group">
                            <div class="vs-tabs-bar">
                                <div class="vs-tabs" role="tablist"></div>
                                <div class="vs-editor-actions"></div>
                            </div>
                            <div class="vs-breadcrumbs" aria-label="Fil d'Ariane"></div>
                            <div class="vs-editor-container">
                                <div class="vs-watermark">
                                    <img src="${appIconUrl('vscode')}" alt="" class="vs-watermark-logo">
                                    <dl>
                                        <dt>Afficher toutes les commandes</dt><dd><kbd>Ctrl</kbd>+<kbd>Maj</kbd>+<kbd>P</kbd></dd>
                                        <dt>Accéder au fichier</dt><dd><kbd>Ctrl</kbd>+<kbd>P</kbd></dd>
                                        <dt>Rechercher dans les fichiers</dt><dd><kbd>Ctrl</kbd>+<kbd>Maj</kbd>+<kbd>F</kbd></dd>
                                        <dt>Afficher/masquer le terminal</dt><dd><kbd>Ctrl</kbd>+<kbd>J</kbd></dd>
                                        <dt>Ouvrir la page d'accueil</dt><dd><kbd>Ctrl</kbd>+<kbd>K</kbd> <kbd>W</kbd></dd>
                                    </dl>
                                </div>
                            </div>
                        </div>
                        <div class="vs-sash vs-sash-horizontal" data-sash="panel"></div>
                        <section class="vs-panel" aria-label="Panneau"></section>
                    </div>
                </div>

                <footer class="vs-statusbar">
                    <div class="vs-status-left">
                        <button class="vs-status-item vs-status-remote" type="button" title="Ouvrir une fenêtre distante" data-status="remote">${raw(codicon('remote'))}</button>
                        <button class="vs-status-item" type="button" data-status="branch" title="main (Extraire une branche/étiquette...)">${raw(codicon('git-branch'))} main*</button>
                        <button class="vs-status-item" type="button" data-status="sync" title="Synchroniser les modifications">${raw(codicon('sync'))} 0${raw(codicon('arrow-down'))} 1${raw(codicon('arrow-up'))}</button>
                        <button class="vs-status-item" type="button" data-status="problems" title="Aucun problème">${raw(codicon('error'))} 0 ${raw(codicon('warning'))} 0</button>
                        <span class="vs-status-item vs-status-debug" data-status="debug" hidden>${raw(codicon('debug-alt'))} Portfolio (PORTFOLIO-THOMAS)</span>
                        <span class="vs-status-item vs-status-flash" data-status="flash" hidden></span>
                    </div>
                    <div class="vs-status-right">
                        <button class="vs-status-item" type="button" data-status="cursor" title="Atteindre la ligne/colonne">Ln 1, Col 1</button>
                        <button class="vs-status-item" type="button" data-status="indent" title="Sélectionner la mise en retrait">Espaces : 4</button>
                        <button class="vs-status-item" type="button" data-status="encoding" title="Sélectionner l'encodage">UTF-8</button>
                        <button class="vs-status-item" type="button" data-status="eol" title="Sélectionner la séquence de fin de ligne">CRLF</button>
                        <button class="vs-status-item" type="button" data-status="language" title="Sélectionner le mode de langage">{ } HTML</button>
                        <span class="vs-status-item" data-status="image" hidden></span>
                        <button class="vs-status-item vs-status-like" type="button" data-status="like" title="J'aime ce portfolio">${raw(codicon('heart'))} <span></span></button>
                        <button class="vs-status-item" type="button" data-status="prettier" title="Prettier">${raw(codicon('check-all'))} Prettier</button>
                        <button class="vs-status-item" type="button" data-status="bell" title="Notifications">${raw(codicon('bell'))}</button>
                    </div>
                </footer>
                <div class="vs-notifications" aria-live="polite"></div>
            </div>`);

        this.statusbar = {
            set: (key, text) => {
                const item = this.root.querySelector(`[data-status="${key}"]`);
                if (!item) return;
                if (text == null) { item.hidden = true; return; }
                item.hidden = false;
                if (key === 'language') item.textContent = `{ } ${text}`;
                else item.textContent = text;
            },
            flash: (text) => {
                const item = this.root.querySelector('[data-status="flash"]');
                item.hidden = false;
                item.textContent = text;
                clearTimeout(this.flashTimer);
                this.flashTimer = setTimeout(() => { item.hidden = true; }, 2500);
            },
        };
    }

    /* ------------------------------------------------------------------ */
    /* Mise en page                                                         */
    /* ------------------------------------------------------------------ */
    applyLayout() {
        const { sidebar, sidebarWidth, panel, panelHeight } = this.layout;
        this.root.classList.toggle('is-sidebar-hidden', !sidebar);
        this.root.classList.toggle('is-panel-hidden', !panel);
        this.root.style.setProperty('--sidebar-width', `${sidebarWidth}px`);
        this.root.style.setProperty('--panel-height', `${panelHeight}px`);
        this.root.querySelector('[data-layout="sidebar"]').innerHTML = codicon(sidebar ? 'layout-sidebar-left' : 'layout-sidebar-left-off');
        this.root.querySelector('[data-layout="panel"]').innerHTML = codicon(panel ? 'layout-panel' : 'layout-panel-off');
        store.set('vs-sidebar', sidebar);
        store.set('vs-sidebar-width', sidebarWidth);
        store.set('vs-panel', panel);
        store.set('vs-panel-height', panelHeight);
        requestAnimationFrame(() => this.editor?.active?.code?.redraw());
    }

    toggleSidebar(force) {
        this.layout.sidebar = force ?? !this.layout.sidebar;
        this.applyLayout();
    }

    togglePanel(force) {
        this.layout.panel = force ?? !this.layout.panel;
        this.root.classList.remove('is-panel-maximized');
        this.applyLayout();
        if (this.layout.panel && this.panel?.current === 'terminal') requestAnimationFrame(() => this.panel.terminal.focus());
    }

    togglePanelMaximized() {
        this.root.classList.toggle('is-panel-maximized');
    }

    showView(id, { force = false, reveal = true } = {}) {
        if (!force && this.layout.view === id && this.layout.sidebar) {
            this.toggleSidebar(false);
            return;
        }
        this.layout.view = id;
        if (reveal && !this.layout.sidebar) this.toggleSidebar(true);
        this.root.querySelectorAll('.vs-activity[data-view]').forEach((button) => button.classList.toggle('is-active', button.dataset.view === id));
        this.sidebar.show(id);
    }

    /* ------------------------------------------------------------------ */
    /* Thèmes et paramètres                                                 */
    /* ------------------------------------------------------------------ */
    applyTheme(id) {
        this.root.dataset.vsTheme = id;
        this.root.dataset.vsThemeType = themeById(id).type;
        requestAnimationFrame(() => this.editor?.tabs.forEach((tab) => tab.code?.redraw()));
    }

    updateSetting(key, value) {
        this.settings[key] = value;
        store.set('vs-settings', this.settings);
        if (key === 'theme') this.applyTheme(value);
        this.root.classList.toggle('no-ligatures', !this.settings.ligatures);
        this.root.dataset.cursorBlinking = this.settings.cursorBlinking;
        this.editor.applySettings();
    }

    /* ------------------------------------------------------------------ */
    /* Évènements de l'éditeur                                              */
    /* ------------------------------------------------------------------ */
    onEditorChange(tab) {
        const file = tab?.path ? files.get(tab.path) : null;
        const title = tab ? `${tab.title} - PORTFOLIO-THOMAS - Visual Studio Code` : 'PORTFOLIO-THOMAS - Visual Studio Code';
        this.window?.setTitle(title);
        const isCode = tab?.kind === 'code';
        this.statusbar.set('cursor', isCode ? `Ln ${tab.code?.cursor.line ?? 1}, Col ${tab.code?.cursor.col ?? 1}` : null);
        this.statusbar.set('indent', isCode ? `Espaces : ${tab.code?.tabSize ?? 4}` : null);
        this.statusbar.set('encoding', isCode ? 'UTF-8' : null);
        this.statusbar.set('eol', isCode ? 'CRLF' : null);
        this.statusbar.set('language', file && file.language !== 'image' ? (languageNames[file.language] ?? file.language) : null);
        if (tab?.kind !== 'image') this.statusbar.set('image', null);
        this.sidebar.refreshExplorer();
        if (tab?.path) this.sidebar.select(tab.path);
    }

    /* ------------------------------------------------------------------ */
    /* Actions de haut niveau                                               */
    /* ------------------------------------------------------------------ */
    openFileByName(name, { preview = false } = {}) {
        const file = findFile(name);
        if (!file) return;
        if (preview && file.preview) this.editor.openPreview(file.path);
        else this.editor.openFile(file.path);
    }

    openProject(id) {
        const tab = this.editor.openPreview('src/projects.json', { options: { project: id } });
        if (tab) tab.options = { project: id };
        tab?.view?.revealProject?.(id);
    }

    openExternal(url) {
        if (url.startsWith(location.origin) || url.includes('github.io')) launch('edge', { url });
        else window.open(url, '_blank', 'noopener');
    }

    launchExplorer() {
        launch('explorer', { path: 'Documents\\Portfolio-VSCode' });
    }

    setProgress(active) {
        this.root.querySelector('.vs-progress').hidden = !active;
    }

    updateLikes() {
        const item = this.root.querySelector('[data-status="like"]');
        item.classList.toggle('is-liked', likes.liked);
        item.innerHTML = `${codicon(likes.liked ? 'heart-filled' : 'heart')} <span>${likes.count ?? ''}</span>`;
        item.title = likes.liked ? 'Merci pour le like !' : 'J\'aime ce portfolio';
    }

    async startDebugging() {
        if (this.debugging) return;
        this.debugging = true;
        this.root.classList.add('is-debugging');
        this.statusbar.set('debug', 'Portfolio (PORTFOLIO-THOMAS)');
        const toolbar = el(html`
            <div class="vs-debug-toolbar" role="toolbar" aria-label="Débogage">
                <span class="vs-debug-grip">${raw(codicon('gripper'))}</span>
                <button class="vs-icon-btn" type="button" title="Continuer (F5)" data-debug="continue">${raw(codicon('debug-continue'))}</button>
                <button class="vs-icon-btn" type="button" title="Pas à pas principal (F10)" data-debug="step">${raw(codicon('debug-step-over'))}</button>
                <button class="vs-icon-btn" type="button" title="Pas à pas détaillé (F11)" data-debug="step">${raw(codicon('debug-step-into'))}</button>
                <button class="vs-icon-btn" type="button" title="Pas à pas sortant (Maj+F11)" data-debug="step">${raw(codicon('debug-step-out'))}</button>
                <button class="vs-icon-btn" type="button" title="Redémarrer (Ctrl+Maj+F5)" data-debug="restart">${raw(codicon('debug-restart'))}</button>
                <button class="vs-icon-btn is-stop" type="button" title="Arrêter (Maj+F5)" data-debug="stop">${raw(codicon('debug-stop'))}</button>
            </div>`);
        this.root.querySelector('.vs-workarea').append(toolbar);
        toolbar.addEventListener('click', (event) => {
            const action = event.target.closest('[data-debug]')?.dataset.debug;
            if (action === 'stop') this.stopDebugging();
            if (action === 'restart') { this.stopDebugging(); this.startDebugging(); }
            if (action === 'step' || action === 'continue') this.panel.debug(`→ ${['Lecture de la documentation...', 'Café ☕ en cours de préparation...', 'Refactorisation mentale...', 'console.log("ça marche !")'][Math.floor(Math.random() * 4)]}`);
        });
        this.debugToolbar = toolbar;
        this.panel.show('debug');
        const lines = [
            ['<span class="t-gray">C:\\Program Files\\nodejs\\node.exe .\\src\\index.js</span>', 'log'],
            [`🧪 Chargement du profil : <b>${escapeHtml(profile.fullName)}</b>`, 'log'],
            [`✔ ${projects.length} projets chargés`, 'info'],
            ['✔ Compétences compilées sans erreur', 'info'],
            ['⚠ Avertissement : curiosité excessive détectée', 'warn'],
            ['✔ Portfolio prêt ! Tout fonctionne comme prévu 🎉', 'info'],
        ];
        for (const [line, type] of lines) {
            if (!this.debugging) return;
            await new Promise((resolve) => setTimeout(resolve, 450));
            this.panel.debug(line, type);
        }
    }

    stopDebugging() {
        this.debugging = false;
        this.root.classList.remove('is-debugging');
        this.statusbar.set('debug', null);
        this.debugToolbar?.remove();
        this.panel.debug('<span class="t-gray">Processus terminé avec le code 0.</span>');
    }

    /** Notification VS Code (en bas à droite de la fenêtre). */
    notify(type, message, actions = []) {
        const container = this.root.querySelector('.vs-notifications');
        const icon = { info: 'info', warning: 'warning', error: 'error' }[type] ?? 'info';
        const toast = el(html`
            <div class="vs-toast is-${type}" role="alert">
                <div class="vs-toast-main">
                    ${raw(codicon(icon, 'vs-toast-icon'))}
                    <p>${message}</p>
                    <button class="vs-icon-btn vs-toast-close" type="button" aria-label="Effacer la notification">${raw(codicon('close'))}</button>
                </div>
                ${actions.length ? raw(html`<div class="vs-toast-actions">${actions.map((action, i) => raw(html`<button class="vs-button ${action.secondary ? 'is-secondary' : ''}" type="button" data-index="${i}">${action.label}</button>`))}</div>`) : ''}
            </div>`);
        const close = () => {
            toast.classList.add('is-leaving');
            setTimeout(() => toast.remove(), 200);
        };
        toast.querySelector('.vs-toast-close').addEventListener('click', close);
        toast.querySelectorAll('[data-index]').forEach((button) => button.addEventListener('click', () => {
            actions[Number(button.dataset.index)].run?.();
            close();
        }));
        container.append(toast);
        setTimeout(close, actions.length ? 15000 : 6000);
        return close;
    }

    /* ------------------------------------------------------------------ */
    /* Quick input                                                          */
    /* ------------------------------------------------------------------ */
    quickOpen(prefix = '') {
        const fileItems = [...files.values()].map((file) => ({
            label: file.name,
            description: file.path.includes('/') ? file.path.split('/').slice(0, -1).join('/') : '',
            icon: fileIcon(file.name),
            run: () => this.editor.openFile(file.path),
        }));
        const commandItems = this.commands.list().map((command) => ({
            label: command.title,
            detail: command.en,
            keybinding: command.keybinding,
            group: command.group,
            run: () => this.commands.run(command.id),
        }));

        this.quickInput.show({
            value: prefix,
            placeholder: 'Rechercher des fichiers par nom (ajoutez : pour atteindre une ligne ou @ pour atteindre un symbole)',
            provider: (value) => {
                if (value.startsWith('>')) return { items: commandItems, filterText: value.slice(1) };
                if (value.startsWith(':')) {
                    const code = this.editor.active?.code;
                    const line = Number(value.slice(1));
                    if (!code) return { items: [], message: 'Ouvrez d\'abord un éditeur de texte pour atteindre une ligne.' };
                    return {
                        items: [{ label: line ? `Atteindre la ligne ${line}` : 'Tapez un numéro de ligne', run: () => line && code.revealLine(line, true) }],
                        filter: false,
                    };
                }
                if (value.startsWith('@')) {
                    const file = this.editor.active?.path ? files.get(this.editor.active.path) : null;
                    const symbols = file?.language === 'markdown' ? markdownOutline(file.content) : [];
                    return {
                        items: symbols.map((symbol) => ({ label: symbol.text, icon: codicon('symbol-string'), description: `ligne ${symbol.line}`, run: () => this.editor.active.code?.revealLine(symbol.line, true) })),
                        filterText: value.slice(1),
                        message: symbols.length ? '' : 'Aucun symbole pour l\'éditeur actif.',
                    };
                }
                if (value.startsWith('?')) {
                    return {
                        items: [
                            { label: '…', description: 'Accéder au fichier', run: () => this.quickOpen('') },
                            { label: '>', description: 'Afficher et exécuter les commandes', run: () => this.quickOpen('>') },
                            { label: ':', description: 'Atteindre la ligne', run: () => this.quickOpen(':') },
                            { label: '@', description: 'Atteindre le symbole dans l\'éditeur', run: () => this.quickOpen('@') },
                        ],
                        filter: false,
                    };
                }
                const recent = this.editor.tabs.filter((tab) => tab.path).map((tab) => tab.path);
                const items = value ? fileItems : [
                    ...fileItems.filter((item) => recent.includes(`${item.description ? `${item.description}/` : ''}${item.label}`)).map((item) => ({ ...item, group: 'récemment ouverts' })),
                    ...fileItems.filter((item) => !recent.includes(`${item.description ? `${item.description}/` : ''}${item.label}`)).map((item, i) => ({ ...item, group: i === 0 ? 'résultats des fichiers' : 'résultats des fichiers' })),
                ];
                return { items };
            },
        });
    }

    selectTheme() {
        const original = this.settings.theme;
        const items = themes.map((theme) => ({ label: theme.label, id: theme.id, group: theme.group }));
        this.quickInput.show({
            placeholder: 'Sélectionner le thème de couleur (↑↓ pour afficher un aperçu)',
            items,
            activeIndex: themes.findIndex((theme) => theme.id === original),
            onFocus: (item) => this.applyTheme(item.id),
            onAccept: (item) => this.updateSetting('theme', item.id),
            onHide: (accepted) => { if (!accepted) this.applyTheme(original); },
        });
    }

    /* ------------------------------------------------------------------ */
    /* Liaisons                                                             */
    /* ------------------------------------------------------------------ */
    bindActivityBar() {
        this.root.querySelector('.vs-activitybar').addEventListener('click', (event) => {
            const view = event.target.closest('[data-view]');
            if (view) this.showView(view.dataset.view);
            const activity = event.target.closest('[data-activity]');
            if (!activity) return;
            const rect = activity.getBoundingClientRect();
            if (activity.dataset.activity === 'accounts') {
                showContextMenu({
                    x: rect.right + 4, y: rect.top - 90, variant: 'vscode', anchor: activity,
                    items: [
                        { label: `${profile.handle} (GitHub)`, action: () => this.openExternal(profile.links.github) },
                        { label: `${profile.fullName} (LinkedIn)`, action: () => this.openExternal(profile.links.linkedin) },
                        { separator: true },
                        { label: 'Qui suis-je ?', action: () => this.openFileByName('about.md', { preview: true }) },
                    ],
                });
            } else {
                showContextMenu({
                    x: rect.right + 4, y: rect.top - 250, variant: 'vscode', anchor: activity,
                    items: [
                        { label: 'Palette de commandes...', shortcut: 'Ctrl+Maj+P', action: () => this.quickOpen('>') },
                        { label: 'Profils', disabled: true },
                        { separator: true },
                        { label: 'Paramètres', shortcut: 'Ctrl+,', action: () => this.editor.openSettings() },
                        { label: 'Extensions', shortcut: 'Ctrl+Maj+X', action: () => this.showView('extensions') },
                        { label: 'Raccourcis clavier', shortcut: 'Ctrl+K Ctrl+S', action: () => this.openFileByName('README.md', { preview: true }) },
                        { separator: true },
                        {
                            label: 'Thèmes', submenu: [
                                { label: 'Thème de couleur', shortcut: 'Ctrl+K Ctrl+T', action: () => this.selectTheme() },
                                { label: 'Thème d\'icône de fichier', disabled: true },
                            ],
                        },
                        { separator: true },
                        { label: 'Rechercher les mises à jour...', action: () => this.notify('info', 'Aucune mise à jour disponible : ce portfolio est à la pointe 🚀') },
                    ],
                });
            }
        });
    }

    bindMenubar() {
        const menubar = this.root.querySelector('.vs-menubar');
        let openMenu = null;
        const open = (button) => {
            const menu = MENUS.find((m) => m.id === button.dataset.menu);
            const rect = button.getBoundingClientRect();
            openMenu = button;
            menubar.querySelectorAll('.vs-menu-item').forEach((item) => item.classList.toggle('is-open', item === button));
            const ctx = showContextMenu({ x: rect.left, y: rect.bottom, variant: 'vscode', items: menu.items(this), anchor: button });
            const observer = new MutationObserver(() => {
                if (!ctx.menu.isConnected) {
                    observer.disconnect();
                    button.classList.remove('is-open');
                    if (openMenu === button) openMenu = null;
                }
            });
            observer.observe(document.body, { childList: true });
        };
        menubar.addEventListener('click', (event) => {
            const button = event.target.closest('.vs-menu-item');
            if (!button) return;
            if (button.classList.contains('vs-menu-overflow')) {
                const rect = button.getBoundingClientRect();
                const hidden = MENUS.filter((menu) => menubar.querySelector(`[data-menu="${menu.id}"]`).hidden);
                showContextMenu({ x: rect.left, y: rect.bottom, variant: 'vscode', anchor: button, items: hidden.map((menu) => ({ label: menu.label, submenu: menu.items(this) })) });
                return;
            }
            if (openMenu === button) closeContextMenu();
            else open(button);
        });
        menubar.addEventListener('pointerover', (event) => {
            const button = event.target.closest('.vs-menu-item');
            if (button && openMenu && openMenu !== button) open(button);
        });
        this.root.querySelector('.vs-hamburger').addEventListener('click', (event) => {
            const rect = event.currentTarget.getBoundingClientRect();
            showContextMenu({
                x: rect.left, y: rect.bottom, variant: 'vscode',
                items: MENUS.map((menu) => ({ label: menu.label, submenu: menu.items(this) })),
            });
        });

        this.root.addEventListener('click', (event) => {
            const command = event.target.closest('[data-command]');
            if (command && this.root.contains(command) && !command.closest('.vs-editor-view')) this.commands.run(command.dataset.command);
        });
    }

    /** Replie les menus qui chevauchent le centre de commandes dans un bouton « … » (comme VS Code). */
    fitMenubar() {
        const menubar = this.root.querySelector('.vs-menubar');
        const center = this.root.querySelector('.vs-titlebar-center');
        if (!menubar.offsetParent) return;
        const items = [...menubar.querySelectorAll('[data-menu]')];
        const overflow = menubar.querySelector('.vs-menu-overflow');
        items.forEach((item) => { item.hidden = false; });
        overflow.hidden = true;
        const limit = center.getBoundingClientRect().left - 8;
        if (items.at(-1).getBoundingClientRect().right <= limit) return;
        overflow.hidden = false;
        for (let i = items.length - 1; i >= 0; i--) {
            items[i].hidden = true;
            if (overflow.getBoundingClientRect().right <= limit) break;
        }
    }

    bindStatusbar() {
        this.root.querySelector('.vs-statusbar').addEventListener('click', (event) => {
            const item = event.target.closest('[data-status]')?.dataset.status;
            switch (item) {
                case 'cursor': this.quickOpen(':'); break;
                case 'like': likes.toggle(); break;
                case 'problems': this.panel.show('problems'); break;
                case 'branch': this.showView('scm', { force: true }); break;
                case 'sync': this.notify('info', 'Synchronisation avec origin/main... terminé ✔'); break;
                case 'remote': this.openExternal(profile.links.repo); break;
                case 'language': this.quickOpen('>'); break;
                case 'bell': this.notify('info', 'Aucune nouvelle notification'); break;
                case 'prettier': this.panel.show('output'); break;
                default: break;
            }
        });
    }

    bindSashes() {
        this.root.querySelectorAll('.vs-sash').forEach((sash) => {
            sash.addEventListener('pointerdown', (event) => {
                event.preventDefault();
                const type = sash.dataset.sash;
                const start = type === 'sidebar' ? this.layout.sidebarWidth : this.layout.panelHeight;
                const origin = type === 'sidebar' ? event.clientX : event.clientY;
                sash.classList.add('is-active');
                this.root.classList.add('is-resizing');
                const onMove = (move) => {
                    if (type === 'sidebar') {
                        const width = start + move.clientX - origin;
                        if (width < 120) { this.layout.sidebar = false; }
                        else { this.layout.sidebar = true; this.layout.sidebarWidth = clamp(width, 170, 600); }
                    } else {
                        this.layout.panelHeight = clamp(start - (move.clientY - origin), 100, this.root.clientHeight - 200);
                    }
                    this.applyLayout();
                };
                const onUp = () => {
                    sash.classList.remove('is-active');
                    this.root.classList.remove('is-resizing');
                    document.removeEventListener('pointermove', onMove);
                    document.removeEventListener('pointerup', onUp);
                };
                document.addEventListener('pointermove', onMove);
                document.addEventListener('pointerup', onUp);
            });
            sash.addEventListener('dblclick', () => {
                if (sash.dataset.sash === 'sidebar') this.layout.sidebarWidth = 250;
                else this.layout.panelHeight = 220;
                this.applyLayout();
            });
        });
    }

    bindKeyboard() {
        let chord = null;
        this.onKeyDown = (event) => {
            if (!this.window.isActive()) return;
            const target = event.target;
            if (target.closest?.('.window') && !this.root.contains(target)) return;
            const key = event.key.toLowerCase();
            const ctrl = event.ctrlKey || event.metaKey;

            if (chord) {
                const second = `${ctrl ? 'ctrl+' : ''}${key}`;
                const combo = `${chord} ${second}`;
                chord = null;
                this.statusbar.set('flash', null);
                const binding = this.commands.list().find((command) => command.chord === combo);
                if (binding) {
                    event.preventDefault();
                    this.commands.run(binding.id);
                }
                return;
            }
            if (ctrl && key === 'k' && !event.shiftKey) {
                event.preventDefault();
                chord = 'ctrl+k';
                this.statusbar.flash('(Ctrl+K) a été enfoncé. En attente d\'une seconde touche...');
                return;
            }

            const combo = [ctrl && 'ctrl', event.shiftKey && 'shift', event.altKey && 'alt', key].filter(Boolean).join('+');
            const command = this.commands.byKey(combo);
            if (!command) return;
            const inInput = target.matches?.('input, textarea') && !target.closest('.vs-quick-input');
            if (inInput && !ctrl && !event.altKey && !/^f\d+$/.test(key)) return;
            if (inInput && target.closest('.term') && ['ctrl+c', 'ctrl+l'].includes(combo)) return;
            event.preventDefault();
            event.stopPropagation();
            this.commands.run(command.id);
        };
        document.addEventListener('keydown', this.onKeyDown, true);
    }
}

/* ====================================================================== */
/* Commandes                                                               */
/* ====================================================================== */
function createCommands(wb) {
    const commands = [
        { id: 'workbench.action.showCommands', en: 'Show All Commands', title: 'Afficher toutes les commandes', key: 'ctrl+shift+p', alt: 'f1', run: () => wb.quickOpen('>') },
        { id: 'workbench.action.quickOpen', en: 'Go to File...', title: 'Atteindre le fichier...', key: 'ctrl+p', alt: 'ctrl+e', run: () => wb.quickOpen('') },
        { id: 'workbench.action.gotoLine', en: 'Go to Line/Column...', title: 'Atteindre la ligne/colonne...', key: 'ctrl+g', run: () => wb.quickOpen(':') },
        { id: 'workbench.action.gotoSymbol', title: 'Atteindre le symbole dans l\'éditeur...', key: 'ctrl+shift+o', run: () => wb.quickOpen('@') },
        { id: 'workbench.action.selectTheme', en: 'Preferences: Color Theme', title: 'Préférences : Thème de couleur', chord: 'ctrl+k ctrl+t', run: () => wb.selectTheme() },
        { id: 'workbench.action.openSettings', en: 'Preferences: Open Settings (UI)', title: 'Préférences : Ouvrir les paramètres (IU)', key: 'ctrl+,', run: () => wb.editor.openSettings() },
        { id: 'workbench.action.toggleSidebarVisibility', en: 'View: Toggle Primary Side Bar Visibility', title: 'Affichage : Afficher/masquer la barre latérale principale', key: 'ctrl+b', run: () => wb.toggleSidebar() },
        { id: 'workbench.action.togglePanel', en: 'View: Toggle Panel Visibility', title: 'Affichage : Afficher/masquer le panneau', key: 'ctrl+j', run: () => wb.togglePanel() },
        { id: 'workbench.action.terminal.toggleTerminal', en: 'View: Toggle Terminal', title: 'Afficher/masquer le terminal', key: 'ctrl+ù', alt: 'ctrl+`', run: () => (wb.layout.panel && wb.panel.current === 'terminal' ? wb.togglePanel(false) : wb.panel.show('terminal')) },
        { id: 'workbench.view.explorer', title: 'Affichage : Afficher l\'Explorateur', key: 'ctrl+shift+e', run: () => wb.showView('explorer', { force: true }) },
        { id: 'workbench.view.search', title: 'Affichage : Afficher la recherche', key: 'ctrl+shift+f', run: () => wb.sidebar.focusSearch(window.getSelection()?.toString()) },
        { id: 'workbench.view.scm', title: 'Affichage : Afficher le contrôle de code source', key: 'ctrl+shift+g', run: () => wb.showView('scm', { force: true }) },
        { id: 'workbench.view.debug', title: 'Affichage : Afficher Exécuter et déboguer', key: 'ctrl+shift+d', run: () => wb.showView('run', { force: true }) },
        { id: 'workbench.view.extensions', en: 'View: Show Extensions', title: 'Affichage : Afficher les extensions', key: 'ctrl+shift+x', run: () => wb.showView('extensions', { force: true }) },
        { id: 'workbench.action.debug.start', en: 'Debug: Start Debugging', title: 'Déboguer : Démarrer le débogage', key: 'f5', run: () => wb.startDebugging() },
        { id: 'workbench.action.debug.stop', title: 'Déboguer : Arrêter', key: 'shift+f5', run: () => wb.stopDebugging() },
        { id: 'markdown.showPreview', en: 'Markdown: Open Preview', title: 'Markdown : Ouvrir l\'aperçu', key: 'ctrl+shift+v', chord: 'ctrl+k v', run: () => wb.editor.togglePreview() },
        { id: 'workbench.action.closeActiveEditor', title: 'Afficher : Fermer l\'éditeur', key: 'alt+w', run: () => wb.editor.active && wb.editor.close(wb.editor.activeId) },
        { id: 'workbench.action.closeAllEditors', title: 'Afficher : Fermer tous les éditeurs', chord: 'ctrl+k w', run: () => wb.editor.closeAll() },
        { id: 'workbench.action.nextEditor', title: 'Afficher : Ouvrir l\'éditeur suivant', key: 'ctrl+alt+pagedown', run: () => wb.editor.cycle(1) },
        { id: 'workbench.action.previousEditor', title: 'Afficher : Ouvrir l\'éditeur précédent', key: 'ctrl+alt+pageup', run: () => wb.editor.cycle(-1) },
        { id: 'workbench.action.showAllEditors', title: 'Afficher : Afficher tous les éditeurs par apparence', run: () => wb.quickOpen('') },
        { id: 'editor.action.toggleWordWrap', en: 'View: Toggle Word Wrap', title: 'Affichage : Activer/désactiver le retour automatique à la ligne', key: 'alt+z', run: () => wb.updateSetting('wordWrap', wb.settings.wordWrap === 'on' ? 'off' : 'on') },
        { id: 'editor.action.toggleMinimap', en: 'View: Toggle Minimap', title: 'Affichage : Activer/désactiver la minimap', run: () => wb.updateSetting('minimap', !wb.settings.minimap) },
        { id: 'editor.action.fontZoomIn', title: 'Affichage : Zoom avant de la police de l\'éditeur', key: 'ctrl+=', alt: 'ctrl++', run: () => wb.updateSetting('fontSize', Math.min(30, wb.settings.fontSize + 1)) },
        { id: 'editor.action.fontZoomOut', title: 'Affichage : Zoom arrière de la police de l\'éditeur', key: 'ctrl+-', run: () => wb.updateSetting('fontSize', Math.max(10, wb.settings.fontSize - 1)) },
        { id: 'editor.action.fontZoomReset', title: 'Affichage : Réinitialiser le zoom de la police', key: 'ctrl+0', run: () => wb.updateSetting('fontSize', 14) },
        { id: 'editor.foldAll', title: 'Replier tout', chord: 'ctrl+k ctrl+0', run: () => wb.editor.active?.code?.foldAll() },
        { id: 'editor.unfoldAll', title: 'Déplier tout', chord: 'ctrl+k ctrl+j', run: () => wb.editor.active?.code?.unfoldAll() },
        { id: 'workbench.action.openWelcome', title: 'Aide : Bienvenue', run: () => wb.editor.openWelcome() },
        { id: 'workbench.action.files.save', title: 'Fichier : Enregistrer', key: 'ctrl+s', run: () => wb.statusbar.flash('Rien à enregistrer : l\'espace de travail est en lecture seule ✔') },
        { id: 'workbench.action.files.newUntitledFile', title: 'Fichier : Nouveau fichier texte', run: () => launch('notepad', { name: 'Sans titre.txt', content: '' }) },
        { id: 'workbench.action.reloadWindow', en: 'Developer: Reload Window', title: 'Développeur : Recharger la fenêtre', key: 'ctrl+r', run: () => { wb.window.close(); setTimeout(() => launch('vscode'), 250); } },
        { id: 'workbench.action.closeWindow', title: 'Fermer la fenêtre', key: 'alt+f4', run: () => wb.window.close() },
        { id: 'workbench.action.toggleMaximizedPanel', title: 'Affichage : Agrandir la taille du panneau', run: () => wb.togglePanelMaximized() },
        { id: 'workbench.action.navigateBack', title: 'Atteindre : Retour', key: 'alt+arrowleft', run: () => wb.editor.cycle(-1) },
        { id: 'workbench.action.navigateForward', title: 'Atteindre : Suivant', key: 'alt+arrowright', run: () => wb.editor.cycle(1) },
        { id: 'portfolio.about', title: 'Portfolio : Qui suis-je ?', run: () => wb.openFileByName('about.md', { preview: true }) },
        { id: 'portfolio.projects', title: 'Portfolio : Voir mes projets', run: () => wb.openFileByName('projects.json', { preview: true }) },
        { id: 'portfolio.skills', title: 'Portfolio : Mes compétences', run: () => wb.openFileByName('skills.ts', { preview: true }) },
        { id: 'portfolio.contact', title: 'Portfolio : Me contacter', run: () => wb.openFileByName('contact.html', { preview: true }) },
        { id: 'portfolio.like', title: 'Portfolio : J\'aime ce portfolio ❤', run: () => likes.toggle() },
        { id: 'portfolio.github', title: 'Portfolio : Ouvrir mon GitHub', run: () => wb.openExternal(profile.links.github) },
        { id: 'portfolio.linkedin', title: 'Portfolio : Ouvrir mon LinkedIn', run: () => wb.openExternal(profile.links.linkedin) },
        { id: 'portfolio.chat', title: 'Chat : Ouvrir la conversation', key: 'ctrl+alt+i', run: () => wb.notify('info', 'Pas d\'IA ici : tout ce portfolio est fait main. Mais vous pouvez m\'écrire directement !', [{ label: 'Me contacter', run: () => wb.openFileByName('contact.html', { preview: true }) }]) },
        { id: 'portfolio.windowsTerminal', title: 'Terminal : Ouvrir dans Windows Terminal', run: () => launch('terminal') },
    ];

    const formatKey = (key) => key.split('+').map((part) => ({ ctrl: 'Ctrl', shift: 'Maj', alt: 'Alt', arrowleft: '←', arrowright: '→', pagedown: 'PgDn', pageup: 'PgUp' }[part] ?? part.toUpperCase())).join('+');

    return {
        list: () => commands.map((command) => ({
            ...command,
            keybinding: command.key ? formatKey(command.key) : command.chord ? command.chord.split(' ').map(formatKey).join(' ') : '',
            group: 'autres commandes',
        })),
        byKey: (key) => commands.find((command) => command.key === key || command.alt === key),
        run(id) {
            const command = commands.find((c) => c.id === id);
            if (command) command.run();
        },
    };
}

/* ====================================================================== */
/* Menus de la barre de titre                                              */
/* ====================================================================== */
const MENUS = [
    {
        id: 'file', label: 'Fichier', items: (wb) => [
            { label: 'Nouveau fichier texte', action: () => wb.commands.run('workbench.action.files.newUntitledFile') },
            { label: 'Nouvelle fenêtre', shortcut: 'Ctrl+Maj+N', disabled: true },
            { separator: true },
            { label: 'Ouvrir le fichier...', shortcut: 'Ctrl+P', action: () => wb.quickOpen('') },
            { label: 'Ouvrir le dossier dans l\'Explorateur', action: () => wb.launchExplorer() },
            {
                label: 'Ouvrir les éléments récents', submenu: ['src/about.md', 'src/projects.json', 'src/skills.ts', 'README.md'].map((path) => ({ label: path, action: () => wb.editor.openFile(path) })),
            },
            { separator: true },
            { label: 'Enregistrer', shortcut: 'Ctrl+S', action: () => wb.commands.run('workbench.action.files.save') },
            { label: 'Enregistrement automatique', checked: true },
            { separator: true },
            { label: 'Préférences', submenu: [
                { label: 'Paramètres', shortcut: 'Ctrl+,', action: () => wb.editor.openSettings() },
                { label: 'Thème de couleur', shortcut: 'Ctrl+K Ctrl+T', action: () => wb.selectTheme() },
            ] },
            { separator: true },
            { label: 'Fermer l\'éditeur', shortcut: 'Alt+W', action: () => wb.commands.run('workbench.action.closeActiveEditor') },
            { label: 'Fermer la fenêtre', shortcut: 'Alt+F4', action: () => wb.window.close() },
            { separator: true },
            { label: 'Quitter', action: () => wb.window.close() },
        ],
    },
    {
        id: 'edit', label: 'Edition', items: (wb) => [
            { label: 'Annuler', shortcut: 'Ctrl+Z', disabled: true },
            { label: 'Rétablir', shortcut: 'Ctrl+Y', disabled: true },
            { separator: true },
            { label: 'Couper', shortcut: 'Ctrl+X', disabled: true },
            { label: 'Copier', shortcut: 'Ctrl+C', action: () => navigator.clipboard?.writeText(window.getSelection()?.toString() ?? '') },
            { label: 'Coller', shortcut: 'Ctrl+V', disabled: true },
            { separator: true },
            { label: 'Rechercher dans les fichiers', shortcut: 'Ctrl+Maj+F', action: () => wb.commands.run('workbench.view.search') },
        ],
    },
    {
        id: 'selection', label: 'Sélection', items: (wb) => [
            { label: 'Sélectionner tout', shortcut: 'Ctrl+A', action: () => wb.editor.active?.code?.focus() },
            { separator: true },
            { label: 'Aller à la ligne...', shortcut: 'Ctrl+G', action: () => wb.quickOpen(':') },
        ],
    },
    {
        id: 'view', label: 'Affichage', items: (wb) => [
            { label: 'Palette de commandes...', shortcut: 'Ctrl+Maj+P', action: () => wb.quickOpen('>') },
            { label: 'Ouvrir la vue...', action: () => wb.quickOpen('>Affichage') },
            { separator: true },
            { label: 'Apparence', submenu: [
                { label: 'Barre latérale principale', checked: wb.layout.sidebar, shortcut: 'Ctrl+B', action: () => wb.toggleSidebar() },
                { label: 'Panneau', checked: wb.layout.panel, shortcut: 'Ctrl+J', action: () => wb.togglePanel() },
                { separator: true },
                { label: 'Minimap', checked: wb.settings.minimap, action: () => wb.commands.run('editor.action.toggleMinimap') },
                { separator: true },
                { label: 'Zoom avant', shortcut: 'Ctrl+=', action: () => wb.commands.run('editor.action.fontZoomIn') },
                { label: 'Zoom arrière', shortcut: 'Ctrl+-', action: () => wb.commands.run('editor.action.fontZoomOut') },
                { label: 'Réinitialiser le zoom', shortcut: 'Ctrl+0', action: () => wb.commands.run('editor.action.fontZoomReset') },
            ] },
            { separator: true },
            { label: 'Explorateur', shortcut: 'Ctrl+Maj+E', action: () => wb.commands.run('workbench.view.explorer') },
            { label: 'Rechercher', shortcut: 'Ctrl+Maj+F', action: () => wb.commands.run('workbench.view.search') },
            { label: 'Contrôle de code source', shortcut: 'Ctrl+Maj+G', action: () => wb.commands.run('workbench.view.scm') },
            { label: 'Exécuter', shortcut: 'Ctrl+Maj+D', action: () => wb.commands.run('workbench.view.debug') },
            { label: 'Extensions', shortcut: 'Ctrl+Maj+X', action: () => wb.commands.run('workbench.view.extensions') },
            { separator: true },
            { label: 'Problèmes', shortcut: 'Ctrl+Maj+M', action: () => wb.panel.show('problems') },
            { label: 'Sortie', shortcut: 'Ctrl+Maj+U', action: () => wb.panel.show('output') },
            { label: 'Console de débogage', shortcut: 'Ctrl+Maj+Y', action: () => wb.panel.show('debug') },
            { label: 'Terminal', shortcut: 'Ctrl+ù', action: () => wb.panel.show('terminal') },
            { separator: true },
            { label: 'Retour automatique à la ligne', shortcut: 'Alt+Z', checked: wb.settings.wordWrap === 'on', action: () => wb.commands.run('editor.action.toggleWordWrap') },
        ],
    },
    {
        id: 'go', label: 'Atteindre', items: (wb) => [
            { label: 'Retour', shortcut: 'Alt+←', action: () => wb.editor.cycle(-1) },
            { label: 'Suivant', shortcut: 'Alt+→', action: () => wb.editor.cycle(1) },
            { separator: true },
            { label: 'Accéder au fichier...', shortcut: 'Ctrl+P', action: () => wb.quickOpen('') },
            { label: 'Atteindre le symbole dans l\'éditeur...', shortcut: 'Ctrl+Maj+O', action: () => wb.quickOpen('@') },
            { label: 'Atteindre la ligne/colonne...', shortcut: 'Ctrl+G', action: () => wb.quickOpen(':') },
        ],
    },
    {
        id: 'run', label: 'Exécuter', items: (wb) => [
            { label: 'Démarrer le débogage', shortcut: 'F5', action: () => wb.startDebugging() },
            { label: 'Exécuter sans débogage', shortcut: 'Ctrl+F5', action: () => wb.panel.run('npm run dev') },
            { label: 'Arrêter le débogage', shortcut: 'Maj+F5', disabled: !wb.debugging, action: () => wb.stopDebugging() },
            { separator: true },
            { label: 'Ouvrir les configurations', action: () => wb.editor.openFile('package.json') },
        ],
    },
    {
        id: 'terminal', label: 'Terminal', items: (wb) => [
            { label: 'Nouveau terminal', shortcut: 'Ctrl+Maj+ù', action: () => { wb.panel.createTerminal(); wb.panel.show('terminal'); } },
            { label: 'Ouvrir dans Windows Terminal', action: () => launch('terminal') },
            { separator: true },
            { label: 'Exécuter la tâche...', action: () => wb.panel.run('npm run dev') },
            { label: 'Exécuter neofetch', action: () => wb.panel.run('neofetch') },
        ],
    },
    {
        id: 'help', label: 'Aide', items: (wb) => [
            { label: 'Bienvenue', action: () => wb.editor.openWelcome() },
            { label: 'Afficher toutes les commandes', shortcut: 'Ctrl+Maj+P', action: () => wb.quickOpen('>') },
            { label: 'Référence des raccourcis clavier', shortcut: 'Ctrl+K Ctrl+R', action: () => wb.openFileByName('README.md', { preview: true }) },
            { separator: true },
            { label: 'Voir le code source sur GitHub', action: () => wb.openExternal(profile.links.repo) },
            { label: 'Signaler un problème', action: () => wb.openExternal(`${profile.links.repo}/issues`) },
            { separator: true },
            {
                label: 'À propos', action: () => wb.notify('info', `Visual Studio Code — Édition portfolio 2.0.0 · Conçu par ${profile.fullName} en HTML, CSS et JavaScript vanilla. Navigateur : ${navigator.userAgent.match(/(Firefox|Edg|Chrome|Safari)\/[\d.]+/)?.[0] ?? 'inconnu'}.`, [
                    { label: 'Copier', run: () => navigator.clipboard?.writeText('Portfolio VS Code 2.0.0'), secondary: true },
                    { label: 'OK', run: () => {} },
                ]),
            },
        ],
    },
];

export function open(args = {}) {
    const workbench = new Workbench(args);
    return workbench.window;
}

export { Workbench };
