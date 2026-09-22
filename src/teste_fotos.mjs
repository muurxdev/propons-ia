// Teste do "+" e de fotos no app real (CDP): abre o "+", anexa uma foto, liga a visão pelo diálogo e confere a resposta.
// Uso: node src/teste_fotos.mjs <porta-cdp> <pasta-saida> <arquivo-jpg>
import fs from 'node:fs';
const [porta, saida, jpg] = process.argv.slice(2);
fs.mkdirSync(saida, { recursive: true });
const alvos = await (await fetch(`http://127.0.0.1:${porta}/json`)).json();
const pag = alvos.find(a => a.type === 'page' && /127\.0\.0\.1:\d+/.test(a.url));
const ws = new WebSocket(pag.webSocketDebuggerUrl); await new Promise(r => ws.onopen = r);
let seq = 0; const pend = new Map();
ws.onmessage = e => { const m = JSON.parse(e.data); if (pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } };
const cdp = (method, params = {}) => new Promise(r => { const id = ++seq; pend.set(id, r); ws.send(JSON.stringify({ id, method, params })); });
const js = async e => { const r = await cdp('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true }); if (r.result?.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails).slice(0, 300)); return r.result?.result?.value; };
const foto = async n => { const r = await cdp('Page.captureScreenshot', { format: 'png' }); if (r.result) fs.writeFileSync(`${saida}/${n}.png`, Buffer.from(r.result.data, 'base64')); };
const espera = ms => new Promise(r => setTimeout(r, ms));
const res = []; const ok = (n, c, d = '') => { res.push(c); console.log(c ? '  ✔' : '  ✘', n, d ? '— ' + String(d).slice(0, 180) : ''); };
for (let i = 0; i < 300 && !(await js('online')); i++) await espera(500);
const plat = await js('PLATAFORMA.tipo');
// 1) o "+"
await js('nova(); $("#anexar").click(); 1'); await espera(700);
ok('"+" abre a folha com câmera, fotos, arquivos, áudio e biblioteca', (await js(`[...document.querySelectorAll('.opcoes [data-op]')].map(b=>b.dataset.op).join(',')`)) === 'camera,fotos,arquivos,audio,biblioteca');
await espera(600);
ok('seletor de modelo ao lado do "+"', /Própons / .test(await js(`$('#nomeModelo').textContent`)), await js(`$('#nomeModelo').textContent`));
await foto('f1-mais');
await js('fecharDialogo(); 1'); await espera(400);
// 2) anexa a foto
const b64 = fs.readFileSync(jpg).toString('base64');
await js(`(async()=>{ const b = await (await fetch('data:image/jpeg;base64,${b64}')).blob(); await adicionarArquivos([new File([b], 'conta.jpg', {type:'image/jpeg'})]); return 1 })()`);
ok('foto vira miniatura na caixa', await js(`!!document.querySelector('#chips .chip.foto img')`));
await foto('f2-chip');
// 3) envia: se a visão estiver desligada, o app pergunta; confirma no diálogo
await js(`$('#entrada').value='O que está escrito na foto, qual a resposta da conta e que forma colorida aparece?'; ajustar(); $('#enviar').click(); 1`);
await espera(1200);
const pediu = await js(`!!document.querySelector('.dlg .btn.primario')`);
if (pediu) { await foto('f3-pede-visao'); console.log('     diálogo:', await js(`document.querySelector('.dlg').innerText.replace(/\\s+/g,' ').slice(0,200)`)); await js(`document.querySelector('.dlg .btn.primario').click(); 1`); }
const t0 = Date.now();
for (let i = 0; i < 1800 && !(await js('!!geracao')); i++) await espera(500);
const tLigou = (Date.now() - t0) / 1000;
for (let i = 0; i < 600 && (await js('!!geracao')); i++) await espera(500);
const m = await js('atual.msgs[atual.msgs.length-1]');
const s = await js('lerSistema()');
ok('visão ligada no motor', s && s.visaoAtiva, pediu ? `ligou em ${tLigou.toFixed(0)} s` : 'já estava ligada');
ok('a IA leu a foto (42 e vermelha)', m && /42/.test(m.texto) && /vermelh/i.test(m.texto), m && m.texto.replace(/\s+/g, ' '));
ok('miniatura aparece na mensagem', await js(`!!document.querySelector('.msg.eu .fotos-msg img')`));
const salvo = await js(`PLATAFORMA.carregar().then(t => { const c = JSON.parse(t).find(x=>x.id===atual.id); const u = c.msgs.find(x=>x.imagens); return u ? { mini: u.imagens[0].miniatura.length, envio: 'dataUrl' in u || '_envio' in u } : null })`);
ok('histórico guarda só a miniatura', salvo && salvo.mini < 80000 && !salvo.envio, JSON.stringify(salvo));
await foto('f4-resposta');
// 4) pergunta seguinte sem foto: não reenvia a imagem
const m2 = await (async () => { await js(`$('#entrada').value='E quanto é essa resposta vezes 2?'; ajustar(); $('#enviar').click(); 1`); await espera(500); for (let i = 0; i < 600 && (await js('!!geracao')); i++) await espera(500); return js('atual.msgs[atual.msgs.length-1]'); })();
ok('continua a conversa sobre a foto', m2 && /84/.test(m2.texto), m2 && m2.texto.replace(/\s+/g, ' '));
ws.close();
const falhas = res.filter(x => !x).length;
console.log(falhas ? `${falhas} falha(s)` : 'todos os testes passaram'); process.exit(falhas ? 1 : 0);
