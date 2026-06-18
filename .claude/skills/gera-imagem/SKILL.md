---
name: gera-imagem
description: Gera uma imagem 9:16 no Higgsfield (nano_banana_pro) com a identidade visual da marca, usando as imagens de referência de RAG/identidade-visual/ como condicionamento. Grava o resultado no save-crystal pra retomada. Use quando o usuário (ou o fluxo /gerarvideo) precisa criar a imagem de uma cena a partir de um prompt + refs.
argument-hint: "[cena] [prompt]"
allowed-tools: Bash, Read, mcp__higgsfield__media_upload, mcp__higgsfield__media_confirm, mcp__higgsfield__generate_image, mcp__higgsfield__job_status
---

# gera-imagem — uma cena → imagem 9:16 com a cara da marca

Pipeline provado nos spikes: `media_upload` → PUT bytes → `media_confirm` das refs
→ `generate_image(nano_banana_pro, refs role=image, aspect_ratio 9:16)` → poll →
download. **2 créditos/imagem.** Sem `create_character` (isso é pago — a
consistência vem das referências).

## Projeto ativo (multi-projeto)

Tudo desta skill é **escopado ao projeto ativo**. Chame `<PROJ>` o root do projeto
(ex.: `projects/TraceDefense`) — o Jotaro já perguntou e confirmou qual é antes de
gastar crédito. Regra de paths:

- Scripts (`pipeline-state.cjs`, `ledger.cjs`) recebem `--root <PROJ>` — eles localizam
  o save-crystal e o ledger **dentro do projeto**.
- Comandos de shell crus (curl, mkdir, check-download) rodam da raiz do repo, então usam
  o prefixo completo: `<PROJ>/output/...` e `<PROJ>/RAG/identidade-visual/...`.
- Paths da shot-list (`salvar_em`, `referencias_obrigatorias`) são **relativos ao projeto**
  (`output/imagens/...`, `RAG/identidade-visual/...`) — resolva-os contra `<PROJ>/`.

## Entrada

- `cena` — número da cena (índice no save-crystal).
- `prompt` — prompt de imagem (vem do `prompt-smith`, formato do `exemplo-shotlist-mago.json`).
- `refs` — paths das imagens de referência em `<PROJ>/RAG/identidade-visual/` (1-3; o mago usa 3).
- aspecto fixo **9:16**.

## Procedimento

### 0. Idempotência — checar o save-crystal ANTES de gerar

```bash
node scripts/pipeline-state.cjs get \
  --root <PROJ> --cena <N> --tipo imagem
```

Se `existe: true` (já tem `job_id` + `path`), **NÃO regere** — crédito não volta.
Reuse o `job_id`/`path` do registro e siga. Só gere se `existe: false`.

**Reconciliação state-vs-disco.** Se `get` retorna `existe: false` MAS o arquivo
`salvar_em` da cena já existe no disco (cheque com `fs.existsSync("<PROJ>/" + salvar_em)`),
**NÃO regere** —
o crédito já foi gasto num run anterior cujo state se perdeu. Em vez disso, reconstrua
o registro no state com um `set` usando `--job-id recovered-from-disk` e o `--path` do
arquivo encontrado, e siga. Só gere de fato quando `existe: false` **E** o arquivo não
existe no disco. Limitação: se o usuário renomeou o arquivo, a reconciliação não detecta
(o path do state não bate com o disco) e a cena será regerada.

### 1. Subir as referências (ou reusar media_ids do run)

Para cada ref que ainda não tem `media_id` neste run:

1. Cheque se já foi confirmada antes (chave estável = nome do arquivo sem extensão, ex. `mage1`):
   ```bash
   node scripts/pipeline-state.cjs media-get --root <PROJ> --key mage1
   ```
   Se `existe: true`, reuse o `media_id` — **não suba de novo**.
2. Se não: `mcp__higgsfield__media_upload` (com o filename) → retorna `upload_url`
   → **PUT os bytes** do arquivo pra essa URL (via
   `curl -X PUT --data-binary @"<PROJ>/RAG/identidade-visual/mage1.png" "<upload_url>"`)
   → `mcp__higgsfield__media_confirm` (type apropriado) → retorna o `media_id`.
3. Grave o media_id pra reuso:
   ```bash
   node scripts/pipeline-state.cjs media \
     --root <PROJ> --key mage1 --media-id <MEDIA_ID>
   ```

> As refs (mage1-3.png) são as MESMAS pra todas as cenas do run — suba uma vez,
> reuse em todas. O save-crystal guarda os media_ids por arquivo.

