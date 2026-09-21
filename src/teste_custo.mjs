// Mede o quadro mais longo ao abrir os Ajustes, testando variações de estilo (CPU da interface desacelerada, LENTO=6).
const [porta] = process.argv.slice(2);
const alvos = await (await fetch(`http://127.0.0.1:${porta}/json`)).json();
const pag = alvos.find(a => a.type === 'page' && /127\.0\.0\.1:\d+/.test(a.url));
const ws = new WebSocket(pag.webSocketDebuggerUrl); await new Promise(r => ws.onopen = r);
let seq = 0; const pend = new Map();
ws.onmessage = e => { const m = JSON.parse(e.data); if (pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } };
const cdp = (method, params = {}) => new Promise(r => { const id = ++seq; pend.set(id, r); ws.send(JSON.stringify({ id, method, params })); });
const js = async e => (await cdp('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true })).result?.result?.value;
const espera = ms => new Promise(r => setTimeout(r, ms));
await cdp('Emulation.setCPUThrottlingRate', { rate: +(process.env.LENTO || 6) });
await js(`window.__l=[]; new PerformanceObserver(l => l.getEntries().forEach(e => window.__l.push(Math.round(e.duration)))).observe({ type: 'long-animation-frame' }); 1`);
const variantes = [
  ['como está', ''],
  ['sem sombra', '.painel,.dlg{box-shadow:none!important}'],
  ['sem animação', '.painel,.dlg,.painel-fundo,.dlg-fundo{animation:none!important}'],
  ['sem fundo escuro', '.painel-fundo,.dlg-fundo{background:transparent!important}'],
  ['sem sombra nem animação', '.painel,.dlg{box-shadow:none!important}.painel,.dlg,.painel-fundo,.dlg-fundo{animation:none!important}'],
];
for (const [nome, css] of variantes) {
  await js(`(()=>{let s=document.getElementById('varCss'); if(!s){s=document.createElement('style');s.id='varCss';document.head.appendChild(s);} s.textContent=${JSON.stringify(css)}; return 1})()`);
  const r = [];
  for (let i = 0; i < 4; i++) {
    await js('window.__l=[]; 1'); await js(`abrirConfig('modelo'); 1`); await espera(900);
    r.push(Math.max(0, ...((await js('window.__l')) || [0])));
    await js('fecharModal(true); 1'); await espera(400);
  }
  console.log(nome.padEnd(26), 'pior quadro ao abrir:', r.join(' / '), 'ms');
}
ws.close(); process.exit(0);
