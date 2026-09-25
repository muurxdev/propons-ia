/* ---------------- raciocínio (Esforço Alto): só a palavra e a flechinha; o texto fica numa folha ----------------
   Na conversa fica uma linha só. A flechinha gira e muda de fundo ao abrir; no celular a folha sobe de baixo. */
const dominioDe = u => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch (e) { return ''; } };
/* cartões das fontes: logo do próprio site (serviço de ícones do buscador), domínio e título.
   Se a logo não vier (sem rede ou site sem ícone), ela some e fica só o número e o domínio. */
const iconeSite = d => d ? '<img src="https://icons.duckduckgo.com/ip3/' + esc(d) + '.ico" alt="" loading="lazy" onerror="this.style.visibility=\'hidden\'">' : '';
// ícones empilhados (como no ChatGPT): até 4 sites diferentes
const pilhaIcones = fontes => [...new Set(fontes.map(f => dominioDe(f.url)).filter(Boolean))].slice(0, 4).map(d => '<i>' + iconeSite(d) + '</i>').join('');
function htmlFontes(fontes) {
  const cartao = (f, i) => {
    const d = dominioDe(f.url);
    return '<a class="fonte" href="' + esc(f.url) + '" data-link title="' + esc(f.titulo) + '">'
      + '<span class="fn"><i>' + (i + 1) + '</i>'
      + (d ? '<img src="https://icons.duckduckgo.com/ip3/' + esc(d) + '.ico" alt="" loading="lazy" onerror="this.remove()">' : '')
      + '<b>' + esc(d || 'fonte') + '</b></span>'
      + '<span class="ft">' + esc(f.titulo) + '</span></a>';
  };
  return '<div class="fontes"><button class="fontes-t" data-fontes type="button"><span class="pilha">' + pilhaIcones(fontes) + '</span><b>Fontes</b><small>'
    + fontes.length + (fontes.length === 1 ? ' site' : ' sites') + '</small>' + ICO.seguir + '</button>'
    + '<div class="fonte-cards">' + fontes.map(cartao).join('') + '</div></div>';
}
// todas as fontes numa folha: ícone, domínio, título; tocar abre o popup da fonte
function abrirListaFontes(fontes) {
  const f = document.createElement('div'); f.className = 'dlg-fundo';
  f.innerHTML = `<div class="dlg folha fontes-dlg">${topoCentro(fontes.length + (fontes.length === 1 ? ' fonte' : ' fontes'))}
    <ol class="fontes-lista">${fontes.map((x, i) => { const d = dominioDe(x.url); return `<li><a href="${esc(x.url)}" data-i="${i}"><span class="fl-ico">${iconeSite(d)}</span><span class="fl-txt"><small><i>${i + 1}</i>${esc(d)}</small><b>${esc(x.titulo || d)}</b></span></a></li>`; }).join('')}</ol></div>`;
  const folha = f.firstChild, sair = () => animarSaida(f, folha);
  f.fechar = sair; f.onclick = e => { if (e.target === f) sair(); }; folha.querySelector('[data-x]').onclick = sair;
  folha.querySelectorAll('a[data-i]').forEach(a => a.onclick = e => { e.preventDefault(); const x = fontes[+a.dataset.i]; abrirFonte(x.url, x.titulo); });
  folhaArrastavel(f, folha, sair);
  pausarDesenho(); document.body.appendChild(f);
}
/* tocar numa fonte, numa citação [n] ou num link da resposta: um popup com o site, o título e o endereço inteiro para
   copiar, e os botões de abrir, copiar e compartilhar (como o aviso de link do Claude) — nada abre sem querer */
