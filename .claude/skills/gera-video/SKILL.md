---
name: gera-video
description: Transforma a imagem de uma cena (via job_id da gera-imagem) num clipe de vídeo 9:16 curto no Higgsfield, usando SÓ veo3_1_lite (único modelo de vídeo no free tier), via Higgsfield CLI. Grava no save-crystal pra retomada. Use depois de gera-imagem, na etapa image-to-video do pipeline.
argument-hint: "[cena] [job_id-da-imagem]"
allowed-tools: Bash, Read
---

# gera-video — imagem → clipe 9:16

Pipeline (Higgsfield CLI): `generate create veo3_1_lite --start-image <job_id da imagem>
--duration 4 --aspect_ratio 9:16 --wait --json` → parse → download. **4 créditos/clipe**
(4s, 9:16, mudo). O `--start-image` aceita o `job_id` da imagem (image-to-video, **sem
re-upload** — a imagem já está no Higgsfield).

> **Pré-requisito:** CLI autenticado (`higgsfield account status` mostra a conta certa).
> Se não, `/setup`. O Jotaro resolve sozinho, sem reiniciar o Claude Code.

## ⚠️ `--duration 4` é OBRIGATÓRIO (senão custa o dobro)

O `veo3_1_lite` tem `duration` ∈ {4, 6, 8} e o **default do CLI é 8** (= **8 créditos**).
O nosso clipe é de 4s = **4 créditos**. **Sempre passe `--duration 4`** — esquecer dobra o
custo silenciosamente (8 cr/clipe estoura o teto free de 10/dia num único clipe). O
`custos.cjs`/preflight assume 4 cr, que só vale com `--duration 4`. Mantenha `generate_audio`
no default (`false` — clipe mudo, o som entra na montagem se for o caso).

## Projeto ativo (multi-projeto)

Escopo do projeto ativo `<PROJ>` (ex.: `projects/TraceDefense`), confirmado pelo Jotaro
antes de gastar. Scripts recebem `--root <PROJ>`; shell cru (higgsfield/curl/mkdir/check-download)
usa o prefixo `<PROJ>/output/...`; o `--path` do save-crystal fica relativo ao projeto
(`output/clips/...`).

## ⚠️ Só veo3_1_lite no free

`veo3_1_lite` é o **único** modelo de vídeo que roda no free tier. Os outros
**recusam** ou estouram o teto — **NÃO os tente** (cada tentativa premium é risco
de queimar crédito ou erro chato):

| Modelo | Status no free |
|--------|----------------|
| `veo3_1_lite` | ✅ funciona — 4cr a `--duration 4`, 9:16, mudo |
| Seedance 2.0 (`seedance_2_0`) | ❌ "Requires basic plan or higher" |
| Kling 3.0 (`kling3_0`) | ❌ "Requires basic plan or higher" |
| Wan 2.6 (`wan2_6`) | ❌ acima do teto diário |
| Grok Video (`grok_video`) | ❌ acima do teto diário |

Se `veo3_1_lite` estiver indisponível na sessão, **erro amigável e PARE** — não
caia pra Seedance/Kling/Grok/Wan na esperança de que funcione.

> **Modelo:** o id `veo3_1_lite` é o do catálogo do CLI ("Google Veo 3.1 Lite"). Se uma
> release renomear e o `generate create` recusar, confirme o id atual com
> `higgsfield model list --video` (procure "Veo 3.1 Lite"). Não troque por outro modelo
> de vídeo — no free só esse roda.

## Entrada

- `cena` — número da cena (índice no save-crystal).
- `job_id` da imagem (saída da `gera-imagem`) — OU `path` da imagem se precisar
  re-subir (caminho raro; o normal é reusar o job_id como `--start-image`).

## Procedimento

### 0. Idempotência — checar o save-crystal

```bash
node scripts/pipeline-state.cjs get \
  --root <PROJ> --cena <N> --tipo video
```

Se `existe: true`, **NÃO regere** — reuse o `path` do clipe e siga.

