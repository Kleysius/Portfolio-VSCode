/**
 * Rendu Markdown minimal pour l'aperçu (titres, listes, citations, tableaux, liens, code…).
 */
import { escapeHtml } from '../../core/dom.js';

function inline(text) {
    return escapeHtml(text)
        .replace(/`([^`]+)`/g, '<code>$1</code>')
        .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
        .replace(/\*([^*\s][^*]*)\*/g, '<em>$1</em>')
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label, href) => (/^https?:/.test(href)
            ? `<a href="${href}" data-href="${href}">${label}</a>`
            : `<a href="#" data-file="${href}">${label}</a>`));
}

const slug = (text) => text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w]+/g, '-').replace(/^-|-$/g, '');

export function renderMarkdown(source) {
    const lines = source.replace(/\r\n/g, '\n').split('\n');
    const out = [];
    let i = 0;

    while (i < lines.length) {
        const line = lines[i];

        if (/^```/.test(line)) {
            const code = [];
            i++;
            while (i < lines.length && !/^```/.test(lines[i])) code.push(lines[i++]);
            i++;
            out.push(`<pre><code>${escapeHtml(code.join('\n'))}</code></pre>`);
            continue;
        }

        const heading = line.match(/^(#{1,6})\s+(.*)$/);
        if (heading) {
            const level = heading[1].length;
            out.push(`<h${level} id="${slug(heading[2])}" data-line="${i}">${inline(heading[2])}</h${level}>`);
            i++;
            continue;
        }

        if (/^(-{3,}|\*{3,})\s*$/.test(line)) {
            out.push('<hr>');
            i++;
            continue;
        }

        if (/^>/.test(line)) {
            const quote = [];
            while (i < lines.length && /^>/.test(lines[i])) quote.push(lines[i++].replace(/^>\s?/, ''));
            out.push(`<blockquote><p>${inline(quote.join(' '))}</p></blockquote>`);
            continue;
        }

        if (/^\s*([-*+]|\d+\.)\s/.test(line)) {
            const ordered = /^\s*\d+\./.test(line);
            const items = [];
            while (i < lines.length && /^\s*([-*+]|\d+\.)\s/.test(lines[i])) {
                items.push(`<li>${inline(lines[i].replace(/^\s*([-*+]|\d+\.)\s/, ''))}</li>`);
                i++;
            }
            out.push(`<${ordered ? 'ol' : 'ul'}>${items.join('')}</${ordered ? 'ol' : 'ul'}>`);
            continue;
        }

        if (/^\|/.test(line) && /^\|?\s*:?-{3,}/.test(lines[i + 1] ?? '')) {
            const cells = (row) => row.replace(/^\||\|$/g, '').split('|').map((cell) => cell.trim());
            const head = cells(line);
            i += 2;
            const rows = [];
            while (i < lines.length && /^\|/.test(lines[i])) rows.push(cells(lines[i++]));
            out.push(`<table><thead><tr>${head.map((cell) => `<th>${inline(cell)}</th>`).join('')}</tr></thead><tbody>${rows.map((row) => `<tr>${row.map((cell) => `<td>${inline(cell)}</td>`).join('')}</tr>`).join('')}</tbody></table>`);
            continue;
        }

        if (!line.trim()) {
            i++;
            continue;
        }

        const paragraph = [];
        while (i < lines.length && lines[i].trim() && !/^(#{1,6}\s|>|```|\s*([-*+]|\d+\.)\s|\||-{3,})/.test(lines[i])) paragraph.push(lines[i++]);
        out.push(`<p>${inline(paragraph.join(' '))}</p>`);
    }

    return out.join('\n');
}

/** Titres (pour la vue Structure / les fils d'Ariane). */
export function markdownOutline(source) {
    return source.split('\n')
        .map((line, index) => ({ match: line.match(/^(#{1,6})\s+(.*)$/), index }))
        .filter(({ match }) => match)
        .map(({ match, index }) => ({ level: match[1].length, text: match[2], line: index + 1 }));
}
