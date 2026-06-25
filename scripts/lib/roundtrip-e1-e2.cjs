#!/usr/bin/env node
'use strict';

/**
 * roundtrip-e1-e2.cjs — prova de encadeamento Etapa 1 -> Etapa 2.
 *
 * A "cola arquitetural" da v0.5 (arquitetura-roteirizacao.md §3) e:
 *   cada `cena.descricao_visual` do storyboard vira a `intencao` que o
 *   prompt-smith recebe por cena, e o resultado tem que ser compativel com
 *   `shotlist.schema.json` — o contrato de fronteira inalterado da Etapa 2.
 *
 * O prompt-smith e um agente folha (LLM); nao da pra invoca-lo num verificador
 * deterministico. O que ESTE roundtrip prova, mecanicamente e sem credito, e o
 * CONTRATO que sustenta o encadeamento:
 *
 *   (a) o storyboard de exemplo valida contra storyboard.schema.json;
 *   (b) cada cena fornece o que o prompt-smith precisa como entrada
 *       { identidade, intencao } — i.e. mapeamos cena -> { identidade, intencao }
 *       e a `intencao` derivada de `descricao_visual` satisfaz a restricao de
 *       `intencao` do shotlist.schema.json (minLength 10);
 *   (c) o resultado e compativel com shotlist.schema.json — montamos uma
 *       shot-list plausivel a partir do storyboard (cada descricao_visual como
 *       intencao, anchor+refs do RAG do demo) e ela valida contra o schema real.
 *
 * Sem dependencias: usa o mesmo validate-schema.cjs do resto do verify.
 */

const fs = require('fs');
const path = require('path');
const validateSchema = require('./validate-schema.cjs');
const custos = require('./custos.cjs');

const ROOT = path.resolve(__dirname, '..', '..');

// Anchor e refs do demo TraceDefense (o mago) — mesmos do exemplo-shotlist-mago.
// O roundtrip e brand-coerente com o resto do projeto; o anchor vem do RAG do
// demo, exatamente como o `rag` o entregaria ao prompt-smith no fluxo real.
const ANCHOR_MAGO =
  'Same wizard character from the 3 reference images: short stout elderly mage, ' +
  'long flowing white beard, purple pointed wizard hat with a square gold buckle, ' +
  'purple robe with lime-green trim, brown wide belt with square gold buckle, ' +
  'brown rustic boots, wooden twisted staff topped with a glowing purple crystal. ' +
  'Hyper-casual mobile RPG cartoon style, saturated colors, bold outlines, soft ' +
  'shadows, vertical 9:16 frame.';

const REFS_MAGO = [
  'RAG/identidade-visual/mage1.png',
  'RAG/identidade-visual/mage2.png',
  'RAG/identidade-visual/mage3.png',
];

const STORYBOARD_EXEMPLO = path.join(ROOT, 'RAG', 'prompts', 'exemplo-storyboard-mago.json');

function loadSchema(name) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, 'schemas', name), 'utf8'));
}

// constante de slot do prompt: o que o prompt-smith garante por construcao
// (anchor + descricao da cena + fechamento 9:16). Aqui basta produzir algo que
// satisfaca o shotlist.schema.json (minLength 80, contem "9:16").
function montaPromptDeCena(cena) {
  const sujeito =
    cena.personagem_presente === 'ausente'
      ? 'No wizard in this frame yet; mobile cartoon RPG aesthetic matching the 3 reference wizard images.'
      : ANCHOR_MAGO;
  return (
    `Mobile game cartoon style, vertical 9:16 frame. ${cena.descricao_visual} ` +
    `${sujeito} Mood: ${cena.mood}. Saturated colors, bold outlines, soft shadows.`
  );
}

function tagDeBeat(beat) {
  // beat narrativo (PT-BR do storyboard) -> tag curta da shot-list.
  const map = {
    gancho: 'hook',
    climax: 'impacto',
    cta: 'cta-clean',
  };
  if (map[beat]) return map[beat];
  return beat.replace(/[^a-z0-9-]/gi, '-');
}

/**
 * Mapeia uma cena do storyboard para a entrada do prompt-smith.
 * O prompt-smith recebe { identidade, intencao } por cena (ver prompt-smith.md).
 */
function cenaParaEntradaPromptSmith(cena, identidade) {
  return {
    identidade,
    intencao: cena.descricao_visual,
  };
}

