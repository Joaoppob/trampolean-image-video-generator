# Guia de troubleshooting do gerador

> Leitor primario: Jotaro. Use como referencia rapida quando algo falhar.
> Cada entrada tem: sintoma → causa provavel → o que dizer ao usuario → proximo passo.

## Conexao e autenticacao (Higgsfield CLI)

> O Higgsfield agora e o **CLI** (`higgsfield`/`hf`), nao MCP. Voce (Jotaro) conduz auth e
> troca de conta **sozinho, sem reiniciar o Claude Code**. Nunca mande o usuario mexer em
> `/mcp` nem reiniciar — isso e do mundo antigo (MCP).

### CLI nao instalado

**Sintoma:** `higgsfield --version` da "command not found".

**Causa:** o `@higgsfield/cli` ainda nao foi instalado nesta maquina.

**Resposta:** "O Higgsfield CLI ainda nao esta instalado aqui. Vou instalar rapidinho com `npm install -g @higgsfield/cli` e a gente conecta na sequencia."

**Proximo passo:** `/setup` Passo 1a (`npm install -g @higgsfield/cli`) → `higgsfield --version`.

### Nao autenticado

**Sintoma:** `higgsfield account status` retorna "Not authenticated". `/creditos` nao retorna saldo.

**Causa:** ninguem fez login ainda, ou o login foi removido (`auth logout`).

**Resposta:** "O Higgsfield ainda nao esta logado. Vou abrir o login pra voce — voce so aprova no navegador, na conta que tem os creditos. Nao precisa reiniciar nada."

**Proximo passo:** voce roda `higgsfield auth login` (abre o navegador) → usuario aprova →
`higgsfield account status` confirma email + saldo.

### Conta errada / troquei de conta e o saldo nao bate (caso comum)

**Sintoma:** `higgsfield account status` mostra um **email diferente** do esperado, ou o saldo
da zero/errado depois que o usuario trocou de conta no site do Higgsfield.

**Causa:** o CLI continua autenticado na conta **anterior** — trocar de conta no site/app NAO
troca a conta do CLI automaticamente. (Era exatamente o ponto cego do MCP antigo; aqui a saida
e simples.)

**Resposta:** "Aqui eu ainda estou vendo a conta `<email atual>` (com `<N>` creditos). Voce
trocou de conta no Higgsfield? Vou reautenticar na conta nova — voce so aprova no navegador, e
eu confirmo o saldo na hora. Sem reiniciar."

**Proximo passo:** voce roda `higgsfield auth login` → usuario aprova **na conta nova** →
`higgsfield account status` confirma que o email e os creditos mudaram → segue o fluxo.

### Erro de autenticacao no meio do fluxo

**Sintoma:** um comando do Higgsfield retorna erro de auth depois de ja ter funcionado.

**Causa:** o login expirou (sessao muito longa ou token vencido).

**Resposta:** "O login do Higgsfield expirou no meio do caminho. Vou reautenticar agora — voce
aprova no navegador e seguimos. Se tinha um run em andamento, relaxa: o checkpoint salvou o que
ja foi gerado."

**Proximo passo:** `higgsfield auth login` → `higgsfield account status` confirma →
`/gerarvideo` retoma do save-crystal.

---

## Credito e custo

### Saldo insuficiente detectado no preflight

**Sintoma:** `pode_prosseguir: false` no preflight, com `custo_total > saldo`.

**Resposta:** "O reel de [N] cenas custa [X] creditos, mas voce tem [Y] agora. No plano free sao 10 creditos por dia. Opcoes: (1) reduzir o numero de cenas para [Z] que cabem hoje, (2) gerar aos poucos — o checkpoint salva cada cena e a gente retoma amanha de onde parou, (3) assinar um plano pago no Higgsfield."

**Proximo passo:** deixar o usuario escolher. Se for gerar parcial, siga com o que cabe.

### Erro de credito no meio da geracao (depois do preflight)

**Sintoma:** `higgsfield generate create`/`wait` retorna erro de credito depois de algumas cenas ja terem sido geradas.

**Causa:** O teto diario bateu no meio do run (o preflight estimou, mas o saldo real pode variar).

**Resposta:** "O teto diario de creditos bateu durante a geracao. As [N] primeiras cenas ja estao salvas no checkpoint. Quando seu saldo renovar (a cada 24h), rode `/gerarvideo` de novo e eu retomo de onde paramos, sem regerar o que ja esta pronto."

**Proximo passo:** aguardar renovacao → `/gerarvideo` retoma.

---

## FFmpeg e montagem

### FFmpeg nao encontrado

**Sintoma:** `ffmpeg -version` falha. `node .claude/skills/editor-video/scripts/concat-reel.cjs --check` retorna `ok: false`.

**Resposta:** "O FFmpeg nao esta instalado (ou nao esta no PATH). Ele e o programa que monta o reel final. Para instalar: [comando do SO]. Depois reinicie o Claude Code para ele encontrar."

