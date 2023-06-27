let mailIsLoading = false;

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
    const modalBg = document.getElementById('customModal');
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
    const menuItem = document.querySelector('.context-menu-item');
    const morpionIcon = document.getElementById('morpion-icon');
    const puissance4Icon = document.getElementById('puissance4-icon');
    const calculatriceIcon = document.getElementById('calculatrice-icon');
    const gameContainer = document.getElementById('game-container');
    const gameIframe = document.getElementById('game-iframe');
    const closeButton = document.getElementById('close-button-game');

    morpionIcon.addEventListener('click', openMorpion);
    puissance4Icon.addEventListener('click', openPuissance4);
    calculatriceIcon.addEventListener('click', openCalculatrice);
    closeButton.addEventListener('click', closeGame);

    function openMorpion() {
        gameContainer.style.display = 'block';
        gameIframe.src = 'https://kleysius.github.io/Morpion/';
    }

    function openPuissance4() {
        gameContainer.style.display = 'block';
        gameIframe.src = 'https://kleysius.github.io/Puissance-4/';
    }

    function openCalculatrice() {
        gameContainer.style.display = 'block';
        gameIframe.src = 'https://kleysius.github.io/calculatrice/';
    }

    function closeGame() {
        gameContainer.style.display = 'none';
        gameIframe.src = '';
    }

    menuItem.addEventListener('click', changeBackground);
});

const backgrounds = [
    'url(./assets/img/fdwin11-1.jpeg)',
    'url(./assets/img/fdwin11-2.jpg)',
    'url(./assets/img/fdwin11-3.jpg)',
    'url(./assets/img/fdwin11-4.jpeg)',
    'url(./assets/img/fdwin11-5.jpg)',
    'url(./assets/img/fdwin11-6.jpg)',
    ''
];
let currentBackground = 0;

function changeBackground() {
    document.body.style.backgroundImage = backgrounds[currentBackground];
    currentBackground = (currentBackground + 1) % backgrounds.length;
}

// Faire en sorte de pouvoir déplacer la fenêtre
// 1. Récupérer la fenêtre
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

// 2. Ajouter un event listener sur la titleBar
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
});

document.addEventListener('mouseup', function (e) {
    isDragged = false;
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

// Heure et date actuelle
function updateTime() {
    const dateElement = document.querySelector('.date');
    const timeElement = document.querySelector('.time');

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

// Récupère tous les liens de la barre de menu
const menuLinks = document.querySelectorAll('.aLink');

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
        const { offsetTop, offsetHeight } = section;

        if (scrollPosition >= offsetTop && scrollPosition < offsetTop + offsetHeight) {
            const id = section.getAttribute('id');
            const menuLink = document.querySelector(`.menu-bar a[href="#${id}"]`);
            const explorerLink = document.querySelector(`.file-list li a[href="#${id}"]`);
            menuLink.classList.add('active');
            explorerLink.classList.add('active');
        } else {
            const id = section.getAttribute('id');
            const menuLink = document.querySelector(`.menu-bar a[href="#${id}"]`);
            const explorerLink = document.querySelector(`.file-list li a[href="#${id}"]`);
            menuLink.classList.remove('active');
            explorerLink.classList.remove('active');
        }
    });
});


// Sélectionnez le chevron et la liste de fichiers
const toggleChevron = document.querySelector('.toggle-chevron');
const fileList = document.querySelector('.explorer-content');

// Affichage de la liste des fichiers
toggleChevron.addEventListener('click', function () {
    fileList.classList.toggle('show');
});

const gearIcon = document.querySelector('.gear-icon');

gearIcon.addEventListener('click', () => {
    themeModal.classList.toggle('active');
});

const themeVscodeNameLight = document.querySelector('.theme-vscode-name.light');
const themeVscodeNameDark = document.querySelector('.theme-vscode-name.dark');
const themeVscodeNameDracula = document.querySelector('.theme-vscode-name.dracula');
const themeModal = document.querySelector('.theme-modal');

themeVscodeNameLight.addEventListener('click', () => {
    container.classList.remove('dark');
    container.classList.remove('dracula')
    container.classList.add('light');
    themeModal.classList.remove('active');
});

themeVscodeNameDark.addEventListener('click', () => {
    container.classList.remove('light');
    container.classList.remove('dracula')
    container.classList.add('dark');
    themeModal.classList.remove('active');
});

themeVscodeNameDracula.addEventListener('click', () => {
    container.classList.remove('light');
    container.classList.remove('dark');
    container.classList.add('dracula');
    themeModal.classList.remove('active');
});

async function sendMail() {
    if (!mailIsLoading) {
        mailIsLoading = true;
        document.querySelector("#btnMail").innerHTML = "Envoi en cours...";
        let name = document.querySelector("#contact_nom").value;
        let email = document.querySelector("#contact_email").value;
        let message = document.querySelector("#contact_message").value;
        let subject = document.querySelector("#contact_sujet").value;

        let headers = {
            'Content-Type': 'application/json'
        };

        let body = JSON.stringify({
            name: name,
            email: email,
            message: message,
            subject: subject
        });

        let options = {
            method: 'POST',
            headers: headers,
            body: body
        };

        let response = await fetch('https://sebastithomas.fr/contactApi', options);

        if (response.status == 200) {
            document.querySelector("#success-message").innerHTML = "Votre message a bien été envoyé !";
            document.querySelector("#contact_nom").value = "";
            document.querySelector("#contact_email").value = "";
            document.querySelector("#contact_message").value = "";
            document.querySelector("#contact_sujet").value = "";
        } else {
            document.querySelector("#error-message").innerHTML = "Une erreur est survenue lors de l'envoi du mail.";
        }
        document.querySelector("#btnMail").innerHTML = "Envoyer";
        mailIsLoading = false;
    }
}