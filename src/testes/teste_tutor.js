// Sequência de estudo (src/app/06-tutor.js): dias seguidos contam, um dia de descanso depois de 6 seguidos não quebra,
// dois dias sem estudar quebram; hoje ainda sem estudo conta até ontem.
// Uso: node src/testes/teste_tutor.js
const fs = require('fs'), vm = require('vm'), path = require('path');
const guardado = {};
const ctx = vm.createContext({ ICO: {}, MODOS: {}, pref: (k, v) => v === undefined ? guardado[k] : (guardado[k] = v), Date, JSON, Math, Set, String, Object, console });
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'app', '06-tutor.js'), 'utf8') + ';this.T = { sequenciaDeEstudo, hojeISO };', ctx);
const { sequenciaDeEstudo, hojeISO } = ctx.T;
const hoje = new Date(2026, 8, 25);
const dia = n => { const d = new Date(hoje); d.setDate(d.getDate() - n); return hojeISO(d); };
let falhas = 0;
const caso = (nome, dias, esperado) => { guardado.diasEstudo = JSON.stringify(dias.map(dia)); const n = sequenciaDeEstudo(hoje); if (n !== esperado) { falhas++; console.log(`  FALHOU: ${nome} → ${n} (esperado ${esperado})`); } };
caso('três dias seguidos até hoje', [0, 1, 2], 3);
caso('hoje ainda não estudou: conta até ontem', [1, 2, 3, 4], 4);
caso('sem nada', [], 0);
caso('dois dias sem estudar quebram', [0, 3, 4], 1);
caso('um descanso depois de 6 seguidos não quebra', [0, 1, 2, 3, 4, 5, 7, 8], 8);
caso('descanso antes de 6 seguidos quebra', [0, 1, 3, 4], 2);
console.log(falhas ? `sequência de estudo: ${falhas} falha(s)` : 'sequência de estudo: 6 casos conferidos');
process.exit(falhas ? 1 : 0);
