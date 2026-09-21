/* ================= APLICATIVO =================
   Conversas, envio/streaming, anexos, configurações, diagnóstico e atualização.
   Depende de: PLATAFORMA, trace/NOMES/parseNums, DESTAQUE, md, semLatex, detectTrace, resumo. */
const mdBase = md; md = s => mdBase(semLatex(s));

const ICO = {
  copiar: '<svg viewBox="0 0 24 24"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg>',
  ok: '<svg viewBox="0 0 24 24"><path d="M5 12l5 5L20 7"/></svg>',
  recarregar: '<svg viewBox="0 0 24 24"><path d="M21 12a9 9 0 1 1-2.64-6.36"/><path d="M21 3v6h-6"/></svg>',
  editar: '<svg viewBox="0 0 24 24"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>',
  mais: '<svg viewBox="0 0 24 24"><circle cx="5" cy="12" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="19" cy="12" r="1.3"/></svg>',
  renomear: '<svg viewBox="0 0 24 24"><path d="M4 20h4L19 9l-4-4L4 16z"/></svg>',
  exportar: '<svg viewBox="0 0 24 24"><path d="M12 3v12M7 10l5 5 5-5M5 21h14"/></svg>',
  apagar: '<svg viewBox="0 0 24 24"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/></svg>',
  fechar: '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  arquivo: '<svg viewBox="0 0 24 24"><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6"/></svg>',
  seguir: '<svg viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
  seta: '<svg viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg>',
  voltar: '<svg viewBox="0 0 24 24"><path d="M15 6l-6 6 6 6"/></svg>',
  chip: '<svg viewBox="0 0 24 24"><rect x="6" y="6" width="12" height="12" rx="2"/><path d="M9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4"/></svg>',
  atualizar: '<svg viewBox="0 0 24 24"><path d="M21 12a9 9 0 0 1-15.5 6.2L3 16"/><path d="M3 12a9 9 0 0 1 15.5-6.2L21 8"/><path d="M21 3v5h-5M3 21v-5h5"/></svg>',
  aparencia: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
  conversas: '<svg viewBox="0 0 24 24"><path d="M21 12a8 8 0 0 1-11.6 7.1L3 21l1.9-6.4A8 8 0 1 1 21 12z"/></svg>',
  diagnostico: '<svg viewBox="0 0 24 24"><path d="M3 12h4l3-8 4 16 3-8h4"/></svg>',
  sobre: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/></svg>',
  compartilhar: '<svg viewBox="0 0 24 24"><path d="M12 3v13M7 8l5-5 5 5"/><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7"/></svg>',
};

/* ---------------- estado ---------------- */
let conversas = [], atual = null, SYSTEM = '', online = false, jaFicouOnline = false;
let geracao = null;            // { conv, ctrl } enquanto uma resposta está sendo gerada
let anexos = [];               // anexos da próxima mensagem
let editando = false, salvarBloqueado = false, nCtx = 8192;
const novoId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const estimar = s => Math.ceil((s || '').length / 3.2);     // tokens aproximados (português/código)
const TEXTO_OK = /\.(txt|md|markdown|py|pyw|js|mjs|cjs|ts|tsx|jsx|java|kt|kts|c|h|cpp|cc|cxx|hpp|cs|go|rs|php|rb|swift|sql|html?|css|scss|json|csv|tsv|xml|ya?ml|toml|ini|cfg|conf|sh|bash|zsh|ps1|bat|lua|r|m|dart|vue|svelte|tex|log|gitignore|env)$/i;
const LIMITE_ANEXO = 40 * 1024, MAX_ANEXOS = 3;

/* ---------------- utilidades ---------------- */
function toast(t, ms = 2200) { const d = document.createElement('div'); d.className = 'toast'; d.textContent = t; document.body.appendChild(d); setTimeout(() => d.remove(), ms); }
/* diálogo próprio (no celular sobe de baixo). botoes: [[rótulo, valor, 'primario'|'perigo'|'']]; devolve o valor escolhido (null ao fechar) */
function perguntar(titulo, html, botoes) {
  return new Promise(ok => {
    const f = document.createElement('div'); f.className = 'dlg-fundo';
    f.innerHTML = `<div class="dlg" role="dialog" aria-label="${esc(titulo)}"><h3>${esc(titulo)}</h3>${html ? `<div class="dlg-txt">${html}</div>` : ''}<div class="botoes"></div></div>`;
    const fim = v => { f.remove(); ok(v); };
    botoes.forEach(([rot, v, tipo]) => { const b = document.createElement('button'); b.className = 'btn' + (tipo ? ' ' + tipo : ''); b.textContent = rot; b.onclick = () => fim(v); f.querySelector('.botoes').appendChild(b); });
    f.onclick = e => { if (e.target === f) fim(null); };
    f.fechar = () => fim(null);
    document.body.appendChild(f);
    const p = f.querySelector('.btn.primario, .btn.perigo'); if (p && !estreita()) p.focus();
  });
}
const confirmar = (titulo, html, rotulo = 'Confirmar', perigo) => perguntar(titulo, html, [['Cancelar', false, ''], [rotulo, true, perigo ? 'perigo' : 'primario']]).then(v => v === true);
function perguntarTexto(titulo, valor) {
  const id = 'campo' + novoId();
  const p = perguntar(titulo, `<input id="${id}" maxlength="120" style="width:100%;padding:11px 12px;border:1px solid var(--line);border-radius:10px;background:var(--surface);font-size:16px;outline:0">`, [['Cancelar', null, ''], ['Salvar', 'ok', 'primario']]);
  const inp = document.getElementById(id); inp.value = valor || ''; setTimeout(() => { inp.focus(); inp.select(); }, 50);
  inp.onkeydown = e => { if (e.key === 'Enter') inp.closest('.dlg').querySelector('.primario').click(); };
  return p.then(v => v === 'ok' ? inp.value.trim() : null);
}
function fecharDialogo() { const d = [...document.querySelectorAll('.dlg-fundo')].pop(); if (d) { d.fechar ? d.fechar() : d.remove(); return true; } return false; }
function estado(txt, erro) { const e = $('#estado'); if (txt) { e.textContent = txt; e.hidden = false; e.classList.toggle('erro', !!erro); } else e.hidden = true; }
function copiarTexto(t) {
  if (navigator.clipboard && window.isSecureContext !== false) return navigator.clipboard.writeText(t).catch(() => copiaVelha(t));
  return Promise.resolve(copiaVelha(t));
}
function copiaVelha(t) { const a = document.createElement('textarea'); a.value = t; a.style.position = 'fixed'; a.style.opacity = '0'; document.body.appendChild(a); a.select(); try { document.execCommand('copy'); } catch (e) {} a.remove(); }
function tamanhoBonito(b) { return b < 1024 ? b + ' B' : b < 1048576 ? (b / 1024).toFixed(b < 10240 ? 1 : 0) + ' KB' : (b / 1048576).toFixed(b < 10485760 ? 1 : 0) + ' MB'; }
function gbBonito(b) { return (b / 1073741824).toFixed(1).replace('.', ',') + ' GB'; }
const langDoArquivo = n => ({ py: 'python', pyw: 'python', js: 'javascript', mjs: 'javascript', cjs: 'javascript', ts: 'typescript', tsx: 'typescript', jsx: 'javascript', java: 'java', kt: 'kotlin',
  c: 'c', h: 'c', cpp: 'cpp', cc: 'cpp', cxx: 'cpp', hpp: 'cpp', cs: 'csharp', go: 'go', rs: 'rust', php: 'php', rb: 'ruby', swift: 'swift', sql: 'sql', html: 'html', htm: 'html',
  css: 'css', scss: 'scss', json: 'json', xml: 'xml', sh: 'bash', bash: 'bash', zsh: 'bash', md: 'markdown', yml: 'yaml', yaml: 'yaml' }[(n.split('.').pop() || '').toLowerCase()] || '');

