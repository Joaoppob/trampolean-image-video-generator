# Marca: Trace Defense

> Este arquivo é a identidade de marca do exemplo embarcado. O agente `rag` lê este
> arquivo junto com as imagens de `identidade-visual/` e devolve o anchor de identidade
> visual ao `prompt-smith`.
>
> Quando você for usar o gerador para a SUA marca, substitua o conteúdo abaixo pela sua.
> Mantenha os mesmos títulos de seção. O `rag` lê por seção.

## O que é

Trace Defense é um jogo mobile hipercasual de defesa de torre. O jogador comanda um mago
que protege uma vila medieval de hordas de monstros. Partidas curtas, controle simples,
progressão por fases. Estética cartoon saturada, leitura imediata na tela pequena.

## Público

Jogador casual de celular. Sessões de poucos minutos, entre uma tarefa e outra. Não quer
tutorial longo nem curva de aprendizado. Quer entrar, jogar, sentir progresso. A criação
visual (reels, anúncios) fala com esse público em vídeo vertical 9:16 para TikTok, Reels e
Shorts: gancho nos primeiros segundos, clímax visual no meio, chamada para baixar no fim.

## Personagem central: o mago

O mago é o rosto da marca. Aparece em todo criativo. A identidade dele é travada por três
imagens de referência em `identidade-visual/` (mage1.png, mage2.png, mage3.png) mais o
anchor textual abaixo. Os traços distintivos, não os genéricos, são o que segura a
consistência entre cenas:

- Mago idoso, baixo e atarracado
- Barba branca longa e fluida
- Chapéu pontudo roxo com fivela dourada quadrada na frente
- Manto roxo com debrum verde-limão (linhas paralelas amarelo-esverdeadas nas bordas)
- Cinto largo marrom com fivela dourada quadrada
- Botas marrons rústicas
- Cajado de madeira retorcido com cristal roxo brilhante preso numa garra de madeira

Anchor textual canônico (em inglês, como o modelo de imagem espera):

```
Same wizard character from the 3 reference images: short stout elderly mage, long flowing
white beard, purple pointed wizard hat with a square gold buckle on the front, purple robe
with lime-green trim (parallel yellow-green lines along edges), brown wide belt with square
gold buckle, brown rustic boots, wooden twisted staff topped with a glowing purple crystal
held in wooden claw. Hyper-casual mobile RPG cartoon style, saturated colors, bold outlines,
soft shadows, vertical 9:16 frame.
```

## Estilo visual

- Medium: estilo cartoon de jogo mobile, estética hiper-casual de RPG
- Cores: saturadas, contorno marcado, sombra suave
- Paleta do herói: roxo (manto, cristal), dourado (fivelas), verde-limão (debrum), marrom
  (cinto, botas)
- Formato: vertical 9:16 sempre, pensado para tela de celular

## Tom da comunicação

Direto e energético, sem texto longo. O vídeo mostra, não explica. A chamada final é curta
e imperativa ("BAIXE AGORA"). Nada de jargão. O apelo é a ação do mago e o impacto da magia,
não a descrição do jogo.

## Como o `prompt-smith` usa esta marca

O anchor textual entra fixo em toda cena que mostra o mago. A paleta e o estilo fecham todo
prompt. A ordem dos traços do anchor nunca muda entre cenas. Em cena de costas ou parcial,
lista só o que aparece (chapéu, ombros do manto), não o rosto.
