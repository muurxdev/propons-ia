/* ---------------- Área de código (estilo Claude Code, em qualquer aparelho) ----------------
   Um projeto de arquivos guardado no aparelho: criar/editar/apagar arquivos, pedir mudanças à IA (ela devolve o
   arquivo inteiro e a gente mostra o diff para aceitar ou recusar), salvar no disco e mandar um arquivo para o chat.
   Sem rodar código: o que a IA escreve você aceita, recusa ou exporta. */
ICO.codigo = '<svg viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M12 2.6l1.9 5.1 5-2.2-3.4 4.2 5 2.3-5.4.5 1.7 5.1-4.1-3.5-3.5 4 1-5.3-5.4.7 4.7-2.8-3.8-3.9 5.2 1.9z"/></svg>';
ICO.mais = ICO.mais || '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>';
ICO.salvar = '<svg viewBox="0 0 24 24"><path d="M5 4h11l3 3v13H5z"/><path d="M9 4v5h6V4"/><path d="M8 13h8v7H8z"/></svg>';
const LIMITE_CODIGO = 120000;   // por arquivo
function projeto() { try { const p = JSON.parse(pref('projeto') || 'null'); if (p && Array.isArray(p.arquivos)) return p; } catch (e) {} return { arquivos: [], aberto: '' }; }
function salvarProjeto(p) { pref('projeto', JSON.stringify(p)); }
const arqDoProjeto = (p, nome) => p.arquivos.find(a => a.nome === nome);
function guardarNoProjeto(nome, conteudo, avisar) {
  const p = projeto(); nome = String(nome || 'arquivo.txt').replace(/[\\/:*?"<>|]/g, '_').slice(0, 60) || 'arquivo.txt';
  let n = nome, i = 2; while (arqDoProjeto(p, n) && arqDoProjeto(p, n).conteudo !== conteudo) { n = nome.replace(/(\.[^.]*)?$/, `-${i++}$1`); }
  const a = arqDoProjeto(p, n);
  if (a) a.conteudo = String(conteudo).slice(0, LIMITE_CODIGO);
  else p.arquivos.push({ nome: n, conteudo: String(conteudo).slice(0, LIMITE_CODIGO), lang: langDoArquivo(n) || 'texto', criado: Date.now() });
  p.aberto = n; salvarProjeto(p);
  atualizarTela('codigo');
  if (avisar) toast(`"${n}" está na área de código.`, 2600);
  return n;
}
// diff por linhas (o bastante para mostrar o que a IA mudou)
function diffLinhas(velho, novo) {
  const a = String(velho).split('\n'), b = String(novo).split('\n');
  const m = Array.from({ length: a.length + 1 }, () => new Uint32Array(b.length + 1));
  for (let i = a.length - 1; i >= 0; i--) for (let j = b.length - 1; j >= 0; j--) m[i][j] = a[i] === b[j] ? m[i + 1][j + 1] + 1 : Math.max(m[i + 1][j], m[i][j + 1]);
  const saida = []; let i = 0, j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { saida.push([' ', a[i]]); i++; j++; }
    else if (m[i + 1][j] >= m[i][j + 1]) { saida.push(['-', a[i]]); i++; }
    else { saida.push(['+', b[j]]); j++; }
  }
  while (i < a.length) saida.push(['-', a[i++]]);
  while (j < b.length) saida.push(['+', b[j++]]);
  return saida;
}
function htmlDiff(d) {
  const linhas = [];
  for (let k = 0; k < d.length; k++) {
    const [s, t] = d[k];
    if (s === ' ') {   // contexto: mostra 2 linhas em volta das mudanças
      const perto = d.slice(Math.max(0, k - 2), k + 3).some(x => x[0] !== ' ');
      if (!perto) { if (linhas[linhas.length - 1] !== '<i class="dif-corte">⋯</i>') linhas.push('<i class="dif-corte">⋯</i>'); continue; }
    }
    linhas.push(`<i class="dif-l${s === '+' ? ' mais' : s === '-' ? ' menos' : ''}">${esc((s === ' ' ? '  ' : s + ' ') + t)}</i>`);
  }
  return `<div class="dif">${linhas.join('')}</div>`;
}
/* ---------------- chat de programação (a lógica do chat, focada em codificar) ----------------
   Igual ao chat normal, mas a IA responde com AÇÕES nos arquivos: ler (feito na hora), criar/escrever/apagar
   (mostrados com o diff, você aplica ou recusa). Os arquivos vêm de uma pasta de verdade do aparelho quando dá
   (Windows e Linux: showDirectoryPicker) ou da área interna do app. Nada é gravado sem você aceitar. */
const ESQ_AGENTE = { type: 'object', properties: {
  resposta: { type: 'string' },
  acoes: { type: 'array', maxItems: 6, items: { type: 'object', properties: {
    tipo: { type: 'string', enum: ['ler', 'criar', 'escrever', 'apagar'] }, arquivo: { type: 'string' }, conteudo: { type: 'string' },
  }, required: ['tipo', 'arquivo'], additionalProperties: false } } }, required: ['resposta', 'acoes'], additionalProperties: false };
const TEM_PASTA = typeof window.showDirectoryPicker === 'function' || !!PLATAFORMA.temPastaNativa;
let pastaNativa = false;   // no celular quem guarda a pasta é o próprio aparelho (SAF)
const MAX_ARQS = 400, MAX_LER = 60000;
let pastaRaiz = null;      // FileSystemDirectoryHandle da pasta aberta
let pastaNome = '';
let cacheArqs = null;      // [{nome, tam}]
// guarda a pasta escolhida para as próximas aberturas (o navegador pede a permissão de novo)
const idbPasta = {
  abrir: () => new Promise((ok, falha) => { const r = indexedDB.open('propons-codigo', 1); r.onupgradeneeded = () => r.result.createObjectStore('kv'); r.onsuccess = () => ok(r.result); r.onerror = () => falha(r.error); }),
  async por(k, v) { const db = await this.abrir(); try { return await new Promise((ok, falha) => { const t = db.transaction('kv', 'readwrite'); const s = t.objectStore('kv'); const p = v === undefined ? s.get(k) : s.put(v, k); p.onsuccess = () => ok(p.result); t.onerror = () => falha(t.error); }); } finally { db.close(); } },
};
async function restaurarPasta() {
  if (PLATAFORMA.temPastaNativa) {
    if (pastaNativa) return;
    try { const r = await PLATAFORMA.pastaInfo(); if (r && r.nome) { pastaNativa = true; pastaNome = r.nome; cacheArqs = null; } } catch (e) {}
    return;
  }
  if (!TEM_PASTA || pastaRaiz) return;
  try {
    const h = await idbPasta.por('pasta'); if (!h) return;
    if ((await h.queryPermission({ mode: 'readwrite' })) !== 'granted') { pastaNome = h.name; return; }   // pede ao abrir a tela
    pastaRaiz = h; pastaNome = h.name; cacheArqs = null;
  } catch (e) {}
}
async function escolherPasta() {
  if (PLATAFORMA.temPastaNativa) {
    try {
      const r = await PLATAFORMA.abrirPasta();
      if (!r || !r.nome) return false;
      pastaNativa = true; pastaNome = r.nome; cacheArqs = null; return true;
    } catch (e) { toast('Não consegui abrir a pasta: ' + e.message, 4000); return false; }
  }
  try {
    const h = await window.showDirectoryPicker({ mode: 'readwrite', id: 'propons-codigo' });
    if ((await h.requestPermission({ mode: 'readwrite' })) !== 'granted') { toast('Sem permissão para essa pasta.'); return false; }
    pastaRaiz = h; pastaNome = h.name; cacheArqs = null; try { await idbPasta.por('pasta', h); } catch (e) {}
    return true;
  } catch (e) { return false; }   // cancelou
}
const IGNORAR = /^(node_modules|\.git|dist|build|out|__pycache__|venv|\.venv|target|bin|obj|\.next|\.cache)$/i;
const TEXTO_CODIGO = /\.(txt|md|markdown|py|pyw|js|mjs|cjs|ts|tsx|jsx|java|kt|kts|c|h|cpp|cc|hpp|cs|go|rs|php|rb|swift|sql|html?|css|scss|json|ya?ml|toml|ini|cfg|conf|sh|bash|ps1|bat|lua|r|dart|vue|svelte|env|gitignore|csv)$/i;
// arquivos da pasta aberta (recursivo, só texto/código) ou da área interna
const arqs = {
  get origem() { return (pastaRaiz || pastaNativa) ? 'pasta' : 'interno'; },
  async listar(recarregar) {
    if (pastaNativa) {
      if (cacheArqs && !recarregar) return cacheArqs;
      try { return cacheArqs = (await PLATAFORMA.listarPasta()) || []; } catch (e) { toast('Não consegui ler a pasta: ' + e.message, 4000); return cacheArqs = []; }
    }
    if (!pastaRaiz) return projeto().arquivos.map(a => ({ nome: a.nome, tam: new Blob([a.conteudo]).size }));
    if (cacheArqs && !recarregar) return cacheArqs;
    const saida = [];
    const andar = async (dir, prefixo, nivel) => {
      if (nivel > 6 || saida.length >= MAX_ARQS) return;
      for await (const [nome, h] of dir.entries()) {
        if (saida.length >= MAX_ARQS) break;
        if (nome.startsWith('.') && nome !== '.env' && nome !== '.gitignore') continue;
        if (h.kind === 'directory') { if (!IGNORAR.test(nome)) await andar(h, prefixo + nome + '/', nivel + 1); continue; }
        if (!TEXTO_CODIGO.test(nome)) continue;
        const f = await h.getFile(); if (f.size > MAX_LER) continue;
        saida.push({ nome: prefixo + nome, tam: f.size });
      }
    };
    await andar(pastaRaiz, '', 0);
    saida.sort((a, b) => a.nome.localeCompare(b.nome));
    return cacheArqs = saida;
  },
  async handle(caminho, criar) {
    const partes = caminho.split('/').filter(Boolean); let dir = pastaRaiz;
    for (const p of partes.slice(0, -1)) dir = await dir.getDirectoryHandle(p, { create: !!criar });
    return { dir, nome: partes[partes.length - 1] };
  },
  async ler(caminho) {
    if (pastaNativa) return PLATAFORMA.lerArquivoPasta(caminho);
    if (!pastaRaiz) { const a = arqDoProjeto(projeto(), caminho); if (!a) throw new Error('não existe'); return a.conteudo; }
    const { dir, nome } = await this.handle(caminho);
    return (await (await dir.getFileHandle(nome)).getFile()).text();
  },
  async gravar(caminho, conteudo) {
    if (pastaNativa) { await PLATAFORMA.gravarArquivoPasta(caminho, String(conteudo)); cacheArqs = null; return; }
    if (!pastaRaiz) {   // área do app: sobrescreve o arquivo com esse nome (guardarNoProjeto renomeia para não colidir)
      const p = projeto(), a = arqDoProjeto(p, caminho);
      if (a) a.conteudo = String(conteudo).slice(0, LIMITE_CODIGO);
      else p.arquivos.push({ nome: caminho, conteudo: String(conteudo).slice(0, LIMITE_CODIGO), lang: langDoArquivo(caminho) || 'texto', criado: Date.now() });
      p.aberto = caminho; salvarProjeto(p);   // quem chamou redesenha (redesenhar aqui trocaria o DOM no meio do fluxo)
      return;
    }
    const { dir, nome } = await this.handle(caminho, true);
    const h = await dir.getFileHandle(nome, { create: true });
    const w = await h.createWritable(); await w.write(conteudo); await w.close();
    cacheArqs = null;
  },
  async apagar(caminho) {
    if (pastaNativa) { await PLATAFORMA.apagarArquivoPasta(caminho); cacheArqs = null; return; }
    if (!pastaRaiz) { const p = projeto(); p.arquivos = p.arquivos.filter(a => a.nome !== caminho); salvarProjeto(p); return; }
    const { dir, nome } = await this.handle(caminho); await dir.removeEntry(nome); cacheArqs = null;
  },
};

/* ---------------- histórico próprio da Área de código ----------------
   A área de código tem as conversas dela (não se misturam com as do chat): cada uma guarda as mensagens, as ações
   nos arquivos e o resumo do que já foi feito (o contexto compactado). Fica no aparelho, como as conversas normais. */
const MAX_SESSOES_CODIGO = 12, MSGS_ANTES_COMPACTAR = 16;
const tituloCodigo = msgs => { const m = (msgs || []).find(x => x.role === 'user'); return m ? String(m.texto || '').replace(/\s+/g, ' ').trim().slice(0, 60) : ''; };
function codigoSessoes() {
  try { const v = JSON.parse(pref('codigoSessoes') || 'null'); if (Array.isArray(v)) return v.filter(s => s && s.id); } catch (e) {}
  // vinda da versão anterior (uma conversa só)
  try { const c = JSON.parse(pref('codigoChat') || 'null'); if (c && Array.isArray(c.msgs) && c.msgs.length) return [{ id: novoId(), titulo: tituloCodigo(c.msgs), quando: Date.now(), msgs: c.msgs, resumo: '' }]; } catch (e) {}
  return [];
}
const salvarSessoesCodigo = l => pref('codigoSessoes', JSON.stringify(l.slice(0, MAX_SESSOES_CODIGO)));
let codigoId = '';
function novaSessaoCodigo() {
  const n = { id: novoId(), titulo: '', quando: Date.now(), msgs: [], resumo: '' };
  codigoId = n.id; acoesPendentes = []; salvarSessoesCodigo([n, ...codigoSessoes().filter(s => s.msgs && s.msgs.length)]);
  return n;
}
function codigoChat() {
  const l = codigoSessoes();
  const s = (codigoId && l.find(x => x.id === codigoId)) || l[0];
  if (!s) return novaSessaoCodigo();
  codigoId = s.id; if (!Array.isArray(s.msgs)) s.msgs = [];
  return s;
}
function salvarCodigoChat(c) {
  c.msgs = c.msgs.slice(-40); c.quando = Date.now(); c.titulo = c.titulo || tituloCodigo(c.msgs);
  salvarSessoesCodigo([c, ...codigoSessoes().filter(x => x.id !== c.id)]);
}
function apagarSessaoCodigo(id) {
  salvarSessoesCodigo(codigoSessoes().filter(x => x.id !== id));
  if (id === codigoId) { codigoId = ''; acoesPendentes = []; }
}
/* compactação de contexto: o que já passou vira um resumo curto e sai da conversa (cabe mais na memória da IA) */
async function compactarCodigo(c, avisar) {
  const guardar = 4, velhas = c.msgs.slice(0, -guardar);
  if (velhas.length < 2) { if (avisar) toast('Ainda não há histórico para compactar.'); return false; }
  if (!online) { if (avisar) toast('A IA ainda está ligando.'); return false; }
  const texto = velhas.map(m => (m.role === 'user' ? 'Pedido: ' : 'Própons: ') + String(m.texto || '').slice(0, 1200)
    + (m.acoes && m.acoes.length ? '\n[arquivos: ' + m.acoes.map(a => a.tipo + ' ' + a.arquivo).join(', ') + ']' : '')).join('\n');
  let resumo = '';
  try {
    await PLATAFORMA.gerar([{ role: 'system', content: 'Resuma em português do Brasil, em até 10 linhas, esta conversa de programação: o objetivo, os arquivos mexidos, as decisões tomadas e o que ainda falta. Escreva só o resumo.' },
      { role: 'user', content: (c.resumo ? 'Resumo anterior:\n' + c.resumo + '\n\nDepois disso:\n' : '') + texto }],
      { temperatura: 0.2, exato: true, maxTokens: 700 }, t => { resumo += t; });
  } catch (e) { if (avisar) toast('Não deu para compactar: ' + e.message, 4000); return false; }
  resumo = resumo.replace(/^\s+|\s+$/g, '');
  if (!resumo) { if (avisar) toast('Não consegui resumir agora.'); return false; }
  c.resumo = resumo.slice(0, 3000); c.msgs = c.msgs.slice(-guardar); c.compactadas = (c.compactadas || 0) + velhas.length;
  salvarCodigoChat(c);
  if (avisar) toast(`Contexto compactado: ${velhas.length} mensagens viraram um resumo.`, 4000);
  return true;
}
/* moldes para colar: pedidos prontos (e os seus, guardados no aparelho) */
const MOLDES_CODIGO = [
  ['Criar um programa', 'Crie o arquivo {arquivo} em {linguagem} que {faz isso}. Deixe o código pronto para rodar.'],
  ['Corrigir um erro', 'Leia {arquivo} e corrija este erro: {cole a mensagem de erro}.'],
  ['Explicar o código', 'Leia {arquivo} e me explique passo a passo o que ele faz, em português simples.'],
  ['Comentar e organizar', 'Leia {arquivo}, comente as funções em português e organize o código sem mudar o comportamento.'],
  ['Escrever testes', 'Leia {arquivo} e crie um arquivo de testes para as funções principais.'],
  ['Traduzir de linguagem', 'Leia {arquivo} e reescreva em {linguagem} mantendo o mesmo comportamento.'],
  ['Revisar como um colega', 'Leia {arquivo} e aponte problemas de segurança, desempenho e clareza. Não mude nada ainda.'],
];
const meusMoldes = () => { try { const v = JSON.parse(pref('moldesCodigo') || '[]'); return Array.isArray(v) ? v.filter(m => Array.isArray(m) && m[1]) : []; } catch (e) { return []; } };
const salvarMeusMoldes = l => pref('moldesCodigo', JSON.stringify(l.slice(0, 30)));

const SISTEMA_CODIGO = `Você é a Própons IA no modo programação: ajuda a escrever e corrigir código nos arquivos do aparelho.
Responda SEMPRE em JSON com "resposta" (o que você vai fazer ou explicar, em português do Brasil, curto) e "acoes" (lista, pode ser vazia).
Cada ação: {"tipo":"ler"|"criar"|"escrever"|"apagar","arquivo":"caminho/do/arquivo","conteudo":"…"}.
- "ler": use quando precisar ver um arquivo antes de mudar. Você recebe o conteúdo e continua na próxima rodada.
- "criar"/"escrever": mande o arquivo INTEIRO já pronto em "conteudo" (sem cercas de código). Nunca use "…" nem "resto igual".
- "apagar": só quando a pessoa pedir claramente.
Mexa apenas nos arquivos necessários. Se faltar informação, pergunte em "resposta" e deixe "acoes" vazia.`;
let agenteOcupado = false, acoesPendentes = [];   // [{tipo, arquivo, conteudo, antes}]
const nomeCurto = n => String(n).split('/').pop();

/* ---------------- a tela: mesma lógica do chat, focada em codificar ---------------- */
function telaCodigo(alvoTela) {
  alvoTela.innerHTML = `<div class="cod">
    <div class="cod-topo"></div>
    <div class="cod-chat" id="codChat"></div>
    <div class="cod-compor">
      <button class="icone cod-b" data-molde title="Moldes para colar" aria-label="Moldes para colar">${ICO.molde}</button>
      <textarea class="cod-entrada" rows="1" placeholder="O que vamos programar?" enterkeyhint="send"></textarea>
      <button class="icone cod-b" data-gravar title="Gravar áudio" aria-label="Gravar áudio">${ICO.microfone}</button>
      <button class="redondo enviar" data-enviar title="Enviar" aria-label="Enviar">${ICO.seguir}</button></div>
    <p class="info cod-pe"></p></div>`;
  const cod = alvoTela.querySelector('.cod'), ent = cod.querySelector('.cod-entrada');

  const desenharTopo = async () => {
    const barra = cod.querySelector('.cod-topo'), lista = await arqs.listar(), ch = codigoChat();
    const nSes = codigoSessoes().filter(s => s.msgs && s.msgs.length).length;
    barra.innerHTML = `${TEM_PASTA ? `<button class="cod-chip" data-pasta title="Escolher a pasta do aparelho">${ICO.pasta}<b>${(pastaRaiz || pastaNativa) ? esc(pastaNome) : pastaNome ? 'Reabrir ' + esc(pastaNome) : 'Abrir pasta'}</b></button>`
        : `<span class="cod-chip fixo">${ICO.pasta}<b>Área do app</b></span>`}
      <button class="cod-tag" data-arquivos>${lista.length ? `${lista.length} ${lista.length === 1 ? 'arquivo' : 'arquivos'}` : 'nenhum arquivo'}</button>
      <span class="cod-espaco"></span>
      ${ch.msgs.length ? `<button class="icone cod-b" data-compactar title="Compactar o contexto" aria-label="Compactar o contexto">${ICO.compactar}</button>` : ''}
      <button class="icone cod-b" data-hist title="Conversas de código${nSes ? ' (' + nSes + ')' : ''}" aria-label="Conversas de código">${ICO.historico}</button>
      ${ch.msgs.length ? `<button class="icone cod-b" data-nova title="Nova conversa de código" aria-label="Nova conversa de código">${ICO.renomear}</button>` : ''}
      ${htmlVoltarConversa()}`;
    const liga = (sel, fn) => { const b = barra.querySelector(sel); if (b) b.onclick = fn; };
    ligarVoltarConversa(barra);
    liga('[data-pasta]', async () => { if (await garantirPermissao('pasta')) { await desenharTopo(); toast(`Pasta "${pastaNome}" aberta.`); } });
    liga('[data-arquivos]', () => listarArquivos());
    liga('[data-hist]', () => folhaHistoricoCodigo(desenharTudo));
    liga('[data-nova]', () => { novaSessaoCodigo(); desenharTudo(); ent.focus(); });
    liga('[data-compactar]', async () => { const ch2 = codigoChat(); toast('Compactando o contexto…', 2000); if (await compactarCodigo(ch2, true)) desenharTudo(); });
    desenharPe(lista);
  };
  const desenharPe = lista => {
    const p = cod.querySelector('.cod-pe'), ch = codigoChat();
    const gasto = estimar(SISTEMA_CODIGO + (ch.resumo || '')) + ch.msgs.reduce((s, m) => s + estimar(m.texto || ''), 0) + (lista || []).reduce((s, a) => s + 8, 0);
    const pct = Math.min(99, Math.round(100 * gasto / Math.max(2048, nCtx - 1500)));
    p.innerHTML = ch.msgs.length
      ? `${ch.msgs.length} ${ch.msgs.length === 1 ? 'mensagem' : 'mensagens'}${ch.compactadas ? ` · ${ch.compactadas} resumidas` : ''} · contexto ~${pct}% · nada é gravado sem você aplicar`
      : 'A IA propõe as mudanças; nada é gravado sem você aplicar.';
  };
  const desenharChat = () => {
    const c = cod.querySelector('#codChat'), ch = codigoChat();
    c.innerHTML = '';
    if (!ch.msgs.length && !ch.resumo) {
      c.innerHTML = `<div class="cod-vazio"><h1><span class="sd">${saudacao()},</span> <span class="fr">o que vamos programar?</span></h1>
        <p>Peça em português. Eu leio e escrevo nos arquivos ${arqs.origem === 'pasta' ? 'da pasta <b>' + esc(pastaNome) + '</b>' : 'da área do app'} e você aplica ou recusa cada mudança.</p></div>`;
    }
    if (ch.resumo) {
      const r = document.createElement('details'); r.className = 'cod-resumo';
      r.innerHTML = `<summary>${ICO.compactar}Resumo do que já foi feito${ch.compactadas ? ` (${ch.compactadas} mensagens)` : ''}</summary><div class="txt">${md(ch.resumo)}</div>`;
      c.appendChild(r);
    }
    for (const m of ch.msgs) {
      const d = document.createElement('div'); d.className = 'cod-msg ' + (m.role === 'user' ? 'eu' : 'ia');
      d.innerHTML = m.role === 'user' ? `<span class="cod-seta" aria-hidden="true">&gt;</span><div class="txt">${esc(m.texto || '')}</div>`
        : `<div class="txt">${md(m.texto || '')}</div>`;
      if (m.acoes && m.acoes.length) d.insertAdjacentHTML('beforeend', m.acoes.map(a => `<div class="cod-linha ${esc(a.tipo)}${a.feito ? ' feito' : ''}"><i aria-hidden="true"></i><b>${a.tipo === 'ler' ? 'Leu' : a.tipo === 'apagar' ? (a.feito ? 'Apagou' : 'Apagar') : a.feito ? 'Gravou' : (a.tipo === 'criar' ? 'Criar' : 'Alterar')}</b><code>${esc(a.arquivo)}</code></div>`).join(''));
      c.appendChild(d); if (m.role !== 'user') enfeitar(d);
    }
    for (const a of acoesPendentes) {
      const linhas = a.tipo === 'apagar' ? null : diffLinhas(a.antes || '', a.conteudo || '');
      const mais = linhas ? linhas.filter(l => l[0] === '+').length : 0, menos = linhas ? linhas.filter(l => l[0] === '-').length : 0;
      const d = document.createElement('div'); d.className = 'cod-msg ia';
      d.innerHTML = `<div class="cod-dif"><div class="cod-dif-topo"><code>${esc(a.arquivo)}</code>
          <span class="cod-conta">${a.tipo === 'apagar' ? 'apagar o arquivo' : `<b class="mais">+${mais}</b> <b class="menos">−${menos}</b>`}</span></div>
        ${linhas ? htmlDiff(linhas) : ''}
        <div class="cod-dif-pe"><button class="btn primario" data-ap="${esc(a.arquivo)}">Aplicar</button><button class="btn" data-rec="${esc(a.arquivo)}">Recusar</button>${acoesPendentes.length > 1 ? '<button class="btn" data-ap-tudo>Aplicar tudo</button>' : ''}</div></div>`;
      c.appendChild(d);
    }
    c.querySelectorAll('[data-ap]').forEach(b => b.onclick = () => aplicarAcoes([b.dataset.ap], desenharChat, desenharTopo));
    c.querySelectorAll('[data-rec]').forEach(b => b.onclick = () => { acoesPendentes = acoesPendentes.filter(a => a.arquivo !== b.dataset.rec); desenharChat(); });
    const bt = c.querySelector('[data-ap-tudo]'); if (bt) bt.onclick = () => aplicarAcoes(acoesPendentes.map(a => a.arquivo), desenharChat, desenharTopo);
    c.scrollTop = c.scrollHeight;
  };
  const desenharTudo = () => { desenharChat(); desenharTopo(); };

  const enviar = () => { const t = ent.value.trim(); if (!t || agenteOcupado) return; ent.value = ''; ent.style.height = 'auto'; rodarAgente(t, desenharChat, desenharTopo); };
  ent.oninput = () => { ent.style.height = 'auto'; ent.style.height = Math.min(ent.scrollHeight, 140) + 'px'; };
  ent.onkeydown = e => { if (e.key === 'Enter' && !e.shiftKey && !estreita()) { e.preventDefault(); enviar(); } };
  cod.querySelector('[data-enviar]').onclick = enviar;
  cod.querySelector('[data-molde]').onclick = () => folhaMoldes(ent);
  cod.querySelector('[data-gravar]').onclick = async () => {
    if (!await garantirPermissao('microfone')) return;
    alvoTranscricao = ent; iniciarGravacao();
  };
  restaurarPasta().then(desenharTopo);
  desenharChat();
}
/* as conversas de código (histórico próprio) */
function folhaHistoricoCodigo(depois) {
  const f = document.createElement('div'); f.className = 'dlg-fundo';
  const desenhar = () => {
    const l = codigoSessoes().filter(s => s.msgs && s.msgs.length);
    f.innerHTML = `<div class="dlg folha">${topoCentro('Conversas de código', true)}
      <div class="lista-modelos">${l.length ? l.map(s => `<button class="lm" data-s="${s.id}">${s.id === codigoId ? '<span class="check">' + ICO.ok + '</span>' : ''}<span class="pt"><b>${esc(s.titulo || 'Nova conversa')}</b><small>${s.msgs.length} ${s.msgs.length === 1 ? 'mensagem' : 'mensagens'}${s.resumo ? ' · resumida' : ''} · ${tempoAtras(s.quando)}</small></span><span class="lm-x" data-x-s="${s.id}" role="button" tabindex="0" aria-label="Apagar">${ICO.apagar}</span></button>`).join('')
        : '<p class="info" style="padding:12px 14px">Nenhuma conversa de código ainda.</p>'}</div>
      <div class="bib-acoes"><button class="btn primario" data-nova>${ICO.renomear}Nova conversa</button>${codigoChat().msgs.length > 2 ? `<button class="btn" data-compactar>${ICO.compactar}Compactar contexto</button>` : ''}</div></div>`;
    const folha = f.firstChild, sair = () => animarSaida(f, folha);
    f.fechar = sair; f.onclick = e => { if (e.target === f) sair(); }; folha.querySelector('[data-x]').onclick = sair;
    folhaArrastavel(f, folha, sair);
    folha.querySelectorAll('[data-s]').forEach(b => b.onclick = e => {
      if (e.target.closest('[data-x-s]')) return;
      codigoId = b.dataset.s; acoesPendentes = []; sair(); depois();
    });
    folha.querySelectorAll('[data-x-s]').forEach(b => b.onclick = e => { e.stopPropagation(); apagarSessaoCodigo(b.dataset.xS); desenhar(); depois(); });
    folha.querySelector('[data-nova]').onclick = () => { novaSessaoCodigo(); sair(); depois(); };
    const bc = folha.querySelector('[data-compactar]');
    if (bc) bc.onclick = async () => { sair(); toast('Compactando o contexto…', 2000); if (await compactarCodigo(codigoChat(), true)) depois(); };
  };
  desenhar();
  pausarDesenho(); document.body.appendChild(f); posicionarPop(f, f.firstChild, $('#latNav'));
}
/* moldes: um toque cola o pedido na caixa */
function folhaMoldes(ent) {
  const f = document.createElement('div'); f.className = 'dlg-fundo';
  const desenhar = () => {
    const meus = meusMoldes();
    f.innerHTML = `<div class="dlg folha">${topoCentro('Moldes para colar', true)}
      <div class="lista-modelos">${[...meus.map((m, i) => [m[0], m[1], i]), ...MOLDES_CODIGO].map(([t, txt, i]) => `<button class="lm" data-m="${esc(txt)}"><span class="pt"><b>${esc(t)}</b><small>${esc(txt.slice(0, 70))}${txt.length > 70 ? '…' : ''}</small></span>${i === undefined ? '' : `<span class="lm-x" data-x-m="${i}" role="button" tabindex="0" aria-label="Apagar molde">${ICO.apagar}</span>`}</button>`).join('')}</div>
      <div class="bib-acoes">${ent.value.trim() ? `<button class="btn" data-salvar>${ICO.salvar}Salvar o que escrevi como molde</button>` : ''}</div></div>`;
    const folha = f.firstChild, sair = () => animarSaida(f, folha);
    f.fechar = sair; f.onclick = e => { if (e.target === f) sair(); }; folha.querySelector('[data-x]').onclick = sair;
    folhaArrastavel(f, folha, sair);
    folha.querySelectorAll('[data-m]').forEach(b => b.onclick = e => {
      if (e.target.closest('[data-x-m]')) return;
      sair(); const t = b.dataset.m;
      ent.value = t; ent.dispatchEvent(new Event('input')); ent.focus();
      const p = t.indexOf('{'); if (p >= 0) { try { ent.setSelectionRange(p, t.indexOf('}', p) + 1); } catch (er) {} }
    });
    folha.querySelectorAll('[data-x-m]').forEach(b => b.onclick = e => { e.stopPropagation(); const l = meusMoldes(); l.splice(+b.dataset.xM, 1); salvarMeusMoldes(l); desenhar(); });
    const bs = folha.querySelector('[data-salvar]');
    if (bs) bs.onclick = async () => {
      const txt = ent.value.trim();
      const nome = await perguntarTexto('Nome do molde', txt.slice(0, 40));
      if (nome === null) return;
      salvarMeusMoldes([[nome || txt.slice(0, 30), txt], ...meusMoldes()]); desenhar(); toast('Molde salvo.');
    };
  };
  desenhar();
  pausarDesenho(); document.body.appendChild(f); posicionarPop(f, f.firstChild, $('.cod-compor [data-molde]'));
}
// lista de arquivos numa folha: abrir para ver/editar
async function listarArquivos() {
  const lista = await arqs.listar(true);
  const f = document.createElement('div'); f.className = 'dlg-fundo';
  f.innerHTML = `<div class="dlg folha">${topoCentro('Arquivos', true)}<div class="lista-modelos">${lista.map(a => `<button class="lm" data-a="${esc(a.nome)}"><span class="pt"><b>${esc(nomeCurto(a.nome))}</b><small>${esc(a.nome)} · ${tamanhoBonito(a.tam)}</small></span></button>`).join('') || '<p class="info" style="padding:14px">Nenhum arquivo.</p>'}</div></div>`;
  const folha = f.firstChild, sair = () => animarSaida(f, folha);
  f.fechar = sair; f.onclick = e => { if (e.target === f) sair(); }; folha.querySelector('[data-x]').onclick = sair;
  folhaArrastavel(f, folha, sair);
  folha.querySelectorAll('[data-a]').forEach(b => b.onclick = async () => { sair(); await verArquivo(b.dataset.a); });
  pausarDesenho(); document.body.appendChild(f); posicionarPop(f, folha, $('.cod-topo [data-arquivos]') || $('#latNav') || $('#anexar'));
}
async function verArquivo(caminho) {
  let conteudo = '';
  try { conteudo = await arqs.ler(caminho); } catch (e) { toast('Não consegui abrir: ' + e.message, 4000); return; }
  const f = document.createElement('div'); f.className = 'dlg-fundo';
  f.innerHTML = `<div class="dlg folha codigo">${topoCentro(nomeCurto(caminho), true)}
    <textarea class="cod-editor" spellcheck="false">${esc(conteudo)}</textarea>
    <div class="bib-acoes"><button class="btn primario" data-gravar>${ICO.salvar}Salvar</button><button class="btn" data-baixar>${ICO.baixar}Baixar</button><button class="btn" data-chat>Mandar para o chat</button></div></div>`;
  const folha = f.firstChild, sair = () => animarSaida(f, folha);
  f.fechar = sair; f.onclick = e => { if (e.target === f) sair(); }; folha.querySelector('[data-x]').onclick = sair;
  folhaArrastavel(f, folha, sair);
  folha.querySelector('[data-gravar]').onclick = async () => { try { await arqs.gravar(caminho, folha.querySelector('.cod-editor').value); toast('Salvo.'); sair(); atualizarTela('codigo'); } catch (e) { toast('Não deu para salvar: ' + e.message, 4000); } };
  folha.querySelector('[data-baixar]').onclick = () => PLATAFORMA.salvarArquivo(nomeCurto(caminho), folha.querySelector('.cod-editor').value, 'text/plain').then(r => r !== false && toast('Arquivo salvo.')).catch(e => toast('Não deu para salvar: ' + e.message, 4000));
  folha.querySelector('[data-chat]').onclick = () => { sair(); fecharTela(); anexos = anexos.filter(y => y.nome !== nomeCurto(caminho)); anexos.push({ nome: nomeCurto(caminho), tam: new Blob([conteudo]).size, lang: langDoArquivo(caminho) || 'texto', conteudo }); desenharChips(); ajustar(); $('#entrada').focus(); };
  pausarDesenho(); document.body.appendChild(f); posicionarPop(f, folha, $('#anexar'));
}
async function aplicarAcoes(nomes, desenharChat, desenharPasta) {
  const ch = codigoChat();
  for (const nome of nomes) {
    const a = acoesPendentes.find(x => x.arquivo === nome); if (!a) continue;
    try {
      if (a.tipo === 'apagar') await arqs.apagar(a.arquivo); else await arqs.gravar(a.arquivo, a.conteudo);
      const ultima = ch.msgs[ch.msgs.length - 1];
      if (ultima && ultima.role === 'assistant') { ultima.acoes = (ultima.acoes || []).map(x => x.arquivo === a.arquivo ? Object.assign({}, x, { feito: true }) : x); }
      acoesPendentes = acoesPendentes.filter(x => x !== a);
    } catch (e) { toast(`Não deu para gravar "${a.arquivo}": ${e.message}`, 5000); }
  }
  salvarCodigoChat(ch); desenharChat(); if (desenharPasta) await desenharPasta();
}
async function rodarAgente(pedido, desenharChat, desenharPasta) {
  if (!online) { toast('A IA ainda está ligando.'); return; }
  if (geracao) { toast('Espere a resposta do chat terminar.'); return; }
  let ch = codigoChat();
  if (ch.msgs.length > MSGS_ANTES_COMPACTAR) { toast('Compactando o contexto…', 1800); await compactarCodigo(ch); ch = codigoChat(); }
  ch.msgs.push({ role: 'user', texto: pedido }); salvarCodigoChat(ch); acoesPendentes = []; desenharChat();
  agenteOcupado = true;
  const cont = document.querySelector('#codChat');
  const espera = document.createElement('div'); espera.className = 'cod-msg ia'; espera.innerHTML = `<div class="txt">${htmlTrabalhando()}</div>`;
  if (cont) { cont.appendChild(espera); cont.scrollTop = cont.scrollHeight; }
  const pararP = novaPalavra(espera.querySelector('.trabalhando'), true);
  const lidos = {};
  try {
    for (let rodada = 0; rodada < 3; rodada++) {
      const lista = await arqs.listar();
      const contexto = `Arquivos disponíveis (${arqs.origem === 'pasta' ? 'pasta ' + pastaNome : 'área do app'}):\n${lista.length ? lista.map(a => `- ${a.nome} (${tamanhoBonito(a.tam)})`).join('\n') : '(nenhum)'}`
        + (ch.resumo ? '\n\nResumo do que já foi feito nesta conversa:\n' + ch.resumo : '')
        + (Object.keys(lidos).length ? '\n\nConteúdo dos arquivos que você pediu:\n' + Object.entries(lidos).map(([n, c]) => `--- ${n} ---\n${c}`).join('\n\n') : '');
      const hist = ch.msgs.slice(-8).map(m => ({ role: m.role, content: m.role === 'assistant' ? m.texto + (m.acoes && m.acoes.length ? '\n[ações: ' + m.acoes.map(a => a.tipo + ' ' + a.arquivo).join(', ') + ']' : '') : m.texto }));
      let saida = '';
      await PLATAFORMA.gerar([{ role: 'system', content: SISTEMA_CODIGO + '\n\n' + contexto }, ...hist], { temperatura: 0.2, exato: true, maxTokens: 4000, esquema: ESQ_AGENTE }, t => { saida += t; });
      const d = extrairJSON(saida);
      if (!d) throw new Error('resposta fora do formato');
      const acoes = (Array.isArray(d.acoes) ? d.acoes : []).filter(a => a && a.arquivo && ['ler', 'criar', 'escrever', 'apagar'].includes(a.tipo)).slice(0, 6);
      const paraLer = acoes.filter(a => a.tipo === 'ler' && !(a.arquivo in lidos));
      const mudancas = acoes.filter(a => a.tipo !== 'ler');
      ch.msgs.push({ role: 'assistant', texto: String(d.resposta || '').slice(0, 4000), acoes: acoes.map(a => ({ tipo: a.tipo, arquivo: a.arquivo })) });
      salvarCodigoChat(ch);
      for (const a of paraLer) { try { lidos[a.arquivo] = (await arqs.ler(a.arquivo)).slice(0, MAX_LER); } catch (e) { lidos[a.arquivo] = '(não encontrei este arquivo)'; } }
      if (mudancas.length) {
        for (const a of mudancas) {
          let antes = ''; try { antes = await arqs.ler(a.arquivo); } catch (e) {}
          acoesPendentes.push({ tipo: a.tipo, arquivo: a.arquivo, conteudo: String(a.conteudo || ''), antes });
        }
        break;
      }
      if (!paraLer.length) break;   // nada para ler e nada para mudar: a IA só respondeu
    }
  } catch (e) { const c2 = codigoChat(); c2.msgs.push({ role: 'assistant', texto: 'Não consegui completar: ' + e.message }); salvarCodigoChat(c2); }
  finally { if (pararP) pararP(); espera.remove(); agenteOcupado = false; desenharChat(); if (desenharPasta) await desenharPasta(); }
}
