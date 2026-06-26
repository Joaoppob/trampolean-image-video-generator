#!/usr/bin/env node
'use strict';

/*
 * prestart.cjs — agregador PURO da leitura de situacao do pre-inicio (/inicio).
 *
 * JB quer que o Jotaro, no comeco da sessao, faca uma LEITURA DE SITUACAO antes
 * de perguntar: da uma lida no Raw/, ve os projetos, le o perfil — e so entao
 * monta o quadro e pergunta o que a pessoa quer fazer. Este script e a CAMADA
 * DETERMINISTICA dessa leitura: so toca o FILESYSTEM, e nada mais.
 *
 * PUREZA (decisao de arquitetura): este helper NAO toca ambiente nem rede. Os
 * sinais de SETUP (Higgsfield auth/saldo via `higgsfield account status`, FFmpeg
 * via `ffmpeg -version`) NAO entram aqui — pra o helper ficar puro e testavel sem
 * rede. O Jotaro coleta esses sinais em runtime no roteiro do /inicio (com a
 * logica que ja existe em /setup e /creditos) e combina com este JSON pra montar
 * o quadro final. Determinístico dado o filesystem.
 *
 * Reuso: o scan do Raw/ vem de raw-ingest.cjs `plan(rootAbs)` (nao reimplementa);
 * o perfil vem de jotaro-profile.cjs `load(root)` (nao reimplementa).
 *
 * Interface CLI:
 *   node scripts/prestart.cjs --root .
 *     -> {
 *          ok: true,
 *          raw: { tem_conteudo, lotes: [{ tema, n_arquivos, n_imagens, n_textos, n_outros }] },
 *          projetos: [{ nome, tipo_marca, status }],
 *          perfil: { primeira_vez, expert }
 *        }
 *
 * Saida sempre JSON no stdout. Erro nao-fatal -> { ok:false, erro } exit != 0;
 * sucesso -> exit 0.
 */

const fs = require('fs');
const path = require('path');
const parseArgs = require('./lib/parse-args.cjs');
const rawIngest = require('./raw-ingest.cjs');
const jotaroProfile = require('./jotaro-profile.cjs');

const PROJECTS_DIR = 'projects';

// ----------------------------------------------------------------------------
// raw: reusa raw-ingest.plan() e deriva contadores por lote
// ----------------------------------------------------------------------------

function scanRaw(rootAbs) {
  const planResult = rawIngest.plan(rootAbs);
  const lotesRaw = (planResult && Array.isArray(planResult.lotes)) ? planResult.lotes : [];
  const lotes = lotesRaw.map((lote) => {
    const arquivos = Array.isArray(lote.arquivos) ? lote.arquivos : [];
    let n_imagens = 0;
    let n_textos = 0;
    let n_outros = 0;
    for (const a of arquivos) {
      if (a.tipo === 'imagem') n_imagens += 1;
      else if (a.tipo === 'texto') n_textos += 1;
      else n_outros += 1;
    }
    return {
      tema: lote.tema,
      n_arquivos: arquivos.length,
      n_imagens,
      n_textos,
      n_outros,
    };
  });
  const tem_conteudo = lotes.some((l) => l.n_arquivos > 0);
  return { tem_conteudo, lotes };
}

// ----------------------------------------------------------------------------
// projetos: varre projects/*/project.json (ignora README.md), tolera ausente/ilegivel
// ----------------------------------------------------------------------------

function scanProjetos(rootAbs) {
  const projetosAbs = path.resolve(rootAbs, PROJECTS_DIR);
  if (!fs.existsSync(projetosAbs)) return [];
  const projetos = [];
  let entries;
  try {
    entries = fs.readdirSync(projetosAbs, { withFileTypes: true });
  } catch (_) {
    return [];
  }
  entries.sort((a, b) => a.name.localeCompare(b.name));
  for (const ent of entries) {
    if (!ent.isDirectory()) continue; // ignora README.md e arquivos soltos
    const projJsonPath = path.join(projetosAbs, ent.name, 'project.json');
    if (!fs.existsSync(projJsonPath)) {
      // project.json ausente: pula com aviso, nao quebra.
      process.stderr.write(`[prestart] ${PROJECTS_DIR}/${ent.name}/project.json ausente — pulando\n`);
      continue;
    }
    let proj;
    try {
      proj = JSON.parse(fs.readFileSync(projJsonPath, 'utf8'));
    } catch (e) {
      // project.json ilegivel: pula com aviso, nao quebra.
      process.stderr.write(`[prestart] ${PROJECTS_DIR}/${ent.name}/project.json ilegivel (${e.message}) — pulando\n`);
      continue;
    }
    projetos.push({
      nome: typeof proj.nome === 'string' ? proj.nome : ent.name,
      tipo_marca: proj.tipo_marca || null,
      status: proj.status || null,
    });
  }
  return projetos;
}

// ----------------------------------------------------------------------------
// perfil: reusa jotaro-profile.load() e mapeia pra { primeira_vez, expert }
// ----------------------------------------------------------------------------

function scanPerfil(root) {
  const profile = jotaroProfile.load(root);
  return {
    primeira_vez: !profile.primeiro_run_concluido,
    expert: !!profile.modo_expert,
  };
}

// ----------------------------------------------------------------------------
// agregador
// ----------------------------------------------------------------------------

function prestart(rootArg) {
  const root = rootArg || '.';
  const rootAbs = path.resolve(root);
  return {
    ok: true,
    raw: scanRaw(rootAbs),
    projetos: scanProjetos(rootAbs),
    perfil: scanPerfil(root),
  };
}

// ----------------------------------------------------------------------------
// CLI
// ----------------------------------------------------------------------------

function main() {
  const args = parseArgs(process.argv, 2);
  let result;
  try {
    result = prestart(args.root || '.');
  } catch (e) {
    result = { ok: false, erro: e.message };
  }
  process.stdout.write(JSON.stringify(result, null, 2) + '\n');
  process.exit(result && result.ok ? 0 : 1);
}

if (require.main === module) {
  main();
}

module.exports = {
  PROJECTS_DIR,
  scanRaw,
  scanProjetos,
  scanPerfil,
  prestart,
};
