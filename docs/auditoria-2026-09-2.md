# Auditoria completa #2 (setembro de 2026)

Esta é a segunda revisão de ponta a ponta do app. Ela cobre os menus e seus limites, a ordem das respostas, o que sobrava
no código, a velocidade do motor, os modelos, a API e os recursos que a comunidade de IA local mais pede. A primeira
auditoria está em `auditoria-2026-09.md`. A área de código do PC fica por último, a pedido.

Método:
- o código foi lido inteiro, com os achados conferidos linha a linha;
- os logs reais do motor (`motor.log`) e do placar foram analisados;
- as issues mais votadas do PocketPal, Jan, Ollama, LM Studio, AnythingLLM, GPT4All, Open WebUI e LibreChat foram
  lidas, junto com os lançamentos de 2025–2026 (NotebookLM, ChatGPT Learn, Gemma 4, MiniCPM5, LFM2.5, MTP no llama.cpp).

## 1. Menus e limites (feito na 1.26.0)

| Achado | Correção |
|---|---|
| A folha aberta por cima copiava a altura da de baixo em pixels, inclusive a dos Ajustes. Isso esticava o "Apagar tudo?", fazia o título sumir com o teclado e dava pulos ao arrastar | A cópia de altura só vale para telas de dentro (+ → Modos). Pergunta curta e folha sobre os Ajustes ficam do tamanho do conteúdo. O teto continua pelo CSS |
| Nada tratava o teclado nem a rotação. O iPhone ignora `resizes-content` | `--vh`/`--kb` vêm do `visualViewport`. A folha e os Ajustes sobem acima do teclado. A tela cheia usa só a classe |
| A rolagem da folha era decidida uma vez só. O conteúdo que chegava depois ficava cortado | Um `ResizeObserver` e um `MutationObserver` refazem a decisão |
| Toda folha focava o primeiro campo, e no celular o teclado subia sozinho | No celular só `[data-autofocus]` (renomear, nota, Conhecimento novo) |
| Os menus flutuantes do PC não tinham limite de altura e saíam da tela em janelas baixas | `max-height` igual ao espaço que sobra. Eles se reposicionam quando o conteúdo cresce e o menu solto fecha quando a janela muda |
| O Contexto abria preso ao microfone e o Revisar dos Ajustes preso ao "+" | Cada um fica preso a quem o abriu |
| As folhas do PC recuavam para o lado como no celular | O recuo e a entrada pela direita só valem no celular |
| O raciocínio e a prévia da Biblioteca rolavam dentro de uma folha que também rola | Ficou uma rolagem só |
| Os avisos ficavam em cima de uma caixa de mensagem alta | Eles ficam acima da caixa, seja qual for a altura dela |
| As faixas que rolam de lado não davam sinal disso | As bordas esmaecem enquanto há mais para ver |

## 2. Ordem da resposta (feito na 1.26.0)

A ordem canônica é a mesma durante e depois da resposta:
1. status: "Pensou por N s" e o Conhecimento usado;
2. ferramentas: o cartão de lugar e o passo a passo do algoritmo, recolhido;
3. o texto ou o widget;
4. a nota (interrompida, erro, cortada);
5. as fontes;
6. as ações;
7. as sugestões, com espaço reservado.

Antes, o status nascia embaixo e ia para o topo no fim. No fim a mensagem inteira era removida e recriada, o que
repetia a animação e movia a rolagem. O Continuar apagava o raciocínio. O "Tentar de novo" de erros antigos sumia.
As citações só viravam links no fim.

## 3. O que saiu ou foi juntado (feito na 1.26.0)

- Ícones sem uso, campos mortos nas permissões e o ramo impossível do "+".
- Cerca de 40 regras de CSS sem uso: `busca-passo`, `pensando`, `fonte-cards`, `mtags`, `perm*`, `tela-topo` e outras.
- A animação `pisca` estava duplicada.
- Colisões de classe: `.editando` estragava a bolha em edição e a redação usava o estilo do passo a passo.
- As duas caixinhas de texto viraram uma (`perguntarTexto`).
- Ajustes em Geral, Respostas, Personalização e Privacidade. O esforço de cada modelo saiu dos Ajustes (fica na
  caixa). "Procurar" e "Atualizar tudo" viraram um botão só.
- A lixeira de "apagar tudo" saiu da barra lateral. Apagar tudo mantém as fixadas, como dizia a ajuda.

## 4. Velocidade do motor (feito na 1.27.0, menos MTP e o Android)

**Achado principal: o prompt quase nunca é reaproveitado.** O `motor.log` mostra a primeira pergunta real igual a 92%
do aquecimento, e mesmo assim os 814 tokens foram lidos de novo. O Qwen3.5 é híbrido, então o llama.cpp só volta a um
checkpoint salvo (`-ctxcp 2`). Como o texto de sistema muda a cada turno, a conversa inteira é relida. O que muda:
- o sufixo de esforço;
- o bloco "sobre o app" (a expressão casa com "você");
- a data;
- os Conhecimentos, o lugar, a web e o tutor.

