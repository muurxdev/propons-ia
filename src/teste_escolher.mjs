// Teste da primeira abertura (sem modelo): o app abre no chat normal; a primeira mensagem sobe a lista de modelos,
// Baixar vira a bolinha com a %, e quando termina a IA responde a mensagem que ficou esperando.
// Uso: node src/teste_escolher.mjs <porta-cdp> <pasta-saida> <id-do-modelo>
import fs from 'node:fs';
import { conectar, espera, relatorio } from './testes/cdp.mjs';
const [porta, saida, idModelo] = process.argv.slice(2);
fs.mkdirSync(saida, { recursive: true });
const { ok, resumo } = relatorio();
const NOMES = { leve: 'Lume', normal: 'Aurora', avancado: 'Ápice' };
// 1) abre direto no chat normal, sem tela de download
let p = await conectar({ porta, saida, filtro: u => !/#k=/.test(u) });
for (let i = 0; i < 60 && !(await p.js(`typeof ESCOLHER !== 'undefined' && !!$('#nomeModelo').textContent`)); i++) await espera(500);
await espera(800);
ok('abre no chat normal (sem tela de baixar)', await p.js(`ESCOLHER && !document.querySelector('#escolher') && !!$('#entrada')`));
ok('seletor diz "Escolher modelo"', (await p.js(`$('#nomeModelo').textContent`)) === 'Escolher modelo', await p.js(`$('#nomeModelo').textContent`));
ok('saudação com frase', /^(Boa madrugada|Bom dia|Boa tarde|Boa noite), .+/.test(await p.js(`$('#boasvindas').innerText.trim()`)), await p.js(`$('#boasvindas').innerText.trim()`));
await p.foto('e1-chat-vazio');
// 2) manda a primeira mensagem: sobe a lista de modelos
await p.js(`$('#entrada').value='Quanto é 6 vezes 7? Responda só o número.'; ajustar(); $('#enviar').click(); 1`); await espera(1200);
ok('ao enviar, sobe a lista "Escolha o modelo para responder"', await p.js(`/Escolha o modelo para responder/.test(document.querySelector('.dlg.modelos h3').textContent)`));
const linhas = await p.js(`[...document.querySelectorAll('.dlg.modelos .lm')].map(b=>b.innerText.replace(/\\s+/g,' ').trim())`);
ok('Própons Lume/Aurora/Ápice com descrição', linhas.length === 3 && /Própons Lume.*Leve e rápido/.test(linhas[0]) && /Própons Aurora.*(Equilibrado|precisa de)/.test(linhas[1]) && /Própons Ápice/.test(linhas[2]), linhas.join(' | '));
ok('sem ícones nos modelos', (await p.js(`document.querySelectorAll('.dlg.modelos .lm .mico').length`)) === 0);
ok('botão Baixar em cada modelo que cabe no aparelho', await p.js(`[...document.querySelectorAll('.dlg.modelos .lm')].every(l => l.disabled || /Baixar/.test((l.querySelector('.btn-mini')||{}).textContent))`));
ok('mensagem ficou esperando (pendente, salva)', await p.js(`atual.msgs[0].pendente === true && !!document.querySelector('.msg.eu')`));
await p.foto('e2-lista');
await p.js(`document.querySelector('.dlg.modelos [data-m="${idModelo}"]').click(); 1`);
const t0 = Date.now(); let pct = null;
for (let i = 0; i < 40; i++) { await espera(500); pct = await p.js(`(document.querySelector('.dlg.modelos [data-m="${idModelo}"] .anel b')||{}).textContent`); if (pct && /[1-9]\d*%/.test(pct)) break; }
ok('bolinha com a porcentagem', /\d+%/.test(pct || ''), pct);
ok('outros modelos ficam travados', await p.js(`[...document.querySelectorAll('.dlg.modelos .lm')].filter(b=>b.disabled).length === 2`));
await p.foto('e3-bolinha');
p.fechar();
// 3) quando termina, o chat abre e a IA responde a mensagem que ficou esperando
const c = await conectar({ porta, saida, filtro: u => /#k=/.test(u) });
for (let i = 0; i < 300 && !(await c.js('typeof online !== "undefined" && online')); i++) await espera(500);
ok('baixou, ligou a IA e abriu o chat', await c.js('online'), `${((Date.now() - t0) / 1000).toFixed(0)} s`);
for (let i = 0; i < 20 && !(await c.js('!!geracao')); i++) await espera(300);
for (let i = 0; i < 240 && (await c.js('!!geracao')); i++) await espera(500);
const ult = await c.js('atual && atual.msgs[atual.msgs.length-1]');
ok('a IA respondeu a mensagem pendente', ult && ult.role === 'assistant' && /42/.test(ult.texto), ult && ult.texto);
ok('pendente some do histórico', await c.js('!atual.msgs.some(m => m.pendente)'));
const nome = await c.js(`$('#nomeModelo').textContent`);
ok('seletor mostra o nome do modelo', nome === 'Própons ' + NOMES[idModelo], nome);
await c.foto('e4-respondeu');
await c.js(`$('#seletorModelo').click(); 1`); await espera(900);
ok('seletor abre a lista com o ✓ no modelo em uso', (await c.js(`document.querySelectorAll('.dlg.modelos .lm').length`)) === 3 && (await c.js(`!!document.querySelector('.dlg.modelos .lm.on .check')`)));
await c.foto('e5-seletor');
await c.js('fecharDialogo(); 1'); await espera(400);
c.fechar();
resumo();
