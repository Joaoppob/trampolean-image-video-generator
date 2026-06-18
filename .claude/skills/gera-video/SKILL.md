---
name: gera-video
description: Transforma a imagem de uma cena (via job_id da gera-imagem) num clipe de vídeo 9:16 curto no Higgsfield, usando SÓ veo3_1_lite (único modelo de vídeo no free tier). Grava no save-crystal pra retomada. Use depois de gera-imagem, na etapa image-to-video do pipeline.
argument-hint: "[cena] [job_id-da-imagem]"
allowed-tools: Bash, Read, mcp__higgsfield__generate_video, mcp__higgsfield__job_status
---

# gera-video — imagem → clipe 9:16

Pipeline provado: `generate_video(veo3_1_lite, input = job_id da imagem)` → poll →
download. **4 créditos/clipe** (4s, 720p, mudo). O input é o `job_id` da imagem —
**sem re-upload** (a imagem já está no Higgsfield).

## ⚠️ Só veo3_1_lite no free

`veo3_1_lite` é o **único** modelo de vídeo que roda no free tier. Os outros
**recusam** ou estouram o teto — **NÃO os tente** (cada tentativa premium é risco
de queimar crédito ou erro chato):

| Modelo | Status no free |
|--------|----------------|
| `veo3_1_lite` | ✅ funciona — 4cr, 4s, 720p, mudo |
| Seedance 2.0 | ❌ "Requires basic plan or higher" |
| Kling 3.0 | ❌ "Requires basic plan or higher" |
| Wan 2.6 | ❌ 13cr (acima do teto diário) |
| Grok Imagine 1.5 | ❌ 12.5cr (acima do teto diário) |

Se `veo3_1_lite` estiver indisponível na sessão, **erro amigável e PARE** — não
caia pra Seedance/Kling/Grok/Wan na esperança de que funcione.

## Entrada

- `cena` — número da cena (índice no save-crystal).
- `job_id` da imagem (saída da `gera-imagem`) — OU `path` da imagem se precisar
  re-subir (caminho raro; o normal é reusar o job_id).

## Procedimento

### 0. Idempotência — checar o save-crystal

```bash
node scripts/pipeline-state.cjs get \
  --root . --cena <N> --tipo video
```

Se `existe: true`, **NÃO regere** — reuse o `path` do clipe e siga.

**Reconciliação state-vs-disco.** Se `get` retorna `existe: false` MAS o clipe da cena
já existe no disco em `output/clips/` (cheque com `fs.existsSync`), **NÃO regere** — o
crédito já foi gasto num run anterior cujo state se perdeu. Em vez disso, reconstrua o
registro no state com um `set` usando `--job-id recovered-from-disk` e o `--path` do
clipe encontrado, e siga. Só gere de fato quando `existe: false` **E** o clipe não existe
no disco. Limitação: se o usuário renomeou o arquivo, a reconciliação não detecta (o path
do state não bate com o disco) e a cena será regerada.

### 1. Gerar o vídeo

Chame `mcp__higgsfield__generate_video` com:
- `model`: `veo3_1_lite` (e SÓ esse)
- input: o `job_id` da imagem da cena (image-to-video, sem re-upload)
- aspecto/duração default do modelo (4s, 9:16).

Se o tool recusar `veo3_1_lite` especificamente (não por crédito, mas por
indisponibilidade do modelo), retorne erro amigável e PARE.

### 2. Poll do job

`mcp__higgsfield__job_status` com `sync: true`. Vídeo demora mais que imagem
(~minutos). Se erro de crédito → teto batendo, pause e retome.

### 3. Download

```bash
node -e "require('fs').mkdirSync('output/clips',{recursive:true})"
curl -L "<rawUrl>" -o "output/clips/cena-<NN>-<tag>.mp4"
```

**Guard de download zero-bytes — cheque ANTES de gravar no save-crystal.** Um curl que falhou
em silêncio grava 0 bytes como sucesso, e a montagem (FFmpeg) quebra depois com erro opaco.
Valide o clipe:

```bash
node scripts/lib/check-download.cjs "output/clips/cena-<NN>-<tag>.mp4"
```

Se vier `ok: false`, o download falhou (clipe vazio ou truncado): **NÃO grave no save-crystal**
— trate como falha de download e re-tente o `curl -L` com o mesmo `rawUrl` (mesmo job_id, não
custa crédito extra). Só siga para o passo 4 quando vier `ok: true`.

### 4. Save-crystal — gravar SEMPRE após cada clipe

```bash
node scripts/pipeline-state.cjs set \
  --root . --cena <N> --tipo video \
  --job-id <JOB_ID_VIDEO> \
  --path "output/clips/cena-<NN>-<tag>.mp4" \
  --prompt-tag <tag>
```

## Retorno

`{ path do clipe }`. Os paths de todos os clipes do run alimentam a skill
`editor-video` (concat → reel).

## Pegadinhas Windows

- `curl` nativo (curl.exe). Para download use `-L` (segue redirect do rawUrl).
- O save-crystal é o MESMO state de `gera-imagem` (`output/.pipeline-state.json`):
  imagem e vídeo da mesma cena ficam sob a mesma chave de cena, em sub-registros
  `imagem` / `video`.
