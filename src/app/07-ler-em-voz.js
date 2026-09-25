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
    // guardar o bloco na área de código (dá para editar e pedir mudanças lá); a área de código é só do computador
    if (CELULAR) return;
    const g = document.createElement('button'); g.className = 'copiar guardar'; g.innerHTML = ICO.codigo + '<span>Guardar</span>';
    g.onclick = () => { const lang = (p.dataset.lang || '').toLowerCase(), ext = ({ python: 'py', javascript: 'js', typescript: 'ts', 'c/c++': 'c', c: 'c', 'c#': 'cs', java: 'java', kotlin: 'kt', html: 'html', css: 'css', json: 'json', sql: 'sql', bash: 'sh', go: 'go', rust: 'rs', php: 'php', ruby: 'rb', swift: 'swift' })[lang] || 'txt'; guardarNoProjeto('codigo.' + ext, p.querySelector('code').innerText, true); abrirTela('codigo'); };
    p.appendChild(g);
  });
  ligarLinks(el);
}

