/* ---------------- histórico: carregar / salvar ---------------- */
function validar(lista) {
  if (!Array.isArray(lista)) throw new Error('formato inválido');
  // limites: 200 mil caracteres por texto, 2 mil mensagens por conversa, 3 mil conversas, ids únicos
  const txt = v => typeof v === 'string' ? v.slice(0, 200000) : '';
  const ids = new Set();
  return lista.filter(c => c && typeof c === 'object' && Array.isArray(c.msgs)).slice(0, 3000).map(c => ({
    id: (() => { const id = /^[a-z0-9]{4,40}$/i.test(c.id) && !ids.has(c.id) ? c.id : novoId(); ids.add(id); return id; })(),
    titulo: txt(c.titulo).slice(0, 120) || 'Conversa',
    criada: +c.criada || Date.now(), atualizada: +c.atualizada || +c.criada || Date.now(),
    ...(c.fixada ? { fixada: true } : {}), ...(c.aberta ? { aberta: true } : {}), ...(c.tutor ? { tutor: true } : {}),
    // o que a conversa usou por último (modelo e esforço): ao voltar nela, a IA continua do mesmo jeito
    ...(/^[a-z]{2,20}$/.test(c.modelo) ? { modelo: c.modelo } : {}), ...(ESFORCO[c.esforco] ? { esforco: c.esforco } : {}),
    ...(txt(c.resumo).trim() ? { resumo: txt(c.resumo).slice(0, 3000) } : {}), ...(c.ctxUso && typeof c.ctxUso === 'object' ? { ctxUso: Object.fromEntries(['total', 'sistema', 'pesquisa', 'historico', 'anexos', 'omitidas', 'resposta'].map(k => [k, Math.max(0, Math.round(+c.ctxUso[k] || 0))])) } : {}), ...(txt(c.pasta).trim() ? { pasta: txt(c.pasta).trim().slice(0, 40) } : {}),
    msgs: c.msgs.filter(m => m && (m.role === 'user' || m.role === 'assistant')).slice(-2000).map(m => ({
      role: m.role, texto: txt(m.texto), llm: txt(m.llm) || txt(m.texto),
      ...(m.interno ? { interno: true } : {}), ...(m.compactada ? { compactada: true } : {}), ...(m.cortada ? { cortada: true } : {}), ...(m.interrompida ? { interrompida: true } : {}), ...(m.pendente ? { pendente: true } : {}),
      ...(m.erro ? { erro: txt(m.erro) } : {}), ...(m.pensou ? { pensou: txt(m.pensou).slice(0, 6000) } : {}), ...(+m.tempo > 0 ? { tempo: Math.round(+m.tempo) } : {}),
      ...(Array.isArray(m.anexos) ? { anexos: m.anexos.filter(a => a && typeof a.nome === 'string').map(a => ({ nome: a.nome.slice(0, 200), tam: +a.tam || 0, lang: txt(a.lang), conteudo: txt(a.conteudo), ...(+a.paginas ? { paginas: +a.paginas } : {}), ...(Array.isArray(a.resumos) ? { resumos: a.resumos.filter(r => r && typeof r.texto === 'string').slice(0, 40).map(r => ({ de: +r.de || 0, ate: +r.ate || 0, texto: txt(r.texto).slice(0, 4000) })) } : {}) })) } : {}),
      ...(m.lugar && normalizarPainelLugar(m.lugar) ? { lugar: normalizarPainelLugar(m.lugar) } : {}),
      ...(Array.isArray(m.sugestoes) ? { sugestoes: m.sugestoes.filter(x => typeof x === 'string').slice(0, 3).map(x => x.slice(0, 90)) } : {}),
      ...(Array.isArray(m.conhecimentos) ? { conhecimentos: m.conhecimentos.filter(x => typeof x === 'string').slice(0, 3).map(x => x.slice(0, 60)) } : {}),
      ...(Array.isArray(m.fontes) ? { fontes: m.fontes.filter(f => f && /^https?:/.test(f.url)).slice(0, 15).map(f => ({ titulo: txt(f.titulo).slice(0, 120), url: txt(f.url).slice(0, 400) })) } : {}),
      ...(Array.isArray(m.imagens) ? { imagens: m.imagens.filter(x => x && /^data:image\/(jpeg|png|webp);base64,/.test(x.miniatura) && x.miniatura.length < 80000).slice(0, MAX_FOTOS).map(x => ({ nome: txt(x.nome).slice(0, 120), miniatura: x.miniatura })) } : {}),
      ...(m.passos && Array.isArray(m.passos.lista) ? { passos: { titulo: txt(m.passos.titulo), lista: m.passos.lista.map(txt) } } : {}),
      // modos de estudo: o modo da pergunta e o resultado estruturado da resposta (conferidos como se viessem do modelo)
      ...(MODOS[m.modo] ? { modo: m.modo } : {}),
      ...(m.cartoes && normalizarModo('flashcards', { cartoes: m.cartoes }) ? { cartoes: normalizarModo('flashcards', { cartoes: m.cartoes }) } : {}),
      ...(m.quiz && normalizarModo('quiz', m.quiz) ? { quiz: normalizarModo('quiz', m.quiz) } : {}),
      ...(m.redacao && normalizarModo('redacao', m.redacao) ? { redacao: normalizarModo('redacao', m.redacao) } : {}),
    })),
  }));
}
let tSalvar = null, conversasCarregadas = false;
function salvar(agora) {
  if (salvarBloqueado) return;
  clearTimeout(tSalvar);
  // as preferências vão como um item a mais no fim (sem "msgs": versões antigas e a validação o ignoram)
  const f = () => PLATAFORMA.salvar(JSON.stringify(conversasCarregadas ? [...conversas, { __prefs: prefsCompartilhadas() }] : conversas)).catch(e => toast('As conversas não foram salvas (' + e.message + '). Veja se o disco tem espaço; a próxima mensagem tenta salvar de novo.', 6000));
  if (agora) f(); else tSalvar = setTimeout(f, 250);
}
async function carregarHistorico() {
  let bruto = '[]';
  try { bruto = await PLATAFORMA.carregar(); } catch (e) { toast('Não consegui ler as conversas salvas. Elas continuam no aparelho: feche e abra a Própons IA; se persistir, use Ajustes → Conversas → Importar backup.', 7000); }
  try {
    const lido = JSON.parse(bruto || '[]');
    const p = Array.isArray(lido) && lido.find(x => x && x.__prefs);
    if (p) { aplicarPrefsDoArquivo(p.__prefs); aplicarTema(); aplicarFonte(); }
    conversas = validar(lido);
  }
  catch (e) {
    conversas = []; salvarBloqueado = true;
    mostrarFaixa('O arquivo de conversas está danificado. Para não perder nada, as conversas novas não serão salvas até você decidir.', 'Começar do zero', () => { salvarBloqueado = false; salvar(true); });
  }
  conversas.sort((a, b) => b.atualizada - a.atualizada);
  conversasCarregadas = true;
  desenharLista();
}

