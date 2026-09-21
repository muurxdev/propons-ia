#!/usr/bin/env bash
# Prepara o projeto iOS (roda no macOS do GitHub Actions ou em um Mac):
#  - baixa o llama.xcframework (llama.cpp b11070) para ios/Frameworks
#  - copia a interface e a tela de carregamento para ios/Recursos
set -euo pipefail
LLAMA="b11070"
AQUI="$(cd "$(dirname "$0")" && pwd)"; RAIZ="$(dirname "$AQUI")"
mkdir -p "$AQUI/Frameworks" "$AQUI/Recursos/interface"
if [ ! -d "$AQUI/Frameworks/llama.xcframework" ]; then
  Z="$RAIZ/linux/vendor/llama-xcframework.zip"; mkdir -p "$(dirname "$Z")"
  [ -f "$Z" ] || curl -fL -o "$Z" "https://github.com/ggml-org/llama.cpp/releases/download/$LLAMA/llama-$LLAMA-xcframework.zip"
  T="$(mktemp -d)"; unzip -q "$Z" -d "$T"
  mv "$T/build-apple/llama.xcframework" "$AQUI/Frameworks/"; rm -rf "$T"
fi
node "$RAIZ/src/montar.js" >/dev/null
cp "$RAIZ/payload/interface/index.html" "$RAIZ/payload/interface/conhecimento.md" "$AQUI/Recursos/interface/"
cp "$RAIZ/android/app/src/main/assets/splash.html" "$AQUI/Recursos/splash.html"
echo "iOS pronto: $(ls "$AQUI/Frameworks") · interface: $(ls "$AQUI/Recursos/interface" | tr '\n' ' ')"
