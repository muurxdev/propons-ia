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
  camera: '<svg viewBox="0 0 24 24"><path d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z"/><circle cx="12" cy="13.5" r="3.5"/></svg>',
  biblioteca: '<svg viewBox="0 0 24 24"><path d="M4 19V5a2 2 0 0 1 2-2h3v18H6a2 2 0 0 1-2-2zM9 3h4v18H9zM14.5 4.2l3.9-1 3 16.5-3.9 1z"/></svg>',
  microfone: '<svg viewBox="0 0 24 24"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg>',
  foto: '<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="9" cy="10" r="1.8"/><path d="M21 16l-5-5-9 9"/></svg>',
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
const LIMITE_ANEXO = 40 * 1024, MAX_ANEXOS = 3, MAX_FOTOS = 3, TOKENS_FOTO = 420;
const eFoto = f => (f.type && /^image\//.test(f.type)) || /\.(png|jpe?g|gif|webp|bmp|heic|heif)$/i.test(f.name || '');

/* ---------------- utilidades ---------------- */
function toast(t, ms = 2200) { const d = document.createElement('div'); d.className = 'toast'; d.setAttribute('role', 'status'); d.textContent = t; document.body.appendChild(d); setTimeout(() => d.remove(), ms); }
/* enquanto uma folha ou a gaveta anima, o texto da resposta espera (a animação tem prioridade) */
let pausaDesenhoAte = 0;
const pausarDesenho = (ms = 360) => { pausaDesenhoAte = Math.max(pausaDesenhoAte, performance.now() + ms); };
/* ---------------- folhas (tudo que abre por cima sobe de baixo) ----------------
   Fecham tocando fora, no X, com o botão voltar ou arrastando para baixo pela alça/topo (seguindo o dedo). */
function animarSaida(fundo, folha, depois) {
  if (!fundo || fundo.classList.contains('saindo')) return;
  fundo.classList.add('saindo');
  pausarDesenho(240);
  if (!estreita()) {   // PC e tablet: some com um fade curto
    folha.style.transition = 'opacity .14s ease,transform .14s ease'; folha.style.opacity = '0'; folha.style.transform = 'translateY(4px) scale(.985)';
    fundo.style.transition = 'background-color .14s'; fundo.style.backgroundColor = 'rgba(0,0,0,0)';
    setTimeout(() => { fundo.remove(); if (depois) depois(); }, 140);
    return;
  }
  folha.style.transition = 'transform .2s cubic-bezier(.4,0,1,1)'; folha.style.transform = 'translateY(105%)';
  fundo.style.transition = 'background-color .2s'; fundo.style.backgroundColor = 'rgba(0,0,0,0)';
  setTimeout(() => { fundo.remove(); if (depois) depois(); }, 200);
}
function folhaArrastavel(fundo, folha, fechar) {
  let y0 = null, dy = 0, t0 = 0, id = null, moveu = false;
  folha.addEventListener('pointerdown', e => {
    if (e.button > 0 || !estreita()) return;
    const zona = e.target.closest('.p-arrastar, .dlg-topo, .p-topo, .p-nav-topo, .folha');
    if (!zona) return;
    if (!e.target.closest('.folha') && e.target.closest('button, input, textarea, select, a')) return;
    y0 = e.clientY; dy = 0; t0 = performance.now(); id = e.pointerId; moveu = false;
  });
  folha.addEventListener('pointermove', e => {
    if (y0 === null || e.pointerId !== id) return;
    dy = Math.max(0, e.clientY - y0);
    if (moveu) pausarDesenho(200);
    if (!moveu && dy > 6) { moveu = true; try { folha.setPointerCapture(id); } catch (er) {} folha.style.transition = 'none'; fundo.style.transition = 'none'; }
    if (moveu) { folha.style.transform = `translateY(${dy}px)`; fundo.style.backgroundColor = `rgba(10,10,14,${(0.45 * Math.max(0, 1 - dy / folha.offsetHeight)).toFixed(3)})`; }
  });
  const soltar = () => {
    if (y0 === null) return;
    const v = dy / Math.max(1, performance.now() - t0);
    if (moveu) {
      // o toque que arrastou não vira clique no botão embaixo do dedo
      const engolir = ev => { ev.stopPropagation(); ev.preventDefault(); };
      folha.addEventListener('click', engolir, { capture: true, once: true });
      setTimeout(() => folha.removeEventListener('click', engolir, { capture: true }), 350);
      if (dy > Math.min(140, folha.offsetHeight * 0.3) || v > 0.7) fechar();
      else { folha.style.transition = 'transform .24s cubic-bezier(.2,.8,.2,1)'; folha.style.transform = ''; fundo.style.transition = 'background-color .24s'; fundo.style.backgroundColor = ''; }
    }
    y0 = null;
  };
  folha.addEventListener('pointerup', soltar); folha.addEventListener('pointercancel', soltar);
}
const topoCentro = (titulo, voltar) => `<div class="dlg-topo centro"><span class="alca"></span><button class="icone" data-x aria-label="${voltar ? 'Voltar' : 'Fechar'}">${voltar ? ICO.voltar : ICO.fechar}</button><h3>${esc(titulo || '')}</h3><span class="vazio-x"></span></div>`;
const topoFolha = topoCentro;

/* diálogo próprio (folha que sobe de baixo). botoes: [[rótulo, valor, 'primario'|'perigo'|'']]; devolve o valor escolhido (null ao fechar) */
function perguntar(titulo, html, botoes, opcoes) {
  return new Promise(ok => {
    const f = document.createElement('div'); f.className = 'dlg-fundo';
    f.innerHTML = `<div class="dlg" role="dialog" aria-label="${esc(titulo)}">${topoFolha(titulo, !!(opcoes && opcoes.voltar))}${html ? `<div class="dlg-txt">${html}</div>` : ''}<div class="botoes"></div></div>`;
    let resolvido = false;
    const fim = v => { if (resolvido) return; resolvido = true; ok(v); animarSaida(f, f.firstChild); };
    f.querySelector('[data-x]').onclick = () => fim(null);
    folhaArrastavel(f, f.firstChild, () => fim(null));
    pausarDesenho();
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
/* toda folha/diálogo/painel que entra: aria-modal, foco dentro (e de volta ao sair); a folha de trás fica escondida */
const FOCAVEL = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
new MutationObserver(muts => {
  const abertos = [...document.querySelectorAll('.dlg-fundo:not(.saindo)')];
  abertos.forEach((f, i) => f.classList.toggle('atras', i < abertos.length - 1));
  for (const m of muts) {
    for (const n of m.addedNodes) {
      if (!(n instanceof Element) || !/\b(dlg-fundo|painel-fundo)\b/.test(n.className)) continue;
      const caixa = n.firstElementChild; if (!caixa) continue;
      caixa.setAttribute('role', caixa.getAttribute('role') || 'dialog'); caixa.setAttribute('aria-modal', 'true');
      if (!caixa.hasAttribute('tabindex')) caixa.tabIndex = -1;
      n._focoAntes = document.activeElement;
      setTimeout(() => { if (!n.isConnected || n.contains(document.activeElement)) return; const alvo = caixa.querySelector('input, textarea') || caixa; alvo.focus({ preventScroll: true }); }, 30);
    }
    for (const n of m.removedNodes) {
      if (!(n instanceof Element) || !n._focoAntes) continue;
      const topo = [...document.querySelectorAll('.dlg-fundo:not(.saindo), .painel-fundo:not(.saindo)')].pop();
      const de = n._focoAntes; n._focoAntes = null;
      if (!topo && de.isConnected && (document.activeElement === document.body || !document.activeElement)) de.focus({ preventScroll: true });
      else if (topo && !topo.contains(document.activeElement)) topo.firstElementChild.focus({ preventScroll: true });
    }
  }
}).observe(document.body, { childList: true });
// Tab não sai do diálogo aberto
document.addEventListener('keydown', e => {
  if (e.key !== 'Tab') return;
  const topo = [...document.querySelectorAll('.dlg-fundo:not(.saindo), .painel-fundo:not(.saindo)')].pop(); if (!topo) return;
  const itens = [...topo.querySelectorAll(FOCAVEL)].filter(x => x.offsetParent !== null); if (!itens.length) return;
  const i = itens.indexOf(document.activeElement);
  if (e.shiftKey && (i <= 0)) { e.preventDefault(); itens[itens.length - 1].focus(); }
  else if (!e.shiftKey && (i === -1 || i === itens.length - 1)) { e.preventDefault(); itens[0].focus(); }
});
function fecharDialogo() { const d = [...document.querySelectorAll('.dlg-fundo:not(.saindo)')].pop(); if (d) { d.fechar ? d.fechar() : animarSaida(d, d.firstChild); return true; } return false; }
/* texto ao lado do título: cada origem (erro > troca > download > rede) guarda o seu e o mais importante aparece.
   estado('') sem origem limpa tudo (a IA respondeu: está tudo bem); estado('', false, 'download') limpa só o download. */
const estados = {};
function estado(txt, erro, origem) {
  origem = origem || (erro ? 'erro' : /trocando/.test(txt) ? 'troca' : /baixando|conferindo/.test(txt) ? 'download' : 'rede');
  if (txt) estados[origem] = txt; else if (arguments.length > 2) delete estados[origem]; else for (const k in estados) delete estados[k];
  const atualE = ['erro', 'troca', 'download', 'rede'].find(k => estados[k]);
  const e = $('#estado');
  if (atualE) { e.textContent = estados[atualE]; e.hidden = false; e.classList.toggle('erro', atualE === 'erro'); } else e.hidden = true;
}
function copiarTexto(t) {
  if (navigator.clipboard && window.isSecureContext !== false) return navigator.clipboard.writeText(t).catch(() => copiaVelha(t));
  return Promise.resolve(copiaVelha(t));
}
function copiaVelha(t) { const a = document.createElement('textarea'); a.value = t; a.style.position = 'fixed'; a.style.opacity = '0'; document.body.appendChild(a); a.select(); try { document.execCommand('copy'); } catch (e) {} a.remove(); }
function tamanhoBonito(b) { return b < 1024 ? b + ' B' : b < 1048576 ? (b / 1024).toFixed(b < 10240 ? 1 : 0) + ' KB' : (b / 1048576).toFixed(b < 10485760 ? 1 : 0) + ' MB'; }
function gbBonito(b) { return b < 1073741824 ? Math.max(1, Math.round(b / 1048576)) + ' MB' : (b / 1073741824).toFixed(1).replace('.', ',') + ' GB'; }
const langDoArquivo = n => ({ py: 'python', pyw: 'python', js: 'javascript', mjs: 'javascript', cjs: 'javascript', ts: 'typescript', tsx: 'typescript', jsx: 'javascript', java: 'java', kt: 'kotlin',
  c: 'c', h: 'c', cpp: 'cpp', cc: 'cpp', cxx: 'cpp', hpp: 'cpp', cs: 'csharp', go: 'go', rs: 'rust', php: 'php', rb: 'ruby', swift: 'swift', sql: 'sql', html: 'html', htm: 'html',
  css: 'css', scss: 'scss', json: 'json', xml: 'xml', sh: 'bash', bash: 'bash', zsh: 'bash', md: 'markdown', yml: 'yaml', yaml: 'yaml' }[(n.split('.').pop() || '').toLowerCase()] || '');

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
    ...(c.fixada ? { fixada: true } : {}), ...(txt(c.pasta).trim() ? { pasta: txt(c.pasta).trim().slice(0, 40) } : {}),
    msgs: c.msgs.filter(m => m && (m.role === 'user' || m.role === 'assistant')).slice(-2000).map(m => ({
      role: m.role, texto: txt(m.texto), llm: txt(m.llm) || txt(m.texto),
      ...(m.interno ? { interno: true } : {}), ...(m.cortada ? { cortada: true } : {}), ...(m.interrompida ? { interrompida: true } : {}), ...(m.pendente ? { pendente: true } : {}),
      ...(m.erro ? { erro: txt(m.erro) } : {}),
      ...(Array.isArray(m.anexos) ? { anexos: m.anexos.filter(a => a && typeof a.nome === 'string').map(a => ({ nome: a.nome.slice(0, 200), tam: +a.tam || 0, lang: txt(a.lang), conteudo: txt(a.conteudo) })) } : {}),
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

function fecharMenus() { document.querySelectorAll('.menu').forEach(m => m.remove()); document.querySelectorAll('[aria-expanded="true"]').forEach(b => b.setAttribute('aria-expanded', 'false')); }
function menuFlutuante(ancora, itens, titulo) {
  fecharMenus();
  if (estreita()) {   // celular: folha que sobe de baixo, com botões grandes (arrastar para baixo ou X fecha)
    const f = document.createElement('div'); f.className = 'dlg-fundo';
    f.innerHTML = `<div class="dlg folha">${topoFolha(titulo)}</div>`;
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
  m.style.top = (r.bottom + h + 8 > innerHeight ? Math.max(8, r.top - h - 4) : r.bottom + 4) + 'px';
  ancora.setAttribute('aria-expanded', 'true');
}
document.addEventListener('click', e => { if (!e.target.closest('.menu')) fecharMenus(); });
function menuConversa(botao, id) {
  const c = conversas.find(x => x.id === id); if (!c) return;
  menuFlutuante(botao, [
    [ICO.renomear, 'Renomear', () => renomear(id)],
    [ICO.fixar, c.fixada ? 'Desafixar' : 'Fixar no topo', () => { c.fixada = !c.fixada; salvar(); desenharLista(); }],
    [ICO.pasta, c.pasta ? `Pasta: ${c.pasta}` : 'Mover para pasta…', async () => {
      const outras = [...new Set(conversas.map(x => x.pasta).filter(Boolean))].filter(p => p !== c.pasta);
      const nome = await perguntarTexto(`Pasta da conversa${outras.length ? ' (existem: ' + outras.slice(0, 5).join(', ') + ')' : ''}`, c.pasta || '');
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
  return `<div id="boasvindas"><h1><span class="sd">${saudacao()},</span> <span class="fr">${esc(fraseDaTela)}</span></h1></div>`;
}
// se a hora virar com a tela inicial aberta, a saudação acompanha
setInterval(() => { const h = document.querySelector('#boasvindas .sd'); if (h && h.textContent !== saudacao() + ',') h.textContent = saudacao() + ','; }, 60000);
function nova() {
  if (atual) atual.rascunho = '';   // o que estava na caixa vai junto para a conversa nova
  atual = null; cancelarEdicao();
  $('#tituloAtual').textContent = 'Própons IA';
  $('#conversa').innerHTML = boasVindas();
  desenharLista(); if (!estreita()) $('#entrada').focus();
}
function abrir(id) {
  const c = conversas.find(x => x.id === id); if (!c) return nova();
  if (atual && atual !== c) { atual.msgs.forEach(m => { if (m._envio) m._envio = null; }); atual.rascunho = $('#entrada').value; }   // fotos cheias só da conversa aberta; o rascunho fica guardado
  const trocou = atual !== c;
  atual = c; cancelarEdicao();
  $('#tituloAtual').textContent = c.titulo;
  // as mensagens são montadas fora da página (uma coluna solta) e entram de uma vez: um reflow só, não um por mensagem
  $('#conversa').innerHTML = ''; const col = document.createElement('div'); col.className = 'col'; colDestacada = col;
  const iu = ultimoIndice(c, 'user');
  try {
    c.msgs.forEach((m, i) => {
      if (m.role === 'user') addEu(m, i === iu);
      else { if (m.passos) addPassos(m.passos.titulo, m.passos.lista); addIa(m, i === c.msgs.length - 1); }
    });
  } finally { colDestacada = null; }
  if (geracao && geracao.conv === c && geracao.el) col.appendChild(geracao.el.parentNode);
  $('#conversa').appendChild(col);
  if (trocou) { $('#entrada').value = c.rascunho || ''; ajustar(); }
  rolar(true); desenharLista();
}
function ultimoIndice(c, role) { for (let i = c.msgs.length - 1; i >= 0; i--) if (c.msgs[i].role === role) return i; return -1; }
let colDestacada = null;   // coluna ainda fora da página, enquanto abrir() monta uma conversa
function coluna() {
  if (colDestacada) return colDestacada;
  let col = $('#conversa .col');
  if (!col) { $('#conversa').innerHTML = ''; col = document.createElement('div'); col.className = 'col'; $('#conversa').appendChild(col); }
  return col;
}
let grudado = true;
$('#conversa').addEventListener('scroll', () => { const c = $('#conversa'); grudado = c.scrollHeight - c.scrollTop - c.clientHeight < 80; $('#descer').hidden = grudado || c.scrollHeight - c.scrollTop - c.clientHeight < 400; }, { passive: true });
function rolar(forcar) { const c = $('#conversa'); if (forcar || grudado) { c.scrollTop = c.scrollHeight; grudado = true; $('#descer').hidden = true; } }
$('#descer').onclick = () => { const c = $('#conversa'); c.scrollTo({ top: c.scrollHeight, behavior: 'smooth' }); grudado = true; $('#descer').hidden = true; };
function chipHTML(a, remover) {
  if (a.tipo === 'imagem') return `<div class="chip foto" title="${esc(a.nome)}"><img src="${esc(a.miniatura)}" alt=""><b>${esc(a.nome)}</b>${remover ? `<button data-rm="${esc(a.nome)}" aria-label="Remover foto">${ICO.fechar}</button>` : ''}</div>`;
  return `<div class="chip" title="${esc(a.nome)}">${ICO.arquivo}<b>${esc(a.nome)}</b><small>${tamanhoBonito(a.tam)}</small>${remover ? `<button data-rm="${esc(a.nome)}" aria-label="Remover anexo">${ICO.fechar}</button>` : ''}</div>`;
}
function addEu(m, ultima) {
  const d = document.createElement('div'); d.className = 'msg eu';
  d.innerHTML = (m.imagens && m.imagens.length ? `<div class="fotos-msg">${m.imagens.map(x => `<img src="${esc(x.miniatura)}" alt="${esc(x.nome)}">`).join('')}</div>` : '') +
    (m.anexos && m.anexos.length ? `<div class="anexos-msg">${m.anexos.map(a => chipHTML(a)).join('')}</div>` : '') +
    (m.texto ? `<div class="txt">${esc(m.texto)}</div>` : '');
  {   // qualquer pergunta pode ser copiada ou editada e reenviada (o que vem depois dela é refeito)
    const a = document.createElement('div'); a.className = 'acoes editar';
    a.innerHTML = `<button class="acao" title="Copiar pergunta" aria-label="Copiar pergunta">${ICO.copiar}</button><button class="acao" title="Editar e reenviar" aria-label="Editar e reenviar">${ICO.editar}</button>`;
    a.children[0].onclick = () => copiarTexto(m.texto).then(() => toast('Pergunta copiada.'));
    a.children[1].onclick = () => editarMensagem(m);
    d.appendChild(a);
  }
  coluna().appendChild(d); rolar(true);
}
function addIa(m, ultima) {
  const d = document.createElement('div'); d.className = 'msg ia';
  // modos de estudo: o resultado vira widget (cartões, quiz, correção) no lugar do texto; m.texto continua sendo o Markdown
  const widget = m.cartoes ? htmlCartoes(m) : m.quiz ? htmlQuiz(m) : m.redacao ? htmlRedacao(m) : '';
  d.innerHTML = `<div class="txt${widget ? ' widget' : ''}">${widget || md(m.texto || '')}</div>` +
    (m.erro ? `<div class="nota erro">${esc(m.erro)}</div>` : m.interrompida ? '<div class="nota">Resposta interrompida.</div>' : '');
  if (widget) ligarWidgets(d, m);
  if (!m.interno || m.erro) acoes(d, m, ultima);
  coluna().appendChild(d); enfeitar(d); rolar(); return d.firstChild;
}
/* ---------------- modos de estudo: flashcards, quiz, correção de redação, resumo ----------------
   Cada modo só monta o prompt da próxima mensagem e (quando tem esquema) pede JSON ao motor, que garante a estrutura
   pela gramática; o resultado vira um widget na resposta e um Markdown equivalente (copiar, exportar, ler, histórico). */
ICO.estudo = '<svg viewBox="0 0 24 24"><path d="M4 6.5A2.5 2.5 0 0 1 6.5 4H20v14H6.5A2.5 2.5 0 0 0 4 20.5z"/><path d="M4 6.5v14"/><path d="M8 8h8M8 11.5h6"/></svg>';
ICO.cartoes = '<svg viewBox="0 0 24 24"><rect x="3" y="7" width="14" height="11" rx="2"/><path d="M7 4h14v11"/></svg>';
ICO.quiz = '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1 .9-1 1.7"/><path d="M12 17h.01"/></svg>';
ICO.redacao = '<svg viewBox="0 0 24 24"><path d="M4 20h16"/><path d="M6 16l9.5-9.5a2 2 0 0 1 3 3L9 19H6z"/></svg>';
ICO.resumo = '<svg viewBox="0 0 24 24"><path d="M5 6h14M5 10h14M5 14h9M5 18h6"/></svg>';
ICO.fixar = '<svg viewBox="0 0 24 24"><path d="M9 4h6l-1 6 3 3v2H7v-2l3-3z"/><path d="M12 15v6"/></svg>';
ICO.pasta = '<svg viewBox="0 0 24 24"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>';
ICO.memoria = '<svg viewBox="0 0 24 24"><path d="M12 4a7 7 0 0 1 7 7c0 2.5-1.3 4-2.5 5.5S15 19 15 20H9c0-1-.3-2-1.5-3.5S5 13.5 5 11a7 7 0 0 1 7-7z"/><path d="M9.5 20v1.5h5V20"/></svg>';

/* ---------------- memória: o que a IA sabe sobre quem estuda (lista editável, entra no texto de sistema) ----------------
   "lembre que …" / "anote que …" guarda sem passar pela IA; "esqueça …" apaga. Tudo fica só neste aparelho. */
const RE_LEMBRAR = /^(?:lembre|lembra|anote|anota|guarde|guarda)(?:-se)?\s+(?:que|de que|disso:|:)?\s*(.+)$/i, RE_ESQUECER = /^(?:esque[çc]a|esquece|apague|apaga)\s+(?:que\s+|isso:\s*|:\s*)?(.+)$/i;
function memoria() { try { const m = JSON.parse(pref('memoria') || '[]'); return Array.isArray(m) ? m.filter(x => typeof x === 'string').slice(0, 40) : []; } catch (e) { return []; } }
function salvarMemoria(m) { pref('memoria', JSON.stringify(m.slice(0, 40))); }
function lembrar(texto) { const t = String(texto).trim().replace(/[.!]+$/, '').slice(0, 200); if (!t) return false; const m = memoria(); if (m.some(x => x.toLowerCase() === t.toLowerCase())) return false; m.push(t); salvarMemoria(m); return true; }
function textoMemoria() { const m = memoria(); return m.length ? '\n\nSobre quem está estudando com você (use quando for útil, sem repetir à toa):\n- ' + m.join('\n- ') : ''; }
// mensagem "lembre que…" / "esqueça…": responde na hora, sem a IA; devolve true se tratou
function tratarMemoria(texto) {
  let m = texto.match(RE_LEMBRAR);
  if (m) { const ok = lembrar(m[1]); respostaLocal(ok ? `Anotado: **${m[1].trim().replace(/[.!]+$/, '')}**. Fica em Ajustes → Memória; você pode editar ou apagar quando quiser.` : 'Isso eu já sabia. Está em Ajustes → Memória.'); return true; }
  m = texto.match(RE_ESQUECER);
  if (m) {
    const alvo = m[1].trim().toLowerCase(), antes = memoria();
    const depois = /^tudo$/.test(alvo) ? [] : antes.filter(x => !x.toLowerCase().includes(alvo));
    if (depois.length === antes.length) { if (!antes.length) return false; respostaLocal('Não achei isso na memória. Veja o que eu sei em Ajustes → Memória.'); return true; }
    salvarMemoria(depois); respostaLocal(`Esqueci ${antes.length - depois.length === 1 ? 'isso' : (antes.length - depois.length) + ' itens'}.`); return true;
  }
  return false;
}
function respostaLocal(texto) {   // resposta do próprio app (sem passar pela IA), gravada na conversa
  const msg = { role: 'assistant', texto, llm: texto };
  atual.msgs.push(msg); atual.atualizada = Date.now(); addIa(msg, true); salvar(); desenharLista();
}
function abaMemoria(c) {
  const m = memoria();
  c.innerHTML = `<p class="info" style="margin:0 12px 10px">O que a IA sabe sobre você entra em toda resposta. Diga "lembre que…" no chat ou escreva aqui. Fica só neste aparelho.</p>
    <div class="cartao"><div class="mem-lista">${m.length ? m.map((x, i) => `<div class="mem-item"><span>${esc(x)}</span><button class="icone" data-mem-rm="${i}" aria-label="Apagar">${ICO.apagar}</button></div>`).join('') : '<p class="info" style="margin:8px 12px">Nada ainda. Exemplo: "lembre que estou no 3º ano e vou fazer o ENEM".</p>'}</div>
      <div class="mem-novo"><input id="memNovo" placeholder="Adicionar: ex. estudo engenharia, prefiro exemplos com código" maxlength="200"><button class="btn primario" id="memAdd">Adicionar</button></div></div>
    ${m.length ? `<div class="secao" style="margin-top:14px"><div class="botoes"><button class="btn perigo" id="memLimpar">Esquecer tudo</button></div></div>` : ''}`;
  c.querySelectorAll('[data-mem-rm]').forEach(b => b.onclick = () => { const l = memoria(); l.splice(+b.dataset.memRm, 1); salvarMemoria(l); desenharAba(); desenharNav(); });
  const add = () => { const v = c.querySelector('#memNovo').value; if (lembrar(v)) { desenharAba(); desenharNav(); } else if (v.trim()) toast('Isso já está na memória.'); };
  c.querySelector('#memAdd').onclick = add; c.querySelector('#memNovo').onkeydown = e => { if (e.key === 'Enter') add(); };
  const lim = c.querySelector('#memLimpar'); if (lim) lim.onclick = async () => { if (await confirmar('Esquecer tudo?', '<p>A IA deixa de saber essas coisas sobre você.</p>', 'Esquecer')) { salvarMemoria([]); desenharAba(); desenharNav(); } };
}
// aviso com um botão (ex.: "Desfazer")
function toastAcao(texto, rotulo, fn, ms = 6000) {
  const d = document.createElement('div'); d.className = 'toast acao-toast'; d.setAttribute('role', 'status');
  d.innerHTML = `<span>${esc(texto)}</span><button>${esc(rotulo)}</button>`;
  d.querySelector('button').onclick = () => { d.remove(); fn(); };
  document.body.appendChild(d); setTimeout(() => d.remove(), ms);
}
const ESQ_TXT = { type: 'string' };
const MODOS = {
  flashcards: { nome: 'Flashcards', desc: 'Cartões de pergunta e resposta para revisar depois', ico: 'cartoes', campo: 'cartoes', placeholder: 'Cole o conteúdo ou diga o tema dos flashcards…', espera: 'Montando os flashcards…',
    instrucao: 'Crie de 6 a 12 flashcards de estudo sobre o conteúdo ou tema abaixo. Cada cartão tem "frente" (pergunta ou termo, curta) e "verso" (resposta objetiva, até duas frases). Varie: definição, exemplo, aplicação, comparação. Responda somente com o JSON.',
    esquema: { type: 'object', properties: { cartoes: { type: 'array', minItems: 3, maxItems: 16, items: { type: 'object', properties: { frente: ESQ_TXT, verso: ESQ_TXT }, required: ['frente', 'verso'], additionalProperties: false } } }, required: ['cartoes'], additionalProperties: false } },
  quiz: { nome: 'Quiz', desc: 'Questões de múltipla escolha com correção e explicação', ico: 'quiz', campo: 'quiz', placeholder: 'Cole o conteúdo ou diga o tema do quiz…', espera: 'Montando o quiz…',
    instrucao: 'Crie de 4 a 8 questões de múltipla escolha sobre o conteúdo ou tema abaixo, no estilo ENEM/vestibular. Cada questão tem "pergunta", exatamente 4 "alternativas" (só o texto, sem letras), "correta" (índice de 0 a 3 da alternativa certa — varie a posição) e "explicacao" (por que a certa está certa, curta). Responda somente com o JSON.',
    esquema: { type: 'object', properties: { questoes: { type: 'array', minItems: 2, maxItems: 10, items: { type: 'object', properties: { pergunta: ESQ_TXT, alternativas: { type: 'array', minItems: 4, maxItems: 4, items: ESQ_TXT }, correta: { type: 'integer', minimum: 0, maximum: 3 }, explicacao: ESQ_TXT }, required: ['pergunta', 'alternativas', 'correta', 'explicacao'], additionalProperties: false } } }, required: ['questoes'], additionalProperties: false } },
  redacao: { nome: 'Corrigir redação', desc: 'Nota por competência (ENEM), comentários e versão melhorada', ico: 'redacao', campo: 'redacao', placeholder: 'Cole a redação (e o tema, se tiver)…', espera: 'Corrigindo a redação…',
    instrucao: 'Corrija a redação abaixo como um corretor do ENEM. Dê "notas": 5 números de 0 a 200 (múltiplos de 40) para as competências 1 (norma culta), 2 (compreensão do tema e estrutura dissertativo-argumentativa), 3 (seleção e organização dos argumentos), 4 (coesão) e 5 (proposta de intervenção); "comentarios": 5 textos curtos, um por competência, dizendo o que pesou na nota; "pontos_fortes": um parágrafo; "melhorias": de 3 a 5 sugestões concretas; "versao_melhorada": a redação reescrita aplicando as melhorias. Responda somente com o JSON.',
    esquema: { type: 'object', properties: { notas: { type: 'array', minItems: 5, maxItems: 5, items: { type: 'integer', minimum: 0, maximum: 200 } }, comentarios: { type: 'array', minItems: 5, maxItems: 5, items: ESQ_TXT }, pontos_fortes: ESQ_TXT, melhorias: { type: 'array', minItems: 1, maxItems: 6, items: ESQ_TXT }, versao_melhorada: ESQ_TXT }, required: ['notas', 'comentarios', 'pontos_fortes', 'melhorias', 'versao_melhorada'], additionalProperties: false } },
  resumo: { nome: 'Resumo', desc: 'Resumo de estudo em tópicos, com o essencial', ico: 'resumo', placeholder: 'Cole o conteúdo para resumir…',
    instrucao: 'Faça um resumo de estudo do conteúdo abaixo: comece com a ideia central em uma frase; depois os pontos principais em tópicos curtos, com os termos importantes em negrito; termine com 3 perguntas de autoavaliação. Não invente nada que não esteja no conteúdo.' },
};
const COMPETENCIAS = ['Norma culta', 'Tema e estrutura', 'Argumentação', 'Coesão', 'Proposta de intervenção'];
let modoAtivo = null;   // modo da próxima mensagem (o chip "Modo: …" na caixa)
function definirModo(id) {
  modoAtivo = MODOS[id] ? id : null;
  $('#entrada').placeholder = modoAtivo ? MODOS[modoAtivo].placeholder : 'Pergunte alguma coisa';
  desenharChips(); ajustar(); if (modoAtivo) $('#entrada').focus();
}
function extrairJSON(t) { t = String(t || '').replace(/<think>[\s\S]*?(<\/think>|$)/g, ''); const i = t.indexOf('{'), j = t.lastIndexOf('}'); if (i < 0 || j <= i) return null; try { return JSON.parse(t.slice(i, j + 1)); } catch (e) { return null; } }
const clampN = (v, a, b) => Math.max(a, Math.min(b, Math.round(+v || 0)));
// confere e limpa o JSON que veio do modelo (também vale para o histórico gravado); null se não serve
function normalizarModo(id, d) {
  if (!d || typeof d !== 'object') return null;
  const s = v => typeof v === 'string' ? v.trim().slice(0, 4000) : '';
  if (id === 'flashcards') { const c = (Array.isArray(d.cartoes) ? d.cartoes : []).map(x => x && ({ frente: s(x.frente), verso: s(x.verso) })).filter(x => x && x.frente && x.verso).slice(0, 50); return c.length ? c : null; }
  if (id === 'quiz') {
    const q = (Array.isArray(d.questoes) ? d.questoes : []).map(x => x && Array.isArray(x.alternativas) && ({ pergunta: s(x.pergunta), alternativas: x.alternativas.map(s).slice(0, 4), correta: clampN(x.correta, 0, 3), explicacao: s(x.explicacao) })).filter(x => x && x.pergunta && x.alternativas.length === 4 && x.alternativas.every(Boolean)).slice(0, 20);
    if (!q.length) return null;
    const r = Array.isArray(d.respostas) ? d.respostas.map(v => v === null || v === undefined ? null : clampN(v, 0, 3)) : [];
    return { questoes: q, respostas: q.map((_, i) => r[i] === undefined ? null : r[i]) };
  }
  if (id === 'redacao') {
    if (!Array.isArray(d.notas) || d.notas.length !== 5) return null;
    return { notas: d.notas.map(v => clampN(v, 0, 200)), comentarios: (Array.isArray(d.comentarios) ? d.comentarios : []).map(s).concat(['', '', '', '', '']).slice(0, 5), pontos_fortes: s(d.pontos_fortes), melhorias: (Array.isArray(d.melhorias) ? d.melhorias : []).map(s).filter(Boolean).slice(0, 8), versao_melhorada: s(d.versao_melhorada).slice(0, 12000) };
  }
  return null;
}
const LETRAS = ['a', 'b', 'c', 'd'];
// versão em Markdown do resultado (copiar, exportar, ler em voz alta e o que o modelo "lembra" nas próximas mensagens)
function markdownDoModo(id, d) {
  if (id === 'flashcards') return `**Flashcards (${d.length})**\n\n` + d.map((c, i) => `${i + 1}. **${c.frente}**\n   ${c.verso}`).join('\n');
  if (id === 'quiz') return `**Quiz (${d.questoes.length} questões)**\n\n` + d.questoes.map((q, i) => `**${i + 1}. ${q.pergunta}**\n${q.alternativas.map((a, k) => `${LETRAS[k]}) ${a}`).join('\n')}\n\nResposta: **${LETRAS[q.correta]})** — ${q.explicacao}`).join('\n\n');
  if (id === 'redacao') { const total = d.notas.reduce((a, b) => a + b, 0); return `**Correção da redação — ${total}/1000**\n\n${d.notas.map((n, i) => `- **Competência ${i + 1} (${COMPETENCIAS[i]}): ${n}** — ${d.comentarios[i]}`).join('\n')}\n\n**Pontos fortes:** ${d.pontos_fortes}\n\n**O que melhorar:**\n${d.melhorias.map(m => `- ${m}`).join('\n')}\n\n**Versão melhorada:**\n\n${d.versao_melhorada}`; }
  return '';
}
function htmlCartoes(m) {
  return `<div class="fc-grid">${m.cartoes.map((c, i) => `<button class="fc" data-i="${i}" aria-label="Cartão ${i + 1}: toque para virar"><span class="fc-n">${i + 1}</span><span class="fc-frente">${esc(c.frente)}</span><span class="fc-verso">${esc(c.verso)}</span></button>`).join('')}</div>
    <div class="fc-acoes"><button class="btn" data-fc="salvar">${ICO.cartoes}<span>Guardar no baralho</span></button><button class="btn link" data-fc="anki">Exportar para o Anki</button></div>`;
}
function htmlQuiz(m) {
  const q = m.quiz;
  return `<div class="qz-lista">${q.questoes.map((x, i) => { const r = q.respostas[i]; return `<div class="qz${r === null ? '' : ' respondida'}" data-q="${i}"><p class="qz-p"><b>${i + 1}.</b> ${esc(x.pergunta)}</p><div class="qz-alts">${x.alternativas.map((a, k) => `<button class="alt${r === null ? '' : k === x.correta ? ' certa' : k === r ? ' errada' : ''}" data-a="${k}"${r === null ? '' : ' disabled'}><i>${LETRAS[k]}</i><span>${esc(a)}</span></button>`).join('')}</div><p class="qz-exp"${r === null ? ' hidden' : ''}><b>${r === x.correta ? 'Acertou.' : 'Errou.'}</b> ${esc(x.explicacao)}</p></div>`; }).join('')}</div>
    <div class="qz-fim"${q.respostas.some(r => r === null) ? ' hidden' : ''}></div>`;
}
function htmlRedacao(m) {
  const d = m.redacao, total = d.notas.reduce((a, b) => a + b, 0);
  return `<div class="rd"><div class="rd-total"><b>${total}</b><small>de 1000</small></div>
    <table class="rd-tab">${d.notas.map((n, i) => `<tr><td>C${i + 1}</td><td>${esc(COMPETENCIAS[i])}</td><td class="rd-n">${n}</td><td>${esc(d.comentarios[i])}</td></tr>`).join('')}</table>
    <p><b>Pontos fortes:</b> ${esc(d.pontos_fortes)}</p><p><b>O que melhorar:</b></p><ul>${d.melhorias.map(x => `<li>${esc(x)}</li>`).join('')}</ul>
    <details class="passos"><summary>Versão melhorada</summary>${md(d.versao_melhorada)}</details></div>`;
}
function ligarWidgets(d, m) {
  d.querySelectorAll('.fc').forEach(b => b.onclick = () => b.classList.toggle('virado'));
  const bs = d.querySelector('[data-fc="salvar"]'); if (bs) bs.onclick = () => guardarNoBaralho(m.cartoes, atual ? atual.titulo : '');
  const ba = d.querySelector('[data-fc="anki"]'); if (ba) ba.onclick = () => exportarAnki(m.cartoes);
  if (m.quiz) {
    d.querySelectorAll('.qz .alt').forEach(b => b.onclick = () => {
      const bloco = b.closest('.qz'), i = +bloco.dataset.q, k = +b.dataset.a, x = m.quiz.questoes[i];
      if (m.quiz.respostas[i] !== null) return;
      m.quiz.respostas[i] = k; salvar();
      bloco.classList.add('respondida'); bloco.querySelectorAll('.alt').forEach(a => { a.disabled = true; const j = +a.dataset.a; a.classList.toggle('certa', j === x.correta); a.classList.toggle('errada', j === k && k !== x.correta); });
      const ex = bloco.querySelector('.qz-exp'); ex.hidden = false; ex.firstChild.textContent = k === x.correta ? 'Acertou.' : 'Errou.';
      const b2 = baralho(); b2.quizzes = (b2.quizzes || 0) + 1; if (k === x.correta) b2.quizAcertos = (b2.quizAcertos || 0) + 1; salvarBaralho(b2);
      if (!m.quiz.respostas.some(r => r === null)) placarQuiz(d, m);
    });
    if (!m.quiz.respostas.some(r => r === null)) placarQuiz(d, m);
  }
}
function placarQuiz(d, m) {
  const q = m.quiz, acertos = q.questoes.filter((x, i) => q.respostas[i] === x.correta).length, erradas = q.questoes.map((x, i) => q.respostas[i] !== x.correta ? i : -1).filter(i => i >= 0);
  const f = d.querySelector('.qz-fim'); if (!f) return;
  f.hidden = false; f.innerHTML = `<b>${acertos} de ${q.questoes.length}</b> ${acertos === q.questoes.length ? '— tudo certo!' : ''}${erradas.length ? `<button class="btn" data-qz="explicar">Explicar o que errei</button>` : ''}`;
  const be = f.querySelector('[data-qz="explicar"]'); if (be) be.onclick = () => enviar('Explique com calma as questões que eu errei no quiz acima, mostrando por que a alternativa certa é a certa e por que a que eu marquei está errada:\n\n' + erradas.map(i => `Questão ${i + 1}: marquei "${q.questoes[i].alternativas[q.respostas[i]]}"; a certa era "${q.questoes[i].alternativas[q.questoes[i].correta]}".`).join('\n'));
}
/* baralho: cartões guardados, com repetição espaçada (SM-2) e revisão do dia */
function baralho() { try { const b = JSON.parse(pref('baralho') || 'null'); if (b && Array.isArray(b.cartoes)) return b; } catch (e) {} return { cartoes: [], revisoes: 0, acertos: 0 }; }
function salvarBaralho(b) { pref('baralho', JSON.stringify(b)); }
const paraRevisar = b => b.cartoes.filter(c => (c.prox || 0) <= Date.now());
function guardarNoBaralho(cartoes, tema) {
  const b = baralho(); let n = 0;
  for (const c of cartoes) { if (b.cartoes.some(x => x.frente === c.frente)) continue; b.cartoes.push({ id: novoId(), frente: c.frente, verso: c.verso, tema: String(tema || '').slice(0, 80), criado: Date.now(), prox: Date.now(), intervalo: 0, fator: 2.5, reps: 0 }); n++; }
  salvarBaralho(b); toast(n ? `${n} ${n === 1 ? 'cartão guardado' : 'cartões guardados'} no baralho. Revise em Ajustes → Estudo.` : 'Esses cartões já estão no baralho.', 3500);
}
function agendarCartao(c, q) {   // q: 0 errei · 3 difícil · 4 bom · 5 fácil (SM-2)
  if (q < 3) { c.reps = 0; c.intervalo = 0; c.prox = Date.now() + 10 * 60000; }
  else {
    c.reps = (c.reps || 0) + 1;
    c.intervalo = c.reps === 1 ? 1 : c.reps === 2 ? 6 : Math.round((c.intervalo || 1) * (c.fator || 2.5));
    c.fator = Math.max(1.3, (c.fator || 2.5) + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)));
    c.prox = Date.now() + c.intervalo * 86400000;
  }
  c.ultima = Date.now();
}
function exportarAnki(cartoes) {
  const limpo = t => String(t).replace(/\t/g, ' ').replace(/\r?\n/g, '<br>');
  PLATAFORMA.salvarArquivo('flashcards-propons.txt', '#separator:tab\n#html:true\n' + cartoes.map(c => `${limpo(c.frente)}\t${limpo(c.verso)}`).join('\n') + '\n', 'text/plain').then(r => r !== false && toast('Arquivo pronto para importar no Anki.')).catch(e => toast('Não foi possível exportar: ' + e.message));
}
function abrirRevisao() {
  const b = baralho(); const fila = paraRevisar(b);
  if (!fila.length) { toast('Nenhum cartão para revisar agora.'); return; }
  const f = document.createElement('div'); f.className = 'dlg-fundo';
  f.innerHTML = `<div class="dlg folha revisao">${topoCentro('Revisar')}<div class="rv"></div></div>`;
  const folha = f.firstChild, sair = () => animarSaida(f, folha);
  f.fechar = sair; f.onclick = e => { if (e.target === f) sair(); }; folha.querySelector('[data-x]').onclick = sair;
  folhaArrastavel(f, folha, sair);
  let i = 0, feitos = 0, certos = 0;
  const desenhar = () => {
    const rv = folha.querySelector('.rv');
    if (i >= fila.length) { rv.innerHTML = `<div class="rv-fim"><b>${feitos} ${feitos === 1 ? 'cartão revisado' : 'cartões revisados'}</b><p class="info">${certos} de ${feitos} lembrados. Os que você errou voltam em 10 minutos; os outros, em ${fila.length ? 'alguns dias' : ''}.</p><button class="btn primario" data-rv="fim">Concluir</button></div>`; rv.querySelector('[data-rv="fim"]').onclick = sair; return; }
    const c = fila[i];
    rv.innerHTML = `<p class="info rv-conta">${i + 1} de ${fila.length}${c.tema ? ' · ' + esc(c.tema) : ''}</p><div class="rv-cartao"><div class="rv-frente">${esc(c.frente)}</div><div class="rv-verso" hidden>${esc(c.verso)}</div></div>
      <div class="rv-botoes"><button class="btn primario" data-rv="mostrar">Mostrar resposta</button></div>
      <div class="rv-botoes rv-notas" hidden><button class="btn" data-q="0">Errei</button><button class="btn" data-q="3">Difícil</button><button class="btn" data-q="4">Bom</button><button class="btn" data-q="5">Fácil</button></div>`;
    rv.querySelector('[data-rv="mostrar"]').onclick = () => { rv.querySelector('.rv-verso').hidden = false; rv.querySelector('[data-rv="mostrar"]').parentNode.hidden = true; rv.querySelector('.rv-notas').hidden = false; };
    rv.querySelectorAll('[data-q]').forEach(bt => bt.onclick = () => {
      const q = +bt.dataset.q; agendarCartao(c, q); feitos++; if (q >= 3) certos++;
      const b2 = baralho(); const alvo = b2.cartoes.find(x => x.id === c.id); if (alvo) Object.assign(alvo, c); b2.revisoes = (b2.revisoes || 0) + 1; if (q >= 3) b2.acertos = (b2.acertos || 0) + 1; salvarBaralho(b2);
      i++; desenhar();
    });
  };
  desenhar();
  pausarDesenho(); document.body.appendChild(f); posicionarPop(f, folha, $('#anexar'));
}
function abrirModos() {
  const b = baralho(), n = paraRevisar(b).length;
  const f = document.createElement('div'); f.className = 'dlg-fundo';
  f.innerHTML = `<div class="dlg folha modos">${topoCentro('Modos de estudo', true)}
    <div class="opcoes linhas">${Object.entries(MODOS).map(([k, m]) => `<button data-modo="${k}"><span class="oi">${ICO[m.ico]}</span><span class="pt"><b>${m.nome}</b><small>${m.desc}</small></span>${ICO.seta}</button>`).join('')}</div>
    <div class="opcoes linhas" style="margin-top:12px"><button data-modo="revisar"${b.cartoes.length ? '' : ' disabled'}><span class="oi">${ICO.estudo}</span><span class="pt"><b>Revisar cartões</b><small>${b.cartoes.length ? (n ? `${n} para hoje` : 'nenhum para hoje') + ` · ${b.cartoes.length} no baralho` : 'Guarde flashcards para revisar aqui'}</small></span>${ICO.seta}</button></div></div>`;
  const folha = f.firstChild, sair = () => animarSaida(f, folha);
  f.fechar = sair; f.onclick = e => { if (e.target === f) sair(); }; folha.querySelector('[data-x]').onclick = () => { sair(); abrirMais(); };
  folhaArrastavel(f, folha, sair);
  folha.querySelectorAll('[data-modo]').forEach(bt => bt.onclick = () => { sair(); if (bt.dataset.modo === 'revisar') abrirRevisao(); else { definirModo(bt.dataset.modo); toast(`Modo ${MODOS[bt.dataset.modo].nome}: cole o conteúdo ou diga o tema e envie.`, 3500); } });
  pausarDesenho(); document.body.appendChild(f); posicionarPop(f, folha, $('#anexar'));
}
function abaEstudo(c) {
  const b = baralho(), n = paraRevisar(b).length, pct = b.quizzes ? Math.round(100 * (b.quizAcertos || 0) / b.quizzes) : null;
  c.innerHTML = `<div class="secao"><h4>Flashcards</h4><div class="cartao"><button class="lm" id="revisarHoje"${n ? '' : ' disabled'}><span class="pt"><b>Revisar hoje</b><small>${b.cartoes.length ? (n ? `${n} ${n === 1 ? 'cartão está' : 'cartões estão'} na hora de revisar` : 'Nada para revisar agora — os cartões voltam nos dias marcados') : 'Nenhum cartão ainda. Use "+" → Modos de estudo → Flashcards e guarde no baralho.'}</small></span>${ICO.seta}</button></div>
      <p class="info" style="margin:8px 12px 0">${b.cartoes.length} ${b.cartoes.length === 1 ? 'cartão' : 'cartões'} no baralho · ${b.revisoes || 0} ${(b.revisoes || 0) === 1 ? 'revisão' : 'revisões'}${b.revisoes ? ` · ${Math.round(100 * (b.acertos || 0) / b.revisoes)}% lembrados` : ''}</p></div>
    <div class="secao" style="margin-top:18px"><h4>Quizzes</h4><p class="info" style="margin:0 12px">${b.quizzes ? `${b.quizzes} ${b.quizzes === 1 ? 'questão respondida' : 'questões respondidas'} · ${pct}% de acerto` : 'Nenhuma questão respondida ainda. Use "+" → Modos de estudo → Quiz.'}</p></div>
    <div class="secao" style="margin-top:18px"><h4>Baralho</h4><div class="botoes" style="justify-content:flex-start;padding:0 12px"><button class="btn" id="expBaralho"${b.cartoes.length ? '' : ' disabled'}>Exportar para o Anki</button><button class="btn perigo" id="apagarBaralho"${b.cartoes.length ? '' : ' disabled'}>Apagar o baralho</button></div></div>`;
  c.querySelector('#revisarHoje').onclick = () => abrirRevisao();
  c.querySelector('#expBaralho').onclick = () => exportarAnki(b.cartoes);
  c.querySelector('#apagarBaralho').onclick = async () => { if (await confirmar('Apagar o baralho?', `<p>${b.cartoes.length} cartões e o histórico de revisões serão apagados.</p>`, 'Apagar')) { salvarBaralho({ cartoes: [], revisoes: 0, acertos: 0 }); desenharAba(); desenharNav(); } };
}

/* ---------------- ler em voz alta (voz do sistema) ----------------
   Botão de alto-falante em cada resposta; com "Ler em voz alta: toda resposta" (Aparência) a leitura começa enquanto
   a resposta ainda está chegando, frase por frase. Só uma leitura por vez; o mesmo botão para. */
ICO.falar = '<svg viewBox="0 0 24 24"><path d="M4 10v4h3.5L13 18.5v-13L7.5 10H4z"/><path d="M16.5 9.5a3.5 3.5 0 0 1 0 5"/><path d="M19 7a7 7 0 0 1 0 10"/></svg>';
ICO.pararFala = '<svg viewBox="0 0 24 24"><rect x="6.5" y="6.5" width="11" height="11" rx="2"/></svg>';
let falaAtual = null, falaSeq = 0;   // { msg, ultimoId, narrando, terminou, fimIds }
function frasesDe(t) {   // frases para a fila do sintetizador (uma fala longa demais é cortada pelo Chromium)
  const out = []; let resto = String(t || '').trim();
  while (resto.length > 320) { let c = resto.lastIndexOf(', ', 300); if (c < 100) c = resto.lastIndexOf(' ', 300); if (c < 1) c = 300; out.push(resto.slice(0, c + 1).trim()); resto = resto.slice(c + 1).trim(); }
  if (resto) out.push(resto);
  return out;
}
function frasesCompletas(t, fim) {   // → { frases, consumido }: frases terminadas (a última só no fim)
  const frases = []; let pos = 0; const re = /[.!?…]+["”)]*\s+|\n+/g; let m;
  while ((m = re.exec(t))) { const f = t.slice(pos, m.index + m[0].length).trim(); if (f) frases.push(...frasesDe(f)); pos = m.index + m[0].length; }
  if (fim) { const f = t.slice(pos).trim(); if (f) frases.push(...frasesDe(f)); pos = t.length; }
  return { frases, consumido: pos };
}
function botoesLer(m) { return [...document.querySelectorAll('.acao.ler')].filter(b => b._msg === m); }
function marcarLendo(m, sim) { botoesLer(m).forEach(b => { b.classList.toggle('on', sim); b.innerHTML = sim ? ICO.pararFala : ICO.falar; b.title = sim ? 'Parar de ler' : 'Ouvir a resposta'; b.setAttribute('aria-label', b.title); }); }
function fimLeitura() { if (!falaAtual) return; marcarLendo(falaAtual.msg, false); falaAtual = null; }
function pararLeitura() { if (!falaAtual) return; PLATAFORMA.pararFala(); fimLeitura(); }
function falarFrases(frases) { frases.forEach(f => { const id = 'f' + (++falaSeq); falaAtual.ultimoId = id; PLATAFORMA.falar(f, id); }); }
PLATAFORMA.ao('fala', d => {
  if (!falaAtual) return;
  if (d.estado === 'erro') { toast('Não foi possível ler em voz alta neste aparelho.', 3500); fimLeitura(); return; }
  falaAtual.fimIds.add(d.id);
  if (d.id === falaAtual.ultimoId && (!falaAtual.narrando || falaAtual.terminou)) fimLeitura();
});
function lerMensagem(m) {
  if (falaAtual && falaAtual.msg === m) { pararLeitura(); return; }
  pararLeitura();
  const { frases } = frasesCompletas(textoParaFala(m.texto), true); if (!frases.length) return;
  falaAtual = { msg: m, ultimoId: '', narrando: false, terminou: true, fimIds: new Set() };
  marcarLendo(m, true); falarFrases(frases);
}
function novoNarrador(msg) {   // lê enquanto a resposta chega: cada frase completa entra na fila
  pararLeitura();
  falaAtual = { msg, ultimoId: '', narrando: true, terminou: false, fimIds: new Set() };
  let lido = 0;
  return {
    alimentar(texto, fim) {
      if (!falaAtual || falaAtual.msg !== msg) return;
      const plano = textoParaFala(texto);
      const { frases, consumido } = frasesCompletas(plano.slice(lido), fim); lido += consumido;
      if (frases.length) falarFrases(frases);
      if (fim) { falaAtual.terminou = true; if (!falaAtual.ultimoId || falaAtual.fimIds.has(falaAtual.ultimoId)) fimLeitura(); else marcarLendo(msg, true); }
    },
  };
}

function acoes(d, m, ultima) {
  const a = document.createElement('div'); a.className = 'acoes';
  if (m.texto && !m.interno) {
    const bc = document.createElement('button'); bc.className = 'acao'; bc.title = 'Copiar resposta'; bc.setAttribute('aria-label', 'Copiar resposta'); bc.innerHTML = ICO.copiar;
    bc.onclick = () => copiarTexto(m.texto).then(() => { bc.innerHTML = ICO.ok; bc.classList.add('feito'); setTimeout(() => { bc.innerHTML = ICO.copiar; bc.classList.remove('feito'); }, 1400); });
    a.appendChild(bc);
    if (PLATAFORMA.temFala) {
      const bl = document.createElement('button'); bl.className = 'acao ler'; bl._msg = m; bl.innerHTML = ICO.falar; bl.title = 'Ouvir a resposta'; bl.setAttribute('aria-label', bl.title);
      bl.onclick = () => lerMensagem(m); a.appendChild(bl);
      if (falaAtual && falaAtual.msg === m) setTimeout(() => marcarLendo(m, true), 0);
    }
    if (PLATAFORMA.podeCompartilhar) {
      const bs = document.createElement('button'); bs.className = 'acao'; bs.title = 'Compartilhar'; bs.setAttribute('aria-label', 'Compartilhar resposta'); bs.innerHTML = ICO.compartilhar;
      bs.onclick = () => PLATAFORMA.compartilhar(m.texto).catch(() => {}); a.appendChild(bs);
    }
  }
  if (!m.interno) {   // qualquer resposta: gerar de novo (a partir dela) e ramificar a conversa até aqui
    const br = document.createElement('button'); br.className = 'acao recarregar'; br.title = ultima ? 'Gerar de novo' : 'Gerar de novo a partir daqui (o que vem depois é refeito)'; br.setAttribute('aria-label', br.title); br.innerHTML = ICO.recarregar;
    br.onclick = () => regenerarDe(m); a.appendChild(br);
    if (!ultima) { const bf = document.createElement('button'); bf.className = 'acao ramificar'; bf.title = 'Ramificar: nova conversa até aqui'; bf.setAttribute('aria-label', bf.title); bf.innerHTML = ICO.ramificar; bf.onclick = () => ramificar(m); a.appendChild(bf); }
  }
  if (ultima) {
    document.querySelectorAll('.acao.continuar').forEach(b => b.remove());
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
  const c = $('#chips'); c.hidden = !anexos.length && !modoAtivo;
  c.innerHTML = (modoAtivo ? `<div class="chip modo">${ICO[MODOS[modoAtivo].ico]}<b>Modo: ${esc(MODOS[modoAtivo].nome)}</b><button data-rm-modo aria-label="Sair do modo">${ICO.fechar}</button></div>` : '') + anexos.map(a => chipHTML(a, true)).join('');
  const rm = c.querySelector('[data-rm-modo]'); if (rm) rm.onclick = () => definirModo(null);
  c.querySelectorAll('[data-rm]').forEach(b => b.onclick = () => { anexos = anexos.filter(a => a.nome !== b.dataset.rm); desenharChips(); ajustar(); });
  ajustar();
}
// foto → JPEG reduzido (lado maior até 1024 px) para a IA + miniatura para o histórico
async function prepararFoto(f) {
  const img = await createImageBitmap(f, { imageOrientation: 'from-image' });   // respeita a rotação do EXIF (foto do celular)
  const reduzir = (max, q) => {
    const k = Math.min(1, max / Math.max(img.width, img.height));
    const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(img.width * k)); c.height = Math.max(1, Math.round(img.height * k));
    const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL('image/jpeg', q);
  };
  const r = { dataUrl: reduzir(estreita() ? 896 : 1024, 0.85), miniatura: reduzir(240, 0.72) };
  img.close && img.close();
  return r;
}
/* ---------------- documentos: PDF e DOCX viram texto na própria página ----------------
   pdf.js e mammoth vêm dentro do index.html como texto (src/vendor) e só são carregados na primeira vez. */
const LIMITE_DOC = 40 * 1048576, MAX_PAGINAS = 300, MAX_TEXTO_DOC = 200000;
const scriptDe = id => { const el = document.getElementById(id); if (!el || !el.textContent) throw new Error('biblioteca não embutida'); return URL.createObjectURL(new Blob([el.textContent], { type: 'text/javascript' })); };
let pdfjs = null, mammothLib = null;
async function carregarPdfjs() {
  if (pdfjs) return pdfjs;
  const mod = await import(scriptDe('vendor-pdf'));
  mod.GlobalWorkerOptions.workerPort = new Worker(scriptDe('vendor-pdf-worker'), { type: 'module' });
  return pdfjs = mod;
}
async function carregarMammoth() {
  if (mammothLib) return mammothLib;
  await new Promise((ok, falha) => { const s = document.createElement('script'); s.src = scriptDe('vendor-mammoth'); s.onload = ok; s.onerror = () => falha(new Error('mammoth não carregou')); document.head.appendChild(s); });
  return mammothLib = window.mammoth;
}
// → { texto, paginas, cortado }: texto por página ("— página N —"), até MAX_PAGINAS páginas e MAX_TEXTO_DOC caracteres
async function extrairPdf(f) {
  const lib = await carregarPdfjs();
  const doc = await lib.getDocument({ data: new Uint8Array(await f.arrayBuffer()), isEvalSupported: false, useSystemFonts: true }).promise;
  const partes = []; let total = 0, cortado = false;
  const n = Math.min(doc.numPages, MAX_PAGINAS);
  for (let p = 1; p <= n; p++) {
    const pg = await doc.getPage(p); const tc = await pg.getTextContent();
    let t = ''; for (const it of tc.items) { if (it.str) t += it.str; if (it.hasEOL) t += '\n'; else if (it.str && !/\s$/.test(it.str)) t += ' '; }
    t = t.replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').replace(/[ ]{2,}/g, ' ').trim();
    if (t) partes.push(`— página ${p} —\n${t}`);
    total += t.length; if (total > MAX_TEXTO_DOC) { cortado = true; break; }
  }
  if (doc.numPages > n) cortado = true;
  try { await doc.destroy(); } catch (e) {}
  return { texto: partes.join('\n\n'), paginas: doc.numPages, cortado };
}
async function extrairDocx(f) {
  const lib = await carregarMammoth();
  const r = await lib.extractRawText({ arrayBuffer: await f.arrayBuffer() });
  const t = String(r.value || '').replace(/\n{3,}/g, '\n\n').trim();
  return { texto: t.slice(0, MAX_TEXTO_DOC), paginas: 0, cortado: t.length > MAX_TEXTO_DOC };
}
async function adicionarArquivos(lista) {
  for (const f of lista) {
    if (eFoto(f)) {
      if (!PLATAFORMA.temVisao) { toast('Neste aparelho a IA ainda não lê fotos.', 3500); continue; }
      if (anexos.filter(a => a.tipo === 'imagem').length >= MAX_FOTOS) { toast(`Até ${MAX_FOTOS} fotos por mensagem.`); continue; }
      if (f.size > 40 * 1048576) { toast(`"${f.name}" é grande demais.`); continue; }
      try {
        const { dataUrl, miniatura } = await prepararFoto(f);
        let nome = f.name || 'foto.jpg'; if (anexos.some(a => a.nome === nome)) nome = nome.replace(/(\.\w+)?$/, '-' + (anexos.length + 1) + '$1');
        anexos.push({ tipo: 'imagem', nome, tam: f.size, dataUrl, miniatura });
        guardarNaBiblioteca({ tipo: 'imagem', nome, tam: f.size, dataUrl, miniatura });
      } catch (e) { toast(`Não consegui abrir "${f.name}"${/heic|heif/i.test(f.name) ? ' (formato HEIC: tire a foto em JPEG ou use "Mais compatível" na câmera)' : ''}.`, 4500); }
      continue;
    }
    if (anexos.filter(a => a.tipo !== 'imagem').length >= MAX_ANEXOS) { toast(`Até ${MAX_ANEXOS} arquivos por mensagem.`); break; }
    if (/\.(pdf|docx)$/i.test(f.name)) {
      const ePdf = /\.pdf$/i.test(f.name);
      if (f.size > LIMITE_DOC) { toast(`"${f.name}" é grande demais (${tamanhoBonito(f.size)}). Limite: 40 MB.`, 3500); continue; }
      if (anexos.some(a => a.nome === f.name)) continue;
      if (ESCOLHER) { toast('Mande a primeira mensagem para ligar a IA; depois anexe o documento.', 4000); continue; }
      toast(ePdf ? 'Lendo o PDF…' : 'Lendo o documento…', 2500);
      let d;
      try { d = ePdf ? await extrairPdf(f) : await extrairDocx(f); }
      catch (e) { toast(`Não consegui ler "${f.name}"${/password|senha|encrypt/i.test(e.message || '') ? ' (tem senha)' : ''}.`, 4000); continue; }
      if (!d.texto.trim()) { toast(ePdf ? `"${f.name}" não tem texto (pode ser só imagem — mande as páginas como fotos).` : `"${f.name}" está vazio.`, 4500); continue; }
      // quanto cabe na memória da IA nesta conversa (o resto é cortado ao enviar)
      const cabe = Math.max(1200, nCtx - estimar(SYSTEM) - 1500 - 300), tokens = estimar(d.texto);
      if (tokens > cabe) toast(`"${f.name}"${d.paginas ? ` (${d.paginas} páginas)` : ''} é longo: a IA lê cerca de ${Math.round(100 * cabe / tokens)}% dele nesta conversa. Pergunte sobre partes específicas ou mande um trecho.`, 6000);
      else if (d.cortado) toast(`"${f.name}": usei as primeiras ${MAX_PAGINAS} páginas.`, 4000);
      anexos.push({ nome: f.name, tam: f.size, lang: 'texto', conteudo: d.texto, paginas: d.paginas });
      guardarNaBiblioteca({ tipo: 'arquivo', nome: f.name, tam: f.size, lang: 'texto', conteudo: d.texto });
      continue;
    }
    if (/\.(docx?|pptx?|xlsx?|zip|rar|7z|exe|mp[34])$/i.test(f.name) || (f.type && /^(video|audio)\//.test(f.type))) {
      toast(`"${f.name}": por enquanto fotos, PDF, DOCX, textos e códigos.`, 3500); continue;
    }
    if (f.size > LIMITE_ANEXO) { toast(`"${f.name}" é grande demais (${tamanhoBonito(f.size)}). Limite: 40 KB.`, 3500); continue; }
    let texto = '';
    try { texto = await f.text(); } catch (e) { toast(`Não consegui ler "${f.name}".`); continue; }
    if (/\u0000/.test(texto) || (!TEXTO_OK.test(f.name) && /[\u0001-\u0008\u000e-\u001f]/.test(texto.slice(0, 2000)))) { toast(`"${f.name}" não parece ser um arquivo de texto.`); continue; }
    if (anexos.some(a => a.nome === f.name)) continue;
    anexos.push({ nome: f.name, tam: f.size, lang: langDoArquivo(f.name), conteudo: texto });
    guardarNaBiblioteca({ tipo: 'arquivo', nome: f.name, tam: f.size, lang: langDoArquivo(f.name), conteudo: texto });
  }
  desenharChips();
}
$('#anexar').onclick = () => abrirMais();
['arquivo', 'fotos', 'camera'].forEach(id => $('#' + id).onchange = e => { adicionarArquivos([...e.target.files]); e.target.value = ''; });

/* ---------------- falar: gravar e transcrever (qualquer tamanho) ----------------
   Áudio longo é cortado em trechos (nos silêncios) e transcrito um por um; áudio curtinho ganha silêncio
   em volta, porque o whisper ignora trechos com menos de 1 segundo. */
const TRECHO = PLATAFORMA.tipo === 'ios' ? 50 : 180;   // segundos por trecho (o reconhecimento do iPhone aceita ~1 min)
let gravacao = null, transcrevendo = false, esperaVoz = null, trechoAtual = null, cancelarTranscricao = null;
const AVISO_GRAV = 10 * 60, LIMITE_GRAV = 30 * 60;   // segundos: aviso e parada automática (memória do celular)
const mmss = s => (s >= 3600 ? Math.floor(s / 3600) + ':' + String(Math.floor(s / 60) % 60).padStart(2, '0') : Math.floor(s / 60)) + ':' + String(Math.floor(s % 60)).padStart(2, '0');
function barraGravacao(modo, texto, pct) {
  const g = $('#gravando');
  if (!modo) { g.hidden = true; return; }
  g.hidden = false;
  const grav = modo === 'gravando';
  $('#cancelarGrav').disabled = false; $('#cancelarGrav').title = grav ? 'Cancelar gravação' : 'Cancelar transcrição';
  $('#pararGrav').disabled = !grav; $('#pararGrav').classList.toggle('carregando', !grav);
  g.classList.toggle('transcrevendo', !grav);
  if (!grav) $('#tempoGrav').textContent = 'Transcrevendo'; else if (texto !== undefined) $('#tempoGrav').textContent = texto;
}
// a voz (whisper) é baixada uma vez: pede confirmação e espera o download
async function garantirVoz() {
  if (!PLATAFORMA.temTranscricao) { toast('Neste aparelho a transcrição ainda não está disponível.'); return false; }
  const s = await lerSistema();
  if (!s || !s.vozes) return true;                       // iPhone: reconhecimento de voz do próprio iOS
  if (s.temTranscricao === false) { toast('Transcrição não disponível nesta versão.'); return false; }
  const v = s.vozes.find(x => x.atual) || s.vozes[0];
  if (PLATAFORMA.tipo === 'web') {
    if (PLATAFORMA.urlTranscricao || s.transcricaoUrl) { if (!PLATAFORMA.urlTranscricao) PLATAFORMA.urlTranscricao = s.transcricaoUrl; return true; }
    await perguntar('Transcrever áudio no Linux', `<p>Para transformar fala em texto, ligue a transcrição pelo terminal (baixa a voz de ${gbBonito(v.tamanho)} uma vez) e abra de novo:</p><div class="cmd"><code id="cmdVoz">propons-ia --voz</code><button class="icone" data-copiar="cmdVoz">${ICO.copiar}</button></div><p class="info" style="margin-top:8px">Voz mais precisa (190 MB): <code>propons-ia --voz small</code></p>`, [['Entendi', true, 'primario']]);
    return false;
  }
  if (v.baixado) return true;
  if (!await confirmar('Transcrever áudio', `<p>Para transformar fala em texto, a IA usa a <b>${esc(v.nome)}</b> (${gbBonito(v.tamanho)}), baixada uma vez só. Depois funciona sem internet.</p><p>Dá para trocar pela voz mais precisa em Ajustes → Modelos de IA.</p>`, 'Baixar')) return false;
  try { baixando[v.id] = { pct: 0, feito: 0, total: v.tamanho }; await PLATAFORMA.baixarVoz(v.id); }
  catch (e) { delete baixando[v.id]; toast('Não foi possível: ' + e.message, 4000); return false; }
  toast('Baixando a voz…', 2500);
  return new Promise(res => { esperaVoz = { id: v.id, res }; setTimeout(() => { if (esperaVoz && esperaVoz.res === res) { esperaVoz = null; res(false); } }, 30 * 60000); });   // nunca fica esperando para sempre
}
// ondas: cobrem a largura toda e cada barrinha é o volume real de um instante (a mais nova entra pela direita)
function montarOnda() {
  const o = $('#onda'), n = Math.max(12, Math.floor((o.clientWidth || 200) / 6));
  o.innerHTML = '<i></i>'.repeat(n);
  return [...o.children];
}
const nivelDaOnda = rms => { const db = 20 * Math.log10(rms + 1e-6); return Math.max(0.1, Math.min(1, (db + 58) / 46)); };   // -58 dB (silêncio) → 10%, -12 dB (voz alta) → 100%
async function iniciarGravacao() {
  if (gravacao || transcrevendo || geracao) return;
  if (!navigator.mediaDevices || !window.MediaRecorder) { toast('Este aparelho não permite gravar aqui. Use "+" → Áudio para mandar um arquivo.', 4500); return; }
  if (!(await garantirVoz())) return;
  let fluxo;
  try { fluxo = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, channelCount: 1 } }); }
  catch (e) { toast('Não foi possível usar o microfone: ' + (e.name === 'NotAllowedError' ? 'permissão negada.' : e.name === 'NotFoundError' ? 'nenhum microfone encontrado.' : e.message), 4500); return; }
  const tipo = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg'].find(t => MediaRecorder.isTypeSupported(t)) || '';
  const rec = new MediaRecorder(fluxo, tipo ? { mimeType: tipo, audioBitsPerSecond: 32000 } : undefined);
  const partes = []; rec.ondataavailable = e => { if (e.data && e.data.size) partes.push(e.data); };
  rec.start(1000);
  let ctx = null, analisador = null, amostras = null;
  try { ctx = new (window.AudioContext || window.webkitAudioContext)(); analisador = ctx.createAnalyser(); analisador.fftSize = 1024; ctx.createMediaStreamSource(fluxo).connect(analisador); amostras = new Float32Array(analisador.fftSize); } catch (e) {}
  const t0 = Date.now();
  gravacao = { rec, fluxo, partes, tipo, ctx };
  barraGravacao('gravando', '0:00');
  const barras = montarOnda(), niveis = barras.map(() => 0.1);
  let soma = 0, qtd = 0, tick = 0;
  let avisou = false;
  gravacao.timer = setInterval(() => {
    const seg = (Date.now() - t0) / 1000;
    $('#tempoGrav').textContent = mmss(seg);
    if (seg >= LIMITE_GRAV) { toast('Gravação de 30 min: parei e vou transcrever. Para continuar, grave de novo.', 5000); pararGravacao(true); return; }
    if (seg >= AVISO_GRAV && !avisou) { avisou = true; toast('Gravação longa (10 min). Aos 30 min ela para sozinha.', 4000); }
    if (!analisador) return;
    analisador.getFloatTimeDomainData(amostras);
    let q = 0; for (let i = 0; i < amostras.length; i++) q += amostras[i] * amostras[i];
    soma += Math.sqrt(q / amostras.length); qtd++;
    if (++tick % 2) return;                                  // uma barrinha nova a cada 100 ms
    niveis.shift(); niveis.push(nivelDaOnda(soma / qtd)); soma = 0; qtd = 0;
    for (let i = 0; i < barras.length; i++) barras[i].style.transform = `scaleY(${niveis[i].toFixed(2)})`;
  }, 50);
}
function pararGravacao(transcreverDepois) {
  const g = gravacao; if (!g) return;
  gravacao = null; clearInterval(g.timer);
  g.rec.onstop = () => {
    g.fluxo.getTracks().forEach(t => t.stop()); try { g.ctx && g.ctx.close(); } catch (e) {}
    if (!transcreverDepois) { barraGravacao(null); return; }
    transcreverAudio(new Blob(g.partes, { type: g.rec.mimeType || g.tipo || 'audio/webm' }));
  };
  try { g.rec.stop(); } catch (e) { g.rec.onstop(); }
}
// qualquer áudio → amostras 16 kHz mono (o formato do whisper)
async function audioPara16k(blob) {
  const buf = await blob.arrayBuffer();
  let ctx; try { ctx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 }); } catch (e) { ctx = new (window.AudioContext || window.webkitAudioContext)(); }
  let audio; try { audio = await ctx.decodeAudioData(buf); } finally { try { ctx.close(); } catch (e) {} }
  const taxa = audio.sampleRate, n = Math.floor(audio.length * 16000 / taxa), sai = new Float32Array(n);
  const canais = []; for (let c = 0; c < audio.numberOfChannels; c++) canais.push(audio.getChannelData(c));
  for (let i = 0; i < n; i++) {
    const k = Math.min(audio.length - 1, Math.floor(i * taxa / 16000));
    let x = 0; for (const c of canais) x += c[k]; sai[i] = x / canais.length;
  }
  return sai;
}
// corta em trechos de até TRECHO segundos, sempre no ponto mais silencioso dos últimos 15 s do trecho
function cortarEmTrechos(a) {
  const max = TRECHO * 16000, janela = 1600, trechos = [];
  let ini = 0;
  while (a.length - ini > max) {
    let melhor = ini + max, menor = Infinity;
    for (let p = ini + max - 15 * 16000; p + janela <= ini + max; p += janela) {
      let q = 0; for (let i = p; i < p + janela; i++) q += a[i] * a[i];
      if (q < menor) { menor = q; melhor = p + janela / 2; }
    }
    trechos.push(a.subarray(ini, melhor)); ini = melhor;
  }
  trechos.push(a.subarray(ini));
  return trechos;
}
// WAV 16 bits; trechos com menos de 2 s ganham silêncio antes e depois (o whisper ignora áudio com menos de 1 s)
function wav16k(amostras) {
  const MIN = 2 * 16000, pad = amostras.length < MIN ? Math.ceil((MIN - amostras.length) / 2) + 4000 : 0;
  const n = amostras.length + pad * 2;
  const wav = new Uint8Array(44 + n * 2), v = new DataView(wav.buffer);
  const txt = (o, t) => { for (let i = 0; i < t.length; i++) v.setUint8(o + i, t.charCodeAt(i)); };
  txt(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); txt(8, 'WAVE'); txt(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, 16000, true); v.setUint32(28, 32000, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); txt(36, 'data'); v.setUint32(40, n * 2, true);
  for (let i = 0; i < amostras.length; i++) { const x = Math.max(-1, Math.min(1, amostras[i])); v.setInt16(44 + (pad + i) * 2, x < 0 ? x * 0x8000 : x * 0x7fff, true); }
  return wav;
}
// o whisper às vezes "inventa" frases em áudio sem fala; só vale para trechos quase mudos
const picoDe = a => { let pico = 0; for (let i = 0; i < a.length; i += 4) { const x = Math.abs(a[i]); if (x > pico) pico = x; } return pico; };
const temFala = a => picoDe(a) > 0.015;
// tira as marcas que o whisper põe em trechos sem fala: [BLANK_AUDIO], (música), [risos]…
const limparTranscricao = t => String(t || '').replace(/\[[^\]]{0,40}\]|\((?:m[uú]sica|music|risos?|aplausos|sil[eê]ncio|inaud[ií]vel)[^)]{0,20}\)/gi, ' ').replace(/\s+/g, ' ').trim();
async function transcreverAudio(blob, mesmoSemFala) {
  if (transcrevendo) return;
  transcrevendo = true; cancelarTranscricao = new AbortController();
  const sinal = cancelarTranscricao.signal;
  barraGravacao('transcrevendo', 'Transcrevendo');
  try {
    let amostras = null;
    try { amostras = await audioPara16k(blob); }
    catch (e) {
      // o iPhone lê m4a/mp3 direto; nos outros aparelhos, formato não suportado
      if (PLATAFORMA.tipo !== 'ios') throw e;
    }
    let texto = '';
    if (!amostras) {
      const ext = /mp4|m4a|aac/.test(blob.type) ? 'm4a' : /mpeg|mp3/.test(blob.type) ? 'mp3' : 'wav';
      trechoAtual = { i: 0, n: 1 };
      const r = await PLATAFORMA.transcrever(new Uint8Array(await blob.arrayBuffer()), ext, null, sinal);
      texto = limparTranscricao(r && r.texto);
    } else {
      if (!amostras.length) { toast('Este áudio está vazio.', 3500); return; }
      if (!mesmoSemFala && !temFala(amostras)) {
        // volume baixo demais: pergunta em vez de descartar (pode ser uma gravação distante, mas com fala)
        transcrevendo = false; barraGravacao(null);
        if (await confirmar('Áudio muito baixo', '<p>Não ouvi fala neste áudio — pode estar mudo ou muito baixo.</p>', 'Transcrever assim mesmo')) return transcreverAudio(blob, true);
        return;
      }
      const trechos = cortarEmTrechos(amostras), partes = [], pico = Math.max(...trechos.map(picoDe));
      for (let i = 0; i < trechos.length; i++) {
        if (sinal.aborted) break;
        trechoAtual = { i, n: trechos.length };
        if (!mesmoSemFala && picoDe(trechos[i]) < Math.max(0.004, pico * 0.02)) continue;   // trecho mudo em relação ao resto
        const r = await PLATAFORMA.transcrever(wav16k(trechos[i]), 'wav', null, sinal);
        const t = limparTranscricao(r && r.texto);
        if (t) partes.push(t);
      }
      texto = partes.join(' ').replace(/\s+/g, ' ').trim();
    }
    if (sinal.aborted) { if (texto) toast('Transcrição cancelada; ficou só o que já tinha sido transcrito.', 3500); else { toast('Transcrição cancelada.'); return; } }
    if (!texto) { toast('Não ouvi nenhuma fala neste áudio.', 3500); return; }
    const e = $('#entrada'); e.value = (e.value.trim() ? e.value.trim() + ' ' : '') + texto; ajustar(); e.focus(); e.setSelectionRange(e.value.length, e.value.length);
    guardarNaBiblioteca({ tipo: 'audio', nome: blob.name || ('Gravação ' + new Date().toTimeString().slice(0, 5)), tam: blob.size, texto });
  } catch (e) {
    if (e.name === 'AbortError' || sinal.aborted) toast('Transcrição cancelada.');
    else toast(/decode|EncodingError|Unable to decode/i.test(e.message || e.name) ? 'Não consegui ler este áudio (formato não suportado).' : /memory|allocation|RangeError/i.test(e.message || e.name) ? 'Áudio grande demais para a memória deste aparelho.' : 'Não foi possível transcrever: ' + e.message, 4500);
  } finally { transcrevendo = false; trechoAtual = null; cancelarTranscricao = null; barraGravacao(null); }
}
// progresso real do whisper (quando o aparelho manda): a barra deixa de ser indeterminada
PLATAFORMA.ao('transcricao', d => { if (!transcrevendo) return; const t = trechoAtual || { i: 0, n: 1 }; barraGravacao('transcrevendo', undefined, (t.i + (d.pct || 0)) / t.n); });
$('#falar').onclick = () => iniciarGravacao();
$('#pararGrav').onclick = () => pararGravacao(true);
$('#cancelarGrav').onclick = () => { if (gravacao) pararGravacao(false); else if (cancelarTranscricao) { cancelarTranscricao.abort(); $('#tempoGrav').textContent = 'Cancelando'; } };
$('#audio').onchange = e => { const f = e.target.files[0]; e.target.value = ''; if (f) { transcreverAudio(f); } };

/* ---------------- biblioteca da sessão ----------------
   Tudo o que você manda para a IA (fotos, arquivos e áudios transcritos) fica aqui para ver, usar de novo,
   copiar ou apagar. Fica só na memória: ao fechar a Própons IA, some (ainda não há banco de dados). */
let biblioteca = [], filtroBib = 'todos';
function guardarNaBiblioteca(item) {
  if (biblioteca.some(x => x.tipo === item.tipo && x.nome === item.nome && x.tam === item.tam)) return;
  biblioteca.unshift(Object.assign({ id: novoId(), quando: Date.now() }, item));
  if (biblioteca.length > 60) biblioteca.length = 60;       // limite para não pesar na memória
  const fb = document.querySelector('.dlg.biblioteca'); if (fb) desenharBiblioteca(fb);
}
const iconeBib = i => i.tipo === 'imagem' ? ICO.foto : i.tipo === 'audio' ? ICO.microfone : ICO.arquivo;
const descBib = i => (i.tipo === 'imagem' ? 'Foto' : i.tipo === 'audio' ? 'Áudio transcrito' : 'Arquivo') + ' · ' + tamanhoBonito(i.tam || 0) + ' · ' + new Date(i.quando).toTimeString().slice(0, 5);
function abrirBiblioteca() {
  const f = document.createElement('div'); f.className = 'dlg-fundo';
  f.innerHTML = `<div class="dlg biblioteca">${topoFolha('Biblioteca desta sessão')}<div class="bib-corpo"></div></div>`;
  const folha = f.firstChild, sair = () => animarSaida(f, folha);
  f.fechar = sair;
  f.onclick = e => { if (e.target === f) sair(); };
  folha.querySelector('[data-x]').onclick = sair;
  folhaArrastavel(f, folha, sair);
  pausarDesenho();
  document.body.appendChild(f);
  desenharBiblioteca(folha);
}
function desenharBiblioteca(folha) {
  const c = folha.querySelector('.bib-corpo'); if (!c) return;
  const n = t => biblioteca.filter(i => t === 'todos' || i.tipo === t).length;
  const lista = biblioteca.filter(i => filtroBib === 'todos' || i.tipo === filtroBib);
  const fotos = lista.filter(i => i.tipo === 'imagem'), outros = lista.filter(i => i.tipo !== 'imagem');
  c.innerHTML = `<p class="info" style="margin:0 0 12px">Fotos, arquivos e áudios que você mandou nesta sessão. <b>Ao fechar a Própons IA, tudo aqui é apagado.</b></p>
    ${biblioteca.length ? `<div class="seg bib-filtro" style="margin-bottom:12px">${[['todos', 'Tudo'], ['imagem', 'Fotos'], ['arquivo', 'Arquivos'], ['audio', 'Áudios']].map(([k, r]) => `<button data-f="${k}" class="${filtroBib === k ? 'on' : ''}">${r} ${n(k)}</button>`).join('')}</div>` : ''}
    ${!lista.length ? `<div class="bib-vazio">${ICO.biblioteca}<p>${biblioteca.length ? 'Nada deste tipo por aqui.' : 'Ainda vazia. Mande uma foto, um arquivo ou grave um áudio pelo "+" ou pelo 🎤.'}</p></div>` : ''}
    ${fotos.length ? `<div class="bib-fotos">${fotos.map(i => `<button class="bib-foto" data-i="${i.id}" title="${esc(i.nome)}"><img src="${esc(i.miniatura)}" alt="${esc(i.nome)}"></button>`).join('')}</div>` : ''}
    ${outros.length ? `<div class="lista-modelos" style="margin:${fotos.length ? '12px' : '0'} 0 0">${outros.map(i => `<button class="lm" data-i="${i.id}"><span class="mico">${iconeBib(i)}</span><span class="pt"><b>${esc(i.nome)}</b><small>${esc(descBib(i))}</small></span></button>`).join('')}</div>` : ''}
    ${biblioteca.length ? `<div class="botoes" style="margin-top:14px"><button class="btn perigo" data-apagar-tudo>${ICO.apagar}Apagar tudo</button></div>` : ''}`;
  c.querySelectorAll('[data-f]').forEach(b => b.onclick = () => { filtroBib = b.dataset.f; desenharBiblioteca(folha); });
  c.querySelectorAll('[data-i]').forEach(b => b.onclick = () => verItemBiblioteca(biblioteca.find(i => i.id === b.dataset.i), folha));
  const at = c.querySelector('[data-apagar-tudo]');
  if (at) at.onclick = async () => { if (await confirmar('Apagar a biblioteca?', 'Apaga todas as fotos, arquivos e transcrições desta sessão. As conversas continuam.', 'Apagar tudo', true)) { biblioteca = []; desenharBiblioteca(folha); toast('Biblioteca apagada.'); } };
}
async function verItemBiblioteca(i, folha) {
  if (!i) return;
  const previa = i.tipo === 'imagem' ? `<img src="${esc(i.dataUrl || i.miniatura)}" alt="" style="width:100%;max-height:52vh;object-fit:contain;border-radius:14px;background:var(--code);display:block">`
    : `<pre style="max-height:40vh;overflow:auto;white-space:pre-wrap;font:12.5px var(--mono);background:var(--code);border:1px solid var(--line);border-radius:12px;padding:12px;margin:0">${esc((i.tipo === 'audio' ? i.texto : i.conteudo || '').slice(0, 20000))}</pre>`;
  const acao = await perguntar(i.nome, `<p style="margin:0 0 10px">${esc(descBib(i))}</p>${previa}`,
    [['Apagar', 'apagar', 'perigo'], ...(i.tipo === 'imagem' ? [] : [['Copiar', 'copiar', '']]), ['Usar na mensagem', 'usar', 'primario']], { voltar: true });
  if (acao === 'apagar') { biblioteca = biblioteca.filter(x => x !== i); desenharBiblioteca(folha); toast('Apagado da biblioteca.'); }
  else if (acao === 'copiar') copiarTexto(i.tipo === 'audio' ? i.texto : i.conteudo).then(() => toast('Copiado.'));
  else if (acao === 'usar') {
    if (i.tipo === 'audio') { const e = $('#entrada'); e.value = (e.value.trim() ? e.value.trim() + ' ' : '') + i.texto; ajustar(); }
    else if (anexos.some(a => a.nome === i.nome)) toast('Já está na mensagem.');
    else if (i.tipo === 'imagem' && anexos.filter(a => a.tipo === 'imagem').length >= MAX_FOTOS) { toast(`Até ${MAX_FOTOS} fotos por mensagem.`); return; }
    else if (i.tipo === 'arquivo' && anexos.filter(a => a.tipo !== 'imagem').length >= MAX_ANEXOS) { toast(`Até ${MAX_ANEXOS} arquivos por mensagem.`); return; }
    else anexos.push(i.tipo === 'imagem' ? { tipo: 'imagem', nome: i.nome, tam: i.tam, dataUrl: i.dataUrl, miniatura: i.miniatura } : { nome: i.nome, tam: i.tam, lang: i.lang, conteudo: i.conteudo });
    desenharChips(); fecharDialogo(); $('#entrada').focus();
  }
}

/* ---------------- "+": câmera, fotos, arquivos e modelo ---------------- */
function abrirMais() {
  const temVisao = PLATAFORMA.temVisao;
  const f = document.createElement('div'); f.className = 'dlg-fundo';
  const nBib = biblioteca.length;
  f.innerHTML = `<div class="dlg folha mais">${topoCentro('Adicionar')}
    <div class="opcoes cartoes">
      <button data-op="camera"${temVisao ? '' : ' disabled'}><span class="oi">${ICO.camera}</span>Câmera</button>
      <button data-op="fotos"${temVisao ? '' : ' disabled'}><span class="oi">${ICO.foto}</span>Fotos</button>
      <button data-op="arquivos"><span class="oi">${ICO.arquivo}</span>Arquivos</button>
    </div>
    <div class="opcoes linhas">
      <button data-op="audio"${PLATAFORMA.temTranscricao ? '' : ' disabled'}><span class="oi">${ICO.microfone}</span><span class="pt"><b>Áudio</b><small>${PLATAFORMA.temTranscricao ? 'Transcrever uma gravação' : 'Indisponível neste aparelho'}</small></span>${ICO.seta}</button>
      <button data-op="biblioteca"><span class="oi">${ICO.biblioteca}</span><span class="pt"><b>Biblioteca</b><small>${nBib ? nBib + (nBib === 1 ? ' item' : ' itens') + ' nesta sessão' : 'Fotos, arquivos e áudios desta sessão'}</small></span>${ICO.seta}</button>
      <button data-modos><span class="oi">${ICO.estudo}</span><span class="pt"><b>Modos de estudo</b><small>${modoAtivo ? 'Ativo: ' + MODOS[modoAtivo].nome : 'Flashcards, quiz, redação, resumo e revisão'}</small></span>${ICO.seta}</button>
    </div>
    ${temVisao ? '' : '<p class="info" style="margin:8px 8px 0">Neste aparelho a IA ainda não lê fotos.</p>'}</div>`;
  const folha = f.firstChild;
  $('#anexar').setAttribute('aria-expanded', 'true');
  const sair = () => { $('#anexar').setAttribute('aria-expanded', 'false'); animarSaida(f, folha); };
  f.fechar = sair;
  f.onclick = e => { if (e.target === f) sair(); };
  folha.querySelector('[data-x]').onclick = sair;
  folhaArrastavel(f, folha, sair);
  folha.querySelector('[data-modos]').onclick = () => { sair(); setTimeout(abrirModos, 160); };
  folha.querySelectorAll('[data-op]').forEach(b => b.onclick = () => {
    const op = b.dataset.op; sair();
    if (op === 'camera') (PLATAFORMA.tipo === 'android' || PLATAFORMA.tipo === 'ios') ? $('#camera').click() : abrirWebcam();
    else if (op === 'fotos') $('#fotos').click();
    else if (op === 'arquivos') $('#arquivo').click();
    else if (op === 'audio') garantirVoz().then(ok => ok && $('#audio').click());
    else if (op === 'biblioteca') abrirBiblioteca();
    else abrirConfig('modelo');
  });
  pausarDesenho();
  document.body.appendChild(f); posicionarPop(f, folha, $('#anexar'));
}
/* PC e tablet: a folha vira um menu flutuante ancorado no botão (abre para cima quando não cabe embaixo) */
function posicionarPop(f, folha, ancora, lado) {
  if (estreita() || !ancora) return;
  f.classList.add('pop'); f._pop = { folha, ancora, lado };
  folha.style.top = folha.style.bottom = '';
  const r = ancora.getBoundingClientRect(), w = folha.offsetWidth, h = folha.offsetHeight;
  const abaixo = innerHeight - r.bottom - 8, acima = r.top - 8, paraCima = abaixo < Math.min(h, 240) && acima > abaixo;
  const x = lado === 'fim' ? r.right - w : r.left;
  folha.style.left = Math.max(8, Math.min(x, innerWidth - w - 8)) + 'px';
  if (paraCima) { folha.style.bottom = (innerHeight - r.top + 6) + 'px'; folha.style.transformOrigin = 'bottom left'; }
  else { folha.style.top = (r.bottom + 6) + 'px'; folha.style.transformOrigin = 'top left'; }
}
// janela redimensionada ou tablet girado: os menus flutuantes acompanham o botão
addEventListener('resize', () => document.querySelectorAll('.dlg-fundo.pop:not(.saindo)').forEach(f => { if (f._pop) posicionarPop(f, f._pop.folha, f._pop.ancora, f._pop.lado); }));

/* ---------------- nomes dos modelos ----------------
   Própons Lume (leve e rápido), Própons Aurora (médio e equilibrado) e Própons Ápice (pesado, o mais capaz). */
const NOME_MODELO = { leve: 'Lume', normal: 'Aurora', avancado: 'Ápice' };
const PESO_MODELO = { leve: 'Leve · Rápido', normal: 'Médio · Equilibrado', avancado: 'Pesado · Mais inteligente' };
const ESFORCO = { baixo: ['Baixo', 'Pensa menos e responde mais rápido.'], medio: ['Médio', 'Equilíbrio entre rapidez e profundidade.'], alto: ['Alto', 'Pensa mais antes de responder. Mais lento e mais cuidadoso.'] };
const esforco = () => ESFORCO[pref('esforco')] ? pref('esforco') : 'medio';
ICO.esforco = '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/></svg>';
function abrirEsforco(depois) {
  const f = document.createElement('div'); f.className = 'dlg-fundo';
  f.innerHTML = `<div class="dlg folha esforco">${topoCentro('Nível de esforço', true)}<div class="lista-modelos">${Object.entries(ESFORCO).map(([k, [r, d]]) =>
    `<button class="lm${k === esforco() ? ' on' : ''}" data-e="${k}"><span class="pt"><b>${r}</b><small>${d}</small></span><span class="st">${k === esforco() ? `<span class="check">${ICO.check}</span>` : ''}</span></button>`).join('')}</div></div>`;
  const folha = f.firstChild, sair = () => animarSaida(f, folha);
  f.fechar = sair; f.onclick = e => { if (e.target === f) sair(); }; folha.querySelector('[data-x]').onclick = sair;
  folhaArrastavel(f, folha, sair);
  folha.querySelectorAll('[data-e]').forEach(b => b.onclick = () => { pref('esforco', b.dataset.e); atualizarSeletorModelo(); sair(); if (depois) depois(); });
  pausarDesenho(); document.body.appendChild(f); posicionarPop(f, folha, $('#seletorModelo'));
}
const DESC_MODELO = { leve: 'Leve e rápido', normal: 'Equilibrado, para o dia a dia', avancado: 'Para as tarefas mais difíceis' };
ICO.check = '<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
const nomeModelo = m => 'Própons ' + (NOME_MODELO[m.id || m] || String(m.nome || '').replace(/^.*\((.*)\).*$/, '$1'));
// bolinha com a porcentagem do download
const anel = pct => `<span class="anel" style="--p:${Math.max(0, Math.min(100, Math.floor(pct * 100)))}"><b>${Math.floor(pct * 100)}%</b></span>`;

/* ---------------- primeira abertura ----------------
   O app abre direto no chat, sem modelo. Ao mandar a primeira mensagem (ou tocar no seletor ao lado do "+"),
   sobe a lista de modelos; ao tocar em Baixar, aparece a bolinha com a %; quando termina, o app liga a IA,
   abre o chat de novo e a IA responde a mensagem que ficou esperando. */
const ESCOLHER = !!window.PROPONS_ESCOLHER || /[#&]escolher\b/.test(location.hash);
// abertura fria: a IA ainda não foi ligada. Se já há um modelo baixado (MODELO_INICIAL), o chat abre normal e a IA liga
// na primeira mensagem; se não há, a primeira mensagem abre a lista para escolher e baixar.
const MODELO_INICIAL = window.PROPONS_MODELO || (location.hash.match(/[#&]modelo=([a-z]+)/) || [])[1] || null;
async function ligarInicial() {
  escolhendoId = MODELO_INICIAL;
  const alvo = addIa({ texto: '', interno: true }, false); if (alvo) alvo.classList.add('digitando');
  try { await PLATAFORMA.escolherModelo(MODELO_INICIAL); }
  catch (e) { escolhendoId = null; if (alvo) alvo.parentNode.remove(); toast('Não foi possível ligar a IA: ' + e.message, 4000); }
}
let escolhendoId = null;
PLATAFORMA.ao('download', d => {
  const id = d.id;
  const linha = document.querySelector(`.lista-modelos [data-m="${id}"] .st`);
  if (linha) linha.innerHTML = d.fase === 'verificando' ? '<span class="anel girando"><b>✓</b></span>' : anel(d.pct || 0);
  if (ESCOLHER && id === escolhendoId) estado(d.fase === 'verificando' ? 'conferindo o download' : `baixando ${Math.floor((d.pct || 0) * 100)}%`);
});
PLATAFORMA.ao('download-fim', d => {
  if (!ESCOLHER || d.id !== escolhendoId || d.ok) return;
  escolhendoId = null; estado('', false, 'download');
  toast(d.erro === 'cancelado' ? 'Download cancelado.' : (d.erro || 'Não foi possível baixar. Verifique a internet e tente de novo.'), 5000);
  const f = document.querySelector('.dlg.modelos'); if (f) desenharListaModelos(f);
});
PLATAFORMA.ao('motor', d => {
  if (!ESCOLHER) return;
  if (d.estado === 'ligando') document.querySelectorAll('.lista-modelos .st .anel').forEach(a => a.outerHTML = '<span class="anel girando"><b></b></span>');
  if (d.estado === 'pronto') escolhendoId = null;
  if (d.estado === 'erro') { escolhendoId = null; document.querySelectorAll('.msg.ia .txt.digitando').forEach(t => t.parentNode.remove()); toast(d.mensagem || 'Não foi possível ligar a IA.', 5000); const f = document.querySelector('.dlg.modelos'); if (f) desenharListaModelos(f); }
});
// depois que a IA liga, responde a mensagem que ficou esperando o download
async function responderPendente() {
  const c = conversas.find(x => x.msgs.length && x.msgs[x.msgs.length - 1].role === 'user' && x.msgs[x.msgs.length - 1].pendente);
  if (!c) return;
  delete c.msgs[c.msgs.length - 1].pendente;
  abrir(c.id); await responder(c);
}

/* ---------------- seletor de modelo (ao lado do "+", como no Claude) ---------------- */
function atualizarSeletorModelo() {
  const a = sistemaCache && (sistemaCache.modelos || []).find(m => m.atual && m.baixado !== false);
  $('#nomeModelo').textContent = ESCOLHER ? (MODELO_INICIAL ? nomeModelo(MODELO_INICIAL) : 'Escolher modelo') : a ? nomeModelo(a) : 'Modelo';
  const p = $('#pillEsforco'); if (p) { p.textContent = ESFORCO[esforco()][0]; p.hidden = ESCOLHER || esforco() === 'medio'; }
}
async function abrirSeletorModelo(motivo) {
  document.querySelectorAll('.dlg.modelos').forEach(x => x.closest('.dlg-fundo').remove());
  const f = document.createElement('div'); f.className = 'dlg-fundo';
  f.innerHTML = `<div class="dlg folha modelos">${topoCentro(motivo === 'enviar' ? 'Escolha o modelo para responder' : 'Selecionar modelo')}
    ${ESCOLHER ? '<p class="info" style="margin:0 12px 10px;text-align:center">O modelo é baixado uma vez e depois funciona sem internet. Dá para trocar quando quiser.</p>' : ''}
    <div class="lista-modelos"><p class="info" style="padding:12px 14px;margin:0">Carregando…</p></div>
    ${ESCOLHER ? '' : `<div class="opcoes linhas" style="margin-top:12px"><button data-esforco><span class="oi">${ICO.esforco}</span><span class="pt"><b>Esforço</b><small class="acento">${ESFORCO[esforco()][0]}</small></span>${ICO.seta}</button><button data-gerenciar><span class="oi">${ICO.chip}</span><span class="pt"><b>Gerenciar modelos</b><small>Baixar, apagar e ver detalhes</small></span>${ICO.seta}</button></div>`}</div>`;
  const folha = f.firstChild, sair = () => animarSaida(f, folha);
  f.fechar = sair; f.onclick = e => { if (e.target === f) sair(); };
  folha.querySelector('[data-x]').onclick = sair;
  const g = folha.querySelector('[data-gerenciar]'); if (g) g.onclick = () => { sair(); abrirConfig('modelo'); };
  const ef = folha.querySelector('[data-esforco]'); if (ef) ef.onclick = () => { sair(); abrirEsforco(() => abrirSeletorModelo()); };
  folhaArrastavel(f, folha, sair);
  pausarDesenho(); document.body.appendChild(f); posicionarPop(f, folha, $('#seletorModelo'));
  await lerSistema(); atualizarSeletorModelo();
  desenharListaModelos(folha); posicionarPop(f, folha, $('#seletorModelo'));
}
// a folha/menu do seletor, se estiver aberta, acompanha downloads e trocas
function redesenharSeletor() { const f = document.querySelector('.dlg.modelos'); if (f) desenharListaModelos(f); }
function desenharListaModelos(folha) {
  const lm = folha.querySelector('.lista-modelos'), sis = sistemaCache; if (!lm) return;
  if (!sis || !sis.modelos) { lm.innerHTML = '<p class="info" style="padding:12px 14px;margin:0">Não foi possível ler os modelos.</p>'; return; }
  const ram = sis.ramTotal || 0, rec = ram && ram < 5.5 * GB ? 'leve' : 'normal';
  lm.innerHTML = sis.modelos.map(m => {
    const b = baixando[m.id] || (escolhendoId === m.id ? { pct: 0 } : null);
    const emUso = !ESCOLHER && m.atual && !trocandoPara, ligando = !ESCOLHER && trocandoPara === m.id;
    const st = b ? anel(b.pct || 0) : ligando ? '<span class="anel girando"><b></b></span>' : m.bloqueado ? '' : emUso ? `<span class="check">${ICO.check}</span>`
      : ESCOLHER ? `<span class="btn-mini">${m.baixado ? 'Usar' : 'Baixar'}</span>` : '';
    const desc = m.bloqueado ? m.bloqueado : (DESC_MODELO[m.id] || PESO_MODELO[m.id] || '') + (m.baixado ? '' : ' · ' + gbBonito(m.tamanho) + (ESCOLHER ? '' : ' para baixar'));
    return `<button class="lm${emUso ? ' on' : ''}" data-m="${m.id}"${m.bloqueado || (escolhendoId && escolhendoId !== m.id) ? ' disabled' : ''}>
      <span class="pt"><b>${esc(nomeModelo(m))}${ESCOLHER && m.id === rec ? ' <span class="selo ok">Recomendado</span>' : ''}</b>
      <small>${esc(desc)}</small></span><span class="st">${st}</span></button>`;
  }).join('');
  lm.querySelectorAll('[data-m]').forEach(bt => bt.onclick = async () => {
    const m = sis.modelos.find(x => x.id === bt.dataset.m); if (!m || bt.disabled) return;
    if (ESCOLHER) {
      if (escolhendoId) return;
      if (semRam(m, ram)) { toast(`O ${nomeModelo(m)} precisa de ${ramNecessaria(m)} GB de memória; este aparelho tem ${gbBonito(ram)}.`, 4500); return; }
      escolhendoId = m.id; desenharListaModelos(folha); estado('baixando 0%');
      try { await PLATAFORMA.escolherModelo(m.id); } catch (e) { escolhendoId = null; estado(''); toast('Não foi possível: ' + e.message, 4000); desenharListaModelos(folha); }
      return;
    }
    if (m.atual || trocandoPara) return;
    if (PLATAFORMA.tipo === 'web') { animarSaida(folha.parentNode, folha); abrirConfig('modelo'); return; }
    await acaoModelo('usar', m, ram);
    desenharListaModelos(folha);
  });
}
$('#seletorModelo').onclick = () => abrirSeletorModelo();

// câmera do PC (webcam) numa folha: tira a foto e anexa
async function abrirWebcam() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { $('#fotos').click(); return; }
  let fluxo;
  try { fluxo = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 1280 }, height: { ideal: 960 } }, audio: false }); }
  catch (e) { toast('Não foi possível abrir a câmera: ' + (e.name === 'NotAllowedError' ? 'permissão negada.' : e.name === 'NotFoundError' ? 'nenhuma câmera encontrada.' : e.message), 4500); return; }
  const f = document.createElement('div'); f.className = 'dlg-fundo';
  f.innerHTML = `<div class="dlg">${topoFolha('Câmera')}<div class="webcam"><video autoplay playsinline muted></video></div>
    <div class="botoes"><button class="btn" data-c="cancelar">Cancelar</button><button class="btn primario" data-c="foto">${ICO.camera}Tirar foto</button></div></div>`;
  const v = f.querySelector('video'); v.srcObject = fluxo;
  const sair = () => { fluxo.getTracks().forEach(t => t.stop()); animarSaida(f, f.firstChild); };
  f.fechar = sair;
  f.onclick = e => { if (e.target === f) sair(); };
  f.querySelector('[data-x]').onclick = sair;
  f.querySelector('[data-c="cancelar"]').onclick = sair;
  f.querySelector('[data-c="foto"]').onclick = () => {
    const c = document.createElement('canvas'); c.width = v.videoWidth || 1280; c.height = v.videoHeight || 960;
    c.getContext('2d').drawImage(v, 0, 0, c.width, c.height);
    c.toBlob(b => { if (b) adicionarArquivos([new File([b], 'foto-' + new Date().toTimeString().slice(0, 8).replace(/:/g, '') + '.jpg', { type: 'image/jpeg' })]); }, 'image/jpeg', 0.9);
    sair();
  };
  folhaArrastavel(f, f.firstChild, sair);
  pausarDesenho();
  document.body.appendChild(f);
}

// a IA precisa do módulo de visão para ler fotos: baixa (uma vez) e liga, com confirmação
let esperaVisao = null;
async function garantirVisao() {
  const sis = await lerSistema();
  if (!sis || sis.visaoAtiva) return true;
  if (!PLATAFORMA.temVisao) { toast('Neste aparelho a IA ainda não lê fotos.'); return false; }
  const ativo = (sis.modelos || []).find(m => m.atual) || {};
  if (PLATAFORMA.tipo === 'web') {
    await perguntar('Ler fotos no Linux', `<p>Para a IA entender fotos, ligue a visão pelo terminal (baixa ${gbBonito(ativo.visaoTamanho || 0)} uma vez) e abra de novo:</p><div class="cmd"><code id="cmdVisao">propons-ia --visao</code><button class="icone" data-copiar="cmdVisao">${ICO.copiar}</button></div>`, [['Entendi', true, 'primario']]);
    return false;
  }
  const baixar = !ativo.visaoBaixada;
  const ok = await confirmar('Ler fotos', `<p>Para entender fotos, a IA usa um <b>módulo de visão</b>${baixar ? ` de ${gbBonito(ativo.visaoTamanho || 0)}, baixado uma vez só` : ''}.</p><p>Com a visão ligada a IA usa um pouco mais de memória. Dá para desligar em Ajustes → Modelos de IA.</p>`, baixar ? 'Baixar e ligar' : 'Ligar visão');
  if (!ok) return false;
  try { await PLATAFORMA.ligarVisao(true); } catch (e) { toast('Não foi possível: ' + e.message, 4000); return false; }
  toast(baixar ? 'Baixando a visão… a foto vai assim que terminar.' : 'Ligando a visão…', 3500);
  return new Promise(res => { esperaVisao = res; setTimeout(() => { if (esperaVisao === res) { esperaVisao = null; res(false); } }, 30 * 60000); });
}
function fimEsperaVisao(ok) {
  if (!esperaVisao) return;
  const r = esperaVisao; esperaVisao = null;
  if (!ok) { r(false); return; }
  // espera o motor voltar a responder antes de mandar a foto
  (async () => { for (let i = 0; i < 240 && !online; i++) await new Promise(t => setTimeout(t, 500)); r(online); })();
}
document.addEventListener('click', e => { const b = e.target.closest('.dlg [data-copiar]'); if (b) copiarTexto($('#' + b.dataset.copiar).textContent).then(() => toast('Copiado.')); });
['dragenter', 'dragover'].forEach(t => document.addEventListener(t, e => { if ([...(e.dataTransfer?.types || [])].includes('Files')) { e.preventDefault(); $('#caixa').classList.add('soltar'); } }));
['dragleave', 'drop'].forEach(t => document.addEventListener(t, e => { if (t === 'dragleave' && e.relatedTarget) return; $('#caixa').classList.remove('soltar'); }));
document.addEventListener('drop', e => { if (e.dataTransfer?.files?.length) { e.preventDefault(); adicionarArquivos([...e.dataTransfer.files]); } });
$('#entrada').addEventListener('paste', e => { const fs = [...(e.clipboardData?.files || [])]; if (fs.length) { e.preventDefault(); adicionarArquivos(fs); } });

/* ---------------- enviar / responder ---------------- */
const PEDE_CODIGO = /\b(?:fa[çc]a|crie|cria|escreva|escreve|gere|gera|implemente|implementa|programe|desenvolva|monte|me\s+d[êáe]|mostre|mostra|quero|preciso\s+de|refatore|corrija|conserte|converta|traduza)\b[\s\S]{0,60}\b(?:c[óo]digo|programa|script|fun[çc][ãa]o|classe|m[ée]todo|algoritmo|api|site|p[áa]gina|app|jogo|bot|calculadora|sistema)\b|\b(?:em|no|na|usando|com)\s+(?:python|java(?:script)?|typescript|c\+\+|c#|c|go|golang|rust|php|kotlin|swift|ruby|sql|html|css|bash|dart|lua)\b|```/i;
const INVENTA = /[\[(]\s*-?\d+\s*,\s*-?\d+\s*,/;
// contas e matemática: temperatura baixa (resposta quase determinística), como em código
const PEDE_EXATO = /\d\s*[-+*/^×÷=]\s*\d|\b(?:calcule|calcula|resolva|resolve|some|multiplique|divida|derivada|integral|equa[çc][ãa]o|fra[çc][ãa]o|porcentagem|raiz quadrada|matriz|logaritmo|quanto [ée]|quantos? (?:s[ãa]o|d[áa]))\b/i;

function montarHistorico(conv, maxTokens, extra) {
  const orcamento = Math.max(1200, nCtx - estimar(SYSTEM) - maxTokens - 300);
  const msgs = conv.msgs.filter(m => !m.interno);
  const saida = []; let usado = 0;
  for (let i = msgs.length - 1; i >= 0; i--) {
    const m = msgs[i];
    let conteudo = m.llm || m.texto;
    const fotos = m.imagens && m.imagens.length;
    if (fotos && !(i === msgs.length - 1 && m._envio)) conteudo += `\n[${fotos === 1 ? 'uma foto foi enviada' : fotos + ' fotos foram enviadas'} nesta mensagem]`;
    const custo = estimar(conteudo) + (fotos && i === msgs.length - 1 && m._envio ? TOKENS_FOTO * fotos : 0);
    if (usado + custo > orcamento) {
      if (i === msgs.length - 1) conteudo = conteudo.slice(0, Math.floor((orcamento - usado) * 3.2)) + '\n[…texto cortado por ser longo demais]';
      else if (m.anexos && m.anexos.length) conteudo = m.texto + `\n[anexos anteriores omitidos: ${m.anexos.map(a => a.nome).join(', ')}]`;
      else break;
      if (usado + estimar(conteudo) > orcamento) break;
    }
    usado += estimar(conteudo);
    if (fotos && i === msgs.length - 1 && m._envio) { usado += TOKENS_FOTO * fotos; saida.unshift({ role: m.role, content: [{ type: 'text', text: conteudo }, ...m._envio.map(url => ({ type: 'image_url', image_url: { url } }))] }); }
    else saida.unshift({ role: m.role, content: conteudo });
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
async function regenerar() { if (atual && atual.msgs.length) await regenerarDe(atual.msgs[atual.msgs.length - 1]); }
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

  const nivel = esforco();
  const maxTokens = nivel === 'baixo' ? 700 : pedeCodigo || (pergunta && pergunta.anexos) || nivel === 'alto' ? 3000 : 1500;
  const SISTEMA = SYSTEM + textoMemoria() + (nivel === 'baixo' ? '\n\nResponda de forma direta e curta, sem rodeios.' : nivel === 'alto' ? '\n\nAntes de responder, pense com cuidado: entenda o que foi pedido, resolva passo a passo e confira o resultado. Depois responda de forma completa, organizada e correta.' : '');
  // na continuação, a resposta cortada já é a última mensagem do histórico: o motor continua o texto dela
  const historico = montarHistorico(conv, maxTokens);
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
  if (alvo) { alvo.classList.add('digitando'); if (comEsquema) alvo.innerHTML = `<p class="info">${esc(modo.espera)}</p>`; }   // JSON não é mostrado enquanto chega
  const ctrl = new AbortController();
  geracao = { conv, ctrl, el: alvo };
  // leitura em voz alta enquanto a resposta chega (Aparência → Ler em voz alta: toda resposta)
  if (!continuacao) pararLeitura();
  const narrador = !continuacao && PLATAFORMA.temFala && pref('lerRespostas') === 'sim' ? novoNarrador(msg) : null;
  PLATAFORMA.ocupado(true);
  $('#enviar').classList.add('gerando'); $('#enviar').disabled = false; $('#enviar').title = 'Parar';

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
      { temperatura: comEsquema ? 0.4 : exato ? (nivel === 'alto' ? 0.15 : 0.2) : nivel === 'alto' ? 0.6 : 0.7, exato: exato || comEsquema, repeticao: exato ? 1.0 : 1.05, maxTokens: comEsquema ? 3500 : maxTokens, continuar: !!continuacao, esquema: comEsquema ? modo.esquema : undefined }, t => {
        novo += t; if (!comEsquema) agendar();
        if (narrador && /[.!?…\n]/.test(t)) narrador.alimentar(inicio + novo, false);
      }, ctrl.signal);
    fim = (r && r.fim) || 'stop';
  } catch (e) {
    if (e.name !== 'AbortError') erro = e.message || String(e);
  } finally {
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
function abrirLateral() { pausarDesenho(260); $('#lateral').classList.remove('fechada'); }
function fecharLateral() { if (!$('#lateral').classList.contains('fechada')) pausarDesenho(260); $('#lateral').classList.add('fechada'); }
$('#abrirLat').onclick = () => $('#lateral').classList.toggle('fechada');
$('#fundo').onclick = fecharLateral;
document.addEventListener('keydown', e => {
  const k = (e.key || '').toLowerCase();
  if (e.ctrlKey && k === 'b') { e.preventDefault(); $('#lateral').classList.toggle('fechada'); }
  if (e.ctrlKey && e.shiftKey && k === 'o') { e.preventDefault(); nova(); }
  if (e.ctrlKey && k === 'k') { e.preventDefault(); abrirLateral(); $('#busca').focus(); }
  if (e.ctrlKey && k === ',') { e.preventDefault(); abrirConfig(); }
  if (e.key === 'Escape') { if (!fecharDialogo()) { if (document.querySelector('.painel-fundo:not(.saindo)')) voltarPainel(); else if (estreita()) fecharLateral(); } fecharMenus(); }
});
// celular: botão voltar fecha, nesta ordem, o diálogo, a subpágina dos ajustes, os ajustes e a gaveta
window.__proponsVoltar = () => {
  if (fecharDialogo()) return true;
  if (gravacao || cancelarTranscricao) { $('#cancelarGrav').click(); return true; }
  if (document.querySelector('.painel-fundo:not(.saindo)')) { voltarPainel(); return true; }
  if (!$('#lateral').classList.contains('fechada') && estreita()) { fecharLateral(); return true; }
  return false;
};
// celular: arrastar da borda esquerda abre o histórico; arrastar para a esquerda fecha
(() => {
  let ini = null;
  document.addEventListener('touchstart', e => {
    if (!estreita() || document.querySelector('.painel-fundo:not(.saindo), .dlg-fundo:not(.saindo)')) return;
    const p = e.touches[0], aberta = !$('#lateral').classList.contains('fechada');
    if (!aberta && p.clientX > 28) return;
    ini = { x: p.clientX, y: p.clientY, aberta, dx: 0, travado: null };
  }, { passive: true });
  document.addEventListener('touchmove', e => {
    if (!ini) return;
    const p = e.touches[0], dx = p.clientX - ini.x, dy = p.clientY - ini.y;
    if (ini.travado === null && Math.hypot(dx, dy) > 8) ini.travado = Math.abs(dx) > Math.abs(dy);
    if (!ini.travado) return;
    const l = $('#lateral'), w = l.offsetWidth + 16; ini.dx = dx;   // +16: a gaveta flutua a 12 px da borda
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
  [['geral', 'Aparência', ICO.aparencia], ['conversas', 'Conversas', ICO.conversas], ['estudo', 'Estudo', ICO.estudo], ['memoria', 'Memória', ICO.memoria]],
  [['diagnostico', 'Diagnóstico', ICO.diagnostico], ['sobre', 'Sobre', ICO.sobre]],
];
const TITULOS = Object.fromEntries(PAGINAS.flat().map(([k, t]) => [k, t]));
let sistemaCache = null;
/* memória de verdade que cada modelo precisa (medido: pico do motor carregado + resposta gerada, llama.cpp b11070)
     Lume 0,9 GB · Aurora 2,0 GB (2,6 com visão) · Ápice 4,4 GB (5,1 com visão).
     PC: + ~2,5 GB de sistema e app → 3 / 4 / 8 GB. Celular: + ~3 GB de sistema e tela, e o Android fecha apps quando
     aperta → 3 / 6 / 12 GB. Abaixo disso o modelo fica bloqueado (sem "baixar mesmo assim"); só o Lume nunca é bloqueado. */
const CELULAR = PLATAFORMA.tipo === 'android' || PLATAFORMA.tipo === 'ios';
const RAM_MIN = CELULAR ? { leve: 3, normal: 6, avancado: 12 } : { leve: 3, normal: 4, avancado: 8 };
const ramNecessaria = m => RAM_MIN[m.id || m] || (m.ramMin || 0);
const semRam = (m, ram) => !!(ram && (m.id || m) !== 'leve' && ram < ramNecessaria(m) * GB * 0.93);
async function lerSistema() {
  const s = await PLATAFORMA.sistema().catch(() => null);
  if (s) {
    (s.modelos || []).forEach(m => {
      m.ramMin = ramNecessaria(m);
      if (m.bloqueado && /precisa de/.test(m.bloqueado)) delete m.bloqueado;   // a regra de memória é esta aqui, não a do aparelho
      if (!m.bloqueado && semRam(m, s.ramTotal)) m.bloqueado = `precisa de ${ramNecessaria(m)} GB de RAM (este tem ${gbBonito(s.ramTotal)})`;
    });
    sistemaCache = s;
  }
  return sistemaCache;
}

function subtitulo(k) {
  const ativo = sistemaCache && (sistemaCache.modelos || []).find(m => m.atual);
  switch (k) {
    case 'modelo': return ativo ? 'Em uso: ' + nomeModelo(ativo) : 'Escolher, baixar e apagar';
    case 'atualizacoes': return atualizacao ? `Versão ${atualizacao.versao} disponível` : `Versão ${VERSAO}`;
    case 'geral': return ({ sistema: 'Tema do sistema', claro: 'Tema claro', escuro: 'Tema escuro' })[pref('tema') || 'sistema'] + ' · letra ' + ({ p: 'pequena', m: 'média', g: 'grande' })[pref('fonte') || 'm'] + (PLATAFORMA.temFala ? (pref('lerRespostas') === 'sim' ? ' · lê em voz alta' : ' · voz') : '');
    case 'conversas': return `${conversas.length} ${conversas.length === 1 ? 'conversa' : 'conversas'} · backup e limpeza`;
    case 'memoria': { const n = memoria().length; return n ? `${n} ${n === 1 ? 'coisa que a IA sabe' : 'coisas que a IA sabe'} sobre você` : 'O que a IA sabe sobre você'; }
    case 'estudo': { const b = baralho(), n = paraRevisar(b).length; return b.cartoes.length ? `${n ? n + ' para revisar hoje' : 'nada para revisar hoje'} · ${b.cartoes.length} cartões` : 'Flashcards, quiz e redação'; }
    case 'diagnostico': return 'Testar tudo e medir a velocidade';
    case 'sobre': return 'Própons IA ' + VERSAO;
  }
  return '';
}
function desenharNav() {
  const n = $('#pNav'); if (!n) return;
  n.innerHTML = `<div class="p-nav-topo"><button class="icone" data-fechar aria-label="Fechar">${ICO.fechar}</button><h2>Ajustes</h2><span class="vazio-x"></span></div>` +
    PAGINAS.map(g => `<div class="p-grupo">${g.map(([k, t, ic]) => `<button class="p-item${k === abaAtual ? ' on' : ''}" data-aba="${k}"><span class="pi">${ic}</span><span class="pt"><b>${t}</b><small>${esc(subtitulo(k))}</small></span>${k === 'atualizacoes' && atualizacao ? '<i class="ponto"></i>' : ''}<span class="seta">${ICO.seta}</span></button>`).join('')}</div>`).join('');
  n.querySelectorAll('[data-aba]').forEach(b => b.onclick = () => irPara(b.dataset.aba));
  n.querySelector('[data-fechar]').onclick = () => fecharModal();
}
function fecharModal(imediato) { document.querySelectorAll('.painel-fundo:not(.saindo)').forEach(f => imediato ? f.remove() : animarSaida(f, f.firstChild)); }
function voltarPainel() {
  pausarDesenho(300);
  const p = $('.painel');
  if (p && estreita() && p.classList.contains('sub')) { p.classList.remove('sub'); desenharNav(); }
  else fecharModal();
}
function abrirConfig(aba) {
  fecharModal(true); fecharMenus(); if (estreita()) fecharLateral();
  const f = document.createElement('div'); f.className = 'painel-fundo';
  f.innerHTML = `<div class="painel" role="dialog" aria-label="Ajustes"><div class="p-arrastar"><span class="alca"></span></div><nav class="p-nav" id="pNav"></nav>
    <section class="p-conteudo"><div class="p-topo"><button class="icone p-voltar" id="pVoltar" aria-label="Voltar">${ICO.voltar}</button><h3 id="pTitulo"></h3><button class="icone p-fechar" aria-label="Fechar">${ICO.fechar}</button></div><div class="p-corpo" id="corpoConfig"></div></section></div>`;
  document.body.appendChild(f);
  f.onclick = e => { if (e.target === f) fecharModal(); };
  f.querySelector('.p-fechar').onclick = () => fecharModal();
  folhaArrastavel(f, f.firstChild, () => fecharModal());
  $('#pVoltar').onclick = voltarPainel;
  pausarDesenho(420);
  if (aba || !estreita()) irPara(aba || abaAtual, true); else desenharNav();
  setTimeout(() => lerSistema().then(() => { if (!document.querySelector('.painel-fundo.saindo')) desenharNav(); }), 360);
}
function irPara(aba, abrindo) {
  if (!TITULOS[aba]) aba = 'modelo';
  abaAtual = aba; desenharNav();
  const p = $('.painel'); if (!p) return;
  p.classList.add('sub'); $('#pTitulo').textContent = TITULOS[aba];
  $('#corpoConfig').scrollTop = 0;
  pausarDesenho(300);
  // abrindo a folha: mostra a página só depois da animação (o conteúdo pesado não disputa o quadro com ela)
  if (abrindo) { $('#corpoConfig').innerHTML = '<p class="info">Carregando…</p>'; setTimeout(() => { if ($('#corpoConfig') && abaAtual === aba) desenharAba(); }, 340); }
  else desenharAba();
}
$('#abrirConfig').onclick = () => abrirConfig();

function desenharAba() {
  const c = $('#corpoConfig'); if (!c) return;
  ({ geral: abaGeral, modelo: abaModelo, atualizacoes: abaAtualizacoes, conversas: abaConversas, estudo: abaEstudo, memoria: abaMemoria, diagnostico: abaDiagnostico, sobre: abaSobre })[abaAtual](c);
}
function seg(nome, opcoes, atualV) {
  return `<div class="seg" data-seg="${nome}" role="radiogroup">${opcoes.map(([v, r]) => `<button data-v="${v}" role="radio" aria-checked="${v === atualV}" class="${v === atualV ? 'on' : ''}">${r}</button>`).join('')}</div>`;
}
function ligarSeg(c, nome, f) { c.querySelectorAll(`[data-seg="${nome}"] button`).forEach(b => b.onclick = () => { c.querySelectorAll(`[data-seg="${nome}"] button`).forEach(x => { x.classList.toggle('on', x === b); x.setAttribute('aria-checked', x === b); }); f(b.dataset.v); desenharNav(); }); }
function ligarCopiar(c) { c.querySelectorAll('[data-copiar]').forEach(b => b.onclick = () => copiarTexto($('#' + b.dataset.copiar).textContent).then(() => toast('Copiado.'))); }

function abaGeral(c) {
  c.innerHTML = `<div class="secao"><h4>Tema</h4>${seg('tema', [['sistema', 'Sistema'], ['claro', 'Claro'], ['escuro', 'Escuro']], pref('tema') || 'sistema')}</div>
    <div class="secao"><h4>Tamanho da letra</h4>${seg('fonte', [['p', 'Pequena'], ['m', 'Média'], ['g', 'Grande']], pref('fonte') || 'm')}</div>
    ${PLATAFORMA.temFala ? `<div class="secao"><h4>Ler em voz alta</h4>${seg('lerRespostas', [['nao', 'Só quando eu pedir'], ['sim', 'Toda resposta']], pref('lerRespostas') || 'nao')}<p class="info">O alto-falante em cada resposta lê o texto com a voz do sistema. Em "Toda resposta", a leitura começa enquanto a IA ainda escreve.</p></div>` : ''}
    ${estreita() ? `<div class="secao"><h4>Gestos</h4><p class="info">Arraste da borda esquerda para abrir o histórico · segure uma conversa para renomear, compartilhar ou apagar · botão voltar fecha menus e telas.</p></div>`
      : `<div class="secao"><h4>Atalhos</h4><p class="info">Enter envia · Shift+Enter quebra linha · ↑ edita a última pergunta · Ctrl+B histórico · Ctrl+K buscar · Ctrl+Shift+O nova conversa · Ctrl+, ajustes</p></div>`}`;
  ligarSeg(c, 'tema', v => { pref('tema', v); aplicarTema(); });
  ligarSeg(c, 'fonte', v => { pref('fonte', v); aplicarFonte(); });
  ligarSeg(c, 'lerRespostas', v => { pref('lerRespostas', v); if (v === 'sim' && !falaAtual) { falaAtual = { msg: {}, ultimoId: '', narrando: false, terminou: true, fimIds: new Set() }; falarFrases(['Leitura em voz alta ligada.']); } });
}

/* ---------------- modelos ---------------- */
const PERFIL_MODELO = { leve: 'Mais rápido', normal: 'Equilibrado', avancado: 'Mais inteligente' };
let baixando = {};          // id → { pct, feito, total, fase }
let trocandoPara = null;    // id do modelo que está sendo ligado
const textoDownload = b => b.fase === 'verificando' ? 'Conferindo o arquivo…' : `Baixando ${Math.floor(b.pct * 100)}% · ${Math.round(b.feito / 1048576)} de ${Math.round(b.total / 1048576)} MB`;

function cartaoModelo(m, ram, rec) {
  const perfil = PERFIL_MODELO[m.id] || '';
  const b = baixando[m.id], ligando = trocandoPara === m.id && !b, web = PLATAFORMA.tipo === 'web';
  const pouca = ram && m.ramMin && ram < ramNecessaria(m) * GB * 0.93;
  const usar = rot => `<button class="btn primario" data-acao="usar" data-id="${m.id}" data-modelo="${m.id}">${rot}</button>`;
  let acoes = '';
  if (m.atual || ligando) acoes = '';
  else if (m.bloqueado) acoes = m.baixado && !web ? `<button class="btn perigo" data-acao="apagar" data-id="${m.id}">${ICO.apagar}Apagar</button>` : '';
  else if (b) acoes = `<button class="btn" data-acao="cancelar" data-id="${m.id}">Cancelar download</button>`;
  else if (web) acoes = usar('Usar este');
  else if (m.baixado) acoes = usar('Usar este') + `<button class="btn perigo" data-acao="apagar" data-id="${m.id}">${ICO.apagar}Apagar</button>`;
  else acoes = usar('Baixar e usar') + `<button class="btn" data-acao="baixar" data-id="${m.id}">${ICO.exportar}Só baixar</button>`;
  if (m.visaoBaixada && !web && !(m.atual && sistemaCache && sistemaCache.visaoAtiva) && !b && !ligando) acoes += `<button class="btn link" data-acao="apagarVisao" data-id="${m.id}">Apagar visão</button>`;
  const selo = m.atual ? '<span class="selo">Em uso</span>' : ligando ? '<span class="selo cinza">Ligando…</span>' : m.bloqueado ? `<span class="selo cinza">${esc(m.bloqueado)}</span>` : m.baixado ? '<span class="selo ok">Baixado</span>' : '';
  return `<div class="mcard${m.atual ? ' on' : ''}" data-cartao="${m.id}">
    <div class="mtopo"><div class="pt"><b>${esc(nomeModelo(m))}</b><small>${PESO_MODELO[m.id] || ''} · ${esc(m.descricao || '')}</small></div>${selo}</div>
    <div class="mtags"><span>${perfil}</span><span>${gbBonito(m.tamanho)}</span>${m.visaoTamanho && PLATAFORMA.temVisao ? `<span>${m.visaoBaixada ? 'Visão baixada' : 'Visão ' + gbBonito(m.visaoTamanho)}</span>` : ''}<span${pouca ? ' class="aviso"' : ''}>${pouca ? 'Pouca RAM · pede ' : 'RAM '}${ramNecessaria(m)} GB+</span>${m.id === rec ? '<span class="rec">Recomendado</span>' : ''}</div>
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
  const usado = modelos.reduce((t, m) => t + (m.baixado ? m.tamanho : 0) + (m.visaoBaixada ? m.visaoTamanho : 0), 0) + (s.vozes || []).reduce((t, v) => t + (v.baixado ? v.tamanho : 0), 0), livre = s.discoLivre || 0;
  const rolagem = c.scrollTop;
  c.innerHTML = `<p class="info">Os modelos ficam guardados neste aparelho e funcionam sem internet. Os maiores respondem melhor (principalmente código), mas são mais lentos e usam mais memória.</p>
    ${modelos.map(m => cartaoModelo(m, ram, rec)).join('')}
    ${PLATAFORMA.temVisao && !web ? `<div class="secao" style="margin-top:18px"><h4>Fotos</h4><div class="cartao"><button class="interruptor" id="swVisao" role="switch" aria-checked="${!!s.visaoLigada}"><span class="pt"><b>Ler fotos (visão)</b><small>${s.visaoAtiva ? 'Ligada: a IA entende fotos e prints' : 'Desligada: liga sozinha quando você manda uma foto'}</small></span><span class="chave"></span></button></div></div>` : ''}
    ${s.gpu && !web ? `<div class="secao" style="margin-top:18px"><h4>Aceleração por GPU</h4><div class="cartao"><button class="interruptor" id="swGpu" role="switch" aria-checked="${!!s.gpu.ligada}"><span class="pt"><b>Usar a placa de vídeo (Vulkan)</b><small>${descricaoGpu(s.gpu)}</small></span><span class="chave"></span></button>${s.gpu.baixada && !s.gpu.ligada && !baixando['gpu-vulkan'] ? `<button class="btn link" data-gpu="apagar" style="margin:8px 12px 10px">Apagar o módulo (${gbBonito(43658240)})</button>` : ''}</div></div>` : ''}
    ${s.vozes ? `<div class="secao" style="margin-top:18px"><h4>Transcrição de áudio</h4><div class="lista-modelos" style="margin:0">${s.vozes.map(v => {
      const b = baixando[v.id];
      const st = b ? Math.floor(b.pct * 100) + '%' : v.atual ? (v.baixado ? 'Em uso' : 'Escolhida') : v.baixado ? 'Baixada' : gbBonito(v.tamanho);
      const botoes = b ? '' : (!v.atual && v.baixado ? `<button class="btn" data-voz="usar" data-id="${v.id}">Usar</button>` : '') + (!v.baixado ? `<button class="btn" data-voz="baixar" data-id="${v.id}">Baixar</button>` : `<button class="btn link" data-voz="apagar" data-id="${v.id}">Apagar</button>`);
      return `<div class="lm${v.atual ? ' on' : ''}"><span class="mico">${ICO.microfone}</span><span class="pt"><b>${esc(v.nome)}</b><small>${esc(v.descricao)} · ${gbBonito(v.tamanho)}</small></span><span class="st">${st}</span>${botoes}</div>`;
    }).join('')}</div><p class="info" style="margin-top:8px">Grave com o 🎤 ao lado de enviar ou mande um arquivo pelo "+" → Áudio (qualquer tamanho). O texto aparece na caixa para você conferir.</p></div>` : ''}
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
  c.querySelectorAll('[data-voz]').forEach(b => b.onclick = async () => {
    const v = s.vozes.find(x => x.id === b.dataset.id); if (!v) return;
    try {
      if (b.dataset.voz === 'usar') { await PLATAFORMA.usarVoz(v.id); toast(v.nome + ' em uso.'); }
      else if (b.dataset.voz === 'baixar') { if (Object.keys(baixando).length) { toast('Espere o download atual terminar.'); return; } baixando[v.id] = { pct: 0, feito: 0, total: v.tamanho }; await PLATAFORMA.baixarVoz(v.id); await PLATAFORMA.usarVoz(v.id); }
      else if (await confirmar('Apagar a voz?', `Libera ${gbBonito(v.tamanho)}. Ela é baixada de novo se você transcrever com ela.`, 'Apagar', true)) { await PLATAFORMA.apagarVoz(v.id); toast('Voz apagada.'); }
    } catch (e) { delete baixando[v.id]; toast(e.message, 4000); }
    desenharAba();
  });
  const sw = c.querySelector('#swVisao');
  if (sw) sw.onclick = async () => {
    if (sw.getAttribute('aria-checked') === 'true') {
      if (!await confirmar('Desligar a visão?', 'A IA deixa de ler fotos até você mandar outra (aí ela liga de novo). O módulo continua baixado.', 'Desligar')) return;
      try { await PLATAFORMA.ligarVisao(false); sw.setAttribute('aria-checked', 'false'); } catch (e) { toast(e.message, 4000); }
    } else if (await garantirVisao()) { toast('Visão ligada.'); if (abaAtual === 'modelo') desenharAba(); }
  };
  const sg = c.querySelector('#swGpu');
  if (sg) sg.onclick = async () => {
    const g = (sistemaCache && sistemaCache.gpu) || {};
    if (geracao || transcrevendo) { toast('Espere a resposta terminar.'); return; }
    if (sg.getAttribute('aria-checked') === 'true') {
      try { await PLATAFORMA.ligarGpu(false); toast('GPU desligada. A IA volta a usar o processador.', 3000); } catch (e) { toast(e.message, 4000); }
      await lerSistema(); if (abaAtual === 'modelo') desenharAba(); return;
    }
    if (!g.baixada) {
      if (!await confirmar('Aceleração por GPU', `<p>A Própons baixa o módulo Vulkan do motor (${gbBonito(g.tamanho || 31851321)}, uma vez só) e passa a usar a placa de vídeo para responder mais rápido — no PC com placa dedicada, 3 a 4 vezes.</p><p>Se a placa for mais lenta que o processador (comum em gráficos integrados), a IA volta para o processador sozinha.</p>`, 'Baixar e testar')) return;
      baixando['gpu-vulkan'] = { pct: 0, feito: 0, total: g.tamanho || 0 }; desenharAba();
      const fim = await new Promise(res => { esperaGpu = res; PLATAFORMA.baixarGpu().catch(e => res({ ok: false, erro: e.message })); });
      delete baixando['gpu-vulkan'];
      if (!fim.ok) { toast(fim.erro === 'cancelado' ? 'Download cancelado.' : (fim.erro || 'Não foi possível baixar.'), 4500); await lerSistema(); if (abaAtual === 'modelo') desenharAba(); return; }
    }
    await testarGpu();
  };
  const ag = c.querySelector('[data-gpu="apagar"]');
  if (ag) ag.onclick = async () => { try { await PLATAFORMA.apagarGpu(); pref('gpuMedida', ''); toast('Módulo da GPU apagado.'); } catch (e) { toast(e.message, 4000); } await lerSistema(); if (abaAtual === 'modelo') desenharAba(); };
}
// GPU: texto do interruptor, download e o teste que decide (a placa só fica ligada se for mais rápida que o processador)
let esperaGpu = null;
PLATAFORMA.ao('download-fim', d => { if (d.id === 'gpu-vulkan' && esperaGpu) { const r = esperaGpu; esperaGpu = null; r(d); } });
function descricaoGpu(g) {
  let med = null; try { med = JSON.parse(pref('gpuMedida') || 'null'); } catch (e) {}
  const b = baixando['gpu-vulkan'];
  if (b) return `Baixando o módulo · ${Math.floor((b.pct || 0) * 100)}%`;
  if (g.ativa) return `Em uso: ${g.dispositivo}${med && med.gpu ? ` · ${med.gpu.toFixed(0)} tokens/s (processador: ${med.cpu.toFixed(0)})` : ''}`;
  if (g.ligada && g.falhou) return 'A placa não funcionou desta vez; a IA está no processador. Desligue e ligue para tentar de novo.';
  if (g.ligada) return 'Ligada (entra quando a IA religar)';
  if (g.baixada) return med && med.lenta ? `Desligada: aqui a placa (${med.dispositivo || 'GPU'}) ficou mais lenta que o processador (${med.gpu.toFixed(0)} × ${med.cpu.toFixed(0)} tokens/s)` : 'Baixada, desligada';
  return `Desligada · baixa o módulo Vulkan (${gbBonito(g.tamanho || 31851321)}) uma vez`;
}
async function testarGpu() {
  const medir = async () => { const r = await PLATAFORMA.gerar([{ role: 'user', content: 'Escreva os números de 1 a 60 separados por vírgula, sem mais nada.' }], { temperatura: 0, maxTokens: 80, exato: true }, () => {}); return r && r.timings && r.timings.predicted_per_second || 0; };
  const esperarOnline = async () => { for (let i = 0; i < 480 && !online; i++) await new Promise(r => setTimeout(r, 250)); return online; };
  toast('Medindo o processador…', 4000);
  const cpu = await medir().catch(() => 0);
  toast('Ligando a placa de vídeo…', 4000);
  let r;
  try { r = await PLATAFORMA.ligarGpu(true); } catch (e) { toast('A placa de vídeo não funcionou aqui: ' + e.message + ' A IA continua no processador.', 6000); await lerSistema(); if (abaAtual === 'modelo') desenharAba(); return; }
  await esperarOnline();
  const gpu = r && r.ativa ? await medir().catch(() => 0) : 0;
  if (!r || !r.ativa || gpu < cpu * 1.15) {
    try { await PLATAFORMA.ligarGpu(false); } catch (e) {}
    pref('gpuMedida', JSON.stringify({ cpu, gpu, dispositivo: (r && r.dispositivo) || '', lenta: true }));
    toast(r && r.ativa ? `A placa (${r.dispositivo}) não ficou mais rápida que o processador (${gpu.toFixed(0)} × ${cpu.toFixed(0)} tokens/s). A IA continua no processador.` : 'Nenhuma placa de vídeo compatível com Vulkan foi encontrada. A IA continua no processador.', 8000);
  } else {
    pref('gpuMedida', JSON.stringify({ cpu, gpu, dispositivo: r.dispositivo }));
    toast(`Placa de vídeo ligada: ${r.dispositivo} · ${gpu.toFixed(0)} tokens/s (antes ${cpu.toFixed(0)}).`, 7000);
  }
  await lerSistema(); if (abaAtual === 'modelo') desenharAba();
}
async function acaoModelo(acao, m, ram) {
  if (!m) return;
  if (PLATAFORMA.tipo === 'web') { $('#cmdModelo').textContent = 'propons-ia --modelo ' + m.id; $('#cmdModelo').scrollIntoView({ block: 'center', behavior: 'smooth' }); toast('Copie o comando e rode no terminal.'); return; }
  if (acao === 'cancelar') { PLATAFORMA.cancelarDownload(m.id).catch(() => {}); return; }
  if (acao === 'apagarVisao') {
    if (!await confirmar('Apagar a visão?', `Libera ${gbBonito(m.visaoTamanho)}. Se mandar uma foto com este modelo, ela é baixada de novo.`, 'Apagar', true)) return;
    try { await PLATAFORMA.apagarVisao(m.id); toast('Visão apagada.'); } catch (e) { toast('Não deu para apagar: ' + e.message, 4000); }
    desenharAba(); return;
  }
  if (acao === 'apagar') {
    if (!await confirmar(`Apagar o ${nomeModelo(m)}?`, `Libera ${gbBonito(m.tamanho)}. Se quiser usar de novo, ele é baixado outra vez.`, 'Apagar', true)) return;
    try { await PLATAFORMA.apagarModelo(m.id); toast('Modelo apagado.'); } catch (e) { toast('Não deu para apagar: ' + e.message, 4000); }
    desenharAba(); return;
  }
  if (Object.keys(baixando).length || trocandoPara) { toast('Espere o download ou a troca atual terminar.'); return; }
  if (semRam(m, ram)) { toast(`O ${nomeModelo(m)} precisa de ${ramNecessaria(m)} GB de memória; este aparelho tem ${gbBonito(ram)}.`, 4500); return; }
  if (!m.baixado && !await confirmar(`Baixar o ${nomeModelo(m)}?`, `São ${gbBonito(m.tamanho)}, baixados uma vez só. De preferência use Wi-Fi.`, 'Baixar')) return;
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
  redesenharSeletor();
  const id = idDoModelo(d); if (!id) return;
  baixando[id] = { pct: d.pct, feito: d.feito, total: d.total, fase: d.fase };
  atualizarCartao(id);
  if (id === 'gpu-vulkan') { const el = document.querySelector('#swGpu small'); if (el) el.textContent = descricaoGpu((sistemaCache && sistemaCache.gpu) || {}); }
  estado(`baixando ${Math.floor(d.pct * 100)}%`);
});
PLATAFORMA.ao('download-fim', d => {
  delete baixando[d.id]; estado('', false, 'download');
  if (String(d.id).startsWith('visao-') && !d.ok) fimEsperaVisao(false);
  if (esperaVoz && d.id === esperaVoz.id) { const r = esperaVoz.res; esperaVoz = null; r(!!d.ok); }
  if (d.ok && !String(d.id).startsWith('gpu-')) toast('Download concluído. O modelo já pode ser usado.', 3000);
  else if (d.erro === 'cancelado') toast('Download cancelado.');
  else if (d.erro) toast(d.erro, 5000);
  if (abaAtual === 'modelo') desenharAba();
  lerSistema().then(desenharNav);
});
PLATAFORMA.ao('motor', d => {
  if (d.estado === 'reiniciando' || d.estado === 'trocando') {
    online = false; estado(d.estado === 'trocando' ? 'trocando de modelo' : 'reconectando');
    if (d.estado === 'trocando' && trocandoPara) { delete baixando[trocandoPara]; if (abaAtual === 'modelo') desenharAba(); redesenharSeletor(); }
  }
  if (d.estado === 'pronto') {
    online = false; verificar(true);
    lerSistema().then(atualizarSeletorModelo);
    baixando = {}; trocandoPara = null;
    lerSistema().then(() => { desenharNav(); atualizarSeletorModelo(); redesenharSeletor(); if (abaAtual === 'modelo') desenharAba(); fimEsperaVisao(!!(sistemaCache && sistemaCache.visaoAtiva)); });
  }
  if (d.estado === 'erro') {
    baixando = {}; trocandoPara = null; fimEsperaVisao(false);
    estado('erro', true); toast(d.mensagem || 'Erro no motor da IA.', 5000);
    if (abaAtual === 'modelo') desenharAba(); redesenharSeletor();
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
  $('#apagarTudo').onclick = () => apagarTodasConversas().then(ok => { if (ok) { desenharAba(); desenharNav(); } });
}
async function apagarTodasConversas() {
  if (!conversas.length) { toast('Não há conversas para apagar.'); return false; }
  if (!await confirmar('Apagar todas as conversas?', `${conversas.length} ${conversas.length === 1 ? 'conversa será apagada' : 'conversas serão apagadas'} deste aparelho. Isso não pode ser desfeito.`, 'Apagar tudo', true)) return false;
  if (geracao) geracao.ctrl.abort(); conversas = []; salvarBloqueado = false; nova(); salvar(true); toast('Conversas apagadas.'); return true;
}
$('#apagarConversas').onclick = () => apagarTodasConversas().then(ok => { if (ok && estreita()) fecharLateral(); });
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
  add('info', `Própons IA ${VERSAO}`, `Plataforma: ${({ windows: 'Windows', android: 'Android', ios: 'iOS', mac: 'Mac', web: 'Linux (navegador)' })[PLATAFORMA.tipo]} · ${navigator.userAgent.replace(/\s+/g, ' ').slice(0, 120)}`);
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
    if (ativo) add('ok', 'Modelo selecionado', `${nomeModelo(ativo)} · ${ativo.nome} (${ativo.arquivo})`);
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
    if (sistemaCache && sistemaCache.gpu) add('info', 'Aceleração', sistemaCache.gpu.ativa ? `placa de vídeo (${sistemaCache.gpu.dispositivo}, Vulkan)` : 'processador (CPU)' + (sistemaCache.gpu.baixada ? '' : ' — a placa de vídeo pode ser ligada em Modelos de IA'));
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
const ARQUIVO_DA_PLATAFORMA = { windows: 'Propons-IA-Windows.exe', android: 'Propons-IA-Android.apk', ios: 'Propons-IA-iOS.ipa', mac: 'Propons-IA-Mac.zip' };

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
// só a seção da versão nova; itens marcados como de outra plataforma ("- **PC:**", "- **Celular:**") não aparecem
function limparNotas(s) {
  const linhas = s.replace(/\r/g, '').replace(/^\s*#{1,3}\s[^\n]*\n/, '').split(/\n#{1,3}\s*(?:Baixar|Downloads?|Instalar|Novidades)\b/i)[0].split('\n');
  const outra = CELULAR ? /^\s*-\s*\*\*(PC|Windows|Mac|Linux|Computador)\b/i : /^\s*-\s*\*\*(Celular|Android|iPhone|iOS|Mobile)\b/i;
  return linhas.filter(l => !outra.test(l)).join('\n').trim().slice(0, 2500);
}
function rotuloAtualizar() {
  return ({ ios: 'Atualizar pelo SideStore/AltStore', web: 'Como atualizar', windows: 'Atualizar agora', android: 'Atualizar agora', mac: 'Atualizar agora' })[PLATAFORMA.tipo];
}
function textoAtualizando() {
  if (!atualizando) return '';
  return ({ baixando: `Baixando a versão nova: ${Math.floor(atualizando.pct * 100)}%${atualizando.total ? ` (${Math.round(atualizando.feito / 1048576)} de ${Math.round(atualizando.total / 1048576)} MB)` : ''}`,
    verificando: 'Conferindo o arquivo baixado…',
    instalando: PLATAFORMA.tipo === 'windows' || PLATAFORMA.tipo === 'mac' ? 'Instalando: a Própons IA vai fechar e abrir de novo sozinha…' : 'Abrindo o instalador do Android…' })[atualizando.fase] || '';
}
function instrucoesAtualizacao() {
  switch (PLATAFORMA.tipo) {
    case 'windows': return 'A Própons IA baixa a versão nova, confere o arquivo (SHA-256), troca o programa (também no pendrive) e abre de novo. Conversas e modelos continuam.';
    case 'android': return 'A Própons IA baixa a versão nova, confere o arquivo (SHA-256) e abre o instalador do Android. Conversas e modelos continuam.';
    case 'mac': return 'A Própons IA baixa a versão nova, confere o arquivo (SHA-256), troca o app e abre de novo. Conversas e modelos continuam.';
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
      else r.forEach(x => add(x.ok ? 'ok' : 'erro', x.id ? nomeModelo(x) : x.nome, x.ok ? 'arquivo inteiro e conferido (SHA-256)' : x.apagado ? 'arquivo com defeito: foi apagado. Baixe de novo em Modelos de IA.' : 'arquivo com defeito e em uso: troque de modelo, apague este e baixe de novo.'));
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
  if (document.querySelector('.dlg-fundo:not(.saindo)') || atualizando) return;
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
    <div class="secao"><h4>Componentes</h4><p class="info">Motor: llama.cpp (MIT) · Modelos: Qwen3.5 (Apache 2.0) · Leitura de PDF: pdf.js (Apache 2.0) · DOCX: mammoth.js (BSD-2)${PLATAFORMA.tipo === 'windows' ? ' · Microsoft WebView2' : ''}.</p></div>`;
  $('#irAtual').onclick = () => irPara('atualizacoes');
  $('#abrirSite').onclick = () => PLATAFORMA.abrirLink('https://muurxdev.github.io/propons-ia/');
  $('#abrirRepo').onclick = () => PLATAFORMA.abrirLink('https://github.com/' + REPO);
}

/* a 1ª vez que uma folha abre, o navegador monta os estilos dela (lento em aparelho fraco): monta uma vez,
   invisível, com o app ocioso, para a abertura de verdade já sair lisa */
function aquecerFolhas() {
  const quando = window.requestIdleCallback || (f => setTimeout(f, 200));
  quando(() => {
    if (document.querySelector('.painel-fundo, .dlg-fundo') || geracao) return;
    // abre os Ajustes e um diálogo de verdade, quase transparentes e sem receber toques, por dois quadros
    const abaAntes = abaAtual;
    abrirConfig(estreita() ? undefined : abaAtual);
    perguntar('Própons IA', '<p>…</p>', [['Ok', 0, 'primario']]);
    menuFlutuante(document.body, [[ICO.renomear, 'Renomear', () => {}], [ICO.apagar, 'Apagar', () => {}, true]], 'Própons IA');
    const folhas = document.querySelectorAll('.painel-fundo, .dlg-fundo, .menu');
    folhas.forEach(f => { f.style.opacity = '0.001'; f.style.pointerEvents = 'none'; f.style.animation = 'none'; f.classList.remove('atras'); if (f.firstChild) f.firstChild.style.animation = 'none'; });
    requestAnimationFrame(() => requestAnimationFrame(() => { folhas.forEach(f => f.remove()); abaAtual = abaAntes; }));
  });
}

/* ---------------- motor: saúde contínua ---------------- */
let tVerificar = null;
async function verificar(imediato) {
  clearTimeout(tVerificar);
  const ok = await PLATAFORMA.saude();
  if (ok && !online) {
    online = true;
    if (!jaFicouOnline) setTimeout(responderPendente, 300);
    jaFicouOnline = true;
    try { const p = await PLATAFORMA.props(); const ctx = p && ((p.default_generation_settings && p.default_generation_settings.n_ctx) || p.n_ctx); if (ctx) nCtx = ctx; } catch (e) {}
    aquecer();
  } else if (!ok) {
    online = false;
    if (jaFicouOnline) estado('reconectando');
  }
  tVerificar = setTimeout(verificar, ok ? 5000 : 1500);
}
async function aquecer() {
  // processa o texto de sistema uma vez para a primeira resposta sair rápida
  try { await PLATAFORMA.gerar([{ role: 'system', content: SYSTEM }, { role: 'user', content: 'oi' }], { temperatura: 0, maxTokens: 1 }, () => {}); } catch (e) {}
  if (online) estado('');
}

/* ---------------- início ---------------- */
aplicarTema(); aplicarFonte();
if (CELULAR) $('#entrada').enterKeyHint = 'enter';   // no celular Enter quebra linha (o botão de enviar é a seta); no PC, envia
nova();
if (!estreita()) abrirLateral();
(async () => {
  // primeira abertura: a tela de escolher o modelo vem antes de tudo (o chat abre depois, já com a IA ligada)
  if (!ESCOLHER) { try { SYSTEM = await PLATAFORMA.textoSistema(); } catch (e) {} }
  if (!SYSTEM) SYSTEM = 'Você é a Própons IA, uma assistente de estudos. Responda em português do Brasil, de forma clara e correta.';
  await carregarHistorico();
  lerSistema().then(atualizarSeletorModelo);
  if (ESCOLHER) { atualizarSeletorModelo(); setTimeout(avisoAutomatico, 4000); return; }   // a IA liga na primeira mensagem
  verificar();
  // Linux: a transcrição existe se o pacote trouxe o whisper (sistema.json)
  if (PLATAFORMA.tipo === 'web') lerSistema().then(s => { if (s && s.temTranscricao) { PLATAFORMA.temTranscricao = true; if (!PLATAFORMA.urlTranscricao) PLATAFORMA.urlTranscricao = s.transcricaoUrl || ''; } });
  setTimeout(aquecerFolhas, 2500);
  setTimeout(avisoAutomatico, 4000);
  setInterval(avisoAutomatico, 6 * 3600 * 1000);
})();
