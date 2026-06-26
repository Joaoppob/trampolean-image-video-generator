#!/usr/bin/env node
'use strict';

const fs = require('fs');

const QUALITY_WORDS = [
  '8k',
  'ultra realistic',
  'ultra-realistic',
  'photoreal',
  'photorealistic',
  'masterpiece',
  'best quality',
  'award-winning',
  'cinematic',
  'beautiful',
  'premium colors',
];

const CAMERA_MOVES = [
  'static',
  'locked-off',
  'locked off',
  'push-in',
  'push in',
  'dolly',
  'track',
  'tracking',
  'pan',
  'tilt',
  'orbit',
  'arc',
  'crane',
  'pullback',
  'handheld',
  'gimbal',
  'whip pan',
  'zoom',
];

function lower(value) {
  return String(value || '').toLowerCase();
}

function hasAny(text, patterns) {
  return patterns.some((p) => p.test(text));
}

function countHits(text, patterns) {
  return patterns.filter((p) => p.test(text)).length;
}

function qualityHits(text) {
  const t = lower(text);
  return QUALITY_WORDS.filter((w) => t.includes(w));
}

function cameraMoveHits(text) {
  const t = lower(text);
  return CAMERA_MOVES.filter((move) => t.includes(move));
}

function sceneText(scene) {
  return [
    scene && scene.objetivo_visual,
    scene && scene.frame_1,
    scene && scene.luz,
    scene && scene.composicao,
    scene && scene.camera,
    scene && scene.cor,
    JSON.stringify((scene && scene.anti_ia) || {}),
  ].join(' ');
}

function scoreResult(artifacto, score, errors, warnings, extra) {
  return Object.assign({
    artifacto,
    ok: errors.length === 0,
    score: Math.max(0, Math.min(100, Math.round(score))),
    errors,
    warnings,
  }, extra || {});
}

function evaluateDpScene(scene, label) {
  const errors = [];
  const warnings = [];
  let score = 100;

  const text = lower(sceneText(scene));
  const light = lower(scene && scene.luz);
  const composition = lower(scene && scene.composicao);
  const camera = lower(scene && scene.camera);
  const color = lower(scene && scene.cor);
  const frame1 = lower(scene && scene.frame_1);
  const antiAvoid = Array.isArray(scene && scene.anti_ia && scene.anti_ia.evitar)
    ? scene.anti_ia.evitar.join(' ')
    : '';
  const antiFocus = Array.isArray(scene && scene.anti_ia && scene.anti_ia.foco)
    ? scene.anti_ia.foco.join(' ')
    : '';

  const lightHits = countHits(light, [
    /\bmotivated\b|\bmotivada\b|\bpractical\b|\bwindow\b|\bjanela\b|\btungsten\b|\bdaylight\b|\bgolden hour\b|\bneon\b/,
    /\bcamera-left\b|\bcamera right\b|\bframe left\b|\bframe right\b|\blateral\b|\bside\b|\bbacklight\b|\brim\b/,
    /\b[0-9]{4}k\b|\b3200k\b|\b5600k\b|\b6500k\b|\bcontrast\b|\bcontraste\b|\b4:1\b|\b8:1\b/,
    /\bshadow\b|\bsombra\b|\bfalloff\b|\bkey\b|\bfill\b|\brim\b/,
  ]);
  if (lightHits < 3) {
    errors.push(`${label}: luz generica; declare fonte motivada, direcao e contraste/Kelvin`);
    score -= 30;
  }
  if (/\bbeautiful\b|\bgood lighting\b|\bcinematic lighting\b|\bluz bonita\b/.test(light)) {
    errors.push(`${label}: luz usa adjetivo vazio em vez de fonte/direcao`);
    score -= 20;
  }

  const safeComposition = hasAny(composition + ' ' + frame1, [
    /\by=220-1440\b/,
    /\bsafe[- ]?zone\b/,
    /\bmiddle 60%\b/,
    /\bcentral safe\b/,
    /\bfaixa central\b/,
    /\btop and bottom thirds\b/,
    /\btopo\/base\b/,
  ]);
  if (!/9:16/.test(composition + ' ' + frame1) || !safeComposition) {
    errors.push(`${label}: composicao 9:16 sem safe-zone central (ex.: Y=220-1440 ou middle 60%)`);
    score -= 25;
  }

  const moves = cameraMoveHits(camera);
  if (moves.length === 0) {
    errors.push(`${label}: camera sem movimento/estado nomeado`);
    score -= 20;
  }
  const uniqueMoves = new Set(moves);
  if (uniqueMoves.size > 2 && !/\bthen\b|\bdepois\b|\bstart\b/.test(camera)) {
    errors.push(`${label}: camera mistura movimentos demais; use um movimento por shot ou beats sequenciais`);
    score -= 20;
  }
  const forbidsDrift = /\bno random\b.*\bdrift\b|\bno\b.*\bdrift\b|\bsem\b.*\bdrift\b|\bsem\b.*\bflutu/.test(camera);
  if (!forbidsDrift && (/\brandom\b|\baleator/i.test(camera) || /\bdrift\b|\bflutu/.test(camera))) {
    errors.push(`${label}: camera admite drift/flutuacao`);
    score -= 20;
  }

  const colorHits = countHits(color, [
    /\bgrade\b|\bgrading\b|\bemulation\b|\bfilm\b|\banalog\b|\bbleach\b|\bteal\b|\bamber\b|\bcyan\b|\bmagenta\b/,
    /\blifted blacks\b|\b3-8%\b|\bcontrolled highlights\b|\bsaturation controlled\b|\bdessaturad/,
    /\bpalette\b|\bpaleta\b|\bwarm\b|\bcool\b|\bshadows\b|\bhighlights\b/,
  ]);
  if (colorHits < 2) {
    errors.push(`${label}: cor/grading generico; nomeie grade, hierarquia de cor e controle de highlights`);
    score -= 20;
  }

  const antiText = lower(`${antiAvoid} ${antiFocus}`);
  if (!hasAny(antiText, [
    /\bflat\b|\bfrontal\b|\bplastic\b|\bplastica\b|\bplastica\b|\bwaxy\b|\bdrift\b|\bflicker\b|\bmorph\b/,
  ]) || !hasAny(antiText, [
    /\bcontact shadows\b|\bsombras de contato\b|\btexture\b|\btextura\b|\bphysical\b|\bpeso\b|\bstable\b|\bestavel\b/,
  ])) {
    errors.push(`${label}: anti_ia precisa evitar tells concretos e focar fisica/textura/estabilidade`);
    score -= 20;
  }

  const qHits = qualityHits(text);
  if (qHits.length) {
    warnings.push(`${label}: quality-words encontradas: ${qHits.join(', ')}`);
    score -= Math.min(20, qHits.length * 5);
  }

  return {
    score: Math.max(0, Math.min(100, Math.round(score))),
    errors,
    warnings,
    moves: Array.from(uniqueMoves),
  };
}

