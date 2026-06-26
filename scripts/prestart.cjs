#!/usr/bin/env node
'use strict';

/*
 * prestart.cjs - agregador PURO da leitura de situacao do pre-inicio (/inicio).
 *
 * Le Raw/, projects/ e perfil local. Nao toca rede, ambiente, Higgsfield ou
 * FFmpeg; esses sinais sao coletados pelo Jotaro no runtime do /inicio.
 */

const fs = require('fs');
const path = require('path');
const parseArgs = require('./lib/parse-args.cjs');
const rawIngest = require('./raw-ingest.cjs');
const jotaroProfile = require('./jotaro-profile.cjs');

const PROJECTS_DIR = 'projects';

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
  return { tem_conteudo: lotes.some((l) => l.n_arquivos > 0), lotes };
}

function scanProjetos(rootAbs) {
  const projetosAbs = path.resolve(rootAbs, PROJECTS_DIR);
  const avisos = [];
  if (!fs.existsSync(projetosAbs)) return { projetos: [], avisos };

  let entries;
  try {
    entries = fs.readdirSync(projetosAbs, { withFileTypes: true });
  } catch (_) {
    return { projetos: [], avisos: [`${PROJECTS_DIR}/ ilegivel`] };
  }

  const projetos = [];
  entries.sort((a, b) => a.name.localeCompare(b.name));
  for (const ent of entries) {
    if (!ent.isDirectory()) continue;
    const projJsonPath = path.join(projetosAbs, ent.name, 'project.json');
    if (!fs.existsSync(projJsonPath)) {
      avisos.push(`${PROJECTS_DIR}/${ent.name}/project.json ausente`);
      continue;
    }

    let proj;
    try {
      proj = JSON.parse(fs.readFileSync(projJsonPath, 'utf8'));
    } catch (e) {
      avisos.push(`${PROJECTS_DIR}/${ent.name}/project.json ilegivel: ${e.message}`);
      continue;
    }

    projetos.push({
      nome: typeof proj.nome === 'string' ? proj.nome : ent.name,
      tipo_marca: proj.tipo_marca || null,
      status: proj.status || null,
    });
  }
  return { projetos, avisos };
}

function scanPerfil(root) {
  const profile = jotaroProfile.load(root);
  return {
    primeira_vez: !profile.primeiro_run_concluido,
    expert: !!profile.modo_expert,
  };
}

function prestart(rootArg) {
  const root = rootArg || '.';
  const rootAbs = path.resolve(root);
  const projetosScan = scanProjetos(rootAbs);
  return {
    ok: true,
    raw: scanRaw(rootAbs),
    projetos: projetosScan.projetos,
    perfil: scanPerfil(root),
    avisos: projetosScan.avisos,
  };
}

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
