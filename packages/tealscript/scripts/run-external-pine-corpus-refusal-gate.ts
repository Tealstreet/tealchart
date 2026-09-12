import { dirname, resolve } from 'node:path';
import { readFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';

import type {
  ExternalCorpusPipelineStage,
  ExternalCorpusReport,
  ExternalCorpusReportRow,
} from './run-external-pine-corpus.ts';
import { runExternalPineCorpus } from './run-external-pine-corpus.ts';

export const FAST_CORPUS_REFUSAL_GATE_FIXTURE_DIR = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../tests/compat/fixtures/fast-corpus-refusal',
);

export const FAST_CORPUS_REFUSAL_GATE_EXPECTED_ROWS = 6;

interface RefusalGateManifest {
  scripts: RefusalGateManifestScript[];
}

interface RefusalGateManifestScript {
  localPath: string;
  expectedFailureStage: ExternalCorpusPipelineStage;
  expectedDiagnosticIncludes: string;
}

export interface FastCorpusRefusalGateFailure {
  localPath: string;
  expectedFailureStage: ExternalCorpusPipelineStage;
  expectedDiagnosticIncludes: string;
  actualOutcome: ExternalCorpusReportRow['outcome'];
  actualFailureStage: ExternalCorpusReportRow['firstFailedStage'];
  actualDiagnostic: string;
}

export interface FastCorpusRefusalGateResult {
  report: ExternalCorpusReport;
  failures: FastCorpusRefusalGateFailure[];
}

function rowDiagnostic(row: ExternalCorpusReportRow): string {
  if (row.firstFailedStage) {
    return row.stages[row.firstFailedStage]?.diagnostic ?? row.compiledBarErrors?.firstMessage ?? '';
  }
  return row.compiledBarErrors?.firstMessage ?? row.swallowedErrors?.[0]?.firstMessage ?? '';
}

async function readRefusalManifest(inputDir: string): Promise<RefusalGateManifest> {
  const manifest = JSON.parse(await readFile(resolve(inputDir, 'manifest.json'), 'utf8')) as RefusalGateManifest;
  if (!Array.isArray(manifest.scripts)) throw new Error('manifest.scripts must be an array');
  return manifest;
}

export async function runFastCorpusRefusalGate(
  inputDir = FAST_CORPUS_REFUSAL_GATE_FIXTURE_DIR,
): Promise<FastCorpusRefusalGateResult> {
  const [manifest, report] = await Promise.all([
    readRefusalManifest(inputDir),
    runExternalPineCorpus({ inputDir }),
  ]);
  const expectations = new Map(manifest.scripts.map((script) => [script.localPath, script]));
  const seenRows = new Set<string>();
  const failures = report.rows.flatMap((row): FastCorpusRefusalGateFailure[] => {
    seenRows.add(row.localPath);
    const expectation = expectations.get(row.localPath);
    if (!expectation) {
      return [{
        localPath: row.localPath,
        expectedFailureStage: 'parse',
        expectedDiagnosticIncludes: 'listed in fast refusal gate manifest',
        actualOutcome: row.outcome,
        actualFailureStage: row.firstFailedStage,
        actualDiagnostic: 'row is not listed in fast refusal gate manifest',
      }];
    }
    const diagnostic = rowDiagnostic(row);
    const matches = row.outcome === 'failed'
      && row.firstFailedStage === expectation.expectedFailureStage
      && diagnostic.includes(expectation.expectedDiagnosticIncludes);
    if (matches) return [];
    return [{
      localPath: row.localPath,
      expectedFailureStage: expectation.expectedFailureStage,
      expectedDiagnosticIncludes: expectation.expectedDiagnosticIncludes,
      actualOutcome: row.outcome,
      actualFailureStage: row.firstFailedStage,
      actualDiagnostic: diagnostic,
    }];
  });
  for (const expectation of manifest.scripts) {
    if (seenRows.has(expectation.localPath)) continue;
    failures.push({
      localPath: expectation.localPath,
      expectedFailureStage: expectation.expectedFailureStage,
      expectedDiagnosticIncludes: expectation.expectedDiagnosticIncludes,
      actualOutcome: 'failed',
      actualFailureStage: null,
      actualDiagnostic: 'row is listed in fast refusal gate manifest but missing from corpus report',
    });
  }
  return { report, failures };
}

async function main(): Promise<void> {
  const { report, failures } = await runFastCorpusRefusalGate();
  if (report.rows.length !== FAST_CORPUS_REFUSAL_GATE_EXPECTED_ROWS) {
    throw new Error(
      `Fast corpus refusal gate fixture drifted: expected ${FAST_CORPUS_REFUSAL_GATE_EXPECTED_ROWS} rows, got ${report.rows.length}.`,
    );
  }
  if (failures.length > 0) {
    const detail = failures
      .map((failure) => [
        `${failure.localPath}: expected ${failure.expectedFailureStage} diagnostic containing ${JSON.stringify(failure.expectedDiagnosticIncludes)}`,
        `  actual ${failure.actualOutcome} at ${failure.actualFailureStage ?? 'none'} (${failure.actualDiagnostic})`,
      ].join('\n'))
      .join('\n');
    throw new Error(
      `Fast corpus refusal gate found ${failures.length} row(s) whose expected refusal changed.\n${detail}`,
    );
  }
  process.stdout.write(`${JSON.stringify({
    rows: report.rows.length,
    expectedRefusals: report.rows.length - failures.length,
    outputRows: report.summary.funnel.output.count,
  }, null, 2)}\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error: unknown) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
