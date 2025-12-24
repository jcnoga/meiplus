// --- CONSTANTES DE SEGURANÇA E CONFIGURAÇÃO ---
const DEFAULT_URL_FISCAL = "https://www.nfse.gov.br/EmissorNacional/Login?ReturnUrl=%2fEmissorNacional";
const DEFAULT_URL_DAS = "https://www8.receita.fazenda.gov.br/SimplesNacional/Aplicacoes/ATSPO/pgmei.app/Identificacao";
const DB_KEY = 'MEI_SYSTEM_V11';

// Constantes da Licença
const LIC_PAD_VAL = 13;
const LIC_MULT_FACTOR = 9;
const LIC_YEAR_BASE = 1954;

// Configuração Firebase (Adicione suas chaves aqui)
const firebaseConfig = {
    // apiKey: "...",
    // authDomain: "...",
    // projectId: "...",
};

// --- GESTOR DE DADOS HÍBRIDO (REGRA DE OPERAÇÃO CRUD) ---
const DataManager = {
    dbName: 'MEI_DB_HYBRID',
    storeName: 'mei_data',
    isDirty: false, // Flag para indicar dados pendentes de sincronização
    
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

    // A REGRA CENTRAL DE CRUD HÍBRIDO
    async save(data) {
        // 1. Persistência Local Obrigatória (IndexedDB)
        try {
            const db = await this.initDB();
            const tx = db.transaction(this.storeName, 'readwrite');
            tx.objectStore(this.storeName).put(data, 'main_data');
            // Backup legado
            try { localStorage.setItem(DB_KEY, JSON.stringify(data)); } catch(e) {}
        } catch(e) { console.error("Erro Crítico ao Salvar Localmente", e); }

        // 2. Tentativa de Sincronização em Nuvem (Firebase)
        if (navigator.onLine && firebase.apps.length && data.currentUser) {
            try {
                const dbCloud = firebase.firestore();
                await dbCloud.collection('users').doc(data.currentUser.id).set(data);
                this.isDirty = false;
                this.updateSyncStatus(true);
                console.log("Dados Sincronizados com a Nuvem.");
            } catch(e) { 
                console.error("Falha no envio para Nuvem:", e); 
                this.isDirty = true;
                this.updateSyncStatus(false);
            }
        } else {
            // Se offline ou sem config, marca como pendente
            this.isDirty = true;
            this.updateSyncStatus(false);
        }
    },

    async load() {
        let data = null;
        // Prioridade: IndexedDB
        try {
            const db = await this.initDB();
            data = await new Promise(resolve => {
                const tx = db.transaction(this.storeName, 'readonly');
                const req = tx.objectStore(this.storeName).get('main_data');
                req.onsuccess = () => resolve(req.result);
                req.onerror = () => resolve(null);
            });
        } catch(e) { console.warn("Erro ao carregar IDB", e); }

        // Fallback: LocalStorage
        if (!data) {
            const ls = localStorage.getItem(DB_KEY);
            if (ls) data = JSON.parse(ls);
        }

        // Fallback: Nuvem (se não tiver nada local e estiver online)
        if (!data && navigator.onLine && firebase.apps.length) {
           // Lógica de recuperação de nuvem seria implementada no login
        }

        return data;
    },

    // Função chamada automaticamente quando a internet volta
    async forceSync(currentData) {
        if (this.isDirty && currentData) {
            console.log("Reconectado! Tentando sincronizar pendências...");
            await this.save(currentData);
        } else {
            this.updateSyncStatus(true);
        }
    },

    updateSyncStatus(isOnline) {
        const el = document.getElementById('sync-indicator');
        if(el) {
            if (isOnline) {
                el.className = 'sync-status sync-online';
                el.title = 'Sincronizado (Nuvem)';
            } else {
                el.className = 'sync-status sync-offline';
                el.title = 'Armazenamento Local (Pendente Envio)';
            }
        }
    }
};

