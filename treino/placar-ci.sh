#!/usr/bin/env bash
# Um modelo do placar no CI: sobe o llama-server com os mesmos argumentos do app no PC (src/motor.json) e roda o
# placar no modo do app (treino/avaliar.mjs --auto --app). Uso: bash treino/placar-ci.sh <nome> <modelo.gguf> [vezes]
set -euo pipefail
NOME="$1"; MODELO="$2"; VEZES="${3:-1}"
RAIZ="$(cd "$(dirname "$0")/.." && pwd)"
SERVER="$(find /tmp/llama -name llama-server -type f | head -1)"
[ -n "$SERVER" ] || { echo "llama-server não encontrado"; exit 1; }
LD_LIBRARY_PATH="$(dirname "$SERVER"):${LD_LIBRARY_PATH:-}"; export LD_LIBRARY_PATH
# os argumentos do app no PC (texto de sistema fixo + pontos salvos, raciocínio limitado, cache q8), contexto de 16 mil
mapfile -t ARGS < <(node -e "const m=require('$RAIZ/src/motor.json');m.pc.args.forEach(a=>console.log(a))")
"$SERVER" -m "$MODELO" --host 127.0.0.1 --port 8765 -c 16384 "${ARGS[@]}" > "/tmp/motor-$NOME.log" 2>&1 &
PID=$!
trap 'kill $PID 2>/dev/null || true' EXIT
for _ in $(seq 1 180); do
  curl -fs http://127.0.0.1:8765/health >/dev/null 2>&1 && break
  kill -0 $PID 2>/dev/null || { echo "o motor caiu ao carregar $NOME:"; tail -40 "/tmp/motor-$NOME.log"; exit 1; }
  sleep 2
done
curl -fs http://127.0.0.1:8765/health >/dev/null || { echo "o motor não ficou pronto"; tail -40 "/tmp/motor-$NOME.log"; exit 1; }
node "$RAIZ/treino/avaliar.mjs" http://127.0.0.1:8765 --vezes "$VEZES" --nome "$NOME" --auto --app
