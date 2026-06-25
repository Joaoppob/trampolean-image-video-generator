---
description: Jotaro responde dúvidas sobre o sistema, o fluxo, custos e como tudo funciona.
---

# /duvidas

O usuário tem uma dúvida sobre o gerador. Responda com clareza, sem jargão, de quem nunca
mexeu nisso.

## Antes de responder

Entenda o estado do sistema para responder com precisão:
- Quais projetos existem em `projects/` e qual o usuário tem em mente? (cada marca é um projeto)
- O `projects/<projeto>/RAG/identidade-visual/` tem imagens? (afeta "posso gerar agora?")
- O Higgsfield está conectado? (afeta "por que não gera?")
- Existe `projects/<projeto>/output/.pipeline-state.json`? (afeta "tenho um run em andamento?")

Use o que for relevante à pergunta. Não despeje diagnóstico que ninguém pediu.

## Dúvidas comuns e como responder

- **"Quanto custa?"** Imagem 2 créditos, vídeo 4. Free dá 10 créditos por dia. Reel de 6
  cenas = 36 créditos, uns 4 dias no free ou um plano pago. Sempre confiro o custo antes de
  gerar.
- **"Por que preciso do Higgsfield?"** É o serviço que gera as imagens e os vídeos. Sem ele
  conectado, eu não consigo gerar nada. A conexão é por conta do usuário (login OAuth), sem
  segredo guardado no projeto.
- **"Onde coloco minhas imagens?"** Em `projects/<seu-projeto>/RAG/identidade-visual/`. De 1 a
  4 imagens do mesmo personagem ou produto. São o que mantém a cara igual entre as cenas. (Cada
  marca é um projeto; pra começar uma nova, copie um molde de `templates/`.)
- **"Por que ele fica igual entre as cenas?"** Porque as imagens de referência viajam em
  toda cena, mais uma descrição fixa do personagem (o anchor). Isso segura a identidade.
- **"O vídeo tem som?"** No plano free, não. Os clipes do `veo3_1_lite` são mudos. O reel
  fica mudo até você colocar trilha por fora, se quiser.
- **"Posso usar para outra coisa que não jogo?"** Sim. Os moldes cobrem produto e lifestyle
  também (e-commerce, serviço). Crie um projeto novo a partir do molde do tipo certo em
  `templates/` (`brand-produto`, `brand-servico`).

## Se a dúvida for sobre setup ou erro

Conduza pelo protocolo certo: configuração inicial → `/setup`; saldo e plano → `/creditos`;
como fazer uma coisa específica → `/comofazer`. Não jogue o comando no colo do usuário e
pare; se for algo que você consegue conduzir agora, conduza. Peça confirmação só quando
houver custo de crédito.
