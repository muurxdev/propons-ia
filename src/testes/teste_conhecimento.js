// Conhecimento (src/app/13-conhecimento.js): quais pacotes entram em cada pergunta — os que combinam pelo nome e pelo
// "quando usar", os de "usar sempre" e os chamados por /nome; desligados nunca entram; referências vão só em trechos.
// Uso: node src/testes/teste_conhecimento.js
const fs = require('fs'), vm = require('vm'), path = require('path');
const guardado = {};
const ctx = vm.createContext({ ICO: {}, pref: (k, v) => v === undefined ? guardado[k] : (guardado[k] = v), nCtx: 8192, console,
  BUSCA: { trechosRelevantes: (t, p, n) => ({ texto: t.slice(0, n) }) } });
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'app', '12-lugar.js'), 'utf8') + '\n' + fs.readFileSync(path.join(__dirname, '..', 'app', '13-conhecimento.js'), 'utf8')
  + ';this.K = { conhecimentosPara, blocoConhecimento, salvarConhecimentos };', ctx);
const { conhecimentosPara, blocoConhecimento, salvarConhecimentos } = ctx.K;
salvarConhecimentos([
  { id: 'a', nome: 'Redação nota 1000', quando: 'redação, ENEM, dissertação, proposta de intervenção', instrucoes: 'Siga as 5 competências.', refs: [{ nome: 'modelo.txt', texto: 'x'.repeat(20000) }] },
  { id: 'b', nome: 'Matemática passo a passo', quando: 'conta, equação, porcentagem, função', instrucoes: 'Passos numerados.' },
  { id: 'c', nome: 'Tom gentil', quando: '', instrucoes: 'Seja gentil.', sempre: true },
  { id: 'd', nome: 'Química orgânica', quando: 'química, carbono, cadeia', instrucoes: 'x', ativo: false },
]);
let falhas = 0;
const ok = (nome, cond, det) => { if (!cond) { falhas++; console.log('  FALHOU: ' + nome + (det ? ' — ' + det : '')); } };
const nomes = t => conhecimentosPara(t).map(k => k.id).sort().join(',');
ok('redação do ENEM puxa o de redação (e o de sempre)', nomes('Corrija minha redação do ENEM sobre desigualdade') === 'a,c', nomes('Corrija minha redação do ENEM sobre desigualdade'));
ok('equação puxa o de matemática', nomes('resolve essa equação: 2x + 3 = 11') === 'b,c', nomes('resolve essa equação: 2x + 3 = 11'));
ok('pergunta sem relação: só o de sempre', nomes('quem descobriu o Brasil?') === 'c', nomes('quem descobriu o Brasil?'));
ok('desligado nunca entra', !nomes('explique cadeia de carbono em química').includes('d'));
ok('chamar por /nome força', nomes('/matematicapassoapasso me explique isso') .includes('b'));
const bloco = blocoConhecimento(conhecimentosPara('minha redação ENEM'), 'minha redação ENEM');
ok('o bloco leva as instruções e só um trecho da referência', /Siga as 5 competências/.test(bloco) && /Referência "modelo.txt"/.test(bloco) && bloco.length < 12000, bloco.length);
console.log(falhas ? `conhecimento: ${falhas} falha(s)` : 'conhecimento: escolha dos pacotes e bloco conferidos');
process.exit(falhas ? 1 : 0);
