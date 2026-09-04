import { describe, expect, it } from 'vitest';

import realtimeCorpusReport from '../../reports/external-pine-corpus-realtime.report.json' with { type: 'json' };
import v1Report from '../../reports/external-pine-corpus-v1.report.json' with { type: 'json' };
import v2Report from '../../reports/external-pine-corpus-v2.report.json' with { type: 'json' };
import v3Report from '../../reports/external-pine-corpus-v3.report.json' with { type: 'json' };
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
      parse: { count: 218, percent: 99.09 },
      semantic: { count: 190, percent: 86.36 },
      compile: { count: 190, percent: 86.36 },
      execute: { count: 188, percent: 85.45 },
      output: { count: 178, percent: 80.91 },
    });
    expect(report.summary.achievableCeiling).toEqual(expect.objectContaining({
      denominator: 194,
      excludedInvalidPine: 24,
      excludedCorpusHygiene: 0,
      excludedCorpusInputGap: 0,
      excludedUnsupportedByDesign: 2,
    }));
    expect(report.summary.achievableCeiling.funnel.output).toEqual({ count: 178, percent: 91.75 });
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
      scripts: 1,
      totalErrors: 160,
      firstCauses: [
        expect.objectContaining({
          message: 'deps._mtx[name] is not a function',
          count: 1,
        }),
      ],
    });
    expect(report.summary.validity).toEqual({
      'invalid-pine': 24,
      supported: 184,
      'tealscript-gap': 10,
      'unsupported-by-design': 2,
    });
    expect(report.summary.swallowedErrors).toEqual({
      scripts: 1,
      totalErrors: 160,
      firstCauses: [
        expect.objectContaining({
          site: 'compiled-bar',
          message: 'deps._mtx[name] is not a function',
          count: 1,
        }),
      ],
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
      parse: { count: 145, percent: 96.03 },
      semantic: { count: 122, percent: 80.79 },
      compile: { count: 122, percent: 80.79 },
      execute: { count: 118, percent: 78.15 },
      output: { count: 103, percent: 68.21 },
    });
    expect(report.summary.achievableCeiling).toEqual(expect.objectContaining({
      denominator: 112,
      excludedInvalidPine: 13,
      excludedCorpusHygiene: 1,
      excludedCorpusInputGap: 11,
      excludedUnsupportedByDesign: 14,
    }));
    expect(report.summary.achievableCeiling.funnel.output).toEqual({ count: 103, percent: 91.96 });
    expect(report.summary.achievableCeiling.funnel.semantic).toEqual({ count: 111, percent: 99.11 });
    expect(report.summary.achievableCeiling.funnel.execute).toEqual({ count: 107, percent: 95.54 });
    expect(report.summary.validity).toEqual({
      'corpus-hygiene': 1,
      'corpus-input-gap': 11,
      'invalid-pine': 13,
      supported: 111,
      'tealscript-gap': 1,
      'unsupported-by-design': 14,
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

  it('pins the expanded corpus v3 funnel', () => {
    const report = v3Report;

    expect(report.schemaVersion).toBe(EXTERNAL_PINE_CORPUS_REPORT_SCHEMA_VERSION);
    expect(report.summary.total).toBe(463);
    expect(report.summary.repositories).toBe(144);
    expect(report.summary.declarationKinds).toEqual({
      indicator: 349,
      library: 1,
      strategy: 67,
      study: 46,
    });
    expect(report.summary.versionMix).toEqual({
      3: 40,
      4: 5,
      5: 204,
      6: 213,
      unknown: 1,
    });
    expect(report.summary.funnel).toEqual({
      parse: { count: 448, percent: 96.76 },
      semantic: { count: 382, percent: 82.51 },
      compile: { count: 382, percent: 82.51 },
      execute: { count: 365, percent: 78.83 },
      output: { count: 330, percent: 71.27 },
    });
    expect(report.summary.achievableCeiling).toEqual(expect.objectContaining({
      denominator: 355,
      excludedInvalidPine: 51,
      excludedCorpusHygiene: 7,
      excludedCorpusInputGap: 24,
      excludedUnsupportedByDesign: 26,
    }));
    expect(report.summary.achievableCeiling.funnel.parse).toEqual({ count: 355, percent: 100 });
    expect(report.summary.achievableCeiling.funnel.output).toEqual({ count: 330, percent: 92.96 });
    expect(report.summary.validity).toEqual({
      'corpus-hygiene': 7,
      'corpus-input-gap': 24,
      'host-dependency-gap': 3,
      'invalid-pine': 51,
      supported: 352,
      'unsupported-by-design': 26,
    });
    expect(report.summary.failureCauses.slice(0, 10).map(({ stage, cause, count }) => ({ stage, cause, count }))).toEqual([
      { stage: 'semantic', cause: 'unresolved-import', count: 26 },
      { stage: 'semantic', cause: 'type-mismatch', count: 16 },
      { stage: 'parse', cause: 'unexpected-token', count: 15 },
      { stage: 'output', cause: 'conditional-or-data-gated-output-not-triggered', count: 11 },
      { stage: 'output', cause: 'corpus-bars-do-not-trigger-data-gated-output', count: 11 },
      { stage: 'execute', cause: 'request-context-limit', count: 8 },
      { stage: 'semantic', cause: 'unknown-identifier', count: 7 },
      { stage: 'semantic', cause: 'duplicate-symbol', count: 5 },
      { stage: 'output', cause: 'synthetic-window-did-not-trigger-output', count: 5 },
      { stage: 'execute', cause: 'array-bounds-runtime-error', count: 4 },
    ]);
    expect(report.rows.every((row) => row.sourceRepoUrl && row.sourceFilePath && row.commitSha)).toBe(true);
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
