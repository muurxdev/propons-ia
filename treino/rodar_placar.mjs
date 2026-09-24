// Liga um llama-server só para o placar (com os argumentos do src/motor.json, os mesmos do app no PC) e roda o
// treino/avaliar.mjs em cada modo pedido. Serve para comparar modelos (concurso por faixa) sem o app aberto.
// Uso: node treino/rodar_placar.mjs <llama-server> <modelo.gguf> <nome> [--modos sem,pensar,auto] [--vezes 3] [--cpu]
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
const [servidor, modelo, nome, ...resto] = process.argv.slice(2);
if (!servidor || !modelo || !nome) { console.error('uso: node treino/rodar_placar.mjs <llama-server> <modelo.gguf> <nome> [--modos sem,pensar,auto] [--vezes 3] [--cpu]'); process.exit(2); }
const opt = (n, d) => { const i = resto.indexOf(n); return i >= 0 ? resto[i + 1] : d; };
const MODOS = opt('--modos', 'sem,pensar,auto').split(','), VEZES = opt('--vezes', '3'), CPU = resto.includes('--cpu');
const aqui = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const motor = JSON.parse(fs.readFileSync(path.join(aqui, '..', 'src', 'motor.json'), 'utf8')).pc;
const PORTA = 8790, espera = ms => new Promise(r => setTimeout(r, ms));
const args = ['-m', modelo, '--port', String(PORTA), '-c', '16384', ...motor.args, ...(CPU ? ['-ngl', '0'] : ['-ngl', '999'])];
console.log('motor:', path.basename(servidor), args.join(' '));
const p = spawn(servidor, args, { stdio: ['ignore', 'ignore', 'pipe'] });
let log = ''; p.stderr.on('data', d => { log = (log + d).slice(-4000); });
let pronto = false;
for (let i = 0; i < 360 && !pronto && p.exitCode === null; i++) { await espera(500); try { pronto = (await fetch(`http://127.0.0.1:${PORTA}/health`)).ok; } catch (e) {} }
if (!pronto) { console.error('o motor não ligou:\n' + log); p.kill(); process.exit(1); }
for (const m of MODOS) {
  const extra = m === 'pensar' ? ['--pensar'] : m === 'auto' ? ['--auto'] : [];
  spawnSync(process.execPath, [path.join(aqui, 'avaliar.mjs'), `http://127.0.0.1:${PORTA}`, '--vezes', VEZES, '--nome', nome, ...extra], { stdio: 'inherit' });
}
p.kill();
