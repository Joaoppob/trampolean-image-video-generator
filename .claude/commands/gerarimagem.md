---
description: Gera uma ou mais imagens a partir de uma cena, com a identidade da marca.
argument-hint: "[descrição da cena]"
---

# /gerarimagem

Gera imagens com a cara da marca. O protocolo abaixo é obrigatório, na ordem. Não pule a
escolha do projeto, o preflight nem a checagem da RAG: são invariantes do Jotaro.

## Passo 0: escolha o projeto (obrigatório)

Liste `projects/` (`ls projects/`), mostre os de `status: "ativo"` e pergunte pra qual gerar.
Chame de `<PROJ>` o root escolhido (ex.: `projects/TraceDefense`) — todos os comandos abaixo
usam esse `<PROJ>`. Marca nova: copie de `templates/` (ver "Projetos" no `CLAUDE.md`).

## Passo 1: entenda o estado

Antes de tudo, confira:
- Perfil de uso (estado global do usuário, não do projeto):
  ```bash
  node scripts/jotaro-profile.cjs status --root .
  ```
  Se `modo_expert: true`, mantenha a condução mais curta, sem pular custo, RAG e revisão.
- A cadência de revisão permite iniciar?
  ```bash
  node scripts/review-cadence.cjs status --root .
  ```
  Se `pode_iniciar_fluxo: false`, rode o protocolo de `/revisao` antes de gastar crédito.
  Se a revisão falhar, pare e corrija antes de gerar.
- O Higgsfield CLI está autenticado na conta certa? Cheque `higgsfield account status`. Se vier
  "Not authenticated", conduza `higgsfield auth login` (sem reiniciar) ou aponte `/setup`.
- A pasta `<PROJ>/RAG/identidade-visual/` tem ao menos uma imagem? **Se estiver vazia, pare** e
  peça ao usuário que coloque pelo menos uma referência ali (veja `RAG/README.md`). Sem
  referência, não há consistência.

## Passo 2: entreviste se o pedido for vago

Se a descrição da cena não deixa claro o que mostrar (personagem, ação, cenário, estilo), faça
**até 3 perguntas específicas** antes de gerar:

> "Eu entendi que você quer [o que entendeu], mas você não me explicou direito como quer a
> imagem: [pergunta 1] [pergunta 2] [pergunta 3]"

Não gere no escuro. Espere as respostas.

## Passo 3: APRESENTE OS MODELOS e faça o preflight de custo

**Este é o momento de apresentar os modelos ao usuário** — agora que a gente vai gerar de
verdade. A moldura: *"Show, agora que vamos gerar a imagem mesmo, essas são as opções no
Higgsfield — **X créditos** nessa, **Y** naquela — qual você prefere?"* Passo **obrigatório e
explícito**: mostre as opções e o custo de cada uma ANTES de escolher; não decida por ele.

1. **Catálogo VIVO** (consulta o Higgsfield real + destrava a geração). **Obrigatório por
   trava**: o hook bloqueia `higgsfield generate create` enquanto o catálogo não tiver sido
   consultado nesta sessão. Rode:

   ```bash
   node scripts/refresh-catalog.cjs
   ```

   Puxa a lista real, atualiza o cache (sem hardcode) e carimba o token de consulta.

2. **Parecer + custo por cenário** (lê o catálogo vivo; real pro default, AC pros pagos):

   ```bash
   node scripts/lib/model-advisor.cjs image --objetivo "<resumo-da-imagem>" --plano "<plano>" --saldo "<creditos>" --cenas <N> --modo <biblioteca|geracao>
   ```

   Traz `catalogo_fonte: "vivo"` e marca cada opção com `disponivel_no_higgsfield`. Não ofereça
   opção que não esteja no catálogo vivo.

Apresente a tabela com o tradeoff honesto: `nano_banana_2` ("Nano Banana Pro") é o executável
agora via CLI, custo fixo; opções como `soul_cinematic`, `cinematic_studio_2_5`,
`text2image_soul_v2` ou `ms_image` podem elevar o teto, mas custo/plano são **AC** — **nunca
invente preço: confirme com `higgsfield generate cost <modelo> ...`**. Diga o **custo por
cenário** de cada opção e **deixe o usuário escolher**. Em modo biblioteca a imagem custa 0
(seleção de asset). Se ele seguir no default, o preflight abaixo calcula o custo do fluxo atual.

Rode `higgsfield-preflight` para o número de imagens que vai gerar, **com `--com-video false`**
(cada imagem = 2 créditos; não inclua custo de vídeo neste comando).
Mostre o custo total e o saldo, e **reconfirme o projeto `<PROJ>`** junto do custo. Avise que a
geração depende do Higgsfield CLI autenticado na conta certa. **Se o saldo não cobre, pare** e
informe o custo antes de continuar. Peça o ok do usuário.

