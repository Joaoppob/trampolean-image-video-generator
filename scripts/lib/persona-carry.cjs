#!/usr/bin/env node
'use strict';

/**
 * persona-carry.cjs — gate de fidelidade de PERSONA (nivel-100).
 *
 * Lacuna apontada na auditoria #1: a fidelidade visual (rosto/traços) tinha lastro
 * (identity-quality + identity-trait-carry), mas "personalidade / mundo / realidade"
 * do personagem nao existia como dado nem como gate — vivia so na prosa. Este gate
 * fecha isso: espelha o identity-trait-carry, mas para CUES DE PERSONA (jeito, mundo,
 * voz, comportamento), nao traços físicos.
 *
 * Como funciona: a shot-list pode trazer um bloco opcional `personas` mapeando
 * personagem -> descricao de persona (string OU { personalidade, mundo, voz, cues }).
 * Para cada cena em que aquele personagem aparece (campo `personagem`, visivel !=
 * "ausente"), o gate exige que o prompt+intencao da cena carregue no minimo 2 tokens
 * distintivos da persona — assim a personalidade nao some entre as cenas. Se a
 * shot-list nao declara `personas`, o gate e NO-OP (ok:true): projetos de sujeito
 * unico sem dossie de persona continuam passando.
 *
 * Uso: node scripts/lib/persona-carry.cjs <shotlist.json>   (exit 1 se reprova)
 */

const fs = require('fs');

const MIN_PERSONA_CUES = 2;
const MIN_TOKEN_LEN = 4;

// Stopwords PT/EN comuns — nao contam como cue distintivo de persona.
const STOP = new Set([
  'same', 'from', 'with', 'character', 'reference', 'image', 'images', 'style', 'frame',
  'mage', 'wizard', 'personagem', 'persona', 'cena', 'prompt', 'vertical', 'mobile',
  'uma', 'um', 'que', 'com', 'sem', 'dos', 'das', 'para', 'pela', 'pelo', 'como', 'mais',
  'muito', 'sempre', 'tem', 'ser', 'sua', 'seu', 'and', 'the', 'her', 'his', 'they',
  'this', 'that', 'into', 'over', 'when', 'while', 'their', 'each', 'very', 'cartoon',
  'saturated', 'colors', 'color', 'bold', 'outlines', 'soft', 'shadows', 'scene',
]);

function lower(v) { return String(v || '').toLowerCase(); }

function personaTokens(desc) {
  let text = '';
  if (typeof desc === 'string') text = desc;
  else if (desc && typeof desc === 'object') {
    text = [desc.personalidade, desc.mundo, desc.voz, desc.comportamento,
      Array.isArray(desc.cues) ? desc.cues.join(' ') : desc.cues].filter(Boolean).join(' ');
  }
  const seen = new Set();
  const out = [];
  for (const w of lower(text).split(/[^a-zçãáàâéêíóôõú]+/)) {
    if (w.length >= MIN_TOKEN_LEN && !STOP.has(w) && !seen.has(w)) { seen.add(w); out.push(w); }
  }
  return out;
}

function sceneChar(cena) {
  if (typeof cena.personagem === 'string' && cena.personagem.trim()) return cena.personagem.trim();
  return null;
}

function evaluateShotlist(shotlist, artifacto = 'inline') {
  const personas = (shotlist && shotlist.personas && typeof shotlist.personas === 'object')
    ? shotlist.personas : null;
  const cenas = Array.isArray(shotlist && shotlist.cenas) ? shotlist.cenas : [];

  const errors = [];
  const warnings = [];

  if (!personas || Object.keys(personas).length === 0) {
    return { artifacto, ok: true, score: 100, errors, warnings: ['sem bloco personas — gate no-op'], scenes: [] };
  }

  // pre-tokeniza cada persona
  const tokensByChar = {};
  for (const [char, desc] of Object.entries(personas)) {
    tokensByChar[char] = personaTokens(desc);
    if (tokensByChar[char].length < MIN_PERSONA_CUES) {
      warnings.push(`persona "${char}" tem poucos cues distintivos (${tokensByChar[char].length}) — descreva melhor personalidade/mundo/voz`);
    }
  }

  let score = 100;
  const scored = [];
  for (const cena of cenas) {
    // So cenas `geracao` tem prompt onde a persona pode (e deve) ser carregada. Cena
    // `biblioteca` E o proprio personagem (asset selecionado) — persona inerente, isenta.
    if ((cena.fonte || 'geracao') !== 'geracao') continue;
    const char = sceneChar(cena);
    const visivel = lower(cena.personagem_visivel || 'completo');
    if (!char || visivel === 'ausente') continue;
    const tokens = tokensByChar[char];
    if (!tokens) {
      warnings.push(`cena ${cena.n}: personagem "${char}" sem persona declarada no bloco personas`);
      continue;
    }
    const text = lower([cena.prompt, cena.intencao].filter(Boolean).join(' '));
    const hits = tokens.filter((t) => text.includes(t));
    scored.push({ n: cena.n, char, cues: hits.length });
    if (hits.length < MIN_PERSONA_CUES) {
      errors.push(`cena ${cena.n}: personagem "${char}" carrega so ${hits.length} cue(s) de persona (minimo ${MIN_PERSONA_CUES}) — reforce personalidade/mundo no prompt ou intencao`);
      score -= 25;
    }
  }

  return {
    artifacto,
    ok: errors.length === 0,
    score: Math.max(0, Math.min(100, Math.round(score))),
    errors,
    warnings,
    scenes: scored,
    personas: Object.keys(personas),
  };
}

module.exports = { evaluateShotlist, MIN_PERSONA_CUES, personaTokens };

if (require.main === module) {
  const file = process.argv[2];
  if (!file) {
    console.error('Uso: node scripts/lib/persona-carry.cjs <shotlist.json>');
    process.exit(2);
  }
  const shotlist = JSON.parse(fs.readFileSync(file, 'utf8'));
  const result = evaluateShotlist(shotlist, file);
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  if (!result.ok) process.exit(1);
}
