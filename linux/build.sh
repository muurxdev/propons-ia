#!/usr/bin/env bash
# Gera os pacotes Linux da Própons IA em dist/linux:
#   propons-ia-linux-x86_64.tar.gz  propons-ia-linux-aarch64.tar.gz   (qualquer distribuição)
#   propons-ia_amd64.deb            propons-ia_arm64.deb              (Ubuntu, Debian, Kali, Mint, Pop!_OS…)
#   propons-ia.x86_64.rpm           propons-ia.aarch64.rpm            (Fedora, Nobara, openSUSE, RHEL…)
# Requer: bash, tar, curl, dpkg-deb, rpmbuild (Ubuntu: apt install dpkg-dev rpm)
set -euo pipefail
VERSAO="1.7.0"
LLAMA="b11070"
WHISPER="b5130"
AQUI="$(cd "$(dirname "$0")" && pwd)"
RAIZ="$(dirname "$AQUI")"
SAIDA="$RAIZ/dist/linux"
TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT
mkdir -p "$SAIDA" "$AQUI/vendor"

node "$RAIZ/src/montar.js" || { echo "Instale o Node.js para montar a interface (node src/montar.js)"; exit 1; }

for par in "x64 x86_64 amd64" "arm64 aarch64 arm64"; do
  set -- $par; LA="$1"; ARCH="$2"; DEBARCH="$3"
  TGZ="$AQUI/vendor/llama-ubuntu-$LA.tar.gz"
  [ -f "$TGZ" ] || curl -fL -o "$TGZ" "https://github.com/ggml-org/llama.cpp/releases/download/$LLAMA/llama-$LLAMA-bin-ubuntu-$LA.tar.gz"

  # ---- árvore do aplicativo ----
  APP="$TMP/$ARCH/propons-ia"; mkdir -p "$APP/motor" "$APP/interface"
  tar xzf "$TGZ" -C "$TMP/$ARCH"
  SRC="$TMP/$ARCH/llama-$LLAMA"
  cp -a "$SRC/llama-server" "$APP/motor/"
  # só as bibliotecas que o servidor usa (motor + variações de CPU); sem as outras ferramentas
  for f in "$SRC"/lib*.so*; do
    b="$(basename "$f")"
    case "$b" in *-impl.so) [ "$b" = "libllama-server-impl.so" ] || continue ;; esac
    cp -a "$f" "$APP/motor/"
  done
  cp "$SRC/LICENSE"* "$APP/motor/" 2>/dev/null || true
  # transcrição de áudio (whisper.cpp): só há binário pronto para x86_64
  if [ "$ARCH" = x86_64 ]; then
    WTGZ="$AQUI/vendor/whisper-ubuntu-x64.tar.gz"
    [ -f "$WTGZ" ] || curl -fL -o "$WTGZ" "https://github.com/ggml-org/whisper.cpp/releases/download/$WHISPER/whisper-bin-ubuntu-x64.tar.gz"
    mkdir -p "$TMP/whisper" "$APP/voz"; tar xzf "$WTGZ" -C "$TMP/whisper"
    WSRC="$TMP/whisper/whisper-bin-ubuntu-x64"
    cp -a "$WSRC/whisper-server" "$APP/voz/"
    for f in "$WSRC"/libwhisper.so* "$WSRC"/libggml*.so*; do cp -a "$f" "$APP/voz/"; done
  fi
  cp "$RAIZ/payload/interface/index.html" "$RAIZ/payload/interface/conhecimento.md" "$APP/interface/"
  install -m 755 "$AQUI/propons-ia" "$APP/propons-ia"
  install -m 644 "$AQUI/propons-ia.desktop" "$RAIZ/logo/logo.svg" "$APP/"
  install -m 644 "$RAIZ/logo/logo256.png" "$APP/propons-ia.png"
  mv "$APP/logo.svg" "$APP/propons-ia.svg"

  # ---- .tar.gz (qualquer distribuição) ----
  tar czf "$SAIDA/propons-ia-linux-$ARCH.tar.gz" -C "$TMP/$ARCH" propons-ia

  # ---- raiz do sistema para .deb/.rpm ----
  R="$TMP/raiz-$ARCH"
  mkdir -p "$R/opt" "$R/usr/bin" "$R/usr/share/applications" "$R/usr/share/icons/hicolor/256x256/apps" "$R/usr/share/icons/hicolor/scalable/apps"
  cp -a "$APP" "$R/opt/propons-ia"
  ln -s /opt/propons-ia/propons-ia "$R/usr/bin/propons-ia"
  install -m 644 "$AQUI/propons-ia.desktop" "$R/usr/share/applications/propons-ia.desktop"
  install -m 644 "$APP/propons-ia.png" "$R/usr/share/icons/hicolor/256x256/apps/propons-ia.png"
  install -m 644 "$APP/propons-ia.svg" "$R/usr/share/icons/hicolor/scalable/apps/propons-ia.svg"

  # ---- .deb ----
  D="$TMP/deb-$ARCH"; cp -a "$R" "$D"; mkdir -p "$D/DEBIAN"
  cat >"$D/DEBIAN/control" <<EOF
