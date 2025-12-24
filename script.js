// --- CONSTANTES DE SEGURANÇA E CONFIGURAÇÃO ---
const DEFAULT_URL_FISCAL = "https://www.nfse.gov.br/EmissorNacional/Login?ReturnUrl=%2fEmissorNacional";
const DEFAULT_URL_DAS = "https://www8.receita.fazenda.gov.br/SimplesNacional/Aplicacoes/ATSPO/pgmei.app/Identificacao";
const DB_KEY = 'MEI_SYSTEM_V11';

// Constantes da Licença
const LIC_PAD_VAL = 13;
const LIC_MULT_FACTOR = 9;
const LIC_YEAR_BASE = 1954;

// --- CONFIGURAÇÃO FIREBASE ---
// Certifique-se de que o Authentication (Email/Senha e Google) e Firestore estão ativos no console.
const firebaseConfig = {
  apiKey: "AIzaSyAY06PHLqEUCBzg9SjnH4N6xe9ZzM8OLvo",
  authDomain: "projeto-bfed3.firebaseapp.com",
  projectId: "projeto-bfed3",
  storageBucket: "projeto-bfed3.firebasestorage.app",
  messagingSenderId: "785289237066",
  appId: "1:785289237066:web:8206fe2e1073db72d5ccb3"
};

// --- VARIÁVEIS GLOBAIS ---
let appData = { currentUser: null, users: [], records: {}, irrfTable: [] };
let isFirebaseReady = false;
let currentCrudType = 'products'; 
let currentListingType = 'clients'; 
let currentFinanceFilter = 'all';

const DEFAULT_IRRF = [
    { id: 'irrf_1', max: 2259.20, rate: 0, deduction: 0 },
    { id: 'irrf_2', max: 2826.65, rate: 7.5, deduction: 169.44 },
    { id: 'irrf_3', max: 3751.05, rate: 15, deduction: 381.44 },
    { id: 'irrf_4', max: 4664.68, rate: 22.5, deduction: 662.77 },
    { id: 'irrf_5', max: 99999999, rate: 27.5, deduction: 896.00 }
];

// --- SISTEMA DE NOTIFICAÇÃO (TOAST) ---
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    let icon = type === 'success' ? '✅ ' : type === 'error' ? '❌ ' : 'ℹ️ ';
    toast.innerText = icon + message;
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'fadeOut 0.5s ease-out forwards';
        setTimeout(() => toast.remove(), 500);
    }, 4000);
}

function translateFirebaseError(error) {
    console.warn("Firebase Error:", error);
    if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') return "E-mail ou senha incorretos.";
    if (error.code === 'auth/email-already-in-use') return "Este e-mail já está em uso.";
    if (error.code === 'auth/network-request-failed') return "Sem conexão com a internet.";
    if (error.code === 'permission-denied') return "Permissão negada. Tente sair e entrar novamente.";
    return error.message;
}

// --- SYNC ENGINE (LÓGICA DE MERGE E CONFLITOS) ---
const SyncEngine = {
    // Mescla arrays considerando Timestamp (_updatedAt) e Tombstones (Exclusões)
    mergeArrays(localArr = [], cloudArr = [], tombstones = []) {
        const mergedMap = new Map();

        // 1. Adiciona itens da nuvem (se não estiverem excluídos)
        cloudArr.forEach(item => {
            if (!tombstones.some(t => t.id === item.id)) {
                mergedMap.set(item.id, item);
            }
        });

        // 2. Processa itens locais (Conflito: Vence o mais recente)
        localArr.forEach(item => {
            // Se o item está na lista de excluídos, remove do mapa
            if (tombstones.some(t => t.id === item.id)) {
                mergedMap.delete(item.id);
            } else {
                const cloudItem = mergedMap.get(item.id);
                // Se não existe na nuvem OU Local é mais recente (timestamp maior)
                if (!cloudItem || (item._updatedAt || 0) >= (cloudItem._updatedAt || 0)) {
                    mergedMap.set(item.id, item);
                }
            }
        });

        return Array.from(mergedMap.values());
    },

    // Executa o merge completo do registro do usuário
    mergeUserRecords(localRecord, cloudRecord) {
        if (!cloudRecord) return localRecord;
        if (!localRecord) return cloudRecord;

        // Unifica a lista de Tombstones (IDs excluídos)
        const localTomb = localRecord.tombstones || [];
        const cloudTomb = cloudRecord.tombstones || [];
        
        // Cria lista única de exclusões (baseado no ID)
        const uniqueTombstones = [...new Map([...localTomb, ...cloudTomb].map(item => [item.id, item])).values()];

        const mergedRecord = {
            ...localRecord,
            ...cloudRecord,
            tombstones: uniqueTombstones
        };

        // Arrays que precisam de merge inteligente
        const arraysToMerge = ['products', 'services', 'clients', 'suppliers', 'transactions', 'rpas', 'appointments'];

        arraysToMerge.forEach(key => {
            mergedRecord[key] = this.mergeArrays(
                localRecord[key] || [],
                cloudRecord[key] || [],
                uniqueTombstones
            );
        });

        return mergedRecord;
    }
};

