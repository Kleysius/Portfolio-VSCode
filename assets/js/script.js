// Constantes pour le fond d'écran
const backgrounds = [
    'url(assets/img/fdwin11-1.jpeg)',
    'url(assets/img/fdwin11-2.jpg)',
    'url(assets/img/fdwin11-3.jpg)',
    'url(assets/img/fdwin11-4.jpeg)',
    'url(assets/img/fdwin11-5.jpg)',
    'url(assets/img/fdwin11-6.jpg)',
    ''
];
let currentBackground = 0;

// Constantes pour la fenêtre
const container = document.getElementById('container');
const content = document.querySelector('.content');
const logoVscode = document.querySelector('.logo-vscode');
const closeBtn = document.querySelector('.close-button');
const minimize = document.querySelector('.minimize-button');
const maximize = document.querySelector('.maximize-button');
const titleBar = document.querySelector('.title-bar');
let isDragged = false;
let offsetX, offsetY;
let isMaxWidthWindow = false;

// Constantes pour les menus
const menuLinks = document.querySelectorAll('.aLink');
const menuItem = document.querySelector('.context-menu-item');

// Constantes pour la section active
const sections = document.querySelectorAll('section');

// Constantes pour le basculement de la liste de fichiers de l'explorateur
const toggleChevron = document.querySelector('.toggle-chevron');
const fileList = document.querySelector('.explorer-content');

// Constantes pour le thème VSCode
const gearIcon = document.querySelector('.gear-icon');
const themeVscodeNameLight = document.querySelector('.theme-vscode-name.light');
const themeVscodeNameDark = document.querySelector('.theme-vscode-name.dark');
const themeVscodeNameDracula = document.querySelector('.theme-vscode-name.dracula');
const themeModal = document.querySelector('.theme-modal');

// Constante pour le bouton de chargement et le loader
const loaderContainer = document.getElementById("loader-container");

// Variable pour le mail
let mailIsLoading = false;

// Constantes pour le formulaire de contact
const btnMail = document.querySelector("#btnMail");
const loaderBtn = document.querySelector("#loaderBtn");
const sendText = document.getElementById('sendText');
const successMessage = document.getElementById('successMessage');
const errorMessage = document.getElementById('errorMessage');

// Constantes pour la modale de chargement
const modalBg = document.getElementById('customModal');

// Constantes pour les jeux
const morpionIcon = document.getElementById('morpion-icon');
const puissance4Icon = document.getElementById('puissance4-icon');
const calculatriceIcon = document.getElementById('calculatrice-icon');
const gameContainer = document.getElementById('game-container');
const gameIframe = document.getElementById('game-iframe');
const closeButton = document.getElementById('close-button-game');

// Constante pour la date et l'heure actuelles
const dateElement = document.querySelector('.date');
const timeElement = document.querySelector('.time');

window.addEventListener("load", function () {
    setTimeout(function () {
        loaderContainer.style.backdropFilter = "blur(0)";
        setTimeout(function () {
            loaderContainer.style.display = "none";
        }, 500);
    }, 2000);
});

document.addEventListener('contextmenu', function (event) {
    event.preventDefault();

    // ne pas ouvrir le menu contextuel si on se trouve dans le container ou taskbar
    if (event.target.closest('#container') || event.target.closest('.taskbar')) {
        return;
    }

    // Coordonnées du clic
    let mouseX = event.clientX;
    let mouseY = event.clientY;

    // Positionnement de la modale
    modalBg.style.top = mouseY + 'px';
    modalBg.style.left = mouseX + 'px';
    modalBg.style.display = 'block';
});

// Fermeture de la modale lors d'un clic en dehors
document.addEventListener('click', function (event) {
    const modalBg = document.getElementById('customModal');
    modalBg.style.display = 'none';
});

document.addEventListener('DOMContentLoaded', function () {
    morpionIcon.addEventListener('click', openMorpion);
    puissance4Icon.addEventListener('click', openPuissance4);
    calculatriceIcon.addEventListener('click', openCalculatrice);
    closeButton.addEventListener('click', closeGame);
    menuItem.addEventListener('click', changeBackground);
});

