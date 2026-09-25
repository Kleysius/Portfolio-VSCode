/**
 * Compteur de « J'aime » partagé (Firebase Realtime Database), chargé à la demande.
 * Le compteur est mis à jour en temps réel et incrémenté de façon atomique (transaction).
 */
import { store } from '../core/store.js';
import { bus } from '../core/bus.js';

const FIREBASE = 'https://www.gstatic.com/firebasejs/10.12.2/';
const firebaseConfig = {
    apiKey: 'AIzaSyCkeJquHwKp-cKFSxc4EWTaNOSXaryzkDc',
    authDomain: 'portfolio-vscode-3b363.firebaseapp.com',
    projectId: 'portfolio-vscode-3b363',
    storageBucket: 'portfolio-vscode-3b363.appspot.com',
    messagingSenderId: '403501326929',
    appId: '1:403501326929:web:a460ba9aafe21129124e70',
    databaseURL: 'https://portfolio-vscode-3b363-default-rtdb.europe-west1.firebasedatabase.app/',
};

let api = null;
let count = null;

async function connect() {
    if (api) return api;
    api = (async () => {
        const [{ initializeApp }, database] = await Promise.all([
            import(`${FIREBASE}firebase-app.js`),
            import(`${FIREBASE}firebase-database.js`),
        ]);
        const app = initializeApp(firebaseConfig);
        const db = database.getDatabase(app);
        const countRef = database.ref(db, 'likeCount/count');
        database.onValue(countRef, (snapshot) => {
            count = snapshot.val() ?? 0;
            bus.emit('likes:change');
        });
        return { database, countRef };
    })();
    return api;
}

export const likes = {
    get count() { return count; },
    get liked() { return store.get('liked', false); },
    init() {
        connect().catch((error) => console.warn('Compteur de likes indisponible :', error));
    },
    async toggle() {
        const liked = !this.liked;
        store.set('liked', liked);
        // Mise à jour optimiste
        if (count !== null) count += liked ? 1 : -1;
        bus.emit('likes:change');
        try {
            const { database, countRef } = await connect();
            await database.runTransaction(countRef, (value) => Math.max(0, (value ?? 0) + (liked ? 1 : -1)));
        } catch (error) {
            console.warn('Impossible d\'enregistrer le like :', error);
        }
        return liked;
    },
};
