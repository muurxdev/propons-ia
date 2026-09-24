/* ---------------- telas do menu lateral (Área de código e Biblioteca) ----------------
   São telas de verdade: ocupam o lugar do chat (com a caixa de digitação escondida) e ficam listadas no menu lateral,
   abaixo da busca. Continuam ligadas ao chat: mandar um arquivo ou usar um item volta para a conversa com o anexo. */
// a Área de código é só do computador; no celular o menu lateral fica só com a Biblioteca
const TELAS = { ...(CELULAR ? {} : { codigo: { nome: 'Código', ico: 'codigo', conta: () => projeto().arquivos.length, render: (el) => telaCodigo(el) } }),
                biblioteca: { nome: 'Biblioteca', ico: 'biblioteca', conta: () => biblioteca.length, render: (el) => telaBiblioteca(el) } };
let telaAtual = '';
function desenharNavLateral() {
  const n = $('#latNav'); if (!n) return;
  n.innerHTML = Object.entries(TELAS).map(([k, t]) => { const q = t.conta();
    return `<button class="lat-link${telaAtual === k ? ' on' : ''}" data-tela="${k}" aria-current="${telaAtual === k}">${ICO[t.ico]}<span>${t.nome}</span>${q ? `<i>${q}</i>` : ''}</button>`; }).join('');
  n.querySelectorAll('[data-tela]').forEach(b => b.onclick = () => abrirTela(b.dataset.tela));
}
function abrirTela(nome) {
  if (!TELAS[nome]) return fecharTela();
  telaAtual = nome;
  $('#conversa').hidden = true; document.querySelector('.compor').hidden = true; $('#faixa').hidden = true;
  const el = $('#tela'); el.hidden = false;
  // sem botão de voltar nem título repetido (o cabeçalho já mostra o nome): cada tela põe o atalho da conversa na barra dela
  el.innerHTML = '<div class="tela-corpo"></div>';
  $('#tituloAtual').textContent = TELAS[nome].nome;
  TELAS[nome].render(el.querySelector('.tela-corpo'));
  el.scrollTop = 0;
  desenharNavLateral(); desenharLista();
  if (estreita()) fecharLateral();
}
function fecharTela() {
  if (!telaAtual) return false;
  telaAtual = ''; $('#tela').hidden = true; $('#tela').innerHTML = '';
  $('#conversa').hidden = false; document.querySelector('.compor').hidden = false; $('#faixa').hidden = !$('#faixa').innerHTML;
  $('#tituloAtual').textContent = atual ? atual.titulo : 'Própons IA';
  desenharNavLateral(); desenharLista(); rolar(true);
  return true;
}
// mexeu no que a tela mostra (arquivo novo, item na biblioteca): redesenha se ela estiver aberta
function atualizarTela(nome) { if (telaAtual && (!nome || telaAtual === nome)) TELAS[telaAtual].render($('#tela .tela-corpo')); desenharNavLateral(); }
// botão presente em toda tela: volta para a conversa (no celular o menu fica escondido)
const htmlVoltarConversa = () => `<button class="cod-chip chip-conversa" data-conversa title="Voltar para a conversa" aria-label="Voltar para a conversa">${ICO.conversas}<b>Conversa</b></button>`;
const ligarVoltarConversa = el => { const b = el.querySelector('[data-conversa]'); if (b) b.onclick = () => fecharTela(); };

