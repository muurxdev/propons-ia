# Modelo próprio — treino e avaliação

Objetivo (plano 1.23 → 2.0): transformar o Qwen3.5 na **Própons de verdade** — identidade própria, mais conhecimento de
estudo, menos alucinação e respostas variadas. Nada de treinar no escuro: **toda etapa tem que melhorar o placar**.

## Etapa 0 — placar (`avaliar.mjs`)

```bash
# com o app aberto (Windows: chave em Ajustes → Modelos → API, ou pelo motor de teste sem chave)
node treino/avaliar.mjs http://127.0.0.1:8765 <chave> --vezes 3 --nome lume
node treino/avaliar.mjs http://127.0.0.1:8765 <chave> --vezes 3 --nome lume --pensar   # Esforço Alto
```

`avaliacao/banco.json`: perguntas com resposta (exata ou regex) por matéria + **armadilhas** (não têm resposta certa;
o modelo tem que dizer que não sabe/não existe). Cada pergunta roda N vezes com a mesma amostragem do app.
Métricas: acerto, armadilhas reconhecidas, respostas repetidas (Jaccard ≥ 0,8 entre amostras), loops, velocidade.
Resultado em `avaliacao/resultado-<nome>-<data>.md`.

### Linha de base (22–23/09/2026, RTX 3050, Vulkan)

| modelo | acerto | armadilhas | repetidas | loops |
|---|---|---|---|---|
| Lume (0.8B) | 45 % | 33 % | 0 % | 0 |
| Lume pensando | 48 % | 33 % | 1 % | 4 |
| Aurora (2B) | 66 % | 44 % | 13 % | 0 |
| Aurora pensando | **84 %** | **83 %** | 16 % | 0 |
| propons-lume-v0 (teste de fumaça: 56 ex., 1 época) | 43 % | 17 % | 1 % | 0 |

**v0 (23/09/2026)** validou o pipeline inteiro na RTX 3050 pelo WSL: `treinar.py` (2 min, loss 2,36) → merge pelo peft
→ GGUF F16 → Q4_K_M → placar no llama.cpp. Com 56 exemplos e 1 época o resultado é ruído (identidade já era 100 %
pelo texto de sistema; armadilhas pioraram) — **não é candidato a publicar**. Lições: o conversor do Qwen3.5 exige a
camada MTP (`exportar.sh` copia os tensores `mtp.*` do base); o merge do unsloth falha com o cache só-leitura (peft
resolve); Triton precisa de headers C (sem sudo: sysroot do usuário com `apt-get download libc6-dev`).

Leitura: a amostragem da 1.16 zerou a repetição no Lume; o Aurora ainda repete 13–16 % em texto livre (candidato a
XTC mais forte). **Pensar (Esforço Alto) é hoje o maior ganho contra alucinação no Aurora** (armadilhas 44 → 83 %);
no Lume o orçamento de 1200 tokens é curto (48 %). Armadilhas continuam o foco dos dados de preferência (Etapa 1c);
a meta 2.0 (acerto +15 pontos, armadilhas < 10 % de invenção) passa a ser medida contra o Aurora pensando.

### Memória da IA (contexto) por aparelho — `medir_contexto.mjs`, 24/09/2026, CPU (-ngl 0)

`node treino/medir_contexto.mjs <llama-server> <pasta-dos-modelos>`: RAM do processo e velocidade com ~3 mil tokens.

| modelo | contexto | cache KV | RAM após carregar | RAM após 3k tokens | leitura (t/s) | escrita (t/s) |
|---|---|---|---|---|---|---|
| Aurora (2B) | 8192 | f16 | 1559 MB | 1624 MB | 1114 | 22,6 |
| Aurora (2B) | 16384 | q8_0 | 1542 MB | 1607 MB | 1115 | 23,2 |
| Aurora (2B) | 32768 | f16 | 1840 MB | 1907 MB | 1121 | 22,6 |
| Aurora (2B) | 32768 | q8_0 | 1662 MB | 1722 MB | 1120 | 23,2 |
| Ápice (4B) | 8192 | f16 | 3116 MB | 3246 MB | 486 | 8,3 |
| Ápice (4B) | 16384 | q8_0 | 3142 MB | 3271 MB | 492 | 8,1 |
| Ápice (4B) | 32768 | f16 | 3910 MB | 4041 MB | 488 | 7,9 |
| Ápice (4B) | 32768 | q8_0 | 3430 MB | 3560 MB | 490 | 8,3 |

