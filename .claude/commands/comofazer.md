---
description: Recebe uma pergunta livre ("como faço X?") e devolve um how-to guiado, passo a passo.
argument-hint: "[o que você quer fazer]"
---

# /comofazer

O usuário quer saber como fazer algo específico. A pergunta vem no argumento. Dê um how-to
guiado, em passos numerados, que ele consiga seguir.

## Antes de responder

Entenda o estado do sistema, para o how-to bater com a realidade dele:
- `RAG/identidade-visual/` tem imagens? `RAG/marca.md` está preenchido?
- Higgsfield conectado? FFmpeg instalado?
- Há um run em andamento (`output/.pipeline-state.json`)?

Se faltar um pré-requisito para o que ele quer, diga isso primeiro e aponte o passo que
resolve. Não dê um how-to que vai esbarrar num bloqueio no meio.

## Como montar a resposta

1. Repita em uma linha o que entendeu que ele quer (confirma o entendimento).
2. Liste o pré-requisito que falta, se faltar (e como resolver).
3. Dê os passos numerados, cada um uma ação concreta.
4. Aponte o comando ou a fala que dispara cada passo.

## Mapa de objetivos comuns

- **"Como troco o personagem do exemplo pelo meu?"** Apague os mage1-3.png de
  `RAG/identidade-visual/`, coloque as suas imagens, reescreva `RAG/marca.md` e
  `RAG/narrativa.md` mantendo os títulos de seção. Depois é só pedir um reel.
- **"Como gero só uma imagem de teste?"** Use `/gerarimagem`, descreva a cena. Eu confiro o
  custo (2 créditos), gero, e mostro onde salvei.
- **"Como faço um reel completo?"** Use `/gerarvideo`. Eu confiro as imagens da `RAG/`,
  confiro o custo total, gero as cenas, animo, e monto o reel.
- **"Como coloco legenda no reel?"** Na montagem, eu pergunto se você quer legenda e qual
  texto. A legenda é queimada no vídeo na etapa de edição.
- **"Como retomo um reel que parou no meio?"** Rode `/gerarvideo` de novo. Se eu achar um
  run em andamento, pergunto se você quer retomar de onde parou (sem regerar o que já existe).

Se a pergunta não cair em nenhum desses, monte o how-to do zero seguindo a estrutura acima.
