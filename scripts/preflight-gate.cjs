#!/usr/bin/env node
'use strict';

/**
 * preflight-gate.cjs — runner unico dos gates pre-credito + "arma" o token de geracao.
 *
 * PROBLEMA QUE RESOLVE: ate aqui os 12 gates de qualidade viviam como INSTRUCAO no
 * CLAUDE.md — o Jotaro so os rodava se escolhesse. A skill `gera-imagem` (que gasta
 * credito) nao rodava critique nenhum. Logo "se gate_aprovado:false, nao gaste" era
 * honra, nao trava. Foi o modo de falha do run Girls Gummies.
 *
 * COMO RESOLVE: este runner roda TODOS os gates de texto pre-credito contra a
 * shotlist do projeto. So se TODOS passam, ele grava um TOKEN assinado com o
 * sha256 da shotlist em `.claude/state/.gate-pass.json`. O hook PreToolUse
 * `higgsfield-gate.cjs` recusa qualquer `higgsfield generate create` sem token
 * fresco cujo hash bata na shotlist atual. Editou a shotlist depois de armar? o
 * hash diverge e o hook bloqueia de novo. Esse e o interlock mecanico.
 *
 * Uso:
 *   node scripts/preflight-gate.cjs --root projects/<nome>
 *   # le projects/<nome>/output/shotlist-preflight.json, roda os gates,
 *   # arma o token e sai 0 se tudo passa; imprime as falhas e sai 1 se nao.
 *   node scripts/preflight-gate.cjs --root projects/<nome> --shotlist <outro.json>
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');

const TOKEN_REL = path.join('.claude', 'state', '.gate-pass.json');
const MAX_AGE_MS = 6 * 60 * 60 * 1000; // 6h: cobre um run de reel inteiro sem rearmar.

// Os gates de texto pre-credito. Cada um tem o argv exato do seu CLI. critique nao
// sai com exit!=0 (so imprime gate_aprovado), entao tem leitura especial de stdout.
const GATES = [
  { name: 'identity-quality', args: ['scripts/lib/identity-quality.cjs', 'shotlist'] },
  { name: 'dp-quality', args: ['scripts/lib/dp-quality.cjs', 'shotlist'] },
  { name: 'style-consistency', args: ['scripts/lib/style-consistency.cjs'] },
  { name: 'prompt-structure', args: ['scripts/lib/prompt-structure.cjs'] },
  { name: 'narrative-quality', args: ['scripts/lib/narrative-quality.cjs'] },
  { name: 'angle-variety', args: ['scripts/lib/angle-variety.cjs'] },
  { name: 'identity-trait-carry', args: ['scripts/lib/identity-trait-carry.cjs'] },
  { name: 'negative-prompt-discipline', args: ['scripts/lib/negative-prompt-discipline.cjs'] },
  { name: 'critique', args: ['scripts/lib/critique.cjs'], stdoutGate: true },
];

function sha256File(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

function runGate(gate, shotlistPath, repoRoot) {
  const argv = gate.args.concat([shotlistPath]);
  try {
    const out = execFileSync('node', argv, {
      cwd: repoRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    if (gate.stdoutGate) {
      // critique: exit 0 sempre; o veredito esta em gate_aprovado no stdout.
      let parsed = null;
      try { parsed = JSON.parse(out); } catch (_) { parsed = null; }
      const ok = !!(parsed && parsed.gate_aprovado === true);
      return { name: gate.name, ok, detail: ok ? 'gate_aprovado' : (parsed && parsed.parecer) || 'gate_aprovado:false' };
    }
    return { name: gate.name, ok: true, detail: 'ok' };
  } catch (e) {
    // exit!=0 => gate reprovou (ou erro de execucao). Captura o motivo do stdout.
    let detail = (e && e.stdout) ? String(e.stdout).trim().split('\n').slice(-3).join(' ') : (e && e.message) || 'falha';
    if (gate.stdoutGate) {
      // critique nao deveria cair aqui; se cair, trata como reprovado.
      return { name: gate.name, ok: false, detail: detail || 'critique falhou' };
    }
    return { name: gate.name, ok: false, detail };
  }
}

function runGates(shotlistPath, repoRoot) {
  const abs = path.isAbsolute(shotlistPath) ? shotlistPath : path.join(repoRoot, shotlistPath);
  if (!fs.existsSync(abs)) {
    return { ok: false, gates: [], shotlist_sha256: null, error: `shotlist ausente: ${shotlistPath}` };
  }
  const gates = GATES.map((g) => runGate(g, shotlistPath, repoRoot));
  const ok = gates.every((g) => g.ok);
  return { ok, gates, shotlist_sha256: sha256File(abs) };
}

function tokenPath(repoRoot) {
  return path.join(repoRoot, TOKEN_REL);
}

function armToken(repoRoot, project, shotlistRel, sha, gateNames, nowIso) {
  const token = {
    ok: true,
    project,
    shotlist: shotlistRel,
    shotlist_sha256: sha,
    armed_at: nowIso || new Date().toISOString(),
    gates: gateNames,
  };
  const tp = tokenPath(repoRoot);
  fs.mkdirSync(path.dirname(tp), { recursive: true });
  fs.writeFileSync(tp, JSON.stringify(token, null, 2) + '\n');
  return tp;
}

function clearToken(repoRoot) {
  const tp = tokenPath(repoRoot);
  try { if (fs.existsSync(tp)) fs.unlinkSync(tp); } catch (_) { /* noop */ }
}

