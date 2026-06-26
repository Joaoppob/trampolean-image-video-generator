#!/usr/bin/env node
'use strict';

const fs = require('fs');

const MAX_TOKENS = 15;

const BANNED_GENERIC = [
  'blurry',
  'low quality',
  'bad anatomy',
  'deformed',
  'disfigured',
  'worst quality',
  'jpeg artifacts',
  'poorly drawn',
  'extra limb',
  'missing limb',
  'mutated',
  'mutation',
  'ugly',
  'gross proportions',
  'poorly rendered',
  'clone',
  'duplicate',
  'out of frame',
  'cropped',
];

function lower(text) {
  return String(text || '').toLowerCase();
}

function tokenCount(text) {
  return String(text || '').split(/[\s,]+/).filter(Boolean).length;
}

function evaluateScene(scene, label) {
  const errors = [];
  const warnings = [];
  const negative = String(scene.negative_prompt || '').trim();

  let score = 100;
  if (negative.length === 0) {
    return { label, score: 100, errors, warnings, token_count: 0 };
  }

  const tokens = tokenCount(negative);
  if (tokens > MAX_TOKENS) {
    errors.push(`${label}: negative prompt com ${tokens} tokens (max ${MAX_TOKENS}) — para modelos Gemini-class, negatives longos degradam a saida`);
    score -= 30 + Math.min(20, (tokens - MAX_TOKENS) * 3);
  }

  const lc = lower(negative);
  const foundGeneric = [];
  for (const term of BANNED_GENERIC) {
    if (lc.includes(term)) foundGeneric.push(term);
  }
  if (foundGeneric.length > 0) {
    errors.push(`${label}: termos genericos SDXL no negative: ${foundGeneric.slice(0, 5).join(', ')} — remova e use so artefatos observados`);
    score -= Math.min(40, foundGeneric.length * 10);
  }

  if (tokens >= 5 && tokens <= MAX_TOKENS && foundGeneric.length === 0) {
    warnings.push(`${label}: negative curto (${tokens} tokens) — ok para Gemini-class se realmente observou esses artefatos`);
  }

  return {
    label,
    score: Math.max(0, Math.min(100, Math.round(score))),
    errors,
    warnings,
    token_count: tokens,
    generic_hits: foundGeneric.length,
  };
}

function evaluateShotlist(shotlist, artifacto = 'inline') {
  const cenas = (Array.isArray(shotlist && shotlist.cenas) ? shotlist.cenas : [])
    .filter((c) => (c.fonte || 'geracao') === 'geracao');

  const errors = [];
  const warnings = [];
  const scenes = [];

  if (cenas.length === 0) {
    return { artifacto, ok: true, score: 100, errors, warnings, scenes };
  }

  let overallOk = true;
  let totalScore = 0;

  for (const cena of cenas) {
    const result = evaluateScene(cena, `cena ${cena.n}`);
    scenes.push(result);
    errors.push(...result.errors);
    warnings.push(...result.warnings);
    totalScore += result.score;
    if (result.errors.length > 0) overallOk = false;
  }

  return {
    artifacto,
    ok: overallOk,
    score: Math.round(totalScore / cenas.length),
    errors,
    warnings,
    scenes,
    generation_scenes: cenas.length,
    max_tokens: MAX_TOKENS,
  };
}

module.exports = { evaluateShotlist };

if (require.main === module) {
  const file = process.argv[2];
  if (!file) {
    console.error('Uso: node scripts/lib/negative-prompt-discipline.cjs <shotlist.json>');
    process.exit(2);
  }
  const shotlist = JSON.parse(fs.readFileSync(file, 'utf8'));
  const result = evaluateShotlist(shotlist, file);
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  if (!result.ok) process.exit(1);
}
