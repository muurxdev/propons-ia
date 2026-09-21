// Testes da interface dentro do app de celular (WebView do Android via CDP).
// Uso: node src/teste_celular.mjs <porta-cdp> <pasta-saida>
import fs from 'node:fs';
const [porta, saida] = process.argv.slice(2);
const alvos = await (await fetch(`http://127.0.0.1:${porta}/json`)).json();
const pag = alvos.find(a => a.type === 'page' && /127\.0\.0\.1/.test(a.url)) || alvos.find(a => a.type === 'page');
if (!pag) { console.log('nenhuma página', alvos); process.exit(1); }
const ws = new WebSocket(pag.webSocketDebuggerUrl); await new Promise(r => ws.onopen = r);
let seq = 0; const pend = new Map();
ws.onmessage = e => { const m = JSON.parse(e.data); if (pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } };
const cdp = (method, params = {}) => new Promise(r => { const id = ++seq; pend.set(id, r); ws.send(JSON.stringify({ id, method, params })); });
const js = async e => { const r = await cdp('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true }); if (r.result?.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails).slice(0, 400)); return r.result?.result?.value; };
const foto = async n => { const r = await cdp('Page.captureScreenshot', { format: 'png' }); if (r.result) fs.writeFileSync(`${saida}/${n}.png`, Buffer.from(r.result.data, 'base64')); };
const espera = ms => new Promise(r => setTimeout(r, ms));
const resultados = [];
const ok = (nome, cond, det = '') => { resultados.push([cond ? 'OK ' : 'FALHOU', nome, det]); console.log(cond ? '  ✔' : '  ✘', nome, det ? '— ' + String(det).slice(0, 160) : ''); };
const pergunta = async (t, max = 240) => {
  await js(`(()=>{ const e=document.querySelector('#entrada'); e.value=${JSON.stringify(t)}; ajustar(); document.querySelector('#enviar').click(); return 1 })()`);
  await espera(500);
  for (let i = 0; i < max * 2; i++) { if (!(await js('!!geracao'))) break; await espera(500); }
  return js('atual && atual.msgs[atual.msgs.length-1]');
};

for (let i = 0; i < 240 && !(await js('typeof online!=="undefined" && online')); i++) await espera(500);
ok('plataforma é android', (await js('PLATAFORMA.tipo')) === 'android');
ok('IA online', await js('online'));
await foto('2-inicio');
let m = await pergunta('oi');
ok('responde "oi" (curto)', m && m.role === 'assistant' && m.texto.length > 0 && m.texto.length < 300, m && m.texto);
m = await pergunta('bubble sort em [5, 2, 8, 1]');
ok('bubble sort exato', m && /4 trocas/.test(m.texto) && !!m.passos);
m = await pergunta('faça um código em python que calcula o fatorial de um número');
ok('código com cores', await js(`!!document.querySelector('.msg.ia:last-child .tk-kw')`), m && m.texto.slice(0, 80));
await foto('3-codigo');
await js(`adicionarArquivos([new File(['print(sum([1, 2, 3]))\\n'], 'soma.py', {type: 'text/plain'})])`);
m = await pergunta('o que esse arquivo imprime?');
ok('anexo lido', m && /6/.test(m.texto), m && m.texto.slice(0, 100));
ok('histórico salvo (ponte Android)', (await js(`PLATAFORMA.carregar().then(s => JSON.parse(s).length)`)) >= 1);
const sis = await js(`PLATAFORMA.sistema()`);
ok('sistema pela ponte', sis && sis.ramTotal > 0 && Array.isArray(sis.modelos), sis && sis.so);
await js(`abrirConfig('diagnostico'); 1`); await espera(300);
await js(`rodarDiagnostico()`);
const diag = await js(`window.__diagnostico`);
for (const d of diag || []) console.log(`     [${d.st}] ${d.titulo}: ${d.det || ''}`);
ok('diagnóstico sem erros', diag && diag.length > 5 && !diag.some(d => d.st === 'erro'), diag && diag.filter(d => d.st === 'erro').map(d => d.titulo).join(', '));
await foto('4-diagnostico');
await js(`fecharModal(); abrirLateral(); 1`); await espera(400); await foto('5-historico');
fs.writeFileSync(`${saida}/resultado.json`, JSON.stringify({ resultados, diagnostico: diag, sistema: sis }, null, 1));
ws.close();
const falhas = resultados.filter(r => r[0] !== 'OK ').length;
console.log(falhas ? `${falhas} falha(s)` : 'todos os testes passaram');
process.exit(falhas ? 1 : 0);
