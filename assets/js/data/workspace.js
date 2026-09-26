/**
 * Espace de travail virtuel ouvert dans VS Code.
 * Le contenu des fichiers est généré à partir des données (profil, compétences, projets)
 * pour qu'il n'y ait qu'une seule source de vérité.
 */
import { profile } from './profile.js';
import { skillGroups, technologies } from './skills.js';
import { projects } from './projects.js';

const quote = (value) => JSON.stringify(value);

const indexHtml = `<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${profile.fullName} — Portfolio</title>
    <link rel="stylesheet" href="styles.css">
</head>
<body>
    <!-- Bienvenue sur VS Code ! Ou pas... -->
    <header class="hero">
        <h1>${profile.fullName}</h1>
        <p class="subtitle">
            ${profile.tagline}
        </p>

        <nav class="hero__links">
            <a href="about.md">Qui suis-je ?</a>
            <a href="skills.ts">Mes compétences</a>
            <a href="projects.json">Mes projets</a>
            <a href="contact.html">Contactez-moi</a>
        </nav>
    </header>

    <!-- Retrouvez mon GitHub et mon LinkedIn dans la barre latérale gauche -->
    <!-- Astuce : Ctrl+P pour ouvrir un fichier, Ctrl+Shift+P pour les commandes -->
    <script type="module" src="main.js"></script>
</body>
</html>
`;

const aboutMd = `# Qui suis-je ?

> ${profile.tagline}

${profile.about.slice(0, 2).join('\n\n')}

## Mon parcours

- 🧪 **${profile.experience}**
- 🎓 **${profile.degree}**
- 💻 **Formation diplômante** — ${profile.school}

## Mon objectif

${profile.about.slice(2).join('\n\n')}

---

📬 [Me contacter](contact.html) · 🐙 [GitHub](${profile.links.github}) · 💼 [LinkedIn](${profile.links.linkedin})
`;

