---
name: higgsfield-preflight
description: Checa, ANTES de gerar qualquer imagem/vídeo, se o saldo Higgsfield cobre o run inteiro. Lê o saldo real via Higgsfield CLI (higgsfield account status), calcula o custo total (imagens + vídeos), compara, e diz se pode prosseguir. Use SEMPRE antes da primeira chamada de geração de um run. Para saldo isolado (/creditos), consulte o account status diretamente.
argument-hint: "[nº de cenas]"
allowed-tools: Bash
---

# higgsfield-preflight — trava de crédito

Disparos recusados por falta de crédito **não cobram**. Mesmo assim, checar antes
evita um run pela metade (gerar 5 imagens e travar na 6ª por falta de pool). Esta
skill calcula o custo **total** do run e compara com o saldo real.

## Custos fixos (free tier, provados ao vivo no CLI 2026-06-18)

| Item | Modelo (id CLI) | Custo |
|------|-----------------|-------|
| Imagem 9:16 | `nano_banana_2` ("Nano Banana Pro") | **2 créditos** |
| Vídeo 4s 9:16 | `veo3_1_lite` **com `--duration 4`** | **4 créditos** |
| Teto free | pool compartilhado img+vídeo | **10 cr/dia** |

> ⚠️ O `veo3_1_lite` custa **8 créditos no default** (`duration=8`). O custo de **4** só vale
> com `--duration 4` — que a skill `gera-video` sempre passa. Se alguém gerar sem `--duration 4`,
> o custo real dobra e este preflight subestima.

Um reel de 6 cenas = 6×2 + 6×4 = **36 créditos** = ~4 dias no free.

## Procedimento

### 1. Pegar o saldo REAL via CLI

```bash
higgsfield account status --json
```

Retorna `{ "email", "credits", "subscription_plan_type" }`. Use `credits` como `--saldo`.
**Confira o `email`** — é a conta que vai pagar. Se for a conta errada (ex.: grudou numa conta
antiga depois de uma troca), rode `higgsfield auth login` pra reautenticar na conta certa
**antes** de gastar — não precisa reiniciar o Claude Code. (Detalhe no `/setup` e no
`/creditos`.)

> Se o CLI não estiver autenticado (`account status` dá "Not authenticated"), **pare** e
> conduza o `higgsfield auth login` (passo do `/setup`). Não dá pra checar saldo nem gerar
> sem auth. Se o comando falhar por outro motivo, NÃO invente um número: para geração real,
> pare; para `/simular`, rode o cálculo sem `--saldo` e com `--allow-unknown-saldo true`.

### 2. Calcular custo e decisão (determinístico, sem rede)

```bash
node .claude/skills/higgsfield-preflight/scripts/preflight.cjs \
  --cenas <N> \
  --saldo <CREDITS_DO_ACCOUNT_STATUS>   # omitir se o account status não retornou
  [--com-video false]                   # se o run é só imagens
  [--teto-dia 10]                       # default 10 (free); ajustar se plano pago
  [--allow-unknown-saldo true]          # somente /simular; NUNCA para geração real
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
- **`saldo_conhecido: false`** → geração real deve parar. Só `/simular` pode passar
  `--allow-unknown-saldo true`, porque ali nenhuma chamada de geração será criada.
- **`saldo_valido: false`** → pare e rode `higgsfield account status` de novo; não gere
  com saldo inválido ou parseado como `NaN`.

**Cross-check opcional (custo real, sem gastar).** O CLI estima o custo de um disparo sem
criar job: `higgsfield generate cost veo3_1_lite --duration 4 --aspect_ratio 9:16` (deve dar
4) e `higgsfield generate cost nano_banana_2 --aspect_ratio 9:16` (deve dar 2). Útil pra
confirmar que os preços não mudaram desde os valores fixos do `custos.cjs`.

### 4. SPOF do vídeo: confirme o `veo3_1_lite` ANTES de gastar imagem

No free tier, `veo3_1_lite` é o **único** modelo de vídeo — ponto único de falha (SPOF):
sem ele não há reel. O cálculo de custo acima é determinístico e offline; ele NÃO sabe se o
modelo de vídeo está disponível agora — **o script não tem rede**. A checagem de
disponibilidade é via CLI, um **gate à parte, obrigatório antes da 1ª imagem**.

Quando o run **inclui vídeo** (`--com-video` não é `false`):

1. Antes de gastar o primeiro crédito de imagem, confirme que o `veo3_1_lite` aparece no
   catálogo da conta atual:
   ```bash
   higgsfield model list --video        # procure "veo3_1_lite" / "Veo 3.1 Lite"
   ```
   (O pipeline cobra a imagem primeiro e só descobriria o vídeo indisponível depois —
   gastando N imagens à toa.)
2. Se o `veo3_1_lite` estiver **indisponível** e o objetivo é um reel, **avise o usuário e
   PARE antes de gerar qualquer imagem.** Não adianta produzir as imagens se o vídeo é
   impossível — o crédito de imagem gasto não volta e o reel não fecha.
3. Para um run **só de imagens** (`--com-video false`), este passo não se aplica.

## Combina saldo real + estimativa

A decisão usa **saldo real** (do `account status`) **e** o **custo estimado** (fórmula fixa
img=2, vídeo=4 a `--duration 4`). O saldo vem da rede; o custo é determinístico. Nunca dependa
só de um: o custo você sempre sabe; o saldo pode faltar (CLI sem auth ou offline).
