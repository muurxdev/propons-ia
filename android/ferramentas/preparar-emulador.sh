#!/usr/bin/env bash
# Prepara o teste no emulador (x86_64): NDK + cmake para compilar o motor x86_64, e o emulador com Android 15.
# O APK de verdade é só arm64; o x86_64 existe apenas para testar no emulador do PC/CI.
# Uso: bash android/ferramentas/preparar-emulador.sh   (usuário comum, SDK em $ANDROID_HOME gravável)
set -euo pipefail
export ANDROID_HOME="${ANDROID_HOME:-/opt/android-sdk}"
SDKM="$ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager"
NDKV="27.2.12479018"
yes | "$SDKM" --sdk_root="$ANDROID_HOME" --licenses >/dev/null 2>&1 || true
"$SDKM" --sdk_root="$ANDROID_HOME" "ndk;$NDKV" "cmake;3.22.1" "emulator" "system-images;android-35;google_apis;x86_64" >/dev/null
echo "ndk/emulador instalados"

# compila o llama-server para Android x86_64 (mesma versão b11070 do motor arm64)
RAIZ="$(cd "$(dirname "$0")/../.." && pwd)"
OUT="$RAIZ/linux/vendor/android-x86_64"
if [ ! -f "$OUT/llama-server" ]; then
  SRC=/tmp/llama.cpp-b11070
  [ -d "$SRC" ] || git clone -q --depth 1 --branch b11070 https://github.com/ggml-org/llama.cpp "$SRC"
  CMAKE="$ANDROID_HOME/cmake/3.22.1/bin/cmake"
  "$CMAKE" -S "$SRC" -B "$SRC/build-x86_64" -G Ninja -DCMAKE_MAKE_PROGRAM="$ANDROID_HOME/cmake/3.22.1/bin/ninja" \
    -DCMAKE_TOOLCHAIN_FILE="$ANDROID_HOME/ndk/$NDKV/build/cmake/android.toolchain.cmake" -DANDROID_ABI=x86_64 -DANDROID_PLATFORM=android-28 \
    -DCMAKE_BUILD_TYPE=Release -DBUILD_SHARED_LIBS=ON -DLLAMA_CURL=OFF -DLLAMA_OPENSSL=OFF -DGGML_OPENMP=OFF -DGGML_NATIVE=OFF \
    -DLLAMA_BUILD_TESTS=OFF -DLLAMA_BUILD_EXAMPLES=OFF -DLLAMA_BUILD_SERVER=ON >/dev/null
  "$CMAKE" --build "$SRC/build-x86_64" --target llama-server -j"$(nproc)" >/dev/null
  mkdir -p "$OUT"
  cp "$SRC/build-x86_64/bin/llama-server" "$OUT/"
  find "$SRC/build-x86_64" -name "*.so" -exec cp {} "$OUT/" \;
fi
ls "$OUT"; du -sh "$OUT"
