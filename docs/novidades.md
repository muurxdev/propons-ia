## Novidades da 1.11.1

- **Menu "+" refeito:** uma lista limpa (Câmera, Fotos, Arquivos, Áudio, Biblioteca), sem os textinhos embaixo.
- **Trocar de modelo atualiza na hora:** a linha mostra "ligando", passa para "Em uso" e o nome ao lado do "+" muda sem precisar fechar e abrir.
- **Janela do PC no tamanho certo:** abre como um app de verdade (1180×780, centralizada, como o Claude para PC) em vez de uma janelinha de celular, e lembra o tamanho e a posição da última vez.

## Novidades da 1.11.0

- **Novos nomes:** os modelos agora são **Própons Lume** (leve e rápido), **Própons Aurora** (médio, equilibrado) e **Própons Ápice** (pesado, o mais inteligente). Sem ícones, sem números.
- **No PC e no tablet, menus de verdade:** o "+", o seletor de modelo e o menu ⋯ da conversa abrem flutuando ao lado do botão; os diálogos ficam no centro e os Ajustes abrem numa janela. No celular continua tudo subindo de baixo.
- **Resposta escrita com suavidade:** o texto da IA aparece num ritmo constante, como se estivesse sendo digitado, com o cursor no fim. Nada de vir aos trancos.
- **Transcrição silenciosa:** enquanto grava mostra só o tempo e as ondas; enquanto transcreve, só "Transcrevendo". Sem porcentagens, sem avisos de "pronto".
- **Sem "Iniciando":** ao abrir, só a logo e a barra; o chat não fica mais mostrando "carregando" e "preparando".
- **Menu lateral** com a mesma cor do resto do app.
- **Site:** a versão Android agora é só o .zip, que baixa sem o Chrome atrapalhar.

## Novidades da 1.10.0

- **Transcreve áudio de qualquer tamanho:** acabou o limite de 10 minutos. O app divide o áudio em trechos, sempre numa pausa da fala, e mostra "parte 2 de 8". Teste: 20 minutos transcritos por inteiro em 83 s num notebook.
- **Áudio curtinho também:** um "Oi" de 0,25 s agora vira texto. Antes, áudio com menos de 1 segundo era ignorado.
- **Transcrição mais completa:** corrigida uma opção do whisper que fazia pular frases em áudios longos. Marcas como [BLANK_AUDIO] e (música) não aparecem mais no texto.
- **Ondas de verdade:** enquanto você grava, as barrinhas ocupam o espaço todo e cada uma mostra o volume real daquele instante. As pausas aparecem baixinhas.
- **Nomes e logos dos modelos:** os modelos voltam a se chamar pelo tamanho (**Própons 0.8B**, **2B** e **4B**), agora cada um com a sua logo: ⚡ leve e rápido, ◐ médio e equilibrado, ✦ pesado e mais inteligente.

## Novidades da 1.9.0

- **Sem tela de download:** na primeira vez o app abre direto no chat. Mande sua mensagem, toque em **Baixar** e acompanhe a **bolinha com a porcentagem**. Quando termina, a IA responde a mensagem que você mandou.
- Cada modelo mostra se é **Leve · Rápido**, **Médio · Equilibrado** ou **Pesado · Mais inteligente**.

## Novidades da 1.8.0

- **Você escolhe o modelo:** na primeira vez o app abre sem baixar nada e você escolhe o modelo de IA.
- **Caixa de mensagem como a do Claude:** maior, com o texto em cima e embaixo o **"+"**, o **seletor de modelo** (troque ou baixe o modelo ali mesmo), o 🎤 e o enviar.
- **Saudação com frase:** "Boa noite, qual a pauta de hoje?", "Bom dia, em que posso ajudar?" e outras, sorteadas a cada conversa nova.
- O "+" agora tem Câmera, Fotos, Arquivos, Áudio e Biblioteca (os modelos ficam no seletor).

## Novidades da 1.7.1

- **Tela inicial mais limpa:** só a saudação da hora (Boa madrugada, Bom dia, Boa tarde ou Boa noite) e o campo para digitar.

## Novidades da 1.7.0

**Biblioteca da sessão.**

- **"+" → Biblioteca** junta tudo o que você mandou para a IA nesta sessão: **fotos**, **arquivos** de texto e código e **áudios transcritos** (com o texto).
  - Filtros: Tudo, Fotos, Arquivos e Áudios.
  - Toque num item para ver (a foto grande, o arquivo ou a transcrição) e escolha **Usar na mensagem**, **Copiar** ou **Apagar**. Também dá para **Apagar tudo**.
  - Fica **só na memória**: ao fechar a Própons IA, a biblioteca é apagada. As conversas continuam salvas como antes.

Da 1.6: versão para **Mac**. Da 1.5: 🎤 **transcrição** até 10 minutos. Da 1.4: botão **"+"** e a IA **lê fotos**.

## Instalar

| Plataforma | Como |
|---|---|
| Qualquer aparelho | abra **[muurxdev.github.io/propons-ia](https://muurxdev.github.io/propons-ia/)** e toque em baixar |
| Já tem a 1.2 ou mais nova | Ajustes → Atualizações → **Atualizar agora** (Windows, Android e Mac instalam sozinhos) |
| Windows 10/11 | `Propons-IA-Windows.exe`: abra (funciona direto do pendrive) |
| Mac (macOS 12+) | `Propons-IA-Mac.zip`: abra, arraste para Aplicativos, botão direito → Abrir — [tutorial](https://github.com/muurxdev/propons-ia/blob/main/docs/instalar-mac.md) |
| Linux (qualquer) | `propons-ia --atualizar` ou `curl -fsSL https://raw.githubusercontent.com/muurxdev/propons-ia/main/linux/install.sh \| bash` |
| Android 9+ | baixe pelo site acima (se o Chrome segurar o .apk, use o **.zip**) — [tutorial](https://github.com/muurxdev/propons-ia/blob/main/docs/instalar-android.md) |
| iPhone/iPad (iOS 16+) | fonte do SideStore/AltStore: `https://github.com/muurxdev/propons-ia/releases/latest/download/altstore-source.json` — [tutorial](https://github.com/muurxdev/propons-ia/blob/main/docs/instalar-ios.md) |
