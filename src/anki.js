/* ---------------- baralho do Anki (.apkg) feito no próprio aparelho ----------------
   Um .apkg é um zip com "collection.anki2" (um banco SQLite no esquema 11 do Anki, o mesmo do genanki) e "media".
   Sem biblioteca: o SQLite é escrito aqui mesmo, página por página (árvore B de tabela, páginas de 8 KB, sem
   páginas de estouro — os campos são limitados para caber), e o zip vai sem compressão. Abre em qualquer Anki
   (computador, AnkiDroid, AnkiMobile) com "Importar". */
const ANKI = (() => {
  const PAGINA = 8192;
  const enc = new TextEncoder();
  // ---- números no formato do SQLite
  function varint(n) {   // até 2^53 (bastam 9 bytes no formato do SQLite; aqui nunca passa de 8)
    n = BigInt(n); if (n < 0n) n = (1n << 64n) + n;
    if (n <= 0x7fn) return [Number(n)];
    const b = []; let v = n;
    if (v > 0x00ffffffffffffffn) { b.unshift(Number(v & 0xffn)); v >>= 8n; for (let i = 0; i < 8; i++) { b.unshift(Number(v & 0x7fn) | 0x80); v >>= 7n; } return b; }
    b.unshift(Number(v & 0x7fn)); v >>= 7n;
    while (v > 0n) { b.unshift(Number(v & 0x7fn) | 0x80); v >>= 7n; }
    return b;
  }
  function inteiroBytes(v) {   // → [tipo serial, bytes] para um inteiro
    if (v === 0) return [8, []]; if (v === 1) return [9, []];
    const tamanhos = [[1, 1], [2, 2], [3, 3], [4, 4], [5, 6], [6, 8]];
    for (const [tipo, n] of tamanhos) {
      const lim = 2n ** BigInt(n * 8 - 1);
      if (BigInt(v) >= -lim && BigInt(v) < lim) {
        let x = BigInt(v); if (x < 0n) x += 2n ** BigInt(n * 8);
        const out = []; for (let i = n - 1; i >= 0; i--) out.push(Number((x >> BigInt(i * 8)) & 0xffn));
        return [tipo, out];
      }
    }
    throw new Error('inteiro grande demais');
  }
  // registro (linha): cabeçalho com os tipos e depois os valores; null = coluna "integer primary key" (vira o rowid)
  function registro(valores) {
    const tipos = [], corpo = [];
    for (const v of valores) {
      if (v === null) { tipos.push(0); continue; }
      if (typeof v === 'number') { const [t, b] = inteiroBytes(v); tipos.push(t); corpo.push(...b); continue; }
      const b = enc.encode(String(v)); tipos.push(b.length * 2 + 13); for (const x of b) corpo.push(x);
    }
    const tiposBytes = tipos.flatMap(varint);
    let tamCab = tiposBytes.length + 1; if (varint(tamCab).length > 1) tamCab++;
    return [...varint(tamCab), ...tiposBytes, ...corpo];
  }
  // ---- árvore B de uma tabela: folhas cheias em ordem de rowid; se não couber numa folha, páginas internas em cima
  function arvore(linhas, proxPagina, paginas, primeira) {   // linhas: [{rowid, rec}] em ordem; devolve a página raiz
    const celulasFolha = linhas.map(l => [...varint(l.rec.length), ...varint(l.rowid), ...l.rec]);
    const nivel = [];   // [{pagina, maiorRowid}]
    let i = 0;
    do {
      const n = proxPagina(), off = n === 1 ? 100 : 0, cab = 8;
      const cabem = []; let usado = off + cab;
      while (i < celulasFolha.length && usado + celulasFolha[i].length + 2 <= PAGINA) { usado += celulasFolha[i].length + 2; cabem.push(i); i++; }
      if (!cabem.length && i < celulasFolha.length) throw new Error('cartão grande demais para o Anki');
      paginas[n] = pagina(0x0d, cabem.map(k => celulasFolha[k]), off, null);
      nivel.push({ pagina: n, maior: cabem.length ? linhas[cabem[cabem.length - 1]].rowid : 0 });
    } while (i < celulasFolha.length);
    if (nivel.length === 1) return nivel[0].pagina;
    // páginas internas (uma só basta para as quantidades daqui: ~600 filhos por página)
    let atual = nivel;
    while (atual.length > 1) {
      const prox = [];
      for (let j = 0; j < atual.length;) {
        const n = proxPagina(), cel = [], filhos = [];
        let usado = 12;
        while (j < atual.length - 1 && usado + 13 + 2 <= PAGINA) { const f = atual[j]; cel.push([f.pagina >>> 24, (f.pagina >>> 16) & 255, (f.pagina >>> 8) & 255, f.pagina & 255, ...varint(f.maior)]); filhos.push(f); usado += cel[cel.length - 1].length + 2; j++; }
        const direita = atual[j]; j++;
        paginas[n] = pagina(0x05, cel, 0, direita.pagina);
        prox.push({ pagina: n, maior: direita.maior });
      }
      atual = prox;
    }
    void primeira;
    return atual[0].pagina;
  }
  function pagina(tipo, celulas, off, direita) {
    const p = new Uint8Array(PAGINA), cab = tipo === 0x05 ? 12 : 8;
    let fim = PAGINA; const ponteiros = [];
    for (const c of celulas) { fim -= c.length; p.set(c, fim); ponteiros.push(fim); }
    p[off] = tipo; p[off + 1] = 0; p[off + 2] = 0;
    p[off + 3] = celulas.length >> 8; p[off + 4] = celulas.length & 255;
    const ini = celulas.length ? fim : PAGINA; p[off + 5] = (ini >> 8) & 255; p[off + 6] = ini & 255;   // 65536 vira 0 (não acontece aqui)
    p[off + 7] = 0;
    if (tipo === 0x05) { p[off + 8] = direita >>> 24; p[off + 9] = (direita >>> 16) & 255; p[off + 10] = (direita >>> 8) & 255; p[off + 11] = direita & 255; }
    ponteiros.forEach((q, k) => { p[off + cab + 2 * k] = q >> 8; p[off + cab + 2 * k + 1] = q & 255; });
    return p;
  }
  const TABELAS = [
    ['col', 'CREATE TABLE col (id integer primary key, crt integer not null, mod integer not null, scm integer not null, ver integer not null, dty integer not null, usn integer not null, ls integer not null, conf text not null, models text not null, decks text not null, dconf text not null, tags text not null)'],
    ['notes', 'CREATE TABLE notes (id integer primary key, guid text not null, mid integer not null, mod integer not null, usn integer not null, tags text not null, flds text not null, sfld integer not null, csum integer not null, flags integer not null, data text not null)'],
    ['cards', 'CREATE TABLE cards (id integer primary key, nid integer not null, did integer not null, ord integer not null, mod integer not null, usn integer not null, type integer not null, queue integer not null, due integer not null, ivl integer not null, factor integer not null, reps integer not null, lapses integer not null, left integer not null, odue integer not null, odid integer not null, flags integer not null, data text not null)'],
    ['revlog', 'CREATE TABLE revlog (id integer primary key, cid integer not null, usn integer not null, ease integer not null, ivl integer not null, lastIvl integer not null, factor integer not null, time integer not null, type integer not null)'],
    ['graves', 'CREATE TABLE graves (usn integer not null, oid integer not null, type integer not null)'],
  ];
  function sqlite(tabelas) {   // tabelas: { nome: [{rowid, valores}] }
    const paginas = []; let n = 1;
    const proxPagina = () => n++;
    proxPagina();   // a página 1 é a do sqlite_master (fica para o fim, quando se sabe as raízes)
    const raizes = {};
    for (const [nome] of TABELAS) raizes[nome] = arvore((tabelas[nome] || []).map(l => ({ rowid: l.rowid, rec: registro(l.valores) })), proxPagina, paginas);
    const mestre = TABELAS.map(([nome, sql], k) => ({ rowid: k + 1, rec: registro(['table', nome, nome, raizes[nome], sql]) }));
    const celulas = mestre.map(l => [...varint(l.rec.length), ...varint(l.rowid), ...l.rec]);
    paginas[1] = pagina(0x0d, celulas, 100, null);
    const total = n - 1, h = paginas[1];
    h.set(enc.encode('SQLite format 3\0'), 0);
    h[16] = PAGINA >> 8; h[17] = PAGINA & 255; h[18] = 1; h[19] = 1; h[20] = 0; h[21] = 64; h[22] = 32; h[23] = 32;
    const u32 = (o, v) => { h[o] = v >>> 24; h[o + 1] = (v >>> 16) & 255; h[o + 2] = (v >>> 8) & 255; h[o + 3] = v & 255; };
    u32(24, 1); u32(28, total); u32(32, 0); u32(36, 0); u32(40, 1); u32(44, 4); u32(48, 0); u32(52, 0); u32(56, 1); u32(60, 0); u32(64, 0); u32(68, 0);
    u32(92, 1); u32(96, 3046000);
    const out = new Uint8Array(total * PAGINA);
    for (let k = 1; k <= total; k++) out.set(paginas[k], (k - 1) * PAGINA);
    return out;
  }
  // ---- zip sem compressão (o bastante para o .apkg)
  const TABELA_CRC = (() => { const t = new Uint32Array(256); for (let i = 0; i < 256; i++) { let c = i; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[i] = c >>> 0; } return t; })();
  const crc32 = b => { let c = 0xffffffff; for (let i = 0; i < b.length; i++) c = TABELA_CRC[(c ^ b[i]) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  function zip(arquivos) {   // [{nome, dados: Uint8Array}]
    const partes = [], central = []; let pos = 0;
    const le = (n, b) => { const a = []; for (let i = 0; i < b; i++) a.push((n >>> (8 * i)) & 255); return a; };
    for (const a of arquivos) {
      const nome = enc.encode(a.nome), crc = crc32(a.dados), t = a.dados.length;
      const local = [0x50, 0x4b, 0x03, 0x04, ...le(20, 2), ...le(0, 2), ...le(0, 2), ...le(0, 2), ...le(0x21, 2), ...le(crc, 4), ...le(t, 4), ...le(t, 4), ...le(nome.length, 2), ...le(0, 2), ...nome];
      central.push([0x50, 0x4b, 0x01, 0x02, ...le(20, 2), ...le(20, 2), ...le(0, 2), ...le(0, 2), ...le(0, 2), ...le(0x21, 2), ...le(crc, 4), ...le(t, 4), ...le(t, 4), ...le(nome.length, 2), ...le(0, 2), ...le(0, 2), ...le(0, 2), ...le(0, 2), ...le(0, 4), ...le(pos, 4), ...nome]);
      partes.push(Uint8Array.from(local), a.dados); pos += local.length + t;
    }
    const cd = Uint8Array.from(central.flat());
    const fim = Uint8Array.from([0x50, 0x4b, 0x05, 0x06, ...le(0, 2), ...le(0, 2), ...le(arquivos.length, 2), ...le(arquivos.length, 2), ...le(cd.length, 4), ...le(pos, 4), ...le(0, 2)]);
    const out = new Uint8Array(pos + cd.length + fim.length); let o = 0;
    for (const p of [...partes, cd, fim]) { out.set(p, o); o += p.length; }
    return out;
  }
  // ---- SHA-1 (o Anki guarda o começo do SHA-1 do primeiro campo para achar duplicados)
  function sha1(texto) {
    const b = [...enc.encode(texto)], n = b.length; b.push(0x80); while (b.length % 64 !== 56) b.push(0);
    const bits = n * 8; for (let i = 7; i >= 0; i--) b.push(i >= 4 ? 0 : (bits >>> (i * 8)) & 255);
    let [h0, h1, h2, h3, h4] = [0x67452301, 0xefcdab89, 0x98badcfe, 0x10325476, 0xc3d2e1f0];
    const w = new Array(80), rl = (x, k) => (x << k) | (x >>> (32 - k));
    for (let o = 0; o < b.length; o += 64) {
      for (let i = 0; i < 16; i++) w[i] = (b[o + 4 * i] << 24) | (b[o + 4 * i + 1] << 16) | (b[o + 4 * i + 2] << 8) | b[o + 4 * i + 3];
      for (let i = 16; i < 80; i++) w[i] = rl(w[i - 3] ^ w[i - 8] ^ w[i - 14] ^ w[i - 16], 1);
      let [a, bb, c, d, e] = [h0, h1, h2, h3, h4];
      for (let i = 0; i < 80; i++) {
        const [f, k] = i < 20 ? [(bb & c) | (~bb & d), 0x5a827999] : i < 40 ? [bb ^ c ^ d, 0x6ed9eba1] : i < 60 ? [(bb & c) | (bb & d) | (c & d), 0x8f1bbcdc] : [bb ^ c ^ d, 0xca62c1d6];
        const t = (rl(a, 5) + f + e + k + w[i]) | 0; e = d; d = c; c = rl(bb, 30); bb = a; a = t;
      }
      h0 = (h0 + a) | 0; h1 = (h1 + bb) | 0; h2 = (h2 + c) | 0; h3 = (h3 + d) | 0; h4 = (h4 + e) | 0;
    }
    return [h0, h1, h2, h3, h4].map(v => (v >>> 0).toString(16).padStart(8, '0')).join('');
  }
  const semHtml = s => String(s).replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
  const html = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\r?\n/g, '<br>');
  const guid = () => { const c = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!#$%&()*+,-./:;<=>?@[]^_`{|}~'; let s = ''; for (let i = 0; i < 10; i++) s += c[Math.floor(Math.random() * c.length)]; return s; };
  // cartoes: [{frente, verso}] → bytes do .apkg
  function gerarApkg(cartoes, nomeBaralho, agora = Date.now()) {
    const seg = Math.floor(agora / 1000), mid = 1700000000000 + (agora % 1000000), did = agora;
    const nome = String(nomeBaralho || 'Própons IA').replace(/::+/g, ' - ').slice(0, 80) || 'Própons IA';
    const modelo = { id: mid, name: 'Própons IA (frente e verso)', type: 0, mod: seg, usn: -1, sortf: 0, did, tags: [], vers: [],
      flds: ['Frente', 'Verso'].map((n, ord) => ({ name: n, ord, sticky: false, rtl: false, font: 'Arial', size: 20, media: [] })),
      tmpls: [{ name: 'Cartão 1', ord: 0, qfmt: '{{Frente}}', afmt: '{{FrontSide}}\n\n<hr id=answer>\n\n{{Verso}}', did: null, bqfmt: '', bafmt: '' }],
      css: '.card { font-family: Arial, sans-serif; font-size: 20px; text-align: center; color: black; background-color: white; }',
      latexPre: '\\documentclass[12pt]{article}\n\\special{papersize=3in,5in}\n\\usepackage[utf8]{inputenc}\n\\usepackage{amssymb,amsmath}\n\\pagestyle{empty}\n\\setlength{\\parindent}{0in}\n\\begin{document}\n',
      latexPost: '\\end{document}', req: [[0, 'all', [0]]] };
    const baralhoPadrao = { id: 1, name: 'Default', conf: 1, desc: '', dyn: 0, collapsed: false, extendNew: 10, extendRev: 50, mod: seg, usn: 0, newToday: [0, 0], revToday: [0, 0], lrnToday: [0, 0], timeToday: [0, 0] };
    const baralho = Object.assign({}, baralhoPadrao, { id: did, name: nome, usn: -1, desc: 'Criado pela Própons IA' });
    const dconf = { 1: { id: 1, name: 'Default', autoplay: true, dyn: false, maxTaken: 60, mod: 0, usn: 0, replayq: true, timer: 0,
      new: { bury: true, delays: [1, 10], initialFactor: 2500, ints: [1, 4, 7], order: 1, perDay: 20, separate: true },
      rev: { bury: true, ease4: 1.3, fuzz: 0.05, ivlFct: 1, maxIvl: 36500, minSpace: 1, perDay: 100 },
      lapse: { delays: [10], leechAction: 0, leechFails: 8, minInt: 1, mult: 0 } } };
    const conf = { activeDecks: [1], curDeck: 1, newSpread: 0, collapseTime: 1200, timeLim: 0, estTimes: true, dueCounts: true, curModel: null, nextPos: 1, sortType: 'noteFld', sortBackwards: false, addToCur: true };
    const limpo = (cartoes || []).map(c => ({ f: String(c.frente || '').slice(0, 2800), v: String(c.verso || '').slice(0, 2800) })).filter(c => c.f.trim() && c.v.trim()).slice(0, 2000);
    if (!limpo.length) throw new Error('nenhum cartão');
    const notas = [], cards = [];
    limpo.forEach((c, i) => {
      const nid = agora + i, cid = agora + 100000 + i, frente = html(c.f), verso = html(c.v);
      notas.push({ rowid: nid, valores: [null, guid(), mid, seg, -1, ' propons ', frente + '\x1f' + verso, semHtml(frente), parseInt(sha1(semHtml(frente)).slice(0, 8), 16), 0, ''] });
      cards.push({ rowid: cid, valores: [null, nid, did, 0, seg, -1, 0, 0, i + 1, 0, 0, 0, 0, 0, 0, 0, 0, ''] });
    });
    const col = [{ rowid: 1, valores: [null, seg - 86400, agora, agora, 11, 0, 0, 0, JSON.stringify(conf), JSON.stringify({ [mid]: modelo }), JSON.stringify({ 1: baralhoPadrao, [did]: baralho }), JSON.stringify(dconf), '{}'] }];
    const banco = sqlite({ col, notes: notas, cards });
    return zip([{ nome: 'collection.anki2', dados: banco }, { nome: 'media', dados: enc.encode('{}') }]);
  }
  return { gerarApkg, sqlite, zip, sha1, varint };
})();
