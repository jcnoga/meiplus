const DEFAULT_URL_FISCAL = "https://www.nfse.gov.br/EmissorNacional/Login?ReturnUrl=%2fEmissorNacional";
const DEFAULT_URL_DAS = "https://www8.receita.fazenda.gov.br/SimplesNacional/Aplicacoes/ATSPO/pgmei.app/Identificacao";
const DB_KEY = 'MEI_SYSTEM_V12_8'; 
const ADMIN_EMAILS = ['jcnvap@gmail.com', 'jcnval@gmail.com']; 

// --- CONFIGURAÇÃO DE EMAIL VIA CLOUD FUNCTION (BACKEND FIREBASE) ---
const CLOUD_FUNCTION_URL = "https://testemanualemail-cg2cq35buq-uc.a.run.app";

const LIC_PAD_VAL = 13;
const LIC_MULT_FACTOR = 9;
const LIC_YEAR_BASE = 1954;

// CONFIGURAÇÃO FIREBASE
const firebaseConfig = {
  apiKey: "AIzaSyBhtwWew_DQNX2TZROUShZz4mjK57pRgQk",
  authDomain: "lembrete-d6c15.firebaseapp.com",
  projectId: "lembrete-d6c15",
  storageBucket: "lembrete-d6c15.firebasestorage.app",
  messagingSenderId: "368296869868",
  appId: "1:368296869868:web:c6189a5ab9634029a90ac9",
  measurementId: "G-F5TMMGPK9C"
};

const DataManager = {
    dbName: 'MEI_DB_HYBRID_V2',
    storeName: 'mei_data',
    
    async initDB() {
        return new Promise((resolve, reject) => {
            const req = indexedDB.open(this.dbName, 1);
            req.onupgradeneeded = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains(this.storeName)) {
                    db.createObjectStore(this.storeName);
                }
            };
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });
    },

    async save(data) {
        // 1. Salva Localmente (Garantia Offline)
        try { localStorage.setItem(DB_KEY, JSON.stringify(data)); } catch(e) { console.warn("LocalStorage cheiou"); }

        try {
            const db = await this.initDB();
            const tx = db.transaction(this.storeName, 'readwrite');
            tx.objectStore(this.storeName).put(data, 'main_data');
        } catch(e) { console.error("Erro IDB Local", e); }

        // 2. Tenta Sincronizar com a Nuvem
        if (typeof firebase !== 'undefined' && firebase.apps.length && data.currentUser) {
            try {
                if (navigator.onLine) {
                    const db = firebase.firestore();
                    // Limpeza profunda do objeto para evitar erros do Firestore
                    const cleanData = JSON.parse(JSON.stringify(data));
                    await db.collection('users').doc(data.currentUser.id).set(cleanData);
                    this.updateSyncStatus(true);
                } else {
                    this.updateSyncStatus(false);
                }
            } catch(e) { 
                console.warn("Erro no Sync Cloud (Modo Offline Ativo):", e.code, e.message);
                this.updateSyncStatus(false);
            }
        } else {
            this.updateSyncStatus(false);
        }
    },

    async pullCloudData(userId) {
        if (typeof firebase !== 'undefined' && firebase.apps.length && navigator.onLine) {
            try {
                const db = firebase.firestore();
                const doc = await db.collection('users').doc(userId).get();
                if (doc.exists) {
                    console.log("Dados baixados da nuvem.");
                    return doc.data();
                }
            } catch (e) {
                console.error("Falha ao baixar dados Cloud:", e);
                if (e.code === 'permission-denied') {
                    alert("Erro de Permissão no Firebase: Verifique as Regras do Firestore.");
                }
            }
        }
        return null;
    },

    async load() {
        let data = null;
        try {
            const db = await this.initDB();
            data = await new Promise(resolve => {
                const tx = db.transaction(this.storeName, 'readonly');
                const req = tx.objectStore(this.storeName).get('main_data');
                req.onsuccess = () => resolve(req.result);
                req.onerror = () => resolve(null);
            });
        } catch(e) { console.warn("Erro carga IDB", e); }

        if (!data) {
            const ls = localStorage.getItem(DB_KEY);
            if (ls) data = JSON.parse(ls);
        }
        return data;
    },

    updateSyncStatus(isOnline) {
        const el = document.getElementById('sync-indicator');
        if(el) {
            el.className = `sync-status ${isOnline ? 'sync-online' : 'sync-offline'}`;
            el.title = isOnline ? 'Sincronizado (Nuvem)' : 'Modo Offline (Local)';
        }
    }
};

