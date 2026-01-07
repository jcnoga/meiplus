// --- PROTEÇÃO CONTRA DUPLA EXECUÇÃO E CORREÇÃO DE SINTAXE ---
if (window.MEI_SCRIPT_LOADED) throw new Error("Script já carregado!");
window.MEI_SCRIPT_LOADED = true;

// --- CONSTANTES DE SEGURANÇA E CONFIGURAÇÃO ---
const DEFAULT_URL_FISCAL = "https://www.nfse.gov.br/EmissorNacional/Login?ReturnUrl=%2fEmissorNacional";
const DEFAULT_URL_DAS = "https://www8.receita.fazenda.gov.br/SimplesNacional/Aplicacoes/ATSPO/pgmei.app/Identificacao";
const DB_KEY = 'MEI_SYSTEM_V11';

// CONFIGURAÇÃO EMAILJS (Envio Direto)
// Preencha com suas chaves do Painel EmailJS (https://dashboard.emailjs.com/)
const EMAILJS_PUBLIC_KEY = "INSIRA_SUA_PUBLIC_KEY_AQUI"; 
const EMAILJS_SERVICE_ID = "INSIRA_SEU_SERVICE_ID_AQUI"; 
const EMAILJS_TEMPLATE_ID = "INSIRA_SEU_TEMPLATE_ID_AQUI";

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
  appId: "1:785289237066:web:78bc967e8ac002b1d5ccb3"
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

        // 3. Firebase (Sincronização com verificação de Auth)
        this.syncToCloud(data);
    },

    async syncToCloud(data) {
        // CORREÇÃO: Utiliza persistência do SDK para gerenciar fila offline/online automaticamente
        if (typeof firebase !== 'undefined' && firebase.apps.length && data.currentUser) {
            const authUser = firebase.auth().currentUser;
            
            if (authUser) {
                try {
                    const db = firebase.firestore();
                    // Saneamento de dados
                    const cleanData = JSON.parse(JSON.stringify(data));
                    
                    // A gravação ocorre localmente no cache do Firebase e sincroniza quando houver rede
                    await db.collection('users').doc('u_' + authUser.uid).set(cleanData);
                    
                    // Atualiza status visual baseado na conectividade atual do navegador
                    if (navigator.onLine) {
                        this.updateSyncStatus(true);
                    } else {
                        // Visualmente offline, mas salvo na fila de persistência
                        this.updateSyncStatus(false);
                    }
                } catch(e) { 
                    console.error("Cloud Sync Error (Permissões ou Fila):", e.message); 
                    this.updateSyncStatus(false);
                }
            } else {
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
            el.title = isOnline ? 'Sincronizado (Nuvem)' : 'Modo Offline (Local/Fila)';
        }
    }
};

// --- INICIALIZAÇÃO FIREBASE (COM PERSISTÊNCIA OFFLINE) E EMAILJS ---
if (typeof firebase !== 'undefined' && firebaseConfig.apiKey) {
    try {
        // CORREÇÃO: Verifica se já foi inicializado para evitar aviso no console
        if (!firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
            // Habilitar persistência offline do Firestore
            firebase.firestore().enablePersistence()
                .catch((err) => {
                    if (err.code == 'failed-precondition') {
                        console.warn('Persistência falhou: Múltiplas abas abertas.');
                    } else if (err.code == 'unimplemented') {
                        console.warn('Navegador não suporta persistência offline.');
                    }
                });
        }
        
        // Inicialização do EmailJS
        if (typeof emailjs !== 'undefined') {
            emailjs.init(EMAILJS_PUBLIC_KEY);
            console.log("EmailJS Initialized (Direct Send)");
        }

        console.log("Firebase Initialized with Offline Support");
        
        // Listener de Auth para sincronizar estado
        firebase.auth().onAuthStateChanged((user) => {
            if (user && appData.currentUser) {
                // Ao detectar usuário, garante que o sync ocorra (fila ou rede)
                DataManager.syncToCloud(appData);
            }
        });
    } catch(e) { console.error("Firebase Init Error", e); }
}

