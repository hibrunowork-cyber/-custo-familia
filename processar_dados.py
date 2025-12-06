import json
import re
import os
from datetime import datetime

def processar_linha(linha):
    """Processa uma linha do arquivo OUTCOME.txt"""
    partes = linha.strip().split('|')
    
    # Novo formato: Carteira|Fonte|Gasto|Gasto Original|Valor|Parcelas|Tipo|Frequência|Caution
    carteira = None
    gasto_original = None
    tipo = None
    frequencia = None
    caution = None
    
    if len(partes) == 9:
        carteira, fonte, gasto, gasto_original, valor_str, parcelas_str, tipo, frequencia, caution = partes
    else:
        return None
    
    # Pular linha de cabeçalho
    if fonte == "Fonte" or carteira == "Carteira":
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
    
    # Mapeamento de abreviações de meses para números
    meses_abrev = {
        "Jan": 1, "Fev": 2, "Mar": 3, "Abr": 4, "Mai": 5, "Jun": 6,
        "Jul": 7, "Ago": 8, "Set": 9, "Out": 10, "Nov": 11, "Dez": 12
    }
    
    if parcela_atual and parcelas_total:
        # Todas as parcelas começam em dezembro de 2025
        mes_inicio = 12  # Dezembro
        ano_inicio = 2025
        
        # Gerar lista de meses das parcelas respeitando o contador do TXT
        # Se no TXT está 3/6, começar em 3/6 (não em 1/6)
        parcelas_restantes = parcelas_total - parcela_atual + 1  # Quantas parcelas faltam (incluindo a atual)
        
        for i in range(parcelas_restantes):
            num_parcela = parcela_atual + i  # Se parcela_atual=3, gera 3, 4, 5, 6...
            meses_a_adicionar = i  # Parcela atual = 0 meses, próxima = 1 mês, etc
            mes_parcela = mes_inicio + meses_a_adicionar
            ano_parcela = ano_inicio
            
            while mes_parcela > 12:
                mes_parcela -= 12
                ano_parcela += 1
            
            mes_chave = f"{ano_parcela}-{str(mes_parcela).zfill(2)}"
            nome_mes = meses_pt[mes_parcela]
            meses_parcelas.append({"chave": mes_chave, "nome": nome_mes, "parcela": num_parcela})
    elif frequencia and frequencia.strip().lower() == 'anual':
        # Itens com tag 'anual' repetem apenas 1 vez ao ano, no mesmo mês do ano seguinte
        # Extrair mês e ano do campo Parcelas (formato: "Nov/2026" ou "Dez/2025")
        mes_inicio = 12  # Padrão: Dezembro
        ano_inicio = 2025  # Padrão: 2025
        
        if parcelas_str and parcelas_str != '-':
            # Tentar extrair mês e ano do formato "Nov/2026" ou "Dez/2025"
            match_mes_ano = re.search(r'([A-Za-z]{3})/(\d{4})', parcelas_str)
            if match_mes_ano:
                mes_abrev = match_mes_ano.group(1)
                ano_str = match_mes_ano.group(2)
                mes_inicio = meses_abrev.get(mes_abrev.capitalize(), 12)
                try:
                    ano_inicio = int(ano_str)
                except:
                    ano_inicio = 2025
        
        # Criar apenas 2 lançamentos: o inicial e 12 meses depois
        # Lançamento inicial (mês vigente)
        mes_chave_inicial = f"{ano_inicio}-{str(mes_inicio).zfill(2)}"
        nome_mes_inicial = meses_pt[mes_inicio]
        meses_parcelas.append({"chave": mes_chave_inicial, "nome": nome_mes_inicial, "parcela": None})
        
        # Lançamento 12 meses depois (mesmo mês do ano seguinte)
        # Exemplo: Dez/2025 → Dez/2026 (12 meses depois)
        mes_seguinte = mes_inicio  # Mesmo mês
        ano_seguinte = ano_inicio + 1  # Ano seguinte
        
        mes_chave_seguinte = f"{ano_seguinte}-{str(mes_seguinte).zfill(2)}"
        nome_mes_seguinte = meses_pt[mes_seguinte]
        meses_parcelas.append({"chave": mes_chave_seguinte, "nome": nome_mes_seguinte, "parcela": None})
    elif tipo and tipo.strip() == 'fix':
        # Itens com tag 'fix' repetem por 12 meses
        # EDUCAÇÃO / ELEVA inicia em fevereiro de 2026
        # Outros itens fixos iniciam em dezembro 2025
        if 'EDUCAÇÃO' in categoria_completa and 'ELEVA' in categoria_completa:
            mes_inicio = 2  # Fevereiro
            ano_inicio = 2026
        else:
            mes_inicio = 12  # Dezembro
            ano_inicio = 2025
        
        for i in range(12):
            mes_calculado = mes_inicio + i
            ano_calculado = ano_inicio
            
            while mes_calculado > 12:
                mes_calculado -= 12
                ano_calculado += 1
            
            mes_chave = f"{ano_calculado}-{str(mes_calculado).zfill(2)}"
            nome_mes = meses_pt[mes_calculado]
            meses_parcelas.append({"chave": mes_chave, "nome": nome_mes, "parcela": None})
    else:
        # Para compras não parceladas e sem tag fix
        # TODOS os itens começam em dezembro 2025 (novembro 2025 foi removido)
        # Itens com tag 'simples' aparecem apenas no mês vigente (dezembro 2025)
        mes_unico = 12  # Dezembro
        ano_unico = 2025
        mes_chave = f"{ano_unico}-{str(mes_unico).zfill(2)}"
        nome_mes = meses_pt[mes_unico]
        meses_parcelas.append({"chave": mes_chave, "nome": nome_mes, "parcela": None})
    
    # Montar objeto
    return {
        "linha_original": linha.strip().replace('|', ' '),
        "carteira": carteira.strip() if carteira else None,
        "fonte": fonte.strip() if fonte else None,
        "categoria_completa": categoria_completa,
        "categoria": categoria,
        "subcategoria": subcategoria,
        "gasto_original": gasto_original.strip() if gasto_original else None,
        "tipo": tipo.strip() if tipo else None,
        "frequencia": frequencia.strip() if frequencia else None,
        "caution": caution.strip() if caution else None,
        "valor": valor,
        "parcela_atual": parcela_atual,
        "parcelas_total": parcelas_total,
        "meses_parcelas": meses_parcelas  # Lista de meses em que essa compra aparece
    }

