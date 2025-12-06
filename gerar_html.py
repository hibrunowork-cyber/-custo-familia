import json

# Ler dados processados
with open('dados_processados.json', 'r', encoding='utf-8') as f:
    dados = json.load(f)

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
        <header>
            <h1>📊 Análise de Gastos</h1>
            <div class="stats-container">
                <div class="stat-box">
                    <div class="stat-label">Total Geral</div>
                    <div class="stat-value" id="totalGeral">R$ 0,00</div>
                </div>
                <div class="stat-box">
                    <div class="stat-label">Compras</div>
                    <div class="stat-value" id="totalCompras">0</div>
                </div>
                <div class="stat-box">
                    <div class="stat-label">Parceladas</div>
                    <div class="stat-value" id="totalParceladas">0</div>
                </div>
                <div class="stat-box">
                    <div class="stat-label">Categorias</div>
                    <div class="stat-value" id="totalCategorias">0</div>
                </div>
            </div>
        </header>

        <div class="chart-section">
            <h2 class="section-title">Gastos por Categoria</h2>
            <div class="chart-wrapper">
                <div class="chart-container">
                    <canvas id="pieChart"></canvas>
                </div>
                <div class="chart-legend" id="chartLegend"></div>
            </div>
        </div>

        <div class="list-section">
            <div class="filters">
                <div class="filter-group">
                    <label for="filterCategoria">Filtrar por Categoria:</label>
                    <select id="filterCategoria">
                        <option value="">Todas as Categorias</option>
                    </select>
                </div>
                <div class="filter-group">
                    <label for="filterFonte">Filtrar por Fonte:</label>
                    <select id="filterFonte">
                        <option value="">Todas as Fontes</option>
                        <option value="Santander">Santander</option>
                        <option value="Itaú">Itaú</option>
                        <option value="Nubank">Nubank</option>
                    </select>
                </div>
                <div class="filter-group">
                    <label for="filterMes">Filtrar por Mês:</label>
                    <select id="filterMes">
                        <option value="">Todos</option>
                    </select>
                </div>
                <div class="filter-group">
                    <label for="filterTipoCompra">Filtrar por Compras:</label>
                    <select id="filterTipoCompra">
                        <option value="todas">Todas</option>
                        <option value="unicas">Únicas</option>
                        <option value="parceladas">Parceladas</option>
                    </select>
                </div>
            </div>
            
            <div class="fonte-total-box">
                <div class="fonte-total-label" id="totalLabel">Todas as compras</div>
                <div class="fonte-total-value" id="fonteTotal">R$ 0,00</div>
            </div>

            <div id="categoriesList"></div>
        </div>

        <div class="previsao-section">
            <h2 class="section-title">💰 Previsão de Custos Mensais - Compras Parceladas</h2>
            
            <div class="previsao-filters">
                <div class="filter-group">
                    <label for="filterCategoriaParcelas">Filtrar por Categoria:</label>
                    <select id="filterCategoriaParcelas">
                        <option value="">Todas as Categorias</option>
                    </select>
                </div>
                <div class="filter-group">
                    <label for="filterFonteParcelas">Filtrar por Fonte:</label>
                    <select id="filterFonteParcelas">
                        <option value="">Todas as Fontes</option>
                        <option value="Santander">Santander</option>
                        <option value="Itaú">Itaú</option>
                        <option value="Nubank">Nubank</option>
                    </select>
                </div>
                <div class="filter-group">
                    <label for="filterMesParcelas">Filtrar por Mês da Parcela:</label>
                    <select id="filterMesParcelas">
                        <option value="">Todos</option>
                    </select>
                </div>
            </div>
            
            <div class="fonte-total-box">
                <div class="fonte-total-label">Total de Parcelas</div>
                <div class="fonte-total-value" id="previsaoTotal">R$ 0,00</div>
            </div>

            <div class="parcelas-list" id="parcelasList"></div>
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

