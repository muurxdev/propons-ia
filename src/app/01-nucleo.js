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
  baixo: '<svg viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg>',
  baixar: '<svg viewBox="0 0 24 24"><path d="M12 4v11M7.5 10.5L12 15l4.5-4.5"/><path d="M5 19h14"/></svg>',
  historico: '<svg viewBox="0 0 24 24"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 4v4h4"/><path d="M12 8v4l3 2"/></svg>',
  compactar: '<svg viewBox="0 0 24 24"><path d="M4 12h16"/><path d="M9 7l3-3 3 3"/><path d="M9 17l3 3 3-3"/></svg>',
  molde: '<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="6" rx="2"/><rect x="3" y="14" width="10" height="6" rx="2"/><path d="M17 14h4M17 18h4"/></svg>',
  compartilhar: '<svg viewBox="0 0 24 24"><path d="M12 3v13M7 8l5-5 5 5"/><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7"/></svg>',
};

/* ---------------- estado ---------------- */
// celular (Android/iPhone): sem Área de código, contexto e esforço sob medida para aparelho com menos memória
const CELULAR = PLATAFORMA.tipo === 'android' || PLATAFORMA.tipo === 'ios';
let conversas = [], atual = null, SYSTEM = '', online = false, jaFicouOnline = false;
/* o texto sobre o próprio aplicativo só entra quando a pergunta é sobre ele: no celular, cada palavra a mais
   no texto de sistema atrasa a primeira resposta de toda conversa nova. */
