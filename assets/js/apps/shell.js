/**
 * PowerShell simulé, partagé entre l'application Terminal et le terminal intégré de VS Code.
 * Navigue dans le système de fichiers virtuel et sait ouvrir les applications du portfolio.
 */
import { el, escapeHtml as esc } from '../core/dom.js';
import { filesystem, resolvePath } from '../data/filesystem.js';
import { files as workspaceFiles } from '../data/workspace.js';
import { profile } from '../data/profile.js';
import { projects, games } from '../data/projects.js';
import { skillGroups, technologies } from '../data/skills.js';
import { launch, openFsItem, apps } from '../os/apps.js';
import { system } from '../os/system.js';
import { getCommits } from '../services/github.js';

const startTime = Date.now();

const c = (color, text) => `<span class="t-${color}">${esc(text)}</span>`;
const pad = (text, size) => String(text).padEnd(size);

const COMMANDS = {
    help: 'Affiche cette aide',
    about: 'Qui suis-je ?',
    neofetch: 'Informations système (façon winfetch)',
    skills: 'Mes compétences',
    projects: 'Mes projets',
    contact: 'Me contacter',
    social: 'Mes réseaux',
    ls: 'Liste le contenu du dossier (alias : dir, Get-ChildItem)',
    cd: 'Change de dossier',
    pwd: 'Affiche le dossier courant',
    cat: 'Affiche le contenu d\'un fichier (alias : type, Get-Content)',
    start: 'Ouvre un fichier, une application ou une URL (alias : open)',
    code: 'Ouvre VS Code (code . ou code <fichier>)',
    games: 'Liste les jeux du bureau',
    play: 'Lance un jeu (play snake)',
    theme: 'Change le mode Windows (theme dark | light)',
    wallpaper: 'Passe au fond d\'écran suivant',
    git: 'git log / git status',
    npm: 'npm run dev',
    date: 'Affiche la date (alias : Get-Date)',
    echo: 'Affiche un texte',
    history: 'Historique des commandes',
    whoami: 'Utilisateur courant',
    clear: 'Efface le terminal (alias : cls)',
    exit: 'Ferme le terminal',
};

const ALIASES = {
    dir: 'ls', 'get-childitem': 'ls', gci: 'ls', ll: 'ls',
    type: 'cat', 'get-content': 'cat', gc: 'cat',
    cls: 'clear', 'clear-host': 'clear',
    open: 'start', 'invoke-item': 'start', ii: 'start', explorer: 'start',
    'get-date': 'date', 'set-location': 'cd', sl: 'cd', 'get-location': 'pwd',
    winfetch: 'neofetch', fastfetch: 'neofetch',
    'write-output': 'echo', 'write-host': 'echo',
    bonjour: 'hello', hi: 'hello', salut: 'hello',
};

function windowsLogo() {
    const b = '<span class="t-logo-b">████████</span>';
    const g = '<span class="t-logo-g">████████</span>';
    const y = '<span class="t-logo-y">████████</span>';
    const r = '<span class="t-logo-r">████████</span>';
    const row = (a, bb) => `${a} ${bb}`;
    return [row(r, g), row(r, g), row(r, g), '', row(b, y), row(b, y), row(b, y)];
}

export class Shell {
    constructor({ cwd = filesystem, onExit, onClear } = {}) {
        this.cwd = cwd;
        this.history = [];
        this.onExit = onExit;
        this.onClear = onClear;
    }

    get prompt() {
        return `PS ${this.cwd.path}> `;
    }

