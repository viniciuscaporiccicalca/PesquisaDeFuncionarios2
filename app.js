// =================================================================================
// INÍCIO - CONFIGURAÇÕES DA API DO GOOGLE SHEETS
// O CLIENT_ID foi preenchido a partir do seu arquivo. PREENCHA O RESTANTE!
// =================================================================================
const CLIENT_ID = '871881215842-ce8o21jo64158hebq5sehmvlqqvul7oj.apps.googleusercontent.com'; // Preenchido do seu arquivo JSON
const API_KEY = 'AIzaSyD2UBHWhU8UXGhPL8sMkxPrIjFV7gOlqwc'; // ATENÇÃO: Cole sua Chave de API aqui
// --- CORREÇÃO APLICADA ABAIXO ---
const SPREADSHEET_ID = '1q3_n6I9MqLtn55dUBfb1F4VIdh3FCd1F5dK1c1K0Bjc'; // CORRIGIDO: Apenas o ID da planilha
const RANGE = 'Listagem Nova!A:J'; // ATENÇÃO: Altere 'Página1' para o nome da sua aba e defina o intervalo de colunas
// =================================================================================
// FIM - CONFIGURAÇÕES DA API DO GOOGLE SHEETS
// =================================================================================


const DISCOVERY_DOC = 'https://sheets.googleapis.com/$discovery/rest?version=v4';
const SCOPES = 'https://www.googleapis.com/auth/spreadsheets';

let tokenClient;
let gapiInited = false;
let gisInited = false;

const authorizeButton = document.getElementById('authorize_button');
const signoutButton = document.getElementById('signout_button');

/**
 * Funções de inicialização da API do Google
 */
function gapiLoaded() {
    gapi.load('client', initializeGapiClient);
}

async function initializeGapiClient() {
    await gapi.client.init({
        apiKey: API_KEY,
        discoveryDocs: [DISCOVERY_DOC],
    });
    gapiInited = true;
    maybeEnableButtons();
}

function gisLoaded() {
    tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID, //
        scope: SCOPES,
        callback: '', // O callback é tratado na promise da chamada
    });
    gisInited = true;
    maybeEnableButtons();
}

function maybeEnableButtons() {
    if (gapiInited && gisInited) {
        authorizeButton.style.display = 'block';
    }
}

authorizeButton.onclick = handleAuthClick;
signoutButton.onclick = handleSignoutClick;

function handleAuthClick() {
    tokenClient.callback = async (resp) => {
        if (resp.error !== undefined) {
            throw (resp);
        }
        signoutButton.style.display = 'block';
        authorizeButton.innerText = 'Atualizar Autorização';
        await carregarFuncionarios();
    };

    if (gapi.client.getToken() === null) {
        tokenClient.requestAccessToken({prompt: 'consent'});
    } else {
        tokenClient.requestAccessToken({prompt: ''});
    }
}

function handleSignoutClick() {
    const token = gapi.client.getToken();
    if (token !== null) {
        google.accounts.oauth2.revoke(token.access_token);
        gapi.client.setToken('');
        
        // Limpa a tabela e esconde o botão de sair
        const tableBody = document.getElementById('table-body');
        tableBody.innerHTML = '<tr><td colspan="9">Acesse sua conta Google para carregar os dados.</td></tr>';
        authorizeButton.innerText = 'Autorizar Acesso à Planilha';
        signoutButton.style.display = 'none';
    }
}


// --- LÓGICA DO APLICATIVO (Adaptada do seu código original) ---

