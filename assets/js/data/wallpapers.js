const DIR = 'assets/img/wallpapers/';

export const wallpapers = [0, 1, 2, 3, 4, 5, 6].map((index) => ({
    id: index,
    name: `Fond d'écran ${index + 1}`,
    src: `${DIR}wallpaper-${index}.webp`,
    thumb: `${DIR}wallpaper-${index}-thumb.webp`,
}));

export const accentColors = [
    '#0078d4', '#0063b1', '#8764b8', '#744da9', '#b146c2', '#e3008c',
    '#e81123', '#ca5010', '#ffb900', '#10893e', '#00b7c3', '#2d7d9a',
];
