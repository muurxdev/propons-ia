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
  window.__pedidos.push({ esquema: !!op.esquema, ultima: msgs[msgs.length - 1].content.slice(0, 60), sistema: msgs[0].content.includes('CONHECIMENTO') });
  if (op.esquema) { await new Promise(r => setTimeout(r, 200)); aoToken(JSON.stringify({ sugestoes: ['Me dá um exemplo', 'E na prática?', 'Faz um quiz'] })); return { fim: 'stop' }; }
  const partes = ['Resposta ', 'para: ', msgs[msgs.length - 1].content.slice(0, 30), '.'];
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
const J = x => JSON.parse(x);
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
