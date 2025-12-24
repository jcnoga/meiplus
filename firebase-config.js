// firebase-config.js
const firebaseConfig = {
  apiKey: "AIzaSyAY06PHLqEUCBzg9SjnH4N6xe9ZzM8OLvo",
  authDomain: "projeto-bfed3.firebaseapp.com",
  projectId: "projeto-bfed3",
  storageBucket: "projeto-bfed3.firebasestorage.app",
  messagingSenderId: "785289237066",
  appId: "1:785289237066:web:8206fe2e1073db72d5ccb3"
};

// Inicialização condicional do Firebase
let firebaseApp, firebaseAuth, firebaseDb;
let isFirebaseAvailable = false;

try {
    if (typeof firebase !== 'undefined' && firebase.apps.length === 0) {
        firebaseApp = firebase.initializeApp(firebaseConfig);
        firebaseAuth = firebase.auth();
        firebaseDb = firebase.firestore();
        
        // Habilitar persistência offline do Firestore
        firebaseDb.enablePersistence()
            .then(() => {
                console.log("Firestore persistence enabled");
                isFirebaseAvailable = true;
            })
            .catch((err) => {
                console.warn("Firestore persistence failed:", err);
                isFirebaseAvailable = true;
            });
        
        console.log("Firebase inicializado com sucesso");
        isFirebaseAvailable = true;
    } else if (firebase.apps.length > 0) {
        firebaseApp = firebase.app();
        firebaseAuth = firebase.auth();
        firebaseDb = firebase.firestore();
        isFirebaseAvailable = true;
    }
} catch (error) {
    console.warn("Firebase não disponível. Modo offline ativado:", error);
    isFirebaseAvailable = false;
}

// Detectar status de conexão
let isOnline = navigator.onLine;
window.addEventListener('online', () => {
    isOnline = true;
    document.getElementById('offline-warning')?.classList.add('hidden');
    if (isFirebaseAvailable) {
        syncLocalDataToCloud();
    }
});
window.addEventListener('offline', () => {
    isOnline = false;
    document.getElementById('offline-warning')?.classList.remove('hidden');
});

// Funções Firebase
async function loginWithGoogle() {
    if (!isFirebaseAvailable) {
        alert('Firebase não disponível. Use login local.');
        return;
    }
    
    const provider = new firebase.auth.GoogleAuthProvider();
    try {
        const result = await firebaseAuth.signInWithPopup(provider);
        const user = result.user;
        
        // Verificar se usuário já existe no IndexedDB
        const localUser = await getUserFromIndexedDB(user.email);
        if (localUser) {
            // Usuário existe localmente, fazer merge
            await mergeUserData(localUser, user);
        } else {
            // Criar novo usuário
            await createFirebaseUser(user);
        }
        
        showAuthStatus('Login com Google realizado!', 'success');
    } catch (error) {
        console.error('Google login error:', error);
        showAuthStatus('Erro no login Google', 'error');
    }
}

async function resetPassword() {
    const email = document.getElementById('login-email').value;
    if (!email) {
        alert('Digite seu e-mail para recuperação');
        return;
    }
    
    if (isFirebaseAvailable && isOnline) {
        try {
            await firebaseAuth.sendPasswordResetEmail(email);
            showAuthStatus('Link de recuperação enviado para o e-mail!', 'success');
        } catch (error) {
            console.error('Reset password error:', error);
            showAuthStatus('Erro ao enviar e-mail de recuperação', 'error');
        }
    } else {
        alert('Modo offline: funcionalidade não disponível');
    }
}

// Sincronização de dados
async function syncLocalDataToCloud() {
    if (!isFirebaseAvailable || !isOnline) return;
    
    try {
        const user = firebaseAuth.currentUser;
        if (!user) return;
        
        const localData = await getAllLocalData();
        const userId = user.uid;
        
        // Sincronizar cada coleção
        for (const [collection, data] of Object.entries(localData)) {
            if (Array.isArray(data)) {
                const batch = firebaseDb.batch();
                const collectionRef = firebaseDb.collection(`users/${userId}/${collection}`);
                
                // Buscar dados existentes na nuvem
                const cloudSnapshot = await collectionRef.get();
                const cloudData = {};
                cloudSnapshot.forEach(doc => {
                    cloudData[doc.id] = doc.data();
                });
                
                // Comparar e atualizar
                for (const item of data) {
                    const docRef = collectionRef.doc(item.id);
                    const cloudItem = cloudData[item.id];
                    
                    if (!cloudItem || new Date(item.updatedAt || 0) > new Date(cloudItem.updatedAt || 0)) {
                        batch.set(docRef, {
                            ...item,
                            updatedAt: new Date().toISOString(),
                            synced: true
                        });
                    }
                }
                
                await batch.commit();
            }
        }
        
        console.log('Dados sincronizados com Firebase');
    } catch (error) {
        console.error('Erro na sincronização:', error);
    }
}

async function syncCloudToLocal() {
    if (!isFirebaseAvailable || !isOnline) return;
    
    try {
        const user = firebaseAuth.currentUser;
        if (!user) return;
        
        const userId = user.uid;
        const collections = ['products', 'services', 'clients', 'suppliers', 'transactions', 'rpas', 'appointments'];
        
        for (const collection of collections) {
            const snapshot = await firebaseDb.collection(`users/${userId}/${collection}`).get();
            const data = [];
            snapshot.forEach(doc => data.push(doc.data()));
            
            // Salvar no IndexedDB
            await saveToIndexedDB(collection, data);
        }
        
        console.log('Dados do Firebase sincronizados localmente');
    } catch (error) {
        console.error('Erro ao sincronizar do Firebase:', error);
    }
}

// Exportar funções
window.firebaseFunctions = {
    isFirebaseAvailable: () => isFirebaseAvailable,
    isOnline: () => isOnline,
    loginWithGoogle,
    resetPassword,
    syncLocalDataToCloud,
    syncCloudToLocal
};