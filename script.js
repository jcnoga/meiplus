<!DOCTYPE html>
<html lang="pt-br">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>CRM Contábil - SaaS System</title>
    <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
    
    <style>
        :root {
            --primary: #2c3e50;
            --secondary: #3498db;
            --accent: #e74c3c;
            --success: #27ae60;
            --warning: #f1c40f;
            --bg: #f4f6f9;
            --text: #333;
            --white: #ffffff;
            --border: #ddd;
            /* Nova cor para inputs */
            --input-bg: #e8f4fd; 
            --input-border: #bbdefb;
            --input-text: #104e8b;
        }

        * { margin: 0; padding: 0; box-sizing: border-box; font-family: 'Roboto', sans-serif; }
        
        body { background-color: var(--bg); color: var(--text); height: 100vh; display: flex; flex-direction: column; }

        /* --- Utilitários --- */
        .hidden { display: none !important; }
        .btn { padding: 10px 15px; border: none; border-radius: 4px; cursor: pointer; font-weight: 500; transition: 0.2s; }
        .btn-primary { background: var(--secondary); color: var(--white); }
        .btn-primary:hover { background: #2980b9; }
        .btn-success { background: var(--success); color: var(--white); }
        .btn-danger { background: var(--accent); color: var(--white); }
        .btn-google { background: #db4437; color: white; display: flex; align-items: center; justify-content: center; gap: 10px; width: 100%; margin-top: 10px;}
        
        /* --- Telas de Autenticação --- */
        .auth-container {
            display: flex; justify-content: center; align-items: center; height: 100vh;
            background: linear-gradient(135deg, var(--primary), var(--secondary));
        }
        .auth-box {
            background: var(--white); padding: 40px; border-radius: 8px; width: 100%; max-width: 450px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.2);
        }
        .auth-box h2 { text-align: center; margin-bottom: 20px; color: var(--primary); }
        .form-group { margin-bottom: 15px; }
        .form-group label { display: block; margin-bottom: 5px; font-weight: 500; font-size: 0.9rem; }
        
        /* Input Padrão (Login) */
        .form-group input, .form-group select { width: 100%; padding: 10px; border: 1px solid var(--border); border-radius: 4px; }
        
        .auth-links { margin-top: 15px; text-align: center; font-size: 0.9rem; }
        .auth-links a { color: var(--secondary); text-decoration: none; cursor: pointer; }

        /* --- Dashboard Layout --- */
        .dashboard-container { display: flex; height: 100vh; overflow: hidden; }
        
        /* Sidebar */
        .sidebar { width: 250px; background: var(--primary); color: var(--white); display: flex; flex-direction: column; }
        .sidebar-header { padding: 20px; font-size: 1.2rem; font-weight: bold; border-bottom: 1px solid rgba(255,255,255,0.1); }
        .sidebar-menu { flex: 1; padding: 20px 0; }
        .menu-item { padding: 15px 20px; cursor: pointer; display: flex; align-items: center; gap: 10px; transition: 0.2s; }
        .menu-item:hover, .menu-item.active { background: rgba(255,255,255,0.1); border-left: 4px solid var(--secondary); }
        .user-info { padding: 20px; border-top: 1px solid rgba(255,255,255,0.1); font-size: 0.9rem; }

        /* Main Content */
        .main-content { flex: 1; overflow-y: auto; padding: 20px; }
        .header-bar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
        .card { background: var(--white); padding: 20px; border-radius: 8px; box-shadow: 0 2px 5px rgba(0,0,0,0.05); margin-bottom: 20px; }
        
        /* CRM Tables & Lists */
        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid var(--border); }
        th { background-color: #f8f9fa; font-weight: 600; color: var(--primary); }
        
        /* Status Badges */
        .badge { padding: 4px 8px; border-radius: 12px; font-size: 0.75rem; font-weight: bold; }
        .badge-simples { background: #e3f2fd; color: #1565c0; }
        .badge-lp { background: #fff3e0; color: #ef6c00; }
        .badge-lr { background: #fce4ec; color: #c2185b; }
        .badge-mei { background: #e8f5e9; color: #2e7d32; }

        /* Pipeline Styles */
        .pipeline-board { display: flex; gap: 20px; overflow-x: auto; padding-bottom: 20px; }
        .pipeline-column { min-width: 300px; background: #e9ecef; border-radius: 6px; padding: 10px; }
        .pipeline-header { font-weight: bold; margin-bottom: 10px; padding: 5px; color: var(--primary); border-bottom: 2px solid var(--border); }
        .lead-card { background: var(--white); padding: 15px; margin-bottom: 10px; border-radius: 4px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); cursor: pointer; border-left: 3px solid var(--secondary); }
        .lead-card:hover { transform: translateY(-2px); transition: 0.2s; }
        
        /* Modal & Form Modernization */
        .modal { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; justify-content: center; align-items: center; z-index: 1000; }
        .modal-content { background: var(--white); padding: 0; border-radius: 8px; width: 90%; max-width: 900px; max-height: 90vh; overflow-y: auto; position: relative; display: flex; flex-direction: column; }
        
        .modal-header { padding: 20px; background: var(--primary); color: white; border-top-left-radius: 8px; border-top-right-radius: 8px; display: flex; justify-content: space-between; align-items: center; }
        .modal-body { padding: 25px; overflow-y: auto; }
        .modal-footer { padding: 15px 25px; border-top: 1px solid #eee; background: #f9f9f9; text-align: right; border-bottom-left-radius: 8px; border-bottom-right-radius: 8px;}
        
        .close-modal { font-size: 1.5rem; cursor: pointer; color: white; opacity: 0.8; }
        .close-modal:hover { opacity: 1; }

        /* Estilo Moderno do Formulário com Inputs Azuis */
        .form-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px; }
        .col-span-1 { grid-column: span 1; }
        .col-span-2 { grid-column: span 2; }
        .col-span-3 { grid-column: span 3; }
        
        /* Section Headers */
        .section-title {
            grid-column: span 3;
            margin-top: 20px;
            margin-bottom: 10px;
            padding-bottom: 5px;
            border-bottom: 2px solid var(--secondary);
            color: var(--primary);
            font-size: 1.1rem;
            font-weight: 500;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        .section-title i { color: var(--secondary); }

        /* Estilo específico dos inputs do sistema (Modern Blue) */
        .app-input {
            width: 100%;
            padding: 12px;
            border: 1px solid var(--input-border);
            border-radius: 6px;
            background-color: var(--input-bg);
            color: var(--input-text);
            font-weight: 500;
            transition: all 0.3s ease;
        }
        .app-input::placeholder { color: #8ab6d6; font-weight: normal; }
        .app-input:focus {
            outline: none;
            border-color: var(--secondary);
            background-color: #fff; /* Fica branco ao focar para contraste */
            box-shadow: 0 0 0 3px rgba(52, 152, 219, 0.2);
        }
        .app-label {
            display: block;
            margin-bottom: 5px;
            font-size: 0.85rem;
            color: #555;
            font-weight: 600;
        }

        /* Obrigações Box */
        .obligations-box { background: #f1f8e9; border: 1px solid #c5e1a5; padding: 15px; border-radius: 6px; margin-top: 10px; font-size: 0.9rem; }
        .obligations-box h4 { color: #33691e; margin-bottom: 5px; }

        /* Responsive */
        @media (max-width: 768px) {
            .form-grid { grid-template-columns: 1fr; }
            .col-span-1, .col-span-2, .col-span-3, .section-title { grid-column: span 1; }
        }

    </style>
</head>
<body>

    <!-- 1. TELA DE LOGIN -->
    <div id="login-screen" class="auth-container">
        <div class="auth-box">
            <h2><i class="fas fa-calculator"></i> Contador SaaS</h2>
            <form onsubmit="handleLogin(event)">
                <div class="form-group">
                    <label>Email</label>
                    <input type="email" id="login-email" required placeholder="admin@contabil.com">
                </div>
                <div class="form-group">
                    <label>Senha</label>
                    <input type="password" id="login-pass" required placeholder="******">
                </div>
                <button type="submit" class="btn btn-primary" style="width:100%">Entrar</button>
            </form>
            
            <button class="btn btn-google" onclick="handleGoogleLogin()">
                <i class="fab fa-google"></i> Entrar com Google
            </button>

            <div class="auth-links">
                <a onclick="showScreen('register-screen')">Criar conta do Escritório</a> | 
                <a onclick="handleForgotPass()">Esqueci minha senha</a>
            </div>
        </div>
    </div>

    <!-- 2. TELA DE CADASTRO (ESCRITÓRIO) -->
    <div id="register-screen" class="auth-container hidden">
        <div class="auth-box">
            <h2>Cadastro do Escritório</h2>
            <form onsubmit="handleRegister(event)">
                <div class="form-group">
                    <label>Nome do Contador/Escritório</label>
                    <input type="text" id="reg-name" required>
                </div>
                <div class="form-group">
                    <label>Email</label>
                    <input type="email" id="reg-email" required>
                </div>
                <div class="form-group">
                    <label>Senha</label>
                    <input type="password" id="reg-pass" required>
                </div>
                <div class="form-group">
                    <label>Confirmar Senha</label>
                    <input type="password" id="reg-pass-conf" required>
                </div>
                <button type="submit" class="btn btn-primary" style="width:100%">Cadastrar</button>
            </form>
            <div class="auth-links">
                <a onclick="showScreen('login-screen')">Voltar para Login</a>
            </div>
        </div>
    </div>

    <!-- 3. SISTEMA PRINCIPAL (DASHBOARD) -->
    <div id="app-screen" class="dashboard-container hidden">
        <!-- Sidebar -->
        <div class="sidebar">
            <div class="sidebar-header">
                <i class="fas fa-chart-line"></i> Contábil Pro
            </div>
            <div class="sidebar-menu">
                <div class="menu-item active" onclick="switchTab('dashboard')">
                    <i class="fas fa-home"></i> Dashboard
                </div>
                <div class="menu-item" onclick="switchTab('clients')">
                    <i class="fas fa-users"></i> CRM Clientes
                </div>
                <div class="menu-item" onclick="switchTab('pipeline')">
                    <i class="fas fa-funnel-dollar"></i> Pipeline de Vendas
                </div>
            </div>
            <div class="user-info">
                <span id="user-display">Usuário</span>
                <br>
                <a href="#" onclick="logout()" style="color: #bdc3c7; font-size: 0.8rem;">Sair</a>
            </div>
        </div>

        <!-- Conteúdo -->
        <div class="main-content">
            
            <!-- Tab: Dashboard -->
            <div id="tab-dashboard">
                <div class="header-bar">
                    <h2>Visão Geral</h2>
                </div>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px;">
                    <div class="card">
                        <h3>Clientes Ativos</h3>
                        <h1 id="total-clients">0</h1>
                    </div>
                    <div class="card">
                        <h3>Leads no Pipeline</h3>
                        <h1 id="total-leads">0</h1>
                    </div>
                    <div class="card">
                        <h3>Certificados Vencendo</h3>
                        <h1 id="total-expired" style="color: var(--accent);">0</h1>
                    </div>
                </div>
            </div>

            <!-- Tab: Gestão de Clientes (CRM) -->
            <div id="tab-clients" class="hidden">
                <div class="header-bar">
                    <h2>Gestão de Clientes</h2>
                    <button class="btn btn-primary" onclick="openClientModal()">+ Novo Cliente</button>
                </div>
                
                <div class="card">
                    <input type="text" id="search-client" class="app-input" placeholder="Buscar por Razão Social, CNPJ ou Nome Fantasia..." style="background: white;" onkeyup="renderClientTable()">
                    
                    <table>
                        <thead>
                            <tr>
                                <th>Empresa</th>
                                <th>CNPJ / Regime</th>
                                <th>Contato Financeiro</th>
                                <th>Certificado Digital</th>
                                <th>Ações</th>
                            </tr>
                        </thead>
                        <tbody id="client-table-body">
                            <!-- JS vai preencher -->
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- Tab: Pipeline (Leads) -->
            <div id="tab-pipeline" class="hidden">
                <div class="header-bar">
                    <h2>Pipeline de Vendas</h2>
                    <button class="btn btn-success" onclick="openLeadModal()">+ Novo Lead</button>
                </div>
                
                <div class="pipeline-board">
                    <!-- Coluna: Leads (Novo) -->
                    <div class="pipeline-column">
                        <div class="pipeline-header">Novos Leads</div>
                        <div id="col-leads-new"></div>
                    </div>
                    <!-- Coluna: Em Negociação -->
                    <div class="pipeline-column">
                        <div class="pipeline-header">Em Negociação</div>
                        <div id="col-leads-negotiation"></div>
                    </div>
                    <!-- Coluna: Fechamento (Para converter) -->
                    <div class="pipeline-column">
                        <div class="pipeline-header">Pronto p/ Contrato</div>
                        <div id="col-leads-closing"></div>
                    </div>
                </div>
            </div>

        </div>
    </div>

    <!-- MODAL CLIENTE (Cadastro Rico & Design Novo) -->
    <div id="client-modal" class="modal hidden">
        <div class="modal-content">
            <div class="modal-header">
                <h3><i class="fas fa-building"></i> Ficha Cadastral do Cliente</h3>
                <span class="close-modal" onclick="closeModal('client-modal')">&times;</span>
            </div>
            
            <div class="modal-body">
                <form id="client-form" onsubmit="saveClient(event)">
                    <input type="hidden" id="client-id">
                    
                    <div class="form-grid">
                        <!-- SEÇÃO 1: DADOS CADASTRAIS -->
                        <div class="section-title">
                            <i class="fas fa-id-card"></i> Dados da Empresa
                        </div>

                        <div class="col-span-2">
                            <label class="app-label">Razão Social</label>
                            <input type="text" id="c-razao" class="app-input" required>
                        </div>
                        <div class="col-span-1">
                            <label class="app-label">Nome Fantasia</label>
                            <input type="text" id="c-fantasia" class="app-input">
                        </div>
                        
                        <div class="col-span-1">
                            <label class="app-label">CNPJ</label>
                            <input type="text" id="c-cnpj" class="app-input" required placeholder="00.000.000/0000-00">
                        </div>
                        <div class="col-span-2">
                            <label class="app-label">CNAE Principal (Descrição/Código)</label>
                            <input type="text" id="c-cnae" class="app-input" placeholder="Ex: 62.01-5-00 - Desenvolvimento...">
                        </div>

                        <div class="col-span-1">
                            <label class="app-label">Inscrição Estadual</label>
                            <input type="text" id="c-ie" class="app-input">
                        </div>
                        <div class="col-span-1">
                            <label class="app-label">Inscrição Municipal</label>
                            <input type="text" id="c-im" class="app-input">
                        </div>
                        <div class="col-span-1">
                            <label class="app-label">Data de Abertura</label>
                            <input type="date" id="c-abertura" class="app-input">
                        </div>

                        <!-- SEÇÃO 2: FISCAL E SOCIETÁRIO -->
                        <div class="section-title">
                            <i class="fas fa-balance-scale"></i> Fiscal & Societário
                        </div>

                        <div class="col-span-1">
                            <label class="app-label">Regime Tributário</label>
                            <select id="c-regime" class="app-input" required onchange="updateObligationsPreview()">
                                <option value="">Selecione...</option>
                                <option value="Simples Nacional">Simples Nacional</option>
                                <option value="Lucro Presumido">Lucro Presumido</option>
                                <option value="Lucro Real">Lucro Real</option>
                                <option value="MEI">MEI</option>
                            </select>
                        </div>
                        <div class="col-span-1">
                            <label class="app-label">Dia Venc. Honorários</label>
                            <input type="number" id="c-honorario-dia" class="app-input" placeholder="Ex: 10" min="1" max="31">
                        </div>
                        <div class="col-span-1">
                            <label class="app-label">Validade Certificado Digital</label>
                            <input type="date" id="c-cert-date" class="app-input">
                        </div>

                        <div class="col-span-3">
                            <label class="app-label">Sócios (Nome e CPF)</label>
                            <input type="text" id="c-socios" class="app-input" placeholder="Sócio 1 (CPF), Sócio 2 (CPF)...">
                        </div>
                        
                        <div class="col-span-3" id="obligations-preview">
                            <!-- Preview das obrigações geradas via JS -->
                        </div>

                        <!-- SEÇÃO 3: CONTATO E OPERACIONAL -->
                        <div class="section-title">
                            <i class="fas fa-address-book"></i> Contato & Operacional
                        </div>

                        <div class="col-span-1">
                            <label class="app-label">Resp. Financeiro</label>
                            <input type="text" id="c-resp-fin" class="app-input" placeholder="Nome do responsável">
                        </div>
                        <div class="col-span-1">
                            <label class="app-label">Telefone Principal</label>
                            <input type="text" id="c-phone" class="app-input">
                        </div>
                        <div class="col-span-1">
                            <label class="app-label">Email Principal</label>
                            <input type="email" id="c-email" class="app-input">
                        </div>
                        <div class="col-span-3">
                            <label class="app-label">Email para Envio de Guias/Impostos</label>
                            <input type="text" id="c-email-impostos" class="app-input" placeholder="Pode separar por vírgula">
                        </div>

                        <!-- SEÇÃO 4: ACESSOS -->
                        <div class="section-title">
                            <i class="fas fa-key"></i> Acessos e Senhas
                        </div>

                        <div class="col-span-1">
                            <label class="app-label">Senha Gov.br / Cód. Simples</label>
                            <input type="text" id="c-senha-gov" class="app-input" placeholder="Confidencial">
                        </div>
                        <div class="col-span-2">
                            <label class="app-label">Pasta na Nuvem (Link)</label>
                            <input type="text" id="c-link-drive" class="app-input" placeholder="Google Drive / Dropbox URL">
                        </div>
                    </div>
                </form>
            </div>
            
            <div class="modal-footer">
                <button type="button" class="btn btn-danger" onclick="closeModal('client-modal')" style="margin-right: 10px;">Cancelar</button>
                <button type="button" class="btn btn-primary" onclick="submitClientForm()">Salvar Cliente</button>
            </div>
        </div>
    </div>

    <!-- MODAL LEAD -->
    <div id="lead-modal" class="modal hidden">
        <div class="modal-content" style="max-width: 500px;">
            <div class="modal-header">
                <h3>Novo Lead</h3>
                <span class="close-modal" onclick="closeModal('lead-modal')">&times;</span>
            </div>
            <div class="modal-body">
                <form id="lead-form" onsubmit="saveLead(event)">
                    <div class="form-group">
                        <label class="app-label">Nome do Lead / Empresa</label>
                        <input type="text" id="l-name" class="app-input" required style="background: white;">
                    </div>
                    <div class="form-group">
                        <label class="app-label">Origem</label>
                        <select id="l-source" class="app-input" style="background: white;">
                            <option value="Site">Site</option>
                            <option value="Indicação">Indicação</option>
                            <option value="Google Ads">Google Ads</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="app-label">Fase do Funil</label>
                        <select id="l-stage" class="app-input" style="background: white;">
                            <option value="new">Novo Lead</option>
                            <option value="negotiation">Em Negociação</option>
                            <option value="closing">Pronto p/ Contrato</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="app-label">Telefone/Email</label>
                        <input type="text" id="l-contact" class="app-input" required style="background: white;">
                    </div>
                    <button type="submit" class="btn btn-success" style="width: 100%; margin-top: 10px;">Salvar Lead</button>
                </form>
            </div>
        </div>
    </div>

    <script>
        // --- ESTADO DA APLICAÇÃO (Simulado no LocalStorage) ---
        const DB_KEY_CLIENTS = 'crm_clients';
        const DB_KEY_LEADS = 'crm_leads';
        const DB_KEY_USER = 'crm_user';

        // Inicialização
        let clients = JSON.parse(localStorage.getItem(DB_KEY_CLIENTS)) || [];
        let leads = JSON.parse(localStorage.getItem(DB_KEY_LEADS)) || [];
        let currentUser = localStorage.getItem(DB_KEY_USER);

        // --- AUTH LOGIC ---
        function init() {
            if (currentUser) {
                document.getElementById('user-display').innerText = currentUser;
                showScreen('app-screen');
                updateDashboard();
            } else {
                showScreen('login-screen');
            }
        }

        function handleLogin(e) {
            e.preventDefault();
            const email = document.getElementById('login-email').value;
            localStorage.setItem(DB_KEY_USER, email);
            currentUser = email;
            init();
        }

        function handleRegister(e) {
            e.preventDefault();
            const p1 = document.getElementById('reg-pass').value;
            const p2 = document.getElementById('reg-pass-conf').value;
            if(p1 !== p2) {
                alert("As senhas não conferem!");
                return;
            }
            alert("Escritório cadastrado com sucesso! Faça login.");
            showScreen('login-screen');
        }

        function handleGoogleLogin() {
            alert("Simulação: Redirecionando para autenticação Google OAuth2...");
            localStorage.setItem(DB_KEY_USER, "google.user@gmail.com");
            currentUser = "google.user@gmail.com";
            init();
        }

        function handleForgotPass() {
            const email = prompt("Digite seu email para recuperação:");
            if(email) alert(`Um link de recuperação foi enviado para ${email} (Simulado).`);
        }

        function logout() {
            localStorage.removeItem(DB_KEY_USER);
            currentUser = null;
            location.reload();
        }

        // --- NAVEGAÇÃO E UI ---
        function showScreen(id) {
            document.querySelectorAll('body > div').forEach(div => {
                if(div.className.includes('modal')) return;
                div.classList.add('hidden');
            });
            document.getElementById(id).classList.remove('hidden');
        }

        function switchTab(tabName) {
            document.querySelectorAll('.menu-item').forEach(el => el.classList.remove('active'));
            event.currentTarget.classList.add('active'); 

            document.getElementById('tab-dashboard').classList.add('hidden');
            document.getElementById('tab-clients').classList.add('hidden');
            document.getElementById('tab-pipeline').classList.add('hidden');

            document.getElementById('tab-' + tabName).classList.remove('hidden');

            if(tabName === 'clients') renderClientTable();
            if(tabName === 'pipeline') renderPipeline();
            if(tabName === 'dashboard') updateDashboard();
        }

        function closeModal(modalId) {
            document.getElementById(modalId).classList.add('hidden');
        }

        // --- LÓGICA DO CLIENTE ---
        function openClientModal(clientId = null) {
            document.getElementById('client-form').reset();
            document.getElementById('client-id').value = '';
            document.getElementById('obligations-preview').innerHTML = '';

            if (clientId) {
                const client = clients.find(c => c.id === clientId);
                if(client) {
                    // Campos Originais
                    document.getElementById('client-id').value = client.id;
                    document.getElementById('c-razao').value = client.razao || '';
                    document.getElementById('c-cnpj').value = client.cnpj || '';
                    document.getElementById('c-ie').value = client.ie || '';
                    document.getElementById('c-im').value = client.im || '';
                    document.getElementById('c-phone').value = client.phone || '';
                    document.getElementById('c-socios').value = client.socios || '';
                    document.getElementById('c-regime').value = client.regime || '';
                    document.getElementById('c-cert-date').value = client.certDate || '';

                    // Novos Campos
                    document.getElementById('c-fantasia').value = client.fantasia || '';
                    document.getElementById('c-cnae').value = client.cnae || '';
                    document.getElementById('c-abertura').value = client.abertura || '';
                    document.getElementById('c-honorario-dia').value = client.honorarioDia || '';
                    document.getElementById('c-resp-fin').value = client.respFin || '';
                    document.getElementById('c-email').value = client.email || '';
                    document.getElementById('c-email-impostos').value = client.emailImpostos || '';
                    document.getElementById('c-senha-gov').value = client.senhaGov || '';
                    document.getElementById('c-link-drive').value = client.linkDrive || '';

                    updateObligationsPreview();
                }
            }
            document.getElementById('client-modal').classList.remove('hidden');
        }

        function submitClientForm() {
            // Wrapper para disparar o evento de submit do form
            const form = document.getElementById('client-form');
            if(form.reportValidity()) {
                const event = new Event('submit');
                form.dispatchEvent(event);
            }
        }

        function updateObligationsPreview() {
            const regime = document.getElementById('c-regime').value;
            const container = document.getElementById('obligations-preview');
            let text = "";
            
            if(!regime) {
                container.innerHTML = "";
                return;
            }

            let obs = [];
            if(regime === 'Simples Nacional') obs = ['DAS Mensal', 'DeSTDA', 'DEFIS Anual'];
            else if(regime === 'Lucro Presumido') obs = ['DCTF', 'EFD Contribuições', 'SPED Fiscal', 'ECF', 'ECD', 'REINF'];
            else if(regime === 'Lucro Real') obs = ['DCTF', 'SPED Fiscal', 'EFD Contribuições', 'LALUR', 'ECF', 'ECD', 'REINF'];
            else if(regime === 'MEI') obs = ['DAS-MEI', 'DASN-SIMEI'];

            text = `
                <div class="obligations-box">
                    <h4><i class="fas fa-robot"></i> Parametrização Automática</h4>
                    <p>Com base no regime <strong>${regime}</strong>, o sistema ativou as seguintes obrigações:</p>
                    <ul>${obs.map(o => `<li>${o}</li>`).join('')}</ul>
                </div>
            `;
            container.innerHTML = text;
        }

        function saveClient(e) {
            e.preventDefault();
            const id = document.getElementById('client-id').value;
            
            const newClient = {
                id: id || Date.now().toString(),
                // Campos Originais
                razao: document.getElementById('c-razao').value,
                cnpj: document.getElementById('c-cnpj').value,
                ie: document.getElementById('c-ie').value,
                im: document.getElementById('c-im').value,
                phone: document.getElementById('c-phone').value,
                socios: document.getElementById('c-socios').value,
                regime: document.getElementById('c-regime').value,
                certDate: document.getElementById('c-cert-date').value,
                // Novos Campos
                fantasia: document.getElementById('c-fantasia').value,
                cnae: document.getElementById('c-cnae').value,
                abertura: document.getElementById('c-abertura').value,
                honorarioDia: document.getElementById('c-honorario-dia').value,
                respFin: document.getElementById('c-resp-fin').value,
                email: document.getElementById('c-email').value,
                emailImpostos: document.getElementById('c-email-impostos').value,
                senhaGov: document.getElementById('c-senha-gov').value,
                linkDrive: document.getElementById('c-link-drive').value
            };

            if(id) {
                const index = clients.findIndex(c => c.id === id);
                clients[index] = newClient;
            } else {
                clients.push(newClient);
            }

            localStorage.setItem(DB_KEY_CLIENTS, JSON.stringify(clients));
            closeModal('client-modal');
            renderClientTable();
            updateDashboard();
        }

        function renderClientTable() {
            const tbody = document.getElementById('client-table-body');
            const term = document.getElementById('search-client').value.toLowerCase();
            tbody.innerHTML = '';

            const filtered = clients.filter(c => {
                const r = c.razao ? c.razao.toLowerCase() : '';
                const f = c.fantasia ? c.fantasia.toLowerCase() : '';
                const doc = c.cnpj ? c.cnpj : '';
                return r.includes(term) || doc.includes(term) || f.includes(term);
            });

            filtered.forEach(c => {
                let badgeClass = 'badge-simples';
                if(c.regime === 'Lucro Presumido') badgeClass = 'badge-lp';
                if(c.regime === 'Lucro Real') badgeClass = 'badge-lr';
                if(c.regime === 'MEI') badgeClass = 'badge-mei';

                let certStatus = c.certDate ? new Date(c.certDate).toLocaleDateString('pt-BR') : 'Não informado';
                let certStyle = '';
                if(c.certDate) {
                    const today = new Date();
                    const exp = new Date(c.certDate);
                    const diffDays = Math.ceil((exp - today) / (1000 * 60 * 60 * 24));
                    if(diffDays < 0) {
                        certStatus += " (VENCIDO)";
                        certStyle = "color: red; font-weight: bold;";
                    } else if(diffDays < 30) {
                        certStatus += " (Vence em breve)";
                        certStyle = "color: orange; font-weight: bold;";
                    }
                }

                // Exibição mais completa na tabela
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>
                        <strong>${c.razao}</strong>
                        ${c.fantasia ? `<br><small style="color:#2980b9">${c.fantasia}</small>` : ''}
                    </td>
                    <td>
                        <div>${c.cnpj}</div>
                        <span class="badge ${badgeClass}" style="margin-top:2px; display:inline-block">${c.regime || 'Sem Regime'}</span>
                    </td>
                    <td>
                        ${c.respFin || 'N/A'}<br>
                        <small>${c.phone || ''}</small>
                    </td>
                    <td style="${certStyle}">${certStatus}</td>
                    <td>
                        <button class="btn btn-primary" style="padding: 5px 10px; font-size: 0.8rem" onclick="openClientModal('${c.id}')"><i class="fas fa-edit"></i></button>
                    </td>
                `;
                tbody.appendChild(tr);
            });
        }

        // --- LÓGICA DE PIPELINE ---
        function openLeadModal() {
            document.getElementById('lead-form').reset();
            document.getElementById('lead-modal').classList.remove('hidden');
        }

        function saveLead(e) {
            e.preventDefault();
            const lead = {
                id: Date.now().toString(),
                name: document.getElementById('l-name').value,
                source: document.getElementById('l-source').value,
                stage: document.getElementById('l-stage').value,
                contact: document.getElementById('l-contact').value
            };
            leads.push(lead);
            localStorage.setItem(DB_KEY_LEADS, JSON.stringify(leads));
            closeModal('lead-modal');
            renderPipeline();
            updateDashboard();
        }

        function renderPipeline() {
            const cols = {
                'new': document.getElementById('col-leads-new'),
                'negotiation': document.getElementById('col-leads-negotiation'),
                'closing': document.getElementById('col-leads-closing')
            };
            Object.values(cols).forEach(col => col.innerHTML = '');

            leads.forEach(l => {
                const card = document.createElement('div');
                card.className = 'lead-card';
                
                let convertBtn = '';
                if(l.stage === 'closing' || l.stage === 'negotiation') {
                    convertBtn = `<button class="btn btn-success" style="width:100%; margin-top:10px; font-size:0.8rem;" onclick="convertLeadToClient('${l.id}')"><i class="fas fa-check"></i> Converter em Cliente</button>`;
                }

                card.innerHTML = `
                    <div style="font-weight:bold;">${l.name}</div>
                    <div style="font-size:0.8rem; color:#666;">Origem: ${l.source}</div>
                    <div style="font-size:0.8rem; color:#666;">Contato: ${l.contact}</div>
                    ${convertBtn}
                `;
                if(cols[l.stage]) cols[l.stage].appendChild(card);
            });
        }

        function convertLeadToClient(leadId) {
            if(!confirm("Deseja transformar este Lead em um Cliente Ativo? Isso abrirá a ficha de cadastro.")) return;

            const leadIndex = leads.findIndex(l => l.id === leadId);
            const lead = leads[leadIndex];

            leads.splice(leadIndex, 1);
            localStorage.setItem(DB_KEY_LEADS, JSON.stringify(leads));

            openClientModal(); 
            // Preenche dados básicos vindos do lead
            document.getElementById('c-razao').value = lead.name;
            document.getElementById('c-phone').value = lead.contact;
            document.getElementById('c-fantasia').value = lead.name; // Sugere o nome do lead como fantasia tbm
            
            renderPipeline();
        }

        function updateDashboard() {
            document.getElementById('total-clients').innerText = clients.length;
            document.getElementById('total-leads').innerText = leads.length;

            const today = new Date();
            let expiredCount = 0;
            clients.forEach(c => {
                if(c.certDate) {
                    const exp = new Date(c.certDate);
                    if(exp < today) expiredCount++;
                }
            });
            document.getElementById('total-expired').innerText = expiredCount;
        }

        window.onload = init;

    </script>
</body>
</html>