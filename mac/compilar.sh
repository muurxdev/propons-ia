#!/usr/bin/env bash
# Monta o app do Mac:  dist/mac/Própons IA.app  e  dist/mac/Propons-IA-Mac.zip
# Roda num Mac (ou no GitHub Actions, macos-15) com Xcode (swiftc), cmake, git, curl e Node.js.
#  - motor: llama-server do llama.cpp para Apple Silicon e Intel (o app escolhe na hora)
#  - voz: whisper-cli universal (arm64 + x86_64), compilado aqui (ggml estático)
#  - app: Swift/AppKit (mac/ProponsMac/main.swift), universal, assinado localmente (ad hoc)
set -euo pipefail
LLAMA=b11070; WHISPER=b5130; WHISPER_COMMIT=927cfce34f31707e17f2bff35c349632fb9e2c3a
AQUI="$(cd "$(dirname "$0")" && pwd)"; RAIZ="$(dirname "$AQUI")"
VERSAO="$(tr -d '[:space:]' < "$RAIZ/VERSAO")"
. "$RAIZ/ferramentas/baixar.sh"   # downloads conferidos por SHA-256
T="$(mktemp -d)"; trap 'rm -rf "$T"' EXIT
SAIDA="$RAIZ/dist/mac"; APP="$SAIDA/Própons IA.app"
rm -rf "$APP"; mkdir -p "$APP/Contents/MacOS" "$APP/Contents/Resources" "$RAIZ/linux/vendor"

node "$RAIZ/src/montar.js"

# motor (Apple Silicon e Intel)
for par in "arm64 arm64" "x64 x64"; do
  set -- $par; LA="$1"; DEST="$APP/Contents/Resources/motor-$2"
  TGZ="$RAIZ/linux/vendor/llama-macos-$LA.tar.gz"
  baixar_verificado "https://github.com/ggml-org/llama.cpp/releases/download/$LLAMA/llama-$LLAMA-bin-macos-$LA.tar.gz" "$TGZ"
  mkdir -p "$T/llama-$LA" "$DEST"; tar xzf "$TGZ" -C "$T/llama-$LA"
  SRV="$(find "$T/llama-$LA" -name llama-server -type f | head -1)"; DIR="$(dirname "$SRV")"
  cp "$SRV" "$DEST/"
  find "$DIR" -maxdepth 1 -name "*.dylib" -exec cp -a {} "$DEST/" \;
  [ -f "$DIR/default.metallib" ] && cp "$DIR/default.metallib" "$DEST/" || true
  echo "motor-$2: $(ls "$DEST" | wc -l | tr -d ' ') arquivos, $(du -sh "$DEST" | cut -f1)"
done

# voz (whisper-cli universal, estático)
W="$RAIZ/linux/vendor/mac-whisper/whisper-cli"
if [ ! -f "$W" ]; then
  git clone -q --depth 1 --branch "$WHISPER" https://github.com/ggml-org/whisper.cpp "$T/whisper"
  [ "$(git -C "$T/whisper" rev-parse HEAD)" = "$WHISPER_COMMIT" ] || { echo "whisper.cpp $WHISPER: commit inesperado $(git -C "$T/whisper" rev-parse HEAD)"; exit 1; }
  cmake -S "$T/whisper" -B "$T/whisper/b" -DCMAKE_BUILD_TYPE=Release -DCMAKE_OSX_ARCHITECTURES="arm64;x86_64" -DCMAKE_OSX_DEPLOYMENT_TARGET=12.0 \
    -DBUILD_SHARED_LIBS=OFF -DGGML_NATIVE=OFF -DGGML_METAL=OFF -DGGML_OPENMP=OFF -DWHISPER_BUILD_TESTS=OFF -DWHISPER_BUILD_SERVER=OFF \
    -DWHISPER_BUILD_EXAMPLES=ON -DWHISPER_SDL2=OFF -DWHISPER_CURL=OFF >/dev/null
  cmake --build "$T/whisper/b" --target whisper-cli -j"$(sysctl -n hw.ncpu)" >/dev/null
  mkdir -p "$(dirname "$W")"; cp "$T/whisper/b/bin/whisper-cli" "$W"
