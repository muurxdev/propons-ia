#!/usr/bin/env bash
# Mostra o estado do emulador e do app (para acompanhar o teste).
export PATH="/opt/android-sdk/platform-tools:$PATH"
adb devices | sed -n '2p'
echo "boot: $(adb shell getprop sys.boot_completed 2>/dev/null | tr -d '\r')"
adb shell "run-as io.github.muurxdev.proponsia sh -c 'ls -la files/modelos 2>/dev/null; tail -3 files/motor.log 2>/dev/null'" 2>/dev/null
adb shell pidof io.github.muurxdev.proponsia 2>/dev/null | sed 's/^/pid app: /'
ls /mnt/c/Users/mrodr/ProponsIA/dist/teste-android/ 2>/dev/null | tr '\n' ' '
