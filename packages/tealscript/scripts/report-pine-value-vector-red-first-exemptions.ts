#!/usr/bin/env tsx

import { readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';

import {
  CASES,
  type ValueVectorCase,
  type ValueVectorResult,
  runValueVectors,
  validateValueVectorDiscriminationProofs,
} from './run-pine-value-vectors.ts';

interface ExemptionRow {
  rank: number;
  id: string;
  namespace: string;
  sourceOrder: number;
  reason: string;
  hasProof: boolean;
  expectedDiagnostics: boolean;
  outputShape: string;
  failureMessages: string[];
}

const packageRoot = resolve(dirname(dirname(new URL(import.meta.url).pathname)));
const reportJsonPath = join(packageRoot, 'reports/pine-value-vector-red-first-exemptions-v1.json');

function failureIds(failures: readonly string[]): Map<string, string[]> {
  const byId = new Map<string, string[]>();
  for (const failure of failures) {
    const separator = failure.indexOf(':');
    const id = separator === -1 ? failure : failure.slice(0, separator);
    const messages = byId.get(id) ?? [];
    messages.push(failure);
    byId.set(id, messages);
  }
  return byId;
}

function expectedOutputs(result: ValueVectorResult): Array<readonly (number | null)[]> {
  return result.expectedOutputs ?? [result.expected];
}

function outputShape(result: ValueVectorResult): string {
  const outputs = expectedOutputs(result);
  if (result.compiledOutputs === null || result.publicPathOutputs === null) return 'null-runtime-output';
  if (outputs.length === 0) return 'no-expected-output';
  const values = outputs.flat();
  if (values.length === 0) return 'empty-series';
  if (values.every((value) => value === null)) return 'all-null-series';
  const finite = values.filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
  if (finite.length > 0 && finite.every((value) => value === finite[0])) return 'constant-finite-series';
  return 'value-varying-series';
}

function reasonFor(testCase: ValueVectorCase, result: ValueVectorResult, failures: readonly string[]): string {
  if (result.compiledOutputs === null || result.publicPathOutputs === null) {
    return testCase.expectedDiagnostics
      ? 'expected-diagnostic/null-output-unprovable-by-output-mutation'
      : 'red-or-failed/null-output-unprovable-by-output-mutation';
  }
  if (failures.some((failure) => failure.includes('length-only discrimination mutation'))) {
    return 'length-only-proof-not-accepted';
  }
  if (failures.some((failure) => failure.includes('must include discriminationProof metadata'))) {
    const shape = outputShape(result);
    if (shape === 'all-null-series') return 'missing-proof/all-null-series';
    if (shape === 'constant-finite-series') return 'missing-proof/constant-series';
    return 'missing-proof/value-series';
  }
  if (failures.some((failure) => failure.includes('must include a value-flipping mutation'))) {
    return 'missing-value-flipping-mutation';
  }
  if (failures.some((failure) => failure.includes('did not flip the case red'))) {
    return 'value-flipping-mutation-did-not-discriminate';
  }
  return 'other-proof-backlog';
}

function reasonPriority(reason: string): number {
  if (reason.includes('null-output')) return 0;
  if (reason.includes('length-only') || reason.includes('missing-value-flipping')) return 1;
  if (reason.includes('all-null')) return 2;
  if (reason.includes('constant')) return 3;
  return 4;
}

function countBy(rows: readonly ExemptionRow[], key: (row: ExemptionRow) => string): Record<string, number> {
  const counts = new Map<string, number>();
  for (const row of rows) counts.set(key(row), (counts.get(key(row)) ?? 0) + 1);
  return Object.fromEntries([...counts.entries()].sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0])));
}

function computeExemptions(): ExemptionRow[] {
  const results = runValueVectors();
  const failures = validateValueVectorDiscriminationProofs(CASES, results, new Set());
  const failuresById = failureIds(failures);
  const resultsById = new Map(results.map((result) => [result.id, result]));
  const ranked = CASES
    .map((testCase, index) => {
      const failureMessages = failuresById.get(testCase.id);
      if (!failureMessages) return null;
      const result = resultsById.get(testCase.id);
      if (!result) throw new Error(`Missing result for ${testCase.id}`);
      const reason = reasonFor(testCase, result, failureMessages);
      return {
        rank: 0,
        id: testCase.id,
        namespace: testCase.namespace,
        sourceOrder: index + 1,
        reason,
        hasProof: Boolean(testCase.discriminationProof),
        expectedDiagnostics: Boolean(testCase.expectedDiagnostics),
        outputShape: outputShape(result),
        failureMessages,
      } satisfies ExemptionRow;
    })
    .filter((row): row is ExemptionRow => row !== null)
    .sort((left, right) =>
      reasonPriority(left.reason) - reasonPriority(right.reason)
      || left.sourceOrder - right.sourceOrder
      || left.id.localeCompare(right.id));

  ranked.forEach((row, index) => {
    row.rank = index + 1;
  });

  return ranked;
}

async function main(): Promise<void> {
  const computed = computeExemptions();
  const committed = JSON.parse(await readFile(reportJsonPath, 'utf8')) as {
    exemptions?: ExemptionRow[];
  };
  const committedExemptions = committed.exemptions ?? [];
  const committedIds = new Set(committedExemptions.map((row) => row.id));
  const computedIds = new Set(computed.map((row) => row.id));
  const missingFromCommitted = computed.filter((row) => !committedIds.has(row.id));
  const staleInCommitted = committedExemptions.filter((row) => !computedIds.has(row.id));
  const changedReason = computed.filter((row) => {
    const committedRow = committedExemptions.find((entry) => entry.id === row.id);
    return committedRow && committedRow.reason !== row.reason;
  });
  const summary = {
    totalCases: CASES.length,
    frozenBaselineCases: 0,
    exemptions: computed.length,
    enforcedCases: CASES.length - computed.length,
    nullOutputExemptions: computed.filter((row) => row.reason.includes('null-output')).length,
    lengthOnlyOrInvalidProofExemptions: computed.filter((row) =>
      row.reason.includes('length-only') || row.reason.includes('missing-value-flipping')).length,
    byReason: countBy(computed, (row) => row.reason),
    byShape: countBy(computed, (row) => row.outputShape),
  };

  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
  if (missingFromCommitted.length > 0 || staleInCommitted.length > 0 || changedReason.length > 0) {
    if (missingFromCommitted.length > 0) {
      process.stderr.write(`New red-first exemptions are not allowed automatically: ${missingFromCommitted.map((row) => row.id).join(', ')}\n`);
    }
    if (staleInCommitted.length > 0) {
      process.stderr.write(`Committed red-first exemptions are stale: ${staleInCommitted.map((row) => row.id).join(', ')}\n`);
    }
    if (changedReason.length > 0) {
      process.stderr.write(`Committed red-first exemption reasons changed: ${changedReason.map((row) => row.id).join(', ')}\n`);
    }
    process.stderr.write('Edit pine-value-vector-red-first-exemptions-v1.json/md deliberately and review the tracked diff if an exemption change is intentional.\n');
    process.exitCode = 1;
  }
}

main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
