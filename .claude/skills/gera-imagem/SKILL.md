---
name: gera-imagem
description: Produz a imagem de uma cena 9:16 com a identidade visual da marca, em um de dois modos por cena. Modo biblioteca (fonte=biblioteca, asset-first): SELECIONA, copia o asset já existente (asset_path) para a saída da cena, sem gerar e sem gastar crédito. Modo geração (fonte=geracao): GERA via Higgsfield CLI (nano_banana_2 / "Nano Banana Pro"), usando as refs por personagem de referencias_obrigatorias como condicionamento (--image). Grava o resultado no save-crystal pra retomada. Use quando o usuário (ou o fluxo /gerarvideo) precisa produzir a imagem de uma cena.
argument-hint: "[cena] [prompt]"
allowed-tools: Bash, Read
---

# gera-imagem — uma cena → imagem 9:16 com a cara da marca

Esta skill **produz a imagem da cena** em um de dois modos, e o campo `fonte` da cena (vindo da
shot-list) decide qual:

- **`fonte: "biblioteca"` (seleção, custo zero):** a cena já tem o melhor asset existente escolhido
  (`asset_path`). Aqui não se gera nada: copia-se o asset para a saída da cena, com o mesmo guard de
  arquivo não-vazio e a mesma gravação no save-crystal de sempre. `job_id` simbólico
  `selected-from-library`, **0 créditos, sem entrada no ledger** (nada foi gasto). Ver
  "Procedimento: modo biblioteca".
- **`fonte: "geracao"` (geração via Higgsfield):** como sempre, mas as refs vêm de
  `referencias_obrigatorias` (refs da personagem da cena), não da pasta plana. Ver "Procedimento:
  modo geração".

Pipeline do modo geração (Higgsfield CLI): `upload create` das refs → `generate create nano_banana_2
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
- `fonte`: `biblioteca` ou `geracao` (vem da shot-list; ausente equivale a `geracao`). Decide o
  caminho desta skill.
- `tag`: tag curta da cena (compõe o nome do arquivo de saída e o `salvar_em`).
- `salvar_em`: path relativo do destino da cena (`output/imagens/cena-NN-tag.png`); resolva-o
  contra `<PROJ>/`.
- **Modo biblioteca:** `asset_path`, o path relativo do asset escolhido, DENTRO de
  `RAG/identidade-visual/` (resolva contra `<PROJ>/`). Não há `prompt`.
- **Modo geração:** `prompt`, o prompt de imagem (vem do `prompt-smith`, formato do
  `exemplo-shotlist-mago.json`); e `referencias_obrigatorias`, os paths das refs **da personagem da
  cena** em `<PROJ>/RAG/identidade-visual/<personagem>/` mais marca (1-3). No mago (pasta plana),
  são as refs da raiz de `RAG/identidade-visual/` (até 4).
- aspecto fixo **9:16**.

## Procedimento

### 0. Idempotência: checar o save-crystal ANTES de produzir

```bash
node scripts/pipeline-state.cjs get \
  --root <PROJ> --cena <N> --tipo imagem
