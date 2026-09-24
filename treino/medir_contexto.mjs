// Mede memória (RAM do processo) e velocidade do llama-server para cada tamanho de contexto e tipo de cache KV.
// Serve para escolher os degraus de contexto do src/motor.json. Roda na CPU (-ngl 0), como na maioria dos PCs.
// Uso: node treino/medir_contexto.mjs <llama-server> <pasta-dos-modelos> [modelo.gguf ...]
import { spawn, execSync } from 'node:child_process';
import path from 'node:path';
const [servidor, pasta, ...lista] = process.argv.slice(2);
const modelos = lista.length ? lista : ['Qwen3.5-2B-Q4_K_M.gguf', 'Qwen3.5-4B-Q4_K_M.gguf'];
const CONTEXTOS = [8192, 16384, 32768];
const KV = [['f16', []], ['q8_0', ['-fa', 'on', '-ctk', 'q8_0', '-ctv', 'q8_0']]];
const PORTA = 8799, espera = ms => new Promise(r => setTimeout(r, ms));
const ramMB = pid => { try { const l = execSync(`tasklist /FI "PID eq ${pid}" /FO CSV /NH`).toString(); return Math.round(+l.split('","')[4].replace(/[^\d]/g, '') / 1024); } catch (e) { return 0; } };
// ~3 mil tokens de texto de estudo (o mesmo em todas as medidas)
const texto = ('A fotossíntese transforma luz em energia química. As plantas usam água e gás carbônico. ' +
  'Na revolução industrial, a produção mudou das oficinas para as fábricas. ').repeat(80);
const linhas = ['| modelo | contexto | cache KV | RAM após carregar | RAM após 3k tokens | leitura (t/s) | escrita (t/s) |', '|---|---|---|---|---|---|---|'];
for (const m of modelos) for (const ctx of CONTEXTOS) for (const [kv, extra] of KV) {
  const p = spawn(servidor, ['-m', path.join(pasta, m), '--port', String(PORTA), '-c', String(ctx), '-np', '1', '--cache-ram', '0', '-ngl', '0', ...extra], { stdio: 'ignore' });
  let pronto = false;
  for (let i = 0; i < 240 && !pronto; i++) { await espera(500); try { pronto = (await fetch(`http://127.0.0.1:${PORTA}/health`)).ok; } catch (e) {} }
  if (!pronto) { linhas.push(`| ${m} | ${ctx} | ${kv} | não ligou | | | |`); p.kill(); continue; }
  const r0 = ramMB(p.pid);
  const r = await (await fetch(`http://127.0.0.1:${PORTA}/completion`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: texto + '\nResuma em uma frase:', n_predict: 96, cache_prompt: false }) })).json();
  const r1 = ramMB(p.pid), t = r.timings || {};
  linhas.push(`| ${m.replace(/-Q4_K_M\.gguf$/, '')} | ${ctx} | ${kv} | ${r0} MB | ${r1} MB | ${(t.prompt_per_second || 0).toFixed(0)} | ${(t.predicted_per_second || 0).toFixed(1)} |`);
  console.log(linhas[linhas.length - 1]);
  p.kill(); await espera(1500);
}
console.log('\n' + linhas.join('\n'));
