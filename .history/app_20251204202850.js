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

// Aguardar DOM estar pronto antes de inicializar
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        // Usar setTimeout para garantir que os scripts inline no HTML já foram executados
        setTimeout(() => {
            if (typeof window.dados !== 'undefined') inicializarDashboard(window.dados);
            if (typeof window.dadosIncome !== 'undefined') inicializarIncome(window.dadosIncome);
        }, 0);
    });
} else {
    // DOM já está pronto
    if (typeof window.dados !== 'undefined') inicializarDashboard(window.dados);
    if (typeof window.dadosIncome !== 'undefined') inicializarIncome(window.dadosIncome);
}

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

    // Atualizar apenas elementos que existem no HTML
    atualizarTotalOutcome(totalGeral);

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
    calcularPrevisaoParcelas(dados);

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
            filtrarTudo(categoriasArray);
        });
    }
    
    const filterMesEl = document.getElementById('filterMes');
    if (filterMesEl) {
        filterMesEl.addEventListener('change', () => {
            sincronizarFiltros('mes');
            filtrarTudo(categoriasArray);
        });
    }
    
    const filterCarteiraEl = document.getElementById('filterCarteira');
    if (filterCarteiraEl) {
        filterCarteiraEl.addEventListener('change', () => {
            filtrarTudo(categoriasArray);
        });
    }
    
    const filterCobrancaEl = document.getElementById('filterCobranca');
    if (filterCobrancaEl) {
        filterCobrancaEl.addEventListener('change', () => {
            filtrarTudo(categoriasArray);
        });
    }
    
    const filterTipoCompraEl = document.getElementById('filterTipoCompra');
    if (filterTipoCompraEl) {
        filterTipoCompraEl.addEventListener('change', () => {
            atualizarTituloTotal();
            filtrarTudo(categoriasArray);
        });
    }
    
    // Listener do filtro de busca
    const filterBuscaEl = document.getElementById('filterBusca');
    if (filterBuscaEl) {
        filterBuscaEl.addEventListener('input', () => {
            filtrarTudo(categoriasArray);
        });
    }
    
    // Listener do botão resetar filtros
    const btnResetarFiltrosEl = document.getElementById('btnResetarFiltros');
    if (btnResetarFiltrosEl) {
        btnResetarFiltrosEl.addEventListener('click', () => resetarFiltrosOutcome(categoriasArray));
    }
    
    // Listener do toggle para adicionar/subtrair Income
    const toggleConsolidadoEl = document.getElementById('toggleConsolidado');
    if (toggleConsolidadoEl) {
        toggleConsolidadoEl.addEventListener('change', () => {
            // Obter o total original armazenado e aplicar o toggle (sem atualizar o original)
            const fonteTotalEl = document.getElementById('fonteTotal');
            if (fonteTotalEl && fonteTotalEl.dataset.totalOriginal) {
                const totalOriginal = parseFloat(fonteTotalEl.dataset.totalOriginal);
                atualizarTotalOutcome(totalOriginal, false); // false = não atualizar o original, apenas aplicar toggle
            } else {
                // Se não houver total armazenado, recalcular usando a mesma lógica de filtrarCategoriasPrincipais
                filtrarCategoriasPrincipais(categoriasArray);
            }
        });
    }

    // Listeners dos filtros de parcelas
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
}