    complete(input) {
        const parts = input.split(' ');
        const last = parts.pop();
        const candidates = parts.length === 0
            ? [...Object.keys(COMMANDS), ...Object.keys(ALIASES)]
            : (this.cwd.children ?? []).map((child) => (child.name.includes(' ') ? `'${child.name}'` : child.name));
        const matches = candidates.filter((name) => name.toLowerCase().startsWith(last.toLowerCase().replace(/^'/, '')) || name.toLowerCase().startsWith(last.toLowerCase()));
        if (matches.length === 1) return [...parts, matches[0]].join(' ') + (parts.length === 0 ? ' ' : '');
        return { input, matches };
    }

    /** Exécute une ligne ; retourne un tableau de lignes HTML (ou une promesse). */
    async run(raw) {
        const line = raw.trim();
        if (!line) return [];
        this.history.push(line);
        const [first, ...rest] = line.match(/'[^']*'|"[^"]*"|\S+/g) ?? [];
        const args = rest.map((arg) => arg.replace(/^['"]|['"]$/g, ''));
        const name = ALIASES[first.toLowerCase()] ?? first.toLowerCase();
        const handler = this[`cmd_${name.replace(/-/g, '_')}`];
        if (!handler) {
            return [
                `<span class="t-red">${esc(first)} : Le terme «${esc(first)}» n'est pas reconnu comme nom d'applet de commande, fonction, fichier de script ou programme exécutable.</span>`,
                `<span class="t-red">Vérifiez l'orthographe du nom, ou tapez ${c('yellow', 'help')}<span class="t-red"> pour la liste des commandes.</span></span>`,
            ];
        }
        return handler.call(this, args, line);
    }

    cmd_help() {
        return [
            c('cyan', 'Commandes disponibles :'),
            '',
            ...Object.entries(COMMANDS).map(([name, description]) => `  ${c('yellow', pad(name, 12))}${esc(description)}`),
            '',
            `Astuce : ${c('green', 'Tab')} pour compléter, ${c('green', '↑/↓')} pour l'historique.`,
        ];
    }

    cmd_hello() {
        return [`Bonjour ! 👋 Je suis ${esc(profile.firstName)}. Tapez ${c('yellow', 'help')} pour découvrir ce que je sais faire.`];
    }

    cmd_about() {
        return [
            c('cyan', `${profile.fullName} — ${profile.title}`),
            '',
            ...profile.about.map((paragraph) => esc(paragraph)),
            '',
            `Tapez ${c('yellow', 'skills')}, ${c('yellow', 'projects')} ou ${c('yellow', 'contact')} pour en savoir plus.`,
        ];
    }

    cmd_neofetch() {
        const uptime = Math.round((Date.now() - startTime) / 60000);
        const info = [
            `${c('cyan', profile.username.toLowerCase())}@${c('cyan', 'PORTFOLIO')}`,
            '-----------------',
            `${c('cyan', 'OS')}: Windows 11 Portfolio Edition`,
            `${c('cyan', 'Hôte')}: ${esc(navigator.userAgent.match(/(Firefox|Edg|Chrome|Safari)\/[\d.]+/)?.[0]?.replace('Edg', 'Edge') ?? 'Navigateur web')}`,
            `${c('cyan', 'Uptime')}: ${uptime} min`,
            `${c('cyan', 'Shell')}: PowerShell 7.4 (simulé)`,
            `${c('cyan', 'Résolution')}: ${window.innerWidth}x${window.innerHeight}`,
            `${c('cyan', 'Thème')}: ${system.mode === 'dark' ? 'Sombre' : 'Clair'}`,
            `${c('cyan', 'Formation')}: ${esc(profile.degree)} + Ri7`,
            `${c('cyan', 'Expérience')}: ${esc(profile.experience)}`,
            `${c('cyan', 'Langages')}: ${esc(skillGroups[0].items.map((id) => technologies[id].name).join(', '))}`,
            '',
            ['r', 'g', 'y', 'b', 'm', 'c'].map((color) => `<span class="t-bg-${color}">   </span>`).join(''),
        ];
        const logo = windowsLogo();
        return info.map((line, i) => `${logo[i] || ' '.repeat(17)}   ${line}`);
    }

    cmd_skills() {
        return [
            c('cyan', 'Mes compétences'),
            '',
            ...skillGroups.map((group) => `  ${c('yellow', pad(group.label, 28))}${esc(group.items.map((id) => technologies[id].name).join(', '))}`),
        ];
    }

    cmd_projects() {
        return [
            c('cyan', 'Mes projets'),
            '',
            ...projects.flatMap((project) => [
                `  ${c('green', '●')} ${c('yellow', project.name)} — ${esc(project.title)}`,
                `    ${c('gray', `${project.context} · ${project.stack.map((id) => technologies[id].name).join(' · ')}`)}${project.repo ? `  <a class="t-link" data-href="${esc(project.repo)}">${esc(project.repo)}</a>` : ''}`,
            ]),
            '',
            `Astuce : ${c('yellow', 'cd Projets')} puis ${c('yellow', 'ls')} pour explorer les dossiers.`,
        ];
    }

    cmd_contact() {
        launch('vscode', { open: 'src/contact.html', preview: true });
        return [`Ouverture du formulaire de contact dans VS Code... ${c('green', '✓')}`];
    }

    cmd_social() {
        return [
            `  ${c('yellow', pad('GitHub', 10))}<a class="t-link" data-href="${profile.links.github}">${profile.links.github}</a>`,
            `  ${c('yellow', pad('LinkedIn', 10))}<a class="t-link" data-href="${profile.links.linkedin}">${profile.links.linkedin}</a>`,
        ];
    }

    cmd_ls(args) {
        const target = args[0] ? resolvePath(this.cwd, args[0]) : this.cwd;
        if (!target) return [`<span class="t-red">Get-ChildItem : Impossible de trouver le chemin « ${esc(args[0])} », car il n'existe pas.</span>`];
        if (!target.children) return [esc(target.name)];
        const date = new Date().toLocaleDateString('fr-FR');
        const lines = [
            '',
            `    Répertoire : ${esc(target.path)}`,
            '',
            `${c('green', 'Mode                 LastWriteTime         Length Name')}`,
            `${c('green', '----                 -------------         ------ ----')}`,
        ];
        target.children.forEach((child) => {
            const isDir = child.type === 'folder';
            const size = isDir ? '' : String(child.content?.length ?? 1024 + child.name.length * 97);
            lines.push(`${isDir ? 'd-----' : '-a----'}        ${date}     14:02 ${size.padStart(14)} ${isDir ? c('blue', child.name) : esc(child.name)}`);
        });
        if (!target.children.length) lines.push('', '    (dossier vide)');
        lines.push('');
        return lines;
    }

    cmd_cd(args) {
        if (!args[0]) return [esc(this.cwd.path)];
        const target = resolvePath(this.cwd, args.join(' '));
        if (!target) return [`<span class="t-red">Set-Location : Impossible de trouver le chemin d'accès « ${esc(args.join(' '))} », car il n'existe pas.</span>`];
        if (target.type !== 'folder') return [`<span class="t-red">Set-Location : « ${esc(target.name)} » n'est pas un dossier.</span>`];
        this.cwd = target;
        return [];
    }

    cmd_pwd() {
        return ['', 'Path', '----', esc(this.cwd.path), ''];
    }

    cmd_cat(args) {
        const target = resolvePath(this.cwd, args.join(' '));
        if (!target) return [`<span class="t-red">Get-Content : Impossible de trouver le chemin d'accès « ${esc(args.join(' '))} », car il n'existe pas.</span>`];
        if (target.type === 'folder') return [`<span class="t-red">Get-Content : « ${esc(target.name)} » est un dossier.</span>`];
        if (target.type === 'text') return target.content.split(/\r?\n/).map(esc);
        if (target.type === 'code') return workspaceFiles.get(target.path).content.split('\n').map(esc);
        if (target.type === 'link') return ['[InternetShortcut]', `URL=${esc(target.url)}`];
        return [c('gray', `(fichier binaire : ${target.name})`)];
    }

    cmd_start(args) {
        if (!args[0]) {
            launch('explorer', { path: this.cwd.path });
            return [];
        }
        const arg = args.join(' ');
        if (/^https?:\/\//.test(arg)) {
            launch('edge', { url: arg });
            return [];
        }
        const target = resolvePath(this.cwd, arg);
        if (target?.type === 'folder') {
            launch('explorer', { path: target.path });
            return [];
        }
        if (target) {
            openFsItem(target);
            return [];
        }
        const appId = Object.keys(apps).find((id) => id === arg.toLowerCase() || apps[id].name.toLowerCase() === arg.toLowerCase());
        if (appId) {
            launch(appId);
            return [];
        }
        return [`<span class="t-red">Start-Process : Impossible de trouver « ${esc(arg)} ».</span>`];
    }

    cmd_code(args) {
        const arg = args[0];
        if (!arg || arg === '.') launch('vscode');
        else {
            const file = [...workspaceFiles.values()].find((f) => f.name.toLowerCase() === arg.toLowerCase() || f.path.toLowerCase() === arg.toLowerCase());
            if (!file) return [`<span class="t-red">Fichier introuvable : ${esc(arg)}</span>`];
            launch('vscode', { open: file.path });
        }
        return [];
    }

    cmd_games() {
        return games.map((game) => `  ${c('yellow', pad(game.id, 14))}${esc(game.name)}`).concat('', `Lancez un jeu avec ${c('yellow', 'play <nom>')}.`);
    }

    cmd_play(args) {
        const game = games.find((g) => g.id === args[0]?.toLowerCase() || g.name.toLowerCase() === args.join(' ').toLowerCase());
        if (!game) return this.cmd_games();
        launch(game.id);
        return [`Lancement de ${esc(game.name)}... 🎮`];
    }

    cmd_theme(args) {
        const mode = args[0]?.toLowerCase();
        if (!['dark', 'light', 'sombre', 'clair'].includes(mode)) return [`Usage : ${c('yellow', 'theme dark')} ou ${c('yellow', 'theme light')}`];
        system.setMode(mode === 'dark' || mode === 'sombre' ? 'dark' : 'light');
        return [`Mode ${mode === 'dark' || mode === 'sombre' ? 'sombre' : 'clair'} activé ${c('green', '✓')}`];
    }

    cmd_wallpaper() {
        system.nextWallpaper();
        return [`Fond d'écran changé ${c('green', '✓')}`];
    }

    async cmd_git(args) {
        if (args[0] === 'status') {
            return [
                'Sur la branche main',
                'Votre branche est à jour avec \'origin/main\'.',
                '',
                'Modifications qui ne seront pas validées :',
                `        ${c('red', 'modifié :         src/skills.ts')}`,
                `        ${c('red', 'modifié :         src/projects.json')}`,
                '',
                'Fichiers non suivis :',
                `        ${c('red', 'src/contact.html')}`,
            ];
        }
        if (args[0] === 'log') {
            const commits = await getCommits(12);
            if (!commits.length) return [c('gray', 'Impossible de récupérer l\'historique (hors ligne ?)')];
            return commits.map((commit) => `${c('yellow', commit.sha)} ${esc(commit.message)} ${c('gray', `(${commit.date.toLocaleDateString('fr-FR')}, ${commit.author})`)}`);
        }
        return [`usage : git ${c('yellow', 'log')} | ${c('yellow', 'status')}`];
    }

    async cmd_npm(args) {
        if (args.join(' ') !== 'run dev' && args[0] !== 'start') return [`usage : ${c('yellow', 'npm run dev')}`];
        return [
            '',
            `> portfolio-thomas-sebasti@2.0.0 dev`,
            '> npx serve .',
            '',
            `   ${c('green', '┌───────────────────────────────────────────┐')}`,
            `   ${c('green', '│')}                                           ${c('green', '│')}`,
            `   ${c('green', '│')}   Serving!                                ${c('green', '│')}`,
            `   ${c('green', '│')}                                           ${c('green', '│')}`,
            `   ${c('green', '│')}   - Local:    <a class="t-link" data-href="${location.href.split('?')[0]}">http://localhost:3000</a>        ${c('green', '│')}`,
            `   ${c('green', '│')}                                           ${c('green', '│')}`,
            `   ${c('green', '└───────────────────────────────────────────┘')}`,
            '',
        ];
    }

    cmd_date() {
        const now = new Date();
        return ['', now.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) + ' ' + now.toLocaleTimeString('fr-FR'), ''];
    }

    cmd_echo(args) {
        return [esc(args.join(' '))];
    }

    cmd_history() {
        return this.history.map((entry, i) => `  ${String(i + 1).padStart(3)}  ${esc(entry)}`);
    }

    cmd_whoami() {
        return [`portfolio\\${esc(profile.username.toLowerCase())}`];
    }

    cmd_sudo() {
        return [`${c('yellow', 'sudo')} ? On est sous Windows ici 😏 Essayez plutôt ${c('yellow', 'help')}.`];
    }

    cmd_clear() {
        this.onClear?.();
        return [];
    }

    cmd_exit() {
        this.onExit?.();
        return [];
    }
}

/**
 * Vue terminal réutilisable : sortie + ligne de saisie, historique, complétion.
 */
export function createTerminalView({ shell, banner = [], className = '' }) {
    const root = el(`
        <div class="term ${className}" tabindex="-1">
            <div class="term-output" role="log" aria-live="polite"></div>
            <form class="term-input-line">
                <span class="term-prompt"></span>
                <input class="term-input" type="text" autocomplete="off" autocapitalize="off" spellcheck="false" aria-label="Commande">
            </form>
        </div>`);
    const output = root.querySelector('.term-output');
    const input = root.querySelector('.term-input');
    const prompt = root.querySelector('.term-prompt');
    let historyIndex = -1;

    const print = (lines) => {
        const fragment = document.createDocumentFragment();
        lines.forEach((line) => {
            const div = document.createElement('div');
            div.className = 'term-line';
            div.innerHTML = line || '&nbsp;';
            fragment.append(div);
        });
        output.append(fragment);
        root.scrollTop = root.scrollHeight;
    };
    const updatePrompt = () => { prompt.textContent = shell.prompt; };

    shell.onClear = () => { output.innerHTML = ''; };
    print(banner);
    updatePrompt();

    root.querySelector('form').addEventListener('submit', async (event) => {
        event.preventDefault();
        const value = input.value;
        input.value = '';
        historyIndex = -1;
        print([`<span class="term-prompt-echo">${esc(shell.prompt)}</span>${esc(value)}`]);
        const result = await shell.run(value);
        print(result);
        if (value.trim()) print(['']);
        updatePrompt();
        root.scrollTop = root.scrollHeight;
    });

    input.addEventListener('keydown', (event) => {
        if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
            event.preventDefault();
            const list = shell.history;
            if (!list.length) return;
            historyIndex = event.key === 'ArrowUp'
                ? (historyIndex === -1 ? list.length - 1 : Math.max(0, historyIndex - 1))
                : (historyIndex === -1 ? -1 : historyIndex + 1);
            if (historyIndex >= list.length) historyIndex = -1;
            input.value = historyIndex === -1 ? '' : list[historyIndex];
        } else if (event.key === 'Tab') {
            event.preventDefault();
            const result = shell.complete(input.value);
            if (typeof result === 'string') input.value = result;
            else if (result.matches.length > 1) {
                print([`<span class="term-prompt-echo">${esc(shell.prompt)}</span>${esc(input.value)}`, result.matches.map(esc).join('    ')]);
            }
        } else if (event.key === 'l' && event.ctrlKey) {
            event.preventDefault();
            output.innerHTML = '';
        } else if (event.key === 'c' && event.ctrlKey && input.selectionStart === input.selectionEnd) {
            event.preventDefault();
            print([`<span class="term-prompt-echo">${esc(shell.prompt)}</span>${esc(input.value)}^C`]);
            input.value = '';
        }
    });

    root.addEventListener('click', (event) => {
        const link = event.target.closest('[data-href]');
        if (link) {
            window.open(link.dataset.href, '_blank', 'noopener');
            return;
        }
        if (!window.getSelection()?.toString()) input.focus({ preventScroll: true });
    });

    return {
        element: root,
        focus: () => input.focus({ preventScroll: true }),
        print,
        run: async (command) => {
            print([`<span class="term-prompt-echo">${esc(shell.prompt)}</span>${esc(command)}`]);
            print(await shell.run(command));
            updatePrompt();
        },
    };
}
