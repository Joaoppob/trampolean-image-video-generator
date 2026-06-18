---
description: Simula um run completo validando tudo (RAG, preflight, shot-list, skills) sem gastar 1 credito.
argument-hint: "[descricao do reel]"
---

# /simular

Roda toda a validacao pre-geracao sem disparar nada no Higgsfield. E util pra quem quer ver
o plano completo, conferir se a RAG esta pronta, e saber exatamente quanto vai custar — tudo
sem gastar credito.

## Passo 0: escolha o projeto

Liste `projects/` e pergunte qual projeto simular. Chame de `<PROJ>` o root escolhido
(ex.: `projects/TraceDefense`).

## Passo 1: validacao da RAG do projeto

Rode o validador deterministico da identidade do projeto:

```bash
node scripts/validate-rag.cjs --project <PROJ>
```

Se falhar, mostre o que falta (imagens, secoes da marca, anchor) e pare. Sem RAG pronta, nao
ha o que simular.

## Passo 2: preflight de custo

Rode `higgsfield-preflight` para o numero de cenas. Ele consulta o saldo real via MCP e
calcula o custo total. Mostre ao usuario:

- Numero de cenas
- Custo por cena: 2 creditos (imagem) + 4 creditos (video) = 6 creditos
- Custo total
- Saldo atual
- Se cabe no saldo ou quantos dias no free

Isso NAO gasta credito — e so consulta de saldo e calculo deterministico.

## Passo 3: identidade e shot-list

Spawne o `rag` para ler a identidade da marca — diga o projeto no spawn
(`{ objetivo, projeto: "<PROJ>" }`). Depois spawne o `prompt-smith` com a identidade e a
intencao das cenas. Ele devolve a shot-list completa, com prompts prontos.

Mostre ao usuario o resumo:
- Campanha e cliente
- Numero de cenas e duracao total
- Tags de cada cena (hook, aparicao, tensao...)
- Referencias visuais usadas
- Gate de consistencia

Isso NAO gasta credito — os agentes so leem e sintetizam.

## Passo 4: checks de prontidao

Confira:
- Higgsfield conectado? Se nao, aponte `/setup`.
- FFmpeg instalado? (`ffmpeg -version`). Se nao, aponte `/setup` Passo 2.
- `<PROJ>/output/imagens/` e `<PROJ>/output/clips/` existem (crie se nao).
- As referencias em `<PROJ>/RAG/identidade-visual/` batem com a shot-list.

## Fechamento

Mostre um resumo final:

```
SIMULACAO COMPLETA

RAG:                    pronta
Higgsfield:             conectado
FFmpeg:                 OK
Cenas:                  N
Custo total:            X creditos (Y imagens × 2 + Y videos × 4)
Saldo:                  Z creditos
Cabe no saldo?          sim / nao (faltam W creditos = ~D dias no free)

Shot-list pronta com:
  - gancho → molde 1
  - apresentacao → molde 2
  - ...

Quando quiser gerar de verdade, e so rodar /gerarvideo.
```

Se algo falhou em qualquer etapa, diga exatamente o que e como resolver. Nao cobre credito
para simular — toda a validacao e leitura ou calculo deterministico.
