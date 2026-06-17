# Trampolean Image and Video Generator

Gera um reel vertical 9:16 (TikTok, Reels, Shorts) com a cara da sua marca, conversando com um
guia chamado Jotaro dentro do Claude Code. Você coloca as imagens da sua marca numa pasta,
pede um vídeo, e sai com o reel montado.

> Geração de imagem e vídeo via **Higgsfield**. Montagem via **FFmpeg**.
> `[uso de IA]` Este produto usa IA para gerar imagens e vídeos.

## Pré-requisitos

1. **Claude Code** instalado, num computador com tela e navegador (a primeira conexão com o
   Higgsfield abre uma página de login no navegador, não funciona em servidor sem interface).
2. **Conta Higgsfield** (o serviço que gera as imagens e vídeos). O plano free dá 10 créditos
   por dia. https://higgsfield.ai
3. **FFmpeg** instalado (monta o reel final). Como instalar está no `/setup`.

## Primeiro uso

1. **Baixe ou clone esta pasta.**
2. **Abra o Claude Code dentro da pasta** (com interface gráfica, não terminal puro). Ao abrir,
   o **Jotaro** já está lá: é o guia com quem você fala.
3. **Rode `/setup`.** Ele conduz a conexão com o Higgsfield (login OAuth no navegador), confere
   o FFmpeg e o saldo. **Depois de conectar o Higgsfield pela primeira vez, reinicie o Claude
   Code**. O serviço só carrega no início da sessão.
4. **Rode `/creditos`** para confirmar que está tudo conectado e ver seu saldo.

Pronto isso uma vez, não precisa repetir. O login fica guardado no seu perfil.

## Onde colocar suas imagens

Coloque de 1 a 3 imagens do seu personagem ou produto em:

```
RAG/identidade-visual/
```

São as imagens de referência: o que mantém a cara igual em todas as cenas. Depois, descreva
sua marca em `RAG/marca.md` e sua história em `RAG/narrativa.md` (há um exemplo pronto lá, o
mago do jogo Trace Defense, troque pelo seu). Use `RAG/marca-template.md` e
`RAG/narrativa-template.md` como base quando for colocar outra marca. Detalhes em
`RAG/README.md`.

## Como gerar

Você conversa com o Jotaro em português. Exemplos de fala:

- "Jotaro, gere uma imagem do meu personagem atacando um inimigo."
- "Quero um reel de 6 cenas: a vila sob ataque, o herói aparece, a batalha, a vitória."
- "Como troco o personagem do exemplo pelo meu?"

Ou use os comandos diretos:

| Comando | O que faz |
|---------|-----------|
| `/explica-fluxo` | Explica as 4 etapas do gerador. |
| `/setup` | Configuração de primeira vez (Higgsfield, FFmpeg, saldo). |
| `/duvidas` | Tira dúvidas sobre o sistema e os custos. |
| `/comofazer "..."` | How-to guiado para um objetivo específico. |
| `/creditos` | Mostra saldo e plano. Não gasta crédito. |
| `/simular` | Simula um run completo (RAG, custo, shot-list, checks) sem gastar 1 crédito. |
| `/revisao` | Roda as verificações do produto e zera a cadência de revisão. |
| `/gerarimagem "..."` | Gera uma ou mais imagens de uma cena. |
| `/gerarvideo "..."` | Pipeline completo: imagens, vídeos e reel montado. |

O Jotaro sempre confere o custo antes de gerar e sempre confere se há imagens na pasta de
referência. Você não gasta crédito sem ele avisar.

O Jotaro também mantém uma cadência de revisão: depois de 2 fluxos gerados, ele sugere rodar
`/revisao`; se você tentar gerar um 3º fluxo sem revisar, ele roda a revisão antes de gastar
crédito. Isso evita seguir gerando com hook, permissões ou helpers quebrados.

## Mapa da orquestração

