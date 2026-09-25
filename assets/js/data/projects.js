/** Projets réalisés (affichés dans VS Code, l'Explorateur, le menu Démarrer…). */
const IMG = 'assets/img/projects/';

export const projects = [
    {
        id: 'estimate',
        name: 'EstiMate',
        title: 'Estimer le coût de développement d\'un site web',
        image: `${IMG}estimate.webp`,
        url: null,
        stack: ['twig', 'css', 'javascript', 'node', 'express', 'mongodb'],
        description: 'Site web qui propose un formulaire détaillé aux utilisateurs pour comprendre leurs besoins et leurs attentes en matière de développement de site web ou d\'application mobile. En fonction des informations fournies, le site calculera et affichera une estimation du coût du projet.',
    },
    {
        id: 'grillmasters',
        name: 'GrillMasters',
        title: 'Site vitrine restaurant',
        image: `${IMG}grillmasters.webp`,
        url: 'http://51.91.210.190:4001',
        stack: ['html', 'css', 'javascript'],
        description: 'Un site vitrine d\'un restaurant FastFood que j\'ai appelé GrillMasters. Possibilité de consulter le menu, les services proposés et une partie contact.',
    },
    {
        id: 'lavish-voyage',
        name: 'Lavish Voyage',
        title: 'Agence de voyage',
        image: `${IMG}lavish-voyage.webp`,
        url: 'http://51.91.210.190:4006',
        stack: ['html', 'css', 'javascript'],
        description: 'Interface utilisateur moderne et attrayante, conçue avec HTML5 et CSS3 pour offrir une esthétique agréable. Utilisation de JavaScript pour créer des animations fluides.',
    },
    {
        id: 'plateforme-rh',
        name: 'Plateforme RH',
        title: 'Plateforme Ressources Humaines',
        image: `${IMG}plateforme-rh.webp`,
        url: 'http://51.91.210.190:3005',
        stack: ['twig', 'tailwind', 'node', 'mongodb'],
        description: 'Une plateforme qui permet de gérer des employés : possibilité d\'en ajouter, les supprimer, les modifier ou les blâmer. Une inscription est requise pour se connecter à l\'application.',
    },
    {
        id: 'generateur-mdp',
        name: 'Générateur MDP',
        title: 'Générateur de mots de passe',
        image: `${IMG}generateur-mdp.webp`,
        url: 'http://51.91.210.190:4005',
        stack: ['html', 'css', 'javascript', 'php'],
        description: 'Un générateur de mot de passe complet auquel on accède via des formulaires d\'inscription et de connexion codés en PHP.',
    },
    {
        id: 'cartes-3d',
        name: 'Cartes 3D',
        title: 'Création de cartes de personnages',
        image: `${IMG}cartes-3d.webp`,
        url: 'http://51.91.210.190:4003',
        stack: ['html', 'css', 'javascript'],
        description: 'Un site web permettant de créer des cartes sur le thème de Donjons et Dragons avec un effet de 3D. L\'utilisateur a la possibilité de modifier, supprimer ou rechercher une carte déjà créée.',
    },
    {
        id: 'frameworks',
        name: 'Frameworks',
        title: 'Les frameworks CSS et JavaScript',
        image: `${IMG}frameworks.webp`,
        url: 'http://51.91.210.190:4002',
        stack: ['html', 'css', 'javascript'],
        description: 'Premier projet d\'étude : un site qui permet d\'en apprendre plus sur deux frameworks CSS, Bootstrap et Foundation, ainsi que deux frameworks JavaScript, React et Angular.',
    },
];

/** Mini-applications codées par Thomas, jouables directement sur le bureau. */
export const games = [
    { id: 'morpion', name: 'Morpion', url: 'https://kleysius.github.io/Morpion/', icon: 'assets/img/apps/morpion.webp', size: [520, 640] },
    { id: 'puissance4', name: 'Puissance 4', url: 'https://kleysius.github.io/Puissance-4/', icon: 'assets/img/apps/puissance4.webp', size: [760, 680] },
    { id: 'calculatrice', name: 'Calculatrice', url: 'https://kleysius.github.io/calculatrice/', icon: 'assets/img/apps/calculatrice.webp', size: [320, 470] },
    { id: 'snake', name: 'Snake', url: 'https://kleysius.github.io/SnakeGame/', icon: 'assets/img/apps/snake.svg', size: [640, 640] },
];
