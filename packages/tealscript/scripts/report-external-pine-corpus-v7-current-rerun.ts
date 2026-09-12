#!/usr/bin/env tsx

import fs from 'node:fs';
import path from 'node:path';

type Stage = 'parse' | 'semantic' | 'compile' | 'execute' | 'output';

type CorpusRow = {
  localPath: string;
  firstFailedStage?: Stage | null;
  outcome: string;
  stages: Partial<Record<Stage, { diagnostic?: string }>>;
};

type CorpusReport = {
  generatedAt: string;
  summary: {
    total: number;
    funnel: Record<string, { count: number; percent: number }>;
    achievableCeiling: {
      denominator: number;
      funnel: Record<string, { count: number; percent: number }>;
    };
    validity: Record<string, number>;
    outcomes: Record<string, number>;
  };
  rows: CorpusRow[];
};

type Movement = {
  row: string;
  previousStage: Stage | null;
  previousOutcome: string;
  previousDiagnostic: string;
  currentStage: Stage | null;
  currentOutcome: string;
  currentDiagnostic: string;
  attribution: Attribution;
};

type Attribution = {
  commit: string;
  owner: string;
  cause: string;
  note: string;
};

const ROOT = path.resolve(import.meta.dirname, '..');
const BASELINE_REPORT = path.join(
  ROOT,
  '.cache/tealscript/pine-corpus-v7-20260911/fixture-profiles-current-2e05553bda/external-pine-corpus-v7-daily-standard.json',
);
const CURRENT_REPORT = path.join(ROOT, 'reports/external-pine-corpus-v7.daily-rerun-306e72ba5f.json');
const OUT_JSON = path.join(ROOT, 'reports/external-pine-corpus-v7.current-rerun-306e72ba5f-v1.json');
const OUT_MD = path.join(ROOT, 'reports/external-pine-corpus-v7.current-rerun-306e72ba5f-v1.md');

const BASELINE_SHA = 'bbcbf3d22069bbddcce4a3a66c37821ac0fe33b4';
const CURRENT_SHA = '306e72ba5f22cd9d6b609ae7a699b7521f80ffa2';
const SAME_AS_PRIOR_CURRENT_SHA = '7c08371da1';

const PARSER_SEMANTIC_FIX: Attribution = {
  commit: '45879c94f3',
  owner: 'parser/semantic',
  cause: 'v7 parser and semantic acceptance fixes',
  note: 'Rows that previously stopped in parse or semantic now produce output after the v7 parser/semantic closure.',
};

const MATRIX_EIGEN_FIX: Attribution = {
  commit: 'd97a799a6f',
  owner: 'runtime',
  cause: 'matrix eigen complex-result handling',
  note: 'Rows that previously aborted in matrix eigen decomposition now produce output.',
};

const TA_LENGTH_DROP: Attribution = {
  commit: '67e6023355',
  owner: 'runtime',
  cause: 'invalid TA length now rejects',
  note: 'Formerly producing rows now fail loudly because non-positive/fractional/non-finite TA lengths are refused instead of coerced. This is the runtime commit merged to parity by 39757006c2, the commit recorded in packages/tealscript/CLAUDE.md for corpus-drop attribution.',
};

const PROPAGATED_RUNTIME_ERROR_DROP: Attribution = {
  commit: '1e52cd8518',
  owner: 'runtime',
  cause: 'Pine runtime boundary errors now propagate',
  note: 'Formerly producing rows now fail with real Pine runtime limits instead of hiding the failure at the compiled boundary.',
};

