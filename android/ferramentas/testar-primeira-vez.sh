#!/usr/bin/env bash
# Teste da primeira abertura no emulador: instala o APK de teste, apaga os dados do app (como uma instalação nova),
# abre e roda src/testes/teste_escolher.mjs (chat → primeira mensagem → Baixar com a bolinha de % → a IA responde).
# Uso: bash android/ferramentas/testar-primeira-vez.sh [pasta-de-saída] [modelo]
set -uo pipefail
export ANDROID_HOME="${ANDROID_HOME:-/opt/android-sdk}"
export PATH="$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator:$PATH"
AQUI="$(cd "$(dirname "$0")/.." && pwd)"; RAIZ="$(dirname "$AQUI")"
SAIDA="${1:-$RAIZ/dist/teste-primeira-vez-android}"; MODELO="${2:-leve}"; mkdir -p "$SAIDA"
PKG=io.github.muurxdev.proponsia
APK="$AQUI/app/build/outputs/apk/debug/app-debug.apk"
adb start-server >/dev/null 2>&1
if ! adb devices | grep -q emulator; then
  nohup emulator -avd propons -no-window -no-audio -no-boot-anim -no-snapshot -gpu swiftshader_indirect -memory 4096 -cores 4 >"$SAIDA/emulador.log" 2>&1 &
fi
adb wait-for-device
for i in $(seq 1 180); do [ "$(adb shell getprop sys.boot_completed 2>/dev/null | tr -d '\r')" = 1 ] && break; sleep 2; done
adb install -r -g "$APK" >/dev/null || exit 1
adb shell pm clear $PKG >/dev/null                      # como instalação nova: sem modelo, sem configuração
adb shell pm grant $PKG android.permission.POST_NOTIFICATIONS 2>/dev/null
adb shell am start -n $PKG/.MainActivity >/dev/null
for i in $(seq 1 60); do PID=$(adb shell pidof $PKG | tr -d '\r'); [ -n "$PID" ] && break; sleep 1; done
sleep 4
adb forward tcp:9444 localabstract:webview_devtools_remote_$PID >/dev/null
adb exec-out screencap -p >"$SAIDA/0-aberto.png"
node "$RAIZ/src/testes/teste_escolher.mjs" 9444 "$SAIDA" "$MODELO"; R=$?
adb exec-out screencap -p >"$SAIDA/9-final.png"
# abertura fria: com o modelo já baixado, o app abre no chat sem ligar a IA; a primeira mensagem liga e é respondida
if [ $R -eq 0 ]; then
  echo "== abertura fria"
  adb shell am force-stop $PKG; sleep 1
  adb shell am start -n $PKG/.MainActivity >/dev/null
  for i in $(seq 1 60); do PID=$(adb shell pidof $PKG | tr -d '\r'); [ -n "$PID" ] && break; sleep 1; done
  sleep 3; adb forward tcp:9444 localabstract:webview_devtools_remote_$PID >/dev/null
  node "$RAIZ/src/testes/teste_frio.mjs" 9444 "$SAIDA" || R=1
fi
exit $R