// --- DATA MANAGER (PERSISTÊNCIA E SYNC) ---
const DataManager = {
    dbName: 'MEI_DB_HYBRID',
    storeName: 'mei_data',
    isDirty: false, 
    
    async initDB() {
        return new Promise((resolve, reject) => {
            const req = indexedDB.open(this.dbName, 1);
            req.onupgradeneeded = (e) => {
                if (!e.target.result.objectStoreNames.contains(this.storeName)) {
                    e.target.result.createObjectStore(this.storeName);
                }
            };
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });
    },

    // Sincronização Inteligente
    async smartSync(localData) {
        if (!navigator.onLine || !firebaseConfig.apiKey || !localData.currentUser) {
            return { success: false, error: "Offline" };
        }

        try {
            const dbCloud = firebase.firestore();
            const uid = localData.currentUser.id;
            const userRef = dbCloud.collection('users').doc(uid);
            
            // 1. Busca dados da nuvem
            const docSnap = await userRef.get();

            // 2. Se não existir, faz upload inicial
            if (!docSnap.exists) {
                await userRef.set(JSON.parse(JSON.stringify(localData)));
                return { success: true, method: 'upload_init' };
            }

            const cloudData = docSnap.data();
            
            // Garante inicialização de objetos
            if (!localData.records[uid]) localData.records[uid] = createSeedData().records.placeholder_id;
            if (!cloudData.records[uid]) cloudData.records[uid] = createSeedData().records.placeholder_id;

            // 3. Realiza o Merge (Local + Cloud)
            const mergedRecord = SyncEngine.mergeUserRecords(
                localData.records[uid],
                cloudData.records[uid]
            );
            
            // 4. Prepara objeto final
            let finalData = JSON.parse(JSON.stringify(localData));
            finalData.records[uid] = mergedRecord;
            
            // 5. Atualiza Memória Local
            appData.records[uid] = mergedRecord;
            
            // 6. Envia Merge para Nuvem
            await userRef.set(finalData);
            
            return { success: true, mergedData: finalData, method: 'merge' };

        } catch (e) {
            console.error("Sync Error:", e);
            return { success: false, error: translateFirebaseError(e) };
        }
    },

    // Salvar (Local + Tentativa de Sync)
    async save(data, isManualSync = false) {
        let saveStatus = { local: false, cloud: false, error: null };

        // 1. Salvar no IndexedDB (Prioridade Zero)
        try {
            const db = await this.initDB();
            const tx = db.transaction(this.storeName, 'readwrite');
            const sanitizedData = JSON.parse(JSON.stringify(data));
            tx.objectStore(this.storeName).put(sanitizedData, 'main_data');
            try { localStorage.setItem(DB_KEY, JSON.stringify(sanitizedData)); } catch(e){}
            saveStatus.local = true;
        } catch(e) { 
            console.error("Local Save Error", e);
            saveStatus.error = "Erro ao salvar no dispositivo.";
            if (isManualSync) showToast("Erro Crítico: Falha no disco!", "error");
            return saveStatus;
        }

        // 2. Tentar Sincronizar com Nuvem
        if (navigator.onLine && isFirebaseReady && data.currentUser) {
            const syncResult = await this.smartSync(data);
            
            if (syncResult.success) {
                this.isDirty = false;
                this.updateSyncStatus(true);
                saveStatus.cloud = true;

                // Se houve merge, salvar o resultado do merge localmente também
                if (syncResult.mergedData) {
                    Object.assign(appData, syncResult.mergedData);
                    try {
                        const db = await this.initDB();
                        const tx = db.transaction(this.storeName, 'readwrite');
                        tx.objectStore(this.storeName).put(JSON.parse(JSON.stringify(appData)), 'main_data');
                    } catch(e) {}
                    
                    if (isManualSync) {
                        showToast("Sincronização concluída com sucesso!", "success");
                        refreshCurrentView(); // Atualiza a tela com novos dados
                    }
                } else if (isManualSync) {
                    showToast("Dados enviados para a nuvem.", "success");
                }
            } else {
                this.isDirty = true;
                this.updateSyncStatus(false);
                if (isManualSync) showToast(`Erro Nuvem: ${syncResult.error}`, "error");
            }
        } else {
            this.isDirty = true;
            this.updateSyncStatus(false);
            if(isManualSync && !navigator.onLine) showToast("Você está Offline. Salvo localmente.", "info");
        }
        
        return saveStatus;
    },

    async load() {
        let data = null;
        try {
            const db = await this.initDB();
            data = await new Promise(r => {
                const tx = db.transaction(this.storeName, 'readonly');
                const req = tx.objectStore(this.storeName).get('main_data');
                req.onsuccess = () => r(req.result);
                req.onerror = () => r(null);
            });
        } catch(e) {}

        if (!data) {
            const ls = localStorage.getItem(DB_KEY);
            if (ls) data = JSON.parse(ls);
        }
        return data;
    },

    async forceSync(currentData) {
        if (this.isDirty && currentData && currentData.currentUser) {
            showToast("Conexão detectada. Sincronizando...", "info");
            await this.save(currentData, true);
        } else {
            this.updateSyncStatus(navigator.onLine);
        }
    },

    updateSyncStatus(isOnline) {
        const el = document.getElementById('sync-indicator');
        const userDisplay = document.getElementById('user-name-display');
        if(el) {
            el.className = isOnline ? 'sync-status sync-online' : 'sync-status sync-offline';
            el.title = isOnline ? 'Sincronizado' : 'Offline / Pendente';
            if(userDisplay) userDisplay.style.color = isOnline ? 'inherit' : '#ca8a04';
        }
    }
};

// --- INITIALIZAÇÃO ---

// Init Firebase
if (firebaseConfig.apiKey) {
    try {
        firebase.initializeApp(firebaseConfig);
        isFirebaseReady = true;

        // AUTH OBSERVER: Gerencia sessão e recarregamento
        firebase.auth().onAuthStateChanged((user) => {
            if (user && !appData.currentUser) {
                // Usuário está logado no Firebase, mas appData está vazio (F5 na página)
                DataManager.load().then(localData => {
                    if (localData) appData = localData;
                    
                    const uid = 'u_' + user.uid; // Prefixo para compatibilidade
                    
                    let appUser = {
                        id: uid,
                        name: user.displayName || user.email.split('@')[0],
                        email: user.email,
                        licenseExpire: Date.now() + (90 * 86400000),
                        company: { reserve_rate: 10, prolabore_target: 4000 }
                    };

                    // Recupera user local para não perder configurações
                    if (appData.users) {
                        const existing = appData.users.find(u => u.id === uid);
                        if (existing) appUser = existing;
                    } else {
                        appData.users = [appUser];
                    }

                    loginUser(appUser);
                });
            }
        });
        console.log("Firebase OK");
    } catch(e) {
        console.error("Firebase Init Fail", e);
        showToast("Erro na configuração do Firebase", "error");
    }
}

