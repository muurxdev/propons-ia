// Teste só do fluxo de atualização no Android (CDP da WebView): baixa o APK de uma versão publicada,
// confere o SHA-256, entrega ao instalador do Android e verifica que o instalador apareceu e que cancelar volta com aviso.
// Uso: node src/testes/teste_instalador_android.mjs <porta-cdp> <versao> <pasta-saida>
import fs from 'node:fs';
import { execSync } from 'node:child_process';
const [porta, versao, saida] = process.argv.slice(2);
const alvos = await (await fetch(`http://127.0.0.1:${porta}/json`)).json();
const pag = alvos.find(a => a.type === 'page' && /127\.0\.0\.1/.test(a.url));
const ws = new WebSocket(pag.webSocketDebuggerUrl); await new Promise(r => ws.onopen = r);
let seq = 0; const pend = new Map();
ws.onmessage = e => { const m = JSON.parse(e.data); if (pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } };
const js = e => new Promise(r => { const id = ++seq; pend.set(id, m => r(m.result?.result?.value)); ws.send(JSON.stringify({ id, method: 'Runtime.evaluate', params: { expression: e, awaitPromise: true, returnByValue: true } })); });
const espera = ms => new Promise(r => setTimeout(r, ms));
const sh = c => { try { return execSync(c, { shell: '/bin/bash' }).toString(); } catch (e) { return ''; } };
sh('adb shell appops set io.github.muurxdev.proponsia REQUEST_INSTALL_PACKAGES allow');
await js(`window.__atu=[]; PLATAFORMA.ao('atualizacao', d => window.__atu.push(d)); 1`);
const r = await js(`PLATAFORMA.atualizar('${versao}').then(r=>JSON.stringify(r),e=>'erro: '+e.message)`);
const fases = await js(`[...new Set(window.__atu.map(d=>d.fase))].join(' → ')`);
console.log(r === 'true' ? '  ✔' : '  ✘', 'baixou, conferiu e entregou ao instalador —', r, '·', fases);
let topo = '';
for (let i = 0; i < 30; i++) { await espera(1000); topo = sh(`adb shell dumpsys activity activities | grep -m1 -E "topResumedActivity|mResumedActivity"`); if (/packageinstaller|PackageInstaller|InstallStart|Install/i.test(topo) && !/proponsia/.test(topo)) break; }
sh(`adb exec-out screencap -p > "${saida}/13-instalador.png"`);
const abriu = /install/i.test(topo) && !/proponsia\/\.MainActivity/.test(topo);
console.log(abriu ? '  ✔' : '  ✘', 'instalador do Android aberto —', topo.trim().slice(0, 140));
sh('adb shell input keyevent KEYCODE_BACK');
let erro = null; for (let i = 0; i < 30 && !erro; i++) { await espera(500); erro = await js(`(window.__atu.find(d=>d.fase==='erro')||{}).mensagem||null`); }
console.log(erro ? '  ✔' : '  ✘', 'cancelar no instalador volta ao app com aviso —', erro);
sh(`adb exec-out screencap -p > "${saida}/14-depois-de-cancelar.png"`);
process.exit(r === 'true' && abriu && erro ? 0 : 1);
