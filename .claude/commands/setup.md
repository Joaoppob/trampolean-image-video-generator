---
description: Guia o setup de primeira vez: Higgsfield CLI (install + login), FFmpeg e conferência de saldo.
---

# /setup

Guie o usuário pela configuração inicial, passo a passo, esperando ele confirmar cada etapa
antes de seguir. É a primeira vez dele: não assuma nada, explique o porquê de cada coisa.
Mantenha o tom animado e proativo — e termine cada passo oferecendo o próximo.

## Passo 0: interface gráfica

Confirme com o usuário que ele está rodando o Claude Code num computador com tela e navegador
(não num servidor sem interface). O login do Higgsfield abre uma página no navegador, então
precisa de ambiente gráfico. Se for terminal puro sem GUI, pare aqui: o login não vai funcionar.

## Passo 1: instalar e conectar o Higgsfield (CLI)

O Higgsfield é o serviço que gera as imagens e os vídeos. A gente usa o **Higgsfield CLI** — é
o jeito recomendado pra Claude Code (o próprio Higgsfield recomenda o CLI no lugar do MCP).
A vantagem prática: **eu mesmo conduzo o login e a troca de conta, sem você reiniciar o Claude
Code.** A conexão é por conta do usuário, via login no navegador, sem senha guardada no projeto.

### 1a. Instalar o CLI (uma vez por máquina)

Cheque se já está instalado:

```bash
higgsfield --version
```

- Se imprimir uma versão (`higgsfield 0.x.x ...`), pule pra 1b.
- Se der "command not found", instale:

```bash
npm install -g @higgsfield/cli
```

> O instalador baixa um binário (`hf`) da release do GitHub. Se o download falhar (rede/proxy),
> rode de novo; em último caso, dá pra baixar o binário manualmente da página de releases
> (https://github.com/higgsfield-ai/cli/releases) e pôr no PATH. Aliases: `higgsfield`, `higgs`, `hf`.

Confirme com `higgsfield --version` antes de seguir.

### 1b. Fazer login (eu disparo, você aprova no navegador)

```bash
higgsfield auth login
```

Isso abre o navegador (ou imprime um link `https://higgsfield.ai/device?code=...`). **Você
faz o login e aprova na conta certa** — essa parte é sua, acontece no seu navegador. Eu
disparo o comando e aguardo a aprovação; **não preciso reiniciar o Claude Code.**

> Se você tem mais de uma conta Higgsfield, garanta que está logado **na conta que você quer
> usar** (a que tem os créditos). Se o navegador já estiver logado na conta errada, troque a
> conta lá antes de aprovar.

### 1c. Confirmar a conta conectada

```bash
higgsfield account status
```

Mostra **email, plano e créditos**. Eu confiro o email com você: "conectou na conta `<email>`,
plano `<plano>`, `<N>` créditos — é essa mesmo?". Se for a conta errada, é só `higgsfield auth
login` de novo (passo 1b) — sem reinício, sem drama.

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

Rode `/creditos` (ou `higgsfield account status`) para confirmar que o Higgsfield responde e
ver o plano. É um teste de saldo, não gasta crédito.

## Fechamento

Confirme que as três coisas estão prontas: Higgsfield CLI instalado e logado (na conta certa),
FFmpeg respondendo, saldo conferido. Diga ao usuário que o próximo passo é escolher (ou criar)
um projeto em `projects/` e colocar as imagens da marca em
`projects/<projeto>/RAG/identidade-visual/` (veja `RAG/README.md` e `templates/README.md` pra
começar uma marca nova), e então pedir um reel com `/gerarvideo`. Feche oferecendo: "quer que
eu já te mostre os projetos, ou prefere um tour rápido com o `/tutorial`?".

## Se a conexão falhar — ou se você trocar de conta

Esta é a parte que eu resolvo **sozinho**, sem você reiniciar nada:

- **"Não autenticado" / o login expirou:** eu rodo `higgsfield auth login` de novo, você
  aprova no navegador, e seguimos na hora.
- **Você trocou de conta no Higgsfield (e o saldo não bateu):** diferente do MCP antigo (que
  grudava na conta velha e exigia reconectar + reiniciar), aqui é só `higgsfield auth login`
  na conta nova. Eu confiro com `higgsfield account status` que o email e os créditos agora
  são os certos, e a gente dispara o run. Tudo na mesma sessão.
- **Saldo zerado:** toda conta free começa em 0 e repõe 10 créditos/dia conforme usa. Se a
  conta certa está zerada, é esperar o pool renovar (amanhã) ou assinar um plano pago.
