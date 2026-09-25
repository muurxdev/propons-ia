/* ---------------- pesquisa na internet (opcional, desligada por padrão) ----------------
   Tudo o mais é offline. Ligada em "+", a pergunta vira uma busca de verdade: o app (não a página, que esbarra na
   política de origem) baixa os resultados do DuckDuckGo, abre as primeiras páginas — sites, fóruns, o que aparecer —
   e entrega o texto limpo à IA, que responde citando [1], [2]… com os links reais. Sem internet, ela avisa e
   responde com o que já sabe. Desligada, nada sai do aparelho. */
ICO.globo = '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9S14.5 18.4 12 21C9.5 18.4 8.2 15.4 8.2 12S9.5 5.6 12 3z"/></svg>';
const pesquisaLigada = () => pref('pesquisaWeb') === 'sim';
function definirPesquisa(sim) {
  pref('pesquisaWeb', sim ? 'sim' : 'nao');
  atualizarBotaoPesquisa();
  toast(sim ? 'Pesquisa na internet ligada: as perguntas vão para a busca.' : 'Pesquisa na internet desligada (religue no "+").', 3000);
}
function atualizarBotaoPesquisa() {
  const b = $('#btPesquisa'); if (!b) return;
  const on = pesquisaLigada();
  b.hidden = !on;                             // liga no "+"; aqui aparece quando está ligada e some ao tocar
  b.classList.toggle('on', on);
  b.setAttribute('aria-pressed', on ? 'true' : 'false');
  b.title = 'Pesquisa na internet ligada — toque para desligar';
}
const semInternet = () => typeof navigator.onLine === 'boolean' && !navigator.onLine;
const comPrazo = (p, ms) => Promise.race([p, new Promise((_, r) => setTimeout(() => r(new Error('demorou')), ms))]);
// HTML -> texto: fora script/style e as etiquetas; entidades comuns viram os caracteres
const ENTIDADES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', hellip: '…', mdash: '—', ndash: '–', rsquo: '’', lsquo: '‘', ldquo: '“', rdquo: '”', eacute: 'é', aacute: 'á', atilde: 'ã', ccedil: 'ç', oacute: 'ó', ecirc: 'ê', otilde: 'õ', uacute: 'ú', iacute: 'í', acirc: 'â', ocirc: 'ô', agrave: 'à' };
function limparHtml(t) {
  return String(t || '')
    .replace(/<(script|style|noscript|svg|template)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&#(\d+);/g, function (_, n) { try { return String.fromCharCode(+n); } catch (e) { return ' '; } })
    .replace(/&([a-z]+);/gi, function (m, n) { const v = ENTIDADES[String(n).toLowerCase()]; return v === undefined ? ' ' : v; })
    .replace(/[\t\r ]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
}
// o texto que interessa de uma página: o miolo, sem menu, rodapé nem comentários de HTML
function textoDaPagina(html) {
  let h = String(html || '').replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<(header|footer|nav|aside|form|iframe)[\s\S]*?<\/\1>/gi, ' ');
  const artigo = /<(article|main)[^>]*>([\s\S]*?)<\/\1>/i.exec(h);
  if (artigo && artigo[2] && artigo[2].length > 500) h = artigo[2];
  return limparHtml(h).replace(/\n\s*\n/g, '\n').slice(0, 4000);
}
const paginaDaWeb = url => PLATAFORMA.temBusca ? comPrazo(PLATAFORMA.buscarPagina(url), 22000) : comPrazo(fetch(url).then(r => r.text()), 15000);
// o DuckDuckGo devolve os links por um redirecionador: o endereço de verdade vem no parâmetro uddg
function enderecoDDG(href) {
  const h = String(href || '').replace(/&amp;/g, '&');
  const m = /[?&]uddg=([^&]+)/.exec(h);
  if (m) { try { return decodeURIComponent(m[1]); } catch (e) {} }
  return /^https?:\/\//.test(h) ? h : '';
}
// resultados da página de busca: título, endereço e o trecho que o buscador mostra
function lerResultados(html) {
  const saida = [];
  const re = /<a[^>]+class="[^"]*result__a[^"]*"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
  let m;
  while ((m = re.exec(html)) && saida.length < 8) {
    const url = enderecoDDG(m[1]), titulo = limparHtml(m[2]);
    if (url && titulo && !/duckduckgo\.com/.test(url) && !saida.some(x => x.url === url)) saida.push({ url: url, titulo: titulo.slice(0, 120), trecho: '' });
  }
  const rs = /<a[^>]+class="[^"]*result__snippet[^"]*"[^>]*>([\s\S]*?)<\/a>/gi;
  let i = 0, t;
  while ((t = rs.exec(html)) && i < saida.length) saida[i++].trecho = limparHtml(t[1]).slice(0, 400);
  return saida;
}
/* busca de verdade: resultados do buscador + o conteúdo das primeiras páginas */
async function pesquisarNaWeb(consulta, aoPasso) {
  const passo = t => { try { if (aoPasso) aoPasso(t); } catch (e) {} };
  const q = String(consulta || '').replace(/\s+/g, ' ').trim().slice(0, 240);
  passo('Pesquisando na internet');
  let achados = [];
  try {
    const html = await paginaDaWeb('https://html.duckduckgo.com/html/?kl=br-pt&q=' + encodeURIComponent(q));
    achados = lerResultados(html);
  } catch (e) {}
  if (!achados.length) achados = await buscaSimples(q);          // sem o buscador (ou sem ponte): resposta direta
  achados = achados.slice(0, 5);
  if (achados.length) passo('Lendo ' + Math.min(3, achados.length) + ' de ' + achados.length + (achados.length === 1 ? ' fonte' : ' fontes'));
  // abre as três primeiras para ler o que elas realmente dizem
  const lidas = await Promise.all(achados.slice(0, 3).map(async f => {
    try { return textoDaPagina(await paginaDaWeb(f.url)); } catch (e) { return ''; }
  }));
  const trechos = achados.map((f, k) => {
    const corpo = (lidas[k] || '').length > 200 ? lidas[k] : f.trecho;
    return (corpo || f.trecho || '').slice(0, CELULAR ? 1200 : 2500);   // no celular o processador lê o texto antes de responder: menos é mais rápido
  });
  return { fontes: achados.map(f => ({ titulo: f.titulo, url: f.url })), trechos: trechos };
}
// reserva: respostas diretas e resumos abertos (usados quando o buscador não responde, como no Linux sem ponte)
async function buscaSimples(q) {
  const saida = [];
  try {
    const r = await comPrazo(fetch('https://api.duckduckgo.com/?format=json&no_html=1&skip_disambig=1&q=' + encodeURIComponent(q)), 9000);
    const d = await r.json();
    if (d.AbstractText && d.AbstractURL) saida.push({ url: d.AbstractURL, titulo: d.Heading || q, trecho: limparHtml(d.AbstractText) });
    for (const t of (d.RelatedTopics || []).slice(0, 4)) if (t.Text && t.FirstURL) saida.push({ url: t.FirstURL, titulo: limparHtml(t.Text).slice(0, 80), trecho: limparHtml(t.Text) });
  } catch (e) {}
  return saida;
}
const N = String.fromCharCode(10);
const blocoPesquisa = r => 'RESULTADOS DA PESQUISA (' + new Date().toLocaleDateString('pt-BR') + '):' + N
  + r.fontes.map((f, k) => '[' + (k + 1) + '] ' + f.titulo + ' — ' + f.url + N + (r.trechos[k] || '')).join(N + N)
  + N + N + 'Responda com base nestes resultados, citando as fontes usadas como [1], [2]…, e diga quando eles não responderem à pergunta. Não invente nada que não esteja aí.';

