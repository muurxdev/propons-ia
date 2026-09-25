/* ---------------- motor: saúde contínua ---------------- */
let tVerificar = null;
async function verificar(imediato) {
  clearTimeout(tVerificar);
  const ok = await PLATAFORMA.saude();
  if (ok && !online) {
    online = true;
    if (!jaFicouOnline) setTimeout(responderPendente, 300);
    jaFicouOnline = true;
    try { const p = await PLATAFORMA.props(); const ctx = p && ((p.default_generation_settings && p.default_generation_settings.n_ctx) || p.n_ctx); if (ctx) { nCtx = ctx; atualizarMedidor(); } } catch (e) {}
    aquecer();
  } else if (!ok) {
    online = false;
    if (jaFicouOnline) estado('reconectando');
  }
  tVerificar = setTimeout(verificar, ok ? 5000 : 1500);
}
/* aquecer: o motor lê antes o texto de sistema e a conversa aberta, para a próxima resposta começar na hora.
   Também ao trocar de conversa (depois de um instante parado). Uma pergunta mandada no meio cancela o aquecimento. */
let aquecimento = null, tAquecer = 0;
async function aquecer() {
  if (!online || geracao || !PLATAFORMA.aquecer) return;
  pararAquecimento();
  const ctrl = new AbortController(); aquecimento = ctrl;
  const c = atual, sis = sistemaDaConversa(c);
  const hist = c && c.msgs.length ? montarHistorico(c, Math.min(1500, Math.floor(nCtx * 0.45)), sis) : [];
  try { await PLATAFORMA.aquecer([{ role: 'system', content: sis }, ...hist], ctrl.signal); } catch (e) {}
  if (aquecimento === ctrl) aquecimento = null;
  if (online) estado('');
}
function pararAquecimento() { clearTimeout(tAquecer); if (aquecimento) { aquecimento.abort(); aquecimento = null; } }
function aquecerDepois() { clearTimeout(tAquecer); tAquecer = setTimeout(aquecer, 1500); }

/* ---------------- início ---------------- */
aplicarTema(); aplicarFonte(); desenharNavLateral();
if (CELULAR) $('#entrada').enterKeyHint = 'enter';   // no celular Enter quebra linha (o botão de enviar é a seta); no PC, envia
nova();
if (!estreita()) abrirLateral();
(async () => {
  // primeira abertura: a tela de escolher o modelo vem antes de tudo (o chat abre depois, já com a IA ligada)
  if (!ESCOLHER) { try { SYSTEM = await PLATAFORMA.textoSistema(); separarSistema(); } catch (e) {} }
  if (!SYSTEM) SYSTEM = 'Você é a Própons IA, uma assistente de estudos. Responda em português do Brasil, de forma clara e correta.';
  travarSePreciso(true);   // cadeado: a tela do PIN antes das conversas aparecerem
  atualizarBotaoPesquisa();   // pesquisa ligada: o botão já aparece na caixa ao abrir
  await carregarHistorico();
  atualizarBotaoPesquisa();   // (e também quando o ajuste chegou no arquivo de conversas, vindo da outra página)
  travarSePreciso(true);   // (o cadeado pode ter vindo no arquivo de conversas, ligado na outra página)
  receberCompartilhado();   // abriu pelo "compartilhar" de outro app
  // volta para a conversa que estava aberta (sair do app, ou a IA ligar e a página recarregar, não joga numa nova)
  const aberta = conversas.find(c => c.aberta); if (aberta && !atual) abrir(aberta.id);
  lerSistema().then(atualizarSeletorModelo);
  if (ESCOLHER) {
    atualizarSeletorModelo(); setTimeout(avisoAutomatico, 4000);
    // o app fechou enquanto a IA ligava: a pergunta que ficou esperando nesta conversa é respondida sem pedir de novo
    const u = atual && atual.msgs[atual.msgs.length - 1];
    if (u && u.role === 'user' && u.pendente && MODELO_INICIAL && !escolhendoId) ligarInicial();
    return;
  }   // a IA liga na primeira mensagem
  verificar();
  // Linux: a transcrição existe se o pacote trouxe o whisper (sistema.json)
  if (PLATAFORMA.tipo === 'web') lerSistema().then(s => { if (s && s.temTranscricao) { PLATAFORMA.temTranscricao = true; if (!PLATAFORMA.urlTranscricao) PLATAFORMA.urlTranscricao = s.transcricaoUrl || ''; } });
  setTimeout(aquecerFolhas, 2500);
  setTimeout(avisoAutomatico, 4000);
  setInterval(avisoAutomatico, 6 * 3600 * 1000);
})();
