# Dashboard Financeiro - Custo Família

Dashboard financeiro para controle de receitas (Income) e despesas (Outcome) da família.

## Funcionalidades

- **Módulo Income (Receitas)**: Visualização e filtragem de receitas por fonte, mês e recorrência
- **Módulo Outcome (Despesas)**: Visualização e filtragem de despesas por carteira, fonte, categoria, mês, recorrência e parcelamento
- **Filtros hierárquicos**: Sistema de filtros que respeita a hierarquia dos dados
- **Comparação mensal**: Comparação de valores entre meses
- **Total consolidado**: Opção de visualizar o total de Outcome subtraindo o total de Income
- **Gráficos**: Visualização em gráfico de pizza das categorias

## Tecnologias

- HTML5
- CSS3 (BEM methodology)
- JavaScript (Vanilla)
- Chart.js (para gráficos)

## Estrutura de Dados

Os dados são carregados diretamente dos arquivos TXT:
- `src/INCOME.txt` - Dados de receitas
- `src/OUTCOME.txt` - Dados de despesas

## Como Usar

1. Inicie o servidor HTTP local:
```bash
python3 -m http.server 8000
```

2. Acesse no navegador:
```
http://localhost:8000
```

## Estrutura do Projeto

```
custo_familia/
├── index.html          # Página principal
├── app.js              # Lógica principal do dashboard
├── processar_txt.js    # Processamento dos arquivos TXT
├── styles.css          # Estilos CSS
├── src/
│   ├── INCOME.txt     # Dados de receitas
│   └── OUTCOME.txt    # Dados de despesas
└── README.md          # Este arquivo
```

## Fontes

- Google Fonts: Roboto (títulos) e Inter (texto geral)

