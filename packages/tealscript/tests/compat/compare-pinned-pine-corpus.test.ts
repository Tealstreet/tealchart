import { describe, expect, it } from 'vitest';

import type { ExternalCorpusReport } from '../../scripts/run-external-pine-corpus.ts';
import { comparePinnedCorpusReports } from '../../scripts/compare-pinned-pine-corpus.ts';
import { mergePinnedCorpusReports } from '../../scripts/merge-pinned-pine-corpus.ts';
import type { PinnedReport } from '../../scripts/merge-pinned-pine-corpus.ts';

const stages = {
  parse: { status: 'passed' },
  semantic: { status: 'passed' },
  compile: { status: 'passed' },
  execute: { status: 'passed' },
  output: { status: 'passed' },
} as const;

function report(commit: string, rows: Array<{ localPath: string; semantic: 'passed' | 'failed' }>): ExternalCorpusReport {
  return {
    schemaVersion: 14,
    measurementCommitSha: commit,
    rows: rows.map(({ localPath, semantic }) => ({
      id: localPath,
      localPath,
      declaredVersion: 6,
      declarationKind: 'indicator',
      byteSize: 1,
      validity: { bucket: 'undecided', reason: '' },
      firstFailedStage: semantic === 'failed' ? 'semantic' : null,
      outcome: semantic === 'failed' ? 'failed' : 'produced-output-compiled',
      executionMode: semantic === 'failed' ? 'not-run' : 'compiled',
      fallbackReasons: [],
      output: { produced: semantic !== 'failed', plots: 1, drawings: 0, alerts: 0, logs: 0 },
      outputParity: { status: 'not-run' },
      strategyLedgerParity: { compiledLedger: { status: 'not-run' } },
      stages: {
        ...stages,
        semantic: { status: semantic, ...(semantic === 'failed' ? { diagnostic: 'invalid construct' } : {}) },
        compile: semantic === 'failed' ? { status: 'not-run' } : stages.compile,
        execute: semantic === 'failed' ? { status: 'not-run' } : stages.execute,
        output: semantic === 'failed' ? { status: 'not-run' } : stages.output,
      },
    })),
  } as unknown as ExternalCorpusReport;
}

describe('comparePinnedCorpusReports', () => {
  it('separates adjudicated correct rejection from breakage', () => {
    const before = report('before-sha', [
      { localPath: 'invalid.pine', semantic: 'passed' },
      { localPath: 'breakage.pine', semantic: 'passed' },
      { localPath: 'unknown.pine', semantic: 'passed' },
    ]);
    const after = report('after-sha', [
      { localPath: 'invalid.pine', semantic: 'failed' },
      { localPath: 'breakage.pine', semantic: 'failed' },
      { localPath: 'unknown.pine', semantic: 'failed' },
    ]);

    const delta = comparePinnedCorpusReports(before as ExternalCorpusReport & { measurementCommitSha: string }, after as ExternalCorpusReport & { measurementCommitSha: string }, {
      rows: {
        'invalid.pine': { bucket: 'invalid-pine', reason: 'documented invalid Pine' },
        'breakage.pine': { bucket: 'tealscript-gap', reason: 'valid Pine construct' },
      },
    });

    expect(delta.counts).toEqual({
      'tightening-correctness': 1,
      breakage: 1,
      unadjudicated: 1,
      fixed: 0,
      unchanged: 0,
    });
    expect(delta.rows.map(({ localPath, disposition }) => ({ localPath, disposition }))).toEqual([
      { localPath: 'invalid.pine', disposition: 'tightening-correctness' },
      { localPath: 'breakage.pine', disposition: 'breakage' },
      { localPath: 'unknown.pine', disposition: 'unadjudicated' },
    ]);
  });

  it('rejects duplicate rows when combining shards', () => {
    const first = report('same-sha', [{ localPath: 'duplicate.pine', semantic: 'passed' }]) as ExternalCorpusReport & { measurementCommitSha: string };
    const second = report('same-sha', [{ localPath: 'duplicate.pine', semantic: 'passed' }]) as ExternalCorpusReport & { measurementCommitSha: string };
    const pinnedFirst = { ...first, measurementSource: 'git-archive' } as PinnedReport;
    const pinnedSecond = { ...second, measurementSource: 'git-archive' } as PinnedReport;
    expect(() => mergePinnedCorpusReports([pinnedFirst, pinnedSecond])).toThrow('Duplicate corpus row');
  });

  it('removes shard identity from the merged report', () => {
    const first = report('same-sha', [{ localPath: 'sharded.pine', semantic: 'passed' }]) as ExternalCorpusReport & { measurementCommitSha: string };
    const shardedReport = {
      ...first,
      measurementShard: { index: 0, count: 2 },
    } as PinnedReport;
    const merged = mergePinnedCorpusReports([shardedReport]);

    expect(merged.measurementShard).toBeUndefined();
    expect(merged.measurementCommitSha).toBe(shardedReport.measurementCommitSha);
  });
});
