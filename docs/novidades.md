## Novidades da 1.20.0

- **Responde em segundo plano e avisa quando termina.** Minimize a janela, troque de app ou apague a tela: a IA continua escrevendo e, quando acabar, o sistema te avisa com o começo da resposta (toque para voltar). No celular, um aviso discreto "Respondendo…" mantém o app vivo enquanto pensa. Dá para desligar em Ajustes → Aparência → "Avisar quando ficar pronto" (não avisa se você já estiver com a Própons na frente).
- **Enquanto pensa, uma palavra em inglês com brilho passando** (*Working*, *Thinking*, *Reasoning*…) no lugar do cursor roxo; e durante a escrita, uma bolinha discreta que respira no fim do texto.
- **Área de código** no "+": seus arquivos ficam guardados no aparelho, em abas, com editor de código. Peça uma mudança em português ("comente as funções", "corrija o erro da linha 12") e a Própons devolve o arquivo alterado mostrando **o que mudou linha a linha** — você aplica ou descarta. Dá para salvar no aparelho, mandar para o chat e guardar qualquer bloco de código das respostas com um toque. Funciona também no celular.
- **Caixa de digitação organizada:** o "+" foi para o canto e modelo, microfone e enviar ficaram juntos do outro lado.
- **Cada modelo tem o seu nível de esforço** (o Lume rende no Baixo, o Ápice aproveita o Alto) e o nível aparece na lista. Tocar no modelo já liga — acabou o botão "Usar". Modelo que já está baixado mostra "Ativando…" em vez de "baixando 0%".
- Escolher um modo de estudo não abre mais aviso na tela.

## Novidades da 1.19.1

- **Celular (Android):** a leitura de PDF/DOCX não funcionava (a biblioteca usa recursos que o WebView do Android ainda não tem — `Promise.try`, `Uint8Array.toHex`); adicionamos esses recursos e o PDF passa a virar texto normalmente.

## Novidades da 1.19.0

- **Organização:** fixar conversas no topo e mover para pastas (menu ⋯ da conversa); apagou sem querer? "Desfazer" no aviso.
- **Esforço Alto agora pensa de verdade:** o modelo raciocina antes de responder (você vê o raciocínio num bloco recolhível) — muito mais preciso em contas e lógica (no teste, 17 × 23: 391 pensando, 321 sem pensar). Mais lento; use nas questões difíceis. (Windows, Android, Mac e Linux.)
- **Qualquer mensagem:** editar e reenviar qualquer pergunta (o que vem depois é refeito), gerar de novo a partir de qualquer resposta e **ramificar** a conversa até um ponto, sem mexer na original.
- **Memória:** diga "lembre que estou no 3º ano" e a IA passa a saber disso em toda resposta; "esqueça …" apaga. Tudo editável em Ajustes → Memória, e fica só no aparelho.
- **API na rede local (opcional, desligada):** Ajustes → Modelos de IA → "Deixar outros aparelhos usarem esta IA" (no Linux, `propons-ia --api`). O motor passa a responder no seu Wi-Fi com a API compatível com a OpenAI (`http://IP:porta/v1`, com a chave mostrada na tela) — dá para usar a Própons de outro PC, do celular ou de qualquer programa que fale essa API.
- **Modos de estudo** no "+": **Flashcards** (cartões de pergunta e resposta que você vira tocando; "Guardar no baralho" e revisão com repetição espaçada em Ajustes → Estudo — o que você erra volta em 10 minutos, o que acerta volta em dias; exporta para o Anki), **Quiz** (múltipla escolha com correção na hora, explicação e "Explicar o que errei"), **Corrigir redação** (nota por competência do ENEM, comentários, pontos fortes, o que melhorar e a versão reescrita) e **Resumo**. Cole o conteúdo ou diga o tema, envie, pronto. O motor garante a estrutura do resultado (JSON por gramática), então os cartões e questões nunca vêm quebrados.
- **PDF e DOCX no "+"**: o texto é extraído no próprio aparelho (sem internet) e vai para a IA, com a marca de cada página. Documento longo: a Própons avisa que parte dele cabe na memória da IA nesta conversa (a busca por trechos em documentos grandes vem na próxima versão). PDF que é só imagem: mande as páginas como fotos.