fi
mkdir -p "$APP/Contents/Resources/voz"; cp "$W" "$APP/Contents/Resources/voz/whisper-cli"
echo "voz: $(lipo -archs "$W")"

# app (universal)
for arq in arm64 x86_64; do
  swiftc -O -target "$arq-apple-macos12.0" -module-name ProponsIA "$AQUI/ProponsMac/"*.swift -o "$T/ProponsIA-$arq"
done
lipo -create "$T/ProponsIA-arm64" "$T/ProponsIA-x86_64" -output "$APP/Contents/MacOS/ProponsIA"

# interface, tela de carregamento e ícone
mkdir -p "$APP/Contents/Resources/interface"
cp "$RAIZ/payload/interface/index.html" "$RAIZ/payload/interface/conhecimento.md" "$RAIZ/payload/interface/motor.json" "$RAIZ/payload/interface/"*.mjs "$RAIZ/payload/interface/"*.js "$APP/Contents/Resources/interface/"
cp "$RAIZ/android/app/src/main/assets/splash.html" "$APP/Contents/Resources/splash.html"
ICONE="$RAIZ/ios/ProponsIA/Assets.xcassets/AppIcon.appiconset/icone-1024.png"
mkdir -p "$T/AppIcon.iconset"
for s in 16 32 128 256 512; do
  sips -z $s $s "$ICONE" --out "$T/AppIcon.iconset/icon_${s}x${s}.png" >/dev/null
  sips -z $((s*2)) $((s*2)) "$ICONE" --out "$T/AppIcon.iconset/icon_${s}x${s}@2x.png" >/dev/null
done
iconutil -c icns "$T/AppIcon.iconset" -o "$APP/Contents/Resources/AppIcon.icns"

cat > "$APP/Contents/Info.plist" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>CFBundleName</key><string>Própons IA</string>
  <key>CFBundleDisplayName</key><string>Própons IA</string>
  <key>CFBundleIdentifier</key><string>io.github.muurxdev.proponsia.mac</string>
  <key>CFBundleExecutable</key><string>ProponsIA</string>
  <key>CFBundleIconFile</key><string>AppIcon</string>
  <key>CFBundlePackageType</key><string>APPL</string>
  <key>CFBundleShortVersionString</key><string>$VERSAO</string>
  <key>CFBundleVersion</key><string>$VERSAO</string>
  <key>LSMinimumSystemVersion</key><string>12.0</string>
  <key>LSApplicationCategoryType</key><string>public.app-category.education</string>
  <key>NSHighResolutionCapable</key><true/>
  <key>NSMicrophoneUsageDescription</key><string>A Própons IA usa o microfone quando você toca em 🎤 para transformar sua fala em texto (no próprio Mac).</string>
  <key>NSCameraUsageDescription</key><string>A Própons IA usa a câmera quando você toca em Câmera para mandar uma foto para a IA ler.</string>
  <key>NSAppTransportSecurity</key><dict><key>NSAllowsLocalNetworking</key><true/></dict>
</dict></plist>
EOF

# assinatura local (ad hoc): sem ela o Mac com Apple Silicon não roda os binários
find "$APP/Contents/Resources" -type f \( -name "*.dylib" -o -name "llama-server" -o -name "whisper-cli" \) -exec codesign --force -s - {} \;
codesign --force -s - "$APP"
codesign --verify --verbose=1 "$APP"

rm -f "$SAIDA/Propons-IA-Mac.zip"
( cd "$SAIDA" && ditto -c -k --keepParent "Própons IA.app" Propons-IA-Mac.zip )
ls -la "$SAIDA/Propons-IA-Mac.zip"
