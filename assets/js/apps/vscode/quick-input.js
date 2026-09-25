/**
 * Widget « Quick Input » de VS Code : ouverture rapide (Ctrl+P), palette de commandes (Ctrl+Shift+P),
 * aller à la ligne (:), symboles (@), sélection de thème avec aperçu en direct…
 */
import { el, escapeHtml } from '../../core/dom.js';
import { fuzzyMatch, highlightMatches } from '../../core/fuzzy.js';

export class QuickInput {
    constructor(host) {
        this.host = host;
        this.element = el(`
            <div class="vs-quick-input" role="dialog" aria-label="Entrée rapide" hidden>
                <div class="qi-header">
                    <input class="qi-input" type="text" autocomplete="off" spellcheck="false" role="combobox" aria-expanded="true" aria-controls="qi-list">
                </div>
                <div class="qi-message" hidden></div>
                <div class="qi-list" id="qi-list" role="listbox"></div>
            </div>`);
        host.append(this.element);
        this.input = this.element.querySelector('.qi-input');
        this.list = this.element.querySelector('.qi-list');
        this.message = this.element.querySelector('.qi-message');
        this.visible = [];
        this.index = 0;

        this.input.addEventListener('input', () => this.update());
        this.input.addEventListener('keydown', (event) => this.onKey(event));
        this.input.addEventListener('blur', () => setTimeout(() => {
            if (!this.element.contains(document.activeElement) && !this.element.hidden) this.hide(false);
        }, 120));
        this.list.addEventListener('pointerdown', (event) => event.preventDefault());
        this.list.addEventListener('click', (event) => {
            const row = event.target.closest('.qi-row');
            if (row) this.accept(Number(row.dataset.index));
        });
        this.list.addEventListener('pointermove', (event) => {
            const row = event.target.closest('.qi-row');
            if (row && Number(row.dataset.index) !== this.index) this.select(Number(row.dataset.index), false);
        });
    }

    get isOpen() {
        return !this.element.hidden;
    }

    /**
     * @param {object} options
     * @param {(value:string)=>{items:object[], message?:string, filter?:boolean}} [options.provider] fournisseur dynamique
     * @param {object[]} [options.items] liste statique
     */
    show(options) {
        this.options = options;
        this.accepted = false;
        this.element.hidden = false;
        this.input.placeholder = options.placeholder ?? '';
        this.input.value = options.value ?? '';
        this.update(options.activeIndex);
        this.input.focus();
        if (options.selectValue) this.input.select();
        else this.input.setSelectionRange(this.input.value.length, this.input.value.length);
    }

    hide(accepted = false) {
        if (this.element.hidden) return;
        this.element.hidden = true;
        this.options?.onHide?.(accepted);
        this.options = null;
    }

    update(activeIndex) {
        const value = this.input.value;
        const { provider, items = [] } = this.options;
        let source = items;
        let message = '';
        let filterText = value;
        let filter = true;
        if (provider) {
            const result = provider(value);
            source = result.items;
            message = result.message ?? '';
            filterText = result.filterText ?? value;
            filter = result.filter !== false;
        }

        this.visible = [];
        if (!filter || !filterText.trim()) {
            this.visible = source.map((item) => ({ item, match: null }));
        } else {
            this.visible = source
                .map((item) => ({ item, match: fuzzyMatch(filterText.trim(), item.label) ?? ([item.description, item.detail].some((text) => text && fuzzyMatch(filterText.trim(), text)) ? { score: -50, indices: [] } : null) }))
                .filter((entry) => entry.match)
                .sort((a, b) => b.match.score - a.match.score);
        }

        this.message.hidden = !message;
        this.message.textContent = message;
        this.render();
        this.select(activeIndex ?? 0, true);
    }

    render() {
        const showGroups = !this.input.value.replace(/^[>:@?]/, '').trim();
        let lastGroup = null;
        this.list.innerHTML = this.visible.map(({ item, match }, i) => {
            const separator = showGroups && item.group && item.group !== lastGroup;
            lastGroup = item.group;
            return `
                <div class="qi-row ${separator && i > 0 ? 'has-separator' : ''}" role="option" data-index="${i}" id="qi-row-${i}">
                    ${item.icon ? `<span class="qi-icon">${item.icon}</span>` : ''}
                    <span class="qi-label">${highlightMatches(item.label, match?.indices, escapeHtml)}</span>
                    ${item.description ? `<span class="qi-description">${escapeHtml(item.description)}</span>` : ''}
                    ${item.detail ? `<span class="qi-description">${escapeHtml(item.detail)}</span>` : ''}
                    <span class="qi-right">
                        ${separator ? `<span class="qi-group">${escapeHtml(item.group)}</span>` : ''}
                        ${item.keybinding ? `<span class="qi-keybinding">${item.keybinding.split('+').map((key) => `<kbd>${escapeHtml(key)}</kbd>`).join('+')}</span>` : ''}
                    </span>
                </div>`;
        }).join('') || '<div class="qi-empty">Aucun résultat correspondant</div>';
    }

    select(index, scroll = true) {
        if (!this.visible.length) return;
        this.index = (index + this.visible.length) % this.visible.length;
        this.list.querySelectorAll('.qi-row').forEach((row) => row.classList.toggle('is-focused', Number(row.dataset.index) === this.index));
        this.input.setAttribute('aria-activedescendant', `qi-row-${this.index}`);
        if (scroll) this.list.querySelector('.is-focused')?.scrollIntoView({ block: 'nearest' });
        this.options?.onFocus?.(this.visible[this.index].item);
    }

    accept(index = this.index) {
        const entry = this.visible[index];
        if (!entry && !this.options?.onSubmit) return;
        const options = this.options;
        if (entry?.item.keepOpen) {
            entry.item.run?.(this);
            return;
        }
        this.hide(true);
        if (entry) (entry.item.run ?? options.onAccept)?.(entry.item, this.input.value);
        else options.onSubmit?.(this.input.value);
    }

    onKey(event) {
        if (event.key === 'ArrowDown') { event.preventDefault(); this.select(this.index + 1); }
        else if (event.key === 'ArrowUp') { event.preventDefault(); this.select(this.index - 1); }
        else if (event.key === 'PageDown') { event.preventDefault(); this.select(Math.min(this.visible.length - 1, this.index + 10)); }
        else if (event.key === 'PageUp') { event.preventDefault(); this.select(Math.max(0, this.index - 10)); }
        else if (event.key === 'Enter') { event.preventDefault(); this.accept(); }
        else if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); this.hide(false); }
    }
}
