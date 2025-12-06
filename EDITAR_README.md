# 📝 Sistema de Edição Permanente de Lançamentos

Este sistema permite editar valores de lançamentos fixos diretamente no arquivo `OUTCOME.txt`, tornando as alterações **permanentes**.

## 🚀 Como Usar

### Passo 1: Iniciar o Servidor

Abra um terminal e execute:

```bash
cd /Users/bsgoncalves/Documents/Financeiro/custo_familia
./iniciar_servidor.sh
```

Ou manualmente:

```bash
python3 api_editar.py
```

Você verá:
```
🚀 Servidor de edição iniciado na porta 5000
📝 Pronto para receber requisições de edição
```

### Passo 2: Abrir o Dashboard

Com o servidor rodando, abra o arquivo `index.html` no navegador.

### Passo 3: Editar Lançamentos

1. Encontre um lançamento **fixo** (tag "Fixa")
2. Clique no ícone de lápis **[✏️]** ao lado do lançamento
3. Digite o novo valor
4. Clique **OK**

✅ O valor será atualizado **permanentemente** no arquivo `OUTCOME.txt`!

## 📋 Requisitos

```bash
pip3 install -r requirements_api.txt
```

Dependências:
- Flask 3.0.0
- flask-cors 4.0.0

## 🔧 Como Funciona

1. **Frontend (JavaScript)**: Captura a edição e envia para API
2. **Backend (Python/Flask)**: Recebe os dados e atualiza o arquivo `OUTCOME.txt`
3. **Arquivo atualizado**: As alterações são permanentes

## ⚠️ Importante

- ✅ **Permanente**: Alterações são salvas no arquivo
- 🔄 **Reprocessar**: Após editar, execute `python3 processar_dados.py` e `python3 gerar_html.py`
- 🔒 **Apenas Fixos**: Apenas lançamentos com tag "fix" podem ser editados
- 💾 **Backup**: Faça backup do `OUTCOME.txt` antes de editar

## 🐛 Solução de Problemas

### Erro: "Certifique-se de que o servidor está rodando"

**Solução**: Inicie o servidor com `./iniciar_servidor.sh`

### Erro: "flask not found"

**Solução**: Instale as dependências:
```bash
pip3 install -r requirements_api.txt
```

### Erro de CORS

**Solução**: O servidor já está configurado com CORS habilitado

## 📂 Arquivos Criados

- `api_editar.py`: Servidor Flask para edição
- `requirements_api.txt`: Dependências Python
- `iniciar_servidor.sh`: Script de inicialização
- `EDITAR_README.md`: Esta documentação

## 🎯 Fluxo Completo

```
1. Terminal 1: ./iniciar_servidor.sh
2. Navegador: Abrir index.html
3. Dashboard: Clicar [✏️] em lançamento fixo
4. Prompt: Digitar novo valor
5. ✅ Arquivo OUTCOME.txt atualizado!
6. Reprocessar: python3 processar_dados.py && python3 gerar_html.py
```

## 🔄 Atualizar Dashboard Após Edição

Para ver as alterações refletidas completamente:

```bash
python3 processar_dados.py
python3 gerar_html.py
```

Depois recarregue a página no navegador (F5).





