// --- CONSTANTES DE SEGURANÇA E CONFIGURAÇÃO ---
const DEFAULT_URL_FISCAL = "https://www.nfse.gov.br/EmissorNacional/Login?ReturnUrl=%2fEmissorNacional";
const DEFAULT_URL_DAS = "https://www8.receita.fazenda.gov.br/SimplesNacional/Aplicacoes/ATSPO/pgmei.app/Identificacao";
const DB_KEY = 'MEI_SYSTEM_V11';

// Constantes da Licença
const LIC_PAD_VAL = 13;
const LIC_MULT_FACTOR = 9;
const LIC_YEAR_BASE = 1954;

// Configuração Firebase
const firebaseConfig = {
    apiKey: "AIzaSyAY06PHLqEUCBzg9SjnH4N6xe9ZzM8OLvo",
    authDomain: "projeto-bfed3.firebaseapp.com",
    projectId: "projeto-bfed3",
    storageBucket: "projeto-bfed3.firebasestorage.app",
    messagingSenderId: "785289237066",
    appId: "1:785289237066:web:11fdd8f617a65911d5ccb3"
};

// --- GESTOR DE DADOS HÍBRIDO (IndexedDB + Firebase + LocalStorage) ---
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
        // 1. LocalStorage
        try { localStorage.setItem(DB_KEY, JSON.stringify(data)); } catch(e) { console.warn("LocalStorage full"); }

        // 2. IndexedDB
        try {
            const db = await this.initDB();
            const tx = db.transaction(this.storeName, 'readwrite');
            tx.objectStore(this.storeName).put(data, 'main_data');
        } catch(e) { console.error("IDB Error", e); }

        // 3. Firebase (Sincronização opcional/automática)
        this.syncToCloud(data);
    },

    async syncToCloud(data) {
        if (typeof firebase !== 'undefined' && firebase.apps.length && data.currentUser) {
            try {
                const db = firebase.firestore();
                // Saneamento de dados
                const cleanData = JSON.parse(JSON.stringify(data));
                await db.collection('users').doc('u_' + data.currentUser.id.replace('u_', '')).set(cleanData);
                this.updateSyncStatus(true);
            } catch(e) { 
                console.error("Cloud Sync Error", e); 
                this.updateSyncStatus(false);
            }
        } else {
            this.updateSyncStatus(false);
        }
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

// --- INICIALIZAÇÃO FIREBASE ---
if (typeof firebase !== 'undefined' && firebaseConfig.apiKey) {
    try {
        firebase.initializeApp(firebaseConfig);
        console.log("Firebase Initialized");
    } catch(e) { console.error("Firebase Init Error", e); }
}

// --- VARIÁVEIS DE ESTADO ---
let appData = { currentUser: null, users: [], records: {}, irrfTable: [], meiOptions: [] };

// TABELA IRRF 2025 ATUALIZADA
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
let financeDateFilterActive = false;

// --- INICIALIZAÇÃO E AUTH ---
async function init() {
    const loadedData = await DataManager.load();
    if (loadedData) appData = loadedData;
    
    if (!appData.irrfTable || appData.irrfTable.length === 0) appData.irrfTable = JSON.parse(JSON.stringify(DEFAULT_IRRF));
    
    // Inicialização Opções MEI 2025
    if (!appData.meiOptions || appData.meiOptions.length === 0) {
        appData.meiOptions = [
            { id: 'mei_2025', year: 2025, salary: 1620.99, inssRate: 5, icms: 1.00, iss: 5.00 }
        ];
    }

    // Monitor de Conectividade para Sincronização Automática
    window.addEventListener('online', async () => {
        console.log("Conexão restaurada. Sincronizando com a nuvem...");
        if(appData.currentUser) await DataManager.save(appData);
    });

    const sessionUser = sessionStorage.getItem('mei_user_id');
    if (sessionUser) {
        const user = appData.users.find(u => u.id === sessionUser);
        if (user) { loginUser(user); return; }
    }
    showAuth();
}

function showAuth() { document.getElementById('auth-screen').classList.remove('hidden'); document.getElementById('app-container').classList.add('hidden'); }

async function saveData() { await DataManager.save(appData); }

// Sincronização Voluntária
function forceCloudSync() {
    if(!appData.currentUser) return;
    const btn = document.querySelector('button[onclick="forceCloudSync()"]');
    const originalText = btn.innerText;
    btn.innerText = "Sincronizando...";
    btn.disabled = true;
    
    DataManager.save(appData).then(() => {
        setTimeout(() => {
            btn.innerText = originalText;
            btn.disabled = false;
            alert("Sincronização com a nuvem solicitada!");
        }, 1000);
    });
}

function loginUser(user) {
    appData.currentUser = user; sessionStorage.setItem('mei_user_id', user.id);
    document.getElementById('auth-screen').classList.add('hidden');
    document.getElementById('app-container').classList.remove('hidden');
    document.getElementById('user-name-display').innerText = user.name;
    
    if(!appData.records[user.id].appointments) appData.records[user.id].appointments = [];
    
    checkLicense(); navTo('dashboard'); loadFiscalReminders();
    saveData(); 
}

function logout() { appData.currentUser = null; sessionStorage.removeItem('mei_user_id'); location.reload(); }

function toggleAuth(screen) {
    document.getElementById('login-form').classList.toggle('hidden', screen === 'register');
    document.getElementById('register-form').classList.toggle('hidden', screen !== 'register');
}

// LOGIN GOOGLE
async function handleGoogleLogin() {
    if (!firebaseConfig.apiKey) {
        alert('Simulação: Login com Google realizado! (Configure as chaves do Firebase para ativar)');
        return;
    }
    const provider = new firebase.auth.GoogleAuthProvider();
    
    try {
        const result = await firebase.auth().signInWithPopup(provider);
        const user = result.user;
        const db = firebase.firestore();
        const docId = 'u_' + user.uid;

        // 1. Verificação de cadastro na nuvem
        let docSnap;
        try {
            docSnap = await db.collection('users').doc(docId).get();
        } catch(e) {
            console.warn("Erro ao verificar nuvem:", e);
        }

        if (docSnap && docSnap.exists) {
            // EXISTE NA NUVEM
            const cloudData = docSnap.data();
            if(cloudData) {
                appData = cloudData;
                await DataManager.save(appData); // Atualiza local
            }
        }
        
        // 2. Verifica Local e Prepara Dados
        let appUser = appData.users.find(u => u.email === user.email);
        
        if(!appUser) {
            // Se não existe, cria novo
            appUser = {
                id: docId, 
                name: user.displayName, 
                email: user.email, 
                password: 'google_auth', 
                licenseExpire: new Date().getTime() + (90 * 86400000),
                company: { reserve_rate: 10, prolabore_target: 4000 }
            };
            
            if(!appData.users) appData.users = [];
            appData.users.push(appUser);
            
            if(!appData.records) appData.records = {};
            appData.records[appUser.id] = createSeedData();
            
            // Cadastro automático na nuvem
            await DataManager.save(appData);
        }
        
        // 3. Login
        loginUser(appUser);

    } catch (error) {
        alert("Erro no login Google: " + error.message);
        console.error(error);
    }
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
        appointments: []
    };
}

// Event Listeners Auth
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
    
    // Define o contexto do usuário antes de salvar para garantir que o syncToCloud 
    // tenha o ID correto e persista na nuvem imediatamente após a criação.
    appData.currentUser = newUser;

    saveData(); 
    loginUser(newUser);
});

document.getElementById('login-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const user = appData.users.find(u => u.email === document.getElementById('login-email').value && u.password === document.getElementById('login-password').value);
    user ? loginUser(user) : alert('Erro no login');
});

