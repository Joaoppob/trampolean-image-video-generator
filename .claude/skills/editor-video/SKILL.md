---
name: editor-video
description: Monta N clipes num reel único 9:16 (1080×1920) via FFmpeg, com legenda opcional queimada (drawtext). Checa FFmpeg ANTES e para com instruções de instalação se ausente. Saída com timestamp (não sobrescreve). Use na etapa final do pipeline, depois que os clipes das cenas foram gerados.
argument-hint: "[clipes] [legenda?]"
allowed-tools: Bash, Read
---

# editor-video — N clipes → reel 9:16 montado

Etapa 4 do pipeline. Concat normalizado pra **1080×1920** + legenda opcional. Tudo
num helper Node determinístico (`scripts/concat-reel.cjs`) que monta o comando
FFmpeg correto (escaping de fonte por OS, filter_complex pra N clipes) e executa.

## ⚠️ PRIMEIRO: checar FFmpeg (antes de qualquer coisa)

```bash
node .claude/skills/editor-video/scripts/concat-reel.cjs --check
```

- `ok: true` → FFmpeg presente, siga.
- `ok: false` → **PARE**. Mostre as `instrucoes` (vêm por OS — winget/brew/apt) ao
  usuário e espere ele instalar. NÃO prossiga sem FFmpeg. (O `concat-reel.cjs`
  também refaz esse check internamente antes de montar — defesa em profundidade.)

## Montar o reel

```bash
node .claude/skills/editor-video/scripts/concat-reel.cjs \
  --clips "output/clips/cena-01-hook.mp4,output/clips/cena-02-aparicao.mp4,..." \
  --root . \
  [--legenda "BAIXE AGORA"] \
  [--legenda-estilo caixa|contorno] \
  [--legenda-inicio 3 --legenda-fim 8] \
  [--fontsize 72] \
  [--dry-run]
```

- `--clips`: lista separada por vírgula, **na ordem narrativa das cenas**. Paths
  relativos ao `--root` ou absolutos.
- `--root`: raiz do repo (`.`). A saída vai pra `<root>/output/reels/`.
- `--legenda`: texto do CTA (opcional). Omita pra reel sem legenda.
- `--legenda-estilo`: `caixa` (default, caixa semi-transparente — mais legível pra
  CTA) ou `contorno` (outline estilo TikTok, mais limpo).
- `--legenda-inicio`/`--legenda-fim`: segundos pra legenda aparecer só num intervalo
  (ex: CTA só nos últimos segundos). Omita pra legenda o vídeo todo.
- `--dry-run`: imprime o comando FFmpeg sem executar (pra inspecionar/debug).

## O que o helper faz por dentro

1. **Check FFmpeg** (de novo) — para se ausente.
2. Valida que todos os clipes existem (lista os que faltam).
3. Monta o **filter_complex pra N clipes** (abordagem A, defensiva): cada entrada
   `scale=1080:1920:force_original_aspect_ratio=decrease,pad=...,setsar=1,fps=24`,
   depois `concat=n=N:v=1:a=0` (`a=0` porque os clipes Veo free são mudos).
4. Se tem `--legenda`: encadeia um `drawtext` após o concat, com a fonte bold do OS
   (Windows: `C\:/Windows/Fonts/arialbd.ttf` com o `:` do drive escapado — a
   pegadinha que quebra o filtro; macOS: Arial Bold; Linux: DejaVu Sans Bold ou
   fontconfig), texto escapado (`:` → `\:`, `%` → `%%`, etc.), centralizado e na
   zona segura inferior (`y=h-text_h-180`).
5. Encoda: `libx264 -preset fast -pix_fmt yuv420p -movflags +faststart` (toca em
   celular e em preview de rede).
6. Saída: `output/reels/reel-YYYYMMDD-HHMMSS.mp4` (**timestamp** — nunca sobrescreve
   runs anteriores, P1.1).
7. `ffprobe` da saída → devolve resolução, fps e duração no JSON.

## Retorno

```json
{ "ok": true, "saida": ".../reel-20260617-184313.mp4",
  "n_clipes": 2, "legenda": "BAIXE AGORA",
  "metadata": { "resolucao": "1080x1920", "fps": "24/1", "duracao_seg": 4 } }
```

Em erro: `{ "ok": false, "etapa": "...", "erro": "...", ... }`.

## Pegadinhas Windows

- Fonte: o `:` do drive (`C:`) é separador do filtro FFmpeg — o helper já escapa
  pra `C\:/Windows/Fonts/arialbd.ttf`. Se Arial não existir, ele aborta com
  mensagem clara (em vez de gerar um reel sem texto silenciosamente).
- Texto de legenda com `:`, `%`, `'`, `,` ou `\` é escapado automaticamente pelo
  helper — passe o texto cru em `--legenda`, sem pré-escapar.
- Legenda multi-linha / frase longa: `drawtext` não quebra linha sozinho. Pro v1
  (CTA curto) o `text=` inline basta; pra texto longo, parta em chamadas separadas
  ou use `textfile=` (não coberto pelo helper v1).
