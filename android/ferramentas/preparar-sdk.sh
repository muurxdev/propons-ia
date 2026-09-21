#!/usr/bin/env bash
# Instala o necessário para compilar o APK no Ubuntu/WSL: JDK 17, Android SDK (plataforma 35) e Gradle.
# Uso: sudo bash android/ferramentas/preparar-sdk.sh   (instala em /opt/android-sdk e /opt/gradle)
set -e
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq >/dev/null
apt-get install -y -qq openjdk-17-jdk-headless unzip curl binutils-aarch64-linux-gnu >/dev/null
SDK=/opt/android-sdk
if [ ! -x "$SDK/cmdline-tools/latest/bin/sdkmanager" ]; then
  mkdir -p "$SDK/cmdline-tools"; cd /tmp
  curl -fsSL -o ct.zip https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip
  rm -rf cmdline-tools; unzip -q ct.zip; mv cmdline-tools "$SDK/cmdline-tools/latest"
fi
yes | "$SDK/cmdline-tools/latest/bin/sdkmanager" --sdk_root="$SDK" --licenses >/dev/null 2>&1 || true
"$SDK/cmdline-tools/latest/bin/sdkmanager" --sdk_root="$SDK" "platform-tools" "platforms;android-35" "build-tools;35.0.0" >/dev/null
if [ ! -x /opt/gradle/bin/gradle ]; then
  cd /tmp; curl -fsSL -o g.zip https://services.gradle.org/distributions/gradle-8.11.1-bin.zip
  rm -rf gradle-8.11.1; unzip -q g.zip; rm -rf /opt/gradle; mv gradle-8.11.1 /opt/gradle
fi
chmod -R a+rX "$SDK" /opt/gradle
echo "java: $(java -version 2>&1 | head -1)"; echo "gradle: $(/opt/gradle/bin/gradle --version 2>/dev/null | grep '^Gradle')"; ls "$SDK/platforms"
