/**
 * Vues « riches » de l'éditeur : page d'accueil, aperçus (HTML, Markdown, compétences, projets,
 * contact), visionneuse d'image, fiche d'extension et éditeur de paramètres.
 */
import { el, html, raw, escapeHtml } from '../../core/dom.js';
import { codicon, fileIcon, appIconUrl } from '../../core/icons.js';
import { store } from '../../core/store.js';
import { profile } from '../../data/profile.js';
import { projects } from '../../data/projects.js';
import { skillGroups, technologies } from '../../data/skills.js';
import { renderMarkdown } from './markdown.js';
import { themes } from './themes.js';
import { sendMail } from '../../services/mail.js';

const techIcon = (id, size = 28) => {
    const tech = technologies[id];
    return tech.icon
        ? `<img src="${tech.icon}" alt="" width="${size}" height="${size}" class="${tech.invert ? 'is-invert' : ''}" loading="lazy">`
        : `<span class="tech-fallback" style="--tech:${tech.color};width:${size}px;height:${size}px">${escapeHtml(tech.name.slice(0, 2))}</span>`;
};

/** Délègue les liens d'un aperçu (fichiers internes / URL externes). */
function bindLinks(element, wb) {
    element.addEventListener('click', (event) => {
        const file = event.target.closest('[data-file]');
        if (file) {
            event.preventDefault();
            wb.openFileByName(file.dataset.file, { preview: file.dataset.preview !== 'false' });
            return;
        }
        const link = event.target.closest('[data-href]');
        if (link) {
            event.preventDefault();
            wb.openExternal(link.dataset.href);
        }
        const command = event.target.closest('[data-command]');
        if (command) {
            event.preventDefault();
            wb.commands.run(command.dataset.command);
        }
    });
    return element;
}