// --- NAVEGAÇÃO ---
function navTo(viewId) {
    document.querySelectorAll('main section').forEach(el => el.classList.add('hidden'));
    document.getElementById('view-' + viewId).classList.remove('hidden');
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    const btn = Array.from(document.querySelectorAll('.nav-item')).find(el => el.getAttribute('onclick').includes(viewId));
    if(btn) btn.classList.add('active');
    
    if(viewId === 'dashboard') updateDashboard();
    if(viewId === 'listagens') switchListing('clients');
    if(viewId === 'financeiro') {
        // Sugerir data atual nos filtros
        const today = new Date().toISOString().split('T')[0];
        if(!document.getElementById('finance-start-date').value) document.getElementById('finance-start-date').value = today;
        if(!document.getElementById('finance-end-date').value) document.getElementById('finance-end-date').value = today;
        financeDateFilterActive = false; // Reset filter state on entry
        renderTransactions();
    }
    if(viewId === 'cadastros') renderCrud(currentCrudType);
    if(viewId === 'agenda') renderAgenda();
    if(viewId === 'fiscal') {
        renderIrrf();
        renderMeiFiscalCalculations(); // Inicia cálculo MEI 2025
        const comp = appData.currentUser.company || {};
        // LINKAGEM CORRETA DOS BOTÕES FISCAIS
        document.getElementById('link-emissor').href = comp.url_fiscal || DEFAULT_URL_FISCAL;
        document.getElementById('link-das').href = comp.url_das || DEFAULT_URL_DAS;
    }
    if(viewId === 'configuracoes') loadSettings();
    if(viewId === 'rpa') loadRPAOptions();
}

// --- CONFIGURAÇÕES & ADMIN ---
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

    // Carregar Opções MEI
    renderMeiOptions();

    // Lógica Admin para jcnvap@gmail.com
    if(appData.currentUser.email === 'jcnvap@gmail.com') {
        document.getElementById('admin-panel').classList.remove('hidden');
    } else {
        document.getElementById('admin-panel').classList.add('hidden');
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
    const idx = appData.users.findIndex(u=>u.id===appData.currentUser.id); 
    appData.users[idx] = appData.currentUser; 

    const supplierId = 'sup_own_' + appData.currentUser.id;
    const supplierData = {
        id: supplierId,
        name: companyData.name + " (Minha Empresa)",
        cnpj_cpf: companyData.cnpj,
        phone: companyData.phone,
        address: companyData.address,
        email: appData.currentUser.email,
        contact_person: appData.currentUser.name,
        is_own_company: true
    };
    
    const suppliersList = getUserData().suppliers;
    const supIndex = suppliersList.findIndex(s => s.id === supplierId);
    if(supIndex >= 0) suppliersList[supIndex] = supplierData; else suppliersList.push(supplierData);
    
    saveData(); alert('Dados salvos e cadastro de fornecedor atualizado!');
}

// --- GESTÃO MEI (CRUD) ---
function renderMeiOptions() {
    const tbody = document.querySelector('#mei-options-table tbody');
    tbody.innerHTML = '';
    
    if(!appData.meiOptions) appData.meiOptions = [];
    
    appData.meiOptions.sort((a,b) => b.year - a.year); // Ordenar por ano desc

    appData.meiOptions.forEach(opt => {
        const inssVal = opt.salary * (opt.inssRate / 100);
        const total = inssVal + parseFloat(opt.icms) + parseFloat(opt.iss);
        
        tbody.innerHTML += `
            <tr>
                <td>${opt.year}</td>
                <td>R$ ${parseFloat(opt.salary).toFixed(2)}</td>
                <td>R$ ${total.toFixed(2)}</td>
                <td>
                    <button class="action-btn btn-warning" onclick="openMeiModal('${opt.id}')">✏️</button>
                    <button class="action-btn btn-danger" onclick="deleteMeiOption('${opt.id}')">🗑️</button>
                </td>
            </tr>
        `;
    });
}

function openMeiModal(id = null) {
    document.getElementById('form-mei').reset();
    if(id) {
        const opt = appData.meiOptions.find(o => o.id === id);
        if(opt) {
            document.getElementById('mei-id').value = opt.id;
            document.getElementById('mei-year').value = opt.year;
            document.getElementById('mei-salary').value = opt.salary;
            document.getElementById('mei-inss-rate').value = opt.inssRate;
            document.getElementById('mei-icms').value = opt.icms;
            document.getElementById('mei-iss').value = opt.iss;
        }
    } else {
        document.getElementById('mei-id').value = '';
        document.getElementById('mei-year').value = new Date().getFullYear();
    }
    document.getElementById('modal-mei').classList.remove('hidden');
}

function saveMeiOption(e) {
    e.preventDefault();
    const id = document.getElementById('mei-id').value;
    
    const option = {
        id: id || 'mei_' + Date.now(),
        year: parseInt(document.getElementById('mei-year').value),
        salary: parseFloat(document.getElementById('mei-salary').value),
        inssRate: parseFloat(document.getElementById('mei-inss-rate').value),
        icms: parseFloat(document.getElementById('mei-icms').value),
        iss: parseFloat(document.getElementById('mei-iss').value)
    };

    const idx = id ? appData.meiOptions.findIndex(o => o.id === id) : -1;
    if(idx >= 0) appData.meiOptions[idx] = option; else appData.meiOptions.push(option);
    
    saveData();
    closeModal('modal-mei');
    renderMeiOptions();
}

function deleteMeiOption(id) {
    if(confirm('Excluir este parâmetro MEI?')) {
        appData.meiOptions = appData.meiOptions.filter(o => o.id !== id);
        saveData();
        renderMeiOptions();
    }
}

// --- BACKUP & RESTORE FIX (Função Corrigida com Blob) ---
function downloadBackup() {
    try {
        // Formata o JSON para ficar legível
        const dataStr = JSON.stringify(appData, null, 2);
        
        // Cria um Blob em vez de usar data URI para evitar limites
        const blob = new Blob([dataStr], { type: "application/json" });
        const url = URL.createObjectURL(blob);

        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", url);
        downloadAnchorNode.setAttribute("download", "backup_mei_" + new Date().toISOString().split('T')[0] + ".json");
        
        document.body.appendChild(downloadAnchorNode); // Required for firefox
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
        
        // Libera a memória
        URL.revokeObjectURL(url);
    } catch (e) {
        console.error("Erro ao gerar backup:", e);
        alert("Não foi possível gerar o arquivo de backup. Verifique o console.");
    }
}

function restoreBackup(input) {
    const file = input.files[0];
    if(!file) return;
    
    const reader = new FileReader();
    reader.onload = async function(e) {
        try {
            const json = JSON.parse(e.target.result);
            if(json && json.users) {
                appData = json;
                await DataManager.save(appData);
                alert("Backup restaurado com sucesso! A página será recarregada.");
                location.reload();
            } else {
                alert("Arquivo de backup inválido.");
            }
        } catch(err) {
            console.error(err);
            alert("Erro ao ler arquivo de backup.");
        }
    };
    reader.readAsText(file);
}

function clearLocalData() {
    if (confirm('ATENÇÃO: Isso apagará todos os dados DESTE DISPOSITIVO.\n\nSe você não tiver backup ou sincronização na nuvem, os dados serão perdidos para sempre.\n\nDeseja continuar?')) {
        try {
            localStorage.removeItem(DB_KEY);
            sessionStorage.clear();
            const req = indexedDB.deleteDatabase(DataManager.dbName);
            req.onsuccess = function () { alert('Dados locais apagados com sucesso.'); location.reload(); };
            req.onerror = function () { alert('Erro ao apagar banco de dados. Tente limpar o cache do navegador.'); location.reload(); };
            req.onblocked = function () { alert('Operação bloqueada. Feche outras abas do sistema e tente novamente.'); };
        } catch (e) {
            console.error(e);
            alert('Erro ao limpar dados: ' + e.message);
        }
    }
}

