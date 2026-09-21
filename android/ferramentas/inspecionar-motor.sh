#!/usr/bin/env bash
# Mostra as dependências do llama-server para Android (usado para montar o APK).
set -e
T=$(mktemp -d); tar xzf "$1" -C "$T"; cd "$T"/llama-*
for f in llama-server libllama-server-impl.so libllama-common.so libllama.so libggml.so libggml-base.so libmtmd.so libggml-cpu-android_armv8.0_1.so; do
  echo "== $f: $(readelf -d "$f" | awk '/NEEDED/ {gsub(/[\[\]]/,"",$NF); printf "%s ", $NF}')"
done
readelf -d llama-server | grep -iE "runpath|rpath" || echo "(sem rpath)"
readelf -n llama-server | grep -iA1 "android" | head -4 || true
du -ch llama-server lib*.so | tail -1
rm -rf "$T"
