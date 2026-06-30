# Biblioteca de referências técnicas — `tecnica-cinema/`

Cada card destila o **método** de uma peça profissional **real (humana, não-IA)** em craft
reutilizável, mapeado para o pipeline do gerador. **Regra da biblioteca: técnica, não conteúdo** —
a história/marca da peça-fonte é descartada de propósito; fica só o que dá pra reaplicar.

Cada card alimenta um ou mais estágios:
- **`prompt-smith`** → o still (prompt de imagem)
- **`soul-strategist`** → verdade emocional, placement, estratégia de render
- **`story-writer`** → arco narrativo
- **`motion-prompt-smith`** → o prompt de movimento (Veo 3.1 image-to-video) *(em construção)*
- **`editor-video` (Wave K)** → grade, grain, pós
- **gates anti-IA (C8–C11 / `critique` / Wave L)**

## Índice

| Card | Foco | Fonte (verificada) |
|------|------|--------------------|
| **REF-01** | Montagem mood-driven + **luz natural** (backlight, profundidade, grade filmic) | Jacob Nordin "Between Places" + breakdown (191k) |
| **REF-02** | **Estrutura narrativa emocional** (produto como facilitador, arco em 5 tempos) | O Boticário "Natal" (259k); Thai Life como exemplar |
| **REF-03** | **Anatomia do uncanny** + câmera como gramática (craft controlado in-camera) | Oscar Hudson — Coinbase, breakdown (Cannes Film Craft GP) |
| **REF-04** | **Técnica de vertical 9:16** (composição, ritmo na voz, modularidade) | Apple "Vertical Cinema"/Chazelle + fontes de craft vertical |
| **REF-05** | **Luz e cor de spot premium** (fonte motivada, consistência, previs, grade) | Oren Soffer — Mercedes-AMG "New Light" (breakdown DP) |
| **REF-06** | **Movimento de câmera com sentido** (o move faz trabalho narrativo) | Spielberg oner / "The Studio" / Ed Sheeran one-shot |

## As leis que se repetem (a espinha do conhecimento)

Quando uma lei aparece em ≥2 cards, ela é forte o bastante pra virar **regra de prompt ou gate**:

1. **Luz = fonte + direção, nomeada pela função** (backlight por padrão). — REF-01, REF-03
2. **Um movimento de câmera motivado por clipe; still é o padrão, movimento é exceção.** — REF-01, REF-03, REF-04, REF-06
   - O move **faz trabalho narrativo**: push-in = engajar/virada · follow = acompanhar/revelar ·
     rack/pan = redirecionar · tilt = disclosar · locked-off = contenção. Motivado pelo sujeito,
     sincronizado à voz. — REF-06
3. **Coerência física (proporção/escala/cor/peso) = anti-IA.** O tell de fake é a offness sutil. — REF-03
4. **Câmera é gramática: codifica o registro emocional (frio/contido vs quente/íntimo).** — REF-03, REF-04
5. **Profundidade em camadas; filmar através de algo.** — REF-01, REF-03
6. **Som é o referente de sincronia — o movimento bate no que se ouve.** — REF-01 (+ alma/locução)
7. **Grade = receita (teal/warm + halation + grain), nunca "cinematic".** — REF-01
8. **Narrativa: ordinário → mistério → revelação → virada → tag; produto como facilitador no fim.** — REF-02
9. **Vertical nativo; intimidade no meio 60%; tilt > pan; ritmo na voz.** — REF-04
10. **Frase positiva e fato visual concreto; imperfeição com peso = humanidade.** — todos
11. **O still é o previs: frame (lente/ângulo/luz) travado antes do movimento; o move serve o frame.** — REF-05, REF-06
12. **Uma fonte de luz motivada, concreta, mantida consistente entre cenas.** — REF-01, REF-03, REF-05

> Próximas REFs entram aqui no mesmo formato. Quando a biblioteca cobrir bem os eixos
> (luz, movimento, grade, estrutura, formato), ela vira a base de conhecimento do
> `motion-prompt-smith` e dos gates.
