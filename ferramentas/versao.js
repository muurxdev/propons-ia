// Uma versão só: VERSAO é a fonte; este script grava (ou confere, com --check) as cópias nos hosts e o topo do novidades.md.
//   node ferramentas/versao.js            → grava a versão de VERSAO em todos os arquivos
//   node ferramentas/versao.js --check [tag]  → falha (exit 1) se algum arquivo estiver diferente (ou a tag não bater)
const fs = require('fs'), path = require('path');
const raiz = path.join(__dirname, '..');
const V = fs.readFileSync(path.join(raiz, 'VERSAO'), 'utf8').trim();
if (!/^\d+\.\d+\.\d+$/.test(V)) { console.error('VERSAO inválida: ' + V); process.exit(1); }
const [a, b, c] = V.split('.').map(Number);
const codigo = String(a * 10000 + b * 100 + c);   // mesmo cálculo do Gradle (versionCode) e do iOS (CURRENT_PROJECT_VERSION)
const alvos = [
  ['app/Propons.cs', /(public const string Versao = ")[^"]*(")/, `$1${V}$2`],
  ['ios/project.yml', /(MARKETING_VERSION: ")[^"]*(")/, `$1${V}$2`],
  ['ios/project.yml', /(CURRENT_PROJECT_VERSION: ")[^"]*(")/, `$1${codigo}$2`],
  ['linux/propons-ia', /(^VERSAO=")[^"]*(")/m, `$1${V}$2`],
  ['linux/build.sh', /(^VERSAO=")[^"]*(")/m, `$1${V}$2`],
  ['linux/PKGBUILD', /(^pkgver=)\S*/m, `$1${V}`],
];
const check = process.argv.includes('--check');
const tag = process.argv.find(x => /^v?\d+\.\d+\.\d+$/.test(x));
let erros = 0;
for (const [arq, re, sub] of alvos) {
  const p = path.join(raiz, arq), s = fs.readFileSync(p, 'utf8');
  if (!re.test(s)) { console.error(`${arq}: padrão não encontrado`); erros++; continue; }
  const novo = s.replace(re, sub);
  if (novo !== s) { if (check) { console.error(`${arq}: versão diferente de ${V}`); erros++; } else { fs.writeFileSync(p, novo); console.log(`${arq}: ${V}`); } }
}
const nov = fs.readFileSync(path.join(raiz, 'docs/novidades.md'), 'utf8').split('\n')[0].trim();
if (nov !== `## Novidades da ${V}`) { console.error(`docs/novidades.md: a primeira seção é "${nov}", esperado "## Novidades da ${V}"`); erros++; }
if (tag && tag.replace(/^v/, '') !== V) { console.error(`tag ${tag} não bate com VERSAO ${V}`); erros++; }
if (erros) process.exit(1);
console.log(check ? `versão ${V} consistente em ${alvos.length} arquivos + novidades.md${tag ? ' + tag' : ''}` : `versão ${V} gravada`);
