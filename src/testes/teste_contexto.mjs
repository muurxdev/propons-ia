// Teste no app real: arquivo longo por trechos, resumo por partes, contagem de tokens de verdade e a bolinha de contexto.
// Uso: node src/testes/teste_contexto.mjs <porta-cdp> <pasta-saida> [--rapido]   (--rapido pula o resumo por partes)
import { conectar, espera, relatorio } from './cdp.mjs';
const [porta = 9333, saida = 'dist/teste-contexto'] = process.argv.slice(2);
const rapido = process.argv.includes('--rapido');
const { ok, resumo } = relatorio();
const { js, foto, ate } = await conectar({ porta, saida });
if (!(await ate('online', 300000))) { ok('IA ligada', false); resumo(); }
console.log('   memória da IA:', await js('nCtx'), 'tokens · modelo:', await js(`$('#nomeModelo').textContent`));

// documento de 120 páginas com fatos no meio e no fim (o mesmo tipo do teste_busca.js)
await js(`(() => {
  const F = ['A revolução industrial transformou a produção e as relações de trabalho nas cidades europeias.',
    'Na biologia, a célula é a unidade básica da vida e realiza funções como respiração e síntese de proteínas.',
    'O estudo das funções do primeiro grau envolve coeficiente angular, coeficiente linear e gráficos.',
    'A redação dissertativa argumentativa exige tese clara, argumentos consistentes e proposta de intervenção.',
    'Em química, as ligações iônicas ocorrem entre metais e ametais pela transferência de elétrons.',
    'Na física, a segunda lei de Newton relaciona força resultante, massa e aceleração.'];
  const fatos = { 52: 'A cidade fictícia de Vale Serrano foi fundada em 1873 por tropeiros que cruzavam a serra.', 111: 'O poeta Eurico Valadares publicou o livro Marés de Ferro em 1932.' };
  const pags = []; for (let p = 1; p <= 120; p++) { const f = []; for (let i = 0; i < 14; i++) f.push(F[(p * 7 + i * 3) % F.length]); if (fatos[p]) f.splice(5, 0, fatos[p]); pags.push('— página ' + p + ' —\\n' + f.join(' ')); }
  window.__doc = pags.join('\\n\\n');
  // guarda o que vai para a IA em cada pedido
  window.__pedidos = []; const g = PLATAFORMA.gerar; PLATAFORMA.gerar = (m, op, a, s) => { if (!op || !op.esquema) window.__pedidos.push(m); return g(m, op, a, s); };   // sem os pedidos de sugestões
  return 1; })()`);

// 1) a bolinha está na caixa
await js('nova(); 1'); await espera(400);
ok('a caixa não tem mais a bolinha de contexto', await js(`!$('#medidorCtx')`));

// 2) pergunta sobre o meio do arquivo: vão os trechos com a página certa, não o começo
await js(`anexos = [{ nome: 'apostila.pdf', tam: 400000, lang: 'texto', conteudo: window.__doc, paginas: 120 }]; desenharChips(); $('#entrada').value = 'Em que ano Vale Serrano foi fundada?'; ajustar(); 1`);
await espera(400);
const antesAnexo = await js('pctUso(usoAgora())');
ok('bolinha não muda com anexo ainda não enviado (só quando a IA responde)', (await js('pctUso(usoAgora())')) === antesAnexo);
await js(`$('#enviar').click(); 1`);
await ate('!geracao && atual && atual.msgs.length >= 2', 240000);
const ult = await js('atual.msgs[atual.msgs.length - 1]');
const pedido = await js(`(() => { const m = window.__pedidos[window.__pedidos.length - 1]; const u = m[m.length - 1]; return typeof u.content === 'string' ? u.content : ''; })()`);
ok('o pedido leva a página 52 (o fato está no meio do arquivo)', /— página 52 —/.test(pedido) && /Vale Serrano/.test(pedido), pedido.length + ' caracteres');
ok('o pedido não leva o arquivo inteiro', pedido.length < (await js('window.__doc.length')) / 2);
ok('a resposta traz o ano certo (1873)', /1873/.test(ult.texto || ''), ult.texto);
const cu = await js('atual.ctxUso');
ok('depois da resposta a bolinha guarda o que foi enviado (com os trechos) e a resposta', !!cu && cu.anexos > 0 && cu.resposta > 0 && cu.total === (await js('nCtx')), JSON.stringify(cu));
await foto('c1-trechos');

