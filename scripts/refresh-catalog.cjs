#!/usr/bin/env node
'use strict';

/**
 * refresh-catalog.cjs — consulta o catalogo VIVO do Higgsfield e atualiza o cache.
 *
 * Roda `higgsfield model list --image` e `--video`, parseia, grava o cache que o
 * model-advisor le, e carimba o token "catalogo consultado" que o hook PreToolUse
 * exige antes de liberar `higgsfield generate create`. Ou seja: rodar isto e o passo
 * que (a) atualiza o catalogo sem hardcode e (b) destrava a geracao.
 *
 * Uso (Jotaro roda no Passo de apresentar modelos, antes de gerar):
 *   node scripts/refresh-catalog.cjs
 *
 * Sai 0 se conseguiu pelo menos uma lista; 1 se o CLI nao respondeu (ai o advisor
 * cai no fallback hardcoded com aviso, mas a geracao continua bloqueada ate consultar).
 */

const { execSync } = require('child_process');
const catalog = require('./lib/catalog.cjs');

// Usa execSync (shell) para resolver o `higgsfield.cmd` do npm no Windows — execFile
// sem shell nao acha o .cmd. flag = "--image" | "--video".
function fetchList(flag) {
  for (const bin of ['higgsfield', 'hf']) {
    try {
      return execSync(`${bin} model list ${flag}`, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    } catch (_) { /* tenta o proximo bin */ }
  }
  return null;
}

function main() {
  const repoRoot = process.cwd();
  const imgRaw = fetchList('--image');
  const vidRaw = fetchList('--video');

  if (imgRaw === null && vidRaw === null) {
    process.stderr.write('[refresh-catalog] higgsfield CLI nao respondeu (auth? instalado?). Rode /setup. Catalogo NAO atualizado.\n');
    process.exit(1);
  }

  const models = []
    .concat(catalog.parseModelList(imgRaw || ''))
    .concat(catalog.parseModelList(vidRaw || ''));

  // dedup por slug
  const seen = new Set();
  const uniq = models.filter((m) => (seen.has(m.slug) ? false : (seen.add(m.slug), true)));

  catalog.writeCache(repoRoot, uniq);
  catalog.stampSeen(repoRoot);

  const imgs = uniq.filter((m) => m.type === 'image').length;
  const vids = uniq.filter((m) => m.type === 'video').length;
  process.stdout.write(`Catalogo vivo atualizado: ${uniq.length} modelos (${imgs} imagem, ${vids} video). Geracao destravada (token de consulta carimbado).\n`);
  process.exit(0);
}

if (require.main === module) main();

module.exports = { fetchList };
