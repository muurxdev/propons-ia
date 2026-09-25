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
function interromperVoz() { pararLeitura(); clearInterval(vozEspera); setTimeout(escutarDeNovo, 200); }
