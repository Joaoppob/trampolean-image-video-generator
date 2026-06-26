---
description: Pipeline completo: gera as cenas, anima em clipes e monta o reel 9:16.
argument-hint: "[descrição do reel]"
---

# /gerarvideo

Conduz o pipeline inteiro, das imagens ao reel montado. É o comando de maior custo: um reel de
6 cenas gasta 36 créditos. Por isso o protocolo é rigoroso e tem checkpoint de retomada. Siga
na ordem, sem pular invariante.

## Passo 0: escolha o projeto (obrigatório, antes de tudo)

Não existe projeto fixo. Liste `projects/` e pergunte pra qual o usuário quer gerar:

```bash
ls projects/
```

Mostre os de `status: "ativo"`. Pergunte "Pra qual projeto?". Se só houver um, confirme.
Chame de `<PROJ>` o root escolhido (ex.: `projects/TraceDefense`) — **todos os comandos
abaixo usam esse `<PROJ>`**. Se o usuário quer uma marca nova, veja "Projetos" no `CLAUDE.md`
(copiar de `templates/`).

## Passo 1: entenda o estado e cheque a retomada

Antes de tudo:
- Veja o perfil de uso (estado global do usuário, não do projeto):
  ```bash
  node scripts/jotaro-profile.cjs status --root .
  ```
  Se `modo_expert: true`, conduza com menos explicação, mantendo todos os checkpoints.
- A cadência de revisão permite iniciar?
  ```bash
  node scripts/review-cadence.cjs status --root .
  ```
  Se `pode_iniciar_fluxo: false`, rode o protocolo de `/revisao` antes de gastar crédito.
  Se a revisão falhar, pare e corrija antes de gerar.
- O Higgsfield CLI está autenticado? Cheque `higgsfield account status` (mostra email + saldo).
  Se vier "Not authenticated", você mesmo conduz `higgsfield auth login` (sem reiniciar o Claude
  Code) ou aponte `/setup`. Confirme que é a conta certa antes de gastar.
- O FFmpeg responde (`ffmpeg -version`)? Se não, aponte `/setup` (Passo 2) e pare. Não comece
  a gastar crédito sem o FFmpeg, senão você gera os clipes e não consegue montar.
- **Existe `<PROJ>/output/.pipeline-state.json`?** Se existir, há um run em andamento NESSE
  projeto. Pergunte ao usuário: retomar de onde parou (reaproveitando o que já foi gerado, sem
  regastar) ou começar um run novo? Crédito gasto não volta: perder o que já existe custa
  dinheiro. Respeite a escolha dele.

## Passo 2: confirme as imagens de referência

Liste o que tem em `<PROJ>/RAG/identidade-visual/` e **confirme com o usuário antes de seguir**:

> "Para o reel eu vou usar estas referências: [lista]. Posso seguir com elas?"

Se a pasta estiver vazia, pare e peça que ele coloque ao menos uma imagem (veja
`RAG/README.md`). Sem referência, não há consistência entre as cenas.

## Passo 3: entreviste se o pedido for vago

Se o pedido não descreve o reel com clareza (quantas cenas, que história, que estilo, se tem
legenda no fim), faça **até 3 perguntas específicas** antes de gerar:

> "Eu entendi que você quer [o que entendeu], mas preciso de mais clareza: [perguntas]"

## Passo 4: preflight do custo total

Rode `higgsfield-preflight` para o número de cenas do reel. Ele calcula o custo total:
cada cena = 1 imagem (2 créditos) + 1 vídeo (4 créditos) = 6 créditos por cena. Um reel de 6
cenas = 36 créditos.

Mostre ao usuário, com clareza:
- **O projeto** pra onde vai gerar (`<PROJ>`) — reconfirme aqui.
- O custo total do run.
- O saldo atual.
- Quantos dias no free isso representa (ex.: 36 créditos = ~4 dias no teto de 10/dia).

Avise que tudo depende do Higgsfield CLI autenticado na conta certa. **Se o saldo não cobre o
run inteiro, pare** e informe o custo. Ofereça gerar por partes (o checkpoint permite retomar
amanhã) ou um plano pago. Peça o ok antes de gastar — confirmando projeto **e** custo na mesma frase.

**GATE OBRIGATÓRIO — confirme o `veo3_1_lite` ANTES da primeira imagem.** Isto é um gate, não
uma sugestão. No free, o `veo3_1_lite` é o único modelo de vídeo — ponto único de falha: sem
ele não há reel. O preflight é offline e determinístico (não tem rede), então **a checagem de
disponibilidade é sua, via CLI**: rode `higgsfield model list --video` e confirme que o
`veo3_1_lite` ("Veo 3.1 Lite") aparece **agora**, antes de gerar qualquer imagem. (Opcional,
sem gastar: `higgsfield generate cost veo3_1_lite --duration 4 --aspect_ratio 9:16` deve dar 4 —
confirma modelo + preço de uma vez.) Como o loop (Passo 6) cobra a imagem antes do vídeo, pular
este gate gastaria crédito de imagem por um reel que não pode ser montado. Se o `veo3_1_lite`
**não** estiver disponível e o objetivo é um reel, **PARE aqui, antes de gerar a primeira
imagem** — avise o usuário e não dispare nenhuma geração de imagem (crédito de imagem gasto não
volta). Só prossiga ao Passo 5 depois que este gate passar.

## Passo 5: monte a shot-list

