// 🔥 VOTRE CONFIG FIREBASE (voisin-service)
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

// DOM Elements
const authSection = document.getElementById('auth-section');
const appSection = document.getElementById('app-section');
let currentUserId = null;

// État auth
auth.onAuthStateChanged(user => {
    if (user) {
        currentUserId = user.uid;
        authSection.style.display = 'none';
        appSection.style.display = 'block';
        initApp();
    } else {
        authSection.style.display = 'block';
        appSection.style.display = 'none';
    }
});

// Inscription/Connexion
document.getElementById('signup').onclick = () => registerUser();
document.getElementById('login').onclick = () => loginUser();
document.getElementById('logout').onclick = () => auth.signOut();

function registerUser() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    auth.createUserWithEmailAndPassword(email, password)
        .then(() => document.getElementById('auth-message').textContent = '✅ Inscription réussie !')
        .catch(error => document.getElementById('auth-message').textContent = '❌ ' + error.message);
}

function loginUser() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    auth.signInWithEmailAndPassword(email, password)
        .then(() => document.getElementById('auth-message').textContent = '✅ Connexion réussie !')
        .catch(error => document.getElementById('auth-message').textContent = '❌ ' + error.message);
}

// Initialiser app
function initApp() {
    document.getElementById('annonce-form').onsubmit = publishAnnonce;
    updateMsgCount();
    showTab('all');
    
    // Écouteur temps réel messages pour compteur
    db.collection('messages')
        .where('to', '==', currentUserId)
        .onSnapshot(() => updateMsgCount());
}

// Publier annonce
function publishAnnonce(e) {
    e.preventDefault();
    const categorie = document.getElementById('categorie').value;
    const titre = document.getElementById('titre').value;
    const description = document.getElementById('description').value;
    
    db.collection('annonces').add({
        titre, description, categorie, userId: currentUserId,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    }).then(() => {
        document.getElementById('annonce-form').reset();
        alert('✅ Annonce publiée !');
    }).catch(error => alert('❌ Erreur: ' + error.message));
}

// Onglets
function showTab(tab) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
    
    document.getElementById(tab + '-tab').classList.add('active');
    event.target.classList.add('active');
    
    if (tab === 'all') loadAllAnnounces();
    if (tab === 'mine') loadMyAnnounces();
    if (tab === 'messages') loadMyMessages();
}

// Compteur messages
function updateMsgCount() {
    db.collection('messages').where('to', '==', currentUserId).get().then(snapshot => {
        document.getElementById('msg-count').textContent = snapshot.size;
    });
}

// Charger TOUTES les annonces
function loadAllAnnounces() {
    const container = document.getElementById('annonces-list');
    container.innerHTML = '<div class="loading-state">🔄 Chargement...</div>';
    
    db.collection('annonces')
        .orderBy('timestamp', 'desc')
        .onSnapshot(snapshot => {
            container.innerHTML = '';
            snapshot.forEach(doc => {
                const data = doc.data();
                const div = document.createElement('div');
                div.className = data.userId === currentUserId ? 'annonce my-annonce' : 'annonce';
                div.dataset.annonceId = doc.id;
                div.innerHTML = `
                    <h4>${data.titre}</h4>
                    <p>${data.description}</p>
                    <span class="categorie">${getEmoji(data.categorie)} ${data.categorie?.replace('-', ' ')}</span>
                    ${data.userId === currentUserId ? 
                        '<button class="msg-btn delete-btn" onclick="deleteAnnonce(\'' + doc.id + '\')">🗑️</button>' :
                        '<button class="msg-btn" onclick="sendMessage(\'' + doc.id + '\', \'' + data.userId + '\')">💬 Message</button>'
                    }
                `;
                container.appendChild(div);
            });
        });
}

// Mes annonces
function loadMyAnnounces() {
    const container = document.getElementById('mine-list');
    container.innerHTML = '<div class="loading-state">🔄 Chargement...</div>';
    
    db.collection('annonces')
        .where('userId', '==', currentUserId)
        .orderBy('timestamp', 'desc')
        .onSnapshot(snapshot => {
            container.innerHTML = snapshot.empty ? 
                '<div class="no-content">Aucune annonce publiée</div>' : '';
            snapshot.forEach(doc => {
                const data = doc.data();
                const div = document.createElement('div');
                div.className = 'annonce my-annonce';
                div.innerHTML = `
                    <h4>${data.titre}</h4>
                    <p>${data.description}</p>
                    <span class="categorie">${getEmoji(data.categorie)} ${data.categorie?.replace('-', ' ')}</span>
                    <button class="msg-btn delete-btn" onclick="deleteAnnonce('${doc.id}')">🗑️ Supprimer</button>
                `;
                container.appendChild(div);
            });
        });
}

// Mes messages
function loadMyMessages() {
    const container = document.getElementById('messages-list');
    container.innerHTML = '<div class="loading-state">🔄 Chargement...</div>';
    
    db.collection('messages')
        .where('to', '==', currentUserId)
        .orderBy('timestamp', 'desc')
        .onSnapshot(snapshot => {
            container.innerHTML = snapshot.empty ? 
                '<div class="no-content">Aucun message reçu</div>' : '';
            snapshot.forEach(doc => {
                const data = doc.data();
                db.collection('annonces').doc(data.annonceId).get().then(annonceDoc => {
                    const div = document.createElement('div');
                    div.className = 'message-item';
                    div.innerHTML = `
                        <div class="message-preview">
                            <h4>${annonceDoc.exists ? annonceDoc.data().titre : 'Annonce supprimée'}</h4>
                            <p>${data.text}</p>
                            <small>${data.timestamp?.toDate ? data.timestamp.toDate().toLocaleString('fr-BE') : '...'}</small>
                        </div>
                    `;
                    container.insertBefore(div, container.firstChild);
                });
            });
        });
}

// Envoyer message
function sendMessage(annonceId, toUserId) {
    const message = prompt('💬 Votre message:');
    if (message?.trim()) {
        db.collection('messages').add({
            to: toUserId, from: currentUserId, annonceId,
            text: message.trim(),
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        }).then(() => alert('✅ Message envoyé !'));
    }
}

// Supprimer annonce
function deleteAnnonce(annonceId) {
    if (confirm('Supprimer cette annonce?')) {
        db.collection('annonces').doc(annonceId).delete().then(() => {
            db.collection('messages').where('annonceId', '==', annonceId).get().then(snapshot => {
                snapshot.forEach(doc => doc.ref.delete());
            });
            alert('✅ Supprimé !');
        });
    }
}

function getEmoji(categorie) {
    const emojis = { 'lave-linge': '🧺', 'covoiturage': '🚗', 'plat-du-jour': '🍲' };
    return emojis[categorie] || '📢';
}

// Service Worker
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js');
}