/* ------------------------------------------------------------------ */
/* Bienvenue                                                            */
/* ------------------------------------------------------------------ */
export function welcomeView(wb) {
    const recent = ['src/about.md', 'src/projects.json', 'src/skills.ts', 'src/contact.html', 'README.md'];
    const element = el(html`
        <div class="vs-welcome vs-scrollable">
            <div class="vs-welcome-inner">
                <header class="vs-welcome-header">
                    <h1>${profile.fullName}</h1>
                    <p>${profile.title} — <em>Édition portfolio</em></p>
                </header>
                <div class="vs-welcome-columns">
                    <div>
                        <section class="vs-welcome-section">
                            <h2>Démarrer</h2>
                            <button class="vs-welcome-link" data-file="about.md">${raw(codicon('account'))} Qui suis-je ?</button>
                            <button class="vs-welcome-link" data-file="projects.json">${raw(codicon('folder-opened'))} Voir mes projets...</button>
                            <button class="vs-welcome-link" data-file="skills.ts">${raw(codicon('extensions'))} Découvrir mes compétences...</button>
                            <button class="vs-welcome-link" data-file="contact.html">${raw(codicon('mail'))} Me contacter...</button>
                            <button class="vs-welcome-link" data-href="${profile.links.github}">${raw(codicon('github'))} Cloner le dépôt Git...</button>
                        </section>
                        <section class="vs-welcome-section">
                            <h2>Récent</h2>
                            ${recent.map((path) => raw(html`
                                <div class="vs-welcome-recent">
                                    <button class="vs-welcome-link" data-file="${path.split('/').pop()}" data-preview="false">${path.split('/').pop()}</button>
                                    <span>~\\Documents\\Portfolio-VSCode\\${path.replace(/\//g, '\\')}</span>
                                </div>`))}
                        </section>
                    </div>
                    <div>
                        <section class="vs-welcome-section">
                            <h2>Procédures pas à pas</h2>
                            <button class="vs-walkthrough is-featured" data-file="README.md">
                                <span class="vs-walkthrough-icon">${raw(codicon('star-full'))}</span>
                                <span><strong>Bien démarrer avec ce portfolio</strong><small>Découvrez le contenu et les raccourcis clavier.</small></span>
                                <span class="vs-walkthrough-progress"><i style="width:35%"></i></span>
                            </button>
                            <button class="vs-walkthrough" data-command="workbench.view.extensions">
                                <span class="vs-walkthrough-icon">${raw(codicon('extensions'))}</span>
                                <span><strong>Mes compétences en extensions</strong><small>Parcourez mes technologies dans la vue Extensions.</small></span>
                            </button>
                            <button class="vs-walkthrough" data-command="workbench.action.selectTheme">
                                <span class="vs-walkthrough-icon">${raw(codicon('symbol-color'))}</span>
                                <span><strong>Choisir un thème</strong><small>Dark Modern, Dracula, Monokai, One Dark Pro...</small></span>
                            </button>
                            <button class="vs-walkthrough" data-command="workbench.action.terminal.toggleTerminal">
                                <span class="vs-walkthrough-icon">${raw(codicon('terminal'))}</span>
                                <span><strong>Explorer via le terminal</strong><small>Tapez <code>help</code>, <code>neofetch</code> ou <code>projects</code>.</small></span>
                            </button>
                        </section>
                    </div>
                </div>
                <label class="vs-welcome-startup">
                    <input type="checkbox" class="vs-checkbox" ${store.get('vs-show-welcome', true) ? 'checked' : ''}>
                    Afficher la page d'accueil au démarrage
                </label>
            </div>
        </div>`);
    element.querySelector('input').addEventListener('change', (event) => store.set('vs-show-welcome', event.target.checked));
    return bindLinks(element, wb);
}

/* ------------------------------------------------------------------ */
/* Aperçus                                                              */
/* ------------------------------------------------------------------ */
function homePreview(wb) {
    const element = el(html`
        <div class="pv pv-home vs-scrollable">
            <section class="pv-hero">
                <p class="pv-hero-kicker">&lt;h1&gt; Bienvenue sur VS Code ! Ou pas... &lt;/h1&gt;</p>
                <h1 class="pv-hero-title">${profile.fullName}</h1>
                <p class="pv-hero-subtitle">${profile.tagline}</p>
                <div class="pv-hero-links">
                    <button class="pv-btn is-primary" data-file="about.md">${raw(codicon('account'))} Qui suis-je ?</button>
                    <button class="pv-btn" data-file="skills.ts">${raw(codicon('extensions'))} Mes compétences</button>
                    <button class="pv-btn" data-file="projects.json">${raw(codicon('folder-opened'))} Mes projets</button>
                    <button class="pv-btn" data-file="contact.html">${raw(codicon('mail'))} Contactez-moi</button>
                </div>
                <div class="pv-hero-social">
                    <a data-href="${profile.links.github}" href="${profile.links.github}">${raw(codicon('github'))} GitHub</a>
                    <a data-href="${profile.links.linkedin}" href="${profile.links.linkedin}">${raw(codicon('link-external'))} LinkedIn</a>
                </div>
            </section>
            <section class="pv-facts">
                <div class="pv-fact"><strong>8 ans</strong><span>dans l'industrie chimique</span></div>
                <div class="pv-fact"><strong>${projects.length}</strong><span>applications réalisées</span></div>
                <div class="pv-fact"><strong>${Object.keys(technologies).length}</strong><span>technologies & outils</span></div>
            </section>
        </div>`);
    return bindLinks(element, wb);
}

function markdownPreview(wb, file) {
    const element = el(`<div class="pv pv-markdown vs-scrollable"><article class="markdown-body">${renderMarkdown(file.content)}</article></div>`);
    return bindLinks(element, wb);
}

function skillsPreview(wb) {
    const element = el(html`
        <div class="pv pv-skills vs-scrollable">
            <h1 class="pv-title"><span class="pv-tag">&lt;h2&gt;</span> Mes compétences <span class="pv-tag">&lt;/h2&gt;</span></h1>
            <div class="pv-skill-grid">
                ${skillGroups.map((group) => raw(html`
                    <section class="pv-skill-card">
                        <h2>${group.label}</h2>
                        <ul>
                            ${group.items.map((id) => raw(html`
                                <li><button type="button" data-extension="${id}">${raw(techIcon(id, 22))}<span>${technologies[id].name}</span></button></li>`))}
                        </ul>
                    </section>`))}
            </div>
        </div>`);
    element.addEventListener('click', (event) => {
        const ext = event.target.closest('[data-extension]');
        if (ext) wb.editor.openExtension(ext.dataset.extension);
    });
    return bindLinks(element, wb);
}

export function projectsPreview(wb, _file, options = {}) {
    const element = el(html`
        <div class="pv pv-projects vs-scrollable">
            <h1 class="pv-title"><span class="pv-tag">&lt;h2&gt;</span> Mes projets <span class="pv-tag">&lt;/h2&gt;</span></h1>
            <p class="pv-comment">&lt;!-- Applications en production pour l'industrie. Les captures utilisent des données de démonstration. --&gt;</p>
            <div class="pv-project-list">
                ${projects.map((project, index) => raw(html`
                    <article class="pv-project ${index === 0 ? 'is-featured' : ''}" id="project-${project.id}" data-project="${project.id}">
                        <div class="pv-project-media">
                            <button class="pv-project-image" type="button" data-open-image="${project.gallery[0].src}" title="${project.gallery[0].caption}">
                                <img src="${project.image}" alt="Capture d'écran de ${project.name}" loading="lazy">
                                <span class="pv-project-caption">${project.gallery[0].caption}</span>
                            </button>
                            ${project.gallery.length > 1 ? raw(html`
                                <div class="pv-project-thumbs">
                                    ${project.gallery.map((shot, i) => raw(html`
                                        <button class="pv-thumb ${i === 0 ? 'is-active' : ''}" type="button" data-shot="${i}" title="${shot.caption}">
                                            <img src="${shot.src}" alt="" loading="lazy">
                                        </button>`))}
                                </div>`) : ''}
                        </div>
                        <div class="pv-project-body">
                            <div class="pv-project-meta">
                                <span class="pv-chip">${project.context}</span>
                                ${project.version ? raw(html`<span class="pv-chip is-muted">${project.version}</span>`) : ''}
                                ${project.year ? raw(html`<span class="pv-chip is-muted">${project.year}</span>`) : ''}
                            </div>
                            <h2>${project.name}</h2>
                            <p class="pv-project-title">${project.title}</p>
                            <p class="pv-project-desc">${project.description}</p>
                            <ul class="pv-project-highlights">
                                ${project.highlights.map((item) => raw(html`<li>${item}</li>`))}
                            </ul>
                            <div class="pv-project-stack">${project.stack.map((id) => raw(`<span class="pv-stack-item" title="${escapeHtml(technologies[id].name)}">${techIcon(id, 18)}<span>${escapeHtml(technologies[id].name)}</span></span>`))}</div>
                            <div class="pv-project-actions">
                                ${project.url ? raw(html`<button class="pv-btn is-primary" data-href="${project.url}">${raw(codicon('link-external'))} Voir le site</button>`) : ''}
                                ${project.repo
                                    ? raw(html`<button class="pv-btn ${project.url ? '' : 'is-primary'}" data-href="${project.repo}">${raw(codicon('github'))} Code source</button>`)
                                    : raw(`<span class="pv-badge">${codicon('lock')} Dépôt privé</span>`)}
                            </div>
                        </div>
                    </article>`))}
            </div>
        </div>`);
    element.addEventListener('click', (event) => {
        const thumb = event.target.closest('[data-shot]');
        if (thumb) {
            const card = thumb.closest('.pv-project');
            const project = projects.find((p) => p.id === card.dataset.project);
            const shot = project.gallery[Number(thumb.dataset.shot)];
            const main = card.querySelector('.pv-project-image');
            main.querySelector('img').src = shot.src;
            main.querySelector('.pv-project-caption').textContent = shot.caption;
            main.dataset.openImage = shot.src;
            main.title = shot.caption;
            card.querySelectorAll('.pv-thumb').forEach((node) => node.classList.toggle('is-active', node === thumb));
            return;
        }
        const image = event.target.closest('[data-open-image]');
        if (image) wb.openFileByName(image.dataset.openImage.split('/').pop(), { preview: true });
    });
    bindLinks(element, wb);
    element.revealProject = (id) => {
        const card = element.querySelector(`#project-${id}`);
        if (!card) return;
        card.scrollIntoView({ block: 'start' });
        card.classList.remove('is-highlighted');
        void card.offsetWidth;
        card.classList.add('is-highlighted');
    };
    if (options.project) requestAnimationFrame(() => element.revealProject(options.project));
    return element;
}

function contactPreview(wb) {
    const element = el(html`
        <div class="pv pv-contact vs-scrollable">
            <h1 class="pv-title"><span class="pv-tag">&lt;h2&gt;</span> Contactez-moi <span class="pv-tag">&lt;/h2&gt;</span></h1>
            <div class="pv-contact-layout">
                <form class="pv-form" novalidate>
                    <div class="pv-field">
                        <label for="contact-name">Nom</label>
                        <input class="vs-input" id="contact-name" name="name" type="text" autocomplete="name" required>
                    </div>
                    <div class="pv-field">
                        <label for="contact-email">Email</label>
                        <input class="vs-input" id="contact-email" name="email" type="email" autocomplete="email" required>
                    </div>
                    <div class="pv-field is-wide">
                        <label for="contact-subject">Sujet</label>
                        <input class="vs-input" id="contact-subject" name="subject" type="text" required>
                    </div>
                    <div class="pv-field is-wide">
                        <label for="contact-message">Message</label>
                        <textarea class="vs-input" id="contact-message" name="message" rows="7" required></textarea>
                    </div>
                    <p class="pv-form-status" role="status" aria-live="polite"></p>
                    <button class="vs-button" type="submit">
                        <span class="vs-button-spinner" hidden></span>
                        <span class="vs-button-label">${raw(codicon('send'))} Envoyer</span>
                    </button>
                </form>
                <aside class="pv-contact-aside">
                    <h2>Me retrouver</h2>
                    <a class="pv-contact-link" data-href="${profile.links.github}" href="${profile.links.github}"><img src="${appIconUrl('github')}" alt=""> <span><strong>GitHub</strong><small>@${profile.handle}</small></span></a>
                    <a class="pv-contact-link" data-href="${profile.links.linkedin}" href="${profile.links.linkedin}"><img src="${appIconUrl('linkedin')}" alt=""> <span><strong>LinkedIn</strong><small>thomas-sebasti</small></span></a>
                    <p class="pv-contact-location">${raw(codicon('location'))} ${profile.location}</p>
                </aside>
            </div>
        </div>`);

    const form = element.querySelector('form');
    const status = element.querySelector('.pv-form-status');
    const button = form.querySelector('button');
    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const data = Object.fromEntries(new FormData(form));
        const invalid = [...form.elements].filter((field) => field.name && !field.checkValidity());
        form.querySelectorAll('.vs-input').forEach((field) => field.classList.toggle('is-invalid', invalid.includes(field)));
        if (invalid.length) {
            status.className = 'pv-form-status is-error';
            status.textContent = invalid.some((field) => field.type === 'email' && field.value)
                ? 'L\'adresse email n\'est pas valide.'
                : 'Veuillez remplir tous les champs.';
            invalid[0].focus();
            return;
        }
        button.disabled = true;
        button.querySelector('.vs-button-spinner').hidden = false;
        button.querySelector('.vs-button-label').textContent = 'Envoi en cours...';
        status.className = 'pv-form-status';
        status.textContent = '';
        wb.setProgress(true);
        try {
            await sendMail(data);
            form.reset();
            status.className = 'pv-form-status is-success';
            status.textContent = 'Votre message a bien été envoyé ! Je vous réponds au plus vite.';
            wb.notify('info', 'Message envoyé avec succès. Merci !');
        } catch (error) {
            console.error(error);
            status.className = 'pv-form-status is-error';
            status.textContent = 'Une erreur est survenue lors de l\'envoi du message. Réessayez plus tard ou contactez-moi via LinkedIn.';
            wb.notify('error', 'Échec de l\'envoi du message.');
        } finally {
            wb.setProgress(false);
            button.disabled = false;
            button.querySelector('.vs-button-spinner').hidden = true;
            button.querySelector('.vs-button-label').innerHTML = `${codicon('send')} Envoyer`;
        }
    });
    return bindLinks(element, wb);
}

