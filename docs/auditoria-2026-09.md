# Auditoria da Própons IA — setembro de 2026

Três auditorias feitas em paralelo sobre a versão 1.24.1:

- **pesquisa** do que os melhores apps de IA e de estudo fazem: ChatGPT, Claude, Gemini, Perplexity, NotebookLM, Khanmigo, Quizlet, Anki, Duolingo, LM Studio, Jan, PocketPal e AnythingLLM;
- **código e funcionamento**, lendo o código inteiro;
- **design visual**, com 146 capturas: celular e PC, tema claro e escuro, 36 telas.

Abaixo está o que foi achado e o plano, em fases. A **fase 1 entra na versão 1.25.0**.

---

## 1. Funcionamento (bugs e riscos)

| # | Severidade | Problema | Situação |
|---|---|---|---|
| 1 | alta | A página da IA desligada (`propons.local`) e a da IA ligada (`127.0.0.1`) guardam ajustes em lugares separados: tema, esforço, memória, baralho e Conhecimento podiam "sumir" depois que a IA ligava | **1.25.0:** os ajustes agora vão no próprio arquivo de conversas (um item extra que versões antigas ignoram) e voltam ao abrir. A Biblioteca continua separada (fase 2). |
| 2 | alta | Com a IA respondendo e a "Nova conversa" aberta, a mensagem digitada sumia | **1.25.0:** cria a conversa e entra na fila |
| 3 | alta | "Gerar de novo" com a IA desligada apagava a resposta | **1.25.0:** avisa e não apaga nada |
| 4 | alta | Voltar do Android durante a gravação descartava o áudio | **1.25.0:** para e transcreve |
| 5 | média | A fila parava depois de respostas do próprio app e sumia ao trocar de conversa | **1.25.0:** anda sempre e reaparece na conversa dela |
| 6 | média | Mensagens de erro pediam um "↻" que não aparecia | **1.25.0:** botão "Tentar de novo" |
| 7 | média | As frases prontas de clima/hora não chegavam ao modelo quando ele continuava a resposta | **1.25.0:** entram no fim do histórico, e o motor continua a partir delas |
| 8 | média | Nome de pasta de um backup importado podia injetar HTML no menu | **1.25.0:** escapado |
| 9 | média | A miniatura de uma mensagem antiga abria a foto errada quando o nome era igual ("image.png") | **1.25.0:** confere também tamanho e miniatura |
| 10 | média | Gerar de novo ou editar uma pergunta com foto perdia a foto | fase 2: guardar a foto cheia na Biblioteca por id |
| 11 | média | Conhecimento com arquivos grandes estourava o armazenamento sem aviso | **1.25.0:** até 3 arquivos de 150 mil caracteres, com aviso de falta de espaço |
| 12 | média | Depois de ver uma foto em tela cheia, a tecla Esc parava de funcionar no app | **1.25.0:** corrigido |
| 13 | média | "Parar" não interrompia a pesquisa e a leitura do arquivo; as sugestões atrasavam a próxima resposta | **1.25.0:** as sugestões param assim que você manda algo. Fase 2: passar o sinal de parar para todas as etapas. |
| 14 | média | iPhone: sem gramática JSON, sem aviso de resposta pronta | fase 2 |
| 15 | média | Acessibilidade: botão Parar anunciado como "Enviar", o tempo do giro anunciado a cada segundo, conversa sem região viva, campo sem rótulo | **1.25.0:** corrigido |
| 16 | média | Desempenho em conversas enormes: salvar tudo a cada mudança e redesenhar listas | fase 2 |
| 19 | baixa | Textos apontando para "+ → Áudio" e para a "bolinha" que saíram; privacidade sem citar clima e ícones | **1.25.0:** textos atualizados; "Memória da conversa" voltou pelo ⋯ do topo |
| 20 | baixa | `[1]` era trocado também dentro de endereços de links | **1.25.0:** corrigido |
| 22 | baixa | Exportar para o Anki quebrava cartões com `<` ou `&` | **1.25.0:** corrigido |

## 2. Design

**Alta prioridade**

