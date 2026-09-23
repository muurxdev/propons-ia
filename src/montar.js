// Monta payload/interface/index.html a partir do modelo + módulos.
// Uso: node src/montar.js
const fs = require('fs'), path = require('path');
const S = __dirname, OUT = path.join(S, '..', 'payload', 'interface');
const ler = f => fs.readFileSync(path.join(S, f), 'utf8');
const VERSAO = ler('../VERSAO').trim();

let algo = ler('algoritmos.js').replace('(idênticos ao código do professor)', '(versões clássicas, calculadas por código)');
const nomes = "const NOMES={bubble:'Bubble sort',selection:'Selection sort',quick:'Quick sort',binaria:'Busca binária'};";
algo = algo.replace(/const NOMES=\{[^\n]*\};/, nomes);
if (!algo.includes(nomes)) throw new Error('NOMES não substituído');

// bibliotecas de terceiros (src/vendor): entram como texto (type="text/plain", o navegador não interpreta) e só viram
// código quando um PDF/DOCX é anexado (app.js carrega por blob). Assim os hosts continuam copiando um index.html só.
const vendor = [['vendor-pdf', 'vendor/pdf.min.mjs'], ['vendor-pdf-worker', 'vendor/pdf.worker.min.mjs'], ['vendor-mammoth', 'vendor/mammoth.browser.min.js']]
  .map(([id, f]) => { const c = ler(f); if (/<\/script/i.test(c)) throw new Error(f + ' contém </script'); return `<script type="text/plain" id="${id}">${c}</script>`; }).join('\n');
const partes = {
  VERSAO, PLATAFORMA: ler('plataforma.js'), ALGO: algo, DESTAQUE: ler('destaque.js'), MD: ler('markdown.js'),
  LATEX: ler('latex.js'), DETECT: ler('detecta.js'), APP: ler('resumo.js') + '\n' + ler('app.js'), VENDOR: vendor,
};
let html = ler('index.template.html');
for (const [k, v] of Object.entries(partes)) html = html.split('{{' + k + '}}').join(v);
if (/\{\{[A-Z]+\}\}/.test(html)) throw new Error('marcador não substituído: ' + html.match(/\{\{[A-Z]+\}\}/)[0]);
if (/professor|Estruturas de Dados/i.test(html)) console.warn('AVISO: ainda há menção a professor/disciplina');
fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, 'index.html'), html);
fs.copyFileSync(path.join(S, 'conhecimento.md'), path.join(OUT, 'conhecimento.md'));
// as mesmas bibliotecas também como arquivos servidos pelo motor (o WebView do Android não importa módulos por blob)
for (const f of ['pdf.min.mjs', 'pdf.worker.min.mjs', 'mammoth.browser.min.js']) fs.copyFileSync(path.join(S, 'vendor', f), path.join(OUT, f));
console.log(`interface ${VERSAO}: index.html ${html.length} bytes`);
