// Grava um trace do Chrome enquanto os Ajustes abrem durante uma resposta e lista os eventos mais pesados.
const [porta] = process.argv.slice(2);
const alvos = await (await fetch(`http://127.0.0.1:${porta}/json`)).json();
const pag = alvos.find(a => a.type === 'page' && /127\.0\.0\.1:\d+/.test(a.url));
const ws = new WebSocket(pag.webSocketDebuggerUrl); await new Promise(r => ws.onopen = r);
let seq = 0; const pend = new Map(); const eventos = []; let fimTrace = null;
ws.onmessage = e => {
  const m = JSON.parse(e.data);
  if (m.method === 'Tracing.dataCollected') eventos.push(...m.params.value);
  if (m.method === 'Tracing.tracingComplete') fimTrace && fimTrace();
  if (pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); }
};
const cdp = (method, params = {}) => new Promise(r => { const id = ++seq; pend.set(id, r); ws.send(JSON.stringify({ id, method, params })); });
const js = async e => (await cdp('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true })).result?.result?.value;
const espera = ms => new Promise(r => setTimeout(r, ms));
await cdp('Emulation.setCPUThrottlingRate', { rate: +(process.env.LENTO || 6) });
await js(`nova(); const e=$('#entrada'); e.value='Explique em detalhes, com listas e um exemplo de código em Python, como funciona o quick sort.'; ajustar(); $('#enviar').click(); 1`);
await espera(6000);
await cdp('Tracing.start', { categories: 'devtools.timeline,disabled-by-default-devtools.timeline,blink', transferMode: 'ReportEvents' });
await espera(300);
await js(`abrirConfig(); 1`);
await espera(900);
await new Promise(r => { fimTrace = r; cdp('Tracing.end'); });
await js(`fecharModal(true); geracao && geracao.ctrl.abort(); 1`);
// soma por nome de evento (só os da thread principal da página)
const soma = {};
for (const ev of eventos) if (ev.ph === 'X' && ev.dur > 2000) { const k = ev.name + (ev.args?.data?.type ? ':' + ev.args.data.type : ''); (soma[k] = soma[k] || { n: 0, ms: 0, max: 0 }); soma[k].n++; soma[k].ms += ev.dur / 1000; soma[k].max = Math.max(soma[k].max, ev.dur / 1000); }
Object.entries(soma).sort((a, b) => b[1].max - a[1].max).slice(0, 14).forEach(([k, v]) => console.log(k.padEnd(40), `maior ${v.max.toFixed(0)} ms · ${v.n}x · total ${v.ms.toFixed(0)} ms`));
const recalc = eventos.filter(ev => ev.name === 'UpdateLayoutTree' && ev.dur > 20000).map(ev => ev.args?.elementCount || ev.args?.data?.elementCount).filter(Boolean);
if (recalc.length) console.log('elementos recalculados nos maiores UpdateLayoutTree:', recalc.join(', '));
const lay = eventos.filter(ev => ev.name === 'Layout' && ev.dur > 20000).map(ev => JSON.stringify(ev.args?.beginData ? { sujos: ev.args.beginData.dirtyObjects, total: ev.args.beginData.totalObjects } : {}));
if (lay.length) console.log('layouts grandes:', lay.join(' '));
ws.close(); process.exit(0);
