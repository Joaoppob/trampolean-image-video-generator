#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const REF_RE = /^RAG\/identidade-visual\/([^/.]+\/)*[^/]+\.(png|jpg|jpeg|webp)$/i;
const MARCA_DIR = 'marca';
const ROOT_BUCKET = '__root__';
const GENERIC_ANCHOR = /\b(generic|person|character|brand|logo|nice|beautiful|premium|style|generico|genérico|pessoa|personagem|marca|bonito|estilo)\b/giu;
const STOPLIST = new Set([
  'same', 'from', 'the', 'with', 'and', 'character', 'reference', 'images',
  'image', 'style', 'frame', 'vertical', 'mobile', 'brand', 'identity',
  'premium', 'realistic', 'social', 'portraiture',
  'mesmo', 'mesma', 'referencia', 'referência', 'referencias', 'referências',
  'imagem', 'imagens', 'estilo', 'quadro', 'vertical', 'marca', 'identidade',
  'personagem', 'pessoa', 'realista',
]);

function normRef(ref) {
  return String(ref || '').replace(/\\/g, '/');
}

function parseRef(ref) {
  const normalized = normRef(ref);
  const ok = REF_RE.test(normalized) && !normalized.split('/').includes('..') && !path.isAbsolute(String(ref || ''));
  if (!ok) return { ok: false, ref: normalized, bucket: null, file: null };
  const rest = normalized.slice('RAG/identidade-visual/'.length);
  const parts = rest.split('/');
  if (parts.length === 1) {
    return { ok: true, ref: normalized, bucket: ROOT_BUCKET, file: parts[0] };
  }
  return { ok: true, ref: normalized, bucket: parts[0], file: parts[parts.length - 1] };
}

function distinctiveTokens(text) {
  return String(text || '')
    .toLowerCase()
    .split(/[^\p{L}]+/u)
    .filter((w) => /^\p{L}+$/u.test(w) && w.length >= 4 && !STOPLIST.has(w));
}