**Reconciliação state-vs-disco.** Se `get` retorna `existe: false` MAS o clipe da cena
já existe no disco em `<PROJ>/output/clips/` (cheque com `fs.existsSync("<PROJ>/" + path)`),
**NÃO regere** — o
crédito já foi gasto num run anterior cujo state se perdeu. Em vez disso, reconstrua o
registro no state com um `set` usando `--job-id recovered-from-disk` e o `--path` do
clipe encontrado, e siga. Só gere de fato quando `existe: false` **E** o clipe não existe
no disco. Limitação: se o usuário renomeou o arquivo, a reconciliação não detecta (o path
do state não bate com o disco) e a cena será regerada.

### 1. Gerar o vídeo

```bash
higgsfield generate create veo3_1_lite \
  --start-image <JOB_ID_DA_IMAGEM> \
  --duration 4 \
  --aspect_ratio 9:16 \
  --wait --wait-timeout 20m --wait-interval 5s \
  --json > "<PROJ>/output/.last-video-job.json"
```

- `veo3_1_lite` (e SÓ esse no free).
- `--start-image <JOB_ID_DA_IMAGEM>`: image-to-video reusando o job da imagem, sem re-upload
  (a flag aceita upload id **ou** job id). Se só tiver o path da imagem, passe o path (auto-upload).
- `--duration 4`: **obrigatório** (ver aviso acima — sem isso, 8 cr).
- `--wait`: vídeo demora mais que imagem (~minutos); o `--wait` bloqueia até terminar.

Se o CLI recusar `veo3_1_lite` especificamente (não por crédito, mas por indisponibilidade
do modelo), retorne erro amigável e PARE.

### 2. Parse do resultado + download

```bash
node scripts/lib/hf-result.cjs < "<PROJ>/output/.last-video-job.json"
```

Devolve `{ job_id, status, url, all_urls }`. Confirme `status` de sucesso e pegue `url`. Se
vier **erro de crédito** → teto batendo, pause e retome. Se `url` vier `null` mas status
completo, inspecione o JSON cru (`<PROJ>/output/.last-video-job.json`) e pegue a URL à mão.

```bash
node -e "require('fs').mkdirSync('<PROJ>/output/clips',{recursive:true})"
curl -L "<url>" -o "<PROJ>/output/clips/cena-<NN>-<tag>.mp4"
```

**Guard de download zero-bytes — cheque ANTES de gravar no save-crystal.** Um curl que falhou
em silêncio grava 0 bytes como sucesso, e a montagem (FFmpeg) quebra depois com erro opaco.
Valide o clipe:

```bash
node scripts/lib/check-download.cjs "<PROJ>/output/clips/cena-<NN>-<tag>.mp4"
```

Se vier `ok: false`, o download falhou (clipe vazio ou truncado): **NÃO grave no save-crystal**
— trate como falha de download e re-tente o `curl -L` com a mesma `url` (mesmo job, não
custa crédito extra). Só siga para o passo 3 quando vier `ok: true`.

### 3. Save-crystal — gravar SEMPRE após cada clipe

```bash
node scripts/pipeline-state.cjs set \
  --root <PROJ> --cena <N> --tipo video \
  --job-id <JOB_ID_VIDEO> \
  --path "output/clips/cena-<NN>-<tag>.mp4" \
  --prompt-tag <tag>
```

### 4. Ledger de crédito — registrar o gasto (trilha de auditoria)

Só **depois de ter gerado de fato** (gasto real). Nunca numa retomada/skip
(quando `existe: true` ou reconciliou do disco) — lá não houve gasto:

```bash
node scripts/lib/ledger.cjs append \
  --root <PROJ> --tipo video --cena <N> --job-id <JOB_ID_VIDEO> --marca "<projeto>"
```

Trilha append-only em `<PROJ>/output/.credit-ledger.jsonl`, dentro do projeto e separada do
save-crystal. Crédito vem de `custos.cjs`. Total: `node scripts/lib/ledger.cjs summary --root <PROJ>`.

## Retorno

`{ path do clipe }`. Os paths de todos os clipes do run alimentam a skill
`editor-video` (concat → reel).

## Pegadinhas Windows

- `curl` nativo (curl.exe). Para download use `-L` (segue redirect da URL do asset).
- O save-crystal é o MESMO state de `gera-imagem` (`<PROJ>/output/.pipeline-state.json`):
  imagem e vídeo da mesma cena ficam sob a mesma chave de cena, em sub-registros
  `imagem` / `video`.
