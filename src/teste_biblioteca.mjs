// Teste da Biblioteca da sessão no app real (CDP).
// Uso: node src/teste_biblioteca.mjs <porta-cdp> <pasta-saida> <foto.jpg> <fala.wav> [--depois-de-reabrir]
import fs from 'node:fs';
const [porta, saida, jpg, wav] = process.argv.slice(2);
const reaberto = process.argv.includes('--depois-de-reabrir');
fs.mkdirSync(saida, { recursive: true });
let alvos = [];
for (let i = 0; i < 60; i++) { try { alvos = await (await fetch(`http://127.0.0.1:${porta}/json`)).json(); if (alvos.some(a => /#k=/.test(a.url))) break; } catch (e) {} await new Promise(r => setTimeout(r, 1000)); }
const pag = alvos.find(a => /#k=/.test(a.url));
const ws = new WebSocket(pag.webSocketDebuggerUrl); await new Promise(r => ws.onopen = r);
let seq = 0; const pend = new Map();
ws.onmessage = e => { const m = JSON.parse(e.data); if (pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } };
const cdp = (method, params = {}) => new Promise(r => { const id = ++seq; pend.set(id, r); ws.send(JSON.stringify({ id, method, params })); });
const js = async e => { const r = await cdp('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true }); if (r.result?.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails).slice(0, 300)); return r.result?.result?.value; };
const foto = async n => { const r = await cdp('Page.captureScreenshot', { format: 'png' }); if (r.result) fs.writeFileSync(`${saida}/${n}.png`, Buffer.from(r.result.data, 'base64')); };
const espera = ms => new Promise(r => setTimeout(r, ms));
const res = []; const ok = (n, c, d = '') => { res.push(c); console.log(c ? '  ✔' : '  ✘', n, d ? '— ' + String(d).slice(0, 160) : ''); };
for (let i = 0; i < 300 && !(await js('online')); i++) await espera(500);
if (reaberto) {
  ok('depois de fechar e abrir, a biblioteca está vazia', (await js('biblioteca.length')) === 0);
  const t = await js('PLATAFORMA.carregar()');
  ok('nada da biblioteca foi gravado no arquivo de conversas', !/soma\.py|aula\.wav/.test(t) && !/[A-Za-z0-9+\/]{90000}/.test(t), `${t.length} bytes, sem soma.py, aula.wav nem foto em tamanho real`);
} else {
  await js(`nova(); biblioteca = []; anexos = []; desenharChips(); 1`);
  const b64 = fs.readFileSync(jpg).toString('base64'), w64 = fs.readFileSync(wav).toString('base64');
  await js(`(async()=>{ const b = await (await fetch('data:image/jpeg;base64,${b64}')).blob(); await adicionarArquivos([new File([b], 'conta.jpg', {type:'image/jpeg'}), new File(['def soma(a, b):\\n    return a + b\\n'], 'soma.py', {type:'text/plain'})]); return 1 })()`);
  await js(`(async()=>{ const b = await (await fetch('data:audio/wav;base64,${w64}')).blob(); await transcreverAudio(new File([b], 'aula.wav', {type:'audio/wav'})); return 1 })()`);
  ok('foto, arquivo e áudio entram na biblioteca', (await js(`biblioteca.map(i=>i.tipo).sort().join(',')`)) === 'arquivo,audio,imagem', await js(`biblioteca.map(i=>i.tipo+':'+i.nome).join(' | ')`));
  await js(`anexos = []; desenharChips(); $('#entrada').value=''; ajustar(); abrirMais(); 1`); await espera(700);
  ok('"+" mostra a Biblioteca com 3 itens', await js(`/3 itens/.test(document.querySelector('[data-op="biblioteca"]').innerText)`));
  await js(`document.querySelector('[data-op="biblioteca"]').click(); 1`); await espera(800);
  ok('biblioteca abre como tela, com a foto em miniatura e a lista', await js(`telaAtual === 'biblioteca' && !!document.querySelector('.bib-cart img') && document.querySelectorAll('.bib-linha').length === 2`));
  ok('o áudio traz a duração e cada item tem baixar', await js(`/[0-9]+:[0-9][0-9]/.test(document.querySelector('.bib-lista').textContent) && document.querySelectorAll('[data-baixar]').length >= 3`), await js(`document.querySelectorAll('[data-baixar]').length + ' com baixar · ' + document.querySelector('.bib-lista').textContent.replace(/[ ]+/g,' ').slice(0,70)`));
  await foto('b1-biblioteca');
  await js(`document.querySelector('[data-f="audio"]').click(); 1`); await espera(300);
  ok('filtro Áudios mostra só o áudio', await js(`document.querySelectorAll('.bib-linha').length === 1 && !document.querySelector('.bib-foto')`));
  await js(`document.querySelector('[data-f="todos"]').click(); 1`); await espera(300);
  // abre a foto e usa na mensagem
  await js(`document.querySelector('.bib-foto').click(); 1`); await espera(700);
  await foto('b2-ver-foto');
  await js(`document.querySelector('.bib-item [data-a="usar"]').click(); 1`); await espera(700);
  ok('"Usar na mensagem" põe a foto de novo na caixa', await js(`!!document.querySelector('#chips .chip.foto')`));
  // apaga o arquivo
  await js(`abrirBiblioteca(); 1`); await espera(700);
  await js(`[...document.querySelectorAll('.bib-abrir')].find(b=>/soma\\.py/.test(b.innerText)).click(); 1`); await espera(700);
  await js(`document.querySelector('.bib-item [data-a="apagar"]').click(); 1`); await espera(500);
  ok('apagar tira o item da biblioteca', (await js(`biblioteca.map(i=>i.nome).join(',')`)) === 'aula.wav,conta.jpg' || (await js('biblioteca.length')) === 2, await js(`biblioteca.map(i=>i.nome).join(',')`));
  await foto('b3-depois-de-apagar');
  await js(`fecharTela(); 1`);
}
ws.close();
const falhas = res.filter(x => !x).length;
console.log(falhas ? `${falhas} falha(s)` : 'todos os testes passaram'); process.exit(falhas ? 1 : 0);
