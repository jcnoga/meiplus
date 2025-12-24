// --- CONSTANTES DE SEGURANÇA E CONFIGURAÇÃO ---
 manter o finalDataToSave
                }

                // C. Enviar Dados Mesclados de volta para Nuvem
                await userRef.set(finalDataToSave);
                
                this.isDirty = false;
const DEFAULT_URL_FISCAL = "https://www.nfse.gov.br/EmissorNacional                this.updateSyncStatus(true);
                saveStatus.cloud = true;

                if (isManual/Login?ReturnUrl=%2fEmissorNacional";
const DEFAULT_URL_DAS = "https://wwwSync) showToast("Sincronização completa (Bidirecional)!", "success");

            } catch(8.receita.fazenda.gov.br/SimplesNacional/Aplicacoes/ATSPO/pgmei.app/Identificacao";
const DB_KEY = 'MEI_SYSTEM_V11';e) { 
                console.error("Falha no Sync:", e); 
                this.isDirty = true

// Constantes da Licença
const LIC_PAD_VAL = 13;
const LIC_MULT;
                this.updateSyncStatus(false);
                let errorMsg = "Erro desconhecido na nu_FACTOR = 9;
const LIC_YEAR_BASE = 1954;

// Configuraçãovem.";
                if (e.code === 'permission-denied') errorMsg = "Sem permissão. Ver Firebase (Adicione suas chaves aqui)
const firebaseConfig = {
  apiKey: "AIzaSyAYifique login.";
                else if (e.code === 'unavailable') errorMsg = "Servidor indisponível.";
06PHLqEUCBzg9SjnH4N6xe9ZzM8OLvo                saveStatus.error = errorMsg;
                showToast(`Falha na Nuvem: ${errorMsg}`, "",
  authDomain: "projeto-bfed3.firebaseapp.com",
  projectId: "projetoerror");
            }
        } else {
            this.isDirty = true;
            this.update-bfed3",
  storageBucket: "projeto-bfed3.firebasestorage.app",SyncStatus(false);
            if(isManualSync && !navigator.onLine) showToast("Você está Offline. Sal
  messagingSenderId: "785289237066",
  appIdvo localmente.", "info");
        }
        
        return saveStatus;
    },

    async load(): "1:785289237066:web:8206fe {
        let data = null;
        try {
            const db = await this.initDB();
2e1073db72d5ccb3"
};

// --- FUNÇÃO AUXILIAR DE NOTIFICAÇÃO (TOAST) ---
function showToast(message, type = 'info') {            data = await new Promise(resolve => {
                const tx = db.transaction(this.storeName, 'readonly');
                const req = tx.objectStore(this.storeName).get('main_data');
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    let
                req.onsuccess = () => resolve(req.result);
                req.onerror = () => resolve(null);
            });
        } catch(e) { console.warn("Erro IDB", e); icon = '';
    if(type === 'success') icon = '✅ ';
    if(type === 'error') icon = '❌ ';
    if(type === 'info') icon = 'ℹ️ ';

     }

        if (!data) {
            const ls = localStorage.getItem(DB_KEY);
            if (toast.innerText = icon + message;
    container.appendChild(toast);

    setTimeout(() => {
        ls) data = JSON.parse(ls);
        }
        return data;
    },

    asynctoast.style.animation = 'fadeOut 0.5s ease-out forwards';
        setTimeout(() => toast loadCloudData(userId) {
        if (navigator.onLine && firebaseConfig.apiKey) {
            try.remove(), 500);
    }, 4000);
}

// --- GEST {
                const dbCloud = firebase.firestore();
                const doc = await dbCloud.collection('users').OR DE DADOS HÍBRIDO (SMART SYNC V2) ---