// --- ADMIN FUNCTIONS ---
function adminPopulateData() {
    if(!confirm('Isso irá gerar dados aleatórios (Dados da Empresa, Clientes, Transações, Produtos, Serviços, Fornecedores, Agenda). Continuar?')) return;
    const userData = getUserData();
    
    // 1. Dados da Empresa (Novo)
    appData.currentUser.company = {
        name: "Empresa Teste Ltda",
        cnpj: "00.000.000/0001-99",
        address: "Av. Paulista, 1000, São Paulo - SP",
        phone: "(11) 99999-0000",
        whatsapp: "(11) 99999-0000",
        role: "both",
        reserve_rate: 15,
        prolabore_target: 5000,
        url_fiscal: DEFAULT_URL_FISCAL,
        url_das: DEFAULT_URL_DAS
    };
    // Atualizar no cadastro de fornecedores como "Minha Empresa"
    const supplierId = 'sup_own_' + appData.currentUser.id;
    const existingSupIndex = userData.suppliers.findIndex(s => s.id === supplierId);
    const companySup = {
        id: supplierId,
        name: "Empresa Teste Ltda (Minha Empresa)",
        cnpj_cpf: "00.000.000/0001-99",
        phone: "(11) 99999-0000",
        address: "Av. Paulista, 1000, São Paulo - SP",
        email: appData.currentUser.email,
        contact_person: appData.currentUser.name,
        is_own_company: true
    };
    if(existingSupIndex >= 0) userData.suppliers[existingSupIndex] = companySup; else userData.suppliers.push(companySup);

    const names = ["Silva Ltda", "João Mercado", "Tech Soluções", "Ana Doces", "Pedro Pinturas"];
    const catsRec = ["Venda", "Serviço"];
    const catsDesp = ["Compra", "Luz", "Internet"];
    for(let i=0; i<10; i++) {
        userData.clients.push({ id: 'c_test_' + Date.now() + i, name: names[i%names.length] + " " + i, phone: `(11) 9${Math.floor(Math.random()*90000000)}`, address: `Rua Teste ${i}`, cnpj_cpf: '000.000.000-00', contact_person: 'Gerente ' + i, email: `cliente${i}@teste.com`, is_test_data: true });
    }
    for(let i=0; i<30; i++) {
        const type = Math.random() > 0.4 ? 'receita' : 'despesa';
        const val = (Math.random() * 500) + 50;
        const date = new Date();
        date.setDate(date.getDate() - Math.floor(Math.random() * 60)); 
        userData.transactions.push({ id: 't_test_' + Date.now() + i, type: type, category: type === 'receita' ? catsRec[i%2] : catsDesp[i%3], value: parseFloat(val.toFixed(2)), date: date.toISOString().split('T')[0], obs: 'Gerado automaticamente', entity: 'Cliente Teste Auto', is_test_data: true });
    }
    const prodNames = ["Teclado Mecânico", "Monitor 24pol", "Mouse Sem Fio", "Cadeira Ergonômica", "Headset USB"];
    for(let i=0; i<5; i++) { userData.products.push({ id: 'p_test_' + Date.now() + i, name: prodNames[i], price: (Math.random() * 200 + 50).toFixed(2), description: 'Produto de teste gerado automaticamente', is_test_data: true }); }
    const servNames = ["Formatação PC", "Consultoria TI", "Instalação Rede", "Design Logo", "Manutenção Site"];
    for(let i=0; i<5; i++) { userData.services.push({ id: 's_test_' + Date.now() + i, name: servNames[i], price: (Math.random() * 500 + 100).toFixed(2), description: 'Serviço de teste gerado automaticamente', is_test_data: true }); }
    const supNames = ["Distribuidora Tech", "Papelaria Central", "Energia Local", "Net Provider", "Atacado Geral"];
    for(let i=0; i<5; i++) { userData.suppliers.push({ id: 'sup_test_' + Date.now() + i, name: supNames[i], phone: `(11) 9${Math.floor(Math.random()*90000000)}`, address: `Av. Industrial, ${i*100}`, cnpj_cpf: '00.000.000/0001-00', contact_person: 'Representante ' + i, email: `contato@${supNames[i].replace(/\s/g, '').toLowerCase()}.com`, is_test_data: true }); }
    const apptTitles = ["Reunião Inicial", "Manutenção Mensal", "Consultoria Rápida", "Entrega de Projeto", "Orçamento Presencial"];
    const statuses = ["agendado", "concluido", "cancelado"];
    for(let i=0; i<10; i++) {
        const date = new Date(); date.setDate(date.getDate() + Math.floor(Math.random() * 30) - 10); 
        const hour = Math.floor(Math.random() * 9) + 9; 
        userData.appointments.push({ id: 'appt_test_' + Date.now() + i, title: apptTitles[i % apptTitles.length], date: date.toISOString().split('T')[0], time: `${hour}:00`, client_name: `Cliente Teste ${i}`, client_phone: `(11) 99999-${1000+i}`, service_desc: 'Agendamento gerado automaticamente para testes', value: (Math.random() * 300 + 50).toFixed(2), status: statuses[Math.floor(Math.random() * statuses.length)], pay_method: 'pix', pay_status: Math.random() > 0.5 ? 'pago' : 'pendente', obs: 'Registro de teste', is_test_data: true });
    }
    saveData(); alert('Dados de teste (incluindo empresa) gerados com sucesso!');
}

function adminClearData() {
    if(!confirm('Tem certeza? Isso apagará TODOS os dados marcados como teste.')) return;
    const d = getUserData();
    d.clients = d.clients.filter(x => !x.is_test_data);
    d.transactions = d.transactions.filter(x => !x.is_test_data);
    d.products = d.products.filter(x => !x.is_test_data);
    d.services = d.services.filter(x => !x.is_test_data);
    d.suppliers = d.suppliers.filter(x => !x.is_test_data);
    d.appointments = d.appointments.filter(x => !x.is_test_data);
    if(d.transactions.length > 100) { if(confirm('Muitos dados encontrados. Deseja resetar para o padrão inicial?')) { appData.records[appData.currentUser.id] = createSeedData(); } }
    saveData(); alert('Limpeza concluída.'); location.reload();
}

function runQualityCheck() {
    let log = []; const d = getUserData();
    const ids = new Set();
    d.transactions.forEach(t => { if(ids.has(t.id)) log.push(`ERRO: ID Duplicado ${t.id}`); ids.add(t.id); if(isNaN(t.value)) log.push(`ERRO: Valor inválido ${t.id}`); });
    d.appointments.forEach(a => { if(!a.title) log.push(`AVISO: Agenda sem título ${a.id}`); });
    alert(log.length === 0 ? "✅ Nenhuma inconsistência encontrada." : "⚠️ Relatório:\n\n" + log.join("\n"));
}

// --- FINANCEIRO (Correção Novo Lançamento) ---
function renderTransactions() {
    if (!getUserData().transactions) getUserData().transactions = [];
    
    const tbody = document.querySelector('#finance-table tbody');
    tbody.innerHTML = '';

    let list = getUserData().transactions;

    // Apply Type Filter
    if (currentFinanceFilter !== 'all') {
        list = list.filter(t => t.type === currentFinanceFilter);
    }

    // Apply Date Filter
    if (financeDateFilterActive) {
        const start = document.getElementById('finance-start-date').value;
        const end = document.getElementById('finance-end-date').value;
        if (start && end) {
            list = list.filter(t => t.date >= start && t.date <= end);
        }
    }

    // Sort Descending Date
    list.sort((a, b) => new Date(b.date) - new Date(a.date));

    if (list.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center p-4">Nenhum lançamento encontrado.</td></tr>';
        return;
    }

    list.forEach(t => {
        const color = t.type === 'receita' ? 'text-success' : 'text-danger';
        const typeLabel = t.type === 'receita' ? 'Entrada' : 'Saída';
        tbody.innerHTML += `
            <tr>
                <td>${t.date.split('-').reverse().join('/')}</td>
                <td><span class="${color} font-bold">${typeLabel}</span></td>
                <td>${t.category}</td>
                <td>${t.obs || '-'}</td>
                <td class="${color}">R$ ${parseFloat(t.value).toFixed(2)}</td>
                <td>
                    <button class="action-btn btn-warning" onclick="editTransaction('${t.id}')">✏️</button>
                    <button class="action-btn btn-danger" onclick="deleteTransaction('${t.id}')">🗑️</button>
                </td>
            </tr>
        `;
    });
}

