import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import type { ExternalCorpusReport, ExternalCorpusReportRow } from './run-external-pine-corpus.ts';
import { runExternalPineCorpus } from './run-external-pine-corpus.ts';

export const FAST_CORPUS_GATE_FIXTURE_DIR = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../tests/compat/fixtures/fast-corpus-acceptance',
);

export const FAST_CORPUS_GATE_EXPECTED_ROWS = 12;

export interface FastCorpusGateFailure {
  localPath: string;
  outcome: ExternalCorpusReportRow['outcome'];
  firstFailedStage: ExternalCorpusReportRow['firstFailedStage'];
  diagnostic: string;
  validityBucket: ExternalCorpusReportRow['validity']['bucket'];
}

export interface FastCorpusGateResult {
  report: ExternalCorpusReport;
  failures: FastCorpusGateFailure[];
}

function rowDiagnostic(row: ExternalCorpusReportRow): string {
  if (row.firstFailedStage) {
    return row.stages[row.firstFailedStage]?.diagnostic ?? row.compiledBarErrors?.firstMessage ?? '';
  }
  return row.compiledBarErrors?.firstMessage ?? row.swallowedErrors?.[0]?.firstMessage ?? '';
}

export async function runFastCorpusAcceptanceGate(
  inputDir = FAST_CORPUS_GATE_FIXTURE_DIR,
): Promise<FastCorpusGateResult> {
  const report = await runExternalPineCorpus({ inputDir });
  const failures = report.rows
    .filter((row) => row.outcome !== 'produced-output-compiled' || !row.output.produced)
    .map((row) => ({
      localPath: row.localPath,
      outcome: row.outcome,
      firstFailedStage: row.firstFailedStage,
      diagnostic: rowDiagnostic(row),
      validityBucket: row.validity.bucket,
    }));
  return { report, failures };
}

async function main(): Promise<void> {
  const { report, failures } = await runFastCorpusAcceptanceGate();
  if (report.rows.length !== FAST_CORPUS_GATE_EXPECTED_ROWS) {
    throw new Error(
      `Fast corpus gate fixture drifted: expected ${FAST_CORPUS_GATE_EXPECTED_ROWS} rows, got ${report.rows.length}.`,
    );
  }
  if (failures.length > 0) {
    const detail = failures
      .map((failure) => `${failure.localPath}: ${failure.outcome} at ${failure.firstFailedStage ?? 'none'} (${failure.diagnostic})`)
      .join('\n');
    throw new Error(
      `Fast corpus acceptance gate found ${failures.length} row(s) that no longer produce output.\n${detail}`,
    );
  }
  process.stdout.write(`${JSON.stringify({
    rows: report.rows.length,
    outputRows: report.summary.funnel.output.count,
    achievableOutputRows: report.summary.achievableCeiling.funnel.output.count,
  }, null, 2)}\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error: unknown) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
