import { describe, expect, it } from 'vitest';

import realtimeCorpusReport from '../../reports/external-pine-corpus-realtime.report.json' with { type: 'json' };
import v1Report from '../../reports/external-pine-corpus-v1.report.json' with { type: 'json' };
import v2Report from '../../reports/external-pine-corpus-v2.report.json' with { type: 'json' };
import {
  assertRealtimeSubsetOutputSafe,
  EXTERNAL_PINE_CORPUS_REALTIME_REPORT_SCHEMA_VERSION,
  parseExternalCorpusRealtimeArgs,
} from '../../scripts/run-external-pine-corpus-realtime';
import { EXTERNAL_PINE_CORPUS_REPORT_SCHEMA_VERSION } from '../../scripts/run-external-pine-corpus';

describe('external Pine corpus committed report', () => {
  it('pins the compiled-only corpus v1 funnel', () => {
    const report = v1Report;

    expect(report.schemaVersion).toBe(EXTERNAL_PINE_CORPUS_REPORT_SCHEMA_VERSION);
    expect(report.summary.total).toBe(220);
    expect(report.summary.funnel).toEqual({
      parse: { count: 219, percent: 99.55 },
      semantic: { count: 190, percent: 86.36 },
      compile: { count: 190, percent: 86.36 },
      execute: { count: 188, percent: 85.45 },
      output: { count: 178, percent: 80.91 },
    });
    expect(report.summary.achievableCeiling).toEqual(expect.objectContaining({
      denominator: 199,
      excludedInvalidPine: 21,
      excludedCorpusHygiene: 0,
    }));
    expect(report.summary.achievableCeiling.funnel.output).toEqual({ count: 178, percent: 89.45 });
    expect(report.summary.outputParity).toEqual({
      'not-run': 220,
    });
    expect(report.summary.outputParityDifferenceKinds).toEqual({});
    expect(report.summary.strategyLedgerParity).toEqual({
      strategies: 26,
      executableStrategies: 0,
      activeStrategies: 0,
      matched: 0,
      compiledLedger: {
        'not-run': 26,
      },
      currentlyPassingRowsWithLedgerMismatch: 0,
      differenceKinds: {},
    });
    expect(report.summary.compiledBarErrors).toEqual({
      scripts: 0,
      totalErrors: 0,
      firstCauses: [],
    });
    expect(report.summary.validity).toEqual({
      'host-dependency-gap': 2,
      'invalid-pine': 21,
      supported: 182,
      'tealscript-gap': 15,
    });
    expect(report.summary.swallowedErrors).toEqual({
      scripts: 0,
      totalErrors: 0,
      firstCauses: [],
    });
  });

  it('pins the one-shot corpus v2 holdout funnel', () => {
    const report = v2Report;

    expect(report.schemaVersion).toBe(EXTERNAL_PINE_CORPUS_REPORT_SCHEMA_VERSION);
    expect(report.summary.total).toBe(151);
    expect(report.summary.repositories).toBe(20);
    expect(report.summary.versionMix).toEqual({
      3: 40,
      4: 5,
      5: 9,
      6: 96,
      unknown: 1,
    });
    expect(report.summary.funnel).toEqual({
      parse: { count: 139, percent: 92.05 },
      semantic: { count: 113, percent: 74.83 },
      compile: { count: 113, percent: 74.83 },
      execute: { count: 108, percent: 71.52 },
      output: { count: 93, percent: 61.59 },
    });
    expect(report.summary.achievableCeiling).toEqual(expect.objectContaining({
      denominator: 142,
      excludedInvalidPine: 8,
      excludedCorpusHygiene: 1,
    }));
    expect(report.summary.achievableCeiling.funnel.output).toEqual({ count: 93, percent: 65.49 });
    expect(report.summary.achievableCeiling.funnel.semantic).toEqual({ count: 113, percent: 79.58 });
    expect(report.summary.validity).toEqual({
      'corpus-hygiene': 1,
      'host-dependency-gap': 15,
      'invalid-pine': 8,
      supported: 96,
      'tealscript-gap': 31,
    });
    expect(report.summary.outputParity).toEqual({
      'not-run': 151,
    });
    expect(report.summary.strategyLedgerParity).toEqual({
      strategies: 7,
      executableStrategies: 0,
      activeStrategies: 0,
      matched: 0,
      compiledLedger: {
        'not-run': 7,
      },
      currentlyPassingRowsWithLedgerMismatch: 0,
      differenceKinds: {},
    });
    expect(report.summary.compiledBarErrors).toEqual({
      scripts: 0,
      totalErrors: 0,
      firstCauses: [],
    });
    expect(report.summary.swallowedErrors).toEqual({
      scripts: 0,
      totalErrors: 0,
      firstCauses: [],
    });
  });

  it('does not claim independent backend parity after the runtime deletion', () => {
    const mismatches = [...v1Report.rows, ...v2Report.rows].filter((row) => row.outputParity.status === 'mismatched');

    expect(mismatches).toHaveLength(0);
    expect(v1Report.summary.outputParity).toEqual({ 'not-run': 220 });
    expect(v2Report.summary.outputParity).toEqual({ 'not-run': 151 });
  });

  it('pins the real-script realtime replay over compiled historical output rows', () => {
    expect(realtimeCorpusReport.schemaVersion).toBe(EXTERNAL_PINE_CORPUS_REALTIME_REPORT_SCHEMA_VERSION);
    expect(realtimeCorpusReport.scope).toBe(
      'All scripts from each compiled historical output set, comparing compiled realtime reconstruction against reference realtime update.',
    );
    expect(realtimeCorpusReport.replay).toEqual({
      seedBars: 148,
      realtimeTailBars: 12,
      sameTimeReplacements: 24,
      confirmationBars: 1,
      comparison: expect.stringContaining('realtime append updates'),
    });
    expect(realtimeCorpusReport.corpora.map((corpus) => ({
      corpus: corpus.corpus,
      dominatedScripts: corpus.summary.dominatedScripts,
      realtimeEventsPerScript: corpus.summary.realtimeEventsPerScript,
      matchedScripts: corpus.summary.matchedScripts,
      mismatchedScripts: corpus.summary.mismatchedScripts,
      failedScripts: corpus.summary.failedScripts,
      matchedComparisons: corpus.summary.matchedComparisons,
      mismatchedComparisons: corpus.summary.mismatchedComparisons,
      mismatchKinds: corpus.summary.mismatchKinds,
    }))).toEqual([
      {
        corpus: 'v1',
        dominatedScripts: 178,
        realtimeEventsPerScript: 37,
        matchedScripts: 178,
        mismatchedScripts: 0,
        failedScripts: 0,
        matchedComparisons: 6586,
        mismatchedComparisons: 0,
        mismatchKinds: {},
      },
      {
        corpus: 'v2',
        dominatedScripts: 93,
        realtimeEventsPerScript: 37,
        matchedScripts: 93,
        mismatchedScripts: 0,
        failedScripts: 0,
        matchedComparisons: 3441,
        mismatchedComparisons: 0,
        mismatchKinds: {},
      },
    ]);
    for (const corpus of realtimeCorpusReport.corpora) {
      const rows = corpus.rows as Array<{
        status: string;
        mismatches: Array<{
          diagnostic: string;
          firstDifference?: { path?: string };
        }>;
      }>;
      const mismatchedRows = rows.filter((row) => row.status === 'mismatched');
      expect(mismatchedRows).toHaveLength(corpus.summary.mismatchedScripts);
      expect(mismatchedRows.every((row) => row.mismatches[0]?.diagnostic.includes('output mismatch'))).toBe(true);
      expect(mismatchedRows.every((row) => row.mismatches[0]?.firstDifference?.path)).toBe(true);
    }
  });

  it('keeps realtime subset runs labelled and away from the committed report', () => {
    const mismatched = parseExternalCorpusRealtimeArgs(['--mismatched-only', '--output', '/tmp/realtime-subset.json']);
    expect(mismatched.subset).toEqual({ kind: 'mismatched', reportPath: 'reports/external-pine-corpus-realtime.report.json' });
    expect(() => assertRealtimeSubsetOutputSafe(mismatched)).not.toThrow();

    const named = parseExternalCorpusRealtimeArgs([
      '--only-script',
      'sources/0115__PythonForForex__Pine-Script-Guide.txt',
      '--only-script',
      'sources/0138__TaichiS__pinescript_practice.pine',
      '--output',
      '/tmp/realtime-named-subset.json',
    ]);
    expect(named.subset).toEqual({
      kind: 'named',
      scripts: [
        'sources/0115__PythonForForex__Pine-Script-Guide.txt',
        'sources/0138__TaichiS__pinescript_practice.pine',
      ],
    });
    expect(() => assertRealtimeSubsetOutputSafe(named)).not.toThrow();

    const unsafe = parseExternalCorpusRealtimeArgs(['--mismatched-only']);
    expect(() => assertRealtimeSubsetOutputSafe(unsafe)).toThrow(/scratch path/);
    expect(() => parseExternalCorpusRealtimeArgs(['--mismatched-only', '--limit-per-corpus', '1'])).toThrow(/one realtime subset selector/);
  });

  it('pins realtime strategy ledger replay over compiled historical output rows', () => {
    expect(realtimeCorpusReport.corpora.map((corpus) => ({
      corpus: corpus.corpus,
      strategies: corpus.summary.strategyLedger.strategies,
      activeStrategies: corpus.summary.strategyLedger.activeStrategies,
      matchedScripts: corpus.summary.strategyLedger.matchedScripts,
      mismatchedScripts: corpus.summary.strategyLedger.mismatchedScripts,
      failedScripts: corpus.summary.strategyLedger.failedScripts,
      matchedComparisons: corpus.summary.strategyLedger.matchedComparisons,
      mismatchedComparisons: corpus.summary.strategyLedger.mismatchedComparisons,
      mismatchKinds: corpus.summary.strategyLedger.mismatchKinds,
    }))).toEqual([
      {
        corpus: 'v1',
        strategies: 17,
        activeStrategies: 6,
        matchedScripts: 17,
        mismatchedScripts: 0,
        failedScripts: 0,
        matchedComparisons: 629,
        mismatchedComparisons: 0,
        mismatchKinds: {},
      },
      {
        corpus: 'v2',
        strategies: 4,
        activeStrategies: 1,
        matchedScripts: 4,
        mismatchedScripts: 0,
        failedScripts: 0,
        matchedComparisons: 148,
        mismatchedComparisons: 0,
        mismatchKinds: {},
      },
    ]);
  });
});
