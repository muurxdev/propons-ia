#!/usr/bin/env bash
# Abre a Própons IA como um usuário comum faria e mede: download, motor, janela e uma resposta.
DADOS="$HOME/.local/share/propons-ia"
T0=$(date +%s)
setsid propons-ia >/tmp/propons-teste.log 2>&1 < /dev/null &
for i in $(seq 1 600); do
  [ -f "$DADOS/motor.porta" ] && curl -sf "http://127.0.0.1:$(cat "$DADOS/motor.porta")/health" >/dev/null && break
  sleep 1
done
PORTA=$(cat "$DADOS/motor.porta" 2>/dev/null)
echo "pronta em $(( $(date +%s) - T0 ))s na porta ${PORTA:-?}"
ls -la "$DADOS/modelos" | tail -n +2
echo "sha256 ok: $(sha256sum "$DADOS/modelos/Qwen3.5-2B-Q4_K_M.gguf" | cut -c1-16)"
sleep 4
echo "janela (processos do Chrome com --app): $(pgrep -fc -- '--app=http://127.0.0.1')"
echo "interface servida: $(curl -s "http://127.0.0.1:$PORTA/" | grep -o '<title>[^<]*</title>')"
echo "--- pergunta de teste ---"
curl -s "http://127.0.0.1:$PORTA/v1/chat/completions" -H 'Content-Type: application/json' \
  -d '{"messages":[{"role":"user","content":"Responda em uma frase: qual a capital do Brasil?"}],"max_tokens":60,"chat_template_kwargs":{"enable_thinking":false}}' \
  | grep -o '"content":"[^"]*"' | head -1
