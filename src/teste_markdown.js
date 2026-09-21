// Testes do renderizador (markdown.js) e do destaque de código (destaque.js).  node src/teste_markdown.js
const fs = require('fs'), vm = require('vm');
const ctx = { esc: s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])) };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(__dirname + '/destaque.js', 'utf8') + '\n' + fs.readFileSync(__dirname + '/markdown.js', 'utf8') + ';this.md=md;this.D=DESTAQUE;', ctx);
const { md, D } = ctx;
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
console.log(`${total - falhas}/${total} testes OK`);
process.exit(falhas ? 1 : 0);