const DataManager = {
doc(userId).get();
                if (doc.exists) return doc.data();
            } catch(    dbName: 'MEI_DB_HYBRID',
    storeName: 'mei_data',
e) { console.error("Erro cloud load", e); }
        }
        return null;
    },

    isDirty: false, 
    
    async initDB() {
        return new Promise((resolve,    async forceSync(currentData) {
        if (currentData && currentData.currentUser) {
             reject) => {
            const req = indexedDB.open(this.dbName, 1);
            console.log("Reconexão detectada. Iniciando Sync...");
            showToast("Reconectado! Sincronizandoreq.onupgradeneeded = (e) => {
                const db = e.target.result;...", "info");
            await this.save(currentData);
            // Atualiza a UI após o merge
                if (!db.objectStoreNames.contains(this.storeName)) {
                    db.createObjectStore(this.storeName);
                }
            };
            req.onsuccess = () => resolve (caso haja novos dados da nuvem)
            if(currentCrudType) renderCrud(currentCrudType);
            (req.result);
            req.onerror = () => reject(req.error);
        });
    if(document.getElementById('view-agenda').classList.contains('hidden') === false) renderAgenda();
            if},

    // Sincronização Inteligente Bidirecional (Merge + Tombstones)
    async smartSync(document.getElementById('view-financeiro').classList.contains('hidden') === false) renderTransactions();
            (localData) {
        if (!navigator.onLine || !firebaseConfig.apiKey || !localData.currentUser)updateDashboard();
        }
    },

    updateSyncStatus(isOnline) {
        const el = {
            return { success: false, error: "Offline ou não configurado" };
        }

        try {
 document.getElementById('sync-indicator');
        const userNameDisplay = document.getElementById('user-name-display');            const dbCloud = firebase.firestore();
            const userRef = dbCloud.collection('users').doc(local
        if(el) {
            if (isOnline) {
                el.className = 'sync-status sync-online';
                el.title = 'Sincronizado (Nuvem)';
                ifData.currentUser.id);
            const docSnap = await userRef.get();

            // Se não existe na(userNameDisplay) userNameDisplay.style.color = 'inherit';
            } else {
                el.className nuvem, faz o upload inicial
            if (!docSnap.exists) {
                await userRef.set( = 'sync-status sync-offline';
                el.title = 'Pendente Envio / Offline';
                JSON.parse(JSON.stringify(localData)));
                return { success: true, method: 'upload_init' };if(userNameDisplay) userNameDisplay.style.color = '#ca8a04';
            }
        
            }

            const cloudData = docSnap.data();
            const currentUserId = localData.currentUser}
    }
};

// --- INICIALIZAÇÃO FIREBASE ---
if (firebaseConfig.apiKey) {
.id;
            
            // Garante estruturas
            if (!localData.records[currentUserId]) localData.records    try {
        firebase.initializeApp(firebaseConfig);
    } catch(e) { console.error("Firebase[currentUserId] = {};
            if (!cloudData.records[currentUserId]) cloudData.records[current Init Error", e); }
}

let appData = { currentUser: null, users: [], records: {},UserId] = {};

            const localRec = localData.records[currentUserId];
            const cloudRec = cloud irrfTable: [] };

const DEFAULT_IRRF = [
    { id: 'irrf_1Data.records[currentUserId];

            // Listas que serão sincronizadas
            const keysToSync = ['products', '', max: 2259.20, rate: 0, deduction: 0 },
    services', 'clients', 'suppliers', 'transactions', 'rpas', 'appointments'];

            // Lógica de{ id: 'irrf_2', max: 2826.65, rate: 7 Merge para cada lista
            keysToSync.forEach(key => {
                // Inicializa arrays se não existirem.5, deduction: 169.44 },
    { id: 'irrf_3', max: 3751.05, rate: 15, deduction: 381.
                if (!localRec[key]) localRec[key] = [];
                if (!cloudRec[key44 },
    { id: 'irrf_4', max: 4664.68]) cloudRec[key] = [];

                // Recupera Tombstones (IDs excluídos)
                const localDeleted, rate: 22.5, deduction: 662.77 },
    { id: = localRec.tombstones || [];
                const cloudDeleted = cloudRec.tombstones || [];

 'irrf_5', max: 99999999, rate: 27.                // Mapa final unificado
                const mergedMap = new Map();

                // 1. Processa Nu5, deduction: 896.00 }
];

let currentCrudType = 'products'; vem
                cloudRec[key].forEach(item => {
                    // Se foi deletado localmente recentemente, ignora

let currentListingType = 'clients';
let currentFinanceFilter = 'all';

async function init() {
    window.addEventListener('online', () => DataManager.forceSync(appData));
    window.addEventListener                    if (localDeleted.some(t => t.id === item.id)) return;
                    mergedMap.('offline', () => {
        DataManager.updateSyncStatus(false);
        showToast("Conexãoset(item.id, item);
                });

                // 2. Processa Local (Resolve conflitos por perdida. Modo Offline.", "info");
    });

    const loadedData = await DataManager.load();
 Data de Atualização)
                localRec[key].forEach(item => {
                    // Se foi deletado na    if (loadedData) appData = loadedData;
    
    if (!appData.irrfTable nuvem, ignora
                    if (cloudDeleted.some(t => t.id === item.id)) || appData.irrfTable.length === 0) appData.irrfTable = JSON.parse( return;

                    if (mergedMap.has(item.id)) {
                        const cloudItem = mergedMap.JSON.stringify(DEFAULT_IRRF));
    
    const sessionUser = sessionStorage.getItem('mei_user_id');
    if (sessionUser) {
        const user = appData.users.find(uget(item.id);
                        // Vence quem tiver updatedAt maior (ou se não tiver, assume local como => u.id === sessionUser);
        if (user) { loginUser(user); return; }
 mais recente por ser interação ativa)
                        const localTime = item.updatedAt || 0;
                        const cloud    }
    showAuth();
}

function showAuth() { document.getElementById('auth-screen').classListTime = cloudItem.updatedAt || 0;
                        
                        if (localTime >= cloudTime) {.remove('hidden'); document.getElementById('app-container').classList.add('hidden'); }

async function saveData
                            mergedMap.set(item.id, item);
                        }
                        // Se cloudTime > localTime(isManual = false) { 
    return await DataManager.save(appData, isManual); , mantém o que já estava no map (cloudItem)
                    } else {
                        // Novo localmente
                        merged
}

// Helper para marcar exclusão (Tombstone)
function markAsDeleted(id) {
    ifMap.set(item.id, item);
                    }
                });

                // Atualiza a lista local (!appData.currentUser) return;
    const rec = getUserData();
    if (!rec.deleted_ com o resultado do merge
                localRec[key] = Array.from(mergedMap.values());
            });registry) rec.deleted_registry = [];
    if (!rec.deleted_registry.includes(id)) {
        rec.deleted_registry.push(id);
    }
}

async function loginUser(user

            // Merge de Tombstones (Para propagar exclusões futuras)
            const allTombstones = [...(localRec.tombstones || []), ...(cloudRec.tombstones || [])];
            // Remove duplicatas de tombstones mant) {
    // Tenta obter versão mais recente da nuvem ao logar
    if (navigator.onLine) {
        showToast("Buscando dados na nuvem...", "info");
        const cloudDataendo o mais recente
            const uniqueTombstones = Array.from(new Map(allTombstones.map(item => [item.id, item])).values());
            localRec.tombstones = uniqueTomb = await DataManager.loadCloudData(user.id);
        if (cloudData) {
            //stones;

            // Merge de Configurações da Empresa (Last Write Wins baseado em updatedAt se existir, senão Local Se existir localmente, faz merge. Se não, usa cloud.
            if (appData.records[user.id]) {
                const merged = SyncEngine.mergeUserRecords(appData.records[user.id], cloudData.records[user.id]);
                appData.records[user.id] = merged;
                // Atualiza também)
            if (localData.currentUser.company && cloudData.currentUser.company) {
                 // Simpl configurações do usuário se a nuvem for mais recente (simplificado)
                appData.users = appData.ificação: Assume local como verdade se houve edição recente, idealmente teria updatedAt na company
            } else if (cloudData.currentUser.company && !localData.currentUser.company.name) {
                localData.currentUser.company = cloudData.currentUser.company;
            }

            // Salva o resultado mesclado na Nuvem
            constusers.map(u => u.id === user.id ? {...u, ...cloudData.currentUser} : u);
 payload = JSON.parse(JSON.stringify(localData));
            await userRef.set(payload);

                user = appData.users.find(u => u.id === user.id);
            } else {
                appData = cloudData;
                user = appData.users.find(u => u.id ===            // Retorna os dados mesclados para salvar Localmente
            return { success: true, mergedData: localData, method: 'merge' };

        } catch (e) {
            console.error("Smart Sync Failed user.id) || user;
            }
            console.log("Login: Dados sincronizados/restaur:", e);
            let errorMsg = "Erro na sincronização.";
            if (e.code === 'permissionados.");
        }
    }

    appData.currentUser = user; 
    sessionStorage.setItem-denied') errorMsg = "Sem permissão. Verifique login.";
            return { success: false, error: error('mei_user_id', user.id);
    
    document.getElementById('auth-screen').classList.add('hidden');
    document.getElementById('app-container').classList.remove('hidden');
    documentMsg };
        }
    },

    // Save Principal
    async save(data, isManualSync = false.getElementById('user-name-display').innerText = user.name;
    
    if(!appData.) {
        let saveStatus = { local: false, cloud: false, error: null };

        //records[user.id]) {
        appData.records[user.id] = createSeedData().records 1. Persistência Local Imediata (Segurança de Dados)
        try {
            const db = await this.initDB();
            const tx = db.transaction(this.storeName, 'readwrite');
.placeholder_id; 
        // Ajuste no ID do seed
        appData.records[user.id].            const sanitizedData = JSON.parse(JSON.stringify(data));
            tx.objectStore(this.products = []; // Limpa seed dummy se for novo
    }
    // Garante array de exclusões
    ifstoreName).put(sanitizedData, 'main_data');
            try { localStorage.setItem(DB_KEY(!appData.records[user.id].deleted_registry) appData.records[user.id].deleted, JSON.stringify(sanitizedData)); } catch(e) {}
            saveStatus.local = true;_registry = [];
    if(!appData.records[user.id].appointments) appData.records[
        } catch(e) { 
            console.error("Erro Crítico Local", e);
            user.id].appointments = [];
    
    checkLicense(); navTo('dashboard'); loadFiscalReminders();saveStatus.error = "Falha ao salvar no dispositivo.";
            if (isManualSync) showToast("Erro
    DataManager.updateSyncStatus(navigator.onLine);
    saveData(); 
}

function logout() { appData.currentUser = null; sessionStorage.removeItem('mei_user_id'); location.reload(); } Crítico: Falha no disco!", "error");
            return saveStatus;
        }

        // 2. S

function toggleAuth(screen) {
    document.getElementById('login-form').classList.toggle('hidden',incronização Nuvem (Merge Strategy)
        if (navigator.onLine && firebaseConfig.apiKey && firebase screen === 'register');
    document.getElementById('register-form').classList.toggle('hidden', screen !== 'register');
}

function handleGoogleLogin() {
    if (!firebaseConfig.apiKey) {
        alert.apps.length && data.currentUser) {
            // Se for sync manual ou se estiver online, tenta o Smart Sync
            const syncResult = await this.smartSync(data);
            
            if (syncResult.('Configure as chaves do Firebase.');
        return;
    }
    const provider = new firebase.auth.success) {
                this.isDirty = false;
                this.updateSyncStatus(true);
                GoogleAuthProvider();
    firebase.auth().signInWithPopup(provider).then((result) => {
        constsaveStatus.cloud = true;

                // Se houve merge (dados novos da nuvem vieram), precisamos atualizar a user = result.user;
        let appUser = appData.users.find(u => u.email === user.email);
        if(!appUser) {
            appUser = {
                id: ' memória e o disco local novamente
                if (syncResult.mergedData) {
                    // Atualiza a referenciau_' + user.uid, 
                name: user.displayName, 
                email: user.email global (Cuidado com referencias circulares)
                    Object.assign(appData, syncResult.mergedData);
                    //, 
                password: 'google_auth', 
                licenseExpire: new Date().getTime() + ( Salva novamente localmente o resultado do merge
                    const db = await this.initDB();
                    const tx =90 * 86400000),
                company: { reserve_rate: 10, prolabore_target: 4000 }
            };
            appData.users. db.transaction(this.storeName, 'readwrite');
                    tx.objectStore(this.storeName).put(JSON.parse(JSON.stringify(appData)), 'main_data');
                    
                    //push(appUser);
            appData.records[appUser.id] = { products: [], services: [], clients: Se foi manual, avisa e recarrega views se necessário
                    if (isManualSync) {
                         [], suppliers: [], transactions: [], rpas: [], appointments: [], deleted_registry: [] };
        }
        loginUser(appUser);
    }).catch((error) => {
        showToast("Erro Google: " + errorshowToast("Sincronização completa! Dados atualizados.", "success");
                        // Recarrega a tela.message, "error");
    });
}

function createSeedData() {
    const today = new atual para refletir dados vindos da nuvem
                        const activeNav = document.querySelector('.nav-item.active');
                        if (activeNav) activeNav.click();
                    }
                } else if (isManualSync) {
                    showToast("Dados enviados para nuvem.", "success");
                }

            } else {
                this.isDirty = true;
                this.updateSyncStatus(false);
                saveStatus.error = syncResult.error;
                if (isManualSync) showToast(`Nuvem: ${ Date().toISOString().split('T')[0];
    return {
        records: {
            placeholder_id: {
                products: [], services: [], clients: [], suppliers: [], transactions: [], rpas: [], appointmentssyncResult.error}`, "error");
            }
        } else {
            this.isDirty = true: [], deleted_registry: []
            }
        }
    };
}

document.getElementById('register-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('reg-email').value;
    if (appData.users.find(u => u.;
            this.updateSyncStatus(false);
            if(isManualSync && !navigator.onLineemail === email)) { showToast('E-mail já existe!', 'error'); return; }
    
    const newUser = {
        id: 'u_' + Date.now(), name: document.getElementById('reg-name').) showToast("Você está Offline. Salvo localmente.", "info");
        }
        
        return savevalue, email: email,
        password: document.getElementById('reg-password').value,
        licenseExpireStatus;
    },

    async load() {
        let data = null;
        try {
            const db =: new Date().getTime() + (90 * 86400000),
        company await this.initDB();
            data = await new Promise(resolve => {
                const tx = db.: { reserve_rate: 10, prolabore_target: 4000 }
    transaction(this.storeName, 'readonly');
                const req = tx.objectStore(this.storeName};
    appData.users.push(newUser); 
    appData.records[newUser.id]).get('main_data');
                req.onsuccess = () => resolve(req.result);
 = { products: [], services: [], clients: [], suppliers: [], transactions: [], rpas: [], appointments: [],                req.onerror = () => resolve(null);
            });
        } catch(e) { console. deleted_registry: [] };
    
    saveData(); loginUser(newUser);
});

document.getElementByIdwarn("Erro IDB", e); }
        if (!data) { const ls = localStorage.getItem(DB('login-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const user_KEY); if (ls) data = JSON.parse(ls); }
        return data;
    }, = appData.users.find(u => u.email === document.getElementById('login-email').value && u.password === document.getElementById('login-password').value);
    if (user) loginUser(user

    async loadCloudData(userId) {
        // Método mantido para compatibilidade de login, mas o); else showToast('Credenciais inválidas.', 'error');
});

function navTo(viewId) { smartSync assume a carga principal
        if (navigator.onLine && firebaseConfig.apiKey && firebase.apps.
    document.querySelectorAll('main section').forEach(el => el.classList.add('hidden'));
    documentlength) {
            try {
                const dbCloud = firebase.firestore();
                const doc = await db.getElementById('view-' + viewId).classList.remove('hidden');
    document.querySelectorAll('.nav-itemCloud.collection('users').doc(userId).get();
                if (doc.exists) return doc.data').forEach(el => el.classList.remove('active'));
    const btn = Array.from(document.();
            } catch(e) { console.error("Erro loadCloud", e); }
        }
        return nullquerySelectorAll('.nav-item')).find(el => el.getAttribute('onclick').includes(viewId));
    if;
    },

    async forceSync(currentData) {
        if (this.isDirty && current(btn) btn.classList.add('active');
    
    if(viewId === 'dashboard') updateData) {
            console.log("Reconectado. Sincronizando...");
            showToast("ConDashboard();
    if(viewId === 'listagens') switchListing('clients');
    if(viewIdexão retomada. Sincronizando...", "info");
            await this.save(currentData, true); // Usa === 'financeiro') renderTransactions();
    if(viewId === 'cadastros') renderCrud(current modo manual para forçar feedback visual e merge
        } else {
            this.updateSyncStatus(true);CrudType);
    if(viewId === 'agenda') renderAgenda();
    if(viewId === 'fiscal') {
        renderIrrf();
        const comp = appData.currentUser.company || {};
        
        }
    },

    updateSyncStatus(isOnline) {
        const el = document.getElementById('sync-indicator');
        const userNameDisplay = document.getElementById('user-name-display');
        ifdocument.getElementById('link-emissor').href = comp.url_fiscal || DEFAULT_URL_FISCAL;(el) {
            if (isOnline) {
                el.className = 'sync-status sync-
        document.getElementById('link-das').href = comp.url_das || DEFAULT_URL_DAS;
    }
    if(viewId === 'configuracoes') loadSettings();
    if(viewIdonline';
                el.title = 'Sincronizado (Nuvem)';
                if(userNameDisplay === 'rpa') loadRPAOptions();
}

function loadSettings() {
    const c = app) userNameDisplay.style.color = 'inherit';
            } else {
                el.className = 'syncData.currentUser.company || {};
    document.getElementById('conf-company-name').value = c.name-status sync-offline';
                el.title = 'Pendente Envio (Local)';
                if(||''; 
    document.getElementById('conf-cnpj').value = c.cnpj||''; 
userNameDisplay) userNameDisplay.style.color = '#ca8a04';
            }
        }
    }
};

// --- INICIALIZAÇÃO FIREBASE ---
if (firebaseConfig.apiKey) {
    document.getElementById('conf-address').value = c.address||''; 
    document.getElementById('    try {
        firebase.initializeApp(firebaseConfig);
        console.log("Firebase Initialized");
    conf-phone').value = c.phone||''; 
    document.getElementById('conf-whatsapp').value = c.whatsapp||'';
    document.getElementById('conf-url-fiscal').value = c.url} catch(e) { 
        console.error("Firebase Init Error", e);
        showToast("_fiscal || DEFAULT_URL_FISCAL;
    document.getElementById('conf-url-das').value =Erro Config Firebase", "error");
    }
}

let appData = { currentUser: null, users: [], records c.url_das || DEFAULT_URL_DAS;
    document.getElementById('conf-reserve-rate').: {}, irrfTable: [] };

const DEFAULT_IRRF = [
    { id: 'irrf_value = c.reserve_rate || 10;
    document.getElementById('conf-prolabore-1', max: 2259.20, rate: 0, deduction: 0 },
target').value = c.prolabore_target || 4000;
    const adminDiv =    { id: 'irrf_2', max: 2826.65, rate:  document.getElementById('admin-tools');
    if (appData.currentUser.email === 'jcnvap@7.5, deduction: 169.44 },
    { id: 'irrf_3gmail.com') adminDiv.classList.remove('hidden'); else adminDiv.classList.add('hidden');
', max: 3751.05, rate: 15, deduction: 381}

function adminFillData() {
    if (appData.currentUser.email !== 'jcnvap@.44 },
    { id: 'irrf_4', max: 4664.6gmail.com') return;
    if (!confirm('ATENÇÃO: Isso preencherá o sistema com dados fict8, rate: 22.5, deduction: 662.77 },
    { idícios. Continuar?')) return;
    const today = new Date();
    const formatDate = (date): 'irrf_5', max: 99999999, rate: 27 => date.toISOString().split('T')[0];
    appData.currentUser.company = { name: ".5, deduction: 896.00 }
];

let currentCrudType = 'products';Empresa Modelo Tech Ltda", cnpj: "12.345.678/000 
let currentListingType = 'clients';
let currentFinanceFilter = 'all';

async function init() {
    window.addEventListener('online', () => DataManager.forceSync(appData));
    window.1-90", address: "Av. Paulista, 1000", phone: "(11) 98765-4321", whatsapp: "(11) 98765-4addEventListener('offline', () => {
        DataManager.updateSyncStatus(false);
        showToast("Modo Offline At321", role: "both", url_fiscal: DEFAULT_URL_FISCAL, url_das:ivado", "info");
    });

    const loadedData = await DataManager.load();
    if ( DEFAULT_URL_DAS, reserve_rate: 15, prolabore_target: 500loadedData) appData = loadedData;
    
    if (!appData.irrfTable || appData0 };
    const rec = appData.records[appData.currentUser.id];
    // Seed básico.irrfTable.length === 0) appData.irrfTable = JSON.parse(JSON.stringify com timestamp
    const ts = Date.now();
    rec.clients = [{id: 'c1',(DEFAULT_IRRF));
    
    const sessionUser = sessionStorage.getItem('mei_user_id');
    if (sessionUser) {
        const user = appData.users.find(u => u. name: 'Cliente A', _updatedAt: ts}];
    rec.transactions = [{id: 't1', type: 'receita', value: 100, date: formatDate(today), _updatedAt: ts}];
    saveData(); showToast('Dados de teste gerados!', 'success'); location.reload();
id === sessionUser);
        if (user) { loginUser(user); return; }
    }
    showAuth();
}

function showAuth() { document.getElementById('auth-screen').classList.remove('}

function adminClearData() {
    if (appData.currentUser.email !== 'jcnvap@hidden'); document.getElementById('app-container').classList.add('hidden'); }

async function saveData(isManualgmail.com') return;
    if (!confirm('PERIGO: Isso apagará TUDO.')) return;
 = false) { 
    return await DataManager.save(appData, isManual); 
}

    appData.records[appData.currentUser.id] = { products: [], services: [], clients: [],// Helper para Registrar Exclusão (Tombstone)
function registerDeletion(id) {
    if (!appData.currentUser) return;
    const rec = appData.records[appData.currentUser.id];
 suppliers: [], transactions: [], rpas: [], appointments: [], deleted_registry: [] };
    saveData(); showToast('Sistema limpo.', 'info'); location.reload();
}

function saveCompanyData(e) {
    if (!rec.tombstones) rec.tombstones = [];
    // Adiciona o ID à    e.preventDefault();
    const companyData = {
        name: document.getElementById('conf-company-name').value,
        cnpj: document.getElementById('conf-cnpj').value,
        address: document. lista de excluídos com timestamp
    rec.tombstones.push({ id: id, deletedAt: Date.now() });
}

// Helper para Adicionar Timestamp em Objetos
function stampObject(obj) {
    objgetElementById('conf-address').value,
        phone: document.getElementById('conf-phone').value,
        whatsapp: document.getElementById('conf-whatsapp').value,
        role: document.getElementById('conf-role')..updatedAt = Date.now();
    return obj;
}

async function loginUser(user) {value,
        url_fiscal: document.getElementById('conf-url-fiscal').value,
        url_
    // Tenta merge inicial se online
    if (navigator.onLine) {
        const cloudData =das: document.getElementById('conf-url-das').value,
        reserve_rate: parseFloat(document. await DataManager.loadCloudData(user.id);
        if (cloudData) {
            // MesgetElementById('conf-reserve-rate').value),
        prolabore_target: parseFloat(document.getElementById('conf-prolabore-target').value)
    };
    appData.currentUser.company = companyDataclagem simples inicial para garantir que temos dados antes de renderizar
            // O SmartSync completo rodará no saveData;
    const idx = appData.users.findIndex(u=>u.id===appData.currentUser.
            appData = cloudData;
            user = appData.users.find(u => u.id ===id); 
    appData.users[idx] = appData.currentUser; 
    saveData(); showToast('Configurações salvas!', 'success');
}

function updateDashboard() {
    const t = getUserData().transactions || []; 
    const currentMonth = new Date().getMonth();
    const currentYear = new user.id) || user;
        }
    }

    appData.currentUser = user; 
    sessionStorage.setItem('mei_user_id', user.id);
    
    document.getElementById('auth-screen').classList.add('hidden');
    document.getElementById('app-container').classList.remove(' Date().getFullYear();
    const reserveRate = appData.currentUser.company?.reserve_rate || 10;hidden');
    document.getElementById('user-name-display').innerText = user.name;
    
    
    const prolaboreTarget = appData.currentUser.company?.prolabore_target || 40if(!appData.records[user.id]) {
        appData.records[user.id] = create00;
    let income = 0; let expense = 0; let totalReserve = 0;SeedData().records[user.id] || { 
            products: [], services: [], clients: [], suppliers let totalProlabore = 0;
    t.forEach(x => {
        const d = new: [], transactions: [], rpas: [], appointments: [], tombstones: [] 
        };
    } Date(x.date);
        const isCurrentMonth = d.getMonth() === currentMonth && d.getFullYear
    
    // Garante array de tombstones
    if(!appData.records[user.id].tomb() === currentYear;
        if (x.type === 'receita') {
            if (isCurrentMonth) {stones) appData.records[user.id].tombstones = [];
    if(!appData.records
                income += x.value;
                const reserveAmount = x.value * (reserveRate / 1[user.id].appointments) appData.records[user.id].appointments = [];
    
    check00);
                totalReserve += reserveAmount;
                const remainder = x.value - reserveAmount;
License(); navTo('dashboard'); loadFiscalReminders();
    
    DataManager.updateSyncStatus(navigator.                const needed = prolaboreTarget - totalProlabore;
                if (needed > 0) totalonLine);
    saveData(); // Salva e dispara Sync
}

function logout() { appData.currentUserProlabore += (remainder >= needed) ? needed : remainder;
            }
        } else { if ( = null; sessionStorage.removeItem('mei_user_id'); location.reload(); }

function toggleAuth(screenisCurrentMonth) expense += x.value; }
    });
    document.getElementById('dash-income').) {
    document.getElementById('login-form').classList.toggle('hidden', screen === 'register');
innerText = `R$ ${income.toFixed(2)}`;
    document.getElementById('dash-expense').innerText =    document.getElementById('register-form').classList.toggle('hidden', screen !== 'register');
}

function `R$ ${expense.toFixed(2)}`;
    document.getElementById('dash-balance').innerText = `R handleGoogleLogin() {
    if (!firebaseConfig.apiKey) {
        alert('Simulação: Login com$ ${(income-expense).toFixed(2)}`;
    document.getElementById('reserve-percent-display').innerText = Google realizado! (Configure as chaves do Firebase para ativar)');
        return;
    }
    const provider reserveRate;
    document.getElementById('dash-reserve').innerText = `R$ ${totalReserve.toFixed( = new firebase.auth.GoogleAuthProvider();
    firebase.auth().signInWithPopup(provider).then((result2)}`;
    document.getElementById('dash-prolabore').innerText = `R$ ${totalProlabore) => {
        const user = result.user;
        let appUser = appData.users.find.toFixed(2)}`;
    document.getElementById('dash-prolabore-target').innerText = `Meta:(u => u.email === user.email);
        if(!appUser) {
            appUser = R$ ${prolaboreTarget.toFixed(2)}`;
}

function renderAgenda(filter = '') {
 {
                id: 'u_' + user.uid, 
                name: user.displayName, 
    if(!getUserData().appointments) getUserData().appointments = [];
    let list = getUserData().appointments.sort((a,b) => new Date(a.date+'T'+a.time) - new Date(                email: user.email, 
                password: 'google_auth', 
                licenseExpire: new Date().getTime() + (90 * 86400000),
                company: {b.date+'T'+b.time));
    if (filter === 'today') {
        const today reserve_rate: 10, prolabore_target: 4000 }
            };
 = new Date().toISOString().split('T')[0];
        list = list.filter(a => a.            appData.users.push(appUser);
            appData.records[appUser.id] =date === today);
    } else if (!filter) {
        const inputDate = document.getElementById('agenda createSeedData().records[appUser.id]; 
        }
        loginUser(appUser);
-filter-date').value;
        if(inputDate) list = list.filter(a => a.    }).catch((error) => {
        showToast("Erro Google: " + error.message, "error");
    date === inputDate);
    }
    const container = document.getElementById('agenda-list');
    container});
}

function createSeedData() {
    const today = new Date().toISOString().split('T')[.innerHTML = '';
    if (list.length === 0) { container.innerHTML = '<p class="0];
    const now = Date.now();
    // Adicionando updatedAt aos seeds
    return {text-center p-4" style="grid-column: 1/-1;">Nenhum agendamento encontrado.</p
        records: {
            placeholder_id: {
                products: [{id: 'p_ex',>'; return; }
    const statusMap = { 'agendado': { label: 'Agendado', name: 'Produto Exemplo A', price: 100.00, description: 'Produto para teste class: 'bg-scheduled', card: 'status-agendado' }, 'concluido': { label', updatedAt: now}], 
                services: [{id: 's_ex', name: 'Serviço: 'Concluído', class: 'bg-done', card: 'status-concluido' }, ' Exemplo B', price: 200.00, description: 'Serviço para teste', updatedAtcancelado': { label: 'Cancelado', class: 'bg-canceled', card: 'status-cancelado: now}], 
                clients: [{id: 'c_ex', name: 'Cliente Teste', phone' } };
    list.forEach(a => {
        const st = statusMap[a.status]: '(11) 99999-9999', address: 'Rua Exemplo || statusMap['agendado'];
        const formattedDate = a.date.split('-').reverse().join, 100', cnpj_cpf: '000.000.000-0('/');
        const card = document.createElement('div');
        card.className = `stat-card agenda-0', contact_person: 'João', email: 'cliente@teste.com', updatedAt: now}], 
card ${st.card}`;
        card.innerHTML = `
            <div class="flex justify-between items                suppliers: [{id: 'f_ex', name: 'Fornecedor Teste', phone: '(1-start mb-2"><span class="badge ${st.class}">${st.label}</span><div class="1) 88888-8888', address: 'Av Exemplo, 20text-sm font-bold text-light">${formattedDate} - ${a.time}</div></div>
            <0', cnpj_cpf: '00.000.000/0001-0h3 class="mb-1">${a.title}</h3>
            <p class="text-sm mb-0', contact_person: 'Maria', email: 'fornecedor@teste.com', updatedAt: now}],1"><strong>Cliente:</strong> ${a.client_name}</p>
            <p class="text-sm 
                transactions: [
                    {id: 't_ex1', type: 'receita', category mb-2 text-light">${a.service_desc || 'Sem descrição'}</p>
            <div: 'Venda de produto', value: 150.00, date: today, obs: ' class="flex justify-between items-center mt-2 border-t pt-2">
                <div classVenda inicial de teste', entity: 'Cliente Teste', updatedAt: now},
                    {id: 't="text-sm"><span class="${a.pay_status === 'pago' ? 'text-success font_ex2', type: 'despesa', category: 'Despesas Operacionais', value: 50-bold' : 'text-warning'}">${a.pay_status === 'pago' ? '💲 Pago' : '⏳ Pendente'}</span> - R$ ${parseFloat(a.value).toFixed(2)}</div>
.00, date: today, obs: 'Despesa inicial de teste', entity: 'Fornecedor Teste', updatedAt: now}
                ], 
                rpas: [],
                appointments: [],
                                <div><button class="action-btn btn-warning" onclick="editAppointment('${a.id}')">✏tombstones: []
            }
        }
    };
}

document.getElementById('register-form️</button><button class="action-btn btn-danger" onclick="deleteAppointment('${a.id}')">').addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById🗑️</button></div>
            </div>`;
        container.appendChild(card);
    });
}

('reg-email').value;
    if (appData.users.find(u => u.email ===function openAppointmentModal(appt = null) {
    document.getElementById('form-appointment').reset();
     email)) {
        showToast('E-mail já existe!', 'error');
        return;
    }const clientSelect = document.getElementById('appt-client-select');
    clientSelect.innerHTML = '<option value
    const newUser = {
        id: 'u_' + Date.now(), name: document.getElementById('="">Selecionar Cliente...</option>';
    (getUserData().clients||[]).forEach(c => { clientSelect.innerHTML +=reg-name').value, email: email,
        password: document.getElementById('reg-password').value,
        licenseExpire: new Date().getTime() + (90 * 86400000 `<option value="${c.id}">${c.name}</option>`; });
    if (appt) {
        document.getElementById('appt-id').value = appt.id;
        document.getElementById('appt-title),
        company: { reserve_rate: 10, prolabore_target: 400').value = appt.title;
        document.getElementById('appt-date').value = appt.date0 }
    };
    appData.users.push(newUser); 
    const seed = createSeedData().records.placeholder_id;
    appData.records[newUser.id] = seed;
    ;
        document.getElementById('appt-time').value = appt.time;
        document.getElementById('saveData(); loginUser(newUser);
});

document.getElementById('login-form').addEventListener('submit', (appt-client-name').value = appt.client_name;
        document.getElementById('appt-cliente) => {
    e.preventDefault();
    const user = appData.users.find(u =>-phone').value = appt.client_phone;
        document.getElementById('appt-desc').value = appt.service_desc;
        document.getElementById('appt-value').value = appt.value; u.email === document.getElementById('login-email').value && u.password === document.getElementById('login-password').value);
    if (user) { loginUser(user); } else { showToast('Credenciais
        document.getElementById('appt-status').value = appt.status;
        document.getElementById('appt inválidas.', 'error'); }
});

function navTo(viewId) {
    document.querySelectorAll('-pay-method').value = appt.pay_method;
        document.getElementById('appt-pay-main section').forEach(el => el.classList.add('hidden'));
    document.getElementById('view-' +status').value = appt.pay_status;
        document.getElementById('appt-obs').value = app viewId).classList.remove('hidden');
    document.querySelectorAll('.nav-item').forEach(el => elt.obs;
    } else {
        document.getElementById('appt-id').value = '';
        .classList.remove('active'));
    const btn = Array.from(document.querySelectorAll('.nav-item')).document.getElementById('appt-date').valueAsDate = new Date();
        document.getElementById('appt-status').value = 'agendado';
    }
    document.getElementById('modal-appointment').classList.removefind(el => el.getAttribute('onclick').includes(viewId));
    if(btn) btn.classList.add('active');
    
    if(viewId === 'dashboard') updateDashboard();
    if(('hidden');
}

function fillAppointmentClient() {
    const id = document.getElementById('appt-client-select').value;
    if(id) { const c = getUserData().clients.find(x =>viewId === 'listagens') switchListing('clients');
    if(viewId === 'financeiro') renderTransactions();
    if(viewId === 'cadastros') renderCrud(currentCrudType);
    if x.id === id); if(c) { document.getElementById('appt-client-name').value = c.name; document.getElementById('appt-client-phone').value = c.phone || ''; } }
}(viewId === 'agenda') renderAgenda();
    if(viewId === 'fiscal') {
        render

function saveAppointment(e) {
    e.preventDefault();
    const id = document.getElementById('apptIrrf();
        const comp = appData.currentUser.company || {};
        document.getElementById('link-emissor').href = comp.url_fiscal || DEFAULT_URL_FISCAL;
        document.getElementById('-id').value;
    const data = {
        id: id || 'appt_' + Date.nowlink-das').href = comp.url_das || DEFAULT_URL_DAS;
    }
    if(),
        title: document.getElementById('appt-title').value,
        date: document.getElementById('appt(viewId === 'configuracoes') loadSettings();
    if(viewId === 'rpa') load-date').value,
        time: document.getElementById('appt-time').value,
        client_name: document.getElementById('appt-client-name').value,
        client_phone: document.getElementById('apptRPAOptions();
}

function loadSettings() {
    const c = appData.currentUser.company || {};
    document.getElementById('conf-company-name').value = c.name||''; 
    -client-phone').value,
        service_desc: document.getElementById('appt-desc').value,
document.getElementById('conf-cnpj').value = c.cnpj||''; 
    document.getElementById('conf        value: document.getElementById('appt-value').value || 0,
        status: document.getElementById('-address').value = c.address||''; 
    document.getElementById('conf-phone').value =appt-status').value,
        pay_method: document.getElementById('appt-pay-method').value, c.phone||''; 
    document.getElementById('conf-whatsapp').value = c.whatsapp||'
        pay_status: document.getElementById('appt-pay-status').value,
        obs: document.getElementById('appt-obs').value,
        _updatedAt: Date.now() // Timestamp para sync
    };
';
    document.getElementById('conf-url-fiscal').value = c.url_fiscal || DEFAULT_URL_FISCAL;
    document.getElementById('conf-url-das').value = c.url_das ||    const list = getUserData().appointments;
    if (id) { const idx = list.findIndex(x DEFAULT_URL_DAS;
    document.getElementById('conf-reserve-rate').value = c.reserve_ => x.id === id); if(idx !== -1) list[idx] = data; } else {rate || 10;
    document.getElementById('conf-prolabore-target').value = c. list.push(data); }
    saveData(); closeModal('modal-appointment'); renderAgenda(); showToast('prolabore_target || 4000;
    const adminDiv = document.getElementById('admin-Agendamento salvo!', 'success');
}

function editAppointment(id) { const appt = getUserDatatools');
    if (appData.currentUser.email === 'jcnvap@gmail.com') { adminDiv.classList().appointments.find(a => a.id === id); if(appt) openAppointmentModal(appt); }.remove('hidden'); } else { adminDiv.classList.add('hidden'); }
}

function adminFill
function deleteAppointment(id) { 
    if(confirm('Excluir este agendamento?'))Data() {
    if (appData.currentUser.email !== 'jcnvap@gmail.com') return { 
        const list = getUserData().appointments; 
        const idx = list.findIndex(a =>;
    if (!confirm('ATENÇÃO: Isso preencherá o sistema com dados fictícios para teste. a.id === id); 
        if(idx !== -1) {
            list.splice(idx,  Continuar?')) return;
    const today = new Date();
    const formatDate = (date) => date.toISOString().1);
            markAsDeleted(id); // Marca tombstone
            saveData(); 
            renderAgenda();split('T')[0];
    const now = Date.now();

    appData.currentUser.company = 
        }
    } 
}

function loadRPAOptions() {
    const comp = app {
        name: "Empresa Modelo Tech Ltda", cnpj: "12.345.678Data.currentUser.company || {};
    document.getElementById('rpa-comp-name').value = comp.name || '';
    document.getElementById('rpa-comp-cnpj').value = comp.cnpj || '';
/0001-90", address: "Av. Paulista, 1000 - SP",
    document.getElementById('rpa-comp-addr').value = comp.address || '';
    if(!document        phone: "(11) 98765-4321", whatsapp: "(11.getElementById('rpa-prov-name').value) { document.getElementById('rpa-prov-name').) 98765-4321", role: "both",
        url_fiscal: DEFAULT_URL_FISCAL, url_das: DEFAULT_URL_DAS, reserve_rate: 15value = appData.currentUser.name; }
    const select = document.getElementById('rpa-provider-select');
    select.innerHTML = '<option value="">Selecione um Autônomo...</option>';
, prolabore_target: 5000
    };
    const rec = appData.records    const suppliers = getUserData().suppliers || [];
    suppliers.forEach(s => select.innerHTML += `<option[appData.currentUser.id];
    rec.clients = [
        {id: 'c1', value="${s.id}">${s.name}</option>`);
    document.getElementById('rpa-date'). name: 'Supermercado Silva', phone: '(11) 91111-111valueAsDate = new Date();
    document.getElementById('rpa-id').value = '';
}

1', address: 'Rua A, 1', cnpj_cpf: '11.111.function fillRPAProvider() {
    const id = document.getElementById('rpa-provider-select').value111/0001-11', contact_person: 'Sr. Silva', email: ';
    const s = getUserData().suppliers.find(item => item.id === id);
    ifsilva@email.com', updatedAt: now},
        {id: 'c2', name: 'Pad (s) {
        document.getElementById('rpa-prov-name').value = s.name;
aria Central', phone: '(11) 92222-2222', address: '        document.getElementById('rpa-prov-cpf').value = s.cnpj_cpf || '';
        documentRua B, 2', cnpj_cpf: '22.222.222/0.getElementById('rpa-prov-phone').value = s.phone || '';
        document.getElementById('r001-22', contact_person: 'Maria', email: 'maria@email.com', updatedAtpa-prov-addr').value = s.address || '';
    }
}

function calculateRPA(): now}
    ];
    rec.suppliers = [
        {id: 's1', name: {
    const value = parseFloat(document.getElementById('rpa-value').value) || 0;
 'Distribuidora Tech', phone: '(11) 81111-1111',    const issRate = parseFloat(document.getElementById('rpa-iss-rate').value) || 0; address: 'Av Ind, 100', cnpj_cpf: '66.666.6
    const inss = value * 0.11;
    document.getElementById('rpa-in66/0001-66', contact_person: 'Roberto', email: 'vendas@ss').value = `R$ ${inss.toFixed(2)}`;
    const iss = value * (isstech.com', updatedAt: now}
    ];
    rec.products = [
        {id: 'Rate / 100);
    document.getElementById('rpa-iss-val').value = `Rp1', name: 'Mouse Sem Fio', price: 45.90, description: 'Mouse$ ${iss.toFixed(2)}`;
    const irrfBase = value - inss;
    let ir óptico', updatedAt: now},
        {id: 'p2', name: 'Teclado Mecânico', price:rf = 0;
    const table = appData.irrfTable.sort((a,b) => 150.00, description: 'Teclado RGB', updatedAt: now}
    ];
 a.max - b.max);
    for(let row of table) { if (irrfBase <=    rec.services = [
        {id: 'sv1', name: 'Formatação PC', price: row.max) { irrf = (irrfBase * (row.rate / 100)) - 120.00, description: 'Backup incluso', updatedAt: now}
    ];
    rec row.deduction; break; } }
    if (irrf < 0) irrf = 0.transactions = [];
    const catsIn = ['Venda', 'Serviço', 'Outros'];
;
    document.getElementById('rpa-irrf').value = `R$ ${irrf.toFixed(    const catsOut = ['Compra', 'Despesa', 'Imposto', 'Gastos Pessoais'];2)}`;
    document.getElementById('rpa-net').value = `R$ ${(value - inss -
    for(let i=0; i<10; i++) {
        const isReceita = iss - irrf).toFixed(2)}`;
}

function saveRPA() {
    const id = document Math.random() > 0.4;
        rec.transactions.push({
            id: 't.getElementById('rpa-id').value;
    const rpa = {
        id: id || '_admin_'+i, type: isReceita ? 'receita' : 'despesa',
            category: isrpa_' + Date.now(),
        date: document.getElementById('rpa-date').value,
Receita ? catsIn[0] : catsOut[0],
            value: 100, date: formatDate(        provider: document.getElementById('rpa-prov-name').value,
        desc: document.getElementById('today), entity: 'Teste', obs: 'Gerado auto', updatedAt: now
        });
    }
    rpa-desc').value,
        value: document.getElementById('rpa-value').value,
        rec.appointments = [
        {id: 'apt1', title: 'Manutenção', date: formatDate(net: document.getElementById('rpa-net').value,
        fullData: {
            provName:today), time: '14:00', client_name: 'Escola Futuro', service_desc document.getElementById('rpa-prov-name').value,
            provCpf: document.getElementById('r: 'Verificar lentidão', value: 300, status: 'agendado', pay_status: 'pendente', pay_method: 'pix', updatedAt: now}
    ];
    saveData();
    showToast('Dados de teste gerados!', 'success');
    location.reload(); 
}

function adminClearpa-prov-cpf').value,
            provPhone: document.getElementById('rpa-prov-phone').value,
            provAddr: document.getElementById('rpa-prov-addr').value,
            inss: document.getElementById('rpa-inss').value,
            iss: document.getElementById('rpa-Data() {
    if (appData.currentUser.email !== 'jcnvap@gmail.com') returniss-val').value,
            irrf: document.getElementById('rpa-irrf').value
        },
        _updatedAt: Date.now()
    };
    if(!getUserData().rpas);
    if (!confirm('PERIGO: Limpar tudo?')) return;
    appData.records[ getUserData().rpas = [];
    const list = getUserData().rpas;
    if(id)appData.currentUser.id] = { products: [], services: [], clients: [], suppliers: [], transactions: [], { const idx = list.findIndex(r => r.id === id); if(idx !== -1) list rpas: [], appointments: [], tombstones: [] };
    saveData();
    showToast('Sistema[idx] = rpa; else list.push(rpa); } else { list.push(rpa limpo.', 'info');
    location.reload();
}

function saveCompanyData(e) {
); }
    saveData(); showToast('RPA Salvo!', 'success'); toggleRPAHistory();
    e.preventDefault();
    const companyData = {
        name: document.getElementById('conf-company-}

function toggleRPAHistory() {
    const container = document.getElementById('rpa-history-containername').value,
        cnpj: document.getElementById('conf-cnpj').value,
        address: document.');
    container.classList.toggle('hidden');
    if(!container.classList.contains('hidden')) {getElementById('conf-address').value,
        phone: document.getElementById('conf-phone').value,
        
        const tbody = document.querySelector('#rpa-history-table tbody');
        tbody.innerHTML = '';
        const list = getUserData().rpas || [];
        list.sort((a,b) => new Date(b.date) - new Date(a.date));
        list.forEach(r => { tbody.innerHTML += `<tr><td>${r.date}</td><td>${r.provider}</td><td>${r.net}</td><td><button class="action-btn btn-warning" onclick="loadRPA('${r.id}')whatsapp: document.getElementById('conf-whatsapp').value,
        role: document.getElementById('conf-role').">✏️</button><button class="action-btn btn-danger" onclick="deleteRPA('${r.value,
        url_fiscal: document.getElementById('conf-url-fiscal').value,
        url_das: document.getElementById('conf-url-das').value,
        reserve_rate: parseFloat(document.getElementById('conf-reserve-rate').value),
        prolabore_target: parseFloat(document.getElementById('id}')">🗑️</button></td></tr>`; });
    }
}

function loadRPA(idconf-prolabore-target').value)
    };
    appData.currentUser.company = companyData;
    const idx = appData.users.findIndex(u=>u.id===appData.currentUser.id); 
    appData.users[idx] = appData.currentUser; 

    const supplierId) {
    const r = getUserData().rpas.find(x => x.id === id);
 = 'sup_own_' + appData.currentUser.id;
    const supplierData = stampObject({
    if(r) {
        document.getElementById('rpa-id').value = r.id;         id: supplierId,
        name: companyData.name + " (Minha Empresa)",
        cnpj
        document.getElementById('rpa-date').value = r.date;
        document.getElementById('r_cpf: companyData.cnpj,
        phone: companyData.phone,
        address: companyData.address,
        email: appData.currentUser.email,
        contact_person: appData.currentUser.pa-desc').value = r.desc;
        document.getElementById('rpa-value').value = r.value;
        document.getElementById('rpa-prov-name').value = r.fullData.provname,
        is_own_company: true
    });
    const suppliersList = getUserData().suppliersName;
        document.getElementById('rpa-prov-cpf').value = r.fullData.provC;
    const supIndex = suppliersList.findIndex(s => s.id === supplierId);
    ifpf;
        document.getElementById('rpa-prov-phone').value = r.fullData.provPhone(supIndex >= 0) { suppliersList[supIndex] = supplierData; } else { suppliersList.;
        document.getElementById('rpa-prov-addr').value = r.fullData.provAddr;push(supplierData); }
    saveData(); 
    showToast('Dados salvos!', 'success');
        calculateRPA(); showToast('RPA Carregado.', 'info'); window.scrollTo(0,
}

function updateDashboard() {
    const t = getUserData().transactions; 
    const currentMonth0);
    }
}

function deleteRPA(id) { 
    if(confirm('Ex = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const reserveRate = appcluir este RPA?')) { 
        const l = getUserData().rpas; 
        l.Data.currentUser.company.reserve_rate || 10;
    const prolaboreTarget = appDatasplice(l.findIndex(r => r.id === id), 1); 
        markAsDeleted(.currentUser.company.prolabore_target || 4000;
    let income = 0id);
        saveData(); 
        toggleRPAHistory(); 
    } 
}

function prepareForExport(elementId) {
    const element = document.getElementById(elementId);
    const inputs; let expense = 0; let totalReserve = 0; let totalProlabore = 0;
    t.forEach(x => {
        const d = new Date(x.date);
        const is = element.querySelectorAll('input, select, textarea');
    inputs.forEach(input => {
        if(CurrentMonth = d.getMonth() === currentMonth && d.getFullYear() === currentYear;
        if (x.type === 'receita') {
            if (isCurrentMonth) {
                income += x.valueinput.tagName === 'SELECT') {
            const selected = input.options[input.selectedIndex];
            input.;
                const reserveAmount = x.value * (reserveRate / 100);
                totalReservesetAttribute('data-export-value', selected ? selected.text : '');
        } else {
            input.setAttribute('value', input.value);
        }
    });
    return element;
}

function export += reserveAmount;
                const remainder = x.value - reserveAmount;
                const needed = prolaboreRPAPdf() {
    prepareForExport('rpa-content');
    const element = document.getElementById('rpa-content');
    const opt = { margin: 10, filename: 'RPA.pdf', imageTarget - totalProlabore;
                if (needed > 0) totalProlabore += (remainder >=: { type: 'jpeg', quality: 0.98 }, html2canvas: { scale: 2 }, jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' } };
 needed) ? needed : remainder;
            }
        } else { if (isCurrentMonth) expense += x    html2pdf().set(opt).from(element).save();
}

function exportRPADoc().value; }
    });
    document.getElementById('dash-income').innerText = `R$ ${income.toFixed(2)}`;
    document.getElementById('dash-expense').innerText = `R$ ${expense.toFixed {
    prepareForExport('rpa-content');
    // ... (Mantendo a mesma função de exportação DOC do original para economizar espaço aqui, lógica não alterada)
    const company = document.getElementById('(2)}`;
    document.getElementById('dash-balance').innerText = `R$ ${(income-expense).toFixed(2)}`;
    document.getElementById('reserve-percent-display').innerText = reserveRate;
    document.rpa-comp-name').value;
    const cnpj = document.getElementById('rpa-comp-cnpjgetElementById('dash-reserve').innerText = `R$ ${totalReserve.toFixed(2)}`;
    document.getElementById('dash-prolabore').innerText = `R$ ${totalProlabore.toFixed(2)}`;
    document.getElementById('dash-prolabore-target').innerText = `Meta: R$ ${prolaboreTarget.toFixed(2)}`;
}

function renderAgenda(filter = '') {
    if(!getUserData().appointments').value;
    const provName = document.getElementById('rpa-prov-name').value;
    const provCpf = document.getElementById('rpa-prov-cpf').value;
    const desc = document) getUserData().appointments = [];
    let list = getUserData().appointments.sort((a,b) =>.getElementById('rpa-desc').value;
    const date = document.getElementById('rpa-date'). new Date(a.date+'T'+a.time) - new Date(b.date+'T'+b.time));
    if (filter === 'today') {
        const today = new Date().toISOString().splitvalue;
    const value = document.getElementById('rpa-value').value;
    const net = document('T')[0];
        list = list.filter(a => a.date === today);
    }.getElementById('rpa-net').value;
    const htmlContent = `<html><body><h2>RPA</h2><p>Cont else if (!filter) {
        const inputDate = document.getElementById('agenda-filter-date').value;ratante: ${company}</p><p>Prestador: ${provName}</p><p>Valor Líquido: ${
        if(inputDate) list = list.filter(a => a.date === inputDate);
    net}</p></body></html>`; 
    const blob = new Blob([htmlContent], { type: 'application}
    const container = document.getElementById('agenda-list');
    container.innerHTML = '';
    if/msword' });
    const url = URL.createObjectURL(blob);
    const a = document. (list.length === 0) { container.innerHTML = '<p class="text-center p-4"createElement('a'); a.href = url; a.download = 'RPA.doc'; a.click(); style="grid-column: 1/-1;">Nenhum agendamento encontrado.</p>'; return; }
}

function exportReportPDF() {
    document.getElementById('report-company-header').innerText = app
    const statusMap = { 'agendado': { label: 'Agendado', class: 'bgData.currentUser.company.name || "Minha Empresa";
    document.getElementById('report-title').classList.remove('hidden');
    const element = document.getElementById('report-print-area');
    html2-scheduled', card: 'status-agendado' }, 'concluido': { label: 'Concluído', class: 'bg-done', card: 'status-concluido' }, 'cancelado': {pdf().from(element).save().then(() => document.getElementById('report-title').classList.add('hidden'));
} label: 'Cancelado', class: 'bg-canceled', card: 'status-cancelado' } };


function exportReportDoc() {
    const table = document.getElementById('listing-table').outerHTML;
    list.forEach(a => {
        const st = statusMap[a.status] || statusMap['    const blob = new Blob([`<html><body>${table}</body></html>`], { type: 'application/msword' });
agendado'];
        const formattedDate = a.date.split('-').reverse().join('/');
        const    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url card = document.createElement('div');
        card.className = `stat-card agenda-card ${st.; a.download = `Relatorio.doc`; a.click();
}

function renderCrud(type)card}`;
        card.innerHTML = `
            <div class="flex justify-between items-start mb- { 
    currentCrudType = type; 
    document.getElementById('crud-title').innerText = type2"><span class="badge ${st.class}">${st.label}</span><div class="text-sm font.toUpperCase(); 
    document.querySelectorAll('.crud-btn').forEach(btn => { btn.classList.toggle-bold text-light">${formattedDate} - ${a.time}</div></div>
            <h3 class="('active', btn.getAttribute('onclick').includes(`'${type}'`)); });
    const list = getUsermb-1">${a.title}</h3>
            <p class="text-sm mb-1"><strong>ClienteData()[type] || []; 
    const table = document.getElementById('crud-table'); 
    let:</strong> ${a.client_name}</p>
            <p class="text-sm mb-2 text h = type.match(/products|services/) ? '<th>Nome</th><th>Desc</th><th>Preço</th>' :-light">${a.service_desc || 'Sem descrição'}</p>
            <div class="flex justify '<th>Nome</th><th>Contato</th><th>Info</th>'; 
    table.innerHTML = `<thead><tr>${h}-between items-center mt-2 border-t pt-2">
                <div class="text-sm<th>Ações</th></tr></thead><tbody>` + list.map(i => `<tr><td>${i.name}</td>"><span class="${a.pay_status === 'pago' ? 'text-success font-bold' :<td>${i.description || i.contact_person || '-'}</td><td>${i.price ? 'R$ 'text-warning'}">${a.pay_status === 'pago' ? '💲 Pago' : '⏳ '+i.price : i.phone}</td><td><button class="action-btn btn-warning" onclick=" Pendente'}</span> - R$ ${parseFloat(a.value).toFixed(2)}</div>
                <div><buttoneditCrudItem('${i.id}')">✏️</button> <button class="action-btn btn-danger class="action-btn btn-warning" onclick="editAppointment('${a.id}')">✏️</button><" onclick="deleteCrudItem('${type}','${i.id}')">🗑️</button></td></tr>`).button class="action-btn btn-danger" onclick="deleteAppointment('${a.id}')">🗑️</buttonjoin('') + `</tbody>`; 
}

function openCrudModal(isEdit = false, itemData = null></div>
            </div>`;
        container.appendChild(card);
    });
}

function openAppointmentModal) { document.getElementById('modal-crud').classList.remove('hidden'); document.getElementById('crud-id').(appt = null) {
    document.getElementById('form-appointment').reset();
    const clientSelect =value = itemData ? itemData.id : ''; const fields = document.getElementById('crud-fields'); if( document.getElementById('appt-client-select');
    clientSelect.innerHTML = '<option value="">Selecionar ClientecurrentCrudType.match(/products|services/)) { fields.innerHTML = `<label>Nome</label><input Cadastrado...</option>';
    getUserData().clients.forEach(c => { clientSelect.innerHTML += `< name="name" value="${itemData?.name||''}" required><label>Preço</label><input typeoption value="${c.id}">${c.name}</option>`; });
    if (appt) {
        document="number" step="0.01" name="price" value="${itemData?.price||''}" required.getElementById('appt-id').value = appt.id;
        document.getElementById('appt-title').><label>Descrição</label><textarea name="description" rows="3">${itemData?.description||''}</textareavalue = appt.title;
        document.getElementById('appt-date').value = appt.date;
        document.getElementById('appt-time').value = appt.time;
        document.getElementById('appt>`; } else { fields.innerHTML = `<label>Nome/Razão</label><input name="name" value="${itemData?.name||''}" required><label>Contato</label><input name="contact_person" value-client-name').value = appt.client_name;
        document.getElementById('appt-client-="${itemData?.contact_person||''}"><label>CPF/CNPJ</label><input name="cnpj_phone').value = appt.client_phone;
        document.getElementById('appt-desc').value = appcpf" value="${itemData?.cnpj_cpf||''}"><label>Endereço</label><input name="t.service_desc;
        document.getElementById('appt-value').value = appt.value;
address" value="${itemData?.address||''}"><label>Telefone</label><input name="phone" value        document.getElementById('appt-status').value = appt.status;
        document.getElementById('appt-="${itemData?.phone||''}"><label>Email</label><input name="email" value="${itemData?.pay-method').value = appt.pay_method;
        document.getElementById('appt-pay-statusemail||''}">`; } }
function editCrudItem(id) { const item = getUserData()[currentCrud').value = appt.pay_status;
        document.getElementById('appt-obs').value = apptType].find(i => i.id === id); if (item) openCrudModal(true, item);.obs;
    } else {
        document.getElementById('appt-id').value = '';
        document }
function saveCrudItem(e) { 
    e.preventDefault(); 
    const id = document.getElementById.getElementById('appt-date').valueAsDate = new Date();
        document.getElementById('appt-status').('crud-id').value; 
    const t = e.target; 
    const item = {value = 'agendado';
    }
    document.getElementById('modal-appointment').classList.remove(' 
        id: id || 'i_'+Date.now(), 
        name: t.name.valuehidden');
}

function fillAppointmentClient() {
    const id = document.getElementById('appt-client-, 
        price: t.price?.value, 
        description: t.description?.value, select').value;
    if(id) { const c = getUserData().clients.find(x => x
        contact_person: t.contact_person?.value, 
        phone: t.phone?.value.id === id); if(c) { document.getElementById('appt-client-name').value = c.name; document.getElementById('appt-client-phone').value = c.phone || ''; } }
}

function saveAppointment(e) {
    e.preventDefault();
    const id = document.getElementById('appt-, 
        address: t.address?.value, 
        cnpj_cpf: t.cnpj_cpf?.value, 
        email: t.email?.value,
        _updatedAt: Date.now()
id').value;
    const data = stampObject({
        id: id || 'appt_' + Date.    }; 
    const list = getUserData()[currentCrudType]; 
    const idx = list.findIndex(i => i.id === id); 
    idx !== -1 ? list[idx] = item :now(),
        title: document.getElementById('appt-title').value,
        date: document.getElementById('appt-date').value,
        time: document.getElementById('appt-time').value,
        client_ list.push(item); 
    saveData(); closeModal('modal-crud'); renderCrud(currentCrudType);name: document.getElementById('appt-client-name').value,
        client_phone: document.getElementById(' showToast('Item salvo.', 'success'); 
}
function deleteCrudItem(t,id){ 
appt-client-phone').value,
        service_desc: document.getElementById('appt-desc').value,    if(confirm('Apagar?')){
        const l=getUserData()[t]; 
        l.
        value: document.getElementById('appt-value').value || 0,
        status: document.getElementByIdsplice(l.findIndex(x=>x.id===id),1); 
        markAsDeleted(id('appt-status').value,
        pay_method: document.getElementById('appt-pay-method').value);
        saveData(); 
        renderCrud(t);
    } 
}
function getUserData() { return,
        pay_status: document.getElementById('appt-pay-status').value,
        obs: document appData.records[appData.currentUser.id]; }
function closeModal(id) { document.getElementById(.getElementById('appt-obs').value
    });
    const list = getUserData().appointments;
    ifid).classList.add('hidden'); }
function checkLicense() { const d = Math.ceil((appData (id) { const idx = list.findIndex(x => x.id === id); if(idx !== -.currentUser.licenseExpire - Date.now())/86400000); document.getElementById('1) list[idx] = data; } else { list.push(data); }
    saveData();license-days-display').innerText = d>0?d+' dias':'Expirado'; document.getElementById('license-warning').classList.toggle('hidden', d>0); }
function generateLicenseCode() { document. closeModal('modal-appointment'); renderAgenda();
    showToast('Agendamento salvo!', 'success');
}

function editAppointment(id) { const appt = getUserData().appointments.find(a => a.idgetElementById('license-random-code').value = Math.floor(Math.random()*900)+10 === id); if(appt) openAppointmentModal(appt); }
function deleteAppointment(id) { 
0; }
function sendWhatsApp() { window.open(`https://wa.me/55349    if(confirm('Excluir este agendamento?')) { 
        registerDeletion(id); //97824990?text=Cod:${document.getElementById('license-random-code').value Marca exclusão para sync
        const list = getUserData().appointments; 
        const idx = list.findIndex}`); }
function validateLicense() { 
    const k = parseInt(document.getElementById('license-key-(a => a.id === id); 
        if(idx !== -1) list.splice(idxinput').value);
    const c = parseInt(document.getElementById('license-random-code').value);
, 1); 
        saveData(); renderAgenda(); 
        showToast('Agendamento excluído    const d = parseInt(document.getElementById('license-days-input').value); 
    if(k.', 'info');
    } 
}

function loadRPAOptions() {
    const comp = app === (c + LIC_PAD_VAL) * LIC_MULT_FACTOR + LIC_YEAR_BASE + d){
        appData.currentUser.licenseExpire += d * 86400000;
        saveData.currentUser.company || {};
    document.getElementById('rpa-comp-name').value = comp.name || '';
    document.getElementById('rpa-comp-cnpj').value = comp.cnpj || '';
Data();
        checkLicense();
        showToast('Licença validada!', 'success');
    } else    document.getElementById('rpa-comp-addr').value = comp.address || '';
    if(!document.getElementById('rpa-prov-name').value) { document.getElementById('rpa-prov-name').value = appData.currentUser.name; }
    const select = document.getElementById('rpa-provider-select');
    select.innerHTML = '<option value="">Selecione um Autônomo...</option>';
    const suppliers = getUserData().suppliers || [];
    suppliers.forEach(s => select.innerHTML += `<option {
        showToast('Código inválido.', 'error');
    }
}

function filterFinance(filter value="${s.id}">${s.name}</option>`);
    document.getElementById('rpa-date').) {
    currentFinanceFilter = filter;
    document.querySelectorAll('.fin-filter-btn').forEach(btn => { btn.classList.toggle('active', btn.getAttribute('onclick').includes(`'${filter}'`)); });
    renderTransactions();
}

function renderTransactions(){ 
    let l = (getUserData().transactions || []).sort((a,b)=>new Date(b.date)-new Date(a.date)); 
    if (currentFinanceFilter !== 'all') { l = l.filter(t => t.type === currentFinanceFilter); }
    document.querySelector('#finance-table tbody').innerHTML = l.length > 0 ? 
        l.map(t=>`<tr><td>${t.date}</td><td>${t.type}</td><td>${t.category}</td><td>${t.obs||'-'}</td><td>R$ ${t.value}</td><td><button onclick="editTransaction('${t.id}')">✏️</button><button onclickvalueAsDate = new Date();
    document.getElementById('rpa-id').value = '';
}

function fillRPAProvider() {
    const id = document.getElementById('rpa-provider-select').value;
    const s = getUserData().suppliers.find(item => item.id === id);
    if (s) {
        document.getElementById('rpa-prov-name').value = s.name;
        document.getElementById('rpa-prov-cpf').value = s.cnpj_cpf || '';
        document.getElementById('rpa-prov-phone').value = s.phone || '';
        document.getElementById('r="deleteTransaction('${t.id}')">🗑️</button></td></tr>`).join('') :
        '<tr><td colspan="6" class="text-center p-4">Nenhuma movimentação encontrada.</td></tr>';pa-prov-addr').value = s.address || '';
    }
}

function calculateRPA()
}

function editTransaction(id){ 
    const t=getUserData().transactions.find(x=> {
    const value = parseFloat(document.getElementById('rpa-value').value) || 0;
x.id===id); 
    document.getElementById('trans-id').value=t.id;     const issRate = parseFloat(document.getElementById('rpa-iss-rate').value) || 0;
    document.getElementById('trans-type').value=t.type; 
    updateTransactionDependencies(); 
    const inss = value * 0.11;
    document.getElementById('rpa-in
    document.getElementById('trans-category').value=t.category; 
    document.getElementById('transss').value = `R$ ${inss.toFixed(2)}`;
    const iss = value * (iss-entity').value=t.entity; 
    document.getElementById('trans-value').value=t.Rate / 100);
    document.getElementById('rpa-iss-val').value = `Rvalue; 
    document.getElementById('trans-date').value=t.date; 
    document.$ ${iss.toFixed(2)}`;
    const irrfBase = value - inss;
    let irgetElementById('trans-obs').value=t.obs; 
    document.getElementById('modal-transaction').classListrf = 0;
    const table = appData.irrfTable.sort((a,b) =>.remove('hidden'); 
}

function saveTransaction(e){ 
    e.preventDefault(); 
 a.max - b.max);
    for(let row of table) { if (irrfBase <=    const id=document.getElementById('trans-id').value; 
    const t={
        id: row.max) { irrf = (irrfBase * (row.rate / 100)) -id||'t_'+Date.now(), 
        type:document.getElementById('trans-type').value, row.deduction; break; } }
    if (irrf < 0) irrf = 0 
        category:document.getElementById('trans-category').value, 
        value:parseFloat(document.;
    document.getElementById('rpa-irrf').value = `R$ ${irrf.toFixed(getElementById('trans-value').value), 
        date:document.getElementById('trans-date').value, 2)}`;
    document.getElementById('rpa-net').value = `R$ ${(value - inss -
        obs:document.getElementById('trans-obs').value, 
        entity:document.getElementById('trans iss - irrf).toFixed(2)}`;
}

function saveRPA() {
    const id = document-entity').value,
        _updatedAt: Date.now()
    }; 
    const l=.getElementById('rpa-id').value;
    const rpa = stampObject({
        id: idgetUserData().transactions; 
    const i=l.findIndex(x=>x.id===t.id || 'rpa_' + Date.now(),
        date: document.getElementById('rpa-date').value); 
    i!==-1?l[i]=t:l.push(t); 
    ,
        provider: document.getElementById('rpa-prov-name').value,
        desc: document.saveData(); closeModal('modal-transaction'); renderTransactions(); showToast('Transação salva.', 'success'); 
getElementById('rpa-desc').value,
        value: document.getElementById('rpa-value').value,}

function deleteTransaction(id){ 
    if(confirm('Apagar?')){
        const l=getUserData
        net: document.getElementById('rpa-net').value,
        fullData: {
            prov().transactions; 
        l.splice(l.findIndex(x=>x.id===id),1);Name: document.getElementById('rpa-prov-name').value,
            provCpf: document.getElementById 
        markAsDeleted(id);
        saveData(); 
        renderTransactions();
    } ('rpa-prov-cpf').value,
            provPhone: document.getElementById('rpa-prov-
}

function updateTransactionDependencies(){
    const type = document.getElementById('trans-type').value;
    const cats = type==='receita'?['Venda','Serviço','Outros']:['Compra','phone').value,
            provAddr: document.getElementById('rpa-prov-addr').value,
            Despesa','Imposto', 'Gastos Pessoais']; 
    document.getElementById('trans-categoryinss: document.getElementById('rpa-inss').value,
            iss: document.getElementById('rpa-iss-val').value,
            irrf: document.getElementById('rpa-irrf').value').innerHTML=cats.map(c=>`<option>${c}</option>`).join('');
    const select =
        }
    });
    if(!getUserData().rpas) getUserData().rpas = [];
 document.getElementById('trans-entity');
    const list = type === 'receita' ? getUserData().clients    const list = getUserData().rpas;
    if(id) { const idx = list.findIndex( : getUserData().suppliers;
    if (list && list.length > 0) { select.innerHTML =r => r.id === id); if(idx !== -1) list[idx] = rpa; else '<option value="">Selecione...</option>' + list.map(i => `<option value="${i.name}">${i.name}</option>`).join(''); } else { select.innerHTML = '<option value="">Sem cadastros disponíveis</option>'; }
}

function openTransactionModal(){ 
    document.getElementById('form-transaction').reset(); 
    document.getElementById('trans-id').value=''; 
    document.getElementById('modal-transaction').classList.remove('hidden'); 
    updateTransactionDependencies(); 
}

function switchListing(t){ 
    currentListingType=t; 
    document.querySelectorAll('.tab-btn').forEach(b => { b.classList.remove('active'); if(b.getAttribute('onclick').includes(`'${t}'`)) b.classList.add('active'); });
    document.getElementById('listing-thead').innerHTML=t list.push(rpa); } else { list.push(rpa); }
    saveData(); showToast('RPA Salvo!', 'success'); toggleRPAHistory();
}

function toggleRPAHistory() {
    const container = document.getElementById('rpa-history-container');
    container.classList.toggle('hidden');
    if(!container.classList.contains('hidden')) {
        const tbody = document.querySelector('#rpa-history-table tbody');
        tbody.innerHTML = '';
        const list = getUserData().rpas || [];
        list.sort((a,b) => new Date(b.date) - new Date(a.date));
        list.forEach(r => { tbody.innerHTML += `<tr><td>${r.date}</td><td>${r.provider}</td><td>${r.net}</td><td><button class="action==='movimentacoes'?'<tr><th>Data</th><th>Tipo</th><th>Valor</th></tr>':'<tr><th>Nome</th><th>-btn btn-warning" onclick="loadRPA('${r.id}')">✏️</button><button classDetalhe</th><th>Valor/Tel</th></tr>'; const d=t==='movimentacoes'?getUserData().transactions="action-btn btn-danger" onclick="deleteRPA('${r.id}')">🗑️</button>:getUserData()[t]; document.getElementById('listing-tbody').innerHTML=(d||[]).map(i=></td></tr>`; });
    }
}

function loadRPA(id) {
    const r = getUsert==='movimentacoes'?`<tr><td>${i.date}</td><td>${i.type}</td><td>Data().rpas.find(x => x.id === id);
    if(r) {
        ${i.value}</td></tr>`:`<tr><td>${i.name}</td><td>${i.description||idocument.getElementById('rpa-id').value = r.id; 
        document.getElementById('rpa.contact_person||'-'}</td><td>${i.price||i.phone||'-'}</td></tr>`).join-date').value = r.date;
        document.getElementById('rpa-desc').value = r.(''); 
}

function loadFiscalReminders(){ document.getElementById('fiscal-reminders').innerHTML='<li>DASdesc;
        document.getElementById('rpa-value').value = r.value;
        document.getElementById Dia 20</li>'; }
function downloadBackup(){ saveData(); const a=document.createElement('a'); a('rpa-prov-name').value = r.fullData.provName;
        document.getElementById('.href=URL.createObjectURL(new Blob([JSON.stringify(appData)],{type:'json'})); a.download='backup.json'; a.click(); }
function restoreBackup(i){ const r=new FileReader(); r.onload=e=>{appData=JSON.parse(e.target.result);saveData();location.reload();}; r.readAsText(i.files[0]); }
function renderIrrf(){ document.getElementByIdrpa-prov-cpf').value = r.fullData.provCpf;
        document.getElementById('rpa-prov-phone').value = r.fullData.provPhone;
        document.getElementById('rpa-prov-addr').value = r.fullData.provAddr;
        calculateRPA(); showToast('irrf-table-body').innerHTML=appData.irrfTable.map(r=>`<tr><td>('RPA Carregado.', 'info'); window.scrollTo(0,0);
    }
}

function deleteRPA(id) { 
    if(confirm('Excluir este RPA?')) { ${r.max}</td><td>${r.rate}</td><td>${r.deduction}</td><td><button
        registerDeletion(id);
        const l = getUserData().rpas; 
        l.splice class="action-btn btn-warning" onclick="editIrrfRow('${r.id}')">✏️</(l.findIndex(r => r.id === id), 1); 
        saveData(); toggleRPAHistory();button><button class="action-btn btn-danger" onclick="deleteIrrfRow('${r.id}')"> 
    } 
}

function prepareForExport(elementId) {
    const element = document.X</button></td></tr>`).join(''); }
function deleteIrrfRow(id){ appData.irrfgetElementById(elementId);
    const inputs = element.querySelectorAll('input, select, textarea');
    inputs.Table.splice(appData.irrfTable.findIndex(r=>r.id===id),1); saveDataforEach(input => {
        if(input.tagName === 'SELECT') {
            const selected = input.options[(); renderIrrf(); }
function openIrrfModal(){ document.getElementById('form-irrf').reset();input.selectedIndex];
            input.setAttribute('data-export-value', selected ? selected.text : '');
 document.getElementById('irrf-id').value = ''; document.getElementById('modal-irrf').classList.remove        } else {
            input.setAttribute('value', input.value);
        }
    });
    ('hidden'); }
function editIrrfRow(id) { const row = appData.irrfTable.return element;
}

function exportRPAPdf() {
    prepareForExport('rpa-content');find(r => r.id === id); if(row) { document.getElementById('irrf-id').
    const element = document.getElementById('rpa-content');
    const opt = { margin: 10, filenamevalue = row.id; document.getElementById('irrf-max').value = row.max; document.getElementById: 'RPA.pdf', image: { type: 'jpeg', quality: 0.98 }, html2canvas: { scale: 2 }, jsPDF: { unit: 'mm', format: 'a4',('irrf-rate').value = row.rate; document.getElementById('irrf-deduction').value = row.deduction; document.getElementById('modal-irrf').classList.remove('hidden'); } }
function orientation: 'portrait' } };
    html2pdf().set(opt).from(element).save();
 saveIrrfRow(e){ e.preventDefault(); const id = document.getElementById('irrf-id').value}

function exportRPADoc() {
    prepareForExport('rpa-content');
    const company; const data = { id: id || 'irrf_'+Date.now(), max:parseFloat(e.target[1].value), rate:parseFloat(e.target[2].value), deduction:parseFloat(e.target = document.getElementById('rpa-comp-name').value;
    const cnpj = document.getElementById('r[3].value) }; if (id) { const idx = appData.irrfTable.findIndex(rpa-comp-cnpj').value;
    const provName = document.getElementById('rpa-prov-name').value;
    const provCpf = document.getElementById('rpa-prov-cpf').value;
 => r.id === id); if (idx !== -1) appData.irrfTable[idx] =    const desc = document.getElementById('rpa-desc').value;
    const date = document.getElementById(' data; } else { appData.irrfTable.push(data); } saveData(); closeModal('modal-irrpa-date').value;
    const value = document.getElementById('rpa-value').value;
rf'); renderIrrf(); showToast('Tabela IRRF salva.', 'success'); }

async function triggerManualSync() {
    const btn = document.getElementById('btn-manual-sync');
    const originalText =    const net = document.getElementById('rpa-net').value;
    const htmlContent = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com btn.innerHTML;
    if (!navigator.onLine) showToast("Você está Offline. Dados salvos apenas local:office:word' xmlns='http://www.w3.org/TR/REC-html40'><mente.", "info");
    btn.innerHTML = '⏳ Sincronizando...';
    btn.disabledhead><meta charset='utf-8'><title>RPA</title><style>body { font-family: = true;
    try {
        const result = await saveData(true);
        // UI será atualizada no force 'Arial', sans-serif; font-size: 12pt; }h2 { text-align: center;Sync ou reload se necessário, mas o save já trata o merge interno
        if(currentCrudType) renderCrud( text-decoration: underline; }p { margin: 5px 0; }hr { border: 0currentCrudType);
        updateDashboard();
        setTimeout(() => { btn.innerHTML = originalText; btn.disabled = false; border-top: 1px solid #ccc; margin: 20px 0; }.section { margin-; }, 1000);
    } catch (e) {
        showToast('Erro crítico aobottom: 20px; border: 1px solid #eee; padding: 10px; }. tentar sincronizar.', 'error');
        console.error(e);
        btn.innerHTML = originalText;label { font-weight: bold; }</style></head><body><h2>RECIBO DE PAGAMENTO A AUTÔ
        btn.disabled = false;
    }
}

init();
```NOMO (RPA)</h2><br><div class="section"><h3>1. Contratante</h3><p