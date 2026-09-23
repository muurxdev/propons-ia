// Gera exemplos de treino em volume com um modelo local (Aurora/Ápice PENSANDO, que acerta mais) e só guarda o que
// passa na conferência. Para economizar tempo: as perguntas de um tópico saem numa chamada só (JSON), as respostas
// vão em paralelo (use o motor com -np 4) e um "revisor" (o próprio modelo, pensando) aprova ou reprova cada par.
// Em matemática e programação exigimos DUAS respostas independentes que concordem; nas outras matérias, uma resposta
// + revisor. Saída: dados/gerado-<materia>.jsonl (revise por amostragem antes de treinar!).
// Uso: node treino/dados/gerar.mjs http://127.0.0.1:8765 [chave] --materia matematica --n 60 [--paralelo 2] [--topicos arq.txt]
import fs from 'node:fs';
import path from 'node:path';
const args = process.argv.slice(2);
const url = (args.find(a => /^https?:/.test(a)) || 'http://127.0.0.1:8765').replace(/\/$/, '');
const chave = args.find((a, i) => i > 0 && !a.startsWith('--') && !/^https?:/.test(a) && !/^\d+$/.test(a) && !['--materia', '--n', '--topicos', '--paralelo'].includes(args[i - 1])) || '';
const opt = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
const MATERIA = opt('--materia', 'matematica'), N = +opt('--n', 40), PARALELO = +opt('--paralelo', 2);
const aqui = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const cab = { 'Content-Type': 'application/json', ...(chave ? { Authorization: 'Bearer ' + chave } : {}) };
const SISTEMA = fs.readFileSync(path.join(aqui, '..', '..', 'src', 'conhecimento.md'), 'utf8');
const EXATA = ['matematica', 'programacao'];   // aqui duas respostas independentes têm de concordar

const TOPICOS = {
  matematica: ['equação do 1º grau', 'equação do 2º grau (Bhaskara)', 'porcentagem e juros simples', 'regra de três simples', 'área de figuras planas', 'teorema de Pitágoras', 'progressão aritmética', 'progressão geométrica', 'função de 1º grau', 'função de 2º grau', 'probabilidade simples', 'média, mediana e moda', 'razão e proporção', 'frações: soma e produto', 'potenciação e radiciação', 'análise combinatória básica', 'volume de prismas e cilindros', 'trigonometria no triângulo retângulo', 'logaritmo: definição e propriedades', 'sistemas de equações', 'MMC e MDC', 'regra de três composta', 'juros compostos', 'porcentagem: aumento e desconto sucessivos', 'geometria analítica: distância entre pontos'],
  portugues: ['sujeito e predicado', 'classes de palavras', 'crase', 'concordância verbal', 'concordância nominal', 'regência verbal', 'figuras de linguagem', 'acentuação gráfica', 'orações subordinadas', 'orações coordenadas', 'vozes verbais', 'pontuação: vírgula', 'funções da linguagem', 'coesão e coerência', 'gêneros textuais', 'discurso direto e indireto', 'Romantismo no Brasil', 'Realismo e Machado de Assis', 'Modernismo: Semana de 22', 'variação linguística', 'interpretação de texto', 'redação: proposta de intervenção', 'uso dos porquês', 'pronomes relativos', 'colocação pronominal'],
  ciencias: ['fotossíntese', 'respiração celular', 'DNA e RNA', 'mitose e meiose', 'leis de Newton', 'cinemática: MRU e MRUV', 'energia cinética e potencial', 'tabela periódica', 'ligações químicas', 'reações químicas e balanceamento', 'estequiometria básica', 'ecologia: cadeias alimentares', 'genética: leis de Mendel', 'sistema circulatório', 'sistema nervoso', 'ondas: som e luz', 'eletricidade: lei de Ohm', 'termologia: calor e temperatura', 'soluções e concentração', 'evolução: seleção natural', 'vírus e bactérias', 'ciclos biogeoquímicos', 'óptica: espelhos e lentes', 'ácidos e bases (pH)', 'sistema digestório'],
  historia: ['Brasil Colônia: economia açucareira', 'Independência do Brasil', 'Proclamação da República', 'Era Vargas', 'Ditadura militar (1964–1985)', 'Revolução Francesa', 'Revolução Industrial', 'Primeira Guerra Mundial', 'Segunda Guerra Mundial', 'Guerra Fria', 'Idade Média: feudalismo', 'Grandes Navegações', 'Iluminismo', 'Escravidão e abolição no Brasil', 'Constituição de 1988', 'Império Romano', 'Revolta da Vacina e Canudos', 'República Velha: café com leite', 'Descolonização da África', 'Egito e Mesopotâmia antigos'],
  geografia: ['clima e vegetação do Brasil', 'urbanização brasileira', 'globalização', 'blocos econômicos', 'fontes de energia', 'placas tectônicas', 'relevo brasileiro', 'bacias hidrográficas', 'população: pirâmides etárias', 'agronegócio e questão agrária', 'coordenadas geográficas e fusos horários', 'problemas ambientais urbanos', 'biomas brasileiros', 'indústria brasileira', 'migrações internas'],
  programacao: ['variáveis e tipos', 'condicionais', 'laços de repetição', 'funções', 'listas e vetores', 'strings', 'recursão', 'busca binária', 'ordenação: bubble e quick sort', 'complexidade Big-O', 'dicionários/mapas', 'leitura de arquivos', 'tratamento de erros', 'classes e objetos', 'SQL básico: SELECT e WHERE', 'matrizes', 'pilhas e filas', 'módulos e bibliotecas'],
};
const topicos = opt('--topicos') ? fs.readFileSync(opt('--topicos'), 'utf8').split('\n').map(s => s.trim()).filter(Boolean) : (TOPICOS[MATERIA] || TOPICOS.matematica);
const ESTILOS = ['pergunta direta de aluno, informal', 'pedido de explicação para prova', 'exercício com números concretos para resolver passo a passo', 'dúvida sobre um erro comum', 'pedido de resumo curto', 'pedido de exemplo do dia a dia'];

