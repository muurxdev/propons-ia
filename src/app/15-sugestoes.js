/* ---------------- sugestões no fim da resposta ----------------
   Terminada a resposta, a IA sugere três perguntas curtas para seguir no mesmo assunto (na voz do estudante). Elas
   aparecem embaixo da última resposta; tocar manda a pergunta. Mandou outra coisa, elas somem. O pedido começa pela
   mesma conversa (o motor reaproveita o que já leu) e para na hora se a pessoa mandar outra mensagem.
   Dá para desligar em Ajustes → Respostas. */
const querSugestoes = () => pref('sugestoes') !== 'nao';
const ESQ_SUGESTOES = { type: 'object', properties: { sugestoes: { type: 'array', minItems: 3, maxItems: 3, items: { type: 'string', maxLength: 80 } } }, required: ['sugestoes'] };
let sugCtrl = null;
function pararSugestoes() { if (sugCtrl) { sugCtrl.abort(); sugCtrl = null; } document.querySelectorAll('.sugestoes').forEach(s => s.remove()); }
function limparSugestoes(t) {
  let l = [];
  try { l = JSON.parse(t).sugestoes || []; } catch (e) { l = String(t || '').split('\n'); }
  const vistas = new Set();
  return l.map(x => String(x || '').replace(/^\s*[-*\d.)"“]+\s*|["”]\s*$/g, '').trim())
    .filter(x => x.length >= 6 && x.length <= 90 && !vistas.has(x.toLowerCase()) && vistas.add(x.toLowerCase())).slice(0, 3);
}
async function sugerirSeguintes(conv, msg) {
  if (!querSugestoes() || !online || !msg || !msg.texto || msg.interno || msg.erro || msg.cartoes || msg.quiz || msg.redacao || msg.mapa || msg.plano) return;
  pararSugestoes();
  const ctrl = new AbortController(); sugCtrl = ctrl;
  // o lugar delas já fica reservado (três pílulas apagadas): quando chegam, nada embaixo da resposta pula
  const ultimaIa = atual === conv && conv.msgs[conv.msgs.length - 1] === msg ? [...document.querySelectorAll('.msg.ia')].pop() : null;
  let reserva = null;
  if (ultimaIa) { reserva = document.createElement('div'); reserva.className = 'sugestoes esperando'; reserva.setAttribute('aria-hidden', 'true'); reserva.innerHTML = '<i></i><i></i><i></i>'; ultimaIa.appendChild(reserva); rolar(); }
  const tirarReserva = () => { if (reserva) reserva.remove(); };
  const pp = conv._prompt || { sistema: SYSTEM, max: 900 }, hist = montarHistorico(conv, pp.max, pp.sistema);
  let out = '';
  try {
    await PLATAFORMA.gerar([{ role: 'system', content: pp.sistema }, ...hist, { role: 'user', content: 'Sugira 3 perguntas curtas (até 8 palavras cada), em português do Brasil, que eu poderia fazer agora para continuar ESTE assunto — na minha voz de estudante (ex.: "Me dá um exemplo prático"). Não repita o que já foi respondido. Responda só com o JSON.' }],
      { temperatura: 0.5, exato: true, maxTokens: CELULAR ? 90 : 120, esquema: ESQ_SUGESTOES }, t => { out += t; }, ctrl.signal);
  } catch (e) { tirarReserva(); return; }
  if (ctrl.signal.aborted || sugCtrl !== ctrl) { tirarReserva(); return; }
  sugCtrl = null;
  const l = limparSugestoes(out); if (!l.length) { tirarReserva(); return; }
  msg.sugestoes = l; salvar();
  if (atual === conv && conv.msgs[conv.msgs.length - 1] === msg) mostrarSugestoes(msg);
}
function anexarSugestoes(alvo, msg) {
  const d = document.createElement('div'); d.className = 'sugestoes';
  d.innerHTML = msg.sugestoes.map(s => `<button type="button">${ICO.seguir}<span>${esc(s)}</span></button>`).join('');
  d.querySelectorAll('button').forEach((b, i) => b.onclick = () => { d.remove(); enviar(msg.sugestoes[i], []); });   // [] = a caixa fica como está
  alvo.appendChild(d);
}
function mostrarSugestoes(msg) {
  document.querySelectorAll('.sugestoes').forEach(s => s.remove());
  const alvo = [...document.querySelectorAll('.msg.ia')].pop(); if (!alvo || !msg.sugestoes || !msg.sugestoes.length) return;
  anexarSugestoes(alvo, msg); rolar();
}
