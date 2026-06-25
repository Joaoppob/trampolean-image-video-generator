---
description: Inicia a intake guiada do roteiro — coleta as lacunas pendentes antes de qualquer geração, sem gastar crédito.
---

# /roteiro

Use quando a pessoa quer começar uma criação, pede um roteiro/storyboard, ou descreve um post
que quer produzir. Esta é a **porta de entrada da Etapa 1 (roteirização)**: a intake guiada
que precede tudo. **Nada gera aqui** — é só a coleta estruturada do que o sistema precisa
saber antes de spawnar qualquer folha ou gastar crédito.

A intake é guiada por estado em disco (`projects/<nome>/output/.intake-state.json`), então
você pergunta **só as lacunas pendentes** e **nunca reperginta** o que já foi respondido —
mesmo numa conversa longa ou se a pessoa pausar e voltar depois.

## O que fazer

### 1. Descubra o projeto ativo

Se ainda não sabe pra qual projeto a pessoa vai trabalhar, pergunte (ou liste `ls projects/`
e ofereça o demo TraceDefense). A partir daqui, `<nome>` é esse projeto e todo comando usa
`--root projects/<nome>`.

### 2. Leia o estado da intake

```bash
node scripts/intake-state.cjs status --root projects/<nome>
```

O script devolve o estado e, dentro dele, `lacunas_pendentes` — a lista de campos
obrigatórios ainda em aberto. Os campos obrigatórios (bloqueiam o avanço) são:

- `projeto` — qual marca/projeto vamos atender.
- `plataforma` — onde o post vai (`instagram`, `tiktok`, `facebook`, `youtube`, `reels`).
- `objetivo_post` — o que a marca quer comunicar com esse post.
- `tipo_conteudo` — produto, serviço, personagem, depoimento, tendência.

Campos opcionais (você coleta se a pessoa tiver, mas não bloqueiam): `tem_roteiro`,
`tem_personagem`, `referencias_usuario`.

### 3. Pergunte só as lacunas pendentes — uma de cada vez

Para cada item em `lacunas_pendentes`, faça **uma** pergunta no seu tom proativo e acolhedor.
Não despeje as 4 de uma vez como formulário; conduza uma a uma, comemorando o progresso.
A cada resposta, grave o campo na hora:

```bash
node scripts/intake-state.cjs update --root projects/<nome> --campo <campo> --valor "<resposta>"
```

Depois de cada `update`, releia o `lacunas_pendentes` retornado e siga pra próxima lacuna.
Se a pessoa já respondeu algo de passagem (ex.: disse a plataforma sem você perguntar),
grave esse campo também e pule a pergunta correspondente — nunca reperginte o já coletado.

### 4. Ao completar (lacunas vazias) — resumo e confirmação

Quando `lacunas_pendentes` ficar vazio (`status: "completo"`), **pare** e mostre um resumo
claro do que coletou:

> Beleza, então é isso:
> • Projeto: **<projeto>**
> • Plataforma: **<plataforma>**
> • Objetivo: **<objetivo_post>**
> • Tipo de conteúdo: **<tipo_conteudo>**
> (+ os opcionais que a pessoa tiver dado)

Pergunte se está tudo certo antes de seguir: "Confirma que é isso? Posso ajustar qualquer
ponto antes da gente avançar." Deixe claro, com leveza, que **a partir daqui é que entra a
construção do roteiro** (próxima fase) e que **nada foi gerado nem cobrado** até agora.

## Regras

- **Nada gera nesta fase.** A intake só coleta e persiste. Geração de imagem/vídeo continua
  atrás de preflight, confirmação de custo e das aprovações humanas das fases seguintes.
- **Estado é a fonte da verdade**, não a memória da conversa. Sempre leia o `status` antes de
  perguntar, e sempre grave com `update` depois de cada resposta.
- **Não reperginte.** Se um campo já tem valor no estado, ele não está em `lacunas_pendentes`
  — então não pergunte de novo.
- Para recomeçar do zero (a pessoa quer trocar tudo): `node scripts/intake-state.cjs reset
  --root projects/<nome>`.

## Como responder

- Enquanto houver lacunas: faça a próxima pergunta, com energia, e ofereça guiar.
- Ao completar: mostre o resumo, peça confirmação, e abra a porta pro próximo passo da Etapa 1.
