/** Technologies (utilisées par les compétences, les projets et la vue « Extensions » de VS Code). */
const TECH = 'assets/img/tech/';

export const technologies = {
    html: { name: 'HTML', icon: `${TECH}html.svg`, color: '#e44d26', publisher: 'W3C', description: 'Langage de balisage pour structurer les pages web.' },
    css: { name: 'CSS', icon: `${TECH}css.svg`, color: '#1572b6', publisher: 'W3C', description: 'Feuilles de style en cascade pour la mise en forme.' },
    sass: { name: 'Sass', icon: `${TECH}sass.svg`, color: '#cc6699', publisher: 'Sass Team', description: 'Préprocesseur CSS : variables, mixins et imbrication.' },
    javascript: { name: 'JavaScript', icon: `${TECH}javascript.svg`, color: '#f7df1e', publisher: 'ECMA', description: 'Langage de programmation du web, côté client et serveur.' },
    typescript: { name: 'TypeScript', icon: `${TECH}typescript.svg`, color: '#3178c6', publisher: 'Microsoft', description: 'JavaScript typé, pour des bases de code plus sûres.' },
    react: { name: 'React', icon: `${TECH}react.svg`, color: '#61dafb', publisher: 'Meta', description: 'Bibliothèque d\'interfaces utilisateur à base de composants.' },
    vite: { name: 'Vite', icon: `${TECH}vite.svg`, color: '#9135ff', publisher: 'VoidZero', description: 'Outil de build et serveur de développement ultra-rapide.' },
    tailwind: { name: 'Tailwind CSS', icon: `${TECH}tailwind.svg`, color: '#38bdf8', publisher: 'Tailwind Labs', description: 'Framework CSS utilitaire.' },
    bootstrap: { name: 'Bootstrap', icon: `${TECH}bootstrap.svg`, color: '#7952b3', publisher: 'Bootstrap', description: 'Framework CSS de composants responsive.' },
    twig: { name: 'Twig', icon: `${TECH}twig.svg`, color: '#8bc34a', publisher: 'Symfony', description: 'Moteur de templates HTML flexible, rapide et sécurisé.' },
    node: { name: 'Node.js', icon: `${TECH}node-js.svg`, color: '#539e43', publisher: 'OpenJS Foundation', description: 'Environnement d\'exécution JavaScript côté serveur.' },
    express: { name: 'Express', icon: `${TECH}express-logo.svg`, color: '#ffffff', publisher: 'OpenJS Foundation', description: 'Framework web minimaliste pour Node.js.', invert: true },
    php: { name: 'PHP', icon: `${TECH}php.svg`, color: '#777bb4', publisher: 'The PHP Group', description: 'Langage de script côté serveur.' },
    laravel: { name: 'Laravel', icon: `${TECH}laravel.svg`, color: '#ff2d20', publisher: 'Laravel', description: 'Framework PHP élégant pour les applications web.' },
    python: { name: 'Python', icon: `${TECH}python.svg`, color: '#3776ab', publisher: 'Python Software Foundation', description: 'Langage polyvalent : scripts, données, automatisation.' },
    postgresql: { name: 'PostgreSQL', icon: `${TECH}postgresql.svg`, color: '#4169e1', publisher: 'PostgreSQL Global Development Group', description: 'Base de données relationnelle avancée.' },
    supabase: { name: 'Supabase', icon: `${TECH}supabase.svg`, color: '#3fcf8e', publisher: 'Supabase', description: 'Backend Postgres : authentification, Row Level Security, stockage.' },
    prisma: { name: 'Prisma', icon: `${TECH}prisma.svg`, color: '#2d3748', publisher: 'Prisma Data', description: 'ORM typé pour Node.js et PostgreSQL.', invert: true },
    mysql: { name: 'MySQL', icon: `${TECH}mysql.svg`, color: '#4479a1', publisher: 'Oracle', description: 'Système de gestion de bases de données relationnelles.' },
    sqlite: { name: 'SQLite', icon: `${TECH}sqlite.svg`, color: '#003b57', publisher: 'SQLite', description: 'Base de données embarquée, légère et sans serveur.', invert: true },
    mongodb: { name: 'MongoDB', icon: `${TECH}mongodb-icon.svg`, color: '#4faa41', publisher: 'MongoDB Inc.', description: 'Base de données NoSQL orientée documents.' },
    jest: { name: 'Jest', icon: `${TECH}jest.svg`, color: '#c21325', publisher: 'OpenJS Foundation', description: 'Framework de tests JavaScript.' },
    vitest: { name: 'Vitest', icon: `${TECH}vitest.svg`, color: '#00ff74', publisher: 'VoidZero', description: 'Tests unitaires rapides, propulsés par Vite.' },
    git: { name: 'Git', icon: `${TECH}git.svg`, color: '#f05032', publisher: 'Git', description: 'Gestion de versions décentralisée.' },
    github: { name: 'GitHub', icon: `${TECH}github.svg`, color: '#181717', publisher: 'GitHub', description: 'Hébergement de code, revues et intégration continue.', invert: true },
    docker: { name: 'Docker', icon: `${TECH}docker.svg`, color: '#2496ed', publisher: 'Docker Inc.', description: 'Conteneurisation des applications.' },
    figma: { name: 'Figma', icon: `${TECH}figma.svg`, color: '#f24e1e', publisher: 'Figma', description: 'Design d\'interfaces collaboratif, de la maquette au prototype.' },
    postman: { name: 'Postman', icon: `${TECH}postman.svg`, color: '#ff6c37', publisher: 'Postman', description: 'Conception et test d\'API.' },
    vscode: { name: 'VS Code', icon: 'assets/img/apps/vscode.svg', color: '#007acc', publisher: 'Microsoft', description: 'L\'éditeur que vous êtes en train d\'imiter 😉' },
};

export const skillGroups = [
    { id: 'frontend', label: 'Front-end', items: ['html', 'css', 'sass', 'javascript', 'typescript', 'react', 'tailwind', 'bootstrap'] },
    { id: 'backend', label: 'Back-end', items: ['node', 'express', 'php', 'laravel', 'python'] },
    { id: 'databases', label: 'Bases de données', items: ['postgresql', 'supabase', 'prisma', 'mysql', 'sqlite', 'mongodb'] },
    { id: 'quality', label: 'Qualité & tests', items: ['jest', 'vitest'] },
    { id: 'tools', label: 'Outils', items: ['git', 'github', 'vite', 'docker', 'figma', 'postman', 'vscode'] },
];