function abrirFonte(url, titulo) {
  const d = dominioDe(url) || url;
  const f = document.createElement('div'); f.className = 'dlg-fundo';
  f.innerHTML = `<div class="dlg folha fonte-dlg">${topoCentro('Fonte')}
    <div class="fonte-cab">${d ? `<img src="https://icons.duckduckgo.com/ip3/${esc(d)}.ico" alt="" onerror="this.remove()">` : ''}<div><b>${esc(d)}</b>${titulo && titulo !== url ? `<small>${esc(titulo)}</small>` : ''}</div></div>
    <input class="campo-texto fonte-url" readonly value="${esc(url)}" aria-label="Endereço da página">
    <div class="fonte-acoes"><button class="btn primario" data-abrir>${ICO.link || ''}Abrir página</button><button class="btn" data-copiar>${ICO.copiar}Copiar link</button>${PLATAFORMA.podeCompartilhar ? `<button class="btn" data-comp>${ICO.compartilhar}Compartilhar</button>` : ''}</div>
    <p class="info fonte-nota">Abre no navegador do aparelho.</p></div>`;
  const folha = f.firstChild, sair = () => animarSaida(f, folha);
  f.fechar = sair; f.onclick = e => { if (e.target === f) sair(); }; folha.querySelector('[data-x]').onclick = sair;
  folha.querySelector('.fonte-url').onfocus = e => e.target.select();
  folha.querySelector('[data-abrir]').onclick = () => { PLATAFORMA.abrirLink(url); sair(); };
  folha.querySelector('[data-copiar]').onclick = () => copiarTexto(url).then(() => toast('Link copiado.'));
  const c = folha.querySelector('[data-comp]'); if (c) c.onclick = () => PLATAFORMA.compartilhar(url).catch(() => {});
  folhaArrastavel(f, folha, sair);
  pausarDesenho(); document.body.appendChild(f);
}
ICO.link = '<svg viewBox="0 0 24 24"><path d="M14 4h6v6M20 4l-9 9"/><path d="M19 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h4"/></svg>';
// liga o popup em todos os links de um pedaço da conversa (cartões, citações e links do texto)
const ligarLinks = el => {
  el.querySelectorAll('a[href]').forEach(a => a.onclick = e => { e.preventDefault(); abrirFonte(a.href, a.getAttribute('title') || (a.classList.contains('cit') ? '' : a.textContent.trim())); });
  el.querySelectorAll('[data-fontes]').forEach(b => b.onclick = () => abrirListaFontes([...b.parentNode.querySelectorAll('.fonte')].map(a => ({ url: a.getAttribute('href'), titulo: a.getAttribute('title') || '' }))));
};
// [1] no meio do texto vira um selo clicável para a fonte (não mexe em blocos de código)
function comCitacoes(html, fontes) {
  if (!fontes || !fontes.length) return html;
  return String(html).split(/(<pre[\s\S]*?<\/pre>|<code[\s\S]*?<\/code>)/).map((parte, i) => i % 2 ? parte
    : parte.replace(/\[(\d{1,2})\]/g, (todo, n) => {
      const f = fontes[+n - 1];
      return f ? '<a class="cit" href="' + esc(f.url) + '" data-link title="' + esc(f.titulo) + '">' + n + '</a>' : todo;
    })).join('');
}
// no fim da resposta: a marca parada e "Pensou por N s"; tocar abre o raciocínio inteiro
const tempoBonito = s => s >= 60 ? Math.floor(s / 60) + ' min' + (s % 60 ? ' ' + (s % 60) + ' s' : '') : s + ' s';
const htmlLinhaPensa = rotulo => `<div class="pensa-linha"><span class="giro-marca parada" aria-hidden="true">✻</span><span class="pensa-rotulo">${rotulo ? esc(rotulo) : htmlTrabalhando()}</span><button class="pensa-seta" aria-label="Ver o raciocínio" aria-expanded="false">${ICO.baixo}</button></div>`;
let folhaPensa = null;
function ligarLinhaPensa(el, texto, titulo) {
  const linha = el.querySelector('.pensa-linha'); if (!linha) return;
  const abrir = () => abrirFolhaPensa(typeof texto === 'function' ? texto() : texto, linha, titulo);
  linha.querySelector('.pensa-seta').onclick = abrir;
  linha.onclick = e => { if (!e.target.closest('.pensa-seta')) abrir(); };
}
function abrirFolhaPensa(texto, linha, titulo) {
  if (folhaPensa) { folhaPensa.fechar(); return; }
  const f = document.createElement('div'); f.className = 'dlg-fundo';
  f.innerHTML = `<div class="dlg folha pensa-folha">${topoCentro(titulo || 'Raciocínio')}<div class="pens-txt">${esc(texto || '')}</div>
    <p class="info pensa-pe">É o rascunho da IA antes de responder. Some quando você apaga a conversa.</p></div>`;
  const dlg = f.firstChild;
  const sair = () => { folhaPensa = null; if (linha) linha.querySelector('.pensa-seta').setAttribute('aria-expanded', 'false'); animarSaida(f, dlg); };
  f.fechar = sair; f.onclick = e => { if (e.target === f) sair(); }; dlg.querySelector('[data-x]').onclick = sair;
  folhaArrastavel(f, dlg, sair);
  if (linha) linha.querySelector('.pensa-seta').setAttribute('aria-expanded', 'true');
  folhaPensa = f;
  pausarDesenho(); document.body.appendChild(f);
}
// enquanto a IA pensa com a folha aberta, o texto vai chegando nela: só o pedaço novo entra (nada é redesenhado) e a
// rolagem fica onde a pessoa deixou — antes ela era puxada para o fim a cada palavra e o arraste para fechar brigava
function atualizarFolhaPensa(texto) {
  if (!folhaPensa) return;
  const t = folhaPensa.querySelector('.pens-txt'); if (!t) return;
  const atual = t.textContent;
  if (texto.startsWith(atual)) { if (texto.length > atual.length) t.appendChild(document.createTextNode(texto.slice(atual.length))); }
  else t.textContent = texto;
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

/* ---------------- o giro da Própons: enquanto responde, a marca roxa muda de forma, a palavra do momento brilha e o
   tempo corre (como o ✻ do Claude Code). Os passos (pesquisa, leitura do arquivo, compactar) aparecem nele; pensando,
   tocar abre o raciocínio chegando. No fim ele some e, se a IA pensou, fica "Pensou por N s" para abrir. ---------------- */
const FORMAS_GIRO = ['·', '✢', '✳', '✶', '✻', '✽', '✻', '✶', '✳', '✢'];
function novoGiro(textoPensando) {
  const el = document.createElement('div'); el.className = 'giro'; el.setAttribute('role', 'status');
  el.innerHTML = '<span class="giro-marca" aria-hidden="true">·</span><span class="trabalhando">Pensando</span><span class="giro-tempo"></span>';
  const marca = el.querySelector('.giro-marca'), palavra = el.querySelector('.trabalhando'), tempo = el.querySelector('.giro-tempo');
  const t0 = performance.now(); let i = 0, pararPal = novaPalavra(palavra, true), pensando = false;
  const tick = setInterval(() => {
    if (!el.isConnected && !el._pendente) return;
    marca.textContent = FORMAS_GIRO[i = (i + 1) % FORMAS_GIRO.length];
    const s = Math.floor((performance.now() - t0) / 1000); tempo.textContent = s ? s + ' s' : '';
  }, 140);
  el.onclick = () => { if (pensando) abrirFolhaPensa(textoPensando(), null); };
  return {
    el,
    // um passo com nome (pesquisando, lendo o arquivo…): a palavra para de trocar e mostra o passo
    passo(t) { if (pararPal) { pararPal(); pararPal = null; } palavra.textContent = t; },
    // de volta às palavras que se revezam
    livre() { if (!pararPal) pararPal = novaPalavra(palavra, true); },
    // pesquisando: os ícones dos sites achados entram um a um ao lado da palavra (como no ChatGPT)
    icones(fontes) {
      let p = el.querySelector('.giro-icones'); if (!p) { p = document.createElement('span'); p.className = 'giro-icones'; palavra.after(p); }
      const ds = [...new Set((fontes || []).map(f => dominioDe(f.url)).filter(Boolean))];
      p.innerHTML = ds.slice(0, 5).map((d, k) => `<i style="animation-delay:${k * 90}ms">${iconeSite(d)}</i>`).join('') + (ds.length > 5 ? `<small>+${ds.length - 5}</small>` : '');
    },
    pensando(sim) { pensando = sim; el.classList.toggle('pensa', sim); el.title = sim ? 'Ver o raciocínio' : ''; },
    segundos() { return Math.max(1, Math.round((performance.now() - t0) / 1000)); },
    parar() { clearInterval(tick); if (pararPal) pararPal(); el.remove(); },
  };
}

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

