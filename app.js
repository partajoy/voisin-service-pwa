// Configuration Firebase - REMPLACEZ par votre config
const firebaseConfig = {
    apiKey: "AIzaSyBUjknJtd_5RD-6HbvriGJQz7N3-3rAV44",

  authDomain: "voisin-service.firebaseapp.com",

  projectId: "voisin-service",

  storageBucket: "voisin-service.firebasestorage.app",

  messagingSenderId: "993840078192",

  appId: "1:993840078192:web:f4c0b7d594eb59762e83b5"

};

// Initialisation
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// Éléments DOM
const authSection = document.getElementById('auth-section');
const appSection = document.getElementById('app-section');
const authMessage = document.getElementById('auth-message');

// Écoute changement d'état auth
auth.onAuthStateChanged(user => {
    if (user) {
        authSection.style.display = 'none';
        appSection.style.display = 'block';
        loadAnnounces();
    } else {
        authSection.style.display = 'block';
        appSection.style.display = 'none';
    }
});

// Inscription
document.getElementById('signup').onclick = () => {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    auth.createUserWithEmailAndPassword(email, password)
        .then(() => authMessage.textContent = '✅ Inscription réussie !')
        .catch(error => authMessage.textContent = '❌ Erreur: ' + error.message);
};

// Connexion
document.getElementById('login').onclick = () => {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    auth.signInWithEmailAndPassword(email, password)
        .then(() => authMessage.textContent = '✅ Connexion réussie !')
        .catch(error => authMessage.textContent = '❌ Erreur: ' + error.message);
};

// Déconnexion
document.getElementById('logout').onclick = () => {
    auth.signOut();
};

// Charger les annonces
function loadAnnounces() {
    const container = document.getElementById('annonces-list');
    container.innerHTML = '<p>Chargement...</p>';
    
    db.collection('annonces')
        .orderBy('timestamp', 'desc')
        .onSnapshot(snapshot => {
            container.innerHTML = '';
            if (snapshot.empty) {
                container.innerHTML = '<p>Aucune annonce pour le moment. Publiez la première !</p>';
                return;
            }
            
            snapshot.forEach(doc => {
                const data = doc.data();
                const div = document.createElement('div');
                div.className = 'annonce';
                div.innerHTML = `
                    <h4>${data.titre}</h4>
                    <p>${data.description}</p>
                    <span class="categorie">${getCategorieEmoji(data.categorie)} ${data.categorie.replace('-', ' ').toUpperCase()}</span>
                    <br>
                    <button class="msg-btn" onclick="sendMessage('${doc.id}', '${data.userId}')">
                        💬 Envoyer message
                    </button>
                `;
                container.appendChild(div);
            });
        });
}

// Créer annonce
function createAnnonce() {
    const categorie = document.getElementById('categorie').value;
    const titre = document.getElementById('titre').value;
    const description = document.getElementById('description').value;
    
    if (!titre || !description) {
        alert('⚠️ Titre et description obligatoires');
        return;
    }
    
    db.collection('annonces').add({
        titre, 
        description, 
        categorie,
        userId: firebase.auth().currentUser.uid,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    }).then(() => {
        document.getElementById('titre').value = '';
        document.getElementById('description').value = '';
        alert('✅ Annonce publiée !');
    });
}

// Envoyer message
function sendMessage(annonceId, annonceurId) {
    const message = prompt('💬 Votre message à l\'annonceur:');
    if (message && message.trim()) {
        db.collection('messages').add({
            to: annonceurId,
            from: firebase.auth().currentUser.uid,
            annonceId,
            text: message.trim(),
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        }).then(() => {
            alert('✅ Message envoyé !');
        });
    }
}

function getCategorieEmoji(categorie) {
    const emojis = {
        'lave-linge': '🧺',
        'covoiturage': '🚗',
        'plat-du-jour': '🍲'
    };
    return emojis[categorie] || '📢';
}

// PWA Service Worker
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js')
        .then(reg => console.log('SW registered'))
        .catch(err => console.log('SW error', err));
}