function evaluateCinematography(plan, artifacto = 'cinematografia') {
  const errors = [];
  const warnings = [];
  const cenas = Array.isArray(plan && plan.cenas) ? plan.cenas : [];
  if (!cenas.length) {
    errors.push('cinematografia sem cenas');
    return scoreResult(artifacto, 0, errors, warnings, { scenes: [] });
  }

  const sceneResults = cenas.map((scene) => {
    const label = `cena ${scene && scene.n !== undefined ? scene.n : '?'}`;
    return Object.assign({ n: scene && scene.n }, evaluateDpScene(scene, label));
  });
  for (const result of sceneResults) {
    errors.push(...result.errors);
    warnings.push(...result.warnings);
  }
  const avg = sceneResults.reduce((sum, result) => sum + result.score, 0) / sceneResults.length;
  const global = lower(plan && plan.diretriz_global);
  const hasStyleBlock = /style block|bloco|travado|repetid|coerencia|coerência/.test(global);
  const score = avg - (hasStyleBlock ? 0 : 8);
  if (!hasStyleBlock) warnings.push('diretriz_global nao explicita style block travado para a serie');

  return scoreResult(artifacto, score, errors, warnings, { scenes: sceneResults });
}

function evaluateShotlistDp(shotlist, artifacto = 'shotlist-dp') {
  const errors = [];
  const warnings = [];
  const cenas = Array.isArray(shotlist && shotlist.cenas) ? shotlist.cenas : [];
  const generated = cenas.filter((scene) => (scene.fonte || 'geracao') === 'geracao');
  if (!generated.length) return scoreResult(artifacto, 100, errors, warnings, { generation_scenes: 0 });

  let score = 100;
  const dpScenes = [];
  for (const scene of generated) {
    if (!scene.cinematografia || typeof scene.cinematografia !== 'object') {
      errors.push(`cena ${scene.n}: cena de geracao sem bloco cinematografia`);
      score -= 30;
      continue;
    }
    const result = evaluateDpScene(scene.cinematografia, `cena ${scene.n}`);
    dpScenes.push(Object.assign({ n: scene.n }, result));
    errors.push(...result.errors);
    warnings.push(...result.warnings);
    score -= Math.max(0, 100 - result.score) * 0.35;

    const prompt = lower(scene.prompt);
    if (!/9:16/.test(prompt) || !hasAny(prompt, [/\bsafe[- ]?zone\b/, /\bmiddle 60%\b/, /\btop and bottom\b/, /\bclean top\b/])) {
      errors.push(`cena ${scene.n}: prompt nao preserva composicao segura 9:16 do bloco DP`);
      score -= 15;
    }
    if (!hasAny(prompt, [/\bmotivated\b/, /\bpractical\b/, /\b3200k\b/, /\b5600k\b/, /\bcamera-left\b/, /\bframe left\b/, /\bside key\b/])) {
      errors.push(`cena ${scene.n}: prompt nao preserva luz motivada do bloco DP`);
      score -= 15;
    }
    if (!hasAny(prompt, [/\bgrade\b/, /\bemulation\b/, /\blifted blacks\b/, /\bcontrolled highlights\b/, /\bamber\b/, /\bteal\b/])) {
      errors.push(`cena ${scene.n}: prompt nao preserva cor/grading do bloco DP`);
      score -= 10;
    }
  }

  return scoreResult(artifacto, score, errors, warnings, {
    generation_scenes: generated.length,
    scenes: dpScenes,
  });
}

module.exports = {
  evaluateCinematography,
  evaluateShotlistDp,
};

if (require.main === module) {
  const mode = process.argv[2];
  const file = process.argv[3];
  if (!file || (mode !== 'cinematografia' && mode !== 'shotlist')) {
    console.error('Uso: node scripts/lib/dp-quality.cjs cinematografia|shotlist <arquivo.json>');
    process.exit(2);
  }
  const json = JSON.parse(fs.readFileSync(file, 'utf8'));
  const result = mode === 'cinematografia'
    ? evaluateCinematography(json, file)
    : evaluateShotlistDp(json, file);
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  if (!result.ok) process.exit(1);
}
