# REF-01 — Spec ad cinematográfico: montagem mood-driven + luz natural

> **Biblioteca de referências técnicas do gerador.** Cada referência destila o **método** de uma
> peça profissional real (humana, não-IA) em craft reutilizável. **Conteúdo/história são
> descartados de propósito** — aqui mora só a técnica. Alimenta o `prompt-smith` (still),
> o `motion-prompt-smith` (prompt de movimento Veo I2V) e o `editor-video` (pós, Wave K).

**Fonte:** Jacob Nordin — spec ad "Between Places" + breakdown "How I Made a Cinematic Car
Commercial".
- Peça: https://www.youtube.com/watch?v=VlTSdevWZeQ (191k views, verificado por curl — em faixa)
- Breakdown: https://www.youtube.com/watch?v=3tVwEcc6WEE
**Perfil:** um cineasta, uma semana, **orçamento zero, zero luz artificial**. Câmera Sony
(FX3/A7S3), Slog3. Prova que o craft mora na **luz, composição, som e grade** — não no budget.

---

## 1. Princípio-mãe

- **Montagem mood-driven, não narrativa de diálogo.** O sentido nasce do **corte + som + luz**.
  O sujeito é símbolo (liberdade/solidão/natureza), não personagem que fala.
- **Planejar o SENTIMENTO por cena, não o shot travado.** Shot list por locação + nota de
  intenção → flexibilidade pra descobrir planos no set.
- **Menor versão viável.** Realismo de escopo é o que faz a ideia sair da cabeça.

## 2. Luz — a alavanca nº 1 (custo zero)

- **Backlight sempre.** A fonte principal (sol) fica **atrás do sujeito**; filma-se do **lado de
  sombra**. Gera forma, profundidade, contraste e separação. Frontal (sol atrás da câmera) =
  chapado e lavado.
- **A janela mágica:** logo **depois do pôr do sol** — luz difusa e suave; posicionar o sujeito
  pra o glow envolver o rosto enquanto o resto cai em sombra → mood sem equipamento.
- **Zero luz artificial.** A direção e a hora do sol fazem o trabalho.
- → **No prompt:** nomear luz como **fonte + direção**: `backlit by a low sun from behind, shadow
  side to camera, soft glow wrapping the face, background falling into shadow`. Nunca
  "cinematic lighting".

## 3. Composição / profundidade

- **Camadas FG / MG / BG.** Profundidade = imagem viva.
- **Filmar ATRAVÉS de algo** (galhos, corredor, reflexo) → moldura natural + profundidade.
- **Negative space** e **rule of thirds** como equilíbrio, não regra rígida.
- → **No prompt:** `layered depth, shot through foreground branches, subject set in negative space,
  off-center framing`.

## 4. Lente / textura

- **Primes vintage** (Nikkor AIS 20/28/35/50/85, ~US$100–300). Caráter suave, look filmic.
  Abertos = soft; fechando 1–2 stops = ganham nitidez.
- O look vintage vem da **ótica + grade**, não de "sharp/8K".
- → **No prompt:** `vintage prime character, gentle softness, subtle filmic texture` (em vez de
  `ultra-sharp, 8K, photoreal`).

## 5. Câmera / movimento

- **A maioria dos planos é ESTÁTICA** (primes manuais bastam). **Movimento é minoria.**
- **Tracking** (sujeito em movimento): troca pra zoom com **autofoco** (24–105) pra manter foco.
- Ferramentas: tripé, gimbal, **slider** (2–3 planos), **drone** (aéreas, DLOG), **car-mount**
  (ventosa + magic arm).
- **ND variável** (NiSi 1–5 stops) pra controlar exposição/shutter e manter **motion blur natural**
  sob luz forte.
- → **Mapeamento Veo I2V (regra dura):** **um** movimento por clipe; o **padrão é still ou
  quase-parado**; o movimento (tracking lateral, push lento, reveal de drone) é **exceção
  motivada**. Casa 1:1 com a `estrategia_render` do brief de alma e com o gate de render.

## 6. Som — 100% em pós, e é o **referente de sincronia**

- **Soundscape construído do zero por cena.** Analisar o que se *deveria* ouvir e montar.
- **Pan L/R** por posição na tela (rio à esquerda, vento/pássaros à direita). **Reverb** pra
  distância e pra encaixar som fora de lugar.
- **Transições:** whoosh + riser; intro em camadas.
- → **No nosso pipeline:** o som (locução + ambiência) é o **referente de sincronia** do
  movimento — o único movimento motivado deve bater num evento que se **ouve**. Conecta direto com
  a locução do brief de alma.

## 7. Grade (DaVinci) — receita, nunca "cinematic"

- **Look:** filmic nostálgico **com** contraste.
- **Teal nas sombras + push nos tons quentes** → contraste cor quente/fria.
- **Pipeline de cor:** Color Space Transform → trabalhar em **DaVinci Wide Gamut** → converter pra
  **Rec.709 por último** (mais dynamic range, menos clipping; todos os grades acontecem embaixo).
- **Power windows / depth map** pra guiar o olho: escurecer o FG, isolar a água e puxar pro azul.
- **Acabamento:** halation + glow + **grain**.
- → **Mapeamento editor-video (Wave K):** a nossa pós obrigatória (grade quente/fria + grain) é
  exatamente isto. Este é o **preset de referência**: shadows teal, highlights warm, halation
  sutil, grain baixo.

## 8. Pré-produção orientada por luz

- **Scout:** Google Maps + Street View, pinar estradas/locais promissores.
- **Sol:** **Sunseeker** (in loco, caminho do sol hora a hora) e **Sun Position** (scout remoto,
  direção do sol) → planejar tudo pela melhor luz.
- **Moodboard + shot list por sentimento** (referências visuais agrupadas por locação).

---

## 9. Destilação — as leis acionáveis no gerador

Estas viram regra de prompt / parâmetro de gate:

1. **Luz = fonte + direção nomeadas, backlit por padrão.** (still + motion prompt)
2. **Profundidade em camadas; filmar através de algo.** (still / composição)
3. **Textura vintage nomeada, não "sharp/8K".** (still)
4. **Um movimento por clipe; still é o padrão, movimento é exceção motivada.** (motion prompt + gate de render)
5. **Som é o referente de sincronia — o movimento bate no que se ouve.** (locução + edição)
6. **Grade = receita (teal/warm + halation + grain), nunca "cinematic".** (Wave K)
7. **Frase positiva e fato visual concreto** em tudo — descrever o que existe, não o que evitar.

> **Próximas referências** entram nesta pasta (`references/tecnica-cinema/`) com o mesmo formato:
> técnica destilada + mapeamento pro pipeline. A REF-01 é o molde.