function summarizeRefs(refs) {
  const out = {
    total: 0,
    invalid: [],
    root: [],
    marca: [],
    personagens: {},
  };
  for (const ref of Array.isArray(refs) ? refs : []) {
    const parsed = parseRef(ref);
    if (!parsed.ok) {
      out.invalid.push(normRef(ref));
      continue;
    }
    out.total += 1;
    if (parsed.bucket === ROOT_BUCKET) out.root.push(parsed.ref);
    else if (parsed.bucket.toLowerCase() === MARCA_DIR) out.marca.push(parsed.ref);
    else {
      if (!out.personagens[parsed.bucket]) out.personagens[parsed.bucket] = [];
      out.personagens[parsed.bucket].push(parsed.ref);
    }
  }
  return out;
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

function evaluateIdentity(identity, artifacto = 'identity') {
  const errors = [];
  const warnings = [];
  const refs = Array.isArray(identity && identity.refs) ? identity.refs : [];
  const refSummary = summarizeRefs(refs);
  const anchor = String((identity && identity.anchor_textual) || '');
  const tokens = distinctiveTokens(anchor);
  const genericHits = (anchor.match(GENERIC_ANCHOR) || []).length;

  let score = 100;
  if (refs.length === 0) {
    errors.push('refs ausentes: identidade sem referencia visual nao pode gerar com consistencia');
    score -= 45;
  }
  if (refSummary.invalid.length) {
    errors.push(`refs invalidas ou inseguras: ${refSummary.invalid.join(', ')}`);
    score -= 35;
  }
  if (anchor.length < 80) {
    errors.push(`anchor_textual curto demais (${anchor.length} chars, min 80)`);
    score -= 35;
  }
  if (tokens.length < 8) {
    errors.push(`anchor_textual generico: so ${tokens.length} tracos distintivos (min 8)`);
    score -= 30;
  }
  if (genericHits >= 3) {
    errors.push('anchor_textual usa termos genericos demais; enumere tracos fisicos/material/roupa');
    score -= 20;
  }

  const personagemCount = Object.keys(refSummary.personagens).length;
  if (personagemCount > 1) {
    warnings.push(`identidade contem ${personagemCount} personagens; prompt-smith deve rotear refs por cena`);
  }
  if (refSummary.root.length && personagemCount > 0) {
    warnings.push('refs planas e subpastas coexistem; confirme se raiz e sujeito unico ou material legado');
    score -= 5;
  }
  if (!refSummary.marca.length && personagemCount > 0) {
    warnings.push('sem refs em RAG/identidade-visual/marca/; cenas de marca/produto podem ficar soltas');
  }

  return scoreResult(artifacto, score, errors, warnings, {
    refs: refSummary,
    anchor: {
      chars: anchor.length,
      distinctive_tokens: tokens.length,
      generic_hits: genericHits,
    },
  });
}

function generationScenes(shotlist) {
  return (Array.isArray(shotlist && shotlist.cenas) ? shotlist.cenas : [])
    .filter((c) => (c.fonte || 'geracao') === 'geracao');
}

function evaluateShotlistRefs(shotlist, artifacto = 'shotlist') {
  const errors = [];
  const warnings = [];
  const refs = Array.isArray(shotlist && shotlist.referencias_obrigatorias)
    ? shotlist.referencias_obrigatorias
    : [];
  const refSummary = summarizeRefs(refs);
  let score = 100;

  if (refSummary.invalid.length) {
    errors.push(`referencias_obrigatorias invalidas ou inseguras: ${refSummary.invalid.join(', ')}`);
    score -= 35;
  }

  const scenes = generationScenes(shotlist);
  const personagemRefs = Object.keys(refSummary.personagens);
  for (const cena of scenes) {
    const personagem = cena.personagem === undefined || cena.personagem === null ? null : String(cena.personagem);
    if (personagem && personagem !== 'trio') {
      const hasOwn = Boolean(refSummary.personagens[personagem] && refSummary.personagens[personagem].length);
      const others = personagemRefs.filter((p) => p !== personagem);
      if (!hasOwn) {
        errors.push(`cena ${cena.n} (${personagem}) sem ref da propria subpasta RAG/identidade-visual/${personagem}/`);
        score -= 35;
      }
      if (others.length) {
        errors.push(`cena ${cena.n} (${personagem}) mistura refs de outros personagens: ${others.join(', ')}`);
        score -= 30;
      }
    }
    if (!personagem && refs.length === 0) {
      errors.push(`cena ${cena.n} de geracao sem refs no nivel raiz da shot-list`);
      score -= 35;
    }
    const prompt = String(cena.prompt || '');
    if (cena.personagem_visivel === 'completo' && prompt.length && prompt.split(/[^A-Za-z]+/).filter((w) => w.length >= 4).length < 12) {
      warnings.push(`cena ${cena.n} tem prompt curto para personagem completo; anchor pode nao sobreviver`);
      score -= 10;
    }
  }

  if (scenes.length > 0 && refs.length === 0) {
    errors.push('shot-list com cenas de geracao precisa de referencias_obrigatorias');
    score -= 40;
  }
  if (personagemRefs.length > 1) {
    warnings.push(`shot-list agrega refs de multiplos personagens (${personagemRefs.join(', ')}); prefira gerar por personagem/cena`);
    score -= 10;
  }

  return scoreResult(artifacto, score, errors, warnings, {
    refs: refSummary,
    generation_scenes: scenes.length,
  });
}

module.exports = {
  parseRef,
  summarizeRefs,
  evaluateIdentity,
  evaluateShotlistRefs,
};

if (require.main === module) {
  const mode = process.argv[2];
  const file = process.argv[3];
  if (!file || (mode !== 'identity' && mode !== 'shotlist')) {
    console.error('Uso: node scripts/lib/identity-quality.cjs identity|shotlist <arquivo.json>');
    process.exit(2);
  }
  const json = JSON.parse(fs.readFileSync(file, 'utf8'));
  const result = mode === 'identity'
    ? evaluateIdentity(json, file)
    : evaluateShotlistRefs(json, file);
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  if (!result.ok) process.exit(1);
}
