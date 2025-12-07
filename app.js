const subcategoryFilters = {};
const categoryTotals = {};
let todasParcelas = [];
let categoriasOriginaisGlobal = [];

// Mapeamento de grupos de subcategorias - apenas para categoria COMPRAS
const SUBCATEGORY_GROUPS = {
    'COMPRAS': {
        'COMPRA ONLINE': ['ALIEXPRESS', 'AMAZON', 'MERCADO LIVRE']
    }
};

// Dados serão carregados via fetch no HTML

function inicializarDashboard(dados) {
    if (!dados || !Array.isArray(dados) || dados.length === 0) {
        console.error("❌ Erro: dados inválidos ou vazios em inicializarDashboard", dados);
        return;
    }
    
    console.log("📊 Processando", dados.length, "registros de Outcome");
    
    try {
        const totalGeral = dados.reduce((sum, item) => sum + (item.valor || 0), 0);
    const totalCompras = dados.length;
    const totalParceladas = dados.filter(d => d.parcela_atual).length;
    
    const categorias = {};
    dados.forEach(item => {
        if (!categorias[item.categoria]) {
            categorias[item.categoria] = {
                nome: item.categoria,
                total: 0,
                itens: [],
                subcategorias: new Set()
            };
        }
        categorias[item.categoria].total += item.valor;
        categorias[item.categoria].itens.push(item);
        categorias[item.categoria].subcategorias.add(item.subcategoria);
    });

    Object.values(categorias).forEach(cat => {
        cat.subcategorias = Array.from(cat.subcategorias).sort();
        categoryTotals[cat.nome] = cat.total;
    });
    
    const totalCategorias = Object.keys(categorias).length;

    // Atualizar total (pode ser normal ou consolidado dependendo do switch)
    atualizarTotalOutcomeComValor(totalGeral);
    
    // Calcular comparação com mês anterior
    calcularComparacaoMesOutcome();

    const categoriasArray = Object.values(categorias).sort((a, b) => b.total - a.total);
    categoriasOriginaisGlobal = categoriasArray;

    categoriasArray.forEach(cat => {
        subcategoryFilters[cat.nome] = 'TODOS';
    });

    criarGraficoPizza(categoriasArray);

    const selectCategoria = document.getElementById('filterCategoria');
    if (selectCategoria) {
    categoriasArray.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat.nome;
        option.textContent = `${cat.nome} (R$ ${cat.total.toLocaleString('pt-BR', {minimumFractionDigits: 2})})`;
        selectCategoria.appendChild(option);
    });
    }

    // Salvar dados globalmente para uso nas funções de filtro
    window.dados = dados;

    exibirCategorias(categoriasArray);
    calcularPrevisaoParcelas(dados);

    // Inicializar filtros baseados nas colunas do TXT
    inicializarFiltrosOutcome(dados);

    // Inicializar filtros hierárquicos (deve ser chamado após salvar dados globalmente)
    // Isso vai atualizar o select de Fonte com todas as fontes disponíveis inicialmente
    atualizarFiltrosHierarquicos(window.dados);

    // Listener para filtro de Carteira (nível mais alto da hierarquia)
    const filterCarteiraEl = document.getElementById('filterCarteira');
    if (filterCarteiraEl) {
        filterCarteiraEl.addEventListener('change', () => {
            atualizarFiltrosHierarquicos(window.dados);
            filtrarTudo(categoriasArray);
        });
    }

    const filterCategoriaEl = document.getElementById('filterCategoria');
    if (filterCategoriaEl) {
        filterCategoriaEl.addEventListener('change', () => {
        sincronizarFiltros('categoria');
        filtrarTudo(categoriasArray);
    });
    }
    
    const filterFonteEl = document.getElementById('filterFonte');
    if (filterFonteEl) {
        filterFonteEl.addEventListener('change', () => {
        sincronizarFiltros('fonte');
            atualizarFiltrosHierarquicos(window.dados);
        filtrarTudo(categoriasArray);
    });
    }
    
    const filterMesEl = document.getElementById('filterMes');
    if (filterMesEl) {
        filterMesEl.addEventListener('change', () => {
        sincronizarFiltros('mes');
        filtrarTudo(categoriasArray);
        calcularComparacaoMesOutcome();
    });
    }
    
    const filterRecorrenciaEl = document.getElementById('filterRecorrencia');
    if (filterRecorrenciaEl) {
        filterRecorrenciaEl.addEventListener('change', () => {
        filtrarTudo(categoriasArray);
    });
    }
    
    const filterParceladoEl = document.getElementById('filterParcelado');
    if (filterParceladoEl) {
        filterParceladoEl.addEventListener('change', () => {
            filtrarTudo(categoriasArray);
        });
    }

    // Listeners dos filtros de parcelas (se existirem)
    const filterCategoriaParcelasEl = document.getElementById('filterCategoriaParcelas');
    if (filterCategoriaParcelasEl) {
        filterCategoriaParcelasEl.addEventListener('change', () => {
        sincronizarFiltros('categoria');
        filtrarTudo(categoriasArray);
    });
    }
    
    const filterFonteParcelasEl = document.getElementById('filterFonteParcelas');
    if (filterFonteParcelasEl) {
        filterFonteParcelasEl.addEventListener('change', () => {
        sincronizarFiltros('fonte');
        filtrarTudo(categoriasArray);
    });
    }
    
    const filterMesParcelasEl = document.getElementById('filterMesParcelas');
    if (filterMesParcelasEl) {
        filterMesParcelasEl.addEventListener('change', () => {
        sincronizarFiltros('mesParcela');
        filtrarParcelas();
    });
    }
    
    // Listener para botão de resetar filtros do Outcome
    const btnResetarFiltrosEl = document.getElementById('btnResetarFiltros');
    if (btnResetarFiltrosEl) {
        btnResetarFiltrosEl.addEventListener('click', () => {
            resetarFiltrosOutcome();
            filtrarTudo(categoriasArray);
        });
    }
    
    // Listener para o switch de consolidado
    const toggleConsolidadoEl = document.getElementById('toggleConsolidado');
    if (toggleConsolidadoEl) {
        toggleConsolidadoEl.addEventListener('change', () => {
            atualizarTotalOutcome();
            calcularComparacaoMesOutcome();
        });
    }
    
    console.log("✅ Dashboard inicializado com sucesso");
    } catch (error) {
        console.error("❌ Erro ao inicializar dashboard:", error);
        throw error;
    }
}

