/** Technologies (utilisées par les compétences, les projets et la vue « Extensions » de VS Code). */
const TECH = 'assets/img/tech/';

export const technologies = {
    html: { name: 'HTML', icon: `${TECH}html.svg`, color: '#e44d26', publisher: 'W3C', description: 'Langage de balisage pour structurer les pages web.' },
    twig: { name: 'Twig', icon: `${TECH}twig.svg`, color: '#8bc34a', publisher: 'Symfony', description: 'Moteur de templates HTML flexible, rapide et sécurisé.' },
    css: { name: 'CSS', icon: `${TECH}css.svg`, color: '#1572b6', publisher: 'W3C', description: 'Feuilles de style en cascade pour la mise en forme.' },
    javascript: { name: 'JavaScript', icon: `${TECH}javascript.svg`, color: '#f7df1e', publisher: 'ECMA', description: 'Langage de programmation du web, côté client et serveur.' },
    node: { name: 'Node.js', icon: `${TECH}node-js.svg`, color: '#539e43', publisher: 'OpenJS Foundation', description: 'Environnement d\'exécution JavaScript côté serveur.' },
    express: { name: 'Express', icon: `${TECH}express-logo.svg`, color: '#ffffff', publisher: 'OpenJS Foundation', description: 'Framework web minimaliste pour Node.js.', invert: true },
    php: { name: 'PHP', icon: `${TECH}php.svg`, color: '#777bb4', publisher: 'The PHP Group', description: 'Langage de script côté serveur.' },
    tailwind: { name: 'Tailwind CSS', icon: `${TECH}tailwind.svg`, color: '#38bdf8', publisher: 'Tailwind Labs', description: 'Framework CSS utilitaire.' },
    bootstrap: { name: 'Bootstrap', color: '#7952b3', publisher: 'Bootstrap', description: 'Framework CSS de composants responsive.' },
    threejs: { name: 'Three.js', icon: `${TECH}threejs.svg`, color: '#ffffff', publisher: 'mrdoob', description: 'Bibliothèque 3D WebGL pour JavaScript.', invert: true },
    mysql: { name: 'MySQL', color: '#00758f', publisher: 'Oracle', description: 'Système de gestion de bases de données relationnelles.' },
    mongodb: { name: 'MongoDB', icon: `${TECH}mongodb-icon.svg`, color: '#4faa41', publisher: 'MongoDB Inc.', description: 'Base de données NoSQL orientée documents.' },
    git: { name: 'Git', color: '#f05032', publisher: 'Git', description: 'Gestion de versions décentralisée.' },
    vscode: { name: 'VS Code', color: '#007acc', publisher: 'Microsoft', description: 'L\'éditeur que vous êtes en train d\'imiter 😉' },
    linux: { name: 'Linux', color: '#fcc624', publisher: 'Linux Foundation', description: 'Système d\'exploitation libre.' },
    figma: { name: 'Figma', color: '#a259ff', publisher: 'Figma', description: 'Outil de design d\'interfaces collaboratif.' },
    balsamiq: { name: 'Balsamiq', color: '#cc0100', publisher: 'Balsamiq', description: 'Maquettage rapide (wireframes).' },
    wordpress: { name: 'WordPress', color: '#21759b', publisher: 'WordPress.org', description: 'Système de gestion de contenu.' },
};

export const skillGroups = [
    { id: 'languages', label: 'Langages de programmation', items: ['html', 'twig', 'css', 'javascript', 'node', 'php'] },
    { id: 'frameworks', label: 'Frameworks', items: ['bootstrap', 'tailwind', 'express'] },
    { id: 'libraries', label: 'Bibliothèques', items: ['threejs'] },
    { id: 'databases', label: 'Bases de données', items: ['mysql', 'mongodb'] },
    { id: 'tools', label: 'Outils', items: ['git', 'vscode', 'linux', 'figma', 'balsamiq'] },
    { id: 'cms', label: 'Gestion de contenu', items: ['wordpress'] },
];