function roundtrip() {
  const checks = [];
  const add = (ok, name, detail) => checks.push({ ok, name, detail });

  const storyboardSchema = loadSchema('storyboard.schema.json');
  const shotlistSchema = loadSchema('shotlist.schema.json');

  // -- (a) o storyboard de exemplo valida contra storyboard.schema.json --
  let storyboard;
  try {
    storyboard = JSON.parse(fs.readFileSync(STORYBOARD_EXEMPLO, 'utf8'));
  } catch (e) {
    add(false, 'roundtrip: storyboard de exemplo carrega', e.message);
    return checks;
  }
  const sbRes = validateSchema(storyboardSchema, storyboard);
  add(sbRes.valid, 'roundtrip (a): storyboard de exemplo valida contra storyboard.schema.json', sbRes.errors.join('; '));
  if (!sbRes.valid) return checks;

  // identidade que o `rag` entregaria — usamos o anchor do demo como o
  // prompt-smith o receberia (identity.schema.json.anchor_textual).
  const identidade = { anchor_textual: ANCHOR_MAGO, refs: REFS_MAGO };

  // shotlist.schema.json: minLength da `intencao` de cada cena.
  const intencaoMin =
    (((shotlistSchema.properties || {}).cenas || {}).items || {}).properties
      ? shotlistSchema.properties.cenas.items.properties.intencao.minLength
      : 10;

  // -- (b) cada cena fornece o que o prompt-smith precisa como { identidade, intencao } --
  let mapOk = true;
  const detalhesMap = [];
  for (const cena of storyboard.cenas) {
    const entrada = cenaParaEntradaPromptSmith(cena, identidade);
    const temIntencao =
      typeof entrada.intencao === 'string' && entrada.intencao.length >= (intencaoMin || 10);
    const temIdentidade = entrada.identidade && typeof entrada.identidade.anchor_textual === 'string';
    if (!temIntencao || !temIdentidade) {
      mapOk = false;
      detalhesMap.push(`cena ${cena.n}: intencao=${temIntencao} identidade=${temIdentidade}`);
    }
  }
  add(
    mapOk,
    'roundtrip (b): cada cena mapeia para { identidade, intencao } valido para o prompt-smith',
    detalhesMap.join('; ')
  );

  // -- (c) o resultado e compativel com shotlist.schema.json --
  // Construimos a shot-list que o prompt-smith produziria a partir do storyboard:
  // cada descricao_visual como intencao, anchor+refs do demo.
  const DUR = custos.DURACAO_CENA_SEG;
  let inicio = 0;
  const cenasShotlist = storyboard.cenas.map((cena) => {
    const tempo = `${inicio}-${inicio + DUR}`;
    inicio += DUR;
    const out = {
      n: cena.n,
      tag: tagDeBeat(cena.beat_narrativo),
      tempo_seg: tempo,
      intencao: cena.descricao_visual,
      personagem_visivel: cena.personagem_presente,
      prompt: montaPromptDeCena(cena),
      salvar_em: `output/imagens/cena-${String(cena.n).padStart(2, '0')}-${tagDeBeat(cena.beat_narrativo)}.png`,
    };
    return out;
  });

  const shotlist = {
    campanha: storyboard.campanha,
    cliente: storyboard.cliente,
    formato: 'vertical 9:16 mobile/TikTok',
    duracao_total_seg: inicio,
    modelo: 'nano_banana_2',
    referencias_obrigatorias: REFS_MAGO,
    anchor_personagem: ANCHOR_MAGO,
    cenas: cenasShotlist,
    gate_consistencia: {
      criterio: 'personagem reconhecivelmente o mesmo em cada cena de personagem completo',
      passa: '6/6 ou 5/6',
    },
  };

  const slRes = validateSchema(shotlistSchema, shotlist);
  add(
    slRes.valid,
    'roundtrip (c): shot-list derivada do storyboard valida contra shotlist.schema.json',
    slRes.errors.join('; ')
  );

  return checks;
}

module.exports = { roundtrip, cenaParaEntradaPromptSmith, STORYBOARD_EXEMPLO };

// execucao standalone: `node scripts/lib/roundtrip-e1-e2.cjs`
if (require.main === module) {
  const checks = roundtrip();
  for (const c of checks) {
    console.log(`${c.ok ? 'PASS' : 'FAIL'} ${c.name}${c.detail ? ` :: ${c.detail}` : ''}`);
  }
  const failed = checks.filter((c) => !c.ok);
  if (failed.length) {
    console.error(`\n${failed.length} roundtrip check(s) failed.`);
    process.exit(1);
  }
  console.log(`\nAll ${checks.length} roundtrip checks passed.`);
}
