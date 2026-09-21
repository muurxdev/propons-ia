// Confere os algoritmos do passo a passo contra implementações de referência (as clássicas, como em aula)
// e o resumo exato. Uso: node src/teste_algoritmos.js   (depois de node src/montar.js)
const fs = require('fs'), vm = require('vm'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'payload', 'interface', 'index.html'), 'utf8');
const bloco = (ini, fim) => html.split(ini)[1].split(fim)[0];
const fmt = a => '[' + a.join(', ') + ']';
const ctx = { fmt }; vm.createContext(ctx);
vm.runInContext('/*' + bloco('/* ================= ALGORITMOS', '/* ================= DESTAQUE') +
  html.match(/function resumo\(alg, lista, val\)\{[\s\S]*?\n\}\n/)[0] + ';this.T={traceBubble,traceSelection,traceQuick,traceBinaria,resumo};', ctx);
const T = ctx.T;

// referências (registram o que os "prints" mostrariam)
function rBubble(d){const o=[];for(let f=d.length-1;f>0;f--){let t=false;for(let i=0;i<f;i++)if(d[i]>d[i+1]){[d[i],d[i+1]]=[d[i+1],d[i]];t=true;}if(!t)break;o.push(fmt(d));}return o;}
function rSel(d){const o=[];for(let i=0;i<d.length-1;i++){let m=i;for(let k=i+1;k<d.length;k++)if(d[k]<d[m])m=k;[d[i],d[m]]=[d[m],d[i]];o.push(fmt(d));}return o;}
function rQuick(d){const ev=[];(function r(a,b){const p=d[Math.floor((a+b)/2)];let i=a,f=b;ev.push(`call ${a} ${b} ${p}`);while(i<=f){while(d[i]<p)i++;while(d[f]>p)f--;if(i<=f){ev.push(`swap ${d[i]} ${d[f]}`);[d[i],d[f]]=[d[f],d[i]];i++;f--;}}ev.push('list '+fmt(d));if(f>a)r(a,f);if(i<b)r(i,b);})(0,d.length-1);return ev;}
function rBin(d,v){const p=[];let i=0,f=d.length-1;while(i<=f){const c=Math.floor((i+f)/2);p.push(d[c]);if(v<d[c])f=c-1;else if(v>d[c])i=c+1;else return[p,c];}return[p,-1];}
const sBubble=l=>T.traceBubble(l).filter(s=>s.pass&&!s.end).map(s=>fmt(s.l));
const sSel=l=>T.traceSelection(l).filter(s=>s.pass).map(s=>fmt(s.l));
function sQuick(l){const ev=[];for(const s of T.traceQuick(l)){if(s.pass){const m=s.t.match(/ini=(\d+), fim=(\d+).*= (-?\d+)\.$/);ev.push(`call ${m[1]} ${m[2]} ${m[3]}`);}
  else if(s.detail){const m=s.t.match(/TROCA (-?\d+) com (-?\d+)/);if(m)ev.push(`swap ${m[1]} ${m[2]}`);else{const v=s.t.match(/\(valor (-?\d+)\)/)[1];ev.push(`swap ${v} ${v}`);}}
  else if(s.mark)ev.push('list '+fmt(s.l));}return ev;}
function sBin(l,v){const st=T.traceBinaria(l,v);const p=st.filter(s=>s.pv).map(s=>s.l[s.pv[0]]);const m=st[st.length-1].t.match(/Retorna o índice (\d+)/);return[p,m?+m[1]:-1];}

const rnd = n => Math.floor(Math.random() * n);
let falhas = 0, total = 0;
const confere = (nome, a, b, l) => { total++; if (JSON.stringify(a) !== JSON.stringify(b)) { if (falhas++ < 5) console.log('DIFERENTE', nome, fmt(l), '\n ref:', a, '\n app:', b); } };
for (let t = 0; t < 3000; t++) {
  const n = 2 + rnd(11), l = [...Array(n)].map(() => rnd(t % 3 ? 100 : 8));
  confere('bubble', rBubble([...l]), sBubble(l), l);
  confere('selection', rSel([...l]), sSel(l), l);
  confere('quick', rQuick([...l]), sQuick(l), l);
  const o = [...l].sort((a, b) => a - b), v = Math.random() < .7 ? o[rnd(n)] : rnd(100);
  confere('binaria', rBin(o, v), sBin(o, v), o);
  for (const f of [T.traceBubble, T.traceSelection, T.traceQuick]) confere('ordena', fmt(o), fmt(f(l).at(-1).l), l);
  const alg = ['bubble', 'selection', 'quick'][t % 3];
  const r = T.resumo(alg, l); total++;
  if (!r.includes('`' + fmt(o) + '`') || /undefined|NaN/.test(r)) { if (falhas++ < 5) console.log('RESUMO', alg, fmt(l), r); }
}
console.log(`${total - falhas}/${total} verificações de algoritmos OK`);
process.exit(falhas ? 1 : 0);