async function init() {
    window.addEventListener('online', () => DataManager.forceSync(appData));
    window.addEventListener('offline', () => { DataManager.updateSyncStatus(false); showToast("Modo Offline", "info"); });

    const loadedData = await DataManager.load();
    if (loadedData) appData = loadedData;
    
    if (!appData.irrfTable || !appData.irrfTable.length) appData.irrfTable = JSON.parse(JSON.stringify(DEFAULT_IRRF));

    // Verifica sessão local visualmente (Auth Observer fará o login real)
    const sessionUser = sessionStorage.getItem('mei_user_id');
    if (!sessionUser) {
        showAuth();
    }
}

function showAuth() { document.getElementById('auth-screen').classList.remove('hidden'); document.getElementById('app-container').classList.add('hidden'); }

function toggleAuth(screen) {
    document.getElementById('login-form').classList.toggle('hidden', screen === 'register');
    document.getElementById('register-form').classList.toggle('hidden', screen !== 'register');
}

// --- HELPER FUNCTIONS (DATA MODELS) ---

function createSeedData() {
    const now = Date.now();
    return {
        records: {
            placeholder_id: {
                products: [{id: 'p_ex', name: 'Produto Exemplo', price: 100, _updatedAt: now}], 
                services: [], clients: [], suppliers: [], transactions: [], rpas: [], appointments: [], tombstones: []
            }
        }
    };
}

// Adiciona Timestamp de atualização ao objeto
function stampObject(obj) {
    obj._updatedAt = Date.now();
    return obj;
}

// Registra exclusão para o Sync (Tombstone)
function registerDeletion(id) {
    if (!appData.currentUser) return;
    const uid = appData.currentUser.id;
    if (!appData.records[uid]) return;
    
    if (!appData.records[uid].tombstones) appData.records[uid].tombstones = [];
    appData.records[uid].tombstones.push({ id: id, deletedAt: Date.now() });
}

function refreshCurrentView() {
    const activeNav = document.querySelector('.nav-item.active');
    if (activeNav) activeNav.click();
}

// --- AUTENTICAÇÃO E LOGIN ---

// Login
document.getElementById('login-form').addEventListener('submit', (e) => {
    e.preventDefault();
    if (!isFirebaseReady) return showToast("Firebase não configurado.", "error");

    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    showToast("Entrando...", "info");

    firebase.auth().signInWithEmailAndPassword(email, password)
    .then((userCredential) => {
        // Observer cuidará do resto, mas podemos acelerar
        const uid = 'u_' + userCredential.user.uid;
        const localUser = (appData.users || []).find(u => u.id === uid);
        if (localUser) loginUser(localUser);
    })
    .catch((error) => showToast(translateFirebaseError(error), "error"));
});

// Registro
document.getElementById('register-form').addEventListener('submit', (e) => {
    e.preventDefault();
    if (!isFirebaseReady) return showToast("Firebase não configurado.", "error");

    const email = document.getElementById('reg-email').value;
    const password = document.getElementById('reg-password').value;
    const name = document.getElementById('reg-name').value;
    
    showToast("Criando conta...", "info");

    firebase.auth().createUserWithEmailAndPassword(email, password)
    .then((userCredential) => {
        const user = userCredential.user;
        user.updateProfile({ displayName: name });
        
        const newUser = {
            id: 'u_' + user.uid,
            name: name, email: email,
            licenseExpire: Date.now() + (90 * 86400000),
            company: { reserve_rate: 10, prolabore_target: 4000 }
        };

        if (!appData.users) appData.users = [];
        appData.users.push(newUser);
        appData.records[newUser.id] = createSeedData().records.placeholder_id;
        appData.records[newUser.id].products = []; // Limpa dummy data

        loginUser(newUser);
        showToast("Bem-vindo!", "success");
    })
    .catch((error) => showToast(translateFirebaseError(error), "error"));
});

function handleGoogleLogin() {
    if (!isFirebaseReady) return showToast("Firebase não configurado.", "error");
    const provider = new firebase.auth.GoogleAuthProvider();
    firebase.auth().signInWithPopup(provider).catch(e => showToast(translateFirebaseError(e), "error"));
}

async function loginUser(user) {
    appData.currentUser = user; 
    sessionStorage.setItem('mei_user_id', user.id);
    
    // Garante estrutura de dados
    if(!appData.records[user.id]) {
        appData.records[user.id] = createSeedData().records.placeholder_id;
        appData.records[user.id].products = [];
    }
    
    // Garante arrays críticos
    ['tombstones', 'appointments', 'rpas', 'transactions', 'clients', 'suppliers', 'products', 'services'].forEach(k => {
        if(!appData.records[user.id][k]) appData.records[user.id][k] = [];
    });

    document.getElementById('auth-screen').classList.add('hidden');
    document.getElementById('app-container').classList.remove('hidden');
    document.getElementById('user-name-display').innerText = user.name;
    
    checkLicense(); 
    navTo('dashboard'); 
    loadFiscalReminders();
    
    DataManager.updateSyncStatus(navigator.onLine);
    saveData(); // Sync Inicial
}

function logout() { 
    if(isFirebaseReady) firebase.auth().signOut();
    appData.currentUser = null; 
    sessionStorage.removeItem('mei_user_id'); 
    location.reload(); 
}