// 3) pergunta seguinte, sem anexar de novo: o arquivo da conversa continua consultável
await js(`$('#entrada').value = 'E quem publicou Marés de Ferro?'; ajustar(); $('#enviar').click(); 1`);
await ate('!geracao && atual.msgs.length >= 4', 240000);
const ped2 = await js(`(() => { const m = window.__pedidos[window.__pedidos.length - 1]; return m[m.length - 1].content; })()`);
ok('arquivo enviado antes continua consultável (página 111 nos trechos)', /— página 111 —/.test(ped2));
ok('a resposta usa a página 111 (Eurico Valadares, 1932)', /Eurico|Valadares|1932/.test(await js('atual.msgs[atual.msgs.length - 1].texto')), await js('atual.msgs[atual.msgs.length - 1].texto'));

// 4) contagem de tokens: o que o app calculou bate com o prompt de verdade (apply-template + tokenize)
const cmp = await js(`(async () => {
  const base = location.protocol.startsWith('http') && location.hostname !== 'propons.local' ? '' : 'http://127.0.0.1:8765';
  const cab = { 'Content-Type': 'application/json', Authorization: 'Bearer ' + PLATAFORMA.chave };
  const difs = [];
  for (const c of conversas.filter(c => c.msgs.some(m => !m.interno && m.role === 'user')).slice(0, 20)) {
    const S = SYSTEM + textoMemoria() + textoResumo(c), h = montarHistorico(c, 1500, S);
    await medirTokens([S, ...textosDe(h)]);
    const h2 = montarHistorico(c, 1500, S), calc = h2.uso.sistema + h2.uso.historico + h2.uso.anexos;
    const t = await (await fetch(base + '/apply-template', { method: 'POST', headers: cab, body: JSON.stringify({ messages: [{ role: 'system', content: S }, ...h2.map(x => typeof x.content === 'string' ? x : { role: x.role, content: x.content.filter(p => p.type === 'text').map(p => p.text).join('\\n') })] }) })).json();
    const n = await PLATAFORMA.contarTokens(t.prompt);
    difs.push(Math.abs(calc - n) / n);
  }
  return { n: difs.length, pior: Math.max(...difs), media: difs.reduce((a, b) => a + b, 0) / difs.length };
})()`);
ok('orçamento calculado × prompt real em ' + cmp.n + ' conversas: diferença < 5 %', cmp.n >= 5 && cmp.pior < 0.05, `pior ${(cmp.pior * 100).toFixed(1)}% · média ${(cmp.media * 100).toFixed(1)}%`);

// 5) a folha "Contexto": as partes somam o total mostrado e há o botão de compactar
await js(`abrirFolhaContexto(); 1`); await espera(700);
const folha = await js(`(() => { const f = document.querySelector('.dlg.contexto'); if (!f) return null; const nums = [...f.querySelectorAll('.ctx-lista li:not(.res) b')].map(b => +b.textContent.replace(/\\D/g, '')); return { itens: [...f.querySelectorAll('.ctx-lista li span')].map(s => s.textContent), soma: nums.reduce((a, b) => a + b, 0), cab: nCtx, botao: !!f.querySelector('[data-compactar]'), consulta: /apostila.pdf continua consultável/.test(f.textContent) }; })()`);
ok('folha Contexto abre com as partes e diz que o arquivo continua consultável', !!folha && folha.itens.includes('Conversa') && folha.itens.includes('Livre') && folha.consulta, folha && folha.itens.join(', '));
ok('partes + livre = memória inteira da IA', folha && Math.abs(folha.soma - folha.cab) <= 2, folha && `${folha.soma} × ${folha.cab}`);
ok('botão "Compactar conversa"', folha && folha.botao);
await foto('c2-folha');
await js('fecharDialogo && fecharDialogo(); document.querySelectorAll(".dlg-fundo").forEach(f => f.remove()); 1');

