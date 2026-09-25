/**
 * Coloration syntaxique maison (HTML, Markdown, TypeScript/JavaScript, JSON, .gitignore)
 * avec colorisation des paires de crochets, guides d'indentation et liens cliquables.
 *
 * Chaque langage expose `tokenize(line, state) → { tokens: [{ type, text }], state }`.
 */
import { escapeHtml } from '../../core/dom.js';

/* ------------------------------------------------------------------ */
/* Moteur générique à base de règles (expressions régulières « sticky ») */
/* ------------------------------------------------------------------ */
function runRules(line, rules, state, tokens = []) {
    let pos = 0;
    let text = '';
    const flush = () => {
        if (text) tokens.push({ type: 'text', text });
        text = '';
    };
    outer: while (pos < line.length) {
        for (const rule of rules) {
            rule.re.lastIndex = pos;
            const match = rule.re.exec(line);
            if (!match || match[0] === '' || match.index !== pos) continue;
            flush();
            const type = typeof rule.type === 'function' ? rule.type(match, line, pos, state) : rule.type;
            if (Array.isArray(type)) tokens.push(...type);
            else tokens.push({ type, text: match[0] });
            if (rule.next) state = { ...state, mode: rule.next };
            pos += match[0].length;
            continue outer;
        }
        text += line[pos++];
    }
    flush();
    return { tokens, state };
}

/* ------------------------------------------------------------------ */
/* TypeScript / JavaScript                                              */
/* ------------------------------------------------------------------ */
const TS_CONTROL = new Set(['import', 'export', 'from', 'return', 'if', 'else', 'for', 'while', 'do', 'switch', 'case', 'break', 'continue', 'throw', 'try', 'catch', 'finally', 'await', 'default']);
const TS_KEYWORDS = new Set(['const', 'let', 'var', 'function', 'type', 'interface', 'extends', 'implements', 'new', 'class', 'this', 'void', 'keyof', 'typeof', 'in', 'of', 'as', 'async', 'public', 'private', 'readonly', 'enum', 'true', 'false', 'null', 'undefined']);
const TS_TYPES = new Set(['string', 'number', 'boolean', 'any', 'unknown', 'never', 'object', 'Record', 'Array', 'Promise']);

