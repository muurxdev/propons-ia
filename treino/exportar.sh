#!/usr/bin/env bash
# Depois do treino: modelo mesclado (HF) → GGUF F16 → Q4_K_M (e Q5_K_M), com SHA-256 e tamanho para colar nos hosts.
# Uso: bash treino/exportar.sh treino/saida/lume-v1-merged propons-lume-v1
# Requer: git, cmake, python (o mesmo venv do treino: gguf, numpy, sentencepiece via convert_hf_to_gguf.py)
set -euo pipefail
ORIGEM="${1:?pasta do modelo mesclado (…-merged)}"; NOME="${2:?nome base do gguf}"
AQUI="$(cd "$(dirname "$0")" && pwd)"; LLAMA="$AQUI/.llama.cpp"; SAIDA="$AQUI/gguf"; mkdir -p "$SAIDA"
if [ ! -d "$LLAMA" ]; then git clone -q --depth 1 --branch b11070 https://github.com/ggml-org/llama.cpp "$LLAMA"; fi
if [ ! -x "$LLAMA/build/bin/llama-quantize" ]; then cmake -S "$LLAMA" -B "$LLAMA/build" -DGGML_NATIVE=ON -DLLAMA_CURL=OFF >/dev/null; cmake --build "$LLAMA/build" --target llama-quantize -j"$(nproc)" >/dev/null; fi
python -m pip install --quiet -r "$LLAMA/requirements/requirements-convert_hf_to_gguf.txt" 2>/dev/null || true
python "$LLAMA/convert_hf_to_gguf.py" "$ORIGEM" --outtype f16 --outfile "$SAIDA/$NOME-F16.gguf"
for Q in Q4_K_M Q5_K_M; do
  "$LLAMA/build/bin/llama-quantize" "$SAIDA/$NOME-F16.gguf" "$SAIDA/$NOME-$Q.gguf" "$Q" >/dev/null
  printf '%s  %s  %s bytes\n' "$(sha256sum "$SAIDA/$NOME-$Q.gguf" | cut -d' ' -f1)" "$NOME-$Q.gguf" "$(stat -c %s "$SAIDA/$NOME-$Q.gguf")"
done
echo "Agora: node treino/avaliar.mjs contra um llama-server com o GGUF novo; publique no Hugging Face só se o placar melhorar."
