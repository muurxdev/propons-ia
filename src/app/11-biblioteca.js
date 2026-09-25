/* ---------------- biblioteca ----------------
   Tudo o que você manda para a IA (fotos, arquivos e áudios transcritos) fica aqui para abrir, perguntar de novo,
   baixar, copiar, renomear, anotar ou apagar (com "Desfazer"). Fica guardado neste aparelho, no IndexedDB
   'propons-biblioteca' (loja 'itens', chave 'id'), com teto de MAX_ITENS_BIB itens / LIMITE_BIB bytes: passou disso,
   os mais antigos saem primeiro. IndexedDB bloqueado (ou página file:// sem banco): vale só a memória, até fechar. */
let biblioteca = [], filtroBib = 'todos', buscaBib = '', ordemBib = 'recentes';
const MAX_ITENS_BIB = 300, LIMITE_BIB = 200 * 1048576, MAX_AUDIO_GUARDADO = 60 * 1048576;
const selBib = new Set();
let selecionandoBib = false, selPorBotaoBib = false, engolirCliqueBib = false;
const IB = {
  busca: '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>',
  ordenar: '<svg viewBox="0 0 24 24"><path d="M7 4v16M3.5 7.5L7 4l3.5 3.5M17 20V4M13.5 16.5L17 20l3.5-3.5"/></svg>',
  nota: '<svg viewBox="0 0 24 24"><path d="M5 4h14v10l-6 6H5z"/><path d="M13 20v-6h6"/><path d="M8.5 8.5h7M8.5 12h4"/></svg>',
  selecionar: '<svg viewBox="0 0 24 24"><rect x="3.5" y="3.5" width="17" height="17" rx="4"/><path d="M8 12.5l3 3 5-6"/></svg>',
  abrir: '<svg viewBox="0 0 24 24"><path d="M2.5 12S6 5 12 5s9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7z"/><circle cx="12" cy="12" r="2.8"/></svg>',
  vazio: '<svg viewBox="0 0 24 24"><path d="M3 7l9-4 9 4-9 4z"/><path d="M3 12l9 4 9-4M3 17l9 4 9-4"/></svg>',
};