## Novidades da 1.18.0

- **Ler em voz alta.** Cada resposta ganhou o botão de alto-falante: a Própons lê o texto com a voz do próprio aparelho (Windows, Android, Mac, iPhone e Linux), pulando código e símbolos. Em Ajustes → Aparência → "Ler em voz alta: toda resposta", a leitura começa enquanto a resposta ainda está sendo escrita, frase por frase; o mesmo botão para.
- **Linux: aceleração pela placa de vídeo** com `propons-ia --gpu` (Vulkan, NVIDIA/AMD/Intel; baixa o módulo de 30 MB uma vez) e `--sem-gpu` para voltar. Sem placa compatível, ou se ela falhar, a IA segue no processador. O `--diagnostico` mostra o que está em uso.
- **Linux:** `propons-ia --diagnostico` voltou a medir a velocidade (o motor de medição não achava o arquivo da chave desde a 1.15).
- **PC:** "placas" por software (llvmpipe, SwiftShader) não são escolhidas para a aceleração.

## Novidades da 1.17.0

- **PC: aceleração pela placa de vídeo (Vulkan).** Em Ajustes → Modelos de IA → "Aceleração por GPU", a Própons baixa o módulo (31 MB, uma vez), mede o processador, liga a placa e mede de novo: só fica ligada se for mais rápida. Com uma placa dedicada a resposta sai 3 a 4 vezes mais rápido (RTX 3050: Aurora 20 → 75 tokens/s, Lume 45 → 139) e o Ápice passa a usar menos memória RAM. Funciona com NVIDIA, AMD e Intel sem instalar nada (gráficos integrados costumam ser mais lentos que o processador e são recusados no teste). Se a placa falhar, a IA volta para o processador sozinha. O Diagnóstico mostra o que está em uso.
- **Segurança dos apps:** só a página da própria Própons fala com o app (Windows, Android, Mac e iPhone); o inspetor web fica desligado fora do modo de depuração; o backup do Android deixa de tentar copiar os modelos (GB) e guarda só conversas e preferências; permissão de áudio sem uso removida.
- **Mac:** abrir o app de novo só traz a janela que já existe (antes podia abrir duas cópias e dois motores).
- **Verificar modelos** (Windows e Android) confere também os módulos de visão e as vozes.
- **Celular:** o teste automático no emulador passa a baixar o modelo do zero e registra diagnóstico quando algo falha.

## Novidades da 1.16.0

Versão de fundações (junta a 1.15, que não chegou a sair): a interface fica sólida e o motor, a atualização e os dados ficam à prova de falha.

