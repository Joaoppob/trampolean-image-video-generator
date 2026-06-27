#!/usr/bin/env node
'use strict';

/*
 * higgsfield-gate.cjs — hook PreToolUse do Trampolean Generator.
 *
 * Interlock mecanico do gasto de credito. Bloqueia qualquer
 * `higgsfield generate create` (o subcomando que gasta) a menos que o gate de
 * qualidade tenha sido ARMADO (token fresco com hash batendo na shotlist atual,
 * via scripts/preflight-gate.cjs). Subcomandos gratuitos — `account status`,
 * `generate cost`, `generate list`, `upload create`, `auth login` — passam livres.
 *
 * Contrato (PreToolUse):
 * - recebe JSON na stdin: { tool_name, tool_input:{ command } } (+ cwd opcional);
 * - libera: exit 0 + {} (ou permissionDecision allow);
 * - bloqueia: exit 0 + hookSpecificOutput.permissionDecision="deny" + razao;
 * - FALHA ABERTO so em erro interno do proprio hook (bug nao trava o produto),
 *   mas FALHA FECHADO na condicao real "gate nao armado" (e o ponto do interlock).
 *
 * Reforco: a disciplina primaria continua no CLAUDE.md e no preflight-gate.
 */

const path = require('path');

// O subcomando que GASTA credito. cost/list/get/account/auth/upload sao gratuitos.
const SPEND_RE = /\b(?:higgsfield|hf)\s+generate\s+create\b/i;

function allow() {
  try {
    process.stdout.write(JSON.stringify({
      hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'allow' },
    }));
  } catch (_) { /* noop */ }
  process.exit(0);
}

function deny(reason) {
  try {
    process.stdout.write(JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'deny',
        permissionDecisionReason: reason,
      },
    }));
  } catch (_) { /* noop */ }
  process.exit(0);
}

// Nucleo puro e testavel: decide allow|deny dado o comando e a raiz do repo.
// Retorna { decision:'allow'|'deny', reason, stampCatalog?:true }.
function decide(toolName, command, repoRoot, nowMs) {
  if (toolName !== 'Bash') return { decision: 'allow', reason: 'nao-Bash' };
  const cmd = String(command || '');

  let catalog = null;
  try { catalog = require(path.join(repoRoot, 'scripts', 'lib', 'catalog.cjs')); } catch (_) { catalog = null; }

  // Consulta de catalogo (`higgsfield model list` / refresh-catalog): carimba o token
  // "catalogo consultado" e libera. E o passo que destrava a geracao.
  if (catalog && catalog.CATALOG_QUERY_RE.test(cmd)) {
    return { decision: 'allow', reason: 'consulta de catalogo', stampCatalog: true };
  }

  if (!SPEND_RE.test(cmd)) return { decision: 'allow', reason: 'nao gasta credito' };

  // Comando de gasto (`higgsfield generate create`): exige (1) gate de qualidade armado
  // E (2) catalogo consultado nesta sessao. Os dois sao trava mecanica, nao honra.
  let gate;
  try {
    gate = require(path.join(repoRoot, 'scripts', 'preflight-gate.cjs'));
  } catch (e) {
    // Bug interno (nao achou o runner): falha aberto para nao travar o produto.
    return { decision: 'allow', reason: `hook degradado: ${e && e.message}` };
  }
  const v = gate.tokenValid(repoRoot, nowMs);
  if (!v.valid) {
    return {
      decision: 'deny',
      reason: `Geracao bloqueada pelo gate de qualidade: ${v.reason}. Rode \`node scripts/preflight-gate.cjs --root projects/<nome>\` e passe TODOS os criterios antes de gerar.`,
    };
  }
  if (catalog) {
    const c = catalog.seenFresh(repoRoot, nowMs);
    if (!c.fresh) {
      return {
        decision: 'deny',
        reason: `Geracao bloqueada: ${c.reason}. Rode \`node scripts/refresh-catalog.cjs\` (consulta os modelos VIVOS do Higgsfield + custo) e APRESENTE as opcoes ao usuario antes de gerar.`,
      };
    }
  }
  return { decision: 'allow', reason: 'gate armado + catalogo consultado' };
}

function readStdin() {
  return new Promise(function (resolve) {
    var data = '';
    var settled = false;
    function done() { if (!settled) { settled = true; resolve(data); } }
    try {
      if (process.stdin.isTTY) { done(); return; }
      process.stdin.setEncoding('utf8');
      process.stdin.on('data', function (c) { data += c; });
      process.stdin.on('end', done);
      process.stdin.on('error', done);
      setTimeout(done, 1500);
    } catch (_) { done(); }
  });
}

async function main() {
  try {
    var raw = await readStdin();
    var payload;
    try { payload = raw && raw.trim() ? JSON.parse(raw) : {}; } catch (_) { allow(); return; }
    var toolName = payload.tool_name || payload.toolName;
    var command = payload.tool_input && (payload.tool_input.command || payload.tool_input.cmd);
    var repoRoot = process.env.CLAUDE_PROJECT_DIR || payload.cwd || process.cwd();
    var r = decide(toolName, command, repoRoot);
    if (r.stampCatalog) {
      try { require(path.join(repoRoot, 'scripts', 'lib', 'catalog.cjs')).stampSeen(repoRoot); } catch (_) { /* noop */ }
    }
    if (r.decision === 'deny') { deny(r.reason); return; }
    allow();
  } catch (_) {
    allow(); // erro interno => falha aberto
  }
}

module.exports = { decide, SPEND_RE };

// Runtime so quando executado direto como hook — nunca ao ser `require`-ado em teste.
if (require.main === module) {
  main();
  process.on('uncaughtException', function () { try { allow(); } catch (_) {} });
  process.on('unhandledRejection', function () { try { allow(); } catch (_) {} });
}
