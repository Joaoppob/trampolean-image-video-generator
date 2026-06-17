#!/usr/bin/env node
/*
 * scope-guard.cjs — hook UserPromptSubmit do Trampolean Generator.
 *
 * CONTRATO ASSUMIDO (Claude Code 2.1.178, doc oficial code.claude.com/docs/en/hooks):
 *   - Hook recebe JSON na stdin. O prompt do usuario vem em `prompt`.
 *   - Para BLOQUEAR: exit 0 + stdout com JSON
 *       { "decision": "block", "reason": "<texto PT-BR mostrado ao usuario>",
 *         "suppressOriginalPrompt": true }
 *     `decision:"block"` impede o processamento e apaga o prompt do contexto;
 *     `reason` e mostrado ao usuario (nao entra no contexto do modelo).
 *   - Para LIBERAR: exit 0 sem JSON de bloqueio (objeto vazio `{}` ou nada).
 *   - Exit 2 e a via alternativa (stderr -> rejeita prompt). NAO usamos as duas
 *     juntas: escolhemos exit 0 + JSON, que e a mais documentada e da reason ao usuario.
 *
 * DEGRADE GRACIOSO (obrigatorio): qualquer erro interno -> libera (nunca bloqueia
 * por falha propria). try/catch geral; sempre process.exit(0). O hook e REFORCO;
 * a defesa primaria sao as camadas de instrucao do CLAUDE.md.
 */

'use strict';

// Bloqueia liberando (caminho seguro): imprime objeto vazio e sai limpo.
function allow() {
  try { process.stdout.write('{}'); } catch (_) { /* noop */ }
  process.exit(0);
}

// Bloqueia o prompt com motivo curto em PT-BR.
function block(reason) {
  try {
    process.stdout.write(JSON.stringify({
      decision: 'block',
      reason: reason,
      suppressOriginalPrompt: true,
    }));
  } catch (_) {
    // Se nem o JSON de bloqueio sair, falha aberto: libera.
    process.exit(0);
    return;
  }
  process.exit(0);
}

// Le toda a stdin de modo compativel Windows + Unix.
function readStdin() {
  return new Promise(function (resolve) {
    var data = '';
    var settled = false;
    function done() {
      if (settled) return;
      settled = true;
      resolve(data);
    }
    try {
      if (process.stdin.isTTY) { done(); return; }
      process.stdin.setEncoding('utf8');
      process.stdin.on('data', function (chunk) { data += chunk; });
      process.stdin.on('end', done);
      process.stdin.on('error', done);
      // Salvaguarda: se a stdin nao fechar, nao trava o turno do usuario.
      setTimeout(done, 1500);
    } catch (_) {
      done();
    }
  });
}

// ----- Classificadores leves (regex) -----

// Jailbreak / tentativa de sobrescrever instrucoes ou papel.
var JAILBREAK = [
  /ignore?\s+(o|os|todas?|tudo)?\s*(anterior|acima|as?\s+instru)/i,
  /esque(c|ç)a\s+(suas?\s+)?(instru|tudo|o\s+anterior)/i,
  /desconsidere?\s+(as?\s+)?(instru|regras|tudo)/i,
  /voc(e|ê)\s+agora\s+(e|é|vai\s+ser|sera|será)/i,
  /a\s+partir\s+de\s+agora\s+voc(e|ê)/i,
  /developer\s+mode|modo\s+desenvolvedor|jailbreak|dan\s+mode/i,
  /\bsystem\s*:/i,
  /novas?\s+instru(c|ç)(o|õ)es|nova\s+persona|novo\s+papel/i,
  /finja\s+que\s+voc(e|ê)|pretenda\s+ser|aja\s+como\s+se\s+voc(e|ê)/i,
];

// Off-topic explicito (fora de criar imagem/video neste gerador).
var OFFTOPIC = [
  // codigo / programacao
  /\b(c(o|ó)digo|programa(c|ç)(a|ã)o|programar|debug(ar)?|javascript|python|typescript|java\b|c\+\+|sql|html|css|regex|api\b|function\b|stack\s*trace|compil(ar|e|ador))/i,
  // politica / noticia / opiniao
  /\b(pol(i|í)tica|elei(c|ç)(a|ã)o|presidente|not(i|í)cia|o\s+que\s+voc(e|ê)\s+acha\s+sobre|sua\s+opini(a|ã)o)/i,
  // conteudo nao-visual (email/texto/traducao)
  /\b(escrev[ae]\s+(um\s+)?(email|e-mail|texto|reda(c|ç)(a|ã)o|carta|artigo|poema|ensaio)|traduz[ae]?\b|tradu(c|ç)(a|ã)o|resum[ae]\s+(este|esse|o)\s+texto)/i,
];

function classify(prompt) {
  if (typeof prompt !== 'string' || prompt.trim() === '') return null;
  var p = prompt;
  var i;
  for (i = 0; i < JAILBREAK.length; i++) {
    if (JAILBREAK[i].test(p)) {
      return 'Esse tipo de instrução não muda como o gerador funciona. O papel aqui é '
        + 'conduzir a criação de imagens e vídeos pra sua marca. Quer começar uma criação?';
    }
  }
  for (i = 0; i < OFFTOPIC.length; i++) {
    if (OFFTOPIC[i].test(p)) {
      return 'Isso fica fora do que este gerador faz. Minha praia é criar imagens e reels '
        + 'pra sua marca. Quer começar uma criação ou tirar uma dúvida sobre o gerador?';
    }
  }
  return null;
}

// ----- Main -----
(async function main() {
  try {
    var raw = await readStdin();
    var payload;
    try {
      payload = raw && raw.trim() ? JSON.parse(raw) : {};
    } catch (_) {
      // stdin ilegivel -> libera (falha aberto).
      allow();
      return;
    }
    var prompt = payload && (payload.prompt || payload.user_prompt || payload.userPrompt);
    var reason = classify(prompt);
    if (reason) { block(reason); return; }
    allow();
  } catch (_) {
    // Qualquer erro inesperado -> libera. Nunca bloqueia por falha propria.
    allow();
  }
})();

// Rede de seguranca dupla: erros nao capturados tambem liberam.
process.on('uncaughtException', function () { try { process.exit(0); } catch (_) {} });
process.on('unhandledRejection', function () { try { process.exit(0); } catch (_) {} });
