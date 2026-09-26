/**
 * Panneau inférieur : Problèmes, Sortie, Console de débogage, Terminal (PowerShell simulé), Ports.
 */
import { el, html, raw, escapeHtml } from '../../core/dom.js';
import { codicon } from '../../core/icons.js';
import { Shell, createTerminalView } from '../shell.js';
import { findByPath } from '../../data/filesystem.js';

const TABS = [
    ['problems', 'Problèmes'],
    ['output', 'Sortie'],
    ['debug', 'Console de débogage'],
    ['terminal', 'Terminal'],
    ['ports', 'Ports'],
];

export class Panel {
    constructor(wb, root) {
        this.wb = wb;
        this.root = root;
        this.current = 'terminal';
        root.innerHTML = html`
            <div class="vs-panel-header">
                <div class="vs-panel-tabs" role="tablist">
                    ${TABS.map(([id, label]) => raw(html`<button class="vs-panel-tab" type="button" role="tab" data-panel="${id}">${label}${id === 'problems' ? raw(' <span class="vs-badge is-muted">0</span>') : ''}</button>`))}
                </div>
                <div class="vs-panel-actions">
                    <span class="vs-terminal-name">${raw(codicon('terminal-powershell'))} pwsh</span>
                    <button class="vs-icon-btn" type="button" data-panel-action="new" title="Nouveau terminal (Ctrl+Maj+ù)">${raw(codicon('add'))}</button>
                    <button class="vs-icon-btn" type="button" data-panel-action="clear" title="Effacer le terminal">${raw(codicon('trash'))}</button>
                    <button class="vs-icon-btn" type="button" data-panel-action="maximize" title="Agrandir la taille du panneau">${raw(codicon('chevron-up'))}</button>
                    <button class="vs-icon-btn" type="button" data-panel-action="close" title="Masquer le panneau (Ctrl+J)">${raw(codicon('close'))}</button>
                </div>
            </div>
            <div class="vs-panel-body">
                <div class="vs-panel-view" data-view="problems"><p class="vs-panel-message">Aucun problème n'a été détecté dans l'espace de travail.</p></div>
                <div class="vs-panel-view vs-output" data-view="output"></div>
                <div class="vs-panel-view vs-debug-console" data-view="debug"><p class="vs-panel-message">Démarrez une session de débogage (F5) pour voir des messages ici.</p></div>
                <div class="vs-panel-view" data-view="terminal"></div>
                <div class="vs-panel-view" data-view="ports">
                    <table class="vs-ports"><thead><tr><th>Port</th><th>Adresse transférée</th><th>Processus en cours</th><th>Origine</th></tr></thead>
                    <tbody><tr><td>${raw(codicon('radio-tower'))} 3000</td><td>localhost:3000</td><td>npx serve .</td><td>Détecté automatiquement</td></tr></tbody></table>
                </div>
            </div>`;

        this.output = root.querySelector('.vs-output');
        this.debugConsole = root.querySelector('.vs-debug-console');
        this.log('info', 'Démarrage de l\'extension hôte...');
        this.log('info', `Espace de travail « PORTFOLIO-THOMAS » chargé en ${Math.round(performance.now())} ms.`);
        this.log('info', 'Thème d\'icônes de fichiers : Material Icon Theme');

        this.createTerminal();

        root.addEventListener('click', (event) => {
            const tab = event.target.closest('[data-panel]');
            if (tab) this.show(tab.dataset.panel);
            const action = event.target.closest('[data-panel-action]')?.dataset.panelAction;
            if (action === 'close') wb.togglePanel(false);
            if (action === 'maximize') wb.togglePanelMaximized();
            if (action === 'clear') this.terminal.element.querySelector('.term-output').innerHTML = '';
            if (action === 'new') {
                this.createTerminal();
                this.show('terminal');
            }
        });
    }

    createTerminal() {
        const container = this.root.querySelector('[data-view="terminal"]');
        const shell = new Shell({
            cwd: findByPath('Documents\\Portfolio-VSCode') ?? undefined,
            onExit: () => this.wb.togglePanel(false),
        });
        this.terminal = createTerminalView({
            shell,
            className: 'vs-terminal',
            decorations: true,
            banner: [
                'PowerShell 7.4.5',
                `Tapez <span class="t-yellow">help</span> pour voir les commandes disponibles. Essayez <span class="t-yellow">neofetch</span> 😉`,
                '',
            ],
        });
        container.replaceChildren(this.terminal.element);
    }

    show(id) {
        this.current = id;
        this.root.querySelectorAll('[data-panel]').forEach((tab) => tab.classList.toggle('is-active', tab.dataset.panel === id));
        this.root.querySelectorAll('.vs-panel-view').forEach((view) => { view.hidden = view.dataset.view !== id; });
        this.root.querySelector('.vs-terminal-name').hidden = id !== 'terminal';
        this.root.querySelectorAll('[data-panel-action="new"], [data-panel-action="clear"]').forEach((button) => { button.hidden = id !== 'terminal'; });
        this.wb.togglePanel(true);
        if (id === 'terminal') requestAnimationFrame(() => this.terminal.focus());
    }

    async run(command) {
        this.show('terminal');
        await this.terminal.run(command);
    }

    log(level, message) {
        const time = new Date().toISOString().replace('T', ' ').slice(0, 23);
        this.output.append(el(`<div class="vs-output-line"><span class="vs-output-time">${time}</span> [${level}] ${escapeHtml(message)}</div>`));
    }

    debug(message, type = 'log') {
        this.debugConsole.querySelector('.vs-panel-message')?.remove();
        this.debugConsole.append(el(`<div class="vs-debug-line is-${type}">${message}</div>`));
        this.debugConsole.scrollTop = this.debugConsole.scrollHeight;
    }
}
