/**
 * Jeux et mini-applications codés par Thomas (hébergés sur GitHub Pages), affichés dans une fenêtre.
 */
import { el, html } from '../core/dom.js';
import { wm } from '../os/window-manager.js';

export function open({ app, appId }) {
    const { game } = app;
    const content = el(html`
        <div class="game">
            <div class="game-loading"><div class="boot-spinner is-small"><i></i><i></i><i></i><i></i><i></i></div></div>
            <iframe src="${game.url}" title="${game.name}" allow="fullscreen" loading="eager"></iframe>
        </div>`);
    const frame = content.querySelector('iframe');
    frame.addEventListener('load', () => content.classList.add('is-loaded'));

    return wm.open({
        appId,
        title: game.name,
        icon: game.icon,
        width: game.size[0],
        height: game.size[1] + 32,
        minWidth: 280,
        minHeight: 320,
        className: 'window--game',
        content,
    });
}
