#!/usr/bin/env bash
# Compila o APK de release (assinado se houver chave configurada; senão, com a chave de depuração).
# Uso: bash android/compilar.sh   →  dist/android/Propons-IA-Android.apk
set -euo pipefail
AQUI="$(cd "$(dirname "$0")" && pwd)"; RAIZ="$(dirname "$AQUI")"
export ANDROID_HOME="${ANDROID_HOME:-/opt/android-sdk}"
GRADLE="${GRADLE:-$(command -v gradle || echo /opt/gradle/bin/gradle)}"
bash "$AQUI/preparar.sh"
cd "$AQUI"
"$GRADLE" --no-daemon -q assembleRelease
mkdir -p "$RAIZ/dist/android"
cp "$AQUI/app/build/outputs/apk/release/app-release.apk" "$RAIZ/dist/android/Propons-IA-Android.apk"
ls -la "$RAIZ/dist/android/Propons-IA-Android.apk"
