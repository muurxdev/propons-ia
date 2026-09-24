#!/usr/bin/env bash
# Lint do JavaScript montado (ESLint) e shellcheck dos scripts. O CI roda em toda tag e em todo pull request.
# Uso: bash ferramentas/verificar.sh   (precisa de node, npm e shellcheck no PATH; SHELLCHECK=<caminho> troca o binário)
set -euo pipefail
cd "$(dirname "$0")/.."
node src/montar.js --bundle dist/bundle.js
[ -x ferramentas/lint/node_modules/.bin/eslint ] || (cd ferramentas/lint && npm i --no-save --silent eslint@9 globals@16)
ferramentas/lint/node_modules/.bin/eslint -c ferramentas/lint/eslint.config.mjs dist/bundle.js
git ls-files linux android ios mac treino ferramentas | grep -E '\.sh$|linux/propons-ia$|PKGBUILD$' | xargs "${SHELLCHECK:-shellcheck}" -S warning
# visual: contraste AA nos dois temas (app e site) e tamanhos de letra só pelos tokens (--t-xs … --t-2xl)
node ferramentas/contraste.js >/dev/null || node ferramentas/contraste.js
node ferramentas/contraste.js --site >/dev/null || node ferramentas/contraste.js --site
if grep -n "font-size:[0-9]" src/index.template.html; then echo "font-size em número: use os tokens --t-*"; exit 1; fi
echo "lint, shellcheck, contraste e tipografia ok"
