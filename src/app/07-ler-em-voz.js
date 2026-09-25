/* ---------------- ler em voz alta (voz do sistema) ----------------
   Em cada resposta: ▶ ouvir e, enquanto lê, ■ parar (o mesmo botão). Enquanto a voz lê, o texto
   vai ficando roxo na mesma ordem e velocidade da fala: a palavra dita agora ganha o fundo roxo e o que já foi lido
   fica roxo (CSS Custom Highlight: nada muda no texto da resposta). Com "Ler em voz alta: toda resposta" (Aparência)
   a leitura começa enquanto a resposta ainda está chegando, frase por frase. Só uma leitura por vez.
   A voz fala uma frase por vez: é isso que deixa pausar e continuar do mesmo ponto em qualquer aparelho. */
ICO.pararFala = '<svg viewBox="0 0 24 24"><rect x="6.5" y="6.5" width="11" height="11" rx="2"/></svg>';
ICO.tocar = '<svg viewBox="0 0 24 24"><path d="M8 5.5v13l10.5-6.5z" fill="currentColor"/></svg>';
// falaAtual: { msg, el, frases: [{ t, ini }], i, desloc, palavra, gen, pausado, falando, narrando, terminou, mapa, cursor }
let falaAtual = null, falaGen = 0;
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
const temLetra = t => /[\p{L}\p{N}]/u.test(t);

