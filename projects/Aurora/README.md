# Aurora — demo multi-personagem (scaffold)

Projeto **demo rodável** do caminho **asset-first / biblioteca** com mais de um
personagem. Existe para exercitar (e garantir, via `verify.cjs`) o que um projeto de
marca com elenco recorrente precisa: biblioteca por personagem + dossiê de persona +
seleção de asset por cena.

## Estrutura

```
Aurora/
├── project.json                         (modo_visual: biblioteca)
├── RAG/
│   ├── identidade-visual/
│   │   ├── nova/  nova_01.png nova_02.png   (refs da Nova)
│   │   ├── kai/   kai_01.png  kai_02.png    (refs do Kai)
│   │   └── lumi/  lumi_01.png lumi_02.png   (refs da Lumi)
│   ├── personas/
│   │   ├── nova.md  kai.md  lumi.md         (dossiê de persona por personagem)
│   │   └── ...
│   └── prompts/
│       └── shotlist-trio-biblioteca.json   (reel do trio por seleção, passa os 10 gates)
└── output/
```

## As refs são placeholders

Os `*.png` em `identidade-visual/<personagem>/` são **quadrados coloridos** (1 frame
sólido), só para o scaffold ser autocontido e os gates rodarem. **Para usar de verdade,
solte os assets reais da marca** dentro de `RAG/identidade-visual/<personagem>/` (mantendo
a subpasta por personagem) e atualize os dossiês em `RAG/personas/`. A consistência de
personagem vem da própria biblioteca (seleção), e a fidelidade de **personalidade** é
cobrada pelo gate `persona-carry.cjs` quando há cenas de geração.

## Persona como dado (não só prosa)

Cada personagem tem um dossiê em `RAG/personas/<personagem>.md` com personalidade, mundo,
voz e **cues distintivos**. A shot-list carrega esses cues no bloco `personas`; em cenas
de geração, o `persona-carry.cjs` exige que cada cena do personagem reforce ≥2 cues da
persona no prompt/intenção — é o que torna "personalidade fiel" verificável, não confiança.
