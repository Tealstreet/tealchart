#!/usr/bin/env tsx

import { readFile, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';

interface PriorityRow {
  rank: number;
  id: string;
  helper: string;
  member: string;
  runtimeChangedFamily: boolean;
  corpusScriptCount: number;
  corpusCallSiteCount: number;
  priorityScore: number;
}

interface PriorityReport {
  measuredCommitSha: string;
  rankedRows: PriorityRow[];
}

const packageRoot = resolve(dirname(dirname(new URL(import.meta.url).pathname)));
const priorityPath = join(packageRoot, 'reports/pine-value-vector-helper-backfill-priority-v1.json');
const outJson = join(packageRoot, 'reports/pine-value-vector-helper-backfill-closure-v1.json');
const outMd = join(packageRoot, 'reports/pine-value-vector-helper-backfill-closure-v1.md');

const completedIds = new Set([
  'ta.highest',
  'ta.lowest',
  'hostile.highest.middle-na',
  'hostile.lowest.middle-na',
  'hostile.highest.multi-middle-na',
  'language.qualifier-helper-chain',
  'ta.rma',
  'ta.smma',
  'hostile.rma.long',
  'hostile.rma.long-middle-na',
  'hostile.rma.middle-na',
  'hostile.rma.multi-middle-na',
  'hostile.rma.synthetic.multi-middle-na',
  'hostile.rma.overlong',
  'ta.sma',
  'hostile.sma.middle-na',
  'hostile.sma.multi-middle-na',
  'ta.sma.nested-expression-source-order-values',
  'language.block-boundary-unary-return-values',
  'udf.ta.call-sites',
  'ta.ema',
  'hostile.ema.long',
  'hostile.ema.long-middle-na',
  'hostile.ema.middle-na',
  'hostile.ema.multi-middle-na',
  'ta.atr',
  'hostile.atr.middle-na',
  'hostile.atr.multi-middle-na',
  'hostile.atr.overlong',
  'ta.rsi',
  'hostile.rsi.flat',
  'hostile.rsi.multi-middle-na',
  'hostile.rsi.signed',
]);

const redFirstCaughtRows = [
  {
    id: 'semantic.array-percentile-string-percentage-rejection',
    sourceCommit: '14ac4a40cf',
    lane: 'semantic argument-type',
  },
  {
    id: 'semantic.builtin-argument-qualifier-rejection',
    sourceCommit: '2d9aa7168e',
    lane: 'semantic qualifier',
  },
  {
    id: 'language.negative-modulo-floor-quotient',
    sourceCommit: '8a1fb60dac',
    lane: 'runtime operator',
  },
  {
    id: 'language.v5-comparison-na-result-is-na',
    sourceCommit: '58cff557c0',
    lane: 'runtime versioned-operator',
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
  remainingRows: PriorityRow[];
  completedRows: PriorityRow[];
}): string {
  return [
    '# Pine Value Vector Helper Backfill Closure v1',
    '',
    `Generated: ${new Date().toISOString()}`,
    `Measured source commit: \`${report.measuredCommitSha}\`${report.measuredWorkingTreeDirty ? ' with this report script/report dirty in the worktree' : ''}.`,
    '',
    '## Status',
    '',
    'Measured-and-deprioritized. This is not done and not abandoned. The remaining rows are preserved as a ranked known queue, but the highest-risk slice has been checked and did not produce another wrong oracle.',
    '',
    '## Inputs',
    '',
    `- Priority queue: \`${report.inputs.priorityQueue}\`.`,
    '- Checkpoints: `pine-value-vector-helper-backfill-extrema-rma-v1`, `pine-value-vector-helper-backfill-rma-v1`, and `pine-value-vector-helper-backfill-sma-ema-atr-rsi-v1`.',
    '',
    '## Yield',
    '',
    `- Broad-citation helper rows originally queued: ${report.summary.originalQueueRows}.`,
    `- Highest-risk rows backfilled: ${report.summary.completedRows}.`,
    `- Disagreements found: ${report.summary.disagreementsFound}.`,
    `- Remaining ranked rows: ${report.summary.remainingRows}.`,
    '',
    'The checked rows were the highest-risk rows by the queue method: runtime-changed families and top corpus-use rows (`ta.highest`, `ta.lowest`, `ta.rma`, `ta.sma`, `ta.ema`, `ta.atr`, and `ta.rsi`). The suite is sound in those families. The remaining `59` rows still carry broad citations and are not verified by this backfill.',
    '',
    'EMA is kept distinct from RMA in the checked set: EMA seeds from the first non-`na` source value, while RMA seeds from the SMA of the first full window. The EMA backfill specifically checked that seed shape instead of pattern-matching it onto RMA.',
    '',
    '## Methodological Conclusion',
    '',
    'The backfill did not find the wrong oracle. The extrema-bars wrong oracle was found because an external engine disagreed and forced the source read. Since then, `33` systematic re-derivations have found `0` disagreements. Productive wrong-oracle detection methods from this thread, ranked by observed yield:',
    '',
    '1. Differential against an independent implementation, even an imperfect one. PineTS was unusable as blanket canon and still found the extrema-bars wrong oracle.',
    '2. Red-first enforcement. It caught four newly merged vectors without proof metadata within hours of landing.',
    '3. Systematic re-derivation. It is the most expensive method and found `0` disagreements across the highest-risk `33` rows.',
    '',
    table(
      ['Proofless vector caught by red-first gate', 'Lane', 'Source commit'],
      redFirstCaughtRows.map((row) => [`\`${row.id}\``, row.lane, `\`${row.sourceCommit}\``]),
    ),
    '',
    '## Remaining Queue',
    '',
    table(
      ['Original rank', 'Case', 'Helper', 'Member', 'Runtime-changed', 'Corpus scripts', 'Call sites'],
      report.remainingRows.map((row) => [
        String(row.rank),
        `\`${row.id}\``,
        `\`${row.helper}\``,
        `\`${row.member}\``,
        row.runtimeChangedFamily ? 'yes' : 'no',
        String(row.corpusScriptCount),
        String(row.corpusCallSiteCount),
      ]),
    ),
    '',
  ].join('\n');
}

async function main(): Promise<void> {
  const priority = await readJson<PriorityReport>(priorityPath);
  const completedRows = priority.rankedRows.filter((row) => completedIds.has(row.id));
  const remainingRows = priority.rankedRows.filter((row) => !completedIds.has(row.id));
  if (completedRows.length !== completedIds.size) {
    const found = new Set(completedRows.map((row) => row.id));
    const missing = [...completedIds].filter((id) => !found.has(id));
    throw new Error(`Missing completed rows in priority report: ${missing.join(', ')}`);
  }
  const report = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    measuredCommitSha: currentCommit(),
    measuredWorkingTreeDirty: workingTreeDirty(),
    inputs: {
      priorityQueue: `pine-value-vector-helper-backfill-priority-v1.json @ ${priority.measuredCommitSha}`,
    },
    summary: {
      status: 'measured-and-deprioritized',
      originalQueueRows: priority.rankedRows.length,
      completedRows: completedRows.length,
      remainingRows: remainingRows.length,
      disagreementsFound: 0,
      completedByHelper: countBy(completedRows, (row) => row.helper),
      remainingByHelper: countBy(remainingRows, (row) => row.helper),
      remainingTopTen: remainingRows.slice(0, 10).map((row) => row.id),
      detectionMethodsByObservedYield: [
        'external-differential',
        'red-first-enforcement',
        'systematic-rederivation',
      ],
      redFirstCaughtRows,
    },
    completedRows,
    remainingRows,
  };
  await writeFile(outJson, `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(outMd, buildMarkdown(report));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
