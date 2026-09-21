// Gera a "fonte" (source) do AltStore/SideStore para o .ipa da release.
// Uso: node ferramentas/gerar-fonte-altstore.js <caminho-do-ipa> <saida.json>
const fs = require('fs'), path = require('path');
const [ipa, saida] = process.argv.slice(2);
const versao = fs.readFileSync(path.join(__dirname, '..', 'VERSAO'), 'utf8').trim();
const REPO = 'muurxdev/propons-ia';
const RAW = `https://raw.githubusercontent.com/${REPO}/main`;
const descricao = 'IA de estudos que roda direto no iPhone, sem internet depois do primeiro download: chat com histórico, ' +
  'código completo com cores, anexar arquivos de texto/código e cálculo exato de algoritmos. Na primeira vez baixa o modelo (~0,5 a 1,2 GB).';
const fonte = {
  name: 'Própons IA',
  identifier: 'io.github.muurxdev.proponsia.fonte',
  subtitle: 'IA de estudos no seu iPhone',
  description: descricao,
  iconURL: `${RAW}/ios/ProponsIA/Assets.xcassets/AppIcon.appiconset/icone-1024.png`,
  website: `https://github.com/${REPO}`,
  tintColor: '7c5cff',
  apps: [{
    name: 'Própons IA',
    bundleIdentifier: 'io.github.muurxdev.proponsia',
    developerName: 'muurxdev',
    subtitle: 'IA de estudos offline',
    localizedDescription: descricao,
    iconURL: `${RAW}/ios/ProponsIA/Assets.xcassets/AppIcon.appiconset/icone-1024.png`,
    tintColor: '7c5cff',
    category: 'education',
    versions: [{
      version: versao,
      buildVersion: versao.split('.').map(Number).reduce((a, n, i) => a + n * [10000, 100, 1][i], 0).toString(),
      date: new Date().toISOString().slice(0, 10),
      localizedDescription: `Própons IA ${versao}`,
      downloadURL: `https://github.com/${REPO}/releases/download/v${versao}/Propons-IA-iOS.ipa`,
      size: fs.statSync(ipa).size,
      minOSVersion: '16.0',
    }],
    appPermissions: { entitlements: [], privacy: {} },
  }],
  news: [],
};
fs.writeFileSync(saida, JSON.stringify(fonte, null, 2) + '\n');
console.log(`fonte AltStore/SideStore: ${saida} (v${versao}, ${fonte.apps[0].versions[0].size} bytes)`);
