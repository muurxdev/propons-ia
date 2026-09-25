/* ---------------- Mapa mental e Plano de estudos (modos de estudo com resultado estruturado) ----------------
   Mapa mental (como no NotebookLM): o tema no centro e os ramos com as ideias; tocar numa ideia pede a explicação dela.
   Plano de estudos: um cronograma por dia com tarefas para marcar; o progresso fica guardado na conversa. */
ICO.mapa = '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="2.6"/><circle cx="4.5" cy="6" r="1.8"/><circle cx="19.5" cy="6" r="1.8"/><circle cx="4.5" cy="18" r="1.8"/><circle cx="19.5" cy="18" r="1.8"/><path d="M9.8 10.6 6 7.1M14.2 10.6 18 7.1M9.8 13.4 6 16.9M14.2 13.4 18 16.9"/></svg>';
ICO.plano = '<svg viewBox="0 0 24 24"><rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/><path d="m8.5 14.5 2 2 4-4"/></svg>';
MODOS.mapa = { nome: 'Mapa mental', desc: 'O tema no centro e as ideias ligadas, para ver o todo', ico: 'mapa', campo: 'mapa', placeholder: 'Cole o conteúdo ou diga o tema do mapa mental…', espera: 'Montando o mapa mental…',
  instrucao: 'Monte um mapa mental de estudo sobre o conteúdo ou tema abaixo. "central": o tema em até 5 palavras. "ramos": de 4 a 7 ideias principais; cada ramo tem "titulo" (até 5 palavras) e "itens" (de 2 a 5 ideias curtas, até 10 palavras cada: conceitos, exemplos, fórmulas, datas). Use só informações corretas. Conteúdo ou tema:',
  esquema: { type: 'object', properties: { central: ESQ_TXT, ramos: { type: 'array', minItems: 3, maxItems: 8, items: { type: 'object', properties: { titulo: ESQ_TXT, itens: { type: 'array', minItems: 1, maxItems: 6, items: ESQ_TXT } }, required: ['titulo', 'itens'], additionalProperties: false } } }, required: ['central', 'ramos'], additionalProperties: false } };
MODOS.plano = { nome: 'Plano de estudos', desc: 'Um cronograma por dia, com tarefas para ir marcando', ico: 'plano', campo: 'plano', placeholder: 'Diga a prova, o prazo e as matérias (ex.: ENEM em 30 dias, foco em matemática)…', espera: 'Montando o plano de estudos…',
  instrucao: 'Monte um plano de estudos realista a partir do pedido abaixo. "titulo": o objetivo em até 8 palavras. "dias": de 5 a 14 dias (se o prazo for maior, faça uma semana-modelo); cada dia tem "dia" (ex.: "Dia 1" ou "Segunda"), "foco" (a matéria ou tema, até 6 palavras) e "tarefas" (de 2 a 4 tarefas concretas e curtas, até 12 palavras cada, com revisão e exercícios; inclua um dia mais leve por semana). "dica": uma dica curta de como seguir o plano. Pedido:',
  esquema: { type: 'object', properties: { titulo: ESQ_TXT, dias: { type: 'array', minItems: 3, maxItems: 16, items: { type: 'object', properties: { dia: ESQ_TXT, foco: ESQ_TXT, tarefas: { type: 'array', minItems: 1, maxItems: 6, items: ESQ_TXT } }, required: ['dia', 'foco', 'tarefas'], additionalProperties: false } }, dica: ESQ_TXT }, required: ['titulo', 'dias', 'dica'], additionalProperties: false } };

