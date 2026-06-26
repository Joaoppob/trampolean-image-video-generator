#!/usr/bin/env node
'use strict';

const custos = require('./custos.cjs');
const parseArgs = require('./parse-args.cjs');

const MODELS = [
  {
    id: 'nano_banana_2',
    kind: 'image',
    tier: 'A',
    executable_now: true,
    plan: 'free',
    focus: ['default', 'image', 'reference', 'fast', 'budget', 'product', 'text'],
    best_for: 'Default executavel hoje via CLI: imagem 9:16 com refs, boa aderencia e custo fixo.',
    tradeoff: 'Nao e necessariamente o teto do catalogo vivo; pode ficar abaixo de Soul/Cinema Studio em still cinema-grade.',
    cost_note: `fixo no CLI atual: ${custos.IMAGEM} cr por imagem 9:16`,
  },
  {
    id: 'nano_banana_pro',
    kind: 'image',
    tier: 'S',
    executable_now: false,
    plan: 'paid_or_ac',
    focus: ['text', 'hero', 'quality', 'product', 'poster', 'diagram'],
    best_for: 'Hero image com texto, rotulo, poster, packshot ou aderencia maxima.',
    tradeoff: 'Custo/latencia AC; confirmar slug e preco no Higgsfield antes de prometer.',
    cost_note: 'AC via higgsfield generate cost; nao usar numero fixo',
  },
  {
    id: 'soul_2',
    kind: 'image',
    tier: 'A',
    executable_now: false,
    plan: 'paid_or_ac',
    focus: ['character', 'identity', 'ugc', 'fashion', 'personagem', 'consistencia'],
    best_for: 'Personagem/UGC/fashion com identidade consistente via soul_id.',
    tradeoff: 'Exige fluxo Soul; substitui parte do refs+anchor quando houver credito/plano.',
    cost_note: 'AC via higgsfield generate cost; depende de soul_id/plano',
  },
  {
    id: 'soul_cinematic',
    kind: 'image',
    tier: 'S',
    executable_now: false,
    plan: 'paid_or_ac',
    focus: ['cinema', 'cinematic', 'film', 'lighting', 'stills', 'personagem', 'character'],
    best_for: 'Still cinema-grade, luz dramatica e personagem com acabamento premium.',
    tradeoff: 'Provavel modelo pago; nao e o default CLI desta versao.',
    cost_note: 'AC via higgsfield generate cost; nao usar numero fixo',
  },
  {
    id: 'cinematic_studio_2_5',
    kind: 'image',
    tier: 'S',
    executable_now: false,
    plan: 'paid_or_ac',
    focus: ['cinema', 'film', 'stills', '4k', 'premium', 'lighting'],
    best_for: 'Still cinematografico 4K e campanha com cara de filme.',
    tradeoff: 'Custo/plano AC; usar quando o output precisa bater nivel 100 visual.',
    cost_note: 'AC via higgsfield generate cost; nao usar numero fixo',
  },
  {
    id: 'ms_image',
    kind: 'image',
    tier: 'A',
    executable_now: false,
    plan: 'paid_or_ac',
    focus: ['ad', 'ads', 'dtc', 'produto', 'product', 'brand', 'marketing'],
    best_for: 'Imagem de ad DTC brand-kit-aware, produto e avatar.',
    tradeoff: 'Exige style_id/Marketing Studio; pode curto-circuitar parte do pipeline.',
    cost_note: 'AC via higgsfield generate cost; depende de style_id',
  },
  {
    id: 'veo3_1_lite',
    kind: 'video',
    tier: 'B',
    executable_now: true,
    plan: 'free',
    focus: ['default', 'free', 'volume', 'fast', 'hook', 'simple', 'budget'],
    best_for: 'Default executavel hoje via CLI: volume, hooks simples, produto com baixo movimento, 4s 9:16.',
    tradeoff: 'Nao e o teto; quebra mais em fisica complexa, hero shot e movimento ambicioso.',
    cost_note: `fixo no CLI atual: ${custos.VIDEO} cr por video 4s 9:16 com --duration 4`,
  },
  {
    id: 'veo3_1',
    kind: 'video',
    tier: 'S',
    executable_now: false,
    plan: 'paid_or_ac',
    focus: ['hero', 'cinema', 'cinematic', 'audio', 'quality', 'physics', 'film'],
    best_for: 'Hero shot cinematografico, audio nativo e fisica mais confiavel que o Lite.',
    tradeoff: 'Custo alto e clipe curto; confirmar plano/preco antes de rodar.',
    cost_note: 'AC via higgsfield generate cost; web sugere custo alto',
  },
  {
    id: 'cinematic_studio_3_0',
    kind: 'video',
    tier: 'S',
    executable_now: false,
    plan: 'paid_or_ac',
    focus: ['hero', 'cinema', 'cinematic', 'sota', 'film', 'quality', 'premium'],
    best_for: 'Modelo cinema-grade/SOTA para hero video premium.',
    tradeoff: 'Provavel pago; usar quando o objetivo e teto de craft, nao volume.',
    cost_note: 'AC via higgsfield generate cost; nao usar numero fixo',
  },
  {
    id: 'seedance_2_0',
    kind: 'video',
    tier: 'S/A',
    executable_now: false,
    plan: 'paid_or_ac',
    focus: ['control', 'controle', 'commercial', 'ad', 'ads', 'identity', 'character', 'lip-sync', 'audio', 'reference'],
    best_for: 'Ad comercial on-brief, controle de camera, refs, personagem e audio/lip-sync.',
    tradeoff: 'Pode exigir plano Plus/verificacao; menos experimental, mais disciplinado.',
    cost_note: 'AC via higgsfield generate cost; plano pode bloquear',
  },
  {
    id: 'kling3_0',
    kind: 'video',
    tier: 'A',
    executable_now: false,
    plan: 'paid_or_ac',
    focus: ['volume', 'hook', 'social', 'motion', 'person', '4k', 'fashion'],
    best_for: 'Variacoes sociais em volume, movimento humano e hooks para teste criativo.',
    tradeoff: 'Risco operacional/deriva de cor; teto hero abaixo de Veo/Cinematic Studio.',
    cost_note: 'AC via higgsfield generate cost; nao usar numero fixo',
  },
  {
    id: 'marketing_studio_video',
    kind: 'video',
    tier: 'A',
    executable_now: false,
    plan: 'paid_or_ac',
    focus: ['ad', 'ads', 'marketing', 'tiktok', 'reels', 'product', 'hooks'],
    best_for: 'Ad de produto one-click para TikTok/Reels com hooks/settings/ad_reference.',
    tradeoff: 'Pode ser atalho de pipeline, mas reduz controle artesanal por cena.',
    cost_note: 'AC via higgsfield generate cost; depende do Marketing Studio',
  },
];

