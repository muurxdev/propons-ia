/* ---------------- enviar / responder ---------------- */
const INVENTA = /[\[(]\s*-?\d+\s*,\s*-?\d+\s*,/;

/* tokens de verdade: o tokenizador do próprio modelo (/tokenize) mede cada texto uma vez; antes disso (ou no iOS) vale a
   estimativa por caracteres. Tudo que decide o que cabe na memória da IA passa por tokens(). */
const medidos = new Map();
const chaveTexto = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return s.length + ':' + (h >>> 0); };
const tokens = s => { s = s || ''; if (s.length < 40) return estimar(s); const v = medidos.get(chaveTexto(s)); return v != null ? v : estimar(s); };
async function medirTokens(textos) {
  for (const s of textos) {
    if (!s || s.length < 40) continue;
    const k = chaveTexto(s); if (medidos.has(k)) continue;
    const n = await PLATAFORMA.contarTokens(s); if (n == null) return;   // motor sem /tokenize: fica a estimativa
    medidos.set(k, n); if (medidos.size > 500) medidos.delete(medidos.keys().next().value);
  }
}
// quantos caracteres deste texto cabem em tk tokens (pela proporção medida do próprio texto)
const charsPara = (s, tk) => Math.max(0, Math.floor(tk * s.length / Math.max(1, tokens(s))));
const POR_MENSAGEM = 6;   // marcas do modelo de chat em volta de cada mensagem

// "resuma o PDF", "do que trata o arquivo": o documento inteiro é lido por partes e cada parte vira um resumo
const PEDIDO_GERAL = /\b(?:resum\w*|sintetiz\w*|do que (?:se )?trata|sobre o que (?:[ée]|fala)|principais (?:pontos|ideias|t[óo]picos|assuntos)|(?:explique|analise|leia) (?:o|a|este|esse|esta|essa) (?:pdf|arquivo|documento|texto|apostila|livro))\b/i;
// teto do arquivo por pergunta: mesmo com 32k de memória, trechos demais deixam a leitura lenta e a resposta vaga
const TETO_ARQUIVO = 8000, TETO_BLOCO = 12000;
const docsDe = m => ((m && m.anexos) || []).filter(a => a.conteudo);

// A última pergunta: arquivo que não cabe vira os trechos ligados à pergunta (src/busca.js) ou o resumo por partes;
// arquivos mandados antes na conversa continuam consultáveis pelos trechos. Devolve o texto e quanto dele é de arquivo.
function conteudoDaPergunta(m, anteriores, livre) {
  const texto = m.llm || m.texto || '', docs = docsDe(m), pergunta = m.texto || '';
  if (!docs.length) {
    const antigos = [].concat(...anteriores.filter(x => x.role === 'user').map(docsDe)).filter(a => a.conteudo.length > 1500).slice(-3);
    const cabe = Math.min(TETO_ARQUIVO, Math.floor((livre - tokens(texto)) * 0.6));
    if (!antigos.length || pergunta.trim().length < 8 || cabe < 300) return { texto, anexos: 0 };
    const achados = antigos.map(a => { const r = BUSCA.trechosRelevantes(a.conteudo, pergunta, charsPara(a.conteudo, cabe / antigos.length)); return r && `Arquivo: ${a.nome}\n${r.texto}`; }).filter(Boolean);
    if (!achados.length) return { texto, anexos: 0 };
    const extra = '\n\n[Trechos dos arquivos enviados antes nesta conversa, ligados a esta pergunta]\n' + achados.join('\n\n');
    return { texto: texto + extra, anexos: tokens(extra) };
  }
  const corte = texto.indexOf('\n\nArquivo anexado: ');
  const cabeca = corte >= 0 ? texto.slice(0, corte) : texto;
  if (tokens(texto) <= livre) return { texto, anexos: tokens(texto) - tokens(cabeca) };
  const bloco = (a, corpo, nota) => `Arquivo anexado: ${a.nome}${nota ? ' ' + nota : ''}\n\`\`\`${a.lang}\n${corpo}\n\`\`\``;
  const grandes = docs.filter(a => tokens(a.conteudo) > 600), pequenos = docs.filter(a => !grandes.includes(a));
  const fixos = pequenos.map(a => bloco(a, a.conteudo));
  const resto = livre - tokens(cabeca) - fixos.reduce((s, b) => s + tokens(b), 0) - 80 * grandes.length;
  const cada = Math.max(200, Math.floor(Math.min(resto, TETO_ARQUIVO) / Math.max(1, grandes.length)));
  const geral = PEDIDO_GERAL.test(pergunta) || !pergunta.trim() || !!m.modo;
  const reduzidos = grandes.map(a => {
    const tam = a.paginas ? `${a.paginas} páginas` : 'arquivo longo';
    if (geral && a.resumos && a.resumos.length) {
      const r = a.resumos.map(p => (p.de ? `Páginas ${p.de}–${p.ate}:` : 'Parte:') + '\n' + p.texto).join('\n\n');
      return bloco(a, r.slice(0, charsPara(r, cada)), `(${tam}; o arquivo inteiro não cabe na memória: abaixo, o resumo de cada parte)`);
    }
    const t = BUSCA.trechosRelevantes(a.conteudo, pergunta, charsPara(a.conteudo, cada));
    if (t) return bloco(a, t.texto, `(${tam}; só os trechos ligados à pergunta cabem na memória${t.paginas.length ? ': páginas ' + t.paginas.join(', ') : ''})`);
    return bloco(a, a.conteudo.slice(0, charsPara(a.conteudo, cada)) + '\n[…o resto do arquivo não coube]', `(${tam}; só o começo cabe na memória)`);
  });
  const final = cabeca + '\n\n' + fixos.concat(reduzidos).join('\n\n');
  return { texto: final, anexos: tokens(final) - tokens(cabeca) };
}

// lê um arquivo longo por partes (blocos de páginas que cabem na memória) e resume cada uma: fica em a.resumos
async function resumirEmPartes(a, aoPasso, sinal) {
  const partes = BUSCA.blocos(a.conteudo, charsPara(a.conteudo, Math.min(TETO_BLOCO, Math.max(1200, Math.floor(nCtx * 0.6) - 700)))), feitos = [];
  for (let i = 0; i < partes.length; i++) {
    const p = partes[i];
    aoPasso(partes.length > 1 ? `Lendo ${a.nome}: ${p.de ? `páginas ${p.de}–${p.ate}` : `parte ${i + 1}`} (${i + 1} de ${partes.length})` : `Lendo ${a.nome}`);
    let r = '';
    await PLATAFORMA.gerar([{ role: 'system', content: 'Resuma em português do Brasil, em até 12 linhas, este trecho de um documento: as ideias principais, definições, nomes, datas e números importantes. Escreva só o resumo.' },
      { role: 'user', content: p.texto }], { temperatura: 0.2, exato: true, maxTokens: 500 }, t => { r += t; }, sinal);
    feitos.push({ de: p.de, ate: p.ate, texto: r.replace(/<think>[\s\S]*?(<\/think>|$)/g, '').trim() });
  }
  a.resumos = feitos;
}

// Monta o que vai para a IA dentro da memória dela (nCtx) e mede cada parte em .uso: a bolinha de contexto mostra isto.
function montarHistorico(conv, maxTokens, sistema, extra) {
  const reserva = maxTokens + 300, tkSistema = tokens(sistema || SYSTEM);
  const orcamento = Math.max(1200, nCtx - tkSistema - reserva);
  const msgs = conv.msgs.filter(m => !m.interno && !m.compactada);   // compactadas: viraram o resumo (conv.resumo)
  const saida = []; let usado = 0, deArquivo = 0, omitidas = 0;
  for (let i = msgs.length - 1; i >= 0; i--) {
    const m = msgs[i], ultima = i === msgs.length - 1;
    const fotos = m.imagens && m.imagens.length, fotosAgora = !!(fotos && ultima && m._envio), tkFotos = fotosAgora ? TOKENS_FOTO * fotos : 0;
    let conteudo = m.llm || m.texto, doc = 0;
    if (ultima && m.role === 'user') { const r = conteudoDaPergunta(m, msgs.slice(0, i), orcamento - tkFotos - POR_MENSAGEM); conteudo = r.texto; doc = r.anexos; }
    else if (m.anexos && m.anexos.length) doc = Math.max(0, tokens(conteudo) - tokens(m.texto));
    if (fotos && !fotosAgora) conteudo += `\n[${fotos === 1 ? 'uma foto foi enviada' : fotos + ' fotos foram enviadas'} nesta mensagem]`;
    if (usado + tokens(conteudo) + POR_MENSAGEM + tkFotos > orcamento) {
      if (ultima) { conteudo = conteudo.slice(0, charsPara(conteudo, orcamento - usado - POR_MENSAGEM - tkFotos)) + '\n[…texto cortado por ser longo demais]'; doc = Math.min(doc, tokens(conteudo)); }
      else if (m.anexos && m.anexos.length) { conteudo = m.texto + `\n[anexos anteriores omitidos: ${m.anexos.map(a => a.nome).join(', ')}]`; doc = 0; }
      else { omitidas = i + 1; break; }
      if (usado + tokens(conteudo) + POR_MENSAGEM + tkFotos > orcamento) { omitidas = i + 1; break; }
    }
    usado += tokens(conteudo) + POR_MENSAGEM + tkFotos; deArquivo += doc + tkFotos;
    if (fotosAgora) saida.unshift({ role: m.role, content: [{ type: 'text', text: conteudo }, ...m._envio.map(url => ({ type: 'image_url', image_url: { url } }))] });
    else saida.unshift({ role: m.role, content: conteudo });
  }
  while (saida.length && saida[0].role !== 'user') { const x = saida.shift(); usado -= tokens(x.content) + POR_MENSAGEM; omitidas++; }   // começa sempre por uma pergunta
  const r = extra ? saida.concat(extra) : saida;
  r.uso = { total: nCtx, sistema: tkSistema, historico: Math.max(0, usado - deArquivo), anexos: deArquivo, reserva, omitidas };
  return r;
}
// o texto de cada mensagem montada (para medir com o tokenizador de verdade)
const textosDe = h => h.map(x => typeof x.content === 'string' ? x.content : x.content.filter(c => c.type === 'text').map(c => c.text).join('\n'));

function textoParaModelo(texto, lista) {
  if (!lista.length) return texto;
  const blocos = lista.map(a => `Arquivo anexado: ${a.nome}\n\`\`\`${a.lang}\n${a.conteudo}\n\`\`\``).join('\n\n');
  return (texto || 'Analise o(s) arquivo(s) anexado(s).') + '\n\n' + blocos;
}

async function enviar(texto) {
  texto = texto.trim();
  if ((!texto && !anexos.length) || geracao) return;
  if (ESCOLHER && conversas.some(c => c.msgs.some(x => x.pendente))) { toast('Espere a IA ligar para mandar outra mensagem.'); return; }
  if (!ESCOLHER && anexos.some(a => a.tipo === 'imagem') && !(await garantirVisao())) return;
  if (geracao) return;
  if (editando && atual) {
    // substitui a pergunta em edição (e tudo o que veio depois dela)
    const iu = editandoIdx >= 0 && editandoIdx < atual.msgs.length ? editandoIdx : ultimoIndice(atual, 'user'); if (iu >= 0) atual.msgs.splice(iu);
    cancelarEdicao(); abrir(atual.id);
  }
  $('#entrada').value = '';
  const todos = anexos; anexos = []; desenharChips(); ajustar();
  const fotos = todos.filter(a => a.tipo === 'imagem'), lista = todos.filter(a => a.tipo !== 'imagem');
  if (!atual) {
    const base = (texto || (fotos.length ? (fotos.length === 1 ? 'Foto' : fotos.length + ' fotos') : lista.map(a => a.nome).join(', '))).replace(/\s+/g, ' ').trim();
    const titulo = (base.match(/^.{0,60}?[.!?](?=\s|$)/) || [base.slice(0, 60)])[0].replace(/[.!?]+$/, '') || 'Conversa';
    atual = { id: novoId(), titulo, criada: Date.now(), atualizada: Date.now(), msgs: [] };
    conversas.unshift(atual); $('#tituloAtual').textContent = atual.titulo;
  }
  const m = { role: 'user', texto, llm: textoParaModelo(texto || (fotos.length && !lista.length ? (fotos.length === 1 ? 'Descreva e explique esta foto.' : 'Descreva e explique estas fotos.') : ''), lista) };
  if (modoAtivo) { m.modo = modoAtivo; m.llm = MODOS[modoAtivo].instrucao + '\n\n' + m.llm; definirModo(null); }
  if (lista.length) m.anexos = lista;
  if (fotos.length) {
    m.imagens = fotos.map(a => ({ nome: a.nome, miniatura: a.miniatura }));
    Object.defineProperty(m, '_envio', { value: fotos.map(a => a.dataUrl), enumerable: false, writable: true });   // não vai para o arquivo de conversas
  }
  // as fotos em tamanho cheio (_envio) só servem para a última pergunta; as anteriores saem da memória
  atual.msgs.forEach(x => { if (x._envio) x._envio = null; });
  atual.msgs.push(m); atual.atualizada = Date.now();
  conversas = [atual, ...conversas.filter(c => c !== atual)];
  if (ESCOLHER) { m.pendente = true; addEu(m, true); desenharLista(); salvar(true); if (escolhendoId) return; if (MODELO_INICIAL) ligarInicial(); else abrirSeletorModelo('enviar'); return; }
  addEu(m, true); desenharLista(); salvar();
  if (!todos.length && !m.modo && tratarMemoria(texto)) return;   // "lembre que…" / "esqueça…": o app responde na hora
  await responder(atual);
}

ICO.ramificar = '<svg viewBox="0 0 24 24"><circle cx="6" cy="5" r="2"/><circle cx="6" cy="19" r="2"/><circle cx="18" cy="9" r="2"/><path d="M6 7v10"/><path d="M6 12c0-3 3-3 6-3h4"/></svg>';
// gera de novo a partir de uma resposta: ela e tudo depois dela saem; a pergunta anterior é respondida outra vez
async function regenerarDe(m) {
  const c = atual; if (!c || geracao) return;
  let i = c.msgs.indexOf(m); if (i < 0) return;
  if (c.msgs[i].role === 'assistant') c.msgs.splice(i); else c.msgs.splice(i + 1);
  while (c.msgs.length && c.msgs[c.msgs.length - 1].role !== 'user') c.msgs.pop();
  if (!c.msgs.length) return;
  abrir(c.id);
  await responder(c);
}
// ramificar: nova conversa com tudo até esta mensagem (a original continua igual)
function ramificar(m) {
  const c = atual; if (!c) return; const i = c.msgs.indexOf(m); if (i < 0) return;
  const ramo = { id: novoId(), titulo: 'Ramo: ' + c.titulo.slice(0, 50), criada: Date.now(), atualizada: Date.now(), pasta: c.pasta, msgs: JSON.parse(JSON.stringify(c.msgs.slice(0, i + 1))) };
  if (!ramo.pasta) delete ramo.pasta;
  conversas.unshift(ramo); salvar(); abrir(ramo.id); toast('Conversa ramificada: continue daqui sem mexer na original.', 3500);
}
async function continuar() {
  const c = atual; if (!c || geracao) return;
  const m = c.msgs[c.msgs.length - 1]; if (!m || m.role !== 'assistant') return;
  await responder(c, m);
}
let editandoIdx = -1;   // índice da pergunta em edição (-1 = a última)
function editarUltima() { if (atual) editarMensagem(atual.msgs[ultimoIndice(atual, 'user')]); }
function editarMensagem(m) {
  if (!atual || geracao || !m) return;
  const iu = atual.msgs.indexOf(m); if (iu < 0) return;
  editandoIdx = iu;
  editando = true; $('#editando').hidden = false;
  $("#entrada").value = m.texto;
  anexos = (m.anexos || []).slice().concat((m.imagens || []).map((x, i) => ({ tipo: "imagem", nome: x.nome, tam: 0, miniatura: x.miniatura, dataUrl: m._envio && m._envio[i] })).filter(a => a.dataUrl));
  desenharChips();
  ajustar(); $('#entrada').focus();
}
function cancelarEdicao() { editando = false; editandoIdx = -1; $('#editando').hidden = true; }
$('#cancelarEdicao').onclick = () => { cancelarEdicao(); $('#entrada').value = ''; anexos = []; desenharChips(); };

async function responder(conv, continuacao) {
  const ultima = conv.msgs[conv.msgs.length - 1];
  const pergunta = continuacao ? conv.msgs[ultimoIndice(conv, 'user')] : ultima;
  const texto = pergunta ? pergunta.texto : '';
  const modo = (pergunta && MODOS[pergunta.modo]) || null, comEsquema = !!(modo && modo.esquema);   // modo de estudo com JSON
  const pedeCodigo = !modo && PEDE_CODIGO.test(texto);
  // Esforço Alto: o modelo raciocina antes de responder (thinking do Qwen3.5); o raciocínio aparece recolhível
  // Auto: pensa só quando a pergunta pede (precisaPensar, em src/detecta.js); nas outras age como o Médio
  const escolhido = esforco(), querPensar = escolhido === 'alto' || (escolhido === 'auto' && precisaPensar(texto));
  const pensar = querPensar && !comEsquema && !continuacao && PLATAFORMA.tipo !== 'ios';
  // pensar não pode virar espera: o raciocínio é curto e a resposta vem logo

  // algoritmo com lista de números: passo a passo e resumo calculados por código (exatos e instantâneos)
  const tr = (continuacao || pedeCodigo || (pergunta && (pergunta.anexos || pergunta.imagens))) ? null : detectTrace(texto);
  if (tr) {
    const titulo = NOMES[tr.alg] + (tr.alg === 'binaria' ? ` · procurando ${tr.val} em ${fmt(tr.lista)}` : ` · ${fmt(tr.lista)}`);
    const r = resumo(tr.alg, tr.lista, tr.val);
    const msg = { role: 'assistant', texto: r, llm: r, passos: { titulo, lista: tr.steps } };
    conv.msgs.push(msg); conv.atualizada = Date.now();
    if (atual === conv) { addPassos(titulo, tr.steps); addIa(msg, true); }
    salvar(); desenharLista(); return;
  }
  if (!online) {
    const aviso = { role: 'assistant', texto: '', llm: '', interno: true, erro: 'A IA está sendo ligada. Quando o indicador ao lado do título sumir, toque em ↻ para tentar de novo.' };
    if (!continuacao) { conv.msgs.push(aviso); if (atual === conv) addIa(aviso, true); salvar(); }
    else toast('A IA ainda está carregando.');
    return;
  }

  const nivel = escolhido === 'auto' ? (pensar ? 'alto' : 'medio') : escolhido;
  // pensar gasta tokens do raciocínio; a reserva nunca passa de 45 % da memória da IA (no celular ela é menor)
  const maxTokens = Math.min(pensar ? 4500 : nivel === 'baixo' ? 700 : pedeCodigo || (pergunta && pergunta.anexos) || nivel === 'alto' ? 3000 : 1500, Math.floor(nCtx * 0.45));
  let SISTEMA = SYSTEM + (falaDoApp(texto) ? SOBRE_APP : '') + textoMemoria() + (nivel === 'baixo' ? '\n\nResponda de forma direta e curta, sem rodeios.'
    : nivel === 'alto' ? '\n\nAntes de responder, pense rápido e objetivo: veja o que foi pedido, resolva e confira. Poucas linhas de raciocínio, sem repetir a pergunta, e então responda.' : '')
    + textoResumo(conv);
  let fontes = null, blocoWeb = '';   // a busca em si roda depois de a resposta aparecer na conversa
  // na continuação, a resposta cortada já é a última mensagem do histórico: o motor continua o texto dela
  let historico = montarHistorico(conv, maxTokens, SISTEMA);
  // continuar só a partir do texto inteiro: se a resposta cortada não coube na memória da IA, continuar dela sairia errado
  if (continuacao && (!historico.length || historico[historico.length - 1].content !== (continuacao.llm || continuacao.texto))) {
    toast('A resposta ficou longa demais para continuar. Peça de novo, de preferência numa conversa nova.', 4000); return;
  }

  let alvo, msg;
  if (continuacao) {
    msg = continuacao; delete msg.cortada; delete msg.interrompida;
    alvo = atual === conv ? [...document.querySelectorAll('.msg.ia .txt')].pop() : null;
    if (alvo) { const a = alvo.parentNode.querySelector('.acoes'); if (a) a.remove(); const n = alvo.parentNode.querySelector('.nota'); if (n) n.remove(); }
  } else {
    msg = { role: 'assistant', texto: '', llm: '' };
    alvo = atual === conv ? addIa({ texto: '', interno: true }, false) : null;
  }
  // enquanto nada foi escrito: "Pensando" com brilho (nos modos de estudo, o aviso do modo); pararPalavra() encerra a troca
  let pararPalavra = null;
  if (alvo) {
    alvo.classList.add('digitando');
    if (comEsquema) alvo.innerHTML = `<p class="info">${esc(modo.espera)}</p>`;
    else if (!msg.texto && !pensar) { alvo.innerHTML = htmlTrabalhando(); pararPalavra = novaPalavra(alvo.firstChild, true); }   // pensando, a palavra fica só na linha do raciocínio
  }
  // a partir daqui a resposta está em andamento (o botão vira "parar"): pesquisa e leitura do arquivo também param
  const ctrl = new AbortController();
  geracao = { conv, ctrl, el: alvo };
  janelaEscondida = document.hidden;   // antes de qualquer espera: trocar de janela durante a pesquisa ou a leitura também conta
  PLATAFORMA.ocupado(true);
  $('#enviar').classList.add('gerando'); $('#enviar').disabled = false; $('#enviar').title = 'Parar';
  // a conversa mostra o passo (pesquisa, leitura do arquivo) no lugar da palavra animada
  const mostrarPasso = t => { if (alvo) { alvo.innerHTML = '<span class="busca-passo">' + esc(t) + '<i></i><i></i><i></i></span>'; rolar(); } };
  // pesquisa na internet: só quando a pessoa ligou e a pergunta é normal
  if (pesquisaLigada() && !comEsquema && !continuacao && texto.trim()) {
    if (semInternet()) SISTEMA += '\n\nA pesquisa na internet está ligada, mas o aparelho está SEM CONEXÃO agora: comece dizendo em uma linha que não dá para pesquisar e responda com o que você já sabe, avisando que pode estar desatualizado.';
    else {
      estado('pesquisando na internet');
      let r = null;
      try { r = await pesquisarNaWeb(texto.slice(0, 300), mostrarPasso); } catch (e) {}
      if (alvo && !msg.texto) alvo.innerHTML = htmlTrabalhando();
      estado('', false, 'rede');
      if (r && r.fontes.length) { blocoWeb = blocoPesquisa(r); SISTEMA += '\n\n' + blocoWeb; fontes = r.fontes; msg.fontes = fontes;
        if (alvo) { const c = document.createElement('div'); c.innerHTML = htmlFontes(fontes); const cartoes = c.firstElementChild; alvo.parentNode.insertBefore(cartoes, alvo); cartoes.querySelectorAll('[data-link]').forEach(a => a.onclick = e => { e.preventDefault(); PLATAFORMA.abrirLink(a.href); }); } }
      else SISTEMA += '\n\nA pesquisa na internet não trouxe resultados agora: diga isso em uma linha e responda com o que você já sabe.';
    }
  }
  // "resuma o PDF" (ou um modo de estudo) com um arquivo que não cabe na memória: lê por partes e resume cada uma;
  // os resumos ficam guardados no anexo e servem para as próximas perguntas gerais sobre ele
  const docsLongos = pergunta && !continuacao ? docsDe(pergunta).filter(a => !a.resumos && tokens(a.conteudo) > nCtx * 0.5) : [];
  if (docsLongos.length && !ctrl.signal.aborted && (PEDIDO_GERAL.test(texto) || !texto.trim() || modo)) {
    estado('lendo o arquivo');
    for (const a of docsLongos) {
      if (ctrl.signal.aborted) break;
      try { await resumirEmPartes(a, mostrarPasso, ctrl.signal); } catch (e) { if (e.name === 'AbortError') break; toast('Não consegui resumir "' + a.nome + '" por partes; uso os trechos.'); }
    }
    estado('', false, 'rede');
    if (alvo && !msg.texto && !comEsquema && !ctrl.signal.aborted) alvo.innerHTML = pensar ? '' : htmlTrabalhando();
    salvar();
  }
  // com o texto de sistema final (pesquisa incluída): mede com o tokenizador do modelo e monta de novo
  await medirTokens([SISTEMA, ...textosDe(montarHistorico(conv, maxTokens, SISTEMA))]);
  historico = montarHistorico(conv, maxTokens, SISTEMA);
  await medirTokens(textosDe(historico));
  historico = montarHistorico(conv, maxTokens, SISTEMA);
  registrarUso(conv, historico.uso, blocoWeb);
  // raciocínio (Esforço Alto): bloco recolhível acima da resposta enquanto pensa; recolhe quando a resposta começa
  let pensEl = null, pensTxt = '';
  let pararPalavraPens = null;
  if (alvo && pensar) {
    pensEl = document.createElement('div'); pensEl.className = 'msg ia pensa';
    pensEl.innerHTML = htmlLinhaPensa(null);
    alvo.parentNode.insertBefore(pensEl, alvo);
    pensEl.dataset.pensando = 'sim';
    ligarLinhaPensa(pensEl, () => pensTxt);
    pararPalavraPens = novaPalavra(pensEl.querySelector('.trabalhando'), true);
  }
  // o raciocínio vai para a folha (aberta ou não): nunca ocupa a conversa
  const aoPensar = pensar ? p => { pensTxt += p; atualizarFolhaPensa(pensTxt); } : undefined;
  // leitura em voz alta enquanto a resposta chega (Aparência → Ler em voz alta: toda resposta)
  if (!continuacao) pararLeitura();
  const narrador = !continuacao && PLATAFORMA.temFala && pref('lerRespostas') === 'sim' ? novoNarrador(msg) : null;

  const inicio = msg.texto || '';
  let novo = '', fim = 'stop', erro = null, tTimer = 0, tRaf = 0;
  const sobreAlgoritmo = !pedeCodigo && !!Object.values(RE_ALG).some(r => r.test(texto));
  const exato = pedeCodigo || sobreAlgoritmo || PEDE_EXATO.test(texto);   // código e contas: amostragem quase determinística
  const foraDeCodigo = s => s.split('```').filter((_, i) => i % 2 === 0).join('\n').replace(/`[^`]*`/g, '');
  // desenho incremental: o que já está fechado (blocos até a última linha em branco fora de código, ou até o fim de um
  // bloco de código) é desenhado uma vez só; a cada quadro só o final da resposta é refeito. Num bloco de código ainda
  // aberto, o texto novo entra como texto puro (sem recolorir o bloco inteiro a cada quadro) e as cores vêm de vez em quando.
  let fixoAte = 0, fixoEl = null, caudaEl = null, custo = 4, aberto = null;
  // digitação suave: o texto aparece aos poucos, num ritmo constante; quando chega muito texto de uma vez,
  // o ritmo acelera para não ficar para trás (35 caracteres/s + 2,5x o que falta mostrar)
  let mostrado = inicio.length, tAnt = 0, terminou = false, aoAlcancar = null;
  const desenhar = s => {
    const t0 = performance.now();
    if (!fixoEl || !fixoEl.isConnected) { alvo.innerHTML = '<div class="fixo"></div><div class="cauda"></div>'; fixoEl = alvo.firstChild; caudaEl = alvo.lastChild; fixoAte = 0; aberto = null; }
    const { fixo, cerca } = analisarResposta(s);
    if (fixo > fixoAte) { fixoEl.insertAdjacentHTML('beforeend', md(s.slice(fixoAte, fixo))); enfeitar(fixoEl); fixoAte = fixo; aberto = null; }
    if (cerca && cerca.pos >= fixoAte) {
      if (!aberto || aberto.pos !== cerca.pos) {
        caudaEl.innerHTML = md(s.slice(fixoAte, cerca.pos)) + `<pre data-lang="${esc(DESTAQUE.rotulo(cerca.lang))}"><code></code></pre>`;
        aberto = { pos: cerca.pos, el: caudaEl.lastChild.firstChild, len: 0, cor: t0 };
      }
      const codigo = s.slice(cerca.codigo);
      if (codigo.length < aberto.len) { aberto.el.textContent = codigo; aberto.len = codigo.length; }
      else if (codigo.length > aberto.len) { aberto.el.appendChild(document.createTextNode(codigo.slice(aberto.len))); aberto.len = codigo.length; }
      if (codigo.length < 8000 && t0 - aberto.cor > 400) { aberto.el.innerHTML = DESTAQUE.destacar(codigo, cerca.lang); aberto.cor = t0; }
    } else { caudaEl.innerHTML = md(s.slice(fixoAte)); aberto = null; }
    rolar();
    custo = custo * 0.7 + (performance.now() - t0) * 0.3;
  };
  // tTimer (setTimeout) e tRaf (requestAnimationFrame) nunca se misturam: cada um é cancelado pela função certa
  const depois = ms => { clearTimeout(tTimer); tTimer = setTimeout(() => { tTimer = 0; agendar(); }, ms); };
  const passo = agora => {
    tRaf = 0;
    if (!alvo || !alvo.isConnected) { if (aoAlcancar) aoAlcancar(); return; }
    const espera = pausaDesenhoAte - performance.now();
    if (espera > 0) { depois(espera); return; }
    const total = inicio + novo, falta = total.length - mostrado;
    const dt = tAnt ? Math.min(100, agora - tAnt) : 16; tAnt = agora;
    if (falta > 0) {
      mostrado = Math.min(total.length, mostrado + Math.max(1, (35 + falta * 2.5) * dt / 1000));
      let ate = Math.floor(mostrado);
      if (ate < total.length && /[\uD800-\uDBFF]/.test(total[ate - 1] || '')) ate++;   // não corta emoji no meio
      desenhar(total.slice(0, ate));
    }
    if (Math.floor(mostrado) >= total.length) { tAnt = 0; if (terminou && aoAlcancar) aoAlcancar(); return; }
    // aparelho lento: desenha menos vezes por segundo, mas o ritmo da digitação continua o mesmo
    if (custo > 10) depois(Math.min(200, custo * 2));
    else tRaf = requestAnimationFrame(passo);
  };
  const agendar = () => { if (!tRaf && !tTimer) tRaf = requestAnimationFrame(passo); };
  // espera a digitação alcançar o fim (no máximo 3 s; se a pessoa tocou em parar, termina na hora)
  const alcancar = () => new Promise(res => {
    terminou = true;
    if (!alvo || ctrl.signal.aborted || Math.floor(mostrado) >= (inicio + novo).length) return res();
    aoAlcancar = res; agendar(); setTimeout(res, 3000);
  });
  try {
    // temperatura livre (0,6–0,7, a recomendada para o Qwen3.5) para a mesma pergunta não cair sempre no mesmo texto;
    // baixa em código e contas. A semente, o DRY e o XTC ficam em plataforma.js.
    const r = await PLATAFORMA.gerar([{ role: 'system', content: SISTEMA }, ...historico],
      { temperatura: comEsquema ? 0.4 : exato ? (nivel === 'alto' ? 0.15 : 0.2) : nivel === 'alto' ? 0.6 : 0.7, exato: exato || comEsquema, repeticao: exato ? 1.0 : 1.05, maxTokens: comEsquema ? 3500 : maxTokens, continuar: !!continuacao, esquema: comEsquema ? modo.esquema : undefined, pensar, aoPensar }, t => {
        novo += t; if (!comEsquema) agendar();
        if (pararPalavra) { pararPalavra(); pararPalavra = null; }
        if (pensEl && pensEl.dataset.pensando !== 'nao') { if (pararPalavraPens) { pararPalavraPens(); pararPalavraPens = null; } pensEl.dataset.pensando = 'nao'; const r = pensEl.querySelector('.pensa-rotulo'); if (r) r.textContent = 'Raciocínio'; }
        if (narrador && /[.!?…\n]/.test(t)) narrador.alimentar(inicio + novo, false);
      }, ctrl.signal);
    fim = (r && r.fim) || 'stop';
  } catch (e) {
    if (e.name !== 'AbortError') erro = e.message || String(e);
  } finally {
    if (pararPalavra) { pararPalavra(); pararPalavra = null; }
    if (pararPalavraPens) { pararPalavraPens(); pararPalavraPens = null; }
    if (!erro && !comEsquema) await alcancar();
    clearTimeout(tTimer); cancelAnimationFrame(tRaf); tTimer = tRaf = 0;
    geracao = null;
    PLATAFORMA.ocupado(false);
    $('#enviar').classList.remove('gerando'); $('#enviar').title = 'Enviar'; ajustar();
  }
  novo = novo.replace(/<think>[\s\S]*?(<\/think>|$)/g, '');
  // explicação de algoritmo com uma lista de números inventada pela IA: em vez de cortar a resposta no meio, avisa no fim
  if (sobreAlgoritmo && !continuacao && !erro && INVENTA.test(foraDeCodigo(novo))) {
    novo = novo.trimEnd() + '\n\n*Os números do exemplo acima são só ilustrativos. Para um passo a passo exato, me mande a lista — por exemplo: **bubble sort em [5, 2, 8, 1]**.*';
  }
  msg.texto = (inicio + novo).trim(); msg.llm = msg.texto;
  if (pensEl) pensEl.remove();
  if (pensTxt.trim()) msg.pensou = pensTxt.trim().slice(0, 6000); else delete msg.pensou;   // o raciocínio fica gravado, recolhido
  if (comEsquema && !erro) {   // o JSON vira o widget; se não deu (cortado/abortado), avisa
    const d = normalizarModo(pergunta.modo, extrairJSON(novo));
    if (d) { msg[modo.campo] = d; msg.texto = markdownDoModo(pergunta.modo, d); msg.llm = msg.texto; }
    else { msg.texto = ''; if (!ctrl.signal.aborted) erro = 'formato'; }
  }
  if (narrador) { if (erro || ctrl.signal.aborted) pararLeitura(); else narrador.alimentar(msg.texto, true); }
  if (erro) {
    msg.erro = /failed to fetch|networkerror|load failed/i.test(erro) ? 'A IA ficou indisponível no meio da resposta. Ela está sendo religada; toque em ↻ para tentar de novo.' :
      /context|exceed|too long|n_ctx/i.test(erro) ? 'A conversa ficou longa demais para a memória da IA. Comece uma nova conversa ou apague mensagens antigas.' :
      erro === 'formato' ? 'A IA não conseguiu montar o resultado neste formato. Tente de novo ou com um texto menor.' : 'Erro: ' + erro;
    if (!msg.texto) msg.interno = true;
  } else { delete msg.erro; delete msg.interno; }
  if (!erro && ctrl.signal.aborted) msg.interrompida = true;
  if (fim === 'length') msg.cortada = true;
  if (!continuacao) conv.msgs.push(msg);
  conv.atualizada = Date.now();
  if (atual === conv && alvo) { alvo.parentNode.remove(); addIa(msg, true); }
  salvar(); desenharLista(); atualizarMedidor();
  if (!erro && !ctrl.signal.aborted) avisarPronto(msg);   // janela em segundo plano: notificação do sistema
}

