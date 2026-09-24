/* ---------------- raciocínio (Esforço Alto): só a palavra e a flechinha; o texto fica numa folha ----------------
   Na conversa fica uma linha só. A flechinha gira e muda de fundo ao abrir; no celular a folha sobe de baixo. */
const dominioDe = u => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch (e) { return ''; } };
/* cartões das fontes: logo do próprio site (serviço de ícones do buscador), domínio e título.
   Se a logo não vier (sem rede ou site sem ícone), ela some e fica só o número e o domínio. */
function htmlFontes(fontes) {
  const cartao = (f, i) => {
    const d = dominioDe(f.url);
    return '<a class="fonte" href="' + esc(f.url) + '" data-link title="' + esc(f.titulo) + '">'
      + '<span class="fn"><i>' + (i + 1) + '</i>'
      + (d ? '<img src="https://icons.duckduckgo.com/ip3/' + esc(d) + '.ico" alt="" loading="lazy" onerror="this.remove()">' : '')
      + '<b>' + esc(d || 'fonte') + '</b></span>'
      + '<span class="ft">' + esc(f.titulo) + '</span></a>';
  };
  return '<div class="fontes"><b class="fontes-t">' + fontes.length + (fontes.length === 1 ? ' fonte' : ' fontes')
    + '</b><div class="fonte-cards">' + fontes.map(cartao).join('') + '</div></div>';
}
// [1] no meio do texto vira um selo clicável para a fonte (não mexe em blocos de código)
function comCitacoes(html, fontes) {
  if (!fontes || !fontes.length) return html;
  return String(html).split(/(<pre[\s\S]*?<\/pre>|<code[\s\S]*?<\/code>)/).map((parte, i) => i % 2 ? parte
    : parte.replace(/\[(\d{1,2})\]/g, (todo, n) => {
      const f = fontes[+n - 1];
      return f ? '<a class="cit" href="' + esc(f.url) + '" data-link title="' + esc(f.titulo) + '">' + n + '</a>' : todo;
    })).join('');
}
const htmlLinhaPensa = rotulo => `<div class="pensa-linha"><span class="pensa-rotulo">${rotulo ? esc(rotulo) : htmlTrabalhando()}</span><button class="pensa-seta" aria-label="Ver o raciocínio" aria-expanded="false">${ICO.baixo}</button></div>`;
let folhaPensa = null;
function ligarLinhaPensa(el, texto) {
  const linha = el.querySelector('.pensa-linha'); if (!linha) return;
  const abrir = () => abrirFolhaPensa(typeof texto === 'function' ? texto() : texto, linha);
  linha.querySelector('.pensa-seta').onclick = abrir;
  linha.onclick = e => { if (!e.target.closest('.pensa-seta')) abrir(); };
}
function abrirFolhaPensa(texto, linha) {
  if (folhaPensa) { folhaPensa.fechar(); return; }
  const f = document.createElement('div'); f.className = 'dlg-fundo';
  f.innerHTML = `<div class="dlg folha pensa-folha">${topoCentro('Raciocínio')}<div class="pens-txt">${esc(texto || '')}</div>
    <p class="info pensa-pe">É o rascunho da IA antes de responder. Some quando você apaga a conversa.</p></div>`;
  const dlg = f.firstChild;
  const sair = () => { folhaPensa = null; if (linha) linha.querySelector('.pensa-seta').setAttribute('aria-expanded', 'false'); animarSaida(f, dlg); };
  f.fechar = sair; f.onclick = e => { if (e.target === f) sair(); }; dlg.querySelector('[data-x]').onclick = sair;
  folhaArrastavel(f, dlg, sair);
  if (linha) linha.querySelector('.pensa-seta').setAttribute('aria-expanded', 'true');
  folhaPensa = f;
  pausarDesenho(); document.body.appendChild(f);
  const t = dlg.querySelector('.pens-txt'); t.scrollTop = t.scrollHeight;
}
// enquanto a IA pensa com a folha aberta, o texto vai chegando nela
function atualizarFolhaPensa(texto) {
  if (!folhaPensa) return;
  const t = folhaPensa.querySelector('.pens-txt'); if (!t) return;
  const colado = t.scrollHeight - t.scrollTop - t.clientHeight < 40;
  t.textContent = texto;
  if (colado) t.scrollTop = t.scrollHeight;
}

/* ---------------- "Pensando": a palavra com brilho passando enquanto a IA não escreveu nada ----------------
   Uma palavra só, trocando de vez em quando (como no Claude). O brilho é CSS; aqui só trocamos a palavra. */
const PALAVRAS_TRABALHANDO = ['Pensando', 'Conferindo', 'Calculando', 'Analisando', 'Refletindo', 'Organizando as ideias', 'Considerando', 'Processando'];
function novaPalavra(el, primeira) {
  if (!el) return null;
  let i = primeira ? 0 : Math.floor(Math.random() * PALAVRAS_TRABALHANDO.length);
  el.textContent = PALAVRAS_TRABALHANDO[i];
  const t = setInterval(() => {
    if (!el.isConnected) { clearInterval(t); return; }
    let j; do { j = Math.floor(Math.random() * PALAVRAS_TRABALHANDO.length); } while (j === i);
    i = j; el.textContent = PALAVRAS_TRABALHANDO[i];
  }, 4200);
  return () => clearInterval(t);
}
const htmlTrabalhando = () => '<span class="trabalhando">Pensando</span>';

/* ---------------- segundo plano: avisa quando a resposta fica pronta com a janela fora de foco ---------------- */
let janelaEscondida = document.hidden;
const querAviso = () => (pref('avisarPronto') || 'sim') === 'sim';
addEventListener('visibilitychange', () => { if (document.hidden) janelaEscondida = true; });
addEventListener('blur', () => { janelaEscondida = true; });
function avisarPronto(msg) {
  if (!janelaEscondida || !querAviso() || !msg || !msg.texto) return;
  const t = textoParaFala(msg.texto).replace(/\s+/g, ' ').trim();
  PLATAFORMA.notificar('Resposta pronta', t.slice(0, 160) + (t.length > 160 ? '…' : ''));
}

