import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getDatabase, ref, set, get } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-database.js";

// Configuration de Firebase
const firebaseConfig = {
    apiKey: "AIzaSyCkeJquHwKp-cKFSxc4EWTaNOSXaryzkDc",
    authDomain: "portfolio-vscode-3b363.firebaseapp.com",
    projectId: "portfolio-vscode-3b363",
    storageBucket: "portfolio-vscode-3b363.appspot.com",
    messagingSenderId: "403501326929",
    appId: "1:403501326929:web:a460ba9aafe21129124e70",
    measurementId: "G-QW211TB0TH",
    databaseURL: "https://portfolio-vscode-3b363-default-rtdb.europe-west1.firebasedatabase.app/"
};

// Initialisation de Firebase
const app = await initializeApp(firebaseConfig);

// Récupération de la base de données
const db = await getDatabase();

/* Like button */
const like = document.getElementById('like');
const likeCount = document.getElementById('likeCount');
let count = await get(ref(db, 'likeCount'))
count = await count.val().count;

likeCount.textContent = count;

function saveLikeCount() {
    like.classList.toggle('is-liked');

    if (like.classList.contains('is-liked')) {
        count++;
        likeCount.textContent = count;
    } else {
        count--;
        likeCount.textContent = count;
    }

    set(ref(db, 'likeCount'), { count: count });
}

like.addEventListener('click', saveLikeCount);