- Opção escolhida dos seletores mais escura que o trilho no tema escuro.
- Interruptor desligado quase invisível.
- LaTeX com letras gregas e setas faltando.
- No PC, os popovers cobriam a caixa de texto.

**Média prioridade**

- Margens laterais diferentes entre as folhas.
- Citações sublinhadas.
- Ícone de ajuda "!" com cara de aviso.
- Botão enviar desabilitado igual ao do microfone.
- Cartão de clima alto demais no celular.
- Alvos de toque pequenos.
- Aviso em cima da caixa de texto.
- "Pensou por" colado no título.
- Tela inicial vazia.
- Nível de estudo quebrado em duas linhas.
- Verso do flashcard desalinhado.

**Baixa prioridade**

- Cor de "Acertou/Errou" no quiz.
- Folhas da mesma cor do fundo no escuro.
- Fundo escurecido pesado no claro.
- Decimal com ponto.
- Botões da página Sobre.
- Ações da pergunta sempre visíveis no PC.

**1.25.0:** todos estes entram, exceto o LaTeX completo (fase 2).

## 3. O que os outros apps fazem e a Própons ainda não

A ordem vem da pesquisa: primeiro o que dá muito retorno com pouco esforço.

| Ideia | Quem faz | Fase |
|---|---|---|
| **Me ensina:** tutor que guia com perguntas e dicas, sem entregar a resposta | ChatGPT Study Mode, Gemini Guided Learning, Khanmigo, Claude Learning | **1.25.0** |
| **Estudar isto:** transformar uma resposta em flashcards, quiz ou resumo com um toque | NotebookLM Studio, Gemini Canvas | **1.25.0** |
| **Sugestões para começar** na tela inicial | Gemini no Classroom, ChatGPT | **1.25.0** |
| **Sequência de estudo** gentil, com "descanso" que não quebra a sequência | Duolingo | **1.25.0** |
| Revisão de cartões com **"Refazer os que errei"** | NotebookLM, Quizlet | **1.25.0** |
| Estado do que a IA está fazendo ("Lendo apostila.pdf") | Perplexity, ChatGPT | parcial; fase 2 |
| FSRS com "retenção desejada" no baralho | Anki | fase 2 |
| Citação que abre o trecho exato do PDF, com a página | NotebookLM, GPT4All | fase 2 |
| Exportar a conversa em PDF; baralho em `.apkg` | AnythingLLM | fase 2 |
| Biblioteca e ajustes na mesma origem (sem nenhuma separação) | — | fase 2 |
| Plano de estudos até a data do ENEM, a partir dos erros | MEC Enem, Brainly | fase 3 |
| Banco de questões do ENEM offline, com simulado cronometrado | apps de ENEM | fase 3 |
| Redação por foto do manuscrito e evolução por competência | MEC Enem | fase 3 |
| Resumo em áudio offline e mapa mental | NotebookLM | fase 3 |
| Modo voz contínuo (conversa falada) | Gemini Live, ChatGPT Voice | fase 3 |
| Galeria de Conhecimentos prontos | Gems, Skills | fase 3 |
| "Explicar com Própons" ao selecionar texto no Android | AnythingLLM | fase 3 |
| Decodificação especulativa: o Lume acelera o Ápice | PocketPal | fase 3 |
| Modo economia (bateria ou aparelho quente, troca para o Lume) | apps locais | fase 3 |

## 4. Riscos de apps de IA local e o que já existe

- **Aquecimento e bateria:** o Lume é o padrão em celular modesto e há limite de resposta por modo. Fase 3: modo economia.
- **Memória do aparelho:** selo de "cabe neste aparelho", recomendação por RAM e bloqueio de modelo que não cabe já existem.
- **Modelo pequeno errando:**
  - números de hora e clima escritos pelo app;
  - contas de algoritmos feitas pelo código;
  - JSON dos modos de estudo por gramática;
  - trechos citados dos arquivos.
- **Pesquisa que "diz que buscou":** o estado da pesquisa é sempre visível, e as fontes aparecem só quando houve busca de verdade.
