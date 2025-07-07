// =================================================================================
// INÍCIO - CONFIGURAÇÕES DA API DO GOOGLE SHEETS
// =================================================================================
const CLIENT_ID = '871881215842-ce8o21jo64158hebq5sehmvlqqvul7oj.apps.googleusercontent.com'; // Preenchido do seu arquivo JSON
const API_KEY = 'AIzaSyD2UBHWhU8UXGhPL8sMkxPrIjFV7gOlqwc'; // ATENÇÃO: Cole sua Chave de API aqui
const SPREADSHEET_ID = '1q3_n6I9MqLtn55dUBfb1F4VIdh3FCd1F5dK1c1K0Bjc'; // Apenas o ID da planilha
const RANGE = 'Listagem Nova!A:J'; // ATENÇÃO: Altere para o nome da sua aba e o intervalo
// =================================================================================
// FIM - CONFIGURAÇÕES DA API DO GOOGLE SHEETS
// =================================================================================


const DISCOVERY_DOC = 'https://sheets.googleapis.com/$discovery/rest?version=v4';
const SCOPES = 'https://www.googleapis.com/auth/spreadsheets';

let tokenClient;
let gapiInited = false;
let gisInited = false;

console.log("DEBUG: Script app.js iniciado.");

const authorizeButton = document.getElementById('authorize_button');
const signoutButton = document.getElementById('signout_button');

/**
 * Funções de inicialização da API do Google
 */
function gapiLoaded() {
    console.log("DEBUG: gapiLoaded() foi chamada. Carregando cliente GAPI...");
    gapi.load('client', initializeGapiClient);
}

async function initializeGapiClient() {
    console.log("DEBUG: initializeGapiClient() - Iniciando cliente GAPI...");
    await gapi.client.init({
        apiKey: API_KEY,
        discoveryDocs: [DISCOVERY_DOC],
    });
    gapiInited = true;
    console.log("DEBUG: initializeGapiClient() - Cliente GAPI inicializado com sucesso.");
    maybeEnableButtons();
}

function gisLoaded() {
    console.log("DEBUG: gisLoaded() foi chamada. Carregando cliente de token do Google Identity...");
    tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        callback: '', // O callback é tratado na promise da chamada
    });
    gisInited = true;
    console.log("DEBUG: gisLoaded() - Cliente de token GIS inicializado com sucesso.");
    maybeEnableButtons();
}

function maybeEnableButtons() {
    console.log(`DEBUG: maybeEnableButtons() - Verificando status: gapiInited=${gapiInited}, gisInited=${gisInited}`);
    if (gapiInited && gisInited) {
        authorizeButton.style.display = 'block';
        console.log("DEBUG: maybeEnableButtons() - Condições satisfeitas. Botão de autorização exibido.");
    }
}

authorizeButton.onclick = handleAuthClick;
signoutButton.onclick = handleSignoutClick;

function handleAuthClick() {
    console.log("DEBUG: handleAuthClick() - Botão de autorização clicado.");
    tokenClient.callback = async (resp) => {
        console.log("DEBUG: tokenClient.callback - Callback do token recebido.");
        if (resp.error !== undefined) {
            console.error("DEBUG: Erro no callback do token:", resp);
            throw (resp);
        }
        console.log("DEBUG: tokenClient.callback - Autenticação bem-sucedida. Preparando para carregar funcionários...");
        signoutButton.style.display = 'block';
        authorizeButton.innerText = 'Atualizar Autorização';
        await carregarFuncionarios();
    };

    if (gapi.client.getToken() === null) {
        console.log("DEBUG: handleAuthClick() - Nenhum token encontrado. Solicitando novo token com consentimento.");
        tokenClient.requestAccessToken({prompt: 'consent'});
    } else {
        console.log("DEBUG: handleAuthClick() - Token existente encontrado. Solicitando token silenciosamente.");
        tokenClient.requestAccessToken({prompt: ''});
    }
}

