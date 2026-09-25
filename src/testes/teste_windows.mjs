// Teste de ponta a ponta do app real do Windows (WebView2 via CDP; app aberto com PROPONS_DEPURAR=1).
// Inclui: conversa, código, anexo, continuar, diagnóstico, troca de modelo (4B e volta) e o vigia do motor.
// Uso: node src/testes/teste_windows.mjs <pasta-saida> [--sem-troca]
import fs from 'node:fs';
import { execSync } from 'node:child_process';
const saida = process.argv[2]; const semTroca = process.argv.includes('--sem-troca');
fs.mkdirSync(saida, { recursive: true });
let alvos = [];
for (let i = 0; i < 300; i++) { try { alvos = await (await fetch('http://127.0.0.1:9333/json')).json(); if (alvos.some(a => /127\.0\.0\.1:\d+\/#k=/.test(a.url))) break; } catch (e) {} await new Promise(r => setTimeout(r, 1000)); }
const pag = alvos.find(a => /127\.0\.0\.1:\d+\//.test(a.url));
if (!pag) { console.log('app não abriu a interface', alvos.map(a => a.url)); process.exit(1); }
const ws = new WebSocket(pag.webSocketDebuggerUrl); await new Promise(r => ws.onopen = r);
let seq = 0; const pend = new Map();
ws.onmessage = e => { const m = JSON.parse(e.data); if (pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } };
const cdp = (method, params = {}) => new Promise(r => { const id = ++seq; pend.set(id, r); ws.send(JSON.stringify({ id, method, params })); });
const js = async e => { const r = await cdp('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true }); if (r.result?.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails).slice(0, 300)); return r.result?.result?.value; };
const foto = async n => { const r = await cdp('Page.captureScreenshot', { format: 'png' }); if (r.result) fs.writeFileSync(`${saida}/${n}.png`, Buffer.from(r.result.data, 'base64')); };
const espera = ms => new Promise(r => setTimeout(r, ms));
const res = []; const ok = (n, c, d = '') => { res.push([c, n, d]); console.log(c ? '  ✔' : '  ✘', n, d ? '— ' + String(d).slice(0, 150) : ''); };
const pronto = async (s = 300) => { for (let i = 0; i < s * 2; i++) { if (await js('online && $("#estado").hidden')) return true; await espera(500); } return false; };
const pergunta = async t => { await js(`(()=>{const e=$('#entrada'); e.value=${JSON.stringify(t)}; ajustar(); $('#enviar').click(); return 1})()`); for (let i = 0; i < 60 && !(await js('!!geracao')); i++) await espera(250); for (let i = 0; i < 600 && await js('!!geracao'); i++) await espera(500); return js('atual.msgs[atual.msgs.length-1]'); };
const motorPid = () => { try { return execSync('powershell -NoProfile -Command "(Get-Process llama-server).Id"').toString().trim(); } catch (e) { return ''; } };

ok('plataforma é windows', (await js('PLATAFORMA.tipo')) === 'windows');
ok('IA pronta', await pronto());
await js('nova(); 1');
let m = await pergunta('oi'); ok('responde "oi"', m && m.role === 'assistant' && m.texto.trim().length > 0 && m.texto.length < 1500, m && (m.role + ': ' + m.texto));   // com a temperatura livre o Lume às vezes se apresenta em 2–3 frases
m = await pergunta('quick sort em [8, 2, 6, 4, 9, 1]'); ok('quick sort exato', /\[1, 2, 4, 6, 8, 9\]/.test(m.texto) && !!m.passos);
m = await pergunta('crie um código em C que lê dois números e mostra a soma'); ok('código C com cores', await js(`!!document.querySelector('.msg.ia:last-child pre .tk-kw')`), (await js(`document.querySelector('.msg.ia:last-child pre')?.dataset.lang`)));
await foto('w1-codigo');
await js(`adicionarArquivos([new File(['nums = [3, 1, 2]\\nprint(sorted(nums))\\n'], 'ordena.py', {type:'text/plain'})])`);
// com o modelo Leve (CI, --sem-troca) a resposta varia: basta falar do arquivo/da lista
m = await pergunta('o que esse arquivo imprime?'); ok('anexo lido', semTroca ? /ordena|python|lista|\[1, 2, 3\]|crescente|sorted|print/i.test(m.texto) : /\[1, 2, 3\]/.test(m.texto), m.texto.slice(0, 120));
// continuar
const c = await js(`(()=>{const m=atual.msgs[atual.msgs.length-1]; m.texto=m.texto.slice(0,40); m.llm=m.texto; m.cortada=true; abrir(atual.id); return m.texto.length})()`);
await js(`document.querySelector('.acao.continuar').click(); 1`); await espera(500); for (let i = 0; i < 400 && await js('!!geracao'); i++) await espera(500);
ok('continuar', (await js('atual.msgs[atual.msgs.length-1].texto.length')) > c && !(await js('atual.msgs[atual.msgs.length-1].cortada')));
// sistema e salvamento pela ponte
const s = await js('PLATAFORMA.sistema()'); ok('sistema pela ponte', s && s.ramTotal > 0 && s.modelos.length === 3, s && s.so);
ok('conversas no arquivo', fs.existsSync(s.pastaDados + '\\conversas.json'), s.pastaDados);
// diagnóstico
await js(`abrirConfig('diagnostico'); 1`); await espera(600); await js('rodarDiagnostico()');
const diag = await js('window.__diagnostico'); for (const d of diag) console.log(`     [${d.st}] ${d.titulo}: ${d.det || ''}`);
ok('diagnóstico sem erros', !diag.some(d => d.st === 'erro')); await foto('w2-diagnostico'); await js('fecharModal(); 1');
// vigia: derruba o motor à força
const pid1 = motorPid(); execSync(`powershell -NoProfile -Command "Stop-Process -Id ${pid1} -Force"`);
await espera(1500); const reconectou = await pronto(120); const pid2 = motorPid();
ok('vigia religou o motor', reconectou && pid2 && pid2 !== pid1, `${pid1} → ${pid2}`);
m = await pergunta('responda só: ok'); ok('responde depois de religar', m.texto.length > 0 && !m.erro, m.texto);
// 1.2: ajustes com menu ao lado, modelos (baixar/cancelar/apagar/verificar) e atualizações
await js(`abrirConfig(); 1`); await espera(600);
ok('ajustes: menu ao lado + conteúdo', await js(`(()=>{const n=document.querySelector('.p-nav').getBoundingClientRect(), c=document.querySelector('.p-conteudo').getBoundingClientRect(); return n.width>150 && c.width>200 && c.left>=n.right-1})()`));
await js(`irPara('modelo'); 1`); await espera(1200);
ok('modelos: 3 cartões, 1 em uso', (await js(`document.querySelectorAll('.mcard').length`)) === 3 && (await js(`document.querySelectorAll('.mcard.on').length`)) === 1);
await foto('w4-modelos');
const alvo = await js(`(sistemaCache.modelos.find(m=>!m.baixado)||{}).id || ''`);
if (alvo) {
  await js(`window.__fim=null; PLATAFORMA.ao('download-fim', d => window.__fim = d); PLATAFORMA.baixarModelo('${alvo}').then(()=>1)`);
  let pct = 0; for (let i = 0; i < 120 && pct <= 0.002; i++) { await espera(500); pct = await js(`(baixando['${alvo}']||{}).pct||0`); }
  ok('modelos: download com progresso', pct > 0.002, `${alvo} ${(pct * 100).toFixed(1)}%`);
  await foto('w5-baixando');
  await js(`PLATAFORMA.cancelarDownload('${alvo}').then(()=>1)`);
  let fim = null; for (let i = 0; i < 40 && !fim; i++) { await espera(500); fim = await js('window.__fim'); }
  ok('modelos: cancelar download', fim && fim.erro === 'cancelado', JSON.stringify(fim));
  ok('modelos: apagar o parcial', (await js(`PLATAFORMA.apagarModelo('${alvo}').then(()=>'ok',e=>e.message)`)) === 'ok');
}
const emUso = await js(`sistemaCache.modelos.find(m=>m.atual).id`);
const recusa = await js(`PLATAFORMA.apagarModelo('${emUso}').then(()=>'apagou!',e=>e.message)`);
ok('modelos: não apaga o que está em uso', /em uso/.test(recusa), recusa);
const tv = Date.now(); const ver = await js('PLATAFORMA.verificarModelos()');
ok('modelos: SHA-256 dos baixados confere', ver.length >= 1 && ver.every(x => x.ok), `${ver.map(x => x.nome).join(', ')} em ${((Date.now() - tv) / 1000).toFixed(0)} s`);
await js(`irPara('atualizacoes'); 1`); const u = await js('checarAtualizacao()'); await js('desenharAba(); 1'); await espera(300);
// no runner do CI a API do GitHub às vezes limita pedidos sem token (403): aí a consulta vale como pulada, não como falha
let limitada = false; if (u === null) { try { const r = await fetch('https://api.github.com/repos/muurxdev/propons-ia/releases/latest'); limitada = r.status === 403 || r.status === 429; } catch (e) {} }
ok('atualizações: consulta a release publicada', u !== null || limitada, u === null ? (limitada ? 'API do GitHub limitada neste ambiente (pulado)' : 'null') : JSON.stringify(u).slice(0, 60)); await foto('w6-atualizacoes');
await js('fecharModal(); 1');
// troca de modelo
if (!semTroca) {
  for (const [id, nome] of [['avancado', '4B'], ['normal', '2B']]) {
    await js(`abrirConfig('modelo'); 1`); await espera(1200);
    await js(`document.querySelector('[data-modelo="${id}"]').click(); 1`); await espera(400);
    await js(`(()=>{const b=document.querySelector('.dlg .btn.primario'); if(b) b.click(); return 1})()`); await espera(300);
    await js(`(()=>{const b=document.querySelector('.dlg .btn.primario'); if(b) b.click(); return 1})()`);
    const t0 = Date.now(); await espera(3000);
    const ok2 = await pronto(900);
    const p = await js('PLATAFORMA.props()');
    ok(`troca para ${nome}`, ok2 && String(p.model_path).includes(nome), `${((Date.now() - t0) / 1000).toFixed(0)} s · ${p.model_path}`);
    await foto(`w3-modelo-${id}`); await js('fecharModal(); 1');
    const t1 = Date.now(); m = await pergunta('Explique em uma frase o que é um algoritmo.');
    const tps = (await js(`PLATAFORMA.gerar([{role:'user',content:'Conte de 1 a 30.'}],{temperatura:0,maxTokens:60},()=>{}).then(r=>r.timings && r.timings.predicted_per_second)`));
    const ram = execSync('powershell -NoProfile -Command "[int]((Get-Process llama-server).WorkingSet64/1MB)"').toString().trim();
    ok(`${nome} responde`, m.texto.length > 10, `${tps ? tps.toFixed(1) : '?'} tokens/s · RAM do motor ${ram} MB · ${m.texto.slice(0, 90)}`);
  }
}
// Área de código → Rodar: Python e Node do PC, numa cópia do projeto (com import entre arquivos e o teclado)
{
  const py = await js(`PLATAFORMA.rodarCodigo({ arquivos: [{ nome: 'util/conta.py', conteudo: 'def dobro(x):\\n    return 2 * x\\n' }, { nome: 'util/__init__.py', conteudo: '' }, { nome: 'main.py', conteudo: 'from util.conta import dobro\\nn = int(input())\\nprint("dobro:", dobro(n), "ç")\\n' }], principal: 'main.py', entrada: '21' }).then(r => JSON.stringify(r), e => 'erro: ' + e.message)`);
  ok('Rodar: Python com import entre arquivos e o que digitar', /"saida":"dobro: 42 ç/.test(py) && /"codigo":0/.test(py), py.slice(0, 200));
  const err = await js(`PLATAFORMA.rodarCodigo({ arquivos: [{ nome: 'x.py', conteudo: 'print(1/0)' }], principal: 'x.py' }).then(r => JSON.stringify(r), e => 'erro: ' + e.message)`);
  ok('Rodar: o erro do Python volta (para a IA corrigir), sem o caminho da pasta temporária', /ZeroDivisionError/.test(err) && !/propons-rodar/.test(err), err.slice(0, 200));
  const nd = await js(`PLATAFORMA.rodarCodigo({ arquivos: [{ nome: 'a.js', conteudo: 'console.log([1,2,3].map(x => x * 2).join(","))' }], principal: 'a.js' }).then(r => JSON.stringify(r), e => 'erro: ' + e.message)`);
  ok('Rodar: JavaScript com o Node do PC', /"saida":"2,4,6/.test(nd) || /Node.js não está instalado/.test(nd), nd.slice(0, 160));
  const laco = await js(`PLATAFORMA.rodarCodigo({ arquivos: [{ nome: 'l.py', conteudo: 'while True: pass' }], principal: 'l.py' }).then(r => JSON.stringify(r), e => 'erro: ' + e.message)`);
  ok('Rodar: laço infinito é parado em 20 s', /"esgotou":true/.test(laco), laco.slice(0, 160));
}
// "Usar a IA de outro aparelho": a página (outra origem) chama o motor com a chave — é o que o celular faz com o PC.
// localhost ≠ 127.0.0.1 para o navegador (outra origem, mesmo CORS da rede) e não passa pelo firewall do runner.
// Confere o CORS com Authorization (o padrão do llama-server não libera) e o teste do app (saúde + chave).
{
  const porta = await js('location.port'), url = `http://localhost:${porta}`;
  const remoto = await js(`PLATAFORMA.testarRemota('${url}', PLATAFORMA.chave).then(n => 'ok: ' + n, e => 'erro: ' + e.message)`);
  const errada = await js(`PLATAFORMA.testarRemota('${url}', 'chave-errada').then(n => 'ok: ' + n, e => 'erro: ' + e.message)`);
  const gerou = await js(`fetch('${url}/v1/chat/completions', { method: 'POST', signal: AbortSignal.timeout(60000), headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + PLATAFORMA.chave }, body: JSON.stringify({ messages: [{ role: 'user', content: 'Diga só: oi' }], max_tokens: 8 }) }).then(r => r.status + ' ' + (r.headers.get('access-control-allow-origin') || '')).catch(e => 'erro: ' + e.message)`);
  ok('IA de outro aparelho: outra origem chama o motor com a chave (CORS com Authorization)', /^ok: /.test(remoto) && /^200/.test(gerou), remoto + ' · ' + gerou);
  ok('IA de outro aparelho: chave errada é recusada', /chave errada/.test(errada), errada);
}
fs.writeFileSync(`${saida}/resultado.json`, JSON.stringify({ res, diag, sistema: s }, null, 1));
ws.close();
const falhas = res.filter(r => !r[0]).length;
console.log(falhas ? `${falhas} falha(s)` : 'todos os testes passaram'); process.exit(falhas ? 1 : 0);
