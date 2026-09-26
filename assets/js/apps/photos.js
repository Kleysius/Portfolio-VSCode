/**
 * Photos : visionneuse avec pellicule, navigation clavier, zoom et « définir comme fond d'écran ».
 */
import { el, html, raw } from '../core/dom.js';
import { appIconUrl, ui } from '../core/icons.js';
import { wm } from '../os/window-manager.js';
import { system } from '../os/system.js';
import { wallpapers } from '../data/wallpapers.js';
import { projects } from '../data/projects.js';

/** Galerie par défaut : captures des projets puis fonds d'écran. */
const defaultGallery = () => [
    ...projects.flatMap((project) => project.gallery).map((shot) => ({ name: shot.src.split('/').pop(), src: shot.src, title: shot.caption })),
    ...wallpapers.map((wallpaper, i) => ({ name: `wallpaper-${i + 1}.webp`, src: wallpaper.src, thumb: wallpaper.thumb, title: wallpaper.name })),
];

export function open({ images = defaultGallery(), index = 0 } = {}) {
    const root = el(html`
        <div class="ph">
            <header class="ph-titlebar" data-drag>
                <img src="${appIconUrl('photos')}" alt="">
                <span class="ph-title">Photos</span>
            </header>
            <div class="ph-toolbar">
                <span class="ph-name"></span>
                <span class="ph-tools">
                    <button class="ph-btn" type="button" data-action="zoom-out" aria-label="Zoom arrière">−</button>
                    <span class="ph-zoom">100 %</span>
                    <button class="ph-btn" type="button" data-action="zoom-in" aria-label="Zoom avant">+</button>
                    <button class="ph-btn" type="button" data-action="wallpaper" title="Définir comme fond d'écran" hidden>${raw(ui.desktop)}</button>
                    <button class="ph-btn" type="button" data-action="open" title="Ouvrir dans un nouvel onglet">${raw(ui.external)}</button>
                </span>
            </div>
            <div class="ph-stage">
                <button class="ph-arrow is-prev" type="button" data-action="prev" aria-label="Précédente">${raw(ui.chevronLeft)}</button>
                <img class="ph-image" alt="" draggable="false">
                <button class="ph-arrow is-next" type="button" data-action="next" aria-label="Suivante">${raw(ui.chevronRight)}</button>
            </div>
            <div class="ph-filmstrip">
                ${images.map((image, i) => raw(html`<button class="ph-thumb" type="button" data-index="${i}" aria-label="${image.title ?? image.name}"><img src="${image.thumb ?? image.src}" alt="" loading="lazy"></button>`))}
            </div>
        </div>`);

    const win = wm.open({
        appId: 'photos',
        title: 'Photos',
        icon: appIconUrl('photos'),
        frame: 'custom',
        width: 980,
        height: 680,
        className: 'window--photos',
        content: root,
    });
    root.querySelector('.ph-titlebar').append(win.controls);

    const img = root.querySelector('.ph-image');
    let current = index;
    let zoom = 1;

    const setZoom = (value) => {
        zoom = Math.max(0.5, Math.min(4, value));
        img.style.transform = `scale(${zoom})`;
        root.querySelector('.ph-zoom').textContent = `${Math.round(zoom * 100)} %`;
    };

    function show(i) {
        if (!images.length) return;
        current = (i + images.length) % images.length;
        const image = images[current];
        img.src = image.src;
        img.alt = image.title ?? image.name;
        root.querySelector('.ph-name').textContent = image.name;
        win.setTitle(`${image.name} - Photos`);
        root.querySelectorAll('.ph-thumb').forEach((thumb) => thumb.classList.toggle('is-active', Number(thumb.dataset.index) === current));
        root.querySelector('.ph-thumb.is-active')?.scrollIntoView({ block: 'nearest', inline: 'center' });
        root.querySelector('[data-action="wallpaper"]').hidden = !wallpapers.some((w) => w.src === image.src);
        root.querySelectorAll('.ph-arrow').forEach((arrow) => { arrow.hidden = images.length < 2; });
        setZoom(1);
    }

    root.addEventListener('click', (event) => {
        const action = event.target.closest('[data-action]')?.dataset.action;
        if (action === 'prev') show(current - 1);
        if (action === 'next') show(current + 1);
        if (action === 'zoom-in') setZoom(zoom + 0.25);
        if (action === 'zoom-out') setZoom(zoom - 0.25);
        if (action === 'open') window.open(images[current].src, '_blank', 'noopener');
        if (action === 'wallpaper') system.setWallpaper(wallpapers.findIndex((w) => w.src === images[current].src));
        const thumb = event.target.closest('.ph-thumb');
        if (thumb) show(Number(thumb.dataset.index));
    });
    root.querySelector('.ph-stage').addEventListener('wheel', (event) => {
        if (!event.ctrlKey) return;
        event.preventDefault();
        setZoom(zoom + (event.deltaY < 0 ? 0.1 : -0.1));
    }, { passive: false });
    img.addEventListener('dblclick', () => setZoom(zoom === 1 ? 2 : 1));
    root.tabIndex = -1;
    root.addEventListener('keydown', (event) => {
        if (event.key === 'ArrowLeft') show(current - 1);
        if (event.key === 'ArrowRight') show(current + 1);
    });

    show(current);
    requestAnimationFrame(() => root.focus());
    return win;
}
