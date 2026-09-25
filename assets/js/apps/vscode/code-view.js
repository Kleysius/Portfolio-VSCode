/**
 * Éditeur de code en lecture seule : numéros de ligne, curseur, repliage (indentation),
 * décorations Git, guides d'indentation, minimap et liens cliquables.
 */
import { el, escapeHtml, clamp } from '../../core/dom.js';
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

export function createCodeView(file, { onCursor, onOpenFile, onOpenLink, onReadOnly, settings }) {
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
            <div class="vs-readonly-hover" hidden>Impossible de modifier dans l'éditeur en lecture seule</div>
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
        if (event.button !== 0 || event.target.closest('.vs-minimap, .vs-fold, .tk-link')) return;
        const selection = window.getSelection();
        if (selection && !selection.isCollapsed && element.contains(selection.anchorNode)) return;
        const row = event.target.closest('.vs-row');
        if (!row) return;
        const pos = positionFromPoint(event.clientX, event.clientY) ?? { line: Number(row.dataset.line), col: Infinity };
        placeCaret(pos.line, pos.col === Infinity ? lineText(pos.line).length : pos.col, { reveal: false });
        element.focus({ preventScroll: true });
    });

    element.addEventListener('keydown', (event) => {
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
    function showReadOnly() {
        onReadOnly?.();
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
        if (link?.dataset.href) onOpenLink?.(link.dataset.href);
        else if (link?.dataset.file) onOpenFile?.(link.dataset.file);

        const fold = event.target.closest('[data-fold]');
        if (fold) toggleFold(Number(fold.dataset.fold));
    });

    function toggleFold(start) {
        const end = foldRanges.get(start);
        const collapse = !folded.has(start);
        if (collapse) folded.add(start);
        else folded.delete(start);
        rows[start].classList.toggle('is-folded', collapse);
        for (let i = start + 1; i <= end; i++) {
            if (collapse) rows[i].hidden = true;
            else {
                // Ne ré-affiche pas les lignes d'un sous-bloc encore replié
                const hiddenByChild = [...folded].some((s) => s > start && s < i && foldRanges.get(s) >= i);
                rows[i].hidden = hiddenByChild;
            }
        }
        drawMinimap();
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

    function applySettings() {
        element.classList.toggle('is-wrapped', settings.wordWrap === 'on' || (settings.wordWrap === 'auto' && file.language === 'markdown'));
        element.classList.toggle('has-minimap', !!settings.minimap);
        element.style.setProperty('--editor-font-size', `${settings.fontSize}px`);
        requestAnimationFrame(drawMinimap);
    }

    applySettings();

    return {
        element,
        tabSize,
        get cursor() { return { line: cursor.line + 1, col: cursor.col + 1 }; },
        focus: () => element.focus({ preventScroll: true }),
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
