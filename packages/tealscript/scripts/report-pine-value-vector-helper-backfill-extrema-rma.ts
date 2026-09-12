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

interface PriorityRow {
  id: string;
  helper: string;
  member: string;
  rank: number;
}

interface PriorityReport {
  measuredCommitSha: string;
  rankedRows: PriorityRow[];
}

interface ChainRow {
  helper: string;
  broadRows: number;
  rowIds: string[];
  dependsOnRma: boolean;
  verdict: string;
}

const packageRoot = resolve(dirname(dirname(new URL(import.meta.url).pathname)));
const sourcePath = join(packageRoot, 'scripts/run-pine-value-vectors.ts');
const priorityPath = join(packageRoot, 'reports/pine-value-vector-helper-backfill-priority-v1.json');
const outJson = join(packageRoot, 'reports/pine-value-vector-helper-backfill-extrema-rma-v1.json');
const outMd = join(packageRoot, 'reports/pine-value-vector-helper-backfill-extrema-rma-v1.md');

const backfilledExtremaIds = [
  'ta.highest',
  'ta.lowest',
  'hostile.highest.middle-na',
  'hostile.lowest.middle-na',
  'hostile.highest.multi-middle-na',
  'language.qualifier-helper-chain',
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

function functionBody(source: string, name: string): string {
  const start = source.indexOf(`function ${name}(`);
  if (start < 0) throw new Error(`Missing helper function ${name}`);
  const bodyStart = source.indexOf('{', start);
  let depth = 0;
  for (let index = bodyStart; index < source.length; index += 1) {
    const char = source[index];
    if (char === '{') depth += 1;
    if (char === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(bodyStart + 1, index);
    }
  }
  throw new Error(`Could not extract helper function ${name}`);
}

function helperRows(priority: PriorityReport, helper: string): PriorityRow[] {
  return priority.rankedRows.filter((row) => row.helper === helper);
}

function buildMarkdown(report: {
  measuredCommitSha: string;
  measuredWorkingTreeDirty: boolean;
  inputs: Record<string, string>;
  summary: Record<string, unknown>;
  extremaRows: Array<Record<string, unknown>>;
  chainRows: ChainRow[];
  proofFailures: string[];
}): string {
  return [
    '# Pine Value Vector Helper Backfill Extrema/RMA Checkpoint v1',
    '',
    `Generated: ${new Date().toISOString()}`,
    `Measured source commit: \`${report.measuredCommitSha}\`${report.measuredWorkingTreeDirty ? ' with this report script/report dirty in the worktree' : ''}.`,
    '',
    '## Purpose',
    '',
    'This is the first backfill checkpoint from `pine-value-vector-helper-backfill-priority-v1`. It retires the pure `ta.highest`/`ta.lowest` broad-citation rows first because they are siblings of the corrected `ta.highestbars`/`ta.lowestbars` wrong-oracle family, then analyzes the `ta.rma` dependency chain before any `rma`/`atr`/`rsi` rows are backfilled.',
    '',
    '## Inputs',
    '',
    `- Priority queue: \`${report.inputs.priorityQueue}\`.`,
    '- Value-vector runner source: `scripts/run-pine-value-vectors.ts`.',
    '',
    '## Headline',
    '',
    `- Extrema-value rows backfilled: ${report.summary.extremaRowsBackfilled}.`,
    `- Extrema rows with validated red-first proof metadata: ${report.summary.extremaRowsWithProof}.`,
    `- Discrimination proof failures among backfilled rows: ${report.summary.extremaProofFailures}.`,
    `- ` + String(report.summary.chainFinding),
    '',
    '## Extrema Rows',
    '',
    'Re-derivation reproduced the current expectations. The expected values are the published rolling maximum/minimum over `length` non-`na` source values, not bars-ago offsets. That differs from the corrected `highestbars`/`lowestbars` sign family, so no sign flip applies to these value-returning siblings. The sibling check still paid off: it localized the wrong-oracle bug to the offset-returning members rather than clearing the whole extrema family by assumption.',
    '',
    table(
      ['Case', 'Member', 'Rule/proof citation', 'Compiled', 'Public path'],
      report.extremaRows.map((row) => [
        `\`${row.id}\``,
        `\`${row.member}\``,
        String(row.citation),
        String(row.compiledMatches),
        String(row.publicPathMatches),
      ]),
    ),
    '',
    '## RMA Chain',
    '',
    table(
      ['Helper', 'Broad rows', 'Depends on `rma` helper', 'Rows', 'Verdict'],
      report.chainRows.map((row) => [
        `\`${row.helper}\``,
        String(row.broadRows),
        row.dependsOnRma ? 'yes' : 'no',
        row.rowIds.map((id) => `\`${id}\``).join(', '),
        row.verdict,
      ]),
    ),
    '',
    '## Next Queue Implication',
    '',
    '`ta.atr` and `ta.rsi` expectations flow through the local `rma` helper, so those vectors are not independent oracles until either `rma` itself is re-derived from a concrete published Wilder/RMA formula or each consumer is re-derived directly from its published composition. `ta.mfi` does not flow through `rma`; it is a standalone money-flow window helper and can be backfilled separately after the `rma` primitive is settled.',
    '',
  ].join('\n');
}

async function main(): Promise<void> {
  const priority = await readJson<PriorityReport>(priorityPath);
  const source = await readFile(sourcePath, 'utf8');
  const atrDependsOnRma = /\brma\s*\(/.test(functionBody(source, 'atr'));
  const rsiDependsOnRma = /\brma\s*\(/.test(functionBody(source, 'rsi'));
  const mfiBody = functionBody(source, 'mfi');
  const mfiFromSourceBody = functionBody(source, 'mfiFromSource');
  const mfiDependsOnRma = /\brma\s*\(/.test(`${mfiBody}\n${mfiFromSourceBody}`);

  const proofFailures = validateValueVectorDiscriminationProofs();
  const backfilledCases = backfilledExtremaIds.map(caseById);
  const extremaRows = backfilledCases.map((testCase) => {
    const result = runCase(testCase);
    return {
      id: testCase.id,
      member: testCase.id.includes('lowest') ? 'ta.lowest' : 'ta.highest',
      citation: testCase.discriminationProof?.helperFormulaCitation,
      compiledMatches: result.compiledMatches,
      publicPathMatches: result.publicPathMatches,
    };
  });
  const extremaProofFailures = proofFailures.filter((failure) =>
    backfilledExtremaIds.some((id) => failure.startsWith(`${id}:`)),
  );

  const chainRows: ChainRow[] = [
    {
      helper: 'rma',
      broadRows: helperRows(priority, 'rma').length,
      rowIds: helperRows(priority, 'rma').map((row) => row.id),
      dependsOnRma: false,
      verdict: 'Primitive helper for this chain; still broad-citation and not backfilled in this checkpoint.',
    },
    {
      helper: 'atr',
      broadRows: helperRows(priority, 'atr').length,
      rowIds: helperRows(priority, 'atr').map((row) => row.id),
      dependsOnRma: atrDependsOnRma,
      verdict: atrDependsOnRma
        ? 'Chained through local rma helper over true ranges; not independent until rma or direct ATR composition is re-derived.'
        : 'No rma dependency found.',
    },
    {
      helper: 'rsi',
      broadRows: helperRows(priority, 'rsi').length,
      rowIds: helperRows(priority, 'rsi').map((row) => row.id),
      dependsOnRma: rsiDependsOnRma,
      verdict: rsiDependsOnRma
        ? 'Chained through local rma helper over gain/loss series; not independent until rma or direct RSI composition is re-derived.'
        : 'No rma dependency found.',
    },
    {
      helper: 'mfi',
      broadRows: helperRows(priority, 'mfi').length,
      rowIds: helperRows(priority, 'mfi').map((row) => row.id),
      dependsOnRma: mfiDependsOnRma,
      verdict: mfiDependsOnRma
        ? 'Unexpected rma dependency found; do not backfill before resolving.'
        : 'Standalone money-flow window helper; no rma dependency found in mfi/mfiFromSource.',
    },
  ];

  const report = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    measuredCommitSha: currentCommit(),
    measuredWorkingTreeDirty: workingTreeDirty(),
    inputs: {
      priorityQueue: `pine-value-vector-helper-backfill-priority-v1.json @ ${priority.measuredCommitSha}`,
    },
    summary: {
      extremaRowsBackfilled: extremaRows.length,
      extremaRowsWithProof: extremaRows.filter((row) => row.citation).length,
      extremaProofFailures: extremaProofFailures.length,
      chainFinding: '`atr` and `rsi` expectations chain through `rma`; `mfi` does not.',
      rmaBroadRows: helperRows(priority, 'rma').length,
      atrBroadRows: helperRows(priority, 'atr').length,
      rsiBroadRows: helperRows(priority, 'rsi').length,
      mfiBroadRows: helperRows(priority, 'mfi').length,
    },
    extremaRows,
    chainRows,
    proofFailures: extremaProofFailures,
  };

  await writeFile(outJson, `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(outMd, buildMarkdown(report));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
