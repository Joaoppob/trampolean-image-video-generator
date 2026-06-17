#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const IMAGE_RE = /\.(png|jpg|jpeg|webp)$/i;

function parseArgs(argv) {
  const out = {};
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) continue;
    const key = a.slice(2);
    const next = argv[i + 1];
    if (next === undefined || next.startsWith('--')) out[key] = true;
    else {
      out[key] = next;
      i++;
    }
  }
  return out;
}

function exists(root, rel) {
  return fs.existsSync(path.join(root, rel));
}

function read(root, rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

function listImages(root) {
  const dir = path.join(root, 'RAG', 'identidade-visual');
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter((name) => IMAGE_RE.test(name))
    .sort()
    .map((name) => `RAG/identidade-visual/${name}`);
}

function hasHeading(text, heading) {
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`^##\\s+${escaped}\\s*$`, 'mi').test(text);
}

function extractAnchor(text) {
  const marker = /Anchor textual canonico|Anchor textual canônico/i;
  const idx = text.search(marker);
  if (idx === -1) return '';
  const after = text.slice(idx);
  const fenceStart = after.indexOf('```');
  if (fenceStart === -1) return '';
  const rest = after.slice(fenceStart + 3);
  const fenceEnd = rest.indexOf('```');
  if (fenceEnd === -1) return '';
  return rest.slice(0, fenceEnd).trim();
}

function validate(root) {
  const checks = [];
  function add(ok, name, detail) {
    checks.push({ ok, name, detail: detail || null });
  }

  const requiredFiles = [
    'RAG/README.md',
    'RAG/marca.md',
    'RAG/narrativa.md',
    'RAG/marca-template.md',
    'RAG/narrativa-template.md',
    'RAG/prompts/padroes-de-prompt.md',
    'RAG/prompts/exemplos.md',
    'RAG/prompts/exemplo-shotlist-mago.json',
    'RAG/prompts/exemplo-shotlist-produto.json',
    'RAG/prompts/exemplo-shotlist-servico.json',
    'RAG/review/consistencia-personagem.md',
    'RAG/review/qualidade-prompt.md',
    'RAG/review/reel-final.md',
    'RAG/review/regeneracao-cena.md',
  ];

  for (const file of requiredFiles) {
    add(exists(root, file), `arquivo presente: ${file}`);
  }

  const refs = listImages(root);
  add(refs.length >= 1, 'RAG tem ao menos uma imagem de referencia', refs.join(', '));
  add(refs.length <= 3, 'RAG tem no maximo tres imagens de referencia', refs.join(', '));
  add(refs.every((ref) => ref.startsWith('RAG/identidade-visual/')), 'paths de refs sao relativos');

  if (exists(root, 'RAG/marca.md')) {
    const marca = read(root, 'RAG/marca.md');
    for (const heading of [
      'O que é',
      'Público',
      'Personagem central: o mago',
      'Estilo visual',
      'Tom da comunicação',
      'Como o `prompt-smith` usa esta marca',
    ]) {
      add(hasHeading(marca, heading), `marca.md contem secao: ${heading}`);
    }
    const anchor = extractAnchor(marca);
    add(anchor.length >= 80, 'marca.md contem anchor textual canonico', anchor.slice(0, 80));
    add(/vertical 9:16 frame/i.test(anchor), 'anchor textual inclui vertical 9:16 frame');
  }

  if (exists(root, 'RAG/narrativa.md')) {
    const narrativa = read(root, 'RAG/narrativa.md');
    for (const heading of [
      'A história',
      'Cenário',
      'Inimigos',
      'Magia do mago',
      'Como o `prompt-smith` usa esta narrativa',
    ]) {
      add(hasHeading(narrativa, heading), `narrativa.md contem secao: ${heading}`);
    }
  }

  const ok = checks.every((c) => c.ok);
  return { ok, refs, checks };
}

if (require.main === module) {
  const args = parseArgs(process.argv);
  const root = path.resolve(args.root || '.');
  const result = validate(root);
  process.stdout.write(JSON.stringify(result, null, 2) + '\n');
  process.exit(result.ok ? 0 : 1);
}

module.exports = { validate, listImages, extractAnchor };
