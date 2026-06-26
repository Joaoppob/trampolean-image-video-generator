#!/usr/bin/env node
'use strict';

const fs = require('fs');

const ANTI_IA_IDS = new Set(['C8', 'C9', 'C10', 'C11']);
const GATE_LIMIAR = 20;

const GROUP_WEIGHTS = {
  anti_ia: 0.30,
  luz_cor: 0.25,
  composicao_camera: 0.15,
  ad_vertical: 0.15,
  arte_sujeito_coerencia: 0.15,
};

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
  'supersaturated',
];

const STOPLIST = new Set([
  'same', 'from', 'the', 'with', 'and', 'character', 'reference', 'images',
  'image', 'style', 'colors', 'color', 'frame', 'vertical', 'mobile',
  'premium', 'lifestyle', 'product', 'photography', 'modern', 'clean',
  'brand', 'identity', 'warm', 'cool', 'palette',
]);

function clamp(n) {
  return Math.max(0, Math.min(100, Math.round(n)));
}

function lower(s) {
  return String(s || '').toLowerCase();
}

function sceneText(cena) {
  return [
    cena.tag,
    cena.intencao,
    cena.prompt,
    JSON.stringify(cena.cinematografia || {}),
    JSON.stringify(cena.anti_ia || {}),
  ].join(' ');
}

function scenePenaltyText(cena) {
  return [
    cena.tag,
    cena.intencao,
    cena.prompt,
    JSON.stringify(cena.cinematografia || {}),
  ].join(' ');
}

function hasAny(text, patterns) {
  return patterns.some((p) => p.test(text));
}

function countQualityWords(text) {
  const t = lower(text);
  return QUALITY_WORDS.filter((w) => t.includes(w)).length;
}

function distinctiveTokens(text) {
  return String(text || '')
    .toLowerCase()
    .split(/[^a-z]+/)
    .filter((w) => /^[a-z]+$/.test(w) && w.length >= 4 && !STOPLIST.has(w));
}

function ratioScore(cenas, predicate, emptyScore = 0) {
  if (!Array.isArray(cenas) || cenas.length === 0) return emptyScore;
  const hits = cenas.filter(predicate).length;
  return clamp((hits / cenas.length) * 100);
}

function scoreWithPenalty(base, penalty) {
  return clamp(base - penalty);
}

function criterio(id, grupo, score, evidencia, acao) {
  return {
    id,
    grupo,
    score: clamp(score),
    evidencia,
    acao,
  };
}

function parseTempo(tempo) {
  const m = String(tempo || '').match(/^([0-9]+)-([0-9]+)$/);
  if (!m) return null;
  return { start: Number(m[1]), end: Number(m[2]) };
}

function weightedScore(criterios) {
  let total = 0;
  for (const [grupo, peso] of Object.entries(GROUP_WEIGHTS)) {
    const subset = criterios.filter((c) => c.grupo === grupo);
    if (subset.length === 0) continue;
    const avg = subset.reduce((sum, c) => sum + c.score, 0) / subset.length;
    total += avg * peso;
  }
  return clamp(total);
}

