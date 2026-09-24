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
# avdmanager e emulator precisam concordar onde fica o AVD (no CI o avdmanager gravava num lugar e o emulator procurava noutro)
export ANDROID_USER_HOME="${ANDROID_USER_HOME:-$HOME/.android}"; export ANDROID_AVD_HOME="${ANDROID_AVD_HOME:-$ANDROID_USER_HOME/avd}"; mkdir -p "$ANDROID_AVD_HOME"
AVDM="$ANDROID_HOME/cmdline-tools/latest/bin/avdmanager"
if ! emulator -list-avds 2>/dev/null | grep -qx propons; then
  echo no | "$AVDM" create avd -n propons -k "system-images;android-35;google_apis;x86_64" -d pixel_6 --force || { echo "avdmanager falhou"; exit 1; }
fi
emulator -list-avds | grep -qx propons || { echo "AVD 'propons' não apareceu em $ANDROID_AVD_HOME"; ls -la "$ANDROID_AVD_HOME"; exit 1; }
adb start-server >/dev/null 2>&1
if ! adb devices | grep -q emulator; then
  nohup emulator -avd propons -no-window -no-audio -no-boot-anim -no-snapshot -gpu swiftshader_indirect -memory "${EMU_MEM:-4096}" -cores 4 >"$SAIDA/emulador.log" 2>&1 &
fi
timeout 300 adb wait-for-device || { echo "emulador não apareceu em 5 min"; tail -30 "$SAIDA/emulador.log"; exit 1; }
BOOT=0; for i in $(seq 1 240); do [ "$(adb shell getprop sys.boot_completed 2>/dev/null | tr -d '\r')" = 1 ] && { BOOT=1; break; }; sleep 2; done
[ $BOOT = 1 ] || { echo "emulador não terminou de ligar em 8 min"; tail -30 "$SAIDA/emulador.log"; exit 1; }
echo "android $(adb shell getprop ro.build.version.release | tr -d '\r') pronto"
adb shell settings put global window_animation_scale 0; adb shell settings put global transition_animation_scale 0

echo "== instalar e abrir"
adb install -r -g "$APK" >/dev/null || exit 1
adb shell am force-stop $PKG; sleep 3; adb logcat -c
T0=$(date +%s)
if ! adb shell "run-as $PKG sh -c 'ls files/modelos 2>/dev/null'" 2>/dev/null | grep -q '\.gguf$'; then
  # aparelho limpo (CI): o app abre no chat e a primeira mensagem escolhe e baixa o Lume — teste_escolher.mjs faz isso
  echo "== primeira vez: escolher e baixar o modelo Leve"
  adb shell am start -n $PKG/.MainActivity >/dev/null; sleep 4
  PID=$(adb shell pidof $PKG | tr -d '\r'); adb forward tcp:9444 localabstract:webview_devtools_remote_$PID >/dev/null
  node "$RAIZ/src/testes/teste_escolher.mjs" 9444 "$SAIDA/escolher" leve || { adb logcat -d | grep -iE "proponsia|AndroidRuntime|FATAL" | tail -30; exit 1; }
  adb shell am force-stop $PKG; sleep 3
fi
adb shell am start -n $PKG/.MainActivity --ez ligar true >/dev/null
# espera a IA ficar pronta (motor respondendo dentro do celular)
PRONTO=0; PORTA=8765
for i in $(seq 1 600); do
  if adb shell "run-as $PKG sh -c 'ls files/modelos 2>/dev/null'" 2>/dev/null | grep -q '\.gguf$'; then
    # o motor usa a primeira porta livre a partir de 8765 (a anterior pode estar em TIME_WAIT)
    for PORTA in 8765 8766 8767 8768; do
      adb forward tcp:9765 tcp:$PORTA >/dev/null 2>&1
      if curl -sf --max-time 2 http://127.0.0.1:9765/health >/dev/null 2>&1; then PRONTO=1; break 2; fi
    done
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
node "$RAIZ/src/testes/teste_celular.mjs" 9444 "$SAIDA"; R=$?
echo "   motor na porta $PORTA · pedidos recusados por chave: $(adb shell "run-as $PKG grep -c unauthorized files/motor.log" 2>/dev/null | tr -d '\r')"
if [ $R -ne 0 ]; then   # diagnóstico: página x chave do motor x processos
  echo "   páginas: $(curl -s http://127.0.0.1:9444/json | grep -o '"url": "[^"]*"' | tr '\n' ' ')"
  echo "   chave no arquivo: $(adb shell "run-as $PKG cat files/motor.chave" 2>/dev/null | tr -d '\r')"
  for p in $(adb shell ps -A | grep -i llama_server | awk '{print $2}'); do echo "   motor pid $p: $(adb shell "run-as $PKG cat /proc/$p/cmdline" 2>/dev/null | tr '\0' ' ' | grep -o -- '--port [0-9]*')"; done
  echo "   activities: $(adb shell dumpsys activity activities 2>/dev/null | grep -c 'proponsia/.MainActivity')"
  adb logcat -d 2>/dev/null | grep -i "proponsia" | grep -iv "ApkAssets\|AppsFilter" | tail -12
fi
if [ -n "${FOTO:-}" ]; then echo "== fotos"; node "$RAIZ/src/testes/teste_fotos.mjs" 9444 "$SAIDA" "$FOTO" || R=1; fi
if [ -n "${VOZ:-}" ]; then echo "== voz"; SEM_MIC=1 node "$RAIZ/src/testes/teste_voz.mjs" 9444 "$SAIDA" "$VOZ" "${VOZ_CURTO:-}" || R=1; fi
adb exec-out screencap -p >"$SAIDA/9-final.png"
exit $R