def sao_lancamentos_repetidos(item1, item2):
    """Verifica se dois itens são lançamentos repetidos (mesma categoria, fonte, valor)"""
    if not item1 or not item2:
        return False
    
    # Comparar chaves principais: categoria, fonte, valor
    return (item1['categoria_completa'] == item2['categoria_completa'] and
            item1['fonte'] == item2['fonte'] and
            abs(item1['valor'] - item2['valor']) < 0.01)  # Tolerância para valores float

def ajustar_meses_lancamentos_repetidos(dados):
    """Ajusta os meses de lançamentos repetidos consecutivos"""
    meses_pt = {
        1: 'Janeiro', 2: 'Fevereiro', 3: 'Março', 4: 'Abril',
        5: 'Maio', 6: 'Junho', 7: 'Julho', 8: 'Agosto',
        9: 'Setembro', 10: 'Outubro', 11: 'Novembro', 12: 'Dezembro'
    }
    
    i = 0
    while i < len(dados):
        # Verificar se há um grupo de lançamentos repetidos começando em i
        grupo_repetidos = [dados[i]]
        j = i + 1
        
        # Coletar todos os lançamentos repetidos consecutivos
        while j < len(dados) and sao_lancamentos_repetidos(dados[i], dados[j]):
            grupo_repetidos.append(dados[j])
            j += 1
        
        # Se encontrou um grupo de repetidos (2 ou mais), ajustar os meses
        if len(grupo_repetidos) > 1:
            # Verificar se é ASSINATURAS / CLUBE IFOOD & UBER (começa em Janeiro/2026)
            primeiro_item = grupo_repetidos[0]
            if primeiro_item['categoria_completa'] == 'ASSINATURAS / CLUBE IFOOD & UBER':
                mes_inicio = 1  # Janeiro
                ano_inicio = 2026
            else:
                mes_inicio = 12  # Dezembro
                ano_inicio = 2025
            
            for idx, item in enumerate(grupo_repetidos):
                # Calcular mês para este item do grupo
                mes_calculado = mes_inicio + idx
                ano_calculado = ano_inicio
                
                while mes_calculado > 12:
                    mes_calculado -= 12
                    ano_calculado += 1
                
                mes_chave = f"{ano_calculado}-{str(mes_calculado).zfill(2)}"
                nome_mes = meses_pt[mes_calculado]
                
                # Substituir meses_parcelas com apenas este mês
                item['meses_parcelas'] = [{
                    "chave": mes_chave,
                    "nome": nome_mes,
                    "parcela": item.get('parcela_atual')
                }]
            
            print(f"📅 Ajustados {len(grupo_repetidos)} lançamentos repetidos: {grupo_repetidos[0]['categoria_completa']}")
        
        i = j  # Pular para o próximo grupo

