#!/usr/bin/env node
'use strict';

const fs = require('fs');

const STYLE_FIELDS = ['film_stock', 'lente', 'grade_cor', 'grao'];

function lower(value) {
  return String(value || '').toLowerCase();
}

function extractStyle(cena) {
  const dp = cena.cinematografia && typeof cena.cinematografia === 'object' ? cena.cinematografia : {};
  const prompt = lower(cena.prompt || '');
  const style = {};
  let present = 0;

  for (const field of STYLE_FIELDS) {
    const val = dp[field];
    if (val && String(val).trim().length > 0) {
      style[field] = lower(val);
      present += 1;
    } else {
      style[field] = null;
    }
  }

  if (present === 0) {
    const promptHints = inferFromPrompt(prompt);
    Object.assign(style, promptHints);
    present = Object.values(style).filter(Boolean).length;
  }

  return { style, present };
}

function inferFromPrompt(prompt) {
  const hints = {};
  const filmStocks = [
    'kodak gold 200', 'kodak portra 400', 'portra 400', 'kodak portra 800', 'portra 800',
    'ektachrome', 'ektar', 'ilford hp5', 'hp5', 'pro 400h', 'fuji pro 400h',
    'cinestill 800t', 'cinestill',
  ];
  for (const fs of filmStocks) {
    if (prompt.includes(fs)) { hints.film_stock = fs; break; }
  }

  const lenses = ['50mm', '85mm', '35mm', '24mm', '135mm', '28mm', '70-200mm', 'macro'];
  for (const l of lenses) {
    if (prompt.includes(l)) { hints.lente = l; break; }
  }

  const grades = [
    'warm muted', 'cool teal', 'amber', 'teal and orange', 'bleach bypass',
    'lifted blacks', 'desaturated', 'muted', 'low contrast',
  ];
  for (const g of grades) {
    if (prompt.includes(g)) { hints.grade_cor = g; break; }
  }

  const grains = ['fine grain', 'film grain', 'analog grain', 'heavy grain', '16mm grain', '8mm grain'];
  for (const gr of grains) {
    if (prompt.includes(gr)) { hints.grao = gr; break; }
  }

  return hints;
}

function styleFingerprint(style) {
  return STYLE_FIELDS.map((f) => style[f] || '-').join('|');
}

function evaluateShotlist(shotlist, artifacto = 'inline') {
  const cenas = (Array.isArray(shotlist && shotlist.cenas) ? shotlist.cenas : [])
    .filter((c) => (c.fonte || 'geracao') === 'geracao');

  const errors = [];
  const warnings = [];
  const scenes = [];

  if (cenas.length === 0) {
    return {
      artifacto,
      ok: true,
      score: 100,
      errors,
      warnings: ['sem cenas de geracao para comparar estilo'],
      scenes,
    };
  }

  let baseline = null;

  for (let i = 0; i < cenas.length; i++) {
    const cena = cenas[i];
    const { style, present } = extractStyle(cena);
    const fp = styleFingerprint(style);
    scenes.push({ n: cena.n, fingerprint: fp, present });

    if (present === 0) {
      if (i === 0) {
        warnings.push(`cena ${cena.n}: bloco de estilo ausente (cinematografia sem ${STYLE_FIELDS.join(', ')})`);
      } else {
        errors.push(`cena ${cena.n}: bloco de estilo ausente (cinematografia sem ${STYLE_FIELDS.join(', ')})`);
      }
    }

    if (i === 0) {
      baseline = fp;
      continue;
    }

    if (fp !== baseline) {
      const baselineScene = scenes.find((s) => s.n === cenas[0].n);
      errors.push(`cena ${cena.n}: estilo divergente da cena ${cenas[0].n} (esperado: ${baseline || '?'}, recebido: ${fp})`);
    }
  }

  const genCount = cenas.length;
  const driftCount = errors.filter((e) => /divergente/.test(e)).length;
  const absentCount = errors.filter((e) => /ausente/.test(e)).length;
  let score = 100;

  if (driftCount > 0) {
    score -= Math.min(60, driftCount * 30);
  }
  if (absentCount > 0) {
    score -= Math.min(40, absentCount * 20);
  }

  return {
    artifacto,
    ok: errors.length === 0,
    score: Math.max(0, Math.min(100, Math.round(score))),
    errors,
    warnings,
    scenes,
    generation_scenes: genCount,
  };
}

module.exports = { evaluateShotlist };

if (require.main === module) {
  const file = process.argv[2];
  if (!file) {
    console.error('Uso: node scripts/lib/style-consistency.cjs <shotlist.json>');
    process.exit(2);
  }
  const shotlist = JSON.parse(fs.readFileSync(file, 'utf8'));
  const result = evaluateShotlist(shotlist, file);
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  if (!result.ok) process.exit(1);
}
