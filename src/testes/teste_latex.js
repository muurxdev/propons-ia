// Testa semLatex() (a fórmula vira texto legível) direto da página montada, com casos esperados.
const h = require('fs').readFileSync(__dirname + '/../../payload/interface/index.html', 'utf8');
const m = h.match(/function semLatex\(src\)\s*\{[\s\S]*?\n\}\n/);
if (!m) { console.error('semLatex() não encontrada em payload/interface/index.html (rode node src/montar.js)'); process.exit(1); }
const semLatex = new Function(m[0] + '; return semLatex;')();
const casos = [
  [String.raw`A reação: $$6CO_2 + 6H_2O + \text{Luz} \rightarrow C_6H_{12}O_6 (\text{glicose}) + 6O_2$$ fim`, s => !s.includes('$$') && s.includes('→') && s.includes('Luz')],
  [String.raw`Temos $x^2 + 2x = 0$ e $\frac{a}{b} \leq \sqrt{2}$, custa $5 e $10.`, s => s.includes('x²') && s.includes('≤') && s.includes('√') && s.includes('$5') && s.includes('$10')],
  ['código: ```\necho $HOME $x^2$\n``` e `$a_1$` intacto', s => s.includes('echo $HOME $x^2$') && s.includes('`$a_1$`')],
  [String.raw`Área = \(\pi r^2\)`, s => s.includes('π') && s.includes('r²') && !s.includes('\\(')],
  ['sem fórmula nenhuma', s => s === 'sem fórmula nenhuma'],
];
let falhas = 0;
for (const [entrada, confere] of casos) {
  const saida = semLatex(entrada);
  const ok = confere(saida);
  if (!ok) falhas++;
  console.log((ok ? '  ✔ ' : '  ✘ ') + JSON.stringify(entrada).slice(0, 70) + ' → ' + JSON.stringify(saida).slice(0, 90));
}
console.log(falhas ? `${falhas} falha(s) em semLatex` : `${casos.length}/${casos.length} casos de LaTeX OK`);
process.exit(falhas ? 1 : 0);
