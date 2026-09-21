/* ================= LaTeX → texto legível =================
   O modelo às vezes escreve $x^2$, \frac{a}{b}, \rightarrow... Convertemos para Unicode simples.
   Não mexe em blocos de código nem em `código`. Chaves aninhadas são respeitadas. */
function semLatex(src) {
  const SUB = { '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄', '5': '₅', '6': '₆', '7': '₇', '8': '₈', '9': '₉', '+': '₊', '-': '₋', '=': '₌', '(': '₍', ')': '₎', a: 'ₐ', e: 'ₑ', i: 'ᵢ', j: 'ⱼ', k: 'ₖ', n: 'ₙ', m: 'ₘ', o: 'ₒ', x: 'ₓ', t: 'ₜ' };
  const SUP = { '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹', '+': '⁺', '-': '⁻', '=': '⁼', '(': '⁽', ')': '⁾', n: 'ⁿ', i: 'ⁱ', x: 'ˣ', T: 'ᵀ' };
  const mapa = (t, M) => t && [...t].every(c => M[c]) ? [...t].map(c => M[c]).join('') : null;
  const CMD = { rightarrow: '→', to: '→', longrightarrow: '⟶', leftarrow: '←', Rightarrow: '⇒', Leftarrow: '⇐', Leftrightarrow: '⇔', leftrightarrow: '↔', implies: '⇒', iff: '⇔',
    times: '×', cdot: '·', div: '÷', pm: '±', mp: '∓', leq: '≤', le: '≤', geq: '≥', ge: '≥', neq: '≠', ne: '≠', approx: '≈', equiv: '≡', sim: '∼', propto: '∝', infty: '∞',
    pi: 'π', alpha: 'α', beta: 'β', gamma: 'γ', Gamma: 'Γ', delta: 'δ', Delta: 'Δ', epsilon: 'ε', varepsilon: 'ε', theta: 'θ', lambda: 'λ', mu: 'μ', rho: 'ρ', sigma: 'σ', Sigma: 'Σ',
    tau: 'τ', phi: 'φ', varphi: 'φ', Phi: 'Φ', omega: 'ω', Omega: 'Ω', sum: 'Σ', prod: '∏', int: '∫', oint: '∮', partial: '∂', nabla: '∇', in: '∈', notin: '∉', subset: '⊂', subseteq: '⊆',
    cup: '∪', cap: '∩', emptyset: '∅', forall: '∀', exists: '∃', neg: '¬', land: '∧', lor: '∨', angle: '∠', degree: '°', circ: '°', perp: '⊥', parallel: '∥', cdots: '⋯', ldots: '…', dots: '…',
    log: 'log', ln: 'ln', sin: 'sen', cos: 'cos', tan: 'tg', lim: 'lim', max: 'max', min: 'min', quad: ' ', qquad: '  ', '%': '%', '$': '$', '&': '&', '#': '#', '_': '_', '{': '{', '}': '}', ',': ' ', ';': ' ', ':': ' ', '!': '', ' ': ' ' };
  const BB = { R: 'ℝ', N: 'ℕ', Z: 'ℤ', Q: 'ℚ', C: 'ℂ' };

  // lê um grupo {…} (com aninhamento) ou um único caractere a partir de s[i]
  function grupo(s, i) {
    while (s[i] === ' ') i++;
    if (s[i] !== '{') return [s[i] || '', i + 1];
    let n = 0, j = i;
    for (; j < s.length; j++) { if (s[j] === '{') n++; else if (s[j] === '}' && --n === 0) break; }
    return [s.slice(i + 1, j), j + 1];
  }
  function conv(t) {
    let out = '', i = 0;
    while (i < t.length) {
      const c = t[i];
      if (c === '\\') {
        const m = t.slice(i + 1).match(/^([a-zA-Z]+|.)/); if (!m) { i++; continue; }
        const nome = m[1]; i += 1 + nome.length;
        if (nome === 'frac' || nome === 'dfrac' || nome === 'tfrac') {
          let a, b; [a, i] = grupo(t, i); [b, i] = grupo(t, i);
          const A = conv(a), B = conv(b);
          out += (/^[\w.²³]+$/.test(A) ? A : `(${A})`) + '/' + (/^[\w.²³]+$/.test(B) ? B : `(${B})`);
        } else if (nome === 'sqrt') {
          let idx = '';
          if (t[i] === '[') { const f = t.indexOf(']', i); idx = t.slice(i + 1, f); i = f + 1; }
          let a; [a, i] = grupo(t, i); const A = conv(a);
          out += (idx === '3' ? '∛' : idx === '4' ? '∜' : idx ? (mapa(idx, SUP) || idx) + '√' : '√') + (/^[\w.]+$/.test(A) ? A : `(${A})`);
        } else if (/^(text|mathrm|mathbf|mathit|operatorname|textbf|textit|mathsf|boldsymbol|vec|hat|bar|overline|underline)$/.test(nome)) {
          let a; [a, i] = grupo(t, i); out += conv(a);
        } else if (nome === 'mathbb') {
          let a; [a, i] = grupo(t, i); out += BB[a] || a;
        } else if (nome === 'left' || nome === 'right' || nome === 'big' || nome === 'Big' || nome === 'bigl' || nome === 'bigr' || nome === 'displaystyle') {
          if (t[i] === '.') i++; // \left. = delimitador vazio
        } else if (nome === 'begin' || nome === 'end') {
          let a; [a, i] = grupo(t, i); // ambientes: ignora o nome
        } else out += CMD[nome] !== undefined ? CMD[nome] : nome;
      } else if (c === '_' || c === '^') {
        let a; [a, i] = grupo(t, i + 1); const A = conv(a);
        out += mapa(A, c === '_' ? SUB : SUP) || (c + (A.length > 1 ? `(${A})` : A));
      } else if (c === '{' || c === '}') i++;
      else if (c === '&') i++;               // alinhamento de matrizes
      else if (c === '\\' ) i++;
      else { out += c; i++; }
    }
    return out.replace(/\\\\/g, '\n');
  }
  return String(src).split('```').map((p, i) => i % 2 ? p : p.split(/(`[^`]*`)/).map(q => q.startsWith('`') ? q :
    q.replace(/\$\$([\s\S]+?)\$\$/g, (a, m) => '\n\n' + conv(m).trim() + '\n\n')
     .replace(/\\\[([\s\S]+?)\\\]/g, (a, m) => '\n\n' + conv(m).trim() + '\n\n')
     .replace(/\\\(([\s\S]+?)\\\)/g, (a, m) => conv(m))
     .replace(/\$([^$\n]+?)\$/g, (a, m) => /\\|[_^]/.test(m) ? conv(m) : a)
     .replace(/\\([%&#])/g, '$1')).join('')).join('```');
}