async function saveData() {
    await DataManager.save(appData);
}

if (typeof firebase !== 'undefined' && firebaseConfig.apiKey && firebaseConfig.apiKey !== "SUA_API_KEY_AQUI") {
    try { 
        firebase.initializeApp(firebaseConfig); 
        console.log("Firebase Inicializado");
        firebase.auth().onAuthStateChanged((user) => {
            if (user) console.log("Firebase Auth: OK");
        });
    } catch(e) { console.error("Erro Fatal Firebase Init", e); }
}

let appData = { currentUser: null, users: [], records: {}, irrfTable: [] };
let checkInterval = null; 

const DEFAULT_IRRF = [
    { id: 'irrf_1', max: 2259.20, rate: 0, deduction: 0 },
    { id: 'irrf_2', max: 2826.65, rate: 7.5, deduction: 169.44 },
    { id: 'irrf_3', max: 3751.05, rate: 15, deduction: 381.44 },
    { id: 'irrf_4', max: 4664.68, rate: 22.5, deduction: 662.77 },
    { id: 'irrf_5', max: 99999999, rate: 27.5, deduction: 896.00 }
];

let currentCrudType = 'products'; 
let currentListingType = 'clients';
let currentFinanceFilter = 'all';
let currentView = 'dashboard';

// --- FUNÇÃO AUXILIAR DE ENVIO AUTOMÁTICO (CLOUD FUNCTIONS) ---
async function sendAutoEmail(to_email, subject, message, attachment_data = null, attachment_name = null) {
    if (!navigator.onLine) {
        return Promise.reject("Sem conexão com a internet.");
    }

    try {
        const payload = {
            to: to_email,          
            email: to_email,       
            subject: subject,
            text: message,         
            html: message.replace(/\n/g, '<br>'), 
            attachment: attachment_data, 
            filename: attachment_name
        };

        const response = await fetch(CLOUD_FUNCTION_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error(`Erro no servidor: ${response.status} ${response.statusText}`);
        }

        return true;

    } catch (error) {
        console.warn("Falha ao chamar Cloud Function:", error);
        throw error; 
    }
}

async function init() {
    try {
        const loadedData = await DataManager.load();
        if (loadedData) appData = loadedData;
        
        if (!appData.irrfTable || appData.irrfTable.length === 0) appData.irrfTable = JSON.parse(JSON.stringify(DEFAULT_IRRF));
        
        const sessionUser = sessionStorage.getItem('mei_user_id');
        
        setTimeout(() => {
            if (sessionUser) {
                const user = appData.users.find(u => u.id === sessionUser);
                if (user) { 
                    loginUser(user); 
                } else {
                    showAuth();
                }
            } else {
                showAuth();
            }
            const loader = document.getElementById('loading-overlay');
            if(loader) loader.style.display = 'none';
        }, 500);
    } catch(err) {
        console.error("Erro crítico na inicialização:", err);
        document.getElementById('loading-overlay').style.display = 'none';
        document.getElementById('auth-screen').classList.remove('hidden');
    }
}

function showAuth() { 
    document.getElementById('auth-screen').classList.remove('hidden'); 
    document.getElementById('app-container').classList.add('hidden'); 
}

