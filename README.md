<p align="center"><img src="logo/logo256.png" width="96" alt=""></p>

<h1 align="center">Própons IA</h1>

<p align="center">IA de estudos que roda no seu computador — chat, histórico de conversas e código completo quando você pede.</p>

---

## Instalar

### Windows 10/11
Baixe o **[Própons IA para Windows](https://github.com/muurxdev/propons-ia/releases/latest/download/Propons-IA-Windows.exe)** e dê dois cliques.
Funciona direto do pendrive, sem instalar e sem precisar de administrador.

### Linux — qualquer distribuição (um comando)
```bash
curl -fsSL https://raw.githubusercontent.com/muurxdev/propons-ia/main/linux/install.sh | bash
```
Instala só para o seu usuário (em `~/.local`), cria o atalho no menu de aplicativos e instala sozinho as bibliotecas que faltarem.
Funciona em Ubuntu, Debian, Kali, Mint, Pop!_OS, Zorin, Fedora, Nobara, openSUSE, Arch, Manjaro, EndeavourOS e outras (x86_64 e ARM64).

### Linux — pelo gerenciador de pacotes

**Ubuntu, Debian, Kali, Mint, Pop!_OS, Zorin, elementary** (`.deb`)
```bash
wget https://github.com/muurxdev/propons-ia/releases/latest/download/propons-ia_amd64.deb
sudo apt install ./propons-ia_amd64.deb
```

**Fedora, Nobara, RHEL, Rocky, Alma** (`.rpm`)
```bash
sudo dnf install https://github.com/muurxdev/propons-ia/releases/latest/download/propons-ia.x86_64.rpm
```

**openSUSE**
```bash
sudo zypper install https://github.com/muurxdev/propons-ia/releases/latest/download/propons-ia.x86_64.rpm
```

**Arch, Manjaro, EndeavourOS**
```bash
git clone https://github.com/muurxdev/propons-ia.git && cd propons-ia/linux && makepkg -si
```

> **ARM64** (Raspberry Pi 4/5, notebooks ARM): troque `amd64` por `arm64` no `.deb` e `x86_64` por `aarch64` no `.rpm`.

### Abrir e desinstalar (Linux)
```bash
propons-ia                # abre (ou pelo menu de aplicativos)
propons-ia --leve         # modelo menor, para PCs com pouca memória
propons-ia --parar        # desliga, se tiver ficado aberta

sudo apt remove propons-ia         # se instalou o .deb
sudo dnf remove propons-ia         # se instalou o .rpm
curl -fsSL https://raw.githubusercontent.com/muurxdev/propons-ia/main/linux/install.sh | bash -s -- --remover   # se usou o install.sh
```

Para abrir em **janela própria** no Linux, tenha o Chromium, Google Chrome, Brave, Edge ou Vivaldi instalado. Sem eles, a Própons IA abre no navegador padrão.

---

## Como funciona

- **Primeira vez em cada computador:** baixa o modelo de IA (~1,2 GB, ou ~0,5 GB em PCs com menos de 6 GB de RAM), com retomada se a internet cair e verificação SHA-256. Depois disso funciona **offline**.
- **Motor:** [llama.cpp](https://github.com/ggml-org/llama.cpp) rodando só no processador (não precisa de placa de vídeo).
- **Modelo:** [Qwen3.5 2B](https://huggingface.co/unsloth/Qwen3.5-2B-GGUF) (ou 0.8B no modo leve).
- **Algoritmos** (bubble sort, selection sort, quick sort, busca binária com uma lista de números): o passo a passo e o resumo são **calculados por código**, sempre corretos.
- **Pedidos de código:** a IA entrega o código completo, pronto para rodar.
- **Conversas:** no Windows ficam ao lado do `.exe` (pasta oculta `dados`); no Linux, no perfil da janela em `~/.local/share/propons-ia`.

Requisitos: 4 GB de RAM (8 GB recomendado), ~2 GB livres em disco. Linux com glibc 2.35+ (Ubuntu 22.04+, Debian 12+, Fedora 36+ e rolling releases).

---

## Estrutura do código

| Pasta | O que tem |
|---|---|
| `src/` | Interface (`index.template.html`), comportamento da IA (`conhecimento.md`), algoritmos, montagem e testes |
| `app/` | Programa do Windows (C#/WebView2) e o empacotador do `.exe` único |
| `linux/` | Inicializador (`propons-ia`), `install.sh`, geração de `.deb`/`.rpm`/`.tar.gz`, `PKGBUILD` e testes em várias distros |
| `logo/` | Logo e geração do ícone |
| `ferramentas/` | Utilitários de teste (captura de tela, verificação de pendrive) |

### Gerar os pacotes
```powershell
# Windows (PowerShell) -> dist\Própons IA.exe
powershell -ExecutionPolicy Bypass -File build.ps1
```
```bash
# Linux (Ubuntu/Debian com dpkg-dev e rpm) -> dist/linux/*.deb, *.rpm, *.tar.gz
node src/montar.js && bash linux/build.sh
```

### Personalizar a IA
Edite `src/conhecimento.md` (personalidade e regras) e gere de novo. No Windows também dá para colocar um `conhecimento.md` ao lado do `.exe`.

---

Componentes de terceiros: llama.cpp (MIT), modelos Qwen3.5 (Apache 2.0), Microsoft WebView2 (licença do SDK Microsoft).
