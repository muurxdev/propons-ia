#!/usr/bin/env bash
# Teste do download em segundo plano no emulador: começa a baixar um modelo, apaga a tela,
# força o modo de economia profunda do Android (Doze) e confere se o download continua e se a notificação aparece.
# Uso: bash android/ferramentas/testar-segundo-plano.sh [pasta-de-saída]
set -uo pipefail
export ANDROID_HOME="${ANDROID_HOME:-/opt/android-sdk}"
export PATH="$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator:$PATH"
AQUI="$(cd "$(dirname "$0")/.." && pwd)"; RAIZ="$(dirname "$AQUI")"
SAIDA="${1:-$RAIZ/dist/teste-segundo-plano}"; mkdir -p "$SAIDA"
PKG=io.github.muurxdev.proponsia
GRADLE="${GRADLE:-$(command -v gradle || echo /opt/gradle/bin/gradle)}"
FALHAS=0
ok() { if [ "$1" = 1 ]; then echo "  ✔ $2"; else echo "  ✘ $2"; FALHAS=$((FALHAS+1)); fi; }

echo "== APK de teste"
PROPONS_X86_64=1 bash "$AQUI/preparar.sh" >/dev/null || exit 1
( cd "$AQUI" && PROPONS_X86_64=1 "$GRADLE" --no-daemon -q assembleDebug ) || exit 1
APK="$AQUI/app/build/outputs/apk/debug/app-debug.apk"

echo "== emulador"
adb start-server >/dev/null 2>&1
if ! adb devices | grep -q emulator; then
  nohup emulator -avd propons -no-window -no-audio -no-boot-anim -no-snapshot -gpu swiftshader_indirect -memory 4096 -cores 4 >"$SAIDA/emulador.log" 2>&1 &
fi
adb wait-for-device
for i in $(seq 1 180); do [ "$(adb shell getprop sys.boot_completed 2>/dev/null | tr -d '\r')" = 1 ] && break; sleep 2; done
adb install -r -g "$APK" >/dev/null || exit 1
adb shell pm grant $PKG android.permission.POST_NOTIFICATIONS 2>/dev/null
adb shell am force-stop $PKG
adb shell am start -n $PKG/.MainActivity >/dev/null
adb forward tcp:9765 tcp:8765 >/dev/null
for i in $(seq 1 300); do curl -sf --max-time 2 http://127.0.0.1:9765/health >/dev/null && break; sleep 2; done
sleep 6
PID=$(adb shell pidof $PKG | tr -d '\r')
adb forward tcp:9444 localabstract:webview_devtools_remote_$PID >/dev/null
sleep 2

# comando JS na página do app (via CDP)
js() { node -e '
const [porta, expr] = process.argv.slice(1);
(async () => {
  const alvos = await (await fetch(`http://127.0.0.1:${porta}/json`)).json();
  const pag = alvos.find(a => a.type === "page" && /127\.0\.0\.1/.test(a.url));
  const ws = new WebSocket(pag.webSocketDebuggerUrl); await new Promise(r => ws.onopen = r);
  ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id === 1) { console.log(JSON.stringify(m.result?.result?.value ?? null)); ws.close(); } };
  ws.send(JSON.stringify({ id: 1, method: "Runtime.evaluate", params: { expression: expr, awaitPromise: true, returnByValue: true } }));
})();' 9444 "$1"; }
tam() { adb shell "run-as $PKG sh -c 'stat -c %s files/modelos/$1 2>/dev/null || echo 0'" | tr -d '\r'; }

ALVO=normal; ARQ=Qwen3.5-2B-Q4_K_M.gguf.baixando
js "PLATAFORMA.apagarModelo('$ALVO').catch(()=>0).then(()=>1)" >/dev/null
echo "== download do modelo $ALVO"
js "PLATAFORMA.baixarModelo('$ALVO').then(()=>1)" >/dev/null
for i in $(seq 1 60); do [ "$(tam $ARQ)" -gt 20000000 ] && break; sleep 1; done
NOTIF=$(adb shell dumpsys notification --noredact | grep -A40 "pkg=$PKG" | grep -m1 -oE "android.title=String \([^)]*\)")
ok "$( [ -n "$NOTIF" ] && echo 1 || echo 0)" "notificação de progresso aparece — $NOTIF"
adb exec-out screencap -p >"$SAIDA/1-baixando.png"

echo "== tela apagada + economia profunda (Doze)"
adb shell input keyevent KEYCODE_SLEEP
sleep 3
adb shell dumpsys battery unplug >/dev/null
adb shell dumpsys deviceidle force-idle | tr -d '\r'
A=$(tam $ARQ); sleep 45; B=$(tam $ARQ)
echo "     em 45 s com a tela apagada: $((A/1048576)) MB → $((B/1048576)) MB"
ok "$( [ "$B" -gt $((A + 5000000)) ] && echo 1 || echo 0)" "download continua com a tela apagada e em Doze"
FG=$(adb shell dumpsys activity services $PKG | grep -c "isForeground=true")
ok "$( [ "$FG" -ge 1 ] && echo 1 || echo 0)" "serviço em primeiro plano ativo"

echo "== volta ao normal e cancela"
adb shell dumpsys deviceidle unforce >/dev/null; adb shell dumpsys battery reset >/dev/null
adb shell input keyevent KEYCODE_WAKEUP; adb shell wm dismiss-keyguard 2>/dev/null; sleep 3
js "PLATAFORMA.cancelarDownload('$ALVO').then(()=>1)" >/dev/null
sleep 5
FG=$(adb shell dumpsys activity services $PKG | grep -c "isForeground=true")
ok "$( [ "$FG" = 0 ] && echo 1 || echo 0)" "cancelar encerra o serviço e a notificação"
js "PLATAFORMA.apagarModelo('$ALVO').catch(e=>e.message)" >/dev/null
adb exec-out screencap -p >"$SAIDA/2-depois.png"
[ $FALHAS = 0 ] && echo "todos os testes passaram" || echo "$FALHAS falha(s)"
exit $FALHAS
