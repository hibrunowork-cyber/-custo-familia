// ========== INCOME (Receitas) ==========
let dadosIncomeGlobal = [];

// Mapeamento de abreviações de meses
const MESES_ABREVIADOS = {
    'Janeiro': 'Jan',
    'Fevereiro': 'Fev',
    'Março': 'Mar',
    'Abril': 'Abr',
    'Maio': 'Mai',
    'Junho': 'Jun',
    'Julho': 'Jul',
    'Agosto': 'Ago',
    'Setembro': 'Set',
    'Outubro': 'Out',
    'Novembro': 'Nov',
    'Dezembro': 'Dez'
};

function abreviarMes(mesCompleto) {
    return MESES_ABREVIADOS[mesCompleto] || mesCompleto;
}

function inicializarIncome(dadosIncome) {
    if (!dadosIncome || dadosIncome.length === 0) {
        return;
    }

    dadosIncomeGlobal = dadosIncome;

    // Calcular total geral
    const totalGeral = dadosIncome.reduce((sum, item) => sum + item.valor, 0);
    const fonteTotalIncomeEl = document.getElementById('fonteTotalIncome');
    if (fonteTotalIncomeEl) {
        fonteTotalIncomeEl.textContent = `R$ ${totalGeral.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`;
    }

    // Preencher select de mês (mantendo nomes COMPLETOS no dropdown)
    const mesesSet = new Set();
    dadosIncome.forEach(item => {
        mesesSet.add(item.mes_chave);
    });
    const mesesArray = Array.from(mesesSet).sort();
    const mesFilterIncome = document.getElementById('filterMesIncome');
    if (mesFilterIncome) {
        // Obter mês vigente (atual)
        const hoje = new Date();
        const mesAtual = hoje.getMonth() + 1; // getMonth() retorna 0-11
        const anoAtual = hoje.getFullYear();
        const mesChaveAtual = `${anoAtual}-${String(mesAtual).padStart(2, '0')}`;
        
        mesesArray.forEach(mesChave => {
            const item = dadosIncome.find(d => d.mes_chave === mesChave);
            if (item) {
                const option = document.createElement('option');
                option.value = mesChave;
                // Manter nome COMPLETO no dropdown
                option.textContent = `${item.mes}/${item.ano}`;
                mesFilterIncome.appendChild(option);
            }
        });
        
        // Definir mês vigente como padrão se existir nos dados
        if (mesesArray.includes(mesChaveAtual)) {
            mesFilterIncome.value = mesChaveAtual;
            // Disparar evento de change para aplicar o filtro
            mesFilterIncome.dispatchEvent(new Event('change'));
        }
    }

    // Event listeners dos filtros
    const filterMesIncomeEl = document.getElementById('filterMesIncome');
    const filterFonteIncomeEl = document.getElementById('filterFonteIncome');
    const filterRecorrenciaIncomeEl = document.getElementById('filterRecorrenciaIncome');
    const btnResetarFiltrosIncomeEl = document.getElementById('btnResetarFiltrosIncome');

    if (filterMesIncomeEl) {
        filterMesIncomeEl.addEventListener('change', () => filtrarIncome());
    }
    if (filterFonteIncomeEl) {
        filterFonteIncomeEl.addEventListener('change', () => filtrarIncome());
    }
    if (filterRecorrenciaIncomeEl) {
        filterRecorrenciaIncomeEl.addEventListener('change', () => filtrarIncome());
    }
    if (btnResetarFiltrosIncomeEl) {
        btnResetarFiltrosIncomeEl.addEventListener('click', () => resetarFiltrosIncome());
    }

    // Calcular comparação com mês anterior
    calcularComparacaoMesIncome(dadosIncome);
    
    // Exibir dados inicialmente (aplicar filtros padrão)
    filtrarIncome();
}

function exibirIncome(dados) {
    const container = document.getElementById('categoriesListIncome');
    if (!container) return;
    
    container.innerHTML = '';

    if (!dados || dados.length === 0) {
        container.innerHTML = '<div class="empty-message">Nenhuma receita encontrada.</div>';
        return;
    }

    // Ordenar por mês (mais recente primeiro) e depois por valor (maior primeiro)
    const dadosOrdenados = [...dados].sort((a, b) => {
        const compMes = b.mes_chave.localeCompare(a.mes_chave);
        if (compMes !== 0) return compMes;
        return b.valor - a.valor;
    });

    dadosOrdenados.forEach(item => {
        const itemDiv = criarItemDivIncome(item);
        container.appendChild(itemDiv);
    });
}

function criarItemDivIncome(item) {
    const itemDiv = document.createElement('div');
    itemDiv.className = 'item';

    // Criar badge de fonte (tudo em caixa baixa)
    const fonteClass = item.fonte.toLowerCase().replace('ó', 'o').replace('ú', 'u');
    const fonteTexto = item.fonte.toLowerCase();
    const fonteBadge = `<span class="fonte-badge ${fonteClass}">${fonteTexto}</span>`;

    const descricao = item.recorrencia || item.receita || '';

    // Criar tag de recorrência
    let recorrenciaTag = '';
    if (item.frequencia) {
        const freqMap = {
            'mensal': 'mensal',
            'anual': 'anual',
            'pontual': 'pontual'
        };
        const freqLabel = freqMap[item.frequencia.toLowerCase()] || item.frequencia.toLowerCase();
        recorrenciaTag = `<span class="parcela-badge parcela-unica">${freqLabel}</span>`;
    }

    itemDiv.innerHTML = `
        ${fonteBadge}
        <div class="item-descricao">${descricao}</div>
        <div class="item-valor">R$ ${item.valor.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</div>
        ${recorrenciaTag}
    `;
    return itemDiv;
}

