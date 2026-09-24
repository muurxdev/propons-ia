// Navegação só com Tab: em cada parada o foco tem de aparecer (contorno no botão ou anel no contêiner do campo).
// Uso: node src/testes/teste_foco.mjs <porta-cdp> <pasta-saida>
import { conectar, espera, relatorio } from './cdp.mjs';
const [porta = 9333, saida = 'dist/teste-foco'] = process.argv.slice(2);
const { ok, resumo } = relatorio();
const { js, cdp, foto } = await conectar({ porta, saida });
const tab = async (shift) => {
  await cdp('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9, modifiers: shift ? 8 : 0 });
  await cdp('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9, modifiers: shift ? 8 : 0 });
  await espera(120);
};
// o que marca o foco de cada elemento: contorno próprio, ou o contêiner do campo (borda/anel)
const VISIVEL = `(() => {
  const el = document.activeElement; if (!el || el === document.body) return { vazio: true };
  const cs = getComputedStyle(el);
  const contorno = cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) >= 1;
  const sombra = cs.boxShadow !== 'none';
  const cont = el.closest('.caixa, .busca, .cod-compor, .mem-novo');
  const doCont = !!cont && (getComputedStyle(cont).boxShadow !== 'none' || getComputedStyle(cont).borderColor !== 'rgba(0, 0, 0, 0)');
  const r = el.getBoundingClientRect();
  return { nome: (el.id ? '#' + el.id : el.tagName.toLowerCase() + (el.className ? '.' + String(el.className).split(' ')[0] : '')) + ' ' + (el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 30),
    ok: contorno || sombra || doCont, visivel: r.width > 0 && r.height > 0 };
})()`;
async function percorrer(onde, n) {
  const sem = [], vistos = new Set();
  for (let i = 0; i < n; i++) {
    await tab();
    const v = await js(VISIVEL);
    if (v.vazio || !v.visivel) continue;
    vistos.add(v.nome);
    if (!v.ok) sem.push(v.nome);
  }
  ok(`${onde}: foco visível em todas as paradas do Tab`, sem.length === 0 && vistos.size >= 5, sem.length ? 'sem marca: ' + [...new Set(sem)].join(' | ') : `${vistos.size} elementos`);
}
await js(`document.querySelectorAll('.dlg-fundo').forEach(f => f.remove()); nova(); document.activeElement.blur(); 1`); await espera(300);
await percorrer('tela do chat', 30);
await foto('f1-chat');
// dentro de uma folha (Ajustes): o foco fica preso nela e aparece
await js(`abrirConfig(); 1`);
await espera(600);
if (await js(`!!document.querySelector('.painel-fundo, .dlg-fundo')`)) { await percorrer('Ajustes', 20); await foto('f2-ajustes'); }
await js(`document.querySelectorAll('.painel-fundo, .dlg-fundo').forEach(f => f.remove()); 1`);
resumo();
