# Pasta RAG, a identidade da sua marca

Esta pasta é a memória de marca do gerador. É daqui que o Jotaro tira "quem é o personagem,
qual a cara da marca, que história contar". Sem isso, ele gera imagem genérica. Com isso, ele
gera a SUA imagem, consistente entre cenas.

Quanto melhor o que estiver aqui, melhor o resultado. Vale o tempo de preencher direito.

## O que vai em cada lugar

### `identidade-visual/`
As imagens de referência do seu personagem ou produto. **A alavanca mais forte de
consistência.** Coloque de 1 a 3 imagens do mesmo personagem em ângulos diferentes (frente,
lado, costas, ou só variações de pose). O modelo usa essas imagens para manter a mesma cara
em todas as cenas.

- Formato: PNG ou JPG.
- Quantidade: 1 funciona, 3 funciona melhor. Acima de 3 não ajuda muito.
- Dica: imagens limpas, fundo simples, personagem bem visível.

Vem com `mage1.png`, `mage2.png`, `mage3.png` (o mago do exemplo Trace Defense). Troque pelas
suas quando for usar de verdade.

### `marca.md`
Quem é a marca: o que é o produto, qual o público, qual o personagem central, qual a paleta
de cores, qual o tom. Editado em texto comum. O Jotaro lê isso para entender com o que está
lidando.

### `narrativa.md`
A história que os criativos contam: o mundo, as fases, os inimigos ou obstáculos, o arco de
um reel (gancho, clímax, fechamento). É o que dá enredo para as cenas.

### `prompts/`
A receita de como montar um bom prompt de imagem. Você normalmente não mexe aqui. É o
conhecimento técnico que o `prompt-smith` usa para transformar a sua marca em prompts que
funcionam:

- `padroes-de-prompt.md`: os 8 moldes de cena reutilizáveis (o HUB).
- `exemplos.md`: como ler e adaptar o exemplo pronto.
- `exemplo-shotlist-mago.json`: um reel inteiro de 6 cenas já montado, como referência.

## Como preencher para a sua marca

1. Apague as três imagens do mago em `identidade-visual/` e coloque as suas.
2. Reescreva `marca.md` com a sua marca (mantenha os títulos de seção).
3. Reescreva `narrativa.md` com a sua história (mantenha os títulos de seção).
4. Deixe `prompts/` como está. É genérico, serve para qualquer marca.

Pronto isso, é só conversar com o Jotaro: "gere um reel de 6 cenas para a minha marca".
