# Instalar a Própons IA no Linux

> **Requisitos:** distribuição com glibc (Ubuntu, Debian, Mint, Fedora, openSUSE, Arch, Kali…), x86_64 ou ARM64,
> `curl`, e 3 / 4 / 8 GB de RAM para Lume / Aurora / Ápice. Para abrir em janela própria, Chromium ou Google Chrome
> (sem eles, abre no navegador padrão). A transcrição de voz existe no x86_64 e no ARM64.

## Instalar

**Qualquer distribuição** (não precisa de root para o app; só para as bibliotecas do sistema, se faltarem):

```bash
curl -fsSL https://github.com/muurxdev/propons-ia/releases/latest/download/install.sh | bash
```

O instalador baixa o pacote da release, **confere o SHA-256** com a lista publicada (`SHA256SUMS`), instala em
`~/.local/share/propons-ia/app`, cria o atalho no menu e roda `propons-ia --verificar`.

**Pacotes nativos:** na [página da release](https://github.com/muurxdev/propons-ia/releases/latest) há `.deb` (Ubuntu/Debian/Mint),
`.rpm` (Fedora/openSUSE) e `.tar.gz`. Arch/Manjaro: `PKGBUILD` na mesma página (`makepkg -si`), que confere o pacote pelo `SHA256SUMS`.

Depois: abra **Própons IA** no menu de aplicativos ou digite `propons-ia`.

## Comandos

| Comando | O que faz |
|---|---|
| `propons-ia` | abre (na primeira vez pede o modelo e baixa) |
| `propons-ia --modelo leve` / `normal` / `avancado` | abre com o modelo escolhido (Lume / Aurora / Ápice) |
| `propons-ia --visao` / `--sem-visao` | liga/desliga a leitura de fotos (baixa o módulo de visão uma vez) |
| `propons-ia --voz` / `--voz small` | liga a transcrição de áudio (baixa a voz de 57 ou 190 MB) |
| `propons-ia --gpu` / `--sem-gpu` | usa a placa de vídeo pelo Vulkan (NVIDIA, AMD ou Intel; baixa o módulo de 30 MB uma vez). Precisa dos drivers Vulkan da distribuição (`mesa-vulkan-drivers` ou o da NVIDIA); sem placa compatível, ou se ela falhar, a IA segue no processador. Gráficos integrados costumam ser mais lentos que o processador — confira com `--diagnostico` |
| `propons-ia --atualizar` | atualiza para a versão mais nova (instalador da própria versão, com SHA-256) |
| `propons-ia --parar` | desliga o motor da IA |
| `propons-ia --apagar-modelo leve` | apaga um modelo baixado |
| `propons-ia --diagnostico` | mostra o que está instalado, memória e teste do motor |

Desinstalar: `curl -fsSL https://github.com/muurxdev/propons-ia/releases/latest/download/install.sh | bash -s -- --remover`
(ou remova o pacote `.deb`/`.rpm`). Modelos e conversas ficam em `~/.local/share/propons-ia`; apague a pasta se quiser liberar espaço.

## Onde ficam as coisas

- Programa: `~/.local/share/propons-ia/app` (ou `/opt/propons-ia` pelos pacotes).
- Modelos, conversas, configuração e logs: `~/.local/share/propons-ia`.
- O motor da IA escuta só em `127.0.0.1` com uma chave por sessão (guardada em arquivo só do seu usuário).

## Distribuições imutáveis (Silverblue, Bazzite, SteamOS)

Use o `.tar.gz`: descompacte em `~/.local/share/propons-ia/app` e rode `./propons-ia --verificar`. O `install.sh` tenta usar
`apt`/`dnf`/`pacman` para instalar bibliotecas e nelas isso não funciona — instale `libgomp`, `zstd`, `zlib` e `openssl 3`
pelo método da sua distribuição (normalmente já vêm).