Package: propons-ia
Version: $VERSAO
Architecture: $DEBARCH
Maintainer: Própons IA <m.rodriguesdx18@gmail.com>
Installed-Size: $(du -sk "$R" | cut -f1)
Depends: libgomp1, libssl3 | libssl3t64, zlib1g, libzstd1, libstdc++6, curl, ca-certificates
Recommends: zenity
Suggests: chromium | chromium-browser | google-chrome-stable | brave-browser | microsoft-edge-stable
Section: education
Priority: optional
Homepage: https://github.com/muurxdev/propons-ia
Description: IA de estudos que roda no seu computador
 Assistente de estudos com chat, histórico de conversas e cálculo exato de
 algoritmos de ordenação e busca. Roda offline depois de baixar o modelo
 (cerca de 1,2 GB) na primeira vez.
EOF
  cat >"$D/DEBIAN/postinst" <<'EOF'
#!/bin/sh
command -v gtk-update-icon-cache >/dev/null && gtk-update-icon-cache -q /usr/share/icons/hicolor 2>/dev/null || true
command -v update-desktop-database >/dev/null && update-desktop-database -q 2>/dev/null || true
exit 0
EOF
  chmod 755 "$D/DEBIAN/postinst"
  dpkg-deb --root-owner-group -Zxz --build "$D" "$SAIDA/propons-ia_$DEBARCH.deb" >/dev/null

  # ---- .rpm ----
  mkdir -p "$TMP/rpm/SPECS" "$TMP/rpm/BUILDROOT"
  if [ "$ARCH" = x86_64 ]; then SUF="()(64bit)"; else SUF="()(64bit)"; fi
  cat >"$TMP/rpm/SPECS/propons-ia-$ARCH.spec" <<EOF
Name: propons-ia
Version: $VERSAO
Release: 1
Summary: IA de estudos que roda no seu computador
License: LicenseRef-Proprietary
URL: https://github.com/muurxdev/propons-ia
AutoReqProv: no
Requires: libgomp.so.1$SUF, libssl.so.3$SUF, libcrypto.so.3$SUF, libz.so.1$SUF, libzstd.so.1$SUF, libstdc++.so.6$SUF, curl
Recommends: zenity
%global debug_package %{nil}
%global __os_install_post %{nil}
%global _build_id_links none
%description
Assistente de estudos com chat, histórico de conversas e cálculo exato de
algoritmos de ordenação e busca. Roda offline depois de baixar o modelo
(cerca de 1,2 GB) na primeira vez.
%install
mkdir -p %{buildroot}
cp -a $R/. %{buildroot}/
%post
gtk-update-icon-cache -q /usr/share/icons/hicolor 2>/dev/null || :
%files
/opt/propons-ia
/usr/bin/propons-ia
/usr/share/applications/propons-ia.desktop
/usr/share/icons/hicolor/256x256/apps/propons-ia.png
/usr/share/icons/hicolor/scalable/apps/propons-ia.svg
EOF
  rpmbuild -bb --quiet --target "$ARCH" --define "_topdir $TMP/rpm" --define "_rpmdir $TMP/rpm/out" "$TMP/rpm/SPECS/propons-ia-$ARCH.spec" >/dev/null 2>"$TMP/rpm-$ARCH.log" || { cat "$TMP/rpm-$ARCH.log"; exit 1; }
  cp "$(find "$TMP/rpm/out" -name "propons-ia-$VERSAO-1.$ARCH.rpm" | head -1)" "$SAIDA/propons-ia.$ARCH.rpm"
done

( cd "$SAIDA" && sha256sum * > SHA256SUMS )
ls -la "$SAIDA"
