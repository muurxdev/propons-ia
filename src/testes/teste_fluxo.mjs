// Fluxos da conversa com uma IA de mentira (sem motor), na interface montada num navegador headless (como teste_folhas):
// fila de mensagens enquanto a IA responde, sugestões no fim, pergunta editada na bolha, Conhecimento e a caixa só de áudio.
// Uso: node src/testes/teste_fluxo.mjs [porta-cdp de um navegador headless com payload/interface/index.html]
import path from 'node:path';
import { conectar, espera, relatorio } from './cdp.mjs';
const { ok, resumo } = relatorio();
const porta = +(process.argv[2] || 9555);
const { js, cdp } = await conectar({ porta, filtro: u => /index.html/.test(u), timeoutMs: 20000 });
await cdp('Page.bringToFront', {}); await cdp('Emulation.setFocusEmulationEnabled', { enabled: true });
await cdp('Emulation.setDeviceMetricsOverride', { width: 1280, height: 820, deviceScaleFactor: 1, mobile: false });
await cdp('Page.navigate', { url: 'file:///' + path.resolve('payload/interface/index.html').replace(/\\/g, '/') }); await espera(2500);
const r = {};
// IA de mentira: responde em ~1,2 s; o pedido de sugestões devolve JSON
await js(`PLATAFORMA.saude = async () => true; online = true; window.__pedidos = []; PLATAFORMA.gerar = async (msgs, op, aoToken, sinal) => {
  window.__pedidos.push({ esquema: !!op.esquema, ultima: msgs[msgs.length - 1].content.slice(0, 60), sistema: msgs[msgs.length - 1].content.includes('CONHECIMENTO'), msgs: JSON.parse(JSON.stringify(msgs)) });
  if (op.esquema) { await new Promise(r => setTimeout(r, 200)); aoToken(JSON.stringify({ sugestoes: ['Me dá um exemplo', 'E na prática?', 'Faz um quiz'] })); return { fim: 'stop' }; }
  const partes = ['Resposta ', 'para: ', msgs[msgs.length - 1].content.replace(/^<contexto>[\\s\\S]*?<\\/contexto>\\s*/, '').slice(0, 30), '.'];   // o bloco de contexto do app não conta
  for (const p of partes) { if (sinal && sinal.aborted) throw Object.assign(new Error('x'), { name: 'AbortError' }); await new Promise(r => setTimeout(r, 300)); aoToken(p); }
  return { fim: 'stop' };
}; nova(); 1`);
await js(`$('#entrada').value = 'Primeira pergunta'; ajustar(); $('#enviar').click(); 1`); await espera(400);
r.gerandoBotao = await js(`$('#enviar').classList.contains('gerando')`);
await js(`$('#entrada').value = 'Segunda pergunta'; ajustar(); 1`);
r.botaoViraFila = await js(`!$('#enviar').classList.contains('gerando') && /terminar/.test($('#enviar').title)`);
await js(`$('#enviar').click(); 1`); await espera(200);
r.naFila = await js(`JSON.stringify({ fila: filaEnvio.length, bolha: !!document.querySelector('.msg.na-fila'), caixa: $('#entrada').value })`);
for (let i = 0; i < 40 && !(await js(`!geracao && filaEnvio.length === 0 && atual.msgs.length >= 4`)); i++) await espera(250);
await espera(1500);
r.ordem = await js(`JSON.stringify(atual.msgs.map(m => m.role[0] + ':' + m.texto.slice(0, 22)))`);
r.sugestoes = await js(`JSON.stringify({ msg: atual.msgs[atual.msgs.length - 1].sugestoes, tela: document.querySelectorAll('.sugestoes button').length })`);
// editar a primeira pergunta na bolha e reenviar
await js(`editarMensagem(atual.msgs[0]); 1`); await espera(300);
r.editorAberto = await js(`!!document.querySelector('.editor-msg textarea')`);
await js(`document.querySelector('.editor-msg textarea').value = 'Pergunta editada'; document.querySelector('.editor-msg [data-reenviar]').click(); 1`);
for (let i = 0; i < 30 && (await js('!!geracao || atual.msgs.length < 2')); i++) await espera(250);
await espera(400);
r.depoisDeEditar = await js(`JSON.stringify(atual.msgs.map(m => m.role[0] + ':' + m.texto.slice(0, 22)))`);
// conhecimento que combina entra no pedido e aparece na resposta
await js(`pref('conhecimentos', JSON.stringify([{ id: 'k1', nome: 'Redação nota 1000', quando: 'redação, ENEM', instrucoes: 'Siga as competências.', refs: [], ativo: true }])); $('#entrada').value = 'Corrija minha redação do ENEM'; ajustar(); $('#enviar').click(); 1`);
for (let i = 0; i < 30 && (await js('!!geracao')); i++) await espera(250);
await espera(400);
r.conhecimento = await js(`JSON.stringify({ tag: (document.querySelector('.msg.ia:last-of-type .usou-conh') || {}).textContent || null, noPedido: window.__pedidos.filter(p => !p.esquema).pop().sistema })`);
// gravando: a caixa vira só a barra de áudio
await js(`barraGravacao('gravando', '0:03'); 1`);
r.soAudio = await js(`JSON.stringify({ classe: $('#caixa').classList.contains('so-audio'), altura: $('#caixa').offsetHeight, entradaVisivel: $('#entrada').offsetHeight > 0 })`);
await js(`barraGravacao(null); pref('conhecimentos', ''); conversas = conversas.filter(c => c !== atual); nova(); 1`);
// ajustes que atravessam a abertura fria: vão no arquivo de conversas e voltam ao carregar
r.prefs = await js(`(async () => {
  let gravado = ''; const s0 = PLATAFORMA.salvar, c0 = PLATAFORMA.carregar;
  PLATAFORMA.salvar = t => { gravado = t; return Promise.resolve(true); };
  pref('tamanhoResposta', 'curtas'); salvar(true); await new Promise(r => setTimeout(r, 50));
  const tinha = JSON.parse(gravado).some(x => x.__prefs && x.__prefs.tamanhoResposta === 'curtas');
  localStorage.removeItem('tamanhoResposta');
  PLATAFORMA.carregar = () => Promise.resolve(gravado); await carregarHistorico();
  const voltou = pref('tamanhoResposta') === 'curtas', semItemFantasma = !conversas.some(c => c.__prefs);
  PLATAFORMA.salvar = s0; PLATAFORMA.carregar = c0; localStorage.removeItem('tamanhoResposta');
  return JSON.stringify({ tinha, voltou, semItemFantasma });
})()`);
// "Nova conversa" aberta enquanto outra responde: a mensagem cria a conversa dela e entra na fila (não some)
await js(`$('#entrada').value = 'Uma pergunta longa'; ajustar(); $('#enviar').click(); 1`); await espera(300);
await js(`nova(); $('#entrada').value = 'Outra conversa'; ajustar(); $('#enviar').click(); 1`); await espera(200);
r.filaNova = await js(`JSON.stringify({ fila: filaEnvio.length, titulo: atual && atual.titulo, caixa: $('#entrada').value })`);
for (let i = 0; i < 40 && !(await js(`!geracao && filaEnvio.length === 0`)); i++) await espera(250);
await espera(600);
r.filaNovaFim = await js(`JSON.stringify(atual.msgs.map(m => m.role[0] + ':' + m.texto.slice(0, 20)))`);
await js(`conversas = conversas.filter(c => !/Uma pergunta longa|Outra conversa/.test(c.titulo)); nova(); 1`);
// tela inicial com sugestões; "Me ensina" liga o tutor na conversa; "Estudar isto" vira flashcards
await js(`nova(); 1`); await espera(200);
r.inicio = await js(`document.querySelectorAll('#boasvindas .inicio-sug button').length`);
await js(`window.__sis = []; const g0 = PLATAFORMA.gerar; PLATAFORMA.gerar = (m, op, a, s) => { window.__sis.push({ tutor: /MODO "ME ENSINA"/.test(m[0].content), esquema: !!(op && op.esquema) }); return g0(m, op, a, s); }; definirModo('tutor'); $('#entrada').value = 'Equação do 2º grau'; ajustar(); $('#enviar').click(); 1`);
for (let i = 0; i < 40 && (await js('!!geracao')); i++) await espera(250);
await espera(500);
r.tutor = await js(`JSON.stringify({ conv: !!atual.tutor, noPedido: window.__sis.filter(x => !x.esquema).pop().tutor, chip: !!document.querySelector('#chips [data-rm-tutor]') })`);
await js(`atual.msgs[atual.msgs.length - 1].texto = 'Uma resposta longa o bastante para estudar: ' + 'a fotossíntese transforma luz em energia. '.repeat(4); abrir(atual.id); 1`); await espera(300);
await js(`document.querySelector('.msg.ia:last-of-type .acao[title="Estudar isto"]').click(); 1`); await espera(400);
await js(`[...document.querySelectorAll('.menu button, .dlg .op')].find(b => /flashcards/.test(b.textContent)).click(); 1`);
for (let i = 0; i < 40 && (await js('!!geracao')); i++) await espera(250);
await espera(400);
r.estudar = await js(`JSON.stringify({ modo: atual.msgs.filter(m => m.role === 'user').pop().modo, esquema: window.__sis.some(x => x.esquema) })`);
await js(`conversas = conversas.filter(c => c !== atual); nova(); 1`);
// o começo do pedido fica igual de uma resposta para a outra (o motor reaproveita o que já leu): texto de sistema
// igual e a pergunta anterior mandada igual, com a instrução curta dela (esforço) guardada junto
await js(`nova(); definirEsforco(idModeloAtual(), 'baixo'); window.__pedidos = []; $('#entrada').value = 'Quanto é dois mais dois?'; ajustar(); $('#enviar').click(); 1`);
for (let i = 0; i < 40 && (await js('!!geracao')); i++) await espera(250);
await espera(900);
await js(`window.__pedidos = window.__pedidos.filter(p => !p.esquema); $('#entrada').value = 'E três mais três?'; ajustar(); $('#enviar').click(); 1`);
for (let i = 0; i < 40 && (await js('!!geracao')); i++) await espera(250);
await espera(600);
r.prefixo = await js(`(() => { const p = window.__pedidos.filter(x => !x.esquema); const a = p[0].msgs, b = p[p.length - 1].msgs; return JSON.stringify({ n: p.length, sistemaIgual: a[0].content === b[0].content, perguntaIgual: a[1].content === b[1].content, temContexto: /^<contexto>/.test(b[b.length - 1].content), curtaGuardada: /direta e curta/.test(a[1].content) }); })()`);
await js(`definirEsforco(idModeloAtual(), 'auto'); conversas = conversas.filter(c => c !== atual); nova(); 1`);
// raciocínio que vaza para o texto ("… </think> Resposta") vai para a folha do raciocínio, não para a resposta
r.vazou = await js(`(async () => {
  const esperar = ms => new Promise(r => setTimeout(r, ms));
  nova(); const g0 = PLATAFORMA.gerar;
  PLATAFORMA.gerar = async (m, op, aoToken) => { for (const p of ['O contexto indica ', 'uma conta simples. ', '</think>', ' Resposta: 42.']) { await esperar(150); aoToken(p); } return { fim: 'stop' }; };
  $('#entrada').value = 'Quanto é 6 vezes 7?'; ajustar(); $('#enviar').click();
  for (let i = 0; i < 40 && (!atual || atual.msgs.length < 2 || geracao); i++) await esperar(200);
  await esperar(500);
  const m = atual.msgs[atual.msgs.length - 1], tela = document.querySelector('.msg.ia:last-of-type .txt').textContent;
  PLATAFORMA.gerar = g0; conversas = conversas.filter(c => c !== atual); nova();
  return JSON.stringify({ texto: m.texto, pensou: m.pensou || '', tela });
})()`);
// Área de código: JavaScript roda isolado (saída, erro, tempo esgotado, teclado); o agente edita só um trecho e busca
r.codigo = await js(`(async () => {
  const ok1 = await rodarNoWorker('const a = 2; console.log("soma", a + 3); console.log([1,2])', '');
  const erro = await rodarNoWorker('nao_existe()', '');
  const laco = await rodarNoWorker('while (true) {}', '');
  const tecl = await rodarNoWorker('const n = prompt(); console.log("oi " + n)', 'Ana');
  const semRede = await rodarNoWorker('console.log(typeof fetch)', '');
  // agente: arquivo interno, a IA de mentira manda "editar" com um trecho
  const p0 = pref('projeto'); pref('projeto', JSON.stringify({ arquivos: [{ nome: 'main.js', conteudo: 'function soma(a, b) {\\n  return a - b;\\n}\\nconsole.log(soma(2, 3));\\n', lang: 'javascript' }], aberto: 'main.js' }));
  const g0 = PLATAFORMA.gerar; let vez = 0;
  PLATAFORMA.gerar = async (m, op, aoToken) => { vez++; aoToken(JSON.stringify(vez === 1 ? { resposta: 'Vou procurar.', acoes: [{ tipo: 'buscar', arquivo: '*', texto: 'return a' }] } : { resposta: 'Corrigi o sinal.', acoes: [{ tipo: 'editar', arquivo: 'main.js', trechos: [{ procurar: 'return a - b;', trocar: 'return a + b;' }] }] })); return { fim: 'stop' }; };
  const o0 = online; online = true; acoesPendentes = [];
  await rodarAgente('corrija a soma', () => {}, null);
  const pend = acoesPendentes.map(a => ({ tipo: a.tipo, arquivo: a.arquivo, novo: a.conteudo }));
  const busca = await buscarNoProjeto('return a');
  PLATAFORMA.gerar = g0; online = o0; pref('projeto', p0 || ''); acoesPendentes = []; novaSessaoCodigo();
  return JSON.stringify({ ok1, erro: erro.codigo, laco: laco.esgotou, tecl: tecl.saida, semRede: semRede.saida, vezes: vez, pend, busca });
})()`);
// conversa por voz: a transcrição é enviada sozinha e, com a resposta pronta, a Própons volta a escutar
r.voz = await js(`(async () => {
  const esperar = ms => new Promise(r => setTimeout(r, ms));
  nova(); const ig = iniciarGravacao, tf = PLATAFORMA.temFala; let ouviu = 0;
  iniciarGravacao = () => { ouviu++; }; PLATAFORMA.temFala = false; modoVoz = true; desenharChips();
  const chip = !!document.querySelector('#chips [data-rm-voz]');
  $('#entrada').value = 'Pergunta falada'; vozTranscreveu();
  for (let i = 0; i < 40 && (!atual || atual.msgs.length < 2 || geracao); i++) await esperar(200);
  await esperar(900);
  const r = { chip, enviada: atual && atual.msgs[0] && atual.msgs[0].texto, escutouDeNovo: ouviu };
  modoVoz = false; iniciarGravacao = ig; PLATAFORMA.temFala = tf; desenharChips();
  conversas = conversas.filter(c => c !== atual); nova();
  return JSON.stringify(r);
})()`);
// cadeado: cria o PIN (duas vezes), trava, PIN errado treme, o certo abre
r.cadeado = await js(`(async () => {
  const esperar = ms => new Promise(r => setTimeout(r, ms));
  const sha = sha256('abc') === 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad';
  pref('cadeado', ''); localStorage.removeItem('cadeado');
  const toca = k => document.querySelector('.cadeado [data-k="' + k + '"]').click();
  let criado = null; telaPin('criar', p => { criado = p; if (p) { const sal = 'x'; pref('cadeado', JSON.stringify({ sal, hash: sha256(sal + ':' + p), quando: 'abrir' })); } });
  '2468'.split('').forEach(toca); document.querySelector('.cd-ok').click(); '2468'.split('').forEach(toca); document.querySelector('.cd-ok').click();
  await esperar(300);
  travarSePreciso(false); await esperar(100);
  const travou = !!document.querySelector('.cadeado');
  '1111'.split('').forEach(toca); document.querySelector('.cd-ok').click(); await esperar(50);
  const errado = document.querySelector('.cd-aviso').textContent;
  '2468'.split('').forEach(toca); await esperar(300);
  const abriu = !document.querySelector('.cadeado:not(.saindo)');
  pref('cadeado', ''); localStorage.removeItem('cadeado'); pref('cadeadoLivreAte', '');
  return JSON.stringify({ sha, criado, travou, errado, abriu });
})()`);
// gráfico de função: o cartão (desenhado pelo app) entra antes do texto e a IA recebe as raízes calculadas
await js(`nova(); window.__pedidos = []; $('#entrada').value = 'Faça o gráfico de f(x) = x^2 - 4'; ajustar(); $('#enviar').click(); 1`);
for (let i = 0; i < 40 && (await js('!!geracao')); i++) await espera(250);
await espera(500);
r.grafico = await js(`(() => { const d = [...document.querySelectorAll('.msg.ia')].pop(), p = window.__pedidos.filter(x => !x.esquema).pop(); const u = p.msgs[p.msgs.length - 1].content; return JSON.stringify({ ordem: [...d.children].map(x => x.className.split(' ')[0]), curva: !!d.querySelector('.gf-curva'), raizes: /x ≈ -2, x ≈ 2/.test(u), guardado: !!atual.msgs[atual.msgs.length - 1].grafico }); })()`);
await js(`conversas = conversas.filter(c => c !== atual); nova(); 1`);
// ordem da resposta (auditoria 1.26): "Pensou por" entra no topo assim que o texto começa e fica lá; no fim a versão
// pronta entra no lugar da que foi escrita (sem animar de novo); "Continuar" não apaga o raciocínio
await js(`nova(); definirEsforco(idModeloAtual(), 'alto'); window.__g0 = PLATAFORMA.gerar; PLATAFORMA.gerar = async (msgs, op, aoToken, sinal) => {
  if (op.esquema) return { fim: 'stop' };
  if (op.pensar && op.aoPensar) { op.aoPensar('Primeiro vejo o que foi pedido. '); await new Promise(r => setTimeout(r, 400)); op.aoPensar('Depois confiro.'); await new Promise(r => setTimeout(r, 300)); }
  for (const p of ['Primeira parte ', 'da resposta', ' continua aqui.']) { await new Promise(r => setTimeout(r, 350)); aoToken(p); }
  return { fim: op.continuar ? 'stop' : 'length' };
}; $('#entrada').value = 'Explique a fotossíntese com calma'; ajustar(); $('#enviar').click(); 1`);
for (let i = 0; i < 20 && !(await js(`!!document.querySelector('.msg.ia:last-of-type .txt .fixo, .msg.ia:last-of-type .txt .cauda') && /Primeira/.test(document.querySelector('.msg.ia:last-of-type .txt').textContent)`)); i++) await espera(150);
r.durante = await js(`(() => { const d = [...document.querySelectorAll('.msg.ia')].pop(); window.__elVivo = d; const k = [...d.children].map(x => x.className.split(' ')[0]); return JSON.stringify(k); })()`);
for (let i = 0; i < 40 && (await js('!!geracao')); i++) await espera(250);
await espera(400);
r.depois = await js(`(() => { const d = [...document.querySelectorAll('.msg.ia')].pop(); return JSON.stringify({ ordem: [...d.children].map(x => x.className.split(' ')[0]), semEntrada: d.classList.contains('sem-entrada'), velhoSaiu: !window.__elVivo.isConnected, pensou: !!atual.msgs[atual.msgs.length - 1].pensou }); })()`);
await js(`continuar(); 1`);
for (let i = 0; i < 40 && (await js('!!geracao')) ; i++) await espera(250);
await espera(400);
r.continuou = await js(`(() => { const m = atual.msgs[atual.msgs.length - 1], d = [...document.querySelectorAll('.msg.ia')].pop(); return JSON.stringify({ pensou: !!m.pensou, tempo: m.tempo, linha: !!d.querySelector('.ia-status .pensa-linha'), texto: m.texto.slice(-20), giroSolto: !!document.querySelector('.giro') }); })()`);
await js(`PLATAFORMA.gerar = window.__g0; definirEsforco(idModeloAtual(), 'auto'); conversas = conversas.filter(c => c !== atual); nova(); 1`);
const J = x => JSON.parse(x);
ok('raciocínio vazado ("… </think>") sai da resposta e vai para o raciocínio', (o => o.texto === 'Resposta: 42.' && /conta simples/.test(o.pensou) && !/think|contexto/.test(o.tela))(J(r.vazou)), r.vazou);
ok('Área de código: JavaScript roda isolado (saída, erro, laço parado, teclado, sem rede)', (o => o.ok1.saida === 'soma 5\n[1,2]' && o.ok1.codigo === 0 && o.erro === 1 && o.laco && o.tecl === 'oi Ana' && o.semRede === 'undefined')(J(r.codigo)), r.codigo.slice(0, 300));
ok('Área de código: o agente busca e depois edita só o trecho (a mudança espera para aplicar)', (o => o.vezes === 2 && o.pend.length === 1 && o.pend[0].tipo === 'escrever' && /return a \+ b;/.test(o.pend[0].novo) && /main\.js:2/.test(o.busca))(J(r.codigo)), JSON.stringify(J(r.codigo).pend) + ' ' + J(r.codigo).busca);
ok('conversa por voz: envia a fala sozinha e volta a escutar depois da resposta', (o => o.chip && o.enviada === 'Pergunta falada' && o.escutouDeNovo >= 1)(J(r.voz)), r.voz);
ok('cadeado: cria o PIN confirmando, trava, recusa o errado e abre com o certo', (o => o.sha && o.criado === '2468' && o.travou && /errado/.test(o.errado) && o.abriu)(J(r.cadeado)), r.cadeado);
ok('gráfico de função: cartão antes do texto, curva desenhada e raízes calculadas no pedido', (o => o.ordem.indexOf('grafico-card') >= 0 && o.ordem.indexOf('grafico-card') < o.ordem.indexOf('txt') && o.curva && o.raizes && o.guardado)(J(r.grafico)), r.grafico);
ok('o começo do pedido se repete igual na pergunta seguinte (sistema fixo, instrução curta guardada na pergunta)', (o => o.n >= 2 && o.sistemaIgual && o.perguntaIgual && o.temContexto && o.curtaGuardada)(J(r.prefixo)), r.prefixo);
ok('respondendo: "Pensou por" já no topo, o texto embaixo e o giro logo depois do texto', J(r.durante)[0] === 'ia-status' && J(r.durante).indexOf('txt') === 1 && J(r.durante)[2] === 'giro', r.durante);
ok('no fim: status, texto, nota, ações — a versão pronta entra no lugar (sem animar de novo)', (o => o.ordem[0] === 'ia-status' && o.ordem[1] === 'txt' && o.ordem.indexOf('nota') > 1 && o.ordem.indexOf('acoes') > o.ordem.indexOf('nota') && o.semEntrada && o.velhoSaiu && o.pensou)(J(r.depois)), r.depois);
ok('Continuar mantém o raciocínio e o tempo (e o giro some)', (o => o.pensou && o.tempo > 0 && o.linha && /continua aqui\.$/.test(o.texto) && !o.giroSolto)(J(r.continuou)), r.continuou);
ok('tela inicial com 4 sugestões para começar', r.inicio === 4, r.inicio);
ok('"Me ensina" liga o tutor na conversa, vai no pedido e mostra o chip', J(r.tutor).conv && J(r.tutor).noPedido && J(r.tutor).chip, r.tutor);
ok('"Estudar isto" → flashcards manda a resposta no modo flashcards (com esquema)', J(r.estudar).modo === 'flashcards' && J(r.estudar).esquema, r.estudar);
ok('ajustes vão no arquivo de conversas e voltam ao abrir (sem virar conversa)', J(r.prefs).tinha && J(r.prefs).voltou && J(r.prefs).semItemFantasma, r.prefs);
ok('mensagem mandada em "Nova conversa" durante uma resposta cria a conversa e entra na fila', J(r.filaNova).fila === 1 && J(r.filaNova).titulo === 'Outra conversa' && J(r.filaNova).caixa === '', r.filaNova);
ok('...e é respondida quando a outra termina', J(r.filaNovaFim).length === 2 && J(r.filaNovaFim)[0] === 'u:Outra conversa', r.filaNovaFim);
ok('respondendo, caixa vazia: o botão é parar', r.gerandoBotao);
ok('com texto na caixa, o botão manda para a fila', r.botaoViraFila);
ok('a mensagem entra na fila (bolha "na fila") e a caixa esvazia', J(r.naFila).fila === 1 && J(r.naFila).bolha && J(r.naFila).caixa === '', r.naFila);
ok('a da fila vai sozinha depois, na ordem certa', J(r.ordem).length === 4 && J(r.ordem)[2] === 'u:Segunda pergunta' && /Segunda/.test(J(r.ordem)[3]), r.ordem);
ok('no fim: três sugestões guardadas e na tela', J(r.sugestoes).tela === 3 && J(r.sugestoes).msg.length === 3, r.sugestoes);
ok('editar abre o campo na própria bolha', r.editorAberto);
ok('reenviar troca a pergunta e refaz a resposta', J(r.depoisDeEditar).length === 2 && J(r.depoisDeEditar)[0] === 'u:Pergunta editada' && /Pergunt/.test(J(r.depoisDeEditar)[1]), r.depoisDeEditar);
ok('Conhecimento que combina vai no pedido e aparece na resposta', J(r.conhecimento).noPedido && /Redação nota 1000/.test(J(r.conhecimento).tag || ''), r.conhecimento);
ok('gravando: a caixa vira só a barra de áudio', J(r.soAudio).classe && !J(r.soAudio).entradaVisivel && J(r.soAudio).altura < 90, r.soAudio);
resumo();