**Recovery de media_id expirado (run multi-dia).** Os media_ids do save-crystal são
reusados entre cenas e sessões. Num run retomado dias depois, o Higgsfield pode ter
expirado o media_id, e o `generate_image` (passo 2) falha com erro de media_id
inválido/expirado. Os BYTES das refs continuam locais em `<PROJ>/RAG/identidade-visual/`.
Recovery: re-suba a ref a partir do arquivo local (mesmo procedimento do passo 1.2 — upload +
confirm), **sobrescreva** a chave no save-crystal com o novo media_id
(`pipeline-state.cjs media --root <PROJ> --key <nome> --media-id <novo>`), e refaça o
`generate_image`. **Upload não cobra crédito** — só a geração cobra.

### 2. Gerar a imagem

Chame `mcp__higgsfield__generate_image` com:
- `model`: `nano_banana_pro`
- `aspect_ratio`: `9:16` (redundante com o `vertical 9:16 frame` no texto do prompt — rede de segurança)
- `medias`: os media_ids das refs, cada um com `role: image`
- `prompt`: o prompt da cena
- **NÃO** passe `create_character` / Soul (pago).

### 3. Poll do job

Use `mcp__higgsfield__job_status` com `sync: true` (≈20s → `completed`). Se vier
erro de crédito, é o teto batendo — pare e retome quando o pool renovar (o
preflight já deveria ter avisado).

### 4. Download do resultado

Pegue o `rawUrl` do job completado e baixe:

```bash
node -e "require('fs').mkdirSync('<PROJ>/output/imagens',{recursive:true})"
curl -L "<rawUrl>" -o "<PROJ>/output/imagens/cena-<NN>-<tag>.png"
```

(Use o `salvar_em` da shotlist, prefixado com `<PROJ>/`; ex:
`<PROJ>/output/imagens/cena-02-aparicao.png`.)

**Guard de download zero-bytes — cheque ANTES de gravar no save-crystal.** Um curl que
falhou em silêncio (URL expirada, timeout) grava 0 bytes como se tivesse dado certo, e o
pipeline só quebra depois, no FFmpeg, com erro opaco. Valide o arquivo:

```bash
node scripts/lib/check-download.cjs "<PROJ>/output/imagens/cena-<NN>-<tag>.png"
```

Se vier `ok: false`, o download falhou (arquivo vazio ou truncado): **NÃO grave no
save-crystal** — trate como falha de download e re-tente o `curl -L` com o mesmo `rawUrl`
(mesmo job_id, não custa crédito extra). Só siga para o passo 5 quando vier `ok: true`.

### 5. Save-crystal — gravar SEMPRE após cada imagem

```bash
node scripts/pipeline-state.cjs set \
  --root <PROJ> --cena <N> --tipo imagem \
  --job-id <JOB_ID> \
  --path "output/imagens/cena-<NN>-<tag>.png" \
  --media-ids <id1>,<id2>,<id3> \
  --prompt-tag <tag>
```

O `--path` fica **relativo ao projeto** (`output/imagens/...`) — o save-crystal já vive
dentro de `<PROJ>/`, então o path não repete o prefixo. Isso é o que permite retomar um
run sem requeimar crédito, e mantém o state isolado por projeto.

### 6. Ledger de crédito — registrar o gasto (trilha de auditoria)

Só aqui, **depois de ter gerado de fato** (gasto real de crédito). Nunca registre
numa retomada/skip (quando `existe: true` ou reconciliou do disco) — lá não houve gasto:

```bash
node scripts/lib/ledger.cjs append \
  --root <PROJ> --tipo imagem --cena <N> --job-id <JOB_ID> --marca "<projeto>"
```

O ledger é append-only (`<PROJ>/output/.credit-ledger.jsonl`): trilha imutável de quanto
cada run custou, dentro do projeto e separada do save-crystal. Passe `--marca "<projeto>"`
(o nome do projeto ativo) — o verify checa que o ledger não foi contaminado por outro
projeto. O crédito vem de `custos.cjs`. Total: `node scripts/lib/ledger.cjs summary --root <PROJ>`.

## Retorno

`{ path da imagem, job_id }`. O `job_id` é a entrada da skill `gera-video`
(image-to-video reusa o job sem re-upload).

## Pegadinhas Windows

- `curl` está no PATH do Windows 10+ (curl.exe nativo). Em PUT de bytes binários,
  use `--data-binary @"<path>"` (com as aspas se o path tiver espaço — e o repo do
  produto tem espaço no nome: "Trampolean Image and Video Generator").
- Paths de referência são **relativos ao projeto ativo**
  (`<PROJ>/RAG/identidade-visual/mage1.png`), nunca `../../../` (P0.3).
