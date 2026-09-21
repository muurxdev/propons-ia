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

// ---- 1.2: tela cheia, ajustes em tela cheia, modelos, atualizações, gestos ----
const margens = await js(`(()=>{const s=document.documentElement.style;return {t:s.getPropertyValue('--sa-t'),b:s.getPropertyValue('--sa-b')}})()`);
ok('tela cheia: barras do sistema viram margens da página', parseFloat(margens.t) > 0, JSON.stringify(margens));
const topoHeader = await js(`document.querySelector('header').getBoundingClientRect().top`);
ok('cabeçalho abaixo da barra de status', topoHeader >= parseFloat(margens.t) - 1, `topo ${topoHeader}px`);
await js(`fecharLateral(); nova(); 1`); await espera(300);
await foto('6-inicio-sugestoes');
ok('sugestões na tela inicial', (await js(`document.querySelectorAll('[data-sug]').length`)) === 4);
// arrastar da borda abre o histórico
const toque = (type, x, y) => cdp('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y }] });
await toque('touchStart', 4, 400); for (let x = 20; x <= 260; x += 40) { await toque('touchMove', x, 402); await espera(16); } await toque('touchEnd');
await espera(400);
ok('arrastar da borda abre o histórico', !(await js(`$('#lateral').classList.contains('fechada')`)));
await foto('7-gaveta-arrastada');
await js(`fecharLateral(); 1`); await espera(300);
// menu da conversa vira folha de baixo
await js(`menuConversa(document.querySelector('[data-menu]'), conversas[0].id); 1`); await espera(350);
ok('menu da conversa em folha', await js(`!!document.querySelector('.dlg.folha')`));
await foto('8-menu-folha');
await js(`fecharDialogo(); 1`);
// ajustes: lista em tela cheia e subpáginas
await js(`abrirConfig(); 1`); await espera(500);
ok('ajustes em tela cheia (lista)', await js(`(()=>{const r=document.querySelector('.painel').getBoundingClientRect();return r.width>=innerWidth-1 && r.height>=innerHeight-1 && !document.querySelector('.painel').classList.contains('sub')})()`));
await foto('9-ajustes');
await js(`irPara('modelo'); 1`); await espera(1200);
ok('modelos: 3 cartões', (await js(`document.querySelectorAll('.mcard').length`)) === 3);
ok('modelos: um em uso', (await js(`document.querySelectorAll('.mcard.on').length`)) === 1);
await foto('10-modelos');
// baixar e cancelar (sem baixar o modelo inteiro)
const alvo = await js(`(sistemaCache.modelos.find(m=>!m.baixado && !m.bloqueado && m.id!=='avancado')||{}).id || ''`);
if (alvo) {
  await js(`window.__fim=null; PLATAFORMA.ao('download-fim', d => window.__fim = d); PLATAFORMA.baixarModelo('${alvo}').then(()=>1)`);
  let pct = 0; for (let i = 0; i < 120 && pct <= 0.002; i++) { await espera(500); pct = await js(`(baixando['${alvo}']||{}).pct||0`); }
  ok('modelos: download começa com progresso', pct > 0.002, `${(pct * 100).toFixed(1)}%`);
  await foto('11-baixando');
  await js(`PLATAFORMA.cancelarDownload('${alvo}').then(()=>1)`);
  let fim = null; for (let i = 0; i < 40 && !fim; i++) { await espera(500); fim = await js(`window.__fim`); }
  ok('modelos: cancelar download', fim && fim.erro === 'cancelado', JSON.stringify(fim));
  const apagou = await js(`PLATAFORMA.apagarModelo('${alvo}').then(()=>'ok',e=>e.message)`);
  ok('modelos: apagar o parcial', apagou === 'ok', apagou);
}
const ativoId = await js(`sistemaCache.modelos.find(m=>m.atual).id`);
const recusa = await js(`PLATAFORMA.apagarModelo('${ativoId}').then(()=>'apagou!',e=>e.message)`);
ok('modelos: não apaga o que está em uso', /em uso/.test(recusa), recusa);
// verificar modelos (SHA-256)
const ver = await js(`PLATAFORMA.verificarModelos()`);
ok('modelos: SHA-256 dos baixados confere', Array.isArray(ver) && ver.length >= 1 && ver.every(x => x.ok), JSON.stringify(ver));
// atualizações
await js(`irPara('atualizacoes'); 1`); await espera(800);
const upd = await js(`checarAtualizacao()`);
ok('atualizações: consulta a versão publicada', upd !== null, JSON.stringify(upd).slice(0, 80));
await js(`desenharAba(); 1`); await espera(300);
await foto('12-atualizacoes');
await js(`voltarPainel(); 1`); await espera(400);
ok('voltar sai da subpágina', await js(`!document.querySelector('.painel').classList.contains('sub')`));
await js(`fecharModal(); 1`);
// instalação da atualização: baixa o APK da release, confere o SHA-256 e entrega ao instalador do Android
if (process.env.TESTAR_INSTALADOR) {
  const { execSync } = await import('node:child_process');
  try { execSync('adb shell appops set io.github.muurxdev.proponsia REQUEST_INSTALL_PACKAGES allow'); } catch (e) {}
  await js(`window.__atu=[]; PLATAFORMA.ao('atualizacao', d => window.__atu.push(d)); 1`);
  const r = await js(`PLATAFORMA.atualizar('${process.env.TESTAR_INSTALADOR}').then(r=>JSON.stringify(r),e=>'erro: '+e.message)`);
  const fases = await js(`window.__atu.map(d=>d.fase).filter((x,i,a)=>a.indexOf(x)===i).join(' → ')`);
  ok('atualização: baixou, conferiu e abriu o instalador', r === 'true' && /baixando.*verificando.*instalando/.test(fases), `${r} · ${fases}`);
  await espera(4000);
  try { execSync(`adb exec-out screencap -p > "${saida}/13-instalador.png"`, { shell: '/bin/bash' }); } catch (e) {}
  try { execSync('adb shell input keyevent KEYCODE_BACK'); } catch (e) {}
  let erro = null; for (let i = 0; i < 20 && !erro; i++) { await espera(500); erro = await js(`(window.__atu.find(d=>d.fase==='erro')||{}).mensagem||null`); }
  ok('atualização: cancelar no instalador volta ao app com aviso', !!erro, erro);
}
fs.writeFileSync(`${saida}/resultado.json`, JSON.stringify({ resultados, diagnostico: diag, sistema: sis }, null, 1));
ws.close();
const falhas = resultados.filter(r => r[0] !== 'OK ').length;
console.log(falhas ? `${falhas} falha(s)` : 'todos os testes passaram');
process.exit(falhas ? 1 : 0);
