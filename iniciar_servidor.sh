#!/bin/bash

echo "========================================="
echo "🚀 Iniciando servidor de edição"
echo "========================================="
echo ""

# Verificar se Flask está instalado
if ! python3 -c "import flask" 2>/dev/null; then
    echo "📦 Instalando dependências..."
    pip3 install -r requirements_api.txt
    echo ""
fi

echo "✅ Servidor pronto!"
echo "📝 Você agora pode editar lançamentos fixos permanentemente"
echo "🌐 Servidor rodando em: http://127.0.0.1:8000"
echo ""
echo "⚠️  Para parar o servidor, pressione Ctrl+C"
echo ""
echo "========================================="
echo ""

# Iniciar o servidor
python3 api_editar.py





