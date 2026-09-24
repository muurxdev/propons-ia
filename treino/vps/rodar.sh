#!/usr/bin/env bash
# Uma rodada de geração de dados na VPS (chamado pelo timer do systemd; ver instalar.sh).
# Atualiza o repositório, gera POR_RODADA exemplos da próxima matéria do rodízio com o professor e confere tudo.
set -euo pipefail
DIR="$HOME/propons-dados"
set -a
# shellcheck source=/dev/null
. "$DIR/.env"
set +a
[ -n "${PROFESSOR_CHAVE:-}" ] || { echo "sem PROFESSOR_CHAVE em $DIR/.env"; exit 1; }
cd "$DIR/repo"
git pull --ff-only --quiet || true
read -ra lista <<<"${MATERIAS:-matematica}"
n=$(( $(cat "$DIR/rodada" 2>/dev/null || echo 0) % ${#lista[@]} ))
echo $(( n + 1 )) >"$DIR/rodada"
materia="${lista[$n]}"
echo "rodada: $materia · ${POR_RODADA:-20} exemplos · $PROFESSOR_MODELO"
node treino/dados/gerar.mjs "$PROFESSOR_URL" --modelo "$PROFESSOR_MODELO" --materia "$materia" --n "${POR_RODADA:-20}" --paralelo 2
node treino/dados/validar.mjs
