#!/usr/bin/env python3
# -*- coding: utf-8 -*-

from flask import Flask, request, jsonify
from flask_cors import CORS
import os

app = Flask(__name__)
CORS(app)  # Permitir requisições do frontend

ARQUIVO_OUTCOME = 'src/OUTCOME.txt'

@app.route('/editar_lancamento', methods=['POST'])
def editar_lancamento():
    try:
        dados = request.json
        categoria = dados.get('categoria')
        gasto_original = dados.get('gasto_original')
        novo_valor = dados.get('novo_valor')
        
        if not categoria or not gasto_original or novo_valor is None:
            return jsonify({'success': False, 'error': 'Dados incompletos'}), 400
        
        # Ler o arquivo
        with open(ARQUIVO_OUTCOME, 'r', encoding='utf-8') as f:
            linhas = f.readlines()
        
        # Encontrar e atualizar a linha usando categoria e gasto_original como chave
        linha_atualizada = False
        for i, linha in enumerate(linhas):
            if linha.strip():  # Ignorar linhas vazias
                # Extrair as partes da linha (formato: Carteira|Fonte|Categoria|Gasto Original|Valor|Parcelas|Tipo|Frequencia|Caution)
                partes = linha.strip().split('|')
                
                if len(partes) >= 5:
                    categoria_linha = partes[2].strip()
                    gasto_original_linha = partes[3].strip()
                    
                    # Comparar categoria e gasto original
                    if categoria_linha == categoria.strip() and gasto_original_linha == gasto_original.strip():
                        # Atualizar o valor (5ª coluna, índice 4)
                        # Formatar com 2 casas decimais e vírgula
                        valor_formatado = f"{float(novo_valor):.2f}".replace('.', ',')
                        partes[4] = valor_formatado
                        
                        # Reconstruir a linha
                        linhas[i] = '|'.join(partes) + '\n'
                        linha_atualizada = True
                        break
        
        if not linha_atualizada:
            return jsonify({'success': False, 'error': f'Linha não encontrada para categoria "{categoria}" e gasto "{gasto_original}"'}), 404
        
        # Salvar o arquivo atualizado
        with open(ARQUIVO_OUTCOME, 'w', encoding='utf-8') as f:
            f.writelines(linhas)
        
        return jsonify({
            'success': True, 
            'message': 'Valor atualizado com sucesso no arquivo OUTCOME.txt'
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok'})

if __name__ == '__main__':
    print('🚀 Servidor de edição iniciado na porta 5000')
    print('📝 Pronto para receber requisições de edição')
    app.run(host='127.0.0.1', port=5000, debug=False)

