// fotos das telas novas no PC (janela larga): menus flutuantes, diálogo, ajustes, gravação, digitação
import fs from 'node:fs';
import { spawn } from 'node:child_process';
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
ok('só o menu lateral flutua: cartão de 24 px com 12 px de margem; o chat continua reto', await js(`(() => { const l = getComputedStyle($('#lateral')), m = getComputedStyle(document.querySelector('main')); const r = $('#lateral').getBoundingClientRect(); return parseInt(l.borderRadius) >= 20 && parseInt(m.borderRadius) === 0 && r.left >= 10 && r.top >= 10 && /rgba\\(0, 0, 0, 0\\)|transparent/.test(m.backgroundColor) })()`));
ok('botão de apagar todas as conversas no rodapé do menu', await js(`!!$('#apagarConversas')`));
await js(`nova(); $('#lateral').classList.remove('fechada'); 1`); await espera(400);
// "+" vira menu flutuante ancorado
await js(`$('#anexar').click(); 1`); await espera(400);
ok('"+" abre menu flutuante (pop) no PC', await js(`!!document.querySelector('.dlg-fundo.pop .dlg')`));
ok('"+" no estilo Claude: 3 cartões + 3 linhas (Áudio, Biblioteca, Modos de estudo), X à esquerda e título no centro', await js(`document.querySelectorAll('.opcoes.cartoes button').length === 3 && document.querySelectorAll('.opcoes.linhas button').length === 3 && !!document.querySelector('.dlg.mais .dlg-topo.centro')`));
const rp = await js(`(()=>{const r=document.querySelector('.dlg-fundo.pop .dlg').getBoundingClientRect(), b=$('#anexar').getBoundingClientRect(); return {acima: r.bottom <= b.top + 2, x: Math.abs(r.left-b.left) < 40}})()`);
ok('menu abre para cima, alinhado ao botão', rp.acima && rp.x, JSON.stringify(rp));
await foto('p1-mais');
await js('fecharDialogo(); 1'); await espera(300);
await js(`$('#seletorModelo').click(); 1`); await espera(700);
ok('seletor tem a linha Esforço (Baixo/Médio/Alto)', await js(`!!document.querySelector('.dlg.modelos [data-esforco]')`));
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
await js(`$('#entrada').value='Explique em duas frases o que é um algoritmo.'; ajustar(); $('#enviar').click(); 1`);
// com a GPU a resposta curta sai em menos de 1 s: procura o cursor enquanto a geração está em andamento
let viuCursor = false; for (let i = 0; i < 60 && !viuCursor; i++) { await espera(50); viuCursor = await js(`!!document.querySelector('.digitando')`); }
await foto('p3-digitando');
ok('cursor de digitação enquanto responde', viuCursor);
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
// "microfone" determinístico: um WAV com fala (3º argumento) vira o MediaStream que o app grava; sem ele, microfone real
const wavArq = process.argv[4];
if (wavArq) await js(`window.__wavMic = 'data:audio/wav;base64,${fs.readFileSync(wavArq).toString('base64')}'; navigator.mediaDevices.getUserMedia = async () => { const ctx = new AudioContext(); const buf = await ctx.decodeAudioData(await (await fetch(window.__wavMic)).arrayBuffer()); const src = ctx.createBufferSource(); src.buffer = buf; src.loop = true; const dest = ctx.createMediaStreamDestination(); src.connect(dest); src.start(); return dest.stream; }; 1`);
const FALA = wavArq ? /transcri|teste|ol[áa]/i : /capital do brasil/i;
await js(`window.__avisos = []; if (!window.__toast0) { window.__toast0 = toast; toast = (t, ms) => { window.__avisos.push(t); window.__toast0(t, ms); }; } nova(); $('#entrada').value=''; $('#falar').click(); 1`);
await espera(11500); await foto('p7-gravando');
ok('barra de gravação: X · tempo · ondas · seta redonda (transcreve para a caixa, não envia)', await js(`!$('#cancelarGrav').disabled && !$('#pararGrav').disabled && getComputedStyle($('#pararGrav')).borderRadius === '50%' && !$('#enviarGrav')`));
await js(`$('#pararGrav').click(); 1`); await espera(700);
ok('transcrevendo: a barra continua (ondas paradas), "Transcrevendo" no lugar do tempo, seta com anel', await js(`$('#gravando').classList.contains('transcrevendo') && $('#tempoGrav').textContent === 'Transcrevendo' && !$('#onda').hidden && $('#pararGrav').disabled && $('#pararGrav').classList.contains('carregando')`));
await foto('p8-transcrevendo');
for (let i = 0; i < 200 && (await js('transcrevendo')); i++) await espera(200);
ok('depois de transcrever, o texto fica na caixa e NÃO é enviado', await js(`!geracao && !!$('#entrada').value && !(atual && atual.msgs.length)`));
ok('texto na caixa, sem aviso "Pronto"', FALA.test(await js(`$('#entrada').value`)) && !(await js('window.__avisos')).some(t => /Pronto/.test(t)), JSON.stringify([await js(`$('#entrada').value`), await js('window.__avisos')]));
await js(`$('#entrada').value=''; ajustar(); 1`);