function normalizeKind(kind) {
  const k = String(kind || '').toLowerCase();
  if (k === 'imagem') return 'image';
  if (k === 'video') return 'video';
  return k === 'image' ? 'image' : 'video';
}

function textScore(model, objective) {
  const text = String(objective || '').toLowerCase();
  let score = model.executable_now ? 12 : 0;
  if (model.tier === 'S') score += 25;
  else if (model.tier === 'S/A') score += 22;
  else if (model.tier === 'A') score += 16;
  else score += 8;
  for (const token of model.focus) {
    if (text.includes(token)) score += 18;
  }
  if (/free|barat|budget|volume|hook|teste|rapido/.test(text) && model.plan === 'free') score += 35;
  if (/hero|cinema|cinematic|premium|nivel 100|qualidade maxima/.test(text) && model.tier.includes('S')) score += 30;
  if (/personagem|character|identidade|consisten/.test(text) && /soul|seedance/.test(model.id)) score += 35;
  if (/produto|product|dtc|marketing|ad\b|ads/.test(text) && /marketing|ms_|seedance|nano/.test(model.id)) score += 20;
  if (/audio|som|lip/.test(text) && model.kind === 'video' && /veo3_1|seedance|marketing/.test(model.id)) score += 25;
  return score;
}

function sortOptions(options, objective) {
  return options
    .map((model) => Object.assign({ fit_score: textScore(model, objective) }, model))
    .sort((a, b) => b.fit_score - a.fit_score || String(a.id).localeCompare(String(b.id)));
}

function recommendModels(input = {}) {
  const kind = normalizeKind(input.kind || input.outputType);
  const objective = input.objective || input.objetivo || '';
  const plan = String(input.plan || input.plano || 'unknown').toLowerCase();
  const credits = input.credits === undefined || input.credits === null || input.credits === ''
    ? null
    : Number(input.credits);
  const options = sortOptions(MODELS.filter((model) => model.kind === kind), objective);
  const current = options.find((model) => model.executable_now) || null;
  let recommended = options[0] || null;
  if (plan === 'free' && /free|barat|budget|volume|hook|teste|rapido/.test(String(objective).toLowerCase())) {
    recommended = current || recommended;
  }

  const warnings = [];
  if (plan === 'free' && recommended && !recommended.executable_now) {
    warnings.push(`Plano free/saldo atual nao executa ${recommended.id} automaticamente; apresente como upgrade/topup e use ${current && current.id} se o usuario quiser seguir agora.`);
  }
  if (credits !== null && Number.isFinite(credits) && credits <= 0) {
    warnings.push('Credito atual e 0; nada pago roda agora. A assessoria mostra o teto, nao autoriza gasto.');
  }
  warnings.push('Custos de modelos nao-default sao AC: confirme com higgsfield generate cost antes de prometer preco.');
  warnings.push('Execucao automatica desta versao continua via CLI; modelos nao-default sao decisao informada do usuario antes de integrar rota propria.');

  return {
    kind,
    objective,
    plan,
    credits,
    current_executable_model: current,
    recommended,
    options: options.slice(0, 5),
    warnings,
  };
}

function printHuman(advice) {
  const lines = [];
  lines.push(`# Assessoria de modelo (${advice.kind})`);
  lines.push(`Objetivo: ${advice.objective || '(nao informado)'}`);
  lines.push(`Modelo executavel agora: ${advice.current_executable_model.id} (${advice.current_executable_model.cost_note})`);
  lines.push(`Parecer: ${advice.recommended.id} - ${advice.recommended.best_for}`);
  lines.push('');
  lines.push('| modelo | tier | roda agora? | melhor para | custo | tradeoff |');
  lines.push('|---|---|---|---|---|---|');
  for (const option of advice.options) {
    lines.push(`| ${option.id} | ${option.tier} | ${option.executable_now ? 'sim' : 'nao'} | ${option.best_for} | ${option.cost_note} | ${option.tradeoff} |`);
  }
  lines.push('');
  for (const warning of advice.warnings) lines.push(`- ${warning}`);
  return `${lines.join('\n')}\n`;
}

module.exports = {
  MODELS,
  recommendModels,
  printHuman,
};

if (require.main === module) {
  const args = parseArgs(process.argv);
  const kind = args.kind || args.tipo || process.argv[2];
  const objective = args.objective || args.objetivo || args.o || '';
  const advice = recommendModels({
    kind,
    objective,
    plan: args.plan || args.plano,
    credits: args.credits || args.creditos || args.saldo,
  });
  if (args.json === true || args.json === 'true') {
    process.stdout.write(`${JSON.stringify(advice, null, 2)}\n`);
  } else {
    process.stdout.write(printHuman(advice));
  }
}
