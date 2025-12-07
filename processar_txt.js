// ========== PROCESSAMENTO DE TXT DIRETO ==========

// Mapeamento de meses
const MESES_PT = {
    1: 'Janeiro', 2: 'Fevereiro', 3: 'Março', 4: 'Abril',
    5: 'Maio', 6: 'Junho', 7: 'Julho', 8: 'Agosto',
    9: 'Setembro', 10: 'Outubro', 11: 'Novembro', 12: 'Dezembro'
};

const MESES_ABREV = {
    "Jan": 1, "Fev": 2, "Mar": 3, "Abr": 4, "Mai": 5, "Jun": 6,
    "Jul": 7, "Ago": 8, "Set": 9, "Out": 10, "Nov": 11, "Dez": 12
};

const MESES_COMPLETOS = {
    "Janeiro": 1, "Fevereiro": 2, "Março": 3, "Abril": 4,
    "Maio": 5, "Junho": 6, "Julho": 7, "Agosto": 8,
    "Setembro": 9, "Outubro": 10, "Novembro": 11, "Dezembro": 12
};

// Função auxiliar para limpar campos: remover colchetes, aspas e espaços
function limparCampo(campo) {
    if (!campo || typeof campo !== 'string') return '';
    let limpo = campo.trim();
    // Remover aspas duplas (no início e fim, ou todas)
    limpo = limpo.replace(/^["']+|["']+$/g, '');
    limpo = limpo.replace(/"/g, ''); // Remover todas as aspas duplas restantes
    // Remover colchetes
    limpo = limpo.replace(/^\[|\]$/g, '');
    return limpo.trim();
}

// Função auxiliar para verificar se um campo está vazio (após limpeza)
function campoVazio(campo) {
    const limpo = limparCampo(campo);
    return !limpo || limpo === '';
}

function processarLinhaOutcome(linha) {
    if (!linha || typeof linha !== 'string') return null;
    
    const partes = linha.trim().split('|');
    
    // Formato: Carteira|Fonte|"Descrição"|"Valor"|Mês|Recorrência|Parcelado|Parcelas|"Categoria"|"Caution"
    // Aceitar 9 ou 10 colunas (a última coluna "Caution" é opcional)
    if (partes.length < 9 || partes.length > 10) return null;
    
    const carteira = partes[0];
    const fonte = partes[1];
    const descricao_str = partes[2];
    const valor_str = partes[3];
    const mes_str = partes[4];
    const recorencia_str = partes[5];
    const parcelado_str = partes[6];
    const parcelas_str = partes[7];
    const categoria_str = partes[8];
    const caution_str = partes.length > 9 ? partes[9] : null;
    
    // Pular linha de cabeçalho
    if (!fonte || !carteira || fonte.trim() === "Fonte" || carteira.trim() === "Carteira") return null;
    
    // REGRA: Se algum campo de filtro estiver vazio entre aspas (""), o item não aparece no frontend
    // Campos de filtro: Carteira, Fonte, Categoria
    const camposFiltro = [carteira, fonte, categoria_str];
    const temCampoVazioComAspas = camposFiltro.some(campo => {
        if (!campo || typeof campo !== 'string') return false;
        const trimado = campo.trim();
        // Verificar se está vazio entre aspas: "" ou " " (apenas aspas ou aspas com espaços)
        return (trimado === '""' || (trimado.startsWith('"') && trimado.endsWith('"') && limparCampo(campo) === ''));
    });
    
    if (temCampoVazioComAspas) {
        return null; // Item com campo de filtro vazio entre aspas não aparece no frontend
    }
    
    // Limpar campos (remover colchetes e aspas)
    const carteira_limpa = limparCampo(carteira);
    const fonte_limpa = limparCampo(fonte);
    const descricao_limpa = limparCampo(descricao_str);
    const categoria_limpa = limparCampo(categoria_str);
    
    // REGRA: Se algum campo de filtro estiver vazio após limpar, não exibir o item
    if (campoVazio(carteira) || campoVazio(fonte) || campoVazio(categoria_str)) {
        return null;
    }
    
    // Processar valor (remover colchetes e aspas antes de processar)
    let valor = 0.0;
    try {
        const valor_limpo_str = limparCampo(valor_str);
        if (valor_limpo_str) {
            let valor_limpo = valor_limpo_str;
            if (valor_limpo.includes(',')) {
                valor_limpo = valor_limpo.replace(/\./g, '').replace(',', '.');
            }
            valor = parseFloat(valor_limpo) || 0.0;
        }
    } catch (e) {
        valor = 0.0;
    }
    
    // Processar categoria (já limpa, sem colchetes/aspas)
    const categoria = categoria_limpa;
    const subcategoria = categoria; // Por enquanto, subcategoria = categoria
    const categoria_completa = categoria;
    
    // Processar mês
    const mes_limpo = limparCampo(mes_str);
    let mes_num = null;
    let ano_num = null;
    
    if (mes_limpo.includes('/')) {
        const partes_mes = mes_limpo.split('/');
        if (partes_mes.length === 2) {
            const mes_abrev = partes_mes[0].trim();
            const ano_str = partes_mes[1].trim();
            mes_num = MESES_ABREV[mes_abrev] || null;
            try {
                ano_num = parseInt(ano_str);
            } catch (e) {
                ano_num = null;
            }
        }
    }
    
    if (!mes_num || !ano_num) {
        // Se não conseguir processar o mês, usar Dezembro/2025 como padrão
        mes_num = 12;
        ano_num = 2025;
    }
    
    // Processar recorrência
    const recorencia_limpa = limparCampo(recorencia_str);
    const frequencia = recorencia_limpa.toLowerCase();
    
    // Processar parcelas
    let parcela_atual = null;
    let parcelas_total = null;
    const parcelas_limpo = limparCampo(parcelas_str);
    const parcelado_limpo = limparCampo(parcelado_str);
    
    if (parcelado_limpo.toLowerCase() === 'sim' && parcelas_limpo && parcelas_limpo !== '-') {
        const match = parcelas_limpo.match(/(\d+)[/\s]+(\d+)/);
        if (match) {
            parcela_atual = parseInt(match[1]);
            parcelas_total = parseInt(match[2]);
        }
    }
    
    // Calcular meses das parcelas
    const meses_parcelas = [];
    const mes_inicio = mes_num;
    const ano_inicio = ano_num;
    
    if (parcela_atual && parcelas_total) {
        // Compras parceladas
        const parcelas_restantes = parcelas_total - parcela_atual + 1;
        for (let i = 0; i < parcelas_restantes; i++) {
            const num_parcela = parcela_atual + i;
            const meses_a_adicionar = i;
            let mes_parcela = mes_inicio + meses_a_adicionar;
            let ano_parcela = ano_inicio;
            
            while (mes_parcela > 12) {
                mes_parcela -= 12;
                ano_parcela += 1;
            }
            
            const mes_chave = `${ano_parcela}-${String(mes_parcela).padStart(2, '0')}`;
            const nome_mes = MESES_PT[mes_parcela];
            meses_parcelas.push({chave: mes_chave, nome: nome_mes, parcela: num_parcela});
        }
    } else if (frequencia === 'anual') {
        // Itens anuais
        let mes_inicio_anual = mes_inicio;
        let ano_inicio_anual = ano_inicio;
        
        if (parcelas_limpo && parcelas_limpo !== '-') {
            const match_mes_ano = parcelas_limpo.match(/([A-Za-z]{3})\/(\d{4})/);
            if (match_mes_ano) {
                const mes_abrev = match_mes_ano[1];
                const ano_str = match_mes_ano[2];
                mes_inicio_anual = MESES_ABREV[mes_abrev.charAt(0).toUpperCase() + mes_abrev.slice(1).toLowerCase()] || mes_inicio;
                ano_inicio_anual = parseInt(ano_str) || ano_inicio;
            }
        }
        
        // Lançamento inicial
        const mes_chave_inicial = `${ano_inicio_anual}-${String(mes_inicio_anual).padStart(2, '0')}`;
        meses_parcelas.push({chave: mes_chave_inicial, nome: MESES_PT[mes_inicio_anual], parcela: null});
        
        // Lançamento 12 meses depois
        const ano_seguinte = ano_inicio_anual + 1;
        const mes_chave_seguinte = `${ano_seguinte}-${String(mes_inicio_anual).padStart(2, '0')}`;
        meses_parcelas.push({chave: mes_chave_seguinte, nome: MESES_PT[mes_inicio_anual], parcela: null});
    } else if (frequencia === 'mensal') {
        // Itens mensais (12 meses)
        let mes_inicio_fix = mes_inicio;
        let ano_inicio_fix = ano_inicio;
        
        if (categoria_completa && categoria_completa.includes('EDUCAÇÃO') && categoria_completa.includes('ELEVA')) {
            mes_inicio_fix = 2; // Fevereiro
            ano_inicio_fix = 2026;
        }
        
        for (let i = 0; i < 12; i++) {
            let mes_calculado = mes_inicio_fix + i;
            let ano_calculado = ano_inicio_fix;
            
            while (mes_calculado > 12) {
                mes_calculado -= 12;
                ano_calculado += 1;
            }
            
            const mes_chave = `${ano_calculado}-${String(mes_calculado).padStart(2, '0')}`;
            meses_parcelas.push({chave: mes_chave, nome: MESES_PT[mes_calculado], parcela: null});
        }
    } else {
        // Compras não parceladas (pontual)
        const mes_chave = `${ano_inicio}-${String(mes_inicio).padStart(2, '0')}`;
        meses_parcelas.push({chave: mes_chave, nome: MESES_PT[mes_inicio], parcela: null});
    }
    
    // Processar caution
    const caution_limpo = caution_str ? limparCampo(caution_str) : null;
    const tem_caution = caution_limpo && caution_limpo.toLowerCase() !== '-' && caution_limpo.toLowerCase() !== '';
    
    return {
        linha_original: linha ? linha.trim().replace(/\|/g, ' ') : '',
        carteira: carteira_limpa,
        fonte: fonte_limpa,
        categoria_completa: categoria_completa,
        categoria: categoria,
        subcategoria: subcategoria,
        descricao: descricao_limpa, // Descrição limpa (sem colchetes/aspas)
        frequencia: frequencia,
        valor: valor || 0.0,
        parcela_atual: parcela_atual,
        parcelas_total: parcelas_total,
        meses_parcelas: meses_parcelas || [],
        caution: tem_caution
    };
}

function saoLancamentosRepetidos(item1, item2) {
    if (!item1 || !item2) return false;
    // Considerar repetidos se tiverem a mesma descrição, fonte e categoria
    // (mesmo que o valor seja diferente, pois podem ser parcelas diferentes)
    const saoRepetidos = (item1.descricao === item2.descricao &&
            item1.fonte === item2.fonte &&
            item1.categoria === item2.categoria);
    
    if (saoRepetidos) {
        console.log(`   ✓ Repetidos encontrados: "${item1.descricao}" (${item1.fonte}, ${item1.categoria})`);
    }
    
    return saoRepetidos;
}

function ajustarMesesLancamentosRepetidos(dados) {
    console.log("🔄 Iniciando ajuste de lançamentos repetidos...");
    let i = 0;
    while (i < dados.length) {
        // Verificar se há um grupo de lançamentos repetidos começando em i
        const grupoRepetidos = [dados[i]];
        let j = i + 1;
        
        // Coletar todos os lançamentos repetidos consecutivos (mesmo que tenham meses diferentes no TXT)
        while (j < dados.length && saoLancamentosRepetidos(dados[i], dados[j])) {
            grupoRepetidos.push(dados[j]);
            j++;
        }
        
        // Se encontrou um grupo de repetidos (2 ou mais), ajustar os meses
        if (grupoRepetidos.length > 1) {
            // Determinar mês inicial baseado no primeiro item do grupo
            const primeiroItem = grupoRepetidos[0];
            let mesInicio, anoInicio;
            
            // SEMPRE usar o mês do primeiro item do grupo como base
            // Se o primeiro item tem meses_parcelas, usar o primeiro mês
            if (primeiroItem.meses_parcelas && primeiroItem.meses_parcelas.length > 0) {
                const primeiroMes = primeiroItem.meses_parcelas[0];
                const [ano, mes] = primeiroMes.chave.split('-');
                mesInicio = parseInt(mes);
                anoInicio = parseInt(ano);
            } else if (primeiroItem.mes_chave) {
                // Se tem mes_chave diretamente, usar ele
                const [ano, mes] = primeiroItem.mes_chave.split('-');
                mesInicio = parseInt(mes);
                anoInicio = parseInt(ano);
            } else {
                // Caso padrão: usar Dezembro/2025
                mesInicio = 12;
                anoInicio = 2025;
            }
            
            // Verificar se é ASSINATURAS / CLUBE IFOOD & UBER (começa em Janeiro/2026)
            if (primeiroItem.categoria_completa === 'ASSINATURAS / CLUBE IFOOD & UBER') {
                mesInicio = 1; // Janeiro
                anoInicio = 2026;
            }
            
            console.log(`📅 Encontrados ${grupoRepetidos.length} lançamentos repetidos: "${grupoRepetidos[0].descricao || grupoRepetidos[0].categoria_completa}"`);
            console.log(`   Mês inicial (do primeiro item): ${MESES_PT[mesInicio]}/${anoInicio}`);
            
            grupoRepetidos.forEach((item, idx) => {
                // Calcular mês para este item do grupo (distribuir sequencialmente a partir do primeiro)
                // idx 0 = primeiro mês, idx 1 = segundo mês, etc.
                let mesCalculado = mesInicio + idx;
                let anoCalculado = anoInicio;
                
                // Ajustar se passar de dezembro
                while (mesCalculado > 12) {
                    mesCalculado -= 12;
                    anoCalculado += 1;
                }
                
                const mesChave = `${anoCalculado}-${String(mesCalculado).padStart(2, '0')}`;
                const nomeMes = MESES_PT[mesCalculado];
                
                // IMPORTANTE: Substituir meses_parcelas com APENAS este mês específico
                // Isso garante que cada lançamento apareça apenas no seu mês correspondente
                item.meses_parcelas = [{
                    chave: mesChave,
                    nome: nomeMes,
                    parcela: item.parcela_atual
                }];
                
                // Também atualizar mes_chave para facilitar filtragem
                item.mes_chave = mesChave;
                
                console.log(`   → Item ${idx + 1}/${grupoRepetidos.length}: "${item.descricao || item.categoria_completa}" → ${nomeMes}/${anoCalculado} (${mesChave})`);
            });
        }
        
        i = j; // Pular para o próximo grupo
    }
    console.log("✅ Ajuste de lançamentos repetidos concluído");
}

function processarOutcomeTxt(texto) {
    const linhas = texto.split('\n');
    const dados = [];
    
    for (const linha of linhas) {
        if (!linha.trim()) continue;
        const item = processarLinhaOutcome(linha);
        if (item) dados.push(item);
    }
    
    ajustarMesesLancamentosRepetidos(dados);
    return dados;
}

function processarLinhaIncome(linha) {
    const partes = linha.trim().split('|');
    
    // Formato: Fonte|"Descrição"|Mês|Tipo|"Valor"|Recorrência
    if (partes.length !== 6) return null;
    
    const [fonte_str, descricao_str, mes_ref_str, tipo_str, valor_str, recorencia_str] = partes;
    
    // Pular cabeçalho
    if (fonte_str === "Fonte" || tipo_str === "Tipo" || limparCampo(fonte_str) === "" || mes_ref_str === "Mês") return null;
    
    // REGRA: Se algum campo de filtro estiver vazio entre aspas (""), o item não aparece no frontend
    // Campo de filtro: Fonte
    const temCampoVazioComAspas = fonte_str && typeof fonte_str === 'string' && 
        (fonte_str.trim() === '""' || (fonte_str.trim().startsWith('"') && fonte_str.trim().endsWith('"') && limparCampo(fonte_str) === ''));
    
    if (temCampoVazioComAspas) {
        return null; // Item com campo de filtro vazio entre aspas não aparece no frontend
    }
    
    // Limpar campos (remover colchetes e aspas)
    const fonte_limpa = limparCampo(fonte_str);
    const descricao_limpa = limparCampo(descricao_str);
    const tipo_limpo = limparCampo(tipo_str);
    const recorencia_limpa = limparCampo(recorencia_str);
    
    // REGRA: Se algum campo de filtro estiver vazio após limpar, não exibir o item
    if (campoVazio(fonte_str)) {
        return null;
    }
    
    // Processar valor (remover colchetes e aspas antes de processar)
    let valor = 0.0;
    try {
        const valor_limpo_str = limparCampo(valor_str);
        if (valor_limpo_str) {
            let valor_limpo = valor_limpo_str;
            // Se tem vírgula, é formato brasileiro (ex: 1.234,56)
            if (valor_limpo.includes(',')) {
                valor_limpo = valor_limpo.replace(/\./g, '').replace(',', '.');
            }
            valor = parseFloat(valor_limpo);
            if (isNaN(valor)) {
                console.warn("⚠️ Valor não é um número na linha:", linha, "valor_limpo:", valor_limpo);
                valor = 0.0;
            }
        }
    } catch (e) {
        console.error("❌ Erro ao processar valor na linha:", linha, "erro:", e);
        valor = 0.0;
    }
    
    // Processar mês
    let mes_num = null;
    let ano_num = null;
    const mes_ref_limpo = limparCampo(mes_ref_str);
    
    if (mes_ref_limpo.includes('/')) {
        const partes_mes = mes_ref_limpo.split('/');
        if (partes_mes.length === 2) {
            const mes_str = partes_mes[0].trim();
            const ano_str = partes_mes[1].trim();
            
            // Tentar nome completo primeiro
            mes_num = MESES_COMPLETOS[mes_str] || MESES_ABREV[mes_str] || null;
            try {
                ano_num = parseInt(ano_str);
            } catch (e) {
                ano_num = null;
            }
        }
    }
    
    if (!mes_num || !ano_num) return null;
    
    const mes_chave = `${ano_num}-${String(mes_num).padStart(2, '0')}`;
    const nome_mes = MESES_PT[mes_num];
    
    // Usar recorrência do arquivo (já limpa, sem colchetes/aspas)
    const frequencia = recorencia_limpa.toLowerCase();
    
    return {
        fonte: fonte_limpa,
        descricao: descricao_limpa, // Descrição limpa (sem colchetes/aspas)
        tipo: tipo_limpo,
        recorrencia: descricao_limpa, // Usar descrição como recorrencia
        mes_chave: mes_chave,
        mes_nome: nome_mes,
        valor: valor,
        frequencia: frequencia
    };
}

function processarIncomeTxt(texto) {
    const linhas = texto.split('\n');
    const dados = [];
    
    for (const linha of linhas) {
        if (!linha.trim()) continue;
        const item = processarLinhaIncome(linha);
        if (item) dados.push(item);
    }
    
    return dados;
}

async function carregarDadosTxt() {
    try {
        // Carregar OUTCOME.txt
        const responseOutcome = await fetch('./src/OUTCOME.txt');
        if (!responseOutcome.ok) throw new Error(`Erro ao carregar OUTCOME.txt: ${responseOutcome.status}`);
        const textoOutcome = await responseOutcome.text();
        const dadosOutcome = processarOutcomeTxt(textoOutcome);

        // Carregar INCOME.txt
        const responseIncome = await fetch('./src/INCOME.txt');
        if (!responseIncome.ok) throw new Error(`Erro ao carregar INCOME.txt: ${responseIncome.status}`);
        const textoIncome = await responseIncome.text();
        const dadosIncome = processarIncomeTxt(textoIncome);
        
        console.log(`✅ Dados carregados: ${dadosOutcome.length} registros de Outcome, ${dadosIncome.length} registros de Income`);
        
        return { dadosOutcome, dadosIncome };
    } catch (error) {
        console.error('Erro ao carregar dados TXT:', error);
        throw error;
    }
}

