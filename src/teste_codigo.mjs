// Teste: pedido de código completo, botões copiar/recarregar e botão único do menu (requer PROPONS_DEPURAR=1)
import fs from 'node:fs';
const pasta = process.argv[2];
const alvos = await (await fetch('http://127.0.0.1:9333/json')).json();
const ws = new WebSocket(alvos.find(a => a.type === 'page' && a.url.startsWith('http://127.0.0.1')).webSocketDebuggerUrl);
await new Promise(r => ws.onopen = r);
let seq = 0; const pend = new Map();
ws.onmessage = e => { const m = JSON.parse(e.data); if (pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } };
const cdp = (method, params = {}) => new Promise(r => { const id = ++seq; pend.set(id, r); ws.send(JSON.stringify({ id, method, params })); });
const js = async e => { const r = await cdp('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true }); if (r.result?.exceptionDetails) throw new Error('na página: ' + JSON.stringify(r.result.exceptionDetails).slice(0, 300)); return r.result?.result?.value; };
const espera = ms => new Promise(r => setTimeout(r, ms));
const foto = async n => { const r = await cdp('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(`${pasta}/${n}.png`, Buffer.from(r.result.data, 'base64')); };
const fim = async () => { await espera(500); for (let i = 0; i < 400 && await js(`document.querySelector('#enviar').classList.contains('gerando')`); i++) await espera(500); };
for (let i = 0; i < 120 && !(await js(`document.querySelector('#estado').hidden`)); i++) await espera(500);

console.log('botões de menu:', await js(`[...document.querySelectorAll('button')].filter(b=>/hist/i.test(b.title)).map(b=>b.id).join(',')`));
const t0 = Date.now();
await js(`(()=>{const e=document.querySelector('#entrada'); e.value='faça um código em python de bubble sort que ordena a lista [5, 2, 8, 1] e imprime o resultado'; e.dispatchEvent(new Event('input')); document.querySelector('#enviar').click(); return 1})()`);
await fim();
const resp = await js(`atual.msgs[atual.msgs.length-1].texto`);
console.log(`resposta em ${((Date.now() - t0) / 1000).toFixed(0)}s:\n` + resp);
const codigo = (resp.match(/```(?:python|py)?\n([\s\S]*?)```/) || [])[1];
fs.writeFileSync(`${pasta}/codigo.py`, codigo || '');
console.log('botões na resposta:', await js(`[...document.querySelectorAll('.msg.ia:last-child .acao')].map(b=>b.title).join(', ')`));
await foto('c1-codigo');
// recarregar
const antes = await js(`atual.msgs.length`);
await js(`document.querySelector('.acao.recarregar').click(); 1`); await fim();
console.log('recarregar: mensagens antes', antes, 'depois', await js(`atual.msgs.length`), '| respostas na tela', await js(`document.querySelectorAll('.msg.ia .acoes').length`), '| botões recarregar', await js(`document.querySelectorAll('.acao.recarregar').length`));
ws.close();
