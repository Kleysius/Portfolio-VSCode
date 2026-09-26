# Portfolio VS Code × Windows 11 — Thomas SEBASTI

Portfolio interactif qui reproduit **Windows 11** et **Visual Studio Code** directement dans le navigateur.
👉 [kleysius.github.io/Portfolio-VSCode](https://kleysius.github.io/Portfolio-VSCode/)

HTML, CSS et JavaScript *vanilla* : aucun framework, aucune étape de build. Le site est servi tel quel par GitHub Pages.

## 📁 Projets présentés

| Projet | Description | Stack |
| --- | --- | --- |
| **I-care FieldOps** | Habilitations, flotte et conformité des techniciens (application interne I-care) | React, Vite, Tailwind CSS, Node.js, Express, PostgreSQL, Prisma, Supabase, Jest |
| **Talos** | Ingénierie de lubrification industrielle (application I-care) | React, Vite, Tailwind CSS, Supabase, PostgreSQL, Vitest |
| **Rapport Kem One** | Rapports journaliers de maintenance industrielle | React, Vite, Tailwind CSS, Node.js, Express, SQLite, Jest |
| **LubriScan** | Graissages du jour, par zone, depuis un export AMO (outil interne I-care) | React, Vite, Tailwind CSS |
| **EstiMate** | Estimer le coût de développement d'un site web (projet de formation Ri7) | Twig, CSS, JavaScript, Node.js, Express, MongoDB |

Les applications internes ne sont pas publiques : leurs captures sont faites avec des **données de démonstration**, et leurs dépôts sont privés.

## ✨ Fonctionnalités

### Windows 11
- **Démarrage** : écran de boot, écran de verrouillage (horloge en direct) et connexion — joués une fois par session (`?skip` pour les passer).
- **Gestionnaire de fenêtres** : déplacement, redimensionnement (8 poignées), agrandissement au double-clic, **Snap** aux bords et coins avec aperçu, **dispositions d'ancrage** au survol du bouton Agrandir, réduction animée vers la barre des tâches.
- **Barre des tâches** : météo en direct (Open-Meteo), applications épinglées/ouvertes avec indicateurs, zone de notification, horloge, bouton « Afficher le bureau ».
- **Menu Démarrer** : applications épinglées, recommandations (projets), liste de toutes les applications, **recherche instantanée** (applications, dossiers, projets, documents, paramètres) et menu d'alimentation (verrouiller, veille, arrêter, redémarrer).
- **Paramètres rapides** fonctionnels : mode sombre/clair, éclairage nocturne, luminosité, volume, Ne pas déranger.
- **Centre de notifications** + calendrier, **Widgets** (météo, GitHub, projets à la une, like), **Affichage des tâches**.
- **Bureau** : icônes déplaçables sur grille, sélection au lasso, menus contextuels Windows 11 (+ « Afficher plus d'options » à l'ancienne), renommage `F2`, suppression `Suppr` / `Ctrl+Z` et **Corbeille** fonctionnelle.
- **Détails Windows** : matériau **Mica** (fond d'écran flouté qui suit la fenêtre), infobulles Fluent, pointeurs de souris Windows, sons système, boîtes de dialogue modales, menu système `Alt+Espace`, **Snap Assist**, aperçus des fenêtres au survol de la barre des tâches, **Aero Peek**, OSD du volume à la molette, indicateur de langue.
- **Applications** : Explorateur de fichiers (volet de visualisation `Alt+P`, tri par colonnes, barre d'adresse modifiable), Windows Terminal (profils PowerShell / Invite de commandes / Ubuntu, coloration et prédictions PSReadLine, `Ctrl+Maj+T`), Microsoft Edge, Paramètres (fond d'écran, couleur d'accentuation…), Bloc-notes, Photos, et les jeux (Morpion, Puissance 4, Calculatrice, Snake).

### Visual Studio Code
- Barre de titre avec menus, centre de commandes, barre d'activité, barre latérale redimensionnable, onglets (aperçu en italique, glisser-déposer, menu contextuel), fil d'Ariane, panneau et barre d'état.
- **Éditeur** : coloration syntaxique maison (HTML, Markdown, TypeScript, JSON), colorisation des paires de crochets, guides d'indentation, curseur clavier, repliage de code, décorations Git, **minimap**, règle d'aperçu, **défilement sticky**, surlignage des occurrences du mot courant, widget de recherche `Ctrl+F` (casse, mot entier, regex), menu contextuel, liens `Ctrl+clic`, retour à la ligne.
- **Palette de commandes** (`Ctrl+Maj+P`), ouverture rapide (`Ctrl+P`), `:` pour aller à une ligne, `@` pour les symboles.
- **8 thèmes** avec aperçu en direct : Dark Modern, Dark+, Monokai, Dracula, GitHub Dark, One Dark Pro, Light Modern, Solarized Light.
- Vues **Explorateur** (+ Structure, Chronologie), **Recherche** (casse, mot entier, regex), **Git** (historique réel du dépôt via l'API GitHub), **Exécuter et déboguer**, **Extensions** (= mes compétences).
- **Aperçus** : page d'accueil, Markdown, compétences, projets, **formulaire de contact fonctionnel** (EmailJS), images, éditeur de paramètres.
- Terminal intégré avec **décorations de commandes** (intégration shell), centre de notifications (Ne pas déranger), sélecteurs de la barre d'état (langage, mise en retrait, encodage, fin de ligne), fils d'Ariane navigables, « Personnaliser la disposition » et **mode zen** (`Ctrl+K Z`), raccourcis clavier (`Ctrl+B`, `Ctrl+J`, `Ctrl+K Ctrl+T`, `Alt+Z`, `F5`…).

## 🗂️ Architecture

```
index.html                  Coquille HTML (SEO, préchargements)
assets/
├── css/
│   ├── base.css            Jetons de design Windows 11 (clair/sombre), reset, contrôles Fluent
│   ├── os/                 Boot, bureau, fenêtres, barre des tâches, panneaux, menus
│   ├── apps/               VS Code (+ thèmes) et applications Windows
│   └── responsive.css      Adaptations tablette / mobile
├── js/
│   ├── main.js             Point d'entrée
│   ├── core/               Utilitaires : DOM & templates sûrs, store persistant, bus, icônes, recherche floue
│   ├── data/               Contenu : profil, compétences, projets, espace de travail VS Code, système de fichiers
│   ├── services/           Firebase (likes), EmailJS, météo, GitHub — chargés à la demande
│   ├── os/                 « Système » : fenêtres, barre des tâches, Démarrer, notifications, bureau…
│   └── apps/               Applications, chargées via import() dynamique au premier lancement
│       └── vscode/         Workbench, éditeur, coloration syntaxique, barre latérale, panneau…
├── fonts/                  Cascadia Code (auto-hébergée)
├── vendor/codicons/        Icônes officielles de VS Code (auto-hébergées)
└── img/                    Images optimisées en WebP
```

- **Une seule source de vérité** : tout le contenu (textes, projets, compétences) vit dans `assets/js/data/`. Les fichiers affichés dans VS Code, l'Explorateur, le Terminal ou le menu Démarrer sont générés à partir de ces données.
- **Chargement à la demande** : chaque application est un module ES chargé au premier lancement ; Firebase est importé dynamiquement après le démarrage et EmailJS uniquement au premier envoi du formulaire.
- **Poids** : les images sont passées de ~14 Mo à ~1,5 Mo (WebP), FullCalendar et Font Awesome ont été remplacés par des composants et icônes maison.

### Ajouter un projet

Ajoutez une entrée dans `assets/js/data/projects.js` (et sa capture dans `assets/img/projects/`) : elle apparaît automatiquement dans `projects.json`, l'aperçu, le menu Démarrer, les widgets, l'Explorateur et le Terminal.

## 🚀 Lancer en local

Les modules ES nécessitent un serveur HTTP :

```bash
npx serve .
# ou
python -m http.server
```

## 📄 Crédits

- [Codicons](https://github.com/microsoft/vscode-codicons) — © Microsoft, CC BY 4.0
- [Cascadia Code](https://github.com/microsoft/cascadia-code) — © Microsoft, SIL Open Font License 1.1
- [Simple Icons](https://simpleicons.org/) — CC0 1.0 (logos des technologies, voir `assets/img/tech/LICENSE-simple-icons.md`)
- Windows et Visual Studio Code sont des marques de Microsoft ; ce portfolio est un hommage non officiel.
