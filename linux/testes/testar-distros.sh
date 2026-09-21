#!/usr/bin/env bash
# Testa a instalação da Própons IA em várias distribuições (containers Docker).
# Para cada uma: instala pelo pacote nativo (.deb/.rpm) ou pelo install.sh e roda "propons-ia --verificar".
# Uso (como root, na raiz do repositório): bash linux/testes/testar-distros.sh
set -u
RAIZ="$(cd "$(dirname "$0")/../.." && pwd)"
PK="$RAIZ/dist/linux"
resultado=()

roda() {  # nome imagem comando
  local nome="$1" img="$2" cmd="$3"
  if [ -n "${FILTRO:-}" ]; then local ok=0 f; IFS=, read -ra fs <<<"$FILTRO"; for f in "${fs[@]}"; do [[ "${nome,,}" == *"${f,,}"* ]] && ok=1; done; [ $ok = 1 ] || return 0; fi
  printf '\n=== %s (%s) ===\n' "$nome" "$img"
  local saida st
  saida=$(docker run --rm -v "$PK:/pkgs:ro" -v "$RAIZ/linux:/linux:ro" "$img" bash -c "$cmd" 2>&1); st=$?
  printf '%s\n' "$saida" | tail -4
  if [ $st = 0 ]; then resultado+=("OK     $nome"); else resultado+=("FALHOU $nome (código $st)"); fi
}

DEB='export DEBIAN_FRONTEND=noninteractive; apt-get update -qq >/dev/null && apt-get install -y -qq /pkgs/propons-ia_amd64.deb >/dev/null && propons-ia --verificar && propons-ia --versao && test -f /usr/share/applications/propons-ia.desktop'
RPM_DNF='dnf install -y -q /pkgs/propons-ia.x86_64.rpm >/dev/null && propons-ia --verificar && propons-ia --versao'
RPM_ZYP='zypper --non-interactive --no-gpg-checks install /pkgs/propons-ia.x86_64.rpm >/dev/null && propons-ia --verificar'
SCRIPT='useradd -m aluno 2>/dev/null; (command -v curl >/dev/null || (pacman -Sy --noconfirm curl >/dev/null 2>&1)); PROPONS_URL=file:///pkgs bash /linux/install.sh && su aluno -c "PROPONS_URL=file:///pkgs bash /linux/install.sh >/dev/null && ~/.local/bin/propons-ia --verificar"'

roda "Ubuntu 22.04"  ubuntu:22.04                "$DEB"
roda "Ubuntu 24.04"  ubuntu:24.04                "$DEB"
roda "Debian 12"     debian:12                   "$DEB"
roda "Kali Linux"    kalilinux/kali-rolling      "$DEB"
roda "Linux Mint 22" linuxmintd/mint22-amd64     "$DEB"
roda "Fedora 41"     fedora:41                   "$RPM_DNF"
roda "Fedora 43"     fedora:43                   "$RPM_DNF"
roda "openSUSE Tumbleweed" opensuse/tumbleweed   "$RPM_ZYP"
roda "Arch Linux (install.sh)" archlinux         "$SCRIPT"
roda "Debian 12 (install.sh)"  debian:12         "apt-get update -qq >/dev/null && apt-get install -y -qq curl ca-certificates >/dev/null; $SCRIPT"

printf '\n===== RESUMO =====\n'; printf '%s\n' "${resultado[@]}"