// --- SERVIÇO DE E-MAIL (ALTERADO PARA ENVIO DIRETO - EMAILJS) ---
/**
 * Envia e-mails diretamente usando o SDK do EmailJS.
 * Substitui o método anterior de Trigger Email do Firebase.
 */
async function sendAutomatedEmail(to, subject, htmlContent, context = 'system') {
    // CORREÇÃO: Verifica autenticação Local (appData) OU Firebase
    const localUser = appData && appData.currentUser;
    const firebaseUser = (typeof firebase !== 'undefined' && firebase.auth) ? firebase.auth().currentUser : null;

    if (!localUser && !firebaseUser && context !== 'registration_manual' && context !== 'registration_google') {
         console.warn("Bloqueio de Segurança: Nenhum usuário autenticado (Local ou Nuvem).");
         return;
    }

    if (typeof emailjs === 'undefined') {
        console.warn("EmailJS SDK não carregado. E-mail não enviado.");
        return;
    }

    // EmailJS geralmente aceita string única ou separada por vírgula para múltiplos destinatários
    const recipients = Array.isArray(to) ? to.join(',') : to;

    // Parâmetros do Template (Configure estas variáveis no seu Template do EmailJS)
    const templateParams = {
        to_email: recipients,
        subject: subject || "Sem Assunto",
        message_html: htmlContent || "<p>Sem conteúdo.</p>",
        context: context,
        system_name: "Gestor MEI"
    };

    try {
        console.log(`Iniciando envio direto de e-mail (${subject}) para: ${recipients}...`);
        
        const response = await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, templateParams);
        
        if (response.status === 200) {
            console.log(`E-mail enviado com sucesso! Status: ${response.status}`);
        } else {
            console.warn("Envio de e-mail finalizado com status:", response);
        }
    } catch (e) {
        console.error("Erro ao enviar e-mail via EmailJS:", e);
    }
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

// --- FUNÇÃO AUXILIAR CRUCIAL (RECUPERADA) ---
function getUserData() {
    if(appData.currentUser && appData.records[appData.currentUser.id]) {
        return appData.records[appData.currentUser.id];
    }
    // Retorna estrutura vazia para evitar crash se usuário não estiver logado corretamente
    return { transactions: [], appointments: [], products: [], services: [], clients: [], suppliers: [], rpas: [] };
}

function closeModal(modalId) {
    const el = document.getElementById(modalId);
    if(el) el.classList.add('hidden');
}

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

    // Monitor de Conectividade Global e Atualização de UI
    window.addEventListener('online', () => {
        console.log("Conexão restaurada. Sincronizando...");
        DataManager.updateSyncStatus(true);
        if(appData.currentUser) DataManager.save(appData); // Dispara a fila do Firebase
    });

    window.addEventListener('offline', () => {
        console.log("Modo Offline Ativo.");
        DataManager.updateSyncStatus(false);
    });

    // Seta status inicial
    DataManager.updateSyncStatus(navigator.onLine);

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
            // Se estiver online, ok. Se offline, vai para fila.
            if(navigator.onLine) {
                alert("Sincronização com a nuvem processada.");
            } else {
                alert("Sem internet. Dados salvos localmente e agendados para envio.");
            }
        }, 1000);
    });
}

function loadFiscalReminders() {
    const list = document.getElementById('fiscal-reminders');
    if (!list) return;
    
    list.innerHTML = '';
    const today = new Date();
    
    // Lógica para o dia 20 (DAS)
    let dasDate = new Date(today.getFullYear(), today.getMonth(), 20);
    if (today.getDate() > 20) {
        dasDate.setMonth(dasDate.getMonth() + 1);
    }
    
    // Formatação de data
    const dateOptions = { day: '2-digit', month: '2-digit' };
    
    list.innerHTML += `
        <li class="mb-2" style="border-bottom: 1px solid var(--border); padding-bottom: 0.25rem;">
            <strong class="text-primary">DAS Mensal:</strong> Vence em ${dasDate.toLocaleDateString('pt-BR', dateOptions)}
        </li>
        <li class="mb-2">
            <strong class="text-warning">DASN-SIMEI:</strong> Prazo anual 31/05
        </li>
    `;
}

