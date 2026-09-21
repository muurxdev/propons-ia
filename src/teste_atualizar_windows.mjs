// Teste da atualização automática do Windows numa cópia do programa:
// pede para "atualizar" para uma versão publicada e confere se o app baixou, conferiu, trocou o próprio .exe e abriu de novo.
// Uso: node src/teste_atualizar_windows.mjs <pasta-da-copia> <versao-publicada>   (app aberto com PROPONS_DEPURAR=1)
import fs from 'node:fs';
import crypto from 'node:crypto';
import { execSync } from 'node:child_process';
const [pasta, versao] = process.argv.slice(2);
const exe = fs.readdirSync(pasta).find(n => /^Pr.pons IA\.exe$/.test(n));
const caminho = pasta + '\\' + exe;
const sha = f => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const espera = ms => new Promise(r => setTimeout(r, ms));
const antes = sha(caminho);
let alvos = [];
for (let i = 0; i < 60; i++) { try { alvos = await (await fetch('http://127.0.0.1:9333/json')).json(); if (alvos.some(a => /#k=/.test(a.url))) break; } catch (e) {} await espera(1000); }
const pag = alvos.find(a => /#k=/.test(a.url)); if (!pag) { console.log('app não abriu'); process.exit(1); }
const ws = new WebSocket(pag.webSocketDebuggerUrl); await new Promise(r => ws.onopen = r);
let seq = 0; const pend = new Map();
ws.onmessage = e => { const m = JSON.parse(e.data); if (pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } };
const js = e => new Promise(r => { const id = ++seq; pend.set(id, m => r(m.result?.result?.value)); ws.send(JSON.stringify({ id, method: 'Runtime.evaluate', params: { expression: e, awaitPromise: true, returnByValue: true } })); });
const pidAntes = execSync(`powershell -NoProfile -Command "(Get-Process | Where-Object { $_.Path -eq '${caminho.replace(/'/g, "''")}' }).Id"`).toString().trim();
await js(`window.__atu=[]; PLATAFORMA.ao('atualizacao', d => window.__atu.push(d.fase)); 1`);
const t0 = Date.now();
const r = await js(`PLATAFORMA.atualizar('${versao}').then(r=>JSON.stringify(r), e=>'erro: '+e.message)`);
const fases = await js(`[...new Set(window.__atu)].join(' → ')`).catch(() => '');
console.log('resposta:', r, '| fases:', fases);
// o app fecha, o script troca o .exe e abre de novo
let pidDepois = '';
for (let i = 0; i < 90; i++) {
  await espera(1000);
  try { pidDepois = execSync(`powershell -NoProfile -Command "(Get-Process | Where-Object { $_.Path -eq '${caminho.replace(/'/g, "''")}' }).Id"`).toString().trim(); } catch (e) { pidDepois = ''; }
  if (pidDepois && pidDepois !== pidAntes && sha(caminho) !== antes) break;
}
const depois = sha(caminho);
const publicado = (await (await fetch(`https://github.com/muurxdev/propons-ia/releases/download/v${versao}/SHA256SUMS`)).text()).split('\n').map(l => l.trim().split(/\s+/)).find(p => p[1] === 'Propons-IA-Windows.exe')[0];
const ok1 = r === 'true', ok2 = depois === publicado, ok3 = pidDepois && pidDepois !== pidAntes, ok4 = !fs.existsSync(pasta + '\\.propons-atualizacao.tmp');
console.log(ok1 ? '  ✔' : '  ✘', 'baixou e conferiu (SHA-256) a versão', versao);
console.log(ok2 ? '  ✔' : '  ✘', 'o .exe foi trocado pelo publicado', depois.slice(0, 16), '=', publicado.slice(0, 16));
console.log(ok3 ? '  ✔' : '  ✘', 'abriu de novo sozinho', `pid ${pidAntes} → ${pidDepois}`, `(${((Date.now() - t0) / 1000).toFixed(0)} s)`);
console.log(ok4 ? '  ✔' : '  ✘', 'arquivo temporário removido');
process.exit(ok1 && ok2 && ok3 && ok4 ? 0 : 1);
