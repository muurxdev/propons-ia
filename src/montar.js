// Monta payload/interface/index.html a partir do modelo + blocos testados.
const fs = require('fs'), path = require('path');
const S = __dirname, OUT = path.join(S, '..', 'payload', 'interface');
let algo = fs.readFileSync(path.join(S, 'algoritmos.js'), 'utf8')
  .replace('(idênticos ao código do professor)', '(versões clássicas, calculadas por código)');
const nomes = "const NOMES={bubble:'Bubble sort',selection:'Selection sort',quick:'Quick sort',binaria:'Busca binária'};";
algo = algo.replace(/const NOMES=\{[^\n]*\};/, nomes);
if (!algo.includes(nomes)) throw new Error('NOMES não substituído');
const html = fs.readFileSync(path.join(S, 'index.template.html'), 'utf8')
  .replace('{{ALGO}}', () => algo)
  .replace('{{MD}}', () => fs.readFileSync(path.join(S, 'markdown.js'), 'utf8'))
  .replace('{{DETECT}}', () => fs.readFileSync(path.join(S, 'detecta.js'), 'utf8'));
if (/\{\{[A-Z]+\}\}/.test(html)) throw new Error('marcador não substituído');
if (/professor|Estruturas de Dados/i.test(html)) console.warn('AVISO: ainda há menção a professor/disciplina');
fs.writeFileSync(path.join(OUT, 'index.html'), html);
fs.copyFileSync(path.join(S, 'conhecimento.md'), path.join(OUT, 'conhecimento.md'));
console.log('index.html', html.length, 'bytes');