// --- FUNÇÃO AUXILIAR DE LICENÇA (RECUPERADA) ---
function checkLicense() {
    if (!appData.currentUser) return;
    const now = Date.now();
    const expire = appData.currentUser.licenseExpire || 0;
    const daysLeft = Math.ceil((expire - now) / (1000 * 60 * 60 * 24));
    
    const display = document.getElementById('license-days-display');
    const warning = document.getElementById('license-warning');
    
    if (display) {
        if (daysLeft > 0) {
            display.innerText = `${daysLeft} dias restantes`;
            display.className = daysLeft < 15 ? 'text-warning text-sm mt-2' : 'text-success text-sm mt-2';
        } else {
            display.innerText = "Licença Expirada";
            display.className = "text-danger text-sm mt-2";
        }
    }

    if (warning) {
        if (daysLeft <= 0) warning.classList.remove('hidden');
        else warning.classList.add('hidden');
    }
}

function loginUser(user) {
    appData.currentUser = user; sessionStorage.setItem('mei_user_id', user.id);
    document.getElementById('auth-screen').classList.add('hidden');
    document.getElementById('app-container').classList.remove('hidden');
    document.getElementById('user-name-display').innerText = user.name;
    
    if(!appData.records[user.id].appointments) appData.records[user.id].appointments = [];
    
    checkLicense(); 
    navTo('dashboard'); 
    
    // Chama a função agora existente
    loadFiscalReminders();
    
    saveData(); 
}

function logout() { 
    appData.currentUser = null; 
    sessionStorage.removeItem('mei_user_id'); 
    if (firebase.auth().currentUser) firebase.auth().signOut();
    location.reload(); 
}

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
            console.warn("Erro ao verificar nuvem (provavelmente offline):", e);
        }

        if (docSnap && docSnap.exists) {
            // EXISTE NA NUVEM
            const cloudData = docSnap.data();
            if(cloudData) {
                appData = cloudData;
                // Importante: garante que appData.currentUser está definido antes de salvar
                appData.currentUser = appData.users.find(u => u.id === docId) || cloudData.currentUser;
                await DataManager.save(appData); 
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
            appData.currentUser = appUser;
            await DataManager.save(appData);
            
            // ENVIO AUTOMÁTICO DE E-MAIL
            // (Agora funciona pois o usuário está autenticado pelo Google)
            sendAutomatedEmail(
                appUser.email,
                "Bem-vindo ao Gestor MEI",
                `<h3>Olá, ${appUser.name}!</h3><p>Seu cadastro foi realizado com sucesso via Google.</p><p>Sua licença gratuita de 90 dias já está ativa.</p>`,
                "registration_google"
            );
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
document.getElementById('register-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('reg-email').value;
    const name = document.getElementById('reg-name').value;
    const password = document.getElementById('reg-password').value;
    
    // Verificação local rápida
    if (appData.users.find(u => u.email === email)) return alert('E-mail já existe (Local)!');

    let newUserId = 'u_' + Date.now();
    let authSuccess = false;

    // CORREÇÃO: Tentar criar usuário no Firebase Auth para permitir escritas
    if (typeof firebase !== 'undefined' && firebaseConfig.apiKey) {
        try {
            const userCred = await firebase.auth().createUserWithEmailAndPassword(email, password);
            newUserId = 'u_' + userCred.user.uid;
            authSuccess = true;
        } catch (error) {
            console.warn("Erro ao criar Auth no Firebase (usando modo offline):", error.message);
            if(error.code === 'auth/email-already-in-use') {
                alert("Este e-mail já está em uso no sistema.");
                return;
            }
        }
    }
    
    const newUser = {
        id: newUserId, 
        name: name, 
        email: email,
        password: password, // Mantém local para fallback offline
        licenseExpire: new Date().getTime() + (90 * 86400000),
        company: { reserve_rate: 10, prolabore_target: 4000 }
    };

    appData.users.push(newUser); 
    appData.records[newUser.id] = createSeedData();
    appData.currentUser = newUser;

    await saveData(); 
    
    // ENVIO AUTOMÁTICO DE E-MAIL (Só funciona se authSuccess for true)
    if (authSuccess) {
        sendAutomatedEmail(
            email,
            "Bem-vindo ao Gestor MEI",
            `<h3>Olá, ${name}!</h3><p>Obrigado por se cadastrar no Gestor MEI.</p><p>Aproveite seus 90 dias de acesso gratuito.</p>`,
            "registration_manual"
        );
    }

    loginUser(newUser);
});

document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    
    // CORREÇÃO: Tentar autenticar no Firebase Auth primeiro
    if (typeof firebase !== 'undefined' && firebaseConfig.apiKey) {
        try {
            const userCred = await firebase.auth().signInWithEmailAndPassword(email, password);
            // Login no Firebase com sucesso, buscar dados da nuvem se possível
            const db = firebase.firestore();
            const docId = 'u_' + userCred.user.uid;
            
            try {
                // Tenta buscar (se offline, busca no cache persistente)
                const docSnap = await db.collection('users').doc(docId).get();
                if (docSnap.exists) {
                    appData = docSnap.data();
                    await DataManager.save(appData); // Atualiza local
                }
            } catch(e) { console.warn("Erro sync login (possível offline):", e); }
            
        } catch (error) {
            console.warn("Firebase Auth falhou (tentando login local):", error.message);
        }
    }

    // Login Local (Fallback ou pós-sync)
    const user = appData.users.find(u => u.email === email && u.password === password);
    if(user) {
        loginUser(user);
    } else {
        alert('Erro no login: Usuário não encontrado ou senha incorreta.');
    }
});

