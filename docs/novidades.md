## Novidades da 1.5.0

**Fale em vez de digitar: transcrição de áudio até 10 minutos.**

- **Botão 🎤** ao lado de enviar: grave sua pergunta ou uma explicação do professor.
  - Enquanto grava, aparecem o tempo, o limite de 10:00, o nível do som e os botões cancelar e **Transcrever**.
  - O texto cai na caixa para você conferir antes de enviar.
- **"+" → Áudio:** transcreve um arquivo (mp3, m4a, wav, ogg…) de até 10 minutos. Se for mais longo, avisa e transcreve os primeiros 10.
- Tudo roda **no aparelho**, sem internet depois de baixar a voz:
  - **Voz Base** (57 MB, rápida, padrão) ou **Voz Small** (190 MB, mais precisa), em Ajustes → Modelos de IA;
  - no PC, 10 minutos de áudio levam uns 30 segundos;
  - **Linux:** `propons-ia --voz` (ou `--voz small`) liga a transcrição. Disponível no x86_64;
  - **iPhone:** usa o reconhecimento de fala do próprio iOS.
- Com a tela apagada, a transcrição continua (Android).
- **Linux:** `propons-ia --parar` agora desliga tudo (antes o vigia religava o motor).

Da 1.4: botão **"+"** com câmera, fotos, arquivos e modelos, e a IA **lê fotos**.

## Instalar

| Plataforma | Como |
|---|---|
| Qualquer aparelho | abra **[muurxdev.github.io/propons-ia](https://muurxdev.github.io/propons-ia/)** e toque em baixar |
| Já tem a 1.2 ou mais nova | Ajustes → Atualizações → **Atualizar agora** (Windows e Android instalam sozinhos) |
| Windows 10/11 | `Propons-IA-Windows.exe`: abra (funciona direto do pendrive) |
| Linux (qualquer) | `propons-ia --atualizar` ou `curl -fsSL https://raw.githubusercontent.com/muurxdev/propons-ia/main/linux/install.sh \| bash` |
| Android 9+ | baixe pelo site acima (se o Chrome segurar o .apk, use o **.zip**) — [tutorial](https://github.com/muurxdev/propons-ia/blob/main/docs/instalar-android.md) |
| iPhone/iPad (iOS 16+) | fonte do SideStore/AltStore: `https://github.com/muurxdev/propons-ia/releases/latest/download/altstore-source.json` — [tutorial](https://github.com/muurxdev/propons-ia/blob/main/docs/instalar-ios.md) |
