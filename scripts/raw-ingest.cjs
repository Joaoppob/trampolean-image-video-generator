#!/usr/bin/env node
'use strict';

/*
 * raw-ingest.cjs — mecanica deterministica e PATH-SAFE da ingestao do Raw/.
 *
 * JB quer uma pasta `Raw/` na raiz onde dropa arquivos de um tema (imagens +
 * textos soltos), roda `/importa`, e o Jotaro organiza tudo num PROJETO pronto
 * pra rodar a Etapa 1 / producao.
 *
 * Este script e a CAMADA MECANICA (sem julgamento): escaneia, copia scaffold,
 * MOVE arquivos um a um, e esvazia o lote consumido — tudo com seguranca de
 * path. A CAMADA SEMANTICA (ler textos, decidir o que e marca/narrativa/roteiro,
 * inferir nome/tipo, autorar marca.md/narrativa.md) e do Jotaro, via /importa.
 *
 * DECISOES DE JB (travadas):
 *   - MOVE os arquivos (Raw e caixa de entrada que esvazia), nao copia.
 *   - Subpastas = 1 projeto cada: Raw/<tema>/ vira um projeto; arquivos soltos
 *     na raiz do Raw/ contam como UM lote avulso (_avulso).
 *
 * Interface CLI (subcomando + flags --chave valor):
 *
 *   plan --root .
 *       escaneia Raw/, identifica LOTES (subpasta = lote; soltos = _avulso),
 *       classifica cada arquivo por extensao (imagem|texto|outro). DRY-RUN: nao
 *       altera nada. Imprime { lotes: [{ tema, path, arquivos: [{nome,tipo,path}] }] }.
 *
 *   scaffold --root . --projeto <nome> --tipo <personagem|produto|servico>
 *       copia templates/brand-<tipo> -> projects/<nome> (ERRA se ja existe).
 *       Ajusta project.json (nome, tipo_marca, status:"rascunho"). Valida o nome.
 *
 *   move --root . --de <Raw/...> --para <projects/...>
 *       move UM arquivo. PATH-SAFETY: --de dentro de Raw/, --para dentro de
 *       projects/; rejeita ../, absolutos que escapem, destino fora de projects/.
 *       Cria o diretorio-pai do destino se preciso. Erra se o destino ja existe.
 *
 *   finalize --root . --tema <tema>
 *       remove o lote consumido em Raw/<tema>/ — SO se estiver vazio (ou so com
 *       restos ja movidos); se sobrar arquivo nao-processado, NAO apaga e AVISA.
 *       Para _avulso, remove so os arquivos soltos consumidos, nunca o Raw/ em si
 *       nem .gitkeep/README. NUNCA apaga fora de Raw/.
 *
 * Saida sempre JSON no stdout. Erro nao-fatal -> exit != 0 com { ok:false, erro }.
 */

const fs = require('fs');
const path = require('path');
const parseArgs = require('./lib/parse-args.cjs');

const RAW_DIR = 'Raw';
const PROJECTS_DIR = 'projects';
const TEMPLATES_DIR = 'templates';
const AVULSO = '_avulso';

const IMAGE_RE = /\.(png|jpg|jpeg|webp)$/i;
const TEXT_RE = /\.(md|txt)$/i;
const TIPOS = ['personagem', 'produto', 'servico'];

// arquivos do esqueleto do Raw/ que NUNCA contam como conteudo de lote nem sao
// apagados/movidos: o esqueleto versionado da caixa de entrada.
const RAW_SKELETON = new Set(['.gitkeep', 'README.md']);

// ----------------------------------------------------------------------------
// path-safety
// ----------------------------------------------------------------------------

// child esta DENTRO de parent (ou e o proprio parent)? rel nao pode subir (..)
// nem ser absoluto. Mesmo criterio do scripts/lib/ensure-dir.cjs.
function isInside(parent, child) {
  const r = path.relative(parent, child);
  return r === '' || (!!r && !r.startsWith('..') && !path.isAbsolute(r));
}