// Integração de Recuperação de Senha com E-mail
document.querySelector('#login-form a').onclick = function(e) {
    e.preventDefault();
    const emailInput = document.getElementById('login-email').value;
    if (emailInput && emailInput.includes('@')) {
        // Tenta usar o reset do Firebase se disponível
        if (typeof firebase !== 'undefined' && firebaseConfig.apiKey) {
            firebase.auth().sendPasswordResetEmail(emailInput)
                .then(() => alert('Link de recuperação enviado pelo Firebase para seu e-mail.'))
                .catch((e) => alert('Erro: ' + e.message));
        } else {
             // Fallback para o sistema de email trigger (se já logado, o que é raro aqui)
            alert('Configuração de e-mail pendente. Entre em contato com o suporte.');
        }
    } else {
        alert('Por favor, preencha o campo de e-mail antes de clicar em "Esqueci minha senha".');
    }
};

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

// --- FUNÇÕES DE LISTAGEM (RECUPERADAS) ---
function switchListing(type) {
    currentListingType = type;
    document.querySelectorAll('#view-listagens .tab-btn').forEach(b => {
        if(b.innerText.toLowerCase().includes(type.substring(0,4))) b.classList.add('active');
        else b.classList.remove('active');
    });

    // Toggle Month Filter visibility
    const filterDiv = document.getElementById('movements-filter');
    if (type === 'movimentacoes') {
        filterDiv.classList.remove('hidden');
        if (!document.getElementById('listing-month-filter').value) {
            const today = new Date();
            const yyyy = today.getFullYear();
            const mm = String(today.getMonth() + 1).padStart(2, '0');
            document.getElementById('listing-month-filter').value = `${yyyy}-${mm}`;
        }
    } else {
        filterDiv.classList.add('hidden');
    }

    renderListingTable();
}

