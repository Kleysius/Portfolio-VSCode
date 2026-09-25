/** Minuscule sans accents, caractère par caractère (garde les indices alignés). */
const fold = (value) => [...value.toLowerCase()].map((char) => char.normalize('NFD')[0]).join('');

/**
 * Recherche floue façon VS Code : les caractères de la requête doivent apparaître dans l'ordre.
 * Retourne `null` si pas de correspondance, sinon { score, indices }.
 */
export function fuzzyMatch(query, text) {
    if (!query) return { score: 0, indices: [] };
    const q = fold(query);
    const t = fold(text);

    // Correspondance contiguë : meilleur score
    const direct = t.indexOf(q);
    if (direct !== -1) {
        return {
            score: 1000 - direct * 2 - (t.length - q.length) * 0.1 + (direct === 0 ? 200 : 0),
            indices: [...q].map((_, i) => direct + i),
        };
    }

    const indices = [];
    let score = 0;
    let last = -1;
    for (const char of q) {
        const found = t.indexOf(char, last + 1);
        if (found === -1) return null;
        const boundary = found === 0 || /[\s._\-/:>]/.test(t[found - 1]);
        score += boundary ? 12 : 1;
        if (found === last + 1) score += 6;
        indices.push(found);
        last = found;
    }
    return { score: score - t.length * 0.05, indices };
}

/** Met en évidence les indices trouvés (retourne du HTML échappé). */
export function highlightMatches(text, indices = [], escape) {
    if (!indices.length) return escape(text);
    const set = new Set(indices);
    let out = '';
    let open = false;
    [...text].forEach((char, i) => {
        if (set.has(i) && !open) { out += '<mark>'; open = true; }
        if (!set.has(i) && open) { out += '</mark>'; open = false; }
        out += escape(char);
    });
    return open ? `${out}</mark>` : out;
}
