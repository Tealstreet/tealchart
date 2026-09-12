import { readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

import type { ExternalCorpusPipelineStage, ExternalCorpusReport } from './run-external-pine-corpus.ts';

type VerdictBucket = 'supported' | 'tealscript-gap' | 'invalid-pine' | 'corpus-hygiene' | 'corpus-input-gap' | 'unsupported-by-design';
type DeltaDisposition = 'tightening-correctness' | 'breakage' | 'unadjudicated' | 'fixed' | 'unchanged';

export interface PinnedCorpusVerdict {
  bucket: VerdictBucket;
  reason: string;
}

export interface PinnedCorpusVerdicts {
  rows: Record<string, PinnedCorpusVerdict>;
}

export interface PinnedCorpusDeltaRow {
  localPath: string;
  stage: ExternalCorpusPipelineStage;
  disposition: DeltaDisposition;
  before: string;
  after: string;
  verdict?: PinnedCorpusVerdict;
}

export interface PinnedCorpusDelta {
  beforeCommitSha: string;
  afterCommitSha: string;
  rows: PinnedCorpusDeltaRow[];
  counts: Record<DeltaDisposition, number>;
}

type PinnedExternalCorpusReport = ExternalCorpusReport & { measurementCommitSha: string };

const STAGES: ExternalCorpusPipelineStage[] = ['parse', 'semantic', 'compile', 'execute', 'output'];

function stageText(report: PinnedExternalCorpusReport, localPath: string, stage: ExternalCorpusPipelineStage): string {
  const row = report.rows.find((candidate) => candidate.localPath === localPath);
  if (!row) return 'missing-row';
  const result = row.stages[stage];
  return `${result.status}${result.diagnostic ? `: ${result.diagnostic}` : ''}`;
}

function passed(report: PinnedExternalCorpusReport, localPath: string, stage: ExternalCorpusPipelineStage): boolean {
  const row = report.rows.find((candidate) => candidate.localPath === localPath);
  if (!row) return false;
  return row.stages[stage].status === 'passed' || row.stages[stage].status === 'fallback';
}

function classifyTransition(verdict: PinnedCorpusVerdict | undefined): DeltaDisposition {
  if (!verdict) return 'unadjudicated';
  if (verdict.bucket === 'invalid-pine' || verdict.bucket === 'corpus-hygiene' || verdict.bucket === 'unsupported-by-design') {
    return 'tightening-correctness';
  }
  return 'breakage';
}

export function comparePinnedCorpusReports(
  before: PinnedExternalCorpusReport,
  after: PinnedExternalCorpusReport,
  verdicts: PinnedCorpusVerdicts,
): PinnedCorpusDelta {
  if (!before.measurementCommitSha || !after.measurementCommitSha) {
    throw new Error('Both corpus reports must carry measurementCommitSha');
  }
  const paths = [...new Set([...before.rows, ...after.rows].map((row) => row.localPath))];
  const rows: PinnedCorpusDeltaRow[] = [];
  let unchangedRows = 0;
  for (const localPath of paths) {
    let changed = false;
    for (const stage of STAGES) {
      const wasPassed = passed(before, localPath, stage);
      const isPassed = passed(after, localPath, stage);
      let disposition: DeltaDisposition = 'unchanged';
      if (wasPassed && !isPassed) disposition = classifyTransition(verdicts.rows[localPath]);
      else if (!wasPassed && isPassed) disposition = 'fixed';
      if (disposition !== 'unchanged') {
        changed = true;
        rows.push({
          localPath,
          stage,
          disposition,
          before: stageText(before, localPath, stage),
          after: stageText(after, localPath, stage),
          verdict: verdicts.rows[localPath],
        });
        break;
      }
    }
    if (!changed) unchangedRows += 1;
  }
  const counts = {
    'tightening-correctness': 0,
    breakage: 0,
    unadjudicated: 0,
    fixed: 0,
    unchanged: 0,
  } satisfies Record<DeltaDisposition, number>;
  for (const row of rows) counts[row.disposition] += 1;
  counts.unchanged = unchangedRows;
  return {
    beforeCommitSha: before.measurementCommitSha,
    afterCommitSha: after.measurementCommitSha,
    rows,
    counts,
  };
}

async function loadJson<T>(path: string): Promise<T> {
  return JSON.parse(await readFile(path, 'utf8')) as T;
}

function parseArgs(args: string[]): { before: string; after: string; verdicts: string; output: string } {
  const values = new Map<string, string>();
  for (let index = 0; index < args.length; index += 2) values.set(args[index]!, args[index + 1] ?? '');
  const before = values.get('--before') ?? '';
  const after = values.get('--after') ?? '';
  const verdicts = values.get('--verdicts') ?? '';
  const output = values.get('--output') ?? '';
  if (!before || !after || !verdicts || !output) {
    throw new Error('Usage: pine:external-corpus:compare --before report.json --after report.json --verdicts verdicts.json --output delta.json');
  }
  return { before, after, verdicts, output };
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const delta = comparePinnedCorpusReports(
    await loadJson<PinnedExternalCorpusReport>(args.before),
    await loadJson<PinnedExternalCorpusReport>(args.after),
    await loadJson<PinnedCorpusVerdicts>(args.verdicts),
  );
  await writeFile(args.output, `${JSON.stringify(delta, null, 2)}\n`, 'utf8');
  process.stdout.write(`${JSON.stringify(delta.counts)}\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error: unknown) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