function imagePreview(wb, file) {
    const element = el(html`
        <div class="pv-image vs-scrollable">
            <img src="${file.image}" alt="${file.name}" draggable="false">
        </div>`);
    const img = element.querySelector('img');
    let zoom = 1;
    img.addEventListener('load', () => wb.statusbar.set('image', `${img.naturalWidth}×${img.naturalHeight}`));
    element.addEventListener('click', (event) => {
        if (event.target !== img) return;
        zoom = event.altKey ? Math.max(0.25, zoom / 1.5) : zoom >= 3 ? 1 : zoom * 1.5;
        img.style.width = zoom === 1 ? '' : `${img.naturalWidth * zoom / (window.devicePixelRatio || 1)}px`;
        element.classList.toggle('is-zoomed', zoom !== 1);
    });
    return element;
}

export const previews = {
    home: homePreview,
    markdown: markdownPreview,
    skills: skillsPreview,
    projects: projectsPreview,
    contact: contactPreview,
    image: imagePreview,
};

/* ------------------------------------------------------------------ */
/* Fiche d'extension (technologie)                                      */
/* ------------------------------------------------------------------ */
export function extensionView(wb, id) {
    const tech = technologies[id];
    const group = skillGroups.find((g) => g.items.includes(id));
    const used = projects.filter((project) => project.stack.includes(id));
    const element = el(html`
        <div class="vs-extension vs-scrollable">
            <header class="vs-ext-header">
                <div class="vs-ext-icon">${raw(techIcon(id, 96))}</div>
                <div class="vs-ext-meta">
                    <h1>${tech.name} <span class="vs-ext-id">${id}</span></h1>
                    <p class="vs-ext-publisher">${raw(codicon('verified-filled'))} ${tech.publisher} <span>|</span> ${group?.label ?? 'Outils'}</p>
                    <p class="vs-ext-description">${tech.description}</p>
                    <div class="vs-ext-actions">
                        <button class="vs-button is-secondary" type="button" disabled>Désactiver</button>
                        <button class="vs-button is-secondary" type="button" disabled>Désinstaller</button>
                        <span class="vs-ext-installed">${raw(codicon('check'))} Cette extension est installée et activée globalement.</span>
                    </div>
                </div>
            </header>
            <nav class="vs-ext-tabs"><span class="is-active">DÉTAILS</span><span>FONCTIONNALITÉS</span><span>JOURNAL DES MODIFICATIONS</span></nav>
            <div class="vs-ext-body">
                <div class="markdown-body">
                    <h2>${tech.name}</h2>
                    <p>${tech.description} Cette technologie fait partie de mes compétences dans la catégorie <strong>${group?.label}</strong>.</p>
                    <h3>Utilisée dans ${used.length ? `${used.length} projet${used.length > 1 ? 's' : ''}` : 'mes projets personnels et ma formation'}</h3>
                    ${used.length ? raw(html`<ul>${used.map((project) => raw(html`<li><a href="#" data-project="${project.id}">${project.name}</a> — ${project.title}</li>`))}</ul>`) : ''}
                </div>
                <aside class="vs-ext-aside">
                    <h3>Catégories</h3>
                    <div class="vs-ext-chips"><span>${group?.label}</span></div>
                    <h3>Informations</h3>
                    <dl>
                        <dt>Identificateur</dt><dd>${profile.handle.toLowerCase()}.${id}</dd>
                        <dt>Éditeur</dt><dd>${tech.publisher}</dd>
                        <dt>Installée par</dt><dd>${profile.fullName}</dd>
                    </dl>
                </aside>
            </div>
        </div>`);
    element.addEventListener('click', (event) => {
        const project = event.target.closest('[data-project]');
        if (project) {
            event.preventDefault();
            wb.openProject(project.dataset.project);
        }
    });
    return element;
}

