# REF-05 — Luz e cor de spot premium (fonte motivada + consistência + previs)

> Biblioteca de referências técnicas do gerador. **Conteúdo descartado; só o método.**
> Foco: **luz e cor** de comercial premium. Alimenta o `prompt-smith` (still), o `editor-video`
> (Wave K, grade) e o `style-consistency`.

**Fonte (breakdown com DP):** Oren Soffer — Mercedes-AMG "New Light".
- https://site.frameset.app/post/behind-the-spot-ep-003-commercial-breakdown-with-dp-oren-soffer
**Perfil:** spot premium, look elevado/estilizado, com previs e mistura cuidadosa de luz prática
+ pós. (Contraponto à REF-01: lá luz natural crua; aqui luz desenhada e controlada.)

---

## 1. Previs trava o frame antes de filmar

- O time fez um **mockup CG completo** dos planos-chave **antes** de filmar → lente e ângulo
  exatos definidos com antecedência; no set, só captura os elementos live-action.
- → **No nosso pipeline:** o **still É o previs** — o frame já está travado (lente/ângulo/luz). O
  prompt de movimento serve esse frame, não o redesenha.

## 2. Luz = uma fonte motivada, recriada com consistência

- O brilho-chave (luar) foi feito com **um recorte circular em foam core, backlit** — **uma fonte
  motivada**, concreta, não "efeito de luar" genérico.
- Nos interiores, **recriou a condição de luz do exterior** (em vez de inventar um efeito) →
  **consistência** entre cenas (day-for-night coeso).
- → **No prompt/gate:** nomear **uma** fonte de luz motivada e **manter o mesmo bloco de luz** em
  todas as cenas (casa com REF-01 §2 e com o `style-consistency`).

## 3. Cor/grade: estilizar protegendo a informação

- Look **deliberadamente elevado/estilizado** (não "natural"), mas o grade **preserva detalhe em
  sombras e altas** — proteger dynamic range, não estourar/clipar.
- → **Wave K:** grade como receita (contraste cor quente/fria), preservando sombra/alta; nunca
  "cinematic" vago.

## 4. Capturar o essencial; o resto é pós

- Na locação (estrada em Malibu), captura-se **o essencial** (carro, estrada); o entorno é
  **substituído/realçado no pós**. Cenas inteiras (girassóis, painel RPM) foram CG.
- → **No nosso caso:** o **still carrega o essencial**; o `editor-video` (grade + grain + recrop)
  faz o acabamento. Não tentar resolver tudo "in-camera" no prompt.

## 5. Mapeamento pro pipeline

- **`prompt-smith` (still):** uma fonte de luz motivada nomeada; look estilizado declarado em
  fatos (não "cinematic"); o still é o frame travado.
- **`style-consistency`:** mesmo bloco de luz/film-stock/grade entre cenas.
- **`editor-video` (Wave K):** grade quente/fria preservando sombra/alta + grain.

## 6. Destilação — leis acionáveis

1. **O still é o previs: frame (lente/ângulo/luz) travado antes do movimento.**
2. **Uma fonte de luz motivada, concreta, mantida consistente entre cenas.**
3. **Estilizar protegendo sombra/alta (dynamic range); grade é receita, não "cinematic".**
4. **O still carrega o essencial; o acabamento é pós (grade/grain).**