/* ---------------- lista lateral ---------------- */
function grupoData(ts) {
  const d = new Date(ts), hoje = new Date(); hoje.setHours(0, 0, 0, 0);
  const dias = Math.floor((hoje - new Date(d.getFullYear(), d.getMonth(), d.getDate())) / 86400000);
  return dias <= 0 ? 'Hoje' : dias === 1 ? 'Ontem' : dias < 7 ? 'Últimos 7 dias' : dias < 30 ? 'Últimos 30 dias' : 'Mais antigas';
}
function desenharLista() {
  const l = $('#lista'), q = $('#busca').value.trim().toLowerCase();
  const lista = !q ? conversas : conversas.filter(c => c.titulo.toLowerCase().includes(q) || c.msgs.some(m => m.texto.toLowerCase().includes(q)));
  if (!lista.length) { l.innerHTML = `<div class="vazio">${q ? 'Nada encontrado.' : 'Nenhuma conversa ainda.'}</div>`; return; }
  // ordem: fixadas, depois as pastas (em ordem alfabética), depois as outras por data
  const fixadas = lista.filter(c => c.fixada), emPasta = lista.filter(c => !c.fixada && c.pasta).sort((a, b) => a.pasta.localeCompare(b.pasta, 'pt') || b.atualizada - a.atualizada), soltas = lista.filter(c => !c.fixada && !c.pasta);
  let g = '', html = '';
  for (const c of [...fixadas, ...emPasta, ...soltas]) {
    const gr = c.fixada ? 'Fixadas' : c.pasta ? '📁 ' + c.pasta : grupoData(c.atualizada);
    if (gr !== g) { g = gr; html += `<div class="grupo">${esc(gr)}</div>`; }
    html += `<div class="item${atual && c.id === atual.id ? ' atual' : ''}" data-id="${esc(c.id)}" role="button" tabindex="0" title="${esc(c.titulo)}"><span>${esc(c.titulo)}</span><button class="mais" data-menu="${esc(c.id)}" aria-label="Opções da conversa">${ICO.mais}</button></div>`;
  }
  l.innerHTML = html;
  l.querySelectorAll('.item').forEach(it => {
    it.onclick = e => {
      if (e.target.closest('input')) return;
      const b = e.target.closest('[data-menu]');
      if (b) { e.stopPropagation(); menuConversa(b, b.dataset.menu); return; }
      abrir(it.dataset.id); if (estreita()) fecharLateral();
    };
    it.onkeydown = e => { if (e.key === 'Enter' && e.target === it) it.click(); };
    pressionarLongo(it, () => menuConversa(it.querySelector('[data-menu]'), it.dataset.id));
  });
}
// toque longo (celular): abre o menu; um toque normal continua abrindo a conversa
function pressionarLongo(el, fn) {
  let t = null, x = 0, y = 0;
  el.addEventListener('touchstart', e => { const p = e.touches[0]; x = p.clientX; y = p.clientY; t = setTimeout(() => { t = 'feito'; if (navigator.vibrate) try { navigator.vibrate(12); } catch (er) {} fn(); }, 480); }, { passive: true });
  el.addEventListener('touchmove', e => { const p = e.touches[0]; if (t && t !== 'feito' && Math.hypot(p.clientX - x, p.clientY - y) > 10) { clearTimeout(t); t = null; } }, { passive: true });
  el.addEventListener('touchend', e => { if (t === 'feito') e.preventDefault(); else clearTimeout(t); t = null; });
  el.addEventListener('contextmenu', e => { if (estreita()) e.preventDefault(); });
}
$('#busca').addEventListener('input', desenharLista);

