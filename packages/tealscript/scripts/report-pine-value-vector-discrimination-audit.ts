import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname } from 'node:path';
import { execSync } from 'node:child_process';

import { CASES, runValueVectors } from './run-pine-value-vectors.ts';
import type { ValueVectorCase, ValueVectorResult } from './run-pine-value-vectors.ts';

type VectorValue = number | null;

type SuspicionReason =
  | 'known-wrong-oracle-counterexample'
  | 'empty-output-series'
  | 'all-null-series'
  | 'all-zero-series'
  | 'complex-local-helper'
  | 'long-float-literal';

interface SuspicionRow {
  id: string;
  namespace: string;
  sourceFamily: string;
  officialMembers: string[];
  reasons: SuspicionReason[];
  detail: string;
  rule: string | undefined;
}

interface SeriesAudit {
  index: number;
  length: number;
  bars: number;
  isFullBarLength: boolean;
  isLengthDiscriminating: boolean;
}

const COMPLEX_HELPERS = [
  'accdist',
  'alma',
  'anchoredVwapBands',
  'aroon',
  'atr',
  'bollingerBands',
  'bollingerWidth',
  'cci',
  'chandelier',
  'cmo',
  'cog',
  'dema',
  'dmi',
  'donchian',
  'ema',
  'emaValues',
  'highest',
  'highestBars',
  'hma',
  'iii',
  'keltner',
  'keltnerWidth',
  'kst',
  'linreg',
  'lowest',
  'lowestBars',
  'macd',
  'median',
  'mfi',
  'mfiFromSource',
  'nvi',
  'obv',
  'obvWithSourceVolume',
  'percentagePriceOscillator',
  'pvi',
  'pvt',
  'rma',
  'rocValues',
  'rsi',
  'sma',
  'smaValues',
  'stdev',
  'stdevUnbiased',
  'stochastic',
  'supertrend',
  'swma',
  'tema',
  'tripleExponentialAverageOscillator',
  'tsi',
  'variance',
  'varianceUnbiased',
  'wad',
  'williamsR',
  'wma',
  'wmaValues',
  'wvad',
] as const;

const RUNTIME_PARALLEL_HELPERS = new Set<string>([
  'accdist',
  'alma',
  'aroon',
  'anchoredVwapBands',
  'atr',
  'bollingerBands',
  'bollingerWidth',
  'cci',
  'chandelier',
  'cmo',
  'cog',
  'dema',
  'dmi',
  'donchian',
  'ema',
  'highest',
  'highestBars',
  'hma',
  'iii',
  'keltner',
  'keltnerWidth',
  'kst',
  'linreg',
  'lowest',
  'lowestBars',
  'macd',
  'median',
  'mfi',
  'mfiFromSource',
  'nvi',
  'obv',
  'obvWithSourceVolume',
  'percentagePriceOscillator',
  'pvi',
  'pvt',
  'rma',
  'rocValues',
  'rsi',
  'sma',
  'smaValues',
  'stdev',
  'stochastic',
  'supertrend',
  'swma',
  'tema',
  'tripleExponentialAverageOscillator',
  'tsi',
  'variance',
  'varianceUnbiased',
  'wad',
  'williamsR',
  'wma',
  'wmaValues',
  'wvad',
  'emaValues',
  'highestBars',
  'lowestBars',
  'stdevUnbiased',
]);

const ENGINE_EXECUTION_TOKENS = [
  'executeScript',
  'executeCompiled',
  'tryCompile',
  'runCase',
  'runValueVectors',
  'compiledOutputs',
  'publicPathOutputs',
];

function percent(part: number, total: number): string {
  return total === 0 ? '0.00%' : `${((part / total) * 100).toFixed(2)}%`;
}

function countBy<T extends string>(rows: readonly T[]): Record<T, number> {
  const counts: Record<string, number> = {};
  for (const row of rows) counts[row] = (counts[row] ?? 0) + 1;
  return Object.fromEntries(Object.entries(counts).sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))) as Record<T, number>;
}

function sourceFamilyFor(id: string): string {
  if (id.startsWith('priority.')) return 'priority';
  if (id.startsWith('depth.')) return 'depth';
  if (id.startsWith('property.')) return 'property';
  if (id.startsWith('hostile.')) return 'hostile';
  if (id.startsWith('tradingview-ta.')) return 'tradingview-ta';
  if (id.startsWith('optional.')) return 'optional';
  if (id.startsWith('invariant.')) return 'invariant';
  return id.includes('.') ? id.slice(0, id.indexOf('.')) : id;
}

