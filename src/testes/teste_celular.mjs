// Testes da interface dentro do app de celular (WebView do Android via CDP).
// Uso: node src/testes/teste_celular.mjs <porta-cdp> <pasta-saida>
import fs from 'node:fs';
import { conectar, espera, relatorio } from './cdp.mjs';
const [porta, saida] = process.argv.slice(2);
const { js, foto, fechar, cdp } = await conectar({ porta, saida, filtro: u => /127.0.0.1/.test(u) });
const resultados = [];
const ok = (nome, cond, det = '') => { resultados.push([cond ? 'OK ' : 'FALHOU', nome, det]); console.log(cond ? '  ✔' : '  ✘', nome, det ? '— ' + String(det).slice(0, 160) : ''); };
const pergunta = async (t, max = 900) => {   // o emulador do CI é lento: até 7,5 min por resposta
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
ok('responde "oi" (curto)', !!(m && m.role === 'assistant' && m.texto.length > 0 && m.texto.length < 600), (m && m.texto.length + ' letras: ' + m.texto) || '');   // o modelo leve às vezes se alonga
m = await pergunta('bubble sort em [5, 2, 8, 1]');
ok('bubble sort exato', m && /4 trocas/.test(m.texto) && !!m.passos);
m = await pergunta('faça um código em python que calcula o fatorial de um número');
ok('código com cores', await js(`!!document.querySelector('.msg.ia:last-child .tk-kw')`), m && m.texto.slice(0, 80));
await foto('3-codigo');
// a Área de código é só do computador: no celular não há "Código" no menu nem "Guardar" nos blocos
ok('sem Área de código no celular', await js(`!TELAS.codigo && !document.querySelector('#latNav [data-tela="codigo"]') && !document.querySelector('.msg.ia .guardar')`));
ok('caixa sem a bolinha de contexto (a compactação é sozinha)', await js(`!$('#medidorCtx') && usoAgora().total === nCtx`));
await js(`adicionarArquivos([new File(['print(sum([1, 2, 3]))\\n'], 'soma.py', {type: 'text/plain'})])`);
m = await pergunta('o que esse arquivo imprime?');
ok('anexo lido', m && /6|soma|arquivo|python|print/i.test(m.texto), m && m.texto.slice(0, 100));   // Lume (0.8B) varia; basta falar do arquivo
// PDF anexado vira texto (pdf.js embutido, carregado por blob no WebView do Android)
{
  const pdfB64 = 'JVBERi0xLjQKMSAwIG9iago8PCAvVHlwZSAvQ2F0YWxvZyAvUGFnZXMgMiAwIFIgPj4KZW5kb2JqCjIgMCBvYmoKPDwgL1R5cGUgL1BhZ2VzIC9LaWRzIFs0IDAgUiA2IDAgUl0gL0NvdW50IDIgPj4KZW5kb2JqCjMgMCBvYmoKPDwgL1R5cGUgL0ZvbnQgL1N1YnR5cGUgL1R5cGUxIC9CYXNlRm9udCAvSGVsdmV0aWNhID4+CmVuZG9iago0IDAgb2JqCjw8IC9UeXBlIC9QYWdlIC9QYXJlbnQgMiAwIFIgL01lZGlhQm94IFswIDAgNjEyIDc5Ml0gL1Jlc291cmNlcyA8PCAvRm9udCA8PCAvRjEgMyAwIFIgPj4gPj4gL0NvbnRlbnRzIDUgMCBSID4+CmVuZG9iago1IDAgb2JqCjw8IC9MZW5ndGggOTIgPj4Kc3RyZWFtCkJUIC9GMSAxNCBUZiA2MCA3MjAgVGQgKEEgZm90b3NzaW50ZXNlIHRyYW5zZm9ybWEgbHV6IGVtIGVuZXJnaWEgcXVpbWljYSBuYXMgcGxhbnRhcy4pIFRqIEVUCmVuZHN0cmVhbQplbmRvYmoKNiAwIG9iago8PCAvVHlwZSAvUGFnZSAvUGFyZW50IDIgMCBSIC9NZWRpYUJveCBbMCAwIDYxMiA3OTJdIC9SZXNvdXJjZXMgPDwgL0ZvbnQgPDwgL0YxIDMgMCBSID4+ID4+IC9Db250ZW50cyA3IDAgUiA+PgplbmRvYmoKNyAwIG9iago8PCAvTGVuZ3RoIDkzID4+CnN0cmVhbQpCVCAvRjEgMTQgVGYgNjAgNzIwIFRkIChTZWd1bmRhIHBhZ2luYTogbyBxdWljayBzb3J0IGVzY29saGUgdW0gcGl2byBlIGRpdmlkZSBhIGxpc3RhLikgVGogRVQKZW5kc3RyZWFtCmVuZG9iagp4cmVmCjAgOAowMDAwMDAwMDAwIDY1NTM1IGYgCjAwMDAwMDAwMDkgMDAwMDAgbiAKMDAwMDAwMDA1OCAwMDAwMCBuIAowMDAwMDAwMTIxIDAwMDAwIG4gCjAwMDAwMDAxOTEgMDAwMDAgbiAKMDAwMDAwMDMxNyAwMDAwMCBuIAowMDAwMDAwNDU5IDAwMDAwIG4gCjAwMDAwMDA1ODUgMDAwMDAgbiAKdHJhaWxlcgo8PCAvU2l6ZSA4IC9Sb290IDEgMCBSID4+CnN0YXJ0eHJlZgo3MjgKJSVFT0YK';
  // com limite de tempo: se o WebView travar carregando o pdf.js, o teste falha em 40 s em vez de pendurar o CI
  await js(`window.__avisos = []; if (!window.__toast0) { window.__toast0 = toast; toast = (t, ms) => { window.__avisos.push(t); window.__toast0(t, ms); }; } 1`);
  await js(`anexos = []; desenharChips(); Promise.race([adicionarArquivos([new File([Uint8Array.from(atob('${pdfB64}'), c => c.charCodeAt(0))], 'teste.pdf', { type: 'application/pdf' })]), new Promise(r => setTimeout(r, 40000))])`);
  const a = await js(`anexos.map(x => ({ paginas: x.paginas, texto: x.conteudo }))`);
  const motivo = a.length ? '' : (await js(`Promise.race([carregarPdfjs().then(() => 'biblioteca carregou; a extração falhou', e => 'biblioteca: ' + e.message), new Promise(r => setTimeout(() => r('biblioteca não respondeu em 30 s'), 30000))])`)) + ' · avisos: ' + JSON.stringify(await js('window.__avisos'));
  ok('PDF anexado vira texto (pdf.js no WebView, com os polyfills de Promise.try/Uint8Array)', a.length === 1 && a[0].paginas === 2 && /fotossintese/i.test(a[0].texto), a.length ? String(a[0].texto).slice(0, 100) : motivo);
  await js(`anexos = []; desenharChips(); 1`);
}
// apostila de 120 páginas com a memória pequena do celular: vão os trechos com a página certa e a resposta não é cortada
{
  const { documento } = (await import('node:module')).createRequire(import.meta.url)('./documento_longo.js');
  // só os pedidos de resposta (as sugestões do fim, com esquema JSON, também passam por aqui)
  await js(`window.__pedidos = []; if (!window.__gerar0) { window.__gerar0 = PLATAFORMA.gerar; PLATAFORMA.gerar = (m, op, a, s) => { if (!op || !op.esquema) window.__pedidos.push(m); return window.__gerar0(m, op, a, s); }; } 1`);
  await js(`anexos = [{ nome: 'apostila.pdf', tam: 400000, lang: 'texto', conteudo: ${JSON.stringify(documento())}, paginas: 120 }]; desenharChips(); 1`);
  const m = await pergunta('Segundo a apostila, em que ano Vale Serrano foi fundada? Responda em uma frase.');
  const pedido = await js(`(() => { const p = window.__pedidos[window.__pedidos.length - 1]; const u = p[p.length - 1]; return typeof u.content === 'string' ? u.content : ''; })()`);
  ok('arquivo longo no celular: vai o trecho da página 52', /— página 52 —/.test(pedido), `${pedido.length} caracteres · memória ${await js('nCtx')}`);
  ok('arquivo longo no celular: resposta inteira (sem corte por tamanho)', !!(m && m.texto && !m.cortada && !m.erro), m && (m.texto || m.erro || '').slice(0, 100));
}
// aviso do sistema pela ponte (só aparece com o app em segundo plano; aqui basta a ponte aceitar)
ok('ponte aceita notificar', (await js(`PLATAFORMA.notificar('Própons IA', 'teste').then(() => 'ok', e => 'erro: ' + e.message)`)) === 'ok');
// ler em voz alta pela ponte (TextToSpeech do Android): botão presente e o sintetizador responde (fim ou erro sem travar)
ok('resposta tem o botão de ouvir', await js(`!!document.querySelector('.msg.ia .acao.ler')`));
const fala = await js(`new Promise(res => { let fim = false; PLATAFORMA.ao('fala', d => { if (d.id === 'tcel' && !fim && (d.estado === 'fim' || d.estado === 'erro')) { fim = true; res(d); } }); PLATAFORMA.falar('Teste de voz.', 'tcel').catch(e => res({ estado: 'erro', erro: e.message })); setTimeout(() => !fim && res({ estado: 'sem resposta' }), 15000); })`);
ok('sintetizador de voz responde pela ponte', fala && (fala.estado === 'fim' || fala.estado === 'erro'), JSON.stringify(fala));
ok('histórico salvo (ponte Android)', (await js(`PLATAFORMA.carregar().then(s => JSON.parse(s).length)`)) >= 1);
const sis = await js(`PLATAFORMA.sistema()`);
ok('sistema pela ponte', sis && sis.ramTotal > 0 && Array.isArray(sis.modelos), sis && sis.so);
await js(`abrirConfig('diagnostico'); 1`); await espera(600);
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
ok('tela inicial com a saudação e uma frase', /^(Boa madrugada|Bom dia|Boa tarde|Boa noite), .+/.test(await js(`$('#boasvindas').innerText.trim()`)) && !(await js(`!!document.querySelector('[data-sug]')`)));
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
// arrastar a folha para baixo pela alça fecha
const arrastar = async (seletor, dist = 420) => {
  const r = await js(`(()=>{const e=document.querySelector('${seletor}').getBoundingClientRect();return {x:e.left+e.width/2,y:e.top+e.height/2}})()`);
  await toque('touchStart', r.x, r.y);
  for (let d = 20; d <= dist; d += 40) { await toque('touchMove', r.x, r.y + d); await espera(16); }
  await toque('touchEnd'); await espera(450);
};
await arrastar('.dlg.folha .dlg-topo');
ok('arrastar o menu para baixo fecha', !(await js(`!!document.querySelector('.dlg-fundo')`)));
await js(`menuConversa(document.querySelector('[data-menu]'), conversas[0].id); 1`); await espera(350);
await arrastar('.dlg.folha .dlg-topo', 40);
ok('arrastar só um pouco não fecha (volta)', await js(`!!document.querySelector('.dlg-fundo:not(.saindo)')`));
await js(`document.querySelector('.dlg-fundo [data-x]').click(); 1`); await espera(400);
ok('botão X fecha a folha', !(await js(`!!document.querySelector('.dlg-fundo')`)));
// ajustes: lista em tela cheia e subpáginas
await js(`abrirConfig(); 1`); await espera(500);
ok('ajustes sobem de baixo, só do tamanho do conteúdo', await js(`(()=>{const r=document.querySelector('.painel').getBoundingClientRect();return r.width>=innerWidth-1 && r.height>=innerHeight*0.3 && r.height<=innerHeight*0.85 && Math.abs(r.bottom-innerHeight)<2 && !document.querySelector('.painel').classList.contains('sub')})()`));
await foto('9-ajustes');
await arrastar('.p-arrastar');
ok('arrastar os ajustes para baixo fecha', !(await js(`!!document.querySelector('.painel-fundo')`)));
await js(`abrirConfig(); 1`); await espera(500);
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
fechar();
const falhas = resultados.filter(r => r[0] !== 'OK ').length;
console.log(falhas ? `${falhas} falha(s)` : 'todos os testes passaram');
process.exit(falhas ? 1 : 0);
