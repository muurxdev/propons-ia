# Treino LoRA da Própons (Etapa 2) com unsloth — Lume (0.8B) e Aurora (2B) cabem numa RTX 3050 6 GB em bf16;
# o Ápice (4B) vai para Colab/Kaggle (T4 16 GB). Ainda NÃO validado ponta a ponta: use como ponto de partida.
#
#   pip install "unsloth[cu124-torch250]" trl datasets      (ver https://docs.unsloth.ai para a linha certa da sua CUDA)
#   node treino/dados/validar.mjs                           (gera dados/tudo.jsonl)
#   python treino/treinar.py --base unsloth/Qwen3.5-0.8B --saida treino/saida/lume-v1 --epocas 2
#   python treino/treinar.py --base unsloth/Qwen3.5-0.8B --saida treino/saida/lume-v1 --dpo   (2ª fase, pares de preferência)
#
# Depois: merge → convert_hf_to_gguf.py → llama-quantize Q4_K_M (com imatrix pt-BR) → treino/avaliar.mjs no GGUF novo.
# Só publica (Hugging Face + URL/SHA-256 nos hosts) se o placar melhorar em acerto E armadilhas sem piorar repetição.
import argparse, json, os, random

p = argparse.ArgumentParser()
p.add_argument("--base", default="unsloth/Qwen3.5-0.8B")
p.add_argument("--dados", default=os.path.join(os.path.dirname(__file__), "dados", "tudo.jsonl"))
p.add_argument("--saida", default=os.path.join(os.path.dirname(__file__), "saida", "propons-v1"))
p.add_argument("--epocas", type=float, default=2)
p.add_argument("--r", type=int, default=16)
p.add_argument("--lr", type=float, default=2e-4)
p.add_argument("--max", type=int, default=2048, help="comprimento máximo em tokens")
p.add_argument("--gerais", type=float, default=0.2, help="fração de dados gerais (pt-BR) misturados para não esquecer")
p.add_argument("--dpo", action="store_true", help="2ª fase: preferências (ORPO/DPO) em cima do adaptador SFT")
args = p.parse_args()

from unsloth import FastLanguageModel  # noqa: E402
from datasets import Dataset  # noqa: E402

SISTEMA = open(os.path.join(os.path.dirname(__file__), "..", "src", "conhecimento.md"), encoding="utf-8").read().strip()

def carregar(caminho):
    sft, pref = [], []
    for linha in open(caminho, encoding="utf-8"):
        d = json.loads(linha)
        if d.get("tipo") == "preferencia":
            pref.append({"prompt": d["prompt"], "chosen": d["escolhida"], "rejected": d["rejeitada"]})
        else:
            msgs = d["messages"]
            if msgs[0]["role"] != "system":
                msgs = [{"role": "system", "content": SISTEMA}] + msgs
            sft.append({"messages": msgs})
    random.shuffle(sft); random.shuffle(pref)
    return sft, pref

sft, pref = carregar(args.dados)
print(f"{len(sft)} exemplos SFT · {len(pref)} pares de preferência")

model, tokenizer = FastLanguageModel.from_pretrained(model_name=args.base, max_seq_length=args.max, dtype=None, load_in_4bit=False)  # bf16: o Qwen3.5 não gosta de QLoRA 4-bit
model = FastLanguageModel.get_peft_model(model, r=args.r, lora_alpha=args.r * 2, lora_dropout=0.05,
    target_modules=["q_proj", "k_proj", "v_proj", "o_proj", "gate_proj", "up_proj", "down_proj"], use_gradient_checkpointing="unsloth", random_state=42)

if not args.dpo:
    from trl import SFTTrainer, SFTConfig
    def formatar(ex):
        return {"text": tokenizer.apply_chat_template(ex["messages"], tokenize=False, add_generation_prompt=False, enable_thinking=False)}
    ds = Dataset.from_list(sft).map(formatar)
    trainer = SFTTrainer(model=model, tokenizer=tokenizer, train_dataset=ds, dataset_text_field="text", max_seq_length=args.max,
        args=SFTConfig(output_dir=args.saida, per_device_train_batch_size=2, gradient_accumulation_steps=8, num_train_epochs=args.epocas,
            learning_rate=args.lr, lr_scheduler_type="cosine", warmup_ratio=0.05, logging_steps=10, save_strategy="epoch", bf16=True, report_to="none"))
else:
    from trl import ORPOTrainer, ORPOConfig
    if not pref:
        raise SystemExit("sem pares de preferência em " + args.dados)
    ds = Dataset.from_list(pref)
    trainer = ORPOTrainer(model=model, tokenizer=tokenizer, train_dataset=ds,
        args=ORPOConfig(output_dir=args.saida + "-orpo", per_device_train_batch_size=1, gradient_accumulation_steps=8, num_train_epochs=1,
            learning_rate=5e-6, beta=0.1, max_length=args.max, max_prompt_length=args.max // 2, logging_steps=10, bf16=True, report_to="none"))

trainer.train()
model.save_pretrained(args.saida)                      # adaptador LoRA
tokenizer.save_pretrained(args.saida)
# modelo mesclado (para converter em GGUF): o merge do unsloth copia arquivos do cache (só leitura) e pode falhar;
# se falhar, mescla pelo peft e grava com o transformers
import shutil
mesclado = args.saida + "-merged"
shutil.rmtree(mesclado, ignore_errors=True)
try:
    model.save_pretrained_merged(mesclado, tokenizer, save_method="merged_16bit")
except Exception as e:
    print("merge do unsloth falhou (" + str(e)[:80] + "); mesclando pelo peft")
    shutil.rmtree(mesclado, ignore_errors=True)
    m = model.merge_and_unload()
    m.save_pretrained(mesclado, safe_serialization=True)
    tokenizer.save_pretrained(mesclado)
print("pronto:", args.saida, "e", mesclado)