// resolve um arg de path do usuario contra a raiz e garante que cai dentro de
// `base` (Raw/ ou projects/). Rejeita componente "..", path absoluto que escape.
function resolveInside(rootAbs, baseRel, argPath) {
  if (!argPath || typeof argPath !== 'string') {
    return { ok: false, erro: 'path ausente' };
  }
  const baseAbs = path.resolve(rootAbs, baseRel);
  // rejeita explicitamente componente de traversal antes de resolver.
  const parts = String(argPath).split(/[\\/]+/);
  if (parts.includes('..')) {
    return { ok: false, erro: `path com traversal (..) rejeitado: ${argPath}` };
  }
  // resolve contra a raiz (aceita "Raw/x" e "projects/y"; absoluto e tolerado
  // so se ainda cair dentro da base apos a checagem isInside).
  const abs = path.isAbsolute(argPath) ? path.resolve(argPath) : path.resolve(rootAbs, argPath);
  if (!isInside(baseAbs, abs)) {
    return { ok: false, erro: `path fora de ${baseRel}/: ${argPath}` };
  }
  return { ok: true, abs, baseAbs };
}

// nome de projeto valido: sem barra, sem traversal, sem absoluto, nao-vazio,
// nao um dos nomes reservados de navegacao.
function validProjectName(nome) {
  if (!nome || typeof nome !== 'string') return false;
  if (nome === '.' || nome === '..') return false;
  if (/[\\/]/.test(nome)) return false;
  if (path.isAbsolute(nome)) return false;
  if (nome.split(/[\\/]+/).includes('..')) return false;
  return true;
}

// ----------------------------------------------------------------------------
// classificacao
// ----------------------------------------------------------------------------

function classify(nome) {
  if (IMAGE_RE.test(nome)) return 'imagem';
  if (TEXT_RE.test(nome)) return 'texto';
  return 'outro';
}

// arquivos de um diretorio (nao-recursivo), pulando o esqueleto do Raw.
function listLoteFiles(dirAbs, opts) {
  const skipSkeleton = opts && opts.skipSkeleton;
  if (!fs.existsSync(dirAbs)) return [];
  return fs
    .readdirSync(dirAbs, { withFileTypes: true })
    .filter((d) => d.isFile())
    .map((d) => d.name)
    .filter((name) => !(skipSkeleton && RAW_SKELETON.has(name)))
    .sort();
}

// ----------------------------------------------------------------------------
// plan
// ----------------------------------------------------------------------------

function plan(rootAbs) {
  const rawAbs = path.resolve(rootAbs, RAW_DIR);
  if (!fs.existsSync(rawAbs)) {
    return { ok: true, lotes: [], aviso: `${RAW_DIR}/ nao existe` };
  }
  const lotes = [];

  const entries = fs.readdirSync(rawAbs, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name));

  // subpastas = 1 lote cada
  for (const ent of entries) {
    if (!ent.isDirectory()) continue;
    const temaDir = path.join(rawAbs, ent.name);
    const arquivos = listLoteFiles(temaDir).map((nome) => ({
      nome,
      tipo: classify(nome),
      path: `${RAW_DIR}/${ent.name}/${nome}`,
    }));
    lotes.push({
      tema: ent.name,
      path: `${RAW_DIR}/${ent.name}`,
      arquivos,
    });
  }

  // arquivos soltos na raiz do Raw = lote _avulso (pulando o esqueleto)
  const soltos = listLoteFiles(rawAbs, { skipSkeleton: true }).map((nome) => ({
    nome,
    tipo: classify(nome),
    path: `${RAW_DIR}/${nome}`,
  }));
  if (soltos.length > 0) {
    lotes.push({ tema: AVULSO, path: RAW_DIR, arquivos: soltos });
  }

  return { ok: true, lotes };
}

// ----------------------------------------------------------------------------
// scaffold
// ----------------------------------------------------------------------------

// copia recursiva de um diretorio (sem deps; preserva subarvore do template).
function copyTree(srcAbs, dstAbs) {
  const st = fs.statSync(srcAbs);
  if (st.isDirectory()) {
    fs.mkdirSync(dstAbs, { recursive: true });
    for (const name of fs.readdirSync(srcAbs)) {
      copyTree(path.join(srcAbs, name), path.join(dstAbs, name));
    }
  } else {
    fs.copyFileSync(srcAbs, dstAbs);
  }
}

