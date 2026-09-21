#!/usr/bin/env bash
# Instalador da Própons IA para qualquer distribuição Linux (sem precisar de root para o app).
#   curl -fsSL https://raw.githubusercontent.com/muurxdev/propons-ia/main/linux/install.sh | bash
#   ... | bash -s -- --remover        (desinstala)
set -euo pipefail
REPO="${PROPONS_REPO:-muurxdev/propons-ia}"
DEST="${XDG_DATA_HOME:-$HOME/.local/share}/propons-ia/app"
BIN="$HOME/.local/bin"
APPS="${XDG_DATA_HOME:-$HOME/.local/share}/applications"
ICONES="${XDG_DATA_HOME:-$HOME/.local/share}/icons/hicolor"

cor() { printf '\033[1;35m%s\033[0m %s\n' "==>" "$*"; }
erro() { printf '\033[1;31mErro:\033[0m %s\n' "$*" >&2; exit 1; }
tem() { command -v "$1" >/dev/null 2>&1; }

if [ "${1:-}" = "--remover" ]; then
  "$DEST/propons-ia" --parar >/dev/null 2>&1 || true
  rm -rf "$DEST" "$BIN/propons-ia" "$APPS/propons-ia.desktop" "$ICONES/256x256/apps/propons-ia.png" "$ICONES/scalable/apps/propons-ia.svg"
  cor "Própons IA removida. (Modelos e conversas continuam em ~/.local/share/propons-ia — apague a pasta se quiser liberar espaço.)"
  exit 0
fi

case "$(uname -m)" in
  x86_64|amd64) ARCH=x86_64 ;;
  aarch64|arm64) ARCH=aarch64 ;;
  *) erro "arquitetura $(uname -m) não suportada (use x86_64 ou ARM64)." ;;
esac
tem curl || erro "instale o curl primeiro (ex.: sudo apt install curl / sudo dnf install curl / sudo pacman -S curl)."

# ---- bibliotecas do sistema que o motor usa ----
falta_lib() { ! (ldconfig -p 2>/dev/null | grep -q "$1") && ! ls /usr/lib*/"$1"* /usr/lib/*-linux-gnu/"$1"* /lib*/"$1"* >/dev/null 2>&1; }
FALTA=0; for l in libgomp.so.1 libzstd.so.1 libssl.so.3 libz.so.1; do falta_lib "$l" && FALTA=1; done
if [ "$FALTA" = 1 ]; then
  SUDO=""; [ "$(id -u)" != 0 ] && SUDO="sudo"
  cor "Instalando bibliotecas necessárias (pode pedir sua senha)…"
  if   tem apt-get; then $SUDO apt-get update -qq && ($SUDO apt-get install -y libgomp1 libzstd1 zlib1g libssl3t64 2>/dev/null || $SUDO apt-get install -y libgomp1 libzstd1 zlib1g libssl3)
  elif tem dnf;     then $SUDO dnf install -y libgomp libzstd zlib openssl-libs 2>/dev/null || $SUDO dnf install -y libgomp libzstd zlib-ng-compat openssl-libs
  elif tem yum;     then $SUDO yum install -y libgomp libzstd zlib openssl-libs
  elif tem pacman;  then $SUDO pacman -S --needed --noconfirm gcc-libs zstd zlib openssl
  elif tem zypper;  then $SUDO zypper --non-interactive install libgomp1 libzstd1 libz1 libopenssl3
  elif tem apk;     then erro "Alpine (musl) não é suportado. Use uma distribuição com glibc."
  else cor "Não reconheci seu gerenciador de pacotes. Instale: libgomp, zstd, zlib e openssl 3."; fi
fi

# ---- baixa e instala ----
URL="${PROPONS_URL:-https://github.com/$REPO/releases/latest/download}/propons-ia-linux-$ARCH.tar.gz"
TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT
cor "Baixando a Própons IA ($ARCH)…"
curl -fL --progress-bar -o "$TMP/p.tgz" "$URL" || erro "não consegui baixar $URL"
"$DEST/propons-ia" --parar >/dev/null 2>&1 || true
rm -rf "$DEST"; mkdir -p "$DEST" "$BIN" "$APPS" "$ICONES/256x256/apps" "$ICONES/scalable/apps"
tar xzf "$TMP/p.tgz" -C "$DEST" --strip-components=1
ln -sf "$DEST/propons-ia" "$BIN/propons-ia"
sed "s|^Exec=.*|Exec=$DEST/propons-ia|" "$DEST/propons-ia.desktop" >"$APPS/propons-ia.desktop"
cp "$DEST/propons-ia.png" "$ICONES/256x256/apps/propons-ia.png"
cp "$DEST/propons-ia.svg" "$ICONES/scalable/apps/propons-ia.svg"
tem update-desktop-database && update-desktop-database -q "$APPS" 2>/dev/null || true
tem gtk-update-icon-cache && gtk-update-icon-cache -q "$ICONES" 2>/dev/null || true

"$DEST/propons-ia" --verificar || erro "o motor não funcionou neste sistema (veja as bibliotecas acima)."

# ---- navegador para a janela ----
NAV=0; for c in google-chrome-stable google-chrome chromium chromium-browser brave-browser microsoft-edge-stable vivaldi-stable; do tem "$c" && NAV=1; done
cor "Pronto! Abra pelo menu de aplicativos (Própons IA) ou digite: propons-ia"
case ":$PATH:" in *":$BIN:"*) ;; *) echo "    (se o comando não for encontrado, abra um terminal novo ou rode: export PATH=\"\$HOME/.local/bin:\$PATH\")";; esac
if [ "$NAV" = 0 ]; then
  echo "    Dica: para abrir em janela própria, instale o Chromium ou o Google Chrome."
  echo "    Sem eles a Própons IA abre no seu navegador padrão."
fi
echo "    Na primeira vez ela baixa a IA (~1,2 GB)."