/* ------------------------------------------------------------------ */
/* Éditeur de paramètres                                                */
/* ------------------------------------------------------------------ */
export function settingsView(wb) {
    const settings = wb.settings;
    const rows = [
        { key: 'theme', section: 'Workbench', label: 'Color Theme', description: 'Spécifie le thème de couleur utilisé dans le workbench.', type: 'select', options: themes.map((t) => [t.id, t.label]) },
        { key: 'fontSize', section: 'Éditeur', label: 'Font Size', description: 'Contrôle la taille de police en pixels.', type: 'number' },
        { key: 'wordWrap', section: 'Éditeur', label: 'Word Wrap', description: 'Contrôle le retour automatique à la ligne.', type: 'select', options: [['off', 'off'], ['on', 'on'], ['auto', 'auto (Markdown uniquement)']] },
        { key: 'minimap', section: 'Éditeur › Minimap', label: 'Enabled', description: 'Contrôle si la minimap est affichée.', type: 'checkbox' },
        { key: 'ligatures', section: 'Éditeur', label: 'Font Ligatures', description: 'Active les ligatures de police (Cascadia Code).', type: 'checkbox' },
        { key: 'cursorBlinking', section: 'Éditeur', label: 'Cursor Blinking', description: 'Contrôle le style d\'animation du curseur.', type: 'select', options: [['blink', 'blink'], ['smooth', 'smooth'], ['solid', 'solid']] },
    ];
    const element = el(html`
        <div class="vs-settings vs-scrollable">
            <div class="vs-settings-header">
                <input class="vs-input vs-settings-search" type="search" placeholder="Rechercher dans les paramètres" aria-label="Rechercher dans les paramètres">
                <nav class="vs-settings-scope"><span class="is-active">Utilisateur</span><span>Espace de travail</span></nav>
            </div>
            <div class="vs-settings-list">
                ${rows.map((row) => raw(html`
                    <div class="vs-setting" data-key="${row.key}" data-search="${`${row.section} ${row.label} ${row.description}`.toLowerCase()}">
                        <div class="vs-setting-title">${row.section}: <strong>${row.label}</strong></div>
                        ${row.type === 'checkbox'
                            ? raw(html`<label class="vs-setting-check"><input type="checkbox" class="vs-checkbox" ${settings[row.key] ? 'checked' : ''}> ${row.description}</label>`)
                            : raw(html`<div class="vs-setting-description">${row.description}</div>
                               ${row.type === 'select'
                                    ? raw(html`<select class="vs-select">${row.options.map(([value, label]) => raw(html`<option value="${value}" ${settings[row.key] === value ? 'selected' : ''}>${label}</option>`))}</select>`)
                                    : raw(html`<input class="vs-input vs-setting-number" type="number" min="10" max="30" value="${settings[row.key]}">`)}`)}
                    </div>`))}
            </div>
        </div>`);

    element.addEventListener('change', (event) => {
        const row = event.target.closest('.vs-setting');
        if (!row) return;
        const key = row.dataset.key;
        const value = event.target.type === 'checkbox' ? event.target.checked : event.target.type === 'number' ? Number(event.target.value) : event.target.value;
        wb.updateSetting(key, value);
    });
    element.querySelector('.vs-settings-search').addEventListener('input', (event) => {
        const query = event.target.value.toLowerCase();
        element.querySelectorAll('.vs-setting').forEach((row) => { row.hidden = !row.dataset.search.includes(query); });
    });
    element.refresh = () => {
        element.querySelectorAll('.vs-setting').forEach((row) => {
            const input = row.querySelector('input, select');
            const value = settings[row.dataset.key];
            if (input.type === 'checkbox') input.checked = !!value;
            else input.value = value;
        });
    };
    return element;
}

export { techIcon, fileIcon };
