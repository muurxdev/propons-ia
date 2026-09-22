// Testes do renderizador (markdown.js) e do destaque de código (destaque.js).  node src/teste_markdown.js
const fs = require('fs'), vm = require('vm');
const ctx = { esc: s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])) };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(__dirname + '/destaque.js', 'utf8') + '\n' + fs.readFileSync(__dirname + '/markdown.js', 'utf8') + ';this.md=md;this.D=DESTAQUE;this.analisarResposta=analisarResposta;', ctx);
const { md, D, analisarResposta } = ctx;
let falhas = 0, total = 0;
const ok = (nome, cond, extra) => { total++; if (!cond) { falhas++; console.log('FALHOU:', nome, extra !== undefined ? '\n   ' + extra : ''); } };

// listas numeradas continuam depois de linha em branco
let h = md('1. um\n\n2. dois\n\n3. três');
ok('ol contínua', (h.match(/<ol/g) || []).length === 1 && (h.match(/<li>/g) || []).length === 3, h);
ok('ol começa em 3', /<ol start="3">/.test(md('3. c\n4. d')), md('3. c\n4. d'));
// lista aninhada
h = md('- a\n  - a1\n  - a2\n- b');
ok('aninhada', /<ul><li>a<ul><li>a1<\/li><li>a2<\/li><\/ul><\/li><li>b<\/li><\/ul>/.test(h), h);
// HTML do modelo é escapado
h = md('<script>alert(1)</script> <img src=x onerror=alert(1)>');
ok('escapa html', !/<script|<img/i.test(h) && /&lt;script&gt;/.test(h), h);
// link seguro e javascript: bloqueado
h = md('veja [site](https://exemplo.com/a?b=1&c=2) e [x](javascript:alert(1)) e https://github.com/muurxdev.');
ok('link https', /<a href="https:\/\/exemplo.com\/a\?b=1&amp;c=2" target="_blank" rel="noopener noreferrer">site<\/a>/.test(h), h);
ok('sem javascript:', !/href="javascript/i.test(h), h);
ok('autolink sem ponto final', /href="https:\/\/github.com\/muurxdev"/.test(h), h);
// código inline protegido
h = md('use `**kwargs` e `a*b*c` mas **isto** é negrito e 2*3*4 não é itálico');
ok('code sem negrito', /<code>\*\*kwargs<\/code>/.test(h) && /<code>a\*b\*c<\/code>/.test(h) && /<b>isto<\/b>/.test(h) && !/<i>3<\/i>/.test(h), h);
// snake_case não vira itálico
ok('snake_case', !/<i>/.test(md('a variavel minha_var_x fica')), md('a variavel minha_var_x fica'));
// fence com linguagem c++ e sem fechar (streaming)
h = md('```c++\nint main(){ return 0; }\n```');
ok('fence c++', /data-lang="C\/C\+\+"/.test(h) && /tk-kw">int</.test(h) && !/c\+\+\n?<\/?/.test(h.replace(/data-lang="[^"]*"/, '')), h);
h = md('texto\n```python\ndef f(x):\n    return x  # comentário');
ok('fence aberta', /<pre data-lang="Python"><code>/.test(h) && /tk-kw">def</.test(h) && /tk-com"># comentário/.test(h), h);
ok('fence ~~~', /<pre/.test(md('~~~\nx = 1\n~~~')));
// citação, separador, títulos
ok('citação', /<blockquote><p>dica<\/p><\/blockquote>/.test(md('> dica')), md('> dica'));
ok('hr', /<hr>/.test(md('a\n\n---\n\nb')));
ok('h5', /<h5>/.test(md('#### quatro')));
// tabela com pipe escapado
h = md('| a | b |\n|---|---|\n| 1 \\| 2 | 3 |');
ok('tabela', /<th>a<\/th><th>b<\/th>/.test(h) && /<td>1 \| 2<\/td><td>3<\/td>/.test(h), h);
// quebras de linha dentro do parágrafo
ok('br', /um<br>dois/.test(md('um\ndois')));
// destaque não perde texto
const exemplos = {
  python: 'def soma(a, b):\n    """doc"""\n    return a + b  # ok\nprint(soma(1, 2.5))',
  js: 'const x = `t ${1}`; // c\nfunction f(a){ return a*2 }',
  java: 'public class A { public static void main(String[] a){ System.out.println("oi"); } }',
  c: '#include <stdio.h>\nint main(){ printf("%d\\n", 0x1F); return 0; }',
  sql: 'SELECT nome FROM alunos WHERE nota >= 7 -- aprovados',
  bash: 'echo "$HOME" # casa\nsudo apt install curl',
  html: '<div class="a">oi<!-- c --></div>', css: '.a { color: #fff; margin: 2px; }', json: '{"a": [1, true, null]}',
  rust: 'fn main() { let v = vec![1]; println!("{}", v.len()); }', go: 'func main() { fmt.Println("oi") }',
};
for (const [l, c] of Object.entries(exemplos)) {
  const saida = D.destacar(c, l);
  const texto = saida.replace(/<[^>]+>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&amp;/g, '&');
  ok('destaque sem perda: ' + l, texto === c, saida);
  ok('destaque colore: ' + l, /tk-/.test(saida), saida);
}
ok('destaque escapa', !/<script/.test(D.destacar('<script>x</script>', 'js')));

// streaming: para QUALQUER prefixo da resposta, md(parte fixa) + md(resto) tem de dar o mesmo HTML que md(prefixo)
// (senão o texto já desenhado ficaria diferente do desenho final)
const resposta = '# Quick sort\n\nO **quick sort** escolhe um pivô e divide a lista.\n\nPassos:\n\n1. escolhe o pivô\n2. separa\n\n3. junta\n\n- vantagem: rápido\n  - em média O(n log n)\n\n- desvantagem: pior caso\n\n```python\ndef quick(v):\n    if len(v) < 2:\n        return v\n\n    p = v[0]\n    return quick([x for x in v[1:] if x < p]) + [p] + quick([x for x in v[1:] if x >= p])\n```\n\nTabela:\n\n| caso | custo |\n|---|---|\n| médio | n log n |\n| pior | n² |\n\n> citação\n> continua\n\n~~~~\nbloco com ~~~ dentro\n~~~~\n\nFim.';
let ruins = 0, fixos = 0;
for (let n = 1; n <= resposta.length; n++) {
  const p = resposta.slice(0, n), { fixo, cerca } = analisarResposta(p);
  if (fixo > 0) fixos++;
  if (md(p.slice(0, fixo)) + md(p.slice(fixo)) !== md(p)) { ruins++; if (ruins < 3) console.log('   prefixo', n, JSON.stringify(p.slice(Math.max(0, fixo - 20), fixo + 20))); }
  if (cerca && (cerca.pos < fixo || p.slice(cerca.codigo).includes('```\n'))) { ruins++; console.log('   cerca errada no prefixo', n); }
}
ok('streaming: parte fixa + resto == tudo (todos os prefixos)', ruins === 0, ruins + ' prefixos ruins');
ok('streaming: a parte fixa avança', fixos > resposta.length / 2, fixos);
let a = analisarResposta('texto\n\n```js\nlet x = 1;\nlet y');
ok('streaming: bloco aberto detectado', a.cerca && a.cerca.lang === 'js' && a.fixo === 7 && 'texto\n\n```js\nlet x = 1;\nlet y'.slice(a.cerca.codigo) === 'let x = 1;\nlet y', JSON.stringify(a));
a = analisarResposta('```py\nx\n```\ndepois');
ok('streaming: fim do bloco de código é ponto fixo', !a.cerca && a.fixo === 12, JSON.stringify(a));
a = analisarResposta('1. um\n\n2. dois\n');
ok('streaming: linha em branco antes de item não separa a lista', a.fixo === 0, JSON.stringify(a));
console.log(`${total - falhas}/${total} testes OK`);
process.exit(falhas ? 1 : 0);
