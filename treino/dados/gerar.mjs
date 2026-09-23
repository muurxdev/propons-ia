// Gera exemplos de treino em volume com um modelo local (Aurora/Ápice PENSANDO, que acerta mais) a partir de uma
// lista de tópicos, e só guarda o que passa na conferência: a mesma pergunta é respondida 2 vezes de forma
// independente e um "revisor" (o próprio modelo, pensando) confirma que as duas concordam e que a resposta está
// correta e no estilo da Própons. Saída: dados/gerado-<materia>.jsonl (revise por amostragem antes de treinar!).
// Uso: node treino/dados/gerar.mjs http://127.0.0.1:8765 [chave] --materia matematica --n 60 [--topicos arquivo.txt]
import fs from 'node:fs';
import path from 'node:path';
const args = process.argv.slice(2);
const url = (args.find(a => /^https?:/.test(a)) || 'http://127.0.0.1:8765').replace(/\/$/, '');
const chave = args.find((a, i) => i > 0 && !a.startsWith('--') && !/^https?:/.test(a) && !/^\d+$/.test(a) && !['--materia', '--n', '--topicos'].includes(args[i - 1])) || '';
const opt = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
const MATERIA = opt('--materia', 'matematica'), N = +opt('--n', 40);
const aqui = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const cab = { 'Content-Type': 'application/json', ...(chave ? { Authorization: 'Bearer ' + chave } : {}) };
const SISTEMA = fs.readFileSync(path.join(aqui, '..', '..', 'src', 'conhecimento.md'), 'utf8');

// tópicos por matéria (nível ensino médio / ENEM); pode passar um arquivo com um tópico por linha
const TOPICOS = {
  matematica: ['equação do 1º grau', 'equação do 2º grau (Bhaskara)', 'porcentagem e juros simples', 'regra de três simples', 'área de figuras planas', 'teorema de Pitágoras', 'progressão aritmética', 'progressão geométrica', 'funções de 1º grau', 'probabilidade simples', 'média, mediana e moda', 'razão e proporção', 'frações: soma e produto', 'potenciação e radiciação', 'análise combinatória básica', 'volume de prismas e cilindros', 'trigonometria no triângulo retângulo', 'logaritmo: definição e propriedades', 'sistemas de equações', 'MMC e MDC'],
  portugues: ['sujeito e predicado', 'classes de palavras', 'crase', 'concordância verbal', 'regência verbal', 'figuras de linguagem', 'acentuação gráfica', 'orações subordinadas', 'vozes verbais', 'pontuação: vírgula', 'funções da linguagem', 'coesão e coerência', 'gêneros textuais', 'tipos de discurso', 'Romantismo no Brasil', 'Realismo e Machado de Assis', 'Modernismo: Semana de 22', 'variação linguística', 'interpretação de texto', 'redação: proposta de intervenção'],
  ciencias: ['fotossíntese', 'respiração celular', 'DNA e RNA', 'mitose e meiose', 'leis de Newton', 'cinemática: MRU e MRUV', 'energia cinética e potencial', 'tabela periódica', 'ligações químicas', 'reações químicas e balanceamento', 'estequiometria básica', 'ecologia: cadeias alimentares', 'genética: leis de Mendel', 'sistema circulatório', 'sistema nervoso', 'ondas: som e luz', 'eletricidade: lei de Ohm', 'termologia: calor e temperatura', 'soluções e concentração', 'evolução: seleção natural'],
  historia: ['Brasil Colônia: economia açucareira', 'Independência do Brasil', 'Proclamação da República', 'Era Vargas', 'Ditadura militar (1964–1985)', 'Revolução Francesa', 'Revolução Industrial', 'Primeira Guerra Mundial', 'Segunda Guerra Mundial', 'Guerra Fria', 'Idade Média: feudalismo', 'Grandes Navegações', 'Iluminismo', 'Escravidão e abolição no Brasil', 'Constituição de 1988'],
  geografia: ['clima e vegetação do Brasil', 'urbanização brasileira', 'globalização', 'blocos econômicos', 'fontes de energia', 'placas tectônicas', 'relevo brasileiro', 'bacias hidrográficas', 'população: pirâmides etárias', 'agronegócio e questão agrária', 'coordenadas geográficas e fusos horários', 'problemas ambientais urbanos'],
  programacao: ['variáveis e tipos', 'condicionais', 'laços de repetição', 'funções', 'listas e vetores', 'strings', 'recursão', 'busca binária', 'ordenação: bubble e quick sort', 'complexidade Big-O', 'dicionários/mapas', 'leitura de arquivos', 'tratamento de erros', 'classes e objetos', 'SQL básico: SELECT e WHERE'],
};
const topicos = opt('--topicos') ? fs.readFileSync(opt('--topicos'), 'utf8').split('\n').map(s => s.trim()).filter(Boolean) : (TOPICOS[MATERIA] || TOPICOS.matematica);
const ESTILOS = ['pergunta direta de aluno, informal', 'pedido de explicação para prova', 'exercício com números para resolver passo a passo', 'dúvida sobre um erro comum', 'pedido de resumo curto', 'pedido de exemplo do dia a dia'];

