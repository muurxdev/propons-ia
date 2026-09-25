# Publicar a Própons IA na Microsoft Store

**Por que a Store:** o Controle Inteligente de Aplicativos do Windows 11 bloqueia programas sem assinatura digital. Um app da Microsoft Store é assinado pela própria Microsoft e abre normalmente, com o controle ligado. A pasta do pacote traz o programa, o motor da IA e a transcrição, e tudo roda dali mesmo, sem extrair nada. Por isso nada fica sem assinatura.

## 1. O que você faz (uma vez só)

1. **Criar a conta de desenvolvedor individual**, que é gratuita para pessoa física, em <https://storedeveloper.microsoft.com>.
   - Entre com a sua conta Microsoft e escolha **Individual**.
   - A Microsoft pede a verificação de identidade: documento com foto e selfie.
2. No **Partner Center**, entre em **Apps e jogos → Novo produto → App MSIX ou PWA** e reserve o nome **Própons IA**.
3. Abra o produto e vá em **Gerenciamento do produto → Identidade do produto**. Copie e me mande os três valores:
   - `Package/Identity/Name` (algo como `12345Murilo.PropnsIA`);
   - `Package/Identity/Publisher` (algo como `CN=ABCD1234-...`);
   - `Package/Properties/PublisherDisplayName`.

   Eu coloco esses valores em `ferramentas/loja/identidade.json`. A partir da próxima versão, o arquivo `Propons-IA-Windows.msix` já sai pronto na release.

## 2. A primeira submissão (no Partner Center)

- **Pacotes:** envie o `Propons-IA-Windows.msix` da release do GitHub. Ele vai sem assinatura, porque a Store assina.
- **Propriedades:**
  - Categoria: Educação.
  - Política de privacidade: `https://github.com/muurxdev/propons-ia/blob/main/docs/privacidade.md`.
  - Site: `https://muurxdev.github.io/propons-ia/`.
- **Classificação etária:** responda o questionário. Não há conteúdo gerado por outros usuários nem compras.
- **Listagem da loja (português do Brasil):** use o texto abaixo e 4 ou mais capturas de tela de 1366×768 ou maiores.
- **Recursos restritos:** o pacote pede `runFullTrust`, porque é um app de área de trabalho que roda a IA localmente. Justificativa sugerida:

  > A Própons IA é um aplicativo de área de trabalho (Win32) que executa um modelo de linguagem local (llama.cpp) e a transcrição de voz (whisper) no próprio computador, sem servidor. Precisa rodar como aplicativo de confiança total para iniciar esses processos locais e abrir a interface no WebView2.

- A certificação costuma levar de 1 a 3 dias úteis.

## 3. Texto da listagem

**Nome:** Própons IA

**Descrição curta:** IA de estudos que roda no seu computador: sem conta, sem mensalidade e funcionando sem internet.

**Descrição:**

> A Própons IA é uma assistente de estudos com inteligência artificial que roda inteira no seu computador. Depois de baixar o modelo uma vez, ela responde sem internet, e suas conversas nunca saem do aparelho.
>
> • Explica matérias, resolve exercícios passo a passo e mostra o raciocínio
> • Modo "Me ensina": a IA te guia com perguntas e dicas, sem entregar a resposta de cara
> • Flashcards com revisão espaçada, quiz no estilo ENEM, correção de redação pelas 5 competências e resumos
> • Lê PDFs e Word de qualquer tamanho, fotos de exercícios e transcreve áudios de aula
> • Conhecimento: ensine a IA do seu jeito, com instruções e apostilas próprias
> • Hora, clima e lugar com dados reais; pesquisa na internet opcional, com as fontes
> • Ouvir as respostas em voz alta, com o texto acompanhando a leitura
> • Código aberto, gratuito e sem anúncios

**Palavras-chave:** estudos, ENEM, IA offline, flashcards, redação, vestibular, tutor

## 4. Depois de publicada

- As atualizações passam a ser enviadas pela Store. Na versão da Store, Ajustes → Atualizações leva para a própria Store.
- A versão do site (`.exe`) continua existindo para quem usa pendrive ou Windows sem a Store. Nesses computadores, com o Controle Inteligente ligado, ela continua sendo bloqueada até ter um certificado de assinatura.