function scaffold(rootAbs, args) {
  const nome = args.projeto;
  const tipo = args.tipo;
  if (!validProjectName(nome)) {
    return { ok: false, erro: `nome de projeto invalido: ${String(nome)}` };
  }
  if (TIPOS.indexOf(tipo) === -1) {
    return { ok: false, erro: `tipo invalido: ${String(tipo)} (use ${TIPOS.join('|')})` };
  }
  const templateAbs = path.resolve(rootAbs, TEMPLATES_DIR, `brand-${tipo}`);
  if (!fs.existsSync(templateAbs)) {
    return { ok: false, erro: `template ausente: ${TEMPLATES_DIR}/brand-${tipo}` };
  }
  const dstAbs = path.resolve(rootAbs, PROJECTS_DIR, nome);
  // dupla checagem de path-safety: o destino tem que cair dentro de projects/.
  if (!isInside(path.resolve(rootAbs, PROJECTS_DIR), dstAbs)) {
    return { ok: false, erro: `destino fora de ${PROJECTS_DIR}/: ${nome}` };
  }
  if (fs.existsSync(dstAbs)) {
    return { ok: false, erro: `projeto ja existe (nunca sobrescreve): ${PROJECTS_DIR}/${nome}` };
  }

  copyTree(templateAbs, dstAbs);

  // ajusta project.json: nome, tipo_marca, status rascunho.
  const projJsonPath = path.join(dstAbs, 'project.json');
  let proj;
  try {
    proj = JSON.parse(fs.readFileSync(projJsonPath, 'utf8'));
  } catch (e) {
    return { ok: false, erro: `project.json do template ilegivel: ${e.message}` };
  }
  proj.nome = nome;
  proj.tipo_marca = tipo;
  proj.status = 'rascunho';
  fs.writeFileSync(projJsonPath, JSON.stringify(proj, null, 2) + '\n', 'utf8');

  return {
    ok: true,
    projeto: `${PROJECTS_DIR}/${nome}`,
    tipo_marca: tipo,
    status: 'rascunho',
    a_partir_de: `${TEMPLATES_DIR}/brand-${tipo}`,
  };
}

// ----------------------------------------------------------------------------
// move
// ----------------------------------------------------------------------------

function move(rootAbs, args) {
  const de = resolveInside(rootAbs, RAW_DIR, args.de);
  if (!de.ok) return { ok: false, erro: `--de invalido: ${de.erro}` };
  const para = resolveInside(rootAbs, PROJECTS_DIR, args.para);
  if (!para.ok) return { ok: false, erro: `--para invalido: ${para.erro}` };

  if (!fs.existsSync(de.abs)) {
    return { ok: false, erro: `origem nao existe: ${args.de}` };
  }
  if (!fs.statSync(de.abs).isFile()) {
    return { ok: false, erro: `origem nao e um arquivo: ${args.de}` };
  }
  if (fs.existsSync(para.abs)) {
    return { ok: false, erro: `destino ja existe (nunca sobrescreve): ${args.para}` };
  }

  // cria o diretorio-pai do destino (dentro de projects/, ja validado).
  fs.mkdirSync(path.dirname(para.abs), { recursive: true });

  // move: rename, com fallback copy+unlink para cross-device (EXDEV).
  try {
    fs.renameSync(de.abs, para.abs);
  } catch (e) {
    if (e.code === 'EXDEV') {
      fs.copyFileSync(de.abs, para.abs);
      fs.unlinkSync(de.abs);
    } else {
      return { ok: false, erro: `falha ao mover: ${e.message}` };
    }
  }

  return {
    ok: true,
    de: relFromRoot(rootAbs, de.abs),
    para: relFromRoot(rootAbs, para.abs),
  };
}

function relFromRoot(rootAbs, abs) {
  return path.relative(rootAbs, abs).replace(/\\/g, '/');
}

