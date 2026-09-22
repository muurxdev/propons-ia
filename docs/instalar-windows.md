# Instalar a Própons IA no Windows

> **Requisitos:** Windows 10 ou 11 (64 bits), 3 GB de RAM para o Própons Lume, 4 GB para o Aurora, 8 GB para o Ápice.
> Precisa do componente **WebView2** (já vem com o Windows 10/11 atualizados; o Edge instala).
> Na primeira mensagem o app baixa a IA (508 MB a 2,6 GB, uma vez só). Depois funciona **sem internet**.

## Instalar (é só abrir)

1. Baixe **[Propons-IA-Windows.exe](https://github.com/muurxdev/propons-ia/releases/latest/download/Propons-IA-Windows.exe)**
   ou pelo site **[muurxdev.github.io/propons-ia](https://muurxdev.github.io/propons-ia/)**.
2. Abra o arquivo. **Não precisa instalar nem ser administrador** — funciona direto da pasta Downloads ou de um pendrive.
3. Se aparecer "O Windows protegeu o computador" (SmartScreen, porque o programa não é assinado): clique em
   **Mais informações → Executar assim mesmo**. É um aviso, não um bloqueio.
4. Escreva sua primeira mensagem, escolha o modelo e toque em **Baixar**. Quando terminar, a IA responde.

## Onde ficam as coisas

| O quê | Onde |
|---|---|
| Programa extraído, motor e modelos | `%LOCALAPPDATA%\Propons IA` (`C:\Users\<você>\AppData\Local\Propons IA`) |
| Conversas e configuração | pasta oculta `dados` ao lado do `.exe` (pendrive) e também em `%LOCALAPPDATA%\Propons IA\dados` |
| Log do motor | `%LOCALAPPDATA%\Propons IA\motor.log` |

Para **desinstalar**: apague o `.exe` e a pasta `%LOCALAPPDATA%\Propons IA` (é onde ficam os modelos, de 0,5 a 2,7 GB cada).

## Atualizações

O app avisa quando sai versão nova: **Ajustes → Atualizações → Atualizar agora**. Ele baixa, confere o arquivo (SHA-256),
troca o `.exe` (inclusive no pendrive) e abre de novo. Conversas e modelos continuam.

## Dicas

- **Modelos:** o seletor ao lado do "+" troca entre Lume (leve), Aurora (médio) e Ápice (pesado). Em **Ajustes → Modelos de IA**
  dá para baixar, apagar e ligar a leitura de fotos.
- **Fotos:** o "+" → Câmera usa a webcam; Fotos e Arquivos abrem o seletor do Windows.
- **Voz:** o 🎤 grava e transcreve no próprio PC (baixa a voz de 57 MB na primeira vez).
- **Diagnóstico:** Ajustes → Diagnóstico mostra memória, velocidade real (tokens/s) e se está tudo funcionando.
- **PC de laboratório:** se o perfil do usuário é limpo ao reiniciar, os modelos são baixados de novo na próxima vez.
  Leve o arquivo do modelo (`Qwen3.5-0.8B-Q4_K_M.gguf`) e copie para `%LOCALAPPDATA%\Propons IA\modelos` para não baixar.
- **Antivírus muito restritivo:** se o app abrir e disser "O motor da IA foi bloqueado neste PC", libere `llama-server.exe`
  dentro de `%LOCALAPPDATA%\Propons IA`.
