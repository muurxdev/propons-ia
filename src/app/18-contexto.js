/* ---------------- medidor de contexto: a bolinha ao lado do microfone ----------------
   Enche conforme a memória da IA (nCtx) vai sendo ocupada pela conversa: laranja acima de 70 %, vermelho acima de 90 %.
   Tocar abre a folha "Contexto" com cada parte. Os números saem da mesma montarHistorico que monta o que vai para a IA,
   então o que a bolinha mostra é o que a IA recebe. Na mesma folha, "Compactar conversa" troca as mensagens antigas
   por um resumo (elas continuam na tela, mas saem da memória da IA). */
const webPorConversa = new Map();   // tokens da última pesquisa na internet de cada conversa
function registrarUso(conv, uso, blocoWeb) {
  webPorConversa.set(conv.id, blocoWeb ? tokens(blocoWeb) : 0);
  atualizarMedidor();
}
const textoResumo = conv => conv && conv.resumo ? '\n\nResumo do começo desta conversa (as mensagens antigas foram compactadas e saíram da sua memória):\n' + conv.resumo : '';
function usoAgora() {
  const conv = atual, maxTk = Math.min(1500, Math.floor(nCtx * 0.45));
  const sistema = SYSTEM + textoMemoria() + textoPreferencias() + textoResumo(conv);
  const u = conv ? montarHistorico(conv, maxTk, sistema).uso
    : { total: nCtx, sistema: tokens(sistema), historico: 0, anexos: 0, reserva: maxTk + 300, omitidas: 0 };
  const memoria = textoMemoria() ? tokens(textoMemoria()) : 0, resumo = textoResumo(conv) ? tokens(textoResumo(conv)) : 0;
  const pesquisa = (conv && webPorConversa.get(conv.id)) || 0;
  const livre = Math.max(0, u.total - u.reserva - u.sistema - pesquisa - u.historico - u.anexos);
  // arquivos ainda na caixa: um arquivo longo nunca passa do que cabe (ele entra por trechos)
  const pendentes = Math.min(livre, anexos.reduce((s, a) => s + (a.tipo === 'imagem' ? TOKENS_FOTO : tokens(a.conteudo || '')), 0));
  return {
    total: u.total, reserva: u.reserva, omitidas: u.omitidas,
    partes: [
      ['Instruções da Própons', Math.max(0, u.sistema - memoria - resumo), 'p1'],
      ['Memória sobre você', memoria, 'p2'],
      ['Resumo da conversa compactada', resumo, 'p3'],
      ['Pesquisa na internet', pesquisa, 'p4'],
      ['Conversa', u.historico, 'p5'],
      ['Arquivos e fotos', u.anexos, 'p6'],
      ['Anexos ainda não enviados', pendentes, 'p7'],
    ],
    compactadas: conv ? conv.msgs.filter(m => m.compactada).length : 0,
    docs: conv ? [...new Set([].concat(...conv.msgs.filter(m => m.role === 'user').map(docsDe)).filter(a => a.conteudo.length > 1500).map(a => a.nome))] : [],
    compactaveis: conv ? conv.msgs.filter(m => !m.interno && !m.compactada).length - 4 : 0,
    medido: medidos.size > 0,
  };
}
const somaUso = u => u.partes.reduce((s, p) => s + p[1], 0);
const pctUso = u => Math.min(100, Math.round(100 * somaUso(u) / Math.max(1, u.total - u.reserva)));

let tMedidor = 0;
function atualizarMedidor() {
  clearTimeout(tMedidor);
  tMedidor = setTimeout(() => {
    const b = $('#medidorCtx'); if (!b) return;
    let u; try { u = usoAgora(); } catch (e) { return; }
    const p = pctUso(u);
    b.style.setProperty('--p', p);
    b.classList.toggle('alto', p >= 70 && p < 90); b.classList.toggle('cheio', p >= 90);
    b.title = `Contexto: ${p}% da memória da IA em uso`;
    b.setAttribute('aria-label', `Contexto: ${p}% da memória da IA em uso. Toque para ver os detalhes.`);
    const f = document.querySelector('.dlg.contexto'); if (f) desenharFolhaContexto(f);
  }, 120);
}

