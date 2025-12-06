const subcategoryFilters = {};
const categoryTotals = {};
let categoriasOriginaisGlobal = [];

// Mapeamento de grupos de subcategorias - apenas para categoria COMPRAS
const SUBCATEGORY_GROUPS = {
    'COMPRAS': {
        'COMPRA ONLINE': ['ALIEXPRESS', 'AMAZON', 'MERCADO LIVRE']
    }
};

inicializarDashboard(dados);

function inicializarDashboard(dados) {
    const totalGeral = dados.reduce((sum, item) => sum + item.valor, 0);
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

    document.getElementById('totalCompras').textContent = totalCompras;
    document.getElementById('totalParceladas').textContent = totalParceladas;
    document.getElementById('totalCategorias').textContent = totalCategorias;
    document.getElementById('fonteTotal').textContent = `R$ ${totalGeral.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`;

    const categoriasArray = Object.values(categorias).sort((a, b) => b.total - a.total);
    categoriasOriginaisGlobal = categoriasArray;

    categoriasArray.forEach(cat => {
        subcategoryFilters[cat.nome] = 'TODOS';
    });

    criarGraficoPizza(categoriasArray);

    const selectCategoria = document.getElementById('filterCategoria');
    categoriasArray.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat.nome;
        option.textContent = `${cat.nome} (R$ ${cat.total.toLocaleString('pt-BR', {minimumFractionDigits: 2})})`;
        selectCategoria.appendChild(option);
    });

    // Preencher select de meses
    const mesesSet = new Set();
    dados.forEach(item => {
        if (item.meses_parcelas) {
            item.meses_parcelas.forEach(mesParcela => {
                mesesSet.add(JSON.stringify({chave: mesParcela.chave, nome: mesParcela.nome}));
            });
        }
    });
    
    const mesesArray = Array.from(mesesSet).map(m => JSON.parse(m)).sort((a, b) => a.chave.localeCompare(b.chave));
    
    const mesFilter = document.getElementById('filterMes');
    mesesArray.forEach(mes => {
        const option = document.createElement('option');
        option.value = mes.chave;
        option.textContent = mes.nome;
        mesFilter.appendChild(option);
    });

    exibirCategorias(categoriasArray);

    document.getElementById('filterBusca').addEventListener('input', () => {
        filtrarTudo(categoriasArray);
    });
    document.getElementById('filterCategoria').addEventListener('change', () => {
        sincronizarFiltros('categoria');
        filtrarTudo(categoriasArray);
    });
    document.getElementById('filterFonte').addEventListener('change', () => {
        sincronizarFiltros('fonte');
        filtrarTudo(categoriasArray);
    });
    document.getElementById('filterMes').addEventListener('change', () => {
        sincronizarFiltros('mes');
        filtrarTudo(categoriasArray);
    });

    // Filtro de carteira
    document.getElementById('filterCarteira').addEventListener('change', () => {
        filtrarTudo(categoriasArray);
    });

    // Filtro de cobrança (controla habilitação do filtro Tipo)
    document.getElementById('filterCobranca').addEventListener('change', () => {
        const cobranca = document.getElementById('filterCobranca').value;
        const tipoSelect = document.getElementById('filterTipo');
        
        // Desabilita filtro Tipo se "Únicas" estiver selecionado
        if (cobranca === 'unicas') {
            tipoSelect.disabled = true;
            tipoSelect.value = 'tudo';
        } else {
            tipoSelect.disabled = false;
        }
        
        filtrarTudo(categoriasArray);
    });

    // Filtro de tipo
    document.getElementById('filterTipo').addEventListener('change', () => {
        filtrarTudo(categoriasArray);
    });

    // Botão resetar filtros
    document.getElementById('btnResetarFiltros').addEventListener('click', () => {
        document.getElementById('filterBusca').value = '';
        document.getElementById('filterCarteira').value = '';
        document.getElementById('filterCategoria').value = '';
        document.getElementById('filterFonte').value = '';
        document.getElementById('filterMes').value = '';
        document.getElementById('filterCobranca').value = 'todas';
        document.getElementById('filterTipo').value = 'tudo';
        document.getElementById('filterTipo').disabled = true;
        filtrarTudo(categoriasArray);
    });

}

