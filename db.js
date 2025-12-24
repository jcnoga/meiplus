// db.js - Gerenciamento de dados híbrido (IndexedDB + Firebase)

const DB_NAME = 'MEI_SYSTEM_V11_HYBRID';
const DB_VERSION = 1;
let db;

// Estrutura do banco de dados IndexedDB
const initIndexedDB = () => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
            db = request.result;
            resolve(db);
        };
        
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            
            // Object stores para cada tipo de dado
            const stores = [
                'users',
                'products',
                'services',
                'clients',
                'suppliers',
                'transactions',
                'rpas',
                'appointments',
                'settings',
                'syncQueue'
            ];
            
            stores.forEach(storeName => {
                if (!db.objectStoreNames.contains(storeName)) {
                    const store = db.createObjectStore(storeName, { keyPath: 'id' });
                    
                    // Criar índices para busca eficiente
                    if (storeName === 'users') {
                        store.createIndex('email', 'email', { unique: true });
                    }
                    if (storeName === 'transactions') {
                        store.createIndex('date', 'date');
                        store.createIndex('type', 'type');
                    }
                    if (storeName === 'appointments') {
                        store.createIndex('date', 'date');
                        store.createIndex('status', 'status');
                    }
                }
            });
        };
    });
};

// Funções CRUD genéricas para IndexedDB
const saveToIndexedDB = (storeName, data) => {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject(new Error('Database not initialized'));
            return;
        }
        
        const transaction = db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        
        if (Array.isArray(data)) {
            data.forEach(item => {
                item.updatedAt = new Date().toISOString();
                store.put(item);
            });
        } else {
            data.updatedAt = new Date().toISOString();
            store.put(data);
        }
        
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
    });
};

const getFromIndexedDB = (storeName, id) => {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject(new Error('Database not initialized'));
            return;
        }
        
        const transaction = db.transaction([storeName], 'readonly');
        const store = transaction.objectStore(storeName);
        const request = id ? store.get(id) : store.getAll();
        
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
};

const deleteFromIndexedDB = (storeName, id) => {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject(new Error('Database not initialized'));
            return;
        }
        
        const transaction = db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.delete(id);
        
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
};

// Funções específicas para usuários
const getUserFromIndexedDB = async (email) => {
    if (!db) return null;
    
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['users'], 'readonly');
        const store = transaction.objectStore('users');
        const index = store.index('email');
        const request = index.get(email);
        
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
};

const getAllLocalData = async () => {
    if (!db) return {};
    
    const stores = ['products', 'services', 'clients', 'suppliers', 'transactions', 'rpas', 'appointments'];
    const data = {};
    
    for (const storeName of stores) {
        data[storeName] = await getFromIndexedDB(storeName);
    }
    
    return data;
};

// Sistema de fila de sincronização para operações offline
const addToSyncQueue = async (operation) => {
    const queueItem = {
        id: `sync_${Date.now()}_${Math.random()}`,
        operation: operation.type,
        data: operation.data,
        timestamp: new Date().toISOString(),
        retries: 0
    };
    
    await saveToIndexedDB('syncQueue', queueItem);
};

const processSyncQueue = async () => {
    if (!db || !window.firebaseFunctions?.isOnline() || !window.firebaseFunctions?.isFirebaseAvailable()) {
        return;
    }
    
    const queue = await getFromIndexedDB('syncQueue');
    if (!queue || queue.length === 0) return;
    
    for (const item of queue) {
        try {
            // Executar operação no Firebase
            await executeFirebaseOperation(item);
            
            // Remover da fila após sucesso
            await deleteFromIndexedDB('syncQueue', item.id);
        } catch (error) {
            console.error('Erro ao processar item da fila:', error);
            item.retries += 1;
            
            if (item.retries < 3) {
                // Atualizar com nova tentativa
                await saveToIndexedDB('syncQueue', item);
            } else {
                // Remover após muitas tentativas falhas
                await deleteFromIndexedDB('syncQueue', item.id);
            }
        }
    }
};

