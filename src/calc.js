/* ---------------- contas conferidas pelo app ----------------
   Modelo pequeno erra conta. Depois da resposta, cada conta simples escrita no texto ("12 × 7 = 84", "3,5 + 1,2 = 4,7",
   "(8 − 2) ÷ 3 = 2") é refeita aqui, com números de verdade; se o resultado estiver errado, ele é trocado pelo certo e
   um aviso curto vai no fim. Só números e + − × ÷ (e parênteses): nada de variáveis, datas, porcentagem ou código.
   Número ambíguo (1.500: mil e quinhentos ou um e meio?) deixa a conta como está. */
const CALC = (() => {
  const NUM = String.raw`\d+(?:[.,]\d+)*`;
  const OP = String.raw`\s*[-+−–×*÷/·:]\s*|\s+x\s+`;
  const TERMO = String.raw`\(*\s*-?${NUM}\s*\)*`;
  const RE = new RegExp(String.raw`(?<![\w.,/%^²³°$R€])(${TERMO}(?:(?:${OP})${TERMO})+)\s*=\s*(\*\*)?(-?${NUM})(\*\*)?(?![\w/%°²³]|[.,]\d|\s*%)`, 'g');
  // número no jeito brasileiro: vírgula decimal e ponto de milhar; "1.5" (ponto decimal) também vale
  function numero(s) {
    if (s.includes(',')) {
      if ((s.match(/,/g) || []).length > 1) return null;
      const [int, dec] = s.split(',');
      if (int.includes('.') && !/^\d{1,3}(\.\d{3})+$/.test(int)) return null;
      return { v: parseFloat(int.replace(/\./g, '') + '.' + dec), casas: dec.length, virgula: true };
    }
    if (s.includes('.')) {
      if (/^\d{1,3}(\.\d{3})+$/.test(s)) return null;   // 1.500 — ambíguo
      if ((s.match(/\./g) || []).length > 1) return null;
      return { v: parseFloat(s), casas: s.split('.')[1].length, virgula: false };
    }
    return { v: parseInt(s, 10), casas: 0, virgula: false };
  }
  // + − × ÷ com precedência e parênteses (descida recursiva); null se algo não fechar
  function calcular(expr) {
    const toks = []; let m; const re = new RegExp(String.raw`\s*(${NUM}|[-+−–×*÷/·:()]|x)`, 'gy');
    let pos = 0;
    while (pos < expr.length) {
      re.lastIndex = pos; m = re.exec(expr);
      if (!m) { if (/^\s*$/.test(expr.slice(pos))) break; return null; }
      toks.push(m[1]); pos = re.lastIndex;
    }
    let i = 0;
    const ver = () => toks[i];
    function fator() {
      const t = toks[i++];
      if (t === '(') { const v = soma(); if (toks[i++] !== ')') throw 0; return v; }
      if (t === '-' || t === '−' || t === '–') return -fator();
      const n = t && /^\d/.test(t) ? numero(t) : null; if (!n) throw 0;
      return n.v;
    }
    function produto() {
      let v = fator();
      while (['×', '*', '·', 'x', '÷', '/', ':'].includes(ver())) {
        const op = toks[i++], d = fator();
        if (op === '÷' || op === '/' || op === ':') { if (d === 0) throw 0; v /= d; } else v *= d;
      }
      return v;
    }
    function soma() {
      let v = produto();
      while (['+', '-', '−', '–'].includes(ver())) { const op = toks[i++], d = produto(); v = op === '+' ? v + d : v - d; }
      return v;
    }
    try { const v = soma(); return i === toks.length && isFinite(v) ? v : null; } catch (e) { return null; }
  }
  const bonito = (v, virgula) => {
    const r = Math.round(v * 10000) / 10000;
    const s = Number.isInteger(r) ? String(r) : String(r);
    return virgula || !Number.isInteger(r) ? s.replace('.', ',') : s;
  };
  function conferirContas(texto) {
    const correcoes = [];
    // fora de blocos de código e de `código`
    const partes = String(texto || '').split(/(```[\s\S]*?(?:```|$)|`[^`\n]*`)/);
    const novo = partes.map((p, k) => k % 2 ? p : p.replace(RE, (todo, expr, n1, dado, n2) => {
      // hífen colado é intervalo ("2020-2021", "10–20"), não conta
      if (/^\s*\d+[-–]\d+\s*$/.test(expr)) return todo;
      const certo = calcular(expr), d = numero(dado);
      if (certo == null || !d) return todo;
      const tol = 0.5 * Math.pow(10, -d.casas) + 1e-9;
      if (Math.abs(certo - d.v) <= tol) return todo;
      // resultado inteiro para uma divisão que não é exata: pode ser divisão inteira ("9 ÷ 4 = 2, resto 1"); fica
      if (d.casas === 0 && !Number.isInteger(Math.round(certo * 1e9) / 1e9) && Math.abs(certo - d.v) < 1) return todo;
      const novoN = bonito(certo, d.virgula || /,/.test(expr));
      correcoes.push({ expr: expr.trim(), dado, certo: novoN });
      return todo.slice(0, todo.length - (dado.length + (n2 || '').length)) + novoN + (n2 || '');
    })).join('');
    return { texto: novo, correcoes };
  }
  return { conferirContas, calcular };
})();
