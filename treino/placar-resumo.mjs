// Junta os resultados do placar no CI numa tabela só (ordem da disputa, por faixa). Uso: node treino/placar-resumo.mjs <pasta>
import fs from 'node:fs';
import path from 'node:path';
const pasta = process.argv[2] || 'resultados';
const arquivos = [];
(function andar(d) { for (const f of fs.existsSync(d) ? fs.readdirSync(d) : []) { const p = path.join(d, f); if (fs.statSync(p).isDirectory()) andar(p); else if (/^resultado-.*\.md$/.test(f)) arquivos.push(p); } })(pasta);
const pega = (t, re) => { const m = re.exec(t); return m ? m[1] : '-'; };
const linhas = arquivos.map(a => {
  const t = fs.readFileSync(a, 'utf8');
  const nome = pega(t, /^# Placar — ([^—]+) —/m).trim();
  return { nome, acerto: pega(t, /\*\*Acerto[^:]*:\*\* (\d+%)/), armadilha: pega(t, /\*\*Armadilhas[^:]*:\*\* (\d+%)/), loops: pega(t, /\*\*Loops[^:]*:\*\* ([\d/]+)/),
    vel: pega(t, /\*\*Velocidade média:\*\* ([\d.]+ tokens\/s)/), porResp: pega(t, /tokens\/s · ([\d.]+ s) por resposta/),
    materias: [...t.matchAll(/^\| (matemática|português|ciências|história|geografia|programação|documento longo) \| (\d+%)/gm)].map(m => `${m[1].slice(0, 4)} ${m[2]}`).join(' · ') };
}).sort((a, b) => a.nome.localeCompare(b.nome));
const md = ['# Placar dos modelos (modo do app, Auto, CPU do CI)', '', '| modelo | acerto | armadilhas | loops | velocidade | s/resposta | por matéria |', '|---|---|---|---|---|---|---|',
  ...linhas.map(l => `| ${l.nome} | ${l.acerto} | ${l.armadilha} | ${l.loops} | ${l.vel} | ${l.porResp} | ${l.materias} |`), '',
  'Velocidade é a de um processador de CI (4 núcleos, sem GPU): serve para comparar os modelos entre si, não o aparelho de verdade.'].join('\n');
console.log(md);
fs.writeFileSync(path.join(pasta, 'placar-resumo.md'), md + '\n');
