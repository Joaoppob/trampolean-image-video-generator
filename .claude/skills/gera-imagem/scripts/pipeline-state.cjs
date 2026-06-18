#!/usr/bin/env node
/**
 * DEPRECATED — copia mantida para compatibilidade com chamadas antigas.
 * Canonico: scripts/pipeline-state.cjs.
 *
 * Este shim redireciona toda execucao para o canonical.
 */
'use strict';

const { spawnSync } = require('child_process');
const path = require('path');

const CANONICAL = path.resolve(__dirname, '..', '..', '..', '..', 'scripts', 'pipeline-state.cjs');
const args = process.argv.slice(2);
const r = spawnSync('node', [CANONICAL, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
process.stdout.write(r.stdout || '');
if (r.stderr) process.stderr.write(r.stderr);
if (r.error) { process.stderr.write('[pipeline-state-shim] spawn error: ' + r.error.message + '\n'); process.exit(1); }
process.exit(r.status !== null ? r.status : 1);
