/**
 * Système de fichiers Windows virtuel (Explorateur de fichiers, Terminal).
 * Types de nœuds : folder | app | link | image | text | code
 */
import { profile } from './profile.js';
import { projects, games } from './projects.js';
import { technologies } from './skills.js';
import { wallpapers } from './wallpapers.js';
import { files as workspaceFiles } from './workspace.js';

const aboutText = [
    `${profile.fullName} — ${profile.title}`,
    '='.repeat(40),
    '',
    ...profile.about.flatMap((paragraph) => [paragraph, '']),
    `GitHub   : ${profile.links.github}`,
    `LinkedIn : ${profile.links.linkedin}`,
].join('\r\n');

const screenshots = projects.flatMap((project) => project.gallery).map((shot, index) => ({
    type: 'image',
    name: shot.src.split('/').pop(),
    src: shot.src,
    title: shot.caption,
    galleryIndex: index,
}));
screenshots.forEach((shot) => { shot.gallery = screenshots; });

const wallpaperImages = wallpapers.map((wallpaper, index) => ({
    type: 'image',
    name: `wallpaper-${index + 1}.webp`,
    src: wallpaper.src,
    thumb: wallpaper.thumb,
    title: wallpaper.name,
    galleryIndex: index,
}));
wallpaperImages.forEach((image) => { image.gallery = wallpaperImages; });

const projectFolders = projects.map((project) => ({
    type: 'folder',
    name: project.name,
    icon: 'folder',
    children: [
        ...screenshots.filter((shot) => project.gallery.some((g) => g.src === shot.src)),
        {
            type: 'text',
            name: 'LISEZMOI.txt',
            content: [
                project.title,
                '-'.repeat(project.title.length),
                '',
                `${project.context}`,
                '',
                project.description,
                '',
                'Points clés :',
                ...project.highlights.map((item) => `  - ${item}`),
                '',
                `Technologies : ${project.stack.map((id) => technologies[id].name).join(', ')}`,
                project.repo ? `Code source : ${project.repo}` : 'Code source : dépôt privé',
            ].join('\r\n'),
        },
        ...(project.repo ? [{ type: 'link', name: `${project.name} sur GitHub.url`, url: project.repo }] : []),
    ],
}));

const codeFiles = (folder) => [...workspaceFiles.values()]
    .filter((file) => file.path.startsWith(`${folder}/`) && !file.path.slice(folder.length + 1).includes('/'))
    .map((file) => ({ type: 'code', name: file.name, path: file.path }));

export const filesystem = {
    type: 'folder',
    name: profile.username,
    path: `C:\\Users\\${profile.username}`,
    children: [
        {
            type: 'folder',
            name: 'Bureau',
            icon: 'desktop',
            children: [
                { type: 'app', name: 'Visual Studio Code.lnk', app: 'vscode' },
                ...games.map((game) => ({ type: 'app', name: `${game.name}.lnk`, app: game.id, iconSrc: game.icon })),
            ],
        },
        {
            type: 'folder',
            name: 'Documents',
            icon: 'documents',
            children: [
                { type: 'text', name: 'À propos de moi.txt', content: aboutText },
                {
                    type: 'folder',
                    name: 'Portfolio-VSCode',
                    icon: 'folder',
                    children: [
                        { type: 'folder', name: 'src', children: codeFiles('src') },
                        ...[...workspaceFiles.values()].filter((file) => !file.path.includes('/')).map((file) => ({ type: 'code', name: file.name, path: file.path })),
                    ],
                },
            ],
        },
        {
            type: 'folder',
            name: 'Images',
            icon: 'pictures',
            children: [
                { type: 'folder', name: 'Captures d\'écran', children: screenshots },
                { type: 'folder', name: 'Fonds d\'écran', children: wallpaperImages },
            ],
        },
        { type: 'folder', name: 'Projets', icon: 'folder', children: projectFolders },
        {
            type: 'folder',
            name: 'Jeux',
            icon: 'folder',
            children: games.map((game) => ({ type: 'app', name: game.name, app: game.id, iconSrc: game.icon })),
        },
        { type: 'folder', name: 'Téléchargements', icon: 'downloads', children: [] },
        { type: 'folder', name: 'Musique', icon: 'music', children: [] },
    ],
};

/** Ajoute les chemins et les liens parents. */
(function index(node, parentPath) {
    node.children?.forEach((child) => {
        child.parent = node;
        child.path = `${parentPath}\\${child.name}`;
        index(child, child.path);
    });
}(filesystem, filesystem.path));

/** Résout un chemin absolu ou relatif (style Windows ou Unix) à partir d'un dossier. */
export function resolvePath(from, input = '') {
    let node = from;
    let target = input.trim().replace(/\//g, '\\');
    if (!target || target === '~') return filesystem;
    if (target.startsWith('~')) { node = filesystem; target = target.slice(1); }
    if (/^c:\\users\\[^\\]+/i.test(target)) {
        node = filesystem;
        target = target.replace(/^c:\\users\\[^\\]+/i, '');
    }
    for (const part of target.split('\\').filter(Boolean)) {
        if (part === '.') continue;
        if (part === '..') { node = node.parent ?? node; continue; }
        const next = node.children?.find((child) => child.name.toLowerCase() === part.toLowerCase());
        if (!next) return null;
        node = next;
    }
    return node;
}

export function findByPath(path) {
    return resolvePath(filesystem, path);
}
