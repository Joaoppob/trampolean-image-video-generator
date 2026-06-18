#!/usr/bin/env node
/**
 * concat-reel.cjs — montagem do reel 9:16 via FFmpeg (etapa 4 do pipeline).
 *
 * Faz, em ordem:
 *   1. CHECK de FFmpeg (ffmpeg -version; fallback where/which). Ausente -> PARA
 *      com instrucoes de instalacao por OS. NAO prossegue sem FFmpeg.
 *   2. Concat normalizado de N clipes pra 1080x1920 9:16
 *   3. Legenda opcional via drawtext (caixa OU contorno, zona segura vertical,
 *      escape de fonte por OS — pegadinha do C\: no Windows).
 *   4. Saida com timestamp em output/reels/reel-YYYYMMDD-HHMMSS.mp4 (nao sobrescreve).
 *   5. ffprobe da saida -> resolucao + duracao no resultado.
 *
 * Uso:
 *   node concat-reel.cjs --check                       (so checa FFmpeg, exit 0/1)
 *   node concat-reel.cjs --clips "a.mp4,b.mp4,c.mp4" --root <repo> \
 *        [--legenda "BAIXE AGORA"] [--legenda-estilo caixa|contorno] \
 *        [--legenda-inicio 3] [--legenda-fim 8] [--fontsize 72] [--dry-run]
 *
 * exit 0 = ok; exit 1 = FFmpeg ausente ou erro de montagem. Resultado em JSON no stdout.
 */