// --- INICIALIZAÇÃO FIREBASE ---
if (firebaseConfig.apiKey) {
    try {
        firebase.initializeApp(firebaseConfig);
        console.log("Firebase Initialized");
    } catch(e) { console.error("Firebase Init Error", e); }
}

let appData = { currentUser: null, users: [], records: {}, irrfTable: [] };

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

async function init() {
    // Listeners de Rede para Regra Híbrida
    window.addEventListener('online', () => DataManager.forceSync(appData));
    window.addEventListener('offline', () => DataManager.updateSyncStatus(false));

    // Carregamento Inicial
    const loadedData = await DataManager.load();
    if (loadedData) appData = loadedData;
    
    if (!appData.irrfTable || appData.irrfTable.length === 0) appData.irrfTable = JSON.parse(JSON.stringify(DEFAULT_IRRF));
    
    const sessionUser = sessionStorage.getItem('mei_user_id');
    if (sessionUser) {
        const user = appData.users.find(u => u.id === sessionUser);
        if (user) { loginUser(user); return; }
    }
    showAuth();
}

function showAuth() { document.getElementById('auth-screen').classList.remove('hidden'); document.getElementById('app-container').classList.add('hidden'); }

// Função Central de Salvamento (Async)
async function saveData() { 
    await DataManager.save(appData); 
}

function loginUser(user) {
    appData.currentUser = user; sessionStorage.setItem('mei_user_id', user.id);
    document.getElementById('auth-screen').classList.add('hidden');
    document.getElementById('app-container').classList.remove('hidden');
    document.getElementById('user-name-display').innerText = user.name;
    
    if(!appData.records[user.id].appointments) appData.records[user.id].appointments = [];
    
    checkLicense(); navTo('dashboard'); loadFiscalReminders();
    
    // Sync status check
    DataManager.updateSyncStatus(navigator.onLine);
    saveData(); // Garante sync inicial se online
}

function logout() { appData.currentUser = null; sessionStorage.removeItem('mei_user_id'); location.reload(); }

function toggleAuth(screen) {
    document.getElementById('login-form').classList.toggle('hidden', screen === 'register');
    document.getElementById('register-form').classList.toggle('hidden', screen !== 'register');
}

function handleGoogleLogin() {
    if (!firebaseConfig.apiKey) {
        alert('Simulação: Login com Google realizado! (Configure as chaves do Firebase para ativar)');
        return;
    }
    const provider = new firebase.auth.GoogleAuthProvider();
    firebase.auth().signInWithPopup(provider).then((result) => {
        const user = result.user;
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
        alert("Erro no login Google: " + error.message);
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
        appointments: []
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
    user ? loginUser(user) : alert('Erro no login');
});

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
    if(viewId === 'fiscal') {
        renderIrrf();
        const comp = appData.currentUser.company || {};
        document.getElementById('link-emissor').href = comp.url_fiscal || DEFAULT_URL_FISCAL;
        document.getElementById('link-das').href = comp.url_das || DEFAULT_URL_DAS;
    }
    if(viewId === 'configuracoes') loadSettings();
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

    // ADMIN TOOLS CHECK
    const adminDiv = document.getElementById('admin-tools');
    if (appData.currentUser.email === 'jcnvap@gmail.com') {
        adminDiv.classList.remove('hidden');
    } else {
        adminDiv.classList.add('hidden');
    }
}