function evaluateShotlist(shotlist, artifacto = 'inline') {
  const cenas = Array.isArray(shotlist && shotlist.cenas) ? shotlist.cenas : [];
  const allText = lower([
    shotlist && shotlist.anchor_personagem,
    shotlist && shotlist.formato,
    JSON.stringify(cenas),
  ].join(' '));
  const penaltyText = lower([
    shotlist && shotlist.anchor_personagem,
    shotlist && shotlist.formato,
    cenas.map(scenePenaltyText).join(' '),
  ].join(' '));
  const qualityHits = countQualityWords(allText);
  const refs = Array.isArray(shotlist && shotlist.referencias_obrigatorias)
    ? shotlist.referencias_obrigatorias
    : [];
  const anchor = String((shotlist && shotlist.anchor_personagem) || '');
  const anchorTokens = distinctiveTokens(anchor);
  const completeScenes = cenas.filter((c) => c.personagem_visivel === 'completo');

  const c1 = ratioScore(cenas, (c) => hasAny(lower(sceneText(c)), [
    /\bside key\b/, /\bkey light\b/, /\bwindow light\b/, /\bframe left\b/,
    /\bframe right\b/, /\bgolden hour\b/, /\bsunrise\b/, /\bsunset\b/,
    /\bnatural daylight\b/, /\bpractical light\b/,
  ]), 0);

  const c2 = scoreWithPenalty(ratioScore(cenas, (c) => hasAny(lower(sceneText(c)), [
    /\bside\b/, /\blateral\b/, /\bbacklight\b/, /\brim\b/, /\bshadow\b/,
    /\bcontact shadows\b/, /\bseparation\b/, /\bchiaroscuro\b/,
  ]), 0), /\bflat frontal\b/.test(allText) ? 40 : 0);

  const c3 = ratioScore(cenas, (c) => hasAny(lower(sceneText(c)), [
    /\bcontrast\b/, /\bshadow\b/, /\blow-key\b/, /\bhigh-key\b/,
    /\bdark\b/, /\bbright\b/, /\bhighlight\b/, /\bcool .*shadow\b/,
  ]), 40);

  const c4 = scoreWithPenalty(ratioScore(cenas, (c) => hasAny(lower(sceneText(c)), [
    /\bpalette\b/, /\bpaleta\b/, /\bamber\b/, /\bviolet\b/, /\bwarm\b/,
    /\bcool\b/, /\bgrading\b/, /\bgrade\b/, /\bsaturation controlled\b/,
  ]), 30), allText.includes('supersaturated') ? 30 : 0);

  const c5 = ratioScore(cenas, (c) => hasAny(lower(sceneText(c)), [
    /\bdepth\b/, /\bforeground\b/, /\bbackground\b/, /\blayered\b/,
    /\blayers\b/, /\bparallax\b/, /\bshallow\b/, /\bdeep\b/, /\bmacro\b/,
  ]), 35);

  const c6 = ratioScore(cenas, (c) => hasAny(lower(sceneText(c)), [
    /\bcentral\b/, /\bcentered\b/, /\bnegative space\b/, /\bsafe\b/,
    /\bvertical\b/, /\bleading\b/, /\bempty space\b/, /\bcomposition\b/,
  ]), 35);

  const cameraDeclared = ratioScore(cenas, (c) => hasAny(lower(sceneText(c)), [
    /\bpush-in\b/, /\bpush in\b/, /\breveal\b/, /\bone movement\b/,
    /\bmotivated\b/, /\btracking\b/, /\bpan\b/, /\bcamera\b/,
  ]), 45);
  const c7 = scoreWithPenalty(cameraDeclared, /\brandom (camera )?(drift|motion)\b/.test(penaltyText) ? 55 : 0);

  let c8 = ratioScore(cenas, (c) => hasAny(lower(sceneText(c)), [
    /\bgrounded\b/, /\bcontact shadows\b/, /\bphysical weight\b/,
    /\bweight\b/, /\binertia\b/, /\bcoherent shadows\b/, /\bcause\b/,
  ]), 45);
  if (/\bfloating\b|\bfloat\b|\brandom motion\b|\bphysics breaking\b/.test(penaltyText)) c8 = Math.min(c8, 15);

  let c9 = ratioScore(cenas, (c) => hasAny(lower(sceneText(c)), [
    /\btexture\b/, /\bmatte\b/, /\bfabric\b/, /\bpores\b/, /\bfibers?\b/,
    /\bmaterial\b/, /\bsurface\b/, /\bgrain\b/, /\bscuff\b/,
  ]), 35);
  if (/\bplastic\b|\bwaxy\b|\bover-smoothed\b/.test(penaltyText)) c9 = Math.min(c9, 15);
  if (qualityHits >= 3) c9 = Math.min(c9, 20);

  let anchorCoverage = 0;
  if (completeScenes.length === 0) {
    anchorCoverage = refs.length > 0 && anchor.length >= 40 ? 70 : 35;
  } else {
    const hits = completeScenes.filter((c) => {
      const prompt = lower(c.prompt || '');
      let count = 0;
      for (const token of anchorTokens) {
        if (prompt.includes(token)) count += 1;
      }
      return count >= 3;
    }).length;
    anchorCoverage = clamp((hits / completeScenes.length) * 100);
  }
  let c10 = Math.min(anchorCoverage, refs.length > 0 ? 100 : 35);
  if (/\bmorph|garbled|wrong hands|floating hands|flicker\b/.test(penaltyText)) c10 = Math.min(c10, 15);
  if (qualityHits >= 3 && refs.length === 0) c10 = Math.min(c10, 20);

  let c11 = 50;
  if (cenas.length > 1 && refs.length > 0 && anchor.length >= 80) c11 = 75;
  if (cenas.length > 1 && completeScenes.length > 0 && anchorCoverage >= 80) c11 = 85;
  if (refs.length === 0 || /\beach cut.*other world\b/.test(allText)) c11 = Math.min(c11, 25);

  const first = cenas[0] || {};
  const firstText = lower(sceneText(first));
  let c12 = /hook|gancho/.test(lower(first.tag || first.beat_narrativo || '')) ? 80 : 45;
  if (/\blogo intro|slow logo|fade|black frame|title card/.test(firstText)) c12 = 15;
  if (/\bframe 1\b|\bfirst frame\b|\breveal\b|\bthreat\b/.test(firstText)) c12 = Math.max(c12, 85);

  let timingOk = true;
  let expected = 0;
  for (const cena of cenas) {
    const tempo = parseTempo(cena.tempo_seg);
    if (!tempo || tempo.start !== expected || tempo.end <= tempo.start || tempo.end - tempo.start > 4) {
      timingOk = false;
      break;
    }
    expected = tempo.end;
  }
  const variedTags = new Set(cenas.map((c) => c.tag).filter(Boolean)).size;
  const c13 = clamp((timingOk ? 60 : 25) + Math.min(30, variedTags * 6) + (cenas.length >= 2 ? 10 : 0));

  let c14 = 60;
  if (/\bclean\b|\buncluttered\b|\bempty space\b|\brestrict/.test(allText)) c14 += 20;
  if (/\brandom props\b|\bcluttered\b|\btoo many\b/.test(allText)) c14 -= 35;
  c14 = clamp(c14);

  let c15 = 45;
  if (anchorTokens.length >= 6) c15 += 25;
  if (/\bemotion|nuance|presence|hero pose|candid|relaxed|tense\b/.test(allText)) c15 += 20;
  if (/\bgeneric character\b|\bsoulless\b|\buncanny\b/.test(allText)) c15 -= 35;
  c15 = clamp(c15);

  const c16 = scoreWithPenalty((c1 + c4 + c6 + c10 + c12 + c13 + c14) / 7, qualityHits * 5);

  const criterios = [
    criterio('C1', 'luz_cor', c1, 'Proxy textual: fonte e direcao de luz declaradas por cena.', c1 >= 70 ? 'manter' : 'nomear fonte de luz'),
    criterio('C2', 'luz_cor', c2, 'Proxy textual: luz modela o sujeito com sombra, side/back/rim ou separacao.', c2 >= 70 ? 'manter' : 'evitar luz frontal chapada'),
    criterio('C3', 'luz_cor', c3, 'Proxy textual: contraste e relacao highlight/shadow aparecem no plano.', c3 >= 70 ? 'manter' : 'declarar contraste'),
    criterio('C4', 'luz_cor', c4, 'Proxy textual: paleta ou grade de cor aparece sem saturacao plastica.', c4 >= 70 ? 'manter' : 'nomear paleta/grade'),
    criterio('C5', 'composicao_camera', c5, 'Proxy textual: profundidade, camadas, foreground/background ou DoF foram declarados.', c5 >= 70 ? 'manter' : 'declarar profundidade'),
    criterio('C6', 'composicao_camera', c6, 'Proxy textual: composicao vertical, safe area ou negative space foram declarados.', c6 >= 70 ? 'manter' : 'declarar composicao'),
    criterio('C7', 'composicao_camera', c7, 'Proxy textual: movimento de camera e motivacao aparecem sem drift aleatorio.', c7 >= 70 ? 'manter' : 'usar um movimento motivado'),
    criterio('C8', 'anti_ia', c8, 'Proxy textual: peso fisico, sombras de contato e groundedness defendem fisica.', c8 > GATE_LIMIAR ? 'ver pos-render' : 'reprovar antes do credito'),
    criterio('C9', 'anti_ia', c9, 'Proxy textual: textura/materialidade aparece e quality-words nao dominam.', c9 > GATE_LIMIAR ? 'ver pos-render' : 'reprovar antes do credito'),
    criterio('C10', 'anti_ia', c10, 'Proxy textual: refs e anchor com tracos defendem estabilidade temporal.', c10 > GATE_LIMIAR ? 'ver pos-render' : 'reprovar antes do credito'),
    criterio('C11', 'anti_ia', c11, 'Proxy textual: continuidade depende de refs, anchor e carry entre cenas.', c11 > GATE_LIMIAR ? 'ver pos-render' : 'reprovar antes do credito'),
    criterio('C12', 'ad_vertical', c12, 'Proxy textual: primeira cena carrega hook no frame 1 sem logo/fade lento.', c12 >= 70 ? 'manter' : 'abrir com interrupt/reveal'),
    criterio('C13', 'ad_vertical', c13, 'Proxy textual: timing curto e tags variadas indicam micro-pacing.', c13 >= 70 ? 'manter' : 'apertar cortes'),
    criterio('C14', 'arte_sujeito_coerencia', c14, 'Proxy textual: direcao de arte evita ruido e preserva espaco limpo.', c14 >= 70 ? 'manter' : 'restringir props'),
    criterio('C15', 'arte_sujeito_coerencia', c15, 'Proxy textual: casting/sujeito tem tracos e presenca, nao generico.', c15 >= 70 ? 'manter' : 'dar nuance ao sujeito'),
    criterio('C16', 'arte_sujeito_coerencia', c16, 'Proxy textual: coerencia global agrega luz, cor, composicao, anchor e hook.', c16 >= 70 ? 'manter' : 'reduzir incoerencias'),
  ];

  const reprovadoPor = criterios
    .filter((c) => ANTI_IA_IDS.has(c.id) && c.score <= GATE_LIMIAR)
    .map((c) => c.id);
  const score = weightedScore(criterios);

  return {
    artifacto,
    etapa: 'plano',
    score_ponderado: score,
    gate_aprovado: reprovadoPor.length === 0,
    criterios,
    gate_anti_ia: {
      limiar: GATE_LIMIAR,
      criterios: ['C8', 'C9', 'C10', 'C11'],
      reprovado_por: reprovadoPor,
    },
    parecer: reprovadoPor.length
      ? `Reprovado antes de gastar credito: tells textuais em ${reprovadoPor.join(', ')}.`
      : `Aprovado como plano textual com score ${score}; gate anti-IA real ainda depende do render.`,
  };
}

module.exports = { evaluateShotlist };

if (require.main === module) {
  const file = process.argv[2];
  if (!file) {
    console.error('Uso: node scripts/lib/critique.cjs <shotlist.json>');
    process.exit(2);
  }
  const shotlist = JSON.parse(fs.readFileSync(file, 'utf8'));
  process.stdout.write(`${JSON.stringify(evaluateShotlist(shotlist, file), null, 2)}\n`);
}
