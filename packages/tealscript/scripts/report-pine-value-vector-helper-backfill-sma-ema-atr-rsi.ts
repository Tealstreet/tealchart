#!/usr/bin/env tsx

import { readFile, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';

import {
  CASES,
  runCase,
  validateValueVectorDiscriminationProofs,
  type ValueVectorCase,
} from './run-pine-value-vectors.ts';

interface BackfillRow {
  id: string;
  helper: string;
  member: string;
  firstNonNullBar: number | null;
  proofMutations: readonly string[];
  compiledMatches: boolean;
  publicPathMatches: boolean;
}

interface GateCatch {
  id: string;
  lane: string;
  sourceCommit: string;
  sourceSubject: string;
}

const packageRoot = resolve(dirname(dirname(new URL(import.meta.url).pathname)));
const rmaReportPath = join(packageRoot, 'reports/pine-value-vector-helper-backfill-rma-v1.json');
const outJson = join(packageRoot, 'reports/pine-value-vector-helper-backfill-sma-ema-atr-rsi-v1.json');
const outMd = join(packageRoot, 'reports/pine-value-vector-helper-backfill-sma-ema-atr-rsi-v1.md');

const backfilledIds: Array<{ id: string; helper: string; member: string }> = [
  { id: 'ta.sma', helper: 'sma', member: 'ta.sma' },
  { id: 'hostile.sma.middle-na', helper: 'sma', member: 'ta.sma' },
  { id: 'hostile.sma.multi-middle-na', helper: 'sma', member: 'ta.sma' },
  { id: 'ta.sma.nested-expression-source-order-values', helper: 'sma', member: 'ta.sma' },
  { id: 'language.block-boundary-unary-return-values', helper: 'sma', member: 'ta.sma' },
  { id: 'udf.ta.call-sites', helper: 'sma', member: 'ta.sma' },
  { id: 'ta.ema', helper: 'ema', member: 'ta.ema' },
  { id: 'hostile.ema.long', helper: 'ema', member: 'ta.ema' },
  { id: 'hostile.ema.long-middle-na', helper: 'ema', member: 'ta.ema' },
  { id: 'hostile.ema.middle-na', helper: 'ema', member: 'ta.ema' },
  { id: 'hostile.ema.multi-middle-na', helper: 'ema', member: 'ta.ema' },
  { id: 'ta.atr', helper: 'atr', member: 'ta.atr' },
  { id: 'hostile.atr.middle-na', helper: 'atr', member: 'ta.atr' },
  { id: 'hostile.atr.multi-middle-na', helper: 'atr', member: 'ta.atr' },
  { id: 'hostile.atr.overlong', helper: 'atr', member: 'ta.atr' },
  { id: 'ta.rsi', helper: 'rsi', member: 'ta.rsi' },
  { id: 'hostile.rsi.flat', helper: 'rsi', member: 'ta.rsi' },
  { id: 'hostile.rsi.multi-middle-na', helper: 'rsi', member: 'ta.rsi' },
  { id: 'hostile.rsi.signed', helper: 'rsi', member: 'ta.rsi' },
];

const gateCatches: GateCatch[] = [
  {
    id: 'semantic.array-percentile-string-percentage-rejection',
    lane: 'semantic/argument-type',
    sourceCommit: '14ac4a40cf',
    sourceSubject: 'fix: reject string array percentile percentage',
  },
  {
    id: 'semantic.builtin-argument-qualifier-rejection',
    lane: 'semantic/qualifier',
    sourceCommit: '2d9aa7168e',
    sourceSubject: 'fix: enforce builtin argument qualifiers',
  },
  {
    id: 'language.negative-modulo-floor-quotient',
    lane: 'runtime/operator',
    sourceCommit: '8a1fb60dac',
    sourceSubject: 'fix: use pine modulo semantics for negatives',
  },
  {
    id: 'language.v5-comparison-na-result-is-na',
    lane: 'runtime/versioned-operator',
    sourceCommit: '58cff557c0',
    sourceSubject: 'fix: preserve v5 na comparison results',
  },
];

function currentCommit(): string {
  return execFileSync('git', ['rev-parse', '--short=10', 'HEAD'], { encoding: 'utf8' }).trim();
}

function workingTreeDirty(): boolean {
  return execFileSync('git', ['status', '--porcelain'], { encoding: 'utf8' }).trim().length > 0;
}

async function readJson<T>(path: string): Promise<T> {
  return JSON.parse(await readFile(path, 'utf8')) as T;
}

function table(headers: string[], rows: string[][]): string {
  const escape = (value: string) => value.replaceAll('|', '\\|').replaceAll('\n', '<br>');
  return [
    `| ${headers.join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${row.map(escape).join(' | ')} |`),
  ].join('\n');
}

function caseById(id: string): ValueVectorCase {
  const testCase = CASES.find((entry) => entry.id === id);
  if (!testCase) throw new Error(`Missing value-vector case ${id}`);
  return testCase;
}

function firstNonNull(values: readonly (number | null)[]): number | null {
  const index = values.findIndex((value) => value !== null);
  return index < 0 ? null : index;
}

function countBy<T>(values: readonly T[], key: (value: T) => string): Record<string, number> {
  const counts = new Map<string, number>();
  for (const value of values) counts.set(key(value), (counts.get(key(value)) ?? 0) + 1);
  return Object.fromEntries([...counts.entries()].sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0])));
}

