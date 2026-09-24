#!/usr/bin/env bash
# Prepara uma VPS com Arch Linux (4 GB de RAM bastam) para GERAR DADOS de treino da Própons em segundo plano.
# A VPS não roda modelo nenhum: ela chama o "professor" (DeepSeek R1/V4, Devstral/Ministral) por uma API compatível com
# a da OpenAI, guarda os .jsonl e o validar.mjs confere. O app não depende da VPS em nada.
# Uso (na VPS, como usuário comum com sudo):  bash instalar.sh
# Depois: edite ~/propons-dados/.env (a chave fica só ali) e acompanhe com  journalctl --user -u propons-dados -f
set -euo pipefail
DIR="$HOME/propons-dados"
sudo pacman -S --needed --noconfirm nodejs git rsync
mkdir -p "$DIR"
[ -d "$DIR/repo/.git" ] || git clone --depth 1 https://github.com/muurxdev/propons-ia.git "$DIR/repo"
if [ ! -f "$DIR/.env" ]; then
  cat >"$DIR/.env" <<'ENV'
# professor (API compatível com a da OpenAI). DeepSeek: https://api.deepseek.com · Mistral: https://api.mistral.ai
PROFESSOR_URL=https://api.deepseek.com
PROFESSOR_MODELO=deepseek-reasoner
PROFESSOR_CHAVE=
# matérias em rodízio e quantos exemplos por rodada
MATERIAS="matematica portugues ciencias historia geografia programacao"
POR_RODADA=20
ENV
  chmod 600 "$DIR/.env"
fi
install -m 755 "$DIR/repo/treino/vps/rodar.sh" "$DIR/rodar.sh"
mkdir -p "$HOME/.config/systemd/user"
cat >"$HOME/.config/systemd/user/propons-dados.service" <<SVC
[Unit]
Description=Própons IA: gera dados de treino com o professor
[Service]
Type=oneshot
ExecStart=$DIR/rodar.sh
Nice=10
SVC
cat >"$HOME/.config/systemd/user/propons-dados.timer" <<TMR
[Unit]
Description=Própons IA: dados de treino a cada 2 horas
[Timer]
OnBootSec=10min
OnUnitActiveSec=2h
Persistent=true
[Install]
WantedBy=timers.target
TMR
systemctl --user daemon-reload
systemctl --user enable --now propons-dados.timer
sudo loginctl enable-linger "$USER"   # o timer continua rodando sem ninguém logado
echo "Pronto. Coloque a chave em $DIR/.env (PROFESSOR_CHAVE=...)."
echo "No PC, para trazer os dados:  rsync -av <vps>:propons-dados/repo/treino/dados/gerado-*.jsonl treino/dados/"
