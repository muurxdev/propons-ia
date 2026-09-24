// Aceleração por GPU (Windows): baixa o módulo Vulkan pela tela de Ajustes, testa CPU × GPU, liga, desliga e religa.
// Uso: node src/testes/teste_gpu.mjs <porta-cdp> <pasta-saida>   (app aberto com PROPONS_DEPURAR=1, num PC com placa Vulkan)
import fs from 'node:fs';
import { conectar, espera, relatorio } from './cdp.mjs';
const [porta, saida] = process.argv.slice(2);
fs.mkdirSync(saida, { recursive: true });
const { js, foto, fechar } = await conectar({ porta, saida, filtro: u => /127\.0\.0\.1:\d+/.test(u) });
const { ok, resumo } = relatorio();
for (let i = 0; i < 300 && !(await js('online')); i++) await espera(500);
const sistema = () => js('lerSistema()');
const tps = async () => js(`PLATAFORMA.gerar([{role:'user',content:'Escreva os números de 1 a 60 separados por vírgula, sem mais nada.'}],{temperatura:0,maxTokens:80,exato:true},()=>{}).then(r => r.timings.predicted_per_second)`);

let s = await sistema();
ok('sistema informa a GPU', s.gpu && typeof s.gpu.baixada === 'boolean', JSON.stringify(s.gpu));
if (s.gpu && (s.gpu.baixada || s.gpu.ligada)) { await js(`PLATAFORMA.apagarGpu()`); s = await sistema(); }   // começa do zero
ok('começa desligada e sem módulo', !s.gpu.baixada && !s.gpu.ligada && !s.gpu.ativa, JSON.stringify(s.gpu));
const cpu = await tps(); console.log(`     processador: ${cpu.toFixed(1)} tokens/s`);

await js(`abrirConfig('modelo'); 1`); await espera(1200);
ok('seção "Aceleração por GPU" com o interruptor desligado', await js(`(()=>{const b=$('#swGpu'); return !!b && b.getAttribute('aria-checked')==='false' && /baixa o módulo/.test(b.textContent)})()`));
await foto('g1-secao');
// liga: pede confirmação → baixa (31 MB) → mede o processador → liga a placa → mede → decide
await js(`window.__avisos = []; if (!window.__toast0) { window.__toast0 = toast; toast = (t, ms) => { window.__avisos.push(t); window.__toast0(t, ms); }; } $('#swGpu').click(); 1`); await espera(600);
ok('pergunta antes de baixar', await js(`!!document.querySelector('.dlg-fundo:not(.saindo) .btn.primario')`));
await js(`document.querySelector('.dlg-fundo:not(.saindo) .btn.primario').click(); 1`);
let t0 = Date.now(), viuDownload = false;
for (let i = 0; i < 900; i++) {
  await espera(500);
  if (!viuDownload && await js(`!!baixando['gpu-vulkan']`)) viuDownload = true;
  const av = await js('window.__avisos');
  if (av.some(t => /ligada:|não ficou mais rápida|não funcionou|Nenhuma placa|Não foi possível baixar|cancelado/i.test(t))) break;
}
const avisos = await js('window.__avisos');
console.log('     avisos:', JSON.stringify(avisos));
ok('mostrou o download do módulo', viuDownload);
ok('terminou com a placa ligada (mais rápida que o processador)', avisos.some(t => /Placa de vídeo ligada/.test(t)), `${((Date.now() - t0) / 1000).toFixed(0)} s`);
for (let i = 0; i < 120 && !(await js('online')); i++) await espera(500);
s = await sistema();
ok('sistema: módulo baixado, ligada e ativa', s.gpu.baixada && s.gpu.ligada && s.gpu.ativa, JSON.stringify(s.gpu));
ok('placa dedicada escolhida', /NVIDIA|GeForce|Radeon RX|Arc/i.test(s.gpu.dispositivo), s.gpu.dispositivo);
const gpu = await tps(); console.log(`     placa de vídeo: ${gpu.toFixed(1)} tokens/s`);
ok('GPU pelo menos 1,5× mais rápida que a CPU nesta máquina', gpu > cpu * 1.5, `${gpu.toFixed(0)} × ${cpu.toFixed(0)}`);
await espera(800); await foto('g2-ligada');
ok('interruptor ligado com o nome da placa e a medida', await js(`(()=>{const b=$('#swGpu'); return !!b && b.getAttribute('aria-checked')==='true' && /Em uso:.*tokens\\/s/.test(b.textContent)})()`), await js(`$('#swGpu') && $('#swGpu').textContent`));
// diagnóstico mostra a aceleração
await js(`irPara('diagnostico'); 1`); await espera(600); await js('rodarDiagnostico()');
const diag = await js('window.__diagnostico');
const acel = diag.find(d => d.titulo === 'Aceleração');
ok('diagnóstico: aceleração pela placa', acel && /placa de vídeo/.test(acel.det), acel && acel.det);
await js('fecharModal(true); 1');
// desliga e liga de novo (sem download): o motor religa nos dois casos
await js(`PLATAFORMA.ligarGpu(false)`); for (let i = 0; i < 120 && !(await js('online')); i++) await espera(500);
s = await sistema(); ok('desligar: motor volta para a CPU', !s.gpu.ativa && !s.gpu.ligada && s.gpu.baixada, JSON.stringify(s.gpu));
const r = await js(`PLATAFORMA.ligarGpu(true)`); for (let i = 0; i < 120 && !(await js('online')); i++) await espera(500);
s = await sistema(); ok('ligar de novo: ativa sem baixar', r.ativa && s.gpu.ativa, JSON.stringify(r));
const m = await js(`(async()=>{ nova(); $('#entrada').value='Explique em uma frase o que é fotossíntese.'; ajustar(); $('#enviar').click(); for (let i=0;i<400 && (!atual || !geracao && atual.msgs.length<2);i++) await new Promise(r=>setTimeout(r,250)); for (let i=0;i<600 && geracao;i++) await new Promise(r=>setTimeout(r,250)); return atual.msgs[atual.msgs.length-1].texto })()`);
ok('responde normalmente com a placa ligada', m && m.length > 20 && !/^Erro/.test(m), m.slice(0, 100));
fechar();
const f = resumo(); process.exit(f ? 1 : 0);
