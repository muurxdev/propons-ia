<p align="center"><img src="logo/logo256.png" width="96" alt=""></p>

<h1 align="center">Própons IA</h1>

<p align="center">IA de estudos que roda no seu aparelho — Windows, Mac, Linux, Android e iPhone.<br>
Chat, flashcards, quiz, correção de redação do ENEM, perguntas sobre PDFs de qualquer tamanho e, no computador, uma área de código completa. Funciona offline.</p>

<p align="center">
<a href="https://muurxdev.github.io/propons-ia/"><img alt="Baixar" src="https://img.shields.io/badge/baixar-p%C3%A1gina%20oficial-6a48f5?style=for-the-badge"></a>
<a href="https://github.com/muurxdev/propons-ia/releases/latest"><img alt="Versão" src="https://img.shields.io/github/v/release/muurxdev/propons-ia?style=for-the-badge&label=vers%C3%A3o&color=4b2fd6"></a>
<a href="docs/novidades.md"><img alt="Novidades" src="https://img.shields.io/badge/novidades-changelog-8f76ff?style=for-the-badge"></a>
</p>

---

## Instalar

**Pelo celular ou PC, abra [muurxdev.github.io/propons-ia](https://muurxdev.github.io/propons-ia/)** — a página mostra o download certo para o seu aparelho.

| | |
|---|---|
| **Windows 10/11** | baixe **[Propons-IA-Windows.exe](https://github.com/muurxdev/propons-ia/releases/latest/download/Propons-IA-Windows.exe)** e abra — funciona direto do pendrive, sem instalar — [passo a passo](docs/instalar-windows.md) |
| **Mac (macOS 12+)** | baixe **[Propons-IA-Mac.zip](https://github.com/muurxdev/propons-ia/releases/latest/download/Propons-IA-Mac.zip)**, arraste para Aplicativos e abra com botão direito → Abrir — [passo a passo](docs/instalar-mac.md) |
| **Android 9+** | abra **[muurxdev.github.io/propons-ia/](https://muurxdev.github.io/propons-ia/)** no celular e toque em **Baixar para Android** (.zip → Extrair → instalar o .apk) — [passo a passo](docs/instalar-android.md) |
| **iPhone / iPad (iOS 16+)** | pelo **SideStore** ou **AltStore** — [passo a passo](docs/instalar-ios.md) |
| **Linux** | um comando (abaixo) ou `.deb` / `.rpm` — [passo a passo](docs/instalar-linux.md) |

### Linux — qualquer distribuição (um comando)
```bash
curl -fsSL https://raw.githubusercontent.com/muurxdev/propons-ia/main/linux/install.sh | bash
```
Ubuntu, Debian, Kali, Mint, Pop!_OS, Zorin, Fedora, Nobara, openSUSE, Arch, Manjaro, EndeavourOS… (x86_64 e ARM64).

<details><summary>Pelo gerenciador de pacotes</summary>

**Ubuntu, Debian, Kali, Mint, Pop!_OS, Zorin** (`.deb`)
```bash
wget https://github.com/muurxdev/propons-ia/releases/latest/download/propons-ia_amd64.deb
sudo apt install ./propons-ia_amd64.deb
```
**Fedora, Nobara, RHEL** (`.rpm`)
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
ARM64: troque `amd64` por `arm64` (.deb) e `x86_64` por `aarch64` (.rpm).
</details>

<details><summary>Comandos no Linux</summary>

```bash
propons-ia                          # abre (ou pelo menu de aplicativos)
propons-ia --modelo avancado        # troca o modelo: leve | normal | avancado (fica salvo)
propons-ia --diagnostico            # confere sistema, bibliotecas e mede a velocidade
propons-ia --parar                  # desliga, se tiver ficado aberta
propons-ia --atualizar              # instala a versão mais nova
propons-ia --apagar-modelo avancado # apaga um modelo baixado
propons-ia --visao                  # liga a leitura de fotos
propons-ia --voz                    # liga a transcrição de áudio (x86_64)
propons-ia --gpu                    # usa a placa de vídeo (Vulkan); --sem-gpu volta ao processador
curl -fsSL https://raw.githubusercontent.com/muurxdev/propons-ia/main/linux/install.sh | bash -s -- --remover
```
Para abrir em janela própria, tenha Chrome, Chromium, Brave, Edge ou Vivaldi. Sem eles, abre no navegador padrão.
</details>

---

## O que ela faz

**No dia a dia de estudo**

- **Chat** com histórico, busca, pastas, fixar, lixeira com desfazer, renomear, exportar (.md), **editar qualquer pergunta**, **gerar a resposta de novo** e **ramificar** a conversa em outra
- **Modos de estudo** no "+": **flashcards** (com baralho e revisão espaçada), **quiz** com correção comentada, **resumo** e **correção de redação** pelas 5 competências do ENEM, com nota de 0 a 200 em cada
- **Memória**: diga "lembre que eu vou fazer o ENEM" e ela passa a considerar isso; a lista fica visível e apagável em Ajustes → Memória
- **Algoritmos** (bubble sort, selection sort, quick sort, busca binária): passo a passo e resumo **calculados por código** — sempre corretos
- **Esforço por modelo**: no Alto, a IA **pensa antes de responder** e você pode abrir o raciocínio

**Entrando com o seu material**

- **Botão "+"**: câmera, fotos, arquivos de texto e código, **PDF e DOCX** — o texto é extraído no próprio aparelho
- **Lê fotos e prints** (exercício, conta, gráfico, código) com o módulo de visão, baixado na primeira foto; no Linux: `propons-ia --visao`
- **Fala vira texto**: grave pelo microfone ou mande um áudio de qualquer tamanho; a transcrição roda no aparelho (voz Base 57 MB ou Small 190 MB; no Linux: `propons-ia --voz`)
- **Lê as respostas em voz alta** com a voz do aparelho, se quiser enquanto ela ainda está escrevendo
- **Biblioteca**: uma tela com tudo que você mandou na sessão — fotos, arquivos e áudios com **duração** — para ver, usar de novo, **baixar** ou apagar

**Programando**

- **Área de código**: uma tela com a lógica do chat e o foco em codificar. Você pede em português, ela **lê os arquivos**, propõe criar, alterar ou apagar e mostra **linha a linha o que muda**; nada é gravado sem você tocar em **Aplicar**
- **Abre uma pasta de verdade** do computador (Windows e Linux) ou do celular (Android, pelo seletor do sistema)
- **Histórico próprio**, **moldes de pedido** para colar, **compactação de contexto** (o que já passou vira um resumo curto) e **gravação de áudio** na mesma caixa
- **Código completo nas respostas**, com **cores** por linguagem, botão copiar, "Guardar" para mandar para a área de código (no computador) e **Continuar** se a resposta for cortada

**Do aparelho**

- **Modelos de IA:** Própons Lume (leve e rápido) · Própons Aurora (médio, equilibrado) · Própons Ápice (o mais inteligente; 8 GB no PC, 12 GB no celular). Dá para baixar, usar, cancelar e apagar cada um, e o app mostra o recomendado para o aparelho
- **Responde em segundo plano** e avisa quando termina, mesmo com a janela minimizada ou a tela apagada
- **Permissões uma a uma** (câmera, microfone, avisos, pasta de arquivos), cada uma com botão e motivo, em Ajustes → Permissões
- **PC com placa de vídeo:** aceleração por GPU (Vulkan — NVIDIA, AMD ou Intel, sem instalar nada); a Própons mede processador × placa e só usa a placa se ela for mais rápida (3–4× numa placa dedicada)
- **Pesquisa na internet** opcional (desligada por padrão): ligada no "+", ela busca, cita as fontes com link e, sem conexão, avisa e responde com o que já sabe
- **API local** opcional (desligada por padrão): os outros aparelhos da sua rede falam com a Própons pelo formato da OpenAI
- **Atualizações:** avisa quando sai versão nova e tem o botão **Atualizar tudo**. No Windows, no Mac e no Android o próprio app instala; no iPhone, pelo SideStore/AltStore; no Linux, com `propons-ia --atualizar`
- **Feita para o celular:** tela cheia, ajustes como um app, gestos (arrastar o histórico, segurar uma conversa), compartilhar respostas
- **Diagnóstico embutido:** memória, processador, espaço, velocidade real da IA e autoteste, com relatório para copiar
- **Estável e privada:** o motor religa sozinho se cair; histórico com backup; tudo roda no aparelho e só o próprio app acessa o motor

Na **primeira vez** em cada aparelho ela baixa o modelo (~0,5 / 1,2 / 2,7 GB) com retomada e verificação SHA-256; depois funciona **offline**.

---

## Como é feito

| Pasta | Conteúdo |
|---|---|
| `src/` | Interface única para todas as plataformas (`index.template.html` + módulos `app/*.js` (um arquivo por assunto), `plataforma.js`, `markdown.js`, `destaque.js`, `latex.js`, `detecta.js`, `algoritmos.js`, `resumo.js`), comportamento da IA (`conhecimento.md`) e testes (`src/testes/`) |
| `app/` | Windows: programa C#/WebView2 e o empacotador do `.exe` único |
| `linux/` | Inicializador, `install.sh`, geração de `.deb/.rpm/.tar.gz`, `PKGBUILD`, testes em 10 distros |
| `android/` | App Kotlin (WebView + llama-server como processo), scripts de preparo, compilação e teste no emulador |
| `mac/` | App do Mac (Swift/AppKit + WKWebView + llama-server), montagem do .app e autoteste no CI |
| `ios/` | App SwiftUI (WKWebView + llama.cpp dentro do app via `llama.xcframework`), projeto XcodeGen e teste do motor |
| `.github/workflows/` | Compila todas as plataformas e publica a release ao criar uma tag `v*` |
| `docs/` | Site de download ([muurxdev.github.io/propons-ia](https://muurxdev.github.io/propons-ia/)), guias de instalação e as novidades de cada versão |
| `treino/` | Dados, scripts e o placar de avaliação do modelo próprio (LoRA sobre o Qwen3.5, exportação para GGUF) |

Motor: [llama.cpp](https://github.com/ggml-org/llama.cpp) b11070 (MIT) · Modelos: [Qwen3.5](https://huggingface.co/unsloth) (Apache 2.0) · Windows: Microsoft WebView2.

<details><summary>Compilar localmente</summary>

```powershell
powershell -ExecutionPolicy Bypass -File build.ps1          # Windows → dist\Própons IA.exe
```
```bash
bash linux/build.sh                                          # Linux (Ubuntu com dpkg-dev e rpm) → dist/linux/
bash android/compilar.sh                                     # Android (JDK 17 + Android SDK) → dist/android/
bash ios/preparar.sh && cd ios && xcodegen generate          # iOS (macOS + Xcode)
node src/montar.js && node src/testes/teste_algoritmos.js && node src/testes/teste_markdown.js   # testes da interface
```
Para personalizar a IA, edite `src/conhecimento.md`.
</details>
