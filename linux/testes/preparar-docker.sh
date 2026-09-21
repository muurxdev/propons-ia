#!/usr/bin/env bash
# Instala e liga o Docker dentro do Ubuntu (WSL) para os testes de instalação. Rodar como root.
export DEBIAN_FRONTEND=noninteractive
echo "docker atual: $(command -v docker) -> $(readlink -f "$(command -v docker)" 2>/dev/null)"
if [ ! -x /usr/bin/dockerd ]; then
  apt-get update -qq >/dev/null 2>&1
  apt-get install -y -qq docker.io >/dev/null 2>&1 || apt-get install -y docker.io 2>&1 | tail -5
fi
export PATH=/usr/sbin:/usr/bin:/sbin:/bin
if ! /usr/bin/docker info >/dev/null 2>&1; then
  systemctl start docker >/dev/null 2>&1 || { nohup /usr/bin/dockerd >/var/log/dockerd.log 2>&1 & }
fi
for i in $(seq 1 40); do /usr/bin/docker info >/dev/null 2>&1 && break; sleep 2; done
/usr/bin/docker version --format 'docker {{.Server.Version}}' 2>&1 | tail -2
