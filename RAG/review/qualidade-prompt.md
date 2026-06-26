# Checklist de qualidade de prompt

Use antes de chamar `gera-imagem`.

Gate mecanico: salve a shot-list em `<PROJ>/output/shotlist-preflight.json` e rode
`node scripts/lib/dp-quality.cjs shotlist <PROJ>/output/shotlist-preflight.json` antes de
`node scripts/lib/critique.cjs <PROJ>/output/shotlist-preflight.json`. O `dp-quality.cjs`
bloqueia shot-list sem cinematografia verificavel: luz motivada, composicao 9:16 com safe-zone
central (Y=220-1440 / middle 60%), um movimento de camera por shot, cor/grading e anti-IA
concreto. O `critique.cjs` aplica proxies da `RAG/review/rubrica-nivel-100.md` (16 criterios,
anti-IA C8-C11) antes de gastar credito.

## Prompt bom

- abre com medium/estilo;
- descreve enquadramento e angulo;
- inclui o anchor textual quando o personagem aparece;
- descreve acao, cenario, luz e paleta;
- nomeia fonte/direcao de luz, textura/materialidade, composicao 9:16 e peso fisico quando a
  cena for geracao;
- preserva o bloco `cinematografia` no prompt: safe-zone central, luz motivada, camera unica e
  grading nomeado;
- termina com `vertical 9:16 frame`;
- usa paths de referencia relativos ao repo;
- nao pede texto, logo ou UI dentro da imagem, exceto quando a cena explicitamente for sobre
  uma interface.

## Alertas

- prompt muito curto ou generico;
- quality-words vazias: `8K`, `ultra-realistic`, `photoreal`, `masterpiece`, `best quality`,
  `cinematic` como atalho e `supersaturated`;
- anchor reescrito fora da ordem canonica;
- cena vaga sem acao visual;
- CTA sem espaco limpo para legenda;
- termos contraditorios, como "close-up full body".

Se houver alerta, ajuste a shot-list antes de gerar. Nao queime credito para descobrir um
problema que ja esta visivel no texto.
