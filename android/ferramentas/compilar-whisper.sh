#!/usr/bin/env bash
# Compila o whisper-cli (transcrição de áudio, whisper.cpp) para Android como um executável único (ggml estático),
# para não conflitar com as bibliotecas ggml do motor da IA. Saída: linux/vendor/android-<abi>-whisper/whisper-cli
# Uso: bash android/ferramentas/compilar-whisper.sh [arm64-v8a|x86_64 ...]   (padrão: arm64-v8a)
set -euo pipefail
AQUI="$(cd "$(dirname "$0")/.." && pwd)"; RAIZ="$(dirname "$AQUI")"
VERSAO_WHISPER=b5130
export ANDROID_HOME="${ANDROID_HOME:-/opt/android-sdk}"
NDK="${ANDROID_NDK_HOME:-$(ls -d "$ANDROID_HOME"/ndk/* 2>/dev/null | sort -V | tail -1)}"
[ -d "$NDK" ] || { echo "NDK não encontrado (instale ndk;27.2.12479018)"; exit 1; }
FONTE="${TMPDIR:-/tmp}/whisper.cpp-$VERSAO_WHISPER"
[ -d "$FONTE" ] || git clone -q --depth 1 --branch "$VERSAO_WHISPER" https://github.com/ggml-org/whisper.cpp "$FONTE"
[ "$(git -C "$FONTE" rev-parse HEAD)" = 927cfce34f31707e17f2bff35c349632fb9e2c3a ] || { echo "whisper.cpp $VERSAO_WHISPER: commit inesperado"; exit 1; }
ABIS=("$@"); [ ${#ABIS[@]} -gt 0 ] || ABIS=(arm64-v8a)
for ABI in "${ABIS[@]}"; do
  case "$ABI" in arm64-v8a) NOME=android-arm64 ;; x86_64) NOME=android-x86_64 ;; *) echo "ABI desconhecida: $ABI"; exit 1 ;; esac
  B="$FONTE/build-$ABI"
  cmake -S "$FONTE" -B "$B" -G "Unix Makefiles" -DCMAKE_BUILD_TYPE=Release \
    -DCMAKE_TOOLCHAIN_FILE="$NDK/build/cmake/android.toolchain.cmake" -DANDROID_ABI="$ABI" -DANDROID_PLATFORM=android-28 \
    -DBUILD_SHARED_LIBS=OFF -DGGML_NATIVE=OFF -DGGML_OPENMP=OFF -DWHISPER_BUILD_TESTS=OFF -DWHISPER_BUILD_SERVER=OFF \
    -DWHISPER_BUILD_EXAMPLES=ON -DWHISPER_SDL2=OFF -DWHISPER_CURL=OFF >/dev/null
  cmake --build "$B" --target whisper-cli -j"$(nproc)" >/dev/null
  mkdir -p "$RAIZ/linux/vendor/$NOME-whisper"
  cp "$B/bin/whisper-cli" "$RAIZ/linux/vendor/$NOME-whisper/whisper-cli"
  "$NDK"/toolchains/llvm/prebuilt/linux-x86_64/bin/llvm-strip "$RAIZ/linux/vendor/$NOME-whisper/whisper-cli"
  echo "whisper-cli ($ABI): $(du -h "$RAIZ/linux/vendor/$NOME-whisper/whisper-cli" | cut -f1)"
done
