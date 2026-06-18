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
 *   media  --root <repo> --key <chave-estavel-da-ref> --media-id <id>
 *          -> registra um media_id de referencia ja confirmado (reuso no run)
 *   media-get --root <repo> --key <chave-estavel-da-ref>
 *          -> { media_id } se ja confirmado nesse run
 *   dump   --root <repo>           -> imprime o state inteiro
 *
 * exit 0 sempre; resultado em JSON no stdout.
 */

const fs = require('fs');
const path = require('path');
const parseArgs = require('./lib/parse-args.cjs');

const STATE_REL = path.join('output', '.pipeline-state.json');

function statePath(root) {
  return path.resolve(root || '.', STATE_REL);
}

function emptyState() {
  return {
    versao: 1,
    criado_em: new Date().toISOString(),
    atualizado_em: new Date().toISOString(),
    cenas: {}, // { "<n>": { imagem: {...}, video: {...} } }
    refs_media: {}, // { "<ref-key>": "<media_id>" } — media_ids de referencia reusaveis no run
  };
}

// Tenta extrair registros individuais de cenas de um state JSON corrompido.
// Cada bloco "cena N": { imagem: { job_id, path }, video: { job_id, path } }
// e recuperado via regex linha a linha — nao depende de parse completo.
function rescueCenas(raw) {
  if (typeof raw !== 'string') return null;
  const cenas = {};
  // procura blocos de cena dentro de "cenas": { ... }
  const cenaRe = /"(\d+)"\s*:\s*\{/g;
  let m;
  while ((m = cenaRe.exec(raw)) !== null) {
    const num = m[1];
    const start = m.index;
    // encontra o fechamento balanceado de chaves a partir da posicao
    let depth = 0;
    let end = start;
    let inString = false;
    let esc = false;
    for (let i = start; i < raw.length; i++) {
      const ch = raw[i];
      if (esc) { esc = false; continue; }
      if (ch === '\\') { esc = true; continue; }
      if (ch === '"') { inString = !inString; continue; }
      if (inString) continue;
      if (ch === '{') depth++;
      else if (ch === '}') { depth--; if (depth === 0) { end = i + 1; break; } }
    }
    if (end <= start) continue;
    const block = raw.slice(start, end);
    // extrai job_id e path de cada sub-registro (imagem/video) do bloco
    const registro = {};
    for (const tipo of ['imagem', 'video']) {
      const sub = extractSubRecord(block, tipo);
      if (sub) registro[tipo] = sub;
    }
    if (Object.keys(registro).length > 0) cenas[num] = registro;
  }
  return Object.keys(cenas).length > 0 ? cenas : null;
}

function extractSubRecord(block, tipo) {
  // localiza o trecho "imagem": { ... } ou "video": { ... }
  const subRe = new RegExp('"' + tipo + '"\\s*:\\s*\\{');
  const m = subRe.exec(block);
  if (!m) return null;
  const start = m.index;
  let depth = 0;
  let end = start;
  let inString = false;
  let esc = false;
  for (let i = start; i < block.length; i++) {
    const ch = block[i];
    if (esc) { esc = false; continue; }
    if (ch === '\\') { esc = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === '{') depth++;
    else if (ch === '}') { depth--; if (depth === 0) { end = i + 1; break; } }
  }
  if (end <= start) return null;
  const sub = block.slice(start, end);
  const jobId = extractString(sub, 'job_id');
  const pathVal = extractString(sub, 'path');
  if (!jobId && !pathVal) return null;
  return { job_id: jobId || null, path: pathVal || null };
}

function extractString(text, key) {
  const re = new RegExp('"' + key + '"\\s*:\\s*"([^"\\\\]*(?:\\\\.[^"\\\\]*)*)"');
  const m = re.exec(text);
  return m ? m[1].replace(/\\"/g, '"').replace(/\\\\/g, '\\') : null;
}

function load(root) {
  const p = statePath(root);
  if (!fs.existsSync(p)) return emptyState();
  let raw;
  try {
    raw = fs.readFileSync(p, 'utf8');
    const obj = JSON.parse(raw);
    if (!obj.cenas) obj.cenas = {};
    if (!obj.refs_media) obj.refs_media = {};
    return obj;
  } catch (e) {
    // state corrompido: tenta salvar registros individuais de cenas antes de zerar.
    // Job_ids sao caros — perder um force regeracao com credito extra.
    if (!raw) {
      try { fs.copyFileSync(p, p + '.corrupt-' + Date.now()); } catch (_) { /* ignore */ }
      process.stderr.write(`[pipeline-state] state ilegivel em ${p}: nao foi possivel ler o arquivo.\n`);
      return emptyState();
    }
    const rescued = rescueCenas(raw);
    const recovered = rescued
      ? Object.keys(rescued).length
      : 0;
    try {
      fs.copyFileSync(p, p + '.corrupt-' + Date.now());
    } catch (_) {
      /* ignore */
    }
    if (recovered > 0) {
      const st = emptyState();
      st.cenas = rescued;
      const recoveryPath = p + '.recovered-' + Date.now();
      try {
        fs.writeFileSync(recoveryPath, JSON.stringify(st, null, 2) + '\n', 'utf8');
      } catch (_) {
        /* ignore */
      }
      process.stderr.write(
        `[pipeline-state] state corrompido em ${p}: ` +
        `${recovered} cena(s) recuperadas (salvas em ${recoveryPath}). ` +
        `Backup do original em ${p}.corrupt-*. Verifique antes de retomar.\n`
      );
      return emptyState();
    }
    process.stderr.write(
      `[pipeline-state] state corrompido em ${p}: ` +
      `nao foi possivel recuperar nenhuma cena. Backup em ${p}.corrupt-*.\n`
    );
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
  // fallback copy+unlink NAO e atomico (aceitavel: state single-agent sequencial)
  try {
    fs.renameSync(tmp, p);
  } catch (e) {
    if (e.code === 'EXDEV') {
      fs.copyFileSync(tmp, p);
      fs.unlinkSync(tmp);
      process.stderr.write('[pipeline-state] EXDEV: fallback copy+unlink para ' + p + '\n');
    } else {
      throw e;
    }
  }
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
  const cenaNum = Number(args.cena);
  if (!Number.isInteger(cenaNum) || cenaNum < 1) {
    return { erro: 'cena deve ser um inteiro positivo' };
  }
  if (!tipo || (tipo !== 'imagem' && tipo !== 'video')) {
    return { erro: 'tipo deve ser "imagem" ou "video"' };
  }
  if (!args['job-id']) {
    return { erro: 'job-id obrigatorio para gravar state' };
  }
  if (!args.path) {
    return { erro: 'path obrigatorio para gravar state' };
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
  return { ok: true, cena: cenaNum, tipo, registro };
}

function cmdMedia(root, hashKey, mediaId) {
  if (!hashKey) {
    return { erro: 'key obrigatoria para registrar media_id' };
  }
  if (!mediaId) {
    return { erro: 'media-id obrigatorio para registrar referencia' };
  }
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
  const args = parseArgs(process.argv, 3);
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
  process.exit(result && result.erro ? 1 : 0);
}

module.exports = { load, save, cmdGet, cmdSet, cmdMedia, cmdMediaGet, statePath };
