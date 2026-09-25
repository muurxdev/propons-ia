// Teste da transcrição no app real (CDP): baixa a voz (se preciso), grava pelo microfone (falso, tocando um WAV)
// e transcreve um arquivo de áudio pelo "+" → Áudio.
// Uso: node src/testes/teste_voz.mjs <porta-cdp> <pasta-saida> <arquivo-wav> [wav-curtinho-dizendo-oi]
import fs from 'node:fs';
import { conectar, espera, relatorio } from './cdp.mjs';
const [porta, saida, wavArq, wavCurto] = process.argv.slice(2);
fs.mkdirSync(saida, { recursive: true });
const { js, foto, fechar } = await conectar({ porta, saida, filtro: a => { const u = a; return /127\.0\.0\.1:\d+/.test(u); } });
const { ok, resumo } = relatorio();
for (let i = 0; i < 300 && !(await js('online')); i++) await espera(500);
const confere = t => /capital do brasil/i.test(t) && /bras[íi]lia/i.test(t);
// 1) garante a voz (baixa na 1ª vez, confirmando o diálogo)
const sis = await js('lerSistema()');
const voz = (sis.vozes || []).find(v => v.atual);
console.log('     voz:', voz && voz.nome, voz && voz.baixado ? '(já baixada)' : '(vai baixar)');
await js(`window.__okVoz = null; garantirVoz().then(v => window.__okVoz = v); 1`); await espera(800);
if (await js(`!!document.querySelector('.dlg .btn.primario')`)) { await foto('v1-pede-voz'); await js(`document.querySelector('.dlg .btn.primario').click(); 1`); }
const t0 = Date.now(); for (let i = 0; i < 600 && (await js('window.__okVoz')) === null; i++) await espera(500);
ok('voz pronta', await js('window.__okVoz'), `${((Date.now() - t0) / 1000).toFixed(0)} s`);
// 2) grava pelo microfone (falso, toca o WAV) e transcreve
await js(`nova(); $('#entrada').value=''; ajustar(); $('#falar').click(); 1`);
await espera(1500);
ok('gravando: barra com tempo, sem limite', await js(`!$('#gravando').hidden && !$('#limiteGrav')`));
ok('ondas cobrem a barra toda', await js(`$('#onda').children.length >= 12 && $('#onda').getBoundingClientRect().width > $('#gravando').getBoundingClientRect().width * 0.35`), await js(`$('#onda').children.length + ' barrinhas'`));
await espera(11500); await foto('v2-gravando');
const nivel = await js(`[...document.querySelectorAll('#onda i')].map(i=>parseFloat((i.style.transform.match(/[\\d.]+/)||[0])[0])).reduce((a,b)=>Math.max(a,b),0)`);
if (!process.env.SEM_MIC) {
  ok('nível do som se mexe', nivel > 0.2, nivel);
  const niveis = await js(`[...document.querySelectorAll('#onda i')].map(i=>+(i.style.transform.match(/[\\d.]+/)||[0])[0])`);
  ok('cada barrinha tem o volume de um instante (variam)', new Set(niveis.map(x => x.toFixed(1))).size >= 4, niveis.map(x => x.toFixed(1)).join(' '));
}
if (process.env.SEM_MIC) {
  await js(`$('#cancelarGrav').click(); 1`); await espera(600);
  ok('cancelar descarta a gravação', await js(`$('#gravando').hidden && !$('#entrada').value`));
} else {
await js(`$('#pararGrav').click(); 1`);
const t1 = Date.now(); for (let i = 0; i < 600 && (await js('transcrevendo || !$("#gravando").hidden')); i++) await espera(300);
const gravado = await js(`$('#entrada').value`);
ok('fala gravada vira texto na caixa', confere(gravado), `${((Date.now() - t1) / 1000).toFixed(1)} s · "${gravado}"`);
await foto('v3-texto');
}
// 3) arquivo de áudio pelo "+" → Áudio
await js(`$('#entrada').value=''; ajustar(); 1`);
const b64 = fs.readFileSync(wavArq).toString('base64');
const t2 = Date.now();
await js(`(async()=>{ const b = await (await fetch('data:audio/wav;base64,${b64}')).blob(); await transcreverAudio(b); return 1 })()`);
const doArquivo = await js(`$('#entrada').value`);
ok('arquivo de áudio vira texto', confere(doArquivo), `${((Date.now() - t2) / 1000).toFixed(1)} s · "${doArquivo}"`);
// 3b) áudio curtinho (menos de 1 s)
if (wavCurto) {
  await js(`$('#entrada').value=''; ajustar(); 1`);
  const bc = fs.readFileSync(wavCurto).toString('base64');
  await js(`(async()=>{ const b = await (await fetch('data:audio/wav;base64,${bc}')).blob(); await transcreverAudio(b); return 1 })()`);
  const curto = await js(`$('#entrada').value`);
  ok('áudio curtinho (' + ((fs.statSync(wavCurto).size - 44) / 32000).toFixed(2) + ' s) vira texto', /\boi\b/i.test(curto), `"${curto}"`);
}
// 4) "+" tem Conhecimento (o áudio em arquivo vai pelo "Arquivos")
await js(`$('#anexar').click(); 1`); await espera(600);
ok('"+" tem Conhecimento e não tem mais Áudio', await js(`!!document.querySelector('[data-op="conhecimento"]') && !document.querySelector('[data-op="audio"]')`));
await foto('v4-mais'); await js('fecharDialogo(); 1');
fechar();
resumo();
