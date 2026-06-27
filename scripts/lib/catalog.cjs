#!/usr/bin/env node
'use strict';

/**
 * catalog.cjs — catalogo de modelos VIVO (consultado do Higgsfield, nao hardcoded).
 *
 * Resolve duas coisas que JB pediu:
 *  1) O catalogo apresentado antes de gerar vem do Higgsfield REAL (`higgsfield model
 *     list`), nao de um array fixo. Este modulo parseia a saida do CLI e guarda um
 *     cache (`.claude/state/.catalog-cache.json`). O model-advisor le esse cache para
 *     saber QUAIS modelos existem agora; o array hardcoded vira so a camada editorial
 *     (tradeoffs/custo).
 *  2) Garantir que o catalogo foi CONSULTADO antes de cada geracao. Ao atualizar o
 *     cache (ou ao rodar `higgsfield model list`), grava-se um token "visto"
 *     (`.claude/state/.catalog-seen.json`). O hook PreToolUse exige esse token fresco
 *     antes de liberar `higgsfield generate create` — bloqueio mecanico, nao honra.
 */

const fs = require('fs');
const path = require('path');

const CACHE_REL = path.join('.claude', 'state', '.catalog-cache.json');
const SEEN_REL = path.join('.claude', 'state', '.catalog-seen.json');
const SEEN_MAX_AGE_MS = 60 * 60 * 1000; // 1h: o catalogo tem de ter sido consultado neste run

// Reconhece um comando de consulta de catalogo (para o hook carimbar o "visto").
const CATALOG_QUERY_RE = /\b(?:higgsfield|hf)\s+model\s+list\b|refresh-catalog\.cjs/i;

// Parseia a saida tabular de `higgsfield model list [--image|--video]`:
//   slug    Display Name (multi palavra)    type
// Header ("JOB SET TYPE ... NAME ... TYPE") nao casa (type final != midia).
function parseModelList(text) {
  const out = [];
  for (const line of String(text || '').split(/\r?\n/)) {
    const m = line.match(/^([a-z0-9_]+)\s{2,}(.+?)\s{2,}(image|video|text|audio|3d)\s*$/i);
    if (m) out.push({ slug: m[1], display: m[2].trim(), type: m[3].toLowerCase() });
  }
  return out;
}

function cachePath(repoRoot) { return path.join(repoRoot, CACHE_REL); }
function seenPath(repoRoot) { return path.join(repoRoot, SEEN_REL); }

function writeCache(repoRoot, models, nowIso) {
  const payload = { fetched_at: nowIso || new Date().toISOString(), models: models || [] };
  const p = cachePath(repoRoot);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(payload, null, 2) + '\n');
  return p;
}

function readCache(repoRoot) {
  try { return JSON.parse(fs.readFileSync(cachePath(repoRoot), 'utf8')); }
  catch (_) { return null; }
}

function liveSlugs(repoRoot) {
  const c = readCache(repoRoot);
  if (!c || !Array.isArray(c.models)) return null;
  return new Set(c.models.map((m) => String(m.slug).toLowerCase()));
}

function stampSeen(repoRoot, nowIso) {
  const p = seenPath(repoRoot);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify({ seen_at: nowIso || new Date().toISOString() }, null, 2) + '\n');
  return p;
}

function seenFresh(repoRoot, nowMs) {
  let tok;
  try { tok = JSON.parse(fs.readFileSync(seenPath(repoRoot), 'utf8')); }
  catch (_) { return { fresh: false, reason: 'catalogo nao consultado nesta sessao' }; }
  const seen = Date.parse(tok && tok.seen_at);
  const now = typeof nowMs === 'number' ? nowMs : Date.now();
  if (!Number.isFinite(seen) || now - seen > SEEN_MAX_AGE_MS) {
    return { fresh: false, reason: 'consulta de catalogo expirada — rode `higgsfield model list` / refresh-catalog de novo' };
  }
  return { fresh: true, reason: 'ok', seen_at: tok.seen_at };
}

module.exports = {
  CACHE_REL, SEEN_REL, SEEN_MAX_AGE_MS, CATALOG_QUERY_RE,
  parseModelList, cachePath, seenPath, writeCache, readCache, liveSlugs, stampSeen, seenFresh,
};