```mermaid
flowchart TD
  U([Usuário]) --> J{{Jotaro<br/>orquestrador e guia}}

  J --> S{Pedido}
  S -->|"setup ou dúvida"| HELP["Comandos de ajuda<br/>setup, duvidas, comofazer, creditos"]
  S -->|"imagem"| IMG_FLOW["Fluxo de imagem"]
  S -->|"reel completo"| VID_FLOW["Fluxo de vídeo"]

  IMG_FLOW --> PROF[("Preferências do usuário<br/>guia passo a passo ou modo direto")]
  VID_FLOW --> PROF
  PROF --> C1{"Cadência de revisão<br/>pode iniciar?"}
  C1 -->|"2 fluxos sem revisão"| REV["Revisão automática<br/>confere se o gerador está saudável"]
  C1 -->|"ok"| RAG_READY{"Materiais da marca<br/>estão prontos?"}
  RAG_READY -->|"não"| RAG_FIX["Modelos para preencher<br/>marca, história e referências"]
  RAG_READY -->|"sim"| RAG[/Leitor de identidade<br/>entende a marca e as imagens/]

  RAG --> ID_SCHEMA[("Contrato da identidade<br/>garante resposta padronizada")]
  ID_SCHEMA --> PS[/Diretor de prompts<br/>transforma o pedido em cenas/]
  PS --> SHOT_SCHEMA[("Contrato da lista de cenas<br/>evita campos faltando")]
  SHOT_SCHEMA --> REVIEW["Checklists de qualidade<br/>consistência, texto, logo e CTA"]
  REVIEW --> GI[[Gerador de imagens<br/>cria as cenas no Higgsfield]]
  GI --> HF[("Higgsfield<br/>serviço externo de IA")]

  GI -->|"se o pedido era só imagem"| IMG_OUT([Imagens prontas<br/>arquivos para revisar ou usar])
  GI -->|"se o pedido era reel"| GV[[Animador de clipes<br/>transforma cada imagem em vídeo curto]]
  GV --> HF
  GV --> ED[[Editor de vídeo<br/>junta tudo em 1080x1920]]
  ED --> OUT([Reel final<br/>arquivo pronto para postar])

  GI --> STATE[("Memória do progresso<br/>não paga duas vezes pela mesma cena")]
  GV --> STATE
  IMG_FLOW --> RC[("Contador de revisão<br/>lembra quando revisar o sistema")]
  VID_FLOW --> RC

  classDef user fill:#f8fafc,stroke:#64748b,color:#0f172a,stroke-width:1px;
  classDef orchestrator fill:#ede9fe,stroke:#7c3aed,color:#2e1065,stroke-width:2px;
  classDef decision fill:#fef3c7,stroke:#d97706,color:#451a03,stroke-width:1px;
  classDef command fill:#dbeafe,stroke:#2563eb,color:#172554,stroke-width:1px;
  classDef agent fill:#ccfbf1,stroke:#0f766e,color:#042f2e,stroke-width:1px;
  classDef skill fill:#dcfce7,stroke:#16a34a,color:#052e16,stroke-width:1px;
  classDef state fill:#e2e8f0,stroke:#475569,color:#0f172a,stroke-width:1px;
  classDef external fill:#ffedd5,stroke:#ea580c,color:#431407,stroke-width:1px;
  classDef output fill:#fce7f3,stroke:#db2777,color:#500724,stroke-width:2px;

  class U user;
  class J orchestrator;
  class S,C1,RAG_READY decision;
  class HELP,IMG_FLOW,VID_FLOW,REV,RAG_FIX,REVIEW command;
  class RAG,PS agent;
  class GI,GV,ED skill;
  class PROF,ID_SCHEMA,SHOT_SCHEMA,STATE,RC state;
  class HF external;
  class IMG_OUT,OUT output;
```

### Guia visual do mapa

| Tipo | Forma | Cor | Exemplos |
|------|-------|-----|----------|
| Usuário | cápsula | cinza claro | `Usuário` |
| Orquestrador | hexágono | roxo | `Jotaro` |
| Decisão/gate | losango | amarelo | pedido, cadência, materiais da marca prontos |
| Comandos e materiais | retângulo | azul | revisão automática, checklists, modelos para preencher |
| Agentes folha | paralelogramo | verde-água | leitor de identidade, diretor de prompts |
| Skills executáveis | subrotina | verde | gerador de imagens, animador de clipes, editor de vídeo |
| Estado/contrato local | cilindro | cinza | preferências, contador, memória de progresso, contratos |
| Serviço externo | cilindro | laranja | `Higgsfield` |
| Saída final | cápsula | rosa | imagens prontas, reel pronto |

### Equipe e responsabilidades

| Nome | Tipo | O que faz | O que não faz |
|------|------|-----------|---------------|
| **Jotaro** | Orquestrador | Conversa com o usuário, entende o objetivo, aplica escopo, checa custo, chama agentes e skills, registra cadência e entrega o resultado. | Não sai do domínio de imagem/vídeo deste gerador. Não gasta crédito sem avisar. |
| **rag** | Agente folha | Lê `RAG/`, lista referências visuais e devolve identidade: anchor, estilo, paleta, narrativa e tom. | Não gera, não chama Higgsfield, não usa Bash, não spawna agentes. |
| **prompt-smith** | Agente folha | Recebe a identidade do `rag` e transforma o pedido em shot-list com prompts fortes e consistentes. | Não gera imagem, não chama Higgsfield, não consulta o `rag` sozinho. |