**Proximo passo:** instalar FFmpeg (comando por OS no `/setup` Passo 2) → reiniciar.

### Fonte de legenda nao encontrada no Windows

**Sintoma:** `concat-reel.cjs` aborta com "Arial Bold font not found".

**Causa:** O Windows nao tem `arialbd.ttf` no local esperado (raro, mas acontece em instalacoes minimas).

**Resposta:** "A fonte usada para queimar a legenda nao foi encontrada no seu Windows. Vou gerar o reel sem legenda por enquanto. Se quiser legenda, podemos usar o estilo contorno com uma fonte alternativa."

**Proximo passo:** gerar sem `--legenda` OU montar com `--legenda-estilo contorno`.

### Reel montado com resolucao ou fps errados

**Sintoma:** `ffprobe` do arquivo final mostra resolucao != 1080×1920.

**Causa:** Um clipe de entrada estava em resolucao diferente e o `scale` nao normalizou.

**Resposta:** "O reel foi montado mas a resolucao ficou [X]×[Y] em vez de 1080×1920. Vou regerar a montagem com o FFmpeg corrigido — isso nao gasta credito, e so a remontagem."

**Proximo passo:** rodar `editor-video` novamente com os mesmos clipes.

---

## Geracao de imagem e video

### Imagem gerada mas com erro de download

**Sintoma:** Job completou (`status` de sucesso) mas `curl` falhou no download (URL inacessivel ou timeout).

**Resposta:** "A imagem foi gerada no Higgsfield mas o download falhou. Vou tentar baixar de novo com o mesmo job (a URL do asset) — isso nao gasta credito extra."

**Proximo passo:** repetir o `curl -L "<url-do-asset>"` (do `hf-result.cjs` ou de `higgsfield generate get <job_id> --json`) — o job ja foi pago.

### generate create falha com erro de upload/media (run retomado dias depois)

**Sintoma:** `higgsfield generate create` retorna erro de mídia invalida/expirada num run retomado depois de dias (multi-dia). As cenas anteriores funcionaram; agora a mesma ref nao e aceita.

**Causa:** O upload id da referencia expirou no Higgsfield entre as sessoes. O save-crystal guarda o id, mas o servico ja o descartou.

**Resposta:** "A referencia da sua marca expirou no Higgsfield desde a ultima sessao. Vou re-subir a imagem de referencia (que esta salva aqui na sua maquina) e seguir — isso nao gasta credito, so a geracao em si cobra."

**Proximo passo:** re-subir a ref do arquivo local em `projects/<projeto>/RAG/identidade-visual/` (`higgsfield upload create <arquivo>`), sobrescrever o id no save-crystal (`pipeline-state.cjs media`), e refazer o `generate create`. Upload nao cobra credito.

### Modelo de video recusado (nao e o veo3_1_lite)

**Sintoma:** `higgsfield generate create <outro_modelo>` (video) retorna erro de plano.

**Resposta:** "Esse modelo de video so funciona em plano pago. No free, o unico disponivel e o `veo3_1_lite` (4 segundos com `--duration 4`, 9:16, mudo)."

**Proximo passo:** regerar com `veo3_1_lite --duration 4`.

### Video pendurado sem job criado

**Sintoma:** o Jotaro disparou animacao de video, ficou muitos minutos aguardando, mas
`higgsfield generate list` nao mostra job de video novo; o saldo segue igual e so existe o job
da imagem.

**Causa provavel:** o `veo3_1_lite` exige `--prompt` mesmo em image-to-video. Se o comando for
criado so com `--start-image` e `--wait`, o CLI pode falhar mal ou deixar a sessao esperando sem
job real.

**Resposta:** "Achei o problema: o job de video nao nasceu, entao nao adiantava esperar. Vou
criar do jeito certo agora: primeiro gero o job rapido, com `--prompt` de movimento e sem
`--wait`; quando o Higgsfield devolver o `job_id`, eu acompanho esse job ate concluir."

**Proximo passo:** criar sem wait e com prompt:
`higgsfield generate create veo3_1_lite --start-image <job_id_imagem> --prompt "<movimento>" --duration 4 --aspect_ratio 9:16 --json`.
Se retornar `job_id`, esperar esse job com `higgsfield generate wait <job_id> --json`. Se nao
retornar `job_id`, nao aguardar: ler erro/JSON cru, conferir `higgsfield generate create
veo3_1_lite --help`, corrigir flags e tentar no maximo mais uma vez.

### veo3_1_lite indisponivel

**Sintoma:** `higgsfield generate create veo3_1_lite` retorna erro de indisponibilidade (nao de credito), ou o modelo nao aparece em `higgsfield model list --video`.

**Causa:** O modelo foi descontinuado ou esta fora do ar temporariamente.

