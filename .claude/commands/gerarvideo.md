---
description: Pipeline completo: gera as cenas, anima em clipes e monta o reel 9:16.
argument-hint: "[descrição do reel]"
---

# /gerarvideo

Conduz o pipeline inteiro, das imagens ao reel montado. É o comando de maior custo: um reel de
6 cenas gasta 36 créditos. Por isso o protocolo é rigoroso e tem checkpoint de retomada. Siga
na ordem, sem pular invariante.

## Passo 1: entenda o estado e cheque a retomada

Antes de tudo:
- Veja o perfil de uso:
  ```bash
  node scripts/jotaro-profile.cjs status --root .
  ```
  Se `modo_expert: true`, conduza com menos explicação, mantendo todos os checkpoints.
- A cadência de revisão permite iniciar?
  ```bash
  node scripts/review-cadence.cjs status --root .
  ```
  Se `pode_iniciar_fluxo: false`, rode o protocolo de `/revisao` antes de gastar crédito.
  Se a revisão falhar, pare e corrija antes de gerar.
- O Higgsfield está conectado? Se não, aponte `/setup` e pare.
- O FFmpeg responde (`ffmpeg -version`)? Se não, aponte `/setup` (Passo 2) e pare. Não comece
  a gastar crédito sem o FFmpeg, senão você gera os clipes e não consegue montar.
- **Existe `output/.pipeline-state.json`?** Se existir, há um run em andamento. Pergunte ao
  usuário: retomar de onde parou (reaproveitando o que já foi gerado, sem regastar) ou começar
  um run novo? Crédito gasto não volta: perder o que já existe custa dinheiro. Respeite a
  escolha dele.

## Passo 2: confirme as imagens de referência

Liste o que tem em `RAG/identidade-visual/` e **confirme com o usuário antes de seguir**:

> "Para o reel eu vou usar estas referências: [lista]. Posso seguir com elas?"

Se a pasta estiver vazia, pare e peça que ele coloque ao menos uma imagem (veja
`RAG/README.md`). Sem referência, não há consistência entre as cenas.

## Passo 3: entreviste se o pedido for vago

Se o pedido não descreve o reel com clareza (quantas cenas, que história, que estilo, se tem
legenda no fim), faça **até 3 perguntas específicas** antes de gerar:

> "Eu entendi que você quer [o que entendeu], mas preciso de mais clareza: [perguntas]"

## Passo 4: preflight do custo total

Rode `higgsfield-preflight` para o número de cenas do reel. Ele calcula o custo total:
cada cena = 1 imagem (2 créditos) + 1 vídeo (4 créditos) = 6 créditos por cena. Um reel de 6
cenas = 36 créditos.

Mostre ao usuário, com clareza:
- O custo total do run.
- O saldo atual.
- Quantos dias no free isso representa (ex.: 36 créditos = ~4 dias no teto de 10/dia).

Avise que tudo depende do Higgsfield conectado. **Se o saldo não cobre o run inteiro, pare** e
informe o custo. Ofereça gerar por partes (o checkpoint permite retomar amanhã) ou um plano
pago. Peça o ok antes de gastar.

## Passo 5: monte a shot-list

Spawne o `rag` (via Task) para a identidade da marca. Depois spawne o `prompt-smith` (via Task)
com a identidade e a intenção das cenas. Ele devolve a shot-list no formato canônico, uma
entrada por cena, com os prompts prontos.

## Passo 6: loop por cena (o loop roda em você, não nas folhas)

Para cada cena da shot-list, na ordem:
1. Chame `gera-imagem` (2 créditos). Salva em `output/imagens/`.
2. Chame `gera-video` sobre essa imagem (4 créditos, só `veo3_1_lite` no free). Salva em
   `output/clips/`.
3. Registre o progresso no `output/.pipeline-state.json` (a skill cuida disso): se o run cair,
   dá para retomar daqui.

Mostre o progresso ao usuário a cada cena ("cena 3 de 6 pronta").

## Passo 7: monte o reel

Pergunte se o usuário quer legenda queimada no fim (ex.: "BAIXE AGORA") e, se sim, qual texto.
Chame a skill `editor-video` para juntar os clipes num reel 1080×1920 com a legenda opcional.
O reel sai em `output/reels/reel-<timestamp>.mp4`.

## Passo 8: entregue

Mostre o path final do reel. Diga que os clipes mudos do free não têm trilha (dá para colocar
por fora se quiser). Pergunte se ficou bom ou se quer regerar alguma cena (o checkpoint deixa
regerar só a cena ruim, sem refazer o reel inteiro).

Registre que o usuário completou um run:

```bash
node scripts/jotaro-profile.cjs mark-run --root . --marca "<cliente-ou-marca>"
```

Se ainda não estiver em modo expert, ofereça: "Da próxima vez posso conduzir em modo expert,
com menos explicações e os mesmos checkpoints. Quer ativar?". Se aceitar:

```bash
node scripts/jotaro-profile.cjs expert-on --root .
```

Depois que o reel terminar com sucesso, registre a cadência:

```bash
node scripts/review-cadence.cjs record-flow --root . --kind video --label "<resumo-curto>"
```

Se o retorno vier com `revisao_sugerida: true`, sugira rodar `/revisao` agora. Se o usuário
não quiser, tudo bem, mas antes do próximo fluxo a revisão será obrigatória.

## Lembretes

- Custo por cena: 6 créditos (2 imagem + 4 vídeo). Reel de 6 = 36 créditos. Free = 10/dia.
- Primeiro uso: conduza devagar, explique cada etapa. Depois de um run completo, registre no
  perfil e ofereça o modo expert.
- O loop das cenas é seu. As folhas (`rag`, `prompt-smith`) só recebem entrada e devolvem
  saída; a execução é das skills. Você orquestra tudo.