### Skills que o Jotaro executa

| Skill | Função |
|-------|--------|
| `higgsfield-preflight` | Lê saldo/plano no Higgsfield e calcula se o run cabe no crédito antes de gerar. |
| `gera-imagem` | Gera imagens 9:16 com referências da marca usando `nano_banana_pro`. |
| `gera-video` | Anima cada imagem em clipe curto usando apenas `veo3_1_lite` no free tier. |
| `editor-video` | Junta os clipes em um reel 1080×1920 com FFmpeg e legenda opcional. |

### Guardrails operacionais

- **Scope-lock:** Jotaro recusa código, opinião, política, texto genérico e jailbreak; ele volta para imagem/vídeo.
- **RBAC:** só o Jotaro age sobre o mundo. `rag` e `prompt-smith` são folhas de leitura/síntese.
- **Memória do progresso:** o gerador lembra quais cenas já foram criadas para não gastar crédito duas vezes refazendo a mesma etapa.
- **Cadência de revisão:** o gerador conta quantos fluxos foram concluídos. Após 2 fluxos, Jotaro sugere `/revisao`; antes do 3º sem revisão, ele roda a revisão obrigatoriamente.
- **Modo expert:** Jotaro lembra se o usuário já concluiu um run e se prefere menos explicações nos próximos fluxos.
- **Materiais de revisão:** `RAG/review/` traz checklists para prompt, consistência, regeneração de cena e reel final.

### Jornada do usuário

O que você vê e faz quando usa o gerador:

```mermaid
flowchart TB
  START([Você abre o Claude Code<br/>dentro desta pasta])
  TALK["Você pede em português<br/>exemplo: quero um reel de 4 cenas"]
  UNDERSTAND{{Jotaro entende o objetivo<br/>e explica o próximo passo}}
  FIRST{"É o primeiro uso?"}
  SETUP["Jotaro conduz o setup<br/>conecta Higgsfield, confere saldo e FFmpeg"]
  BRAND{"A marca já está preparada?"}
  BRAND_FIX["Você coloca as imagens de referência<br/>e preenche marca e narrativa"]
  SIM["Jotaro simula antes de gastar<br/>confere materiais, custo e cenas"]
  BALANCE{"O saldo cobre o pedido?"}
  ADJUST["Você escolhe uma saída<br/>menos cenas, esperar créditos ou usar plano pago"]
  CONFIRM["Você confirma a geração<br/>imagem única ou reel completo"]
  GENERATE["Jotaro gera cena por cena<br/>mostrando o progresso"]
  DELIVER([Você recebe o arquivo final<br/>pronto para revisar e postar])

  START --> TALK --> UNDERSTAND --> FIRST
  FIRST -->|"sim"| SETUP --> BRAND
  FIRST -->|"não"| BRAND
  BRAND -->|"não"| BRAND_FIX --> SIM
  BRAND -->|"sim"| SIM
  SIM --> BALANCE
  BALANCE -->|"não"| ADJUST --> SIM
  BALANCE -->|"sim"| CONFIRM --> GENERATE --> DELIVER

  classDef start fill:#f8fafc,stroke:#64748b,color:#0f172a,stroke-width:1px;
  classDef guide fill:#ede9fe,stroke:#7c3aed,color:#2e1065,stroke-width:2px;
  classDef action fill:#dbeafe,stroke:#2563eb,color:#172554,stroke-width:1px;
  classDef decision fill:#fef3c7,stroke:#d97706,color:#451a03,stroke-width:1px;
  classDef output fill:#fce7f3,stroke:#db2777,color:#500724,stroke-width:2px;

  class START,DELIVER start;
  class UNDERSTAND guide;
  class TALK,SETUP,BRAND_FIX,SIM,ADJUST,CONFIRM,GENERATE action;
  class FIRST,BRAND,BALANCE decision;
  class DELIVER output;
```

Este é o caminho visto por quem usa. O mapa anterior mostra o que acontece por dentro do
sistema para entregar esse resultado.

## Custos (honesto)

A geração consome créditos do Higgsfield:

- **Imagem:** 2 créditos.
- **Vídeo** (clipe de 4 segundos, mudo no free): 4 créditos.
- **Reel de 6 cenas:** 6 imagens × 2 + 6 vídeos × 4 = **36 créditos**.