const tsRules = [
    { re: /\/\/.*/y, type: 'comment' },
    { re: /\/\*/y, type: 'comment', next: 'comment' },
    { re: /(["'])(?:\\.|(?!\1).)*\1/y, type: 'string' },
    { re: /`(?:\\.|[^`])*`/y, type: 'string' },
    { re: /\b\d+(?:\.\d+)?\b/y, type: 'number' },
    {
        re: /[A-Za-z_$][\w$]*/y,
        type: (match, line, pos) => {
            const word = match[0];
            const after = line.slice(pos + word.length);
            if (TS_CONTROL.has(word)) return 'keyword-control';
            if (TS_KEYWORDS.has(word)) return 'keyword';
            if (TS_TYPES.has(word) || /^[A-Z]/.test(word)) return 'type';
            if (/^\s*\(/.test(after)) return 'function';
            if (/^\??\s*:/.test(after) && /^\s*[\w$]*$/.test(line.slice(0, pos).replace(/.*[{,(]/, ''))) return 'property';
            return 'variable';
        },
    },
    { re: /=>|===|!==|[=+\-*/%<>!&|?:]+/y, type: 'operator' },
    { re: /[{}()[\]]/y, type: 'bracket' },
    { re: /[;,.]/y, type: 'punctuation' },
];

function tokenizeBlockComment(line, state, rules) {
    const end = line.indexOf('*/');
    if (end === -1) return { tokens: [{ type: 'comment', text: line }], state };
    const head = { type: 'comment', text: line.slice(0, end + 2) };
    const rest = runRules(line.slice(end + 2), rules, { ...state, mode: null });
    return { tokens: [head, ...rest.tokens], state: rest.state };
}

function tsTokenize(line, state = {}) {
    if (state.mode === 'comment') return tokenizeBlockComment(line, state, tsRules);
    const result = runRules(line, tsRules, { ...state });
    // Les commentaires de bloc ouverts sur la ligne : on les étend
    const openIndex = result.tokens.findIndex((t) => t.type === 'comment' && t.text === '/*');
    if (openIndex !== -1) {
        const before = result.tokens.slice(0, openIndex);
        const consumed = before.reduce((n, t) => n + t.text.length, 0);
        const rest = line.slice(consumed);
        const end = rest.indexOf('*/', 2);
        if (end === -1) return { tokens: [...before, { type: 'comment', text: rest }], state: { mode: 'comment' } };
        const tail = runRules(rest.slice(end + 2), tsRules, {});
        return { tokens: [...before, { type: 'comment', text: rest.slice(0, end + 2) }, ...tail.tokens], state: {} };
    }
    return { tokens: result.tokens, state: { ...result.state, mode: null } };
}

/* ------------------------------------------------------------------ */
/* JSON                                                                 */
/* ------------------------------------------------------------------ */
const jsonRules = [
    { re: /"(?:\\.|[^"\\])*"(?=\s*:)/y, type: 'property' },
    { re: /"(?:\\.|[^"\\])*"/y, type: 'string' },
    { re: /-?\b\d+(?:\.\d+)?(?:[eE][+-]?\d+)?\b/y, type: 'number' },
    { re: /\b(?:true|false|null)\b/y, type: 'constant' },
    { re: /[{}[\]]/y, type: 'bracket' },
    { re: /[:,]/y, type: 'punctuation' },
];
const jsonTokenize = (line, state = {}) => runRules(line, jsonRules, state);

/* ------------------------------------------------------------------ */
/* HTML                                                                 */
/* ------------------------------------------------------------------ */
const htmlTextRules = [
    { re: /<!--/y, type: 'comment', next: 'comment' },
    { re: /<!DOCTYPE/yi, type: 'tag-punctuation', next: 'tag' },
    {
        re: /(<\/?)([A-Za-z][\w-]*)/y,
        type: (match) => [{ type: 'tag-punctuation', text: match[1] }, { type: 'tag', text: match[2] }],
        next: 'tag',
    },
    { re: /&[a-z]+;/y, type: 'constant' },
];
const htmlTagRules = [
    { re: /\/?>/y, type: 'tag-punctuation', next: null },
    { re: /[A-Za-z_:][\w:.-]*/y, type: 'attr' },
    { re: /=/y, type: 'operator' },
    { re: /"[^"]*"|'[^']*'/y, type: 'string' },
];

function htmlTokenize(line, state = {}) {
    const tokens = [];
    let rest = line;
    let mode = state.mode ?? null;
    while (rest.length) {
        if (mode === 'comment') {
            const end = rest.indexOf('-->');
            if (end === -1) {
                tokens.push({ type: 'comment', text: rest });
                return { tokens, state: { mode } };
            }
            tokens.push({ type: 'comment', text: rest.slice(0, end + 3) });
            rest = rest.slice(end + 3);
            mode = null;
            continue;
        }
        const rules = mode === 'tag' ? htmlTagRules : htmlTextRules;
        // Avance jusqu'au premier changement de mode
        let consumed = 0;
        let nextMode = mode;
        const partial = [];
        let pos = 0;
        let text = '';
        search: while (pos < rest.length) {
            for (const rule of rules) {
                rule.re.lastIndex = pos;
                const match = rule.re.exec(rest);
                if (!match || match.index !== pos || !match[0]) continue;
                if (text) partial.push({ type: 'text', text });
                text = '';
                const type = typeof rule.type === 'function' ? rule.type(match) : rule.type;
                if (Array.isArray(type)) partial.push(...type);
                else partial.push({ type, text: match[0] });
                pos += match[0].length;
                if ('next' in rule) {
                    nextMode = rule.next;
                    consumed = pos;
                    break search;
                }
                continue search;
            }
            text += rest[pos++];
        }
        if (text) partial.push({ type: 'text', text });
        tokens.push(...partial);
        if (consumed === 0) {
            rest = '';
        } else {
            rest = rest.slice(consumed);
            mode = nextMode;
        }
    }
    // Les commentaires ouverts marquent le texte « <!-- » ; on colore le reste
    return { tokens: mergeComments(tokens), state: { mode } };
}

function mergeComments(tokens) {
    const out = [];
    let inComment = false;
    for (const token of tokens) {
        if (token.type === 'comment' && token.text === '<!--') {
            inComment = true;
            out.push({ ...token });
            continue;
        }
        if (inComment) {
            out[out.length - 1].text += token.text;
            if (token.text.includes('-->')) inComment = false;
            continue;
        }
        out.push(token);
    }
    return out;
}

/* ------------------------------------------------------------------ */
/* Markdown                                                             */
/* ------------------------------------------------------------------ */
const mdInlineRules = [
    { re: /`[^`]+`/y, type: 'md-code' },
    { re: /\*\*[^*]+\*\*/y, type: 'md-bold' },
    { re: /\*[^*\s][^*]*\*/y, type: 'md-italic' },
    {
        re: /\[([^\]]+)\]\(([^)]+)\)/y,
        type: (match) => [
            { type: 'md-punctuation', text: '[' },
            { type: 'md-link-text', text: match[1] },
            { type: 'md-punctuation', text: '](' },
            { type: 'md-link-url', text: match[2] },
            { type: 'md-punctuation', text: ')' },
        ],
    },
    { re: /\|/y, type: 'md-punctuation' },
];