function openMorpion() {
    gameContainer.style.display = 'block';
    gameIframe.src = 'https://kleysius.github.io/Morpion/';
    [gameContainer.style.width, gameContainer.style.height, closeButton.style.top, closeButton.style.right, closeButton.style.fontSize] = ['', '', '', '', ''];
}

function openPuissance4() {
    gameContainer.style.display = 'block';
    gameIframe.src = 'https://kleysius.github.io/Puissance-4/';
    [gameContainer.style.width, gameContainer.style.height, closeButton.style.top, closeButton.style.right, closeButton.style.fontSize] = ['', '', '', '', ''];
}

function openCalculatrice() {
    gameContainer.style.display = 'block';
    gameIframe.src = 'https://kleysius.github.io/calculatrice/';
    [gameContainer.style.width, gameContainer.style.height, closeButton.style.top, closeButton.style.right, closeButton.style.fontSize] = ['300px', '410px', '5px', '8px', '20px'];
}

function closeGame() {
    gameContainer.style.display = 'none';
    [gameIframe.src, gameContainer.style.width, gameContainer.style.height, closeButton.style.top, closeButton.style.right, closeButton.style.fontSize] = ['', '', '', '', '', ''];
}

function changeBackground() {
    document.body.style.backgroundImage = backgrounds[currentBackground];
    currentBackground = (currentBackground + 1) % backgrounds.length;
}

// Faire en sorte de pouvoir déplacer la fenêtre
titleBar.addEventListener('mousedown', function (e) {
    isDragged = true;
    offsetX = e.clientX - container.offsetLeft;
    offsetY = e.clientY - container.offsetTop;
    container.style.userSelect = 'none';
});

document.addEventListener('mousemove', function (e) {
    if (!isDragged) {
        return;
    }
    container.style.left = e.clientX - offsetX + 'px';
    container.style.top = e.clientY - offsetY + 'px';
    // Faire en sorte que le container ne sorte pas de la fenêtre
    if (parseInt(container.style.top) < 0) {
        container.style.top = 0;
    } else if (parseInt(container.style.top) > window.innerHeight - parseInt(container.style.height)) {
        container.style.top = window.innerHeight - parseInt(container.style.height) + 'px';
    }
});

document.addEventListener('mouseup', function (e) {
    isDragged = false;
});

// Heure et date actuelle
function updateTime() {
    const currentDate = new Date();
    const date = currentDate.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });

    const hours = currentDate.getHours();
    const minutes = currentDate.getMinutes();
    const time = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;

    dateElement.textContent = date;
    timeElement.textContent = time;
}

updateTime();
setInterval(updateTime, 10000);

logoVscode.addEventListener('click', function () {
    logoVscode.classList.toggle('active');
    if (!logoVscode.classList.contains('active')) {
        container.style.transition = 'opacity 0.3s ease';
        container.style.opacity = 0;
        container.style.zIndex = -100;
    } else {
        container.style.opacity = 1;
        container.style.zIndex = 100;
        container.style.removeProperty('opacity');
        logoVscode.style.removeProperty('--after-display');
    }
});

closeBtn.addEventListener('click', function () {
    logoVscode.classList.remove('active');
    logoVscode.style.setProperty('--after-display', 'none');
    container.style.opacity = 0;
    container.style.zIndex = -100;
});

minimize.addEventListener('click', function () {
    logoVscode.classList.remove('active');
    container.style.opacity = 0;
    container.style.zIndex = -100;
    container.style.transition = 'opacity 0.3s ease';
});

maximize.addEventListener('click', function () {
    if (!isMaxWidthWindow) {
        container.style.width = '100vw';
        container.style.height = 'calc(100vh - 60px)';
        container.style.top = '0';
        container.style.left = '0';
        container.style.border = 'none';
        container.style.borderRadius = 0;
        container.style.transition = 'width 0.3s ease, height 0.3s ease, border-radius 0.3s ease';
        maximize.innerHTML = '<i class="fa-solid fa-window-restore"></i>';
        isMaxWidthWindow = true;
    } else {
        container.style.width = '1000px';
        container.style.height = '650px';
        container.style.borderRadius = '10px';
        container.style.transition = 'width 0.3s ease, height 0.3s ease, border-radius 0.3s ease';
        maximize.innerHTML = '<i class="fa-regular fa-square"></i>';
        isMaxWidthWindow = false;
    }
});

