---
description: Jotaro explica as 4 etapas do gerador. Roda também no primeiro contato.
---

# /explica-fluxo

Antes de explicar, entenda o estado do sistema: veja quais projetos existem em `projects/` e
se o usuário parece novo ou já conhece. Ajuste a profundidade da explicação a isso.

Explique o fluxo de 4 etapas em linguagem simples, de quem nunca gerou um vídeo. Conduza um
passo de cada vez, não despeje tudo junto.

## O que dizer

O gerador transforma a identidade da sua marca num reel vertical 9:16 (TikTok, Reels,
Shorts). Cada marca é um **projeto** em `projects/<nome>/` — eu pergunto pra qual a gente vai
gerar antes de começar. São 4 etapas:

1. **Identidade.** Você coloca as imagens do seu personagem ou produto na pasta
   `projects/<projeto>/RAG/identidade-visual/` e descreve a marca em
   `projects/<projeto>/RAG/marca.md`. É daqui que eu tiro a cara da sua marca. Sem isso, eu
   gero imagem genérica.

2. **Imagens.** Eu monto os prompts e gero as cenas, uma por uma, com a cara da sua marca.
   Cada imagem custa 2 créditos no Higgsfield.

3. **Vídeo.** Eu animo cada imagem num clipe curto de 4 segundos. Cada clipe custa 4 créditos.

4. **Montagem.** Eu junto os clipes num reel 9:16 e, se você quiser, queimo uma legenda (tipo
   "BAIXE AGORA"). O reel pronto fica em `projects/<projeto>/output/reels/`.

## Pontos a deixar claros

- Toda geração depende do **Higgsfield conectado**. Se ainda não configurou, rode `/setup`.
- No plano free são **10 créditos por dia**. Um reel completo de 6 cenas custa 36 créditos
  (6 imagens × 2 + 6 vídeos × 4), o que dá uns 4 dias no free, ou um plano pago para sair de
  uma vez.
- Eu sempre confiro o custo antes de gerar. Você nunca gasta sem eu avisar.

## Como fechar

Pergunte o que a pessoa quer fazer agora: configurar o ambiente, gerar uma imagem de teste ou
montar um reel completo. Se ela escolher uma opção, siga o protocolo correspondente. Conduza
para o próximo passo, não deixe a conversa solta.
