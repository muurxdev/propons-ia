// Helper compartilhado dos testes de ponta a ponta (CDP no WebView2/WebView/Chromium do app real).
//   import { conectar, espera, relatorio } from './testes/cdp.mjs';
//   const { js, foto, fechar } = await conectar({ porta, saida, filtro: u => /#k=/.test(u) });
//   const { ok, resumo } = relatorio();  ok('nome', condição, 'detalhe');  ...  resumo();
// - js() lança erro quando a expressão dá exceção na página (nada de "undefined" passando por sucesso)
// - conectar() espera a página aparecer (até timeoutMs) em vez de falhar na primeira tentativa
import fs from 'node:fs';

export const espera = ms => new Promise(r => setTimeout(r, ms));

export async function conectar({ porta = 9333, saida, filtro = u => /127\.0\.0\.1:\d+\//.test(u), timeoutMs = 300000 } = {}) {
  const t0 = Date.now();
  let alvo = null;
  while (!alvo) {
    try { alvo = (await (await fetch(`http://127.0.0.1:${porta}/json`)).json()).find(a => a.type === 'page' && filtro(a.url)); } catch (e) {}
    if (!alvo) { if (Date.now() - t0 > timeoutMs) throw new Error(`página não apareceu na porta ${porta} (filtro ${filtro})`); await espera(500); }
  }
  const ws = new WebSocket(alvo.webSocketDebuggerUrl); await new Promise((r, x) => { ws.onopen = r; ws.onerror = x; });
  let seq = 0; const pend = new Map();
  ws.onmessage = e => { const m = JSON.parse(e.data); if (pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } };
  const cdp = (method, params = {}) => new Promise(r => { const id = ++seq; pend.set(id, r); ws.send(JSON.stringify({ id, method, params })); });
  const js = async expr => {
    const r = await cdp('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
    if (r.result?.exceptionDetails) throw new Error('na página: ' + (r.result.exceptionDetails.exception?.description || JSON.stringify(r.result.exceptionDetails)).slice(0, 300));
    return r.result?.result?.value;
  };
  const foto = async nome => { if (!saida) return; fs.mkdirSync(saida, { recursive: true }); const r = await cdp('Page.captureScreenshot', { format: 'png' }); if (r.result) fs.writeFileSync(`${saida}/${nome}.png`, Buffer.from(r.result.data, 'base64')); };
  // espera uma condição na página (expressão JS) virar verdadeira
  const ate = async (expr, ms = 60000, passo = 300) => { const t = Date.now(); while (Date.now() - t < ms) { if (await js(expr)) return true; await espera(passo); } return false; };
  return { js, cdp, foto, ate, url: alvo.url, fechar: () => ws.close() };
}

export function relatorio() {
  const res = [];
  const ok = (nome, cond, detalhe = '') => { res.push(!!cond); console.log(cond ? '  ✔' : '  ✘', nome, detalhe ? '— ' + String(detalhe).replace(/\s+/g, ' ').slice(0, 170) : ''); return !!cond; };
  const resumo = (sair = true) => { const falhas = res.filter(x => !x).length; console.log(falhas ? `${falhas} falha(s)` : 'todos os testes passaram'); if (sair) process.exit(falhas ? 1 : 0); return falhas; };
  return { ok, resumo, res };
}
