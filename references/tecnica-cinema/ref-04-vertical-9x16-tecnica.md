# REF-04 — Técnica de vertical 9:16 (o formato que o gerador entrega)

> Biblioteca de referências técnicas do gerador. **Conteúdo descartado; só o método.**
> Esta REF cobre o **formato nativo do nosso reel** (1080×1920). Alimenta o `prompt-smith` (still),
> o `dp-quality` (safe-zone 9:16) e o `motion-prompt-smith`.

**Fontes:**
- **Apple "Vertical Cinema"** (dir. Damien Chazelle, "The Stunt Double"), case do CD Adam Alshin —
  https://adamalshin.com/Apple-Vertical-Cinema (D&AD + Cannes Lions ouro). Vertical tratado como
  **forma de arte deliberada**, escrito modularmente pra virar spots :15.
- Vertical 9:16 marketing mandate — https://videoadsstudio.com/vertical-video-2026-s-9-16-marketing-mandate/
- Estética do curta vertical — https://www.alinear.sr-digital.biz/en/read/vertical-short-film-digital-cinematic-aesthetics

---

## 1. Princípio-mãe

**Compor PARA o quadro alto desde o início — nunca cropar 16:9.** Cropar perde resolução e gera
enquadramento torto. O vertical não é cinema deitado; é uma **gramática própria**: pouco espaço
lateral, muita verticalidade. Como na Apple Vertical Cinema, todo elemento (história, blocking,
arte, trilha) nasce **pensado pro vertical**.

## 2. Composição no quadro alto

- **Use topo e base.** Sem largura lateral pra detalhe de ambiente, a informação se empilha na
  vertical (FG embaixo, sujeito no meio, contexto em cima).
- **Intimidade do sujeito.** O 9:16 puxa pra **rosto e linguagem corporal** — conexão emocional
  direta. O sujeito tende ao centro/terço.
- **Safe-zone central (nosso gate `dp-quality`):** ação no meio 60% (Y≈220–1440); topo e base
  limpos pra sobrepor legenda/UI depois sem cobrir o essencial.
- **Profundidade ainda vale** (FG/MG/BG da REF-01), mas distribuída verticalmente.

## 3. Movimento próprio do vertical

- **Tilt (cima/baixo)** lê melhor que pan no quadro alto; revelações verticais funcionam.
- Movimento de câmera continua sendo **um por clipe, motivado** (regra das REF-01/03).
- **Split vertical** é recurso nativo (quando fizer sentido), não no nosso caso default.

## 4. Ritmo — duas escolas (escolha consciente)

- **Scroll-stopping (TikTok puro):** novo elemento/ângulo a cada **1–3s**; 7–15s no total; energia
  e corte rápido pra reter no feed.
- **Craft-hold (cinema vertical):** plano sustentado, ritmo respirado, retenção pela força do
  sujeito + som (como Apple Vertical Cinema).
> **Nosso default:** **craft-hold guiado pela locução** — stills duros + um movimento motivado,
> tempo marcado na voz (não corte frenético). O ritmo nasce do áudio (ver REF-01 §6 e a alma).

## 5. Modularidade

A Apple Vertical Cinema foi **escrita modular**: um curta que recorta em spots :15 por gênero. É o
mesmo princípio "hero film → cutdowns" das refs Apple. **Pensar o reel pra render cortes** desde a
concepção (um arco, vários cortes).

## 6. Mapeamento pro pipeline

- **`prompt-smith` (still):** composição vertical em camadas, sujeito no centro/terço, safe-zone
  central, topo/base limpos pra texto — já é regra do `dp-quality`.
- **`dp-quality`:** confirma 9:16 com safe-zone (Y=220–1440 / meio 60%).
- **`motion-prompt-smith`:** preferir **tilt** a pan; um movimento motivado; ritmo na voz.

## 7. Destilação — leis acionáveis

1. **Compor nativo 9:16; empilhar informação na vertical; nunca cropar de 16:9.**
2. **Intimidade do sujeito (rosto/corpo) no meio 60%; topo/base limpos pra legenda futura.**
3. **Tilt > pan; um movimento motivado por clipe.**
4. **Ritmo na voz (craft-hold), não corte frenético — nosso default.**
5. **Um arco pensado pra render cutdowns.**
