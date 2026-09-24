// Contraste das cores da interface (WCAG AA: texto normal ≥ 4,5:1). Lê os tokens de src/index.template.html nos dois
// temas (claro = :root, escuro = :root[data-tema="escuro"]) e falha se algum par de texto ficar abaixo.
// Uso: node ferramentas/contraste.js [--site]   (--site confere docs/index.html)
const fs = require('fs'), path = require('path');
const site = process.argv.includes('--site');
const html = fs.readFileSync(path.join(__dirname, '..', site ? 'docs/index.html' : 'src/index.template.html'), 'utf8');
const tokens = bloco => Object.fromEntries([...bloco.matchAll(/(--[\w-]+)\s*:\s*(#[0-9a-f]{6})\b/gi)].map(m => [m[1], m[2].toLowerCase()]));
let claro, escuro;
if (site) {
  claro = tokens(html.match(/:root\s*\{([\s\S]*?)\}/)[1]);
  escuro = { ...claro, ...tokens(html.match(/prefers-color-scheme:\s*dark\)\s*\{\s*:root\s*\{([\s\S]*?)\}/)[1]) };
} else {
  claro = tokens(html.match(/:root\s*\{([\s\S]*?)\n\}/)[1]);
  escuro = { ...claro, ...tokens(html.match(/:root\[data-tema="escuro"\]\s*\{([\s\S]*?)\n\}/)[1]) };
}
const lum = h => { const c = [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255).map(v => v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
const razao = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
// pares de texto de verdade na interface (cor do texto, fundo)
const PARES = site ? [
  ['--tinta', '--papel'], ['--tinta', '--folha'], ['--grafite', '--papel'], ['--grafite', '--folha'], ['--grafite', '--lavanda'],
  ['--lavanda-tinta', '--lavanda'], ['--botao-tinta', '--botao'], ['--roxo', '--papel'], ['--ok', '--folha'],
] : [
  ['--ink', '--bg'], ['--ink', '--surface'], ['--ink', '--canvas'], ['--muted', '--bg'], ['--muted', '--surface'], ['--muted', '--canvas'],
  ['--faint', '--bg'], ['--faint', '--surface'], ['--faint', '--canvas'], ['--accent-ink', '--accent'], ['--accent', '--bg'],
  ['--accent', '--accent-soft'], ['--ink', '--user'], ['--danger', '--bg'], ['--ok', '--bg'], ['--warn', '--bg'], ['--ink', '--hover'], ['--muted', '--hover'],
];
let falhas = 0;
for (const [nome, t] of [['claro', claro], ['escuro', escuro]]) {
  for (const [f, b] of PARES) {
    const cf = f.startsWith('#') ? f : t[f], cb = b.startsWith('#') ? b : t[b];
    if (!cf || !cb) { console.log(`  ?  ${nome}: ${f} sobre ${b} (token não encontrado)`); falhas++; continue; }
    const r = razao(cf, cb), ok = r >= 4.5;
    if (!ok) falhas++;
    console.log(`  ${ok ? '✔' : '✘'} ${nome}: ${f} (${cf}) sobre ${b} (${cb}) = ${r.toFixed(2)}`);
  }
}
console.log(falhas ? `${falhas} par(es) abaixo de 4,5:1` : 'contraste AA em todos os pares');
process.exit(falhas ? 1 : 0);
