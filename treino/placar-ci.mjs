// Lista de modelos da disputa do placar no CI (.github/workflows/placar.yml): imprime "matriz=<json>" para o GITHUB_OUTPUT.
// Uso: node treino/placar-ci.mjs ["nome|url\nnome|url…"]   (vazio = a disputa padrão abaixo)
// Cada faixa do app tem o modelo atual e os candidatos de 2026 do mesmo tamanho (ver docs/auditoria-2026-09-2.md §5).
const HF = 'https://huggingface.co';
const PADRAO = [
  // Lume (~0,8B): o atual contra a mesma rede menos comprimida
  ['lume-atual-q4km', `${HF}/unsloth/Qwen3.5-0.8B-GGUF/resolve/main/Qwen3.5-0.8B-Q4_K_M.gguf`],
  ['lume-q8', `${HF}/unsloth/Qwen3.5-0.8B-GGUF/resolve/main/Qwen3.5-0.8B-Q8_0.gguf`],
  ['lume-ud-q6kxl', `${HF}/unsloth/Qwen3.5-0.8B-GGUF/resolve/main/Qwen3.5-0.8B-UD-Q6_K_XL.gguf`],
  // Aurora (~2B): o atual contra Gemma 4 E2B, MiniCPM5-2B e LFM2.5-2.6B
  ['aurora-atual-q4km', `${HF}/unsloth/Qwen3.5-2B-GGUF/resolve/main/Qwen3.5-2B-Q4_K_M.gguf`],
  ['gemma4-e2b', `${HF}/unsloth/gemma-4-E2B-it-GGUF/resolve/main/gemma-4-E2B-it-Q4_K_M.gguf`],
  ['minicpm5-2b', `${HF}/openbmb/MiniCPM5-2B-GGUF/resolve/main/MiniCPM5-2B-Q4_K_M.gguf`],
  ['lfm25-2.6b', `${HF}/LiquidAI/LFM2.5-2.6B-GGUF/resolve/main/LFM2.5-2.6B-Q4_K_M.gguf`],
  // Ápice (~4B): o atual contra a quantização dinâmica da Unsloth e o Gemma 4 E4B
  ['apice-atual-q4km', `${HF}/unsloth/Qwen3.5-4B-GGUF/resolve/main/Qwen3.5-4B-Q4_K_M.gguf`],
  ['apice-ud-q4kxl', `${HF}/unsloth/Qwen3.5-4B-GGUF/resolve/main/Qwen3.5-4B-UD-Q4_K_XL.gguf`],
  ['gemma4-e4b', `${HF}/unsloth/gemma-4-E4B-it-GGUF/resolve/main/gemma-4-E4B-it-Q4_K_M.gguf`],
];
const entrada = String(process.argv[2] || '').trim();
const lista = entrada ? entrada.split(/[\n;]+/).map(l => l.trim()).filter(Boolean).map(l => l.split('|').map(s => s.trim())) : PADRAO;
const matriz = lista.filter(([n, u]) => /^[\w.-]{1,40}$/.test(n || '') && /^https:\/\/huggingface\.co\//.test(u || '')).map(([nome, url]) => ({ nome, url }));
if (!matriz.length) { console.error('nenhum modelo válido (nome|https://huggingface.co/…)'); process.exit(1); }
console.log('matriz=' + JSON.stringify(matriz));