async function loginUser(user) {
    const authScreen = document.getElementById('auth-screen');
    authScreen.classList.add('hidden');
    authScreen.style.display = 'none'; 

    document.getElementById('app-container').classList.remove('hidden');
    
    try {
        const cloudData = await DataManager.pullCloudData(user.id);
        if (cloudData) {
            appData = cloudData;
            const updatedUser = appData.users.find(u => u.id === user.id);
            if (updatedUser) user = updatedUser;
            DataManager.updateSyncStatus(true);
        }
    } catch(e) { console.log("Login Offline (Cloud falhou ou sem net)"); }

    appData.currentUser = user; 
    sessionStorage.setItem('mei_user_id', user.id);
    
    document.getElementById('user-name-display').innerText = user.name;
    
    if(!appData.records[user.id]) appData.records[user.id] = createSeedData();
    if(!appData.records[user.id].appointments) appData.records[user.id].appointments = [];
    if(!appData.records[user.id].reminders) appData.records[user.id].reminders = []; 
    
    checkLicense(); 
    navTo('dashboard'); 
    loadFiscalReminders();
    initReminderSystem(); 
    saveData(); 
}

async function manualSync() {
    if (!appData.currentUser) return;
    
    const btn = document.querySelector('.btn-sync');
    const originalText = btn.innerHTML;
    btn.innerHTML = '⏳ Conectando...';
    btn.disabled = true;

    try {
        if (!navigator.onLine) throw new Error("Sem conexão com a internet.");
        
        if (!firebase.auth().currentUser) {
             throw new Error("Sessão Firebase expirada. Faça Logout e Login novamente com Google.");
        }

        const cloudData = await DataManager.pullCloudData(appData.currentUser.id);
        if (cloudData) {
            appData = cloudData;
            const updatedUser = appData.users.find(u => u.id === appData.currentUser.id);
            if(updatedUser) appData.currentUser = updatedUser;
        }

        await DataManager.save(appData);
        alert('Sincronização OK! Dados salvos na nuvem.');
        navTo(currentView); 
    } catch (e) {
        console.error(e);
        if (e.code === 'unavailable') {
            alert("Firebase offline ou bloqueado pela rede.");
        } else if (e.code === 'permission-denied') {
            alert("Erro de Permissão: Verifique as regras do Firestore e se o domínio está autorizado.");
        } else {
            alert('Erro: ' + e.message);
        }
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

function logout() { 
    if(checkInterval) clearInterval(checkInterval); 
    if (typeof firebase !== 'undefined') firebase.auth().signOut();
    appData.currentUser = null; 
    sessionStorage.removeItem('mei_user_id'); 
    location.reload(); 
}

function toggleAuth(screen) {
    document.getElementById('login-form').classList.toggle('hidden', screen === 'register');
    document.getElementById('register-form').classList.toggle('hidden', screen !== 'register');
}

function handleGoogleLogin() {
    console.log("Tentando login Google em: " + window.location.hostname);
    const provider = new firebase.auth.GoogleAuthProvider();
    firebase.auth().signInWithPopup(provider).then(async (result) => {
        const user = result.user;
        const cloudData = await DataManager.pullCloudData('u_' + user.uid);
        if (cloudData) appData = cloudData;

        let appUser = appData.users.find(u => u.email === user.email);
        if(!appUser) {
            appUser = {
                id: 'u_' + user.uid, 
                name: user.displayName, 
                email: user.email, 
                password: 'google_auth', 
                licenseExpire: new Date().getTime() + (30 * 86400000), // 30 dias
                company: { reserve_rate: 10, prolabore_target: 4000 }
            };
            appData.users.push(appUser);
            appData.records[appUser.id] = createSeedData();
        }
        loginUser(appUser);
    }).catch((error) => {
        console.error("Erro Google Auth:", error);
        if (error.code === 'auth/unauthorized-domain') {
            alert("ERRO CRÍTICO: DOMÍNIO NÃO AUTORIZADO NO FIREBASE.");
        } else if (error.code === 'auth/popup-closed-by-user') {
            alert("Login cancelado pelo usuário.");
        } else {
            alert("Erro no Login: " + error.message);
        }
    });
}

function createSeedData() {
    const today = new Date().toISOString().split('T')[0];
    return { 
        products: [{id: 'p_ex', name: 'Produto Exemplo A', price: 100.00, description: 'Produto para teste'}], 
        services: [{id: 's_ex', name: 'Serviço Exemplo B', price: 200.00, description: 'Serviço para teste'}], 
        clients: [{id: 'c_ex', name: 'Cliente Teste', phone: '(11) 99999-9999', address: 'Rua Exemplo, 100', cnpj_cpf: '000.000.000-00', contact_person: 'João', email: 'cliente@teste.com'}], 
        suppliers: [{id: 'f_ex', name: 'Fornecedor Teste', phone: '(11) 88888-8888', address: 'Av Exemplo, 200', cnpj_cpf: '00.000.000/0001-00', contact_person: 'Maria', email: 'fornecedor@teste.com'}], 
        transactions: [
            {id: 't_ex1', type: 'receita', category: 'Venda de produto', value: 150.00, date: today, obs: 'Venda inicial de teste', entity: 'Cliente Teste'},
            {id: 't_ex2', type: 'despesa', category: 'Despesas Operacionais', value: 50.00, date: today, obs: 'Despesa inicial de teste', entity: 'Fornecedor Teste'}
        ], 
        rpas: [],
        appointments: [],
        reminders: []
    };
}

document.getElementById('register-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('reg-email').value;
    if (appData.users.find(u => u.email === email)) return alert('E-mail já existe!');
    
    const newUser = {
        id: 'u_' + Date.now(), 
        name: document.getElementById('reg-name').value, 
        email: email,
        password: document.getElementById('reg-password').value,
        licenseExpire: new Date().getTime() + (30 * 86400000), // 30 dias
        company: { reserve_rate: 10, prolabore_target: 4000 }
    };

    appData.users.push(newUser); 
    appData.records[newUser.id] = createSeedData();
    appData.currentUser = newUser;

    if (typeof firebase !== 'undefined' && navigator.onLine) {
        try {
            const db = firebase.firestore();
            const userDataToSave = JSON.parse(JSON.stringify(appData));
            await db.collection('users').doc(newUser.id).set(userDataToSave);
            console.log("Novo usuário salvo no Firebase com sucesso.");
        } catch (err) {
            console.error("Erro ao salvar novo usuário na nuvem:", err);
            alert("Atenção: Erro ao salvar na nuvem. Verifique sua conexão.");
        }
    }

    saveData().then(() => loginUser(newUser));
});

document.getElementById('login-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const user = appData.users.find(u => u.email === document.getElementById('login-email').value && u.password === document.getElementById('login-password').value);
    user ? loginUser(user) : alert('Usuário não encontrado ou senha incorreta (Verifique se criou a conta neste dispositivo).');
});

