#!/usr/bin/env node
/**
 * pipeline-state.js — SAVE CRYSTAL do pipeline (P0.2).
 *
 * State de retomada em output/.pipeline-state.json. Cada imagem/clipe gerado
 * grava job_id + path. Credito NAO volta: perder um job_id custa dinheiro.
 * Se a cena ja tem job_id+path no state, NAO regera (idempotencia).
 *
 * CANONICO — unica copia ativa. As skills gera-imagem e gera-video
 * referenciam este arquivo via ``node scripts/pipeline-state.cjs ...``.
 *
 * Subcomandos:
 *   get    --root <repo> --cena <n> [--tipo imagem|video]
 *          -> { existe, registro } da cena (pra decidir regerar ou pular)
 *   set    --root <repo> --cena <n> --tipo imagem|video --job-id <id>
 *          --path <p> [--media-ids a,b,c] [--prompt-tag <tag>]
 *          -> grava/atualiza o registro da cena
 *   media  --root <repo> --key <hash-do-arquivo> --media-id <id>
 *          -> registra um media_id de referencia ja confirmado (reuso no run)
 *   media-get --root <repo> --key <hash>
 *          -> { media_id } se ja confirmado nesse run
 *   dump   --root <repo>           -> imprime o state inteiro
 *
 * exit 0 sempre; resultado em JSON no stdout.
 */

const fs = require('fs');
const path = require('path');

const STATE_REL = path.join('output', '.pipeline-state.json');

function parseArgs(argv) {
  const out = {};
  for (let i = 3; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next === undefined || next.startsWith('--')) {
        out[key] = true;
      } else {
        out[key] = next;
        i++;
      }
    }
  }
  return out;
}

function statePath(root) {
  return path.resolve(root || '.', STATE_REL);
}

function emptyState() {
  return {
    versao: 1,
    criado_em: new Date().toISOString(),
    atualizado_em: new Date().toISOString(),
    cenas: {}, // { "<n>": { imagem: {...}, video: {...} } }
    refs_media: {}, // { "<hash>": "<media_id>" } — media_ids de referencia reusaveis no run
  };
}

function load(root) {
  const p = statePath(root);
  if (!fs.existsSync(p)) return emptyState();
  try {
    const raw = fs.readFileSync(p, 'utf8');
    const obj = JSON.parse(raw);
    if (!obj.cenas) obj.cenas = {};
    if (!obj.refs_media) obj.refs_media = {};
    return obj;
  } catch (e) {
    // state corrompido: nao apaga (pode ter job_ids caros). Faz backup e zera.
    try {
      fs.copyFileSync(p, p + '.corrupt-' + Date.now());
    } catch (_) {
      /* ignore */
    }
    return emptyState();
  }
}

function save(root, state) {
  const p = statePath(root);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  state.atualizado_em = new Date().toISOString();
  // escrita atomica: tmp + rename (evita state truncado se cair no meio)
  const tmp = p + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(state, null, 2) + '\n', 'utf8');
  fs.renameSync(tmp, p);
}

function cmdGet(root, cena, tipo) {
  const state = load(root);
  const reg = state.cenas[String(cena)] || {};
  if (tipo) {
    const sub = reg[tipo] || null;
    return { cena: Number(cena), tipo, existe: !!(sub && sub.job_id && sub.path), registro: sub };
  }
  return { cena: Number(cena), existe: Object.keys(reg).length > 0, registro: reg };
}

function cmdSet(root, args) {
  const state = load(root);
  const key = String(args.cena);
  const tipo = args.tipo;
  if (!tipo || (tipo !== 'imagem' && tipo !== 'video')) {
    return { erro: 'tipo deve ser "imagem" ou "video"' };
  }
  if (!state.cenas[key]) state.cenas[key] = {};
  const registro = {
    job_id: args['job-id'] || null,
    path: args.path || null,
    media_ids: args['media-ids'] ? String(args['media-ids']).split(',').filter(Boolean) : [],
    prompt_tag: args['prompt-tag'] || null,
    gravado_em: new Date().toISOString(),
  };
  state.cenas[key][tipo] = registro;
  save(root, state);
  return { ok: true, cena: Number(key), tipo, registro };
}

function cmdMedia(root, hashKey, mediaId) {
  const state = load(root);
  state.refs_media[hashKey] = mediaId;
  save(root, state);
  return { ok: true, key: hashKey, media_id: mediaId };
}

function cmdMediaGet(root, hashKey) {
  const state = load(root);
  const id = state.refs_media[hashKey] || null;
  return { key: hashKey, media_id: id, existe: !!id };
}

function cmdDump(root) {
  return load(root);
}

if (require.main === module) {
  const sub = process.argv[2];
  const args = parseArgs(process.argv);
  const root = args.root || '.';
  let result;
  switch (sub) {
    case 'get':
      result = cmdGet(root, args.cena, args.tipo);
      break;
    case 'set':
      result = cmdSet(root, args);
      break;
    case 'media':
      result = cmdMedia(root, args.key, args['media-id']);
      break;
    case 'media-get':
      result = cmdMediaGet(root, args.key);
      break;
    case 'dump':
      result = cmdDump(root);
      break;
    default:
      result = {
        erro: 'subcomando desconhecido',
        uso: 'get|set|media|media-get|dump',
      };
  }
  process.stdout.write(JSON.stringify(result, null, 2) + '\n');
  process.exit(0);
}

module.exports = { load, save, cmdGet, cmdSet, cmdMedia, cmdMediaGet, statePath };
