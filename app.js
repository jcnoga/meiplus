// app.js - Lógica principal adaptada para funcionamento híbrido

// Constantes globais
const DEFAULT_URL_FISCAL = "https://www.nfse.gov.br/EmissorNacional/Login?ReturnUrl=%2fEmissorNacional";
const DEFAULT_URL_DAS = "https://www8.receita.fazenda.gov.br/SimplesNacional/Aplicacoes/ATSPO/pgmei.app/Identificacao";

const DEFAULT_IRRF = [
    { id: 'irrf_1', max: 2259.20, rate: 0, deduction: 0 },
    { id: 'irrf_2', max: 2826.65, rate: 7.5, deduction: 169.44 },
    { id: 'irrf_3', max: 3751.05, rate: 15, deduction: 381.44 },
    { id: 'irrf_4', max: 4664.68, rate: 22.5, deduction: 662.77 },
    { id: 'irrf_5', max: 99999999, rate: 27.5, deduction: 896.00 }
];

// Estado global
let appData = { 
    currentUser: null, 
    users: [], 
    records: {}, 
    irrfTable: [] 
};

let currentCrudType = 'products';
let currentListingType = 'clients';
let currentFinanceFilter = 'all';

// Inicialização do aplicativo
async function init() {
    try {
        // Inicializar IndexedDB
        const dbReady = await window.dbFunctions?.initDatabase();
        if (!dbReady) {
            console.warn('IndexedDB não disponível, usando fallback');
            initLocalStorageFallback();
        }
        
        // Verificar autenticação Firebase
        if (window.firebaseFunctions?.isFirebaseAvailable()) {
            firebase.auth().onAuthStateChanged(async (user) => {
                if (user) {
                    await handleFirebaseAuth(user);
                } else {
                    checkLocalSession();
                }
            });
        } else {
            checkLocalSession();
        }
        
        // Configurar listeners de rede
        setupNetworkListeners();
        
    } catch (error) {
        console.error('Erro na inicialização:', error);
        initLocalStorageFallback();
        checkLocalSession();
    }
}

// Fallback para localStorage
function initLocalStorageFallback() {
    console.log('Usando localStorage como fallback');
    window.dbFunctions = {
        saveData: saveDataToLocalStorage,
        getUserData: getUserDataFromLocalStorage,
        loadDataFromIndexedDB: loadDataFromLocalStorage
    };
}

// Funções de autenticação adaptadas
async function handleFirebaseAuth(firebaseUser) {
    try {
        // Buscar ou criar usuário local
        let localUser = await window.dbFunctions.getUserFromIndexedDB(firebaseUser.email);
        
        if (!localUser) {
            // Criar novo usuário
            localUser = {
                id: firebaseUser.uid,
                name: firebaseUser.displayName || firebaseUser.email.split('@')[0],
                email: firebaseUser.email,
                licenseExpire: new Date().getTime() + (90 * 86400000),
                company: { reserve_rate: 10, prolabore_target: 4000 },
                firebaseUid: firebaseUser.uid
            };
            
            // Criar dados iniciais
            await createInitialUserData(localUser.id);
        }
        
        // Carregar dados do usuário
        await window.dbFunctions.loadDataFromIndexedDB(localUser.id);
        
        // Fazer login
        loginUser(localUser);
        
        // Sincronizar dados
        if (window.firebaseFunctions?.isOnline()) {
            await window.firebaseFunctions.syncLocalDataToCloud();
        }
        
    } catch (error) {
        console.error('Erro no handleFirebaseAuth:', error);
        showAuthStatus('Erro na autenticação', 'error');
    }
}

// Funções de sessão local
function checkLocalSession() {
    const sessionUser = sessionStorage.getItem('mei_user_id');
    if (sessionUser) {
        // Tentar carregar do IndexedDB
        window.dbFunctions.loadDataFromIndexedDB(sessionUser).then(() => {
            const user = appData.users.find(u => u.id === sessionUser);
            if (user) {
                loginUser(user);
            } else {
                showAuth();
            }
        }).catch(() => {
            showAuth();
        });
    } else {
        showAuth();
    }
}

// Funções de interface (mantidas do original com pequenas adaptações)
function showAuth() {
    document.getElementById('auth-screen').classList.remove('hidden');
    document.getElementById('app-container').classList.add('hidden');
}

function loginUser(user) {
    appData.currentUser = user;
    sessionStorage.setItem('mei_user_id', user.id);
    
    document.getElementById('auth-screen').classList.add('hidden');
    document.getElementById('app-container').classList.remove('hidden');
    document.getElementById('user-name-display').innerText = user.name;
    
    // Inicializar arrays se não existirem
    if (!appData.records[user.id].appointments) {
        appData.records[user.id].appointments = [];
    }
    
    checkLicense();
    updateSyncStatus();
    navTo('dashboard');
    loadFiscalReminders();
}

function logout() {
    if (window.firebaseFunctions?.isFirebaseAvailable()) {
        firebase.auth().signOut();
    }
    
    appData.currentUser = null;
    sessionStorage.removeItem('mei_user_id');
    
    // Sincronizar antes de sair
    if (window.firebaseFunctions?.isOnline()) {
        window.firebaseFunctions.syncLocalDataToCloud();
    }
    
    setTimeout(() => location.reload(), 500);
}