const GAIN_ATTRIBUTIONS = new Map<string, Attribution>([
  ['sources/0100__TommyPang-TradingBot__pillar7_catalysts.pine', PARSER_SEMANTIC_FIX],
  ['sources/0101__DarthBuddha-TradingView__MoneyFlow.pine', PARSER_SEMANTIC_FIX],
  ['sources/0102__DarthBuddha-TradingView__BuddhaMoneyFlow.pine', PARSER_SEMANTIC_FIX],
  ['sources/0115__agejevasv-tradingview__marketprofile.pine', PARSER_SEMANTIC_FIX],
  ['sources/0116__s4mn0v-pinescript__market-profile.pine', PARSER_SEMANTIC_FIX],
  ['sources/0141__pineforge-4pass-pineforge-corpus__strategy.pine', MATRIX_EIGEN_FIX],
  ['sources/0142__MeridianAlgo-Pine-A-Script__Singular_Spectrum_Decomposition_LuxAlgo.pine', MATRIX_EIGEN_FIX],
  ['sources/0143__pineforge-4pass-pineforge-benchmarks-assets__strategy.pine', MATRIX_EIGEN_FIX],
  ['sources/0144__regalouisei-collect-tradingview__rolling-ssa-oscillator-luxalgo.pine', MATRIX_EIGEN_FIX],
  ['sources/0145__pineforge-4pass-pineforge-codegen-oss__validation__matrix-eigen-rank-deficient-cov-01.pine', MATRIX_EIGEN_FIX],
  ['sources/0146__helenananaa-pine-compat-runtime__matrix_eigenvalues.pine', MATRIX_EIGEN_FIX],
  ['sources/0160__helenananaa-pine-compat-runtime__matrix_eigenvectors.pine', MATRIX_EIGEN_FIX],
  ['sources/0243__ainell-owi-LePine__Siege-_structure-_engine_v6.pine', PARSER_SEMANTIC_FIX],
  ['sources/0411__deepentropy-lightweight-charts-indicators__TradingView-Alerts-Expo-.pine', PARSER_SEMANTIC_FIX],
  ['sources/0441__alboogycOdR-dev-projects__institutional_crt_frameworkv9.pine', PARSER_SEMANTIC_FIX],
  ['sources/0442__alboogycOdR-dev-projects__institutional_crt_frameworkv8.1.pine', PARSER_SEMANTIC_FIX],
  ['sources/0453__deepentropy-oakscriptJS__TradingView-Alerts-Expo-.pine', PARSER_SEMANTIC_FIX],
]);

const DROP_ATTRIBUTIONS = new Map<string, Attribution>([
  ['sources/0252__regalouisei-collect-tradingview__short-volume-stamper.pine', PROPAGATED_RUNTIME_ERROR_DROP],
  ['sources/0254__deepentropy-lightweight-charts-indicators__Global-Liquidity-Index.pine', TA_LENGTH_DROP],
  ['sources/0260__deepentropy-oakscriptJS__Global-Liquidity-Index.pine', TA_LENGTH_DROP],
  ['sources/0290__hasnocool-tradingview-pine-scripts__Position-Investing-by-SirSeff.pine', TA_LENGTH_DROP],
  ['sources/0367__himeshramjee-chaiwala-invest__two-thirty-100pip-scalp.pine', PROPAGATED_RUNTIME_ERROR_DROP],
  ['sources/0380__etnt-stocks__15M.pine', TA_LENGTH_DROP],
]);

function readReport(file: string): CorpusReport {
  return JSON.parse(fs.readFileSync(file, 'utf8')) as CorpusReport;
}

function diagnostic(row: CorpusRow): string {
  const stage = row.firstFailedStage;
  return stage ? row.stages[stage]?.diagnostic ?? '' : '';
}

function short(text: string, max = 118): string {
  const flattened = text.replace(/\s+/g, ' ').trim();
  return flattened.length > max ? `${flattened.slice(0, max - 1)}...` : flattened;
}

function table(headers: string[], rows: string[][]): string {
  const escape = (value: string) => value.replace(/\|/g, '\\|').replace(/\n/g, '<br>');
  return [
    `| ${headers.join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${row.map(escape).join(' | ')} |`),
  ].join('\n');
}

function movement(previous: CorpusRow, current: CorpusRow, attribution: Attribution): Movement {
  return {
    row: current.localPath,
    previousStage: previous.firstFailedStage ?? null,
    previousOutcome: previous.outcome,
    previousDiagnostic: diagnostic(previous),
    currentStage: current.firstFailedStage ?? null,
    currentOutcome: current.outcome,
    currentDiagnostic: diagnostic(current),
    attribution,
  };
}