```

Se `existe: true` (já tem `job_id` + `path`), **NÃO refaça**: em modo geração crédito não volta;
em modo biblioteca a cópia já está feita. Reuse o `job_id`/`path` do registro e siga. Só produza se
`existe: false`.

**Reconciliação state-vs-disco.** Se `get` retorna `existe: false` MAS o arquivo
`salvar_em` da cena já existe no disco (cheque com `fs.existsSync("<PROJ>/" + salvar_em)`),
**NÃO refaça**:
em modo geração o crédito já foi gasto num run anterior cujo state se perdeu; em modo biblioteca a
cópia já existe. Em vez disso, reconstrua o registro no state com um `set` usando
`--job-id recovered-from-disk` e o `--path` do arquivo encontrado, e siga. Só produza de fato
quando `existe: false` **E** o arquivo não existe no disco. Limitação: se o usuário renomeou o
arquivo, a reconciliação não detecta (o path do state não bate com o disco) e a cena será refeita.

### Ramificação por `fonte` (após o passo 0)

Com `existe: false` e o arquivo ausente no disco, ramifique:

- **`fonte: "biblioteca"`** → vá para "Procedimento: modo biblioteca" (seleção, 0 cr, sem ledger).
- **`fonte: "geracao"` (ou ausente)** → siga os passos 1 a 5 abaixo (geração, 2 cr, com ledger).

---

## Procedimento: modo biblioteca (seleção, custo zero)

A cena `biblioteca` não gera: ela **seleciona** o asset já curado e o copia para a saída da cena.
Sem Higgsfield, sem upload, sem prompt, sem ledger.

### B1. Resolver e validar o asset de origem

O `asset_path` é relativo ao projeto e DENTRO de `RAG/identidade-visual/`; resolva contra `<PROJ>/`
(ex.: `<PROJ>/RAG/identidade-visual/sofia/sofia_05_cafe_artesanal.png`). Confirme que o arquivo de
origem existe e não está vazio antes de copiar, com o mesmo guard de não-vazio do download:

```bash
node scripts/lib/check-download.cjs "<PROJ>/<asset_path>"
```

Se vier `ok: false` (asset ausente ou vazio), **pare** e reporte: o storyboard apontou um asset que
não resolve. Não caia para geração silenciosamente; a cena precisa voltar ao `storyboard-director`.

### B2. Copiar o asset para a saída da cena

```bash
node scripts/lib/ensure-dir.cjs --root <PROJ> output/imagens
cp "<PROJ>/<asset_path>" "<PROJ>/output/imagens/cena-<NN>-<tag>.png"
```

(Use o `salvar_em` da shot-list, prefixado com `<PROJ>/`.) Em seguida valide o destino com o mesmo
guard de arquivo não-vazio, **antes** de gravar no save-crystal:

```bash
node scripts/lib/check-download.cjs "<PROJ>/output/imagens/cena-<NN>-<tag>.png"
```

Se vier `ok: false`, a cópia falhou: **NÃO grave no save-crystal**, re-tente o `cp`. Só siga com
`ok: true`.

### B3. Save-crystal: gravar (job_id simbólico, sem crédito)

```bash
node scripts/pipeline-state.cjs set \
  --root <PROJ> --cena <N> --tipo imagem \
  --job-id selected-from-library \
  --path "output/imagens/cena-<NN>-<tag>.png" \
  --prompt-tag <tag>
```

O `job_id` é o simbólico `selected-from-library` (sem job Higgsfield): a `gera-video` o reconhece e
sobe o still local como start-frame, em vez de reusar um job inexistente. **Não há `--media-ids`**
(nenhuma ref foi subida). A idempotência é idêntica à do modo geração: gravado o registro, uma
retomada vê `existe: true` e pula.

### B4. Sem ledger

Modo biblioteca **não gasta crédito**: **não** registre no ledger. O ledger é trilha de gasto real;
uma seleção da biblioteca custa 0 e não entra nele. (No modo geração, o ledger é o passo 5.)

**Retorno (biblioteca):** `{ path da imagem, job_id: "selected-from-library" }`.

---

## Procedimento: modo geração (Higgsfield, 2 cr)

### 1. Subir as referências (ou reusar upload_ids do run)

As refs desta cena vêm de `referencias_obrigatorias` (refs da personagem da cena mais marca).
Numa marca de sujeito único (mago), são as mesmas `mage0-3.png` da pasta plana pra todas as cenas;
numa marca multi-personagem, são as refs da personagem **daquela** cena (ex.: a cena da Sofia usa
`RAG/identidade-visual/sofia/...`). De toda forma, suba uma vez por arquivo e reuse: o save-crystal
guarda os upload_ids por arquivo, com chave estável = nome do arquivo sem extensão. Suba só as refs
que a cena exige; nunca misture a ref de uma personagem na cena de outra. Para cada ref que ainda
não tem `media_id` neste run:

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
node scripts/lib/ensure-dir.cjs --root <PROJ> output/imagens
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