/* ---------- banco (IndexedDB) ---------- */
const BIB_DB = 'propons-biblioteca', BIB_LOJA = 'itens';
let bancoBib = null, bibNoAparelho = null, avisouSemEspacoBib = false;   // bibNoAparelho: null = ainda não sabe
function abrirBancoBib() {
  if (bancoBib) return bancoBib;
  bancoBib = new Promise(ok => {
    try {
      if (!window.indexedDB) return ok(null);
      const p = indexedDB.open(BIB_DB, 1);
      p.onupgradeneeded = () => { try { if (!p.result.objectStoreNames.contains(BIB_LOJA)) p.result.createObjectStore(BIB_LOJA, { keyPath: 'id' }); } catch (e) {} };
      p.onsuccess = () => { const db = p.result; db.onversionchange = () => { try { db.close(); } catch (e) {} bancoBib = null; }; ok(db); };
      p.onerror = () => ok(null); p.onblocked = () => ok(null);
    } catch (e) { ok(null); }
  }).then(db => { bibNoAparelho = !!db; return db; });
  return bancoBib;
}
// uma transação; devolve o resultado do pedido (getAll), true (escrita) ou false (sem banco / falhou)
function opBib(modo, fn) {
  return abrirBancoBib().then(db => !db ? false : new Promise(ok => {
    try {
      const t = db.transaction(BIB_LOJA, modo), r = fn(t.objectStore(BIB_LOJA));
      t.oncomplete = () => ok(r && typeof r === 'object' && 'result' in r ? r.result : true);
      t.onerror = () => ok(false);
      t.onabort = () => { if (t.error && t.error.name === 'QuotaExceededError' && !avisouSemEspacoBib) { avisouSemEspacoBib = true; toast('Sem espaço no aparelho para guardar mais na biblioteca.', 4000); } ok(false); };
    } catch (e) { ok(false); }
  })).catch(() => false);
}
// as escritas saem em fila, na ordem em que foram pedidas (apagar logo depois de guardar não "ressuscita" o item)
let filaBib = Promise.resolve();
const naFilaBib = fn => (filaBib = filaBib.then(fn).catch(() => {}));
// só o que é texto/número vai para o banco; o áudio vira bytes (ArrayBuffer atravessa qualquer WebView)
async function paraGuardarBib(i) {
  const o = {};
  for (const k of Object.keys(i)) { const v = i[k]; if (k !== 'audio' && k[0] !== '_' && (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean')) o[k] = v; }
  if (i.audio) {
    o.mime = i.audio.type || o.mime || 'audio/wav';
    if (i.audio.size <= MAX_AUDIO_GUARDADO) { try { o.audioBytes = await i.audio.arrayBuffer(); } catch (e) {} }
  }
  return o;
}
function deGuardadoBib(o) {
  if (!o || !o.id || !o.tipo) return null;
  const i = Object.assign({}, o);
  if (o.audioBytes) { try { i.audio = new Blob([o.audioBytes], { type: o.mime || 'audio/wav' }); } catch (e) {} }
  delete i.audioBytes;
  return i;
}
function gravarBib(i) {
  if (bibNoAparelho === false || !i) return;
  naFilaBib(async () => { const o = await paraGuardarBib(i); if (biblioteca.includes(i)) await opBib('readwrite', s => s.put(o)); });
}
function tirarDoBancoBib(ids) {
  if (bibNoAparelho === false || !ids.length) return;
  naFilaBib(() => opBib('readwrite', s => { ids.forEach(id => s.delete(id)); }));
}
// ao abrir o app: junta o que estava guardado com o que já chegou nesta sessão (sem travar a abertura)
async function carregarBibliotecaSalva() {
  const salvos = await opBib('readonly', s => s.getAll());
  if (!Array.isArray(salvos)) { aoMudarBib(); return; }
  const chave = i => i.tipo + '|' + (i.nomeOriginal || i.nome) + '|' + (i.tam || 0);
  const naMemoria = new Map(biblioteca.map(i => [chave(i), i])), ids = new Set(biblioteca.map(i => i.id)), repetidos = [];
  for (const o of salvos) {
    const i = deGuardadoBib(o); if (!i || ids.has(i.id)) continue;
    const m = naMemoria.get(chave(i));
    if (m) {   // mandou de novo antes de a biblioteca carregar: fica o novo, com o nome e a nota que você deu
      if (i.nota && !m.nota) m.nota = i.nota;
      if (i.nomeOriginal) { m.nomeOriginal = i.nomeOriginal; m.nome = i.nome; }
      repetidos.push(i.id); gravarBib(m); continue;
    }
    biblioteca.push(i);
  }
  tirarDoBancoBib(repetidos);
  biblioteca.sort((a, b) => (b.quando || 0) - (a.quando || 0));
  apararBib();
  aoMudarBib();
}
setTimeout(() => { carregarBibliotecaSalva().catch(() => {}); }, 0);

/* ---------- espaço ---------- */
// estimativa do que cada item ocupa no banco: textos e imagens (data:) pelo tamanho, áudio pelos bytes
const pesoBib = i => 512 + String(i.dataUrl || '').length + String(i.miniatura || '').length + String(i.conteudo || '').length
  + String(i.texto || '').length + String(i.nota || '').length + (i.audio && i.audio.size <= MAX_AUDIO_GUARDADO ? i.audio.size : 0);
const usoBib = () => biblioteca.reduce((s, i) => s + pesoBib(i), 0);
// passou do teto: saem os mais antigos (o mais novo nunca sai)
function apararBib() {
  const fora = [];
  biblioteca.sort((a, b) => (b.quando || 0) - (a.quando || 0));
  let total = usoBib();
  while (biblioteca.length > 1 && (biblioteca.length > MAX_ITENS_BIB || total > LIMITE_BIB)) { const i = biblioteca.pop(); total -= pesoBib(i); fora.push(i.id); selBib.delete(i.id); }
  tirarDoBancoBib(fora);
  return fora.length;
}
const mbBib = b => b < 1048576 ? Math.max(0, Math.round(b / 1024)) + ' KB' : (b / 1048576).toFixed(b < 10485760 ? 1 : 0).replace('.', ',') + ' MB';

/* ---------- entrada (os outros módulos chamam isto) ---------- */
function guardarNaBiblioteca(item) {
  const nome = item.nome;
  const ja = biblioteca.find(x => x.tipo === item.tipo && (x.nomeOriginal || x.nome) === nome && x.tam === item.tam);
  if (ja) {   // o mesmo arquivo de novo: sobe para o topo, com o nome e a nota que já tinha
    ja.quando = Date.now();
    if (atual && !ja.conversa) { ja.conversa = atual.id; ja.conversaTitulo = atual.titulo; }
    if (item.audio && !ja.audio) ja.audio = item.audio;
    biblioteca.sort((a, b) => (b.quando || 0) - (a.quando || 0));
    gravarBib(ja); aoMudarBib(); return;
  }
  const novo = Object.assign({ id: novoId(), quando: Date.now() }, item);
  if (atual) { novo.conversa = atual.id; novo.conversaTitulo = atual.titulo; }
  biblioteca.unshift(novo);
  const saiu = apararBib();
  if (saiu && !guardarNaBiblioteca.avisou) { guardarNaBiblioteca.avisou = true; toast('A biblioteca encheu: os itens mais antigos saíram para caber o novo.', 3500); }
  gravarBib(novo);
  aoMudarBib();
}
// algo mudou: redesenha a tela (se aberta) e a contagem no menu lateral
function aoMudarBib() {
  try { if (telaAtual === 'biblioteca') desenharBiblioteca(); } catch (e) {}
  try { desenharNavLateral(); } catch (e) {}
}

/* ---------- formato, texto e datas ---------- */
const iconeBib = i => i.tipo === 'imagem' ? ICO.foto : i.tipo === 'audio' ? ICO.microfone : ICO.arquivo;
const FORMATOS = { jpg: 'JPEG', jpeg: 'JPEG', jfif: 'JPEG', png: 'PNG', webp: 'WEBP', gif: 'GIF', avif: 'AVIF', bmp: 'BMP', svg: 'SVG', 'svg+xml': 'SVG', heic: 'HEIC', heif: 'HEIF',
  pdf: 'PDF', doc: 'DOC', docx: 'DOCX', txt: 'Texto', plain: 'Texto', md: 'Markdown', markdown: 'Markdown', csv: 'CSV', json: 'JSON', xml: 'XML',
  wav: 'WAV', 'x-wav': 'WAV', wave: 'WAV', mp3: 'MP3', mpeg: 'MP3', m4a: 'M4A', mp4: 'M4A', 'x-m4a': 'M4A', webm: 'WebM', ogg: 'OGG', aac: 'AAC', opus: 'Opus' };
// o formato vem do próprio arquivo (data:image/png…, tipo do blob) e só no fim das contas do nome
function formatoDe(i) {
  const url = i.dataUrl || i.miniatura || '';
  const mime = (/^data:[a-z]+\/([a-z0-9.+-]+)/i.exec(url) || [])[1]
    || (/^[a-z]+\/([a-z0-9.+-]+)/i.exec((i.audio && i.audio.type) || i.mime || '') || [])[1];
  if (mime) return FORMATOS[mime.toLowerCase()] || mime.toUpperCase();
  const ext = (String(i.nomeOriginal || i.nome || '').match(/\.([a-z0-9]+)$/i) || [])[1];
  if (ext) return FORMATOS[ext.toLowerCase()] || ext.toUpperCase();
  return '';
}
const tipoBib = i => { const f = formatoDe(i);
  if (i.tipo === 'audio') return f ? 'Áudio ' + f : 'Áudio';
  return f || (i.tipo === 'imagem' ? 'Imagem' : 'Arquivo'); };
// rótulo curto do quadradinho da linha (PDF, DOCX, MP3, TXT…)
const siglaBib = i => { const f = formatoDe(i) || (i.tipo === 'audio' ? 'Áudio' : 'Arq');
  return ({ Texto: 'TXT', Markdown: 'MD' }[f] || f).toUpperCase().slice(0, 5); };
const duracaoBonita = s => { s = Math.max(0, Math.round(s || 0)); const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60); return (h ? h + ':' + String(m).padStart(2, '0') : String(m)) + ':' + String(s % 60).padStart(2, '0'); };
const textoBib = i => String((i.tipo === 'audio' ? i.texto : i.conteudo) || '');
const plural = (n, um, varios) => n + ' ' + (n === 1 ? um : varios);
function quandoBib(t) {
  const d = new Date(t || 0), agora = new Date(), s = (agora - d) / 1000;
  if (s < 60) return 'agora';
  if (s < 3600) return 'há ' + Math.floor(s / 60) + ' min';
  const dia = x => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const dd = Math.round((dia(agora) - dia(d)) / 86400000), hm = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  if (dd <= 0) return 'hoje, ' + hm;
  if (dd === 1) return 'ontem, ' + hm;
  if (dd < 7) return 'há ' + dd + ' dias';
  return d.toLocaleDateString('pt-BR', d.getFullYear() === agora.getFullYear() ? { day: 'numeric', month: 'short' } : { day: 'numeric', month: 'short', year: 'numeric' }).replace(/\./g, '').replace(/ de /g, ' ');
}
// linha de detalhes: formato · tamanho · duração/páginas · quando
const metaBib = i => [tipoBib(i), i.tam ? tamanhoBonito(i.tam) : '', i.tipo === 'audio' && i.segundos ? duracaoBonita(i.segundos) : i.paginas ? plural(i.paginas, 'página', 'páginas') : '', quandoBib(i.quando)].filter(Boolean).join(' · ');
// busca sem acento e sem maiúscula, trocando letra por letra (o índice do achado vale no texto original)
const dobrar = s => String(s || '').replace(/[^\x00-\x7f]/g, c => { const d = c.normalize('NFD')[0].toLowerCase(); return d.length === 1 ? d : c; }).replace(/[A-Z]/g, c => c.toLowerCase());
const indiceBib = new WeakMap(), conteudoDobradoBib = new WeakMap();
const chaveBuscaBib = i => { let k = indiceBib.get(i); if (k === undefined) { k = dobrar(i.nome + '\n' + (i.nota || '') + '\n' + textoBib(i)); indiceBib.set(i, k); } return k; };
const mudouTextoBib = i => { indiceBib.delete(i); conteudoDobradoBib.delete(i); };
function marcarBib(t, termo) {
  t = String(t || ''); if (!termo) return esc(t);
  const d = dobrar(t); let out = '', a = 0, k;
  while ((k = d.indexOf(termo, a)) >= 0) { out += esc(t.slice(a, k)) + '<mark>' + esc(t.slice(k, k + termo.length)) + '</mark>'; a = k + termo.length; }
  return out + esc(t.slice(a));
}
// 1–2 linhas do texto/transcrição; na busca, o pedaço em volta do que achou
function trechoBib(i, termo) {
  const t = textoBib(i); if (!t) return '';
  if (termo) {
    let d = conteudoDobradoBib.get(i); if (d === undefined) { d = dobrar(t); conteudoDobradoBib.set(i, d); }
    const k = d.indexOf(termo);
    if (k >= 0) { const ini = Math.max(0, k - 60); return (ini ? '…' : '') + marcarBib(t.slice(ini, ini + 240).replace(/\s+/g, ' ').trim(), termo); }
  }
  return esc(t.slice(0, 400).replace(/\s+/g, ' ').trim());
}

/* ---------- tela ---------- */
const ORDENS_BIB = [['recentes', 'Mais recentes'], ['antigos', 'Mais antigos'], ['nome', 'Nome A–Z'], ['maiores', 'Maiores']];
const ABAS_BIB = [['todos', 'Tudo'], ['imagem', 'Fotos'], ['arquivo', 'Arquivos'], ['audio', 'Áudios']];
const colBib = (() => { try { return new Intl.Collator('pt-BR', { sensitivity: 'base', numeric: true }); } catch (e) { return { compare: (a, b) => String(a).localeCompare(String(b)) }; } })();
function ordenarBib(l) {
  const f = { recentes: (a, b) => (b.quando || 0) - (a.quando || 0), antigos: (a, b) => (a.quando || 0) - (b.quando || 0),
    nome: (a, b) => colBib.compare(a.nome || '', b.nome || ''), maiores: (a, b) => (b.tam || 0) - (a.tam || 0) || (b.quando || 0) - (a.quando || 0) }[ordemBib];
  return f ? l.sort(f) : l;
}
const porIdBib = id => biblioteca.find(i => i.id === id);
// o esqueleto (cabeçalho, busca, ordem) é montado uma vez; o resto é redesenhado sem mexer no campo de busca
function telaBiblioteca(alvoTela) {
  alvoTela.innerHTML = `<div class="bib">
    <div class="bib-corpo">
      <div class="bib-cabeca"><div class="bib-tit"><h2>Biblioteca</h2><span class="bib-conta"></span></div>
        <button class="cod-chip" data-selecionar title="Escolher vários itens">${IB.selecionar}<b>Selecionar</b></button>${htmlVoltarConversa()}</div>
      <div class="bib-fixo">
        <div class="bib-barra">
          <label class="bib-busca">${IB.busca}<input type="search" data-busca placeholder="Buscar por nome ou conteúdo" aria-label="Buscar na biblioteca" autocomplete="off" spellcheck="false"></label>
          <button class="bib-ordem" data-ordem aria-haspopup="menu" title="Ordenar">${IB.ordenar}<span></span></button>
        </div>
        <div class="seg bib-abas" role="tablist" aria-label="Tipo"></div>
      </div>
      <div class="bib-conteudo"></div>
      <div class="bib-pe"></div>
    </div>
    <div class="bib-lote" role="toolbar" aria-label="Itens selecionados" hidden></div></div>`;
  const raiz = alvoTela.querySelector('.bib');
  ligarVoltarConversa(raiz);
  const campo = raiz.querySelector('[data-busca]'); campo.value = buscaBib;
  let espera = 0;
  campo.oninput = () => { clearTimeout(espera); espera = setTimeout(() => { buscaBib = campo.value; desenharBiblioteca(); }, 150); };
  campo.onkeydown = e => { if (e.key === 'Escape' && campo.value) { e.preventDefault(); e.stopPropagation(); campo.value = buscaBib = ''; desenharBiblioteca(); } };
  raiz.querySelector('[data-ordem]').onclick = e => {
    e.stopPropagation();
    menuFlutuante(e.currentTarget, ORDENS_BIB.map(([k, r]) => [k === ordemBib ? ICO.ok : '<svg viewBox="0 0 24 24"></svg>', r, () => { ordemBib = k; desenharBiblioteca(); }]), 'Ordenar');
  };
  raiz.querySelector('[data-selecionar]').onclick = () => { selecionandoBib = true; selPorBotaoBib = true; atualizarSelecaoBib(); };
  raiz.querySelector('.bib-abas').onclick = e => { const b = e.target.closest('[data-f]'); if (b) { filtroBib = b.dataset.f; desenharBiblioteca(); } };
  ligarListaBib(raiz);
  ligarLoteBib(raiz);
  desenharBiblioteca();
}
function desenharBiblioteca() {
  const raiz = document.querySelector('.bib'); if (!raiz) return;
  const termo = dobrar(buscaBib.trim());
  const achados = termo ? biblioteca.filter(i => chaveBuscaBib(i).includes(termo)) : biblioteca;
  const n = t => t === 'todos' ? achados.length : achados.filter(i => i.tipo === t).length;
  const lista = ordenarBib(achados.filter(i => filtroBib === 'todos' || i.tipo === filtroBib));
  raiz.querySelector('.bib-conta').textContent = biblioteca.length ? plural(biblioteca.length, 'item', 'itens') : '';
  raiz.querySelector('.bib-ordem span').textContent = (ORDENS_BIB.find(o => o[0] === ordemBib) || ORDENS_BIB[0])[1];
  raiz.querySelector('.bib-ordem').setAttribute('aria-label', 'Ordenar: ' + raiz.querySelector('.bib-ordem span').textContent);
  raiz.querySelector('.bib-fixo').hidden = !biblioteca.length;
  raiz.querySelector('.bib-abas').innerHTML = ABAS_BIB.map(([k, r]) => `<button role="tab" data-f="${k}" aria-selected="${filtroBib === k}" class="${filtroBib === k ? 'on' : ''}">${r}<i>${n(k)}</i></button>`).join('');
  raiz.querySelector('.bib-conteudo').innerHTML = lista.length
    ? `<ol class="bib-lista${selecionandoBib ? ' selecionando' : ''}" aria-label="Itens da biblioteca">${lista.map(i => linhaBib(i, termo)).join('')}</ol>`
    : vazioBib(termo);
  const pe = raiz.querySelector('.bib-pe');
  if (!biblioteca.length) { pe.hidden = true; pe.innerHTML = ''; }
  else {
    const uso = usoBib(), pct = Math.min(100, uso / LIMITE_BIB * 100);
    pe.hidden = false;
    pe.innerHTML = `<div class="bib-pe-topo"><span>Usando <b>${mbBib(uso)}</b> de ${mbBib(LIMITE_BIB)}</span><small>${biblioteca.length} de ${MAX_ITENS_BIB} itens</small></div>
      <div class="uso" role="progressbar" aria-label="Espaço usado pela biblioteca" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(pct)}"><i style="width:${Math.max(uso ? 1.5 : 0, pct).toFixed(1)}%"></i></div>
      <p>${bibNoAparelho === false ? 'Este aparelho não deixou guardar a biblioteca: ela vale só até fechar a Própons IA. Baixe o que quiser manter.' : 'Fica guardado só neste aparelho. Quando encher, os itens mais antigos saem primeiro.'}</p>
      <div class="bib-pe-acoes"><button class="btn link perigo" data-apagar-tudo>${ICO.apagar}Apagar tudo</button></div>`;
    pe.querySelector('[data-apagar-tudo]').onclick = async () => {
      if (await confirmar('Apagar a biblioteca inteira?', `<p>Saem ${plural(biblioteca.length, 'item', 'itens')} deste aparelho. As conversas continuam.</p>`, 'Apagar tudo', true)) apagarBib(biblioteca.slice());
    };
  }
  atualizarSelecaoBib();
}
function vazioBib(termo) {
  const dica = 'Tudo o que você mandar para a IA aparece aqui.';
  if (!biblioteca.length) return `<div class="bib-vazio"><span class="bib-vazio-ico">${ICO.biblioteca}</span><b>Sua biblioteca está vazia</b><p>${dica}</p><p class="bib-vazio-dica">Mande uma foto, um arquivo ou grave um áudio pelo "+" ou pelo microfone.</p></div>`;
  if (termo) return `<div class="bib-vazio"><span class="bib-vazio-ico">${IB.busca}</span><b>Nada encontrado para “${esc(buscaBib.trim())}”</b><p>Tente outra palavra, ou limpe a busca.</p><button class="btn" data-limpar>Limpar busca</button></div>`;
  const [ico, txt] = { imagem: [ICO.foto, 'Nenhuma foto ainda'], arquivo: [ICO.arquivo, 'Nenhum arquivo ainda'], audio: [ICO.microfone, 'Nenhum áudio ainda'] }[filtroBib] || [IB.vazio, 'Nada por aqui'];
  return `<div class="bib-vazio"><span class="bib-vazio-ico">${ico}</span><b>${txt}</b><p>${dica}</p></div>`;
}
function linhaBib(i, termo) {
  const sel = selBib.has(i.id), foto = i.tipo === 'imagem' && (i.miniatura || i.dataUrl);
  const capa = foto ? `<img src="${esc(foto)}" alt="" loading="lazy" decoding="async">`
    : `<span class="bib-tile t-${esc(i.tipo)}">${iconeBib(i)}<b>${esc(siglaBib(i))}</b></span>`;
  const trecho = trechoBib(i, termo), nota = String(i.nota || '').replace(/\s+/g, ' ').trim();
  return `<li class="bib-row${sel ? ' sel' : ''}" data-id="${esc(i.id)}">
    <label class="bib-sel" title="Selecionar"><input type="checkbox" data-sel${sel ? ' checked' : ''} aria-label="Selecionar ${esc(i.nome)}"></label>
    <button class="bib-abrir" data-abrir><span class="bib-capa">${capa}</span><span class="bib-txt">
      <b class="bib-nome">${marcarBib(i.nome, termo)}</b><small class="bib-meta">${esc(metaBib(i))}</small>
      ${trecho ? `<span class="bib-trecho">${trecho}</span>` : ''}${nota ? `<em class="bib-nota-l" title="${esc(nota)}">“${marcarBib(nota, termo)}”</em>` : ''}</span></button>
    <button class="icone bib-mais" data-mais aria-haspopup="menu" aria-label="Mais ações para ${esc(i.nome)}" title="Mais">${ICO.mais}</button></li>`;
}
// cliques da lista num lugar só: abrir, ⋯, marcar; no celular, segurar o dedo entra na seleção
function ligarListaBib(raiz) {
  const cont = raiz.querySelector('.bib-conteudo');
  let toque = null, ultimoPonteiro = 'mouse';
  cont.onclick = e => {
    if (e.target.closest('[data-limpar]')) { buscaBib = ''; const c = raiz.querySelector('[data-busca]'); if (c) { c.value = ''; c.focus(); } desenharBiblioteca(); return; }
    const row = e.target.closest('.bib-row'); if (!row || e.target.closest('.bib-sel')) return;
    const i = porIdBib(row.dataset.id); if (!i) return;
    const mais = e.target.closest('[data-mais]');
    if (mais) { e.stopPropagation(); menuItemBib(i, mais); return; }
    if (engolirCliqueBib) { engolirCliqueBib = false; return; }
    if (selecionandoBib) { alternarSelBib(i.id); return; }
    verItemBiblioteca(i);
  };
  cont.onchange = e => { if (e.target.matches('[data-sel]')) { const row = e.target.closest('.bib-row'); if (row) alternarSelBib(row.dataset.id, e.target.checked); } };
  cont.addEventListener('pointerdown', e => {
    ultimoPonteiro = e.pointerType; engolirCliqueBib = false;
    if (toque) { clearTimeout(toque.t); toque = null; }
    if (e.pointerType === 'mouse') return;
    const row = e.target.closest('.bib-row'); if (!row || e.target.closest('[data-mais], .bib-sel')) return;
    toque = { x: e.clientX, y: e.clientY, t: setTimeout(() => {
      toque = null; engolirCliqueBib = true;
      selecionandoBib = true; selBib.add(row.dataset.id);
      try { if (navigator.vibrate) navigator.vibrate(12); } catch (er) {}
      atualizarSelecaoBib();
    }, 480) };
  });
  cont.addEventListener('pointermove', e => { if (toque && Math.hypot(e.clientX - toque.x, e.clientY - toque.y) > 10) { clearTimeout(toque.t); toque = null; } });
  ['pointerup', 'pointercancel'].forEach(ev => cont.addEventListener(ev, () => { if (toque) { clearTimeout(toque.t); toque = null; } }));
  // botão direito no PC abre o mesmo menu do ⋯; no celular o toque longo não abre o menu do sistema
  cont.addEventListener('contextmenu', e => {
    const row = e.target.closest('.bib-row'); if (!row) return;
    e.preventDefault();
    if (ultimoPonteiro !== 'mouse' || selecionandoBib) return;
    const i = porIdBib(row.dataset.id), b = row.querySelector('[data-mais]');
    if (i && b) { e.stopPropagation(); menuItemBib(i, b); }
  });
}
function menuItemBib(i, ancora) {
  const temTexto = !!textoBib(i).trim();
  menuFlutuante(ancora, [
    [IB.abrir, 'Abrir', () => verItemBiblioteca(i)],
    [ICO.conversas, 'Perguntar à Própons', () => perguntarSobreBib(i)],
    [ICO.baixar, 'Baixar', () => baixarItemBib(i)],
    temTexto ? [ICO.copiar, 'Copiar texto', () => copiarBib(i)] : null,
    [ICO.renomear, 'Renomear', () => renomearBib(i)],
    [IB.nota, i.nota ? 'Editar nota' : 'Nota', () => notaBib(i)],
    [ICO.apagar, 'Apagar', () => apagarBib([i]), true],
  ].filter(Boolean), i.nome);
}

/* ---------- seleção ---------- */
function alternarSelBib(id, marcado) {
  if (marcado === undefined) marcado = !selBib.has(id);
  if (marcado) selBib.add(id); else selBib.delete(id);
  if (marcado) selecionandoBib = true;
  else if (!selBib.size && !selPorBotaoBib) selecionandoBib = false;   // marcou pelo quadradinho e desmarcou tudo: sai
  atualizarSelecaoBib();
}
function sairSelecaoBib() { selBib.clear(); selecionandoBib = false; selPorBotaoBib = false; atualizarSelecaoBib(); }
function atualizarSelecaoBib() {
  const raiz = document.querySelector('.bib'); if (!raiz) return;
  for (const id of [...selBib]) if (!porIdBib(id)) selBib.delete(id);
  const l = raiz.querySelector('.bib-lista'); if (l) l.classList.toggle('selecionando', selecionandoBib);
  raiz.querySelectorAll('.bib-row').forEach(r => { const s = selBib.has(r.dataset.id); r.classList.toggle('sel', s); const c = r.querySelector('[data-sel]'); if (c) c.checked = s; });
  const bs = raiz.querySelector('[data-selecionar]'); if (bs) bs.hidden = selecionandoBib || !biblioteca.length;
  const lote = raiz.querySelector('.bib-lote');
  if (!selecionandoBib) { lote.hidden = true; lote.innerHTML = ''; return; }
  const n = selBib.size, visiveis = [...raiz.querySelectorAll('.bib-row')].map(r => r.dataset.id), todos = visiveis.length && visiveis.every(id => selBib.has(id));
  lote.innerHTML = `<button class="btn link" data-lote="cancelar" aria-label="Cancelar seleção" title="Cancelar">${ICO.fechar}<span class="rot">Cancelar</span></button>
    <b aria-live="polite">${n ? plural(n, 'selecionado', 'selecionados') : 'Nenhum selecionado'}</b>
    <button class="btn link" data-lote="tudo"${visiveis.length ? '' : ' disabled'}>${todos ? 'Nenhum' : 'Tudo'}</button>
    <button class="btn" data-lote="baixar"${n ? '' : ' disabled'} aria-label="Baixar selecionados" title="Baixar">${ICO.baixar}<span class="rot">Baixar</span></button>
    <button class="btn perigo" data-lote="apagar"${n ? '' : ' disabled'} aria-label="Apagar selecionados" title="Apagar">${ICO.apagar}<span class="rot">Apagar</span></button>`;
  lote.hidden = false;
}
function ligarLoteBib(raiz) {
  const lote = raiz.querySelector('.bib-lote');
  lote.onclick = async e => {
    const b = e.target.closest('[data-lote]'); if (!b || b.disabled) return;
    const a = b.dataset.lote, itens = biblioteca.filter(i => selBib.has(i.id));
    if (a === 'cancelar') return sairSelecaoBib();
    if (a === 'tudo') {
      const vis = [...raiz.querySelectorAll('.bib-row')].map(r => r.dataset.id);
      if (vis.every(id => selBib.has(id))) vis.forEach(id => selBib.delete(id)); else vis.forEach(id => selBib.add(id));
      return atualizarSelecaoBib();
    }
    if (a === 'apagar') { apagarBib(itens); return sairSelecaoBib(); }
    if (a === 'baixar') {
      let ok = 0;
      for (const i of itens) { const r = await baixarItemBib(i, true); if (r === false) break; ok++; }
      if (ok) toast(ok === 1 ? 'Arquivo salvo.' : ok + ' arquivos salvos.');
      sairSelecaoBib();
    }
  };
}
// Esc na seleção só cancela a seleção (não sai da tela)
document.addEventListener('keydown', e => {
  if (e.key !== 'Escape' || telaAtual !== 'biblioteca' || !selecionandoBib) return;
  if (document.querySelector('.dlg-fundo:not(.saindo), .painel-fundo:not(.saindo), .menu')) return;
  e.stopPropagation(); sairSelecaoBib();
}, true);

/* ---------- ações ---------- */
function apagarBib(lista) {
  lista = lista.filter(Boolean); if (!lista.length) return;
  const ids = new Set(lista.map(i => i.id));
  biblioteca = biblioteca.filter(i => !ids.has(i.id));
  ids.forEach(id => selBib.delete(id));
  tirarDoBancoBib([...ids]);
  aoMudarBib();
  document.querySelectorAll('.toast[data-bib]').forEach(t => t.remove());
  toastAcao(lista.length === 1 ? 'Apagado.' : plural(lista.length, 'item apagado.', 'itens apagados.'), 'Desfazer', () => {
    const ja = new Set(biblioteca.map(i => i.id));
    lista.forEach(i => { if (!ja.has(i.id)) { biblioteca.push(i); gravarBib(i); } });
    biblioteca.sort((a, b) => (b.quando || 0) - (a.quando || 0));
    aoMudarBib(); toast(lista.length === 1 ? 'Voltou para a biblioteca.' : 'Voltaram para a biblioteca.');
  }, 8000);
  const t = document.body.lastElementChild; if (t && t.classList.contains('acao-toast')) t.dataset.bib = '1';
}
function copiarBib(i) { const t = textoBib(i); if (!t.trim()) return; copiarTexto(t).then(() => toast(i.tipo === 'audio' ? 'Transcrição copiada.' : 'Texto copiado.')); }
// o nome novo guarda a extensão do original (a foto continua .jpg, o PDF continua .pdf)
function aplicarNomeBib(i, v) {
  v = String(v || '').replace(/\s+/g, ' ').trim().slice(0, 120);
  if (!v || v === i.nome) return false;
  const ext = (String(i.nome).match(/\.[a-z0-9]{1,5}$/i) || [''])[0];
  if (ext && !/\.[a-z0-9]{1,5}$/i.test(v)) v += ext;
  if (!i.nomeOriginal) i.nomeOriginal = i.nome;
  i.nome = v; mudouTextoBib(i); gravarBib(i); aoMudarBib();
  return true;
}
async function renomearBib(i) {
  const v = await perguntarTexto('Renomear', i.nome, { rotulo: 'Salvar', max: 120 });
  if (v != null && aplicarNomeBib(i, v)) toast('Renomeado.');
}
function aplicarNotaBib(i, v) {
  v = String(v || '').trim().slice(0, 500);
  if (v === (i.nota || '')) return false;
  if (v) i.nota = v; else delete i.nota;
  mudouTextoBib(i); gravarBib(i); aoMudarBib();
  return true;
}
async function notaBib(i) {
  const v = await perguntarTexto(i.nota ? 'Editar nota' : 'Nota', i.nota || '', { rotulo: 'Salvar', max: 500, multilinha: true, placeholder: 'Ex.: capítulo 3, cai na prova de sexta' });
  if (v != null && aplicarNotaBib(i, v)) toast(v.trim() ? 'Nota salva.' : 'Nota apagada.');
}
// "Perguntar à Própons": volta para a conversa já com o anexo (ou com o texto do áudio na caixa)
function perguntarSobreBib(i, depois) {
  if (i.tipo === 'imagem' && !PLATAFORMA.temVisao) { toast('Neste aparelho a IA ainda não lê fotos.', 3500); return false; }
  if (i.tipo === 'audio') porTranscricao(i.texto || '');
  else if (anexos.some(x => x.nome === i.nome)) { toast('Já está na mensagem.'); return false; }
  else if (i.tipo === 'imagem' && anexos.filter(x => x.tipo === 'imagem').length >= MAX_FOTOS) { toast(`Até ${MAX_FOTOS} fotos por mensagem.`); return false; }
  else if (i.tipo !== 'imagem' && anexos.filter(x => x.tipo !== 'imagem').length >= MAX_ANEXOS) { toast(`Até ${MAX_ANEXOS} arquivos por mensagem.`); return false; }
  else if (i.tipo === 'imagem') anexos.push({ tipo: 'imagem', nome: i.nome, tam: i.tam, dataUrl: i.dataUrl || i.miniatura, miniatura: i.miniatura || i.dataUrl });
  else anexos.push(Object.assign({ nome: i.nome, tam: i.tam, lang: i.lang, conteudo: i.conteudo }, i.paginas ? { paginas: i.paginas } : {}));
  if (depois) depois();
  sairSelecaoBib(); fecharTela(); desenharChips(); ajustar(); $('#entrada').focus();
  toast(i.tipo === 'audio' ? 'Transcrição na caixa de mensagem.' : 'Anexado. Escreva sua pergunta.');
  return true;
}
// de qual conversa veio: a mensagem que levou o anexo; senão, a conversa aberta quando ele chegou
function conversaDoItem(i) {
  try {
    const nome = i.nomeOriginal || i.nome;
    const achada = i.tipo === 'audio' ? null : conversas.find(c => (c.msgs || []).some(m => m.role === 'user'
      && (((m.imagens || []).some(x => x.nome === nome)) || ((m.anexos || []).some(a => a.nome === nome)))));
    return achada || (i.conversa && conversas.find(c => c.id === i.conversa)) || null;
  } catch (e) { return null; }
}
// fotos antigas não guardam largura/altura: mede uma vez (na imagem grande) e guarda
function medirFotoBib(i) {
  return new Promise(ok => {
    if (i.tipo !== 'imagem' || i.w || !(i.dataUrl || i.miniatura)) return ok(false);
    const im = new Image();
    im.onload = im.onerror = () => { if (im.naturalWidth) { i.w = im.naturalWidth; i.h = im.naturalHeight; gravarBib(i); ok(true); } else { i.w = -1; ok(false); } };
    im.src = i.dataUrl || i.miniatura;
  });
}

/* ---------- baixar ---------- */
const bytesDeDataUrl = u => { const b = atob(String(u).split(',')[1] || ''); const a = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) a[i] = b.charCodeAt(i); return a; };
const mimeDeDataUrl = u => (String(u).match(/^data:([^;,]+)/) || [, 'application/octet-stream'])[1];
const extDeMime = m => /wav/.test(m) ? 'wav' : /webm/.test(m) ? 'webm' : /ogg/.test(m) ? 'ogg' : /mp4|m4a|aac/.test(m) ? 'm4a' : /mpeg|mp3/.test(m) ? 'mp3' : 'audio';
const extDeImagem = m => ({ 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif', 'image/avif': 'avif', 'image/bmp': 'bmp' }[m] || 'jpg');
// baixar de novo o que está na biblioteca (foto e áudio como arquivo original; documento como texto extraído).
// devolve false se a pessoa cancelou ou deu erro; quieto = sem aviso (o lote avisa uma vez só)
async function baixarItemBib(i, quieto) {
  if (!i) return false;
  try {
    let r;
    if (i.tipo === 'imagem' && (i.dataUrl || i.miniatura)) {
      const u = i.dataUrl || i.miniatura, m = mimeDeDataUrl(u);
      r = await PLATAFORMA.salvarArquivo(/\.[a-z0-9]{2,5}$/i.test(i.nome) ? i.nome : i.nome + '.' + extDeImagem(m), bytesDeDataUrl(u), m);
    } else if (i.tipo === 'audio' && i.audio) {
      const m = i.audio.type || 'audio/wav';
      r = await PLATAFORMA.salvarArquivo(nomeArquivo(i.nome) + '.' + extDeMime(m), new Uint8Array(await i.audio.arrayBuffer()), m);
    } else if (i.tipo === 'audio') {
      r = await PLATAFORMA.salvarArquivo(nomeArquivo(i.nome) + '.txt', i.texto || '', 'text/plain');
    } else {
      const soTexto = /\.(pdf|docx?)$/i.test(i.nome);
      r = await PLATAFORMA.salvarArquivo(soTexto ? nomeArquivo(i.nome.replace(/\.[^.]+$/, '')) + '.txt' : i.nome, i.conteudo || '', 'text/plain');
    }
    if (r !== false && !quieto) toast(i.tipo === 'audio' && !i.audio ? 'Transcrição salva.' : 'Arquivo salvo.');
    return r !== false;
  } catch (e) { toast('Não deu para salvar: ' + e.message, 4000); return false; }
}

/* ---------- folha do item ---------- */
function fichaBib(i) {
  const tx = textoBib(i), palavras = tx ? tx.split(/\s+/).filter(Boolean).length : 0;
  return [['Tipo', tipoBib(i)], ['Tamanho', i.tam ? tamanhoBonito(i.tam) : '—'],
    i.tipo === 'audio' ? ['Duração', i.segundos ? duracaoBonita(i.segundos) : 'não medida'] : null,
    i.tipo === 'imagem' && i.w > 0 ? ['Medidas', i.w + ' × ' + i.h + ' px'] : null,
    i.paginas ? ['Páginas', String(i.paginas)] : null,
    i.tipo !== 'imagem' && palavras ? ['Palavras', palavras.toLocaleString('pt-BR')] : null,
    ['Recebido', new Date(i.quando || 0).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).replace(',', '')]]
    .filter(Boolean).map(([k, v]) => `<div><dt>${k}</dt><dd title="${esc(v)}">${esc(v)}</dd></div>`).join('');
}
// prévia grande, nome e nota editáveis, ficha, de qual conversa veio e as ações
function verItemBiblioteca(i) {
  if (!i) return;
  const tx = textoBib(i);
  let url = '', previa;
  if (i.tipo === 'imagem') previa = `<button class="bib-foto-g" data-cheia-bib title="Ver em tela cheia"><img src="${esc(i.dataUrl || i.miniatura)}" alt="${esc(i.nome)}"></button>`;
  else if (i.tipo === 'audio') {
    try { if (i.audio) url = URL.createObjectURL(i.audio); } catch (e) { url = ''; }
    previa = (url ? `<audio controls preload="metadata" src="${url}"></audio>` : '<p class="bib-aviso">O áudio original não ficou guardado; a transcrição está abaixo.</p>')
      + `<pre>${esc(tx.slice(0, 20000))}</pre>`;
  } else previa = `<pre>${esc(tx.slice(0, 20000))}</pre>${tx.length > 20000 ? '<p class="bib-aviso">Mostrando o começo. Baixe para ver tudo.</p>' : ''}`;
  const conv = conversaDoItem(i);
  const f = document.createElement('div'); f.className = 'dlg-fundo';
  f.innerHTML = `<div class="dlg folha bib-item bib-det bib-janela" role="dialog" aria-label="${esc(i.nome)}">${topoCentro(i.nome)}
    <div class="bib-previa${i.tipo === 'audio' ? ' audio prosa' : i.lang === 'texto' || /\.(pdf|docx?|txt|md)$/i.test(i.nomeOriginal || i.nome) ? ' prosa' : ''}">${previa}</div>
    <div class="bib-acoes">
      <button class="btn primario" data-a="perguntar">${ICO.conversas}Perguntar à Própons</button>
      <button class="btn" data-a="baixar">${ICO.baixar}Baixar</button>
      ${tx.trim() ? `<button class="btn" data-a="copiar">${ICO.copiar}Copiar</button>` : ''}
      <button class="btn perigo" data-a="apagar">${ICO.apagar}Apagar</button></div>
    <label class="bib-campo"><span>Nome</span><input class="campo-texto" data-nome maxlength="120" autocomplete="off"></label>
    <label class="bib-campo"><span>Nota</span><textarea class="campo-texto" data-nota rows="2" maxlength="500" placeholder="Uma lembrança sua sobre isto (só você vê)"></textarea></label>
    <dl class="bib-ficha">${fichaBib(i)}</dl>
    ${conv ? `<button class="bib-conv" data-conv>${ICO.conversas}<span><small>Veio da conversa</small><b>${esc(conv.titulo || 'Conversa')}</b></span>${ICO.seta}</button>` : ''}</div>`;
  const dlg = f.firstChild, nome = dlg.querySelector('[data-nome]'), nota = dlg.querySelector('[data-nota]');
  nome.value = i.nome; nota.value = i.nota || '';
  let esperaNota = 0;
  const salvarNota = () => { clearTimeout(esperaNota); aplicarNotaBib(i, nota.value); };
  const sair = depois => { salvarNota(); animarSaida(f, dlg, () => { if (url) URL.revokeObjectURL(url); if (depois) depois(); }); };
  f.fechar = () => sair(); f.onclick = e => { if (e.target === f) sair(); };
  dlg.querySelector('[data-x]').onclick = () => sair();
  folhaArrastavel(f, dlg, () => sair());
  nome.onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); nome.blur(); } };
  nome.onchange = () => { if (aplicarNomeBib(i, nome.value)) { dlg.querySelector('.dlg-topo h3').textContent = i.nome; toast('Renomeado.'); } nome.value = i.nome; };
  nota.oninput = () => { clearTimeout(esperaNota); esperaNota = setTimeout(salvarNota, 600); };
  nota.onchange = salvarNota;
  const cheia = dlg.querySelector('[data-cheia-bib]'); if (cheia) cheia.onclick = () => fotoEmTelaCheia(i.dataUrl || i.miniatura, i.nome);
  const bc = dlg.querySelector('[data-conv]'); if (bc) bc.onclick = () => sair(() => abrir(conv.id));
  if (i.tipo === 'imagem' && !i.w) medirFotoBib(i).then(m => { if (m && dlg.isConnected) dlg.querySelector('.bib-ficha').innerHTML = fichaBib(i); });
  dlg.querySelectorAll('[data-a]').forEach(b => b.onclick = () => {
    const a = b.dataset.a;
    if (a === 'baixar') return baixarItemBib(i);
    if (a === 'copiar') return copiarBib(i);
    if (a === 'apagar') return sair(() => apagarBib([i]));
    perguntarSobreBib(i, () => sair());
  });
  pausarDesenho(); document.body.appendChild(f);
}
