#!/usr/bin/env node
/**
 * preflight.js — calculo deterministico de custo de um run Higgsfield.
 *
 * NAO chama o MCP nem a rede. Recebe o saldo REAL (descoberto pelo agente
 * via mcp__higgsfield__balance / show_plans_and_credits) e o numero de cenas,
 * e devolve a decisao de seguir ou parar.
 *
 * Custos fixos (free tier, provados nos spikes de 2026-06-17):
 *   - imagem (nano_banana_pro) = 2 creditos
 *   - video  (veo3_1_lite, 4s) = 4 creditos
 * Teto free = 10 creditos/dia, pool compartilhado img+video.
 *
 * Uso:
 *   node preflight.js --cenas <N> [--saldo <S>] [--com-video true|false] [--teto-dia 10]
 *
 * Sai com JSON no stdout. exit 0 sempre (a decisao esta no campo pode_prosseguir).
 */

const CUSTO_IMAGEM = 2;
const CUSTO_VIDEO = 4;
const TETO_DIA_FREE = 10;

function parseArgs(argv) {
  const out = {};
  for (let i = 2; i < argv.length; i++) {
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

function toBool(v, def) {
  if (v === undefined) return def;
  if (typeof v === 'boolean') return v;
  return String(v).toLowerCase() !== 'false' && String(v) !== '0';
}

function preflight({ cenas, saldo, comVideo, tetoDia }) {
  if (cenas === undefined || cenas === null || cenas === '') {
    return { erro: 'numero de cenas invalido ou ausente (use --cenas <N>)' };
  }
  const n = Math.max(0, Math.floor(Number(cenas) || 0));
  if (n === 0) {
    return { erro: 'numero de cenas deve ser pelo menos 1 (recebido: 0)' };
  }
  const incluiVideo = comVideo !== false;
  const teto = Number.isFinite(Number(tetoDia)) ? Number(tetoDia) : TETO_DIA_FREE;

  const custoImagens = n * CUSTO_IMAGEM;
  const custoVideos = incluiVideo ? n * CUSTO_VIDEO : 0;
  const custoTotal = custoImagens + custoVideos;

  // dias necessarios no plano free (teto diario), arredondado pra cima
  const diasFree = teto > 0 ? Math.ceil(custoTotal / teto) : null;

  // saldo: pode ser desconhecido (agente nao conseguiu o tool)
  const saldoConhecido = saldo !== undefined && saldo !== null && saldo !== '';
  const saldoNum = saldoConhecido ? Number(saldo) : null;

  let podeProsseguir;
  let poolBaixo = false;
  let mensagem;

  if (!saldoConhecido) {
    // sem saldo real: nao bloqueia, mas avisa que a 1a chamada que estourar
    // retorna erro de credito SEM cobrar (tratar como sinal, nao falha fatal)
    podeProsseguir = true;
    mensagem =
      `Custo estimado do run: ${custoTotal} creditos ` +
      `(${n} imagens x ${CUSTO_IMAGEM} = ${custoImagens}` +
      (incluiVideo ? ` + ${n} videos x ${CUSTO_VIDEO} = ${custoVideos}` : '') +
      `). Saldo real INDISPONIVEL (tool de saldo nao retornou). ` +
      `Seguindo de forma defensiva: se uma chamada estourar o teto, o Higgsfield ` +
      `recusa SEM cobrar credito — trate como sinal pra pausar e retomar amanha. ` +
      `No free tier (${teto} cr/dia) este run levaria ~${diasFree} dia(s).`;
  } else if (custoTotal > saldoNum) {
    podeProsseguir = false;
    mensagem =
      `NAO da pra rodar o run inteiro agora. Custo total = ${custoTotal} cr, ` +
      `saldo atual = ${saldoNum} cr (faltam ${custoTotal - saldoNum} cr). ` +
      `Opcoes: (1) reduzir o numero de cenas; (2) esperar o pool free renovar ` +
      `(${teto} cr/dia, ~${diasFree} dia(s) pro run completo); (3) plano pago. ` +
      `Disparos recusados por falta de credito NAO cobram — nada e perdido por checar.`;
  } else {
    podeProsseguir = true;
    poolBaixo = saldoNum < custoTotal * 2;
    mensagem =
      `OK pra prosseguir. Custo total = ${custoTotal} cr ` +
      `(${custoImagens} imagens` +
      (incluiVideo ? ` + ${custoVideos} videos` : '') +
      `), saldo = ${saldoNum} cr.`;
    if (poolBaixo) {
      mensagem +=
        ` AVISO: pool baixo (saldo < 2x o custo do run). ` +
        `Sem folga pra regenerar cenas falhas sem renovar o pool.`;
    }
  }

  return {
    cenas: n,
    inclui_video: incluiVideo,
    saldo: saldoNum,
    saldo_conhecido: saldoConhecido,
    custo_imagens: custoImagens,
    custo_videos: custoVideos,
    custo_total: custoTotal,
    teto_dia: teto,
    dias_free: diasFree,
    pool_baixo: poolBaixo,
    pode_prosseguir: podeProsseguir,
    mensagem,
  };
}

if (require.main === module) {
  const args = parseArgs(process.argv);
  const result = preflight({
    cenas: args.cenas,
    saldo: args.saldo,
    comVideo: toBool(args['com-video'], true),
    tetoDia: args['teto-dia'],
  });
  process.stdout.write(JSON.stringify(result, null, 2) + '\n');
  process.exit(0);
}

module.exports = { preflight, CUSTO_IMAGEM, CUSTO_VIDEO, TETO_DIA_FREE };
