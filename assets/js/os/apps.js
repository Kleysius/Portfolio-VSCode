/**
 * Registre des applications + lanceur.
 * Chaque application est chargée à la demande (import dynamique) : seul le code nécessaire est téléchargé.
 */
import { appIconUrl } from '../core/icons.js';
import { games } from '../data/projects.js';
import { profile } from '../data/profile.js';
import { wm } from './window-manager.js';

export const apps = {
    vscode: { name: 'Visual Studio Code', icon: appIconUrl('vscode'), single: true, load: () => import('../apps/vscode/index.js'), keywords: 'code editeur portfolio' },
    explorer: { name: 'Explorateur de fichiers', icon: appIconUrl('explorer'), load: () => import('../apps/explorer.js'), keywords: 'fichiers dossiers' },
    terminal: { name: 'Terminal', icon: appIconUrl('terminal'), load: () => import('../apps/terminal.js'), keywords: 'powershell console cmd' },
    edge: { name: 'Microsoft Edge', icon: appIconUrl('edge'), single: true, load: () => import('../apps/browser.js'), keywords: 'navigateur web internet' },
    settings: { name: 'Paramètres', icon: appIconUrl('settings'), single: true, load: () => import('../apps/settings.js'), keywords: 'fond ecran theme couleur personnalisation' },
    notepad: { name: 'Bloc-notes', icon: appIconUrl('notepad'), load: () => import('../apps/notepad.js'), keywords: 'texte notes' },
    photos: { name: 'Photos', icon: appIconUrl('photos'), load: () => import('../apps/photos.js'), keywords: 'images visionneuse' },
    github: { name: 'GitHub', icon: appIconUrl('github'), external: profile.links.github, keywords: 'code depots' },
    linkedin: { name: 'LinkedIn', icon: appIconUrl('linkedin'), external: profile.links.linkedin, keywords: 'reseau professionnel cv' },
};

games.forEach((game) => {
    apps[game.id] = { name: game.name, icon: game.icon, single: true, game, load: () => import('../apps/game.js'), keywords: 'jeu game' };
});

const pending = new Map();

/** Lance (ou met au premier plan) une application. */
export async function launch(appId, args = {}) {
    const app = apps[appId];
    if (!app) throw new Error(`Application inconnue : ${appId}`);

    if (app.external) {
        window.open(app.external, '_blank', 'noopener');
        return null;
    }

    if (app.single) {
        const existing = wm.byApp(appId)[0];
        if (existing) {
            existing.focus();
            existing.handleArgs?.(args);
            return existing;
        }
        if (pending.has(appId)) return pending.get(appId);
    }

    document.body.classList.add('is-launching');
    const promise = app.load()
        .then((module) => module.open({ ...args, appId, app }))
        .catch((error) => {
            console.error(error);
            return null;
        })
        .finally(() => {
            document.body.classList.remove('is-launching');
            pending.delete(appId);
        });
    pending.set(appId, promise);
    return promise;
}

/** Ouvre un « fichier » du système de fichiers virtuel avec l'application adaptée. */
export function openFsItem(item) {
    switch (item.type) {
        case 'app': return launch(item.app, item.args);
        case 'link': return launch('edge', { url: item.url });
        case 'image': return launch('photos', { images: item.gallery ?? [item], index: item.galleryIndex ?? 0 });
        case 'text': return launch('notepad', { name: item.name, content: item.content });
        case 'code': return launch('vscode', { open: item.path });
        default: return null;
    }
}
