#!/usr/bin/env node
'use strict';

/**
 * ledger.cjs — trilha de auditoria de credito (append-only JSONL).
 *
 * Credito = dinheiro, e o free tier tem teto diario. O save-crystal
 * (pipeline-state.cjs) guarda ESTADO de retomada (idempotente, reescrito); este
 * ledger guarda HISTORICO (append-only, nunca reescrito) — cada disparo que
 * gastou credito vira uma linha imutavel. Responde "quanto este run custou,
 * quando, em que" sem inferir do estado.
 *
 * Arquivo: output/.credit-ledger.jsonl (uma entrada JSON por linha).
 * Cada linha: { ts(UTC ISO), tipo, cena, job_id, creditos, marca, nota }.
 * Os creditos vem de custos.cjs (fonte unica) e ficam gravados na entrada — a
 * trilha reflete o que foi cobrado naquele momento, self-contained.
 *
 * IMPORTANTE: so registre quando GEROU DE FATO (gastou credito). Nunca em
 * retomada/skip (idempotencia do save-crystal) — la nao houve gasto.
 *
 * Uso:
 *   node scripts/lib/ledger.cjs append --root . --tipo imagem|video --cena <n> \
 *        --job-id <id> [--marca <m>] [--nota <s>]
 *   node scripts/lib/ledger.cjs summary --root . [--dia YYYY-MM-DD]
 *   node scripts/lib/ledger.cjs dump    --root .
 *
 * exit 0 normal; exit 1 so em erro de uso. Resultado em JSON no stdout.
 * Dep-free: fs + path + libs locais (parse-args, custos).
 */

const fs = require('fs');
const path = require('path');
const parseArgs = require('./parse-args.cjs');
const custos = require('./custos.cjs');

const LEDGER_REL = path.join('output', '.credit-ledger.jsonl');

function ledgerPath(root) {
  return path.resolve(root || '.', LEDGER_REL);
}

// creditos por tipo — derivados de custos.cjs, nunca recodificados aqui.
function creditosPara(tipo) {
  if (tipo === 'imagem') return custos.IMAGEM;
  if (tipo === 'video') return custos.VIDEO;
  return null;
}

function cmdAppend(root, args) {
  const tipo = args.tipo;
  const creditos = creditosPara(tipo);
  if (creditos === null) {
    return { ok: false, erro: 'tipo deve ser "imagem" ou "video"' };
  }
  const cenaNum = Number(args.cena);
  if (!Number.isInteger(cenaNum) || cenaNum < 1) {
    return { ok: false, erro: 'cena deve ser um inteiro positivo' };
  }
  if (!args['job-id']) {
    return { ok: false, erro: 'job-id obrigatorio para registrar gasto' };
  }
  const entry = {
    ts: new Date().toISOString(), // UTC (ISO 8601 termina em Z)
    tipo,
    cena: cenaNum,
    job_id: args['job-id'] || null,
    creditos,
    marca: args.marca || null,
    nota: args.nota || null,
  };
  const p = ledgerPath(root);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  // append atomico-o-suficiente: uma linha por disparo, nunca reescreve o passado.
  fs.appendFileSync(p, JSON.stringify(entry) + '\n', 'utf8');
  return { ok: true, entry, arquivo: p };
}

function readEntries(root) {
  const p = ledgerPath(root);
  if (!fs.existsSync(p)) return [];
  return fs
    .readFileSync(p, 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch (_) {
        return null; // linha corrompida: ignora, nao derruba a auditoria
      }
    })
    .filter(Boolean);
}

function cmdSummary(root, dia) {
  const all = readEntries(root);
  const entries = dia ? all.filter((e) => String(e.ts || '').slice(0, 10) === dia) : all;
  let total = 0;
  const por_dia = {};
  const por_tipo = {};
  for (const e of entries) {
    const c = Number(e.creditos) || 0;
    total += c;
    const d = String(e.ts || '').slice(0, 10) || 'sem-data';
    por_dia[d] = (por_dia[d] || 0) + c;
    por_tipo[e.tipo] = (por_tipo[e.tipo] || 0) + c;
  }
  // alerta de teto: dia que passou do free cap (custos.TETO_DIA).
  const alertas = [];
  for (const [d, c] of Object.entries(por_dia)) {
    if (c > custos.TETO_DIA) {
      alertas.push(`${d}: ${c} creditos (acima do teto free ${custos.TETO_DIA}/dia)`);
    }
  }
  return {
    ok: true,
    n_entries: entries.length,
    total_creditos: total,
    teto_dia: custos.TETO_DIA,
    por_dia,
    por_tipo,
    alertas,
  };
}

function cmdDump(root) {
  return { ok: true, entries: readEntries(root) };
}

if (require.main === module) {
  const sub = process.argv[2];
  const args = parseArgs(process.argv, 3);
  const root = args.root || '.';
  let result;
  switch (sub) {
    case 'append':
      result = cmdAppend(root, args);
      break;
    case 'summary':
      result = cmdSummary(root, args.dia);
      break;
    case 'dump':
      result = cmdDump(root);
      break;
    default:
      result = { ok: false, erro: 'subcomando desconhecido', uso: 'append|summary|dump' };
  }
  process.stdout.write(JSON.stringify(result, null, 2) + '\n');
  process.exit(result && result.ok === false ? 1 : 0);
}

module.exports = { cmdAppend, cmdSummary, cmdDump, readEntries, ledgerPath, creditosPara };
