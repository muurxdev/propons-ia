#!/usr/bin/env bash
# Cria a chave de assinatura do APK (uma vez só). Guarde a pasta android/assinatura em local seguro:
# sem ela não dá para publicar atualizações do app (o Android recusa atualizar com outra chave).
set -euo pipefail
AQUI="$(cd "$(dirname "$0")/.." && pwd)"
D="$AQUI/assinatura"; mkdir -p "$D"; chmod 700 "$D"
[ -f "$D/propons.jks" ] && { echo "já existe: $D/propons.jks"; exit 0; }
SENHA="$(head -c 24 /dev/urandom | base64 | tr -d '/+=' | head -c 24)"
keytool -genkeypair -v -keystore "$D/propons.jks" -alias propons -keyalg RSA -keysize 4096 -validity 36500 \
  -storepass "$SENHA" -keypass "$SENHA" -dname "CN=Propons IA, O=muurxdev, C=BR" >/dev/null 2>&1
cat >"$AQUI/assinatura.properties" <<EOF
arquivo=assinatura/propons.jks
senha=$SENHA
alias=propons
senhaChave=$SENHA
EOF
cp "$AQUI/assinatura.properties" "$D/assinatura.properties"
chmod 600 "$D"/* "$AQUI/assinatura.properties"
echo "chave criada: $D/propons.jks"
keytool -list -keystore "$D/propons.jks" -storepass "$SENHA" | grep -i "SHA-256\|SHA256" | head -1
