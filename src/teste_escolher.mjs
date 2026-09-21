// Teste da primeira abertura (sem nenhum modelo baixado): a tela de escolha aparece, a pessoa escolhe o modelo,
// o app baixa, liga a IA e abre o chat com a caixa nova (seletor de modelo ao lado do "+").
// Uso: node src/teste_escolher.mjs <porta-cdp> <pasta-saida> <id-do-modelo>
import fs from 'node:fs';
const [porta, saida, idModelo] = process.argv.slice(2);
fs.mkdirSync(saida, { recursive: true });
const espera = ms => new Promise(r => setTimeout(r, ms));
async function conectar(filtro) {
  for (let i = 0; i < 900; i++) {
    try { const a = (await (await fetch(`http://127.0.0.1:${porta}/json`)).json()).find(x => x.type === 'page' && filtro(x.url)); if (a) {
      const ws = new WebSocket(a.webSocketDebuggerUrl); await new Promise(r => ws.onopen = r);
      let seq = 0; const pend = new Map();
      ws.onmessage = e => { const m = JSON.parse(e.data); if (pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } };
      const cdp = (method, params = {}) => new Promise(r => { const id = ++seq; pend.set(id, r); ws.send(JSON.stringify({ id, method, params })); });
      const js = async e => (await cdp('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true })).result?.result?.value;
      const foto = async n => { const r = await cdp('Page.captureScreenshot', { format: 'png' }); if (r.result) fs.writeFileSync(`${saida}/${n}.png`, Buffer.from(r.result.data, 'base64')); };
      return { ws, js, foto };
    } } catch (e) {}
    await espera(500);
  }
  throw new Error('página não apareceu');
}
const res = []; const ok = (n, c, d = '') => { res.push(c); console.log(c ? '  ✔' : '  ✘', n, d ? '— ' + String(d).slice(0, 170) : ''); };
// 1) abre direto na escolha (sem baixar nada antes)
let p = await conectar(u => !/#k=/.test(u));
for (let i = 0; i < 60 && !(await p.js(`!!document.querySelector('#escolher .esc-op')`)); i++) await espera(500);
ok('abre direto na tela de escolher o modelo', await p.js(`!!document.querySelector('#escolher')`));
ok('3 modelos, com o recomendado marcado', (await p.js(`document.querySelectorAll('.esc-op').length`)) === 3 && (await p.js(`!!document.querySelector('.esc-op.on .selo.ok')`)), await p.js(`[...document.querySelectorAll('.esc-op')].map(b=>b.innerText.replace(/\\s+/g,' ')).join(' | ')`));
await p.foto('e1-escolher');
await p.js(`document.querySelector('.esc-op[data-m="${idModelo}"]').click(); 1`); await espera(300);
ok('escolher muda a seleção e o botão', await p.js(`document.querySelector('.esc-op.on').dataset.m === '${idModelo}' && /Baixar e começar/.test($('#escBaixar').textContent)`), await p.js(`$('#escBaixar').textContent`));
await p.js(`$('#escBaixar').click(); 1`);
const t0 = Date.now(); let vistoProgresso = false;
for (let i = 0; i < 20; i++) { await espera(1000); if ((await p.js(`parseFloat($('#escProg i').style.width)||0`)) > 0) { vistoProgresso = true; break; } }
ok('mostra o progresso do download', vistoProgresso, await p.js(`$('#escTexto').textContent`));
await p.foto('e2-baixando');
p.ws.close();
// 2) quando termina, o app abre o chat normal (página do motor)
const c = await conectar(u => /#k=/.test(u));
for (let i = 0; i < 300 && !(await c.js('typeof online !== "undefined" && online')); i++) await espera(500);
ok('baixou, ligou a IA e abriu o chat', await c.js('online && !document.querySelector("#escolher")'), `${((Date.now() - t0) / 1000).toFixed(0)} s`);
await espera(1500);
const nome = await c.js(`$('#nomeModelo').textContent`);
ok('seletor ao lado do "+" mostra o modelo escolhido', /Leve|Normal|Avançado/.test(nome), nome);
ok('saudação com frase', /^(Boa madrugada|Bom dia|Boa tarde|Boa noite), .+/.test(await c.js(`$('#boasvindas').innerText.trim()`)), await c.js(`$('#boasvindas').innerText.trim()`));
await c.foto('e3-chat');
await c.js(`$('#seletorModelo').click(); 1`); await espera(900);
ok('seletor abre a lista de modelos', (await c.js(`document.querySelectorAll('.dlg .lm').length`)) === 3);
await c.foto('e4-seletor');
c.ws.close();
const falhas = res.filter(x => !x).length;
console.log(falhas ? `${falhas} falha(s)` : 'todos os testes passaram'); process.exit(falhas ? 1 : 0);