async function chat(mensagens, { pensar = true, temperatura = 0.7, max = 1200, esquema } = {}) {
  const corpo = { messages: mensagens, max_tokens: max, temperature: temperatura, top_p: 0.95, top_k: 20, min_p: 0.02, seed: Math.floor(Math.random() * 2147483647),
    chat_template_kwargs: { enable_thinking: pensar }, ...(esquema ? { response_format: { type: 'json_schema', json_schema: { name: 'r', schema: esquema } } } : {}) };
  const r = await fetch(url + '/v1/chat/completions', { method: 'POST', headers: cab, body: JSON.stringify(corpo) });
  if (!r.ok) throw new Error('HTTP ' + r.status);
  const j = await r.json(); return String(j.choices[0].message.content || '').replace(/<think>[\s\S]*?(<\/think>|$)/g, '').trim();
}
const ESQ_PERGUNTAS = { type: 'object', properties: { perguntas: { type: 'array', minItems: 2, maxItems: 4, items: { type: 'string' } } }, required: ['perguntas'], additionalProperties: false };
// "analise" vem ANTES do veredito (o modelo raciocina escrevendo, dentro do próprio JSON). Sem enable_thinking aqui:
// com esquema + pensar, o raciocínio consome todos os tokens e a resposta volta vazia.
const ESQ_REVISAO = { type: 'object', properties: { analise: { type: 'string' }, pergunta_ok: { type: 'boolean' }, correta: { type: 'boolean' }, boa: { type: 'boolean' } }, required: ['analise', 'pergunta_ok', 'correta', 'boa'], additionalProperties: false };

const saida = path.join(aqui, `gerado-${MATERIA}.jsonl`);
const jaTem = new Set(fs.existsSync(saida) ? fs.readFileSync(saida, 'utf8').split('\n').filter(Boolean).map(l => { try { return JSON.parse(l).messages[0].content.toLowerCase().slice(0, 60); } catch (e) { return ''; } }) : []);
let aceitos = 0, rejeitados = 0, fila = [], t0 = Date.now();