function readToken(repoRoot) {
  try {
    return JSON.parse(fs.readFileSync(tokenPath(repoRoot), 'utf8'));
  } catch (_) {
    return null;
  }
}

// O hook usa isto: o token so vale se existe, esta ok, fresco e o hash da shotlist
// referenciada ainda bate (ninguem editou a shotlist depois de armar).
function tokenValid(repoRoot, nowMs) {
  const token = readToken(repoRoot);
  if (!token || token.ok !== true) return { valid: false, reason: 'gate de qualidade nao armado' };
  const armed = Date.parse(token.armed_at);
  const now = typeof nowMs === 'number' ? nowMs : Date.now();
  if (!Number.isFinite(armed) || now - armed > MAX_AGE_MS) {
    return { valid: false, reason: 'token de gate expirado — rearme com preflight-gate' };
  }
  const abs = path.isAbsolute(token.shotlist) ? token.shotlist : path.join(repoRoot, token.shotlist);
  let sha;
  try { sha = sha256File(abs); } catch (_) {
    return { valid: false, reason: 'shotlist do token nao encontrada' };
  }
  if (sha !== token.shotlist_sha256) {
    return { valid: false, reason: 'shotlist mudou apos o gate — rearme com preflight-gate' };
  }
  return { valid: true, reason: 'ok', token };
}

module.exports = {
  GATES, MAX_AGE_MS, TOKEN_REL,
  sha256File, runGates, armToken, clearToken, readToken, tokenValid, tokenPath,
};

if (require.main === module) {
  const argv = process.argv.slice(2);
  let root = null;
  let shotlistOverride = null;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--root') root = argv[++i];
    else if (argv[i] === '--shotlist') shotlistOverride = argv[++i];
  }
  if (!root) {
    console.error('Uso: node scripts/preflight-gate.cjs --root projects/<nome> [--shotlist <arquivo.json>]');
    process.exit(2);
  }
  const repoRoot = process.cwd();
  const shotlistRel = shotlistOverride || path.join(root, 'output', 'shotlist-preflight.json');
  const result = runGates(shotlistRel, repoRoot);

  if (result.error) {
    console.error(`[preflight-gate] ${result.error}`);
    clearToken(repoRoot);
    process.exit(1);
  }

  for (const g of result.gates) {
    console.log(`${g.ok ? 'PASS' : 'FAIL'} ${g.name}${g.ok ? '' : ` :: ${g.detail}`}`);
  }

  if (!result.ok) {
    clearToken(repoRoot);
    console.error('\nGate de qualidade REPROVOU. Nao gere: volte ao prompt-smith/storyboard-director, conserte os criterios acima e rode de novo.');
    process.exit(1);
  }

  const tp = armToken(repoRoot, root, shotlistRel, result.shotlist_sha256, result.gates.map((g) => g.name));
  console.log(`\nGate ARMADO: ${result.gates.length} gates verdes. Token em ${path.relative(repoRoot, tp)}. Geracao liberada para esta shotlist.`);
  process.exit(0);
}