function fecharMenus() { document.querySelectorAll('.menu').forEach(m => m.remove()); document.querySelectorAll('[aria-expanded="true"]:not(.pensa-seta)').forEach(x => x.setAttribute('aria-expanded', 'false')); }   /* a flechinha do raciocínio não é menu */
function menuFlutuante(ancora, itens, titulo) {
  fecharMenus();
  if (estreita()) {   // celular: folha que sobe de baixo, com botões grandes (arrastar para baixo ou X fecha)
    const f = document.createElement('div'); f.className = 'dlg-fundo';
    f.innerHTML = `<div class="dlg folha">${topoCentro(titulo)}</div>`;
    const folha = f.firstChild, sair = depois => animarSaida(f, folha, depois);
    itens.forEach(([ico, rot, fn, perigo]) => { const b = document.createElement('button'); b.className = 'op' + (perigo ? ' perigo' : ''); b.innerHTML = ico + `<span>${rot}</span>`; b.onclick = () => { sair(); fn(); }; folha.appendChild(b); });
    f.onclick = e => { if (e.target === f) sair(); };
    folha.querySelector('[data-x]').onclick = () => sair();
    folhaArrastavel(f, folha, () => sair());
    pausarDesenho();
    document.body.appendChild(f); return;
  }
  const m = document.createElement('div'); m.className = 'menu';
  itens.forEach(([ico, rot, f, perigo]) => { const b = document.createElement('button'); if (perigo) b.className = 'perigo'; b.innerHTML = ico + `<span>${rot}</span>`; b.onclick = e => { e.stopPropagation(); fecharMenus(); f(); }; m.appendChild(b); });
  document.body.appendChild(m);
  const r = ancora.getBoundingClientRect(), w = m.offsetWidth, h = m.offsetHeight;
  m.style.left = Math.max(8, Math.min(r.right - w, innerWidth - w - 8)) + 'px';
  // abre para o lado com mais espaço e nunca cobre o botão: se não couber, rola por dentro
  const abaixo = innerHeight - r.bottom - 12, acima = r.top - 12;
  if (h <= abaixo || abaixo >= acima) { m.style.top = (r.bottom + 4) + 'px'; m.style.maxHeight = abaixo + 'px'; }
  else { m.style.top = Math.max(8, r.top - Math.min(h, acima) - 4) + 'px'; m.style.maxHeight = acima + 'px'; }
  ancora.setAttribute('aria-expanded', 'true');
}
document.addEventListener('click', e => { if (!e.target.closest('.menu')) fecharMenus(); });
// o menu solto não fica boiando longe do botão: fecha se a janela muda ou a lista de conversas rola
addEventListener('resize', () => { if (document.querySelector('.menu')) fecharMenus(); });
document.addEventListener('scroll', e => { if (e.target instanceof Element && e.target.closest('#lateral') && document.querySelector('.menu')) fecharMenus(); }, true);
function menuConversa(botao, id, doTopo) {
  const c = conversas.find(x => x.id === id); if (!c) return;
  menuFlutuante(botao, [
    ...(doTopo ? [[ICO.editar, 'Nova conversa', nova], [ICO.esforco, 'Contexto da conversa', () => abrirFolhaContexto($('#menuTopo'))]] : []),
    [ICO.renomear, 'Renomear', () => renomear(id)],
    [ICO.fixar, c.fixada ? 'Desafixar' : 'Fixar no topo', () => { c.fixada = !c.fixada; salvar(); desenharLista(); }],
    [ICO.pasta, c.pasta ? `Pasta: ${esc(c.pasta)}` : 'Mover para pasta…', async () => {
      const outras = [...new Set(conversas.map(x => x.pasta).filter(Boolean))].filter(p => p !== c.pasta);
      const nome = await perguntarTexto('Pasta da conversa', c.pasta || '', { max: 40, dica: outras.length ? 'Pastas que já existem: ' + outras.slice(0, 8).join(', ') : '' });
      if (nome === null) return;
      c.pasta = nome.trim().slice(0, 40); if (!c.pasta) delete c.pasta; salvar(); desenharLista();
    }],
    ...(PLATAFORMA.podeCompartilhar ? [[ICO.compartilhar, 'Compartilhar', () => PLATAFORMA.compartilhar(conversaEmMarkdown(c)).catch(() => {})]] : []),
    [ICO.exportar, 'Exportar (.md)', () => exportarConversa(c)],
    [ICO.apagar, 'Apagar', async () => { if (await confirmar('Apagar conversa?', `"${esc(c.titulo)}" será apagada deste aparelho.`, 'Apagar', true)) apagar(id); }, true],
  ], c.titulo);
}
async function renomear(id) {
  const c = conversas.find(x => x.id === id); const it = $(`#lista .item[data-id="${CSS.escape(id)}"]`); if (!c || !it) return;
  if (estreita()) {   // celular: campo num diálogo (o teclado não cobre)
    const nome = await perguntarTexto('Renomear conversa', c.titulo);
    if (nome) { c.titulo = nome; salvar(); if (atual === c) $('#tituloAtual').textContent = c.titulo; desenharLista(); }
    return;
  }
  const inp = document.createElement('input'); inp.value = c.titulo; inp.maxLength = 120;
  it.querySelector('span').replaceWith(inp); inp.focus(); inp.select();
  const fim = ok => { if (ok && inp.value.trim()) { c.titulo = inp.value.trim(); salvar(); if (atual === c) $('#tituloAtual').textContent = c.titulo; } desenharLista(); };
  inp.onkeydown = e => { if (e.key === 'Enter') fim(true); if (e.key === 'Escape') fim(false); e.stopPropagation(); };
  inp.onblur = () => fim(true);
}
function conversaEmMarkdown(c) {
  const linhas = [`# ${c.titulo}`, '', `_Exportado da Própons IA em ${new Date().toLocaleString('pt-BR')}_`, ''];
  for (const m of c.msgs) {
    if (m.interno) continue;
    linhas.push(m.role === 'user' ? '## Você' : '## Própons IA', '');
    if (m.anexos) m.anexos.forEach(a => linhas.push(`📎 **${a.nome}**`, '', '```' + (a.lang || ''), a.conteudo, '```', ''));
    linhas.push(m.texto, '');
  }
  return linhas.join('\n');
}
function nomeArquivo(t) { return (t.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '-').slice(0, 50) || 'conversa'); }
function exportarConversa(c) { PLATAFORMA.salvarArquivo(nomeArquivo(c.titulo) + '.md', conversaEmMarkdown(c), 'text/markdown').then(r => r !== false && toast('Conversa exportada.')).catch(e => toast('Não deu para exportar: ' + e.message)); }
function apagar(id) {
  if (geracao && geracao.conv.id === id) geracao.ctrl.abort();
  const idx = conversas.findIndex(c => c.id === id), apagada = conversas[idx];
  conversas = conversas.filter(c => c.id !== id);
  if (atual && atual.id === id) nova(); else desenharLista();
  salvar(true);
  if (apagada) toastAcao('Conversa apagada.', 'Desfazer', () => { conversas.splice(Math.min(idx, conversas.length), 0, apagada); salvar(true); desenharLista(); abrir(apagada.id); });
}

