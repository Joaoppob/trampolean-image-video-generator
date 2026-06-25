#!/usr/bin/env node
'use strict';

/*
 * intake-state.cjs — estado da intake guiada da Etapa 1 (roteirizacao v0.5).
 *
 * Espelha o padrao de review-cadence.cjs: estado computavel externamente ao LLM,
 * lido programaticamente, nao inferido do contexto de conversa. Isso elimina a
 * amnesia de contexto longo — o Jotaro pergunta SO as lacunas pendentes e nunca
 * reperginta o que ja foi respondido.
 *
 * O estado vive por PROJETO em `<root>/output/.intake-state.json`, onde
 * `--root projects/<nome>`. O arquivo gravado valida contra intake.schema.json.
 *
 * Interface CLI (subcomando + flags --chave valor):
 *   status  --root projects/<nome>
 *       -> { lacunas_pendentes: [...], status, ...estado }
 *   update  --root projects/<nome> --campo <k> --valor <v>
 *       -> grava o campo, recomputa lacunas_pendentes e status
 *   reset   --root projects/<nome>
 *       -> zera o estado
 *
 * Campos OBRIGATORIOS (bloqueiam; entram em lacunas_pendentes se nulos/vazios):
 *   projeto, plataforma, objetivo_post, tipo_conteudo
 * Campos OPCIONAIS (nao bloqueiam):
 *   tem_roteiro, tem_personagem, referencias_usuario
 */

const fs = require('fs');
const path = require('path');
const parseArgs = require('./lib/parse-args.cjs');

const STATE_REL = path.join('output', '.intake-state.json');

// Campos que bloqueiam o avanco da intake. Ordem = ordem de pergunta sugerida.
const CAMPOS_OBRIGATORIOS = ['projeto', 'plataforma', 'objetivo_post', 'tipo_conteudo'];
// Campos opcionais aceitos por update (nao bloqueiam).
const CAMPOS_OPCIONAIS = ['tem_roteiro', 'tem_personagem', 'referencias_usuario'];
// Plataformas validas (espelha o enum de intake.schema.json, menos o null).
const PLATAFORMAS = ['instagram', 'tiktok', 'facebook', 'youtube', 'reels'];

function statePath(root) {
  return path.resolve(root || '.', STATE_REL);
}

function emptyState() {
  return {
    projeto: '',
    plataforma: null,
    objetivo_post: null,
    tipo_conteudo: null,
    tem_roteiro: false,
    tem_personagem: false,
    referencias_usuario: [],
    lacunas_pendentes: [],
    status: 'em-andamento',
  };
}

function load(root) {
  const p = statePath(root);
  if (!fs.existsSync(p)) return recompute(emptyState());
  try {
    const obj = JSON.parse(fs.readFileSync(p, 'utf8'));
    return recompute(Object.assign(emptyState(), obj, {
      referencias_usuario: Array.isArray(obj.referencias_usuario) ? obj.referencias_usuario : [],
    }));
  } catch (_) {
    try {
      fs.copyFileSync(p, p + '.corrupt-' + Date.now());
    } catch (_) {
      // ignore
    }
    return recompute(emptyState());
  }
}

function save(root, state) {
  const p = statePath(root);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  const tmp = p + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(state, null, 2) + '\n', 'utf8');
  // fallback copy+unlink NAO e atomico (aceitavel: state single-agent sequencial)
  try {
    fs.renameSync(tmp, p);
  } catch (e) {
    if (e.code === 'EXDEV') {
      fs.copyFileSync(tmp, p);
      fs.unlinkSync(tmp);
      process.stderr.write('[intake-state] EXDEV: fallback copy+unlink para ' + p + '\n');
    } else {
      throw e;
    }
  }
}

// um campo obrigatorio esta "preenchido" se nao for null/"" (e plataforma valida).
function preenchido(campo, valor) {
  if (campo === 'plataforma') return PLATAFORMAS.indexOf(valor) !== -1;
  return valor !== null && valor !== undefined && String(valor).trim() !== '';
}

function recompute(state) {
  const lacunas = CAMPOS_OBRIGATORIOS.filter((c) => !preenchido(c, state[c]));
  state.lacunas_pendentes = lacunas;
  if (state.status !== 'abandonado') {
    state.status = lacunas.length === 0 ? 'completo' : 'em-andamento';
  }
  return state;
}

function coerce(campo, valorRaw) {
  if (campo === 'tem_roteiro' || campo === 'tem_personagem') {
    const v = String(valorRaw).trim().toLowerCase();
    return v === 'true' || v === 'sim' || v === '1';
  }
  if (campo === 'referencias_usuario') {
    // lista separada por virgula
    return String(valorRaw)
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }
  if (campo === 'plataforma') {
    return String(valorRaw).trim().toLowerCase();
  }
  return String(valorRaw);
}

function status(root) {
  return load(root);
}

function update(root, args) {
  const campo = args.campo;
  if (!campo) {
    return { erro: 'campo ausente', uso: 'update --campo <k> --valor <v>' };
  }
  const conhecidos = CAMPOS_OBRIGATORIOS.concat(CAMPOS_OPCIONAIS);
  if (conhecidos.indexOf(campo) === -1) {
    return { erro: 'campo desconhecido', campo, campos_validos: conhecidos };
  }
  const state = load(root);
  state[campo] = coerce(campo, args.valor === undefined ? '' : args.valor);
  recompute(state);
  save(root, state);
  return state;
}

function reset(root) {
  const state = recompute(emptyState());
  save(root, state);
  return state;
}

if (require.main === module) {
  const sub = process.argv[2] || 'status';
  const args = parseArgs(process.argv, 3);
  const root = args.root || '.';
  let result;
  switch (sub) {
    case 'status':
      result = status(root);
      break;
    case 'update':
      result = update(root, args);
      break;
    case 'reset':
      result = reset(root);
      break;
    default:
      result = { erro: 'subcomando desconhecido', uso: 'status|update|reset' };
  }
  process.stdout.write(JSON.stringify(result, null, 2) + '\n');
  process.exit(0);
}

module.exports = {
  STATE_REL,
  CAMPOS_OBRIGATORIOS,
  CAMPOS_OPCIONAIS,
  PLATAFORMAS,
  statePath,
  emptyState,
  load,
  status,
  update,
  reset,
};
