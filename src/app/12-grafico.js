/* ---------------- cartão do gráfico de função (a conta está em src/grafico.js) ----------------
   Fica na resposta, antes do texto (como o cartão do clima). Os números da função viram controles deslizantes; tocar ou
   passar o mouse no gráfico mostra o ponto (x; y). Tudo desenhado aqui em SVG, sem biblioteca e sem internet. */
ICO.grafico = '<svg viewBox="0 0 24 24"><path d="M4 20V4M4 20h16"/><path d="M6 16c3-8 6-8 8-4s4 3 5-2"/></svg>';
const LETRAS_GRAFICO = ['a', 'b', 'c', 'd'];
const numG = v => GRAFICO.num(v).replace(/^-/, '−');   // sinal de menos de verdade na tela
function htmlGrafico(g) {
  const a = GRAFICO.analisar(g.expr); if (!a) return '';
  const ctl = a.params.map((v, k) => {
    const r = Math.max(5, Math.abs(v) * 2), passo = r > 20 ? 1 : 0.1;
    return `<label class="gf-ctl"><span>${LETRAS_GRAFICO[k]}</span><input type="range" min="${v - r}" max="${v + r}" step="${passo}" value="${v}" data-p="${k}" aria-label="Valor de ${LETRAS_GRAFICO[k]}"><output>${numG(v)}</output></label>`;
  }).join('');
  return `<div class="grafico-card" data-expr="${esc(g.expr)}" data-de="${+g.de}" data-ate="${+g.ate}">
    <div class="gf-topo"><span class="gf-ico">${ICO.grafico}</span><b class="gf-f">f(x) = ${esc(GRAFICO.texto(a.arv, a.params))}</b>${a.params.length ? `<button class="icone gf-volta" title="Voltar aos números da pergunta" aria-label="Voltar aos números da pergunta" hidden>${ICO.recarregar}</button>` : ''}</div>
    <svg class="gf-svg" viewBox="0 0 320 200" role="img" aria-label="Gráfico de f(x) = ${esc(GRAFICO.texto(a.arv, a.params))}"></svg>
    <div class="gf-info"></div>
    ${ctl ? `<div class="gf-ctls">${ctl}</div>` : ''}</div>`;
}
// passos "redondos" para a grade (1, 2 ou 5 × 10ⁿ), com uns 5 a 8 traços
function passoBonito(amplitude) {
  const bruto = amplitude / 6, p = Math.pow(10, Math.floor(Math.log10(bruto))), n = bruto / p;
  return (n < 1.5 ? 1 : n < 3.5 ? 2 : n < 7.5 ? 5 : 10) * p;
}
function desenharGrafico(card, vals) {
  const a = GRAFICO.analisar(card.dataset.expr); if (!a) return;
  const de = +card.dataset.de, ate = +card.dataset.ate, f = x => GRAFICO.valor(a.arv, x, vals);
  const e = GRAFICO.estudar(f, de, ate);
  // altura: sem deixar uma assíntota achatar tudo (percentis 3–97), incluindo o eixo x quando está por perto
  const bons = e.ys.filter(y => isFinite(y)).sort((p, q) => p - q);
  if (!bons.length) { card.querySelector('.gf-svg').innerHTML = ''; card.querySelector('.gf-info').textContent = 'A função não existe nesse intervalo.'; return; }
  let y1 = bons[Math.floor(bons.length * 0.03)], y2 = bons[Math.ceil(bons.length * 0.97) - 1];
  if (y1 > 0 && y1 < (y2 - y1) * 0.6) y1 = 0; if (y2 < 0 && -y2 < (y2 - y1) * 0.6) y2 = 0;
  if (y2 - y1 < 1e-9) { y1 -= 1; y2 += 1; }
  const folga = (y2 - y1) * 0.12; y1 -= folga; y2 += folga;
  const W = 320, H = 200, M = 6, X = x => M + (x - de) / (ate - de) * (W - 2 * M), Y = y => H - M - (y - y1) / (y2 - y1) * (H - 2 * M);
  let s = '';
  // grade e eixos
  const px = passoBonito(ate - de), py = passoBonito(y2 - y1);
  for (let x = Math.ceil(de / px) * px; x <= ate + 1e-9; x += px) s += `<line class="gf-grade" x1="${X(x).toFixed(1)}" y1="${M}" x2="${X(x).toFixed(1)}" y2="${H - M}"/>` + (Math.abs(x) > 1e-9 ? `<text class="gf-num" x="${X(x).toFixed(1)}" y="${Math.min(H - M - 2, Math.max(12, Y(0) + 11)).toFixed(1)}" text-anchor="middle">${numG(x)}</text>` : '');
  for (let y = Math.ceil(y1 / py) * py; y <= y2 + 1e-9; y += py) s += `<line class="gf-grade" x1="${M}" y1="${Y(y).toFixed(1)}" x2="${W - M}" y2="${Y(y).toFixed(1)}"/>` + (Math.abs(y) > 1e-9 ? `<text class="gf-num" x="${Math.min(W - M - 2, Math.max(M + 2, X(0) + 3)).toFixed(1)}" y="${(Y(y) - 2).toFixed(1)}">${numG(y)}</text>` : '');
  if (de <= 0 && ate >= 0) s += `<line class="gf-eixo" x1="${X(0).toFixed(1)}" y1="${M}" x2="${X(0).toFixed(1)}" y2="${H - M}"/>`;
  if (y1 <= 0 && y2 >= 0) s += `<line class="gf-eixo" x1="${M}" y1="${Y(0).toFixed(1)}" x2="${W - M}" y2="${Y(0).toFixed(1)}"/>`;
  // a curva, quebrada onde a função não existe ou salta (assíntota)
  let d = '', antes = null;
  for (let k = 0; k < e.xs.length; k++) {
    const y = e.ys[k];
    if (!isFinite(y) || (antes != null && Math.abs(y - antes) > (y2 - y1) * 3)) { antes = isFinite(y) ? y : null; if (isFinite(y)) d += `M${X(e.xs[k]).toFixed(1)} ${Math.max(-400, Math.min(600, Y(y))).toFixed(1)}`; continue; }
    d += (antes == null ? 'M' : 'L') + X(e.xs[k]).toFixed(1) + ' ' + Math.max(-400, Math.min(600, Y(y))).toFixed(1);
    antes = y;
  }
  s += `<path class="gf-curva" d="${d}"/>`;
  e.raizes.forEach(x => { s += `<circle class="gf-ponto raiz" cx="${X(x).toFixed(1)}" cy="${Y(0).toFixed(1)}" r="3.5"/>`; });
  e.extremos.forEach(p => { if (p.y >= y1 && p.y <= y2) s += `<circle class="gf-ponto ext" cx="${X(p.x).toFixed(1)}" cy="${Y(p.y).toFixed(1)}" r="3.5"/>`; });
  if (e.y0 != null && e.y0 >= y1 && e.y0 <= y2) s += `<circle class="gf-ponto y0" cx="${X(0).toFixed(1)}" cy="${Y(e.y0).toFixed(1)}" r="3"/>`;
  s += '<g class="gf-trilha" hidden><line x1="0" y1="' + M + '" x2="0" y2="' + (H - M) + '"/><circle r="4"/><text></text></g>';
  const svg = card.querySelector('.gf-svg'); svg.innerHTML = s;
  svg._escala = { de, ate, W, M, X, Y, f };
  const info = [];
  if (e.raizes.length) info.push((e.raizes.length === 1 ? 'Raiz: ' : 'Raízes: ') + e.raizes.map(x => 'x ≈ ' + numG(x)).join(', '));
  else info.push('Não corta o eixo x aqui');
  if (e.y0 != null) info.push('corta o eixo y em ' + numG(e.y0));
  e.extremos.slice(0, 3).forEach(p => info.push(`${p.tipo} (${numG(p.x)}; ${numG(p.y)})`));
  card.querySelector('.gf-info').textContent = info.join(' · ');
  card.querySelector('.gf-f').textContent = 'f(x) = ' + GRAFICO.texto(a.arv, vals);
}
function ligarGrafico(el) {
  el.querySelectorAll('.grafico-card').forEach(card => {
    if (card._ligado) return; card._ligado = true;
    const a = GRAFICO.analisar(card.dataset.expr); if (!a) return;
    const vals = [...a.params], volta = card.querySelector('.gf-volta');
    let pend = 0;
    const redesenhar = () => { if (!pend) pend = requestAnimationFrame(() => { pend = 0; desenharGrafico(card, vals); }); };
    card.querySelectorAll('input[data-p]').forEach(inp => inp.oninput = () => {
      vals[+inp.dataset.p] = +inp.value; inp.nextElementSibling.textContent = numG(+inp.value);
      if (volta) volta.hidden = vals.every((v, k) => v === a.params[k]);
      redesenhar();
    });
    if (volta) volta.onclick = () => { a.params.forEach((v, k) => { vals[k] = v; const i = card.querySelector(`input[data-p="${k}"]`); i.value = v; i.nextElementSibling.textContent = numG(v); }); volta.hidden = true; redesenhar(); };
    // tocar/passar no gráfico: o ponto (x; y) da curva
    const svg = card.querySelector('.gf-svg');
    const mostrar = ev => {
      const esc0 = svg._escala; if (!esc0) return;
      const r = svg.getBoundingClientRect(), vx = (ev.clientX - r.left) / r.width * esc0.W;
      const x = esc0.de + (vx - esc0.M) / (esc0.W - 2 * esc0.M) * (esc0.ate - esc0.de);
      if (x < esc0.de || x > esc0.ate) return;
      const y = esc0.f(x), t = svg.querySelector('.gf-trilha'); if (!t) return;
      if (!isFinite(y)) { t.setAttribute('hidden', ''); return; }
      t.removeAttribute('hidden');
      const cx = esc0.X(x), cy = Math.max(8, Math.min(192, esc0.Y(y)));
      t.querySelector('line').setAttribute('x1', cx); t.querySelector('line').setAttribute('x2', cx);
      t.querySelector('circle').setAttribute('cx', cx); t.querySelector('circle').setAttribute('cy', cy);
      const tx = t.querySelector('text'); tx.textContent = `(${numG(x)}; ${numG(y)})`;
      tx.setAttribute('x', cx > 220 ? cx - 6 : cx + 6); tx.setAttribute('y', cy < 24 ? cy + 16 : cy - 8); tx.setAttribute('text-anchor', cx > 220 ? 'end' : 'start');
    };
    svg.addEventListener('pointermove', mostrar);
    svg.addEventListener('pointerdown', mostrar);
    svg.addEventListener('pointerleave', () => { const t = svg.querySelector('.gf-trilha'); if (t) t.setAttribute('hidden', ''); });
    desenharGrafico(card, vals);
  });
}