function applyFinanceDateFilter() {
    financeDateFilterActive = true;
    renderTransactions();
}

function clearFinanceDateFilter() {
    financeDateFilterActive = false;
    renderTransactions();
}

function filterFinance(type) {
    currentFinanceFilter = type;
    document.querySelectorAll('.fin-filter-btn').forEach(btn => {
        const btnText = btn.innerText.trim();
        const targetText = type === 'all' ? 'Todos' : (type === 'receita' ? 'Entradas' : 'Saídas');
        if (btnText === targetText) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    renderTransactions();
}

function openTransactionModal(trans = null) {
    document.getElementById('form-transaction').reset();
    
    // Set Date to Today if new
    if (!trans) {
        document.getElementById('trans-date').valueAsDate = new Date();
        document.getElementById('trans-id').value = '';
        document.getElementById('trans-type').value = 'receita'; // Default
    } else {
        document.getElementById('trans-id').value = trans.id;
        document.getElementById('trans-type').value = trans.type;
        document.getElementById('trans-date').value = trans.date;
        document.getElementById('trans-value').value = trans.value;
        document.getElementById('trans-obs').value = trans.obs || '';
    }

    updateTransactionDependencies(trans ? trans.category : null, trans ? trans.entity : null);
    
    document.getElementById('modal-transaction').classList.remove('hidden');
}

function editTransaction(id) {
    const t = getUserData().transactions.find(x => x.id === id);
    if (t) openTransactionModal(t);
}

function updateTransactionDependencies(selectedCat = null, selectedEntity = null) {
    const type = document.getElementById('trans-type').value;
    const catSelect = document.getElementById('trans-category');
    const entitySelect = document.getElementById('trans-entity');
    const entityLabel = document.querySelector("label[for='trans-entity']") || entitySelect.previousElementSibling;

    // Update Categories
    catSelect.innerHTML = '';
    const cats = type === 'receita' 
        ? ['Venda de Produtos', 'Prestação de Serviços', 'Outros'] 
        : ['Compras (Estoque)', 'Despesas Operacionais', 'Impostos/DAS', 'Pró-labore', 'Marketing', 'Outros'];
    
    cats.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c;
        opt.innerText = c;
        if (selectedCat && selectedCat === c) opt.selected = true;
        catSelect.appendChild(opt);
    });

    // Update Entities (Clients or Suppliers)
    entitySelect.innerHTML = '<option value="">Selecione...</option>';
    let list = [];
    if (type === 'receita') {
        if(entityLabel) entityLabel.innerText = "Cliente";
        list = getUserData().clients || [];
    } else {
        if(entityLabel) entityLabel.innerText = "Fornecedor";
        list = getUserData().suppliers || [];
    }

    list.forEach(item => {
        const opt = document.createElement('option');
        opt.value = item.name; 
        opt.innerText = item.name;
        if (selectedEntity && selectedEntity === item.name) opt.selected = true;
        entitySelect.appendChild(opt);
    });
}

function saveTransaction(e) {
    e.preventDefault();
    const id = document.getElementById('trans-id').value;
    const type = document.getElementById('trans-type').value;
    
    const trans = {
        id: id || 't_' + Date.now(),
        type: type,
        category: document.getElementById('trans-category').value,
        value: parseFloat(document.getElementById('trans-value').value),
        date: document.getElementById('trans-date').value,
        entity: document.getElementById('trans-entity').value,
        obs: document.getElementById('trans-obs').value
    };

    const list = getUserData().transactions;
    if (id) {
        const idx = list.findIndex(x => x.id === id);
        if (idx !== -1) list[idx] = trans;
    } else {
        list.push(trans);
    }

    saveData();
    closeModal('modal-transaction');
    renderTransactions();
}

function deleteTransaction(id) {
    if (confirm('Tem certeza que deseja excluir este lançamento?')) {
        const list = getUserData().transactions;
        const idx = list.findIndex(x => x.id === id);
        if (idx !== -1) {
            list.splice(idx, 1);
            saveData();
            renderTransactions();
        }
    }
}

// --- DASHBOARD ---
function updateDashboard() {
    const t = getUserData().transactions; const m = new Date().getMonth(); const y = new Date().getFullYear();
    const rr = appData.currentUser.company.reserve_rate || 10; const pt = appData.currentUser.company.prolabore_target || 4000;
    let i=0, e=0, tr=0, tp=0;
    t.forEach(x => {
        const d = new Date(x.date);
        if (x.type === 'receita') {
            if (d.getMonth() === m && d.getFullYear() === y) { i += x.value; const r = x.value * (rr/100); tr += r; const rem = x.value - r; const n = pt - tp; if (n > 0) tp += (rem >= n) ? n : rem; }
        } else { if (d.getMonth() === m && d.getFullYear() === y) e += x.value; }
    });
    document.getElementById('dash-income').innerText = `R$ ${i.toFixed(2)}`; document.getElementById('dash-expense').innerText = `R$ ${e.toFixed(2)}`;
    document.getElementById('dash-balance').innerText = `R$ ${(i-e).toFixed(2)}`; document.getElementById('reserve-percent-display').innerText = rr;
    document.getElementById('dash-reserve').innerText = `R$ ${tr.toFixed(2)}`; document.getElementById('dash-prolabore').innerText = `R$ ${tp.toFixed(2)}`;
    document.getElementById('dash-prolabore-target').innerText = `Meta: R$ ${pt.toFixed(2)}`;
}

