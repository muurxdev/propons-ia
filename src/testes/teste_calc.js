// Contas conferidas pelo app (src/calc.js): conta errada no texto é trocada pela certa; o resto fica igual.
// Uso: node src/testes/teste_calc.js
const fs = require('fs'), vm = require('vm'), path = require('path');
const ctx = vm.createContext({});
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'calc.js'), 'utf8') + '\nthis.CALC = CALC;', ctx);
const { conferirContas, calcular } = ctx.CALC;
let falhas = 0, n = 0;
const ok = (nome, cond, det) => { n++; if (!cond) { falhas++; console.log('  FALHOU: ' + nome + (det ? ' — ' + det : '')); } };
const C = t => conferirContas(t);

// certas: nada muda
for (const t of ['12 × 7 = 84', '3,5 + 1,2 = 4,7', '(8 − 2) ÷ 3 = 2', '10 / 3 = 3,33', '10 / 3 = 3,3', '2 + 3 * 4 = 14', '1/2 = 0,5', '7 x 8 = 56', 'Resultado: 100 - 37 = 63.'])
  ok('certa fica igual: ' + t, C(t).texto === t && !C(t).correcoes.length, C(t).texto);
// erradas: trocadas
const casos = [['12 × 7 = 86', '12 × 7 = 84'], ['3,5 + 1,2 = 4,9', '3,5 + 1,2 = 4,7'], ['Então 2 + 3 * 4 = 20.', 'Então 2 + 3 * 4 = 14.'],
  ['a área é 6 × 4 = **26** m²', 'a área é 6 × 4 = **24** m²'], ['(8 − 2) ÷ 3 = 3', '(8 − 2) ÷ 3 = 2'], ['100 - 37 = 64', '100 - 37 = 63'],['9 ÷ 4 = 2,5', '9 ÷ 4 = 2,25']];
for (const [de, para] of casos) ok('errada corrigida: ' + de, C(de).texto === para && C(de).correcoes.length === 1, C(de).texto);
// fora do alcance: fica como está
for (const t of ['2x + 3 = 7', 'x = 5', '1.500 + 1 = 2', 'em 2020-2021 = crise', '50% × 20 = 12', '25/09/2026 = sexta', 'de 10-20 = faixa','v = 3 m/s', '1.000.000 × 2 = 3', '9 ÷ 4 = 2 e sobra 1'])
  ok('não mexe: ' + t, C(t).texto === t, C(t).texto);
// código não é tocado
const cod = 'Veja:\n```python\nprint(2 + 2 == 5)\nx = 3 * 3 = 10\n```\ne `2 + 2 = 5` no texto.';
ok('código não é tocado', C(cod).texto === cod, C(cod).texto);
ok('calcular com parênteses e negativo', calcular('-(2 + 3) × 2') === -10 && calcular('2 + (3') === null);

if (falhas) { console.log(`${falhas} de ${n} falharam`); process.exit(1); }
console.log(`contas conferidas: ${n} casos`);
