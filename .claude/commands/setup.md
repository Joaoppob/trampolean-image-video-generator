---
description: Guia o setup de primeira vez: Higgsfield (OAuth), FFmpeg e conferência de saldo.
---

# /setup

Guie o usuário pela configuração inicial, passo a passo, esperando ele confirmar cada etapa
antes de seguir. É a primeira vez dele: não assuma nada, explique o porquê de cada coisa.

## Passo 0: interface gráfica

Confirme com o usuário que ele está rodando o Claude Code num computador com tela e navegador
(não num servidor sem interface). A primeira conexão com o Higgsfield abre uma página de login
no navegador, então precisa de ambiente gráfico. Se for terminal puro sem GUI, pare aqui: o
login não vai funcionar.

## Passo 1: conectar o Higgsfield

O Higgsfield é o serviço que gera as imagens e os vídeos. A conexão é por conta do usuário,
via login (OAuth), sem nenhuma senha guardada no projeto.

1. Rode `/mcp` no Claude Code. Vai aparecer o servidor `higgsfield`.
2. Inicie a autenticação. Abre uma página no navegador para o login na conta Higgsfield.
3. Faça login e autorize.

O login fica guardado por usuário, no perfil do Claude Code (`~/.claude/`), e sobrevive a
reiniciar o programa. Você não precisa logar de novo toda vez.

**Importante: depois de conectar pela primeira vez, reinicie o Claude Code.** O servidor só
é carregado no início da sessão. Sem reiniciar, as ferramentas de geração não aparecem.

## Passo 2: conferir o FFmpeg

O FFmpeg é o programa que monta o reel final (junta os clipes, queima a legenda). Precisa
estar instalado na máquina. Confira:

- Rode `ffmpeg -version` você mesmo. Se a permissão do Claude Code pedir confirmação, explique
  que é só a checagem do FFmpeg e aguarde o ok. No Windows também serve `where ffmpeg`; no
  Mac/Linux, `which ffmpeg`.
- Se aparecer a versão, está pronto. Siga.
- Se der erro ou "comando não encontrado", está faltando. Mostre o comando do sistema dele:

| Sistema | Como instalar |
|---------|---------------|
| **Windows** | `winget install Gyan.FFmpeg` (ou `choco install ffmpeg`) |
| **macOS** | `brew install ffmpeg` (precisa do Homebrew: https://brew.sh) |
| **Linux (Ubuntu/Debian)** | `sudo apt update && sudo apt install -y ffmpeg` |
| **Linux (Fedora)** | `sudo dnf install -y ffmpeg` |
| **Linux (Arch)** | `sudo pacman -S ffmpeg` |

Alternativa manual no Windows: baixar de https://www.gyan.dev/ffmpeg/builds/ e adicionar ao
PATH. Site oficial de builds: https://ffmpeg.org/download.html.

**Pare aqui até `ffmpeg -version` passar.** Não adianta gerar 36 créditos de clipes e descobrir
no fim que não dá para montar o reel.

## Passo 3: conferir o saldo

Rode `/creditos` para confirmar que o Higgsfield responde e ver o plano. É um teste de saldo,
não gasta crédito.

## Fechamento

Confirme que as três coisas estão prontas: Higgsfield conectado (e reiniciado), FFmpeg
respondendo, saldo conferido. Diga ao usuário que o próximo passo é colocar as imagens da
marca em `RAG/identidade-visual/` (veja `RAG/README.md`) e então pedir um reel com
`/gerarvideo`.

## Se a conexão falhar mais tarde

Se em algum momento a geração reclamar de autenticação (o login pode expirar), rode `/setup`
de novo a partir do Passo 1 para reconectar, e reinicie o Claude Code.
