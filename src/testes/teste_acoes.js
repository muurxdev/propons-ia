// Pedidos de ação na conversa (src/app/12-acoes.js): "grave um áudio", "tire uma foto"… viram ação do app (que responde e
// em seguida faz, com a permissão do sistema); perguntas sobre o assunto ("como gravar…?") continuam indo para a IA.
// Uso: node src/testes/teste_acoes.js
const fs = require('fs'), vm = require('vm'), path = require('path');
const ctx = vm.createContext({});
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'app', '12-acoes.js'), 'utf8') + ';this.acaoPedida = acaoPedida;', ctx);
const casos = [
  ['grave um áudio', 'gravar'], ['Pode gravar um áudio pra mim?', 'gravar'], ['grava', 'gravar'], ['quero gravar a aula', 'gravar'],
  ['comece a gravar', 'gravar'], ['por favor, liga o microfone', 'gravar'],
  ['tire uma foto', 'foto'], ['abre a câmera', 'foto'],
  ['leia a resposta', 'ler'], ['lê pra mim', 'ler'], ['leia em voz alta', 'ler'],
  ['me avise quando terminar', 'avisar'], ['ative as notificações', 'avisar'],
  ['ative minha localização', 'local'], ['usa a minha localização', 'local'],
  ['como gravar um áudio no celular?', null], ['grave essa informação na memória', null], ['grave que meu nome é Ana', null],
  ['Leia o texto sobre fotossíntese e resuma', null], ['o que é uma câmera escura?', null], ['explique a localização geográfica do Brasil', null],
];
let falhas = 0;
for (const [t, esp] of casos) { const r = ctx.acaoPedida(t); if (r !== esp) { falhas++; console.log(`  FALHOU: "${t}" → ${r} (esperado ${esp})`); } }
console.log(falhas ? `pedidos de ação: ${falhas} falha(s)` : `pedidos de ação: ${casos.length} frases conferidas`);
process.exit(falhas ? 1 : 0);
