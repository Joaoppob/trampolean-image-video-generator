---
name: gera-imagem
description: Gera uma imagem 9:16 no Higgsfield (nano_banana_2 / "Nano Banana Pro") com a identidade visual da marca, usando as imagens de referência de RAG/identidade-visual/ como condicionamento, via Higgsfield CLI. Grava o resultado no save-crystal pra retomada. Use quando o usuário (ou o fluxo /gerarvideo) precisa criar a imagem de uma cena a partir de um prompt + refs.
argument-hint: "[cena] [prompt]"
allowed-tools: Bash, Read
---

# gera-imagem — uma cena → imagem 9:16 com a cara da marca

Pipeline (Higgsfield CLI): `upload create` das refs → `generate create nano_banana_2
--image <ids> --aspect_ratio 9:16 --wait --json` → parse do resultado → download.
**2 créditos/imagem.** Sem Soul/character (isso é pago — a consistência vem das
referências passadas em `--image`).

> **Pré-requisito:** o CLI autenticado (`higgsfield account status` mostra a conta certa).
> Se não, é `/setup` (passo do `higgsfield auth login`). O Jotaro resolve isso sozinho —
> sem reiniciar o Claude Code.

> **Modelo:** o id do CLI é `nano_banana_2` (nome de exibição "Nano Banana Pro", 2 cr).
> Se uma release do CLI renomear o modelo e o `generate create` recusar o id, descubra o
> id atual com `higgsfield model list --image` (procure "Nano Banana Pro") e use o novo
> `job set type`. Não caia para outro modelo de imagem sem avisar — custo/qualidade mudam.

## Projeto ativo (multi-projeto)

Tudo desta skill é **escopado ao projeto ativo**. Chame `<PROJ>` o root do projeto
(ex.: `projects/TraceDefense`) — o Jotaro já perguntou e confirmou qual é antes de
gastar crédito. Regra de paths:

- Scripts (`pipeline-state.cjs`, `ledger.cjs`) recebem `--root <PROJ>` — eles localizam
  o save-crystal e o ledger **dentro do projeto**.
- Comandos de shell crus (higgsfield, curl, mkdir, check-download) rodam da raiz do repo,
  então usam o prefixo completo: `<PROJ>/output/...` e `<PROJ>/RAG/identidade-visual/...`.
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

### 1. Subir as referências (ou reusar upload_ids do run)

As refs (mage1-3.png) são as MESMAS pra todas as cenas do run — suba uma vez por arquivo,
reuse em todas as cenas. O save-crystal guarda os upload_ids por arquivo. Para cada ref que
ainda não tem `media_id` neste run:

1. Cheque se já foi subida antes (chave estável = nome do arquivo sem extensão, ex. `mage1`):
   ```bash
   node scripts/pipeline-state.cjs media-get --root <PROJ> --key mage1
   ```
   Se `existe: true`, reuse o `media_id` — **não suba de novo**.
2. Se não: suba pelo CLI (faz o upload e devolve o id; **não cobra crédito**):
   ```bash
   higgsfield upload create "<PROJ>/RAG/identidade-visual/mage1.png" --json
   ```
   Pegue o id do upload da saída (é o UUID do media). Em caso de dúvida no campo, rode sem
   `--json` — o CLI imprime o id em texto.
3. Grave o id pra reuso:
   ```bash
   node scripts/pipeline-state.cjs media \
     --root <PROJ> --key mage1 --media-id <UPLOAD_ID>
   ```

**Atalho (auto-upload).** As flags de mídia do CLI também aceitam um **path local** direto
(`--image "<PROJ>/RAG/identidade-visual/mage1.png"`) e sobem o arquivo na hora. É mais simples,
mas re-sobe a ref a cada cena. Para um run de várias cenas, prefira subir uma vez (passos 1-3)
e reusar o id; o auto-upload é a saída de emergência se o save-crystal de media se perder.

**Recovery de upload_id expirado (run multi-dia).** Os ids do save-crystal são reusados entre
cenas e sessões. Num run retomado dias depois, o Higgsfield pode ter expirado o id e o
`generate create` (passo 2) falha com erro de mídia inválida/expirada. Os BYTES das refs
continuam locais em `<PROJ>/RAG/identidade-visual/`. Recovery: re-suba a ref a partir do
arquivo local (mesmo `higgsfield upload create` do passo 1.2), **sobrescreva** a chave no
save-crystal com o novo id (`pipeline-state.cjs media --root <PROJ> --key <nome> --media-id
<novo>`), e refaça o `generate create`. **Upload não cobra crédito** — só a geração cobra.

### 2. Gerar a imagem

```bash
higgsfield generate create nano_banana_2 \
  --prompt "<prompt da cena>" \
  --aspect_ratio 9:16 \
  --image <UPLOAD_ID_1> --image <UPLOAD_ID_2> --image <UPLOAD_ID_3> \
  --wait --wait-timeout 10m \
  --json > "<PROJ>/output/.last-image-job.json"
```

- `nano_banana_2`: o modelo (2 cr). **NÃO** use Soul/character (pago).
- `--aspect_ratio 9:16`: redundante com o `vertical 9:16 frame` no texto do prompt — rede de segurança.
- `--image <id>` repetido: uma flag por ref (vai pro array `input_images` do modelo).
- `--wait`: bloqueia até o job terminar e já traz o resultado no JSON (sem poll manual).

### 3. Parse do resultado + download

Extraia `job_id`, `status` e a URL do asset da saída JSON com o parser defensivo:

```bash
node scripts/lib/hf-result.cjs < "<PROJ>/output/.last-image-job.json"
```

Devolve `{ job_id, status, url, all_urls }`. Confirme `status` completo/sucesso e pegue `url`.
Se a geração vier com **erro de crédito**, é o teto batendo — pare e retome quando o pool
renovar (o preflight já deveria ter avisado). Se `url` vier `null` mas `status` completo,
inspecione o JSON cru (`<PROJ>/output/.last-image-job.json`) e pegue a URL do asset à mão.

Download:

```bash
node -e "require('fs').mkdirSync('<PROJ>/output/imagens',{recursive:true})"
curl -L "<url>" -o "<PROJ>/output/imagens/cena-<NN>-<tag>.png"
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
save-crystal** — trate como falha de download e re-tente o `curl -L` com a mesma `url`
(mesmo job, não custa crédito extra). Só siga para o passo 4 quando vier `ok: true`.

### 4. Save-crystal — gravar SEMPRE após cada imagem

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
run sem requeimar crédito, e mantém o state isolado por projeto. O `--job-id` é o do parser
(passo 3) — é ele que a `gera-video` reusa como `--start-image` (image-to-video sem re-upload).

### 5. Ledger de crédito — registrar o gasto (trilha de auditoria)

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
(image-to-video reusa o job como `--start-image` sem re-upload).

## Pegadinhas Windows

- `curl` está no PATH do Windows 10+ (curl.exe nativo). Para download use `-L` (segue redirect).
  **O upload de refs agora é do CLI** (`higgsfield upload create`) — não há mais `curl -X PUT`.
- Paths com espaço precisam de aspas — o repo do produto tem espaço no nome
  ("Trampolean Image and Video Generator"). Sempre aspeie `"<PROJ>/RAG/identidade-visual/mage1.png"`.
- Paths de referência são **relativos ao projeto ativo**
  (`<PROJ>/RAG/identidade-visual/mage1.png`), nunca `../../../` (P0.3).