def processar_dados_07():
    """Processa o arquivo OUTCOME.txt e gera dados_processados.json
    
    REGRA: Banco de outcome sempre ser SOMENTE essa fonte:
    /Users/bsgoncalves/Documents/Financeiro/custo_familia/src/OUTCOME.txt
    """
    
    print("🔄 Processando arquivo OUTCOME.txt...")
    
    # REGRA: Sempre usar este arquivo como única fonte
    arquivo = '/Users/bsgoncalves/Documents/Financeiro/custo_familia/src/OUTCOME.txt'
    
    # Verificar se o arquivo existe
    if not os.path.exists(arquivo):
        print(f"❌ ERRO: Arquivo não encontrado: {arquivo}")
        return []
    
    print(f"📂 Lendo arquivo: {arquivo}")
    
    # Carregar dados anteriores se existirem (apenas para detectar novos)
    dados_anteriores = []
    json_path = '/Users/bsgoncalves/Documents/Financeiro/custo_familia/dados_processados.json'
    if os.path.exists(json_path):
        try:
            with open(json_path, 'r', encoding='utf-8') as f:
                dados_anteriores = json.load(f)
        except:
            dados_anteriores = []
    
    # Criar um set de linhas originais anteriores para comparação
    linhas_anteriores = {item['linha_original'] for item in dados_anteriores}
    
    dados = []
    novos_encontrados = []
    with open(arquivo, 'r', encoding='utf-8') as f:
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
    
    # Ajustar meses de lançamentos repetidos consecutivos
    ajustar_meses_lancamentos_repetidos(dados)
    
    # Se houver novos lançamentos, apenas eles ficam destacados
    # Todos os itens no estado padrão (sem marcação de novo)
    novos_count = len(novos_encontrados)
    
    # Marcar todos os itens como não novos (estado padrão)
    for item in dados:
        item['novo'] = False
    
    if novos_count > 0:
        print(f"🆕 Detectados {novos_count} novos lançamentos!")
    
    # Salvar dados processados
    json_path = '/Users/bsgoncalves/Documents/Financeiro/custo_familia/dados_processados.json'
    with open(json_path, 'w', encoding='utf-8') as f:
        json.dump(dados, f, ensure_ascii=False, indent=2)
    
    print(f"✅ Processamento concluído!")
    print(f"📊 Total de registros: {len(dados)}")
    print(f"💰 Total: R$ {sum(d['valor'] for d in dados):,.2f}")
    
    return dados

