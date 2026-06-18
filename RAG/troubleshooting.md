# Guia de troubleshooting do gerador

> Leitor primario: Jotaro. Use como referencia rapida quando algo falhar.
> Cada entrada tem: sintoma → causa provavel → o que dizer ao usuario → proximo passo.

## Conexao e autenticacao

### Higgsfield nao aparece (tools MCP indisponiveis)

**Sintoma:** `mcp__higgsfield__*` nao aparece na sessao. `/creditos` nao retorna nada.

**Causa:** Higgsfield nao foi conectado OU o Claude Code nao foi reiniciado depois da primeira conexao.

**Resposta:** "O Higgsfield nao esta conectado nesta sessao. Se voce ja conectou ele antes, e so reiniciar o Claude Code — o servico so carrega no inicio da sessao. Se nunca conectou, rode `/setup` (Passo 1) para fazer o login."

**Proximo passo:** `/setup` Passo 1 → reiniciar Claude Code → `/creditos` para confirmar.

### Erro de autenticacao no meio do fluxo

**Sintoma:** Ferramentas do Higgsfield retornam erro de auth depois de ja terem funcionado.

**Causa:** O login OAuth expirou (sessao muito longa ou token vencido).

**Resposta:** "O login do Higgsfield expirou durante a sessao. Vamos reconectar: rode `/setup` a partir do Passo 1 e depois reinicie o Claude Code. Se tiver um run em andamento, nao se preocupe — o checkpoint salva o que ja foi gerado."

**Proximo passo:** `/setup` Passo 1 → reiniciar → `/gerarvideo` retoma do save-crystal.

---

## Credito e custo

### Saldo insuficiente detectado no preflight

**Sintoma:** `pode_prosseguir: false` no preflight, com `custo_total > saldo`.

**Resposta:** "O reel de [N] cenas custa [X] creditos, mas voce tem [Y] agora. No plano free sao 10 creditos por dia. Opcoes: (1) reduzir o numero de cenas para [Z] que cabem hoje, (2) gerar aos poucos — o checkpoint salva cada cena e a gente retoma amanha de onde parou, (3) assinar um plano pago no Higgsfield."

**Proximo passo:** deixar o usuario escolher. Se for gerar parcial, siga com o que cabe.

### Erro de credito no meio da geracao (depois do preflight)

**Sintoma:** `mcp__higgsfield__job_status` retorna erro de credito depois de algumas cenas ja terem sido geradas.

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

**Sintoma:** Job completou (`status: completed`) mas `curl` falhou no download (URL inacessivel ou timeout).

**Resposta:** "A imagem foi gerada no Higgsfield mas o download falhou. Vou tentar baixar de novo com o mesmo job_id — isso nao gasta credito extra."

**Proximo passo:** repetir o `curl -L <rawUrl>` do job ja pago.

### generate_image falha com erro de media_id (run retomado dias depois)

**Sintoma:** `generate_image` retorna erro de media_id invalido/expirado num run que foi retomado depois de dias (multi-dia). As cenas anteriores funcionaram; agora a mesma ref nao e aceita.

**Causa:** O media_id da referencia expirou no Higgsfield entre as sessoes. O save-crystal guarda o media_id, mas o servico ja o descartou.

**Resposta:** "A referencia da sua marca expirou no Higgsfield desde a ultima sessao. Vou re-subir a imagem de referencia (que esta salva aqui na sua maquina) e seguir — isso nao gasta credito, so a geracao em si cobra."

**Proximo passo:** re-subir a ref a partir do arquivo local em `RAG/identidade-visual/` (upload + confirm), sobrescrever o media_id no save-crystal, e refazer o `generate_image`. Upload nao cobra credito.

### Modelo de video recusado (nao e o veo3_1_lite)

**Sintoma:** `generate_video` com outro modelo retorna erro de plano.

**Resposta:** "Esse modelo de video so funciona em plano pago. No free, o unico disponivel e o `veo3_1_lite` (4 segundos, 720p, mudo)."

**Proximo passo:** regerar com `veo3_1_lite`.

### veo3_1_lite indisponivel

**Sintoma:** `generate_video` com `veo3_1_lite` retorna erro de indisponibilidade (nao de credito).

**Causa:** O modelo foi descontinuado ou esta fora do ar temporariamente.

**Resposta:** "O modelo de video `veo3_1_lite` esta indisponivel no momento. Pode ser temporario (manutencao do Higgsfield) ou permanente (descontinuacao). Sem ele, nao da para gerar video no plano free. Sugiro: (1) aguardar e tentar de novo em algumas horas, (2) conferir o status no site do Higgsfield, ou (3) considerar um plano pago se os outros modelos forem viaveis para voce."

**Proximo passo:** aguardar e tentar novamente. NÃO testar outros modelos (Seedance, Kling, etc.) — eles recusam no free e podem queimar credito ou dar erro confuso.

---

## RAG e identidade

### Pasta RAG vazia

**Sintoma:** `RAG/identidade-visual/` nao tem imagens. `validate-rag.cjs` falha.

**Resposta:** "A pasta de referencias visuais esta vazia. Para gerar com a cara da sua marca, coloque de 1 a 3 imagens do seu personagem ou produto em `RAG/identidade-visual/`. Sem isso, eu gero imagem generica, sem consistencia entre cenas."

**Proximo passo:** usuario coloca imagens → `validate-rag.cjs` para conferir.

### Marca ou narrativa incompletas

**Sintoma:** `validate-rag.cjs` reporta secoes faltando em `marca.md` ou `narrativa.md`.

**Resposta:** "Sua marca ainda esta incompleta: [listar o que falta, ex: 'falta a secao de estilo visual', 'a narrativa so tem 1 secao, precisa de pelo menos 3']. Use `RAG/marca-template.md` e `RAG/narrativa-template.md` como base para preencher."

**Proximo passo:** usuario completa → `validate-rag.cjs` para conferir.

---

## Pipeline e retomada

### Run interrompido (save-crystal)

**Sintoma:** `output/.pipeline-state.json` existe com cenas ja geradas.

**Resposta:** "Tem um run em andamento com [N] cenas ja geradas. Quer retomar de onde parou (sem regerar o que ja foi feito, credito gasto nao volta) ou comecar um run novo?"

**Proximo passo:** se retomar, pular cenas com `existe: true` no save-crystal. Se comecar novo, apagar `output/.pipeline-state.json`.

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

**Resposta:** (interno — Jotaro nao reporta isso ao usuario) Use aspas duplas em todos os paths e `--data-binary "@<path>"` no curl com o `@` e aspas.

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