// confere o JSON (vindo do modelo ou do histórico); null se não serve
function normalizarMapaPlano(id, d) {
  if (!d || typeof d !== 'object') return null;
  const s = (v, n) => typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, n) : '';
  if (id === 'mapa') {
    const ramos = (Array.isArray(d.ramos) ? d.ramos : []).map(r => r && ({ titulo: s(r.titulo, 80), itens: (Array.isArray(r.itens) ? r.itens : []).map(x => s(x, 160)).filter(Boolean).slice(0, 8) }))
      .filter(r => r && r.titulo).slice(0, 8);
    return s(d.central, 80) && ramos.length >= 2 ? { central: s(d.central, 80), ramos } : null;
  }
  if (id === 'plano') {
    const dias = (Array.isArray(d.dias) ? d.dias : []).map(x => x && ({ dia: s(x.dia, 40), foco: s(x.foco, 80), tarefas: (Array.isArray(x.tarefas) ? x.tarefas : []).map(t => s(t, 200)).filter(Boolean).slice(0, 8) }))
      .filter(x => x && x.dia && x.tarefas.length).slice(0, 31);
    if (!dias.length) return null;
    const feitas = Array.isArray(d.feitas) ? d.feitas.filter(k => typeof k === 'string' && /^\d+\.\d+$/.test(k)).slice(0, 300) : [];
    return { titulo: s(d.titulo, 120) || 'Plano de estudos', dias, dica: s(d.dica, 400), feitas };
  }
  return null;
}
function markdownMapaPlano(id, d) {
  if (id === 'mapa') return `**Mapa mental: ${d.central}**\n\n` + d.ramos.map(r => `- **${r.titulo}**\n` + r.itens.map(x => `  - ${x}`).join('\n')).join('\n');
  if (id === 'plano') return `**${d.titulo}**\n\n` + d.dias.map(x => `**${x.dia}${x.foco ? ' — ' + x.foco : ''}**\n` + x.tarefas.map(t => `- [ ] ${t}`).join('\n')).join('\n\n') + (d.dica ? `\n\n*Dica: ${d.dica}*` : '');
  return '';
}
// cores dos ramos: tons que funcionam nos dois temas
const CORES_MAPA = ['#8b7cf6', '#22a6b3', '#e0913a', '#3fa66a', '#d4577a', '#5b8def', '#b58a2e', '#8e6fd1'];
function htmlMapa(m) {
  const d = m.mapa;
  return `<div class="mapa"><div class="mp-centro">${esc(d.central)}</div><div class="mp-ramos">${d.ramos.map((r, i) => `<div class="mp-ramo" style="--c:${CORES_MAPA[i % CORES_MAPA.length]}">
      <b class="mp-titulo">${esc(r.titulo)}</b><div class="mp-itens">${r.itens.map(x => `<button type="button" class="mp-item" data-mp="${esc(r.titulo)}">${esc(x)}</button>`).join('')}</div></div>`).join('')}</div>
    <p class="info mp-dica">Toque numa ideia para a IA explicar.</p></div>`;
}
function htmlPlano(m) {
  const d = m.plano, feitas = new Set(d.feitas || []), total = d.dias.reduce((n, x) => n + x.tarefas.length, 0);
  return `<div class="plano"><div class="pl-topo"><b>${esc(d.titulo)}</b><span class="pl-conta">${feitas.size} de ${total}</span></div>
    <div class="pl-barra"><i style="width:${total ? Math.round(100 * feitas.size / total) : 0}%"></i></div>
    <div class="pl-dias">${d.dias.map((x, i) => `<div class="pl-dia${x.tarefas.every((_, k) => feitas.has(i + '.' + k)) ? ' feito' : ''}"><div class="pl-cab"><b>${esc(x.dia)}</b>${x.foco ? `<small>${esc(x.foco)}</small>` : ''}</div>
      ${x.tarefas.map((t, k) => `<label class="pl-tarefa"><input type="checkbox" data-pl="${i}.${k}"${feitas.has(i + '.' + k) ? ' checked' : ''}><span>${esc(t)}</span></label>`).join('')}</div>`).join('')}</div>
    ${d.dica ? `<p class="info pl-dicaT">${esc(d.dica)}</p>` : ''}</div>`;
}
function ligarMapaPlano(d, m) {
  if (m.mapa) d.querySelectorAll('.mp-item').forEach(b => b.onclick = () => enviar(`Explique melhor "${b.textContent}" (do ramo "${b.dataset.mp}", no tema ${m.mapa.central}).`, []));
  if (m.plano) d.querySelectorAll('[data-pl]').forEach(c => c.onchange = () => {
    const f = new Set(m.plano.feitas || []); if (c.checked) f.add(c.dataset.pl); else f.delete(c.dataset.pl);
    m.plano.feitas = [...f]; salvar();
    const total = m.plano.dias.reduce((n, x) => n + x.tarefas.length, 0), pl = c.closest('.plano');
    pl.querySelector('.pl-conta').textContent = `${f.size} de ${total}`;
    pl.querySelector('.pl-barra i').style.width = Math.round(100 * f.size / Math.max(1, total)) + '%';
    const dia = c.closest('.pl-dia'); dia.classList.toggle('feito', [...dia.querySelectorAll('[data-pl]')].every(x => x.checked));
    if (c.checked) marcarDiaDeEstudo();
    if (f.size === total) toast('Plano completo. Parabéns!', 3000);
  });
}