function functionSourcesForCase(testCase: ValueVectorCase): string {
  return [
    testCase.expected,
    testCase.expectedOutputs,
    testCase.expectedPlots,
    testCase.expectedDrawings,
    testCase.expectedAlerts,
    testCase.expectedLogs,
  ]
    .filter(Boolean)
    .map((fn) => String(fn))
    .join('\n');
}

function allExpectedSeries(result: ValueVectorResult): Array<{ index: number; values: VectorValue[] }> {
  return (result.expectedOutputs ?? [result.expected]).map((values, index) => ({ index, values }));
}

function matchingSeries(result: ValueVectorResult, predicate: (values: VectorValue[]) => boolean): SeriesAudit[] {
  return allExpectedSeries(result)
    .filter((series) => predicate(series.values))
    .map((series) => ({
      index: series.index,
      length: series.values.length,
      bars: result.bars,
      isFullBarLength: series.values.length === result.bars,
      isLengthDiscriminating: series.values.length > 0,
    }));
}

function helperMatches(testCase: ValueVectorCase): string[] {
  const source = functionSourcesForCase(testCase);
  return COMPLEX_HELPERS.filter((helper) => new RegExp(`\\b${helper}\\s*\\(`).test(source));
}

function callsEngineExecution(testCase: ValueVectorCase): boolean {
  const source = functionSourcesForCase(testCase);
  return ENGINE_EXECUTION_TOKENS.some((token) => new RegExp(`\\b${token}\\b`).test(source));
}

function documentedExpectationBucket(row: SuspicionRow): 'documented-or-cited' | 'unconfirmed-observed-shape' {
  const text = `${row.rule ?? ''} ${row.detail}`.toLowerCase();
  if (text.includes('manual') || text.includes('reference') || text.includes('document') || text.includes('tradingview')) {
    return 'documented-or-cited';
  }
  return 'unconfirmed-observed-shape';
}

function rowLink(id: string): string {
  return `\`${id}\``;
}

function topExamples(rows: readonly string[], count = 8): string {
  return rows.slice(0, count).map(rowLink).join(', ');
}

