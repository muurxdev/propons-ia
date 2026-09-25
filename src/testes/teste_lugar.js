// Teste de "lugar, hora e clima" (src/app/12-lugar.js), sem internet: quais perguntas pedem dados reais, qual lugar
// cada uma cita, a hora de outra cidade pelo fuso oficial, as direções do vento e a conferência do cartão guardado.
// Uso: node src/testes/teste_lugar.js
const fs = require('fs'), vm = require('vm'), path = require('path');
const ctx = vm.createContext({ ICO: {}, pref: () => null, CELULAR: false, Intl, Date, console });
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'app', '12-lugar.js'), 'utf8') + ';this.L = { intencaoLugar, horaEm, direcaoDe, normalizarPainelLugar, acharCidadeConhecida, PEDE_MAIS };', ctx);
const { intencaoLugar, horaEm, direcaoDe, normalizarPainelLugar, acharCidadeConhecida, PEDE_MAIS } = ctx.L;

let falhas = 0;
const ok = (nome, cond, det) => { if (!cond) { falhas++; console.log('  FALHOU: ' + nome + (det ? ' — ' + det : '')); } };
const casos = [
  // [pergunta, esperado: null (não é de lugar) ou { cidade, aqui, clima, hora }]
  ['Que horas são em Londres?', { cidade: 'Londres', hora: true }],
  ['horas de londres', { cidade: 'Londres', hora: true }],
  ['Horas em Nova York agora', { cidade: 'Nova York' }],
  ['fuso horário de Tóquio', { cidade: 'Tóquio' }],
  ['clima em são paulo', { cidade: 'São Paulo', clima: true }],
  ['vai chover amanhã em Campina Grande?', { cidade: 'Campina Grande', clima: true }],
  ['Como está o tempo hoje?', { aqui: true, clima: true }],
  ['está fazendo frio aqui?', { aqui: true, clima: true }],
  ['onde eu estou?', { aqui: true }],
  ['que horas são aqui', { aqui: true }],
  ['qual a latitude de Paris', { cidade: 'Paris' }],
  ['Que horas são em Londres agora? E como está o tempo aqui?', { cidade: 'Londres', aquiTambem: true }],
  ['que horas são?', null],
  ['hora de estudar', null],
  ['Calcule o tempo em segundos', null],
  ['temperatura de ebulição da água', null],
  ['o que é latitude?', null],
  ['Explique a Revolução Francesa', null],
  ['um ângulo de 90 graus', null],
];
for (const [p, esp] of casos) {
  const r = intencaoLugar(p);
  if (esp === null) { ok(`"${p}" não é pergunta de lugar`, r === null, JSON.stringify(r)); continue; }
  ok(`"${p}" é pergunta de lugar`, !!r, 'null');
  if (!r) continue;
  for (const k of Object.keys(esp)) ok(`"${p}" → ${k} = ${esp[k]}`, r[k] === esp[k], JSON.stringify(r));
}
// hora de outra cidade: fuso oficial, diferença em horas (Londres está sempre 3 ou 4 h à frente de São Paulo)
const h = horaEm('Europe/London'), d = h && h.diferenca;
ok('hora em Londres tem hora, data e UTC', h && /^\d\d:\d\d$/.test(h.hora) && /UTC[+-]?/.test(h.utc), JSON.stringify(h));
const hSP = horaEm('America/Sao_Paulo'), hL = horaEm('Europe/London');
ok('diferença Londres − São Paulo é 3 ou 4 h', hSP && hL && [180, 240].includes(hL.diferenca - hSP.diferenca), JSON.stringify([hSP, hL]));
ok('fuso inválido não quebra', horaEm('Nada/Nenhum') === null);
void d;
// vento: 16 direções (vindo de)
ok('direções do vento', direcaoDe(0) === 'N' && direcaoDe(90) === 'L' && direcaoDe(180) === 'S' && direcaoDe(270) === 'O' && direcaoDe(112) === 'ESE' && direcaoDe(359) === 'N' && direcaoDe(-45) === 'NO');
// cidades conhecidas funcionam sem internet (com e sem acento, nome em inglês)
ok('cidades conhecidas', acharCidadeConhecida('london')[0] === 'Londres' && acharCidadeConhecida('São Paulo')[3] === 'America/Sao_Paulo' && acharCidadeConhecida('tokyo')[0] === 'Tóquio' && !acharCidadeConhecida('Xyzabcópolis'));
// pede conselho → a IA continua depois das linhas prontas; só dados → o app responde sozinho
ok('"preciso levar guarda-chuva?" pede mais que os números', PEDE_MAIS.test('vai chover amanhã em Tóquio? preciso levar guarda-chuva?'));
ok('"que horas são em Londres?" não pede mais', !PEDE_MAIS.test('que horas são em Londres?'));
// cartão guardado: passa pela conferência (lista, números, textos cortados); lixo some
const bom = { lugar: { nome: 'Londres', pais: 'Reino Unido', lat: 51.5, lon: -0.13, fonte: 'x' }, hora: { hora: '02:25', data: 'sexta', utc: 'UTC+01:00', diferenca: 240, fuso: 'Europe/London' }, clima: { temp: 15.4, codigo: 0, dias: [{ data: '2026-09-25', max: 24, min: 15 }] } };
const n = normalizarPainelLugar([bom, { lixo: 1 }, { negada: true }]);
ok('cartão guardado: lista conferida', Array.isArray(n) && n.length === 2 && n[0].lugar.nome === 'Londres' && n[0].clima.temp === 15.4 && n[1].negada === true, JSON.stringify(n));
ok('cartão sem coordenadas é descartado', normalizarPainelLugar({ lugar: { nome: 'x', lat: 'a' } }) === null);

console.log(falhas ? `lugar, hora e clima: ${falhas} falha(s)` : `lugar, hora e clima: ${casos.length} perguntas e as contas conferem`);
process.exit(falhas ? 1 : 0);
