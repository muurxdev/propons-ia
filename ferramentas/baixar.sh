#!/usr/bin/env bash
# baixar_verificado <url> <destino>: baixa (com retomada e 3 tentativas) e confere o SHA-256 em ferramentas/terceiros.sums.
# Se o arquivo já existe e confere, não baixa de novo; se existe e não confere, apaga e baixa. Sem hash conhecido → erro.
# Uso nos builds:  . "$RAIZ/ferramentas/baixar.sh"; baixar_verificado "$URL" "$ARQ"
baixar_verificado() {
  local url="$1" dest="$2" sums="${TERCEIROS_SUMS:-$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/terceiros.sums}"
  local esperado; esperado="$(grep -F -- "  $url" "$sums" 2>/dev/null | grep -v '^#' | awk '{print $1}' | head -1)"
  [ -n "$esperado" ] || { echo "baixar_verificado: sem hash em terceiros.sums para $url" >&2; return 1; }
  _sha() { if command -v sha256sum >/dev/null 2>&1; then sha256sum "$1" | awk '{print $1}'; else shasum -a 256 "$1" | awk '{print $1}'; fi; }
  if [ -f "$dest" ]; then
    [ "$(_sha "$dest")" = "$esperado" ] && return 0
    echo "baixar_verificado: $dest não confere; baixando de novo" >&2; rm -f "$dest"
  fi
  mkdir -p "$(dirname "$dest")"
  curl -fL --retry 3 --retry-all-errors --retry-delay 5 -C - -o "$dest" "$url" || return 1
  local obtido; obtido="$(_sha "$dest")"
  if [ "$obtido" != "$esperado" ]; then echo "baixar_verificado: SHA-256 errado para $url" >&2; echo "  esperado $esperado" >&2; echo "  obtido   $obtido" >&2; rm -f "$dest"; return 1; fi
}
