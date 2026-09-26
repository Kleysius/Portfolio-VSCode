/**
 * Point d'entrée : initialise le « système d'exploitation » puis ouvre VS Code.
 */
import { initSystem } from './os/system.js';
import { initDesktop } from './os/desktop.js';
import { initTaskbar } from './os/taskbar.js';
import { initStartMenu } from './os/start-menu.js';
import { initQuickSettings } from './os/quick-settings.js';
import { initNotificationCenter } from './os/notification-center.js';
import { initWidgets } from './os/widgets.js';
import { initShortcuts } from './os/shortcuts.js';
import { initTooltips } from './os/tooltip.js';
import { bootSequence } from './os/boot.js';
import { launch } from './os/apps.js';
import { notify } from './os/notifications.js';
import { appIconUrl } from './core/icons.js';
import { store } from './core/store.js';
import { likes } from './services/likes.js';
import { profile } from './data/profile.js';

initSystem();
initDesktop();
initTaskbar();
initStartMenu();
initQuickSettings();
initNotificationCenter();
initWidgets();
initShortcuts();
initTooltips();

// Précharge VS Code pendant l'écran de démarrage
const vscodeReady = import('./apps/vscode/index.js');

bootSequence().then(async ({ firstLogin }) => {
    likes.init();
    await vscodeReady;
    await launch('vscode');

    const visits = store.update('visits', 0, (count) => count + 1);
    setTimeout(() => {
        notify({
            app: 'Portfolio',
            icon: appIconUrl('user'),
            title: visits === 1 || firstLogin ? `Bienvenue sur le bureau de ${profile.firstName} 👋` : 'Content de vous revoir 👋',
            body: 'Double-cliquez sur les icônes du bureau, ouvrez le menu Démarrer ou explorez VS Code. Les jeux ont aussi été codés par mes soins !',
            actions: [
                { label: 'Voir mes projets', action: () => launch('vscode', { open: 'src/projects.json', preview: true }) },
                { label: 'Ignorer', action: () => {} },
            ],
        });
    }, 1200);
});
