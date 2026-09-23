// Abertura fria (modelo já baixado, IA desligada): o chat abre na hora com o nome do modelo; a primeira mensagem liga a IA
// e é respondida. Uso: node src/teste_frio.mjs <porta-cdp> <pasta-saida>
import fs from 'node:fs';
import { conectar, espera, relatorio } from './testes/cdp.mjs';
const [porta, saida] = process.argv.slice(2);
fs.mkdirSync(saida, { recursive: true });
const { ok, resumo } = relatorio();
const t0 = Date.now();
const p = await conectar({ porta, saida, filtro: u => !/#k=/.test(u) });
for (let i = 0; i < 60 && !(await p.js(`typeof ESCOLHER !== 'undefined' && typeof MODELO_INICIAL !== 'undefined' && !!$('#nomeModelo').textContent`)); i++) await espera(300);
const tAbriu = (Date.now() - t0) / 1000;
ok('abre no chat sem ligar a IA', await p.js(`ESCOLHER && !!MODELO_INICIAL && !!$('#entrada')`), `${tAbriu.toFixed(1)} s`);
const nome = await p.js(`$('#nomeModelo').textContent`);
ok('seletor já mostra o modelo salvo', /^Própons /.test(nome) && nome !== 'Escolher modelo', nome);
await p.foto('fr1-aberto');
await p.js(`$('#entrada').value='Quanto é 6 vezes 7? Responda só o número.'; ajustar(); $('#enviar').click(); 1`); await espera(800);
ok('a primeira mensagem liga a IA (sem abrir a lista)', await p.js(`!!escolhendoId && !document.querySelector('.dlg.modelos') && !!document.querySelector('.msg.ia .txt.digitando')`));
await p.foto('fr2-ligando');
p.fechar();
const c = await conectar({ porta, saida, filtro: u => /#k=/.test(u) });
for (let i = 0; i < 300 && !(await c.js('typeof online !== "undefined" && online')); i++) await espera(500);
ok('IA ligou e o chat continuou', await c.js('online'), `${((Date.now() - t0) / 1000).toFixed(0)} s desde a abertura`);
for (let i = 0; i < 200 && !(await c.js('!!geracao')) && !(await c.js('!!(atual && atual.msgs.some(m => m.role === "assistant" && m.texto))')); i++) await espera(300);   // runner do CI é lento
for (let i = 0; i < 600 && (await c.js('!!geracao')); i++) await espera(500);
const ult = await c.js('atual && atual.msgs[atual.msgs.length-1]');
// o que importa aqui é o caminho (abriu, ligou e respondeu); a conta em si o modelo leve às vezes erra
ok('respondeu a mensagem que ficou esperando', !!(ult && ult.role === 'assistant' && (ult.texto || '').trim() && !ult.erro), (ult && (ult.erro || ult.texto)) || '(sem resposta)');
await c.foto('fr3-respondeu');
c.fechar();
resumo();