// Teste da busca por trechos (src/busca.js): documento de 120 páginas com 10 fatos plantados no meio e no fim;
// a página certa tem de entrar no contexto (orçamento de ~12 mil caracteres) em pelo menos 9 de 10 perguntas.
// Uso: node src/testes/teste_busca.js
const fs = require('fs'), vm = require('vm'), path = require('path');
const ctx = vm.createContext({});
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'busca.js'), 'utf8'), ctx);
const BUSCA = ctx.BUSCA;

// texto de enchimento parecido com uma apostila (determinístico)
let semente = 7; const rnd = () => (semente = (semente * 1103515245 + 12345) % 2147483648) / 2147483648;
const FRASES = [
  'A revolução industrial transformou a produção e as relações de trabalho nas cidades europeias.',
  'Na biologia, a célula é a unidade básica da vida e realiza funções como respiração e síntese de proteínas.',
  'O estudo das funções do primeiro grau envolve coeficiente angular, coeficiente linear e gráficos no plano cartesiano.',
  'A redação dissertativa argumentativa exige tese clara, argumentos consistentes e proposta de intervenção.',
  'Os movimentos literários brasileiros dialogam com o contexto histórico de cada época.',
  'Em química, as ligações iônicas ocorrem entre metais e ametais pela transferência de elétrons.',
  'A geografia estuda as relações entre sociedade e natureza no espaço geográfico.',
  'Na física, a segunda lei de Newton relaciona força resultante, massa e aceleração.',
  'O período colonial brasileiro foi marcado pela economia açucareira no Nordeste.',
  'A interpretação de texto depende de identificar a ideia central e as ideias secundárias.',
  'Os ecossistemas apresentam cadeias alimentares com produtores, consumidores e decompositores.',
  'A estatística descritiva usa média, moda e mediana para resumir conjuntos de dados.',
];
const FATOS = [
  [52, 'A cidade fictícia de Vale Serrano foi fundada em 1873 por tropeiros que cruzavam a serra da Mantiqueira.', 'Em que ano Vale Serrano foi fundada?'],
  [58, 'O mineral lunarita tem dureza 7,5 na escala de Mohs e brilho azulado quando aquecido.', 'Qual é a dureza da lunarita na escala de Mohs?'],
  [63, 'O professor Anselmo Queiroga propôs o método dos três círculos para memorizar verbos irregulares.', 'O que Anselmo Queiroga propôs?'],
  [71, 'A Lei de Barreto, citada nesta apostila, afirma que a evaporação dobra a cada 12 graus de aumento na temperatura do lago.', 'O que diz a Lei de Barreto sobre evaporação?'],
  [79, 'O rio Taquaruçu nasce no planalto e deságua no oceano depois de percorrer 842 quilômetros.', 'Quantos quilômetros o rio Taquaruçu percorre?'],
  [86, 'A enzima fictícia catalasina-B atua no fígado quebrando moléculas de peróxido em pH ácido.', 'Onde atua a catalasina-B?'],
  [94, 'O Tratado de Pedra Branca encerrou a guerra dos engenhos e dividiu o território em quatro capitanias.', 'O que encerrou a guerra dos engenhos?'],
  [103, 'Na fórmula do rendimento térmico usada no capítulo, o coeficiente de perda vale 0,37 para motores a vapor.', 'Quanto vale o coeficiente de perda para motores a vapor?'],
  [111, 'O poeta Eurico Valadares publicou o livro Marés de Ferro em 1932, marcando a segunda fase modernista.', 'Quem escreveu Marés de Ferro?'],
  [118, 'A reserva ecológica do Jaboti abriga 214 espécies de aves, das quais 12 são endêmicas.', 'Quantas espécies de aves há na reserva do Jaboti?'],
];
const paginas = [];
for (let p = 1; p <= 120; p++) {
  const frases = [];
  for (let i = 0; i < 14; i++) frases.push(FRASES[Math.floor(rnd() * FRASES.length)]);
  for (const [pag, fato] of FATOS) if (pag === p) frases.splice(Math.floor(rnd() * frases.length), 0, fato);
  paginas.push(`— página ${p} —\n` + frases.join(' '));
}
const doc = paginas.join('\n\n');

let acertos = 0;
for (const [pag, , pergunta] of FATOS) {
  const r = BUSCA.trechosRelevantes(doc, pergunta, 12000);
  const ok = !!(r && r.paginas.includes(pag));
  if (ok) acertos++; else console.log(`  errou: "${pergunta}" (página ${pag}) → ${r ? r.paginas.join(',') : 'nada'}`);
}
console.log(`busca por trechos: ${acertos}/10 com a página certa no contexto (documento de ${doc.length} caracteres)`);

// outros comportamentos
const falhas = [];
const r1 = BUSCA.trechosRelevantes(doc, 'o que tem na página 97?', 3000);
if (!r1 || !r1.paginas.includes(97)) falhas.push('pedir a página pelo número');
if (BUSCA.trechosRelevantes(doc, 'xyzw kkkq', 3000) !== null) falhas.push('pergunta sem nada em comum devolve null');
const r2 = BUSCA.trechosRelevantes(doc, FATOS[0][2], 12000);
if (r2.texto.length > 12000 + 2000) falhas.push('respeitar o orçamento');
const bl = BUSCA.blocos(doc, 20000);
if (bl.length < 5 || bl[0].de !== 1 || bl[bl.length - 1].ate !== 120 || bl.some(b => b.texto.length > 20000 + 40)) falhas.push('blocos para o resumo em etapas');
const docx = 'Capítulo um sobre fotossíntese e clorofila. '.repeat(50) + 'O número mágico do capítulo final é 4817.';
const r3 = BUSCA.trechosRelevantes(docx, 'qual é o número mágico?', 1500);
if (!r3 || !/4817/.test(r3.texto)) falhas.push('documento sem páginas (DOCX)');
falhas.forEach(f => console.log('  FALHOU: ' + f));
if (acertos < 9 || falhas.length) process.exit(1);
console.log('ok');