// --- NAVEGAÇÃO E VIEWS ---

function navTo(viewId) {
    document.querySelectorAll('main section').forEach(el => el.classList.add('hidden'));
    document.getElementById('view-' + viewId).classList.remove('hidden');
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    const btn = Array.from(document.querySelectorAll('.nav-item')).find(el => el.getAttribute('onclick').includes(viewId));
    if(btn) btn.classList.add('active');
    
    if(viewId === 'dashboard') updateDashboard();
    if(viewId === 'listagens') switchListing('clients');
    if(viewId === 'financeiro') renderTransactions();
    if(viewId === 'cadastros') renderCrud(currentCrudType);
    if(viewId === 'agenda') renderAgenda();
    if(viewId === 'fiscal') renderIrrf();
    if(viewId === 'configuracoes') loadSettings();
    if(viewId === 'rpa') loadRPAOptions();
}

// --- FUNCIONALIDADES (CRUD, AGENDA, FINANCEIRO) ---

function getUserData() { return appData.records[appData.currentUser.id]; }
function closeModal(id) { document.getElementById(id).classList.add('hidden'); }

// Dashboard
function updateDashboard() {
    const t = getUserData().transactions || []; 
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const reserveRate = appData.currentUser.company?.reserve_rate || 10;
    const prolaboreTarget = appData.currentUser.company?.prolabore_target || 4000;
    
    let income = 0; let expense = 0; let totalReserve = 0; let totalProlabore = 0;
    
    t.forEach(x => {
        const d = new Date(x.date);
        const isCurrentMonth = d.getMonth() === currentMonth && d.getFullYear() === currentYear;
        if (x.type === 'receita') {
            if (isCurrentMonth) {
                income += x.value;
                const reserveAmount = x.value * (reserveRate / 100);
                totalReserve += reserveAmount;
                const remainder = x.value - reserveAmount;
                const needed = prolaboreTarget - totalProlabore;
                if (needed > 0) totalProlabore += (remainder >= needed) ? needed : remainder;
            }
        } else { if (isCurrentMonth) expense += x.value; }
    });
    
    document.getElementById('dash-income').innerText = `R$ ${income.toFixed(2)}`;
    document.getElementById('dash-expense').innerText = `R$ ${expense.toFixed(2)}`;
    document.getElementById('dash-balance').innerText = `R$ ${(income-expense).toFixed(2)}`;
    document.getElementById('reserve-percent-display').innerText = reserveRate;
    document.getElementById('dash-reserve').innerText = `R$ ${totalReserve.toFixed(2)}`;
    document.getElementById('dash-prolabore').innerText = `R$ ${totalProlabore.toFixed(2)}`;
    document.getElementById('dash-prolabore-target').innerText = `Meta: R$ ${prolaboreTarget.toFixed(2)}`;
}

// Agenda
function renderAgenda(filter = '') {
    const listData = getUserData().appointments || [];
    let list = listData.sort((a,b) => new Date(a.date+'T'+a.time) - new Date(b.date+'T'+b.time));
    
    if (filter === 'today') {
        const today = new Date().toISOString().split('T')[0];
        list = list.filter(a => a.date === today);
    } else if (!filter) {
        const inputDate = document.getElementById('agenda-filter-date').value;
        if(inputDate) list = list.filter(a => a.date === inputDate);
    }
    
    const container = document.getElementById('agenda-list');
    container.innerHTML = '';
    
    if (list.length === 0) { 
        container.innerHTML = '<p class="text-center p-4" style="grid-column: 1/-1;">Nenhum agendamento encontrado.</p>'; 
        return; 
    }
    
    const statusMap = { 'agendado': { label: 'Agendado', class: 'bg-scheduled', card: 'status-agendado' }, 'concluido': { label: 'Concluído', class: 'bg-done', card: 'status-concluido' }, 'cancelado': { label: 'Cancelado', class: 'bg-canceled', card: 'status-cancelado' } };
    
    list.forEach(a => {
        const st = statusMap[a.status] || statusMap['agendado'];
        const formattedDate = a.date.split('-').reverse().join('/');
        const card = document.createElement('div');
        card.className = `stat-card agenda-card ${st.card}`;
        card.innerHTML = `
            <div class="flex justify-between items-start mb-2"><span class="badge ${st.class}">${st.label}</span><div class="text-sm font-bold text-light">${formattedDate} - ${a.time}</div></div>
            <h3 class="mb-1">${a.title}</h3>
            <p class="text-sm mb-1"><strong>Cliente:</strong> ${a.client_name}</p>
            <p class="text-sm mb-2 text-light">${a.service_desc || 'Sem descrição'}</p>
            <div class="flex justify-between items-center mt-2 border-t pt-2">
                <div class="text-sm"><span class="${a.pay_status === 'pago' ? 'text-success font-bold' : 'text-warning'}">${a.pay_status === 'pago' ? '💲 Pago' : '⏳ Pendente'}</span> - R$ ${parseFloat(a.value).toFixed(2)}</div>
                <div><button class="action-btn btn-warning" onclick="editAppointment('${a.id}')">✏️</button><button class="action-btn btn-danger" onclick="deleteAppointment('${a.id}')">🗑️</button></div>
            </div>`;
        container.appendChild(card);
    });
}

