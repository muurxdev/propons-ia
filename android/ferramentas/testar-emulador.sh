#!/usr/bin/env bash
# Teste de ponta a ponta no emulador Android (x86_64, Android 15):
# compila o APK de teste (motor x86_64, depurável), sobe o emulador, instala, abre, espera a IA ficar pronta
# e roda os testes da interface pelo protocolo de depuração da WebView (CDP), incluindo o Diagnóstico embutido.
# Uso: bash android/ferramentas/testar-emulador.sh [pasta-de-saída]
set -uo pipefail
export ANDROID_HOME="${ANDROID_HOME:-/opt/android-sdk}"
export PATH="$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator:$ANDROID_HOME/cmdline-tools/latest/bin:$PATH"
AQUI="$(cd "$(dirname "$0")/.." && pwd)"; RAIZ="$(dirname "$AQUI")"
SAIDA="${1:-$RAIZ/dist/teste-android}"; mkdir -p "$SAIDA"
PKG=io.github.muurxdev.proponsia
GRADLE="${GRADLE:-$(command -v gradle || echo /opt/gradle/bin/gradle)}"

echo "== APK de teste (x86_64 + arm64, depurável)"
PROPONS_X86_64=1 bash "$AQUI/preparar.sh" >/dev/null || exit 1
( cd "$AQUI" && PROPONS_X86_64=1 "$GRADLE" --no-daemon -q assembleDebug ) || exit 1
APK="$AQUI/app/build/outputs/apk/debug/app-debug.apk"; ls -la "$APK"

echo "== emulador"
if ! avdmanager list avd 2>/dev/null | grep -q "Name: propons"; then
  echo no | avdmanager create avd -n propons -k "system-images;android-35;google_apis;x86_64" -d pixel_6 >/dev/null
fi
adb start-server >/dev/null 2>&1
if ! adb devices | grep -q emulator; then
  nohup emulator -avd propons -no-window -no-audio -no-boot-anim -no-snapshot -gpu swiftshader_indirect -memory 4096 -cores 4 >"$SAIDA/emulador.log" 2>&1 &
fi
adb wait-for-device
for i in $(seq 1 180); do [ "$(adb shell getprop sys.boot_completed 2>/dev/null | tr -d '\r')" = 1 ] && break; sleep 2; done
echo "android $(adb shell getprop ro.build.version.release | tr -d '\r') pronto"
adb shell settings put global window_animation_scale 0; adb shell settings put global transition_animation_scale 0

echo "== instalar e abrir"
adb install -r -g "$APK" >/dev/null || exit 1
adb shell am force-stop $PKG; adb logcat -c
T0=$(date +%s)
adb shell am start -n $PKG/.MainActivity >/dev/null
# espera a IA ficar pronta (motor respondendo dentro do celular)
PRONTO=0
for i in $(seq 1 600); do
  if adb shell "run-as $PKG sh -c 'ls files/modelos 2>/dev/null'" 2>/dev/null | grep -q '\.gguf$'; then
    adb forward tcp:9765 tcp:8765 >/dev/null 2>&1
    if curl -sf --max-time 2 http://127.0.0.1:9765/health >/dev/null 2>&1; then PRONTO=1; break; fi
  fi
  sleep 2
done
echo "pronto=$PRONTO em $(( $(date +%s) - T0 ))s"
adb shell "run-as $PKG sh -c 'ls -la files/modelos; tail -5 files/motor.log'" 2>/dev/null
adb exec-out screencap -p >"$SAIDA/1-aberto.png"
[ $PRONTO = 1 ] || { adb logcat -d | grep -iE "proponsia|AndroidRuntime|FATAL" | tail -30; exit 1; }

echo "== testes na interface (CDP da WebView)"
PID=$(adb shell pidof $PKG | tr -d '\r')
adb forward tcp:9444 localabstract:webview_devtools_remote_$PID >/dev/null
sleep 2
node "$RAIZ/src/teste_celular.mjs" 9444 "$SAIDA"; R=$?
if [ -n "${FOTO:-}" ]; then echo "== fotos"; node "$RAIZ/src/teste_fotos.mjs" 9444 "$SAIDA" "$FOTO" || R=1; fi
if [ -n "${VOZ:-}" ]; then echo "== voz"; SEM_MIC=1 node "$RAIZ/src/teste_voz.mjs" 9444 "$SAIDA" "$VOZ" || R=1; fi
adb exec-out screencap -p >"$SAIDA/9-final.png"
exit $R
