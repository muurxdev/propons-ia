## Novidades da 1.4.0

**Botão "+" e a IA lê fotos.**

- **"+" na caixa de mensagem** abre uma folha com:
  - **Câmera:** no celular abre a câmera; no PC, a webcam;
  - **Fotos:** escolhe da galeria;
  - **Arquivos:** textos e códigos;
  - **Modelos:** troca ou baixa o modelo ali mesmo.
- **A IA entende fotos e prints:** exercício do caderno, conta no quadro, gráfico, print de código…
  - Na primeira foto ela pede para ligar o **módulo de visão**. Ele é baixado uma vez só: 205 MB no Leve, cerca de 670 MB no Normal e no Avançado.
  - As fotos são reduzidas antes de ir para a IA (mais rápido). No histórico fica só uma miniatura.
  - A visão liga e desliga em **Ajustes → Modelos de IA**, onde também dá para apagar o módulo.
  - **Linux:** `propons-ia --visao` liga a visão e `propons-ia --sem-visao` desliga.
  - **iPhone:** ler fotos ainda não está disponível.

Da 1.3: interface fluida e folhas que sobem de baixo (arraste para fechar).

## Instalar

| Plataforma | Como |
|---|---|
| Qualquer aparelho | abra **[muurxdev.github.io/propons-ia](https://muurxdev.github.io/propons-ia/)** e toque em baixar |
| Já tem a 1.2 ou mais nova | Ajustes → Atualizações → **Atualizar agora** (Windows e Android instalam sozinhos) |
| Windows 10/11 | `Propons-IA-Windows.exe`: abra (funciona direto do pendrive) |
| Linux (qualquer) | `propons-ia --atualizar` ou `curl -fsSL https://raw.githubusercontent.com/muurxdev/propons-ia/main/linux/install.sh \| bash` |
| Android 9+ | baixe pelo site acima (se o Chrome segurar o .apk, use o **.zip**) — [tutorial](https://github.com/muurxdev/propons-ia/blob/main/docs/instalar-android.md) |
| iPhone/iPad (iOS 16+) | fonte do SideStore/AltStore: `https://github.com/muurxdev/propons-ia/releases/latest/download/altstore-source.json` — [tutorial](https://github.com/muurxdev/propons-ia/blob/main/docs/instalar-ios.md) |