function openAppointmentModal(appt = null) {
    document.getElementById('form-appointment').reset();
    const clientSelect = document.getElementById('appt-client-select');
    clientSelect.innerHTML = '<option value="">Selecionar Cliente...</option>';
    (getUserData().clients || []).forEach(c => { clientSelect.innerHTML += `<option value="${c.id}">${c.name}</option>`; });
    
    if (appt) {
        document.getElementById('appt-id').value = appt.id;
        document.getElementById('appt-title').value = appt.title;
        document.getElementById('appt-date').value = appt.date;
        document.getElementById('appt-time').value = appt.time;
        document.getElementById('appt-client-name').value = appt.client_name;
        document.getElementById('appt-client-phone').value = appt.client_phone;
        document.getElementById('appt-desc').value = appt.service_desc;
        document.getElementById('appt-value').value = appt.value;
        document.getElementById('appt-status').value = appt.status;
        document.getElementById('appt-pay-method').value = appt.pay_method;
        document.getElementById('appt-pay-status').value = appt.pay_status;
        document.getElementById('appt-obs').value = appt.obs;
    } else {
        document.getElementById('appt-id').value = '';
        document.getElementById('appt-date').valueAsDate = new Date();
        document.getElementById('appt-status').value = 'agendado';
    }
    document.getElementById('modal-appointment').classList.remove('hidden');
}

function fillAppointmentClient() {
    const id = document.getElementById('appt-client-select').value;
    if(id) { const c = getUserData().clients.find(x => x.id === id); if(c) { document.getElementById('appt-client-name').value = c.name; document.getElementById('appt-client-phone').value = c.phone || ''; } }
}

function saveAppointment(e) {
    e.preventDefault();
    const id = document.getElementById('appt-id').value;
    const data = stampObject({
        id: id || 'appt_' + Date.now(),
        title: document.getElementById('appt-title').value,
        date: document.getElementById('appt-date').value,
        time: document.getElementById('appt-time').value,
        client_name: document.getElementById('appt-client-name').value,
        client_phone: document.getElementById('appt-client-phone').value,
        service_desc: document.getElementById('appt-desc').value,
        value: document.getElementById('appt-value').value || 0,
        status: document.getElementById('appt-status').value,
        pay_method: document.getElementById('appt-pay-method').value,
        pay_status: document.getElementById('appt-pay-status').value,
        obs: document.getElementById('appt-obs').value
    });
    
    const list = getUserData().appointments;
    if (id) { const idx = list.findIndex(x => x.id === id); if(idx !== -1) list[idx] = data; } else { list.push(data); }
    
    saveData(); closeModal('modal-appointment'); renderAgenda(); showToast('Agendamento salvo!', 'success');
}

function editAppointment(id) { const appt = getUserData().appointments.find(a => a.id === id); if(appt) openAppointmentModal(appt); }
function deleteAppointment(id) { 
    if(confirm('Excluir?')) { 
        registerDeletion(id);
        const list = getUserData().appointments; const idx = list.findIndex(a => a.id === id); 
        if(idx !== -1) list.splice(idx, 1); 
        saveData(); renderAgenda(); 
    } 
}

// Financeiro
function renderTransactions(){ 
    let l = (getUserData().transactions || []).sort((a,b)=>new Date(b.date)-new Date(a.date)); 
    if (currentFinanceFilter !== 'all') { l = l.filter(t => t.type === currentFinanceFilter); }
    document.querySelector('#finance-table tbody').innerHTML = l.length > 0 ? 
        l.map(t=>`<tr><td>${t.date}</td><td>${t.type}</td><td>${t.category}</td><td>${t.obs||'-'}</td><td>R$ ${t.value}</td><td><button onclick="editTransaction('${t.id}')">✏️</button><button onclick="deleteTransaction('${t.id}')">🗑️</button></td></tr>`).join('') :
        '<tr><td colspan="6" class="text-center p-4">Nenhuma movimentação encontrada.</td></tr>';
}

function editTransaction(id){ 
    const t=getUserData().transactions.find(x=>x.id===id); 
    document.getElementById('trans-id').value=t.id; 
    document.getElementById('trans-type').value=t.type; 
    updateTransactionDependencies(); 
    document.getElementById('trans-category').value=t.category; 
    document.getElementById('trans-entity').value=t.entity; 
    document.getElementById('trans-value').value=t.value; 
    document.getElementById('trans-date').value=t.date; 
    document.getElementById('trans-obs').value=t.obs; 
    document.getElementById('modal-transaction').classList.remove('hidden'); 
}

function saveTransaction(e){ 
    e.preventDefault(); 
    const id=document.getElementById('trans-id').value; 
    const t = stampObject({
        id: id||'t_'+Date.now(), type:document.getElementById('trans-type').value, 
        category:document.getElementById('trans-category').value, value:parseFloat(document.getElementById('trans-value').value), 
        date:document.getElementById('trans-date').value, obs:document.getElementById('trans-obs').value, 
        entity:document.getElementById('trans-entity').value
    }); 
    const l=getUserData().transactions; const i=l.findIndex(x=>x.id===t.id); i!==-1?l[i]=t:l.push(t); 
    saveData(); closeModal('modal-transaction'); renderTransactions(); showToast('Transação salva.', 'success'); 
}

function deleteTransaction(id){ 
    if(confirm('Apagar?')){
        registerDeletion(id);
        const l=getUserData().transactions; l.splice(l.findIndex(x=>x.id===id),1); 
        saveData(); renderTransactions();
    } 
}

function updateTransactionDependencies(){
    const type = document.getElementById('trans-type').value;
    const cats = type==='receita'?['Venda','Serviço','Outros']:['Compra','Despesa','Imposto', 'Gastos Pessoais']; 
    document.getElementById('trans-category').innerHTML=cats.map(c=>`<option>${c}</option>`).join('');
    const select = document.getElementById('trans-entity');
    const list = type === 'receita' ? getUserData().clients : getUserData().suppliers;
    if (list && list.length > 0) { select.innerHTML = '<option value="">Selecione...</option>' + list.map(i => `<option value="${i.name}">${i.name}</option>`).join(''); } else { select.innerHTML = '<option value="">Sem cadastros disponíveis</option>'; }
}

