/** Thèmes de couleur disponibles (les couleurs sont définies dans vscode-themes.css). */
export const themes = [
    { id: 'dark-modern', label: 'Dark Modern', type: 'dark', group: 'thèmes sombres' },
    { id: 'dark-plus', label: 'Dark+', type: 'dark', group: 'thèmes sombres' },
    { id: 'monokai', label: 'Monokai', type: 'dark', group: 'thèmes sombres' },
    { id: 'dracula', label: 'Dracula', type: 'dark', group: 'thèmes sombres' },
    { id: 'github-dark', label: 'GitHub Dark', type: 'dark', group: 'thèmes sombres' },
    { id: 'one-dark-pro', label: 'One Dark Pro', type: 'dark', group: 'thèmes sombres' },
    { id: 'light-modern', label: 'Light Modern', type: 'light', group: 'thèmes clairs' },
    { id: 'solarized-light', label: 'Solarized Light', type: 'light', group: 'thèmes clairs' },
];

export const themeById = (id) => themes.find((theme) => theme.id === id) ?? themes[0];