Spawne o `rag` (via Task) para a identidade da marca — **diga qual é o projeto** no spawn
(`{ objetivo: "ler identidade da marca", projeto: "<PROJ>" }`). Depois spawne o `prompt-smith`
(via Task) com a identidade e a intenção das cenas. Ele devolve a shot-list no formato
canônico, uma entrada por cena, com os prompts prontos (paths relativos ao projeto).

Salve a identidade retornada em `<PROJ>/output/identity-preflight.json` e rode
`node scripts/lib/identity-quality.cjs identity <PROJ>/output/identity-preflight.json`. Se
reprovar, não avance para prompt: corrija refs/anchor/RAG com o usuário.

Salve a shot-list em `<PROJ>/output/shotlist-preflight.json` e rode:

```bash
node scripts/lib/identity-quality.cjs shotlist <PROJ>/output/shotlist-preflight.json
node scripts/lib/critique.cjs <PROJ>/output/shotlist-preflight.json
```

Mostre ao usuário o `score_ponderado`, o `gate_aprovado` e qualquer reprovação anti-IA
(C8-C11) da `RAG/review/rubrica-nivel-100.md`. Se `gate_aprovado:false`, **não gere a primeira
imagem**: volte ao `prompt-smith`/storyboard com as ações do critique. Esse gate pega
quality-words, luz chapada, prompt genérico, falta de refs/anchor e tells textuais antes de
queimar crédito.

Antes de entrar no loop, derive para cada cena um **prompt de movimento** curto para o vídeo.
O `veo3_1_lite` exige `--prompt` mesmo quando recebe `--start-image`; sem isso o CLI pode falhar
mal e deixar o fluxo esperando um job que nem nasceu. Use o `intencao`, o `tag` e o prompt da
imagem para descrever só movimento/câmera/ação, preservando exatamente o sujeito já gerado. Não
coloque CTA/texto aqui; legenda entra no Passo 7.

## Passo 6: loop por cena (o loop roda em você, não nas folhas)

Para cada cena da shot-list, na ordem (todas as skills com `--root <PROJ>`):
1. Chame `gera-imagem` (2 créditos). Salva em `<PROJ>/output/imagens/`.
2. Chame `gera-video` sobre essa imagem com o `job_id` da imagem **e o prompt de movimento**
   (4 créditos, só `veo3_1_lite` no free). A skill cria o job sem `--wait`, confirma `job_id`,
   e só então espera o vídeo. Salva em `<PROJ>/output/clips/`.
3. Registre o progresso no `<PROJ>/output/.pipeline-state.json` (a skill cuida disso): se o run
   cair, dá para retomar daqui.

Mostre o progresso ao usuário a cada cena ("cena 3 de 6 pronta").

Se a criação do job de vídeo não devolver `job_id`, **não fique aguardando**: pare a espera,
leia o erro/JSON cru, confira os parâmetros com `higgsfield generate create veo3_1_lite --help`
ou `higgsfield generate list`, corrija o parâmetro faltante e explique o diagnóstico. Máximo de
2 tentativas de criação antes de parar e investigar; não entre em loop silencioso.

## Passo 7: monte o reel

Pergunte se o usuário quer legenda queimada no fim (ex.: "BAIXE AGORA") e, se sim, qual texto.
Chame a skill `editor-video` (com `--root <PROJ>`) para juntar os clipes num reel 1080×1920 com
a legenda opcional. O reel sai em `<PROJ>/output/reels/reel-<timestamp-UTC>.mp4` (UTC, sufixo `Z`).

## Passo 8: entregue

Mostre o path final do reel. Diga que os clipes mudos do free não têm trilha (dá para colocar
por fora se quiser). Pergunte se ficou bom ou se quer regerar alguma cena (o checkpoint deixa
regerar só a cena ruim, sem refazer o reel inteiro).

Mostre também o **custo real do run** pela trilha de auditoria do projeto (leitura, não gasta):

```bash
node scripts/lib/ledger.cjs summary --root <PROJ>
```

O `total_creditos` confirma quanto este run efetivamente consumiu (deve bater com o preflight
do Passo 4) e os `alertas` avisam se algum dia passou do teto free.

Registre que o usuário completou um run (perfil é estado global do usuário, fica em `--root .`):

```bash
node scripts/jotaro-profile.cjs mark-run --root . --marca "<projeto>"
```

Se ainda não estiver em modo expert, ofereça: "Da próxima vez posso conduzir em modo expert,
com menos explicações e os mesmos checkpoints. Quer ativar?". Se aceitar:

```bash
node scripts/jotaro-profile.cjs expert-on --root .
```

Depois que o reel terminar com sucesso, registre a cadência:

```bash
node scripts/review-cadence.cjs record-flow --root . --kind video --label "<resumo-curto>"
```

Se o retorno vier com `revisao_sugerida: true`, sugira rodar `/revisao` agora. Se o usuário
não quiser, tudo bem, mas antes do próximo fluxo a revisão será obrigatória.

## Lembretes

- Custo por cena: 6 créditos (2 imagem + 4 vídeo). Reel de 6 = 36 créditos. Free = 10/dia.
- Primeiro uso: conduza devagar, explique cada etapa. Depois de um run completo, registre no
  perfil e ofereça o modo expert.
- O loop das cenas é seu. As folhas (`rag`, `prompt-smith`) só recebem entrada e devolvem
  saída; a execução é das skills. Você orquestra tudo.