let SOBRE_APP = '';
const MARCA_SOBRE = 'Sobre você (a Própons IA)';
const RE_SOBRE_APP = new RegExp("voc[êe]|pr[óo]pons|aplicativo|esse app|este app|o app|onde fica|onde est[áa]|onde eu (?:acho|vejo|mudo|ligo)|como (?:eu )?(?:fa[çc]o|mudo|troco|ligo|desligo|abro|uso|acesso|apago|salvo|baixo|instalo)|ajustes|configura|esfor[çc]o|biblioteca|[áa]rea de c[óo]digo|menu lateral|permiss|c[âa]mera|microfone|offline|sem internet|atualiza[çr]|vers[ãa]o|quem (?:te|o|a) (?:criou|fez)|quem [ée] voc[êe]|o que voc[êe]|melhor(?:ia|ar|as|es) (?:no|do|desse|deste|para o|pro) (?:app|aplicativo|sistema|programa)|melhorar (?:esse|este|o) (?:app|aplicativo|sistema|programa)|sugest[õo]es (?:de|para|pro|no) (?:app|aplicativo|sistema|melhoria)|d[áa] pra melhorar|poderia (?:ter|ser|fazer)|c[óo]digo[- ]fonte|github|arquitetura (?:do|desse|deste)|como (?:isso|ele|ela|o app|o aplicativo|esse sistema) funciona", 'i');
function separarSistema() {
  const i = SYSTEM.indexOf(MARCA_SOBRE);
  if (i > 0) { SOBRE_APP = String.fromCharCode(10) + String.fromCharCode(10) + SYSTEM.slice(i).trim(); SYSTEM = SYSTEM.slice(0, i).trim(); }
}
const falaDoApp = t => RE_SOBRE_APP.test(String(t || ''));
let geracao = null;            // { conv, ctrl } enquanto uma resposta está sendo gerada
let anexos = [];               // anexos da próxima mensagem
let editando = false, salvarBloqueado = false, nCtx = 8192;
const novoId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const estimar = s => Math.ceil((s || '').length / 3.2);     // tokens aproximados (português/código)
const TEXTO_OK = /\.(txt|md|markdown|py|pyw|js|mjs|cjs|ts|tsx|jsx|java|kt|kts|c|h|cpp|cc|cxx|hpp|cs|go|rs|php|rb|swift|sql|html?|css|scss|json|csv|tsv|xml|ya?ml|toml|ini|cfg|conf|sh|bash|zsh|ps1|bat|lua|r|m|dart|vue|svelte|tex|log|gitignore|env)$/i;
const LIMITE_ANEXO = 40 * 1024, MAX_ANEXOS = 3, MAX_FOTOS = 3, TOKENS_FOTO = 420;
const eFoto = f => (f.type && /^image\//.test(f.type)) || /\.(png|jpe?g|gif|webp|bmp|heic|heif)$/i.test(f.name || '');

/* ---------------- utilidades ---------------- */
/* teclado e rotação: --vh é a altura que sobra visível (no iPhone o teclado cobre a página sem encolhê-la, e ele
   vira --kb); --sobre-caixa é a distância do pé da tela até o topo da caixa de mensagem (os avisos ficam acima dela) */
const alturaVisivel = () => window.visualViewport ? visualViewport.height : innerHeight;
function medirTela() {
  const r = document.documentElement.style, vv = window.visualViewport;
  r.setProperty('--vh', alturaVisivel() + 'px');
  r.setProperty('--kb', (vv ? Math.max(0, Math.round(innerHeight - vv.height - vv.offsetTop)) : 0) + 'px');
  const c = document.getElementById('caixa');
  if (c && c.offsetParent) r.setProperty('--sobre-caixa', Math.max(24, Math.round(innerHeight - c.getBoundingClientRect().top)) + 'px');
}
medirTela();
addEventListener('resize', medirTela); addEventListener('orientationchange', () => setTimeout(medirTela, 200));
if (window.visualViewport) { visualViewport.addEventListener('resize', medirTela); visualViewport.addEventListener('scroll', medirTela); }
addEventListener('DOMContentLoaded', () => { const c = document.getElementById('caixa'); if (c) try { new ResizeObserver(medirTela).observe(c); } catch (e) {} medirTela(); });
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
    fundo.style.transition = 'opacity .14s linear'; fundo.style.opacity = '0';
    setTimeout(() => { fundo.remove(); if (depois) depois(); }, 140);
    return;
  }
  // folha que entrou pela direita sai pela direita; as outras descem
  const paraLado = fundo.classList.contains('lado');
  folha.style.animation = 'none';
  folha.style.boxShadow = 'none';                         // sombra grande em movimento pesa no celular
  folha.style.transition = 'transform .2s cubic-bezier(.4,0,.8,.15)';
  folha.style.transform = paraLado ? 'translateX(100%)' : 'translateY(105%)';
  fundo.style.transition = 'opacity .2s linear'; fundo.style.opacity = '0';   // opacidade é resolvida na placa
  setTimeout(() => { fundo.remove(); if (depois) depois(); }, 200);
}
function folhaArrastavel(fundo, folha, fechar) {
  /* folha como as do sistema (e do app do Claude): dois tamanhos — o normal (o do conteúdo) e a tela cheia.
     Puxar para cima cresce junto com o dedo até cobrir a tela; da tela cheia, puxar para baixo encolhe até o tamanho
     normal (não fecha de uma vez); do tamanho normal, puxar para baixo fecha. Soltando, ela assenta no tamanho mais
     perto, levando em conta a velocidade do gesto (um puxão rápido vale mais que a distância). */
  const temMais = () => folha.scrollHeight - folha.clientHeight > 8;
  const marcarRolagem = () => folha.classList.toggle('rola', temMais());
  marcarRolagem(); setTimeout(marcarRolagem, 60);
  // conteúdo que chega depois (lista que carrega, "Mostrar resposta", referência adicionada): decide de novo se rola
  let marcaPendente = 0;
  const remarcar = () => { if (!marcaPendente) marcaPendente = requestAnimationFrame(() => { marcaPendente = 0; marcarRolagem(); }); };
  try { new ResizeObserver(remarcar).observe(folha); } catch (e) {}
  new MutationObserver(remarcar).observe(folha, { childList: true, subtree: true });
  // conteúdo rolado: aparece a linha fina embaixo do título (como nas folhas do sistema)
  folha.addEventListener('scroll', () => folha.classList.toggle('rolada', folha.scrollTop > 4), { passive: true });
  const alturaMax = () => alturaVisivel() - (parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--st')) || 0) - 10;
  // tamanho que a folha tinha ao abrir (a de cima copia a de baixo): o gesto que não mudou nada volta para ele
  const hSolta = () => folha._hFixa ? folha._hFixa + 'px' : '';
  const CURVA = 'cubic-bezier(.2,.9,.25,1)';   // desacelera no fim, como uma mola sem quicar
  const cheia = () => folha.classList.contains('cheia');
  let g = null;   // gesto em andamento: { modo: 'crescer' | 'encolher' | 'fechar', y0, h0, hBase, pontos }
  function comecar(dir, y) {
    if (dir < 0) { if (cheia()) return false; g = { modo: 'crescer', h0: folha.offsetHeight }; folha._hBase = g.h0; }
    else if (cheia() && folha._hBase) g = { modo: 'encolher', h0: folha.offsetHeight, hBase: folha._hBase };
    else g = { modo: 'fechar', h0: folha.offsetHeight };
    g.y0 = y; g.pontos = [[y, performance.now()]];
    folha.style.transition = 'none'; fundo.style.transition = 'none';
    return true;
  }
  function mover(y) {
    const d = y - g.y0;
    g.pontos.push([y, performance.now()]); if (g.pontos.length > 6) g.pontos.shift();
    pausarDesenho(200);
    if (g.modo === 'crescer') { folha.style.maxHeight = 'none'; folha.style.height = Math.min(alturaMax(), g.h0 - Math.min(0, d)) + 'px'; return; }
    if (g.modo === 'encolher') {
      const h = g.h0 - Math.max(0, d);
      if (h >= g.hBase) { folha.style.height = h + 'px'; folha.style.transform = ''; fundo.style.opacity = ''; return; }
      const t = g.hBase - h;   // passou do tamanho normal: daí para baixo ela desce inteira, a caminho de fechar
      folha.style.height = g.hBase + 'px'; folha.style.transform = `translateY(${t}px)`;
      fundo.style.opacity = String(Math.max(0, 1 - t / g.hBase).toFixed(3));
      return;
    }
    const t = Math.max(0, d);
    folha.style.transform = `translateY(${t}px)`;
    fundo.style.opacity = String(Math.max(0, 1 - t / Math.max(1, folha.offsetHeight)).toFixed(3));
  }
  // velocidade dos últimos instantes do gesto (px/ms; positivo = para baixo)
  const velocidade = () => { const p = g.pontos; if (p.length < 2) return 0; const [y1, t1] = p[0], [y2, t2] = p[p.length - 1]; return (y2 - y1) / Math.max(1, t2 - t1); };
  function assentar(estilo, depois) {
    folha.style.transition = `height .34s ${CURVA}, transform .34s ${CURVA}`; fundo.style.transition = 'opacity .3s linear';
    Object.assign(folha.style, estilo); fundo.style.opacity = '';
    setTimeout(() => { folha.style.transition = ''; fundo.style.transition = ''; if (depois) depois(); marcarRolagem(); }, 360);
  }
  function terminar(y) {
    const d = y - g.y0, v = velocidade(), m = g; g = null;
    if (m.modo === 'crescer') {
      const vai = -d > 48 || (v < -0.35 && -d > 24);   // puxão rápido vale, mas não um tremor de poucos pixels
      // assentada, a tela cheia fica só pela classe (segue o teclado e a rotação); a altura em px sai
      assentar({ height: (vai ? alturaMax() : m.h0) + 'px' }, () => { folha.classList.toggle('cheia', vai); folha.style.height = vai ? '' : hSolta(); folha.style.maxHeight = ''; });
      return;
    }
    if (m.modo === 'encolher') {
      const h = m.h0 - Math.max(0, d);
      if (h < m.hBase && (m.hBase - h > Math.min(120, m.hBase * 0.28) || (v > 1.1 && m.hBase - h > 24))) { fechar(); return; }   // desceu além do normal: fecha
      const volta = h < (m.h0 + m.hBase) / 2 || (v > 0.35 && d > 24);   // desceu o bastante (ou rápido): volta ao tamanho normal
      assentar({ height: (volta ? m.hBase : m.h0) + 'px', transform: '' }, () => { folha.classList.toggle('cheia', !volta); folha.style.height = volta ? hSolta() : ''; folha.style.maxHeight = ''; });
      return;
    }
    if (d > Math.min(120, folha.offsetHeight * 0.28) || (v > 0.6 && d > 30)) { fechar(); return; }
    assentar({ transform: '' });
  }
  // o toque que arrastou não vira clique no botão embaixo do dedo
  const engolirClique = () => {
    const engolir = ev => { ev.stopPropagation(); ev.preventDefault(); };
    folha.addEventListener('click', engolir, { capture: true, once: true });
    setTimeout(() => folha.removeEventListener('click', engolir, { capture: true }), 350);
  };

  // arrastar pela alça, pelo topo ou por uma folha curta (mouse, caneta ou dedo fora de algo que rola)
  let py = null, pid = null;
  folha.addEventListener('pointerdown', e => {
    if (e.button > 0 || !estreita()) return;
    if (e.pointerType === 'touch' && rolador(e.target)) return;   // dedo sobre algo que rola: o arraste por toque (abaixo) decide
    const zona = e.target.closest('.p-arrastar, .dlg-topo, .p-topo, .p-nav-topo, .folha');
    if (!zona) return;
    const naAlca = !!e.target.closest('.dlg-topo, .p-arrastar, .alca, .p-topo, .p-nav-topo');
    if (!e.target.closest('.folha') && e.target.closest('button, input, textarea, select, a')) return;
    // folha comprida: o dedo rola o conteúdo e só a alça arrasta; folha curta: qualquer ponto arrasta
    if (temMais() && !naAlca) return;
    if (!naAlca && folha.scrollTop > 2) return;
    py = e.clientY; pid = e.pointerId;
  });
  folha.addEventListener('pointermove', e => {
    if (py === null || e.pointerId !== pid) return;
    if (!g) {
      const b = e.clientY - py; if (Math.abs(b) < 7) return;
      if (!comecar(b < 0 ? -1 : 1, py)) { py = null; return; }
      try { folha.setPointerCapture(pid); } catch (er) {}
    }
    mover(e.clientY);
  });
  const soltarPonteiro = e => { if (py === null) return; py = null; if (!g) return; engolirClique(); terminar(e.clientY); };
  folha.addEventListener('pointerup', soltarPonteiro); folha.addEventListener('pointercancel', soltarPonteiro);

  // menu comprido (ou com lista que rola, como os Ajustes): o dedo rola o conteúdo; com o conteúdo no topo, puxar
  // para baixo arrasta o menu de qualquer ponto; puxar para cima cresce até a tela cheia antes de rolar
  const rolador = el => {
    for (let n = el; n && n !== fundo; n = n.parentElement)
      if (n.scrollHeight - n.clientHeight > 4 && /auto|scroll/.test(getComputedStyle(n).overflowY)) return n;
    return null;
  };
  let ty = null, tUlt = 0, tRol = null;
  folha.addEventListener('touchstart', e => {
    ty = null;
    if (!estreita() || e.touches.length !== 1 || py !== null) return;   // o arraste de cima (pointerdown vem antes) já pegou
    if (e.target.closest('.dlg-topo, .p-arrastar, .alca, .p-topo, .p-nav-topo, input, textarea, select, [contenteditable]')) return;
    tRol = rolador(e.target) || folha;
    ty = tUlt = e.touches[0].clientY;
  }, { passive: true });
  folha.addEventListener('touchmove', e => {
    if (ty === null) return;
    const y = e.touches[0].clientY; tUlt = y;
    if (!g) {
      const b = y - ty; if (Math.abs(b) < 6) return;
      if (b < 0 ? (cheia() || (tRol !== folha && tRol.scrollTop > 0)) : tRol.scrollTop > 0) { ty = null; return; }   // o dedo está rolando o conteúdo
      if (!comecar(b < 0 ? -1 : 1, ty)) { ty = null; return; }
    }
    e.preventDefault();
    mover(y);
  }, { passive: false });
  const soltarToque = () => { if (ty === null) return; ty = null; if (!g) return; engolirClique(); terminar(tUlt); };
  folha.addEventListener('touchend', soltarToque); folha.addEventListener('touchcancel', soltarToque);
}
// folha aberta por cima de outra volta (seta) em vez de fechar (X); sozinha, fecha
const sobreOutraFolha = () => !!document.querySelector('.dlg-fundo:not(.saindo), .painel-fundo:not(.saindo)');
const topoCentro = (titulo, voltar) => {
  const v = voltar === undefined ? sobreOutraFolha() : voltar;
  return `<div class="dlg-topo centro"><span class="alca"></span><button class="icone" data-x aria-label="${v ? 'Voltar' : 'Fechar'}">${v ? ICO.voltar : ICO.fechar}</button><h3>${esc(titulo || '')}</h3><span class="vazio-x"></span></div>`;
};

/* diálogo próprio (folha que sobe de baixo). botoes: [[rótulo, valor, 'primario'|'perigo'|'']]; devolve o valor escolhido (null ao fechar) */
function perguntar(titulo, html, botoes, opcoes) {
  return new Promise(ok => {
    const f = document.createElement('div'); f.className = 'dlg-fundo curta';
    f.innerHTML = `<div class="dlg" role="dialog" aria-label="${esc(titulo)}">${topoCentro(titulo, opcoes && 'voltar' in opcoes ? !!opcoes.voltar : sobreOutraFolha())}${html ? `<div class="dlg-txt">${html}</div>` : ''}<div class="botoes"></div></div>`;
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
/* caixinha de texto (renomear, pasta, nota): Enter salva (com várias linhas, Ctrl+Enter); Esc, X ou fora cancela.
   op: { dica, rotulo, max, multilinha, placeholder }; devolve o texto (sem espaços nas pontas) ou null */
function perguntarTexto(titulo, valor, op = {}) {
  const id = 'campo' + novoId(), max = op.max || (op.multilinha ? 500 : 120);
  const campo = op.multilinha ? `<textarea id="${id}" class="campo-texto" rows="4" maxlength="${max}" data-autofocus></textarea>` : `<input id="${id}" class="campo-texto" maxlength="${max}" autocomplete="off" data-autofocus>`;
  const p = perguntar(titulo, campo + (op.dica ? `<p class="info dica-campo">${esc(op.dica)}</p>` : ''), [['Cancelar', null, ''], [op.rotulo || 'Salvar', 'ok', 'primario']]);
  const inp = document.getElementById(id); inp.value = valor || ''; if (op.placeholder) inp.placeholder = op.placeholder;
  // nome de arquivo: seleciona sem a extensão
  setTimeout(() => { try { inp.focus(); if (!op.multilinha) { const pt = inp.value.lastIndexOf('.'); inp.setSelectionRange(0, pt > 0 && /\.[a-z0-9]{1,5}$/i.test(inp.value) ? pt : inp.value.length); } } catch (e) {} }, 50);
  inp.onkeydown = e => { if (e.key === 'Enter' && (!op.multilinha || e.ctrlKey || e.metaKey)) { e.preventDefault(); inp.closest('.dlg').querySelector('.primario').click(); } };
  return p.then(v => v === 'ok' ? inp.value.trim() : null);
}
/* toda folha/diálogo/painel que entra: aria-modal, foco dentro (e de volta ao sair); a folha de trás fica escondida */
const FOCAVEL = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
new MutationObserver(muts => {
  const abertos = [...document.querySelectorAll('.dlg-fundo:not(.saindo), .painel-fundo:not(.saindo)')];
  // a de baixo vai para trás, menos quando a de cima é um popup "por cima" (fonte aberta da lista): aí ela fica parada
  abertos.forEach((f, i) => f.classList.toggle('atras', i < abertos.length - 1 && !abertos[i + 1].classList.contains('por-cima')));
  for (const m of muts) {
    for (const n of m.addedNodes) {
      if (!(n instanceof Element) || !/\b(dlg-fundo|painel-fundo)\b/.test(n.className)) continue;
      const caixa = n.firstElementChild; if (!caixa) continue;
      // abriu por cima de outra folha: entra pela direita, como uma tela de dentro (inclui a que está saindo: é a mesma
      // navegação). No celular fica da mesma altura do menu de baixo: só o menu principal decide o tamanho.
      // Pergunta curta ("Apagar tudo?") e folha sobre os Ajustes não copiam a altura: ficam do tamanho do conteúdo.
      // A altura copiada é só a inicial; o teto (--folha, que segue o teclado) continua valendo pelo CSS.
      const baixo = [...document.querySelectorAll('.dlg-fundo, .painel-fundo')].filter(x => x !== n).pop();
      if (baixo && estreita() && !/\bpainel-fundo\b/.test(n.className) && !n.classList.contains('por-cima')) {
        n.classList.add('lado');
        const cb = baixo.firstElementChild, h = cb ? cb.offsetHeight : 0;
        if (!n.classList.contains('curta') && !/\bpainel-fundo\b/.test(baixo.className) && cb) {
          if (cb.classList.contains('cheia')) caixa.classList.add('cheia');
          else if (h > 160) { caixa.style.height = h + 'px'; caixa._hFixa = h; }
        }
      }
      caixa.setAttribute('role', caixa.getAttribute('role') || 'dialog'); caixa.setAttribute('aria-modal', 'true');
      if (!caixa.hasAttribute('tabindex')) caixa.tabIndex = -1;
      n._focoAntes = document.activeElement;   // guarda antes de tirar o foco, para devolver ao fechar
      // o teclado sai da frente quando o menu sobe
      try { if (n._focoAntes && n._focoAntes !== document.body && n._focoAntes.blur) n._focoAntes.blur(); } catch (e) {}
      // no celular o teclado só sobe quando a folha pede ([data-autofocus]); no PC o primeiro campo já vem focado
      setTimeout(() => { if (!n.isConnected || n.contains(document.activeElement)) return; const alvo = caixa.querySelector(estreita() ? '[data-autofocus]' : '[data-autofocus], input:not([readonly]), textarea:not([readonly])') || caixa; alvo.focus({ preventScroll: true }); }, 30);
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
function tamanhoBonito(b) { const f = (v, c) => v.toFixed(c).replace('.', ','); return b < 1024 ? b + ' B' : b < 1048576 ? f(b / 1024, b < 10240 ? 1 : 0) + ' KB' : f(b / 1048576, b < 10485760 ? 1 : 0) + ' MB'; }   // vírgula decimal, como no resto do app
function gbBonito(b) { return b < 1073741824 ? Math.max(1, Math.round(b / 1048576)) + ' MB' : (b / 1073741824).toFixed(1).replace('.', ',') + ' GB'; }
const langDoArquivo = n => ({ py: 'python', pyw: 'python', js: 'javascript', mjs: 'javascript', cjs: 'javascript', ts: 'typescript', tsx: 'typescript', jsx: 'javascript', java: 'java', kt: 'kotlin',
  c: 'c', h: 'c', cpp: 'cpp', cc: 'cpp', cxx: 'cpp', hpp: 'cpp', cs: 'csharp', go: 'go', rs: 'rust', php: 'php', rb: 'ruby', swift: 'swift', sql: 'sql', html: 'html', htm: 'html',
  css: 'css', scss: 'scss', json: 'json', xml: 'xml', sh: 'bash', bash: 'bash', zsh: 'bash', md: 'markdown', yml: 'yaml', yaml: 'yaml' }[(n.split('.').pop() || '').toLowerCase()] || '');

