/* ---------------- Resumo em áudio (duas vozes, como o Audio Overview do NotebookLM) ----------------
   A IA escreve um diálogo curto entre Ana (explica) e Léo (pergunta o que um estudante perguntaria); a voz do próprio
   aparelho lê, alternando duas vozes (ou dois tons, onde só há uma voz em português). Tudo offline. */
ICO.podcast = '<svg viewBox="0 0 24 24"><rect x="9" y="3" width="6" height="10" rx="3"/><path d="M5 10a7 7 0 0 0 14 0M12 17v4M8 21h8"/></svg>';
const NOMES_PODCAST = { A: 'Ana', B: 'Léo' };
MODOS.podcast = { nome: 'Resumo em áudio', desc: 'Duas vozes conversando sobre o tema, para ouvir como um podcast', ico: 'podcast', campo: 'podcast', placeholder: 'Cole o conteúdo ou diga o tema para ouvir…', espera: 'Escrevendo o roteiro…',
  instrucao: 'Escreva o roteiro de um podcast curto de estudo, em português do Brasil, sobre o conteúdo ou tema abaixo. Duas pessoas: "A" (Ana) explica com clareza e exemplos do dia a dia; "B" (Léo) é um estudante curioso que pergunta, resume com as próprias palavras e às vezes erra de leve para a Ana corrigir. "titulo": até 8 palavras. "falas": de 8 a 14 falas alternadas, começando pela Ana; cada fala com 1 a 3 frases, naturais, como se estivessem conversando. Só informações corretas. Termine com a Ana resumindo os 3 pontos principais. Conteúdo ou tema:',
  esquema: { type: 'object', properties: { titulo: ESQ_TXT, falas: { type: 'array', minItems: 4, maxItems: 18, items: { type: 'object', properties: { quem: { type: 'string', enum: ['A', 'B'] }, texto: ESQ_TXT }, required: ['quem', 'texto'], additionalProperties: false } } }, required: ['titulo', 'falas'], additionalProperties: false } };
function normalizarPodcast(d) {
  if (!d || typeof d !== 'object') return null;
  const falas = (Array.isArray(d.falas) ? d.falas : []).map(f => f && ({ quem: f.quem === 'B' ? 'B' : 'A', texto: typeof f.texto === 'string' ? f.texto.replace(/\s+/g, ' ').trim().slice(0, 600) : '' })).filter(f => f && f.texto).slice(0, 24);
  return falas.length >= 2 ? { titulo: typeof d.titulo === 'string' && d.titulo.trim() ? d.titulo.trim().slice(0, 120) : 'Resumo em áudio', falas } : null;
}
const markdownPodcast = d => `**🎧 ${d.titulo}**\n\n` + d.falas.map(f => `**${NOMES_PODCAST[f.quem]}:** ${f.texto}`).join('\n\n');
function htmlPodcast(m) {
  const d = m.podcast;
  return `<div class="podcast"><div class="pd-topo"><span class="pd-ico">${ICO.podcast}</span><b>${esc(d.titulo)}</b>${PLATAFORMA.temFala ? `<button class="btn primario pd-tocar" data-pd>${ICO.tocar}<span>Ouvir</span></button>` : ''}</div>
    <ol class="pd-falas">${d.falas.map((f, i) => `<li class="pd-fala ${f.quem === 'B' ? 'b' : 'a'}" data-i="${i}"><b>${NOMES_PODCAST[f.quem]}</b><span>${esc(f.texto)}</span></li>`).join('')}</ol></div>`;
}
let podcastAtual = null;   // { gen, el } enquanto toca
function pararPodcast() {
  if (!podcastAtual) return;
  const p = podcastAtual; podcastAtual = null; PLATAFORMA.pararFala();
  p.el.querySelectorAll('.pd-fala.agora').forEach(x => x.classList.remove('agora'));
  const b = p.el.querySelector('[data-pd]'); if (b) b.innerHTML = ICO.tocar + '<span>Ouvir</span>';
}
// fala uma linha e espera ela terminar (ou a pessoa parar)
function falarLinha(texto, voz, gen) {
  return new Promise(res => {
    const id = 'pod-' + gen + '-' + Math.random().toString(36).slice(2, 8);
    const ver = setInterval(() => { if (!podcastAtual || podcastAtual.gen !== gen) { clearInterval(ver); res(false); } }, 200);
    const fim = d => { if (d && d.id === id && (d.estado === 'fim' || d.estado === 'erro')) { clearInterval(ver); ouvintesPodcast.delete(fim); res(d.estado === 'fim'); } };
    ouvintesPodcast.add(fim);
    PLATAFORMA.falar(texto, id, { voz });
  });
}
const ouvintesPodcast = new Set();
PLATAFORMA.ao('fala', d => ouvintesPodcast.forEach(f => f(d)));
async function tocarPodcast(el, d) {
  if (podcastAtual && podcastAtual.el === el) { pararPodcast(); return; }
  pararPodcast(); pararLeitura();
  const gen = Date.now(); podcastAtual = { gen, el };
  const b = el.querySelector('[data-pd]'); if (b) b.innerHTML = ICO.pararFala + '<span>Parar</span>';
  for (let i = 0; i < d.falas.length; i++) {
    if (!podcastAtual || podcastAtual.gen !== gen) return;
    const li = el.querySelector(`.pd-fala[data-i="${i}"]`);
    el.querySelectorAll('.pd-fala.agora').forEach(x => x.classList.remove('agora'));
    if (li) { li.classList.add('agora'); li.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }
    const ok = await falarLinha(d.falas[i].texto, d.falas[i].quem === 'B' ? 1 : 0, gen);
    if (!ok) break;
  }
  if (podcastAtual && podcastAtual.gen === gen) pararPodcast();
}
function ligarPodcast(el, m) {
  const b = el.querySelector('[data-pd]'); if (b) b.onclick = () => tocarPodcast(el.querySelector('.podcast'), m.podcast);
}
