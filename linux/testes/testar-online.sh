#!/usr/bin/env bash
# Instala a Própons IA pela internet, com os mesmos comandos do README, em containers limpos.
# Uso (como root): bash linux/testes/testar-online.sh
set -u
R="https://github.com/muurxdev/propons-ia/releases/latest/download"
RAW="https://raw.githubusercontent.com/muurxdev/propons-ia/main/linux/install.sh"
resultado=()
roda() {
  printf '\n=== %s ===\n' "$1"
  local saida st; saida=$(docker run --rm "$2" bash -c "$3" 2>&1); st=$?
  printf '%s\n' "$saida" | tail -3
  [ $st = 0 ] && resultado+=("OK     $1") || resultado+=("FALHOU $1 (código $st)")
}
roda "Ubuntu 24.04 — .deb (apt)" ubuntu:24.04 \
  "export DEBIAN_FRONTEND=noninteractive; apt-get update -qq >/dev/null; apt-get install -y -qq wget >/dev/null; cd /tmp && wget -q $R/propons-ia_amd64.deb && apt-get install -y -qq ./propons-ia_amd64.deb >/dev/null && propons-ia --verificar"
roda "Kali Linux — install.sh" kalilinux/kali-rolling \
  "export DEBIAN_FRONTEND=noninteractive; apt-get update -qq >/dev/null; apt-get install -y -qq curl ca-certificates sudo >/dev/null; useradd -m aluno && echo 'aluno ALL=(ALL) NOPASSWD:ALL' >/etc/sudoers.d/aluno && su aluno -c 'curl -fsSL $RAW | bash && ~/.local/bin/propons-ia --verificar'"
roda "Fedora 43 — .rpm (dnf)" fedora:43 \
  "dnf install -y -q $R/propons-ia.x86_64.rpm >/dev/null && propons-ia --verificar"
roda "Arch Linux — install.sh" archlinux \
  "pacman -Sy --noconfirm --needed curl sudo >/dev/null 2>&1; useradd -m aluno && echo 'aluno ALL=(ALL) NOPASSWD:ALL' >/etc/sudoers.d/aluno && su aluno -c 'curl -fsSL $RAW | bash && ~/.local/bin/propons-ia --verificar'"
printf '\n===== RESUMO =====\n'; printf '%s\n' "${resultado[@]}"