function openTransactionModal(){ 
    document.getElementById('form-transaction').reset(); 
    document.getElementById('trans-id').value=''; 
    document.getElementById('modal-transaction').classList.remove('hidden'); 
    updateTransactionDependencies(); 
}

function filterFinance(filter) {
    currentFinanceFilter = filter;
    document.querySelectorAll('.fin-filter-btn').forEach(btn => { btn.classList.toggle('active', btn.getAttribute('onclick').includes(`'${filter}'`)); });
    renderTransactions();
}

// Cadastros (CRUD)
function renderCrud(type) { 
    currentCrudType = type; 
    document.getElementById('crud-title').innerText = type.toUpperCase(); 
    document.querySelectorAll('.crud-btn').forEach(btn => { btn.classList.toggle('active', btn.getAttribute('onclick').includes(`'${type}'`)); });
    const list = getUserData()[type] || []; 
    const table = document.getElementById('crud-table'); 
    let h = type.match(/products|services/) ? '<th>Nome</th><th>Desc</th><th>Preço</th>' : '<th>Nome</th><th>Contato</th><th>Info</th>'; 
    table.innerHTML = `<thead><tr>${h}<th>Ações</th></tr></thead><tbody>` + list.map(i => `<tr><td>${i.name}</td><td>${i.description || i.contact_person || '-'}</td><td>${i.price ? 'R$ '+i.price : i.phone}</td><td><button class="action-btn btn-warning" onclick="editCrudItem('${i.id}')">✏️</button> <button class="action-btn btn-danger" onclick="deleteCrudItem('${type}','${i.id}')">🗑️</button></td></tr>`).join('') + `</tbody>`; 
}

function openCrudModal(isEdit = false, itemData = null) { document.getElementById('modal-crud').classList.remove('hidden'); document.getElementById('crud-id').value = itemData ? itemData.id : ''; const fields = document.getElementById('crud-fields'); if(currentCrudType.match(/products|services/)) { fields.innerHTML = `<label>Nome</label><input name="name" value="${itemData?.name||''}" required><label>Preço</label><input type="number" step="0.01" name="price" value="${itemData?.price||''}" required><label>Descrição</label><textarea name="description" rows="3">${itemData?.description||''}</textarea>`; } else { fields.innerHTML = `<label>Nome/Razão</label><input name="name" value="${itemData?.name||''}" required><label>Contato</label><input name="contact_person" value="${itemData?.contact_person||''}"><label>CPF/CNPJ</label><input name="cnpj_cpf" value="${itemData?.cnpj_cpf||''}"><label>Endereço</label><input name="address" value="${itemData?.address||''}"><label>Telefone</label><input name="phone" value="${itemData?.phone||''}"><label>Email</label><input name="email" value="${itemData?.email||''}">`; } }
function editCrudItem(id) { const item = getUserData()[currentCrudType].find(i => i.id === id); if (item) openCrudModal(true, item); }
function saveCrudItem(e) { 
    e.preventDefault(); 
    const id = document.getElementById('crud-id').value; const t = e.target; 
    const item = stampObject({ id: id || 'i_'+Date.now(), name: t.name.value, price: t.price?.value, description: t.description?.value, contact_person: t.contact_person?.value, phone: t.phone?.value, address: t.address?.value, cnpj_cpf: t.cnpj_cpf?.value, email: t.email?.value }); 
    const list = getUserData()[currentCrudType]; const idx = list.findIndex(i => i.id === id); idx !== -1 ? list[idx] = item : list.push(item); 
    saveData(); closeModal('modal-crud'); renderCrud(currentCrudType); showToast('Item salvo.', 'success'); 
}
function deleteCrudItem(t,id){ 
    if(confirm('Apagar?')){
        registerDeletion(id);
        const l=getUserData()[t]; l.splice(l.findIndex(x=>x.id===id),1); 
        saveData(); renderCrud(t);
    } 
}

// RPA
function loadRPAOptions() {
    const comp = appData.currentUser.company || {};
    document.getElementById('rpa-comp-name').value = comp.name || '';
    document.getElementById('rpa-comp-cnpj').value = comp.cnpj || '';
    document.getElementById('rpa-comp-addr').value = comp.address || '';
    if(!document.getElementById('rpa-prov-name').value) { document.getElementById('rpa-prov-name').value = appData.currentUser.name; }
    const select = document.getElementById('rpa-provider-select');
    select.innerHTML = '<option value="">Selecione um Autônomo...</option>';
    const suppliers = getUserData().suppliers || [];
    suppliers.forEach(s => select.innerHTML += `<option value="${s.id}">${s.name}</option>`);
    document.getElementById('rpa-date').valueAsDate = new Date();
    document.getElementById('rpa-id').value = '';
}

function fillRPAProvider() {
    const id = document.getElementById('rpa-provider-select').value;
    const s = getUserData().suppliers.find(item => item.id === id);
    if (s) {
        document.getElementById('rpa-prov-name').value = s.name;
        document.getElementById('rpa-prov-cpf').value = s.cnpj_cpf || '';
        document.getElementById('rpa-prov-phone').value = s.phone || '';
        document.getElementById('rpa-prov-addr').value = s.address || '';
    }
}

function calculateRPA() {
    const value = parseFloat(document.getElementById('rpa-value').value) || 0;
    const issRate = parseFloat(document.getElementById('rpa-iss-rate').value) || 0;
    const inss = value * 0.11;
    document.getElementById('rpa-inss').value = `R$ ${inss.toFixed(2)}`;
    const iss = value * (issRate / 100);
    document.getElementById('rpa-iss-val').value = `R$ ${iss.toFixed(2)}`;
    const irrfBase = value - inss;
    let irrf = 0;
    const table = appData.irrfTable.sort((a,b) => a.max - b.max);
    for(let row of table) { if (irrfBase <= row.max) { irrf = (irrfBase * (row.rate / 100)) - row.deduction; break; } }
    if (irrf < 0) irrf = 0;
    document.getElementById('rpa-irrf').value = `R$ ${irrf.toFixed(2)}`;
    document.getElementById('rpa-net').value = `R$ ${(value - inss - iss - irrf).toFixed(2)}`;
}