No **plano free** são **10 créditos por dia**, compartilhados entre imagem e vídeo. Então um
reel completo de 6 cenas não cabe num dia só: dá para fazer aos poucos (uns 4 dias) ou assinar
um plano pago para sair de uma vez.

No free, o vídeo usa só o modelo `veo3_1_lite` (4 segundos, 720p, sem som, com marca d'água).
Os outros modelos exigem plano pago. O reel fica mudo até você colocar trilha por fora.

Planos pagos mudam com o tempo; confira os valores atuais direto no Higgsfield antes de
decidir.

## Sobre os pedidos de permissão do Claude Code

O FFmpeg e as ferramentas do Higgsfield já vêm pré-autorizados no projeto. Se o Claude Code
ainda pedir confirmação para rodar o FFmpeg ou ler a pasta de referências na primeira vez,
**aceite.** São as permissões que o gerador precisa para funcionar. Não clique "Negar" por
reflexo.

## Onde ficam os resultados

```
output/imagens/   imagens geradas
output/clips/      clipes de vídeo
output/reels/      o reel final montado (reel-<data-hora>.mp4)
```

Arquivos de estado local (não versionados, ficam na sua máquina):

- `.claude/state/.review-cadence.json` — contador de revisão.
- `.claude/state/.jotaro-profile.json` — lembra se você já completou um run e prefere modo expert.
- `output/.pipeline-state.json` — checkpoint que salva cada cena gerada. Se o run cair no meio, o Jotaro retoma de onde parou sem regastar crédito.

## Quer ver antes de gerar

A pasta `examples/` traz um reel pronto (o mago do Trace Defense) e uma imagem de exemplo. É a
prova de que funciona, antes de você gastar o primeiro crédito.

## O que a revisão verifica

A cada 2 fluxos gerados o Jotaro sugere rodar `/revisao`. O verificador (`scripts/verify.cjs`)
confere 108 itens de uma vez:

- **Scripts** — syntax check de todos os `.cjs` do projeto.
- **Hook de escopo** — testa que `scope-guard.cjs` bloqueia jailbreak e programação, libera
  pedidos de imagem/vídeo, e está registrado em `.claude/settings.json`.
- **Preflight** — testa que a trava de crédito bloqueia saldo insuficiente e libera quando cabe.
- **Conexão Higgsfield** — confere que `.mcp.json` existe e é JSON válido.
- **Pasta RAG** — valida que `identidade-visual/` tem imagens, que `marca.md` e `narrativa.md`
  têm todas as seções, e que o anchor textual é canônico.
- **Pipeline e cadência** — testa que o checkpoint é read-only, que a cadência bloqueia após 2
  fluxos e reseta com revisão.
- **RBAC e permissões** — confere que os agentes folha não têm Bash/Task/MCP, que o
  `settings.json` expõe só as tools certas, e que as skills declaram seus `allowed-tools`.
- **Schemas e shot-lists** — valida JSON, checa paths de referência, coerência de timing
  (`0-4`, `4-8`, ...), e faz lint de prompt (9:16, anchor mínimo, texto em cena não-CTA).

Se a revisão falhar, o Jotaro não gasta crédito até corrigir. Isso evita gerar com hook,
permissão ou helpers quebrados.

## Problemas comuns

- **"FFmpeg não encontrado"**: Não está instalado ou não está no PATH. Rode `/setup` (Passo
  2) para ver o comando de instalação do seu sistema. No Windows: `winget install Gyan.FFmpeg`.
- **"As ferramentas do Higgsfield não aparecem"**: Você conectou mas não reiniciou. Feche e
  abra o Claude Code de novo: o serviço só carrega no início da sessão.
- **"Erro de autenticação no meio do fluxo"**: O login do Higgsfield expirou. Rode `/setup` a
  partir do Passo 1 para reconectar e reinicie o Claude Code.
- **"Crédito insuficiente"**: O reel não cabe no saldo de hoje. Faça por partes (o Jotaro
  retoma de onde parou no dia seguinte) ou assine um plano pago.
- **"O vídeo está sem som"**: Normal no free: o `veo3_1_lite` gera clipe mudo. Coloque trilha
  por fora se quiser.

Se o erro não estiver nesta lista, o Jotaro consulta `RAG/troubleshooting.md` — um catálogo
completo de sintomas, causas e próximos passos para conexão, crédito, FFmpeg, geração e
retomada de pipeline.