const { execFileSync, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const parseArgs = require('../../../../scripts/lib/parse-args.cjs');

// ---------- 1. CHECK FFMPEG ----------
function checkFfmpeg() {
  const probe = spawnSync('ffmpeg', ['-version'], { encoding: 'utf8', timeout: 5000 });
  if (!probe.error && probe.status === 0) {
    const firstLine = (probe.stdout || '').split('\n')[0].trim();
    return { ok: true, versao: firstLine };
  }
  // fallback: where (win) / which (unix)
  const finder = process.platform === 'win32' ? 'where' : 'which';
  const found = spawnSync(finder, ['ffmpeg'], { encoding: 'utf8' });
  if (!found.error && found.status === 0 && (found.stdout || '').trim()) {
    return { ok: true, versao: 'encontrado em: ' + found.stdout.trim().split('\n')[0] };
  }
  return { ok: false, instrucoes: instrucoesInstalacao() };
}

function instrucoesInstalacao() {
  const plat = process.platform;
  const comum = 'Site oficial de builds por OS: https://ffmpeg.org/download.html';
  if (plat === 'win32') {
    return {
      os: 'Windows',
      comandos: [
        'winget install Gyan.FFmpeg',
        'choco install ffmpeg   (se usa Chocolatey)',
      ],
      manual:
        'Ou baixe de https://www.gyan.dev/ffmpeg/builds/ e adicione a pasta bin/ ao PATH. ' +
        'Reinicie o terminal/Claude Code apos instalar pra o PATH atualizar.',
      ref: comum,
    };
  }
  if (plat === 'darwin') {
    return {
      os: 'macOS',
      comandos: ['brew install ffmpeg'],
      manual: 'Requer Homebrew (https://brew.sh).',
      ref: comum,
    };
  }
  return {
    os: 'Linux',
    comandos: [
      'Debian/Ubuntu: sudo apt update && sudo apt install -y ffmpeg',
      'Fedora:        sudo dnf install -y ffmpeg   (pode exigir RPM Fusion)',
      'Arch:          sudo pacman -S ffmpeg',
    ],
    manual: '',
    ref: comum,
  };
}

// ---------- fonte por OS (drawtext) ----------
function fontFileForOs() {
  const plat = process.platform;
  if (plat === 'win32') {
    // o ':' do drive PRECISA ser escapado no filter (C\:/...)
    return { path: 'C\\:/Windows/Fonts/arialbd.ttf', existsCheck: 'C:/Windows/Fonts/arialbd.ttf' };
  }
  if (plat === 'darwin') {
    const p = '/System/Library/Fonts/Supplemental/Arial Bold.ttf';
    return { path: p, existsCheck: p };
  }
  const p = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf';
  return { path: p, existsCheck: p };
}

// escape de texto pro drawtext (a pegadinha que quebra o filtro silenciosamente)
function escapeDrawtext(text) {
  return String(text)
    .replace(/\\/g, '\\\\') // barra primeiro
    .replace(/\[/g, '\\[')
    .replace(/\]/g, '\\]')
    .replace(/=/g, '\\=')
    .replace(/:/g, '\\:')
    .replace(/%/g, '%%')
    .replace(/'/g, "'\\''")
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, ' ');
}

// ---------- 2. filter_complex de concat (N clipes) ----------
function buildConcatFilter(clips) {
  const n = clips.length;
  const parts = [];
  const labels = [];
  for (let k = 0; k < n; k++) {
    parts.push(
      `[${k}:v]scale=1080:1920:force_original_aspect_ratio=decrease,` +
        `pad=1080:1920:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=24[v${k}]`
    );
    labels.push(`[v${k}]`);
  }
  // a=0: clipes veo3_1_lite free sao mudos
  const concat = `${labels.join('')}concat=n=${n}:v=1:a=0[outv]`;
  return parts.join(';') + ';' + concat;
}

// ---------- 3. drawtext (legenda opcional) ----------
function buildDrawtext(opts) {
  const font = fontFileForOs();
  if (!fs.existsSync(font.existsCheck)) {
    // fallback fontconfig (mac/linux) ou aborta no windows
    if (process.platform === 'win32') {
      throw new Error(
        `Fonte nao encontrada: ${font.existsCheck}. Instale Arial ou ajuste o fontfile.`
      );
    }
    // mac/linux: deixa o fontconfig resolver via font=
    font.useFontconfig = true;
  }

  const fontsize = Number(opts.fontsize) || 72;
  const text = escapeDrawtext(opts.legenda);
  const estilo = opts['legenda-estilo'] || 'caixa';

  const segs = [];
  if (font.useFontconfig) {
    segs.push(`font='Sans Bold'`);
  } else {
    segs.push(`fontfile='${font.path}'`);
  }
  segs.push(`text='${text}'`);
  segs.push(`fontsize=${fontsize}`);
  segs.push(`fontcolor=white`);

  if (estilo === 'contorno') {
    segs.push(`borderw=6`, `bordercolor=black`);
  } else {
    // caixa (default) — mais legivel pra CTA
    segs.push(`box=1`, `boxcolor=black@0.55`, `boxborderw=24`);
  }

  // posicao: centralizado horizontal, ancorado na zona segura inferior (~180px da base)
  segs.push(`x=(w-text_w)/2`, `y=h-text_h-180`);

  // intervalo opcional de exibicao
  const ini = opts['legenda-inicio'];
  const fim = opts['legenda-fim'];
  if (ini !== undefined && fim !== undefined) {
    segs.push(`enable='between(t,${Number(ini)},${Number(fim)})'`);
  }

  return 'drawtext=' + segs.join(':');
}

// ---------- saida com timestamp ----------
function timestampedOutput(root) {
  const d = new Date();
  const pad = (x) => String(x).padStart(2, '0');
  const stamp =
    `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-` +
    `${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
  const dir = path.resolve(root || '.', 'output', 'reels');
  fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, `reel-${stamp}.mp4`);
}

// ---------- ffprobe da saida ----------
function probe(file) {
  const r = spawnSync(
    'ffprobe',
    [
      '-v', 'error',
      '-select_streams', 'v:0',
      '-show_entries', 'stream=width,height,r_frame_rate:format=duration',
      '-of', 'json',
      file,
    ],
    { encoding: 'utf8' }
  );
  if (r.status !== 0) return null;
  try {
    const j = JSON.parse(r.stdout);
    const s = (j.streams && j.streams[0]) || {};
    return {
      resolucao: s.width && s.height ? `${s.width}x${s.height}` : null,
      fps: s.r_frame_rate || null,
      duracao_seg: j.format && j.format.duration ? Number(j.format.duration) : null,
    };
  } catch (_) {
    return null;
  }
}

// ---------- main ----------
function main() {
  const args = parseArgs(process.argv);

  // modo so-check
  if (args.check) {
    const c = checkFfmpeg();
    process.stdout.write(JSON.stringify(c, null, 2) + '\n');
    process.exit(c.ok ? 0 : 1);
  }

  // 1. check obrigatorio antes de qualquer montagem
  const c = checkFfmpeg();
  if (!c.ok) {
    process.stdout.write(
      JSON.stringify(
        {
          ok: false,
          etapa: 'check-ffmpeg',
          erro: 'FFmpeg ausente. PARANDO antes de montar.',
          instrucoes: c.instrucoes,
        },
        null,
        2
      ) + '\n'
    );
    process.exit(1);
  }

  const root = args.root || '.';
  const clips = String(args.clips || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  if (clips.length === 0) {
    process.stdout.write(
      JSON.stringify({ ok: false, erro: 'nenhum clipe passado (--clips a.mp4,b.mp4)' }, null, 2) + '\n'
    );
    process.exit(1);
  }

  // valida existencia dos clipes (resolve relativo a root)
  const resolved = clips.map((cl) => (path.isAbsolute(cl) ? cl : path.resolve(root, cl)));

  // guard de path traversal: cada clip resolvido deve ser filho da raiz do repo
  // nota: symlinks apontando fora da raiz NAO sao cobertos por este guard (sem realpath)
  const rootAbs = path.resolve(root);
  const rootCmp = process.platform === 'win32' ? rootAbs.toLowerCase() : rootAbs;
  const fora = resolved.filter((p) => {
    const pc = process.platform === 'win32' ? p.toLowerCase() : p;
    return !pc.startsWith(rootCmp + path.sep);
  });
  if (fora.length) {
    process.stdout.write(JSON.stringify({ ok: false, etapa: 'validacao-clips', erro: 'clip fora da raiz do repo', fora }) + '\n');
    process.exit(1);
  }

  const faltando = resolved.filter((p) => !fs.existsSync(p));
  if (faltando.length) {
    process.stdout.write(
      JSON.stringify({ ok: false, erro: 'clipes nao encontrados', faltando }, null, 2) + '\n'
    );
    process.exit(1);
  }

  const out = timestampedOutput(root);

  // 2+3. monta o comando ffmpeg
  const concatFilter = buildConcatFilter(resolved);
  const ffArgs = [];
  resolved.forEach((p) => ffArgs.push('-i', p));

  let mapLabel = '[outv]';
  let lastFilter = concatFilter;

  // se tem legenda, encadeia o drawtext apos o concat
  if (args.legenda && args.legenda !== true) {
    let dt;
    try {
      dt = buildDrawtext(args);
    } catch (e) {
      process.stdout.write(
        JSON.stringify({ ok: false, etapa: 'legenda', erro: e.message }, null, 2) + '\n'
      );
      process.exit(1);
    }
    // [outv] -> drawtext -> [final]
    lastFilter = `${concatFilter};[outv]${dt}[final]`;
    mapLabel = '[final]';
  }

  ffArgs.push('-filter_complex', lastFilter);
  ffArgs.push('-map', mapLabel);
  ffArgs.push('-c:v', 'libx264', '-preset', 'fast', '-pix_fmt', 'yuv420p', '-movflags', '+faststart');
  ffArgs.push('-y', out);

  if (args['dry-run']) {
    process.stdout.write(
      JSON.stringify(
        {
          ok: true,
          dry_run: true,
          comando: 'ffmpeg ' + ffArgs.map((a) => (/[ \\]/.test(a) ? `"${a}"` : a)).join(' '),
          saida_prevista: out,
          n_clipes: resolved.length,
        },
        null,
        2
      ) + '\n'
    );
    process.exit(0);
  }

  // 4. executa
  const run = spawnSync('ffmpeg', ffArgs, { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });
  if (run.status !== 0) {
    process.stdout.write(
      JSON.stringify(
        {
          ok: false,
          etapa: 'ffmpeg',
          erro: 'falha na montagem',
          stderr: (run.stderr || '').split('\n').slice(-15).join('\n'),
        },
        null,
        2
      ) + '\n'
    );
    process.exit(1);
  }

  // 5. probe da saida
  const meta = probe(out);
  process.stdout.write(
    JSON.stringify(
      { ok: true, saida: out, n_clipes: resolved.length, legenda: args.legenda || null, metadata: meta },
      null,
      2
    ) + '\n'
  );
  process.exit(0);
}

if (require.main === module) {
  main();
}

module.exports = { buildConcatFilter, buildDrawtext, escapeDrawtext, fontFileForOs, checkFfmpeg };