function requireAttribution(map: Map<string, Attribution>, row: CorpusRow): Attribution {
  const attribution = map.get(row.localPath);
  if (!attribution) throw new Error(`Missing attribution for ${row.localPath}`);
  return attribution;
}

function countBy<T>(items: T[], key: (item: T) => string): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const item of items) counts[key(item)] = (counts[key(item)] ?? 0) + 1;
  return counts;
}

const baseline = readReport(BASELINE_REPORT);
const current = readReport(CURRENT_REPORT);
const baselineRows = new Map(baseline.rows.map((row) => [row.localPath, row]));

const gains: Movement[] = [];
const drops: Movement[] = [];

for (const currentRow of current.rows) {
  const baselineRow = baselineRows.get(currentRow.localPath);
  if (!baselineRow) throw new Error(`Current row missing from baseline: ${currentRow.localPath}`);

  const wasOutput = baselineRow.outcome === 'produced-output-compiled';
  const isOutput = currentRow.outcome === 'produced-output-compiled';

  if (!wasOutput && isOutput) gains.push(movement(baselineRow, currentRow, requireAttribution(GAIN_ATTRIBUTIONS, currentRow)));
  if (wasOutput && !isOutput) drops.push(movement(baselineRow, currentRow, requireAttribution(DROP_ATTRIBUTIONS, currentRow)));
}

if (gains.length !== GAIN_ATTRIBUTIONS.size) throw new Error(`Expected ${GAIN_ATTRIBUTIONS.size} gains, found ${gains.length}`);
if (drops.length !== DROP_ATTRIBUTIONS.size) throw new Error(`Expected ${DROP_ATTRIBUTIONS.size} drops, found ${drops.length}`);

const report = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  baseline: {
    sha: BASELINE_SHA,
    report: path.relative(ROOT, BASELINE_REPORT),
    generatedAt: baseline.generatedAt,
    rawOutput: baseline.summary.funnel.output.count,
    rawTotal: baseline.summary.total,
    achievableOutput: baseline.summary.achievableCeiling.funnel.output.count,
    achievableDenominator: baseline.summary.achievableCeiling.denominator,
    achievablePercent: baseline.summary.achievableCeiling.funnel.output.percent,
  },
  current: {
    sha: CURRENT_SHA,
    report: path.relative(ROOT, CURRENT_REPORT),
    generatedAt: current.generatedAt,
    rawOutput: current.summary.funnel.output.count,
    rawTotal: current.summary.total,
    achievableOutput: current.summary.achievableCeiling.funnel.output.count,
    achievableDenominator: current.summary.achievableCeiling.denominator,
    achievablePercent: current.summary.achievableCeiling.funnel.output.percent,
    sameAsPriorCurrentSha: SAME_AS_PRIOR_CURRENT_SHA,
  },
  deltas: {
    rawOutput: current.summary.funnel.output.count - baseline.summary.funnel.output.count,
    achievableOutput:
      current.summary.achievableCeiling.funnel.output.count - baseline.summary.achievableCeiling.funnel.output.count,
    achievableDenominator:
      current.summary.achievableCeiling.denominator - baseline.summary.achievableCeiling.denominator,
    gains: gains.length,
    drops: drops.length,
  },
  attribution: {
    gainsByCommit: countBy(gains, (row) => row.attribution.commit),
    gainsByOwner: countBy(gains, (row) => row.attribution.owner),
    dropsByCommit: countBy(drops, (row) => row.attribution.commit),
    dropsByCause: countBy(drops, (row) => row.attribution.cause),
  },
  gains,
  drops,
};

const gainRows = gains
  .sort((a, b) => a.row.localeCompare(b.row))
  .map((row) => [
    row.row,
    row.previousStage ?? '',
    short(row.previousDiagnostic),
    row.attribution.commit,
    row.attribution.cause,
  ]);

const dropRows = drops
  .sort((a, b) => a.row.localeCompare(b.row))
  .map((row) => [
    row.row,
    row.currentStage ?? '',
    short(row.currentDiagnostic),
    row.attribution.commit,
    row.attribution.cause,
  ]);

