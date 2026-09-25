/* ---------------- entrada e atalhos ---------------- */
function ajustar() {
  const t = $('#entrada'); t.style.height = 'auto'; t.style.height = Math.min(t.scrollHeight, 200) + 'px';
  const tem = !!(t.value.trim() || anexos.length), b = $('#enviar');
  if (!geracao) { b.disabled = !tem; return; }
  // respondendo: com texto na caixa o botão manda para a fila; vazia, para a resposta
  b.disabled = false; b.classList.toggle('gerando', !tem); b.title = tem ? 'Mandar quando esta resposta terminar' : 'Parar'; b.setAttribute('aria-label', b.title);
}
$('#entrada').addEventListener('input', ajustar);
$('#entrada').addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey && !e.isComposing && e.keyCode !== 229 && enterEnvia()) { e.preventDefault(); enviar($('#entrada').value); }
  if (e.key === 'ArrowUp' && !$('#entrada').value && atual) { e.preventDefault(); editarUltima(); }
});
$('#enviar').onclick = () => { if (geracao && !$('#entrada').value.trim() && !anexos.length) geracao.ctrl.abort(); else enviar($('#entrada').value); };
// ⋯ no topo: nova conversa e o que dá para fazer com a conversa aberta (renomear, fixar, pasta, exportar, apagar)
$('#menuTopo').onclick = e => { e.stopPropagation(); if (atual) menuConversa($('#menuTopo'), atual.id, true); else menuFlutuante($('#menuTopo'), [[ICO.editar, 'Nova conversa', nova]], 'Própons IA'); }; $('#novaLat').onclick = () => { nova(); if (estreita()) fecharLateral(); };
const estreita = () => innerWidth <= 760;
function abrirLateral() { pausarDesenho(260); $('#lateral').classList.remove('fechada'); }
function fecharLateral() { if (!$('#lateral').classList.contains('fechada')) pausarDesenho(260); $('#lateral').classList.add('fechada'); }
$('#abrirLat').onclick = () => $('#lateral').classList.toggle('fechada');
$('#fundo').onclick = fecharLateral;
document.addEventListener('keydown', e => {
  const k = (e.key || '').toLowerCase();
  if (e.ctrlKey && k === 'b') { e.preventDefault(); $('#lateral').classList.toggle('fechada'); }
  if (e.ctrlKey && e.shiftKey && k === 'o') { e.preventDefault(); nova(); }
  if (e.ctrlKey && k === 'k') { e.preventDefault(); abrirLateral(); $('#busca').focus(); }
  if (e.ctrlKey && k === ',') { e.preventDefault(); abrirConfig(); }
  if (e.key === 'Escape') { if (!fecharDialogo()) { if (document.querySelector('.painel-fundo:not(.saindo)')) voltarPainel(); else if (!fecharTela() && estreita()) fecharLateral(); } fecharMenus(); }
});
// celular: botão voltar fecha, nesta ordem, o diálogo, a subpágina dos ajustes, os ajustes e a gaveta
window.__proponsVoltar = () => {
  if (fecharDialogo()) return true;
  if (fecharTela()) return true;
  if (gravacao) { pararGravacao(true); return true; }   // não joga fora uma aula gravada por um toque em Voltar
  if (cancelarTranscricao) return true;                 // transcrevendo: Voltar não cancela sem querer (o X cancela)
  if (document.querySelector('.painel-fundo:not(.saindo)')) { voltarPainel(); return true; }
  if (!$('#lateral').classList.contains('fechada') && estreita()) { fecharLateral(); return true; }
  return false;
};
// celular: arrastar da borda esquerda abre o histórico; arrastar para a esquerda fecha
(() => {
  let ini = null;
  document.addEventListener('touchstart', e => {
    if (!estreita() || document.querySelector('.painel-fundo:not(.saindo), .dlg-fundo:not(.saindo)')) return;
    const p = e.touches[0], aberta = !$('#lateral').classList.contains('fechada');
    if (!aberta && p.clientX > 28) return;
    ini = { x: p.clientX, y: p.clientY, aberta, dx: 0, travado: null };
  }, { passive: true });
  document.addEventListener('touchmove', e => {
    if (!ini) return;
    const p = e.touches[0], dx = p.clientX - ini.x, dy = p.clientY - ini.y;
    if (ini.travado === null && Math.hypot(dx, dy) > 8) ini.travado = Math.abs(dx) > Math.abs(dy);
    if (!ini.travado) return;
    const l = $('#lateral'), w = l.offsetWidth + 16; ini.dx = dx;   // +16: a gaveta flutua a 12 px da borda
    const pos = Math.max(-w, Math.min(0, (ini.aberta ? 0 : -w) + dx));
    l.classList.add('arrastando'); l.classList.remove('fechada'); l.style.transform = `translateX(${pos}px)`;
  }, { passive: true });
  document.addEventListener('touchend', () => {
    if (!ini) return;
    const l = $('#lateral'); l.classList.remove('arrastando'); l.style.transform = '';
    if (ini.travado) (ini.aberta ? ini.dx < -60 : ini.dx < 60) ? fecharLateral() : abrirLateral();
    else if (!ini.aberta) fecharLateral();
    ini = null;
  });
})();

