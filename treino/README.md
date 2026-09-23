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

## Etapa 1 — dados (`dados/`)

Formato: um `jsonl` por assunto; cada linha `{"licenca","tipo","messages":[…]}` (SFT) ou
`{"licenca","tipo":"preferencia","prompt","escolhida","rejeitada"}` (DPO/ORPO). Tipos: `identidade`, `estilo`,
`conhecimento`, `anti-alucinacao`, `anti-repeticao`, `preferencia`. `node treino/dados/validar.mjs` confere formato,
duplicatas, vazamento de outras identidades e junta tudo em `dados/tudo.jsonl` (ignorado pelo git).

Semente atual: `identidade.jsonl` (31 diálogos escritos à mão em pt-BR: quem é a Própons, estilo de resposta, casos
"não sei", 3 respostas diferentes para a mesma pergunta). Meta da etapa: ~5 000 exemplos SFT + ~1 500 pares de
preferência, gerados com um modelo grande a partir de material público (ENEM/INEP) e **revisados**.

## Próximas etapas

1. **Dados** (`dados/`): identidade e estilo (300–500 diálogos), conhecimento de estudo (ENEM/vestibular, revisado),
   anti-alucinação (pares "não sei" × inventado, DPO/ORPO), anti-repetição (3 respostas boas por pergunta). `jsonl` com licença.
2. **Treino** (`treinar.py` / notebook): unsloth, LoRA r=16–32 em bf16 (a documentação do Qwen3.5 desaconselha QLoRA 4-bit);
   SFT e depois ORPO/DPO; 20 % de dados gerais para não esquecer; placar a cada checkpoint; merge → GGUF Q4_K_M (+ Q5_K_M no PC)
   com imatrix pt-BR. Lume e Aurora cabem na RTX 3050 6 GB; Ápice no Colab/Kaggle.
3. **Publicar**: GGUF no Hugging Face (`muurxdev/propons-*`) e trocar URL + SHA-256 nos hosts.