/* ---------------- conversa na tela ---------------- */
// tela inicial: só a saudação da hora (o campo para digitar fica logo abaixo)
function saudacao(h = new Date().getHours()) { return h < 5 ? 'Boa madrugada' : h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite'; }
const FRASES = ['qual a pauta de hoje?', 'em que posso ajudar?', 'o que vamos estudar hoje?', 'por onde começamos?', 'qual a dúvida de hoje?',
  'bora estudar?', 'o que vamos aprender agora?', 'qual matéria hoje?', 'pronto para começar?', 'me conta: o que você precisa?'];
const FRASES_MADRUGADA = ['estudando até tarde?', 'ainda acordado? Em que posso ajudar?', 'qual a pauta de hoje?', 'bora terminar essa matéria?'];
let fraseDaTela = '';
function boasVindas() {
  const lista = new Date().getHours() < 5 ? FRASES_MADRUGADA : FRASES;
  fraseDaTela = lista[Math.floor(Math.random() * lista.length)];
  return `<div id="boasvindas">${htmlSequencia()}<h1><span class="sd">${saudacao()},</span> <span class="fr">${esc(fraseDaTela)}</span></h1>${htmlSugestoesInicio()}</div>`;
}
// se a hora virar com a tela inicial aberta, a saudação acompanha
setInterval(() => { const h = document.querySelector('#boasvindas .sd'); if (h && h.textContent !== saudacao() + ',') h.textContent = saudacao() + ','; }, 60000);
function nova() {
  fecharTela();
  if (atual) atual.rascunho = '';   // o que estava na caixa vai junto para a conversa nova
  atual = null; cancelarEdicao(); marcarAberta(null);
  $('#tituloAtual').textContent = 'Própons IA';
  $('#conversa').innerHTML = boasVindas(); ligarSugestoesInicio($('#conversa')); desenharChips();
  desenharLista(); atualizarMedidor(); if (!estreita()) $('#entrada').focus();
}
function abrir(id) {
  const c = conversas.find(x => x.id === id); if (!c) return nova();
  fecharTela();
  if (atual && atual !== c) { atual.msgs.forEach(m => { if (m._envio) m._envio = null; }); atual.rascunho = $('#entrada').value; }   // fotos cheias só da conversa aberta; o rascunho fica guardado
  const trocou = atual !== c;
  atual = c; cancelarEdicao(); marcarAberta(c); desenharChips();
  $('#tituloAtual').textContent = c.titulo;
  // as mensagens são montadas fora da página (uma coluna solta) e entram de uma vez: um reflow só, não um por mensagem
  $('#conversa').innerHTML = ''; const col = document.createElement('div'); col.className = 'col'; colDestacada = col;
  const iu = ultimoIndice(c, 'user');
  try {
    c.msgs.forEach((m, i) => {
      if (m.role === 'user') addEu(m, i === iu);
      else addIa(m, i === c.msgs.length - 1);
    });
  } finally { colDestacada = null; }
  if (geracao && geracao.conv === c && geracao.el) col.appendChild(geracao.el.parentNode);
  if (typeof redesenharFila === 'function') filaEnvio.filter(x => x.conv === c).forEach(x => col.appendChild(x.el));   // a fila desta conversa
  $('#conversa').appendChild(col); atualizarMedidor();
  if (trocou) { $('#entrada').value = c.rascunho || ''; ajustar(); }
  rolar(true); desenharLista();
  if (trocou) sugerirModeloDaConversa(c);
}
// a conversa aberta fica marcada no próprio arquivo de conversas (que a página fria e a ligada leem igual): ao sair e
// voltar ao app, ou quando a IA liga e a página recarrega, ela reabre no mesmo lugar em vez de uma conversa nova
function marcarAberta(c) {
  let mudou = false;
  conversas.forEach(x => { if (x.aberta && x !== c) { delete x.aberta; mudou = true; } });
  if (c && !c.aberta) { c.aberta = true; mudou = true; }
  if (mudou) salvar();
}
function ultimoIndice(c, role) { for (let i = c.msgs.length - 1; i >= 0; i--) if (c.msgs[i].role === role) return i; return -1; }
let colDestacada = null;   // coluna ainda fora da página, enquanto abrir() monta uma conversa
function coluna() {
  if (colDestacada) return colDestacada;
  let col = $('#conversa .col');
  if (!col) { $('#conversa').innerHTML = ''; col = document.createElement('div'); col.className = 'col'; $('#conversa').appendChild(col); }
  return col;
}
/* a conversa acompanha a resposta descendo sozinha, mas o dedo (ou a roda do mouse) manda: rolou para cima, ela para de
   acompanhar na hora e não puxa de volta; voltou até o fim (ou tocou em ↓), volta a acompanhar. A rolagem que o próprio
   app faz não conta como gesto (antes ela se confundia com o dedo e brigava, cortando até o embalo do arrasto). */
let grudado = true, rolagemDoApp = false, dedoNaTela = false, soltouEm = 0;
const distFim = () => { const c = $('#conversa'); return c.scrollHeight - c.scrollTop - c.clientHeight; };
const mostrarDescer = () => { $('#descer').hidden = grudado || distFim() < 400; };
$('#conversa').addEventListener('scroll', () => {
  if (rolagemDoApp) { rolagemDoApp = false; return; }
  const d = distFim();
  if (d < 24) grudado = true; else if (!grudado || dedoNaTela || Date.now() - soltouEm < 900) grudado = d < 24;
  mostrarDescer();
}, { passive: true });
// gesto para cima (roda, teclas ou dedo descendo a tela) solta na hora, mesmo antes do primeiro evento de rolagem
$('#conversa').addEventListener('wheel', e => { if (e.deltaY < 0) { grudado = false; mostrarDescer(); } }, { passive: true });
$('#conversa').addEventListener('keydown', e => { if (/^(ArrowUp|PageUp|Home)$/.test(e.key)) grudado = false; });
let dedoY = 0;
$('#conversa').addEventListener('touchstart', e => { dedoNaTela = true; dedoY = e.touches[0].clientY; }, { passive: true });
$('#conversa').addEventListener('touchmove', e => { if (e.touches[0].clientY - dedoY > 6) { grudado = false; mostrarDescer(); } }, { passive: true });
const soltarDedo = () => { dedoNaTela = false; soltouEm = Date.now(); };
$('#conversa').addEventListener('touchend', soltarDedo, { passive: true }); $('#conversa').addEventListener('touchcancel', soltarDedo, { passive: true });
function rolar(forcar) {
  const c = $('#conversa');
  if (forcar) grudado = true;
  // com o dedo na tela ou logo depois de soltar (embalo), não mexe: quem manda é o gesto
  if (!grudado || (!forcar && (dedoNaTela || Date.now() - soltouEm < 400))) return;
  if (distFim() > 1) { rolagemDoApp = true; c.scrollTop = c.scrollHeight; }
  $('#descer').hidden = true;
}
$('#descer').onclick = () => { const c = $('#conversa'); grudado = true; rolagemDoApp = true; c.scrollTo({ top: c.scrollHeight, behavior: 'smooth' }); $('#descer').hidden = true; };
function chipHTML(a, remover) {
  const comum = `class="chip${a.tipo === 'imagem' ? ' foto' : ''} ver" title="Ver ${esc(a.nome)}" data-ver="${esc(a.nome)}" role="button" tabindex="0"`;
  const x = remover ? `<button data-rm="${esc(a.nome)}" aria-label="Remover ${a.tipo === 'imagem' ? 'foto' : 'anexo'}">${ICO.fechar}</button>` : '';
  if (a.tipo === 'imagem') return `<div ${comum}><img src="${esc(a.miniatura)}" alt=""><b>${esc(a.nome)}</b>${x}</div>`;
  return `<div ${comum}>${ICO.arquivo}<b>${esc(a.nome)}</b><small>${tamanhoBonito(a.tam)}</small>${x}</div>`;
}
/* clicar num anexo (na caixa ou já enviado) abre ele: foto grande, arquivo com o texto, e dá para baixar */
function ligarVerAnexos(el, lista, podeRemover) {
  el.querySelectorAll('[data-ver]').forEach(c => {
    const abrir = e => { if (e.target.closest('[data-rm]')) return; const a = (lista || []).find(x => x.nome === c.dataset.ver); if (a) verAnexo(a, podeRemover); };
    c.onclick = abrir;
    c.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); abrir(e); } };
  });
  el.querySelectorAll('.fotos-msg img[data-ver]').forEach(im => im.onclick = () => {
    const a = (lista || []).find(x => x.nome === im.dataset.ver); if (a) verAnexo(a, false);
  });
}
function verAnexo(a, podeRemover) {
  // a foto guardada na conversa é a miniatura; se ainda estiver na biblioteca desta sessão, usa a grande
  const daBiblioteca = biblioteca.find(i => i.tipo === 'imagem' && i.nome === a.nome && (!a.tam || !i.tam || i.tam === a.tam) && (!a.miniatura || !i.miniatura || i.miniatura === a.miniatura)) || {};
  const cheio = a.dataUrl || daBiblioteca.dataUrl || a.miniatura || '';
  const eFoto = a.tipo === 'imagem' || (!a.conteudo && !!cheio);
  const texto = String(a.conteudo || '');
  const previa = eFoto ? `<img src="${esc(cheio)}" alt="${esc(a.nome)}" data-cheia title="Ver em tela cheia">` : `<pre>${esc(texto.slice(0, 20000))}</pre>`;
  const ficha = [['Tipo', tipoBib(a)], a.tam ? ['Tamanho', tamanhoBonito(a.tam)] : null,
    a.paginas ? ['Páginas', String(a.paginas)] : null,
    !eFoto && texto ? ['Linhas', String(texto.split(String.fromCharCode(10)).length)] : null,
    !eFoto && texto ? ['Palavras', String(texto.split(/[ \t\n]+/).filter(Boolean).length)] : null].filter(Boolean);
  const f = document.createElement('div'); f.className = 'dlg-fundo';
  f.innerHTML = `<div class="dlg folha bib-item">${topoCentro(a.nome)}
    <div class="bib-previa">${previa}</div>
    ${ficha.length ? `<dl class="bib-ficha">${ficha.map(([k, v]) => `<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>` : ''}
    <div class="bib-acoes">
      <button class="btn" data-a="baixar">${ICO.baixar}Baixar</button>
      ${eFoto ? '' : `<button class="btn" data-a="copiar">${ICO.copiar}Copiar</button>`}
      ${podeRemover ? `<button class="btn perigo" data-a="remover">${ICO.fechar}Tirar da mensagem</button>` : ''}</div></div>`;
  const dlg = f.firstChild, sair = () => animarSaida(f, dlg);
  f.fechar = sair; f.onclick = e => { if (e.target === f) sair(); }; dlg.querySelector('[data-x]').onclick = sair;
  folhaArrastavel(f, dlg, sair);
  dlg.querySelectorAll('[data-a]').forEach(b => b.onclick = () => {
    if (b.dataset.a === 'baixar') return baixarItemBib(eFoto ? Object.assign({}, a, { tipo: 'imagem', dataUrl: cheio }) : a);
    if (b.dataset.a === 'copiar') return copiarTexto(texto).then(() => toast('Copiado.'));
    anexos = anexos.filter(x => x.nome !== a.nome); sair(); desenharChips(); ajustar(); toast('Tirado da mensagem.');
  });
  const im = dlg.querySelector('[data-cheia]'); if (im) im.onclick = () => fotoEmTelaCheia(cheio, a.nome);
  pausarDesenho(); document.body.appendChild(f);
}
// foto ocupando a tela toda: toque (ou Esc) fecha
function fotoEmTelaCheia(src, nome) {
  const v = document.createElement('div'); v.className = 'foto-cheia';
  v.innerHTML = `<img src="${esc(src)}" alt="${esc(nome || '')}"><button class="icone" aria-label="Fechar">${ICO.fechar}</button>`;
  const sair = () => { v.remove(); document.removeEventListener('keydown', esc2, true); };
  const esc2 = e => { if (e.key === 'Escape') { e.stopPropagation(); sair(); } };
  v.onclick = sair; document.addEventListener('keydown', esc2, true);
  document.body.appendChild(v);
}
function addEu(m, ultima) {
  const d = document.createElement('div'); d.className = 'msg eu'; d._msg = m;
  d.innerHTML = (m.imagens && m.imagens.length ? `<div class="fotos-msg">${m.imagens.map(x => `<img src="${esc(x.miniatura)}" alt="${esc(x.nome)}" title="Ver ${esc(x.nome)}" data-ver="${esc(x.nome)}">`).join('')}</div>` : '') +
    (m.anexos && m.anexos.length ? `<div class="anexos-msg">${m.anexos.map(a => chipHTML(a)).join('')}</div>` : '') +
    (m.texto ? `<div class="txt">${esc(m.texto)}</div>` : '');
  {   // qualquer pergunta pode ser copiada ou editada e reenviada (o que vem depois dela é refeito)
    const a = document.createElement('div'); a.className = 'acoes editar';
    a.innerHTML = `<button class="acao" title="Copiar pergunta" aria-label="Copiar pergunta">${ICO.copiar}</button><button class="acao" title="Editar e reenviar" aria-label="Editar e reenviar">${ICO.editar}</button>`;
    a.children[0].onclick = () => copiarTexto(m.texto).then(() => toast('Pergunta copiada.'));
    a.children[1].onclick = () => editarMensagem(m);
    d.appendChild(a);
  }
  ligarVerAnexos(d, [...(m.imagens || []).map(x => Object.assign({ tipo: 'imagem' }, x)), ...(m.anexos || [])], false);
  coluna().appendChild(d); rolar(true);
}
/* mensagem da IA, sempre na mesma ordem (durante a resposta e depois dela):
   1 status (pensou por N s · conhecimento usado)  2 ferramentas (cartão de lugar, passo a passo do algoritmo)
   3 a resposta (texto ou widget de estudo)  4 nota (erro, interrompida)  5 fontes  6 ações  7 sugestões (só na última)
   trocar: o elemento da resposta que acabou de ser escrita; a versão final entra no lugar dele, sem animar de novo */
const htmlStatusIa = (pensou, conhecimentos) => pensou || (conhecimentos && conhecimentos.length)
  ? `<div class="ia-status">${pensou ? htmlLinhaPensa(pensou) : ''}${conhecimentos && conhecimentos.length ? htmlUsouConh(conhecimentos) : ''}</div>` : '';
const htmlUsouConh = ks => `<div class="usou-conh">${ICO.conhecimento}<span>Conhecimento: ${ks.map(esc).join(', ')}</span></div>`;
function addIa(m, ultima, trocar) {
  const d = document.createElement('div'); d.className = 'msg ia' + (trocar ? ' sem-entrada' : '');
  // modos de estudo: o resultado vira widget (cartões, quiz, correção) no lugar do texto; m.texto continua sendo o Markdown
  const widget = m.cartoes ? htmlCartoes(m) : m.quiz ? htmlQuiz(m) : m.redacao ? htmlRedacao(m) : '';
  const pensou = m.pensou ? (m.tempo ? 'Pensou por ' + tempoBonito(m.tempo) : 'Raciocínio') : '';
  d.innerHTML = htmlStatusIa(pensou, m.conhecimentos) +
    (m.lugar ? htmlPainelLugar(m.lugar) : '') +
    (m.passos ? htmlPassos(m.passos.titulo, m.passos.lista) : '') +
    `<div class="txt${widget ? ' widget' : ''}">${widget ? widget : comCitacoes(md(m.texto || ''), m.fontes)}</div>` +
    (m.erro ? `<div class="nota erro">${esc(m.erro)}</div>` : m.interrompida ? '<div class="nota">Resposta interrompida.</div>' : m.cortada && ultima ? '<div class="nota">A resposta ficou longa e parou aqui.</div>' : '') +
    (m.fontes && m.fontes.length ? htmlFontes(m.fontes) : '');
  if (m.pensou) ligarLinhaPensa(d, m.pensou, pensou);
  ligarLinks(d); if (m.lugar) ligarPainelLugar(d);
  if (widget) ligarWidgets(d, m);
  if (!m.interno || m.erro) acoes(d, m, ultima);
  if (ultima && m.sugestoes && m.sugestoes.length) anexarSugestoes(d, m);
  if (trocar && trocar.isConnected) trocar.replaceWith(d); else coluna().appendChild(d);
  enfeitar(d); rolar(); return d.querySelector(':scope > .txt');
}
