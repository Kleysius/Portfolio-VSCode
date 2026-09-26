/**
 * Éditeur de code en lecture seule : numéros de ligne, curseur, repliage (indentation),
 * décorations Git, guides d'indentation, minimap, liens (Ctrl+clic), widget de recherche (Ctrl+F),
 * surlignage du mot courant, défilement « sticky », règle d'aperçu et menu contextuel.
 */
import { el, escapeHtml, clamp } from '../../core/dom.js';
import { showContextMenu } from '../../os/context-menu.js';
import { highlight, detectTabSize } from './highlight.js';
import { files } from '../../data/workspace.js';

const fileNames = new Set([...files.values()].map((file) => file.name));

const TOKEN_VARS = {
    comment: '--vs-tk-comment', string: '--vs-tk-string', number: '--vs-tk-number', keyword: '--vs-tk-keyword',
    'keyword-control': '--vs-tk-control', function: '--vs-tk-function', type: '--vs-tk-type', variable: '--vs-tk-variable',
    property: '--vs-tk-property', constant: '--vs-tk-constant', tag: '--vs-tk-tag', 'tag-punctuation': '--vs-tk-tag-punctuation',
    attr: '--vs-tk-attr', operator: '--vs-editor-fg', punctuation: '--vs-editor-fg', 'md-heading': '--vs-tk-heading',
    'md-bold': '--vs-tk-keyword', 'md-italic': '--vs-tk-string', 'md-code': '--vs-tk-string', 'md-link-text': '--vs-tk-string',
    'md-link-url': '--vs-tk-link', 'md-list': '--vs-tk-list', 'md-quote': '--vs-tk-comment', 'md-quote-marker': '--vs-tk-comment',
    'md-punctuation': '--vs-editor-fg', 'md-hr': '--vs-tk-comment',
};

/*
 * Surlignages via la CSS Custom Highlight API (aucune modification du DOM, comme les décorations de Monaco).
 * Les objets Highlight sont partagés : chaque éditeur n'y retire/ajoute que ses propres plages.
 */
const highlights = (() => {
    const { Highlight } = globalThis;
    if (!Highlight || !globalThis.CSS?.highlights) return null;
    const make = (name, priority) => {
        const highlight = new Highlight();
        highlight.priority = priority;
        CSS.highlights.set(name, highlight);
        return highlight;
    };
    return { word: make('vs-word', 1), find: make('vs-find', 2), current: make('vs-find-current', 3) };
})();

const escapeRegExp = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const coarsePointer = matchMedia('(pointer: coarse)').matches;

/** Plages de repliage basées sur l'indentation (comme VS Code par défaut). */
function computeFoldRanges(lines) {
    const indentOf = (line) => (line.trim() ? line.match(/^\s*/)[0].length : -1);
    const ranges = new Map();
    lines.forEach((line, i) => {
        const base = indentOf(line);
        if (base < 0) return;
        let end = i;
        for (let j = i + 1; j < lines.length; j++) {
            const indent = indentOf(lines[j]);
            if (indent === -1) continue;
            if (indent <= base) break;
            end = j;
        }
        // Inclut la ligne fermante au même niveau (}, ], </tag>)
        if (end > i && /^\s*[}\])]|^\s*<\//.test(lines[end + 1] ?? '') && indentOf(lines[end + 1]) === base) end += 1;
        if (end > i + 1 || (end > i && !/^\s*[}\])]/.test(lines[end]))) ranges.set(i, end);
    });
    return ranges;
}

