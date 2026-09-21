/* ================= DESTAQUE DE CÓDIGO (leve, sem bibliotecas) =================
   destacar(codigo, linguagem) → HTML já escapado com <span class="tk-…">. */
const DESTAQUE = (() => {
  const P = s => new Set(s.split(' '));
  const KW = {
    python: P('and as assert async await break class continue def del elif else except False finally for from global if import in is lambda None nonlocal not or pass raise return True try while with yield match case self print len range input int float str list dict set tuple open'),
    js: P('async await break case catch class const continue debugger default delete do else export extends false finally for from function if import in instanceof let new null of return static super switch this throw true try typeof undefined var void while with yield console document window interface type enum implements private public protected readonly as keyof'),
    c: P('auto break case char const continue default do double else enum extern float for goto if inline int long register return short signed sizeof static struct switch typedef union unsigned void volatile while bool true false NULL nullptr class public private protected virtual override template typename namespace using new delete this throw try catch const_cast static_cast std cout cin endl include define printf scanf malloc free string vector'),
    java: P('abstract assert boolean break byte case catch char class const continue default do double else enum extends final finally float for if implements import instanceof int interface long native new null package private protected public return short static super switch synchronized this throw throws transient try void volatile while true false var record String System Math'),
    cs: P('abstract as base bool break byte case catch char checked class const continue decimal default delegate do double else enum event explicit extern false finally fixed float for foreach goto if implicit in int interface internal is lock long namespace new null object operator out override params private protected public readonly ref return sbyte sealed short sizeof static string struct switch this throw true try typeof uint ulong unchecked unsafe ushort using var virtual void volatile while async await Console'),
    go: P('break case chan const continue default defer else fallthrough for func go goto if import interface map package range return select struct switch type var true false nil int string bool error fmt make len append'),
    rust: P('as async await break const continue crate dyn else enum extern false fn for if impl in let loop match mod move mut pub ref return self Self static struct super trait true type unsafe use where while println vec String Vec Option Some None Ok Err'),
    php: P('abstract and array as break callable case catch class clone const continue declare default do echo else elseif empty enddeclare endfor endforeach endif endswitch endwhile extends final finally fn for foreach function global goto if implements include instanceof interface isset list match namespace new null or print private protected public require return static switch throw trait try unset use var while true false'),
    sql: P('select from where and or not insert into values update set delete create table drop alter add primary key foreign references join left right inner outer on group by order having limit offset as distinct null is in like between count sum avg min max union all case when then else end index view default unique int integer varchar text date char float decimal boolean'),
    bash: P('if then else elif fi for while do done case esac function in return exit echo export local read cd ls sudo apt dnf pacman cat grep sed awk'),
    kotlin: P('as break class continue do else false for fun if in interface is null object package return super this throw true try typealias val var when while override private public internal open data println'),
    swift: P('associatedtype class deinit enum extension fileprivate func import init inout internal let open operator private protocol public static struct subscript typealias var break case continue default defer do else fallthrough for guard if in repeat return switch where while as false is nil self Self super throw throws true try print'),
  };
  const ALIAS = { py: 'python', python3: 'python', javascript: 'js', node: 'js', ts: 'js', typescript: 'js', jsx: 'js', tsx: 'js', json: 'json',
    'c++': 'c', cpp: 'c', cc: 'c', h: 'c', hpp: 'c', arduino: 'c', 'c#': 'cs', csharp: 'cs', golang: 'go', rs: 'rust', sh: 'bash', shell: 'bash', zsh: 'bash',
    console: 'bash', terminal: 'bash', kt: 'kotlin', mysql: 'sql', postgresql: 'sql', sqlite: 'sql', html: 'html', xml: 'html', svg: 'html', vue: 'html', css: 'css', scss: 'css' };
  const NOME = { python: 'Python', js: 'JavaScript', c: 'C/C++', java: 'Java', cs: 'C#', go: 'Go', rust: 'Rust', php: 'PHP', sql: 'SQL', bash: 'Terminal',
    kotlin: 'Kotlin', swift: 'Swift', html: 'HTML', css: 'CSS', json: 'JSON' };
  const esc = s => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const sp = (c, t) => `<span class="tk-${c}">${esc(t)}</span>`;

  function normal(lang) {
    lang = (lang || '').toLowerCase().trim();
    if (ALIAS[lang]) return ALIAS[lang];
    return KW[lang] || lang === 'html' || lang === 'css' || lang === 'json' ? lang : '';
  }
  function rotulo(lang) { const n = normal(lang); return NOME[n] || (lang ? lang : 'Código'); }

  // tokenizador genérico por regras: [classe, regex]
  function regras(lang) {
    const hash = ['python', 'bash'].includes(lang), sqlc = lang === 'sql';
    const R = [];
    if (lang === 'python') R.push(['str', /("""[\s\S]*?(?:"""|$)|'''[\s\S]*?(?:'''|$))/y]);
    if (hash) R.push(['com', /#[^\n]*/y]);
    else if (sqlc) R.push(['com', /--[^\n]*/y]);
    else R.push(['com', /\/\/[^\n]*|\/\*[\s\S]*?(?:\*\/|$)/y]);
    if (lang === 'python' || lang === 'js' || lang === 'java' || lang === 'kotlin' || lang === 'swift') R.push(['dec', /@[A-Za-z_]\w*/y]);
    if (lang === 'c') R.push(['pre', /#\s*[a-z]+[^\n]*/y]);
    if (lang === 'bash') R.push(['var', /\$\{?[A-Za-z_]\w*\}?/y]);
    R.push(['str', /"(?:[^"\\\n]|\\.)*"?|'(?:[^'\\\n]|\\.)*'?/y]);
    if (lang === 'js' || lang === 'go') R.push(['str', /`(?:[^`\\]|\\[\s\S])*`?/y]);
    R.push(['num', /\b(?:0[xX][\da-fA-F_]+|0[bB][01_]+|\d[\d_]*(?:\.\d+)?(?:[eE][+-]?\d+)?)[fFlLuU]?\b/y]);
    R.push(['id', /[A-Za-z_$][\w$]*/y]);
    R.push(['op', /[+\-*/%=<>!&|^~?:]+/y]);
    R.push(['txt', /\s+|[\s\S]/y]);
    return R;
  }

  function generico(codigo, lang) {
    const R = regras(lang), kw = KW[lang] || new Set(), sqlc = lang === 'sql';
    let i = 0, out = '';
    while (i < codigo.length) {
      let achou = false;
      for (const [cls, re] of R) {
        re.lastIndex = i;
        const m = re.exec(codigo);
        if (!m || !m[0]) continue;
        const t = m[0]; achou = true; i += t.length;
        if (cls === 'id') {
          const chave = sqlc ? t.toLowerCase() : t;
          if (kw.has(chave)) out += sp('kw', t);
          else if (/^\s*\(/.test(codigo.slice(i, i + 40))) out += sp('fn', t);
          else if (/^[A-Z][a-z]/.test(t) && lang !== 'sql') out += sp('tipo', t);
          else out += esc(t);
        } else if (cls === 'txt' || cls === 'op') out += cls === 'op' ? sp('op', t) : esc(t);
        else out += sp(cls, t);
        break;
      }
      if (!achou) { out += esc(codigo[i]); i++; }
    }
    return out;
  }

  function html(codigo) {
    return codigo.replace(/(<!--[\s\S]*?-->)|(<\/?)([\w-]+)([^>]*)(>?)|([^<]+)/g, (m, com, abre, tag, attrs, fecha, texto) => {
      if (com) return sp('com', com);
      if (texto !== undefined) return esc(texto);
      const a = attrs.replace(/([\w-:@]+)(\s*=\s*)?("[^"]*"|'[^']*')?/g, (x, n, eq, v) => sp('attr', n) + (eq ? esc(eq) : '') + (v ? sp('str', v) : ''));
      return esc(abre) + sp('kw', tag) + a + esc(fecha);
    });
  }
  function css(codigo) {
    return codigo.replace(/(\/\*[\s\S]*?\*\/)|("[^"]*"|'[^']*')|(#[\da-fA-F]{3,8}\b|\b\d+(?:\.\d+)?(?:px|em|rem|%|vh|vw|s|ms)?\b)|([\w-]+)(?=\s*:)|([^{}]+?)(?=\s*\{)|([\s\S])/g,
      (m, com, str, num, prop, sel, outro) => com ? sp('com', com) : str ? sp('str', str) : num ? sp('num', num) : prop ? sp('attr', prop) : sel ? sp('fn', sel) : esc(outro));
  }
  function json(codigo) {
    return codigo.replace(/("(?:[^"\\]|\\.)*")(\s*:)?|(\b-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?\b)|\b(true|false|null)\b|([\s\S])/g,
      (m, s, dois, num, lit, outro) => s ? (dois ? sp('attr', s) + esc(dois) : sp('str', s)) : num ? sp('num', num) : lit ? sp('kw', lit) : esc(outro));
  }

  function destacar(codigo, lang) {
    const n = normal(lang);
    try {
      if (codigo.length > 60000) return esc(codigo);
      if (n === 'html') return html(codigo);
      if (n === 'css') return css(codigo);
      if (n === 'json') return json(codigo);
      if (KW[n]) return generico(codigo, n);
    } catch (e) {}
    return esc(codigo);
  }
  return { destacar, rotulo, normal };
})();
