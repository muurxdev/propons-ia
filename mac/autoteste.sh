#!/usr/bin/env bash
# Autoteste do app do Mac (GitHub Actions): abre o app de verdade, que baixa o modelo Leve, liga a IA,
# responde "7 × 8", roda o Diagnóstico embutido e grava o resultado num JSON; depois confere o resultado.
set -uo pipefail
AQUI="$(cd "$(dirname "$0")" && pwd)"; RAIZ="$(dirname "$AQUI")"
APP="$RAIZ/dist/mac/Própons IA.app"
SAIDA="$RAIZ/dist/mac/autoteste.json"; rm -f "$SAIDA"
PROPONS_AUTOTESTE="$SAIDA" PROPONS_MODELO=leve PROPONS_SEM_GPU="${PROPONS_SEM_GPU:-1}" "$APP/Contents/MacOS/ProponsIA" &
PID=$!
for i in $(seq 1 900); do [ -f "$SAIDA" ] && break; kill -0 $PID 2>/dev/null || break; sleep 1; done
sleep 2; kill $PID 2>/dev/null
[ -f "$SAIDA" ] || { echo "o app não gravou o resultado"; tail -40 "$HOME/Library/Application Support/Propons IA/motor.log" 2>/dev/null; exit 1; }
node -e '
const r = JSON.parse(require("fs").readFileSync(process.argv[1], "utf8"));
if (r.erro) { console.log("ERRO:", r.erro); process.exit(1); }
const j = JSON.parse(r.resultado);
let falhas = 0; const ok = (n, c, d) => { console.log(c ? "  ✔" : "  ✘", n, d ? "— " + d : ""); if (!c) falhas++; };
ok("plataforma é mac", j.tipo === "mac", j.tipo);
ok("IA online", j.online);
ok("respondeu 7 × 8 = 56", /56/.test(j.resposta), JSON.stringify(j.resposta) + (j.velocidade ? " · " + j.velocidade.toFixed(1) + " tokens/s" : ""));
for (const d of j.diagnostico || []) console.log("     [" + d.st + "] " + d.titulo + ": " + (d.det || ""));
ok("diagnóstico sem erros", (j.diagnostico || []).length > 5 && !(j.diagnostico || []).some(d => d.st === "erro"));
ok("transcrição disponível", j.sistema && j.sistema.temTranscricao === true);
console.log(falhas ? falhas + " falha(s)" : "todos os testes passaram"); process.exit(falhas ? 1 : 0);
' "$SAIDA"