export function createCodeView(file, { onCursor, onOpenFile, onOpenLink, onReadOnly, onCommand, settings }) {
    const tabSize = detectTabSize(file.content);
    const { lines, plain, tokens } = highlight(file.content, file.language, { tabSize, fileNames });
    const foldRanges = computeFoldRanges(plain);
    const digits = String(lines.length).length;
    const added = new Set();
    const modified = new Set();
    if (file.git === 'U') lines.forEach((_, i) => added.add(i));
    if (file.git === 'M') {
        for (let i = Math.max(0, lines.length - 6); i < lines.length - 1; i++) added.add(i);
        modified.add(Math.floor(lines.length / 3));
    }

    const element = el(`
        <div class="vs-code-editor" tabindex="0" role="textbox" aria-readonly="true" aria-multiline="true" aria-label="${escapeHtml(file.name)}">
            <div class="vs-code-scroll">
                <div class="vs-code-lines" style="--gutter-digits:${digits}"></div>
            </div>
            <div class="vs-minimap" aria-hidden="true">
                <canvas></canvas>
                <div class="vs-minimap-slider"></div>
            </div>
            <div class="vs-sticky" hidden></div>
            <div class="vs-overview" aria-hidden="true"></div>
            <div class="vs-find" role="dialog" aria-label="Rechercher" hidden>
                <button class="vs-find-expand codicon codicon-chevron-right" type="button" title="Afficher/masquer le remplacement (lecture seule)" disabled></button>
                <div class="vs-find-field">
                    <input class="vs-find-input" type="text" placeholder="Rechercher" aria-label="Rechercher" spellcheck="false" autocomplete="off">
                    <button class="vs-find-opt codicon codicon-case-sensitive" type="button" data-opt="caseSensitive" title="Respecter la casse (Alt+C)"></button>
                    <button class="vs-find-opt codicon codicon-whole-word" type="button" data-opt="wholeWord" title="Mot entier (Alt+W)"></button>
                    <button class="vs-find-opt codicon codicon-regex" type="button" data-opt="regex" title="Utiliser une expression régulière (Alt+R)"></button>
                </div>
                <span class="vs-find-count">Aucun résultat</span>
                <button class="vs-find-btn codicon codicon-arrow-up" type="button" data-find="prev" title="Correspondance précédente (Maj+Entrée)"></button>
                <button class="vs-find-btn codicon codicon-arrow-down" type="button" data-find="next" title="Correspondance suivante (Entrée)"></button>
                <button class="vs-find-btn codicon codicon-list-selection" type="button" title="Rechercher dans la sélection (Alt+L)" disabled></button>
                <button class="vs-find-btn codicon codicon-close" type="button" data-find="close" title="Fermer (Échap)"></button>
            </div>
            <div class="vs-readonly-hover" hidden>Impossible de modifier dans l'éditeur en lecture seule</div>
            <div class="vs-link-hover" hidden>Suivre le lien (ctrl + clic)</div>
        </div>`);

    const scroller = element.querySelector('.vs-code-scroll');
    const linesEl = element.querySelector('.vs-code-lines');
    const canvas = element.querySelector('canvas');
    const slider = element.querySelector('.vs-minimap-slider');
    const hover = element.querySelector('.vs-readonly-hover');

    linesEl.innerHTML = lines.map((line, i) => `
        <div class="vs-row${added.has(i) ? ' is-added' : ''}${modified.has(i) ? ' is-modified' : ''}" data-line="${i}">
            <span class="vs-gutter"><span class="vs-ln">${i + 1}</span>${foldRanges.has(i) ? '<span class="vs-fold codicon codicon-chevron-down" data-fold="' + i + '"></span>' : ''}</span>
            <span class="vs-code-line">${line || ''}</span>
        </div>`).join('');

    const rows = [...linesEl.children];
    const caret = el('<span class="vs-caret" aria-hidden="true"></span>');
    const cursor = { line: 0, col: 0 };
    const folded = new Set();

    /* ---------------- Curseur ---------------- */
    function lineText(index) {
        return plain[index] ?? '';
    }

    function placeCaret(line, col, { reveal = true } = {}) {
        line = clamp(line, 0, rows.length - 1);
        col = clamp(col, 0, lineText(line).length);
        cursor.line = line;
        cursor.col = col;

        const parent = caret.parentNode;
        caret.remove();
        parent?.normalize();

        const codeLine = rows[line].querySelector('.vs-code-line');
        const walker = document.createTreeWalker(codeLine, NodeFilter.SHOW_TEXT);
        let remaining = col;
        let node = walker.nextNode();
        while (node && remaining > node.length) {
            remaining -= node.length;
            node = walker.nextNode();
        }
        if (node) {
            const range = document.createRange();
            range.setStart(node, Math.min(remaining, node.length));
            range.insertNode(caret);
        } else {
            codeLine.append(caret);
        }
        caret.classList.remove('is-blinking');
        void caret.offsetWidth;
        caret.classList.add('is-blinking');

        rows.forEach((row, i) => row.classList.toggle('is-current', i === line));
        paintWordHighlight();
        if (find.open) paintFind();
        drawOverview();
        if (reveal) {
            const rowTop = rows[line].offsetTop;
            const rowBottom = rowTop + rows[line].offsetHeight;
            if (rowTop < scroller.scrollTop) scroller.scrollTop = rowTop;
            else if (rowBottom > scroller.scrollTop + scroller.clientHeight) scroller.scrollTop = rowBottom - scroller.clientHeight;
        }
        onCursor?.({ line: line + 1, col: col + 1 });
    }

    function positionFromPoint(x, y) {
        let node;
        let offset;
        if (document.caretPositionFromPoint) {
            const pos = document.caretPositionFromPoint(x, y);
            node = pos?.offsetNode;
            offset = pos?.offset;
        } else if (document.caretRangeFromPoint) {
            const range = document.caretRangeFromPoint(x, y);
            node = range?.startContainer;
            offset = range?.startOffset;
        }
        const row = (node?.nodeType === 3 ? node.parentElement : node)?.closest?.('.vs-row');
        if (!row || !node) return null;
        const codeLine = row.querySelector('.vs-code-line');
        if (!codeLine.contains(node)) return { line: Number(row.dataset.line), col: x > codeLine.getBoundingClientRect().left ? Infinity : 0 };
        const range = document.createRange();
        range.setStart(codeLine, 0);
        range.setEnd(node, offset);
        return { line: Number(row.dataset.line), col: range.toString().length };
    }

    element.addEventListener('mouseup', (event) => {
        if (event.button !== 0 || event.target.closest('.vs-minimap, .vs-fold, .vs-find, .vs-sticky')) return;
        if (event.target.closest('.tk-link') && (event.ctrlKey || event.metaKey || coarsePointer)) return;
        const selection = window.getSelection();
        if (selection && !selection.isCollapsed && element.contains(selection.anchorNode)) {
            // « Ln 4, Col 12 (18 sélectionnés) », comme la barre d'état de VS Code
            onCursor?.({ line: cursor.line + 1, col: cursor.col + 1, selected: selection.toString().replace(/\r/g, '').length });
            return;
        }
        const row = event.target.closest('.vs-row');
        if (!row) return;
        const pos = positionFromPoint(event.clientX, event.clientY) ?? { line: Number(row.dataset.line), col: Infinity };
        placeCaret(pos.line, pos.col === Infinity ? lineText(pos.line).length : pos.col, { reveal: false });
        element.focus({ preventScroll: true });
    });

    element.addEventListener('keydown', (event) => {
        if (event.target.closest('.vs-find')) return;
        element.classList.toggle('is-ctrl', event.key === 'Control' || event.ctrlKey);
        if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'f') {
            event.preventDefault();
            openFind();
            return;
        }
        if (event.key === 'F3') {
            event.preventDefault();
            if (!find.query) openFind();
            else step(event.shiftKey ? -1 : 1);
            return;
        }
        if (event.key === 'Escape' && find.open) {
            closeFind();
            return;
        }
        if (event.key === 'F12') {
            event.preventDefault();
            noDefinition();
            return;
        }
        const { line, col } = cursor;
        const pageLines = Math.floor(scroller.clientHeight / (rows[0]?.offsetHeight || 19));
        const keys = {
            ArrowLeft: () => (col > 0 ? placeCaret(line, col - 1) : placeCaret(line - 1, Infinity)),
            ArrowRight: () => (col < lineText(line).length ? placeCaret(line, col + 1) : line < rows.length - 1 && placeCaret(line + 1, 0)),
            ArrowUp: () => placeCaret(nextVisible(line, -1), col),
            ArrowDown: () => placeCaret(nextVisible(line, 1), col),
            Home: () => placeCaret(event.ctrlKey ? 0 : line, event.ctrlKey ? 0 : (col === lineText(line).search(/\S|$/) ? 0 : lineText(line).search(/\S|$/))),
            End: () => placeCaret(event.ctrlKey ? rows.length - 1 : line, Infinity),
            PageDown: () => placeCaret(line + pageLines, col),
            PageUp: () => placeCaret(line - pageLines, col),
        };
        if (keys[event.key] && !event.shiftKey) {
            event.preventDefault();
            keys[event.key]();
            return;
        }
        if (event.key === 'a' && (event.ctrlKey || event.metaKey)) {
            event.preventDefault();
            const range = document.createRange();
            range.selectNodeContents(linesEl);
            window.getSelection().removeAllRanges();
            window.getSelection().addRange(range);
            return;
        }
        const editing = (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) || ['Backspace', 'Delete', 'Enter', 'Tab'].includes(event.key);
        if (editing) {
            event.preventDefault();
            showReadOnly();
        }
    });

    function nextVisible(line, step) {
        let next = line + step;
        while (next > 0 && next < rows.length - 1 && rows[next].hidden) next += step;
        return next;
    }

    let hoverTimer;
    function showReadOnly(message) {
        if (message) hover.textContent = message;
        else {
            hover.textContent = 'Impossible de modifier dans l\'éditeur en lecture seule';
            onReadOnly?.();
        }
        const caretRect = caret.getBoundingClientRect();
        const box = element.getBoundingClientRect();
        hover.hidden = false;
        hover.style.left = `${Math.max(8, caretRect.left - box.left)}px`;
        hover.style.top = `${Math.max(4, caretRect.top - box.top - 30)}px`;
        clearTimeout(hoverTimer);
        hoverTimer = setTimeout(() => { hover.hidden = true; }, 1800);
    }

    /* ---------------- Liens et repliage ---------------- */
    element.addEventListener('click', (event) => {
        const link = event.target.closest('.tk-link');
        // Comme dans VS Code : un lien de l'éditeur se suit avec Ctrl+clic (simple toucher sur mobile).
        if (link && (event.ctrlKey || event.metaKey || coarsePointer)) {
            linkHover.hidden = true;
            if (link.dataset.href) onOpenLink?.(link.dataset.href);
            else if (link.dataset.file) onOpenFile?.(link.dataset.file);
        }

        const fold = event.target.closest('[data-fold]');
        if (fold) toggleFold(Number(fold.dataset.fold));
    });

    function toggleFold(start) {
        const end = foldRanges.get(start);
        const collapse = !folded.has(start);
        if (collapse) folded.add(start);
        else folded.delete(start);
        rows[start].classList.toggle('is-folded', collapse);
        stickyLines = [];
        for (let i = start + 1; i <= end; i++) {
            if (collapse) rows[i].hidden = true;
            else {
                // Ne ré-affiche pas les lignes d'un sous-bloc encore replié
                const hiddenByChild = [...folded].some((s) => s > start && s < i && foldRanges.get(s) >= i);
                rows[i].hidden = hiddenByChild;
            }
        }
        drawMinimap();
        updateSticky();
    }

    /* ---------------- Minimap ---------------- */
    const MINI_LINE = 2;
    const MINI_CHAR = 1;
    function drawMinimap() {
        if (!settings.minimap) return;
        const style = getComputedStyle(element);
        const dpr = window.devicePixelRatio || 1;
        const visibleRows = rows.map((row, i) => (row.hidden ? null : i)).filter((i) => i !== null);
        const width = canvas.parentElement.clientWidth || 60;
        const height = Math.max(visibleRows.length * MINI_LINE, 1);
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
        const ctx = canvas.getContext('2d');
        ctx.scale(dpr, dpr);
        const colorCache = {};
        const colorOf = (type) => {
            if (!(type in colorCache)) {
                const name = type.startsWith('bracket') ? '--vs-tk-bracket-1' : TOKEN_VARS[type] ?? '--vs-editor-fg';
                colorCache[type] = style.getPropertyValue(name).trim() || '#888';
            }
            return colorCache[type];
        };
        ctx.globalAlpha = 0.75;
        visibleRows.forEach((lineIndex, y) => {
            let x = 0;
            tokens[lineIndex].forEach((token) => {
                const text = token.text;
                ctx.fillStyle = colorOf(token.type);
                for (let i = 0; i < text.length; i++) {
                    if (text[i] !== ' ') ctx.fillRect(x, y * MINI_LINE, MINI_CHAR, MINI_LINE - 0.6);
                    x += MINI_CHAR;
                }
            });
        });
        updateSlider();
    }

    function updateSlider() {
        const rowHeight = rows[0]?.offsetHeight || 19;
        const ratio = MINI_LINE / rowHeight;
        slider.style.top = `${scroller.scrollTop * ratio}px`;
        slider.style.height = `${Math.max(10, scroller.clientHeight * ratio)}px`;
    }

    scroller.addEventListener('scroll', () => {
        updateSlider();
        updateSticky();
        element.classList.toggle('is-scrolled', scroller.scrollTop > 0);
    }, { passive: true });

    const minimap = element.querySelector('.vs-minimap');
    minimap.addEventListener('pointerdown', (event) => {
        event.preventDefault();
        const rowHeight = rows[0]?.offsetHeight || 19;
        const ratio = rowHeight / MINI_LINE;
        const top = minimap.getBoundingClientRect().top;
        const scrollTo = (clientY) => {
            scroller.scrollTop = (clientY - top) * ratio - scroller.clientHeight / 2;
        };
        scrollTo(event.clientY);
        const onMove = (move) => scrollTo(move.clientY);
        const onUp = () => {
            document.removeEventListener('pointermove', onMove);
            document.removeEventListener('pointerup', onUp);
        };
        document.addEventListener('pointermove', onMove);
        document.addEventListener('pointerup', onUp);
    });

    /* ---------------- Survol des liens ---------------- */
    const linkHover = element.querySelector('.vs-link-hover');
    let linkTimer;
    element.addEventListener('pointermove', (event) => {
        element.classList.toggle('is-ctrl', event.ctrlKey || event.metaKey);
    });
    element.addEventListener('keyup', (event) => {
        if (event.key === 'Control' || event.key === 'Meta') element.classList.remove('is-ctrl');
    });
    element.addEventListener('pointerover', (event) => {
        const link = event.target.closest('.tk-link');
        clearTimeout(linkTimer);
        if (!link || coarsePointer) {
            if (!event.target.closest('.vs-link-hover')) linkHover.hidden = true;
            return;
        }
        linkTimer = setTimeout(() => {
            const rect = link.getBoundingClientRect();
            const box = element.getBoundingClientRect();
            linkHover.hidden = false;
            linkHover.style.left = `${Math.max(8, rect.left - box.left)}px`;
            linkHover.style.top = `${Math.max(4, rect.top - box.top - linkHover.offsetHeight - 2)}px`;
        }, 300);
    });
    element.addEventListener('pointerleave', () => {
        clearTimeout(linkTimer);
        linkHover.hidden = true;
        element.classList.remove('is-ctrl');
    });

    /* ---------------- Surlignages (plages de texte) ---------------- */
    function rangeFor(line, start, length) {
        const codeLine = rows[line]?.querySelector('.vs-code-line');
        if (!codeLine) return null;
        const walker = document.createTreeWalker(codeLine, NodeFilter.SHOW_TEXT);
        const range = document.createRange();
        let offset = 0;
        let startSet = false;
        const end = start + length;
        for (let node = walker.nextNode(); node; node = walker.nextNode()) {
            const next = offset + node.length;
            if (!startSet && start < next) { range.setStart(node, start - offset); startSet = true; }
            if (startSet && end <= next) { range.setEnd(node, end - offset); return range; }
            offset = next;
        }
        return null;
    }

    const own = { word: [], find: [], current: [] };
    function setRanges(name, ranges) {
        if (!highlights) return;
        own[name].forEach((range) => highlights[name].delete(range));
        own[name] = ranges.filter(Boolean);
        own[name].forEach((range) => highlights[name].add(range));
    }

    function wordAt(line, col) {
        const text = lineText(line);
        const re = /[\p{L}\p{N}_$]+/gu;
        for (const match of text.matchAll(re)) {
            if (col >= match.index && col <= match.index + match[0].length) return { text: match[0], start: match.index };
        }
        return null;
    }

    function paintWordHighlight() {
        const word = wordAt(cursor.line, cursor.col);
        if (!word || word.text.length < 2 || /^\d+$/.test(word.text)) { setRanges('word', []); return; }
        const re = new RegExp(`(?<![\\p{L}\\p{N}_$])${escapeRegExp(word.text)}(?![\\p{L}\\p{N}_$])`, 'gu');
        const ranges = [];
        plain.forEach((text, line) => {
            for (const match of text.matchAll(re)) if (ranges.length < 300) ranges.push(rangeFor(line, match.index, match[0].length));
        });
        setRanges('word', ranges.length > 1 ? ranges : []);
    }

    /* ---------------- Widget de recherche (Ctrl+F) ---------------- */
    const findEl = element.querySelector('.vs-find');
    const findInput = findEl.querySelector('.vs-find-input');
    const findCount = findEl.querySelector('.vs-find-count');
    const find = { open: false, query: '', caseSensitive: false, wholeWord: false, regex: false, matches: [], index: -1 };

    function searchMatches() {
        find.matches = [];
        findEl.classList.remove('is-invalid');
        if (!find.query) return;
        let re;
        try {
            const source = find.regex ? find.query : escapeRegExp(find.query);
            re = new RegExp(find.wholeWord ? `\\b(?:${source})\\b` : source, `g${find.caseSensitive ? '' : 'i'}u`);
        } catch {
            findEl.classList.add('is-invalid');
            return;
        }
        plain.forEach((text, line) => {
            for (const match of text.matchAll(re)) {
                if (match[0].length && find.matches.length < 1999) find.matches.push({ line, start: match.index, length: match[0].length });
            }
        });
    }

    function paintFind() {
        const current = find.matches[find.index];
        setRanges('find', find.open ? find.matches.filter((m) => m !== current).map((m) => rangeFor(m.line, m.start, m.length)) : []);
        setRanges('current', find.open && current ? [rangeFor(current.line, current.start, current.length)] : []);
        const total = find.matches.length;
        findCount.textContent = !find.query ? 'Aucun résultat' : total ? `${find.index + 1 || '?'} sur ${total}${total >= 1999 ? '+' : ''}` : 'Aucun résultat';
        findEl.classList.toggle('no-results', !!find.query && !total);
    }

    function nearestMatch() {
        const index = find.matches.findIndex((m) => m.line > cursor.line || (m.line === cursor.line && m.start >= cursor.col));
        return index === -1 ? 0 : index;
    }

    function goToMatch(index) {
        if (!find.matches.length) { find.index = -1; paintFind(); drawOverview(); return; }
        find.index = (index + find.matches.length) % find.matches.length;
        const match = find.matches[find.index];
        // Déplie le bloc qui contiendrait la correspondance
        [...folded].forEach((start) => { if (start < match.line && foldRanges.get(start) >= match.line) toggleFold(start); });
        placeCaret(match.line, match.start + match.length, { reveal: false });
        const row = rows[match.line];
        if (row.offsetTop < scroller.scrollTop + stickyHeight() || row.offsetTop + row.offsetHeight > scroller.scrollTop + scroller.clientHeight) {
            scroller.scrollTop = Math.max(0, row.offsetTop - scroller.clientHeight / 2);
        }
        const range = rangeFor(match.line, match.start, match.length);
        if (range) {
            const box = element.getBoundingClientRect();
            const rect = range.getBoundingClientRect();
            const findBox = findEl.getBoundingClientRect();
            if (rect.right > findBox.left - 10 && rect.top < findBox.bottom) scroller.scrollLeft += rect.right - (findBox.left - 40);
            else if (rect.left < box.left + 80) scroller.scrollLeft = 0;
        }
    }

    function step(direction) {
        if (!find.matches.length) return;
        if (find.index === -1) goToMatch(direction > 0 ? nearestMatch() : nearestMatch() - 1);
        else goToMatch(find.index + direction);
    }

    function openFind() {
        const selection = window.getSelection()?.toString();
        const seed = selection && !selection.includes('\n') && element.contains(window.getSelection().anchorNode) ? selection : wordAt(cursor.line, cursor.col)?.text;
        find.open = true;
        findEl.hidden = false;
        requestAnimationFrame(() => findEl.classList.add('is-visible'));
        if (seed) findInput.value = seed;
        findInput.focus();
        findInput.select();
        onFindInput(false);
    }

    function closeFind() {
        find.open = false;
        findEl.classList.remove('is-visible');
        setTimeout(() => { if (!find.open) findEl.hidden = true; }, 150);
        paintFind();
        drawOverview();
        element.focus({ preventScroll: true });
    }

    function onFindInput(move = true) {
        find.query = findInput.value;
        searchMatches();
        find.index = -1;
        if (find.matches.length && move) goToMatch(nearestMatch());
        else if (find.matches.length) {
            const index = find.matches.findIndex((m) => m.line === cursor.line && m.start <= cursor.col && m.start + m.length >= cursor.col);
            find.index = index;
        }
        paintFind();
        drawOverview();
    }

    findInput.addEventListener('input', () => onFindInput());
    findInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === 'F3') { event.preventDefault(); step(event.shiftKey ? -1 : 1); }
        else if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); closeFind(); }
        else if (event.altKey && ['c', 'w', 'r'].includes(event.key.toLowerCase())) {
            event.preventDefault();
            findEl.querySelector(`[data-opt="${{ c: 'caseSensitive', w: 'wholeWord', r: 'regex' }[event.key.toLowerCase()]}"]`).click();
        } else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'f') {
            event.preventDefault();
            findInput.select();
        }
    });
    findEl.addEventListener('click', (event) => {
        const option = event.target.closest('[data-opt]');
        if (option) {
            find[option.dataset.opt] = !find[option.dataset.opt];
            option.classList.toggle('is-checked', find[option.dataset.opt]);
            option.setAttribute('aria-pressed', String(find[option.dataset.opt]));
            onFindInput();
            findInput.focus();
        }
        const action = event.target.closest('[data-find]')?.dataset.find;
        if (action === 'next') step(1);
        if (action === 'prev') step(-1);
        if (action === 'close') closeFind();
    });

    /* ---------------- Défilement « sticky » ---------------- */
    const sticky = element.querySelector('.vs-sticky');
    const MAX_STICKY = 5;
    let stickyLines = [];
    const stickyHeight = () => stickyLines.length * (rows[0]?.offsetHeight || 19);

    function updateSticky() {
        const rowHeight = rows[0]?.offsetHeight || 19;
        const lines = [];
        if (settings.stickyScroll !== false && scroller.scrollTop > 0) {
            // Un bloc reste épinglé tant que sa ligne d'ouverture est au-dessus de son emplacement
            // et que sa fin n'est pas encore passée sous la zone épinglée.
            for (const [start, end] of foldRanges) {
                if (lines.length >= MAX_STICKY) break;
                if (rows[start].hidden) continue;
                const slotTop = scroller.scrollTop + lines.length * rowHeight;
                if (rows[start].offsetTop < slotTop && rows[end].offsetTop + rowHeight > slotTop) lines.push(start);
            }
        }
        if (lines.join() !== stickyLines.join()) {
            stickyLines = lines;
            sticky.replaceChildren(...lines.map((index) => {
                const clone = rows[index].cloneNode(true);
                clone.querySelector('.vs-caret')?.remove();
                clone.querySelector('.vs-fold')?.remove();
                clone.classList.remove('is-current', 'is-flash', 'is-added', 'is-modified');
                clone.classList.add('vs-sticky-row');
                clone.dataset.sticky = index;
                return clone;
            }));
            sticky.hidden = !lines.length;
            element.classList.toggle('has-sticky', lines.length > 0);
        }
        if (!lines.length) return;
        // La dernière ligne est « poussée » vers le haut quand son bloc se termine.
        const last = lines[lines.length - 1];
        const endBottom = rows[foldRanges.get(last)].offsetTop + rowHeight - scroller.scrollTop;
        const push = Math.min(0, endBottom - lines.length * rowHeight);
        sticky.lastElementChild.style.transform = push ? `translateY(${push}px)` : '';
        sticky.style.width = `${scroller.clientWidth}px`;
        sticky.scrollLeft = scroller.scrollLeft;
    }

    sticky.addEventListener('click', (event) => {
        const row = event.target.closest('[data-sticky]');
        if (!row) return;
        const index = Number(row.dataset.sticky);
        const position = stickyLines.indexOf(index);
        scroller.scrollTop = rows[index].offsetTop - position * (rows[0]?.offsetHeight || 19);
        placeCaret(index, lineText(index).search(/\S|$/), { reveal: false });
        element.focus({ preventScroll: true });
    });

    /* ---------------- Règle d'aperçu (overview ruler) ---------------- */
    const overview = element.querySelector('.vs-overview');
    function drawOverview() {
        const total = rows.length || 1;
        const mark = (line, kind) => `<i class="ov-${kind}" style="top:${(line / total) * 100}%"></i>`;
        const marks = [];
        added.forEach((line) => marks.push(mark(line, 'added')));
        modified.forEach((line) => marks.push(mark(line, 'modified')));
        if (find.open) find.matches.slice(0, 500).forEach((m) => marks.push(mark(m.line, 'find')));
        marks.push(mark(cursor.line, 'cursor'));
        overview.innerHTML = marks.join('');
    }

    /* ---------------- Menu contextuel de l'éditeur ---------------- */
    function noDefinition() {
        const word = wordAt(cursor.line, cursor.col)?.text;
        showReadOnly(word ? `Aucune définition trouvée pour « ${word} »` : 'Aucune définition trouvée');
    }

    element.addEventListener('contextmenu', (event) => {
        if (!event.target.closest('.vs-code-scroll')) return;
        event.preventDefault();
        const selection = window.getSelection();
        const hasSelection = selection && !selection.isCollapsed && element.contains(selection.anchorNode);
        if (!hasSelection) {
            const pos = positionFromPoint(event.clientX, event.clientY);
            if (pos) placeCaret(pos.line, pos.col === Infinity ? lineText(pos.line).length : pos.col, { reveal: false });
        }
        const word = wordAt(cursor.line, cursor.col)?.text ?? '';
        const copy = () => navigator.clipboard?.writeText(hasSelection ? selection.toString() : `${lineText(cursor.line)}\n`);
        showContextMenu({
            x: event.clientX,
            y: event.clientY,
            variant: 'vscode',
            items: [
                { label: 'Atteindre la définition', shortcut: 'F12', action: noDefinition },
                { label: 'Atteindre les références', shortcut: 'Maj+F12', action: noDefinition },
                {
                    label: 'Aperçu',
                    submenu: [
                        { label: 'Aperçu de la définition', shortcut: 'Alt+F12', action: noDefinition },
                        { label: 'Aperçu des références', action: noDefinition },
                    ],
                },
                { separator: true },
                { label: 'Rechercher toutes les références', shortcut: 'Maj+Alt+F12', disabled: !word, action: () => onCommand?.('search', word) },
                { separator: true },
                { label: 'Renommer le symbole', shortcut: 'F2', action: () => showReadOnly() },
                { label: 'Modifier toutes les occurrences', shortcut: 'Ctrl+F2', action: () => showReadOnly() },
                { label: 'Mettre en forme le document', shortcut: 'Maj+Alt+F', action: () => showReadOnly() },
                { label: 'Refactoriser...', shortcut: 'Ctrl+Maj+R', disabled: true },
                { label: 'Action de la source...', disabled: true },
                { separator: true },
                { label: 'Couper', shortcut: 'Ctrl+X', action: () => showReadOnly() },
                { label: 'Copier', shortcut: 'Ctrl+C', action: copy },
                { label: 'Coller', shortcut: 'Ctrl+V', action: () => showReadOnly() },
                { separator: true },
                { label: 'Rechercher', shortcut: 'Ctrl+F', action: openFind },
                { label: 'Palette de commandes...', shortcut: 'Ctrl+Maj+P', action: () => onCommand?.('workbench.action.showCommands') },
            ],
        });
    });

    function applySettings() {
        element.classList.toggle('is-wrapped', settings.wordWrap === 'on' || (settings.wordWrap === 'auto' && file.language === 'markdown'));
        element.classList.toggle('has-minimap', !!settings.minimap);
        element.style.setProperty('--editor-font-size', `${settings.fontSize}px`);
        stickyLines = [];
        requestAnimationFrame(() => { drawMinimap(); updateSticky(); drawOverview(); });
    }

    applySettings();

    return {
        element,
        tabSize,
        get cursor() { return { line: cursor.line + 1, col: cursor.col + 1 }; },
        focus: () => element.focus({ preventScroll: true }),
        openFind,
        dispose: () => { setRanges('word', []); setRanges('find', []); setRanges('current', []); },
        placeCaret: (line, col) => placeCaret(line, col),
        revealLine(line, highlightLine = false) {
            const index = clamp(line - 1, 0, rows.length - 1);
            placeCaret(index, 0, { reveal: false });
            scroller.scrollTop = Math.max(0, rows[index].offsetTop - scroller.clientHeight / 3);
            if (highlightLine) {
                rows[index].classList.remove('is-flash');
                void rows[index].offsetWidth;
                rows[index].classList.add('is-flash');
            }
        },
        highlightRange(line, start, length) {
            const index = clamp(line - 1, 0, rows.length - 1);
            this.revealLine(line);
            const codeLine = rows[index].querySelector('.vs-code-line');
            const walker = document.createTreeWalker(codeLine, NodeFilter.SHOW_TEXT);
            let offset = start;
            let node = walker.nextNode();
            while (node && offset >= node.length) {
                offset -= node.length;
                node = walker.nextNode();
            }
            if (!node) return;
            const range = document.createRange();
            range.setStart(node, offset);
            range.setEnd(node, Math.min(node.length, offset + length));
            window.getSelection().removeAllRanges();
            window.getSelection().addRange(range);
        },
        applySettings,
        redraw: drawMinimap,
        foldAll() { [...foldRanges.keys()].reverse().forEach((line) => !folded.has(line) && toggleFold(line)); },
        unfoldAll() { [...folded].forEach((line) => toggleFold(line)); },
    };
}