// 6) compactar: as mensagens antigas viram um resumo e saem da memória (continuam na tela)
await js(`(() => { for (let i = 0; i < 4; i++) atual.msgs.push({ role: 'user', texto: 'Pergunta de enchimento ' + i + ' sobre fotossíntese.', llm: 'Pergunta de enchimento ' + i + ' sobre fotossíntese.' }, { role: 'assistant', texto: 'Resposta curta ' + i + ': a fotossíntese usa luz, água e gás carbônico.', llm: 'Resposta curta ' + i }); salvar(); abrir(atual.id); return 1; })()`);
const antes = await js('montarHistorico(atual, 1500, SYSTEM).length');
const deu = await js('compactarConversa(atual)');
ok('compactar gera o resumo', deu && (await js('!!atual.resumo')), await js('(atual.resumo || "").slice(0, 120)'));
ok('compactadas saem da memória da IA mas continuam na tela', (await js('montarHistorico(atual, 1500, SYSTEM).length')) < antes && (await js('document.querySelectorAll("#conversa .msg.eu").length')) >= 6);

// 6b) compactar sozinho: com a memória cheia, a resposta já está em andamento (botão parar) e mostra o passo
await js(`nova(); (() => { const c = { id: novoId(), titulo: 'Cheia', criada: Date.now(), atualizada: Date.now(), msgs: [] }; for (let i = 0; i < 8; i++) c.msgs.push({ role: 'user', texto: 'Pergunta longa ' + i + ' ' + 'sobre fotossíntese e respiração celular. '.repeat(40), llm: '' }, { role: 'assistant', texto: 'Resposta ' + i + ' ' + 'A fotossíntese transforma luz em energia química. '.repeat(40), llm: '' }); c.msgs.forEach(m => m.llm = m.texto); conversas.unshift(c); abrir(c.id); window.__nCtx0 = nCtx; nCtx = 4096; return 1; })()`);
await js(`$('#entrada').value = 'Resuma em uma frase o que conversamos.'; ajustar(); $('#enviar').click(); 1`);
let viuCompactar = false, ocupado = false;
for (let i = 0; i < 100 && !viuCompactar; i++) { await espera(100); viuCompactar = await js(`/Compactando a conversa/.test(((document.querySelector('.giro .trabalhando') || document.querySelector('.busca-passo')) || {}).textContent || '')`); if (viuCompactar) ocupado = await js('!!geracao'); }
ok('compactar sozinho: aparece o passo "Compactando a conversa" com a resposta em andamento', viuCompactar && ocupado);
await ate('!geracao', 300000, 500);
ok('compactar sozinho: conversa ganhou o resumo e a resposta saiu', await js(`!!atual.resumo && atual.msgs[atual.msgs.length - 1].role === 'assistant' && !!atual.msgs[atual.msgs.length - 1].texto`));
await js(`nCtx = window.__nCtx0; 1`);

// 7) resumo por partes ("resuma o arquivo"): lê o arquivo inteiro em blocos
if (!rapido) {
  await js(`nova(); anexos = [{ nome: 'apostila.pdf', tam: 400000, lang: 'texto', conteudo: window.__doc, paginas: 120 }]; desenharChips(); $('#entrada').value = 'Resuma o arquivo'; ajustar(); $('#enviar').click(); 1`);
  const viuPasso = await ate(`/Lendo apostila\\.pdf/.test((document.querySelector('.busca-passo') || {}).textContent || '')`, 60000, 200);
  ok('mostra o passo "Lendo apostila.pdf: páginas…"', viuPasso);
  await foto('c3-lendo');
  await ate('!geracao && atual.msgs.length >= 2', 900000, 1000);
  const partes = await js('(atual.msgs[0].anexos[0].resumos || []).length');
  ok('o arquivo foi resumido em várias partes', partes >= 2, partes + ' partes');
  const pr = await js(`(() => { const m = window.__pedidos[window.__pedidos.length - 1]; return m[m.length - 1].content; })()`);
  ok('a resposta final usa os resumos das partes', /Páginas \d+–\d+:/.test(pr));
  ok('resposta final não vazia', ((await js('atual.msgs[atual.msgs.length - 1].texto')) || '').length > 80);
  await foto('c4-resumo');
}
resumo();
