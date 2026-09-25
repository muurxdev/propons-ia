/* ---------------- "+": câmera, fotos, arquivos e modelo ---------------- */
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
      <button data-op="audio"${PLATAFORMA.temTranscricao ? '' : ' disabled'}><span class="oi">${ICO.microfone}</span><span class="pt"><b>Áudio</b><small>${PLATAFORMA.temTranscricao ? 'Transcrever uma gravação' : 'Indisponível neste aparelho'}</small></span>${ICO.seta}</button>
      <button data-op="pesquisa"><span class="oi">${ICO.globo}</span><span class="pt"><b>Pesquisar na internet</b><small>${pesquisaLigada() ? 'Ligada · suas perguntas vão para a busca pública' : 'Desligada · tudo continua no aparelho'}</small></span><span class="chave${pesquisaLigada() ? ' on' : ''}"></span></button>
      <button data-modos><span class="oi">${ICO.estudo}</span><span class="pt"><b>Modos de estudo</b><small>${modoAtivo ? 'Ativo: ' + MODOS[modoAtivo].nome : 'Flashcards, quiz, redação, resumo e revisão'}</small></span>${ICO.seta}</button>
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
  folha.querySelectorAll('[data-op]').forEach(b => b.onclick = async () => {
    const op = b.dataset.op; sair();
    // no celular a foto é do app de câmera do sistema (não pede permissão); no PC, a webcam pede ao abrir
    if (op === 'camera') { if (PLATAFORMA.tipo === 'android' || PLATAFORMA.tipo === 'ios') $('#camera').click(); else if (await garantirPermissao('camera')) abrirWebcam(); }
    else if (op === 'fotos') $('#fotos').click();
    else if (op === 'arquivos') $('#arquivo').click();
    else if (op === 'pesquisa') definirPesquisa(!pesquisaLigada());
    else if (op === 'audio') garantirVoz().then(ok => ok && $('#audio').click());
    else abrirConfig('modelo');
  });
  pausarDesenho();
  document.body.appendChild(f); posicionarPop(f, folha, $('#anexar'));
}
/* PC e tablet: a folha vira um menu flutuante ancorado no botão (abre para cima quando não cabe embaixo) */
function posicionarPop(f, folha, ancora, lado) {
  if (estreita() || !ancora) return;
  f.classList.add('pop'); f._pop = { folha, ancora, lado };
  folha.style.top = folha.style.bottom = '';
  const r = ancora.getBoundingClientRect(), w = folha.offsetWidth, h = folha.offsetHeight;
  const abaixo = innerHeight - r.bottom - 8, acima = r.top - 8, paraCima = abaixo < Math.min(h, 240) && acima > abaixo;
  // menus da caixa de mensagem (+, modelos, esforço, contexto): no meio da caixa, não colados no botão da esquerda
  const caixa = ancora.closest('.caixa'), c = caixa && caixa.getBoundingClientRect();
  const x = c ? c.left + (c.width - w) / 2 : lado === 'fim' ? r.right - w : r.left;
  const origem = c ? 'center' : 'left';
  folha.style.left = Math.max(8, Math.min(x, innerWidth - w - 8)) + 'px';
  if (paraCima) { folha.style.bottom = (innerHeight - r.top + 6) + 'px'; folha.style.transformOrigin = 'bottom ' + origem; }
  else { folha.style.top = (r.bottom + 6) + 'px'; folha.style.transformOrigin = 'top ' + origem; }
}
// janela redimensionada ou tablet girado: os menus flutuantes acompanham o botão
addEventListener('resize', () => { try { atualizarSeletorModelo(); } catch (e) {} });   // o nome do modelo é curto na tela estreita
addEventListener('resize', () => document.querySelectorAll('.dlg-fundo.pop:not(.saindo)').forEach(f => { if (f._pop) posicionarPop(f, f._pop.folha, f._pop.ancora, f._pop.lado); }));

