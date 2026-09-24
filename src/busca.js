/* ---------------- busca por trechos em documentos longos (PDF/DOCX), 100% no aparelho ----------------
   O documento é picado em pedaços de ~800 caracteres (com sobreposição de ~150), cada um sabendo a sua página.
   Para cada pergunta, um índice BM25 com normalização do português escolhe os pedaços mais ligados a ela; eles vão
   para a IA em ordem de página, com "— página X —". Assim um PDF de 200 páginas não é lido só no começo. */
const BUSCA = (() => {
  const PARADAS = new Set(('a o e de da do das dos em no na nos nas um uma uns umas para pra por pelo pela pelos pelas com sem que se ao aos as os ' +
    'ou como mais mas foi ser sao era esta estao isso isto esse essa este ele ela eles elas seu sua seus suas meu minha voce voces eu te me lhe ja nao ' +
    'sim muito tambem quando onde qual quais quem porque pois sobre entre ate depois antes ha tem ter sua qual cada todo toda todos todas ' +
    'fala diz disse explique explica me mostre qual quais pagina paginas arquivo pdf documento texto the of and to in is').split(' '));
  const SUFIXOS = ['amente', 'mente', 'acoes', 'icoes', 'coes', 'soes', 'acao', 'icao', 'cao', 'sao', 'idades', 'idade', 'istas', 'ista', 'ismos', 'ismo',
    'ores', 'oras', 'ora', 'dor', 'res', 'ais', 'eis', 'ois', 'is', 'es', 'as', 'os', 's', 'a', 'o', 'e'];
  const semAcento = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const radical = w => { if (/^\d/.test(w)) return w; for (const s of SUFIXOS) if (w.length - s.length >= 4 && w.endsWith(s)) return w.slice(0, -s.length); return w; };
  const termos = s => (semAcento(s || '').match(/[a-z0-9]+/g) || []).filter(w => (w.length > 2 || /^\d+$/.test(w)) && !PARADAS.has(w)).map(radical);

  // páginas: os PDFs chegam com "— página N —" no começo de cada página (extrairPdf); DOCX vira uma "página" só
  const MARCA = /— página (\d+) —\n/g;
  function paginas(texto) {
    const out = []; let m, ultimo = null;
    MARCA.lastIndex = 0;
    while ((m = MARCA.exec(texto))) { if (ultimo) ultimo.fim = m.index; ultimo = { pag: +m[1], ini: m.index + m[0].length, fim: texto.length }; out.push(ultimo); }
    return out.length ? out : [{ pag: 0, ini: 0, fim: texto.length }];
  }
  // pedaços de ~tam caracteres dentro de cada página, cortando em espaço, com sobreposição
  function picotar(texto, tam = 800, sobra = 150) {
    const out = [];
    for (const p of paginas(texto)) {
      let i = p.ini;
      while (i < p.fim) {
        let f = Math.min(p.fim, i + tam);
        if (f < p.fim) { const e = texto.lastIndexOf(' ', f); if (e > i + tam / 2) f = e; }
        if (texto.slice(i, f).trim()) out.push({ pag: p.pag, ini: i, fim: f, pini: p.ini, pfim: p.fim });
        if (f >= p.fim) break;
        i = Math.max(i + 1, f - sobra);
      }
    }
    return out;
  }

  // índice BM25 guardado por documento (o mesmo PDF é consultado a cada pergunta da conversa)
  const indices = new Map();
  const chave = s => { let h = 2166136261; for (let i = 0; i < s.length; i += 7) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return s.length + ':' + (h >>> 0); };
  function indice(texto) {
    const k = chave(texto); let ix = indices.get(k);
    if (ix) return ix;
    const pedacos = picotar(texto), df = new Map(); let soma = 0;
    for (const p of pedacos) {
      const tf = new Map(); for (const t of termos(texto.slice(p.ini, p.fim))) tf.set(t, (tf.get(t) || 0) + 1);
      p.tf = tf; p.n = [...tf.values()].reduce((a, b) => a + b, 0); soma += p.n;
      for (const t of tf.keys()) df.set(t, (df.get(t) || 0) + 1);
    }
    ix = { pedacos, df, media: soma / Math.max(1, pedacos.length) };
    indices.set(k, ix); if (indices.size > 8) indices.delete(indices.keys().next().value);
    return ix;
  }
  function pontuar(ix, pergunta) {
    const q = [...new Set(termos(pergunta))], N = ix.pedacos.length, k1 = 1.2, b = 0.75;
    // "página 57" na pergunta: a própria página ganha prioridade
    const pags = new Set([...(pergunta || '').matchAll(/p[áa]g(?:ina)?s?\.?\s*(\d+)/gi)].map(m => +m[1]));
    return ix.pedacos.map(p => {
      let s = 0;
      for (const t of q) {
        const f = p.tf.get(t); if (!f) continue;
        const idf = Math.log(1 + (N - ix.df.get(t) + 0.5) / (ix.df.get(t) + 0.5));
        s += idf * f * (k1 + 1) / (f + k1 * (1 - b + b * p.n / ix.media));
      }
      if (pags.has(p.pag)) s += 10;
      return s;
    });
  }

  // os pedaços mais ligados à pergunta que cabem em maxChars, juntos em ordem de página; null se nada combina
  function trechosRelevantes(texto, pergunta, maxChars) {
    const ix = indice(texto), notas = pontuar(ix, pergunta);
    const ordem = notas.map((s, i) => [s, i]).filter(x => x[0] > 0).sort((a, b) => b[0] - a[0]);
    if (!ordem.length) return null;
    const escolhidos = []; let total = 0;
    for (const [, i] of ordem) {
      const p = ix.pedacos[i], tam = p.fim - p.ini;
      if (total + tam > maxChars) { if (escolhidos.length) continue; }
      escolhidos.push(p); total += tam;
      if (total >= maxChars) break;
    }
    // sobrou espaço: cada trecho leva um pouco do texto em volta (dentro da mesma página), para a IA ter o contexto
    const folga = Math.min(600, Math.floor((maxChars - total) / (2 * escolhidos.length)));
    const alargar = p => folga <= 0 ? p : { ...p, ini: Math.max(p.pini, texto.lastIndexOf(' ', p.ini - folga) + 1 || p.pini), fim: Math.min(p.pfim, (texto.indexOf(' ', p.fim + folga) + 1 || p.pfim)) };
    // junta pedaços que se encostam (a sobreposição vira texto contínuo)
    const faixas = [];
    for (const p of escolhidos.map(alargar).sort((a, b) => a.ini - b.ini)) {
      const u = faixas[faixas.length - 1];
      if (u && u.pag === p.pag && p.ini <= u.fim + 1) u.fim = Math.max(u.fim, p.fim);
      else faixas.push({ pag: p.pag, ini: p.ini, fim: p.fim });
    }
    let out = '', pagAnt = -1;
    for (const f of faixas) {
      if (f.pag !== pagAnt) out += (out ? '\n\n' : '') + (f.pag ? `— página ${f.pag} —\n` : '');
      else out += '\n[…]\n';
      out += texto.slice(f.ini, f.fim).trim(); pagAnt = f.pag;
    }
    return { texto: out, paginas: [...new Set(faixas.map(f => f.pag).filter(Boolean))] };
  }

  // blocos de páginas inteiras de até maxChars cada (resumo em etapas: "resuma o PDF")
  function blocos(texto, maxChars) {
    const out = []; let atual = null;
    for (const p of paginas(texto)) {
      for (let i = p.ini; i < p.fim; i += maxChars) {
        const f = Math.min(p.fim, i + maxChars), pedaco = texto.slice(i, f);
        if (atual && atual.texto.length + pedaco.length > maxChars) { out.push(atual); atual = null; }
        if (!atual) atual = { de: p.pag, ate: p.pag, texto: '' };
        atual.texto += (atual.texto ? '\n\n' : '') + (p.pag ? `— página ${p.pag} —\n` : '') + pedaco; atual.ate = p.pag;
      }
    }
    if (atual) out.push(atual);
    return out;
  }

  return { termos, picotar, trechosRelevantes, blocos };
})();
globalThis.BUSCA = BUSCA;