// Ajoute un gestionnaire d'événement de clic à chaque lien de la barre de menu
menuLinks.forEach(link => {
    link.addEventListener('click', (event) => {
        // Supprime la classe "active" de tous les liens de la barre de menu
        menuLinks.forEach(menuLink => menuLink.classList.remove('active'));

        // Ajoute la classe "active" au lien cliqué
        event.target.classList.add('active');
    });
});

// Parcours des sections et mise à jour de la classe active
content.addEventListener('scroll', () => {
    const scrollPosition = content.scrollTop;
    const sections = document.querySelectorAll('section');

    sections.forEach(section => {
        const { offsetTop, offsetHeight, id } = section;
        const menuLink = document.querySelector(`.menu-bar a[href="#${id}"]`);
        const explorerLink = document.querySelector(`.file-list li a[href="#${id}"]`);

        if (scrollPosition >= offsetTop && scrollPosition < offsetTop + offsetHeight) {
            menuLink.classList.add('active');
            explorerLink.classList.add('active');
        } else {
            menuLink.classList.remove('active');
            explorerLink.classList.remove('active');
        }
    });
});

// Affichage de la liste des fichiers
toggleChevron.addEventListener('click', function () {
    fileList.classList.toggle('show');
});

gearIcon.addEventListener('click', () => {
    themeModal.classList.toggle('active');
});

const applyTheme = (theme) => {
    container.classList.remove('light', 'dark', 'dracula');
    container.classList.add(theme);
    themeModal.classList.remove('active');
};

themeVscodeNameLight.addEventListener('click', () => applyTheme('light'));
themeVscodeNameDark.addEventListener('click', () => applyTheme('dark'));
themeVscodeNameDracula.addEventListener('click', () => applyTheme('dracula'));

document.getElementById('contact-form').addEventListener('submit', function (event) {
    event.preventDefault();

    if (!mailIsLoading) {
        mailIsLoading = true;
        btnMail.disabled = true;
        btnMail.classList.add('loading');
        sendText.innerHTML = "Envoi en cours...";
        loaderBtn.style.display = "block";

        setTimeout(() => {
            if (document.getElementById('contact_nom').value && document.getElementById('contact_email').value && document.getElementById('contact_sujet').value && document.getElementById('contact_message').value) {
                // Envoie l'e-mail
                emailjs.send("service_0b9ot4g", "template_oy5c70a", {
                    name: document.getElementById('contact_nom').value,
                    email: document.getElementById('contact_email').value,
                    subject: document.getElementById('contact_sujet').value,
                    message: document.getElementById('contact_message').value
                })
                    .then(function (response) {
                        if (response.status == 200) {
                            successMessage.style.display = 'block';
                            successMessage.innerHTML = "Votre message a bien été envoyé !";;
                            // Réinitialise le formulaire après l'envoi
                            document.getElementById('contact-form').reset();
                        } else {
                            errorMessage.style.display = 'block';
                            errorMessage.innerHTML = "Une erreur est survenue lors de l'envoi du mail.";
                        }
                    })
                    .catch(function (error) {
                        console.log('Erreur :', error);
                        errorMessage.style.display = 'block';
                        errorMessage.innerHTML = "Une erreur est survenue lors de l'envoi du mail.";
                    });
            } else {
                errorMessage.style.display = 'block';
                errorMessage.innerHTML = "Veuillez remplir tous les champs.";
            }

            // Réinitialiser le bouton après l'envoi
            btnMail.classList.remove('loading');
            loaderBtn.style.display = 'none';
            sendText.textContent = 'Message envoyé !';
            mailIsLoading = false;
        }, 2000); // Affiche le loader pendant 2 secondes
    }
});