const md = `# External Pine Corpus V7 Current Rerun

Generated: ${report.generatedAt}

Baseline report: \`${report.baseline.report}\`
Baseline commit: \`${report.baseline.sha}\`

Current report: \`${report.current.report}\`
Current commit: \`${report.current.sha}\`

The current v7 measurement is **304/400 achievable output**. The previous harvest measurement was **293/401** at \`${BASELINE_SHA.slice(0, 10)}\`, so the attributable movement is **+11 output rows** with the achievable denominator down by one.

This is not a clean +19 from the row-level handoff list. Seventeen rows that previously failed now produce output, and six formerly producing rows now correctly fail loudly. The construct-level implementation framing predicted the movement better than the raw nineteen-row queue: the landed fixes produced seventeen observable gains, two of the nine runtime-row handoffs were already green when the runtime lane remeasured, and TA-length rejection plus propagated Pine runtime limits removed six rows that had been counted as output by older behavior.

TA invalid-length drops are attributed to \`67e6023355\`, merged to parity by \`39757006c2\`; \`39757006c2\` is the commit named in \`packages/tealscript/CLAUDE.md\` for expected corpus output drops. The two table-limit drops are attributed to \`1e52cd8518\`. No v7 row in this before/after diff moved on the array-slice boundary from \`3cbadb64dd\`.

There is no additional movement between the earlier current rerun at \`${SAME_AS_PRIOR_CURRENT_SHA}\` and this rerun at \`${CURRENT_SHA.slice(0, 10)}\`; both measure v7 at **304/400**.

## Figures

${table(
  ['Measurement', 'Commit', 'Raw output', 'Achievable output', 'Achievable denominator', 'Achievable %'],
  [
    [
      'baseline',
      BASELINE_SHA.slice(0, 10),
      `${report.baseline.rawOutput}/${report.baseline.rawTotal}`,
      String(report.baseline.achievableOutput),
      String(report.baseline.achievableDenominator),
      `${report.baseline.achievablePercent}%`,
    ],
    [
      'current',
      CURRENT_SHA.slice(0, 10),
      `${report.current.rawOutput}/${report.current.rawTotal}`,
      String(report.current.achievableOutput),
      String(report.current.achievableDenominator),
      `${report.current.achievablePercent}%`,
    ],
    [
      'delta',
      '',
      `${report.deltas.rawOutput >= 0 ? '+' : ''}${report.deltas.rawOutput}`,
      `${report.deltas.achievableOutput >= 0 ? '+' : ''}${report.deltas.achievableOutput}`,
      `${report.deltas.achievableDenominator >= 0 ? '+' : ''}${report.deltas.achievableDenominator}`,
      '',
    ],
  ],
)}

## Attribution

${table(
  ['Direction', 'Rows', 'Commit', 'Owner', 'Cause'],
  [
    ['gain', '10', PARSER_SEMANTIC_FIX.commit, PARSER_SEMANTIC_FIX.owner, PARSER_SEMANTIC_FIX.cause],
    ['gain', '7', MATRIX_EIGEN_FIX.commit, MATRIX_EIGEN_FIX.owner, MATRIX_EIGEN_FIX.cause],
    ['drop', '4', TA_LENGTH_DROP.commit, TA_LENGTH_DROP.owner, TA_LENGTH_DROP.cause],
    ['drop', '2', PROPAGATED_RUNTIME_ERROR_DROP.commit, PROPAGATED_RUNTIME_ERROR_DROP.owner, PROPAGATED_RUNTIME_ERROR_DROP.cause],
  ],
)}

## Gains

${table(['Row', 'Previous stage', 'Previous diagnostic', 'Commit', 'Cause'], gainRows)}

## Correct Drops

These drops are expected and should not be read as regressions. The TA-length rows relied on old silent coercion. The table rows now surface Pine runtime limits instead of leaving the boundary ambiguous.

${table(['Row', 'Current stage', 'Current diagnostic', 'Commit', 'Cause'], dropRows)}
`;

fs.writeFileSync(OUT_JSON, `${JSON.stringify(report, null, 2)}\n`);
fs.writeFileSync(OUT_MD, md);
console.log(`Wrote ${path.relative(process.cwd(), OUT_JSON)}`);
console.log(`Wrote ${path.relative(process.cwd(), OUT_MD)}`);