// ADMIN FUNCTIONS (Somente jcnvap@gmail.com)
function adminFillData() {
    if (appData.currentUser.email !== 'jcnvap@gmail.com') return;
    if (!confirm('ATENÇÃO: Isso preencherá o sistema com dados fictícios para teste. Continuar?')) return;

    const today = new Date();
    const formatDate = (date) => date.toISOString().split('T')[0];
    
    // 1. Dados da Empresa
    appData.currentUser.company = {
        name: "Empresa Modelo Tech Ltda",
        cnpj: "12.345.678/0001-90",
        address: "Av. Paulista, 1000 - São Paulo, SP",
        phone: "(11) 98765-4321",
        whatsapp: "(11) 98765-4321",
        role: "both",
        url_fiscal: DEFAULT_URL_FISCAL,
        url_das: DEFAULT_URL_DAS,
        reserve_rate: 15,
        prolabore_target: 5000
    };

    const rec = appData.records[appData.currentUser.id];
    
    // 2. Clientes
    rec.clients = [
        {id: 'c1', name: 'Supermercado Silva', phone: '(11) 91111-1111', address: 'Rua A, 1', cnpj_cpf: '11.111.111/0001-11', contact_person: 'Sr. Silva', email: 'silva@email.com'},
        {id: 'c2', name: 'Padaria Central', phone: '(11) 92222-2222', address: 'Rua B, 2', cnpj_cpf: '22.222.222/0001-22', contact_person: 'Maria', email: 'maria@email.com'},
        {id: 'c3', name: 'João Pessoa Física', phone: '(11) 93333-3333', address: 'Rua C, 3', cnpj_cpf: '333.333.333-33', contact_person: 'João', email: 'joao@email.com'},
        {id: 'c4', name: 'Consultório Dr. André', phone: '(11) 94444-4444', address: 'Rua D, 4', cnpj_cpf: '44.444.444/0001-44', contact_person: 'André', email: 'andre@email.com'},
        {id: 'c5', name: 'Escola Futuro', phone: '(11) 95555-5555', address: 'Rua E, 5', cnpj_cpf: '55.555.555/0001-55', contact_person: 'Diretora Ana', email: 'ana@email.com'}
    ];

    // 3. Fornecedores
    rec.suppliers = [
        {id: 's1', name: 'Distribuidora Tech', phone: '(11) 81111-1111', address: 'Av Ind, 100', cnpj_cpf: '66.666.666/0001-66', contact_person: 'Roberto', email: 'vendas@tech.com'},
        {id: 's2', name: 'Papelaria Atacado', phone: '(11) 82222-2222', address: 'Av Com, 200', cnpj_cpf: '77.777.777/0001-77', contact_person: 'Julia', email: 'julia@papel.com'},
        {id: 's3', name: 'Internet Provider', phone: '(11) 0800-0000', address: 'Web', cnpj_cpf: '88.888.888/0001-88', contact_person: 'Suporte', email: 'suporte@net.com'}
    ];

    // 4. Produtos & Serviços
    rec.products = [
        {id: 'p1', name: 'Mouse Sem Fio', price: 45.90, description: 'Mouse óptico genérico'},
        {id: 'p2', name: 'Teclado Mecânico', price: 150.00, description: 'Teclado RGB'},
        {id: 'p3', name: 'Cabo HDMI 2m', price: 25.00, description: 'Cabo 4k'},
        {id: 'p4', name: 'Monitor 24pol', price: 800.00, description: 'Full HD'},
        {id: 'p5', name: 'Suporte Notebook', price: 60.00, description: 'Alumínio'}
    ];
    rec.services = [
        {id: 'sv1', name: 'Formatação PC', price: 120.00, description: 'Backup incluso'},
        {id: 'sv2', name: 'Instalação Rede', price: 250.00, description: 'Por ponto'},
        {id: 'sv3', name: 'Consultoria TI', price: 100.00, description: 'Valor hora'}
    ];

    // 5. Transações (Gerar histórico para gráficos)
    rec.transactions = [];
    const catsIn = ['Venda', 'Serviço', 'Outros'];
    const catsOut = ['Compra', 'Despesa', 'Imposto', 'Gastos Pessoais'];
    
    // Gerar 20 transações aleatórias nos últimos 60 dias
    for(let i=0; i<25; i++) {
        const isReceita = Math.random() > 0.4; // 60% chance receita
        const pastDate = new Date();
        pastDate.setDate(today.getDate() - Math.floor(Math.random() * 60));
        
        rec.transactions.push({
            id: 't_admin_'+i,
            type: isReceita ? 'receita' : 'despesa',
            category: isReceita ? catsIn[Math.floor(Math.random()*catsIn.length)] : catsOut[Math.floor(Math.random()*catsOut.length)],
            value: parseFloat((Math.random() * (isReceita ? 500 : 200) + 50).toFixed(2)),
            date: formatDate(pastDate),
            entity: isReceita ? rec.clients[Math.floor(Math.random()*rec.clients.length)].name : rec.suppliers[Math.floor(Math.random()*rec.suppliers.length)].name,
            obs: 'Gerado automaticamente'
        });
    }

    // 6. Agenda (Compromissos)
    rec.appointments = [
        {id: 'apt1', title: 'Manutenção Servidor', date: formatDate(today), time: '14:00', client_name: 'Escola Futuro', service_desc: 'Verificar lentidão', value: 300, status: 'agendado', pay_status: 'pendente', pay_method: 'pix'},
        {id: 'apt2', title: 'Entrega Equipamento', date: formatDate(new Date(today.getTime() + 86400000)), time: '10:00', client_name: 'Supermercado Silva', service_desc: 'Entrega monitor', value: 800, status: 'agendado', pay_status: 'pago', pay_method: 'cartao'},
        {id: 'apt3', title: 'Visita Técnica', date: formatDate(new Date(today.getTime() - 86400000)), time: '09:00', client_name: 'Padaria Central', service_desc: 'Configurar impressora', value: 120, status: 'concluido', pay_status: 'pago', pay_method: 'dinheiro'}
    ];

    saveData();
    alert('Dados de teste gerados com sucesso! O painel foi atualizado.');
    location.reload(); // Recarrega para garantir atualização total das views
}