async function proximaPergunta() {
  while (!fila.length) {
    const topico = topicos[Math.floor(Math.random() * topicos.length)], estilo = ESTILOS[Math.floor(Math.random() * ESTILOS.length)];
    try {
      const { perguntas } = JSON.parse(await chat([{ role: 'user', content: `Escreva 3 perguntas DIFERENTES que estudantes brasileiros do ensino médio fariam a uma assistente de estudos sobre "${topico}" (${MATERIA}). Estilo: ${estilo}.\n\nRegras: português do Brasil correto (revise a gramática de cada frase); cada pergunta tem de se sustentar sozinha, com todos os dados necessários; se for exercício, use números concretos e razoáveis; nada de LaTeX nem fórmulas escritas com $; só as perguntas, sem respostas.` }], { esquema: ESQ_PERGUNTAS, pensar: false, max: 400, temperatura: 0.9 }));
      for (const p of perguntas) { const q = String(p).trim(); if (q.length > 12 && !jaTem.has(q.toLowerCase().slice(0, 60))) fila.push({ topico, pergunta: q }); }
    } catch (e) { rejeitados++; }
  }
  return fila.shift();
}
async function umExemplo() {
  const { topico, pergunta } = await proximaPergunta();
  const exata = EXATA.includes(MATERIA);
  const respostas = await Promise.all((exata ? [1, 2] : [1]).map(() => chat([{ role: 'system', content: SISTEMA }, { role: 'user', content: pergunta }], { pensar: true })));
  if (respostas.some(r => !r)) { rejeitados++; return; }
  const alvo = respostas[0];
  const rev = JSON.parse(await chat([{ role: 'user', content: `Você é um professor revisor rigoroso.\n\nPergunta de um aluno:\n${pergunta}\n\nResposta a revisar:\n${alvo}\n${exata ? `\nOutra tentativa independente (outra IA):\n${respostas[1]}\n` : ''}\nResponda em JSON, nesta ordem:\n"analise": ${exata ? 'REFAÇA VOCÊ MESMO a conta/o raciocínio, passo a passo, e compare com o resultado da resposta a revisar e com a outra tentativa' : 'confira os fatos da resposta um por um, com cuidado'} (3 a 5 frases);\n"pergunta_ok": true só se a PERGUNTA do aluno está em português correto, faz sentido e tem todos os dados necessários;\n"correta": true só se a resposta a revisar está certa, sem erro de conta e sem inventar fatos${exata ? ', e chega ao mesmo resultado que a outra tentativa' : ''};\n"boa": true só se está em português do Brasil, clara, no tom de uma assistente de estudos, sem enrolação e sem rótulos fora de lugar.` }], { esquema: ESQ_REVISAO, pensar: false, max: 900, temperatura: 0.3 }));
  if (!rev.pergunta_ok || !rev.correta || !rev.boa) { rejeitados++; console.log(`  ✘ ${topico}: ${String(rev.analise).replace(/\s+/g, ' ').slice(0, 80)}`); return; }
  jaTem.add(pergunta.toLowerCase().slice(0, 60));
  fs.appendFileSync(saida, JSON.stringify({ licenca: 'proprio', tipo: 'conhecimento', origem: 'gerado+revisado', materia: MATERIA, topico, messages: [{ role: 'user', content: pergunta }, { role: 'assistant', content: alvo }] }) + '\n');
  aceitos++;
  const min = (Date.now() - t0) / 60000;
  console.log(`  ✔ ${aceitos}/${N} (${(aceitos / Math.max(min, 0.1)).toFixed(1)}/min) ${topico}: ${pergunta.slice(0, 60)}`);
}
console.log(`Gerando ${N} exemplos de ${MATERIA} (${PARALELO} em paralelo) · ${url}`);
let seguidos = 0;
await Promise.all(Array.from({ length: PARALELO }, async () => {
  while (aceitos < N) {
    try { await umExemplo(); seguidos = 0; }
    catch (e) { rejeitados++; seguidos++; console.log('  erro:', String(e.message).slice(0, 120)); if (seguidos > 8) { console.log('  8 erros seguidos: parando.'); break; } }
  }
}));
console.log(`\n${aceitos} aceitos, ${rejeitados} rejeitados em ${((Date.now() - t0) / 60000).toFixed(1)} min → ${saida}\nRevise por amostragem antes de treinar (o revisor é o mesmo modelo).`);
