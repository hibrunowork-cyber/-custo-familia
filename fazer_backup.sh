#!/bin/bash

# Script de backup alternado entre pastas A e B
# Mantém sempre 2 backups mais recentes

PROJECT_DIR="/Users/bsgoncalves/Documents/Financeiro/custo_familia"
BACKUP_BASE_DIR="/Users/bsgoncalves/Documents/Financeiro/backups"
BACKUP_A="${BACKUP_BASE_DIR}/A"
BACKUP_B="${BACKUP_BASE_DIR}/B"
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")

# Criar pastas de backup se não existirem
mkdir -p "$BACKUP_A"
mkdir -p "$BACKUP_B"

# Verificar qual foi o último backup usado (compatível com macOS)
# Verifica qual pasta tem o diretório mais recente
if [ "$(ls -A $BACKUP_A 2>/dev/null)" ] && [ "$(ls -A $BACKUP_B 2>/dev/null)" ]; then
    # Ambas têm conteúdo, compara qual tem o backup mais recente
    LAST_A=$(ls -td "$BACKUP_A"/backup_* 2>/dev/null | head -1)
    LAST_B=$(ls -td "$BACKUP_B"/backup_* 2>/dev/null | head -1)
    
    if [ -z "$LAST_A" ] && [ -z "$LAST_B" ]; then
        # Ambas vazias, começa com A
        TARGET_DIR="$BACKUP_A"
    elif [ -z "$LAST_A" ]; then
        # A vazia, usa A
        TARGET_DIR="$BACKUP_A"
    elif [ -z "$LAST_B" ]; then
        # B vazia, usa B
        TARGET_DIR="$BACKUP_B"
    else
        # Compara qual é mais recente usando stat (macOS)
        TIME_A=$(stat -f "%m" "$LAST_A" 2>/dev/null || echo "0")
        TIME_B=$(stat -f "%m" "$LAST_B" 2>/dev/null || echo "0")
        
        if [ "$TIME_A" -gt "$TIME_B" ]; then
            # A foi usado por último, então usa B
            TARGET_DIR="$BACKUP_B"
        else
            # B foi usado por último, então usa A
            TARGET_DIR="$BACKUP_A"
        fi
    fi
elif [ "$(ls -A $BACKUP_A 2>/dev/null)" ]; then
    # A tem conteúdo, usa B
    TARGET_DIR="$BACKUP_B"
elif [ "$(ls -A $BACKUP_B 2>/dev/null)" ]; then
    # B tem conteúdo, usa A
    TARGET_DIR="$BACKUP_A"
else
    # Ambas vazias, começa com A
    TARGET_DIR="$BACKUP_A"
fi

# Limpar backups antigos na pasta de destino (manter apenas os 2 mais recentes)
if [ "$(ls -A $TARGET_DIR 2>/dev/null)" ]; then
    ls -td "$TARGET_DIR"/backup_* 2>/dev/null | tail -n +3 | xargs rm -rf 2>/dev/null
fi

# Criar pasta de backup com timestamp
BACKUP_DIR="${TARGET_DIR}/backup_${TIMESTAMP}"
mkdir -p "$BACKUP_DIR"

# Copiar arquivos do projeto (exceto node_modules, .git, etc)
rsync -av --exclude='node_modules' \
          --exclude='.git' \
          --exclude='*.pyc' \
          --exclude='__pycache__' \
          --exclude='.DS_Store' \
          --exclude='backups' \
          --exclude='fazer_backup.sh' \
          "$PROJECT_DIR/" "$BACKUP_DIR/"

echo "✅ Backup criado em: $BACKUP_DIR"
echo "📁 Pasta de backup: $TARGET_DIR"
echo "🕐 Timestamp: $TIMESTAMP"
