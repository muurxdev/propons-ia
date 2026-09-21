// Mede a fluidez (quadros por segundo) da interface enquanto a IA responde, abrindo e fechando folhas.
// Uso: node src/teste_fps.mjs <porta-cdp> <pasta-saida>   (app aberto com depuraÃ§Ã£o)
import fs from 'node:fs';
const [porta, saida] = process.argv.slice(2);
fs.mkdirSync(saida, { recursive: true });
const alvos = await (await fetch(`http://127.0.0.1:${porta}/json`)).json();
const pag = alvos.find(a => a.type === 'page' && /127\.0\.0\.1:\d+/.test(a.url));
const ws = new WebSocket(pag.webSocketDebuggerUrl); await new Promise(r => ws.onopen = r);
let seq = 0; const pend = new Map();
ws.onmessage = e => { const m = JSON.parse(e.data); if (pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } };
const cdp = (method, params = {}) => new Promise(r => { const id = ++seq; pend.set(id, r); ws.send(JSON.stringify({ id, method, params })); });
const js = async e => (await cdp('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true })).result?.result?.value;
const foto = async n => { const r = await cdp('Page.captureScreenshot', { format: 'png' }); if (r.result) fs.writeFileSync(`${saida}/${n}.png`, Buffer.from(r.result.data, 'base64')); };
const espera = ms => new Promise(r => setTimeout(r, ms));
for (let i = 0; i < 300 && !(await js('online')); i++) await espera(500);
if (process.env.LENTO) { await cdp('Emulation.setCPUThrottlingRate', { rate: +process.env.LENTO }); console.log('CPU da interface ' + process.env.LENTO + 'x mais lenta'); }
// quadros por segundo durante `ms` (e o pior intervalo entre quadros)
const medir = ms => js(`new Promise(ok => { const t=[]; const f=x=>{ t.push(x); if (x - t[0] < ${ms}) requestAnimationFrame(f); else { const d=t.slice(1).map((v,i)=>v-t[i]); ok({ fps: +(1000*(t.length-1)/(t[t.length-1]-t[0])).toFixed(1), pior: +Math.max(...d).toFixed(0) }); } }; requestAnimationFrame(f); })`);
const parado = await medir(1500);
console.log('parado:', JSON.stringify(parado));
await js(`nova(); const e=$('#entrada'); e.value='Explique em detalhes, com vÃ¡rios parÃ¡grafos, listas e um exemplo de cÃ³digo em Python, como funciona o algoritmo quick sort.'; ajustar(); $('#enviar').click(); 1`);
for (let i = 0; i < 60 && !(await js('!!geracao && (atual.msgs.length>0)')); i++) await espera(250);
await espera(2500);
const gerando = await medir(2000);
console.log('gerando (sÃ³ texto):', JSON.stringify(gerando));
// abre e fecha folhas enquanto gera (e registra os quadros longos com a origem de cada um)
await js(`window.__longos=[]; new PerformanceObserver(l => l.getEntries().forEach(e => window.__longos.push({ t: Math.round(e.startTime), dur: Math.round(e.duration), bloqueio: Math.round(e.blockingDuration||0), estilo: Math.round(e.styleAndLayoutStart ? e.startTime + e.duration - e.styleAndLayoutStart : 0), scripts: (e.scripts||[]).map(s => (s.invoker||'') + ' ' + (s.sourceFunctionName||'') + ' ' + Math.round(s.duration) + 'ms').slice(0,4) }))).observe({ type: 'long-animation-frame', buffered: false }); 1`);
const mf = js(`new Promise(ok => { const t=[]; const f=x=>{ t.push(x); if (x - t[0] < 3000) requestAnimationFrame(f); else { const d=t.slice(1).map((v,i)=>v-t[i]); ok({ fps: +(1000*(t.length-1)/(t[t.length-1]-t[0])).toFixed(1), pior: +Math.max(...d).toFixed(0) }); } }; requestAnimationFrame(f); })`);
await js(`window.__marcas=[]; window.__marcas.push(["abrirConfig", Math.round(performance.now())]); abrirConfig(); 1`); await espera(700);
await js(`window.__marcas.push(["fecharModal", Math.round(performance.now())]); fecharModal(); 1`); await espera(500);
await js(`window.__marcas.push(["menu", Math.round(performance.now())]); menuConversa(document.querySelector('[data-menu]'), conversas[0].id); 1`); await espera(600);
await js(`window.__marcas.push(["fecharDialogo", Math.round(performance.now())]); fecharDialogo(); 1`); await espera(400);
const comFolhas = await mf;
console.log('gerando + abrindo/fechando folhas:', JSON.stringify(comFolhas));
console.log('   marcas', JSON.stringify(await js('window.__marcas')));
for (const l of (await js('window.__longos')) || []) console.log('   quadro longo', JSON.stringify(l));
await js(`geracao && geracao.ctrl.abort(); 1`);
fs.writeFileSync(`${saida}/fps.json`, JSON.stringify({ parado, gerando, comFolhas }, null, 1));
ws.close();
process.exit(0);
