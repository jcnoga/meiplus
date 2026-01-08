const DEFAULT_URL_FISCAL = "https://www.nfse.gov.br/EmissorNacional/Login?ReturnUrl=%2fEmissorNacional";
const DEFAULT_URL_DAS = "https://www8.receita.fazenda.gov.br/SimplesNacional/Aplicacoes/ATSPO/pgmei.app/Identificacao";
const DB_KEY = 'MEI_SYSTEM_V11';
const ADMIN_EMAIL = 'jcnvap@gmail.com'; 

const LIC_PAD_VAL = 13;
const LIC_MULT_FACTOR = 9;
const LIC_YEAR_BASE = 1954;

const firebaseConfig = {
  apiKey: "AIzaSyBdFZ09MoPhwr24bLU8Ts7DBTkkfsApIK8",
  authDomain: "mei-pro-1376f.firebaseapp.com",
  projectId: "mei-pro-1376f",
  storageBucket: "mei-pro-1376f.firebasestorage.app",
  messagingSenderId: "327978602244",
  appId: "1:327978602244:web:267232dbfb224d3deb4a51",
  measurementId: "G-2VMK9V9GHJ"
};

const DataManager = {
    dbName: 'MEI_DB_HYBRID',
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
        // Persistência Local
        try { localStorage.setItem(DB_KEY, JSON.stringify(data)); } catch(e) { console.warn("LocalStorage full"); }

        try {
            const db = await this.initDB();
            const tx = db.transaction(this.storeName, 'readwrite');
            tx.objectStore(this.storeName).put(data, 'main_data');
        } catch(e) { console.error("IDB Error", e); }

        // Sincronização Cloud (GitHub Pages/Web)
        if (typeof firebase !== 'undefined' && firebase.apps.length && data.currentUser && firebaseConfig.apiKey !== "SUA_API_KEY_AQUI") {
            try {
                // Verifica se há conexão antes de tentar gravar
                if (navigator.onLine) {
                    const db = firebase.firestore();
                    // Usamos JSON.parse/stringify para remover referências cíclicas e garantir objeto puro
                    await db.collection('users').doc(data.currentUser.id).set(JSON.parse(JSON.stringify(data)));
                    this.updateSyncStatus(true);
                } else {
                    this.updateSyncStatus(false);
                }
            } catch(e) { 
                console.error("Cloud Sync Error (Verifique Domínios Autorizados no Firebase):", e); 
                this.updateSyncStatus(false);
            }
        } else {
            this.updateSyncStatus(false);
        }
    },

    // Novo método para baixar dados da nuvem ao logar (Crucial para Web/Github Pages)
    async pullCloudData(userId) {
        if (typeof firebase !== 'undefined' && firebase.apps.length && navigator.onLine) {
            try {
                const db = firebase.firestore();
                const doc = await db.collection('users').doc(userId).get();
                if (doc.exists) {
                    console.log("Dados da nuvem recuperados com sucesso.");
                    return doc.data();
                }
            } catch (e) {
                console.error("Erro ao baixar dados da nuvem:", e);
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
        } catch(e) { console.warn("IDB Load Fail", e); }

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

// Inicialização Firebase (Robustez para GitHub Pages)
if (typeof firebase !== 'undefined' && firebaseConfig.apiKey && firebaseConfig.apiKey !== "SUA_API_KEY_AQUI") {
    try { 
        firebase.initializeApp(firebaseConfig); 
        console.log("Firebase Initialized - GitHub Pages Mode");
        
        // Listener para persistência de Auth em refresh de página
        firebase.auth().onAuthStateChanged((user) => {
            if (user) {
                console.log("Sessão Firebase Ativa:", user.email);
            } else {
                console.log("Nenhuma sessão Firebase ativa.");
            }
        });

    } catch(e) { console.error("Firebase Init Error", e); }
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

async function init() {
    // Carrega dados locais primeiro para velocidade
    const loadedData = await DataManager.load();
    if (loadedData) appData = loadedData;
    
    if (!appData.irrfTable || appData.irrfTable.length === 0) appData.irrfTable = JSON.parse(JSON.stringify(DEFAULT_IRRF));
    
    const sessionUser = sessionStorage.getItem('mei_user_id');
    if (sessionUser) {
        const user = appData.users.find(u => u.id === sessionUser);
        if (user) { 
            loginUser(user); // Tenta logar e syncar
            return; 
        }
    }
    showAuth();
}

function showAuth() { document.getElementById('auth-screen').classList.remove('hidden'); document.getElementById('app-container').classList.add('hidden'); }
async function saveData() { await DataManager.save(appData); }

async function loginUser(user) {
    // Tentativa de puxar dados mais recentes da nuvem (Feature Híbrida)
    document.getElementById('sync-indicator').className = 'sync-status sync-offline'; // reset visual
    
    const cloudData = await DataManager.pullCloudData(user.id);
    if (cloudData) {
        // Se houver dados na nuvem, mescla com o appData local
        // Prioridade para a nuvem para evitar overwrites de sessões antigas
        appData = cloudData;
        // Atualiza a referência do usuário logado com os dados da nuvem
        const updatedUser = appData.users.find(u => u.id === user.id);
        if (updatedUser) user = updatedUser;
        DataManager.updateSyncStatus(true);
    }

    appData.currentUser = user; 
    sessionStorage.setItem('mei_user_id', user.id);
    
    document.getElementById('auth-screen').classList.add('hidden');
    document.getElementById('app-container').classList.remove('hidden');
    document.getElementById('user-name-display').innerText = user.name;
    
    if(!appData.records[user.id]) appData.records[user.id] = createSeedData(); // Segurança extra
    if(!appData.records[user.id].appointments) appData.records[user.id].appointments = [];
    if(!appData.records[user.id].reminders) appData.records[user.id].reminders = []; 
    
    checkLicense(); 
    navTo('dashboard'); 
    loadFiscalReminders();
    initReminderSystem(); 
    saveData(); 
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
    if (!firebaseConfig.apiKey || firebaseConfig.apiKey === "SUA_API_KEY_AQUI") {
        alert('Configure as chaves do Firebase no código para usar o login com Google.');
        return;
    }
    const provider = new firebase.auth.GoogleAuthProvider();
    firebase.auth().signInWithPopup(provider).then(async (result) => {
        const user = result.user;
        
        // Tenta baixar dados existentes deste usuário Google antes de criar novo
        const cloudData = await DataManager.pullCloudData('u_' + user.uid);
        if (cloudData) {
             appData = cloudData;
        }

        let appUser = appData.users.find(u => u.email === user.email);
        if(!appUser) {
            appUser = {
                id: 'u_' + user.uid, 
                name: user.displayName, 
                email: user.email, 
                password: 'google_auth', 
                licenseExpire: new Date().getTime() + (90 * 86400000),
                company: { reserve_rate: 10, prolabore_target: 4000 }
            };
            appData.users.push(appUser);
            appData.records[appUser.id] = createSeedData();
        }
        loginUser(appUser);
    }).catch((error) => {
        console.error("Erro Auth Google:", error);
        alert("Erro no login Google: " + error.message + "\nVerifique se o domínio (ex: github.io) está autorizado no Firebase Console.");
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

document.getElementById('register-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('reg-email').value;
    if (appData.users.find(u => u.email === email)) return alert('E-mail já existe!');
    
    const newUser = {
        id: 'u_' + Date.now(), name: document.getElementById('reg-name').value, email: email,
        password: document.getElementById('reg-password').value,
        licenseExpire: new Date().getTime() + (90 * 86400000),
        company: { reserve_rate: 10, prolabore_target: 4000 }
    };
    appData.users.push(newUser); 
    appData.records[newUser.id] = createSeedData();
    saveData(); loginUser(newUser);
});

document.getElementById('login-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const user = appData.users.find(u => u.email === document.getElementById('login-email').value && u.password === document.getElementById('login-password').value);
    user ? loginUser(user) : alert('Erro no login ou usuário não encontrado localmente.');
});

function navTo(viewId) {
    currentView = viewId;
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
    if(viewId === 'fiscal') {
        renderIrrf();
        const comp = appData.currentUser.company || {};
        document.getElementById('link-emissor').href = comp.url_fiscal || DEFAULT_URL_FISCAL;
        document.getElementById('link-das').href = comp.url_das || DEFAULT_URL_DAS;
    }
    if(viewId === 'configuracoes') {
        loadSettings();
        if(appData.currentUser.email === ADMIN_EMAIL) {
            document.getElementById('admin-panel').classList.remove('hidden');
        } else {
            document.getElementById('admin-panel').classList.add('hidden');
        }
    }
    if(viewId === 'lembretes') renderRemindersList();
    if(viewId === 'rpa') loadRPAOptions();
}

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
    
    const supplierId = 'sup_own_' + appData.currentUser.id;
    const supplierData = {
        id: supplierId, name: companyData.name + " (Minha Empresa)",
        cnpj_cpf: companyData.cnpj, phone: companyData.phone,
        address: companyData.address, email: appData.currentUser.email,
        contact_person: appData.currentUser.name, is_own_company: true
    };
    const suppliersList = getUserData().suppliers;
    const supIndex = suppliersList.findIndex(s => s.id === supplierId);
    if(supIndex >= 0) suppliersList[supIndex] = supplierData; else suppliersList.push(supplierData);

    saveData(); alert('Dados salvos e cadastro de fornecedor atualizado!');
}

function updateDashboard() {
    const t = getUserData().transactions; 
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const reserveRate = appData.currentUser.company.reserve_rate || 10;
    const prolaboreTarget = appData.currentUser.company.prolabore_target || 4000;

    let income = 0; let expense = 0; let totalReserve = 0; let totalProlabore = 0;
    t.forEach(x => {
        const d = new Date(x.date);
        if (x.type === 'receita') {
            if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
                income += x.value;
                const reserveAmount = x.value * (reserveRate / 100);
                totalReserve += reserveAmount;
                const remainder = x.value - reserveAmount;
                const needed = prolaboreTarget - totalProlabore;
                if (needed > 0) totalProlabore += (remainder >= needed) ? needed : remainder;
            }
        } else {
            if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) expense += x.value;
        }
    });

    document.getElementById('dash-income').innerText = `R$ ${income.toFixed(2)}`;
    document.getElementById('dash-expense').innerText = `R$ ${expense.toFixed(2)}`;
    document.getElementById('dash-balance').innerText = `R$ ${(income-expense).toFixed(2)}`;
    document.getElementById('reserve-percent-display').innerText = reserveRate;
    document.getElementById('dash-reserve').innerText = `R$ ${totalReserve.toFixed(2)}`;
    document.getElementById('dash-prolabore').innerText = `R$ ${totalProlabore.toFixed(2)}`;
    document.getElementById('dash-prolabore-target').innerText = `Meta: R$ ${prolaboreTarget.toFixed(2)}`;
}

function renderAgenda(filter = '') {
    if(!getUserData().appointments) getUserData().appointments = [];
    let list = getUserData().appointments.sort((a,b) => new Date(a.date+'T'+a.time) - new Date(b.date+'T'+b.time));

    if (filter === 'today') {
        const today = new Date().toISOString().split('T')[0];
        list = list.filter(a => a.date === today);
    } else if (!filter) {
        const inputDate = document.getElementById('agenda-filter-date').value;
        if(inputDate) list = list.filter(a => a.date === inputDate);
    }

    const container = document.getElementById('agenda-list');
    container.innerHTML = '';
    if (list.length === 0) { container.innerHTML = '<p class="text-center p-4" style="grid-column: 1/-1;">Nenhum agendamento encontrado.</p>'; return; }

    const statusMap = {
        'agendado': { label: 'Agendado', class: 'bg-scheduled', card: 'status-agendado' },
        'concluido': { label: 'Concluído', class: 'bg-done', card: 'status-concluido' },
        'cancelado': { label: 'Cancelado', class: 'bg-canceled', card: 'status-cancelado' }
    };

    list.forEach(a => {
        const st = statusMap[a.status] || statusMap['agendado'];
        const formattedDate = a.date.split('-').reverse().join('/');
        const card = document.createElement('div');
        card.className = `stat-card agenda-card ${st.card}`;
        card.innerHTML = `
            <div class="flex justify-between items-start mb-2">
                <span class="badge ${st.class}">${st.label}</span>
                <div class="text-sm font-bold text-light">${formattedDate} - ${a.time}</div>
            </div>
            <h3 class="mb-1">${a.title}</h3>
            <p class="text-sm mb-1"><strong>Cliente:</strong> ${a.client_name}</p>
            <p class="text-sm mb-2 text-light">${a.service_desc || 'Sem descrição'}</p>
            <div class="flex justify-between items-center mt-2 border-t pt-2">
                <div class="text-sm">
                    <span class="${a.pay_status === 'pago' ? 'text-success font-bold' : 'text-warning'}">
                        ${a.pay_status === 'pago' ? '💲 Pago' : '⏳ Pendente'}
                    </span>
                        - R$ ${parseFloat(a.value).toFixed(2)}
                </div>
                <div>
                    <button class="action-btn btn-warning" onclick="editAppointment('${a.id}')">✏️</button>
                    <button class="action-btn btn-danger" onclick="deleteAppointment('${a.id}')">🗑️</button>
                </div>
            </div>
        `;
        container.appendChild(card);
    });
}

function openAppointmentModal(appt = null) {
    document.getElementById('form-appointment').reset();
    const clientSelect = document.getElementById('appt-client-select');
    clientSelect.innerHTML = '<option value="">Selecionar Cliente Cadastrado...</option>';
    getUserData().clients.forEach(c => { clientSelect.innerHTML += `<option value="${c.id}">${c.name}</option>`; });

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
    if(id) {
        const c = getUserData().clients.find(x => x.id === id);
        if(c) {
            document.getElementById('appt-client-name').value = c.name;
            document.getElementById('appt-client-phone').value = c.phone || '';
        }
    }
}

function saveAppointment(e) {
    e.preventDefault();
    const id = document.getElementById('appt-id').value;
    const data = {
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
    };
    const list = getUserData().appointments;
    if (id) { const idx = list.findIndex(x => x.id === id); if(idx !== -1) list[idx] = data; } else { list.push(data); }
    saveData(); closeModal('modal-appointment'); renderAgenda();
}

function editAppointment(id) { const appt = getUserData().appointments.find(a => a.id === id); if(appt) openAppointmentModal(appt); }
function deleteAppointment(id) { if(confirm('Excluir este agendamento?')) { const list = getUserData().appointments; const idx = list.findIndex(a => a.id === id); if(idx !== -1) list.splice(idx, 1); saveData(); renderAgenda(); } }

function loadRPAOptions() {
    const comp = appData.currentUser.company || {};
    document.getElementById('rpa-comp-name').value = comp.name || '';
    document.getElementById('rpa-comp-cnpj').value = comp.cnpj || '';
    document.getElementById('rpa-comp-addr').value = comp.address || '';
    if(!document.getElementById('rpa-prov-name').value) document.getElementById('rpa-prov-name').value = appData.currentUser.name;

    const select = document.getElementById('rpa-provider-select');
    select.innerHTML = '<option value="">Selecione um Autônomo...</option>';
    getUserData().suppliers.forEach(s => select.innerHTML += `<option value="${s.id}">${s.name}</option>`);
    document.getElementById('rpa-date').valueAsDate = new Date();
    document.getElementById('rpa-id').value = '';
    document.getElementById('rpa-prov-email').value = ''; 
}

function fillRPAProvider() {
    const id = document.getElementById('rpa-provider-select').value;
    const s = getUserData().suppliers.find(item => item.id === id);
    if (s) {
        document.getElementById('rpa-prov-name').value = s.name;
        document.getElementById('rpa-prov-cpf').value = s.cnpj_cpf || '';
        document.getElementById('rpa-prov-phone').value = s.phone || '';
        document.getElementById('rpa-prov-addr').value = s.address || '';
        document.getElementById('rpa-prov-email').value = s.email || '';
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
    for(let row of table) {
        if (irrfBase <= row.max) { irrf = (irrfBase * (row.rate / 100)) - row.deduction; break; }
    }
    if (irrf < 0) irrf = 0;
    document.getElementById('rpa-irrf').value = `R$ ${irrf.toFixed(2)}`;
    document.getElementById('rpa-net').value = `R$ ${(value - inss - iss - irrf).toFixed(2)}`;
}

function saveRPA() {
    const id = document.getElementById('rpa-id').value;
    const rpa = {
        id: id || 'rpa_' + Date.now(),
        date: document.getElementById('rpa-date').value,
        provider: document.getElementById('rpa-prov-name').value,
        desc: document.getElementById('rpa-desc').value,
        value: document.getElementById('rpa-value').value,
        net: document.getElementById('rpa-net').value,
        fullData: {
            provName: document.getElementById('rpa-prov-name').value, provCpf: document.getElementById('rpa-prov-cpf').value,
            provPhone: document.getElementById('rpa-prov-phone').value, provAddr: document.getElementById('rpa-prov-addr').value,
            provEmail: document.getElementById('rpa-prov-email').value,
            inss: document.getElementById('rpa-inss').value, iss: document.getElementById('rpa-iss-val').value, irrf: document.getElementById('rpa-irrf').value
        }
    };
    const list = getUserData().rpas || (getUserData().rpas = []);
    if(id) { const idx = list.findIndex(r => r.id === id); if(idx !== -1) list[idx] = rpa; else list.push(rpa); } else { list.push(rpa); }
    saveData(); alert('RPA Salvo!'); toggleRPAHistory();
}

function sendRPAEmail() {
    const email = document.getElementById('rpa-prov-email').value;
    if(!email) return alert('Por favor, preencha o e-mail do autônomo.');
    const compName = document.getElementById('rpa-comp-name').value;
    const desc = document.getElementById('rpa-desc').value;
    const val = document.getElementById('rpa-net').value;
    const date = document.getElementById('rpa-date').value.split('-').reverse().join('/');
    const subject = `Recibo RPA - ${compName}`;
    const body = `Olá,\n\nSegue resumo do RPA emitido:\n\nServiço: ${desc}\nData: ${date}\nValor Líquido: ${val}\n\nAtt,\n${compName}`;
    window.location.href = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

function toggleRPAHistory() {
    const container = document.getElementById('rpa-history-container');
    container.classList.toggle('hidden');
    if(!container.classList.contains('hidden')) {
        const tbody = document.querySelector('#rpa-history-table tbody');
        tbody.innerHTML = '';
        const list = getUserData().rpas || [];
        list.sort((a,b) => new Date(b.date) - new Date(a.date));
        list.forEach(r => {
            tbody.innerHTML += `<tr><td>${r.date}</td><td>${r.provider}</td><td>${r.net}</td><td><button class="action-btn btn-warning" onclick="loadRPA('${r.id}')">✏️</button><button class="action-btn btn-danger" onclick="deleteRPA('${r.id}')">🗑️</button></td></tr>`;
        });
    }
}

function loadRPA(id) {
    const r = getUserData().rpas.find(x => x.id === id);
    if(r) {
        document.getElementById('rpa-id').value = r.id; document.getElementById('rpa-date').value = r.date;
        document.getElementById('rpa-desc').value = r.desc; document.getElementById('rpa-value').value = r.value;
        document.getElementById('rpa-prov-name').value = r.fullData.provName; document.getElementById('rpa-prov-cpf').value = r.fullData.provCpf;
        document.getElementById('rpa-prov-phone').value = r.fullData.provPhone; document.getElementById('rpa-prov-addr').value = r.fullData.provAddr;
        document.getElementById('rpa-prov-email').value = r.fullData.provEmail || '';
        calculateRPA(); alert('RPA Carregado.'); window.scrollTo(0,0);
    }
}

function deleteRPA(id) { if(confirm('Excluir este RPA?')) { const l = getUserData().rpas; l.splice(l.findIndex(r => r.id === id), 1); saveData(); toggleRPAHistory(); } }

function exportRPAPdf() { 
    const originalTitle = document.title;
    const compName = document.getElementById('rpa-comp-name').value || "Empresa";
    const cleanName = compName.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30);
    document.title = `RPA_${cleanName}`;
    document.querySelectorAll('section').forEach(s => s.classList.remove('active-print')); 
    document.getElementById('view-rpa').classList.add('active-print'); 
    window.print();
    setTimeout(() => { document.title = originalTitle; }, 1000);
}

function exportRPADoc() { 
    const compName = document.getElementById('rpa-comp-name').value || "Empresa";
    const cleanName = compName.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30);
    const html = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word'><head><meta charset='utf-8'><title>RPA</title></head><body><h2 style="text-align:center">RPA - ${compName}</h2><br><h3>1. Contratante</h3><p>Razão: ${compName}</p><p>CNPJ: ${document.getElementById('rpa-comp-cnpj').value}</p><hr><h3>2. Autônomo</h3><p>Nome: ${document.getElementById('rpa-prov-name').value}</p><p>CPF: ${document.getElementById('rpa-prov-cpf').value}</p><hr><h3>3. Serviço</h3><p>${document.getElementById('rpa-desc').value}</p><p>Data: ${document.getElementById('rpa-date').value}</p><hr><h3>4. Valores</h3><p>Bruto: R$ ${document.getElementById('rpa-value').value}</p><p>Líquido: ${document.getElementById('rpa-net').value}</p></body></html>`; 
    const blob = new Blob([html], { type: 'application/msword' }); 
    const url = URL.createObjectURL(blob); 
    const a = document.createElement('a'); 
    a.href = url; 
    a.download = `RPA_${cleanName}.doc`; 
    a.click(); 
}

function exportReportPDF() { document.getElementById('report-company-header').innerText = appData.currentUser.company.name || "Minha Empresa"; document.querySelectorAll('section').forEach(s => s.classList.remove('active-print')); document.getElementById('view-listagens').classList.add('active-print'); window.print(); }
function exportReportDoc() { const header = `<h2>${appData.currentUser.company.name || "Minha Empresa"}</h2>`; const table = document.getElementById('listing-table').outerHTML; const html = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word'><head><meta charset='utf-8'><title>Relatório</title></head><body>${header}<h3>Relatório do Sistema</h3>${table}</body></html>`; const blob = new Blob([html], { type: 'application/msword' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `Relatorio.doc`; a.click(); }

function renderCrud(type) { 
    currentCrudType = type; 
    document.getElementById('crud-title').innerText = type.toUpperCase(); 
    document.querySelectorAll('.crud-btn').forEach(btn => { btn.classList.toggle('active', btn.getAttribute('onclick').includes(`'${type}'`)); });
    const list = getUserData()[type]; 
    const table = document.getElementById('crud-table'); 
    let h = type.match(/products|services/) ? '<th>Nome</th><th>Desc</th><th>Preço</th>' : '<th>Nome</th><th>Contato</th><th>Info</th>'; 
    table.innerHTML = `<thead><tr>${h}<th>Ações</th></tr></thead><tbody>` + list.map(i => `<tr><td>${i.name}</td><td>${i.description || i.contact_person || '-'}</td><td>${i.price ? 'R$ '+i.price : i.phone}</td><td><button class="action-btn btn-warning" onclick="editCrudItem('${i.id}')">✏️</button> <button class="action-btn btn-danger" onclick="deleteCrudItem('${type}','${i.id}')">🗑️</button></td></tr>`).join('') + `</tbody>`; 
}

function openCrudModal(isEdit = false, itemData = null) { document.getElementById('modal-crud').classList.remove('hidden'); document.getElementById('crud-id').value = itemData ? itemData.id : ''; const fields = document.getElementById('crud-fields'); if(currentCrudType.match(/products|services/)) { fields.innerHTML = `<label>Nome</label><input name="name" value="${itemData?.name||''}" required><label>Preço</label><input type="number" step="0.01" name="price" value="${itemData?.price||''}" required><label>Descrição</label><textarea name="description" rows="3">${itemData?.description||''}</textarea>`; } else { fields.innerHTML = `<label>Nome/Razão</label><input name="name" value="${itemData?.name||''}" required><label>Contato</label><input name="contact_person" value="${itemData?.contact_person||''}"><label>CPF/CNPJ</label><input name="cnpj_cpf" value="${itemData?.cnpj_cpf||''}"><label>Endereço</label><input name="address" value="${itemData?.address||''}"><label>Telefone</label><input name="phone" value="${itemData?.phone||''}"><label>Email</label><input name="email" value="${itemData?.email||''}">`; } }
function editCrudItem(id) { const item = getUserData()[currentCrudType].find(i => i.id === id); if (item) openCrudModal(true, item); }
function saveCrudItem(e) { e.preventDefault(); const id = document.getElementById('crud-id').value; const t = e.target; const item = { id: id || 'i_'+Date.now(), name: t.name.value, price: t.price?.value, description: t.description?.value, contact_person: t.contact_person?.value, phone: t.phone?.value, address: t.address?.value, cnpj_cpf: t.cnpj_cpf?.value, email: t.email?.value }; const list = getUserData()[currentCrudType]; const idx = list.findIndex(i => i.id === id); idx !== -1 ? list[idx] = item : list.push(item); saveData(); closeModal('modal-crud'); renderCrud(currentCrudType); }
function deleteCrudItem(t,id){ if(confirm('Apagar?')){const l=getUserData()[t]; l.splice(l.findIndex(x=>x.id===id),1); saveData(); renderCrud(t);} }
function getUserData() { return appData.records[appData.currentUser.id]; }
function closeModal(id) { document.getElementById(id).classList.add('hidden'); }
function checkLicense() { const d = Math.ceil((appData.currentUser.licenseExpire - Date.now())/86400000); document.getElementById('license-days-display').innerText = d>0?d+' dias':'Expirado'; document.getElementById('license-warning').classList.toggle('hidden', d>0); }
function generateLicenseCode() { document.getElementById('license-random-code').value = Math.floor(Math.random()*900)+100; }

function sendWhatsApp() { 
    const code = document.getElementById('license-random-code').value;
    const days = document.getElementById('license-days-input').value;
    window.open(`https://wa.me/5534997824990?text=Cod:${code} Dias:${days}`); 
}

function validateLicense() { 
    const k = parseInt(document.getElementById('license-key-input').value);
    const c = parseInt(document.getElementById('license-random-code').value);
    const d = parseInt(document.getElementById('license-days-input').value); 
    
    if(k === (c + LIC_PAD_VAL) * LIC_MULT_FACTOR + LIC_YEAR_BASE + d){
        const now = Date.now();
        if (appData.currentUser.licenseExpire < now) {
            appData.currentUser.licenseExpire = now + (d * 86400000);
        } else {
            appData.currentUser.licenseExpire += d * 86400000;
        }
        saveData(); checkLicense(); alert('Licença Validada!');
    } else { alert('Código Inválido'); }
}

function filterFinance(filter) {
    currentFinanceFilter = filter;
    document.querySelectorAll('.fin-filter-btn').forEach(btn => { btn.classList.toggle('active', btn.getAttribute('onclick').includes(`'${filter}'`)); });
    renderTransactions();
}

function renderTransactions(){ 
    let l = getUserData().transactions.sort((a,b)=>new Date(b.date)-new Date(a.date)); 
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

function saveTransaction(e){ e.preventDefault(); const id=document.getElementById('trans-id').value; const t={id:id||'t_'+Date.now(), type:document.getElementById('trans-type').value, category:document.getElementById('trans-category').value, value:parseFloat(document.getElementById('trans-value').value), date:document.getElementById('trans-date').value, obs:document.getElementById('trans-obs').value, entity:document.getElementById('trans-entity').value}; const l=getUserData().transactions; const i=l.findIndex(x=>x.id===t.id); i!==-1?l[i]=t:l.push(t); saveData(); closeModal('modal-transaction'); renderTransactions(); }
function deleteTransaction(id){ if(confirm('Apagar?')){const l=getUserData().transactions; l.splice(l.findIndex(x=>x.id===id),1); saveData(); renderTransactions();} }

function updateTransactionDependencies(){
    const type = document.getElementById('trans-type').value;
    const cats = type==='receita'?['Venda','Serviço','Outros']:['Compra','Despesa','Imposto', 'Gastos Pessoais']; 
    document.getElementById('trans-category').innerHTML=cats.map(c=>`<option>${c}</option>`).join('');
    const select = document.getElementById('trans-entity');
    const list = type === 'receita' ? getUserData().clients : getUserData().suppliers;
    if (list && list.length > 0) { select.innerHTML = '<option value="">Selecione...</option>' + list.map(i => `<option value="${i.name}">${i.name}</option>`).join(''); } 
    else { select.innerHTML = '<option value="">Sem cadastros disponíveis</option>'; }
}

function openTransactionModal(){ document.getElementById('form-transaction').reset(); document.getElementById('trans-id').value=''; document.getElementById('modal-transaction').classList.remove('hidden'); updateTransactionDependencies(); }

function switchListing(t){ 
    currentListingType=t; 
    document.querySelectorAll('.tab-btn').forEach(b => { b.classList.remove('active'); if(b.getAttribute('onclick').includes(`'${t}'`)) b.classList.add('active'); });
    
    document.getElementById('movements-filter').classList.toggle('hidden', t !== 'movimentacoes');
    
    renderListingTable();
}

function renderListingTable() {
    const t = currentListingType;
    let data = t === 'movimentacoes' ? getUserData().transactions : getUserData()[t];
    
    if (t === 'movimentacoes') {
        const monthFilter = document.getElementById('listing-month-filter').value; 
        if (monthFilter) {
            data = data.filter(i => i.date.startsWith(monthFilter));
        }
        data.sort((a,b) => new Date(b.date) - new Date(a.date));
    }

    document.getElementById('listing-thead').innerHTML = t === 'movimentacoes' 
        ? '<tr><th>Data</th><th>Tipo</th><th>Descrição</th><th>Valor</th></tr>' 
        : '<tr><th>Nome</th><th>Detalhe</th><th>Valor/Tel</th></tr>'; 
    
    document.getElementById('listing-tbody').innerHTML = data.map(i => {
        if (t === 'movimentacoes') {
            const colorClass = i.type === 'receita' ? 'text-success' : 'text-danger';
            return `<tr><td>${i.date}</td><td>${i.type}</td><td>${i.obs || i.category}</td><td class="${colorClass}">${i.value}</td></tr>`;
        } else {
            return `<tr><td>${i.name}</td><td>${i.description||i.contact_person||'-'}</td><td>${i.price||i.phone||'-'}</td></tr>`;
        }
    }).join('');
}

function loadFiscalReminders(){ document.getElementById('fiscal-reminders').innerHTML='<li>DAS Dia 20</li>'; }
function downloadBackup(){ saveData(); const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([JSON.stringify(appData)],{type:'json'})); a.download='backup.json'; a.click(); }
function restoreBackup(i){ const r=new FileReader(); r.onload=e=>{appData=JSON.parse(e.target.result);saveData();location.reload();}; r.readAsText(i.files[0]); }

function renderIrrf(){ document.getElementById('irrf-table-body').innerHTML=appData.irrfTable.map(r=>`<tr><td>${r.max}</td><td>${r.rate}</td><td>${r.deduction}</td><td><button class="action-btn btn-warning" onclick="editIrrfRow('${r.id}')">✏️</button><button class="action-btn btn-danger" onclick="deleteIrrfRow('${r.id}')">X</button></td></tr>`).join(''); }
function deleteIrrfRow(id){ appData.irrfTable.splice(appData.irrfTable.findIndex(r=>r.id===id),1); saveData(); renderIrrf(); }
function openIrrfModal(){ document.getElementById('form-irrf').reset(); document.getElementById('irrf-id').value = ''; document.getElementById('modal-irrf').classList.remove('hidden'); }
function editIrrfRow(id) {
    const row = appData.irrfTable.find(r => r.id === id);
    if(row) {
        document.getElementById('irrf-id').value = row.id; document.getElementById('irrf-max').value = row.max;
        document.getElementById('irrf-rate').value = row.rate; document.getElementById('irrf-deduction').value = row.deduction;
        document.getElementById('modal-irrf').classList.remove('hidden');
    }
}
function saveIrrfRow(e){ 
    e.preventDefault(); 
    const id = document.getElementById('irrf-id').value;
    const data = { id: id || 'irrf_'+Date.now(), max:parseFloat(e.target[1].value), rate:parseFloat(e.target[2].value), deduction:parseFloat(e.target[3].value) };
    if (id) { const idx = appData.irrfTable.findIndex(r => r.id === id); if (idx !== -1) appData.irrfTable[idx] = data; } else { appData.irrfTable.push(data); }
    saveData(); closeModal('modal-irrf'); renderIrrf(); 
}

// --- GESTÃO DE USUÁRIOS E CRÉDITOS ---

function openUserManagementModal() {
    renderUserList();
    document.getElementById('modal-usermgmt').classList.remove('hidden');
}

function renderUserList() {
    const tbody = document.getElementById('usermgmt-tbody');
    tbody.innerHTML = '';
    
    appData.users.forEach(user => {
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
    
    // Reset para modo padrão (dias)
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

function saveUserCredits() {
    const userId = document.getElementById('credit-user-id').value;
    const mode = document.querySelector('input[name="creditType"]:checked').value;
    const userIndex = appData.users.findIndex(u => u.id === userId);
    
    if (userIndex === -1) return alert('Usuário não encontrado.');
    
    const user = appData.users[userIndex];
    const now = Date.now();
    let newLicenseDate = 0;

    if (mode === 'days') {
        const daysToAdd = parseInt(document.getElementById('credit-days-input').value);
        if (!daysToAdd || isNaN(daysToAdd)) return alert('Digite um número válido de dias.');
        
        if (user.licenseExpire < now) {
            newLicenseDate = now + (daysToAdd * 86400000);
        } else {
            newLicenseDate = user.licenseExpire + (daysToAdd * 86400000);
        }
    } else {
        const dateInput = document.getElementById('credit-date-input').value;
        if (!dateInput) return alert('Selecione uma data válida.');
        
        newLicenseDate = new Date(dateInput + 'T23:59:59').getTime();
        
        if (newLicenseDate < now) return alert('A data selecionada já passou!');
    }

    user.licenseExpire = newLicenseDate;
    appData.users[userIndex] = user;
    
    if (appData.currentUser && appData.currentUser.id === userId) {
        appData.currentUser = user;
        checkLicense();
    }

    saveData();
    renderUserList(); 
    closeModal('modal-credits');
    alert('Licença atualizada com sucesso!');
}

// --- MÓDULO DE LEMBRETES COM AUTOMAÇÃO (V12.3: CLOUD FUNCTION PREP + EDIÇÃO) ---

function initReminderSystem() {
    if (checkInterval) clearInterval(checkInterval);
    checkInterval = setInterval(checkReminders, 30000);
}

function checkReminders() {
    if (!appData.currentUser) return;
    
    const reminders = getUserData().reminders || [];
    const now = new Date();
    let changed = false;

    // Alerta visual local (Fallback)
    reminders.forEach(r => {
        const due = new Date(r.dateTime);
        if (due <= now) {
            triggerAlert(r); // Alerta UI
            r.dateTime = calculateNextDate(r.dateTime, r.period); // Atualiza data
            // Nota: O envio real do email deve ser feito pela Cloud Function (Backend)
            // para garantir entrega mesmo com navegador fechado.
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

    document.getElementById('modal-alert').classList.remove('hidden');
    try { new Audio('https://actions.google.com/sounds/v1/alarms/beep_short.ogg').play(); } catch(e){}
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
        title,
        dateTime,
        email,
        msg,
        period,
        emailStatus: 'pending' // Campo auxiliar para a Cloud Function
    };

    if (!getUserData().reminders) getUserData().reminders = [];
    const list = getUserData().reminders;

    if (id) {
        // Modo Edição
        const idx = list.findIndex(r => r.id === id);
        if (idx !== -1) list[idx] = reminder;
    } else {
        // Modo Criação
        list.push(reminder);
    }

    saveData();

    if (immediate) {
        const subject = `Lembrete: ${title}`;
        const body = `Olá,\n\nEste é um lembrete configurado:\n\n${msg}\n\nData: ${new Date(dateTime).toLocaleString()}\nPeriodicidade: ${period}`;
        window.location.href = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    } else {
        alert('Lembrete Salvo!');
    }
    
    cancelReminderEdit(); // Limpa e restaura o form
    renderRemindersList();
}

function editReminder(index) {
    const r = getUserData().reminders[index];
    if (r) {
        document.getElementById('rem-id').value = r.id;
        document.getElementById('rem-title').value = r.title;
        document.getElementById('rem-datetime').value = r.dateTime;
        document.getElementById('rem-email').value = r.email;
        document.getElementById('rem-msg').value = r.msg;
        document.getElementById('rem-period').value = r.period;
        
        // Ajuste UI
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

    // Reset UI
    document.getElementById('rem-form-title').innerText = "🔔 Novo Lembrete";
    document.getElementById('rem-btn-save').innerText = "Salvar Lembrete Automático";
    document.getElementById('rem-btn-cancel').classList.add('hidden');
}

function renderRemindersList() {
    const list = getUserData().reminders || [];
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
        getUserData().reminders.splice(index, 1);
        saveData();
        renderRemindersList();
    }
}

init();