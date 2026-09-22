# Instalar a Própons IA no Mac

> **Requisitos:** macOS 12 (Monterey) ou mais novo, Mac com Apple Silicon (M1, M2, M3, M4…) ou Intel.
> Na primeira abertura ela baixa a IA (~0,5 a 1,2 GB). Depois funciona **sem internet**.

## Instalar

1. Baixe **[Propons-IA-Mac.zip](https://github.com/muurxdev/propons-ia/releases/latest/download/Propons-IA-Mac.zip)** (ou pelo site [muurxdev.github.io/propons-ia](https://muurxdev.github.io/propons-ia/)).
2. Abra o `.zip` (o Mac descompacta sozinho) e arraste a **Própons IA** para a pasta **Aplicativos**.
3. **Primeira vez:** como o app não é da App Store, o Mac pede uma confirmação:
   - clique com o **botão direito** (ou Control + clique) na Própons IA → **Abrir** → **Abrir**;
   - se aparecer "não foi possível verificar" (no **macOS 15 Sequoia** ou mais novo é sempre assim: o botão direito → Abrir não basta), feche o aviso, vá em **Ajustes do Sistema → Privacidade e Segurança**, role até o fim e clique em **Abrir Mesmo Assim**; depois abra o app de novo e confirme.
4. Pronto! Da próxima vez é só abrir normalmente.

> Alternativa pelo Terminal: `xattr -dr com.apple.quarantine "/Applications/Própons IA.app"`

## O que funciona no Mac

- Chat, código com cores, anexos, **fotos** (a IA lê fotos e prints; a webcam também funciona) e **🎤 transcrição** de áudio de qualquer tamanho
- **Modelos de IA** em Ajustes: Própons Lume (leve), Aurora (médio) ou Ápice (pesado, Macs com 8 GB ou mais)
- **Atualizações:** a Própons IA avisa quando sai versão nova e se atualiza sozinha (troca o app e abre de novo)
- Enquanto baixa ou responde, o Mac não entra em repouso

## Dicas

- Nos Macs com Apple Silicon a IA usa a GPU (Metal) e fica bem rápida.
- Na primeira vez que você usa o 🎤 ou a câmera, o macOS pede permissão: toque em **Permitir**.
- As conversas ficam em `~/Library/Application Support/Propons IA/dados`.