function buildMarkdown(json: {
  measuredCommitSha: string;
  measuredWorkingTreeDirty: boolean;
  basis: Record<string, unknown>;
  summary: Record<string, unknown>;
  allNull: Record<string, unknown>;
  allZero: Record<string, unknown>;
  clusters: Record<string, unknown>;
  helperRanking: Array<Record<string, unknown>>;
  rows: Array<Record<string, unknown>>;
  structuralFixCost: Record<string, unknown>;
}): string {
  const helperRows = json.helperRanking.slice(0, 30).map((entry, index) =>
    `| ${index + 1} | \`${entry.helper}\` | ${entry.cases} | ${entry.runtimeParallelModel ? 'yes' : 'no'} | ${entry.actualSharedRuntimeCode ? 'yes' : 'no'} | ${(entry.examples as string[]).map(rowLink).join(', ')} |`);
  const rowLines = json.rows.slice(0, 80).map((row) =>
    `| \`${row.id}\` | \`${row.sourceFamily}\` | ${(row.reasons as string[]).map((reason) => `\`${reason}\``).join(', ')} | ${row.narrowVerdict} | ${(row.helpers as string[]).map((helper) => `\`${helper}\``).join(', ') || '-'} |`);

  return [
    '# Pine Value Vector Discrimination Audit v1',
    '',
    'Generated: 2026-09-12T06:40:00.000Z',
    `Measured source commit: \`${json.measuredCommitSha}\`${json.measuredWorkingTreeDirty ? ' with this audit script/report dirty in the worktree' : ''}.`,
    '',
    '## Purpose',
    '',
    '`pine-value-vector-derivation-suspicion-v1` flagged 433 cases by shape. This follow-up narrows that suspicion list without re-deriving all 433 expected values. It asks the cheap discriminating questions: do all-null/all-zero expectations assert series length, do local helpers overlap the runtime model, and what would a red-first requirement cost?',
    '',
    '## Headline',
    '',
    `- Flagged rows reviewed: ${json.summary.flaggedRows}.`,
    `- Vacuous rows by comparator shape: ${json.summary.vacuousRows}.`,
    `- Self-judging/model-overlap rows: ${json.summary.selfJudgingRows}.`,
    `- Actual shared runtime-code rows: ${json.summary.actualSharedRuntimeCodeRows}.`,
    `- Confirmed sound by this narrow discrimination audit: ${json.summary.confirmedSoundByNarrowing}.`,
    '',
    'A confirmed-sound row here is only confirmed against the failure shapes in this report. It is not a claim that the expected value was independently re-derived from the cited source.',
    '',
    '## All-Null Series',
    '',
    `- Rows with all-null expected series: ${json.allNull.rows}.`,
    `- Rows whose all-null series assert the full bar-count length: ${json.allNull.fullBarLengthRows}.`,
    `- Rows whose all-null series are length-discriminating against empty output: ${json.allNull.lengthDiscriminatingRows}.`,
    `- Length-discriminating but not full-bar-length rows: ${json.allNull.lengthDiscriminatingNonFullBarLengthRows}.`,
    `- Vacuous all-null rows: ${json.allNull.vacuousRows}.`,
    `- Vacuous split: documented/cited ${json.allNull.vacuousDocumentedOrCited}, unconfirmed observed-shape ${json.allNull.vacuousUnconfirmedObservedShape}.`,
    '',
    'Because the matcher requires actual and expected series lengths to be identical, a full-length all-null vector is not the hline stale-`[]` failure shape. An engine that emits nothing does not match 240 nulls, 12 nulls, or any other non-empty expected series.',
    '',
    '## All-Zero Series',
    '',
    `- Rows with all-zero expected series: ${json.allZero.rows}.`,
    `- Rows whose all-zero series assert the full bar-count length: ${json.allZero.fullBarLengthRows}.`,
    `- Rows whose all-zero series are length-discriminating against empty output: ${json.allZero.lengthDiscriminatingRows}.`,
    `- Vacuous all-zero rows: ${json.allZero.vacuousRows}.`,
    `- Vacuous split: documented/cited ${json.allZero.vacuousDocumentedOrCited}, unconfirmed observed-shape ${json.allZero.vacuousUnconfirmedObservedShape}.`,
    '',
    'Zero remains a useful suspicion marker because it can encode an unset accumulator, but the current all-zero cases are not comparator-vacuous: they carry non-empty expected series, and every row in this set asserts full bar-count length.',
    '',
    '## Dominant Clusters',
    '',
    '| Cluster | Flagged | Vacuous | Self-judging/model overlap | Confirmed by narrowing |',
    '| --- | ---: | ---: | ---: | ---: |',
    ...Object.entries(json.clusters).map(([cluster, value]) => {
      const stats = value as Record<string, unknown>;
      return `| \`${cluster}\` | ${stats.flaggedRows} | ${stats.vacuousRows} | ${stats.selfJudgingRows} | ${stats.confirmedSoundByNarrowing} |`;
    }),
    '',
    '## Local Helper Ranking',
    '',
    'Actual shared runtime code means the expectation source calls the TealScript execution path or imports runtime outputs. Parallel helper model means the case expectation calls a local helper whose formula family is also implemented by runtime or official-library code. The second is the dangerous extrema-bars/Aroon shape even when no function is literally shared.',
    '',
    '| Rank | Helper | Cases | Runtime-parallel model | Actual shared runtime code | Examples |',
    '| ---: | --- | ---: | --- | --- | --- |',
    ...helperRows,
    '',
    '## Narrowed Rows',
    '',
    '| Case | Family | Original reasons | Narrow verdict | Helpers |',
    '| --- | --- | --- | --- | --- |',
    ...rowLines,
    '',
    '## Structural Fix Cost',
    '',
    '- Cheap comparator red-first: add a generic discriminator pass that mutates expected outputs, drops one output series, truncates a series, flips the first finite/null/zero value, and requires the case to fail. Cost: about half a day to one day because the matcher already exposes expected outputs and mismatch details. This would permanently guard the hline stale-`[]` class.',
    '- Metadata guard: require cases with all-null/all-zero/empty expected series to declare why the shape is intentional and whether full bar-count length is asserted. Cost: about one day to wire and annotate the small exceptional set.',
    '- Semantic red-first for helper-derived formulas: require an independent mutation or second derivation for local-helper cases, especially TA and hostile-TA. Cost: several days for the top helpers and substantially more for all 129 helper rows, because each formula needs a meaningful wrong-model mutation rather than a mechanical comparator mutation.',
    '- Recommended first step: land the generic comparator mutation guard and metadata guard before re-deriving helpers. It is cheap, catches the known stale-empty-output family, and turns future vectors red if they only prove shape compatibility rather than value behavior.',
    '',
  ].join('\n');
}

