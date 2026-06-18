'use strict';

/**
 * custos.cjs — fonte unica de custos do gerador (free tier Higgsfield).
 *
 * Provados nos spikes de 2026-06-17:
 *   - imagem (nano_banana_pro) = 2 creditos
 *   - video  (veo3_1_lite, 4s) = 4 creditos
 *   - teto free = 10 creditos/dia (pool compartilhado img+video)
 *   - cada cena = 4 segundos de video
 *
 * Quem precisa desses numeros importa daqui — nao recodifica o literal.
 */
module.exports = { IMAGEM: 2, VIDEO: 4, TETO_DIA: 10, DURACAO_CENA_SEG: 4 };
