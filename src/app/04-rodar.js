/* ---------------- Área de código → Rodar ----------------
   O que a IA escreveu roda de verdade, e o erro volta para ela corrigir (o ciclo "rodar e consertar" do Claude Code).
   - No PC (Windows): Python e JavaScript rodam com o Python/Node instalados, numa pasta temporária com uma cópia do
     projeto (nunca na pasta de verdade), 20 s no máximo.
   - Em qualquer aparelho: JavaScript roda num Worker isolado (sem acesso à página nem à internet do app), 5 s no máximo.
   Só roda quando a pessoa toca em "Rodar". O que o programa lê do teclado (input) é perguntado antes. */
ICO.rodar = '<svg viewBox="0 0 24 24"><path d="M7 5l12 7-12 7z"/></svg>';
const RODA_NO_PC = /\.(py|js|mjs|cjs)$/i, RODA_NO_WORKER = /\.(js|mjs|cjs)$/i;
const podeRodar = nome => (PLATAFORMA.podeRodar && RODA_NO_PC.test(nome)) || RODA_NO_WORKER.test(nome);
const LE_TECLADO = /\binput\s*\(|sys\.stdin|readline|\bprompt\s*\(|process\.stdin/;
function rodarNoWorker(codigo, entrada) {
  return new Promise(res => {
    const linhas = JSON.stringify(String(entrada || '').split('\n'));
    const fonte = `const __s = [], __e = [];
const __f = a => a.map(x => typeof x === 'string' ? x : (() => { try { return JSON.stringify(x); } catch (e) { return String(x); } })()).join(' ');
console.log = console.info = console.debug = (...a) => __s.push(__f(a)); console.warn = console.error = (...a) => __e.push(__f(a));
const __in = ${linhas}; let __i = 0; self.prompt = () => (__i < __in.length ? __in[__i++] : null);
self.fetch = self.XMLHttpRequest = self.WebSocket = self.importScripts = undefined;
self.onmessage = async () => { let c = 0; try { await (async () => {
${codigo}
})(); } catch (e) { __e.push(String((e && e.stack) || e)); c = 1; } postMessage({ saida: __s.join('\\n'), erros: __e.join('\\n'), codigo: c }); };`;
    let w, url;
    try { url = URL.createObjectURL(new Blob([fonte], { type: 'text/javascript' })); w = new Worker(url); }
    catch (e) { res({ saida: '', erros: 'Não deu para rodar aqui: ' + e.message, codigo: 1 }); return; }
    const t0 = performance.now();
    const fim = r => { clearTimeout(tempo); try { w.terminate(); } catch (e) {} URL.revokeObjectURL(url); res(Object.assign({ segundos: Math.round((performance.now() - t0) / 100) / 10, comando: 'javascript' }, r)); };
    const tempo = setTimeout(() => fim({ saida: '', erros: 'O programa passou de 5 segundos e foi parado (laço infinito?).', codigo: -1, esgotou: true }), 5000);
    w.onmessage = e => fim(e.data);
    w.onerror = e => { e.preventDefault(); fim({ saida: '', erros: String(e.message || 'erro de sintaxe'), codigo: 1 }); };
    w.postMessage(1);
  });
}
// roda um arquivo do projeto e guarda a saída no chat de código (a IA vê na próxima pergunta)
async function rodarArquivo(caminho, depois) {
  if (!podeRodar(caminho)) { toast(PLATAFORMA.podeRodar ? 'Por enquanto só Python e JavaScript rodam aqui.' : 'Neste aparelho só JavaScript roda (Python roda no app do PC).', 4000); return; }
  let codigo = '';
  try { codigo = await arqs.ler(caminho); } catch (e) { toast('Não consegui ler "' + caminho + '".'); return; }
  let entrada = '';
  if (LE_TECLADO.test(codigo)) {
    const v = await perguntarTexto('O programa lê do teclado', '', { multilinha: true, max: 4000, rotulo: 'Rodar', dica: 'Escreva o que você digitaria, uma linha para cada leitura (input). Pode deixar vazio.' });
    if (v === null) return;
    entrada = v;
  }
  toast('Rodando ' + nomeCurto(caminho) + '…', 1500);
  let r;
  try {
    if (PLATAFORMA.podeRodar && RODA_NO_PC.test(caminho)) {
      // uma cópia do projeto (só os arquivos de texto) para os imports entre arquivos funcionarem
      const lista = (await arqs.listar()).slice(0, 200), arquivos = []; let total = 0;
      for (const a of lista) { if (total > 3e6) break; try { const c = a.nome === caminho ? codigo : await arqs.ler(a.nome); total += c.length; arquivos.push({ nome: a.nome, conteudo: c }); } catch (e) {} }
      if (!arquivos.some(a => a.nome === caminho)) arquivos.push({ nome: caminho, conteudo: codigo });
      r = await PLATAFORMA.rodarCodigo({ arquivos, principal: caminho, entrada });
    } else r = await rodarNoWorker(codigo, entrada);
  } catch (e) { r = { saida: '', erros: e.message, codigo: -1, comando: nomeCurto(caminho) }; }
  const ch = codigoChat();
  ch.msgs.push({ role: 'saida', arquivo: caminho, comando: r.comando || nomeCurto(caminho), codigo: r.codigo, esgotou: !!r.esgotou, segundos: r.segundos,
    texto: (String(r.saida || '') + (r.erros ? (r.saida ? '\n' : '') + String(r.erros) : '')).slice(-8000) });
  salvarCodigoChat(ch);
  if (depois) depois();
}
// a saída no chat de código: terminal com o comando, o código de saída e, se deu erro, "Pedir para a IA corrigir"
function htmlSaidaCodigo(m, i) {
  const ok = m.codigo === 0 && !m.esgotou;
  return `<div class="cod-saida ${ok ? 'ok' : 'erro'}"><div class="cs-topo">${ICO.rodar}<code>${esc(m.comando || '')}</code><span>${m.esgotou ? 'parado por tempo' : ok ? 'terminou' : 'erro (código ' + esc(String(m.codigo)) + ')'}${m.segundos != null ? ' · ' + String(m.segundos).replace('.', ',') + ' s' : ''}</span></div>
    <pre>${esc(m.texto || '(sem saída)')}</pre>${ok ? '' : `<div class="cs-pe"><button class="btn primario" data-corrigir="${i}">Pedir para a IA corrigir</button></div>`}</div>`;
}
// como a saída entra no histórico que a IA vê
const saidaParaIA = m => `[Rodei ${m.arquivo} (${m.comando}): ${m.esgotou ? 'parou por tempo' : 'código de saída ' + m.codigo}]\n\`\`\`\n${String(m.texto || '(sem saída)').slice(-2500)}\n\`\`\``;
