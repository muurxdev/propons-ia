// Transcreve um áudio longo no app real (sem limite de tempo: o app corta em trechos nos silêncios) e mede o tempo.
// Usa o áudio de teste com a frase "Olá, este é um teste de transcrição longa." repetida N vezes.
// Uso: node src/teste_voz_longa.mjs <porta-cdp> <arquivo-wav> <vezes-que-a-frase-aparece>
import fs from 'node:fs';
const [porta, wavArq, vezesArg] = process.argv.slice(2);
const vezes = +vezesArg || 50;
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
await js(`window.__avisos = []; window.__partesVistas = 0; if (!window.__toast0) { window.__toast0 = toast; toast = (t, ms) => { window.__avisos.push(t); window.__toast0(t, ms); }; } if (!PLATAFORMA.__t0) { PLATAFORMA.__t0 = PLATAFORMA.transcrever; PLATAFORMA.transcrever = function () { window.__partesVistas++; return PLATAFORMA.__t0.apply(this, arguments); }; } $('#entrada').value=''; 1`);
const t = Date.now();
await js(`(async()=>{ const bin = window.__partes.map(p => Uint8Array.from(atob(p), c => c.charCodeAt(0))); await transcreverAudio(new Blob(bin, {type:'audio/wav'})); return 1 })()`);
const seg = (Date.now() - t) / 1000;
const texto = await js(`$('#entrada').value`), avisos = await js('window.__avisos');
const repeticoes = (texto.match(/este é um teste/gi) || []).length, min = (b.length - 44) / 32000 / 60;
console.log('  avisos:', JSON.stringify(avisos));
const res = [];
const ok = (n, c) => { res.push(c); console.log(`  ${c ? '✔' : '✘'} ${n}`); };
ok(`não cortou nada (sem limite de tempo)`, !/primeiros|minutos:/.test(avisos.join(' ')));
ok(`dividiu em ${await js('window.__partesVistas')} trechos`, (await js('window.__partesVistas')) >= Math.floor(min / 3));
ok(`transcreveu tudo: a frase aparece ${repeticoes}x de ${vezes}`, repeticoes >= vezes * 0.85 && repeticoes <= vezes * 1.05);
console.log(`  tempo total: ${seg.toFixed(0)} s para ${min.toFixed(1)} min de áudio · ${texto.length} caracteres`);
ws.close(); process.exit(res.every(Boolean) ? 0 : 1);