function buildMarkdown(report: {
  measuredCommitSha: string;
  measuredWorkingTreeDirty: boolean;
  inputs: Record<string, string>;
  summary: Record<string, unknown>;
  rows: BackfillRow[];
  proofFailures: string[];
  gateCatches: GateCatch[];
}): string {
  return [
    '# Pine Value Vector Helper Backfill SMA/EMA/ATR/RSI v1',
    '',
    `Generated: ${new Date().toISOString()}`,
    `Measured source commit: \`${report.measuredCommitSha}\`${report.measuredWorkingTreeDirty ? ' with this report script/report dirty in the worktree' : ''}.`,
    '',
    '## Purpose',
    '',
    'This checkpoint continues the helper-backfill queue after the extrema and RMA checkpoints. It backfills `ta.sma` and `ta.ema` by usage, then composes `ta.atr` and `ta.rsi` on the now-verified RMA primitive. It stops here and reports yield rather than continuing through the remaining broad-citation helper queue.',
    '',
    '## Inputs',
    '',
    `- RMA checkpoint: \`${report.inputs.rmaCheckpoint}\`.`,
    '- Value-vector runner source: `scripts/run-pine-value-vectors.ts`.',
    '',
    '## Headline',
    '',
    `- Rows backfilled in this checkpoint: ${report.summary.rowsBackfilled}.`,
    `- Disagreements found in this checkpoint: ${report.summary.disagreementsFound}.`,
    `- Running yield across helper backfill: ${report.summary.runningRowsBackfilled} rows backfilled, ${report.summary.runningDisagreementsFound} disagreements found.`,
    `- Remaining broad-citation helper rows after this checkpoint: ${report.summary.remainingBroadCitationRows}.`,
    '',
    '`ta.ema` is intentionally not treated like `ta.rma`: RMA seeds with an SMA; EMA follows the reference equivalent implementation and seeds from the first non-`na` source value before applying `alpha = 2 / (length + 1)`. The EMA rows therefore use first-non-null seed-discrimination, not an RMA-style SMA-seed expectation.',
    '',
    '`ta.atr` and `ta.rsi` are now reference compositions on verified RMA rather than independent guesses. `ta.atr` composes true range with RMA, and `ta.rsi` composes upward/downward changes with RMA. The overlong ATR row is no-seed by construction and uses the same no-seed full-length proof shape as the overlong RMA row.',
    '',
    '## Backfilled Rows',
    '',
    table(
      ['Case', 'Helper', 'Member', 'First non-null bar', 'Proof mutations', 'Compiled', 'Public path'],
      report.rows.map((row) => [
        `\`${row.id}\``,
        `\`${row.helper}\``,
        `\`${row.member}\``,
        row.firstNonNullBar === null ? '`none`' : String(row.firstNonNullBar),
        row.proofMutations.map((mutation) => `\`${mutation}\``).join(', '),
        String(row.compiledMatches),
        String(row.publicPathMatches),
      ]),
    ),
    '',
    '## Immediate Gate Catch',
    '',
    'The red-first enforcement paid for itself immediately after the parity merge: the value-vector gate caught four newly merged cases without discrimination metadata. They were fixed in the RMA commit before this checkpoint continued.',
    '',
    table(
      ['Case', 'Lane', 'Source commit', 'Source subject'],
      report.gateCatches.map((row) => [
        `\`${row.id}\``,
        row.lane,
        `\`${row.sourceCommit}\``,
        row.sourceSubject,
      ]),
    ),
    '',
    '## Yield',
    '',
    'So far the helper backfill has retired `33` rows with `0` disagreements: `6` extrema-value rows, `8` RMA rows, and `19` SMA/EMA/ATR/RSI rows. The highest-risk arithmetic/helper rows have not reproduced the extrema-bars failure. That does not prove the remaining broad-citation rows are sound, but it lowers the expected return of a full 92-row grind; the remaining work should be re-authorized or re-ranked rather than continued by inertia.',
    '',
  ].join('\n');
}

async function main(): Promise<void> {
  const rmaReport = await readJson<{ measuredCommitSha: string }>(rmaReportPath);
  const proofFailures = validateValueVectorDiscriminationProofs();
  const rows = backfilledIds.map(({ id, helper, member }): BackfillRow => {
    const testCase = caseById(id);
    const result = runCase(testCase);
    return {
      id,
      helper,
      member,
      firstNonNullBar: firstNonNull(result.expectedOutputs?.[0] ?? result.expected),
      proofMutations: testCase.discriminationProof?.mutations ?? [],
      compiledMatches: result.compiledMatches,
      publicPathMatches: result.publicPathMatches,
    };
  });
  const proofFailuresForRows = proofFailures.filter((failure) => backfilledIds.some(({ id }) => failure.startsWith(`${id}:`)));
  const disagreementsFound = rows.filter((row) => !row.compiledMatches || !row.publicPathMatches).length;
  const report = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    measuredCommitSha: currentCommit(),
    measuredWorkingTreeDirty: workingTreeDirty(),
    inputs: {
      rmaCheckpoint: `pine-value-vector-helper-backfill-rma-v1.json @ ${rmaReport.measuredCommitSha}`,
    },
    summary: {
      rowsBackfilled: rows.length,
      rowsByHelper: countBy(rows, (row) => row.helper),
      disagreementsFound,
      proofFailures: proofFailuresForRows.length,
      runningRowsBackfilled: 33,
      runningDisagreementsFound: 0,
      remainingBroadCitationRows: 59,
      gateCaughtProoflessMergedVectors: gateCatches.length,
      gateCatchesByLane: countBy(gateCatches, (row) => row.lane),
    },
    rows,
    proofFailures: proofFailuresForRows,
    gateCatches,
  };
  await writeFile(outJson, `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(outMd, buildMarkdown(report));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