Plano:
- o texto de sistema fica fixo e tudo o que muda por pergunta vai para um bloco `<contexto>` na última mensagem;
- aquecimento com exatamente esse prefixo;
- `-ctxcp` maior e `--cache-ram` no PC;
- sugestões fora do slot da conversa (desligadas por padrão no celular);
- contagem de tokens em paralelo;
- `-tb` no Android;
- reaproveitamento do prefixo no iOS (hoje ele limpa a memória a cada pedido);
- MTP (decodificação especulativa) no PC com GPU;
- `TOKENS_FOTO` e `RAM_MIN` iguais aos dos hosts.

## 5. Modelos (1.28.0)

Não saiu nenhum Qwen pequeno mais novo que o 3.5: o 3.6 e o 3.8 abertos só têm 27B ou mais. Candidatos para o placar,
que só entram se ganharem, sobretudo nas pegadinhas e em português:
- Qwen3.5-4B em UD-Q4_K_XL;
- Lume em Q6_K/Q8_0;
- Qwen3.5-9B, só para PC com 16 GB;
- Gemma 4 E4B, com áudio e imagem nativos;
- MiniCPM5-2B;
- LFM2.5-2.6B.

Também entram:
- visão em Q8_0, que corta de 200 a 670 MB;
- calculadora (a IA pede a conta e o app calcula);
- orçamento de raciocínio menor no Lume;
- download com retomada e espelho alternativo.

## 6. API (1.28.0)

- A API da rede também no Android e no Mac, com QR code para conectar.
- O celular pode usar a IA do PC de casa pela rede.
- Documentação da API (formato OpenAI).

## 7. O que a comunidade mais pede e ainda falta

Feito na 1.27.0: gráfico de função interativo (item 1, para funções), mapa mental (2), plano de estudos (4), busca
global melhorada (6), aviso de contexto (7), "Explicar com Própons" no Android (8), conversa por voz contínua (9) e cadeado com PIN (11). Também entrou
nela a conferência de contas pelo app (item de qualidade da seção 5).

Em ordem de impacto e esforço:
1. visualizações interativas de matemática e ciências;
2. mapa mental;
3. resumo em áudio com duas vozes;
4. cronograma de estudos com lembretes e estatísticas;
5. exportação `.apkg` de verdade;
6. busca global nas conversas;
7. barra de contexto visível;
8. "Explicar com Própons" no compartilhar do celular;
9. conversa por voz contínua;
10. cadernos por matéria;
11. cadeado com PIN;
12. gravar aula longa;
13. galeria de Conhecimentos prontos.

Reclamações que a Própons deve continuar evitando:
- cortar o contexto sem avisar;
- memória invasiva;
- download que falha sem retomar;
- bajulação e resposta inventada.

## 8. Área de código do PC (feito na 1.28.0)

Faltava o que mais importa numa ferramenta de programação com IA:
- **rodar o programa** (Python/Node do PC numa cópia temporária do projeto; JavaScript isolado em qualquer aparelho);
- **devolver o erro para a IA corrigir**;
- **editar só um trecho**, em vez de reescrever o arquivo inteiro (mais lento e arriscado com modelo pequeno);
- **buscar um nome no projeto** antes de mexer.

A pasta de verdade da pessoa nunca é usada para rodar, e nada é gravado sem aplicar.

## Situação das fases

| Fase | Versão | Situação |
|---|---|---|
| 1 menus e limites | 1.26.0 | feito |
| 2 ordem da resposta | 1.26.0 | feito |
| 3 limpeza | 1.26.0 | feito (a junção dos dois visualizadores de anexo ficou de fora: servem a contextos diferentes) |
| 4 velocidade | 1.27.0 / 1.29.0 | feito. O Android mede e escolhe `-t`/`-tb` no próprio celular (Diagnóstico). O MTP está no motor b11070, mas o Qwen3.5 não tem o arquivo MTP publicado (o Gemma 4 tem) |
| 5 modelos | 1.30.0 | disputa no CI (`placar.yml`, resultados em `treino/README.md`): Lume, Aurora e Ápice ficam; o Gemma 4 E2B entra como quarto modelo (Própons Prisma), o melhor em português |
| 6 API | 1.28.0 / 1.29.0 | celular usa a IA do PC; a API na rede local funciona no Windows, Android e Mac |
| 7 comunidade | 1.27.0 a 1.29.0 | feito: resumo em áudio com 2 vozes (1.28.1), .apkg de verdade, cadernos por matéria e gravação de aula longa (1.29.0) |
| 8 área de código | 1.28.0 | feito |
