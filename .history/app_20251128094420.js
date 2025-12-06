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

    document.getElementById('totalGeral').textContent = `R$ ${totalGeral.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`;
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
    document.getElementById('filterTipoCompra').addEventListener('change', () => {
        atualizarTituloTotal();
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
    
    const fonteClass = item.fonte.toLowerCase().replace('ú', 'u');
    
    let parcelaBadge = '';
    if (item.parcela_atual && item.parcelas_total) {
        parcelaBadge = `<span class="parcela-badge">Parcela ${item.parcela_atual}/${item.parcelas_total}</span>`;
    } else {
        parcelaBadge = `<span class="parcela-badge parcela-unica">Única</span>`;
    }

    itemDiv.innerHTML = `
        <span class="fonte-badge ${fonteClass}">${item.fonte}</span>
        <div class="item-descricao">${descricao}</div>
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
    const tipoCompra = document.getElementById('filterTipoCompra').value;
    const labelElement = document.getElementById('totalLabel');
    
    if (tipoCompra === 'todas') {
        labelElement.textContent = 'Todas as compras';
    } else if (tipoCompra === 'unicas') {
        labelElement.textContent = 'Compras sem parcelas';
    } else if (tipoCompra === 'parceladas') {
        labelElement.textContent = 'Compras parceladas';
    }
}

function sincronizarFiltros(tipo) {
    // Função simplificada - sincronização não é mais necessária
}

function filtrarTudo(categoriasOriginais) {
    filtrarCategoriasPrincipais(categoriasOriginais);
}

function filtrarCategoriasPrincipais(categoriasOriginais) {
    const filtroCategoria = document.getElementById('filterCategoria').value;
    const filtroFonte = document.getElementById('filterFonte').value;
    const filtroMes = document.getElementById('filterMes').value;
    const filtroTipoCompra = document.getElementById('filterTipoCompra').value;
    const filtroBusca = document.getElementById('filterBusca').value.toLowerCase().trim();

    let categoriasFiltradas = categoriasOriginais;

    if (filtroCategoria) {
        categoriasFiltradas = categoriasFiltradas.filter(cat => cat.nome === filtroCategoria);
    }

    if (filtroFonte || filtroMes || filtroTipoCompra !== 'todas' || filtroBusca) {
        categoriasFiltradas = categoriasFiltradas.map(cat => {
            const itensFiltrados = cat.itens.filter(item => {
                let passaFonte = !filtroFonte || item.fonte === filtroFonte;
                let passaMes = !filtroMes; // Por enquanto, aceita todos se não tem filtro de mês
                let passaTipoCompra = true;
                let passaBusca = true;
                
                // Filtro por tipo de compra
                if (filtroTipoCompra === 'unicas') {
                    passaTipoCompra = !item.parcela_atual; // Compras sem parcelas
                } else if (filtroTipoCompra === 'parceladas') {
                    passaTipoCompra = item.parcela_atual !== null; // Compras parceladas
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
                
                return passaFonte && passaMes && passaTipoCompra && passaBusca;
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

    exibirCategorias(categoriasFiltradas);
}

// Funções de parcelas removidas - não mais necessárias