async function main(): Promise<void> {
  const rootRelativeSuspicionPath = 'packages/tealscript/reports/pine-value-vector-derivation-suspicion-v1.json';
  const packageRelativeSuspicionPath = 'reports/pine-value-vector-derivation-suspicion-v1.json';
  const defaultSuspicionPath = existsSync(rootRelativeSuspicionPath)
    ? rootRelativeSuspicionPath
    : packageRelativeSuspicionPath;
  const defaultOutputBase = defaultSuspicionPath.startsWith('packages/tealscript/')
    ? 'packages/tealscript/reports/pine-value-vector-discrimination-audit-v1'
    : 'reports/pine-value-vector-discrimination-audit-v1';
  const outputBase = process.argv[2] ?? defaultOutputBase;
  const suspicionPath = process.argv[3] ?? defaultSuspicionPath;
  const suspicion = JSON.parse(await readFile(suspicionPath, 'utf8')) as { rows: SuspicionRow[] };
  const measuredCommitSha = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
  const measuredWorkingTreeDirty = execSync('git status --short', { encoding: 'utf8' }).trim().length > 0;
  const casesById = new Map(CASES.map((testCase) => [testCase.id, testCase]));
  const resultsById = new Map(runValueVectors().map((result) => [result.id, result]));

  const rows = suspicion.rows.map((row) => {
    const testCase = casesById.get(row.id);
    const result = resultsById.get(row.id);
    if (!testCase || !result) throw new Error(`Missing vector case/result for ${row.id}`);
    const allNullSeries = matchingSeries(result, (values) => values.length > 0 && values.every((value) => value === null));
    const allZeroSeries = matchingSeries(result, (values) => values.length > 0 && values.every((value) => value === 0));
    const emptySeries = matchingSeries(result, (values) => values.length === 0);
    const helpers = helperMatches(testCase);
    const runtimeParallelHelpers = helpers.filter((helper) => RUNTIME_PARALLEL_HELPERS.has(helper));
    const actualSharedRuntimeCode = callsEngineExecution(testCase);
    const vacuous = emptySeries.length > 0
      || allNullSeries.some((series) => !series.isLengthDiscriminating)
      || allZeroSeries.some((series) => !series.isLengthDiscriminating);
    const selfJudging = actualSharedRuntimeCode || runtimeParallelHelpers.length > 0;
    const confirmedSoundByNarrowing = !vacuous
      && !selfJudging
      && !row.reasons.includes('known-wrong-oracle-counterexample')
      && !row.reasons.includes('long-float-literal');
    const narrowVerdict = vacuous
      ? 'vacuous comparator shape'
      : selfJudging
        ? 'self-judging/model-overlap risk'
        : confirmedSoundByNarrowing
          ? 'confirmed sound by length/comparator narrowing'
          : 'still requires derivation review';
    return {
      ...row,
      allNullSeries,
      allZeroSeries,
      emptySeries,
      helpers,
      runtimeParallelHelpers,
      actualSharedRuntimeCode,
      vacuous,
      vacuousEvidence: documentedExpectationBucket(row),
      selfJudging,
      confirmedSoundByNarrowing,
      narrowVerdict,
    };
  });

  const allNullRows = rows.filter((row) => row.allNullSeries.length > 0);
  const allZeroRows = rows.filter((row) => row.allZeroSeries.length > 0);
  const vacuousAllNullRows = allNullRows.filter((row) => row.allNullSeries.some((series) => !series.isLengthDiscriminating));
  const vacuousAllZeroRows = allZeroRows.filter((row) => row.allZeroSeries.some((series) => !series.isLengthDiscriminating));
  const helperRows = rows.filter((row) => row.helpers.length > 0);
  const helpers = [...new Set(helperRows.flatMap((row) => row.helpers))];
  const helperRanking = helpers.map((helper) => {
    const matching = helperRows.filter((row) => row.helpers.includes(helper));
    return {
      helper,
      cases: matching.length,
      runtimeParallelModel: RUNTIME_PARALLEL_HELPERS.has(helper),
      actualSharedRuntimeCode: matching.some((row) => row.actualSharedRuntimeCode),
      examples: matching.slice(0, 8).map((row) => row.id),
      families: countBy(matching.map((row) => row.sourceFamily)),
    };
  }).sort((left, right) => right.cases - left.cases || left.helper.localeCompare(right.helper));

  function clusterStats(family: string): Record<string, unknown> {
    const familyRows = rows.filter((row) => row.sourceFamily === family);
    return {
      flaggedRows: familyRows.length,
      vacuousRows: familyRows.filter((row) => row.vacuous).length,
      selfJudgingRows: familyRows.filter((row) => row.selfJudging).length,
      confirmedSoundByNarrowing: familyRows.filter((row) => row.confirmedSoundByNarrowing).length,
      allNullRows: familyRows.filter((row) => row.allNullSeries.length > 0).length,
      allZeroRows: familyRows.filter((row) => row.allZeroSeries.length > 0).length,
      examples: familyRows.slice(0, 12).map((row) => row.id),
    };
  }

  const json = {
    schemaVersion: 1,
    generatedAt: '2026-09-12T06:40:00.000Z',
    measuredCommitSha,
    measuredWorkingTreeDirty,
    basis: {
      source: 'packages/tealscript/scripts/run-pine-value-vectors.ts',
      suspicionInput: suspicionPath,
      matcherGuarantee: 'matchesOutputs requires actual plot count equality and per-series length equality; a non-empty expected all-null/all-zero series is not satisfied by an empty emitted series.',
      scope: 'Narrows shape suspicion. It does not re-derive all expected values from cited documents.',
    },
    summary: {
      flaggedRows: rows.length,
      vacuousRows: rows.filter((row) => row.vacuous).length,
      localHelperRows: rows.filter((row) => row.helpers.length > 0).length,
      selfJudgingRows: rows.filter((row) => row.selfJudging).length,
      actualSharedRuntimeCodeRows: rows.filter((row) => row.actualSharedRuntimeCode).length,
      runtimeParallelModelRows: rows.filter((row) => row.runtimeParallelHelpers.length > 0).length,
      confirmedSoundByNarrowing: rows.filter((row) => row.confirmedSoundByNarrowing).length,
      stillRequiresDerivationReview: rows.filter((row) => !row.vacuous && !row.selfJudging && !row.confirmedSoundByNarrowing).length,
    },
    allNull: {
      rows: allNullRows.length,
      fullBarLengthRows: allNullRows.filter((row) => row.allNullSeries.every((series) => series.isFullBarLength)).length,
      lengthDiscriminatingRows: allNullRows.filter((row) => row.allNullSeries.every((series) => series.isLengthDiscriminating)).length,
      lengthDiscriminatingNonFullBarLengthRows: allNullRows.filter((row) =>
        row.allNullSeries.every((series) => series.isLengthDiscriminating)
        && row.allNullSeries.some((series) => !series.isFullBarLength)).length,
      vacuousRows: vacuousAllNullRows.length,
      vacuousDocumentedOrCited: vacuousAllNullRows.filter((row) => row.vacuousEvidence === 'documented-or-cited').length,
      vacuousUnconfirmedObservedShape: vacuousAllNullRows.filter((row) => row.vacuousEvidence === 'unconfirmed-observed-shape').length,
    },
    allZero: {
      rows: allZeroRows.length,
      fullBarLengthRows: allZeroRows.filter((row) => row.allZeroSeries.every((series) => series.isFullBarLength)).length,
      lengthDiscriminatingRows: allZeroRows.filter((row) => row.allZeroSeries.every((series) => series.isLengthDiscriminating)).length,
      vacuousRows: vacuousAllZeroRows.length,
      vacuousDocumentedOrCited: vacuousAllZeroRows.filter((row) => row.vacuousEvidence === 'documented-or-cited').length,
      vacuousUnconfirmedObservedShape: vacuousAllZeroRows.filter((row) => row.vacuousEvidence === 'unconfirmed-observed-shape').length,
    },
    clusters: {
      ta: clusterStats('ta'),
      hostile: clusterStats('hostile'),
    },
    helperRanking,
    rows,
    structuralFixCost: {
      comparatorMutationGuard: '0.5-1 day',
      metadataGuardForEmptyAllNullAllZero: 'about 1 day',
      helperSemanticRedFirst: 'several days for top helpers; materially more for all 129 helper rows',
      recommendation: 'Start with generic comparator mutation and shape metadata. Do not require full formula re-derivation as the first gate.',
    },
  };

  await mkdir(dirname(outputBase), { recursive: true });
  await writeFile(`${outputBase}.json`, `${JSON.stringify(json)}\n`, 'utf8');
  await writeFile(`${outputBase}.md`, buildMarkdown(json), 'utf8');
  process.stdout.write(`${JSON.stringify(json.summary, null, 2)}\n`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error: unknown) => {
    process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