async function chat(mensagens, { pensar = true, temperatura = 0.7, max = 1200, esquema } = {}) {
  const corpo = { messages: mensagens, max_tokens: max, temperature: temperatura, top_p: 0.95, top_k: 20, min_p: 0.02, seed: Math.floor(Math.random() * 2147483647),
    chat_template_kwargs: { enable_thinking: pensar }, ...(esquema ? { response_format: { type: 'json_schema', json_schema: { name: 'r', schema: esquema } } } : {}) };
  const r = await fetch(url + '/v1/chat/completions', { method: 'POST', headers: cab, body: JSON.stringify(corpo) });
  if (!r.ok) throw new Error('HTTP ' + r.status);
  const j = await r.json(); return String(j.choices[0].message.content || '').replace(/<think>[\s\S]*?(<\/think>|$)/g, '').trim();
}
const ESQ_PERGUNTA = { type: 'object', properties: { pergunta: { type: 'string' } }, required: ['pergunta'], additionalProperties: false };
const ESQ_REVISAO = { type: 'object', properties: { correta: { type: 'boolean' }, concordam: { type: 'boolean' }, motivo: { type: 'string' } }, required: ['correta', 'concordam', 'motivo'], additionalProperties: false };

const saida = path.join(aqui, `gerado-${MATERIA}.jsonl`);
let feitos = 0, aceitos = 0, rejeitados = 0;
while (aceitos < N) {
  const topico = topicos[feitos % topicos.length], estilo = ESTILOS[Math.floor(Math.random() * ESTILOS.length)]; feitos++;
  try {
    const pq = JSON.parse(await chat([{ role: 'user', content: `Escreva UMA pergunta que um estudante brasileiro do ensino médio faria a uma assistente de estudos sobre "${topico}" (${MATERIA}). Estilo: ${estilo}. Só a pergunta, em português do Brasil, sem resposta. Se for exercício, invente números concretos e razoáveis.` }], { esquema: ESQ_PERGUNTA, pensar: false, max: 200 })).pergunta.trim();
    if (!pq || pq.length < 12) { rejeitados++; continue; }
    const [r1, r2] = await Promise.all([1, 2].map(() => chat([{ role: 'system', content: SISTEMA }, { role: 'user', content: pq }], { pensar: true })));
    if (!r1 || !r2) { rejeitados++; continue; }
    const rev = JSON.parse(await chat([{ role: 'user', content: `Você é um professor revisor rigoroso. Pergunta de um aluno:\n\n${pq}\n\nResposta A:\n${r1}\n\nResposta B:\n${r2}\n\nAs duas respostas chegam à MESMA conclusão/resultado? A resposta A está correta, sem inventar fatos, em português do Brasil, clara e no tom de uma assistente de estudos? Responda em JSON: correta (A está correta), concordam (A e B concordam no essencial), motivo (uma frase).` }], { esquema: ESQ_REVISAO, pensar: true, max: 800 }));
    if (!rev.correta || !rev.concordam) { rejeitados++; console.log(`  ✘ ${topico}: ${rev.motivo.slice(0, 80)}`); continue; }
    fs.appendFileSync(saida, JSON.stringify({ licenca: 'proprio', tipo: 'conhecimento', origem: 'gerado+revisado', materia: MATERIA, topico, messages: [{ role: 'user', content: pq }, { role: 'assistant', content: r1 }] }) + '\n');
    aceitos++; console.log(`  ✔ ${aceitos}/${N} ${topico}: ${pq.slice(0, 70)}`);
  } catch (e) { rejeitados++; console.log('  erro:', e.message); }
}
console.log(`\n${aceitos} aceitos, ${rejeitados} rejeitados → ${saida}\nRevise por amostragem antes de treinar (o revisor é o mesmo modelo).`);