// Funções de compatibilidade com código existente
const saveData = async () => {
    const userData = getUserData();
    const userId = appData.currentUser?.id;
    
    if (!userId) return;
    
    // Salvar dados do usuário atual
    await saveToIndexedDB('users', appData.currentUser);
    
    // Salvar cada coleção
    const stores = ['products', 'services', 'clients', 'suppliers', 'transactions', 'rpas', 'appointments'];
    for (const store of stores) {
        if (userData[store]) {
            await saveToIndexedDB(store, userData[store]);
        }
    }
    
    // Adicionar à fila de sincronização se online
    if (window.firebaseFunctions?.isOnline()) {
        await addToSyncQueue({
            type: 'fullSync',
            data: { userId, timestamp: new Date().toISOString() }
        });
        await processSyncQueue();
    }
};

const getUserData = () => {
    // Função de compatibilidade com código existente
    return appData.records[appData.currentUser.id] || {
        products: [], services: [], clients: [], suppliers: [],
        transactions: [], rpas: [], appointments: []
    };
};

// Carregar dados do IndexedDB para appData existente
const loadDataFromIndexedDB = async (userId) => {
    if (!db) return;
    
    if (!appData.records) appData.records = {};
    if (!appData.records[userId]) appData.records[userId] = {};
    
    const stores = ['products', 'services', 'clients', 'suppliers', 'transactions', 'rpas', 'appointments'];
    
    for (const store of stores) {
        const data = await getFromIndexedDB(store);
        appData.records[userId][store] = data || [];
    }
    
    // Carregar usuário
    const users = await getFromIndexedDB('users');
    const user = users.find(u => u.id === userId);
    if (user) {
        appData.currentUser = user;
        appData.users = users;
    }
    
    // Carregar tabela IRRF
    const settings = await getFromIndexedDB('settings');
    if (settings && settings.length > 0) {
        const irrfSetting = settings.find(s => s.key === 'irrfTable');
        if (irrfSetting) {
            appData.irrfTable = irrfSetting.value;
        }
    }
};

// Inicialização do sistema de banco de dados
const initDatabase = async () => {
    try {
        await initIndexedDB();
        console.log('IndexedDB inicializado');
        
        // Verificar se há dados no localStorage para migração
        const legacyData = localStorage.getItem('MEI_SYSTEM_V11');
        if (legacyData) {
            console.log('Migrando dados do localStorage para IndexedDB...');
            await migrateLegacyData(JSON.parse(legacyData));
            localStorage.removeItem('MEI_SYSTEM_V11');
        }
        
        // Iniciar processamento periódico da fila de sincronização
        setInterval(processSyncQueue, 30000); // A cada 30 segundos
        
        return true;
    } catch (error) {
        console.error('Erro ao inicializar banco de dados:', error);
        return false;
    }
};

// Migração de dados do localStorage para IndexedDB
const migrateLegacyData = async (legacyData) => {
    if (!legacyData || !db) return;
    
    // Migrar usuários
    if (legacyData.users && Array.isArray(legacyData.users)) {
        await saveToIndexedDB('users', legacyData.users);
    }
    
    // Migrar dados de cada usuário
    if (legacyData.records && typeof legacyData.records === 'object') {
        for (const [userId, userData] of Object.entries(legacyData.records)) {
            const stores = ['products', 'services', 'clients', 'suppliers', 'transactions', 'rpas', 'appointments'];
            
            for (const store of stores) {
                if (userData[store] && Array.isArray(userData[store])) {
                    await saveToIndexedDB(store, userData[store]);
                }
            }
        }
    }
    
    // Migrar tabela IRRF
    if (legacyData.irrfTable && Array.isArray(legacyData.irrfTable)) {
        await saveToIndexedDB('settings', {
            id: 'irrfTable',
            key: 'irrfTable',
            value: legacyData.irrfTable,
            updatedAt: new Date().toISOString()
        });
    }
    
    console.log('Migração de dados concluída');
};

// Exportar funções para uso global
window.dbFunctions = {
    initDatabase,
    saveData,
    getUserData,
    loadDataFromIndexedDB,
    saveToIndexedDB,
    getFromIndexedDB,
    deleteFromIndexedDB,
    getUserFromIndexedDB,
    addToSyncQueue,
    processSyncQueue
};