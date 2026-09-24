// A configuração do motor mora só em src/motor.json: nenhum host pode ter contexto, orçamento de raciocínio, cache KV
// ou tokens de imagem escritos à mão, e os scripts de build têm de levar o motor.json (motor.env no Linux) junto.
// Uso: node src/testes/teste_motor.js
const fs = require('fs'), path = require('path');
const R = path.join(__dirname, '..', '..'), ler = f => fs.readFileSync(path.join(R, f), 'utf8');
const falhas = [];
const HOSTS = ['app/Propons.cs', 'android/app/src/main/java/io/github/muurxdev/proponsia/MainActivity.kt', 'mac/ProponsMac/main.swift',
  'ios/ProponsIA/App.swift', 'linux/propons-ia'];
const PROIBIDO = [
  [/(?<!head)\s-c\s+"?\d{3,}|"-c",\s*"\d/, 'contexto (-c) com número'],
  [/--reasoning-budget["\s,]+\s*"?\d/, '--reasoning-budget com número'],
  [/--image-max-tokens["\s,]+\s*"?\d/, '--image-max-tokens com número'],
  [/-ctk["\s,]+\s*"?[qf]\d/, 'cache KV escrito à mão'],
  [/contexto:\s*\d{3,}/, 'contexto do iOS com número'],
];
for (const h of HOSTS) {
  const t = ler(h);
  for (const [re, o] of PROIBIDO) if (re.test(t)) falhas.push(`${h}: ${o} (${t.match(re)[0].trim()})`);
  if (!/motor\.(json|env)/.test(t)) falhas.push(`${h}: não lê o motor.json/motor.env`);
}
for (const [f, arq] of [['android/preparar.sh', 'motor.json'], ['ios/preparar.sh', 'motor.json'], ['mac/compilar.sh', 'motor.json'], ['linux/build.sh', 'motor.env']])
  if (!ler(f).includes(arq)) falhas.push(`${f}: não copia o ${arq}`);
const m = JSON.parse(ler('src/motor.json'));
for (const k of ['pc', 'celular']) {
  const c = m[k].contexto;
  if (!c.every((d, i) => i === 0 || (d[0] > c[i - 1][0] && d[1] >= c[i - 1][1]))) falhas.push(`motor.json: degraus de "${k}" fora de ordem`);
  if (c[0][0] !== 0) falhas.push(`motor.json: "${k}" precisa de um degrau para 0 GB`);
}
falhas.forEach(f => console.log('  FALHOU: ' + f));
if (falhas.length) process.exit(1);
console.log(`motor.json: ${HOSTS.length} hosts sem argumentos do motor escritos à mão; contexto PC ${m.pc.contexto.map(d => d[1]).join('/')} · celular ${m.celular.contexto.map(d => d[1]).join('/')}`);