function criarGraficoPizza(categorias) {
    console.log("📊 Criando gráfico de pizza com", categorias?.length || 0, "categorias");
    
    // Verificar se Chart.js está disponível
    if (typeof Chart === 'undefined') {
        console.error("❌ Erro: Chart.js não está carregado");
        return;
    }
    
    const canvasEl = document.getElementById('pieChart');
    if (!canvasEl) {
        console.error("❌ Erro: elemento pieChart não encontrado no HTML");
        return;
    }
    
    // Destruir gráfico anterior se existir
    if (window.pieChartInstance) {
        window.pieChartInstance.destroy();
    }
    
    const ctx = canvasEl.getContext('2d');
    
    if (!categorias || categorias.length === 0) {
        console.warn("⚠️ Nenhuma categoria para exibir no gráfico");
        return;
    }
    
    const cores = [
        '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF',
        '#FF9F40', '#E74C3C', '#2ECC71', '#3498DB', '#F39C12',
        '#9B59B6', '#1ABC9C', '#E67E22', '#95A5A6', '#34495E'
    ];

    const categoriasLimitadas = categorias.slice(0, 15);
    const totalGeral = categoriasLimitadas.reduce((sum, c) => sum + (c.total || 0), 0);
    
    if (totalGeral === 0) {
        console.warn("⚠️ Total geral é zero, não é possível criar o gráfico");
        return;
    }
    
    console.log("📊 Total geral:", totalGeral);

    window.pieChartInstance = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: categoriasLimitadas.map(c => c.nome),
            datasets: [{
                data: categoriasLimitadas.map(c => c.total),
                backgroundColor: cores,
                borderWidth: 3,
                borderColor: '#fff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.parsed || 0;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = ((value / total) * 100).toFixed(1);
                            return `${label}: R$ ${value.toLocaleString('pt-BR', {minimumFractionDigits: 2})} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });

    // Criar legenda customizada
    const legendContainer = document.getElementById('chartLegend');
    if (legendContainer) {
    legendContainer.innerHTML = '';

    categoriasLimitadas.forEach((categoria, index) => {
        const percentage = ((categoria.total / totalGeral) * 100).toFixed(1);
        
        const legendItem = document.createElement('div');
        legendItem.className = 'legend-item';
        legendItem.innerHTML = `
            <div class="legend-color" style="background-color: ${cores[index]}"></div>
            <div class="legend-info">
                <div class="legend-name">${categoria.nome}</div>
                <div class="legend-value-percentage">
                    <span class="legend-value">R$ ${categoria.total.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
                    <span class="legend-percentage">${percentage}%</span>
                </div>
            </div>
        `;
        
        legendContainer.appendChild(legendItem);
    });
    } else {
        console.warn("⚠️ Elemento chartLegend não encontrado");
    }
    
    console.log("✅ Gráfico de pizza criado com sucesso");
}

function getSubcategoryFilters(categoria) {
    const groups = SUBCATEGORY_GROUPS[categoria.nome] || {};
    const filters = [];

    if (Object.keys(groups).length > 0) {
        const subcategoriasAgrupadas = new Set();
        
        Object.values(groups).forEach(groupSubcats => {
            groupSubcats.forEach(sub => subcategoriasAgrupadas.add(sub));
        });

        const outrosSubcategorias = categoria.subcategorias.filter(
            sub => !subcategoriasAgrupadas.has(sub)
        );

        filters.push({ type: 'all', label: 'TODOS' });

        Object.keys(groups).forEach(groupName => {
            filters.push({ type: 'group', label: groupName, subcategories: groups[groupName] });
        });

        if (outrosSubcategorias.length > 0) {
            filters.push({ type: 'group', label: 'OUTROS', subcategories: outrosSubcategorias });
        }
    } else {
        const subcategoriasAgrupadas = new Set();

        filters.push({ type: 'all', label: 'TODOS' });

        Object.keys(groups).forEach(groupName => {
            filters.push({ type: 'group', label: groupName, subcategories: groups[groupName] });
            groups[groupName].forEach(sub => subcategoriasAgrupadas.add(sub));
        });

        categoria.subcategorias.forEach(subcat => {
            if (!subcategoriasAgrupadas.has(subcat)) {
                filters.push({ type: 'single', label: subcat });
            }
        });
    }

    return filters;
}

function toggleCategory(categoriaNome) {
    const card = document.querySelector(`[data-categoria="${categoriaNome}"]`);
    if (!card) return;
    
    const content = card.querySelector('.category-content');
    const toggle = card.querySelector('.category-toggle');

    if (!content || !toggle) return;

    const isCollapsed = content.style.display === 'none' || content.classList.contains('collapsed');
    
    if (isCollapsed) {
        // Expandir
        content.style.display = 'block';
        content.classList.add('expanded');
        content.classList.remove('collapsed');
        toggle.classList.remove('collapsed');
    } else {
        // Colapsar
        content.style.display = 'none';
        content.classList.remove('expanded');
        content.classList.add('collapsed');
        toggle.classList.add('collapsed');
    }
}

function exibirCategorias(categorias) {
    // Função mantida para compatibilidade, mas agora redireciona para exibirListaOutcome
    const todosItens = [];
    categorias.forEach(categoria => {
        categoria.itens.forEach(item => {
            todosItens.push(item);
        });
    });
    exibirListaOutcome(todosItens);
}

function exibirListaOutcome(itens) {
    console.log("📋 exibirListaOutcome chamada com", itens?.length || 0, "itens");
    const container = document.getElementById('categoriesList');
    if (!container) {
        console.error("❌ Erro: elemento categoriesList não encontrado no HTML");
        return;
    }
    container.innerHTML = '';

    // Obter o mês filtrado atual
    const filterMesEl = document.getElementById('filterMes');
    const mesFiltrado = filterMesEl ? filterMesEl.value : '';

    // Agrupar itens por categoria
    const itensPorCategoria = {};
    itens.forEach(item => {
        const categoria = item.categoria || 'Sem categoria';
        if (!itensPorCategoria[categoria]) {
            itensPorCategoria[categoria] = [];
        }
        itensPorCategoria[categoria].push(item);
    });

    // Ordenar categorias por valor total (do maior para o menor)
    const categoriasOrdenadas = Object.keys(itensPorCategoria).sort((catA, catB) => {
        const totalA = itensPorCategoria[catA].reduce((sum, item) => sum + (item.valor || 0), 0);
        const totalB = itensPorCategoria[catB].reduce((sum, item) => sum + (item.valor || 0), 0);
        return totalB - totalA; // Ordem decrescente (maior primeiro)
    });

    categoriasOrdenadas.forEach(categoriaNome => {
        const itensCategoria = itensPorCategoria[categoriaNome];
        
        // Calcular total da categoria
        const totalCategoria = itensCategoria.reduce((sum, item) => sum + (item.valor || 0), 0);
        
        // Ordenar itens por valor (maior primeiro)
        const itensOrdenados = [...itensCategoria].sort((a, b) => b.valor - a.valor);

        // Criar card da categoria
        const card = document.createElement('div');
        card.className = 'category-card';
        card.dataset.categoria = categoriaNome;

        // Header da categoria (colapsável)
        const header = document.createElement('div');
        header.className = 'category-header';
        header.onclick = () => toggleCategory(categoriaNome);
        header.innerHTML = `
            <div class="category-header-left">
                <div class="category-toggle collapsed">▼</div>
                <div class="category-name">${categoriaNome}</div>
            </div>
            <div class="category-total-container">
                <div class="category-total">R$ ${totalCategoria.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</div>
            </div>
        `;
        card.appendChild(header);

        // Conteúdo da categoria (inicialmente colapsado)
        const contentDiv = document.createElement('div');
        contentDiv.className = 'category-content collapsed';
        contentDiv.style.display = 'none'; // Iniciar colapsado

        const itensContainer = document.createElement('div');
        itensContainer.className = 'itens-container-outcome';

        itensOrdenados.forEach(item => {
            const itemDiv = criarItemDivOutcome(item, mesFiltrado);
            itensContainer.appendChild(itemDiv);
        });

        contentDiv.appendChild(itensContainer);
        card.appendChild(contentDiv);
        container.appendChild(card);
    });
}

function criarItemDiv(item) {
    // Função mantida para compatibilidade, mas agora redireciona para criarItemDivOutcome
    const filterMesEl = document.getElementById('filterMes');
    const mesFiltrado = filterMesEl ? filterMesEl.value : '';
    return criarItemDivOutcome(item, mesFiltrado);
}

function criarItemDivOutcome(item, mesFiltrado = '') {
    const itemDiv = document.createElement('div');
    let className = 'item outcome-item';
    if (item.caution) {
        className += ' item-caution';
    }
    itemDiv.className = className;
    itemDiv.dataset.fonte = item.fonte;
    itemDiv.dataset.subcategoria = item.subcategoria;
    itemDiv.dataset.descricao = item.linha_original.toLowerCase();

    // Fonte
    const fonteClass = item.fonte ? item.fonte.toLowerCase().replace('ú', 'u') : '';
    const fonteBadge = `<span class="fonte-badge ${fonteClass}">${item.fonte || ''}</span>`;

    // Descrição
    const descricao = item.descricao || item.categoria_completa || '';

    // Valor
    const valor = `R$ ${item.valor.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`;

    // Recorrência
    let recorrencia = '-';
    if (item.frequencia) {
        const freq = item.frequencia.toLowerCase();
        if (freq === 'mensal') recorrencia = 'Mensal';
        else if (freq === 'anual') recorrencia = 'Anual';
        else if (freq === 'pontual') recorrencia = 'Pontual';
        else recorrencia = item.frequencia.charAt(0).toUpperCase() + item.frequencia.slice(1);
    }

    // Parcelas: atualizar de acordo com o mês filtrado
    let parcelas = '-';
    let parcelaAtual = item.parcela_atual;
    let parcelasTotal = item.parcelas_total;
    
    // Se há um mês filtrado e o item tem meses_parcelas, encontrar a parcela correspondente ao mês
    if (mesFiltrado && item.meses_parcelas && item.meses_parcelas.length > 0) {
        const mesEncontrado = item.meses_parcelas.find(mes => mes.chave === mesFiltrado);
        if (mesEncontrado && mesEncontrado.parcela !== null && mesEncontrado.parcela !== undefined) {
            parcelaAtual = mesEncontrado.parcela;
        }
    }
    
    // Exibir parcelas se houver informação
    if (parcelaAtual !== null && parcelaAtual !== undefined && parcelasTotal) {
        parcelas = `${parcelaAtual}/${parcelasTotal}`;
    }

    // Estrutura: Fonte | Descrição | Recorrência | Valor | Parcelas
    // Nota: "Parcelado" (Sim/Não) é usado apenas para filtragem, não aparece no item
    itemDiv.innerHTML = `
        ${fonteBadge}
            <div class="item-descricao">${descricao}</div>
        <div class="item-recorrencia">${recorrencia}</div>
        <div class="item-valor">${valor}</div>
        <div class="item-parcelas">${parcelas}</div>
    `;

    return itemDiv;
}

function filtrarSubcategoria(categoriaNome, filter) {
    subcategoryFilters[categoriaNome] = filter;

    const card = document.querySelector(`[data-categoria="${categoriaNome}"]`);
    const buttons = card.querySelectorAll('.subcategory-filter-btn');
    
    buttons.forEach(btn => {
        if (btn.textContent === filter.label) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    const itens = card.querySelectorAll('.item');
    itens.forEach(item => {
        const itemSubcat = item.dataset.subcategoria;
        let shouldShow = false;

        if (filter.type === 'all') {
            shouldShow = true;
        } else if (filter.type === 'group') {
            shouldShow = filter.subcategories.includes(itemSubcat);
        } else if (filter.type === 'single') {
            shouldShow = itemSubcat === filter.label;
        }

        item.style.display = shouldShow ? 'flex' : 'none';
    });

    const itensVisiveis = Array.from(itens).filter(item => item.style.display !== 'none');
    const totalVisivel = itensVisiveis.reduce((sum, item) => {
        const valor = parseFloat(item.querySelector('.item-valor').textContent.replace('R$ ', '').replace(/\./g, '').replace(',', '.'));
        return sum + valor;
    }, 0);

    const totalElement = card.querySelector('.category-total');
    totalElement.textContent = `R$ ${totalVisivel.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`;

    const percentageElement = card.querySelector('.category-percentage');
    const totalCategoria = categoryTotals[categoriaNome];
    
    if (filter.label !== 'TODOS' && totalCategoria > 0) {
        const percentage = (totalVisivel / totalCategoria * 100).toFixed(1);
        percentageElement.textContent = `${percentage}% do total`;
    } else {
        percentageElement.textContent = '';
    }
}

// Função removida - não há mais filterTipoCompra

function inicializarFiltrosOutcome(dados) {
    // Inicializar filtros baseados nas colunas do TXT: Carteira|Fonte|Mês|Recorrência|Parcelado|Categoria
    
    // 1. Carteira
    const filterCarteiraEl = document.getElementById('filterCarteira');
    if (filterCarteiraEl) {
        const carteiras = [...new Set(dados.map(item => item.carteira).filter(c => c))].sort();
        filterCarteiraEl.innerHTML = '<option value="">Todas</option>';
        carteiras.forEach(carteira => {
            const option = document.createElement('option');
            option.value = carteira;
            option.textContent = carteira;
            filterCarteiraEl.appendChild(option);
        });
    }
    
    // 2. Fonte (será atualizado por atualizarFiltrosHierarquicos)
    
    // 3. Mês
    const filterMesEl = document.getElementById('filterMes');
    if (filterMesEl) {
        const mesesSet = new Set();
        dados.forEach(item => {
            // Coletar meses de meses_parcelas
            if (item.meses_parcelas && item.meses_parcelas.length > 0) {
                item.meses_parcelas.forEach(mes => {
                    if (mes.chave) mesesSet.add(mes.chave);
                });
            }
            // Também coletar mes_chave se existir (para itens sem parcelas)
            if (item.mes_chave) {
                mesesSet.add(item.mes_chave);
            }
        });
        const mesesArray = Array.from(mesesSet).sort().reverse();
        filterMesEl.innerHTML = '<option value="">Todas</option>';
        
        // Mês vigente: Dezembro/2025
        const mesVigente = '2025-12';
        
        mesesArray.forEach(mesChave => {
            const option = document.createElement('option');
            option.value = mesChave;
            // Formatar para exibição: "Dezembro/2025"
            const [ano, mes] = mesChave.split('-');
            const nomeMes = MESES_PT[parseInt(mes)];
            option.textContent = `${nomeMes}/${ano}`;
            filterMesEl.appendChild(option);
        });
        
        // Definir mês vigente (Dezembro/2025) como padrão se existir nos dados
        if (mesesArray.includes(mesVigente)) {
            filterMesEl.value = mesVigente;
        } else if (mesesArray.length > 0) {
            // Se não tiver Dezembro/2025, usar o primeiro mês disponível (mais recente)
            filterMesEl.value = mesesArray[0];
        }
    }
    
    // 4. Recorrência
    const filterRecorrenciaEl = document.getElementById('filterRecorrencia');
    if (filterRecorrenciaEl) {
        const recorencias = [...new Set(dados.map(item => item.frequencia).filter(r => r))].sort();
        filterRecorrenciaEl.innerHTML = '<option value="">Todas</option>';
        recorencias.forEach(recorencia => {
            const option = document.createElement('option');
            option.value = recorencia;
            // Capitalizar primeira letra
            option.textContent = recorencia.charAt(0).toUpperCase() + recorencia.slice(1);
            filterRecorrenciaEl.appendChild(option);
        });
    }
    
    // 5. Parcelado
    const filterParceladoEl = document.getElementById('filterParcelado');
    if (filterParceladoEl) {
        const parcelados = [...new Set(dados.map(item => {
            return item.parcela_atual !== null ? 'Sim' : 'Não';
        }))].sort();
        filterParceladoEl.innerHTML = '<option value="">Todas</option>';
        parcelados.forEach(parcelado => {
            const option = document.createElement('option');
            option.value = parcelado;
            option.textContent = parcelado;
            filterParceladoEl.appendChild(option);
        });
    }
    
    // 6. Categoria (já inicializado em inicializarDashboard)
}

function atualizarFiltrosHierarquicos(dados) {
    // Respeitar hierarquia: Carteira → Fonte → Categoria → Subcategoria
    const filterCarteiraEl = document.getElementById('filterCarteira');
    const filterFonteEl = document.getElementById('filterFonte');
    const filterCategoriaEl = document.getElementById('filterCategoria');
    
    if (!filterCarteiraEl || !filterFonteEl || !filterCategoriaEl) {
        console.warn('Elementos de filtro não encontrados');
        return;
    }
    
    // Usar dados globais se não foram passados
    const dadosParaFiltrar = dados || window.dados || [];
    
    if (!dadosParaFiltrar || dadosParaFiltrar.length === 0) {
        console.warn('Nenhum dado disponível para filtrar');
        return;
    }
    
    const filtroCarteira = filterCarteiraEl.value;
    const filtroFonteAtual = filterFonteEl.value;
    
    // Filtrar dados baseado na hierarquia
    let dadosFiltrados = dadosParaFiltrar;
    
    // 1. Filtrar por Carteira (nível mais alto)
    if (filtroCarteira) {
        dadosFiltrados = dadosFiltrados.filter(item => item.carteira === filtroCarteira);
    }
    
    // 2. Atualizar opções de Fonte baseado na Carteira selecionada
    const fontesDisponiveis = [...new Set(dadosFiltrados.map(item => item.fonte).filter(f => f))].sort();
    const fonteAtual = filterFonteEl.value;
    
    // Limpar e recriar o select de Fonte
    filterFonteEl.innerHTML = '<option value="">Todas</option>';
    fontesDisponiveis.forEach(fonte => {
        const option = document.createElement('option');
        option.value = fonte;
        option.textContent = fonte;
        if (fonte === fonteAtual && fontesDisponiveis.includes(fonteAtual)) {
            option.selected = true;
        }
        filterFonteEl.appendChild(option);
    });
    
    // Se a fonte atual não está mais disponível, limpar o filtro
    if (fonteAtual && !fontesDisponiveis.includes(fonteAtual)) {
        filterFonteEl.value = '';
    }
    
    // 3. Filtrar por Fonte (se selecionada)
    const filtroFonte = filterFonteEl.value;
    if (filtroFonte) {
        dadosFiltrados = dadosFiltrados.filter(item => item.fonte === filtroFonte);
    }
    
    // 4. Atualizar opções de Categoria baseado na Carteira e Fonte selecionadas
    const categoriasDisponiveis = [...new Set(dadosFiltrados.map(item => item.categoria).filter(c => c))].sort();
    const categoriaAtual = filterCategoriaEl.value;
    
    filterCategoriaEl.innerHTML = '<option value="">Todas</option>';
    categoriasDisponiveis.forEach(categoria => {
        const totalCategoria = dadosFiltrados
            .filter(item => item.categoria === categoria)
            .reduce((sum, item) => sum + item.valor, 0);
        
        const option = document.createElement('option');
        option.value = categoria;
        option.textContent = `${categoria} (R$ ${totalCategoria.toLocaleString('pt-BR', {minimumFractionDigits: 2})})`;
        if (categoria === categoriaAtual && categoriasDisponiveis.includes(categoriaAtual)) {
            option.selected = true;
        }
        filterCategoriaEl.appendChild(option);
    });
    
    // Se a categoria atual não está mais disponível, limpar o filtro
    if (categoriaAtual && !categoriasDisponiveis.includes(categoriaAtual)) {
        filterCategoriaEl.value = '';
    }
}

function sincronizarFiltros(tipo) {
    if (tipo === 'categoria') {
        const filterCategoriaEl = document.getElementById('filterCategoria');
        const filterCategoriaParcelasEl = document.getElementById('filterCategoriaParcelas');
        if (filterCategoriaEl && filterCategoriaParcelasEl) {
            filterCategoriaParcelasEl.value = filterCategoriaEl.value;
        }
    } else if (tipo === 'fonte') {
        const filterFonteEl = document.getElementById('filterFonte');
        const filterFonteParcelasEl = document.getElementById('filterFonteParcelas');
        if (filterFonteEl && filterFonteParcelasEl) {
            filterFonteParcelasEl.value = filterFonteEl.value;
        }
    } else if (tipo === 'mes') {
        const filterMesEl = document.getElementById('filterMes');
        const filterMesParcelasEl = document.getElementById('filterMesParcelas');
        if (filterMesEl && filterMesParcelasEl) {
            filterMesParcelasEl.value = filterMesEl.value;
        }
    } else if (tipo === 'mesParcela') {
        const filterMesParcelasEl = document.getElementById('filterMesParcelas');
        const filterMesEl = document.getElementById('filterMes');
        if (filterMesParcelasEl && filterMesEl) {
            filterMesEl.value = filterMesParcelasEl.value;
        }
    }
}

function filtrarTudo(categoriasOriginais) {
    filtrarCategoriasPrincipais(categoriasOriginais);
    filtrarParcelas();
}

function filtrarCategoriasPrincipais(categoriasOriginais) {
    const filterCarteiraEl = document.getElementById('filterCarteira');
    const filterCategoriaEl = document.getElementById('filterCategoria');
    const filterFonteEl = document.getElementById('filterFonte');
    const filterMesEl = document.getElementById('filterMes');
    const filterRecorrenciaEl = document.getElementById('filterRecorrencia');
    const filterParceladoEl = document.getElementById('filterParcelado');
    
    const filtroCarteira = filterCarteiraEl ? filterCarteiraEl.value : '';
    const filtroCategoria = filterCategoriaEl ? filterCategoriaEl.value : '';
    const filtroFonte = filterFonteEl ? filterFonteEl.value : '';
    const filtroMes = filterMesEl ? filterMesEl.value : '';
    const filtroRecorrencia = filterRecorrenciaEl ? filterRecorrenciaEl.value : '';
    const filtroParcelado = filterParceladoEl ? filterParceladoEl.value : '';

    // Coletar todos os itens de todas as categorias
    let todosItens = [];
    categoriasOriginais.forEach(cat => {
        cat.itens.forEach(item => {
            todosItens.push(item);
        });
    });

    // Aplicar filtros nos itens respeitando a hierarquia
    let itensFiltrados = todosItens.filter(item => {
        // 1. Filtro de Carteira (nível mais alto)
        let passaCarteira = !filtroCarteira || item.carteira === filtroCarteira;
        
        // 2. Filtro de Categoria
        let passaCategoria = !filtroCategoria || item.categoria === filtroCategoria;
        
        // 3. Filtro de Fonte (segundo nível)
                let passaFonte = !filtroFonte || item.fonte === filtroFonte;
        
        // 4. Filtro de mês: verificar se o item tem o mês em meses_parcelas ou se tem mes_chave
        let passaMes = true;
        if (filtroMes) {
            // Priorizar mes_chave se existir (para lançamentos repetidos ajustados)
            if (item.mes_chave) {
                passaMes = item.mes_chave === filtroMes;
            } else if (item.meses_parcelas && item.meses_parcelas.length > 0) {
                // Se tem meses_parcelas, verificar se algum mês corresponde ao filtro
                // Para lançamentos repetidos ajustados, meses_parcelas terá apenas 1 mês
                passaMes = item.meses_parcelas.some(mes => mes.chave === filtroMes);
            } else {
                // Se não tem informação de mês, não passa no filtro
                passaMes = false;
            }
            
            // Debug: verificar se está filtrando corretamente
            if (item.descricao && item.descricao.includes('Meli+')) {
                console.log(`🔍 Filtro mês ${filtroMes}: Item "${item.descricao}" - mes_chave: ${item.mes_chave}, passaMes: ${passaMes}`);
            }
        }
        
        // 5. Filtro de Recorrência
        let passaRecorrencia = true;
        if (filtroRecorrencia) {
            passaRecorrencia = item.frequencia === filtroRecorrencia;
        }
        
        // 6. Filtro de Parcelado
        let passaParcelado = true;
        if (filtroParcelado) {
            const itemParcelado = item.parcela_atual !== null ? 'Sim' : 'Não';
            passaParcelado = itemParcelado === filtroParcelado;
        }
        
        // Aplicar todos os filtros respeitando a hierarquia
        return passaCarteira && passaCategoria && passaFonte && passaMes && passaRecorrencia && passaParcelado;
    });

    // Calcular total
    const totalFonte = itensFiltrados.reduce((sum, item) => sum + (item.valor || 0), 0);
    
    // Atualizar total (pode ser normal ou consolidado dependendo do switch)
    atualizarTotalOutcomeComValor(totalFonte);
    
    // Calcular comparação com mês anterior
    calcularComparacaoMesOutcome();

    // Exibir lista simples
    exibirListaOutcome(itensFiltrados);
}

function atualizarTotalOutcomeComValor(totalOutcome) {
    const toggleConsolidadoEl = document.getElementById('toggleConsolidado');
    const fonteTotalEl = document.getElementById('fonteTotal');
    
    if (!fonteTotalEl) return;
    
    let valorExibir = totalOutcome;
    
    // Se o switch estiver ligado, calcular OUTCOME - INCOME
    if (toggleConsolidadoEl && toggleConsolidadoEl.checked) {
        const fonteTotalIncomeEl = document.getElementById('fonteTotalIncome');
        if (fonteTotalIncomeEl) {
            // Extrair o valor do Income do texto formatado
            const textoIncome = fonteTotalIncomeEl.textContent;
            const valorIncome = parseFloat(textoIncome.replace(/[^\d,]/g, '').replace(',', '.')) || 0;
            valorExibir = totalOutcome - valorIncome;
        }
    }
    
    fonteTotalEl.textContent = `R$ ${valorExibir.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`;
}

function atualizarTotalOutcome() {
    // Recalcular o total atual do Outcome filtrado
    const filterCarteiraEl = document.getElementById('filterCarteira');
    const filterCategoriaEl = document.getElementById('filterCategoria');
    const filterFonteEl = document.getElementById('filterFonte');
    const filterMesEl = document.getElementById('filterMes');
    const filterRecorrenciaEl = document.getElementById('filterRecorrencia');
    const filterParceladoEl = document.getElementById('filterParcelado');
    
    const filtroCarteira = filterCarteiraEl ? filterCarteiraEl.value : '';
    const filtroCategoria = filterCategoriaEl ? filterCategoriaEl.value : '';
    const filtroFonte = filterFonteEl ? filterFonteEl.value : '';
    const filtroMes = filterMesEl ? filterMesEl.value : '';
    const filtroRecorrencia = filterRecorrenciaEl ? filterRecorrenciaEl.value : '';
    const filtroParcelado = filterParceladoEl ? filterParceladoEl.value : '';
    
    // Coletar todos os itens de todas as categorias
    let todosItens = [];
    if (categoriasOriginaisGlobal && categoriasOriginaisGlobal.length > 0) {
        categoriasOriginaisGlobal.forEach(cat => {
            cat.itens.forEach(item => {
                todosItens.push(item);
            });
        });
    }
    
    // Aplicar filtros
    let itensFiltrados = todosItens.filter(item => {
        let passaCarteira = !filtroCarteira || item.carteira === filtroCarteira;
        let passaCategoria = !filtroCategoria || item.categoria === filtroCategoria;
        let passaFonte = !filtroFonte || item.fonte === filtroFonte;
        
        let passaMes = true;
        if (filtroMes) {
            if (item.mes_chave) {
                passaMes = item.mes_chave === filtroMes;
            } else if (item.meses_parcelas && item.meses_parcelas.length > 0) {
                passaMes = item.meses_parcelas.some(mes => mes.chave === filtroMes);
            } else {
                passaMes = false;
            }
        }
        
        let passaRecorrencia = true;
        if (filtroRecorrencia) {
            passaRecorrencia = item.frequencia === filtroRecorrencia;
        }
        
        let passaParcelado = true;
        if (filtroParcelado) {
            const itemParcelado = item.parcela_atual !== null ? 'Sim' : 'Não';
            passaParcelado = itemParcelado === filtroParcelado;
        }
        
        return passaCarteira && passaCategoria && passaFonte && passaMes && passaRecorrencia && passaParcelado;
    });
    
    const totalFonte = itensFiltrados.reduce((sum, item) => sum + (item.valor || 0), 0);
    atualizarTotalOutcomeComValor(totalFonte);
}

function calcularPrevisaoParcelas(dados) {
    const parceladas = dados.filter(item => item.parcela_atual && item.parcelas_total);

    const mesesMap = {};
    const cartoes = new Set();
    const categoriasSet = new Set();
    const mesAtual = 10; // Novembro
    const anoAtual = 2025;

    todasParcelas = [];

    parceladas.forEach(item => {
        cartoes.add(item.fonte);
        categoriasSet.add(item.categoria);
        const parcelasRestantes = item.parcelas_total - item.parcela_atual + 1;
        
        let mesOffset = 0;
        
        if (item.fonte === 'Santander') {
            mesOffset = 1;
        }
        
        for (let i = 0; i < parcelasRestantes; i++) {
            const offsetTotal = item.fonte === 'Santander' ? (mesOffset + i) : i;
            const mes = (mesAtual + offsetTotal) % 12;
            const ano = anoAtual + Math.floor((mesAtual + offsetTotal) / 12);
            const chave = `${ano}-${String(mes + 1).padStart(2, '0')}`;
            const nomeMes = new Date(ano, mes).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

            if (!mesesMap[chave]) {
                mesesMap[chave] = {
                    chave: chave,
                    nome: nomeMes,
                    total: 0
                };
            }

            mesesMap[chave].total += item.valor;
            
            todasParcelas.push({
                mesChave: chave,
                mesNome: nomeMes,
                descricao: item.categoria_completa,
                categoria: item.categoria,
                valor: item.valor,
                parcela: item.parcela_atual + i,
                total: item.parcelas_total,
                fonte: item.fonte
            });
        }
    });

    const mesesArray = Object.values(mesesMap).sort((a, b) => a.chave.localeCompare(b.chave));

    // Preencher select de mês GLOBAL (primeira seção)
    const mesFilterGlobal = document.getElementById('filterMes');
    if (mesFilterGlobal) {
    mesFilterGlobal.innerHTML = '<option value="">Todos</option>';
    
    mesesArray.forEach(mes => {
        const option = document.createElement('option');
        option.value = mes.chave;
        option.textContent = `${mes.nome.charAt(0).toUpperCase() + mes.nome.slice(1)}`;
        mesFilterGlobal.appendChild(option);
    });
    }

    // Preencher select de categorias nas parcelas (se existir)
    const categoriasParcelasSelect = document.getElementById('filterCategoriaParcelas');
    if (categoriasParcelasSelect) {
    categoriasParcelasSelect.innerHTML = '<option value="">Todas as Categorias</option>';
    
    Array.from(categoriasSet).sort().forEach(cat => {
        const option = document.createElement('option');
        option.value = cat;
        option.textContent = cat;
        categoriasParcelasSelect.appendChild(option);
    });
    }

    // Preencher select de meses de parcela (específico da seção) - se existir
    const mesParcelasFilter = document.getElementById('filterMesParcelas');
    if (mesParcelasFilter) {
    mesParcelasFilter.innerHTML = '<option value="">Todos</option>';
    
    mesesArray.forEach(mes => {
        const option = document.createElement('option');
        option.value = mes.chave;
        option.textContent = `${mes.nome.charAt(0).toUpperCase() + mes.nome.slice(1)}`;
        mesParcelasFilter.appendChild(option);
    });
    }

    // Exibir parcelas apenas se o container existir
    const parcelasContainer = document.getElementById('parcelasList');
    if (parcelasContainer) {
    exibirParcelas(todasParcelas);
    }
}

function filtrarParcelas() {
    // Pegar filtros globais com verificações de null (respeitando hierarquia)
    const filterCarteiraEl = document.getElementById('filterCarteira');
    const filterCategoriaEl = document.getElementById('filterCategoria');
    const filterCategoriaParcelasEl = document.getElementById('filterCategoriaParcelas');
    const filterFonteEl = document.getElementById('filterFonte');
    const filterFonteParcelasEl = document.getElementById('filterFonteParcelas');
    const filterMesEl = document.getElementById('filterMes');
    const filterMesParcelasEl = document.getElementById('filterMesParcelas');
    const carteiraGlobal = filterCarteiraEl ? filterCarteiraEl.value : '';
    const categoriaGlobal = (filterCategoriaEl ? filterCategoriaEl.value : '') || (filterCategoriaParcelasEl ? filterCategoriaParcelasEl.value : '');
    const fonteGlobal = (filterFonteEl ? filterFonteEl.value : '') || (filterFonteParcelasEl ? filterFonteParcelasEl.value : '');
    const mesGlobal = (filterMesEl ? filterMesEl.value : '') || (filterMesParcelasEl ? filterMesParcelasEl.value : '');
    
    let parcelasFiltradas = todasParcelas;

    // Aplicar filtros respeitando a hierarquia: Carteira → Fonte → Categoria → Mês
    // 1. Filtro de Carteira (nível mais alto)
    if (carteiraGlobal && parcelasFiltradas.length > 0) {
        // Buscar nos dados originais para encontrar a carteira de cada parcela
        const dadosOriginais = window.dados || [];
        const itensComCarteira = dadosOriginais.filter(item => item.carteira === carteiraGlobal);
        const combinacoesPermitidas = new Set(
            itensComCarteira.map(item => `${item.categoria}|${item.fonte}`)
        );
        
        parcelasFiltradas = parcelasFiltradas.filter(p => 
            combinacoesPermitidas.has(`${p.categoria}|${p.fonte}`)
        );
    }

    // 2. Filtro de Fonte (segundo nível)
    if (fonteGlobal && parcelasFiltradas.length > 0) {
        parcelasFiltradas = parcelasFiltradas.filter(p => p.fonte === fonteGlobal);
    }

    // 3. Filtro de Categoria (terceiro nível)
    if (categoriaGlobal && parcelasFiltradas.length > 0) {
        parcelasFiltradas = parcelasFiltradas.filter(p => p.categoria === categoriaGlobal);
    }

    // 4. Filtro de Mês (último nível)
    if (mesGlobal && parcelasFiltradas.length > 0) {
        parcelasFiltradas = parcelasFiltradas.filter(p => p.mesChave === mesGlobal);
    }

    exibirParcelas(parcelasFiltradas);
}

function exibirParcelas(parcelas) {
    const container = document.getElementById('parcelasList');
    if (!container) return; // Elemento não existe, sair silenciosamente
    
    container.innerHTML = '';

    if (parcelas.length === 0) {
        container.innerHTML = '<div class="empty-message">Nenhuma compra parcelada encontrada.</div>';
        const previsaoTotalEl = document.getElementById('previsaoTotal');
        if (previsaoTotalEl) {
            previsaoTotalEl.textContent = 'R$ 0,00';
        }
        return;
    }

    const total = parcelas.reduce((sum, p) => sum + p.valor, 0);
    const previsaoTotalEl = document.getElementById('previsaoTotal');
    if (previsaoTotalEl) {
        previsaoTotalEl.textContent = `R$ ${total.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`;
    }

    parcelas.sort((a, b) => {
        const compMes = a.mesChave.localeCompare(b.mesChave);
        if (compMes !== 0) return compMes;
        return b.valor - a.valor;
    });

    parcelas.forEach(parcela => {
        const parcelaDiv = document.createElement('div');
        parcelaDiv.className = 'parcela-item';
        
        const fonteClass = parcela.fonte.toLowerCase().replace('ú', 'u');
        
        parcelaDiv.innerHTML = `
            <div class="parcela-info">
                <div class="parcela-descricao">${parcela.descricao}</div>
                <div class="parcela-detalhes">
                    📅 ${parcela.mesNome.charAt(0).toUpperCase() + parcela.mesNome.slice(1)} • 
                    Parcela ${parcela.parcela}/${parcela.total} •
                    <span class="fonte-badge ${fonteClass}">${parcela.fonte}</span>
                </div>
            </div>
            <div class="parcela-valor">R$ ${parcela.valor.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</div>
        `;
        
        container.appendChild(parcelaDiv);
    });
}

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
    console.log("💰 Inicializando Income com", dadosIncome?.length || 0, "registros");
    
    if (!dadosIncome || dadosIncome.length === 0) {
        console.warn("⚠️ Aviso: dadosIncome está vazio ou inválido");
        return;
    }

    dadosIncomeGlobal = dadosIncome;

    // Calcular total geral
    const totalGeral = dadosIncome.reduce((sum, item) => {
        let valor = 0;
        if (item.valor !== undefined && item.valor !== null) {
            if (typeof item.valor === 'string') {
                // Se for string, limpar e converter
                let valor_limpo = item.valor.trim();
                if (valor_limpo.includes(',')) {
                    valor_limpo = valor_limpo.replace(/\./g, '').replace(',', '.');
                }
                valor = parseFloat(valor_limpo) || 0;
            } else {
                valor = Number(item.valor) || 0;
            }
        }
        return sum + valor;
    }, 0);
    
    console.log("💰 Total geral de Income calculado:", totalGeral);
    console.log("📊 Total de registros:", dadosIncome.length);
    console.log("📋 Primeiros valores:", dadosIncome.slice(0, 5).map(i => ({ descricao: i.descricao, valor: i.valor })));
    
    const fonteTotalIncomeEl = document.getElementById('fonteTotalIncome');
    if (fonteTotalIncomeEl) {
        const totalFormatado = `R$ ${totalGeral.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`;
        fonteTotalIncomeEl.textContent = totalFormatado;
        console.log("✅ Total de Income atualizado no DOM:", totalFormatado);
        console.log("✅ Elemento encontrado:", fonteTotalIncomeEl);
        console.log("✅ Texto atual do elemento:", fonteTotalIncomeEl.textContent);
    } else {
        console.error("❌ Erro: elemento fonteTotalIncome não encontrado na inicialização");
        console.error("❌ Tentando encontrar elemento...");
        const todosElementos = document.querySelectorAll('[id*="Income"], [id*="income"], [class*="total"]');
        console.log("🔍 Elementos relacionados encontrados:", todosElementos);
    }
    
    // Atualizar total do Outcome se o switch consolidado estiver ligado
    atualizarTotalOutcome();

    // Preencher select de Fonte dinamicamente baseado nos dados
    const fontesSet = new Set();
    dadosIncome.forEach(item => {
        if (item.fonte) fontesSet.add(item.fonte);
    });
    const fontesArray = Array.from(fontesSet).sort();
    const filterFonteIncomeEl = document.getElementById('filterFonteIncome');
    if (filterFonteIncomeEl) {
        filterFonteIncomeEl.innerHTML = '<option value="">Todas</option>';
        fontesArray.forEach(fonte => {
            const option = document.createElement('option');
            option.value = fonte;
            option.textContent = fonte;
            filterFonteIncomeEl.appendChild(option);
        });
    }
    
    // Preencher select de mês (Dezembro/2025 como mês vigente e subsequentes)
    const mesesSet = new Set();
    dadosIncome.forEach(item => {
        mesesSet.add(item.mes_chave);
    });
    const mesesArray = Array.from(mesesSet).sort();
    const mesFilterIncome = document.getElementById('filterMesIncome');
    if (mesFilterIncome) {
        // Mês vigente: Dezembro/2025
        const mesVigente = '2025-12';
        
        mesesArray.forEach(mesChave => {
            const item = dadosIncome.find(d => d.mes_chave === mesChave);
            if (item) {
                const option = document.createElement('option');
                option.value = mesChave;
                // Formato: Dezembro/2025
                option.textContent = `${item.mes_nome}/${mesChave.split('-')[0]}`;
                mesFilterIncome.appendChild(option);
            }
        });
        
        // Definir Dezembro/2025 como padrão se existir nos dados
        if (mesesArray.includes(mesVigente)) {
            mesFilterIncome.value = mesVigente;
        } else if (mesesArray.length > 0) {
            // Se não tiver Dezembro/2025, usar o primeiro mês disponível
            mesFilterIncome.value = mesesArray[0];
        }
    }

    // Event listeners dos filtros (reutilizar variáveis já declaradas acima)
    const filterMesIncomeEl = document.getElementById('filterMesIncome');
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
    
    // Exibir dados inicialmente (aplicar filtros padrão - Dezembro/2025 e subsequentes)
    // Se não tiver mês selecionado, filtrarIncome já aplica o padrão (Dezembro/2025+)
    filtrarIncome();
    
    console.log("✅ Income inicializado com sucesso");
}

function exibirIncome(dados) {
    console.log("💰 exibirIncome chamada com", dados?.length || 0, "registros");
    const container = document.getElementById('categoriesListIncome');
    if (!container) {
        console.error("❌ Erro: elemento categoriesListIncome não encontrado no HTML");
        return;
    }
    
    container.innerHTML = '';

    if (!dados || dados.length === 0) {
        console.warn("⚠️ Nenhuma receita encontrada para exibir");
        return;
    }
    
    console.log("📋 Exibindo", dados.length, "itens de Income");

    // Verificar se o filtro de mês está como "Todas" (vazio)
    const filtroMes = document.getElementById('filterMesIncome')?.value || '';
    const mostrarAgrupadoPorMes = !filtroMes; // Se não há filtro de mês, agrupar por mês

    if (mostrarAgrupadoPorMes) {
        // Agrupar por mês
        const porMes = {};
        dados.forEach(item => {
            if (!porMes[item.mes_chave]) {
                porMes[item.mes_chave] = [];
            }
            porMes[item.mes_chave].push(item);
        });

        // Ordenar meses (mais recente primeiro)
        const mesesOrdenados = Object.keys(porMes).sort((a, b) => b.localeCompare(a));

        mesesOrdenados.forEach(mesChave => {
            const itensDoMes = porMes[mesChave];
            
            // Ordenar itens do mês por valor (maior primeiro)
            itensDoMes.sort((a, b) => b.valor - a.valor);

            // Criar label do mês
            const mesLabel = document.createElement('div');
            mesLabel.className = 'mes-label-income';
            
            // Pegar o primeiro item para obter nome do mês e ano
            const primeiroItem = itensDoMes[0];
            const mesAbreviado = abreviarMes(primeiroItem.mes_nome || '');
            const ano = mesChave.split('-')[0].substring(2); // Últimos 2 dígitos do ano
            mesLabel.textContent = `${mesAbreviado}/${ano}:`;
            
            container.appendChild(mesLabel);

            // Adicionar itens do mês
            itensDoMes.forEach(item => {
                const itemDiv = criarItemDivIncome(item);
                container.appendChild(itemDiv);
            });
        });
    } else {
        // Não agrupar: exibir normalmente (ordenado por mês e valor)
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
}

function criarItemDivIncome(item) {
    const itemDiv = document.createElement('div');
    itemDiv.className = 'item';

    // Criar badge de fonte (manter primeira letra maiúscula)
    const fonteClass = item.fonte ? item.fonte.toLowerCase().replace('ó', 'o').replace('ú', 'u') : '';
    const fonteTexto = item.fonte || '';
    const fonteBadge = `<span class="fonte-badge ${fonteClass}">${fonteTexto}</span>`;

    // Usar descrição completa (campo "Descrição" do TXT)
    const descricao = item.descricao || item.recorrencia || '';

    // Criar tag de recorrência (Mensal, Pontual, Anual)
    let recorrenciaTag = '';
    if (item.frequencia) {
        const freqMap = {
            'mensal': 'Mensal',
            'anual': 'Anual',
            'pontual': 'Pontual'
        };
        const freqLabel = freqMap[item.frequencia.toLowerCase()] || item.frequencia;
        recorrenciaTag = `<span class="parcela-badge parcela-unica">${freqLabel}</span>`;
    }

    // Estrutura: [Fonte] + [Descrição] + [Valor] + [Recorrência]
    itemDiv.innerHTML = `
        ${fonteBadge}
        <div class="item-descricao">${descricao}</div>
        <div class="item-valor">R$ ${item.valor.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</div>
        ${recorrenciaTag}
    `;
    return itemDiv;
}

function filtrarIncome() {
    console.log("🔄 Filtrando Income...");
    console.log("📊 Dados globais disponíveis:", dadosIncomeGlobal?.length || 0);
    
    const filtroMes = document.getElementById('filterMesIncome')?.value || '';
    const filtroFonte = document.getElementById('filterFonteIncome')?.value || '';
    const filtroRecorrencia = document.getElementById('filterRecorrenciaIncome')?.value || '';

    let dadosFiltrados = [...dadosIncomeGlobal]; // Criar cópia para não modificar o original

    console.log("🔍 Filtros aplicados:", { filtroMes, filtroFonte, filtroRecorrencia });

    // Filtro de mês: se selecionado, mostrar apenas esse mês; se não, mostrar mês vigente (Dezembro/2025) e subsequentes
    if (filtroMes) {
        dadosFiltrados = dadosFiltrados.filter(item => item.mes_chave === filtroMes);
        console.log("📅 Filtrado por mês:", filtroMes, "-", dadosFiltrados.length, "itens");
    } else {
        // Sem filtro de mês: mostrar Dezembro/2025 e subsequentes
        const mesVigente = '2025-12';
        dadosFiltrados = dadosFiltrados.filter(item => {
            return item.mes_chave >= mesVigente;
        });
        console.log("📅 Mostrando Dezembro/2025 e subsequentes -", dadosFiltrados.length, "itens");
    }

    // Filtro de fonte (comparação exata, case-sensitive)
    if (filtroFonte) {
        dadosFiltrados = dadosFiltrados.filter(item => item.fonte === filtroFonte);
        console.log("🏦 Filtrado por fonte:", filtroFonte, "-", dadosFiltrados.length, "itens");
    }

    // Filtro de recorrência (Mensal, Pontual, Anual)
    if (filtroRecorrencia) {
        dadosFiltrados = dadosFiltrados.filter(item => {
            return item.frequencia && item.frequencia.toLowerCase() === filtroRecorrencia.toLowerCase();
        });
        console.log("🔄 Filtrado por recorrência:", filtroRecorrencia, "-", dadosFiltrados.length, "itens");
    }

    // Atualizar total
    const totalFiltrado = dadosFiltrados.reduce((sum, item) => {
        let valor = 0;
        if (item.valor !== undefined && item.valor !== null) {
            if (typeof item.valor === 'string') {
                // Se for string, limpar e converter
                let valor_limpo = item.valor.trim();
                if (valor_limpo.includes(',')) {
                    valor_limpo = valor_limpo.replace(/\./g, '').replace(',', '.');
                }
                valor = parseFloat(valor_limpo) || 0;
            } else {
                valor = Number(item.valor) || 0;
            }
        }
        return sum + valor;
    }, 0);
    
    console.log("💰 Total filtrado calculado:", totalFiltrado);
    console.log("📋 Itens filtrados:", dadosFiltrados.length);
    console.log("📋 Valores dos itens:", dadosFiltrados.map(i => ({ 
        descricao: i.descricao, 
        valor: i.valor, 
        valorTipo: typeof i.valor,
        valorParseFloat: parseFloat(i.valor),
        valorNumber: Number(i.valor)
    })));
    
    const fonteTotalIncomeEl = document.getElementById('fonteTotalIncome');
    if (fonteTotalIncomeEl) {
        const totalFormatado = `R$ ${totalFiltrado.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`;
        fonteTotalIncomeEl.textContent = totalFormatado;
        console.log("✅ Total de Income atualizado no DOM:", totalFormatado);
        console.log("✅ Elemento encontrado:", fonteTotalIncomeEl);
        console.log("✅ Texto atual:", fonteTotalIncomeEl.textContent);
    } else {
        console.error("❌ Erro: elemento fonteTotalIncome não encontrado ao filtrar");
        console.error("❌ Tentando encontrar elemento...");
        const todosElementos = document.querySelectorAll('[id*="Income"], [id*="income"]');
        console.log("🔍 Elementos relacionados encontrados:", todosElementos);
    }
    
    // Atualizar total do Outcome se o switch consolidado estiver ligado
    atualizarTotalOutcome();

    // Calcular comparação com mês anterior
    calcularComparacaoMesIncome(dadosFiltrados);

    exibirIncome(dadosFiltrados);
}

function resetarFiltrosOutcome() {
    const filterCarteiraEl = document.getElementById('filterCarteira');
    const filterFonteEl = document.getElementById('filterFonte');
    const filterMesEl = document.getElementById('filterMes');
    const filterRecorrenciaEl = document.getElementById('filterRecorrencia');
    const filterParceladoEl = document.getElementById('filterParcelado');
    const filterCategoriaEl = document.getElementById('filterCategoria');

    if (filterCarteiraEl) filterCarteiraEl.value = '';
    if (filterFonteEl) filterFonteEl.value = '';
    // Resetar mês para o mês vigente (Dezembro/2025)
    if (filterMesEl) {
        const mesVigente = '2025-12';
        // Verificar se o mês vigente existe nas opções
        const opcoes = Array.from(filterMesEl.options).map(opt => opt.value);
        if (opcoes.includes(mesVigente)) {
            filterMesEl.value = mesVigente;
        } else if (opcoes.length > 1) {
            // Se não tiver Dezembro/2025, usar a primeira opção disponível (mais recente)
            filterMesEl.value = opcoes[1]; // Pula a opção "Todas"
        } else {
            filterMesEl.value = '';
        }
    }
    if (filterRecorrenciaEl) filterRecorrenciaEl.value = '';
    if (filterParceladoEl) filterParceladoEl.value = '';
    if (filterCategoriaEl) filterCategoriaEl.value = '';
    
    // Atualizar filtros hierárquicos após resetar
    atualizarFiltrosHierarquicos(window.dados);
    filtrarTudo(categoriasOriginaisGlobal);
}

function resetarFiltrosIncome() {
    const filterMesIncomeEl = document.getElementById('filterMesIncome');
    const filterFonteIncomeEl = document.getElementById('filterFonteIncome');
    const filterRecorrenciaIncomeEl = document.getElementById('filterRecorrenciaIncome');

    // Resetar mês para o mês vigente (Dezembro/2025)
    if (filterMesIncomeEl) {
        const mesVigente = '2025-12';
        // Verificar se o mês vigente existe nas opções
        const opcoes = Array.from(filterMesIncomeEl.options).map(opt => opt.value);
        if (opcoes.includes(mesVigente)) {
            filterMesIncomeEl.value = mesVigente;
        } else if (opcoes.length > 1) {
            // Se não tiver Dezembro/2025, usar a primeira opção disponível (mais recente)
            filterMesIncomeEl.value = opcoes[1]; // Pula a opção "Todas"
        } else {
            filterMesIncomeEl.value = '';
        }
    }
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

    const diferencaFormatada = `${diferenca >= 0 ? '+' : '-'} R$ ${Math.abs(diferenca).toLocaleString('pt-BR', {minimumFractionDigits: 2})}`;

    // Formatar nome do mês anterior para exibição (apenas nome do mês, sem ano)
    const itemMesAnterior = dadosIncomeGlobal.find(d => d.mes_chave === mesAnterior);
    let nomeMesAnterior = 'mês anterior';
    
    if (itemMesAnterior && itemMesAnterior.mes_nome) {
        nomeMesAnterior = itemMesAnterior.mes_nome;
    }

    if (comparacaoValorEl) comparacaoValorEl.textContent = diferencaFormatada;
    if (comparacaoLabelEl) comparacaoLabelEl.textContent = `vs. ${nomeMesAnterior} (${percentual >= 0 ? '+' : ''}${percentual}%)`;
}

function calcularComparacaoMesOutcome() {
    const comparacaoValorEl = document.getElementById('comparacaoValor');
    const comparacaoLabelEl = document.getElementById('comparacaoLabel');
    
    if (!window.dados || window.dados.length === 0) {
        if (comparacaoValorEl) comparacaoValorEl.textContent = '- R$ 0,00';
        if (comparacaoLabelEl) comparacaoLabelEl.textContent = 'Sem dados';
        return;
    }
    
    // Calcular balanço por mês (considerando o switch consolidado)
    const toggleConsolidadoEl = document.getElementById('toggleConsolidado');
    const isConsolidado = toggleConsolidadoEl && toggleConsolidadoEl.checked;
    
    // Agrupar dados do Outcome por mês
    const balancoPorMes = {};
    
    // Processar todos os itens do Outcome e agrupar por mês
    window.dados.forEach(item => {
        // Se o item tem mes_chave, usar ele
        if (item.mes_chave) {
            if (!balancoPorMes[item.mes_chave]) {
                balancoPorMes[item.mes_chave] = { outcome: 0, income: 0 };
            }
            balancoPorMes[item.mes_chave].outcome += item.valor || 0;
        }
        // Se tem meses_parcelas, adicionar em cada mês
        if (item.meses_parcelas && item.meses_parcelas.length > 0) {
            item.meses_parcelas.forEach(mes => {
                if (!balancoPorMes[mes.chave]) {
                    balancoPorMes[mes.chave] = { outcome: 0, income: 0 };
                }
                balancoPorMes[mes.chave].outcome += item.valor || 0;
            });
        }
    });
    
    // Se consolidado, calcular Income por mês também
    if (isConsolidado && window.dadosIncome && window.dadosIncome.length > 0) {
        window.dadosIncome.forEach(item => {
            if (item.mes_chave) {
                if (!balancoPorMes[item.mes_chave]) {
                    balancoPorMes[item.mes_chave] = { outcome: 0, income: 0 };
                }
                balancoPorMes[item.mes_chave].income += item.valor || 0;
            }
        });
    }
    
    // Calcular balanço final por mês
    const balancoFinalPorMes = {};
    Object.keys(balancoPorMes).forEach(mesChave => {
        const { outcome, income } = balancoPorMes[mesChave];
        balancoFinalPorMes[mesChave] = isConsolidado ? (outcome - income) : outcome;
    });
    
    const mesesOrdenados = Object.keys(balancoFinalPorMes).sort().reverse();
    
    if (mesesOrdenados.length < 2) {
        if (comparacaoValorEl) comparacaoValorEl.textContent = '- R$ 0,00';
        if (comparacaoLabelEl) comparacaoLabelEl.textContent = 'Sem dados anteriores';
        return;
    }
    
    // Determinar o mês atual baseado no filtro
    const filterMesEl = document.getElementById('filterMes');
    const filtroMes = filterMesEl ? filterMesEl.value : '';
    const mesAtual = filtroMes && mesesOrdenados.includes(filtroMes) ? filtroMes : mesesOrdenados[0];
    
    // Encontrar o mês anterior
    const indexMesAtual = mesesOrdenados.indexOf(mesAtual);
    if (indexMesAtual === -1 || indexMesAtual === mesesOrdenados.length - 1) {
        if (comparacaoValorEl) comparacaoValorEl.textContent = '- R$ 0,00';
        if (comparacaoLabelEl) comparacaoLabelEl.textContent = 'Sem dados anteriores';
        return;
    }
    
    const mesAnterior = mesesOrdenados[indexMesAtual + 1];
    const balancoAtual = balancoFinalPorMes[mesAtual];
    const balancoAnterior = balancoFinalPorMes[mesAnterior];
    const diferenca = balancoAtual - balancoAnterior;
    
    // Calcular percentual
    const percentual = balancoAnterior !== 0 ? ((diferenca / Math.abs(balancoAnterior)) * 100).toFixed(1) : 0;
    
    // Formatar diferença (sempre com sinal + ou - antes do valor)
    const diferencaFormatada = `${diferenca >= 0 ? '+' : '-'} R$ ${Math.abs(diferenca).toLocaleString('pt-BR', {minimumFractionDigits: 2})}`;
    
    // Obter nome do mês anterior
    const [anoAnterior, mesAnteriorNum] = mesAnterior.split('-');
    const nomeMesAnterior = MESES_PT[parseInt(mesAnteriorNum)];
    
    if (comparacaoValorEl) comparacaoValorEl.textContent = diferencaFormatada;
    if (comparacaoLabelEl) comparacaoLabelEl.textContent = `vs. ${nomeMesAnterior} (${percentual >= 0 ? '+' : ''}${percentual}%)`;
    
    // Atualizar indicador visual
    const comparacaoIndicadorEl = document.getElementById('comparacaoIndicador');
    if (comparacaoIndicadorEl) {
        comparacaoIndicadorEl.className = 'comparacao-indicador';
        if (diferenca > 0) {
            comparacaoIndicadorEl.classList.add('positivo');
        } else if (diferenca < 0) {
            comparacaoIndicadorEl.classList.add('negativo');
        }
    }
}