const skillsTs = `/**
 * Mes compétences techniques
 * @author ${profile.fullName}
 */

type Skill = string;

interface SkillSet {
${skillGroups.map((group) => `    /** ${group.label} */\n    ${group.id}: Skill[];`).join('\n')}
}

export const skills: SkillSet = {
${skillGroups.map((group) => `    ${group.id}: [${group.items.map((id) => quote(technologies[id].name).replace(/"/g, '\'')).join(', ')}],`).join('\n')}
};

/** Toujours curieux : la liste ne demande qu'à grandir 🚀 */
export function learn(category: keyof SkillSet, skill: Skill): void {
    if (!skills[category].includes(skill)) {
        skills[category].push(skill);
    }
}
`;

const projectsJson = `${JSON.stringify(projects.map((project) => ({
    name: project.name,
    title: project.title,
    context: project.context,
    stack: project.stack.map((id) => technologies[id].name),
    description: project.description,
    highlights: project.highlights,
    ...(project.repo ? { repository: project.repo } : {}),
})), null, 2)}
`;

const contactHtml = `<!-- Contactez-moi : le formulaire est fonctionnel ! -->
<!-- Ouvrez l'aperçu (Ctrl+Shift+V) pour m'écrire -->
<form class="vscode-form" id="contact-form" method="post">
    <label for="contact_name">Nom</label>
    <input type="text" id="contact_name" name="name" required>

    <label for="contact_email">Email</label>
    <input type="email" id="contact_email" name="email" required>

    <label for="contact_subject">Sujet</label>
    <input type="text" id="contact_subject" name="subject" required>

    <label for="contact_message">Message</label>
    <textarea id="contact_message" name="message" rows="5" required></textarea>

    <button type="submit" class="vscode-button">Envoyer</button>
</form>
`;

const readmeMd = `# 👋 Bienvenue sur le portfolio de ${profile.fullName}

${profile.tagline}

Ce portfolio imite **Windows 11** et **Visual Studio Code** : explorez-le comme votre propre bureau !

## 🗂️ Contenu

| Fichier | Description |
| --- | --- |
| [index.html](index.html) | Page d'accueil |
| [about.md](about.md) | Qui suis-je ? |
| [skills.ts](skills.ts) | Mes compétences |
| [projects.json](projects.json) | Mes projets |
| [contact.html](contact.html) | Me contacter |

## ⌨️ Raccourcis clavier

| Raccourci | Action |
| --- | --- |
| \`Ctrl+P\` | Ouvrir rapidement un fichier |
| \`Ctrl+Shift+P\` / \`F1\` | Palette de commandes |
| \`Ctrl+B\` | Afficher/masquer la barre latérale |
| \`Ctrl+J\` | Afficher/masquer le panneau (terminal) |
| \`Ctrl+Shift+V\` | Ouvrir l'aperçu |
| \`Ctrl+K Ctrl+T\` | Changer de thème de couleur |

## 🎮 Sur le bureau

Le **Morpion**, le **Puissance 4**, la **Calculatrice** et le **Snake** que vous pouvez ouvrir sur le bureau ont aussi été codés de mes mains.

## 🛠️ Stack du portfolio

- HTML, CSS et JavaScript *vanilla* (modules ES, aucune étape de build)
- Firebase Realtime Database pour le compteur de ❤️
- EmailJS pour le formulaire de contact
`;

const packageJson = `${JSON.stringify({
    name: 'portfolio-thomas-sebasti',
    version: '2.0.0',
    description: 'Portfolio qui imite Windows 11 et Visual Studio Code',
    author: profile.fullName,
    type: 'module',
    scripts: {
        dev: 'npx serve .',
        start: 'npx serve .',
    },
    repository: { type: 'git', url: profile.links.repo },
    keywords: ['portfolio', 'vscode', 'windows-11', 'javascript'],
}, null, 2)}
`;

const settingsJson = `{
    "workbench.colorTheme": "Dark Modern",
    "workbench.iconTheme": "material-icon-theme",
    "editor.fontFamily": "'Cascadia Code', Consolas, 'Courier New', monospace",
    "editor.fontLigatures": true,
    "editor.minimap.enabled": true,
    "editor.bracketPairColorization.enabled": true,
    "editor.guides.bracketPairs": "active",
    "[markdown]": {
        "editor.wordWrap": "on"
    }
}
`;

const gitignore = `node_modules/
.DS_Store
*.log
.env
`;

/**
 * Arborescence : chaque nœud est soit un dossier ({ children }), soit un fichier.
 * `preview` : type d'aperçu disponible pour le fichier ; `git` : décoration de contrôle de code source.
 */
export const workspace = {
    name: 'PORTFOLIO-THOMAS',
    children: [
        {
            name: '.vscode',
            children: [{ name: 'settings.json', language: 'json', content: settingsJson }],
        },
        {
            name: 'public',
            children: projects.flatMap((project) => project.gallery.map((shot) => ({
                name: shot.src.split('/').pop(),
                language: 'image',
                image: shot.src,
                caption: shot.caption,
                preview: 'image',
            }))),
        },
        {
            name: 'src',
            children: [
                { name: 'index.html', language: 'html', content: indexHtml, preview: 'home' },
                { name: 'about.md', language: 'markdown', content: aboutMd, preview: 'markdown' },
                { name: 'skills.ts', language: 'typescript', content: skillsTs, preview: 'skills', git: 'M' },
                { name: 'projects.json', language: 'json', content: projectsJson, preview: 'projects', git: 'M' },
                { name: 'contact.html', language: 'html', content: contactHtml, preview: 'contact', git: 'U' },
            ],
        },
        { name: '.gitignore', language: 'ignore', content: gitignore },
        { name: 'package.json', language: 'json', content: packageJson },
        { name: 'README.md', language: 'markdown', content: readmeMd, preview: 'markdown' },
    ],
};

/** Index plat : chemin → fichier. */
export const files = new Map();
(function walk(node, parent = '') {
    for (const child of node.children) {
        const path = parent ? `${parent}/${child.name}` : child.name;
        child.path = path;
        if (child.children) walk(child, path);
        else files.set(path, child);
    }
}(workspace));

export const findFile = (nameOrPath) =>
    files.get(nameOrPath) ?? [...files.values()].find((file) => file.name === nameOrPath);

export const languageNames = {
    html: 'HTML',
    markdown: 'Markdown',
    typescript: 'TypeScript',
    javascript: 'JavaScript',
    json: 'JSON',
    ignore: 'Ignore',
    image: 'Image',
    plaintext: 'Texte brut',
};