// --- AGENDA ---
function renderAgenda(filter = '') {
    if(!getUserData().appointments) getUserData().appointments = [];
    let list = getUserData().appointments.sort((a,b) => new Date(a.date+'T'+a.time) - new Date(b.date+'T'+b.time));

    // 1. Filtro de Data (Lógica Existente)
    if (filter === 'today') {
        list = list.filter(a => a.date === new Date().toISOString().split('T')[0]);
    } else if (filter === 'all') {
        // Mostra todas as datas
    } else if (!filter) {
        const d = document.getElementById('agenda-filter-date').value;
        if(d) list = list.filter(a => a.date === d);
    }

    // 2. Filtro de Status (Nova Lógica)
    const statusFilter = document.getElementById('agenda-filter-status');
    if (statusFilter && statusFilter.value) {
        list = list.filter(a => a.status === statusFilter.value);
    }

    const c = document.getElementById('agenda-list'); c.innerHTML = '';
    if (list.length === 0) { c.innerHTML = '<p class="text-center p-4" style="grid-column: 1/-1;">Nenhum agendamento.</p>'; return; }
    const sm = { 'agendado': { l:'Agendado', c:'bg-scheduled', k:'status-agendado'}, 'concluido': { l:'Concluído', c:'bg-done', k:'status-concluido'}, 'cancelado': { l:'Cancelado', c:'bg-canceled', k:'status-cancelado'} };
    list.forEach(a => {
        const s = sm[a.status] || sm['agendado'];
        c.innerHTML += `<div class="stat-card agenda-card ${s.k}"><div class="flex justify-between items-start mb-2"><span class="badge ${s.c}">${s.l}</span><div class="text-sm font-bold text-light">${a.date.split('-').reverse().join('/')} - ${a.time}</div></div><h3 class="mb-1">${a.title}</h3><p class="text-sm mb-1"><strong>Cliente:</strong> ${a.client_name}</p><div class="flex justify-between items-center mt-2 border-t pt-2"><div class="text-sm"><span class="${a.pay_status==='pago'?'text-success':'text-warning'}">${a.pay_status==='pago'?'💲 Pago':'⏳ Pendente'}</span> - R$ ${parseFloat(a.value).toFixed(2)}</div><div><button class="action-btn btn-warning" onclick="editAppointment('${a.id}')">✏️</button><button class="action-btn btn-danger" onclick="deleteAppointment('${a.id}')">🗑️</button></div></div></div>`;
    });
}
function openAppointmentModal(appt = null) {
    document.getElementById('form-appointment').reset();
    const s = document.getElementById('appt-client-select'); s.innerHTML = '<option value="">Selecionar Cliente...</option>';
    getUserData().clients.forEach(c => s.innerHTML += `<option value="${c.id}">${c.name}</option>`);
    if (appt) {
        document.getElementById('appt-id').value=appt.id; document.getElementById('appt-title').value=appt.title; document.getElementById('appt-date').value=appt.date;
        document.getElementById('appt-time').value=appt.time; document.getElementById('appt-client-name').value=appt.client_name; document.getElementById('appt-client-phone').value=appt.client_phone;
        document.getElementById('appt-desc').value=appt.service_desc; document.getElementById('appt-value').value=appt.value; document.getElementById('appt-status').value=appt.status;
        document.getElementById('appt-pay-method').value=appt.pay_method; document.getElementById('appt-pay-status').value=appt.pay_status; document.getElementById('appt-obs').value=appt.obs;
    } else { document.getElementById('appt-id').value=''; document.getElementById('appt-date').valueAsDate=new Date(); document.getElementById('appt-status').value='agendado'; }
    document.getElementById('modal-appointment').classList.remove('hidden');
}
function fillAppointmentClient() { const c = getUserData().clients.find(x => x.id === document.getElementById('appt-client-select').value); if(c) { document.getElementById('appt-client-name').value=c.name; document.getElementById('appt-client-phone').value=c.phone||''; } }
function saveAppointment(e) {
    e.preventDefault(); 
    const id = document.getElementById('appt-id').value;
    
    // 1. Detect Previous Status (for Integration Check)
    let previousPayStatus = 'pendente';
    const l = getUserData().appointments;
    if(id) {
        const existing = l.find(x => x.id === id);
        if(existing) previousPayStatus = existing.pay_status;
    }

    // 2. Construct Data Object
    const d = { 
        id: id||'appt_'+Date.now(), 
        title:e.target.elements['appt-title'].value, 
        date:e.target.elements['appt-date'].value, 
        time:e.target.elements['appt-time'].value, 
        client_name:document.getElementById('appt-client-name').value, 
        client_phone:document.getElementById('appt-client-phone').value, 
        service_desc:document.getElementById('appt-desc').value, 
        value:document.getElementById('appt-value').value||0, 
        status:document.getElementById('appt-status').value, 
        pay_method:document.getElementById('appt-pay-method').value, 
        pay_status:document.getElementById('appt-pay-status').value, 
        obs:document.getElementById('appt-obs').value 
    };

    // 3. Save to List
    if(id) { 
        const i=l.findIndex(x=>x.id===id); 
        if(i!==-1)l[i]=d; 
    } else { 
        l.push(d); 
    }

    // 4. Integration Logic: Agenda -> Financeiro
    if(d.pay_status === 'pago' && previousPayStatus !== 'pago') {
        if(confirm("Pagamento registrado. Deseja gerar o lançamento no Financeiro agora?")) {
            const trans = {
                id: 't_auto_' + Date.now(),
                type: 'receita',
                category: 'Prestação de Serviços',
                value: parseFloat(d.value),
                date: d.date,
                entity: d.client_name,
                obs: 'Gerado via Agenda: ' + d.title
            };
            if(!getUserData().transactions) getUserData().transactions = [];
            getUserData().transactions.push(trans);
        }
    }

    saveData(); 
    closeModal('modal-appointment'); 
    renderAgenda();
}
function editAppointment(id) { const a = getUserData().appointments.find(x => x.id === id); if(a) openAppointmentModal(a); }
function deleteAppointment(id) { if(confirm('Excluir?')) { const l = getUserData().appointments; l.splice(l.findIndex(x=>x.id===id),1); saveData(); renderAgenda(); } }

// --- RPA ---
function loadRPAOptions() {
    const c = appData.currentUser.company||{}; 
    
    // Pre-fill Contractor (Company)
    document.getElementById('rpa-comp-name').value=c.name||''; 
    document.getElementById('rpa-comp-cnpj').value=c.cnpj||''; 
    document.getElementById('rpa-comp-addr').value=c.address||'';
    
    // Pre-fill Provider (Autônomo - Responsible)
    if(!document.getElementById('rpa-prov-name').value) document.getElementById('rpa-prov-name').value=appData.currentUser.name;
    // Added suggestions for Phone and Address based on Company Data
    if(!document.getElementById('rpa-prov-phone').value) document.getElementById('rpa-prov-phone').value=c.phone||'';
    if(!document.getElementById('rpa-prov-addr').value) document.getElementById('rpa-prov-addr').value=c.address||'';
    
    const s = document.getElementById('rpa-provider-select'); s.innerHTML='<option value="">Selecione...</option>';
    getUserData().suppliers.forEach(i => s.innerHTML+=`<option value="${i.id}">${i.name}</option>`);
    document.getElementById('rpa-date').valueAsDate=new Date(); document.getElementById('rpa-id').value='';
}
function fillRPAProvider() { const s = getUserData().suppliers.find(x => x.id === document.getElementById('rpa-provider-select').value); if(s) { document.getElementById('rpa-prov-name').value=s.name; document.getElementById('rpa-prov-cpf').value=s.cnpj_cpf||''; document.getElementById('rpa-prov-phone').value=s.phone||''; document.getElementById('rpa-prov-addr').value=s.address||''; } }
function calculateRPA() {
    const v = parseFloat(document.getElementById('rpa-value').value)||0; const issP = parseFloat(document.getElementById('rpa-iss-rate').value)||0;
    const inss = v*0.11; document.getElementById('rpa-inss').value=`R$ ${inss.toFixed(2)}`;
    const iss = v*(issP/100); document.getElementById('rpa-iss-val').value=`R$ ${iss.toFixed(2)}`;
    const base = v-inss; let irrf=0; for(let r of appData.irrfTable.sort((a,b)=>a.max-b.max)) { if(base<=r.max) { irrf=(base*(r.rate/100))-r.deduction; break; } }
    if(irrf<0) irrf=0; document.getElementById('rpa-irrf').value=`R$ ${irrf.toFixed(2)}`;
    document.getElementById('rpa-net').value=`R$ ${(v-inss-iss-irrf).toFixed(2)}`;
}
function saveRPA() {
    const id = document.getElementById('rpa-id').value;
    const r = { id:id||'rpa_'+Date.now(), date:document.getElementById('rpa-date').value, provider:document.getElementById('rpa-prov-name').value, desc:document.getElementById('rpa-desc').value, value:document.getElementById('rpa-value').value, net:document.getElementById('rpa-net').value, fullData: { provName:document.getElementById('rpa-prov-name').value, provCpf:document.getElementById('rpa-prov-cpf').value, provPhone:document.getElementById('rpa-prov-phone').value, provAddr:document.getElementById('rpa-prov-addr').value, inss:document.getElementById('rpa-inss').value, iss:document.getElementById('rpa-iss-val').value, irrf:document.getElementById('rpa-irrf').value } };
    const l = getUserData().rpas; if(id) { const i=l.findIndex(x=>x.id===id); if(i!==-1)l[i]=r; else l.push(r); } else l.push(r);
    saveData(); alert('RPA Salvo!'); toggleRPAHistory();
}
function toggleRPAHistory() {
    const c = document.getElementById('rpa-history-container'); c.classList.toggle('hidden');
    if(!c.classList.contains('hidden')) { const b = document.querySelector('#rpa-history-table tbody'); b.innerHTML=''; getUserData().rpas.sort((a,b)=>new Date(b.date)-new Date(a.date)).forEach(r=>{ b.innerHTML+=`<tr><td>${r.date}</td><td>${r.provider}</td><td>${r.net}</td><td><button class="action-btn btn-warning" onclick="loadRPA('${r.id}')">✏️</button><button class="action-btn btn-danger" onclick="deleteRPA('${r.id}')">🗑️</button></td></tr>`; }); }
}
function loadRPA(id) {
    const r = getUserData().rpas.find(x => x.id === id);
    if(r) { document.getElementById('rpa-id').value=r.id; document.getElementById('rpa-date').value=r.date; document.getElementById('rpa-desc').value=r.desc; document.getElementById('rpa-value').value=r.value; document.getElementById('rpa-prov-name').value=r.fullData.provName; document.getElementById('rpa-prov-cpf').value=r.fullData.provCpf; document.getElementById('rpa-prov-phone').value=r.fullData.provPhone; document.getElementById('rpa-prov-addr').value=r.fullData.provAddr; calculateRPA(); alert('RPA Carregado.'); }
}
function deleteRPA(id) { if(confirm('Excluir?')) { const l = getUserData().rpas; l.splice(l.findIndex(x=>x.id===id),1); saveData(); toggleRPAHistory(); } }

