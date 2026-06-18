---
name: higgsfield-preflight
description: Checa, ANTES de gerar qualquer imagem/vídeo, se o saldo Higgsfield cobre o run inteiro. Calcula o custo total (imagens + vídeos), compara com o saldo real, e diz se pode prosseguir. Use SEMPRE antes da primeira chamada de geração de um run. Para saldo isolado (/creditos), consulte os tools de saldo diretamente.
argument-hint: "[nº de cenas]"
allowed-tools: Bash, mcp__higgsfield__balance, mcp__higgsfield__show_plans_and_credits
---

# higgsfield-preflight — trava de crédito

Disparos recusados por falta de crédito **não cobram**. Mesmo assim, checar antes
evita um run pela metade (gerar 5 imagens e travar na 6ª por falta de pool). Esta
skill calcula o custo **total** do run e compara com o saldo real.

## Custos fixos (free tier, provados nos spikes de 2026-06-17)

| Item | Modelo | Custo |
|------|--------|-------|
| Imagem | `nano_banana_pro` | **2 créditos** |
| Vídeo 4s | `veo3_1_lite` | **4 créditos** |
| Teto free | pool compartilhado img+vídeo | **10 cr/dia** |

Um reel de 6 cenas = 6×2 + 6×4 = **36 créditos** = ~4 dias no free.

## Procedimento

### 1. Pegar o saldo REAL via MCP

Os tools de saldo do Higgsfield **existem** nesta integração. Chame, nesta ordem
de preferência (use o primeiro que retornar):

1. `mcp__higgsfield__balance` — saldo direto.
2. `mcp__higgsfield__show_plans_and_credits` — plano + créditos (extraia o saldo
   de crédito atual da resposta).

> ⚠️ Releases diferentes do Higgsfield MCP podem nomear/expor esses tools de forma
> distinta no ambiente do cliente. Se **nenhum** retornar, NÃO invente um número:
> rode o cálculo sem `--saldo`. O script entra em modo defensivo (estima o custo,
> avisa que o saldo é desconhecido, e orienta a tratar erro de crédito como sinal).
> Se o usuário pediu apenas `/creditos`, não rode este script sem `--cenas`: consulte só os
> tools de saldo.

### 2. Calcular custo e decisão (determinístico, sem rede)

```bash
node .claude/skills/higgsfield-preflight/scripts/preflight.cjs \
  --cenas <N> \
  --saldo <SALDO_REAL>          # omitir se o tool de saldo não retornou
  [--com-video false]           # se o run é só imagens
  [--teto-dia 10]               # default 10 (free); ajustar se plano pago
```

O script imprime JSON:

```json
{
  "cenas": 6,
  "saldo": 8,
  "custo_imagens": 12,
  "custo_videos": 24,
  "custo_total": 36,
  "dias_free": 4,
  "pool_baixo": false,
  "pode_prosseguir": false,
  "mensagem": "NAO da pra rodar o run inteiro agora. ..."
}
```

### 3. Agir sobre o resultado

- **`pode_prosseguir: false`** → PARE. Mostre a `mensagem` ao usuário. Ofereça:
  reduzir nº de cenas, esperar o pool renovar (`dias_free`), ou plano pago. NÃO
  comece a gerar.
- **`pode_prosseguir: true` + `pool_baixo: true`** → siga, mas avise: sem folga
  pra regenerar cenas que saiam ruins sem renovar o pool.
- **`pode_prosseguir: true` + `pool_baixo: false`** → siga, mostrando o custo
  total ao usuário antes da 1ª chamada (P1.2).
- **`saldo_conhecido: false`** → siga com cautela; se uma chamada de geração
  retornar erro de crédito, é o teto batendo — pause e retome quando o pool
  renovar (não é falha do pipeline).

### 4. SPOF do vídeo: confirme o `veo3_1_lite` ANTES de gastar imagem

No free tier, `veo3_1_lite` é o **único** modelo de vídeo — ponto único de falha (SPOF):
sem ele não há reel. O cálculo de custo acima é determinístico e offline; ele NÃO sabe se o
modelo de vídeo está disponível agora — **o script não tem rede**. Por isso a checagem de
disponibilidade do `veo3_1_lite` é **responsabilidade do operador via MCP** (consultar a
lista/tabela de modelos do Higgsfield), não lógica do script. O preflight calcula custo; a
disponibilidade do modelo de vídeo é um **gate à parte, obrigatório antes da 1ª imagem**.

Quando o run **inclui vídeo** (`--com-video` não é `false`):

1. Antes de gastar o primeiro crédito de imagem, confirme que o `veo3_1_lite` está disponível
   na conexão Higgsfield atual (o pipeline hoje cobra a imagem primeiro e só descobriria o
   vídeo indisponível depois — gastando N imagens à toa).
2. Se o `veo3_1_lite` estiver **indisponível** e o objetivo é um reel, **avise o usuário e
   PARE antes de gerar qualquer imagem.** Não adianta produzir as imagens se o vídeo é
   impossível — o crédito de imagem gasto não volta e o reel não fecha.
3. Para um run **só de imagens** (`--com-video false`), este passo não se aplica.

## Combina saldo real + estimativa

A decisão usa **saldo real** (do tool MCP) **e** o **custo estimado** (fórmula fixa
img=2, vídeo=4). O saldo vem da rede; o custo é determinístico. Nunca dependa só de
um: o custo você sempre sabe; o saldo pode faltar.