**Resposta:** "O modelo de video `veo3_1_lite` esta indisponivel no momento. Pode ser temporario (manutencao do Higgsfield) ou permanente (descontinuacao). Sem ele, nao da para gerar video no plano free. Sugiro: (1) aguardar e tentar de novo em algumas horas, (2) conferir o status no site do Higgsfield, ou (3) considerar um plano pago se os outros modelos forem viaveis para voce."

**Proximo passo:** aguardar e tentar novamente. NÃO testar outros modelos (Seedance, Kling, etc.) — eles recusam no free e podem queimar credito ou dar erro confuso.

---

## RAG e identidade

### Pasta RAG vazia

**Sintoma:** `projects/<projeto>/RAG/identidade-visual/` nao tem imagens. `validate-rag.cjs --project <projeto>` falha.

**Resposta:** "A pasta de referencias visuais deste projeto esta vazia. Para gerar com a cara da sua marca, coloque de 1 a 4 imagens do seu personagem ou produto em `projects/<projeto>/RAG/identidade-visual/`. Sem isso, eu gero imagem generica, sem consistencia entre cenas."

**Proximo passo:** usuario coloca imagens → `validate-rag.cjs --project <projeto>` para conferir.

### Marca ou narrativa incompletas

**Sintoma:** `validate-rag.cjs` reporta secoes faltando em `marca.md` ou `narrativa.md`.

**Resposta:** "Sua marca ainda esta incompleta: [listar o que falta, ex: 'falta a secao de estilo visual', 'a narrativa so tem 1 secao, precisa de pelo menos 3']. Os moldes em `templates/brand-*/RAG/` (marca.md e narrativa.md) servem de base para preencher."

**Proximo passo:** usuario completa → `validate-rag.cjs` para conferir.

---

## Pipeline e retomada

### Run interrompido (save-crystal)

**Sintoma:** `projects/<projeto>/output/.pipeline-state.json` existe com cenas ja geradas.

**Resposta:** "Tem um run em andamento neste projeto com [N] cenas ja geradas. Quer retomar de onde parou (sem regerar o que ja foi feito, credito gasto nao volta) ou comecar um run novo?"

**Proximo passo:** se retomar, pular cenas com `existe: true` no save-crystal. Se comecar novo, apagar `projects/<projeto>/output/.pipeline-state.json`.

### Cadencia de revisao bloqueando

**Sintoma:** `review-cadence.cjs status` retorna `pode_iniciar_fluxo: false`.

**Resposta:** "Antes de gerar, preciso rodar uma revisao rapida do sistema — e uma checagem de seguranca que evita gerar com alguma coisa quebrada. Rode `/revisao` e em 1 minuto a gente segue."

**Proximo passo:** `/revisao` → se passar, fluxo liberado.

---

## Ambiente

### Windows: curl nao encontrado

**Sintoma:** `curl` nao e reconhecido.

**Causa:** Windows 10+ tem curl.exe nativo, mas pode estar ausente em instalacoes muito antigas ou restritas.

**Resposta:** "O `curl` nao foi encontrado no seu sistema. No Windows 10 e 11 ele ja vem instalado; se nao estiver, voce pode baixar de https://curl.se/windows/."

**Proximo passo:** instalar curl ou verificar o PATH.

### Windows: espaco no nome do diretorio

**Sintoma:** comandos quebram com paths contendo "Trampolean Image and Video Generator".

**Causa:** O repo tem espaco no nome. As skills ja tratam isso com aspas nos comandos.

**Resposta:** (interno — Jotaro nao reporta isso ao usuario) Use aspas duplas em todos os paths, inclusive em `higgsfield upload create "<path com espaco>"` e `curl -L "<url>" -o "<dest com espaco>"`.

---

## Resposta pronta do Jotaro para "algo deu errado"

Use esta formula quando nenhuma entrada acima cobrir o erro:

1. Diga o que aconteceu em linguagem simples (sem jargao).
2. Diga se o erro consumiu credito ou nao.
3. Se ha checkpoint, diga que o que ja foi gerado esta salvo.
4. Ofereca o proximo passo concreto (nao "tente de novo", mas "roda X", "confere Y", "aguarda Z").
5. Se for erro desconhecido, seja honesto: "Esse erro e novo para mim. Vou registrar e voce pode tentar [acao segura] enquanto investigo."

Exemplo:

> "A geracao da cena 3 falhou por um erro de conexao com o Higgsfield. Isso nao consumiu credito — o disparo foi recusado antes de cobrar. As cenas 1 e 2 continuam salvas no checkpoint. Vamos tentar de novo? Se falhar de novo, sugiro aguardar alguns minutos e testar a conexao com `/creditos`."

---

## Atualizacao deste guia

Quando um erro novo aparecer em producao e for resolvido, adicione uma entrada aqui.
O guia cresce com a experiencia real de uso.