- **A mesma pergunta não tem mais sempre a mesma resposta:** cada pedido usa uma semente nova e a amostragem recomendada para o modelo (temperatura 0,6–0,7 em texto livre; baixa em código e contas), com filtros contra repetição (DRY) e a favor de variedade (XTC).
- **Resposta escrevendo sem travar:** o bloco de código em streaming não é mais recolorido inteiro a cada quadro (numa CPU 4× mais lenta o pior quadro caiu para 35 ms); tabela sendo digitada não trava mais a tela (bug antigo); salvar a conversa nunca mais é cancelado por engano pelo desenho.
- **Transcrição cancelável:** o X da barra cancela a transcrição (fica o que já foi transcrito); gravação avisa aos 10 min e para aos 30; áudio muito baixo pergunta "transcrever assim mesmo" em vez de descartar.
- **Exemplo de algoritmo com números inventados** vira uma nota no fim da resposta, em vez de cortar a explicação no meio.
- **Rascunho por conversa:** o que você digitou fica guardado ao trocar de conversa. Conversa longa abre mais rápido (um reflow só).
- **Acessibilidade e tema:** diálogos com `aria-modal`, foco preso dentro e devolvido ao fechar; avisos anunciados por leitor de tela; sem flash branco ao abrir no tema escuro; textos apagados com contraste AA; menus flutuantes acompanham a janela ao redimensionar/girar; fotos do celular respeitam a rotação (EXIF).
- **Celular:** folhas altas rolam (o arraste para fechar é pelo topo); o botão voltar cancela a gravação/transcrição; Enter quebra linha (a seta envia).
- **Linux:** o histórico sai do `localStorage` (cota de 5 MB) e vai para o IndexedDB, com migração automática.
- **iPhone:** se o motor morrer no meio da resposta, o app percebe em 90 s (antes ficava travado para sempre).
- **Proteções:** histórico com limites (200 mil caracteres por texto, 2 mil mensagens por conversa, ids únicos); fotos em tamanho cheio saem da memória depois da resposta; "continuar" só a partir do texto inteiro; segunda mensagem antes de a IA ligar é recusada com aviso.
- **Atualização protegida:** a release só sai se o APK do Android estiver assinado com a chave oficial (antes, sem a chave, saía assinado com a chave de teste e ninguém conseguia atualizar). No Linux, `propons-ia --atualizar` baixa o instalador da própria versão nova e confere o **SHA-256** do pacote com a lista publicada (`install.sh` e `PKGBUILD` também).
- **Versão única:** `ferramentas/versao.js` grava a versão nos 6 arquivos e o CI confere que tag, versão e novidades batem antes de compilar.
- **Binários de terceiros conferidos:** llama.cpp, whisper.cpp e WebView2 são baixados com SHA-256 fixo (`ferramentas/terceiros.sums`) em todos os builds, com cache no CI.
- **Motor sem órfão:** no Android e no Mac, se o app morrer sem fechar o motor, o próximo start mata o motor antigo antes de subir outro (antes ficavam dois na memória). Em todas as plataformas um motor que não sobe é morto antes de tentar de novo.
- **Trocar de modelo nunca quebra o app:** a escolha só é gravada quando o modelo novo liga; se não liga (memória), volta o anterior. Duas falhas seguidas ao abrir rebaixam para o melhor modelo baixado que cabe.
- **Chave do motor fora da linha de comando** (`--api-key-file`) e, no Linux, o endereço da transcrição sai do `sistema.json` e a chave sai do comando do navegador.
- **Testes no CI:** todos os testes de lógica, o app real do Windows (abre, conversa, código, anexo, diagnóstico) e o instalador em 4 distros Linux (Docker) rodam a cada release; o emulador Android passa a ser obrigatório na tag.
- **PC:** a janela lembra o tamanho mesmo sem modelo escolhido.

## Novidades da 1.14.0

- **Abre na hora:** o app não liga mais a IA ao abrir. O chat aparece já com o modelo salvo e a IA liga na primeira mensagem (a resposta chega logo em seguida). Sem modelo baixado, a primeira mensagem abre a lista para escolher.
- **A transcrição nunca envia sozinha:** a seta da barra de gravação transcreve para a caixa de texto; você confere e envia.
- **Voltar em vez de fechar:** folha que abre por cima de outra (Esforço, item da Biblioteca) tem a seta de voltar.
- **Folhas compactas** no celular, no tamanho da de Ajustes; caixas de diálogo e listas menores e mais objetivas.
- **Atualizações:** a lista mostra só as novidades da versão nova, e só as que valem para o seu aparelho (itens de PC não aparecem no celular, e vice-versa).
- **PC:** abrindo em modo de teste a IA continua ligando na hora, para os testes automáticos.
- **Celular:** o botão de abrir e fechar o menu e as folhas ficaram mais leves.

## Novidades da 1.13.2

- **Windows: o modelo não "some" mais depois de reiniciar.** A escolha do modelo ficava só numa pasta `dados` ao lado do .exe; se ela se perdia (exe numa pasta temporária, pendrive tirado, perfil limpo), o app voltava ao padrão, não achava o modelo e pedia para baixar de novo, embora o arquivo continuasse em `AppData`. Agora a configuração é gravada também em `AppData` e, se mesmo assim faltar, o app usa automaticamente o melhor modelo que já está baixado.

