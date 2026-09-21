const h = require('fs').readFileSync(__dirname + '/../payload/interface/index.html', 'utf8');
const f = h.match(/function semLatex\(src\)\{[\s\S]*?\n\}\n/)[0];
const semLatex = new Function(f + '; return semLatex;')();
const casos = [
  String.raw`A reação: $$6CO_2 + 6H_2O + \text{Luz} \rightarrow C_6H_{12}O_6 (\text{glicose}) + 6O_2$$ fim`,
  String.raw`Temos $x^2 + 2x = 0$ e $\frac{a}{b} \leq \sqrt{2}$, custa $5 e $10.`,
  'código: ```\necho $HOME $x^2$\n``` e `$a_1$` intacto',
  String.raw`Área = \(\pi r^2\)`,
];
for (const c of casos) console.log(JSON.stringify(semLatex(c)));