function adminClearData() {
    if (appData.currentUser.email !== 'jcnvap@gmail.com') return;
    if (!confirm('PERIGO: Isso apagará TODOS os cadastros, financeiro, agenda e RPA. Deseja realmente limpar tudo?')) return;

    appData.records[appData.currentUser.id] = {
        products: [], services: [], clients: [], suppliers: [], transactions: [], rpas: [], appointments: []
    };
    
    // Reseta configurações básicas da empresa, mantendo apenas o essencial para não quebrar
    appData.currentUser.company = {
        name: "", cnpj: "", address: "", phone: "", whatsapp: "", role: "both",
        url_fiscal: DEFAULT_URL_FISCAL, url_das: DEFAULT_URL_DAS,
        reserve_rate: 10, prolabore_target: 4000
    };

    saveData();
    alert('Sistema limpo com sucesso.');
    location.reload();
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
    if(supIndex >= 0) { suppliersList[supIndex] = supplierData; } else { suppliersList.push(supplierData); }
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
    if(id) { const c = getUserData().clients.find(x => x.id === id); if(c) { document.getElementById('appt-client-name').value = c.name; document.getElementById('appt-client-phone').value = c.phone || ''; } }
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
    const rpa = {
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
    };
    if(!getUserData().rpas) getUserData().rpas = [];
    const list = getUserData().rpas;
    if(id) { const idx = list.findIndex(r => r.id === id); if(idx !== -1) list[idx] = rpa; else list.push(rpa); } else { list.push(rpa); }
    saveData(); alert('RPA Salvo!'); toggleRPAHistory();
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
        calculateRPA(); alert('RPA Carregado.'); window.scrollTo(0,0);
    }
}

function deleteRPA(id) { if(confirm('Excluir este RPA?')) { const l = getUserData().rpas; l.splice(l.findIndex(r => r.id === id), 1); saveData(); toggleRPAHistory(); } }

