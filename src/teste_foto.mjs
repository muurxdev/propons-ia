// Faz uma pergunta no app real e tira foto (requer PROPONS_DEPURAR=1). Uso: node teste_foto.mjs "<pergunta>" <arquivo.png>
import fs from 'node:fs';
const [pergunta, saida] = process.argv.slice(2);
const alvos = await (await fetch('http://127.0.0.1:9333/json')).json();
const ws = new WebSocket(alvos.find(a => a.type === 'page' && a.url.startsWith('http://127.0.0.1')).webSocketDebuggerUrl);
await new Promise(r => ws.onopen = r);
let seq = 0; const pend = new Map();
ws.onmessage = e => { const m = JSON.parse(e.data); if (pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } };
const cdp = (method, params = {}) => new Promise(r => { const id = ++seq; pend.set(id, r); ws.send(JSON.stringify({ id, method, params })); });
const js = async e => (await cdp('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true })).result?.result?.value;
const espera = ms => new Promise(r => setTimeout(r, ms));
for (let i = 0; i < 120 && !(await js(`document.querySelector('#estado').hidden`)); i++) await espera(500);
await js(`(()=>{const e=document.querySelector('#entrada'); e.value=${JSON.stringify(pergunta)}; e.dispatchEvent(new Event('input')); document.querySelector('#enviar').click(); return 1})()`);
await espera(500);
for (let i = 0; i < 180 && await js(`document.querySelector('#enviar').classList.contains('gerando')`); i++) await espera(500);
await espera(300);
const r = await cdp('Page.captureScreenshot', { format: 'png' });
fs.writeFileSync(saida, Buffer.from(r.result.data, 'base64'));
ws.close(); console.log('ok');
