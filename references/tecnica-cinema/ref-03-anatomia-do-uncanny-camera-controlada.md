# REF-03 — Anatomia do uncanny + câmera como gramática (craft controlado in-camera)

> Biblioteca de referências técnicas do gerador. **Conteúdo descartado; só o método.**
> Esta é a REF mais importante pro **anti-IA**: ela disseca **o que faz uma imagem parecer
> fake/digital** — exatamente o "tell" que os nossos gates anti-IA (C8–C11) combatem. Dupla
> serventia: **evitar** o uncanny (default) ou **controlá-lo de propósito** quando a estética pedir.

**Fonte (breakdown com a técnica exposta):** Oscar Hudson — Coinbase "Your Way Out".
- Breakdown: https://www.youtube.com/watch?v=zzpLW3PdNEg
**Perfil:** uma peça que *parece* CG/IA mas é **100% prática, in-camera** (Cannes Film Craft Grand
Prix 2026). O diretor reverte o jogo: humanos fabricando uma "realidade digital" à mão.

---

## 1. A anatomia do uncanny (o "tell" de fake) — o que evitar por padrão

O fake não mora num erro grande; mora em **pequenas offnesses** que o olho sente sem nomear:

- **Proporção/escala erradas** — ombros do paletó no lugar errado, lapela torta, objeto fora de
  escala. "Mãos digitais erram as configurações."
- **Cor/saturação levemente off** — cinzas que não são cinza puro (puxam roxo/laranja), saturação
  estranha. O "quase certo" da cor sinaliza irrealidade.
- **Detalhe achatado** — complexidade real (rosto, placa, vitrine) **impressa flat, 2D, com leve
  downres/pixelização** e recolada na superfície. Profundidade falsa.
- **Movimento "de boneco"** — gesto sem peso/humanidade, lexicon mecânico.
> **Regra anti-IA (default do gerador):** prompt e gate devem **travar coerência física** —
> proporção, escala, peso, continuidade de luz. Se a imagem tem "offness" sutil de
> escala/proporção/cor, é o tell de IA. (É literalmente o grupo C8–C11 da rubrica.)

## 2. Câmera = gramática que codifica o registro

A linguagem de câmera **carrega o significado**, não é decoração:

- **Registro "irreal/game":** POV **isométrico fixo** seguindo o personagem central; continuidade
  direta A→B→C; **sem close-ups, sem cutaways, sem parallax**. Distante, controlado, frio.
- **Registro "humano/real":** **close-up, handheld, foco suave, texturas, cor**, abstração
  emocional. Perto, tátil, quente.
- **A virada se faz NA câmera:** o "reality run" começa **locked-off isométrico a ~10m** e, num
  **único movimento contínuo**, desce e vira **handheld tátil**. A transformação emocional é a
  transformação da gramática de câmera.
> **No nosso I2V:** escolher o registro por clipe. "Frio/contido" = locked-off, distante, estável.
> "Quente/íntimo" = leve handheld, close. **Um registro por clipe**, coerente com o beat da alma.

## 3. Luz e cor servem o registro, não a beleza

- O DP **iluminou flat e sem sombra de propósito** (contra o instinto de "deixar bonito") porque
  o brief pedia "parecer game". **Luz serve a intenção, não a vaidade.**
- Cor: **dessaturado-mas-estranhamente-colorido** (off-tones) pra alimentar o irreal.
> **No prompt:** nomear a luz pela **função** ("flat, shadowless, even" vs "single hard backlight,
> deep shadow"), não por adjetivo vazio.

## 4. Sujeito se destaca na multidão

- **Herói no centro do quadro** na maior parte do filme + **um marcador** (a seta).
- **Lexicon de movimento próprio** (coreógrafo) — humanidade dentro do uncanny; performer de
  teatro físico > dançarino tradicional (qualidade de personagem, não só de movimento).
> **No nosso caso (um sujeito só):** sujeito centralizado + traço distintivo carregado em todo
> clipe (casa com `identity-trait-carry`).

## 5. Produção/controle (princípios portáveis)

- **A ideia dita a técnica:** "homem foge de um game" → **construir o game na vida real**, porque
  dá pra "deslizar de real-fingindo-de-CG para real" (de CG para real, não dá). Escolha a técnica
  que **permite a transição** que a história precisa.
- **Imperfeição = humanidade.** "Mostrar as costuras" (uma borda 2D à mostra) dá alma; perfeição
  lisa é o que soa morto. (A peça virou manifesto pró-craft humano vs "AI slop".)
- **Câmera controlada e repetível** (crane sobre caminhão dirigido em linha = "motion control de
  pobre") permite compor múltiplos passes sem pan/tilt/parallax.
- **Corte na ação do corpo/rosto dentro do caos**, não na coluna/wipe óbvio — transição mais
  perdoável e fluida.
- **Engenharia reversa do set a partir de uma locação encontrada** (scout primeiro, constrói
  depois pra casar).

## 6. Mapeamento pro pipeline

- **Gates anti-IA (C8–C11 / `critique` / Wave L):** a seção 1 é o checklist do "tell" — proporção,
  escala, cor-off, achatamento, movimento sem peso. Pontuar o render real contra isso.
- **`motion-prompt-smith`:** seção 2 — registro de câmera por clipe (locked-off frio vs handheld
  íntimo), um por clipe, casado ao beat.
- **`prompt-smith` (still):** seção 3/4 — luz pela função, sujeito centralizado + traço carregado.

## 7. Destilação — leis acionáveis

1. **O tell de IA é offness sutil de proporção/escala/cor + achatamento + movimento sem peso → travar coerência física.**
2. **Câmera é gramática: locked-off = frio/contido; handheld+close = quente/humano. Um registro por clipe, casado ao beat.**
3. **Luz e cor servem o registro, nomeadas pela função — nunca "bonito" genérico.**
4. **Imperfeição com peso = humanidade; perfeição lisa = morto.**
5. **A ideia dita a técnica; escolha o método que permite a transição que a história pede.**
