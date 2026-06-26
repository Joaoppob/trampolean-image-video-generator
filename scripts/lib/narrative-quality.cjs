#!/usr/bin/env node
'use strict';

const fs = require('fs');

const BAD_HOOK_TERMS = /\b(logo|fade|black|title card|introducing|welcome|corporate intro)\b/i;
const HOOK_TERMS = /\b(hook|gancho|interrupt|reveal|pattern|opener|mid-action)\b/i;
const CLIMAX_TAGS = /\b(climax|payoff|reveal|pico|transformacao|resultado|twist)\b/i;
const CTA_TAGS = /\b(cta|fechamento|closing|end|final|call.to.action|encerramento)\b/i;

function parseTempo(tempo) {
  const m = String(tempo || '').match(/^(\d+)-(\d+)$/);
  if (!m) return null;
  return { start: Number(m[1]), end: Number(m[2]) };
}

function evaluateShotlist(shotlist, artifacto = 'inline') {
  const cenas = (Array.isArray(shotlist && shotlist.cenas) ? shotlist.cenas : [])
    .filter((c) => (c.fonte || 'geracao') === 'geracao');

  const errors = [];
  const warnings = [];
  const totalDuration = shotlist && shotlist.duracao_total_seg || 0;

  if (cenas.length === 0) {
    return {
      artifacto,
      ok: true,
      score: 100,
      errors,
      warnings: ['sem cenas de geracao para avaliar narrativa'],
      scenes: [],
    };
  }

  let score = 100;

  // 1. Hook check: primeira cena nao pode ser logo/fade
  const first = cenas[0];
  const firstTag = String(first.tag || '').toLowerCase();
  const firstIntent = String(first.intencao || '').toLowerCase();
  const firstText = firstTag + ' ' + firstIntent;

  if (BAD_HOOK_TERMS.test(firstText)) {
    errors.push(`cena ${first.n}: abertura com logo/fade/black/title card — troque por hook visual (interrupt/reveal/mid-action no frame 1)`);
    score -= 25;
  }
  if (!HOOK_TERMS.test(firstText) && !CLIMAX_TAGS.test(firstText)) {
    warnings.push(`cena ${first.n}: primeira cena nao tem marcacao explicita de hook/gancho`);
    score -= 8;
  }

  // 2. Beat count: minimo 2 cenas com tags distintas para ter arco
  const allTags = cenas.map((c) => String(c.tag || '').toLowerCase()).filter(Boolean);
  const uniqueTags = new Set(allTags);
  if (uniqueTags.size < 2 && cenas.length >= 2) {
    errors.push('shot-list sem arco narrativo: todas as cenas tem a mesma tag');
    score -= 20;
  }
  if (uniqueTags.size === 1) {
    warnings.push('shot-list de cena unica — narrativa minima, ok para ads ultra-curtos');
    score -= 5;
  }

  // 3. Climax positioning: climax/payoff should be at ~70% of total duration
  if (totalDuration > 0) {
    let climaxStart = null;
    for (const cena of cenas) {
      const tag = String(cena.tag || '').toLowerCase();
      if (CLIMAX_TAGS.test(tag)) {
        const tempo = parseTempo(cena.tempo_seg);
        if (tempo) { climaxStart = tempo.start; break; }
      }
    }
    if (climaxStart !== null) {
      const ratio = climaxStart / totalDuration;
      if (ratio >= 0.80) {
        errors.push(`climax comeca a ${Math.round(ratio * 100)}% da duracao (ideal ~70%); tarde demais, viewer ja abandonou`);
        score -= 25;
      } else if (ratio < 0.20) {
        warnings.push(`climax muito cedo (${Math.round(ratio * 100)}%); considere adiar para ~70% com mais construcao`);
        score -= 10;
      }
    } else if (cenas.length >= 4) {
      warnings.push('shot-list com 4+ cenas sem tag de climax/payoff explicita');
      score -= 8;
    }
  }

  // 4. CTA: deve existir nos ultimos ~20% ou ser a ultima cena
  const last = cenas[cenas.length - 1];
  const lastTag = String(last.tag || '').toLowerCase();
  const hasCta = CTA_TAGS.test(lastTag) || cenas.some((c) => CTA_TAGS.test(String(c.tag || '').toLowerCase()));
  if (!hasCta && cenas.length >= 2) {
    warnings.push('shot-list sem cena de CTA/fechamento — considere adicionar call-to-action');
    score -= 8;
  }

  // 5. Scene count sanity
  if (cenas.length > 10) {
    warnings.push(`shot-list com ${cenas.length} cenas — muitas cenas para ad curto; considere condensar`);
    score -= 5;
  }

  // 6. Tempo coherence: each scene should be roughly 2-6s
  let tempoErrors = 0;
  for (const cena of cenas) {
    const tempo = parseTempo(cena.tempo_seg);
    if (tempo) {
      const dur = tempo.end - tempo.start;
      if (dur < 1) {
        errors.push(`cena ${cena.n}: duracao muito curta (${dur}s)`);
        score -= 10;
        tempoErrors++;
      } else if (dur > 8) {
        warnings.push(`cena ${cena.n}: duracao longa (${dur}s) — corte em 2-6s para short-form`);
        score -= 5;
      }
    }
  }

  // 7. Back-to-back timing: scenes should connect (no gaps)
  let expected = 0;
  for (const cena of cenas) {
    const tempo = parseTempo(cena.tempo_seg);
    if (!tempo) continue;
    if (tempo.start !== expected) {
      warnings.push(`cena ${cena.n}: gap ou overlap de timing (esperado comecar em ${expected}s, comeca em ${tempo.start}s)`);
      score -= 5;
      break;
    }
    expected = tempo.end;
  }

  return {
    artifacto,
    ok: errors.length === 0,
    score: Math.max(0, Math.min(100, Math.round(score))),
    errors,
    warnings,
    scenes: cenas.map((c) => ({ n: c.n, tag: c.tag, tempo: c.tempo_seg })),
    generation_scenes: cenas.length,
    total_duration: totalDuration,
  };
}

module.exports = { evaluateShotlist };

if (require.main === module) {
  const file = process.argv[2];
  if (!file) {
    console.error('Uso: node scripts/lib/narrative-quality.cjs <shotlist.json>');
    process.exit(2);
  }
  const shotlist = JSON.parse(fs.readFileSync(file, 'utf8'));
  const result = evaluateShotlist(shotlist, file);
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  if (!result.ok) process.exit(1);
}