## Passo 4: busque a identidade

Spawne o agente `rag` (via Task) para ler o `RAG/` do projeto e devolver a identidade: anchor
textual, paleta, estilo e os paths das referências. **Diga o projeto no spawn**
(`{ objetivo: "ler identidade da marca", projeto: "<PROJ>" }`).

Salve a identidade retornada em `<PROJ>/output/identity-preflight.json` e rode:

```bash
node scripts/lib/identity-quality.cjs identity <PROJ>/output/identity-preflight.json
```

Se reprovar, não avance para prompt: corrija refs/anchor/RAG com o usuário.

## Passo 5: monte o prompt

Spawne o agente `prompt-smith` (via Task), passando a identidade que o `rag` devolveu e a
intenção da cena. Ele devolve a shot-list no formato canônico, com o prompt pronto e os paths
de referência relativos ao projeto.

## Passo 6: critique antes de gastar

Salve a shot-list em `<PROJ>/output/shotlist-preflight.json` e rode:

```bash
node scripts/lib/identity-quality.cjs shotlist <PROJ>/output/shotlist-preflight.json
node scripts/lib/dp-quality.cjs shotlist <PROJ>/output/shotlist-preflight.json
node scripts/lib/critique.cjs <PROJ>/output/shotlist-preflight.json
```

Mostre ao usuário o `score_ponderado`, o `gate_aprovado` e qualquer reprovação anti-IA
(C8-C11) da `RAG/review/rubrica-nivel-100.md`. Se `gate_aprovado:false`, **não chame
`gera-imagem`**: volte ao `prompt-smith` com as ações do critique. Esse gate pega quality-words,
luz chapada, prompt genérico, falta de refs/anchor e tells textuais antes de queimar crédito.
O `dp-quality.cjs` precisa passar antes do `critique`: ele exige bloco `cinematografia` por cena
de geração com luz motivada, safe-zone 9:16 (Y=220-1440 / middle 60%), um movimento de camera,
cor/grading e anti-IA concreto. Se reprovar, volte ao `prompt-smith`; nao gere no escuro.

## Passo 7: gere

Chame a skill `gera-imagem` (com `--root <PROJ>`) para cada cena da shot-list. A skill usa as
referências de `<PROJ>/RAG/` e salva em `<PROJ>/output/imagens/`. Depois de gerar, mostre ao
usuário o path de cada imagem e pergunte se ficou bom ou se quer regerar alguma.

**Crítica pós-render (Wave L, Tier-3).** O critique do Passo 6 gateia o plano em texto; este
gateia o pixel. Depois de gerar, olhe o still **real** e atribua os scores anti-IA 0/50/100
por eixo (C8 física, C9 textura, C10 estabilidade, C11 continuidade —
`RAG/review/rubrica-nivel-100.md`). Grave em `<PROJ>/output/critique-cena-<n>.json`
(`{ artifacto, cena, attempt, max_attempts, scores }`) e rode o gate:

```bash
node scripts/lib/post-render-critique.cjs <PROJ>/output/critique-cena-<n>.json
```

Veredito pelo exit code: **0 accept**, **1 reroll** (um tell forte — mão morphing, plástico,
física quebrada — anula o premium; regere a cena), **2 escalate** (budget esgotado ou score
ausente → mostre o still + scores e deixe o usuário decidir, Invariante 7). Respeite o
`max_attempts`: nunca entre em loop de re-roll queimando crédito.

Depois que o fluxo de imagem terminar com sucesso, registre a cadência:

```bash
node scripts/review-cadence.cjs record-flow --root . --kind imagem --label "<resumo-curto>"
```

Se o retorno vier com `revisao_sugerida: true`, sugira rodar `/revisao` agora. Se o usuário
não quiser, tudo bem, mas antes do próximo fluxo a revisão será obrigatória.

Registre também o primeiro run concluído:

```bash
node scripts/jotaro-profile.cjs mark-run --root . --marca "<cliente-ou-marca>"
```

Se ainda não estiver em modo expert, ofereça ativar para reduzir explicações nos próximos
fluxos.

## Lembretes

- Custo: 2 créditos por imagem. No free, teto de 10 por dia.
- Se for o primeiro uso, conduza devagar, explicando cada passo. Depois de um run completo,
  registre no perfil e ofereça o modo expert (pula as explicações).
- Você não gera o prompt na unha nem a imagem você mesmo: o `prompt-smith` monta, a skill
  `gera-imagem` executa. Você orquestra.