O Qwen3.5 é híbrido (poucas camadas de atenção): 32k com cache q8 custa ~100 MB a mais que 8k no Aurora e ~300 MB
no Ápice, sem perder velocidade. Por isso `src/motor.json` usa **PC: 16k (< 8 GB) e 32k (≥ 8 GB); celular: 4k (< 6 GB)
e 8k (≥ 6 GB)**, sempre com `-fa on -ctk q8_0 -ctv q8_0` (testado também na GPU por Vulkan). O que decide o tempo de
resposta com PDF é quanto do arquivo vai em cada pergunta: o app limita a 8 mil tokens de trechos (`TETO_ARQUIVO`).

## Etapa 1 — dados (`dados/`)

Formato: um `jsonl` por assunto; cada linha `{"licenca","tipo","messages":[…]}` (SFT) ou
`{"licenca","tipo":"preferencia","prompt","escolhida","rejeitada"}` (DPO/ORPO). Tipos: `identidade`, `estilo`,
`conhecimento`, `anti-alucinacao`, `anti-repeticao`, `preferencia`. `node treino/dados/validar.mjs` confere formato,
duplicatas, vazamento de outras identidades e junta tudo em `dados/tudo.jsonl` (ignorado pelo git).

Escrito à mão até agora (86 exemplos): `identidade.jsonl` (identidade, estilo, "não sei", 3 respostas diferentes para a
mesma pergunta), `conhecimento.jsonl` (24 exemplos em 7 matérias) e `preferencia.jsonl` (30 pares escolhida/rejeitada
focados em **não inventar**: premissa falsa, fato inexistente, dado pessoal, fonte inventada, futuro, limite do app).
Meta da etapa: ~5 000 SFT + ~1 500 pares.

### Gerar em volume (`gerar.mjs`) — medido em 23/09/2026

O gerador usa o modelo local: pergunta (JSON, 3 por chamada) → resposta com raciocínio → revisor que **refaz a conta**
e reprova pergunta mal escrita, resposta errada ou fora do tom. Em matemática e programação exige duas respostas
independentes que concordem.

Medições com **Aurora (2B) na RTX 3050**, 3 em paralelo: **~1,4 exemplo aceito por minuto** (≈ 30 % de rejeição).
Duas lições importantes:

1. **O prompt do revisor decide tudo.** Com um pedido genérico ("confira contas, fatos e o tom") ele aprovou
   `20,00 + 0,10 × 5 = R$ 25,00`. Pedindo "**refaça você mesmo** a conta, passo a passo, e compare", o 2B acertou
   4/4 num teste isolado (o 4B, sem pensar, errou 1/4 — o tamanho do modelo importa menos que o prompt).
2. **Revisor com `enable_thinking` + `response_format` não funciona**: o raciocínio consome todo o orçamento e a
   resposta volta vazia (`finish_reason: length`). O revisor escreve a análise **dentro** do JSON, antes do veredito.

Qualidade do que passa: contas em geral corretas, mas o português das perguntas é irregular e as respostas saem curtas.
**Conclusão honesta:** gerar milhares de exemplos com o 2B local custa ~24 h de GPU e entrega qualidade média — serve
para volume, não para elevar o teto. Para valer a pena, gerar com um modelo grande (API) ou curar material público
(ENEM/INEP) e usar o `gerar.mjs` só como revisor/filtro.

## Próximas etapas

1. **Dados** (`dados/`): identidade e estilo (300–500 diálogos), conhecimento de estudo (ENEM/vestibular, revisado),
   anti-alucinação (pares "não sei" × inventado, DPO/ORPO), anti-repetição (3 respostas boas por pergunta). `jsonl` com licença.
2. **Treino** (`treinar.py` / notebook): unsloth, LoRA r=16–32 em bf16 (a documentação do Qwen3.5 desaconselha QLoRA 4-bit);
   SFT e depois ORPO/DPO; 20 % de dados gerais para não esquecer; placar a cada checkpoint; merge → GGUF Q4_K_M (+ Q5_K_M no PC)
   com imatrix pt-BR. Lume e Aurora cabem na RTX 3050 6 GB; Ápice no Colab/Kaggle.
3. **Publicar**: GGUF no Hugging Face (`muurxdev/propons-*`) e trocar URL + SHA-256 nos hosts.