function mdTokenize(line, state = {}) {
    if (/^```/.test(line)) return { tokens: [{ type: 'md-code', text: line }], state: { mode: state.mode === 'fence' ? null : 'fence' } };
    if (state.mode === 'fence') return { tokens: [{ type: 'md-code', text: line }], state };

    let match = line.match(/^(#{1,6} )(.*)$/);
    if (match) return { tokens: [{ type: 'md-heading', text: match[1] }, ...runRules(match[2], mdInlineRules, {}).tokens.map((t) => ({ ...t, type: t.type === 'text' ? 'md-heading' : t.type }))], state };
    if (/^(-{3,}|\*{3,})\s*$/.test(line)) return { tokens: [{ type: 'md-hr', text: line }], state };
    if (/^\|?\s*:?-{3,}/.test(line)) return { tokens: [{ type: 'md-punctuation', text: line }], state };
    match = line.match(/^(>\s?)(.*)$/);
    if (match) return { tokens: [{ type: 'md-quote-marker', text: match[1] }, ...runRules(match[2], mdInlineRules, {}).tokens.map((t) => ({ ...t, type: t.type === 'text' ? 'md-quote' : t.type }))], state };
    match = line.match(/^(\s*)([-*+]|\d+\.)(\s)(.*)$/);
    if (match) {
        return {
            tokens: [
                ...(match[1] ? [{ type: 'text', text: match[1] }] : []),
                { type: 'md-list', text: match[2] },
                { type: 'text', text: match[3] },
                ...runRules(match[4], mdInlineRules, {}).tokens,
            ],
            state,
        };
    }
    return runRules(line, mdInlineRules, state);
}

/* ------------------------------------------------------------------ */
/* .gitignore / texte                                                   */
/* ------------------------------------------------------------------ */
const ignoreTokenize = (line) => ({ tokens: [{ type: line.trim().startsWith('#') ? 'comment' : 'text', text: line }], state: {} });
const plainTokenize = (line) => ({ tokens: [{ type: 'text', text: line }], state: {} });

const LANGUAGES = {
    typescript: tsTokenize,
    javascript: tsTokenize,
    json: jsonTokenize,
    html: htmlTokenize,
    markdown: mdTokenize,
    ignore: ignoreTokenize,
    plaintext: plainTokenize,
};

/* ------------------------------------------------------------------ */
/* Rendu HTML                                                           */
/* ------------------------------------------------------------------ */
const URL_RE = /https?:\/\/[^\s"'<>)]+/g;

function linkify(text, className, fileNames) {
    const safe = escapeHtml(text);
    let html = safe.replace(URL_RE, (url) => `<a class="tk-link" data-href="${url}" title="Suivre le lien (clic)">${url}</a>`);
    if (fileNames) {
        const bare = text.replace(/^["']|["']$/g, '');
        if (fileNames.has(bare)) {
            html = escapeHtml(text).replace(escapeHtml(bare), `<a class="tk-link" data-file="${escapeHtml(bare)}" title="Ouvrir ${escapeHtml(bare)}">${escapeHtml(bare)}</a>`);
        }
    }
    return `<span class="tk-${className}">${html}</span>`;
}

/** Découpe l'indentation en blocs pour dessiner les guides. */
function renderIndent(text, tabSize) {
    const match = text.match(/^ +/);
    if (!match) return { html: '', rest: text };
    const units = Math.floor(match[0].length / tabSize);
    const extra = match[0].length % tabSize;
    return {
        html: '<span class="indent-guide"></span>'.repeat(units).replace(/<span class="indent-guide"><\/span>/g, `<span class="indent-guide">${' '.repeat(tabSize)}</span>`) + ' '.repeat(extra),
        rest: text.slice(match[0].length),
    };
}

/**
 * Colore un fichier complet.
 * @returns {{ lines: string[], plain: string[], tokens: {type,text}[][] }}
 */
export function highlight(content, language, { tabSize = 4, fileNames = null } = {}) {
    const tokenize = LANGUAGES[language] ?? plainTokenize;
    const lines = content.replace(/\r\n/g, '\n').replace(/\n$/, '').split('\n');
    let state = {};
    let depth = 0;
    const colorizeBrackets = language !== 'markdown' && language !== 'plaintext' && language !== 'html';
    const allTokens = [];

    const rendered = lines.map((line) => {
        const result = tokenize(line, state);
        state = result.state;
        allTokens.push(result.tokens);

        let first = true;
        return result.tokens.map((token) => {
            let text = token.text;
            let prefix = '';
            if (first && token.type === 'text') {
                const indent = renderIndent(text, tabSize);
                prefix = indent.html;
                text = indent.rest;
            }
            first = false;
            if (token.type === 'bracket' && colorizeBrackets) {
                if ('}])'.includes(text)) depth = Math.max(0, depth - 1);
                const html = `<span class="tk-bracket-${depth % 3}">${escapeHtml(text)}</span>`;
                if ('{[('.includes(text)) depth++;
                return prefix + html;
            }
            if (!text) return prefix;
            if (token.type === 'string' || token.type === 'comment' || token.type === 'md-link-url') {
                return prefix + linkify(text, token.type, fileNames);
            }
            if (token.type === 'text') return prefix + escapeHtml(text);
            return `${prefix}<span class="tk-${token.type}">${escapeHtml(text)}</span>`;
        }).join('') || '';
    });

    return { lines: rendered, plain: lines, tokens: allTokens };
}

/** Détecte la taille d'indentation d'un contenu (2 ou 4 espaces). */
export function detectTabSize(content) {
    const sizes = content.split('\n').map((line) => line.match(/^ +/)?.[0].length ?? 0).filter((size) => size >= 2);
    if (!sizes.length) return 4;
    return Math.min(...sizes) === 2 ? 2 : 4;
}
