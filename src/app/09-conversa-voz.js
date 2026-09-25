/* ---------------- conversa por voz (mãos livres) ----------------
   Liga pelo "+". A Própons escuta; quando você para de falar (1,4 s de silêncio), transcreve no aparelho e envia; lê a
   resposta em voz alta e volta a escutar. Tocar em "Interromper" corta a leitura e escuta de novo; o X na barra de
   gravação (ou o chip) desliga. Tudo offline: whisper para ouvir, a voz do aparelho para falar. */
ICO.conversaVoz = '<svg viewBox="0 0 24 24"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/><path d="M2 9v4M22 9v4"/></svg>';
let modoVoz = false, vozFalou = false, vozUltimaFala = 0, vozInicio = 0, vozEspera = 0;
const LIMIAR_FALA = 0.02, SILENCIO_FIM = 1400, SEM_FALA_MAX = 15000;
async function ligarModoVoz(sim) {
  if (sim && !(await garantirPermissao('microfone'))) return;
  if (sim && !(await garantirVoz())) return;
  modoVoz = !!sim; clearInterval(vozEspera);
  desenharChips();
  if (modoVoz) { toast('Conversa por voz: fale, e eu respondo em voz alta.', 3000); escutarDeNovo(); }
  else { if (gravacao) pararGravacao(false); pararLeitura(); }
}
function escutarDeNovo() {
  if (!modoVoz || gravacao || transcrevendo) return;
  vozFalou = false; vozUltimaFala = 0; vozInicio = Date.now();
  alvoTranscricao = null; iniciarGravacao();
}
// chamado a cada 50 ms enquanto grava: true quando é hora de parar (acabou de falar ou ficou mudo tempo demais)
function vigiarVoz(rms) {
  if (!modoVoz) return false;
  const agora = Date.now();
  if (rms > LIMIAR_FALA) { vozFalou = true; vozUltimaFala = agora; return false; }
  if (vozFalou && agora - vozUltimaFala > SILENCIO_FIM) { pararGravacao(true); return true; }
  if (!vozFalou && agora - vozInicio > SEM_FALA_MAX) { toast('Conversa por voz pausada (não ouvi nada). Toque no microfone para continuar.', 4000); ligarModoVoz(false); return true; }
  return false;
}
// transcreveu: manda sozinho
function vozTranscreveu() { if (modoVoz) setTimeout(() => { const t = $('#entrada').value.trim(); if (t) enviar(t); }, 150); }
// a resposta terminou: lê em voz alta e, quando acabar a leitura, escuta de novo
function vozDepoisDaResposta(msg) {
  if (!modoVoz) return;
  if (PLATAFORMA.temFala && msg && msg.texto && !falaAtual) lerMensagem(msg);
  clearInterval(vozEspera);
  vozEspera = setInterval(() => {
    if (!modoVoz) { clearInterval(vozEspera); return; }
    if (falaAtual || geracao) return;
    clearInterval(vozEspera); setTimeout(escutarDeNovo, 400);
  }, 250);
}
/* aula gravada (ou áudio longo mandado): o texto vira um arquivo anexado e a pessoa escolhe o que fazer com ele */
function folhaAula(texto, segundos, nomeArquivo) {
  const min = Math.max(1, Math.round(segundos / 60)), agora = new Date();
  const nome = (nomeArquivo ? String(nomeArquivo).replace(/\.[^.]+$/, '') : 'Aula ' + agora.toLocaleDateString('pt-BR').slice(0, 5).replace('/', '-') + ' ' + agora.toTimeString().slice(0, 5).replace(':', 'h')) + '.txt';
  const anexar = () => { anexos = anexos.filter(a => a.nome !== nome); anexos.push({ nome, tam: new Blob([texto]).size, lang: 'texto', conteudo: texto }); desenharChips(); ajustar(); };
  const opcoes = [['resumo', ICO.resumo, 'Resumir a aula', 'Os pontos principais, em tópicos'], ['flashcards', ICO.cartoes, 'Fazer flashcards', 'Cartões para revisar depois'],
    ['mapa', ICO.mapa, 'Mapa mental', 'As ideias da aula ligadas'], ...(PLATAFORMA.temFala ? [['podcast', ICO.podcast, 'Ouvir como podcast', 'Duas vozes revisando a aula']] : [])];
  const f = document.createElement('div'); f.className = 'dlg-fundo';
  f.innerHTML = `<div class="dlg folha">${topoCentro('Aula transcrita · ' + min + ' min')}
    <p class="info" style="margin:0 8px 10px">${esc(texto.slice(0, 220))}${texto.length > 220 ? '…' : ''}</p>
    <div class="opcoes linhas">${opcoes.map(([k, ico, t, s]) => `<button data-aula="${k}"><span class="oi">${ico}</span><span class="pt"><b>${t}</b><small>${s}</small></span>${ICO.seta}</button>`).join('')}
      <button data-aula="so"><span class="oi">${ICO.arquivo}</span><span class="pt"><b>Só anexar</b><small>Fica na mensagem para você perguntar o que quiser</small></span></button></div></div>`;
  const folha = f.firstChild, sair = () => animarSaida(f, folha);
  f.fechar = () => { sair(); anexar(); }; f.onclick = e => { if (e.target === f) f.fechar(); }; folha.querySelector('[data-x]').onclick = f.fechar;
  folhaArrastavel(f, folha, f.fechar);
  folha.querySelectorAll('[data-aula]').forEach(b => b.onclick = () => {
    sair(); anexar(); const k = b.dataset.aula;
    if (k === 'so') { toast('A aula está anexada: pergunte o que quiser sobre ela.'); $('#entrada').focus(); return; }
    definirModo(k); enviar('Esta é a transcrição da minha aula (' + min + ' min).');
  });
  pausarDesenho(); document.body.appendChild(f);
}
function interromperVoz() { pararLeitura(); clearInterval(vozEspera); setTimeout(escutarDeNovo, 200); }
