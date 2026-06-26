# Padrões de prompt: o HUB

> Leitor primário: o agente `prompt-smith`. Este arquivo é o conhecimento técnico de como se
> escreve um prompt de imagem que rende consistência. É genérico: serve para qualquer marca.
> O delta de cada marca (o SPOKE) vem do `rag`, lendo `RAG/marca.md` e `identidade-visual/`.
>
> Modelo de uso: **prompt final = molde do HUB + anchor do SPOKE + intenção da cena.**
> O `prompt-smith` escolhe o molde pela função narrativa, injeta o anchor da marca no slot
> `{ANCHOR}`, e fecha com o estilo e a paleta da marca.

---

## 1. Anatomia de um bom prompt (Nano Banana Pro / Gemini Image)

Estes modelos respondem melhor a prosa descritiva estruturada do que a listas de palavras
soltas. A ordem de leitura abaixo é o que rende consistência (provado no reel do mago, 6/6
no gate). Monte o prompt nesta ordem:

**Atualizacao nivel-100:** prompt e restricao, nao pedido. A rubrica
`RAG/review/rubrica-nivel-100.md` e o gate `scripts/lib/critique.cjs` penalizam quality-words
que costumam puxar look plastico/generico: `8K`, `ultra-realistic`, `photoreal`,
`masterpiece`, `best quality`, `cinematic` usado como adjetivo vazio e `supersaturated`.
Troque esses atalhos por fatos observaveis: fonte de luz, direcao, textura, paleta, composicao,
peso fisico, refs/anchor e movimento de camera motivado.

| # | Slot | O que entra | Exemplo (mago) |
|---|------|-------------|----------------|
| 1 | Estilo / medium | abre definindo o mundo visual | `Mobile game cartoon style` |
| 2 | Enquadramento + ângulo | tipo de plano e câmera | `Wide low-angle establishing shot` |
| 3 | Sujeito (anchor) | quem ou o quê, descrição travada | `Same wizard character from the 3 reference images...` |
| 4 | Ação / pose | o que está acontecendo | `Staff raised high above head with both hands` |
| 5 | Cenário / fundo | onde, profundidade | `Dark forest background, distant stone castle tower` |
| 6 | Iluminação | luz, hora, clima | `golden hour lighting` |
| 7 | Paleta / render | cor e tratamento | `saturated colors, bold outlines, soft shadows` |
| 8 | Aspect ratio | formato | `vertical 9:16 frame` |
| 9 | Espaço limpo | onde vai a legenda, sem UI | `empty space at top and bottom for later text overlay` |

### Regras de ouro

- **Sem quality-words vazias.** Nao escreva "cinematic" esperando que o modelo entenda
  cinematografia. Escreva a cinematografia: `warm side key from frame left`, `cool violet
  shadow`, `grounded boots`, `fabric texture`, `central safe 9:16 composition`.
- **Aspect ratio em dois lugares.** Escreva `vertical 9:16 frame` no texto do prompt E passe
  `aspect_ratio: '9:16'` no parâmetro da geração. A redundância é rede de segurança.
- **Espaço para texto é instrução positiva.** Esses modelos não têm "negative prompt" forte.
  Para deixar espaço para legenda, escreva afirmando: `clean composition with empty space at
  top and bottom for later text overlay; no text, no logo, no UI elements`.
- **Câmera por tipo de plano, não por lente.** Use `establishing shot`, `three-quarter view`,
  `low-angle`, `close-up`, `hero shot`, `over-the-shoulder`. Termos de lente (35mm etc.) esses
  modelos cartoon respeitam pouco.
- **Repetir os traços distintivos do anchor em cada cena é feature, não bug.** Em cada cena de
  personagem/sujeito **completo**, os traços-núcleo do anchor reaparecem — é isso que segura a
  identidade entre frames independentes. Não é preciso repetir o anchor verbatim: abreviar
  mantendo os traços distintivos funciona (provado 6/6 no reel do mago, onde cada cena usa um
  recorte do anchor, não o bloco inteiro). Em cena **parcial** (de costas, recorte) repita só
  os traços do que aparece; em cena onde o personagem está **ausente**, o anchor não entra.

---

## 2. O anchor de personagem (consistência entre cenas)

O anchor é um bloco fixo de texto mais as imagens de referência que viajam em todo prompt da
série. É o que mantém o personagem reconhecível de cena em cena.

**Componente A, imagens de referência (o mais forte).** Passe de 1 a 4 imagens da pasta
`identidade-visual/`. No teste do mago, 3 referências deram 6/6 de consistência sem precisar
de recurso pago. É a alavanca principal.

**Componente B, anchor textual (reforço).** A frase que abre a descrição do sujeito e enumera
os traços invariantes. Molde:

```
Same {ARQUÉTIPO} character from the {N} reference images: {SILHUETA/CORPO},
{TRAÇO FACIAL/CABELO marcante}, {PEÇA DE ROUPA #1 + cor + detalhe distintivo},
{PEÇA DE ROUPA #2 + cor + acabamento}, {ACESSÓRIO/ARMA + material + detalhe}.
{ESTILO/MEDIUM}, {PALETA}, vertical 9:16 frame.
```

### Princípios do anchor

1. **Enumere traços distintivos, não genéricos.** "Fivela dourada quadrada", "debrum
   verde-limão", "cristal roxo na garra de madeira" são os pontos que o modelo confere frame a
   frame. "Manto roxo" sozinho derrapa.
2. **Ordem fixa.** Os traços aparecem sempre na mesma ordem entre cenas. Não reordene.
3. **Ancore na referência por texto também.** Abrir com `Same X character from the N reference
   images` amarra o texto às imagens.
