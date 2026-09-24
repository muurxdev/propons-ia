// Monta payload/interface/index.html a partir do modelo + módulos.
// Uso: node src/montar.js
const fs = require('fs'), path = require('path');
const S = __dirname, OUT = path.join(S, '..', 'payload', 'interface');
const ler = f => fs.readFileSync(path.join(S, f), 'utf8');
const VERSAO = ler('../VERSAO').trim();
// o aplicativo fica em src/app/, um arquivo por assunto; entram em ordem de nome (01-, 02-…), como um arquivo só
const app = fs.readdirSync(path.join(S, 'app')).filter(f => /^\d\d-.+\.js$/.test(f)).sort().map(f => ler('app/' + f)).join('');

let algo = ler('algoritmos.js').replace('(idênticos ao código do professor)', '(versões clássicas, calculadas por código)');
const nomes = "const NOMES={bubble:'Bubble sort',selection:'Selection sort',quick:'Quick sort',binaria:'Busca binária'};";
algo = algo.replace(/const NOMES=\{[^\n]*\};/, nomes);
if (!algo.includes(nomes)) throw new Error('NOMES não substituído');

// bibliotecas de terceiros (src/vendor: pdf.js e mammoth, ~2,3 MB) vão como arquivos ao lado do index.html, servidos
// pelo motor ou pelo próprio app na abertura fria (Windows: propons.local; Android: shouldInterceptRequest).
// --embutir (iPhone): entram também dentro do HTML como texto (type="text/plain") e viram código por blob,
// porque lá a página é file:// e não há servidor atrás. (Na abertura fria dos outros, PDF só depois da 1ª mensagem.)
const EMBUTIR = process.argv.includes('--embutir');
const vendor = !EMBUTIR ? '' : [['vendor-pdf', 'vendor/pdf.min.mjs'], ['vendor-pdf-worker', 'vendor/pdf.worker.min.mjs'], ['vendor-mammoth', 'vendor/mammoth.browser.min.js']]
  .map(([id, f]) => { const c = ler(f); if (/<\/script/i.test(c)) throw new Error(f + ' contém </script'); return `<script type="text/plain" id="${id}">${c}</script>`; }).join('\n');
const partes = {
  VERSAO, PLATAFORMA: ler('plataforma.js'), ALGO: algo, DESTAQUE: ler('destaque.js'), MD: ler('markdown.js'),
  LATEX: ler('latex.js'), DETECT: ler('detecta.js'), BUSCA: ler('busca.js'), APP: ler('resumo.js') + '\n' + app, VENDOR: vendor,
};
let html = ler('index.template.html');
for (const [k, v] of Object.entries(partes)) html = html.split('{{' + k + '}}').join(v);
if (/\{\{[A-Z]+\}\}/.test(html)) throw new Error('marcador não substituído: ' + html.match(/\{\{[A-Z]+\}\}/)[0]);
if (/professor|Estruturas de Dados/i.test(html)) console.warn('AVISO: ainda há menção a professor/disciplina');
fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, 'index.html'), html);
fs.copyFileSync(path.join(S, 'conhecimento.md'), path.join(OUT, 'conhecimento.md'));
// configuração única do motor: motor.json para Windows/Android/Mac/iOS e motor.env (shell) para o launcher do Linux
const motor = JSON.parse(ler('motor.json'));
for (const k of ['pc', 'celular']) {
  const m = motor[k];
  if (!m || !Array.isArray(m.contexto) || !m.contexto.length || !Array.isArray(m.args) || !(m.imagemMaxTokens > 0)) throw new Error('motor.json: "' + k + '" incompleto');
  if (m.args.some(a => a === '-c' || a === '--ctx-size')) throw new Error('motor.json: o contexto vai em "contexto", não em "args"');
}
fs.writeFileSync(path.join(OUT, 'motor.json'), JSON.stringify(motor, null, 2));
const sh = v => "'" + String(v).replace(/'/g, "'\\''") + "'";
fs.writeFileSync(path.join(OUT, 'motor.env'), [
  '# gerado por src/montar.js a partir de src/motor.json',
  'MOTOR_ARGS=' + sh(motor.pc.args.join(' ')),
  'MOTOR_CONTEXTO=' + sh(motor.pc.contexto.map(([g, c]) => g + ':' + c).join(' ')),
  'MOTOR_IMAGEM=' + motor.pc.imagemMaxTokens, ''].join('\n'));
// as mesmas bibliotecas também como arquivos servidos pelo motor (o WebView do Android não importa módulos por blob)
for (const f of ['pdf.min.mjs', 'pdf.worker.min.mjs', 'mammoth.browser.min.js']) fs.copyFileSync(path.join(S, 'vendor', f), path.join(OUT, f));
console.log(`interface ${VERSAO}: index.html ${html.length} bytes`);
// --bundle <arquivo>: grava só o JavaScript da página (para o lint do CI)
const iB = process.argv.indexOf('--bundle');
if (iB > 0) {
  const js = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]).join('\n;\n');
  fs.mkdirSync(path.dirname(path.resolve(process.argv[iB + 1])), { recursive: true });
  fs.writeFileSync(process.argv[iB + 1], js);
}
