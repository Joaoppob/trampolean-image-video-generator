#!/usr/bin/env node
'use strict';

/**
 * post-render-critique.cjs — gate Tier-3 pós-render (Wave L).
 *
 * As Waves B–K gateiam o PLANO em texto (proxies determinísticos, 0 crédito).
 * Este gate é a altitude que falta: pontuar o STILL/CLIPE *real* depois de gerar.
 * O grupo anti-IA C8-C11 (física, textura, estabilidade, continuidade) "só é
 * observável na imagem renderizada" (RAG/review/rubrica-nivel-100.md §52, item 2).
 *
 * Divisão de trabalho (importante): a PONTUAÇÃO de visão (olhar o pixel e dar a
 * nota 0/50/100 por critério) é do crítico de visão — o Jotaro/`critic`, modelo
 * capaz. Este módulo NÃO faz visão. Ele recebe os scores já atribuídos e aplica a
 * REGRA DE GATE da rubrica de forma determinística e testável por fixture:
 *
 *   "qualquer critério do grupo anti-IA (C8-C11) ≤ 20 → output REPROVADO,
 *    independente da média ponderada" (rubrica §38, REGRA DE GATE).
 *
 * Decide então o veredito: accept | reroll | escalate. O re-roll tem orçamento
 * (`max_attempts`); esgotado, escala ao portão humano (Invariante 7) em vez de
 * queimar crédito num loop. Sem score anti-IA o gate não opera às cegas: escala.
 *
 * Uso (módulo):
 *   const { evaluatePostRender } = require('./post-render-critique.cjs');
 *   const verdict = evaluatePostRender({ artifacto, cena, attempt, max_attempts, scores });
 *
 * Uso (CLI — lê um critique JSON do crítico):
 *   node scripts/lib/post-render-critique.cjs <critique.json>
 *   # exit 0 = accept ; exit 1 = reroll ; exit 2 = escalate / erro de uso
 */

const fs = require('fs');

// Regra de gate da rubrica: anti-IA é o grupo forte (peso 30%); um único tell
// forte (score ≤ HARD_FAIL) reprova o output inteiro.
const ANTI_IA = [
  { key: 'C8', label: 'física do movimento' },
  { key: 'C9', label: 'textura de superfície' },
  { key: 'C10', label: 'estabilidade temporal' },
  { key: 'C11', label: 'continuidade entre cortes' },
];
const HARD_FAIL = 20; // score ≤ 20 num eixo anti-IA → REPROVADO (rubrica §48)
const SOFT_FLOOR = 60; // média anti-IA abaixo disso → passa o gate forte mas alerta

// Grupos e pesos da rubrica (§38) — usados só quando os 16 critérios existem.
const GROUPS = [
  { keys: ['C8', 'C9', 'C10', 'C11'], weight: 0.30 },
  { keys: ['C1', 'C2', 'C3', 'C4'], weight: 0.25 },
  { keys: ['C5', 'C6', 'C7'], weight: 0.15 },
  { keys: ['C12', 'C13'], weight: 0.15 },
  { keys: ['C14', 'C15', 'C16'], weight: 0.15 },
];

function isScore(v) {
  return typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 100;
}

function mean(nums) {
  if (!nums.length) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function weightedTotal(scores) {
  // Só computa se TODOS os 16 critérios (C1-C16) tiverem score válido.
  for (let i = 1; i <= 16; i++) {
    if (!isScore(scores[`C${i}`])) return null;
  }
  let total = 0;
  for (const g of GROUPS) {
    total += mean(g.keys.map((k) => scores[k])) * g.weight;
  }
  return Math.round(total);
}

function evaluatePostRender(input) {
  const {
    artifacto = 'inline',
    cena = null,
    attempt = 1,
    max_attempts = 2,
    scores = {},
  } = input || {};

  const failures = [];
  const warnings = [];

  // 1. Sem todos os scores anti-IA o gate não opera. Não dá para aprovar nem
  //    reprovar às cegas — escala ao humano para olhar o render.
  const missing = ANTI_IA.filter((c) => !isScore(scores[c.key]));
  if (missing.length) {
    for (const c of missing) {
      failures.push(`${c.key} (${c.label}) ausente — o crítico não pontuou este eixo no render`);
    }
    return {
      artifacto,
      cena,
      attempt,
      max_attempts,
      ok: false,
      verdict: 'escalate',
      anti_ia_score: null,
      weighted_total: null,
      failures,
      warnings,
      reroll_reason: null,
    };
  }

  const antiScores = ANTI_IA.map((c) => scores[c.key]);
  const antiIaScore = Math.round(mean(antiScores));
  const weighted = weightedTotal(scores);

  // 2. Regra de gate forte: qualquer eixo anti-IA ≤ HARD_FAIL reprova.
  const hardFails = ANTI_IA.filter((c) => scores[c.key] <= HARD_FAIL);
  for (const c of hardFails) {
    failures.push(`${c.key} (${c.label}) = ${scores[c.key]} ≤ ${HARD_FAIL} → tell forte de IA, output reprovado`);
  }

  if (hardFails.length) {
    const hasBudget = attempt < max_attempts;
    const reason = `tell(s) anti-IA: ${hardFails.map((c) => c.key).join(', ')}`;
    return {
      artifacto,
      cena,
      attempt,
      max_attempts,
      ok: false,
      verdict: hasBudget ? 'reroll' : 'escalate',
      anti_ia_score: antiIaScore,
      weighted_total: weighted,
      failures,
      warnings: hasBudget
        ? warnings
        : warnings.concat(`budget de re-roll esgotado (tentativa ${attempt}/${max_attempts}) — portão humano decide (Invariante 7)`),
      reroll_reason: hasBudget ? reason : null,
    };
  }

  // 3. Passou o gate forte. Média medíocre vira alerta advisory, não bloqueio
  //    (evita loop infinito de re-roll em render aprovável-porém-mediano).
  if (antiIaScore < SOFT_FLOOR) {
    warnings.push(`qualidade anti-IA medíocre (média ${antiIaScore} < ${SOFT_FLOOR}); aceitável, mas considere re-roll se houver crédito`);
  }

  return {
    artifacto,
    cena,
    attempt,
    max_attempts,
    ok: true,
    verdict: 'accept',
    anti_ia_score: antiIaScore,
    weighted_total: weighted,
    failures,
    warnings,
    reroll_reason: null,
  };
}

module.exports = { evaluatePostRender, ANTI_IA, HARD_FAIL, SOFT_FLOOR };

if (require.main === module) {
  const file = process.argv[2];
  if (!file) {
    console.error('Uso: node scripts/lib/post-render-critique.cjs <critique.json>');
    console.error('  critique.json: { artifacto, cena, attempt, max_attempts, scores:{C8..C11[,C1..C16]} }');
    process.exit(2);
  }
  let critique;
  try {
    critique = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {
    console.error(`post-render-critique: entrada inválida (${e.message})`);
    process.exit(2);
  }
  const result = evaluatePostRender(critique);
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  // exit code carrega o veredito para o orquestrador: 0 accept, 1 reroll, 2 escalate.
  if (result.verdict === 'accept') process.exit(0);
  if (result.verdict === 'reroll') process.exit(1);
  process.exit(2);
}
