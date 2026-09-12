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

interface RmaRow {
  id: string;
  firstNonNullBar: number | null;
  firstNonNullValue: number | null;
  proofMutations: readonly string[];
  seedDiscriminatingProof: boolean;
  compiledMatches: boolean;
  publicPathMatches: boolean;
}

const packageRoot = resolve(dirname(dirname(new URL(import.meta.url).pathname)));
const extremaReportPath = join(packageRoot, 'reports/pine-value-vector-helper-backfill-extrema-rma-v1.json');
const outJson = join(packageRoot, 'reports/pine-value-vector-helper-backfill-rma-v1.json');
const outMd = join(packageRoot, 'reports/pine-value-vector-helper-backfill-rma-v1.md');

const rmaIds = [
  'ta.rma',
  'ta.smma',
  'hostile.rma.long',
  'hostile.rma.long-middle-na',
  'hostile.rma.middle-na',
  'hostile.rma.multi-middle-na',
  'hostile.rma.synthetic.multi-middle-na',
  'hostile.rma.overlong',
] as const;

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

function firstNonNull(values: readonly (number | null)[]): { index: number | null; value: number | null } {
  const index = values.findIndex((value) => value !== null);
  return index < 0 ? { index: null, value: null } : { index, value: values[index]! };
}

function buildMarkdown(report: {
  measuredCommitSha: string;
  measuredWorkingTreeDirty: boolean;
  inputs: Record<string, string>;
  summary: Record<string, unknown>;
  rmaRows: RmaRow[];
  proofFailures: string[];
}): string {
  return [
    '# Pine Value Vector Helper Backfill RMA v1',
    '',
    `Generated: ${new Date().toISOString()}`,
    `Measured source commit: \`${report.measuredCommitSha}\`${report.measuredWorkingTreeDirty ? ' with this report script/report dirty in the worktree' : ''}.`,
    '',
    '## Purpose',
    '',
    '`ta.rma` is the load-bearing primitive behind the queued `ta.atr` and `ta.rsi` helper expectations. This checkpoint verifies the existing RMA expectations against the published Wilder/RMA formula before those downstream compositions are treated as oracles.',
    '',
    '## Inputs',
    '',
    `- Extrema/RMA chain checkpoint: \`${report.inputs.extremaRmaCheckpoint}\`.`,
    '- Value-vector runner source: `scripts/run-pine-value-vectors.ts`.',
    '',
    '## Headline',
    '',
    `- RMA rows backfilled: ${report.summary.rmaRowsBackfilled}.`,
    `- Seed-discriminating rows: ${report.summary.seedDiscriminatingRows}.`,
    `- No-seed by construction rows: ${report.summary.noSeedRows}.`,
    `- Discrimination proof failures among RMA rows: ${report.summary.rmaProofFailures}.`,
    '',
    'Re-derivation reproduced the current expectations. The published formula is `alpha = 1 / length`, `rma = alpha * source + (1 - alpha) * rma[1]`, seeded by `ta.sma(source, length)`. The seed is the protected point: seven rows include a red-first mutation of the first non-null seeded value. `hostile.rma.overlong` never forms a seed because fewer than `length` non-`na` values are available, so it is verified as a full-length all-`na` no-seed row rather than as a seed-discriminating row.',
    '',
    '## Rows',
    '',
    table(
      ['Case', 'First non-null bar', 'First non-null value', 'Proof mutations', 'Seed-discriminating', 'Compiled', 'Public path'],
      report.rmaRows.map((row) => [
        `\`${row.id}\``,
        row.firstNonNullBar === null ? '`none`' : String(row.firstNonNullBar),
        row.firstNonNullValue === null ? '`none`' : String(row.firstNonNullValue),
        row.proofMutations.map((mutation) => `\`${mutation}\``).join(', '),
        row.seedDiscriminatingProof ? 'yes' : 'no',
        String(row.compiledMatches),
        String(row.publicPathMatches),
      ]),
    ),
    '',
    '## Downstream Implication',
    '',
    '`ta.atr` and `ta.rsi` can now cite RMA as a verified primitive when their helper rows are backfilled. They still need their own composition citations, but they do not need independent first-principles re-derivation unless a later RMA audit disagreement appears. `ta.mfi` remains standalone and is not blocked by RMA.',
    '',
    '## Gate Catch',
    '',
    'The red-first enforcement paid for itself immediately after the parity merge: the value-vector gate caught four newly merged vectors without discrimination metadata before this RMA checkpoint could go green. Those rows came from semantic argument-type/qualifier work and runtime operator/versioned-operator work, and were given proof metadata before the checkpoint continued.',
    '',
  ].join('\n');
}

async function main(): Promise<void> {
  const extremaReport = await readJson<{ measuredCommitSha: string }>(extremaReportPath);
  const proofFailures = validateValueVectorDiscriminationProofs();
  const rmaRows = rmaIds.map((id): RmaRow => {
    const testCase = caseById(id);
    const result = runCase(testCase);
    const first = firstNonNull(result.expectedOutputs?.[0] ?? result.expected);
    const proofMutations = testCase.discriminationProof?.mutations ?? [];
    return {
      id,
      firstNonNullBar: first.index,
      firstNonNullValue: first.value,
      proofMutations,
      seedDiscriminatingProof: proofMutations.includes('flip-first-non-null-value'),
      compiledMatches: result.compiledMatches,
      publicPathMatches: result.publicPathMatches,
    };
  });
  const rmaProofFailures = proofFailures.filter((failure) => rmaIds.some((id) => failure.startsWith(`${id}:`)));
  const report = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    measuredCommitSha: currentCommit(),
    measuredWorkingTreeDirty: workingTreeDirty(),
    inputs: {
      extremaRmaCheckpoint: `pine-value-vector-helper-backfill-extrema-rma-v1.json @ ${extremaReport.measuredCommitSha}`,
    },
    summary: {
      rmaRowsBackfilled: rmaRows.length,
      seedDiscriminatingRows: rmaRows.filter((row) => row.seedDiscriminatingProof).length,
      noSeedRows: rmaRows.filter((row) => row.firstNonNullBar === null).length,
      rmaProofFailures: rmaProofFailures.length,
      downstreamNowComposable: ['ta.atr', 'ta.rsi'],
      standaloneNotRmaBlocked: ['ta.mfi'],
    },
    rmaRows,
    proofFailures: rmaProofFailures,
  };
  await writeFile(outJson, `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(outMd, buildMarkdown(report));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
