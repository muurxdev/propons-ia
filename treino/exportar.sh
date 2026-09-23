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
# Qwen3.5 tem uma camada MTP (mtp.*) que o merge do LoRA descarta; o conversor exige ela (mtp_num_hidden_layers = 1)
# e o llama.cpp procura blk.24. Copia os tensores mtp do checkpoint base (não são treinados) para o mesclado.
BASE="${BASE:-unsloth/Qwen3.5-0.8B}" python - "$ORIGEM" <<'EOF'
import sys, os, glob, json
from safetensors import safe_open
from safetensors.torch import save_file
from huggingface_hub import snapshot_download
dest = sys.argv[1]; base = snapshot_download(os.environ["BASE"], allow_patterns=["*.safetensors", "*.json"])
mtp = {}
for f in glob.glob(base + "/*.safetensors"):
    with safe_open(f, "pt") as s:
        for k in s.keys():
            if "mtp" in k: mtp[k] = s.get_tensor(k)
arqs = glob.glob(dest + "/*.safetensors")
with safe_open(arqs[0], "pt") as s: t = {k: s.get_tensor(k) for k in s.keys()}
if not any("mtp" in k for k in t): t.update(mtp); save_file(t, arqs[0], metadata={"format": "pt"}); print("mtp copiado:", len(mtp), "tensores")
c = json.load(open(dest + "/config.json")); c["mtp_num_hidden_layers"] = 1; json.dump(c, open(dest + "/config.json", "w"), indent=2)
EOF
python "$LLAMA/convert_hf_to_gguf.py" "$ORIGEM" --outtype f16 --outfile "$SAIDA/$NOME-F16.gguf"
for Q in Q4_K_M Q5_K_M; do
  "$LLAMA/build/bin/llama-quantize" "$SAIDA/$NOME-F16.gguf" "$SAIDA/$NOME-$Q.gguf" "$Q" >/dev/null
  printf '%s  %s  %s bytes\n' "$(sha256sum "$SAIDA/$NOME-$Q.gguf" | cut -d' ' -f1)" "$NOME-$Q.gguf" "$(stat -c %s "$SAIDA/$NOME-$Q.gguf")"
done
echo "Agora: node treino/avaliar.mjs contra um llama-server com o GGUF novo; publique no Hugging Face só se o placar melhorar."
