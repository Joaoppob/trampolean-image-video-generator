# Team Reference — Agentes e Skills (detalhamento)

> Documento de referencia. O CLAUDE.md mantem uma tabela compacta; esta pagina
> tem o detalhamento completo de cada agente e skill. Consulte quando precisar
> entender o contrato exato de uma folha ou skill.

## Agentes folha (spawn via Task)

### rag
- **escopo:** le o `RAG/` do **projeto ativo** (`projects/<nome>/RAG/`) e devolve a identidade da marca.
- **tools:** `Read`, `Glob`, `Grep` — **SEM Bash, SEM MCP, SEM Task, SEM Skill.**
- **pode_spawnar:** nenhum.
- **contrato_entrada:** `{ objetivo: "ler identidade da marca", projeto: "projects/<nome>" }`.
- **contrato_saida:** `{ refs, anchor_textual, estilo, paleta, narrativa_resumo, tom }`.
- **fronteira:** nao gera, nao anima, nao chama skills nem Higgsfield. Nao le fora do `RAG/` do
  projeto passado na entrada. Devolve o anchor fiel, sem reescrever nem inferir.

### prompt-smith
- **escopo:** receber identidade + intencao e devolver shot-list.
- **tools:** `Read`, `Glob`, `Grep` — **SEM Bash, SEM MCP, SEM Task, SEM Skill.**
- **pode_spawnar:** nenhum.
- **contrato_entrada:** `{ identidade: <saida do rag>, intencao: <descricao das cenas> }`.
- **contrato_saida:** shot-list JSON (schema de `RAG/prompts/exemplo-shotlist-mago.json`).
- **fronteira:** nao gera imagem, nao chama Higgsfield, nao chama o `rag` diretamente.
  Pode ler o HUB (`RAG/prompts/`, `RAG/review/`) mas nao o `RAG/` de marca.

### story-writer
- **escopo:** receber identidade + intake (+ pesquisa estruturada opcional) e devolver o roteiro.
- **tools:** `Read`, `Glob`, `Grep` — **SEM Bash, SEM MCP, SEM Task, SEM Skill.**
- **contrato_entrada:** `{ identidade, intake_completo, pesquisa_estruturada }`.
- **contrato_saida:** roteiro JSON (`schemas/roteiro.schema.json`).
- **fronteira:** hook-first, beats PAS/AIDA/Hero, nao gera nem chama skills.

### storyboard-director
- **escopo:** receber roteiro + identidade + plataforma e devolver storyboard.
- **tools:** `Read`, `Glob`, `Grep` — **SEM Bash, SEM MCP, SEM Task, SEM Skill.**
- **contrato_entrada:** `{ roteiro, identidade, plataforma }`.
- **contrato_saida:** storyboard JSON (`schemas/storyboard.schema.json`).
- **fronteira:** hook-first, cada `descricao_visual` vira `intencao` pro `prompt-smith`.

## Skills de execucao

### pesquisa-web (Etapa 1 — opcional)
- **allowed-tools:** `WebSearch`, `WebFetch`, `Read` (travado; sem curl/Bash/Skill/Task/MCP).
- **contrato_saida:** `{ origem:"web-externa", query, capturado_em, resultados[<=5]{titulo, trecho<=500, url} }`.
- **fronteira:** vetor de maior risco — saida sempre estruturada e inerte; Jotaro e a trust boundary.

### higgsfield-preflight
- Calcula custo total e confere saldo antes de gastar. **allowed-tools:** `Bash`.

### gera-imagem
- Gera imagem 9:16 via Higgsfield CLI (`nano_banana_2`, 2 creditos). **allowed-tools:** `Bash`, `Read`.

### gera-video
- Anima imagem em clipe via Higgsfield CLI (`veo3_1_lite`, `--duration 4`, 4 creditos). **allowed-tools:** `Bash`, `Read`.

### editor-video
- Monta reel 1080x1920 com FFmpeg, legenda opcional. **allowed-tools:** `Bash`, `Read`.
