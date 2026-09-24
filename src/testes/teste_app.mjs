// Teste de ponta a ponta do app real (WebView2) via protocolo de depuração.
// Requer o app aberto com PROPONS_DEPURAR=1.  Uso: node teste_app.mjs <pasta-das-fotos>
import fs from 'node:fs';
const pasta = process.argv[2];
const alvos = await (await fetch('http://127.0.0.1:9333/json')).json();
const pagina = alvos.find(a => a.type === 'page' && a.url.startsWith('http://127.0.0.1'));
if (!pagina) { console.log('página do app não encontrada', alvos.map(a => a.url)); process.exit(1); }
const ws = new WebSocket(pagina.webSocketDebuggerUrl);
await new Promise(r => ws.onopen = r);
let seq = 0; const pend = new Map();
ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } };
const cdp = (method, params = {}) => new Promise(r => { const id = ++seq; pend.set(id, r); ws.send(JSON.stringify({ id, method, params })); });
const js = async expr => { const r = await cdp('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); return r.result?.result?.value; };
const foto = async nome => { const r = await cdp('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(`${pasta}/${nome}.png`, Buffer.from(r.result.data, 'base64')); };
const espera = ms => new Promise(r => setTimeout(r, ms));
const pergunta = async (t, max = 90) => {
  await js(`(()=>{const e=document.querySelector('#entrada'); e.value=${JSON.stringify(t)}; e.dispatchEvent(new Event('input')); document.querySelector('#enviar').click(); return 1})()`);
  await espera(400);
  for (let i = 0; i < max * 2; i++) { if (!(await js(`document.querySelector('#enviar').classList.contains('gerando')`))) break; await espera(500); }
  return js(`[...document.querySelectorAll('.msg.ia .txt')].pop().innerText`);
};

for (let i = 0; i < 120 && !(await js(`document.querySelector('#estado').hidden`)); i++) await espera(500);
await foto('a1-inicio');
console.log('OI      →', (await pergunta('oi')).replace(/\n/g, ' '));
console.log('BUBBLE  →', (await pergunta('bubble sort em [5, 2, 8, 1]')).split('\n').slice(0, 3).join(' | '));
await foto('a2-bubble');
console.log('ESTUDO  →', (await pergunta('explique rapidamente o que é mitose')).slice(0, 300).replace(/\n/g, ' '));
await foto('a3-resposta');
// nova conversa + histórico aberto
await js(`document.querySelector('#nova').click()`); await espera(300);
console.log('FÍSICA  →', (await pergunta('qual a fórmula da velocidade média?')).slice(0, 200).replace(/\n/g, ' '));
await js(`document.querySelector('#abrirLat').click()`); await espera(500);
await foto('a4-historico');
console.log('HISTÓRICO na tela:', await js(`[...document.querySelectorAll('#lista .item span')].map(s=>s.textContent).join(' | ')`));
// tema claro
await js(`document.querySelector('#lateral').classList.add('fechada'); document.querySelector('#tema').click(); 1`); await espera(400);
await foto('a5-claro');
await js(`document.querySelector('#tema').click(); 1`);
ws.close();