// ----------------------------------------------------------------------------
// finalize
// ----------------------------------------------------------------------------

function finalize(rootAbs, args) {
  const tema = args.tema;
  if (!tema || typeof tema !== 'string') {
    return { ok: false, erro: 'informe --tema (nome da subpasta ou _avulso)' };
  }
  const rawAbs = path.resolve(rootAbs, RAW_DIR);

  // _avulso: remove os arquivos soltos consumidos da raiz do Raw, nunca o Raw/
  // em si nem o esqueleto. So apaga o que sobrou e ja foi movido? Nao: avulso nao
  // tem pasta propria — removemos os arquivos soltos restantes (os ainda nao
  // movidos sao "restos"); se quiser preservar nao-processados, o /importa so
  // chama finalize apos mover tudo. Aqui: removemos os soltos remanescentes.
  if (tema === AVULSO) {
    const soltos = listLoteFiles(rawAbs, { skipSkeleton: true });
    const removidos = [];
    for (const nome of soltos) {
      const alvo = path.join(rawAbs, nome);
      // path-safety: o alvo tem que estar dentro de Raw/ e ser arquivo.
      if (!isInside(rawAbs, alvo) || !fs.statSync(alvo).isFile()) continue;
      fs.unlinkSync(alvo);
      removidos.push(`${RAW_DIR}/${nome}`);
    }
    return { ok: true, tema: AVULSO, removidos, preservado: 'Raw/ e esqueleto (.gitkeep, README.md)' };
  }

  // subpasta: so remove a pasta se estiver vazia (ou so com restos ja movidos).
  // path-safety: nome de tema nao pode escapar de Raw/.
  if (/[\\/]/.test(tema) || tema === '.' || tema === '..' || tema.split(/[\\/]+/).includes('..')) {
    return { ok: false, erro: `tema invalido: ${tema}` };
  }
  const temaAbs = path.join(rawAbs, tema);
  if (!isInside(rawAbs, temaAbs)) {
    return { ok: false, erro: `tema fora de ${RAW_DIR}/: ${tema}` };
  }
  if (!fs.existsSync(temaAbs)) {
    return { ok: true, tema, ja_removido: true };
  }
  if (!fs.statSync(temaAbs).isDirectory()) {
    return { ok: false, erro: `tema nao e um diretorio: ${tema}` };
  }

  const restantes = listLoteFiles(temaAbs);
  if (restantes.length > 0) {
    // sobrou arquivo nao-processado: NAO apaga, AVISA.
    return {
      ok: false,
      tema,
      apagado: false,
      aviso: 'lote nao esvaziado: sobraram arquivos nao-processados',
      sobraram: restantes.map((n) => `${RAW_DIR}/${tema}/${n}`),
    };
  }

  // vazio (ou so subdirs vazios) -> remove o diretorio do lote.
  fs.rmSync(temaAbs, { recursive: true, force: true });
  return { ok: true, tema, apagado: `${RAW_DIR}/${tema}` };
}

// ----------------------------------------------------------------------------
// CLI
// ----------------------------------------------------------------------------

function main() {
  const sub = process.argv[2] || 'plan';
  const args = parseArgs(process.argv, 3);
  const rootAbs = path.resolve(args.root || '.');

  let result;
  switch (sub) {
    case 'plan':
      result = plan(rootAbs);
      break;
    case 'scaffold':
      result = scaffold(rootAbs, args);
      break;
    case 'move':
      result = move(rootAbs, args);
      break;
    case 'finalize':
      result = finalize(rootAbs, args);
      break;
    default:
      result = { ok: false, erro: 'subcomando desconhecido', uso: 'plan|scaffold|move|finalize' };
  }

  process.stdout.write(JSON.stringify(result, null, 2) + '\n');
  process.exit(result && result.ok ? 0 : 1);
}

if (require.main === module) {
  main();
}

module.exports = {
  RAW_DIR,
  PROJECTS_DIR,
  TEMPLATES_DIR,
  AVULSO,
  TIPOS,
  isInside,
  resolveInside,
  validProjectName,
  classify,
  plan,
  scaffold,
  move,
  finalize,
};
