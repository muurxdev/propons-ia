#!/usr/bin/env bash
# Prepara o Ubuntu (WSL) para o teste completo: instala o .deb da Própons IA e o Google Chrome. Rodar como root.
set -e
export DEBIAN_FRONTEND=noninteractive
RAIZ="$(cd "$(dirname "$0")/../.." && pwd)"
apt-get install -y -qq "$RAIZ/dist/linux/propons-ia_amd64.deb" >/dev/null
echo "pacote: $(dpkg -s propons-ia | grep -E '^(Version|Status)' | tr '\n' ' ')"
if ! command -v google-chrome-stable >/dev/null; then
  curl -fsSL -o /tmp/chrome.deb https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb
  apt-get install -y -qq /tmp/chrome.deb >/dev/null
fi
google-chrome-stable --version
command -v propons-ia && propons-ia --verificar