// Funções de sincronização
function updateSyncStatus() {
    const statusEl = document.getElementById('sync-status');
    if (!statusEl) return;
    
    const isOnline = window.firebaseFunctions?.isOnline();
    const hasFirebase = window.firebaseFunctions?.isFirebaseAvailable();
    
    if (!hasFirebase) {
        statusEl.textContent = '🔒 Modo Local';
        statusEl.className = 'text-xs mt-1 text-warning';
    } else if (!isOnline) {
        statusEl.textContent = '📴 Offline';
        statusEl.className = 'text-xs mt-1 text-danger';
    } else {
        statusEl.textContent = '🌐 Online (Sincronizado)';
        statusEl.className = 'text-xs mt-1 text-success';
    }
}

function setupNetworkListeners() {
    window.addEventListener('online', () => {
        document.getElementById('offline-warning')?.classList.add('hidden');
        updateSyncStatus();
        
        // Tentar sincronizar ao voltar online
        if (window.firebaseFunctions?.isFirebaseAvailable() && appData.currentUser) {
            window.firebaseFunctions.syncLocalDataToCloud();
            window.firebaseFunctions.syncCloudToLocal();
        }
    });
    
    window.addEventListener('offline', () => {
        document.getElementById('offline-warning')?.classList.remove('hidden');
        updateSyncStatus();
    });
    
    // Atualizar status periodicamente
    setInterval(updateSyncStatus, 30000);
}

// Funções de dados locais (para fallback)
function saveDataToLocalStorage() {
    try {
        localStorage.setItem('MEI_SYSTEM_V11', JSON.stringify(appData));
        
        // Adicionar à fila de sincronização se online
        if (window.firebaseFunctions?.isOnline() && window.firebaseFunctions?.isFirebaseAvailable()) {
            window.dbFunctions.addToSyncQueue({
                type: 'saveData',
                data: { userId: appData.currentUser?.id }
            });
        }
    } catch (e) {
        console.error('Erro ao salvar dados:', e);
    }
}

function getUserDataFromLocalStorage() {
    return appData.records[appData.currentUser.id] || {
        products: [], services: [], clients: [], suppliers: [],
        transactions: [], rpas: [], appointments: []
    };
}

async function loadDataFromLocalStorage(userId) {
    const saved = localStorage.getItem('MEI_SYSTEM_V11');
    if (saved) {
        appData = JSON.parse(saved);
    }
    
    // Inicializar tabela IRRF se não existir
    if (!appData.irrfTable || appData.irrfTable.length === 0) {
        appData.irrfTable = JSON.parse(JSON.stringify(DEFAULT_IRRF));
    }
}

// Funções de criação de dados iniciais
async function createInitialUserData(userId) {
    const today = new Date().toISOString().split('T')[0];
    
    const initialData = {
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
    
    appData.records[userId] = initialData;
    
    // Salvar no IndexedDB
    for (const [key, value] of Object.entries(initialData)) {
        await window.dbFunctions.saveToIndexedDB(key, value);
    }
}

// Funções de registro adaptadas
document.getElementById('register-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('reg-email').value;
    const name = document.getElementById('reg-name').value;
    const password = document.getElementById('reg-password').value;
    
    // Verificar se usuário já existe localmente
    const existingUser = await window.dbFunctions.getUserFromIndexedDB(email);
    if (existingUser) {
        alert('E-mail já existe!');
        return;
    }
    
    let userId;
    
    // Tentar criar no Firebase se disponível
    if (window.firebaseFunctions?.isFirebaseAvailable() && window.firebaseFunctions?.isOnline()) {
        try {
            const userCredential = await firebase.auth().createUserWithEmailAndPassword(email, password);
            userId = userCredential.user.uid;
            
            // Atualizar perfil
            await userCredential.user.updateProfile({
                displayName: name
            });
            
        } catch (error) {
            console.error('Erro ao criar conta Firebase:', error);
            // Fallback para ID local
            userId = 'u_' + Date.now();
        }
    } else {
        // Modo offline, usar ID local
        userId = 'u_' + Date.now();
    }
    
    // Criar objeto de usuário
    const newUser = {
        id: userId,
        name: name,
        email: email,
        password: password, // Nota: Em produção, nunca armazene senhas em texto claro
        licenseExpire: new Date().getTime() + (90 * 86400000),
        company: { reserve_rate: 10, prolabore_target: 4000 }
    };
    
    // Adicionar aos usuários
    appData.users.push(newUser);
    
    // Criar dados iniciais
    await createInitialUserData(userId);
    
    // Salvar usuário
    await window.dbFunctions.saveToIndexedDB('users', newUser);
    
    // Fazer login
    loginUser(newUser);
});

// Login local
document.getElementById('login-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    
    // Tentar Firebase primeiro
    if (window.firebaseFunctions?.isFirebaseAvailable() && window.firebaseFunctions?.isOnline()) {
        try {
            await firebase.auth().signInWithEmailAndPassword(email, password);
            return; // O onAuthStateChanged tratará o login
        } catch (error) {
            console.log('Firebase login failed, trying local:', error);
        }
    }
    
    // Fallback para login local
    const user = await window.dbFunctions.getUserFromIndexedDB(email);
    if (user && user.password === password) {
        await window.dbFunctions.loadDataFromIndexedDB(user.id);
        loginUser(user);
    } else {
        alert('Erro no login');
    }
});

// IMPORTANTE: Todas as outras funções do sistema original (renderAgenda, updateDashboard, etc.)
// devem ser mantidas EXATAMENTE como estão, apenas substituindo as chamadas de
// saveData() por window.dbFunctions.saveData() e getUserData() por window.dbFunctions.getUserData()

// Inicializar aplicativo quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', init);