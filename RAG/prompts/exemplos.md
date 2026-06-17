# Exemplos: como ler e adaptar a shot-list pronta

> Leitor primário: o agente `prompt-smith` e quem quiser entender como um reel se monta.
> O exemplo vivo está em `exemplo-shotlist-mago.json`: um reel inteiro de 6 cenas do mago
> Trace Defense, já montado, que passou no gate de consistência (6/6).

## O que é a shot-list

Uma shot-list é o reel descrito cena a cena, antes de gerar. Cada cena tem o prompt de
imagem pronto, a intenção narrativa, o tempo e onde salvar. É o roteiro que o gerador segue.

O `prompt-smith` produz uma shot-list neste formato. As skills de geração leem a shot-list e
executam cena por cena.

## Como ler `exemplo-shotlist-mago.json`

Campos do topo:

- `campanha`, `cliente`: de quem é, qual campanha.
- `formato`: `vertical 9:16 mobile/TikTok`.
- `modelo`: o modelo de imagem usado.
- `referencias_obrigatorias`: as imagens de `identidade-visual/` que viajam em toda cena.
- `anchor_personagem`: o bloco de texto fixo que descreve o personagem. Repetido em cada
  cena. É o coração da consistência.

Cada item de `cenas` tem:

- `n`: número da cena.
- `tag`: a função (hook, aparicao, tensao, carga, impacto, cta-clean).
- `tempo_seg`: quando a cena entra no reel.
- `intencao`: o que a cena precisa transmitir.
- `prompt`: o texto que vai para o modelo de imagem.
- `salvar_em`: onde a imagem gerada é guardada.

E no fim, `gate_consistencia`, o critério de qualidade: o personagem precisa ser
reconhecidamente o mesmo (chapéu, barba, manto, cajado) em 5 ou 6 das 6 cenas.

## As 6 cenas do exemplo, e qual molde do HUB cada uma usa

| Cena | Tag | Função | Molde do HUB |
|------|-----|--------|--------------|
| 1 | hook | a vila sob ataque | 1 (establishing wide) |
| 2 | aparicao | o mago entra em pose heroica | 2 (hero shot) |
| 3 | tensao | inimigos avançando, mago de costas | 4 (over-the-shoulder) |
| 4 | carga | o mago ergue o cajado, magia carrega | 3 (close de carga) |
| 5 | impacto | o feitiço explode e varre os inimigos | 5 (payoff) |
| 6 | cta-clean | pose vitoriosa, espaço para a chamada | 6 (CTA limpo) |

## Como adaptar para a sua marca

1. Troque as imagens em `identidade-visual/` e o `anchor_personagem` pela sua identidade
   (o `rag` faz isso lendo `marca.md`).
2. Mantenha a curva das 6 cenas: gancho, apresentação, tensão, carga, clímax, fechamento.
   Funciona para quase qualquer produto.
3. Troque os slots de cena (cenário, ação, inimigos ou obstáculos) pela sua história.
4. O `prompt-smith` faz isso automaticamente quando você pede um reel. O exemplo serve de
   molde e de prova de que o formato funciona.

Se a sua marca não é um jogo, os moldes 7 (detalhe de produto) e 8 (lifestyle) do HUB cobrem
e-commerce, serviço e lifestyle. A curva muda, mas a lógica de anchor mais molde mais cena é
a mesma.