// --- HELPERS PARA EXPORTAÇÃO DE DOCUMENTOS (PDF Alta Qualidade e DOCX) ---

// Função auxiliar para preparar o DOM (copia valores de inputs para atributos HTML visíveis)
function prepareForExport(elementId) {
    const element = document.getElementById(elementId);
    // Copia valores de inputs para o atributo 'value' para que apareçam no PDF/HTML
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
    
    // Configurações para Alta Qualidade (300dpi, A4)
    const opt = {
        margin:       10,
        filename:     'RPA.pdf',
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2 }, // Aumenta resolução
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    html2pdf().set(opt).from(element).save();
}

function exportRPADoc() {
    prepareForExport('rpa-content');
    
    // Captura os valores atuais pois inputs HTML puros não levam o texto digitado
    const company = document.getElementById('rpa-comp-name').value;
    const cnpj = document.getElementById('rpa-comp-cnpj').value;
    const provName = document.getElementById('rpa-prov-name').value;
    const provCpf = document.getElementById('rpa-prov-cpf').value;
    const desc = document.getElementById('rpa-desc').value;
    const date = document.getElementById('rpa-date').value;
    const value = document.getElementById('rpa-value').value;
    const net = document.getElementById('rpa-net').value;

    // Cria um HTML limpo para o Word, garantindo compatibilidade
    const htmlContent = `
        <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
        <head>
            <meta charset='utf-8'>
            <title>RPA</title>
            <style>
                body { font-family: 'Arial', sans-serif; font-size: 12pt; }
                h2 { text-align: center; text-decoration: underline; }
                p { margin: 5px 0; }
                hr { border: 0; border-top: 1px solid #ccc; margin: 20px 0; }
                .section { margin-bottom: 20px; border: 1px solid #eee; padding: 10px; }
                .label { font-weight: bold; }
            </style>
        </head>
        <body>
            <h2>RECIBO DE PAGAMENTO A AUTÔNOMO (RPA)</h2>
            <br>
            <div class="section">
                <h3>1. Contratante</h3>
                <p><span class="label">Razão Social:</span> ${company}</p>
                <p><span class="label">CNPJ:</span> ${cnpj}</p>
            </div>
            <div class="section">
                <h3>2. Autônomo</h3>
                <p><span class="label">Nome:</span> ${provName}</p>
                <p><span class="label">CPF:</span> ${provCpf}</p>
            </div>
            <div class="section">
                <h3>3. Serviço</h3>
                <p><span class="label">Descrição:</span> ${desc}</p>
                <p><span class="label">Data:</span> ${date}</p>
            </div>
            <div class="section">
                <h3>4. Valores</h3>
                <p><span class="label">Valor Bruto:</span> R$ ${value}</p>
                <p><span class="label">Valor Líquido:</span> ${net}</p>
            </div>
            <br><br>
            <p>Declaro que recebi o valor acima.</p>
            <br><br>
            <p>______________________________________</p>
            <p>Assinatura do Prestador</p>
        </body>
        </html>`;
    
    const blob = new Blob([htmlContent], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'RPA.doc';
    a.click();
}

function exportReportPDF() {
    document.getElementById('report-company-header').innerText = appData.currentUser.company.name || "Minha Empresa";
    document.getElementById('report-title').classList.remove('hidden');
    
    // Mostra área de relatório, esconde o resto temporariamente
    const element = document.getElementById('report-print-area');
    
    const opt = {
        margin:       10,
        filename:     'Relatorio.pdf',
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2 },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'landscape' } // Landscape para tabelas
    };

    html2pdf().set(opt).from(element).save().then(() => {
         document.getElementById('report-title').classList.add('hidden');
    });
}