function saveRPA() {
    const id = document.getElementById('rpa-id').value;
    const rpa = stampObject({
        id: id || 'rpa_' + Date.now(),
        date: document.getElementById('rpa-date').value,
        provider: document.getElementById('rpa-prov-name').value,
        desc: document.getElementById('rpa-desc').value,
        value: document.getElementById('rpa-value').value,
        net: document.getElementById('rpa-net').value,
        fullData: {
            provName: document.getElementById('rpa-prov-name').value,
            provCpf: document.getElementById('rpa-prov-cpf').value,
            provPhone: document.getElementById('rpa-prov-phone').value,
            provAddr: document.getElementById('rpa-prov-addr').value,
            inss: document.getElementById('rpa-inss').value,
            iss: document.getElementById('rpa-iss-val').value,
            irrf: document.getElementById('rpa-irrf').value
        }
    });
    const list = getUserData().rpas;
    if(id) { const idx = list.findIndex(r => r.id === id); if(idx !== -1) list[idx] = rpa; else list.push(rpa); } else { list.push(rpa); }
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
        list.forEach(r => { tbody.innerHTML += `<tr><td>${r.date}</td><td>${r.provider}</td><td>${r.net}</td><td><button class="action-btn btn-warning" onclick="loadRPA('${r.id}')">✏️</button><button class="action-btn btn-danger" onclick="deleteRPA('${r.id}')">🗑️</button></td></tr>`; });
    }
}

function loadRPA(id) {
    const r = getUserData().rpas.find(x => x.id === id);
    if(r) {
        document.getElementById('rpa-id').value = r.id; 
        document.getElementById('rpa-date').value = r.date;
        document.getElementById('rpa-desc').value = r.desc;
        document.getElementById('rpa-value').value = r.value;
        document.getElementById('rpa-prov-name').value = r.fullData.provName;
        document.getElementById('rpa-prov-cpf').value = r.fullData.provCpf;
        document.getElementById('rpa-prov-phone').value = r.fullData.provPhone;
        document.getElementById('rpa-prov-addr').value = r.fullData.provAddr;
        calculateRPA(); showToast('RPA Carregado.', 'info'); window.scrollTo(0,0);
    }
}

function deleteRPA(id) { 
    if(confirm('Excluir?')) { 
        registerDeletion(id);
        const l = getUserData().rpas; l.splice(l.findIndex(r => r.id === id), 1); 
        saveData(); toggleRPAHistory(); 
    } 
}

// Configurações e Fiscal
function loadSettings() {
    const c = appData.currentUser.company || {};
    document.getElementById('conf-company-name').value = c.name||''; 
    document.getElementById('conf-cnpj').value = c.cnpj||''; 
    document.getElementById('conf-address').value = c.address||''; 
    document.getElementById('conf-phone').value = c.phone||''; 
    document.getElementById('conf-whatsapp').value = c.whatsapp||'';
    document.getElementById('conf-url-fiscal').value = c.url_fiscal || DEFAULT_URL_FISCAL;
    document.getElementById('conf-url-das').value = c.url_das || DEFAULT_URL_DAS;
    document.getElementById('conf-reserve-rate').value = c.reserve_rate || 10;
    document.getElementById('conf-prolabore-target').value = c.prolabore_target || 4000;

    const adminDiv = document.getElementById('admin-tools');
    if (appData.currentUser.email === 'jcnvap@gmail.com') {
        adminDiv.classList.remove('hidden');
    } else {
        adminDiv.classList.add('hidden');
    }
}

function saveCompanyData(e) {
    e.preventDefault();
    const companyData = {
        name: document.getElementById('conf-company-name').value,
        cnpj: document.getElementById('conf-cnpj').value,
        address: document.getElementById('conf-address').value,
        phone: document.getElementById('conf-phone').value,
        whatsapp: document.getElementById('conf-whatsapp').value,
        role: document.getElementById('conf-role').value,
        url_fiscal: document.getElementById('conf-url-fiscal').value,
        url_das: document.getElementById('conf-url-das').value,
        reserve_rate: parseFloat(document.getElementById('conf-reserve-rate').value),
        prolabore_target: parseFloat(document.getElementById('conf-prolabore-target').value)
    };
    appData.currentUser.company = companyData;
    saveData(); 
    showToast('Configurações salvas!', 'success');
}

function loadFiscalReminders(){ document.getElementById('fiscal-reminders').innerHTML='<li>DAS Dia 20</li>'; }
function renderIrrf(){ document.getElementById('irrf-table-body').innerHTML=appData.irrfTable.map(r=>`<tr><td>${r.max}</td><td>${r.rate}</td><td>${r.deduction}</td><td><button class="action-btn btn-warning" onclick="editIrrfRow('${r.id}')">✏️</button><button class="action-btn btn-danger" onclick="deleteIrrfRow('${r.id}')">X</button></td></tr>`).join(''); }
function deleteIrrfRow(id){ appData.irrfTable.splice(appData.irrfTable.findIndex(r=>r.id===id),1); saveData(); renderIrrf(); }
function openIrrfModal(){ document.getElementById('form-irrf').reset(); document.getElementById('irrf-id').value = ''; document.getElementById('modal-irrf').classList.remove('hidden'); }
function editIrrfRow(id) { const row = appData.irrfTable.find(r => r.id === id); if(row) { document.getElementById('irrf-id').value = row.id; document.getElementById('irrf-max').value = row.max; document.getElementById('irrf-rate').value = row.rate; document.getElementById('irrf-deduction').value = row.deduction; document.getElementById('modal-irrf').classList.remove('hidden'); } }
function saveIrrfRow(e){ e.preventDefault(); const id = document.getElementById('irrf-id').value; const data = { id: id || 'irrf_'+Date.now(), max:parseFloat(e.target[1].value), rate:parseFloat(e.target[2].value), deduction:parseFloat(e.target[3].value) }; if (id) { const idx = appData.irrfTable.findIndex(r => r.id === id); if (idx !== -1) appData.irrfTable[idx] = data; } else { appData.irrfTable.push(data); } saveData(); closeModal('modal-irrf'); renderIrrf(); showToast('Tabela IRRF salva.', 'success'); }

