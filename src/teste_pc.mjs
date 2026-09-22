// fotos das telas novas no PC (janela larga): menus flutuantes, diálogo, ajustes, gravação, digitação
import fs from 'node:fs';
const [porta, saida] = process.argv.slice(2);
fs.mkdirSync(saida, { recursive: true });
const a = (await (await fetch(`http://127.0.0.1:${porta}/json`)).json()).find(x => x.type === 'page');
const ws = new WebSocket(a.webSocketDebuggerUrl); await new Promise(r => ws.onopen = r);
let seq = 0; const pend = new Map();
ws.onmessage = e => { const m = JSON.parse(e.data); if (pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } };
const cdp = (method, params = {}) => new Promise(r => { const id = ++seq; pend.set(id, r); ws.send(JSON.stringify({ id, method, params })); });
const js = async e => { const r = await cdp('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true }); if (r.result?.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails).slice(0, 300)); return r.result?.result?.value; };
const foto = async n => { const r = await cdp('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(`${saida}/${n}.png`, Buffer.from(r.result.data, 'base64')); };
const espera = ms => new Promise(r => setTimeout(r, ms));
const res = []; const ok = (n, c, d = '') => { res.push(c); console.log(c ? '  ✔' : '  ✘', n, d ? '— ' + String(d).slice(0, 160) : ''); };
for (let i = 0; i < 300 && !(await js('online')); i++) await espera(500);
console.log('   janela:', await js('innerWidth + "x" + innerHeight'), '· estreita:', await js('estreita()'));
ok('sem texto de estado ao abrir', await js(`$('#estado').hidden`), await js(`$('#estado').textContent`));
await js('abrirLateral(); 1'); await espera(350);
ok('menu lateral e chat são cartões flutuantes da mesma cor, sobre um fundo mais escuro', await js(`(() => { const l = getComputedStyle($('#lateral')), m = getComputedStyle(document.querySelector('main')); return l.backgroundColor === m.backgroundColor && l.backgroundColor !== getComputedStyle(document.body).backgroundColor && parseInt(l.borderRadius) >= 20 && parseInt(m.borderRadius) >= 20 && $('#lateral').getBoundingClientRect().left >= 10 })()`));
await js(`nova(); $('#lateral').classList.remove('fechada'); 1`); await espera(400);
// "+" vira menu flutuante ancorado
await js(`$('#anexar').click(); 1`); await espera(400);
ok('"+" abre menu flutuante (pop) no PC', await js(`!!document.querySelector('.dlg-fundo.pop .dlg')`));
ok('"+" no estilo Claude: 3 cartões + 2 linhas, X à esquerda e título no centro', await js(`document.querySelectorAll('.opcoes.cartoes button').length === 3 && document.querySelectorAll('.opcoes.linhas button').length === 2 && !!document.querySelector('.dlg.mais .dlg-topo.centro')`));
const rp = await js(`(()=>{const r=document.querySelector('.dlg-fundo.pop .dlg').getBoundingClientRect(), b=$('#anexar').getBoundingClientRect(); return {acima: r.bottom <= b.top + 2, x: Math.abs(r.left-b.left) < 40}})()`);
ok('menu abre para cima, alinhado ao botão', rp.acima && rp.x, JSON.stringify(rp));
await foto('p1-mais');
await js('fecharDialogo(); 1'); await espera(300);
await js(`$('#seletorModelo').click(); 1`); await espera(700);
ok('seletor de modelo flutuante com os nomes novos', await js(`!!document.querySelector('.dlg-fundo.pop .dlg.modelos') && /Própons Lume/.test(document.querySelector('.dlg.modelos').innerText) && /Própons Aurora/.test(document.querySelector('.dlg.modelos').innerText)`), await js(`document.querySelector('.dlg.modelos').innerText.replace(/\\s+/g,' ').slice(0,120)`));
ok('sem ícones nos modelos', await js(`document.querySelectorAll('.dlg.modelos .mico').length === 0`));
await foto('p2-seletor');
// troca de modelo ao vivo: a linha mostra "ligando", depois "Em uso", e o nome ao lado do "+" muda sem fechar o menu
{
  const atualId = await js(`(sistemaCache.modelos.find(m => m.atual) || {}).id`);
  const outro = atualId === 'leve' ? 'normal' : 'leve';
  await js(`document.querySelector('.dlg.modelos [data-m="${outro}"]').click(); 1`); await espera(600);
  ok('ao tocar em Usar, a linha mostra "ligando"', await js(`!!document.querySelector('.dlg.modelos [data-m="${outro}"] .anel.girando')`));
  for (let i = 0; i < 120 && !(await js(`!!document.querySelector('.dlg.modelos [data-m="${outro}"] .st .check')`)); i++) await espera(500);
  ok('sem fechar o menu, o ✓ passa para o modelo novo', await js(`!!document.querySelector('.dlg.modelos [data-m="${outro}"] .st .check') && !document.querySelector('.dlg.modelos [data-m="${atualId}"] .st .check')`));
  ok('nome ao lado do "+" atualizou na hora', (await js(`$('#nomeModelo').textContent`)) === 'Própons ' + { leve: 'Lume', normal: 'Aurora', avancado: 'Ápice' }[outro], await js(`$('#nomeModelo').textContent`));
  await foto('p2b-trocou');
  for (let i = 0; i < 60 && !(await js('online')); i++) await espera(500);
  await js(`document.querySelector('.dlg.modelos [data-m="${atualId}"]').click(); 1`);
  for (let i = 0; i < 120 && !(await js(`online && !!document.querySelector('.dlg.modelos [data-m="${atualId}"] .st .check')`)); i++) await espera(500);
  ok('volta para o modelo de antes', (await js(`(sistemaCache.modelos.find(m => m.atual) || {}).id`)) === atualId);
}
await js('fecharDialogo(); 1'); await espera(300);
// menu da conversa (⋯) no PC é ancorado
await js(`$('#entrada').value='Diga apenas: olá'; ajustar(); $('#enviar').click(); 1`);
for (let i = 0; i < 20 && !(await js('!!geracao')); i++) await espera(200);
await espera(250); await foto('p3-digitando');
ok('cursor de digitação enquanto responde', await js(`!!document.querySelector('.digitando')`));
for (let i = 0; i < 300 && (await js('!!geracao')); i++) await espera(300);
await js(`document.querySelector('.item [data-menu]').click(); 1`); await espera(300);
ok('menu ⋯ da conversa é flutuante ao lado do botão', await js(`!!document.querySelector('.menu') && !document.querySelector('.dlg-fundo')`));
await foto('p4-menu-conversa');
await js('fecharMenus(); 1');
// diálogo de confirmação no centro
js(`confirmar('Apagar conversa?', 'Teste do diálogo no PC.', 'Apagar', true)`);
await espera(400);
const rd = await js(`(()=>{const r=document.querySelector('.dlg').getBoundingClientRect(); return {cx: Math.abs((r.left+r.right)/2 - innerWidth/2) < 20, cy: Math.abs((r.top+r.bottom)/2 - innerHeight/2) < 60, alca: !document.querySelector('.dlg .alca') || getComputedStyle(document.querySelector('.dlg .alca')).display==='none'}})()`);
ok('diálogo centralizado, sem alça', rd.cx && rd.cy && rd.alca, JSON.stringify(rd));
await foto('p5-dialogo');
await js('fecharDialogo(); 1'); await espera(300);
// ajustes: janela centralizada
await js(`abrirConfig('modelo'); 1`); await espera(600);
const rj = await js(`(()=>{const r=document.querySelector('.painel').getBoundingClientRect(); return {cy: Math.abs((r.top+r.bottom)/2 - innerHeight/2) < 40, nomes: /Própons Lume/.test(document.querySelector('.painel').innerText), icones: document.querySelectorAll('.painel .mcard .mico').length}})()`);
ok('ajustes numa janela centralizada, nomes novos, sem ícones', rj.cy && rj.nomes && rj.icones === 0, JSON.stringify(rj));
await foto('p6-ajustes');
await js('fecharModal(true); 1'); await espera(200);
// gravação: só "Gravando"/"Transcrevendo", sem porcentagens nem toast de "Pronto"
await js(`window.__avisos = []; if (!window.__toast0) { window.__toast0 = toast; toast = (t, ms) => { window.__avisos.push(t); window.__toast0(t, ms); }; } nova(); $('#entrada').value=''; $('#falar').click(); 1`);
await espera(11500); await foto('p7-gravando');
await js(`$('#pararGrav').click(); 1`); await espera(700);
ok('enquanto transcreve mostra só "Transcrevendo"', (await js(`$('#tempoGrav').textContent`)) === 'Transcrevendo' && (await js(`$('#gravando').classList.contains('transcrevendo')`)));
await foto('p8-transcrevendo');
for (let i = 0; i < 200 && (await js('transcrevendo')); i++) await espera(200);
ok('texto na caixa, sem aviso "Pronto"', /capital do brasil/i.test(await js(`$('#entrada').value`)) && !(await js('window.__avisos')).some(t => /Pronto/.test(t)), JSON.stringify([await js(`$('#entrada').value`), await js('window.__avisos')]));
await js(`$('#entrada').value=''; ajustar(); 1`);
ws.close();
const falhas = res.filter(x => !x).length;
console.log(falhas ? `${falhas} falha(s)` : 'todos os testes passaram'); process.exit(falhas ? 1 : 0);
