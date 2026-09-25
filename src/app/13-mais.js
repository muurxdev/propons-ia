/* ---------------- "+": câmera, fotos, arquivos, conhecimento, pesquisa e modos de estudo ---------------- */
function abrirMais() {
  const temVisao = PLATAFORMA.temVisao;
  const f = document.createElement('div'); f.className = 'dlg-fundo';
  f.innerHTML = `<div class="dlg folha mais">${topoCentro('Adicionar')}
    <div class="opcoes cartoes">
      <button data-op="camera"${temVisao ? '' : ' disabled'}><span class="oi">${ICO.camera}</span>Câmera</button>
      <button data-op="fotos"${temVisao ? '' : ' disabled'}><span class="oi">${ICO.foto}</span>Fotos</button>
      <button data-op="arquivos"><span class="oi">${ICO.arquivo}</span>Arquivos</button>
    </div>
    <div class="opcoes linhas">
      <button data-op="conhecimento"><span class="oi">${ICO.conhecimento}</span><span class="pt"><b>Conhecimento</b><small>${(n => n ? n + (n === 1 ? ' ligado' : ' ligados') + ' · a IA usa quando combina' : 'Ensine a IA a responder do seu jeito')(lerConhecimentos().filter(k => k.ativo !== false).length)}</small></span>${ICO.seta}</button>
      <button data-op="pesquisa"><span class="oi">${ICO.globo}</span><span class="pt"><b>Pesquisar na internet</b><small>${pesquisaLigada() ? 'Ligada · suas perguntas vão para a busca pública' : 'Desligada · tudo continua no aparelho'}</small></span><span class="chave${pesquisaLigada() ? ' on' : ''}"></span></button>
      ${PLATAFORMA.temTranscricao ? `<button data-voz><span class="oi">${ICO.conversaVoz}</span><span class="pt"><b>Conversa por voz</b><small>${modoVoz ? 'Ligada · toque para desligar' : 'Mãos livres: você fala, a IA responde em voz alta'}</small></span><span class="chave${modoVoz ? ' on' : ''}"></span></button>` : ''}
      <button data-modos><span class="oi">${ICO.estudo}</span><span class="pt"><b>Modos de estudo</b><small>${modoAtivo ? 'Ativo: ' + MODOS[modoAtivo].nome : 'Flashcards, quiz, mapa mental, plano e mais'}</small></span>${ICO.seta}</button>
    </div>
    ${temVisao ? '' : '<p class="info" style="margin:8px 8px 0">Neste aparelho a IA ainda não lê fotos.</p>'}</div>`;
  const folha = f.firstChild;
  $('#anexar').setAttribute('aria-expanded', 'true');
  const sair = () => { $('#anexar').setAttribute('aria-expanded', 'false'); animarSaida(f, folha); };
  f.fechar = sair;
  f.onclick = e => { if (e.target === f) sair(); };
  folha.querySelector('[data-x]').onclick = sair;
  folhaArrastavel(f, folha, sair);
  folha.querySelector('[data-modos]').onclick = () => { sair(); setTimeout(abrirModos, 160); };
  const bv = folha.querySelector('[data-voz]'); if (bv) bv.onclick = () => { sair(); ligarModoVoz(!modoVoz); };
  folha.querySelectorAll('[data-op]').forEach(b => b.onclick = async () => {
    const op = b.dataset.op; sair();
    // no celular a foto é do app de câmera do sistema (não pede permissão); no PC, a webcam pede ao abrir
    if (op === 'camera') { if (PLATAFORMA.tipo === 'android' || PLATAFORMA.tipo === 'ios') $('#camera').click(); else if (await garantirPermissao('camera')) abrirWebcam(); }
    else if (op === 'fotos') $('#fotos').click();
    else if (op === 'arquivos') $('#arquivo').click();
    else if (op === 'pesquisa') definirPesquisa(!pesquisaLigada());
    else if (op === 'conhecimento') setTimeout(abrirConhecimentos, 160);
  });
  pausarDesenho();
  document.body.appendChild(f); posicionarPop(f, folha, $('#anexar'));
}
/* PC e tablet: a folha vira um menu flutuante ancorado no botão (abre para cima quando não cabe embaixo) */
function posicionarPop(f, folha, ancora, lado) {
  if (estreita() || !ancora) return;
  f.classList.add('pop'); f._pop = { folha, ancora, lado };
  folha.style.top = folha.style.bottom = folha.style.maxHeight = '';
  const r = ancora.getBoundingClientRect(), w = folha.offsetWidth, h = folha.offsetHeight;
  // menus da caixa de mensagem (+, modelos, esforço, contexto): no meio da caixa, não colados no botão da esquerda
  const caixa = ancora.closest('.caixa'), c = caixa && caixa.getBoundingClientRect();
  const topoAncora = c ? c.top : r.top;
  const abaixo = innerHeight - r.bottom - 14, acima = topoAncora - 16, paraCima = abaixo < Math.min(h, 240) && acima > abaixo;
  const x = c ? c.left + (c.width - w) / 2 : lado === 'fim' ? r.right - w : r.left;
  const origem = c ? 'center' : 'left';
  folha.style.left = Math.max(8, Math.min(x, innerWidth - w - 8)) + 'px';
  // nunca passa da borda: o menu fica do tamanho do espaço que sobra e rola por dentro (celular deitado, janela baixa)
  folha.style.maxHeight = Math.max(160, Math.min(520, paraCima ? acima : abaixo)) + 'px';
  if (paraCima) { folha.style.bottom = (innerHeight - topoAncora + 8) + 'px'; folha.style.transformOrigin = 'bottom ' + origem; }
  else { folha.style.top = (r.bottom + 6) + 'px'; folha.style.transformOrigin = 'top ' + origem; }
  f._pop.conteudo = folha.scrollHeight;
  // conteúdo que chega depois (lista de modelos, resposta do Revisar): escolhe de novo o lado com mais espaço
  if (!folha._obsPop) {
    let pend = 0;
    const ver = () => { pend = 0; if (!f.isConnected || !f._pop || estreita() || Math.abs(folha.scrollHeight - f._pop.conteudo) < 8) return; posicionarPop(f, folha, f._pop.ancora, f._pop.lado); };
    folha._obsPop = new MutationObserver(() => { if (!pend) pend = requestAnimationFrame(ver); });
    folha._obsPop.observe(folha, { childList: true, subtree: true });
  }
}
// janela redimensionada ou tablet girado: os menus flutuantes acompanham o botão
addEventListener('resize', () => { try { atualizarSeletorModelo(); } catch (e) {} });   // o nome do modelo é curto na tela estreita
addEventListener('resize', () => document.querySelectorAll('.dlg-fundo.pop:not(.saindo)').forEach(f => { if (f._pop) posicionarPop(f, f._pop.folha, f._pop.ancora, f._pop.lado); }));

