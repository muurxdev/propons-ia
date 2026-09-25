// Gráfico de função (src/grafico.js): leitura da função no pedido, conta, pontos notáveis e o texto de volta.
// Uso: node src/testes/teste_grafico.js
const fs = require('fs'), vm = require('vm'), path = require('path');
const ctx = vm.createContext({});
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'grafico.js'), 'utf8') + '\nthis.G = GRAFICO;', ctx);
const G = ctx.G;
let falhas = 0, n = 0;
const ok = (nome, cond, det) => { n++; if (!cond) { falhas++; console.log('  FALHOU: ' + nome + (det !== undefined ? ' — ' + det : '')); } };
const perto = (a, b, t = 1e-6) => Math.abs(a - b) < t;
const f = (expr, x) => { const a = G.analisar(expr); return a ? G.valor(a.arv, x, a.params) : NaN; };

// contas
ok('x² − 4 em 3', perto(f('x² − 4', 3), 5));
ok('2x + 1 em 2 (multiplicação implícita)', perto(f('2x + 1', 2), 5));
ok('3(x+1) em 1', perto(f('3(x+1)', 1), 6));
ok('-x^2 em 2 (menos antes da potência)', perto(f('-x^2', 2), -4));
ok('2^x^2 é 2^(x^2)', perto(f('2^x^2', 2), 16));
ok('sen(x) em π/2', perto(f('sen(x)', Math.PI / 2), 1));
ok('raiz(x) em 9', perto(f('raiz(x)', 9), 3));
ok('1/x em 4', perto(f('1/x', 4), 0.25));
ok('2,5x (vírgula) em 2', perto(f('2,5x', 2), 5));
ok('x sen(x) (implícita com função)', perto(f('x sen(x)', Math.PI / 2), Math.PI / 2));
for (const ruim of ['y + 2', '2 + 3', 'x + ', 'abc', 'x $ 2', ''])
  ok('não aceita: ' + ruim, G.analisar(ruim) === null);
// controles: números viram a, b, c; expoente fica fixo
const q = G.analisar('2x² - 3x + 1');
ok('três controles (2, 3, 1) e o expoente fixo', JSON.stringify([...q.params]) === '[2,3,1]', JSON.stringify(q.params));
ok('texto de volta com outros valores', G.texto(q.arv, [1, 4, -2]) === 'x² − 4x − 2', G.texto(q.arv, [1, 4, -2]));
ok('texto com número negativo na subtração', G.texto(q.arv, [2, -3, 1]) === '2x² + 3x + 1', G.texto(q.arv, [2, -3, 1]));
// pontos notáveis
const e = G.estudar(x => x * x - 4, -10, 10);
ok('raízes de x² − 4: −2 e 2', e.raizes.length === 2 && perto(e.raizes[0], -2, 1e-6) && perto(e.raizes[1], 2, 1e-6), JSON.stringify(e.raizes));
ok('corta o eixo y em −4', perto(e.y0, -4));
ok('mínimo em (0, −4)', e.extremos.length === 1 && e.extremos[0].tipo === 'mínimo' && perto(e.extremos[0].x, 0, 1e-4) && perto(e.extremos[0].y, -4, 1e-6), JSON.stringify(e.extremos));
const s = G.estudar(Math.sin, 0, 7);
ok('sen(x) de 0 a 7: raízes 0, π e 2π', s.raizes.length === 3 && perto(s.raizes[1], Math.PI, 1e-6), JSON.stringify(s.raizes));
const inv = G.estudar(x => 1 / x, -5, 5);
ok('1/x: o salto no zero não vira raiz', inv.raizes.length === 0, JSON.stringify(inv.raizes));
// o pedido
const P = t => JSON.stringify(G.pedido(t));
ok('"gráfico de f(x) = x² − 4"', G.pedido('Faça o gráfico de f(x) = x² − 4').expr === 'x² − 4', P('Faça o gráfico de f(x) = x² − 4'));
ok('"esboce y = 2x + 1 para x de -5 a 5"', (g => g.expr === '2x + 1' && g.de === -5 && g.ate === 5)(G.pedido('esboce y = 2x + 1 para x de -5 a 5')), P('esboce y = 2x + 1 para x de -5 a 5'));
ok('"plote sen(x) e explique"', G.pedido('plote sen(x) e explique') && G.pedido('plote sen(x) e explique').expr === 'sen(x)', P('plote sen(x) e explique'));
ok('"gráfico da função f(x) = 3x - 2."', G.pedido('Mostre o gráfico da função f(x) = 3x - 2.').expr === '3x - 2', P('Mostre o gráfico da função f(x) = 3x - 2.'));
for (const nao of ['qual a função da mitocôndria?', 'gráfico de barras das vendas', 'y = 2x + 1, quanto dá em x = 3?', 'desenhe um gato'])
  ok('não é pedido de gráfico: ' + nao, G.pedido(nao) === null, P(nao));
ok('os fatos trazem as raízes calculadas', /x ≈ -2/.test(G.fatos({ expr: 'x^2 - 4', de: -10, ate: 10 })) && /mínimo em \(0; -4\)/.test(G.fatos({ expr: 'x^2 - 4', de: -10, ate: 10 })), G.fatos({ expr: 'x^2 - 4', de: -10, ate: 10 }));

if (falhas) { console.log(`${falhas} de ${n} falharam`); process.exit(1); }
console.log(`gráfico de função: ${n} casos`);
