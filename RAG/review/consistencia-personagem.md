# Checklist de consistencia de personagem

Use depois de gerar imagens, antes de animar. O objetivo e decidir se vale gastar credito de
video ou se uma cena deve ser regerada.

## Gate rapido

Uma cena passa se preserva, de forma reconhecivel:

- silhueta geral do personagem ou produto;
- cores principais da marca;
- detalhes distintivos do anchor;
- acessorio, roupa, embalagem ou elemento visual que identifica a marca;
- estilo visual descrito em `RAG/marca.md`;
- formato vertical 9:16 sem corte ruim do sujeito principal.

## Decisao

- **6/6 ou 5/6 cenas boas:** seguir para video.
- **4/6 ou 3/6 cenas boas:** regerar apenas as cenas falhas, mantendo refs e anchor.
- **Menos de 3/6 cenas boas:** pausar; revisar `RAG/marca.md`, refs e prompt antes de gastar
  mais credito.

## Como responder ao usuario

Explique a decisao em linguagem simples: quais cenas passaram, quais falharam e o que sera
ajustado no prompt.
