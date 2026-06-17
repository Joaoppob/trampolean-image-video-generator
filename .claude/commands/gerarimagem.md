---
description: Gera uma ou mais imagens a partir de uma cena, com a identidade da marca.
argument-hint: "[descrição da cena]"
---

# /gerarimagem

Gera imagens com a cara da marca. O protocolo abaixo é obrigatório, na ordem. Não pule o
preflight nem a checagem da RAG: são invariantes do Jotaro.

## Passo 1: entenda o estado

Antes de tudo, confira:
- A cadência de revisão permite iniciar?
  ```bash
  node scripts/review-cadence.cjs status --root .
  ```
  Se `pode_iniciar_fluxo: false`, rode o protocolo de `/revisao` antes de gastar crédito.
  Se a revisão falhar, pare e corrija antes de gerar.
- O Higgsfield está conectado? Se não, aponte `/setup` e pare.
- A pasta `RAG/identidade-visual/` tem ao menos uma imagem? **Se estiver vazia, pare** e peça
  ao usuário que coloque pelo menos uma referência ali (veja `RAG/README.md`). Sem referência,
  não há consistência.

## Passo 2: entreviste se o pedido for vago

Se a descrição da cena não deixa claro o que mostrar (personagem, ação, cenário, estilo), faça
**até 3 perguntas específicas** antes de gerar:

> "Eu entendi que você quer [o que entendeu], mas você não me explicou direito como quer a
> imagem: [pergunta 1] [pergunta 2] [pergunta 3]"

Não gere no escuro. Espere as respostas.

## Passo 3: preflight de custo

Rode `higgsfield-preflight` para o número de imagens que vai gerar (cada imagem = 2 créditos).
Mostre o custo total e o saldo. Avise que a geração depende do Higgsfield conectado. **Se o
saldo não cobre, pare** e informe o custo antes de continuar. Peça o ok do usuário.

## Passo 4: busque a identidade

Spawne o agente `rag` (via Task) para ler a pasta `RAG/` e devolver a identidade: anchor
textual, paleta, estilo e os paths das imagens de referência.

## Passo 5: monte o prompt

Spawne o agente `prompt-smith` (via Task), passando a identidade que o `rag` devolveu e a
intenção da cena. Ele devolve a shot-list no formato canônico, com o prompt pronto e os paths
de referência relativos à raiz.

## Passo 6: gere

Chame a skill `gera-imagem` para cada cena da shot-list. A skill usa as referências da `RAG/`
e salva em `output/imagens/`. Depois de gerar, mostre ao usuário o path de cada imagem e
pergunte se ficou bom ou se quer regerar alguma.

Depois que o fluxo de imagem terminar com sucesso, registre a cadência:

```bash
node scripts/review-cadence.cjs record-flow --root . --kind imagem --label "<resumo-curto>"
```

Se o retorno vier com `revisao_sugerida: true`, sugira rodar `/revisao` agora. Se o usuário
não quiser, tudo bem, mas antes do próximo fluxo a revisão será obrigatória.

## Lembretes

- Custo: 2 créditos por imagem. No free, teto de 10 por dia.
- Se for o primeiro uso, conduza devagar, explicando cada passo. Depois de um run completo,
  ofereça o modo expert (pula as explicações).
- Você não gera o prompt na unha nem a imagem você mesmo: o `prompt-smith` monta, a skill
  `gera-imagem` executa. Você orquestra.
