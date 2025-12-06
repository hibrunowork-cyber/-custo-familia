import json
from processar_dados import processar_dados_07

# Processar dados do DADOS_07.txt primeiro
dados = processar_dados_07()

# Converter dados para JavaScript (escapando corretamente)
dados_js = json.dumps(dados, ensure_ascii=False)

# Criar HTML completo
html_template = f"""<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Análise de Gastos</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <link rel="stylesheet" href="styles.css">
</head>
<body>
    <div class="container">

        <div class="chart-section">
            <div class="chart-wrapper">
                <div class="chart-container">
                    <canvas id="pieChart"></canvas>
                </div>
                <div class="chart-legend" id="chartLegend"></div>
            </div>
        </div>

        <div class="list-section">
            <div class="search-section">
                <div class="filter-group filter-search">
                    <input type="text" id="filterBusca" placeholder="🔍 Buscar...">
                </div>
            </div>
            
            <div class="filters">
                <div class="filter-group">
                    <label for="filterCategoria">Categoria:</label>
                    <select id="filterCategoria">
                        <option value="">Todas</option>
                    </select>
                </div>
                <div class="filter-group">
                    <label for="filterFonte">Fonte:</label>
                    <select id="filterFonte">
                        <option value="">Todas</option>
                        <option value="Santander">Santander</option>
                        <option value="Itau">Itau</option>
                        <option value="Nubank">Nubank</option>
                    </select>
                </div>
                <div class="filter-group">
                    <label for="filterMes">Mês:</label>
                    <select id="filterMes">
                        <option value="">Todas</option>
                    </select>
                </div>
                <div class="filter-group">
                    <label for="filterTipoCompra">Únicas ou parceladas:</label>
                    <select id="filterTipoCompra">
                        <option value="todas">Todas</option>
                        <option value="unicas">Únicas</option>
                        <option value="parceladas">Parceladas</option>
                    </select>
                </div>
                <div class="filter-group filter-reset-group">
                    <button id="btnResetarFiltros" class="btn-resetar">Resetar Filtros</button>
                </div>
            </div>
            
            <div class="categories-header">
                <div class="fonte-total-box">
                    <div class="fonte-total-label" id="totalLabel">Todas as compras</div>
                    <div class="fonte-total-value" id="fonteTotal">R$ 0,00</div>
                </div>
                <div class="stats-info">
                    <div class="stat-info-item">
                        <span class="stat-info-label">Compras</span>
                        <span class="stat-info-value" id="totalCompras">0</span>
                    </div>
                    <div class="stat-info-item">
                        <span class="stat-info-label">Parceladas</span>
                        <span class="stat-info-value" id="totalParceladas">0</span>
                    </div>
                    <div class="stat-info-item">
                        <span class="stat-info-label">Categorias</span>
                        <span class="stat-info-value" id="totalCategorias">0</span>
                    </div>
                </div>
            </div>

            <div id="categoriesList"></div>
        </div>
    </div>

    <script>
        const dados = {dados_js};
    </script>
    <script src="app.js"></script>
</body>
</html>
"""

# Salvar HTML
with open('index.html', 'w', encoding='utf-8') as f:
    f.write(html_template)

print("✅ HTML gerado com sucesso!")
print(f"📊 Total de registros: {len(dados)}")
print(f"💰 Total: R$ {sum(d['valor'] for d in dados):,.2f}")
