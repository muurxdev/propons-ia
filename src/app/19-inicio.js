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
async function aquecer() {
  // processa o texto de sistema uma vez para a primeira resposta sair rápida
  try { await PLATAFORMA.gerar([{ role: 'system', content: SYSTEM }, { role: 'user', content: 'oi' }], { temperatura: 0, maxTokens: 1 }, () => {}); } catch (e) {}
  if (online) estado('');
}

/* ---------------- início ---------------- */
aplicarTema(); aplicarFonte(); desenharNavLateral();
if (CELULAR) $('#entrada').enterKeyHint = 'enter';   // no celular Enter quebra linha (o botão de enviar é a seta); no PC, envia
nova();
if (!estreita()) abrirLateral();
(async () => {
  // primeira abertura: a tela de escolher o modelo vem antes de tudo (o chat abre depois, já com a IA ligada)
  if (!ESCOLHER) { try { SYSTEM = await PLATAFORMA.textoSistema(); separarSistema(); } catch (e) {} }
  if (!SYSTEM) SYSTEM = 'Você é a Própons IA, uma assistente de estudos. Responda em português do Brasil, de forma clara e correta.';
  await carregarHistorico();
  lerSistema().then(atualizarSeletorModelo);
  if (ESCOLHER) { atualizarSeletorModelo(); setTimeout(avisoAutomatico, 4000); return; }   // a IA liga na primeira mensagem
  verificar();
  // Linux: a transcrição existe se o pacote trouxe o whisper (sistema.json)
  if (PLATAFORMA.tipo === 'web') lerSistema().then(s => { if (s && s.temTranscricao) { PLATAFORMA.temTranscricao = true; if (!PLATAFORMA.urlTranscricao) PLATAFORMA.urlTranscricao = s.transcricaoUrl || ''; } });
  setTimeout(aquecerFolhas, 2500);
  setTimeout(avisoAutomatico, 4000);
  setInterval(avisoAutomatico, 6 * 3600 * 1000);
})();
