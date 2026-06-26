#!/usr/bin/env node
'use strict';

const fs = require('fs');

const STOPLIST = new Set([
  'same', 'from', 'the', 'with', 'and', 'that', 'this', 'have', 'been', 'into',
  'character', 'reference', 'images', 'image', 'style', 'colors', 'color',
  'frame', 'vertical', 'mobile', 'premium', 'lifestyle', 'product',
  'photography', 'modern', 'clean', 'brand', 'identity', 'warm', 'cool',
  'palette', 'cartoon', 'saturated', 'bold', 'outlines', 'soft', 'shadows',
  'service', 'minimal', 'neutral',
]);

const MIN_TRAITS = 3;

function lower(value) {
  return String(value || '').toLowerCase();
}

function distinctiveTokens(text) {
  return String(text || '')
    .toLowerCase()
    .split(/[^a-z]+/)
    .filter((w) => /^[a-z]+$/.test(w) && w.length >= 4 && !STOPLIST.has(w));
}

function evaluateShotlist(shotlist, artifacto = 'inline') {
  const cenas = (Array.isArray(shotlist && shotlist.cenas) ? shotlist.cenas : [])
    .filter((c) => (c.fonte || 'geracao') === 'geracao');

  const errors = [];
  const warnings = [];
  const scenes = [];

  const anchor = String((shotlist && shotlist.anchor_personagem) || '');
  const anchorTokens = anchor.length > 0 ? distinctiveTokens(anchor) : [];

  if (anchorTokens.length === 0) {
    return {
      artifacto,
      ok: true,
      score: 100,
      errors,
      warnings: ['sem anchor_personagem — trait-carry nao aplicavel'],
      scenes,
    };
  }

  const completeScenes = cenas.filter((c) => c.personagem_visivel === 'completo');
  const partialScenes = cenas.filter((c) => c.personagem_visivel === 'parcial');
  const absentScenes = cenas.filter((c) => !c.personagem_visivel);

  for (const c of partialScenes) {
    scenes.push({ n: c.n, status: 'isento (parcial)', traits_found: 0 });
  }
  for (const c of absentScenes) {
    scenes.push({ n: c.n, status: 'isento (sem personagem)', traits_found: 0 });
  }

  let totalComplete = completeScenes.length;
  let passCount = 0;

  for (const cena of completeScenes) {
    const prompt = lower(cena.prompt || '');
    const traitsFound = [];
    const traitsMissing = [];

    for (const token of anchorTokens) {
      if (prompt.includes(token)) {
        traitsFound.push(token);
      } else {
        traitsMissing.push(token);
      }
    }

    const count = traitsFound.length;
    const ok = count >= MIN_TRAITS;

    scenes.push({ n: cena.n, status: ok ? 'ok' : 'insuficiente', traits_found: count, traits_missing: traitsMissing.slice(0, 5) });

    if (!ok) {
      errors.push(`cena ${cena.n}: personagem completo carrega so ${count} traits do anchor (min ${MIN_TRAITS}); faltam ex.: ${traitsMissing.slice(0, 3).join(', ')}`);
    } else {
      passCount++;
    }
  }

  const score = totalComplete > 0 ? Math.round((passCount / totalComplete) * 100) : 100;

  return {
    artifacto,
    ok: errors.length === 0,
    score: Math.max(0, Math.min(100, Math.round(score))),
    errors,
    warnings,
    scenes,
    anchor_tokens: anchorTokens.length,
    min_traits: MIN_TRAITS,
    generation_scenes: cenas.length,
    complete_scenes: totalComplete,
    passed: passCount,
  };
}

module.exports = { evaluateShotlist };

if (require.main === module) {
  const file = process.argv[2];
  if (!file) {
    console.error('Uso: node scripts/lib/identity-trait-carry.cjs <shotlist.json>');
    process.exit(2);
  }
  const shotlist = JSON.parse(fs.readFileSync(file, 'utf8'));
  const result = evaluateShotlist(shotlist, file);
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  if (!result.ok) process.exit(1);
}
