// Mede a fluidez (quadros por segundo) da interface enquanto a IA responde, abrindo e fechando folhas.
// Uso: node src/teste_fps.mjs <porta-cdp> <pasta-saida>   (app aberto com depuraÃ§Ã£o)
import fs from 'node:fs';
import { conectar, espera, relatorio } from './testes/cdp.mjs';
const [porta, saida] = process.argv.slice(2);
fs.mkdirSync(saida, { recursive: true });
const { js, foto, fechar, cdp } = await conectar({ porta, saida, filtro: a => { const u = a; return /127\.0\.0\.1:\d+/.test(u); } });
for (let i = 0; i < 300 && !(await js('online')); i++) await espera(500);
if (process.env.LENTO) { await cdp('Emulation.setCPUThrottlingRate', { rate: +process.env.LENTO }); console.log('CPU da interface ' + process.env.LENTO + 'x mais lenta'); }
// quadros por segundo durante `ms` (e o pior intervalo entre quadros)
const medir = ms => js(`new Promise(ok => { const t=[]; const f=x=>{ t.push(x); if (x - t[0] < ${ms}) requestAnimationFrame(f); else { const d=t.slice(1).map((v,i)=>v-t[i]); ok({ fps: +(1000*(t.length-1)/(t[t.length-1]-t[0])).toFixed(1), pior: +Math.max(...d).toFixed(0) }); } }; requestAnimationFrame(f); })`);
const parado = await medir(1500);
console.log('parado:', JSON.stringify(parado));
await js(`(()=>{ nova(); const e=$('#entrada'); e.value='Explique em detalhes, com vÃ¡rios parÃ¡grafos, listas e um exemplo de cÃ³digo em Python, como funciona o algoritmo quick sort.'; ajustar(); $('#enviar').click(); })(); 1`);
for (let i = 0; i < 60 && !(await js('!!geracao && (atual.msgs.length>0)')); i++) await espera(250);
await espera(2500);
const gerando = await medir(2000);
console.log('gerando (sÃ³ texto):', JSON.stringify(gerando));
// abre e fecha folhas enquanto gera (e registra os quadros longos com a origem de cada um)
await js(`window.__longos=[]; new PerformanceObserver(l => l.getEntries().forEach(e => window.__longos.push({ t: Math.round(e.startTime), dur: Math.round(e.duration), bloqueio: Math.round(e.blockingDuration||0), estilo: Math.round(e.styleAndLayoutStart ? e.startTime + e.duration - e.styleAndLayoutStart : 0), scripts: (e.scripts||[]).map(s => (s.invoker||'') + ' ' + (s.sourceFunctionName||'') + ' ' + Math.round(s.duration) + 'ms').slice(0,4) }))).observe({ type: 'long-animation-frame', buffered: false }); 1`);
const mf = js(`new Promise(ok => { const t=[]; const f=x=>{ t.push(x); if (x - t[0] < 3000) requestAnimationFrame(f); else { const d=t.slice(1).map((v,i)=>v-t[i]); ok({ fps: +(1000*(t.length-1)/(t[t.length-1]-t[0])).toFixed(1), pior: +Math.max(...d).toFixed(0) }); } }; requestAnimationFrame(f); })`);
await js(`window.__marcas=[]; window.__marcas.push(["abrirConfig", Math.round(performance.now())]); abrirConfig(); 1`); await espera(700);
await js(`window.__marcas.push(["fecharModal", Math.round(performance.now())]); fecharModal(); 1`); await espera(500);
await js(`window.__marcas.push(["menu", Math.round(performance.now())]); menuConversa(document.querySelector('[data-menu]'), conversas[0].id); 1`); await espera(600);
await js(`window.__marcas.push(["fecharDialogo", Math.round(performance.now())]); fecharDialogo(); 1`); await espera(400);
const comFolhas = await mf;
console.log('gerando + abrindo/fechando folhas:', JSON.stringify(comFolhas));
console.log('   marcas', JSON.stringify(await js('window.__marcas')));
for (const l of (await js('window.__longos')) || []) console.log('   quadro longo', JSON.stringify(l));
await js(`geracao && geracao.ctrl.abort(); 1`); await espera(800);
// bloco de código de 300 linhas em streaming (motor simulado a ~400 caracteres/s): o renderizador não pode recolorir
// o bloco inteiro a cada quadro
await js(`window.__gerar0 = window.__gerar0 || PLATAFORMA.gerar; PLATAFORMA.gerar = (m, op, aoToken, sinal) => new Promise(ok => { const L = []; for (let i = 0; i < 300; i++) L.push('    print("linha ' + i + '", ' + i + ' * 2)  # comentário ' + i); const texto = 'Aqui vai o programa:\\n\\n\`\`\`python\\n' + L.join('\\n') + '\\n\`\`\`\\n\\nFim.'; let i = 0; const t = setInterval(() => { if (sinal.aborted || i >= texto.length) { clearInterval(t); ok({ fim: 'stop' }); return; } aoToken(texto.slice(i, i + 8)); i += 8; }, 20); }); (()=>{ nova(); const e=$('#entrada'); e.value='código longo'; ajustar(); $('#enviar').click(); })(); 1`);
await espera(12000);
const codigoLongo = await medir(3000);
console.log('gerando código de 300 linhas (simulado, aos 12 s):', JSON.stringify(codigoLongo));
const linhasNaTela = await js(`(document.querySelector('.msg.ia:last-child pre code') || {}).textContent.split('\\n').length`);
console.log('   linhas já na tela:', linhasNaTela);
await js(`geracao && geracao.ctrl.abort(); PLATAFORMA.gerar = window.__gerar0; 1`);
fs.writeFileSync(`${saida}/fps.json`, JSON.stringify({ parado, gerando, comFolhas, codigoLongo }, null, 1));
fechar();
process.exit(0);
