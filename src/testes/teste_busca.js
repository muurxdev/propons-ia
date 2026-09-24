// Teste da busca por trechos (src/busca.js): documento de 120 páginas com 10 fatos plantados no meio e no fim;
// a página certa tem de entrar no contexto (orçamento de ~12 mil caracteres) em pelo menos 9 de 10 perguntas.
// Uso: node src/testes/teste_busca.js
const fs = require('fs'), vm = require('vm'), path = require('path');
const ctx = vm.createContext({});
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'busca.js'), 'utf8'), ctx);
const BUSCA = ctx.BUSCA;

// apostila de 120 páginas com os fatos plantados (a mesma do placar: treino/avaliar.mjs)
const { documento, FATOS } = require('./documento_longo.js');
const doc = documento();

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