/* ---------------- histórico: carregar / salvar ---------------- */
function validar(lista) {
  if (!Array.isArray(lista)) throw new Error('formato inválido');
  const txt = v => typeof v === 'string' ? v : '';
  return lista.filter(c => c && typeof c === 'object' && Array.isArray(c.msgs)).map(c => ({
    id: /^[a-z0-9]{4,40}$/i.test(c.id) ? c.id : novoId(),
    titulo: txt(c.titulo).slice(0, 120) || 'Conversa',
    criada: +c.criada || Date.now(), atualizada: +c.atualizada || +c.criada || Date.now(),
    msgs: c.msgs.filter(m => m && (m.role === 'user' || m.role === 'assistant')).map(m => ({
      role: m.role, texto: txt(m.texto), llm: txt(m.llm) || txt(m.texto),
      ...(m.interno ? { interno: true } : {}), ...(m.cortada ? { cortada: true } : {}), ...(m.interrompida ? { interrompida: true } : {}),
      ...(m.erro ? { erro: txt(m.erro) } : {}),
      ...(Array.isArray(m.anexos) ? { anexos: m.anexos.filter(a => a && typeof a.nome === 'string').map(a => ({ nome: a.nome.slice(0, 200), tam: +a.tam || 0, lang: txt(a.lang), conteudo: txt(a.conteudo) })) } : {}),
      ...(m.passos && Array.isArray(m.passos.lista) ? { passos: { titulo: txt(m.passos.titulo), lista: m.passos.lista.map(txt) } } : {}),
    })),
  }));
}
let tSalvar = null;
function salvar(agora) {
  if (salvarBloqueado) return;
  clearTimeout(tSalvar);
  const f = () => PLATAFORMA.salvar(JSON.stringify(conversas)).catch(e => toast('Não consegui salvar as conversas: ' + e.message, 4000));
  if (agora) f(); else tSalvar = setTimeout(f, 250);
}
async function carregarHistorico() {
  let bruto = '[]';
  try { bruto = await PLATAFORMA.carregar(); } catch (e) { toast('Não consegui ler as conversas salvas.'); }
  try { conversas = validar(JSON.parse(bruto || '[]')); }
  catch (e) {
    conversas = []; salvarBloqueado = true;
    mostrarFaixa('O arquivo de conversas está danificado. Para não perder nada, as conversas novas não serão salvas até você decidir.', 'Começar do zero', () => { salvarBloqueado = false; salvar(true); });
  }
  conversas.sort((a, b) => b.atualizada - a.atualizada);
  desenharLista();
}
if (PLATAFORMA.tipo === 'web') window.addEventListener('storage', e => { if (e.key === 'conversas' && !geracao) carregarHistorico().then(() => { if (atual) { const c = conversas.find(x => x.id === atual.id); c ? abrir(c.id) : nova(); } }); });

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
  let g = '', html = '';
  for (const c of lista) {
    const gr = grupoData(c.atualizada);
    if (gr !== g) { g = gr; html += `<div class="grupo">${gr}</div>`; }
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

function fecharMenus() { document.querySelectorAll('.menu').forEach(m => m.remove()); document.querySelectorAll('[aria-expanded="true"]').forEach(b => b.setAttribute('aria-expanded', 'false')); }
function menuFlutuante(ancora, itens, titulo) {
  fecharMenus();
  if (estreita()) {   // celular: folha que sobe de baixo, com botões grandes
    const f = document.createElement('div'); f.className = 'dlg-fundo';
    f.innerHTML = `<div class="dlg folha"><div class="alca"></div>${titulo ? `<h3>${esc(titulo)}</h3>` : ''}</div>`;
    itens.forEach(([ico, rot, fn, perigo]) => { const b = document.createElement('button'); b.className = 'op' + (perigo ? ' perigo' : ''); b.innerHTML = ico + `<span>${rot}</span>`; b.onclick = () => { f.remove(); fn(); }; f.firstChild.appendChild(b); });
    f.onclick = e => { if (e.target === f) f.remove(); };
    document.body.appendChild(f); return;
  }
  const m = document.createElement('div'); m.className = 'menu';
  itens.forEach(([ico, rot, f, perigo]) => { const b = document.createElement('button'); if (perigo) b.className = 'perigo'; b.innerHTML = ico + `<span>${rot}</span>`; b.onclick = e => { e.stopPropagation(); fecharMenus(); f(); }; m.appendChild(b); });
  document.body.appendChild(m);
  const r = ancora.getBoundingClientRect(), w = m.offsetWidth, h = m.offsetHeight;
  m.style.left = Math.max(8, Math.min(r.right - w, innerWidth - w - 8)) + 'px';
  m.style.top = (r.bottom + h + 8 > innerHeight ? Math.max(8, r.top - h - 4) : r.bottom + 4) + 'px';
  ancora.setAttribute('aria-expanded', 'true');
}
document.addEventListener('click', e => { if (!e.target.closest('.menu')) fecharMenus(); });
function menuConversa(botao, id) {
  const c = conversas.find(x => x.id === id); if (!c) return;
  menuFlutuante(botao, [
    [ICO.renomear, 'Renomear', () => renomear(id)],
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
  conversas = conversas.filter(c => c.id !== id);
  if (atual && atual.id === id) nova(); else desenharLista();
  salvar(true);
}

/* ---------------- conversa na tela ---------------- */
const SUGESTOES = [
  ['Explicar um conteúdo', 'de um jeito simples', 'Explique de forma simples, com um exemplo: '],
  ['Criar um código', 'completo e pronto para rodar', 'Crie um código completo em Python que '],
  ['Fazer um resumo', 'com os pontos principais', 'Faça um resumo com os pontos principais sobre '],
  ['Revisar para a prova', 'perguntas com respostas', 'Me faça 5 perguntas (com as respostas no final) para revisar '],
];
function boasVindas() {
  return `<div id="boasvindas"><div class="marca" aria-hidden="true"></div><h1>Como posso ajudar nos estudos?</h1><p>Pergunte, peça um código completo ou anexe um arquivo 📎.</p>
    <div class="sugestoes">${SUGESTOES.map(([t, s], i) => `<button data-sug="${i}"><b>${t}</b><small>${s}</small></button>`).join('')}</div></div>`;
}
document.addEventListener('click', e => {
  const b = e.target.closest('[data-sug]'); if (!b) return;
  const t = $('#entrada'); t.value = SUGESTOES[+b.dataset.sug][2]; ajustar(); t.focus(); t.setSelectionRange(t.value.length, t.value.length);
});
function nova() {
  atual = null; cancelarEdicao();
  $('#tituloAtual').textContent = 'Própons IA';
  $('#conversa').innerHTML = boasVindas();
  desenharLista(); if (!estreita()) $('#entrada').focus();
}
function abrir(id) {
  const c = conversas.find(x => x.id === id); if (!c) return nova();
  atual = c; cancelarEdicao();
  $('#tituloAtual').textContent = c.titulo;
  $('#conversa').innerHTML = ''; const col = coluna();
  c.msgs.forEach((m, i) => {
    if (m.role === 'user') addEu(m, i === ultimoIndice(c, 'user'));
    else { if (m.passos) addPassos(m.passos.titulo, m.passos.lista); addIa(m, i === c.msgs.length - 1); }
  });
  if (geracao && geracao.conv === c && geracao.el) col.appendChild(geracao.el.parentNode);
  rolar(true); desenharLista();
}
function ultimoIndice(c, role) { for (let i = c.msgs.length - 1; i >= 0; i--) if (c.msgs[i].role === role) return i; return -1; }
function coluna() {
  let col = $('#conversa .col');
  if (!col) { $('#conversa').innerHTML = ''; col = document.createElement('div'); col.className = 'col'; $('#conversa').appendChild(col); }
  return col;
}
let grudado = true;
$('#conversa').addEventListener('scroll', () => { const c = $('#conversa'); grudado = c.scrollHeight - c.scrollTop - c.clientHeight < 80; $('#descer').hidden = grudado || c.scrollHeight - c.scrollTop - c.clientHeight < 400; }, { passive: true });
function rolar(forcar) { const c = $('#conversa'); if (forcar || grudado) { c.scrollTop = c.scrollHeight; grudado = true; $('#descer').hidden = true; } }
$('#descer').onclick = () => { const c = $('#conversa'); c.scrollTo({ top: c.scrollHeight, behavior: 'smooth' }); grudado = true; $('#descer').hidden = true; };
function chipHTML(a, remover) {
  return `<div class="chip" title="${esc(a.nome)}">${ICO.arquivo}<b>${esc(a.nome)}</b><small>${tamanhoBonito(a.tam)}</small>${remover ? `<button data-rm="${esc(a.nome)}" aria-label="Remover anexo">${ICO.fechar}</button>` : ''}</div>`;
}
function addEu(m, ultima) {
  const d = document.createElement('div'); d.className = 'msg eu';
  d.innerHTML = (m.anexos && m.anexos.length ? `<div class="anexos-msg">${m.anexos.map(a => chipHTML(a)).join('')}</div>` : '') +
    (m.texto ? `<div class="txt">${esc(m.texto)}</div>` : '');
  if (ultima) {
    document.querySelectorAll('.msg.eu .editar').forEach(b => b.remove());
    const a = document.createElement('div'); a.className = 'acoes editar';
    a.innerHTML = `<button class="acao" title="Copiar pergunta" aria-label="Copiar pergunta">${ICO.copiar}</button><button class="acao" title="Editar e reenviar" aria-label="Editar e reenviar">${ICO.editar}</button>`;
    a.children[0].onclick = () => copiarTexto(m.texto).then(() => toast('Pergunta copiada.'));
    a.children[1].onclick = () => editarUltima();
    d.appendChild(a);
  }
  coluna().appendChild(d); rolar(true);
}
function addIa(m, ultima) {
  const d = document.createElement('div'); d.className = 'msg ia';
  d.innerHTML = `<div class="txt">${md(m.texto || '')}</div>` +
    (m.erro ? `<div class="nota erro">${esc(m.erro)}</div>` : m.interrompida ? '<div class="nota">Resposta interrompida.</div>' : '');
  if (!m.interno || m.erro) acoes(d, m, ultima);
  coluna().appendChild(d); enfeitar(d); rolar(); return d.firstChild;
}
function acoes(d, m, ultima) {
  const a = document.createElement('div'); a.className = 'acoes';
  if (m.texto && !m.interno) {
    const bc = document.createElement('button'); bc.className = 'acao'; bc.title = 'Copiar resposta'; bc.setAttribute('aria-label', 'Copiar resposta'); bc.innerHTML = ICO.copiar;
    bc.onclick = () => copiarTexto(m.texto).then(() => { bc.innerHTML = ICO.ok; bc.classList.add('feito'); setTimeout(() => { bc.innerHTML = ICO.copiar; bc.classList.remove('feito'); }, 1400); });
    a.appendChild(bc);
    if (PLATAFORMA.podeCompartilhar) {
      const bs = document.createElement('button'); bs.className = 'acao'; bs.title = 'Compartilhar'; bs.setAttribute('aria-label', 'Compartilhar resposta'); bs.innerHTML = ICO.compartilhar;
      bs.onclick = () => PLATAFORMA.compartilhar(m.texto).catch(() => {}); a.appendChild(bs);
    }
  }
  if (ultima) {
    document.querySelectorAll('.acao.recarregar,.acao.continuar').forEach(b => b.remove());
    const br = document.createElement('button'); br.className = 'acao recarregar'; br.title = 'Gerar de novo'; br.setAttribute('aria-label', 'Gerar de novo'); br.innerHTML = ICO.recarregar;
    br.onclick = () => regenerar(); a.appendChild(br);
    if (m.cortada || m.interrompida) {
      const bs = document.createElement('button'); bs.className = 'acao continuar'; bs.innerHTML = ICO.seguir + '<span>Continuar</span>';
      bs.onclick = () => continuar(); a.appendChild(bs);
    }
  }
  d.appendChild(a);
}
function addPassos(titulo, lista) {
  const d = document.createElement('details'); d.className = 'passos';
  d.innerHTML = `<summary>${esc(titulo)}<small>ver ${lista.length} passos</small></summary><ol>${lista.map(s => `<li>${esc(s)}</li>`).join('')}</ol>`;
  const w = document.createElement('div'); w.className = 'msg ia'; w.appendChild(d); coluna().appendChild(w); rolar();
}
function enfeitar(el) {
  el.querySelectorAll('pre').forEach(p => {
    if (p.querySelector('.copiar')) return;
    const b = document.createElement('button'); b.className = 'copiar'; b.innerHTML = ICO.copiar + '<span>Copiar</span>';
    b.onclick = () => copiarTexto(p.querySelector('code').innerText).then(() => { b.lastChild.textContent = 'Copiado'; setTimeout(() => b.lastChild.textContent = 'Copiar', 1200); });
    p.appendChild(b);
  });
  el.querySelectorAll('a[href]').forEach(a => a.onclick = e => { e.preventDefault(); PLATAFORMA.abrirLink(a.href); });
}

/* ---------------- anexos ---------------- */
function desenharChips() {
  const c = $('#chips'); c.hidden = !anexos.length;
  c.innerHTML = anexos.map(a => chipHTML(a, true)).join('');
  c.querySelectorAll('[data-rm]').forEach(b => b.onclick = () => { anexos = anexos.filter(a => a.nome !== b.dataset.rm); desenharChips(); ajustar(); });
  ajustar();
}
async function adicionarArquivos(lista) {
  for (const f of lista) {
    if (anexos.length >= MAX_ANEXOS) { toast(`Até ${MAX_ANEXOS} arquivos por mensagem.`); break; }
    if (/\.(pdf|docx?|pptx?|xlsx?|png|jpe?g|gif|webp|heic|bmp|zip|rar|7z|exe|mp[34])$/i.test(f.name) || (f.type && /^(image|video|audio)\//.test(f.type))) {
      toast(`"${f.name}": por enquanto só arquivos de texto e código (PDF e imagens ainda não).`, 3500); continue;
    }
    if (f.size > LIMITE_ANEXO) { toast(`"${f.name}" é grande demais (${tamanhoBonito(f.size)}). Limite: 40 KB.`, 3500); continue; }
    let texto = '';
    try { texto = await f.text(); } catch (e) { toast(`Não consegui ler "${f.name}".`); continue; }
    if (/\u0000/.test(texto) || (!TEXTO_OK.test(f.name) && /[\u0001-\u0008\u000e-\u001f]/.test(texto.slice(0, 2000)))) { toast(`"${f.name}" não parece ser um arquivo de texto.`); continue; }
    if (anexos.some(a => a.nome === f.name)) continue;
    anexos.push({ nome: f.name, tam: f.size, lang: langDoArquivo(f.name), conteudo: texto });
  }
  desenharChips();
}
$('#anexar').onclick = () => $('#arquivo').click();
$('#arquivo').onchange = e => { adicionarArquivos([...e.target.files]); e.target.value = ''; };
['dragenter', 'dragover'].forEach(t => document.addEventListener(t, e => { if ([...(e.dataTransfer?.types || [])].includes('Files')) { e.preventDefault(); $('#caixa').classList.add('soltar'); } }));
['dragleave', 'drop'].forEach(t => document.addEventListener(t, e => { if (t === 'dragleave' && e.relatedTarget) return; $('#caixa').classList.remove('soltar'); }));
document.addEventListener('drop', e => { if (e.dataTransfer?.files?.length) { e.preventDefault(); adicionarArquivos([...e.dataTransfer.files]); } });
$('#entrada').addEventListener('paste', e => { const fs = [...(e.clipboardData?.files || [])]; if (fs.length) { e.preventDefault(); adicionarArquivos(fs); } });

/* ---------------- enviar / responder ---------------- */
const PEDE_CODIGO = /\b(?:fa[çc]a|crie|cria|escreva|escreve|gere|gera|implemente|implementa|programe|desenvolva|monte|me\s+d[êáe]|mostre|mostra|quero|preciso\s+de|refatore|corrija|conserte|converta|traduza)\b[\s\S]{0,60}\b(?:c[óo]digo|programa|script|fun[çc][ãa]o|classe|m[ée]todo|algoritmo|api|site|p[áa]gina|app|jogo|bot|calculadora|sistema)\b|\b(?:em|no|na|usando|com)\s+(?:python|java(?:script)?|typescript|c\+\+|c#|c|go|golang|rust|php|kotlin|swift|ruby|sql|html|css|bash|dart|lua)\b|```/i;
const INVENTA = /[\[(]\s*-?\d+\s*,\s*-?\d+\s*,/;

function montarHistorico(conv, maxTokens, extra) {
  const orcamento = Math.max(1200, nCtx - estimar(SYSTEM) - maxTokens - 300);
  const msgs = conv.msgs.filter(m => !m.interno);
  const saida = []; let usado = 0;
  for (let i = msgs.length - 1; i >= 0; i--) {
    const m = msgs[i];
    let conteudo = m.llm || m.texto;
    const custo = estimar(conteudo);
    if (usado + custo > orcamento) {
      if (i === msgs.length - 1) conteudo = conteudo.slice(0, Math.floor((orcamento - usado) * 3.2)) + '\n[…texto cortado por ser longo demais]';
      else if (m.anexos && m.anexos.length) conteudo = m.texto + `\n[anexos anteriores omitidos: ${m.anexos.map(a => a.nome).join(', ')}]`;
      else break;
      if (usado + estimar(conteudo) > orcamento) break;
    }
    usado += estimar(conteudo);
    saida.unshift({ role: m.role, content: conteudo });
  }
  while (saida.length && saida[0].role !== 'user') saida.shift();   // começa sempre por uma pergunta
  return extra ? saida.concat(extra) : saida;
}

function textoParaModelo(texto, lista) {
  if (!lista.length) return texto;
  const blocos = lista.map(a => `Arquivo anexado: ${a.nome}\n\`\`\`${a.lang}\n${a.conteudo}\n\`\`\``).join('\n\n');
  return (texto || 'Analise o(s) arquivo(s) anexado(s).') + '\n\n' + blocos;
}

async function enviar(texto) {
  texto = texto.trim();
  if ((!texto && !anexos.length) || geracao) return;
  if (editando && atual) {
    // substitui a última pergunta (e a resposta dela)
    const iu = ultimoIndice(atual, 'user'); if (iu >= 0) atual.msgs.splice(iu);
    cancelarEdicao(); abrir(atual.id);
  }
  $('#entrada').value = '';
  const lista = anexos; anexos = []; desenharChips(); ajustar();
  if (!atual) {
    const base = (texto || lista.map(a => a.nome).join(', ')).replace(/\s+/g, ' ').trim();
    const titulo = (base.match(/^.{0,60}?[.!?](?=\s|$)/) || [base.slice(0, 60)])[0].replace(/[.!?]+$/, '') || 'Conversa';
    atual = { id: novoId(), titulo, criada: Date.now(), atualizada: Date.now(), msgs: [] };
    conversas.unshift(atual); $('#tituloAtual').textContent = atual.titulo;
  }
  const m = { role: 'user', texto, llm: textoParaModelo(texto, lista) };
  if (lista.length) m.anexos = lista;
  atual.msgs.push(m); atual.atualizada = Date.now();
  conversas = [atual, ...conversas.filter(c => c !== atual)];
  addEu(m, true); desenharLista(); salvar();
  await responder(atual);
}

async function regenerar() {
  const c = atual; if (!c || geracao) return;
  if (c.msgs.length && c.msgs[c.msgs.length - 1].role === 'assistant') c.msgs.pop();
  if (!c.msgs.length || c.msgs[c.msgs.length - 1].role !== 'user') return;
  abrir(c.id);
  await responder(c);
}
async function continuar() {
  const c = atual; if (!c || geracao) return;
  const m = c.msgs[c.msgs.length - 1]; if (!m || m.role !== 'assistant') return;
  await responder(c, m);
}
function editarUltima() {
  if (!atual || geracao) return;
  const iu = ultimoIndice(atual, 'user'); if (iu < 0) return;
  const m = atual.msgs[iu];
  editando = true; $('#editando').hidden = false;
  $('#entrada').value = m.texto; anexos = (m.anexos || []).slice(); desenharChips();
  ajustar(); $('#entrada').focus();
}
function cancelarEdicao() { editando = false; $('#editando').hidden = true; }
$('#cancelarEdicao').onclick = () => { cancelarEdicao(); $('#entrada').value = ''; anexos = []; desenharChips(); };

async function responder(conv, continuacao) {
  const ultima = conv.msgs[conv.msgs.length - 1];
  const pergunta = continuacao ? conv.msgs[ultimoIndice(conv, 'user')] : ultima;
  const texto = pergunta ? pergunta.texto : '';
  const pedeCodigo = PEDE_CODIGO.test(texto);

  // algoritmo com lista de números: passo a passo e resumo calculados por código (exatos e instantâneos)
  const tr = (continuacao || pedeCodigo || (pergunta && pergunta.anexos)) ? null : detectTrace(texto);
  if (tr) {
    const titulo = NOMES[tr.alg] + (tr.alg === 'binaria' ? ` · procurando ${tr.val} em ${fmt(tr.lista)}` : ` · ${fmt(tr.lista)}`);
    const r = resumo(tr.alg, tr.lista, tr.val);
    const msg = { role: 'assistant', texto: r, llm: r, passos: { titulo, lista: tr.steps } };
    conv.msgs.push(msg); conv.atualizada = Date.now();
    if (atual === conv) { addPassos(titulo, tr.steps); addIa(msg, true); }
    salvar(); desenharLista(); return;
  }
  if (!online) {
    const aviso = { role: 'assistant', texto: '', llm: '', interno: true, erro: 'A IA ainda está carregando. Espere o aviso "carregando" sumir e toque em ↻ para tentar de novo.' };
    if (!continuacao) { conv.msgs.push(aviso); if (atual === conv) addIa(aviso, true); salvar(); }
    else toast('A IA ainda está carregando.');
    return;
  }

  const maxTokens = pedeCodigo || (pergunta && pergunta.anexos) ? 3000 : 1500;
  // na continuação, a resposta cortada já é a última mensagem do histórico: o motor continua o texto dela
  const historico = montarHistorico(conv, maxTokens);

  let alvo, msg;
  if (continuacao) {
    msg = continuacao; delete msg.cortada; delete msg.interrompida;
    alvo = atual === conv ? [...document.querySelectorAll('.msg.ia .txt')].pop() : null;
    if (alvo) { const a = alvo.parentNode.querySelector('.acoes'); if (a) a.remove(); const n = alvo.parentNode.querySelector('.nota'); if (n) n.remove(); }
  } else {
    msg = { role: 'assistant', texto: '', llm: '' };
    alvo = atual === conv ? addIa({ texto: '', interno: true }, false) : null;
  }
  if (alvo) alvo.classList.add('digitando');
  const ctrl = new AbortController();
  geracao = { conv, ctrl, el: alvo };
  $('#enviar').classList.add('gerando'); $('#enviar').disabled = false; $('#enviar').title = 'Parar';

  const inicio = msg.texto || '';
  let novo = '', fim = 'stop', erro = null, cortou = false, tRender = 0;
  const sobreAlgoritmo = !pedeCodigo && !!Object.values(RE_ALG).some(r => r.test(texto));
  const foraDeCodigo = s => s.split('```').filter((_, i) => i % 2 === 0).join('\n').replace(/`[^`]*`/g, '');
  const render = () => {
    tRender = 0;
    const el = geracao && geracao.el; if (!el || !el.isConnected) return;
    el.innerHTML = md(inicio + novo); rolar();
  };
  try {
    const r = await PLATAFORMA.gerar([{ role: 'system', content: SYSTEM }, ...historico],
      { temperatura: pedeCodigo ? 0.2 : 0.35, repeticao: pedeCodigo ? 1.0 : 1.05, maxTokens, continuar: !!continuacao }, t => {
        novo += t;
        if (sobreAlgoritmo && !continuacao && INVENTA.test(foraDeCodigo(novo))) { cortou = true; ctrl.abort(); return; }
        if (!tRender) tRender = setTimeout(render, 60);
      }, ctrl.signal);
    fim = (r && r.fim) || 'stop';
  } catch (e) {
    if (e.name !== 'AbortError') erro = e.message || String(e);
  } finally {
    clearTimeout(tRender);
    geracao = null;
    $('#enviar').classList.remove('gerando'); $('#enviar').title = 'Enviar'; ajustar();
  }
  novo = novo.replace(/<think>[\s\S]*?(<\/think>|$)/g, '');
  if (cortou) {
    const m = INVENTA.exec(novo); if (m) novo = novo.slice(0, novo.lastIndexOf('\n', m.index) + 1).trim();
    novo += '\n\nPara ver um exemplo com números exatos, me mande a lista. Por exemplo: **bubble sort em [5, 2, 8, 1]**.';
  }
  msg.texto = (inicio + novo).trim(); msg.llm = msg.texto;
  if (erro) {
    msg.erro = /failed to fetch|networkerror|load failed/i.test(erro) ? 'A IA ficou indisponível no meio da resposta. Ela está sendo religada; toque em ↻ para tentar de novo.' :
      /context|exceed|too long|n_ctx/i.test(erro) ? 'A conversa ficou longa demais para a memória da IA. Comece uma nova conversa ou apague mensagens antigas.' : 'Erro: ' + erro;
    if (!msg.texto) msg.interno = true;
  } else { delete msg.erro; delete msg.interno; }
  if (!erro && !cortou && ctrl.signal.aborted) msg.interrompida = true;
  if (fim === 'length') msg.cortada = true;
  if (!continuacao) conv.msgs.push(msg);
  conv.atualizada = Date.now();
  if (atual === conv && alvo) { alvo.parentNode.remove(); addIa(msg, true); }
  salvar(); desenharLista();
}

/* ---------------- entrada e atalhos ---------------- */
function ajustar() { const t = $('#entrada'); t.style.height = 'auto'; t.style.height = Math.min(t.scrollHeight, 200) + 'px'; if (!geracao) $('#enviar').disabled = !t.value.trim() && !anexos.length; }
$('#entrada').addEventListener('input', ajustar);
$('#entrada').addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey && !e.isComposing && e.keyCode !== 229 && !(PLATAFORMA.tipo === 'android' || PLATAFORMA.tipo === 'ios')) { e.preventDefault(); enviar($('#entrada').value); }
  if (e.key === 'ArrowUp' && !$('#entrada').value && atual) { e.preventDefault(); editarUltima(); }
});
$('#enviar').onclick = () => { if (geracao) geracao.ctrl.abort(); else enviar($('#entrada').value); };
$('#nova').onclick = nova; $('#novaLat').onclick = () => { nova(); if (estreita()) fecharLateral(); };
const estreita = () => innerWidth <= 760;
function abrirLateral() { $('#lateral').classList.remove('fechada'); }
function fecharLateral() { $('#lateral').classList.add('fechada'); }
$('#abrirLat').onclick = () => $('#lateral').classList.toggle('fechada');
$('#fundo').onclick = fecharLateral;
document.addEventListener('keydown', e => {
  const k = (e.key || '').toLowerCase();
  if (e.ctrlKey && k === 'b') { e.preventDefault(); $('#lateral').classList.toggle('fechada'); }
  if (e.ctrlKey && e.shiftKey && k === 'o') { e.preventDefault(); nova(); }
  if (e.ctrlKey && k === 'k') { e.preventDefault(); abrirLateral(); $('#busca').focus(); }
  if (e.ctrlKey && k === ',') { e.preventDefault(); abrirConfig(); }
  if (e.key === 'Escape') { if (!fecharDialogo()) { if (document.querySelector('.painel-fundo')) voltarPainel(); else if (estreita()) fecharLateral(); } fecharMenus(); }
});
// celular: botão voltar fecha, nesta ordem, o diálogo, a subpágina dos ajustes, os ajustes e a gaveta
window.__proponsVoltar = () => {
  if (fecharDialogo()) return true;
  if (document.querySelector('.painel-fundo')) { voltarPainel(); return true; }
  if (!$('#lateral').classList.contains('fechada') && estreita()) { fecharLateral(); return true; }
  return false;
};
// celular: arrastar da borda esquerda abre o histórico; arrastar para a esquerda fecha
(() => {
  let ini = null;
  document.addEventListener('touchstart', e => {
    if (!estreita() || document.querySelector('.painel-fundo, .dlg-fundo')) return;
    const p = e.touches[0], aberta = !$('#lateral').classList.contains('fechada');
    if (!aberta && p.clientX > 28) return;
    ini = { x: p.clientX, y: p.clientY, aberta, dx: 0, travado: null };
  }, { passive: true });
  document.addEventListener('touchmove', e => {
    if (!ini) return;
    const p = e.touches[0], dx = p.clientX - ini.x, dy = p.clientY - ini.y;
    if (ini.travado === null && Math.hypot(dx, dy) > 8) ini.travado = Math.abs(dx) > Math.abs(dy);
    if (!ini.travado) return;
    const l = $('#lateral'), w = l.offsetWidth; ini.dx = dx;
    const pos = Math.max(-w, Math.min(0, (ini.aberta ? 0 : -w) + dx));
    l.classList.add('arrastando'); l.classList.remove('fechada'); l.style.transform = `translateX(${pos}px)`;
  }, { passive: true });
  document.addEventListener('touchend', () => {
    if (!ini) return;
    const l = $('#lateral'); l.classList.remove('arrastando'); l.style.transform = '';
    if (ini.travado) (ini.aberta ? ini.dx < -60 : ini.dx < 60) ? fecharLateral() : abrirLateral();
    else if (!ini.aberta) fecharLateral();
    ini = null;
  });
})();

/* ---------------- faixa de avisos ---------------- */
function mostrarFaixa(html, rotuloSim, fSim, rotuloNao = 'Agora não', fNao) {
  const f = $('#faixa');
  f.innerHTML = `<div class="faixa"><span>${html}</span><div class="acoes-faixa">${rotuloSim ? `<button class="sim">${esc(rotuloSim)}</button>` : ''}<button class="nao">${esc(rotuloNao)}</button></div></div>`;
  if (rotuloSim) f.querySelector('.sim').onclick = () => { f.innerHTML = ''; fSim && fSim(); };
  f.querySelector('.nao').onclick = () => { f.innerHTML = ''; fNao && fNao(); };
}

/* ---------------- aparência ---------------- */
const pref = (k, v) => { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) {} };
function aplicarTema() {
  const t = pref('tema') || 'sistema';
  const escuro = t === 'escuro' || (t === 'sistema' && matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.dataset.tema = escuro ? 'escuro' : 'claro';
  PLATAFORMA.tema(escuro ? 'escuro' : 'claro');
}
function aplicarFonte() { document.documentElement.dataset.fonte = pref('fonte') || 'm'; }
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', aplicarTema);

/* ---------------- ajustes (painel: no PC com menu ao lado, no celular em tela cheia) ---------------- */
const GB = 1073741824;
let abaAtual = 'modelo';
const PAGINAS = [
  [['modelo', 'Modelos de IA', ICO.chip], ['atualizacoes', 'Atualizações', ICO.atualizar]],
  [['geral', 'Aparência', ICO.aparencia], ['conversas', 'Conversas', ICO.conversas]],
  [['diagnostico', 'Diagnóstico', ICO.diagnostico], ['sobre', 'Sobre', ICO.sobre]],
];
const TITULOS = Object.fromEntries(PAGINAS.flat().map(([k, t]) => [k, t]));
let sistemaCache = null;
async function lerSistema() { const s = await PLATAFORMA.sistema().catch(() => null); if (s) sistemaCache = s; return sistemaCache; }

function subtitulo(k) {
  const ativo = sistemaCache && (sistemaCache.modelos || []).find(m => m.atual);
  switch (k) {
    case 'modelo': return ativo ? 'Em uso: ' + ativo.nome : 'Escolher, baixar e apagar';
    case 'atualizacoes': return atualizacao ? `Versão ${atualizacao.versao} disponível` : `Versão ${VERSAO}`;
    case 'geral': return ({ sistema: 'Tema do sistema', claro: 'Tema claro', escuro: 'Tema escuro' })[pref('tema') || 'sistema'] + ' · letra ' + ({ p: 'pequena', m: 'média', g: 'grande' })[pref('fonte') || 'm'];
    case 'conversas': return `${conversas.length} ${conversas.length === 1 ? 'conversa' : 'conversas'} · backup e limpeza`;
    case 'diagnostico': return 'Testar tudo e medir a velocidade';
    case 'sobre': return 'Própons IA ' + VERSAO;
  }
  return '';
}
function desenharNav() {
  const n = $('#pNav'); if (!n) return;
  n.innerHTML = `<div class="p-nav-topo"><h2>Ajustes</h2><button class="icone" data-fechar aria-label="Fechar">${ICO.fechar}</button></div>` +
    PAGINAS.map(g => `<div class="p-grupo">${g.map(([k, t, ic]) => `<button class="p-item${k === abaAtual ? ' on' : ''}" data-aba="${k}"><span class="pi">${ic}</span><span class="pt"><b>${t}</b><small>${esc(subtitulo(k))}</small></span>${k === 'atualizacoes' && atualizacao ? '<i class="ponto"></i>' : ''}<span class="seta">${ICO.seta}</span></button>`).join('')}</div>`).join('');
  n.querySelectorAll('[data-aba]').forEach(b => b.onclick = () => irPara(b.dataset.aba));
  n.querySelector('[data-fechar]').onclick = fecharModal;
}
function fecharModal() { document.querySelectorAll('.painel-fundo').forEach(m => m.remove()); }
function voltarPainel() {
  const p = $('.painel');
  if (p && estreita() && p.classList.contains('sub')) { p.classList.remove('sub'); desenharNav(); }
  else fecharModal();
}
function abrirConfig(aba) {
  fecharModal(); fecharMenus(); if (estreita()) fecharLateral();
  const f = document.createElement('div'); f.className = 'painel-fundo';
  f.innerHTML = `<div class="painel" role="dialog" aria-label="Ajustes"><nav class="p-nav" id="pNav"></nav>
    <section class="p-conteudo"><div class="p-topo"><button class="icone p-voltar" id="pVoltar" aria-label="Voltar">${ICO.voltar}</button><h3 id="pTitulo"></h3><button class="icone p-fechar" aria-label="Fechar">${ICO.fechar}</button></div><div class="p-corpo" id="corpoConfig"></div></section></div>`;
  document.body.appendChild(f);
  f.onclick = e => { if (e.target === f) fecharModal(); };
  f.querySelector('.p-fechar').onclick = fecharModal;
  $('#pVoltar').onclick = voltarPainel;
  if (aba || !estreita()) irPara(aba || abaAtual); else desenharNav();
  lerSistema().then(desenharNav);
}
function irPara(aba) {
  if (!TITULOS[aba]) aba = 'modelo';
  abaAtual = aba; desenharNav();
  const p = $('.painel'); if (!p) return;
  p.classList.add('sub'); $('#pTitulo').textContent = TITULOS[aba];
  $('#corpoConfig').scrollTop = 0;
  desenharAba();
}
$('#abrirConfig').onclick = () => abrirConfig();

function desenharAba() {
  const c = $('#corpoConfig'); if (!c) return;
  ({ geral: abaGeral, modelo: abaModelo, atualizacoes: abaAtualizacoes, conversas: abaConversas, diagnostico: abaDiagnostico, sobre: abaSobre })[abaAtual](c);
}
function seg(nome, opcoes, atualV) {
  return `<div class="seg" data-seg="${nome}">${opcoes.map(([v, r]) => `<button data-v="${v}" class="${v === atualV ? 'on' : ''}">${r}</button>`).join('')}</div>`;
}
function ligarSeg(c, nome, f) { c.querySelectorAll(`[data-seg="${nome}"] button`).forEach(b => b.onclick = () => { c.querySelectorAll(`[data-seg="${nome}"] button`).forEach(x => x.classList.toggle('on', x === b)); f(b.dataset.v); desenharNav(); }); }
function ligarCopiar(c) { c.querySelectorAll('[data-copiar]').forEach(b => b.onclick = () => copiarTexto($('#' + b.dataset.copiar).textContent).then(() => toast('Copiado.'))); }

function abaGeral(c) {
  c.innerHTML = `<div class="secao"><h4>Tema</h4>${seg('tema', [['sistema', 'Sistema'], ['claro', 'Claro'], ['escuro', 'Escuro']], pref('tema') || 'sistema')}</div>
    <div class="secao"><h4>Tamanho da letra</h4>${seg('fonte', [['p', 'Pequena'], ['m', 'Média'], ['g', 'Grande']], pref('fonte') || 'm')}</div>
    ${estreita() ? `<div class="secao"><h4>Gestos</h4><p class="info">Arraste da borda esquerda para abrir o histórico · segure uma conversa para renomear, compartilhar ou apagar · botão voltar fecha menus e telas.</p></div>`
      : `<div class="secao"><h4>Atalhos</h4><p class="info">Enter envia · Shift+Enter quebra linha · ↑ edita a última pergunta · Ctrl+B histórico · Ctrl+K buscar · Ctrl+Shift+O nova conversa · Ctrl+, ajustes</p></div>`}`;
  ligarSeg(c, 'tema', v => { pref('tema', v); aplicarTema(); });
  ligarSeg(c, 'fonte', v => { pref('fonte', v); aplicarFonte(); });
}

/* ---------------- modelos ---------------- */
const PERFIL_MODELO = { leve: ['Mais rápido', '0.8B'], normal: ['Equilibrado', '2B'], avancado: ['Mais inteligente', '4B'] };
let baixando = {};          // id → { pct, feito, total, fase }
let trocandoPara = null;    // id do modelo que está sendo ligado
const textoDownload = b => b.fase === 'verificando' ? 'Conferindo o arquivo…' : `Baixando ${Math.floor(b.pct * 100)}% · ${Math.round(b.feito / 1048576)} de ${Math.round(b.total / 1048576)} MB`;

function cartaoModelo(m, ram, rec) {
  const [perfil, tam] = PERFIL_MODELO[m.id] || ['', ''];
  const b = baixando[m.id], ligando = trocandoPara === m.id && !b, web = PLATAFORMA.tipo === 'web';
  const pouca = ram && m.ramMin && ram < m.ramMin * GB * 0.93;
  const usar = rot => `<button class="btn primario" data-acao="usar" data-id="${m.id}" data-modelo="${m.id}">${rot}</button>`;
  let acoes = '';
  if (m.bloqueado || m.atual || ligando) acoes = '';
  else if (b) acoes = `<button class="btn" data-acao="cancelar" data-id="${m.id}">Cancelar download</button>`;
  else if (web) acoes = usar('Usar este');
  else if (m.baixado) acoes = usar('Usar este') + `<button class="btn perigo" data-acao="apagar" data-id="${m.id}">${ICO.apagar}Apagar</button>`;
  else acoes = usar('Baixar e usar') + `<button class="btn" data-acao="baixar" data-id="${m.id}">${ICO.exportar}Só baixar</button>`;
  const selo = m.atual ? '<span class="selo">Em uso</span>' : ligando ? '<span class="selo cinza">Ligando…</span>' : m.bloqueado ? `<span class="selo cinza">${esc(m.bloqueado)}</span>` : m.baixado ? '<span class="selo ok">Baixado</span>' : '';
  return `<div class="mcard${m.atual ? ' on' : ''}" data-cartao="${m.id}">
    <div class="mtopo"><div class="mico">${tam}</div><div class="pt"><b>${esc(m.nome.replace(/\s*\(.*\)/, ''))}</b><small>${esc(m.descricao || '')}</small></div>${selo}</div>
    <div class="mtags"><span>${perfil}</span><span>${gbBonito(m.tamanho)}</span><span${pouca ? ' class="aviso"' : ''}>${pouca ? 'Pouca RAM · pede ' : 'RAM '}${m.ramMin} GB+</span>${m.id === rec ? '<span class="rec">Recomendado</span>' : ''}</div>
    <div class="mprog"${b || ligando ? '' : ' hidden'}><div class="barra"><i style="width:${b ? (b.pct * 100).toFixed(1) : 100}%"></i></div><small>${b ? textoDownload(b) : 'Ligando o modelo…'}</small></div>
    <div class="macoes">${acoes}</div></div>`;
}
async function abaModelo(c) {
  if (!sistemaCache) c.innerHTML = '<p class="info">Carregando…</p>';
  const s = await lerSistema();
  if (abaAtual !== 'modelo' || !$('#corpoConfig')) return;
  const modelos = (s && s.modelos) || [];
  if (!modelos.length) { c.innerHTML = '<p class="info">Não foi possível ler os modelos deste aparelho.</p>'; return; }
  const ram = s.ramTotal || 0, web = PLATAFORMA.tipo === 'web';
  const rec = ram && ram < 5.5 * GB ? 'leve' : 'normal';
  const usado = modelos.filter(m => m.baixado).reduce((t, m) => t + m.tamanho, 0), livre = s.discoLivre || 0;
  const rolagem = c.scrollTop;
  c.innerHTML = `<p class="info">Os modelos ficam guardados neste aparelho e funcionam sem internet. Os maiores respondem melhor (principalmente código), mas são mais lentos e usam mais memória.</p>
    ${modelos.map(m => cartaoModelo(m, ram, rec)).join('')}
    <div class="secao" style="margin-top:18px"><h4>Armazenamento</h4><div class="cartao">
      ${livre ? `<div class="uso"><i style="width:${Math.max(usado ? 1.5 : 0, Math.min(100, usado / (usado + livre) * 100)).toFixed(1)}%"></i></div>` : ''}
      <div class="linha-info"><span>Modelos baixados</span><b>${usado ? gbBonito(usado) : 'nenhum'}</b></div>
      ${livre ? `<div class="linha-info"><span>Espaço livre</span><b>${gbBonito(livre)}</b></div>` : ''}
      <div class="linha-info"><span>Memória (RAM)</span><b>${ram ? gbBonito(ram) : '?'}</b></div>
      ${s.pastaModelos ? `<div class="linha-info"><span>Pasta</span><b>${esc(s.pastaModelos)}</b></div>` : ''}
    </div></div>
    ${web ? `<div class="secao"><h4>No Linux</h4><p class="info">Troque o modelo pelo terminal (a Própons IA reabre com ele e baixa se preciso):</p>
      <div class="cmd"><code id="cmdModelo">propons-ia --modelo normal</code><button class="icone" data-copiar="cmdModelo" aria-label="Copiar">${ICO.copiar}</button></div>
      <p class="info" style="margin-top:12px">Para apagar um modelo e liberar espaço:</p><div class="cmd"><code id="cmdApagar">propons-ia --apagar-modelo avancado</code><button class="icone" data-copiar="cmdApagar" aria-label="Copiar">${ICO.copiar}</button></div></div>` : ''}`;
  c.scrollTop = rolagem;
  ligarCopiar(c);
  c.querySelectorAll('[data-acao]').forEach(b => b.onclick = () => acaoModelo(b.dataset.acao, modelos.find(x => x.id === b.dataset.id), ram));
}
async function acaoModelo(acao, m, ram) {
  if (!m) return;
  if (PLATAFORMA.tipo === 'web') { $('#cmdModelo').textContent = 'propons-ia --modelo ' + m.id; $('#cmdModelo').scrollIntoView({ block: 'center', behavior: 'smooth' }); toast('Copie o comando e rode no terminal.'); return; }
  if (acao === 'cancelar') { PLATAFORMA.cancelarDownload(m.id).catch(() => {}); return; }
  if (acao === 'apagar') {
    if (!await confirmar(`Apagar o ${m.nome}?`, `Libera ${gbBonito(m.tamanho)}. Se quiser usar de novo, ele é baixado outra vez.`, 'Apagar', true)) return;
    try { await PLATAFORMA.apagarModelo(m.id); toast('Modelo apagado.'); } catch (e) { toast('Não deu para apagar: ' + e.message, 4000); }
    desenharAba(); return;
  }
  if (Object.keys(baixando).length || trocandoPara) { toast('Espere o download ou a troca atual terminar.'); return; }
  if (ram && ram < m.ramMin * GB * 0.93 && !await confirmar('Pouca memória', `Este aparelho tem ${gbBonito(ram)} de memória e o ${esc(m.nome)} pede ${m.ramMin} GB. Ele pode ficar lento ou fechar.`, 'Continuar mesmo assim')) return;
  if (!m.baixado && !await confirmar(`Baixar o ${m.nome}?`, `São ${gbBonito(m.tamanho)}, baixados uma vez só. De preferência use Wi-Fi.`, 'Baixar')) return;
  try {
    if (acao === 'baixar') { baixando[m.id] = { pct: 0, feito: 0, total: m.tamanho }; desenharAba(); await PLATAFORMA.baixarModelo(m.id); return; }
    if (geracao) geracao.ctrl.abort();
    if (!m.baixado) baixando[m.id] = { pct: 0, feito: 0, total: m.tamanho };
    trocandoPara = m.id; desenharAba();
    await PLATAFORMA.trocarModelo(m.id);
  } catch (e) { delete baixando[m.id]; trocandoPara = null; toast('Não foi possível: ' + e.message, 4000); desenharAba(); }
}
function atualizarCartao(id) {
  const el = document.querySelector(`[data-cartao="${id}"]`); if (!el) return;
  const b = baixando[id], p = el.querySelector('.mprog');
  if (b && p && !p.hidden && el.querySelector('[data-acao="cancelar"]')) { p.querySelector('i').style.width = (b.pct * 100).toFixed(1) + '%'; p.querySelector('small').textContent = textoDownload(b); return; }
  if (abaAtual === 'modelo') desenharAba();
}
const idDoModelo = d => d.id || ((sistemaCache && (sistemaCache.modelos || []).find(m => m.nome === d.nome)) || {}).id;
PLATAFORMA.ao('download', d => {
  const id = idDoModelo(d); if (!id) return;
  baixando[id] = { pct: d.pct, feito: d.feito, total: d.total, fase: d.fase };
  atualizarCartao(id);
  estado(`baixando ${Math.floor(d.pct * 100)}%`);
});
PLATAFORMA.ao('download-fim', d => {
  delete baixando[d.id]; if (online) estado('');
  if (d.ok) toast('Download concluído. O modelo já pode ser usado.', 3000);
  else if (d.erro === 'cancelado') toast('Download cancelado.');
  else if (d.erro) toast(d.erro, 5000);
  if (abaAtual === 'modelo') desenharAba();
  lerSistema().then(desenharNav);
});
PLATAFORMA.ao('motor', d => {
  if (d.estado === 'reiniciando' || d.estado === 'trocando') {
    online = false; estado(d.estado === 'trocando' ? 'trocando de modelo' : 'reconectando');
    if (d.estado === 'trocando' && trocandoPara) { delete baixando[trocandoPara]; if (abaAtual === 'modelo') desenharAba(); }
  }
  if (d.estado === 'pronto') {
    online = false; verificar(true);
    if (trocandoPara) toast('Pronto! Modelo em uso: ' + (d.nome || ''), 3000);
    baixando = {}; trocandoPara = null;
    lerSistema().then(() => { desenharNav(); if (abaAtual === 'modelo') desenharAba(); });
  }
  if (d.estado === 'erro') {
    baixando = {}; trocandoPara = null;
    estado('erro', true); toast(d.mensagem || 'Erro no motor da IA.', 5000);
    if (abaAtual === 'modelo') desenharAba();
  }
});

/* ---------------- conversas ---------------- */
function abaConversas(c) {
  const n = conversas.length, msgs = conversas.reduce((s, x) => s + x.msgs.length, 0);
  c.innerHTML = `<div class="cartao"><div class="linha-info"><span>Conversas</span><b>${n}</b></div><div class="linha-info"><span>Mensagens</span><b>${msgs}</b></div>
      <div class="linha-info"><span>Tamanho</span><b>${tamanhoBonito(new Blob([JSON.stringify(conversas)]).size)}</b></div>
      <div class="linha-info"><span>Onde ficam</span><b>${PLATAFORMA.tipo === 'windows' ? 'ao lado do programa (vão junto no pendrive)' : 'só neste aparelho'}</b></div></div>
    <div class="secao"><h4>Backup</h4><div class="botoes"><button class="btn" id="expTudo">${ICO.exportar}Exportar tudo (.json)</button><button class="btn" id="impTudo">${ICO.arquivo}Importar (.json)</button></div></div>
    <div class="secao"><h4>Limpeza</h4><div class="botoes"><button class="btn perigo" id="apagarTudo">${ICO.apagar}Apagar todas as conversas</button></div></div>`;
  $('#expTudo').onclick = () => PLATAFORMA.salvarArquivo('propons-ia-conversas-' + new Date().toISOString().slice(0, 10) + '.json', JSON.stringify({ app: 'Própons IA', versao: VERSAO, conversas }, null, 1), 'application/json')
    .then(r => r !== false && toast('Backup exportado.')).catch(e => toast('Não deu para exportar: ' + e.message));
  $('#impTudo').onclick = () => $('#importar').click();
  $('#apagarTudo').onclick = async () => {
    if (!await confirmar('Apagar todas as conversas?', 'Isso não pode ser desfeito. Se quiser guardar, exporte um backup antes.', 'Apagar tudo', true)) return;
    if (geracao) geracao.ctrl.abort(); conversas = []; salvarBloqueado = false; nova(); salvar(true); desenharAba(); desenharNav(); toast('Conversas apagadas.');
  };
}
$('#importar').onchange = async e => {
  const f = e.target.files[0]; e.target.value = ''; if (!f) return;
  try {
    const j = JSON.parse(await f.text());
    const novas = validar(Array.isArray(j) ? j : j.conversas);
    const ids = new Set(conversas.map(c => c.id)); let n = 0;
    for (const c of novas) { if (ids.has(c.id)) continue; conversas.push(c); n++; }
    conversas.sort((a, b) => b.atualizada - a.atualizada); salvarBloqueado = false; salvar(true); desenharLista(); desenharAba(); desenharNav();
    toast(n ? `${n} ${n === 1 ? 'conversa importada' : 'conversas importadas'}.` : 'Nenhuma conversa nova no arquivo.');
  } catch (err) { toast('Arquivo inválido: ' + err.message, 4000); }
};

/* ---------------- diagnóstico embutido ---------------- */
let ultimoRelatorio = '';
function abaDiagnostico(c) {
  c.innerHTML = `<p class="info">Confere se tudo está funcionando e mede a velocidade real da IA neste aparelho.</p>
    <div class="botoes" style="margin-bottom:12px"><button class="btn primario" id="rodarDiag">Rodar diagnóstico</button><button class="btn" id="copDiag" ${ultimoRelatorio ? '' : 'hidden'}>${ICO.copiar}Copiar relatório</button></div>
    <ul class="diag" id="listaDiag"></ul>`;
  $('#rodarDiag').onclick = rodarDiagnostico;
  $('#copDiag').onclick = () => copiarTexto(ultimoRelatorio).then(() => toast('Relatório copiado.'));
  if (ultimoRelatorio && window.__ultimaListaDiag) $('#listaDiag').innerHTML = window.__ultimaListaDiag;
}
async function rodarDiagnostico() {
  const ul = $('#listaDiag'); if (!ul) return;
  $('#rodarDiag').disabled = true; ul.innerHTML = '';
  const itens = [];
  const add = (st, titulo, det) => {
    itens.push({ st, titulo, det });
    const li = document.createElement('li');
    li.innerHTML = `<span class="ic">${{ ok: '✅', aviso: '⚠️', erro: '❌', info: 'ℹ️' }[st]}</span><div><b>${esc(titulo)}</b>${det ? `<small>${esc(det)}</small>` : ''}</div>`;
    if ($('#listaDiag')) $('#listaDiag').appendChild(li);
  };
  add('info', `Própons IA ${VERSAO}`, `Plataforma: ${({ windows: 'Windows', android: 'Android', ios: 'iOS', web: 'Linux (navegador)' })[PLATAFORMA.tipo]} · ${navigator.userAgent.replace(/\s+/g, ' ').slice(0, 120)}`);
  // sistema
  let s = null; try { s = await PLATAFORMA.sistema(); } catch (e) {}
  if (s) {
    const livreRam = s.ramLivre ? `, livre ${gbBonito(s.ramLivre)}` : '';
    add(s.ramTotal && s.ramTotal < 3.5 * 1073741824 ? 'aviso' : 'ok', 'Memória (RAM)', `${s.ramTotal ? gbBonito(s.ramTotal) : '?'} total${livreRam}`);
    if (s.ramLivre !== undefined) add(s.ramLivre < 1.2 * 1073741824 ? 'aviso' : 'ok', 'Memória livre agora', s.ramLivre < 1.2 * 1073741824 ? 'Pouca memória livre: feche outros programas para a IA ficar mais rápida.' : gbBonito(s.ramLivre));
    add('info', 'Processador', `${s.cpu || '?'}${s.nucleos ? ` · ${s.nucleos} núcleos` : ''}`);
    if (s.discoLivre !== undefined) add(s.discoLivre < 2 * 1073741824 ? 'aviso' : 'ok', 'Espaço livre para modelos', `${gbBonito(s.discoLivre)}${s.pastaModelos ? ' em ' + s.pastaModelos : ''}`);
    if (s.pastaDados) add('info', 'Conversas salvas em', s.pastaDados);
    if (s.so) add('info', 'Sistema', s.so);
    const ativo = (s.modelos || []).find(m => m.atual);
    if (ativo) add('ok', 'Modelo selecionado', `${ativo.nome} (${ativo.arquivo})`);
  } else add('aviso', 'Informações do sistema', PLATAFORMA.tipo === 'web' ? 'Abra pelo comando propons-ia para ver RAM/CPU/disco.' : 'Não foi possível ler.');
  // motor
  const t0 = performance.now(); const vivo = await PLATAFORMA.saude(); const lat = performance.now() - t0;
  add(vivo ? 'ok' : 'erro', 'Motor da IA', vivo ? `respondendo (${lat.toFixed(0)} ms)` : 'não está respondendo. Feche e abra a Própons IA de novo.');
  if (vivo) {
    try {
      const p = await PLATAFORMA.props();
      const modelo = p && (p.model_path || p.modelo || '').split(/[\\/]/).pop();
      const ctx = p && ((p.default_generation_settings && p.default_generation_settings.n_ctx) || p.n_ctx);
      if (ctx) nCtx = ctx;
      add('ok', 'Modelo carregado', `${modelo || '?'} · contexto ${ctx || '?'} tokens`);
    } catch (e) { add('aviso', 'Modelo carregado', 'não foi possível ler: ' + e.message); }
    // velocidade real
    if (!geracao) {
      const ctrl = new AbortController(); let n = 0, tPrimeiro = 0; const ti = performance.now();
      try {
        const r = await PLATAFORMA.gerar([{ role: 'user', content: 'Escreva os números de 1 a 40 separados por vírgula, sem mais nada.' }],
          { temperatura: 0, maxTokens: 64 }, () => { if (!n) tPrimeiro = performance.now() - ti; n++; }, ctrl.signal);
        const total = (performance.now() - ti) / 1000;
        const tm = r && r.timings;
        const ger = tm && tm.predicted_per_second ? tm.predicted_per_second : n / Math.max(total - tPrimeiro / 1000, 0.01);
        const pro = tm && tm.prompt_per_second;
        add(ger >= 6 ? 'ok' : ger >= 2.5 ? 'aviso' : 'erro', 'Velocidade de resposta',
          `${ger.toFixed(1)} tokens/s gerando${pro ? ` · ${pro.toFixed(0)} tokens/s lendo` : ''} · primeira palavra em ${(tPrimeiro / 1000).toFixed(1)} s${ger < 6 ? ' — use um modelo menor em Ajustes > Modelos de IA para ficar mais rápido' : ''}`);
      } catch (e) { add('erro', 'Velocidade de resposta', 'falhou: ' + e.message); }
    } else add('info', 'Velocidade de resposta', 'pulado (a IA está respondendo agora).');
  }
  // algoritmos e renderizador
  try {
    const r = resumo('bubble', [5, 2, 8, 1]);
    const q = resumo('quick', [8, 2, 6, 4, 9, 1]);
    const b = resumo('binaria', [4, 8, 15, 16, 23, 42, 50], 23);
    const ok = /\[1, 2, 5, 8\]/.test(r) && /4 trocas/.test(r) && /\[1, 2, 4, 6, 8, 9\]/.test(q) && /índice \*\*4\*\*/.test(b);
    add(ok ? 'ok' : 'erro', 'Cálculo exato de algoritmos', ok ? 'bubble, quick e busca binária conferidos' : 'resultado inesperado');
  } catch (e) { add('erro', 'Cálculo exato de algoritmos', e.message); }
  const h = md('**ok** `x` [l](https://a.b)\n```python\ndef f(): pass\n```\n<b>x</b>');
  add(/<pre/.test(h) && /tk-kw/.test(h) && !/<b>x<\/b>/.test(h) ? 'ok' : 'erro', 'Formatação e destaque de código', 'Markdown, cores e proteção contra HTML');
  // armazenamento
  try {
    const antes = JSON.stringify(conversas); await PLATAFORMA.salvar(antes); const volta = await PLATAFORMA.carregar();
    add(volta === antes ? 'ok' : 'aviso', 'Gravação das conversas', volta === antes ? `${conversas.length} conversas gravadas e lidas corretamente` : 'o que foi lido difere do que foi gravado');
  } catch (e) { add('erro', 'Gravação das conversas', e.message); }
  // atualização
  const upd = await checarAtualizacao();
  add(upd === null ? 'aviso' : upd ? 'aviso' : 'ok', 'Atualizações', upd === null ? 'sem internet para verificar (a IA funciona offline normalmente)' : upd ? `nova versão ${upd.versao} disponível` : 'você está na versão mais recente');
  // relatório
  const ic = { ok: '[OK]', aviso: '[!]', erro: '[X]', info: '[i]' };
  ultimoRelatorio = `Diagnóstico Própons IA ${VERSAO} — ${new Date().toLocaleString('pt-BR')}\n` + itens.map(x => `${ic[x.st]} ${x.titulo}${x.det ? ': ' + x.det : ''}`).join('\n');
  window.__ultimaListaDiag = $('#listaDiag') ? $('#listaDiag').innerHTML : '';
  window.__diagnostico = itens;             // usado pelos testes automáticos
  if ($('#rodarDiag')) { $('#rodarDiag').disabled = false; $('#copDiag').hidden = false; }
}

/* ---------------- atualizações ---------------- */
let atualizacao = null;        // { versao, notas, tamanho } se houver versão nova · false = está em dia · null = não verificado
let atualizando = null;        // { pct, fase: 'baixando' | 'verificando' | 'instalando' }
let ultimaVerificacao = +(pref('ultimaVerificacao') || 0);
const maior = (a, b) => { const x = a.split('.').map(Number), y = b.split('.').map(Number); for (let i = 0; i < 3; i++) { if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) > (y[i] || 0); } return false; };
const ARQUIVO_DA_PLATAFORMA = { windows: 'Propons-IA-Windows.exe', android: 'Propons-IA-Android.apk', ios: 'Propons-IA-iOS.ipa' };

// devolve { versao, ... } se houver versão nova, false se está em dia, null se não deu para verificar
async function checarAtualizacao() {
  try {
    const r = await fetch(`https://api.github.com/repos/${REPO}/releases/latest`, { cache: 'no-store' });
    if (!r.ok) return null;
    const j = await r.json(); const v = String(j.tag_name || '').replace(/^v/, '');
    if (!/^\d+\.\d+\.\d+$/.test(v)) return null;
    ultimaVerificacao = Date.now(); pref('ultimaVerificacao', String(ultimaVerificacao));
    const asset = (j.assets || []).find(a => a.name === ARQUIVO_DA_PLATAFORMA[PLATAFORMA.tipo]);
    atualizacao = maior(v, VERSAO) ? { versao: v, url: j.html_url, notas: String(j.body || ''), tamanho: asset ? asset.size : 0 } : false;
    marcarPontos(); desenharNav();
    return atualizacao;
  } catch (e) { return null; }
}
function marcarPontos() { const tem = !!atualizacao; $('#pontoConfig').hidden = !tem; $('#pontoLat').hidden = !tem || !estreita(); }
function tempoAtras(ts) {
  const s = (Date.now() - ts) / 1000;
  return s < 90 ? 'agora há pouco' : s < 3600 ? `há ${Math.round(s / 60)} min` : s < 86400 ? `há ${Math.round(s / 3600)} h` : 'em ' + new Date(ts).toLocaleDateString('pt-BR');
}
// notas da versão (vêm de docs/novidades.md): sem o título e sem a tabela de downloads
function limparNotas(s) {
  return s.replace(/\r/g, '').replace(/^\s*#{1,3}\s[^\n]*\n/, '').split(/\n#{1,3}\s*(?:Baixar|Downloads?|Instalar)\b/i)[0].trim().slice(0, 2500);
}
function rotuloAtualizar() {
  return ({ ios: 'Atualizar pelo SideStore/AltStore', web: 'Como atualizar', windows: 'Atualizar agora', android: 'Atualizar agora' })[PLATAFORMA.tipo];
}
function textoAtualizando() {
  if (!atualizando) return '';
  return ({ baixando: `Baixando a versão nova: ${Math.floor(atualizando.pct * 100)}%${atualizando.total ? ` (${Math.round(atualizando.feito / 1048576)} de ${Math.round(atualizando.total / 1048576)} MB)` : ''}`,
    verificando: 'Conferindo o arquivo baixado…',
    instalando: PLATAFORMA.tipo === 'windows' ? 'Instalando: a Própons IA vai fechar e abrir de novo sozinha…' : 'Abrindo o instalador do Android…' })[atualizando.fase] || '';
}
function instrucoesAtualizacao() {
  switch (PLATAFORMA.tipo) {
    case 'windows': return 'A Própons IA baixa a versão nova, confere o arquivo (SHA-256), troca o programa (também no pendrive) e abre de novo. Conversas e modelos continuam.';
    case 'android': return 'A Própons IA baixa a versão nova, confere o arquivo (SHA-256) e abre o instalador do Android. Conversas e modelos continuam.';
    case 'ios': return 'No iPhone, a atualização é feita pelo SideStore ou AltStore: abra o app, vá em <b>Meus apps</b> e toque em <b>Atualizar</b> na Própons IA. Conversas e modelos continuam.';
    default: return 'No Linux, rode no terminal:<div class="cmd"><code id="cmdAtualizar">propons-ia --atualizar</code><button class="icone" data-copiar="cmdAtualizar" aria-label="Copiar">' + ICO.copiar + '</button></div>';
  }
}
function abaAtualizacoes(c) {
  const u = atualizacao;
  const status = u ? `Nova versão ${esc(u.versao)} disponível` : u === false ? 'Você está na versão mais recente' : ultimaVerificacao ? 'Verificado ' + tempoAtras(ultimaVerificacao) : 'Ainda não verificado';
  c.innerHTML = `<div class="cartao"><div class="versao-topo"><div class="marca"></div><div><b>Própons IA ${VERSAO}</b><small class="${u ? 'nova' : ''}">${status}</small></div></div>
      ${u && u.notas ? `<div class="notas txt">${md(limparNotas(u.notas))}</div>` : ''}
      <div id="progAtual"${atualizando ? '' : ' hidden'}><div class="barra"><i style="width:${atualizando ? (atualizando.pct * 100).toFixed(1) : 0}%"></i></div><small class="info" id="txtProgAtual">${textoAtualizando()}</small></div>
      <div class="botoes" style="margin-top:14px">${u ? `<button class="btn primario" id="btnAtualizar"${atualizando ? ' disabled' : ''}>${ICO.exportar}${rotuloAtualizar()}${u.tamanho && PLATAFORMA.podeAtualizarSozinho ? ` · ${Math.round(u.tamanho / 1048576)} MB` : ''}</button>` : ''}
        <button class="btn" id="btnProcurar">${ICO.atualizar}Procurar atualizações</button></div>
      <p class="info" style="margin:12px 0 0">${instrucoesAtualizacao()}</p></div>
    <div class="secao" style="margin-top:18px"><h4>Atualizar tudo</h4><div class="cartao"><p class="info">Procura versão nova do app e confere se os modelos baixados estão inteiros. Um modelo com defeito é apagado para ser baixado de novo.</p>
      <button class="btn" id="btnTudo">${ICO.atualizar}Procurar e atualizar tudo</button><ul class="diag" id="listaTudo" style="margin-top:8px"></ul></div></div>
    <div class="secao"><h4>Automático</h4><div class="cartao"><button class="interruptor" id="swAvisar" role="switch" aria-checked="${pref('avisarAtualizacao') !== 'nao'}"><span class="pt"><b>Avisar quando sair versão nova</b><small>Confere ao abrir o app, quando houver internet</small></span><span class="chave"></span></button></div></div>`;
  ligarCopiar(c);
  if ($('#btnAtualizar')) $('#btnAtualizar').onclick = iniciarAtualizacao;
  $('#btnProcurar').onclick = async () => {
    const b = $('#btnProcurar'); b.disabled = true; b.lastChild.textContent = 'Procurando…';
    const r = await checarAtualizacao();
    if (r === null) toast('Sem internet para verificar agora.');
    else if (!r) toast('Você já está na versão mais recente.');
    if (abaAtual === 'atualizacoes') desenharAba();
  };
  $('#btnTudo').onclick = atualizarTudo;
  $('#swAvisar').onclick = () => { const on = $('#swAvisar').getAttribute('aria-checked') !== 'true'; $('#swAvisar').setAttribute('aria-checked', on); pref('avisarAtualizacao', on ? 'sim' : 'nao'); };
}
function desenharAtualizando() {
  const p = $('#progAtual'); if (!p) return;
  p.hidden = !atualizando;
  if (atualizando) { p.querySelector('i').style.width = (atualizando.pct * 100).toFixed(1) + '%'; $('#txtProgAtual').textContent = textoAtualizando(); }
  const b = $('#btnAtualizar'); if (b) b.disabled = !!atualizando;
}
async function iniciarAtualizacao() {
  const u = atualizacao; if (!u || atualizando) return;
  const t = PLATAFORMA.tipo;
  if (t === 'web') { if (abaAtual !== 'atualizacoes' || !$('#corpoConfig')) abrirConfig('atualizacoes'); toast('Rode no terminal: propons-ia --atualizar', 4000); return; }
  if (t === 'ios') {
    let ok = false; try { ok = await PLATAFORMA.abrirLoja(); } catch (e) {}
    if (!ok) PLATAFORMA.abrirLink(`https://github.com/${REPO}/blob/main/docs/instalar-ios.md`);
    return;
  }
  if (!PLATAFORMA.podeAtualizarSozinho) { PLATAFORMA.abrirLink('https://muurxdev.github.io/propons-ia/'); return; }
  if (geracao) { if (!await confirmar('Parar a resposta?', 'A IA está respondendo agora. Atualizar interrompe a resposta.', 'Atualizar')) return; geracao.ctrl.abort(); }
  atualizando = { pct: 0, fase: 'baixando' }; desenharAtualizando();
  try {
    const r = await PLATAFORMA.atualizar(u.versao);
    if (r && r.precisaPermissao) {
      atualizando = null; desenharAtualizando();
      await perguntar('Permita a instalação', '<p>O Android abriu a tela de permissão. Ative <b>Permitir desta fonte</b> para a Própons IA, volte e toque em <b>Atualizar agora</b> de novo.</p>', [['Entendi', true, 'primario']]);
      return;
    }
    atualizando = { pct: 1, fase: 'instalando' }; desenharAtualizando();
  } catch (e) { atualizando = null; desenharAtualizando(); toast('Não foi possível atualizar: ' + e.message, 5000); }
}
PLATAFORMA.ao('atualizacao', d => {
  if (d.fase === 'erro') { atualizando = null; toast(d.mensagem || 'A atualização não foi concluída.', 5000); }
  else atualizando = d;
  desenharAtualizando();
});

async function atualizarTudo() {
  const ul = $('#listaTudo'), bt = $('#btnTudo'); if (!ul) return;
  bt.disabled = true; ul.innerHTML = '';
  const add = (st, titulo, det) => { const li = document.createElement('li'); li.innerHTML = `<span class="ic">${{ ok: '✅', aviso: '⚠️', erro: '❌', info: 'ℹ️', vai: '⏳' }[st]}</span><div><b>${esc(titulo)}</b>${det ? `<small>${esc(det)}</small>` : ''}</div>`; if ($('#listaTudo')) $('#listaTudo').appendChild(li); return li; };
  const u = await checarAtualizacao();
  add(u === null ? 'aviso' : u ? 'info' : 'ok', 'Aplicativo', u === null ? 'sem internet para verificar' : u ? `versão ${u.versao} disponível` : `versão ${VERSAO} é a mais recente`);
  add('ok', 'Interface e motor da IA', 'vêm dentro do app e são atualizados junto com ele');
  if (PLATAFORMA.tipo !== 'web') {
    const li = add('vai', 'Modelos baixados', 'conferindo os arquivos…');
    verificandoLi = li;
    try {
      const r = await PLATAFORMA.verificarModelos();
      li.remove();
      if (!r || !r.length) add('info', 'Modelos baixados', 'nenhum modelo baixado ainda');
      else r.forEach(x => add(x.ok ? 'ok' : 'erro', x.nome, x.ok ? 'arquivo inteiro e conferido (SHA-256)' : x.apagado ? 'arquivo com defeito: foi apagado. Baixe de novo em Modelos de IA.' : 'arquivo com defeito e em uso: troque de modelo, apague este e baixe de novo.'));
    } catch (e) { li.remove(); add('aviso', 'Modelos baixados', 'não foi possível conferir: ' + e.message); }
    verificandoLi = null;
    lerSistema().then(desenharNav);
  }
  if ($('#btnTudo')) $('#btnTudo').disabled = false;
  if (u) {
    if (abaAtual === 'atualizacoes') { const lista = $('#listaTudo').innerHTML; desenharAba(); $('#listaTudo').innerHTML = lista; }
    iniciarAtualizacao();
  }
}
let verificandoLi = null;
PLATAFORMA.ao('verificacao', d => { if (verificandoLi && verificandoLi.isConnected) verificandoLi.querySelector('small').textContent = `conferindo ${d.nome}: ${Math.floor((d.pct || 0) * 100)}%`; });

// ao abrir (e a cada 6 h): se houver versão nova, avisa com um diálogo (pode adiar por 1 dia)
async function avisoAutomatico() {
  const u = await checarAtualizacao();
  if (!u || pref('avisarAtualizacao') === 'nao') return;
  if (pref('adiarVersao') === u.versao && +(pref('adiarAte') || 0) > Date.now()) return;
  if (document.querySelector('.dlg-fundo') || atualizando) return;
  const v = await perguntar(`Nova versão ${u.versao} disponível`,
    `<p>Você está na ${VERSAO}. Atualize para ter as melhorias e correções mais recentes.</p>${u.notas ? `<div class="notas txt">${md(limparNotas(u.notas))}</div>` : ''}`,
    [['Depois', 'depois', ''], [rotuloAtualizar(), 'sim', 'primario']]);
  if (v === 'sim') { abrirConfig('atualizacoes'); iniciarAtualizacao(); }
  else { pref('adiarVersao', u.versao); pref('adiarAte', String(Date.now() + 86400000)); }
}

/* ---------------- sobre ---------------- */
function abaSobre(c) {
  c.innerHTML = `<div class="cartao"><div class="versao-topo"><div class="marca"></div><div><b>Própons IA</b><small>Versão ${VERSAO} · IA de estudos que roda no seu aparelho</small></div></div></div>
    <div class="botoes" style="margin-bottom:18px"><button class="btn" id="irAtual">${ICO.atualizar}Atualizações</button><button class="btn" id="abrirSite">Site para baixar</button><button class="btn" id="abrirRepo">Código no GitHub</button></div>
    <div class="secao"><h4>Privacidade</h4><p class="info">Tudo roda neste aparelho: suas conversas e arquivos não são enviados para nenhum servidor. A internet só é usada para baixar os modelos e procurar atualizações.</p></div>
    <div class="secao"><h4>Componentes</h4><p class="info">Motor: llama.cpp (MIT) · Modelos: Qwen3.5 (Apache 2.0)${PLATAFORMA.tipo === 'windows' ? ' · Microsoft WebView2' : ''}.</p></div>`;
  $('#irAtual').onclick = () => irPara('atualizacoes');
  $('#abrirSite').onclick = () => PLATAFORMA.abrirLink('https://muurxdev.github.io/propons-ia/');
  $('#abrirRepo').onclick = () => PLATAFORMA.abrirLink('https://github.com/' + REPO);
}

/* ---------------- motor: saúde contínua ---------------- */
let tVerificar = null;
async function verificar(imediato) {
  clearTimeout(tVerificar);
  const ok = await PLATAFORMA.saude();
  if (ok && !online) {
    online = true; jaFicouOnline = true;
    try { const p = await PLATAFORMA.props(); const ctx = p && ((p.default_generation_settings && p.default_generation_settings.n_ctx) || p.n_ctx); if (ctx) nCtx = ctx; } catch (e) {}
    aquecer();
  } else if (!ok) {
    online = false;
    estado(jaFicouOnline ? 'reconectando' : 'carregando');
  }
  tVerificar = setTimeout(verificar, ok ? 5000 : 1500);
}
async function aquecer() {
  estado('preparando');
  // processa o texto de sistema uma vez para a primeira resposta sair rápida
  try { await PLATAFORMA.gerar([{ role: 'system', content: SYSTEM }, { role: 'user', content: 'oi' }], { temperatura: 0, maxTokens: 1 }, () => {}); } catch (e) {}
  if (online) estado('');
}

/* ---------------- início ---------------- */
aplicarTema(); aplicarFonte();
nova();
if (!estreita()) abrirLateral();
(async () => {
  try { SYSTEM = await PLATAFORMA.textoSistema(); } catch (e) {}
  if (!SYSTEM) SYSTEM = 'Você é a Própons IA, uma assistente de estudos. Responda em português do Brasil, de forma clara e correta.';
  await carregarHistorico();
  verificar();
  setTimeout(avisoAutomatico, 4000);
  setInterval(avisoAutomatico, 6 * 3600 * 1000);
})();
