// Placar do modelo (Etapa 0 do modelo próprio): roda o banco de perguntas N vezes contra um llama-server e mede
//   acerto (matemática, português, ciências, história, geografia, programação, identidade),
//   armadilhas (pergunta sem resposta certa: o modelo tem que dizer que não sabe / que não existe),
//   repetição (as N respostas à mesma pergunta têm que ser diferentes) e loops (trecho repetido dentro da resposta).
// Uso: node treino/avaliar.mjs http://127.0.0.1:8765 [chave] [--vezes 3] [--nome lume] [--pensar | --auto]
//   --auto: pensa só quando a pergunta pede (a mesma regra do esforço Auto do app: precisaPensar em src/detecta.js)
//   "documento longo": a pergunta vai com os trechos da apostila escolhidos pela mesma busca do app (src/busca.js)
// Saída: treino/avaliacao/resultado-<nome>-<data>.md (e o resumo no terminal). Toda etapa de treino tem que melhorar isto.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
const args = process.argv.slice(2);
const url = (args.find(a => /^https?:/.test(a)) || 'http://127.0.0.1:8765').replace(/\/$/, '');
const chave = args.find((a, i) => i > 0 && !a.startsWith('--') && !/^https?:/.test(a) && !/^\d+$/.test(a) && args[i - 1] !== '--vezes' && args[i - 1] !== '--nome') || '';
const opt = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
const VEZES = +opt('--vezes', 3), NOME = opt('--nome', 'modelo'), PENSAR = args.includes('--pensar'), AUTO = args.includes('--auto');
const aqui = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const banco = JSON.parse(fs.readFileSync(path.join(aqui, 'avaliacao', 'banco.json'), 'utf8'));
const SISTEMA = fs.readFileSync(path.join(aqui, '..', 'src', 'conhecimento.md'), 'utf8');
// o mesmo código do app: decisão do esforço Auto e busca por trechos no documento longo
const app = vm.createContext({});
vm.runInContext(['detecta.js', 'busca.js'].map(f => fs.readFileSync(path.join(aqui, '..', 'src', f), 'utf8')).join('\n') + ';this.precisaPensar = precisaPensar;', app);
const APOSTILA = createRequire(import.meta.url)('../src/testes/documento_longo.js').documento();
const TETO_ARQUIVO_CHARS = 8000 * 3;   // como o app: até 8 mil tokens de trechos por pergunta
function conteudo(q) {
  if (!q.documento) return q.pergunta;
  const t = app.BUSCA.trechosRelevantes(APOSTILA, q.pergunta, TETO_ARQUIVO_CHARS);
  const pags = t && t.paginas.length ? ': páginas ' + t.paginas.join(', ') : '';
  return q.pergunta + '\n\nArquivo anexado: apostila.pdf (120 páginas; só os trechos ligados à pergunta cabem na memória' + pags + ')\n```texto\n'
    + (t ? t.texto : APOSTILA.slice(0, TETO_ARQUIVO_CHARS)) + '\n```';
}
const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim();
const cab = { 'Content-Type': 'application/json', ...(chave ? { Authorization: 'Bearer ' + chave } : {}) };

async function perguntar(q, exato) {
  const pensar = PENSAR || (AUTO && app.precisaPensar(q.pergunta));
  const corpo = { messages: [{ role: 'system', content: SISTEMA }, { role: 'user', content: conteudo(q) }], max_tokens: pensar ? 1500 : 400, stream: false,
    temperature: exato ? 0.2 : 0.7, top_p: 0.95, top_k: 20, min_p: 0.02, seed: Math.floor(Math.random() * 2147483647), chat_template_kwargs: { enable_thinking: pensar },
    ...(exato ? {} : { dry_multiplier: 0.8, xtc_probability: 0.3, xtc_threshold: 0.1 }) };
  const t0 = Date.now();
  // nunca espera para sempre: resposta que não chega em 3 min conta como errada (e o placar segue)
  let j;
  try {
    const r = await fetch(url + '/v1/chat/completions', { method: 'POST', headers: cab, body: JSON.stringify(corpo), signal: AbortSignal.timeout(180000) });
    if (!r.ok) throw new Error('HTTP ' + r.status + ' ' + (await r.text()).slice(0, 200));
    j = await r.json();
  } catch (e) { console.log(`  ! ${q.id}: ${e.name === 'TimeoutError' ? 'sem resposta em 3 min' : e.message}`); return { texto: '', tokens: 0, ms: Date.now() - t0, pensou: pensar }; }
  const texto = String(j.choices[0].message.content || '').replace(/<think>[\s\S]*?(<\/think>|$)/g, '').trim();
  return { texto, tokens: j.usage ? j.usage.completion_tokens : 0, ms: Date.now() - t0, pensou: pensar };
}
// acertou? exato: o número/valor esperado aparece como primeiro "token" da resposta; regex: casa; armadilha: reconheceu que não sabe
function avaliar(q, texto) {
  const t = norm(texto);
  // exato: vale o primeiro ou o último número da resposta ("5! = 120", "49 + 9 = 58")
  if (q.tipo === 'exato') { const ns = (t.match(/-?\d+(?:[.,]\d+)?/g) || []).map(n => n.replace(',', '.')); return ns.length > 0 && (ns[0] === norm(q.resposta) || ns[ns.length - 1] === norm(q.resposta)); }
  const re = new RegExp(norm(q.regex).replace(/\\\\/g, '\\'), 'i');
  return re.test(t);
}
const jaccard = (a, b) => { const A = new Set(norm(a).split(' ')), B = new Set(norm(b).split(' ')); const i = [...A].filter(x => B.has(x)).length; return i / (A.size + B.size - i || 1); };
const temLoop = t => { const s = norm(t); for (let i = 0; i + 30 <= s.length; i += 10) { const tr = s.slice(i, i + 30); if (s.split(tr).length - 1 >= 3) return true; } return false; };

