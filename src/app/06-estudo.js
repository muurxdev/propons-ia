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
function htmlMemoria() {
  const m = memoria();
  return `<div class="secao"><h4>Memória</h4><div class="cartao"><div class="mem-lista">${m.length ? m.map((x, i) => `<div class="mem-item"><span>${esc(x)}</span><button class="icone" data-mem-rm="${i}" aria-label="Apagar">${ICO.apagar}</button></div>`).join('') : '<p class="info" style="margin:8px 12px">Nada ainda. Exemplo: "lembre que estou no 3º ano e vou fazer o ENEM".</p>'}</div>
      <div class="mem-novo"><input id="memNovo" placeholder="Adicionar: ex. estudo engenharia, prefiro exemplos com código" maxlength="200"><button class="btn primario" id="memAdd">Adicionar</button></div></div>
    <p class="info">Entra em toda resposta. Diga "lembre que…" no chat ou escreva aqui. Fica só neste aparelho.</p></div>
    ${m.length ? `<div class="botoes"><button class="btn perigo" id="memLimpar">Esquecer tudo</button></div>` : ''}`;
}
function ligarMemoria(c) {
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
  if (id === 'mapa' || id === 'plano') return normalizarMapaPlano(id, d);
  if (id === 'podcast') return normalizarPodcast(d);
  if (id === 'redacao') {
    if (!Array.isArray(d.notas) || d.notas.length !== 5) return null;
    return { notas: d.notas.map(v => clampN(v, 0, 200)), comentarios: (Array.isArray(d.comentarios) ? d.comentarios : []).map(s).concat(['', '', '', '', '']).slice(0, 5), pontos_fortes: s(d.pontos_fortes), melhorias: (Array.isArray(d.melhorias) ? d.melhorias : []).map(s).filter(Boolean).slice(0, 8), versao_melhorada: s(d.versao_melhorada).slice(0, 12000) };
  }
  return null;
}
const LETRAS = ['a', 'b', 'c', 'd'];
// versão em Markdown do resultado (copiar, exportar, ler em voz alta e o que o modelo "lembra" nas próximas mensagens)
function markdownDoModo(id, d) {
  if (id === 'mapa' || id === 'plano') return markdownMapaPlano(id, d);
  if (id === 'podcast') return markdownPodcast(d);
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
    <details class="versao-melhor"><summary>Versão melhorada</summary>${md(d.versao_melhorada)}</details></div>`;
}
function ligarWidgets(d, m) {
  if (m.mapa || m.plano) ligarMapaPlano(d, m);
  if (m.podcast) ligarPodcast(d, m);
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
// baralho do Anki de verdade (.apkg, src/anki.js): abre com "Importar" no Anki, AnkiDroid ou AnkiMobile
function exportarAnki(cartoes, nome) {
  const baralho = String(nome || (atual && atual.titulo) || 'Própons IA').replace(/\s+/g, ' ').trim().slice(0, 60) || 'Própons IA';
  let bytes; try { bytes = ANKI.gerarApkg(cartoes, baralho); } catch (e) { toast('Não foi possível montar o baralho: ' + e.message, 4000); return; }
  const arquivo = baralho.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\w -]+/g, '').trim().replace(/\s+/g, '-').toLowerCase().slice(0, 40) || 'propons';
  PLATAFORMA.salvarArquivo(arquivo + '.apkg', bytes, 'application/octet-stream')
    .then(r => r !== false && toast('Baralho pronto: abra o arquivo no Anki (Arquivo → Importar).', 4000))
    .catch(e => toast('Não foi possível exportar: ' + e.message, 4000));
}
// ancora: o botão que abriu (no PC o Revisar flutua ao lado dele); null = janela no centro (aberto dos Ajustes)
function abrirRevisao(treino, ancora) {
  const b = baralho(); const fila = treino || paraRevisar(b);
  if (!fila.length) { toast('Nenhum cartão para revisar agora.'); return; }
  const f = document.createElement('div'); f.className = 'dlg-fundo';
  f.innerHTML = `<div class="dlg folha revisao">${topoCentro('Revisar')}<div class="rv"></div></div>`;
  const folha = f.firstChild, sair = () => animarSaida(f, folha);
  f.fechar = sair; f.onclick = e => { if (e.target === f) sair(); }; folha.querySelector('[data-x]').onclick = sair;
  folhaArrastavel(f, folha, sair);
  let i = 0, feitos = 0, certos = 0; const errados = [];
  const desenhar = () => {
    const rv = folha.querySelector('.rv');
    if (i >= fila.length) { rv.innerHTML = `<div class="rv-fim"><b>${feitos} ${feitos === 1 ? 'cartão revisado' : 'cartões revisados'}</b><p class="info">${certos} de ${feitos} lembrados. Os que você errou voltam em 10 minutos; os outros, em ${fila.length ? 'alguns dias' : ''}.</p><div class="rv-fim-botoes">${errados.length ? `<button class="btn" data-rv="refazer">${ICO.recarregar}Refazer os ${errados.length} que errei</button>` : ''}<button class="btn primario" data-rv="fim">Concluir</button></div></div>`; rv.querySelector('[data-rv="fim"]').onclick = sair; const rf = rv.querySelector('[data-rv="refazer"]'); if (rf) rf.onclick = () => { const l = errados.slice().sort(() => Math.random() - 0.5); sair(); setTimeout(() => abrirRevisao(l), 260); }; return; }
    const c = fila[i];
    rv.innerHTML = `<p class="info rv-conta">${i + 1} de ${fila.length}${c.tema ? ' · ' + esc(c.tema) : ''}</p><div class="rv-cartao"><div class="rv-frente">${esc(c.frente)}</div><div class="rv-verso" hidden>${esc(c.verso)}</div></div>
      <div class="rv-botoes"><button class="btn primario" data-rv="mostrar">Mostrar resposta</button></div>
      <div class="rv-botoes rv-notas" hidden><button class="btn" data-q="0">Errei</button><button class="btn" data-q="3">Difícil</button><button class="btn" data-q="4">Bom</button><button class="btn" data-q="5">Fácil</button></div>`;
    rv.querySelector('[data-rv="mostrar"]').onclick = () => { rv.querySelector('.rv-verso').hidden = false; rv.querySelector('[data-rv="mostrar"]').parentNode.hidden = true; rv.querySelector('.rv-notas').hidden = false; };
    rv.querySelectorAll('[data-q]').forEach(bt => bt.onclick = () => {
      const q = +bt.dataset.q; if (!treino) agendarCartao(c, q); feitos++; if (q >= 3) certos++; else errados.push(c);
      const b2 = baralho(); const alvo = b2.cartoes.find(x => x.id === c.id); if (alvo && !treino) Object.assign(alvo, c); b2.revisoes = (b2.revisoes || 0) + 1; if (q >= 3) b2.acertos = (b2.acertos || 0) + 1; salvarBaralho(b2);
      i++; desenhar();
    });
  };
  desenhar();
  pausarDesenho(); document.body.appendChild(f); posicionarPop(f, folha, ancora === undefined ? $('#anexar') : ancora);
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
  // sem aviso na tela: o chip "Modo: …" na caixa e o texto do campo já dizem o que fazer
  folha.querySelectorAll('[data-modo]').forEach(bt => bt.onclick = () => { sair(); if (bt.dataset.modo === 'revisar') abrirRevisao(); else definirModo(bt.dataset.modo); });
  pausarDesenho(); document.body.appendChild(f); posicionarPop(f, folha, $('#anexar'));
}
function abaEstudo(c) {
  const b = baralho(), n = paraRevisar(b).length, pct = b.quizzes ? Math.round(100 * (b.quizAcertos || 0) / b.quizzes) : null;
  c.innerHTML = `<div class="secao"><h4>Flashcards</h4><div class="cartao"><button class="lm" id="revisarHoje"${n ? '' : ' disabled'}><span class="pt"><b>Revisar hoje</b><small>${b.cartoes.length ? (n ? `${n} ${n === 1 ? 'cartão está' : 'cartões estão'} na hora de revisar` : 'Nada para revisar agora — os cartões voltam nos dias marcados') : 'Nenhum cartão ainda. Use "+" → Modos de estudo → Flashcards e guarde no baralho.'}</small></span>${ICO.seta}</button></div>
      <p class="info" style="margin:8px 12px 0">${b.cartoes.length} ${b.cartoes.length === 1 ? 'cartão' : 'cartões'} no baralho · ${b.revisoes || 0} ${(b.revisoes || 0) === 1 ? 'revisão' : 'revisões'}${b.revisoes ? ` · ${Math.round(100 * (b.acertos || 0) / b.revisoes)}% lembrados` : ''}</p></div>
    <div class="secao" style="margin-top:18px"><h4>Quizzes</h4><p class="info" style="margin:0 12px">${b.quizzes ? `${b.quizzes} ${b.quizzes === 1 ? 'questão respondida' : 'questões respondidas'} · ${pct}% de acerto` : 'Nenhuma questão respondida ainda. Use "+" → Modos de estudo → Quiz.'}</p></div>
    <div class="secao" style="margin-top:18px"><h4>Baralho</h4><div class="botoes" style="justify-content:flex-start;padding:0 12px"><button class="btn" id="expBaralho"${b.cartoes.length ? '' : ' disabled'}>Exportar para o Anki</button><button class="btn perigo" id="apagarBaralho"${b.cartoes.length ? '' : ' disabled'}>Apagar o baralho</button></div></div>`;
  c.querySelector('#revisarHoje').onclick = () => abrirRevisao(null, null);
  c.querySelector('#expBaralho').onclick = () => exportarAnki(b.cartoes, 'Própons IA — meu baralho');
  c.querySelector('#apagarBaralho').onclick = async () => { if (await confirmar('Apagar o baralho?', `<p>${b.cartoes.length} cartões e o histórico de revisões serão apagados.</p>`, 'Apagar')) { salvarBaralho({ cartoes: [], revisoes: 0, acertos: 0 }); desenharAba(); desenharNav(); } };
}