function criarGraficoPizza(categorias) {
    const ctx = document.getElementById('pieChart').getContext('2d');
    
    const cores = [
        '#FFB3BA', '#BAE1FF', '#FFFFBA', '#BAFFC9', '#FFDFBA',
        '#E0BBE4', '#FEC8C1', '#FFD3A5', '#FD9853', '#A8E6CF',
        '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2'
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
                borderWidth: 0
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
        
        // Capitalizar nome: primeira letra maiúscula, resto minúsculo
        const nomeCapitalizado = categoria.nome.charAt(0).toUpperCase() + categoria.nome.slice(1).toLowerCase();
        
        const legendItem = document.createElement('div');
        legendItem.className = 'legend-item';
        legendItem.innerHTML = `
            <div class="legend-left">
                <div class="legend-color" style="background-color: ${cores[index]}"></div>
                <div class="legend-name">${nomeCapitalizado}</div>
            </div>
            <div class="legend-right">
                <div class="legend-value">R$ ${categoria.total.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</div>
                <div class="legend-percentage">${percentage}%</div>
            </div>
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

    // Se não houver categorias, exibir mensagem e retornar
    if (!categorias || categorias.length === 0) {
        container.innerHTML = '<div class="empty-message">Nenhum resultado encontrado com os filtros selecionados.</div>';
        return;
    }

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
    itemDiv.className = 'item';
    itemDiv.dataset.fonte = item.fonte;
    itemDiv.dataset.subcategoria = item.subcategoria;
    itemDiv.dataset.descricao = item.linha_original.toLowerCase();

    // Extrair apenas o nome do item (sem categoria) e capitalizar (primeira letra maiúscula)
    let descricao = '';
    
    // Se categoria_completa existe e contém "/", pegar apenas a parte após a barra
    if (item.categoria_completa && item.categoria_completa.includes('/')) {
        descricao = item.categoria_completa.split('/').pop().trim();
    } else if (item.subcategoria) {
        descricao = item.subcategoria;
    } else if (item.categoria_completa) {
        descricao = item.categoria_completa;
    }
    
    // Capitalizar: primeira letra maiúscula, resto minúsculo
    if (descricao) {
        descricao = descricao.charAt(0).toUpperCase() + descricao.slice(1).toLowerCase();
    }

    // Criar badge de categoria
    const categoriaClass = item.categoria.toLowerCase().replace(/\s+/g, '-').replace('ó', 'o').replace('ú', 'u');
    const categoriaTexto = item.categoria.toLowerCase();
    const categoriaBadge = `<span class="categoria-badge ${categoriaClass}">${categoriaTexto}</span>`;

    // Criar badge de fonte (tudo em caixa baixa, igual ao Income)
    const fonteClass = item.fonte.toLowerCase().replace('ó', 'o').replace('ú', 'u');
    const fonteTexto = item.fonte.toLowerCase();
    const fonteBadge = `<span class="fonte-badge ${fonteClass}">${fonteTexto}</span>`;

    // Criar badge de cobrança (parcela ou única)
    let cobrancaBadge = '';
    if (item.parcela_atual && item.parcelas_total) {
        cobrancaBadge = `<span class="cobranca-badge">Parcela ${item.parcela_atual}/${item.parcelas_total}</span>`;
    } else {
        cobrancaBadge = `<span class="cobranca-badge cobranca-unica">Única</span>`;
    }

    itemDiv.innerHTML = `
        ${categoriaBadge}
        ${fonteBadge}
        <div class="item-descricao">${descricao}</div>
        <div class="item-valor">R$ ${item.valor.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</div>
        ${cobrancaBadge}
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
    const filterTipoCompraEl = document.getElementById('filterTipoCompra');
    const labelElement = document.getElementById('totalLabel');
    
    if (!filterTipoCompraEl || !labelElement) return;
    
    const tipoCompra = filterTipoCompraEl.value;
    
    if (tipoCompra === 'todas') {
        labelElement.textContent = 'Todas as compras';
    } else if (tipoCompra === 'unicas') {
        labelElement.textContent = 'Compras sem parcelas';
    } else if (tipoCompra === 'parceladas') {
        labelElement.textContent = 'Compras parceladas';
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
    // Usar categoriasOriginaisGlobal se disponível, senão usar o parâmetro
    const categoriasParaFiltrar = categoriasOriginaisGlobal || categoriasOriginais;
    filtrarCategoriasPrincipais(categoriasParaFiltrar);
    filtrarParcelas();
}

function filtrarCategoriasPrincipais(categoriasOriginais) {
    if (!categoriasOriginais || categoriasOriginais.length === 0) {
        return;
    }
    
    const filtroCategoriaEl = document.getElementById('filterCategoria');
    const filtroFonteEl = document.getElementById('filterFonte');
    const filtroMesEl = document.getElementById('filterMes');
    const filtroCarteiraEl = document.getElementById('filterCarteira');
    const filtroCobrancaEl = document.getElementById('filterCobranca');
    const filtroTipoCompraEl = document.getElementById('filterTipoCompra');
    const filtroBuscaEl = document.getElementById('filterBusca');
    
    const filtroCategoria = filtroCategoriaEl ? filtroCategoriaEl.value : '';
    const filtroFonte = filtroFonteEl ? filtroFonteEl.value : '';
    const filtroMes = filtroMesEl ? filtroMesEl.value : '';
    const filtroCarteira = filtroCarteiraEl ? filtroCarteiraEl.value : '';
    const filtroCobranca = filtroCobrancaEl ? filtroCobrancaEl.value : 'todas';
    const filtroTipoCompra = filtroTipoCompraEl ? filtroTipoCompraEl.value : 'todas';
    const filtroBusca = filtroBuscaEl ? filtroBuscaEl.value.toLowerCase().trim() : '';

    // Começar com todas as categorias originais
    let categoriasFiltradas = [...categoriasOriginais];

    // Filtrar por categoria primeiro (se houver filtro)
    if (filtroCategoria) {
        categoriasFiltradas = categoriasFiltradas.filter(cat => cat.nome === filtroCategoria);
    }

    // Sempre aplicar filtros de carteira, fonte, mês, cobrança e tipo de compra nos itens de cada categoria
    categoriasFiltradas = categoriasFiltradas.map(cat => {
        // Filtrar os itens da categoria com base nos filtros
        const itensFiltrados = cat.itens.filter(item => {
            let passaCarteira = !filtroCarteira || item.carteira === filtroCarteira;
            let passaFonte = !filtroFonte || item.fonte === filtroFonte;
            
            // Filtro de mês: verificar se o item tem o mês em meses_parcelas ou se tem mes_chave
            let passaMes = true;
            if (filtroMes) {
                if (item.mes_chave) {
                    // Se tem mes_chave diretamente, comparar
                    passaMes = item.mes_chave === filtroMes;
                } else if (item.meses_parcelas && item.meses_parcelas.length > 0) {
                    // Se tem meses_parcelas, verificar se algum mês corresponde ao filtro
                    passaMes = item.meses_parcelas.some(mes => mes.chave === filtroMes);
                } else {
                    // Se não tem informação de mês, não passa no filtro
                    passaMes = false;
                }
            }
            
            // Filtro de cobrança
            let passaCobranca = true;
            if (filtroCobranca && filtroCobranca !== 'todas') {
                if (filtroCobranca === 'simples') {
                    // Simples: frequencia === "simples"
                    passaCobranca = item.frequencia && item.frequencia.toLowerCase() === 'simples';
                } else if (filtroCobranca === 'parceladas') {
                    // Parceladas: frequencia === "parcelada"
                    passaCobranca = item.frequencia && item.frequencia.toLowerCase() === 'parcelada';
                } else if (filtroCobranca === 'fixa') {
                    // Fixa: tipo === "fix"
                    passaCobranca = item.tipo && item.tipo.toLowerCase() === 'fix';
                } else if (filtroCobranca === 'anual') {
                    // Anual: frequencia === "anual"
                    passaCobranca = item.frequencia && item.frequencia.toLowerCase() === 'anual';
                }
            }
            
            let passaTipoCompra = true;
            
            // Filtro por tipo de compra
            if (filtroTipoCompra === 'unicas') {
                passaTipoCompra = !item.parcela_atual; // Compras sem parcelas
            } else if (filtroTipoCompra === 'parceladas') {
                passaTipoCompra = item.parcela_atual !== null; // Compras parceladas
            }
            
            // Filtro de busca: busca na descrição, categoria, subcategoria e linha original
            let passaBusca = true;
            if (filtroBusca) {
                const textoBusca = filtroBusca.toLowerCase();
                const descricao = (item.categoria_completa || '').toLowerCase();
                const subcategoria = (item.subcategoria || '').toLowerCase();
                const categoria = (item.categoria || '').toLowerCase();
                const linhaOriginal = (item.linha_original || '').toLowerCase();
                const gastoOriginal = (item.gasto_original || '').toLowerCase();
                
                passaBusca = descricao.includes(textoBusca) ||
                             subcategoria.includes(textoBusca) ||
                             categoria.includes(textoBusca) ||
                             linhaOriginal.includes(textoBusca) ||
                             gastoOriginal.includes(textoBusca);
            }
            
            return passaCarteira && passaFonte && passaMes && passaCobranca && passaTipoCompra && passaBusca;
        });

        // Se não houver itens filtrados, retornar null para remover a categoria
        if (itensFiltrados.length === 0) {
            return null;
        }

        // Recalcular o total da categoria com base nos itens filtrados
        return {
            ...cat,
            itens: itensFiltrados,
            total: itensFiltrados.reduce((sum, item) => sum + item.valor, 0)
        };
    }).filter(cat => cat !== null);

    // Calcular total: se não houver categorias filtradas, o total é zero
    const totalFonte = categoriasFiltradas.length > 0 
        ? categoriasFiltradas.reduce((sum, cat) => sum + cat.total, 0)
        : 0;
    
    // Sempre atualizar o total original quando os filtros mudam
    // Se não houver resultados, o total será zero
    atualizarTotalOutcome(totalFonte, true);

    // Exibir categorias (pode estar vazio se não houver resultados)
    exibirCategorias(categoriasFiltradas);
}

function atualizarTotalOutcome(totalOutcome, atualizarOriginal = true) {
    const fonteTotalEl = document.getElementById('fonteTotal');
    if (!fonteTotalEl) return;
    
    const toggleConsolidado = document.getElementById('toggleConsolidado');
    
    // Determinar qual total usar para exibição
    let totalParaExibir;
    
    if (atualizarOriginal) {
        // Se deve atualizar o original, usar o totalOutcome (pode ser 0)
        if (totalOutcome !== undefined && totalOutcome !== null && !isNaN(totalOutcome)) {
            totalParaExibir = totalOutcome;
            // Atualizar o dataset para manter consistência
            fonteTotalEl.dataset.totalOriginal = totalOutcome.toString();
        } else {
            // Se totalOutcome for inválido, tentar usar o valor armazenado
            const totalArmazenado = parseFloat(fonteTotalEl.dataset.totalOriginal);
            if (!isNaN(totalArmazenado) && totalArmazenado >= 0) {
                totalParaExibir = totalArmazenado;
            } else {
                // Se não houver valor válido, não fazer nada
                return;
            }
        }
    } else {
        // Se não deve atualizar o original, usar o valor armazenado
        const totalArmazenado = parseFloat(fonteTotalEl.dataset.totalOriginal);
        if (!isNaN(totalArmazenado) && totalArmazenado >= 0) {
            totalParaExibir = totalArmazenado;
        } else {
            // Se não houver valor armazenado válido, usar totalOutcome como fallback
            if (totalOutcome !== undefined && totalOutcome !== null && !isNaN(totalOutcome)) {
                totalParaExibir = totalOutcome;
            } else {
                return;
            }
        }
    }
    
    // Se o toggle estiver ligado, subtrair o Income do total do Outcome
    if (toggleConsolidado && toggleConsolidado.checked) {
        const fonteTotalIncomeEl = document.getElementById('fonteTotalIncome');
        if (fonteTotalIncomeEl) {
            // Extrair o valor do Income do texto formatado "R$ X.XXX,XX"
            let textoIncome = fonteTotalIncomeEl.textContent.replace(/[^\d,]/g, '');
            textoIncome = textoIncome.replace(/\./g, '').replace(',', '.');
            const totalIncome = parseFloat(textoIncome) || 0;
            const totalFinal = totalParaExibir - totalIncome;
            fonteTotalEl.textContent = `R$ ${totalFinal.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`;
        } else {
            // Se não encontrar o Income, mostrar o total
            fonteTotalEl.textContent = `R$ ${totalParaExibir.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`;
        }
    } else {
        // Se o toggle estiver desligado, mostrar o total do Outcome
        fonteTotalEl.textContent = `R$ ${totalParaExibir.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`;
    }
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
        
        // Definir mês vigente como padrão
        const hoje = new Date();
        const mesAtual = hoje.getMonth() + 1; // getMonth() retorna 0-11
        const anoAtual = hoje.getFullYear();
        const mesChaveAtual = `${anoAtual}-${String(mesAtual).padStart(2, '0')}`;
        
        if (mesesArray.some(m => m.chave === mesChaveAtual)) {
            mesFilterGlobal.value = mesChaveAtual;
            // Disparar evento change para aplicar o filtro
            mesFilterGlobal.dispatchEvent(new Event('change'));
        }
    }

    // Preencher select de categorias nas parcelas
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

    // Preencher select de meses de parcela (específico da seção)
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

    exibirParcelas(todasParcelas);
}

function filtrarParcelas() {
    // Pegar filtros globais com verificações de null
    const filterCategoriaEl = document.getElementById('filterCategoria');
    const filterCategoriaParcelasEl = document.getElementById('filterCategoriaParcelas');
    const filterFonteEl = document.getElementById('filterFonte');
    const filterFonteParcelasEl = document.getElementById('filterFonteParcelas');
    const filterMesEl = document.getElementById('filterMes');
    const filterMesParcelasEl = document.getElementById('filterMesParcelas');
    const filterTipoCompraEl = document.getElementById('filterTipoCompra');
    
    const categoriaGlobal = (filterCategoriaEl ? filterCategoriaEl.value : '') || (filterCategoriaParcelasEl ? filterCategoriaParcelasEl.value : '');
    const fonteGlobal = (filterFonteEl ? filterFonteEl.value : '') || (filterFonteParcelasEl ? filterFonteParcelasEl.value : '');
    const mesGlobal = (filterMesEl ? filterMesEl.value : '') || (filterMesParcelasEl ? filterMesParcelasEl.value : '');
    const tipoCompraGlobal = filterTipoCompraEl ? filterTipoCompraEl.value : 'todas';
    
    let parcelasFiltradas = todasParcelas;

    // Aplicar filtro de tipo de compra
    // Na seção de parcelas, só mostramos se o filtro for "todas" ou "parceladas"
    if (tipoCompraGlobal === 'unicas') {
        // Se filtrou por "únicas", não mostra nenhuma parcela
        parcelasFiltradas = [];
    }

    // Aplicar filtro de categoria (global)
    if (categoriaGlobal && parcelasFiltradas.length > 0) {
        parcelasFiltradas = parcelasFiltradas.filter(p => p.categoria === categoriaGlobal);
    }

    // Aplicar filtro de fonte (global)
    if (fonteGlobal && parcelasFiltradas.length > 0) {
        parcelasFiltradas = parcelasFiltradas.filter(p => p.fonte === fonteGlobal);
    }

    // Aplicar filtro de mês (global)
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
    
    // Atualizar total do Outcome se o toggle estiver ligado
    const toggleConsolidadoEl = document.getElementById('toggleConsolidado');
    if (toggleConsolidadoEl && toggleConsolidadoEl.checked) {
        // Apenas atualizar o display usando o total original armazenado (sem recalcular)
        const fonteTotalEl = document.getElementById('fonteTotal');
        if (fonteTotalEl && fonteTotalEl.dataset.totalOriginal) {
            const totalOriginal = parseFloat(fonteTotalEl.dataset.totalOriginal);
            atualizarTotalOutcome(totalOriginal, false); // false = não atualizar o original, apenas aplicar toggle
        }
    }

    // Calcular comparação com mês anterior
    calcularComparacaoMesIncome(dadosFiltrados);

    exibirIncome(dadosFiltrados);
}

function resetarFiltrosIncome() {
    const filterMesIncomeEl = document.getElementById('filterMesIncome');
    const filterFonteIncomeEl = document.getElementById('filterFonteIncome');
    const filterRecorrenciaIncomeEl = document.getElementById('filterRecorrenciaIncome');

    // Resetar fonte e recorrência
    if (filterFonteIncomeEl) filterFonteIncomeEl.value = '';
    if (filterRecorrenciaIncomeEl) filterRecorrenciaIncomeEl.value = '';
    
    // Definir mês vigente como padrão ao invés de limpar
    if (filterMesIncomeEl) {
        const hoje = new Date();
        const mesAtual = hoje.getMonth() + 1; // getMonth() retorna 0-11
        const anoAtual = hoje.getFullYear();
        const mesChaveAtual = `${anoAtual}-${String(mesAtual).padStart(2, '0')}`;
        
        // Verificar se o mês atual existe nas opções do select
        const opcoes = Array.from(filterMesIncomeEl.options);
        const mesExiste = opcoes.some(option => option.value === mesChaveAtual);
        
        if (mesExiste) {
            filterMesIncomeEl.value = mesChaveAtual;
        } else {
            // Se não existir, limpar o filtro
            filterMesIncomeEl.value = '';
        }
    }

    filtrarIncome();
}

function resetarFiltrosOutcome(categoriasArray) {
    const filterCarteiraEl = document.getElementById('filterCarteira');
    const filterCategoriaEl = document.getElementById('filterCategoria');
    const filterFonteEl = document.getElementById('filterFonte');
    const filterMesEl = document.getElementById('filterMes');
    const filterCobrancaEl = document.getElementById('filterCobranca');
    const filterBuscaEl = document.getElementById('filterBusca');

    if (filterCarteiraEl) filterCarteiraEl.value = '';
    if (filterCategoriaEl) filterCategoriaEl.value = '';
    if (filterFonteEl) filterFonteEl.value = '';
    if (filterMesEl) filterMesEl.value = '';
    if (filterCobrancaEl) filterCobrancaEl.value = 'todas';
    if (filterBuscaEl) filterBuscaEl.value = '';

    // Aplicar filtros resetados
    filtrarTudo(categoriasArray || categoriasOriginaisGlobal);
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

