#!/usr/bin/env bash
# Ajuda para testes no emulador: mostra os textos da tela ou toca num elemento pelo texto.
# Uso: toque.sh textos | toque.sh "Texto do botão"
export PATH="${ANDROID_HOME:-/opt/android-sdk}/platform-tools:$PATH"
adb shell uiautomator dump /sdcard/u.xml >/dev/null 2>&1
XML="$(adb shell cat /sdcard/u.xml)"
if [ "${1:-textos}" = textos ]; then
  echo "$XML" | grep -oE '(text|content-desc)="[^"]{2,80}"' | sort -u
  exit 0
fi
LINHA="$(echo "$XML" | tr '>' '\n' | grep -E "(text|content-desc)=\"$1\"" | head -1)"
[ -z "$LINHA" ] && { echo "não achei: $1"; exit 1; }
B="$(echo "$LINHA" | grep -oE 'bounds="\[[0-9]+,[0-9]+\]\[[0-9]+,[0-9]+\]"' | grep -oE '[0-9]+')"
set -- $B
adb shell input tap $(( ($1 + $3) / 2 )) $(( ($2 + $4) / 2 ))
echo "toquei em ($(( ($1 + $3) / 2 )), $(( ($2 + $4) / 2 )))"