document.addEventListener('DOMContentLoaded', () => {
    // Referências aos elementos do DOM
    const tableBody = document.getElementById('table-body');
    const searchInput = document.getElementById('search-input');
    const cadastroForm = document.getElementById('cadastro-form');
    
    const filterAniversario = document.getElementById('filter-aniversario');
    const filterAdmissao = document.getElementById('filter-admissao');
    const filterTempo = document.getElementById('filter-tempo');
    const clearFiltersBtn = document.getElementById('clear-filters-btn');

    let funcionarios = [];

    function popularFiltroTempo() {
        for (let i = 0; i <= 40; i++) {
            const option = document.createElement('option');
            option.value = i;
            option.textContent = `${i} ano(s)`;
            filterTempo.appendChild(option);
        }
    }

    // --- FUNÇÃO MODIFICADA PARA USAR A API DO GOOGLE SHEETS ---
    async function carregarFuncionarios() {
        try {
            const response = await gapi.client.sheets.spreadsheets.values.get({
                spreadsheetId: SPREADSHEET_ID,
                range: RANGE,
            });
            
            // Converte os dados da planilha (array de arrays) para um array de objetos
            const data = response.result.values;
            if (!data || data.length == 0) {
                tableBody.innerHTML = `<tr><td colspan="9">Nenhum dado encontrado na planilha. Verifique o nome da aba e o intervalo.</td></tr>`;
                return;
            }

            const headers = data[0]; // Pega a primeira linha como cabeçalho
            const funcionariosData = data.slice(1).map(row => {
                const func = {};
                headers.forEach((header, index) => {
                    func[header] = row[index];
                });
                return func;
            });

            funcionarios = funcionariosData;
            aplicarFiltros();

        } catch (error) {
            console.error("Erro ao carregar dados do Google Sheets:", error);
            const errorMsg = JSON.parse(error.body).error.message;
            tableBody.innerHTML = `<tr><td colspan="9">Falha ao carregar os dados: ${errorMsg}</td></tr>`;
        }
    }

    function renderTable(data) {
        tableBody.innerHTML = ''; 

        if (data.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="9">Nenhum funcionário encontrado com os filtros aplicados.</td></tr>`;
            return;
        }

        data.forEach(func => {
            const row = document.createElement('tr');
            // Os nomes das colunas devem ser EXATAMENTE IGUAIS aos da sua planilha
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
    
    // As funções de cálculo permanecem as mesmas
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

    // Event listeners dos filtros
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

    // --- FUNÇÃO MODIFICADA PARA CADASTRAR USANDO A API DO GOOGLE SHEETS ---
    cadastroForm.addEventListener('submit', async (event) => {
        event.preventDefault();

        const nome = document.getElementById('nome').value;
        const setor = document.getElementById('setor').value;
        const und = document.getElementById('und').value;
        const dataNascInput = document.getElementById('data-nasc').value;
        const dataAdmInput = document.getElementById('data-adm').value;

        const dataNascObj = new Date(dataNascInput + 'T00:00:00');
        const dataAdmObj = new Date(dataAdmInput + 'T00:00:00');
        
        const dataNascFormatada = dataNascObj.toLocaleDateString('pt-BR');
        const dataAdmFormatada = dataAdmObj.toLocaleDateString('pt-BR');

        // IMPORTANTE: A ordem dos valores aqui deve ser a mesma ordem das colunas na sua planilha
        const novaLinha = [
            nome,
            setor.toUpperCase(),
            und.toUpperCase(),
            calcularIdade(dataNascInput),
            dataNascObj.getMonth() + 1,
            dataNascFormatada,
            calcularTempoDeEmpresa(dataAdmInput),
            dataAdmObj.getMonth() + 1,
            dataAdmFormatada
        ];

        try {
            await gapi.client.sheets.spreadsheets.values.append({
                spreadsheetId: SPREADSHEET_ID,
                range: RANGE,
                valueInputOption: 'USER_ENTERED',
                resource: {
                    values: [novaLinha],
                },
            });

            alert('Funcionário cadastrado com sucesso!');
            await carregarFuncionarios(); 
            cadastroForm.reset();

        } catch (error) {
            console.error("Erro ao cadastrar funcionário:", error);
            alert("Não foi possível cadastrar o funcionário. Verifique se você está autorizado.");
        }
    });

    // Inicia a aplicação
    popularFiltroTempo();
    // A função carregarFuncionarios() agora é chamada após a autorização
});