// --- EXPORTAÇÃO DOCX REAL (Melhorada V13.0 - Layout Profissional) ---
function exportRPADocxReal() {
    if (typeof docx === 'undefined') { alert("Erro: Biblioteca docx não carregada."); return; }
    
    const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, BorderStyle, AlignmentType, ShadingType } = docx;

    // Coleta Dados
    const compName = document.getElementById('rpa-comp-name').value || "";
    const compCnpj = document.getElementById('rpa-comp-cnpj').value || "";
    const compAddr = document.getElementById('rpa-comp-addr').value || "";
    
    const provName = document.getElementById('rpa-prov-name').value || "";
    const provCpf = document.getElementById('rpa-prov-cpf').value || "";
    const provPhone = document.getElementById('rpa-prov-phone').value || "";
    const provAddr = document.getElementById('rpa-prov-addr').value || "";
    
    const desc = document.getElementById('rpa-desc').value || "Serviços prestados";
    const dateRaw = document.getElementById('rpa-date').value;
    const dateFormatted = dateRaw ? dateRaw.split('-').reverse().join('/') : new Date().toLocaleDateString('pt-BR');
    
    const valBruto = document.getElementById('rpa-value').value || "0.00";
    const valInss = document.getElementById('rpa-inss').value || "R$ 0,00";
    const valIss = document.getElementById('rpa-iss-val').value || "R$ 0,00";
    const valIrrf = document.getElementById('rpa-irrf').value || "R$ 0,00";
    const valNet = document.getElementById('rpa-net').value || "R$ 0,00";
    const valBrutoFmt = parseFloat(valBruto).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    // Estilos Utilitários
    const cellPadding = { top: 100, bottom: 100, left: 100, right: 100 };
    const headerShading = { fill: "E0E0E0", type: ShadingType.CLEAR, color: "auto" };
    const fontStd = "Arial";
    const sizeStd = 22; // 11pt
    const sizeSmall = 18; // 9pt
    const borderStd = { style: BorderStyle.SINGLE, size: 2, color: "000000" };
    const noBorder = { style: BorderStyle.NIL };

    // Função para criar células de cabeçalho de seção
    const createHeaderCell = (text) => {
        return new TableCell({
            children: [new Paragraph({ 
                children: [new TextRun({ text: text, bold: true, font: fontStd, size: sizeStd })], 
                alignment: AlignmentType.CENTER 
            })],
            shading: headerShading,
            columnSpan: 2,
            margins: cellPadding
        });
    };

    // Função para criar linha de dados (Rótulo: Valor)
    const createDataRow = (label, value) => {
        return new TableRow({
            children: [
                new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: label, bold: true, font: fontStd, size: sizeStd })] })],
                    width: { size: 30, type: WidthType.PERCENTAGE },
                    margins: cellPadding
                }),
                new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: value, font: fontStd, size: sizeStd })] })],
                    width: { size: 70, type: WidthType.PERCENTAGE },
                    margins: cellPadding
                })
            ]
        });
    };

    // Função para linha financeira (Descrição | Valor alinhado à direita)
    const createFinanceRow = (label, value, isBold = false) => {
        return new TableRow({
            children: [
                new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: label, bold: isBold, font: fontStd, size: sizeStd })] })],
                    margins: cellPadding
                }),
                new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: value, bold: isBold, font: fontStd, size: sizeStd })], alignment: AlignmentType.RIGHT })],
                    margins: cellPadding
                })
            ]
        });
    };

    const doc = new Document({
        sections: [{
            properties: {},
            children: [
                // Tabela Principal que engloba o Recibo
                new Table({
                    width: { size: 100, type: WidthType.PERCENTAGE },
                    rows: [
                        // Título
                        new TableRow({
                            children: [new TableCell({
                                children: [
                                    new Paragraph({ children: [new TextRun({ text: "RECIBO DE PAGAMENTO A AUTÔNOMO (RPA)", bold: true, size: 28, font: fontStd })], alignment: AlignmentType.CENTER }),
                                    new Paragraph({ children: [new TextRun({ text: "Documento Auxiliar de Pagamento", size: 16, font: fontStd })], alignment: AlignmentType.CENTER })
                                ],
                                columnSpan: 2,
                                margins: { top: 200, bottom: 200 },
                                borders: { bottom: borderStd }
                            })]
                        }),

                        // Seção 1: Fonte Pagadora
                        new TableRow({ children: [createHeaderCell("1. DADOS DA FONTE PAGADORA (EMPRESA)")] }),
                        createDataRow("Razão Social:", compName),
                        createDataRow("CNPJ:", compCnpj),
                        createDataRow("Endereço:", compAddr),

                        // Seção 2: Prestador
                        new TableRow({ children: [createHeaderCell("2. DADOS DO PRESTADOR DE SERVIÇO (AUTÔNOMO)")] }),
                        createDataRow("Nome Completo:", provName),
                        createDataRow("CPF / Documento:", provCpf),
                        createDataRow("Telefone / Contato:", provPhone),
                        createDataRow("Endereço:", provAddr),

                        // Seção 3: Detalhes do Serviço
                        new TableRow({ children: [createHeaderCell("3. DADOS DO SERVIÇO")] }),
                        createDataRow("Descrição:", desc),
                        createDataRow("Data do Pagamento:", dateFormatted),

                        // Seção 4: Valores
                        new TableRow({ children: [createHeaderCell("4. DETALHAMENTO DE VALORES E IMPOSTOS")] }),
                        new TableRow({
                            children: [
                                new TableCell({
                                    children: [
                                        new Table({
                                            width: { size: 100, type: WidthType.PERCENTAGE },
                                            borders: { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder, insideHorizontal: { style: BorderStyle.DOTTED, size: 1, color: "CCCCCC" } },
                                            rows: [
                                                createFinanceRow("Valor Bruto do Serviço", valBrutoFmt, true),
                                                createFinanceRow("(-) Desconto INSS (11%)", valInss.replace('R$ ', 'R$ -')),
                                                createFinanceRow("(-) Desconto ISS", valIss.replace('R$ ', 'R$ -')),
                                                createFinanceRow("(-) Desconto IRRF", valIrrf.replace('R$ ', 'R$ -')),
                                                createFinanceRow("(=) VALOR LÍQUIDO A RECEBER", valNet, true)
                                            ]
                                        })
                                    ],
                                    columnSpan: 2,
                                    margins: { top: 100, bottom: 100, left: 200, right: 200 }
                                })
                            ]
                        }),

                        // Seção 5: Declaração
                        new TableRow({ children: [createHeaderCell("5. DECLARAÇÃO E ASSINATURAS")] }),
                        new TableRow({
                            children: [new TableCell({
                                children: [
                                    new Paragraph({
                                        children: [new TextRun({ text: `Declaro ter recebido de ${compName} a importância líquida de ${valNet}, referente aos serviços acima discriminados, dando plena e geral quitação.`, font: fontStd, size: sizeStd })],
                                        alignment: AlignmentType.JUSTIFIED,
                                        spacing: { after: 400 }
                                    }),
                                    // Assinaturas
                                    new Table({
                                        width: { size: 100, type: WidthType.PERCENTAGE },
                                        borders: { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder, insideVertical: noBorder, insideHorizontal: noBorder },
                                        rows: [
                                            new TableRow({
                                                children: [
                                                    new TableCell({ children: [new Paragraph({ text: "____________________________________", alignment: AlignmentType.CENTER }), new Paragraph({ text: "Assinatura do Prestador", alignment: AlignmentType.CENTER, size: sizeSmall })], width: { size: 50, type: WidthType.PERCENTAGE } }),
                                                    new TableCell({ children: [new Paragraph({ text: "____________________________________", alignment: AlignmentType.CENTER }), new Paragraph({ text: "Assinatura da Fonte Pagadora", alignment: AlignmentType.CENTER, size: sizeSmall })], width: { size: 50, type: WidthType.PERCENTAGE } })
                                                ]
                                            })
                                        ]
                                    }),
                                    new Paragraph({ text: "", spacing: { after: 200 } }),
                                    new Paragraph({ text: `Local e Data: __________________________, ${dateFormatted}`, alignment: AlignmentType.CENTER, font: fontStd, size: sizeSmall })
                                ],
                                columnSpan: 2,
                                margins: { top: 200, bottom: 200, left: 200, right: 200 }
                            })]
                        })
                    ]
                })
            ]
        }]
    });

    Packer.toBlob(doc).then(blob => { saveAs(blob, `RPA_${provName.split(' ')[0]}_${dateRaw}.docx`); });
}

