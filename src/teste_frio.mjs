// Abertura fria (modelo já baixado, IA desligada): o chat abre na hora com o nome do modelo; a primeira mensagem liga a IA
// e é respondida. Uso: node src/teste_frio.mjs <porta-cdp> <pasta-saida>
import fs from 'node:fs';
const [porta, saida] = process.argv.slice(2);
fs.mkdirSync(saida, { recursive: true });
const espera = ms => new Promise(r => setTimeout(r, ms));
async function conectar(filtro) {
  for (let i = 0; i < 600; i++) {
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
const t0 = Date.now();
const p = await conectar(u => !/#k=/.test(u));
for (let i = 0; i < 60 && !(await p.js(`typeof ESCOLHER !== 'undefined' && typeof MODELO_INICIAL !== 'undefined' && !!$('#nomeModelo').textContent`)); i++) await espera(300);
const tAbriu = (Date.now() - t0) / 1000;
ok('abre no chat sem ligar a IA', await p.js(`ESCOLHER && !!MODELO_INICIAL && !!$('#entrada')`), `${tAbriu.toFixed(1)} s`);
const nome = await p.js(`$('#nomeModelo').textContent`);
ok('seletor já mostra o modelo salvo', /^Própons /.test(nome) && nome !== 'Escolher modelo', nome);
await p.foto('fr1-aberto');
await p.js(`$('#entrada').value='Quanto é 6 vezes 7? Responda só o número.'; ajustar(); $('#enviar').click(); 1`); await espera(800);
ok('a primeira mensagem liga a IA (sem abrir a lista)', await js0(p, `!!escolhendoId && !document.querySelector('.dlg.modelos') && !!document.querySelector('.msg.ia .txt.digitando')`));
await p.foto('fr2-ligando');
p.ws.close();
const c = await conectar(u => /#k=/.test(u));
for (let i = 0; i < 300 && !(await c.js('typeof online !== "undefined" && online')); i++) await espera(500);
ok('IA ligou e o chat continuou', await c.js('online'), `${((Date.now() - t0) / 1000).toFixed(0)} s desde a abertura`);
for (let i = 0; i < 20 && !(await c.js('!!geracao')); i++) await espera(300);
for (let i = 0; i < 240 && (await c.js('!!geracao')); i++) await espera(500);
const ult = await c.js('atual && atual.msgs[atual.msgs.length-1]');
ok('respondeu a mensagem que ficou esperando', ult && ult.role === 'assistant' && /42/.test(ult.texto), ult && ult.texto);
await c.foto('fr3-respondeu');
c.ws.close();
const falhas = res.filter(x => !x).length;
console.log(falhas ? `${falhas} falha(s)` : 'todos os testes passaram'); process.exit(falhas ? 1 : 0);
async function js0(pg, e) { return pg.js(e); }