const linhas = [], porMateria = {};
let totalAcertos = 0, totalPerguntas = 0, armadilhasOk = 0, armadilhas = 0, repetidas = 0, loops = 0, tokens = 0, ms = 0, geracoes = 0, pensadas = 0;
const porRodada = Array.from({ length: VEZES }, () => ({ acertos: 0, total: 0 }));   // desvio entre as rodadas
const MODO = PENSAR ? ' · pensando' : AUTO ? ' · auto' : '';
console.log(`Placar · ${NOME} · ${banco.length} perguntas × ${VEZES}${MODO} · ${url}`);
for (const q of banco) {
  const exato = q.tipo === 'exato' || q.materia === 'matemática' || q.materia === 'programação';
  const respostas = [];
  for (let v = 0; v < VEZES; v++) {
    const r = await perguntar(q, exato); respostas.push(r.texto); tokens += r.tokens; ms += r.ms; geracoes++; if (r.pensou) pensadas++;
    if (q.tipo !== 'armadilha') { porRodada[v].total++; if (avaliar(q, r.texto)) porRodada[v].acertos++; }
  }
  const acertos = respostas.filter(t => avaliar(q, t)).length;
  let iguais = 0; for (let i = 0; i < respostas.length; i++) for (let k = i + 1; k < respostas.length; k++) if (jaccard(respostas[i], respostas[k]) >= 0.8 && !exato) iguais++;
  const comLoop = respostas.filter(temLoop).length;
  const m = porMateria[q.materia] = porMateria[q.materia] || { acertos: 0, total: 0 };
  m.acertos += acertos; m.total += VEZES;
  if (q.tipo === 'armadilha') { armadilhas += VEZES; armadilhasOk += acertos; } else { totalPerguntas += VEZES; totalAcertos += acertos; }
  repetidas += iguais; loops += comLoop;
  const flag = acertos === VEZES ? '✔' : acertos ? '~' : '✘';
  console.log(`  ${flag} ${q.id} ${acertos}/${VEZES}${iguais ? ` · ${iguais} par(es) iguais` : ''}${comLoop ? ` · loop ×${comLoop}` : ''} — ${respostas[0].replace(/\s+/g, ' ').slice(0, 90)}`);
  linhas.push(`| ${q.id} | ${q.materia} | ${acertos}/${VEZES} | ${iguais} | ${comLoop} | ${respostas[0].replace(/\|/g, '\\|').replace(/\s+/g, ' ').slice(0, 110)} |`);
}
const pct = (a, b) => b ? Math.round(100 * a / b) + '%' : '-';
const pares = banco.filter(q => q.tipo !== 'exato' && q.materia !== 'matemática' && q.materia !== 'programação').length * (VEZES * (VEZES - 1) / 2);
const taxas = porRodada.map(x => 100 * x.acertos / Math.max(1, x.total)), media = taxas.reduce((a, b) => a + b, 0) / taxas.length;
const desvio = Math.sqrt(taxas.reduce((a, b) => a + (b - media) ** 2, 0) / taxas.length);
const resumo = [
  `# Placar — ${NOME} — ${new Date().toISOString().slice(0, 16).replace('T', ' ')}${MODO.replace(' · ', ' — ')}`, '',
  `- **Acerto (perguntas com resposta):** ${pct(totalAcertos, totalPerguntas)} (${totalAcertos}/${totalPerguntas}) · desvio entre rodadas ±${desvio.toFixed(1)} pontos`,
  `- **Armadilhas reconhecidas (não inventou):** ${pct(armadilhasOk, armadilhas)} (${armadilhasOk}/${armadilhas})`,
  `- **Respostas repetidas (pares quase iguais em texto livre):** ${pct(repetidas, pares)} (${repetidas}/${pares})`,
  `- **Loops dentro da resposta:** ${loops}/${geracoes}`,
  `- **Velocidade média:** ${(tokens / (ms / 1000)).toFixed(1)} tokens/s · ${(ms / geracoes / 1000).toFixed(1)} s por resposta${AUTO ? ` · pensou em ${pct(pensadas, geracoes)}` : ''}`, '',
  '## Por matéria', '', '| matéria | acerto |', '|---|---|', ...Object.entries(porMateria).map(([k, v]) => `| ${k} | ${pct(v.acertos, v.total)} (${v.acertos}/${v.total}) |`), '',
  '## Por pergunta', '', '| id | matéria | acertos | pares iguais | loops | 1ª resposta |', '|---|---|---|---|---|---|', ...linhas, '',
];
fs.mkdirSync(path.join(aqui, 'avaliacao'), { recursive: true });
const saida = path.join(aqui, 'avaliacao', `resultado-${NOME}${MODO.replace(' · ', '-')}-${new Date().toISOString().slice(0, 10)}.md`);
fs.writeFileSync(saida, resumo.join('\n'));
console.log('\n' + resumo.slice(2, 8).join('\n') + `\n\n→ ${saida}`);