def processar_income():
    """Processa o arquivo INCOME.txt - cria apenas os lançamentos que estão no TXT
    
    REGRA: Banco de income sempre ser SOMENTE essa fonte:
    /Users/bsgoncalves/Documents/Financeiro/custo_familia/src/INCOME.txt
    """
    
    # REGRA: Sempre usar este arquivo como única fonte
    arquivo_income = '/Users/bsgoncalves/Documents/Financeiro/custo_familia/src/INCOME.txt'
    
    print("🔄 Processando arquivo INCOME.txt...")
    
    # Verificar se o arquivo existe
    if not os.path.exists(arquivo_income):
        print(f"❌ ERRO: Arquivo não encontrado: {arquivo_income}")
        return []
    
    print(f"📂 Lendo arquivo: {arquivo_income}")
    
    dados = []
    meses_abrev = {
        "Jan": 1, "Fev": 2, "Mar": 3, "Abr": 4, "Mai": 5, "Jun": 6,
        "Jul": 7, "Ago": 8, "Set": 9, "Out": 10, "Nov": 11, "Dez": 12
    }
    meses_pt = {
        1: "Janeiro", 2: "Fevereiro", 3: "Março", 4: "Abril",
        5: "Maio", 6: "Junho", 7: "Julho", 8: "Agosto",
        9: "Setembro", 10: "Outubro", 11: "Novembro", 12: "Dezembro"
    }
    # Mapeamento de nomes completos para números de mês
    meses_completos = {
        "Janeiro": 1, "Fevereiro": 2, "Março": 3, "Abril": 4,
        "Maio": 5, "Junho": 6, "Julho": 7, "Agosto": 8,
        "Setembro": 9, "Outubro": 10, "Novembro": 11, "Dezembro": 12
    }
    
    with open(arquivo_income, 'r', encoding='utf-8') as f:
        for linha in f:
            linha = linha.strip()
            if not linha:
                continue
            
            partes = linha.split('|')
            
            # Formato: Fonte|Recorrência|Mês|Receita|Valor
            if len(partes) != 5:
                continue
            
            fonte, recorrencia, mes_ref, receita, valor_str = partes
            
            # Pular cabeçalho
            if fonte == "Fonte" or receita == "Receita":
                continue
            
            # Processar valor
            try:
                valor_limpo = valor_str.strip()
                if ',' in valor_limpo:
                    valor_limpo = valor_limpo.replace('.', '').replace(',', '.')
                valor = float(valor_limpo)
            except:
                valor = 0.0
            
            # Parsear mês do formato "Dez/2025", "Jan/2026", "Dezembro/2025" ou "Janeiro/2026"
            mes_num = None
            ano_num = None
            mes_ref_limpo = mes_ref.strip()
            if '/' in mes_ref_limpo:
                partes_mes = mes_ref_limpo.split('/')
                if len(partes_mes) == 2:
                    mes_str = partes_mes[0].strip()
                    ano_str = partes_mes[1].strip()
                    # Tentar primeiro com abreviação, depois com nome completo
                    mes_num = meses_abrev.get(mes_str) or meses_completos.get(mes_str)
                    try:
                        ano_num = int(ano_str)
                    except:
                        pass
            
            if not mes_num or not ano_num:
                print(f"⚠️  Aviso: Não foi possível parsear o mês '{mes_ref}' na linha: {linha}")
                continue  # Pular se não conseguir parsear o mês
            
            mes_chave = f"{ano_num}-{str(mes_num).zfill(2)}"
            nome_mes = meses_pt[mes_num]
            
            # Detectar se é parcelado (Parcela X/Y no campo Receita)
            parcela_atual = None
            parcelas_total = None
            match = re.search(r'Parcela\s+(\d+)/(\d+)', receita, re.IGNORECASE)
            if match:
                parcela_atual = int(match.group(1))
                parcelas_total = int(match.group(2))
            
            # Determinar frequência baseado na recorrência e padrões
            frequencia = 'mensal'  # padrão
            tipo = '-'
            
            # Se tem "Salário" na recorrência, é mensal fixo
            if 'Salário' in recorrencia or 'Salario' in recorrencia:
                frequencia = 'mensal'
                tipo = 'fix'
            # Se tem "Reembolso" na receita, é mensal fixo
            elif 'Reembolso' in receita:
                frequencia = 'mensal'
                tipo = 'fix'
            # Se tem parcela, é mensal
            elif parcela_atual:
                frequencia = 'mensal'
            
            # Criar item único para esta linha
            item = {
                "fonte": fonte.strip(),
                "recorrencia": recorrencia.strip(),
                "receita": receita.strip(),
                "valor": valor,
                "tipo": tipo,
                "frequencia": frequencia,
                "mes": nome_mes,
                "mes_chave": mes_chave,
                "ano": ano_num,
                "novo": False
            }
            
            # Adicionar informação de parcela se existir
            if parcela_atual and parcelas_total:
                item["parcela_atual"] = parcela_atual
                item["parcelas_total"] = parcelas_total
                # Criar lista de meses_parcelas apenas com este mês (para compatibilidade)
                item["meses_parcelas"] = [{
                    "chave": mes_chave,
                    "nome": nome_mes,
                    "ano": ano_num,
                    "parcela": parcela_atual
                }]
            
            dados.append(item)
    
    # Salvar dados processados
    # Salvar dados processados
    json_path = '/Users/bsgoncalves/Documents/Financeiro/custo_familia/dados_processados_income.json'
    with open(json_path, 'w', encoding='utf-8') as f:
        json.dump(dados, f, ensure_ascii=False, indent=2)
    
    print(f"✅ Processamento de INCOME concluído!")
    print(f"📊 Total de registros: {len(dados)}")
    print(f"💰 Total: R$ {sum(d['valor'] for d in dados):,.2f}")
    
    return dados

if __name__ == '__main__':
    processar_dados_07()  # Processa OUTCOME.txt
    processar_income()     # Processa INCOME.txt

