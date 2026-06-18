# Narrativa: Trace Defense

> História e elenco do exemplo embarcado. O agente `rag` lê este arquivo para entender o
> mundo, as fases e os inimigos. O `prompt-smith` usa isso para preencher os slots de cena
> dos templates (cenário, ação, antagonistas).
>
> Para a sua marca, troque por sua própria história. Mantenha os títulos de seção.

## A história

Uma vila medieval cercada por floresta vive em paz até as hordas de monstros começarem a
avançar. O mago é o último defensor. Ele sobe ao caminho da vila, ergue o cajado e enfrenta
os inimigos com magia. Cada onda derrotada é uma fase vencida. A vila salva é a recompensa.

O arco visual de um reel segue essa curva:

1. **Gancho**: a vila sob ataque, a ameaça avançando. Tensão imediata, sem o mago ainda.
2. **Aparição**: o mago entra em pose heroica. O público reconhece o herói.
3. **Tensão/confronto**: os inimigos avançam, o mago aparece em desvantagem aparente.
4. **Carga**: o mago ergue o cajado, a magia carrega, o cristal brilha. Expectativa.
5. **Impacto**: o feitiço explode e varre os inimigos. O payoff, a entrega de valor.
6. **CTA**: pose vitoriosa, vila salva, espaço limpo para a chamada "BAIXE AGORA".

## Cenário

- Vila medieval cartoon, casas de pedra e madeira
- Torre de castelo de pedra ao fundo
- Caminho de floresta, chão de campo de batalha, poeira no ar
- Hora dourada no gancho e na vitória; luz roxo-magenta dramática no clímax da magia

## Inimigos

Os quatro monstros do jogo. Aparecem nas cenas de ameaça, tensão e impacto:

- **Slime azul**: gelatinoso, lento, em massa
- **Goblin verde**: pequeno, com armadura e chifres, agressivo
- **Dragão vermelho**: pequeno, voa baixo, avança em direção à câmera
- **Worm rosa**: verme dentado, rosa, rasteja

## Magia do mago

Vórtice roxo-magenta que erupciona das mãos e do cajado, com partículas douradas brilhando
e raios de energia magenta. É o efeito visual de clímax: ilumina a cena de roxo, joga os
inimigos para trás com motion blur, entrega a sensação de poder.

## Como o `prompt-smith` usa esta narrativa

A curva de 6 cenas mapeia direto nos templates do HUB (`prompts/padroes-de-prompt.md`):
gancho → template 1, aparição → template 2, tensão/confronto → template 4, carga → template 3,
impacto → template 5, CTA → template 6. Os inimigos e o cenário preenchem os slots de
ação e fundo. O efeito de magia é o "efeito principal" do template de payoff.

## Decisão de arco: 6 cenas é template, não mandato

**O arco de 6 cenas acima é um modelo recomendado para reel de personagem/história, não uma
regra fixa.** O que é invariante é a **função dramática** — gancho → construção → payoff →
CTA — não a contagem de cenas. O schema (`schemas/shotlist.schema.json`) reflete essa
decisão: `cenas` tem `minItems: 1` e **sem** `maxItems`. O número de cenas é livre.

A decisão é consciente, contra a homogeneização: se todo reel fosse forçado nas mesmas 6
batidas do mago, toda marca sairia com a mesma cara. Os exemplos embarcados já provam a
variação — `exemplo-shotlist-produto.json` e `exemplo-shotlist-servico.json` usam **4 cenas**
(hook → hero → detalhe → CTA), não 6. O arco de 6 é a forma cheia da história de personagem;
marcas de produto/serviço condensam.

**Orientação ao `prompt-smith`:** escolha a contagem de cenas pela história e pelo orçamento
de crédito do usuário (cada cena = 6 créditos), não por um molde fixo. Reels curtos de 3–4
cenas são legítimos; o arco de 6 é o teto narrativo, não o piso. Preserve sempre a função
dramática (abrir com gancho, fechar com CTA limpo); varie o miolo conforme a marca.