function handleSignoutClick() {
    console.log("DEBUG: handleSignoutClick() - Botão de sair clicado.");
    const token = gapi.client.getToken();
    if (token !== null) {
        google.accounts.oauth2.revoke(token.access_token);
        gapi.client.setToken('');
        
        const tableBody = document.getElementById('table-body');
        tableBody.innerHTML = '<tr><td colspan="9">Acesse sua conta Google para carregar os dados.</td></tr>';
        authorizeButton.innerText = 'Autorizar Acesso à Planilha';
        signoutButton.style.display = 'none';
        console.log("DEBUG: handleSignoutClick() - Logout realizado com sucesso.");
    }
}


// =================================================================================
// INÍCIO - LÓGICA DO APLICATIVO
// =================================================================================

let funcionarios = [];

async function carregarFuncionarios() {
    console.log("%cDEBUG: carregarFuncionarios() - Função iniciada.", "color: blue; font-weight: bold;");
    const tableBody = document.getElementById('table-body');
    try {
        console.log(`DEBUG: carregarFuncionarios() - Tentando buscar dados da planilha. ID: ${SPREADSHEET_ID}, Range: ${RANGE}`);
        const response = await gapi.client.sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: RANGE,
        });
        
        console.log("DEBUG: carregarFuncionarios() - Resposta da API recebida com sucesso.");
        console.log("DEBUG: Resposta completa da API:", response);

        const data = response.result.values;
        if (!data || data.length === 0) {
            console.warn("DEBUG: carregarFuncionarios() - Nenhum dado encontrado na resposta da API (values está vazio ou nulo).");
            tableBody.innerHTML = `<tr><td colspan="9">Nenhum dado encontrado na planilha. Verifique o nome da aba e o intervalo.</td></tr>`;
            return;
        }

        console.log(`DEBUG: carregarFuncionarios() - ${data.length} linhas recebidas. Processando...`);
        const headers = data[0];
        console.log("DEBUG: Cabeçalhos da planilha:", headers);
        const funcionariosData = data.slice(1).map(row => {
            const func = {};
            headers.forEach((header, index) => {
                func[header] = row[index];
            });
            return func;
        });

        funcionarios = funcionariosData;
        console.log("DEBUG: carregarFuncionarios() - Dados processados. Chamando aplicarFiltros().");
        aplicarFiltros();

    } catch (error) {
        console.error("%cERRO CRÍTICO em carregarFuncionarios():", "color: red; font-size: 1.2em;");
        console.error("Objeto do erro:", error);
        const errorMsg = error.result?.error?.message || error.message || "Erro desconhecido.";
        tableBody.innerHTML = `<tr><td colspan="9">Falha ao carregar os dados: ${errorMsg} (Verifique o console para mais detalhes)</td></tr>`;
    }
}

function renderTable(data) {
    console.log(`DEBUG: renderTable() - Renderizando tabela com ${data.length} linhas.`);
    const tableBody = document.getElementById('table-body');
    tableBody.innerHTML = ''; 

    if (data.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="9">Nenhum funcionário encontrado com os filtros aplicados.</td></tr>`;
        return;
    }

    data.forEach(func => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${func.NOME || ''}</td>
            <td>${func.SETOR || ''}</td>
            <td>${func.Unidade || ''}</td>
            <td>${func.Idade || ''}</td>
            <td>${func['Mês Nasc.'] || ''}</td>
            <td>${func['Data Nasc.'] || ''}</td>
            <td>${func['Tempo de Empresa'] !== undefined ? func['Tempo de Empresa'] : ''}</td>
            <td>${func['Mês Adm.'] || ''}</td>
            <td>${func['Data Adm.'] || ''}</td>
        `;
        tableBody.appendChild(row);
    });
}

