import json
import re
import os
from datetime import datetime

def processar_linha(linha):
    """Processa uma linha do arquivo DADOS_07.txt"""
    partes = linha.strip().split('|')
    
    # Verificar se tem a coluna "Gasto Original" (5 colunas) ou não (4 colunas)
    if len(partes) == 5:
        fonte, gasto, gasto_original, valor_str, parcelas_str = partes
    elif len(partes) == 4:
        fonte, gasto, valor_str, parcelas_str = partes
        gasto_original = None
    else:
        return None
    
    # Pular linha de cabeçalho
    if fonte == "Fonte":
        return None
    
    # Processar valor
    try:
        # Remove pontos de milhar e troca vírgula por ponto
        valor_limpo = valor_str.strip()
        # Se tem vírgula, é o separador decimal brasileiro
        if ',' in valor_limpo:
            valor_limpo = valor_limpo.replace('.', '').replace(',', '.')
        valor = float(valor_limpo)
    except:
        valor = 0.0
    
    # Processar categoria e subcategoria
    if ' / ' in gasto:
        partes_gasto = gasto.split(' / ', 1)
        categoria = partes_gasto[0].strip()
        subcategoria = partes_gasto[1].strip()
        
        # Normalizar algumas categorias
        if categoria == "ASSIN":
            categoria = "ASSINATURAS"
        elif categoria == "LAZER":
            categoria = "COMPRAS"  # Conforme vi nos dados processados
        
    else:
        categoria = gasto.strip()
        subcategoria = gasto.strip()
    
    categoria_completa = f"{categoria} / {subcategoria}" if categoria != subcategoria else categoria
    
    # Processar parcelas
    parcela_atual = None
    parcelas_total = None
    
    if parcelas_str and parcelas_str != '-':
        # Tentar extrair números de parcelas
        match = re.search(r'(\d+)[/\s]+(\d+)', parcelas_str)
        if match:
            parcela_atual = int(match.group(1))
            parcelas_total = int(match.group(2))
    
    # Calcular mês do lançamento e meses das parcelas
    mes_atual = datetime.now().month
    ano_atual = datetime.now().year
    
    # Nomes dos meses em português
    meses_pt = {
        1: 'Janeiro', 2: 'Fevereiro', 3: 'Março', 4: 'Abril',
        5: 'Maio', 6: 'Junho', 7: 'Julho', 8: 'Agosto',
        9: 'Setembro', 10: 'Outubro', 11: 'Novembro', 12: 'Dezembro'
    }
    
    # Para compras parceladas, calcular todos os meses das parcelas
    meses_parcelas = []
    if parcela_atual and parcelas_total:
        # A parcela atual é do mês atual
        # Calcular o mês de início (parcela 1)
        meses_atras = parcela_atual - 1
        
        # Calcular mês e ano da parcela 1
        mes_inicio = mes_atual - meses_atras
        ano_inicio = ano_atual
        while mes_inicio <= 0:
            mes_inicio += 12
            ano_inicio -= 1
        
        # Gerar lista de todos os meses das parcelas (da atual até a última)
        for i in range(parcela_atual, parcelas_total + 1):
            meses_a_adicionar = i - parcela_atual
            mes_parcela = mes_atual + meses_a_adicionar
            ano_parcela = ano_atual
            while mes_parcela > 12:
                mes_parcela -= 12
                ano_parcela += 1
            
            mes_chave = f"{ano_parcela}-{str(mes_parcela).zfill(2)}"
            nome_mes = meses_pt[mes_parcela]
            meses_parcelas.append({"chave": mes_chave, "nome": nome_mes, "parcela": i})
    else:
        # Para compras únicas, apenas o mês atual
        mes_chave = f"{ano_atual}-{str(mes_atual).zfill(2)}"
        nome_mes = meses_pt[mes_atual]
        meses_parcelas.append({"chave": mes_chave, "nome": nome_mes, "parcela": None})
    
    # Montar objeto
    return {
        "linha_original": linha.strip().replace('|', ' '),
        "fonte": fonte,
        "categoria_completa": categoria_completa,
        "categoria": categoria,
        "subcategoria": subcategoria,
        "valor": valor,
        "parcela_atual": parcela_atual,
        "parcelas_total": parcelas_total,
        "meses_parcelas": meses_parcelas  # Lista de meses em que essa compra aparece
    }

def processar_dados_07():
    """Processa o arquivo DADOS_07.txt e gera dados_processados.json"""
    
    print("🔄 Processando arquivo DADOS_07.txt...")
    
    # Carregar dados anteriores se existirem
    dados_anteriores = []
    if os.path.exists('dados_processados.json'):
        try:
            with open('dados_processados.json', 'r', encoding='utf-8') as f:
                dados_anteriores = json.load(f)
        except:
            dados_anteriores = []
    
    # Criar um set de linhas originais anteriores para comparação
    linhas_anteriores = {item['linha_original'] for item in dados_anteriores}
    
    dados = []
    novos_encontrados = []
    
    # Ler arquivo DADOS_07.txt
    with open('src/DADOS_07.txt', 'r', encoding='utf-8') as f:
        for linha in f:
            linha = linha.strip()
            if not linha:
                continue
            
            item = processar_linha(linha)
            if item:
                # Verificar se é um registro novo
                if item['linha_original'] not in linhas_anteriores:
                    novos_encontrados.append(item)
                
                dados.append(item)
    
    # Se houver novos lançamentos, apenas eles ficam destacados
    # Os antigos voltam ao normal
    novos_count = len(novos_encontrados)
    
    if novos_count > 0:
        print(f"🆕 Detectados {novos_count} novos lançamentos!")
        # Marcar apenas os novos como destacados
        for item in dados:
            item['novo'] = any(item['linha_original'] == novo['linha_original'] for novo in novos_encontrados)
    else:
        # Se não há novos, manter os que já eram novos
        for item in dados:
            item_anterior = next((d for d in dados_anteriores if d['linha_original'] == item['linha_original']), None)
            item['novo'] = item_anterior.get('novo', False) if item_anterior else False
    
    if novos_count > 0:
        print(f"🆕 Detectados {novos_count} novos lançamentos!")
    
    # Salvar dados processados
    with open('dados_processados.json', 'w', encoding='utf-8') as f:
        json.dump(dados, f, ensure_ascii=False, indent=2)
    
    print(f"✅ Processamento concluído!")
    print(f"📊 Total de registros: {len(dados)}")
    print(f"💰 Total: R$ {sum(d['valor'] for d in dados):,.2f}")
    
    return dados

if __name__ == '__main__':
    processar_dados_07()

