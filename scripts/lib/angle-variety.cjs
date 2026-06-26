#!/usr/bin/env node
'use strict';

/**
 * angle-variety.cjs — gate de variedade de enquadramento (nivel-100).
 *
 * Lacuna apontada na auditoria: nenhum gate checava angulos/tamanhos de plano. Um
 * reel inteiro em "medium shot, eye-level" passava todos os outros gates. A pesquisa
 * de benchmark é clara: corte = nova informacao; repetir o mesmo plano mata o ritmo.
 *
 * Este gate extrai, de cada cena de geracao, o TAMANHO de plano (wide/medium/close/
 * full/establishing/...) e o ANGULO (low/high/eye/overhead/dutch) do texto de
 * composicao/camera/prompt, e reprova:
 *   - reel com >=4 cenas e menos de 3 tamanhos de plano distintos (monotonia);
 *   - cenas ADJACENTES com plano E angulo identicos (corte que nao muda nada).
 * Alerta (nao reprova) cena sem plano detectavel.
 *
 * Uso: node scripts/lib/angle-variety.cjs <shotlist.json>   (exit 1 se reprova)
 */

const fs = require('fs');

const SHOT_SIZES = [
  { key: 'extreme-wide', re: /\bextreme wide\b|\bextreme-wide\b|\bvista aerea\b/ },
  { key: 'wide', re: /\bwide\b|\bestablishing\b|\blong shot\b|\bplano geral\b|\baberto\b/ },
  { key: 'full', re: /\bfull[- ]body\b|\bfull shot\b|\bcorpo inteiro\b|\bplano inteiro\b/ },
  { key: 'medium', re: /\bmedium\b|\bmid shot\b|\bplano medio\b|\bplano americano\b|\bcowboy shot\b/ },
  { key: 'three-quarter', re: /\bthree-quarter\b|\bthree quarter\b|\b3\/4\b|\bplano tres quartos\b/ },
  { key: 'close', re: /\bclose[- ]?up\b|\bclose\b|\bprimeiro plano\b|\bclose three-quarter\b/ },
  { key: 'macro', re: /\bmacro\b|\binsert\b|\bextreme close\b|\bdetalhe\b/ },
];

const ANGLES = [
  { key: 'low', re: /\blow[- ]angle\b|\bcontra[- ]?plong[ée]e\b|\bcontra-plongee\b|\bfrom below\b|\bworm'?s eye\b/ },
  { key: 'high', re: /\bhigh[- ]angle\b|\bplong[ée]e\b|\bfrom above\b|\bover the shoulder\b/ },
  { key: 'overhead', re: /\boverhead\b|\btop[- ]down\b|\bbird'?s eye\b|\baerial\b/ },
  { key: 'dutch', re: /\bdutch\b|\bcanted\b|\btilted horizon\b/ },
  { key: 'eye', re: /\beye[- ]level\b|\bfront view\b|\bfrontal\b|\bfacing camera\b/ },
];

function lower(v) { return String(v || '').toLowerCase(); }

function sceneText(cena) {
  const cin = cena.cinematografia || {};
  return lower([
    cena.prompt, cena.intencao,
    cin.composicao, cin.camera,
  ].filter(Boolean).join(' '));
}

function detect(list, text) {
  for (const item of list) if (item.re.test(text)) return item.key;
  return null;
}

function evaluateShotlist(shotlist, artifacto = 'inline') {
  const cenas = (Array.isArray(shotlist && shotlist.cenas) ? shotlist.cenas : [])
    .filter((c) => (c.fonte || 'geracao') === 'geracao');

  const errors = [];
  const warnings = [];

  if (cenas.length === 0) {
    return { artifacto, ok: true, score: 100, errors, warnings: ['sem cenas de geracao para avaliar angulos'], scenes: [] };
  }

  const sigs = cenas.map((c) => {
    const t = sceneText(c);
    const size = detect(SHOT_SIZES, t);
    const angle = detect(ANGLES, t);
    if (!size) warnings.push(`cena ${c.n}: tamanho de plano nao declarado (wide/medium/close/full...)`);
    return { n: c.n, size, angle };
  });

  let score = 100;

  // 1. Variedade de tamanhos de plano
  const distinctSizes = new Set(sigs.map((s) => s.size).filter(Boolean));
  if (cenas.length >= 4 && distinctSizes.size < 3) {
    errors.push(`variedade de enquadramento baixa: so ${distinctSizes.size} tamanho(s) de plano distinto(s) em ${cenas.length} cenas (minimo 3) — alterne wide/medium/close/full`);
    score -= 35;
  } else if (cenas.length >= 2 && distinctSizes.size < 2) {
    errors.push('todas as cenas usam o mesmo tamanho de plano — sem variacao de enquadramento');
    score -= 30;
  }

  // 2. Cenas adjacentes com plano E angulo identicos
  for (let i = 1; i < sigs.length; i++) {
    const a = sigs[i - 1];
    const b = sigs[i];
    if (a.size && b.size && a.size === b.size && (a.angle || null) === (b.angle || null)) {
      errors.push(`cenas ${a.n} e ${b.n} adjacentes com mesmo plano/angulo (${a.size}/${a.angle || 'sem-angulo'}) — varie o corte`);
      score -= 20;
    }
  }

  // 3. Variedade de angulos (advisory)
  const distinctAngles = new Set(sigs.map((s) => s.angle).filter(Boolean));
  if (cenas.length >= 4 && distinctAngles.size < 2) {
    warnings.push('pouca variacao de angulo de camera (considere low/high/eye misturados)');
    score -= 8;
  }

  return {
    artifacto,
    ok: errors.length === 0,
    score: Math.max(0, Math.min(100, Math.round(score))),
    errors,
    warnings,
    scenes: sigs,
    distinct_sizes: Array.from(distinctSizes),
    distinct_angles: Array.from(distinctAngles),
    generation_scenes: cenas.length,
  };
}

module.exports = { evaluateShotlist, SHOT_SIZES, ANGLES };

if (require.main === module) {
  const file = process.argv[2];
  if (!file) {
    console.error('Uso: node scripts/lib/angle-variety.cjs <shotlist.json>');
    process.exit(2);
  }
  const shotlist = JSON.parse(fs.readFileSync(file, 'utf8'));
  const result = evaluateShotlist(shotlist, file);
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  if (!result.ok) process.exit(1);
}