const milhar = n => Math.round(n).toLocaleString('pt-BR');
function desenharFolhaContexto(folha) {
  const u = usoAgora(), soma = somaUso(u), p = pctUso(u), cab = u.total - u.reserva;
  const visiveis = u.partes.filter(x => x[1] > 0);
  folha.querySelector('.ctx').innerHTML = `
    <div class="ctx-num"><b>${p}%</b><span>${milhar(soma)} de ${milhar(cab)} tokens para a conversa</span></div>
    <div class="ctx-barra" role="img" aria-label="${p}% em uso">${visiveis.map(x => `<i class="${x[2]}" style="width:${(100 * x[1] / Math.max(1, cab)).toFixed(2)}%"></i>`).join('')}</div>
    <ul class="ctx-lista">
      ${visiveis.map(x => `<li><i class="${x[2]}"></i><span>${x[0]}</span><b>${milhar(x[1])}</b></li>`).join('')}
      <li><i class="livre"></i><span>Livre</span><b>${milhar(Math.max(0, cab - soma))}</b></li>
      <li class="res"><i class="reserva"></i><span>Guardado para a resposta</span><b>${milhar(u.reserva)}</b></li>
    </ul>
    <p class="info ctx-total">Memória da IA neste aparelho: ${milhar(u.total)} tokens${u.medido ? ', contados pelo próprio modelo' : ' (estimativa)'}.</p>
    ${u.omitidas ? `<p class="info">${u.omitidas === 1 ? '1 mensagem antiga já ficou' : u.omitidas + ' mensagens antigas já ficaram'} de fora: a IA não ${u.omitidas === 1 ? 'a' : 'as'} vê mais. Compacte a conversa para ela lembrar do essencial.</p>` : ''}
    ${u.compactadas ? `<p class="info">${u.compactadas} ${u.compactadas === 1 ? 'mensagem virou' : 'mensagens viraram'} um resumo curto (continuam na tela).</p>` : ''}
    ${u.docs.length || u.partes[6][1] ? `<p class="info">${u.docs.length ? esc(u.docs.join(', ')) + (u.docs.length === 1 ? ' continua consultável' : ' continuam consultáveis') + ': a' : 'Arquivo longo não entra inteiro: a'} cada pergunta vão só os trechos ligados a ela (ou o resumo por partes, se você pedir um resumo).</p>` : ''}
    <div class="ctx-acoes">
      <button class="btn primario" data-compactar ${u.compactaveis < 2 || !online || geracao ? 'disabled' : ''}>Compactar conversa</button>
      <button class="btn" data-nova>Nova conversa</button>
    </div>
    ${u.compactaveis < 2 ? '<p class="info">Compactar fica disponível quando a conversa tiver mais mensagens.</p>' : ''}`;
  const bc = folha.querySelector('[data-compactar]');
  bc.onclick = async () => { bc.disabled = true; bc.textContent = 'Compactando…'; await compactarConversa(atual); desenharFolhaContexto(folha); };
  folha.querySelector('[data-nova]').onclick = () => { const f = folha.parentNode; if (f && f.fechar) f.fechar(); nova(); };
}
function abrirFolhaContexto() {
  const f = document.createElement('div'); f.className = 'dlg-fundo';
  f.innerHTML = `<div class="dlg folha contexto">${topoCentro('Contexto', false)}<div class="ctx"></div></div>`;
  const folha = f.firstChild, sair = () => animarSaida(f, folha);
  f.fechar = sair; f.onclick = e => { if (e.target === f) sair(); }; folha.querySelector('[data-x]').onclick = sair;
  desenharFolhaContexto(folha);
  folhaArrastavel(f, folha, sair);
  pausarDesenho(); document.body.appendChild(f); posicionarPop(f, folha, $('#medidorCtx'));
}
$('#medidorCtx').onclick = abrirFolhaContexto;

// compactar: as mensagens antigas (todas menos as 4 últimas) viram um resumo que entra no texto de sistema
async function compactarConversa(conv, dentroDaResposta) {
  if (!conv) return false;
  if (geracao && !dentroDaResposta) { toast('Espere a resposta terminar para compactar.'); return false; }
  if (!online) { toast('A IA ainda está ligando. Tente de novo em instantes.'); return false; }
  const vivas = conv.msgs.filter(m => !m.interno && !m.compactada), velhas = vivas.slice(0, -4);
  if (velhas.length < 2) { toast('Ainda não há mensagens antigas para compactar.'); return false; }
  // o que cabe para resumir: as mais recentes das antigas, até ~60 % da memória
  let texto = velhas.map(m => (m.role === 'user' ? 'Pessoa: ' : 'Própons: ') + String(m.texto || '').slice(0, 1500)
    + (m.anexos && m.anexos.length ? `\n[arquivos: ${m.anexos.map(a => a.nome).join(', ')}]` : '')).join('\n');
  texto = texto.slice(-charsPara(texto, Math.floor(nCtx * 0.6)));
  estado('compactando a conversa');
  let r = '';
  try {
    await PLATAFORMA.gerar([{ role: 'system', content: 'Resuma em português do Brasil, em até 12 linhas, esta conversa de estudo: o assunto, o que a pessoa perguntou, as respostas e conclusões importantes e o que ficou pendente. Escreva só o resumo.' },
      { role: 'user', content: (conv.resumo ? 'Resumo anterior:\n' + conv.resumo + '\n\nDepois disso:\n' : '') + texto }],
      { temperatura: 0.2, exato: true, maxTokens: 600 }, t => { r += t; });
  } catch (e) { estado('', false, 'rede'); toast('Não deu para compactar agora: ' + e.message + '. Tente de novo.', 4000); return false; }
  estado('', false, 'rede');
  r = r.replace(/<think>[\s\S]*?(<\/think>|$)/g, '').trim();
  if (!r) { toast('A IA não devolveu o resumo. Tente de novo.'); return false; }
  conv.resumo = r.slice(0, 3000); velhas.forEach(m => { m.compactada = true; });
  conv.atualizada = Date.now(); salvar(); atualizarMedidor();
  toast(`Conversa compactada: ${velhas.length} mensagens viraram um resumo.`, 4000);
  return true;
}