function exportReportPDFHighQuality() {
    document.getElementById('report-company-header').innerText = appData.currentUser.company.name || "Minha Empresa";
    document.getElementById('report-title').classList.remove('hidden');
    html2pdf().set({ margin: 10, filename: 'Relatorio.pdf', image: { type: 'jpeg', quality: 0.98 }, html2canvas: { scale: 2 }, jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' } }).from(document.getElementById('report-print-area')).save().then(() => document.getElementById('report-title').classList.add('hidden'));
}
function exportReportDocxReal() {
    const h = `<h2>${appData.currentUser.company.name||"Minha Empresa"}</h2>`; const t = document.getElementById('listing-table').outerHTML;
    saveAs(new Blob([`<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word'><head><meta charset='utf-8'><title>Relatório</title></head><body>${h}<h3>Relatório do Sistema</h3>${t}</body></html>`], { type: 'application/msword' }), "Relatorio.doc");
}
function exportRPAPdfHighQuality() {
    html2pdf().set({ margin: 10, filename: 'RPA_Recibo.pdf', image: { type: 'jpeg', quality: 0.98 }, html2canvas: { scale: 2 }, jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' } }).from(document.getElementById('rpa-content')).save();
}

function renderCrud(type) { 
    currentCrudType = type; document.getElementById('crud-title').innerText = type.toUpperCase(); 
    document.querySelectorAll('.crud-btn').forEach(btn => btn.classList.toggle('active', btn.getAttribute('onclick').includes(`'${type}'`)));
    const l = getUserData()[type]; const t = document.getElementById('crud-table'); 
    let h = type.match(/products|services/) ? '<th>Nome</th><th>Desc</th><th>Preço</th>' : '<th>Nome</th><th>Contato</th><th>Info</th>'; 
    t.innerHTML = `<thead><tr>${h}<th>Ações</th></tr></thead><tbody>` + l.map(i => `<tr><td>${i.name}</td><td>${i.description || i.contact_person || '-'}</td><td>${i.price ? 'R$ '+i.price : i.phone}</td><td><button class="action-btn btn-warning" onclick="editCrudItem('${i.id}')">✏️</button> <button class="action-btn btn-danger" onclick="deleteCrudItem('${type}','${i.id}')">🗑️</button></td></tr>`).join('') + `</tbody>`; 
}
function openCrudModal(isEdit = false, itemData = null) { 
    document.getElementById('modal-crud').classList.remove('hidden'); document.getElementById('crud-id').value = itemData ? itemData.id : ''; const f = document.getElementById('crud-fields'); 
    if(currentCrudType.match(/products|services/)) { f.innerHTML = `<label>Nome</label><input name="name" value="${itemData?.name||''}" required><label>Preço</label><input type="number" step="0.01" name="price" value="${itemData?.price||''}" required><label>Descrição</label><textarea name="description" rows="3">${itemData?.description||''}</textarea>`; } else { f.innerHTML = `<label>Nome/Razão</label><input name="name" value="${itemData?.name||''}" required><label>Contato</label><input name="contact_person" value="${itemData?.contact_person||''}"><label>CPF/CNPJ</label><input name="cnpj_cpf" value="${itemData?.cnpj_cpf||''}"><label>Endereço</label><input name="address" value="${itemData?.address||''}"><label>Telefone</label><input name="phone" value="${itemData?.phone||''}"><label>Email</label><input name="email" value="${itemData?.email||''}">`; } 
}
function editCrudItem(id) { const i = getUserData()[currentCrudType].find(i => i.id === id); if (i) openCrudModal(true, i); }
function saveCrudItem(e) { 
    e.preventDefault(); const id = document.getElementById('crud-id').value; const t = e.target; 
    const i = { id: id || 'i_'+Date.now(), name: t.name.value, price: t.price?.value, description: t.description?.value, contact_person: t.contact_person?.value, phone: t.phone?.value, address: t.address?.value, cnpj_cpf: t.cnpj_cpf?.value, email: t.email?.value }; 
    const l = getUserData()[currentCrudType]; const idx = l.findIndex(x => x.id === id); idx !== -1 ? l[idx] = i : l.push(i); saveData(); closeModal('modal-crud'); renderCrud(currentCrudType); 
}
function deleteCrudItem(t,id){ if(confirm('Apagar?')){const l=getUserData()[t]; l.splice(l.findIndex(x=>x.id===id),1); saveData(); renderCrud(t);} }

// --- LISTAGENS (Correção Solicitada) ---
function switchListing(type) {
    currentListingType = type;
    
    // Atualiza botões
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('onclick').includes(type));
    });
    
    // Filtro de Movimentações
    const filterDiv = document.getElementById('movements-filter');
    if (filterDiv) {
        if (type === 'movimentacoes') filterDiv.classList.remove('hidden');
        else filterDiv.classList.add('hidden');
    }
    
    renderListingTable();
}

function renderListingTable() {
    const tbody = document.getElementById('listing-tbody');
    const thead = document.getElementById('listing-thead');
    if (!tbody || !thead) return;
    
    tbody.innerHTML = '';
    thead.innerHTML = '';
    
    const data = getUserData();
    let rows = [];
    
    if (currentListingType === 'clients') {
        thead.innerHTML = '<tr><th>Nome</th><th>Telefone</th><th>Email</th><th>Endereço</th></tr>';
        rows = data.clients || [];
        rows.forEach(r => tbody.innerHTML += `<tr><td>${r.name}</td><td>${r.phone||'-'}</td><td>${r.email||'-'}</td><td>${r.address||'-'}</td></tr>`);
    } else if (currentListingType === 'suppliers') {
        thead.innerHTML = '<tr><th>Nome</th><th>Contato</th><th>Telefone</th><th>CNPJ</th></tr>';
        rows = data.suppliers || [];
        rows.forEach(r => tbody.innerHTML += `<tr><td>${r.name}</td><td>${r.contact_person||'-'}</td><td>${r.phone||'-'}</td><td>${r.cnpj_cpf||'-'}</td></tr>`);
    } else if (currentListingType === 'products') {
        thead.innerHTML = '<tr><th>Nome</th><th>Preço</th><th>Descrição</th></tr>';
        rows = data.products || [];
        rows.forEach(r => tbody.innerHTML += `<tr><td>${r.name}</td><td>R$ ${parseFloat(r.price).toFixed(2)}</td><td>${r.description||'-'}</td></tr>`);
    } else if (currentListingType === 'services') {
        thead.innerHTML = '<tr><th>Nome</th><th>Preço</th><th>Descrição</th></tr>';
        rows = data.services || [];
        rows.forEach(r => tbody.innerHTML += `<tr><td>${r.name}</td><td>R$ ${parseFloat(r.price).toFixed(2)}</td><td>${r.description||'-'}</td></tr>`);
    } else if (currentListingType === 'movimentacoes') {
        thead.innerHTML = '<tr><th>Data</th><th>Tipo</th><th>Categoria</th><th>Entidade</th><th>Valor</th></tr>';
        rows = data.transactions || [];
        
        // Filter Month
        const m = document.getElementById('listing-month-filter').value;
        if (m) rows = rows.filter(r => r.date.startsWith(m));
        
        // Sort
        rows.sort((a,b) => new Date(b.date) - new Date(a.date));
        
        rows.forEach(r => {
            const color = r.type === 'receita' ? 'text-success' : 'text-danger';
            const sign = r.type === 'receita' ? '+' : '-';
            tbody.innerHTML += `<tr><td>${r.date.split('-').reverse().join('/')}</td><td style="text-transform:capitalize">${r.type}</td><td>${r.category}</td><td>${r.entity||'-'}</td><td class="${color}">${sign} R$ ${parseFloat(r.value).toFixed(2)}</td></tr>`;
        });
    }
    
    if (rows.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center p-4">Nenhum registro encontrado para este filtro.</td></tr>';
    }
}

// --- FUNÇÕES FISCAL & IRRF (ADICIONADAS PARA TABELA) ---
function renderIrrf() {
    const tbody = document.getElementById('irrf-table-body');
    tbody.innerHTML = '';
    // Garante que usa os padrões 2025 se vazio
    if(!appData.irrfTable || appData.irrfTable.length === 0) appData.irrfTable = JSON.parse(JSON.stringify(DEFAULT_IRRF));

    appData.irrfTable.sort((a,b) => a.max - b.max).forEach(row => {
        const maxDisplay = row.max > 900000 ? 'Acima' : `R$ ${row.max.toFixed(2)}`;
        tbody.innerHTML += `
            <tr>
                <td>${maxDisplay}</td>
                <td>${row.rate}%</td>
                <td>R$ ${row.deduction.toFixed(2)}</td>
                <td>
                    <button class="action-btn btn-warning" onclick="openIrrfModal('${row.id}')">✏️</button>
                    <button class="action-btn btn-danger" onclick="deleteIrrfRow('${row.id}')">🗑️</button>
                </td>
            </tr>
        `;
    });
}

function openIrrfModal(id=null) {
    document.getElementById('form-irrf').reset();
    if(id) {
        const r = appData.irrfTable.find(x => x.id === id);
        document.getElementById('irrf-id').value = r.id;
        document.getElementById('irrf-max').value = r.max;
        document.getElementById('irrf-rate').value = r.rate;
        document.getElementById('irrf-deduction').value = r.deduction;
    } else {
        document.getElementById('irrf-id').value = '';
    }
    document.getElementById('modal-irrf').classList.remove('hidden');
}

function saveIrrfRow(e) {
    e.preventDefault();
    const id = document.getElementById('irrf-id').value;
    const row = {
        id: id || 'irrf_'+Date.now(),
        max: parseFloat(document.getElementById('irrf-max').value),
        rate: parseFloat(document.getElementById('irrf-rate').value),
        deduction: parseFloat(document.getElementById('irrf-deduction').value)
    };
    const list = appData.irrfTable;
    const idx = id ? list.findIndex(x => x.id === id) : -1;
    if(idx !== -1) list[idx] = row; else list.push(row);
    saveData();
    closeModal('modal-irrf');
    renderIrrf();
}

function deleteIrrfRow(id) {
    if(confirm('Excluir?')) {
        appData.irrfTable = appData.irrfTable.filter(x => x.id !== id);
        saveData();
        renderIrrf();
    }
}

// --- MEI FISCAL CALCULATION (NOVA FUNÇÃO) ---
function renderMeiFiscalCalculations() {
    // Parâmetros 2025
    const salaryBase = 1620.99;
    const inssVal = salaryBase * 0.05; // 5%
    const icmsVal = 1.00;
    const issVal = 5.00;

    // 1. Renderizar Tabela de Encargos (Cálculo)
    const tbodyTax = document.getElementById('mei-tax-body');
    if (tbodyTax) {
        tbodyTax.innerHTML = '';
        
        const scenarios = [
            { label: 'Comércio / Indústria', fixed: icmsVal, total: inssVal + icmsVal },
            { label: 'Serviços', fixed: issVal, total: inssVal + issVal },
            { label: 'Comércio + Serviços', fixed: icmsVal + issVal, total: inssVal + icmsVal + issVal }
        ];

        scenarios.forEach(sc => {
            tbodyTax.innerHTML += `
                <tr>
                    <td>${sc.label}</td>
                    <td>R$ ${inssVal.toFixed(2)}</td>
                    <td>R$ ${sc.fixed.toFixed(2)}</td>
                    <td class="font-bold text-primary">R$ ${sc.total.toFixed(2)}</td>
                </tr>
            `;
        });
    }

    // 2. Renderizar Tabela de Percentual Efetivo
    // Usaremos o valor Comércio + Serviços como referência de segurança para o cálculo do %
    const dasRef = inssVal + icmsVal + issVal; 
    
    const tbodyEff = document.getElementById('mei-effective-body');
    if (tbodyEff) {
        tbodyEff.innerHTML = '';
        
        const revenues = [1000, 3000, 6000];
        
        revenues.forEach(rev => {
            const effectiveRate = (dasRef / rev) * 100;
            tbodyEff.innerHTML += `
                <tr>
                    <td>R$ ${rev.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</td>
                    <td>R$ ${dasRef.toFixed(2)}</td>
                    <td><strong>${effectiveRate.toFixed(2)}%</strong></td>
                </tr>
            `;
        });
    }
}

function getUserData() { return appData.records[appData.currentUser.id]; }
function closeModal(id) { document.getElementById(id).classList.add('hidden'); }
function checkLicense() { const d = Math.ceil((appData.currentUser.licenseExpire - Date.now())/86400000); document.getElementById('license-days-display').innerText = d>0?d+' dias':'Expirado'; document.getElementById('license-warning').classList.toggle('hidden', d>0); }
function generateLicenseCode() { document.getElementById('license-random-code').value = Math.floor(Math.random()*900)+100; }
        
// Inicializa a aplicação
init();