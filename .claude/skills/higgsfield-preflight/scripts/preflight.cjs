#!/usr/bin/env node
/**
 * preflight.js — calculo deterministico de custo de um run Higgsfield.
 *
 * NAO chama o CLI nem a rede. Recebe o saldo REAL (descoberto pelo agente
 * via `higgsfield account status --json` -> campo credits) e o numero de cenas,
 * e devolve a decisao de seguir ou parar.
 *
 * Custos fixos (free tier, confirmados ao vivo no CLI 2026-06-18):
 *   - imagem (nano_banana_2)            = 2 creditos
 *   - video  (veo3_1_lite, --duration 4)= 4 creditos
 * Teto free = 10 creditos/dia, pool compartilhado img+video.
 * ATENCAO: veo3_1_lite custa 8 cr no default (duration=8); o 4 so vale com
 * --duration 4, que a skill gera-video sempre passa.
 *
 * Uso:
 *   node preflight.js --cenas <N> [--saldo <S>] [--com-video true|false] [--teto-dia 10]
 *
 * Sai com JSON no stdout. exit 0 sempre (a decisao esta no campo pode_prosseguir).
 */

const custos = require('../../../../scripts/lib/custos.cjs');
const parseArgs = require('../../../../scripts/lib/parse-args.cjs');

const CUSTO_IMAGEM = custos.IMAGEM;
const CUSTO_VIDEO = custos.VIDEO;
const TETO_DIA_FREE = custos.TETO_DIA;

function toBool(v, def) {
  if (v === undefined) return def;
  if (typeof v === 'boolean') return v;
  return String(v).toLowerCase() !== 'false' && String(v) !== '0';
}

function preflight({ cenas, saldo, comVideo, tetoDia }) {
  if (cenas === undefined || cenas === null || cenas === '') {
    return { erro: 'numero de cenas invalido ou ausente (use --cenas <N>)' };
  }
  if (!Number.isFinite(Number(cenas))) {
    return { erro: `numero de cenas invalido: nao e numero (recebido: ${String(cenas)})` };
  }
  const n = Math.max(0, Math.floor(Number(cenas)));
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
