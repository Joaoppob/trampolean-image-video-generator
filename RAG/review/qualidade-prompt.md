# Checklist de qualidade de prompt

Use antes de chamar `gera-imagem`.

## Prompt bom

- abre com medium/estilo;
- descreve enquadramento e angulo;
- inclui o anchor textual quando o personagem aparece;
- descreve acao, cenario, luz e paleta;
- termina com `vertical 9:16 frame`;
- usa paths de referencia relativos ao repo;
- nao pede texto, logo ou UI dentro da imagem, exceto quando a cena explicitamente for sobre
  uma interface.

## Alertas

- prompt muito curto ou generico;
- anchor reescrito fora da ordem canonica;
- cena vaga sem acao visual;
- CTA sem espaco limpo para legenda;
- termos contraditorios, como "close-up full body".

Se houver alerta, ajuste a shot-list antes de gerar. Nao queime credito para descobrir um
problema que ja esta visivel no texto.
