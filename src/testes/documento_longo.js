// Apostila fictícia de 120 páginas com 10 fatos plantados no meio e no fim (sempre igual): usada pelo teste da busca
// por trechos (teste_busca.js) e pela categoria "documento longo" do placar (treino/avaliar.mjs).
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
function documento() {
  let semente = 7; const rnd = () => (semente = (semente * 1103515245 + 12345) % 2147483648) / 2147483648;
  const paginas = [];
  for (let p = 1; p <= 120; p++) {
    const frases = [];
    for (let i = 0; i < 14; i++) frases.push(FRASES[Math.floor(rnd() * FRASES.length)]);
    for (const [pag, fato] of FATOS) if (pag === p) frases.splice(Math.floor(rnd() * frases.length), 0, fato);
    paginas.push(`— página ${p} —\n` + frases.join(' '));
  }
  return paginas.join('\n\n');
}
module.exports = { documento, FATOS };