4. **Em cena de costas ou parcial, liste só o que aparece.** Pedir o rosto numa cena de costas
   confunde o modelo. Liste chapéu, ombros do manto, o que estiver visível.

---

## 3. O HUB: 8 moldes de cena reutilizáveis

Cada molde é um padrão de enquadramento e intenção. O `{ANCHOR}` recebe a identidade da marca.
Todos fecham com `{ESTILO+PALETA da marca}, vertical 9:16`. Os moldes 1 a 6 montam o arco
clássico de um reel; 7 e 8 servem marcas que não são jogos (e-commerce, serviço, lifestyle).

### 1. Establishing wide: abre a cena, mostra o mundo ou o problema
Use no primeiro segundo, para criar contexto e tensão antes do herói entrar.
```
Wide low-angle establishing shot of {CENÁRIO} {CLIMA/HORA}. {ELEMENTO DE CONTEXTO ou AMEAÇA}.
{fundo}. {ESTILO+PALETA}, vertical 9:16.
```

### 2. Hero shot: apresenta o personagem em pose forte
Use para o personagem entrar e o público reconhecer o herói.
```
Three-quarter front view, dynamic hero pose. {ANCHOR}. {fundo}, {iluminação}.
{ESTILO+PALETA}, vertical 9:16.
```

### 3. Close de ação ou carga: buildup, detalhe, expectativa
Use para construir expectativa antes do clímax (a magia carregando, o motor ligando).
```
Close-up three-quarter shot. {ANCHOR}. {AÇÃO INTENSA + efeito de partícula ou luz}.
{backlight dramatico com direcao e cor nomeadas}. {ESTILO+PALETA}, vertical 9:16, highlights controlados.
```

### 4. Over-the-shoulder / confronto: POV, personagem contra o obstáculo
Use para criar tensão de confronto, o personagem de costas encarando a ameaça.
```
Low-angle dramatic shot. {ANCHOR parcial, de costas em primeiro plano}. Facing camera:
{ANTAGONISTAS ou OBSTÁCULO}. {atmosfera}. {ESTILO+PALETA}, vertical 9:16.
```

### 5. Payoff / impacto: o clímax, a entrega de valor
Use no auge: o feitiço explode, o produto resolve, a ação acontece.
```
Wide action shot. {ANCHOR} mid-action, {EFEITO PRINCIPAL erupting/expanding}.
{resultado visível na cena}, motion blur. {ESTILO+PALETA}, vertical 9:16, cor intensa com highlights controlados.
```

### 6. CTA limpo: frame final com espaço para a chamada
Use no fecho, deixando espaço limpo para a legenda ou o logo entrarem depois no editor.
```
Victorious final hero pose, hero shot. {ANCHOR} full body facing camera. {fundo resolvido},
{luz quente}. IMPORTANT: no text overlay, no logo, no UI, clean composition with empty space
at top and bottom for later text overlay. {ESTILO+PALETA}, vertical 9:16.
```

### 7. Detalhe de produto: foco num item (fora de jogos)
Use quando o herói é um objeto: o produto, a embalagem, a peça.
```
Centered product shot, shallow depth of field. {OBJETO + material + acabamento},
{ANCHOR de marca: paleta e iluminação}. {fundo limpo}. {ESTILO+PALETA}, vertical 9:16.
```

### 8. Lifestyle / contexto de uso: personagem ou produto em situação real
Use para mostrar o produto sendo usado, a vida em volta da marca.
```
Medium shot, natural candid framing. {ANCHOR} {AÇÃO COTIDIANA} in {AMBIENTE realista}.
{luz natural}. {ESTILO+PALETA}, vertical 9:16.
```

---

## 4. Como o SPOKE injeta a identidade num molde

Fluxo dentro do `prompt-smith`. O `rag` entrega, o `prompt-smith` monta. Nenhum dos dois
spawna subagente.

```
1. rag lê projects/<projeto>/RAG/ (identidade-visual/ + marca.md + narrativa.md)
   → devolve o SPOKE = { anchor_textual, paleta, estilo, refs[] }
2. prompt-smith escolhe o molde do HUB pela intenção da cena
   (gancho → 1, apresentação → 2, carga → 3, confronto → 4, clímax → 5, fechamento → 6)
3. Substitui os slots:
   {ANCHOR}        ← anchor textual da marca
   {ESTILO+PALETA} ← estilo + paleta da marca
   {CENÁRIO}, {AÇÃO}, {OBSTÁCULO} ← intenção da cena (vinda do pedido do usuário)
4. Anexa as imagens de referência como medias na chamada de geração
5. Devolve a shot-list no formato do exemplo (1 objeto por cena)
```

**Contrato de saída** = o mesmo schema do `exemplo-shotlist-mago.json`:
`{ campanha, cliente, formato, modelo, referencias_obrigatorias[], anchor_personagem,
cenas[ {n, tag, tempo_seg, intencao, prompt, salvar_em} ], gate_consistencia }`.
O contrato formal fica em `schemas/shotlist.schema.json`.

No free tier, cada clipe `veo3_1_lite` tem 4 segundos. Use janelas como `0-4`, `4-8`,
`8-12` e deixe `duracao_total_seg` igual ao fim da ultima cena.

**Paths de referência sempre relativos ao projeto ativo** (`RAG/identidade-visual/mage1.png`),
nunca `../../../mage1.png`. A skill de geração resolve contra `projects/<projeto>/`. É o
formato canônico do produto.