// ... (Restante do código igual) ...

// --- GESTÃO DE USUÁRIOS E CRÉDITOS (CORRIGIDO) ---

// Função agora é ASYNC para buscar dados no Firebase
async function openUserManagementModal() {
    await renderUserList();
    document.getElementById('modal-usermgmt').classList.remove('hidden');
}

async function renderUserList() {
    const tbody = document.getElementById('usermgmt-tbody');
    tbody.innerHTML = '<tr><td colspan="4" class="text-center">Carregando usuários do Firebase...</td></tr>';
    
    let allUsers = [];

    // Tenta buscar TODOS os usuários no Firestore se estiver online
    if (typeof firebase !== 'undefined' && navigator.onLine) {
        try {
            const db = firebase.firestore();
            const snapshot = await db.collection('users').get();
            snapshot.forEach(doc => {
                const data = doc.data();
                // O objeto salvo no firebase tem a estrutura completa (currentUser, users[], etc)
                // Precisamos extrair o usuário principal desse registro
                if (data.currentUser) {
                    allUsers.push(data.currentUser);
                }
            });
        } catch (e) {
            console.error("Erro ao listar usuários do Firebase:", e);
            alert("Erro ao buscar lista completa. Mostrando cache local.");
            allUsers = appData.users; // Fallback para local
        }
    } else {
        allUsers = appData.users; // Fallback para local
    }

    tbody.innerHTML = '';
    
    if (allUsers.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center">Nenhum usuário encontrado.</td></tr>';
        return;
    }

    allUsers.forEach(user => {
        const daysLeft = Math.ceil((user.licenseExpire - Date.now()) / 86400000);
        const statusClass = daysLeft > 0 ? 'text-success' : 'text-danger';
        const statusText = daysLeft > 0 ? `${daysLeft} dias` : 'Expirado';
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${user.name}</td>
            <td>${user.email}</td>
            <td class="${statusClass} font-bold">${statusText}</td>
            <td>
                <button class="action-btn btn-info" onclick="openCreditModal('${user.id}', '${user.name}')">Renovar</button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

function openCreditModal(userId, userName) {
    document.getElementById('credit-user-id').value = userId;
    document.getElementById('credit-user-display').innerText = `Usuário: ${userName}`;
    document.getElementById('credit-days-input').value = '';
    document.getElementById('credit-date-input').value = '';
    document.querySelector('input[name="creditType"][value="days"]').checked = true;
    toggleCreditMode();
    document.getElementById('modal-credits').classList.remove('hidden');
}

function toggleCreditMode() {
    const mode = document.querySelector('input[name="creditType"]:checked').value;
    if (mode === 'days') {
        document.getElementById('credit-mode-days').classList.remove('hidden');
        document.getElementById('credit-mode-date').classList.add('hidden');
    } else {
        document.getElementById('credit-mode-days').classList.add('hidden');
        document.getElementById('credit-mode-date').classList.remove('hidden');
    }
}

// CORREÇÃO: Salvar créditos diretamente no Firebase para o usuário alvo
async function saveUserCredits() {
    const userId = document.getElementById('credit-user-id').value;
    const mode = document.querySelector('input[name="creditType"]:checked').value;
    
    // Busca o usuário na lista local (apenas para referência de cálculo)
    // Se não achar local, teremos que buscar no server, mas vamos assumir que o renderUserList já populou algo ou vamos usar data atual
    // Para simplificar e ser robusto: buscaremos o doc no firebase primeiro
    
    try {
        if (!navigator.onLine) throw new Error("É necessário estar online para dar créditos.");
        const db = firebase.firestore();
        const userRef = db.collection('users').doc(userId);
        const doc = await userRef.get();

        if (!doc.exists) throw new Error("Usuário não encontrado no banco de dados.");

        const remoteData = doc.data();
        let userObj = remoteData.currentUser;
        
        const now = Date.now();
        let newLicenseDate = 0;

        if (mode === 'days') {
            const daysToAdd = parseInt(document.getElementById('credit-days-input').value);
            if (!daysToAdd || isNaN(daysToAdd)) return alert('Digite um número válido de dias.');
            
            // Se a licença já venceu, começa de agora. Se não, soma.
            if (userObj.licenseExpire < now) {
                newLicenseDate = now + (daysToAdd * 86400000);
            } else {
                newLicenseDate = userObj.licenseExpire + (daysToAdd * 86400000);
            }
        } else {
            const dateInput = document.getElementById('credit-date-input').value;
            if (!dateInput) return alert('Selecione uma data válida.');
            newLicenseDate = new Date(dateInput + 'T23:59:59').getTime();
            if (newLicenseDate < now) return alert('A data selecionada já passou!');
        }

        // Atualiza o objeto
        userObj.licenseExpire = newLicenseDate;
        
        // Salva de volta no Firebase (atualiza o campo currentUser dentro do documento do usuário)
        await userRef.update({
            currentUser: userObj
        });

        // Se o usuário alterado for o admin logado, atualiza localmente também
        if (appData.currentUser && appData.currentUser.id === userId) {
            appData.currentUser.licenseExpire = newLicenseDate;
            checkLicense();
        }

        // Atualiza a lista na tela
        await renderUserList(); 
        closeModal('modal-credits');
        alert('Licença atualizada com sucesso no servidor!');

    } catch(err) { 
        alert("Erro ao salvar créditos: " + err.message); 
    }
}

// ... (Restante das funções: initReminderSystem, etc... mantidas iguais) ...

function initReminderSystem() {
    if (checkInterval) clearInterval(checkInterval);
    checkInterval = setInterval(checkReminders, 30000);
}

function checkReminders() {
    if (!appData.currentUser) return;
    const userData = getUserData();
    if (!userData) return;

    const reminders = userData.reminders || [];
    const now = new Date();
    let changed = false;

    reminders.forEach(r => {
        const due = new Date(r.dateTime);
        if (due <= now) {
            triggerAlert(r); 
            r.dateTime = calculateNextDate(r.dateTime, r.period); 
            changed = true;
        }
    });

    if (changed) {
        saveData();
        if (currentView === 'lembretes') renderRemindersList();
    }
}

function triggerAlert(r) {
    document.getElementById('alert-title').innerText = `🔔 ${r.title}`;
    document.getElementById('alert-msg').innerText = r.msg;
    document.getElementById('alert-time').innerText = `Agendado para: ${new Date().toLocaleString()}`;
    
    const subject = `Lembrete: ${r.title}`;
    const body = `Olá,\n\nEste é um lembrete automático:\n\n${r.msg}\n\nData: ${new Date().toLocaleString()}`;
    const mailtoLink = `mailto:${r.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    document.getElementById('alert-btn-email').href = mailtoLink;

    // Tenta envio automático via Cloud Function
    sendAutoEmail(r.email, subject, body)
        .then(() => {
            console.log("Email automático enviado com sucesso.");
            document.getElementById('alert-msg').innerText += "\n\n(✅ Email enviado automaticamente)";
        })
        .catch(err => console.warn("Envio automático falhou:", err));

    document.getElementById('modal-alert').classList.remove('hidden');
    try { 
        const audio = new Audio('https://actions.google.com/sounds/v1/alarms/beep_short.ogg');
        audio.play().catch(e => console.warn("Áudio bloqueado (interação necessária):", e));
    } catch(e){}
}

function calculateNextDate(currentDateStr, period) {
    const date = new Date(currentDateStr);
    
    switch(period) {
        case 'hourly': date.setHours(date.getHours() + 1); break;
        case 'daily': date.setDate(date.getDate() + 1); break;
        case 'weekly': date.setDate(date.getDate() + 7); break;
        case 'biweekly': date.setDate(date.getDate() + 15); break;
        case 'monthly': date.setMonth(date.getMonth() + 1); break;
        case 'yearly': date.setFullYear(date.getFullYear() + 1); break;
        case 'once': return new Date(8640000000000000).toISOString(); 
        default: return new Date(8640000000000000).toISOString();
    }
    
    const offset = date.getTimezoneOffset() * 60000;
    const localISOTime = (new Date(date - offset)).toISOString().slice(0, 16);
    return localISOTime;
}

function saveReminder(e) {
    e.preventDefault();
    try {
        const id = document.getElementById('rem-id').value;
        const title = document.getElementById('rem-title').value;
        const dateTime = document.getElementById('rem-datetime').value;
        const email = document.getElementById('rem-email').value;
        const msg = document.getElementById('rem-msg').value;
        const period = document.getElementById('rem-period').value;
        const immediate = document.getElementById('rem-immediate').checked;

        if (!title || !dateTime || !email) return alert('Preencha os campos obrigatórios');

        const reminder = {
            id: id || 'rem_' + Date.now(),
            title, dateTime, email, msg, period,
            emailStatus: 'pending' 
        };
        
        const userData = getUserData();
        if (!userData.reminders) userData.reminders = [];
        const list = userData.reminders;

        if (id) {
            const idx = list.findIndex(r => r.id === id);
            if (idx !== -1) list[idx] = reminder;
        } else {
            list.push(reminder);
        }

        saveData();

        if (immediate) {
            const subject = `Lembrete: ${title}`;
            const body = `Olá,\n\nEste é um lembrete configurado:\n\n${msg}\n\nData: ${new Date(dateTime).toLocaleString()}\nPeriodicidade: ${period}`;
            
            // Envia via Cloud Function
            sendAutoEmail(email, subject, body)
                .then(() => alert('Lembrete Salvo e Email enviado com sucesso!'))
                .catch((err) => {
                    console.warn("Falha no envio auto, abrindo mailto.", err);
                    window.location.href = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
                });
        } else {
            alert('Lembrete Salvo!');
        }
        
        cancelReminderEdit(); 
        renderRemindersList();
    } catch(err) { alert("Erro ao salvar lembrete: " + err.message); }
}

function editReminder(index) {
    const userData = getUserData();
    const r = userData.reminders[index];
    if (r) {
        document.getElementById('rem-id').value = r.id;
        document.getElementById('rem-title').value = r.title;

        const rDate = new Date(r.dateTime);
        // FIX: Se o ano for muito distante (ex: > 9999), usa a data atual
        if (isNaN(rDate.getTime()) || rDate.getFullYear() > 2100) {
            const now = new Date();
            const offset = now.getTimezoneOffset() * 60000;
            document.getElementById('rem-datetime').value = (new Date(now - offset)).toISOString().slice(0, 16);
        } else {
            document.getElementById('rem-datetime').value = r.dateTime.substring(0, 16);
        }

        document.getElementById('rem-email').value = r.email;
        document.getElementById('rem-msg').value = r.msg;
        document.getElementById('rem-period').value = r.period;
        
        document.getElementById('rem-form-title').innerText = "✏️ Editando Lembrete";
        document.getElementById('rem-btn-save').innerText = "Atualizar Lembrete";
        document.getElementById('rem-btn-cancel').classList.remove('hidden');
        document.getElementById('rem-title').focus();
    }
}

function cancelReminderEdit() {
    document.getElementById('rem-id').value = "";
    document.getElementById('rem-title').value = "";
    document.getElementById('rem-datetime').value = "";
    document.getElementById('rem-email').value = "";
    document.getElementById('rem-msg').value = "";
    document.getElementById('rem-period').value = "once";
    document.getElementById('rem-immediate').checked = false;

    document.getElementById('rem-form-title').innerText = "🔔 Novo Lembrete";
    document.getElementById('rem-btn-save').innerText = "Salvar Lembrete Automático";
    document.getElementById('rem-btn-cancel').classList.add('hidden');
}

function renderRemindersList() {
    const userData = getUserData();
    if(!userData) return;
    const list = userData.reminders || [];
    const tbody = document.getElementById('reminders-tbody');
    tbody.innerHTML = '';

    const activeList = list.filter(r => new Date(r.dateTime).getFullYear() < 3000);

    if (activeList.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center">Nenhum lembrete ativo.</td></tr>';
        return;
    }

    activeList.forEach((r, index) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${r.title}</td>
            <td>${new Date(r.dateTime).toLocaleString()}</td>
            <td>${translatePeriod(r.period)}</td>
            <td>
                <button class="action-btn btn-warning" onclick="editReminder(${index})">✏️</button>
                <button class="action-btn btn-danger" onclick="deleteReminder(${index})">🗑️</button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

function translatePeriod(p) {
    const map = {
        'once': 'Uma vez', 'hourly': 'Horário', 'daily': 'Diário', 
        'weekly': 'Semanal', 'biweekly': 'Quinzenal', 'monthly': 'Mensal', 'yearly': 'Anual'
    };
    return map[p] || p;
}

function deleteReminder(index) {
    if (confirm('Excluir lembrete?')) {
        const userData = getUserData();
        userData.reminders.splice(index, 1);
        saveData();
        renderRemindersList();
    }
}

init();