function filtrarIncome() {
    const filtroMes = document.getElementById('filterMesIncome')?.value || '';
    const filtroFonte = document.getElementById('filterFonteIncome')?.value || '';
    const filtroRecorrencia = document.getElementById('filterRecorrenciaIncome')?.value || '';

    let dadosFiltrados = dadosIncomeGlobal;

    if (filtroMes) {
        dadosFiltrados = dadosFiltrados.filter(item => item.mes_chave === filtroMes);
    }

    if (filtroFonte) {
        dadosFiltrados = dadosFiltrados.filter(item => item.fonte.toLowerCase() === filtroFonte.toLowerCase());
    }

    if (filtroRecorrencia) {
        dadosFiltrados = dadosFiltrados.filter(item => item.frequencia && item.frequencia.toLowerCase() === filtroRecorrencia.toLowerCase());
    }

    // Atualizar total
    const totalFiltrado = dadosFiltrados.reduce((sum, item) => sum + item.valor, 0);
    const fonteTotalIncomeEl = document.getElementById('fonteTotalIncome');
    if (fonteTotalIncomeEl) {
        fonteTotalIncomeEl.textContent = `R$ ${totalFiltrado.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`;
    }

    // Calcular comparação com mês anterior
    calcularComparacaoMesIncome(dadosFiltrados);

    exibirIncome(dadosFiltrados);
}

function resetarFiltrosIncome() {
    const filterMesIncomeEl = document.getElementById('filterMesIncome');
    const filterFonteIncomeEl = document.getElementById('filterFonteIncome');
    const filterRecorrenciaIncomeEl = document.getElementById('filterRecorrenciaIncome');

    if (filterMesIncomeEl) filterMesIncomeEl.value = '';
    if (filterFonteIncomeEl) filterFonteIncomeEl.value = '';
    if (filterRecorrenciaIncomeEl) filterRecorrenciaIncomeEl.value = '';

    filtrarIncome();
}

function calcularComparacaoMesIncome(dados) {
    const comparacaoValorEl = document.getElementById('comparacaoValorIncome');
    const comparacaoLabelEl = document.getElementById('comparacaoLabelIncome');
    
    if (!dadosIncomeGlobal || dadosIncomeGlobal.length === 0) {
        if (comparacaoValorEl) comparacaoValorEl.textContent = '- R$ 0,00';
        if (comparacaoLabelEl) comparacaoLabelEl.textContent = 'Sem dados';
        return;
    }

    // Usar TODOS os dados para calcular a comparação (não apenas os filtrados)
    // Agrupar por mês usando dadosIncomeGlobal
    const porMes = {};
    dadosIncomeGlobal.forEach(item => {
        if (!porMes[item.mes_chave]) {
            porMes[item.mes_chave] = 0;
        }
        porMes[item.mes_chave] += item.valor;
    });

    const mesesOrdenados = Object.keys(porMes).sort().reverse();
    
    if (mesesOrdenados.length < 2) {
        if (comparacaoValorEl) comparacaoValorEl.textContent = '- R$ 0,00';
        if (comparacaoLabelEl) comparacaoLabelEl.textContent = 'Sem dados anteriores';
        return;
    }

    // Determinar o mês atual: se há filtro de mês selecionado, usar ele; senão, usar o mais recente
    const filtroMes = document.getElementById('filterMesIncome')?.value || '';
    const mesAtual = filtroMes && mesesOrdenados.includes(filtroMes) ? filtroMes : mesesOrdenados[0];
    
    // Encontrar o mês anterior ao mês atual
    const indexMesAtual = mesesOrdenados.indexOf(mesAtual);
    if (indexMesAtual === -1 || indexMesAtual === mesesOrdenados.length - 1) {
        // Não há mês anterior
        if (comparacaoValorEl) comparacaoValorEl.textContent = '- R$ 0,00';
        if (comparacaoLabelEl) comparacaoLabelEl.textContent = 'Sem dados anteriores';
        return;
    }
    
    const mesAnterior = mesesOrdenados[indexMesAtual + 1];
    const valorAtual = porMes[mesAtual];
    const valorAnterior = porMes[mesAnterior];
    const diferenca = valorAtual - valorAnterior;
    const percentual = valorAnterior > 0 ? ((diferenca / valorAnterior) * 100).toFixed(1) : 0;

    const diferencaFormatada = diferenca >= 0 
        ? `+ R$ ${Math.abs(diferenca).toLocaleString('pt-BR', {minimumFractionDigits: 2})}`
        : `- R$ ${Math.abs(diferenca).toLocaleString('pt-BR', {minimumFractionDigits: 2})}`;

    // Formatar nome do mês anterior para exibição (sempre abreviado com ponto)
    const itemMesAnterior = dadosIncomeGlobal.find(d => d.mes_chave === mesAnterior);
    let nomeMesAnterior;
    if (itemMesAnterior) {
        const mesAbreviado = abreviarMes(itemMesAnterior.mes);
        nomeMesAnterior = `${mesAbreviado}./${itemMesAnterior.ano}`;
    } else {
        nomeMesAnterior = mesAnterior;
    }

    if (comparacaoValorEl) comparacaoValorEl.textContent = diferencaFormatada;
    if (comparacaoLabelEl) comparacaoLabelEl.textContent = `vs ${nomeMesAnterior} (${percentual >= 0 ? '+' : ''}${percentual}%)`;
}

