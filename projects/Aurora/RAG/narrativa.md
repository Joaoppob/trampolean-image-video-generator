# Narrativa: Aurora

## A história
Um dia na vida do trio Aurora: três mundos, uma marca. O reel apresenta cada personagem
no seu próprio território — a energia da Nova, a calma do Kai, o calor da Lumi — e fecha
convidando o público a escolher o seu. Não há vilão; o conflito é de **mood**, o contraste
entre os três.

## Cenário
Cidade contemporânea em três recortes: a pista de skate na periferia (Nova), o ateliê
noturno (Kai), a cozinha solar de bairro (Lumi). Cada recorte tem sua luz e sua cor de acento.

## Arco do reel (trio)
- **Gancho (Nova):** abre na pista de skate — atitude, movimento, provocação no frame 1.
- **Desenvolvimento (Kai):** corta para o ateliê noturno — foco, silêncio, o avesso da Nova.
- **CTA (Lumi):** fecha na cozinha solar — calor, convite, espaço limpo para o call-to-action.

## Como o `prompt-smith` usa esta narrativa
Em modo biblioteca, cada cena seleciona o asset do personagem certo (consistência por
construção). Quando uma cena exige geração, o `prompt-smith` carrega os cues de persona do
personagem (do bloco `personas`) no prompt — o `persona-carry.cjs` cobra ≥2 cues por cena.
Corte seco entre mundos; cada corte é nova informação (personagem, mood e cor de acento novos).