// Listagens e Exports
function switchListing(t){ 
    currentListingType=t; 
    document.querySelectorAll('.tab-btn').forEach(b => { b.classList.remove('active'); if(b.getAttribute('onclick').includes(`'${t}'`)) b.classList.add('active'); });
    document.getElementById('listing-thead').innerHTML=t==='movimentacoes'?'<tr><th>Data</th><th>Tipo</th><th>Valor</th></tr>':'<tr><th>Nome</th><th>Detalhe</th><th>Valor/Tel</th></tr>'; const d=t==='movimentacoes'?getUserData().transactions:getUserData()[t]; document.getElementById('listing-tbody').innerHTML=(d||[]).map(i=>t==='movimentacoes'?`<tr><td>${i.date}</td><td>${i.type}</td><td>${i.value}</td></tr>`:`<tr><td>${i.name}</td><td>${i.description||i.contact_person||'-'}</td><td>${i.price||i.phone||'-'}</td></tr>`).join(''); 
}

function prepareForExport(elementId) {
    const element = document.getElementById(elementId);
    const inputs = element.querySelectorAll('input, select, textarea');
    inputs.forEach(input => {
        if(input.tagName === 'SELECT') {
            const selected = input.options[input.selectedIndex];
            input.setAttribute('data-export-value', selected ? selected.text : '');
        } else {
            input.setAttribute('value', input.value);
        }
    });
    return element;
}

function exportRPAPdf() {
    prepareForExport('rpa-content');
    const element = document.getElementById('rpa-content');
    const opt = { margin: 10, filename: 'RPA.pdf', image: { type: 'jpeg', quality: 0.98 }, html2canvas: { scale: 2 }, jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' } };
    html2pdf().set(opt).from(element).save();
}

function exportRPADoc() {
    prepareForExport('rpa-content');
    const company = document.getElementById('rpa-comp-name').value;
    const net = document.getElementById('rpa-net').value;
    const blob = new Blob([`<html><body><h2>RPA</h2><p>Empresa: ${company}</p><p>Líquido: ${net}</p></body></html>`], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'RPA.doc'; a.click();
}

function exportReportPDF() {
    document.getElementById('report-company-header').innerText = appData.currentUser.company.name || "Minha Empresa";
    document.getElementById('report-title').classList.remove('hidden');
    const element = document.getElementById('report-print-area');
    html2pdf().from(element).save().then(() => document.getElementById('report-title').classList.add('hidden'));
}

function exportReportDoc() {
    const table = document.getElementById('listing-table').outerHTML;
    const blob = new Blob([`<html><body>${table}</body></html>`], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `Relatorio.doc`; a.click();
}

// Licença e Admin
function checkLicense() { const d = Math.ceil((appData.currentUser.licenseExpire - Date.now())/86400000); document.getElementById('license-days-display').innerText = d>0?d+' dias':'Expirado'; document.getElementById('license-warning').classList.toggle('hidden', d>0); }
function generateLicenseCode() { document.getElementById('license-random-code').value = Math.floor(Math.random()*900)+100; }
function sendWhatsApp() { window.open(`https://wa.me/5534997824990?text=Cod:${document.getElementById('license-random-code').value}`); }
function validateLicense() { 
    const k = parseInt(document.getElementById('license-key-input').value);
    const c = parseInt(document.getElementById('license-random-code').value);
    const d = parseInt(document.getElementById('license-days-input').value); 
    if(k === (c + LIC_PAD_VAL) * LIC_MULT_FACTOR + LIC_YEAR_BASE + d){
        appData.currentUser.licenseExpire += d * 86400000;
        saveData(); checkLicense(); showToast('Licença validada!', 'success');
    } else { showToast('Código inválido.', 'error'); }
}

function adminFillData() {
    if (appData.currentUser.email !== 'jcnvap@gmail.com') return;
    if (!confirm('ATENÇÃO: Dados fictícios. Continuar?')) return;
    const ts = Date.now();
    appData.records[appData.currentUser.id].clients = [{id: 'c1', name: 'Cliente Teste Sync', _updatedAt: ts}];
    saveData();
    showToast('Dados gerados!', 'success');
    location.reload(); 
}

function adminClearData() {
    if (appData.currentUser.email !== 'jcnvap@gmail.com') return;
    if (!confirm('Limpar tudo?')) return;
    appData.records[appData.currentUser.id] = createSeedData().records.placeholder_id;
    appData.records[appData.currentUser.id].products = [];
    saveData();
    showToast('Resetado.', 'info');
    location.reload();
}

function downloadBackup(){ saveData(); const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([JSON.stringify(appData)],{type:'json'})); a.download='backup.json'; a.click(); }
function restoreBackup(i){ const r=new FileReader(); r.onload=e=>{appData=JSON.parse(e.target.result);saveData();location.reload();}; r.readAsText(i.files[0]); }
function triggerManualSync() { DataManager.forceSync(appData); }

// INICIA O APP
init();