/* ---------------- gráfico de função (a conta é do app, não do modelo) ----------------
   "gráfico de f(x) = x² − 4", "esboce y = 2x + 1", "plote sen(x)": o app lê a função, desenha e calcula raízes,
   onde corta o eixo y e os pontos de máximo/mínimo. Os números da função viram controles deslizantes (a, b, c, d).
   Aceita: números (vírgula ou ponto), x, + − × ÷ ^ ² ³, parênteses, multiplicação implícita (2x, 3(x+1)),
   sen/sin cos tg/tan raiz/sqrt log ln abs exp, pi/π e e. Nada de eval: a função vira uma árvore e é calculada aqui. */
const GRAFICO = (() => {
  const FUNCOES = { sen: Math.sin, sin: Math.sin, cos: Math.cos, tg: Math.tan, tan: Math.tan, raiz: Math.sqrt, sqrt: Math.sqrt,
    log: Math.log10, ln: Math.log, abs: Math.abs, exp: Math.exp };
  const CONST = { pi: Math.PI, 'π': Math.PI, e: Math.E };
  function tokens(s) {
    s = String(s).toLowerCase().replace(/²/g, '^2').replace(/³/g, '^3').replace(/[−–]/g, '-').replace(/[×·]/g, '*').replace(/÷/g, '/').replace(/√/g, 'raiz');
    const r = []; let i = 0;
    while (i < s.length) {
      const c = s[i];
      if (/\s/.test(c)) { i++; continue; }
      const n = /^\d+(?:[.,]\d+)?/.exec(s.slice(i));
      if (n) { r.push({ t: 'n', v: parseFloat(n[0].replace(',', '.')) }); i += n[0].length; continue; }
      const w = /^(sen|sin|cos|tg|tan|raiz|sqrt|log|ln|abs|exp|pi|π|x|e)/.exec(s.slice(i));
      if (w) { const k = w[0]; r.push(FUNCOES[k] ? { t: 'f', f: k } : k === 'x' ? { t: 'x' } : { t: 'c', v: CONST[k] }); i += k.length; continue; }
      if ('+-*/^()'.includes(c)) { r.push({ t: c }); i++; continue; }
      return null;   // letra ou símbolo que não é de função: não é gráfico que o app saiba fazer
    }
    return r;
  }
  function analisar(texto) {
    const tk = tokens(texto); if (!tk || !tk.length) return null;
    let i = 0, emExpoente = 0;
    const ver = () => tk[i] && tk[i].t;
    const comecaAtomo = () => ['n', 'x', 'c', 'f', '('].includes(ver());
    function atomo() {
      const k = tk[i++]; if (!k) throw 0;
      if (k.t === 'n') return { t: 'n', v: k.v, param: !emExpoente };
      if (k.t === 'x') return { t: 'x' };
      if (k.t === 'c') return { t: 'k', v: k.v };
      if (k.t === '(') { const e = soma(); if (ver() !== ')') throw 0; i++; return e; }
      if (k.t === 'f') { const a = ver() === '(' ? atomo() : potencia(); return { t: 'f', f: k.f, a }; }
      throw 0;
    }
    function potencia() {
      const b = atomo();
      if (ver() === '^') { i++; emExpoente++; const e = unario(); emExpoente--; return { t: '^', a: b, b: e }; }
      return b;
    }
    function unario() {
      if (ver() === '-') { i++; return { t: 'neg', a: unario() }; }
      if (ver() === '+') { i++; return unario(); }
      return potencia();
    }
    function produto() {
      let v = unario();
      for (;;) {
        if (ver() === '*' || ver() === '/') { const o = tk[i++].t; v = { t: o, a: v, b: unario() }; }
        else if (comecaAtomo()) v = { t: '*', a: v, b: potencia() };   // 2x, 3(x+1), x sen(x)
        else return v;
      }
    }
    function soma() {
      let v = produto();
      while (ver() === '+' || ver() === '-') { const o = tk[i++].t; v = { t: o, a: v, b: produto() }; }
      return v;
    }
    try {
      const arv = soma(); if (i !== tk.length) return null;
      let temX = false; (function andar(n) { if (!n) return; if (n.t === 'x') temX = true; andar(n.a); andar(n.b); })(arv);
      if (!temX) return null;
      // até 4 números viram controles (a, b, c, d); expoentes ficam fixos
      const params = []; (function andar(n) { if (!n) return; if (n.t === 'n' && n.param && params.length < 4) { n.p = params.length; params.push(n.v); } andar(n.a); andar(n.b); })(arv);
      return { arv, params };
    } catch (e) { return null; }
  }
  function valor(n, x, p) {
    switch (n.t) {
      case 'n': return n.p != null && p ? p[n.p] : n.v;
      case 'x': return x;
      case 'k': return n.v;
      case 'neg': return -valor(n.a, x, p);
      case 'f': return FUNCOES[n.f](valor(n.a, x, p));
      case '^': return Math.pow(valor(n.a, x, p), valor(n.b, x, p));
      case '*': return valor(n.a, x, p) * valor(n.b, x, p);
      case '/': return valor(n.a, x, p) / valor(n.b, x, p);
      case '+': return valor(n.a, x, p) + valor(n.b, x, p);
      case '-': return valor(n.a, x, p) - valor(n.b, x, p);
    }
    return NaN;
  }
  // a função escrita de volta (com os valores atuais dos controles), no jeito de caderno
  const num = v => { const r = Math.round(v * 100) / 100; return String(r).replace('.', ','); };
  const PREC = { '+': 1, '-': 1, '*': 2, '/': 2, neg: 3, '^': 4 };
  function texto(n, p) {
    const par = (f, pai, dir) => { const s = texto(f, p); return (PREC[f.t] && PREC[f.t] < PREC[pai]) || (dir && PREC[f.t] === PREC[pai] && (pai === '-' || pai === '/')) ? '(' + s + ')' : s; };
    switch (n.t) {
      case 'n': return num(n.p != null && p ? p[n.p] : n.v);
      case 'x': return 'x';
      case 'k': return n.v === Math.PI ? 'π' : 'e';
      case 'neg': return '−' + par(n.a, 'neg');
      case 'f': return n.f + '(' + texto(n.a, p) + ')';
      case '^': { const e = texto(n.b, p); return par(n.a, '^') + (e === '2' ? '²' : e === '3' ? '³' : '^' + (n.b.t === 'n' ? e : '(' + e + ')')); }
      case '*': {
        const a = par(n.a, '*'), b = par(n.b, '*', true);
        if (/^[x(πe]|^[a-z]/.test(b) && (a === '1' || a === '-1')) return (a === '-1' ? '−' : '') + b;   // 1x² → x²
        return /^[x(πe]|^[a-z]/.test(b) && /[\d)²³]$/.test(a) ? a + b : a + ' · ' + b;
      }
      case '/': return par(n.a, '/') + ' / ' + par(n.b, '/', true);
      case '+': { const b = par(n.b, '+', true); return par(n.a, '+') + (/^[-−]/.test(b) ? ' − ' + b.slice(1) : ' + ' + b); }
      case '-': { const b = par(n.b, '-', true); return par(n.a, '-') + (/^[-−]/.test(b) ? ' + ' + b.slice(1) : ' − ' + b); }
    }
    return '';
  }
  /* pontos notáveis dentro do intervalo: raízes (troca de sinal + bisseção), onde corta o eixo y e máximos/mínimos */
  function estudar(f, de, ate) {
    const N = 800, xs = [], ys = [];
    for (let k = 0; k <= N; k++) { const x = de + (ate - de) * k / N; xs.push(x); ys.push(f(x)); }
    const raizes = [], extremos = [];
    const ok = y => isFinite(y) && Math.abs(y) < 1e12;
    for (let k = 0; k < N; k++) {
      const y1 = ys[k], y2 = ys[k + 1]; if (!ok(y1) || !ok(y2)) continue;
      if (y1 === 0) { raizes.push(xs[k]); continue; }
      if (y1 * y2 < 0 && Math.abs(y1 - y2) < 1e6) {
        let a = xs[k], b = xs[k + 1];
        for (let j = 0; j < 50; j++) { const m = (a + b) / 2; if (f(a) * f(m) <= 0) b = m; else a = m; }
        raizes.push((a + b) / 2);
      }
    }
    for (let k = 1; k < N; k++) {
      const [a, b, c] = [ys[k - 1], ys[k], ys[k + 1]]; if (![a, b, c].every(ok)) continue;
      if ((b > a && b > c) || (b < a && b < c)) {
        let l = xs[k - 1], r = xs[k + 1];   // refina pelo método da seção áurea
        const max = b > a;
        for (let j = 0; j < 60; j++) { const m1 = l + (r - l) / 3, m2 = r - (r - l) / 3; if ((f(m1) < f(m2)) === max) l = m1; else r = m2; }
        const x = (l + r) / 2; extremos.push({ x, y: f(x), tipo: max ? 'máximo' : 'mínimo' });
      }
    }
    const y0 = de <= 0 && ate >= 0 && ok(f(0)) ? f(0) : null;
    const lim = (l, n) => l.filter((v, k, t) => k === 0 || Math.abs((v.x != null ? v.x : v) - (t[k - 1].x != null ? t[k - 1].x : t[k - 1])) > (ate - de) / 400).slice(0, n);
    return { xs, ys, raizes: lim(raizes, 6), extremos: lim(extremos, 6), y0 };
  }
  // "gráfico de f(x) = …", "esboce y = …", "plote sen(x)" → a função e o intervalo (de −10 a 10, ou o que for pedido)
  const RE_PEDIDO = /\b(gr[áa]fico|plot[ea]r?|plote|esbo[çc][oa]r?|esboce|desenh[ea]r?|desenhe|trace|tra[çc]ar)\b/i;
  function pedido(textoPergunta) {
    const t = String(textoPergunta || '');
    if (!RE_PEDIDO.test(t)) return null;
    let m = /(?:f\s*\(\s*x\s*\)|g\s*\(\s*x\s*\)|\by)\s*=\s*([^?;\n]+)/i.exec(t);
    let expr = m ? m[1] : null;
    if (!expr) { m = /(?:fun[çc][ãa]o|gr[áa]fico(?: d[aoe])?|plote|esboce|desenhe)\s+((?:sen|sin|cos|tg|tan|raiz|sqrt|log|ln|abs|exp)\s*\(?[^?;\n]+)/i.exec(t); expr = m ? m[1] : null; }
    if (!expr) return null;
    // tira o que vem depois da função ("para x de -5 a 5", "e explique", ponto final)
    expr = expr.split(/\s+(?:para|com|de\s+x|no\s+intervalo|entre|e\s+(?:explique|mostre|diga|me)|,\s*(?:e|explique))\b/i)[0].replace(/[.,:]\s*$/, '').trim();
    const a = analisar(expr); if (!a) return null;
    let de = -10, ate = 10;
    const iv = /(?:de|entre)\s*x?\s*=?\s*(-?\d+(?:[.,]\d+)?)\s*(?:a|e|at[ée])\s*(-?\d+(?:[.,]\d+)?)/i.exec(t.slice(t.indexOf(expr) + expr.length));
    if (iv) { const p = +iv[1].replace(',', '.'), q = +iv[2].replace(',', '.'); if (q > p) { de = p; ate = q; } }
    return { expr, de, ate };
  }
  // o que o modelo recebe: números calculados aqui (ele só explica)
  function fatos(g, p) {
    const a = analisar(g.expr); if (!a) return '';
    const vals = p || a.params, f = x => valor(a.arv, x, vals), e = estudar(f, g.de, g.ate);
    const r = e.raizes.map(x => 'x ≈ ' + num(x)).join(', ');
    const ex = e.extremos.map(v => `${v.tipo} em (${num(v.x)}; ${num(v.y)})`).join(', ');
    return `O app já desenhou para a pessoa o gráfico de f(x) = ${texto(a.arv, vals)}, com x de ${num(g.de)} a ${num(g.ate)}, e ela pode mexer nos números. Dados calculados pelo app (use estes, não recalcule): `
      + (r ? `raízes: ${r}` : 'não corta o eixo x nesse intervalo') + (e.y0 != null ? `; corta o eixo y em ${num(e.y0)}` : '') + (ex ? `; ${ex}` : '')
      + '. Explique a função: o que ela representa, a forma do gráfico e esses pontos. Não desenhe o gráfico em texto.';
  }
  return { analisar, valor, texto, estudar, pedido, fatos, num };
})();
