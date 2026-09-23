#!/usr/bin/env bash
# Prepara o projeto Android antes do Gradle:
#  - motor: llama-server do llama.cpp para Android (arm64) → app/src/main/jniLibs/arm64-v8a (sem símbolos de depuração)
#  - interface: payload/interface → app/src/main/assets/interface
# Uso: bash android/preparar.sh      (requer: curl, tar, e um "strip" para arm64: llvm-strip do NDK ou aarch64-linux-gnu-strip)
set -euo pipefail
LLAMA="b11070"
AQUI="$(cd "$(dirname "$0")" && pwd)"; RAIZ="$(dirname "$AQUI")"
VENDOR="$RAIZ/linux/vendor"; mkdir -p "$VENDOR"
TGZ="$VENDOR/llama-android-arm64.tar.gz"
. "$RAIZ/ferramentas/baixar.sh"   # downloads conferidos por SHA-256
baixar_verificado "https://github.com/ggml-org/llama.cpp/releases/download/$LLAMA/llama-$LLAMA-bin-android-arm64.tar.gz" "$TGZ"

STRIP=""
for s in "${ANDROID_NDK_HOME:-/nonexistent}"/toolchains/llvm/prebuilt/*/bin/llvm-strip "${ANDROID_NDK_ROOT:-/nonexistent}"/toolchains/llvm/prebuilt/*/bin/llvm-strip llvm-strip aarch64-linux-gnu-strip; do
  if command -v "$s" >/dev/null 2>&1 || [ -x "$s" ]; then STRIP="$s"; break; fi
done
[ -n "$STRIP" ] || { echo "Falta um strip para arm64 (instale binutils-aarch64-linux-gnu ou o NDK)"; exit 1; }

LIBS="$AQUI/app/src/main/jniLibs/arm64-v8a"
rm -rf "$LIBS"; mkdir -p "$LIBS"
T="$(mktemp -d)"; trap 'rm -rf "$T"' EXIT
tar xzf "$TGZ" -C "$T"; SRC="$T/llama-$LLAMA"
cp "$SRC/llama-server" "$LIBS/libllama_server.so"      # executável empacotado como "biblioteca" (única pasta executável no Android 10+)
for f in "$SRC"/lib*.so; do
  b="$(basename "$f")"
  case "$b" in *-impl.so) [ "$b" = "libllama-server-impl.so" ] || continue ;; esac
  cp "$f" "$LIBS/$b"
done
"$STRIP" --strip-unneeded "$LIBS"/*.so
chmod 755 "$LIBS"/*.so
echo "motor: $(ls "$LIBS" | wc -l) arquivos, $(du -sh "$LIBS" | cut -f1) (strip: $STRIP)"

# transcrição de áudio: whisper-cli estático (compilado com o NDK; ver ferramentas/compilar-whisper.sh)
W="$RAIZ/linux/vendor/android-arm64-whisper/whisper-cli"
[ -f "$W" ] || bash "$AQUI/ferramentas/compilar-whisper.sh" arm64-v8a
cp "$W" "$LIBS/libwhisper_cli.so"; chmod 755 "$LIBS/libwhisper_cli.so"

# motor x86_64 (só para o emulador de testes)
X="$AQUI/app/src/main/jniLibs/x86_64"; rm -rf "$X"
if [ "${PROPONS_X86_64:-0}" = 1 ]; then
  O="$RAIZ/linux/vendor/android-x86_64"
  [ -f "$O/llama-server" ] || { echo "Falta o motor x86_64: rode android/ferramentas/preparar-emulador.sh"; exit 1; }
  mkdir -p "$X"; cp "$O/llama-server" "$X/libllama_server.so"; cp "$O"/*.so "$X/"
  STRIPX="$(ls "${ANDROID_HOME:-/opt/android-sdk}"/ndk/*/toolchains/llvm/prebuilt/*/bin/llvm-strip 2>/dev/null | head -1)"
  [ -n "$STRIPX" ] && "$STRIPX" --strip-unneeded "$X"/*.so
  WX="$RAIZ/linux/vendor/android-x86_64-whisper/whisper-cli"
  [ -f "$WX" ] || bash "$AQUI/ferramentas/compilar-whisper.sh" x86_64
  cp "$WX" "$X/libwhisper_cli.so"
  chmod 755 "$X"/*.so; echo "motor x86_64 (teste): $(ls "$X" | wc -l) arquivos"
fi

[ -f "$RAIZ/payload/interface/index.html" ] || node "$RAIZ/src/montar.js"
node "$RAIZ/src/montar.js" >/dev/null
A="$AQUI/app/src/main/assets/interface"; rm -rf "$A"; mkdir -p "$A"
cp "$RAIZ/payload/interface/index.html" "$RAIZ/payload/interface/conhecimento.md" "$RAIZ/payload/interface/"*.mjs "$RAIZ/payload/interface/"*.js "$A/"   # + pdf.js e mammoth como arquivos
echo "interface: $(ls "$A" | tr '\n' ' ')"