## Novidades da 1.13.1

- **Limites de memória medidos de verdade.** Medimos o pico do motor com cada modelo (carregado + resposta): Lume 0,9 GB, Aurora 2,0 GB (2,6 com visão), Ápice 4,4 GB (5,1 com visão). Com o que o sistema e o app ocupam, os mínimos ficaram: **PC 3 / 4 / 8 GB** e **celular 3 / 6 / 12 GB** (no celular de 8 GB sobram só ~4,5 GB para apps, por isso o Ápice fechava). O Aurora volta a funcionar em celulares de 6 e 8 GB.
- **Bloqueio real:** abaixo do mínimo o modelo fica bloqueado com o motivo ("precisa de 12 GB de RAM (este tem 7,6 GB)"), sem o "baixar mesmo assim". Só o Lume nunca é bloqueado.

## Novidades da 1.13.0

- **Gravação no estilo do app do Claude:** ao tocar no 🎤, a caixa de texto vira uma barra com o **X** (descartar), as **ondas** do som, o botão de **parar** (transcreve para a caixa) e a **seta** (transcreve e já envia). No meio da transcrição aparece só Transcrevendo; depois a caixa de texto volta.
- **Nível de esforço por modelo** (como no Claude): no seletor, a linha **Esforço** abre Baixo (responde direto e curto), Médio (padrão) ou Alto (pensa passo a passo antes de responder, mais completo). Fora do Médio, aparece um selinho ao lado do nome do modelo.
- **Caixa de digitação mais slim**, no espaçamento do Claude Code; busca de conversas mais compacta; o botão de abrir/fechar o menu no PC ficou longe da borda.
- **Apagar o que está baixado:** um modelo baixado sempre mostra o botão Apagar, mesmo que esteja bloqueado por falta de memória.
- **Só o menu lateral flutua:** o cartão arredondado com sombra é só o menu de conversas. A área do chat e o fundo voltaram a ser retos.
- **Proteção de memória no celular:** cada modelo agora exige 1,5× a memória mínima (o Ápice, de 8 GB, pede **12 GB** no celular; o Aurora, 9 GB). Se o aparelho não tem, o modelo fica bloqueado com o aviso, em vez de baixar e fechar o app. O Lume nunca é bloqueado.
- **Apagar todas as conversas** com um toque: botão de lixeira no rodapé do menu lateral (com confirmação).
- Título das conversas aparece inteiro; só encurta quando o ⋯ aparece ao passar o mouse.
- O anel de ligando/reconectando perdeu os três pontinhos: agora é só o anel girando.

## Novidades da 1.12.0

- **Menu lateral flutuante:** no PC e no tablet, o menu de conversas e a área do chat viram dois cartões arredondados (24 px) soltos sobre um fundo um tom mais escuro, com sombra suave, como no HPV Vision e no OmniFetch. No celular, a gaveta abre flutuando com margem e cantos redondos.
- **X à esquerda em tudo:** todos os diálogos, folhas e menus agora têm o X à esquerda e o título no centro, inclusive os Ajustes no celular.
- **Ajustes no celular** no tamanho normal: a folha ocupa só o espaço do conteúdo, com linhas mais compactas.
- **Diálogo em cima de diálogo:** ao abrir um item da Biblioteca (ou qualquer diálogo por cima de outro), o de trás some enquanto o da frente está aberto. Nada mais fica cortado ou sobreposto no PC.
- Correção: no PC, um menu "Renomear/Apagar" podia aparecer no canto ao abrir o app (sobra do pré-carregamento dos menus).

## Novidades da 1.11.2

- **Folhas no estilo do app do Claude:** X à esquerda e título no centro. No **"+"**, três cartões (Câmera, Fotos, Arquivos) e, embaixo, as linhas Áudio e Biblioteca. No **seletor**, cada modelo com uma descrição curta, o que está em uso em destaque com ✓, e "Gerenciar modelos" como uma linha embaixo.

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