function renderListingTable() {
    const thead = document.getElementById('listing-thead');
    const tbody = document.getElementById('listing-tbody');
    tbody.innerHTML = '';
    
    const data = getUserData(); // Usa a função auxiliar restaurada

    if (currentListingType === 'clients') {
        thead.innerHTML = '<tr><th>Nome</th><th>Telefone</th><th>Email</th></tr>';
        (data.clients || []).forEach(c => tbody.innerHTML += `<tr><td>${c.name}</td><td>${c.phone}</td><td>${c.email}</td></tr>`);
    } else if (currentListingType === 'suppliers') {
        thead.innerHTML = '<tr><th>Nome</th><th>Contato</th><th>Telefone</th></tr>';
        (data.suppliers || []).forEach(s => tbody.innerHTML += `<tr><td>${s.name}</td><td>${s.contact_person}</td><td>${s.phone}</td></tr>`);
    } else if (currentListingType === 'products') {
        thead.innerHTML = '<tr><th>Produto</th><th>Preço</th><th>Descrição</th></tr>';
        (data.products || []).forEach(p => tbody.innerHTML += `<tr><td>${p.name}</td><td>R$ ${parseFloat(p.price).toFixed(2)}</td><td>${p.description}</td></tr>`);
    } else if (currentListingType === 'services') {
        thead.innerHTML = '<tr><th>Serviço</th><th>Preço</th><th>Descrição</th></tr>';
        (data.services || []).forEach(s => tbody.innerHTML += `<tr><td>${s.name}</td><td>R$ ${parseFloat(s.price).toFixed(2)}</td><td>${s.description}</td></tr>`);
    } else if (currentListingType === 'movimentacoes') {
        thead.innerHTML = '<tr><th>Data</th><th>Tipo</th><th>Categoria</th><th>Valor</th></tr>';
        const filterVal = document.getElementById('listing-month-filter').value;
        let list = data.transactions || [];
        
        if (filterVal) {
            list = list.filter(t => t.date.startsWith(filterVal));
        }
        
        // Sort Desc
        list.sort((a,b) => new Date(b.date) - new Date(a.date));

        list.forEach(t => {
            const color = t.type === 'receita' ? 'green' : 'red';
            tbody.innerHTML += `<tr><td>${t.date.split('-').reverse().join('/')}</td><td style="color:${color}">${t.type.toUpperCase()}</td><td>${t.category}</td><td>R$ ${parseFloat(t.value).toFixed(2)}</td></tr>`;
        });
    }
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

    // LOGICA ADMIN ROBUSTA (Corrigida e Melhorada)
    const adminPanel = document.getElementById('admin-panel');
    if (adminPanel) {
        // Normalização: Trim e Lowercase para evitar erros de digitação/espaços
        const userEmail = appData.currentUser && appData.currentUser.email ? appData.currentUser.email.toLowerCase().trim() : '';
        const isAdmin = (userEmail === 'jcnvap@gmail.com');

        if(isAdmin) {
            adminPanel.classList.remove('hidden');
            // Força display via style para garantir visibilidade contra CSS conflitante
            adminPanel.style.display = 'block';
        } else {
            adminPanel.classList.add('hidden');
            adminPanel.style.display = 'none';
        }
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

// --- FUNÇÕES FISCAIS (RECUPERADAS) ---
function renderIrrf() {
    const tbody = document.getElementById('irrf-table-body');
    tbody.innerHTML = '';
    
    // Sort by Max Base Ascending
    appData.irrfTable.sort((a,b) => a.max - b.max);

    appData.irrfTable.forEach(row => {
        const displayMax = row.max > 999999 ? 'Acima' : `R$ ${row.max.toFixed(2)}`;
        tbody.innerHTML += `
            <tr>
                <td>${displayMax}</td>
                <td>${row.rate}%</td>
                <td>R$ ${row.deduction.toFixed(2)}</td>
                <td><button class="text-danger" onclick="deleteIrrfRow('${row.id}')">🗑️</button></td>
            </tr>
        `;
    });
}

function openIrrfModal() {
    document.getElementById('form-irrf').reset();
    document.getElementById('irrf-id').value = '';
    document.getElementById('modal-irrf').classList.remove('hidden');
}

function saveIrrfRow(e) {
    e.preventDefault();
    const row = {
        id: 'irrf_' + Date.now(),
        max: parseFloat(document.getElementById('irrf-max').value),
        rate: parseFloat(document.getElementById('irrf-rate').value),
        deduction: parseFloat(document.getElementById('irrf-deduction').value)
    };
    appData.irrfTable.push(row);
    saveData();
    closeModal('modal-irrf');
    renderIrrf();
}

function deleteIrrfRow(id) {
    if(confirm('Excluir faixa?')) {
        appData.irrfTable = appData.irrfTable.filter(r => r.id !== id);
        saveData();
        renderIrrf();
    }
}

function renderMeiFiscalCalculations() {
    // 1. Get Active MEI Param (Highest Year <= Current Year, or just Highest)
    const currentYear = new Date().getFullYear();
    let param = appData.meiOptions.find(o => o.year === currentYear);
    if (!param) param = appData.meiOptions[0]; // Fallback to first available

    if (!param) {
        document.getElementById('mei-tax-body').innerHTML = '<tr><td colspan="4">Configure os parâmetros em Configurações.</td></tr>';
        return;
    }

    const inss = param.salary * (param.inssRate / 100);
    const icms = param.icms;
    const iss = param.iss;

    const tbodyTax = document.getElementById('mei-tax-body');
    tbodyTax.innerHTML = `
        <tr><td>Comércio/Indústria</td><td>R$ ${inss.toFixed(2)}</td><td>R$ ${icms.toFixed(2)} (ICMS)</td><td><strong>R$ ${(inss + icms).toFixed(2)}</strong></td></tr>
        <tr><td>Serviços</td><td>R$ ${inss.toFixed(2)}</td><td>R$ ${iss.toFixed(2)} (ISS)</td><td><strong>R$ ${(inss + iss).toFixed(2)}</strong></td></tr>
        <tr><td>Comércio + Serviços</td><td>R$ ${inss.toFixed(2)}</td><td>R$ ${(icms+iss).toFixed(2)}</td><td><strong>R$ ${(inss + icms + iss).toFixed(2)}</strong></td></tr>
    `;

    // Effective Rate Simulation
    const tbodyEff = document.getElementById('mei-effective-body');
    tbodyEff.innerHTML = '';
    const revenueSamples = [5000, 10000, 15000, 20000]; // Samples relative to limits
    
    // Fixed DAS Value Reference (Service + Commerce mixed worst case)
    const fixedDas = inss + icms + iss;

    revenueSamples.forEach(rev => {
        const effRate = (fixedDas / rev) * 100;
        tbodyEff.innerHTML += `
            <tr>
                <td>R$ ${rev.toFixed(2)}</td>
                <td>R$ ${fixedDas.toFixed(2)}</td>
                <td>${effRate.toFixed(2)}%</td>
            </tr>
        `;
    });
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

// --- FUNÇÃO DE TESTE DE E-MAIL (ADMIN) - ROBUSTA COM EMAILJS ---
async function sendTestEmail() {
    // Verificação de segurança robusta (case insensitive e trim)
    const userEmail = appData.currentUser && appData.currentUser.email ? appData.currentUser.email.toLowerCase().trim() : '';
    
    if (userEmail !== 'jcnvap@gmail.com') {
        alert("Acesso negado: Apenas o administrador pode executar este teste.");
        return;
    }

    const btn = document.activeElement; 
    let originalText = "Enviar E-mail de Teste (EmailJS Direto)";
    if(btn) originalText = btn.innerText;
    
    try {
        if(btn) {
            btn.innerText = "Enviando...";
            btn.disabled = true;
        }

        await sendAutomatedEmail(
            appData.currentUser.email,
            "Teste de Sistema - Gestor MEI",
            `
            <div style="font-family: Arial, sans-serif; color: #333;">
                <h3>Teste de Conectividade de E-mail</h3>
                <p>Olá, Administrador.</p>
                <p>Se você recebeu este e-mail, a integração entre o <strong>Gestor MEI</strong> e o <strong>EmailJS</strong> está funcionando corretamente.</p>
                <p><strong>Timestamp:</strong> ${new Date().toLocaleString('pt-BR')}</p>
                <hr>
                <p style="font-size: 12px; color: #666;">Enviado diretamente pelo Painel de Configurações.</p>
            </div>
            `,
            "admin_test_button"
        );

        alert("Solicitação enviada via EmailJS!\n\nVerifique sua caixa de entrada em instantes.");

    } catch (e) {
        console.error("Erro no teste de e-mail:", e);
        alert("Erro ao tentar enviar: " + e.message);
    } finally {
        if(btn) {
            btn.innerText = originalText;
            btn.disabled = false;
        }
    }
}