function exportReportDoc() {
    const header = `<h2 style="text-align:center">${appData.currentUser.company.name || "Minha Empresa"}</h2>`;
    const table = document.getElementById('listing-table').outerHTML;
    
    const html = `
        <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
        <head>
            <meta charset='utf-8'>
            <title>Relatório</title>
            <style>
                body { font-family: 'Arial', sans-serif; }
                table { width: 100%; border-collapse: collapse; }
                th, td { border: 1px solid #000; padding: 5px; text-align: left; }
                th { background-color: #f0f0f0; }
            </style>
        </head>
        <body>
            ${header}
            <h3 style="text-align:center">Relatório do Sistema</h3>
            <br>
            ${table}
        </body>
        </html>`;
        
    const blob = new Blob([html], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Relatorio.doc`;
    a.click();
}

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
        appData.currentUser.licenseExpire += d * 86400000;
        saveData();
        checkLicense();
        alert('Ok');
    } else {
        alert('Erro'); 
    }
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
    if (list && list.length > 0) { select.innerHTML = '<option value="">Selecione...</option>' + list.map(i => `<option value="${i.name}">${i.name}</option>`).join(''); } else { select.innerHTML = '<option value="">Sem cadastros disponíveis</option>'; }
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
    document.getElementById('listing-thead').innerHTML=t==='movimentacoes'?'<tr><th>Data</th><th>Tipo</th><th>Valor</th></tr>':'<tr><th>Nome</th><th>Detalhe</th><th>Valor/Tel</th></tr>'; const d=t==='movimentacoes'?getUserData().transactions:getUserData()[t]; document.getElementById('listing-tbody').innerHTML=d.map(i=>t==='movimentacoes'?`<tr><td>${i.date}</td><td>${i.type}</td><td>${i.value}</td></tr>`:`<tr><td>${i.name}</td><td>${i.description||i.contact_person||'-'}</td><td>${i.price||i.phone||'-'}</td></tr>`).join(''); 
}

function loadFiscalReminders(){ document.getElementById('fiscal-reminders').innerHTML='<li>DAS Dia 20</li>'; }
function downloadBackup(){ saveData(); const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([JSON.stringify(appData)],{type:'json'})); a.download='backup.json'; a.click(); }
function restoreBackup(i){ const r=new FileReader(); r.onload=e=>{appData=JSON.parse(e.target.result);saveData();location.reload();}; r.readAsText(i.files[0]); }

function renderIrrf(){ document.getElementById('irrf-table-body').innerHTML=appData.irrfTable.map(r=>`<tr><td>${r.max}</td><td>${r.rate}</td><td>${r.deduction}</td><td><button class="action-btn btn-warning" onclick="editIrrfRow('${r.id}')">✏️</button><button class="action-btn btn-danger" onclick="deleteIrrfRow('${r.id}')">X</button></td></tr>`).join(''); }
function deleteIrrfRow(id){ appData.irrfTable.splice(appData.irrfTable.findIndex(r=>r.id===id),1); saveData(); renderIrrf(); }
function openIrrfModal(){ document.getElementById('form-irrf').reset(); document.getElementById('irrf-id').value = ''; document.getElementById('modal-irrf').classList.remove('hidden'); }
function editIrrfRow(id) { const row = appData.irrfTable.find(r => r.id === id); if(row) { document.getElementById('irrf-id').value = row.id; document.getElementById('irrf-max').value = row.max; document.getElementById('irrf-rate').value = row.rate; document.getElementById('irrf-deduction').value = row.deduction; document.getElementById('modal-irrf').classList.remove('hidden'); } }
function saveIrrfRow(e){ e.preventDefault(); const id = document.getElementById('irrf-id').value; const data = { id: id || 'irrf_'+Date.now(), max:parseFloat(e.target[1].value), rate:parseFloat(e.target[2].value), deduction:parseFloat(e.target[3].value) }; if (id) { const idx = appData.irrfTable.findIndex(r => r.id === id); if (idx !== -1) appData.irrfTable[idx] = data; } else { appData.irrfTable.push(data); } saveData(); closeModal('modal-irrf'); renderIrrf(); }

init();