/* ---------------- faixa de avisos ---------------- */
function mostrarFaixa(html, rotuloSim, fSim, rotuloNao = 'Agora não', fNao) {
  const f = $('#faixa');
  f.innerHTML = `<div class="faixa"><span>${html}</span><div class="acoes-faixa">${rotuloSim ? `<button class="sim">${esc(rotuloSim)}</button>` : ''}<button class="nao">${esc(rotuloNao)}</button></div></div>`;
  if (rotuloSim) f.querySelector('.sim').onclick = () => { f.innerHTML = ''; fSim && fSim(); };
  f.querySelector('.nao').onclick = () => { f.innerHTML = ''; fNao && fNao(); };
}

/* ---------------- aparência ---------------- */
// preferências que valem no app inteiro (vão no arquivo de conversas); as de fora (permissão de localização desta
// página, datas de checagem) ficam só aqui
const PREF_LOCAL = /^(localOk|perm:|ultimaVerificacao$)/;
let avisouCota = false;
const pref = (k, v) => {
  try {
    if (v === undefined) return localStorage.getItem(k);
    localStorage.setItem(k, v);
    if (!PREF_LOCAL.test(k) && typeof salvar === 'function' && conversasCarregadas) salvar();
  } catch (e) {
    if (!avisouCota && /quota/i.test((e && e.name) + (e && e.message))) { avisouCota = true; toast('O espaço para ajustes deste aparelho encheu: apague arquivos grandes do Conhecimento.', 6000); }
  }
};
function prefsCompartilhadas() {
  const o = {};
  try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k && !PREF_LOCAL.test(k) && k !== 'conversas') o[k] = localStorage.getItem(k); } } catch (e) {}
  return o;
}
function aplicarPrefsDoArquivo(o) {
  if (!o || typeof o !== 'object') return;
  try { for (const [k, v] of Object.entries(o)) if (typeof v === 'string' && !PREF_LOCAL.test(k) && v.length < 3000000) localStorage.setItem(k, v); } catch (e) {}
  try { atualizarBotaoPesquisa(); aplicarTema(); aplicarFonte(); } catch (e) {}   // o que aparece na tela segue os ajustes que chegaram
}
function aplicarTema() {
  const t = pref('tema') || 'sistema';
  const escuro = t === 'escuro' || (t === 'sistema' && matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.dataset.tema = escuro ? 'escuro' : 'claro';
  PLATAFORMA.tema(escuro ? 'escuro' : 'claro');
}
function aplicarFonte() { document.documentElement.dataset.fonte = pref('fonte') || 'm'; }
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', aplicarTema);