function aplicarFiltros() {
    console.log("DEBUG: aplicarFiltros() - Aplicando filtros na lista de funcionários.");
    // ... (o resto das funções permanece igual, os logs principais estão no carregamento)
    const searchInput = document.getElementById('search-input');
    const filterAniversario = document.getElementById('filter-aniversario');
    const filterAdmissao = document.getElementById('filter-admissao');
    const filterTempo = document.getElementById('filter-tempo');

    const searchTerm = searchInput.value.toLowerCase();
    const mesAniversario = filterAniversario.value;
    const mesAdmissao = filterAdmissao.value;
    const tempoEmpresa = filterTempo.value;

    let filteredData = funcionarios;

    if (searchTerm) {
        filteredData = filteredData.filter(func =>
            (func.NOME?.toLowerCase().includes(searchTerm) ||
             func.SETOR?.toLowerCase().includes(searchTerm) ||
             func.Unidade?.toLowerCase().includes(searchTerm))
        );
    }
    if (mesAniversario) {
        filteredData = filteredData.filter(func => func['Mês Nasc.'] == mesAniversario);
    }
    if (mesAdmissao) {
        filteredData = filteredData.filter(func => func['Mês Adm.'] == mesAdmissao);
    }
    if (tempoEmpresa !== '') {
        filteredData = filteredData.filter(func => func['Tempo de Empresa'] == tempoEmpresa);
    }
    renderTable(filteredData);
}

function calcularIdade(dataNasc) {
    const hoje = new Date();
    const nasc = new Date(dataNasc);
    let idade = hoje.getFullYear() - nasc.getFullYear();
    const m = hoje.getMonth() - nasc.getMonth();
    if (m < 0 || (m === 0 && hoje.getDate() < nasc.getDate())) {
        idade--;
    }
    return idade;
}

function calcularTempoDeEmpresa(dataAdm) {
    const hoje = new Date();
    const adm = new Date(dataAdm);
    let anos = hoje.getFullYear() - adm.getFullYear();
    const m = hoje.getMonth() - adm.getMonth();
    if (m < 0 || (m === 0 && hoje.getDate() < adm.getDate())) {
        anos--;
    }
    return anos;
}

document.addEventListener('DOMContentLoaded', () => {
    console.log("DEBUG: DOMContentLoaded - Documento HTML carregado. Inicializando listeners e formulários.");
    const searchInput = document.getElementById('search-input');
    const cadastroForm = document.getElementById('cadastro-form');
    const filterAniversario = document.getElementById('filter-aniversario');
    const filterAdmissao = document.getElementById('filter-admissao');
    const filterTempo = document.getElementById('filter-tempo');
    const clearFiltersBtn = document.getElementById('clear-filters-btn');

    function popularFiltroTempo() {
        for (let i = 0; i <= 40; i++) {
            const option = document.createElement('option');
            option.value = i;
            option.textContent = `${i} ano(s)`;
            filterTempo.appendChild(option);
        }
    }
    
    searchInput.addEventListener('input', aplicarFiltros);
    filterAniversario.addEventListener('change', aplicarFiltros);
    filterAdmissao.addEventListener('change', aplicarFiltros);
    filterTempo.addEventListener('change', aplicarFiltros);
    
    clearFiltersBtn.addEventListener('click', () => {
        searchInput.value = '';
        filterAniversario.value = '';
        filterAdmissao.value = '';
        filterTempo.value = '';
        aplicarFiltros();
    });

    cadastroForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        console.log("DEBUG: Formulário de cadastro enviado.");

        const nome = document.getElementById('nome').value;
        // ... (resto dos campos)

        const novaLinha = [ /* ... */ ];
        console.log("DEBUG: Enviando nova linha para a planilha:", novaLinha);

        try {
            await gapi.client.sheets.spreadsheets.values.append({
                spreadsheetId: SPREADSHEET_ID,
                range: RANGE,
                valueInputOption: 'USER_ENTERED',
                resource: {
                    values: [novaLinha],
                },
            });

            console.log("DEBUG: Funcionário cadastrado com sucesso na planilha.");
            alert('Funcionário cadastrado com sucesso!');
            await carregarFuncionarios(); 
            cadastroForm.reset();

        } catch (error) {
            console.error("ERRO CRÍTICO ao cadastrar funcionário:", error);
            alert("Não foi possível cadastrar o funcionário. Verifique o console para mais detalhes.");
        }
    });

    popularFiltroTempo();
});