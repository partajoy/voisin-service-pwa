// 🚨 VOTRE CONFIG FIREBASE ICI
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
const authMessage = document.getElementById('auth-message');

// Auth State
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
        .catch(error => authMessage.textContent = '❌ ' + error.message);
};

// Connexion
document.getElementById('login').onclick = () => {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    auth.signInWithEmailAndPassword(email, password)
        .then(() => authMessage.textContent = '✅ Connexion réussie !')
        .catch(error => authMessage.textContent = '❌ ' + error.message);
};

// Déconnexion
document.getElementById('logout').onclick = () => auth.signOut();

// Publier annonce
document.getElementById('annonce-form').onsubmit = (e) => {
    e.preventDefault();
    const categorie = document.getElementById('categorie').value;
    const titre = document.getElementById('titre').value;
    const description = document.getElementById('description').value;
    
    if (!titre || !description || !categorie) {
        alert('⚠️ Tous les champs sont obligatoires');
        return;
    }
    
    db.collection('annonces').add({
        titre, description, categorie,
        userId: firebase.auth().currentUser.uid,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    }).then(() => {
        document.getElementById('annonce-form').reset();
        alert('✅ Annonce publiée !');
    }).catch(error => alert('❌ Erreur: ' + error.message));
};

// Charger TOUTES les annonces + MES annonces avec messages
function loadAnnounces() {
    const container = document.getElementById('annonces-list');
    container.innerHTML = '<div class="loading-state"><p>🔄 Chargement...</p></div>';
    
    const userId = firebase.auth().currentUser.uid;
    
    // Charger TOUTES les annonces
    db.collection('annonces')
        .orderBy('timestamp', 'desc')
        .onSnapshot(snapshot => {
            container.innerHTML = '';
            
            snapshot.forEach(doc => {
                const data = doc.data();
                
                // MES annonces → afficher avec messages
                if (data.userId === userId) {
                    loadMessagesForAnnonce(doc.id).then(messages => {
                        displayMyAnnonce(doc.id, data, messages);
                    });
                } 
                // AUTRES annonces → bouton message
                else {
                    displayOtherAnnonce(doc.id, data);
                }
            });
        });
}

// Charger messages pour UNE annonce
function loadMessagesForAnnonce(annonceId) {
    return db.collection('messages')
        .where('annonceId', '==', annonceId)
        .orderBy('timestamp', 'asc')
        .get()
        .then(snapshot => {
            const messages = [];
            snapshot.forEach(msgDoc => messages.push(msgDoc.data()));
            return messages;
        });
}

// Afficher MES annonces avec messages
function displayMyAnnonce(annonceId, data, messages) {
    const container = document.getElementById('annonces-list');
    let annonceDiv = Array.from(container.children).find(el => el.dataset.annonceId === annonceId);
    
    if (!annonceDiv) {
        annonceDiv = document.createElement('div');
        annonceDiv.className = 'annonce my-annonce';
        annonceDiv.dataset.annonceId = annonceId;
        container.appendChild(annonceDiv);
    }
    
    annonceDiv.innerHTML = `
        <div class="annonce-header">
            <h4>${data.titre}</h4>
            <span class="categorie">${getCategorieEmoji(data.categorie)} ${data.categorie.replace('-', ' ').toUpperCase()}</span>
        </div>
        <p>${data.description}</p>
        ${messages.length > 0 ? `
            <div class="messages-container">
                <h5>💬 ${messages.length} message${messages.length > 1 ? 's' : ''} reçu${messages.length > 1 ? 's' : ''}</h5>
                <div class="messages-list">
                    ${messages.map(msg => `
                        <div class="message-item">
                            <strong>👤 De:</strong> ${msg.from.substring(0,8)}...
                            <br>${msg.text}
                            <small>${msg.timestamp ? new Date(msg.timestamp.toDate()).toLocaleString('fr-BE') : '...'}</small>
                        </div>
                    `).join('')}
                </div>
            </div>
        ` : '<p class="no-messages">Aucun message pour cette annonce</p>'}
        <div class="annonce-actions">
            <button class="msg-btn delete-btn" onclick="deleteAnnonce('${annonceId}')">🗑️ Supprimer</button>
        </div>
    `;
}

// Afficher AUTRES annonces
function displayOtherAnnonce(annonceId, data) {
    const container = document.getElementById('annonces-list');
    let annonceDiv = Array.from(container.children).find(el => el.dataset.annonceId === annonceId);
    
    if (!annonceDiv) {
        annonceDiv = document.createElement('div');
        annonceDiv.className = 'annonce';
        annonceDiv.dataset.annonceId = annonceId;
        container.appendChild(annonceDiv);
    }
    
    annonceDiv.innerHTML = `
        <h4>${data.titre}</h4>
        <p>${data.description}</p>
        <span class="categorie">${getCategorieEmoji(data.categorie)} ${data.categorie.replace('-', ' ').toUpperCase()}</span>
        <br>
        <button class="msg-btn" onclick="sendMessage('${annonceId}', '${data.userId}')">
            💬 Envoyer message
        </button>
    `;
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
        }).catch(error => alert('❌ Erreur: ' + error.message));
    }
}

// Supprimer annonce
function deleteAnnonce(annonceId) {
    if (confirm('🗑️ Supprimer cette annonce et ses messages ?')) {
        db.collection('annonces').doc(annonceId).delete()
            .then(() => {
                // Supprimer aussi les messages liés
                db.collection('messages').where('annonceId', '==', annonceId).get().then(snapshot => {
                    snapshot.forEach(doc => doc.ref.delete());
                });
                alert('✅ Annonce supprimée !');
            })
            .catch(error => alert('❌ Erreur: ' + error.message));
    }
}

// Emoji catégories
function getCategorieEmoji(categorie) {
    const emojis = {
        'lave-linge': '🧺',
        'covoiturage': '🚗',
        'plat-du-jour': '🍲'
    };
    return emojis[categorie] || '📢';
}

// Service Worker PWA
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js')
        .then(reg => console.log('✅ SW enregistré'))
        .catch(err => console.log('❌ SW erreur', err));
}
