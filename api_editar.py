#!/usr/bin/env python3
# -*- coding: utf-8 -*-

from flask import Flask, request, jsonify, send_from_directory, send_file
from flask_cors import CORS
import os

# Obter o diretório base do projeto
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

app = Flask(__name__, static_folder=BASE_DIR, static_url_path='')
CORS(app)  # Permitir requisições do frontend

ARQUIVO_OUTCOME = os.path.join(BASE_DIR, 'src/OUTCOME.txt')
ARQUIVO_INCOME = os.path.join(BASE_DIR, 'src/INCOME.txt')

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

# Rota para servir o index.html na raiz
@app.route('/')
def index():
    return send_file(os.path.join(BASE_DIR, 'index.html'))

# Rota para servir arquivos estáticos (CSS, JS, SVG, TXT)
@app.route('/<path:filename>')
def serve_static(filename):
    # Servir arquivos que existem no diretório raiz ou subdiretórios
    file_path = os.path.join(BASE_DIR, filename)
    if os.path.exists(file_path) and os.path.isfile(file_path):
        response = send_from_directory(BASE_DIR, filename)
        # Adicionar headers para evitar cache em arquivos JS e CSS
        if filename.endswith(('.js', '.css')):
            response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
            response.headers['Pragma'] = 'no-cache'
            response.headers['Expires'] = '0'
        return response
    
    return jsonify({'error': 'Arquivo não encontrado'}), 404

if __name__ == '__main__':
    PORT = 8000
    print('🚀 Servidor iniciado na porta', PORT)
    print('🌐 Acesse o projeto em: http://127.0.0.1:' + str(PORT))
    print('📝 API de edição disponível em: http://127.0.0.1:' + str(PORT) + '/editar_lancamento')
    app.run(host='127.0.0.1', port=PORT, debug=False)