/* o texto que aparece na tela, com a posição de cada pedaço: é dele que sai a fala e é nele que o roxo é pintado */
const PULAR_FALA = 'pre,.copiar,.katex-mathml,.fonte-cards,.acoes,button,svg,style,script,.giro,.pensa-linha,.ia-status,.grafico-card,.passos,.nota,.fontes,.sugestoes,[aria-hidden="true"]';
const BLOCO_FALA = /^(P|LI|H[1-6]|TR|BLOCKQUOTE|DIV|UL|OL|TABLE|DT|DD|BR|FIGCAPTION)$/;
function mapaFala(el) {
  const segs = []; let plano = '', disseCodigo = false;
  const quebra = () => { if (plano && !/\n$/.test(plano)) plano += '\n'; };
  const andar = n => {
    if (n.nodeType === 3) { if (n.data) { segs.push({ n, ini: plano.length }); plano += n.data; } return; }
    if (n.nodeType !== 1) return;
    if (n.matches(PULAR_FALA)) { if (n.tagName === 'PRE' && !disseCodigo) { quebra(); plano += '(trecho de código omitido)\n'; disseCodigo = true; } return; }
    const celula = n.tagName === 'TD' || n.tagName === 'TH', bloco = BLOCO_FALA.test(n.tagName);
    if (bloco) quebra(); else if (celula && plano && !/[\s,]$/.test(plano)) plano += ', ';
    n.childNodes.forEach(andar);
    if (bloco) quebra();
  };
  if (el) andar(el);
  return { segs, plano };
}
function frasesComPosicao(t) {   // frases do texto da tela, cada uma com onde começa
  const out = [], re = /[.!?…]+["”)]*\s+|\n+/g; let pos = 0, m;
  const junta = (a, b) => {
    while (a < b && /\s/.test(t[a])) a++; while (b > a && /\s/.test(t[b - 1])) b--;
    while (b - a > 320) { let c = t.lastIndexOf(', ', a + 300); if (c < a + 100) c = t.lastIndexOf(' ', a + 300); if (c <= a) c = a + 299; junta(a, c + 1); a = c + 1; while (a < b && /\s/.test(t[a])) a++; }
    if (b > a && temLetra(t.slice(a, b))) out.push({ t: t.slice(a, b), ini: a });
  };
  while ((m = re.exec(t))) { junta(pos, m.index + m[0].length); pos = m.index + m[0].length; }
  junta(pos, t.length);
  return out;
}
// trecho [a, b) do texto da tela → Range do DOM (pontos que caem em quebras "de mentira" vão para o pedaço vizinho)
function faixaFala(mapa, a, b) {
  let ini = null, fim = null;
  for (const s of mapa.segs) { if (s.ini + s.n.data.length > a) { ini = [s.n, Math.max(0, a - s.ini)]; break; } }
  for (let k = mapa.segs.length - 1; k >= 0; k--) { const s = mapa.segs[k]; if (s.ini < b) { fim = [s.n, Math.min(s.n.data.length, b - s.ini)]; break; } }
  if (!ini || !fim || !ini[0].isConnected || !fim[0].isConnected) return null;
  try { const r = document.createRange(); r.setStart(ini[0], ini[1]); r.setEnd(fim[0], fim[1]); return r.collapsed ? null : r; } catch (e) { return null; }
}
// frase que veio do texto cru (leitura enquanto a resposta chega): acha onde ela está na tela pelas primeiras palavras
function acharNoPlano(plano, frase, desde) {
  const pal = frase.split(/\s+/).filter(Boolean).slice(0, 6).map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  if (!pal.length) return -1;
  const re = new RegExp(pal.join('\\s+'), 'g');
  re.lastIndex = Math.max(0, desde || 0); let m = re.exec(plano);
  if (!m && desde) { re.lastIndex = 0; m = re.exec(plano); }
  return m ? m.index : -1;
}
const temPintura = () => typeof CSS !== 'undefined' && CSS.highlights && typeof Highlight === 'function';
function limparPintura() { if (temPintura()) { CSS.highlights.delete('fala-lido'); CSS.highlights.delete('fala-agora'); } }
function elDaFala(L) {
  if (L.el && L.el.isConnected) return L.el;
  const b = botoesLer(L.msg)[0], t = b && b.closest('.msg') && b.closest('.msg').querySelector(':scope > .txt');
  return t || null;
}
// pinta: o que já foi lido (roxo) e a palavra de agora (fundo roxo); a ≥ 0 é a posição no texto da tela
function pintar(L, a, b) {
  if (!temPintura() || !L.msg) return;
  const el = elDaFala(L); if (!el) { limparPintura(); return; }
  if (!L.mapa || L.mapaDe !== el || !L.mapa.segs.every(s => s.n.isConnected)) { L.mapa = mapaFala(el); L.mapaDe = el; }
  const lido = faixaFala(L.mapa, 0, a), agora = b > a ? faixaFala(L.mapa, a, b) : null;
  if (lido) CSS.highlights.set('fala-lido', new Highlight(lido)); else CSS.highlights.delete('fala-lido');
  if (agora) CSS.highlights.set('fala-agora', new Highlight(agora)); else CSS.highlights.delete('fala-agora');
}
// onde a frase i começa no texto da tela (as da leitura ao vivo são achadas na hora)
function inicioDaFrase(L, i) {
  const f = L.frases[i]; if (!f) return -1;
  if (f.ini >= 0) return f.ini;
  const el = elDaFala(L); if (!el) return -1;
  if (!L.mapa || L.mapaDe !== el || !L.mapa.segs.every(s => s.n.isConnected)) { L.mapa = mapaFala(el); L.mapaDe = el; }
  const p = acharNoPlano(L.mapa.plano, f.t, L.cursor); if (p >= 0) L.cursor = p;
  return p;
}

function botoesLer(m) { return [...document.querySelectorAll('.acao.ler')].filter(b => b._msg === m); }
// estado do botão: ▶ para ouvir; lendo, vira ■ para parar
function marcarLendo(m, estado) {
  botoesLer(m).forEach(b => {
    b.classList.toggle('on', !!estado);
    b.innerHTML = estado ? ICO.pararFala : ICO.tocar;
    b.title = estado ? 'Parar a leitura' : 'Ouvir a resposta'; b.setAttribute('aria-label', b.title);
  });
}
function fimLeitura() { if (!falaAtual) return; const m = falaAtual.msg; falaAtual = null; limparPintura(); marcarLendo(m, null); }
function pararLeitura() { if (!falaAtual) return; falaGen++; PLATAFORMA.pararFala(); fimLeitura(); }
function falarProxima() {
  const L = falaAtual; if (!L || L.pausado || L.falando) return;
  while (L.i < L.frases.length && !temLetra(L.frases[L.i].t.slice(L.desloc))) { L.i++; L.desloc = 0; }
  if (L.i >= L.frases.length) { if (!L.narrando || L.terminou) fimLeitura(); return; }   // ao vivo: espera a próxima frase
  const f = L.frases[L.i], ini = inicioDaFrase(L, L.i);
  L.falando = true; L.base = ini;
  if (ini >= 0) pintar(L, ini + L.desloc, ini + L.desloc);
  PLATAFORMA.falar(f.t.slice(L.desloc), `f${L.gen}_${L.i}_${L.desloc}`);
}
PLATAFORMA.ao('fala', d => {
  const L = falaAtual; if (!L) return;
  const m = /^f(\d+)_(\d+)_(\d+)$/.exec((d && d.id) || ''); if (!m || +m[1] !== L.gen || +m[2] !== L.i) return;
  const desloc = +m[3];
  if (d.estado === 'erro') { toast('Não foi possível ler em voz alta neste aparelho.', 3500); pararLeitura(); return; }
  if (d.estado === 'palavra') {   // a palavra dita agora (Android: onRangeStart; PC/Mac/iPhone: onboundary)
    L.palavra = desloc + (+d.ini || 0);
    if (L.base >= 0) pintar(L, L.base + L.palavra, L.base + desloc + (+d.fim || +d.ini || 0));
    return;
  }
  if (d.estado === 'fim') {
    L.falando = false; L.i++; L.desloc = 0; L.palavra = 0;
    const f = L.frases[L.i - 1]; if (L.base >= 0 && f) pintar(L, L.base + f.t.length, L.base + f.t.length);
    falarProxima();
  }
});
function novaLeitura(msg, frases, extra) {
  pararLeitura();
  falaAtual = Object.assign({ msg, el: null, frases, i: 0, desloc: 0, palavra: 0, gen: ++falaGen, pausado: false, falando: false, narrando: false, terminou: true, mapa: null, cursor: 0, base: -1 }, extra);
  return falaAtual;
}
function lerMensagem(m) {
  if (falaAtual && falaAtual.msg === m) { pararLeitura(); return; }
  const b = botoesLer(m)[0], el = b && b.closest('.msg') && b.closest('.msg').querySelector(':scope > .txt');
  const mapa = el ? mapaFala(el) : null;
  // o que se ouve é o que está na tela (sem o código); sem a tela, o texto da resposta limpo
  const frases = mapa && temLetra(mapa.plano) ? frasesComPosicao(mapa.plano) : frasesCompletas(textoParaFala(m.texto), true).frases.map(t => ({ t, ini: -1 }));
  if (!frases.length) return;
  const L = novaLeitura(m, frases, { el, mapa, mapaDe: el });
  marcarLendo(m, 'tocando'); falarProxima();
  return L;
}
function falarAviso(texto) { novaLeitura({}, [{ t: texto, ini: -1 }]); falarProxima(); }
function novoNarrador(msg, el) {   // lê enquanto a resposta chega: cada frase completa entra na fila
  novaLeitura(msg, [], { el: el || null, narrando: true, terminou: false });
  let lido = 0;
  return {
    alimentar(texto, fim) {
      const L = falaAtual; if (!L || L.msg !== msg) return;
      const plano = textoParaFala(texto);
      const { frases, consumido } = frasesCompletas(plano.slice(lido), fim); lido += consumido;
      frases.forEach(t => L.frases.push({ t, ini: -1 }));
      if (fim) L.terminou = true;
      if (L.frases.length && !L.pausado) marcarLendo(msg, 'tocando');
      falarProxima();
      if (fim && !L.falando && !L.pausado && L.i >= L.frases.length) fimLeitura();
    },
  };
}

function acoes(d, m, ultima) {
  const a = document.createElement('div'); a.className = 'acoes';
  if (m.texto && !m.interno) {
    const bc = document.createElement('button'); bc.className = 'acao'; bc.title = 'Copiar resposta'; bc.setAttribute('aria-label', 'Copiar resposta'); bc.innerHTML = ICO.copiar;
    bc.onclick = () => copiarTexto(m.texto).then(() => { bc.innerHTML = ICO.ok; bc.classList.add('feito'); setTimeout(() => { bc.innerHTML = ICO.copiar; bc.classList.remove('feito'); }, 1400); });
    a.appendChild(bc);
    if (!m.cartoes && !m.quiz && !m.redacao && !m.mapa && !m.plano && m.texto.length > 120) {   // transformar a resposta em flashcards, quiz ou resumo
      const be = document.createElement('button'); be.className = 'acao'; be.title = 'Estudar isto'; be.setAttribute('aria-label', 'Estudar isto: flashcards, quiz ou resumo'); be.innerHTML = ICO.tutor;
      be.onclick = e => { e.stopPropagation(); estudarIsto(m, be); }; a.appendChild(be);
    }
    if (PLATAFORMA.temFala) {
      const bl = document.createElement('button'); bl.className = 'acao ler'; bl._msg = m; bl.innerHTML = ICO.tocar; bl.title = 'Ouvir a resposta'; bl.setAttribute('aria-label', bl.title);
      bl.onclick = () => lerMensagem(m); a.appendChild(bl);
      if (falaAtual && falaAtual.msg === m) setTimeout(() => marcarLendo(m, 'tocando'), 0);
    }
  }
  if (m.interno && m.erro) {   // erro: o botão que a mensagem de erro pede
    const bt = document.createElement('button'); bt.className = 'acao continuar tentar'; bt.innerHTML = ICO.recarregar + '<span>Tentar de novo</span>';
    bt.onclick = () => regenerarDe(m); a.appendChild(bt);
  }
  if (!m.interno) {   // qualquer resposta: gerar de novo (a partir dela) e ramificar a conversa até aqui
    const br = document.createElement('button'); br.className = 'acao recarregar'; br.title = ultima ? 'Gerar de novo' : 'Gerar de novo a partir daqui (o que vem depois é refeito)'; br.setAttribute('aria-label', br.title); br.innerHTML = ICO.recarregar;
    br.onclick = () => regenerarDe(m); a.appendChild(br);
    if (!ultima) { const bf = document.createElement('button'); bf.className = 'acao ramificar'; bf.title = 'Ramificar: nova conversa até aqui'; bf.setAttribute('aria-label', bf.title); bf.innerHTML = ICO.ramificar; bf.onclick = () => ramificar(m); a.appendChild(bf); }
  }
  if (ultima) {
    document.querySelectorAll('.acao.continuar:not(.tentar)').forEach(b => b.remove());
    if (m.cortada || m.interrompida) {
      const bs = document.createElement('button'); bs.className = 'acao continuar'; bs.innerHTML = ICO.seguir + '<span>Continuar</span>';
      bs.onclick = () => continuar(); a.appendChild(bs);
    }
  }
  d.appendChild(a);
}
// passo a passo de um algoritmo (calculado por código): recolhido dentro da própria resposta
const htmlPassos = (titulo, lista) => `<details class="passos"><summary>${esc(titulo)}<small>ver ${lista.length} passos</small></summary><ol>${lista.map(s => `<li>${esc(s)}</li>`).join('')}</ol></details>`;
function enfeitar(el) {
  el.querySelectorAll('pre').forEach(p => {
    if (p.querySelector('.copiar')) return;
    const b = document.createElement('button'); b.className = 'copiar'; b.innerHTML = ICO.copiar + '<span>Copiar</span>';
    b.onclick = () => copiarTexto(p.querySelector('code').innerText).then(() => { b.lastChild.textContent = 'Copiado'; setTimeout(() => b.lastChild.textContent = 'Copiar', 1200); });
    p.appendChild(b);
    // guardar o bloco na área de código (dá para editar e pedir mudanças lá); a área de código é só do computador
    if (CELULAR) return;
    const g = document.createElement('button'); g.className = 'copiar guardar'; g.innerHTML = ICO.codigo + '<span>Guardar</span>';
    g.onclick = () => { const lang = (p.dataset.lang || '').toLowerCase(), ext = ({ python: 'py', javascript: 'js', typescript: 'ts', 'c/c++': 'c', c: 'c', 'c#': 'cs', java: 'java', kotlin: 'kt', html: 'html', css: 'css', json: 'json', sql: 'sql', bash: 'sh', go: 'go', rust: 'rs', php: 'php', ruby: 'rb', swift: 'swift' })[lang] || 'txt'; guardarNoProjeto('codigo.' + ext, p.querySelector('code').innerText, true); abrirTela('codigo'); };
    p.appendChild(g);
  });
  ligarLinks(el);
}

