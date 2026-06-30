# REF-06 — Movimento de câmera com sentido (o move faz trabalho narrativo)

> Biblioteca de referências técnicas do gerador. **Conteúdo descartado; só o método.**
> Foco: **movimento de câmera** — quando mover, por quê, e o que o move *faz*. É o complemento da
> REF-03 (lá câmera = registro; aqui câmera = ação narrativa). Alimenta o `motion-prompt-smith`.

**Fontes:**
- Spielberg oner (StudioBinder) — https://www.youtube.com/watch?v=xeKIsQV8x40
- "The Studio" — anatomia de um oner (Shot Zero) — https://shotzero.substack.com/p/anatomy-of-a-scene-the-studio
- Planejar o oner (Previs Pro) — https://wiki.previspro.com/shots/the-oner
- Ed Sheeran one-shot / motion control (Expressway) — https://blog.expresswaycine.com/motion-control-ed-sheeran-one-shot/

---

## 1. Princípio-mãe: movimento é significado, não enfeite

Um bom movimento **faz um trabalho** na história. Se não faz, é still. (Spielberg pega uma cena de
diálogo e move a câmera **pra engajar o público no que o personagem diz** — não pra mostrar.)

## 2. Vocabulário do que cada move FAZ (escolha pelo trabalho)

- **Push-in (dolly/zoom lento):** intensifica, **engaja, "prende"** o sujeito (Spielberg "empurra
  pra prender o Alan no Jeep"). É o move da **virada/decisão interna**.
- **Follow / tracking:** acompanha e **revela** — porque não corta, a câmera leva tempo pra achar
  nova posição e **descobrir informação**.
- **Rack focus / pan motivado:** **redireciona a atenção** (de A pra B); o pan é "teed up" por um
  **olhar/ação** do sujeito — a câmera vira pra ver o que ele vê.
- **Tilt:** **disclosa** na vertical (revela de baixo pra cima ou vice-versa) — nativo do 9:16.
- **Locked-off:** quando o trabalho é **contenção/peso** (volta pra REF-03).

## 3. Blocking com câmera (sujeito e câmera em tandem)

- Atores e câmera se movem **juntos, um, ou nenhum** — esse fluxo cria momentum.
- Mesmo o plano "parado" precisa de **composição** — entrar num frame por movimento não dispensa o
  enquadramento.
- **O frame evolui constantemente** → mantém o plano vivo (o oposto do still morto da IA).

## 4. O move é motivado pelo sujeito

- O gatilho do movimento é uma **ação/olhar** do sujeito, não um capricho de câmera. A câmera
  responde ao que a pessoa faz. (E sincroniza com o que se **ouve** — ver REF-01 §6.)

## 5. Disciplina do oner / repetibilidade (continuidade)

- Take contínuo = **uma composição performada** que dura o plano inteiro; ensaio/previs caça
  colisão de path e sight-line antes do set.
- **Motion control / move repetível** quando é preciso casar/compor múltiplos passes (Ed Sheeran
  one-shot: robô pra estabilidade repetível enquanto handheld/drone fluem em volta).
- → **No nosso I2V:** o still já é uma "composição"; o **único movimento** precisa ser suave,
  repetível e contínuo (sem cortes dentro do clipe).

## 6. Mapeamento pro pipeline (a regra dura do nosso caso)

No nosso I2V (1 still → 1 clipe de 4s, **um** movimento):
- **O único move tem que FAZER um trabalho** do vocabulário §2 (engajar / acompanhar / revelar /
  redirecionar / disclosar), **motivado pelo sujeito** e **sincronizado à voz**.
- **Still é o default;** o move é exceção que carrega a virada (casa 1:1 com a `estrategia_render`
  do brief de alma e com o gate de motion-prompt).
- No prompt: nomear **um** move + **o que ele faz** + **o gatilho**. Ex.:
  `slow push-in as she exhales — intensify the moment of decision; single continuous shot, smooth`.

## 7. Destilação — leis acionáveis

1. **Movimento é significado: se não faz trabalho narrativo, é still.**
2. **Vocabulário por função:** push-in = engajar/virada · follow = acompanhar/revelar · rack/pan =
   redirecionar · tilt = disclosar · locked-off = contenção.
3. **O move é motivado pelo sujeito (olhar/ação) e sincronizado à voz.**
4. **Um move por clipe, suave e contínuo, sem corte interno.**
5. **Mesmo plano parado precisa de composição; o frame deve evoluir (anti-still-morto).**
