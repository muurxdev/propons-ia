// Transcreve um áudio longo (mais de 10 min) no app real: confere o corte em 10 minutos e mede o tempo.
// Uso: node src/teste_voz_longa.mjs <porta-cdp> <arquivo-wav>
import fs from 'node:fs';
const [porta, wavArq] = process.argv.slice(2);
const alvos = await (await fetch(`http://127.0.0.1:${porta}/json`)).json();
const pag = alvos.find(a => a.type === 'page' && /127\.0\.0\.1:\d+/.test(a.url));
const ws = new WebSocket(pag.webSocketDebuggerUrl); await new Promise(r => ws.onopen = r);
let seq = 0; const pend = new Map();
ws.onmessage = e => { const m = JSON.parse(e.data); if (pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } };
const cdp = (method, params = {}) => new Promise(r => { const id = ++seq; pend.set(id, r); ws.send(JSON.stringify({ id, method, params })); });
const js = async e => { const r = await cdp('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true }); if (r.result?.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails).slice(0, 300)); return r.result?.result?.value; };
const espera = ms => new Promise(r => setTimeout(r, ms));
for (let i = 0; i < 300 && !(await js('online')); i++) await espera(500);
// o arquivo vai para a página em pedaços (o CDP não aceita 20 MB de uma vez)
const b = fs.readFileSync(wavArq), PED = 2 * 1048576;
await js('window.__partes = []; 1');
for (let i = 0; i < b.length; i += PED) await js(`window.__partes.push('${b.subarray(i, i + PED).toString('base64')}'); 1`);
await js(`window.__avisos = []; const t0 = toast; toast = (t, ms) => { window.__avisos.push(t); t0(t, ms); }; $('#entrada').value=''; 1`);
const t = Date.now();
await js(`(async()=>{ const bin = window.__partes.map(p => Uint8Array.from(atob(p), c => c.charCodeAt(0))); await transcreverAudio(new Blob(bin, {type:'audio/wav'})); return 1 })()`);
const seg = (Date.now() - t) / 1000;
const texto = await js(`$('#entrada').value`), avisos = await js('window.__avisos');
const repeticoes = (texto.match(/Olá, este é um teste/gi) || []).length;
console.log('  avisos:', JSON.stringify(avisos));
console.log(`  ${/primeiros 10 minutos/.test(avisos.join(' ')) ? '✔' : '✘'} avisou o corte em 10 minutos`);
console.log(`  ${repeticoes >= 40 && repeticoes <= 51 ? '✔' : '✘'} transcreveu ~10 min (a frase de teste aparece ${repeticoes}x; 10 min = 50x)`);
console.log(`  tempo total: ${seg.toFixed(0)} s para 10 min de áudio · ${texto.length} caracteres`);
ws.close(); process.exit(0);
