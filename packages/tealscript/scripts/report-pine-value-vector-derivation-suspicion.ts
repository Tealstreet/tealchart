import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { execSync } from 'node:child_process';

import { CASES, runValueVectors } from './run-pine-value-vectors.ts';
import type { ValueVectorCase, ValueVectorResult } from './run-pine-value-vectors.ts';

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

const KNOWN_COUNTEREXAMPLE_IDS = new Set([
  'visual.plot-hline-fill-metadata-values',
  'visual.constant-identity-values',
  'tradingview-ta.aroon.v7',
]);

const KNOWN_COUNTEREXAMPLE_ID_PATTERNS = [
  /^ta\.highestbars(?:\.|$)/,
  /^ta\.lowestbars(?:\.|$)/,
  /highestbars.*values/,
  /lowestbars.*values/,
];

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

function percent(part: number, total: number): string {
  return total === 0 ? '0.00%' : `${((part / total) * 100).toFixed(2)}%`;
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

function isKnownCounterexample(testCase: ValueVectorCase): boolean {
  return KNOWN_COUNTEREXAMPLE_IDS.has(testCase.id)
    || KNOWN_COUNTEREXAMPLE_ID_PATTERNS.some((pattern) => pattern.test(testCase.id));
}

function allSeries(result: ValueVectorResult): Array<{ index: number; values: Array<number | null> }> {
  return (result.expectedOutputs ?? [result.expected]).map((values, index) => ({ index, values }));
}

function seriesShapeReasons(result: ValueVectorResult): Array<{ reason: SuspicionReason; detail: string }> {
  const reasons: Array<{ reason: SuspicionReason; detail: string }> = [];
  const empty = allSeries(result).filter((series) => series.values.length === 0).map((series) => series.index);
  if (empty.length > 0) {
    reasons.push({ reason: 'empty-output-series', detail: `expected output series ${empty.join(', ')} are empty arrays` });
  }

  const nonempty = allSeries(result).filter((series) => series.values.length > 0);
  const allNull = nonempty.filter((series) => series.values.every((value) => value === null)).map((series) => series.index);
  if (allNull.length > 0) {
    reasons.push({ reason: 'all-null-series', detail: `expected output series ${allNull.join(', ')} are all null` });
  }

  const allZero = nonempty.filter((series) => series.values.every((value) => value === 0)).map((series) => series.index);
  if (allZero.length > 0) {
    reasons.push({ reason: 'all-zero-series', detail: `expected output series ${allZero.join(', ')} are all zero` });
  }

  return reasons;
}

function sourceShapeReasons(testCase: ValueVectorCase): Array<{ reason: SuspicionReason; detail: string }> {
  const source = functionSourcesForCase(testCase);
  const helperMatches = COMPLEX_HELPERS.filter((helper) => new RegExp(`\\b${helper}\\s*\\(`).test(source));
  const reasons: Array<{ reason: SuspicionReason; detail: string }> = [];
  if (helperMatches.length > 0) {
    reasons.push({
      reason: 'complex-local-helper',
      detail: `expectation calls local helper(s): ${helperMatches.join(', ')}`,
    });
  }

  const longFloatMatches = source.match(/\b-?\d+\.\d{10,}\b/g) ?? [];
  if (longFloatMatches.length > 0) {
    const samples = [...new Set(longFloatMatches)].slice(0, 4).join(', ');
    reasons.push({
      reason: 'long-float-literal',
      detail: `expectation contains long float literal(s): ${samples}`,
    });
  }

  return reasons;
}

function suspiciousRow(testCase: ValueVectorCase, result: ValueVectorResult): SuspicionRow | null {
  const reasonDetails = [
    ...(isKnownCounterexample(testCase)
      ? [{ reason: 'known-wrong-oracle-counterexample' as const, detail: 'known family where citation/source-presence audit did not prove the expected values were correctly derived' }]
      : []),
    ...seriesShapeReasons(result),
    ...sourceShapeReasons(testCase),
  ];
  if (reasonDetails.length === 0) return null;

  return {
    id: testCase.id,
    namespace: testCase.namespace,
    sourceFamily: sourceFamilyFor(testCase.id),
    officialMembers: result.officialMembers,
    reasons: [...new Set(reasonDetails.map((entry) => entry.reason))],
    detail: reasonDetails.map((entry) => entry.detail).join('; '),
    rule: testCase.rule,
  };
}

function countBy<T extends string>(rows: readonly SuspicionRow[], key: (row: SuspicionRow) => T): Record<T, number> {
  const counts: Record<string, number> = {};
  for (const row of rows) counts[key(row)] = (counts[key(row)] ?? 0) + 1;
  return Object.fromEntries(Object.entries(counts).sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))) as Record<T, number>;
}

