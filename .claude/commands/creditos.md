---
description: Confere saldo e plano no Higgsfield (via CLI). Não gasta crédito.
---

# /creditos

Confira o estado do crédito no Higgsfield sem gastar nada. O usuário quer saber quanto tem e
o que dá para fazer com isso.

## Antes

Confirme que o Higgsfield CLI está autenticado. Rode `higgsfield account status` — se vier
"Not authenticated", aponte para o `/setup` (Passo 1: `higgsfield auth login`) antes de tentar.
Você mesmo pode disparar o login, sem reiniciar o Claude Code.

## O que fazer

Leia o saldo direto pelo CLI, sem chamar geração:

```bash
higgsfield account status
```

Retorna **email, plano e créditos**. Para o histórico de gasto recente na conta:

```bash
higgsfield account transactions --size 20
```

Isso é diferente do cálculo de um run, que precisa do número de cenas para estimar o custo.
`/creditos` só consulta saldo/plano da conta.

## Confira a conta certa

O `account status` mostra o **email** da conta conectada. Confirme com o usuário que é a conta
que ele quer usar (a dos créditos). Se trocou de conta no Higgsfield e o saldo não bate, é só
`higgsfield auth login` na conta nova — eu reconecto e confiro o novo saldo na hora, sem
reiniciar nada.

## Como apresentar

Diga, em linguagem simples:

- O saldo atual e o plano (e o email da conta, pra não haver dúvida de qual conta é).
- A regra do free: **10 créditos por dia**, pool compartilhado entre imagem e vídeo.
- A tabela de custo:
  - Imagem = 2 créditos
  - Vídeo (clipe de 4s, `--duration 4`) = 4 créditos
  - Reel completo de 6 cenas = 36 créditos (6 × 2 + 6 × 4) = uns 4 dias no free, ou um plano
    pago para sair de uma vez.
- Quantas cenas dá para fazer hoje com o que ele tem.

## Gasto já registrado (ledger por projeto)

O Higgsfield diz o saldo da conta; o **ledger** diz o que *um projeto* já gastou. O gasto é
por projeto, então pergunte de qual o usuário quer ver (ou liste `projects/` e some os que
interessam). Para o projeto `<PROJ>` (não custa nada, é leitura):

```bash
node scripts/lib/ledger.cjs summary --root <PROJ>
```

Devolve `total_creditos`, `por_dia`, `por_tipo` e `alertas` (dias que passaram do teto free).
Use pra responder "quanto já gastei no projeto X?" e cruzar com o saldo do Higgsfield. Se o
arquivo não existir ainda (`n_entries: 0`), é só porque nenhum run gastou crédito nesse projeto.

## Custo honesto

Se o usuário quer um reel de 6 cenas e está no free, seja claro: não cabe num dia só (36 > 10).
As opções são esperar a renovação diária e fazer aos poucos, ou assinar um plano pago. Não
empurre o plano pago; apenas mostre a conta com clareza e deixe a escolha com ele.

Planos pagos mudam com o tempo; se o usuário quiser comparar, aponte para a página atual do
Higgsfield em vez de prometer preços fixos.
