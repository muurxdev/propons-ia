// Confere os arquivos .jsonl de treino (formato, tamanhos, duplicatas) e junta tudo em dados/tudo.jsonl (ShareGPT/ChatML-compatível).
// Uso: node treino/dados/validar.mjs   → resumo por tipo; sai com 1 se houver erro.
// Cada linha: {"licenca":"proprio|cc-by|publico", "tipo":"identidade|estilo|conhecimento|anti-alucinacao|anti-repeticao",
//              "messages":[{"role":"user"|"assistant"|"system","content":"…"}, …]}  (o system é opcional: o app já injeta o seu)
// Preferência (DPO/ORPO): {"tipo":"preferencia", "prompt":"…", "escolhida":"…", "rejeitada":"…"}
import fs from 'node:fs';
import path from 'node:path';
const aqui = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const arquivos = fs.readdirSync(aqui).filter(f => f.endsWith('.jsonl') && f !== 'tudo.jsonl');
const TIPOS = new Set(['identidade', 'estilo', 'conhecimento', 'anti-alucinacao', 'anti-repeticao', 'preferencia']);
const LICENCAS = new Set(['proprio', 'cc-by', 'cc-by-sa', 'publico', 'apache-2.0', 'mit']);
let erros = 0, total = 0; const porTipo = {}, vistos = new Set(), saida = [];
const norm = s => String(s).toLowerCase().replace(/\s+/g, ' ').trim();
for (const f of arquivos) {
  const linhas = fs.readFileSync(path.join(aqui, f), 'utf8').split('\n').filter(l => l.trim());
  linhas.forEach((l, i) => {
    const onde = `${f}:${i + 1}`; let d;
    try { d = JSON.parse(l); } catch (e) { console.log(`✘ ${onde}: JSON inválido`); erros++; return; }
    if (!TIPOS.has(d.tipo)) { console.log(`✘ ${onde}: tipo desconhecido "${d.tipo}"`); erros++; return; }
    if (!LICENCAS.has(d.licenca)) { console.log(`✘ ${onde}: licença desconhecida "${d.licenca}"`); erros++; return; }
    let chave;
    if (d.tipo === 'preferencia') {
      if (!d.prompt || !d.escolhida || !d.rejeitada) { console.log(`✘ ${onde}: preferência precisa de prompt, escolhida e rejeitada`); erros++; return; }
      chave = 'p:' + norm(d.prompt) + '|' + norm(d.escolhida);
    } else {
      const m = d.messages;
      if (!Array.isArray(m) || m.length < 2 || m[m.length - 1].role !== 'assistant') { console.log(`✘ ${onde}: messages precisa terminar com assistant`); erros++; return; }
      for (const x of m) { if (!['user', 'assistant', 'system'].includes(x.role) || typeof x.content !== 'string' || !x.content.trim()) { console.log(`✘ ${onde}: mensagem inválida`); erros++; return; } if (x.content.length > 6000) { console.log(`✘ ${onde}: mensagem com mais de 6000 caracteres`); erros++; return; } }
      const resp = m[m.length - 1].content;
      // identidade/anti-alucinação podem citar outros nomes para negar ("não sou o ChatGPT"); nos outros tipos é vazamento
      if (/\b(as an ai|as a language model|openai|chatgpt|qwen|alibaba)\b/i.test(resp) && d.tipo !== 'anti-alucinacao' && d.tipo !== 'identidade') { console.log(`✘ ${onde}: a resposta menciona outra identidade`); erros++; return; }
      chave = norm(m.filter(x => x.role === 'user').map(x => x.content).join('|')) + '|' + norm(resp).slice(0, 200);
    }
    if (vistos.has(chave)) { console.log(`✘ ${onde}: duplicada`); erros++; return; }
    vistos.add(chave); total++; porTipo[d.tipo] = (porTipo[d.tipo] || 0) + 1; saida.push(JSON.stringify(d));
  });
}
fs.writeFileSync(path.join(aqui, 'tudo.jsonl'), saida.join('\n') + '\n');
console.log(`${total} exemplos válidos em ${arquivos.length} arquivo(s) → dados/tudo.jsonl`);
for (const [t, n] of Object.entries(porTipo)) console.log(`  ${t}: ${n}`);
if (erros) { console.log(`${erros} erro(s)`); process.exit(1); }