function rowsByReason(rows: readonly SuspicionRow[]): Record<SuspicionReason, number> {
  const counts: Partial<Record<SuspicionReason, number>> = {};
  for (const row of rows) {
    for (const reason of row.reasons) counts[reason] = (counts[reason] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))) as Record<SuspicionReason, number>;
}

function examplesForFamily(rows: readonly SuspicionRow[], family: string): string[] {
  return rows
    .filter((row) => row.sourceFamily === family)
    .slice(0, 8)
    .map((row) => row.id);
}

function buildMarkdown(json: {
  measuredCommitSha: string;
  measuredWorkingTreeDirty: boolean;
  summary: {
    cases: number;
    suspiciousCases: number;
    notFlaggedByShapeAudit: number;
  };
  bySourceFamily: Record<string, number>;
  byReason: Record<string, number>;
  rows: SuspicionRow[];
}): string {
  const lines: string[] = [
    '# Pine Value Vector Derivation Suspicion Audit v1',
    '',
    'Generated: 2026-09-12T05:45:45.000Z',
    `Measured source commit: \`${json.measuredCommitSha}\`${json.measuredWorkingTreeDirty ? ' with this audit script/report dirty in the worktree' : ''}.`,
    '',
    '## Purpose',
    '',
    'This report audits the gap between two different claims:',
    '',
    '- The existing oracle-provenance report proves `0` value expectations call the TealScript execution path.',
    '- It does not prove every expected value was actually derived from the cited documentation or formula.',
    '',
    'Two corrected counterexamples prove that distinction matters: the extrema-bars/Aroon vectors carried a wrong positive-offset oracle hidden by a compensating Aroon wrapper bug, and two visual hline vectors expected old zero-length hline outputs until the hline payload fix made them fail.',
    '',
    'This audit does not re-derive every vector. It hunts shapes that can encode observed engine behavior while still carrying a citation: empty output arrays, all-null/all-zero expected series, complex local-helper expectations, long copied-looking float literals, and the two known counterexample families.',
    '',
    '## Classifier Verdict',
    '',
    '`reports/pine-value-vector-oracle-provenance-v7.md` classifies a value expectation as engine-derived only when its expectation source calls TealScript execution functions such as `executeScript`, `executeCompiled`, `tryCompile`, `runCase`, or prior vector output. That rule would not have caught either hline stale-`[]` expectations or the wrong-sign extrema-bars/Aroon expectation: both were local constants/helpers with live citations. The citation/source-provenance gate likewise verifies that a source is named, not that the expected values were derived correctly from it.',
    '',
    '## Headline',
    '',
    `- Cases scanned: ${json.summary.cases}.`,
    `- Cases flagged for derivation audit by shape: ${json.summary.suspiciousCases}/${json.summary.cases} (${percent(json.summary.suspiciousCases, json.summary.cases)}).`,
    `- Cases not flagged by this shape audit: ${json.summary.notFlaggedByShapeAudit}/${json.summary.cases} (${percent(json.summary.notFlaggedByShapeAudit, json.summary.cases)}).`,
    '',
    'A flagged case is not a wrong oracle. It is a case this automated audit cannot confirm as independently derived without reading or re-deriving the expectation. The finding is the size and clustering of that unverified fraction.',
    '',
    '## By Reason',
    '',
    '| Reason | Cases |',
    '| --- | ---: |',
    ...Object.entries(json.byReason).map(([reason, count]) => `| \`${reason}\` | ${count} |`),
    '',
    '## By Source Family',
    '',
    '| Rank | Family | Cases | Examples |',
    '| ---: | --- | ---: | --- |',
    ...Object.entries(json.bySourceFamily).slice(0, 30).map(([family, count], index) =>
      `| ${index + 1} | \`${family}\` | ${count} | ${examplesForFamily(json.rows, family).map((id) => `\`${id}\``).join(', ')} |`,
    ),
    '',
    '## Known Counterexamples',
    '',
    '| Case | Reason |',
    '| --- | --- |',
    ...json.rows
      .filter((row) => row.reasons.includes('known-wrong-oracle-counterexample'))
      .map((row) => `| \`${row.id}\` | ${row.detail.replaceAll('|', '\\|')} |`),
    '',
    '## Top Flagged Rows',
    '',
    '| Case | Family | Reasons | Detail |',
    '| --- | --- | --- | --- |',
    ...json.rows.slice(0, 80).map((row) =>
      `| \`${row.id}\` | \`${row.sourceFamily}\` | ${row.reasons.map((reason) => `\`${reason}\``).join(', ')} | ${row.detail.replaceAll('|', '\\|')} |`,
    ),
    '',
    '## Interpretation',
    '',
    'The existing provenance claims are true under their narrow definitions, but the state doc should not read them as a stronger guarantee that every expected value is independently sound. The suite has no frozen TealScript execution snapshots, and every case has a citation/local-extension marker; nevertheless this audit flags a large derivation-review queue. The priority is not to re-derive all flagged rows immediately. The priority is to stop using citation presence as proof of derivation and to route the largest flagged families first when confidence matters.',
    '',
  ];
  return lines.join('\n');
}

async function main(): Promise<void> {
  const outputBase = process.argv[2] ?? 'packages/tealscript/reports/pine-value-vector-derivation-suspicion-v1';
  const measuredCommitSha = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
  const measuredWorkingTreeDirty = execSync('git status --short', { encoding: 'utf8' }).trim().length > 0;
  const resultsById = new Map(runValueVectors().map((result) => [result.id, result]));
  const rows = CASES
    .map((testCase) => {
      const result = resultsById.get(testCase.id);
      if (!result) throw new Error(`Missing value-vector result for ${testCase.id}`);
      return suspiciousRow(testCase, result);
    })
    .filter((row): row is SuspicionRow => row !== null)
    .sort((left, right) =>
      right.reasons.length - left.reasons.length
      || left.sourceFamily.localeCompare(right.sourceFamily)
      || left.id.localeCompare(right.id),
    );

  const json = {
    schemaVersion: 1,
    generatedAt: '2026-09-12T05:45:45.000Z',
    measuredCommitSha,
    measuredWorkingTreeDirty,
    basis: {
      source: 'packages/tealscript/scripts/run-pine-value-vectors.ts',
      rule: 'Flags shapes that can encode observed engine behavior while still carrying citations. This is a derivation-suspicion audit, not proof that flagged expectations are wrong.',
      existingProvenanceLimit: 'pine-value-vector-oracle-provenance-v7 only detects expectations that invoke the TealScript execution path; source-provenance checks citation presence/completeness, not value derivation correctness.',
    },
    summary: {
      cases: CASES.length,
      suspiciousCases: rows.length,
      suspiciousCasesPercent: percent(rows.length, CASES.length),
      notFlaggedByShapeAudit: CASES.length - rows.length,
      notFlaggedByShapeAuditPercent: percent(CASES.length - rows.length, CASES.length),
    },
    byReason: rowsByReason(rows),
    bySourceFamily: countBy(rows, (row) => row.sourceFamily),
    rows,
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
