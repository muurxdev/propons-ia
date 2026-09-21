# Instalar a Própons IA no iPhone / iPad

A Própons IA **não está na App Store**. Ela é instalada como um arquivo `.ipa` com o **SideStore** (recomendado) ou o **AltStore**.
Eles assinam o app com o **seu próprio Apple ID** (grátis), então funciona sem jailbreak.

> **Requisitos:** iOS 16 ou mais novo · de preferência iPhone com 6 GB de RAM ou mais (iPhone 13 Pro, 14, 15, 16…).
> Em iPhones com 4 GB o app usa o modelo **Leve** automaticamente.
> Na primeira abertura ele baixa a IA (~0,5 a 1,2 GB). Use Wi-Fi e **mantenha o app aberto** até terminar.

---

## Opção 1 — SideStore (recomendado: depois de configurado, não precisa mais de computador)

1. **Instale o SideStore** seguindo o guia oficial: <https://docs.sidestore.io/docs/installation/prerequisites>
   (a instalação inicial precisa de um computador **uma única vez**).
2. No iPhone, abra o **SideStore** → aba **Sources** → toque em **+** e cole:
   ```
   https://github.com/muurxdev/propons-ia/releases/latest/download/altstore-source.json
   ```
3. Toque em **Própons IA** → **Free** / **Install**. Espere terminar.
4. Abra o app pela tela inicial.

## Opção 2 — AltStore

1. Instale o **AltServer** no computador e o **AltStore** no iPhone: <https://faq.altstore.io/how-to-use-altstore/installing-altstore>
2. No AltStore, aba **Browse** → **Sources** → **+** e cole o mesmo endereço:
   ```
   https://github.com/muurxdev/propons-ia/releases/latest/download/altstore-source.json
   ```
3. Instale a **Própons IA**.

## Opção 3 — só o arquivo .ipa

Baixe **[Propons-IA-iOS.ipa](https://github.com/muurxdev/propons-ia/releases/latest/download/Propons-IA-iOS.ipa)** no iPhone
e, no SideStore/AltStore, vá em **My Apps** → **+** → escolha o arquivo baixado.

---

## Primeira vez: ativar o Modo Desenvolvedor e confiar no app

- **iOS 16+:** `Ajustes → Privacidade e Segurança → Modo Desenvolvedor → ativar` e reinicie o iPhone
  (a opção só aparece depois de instalar o primeiro app pelo SideStore/AltStore).
- Se aparecer "Desenvolvedor não confiável": `Ajustes → Geral → VPN e Gerenciamento de Dispositivo →` seu Apple ID `→ Confiar`.

## Coisas importantes da conta Apple grátis

- O app precisa ser **renovado a cada 7 dias**. O SideStore/AltStore faz isso sozinho em segundo plano
  (ou toque em **Refresh All**). Se passar do prazo, o app só não abre até renovar — **suas conversas não se perdem**.
- A conta grátis permite **até 3 apps** instalados assim ao mesmo tempo.
- Atualizações aparecem no SideStore/AltStore quando uma nova versão for publicada. A Própons IA também avisa: o botão **Atualizar** (em Ajustes → Atualizações) abre o SideStore/AltStore direto.

## Problemas comuns

| Problema | Solução |
|---|---|
| "Não foi possível verificar o app" | Confie no seu Apple ID em VPN e Gerenciamento de Dispositivo. |
| App fecha ao abrir a IA | Pouca memória: em **Configurações → Modelo de IA** escolha **Leve**. Feche outros apps. |
| Download parou | Abra o app de novo: ele continua de onde parou. |
| Quer conferir se está tudo bem | **Configurações → Diagnóstico → Rodar diagnóstico**. |