function criarGraficoPizza(categorias) {
    const ctx = document.getElementById('pieChart').getContext('2d');
    
    const cores = [
        '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF',
        '#FF9F40', '#E74C3C', '#2ECC71', '#3498DB', '#F39C12',
        '#9B59B6', '#1ABC9C', '#E67E22', '#95A5A6', '#34495E'
    ];

    const categoriasLimitadas = categorias.slice(0, 15);
    const totalGeral = categoriasLimitadas.reduce((sum, c) => sum + c.total, 0);

    new Chart(ctx, {
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
    legendContainer.innerHTML = '';

    categoriasLimitadas.forEach((categoria, index) => {
        const percentage = ((categoria.total / totalGeral) * 100).toFixed(1);
        
        const legendItem = document.createElement('div');
        legendItem.className = 'legend-item';
        legendItem.innerHTML = `
            <div class="legend-color" style="background-color: ${cores[index]}"></div>
            <div class="legend-info">
                <div class="legend-name">${categoria.nome}</div>
                <div class="legend-value">R$ ${categoria.total.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</div>
            </div>
            <div class="legend-percentage">${percentage}%</div>
        `;
        
        legendContainer.appendChild(legendItem);
    });
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
    const content = card.querySelector('.category-content');
    const toggle = card.querySelector('.category-toggle');

    if (content.classList.contains('expanded')) {
        content.classList.remove('expanded');
        toggle.classList.add('collapsed');
    } else {
        content.classList.add('expanded');
        toggle.classList.remove('collapsed');
    }
}

function exibirCategorias(categorias) {
    const container = document.getElementById('categoriesList');
    container.innerHTML = '';

    categorias.forEach(categoria => {
        const card = document.createElement('div');
        card.className = 'category-card';
        card.dataset.categoria = categoria.nome;

        const header = document.createElement('div');
        header.className = 'category-header';
        header.onclick = () => toggleCategory(categoria.nome);
        header.innerHTML = `
            <div class="category-header-left">
                <div class="category-toggle collapsed">▼</div>
                <div class="category-name">${categoria.nome}</div>
            </div>
            <div class="category-total-container">
                <div class="category-total">R$ ${categoria.total.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</div>
                <div class="category-percentage"></div>
            </div>
        `;
        card.appendChild(header);

        const contentDiv = document.createElement('div');
        contentDiv.className = 'category-content';

        const filters = getSubcategoryFilters(categoria);
        
        if (filters.length > 1) {
            const filtersDiv = document.createElement('div');
            filtersDiv.className = 'subcategory-filters';

            filters.forEach((filter, index) => {
                const btn = document.createElement('button');
                btn.className = 'subcategory-filter-btn';
                if (index === 0) btn.classList.add('active');
                btn.textContent = filter.label;
                btn.onclick = (e) => {
                    e.stopPropagation();
                    filtrarSubcategoria(categoria.nome, filter);
                };
                filtersDiv.appendChild(btn);
            });

            contentDiv.appendChild(filtersDiv);
        }

        const itensContainer = document.createElement('div');
        itensContainer.className = 'itens-container';
        
        const itensOrdenados = categoria.itens.sort((a, b) => b.valor - a.valor);

        itensOrdenados.forEach(item => {
            const itemDiv = criarItemDiv(item);
            itensContainer.appendChild(itemDiv);
        });

        contentDiv.appendChild(itensContainer);
        card.appendChild(contentDiv);
        container.appendChild(card);
    });
}

function criarItemDiv(item) {
    const itemDiv = document.createElement('div');
    itemDiv.className = item.novo ? 'item item-novo' : 'item';
    itemDiv.dataset.fonte = item.fonte;
    itemDiv.dataset.subcategoria = item.subcategoria;
    itemDiv.dataset.descricao = item.linha_original.toLowerCase();

    let descricao = item.categoria_completa;
    
    const fonteClass = item.fonte.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    
    let parcelaBadge = '';
    if (item.parcela_atual && item.parcelas_total) {
        parcelaBadge = `<span class="parcela-badge">Parcela ${item.parcela_atual}/${item.parcelas_total}</span>`;
    } else {
        parcelaBadge = `<span class="parcela-badge parcela-unica">Única</span>`;
    }

    // Adicionar tooltip se houver gasto original
    const tooltipAttr = item.gasto_original ? `data-tooltip="${item.gasto_original}"` : '';
    const tooltipClass = item.gasto_original ? 'has-tooltip' : '';

    itemDiv.innerHTML = `
        <span class="fonte-badge ${fonteClass}">${item.fonte}</span>
        <div class="item-descricao ${tooltipClass}" ${tooltipAttr}>${descricao}</div>
        <div class="item-valor">R$ ${item.valor.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</div>
        ${parcelaBadge}
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

function atualizarTituloTotal() {
    // Função não mais necessária - mantida para compatibilidade
}

function sincronizarFiltros(tipo) {
    // Função simplificada - sincronização não é mais necessária
}

function filtrarTudo(categoriasOriginais) {
    filtrarCategoriasPrincipais(categoriasOriginais);
}

function filtrarCategoriasPrincipais(categoriasOriginais) {
    const filtroCarteira = document.getElementById('filterCarteira').value;
    const filtroCategoria = document.getElementById('filterCategoria').value;
    const filtroFonte = document.getElementById('filterFonte').value;
    const filtroMes = document.getElementById('filterMes').value;
    const filtroCobranca = document.getElementById('filterCobranca').value;
    const filtroTipo = document.getElementById('filterTipo').value;
    const filtroBusca = document.getElementById('filterBusca').value.toLowerCase().trim();
    
    let categoriasFiltradas = categoriasOriginais;

    if (filtroCategoria) {
        categoriasFiltradas = categoriasFiltradas.filter(cat => cat.nome === filtroCategoria);
    }

    if (filtroCarteira || filtroFonte || filtroMes || filtroCobranca !== 'todas' || filtroTipo !== 'tudo' || filtroBusca) {
        categoriasFiltradas = categoriasFiltradas.map(cat => {
            const itensFiltrados = cat.itens.filter(item => {
                let passaCarteira = !filtroCarteira || item.carteira === filtroCarteira;
                
                if (filtroCarteira && cat.itens.indexOf(item) === 0) {
                    console.log('Item carteira:', item.carteira, 'Filtro:', filtroCarteira, 'Passa?', passaCarteira);
                }
                
                let passaFonte = !filtroFonte || item.fonte === filtroFonte;
                
                // Verificar se o item tem parcela neste mês
                let passaMes = !filtroMes;
                if (filtroMes && item.meses_parcelas) {
                    passaMes = item.meses_parcelas.some(mp => mp.chave === filtroMes);
                }
                
                let passaCobranca = true;
                let passaTipo = true;
                let passaBusca = true;
                
                // Filtro por cobrança
                if (filtroCobranca === 'unicas') {
                    passaCobranca = !item.parcela_atual; // Compras sem parcelas
                } else if (filtroCobranca === 'parceladas') {
                    passaCobranca = item.parcela_atual !== null; // Compras parceladas
                } else if (filtroCobranca === 'mensal') {
                    passaCobranca = item.frequencia === 'mensal';
                } else if (filtroCobranca === 'anual') {
                    passaCobranca = item.frequencia === 'anual';
                }
                
                // Filtro por tipo (fixo/não fixo)
                if (filtroTipo === 'fixo') {
                    passaTipo = item.tipo === 'fix';
                } else if (filtroTipo === 'nao-fixo') {
                    passaTipo = item.tipo === 'nfix';
                }
                
                // Filtro por busca
                if (filtroBusca) {
                    const textoItem = item.linha_original.toLowerCase();
                    const categoria = item.categoria_completa.toLowerCase();
                    const subcategoria = item.subcategoria.toLowerCase();
                    passaBusca = textoItem.includes(filtroBusca) || 
                                categoria.includes(filtroBusca) || 
                                subcategoria.includes(filtroBusca);
                }
                
                return passaCarteira && passaFonte && passaMes && passaCobranca && passaTipo && passaBusca;
            });

            if (itensFiltrados.length > 0) {
                return {
                    ...cat,
                    itens: itensFiltrados,
                    total: itensFiltrados.reduce((sum, item) => sum + item.valor, 0)
                };
            }
            return null;
        }).filter(cat => cat !== null);
    }

    const totalFonte = categoriasFiltradas.reduce((sum, cat) => sum + cat.total, 0);
    document.getElementById('fonteTotal').textContent = `R$ ${totalFonte.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`;

    // Atualizar estatísticas
    const totalItens = categoriasFiltradas.reduce((sum, cat) => sum + cat.itens.length, 0);
    const totalParceladasFiltradas = categoriasFiltradas.reduce((sum, cat) => {
        return sum + cat.itens.filter(item => item.parcela_atual).length;
    }, 0);
    const totalCategoriasFiltradas = categoriasFiltradas.length;

    document.getElementById('totalCompras').textContent = totalItens;
    document.getElementById('totalParceladas').textContent = totalParceladasFiltradas;
    document.getElementById('totalCategorias').textContent = totalCategoriasFiltradas;

    exibirCategorias(categoriasFiltradas);
}

// Funções de parcelas removidas - não mais necessárias