// 1.16: cancelar a transcrição pelo X (grava 4 s com fala, para, cancela na hora)
await js(`window.__avisos = []; $('#falar').click(); 1`);
await espera(5000); await js(`$('#pararGrav').click(); 1`); await espera(300);
ok('transcrevendo: o X fica ativo (cancelar)', await js(`$('#gravando').classList.contains('transcrevendo') && !$('#cancelarGrav').disabled`));
await js(`$('#cancelarGrav').click(); 1`);
for (let i = 0; i < 100 && (await js('transcrevendo')); i++) await espera(100);
ok('cancelar encerra a transcrição e avisa', !(await js('transcrevendo')) && (await js('window.__avisos')).some(t => /cancelad/i.test(t)), JSON.stringify(await js('window.__avisos')));
await js(`$('#entrada').value=''; ajustar(); 1`);

// 1.16: diálogo com aria-modal, foco dentro e foco de volta ao fechar
await js(`$('#entrada').focus(); abrirEsforco(); 1`); await espera(250);
ok('diálogo: aria-modal e foco dentro', await js(`(()=>{const d=document.querySelector('.dlg-fundo:not(.saindo) .dlg'); return !!d && d.getAttribute('aria-modal')==='true' && d.contains(document.activeElement)})()`));
await js(`fecharDialogo(); 1`); await espera(400);
ok('diálogo: foco volta para a caixa ao fechar', (await js(`document.activeElement === $('#entrada')`)));
// 1.16: menu flutuante acompanha o botão depois de "resize"
await js(`abrirEsforco(); 1`); await espera(250);
const rr = await js(`(()=>{const f=document.querySelector('.dlg-fundo.pop:not(.saindo)'); const d=f.querySelector('.dlg'); d.style.left='0px'; dispatchEvent(new Event('resize')); const r=d.getBoundingClientRect(), b=$('#seletorModelo').getBoundingClientRect(); return { dx: Math.abs(r.left-b.left), pop: !!f._pop }})()`);
ok('menu flutuante reposicionado no resize', rr.pop && rr.dx < 40, JSON.stringify(rr));
await js(`fecharDialogo(); 1`); await espera(300);
// 1.16: rascunho por conversa
await js(`conversas.unshift({ id: 'testeB', titulo: 'B', criada: Date.now(), atualizada: Date.now(), msgs: [] }, { id: 'testeA', titulo: 'A', criada: Date.now(), atualizada: Date.now(), msgs: [] }); abrir('testeA'); $('#entrada').value = 'rascunho da A'; abrir('testeB'); 1`);
const r1 = await js(`$('#entrada').value`); await js(`abrir('testeA'); 1`); const r2 = await js(`$('#entrada').value`);
ok('rascunho fica na conversa (B vazia, A recupera)', r1 === '' && r2 === 'rascunho da A', JSON.stringify([r1, r2]));
await js(`conversas = conversas.filter(c => !/^teste[AB]$/.test(c.id)); nova(); $('#entrada').value=''; ajustar(); 1`);
// 1.18: ler em voz alta — botão em cada resposta (toca/para) e leitura automática enquanto a resposta chega
await js(`pref('lerRespostas', 'nao'); nova(); atual = { id: novoId(), titulo: 'Voz', criada: Date.now(), atualizada: Date.now(), msgs: [{ role: 'user', texto: 'x', llm: 'x' }, { role: 'assistant', texto: 'Primeira frase da resposta. Segunda frase, um pouco mais longa, para dar tempo. Terceira e última.', llm: '' }] }; conversas.unshift(atual); abrir(atual.id); 1`);
ok('resposta tem o botão de ouvir', await js(`!!document.querySelector('.msg.ia .acao.ler')`));
await js(`document.querySelector('.msg.ia .acao.ler').click(); 1`); await espera(900);
ok('ouvir: começa a falar e o botão vira "parar"', await js(`speechSynthesis.speaking && document.querySelector('.msg.ia .acao.ler').classList.contains('on') && !!falaAtual`));
await js(`document.querySelector('.msg.ia .acao.ler').click(); 1`); await espera(400);
ok('parar: silêncio e botão volta ao normal', await js(`!speechSynthesis.speaking && !document.querySelector('.msg.ia .acao.ler').classList.contains('on') && !falaAtual`));
await js(`pref('lerRespostas', 'sim'); window.__falas = []; window.__falar0 = window.__falar0 || PLATAFORMA.falar; PLATAFORMA.falar = (t, id) => { window.__falas.push(t); return window.__falar0(t, id); }; (()=>{ nova(); const e=$('#entrada'); e.value='Explique em três frases curtas o que é a fotossíntese.'; ajustar(); $('#enviar').click(); })(); 1`);
let falouDurante = false; for (let i = 0; i < 240; i++) { await espera(250); if (!(await js('!!geracao'))) { if (i > 4) break; continue; } if (await js('window.__falas.length > 0 && speechSynthesis.speaking')) falouDurante = true; }
for (let i = 0; i < 120 && (await js('!!geracao')); i++) await espera(250);
ok('leitura automática: começa a falar enquanto a resposta ainda chega', falouDurante, JSON.stringify(await js('window.__falas')).slice(0, 160));
ok('leitura automática: frases inteiras, sem símbolos de Markdown', await js(`window.__falas.length > 0 && window.__falas.every(f => !/[*#\`]/.test(f))`), await js('window.__falas.length'));
await js(`pararLeitura(); pref('lerRespostas', 'nao'); PLATAFORMA.falar = window.__falar0; conversas = conversas.filter(c => c.titulo !== 'Voz'); nova(); 1`);
// 1.19: PDF e DOCX anexados viram texto (pdf.js / mammoth embutidos, carregados na hora)
{
  const pdfB64 = fs.readFileSync(`${saida}/../teste.pdf`).toString('base64'), docxB64 = fs.readFileSync(`${saida}/../teste.docx`).toString('base64');
  await js(`nova(); anexos = []; desenharChips(); window.__b64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0)); 1`);
  const t0 = Date.now();
  await js(`adicionarArquivos([new File([window.__b64('${pdfB64}')], 'teste.pdf', { type: 'application/pdf' })])`);
  let a = await js(`anexos.map(x => ({ nome: x.nome, lang: x.lang, paginas: x.paginas, texto: x.conteudo }))`);
  ok('PDF anexado vira texto com as páginas', a.length === 1 && a[0].paginas === 2 && /fotossintese/i.test(a[0].texto) && /página 2/.test(a[0].texto) && /quick sort/i.test(a[0].texto), `${((Date.now() - t0) / 1000).toFixed(1)} s · ` + JSON.stringify(a[0] && a[0].texto).slice(0, 120));
  await js(`adicionarArquivos([new File([window.__b64('${docxB64}')], 'teste.docx')])`);
  a = await js(`anexos.map(x => ({ nome: x.nome, texto: x.conteudo }))`);
  ok('DOCX anexado vira texto', a.length === 2 && /mitocondria/i.test(a[1].texto) && /Segundo paragrafo/.test(a[1].texto), JSON.stringify(a[1] && a[1].texto).slice(0, 100));
  ok('chips mostram os dois documentos', (await js(`$('#chips').querySelectorAll('.chip').length`)) === 2);
  await js(`$('#entrada').value = 'Em uma frase: sobre o que fala o PDF?'; ajustar(); $('#enviar').click(); 1`);
  for (let i = 0; i < 40 && !(await js('!!geracao')); i++) await espera(250);
  for (let i = 0; i < 600 && (await js('!!geracao')); i++) await espera(250);
  const resp = await js(`atual.msgs[atual.msgs.length - 1].texto`);
  ok('a IA responde sobre o conteúdo do PDF', /fotoss[ií]ntese|planta|luz|energia/i.test(resp), resp.slice(0, 120));
}
// 1.19: modos de estudo — flashcards (JSON por gramática → cartões → baralho → revisão), quiz e correção de redação
{
  const CONTEUDO = 'A fotossíntese é o processo em que as plantas usam a luz do sol, água e gás carbônico para produzir glicose e oxigênio. Acontece nos cloroplastos, que contêm clorofila. A fase clara depende da luz e produz ATP; a fase escura (ciclo de Calvin) fixa o carbono.';
  const gerar = async (modo, texto) => {
    await js(`nova(); definirModo('${modo}'); $('#entrada').value = ${JSON.stringify(texto)}; ajustar(); $('#enviar').click(); 1`);
    for (let i = 0; i < 40 && !(await js('!!geracao')); i++) await espera(250);
    for (let i = 0; i < 960 && (await js('!!geracao')); i++) await espera(250);
    return js(`(() => { const m = atual.msgs[atual.msgs.length - 1]; return { modo: atual.msgs[atual.msgs.length - 2].modo, erro: m.erro || '', cartoes: (m.cartoes || []).length, quiz: m.quiz ? m.quiz.questoes.length : 0, redacao: m.redacao ? m.redacao.notas : null, texto: (m.texto || '').slice(0, 80) } })()`);
  };
  ok('"+" tem Modos de estudo', await js(`(()=>{ abrirMais(); const b = document.querySelector('.dlg [data-modos]'); const r = !!b; fecharDialogo(); return r })()`));
  await js(`definirModo('flashcards'); 1`);
  ok('modo ativo vira chip na caixa e muda o placeholder', await js(`!!document.querySelector('#chips .chip.modo') && /flashcards/i.test($('#entrada').placeholder)`));
  let r = await gerar('flashcards', CONTEUDO);
  ok('flashcards: pergunta guarda o modo e a resposta traz cartões', r.modo === 'flashcards' && r.cartoes >= 3 && !r.erro, JSON.stringify(r));
  ok('flashcards: chip do modo some depois de enviar', !(await js(`document.querySelector('#chips .chip.modo')`)));
  ok('flashcards: widget com os cartões e Markdown equivalente', (await js(`document.querySelectorAll('.msg.ia:last-child .fc').length`)) === r.cartoes && /Flashcards/.test(r.texto));
  await js(`document.querySelector('.msg.ia:last-child .fc').click(); 1`);
  ok('flashcards: tocar vira o cartão (mostra o verso)', await js(`document.querySelector('.msg.ia:last-child .fc').classList.contains('virado') && getComputedStyle(document.querySelector('.msg.ia:last-child .fc .fc-verso')).display !== 'none'`));
  await js(`pref('baralho', ''); document.querySelector('.msg.ia:last-child [data-fc="salvar"]').click(); 1`); await espera(300);
  ok('flashcards: guardar no baralho', (await js(`baralho().cartoes.length`)) === r.cartoes);
  await js(`abrirRevisao(); 1`); await espera(400);
  ok('revisão: abre com o primeiro cartão e "Mostrar resposta"', await js(`!!document.querySelector('.dlg.revisao .rv-frente') && !!document.querySelector('.dlg.revisao [data-rv="mostrar"]')`));
  await js(`document.querySelector('.dlg.revisao [data-rv="mostrar"]').click(); document.querySelector('.dlg.revisao [data-q="4"]').click(); 1`); await espera(200);
  const b1 = await js(`(() => { const b = baralho(); return { rev: b.revisoes, agendados: b.cartoes.filter(c => c.prox > Date.now() + 3600000).length, conta: document.querySelector('.dlg.revisao .rv-conta') && document.querySelector('.dlg.revisao .rv-conta').textContent } })()`);
  ok('revisão: "Bom" agenda o cartão para outro dia e passa ao próximo', b1.rev === 1 && b1.agendados === 1 && /^2 de/.test(b1.conta || ''), JSON.stringify(b1));
  await js(`fecharDialogo(); 1`); await espera(300);
  await js(`abrirConfig('estudo'); 1`); await espera(700);
  ok('ajustes → Estudo mostra o baralho e a revisão', await js(`/cart(ão|ões) no baralho/.test($('#corpoConfig').textContent) && !!$('#revisarHoje')`));
  await js(`fecharModal(true); 1`);
  r = await gerar('quiz', CONTEUDO);
  ok('quiz: questões com 4 alternativas', r.quiz >= 2 && !r.erro, JSON.stringify(r));
  const q0 = await js(`atual.msgs[atual.msgs.length - 1].quiz.questoes[0].correta`);
  await js(`document.querySelector('.msg.ia:last-child .qz[data-q="0"] .alt[data-a="${q0}"]').click(); 1`); await espera(200);
  ok('quiz: responder marca a certa e mostra a explicação', await js(`(()=>{ const q = document.querySelector('.msg.ia:last-child .qz[data-q="0"]'); return q.classList.contains('respondida') && q.querySelector('.alt.certa') && !q.querySelector('.qz-exp').hidden && /Acertou/.test(q.querySelector('.qz-exp').textContent) })()`));
  ok('quiz: resposta fica guardada na conversa', (await js(`atual.msgs[atual.msgs.length - 1].quiz.respostas[0]`)) === q0);
  r = await gerar('redacao', 'Tema: o impacto das redes sociais nos estudos. Redação: As redes sociais mudaram a forma como os jovens estudam. Por um lado, facilitam o acesso a conteúdos e grupos de estudo. Por outro, a distração constante reduz a concentração. Portanto, é preciso equilíbrio. O governo e as escolas devem promover educação digital, ensinando o uso consciente das redes, com campanhas e aulas, para que a tecnologia ajude em vez de atrapalhar.');
  ok('redação: 5 notas de 0 a 200 e widget com o total', r.redacao && r.redacao.length === 5 && r.redacao.every(n => n >= 0 && n <= 200) && !r.erro && (await js(`!!document.querySelector('.msg.ia:last-child .rd-total b')`)), JSON.stringify(r));
  await js(`definirModo(null); nova(); 1`);
}
// 1.19: organização (fixar, pastas, desfazer exclusão) e memória ("lembre que…")
{
  await js(`conversas.unshift({ id: 'orgA', titulo: 'Org A', criada: Date.now(), atualizada: Date.now(), msgs: [] }, { id: 'orgB', titulo: 'Org B', criada: Date.now(), atualizada: Date.now(), msgs: [] }); const a = conversas.find(c => c.id === 'orgA'); a.fixada = true; const b = conversas.find(c => c.id === 'orgB'); b.pasta = 'Biologia'; desenharLista(); 1`);
  const grupos = await js(`[...document.querySelectorAll('#lista .grupo')].map(g => g.textContent)`);
  ok('lista: "Fixadas" primeiro e a pasta como grupo', grupos[0] === 'Fixadas' && grupos.some(g => /Biologia/.test(g)), JSON.stringify(grupos));
  await js(`window.__avisos = []; apagar('orgB'); 1`); await espera(200);
  ok('apagar mostra "Desfazer"', await js(`!!document.querySelector('.toast.acao-toast button') && !conversas.some(c => c.id === 'orgB')`));
  await js(`document.querySelector('.toast.acao-toast button').click(); 1`); await espera(200);
  ok('desfazer devolve a conversa (com a pasta)', await js(`(()=>{ const c = conversas.find(c => c.id === 'orgB'); return !!c && c.pasta === 'Biologia' })()`));
  await js(`conversas = conversas.filter(c => !/^org[AB]$/.test(c.id)); nova(); pref('memoria', ''); 1`);
  await js(`(()=>{ const e=$('#entrada'); e.value='lembre que eu estou no 3º ano e vou fazer o ENEM'; ajustar(); $('#enviar').click(); })(); 1`); await espera(400);
  const mem = await js(`({ mem: memoria(), ultima: atual.msgs[atual.msgs.length - 1].texto, gerou: !!geracao })`);
  ok('"lembre que…" guarda na memória e responde sem a IA', mem.mem.length === 1 && /3º ano/.test(mem.mem[0]) && /Anotado/.test(mem.ultima) && !mem.gerou, JSON.stringify(mem));
  ok('a memória entra no texto de sistema', /3º ano/.test(await js(`textoMemoria()`)));
  await js(`(()=>{ const e=$('#entrada'); e.value='esqueça o ENEM'; ajustar(); $('#enviar').click(); })(); 1`); await espera(400);
  ok('"esqueça…" apaga o item', (await js(`memoria().length`)) === 0);
  await js(`abrirConfig('memoria'); 1`); await espera(600);
  ok('ajustes → Memória com campo para adicionar', await js(`!!$('#memNovo') && !!$('#memAdd')`));
  await js(`$('#memNovo').value = 'prefiro exemplos com Python'; $('#memAdd').click(); 1`); await espera(200);
  ok('adicionar pela tela', (await js(`memoria()`))[0] === 'prefiro exemplos com Python');
  await js(`fecharModal(true); pref('memoria', ''); nova(); 1`);
}
// 1.19: editar qualquer pergunta, gerar de novo a partir de qualquer resposta e ramificar
{
  await js(`atual = { id: 'edit1', titulo: 'Edição', criada: Date.now(), atualizada: Date.now(), msgs: [
    { role: 'user', texto: 'Quanto é 2 + 2?', llm: 'Quanto é 2 + 2?' }, { role: 'assistant', texto: 'Quatro.', llm: 'Quatro.' },
    { role: 'user', texto: 'E 3 + 3?', llm: 'E 3 + 3?' }, { role: 'assistant', texto: 'Seis.', llm: 'Seis.' } ] }; conversas.unshift(atual); abrir('edit1'); 1`);
  ok('todas as perguntas têm "editar" e todas as respostas têm "gerar de novo"', (await js(`document.querySelectorAll('.msg.eu .acoes.editar').length`)) === 2 && (await js(`document.querySelectorAll('.msg.ia .acao.recarregar').length`)) === 2 && (await js(`document.querySelectorAll('.msg.ia .acao.ramificar').length`)) === 1);
  await js(`document.querySelector('.msg.ia .acao.ramificar').click(); 1`); await espera(200);
  ok('ramificar cria uma conversa nova com as mensagens até ali', await js(`atual.id !== 'edit1' && /^Ramo:/.test(atual.titulo) && atual.msgs.length === 2 && conversas.find(c => c.id === 'edit1').msgs.length === 4`));
  await js(`conversas = conversas.filter(c => c.id === 'edit1' || !/^Ramo:/.test(c.titulo)); abrir('edit1'); document.querySelectorAll('.msg.eu .acoes.editar button')[1].click(); 1`); await espera(200);
  ok('editar a primeira pergunta põe o texto na caixa em modo de edição', (await js(`$('#entrada').value`)) === 'Quanto é 2 + 2?' && (await js(`editando && editandoIdx === 0`)));
  await js(`$('#entrada').value = 'Quanto é 5 + 5? Responda só o número.'; ajustar(); $('#enviar').click(); 1`);
  for (let i = 0; i < 40 && !(await js('!!geracao')); i++) await espera(250);
  for (let i = 0; i < 400 && (await js('!!geracao')); i++) await espera(250);
  const ed = await js(`({ n: atual.msgs.length, p: atual.msgs[0].texto, r: atual.msgs[1].texto })`);
  ok('reenviar refaz a conversa a partir da pergunta editada', ed.n === 2 && /5 \+ 5/.test(ed.p) && /10|dez/i.test(ed.r), JSON.stringify(ed));
  await js(`conversas = conversas.filter(c => c.id !== 'edit1'); nova(); 1`);
}
// 1.19: Esforço Alto = o modelo raciocina antes (thinking), com o raciocínio recolhível e gravado
{
  await js(`pref('esforco', 'alto'); atualizarSeletorModelo(); nova(); (()=>{ const e=$('#entrada'); e.value='Quanto é 17 vezes 23? Responda só o número.'; ajustar(); $('#enviar').click(); })(); 1`);
  let viuPensando = false; for (let i = 0; i < 60 && !viuPensando; i++) { await espera(250); viuPensando = await js(`!!document.querySelector('.msg.ia details.pensando')`); }
  for (let i = 0; i < 40 && !(await js('!!geracao')); i++) await espera(250);
  for (let i = 0; i < 960 && (await js('!!geracao')); i++) await espera(250);
  const pr = await js(`(() => { const m = atual.msgs[atual.msgs.length - 1]; return { pensou: (m.pensou || '').length, texto: m.texto.slice(0, 40), detalhe: !!document.querySelector('.msg.ia:last-child details.pensando'), fechado: !document.querySelector('.msg.ia:last-child details.pensando').open } })()`);
  ok('esforço Alto: bloco "Pensando…" aparece enquanto raciocina', viuPensando);
  ok('esforço Alto: raciocínio gravado e recolhido, resposta separada', pr.pensou > 50 && pr.detalhe && pr.fechado && !/Thinking|Process/.test(pr.texto), JSON.stringify(pr));
  console.log('     resposta (17 × 23):', pr.texto);
  await js(`pref('esforco', 'medio'); atualizarSeletorModelo(); nova(); 1`);
}
// 1.16: estado com prioridade (download por cima de rede; limpar só o download)
const est = await js(`(()=>{ estado('reconectando'); estado('baixando 10%'); const a=$('#estado').textContent; estado('', false, 'download'); const b=$('#estado').textContent; estado(''); return [a, b, $('#estado').hidden] })()`);
ok('estado: prioridade e limpeza por origem', est[0] === 'baixando 10%' && est[1] === 'reconectando' && est[2] === true, JSON.stringify(est));
ws.close();
const falhas = res.filter(x => !x).length;
console.log(falhas ? `${falhas} falha(s)` : 'todos os testes passaram'); process.exit(falhas ? 1 : 0);
