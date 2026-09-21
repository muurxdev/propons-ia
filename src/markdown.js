/* ================= MARKDOWN =================
   md(texto) → HTML seguro. Todo texto é escapado antes; só geramos tags conhecidas.
   Suporta: títulos, parágrafos, listas (aninhadas, numeração contínua), citações, ---, tabelas,
   blocos de código com linguagem (``` ou ~~~, inclusive sem fechar durante o streaming),
   `código`, **negrito**, *itálico*, ~~riscado~~, [links](https://…) e links soltos. */
function inline(s) {
  // s chega SEM escape; protege os trechos de código antes de qualquer formatação
  const cods = [];
  s = s.replace(/(`+)([\s\S]*?[^`])\1(?!`)/g, (m, c, t) => { cods.push(t.trim() === '' ? t : t.replace(/^ (.*) $/, '$1')); return '\u0000' + (cods.length - 1) + '\u0000'; });
  s = esc(s);
  const links = [];
  const guardaLink = (texto, url) => {
    if (!/^https?:\/\/[^\s<>"]+$/i.test(url)) return texto;
    links.push(`<a href="${url}" target="_blank" rel="noopener noreferrer">${texto}</a>`);
    return '\u0001' + (links.length - 1) + '\u0001';
  };
  s = s.replace(/\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\)/g, (m, t, u) => guardaLink(t, u));
  s = s.replace(/(^|[\s(])(https?:\/\/[^\s<]+[^\s<.,;:!?)\]'"])/g, (m, a, u) => a + guardaLink(u, u));
  s = s.replace(/\*\*(?=\S)([\s\S]*?\S)\*\*/g, '<b>$1</b>')
       .replace(/(^|[^\w])__(?=\S)([\s\S]*?\S)__(?!\w)/g, '$1<b>$2</b>')
       .replace(/(^|[^\w*])\*(?=[^\s*])([^*\n]*?[^\s*])\*(?![\w*])/g, '$1<i>$2</i>')
       .replace(/(^|[^\w])_(?=[^\s_])([^_\n]*?[^\s_])_(?!\w)/g, '$1<i>$2</i>')
       .replace(/~~(?=\S)([^~\n]*?\S)~~/g, '<s>$1</s>');
  s = s.replace(/\u0001(\d+)\u0001/g, (m, i) => links[+i]);
  return s.replace(/\u0000(\d+)\u0000/g, (m, i) => `<code>${esc(cods[+i])}</code>`);
}

function md(src) {
  const linhas = String(src).replace(/\r\n?/g, '\n').split('\n');
  let i = 0;
  const out = [];
  const ind = l => l.match(/^ */)[0].length;
  const itemRe = /^( *)([-*+]|\d{1,9}[.)])\s+(.*)$/;

  function bloco(fim) {
    const html = [];
    while (i < fim) {
      const l = linhas[i];
      // bloco de código
      let f = l.match(/^ {0,3}(`{3,}|~{3,})\s*([^`\s]*)[^`]*$/);
      if (f) {
        const cerca = f[1], lang = f[2] || '';
        const cod = []; i++;
        while (i < fim && !new RegExp('^ {0,3}' + cerca[0] + '{' + cerca.length + ',}\\s*$').test(linhas[i])) cod.push(linhas[i++]);
        const fechado = i < fim; if (fechado) i++;
        const texto = cod.join('\n');
        html.push(`<pre data-lang="${esc(DESTAQUE.rotulo(lang))}"><code>${DESTAQUE.destacar(texto, lang)}</code></pre>`);
        continue;
      }
      if (/^\s*$/.test(l)) { i++; continue; }
      // título
      let m = l.match(/^ {0,3}(#{1,6})\s+(.*?)\s*#*\s*$/);
      if (m) { const n = Math.min(m[1].length + 1, 5); html.push(`<h${n}>${inline(m[2])}</h${n}>`); i++; continue; }
      // separador
      if (/^ {0,3}([-*_])(\s*\1){2,}\s*$/.test(l)) { html.push('<hr>'); i++; continue; }
      // citação
      if (/^ {0,3}>/.test(l)) {
        const q = [];
        while (i < fim && /^ {0,3}>/.test(linhas[i])) q.push(linhas[i++].replace(/^ {0,3}> ?/, ''));
        html.push(`<blockquote>${md(q.join('\n'))}</blockquote>`);
        continue;
      }
      // tabela (cabeçalho + linha de separação)
      if (/\|/.test(l) && i + 1 < fim && /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(linhas[i + 1])) {
        const celulas = r => r.trim().replace(/^\||\|$/g, '').split(/(?<!\\)\|/).map(c => inline(c.trim().replace(/\\\|/g, '|')));
        const cab = celulas(l); i += 2;
        const corpo = [];
        while (i < fim && /\|/.test(linhas[i]) && !/^\s*$/.test(linhas[i])) corpo.push(celulas(linhas[i++]));
        html.push('<div class="tabela"><table><thead><tr>' + cab.map(c => `<th>${c}</th>`).join('') + '</tr></thead><tbody>' +
          corpo.map(r => '<tr>' + r.map(c => `<td>${c}</td>`).join('') + '</tr>').join('') + '</tbody></table></div>');
        continue;
      }
      // lista
      m = l.match(itemRe);
      if (m) { html.push(lista(fim, ind(l))); continue; }
      // parágrafo
      const p = [];
      while (i < fim && !/^\s*$/.test(linhas[i]) && !itemRe.test(linhas[i]) && !/^ {0,3}(`{3,}|~{3,}|#{1,6}\s|>)/.test(linhas[i]) &&
             !(/\|/.test(linhas[i]) && i + 1 < fim && /^\s*\|?\s*:?-{2,}/.test(linhas[i + 1]))) p.push(linhas[i++]);
      html.push(`<p>${p.map(x => inline(x.trim())).join('<br>')}</p>`);
    }
    return html.join('');
  }

  function lista(fim, base) {
    const primeira = linhas[i].match(itemRe);
    const ordenada = /\d/.test(primeira[2]);
    const inicio = ordenada ? parseInt(primeira[2], 10) : 1;
    const itens = [];
    while (i < fim) {
      const l = linhas[i];
      const m = l.match(itemRe);
      if (m && ind(l) === base && /\d/.test(m[2]) === ordenada) {
        // item: conteúdo = resto da linha + linhas seguintes mais indentadas (incluindo sublistas)
        const conteudo = [m[3]]; i++;
        while (i < fim) {
          const s = linhas[i];
          if (/^\s*$/.test(s)) {
            // linha em branco: continua a lista se a próxima linha for item do mesmo nível ou conteúdo indentado
            let j = i + 1; while (j < fim && /^\s*$/.test(linhas[j])) j++;
            if (j < fim && (ind(linhas[j]) > base || (itemRe.test(linhas[j]) && ind(linhas[j]) === base))) { i = j; if (ind(linhas[j]) > base) conteudo.push(''); continue; }
            break;
          }
          if (ind(s) > base) { conteudo.push(s.slice(Math.min(ind(s), base + 2 + (ordenada ? 1 : 0)))); i++; continue; }
          break;
        }
        const temBloco = conteudo.length > 1 && conteudo.slice(1).some(x => itemRe.test(x) || /^(`{3,}|~{3,})/.test(x.trim()));
        let corpo;
        if (temBloco) {
          // renderiza o conteúdo do item como mini-documento (sublistas, código)
          corpo = inline(conteudo[0]) + md(conteudo.slice(1).join('\n'));
        } else corpo = conteudo.filter(x => x !== '').map(x => inline(x.trim())).join('<br>');
        itens.push(`<li>${corpo}</li>`);
        continue;
      }
      break;
    }
    const tag = ordenada ? 'ol' : 'ul';
    return `<${tag}${ordenada && inicio !== 1 ? ` start="${inicio}"` : ''}>${itens.join('')}</${tag}>`;
  }

  out.push(bloco(linhas.length));
  return out.join('');
}
