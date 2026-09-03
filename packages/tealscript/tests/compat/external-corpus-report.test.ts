import { describe, expect, it } from 'vitest';

import closureCutoverGate from '../../reports/closure-cutover-gate.report.json' with { type: 'json' };
import realtimeCorpusReport from '../../reports/external-pine-corpus-realtime.report.json' with { type: 'json' };
import realtimeEventCostProfile from '../../reports/realtime-event-cost-profile-t121.json' with { type: 'json' };
import v1Report from '../../reports/external-pine-corpus-v1.report.json' with { type: 'json' };
import v2Report from '../../reports/external-pine-corpus-v2.report.json' with { type: 'json' };
import {
  assertRealtimeSubsetOutputSafe,
  EXTERNAL_PINE_CORPUS_REALTIME_REPORT_SCHEMA_VERSION,
  parseExternalCorpusRealtimeArgs,
} from '../../scripts/run-external-pine-corpus-realtime';
import type { ExternalCorpusReport } from '../../scripts/run-external-pine-corpus';
import { EXTERNAL_PINE_CORPUS_REPORT_SCHEMA_VERSION } from '../../scripts/run-external-pine-corpus';
import {
  buildClosureCutoverGateReport,
  CLOSURE_CUTOVER_GATE_SCHEMA_VERSION,
} from '../../scripts/update-closure-cutover-gate';

describe('external Pine corpus committed report', () => {
  it('pins the parity-enforced corpus v1 funnel and output parity split', () => {
    const report = v1Report;

    expect(report.schemaVersion).toBe(EXTERNAL_PINE_CORPUS_REPORT_SCHEMA_VERSION);
    expect(report.summary.total).toBe(220);
    expect(report.summary.funnel).toEqual({
      parse: { count: 219, percent: 99.55 },
      semantic: { count: 190, percent: 86.36 },
      compile: { count: 190, percent: 86.36 },
      execute: { count: 167, percent: 75.91 },
      output: { count: 157, percent: 71.36 },
    });
    expect(report.summary.achievableCeiling).toEqual(expect.objectContaining({
      denominator: 199,
      excludedInvalidPine: 21,
      excludedCorpusHygiene: 0,
    }));
    expect(report.summary.achievableCeiling.funnel.output).toEqual({ count: 157, percent: 78.89 });
    expect(report.summary.outputParity).toEqual({
      matched: 167,
      mismatched: 21,
      'not-run': 32,
    });
    expect(report.summary.outputParityDifferenceKinds).toEqual({
      alerts: 2,
      drawings: 7,
      'plot-values': 11,
      'runtime-errors': 1,
    });
    expect(report.summary.strategyLedgerParity).toEqual({
      strategies: 26,
      executableStrategies: 23,
      activeStrategies: 7,
      allThreeMatched: 23,
      compiledAgainstInterpreter: {
        matched: 23,
        'not-run': 3,
      },
      closureAgainstInterpreter: {
        matched: 23,
        'not-run': 3,
      },
      closureAgainstCompiled: {
        matched: 23,
        'not-run': 3,
      },
      currentlyPassingRowsWithLedgerMismatch: 0,
      differenceKinds: {},
    });
    expect(report.summary.closure.funnel).toEqual({
      compile: { count: 188, percent: 85.45 },
      execute: { count: 183, percent: 83.18 },
      output: { count: 173, percent: 78.64 },
    });
    expect(report.summary.closure.agreement).toEqual({
      'all-three': 167,
      'closure-interpreter-only': 16,
      'closure-not-run': 32,
      'three-way-mismatch': 5,
    });
    expect(report.summary.closure.unsupportedCauses).toEqual([]);
    expect(report.summary.compiledBarErrors).toEqual({
      scripts: 0,
      totalErrors: 0,
      firstCauses: [],
    });
    expect(report.summary.validity).toEqual({
      'host-dependency-gap': 2,
      'invalid-pine': 21,
      supported: 161,
      'tealscript-gap': 36,
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
      execute: { count: 103, percent: 68.21 },
      output: { count: 89, percent: 58.94 },
    });
    expect(report.summary.achievableCeiling).toEqual(expect.objectContaining({
      denominator: 142,
      excludedInvalidPine: 8,
      excludedCorpusHygiene: 1,
    }));
    expect(report.summary.achievableCeiling.funnel.output).toEqual({ count: 89, percent: 62.68 });
    expect(report.summary.achievableCeiling.funnel.semantic).toEqual({ count: 113, percent: 79.58 });
    expect(report.summary.validity).toEqual({
      'corpus-hygiene': 1,
      'host-dependency-gap': 15,
      'invalid-pine': 8,
      supported: 91,
      'tealscript-gap': 36,
    });
    expect(report.summary.outputParity).toEqual({
      matched: 103,
      mismatched: 7,
      'not-run': 41,
    });
    expect(report.summary.strategyLedgerParity).toEqual({
      strategies: 7,
      executableStrategies: 6,
      activeStrategies: 0,
      allThreeMatched: 6,
      compiledAgainstInterpreter: {
        matched: 6,
        'not-run': 1,
      },
      closureAgainstInterpreter: {
        matched: 6,
        'not-run': 1,
      },
      closureAgainstCompiled: {
        matched: 6,
        'not-run': 1,
      },
      currentlyPassingRowsWithLedgerMismatch: 0,
      differenceKinds: {},
    });
    expect(report.summary.closure.funnel).toEqual({
      compile: { count: 105, percent: 69.54 },
      execute: { count: 101, percent: 66.89 },
      output: { count: 92, percent: 60.93 },
    });
    expect(report.summary.closure.agreement).toEqual({
      'all-three': 98,
      'closure-interpreter-only': 4,
      'closure-not-run': 41,
      'closure-unsupported': 5,
      'three-way-mismatch': 3,
    });
    expect(report.summary.closure.unsupportedCauses[0]).toEqual(expect.objectContaining({
      cause: 'unsupported-call:calculateLogMidpoint',
      count: 5,
    }));
    expect(report.summary.compiledBarErrors).toEqual({
      scripts: 1,
      totalErrors: 1,
      firstCauses: [
        {
          message: 'Array index 0 is out of bounds. Array size is 0',
          count: 1,
          representativeScript: 'sources/0023-Erald12-PinescriptIndicator-order_block.txt',
          firstBarIndex: 159,
        },
      ],
    });
    expect(report.summary.swallowedErrors).toEqual({
      scripts: 1,
      totalErrors: 1,
      firstCauses: [
        {
          site: 'compiled-bar',
          message: 'Array index 0 is out of bounds. Array size is 0',
          count: 1,
          representativeScript: 'sources/0023-Erald12-PinescriptIndicator-order_block.txt',
          firstBarIndex: 159,
        },
      ],
    });
  });

  it('keeps every compiled/interpreter mismatch visible with a diagnostic', () => {
    const mismatches = [...v1Report.rows, ...v2Report.rows].filter((row) => row.outputParity.status === 'mismatched');

    expect(mismatches).toHaveLength(v1Report.summary.outputParity.mismatched + v2Report.summary.outputParity.mismatched);
    expect(mismatches.every((row) => row.firstFailedStage === 'execute')).toBe(true);
    expect(mismatches.every((row) => row.outputParity.firstDifference?.path)).toBe(true);
    expect(mismatches.every((row) => row.outputParity.comparedOutput)).toBe(true);
    expect(mismatches.every((row) => row.outputParity.diagnostic?.startsWith('Compiled/interpreter output mismatch:'))).toBe(true);
  });

  it('pins the closure cutover gate as per-script domination rather than aggregate output count', () => {
    const expected = buildClosureCutoverGateReport([
      { corpus: 'v1', path: 'reports/external-pine-corpus-v1.report.json', report: v1Report as unknown as ExternalCorpusReport },
      { corpus: 'v2', path: 'reports/external-pine-corpus-v2.report.json', report: v2Report as unknown as ExternalCorpusReport },
    ]);

    expect(closureCutoverGate.schemaVersion).toBe(CLOSURE_CUTOVER_GATE_SCHEMA_VERSION);
    expect(closureCutoverGate).toEqual(expected);
    expect(closureCutoverGate.corpora.map((corpus) => ({
      corpus: corpus.corpus,
      dominated: corpus.dominated.count,
      exceptions: corpus.dominated.exceptions.length,
      corroboratedGain: corpus.corroboratedGain.count,
      uncorroborated: corpus.uncorroboratedClosureOutput.count,
      errorBacked: corpus.errorBackedClosureOutput.count,
    }))).toEqual([
      { corpus: 'v1', dominated: 157, exceptions: 0, corroboratedGain: 16, uncorroborated: 0, errorBacked: 0 },
      { corpus: 'v2', dominated: 89, exceptions: 0, corroboratedGain: 3, uncorroborated: 0, errorBacked: 1 },
    ]);
  });

  it('pins the real-script realtime replay over the historical cutover cohort', () => {
    expect(realtimeCorpusReport.schemaVersion).toBe(EXTERNAL_PINE_CORPUS_REALTIME_REPORT_SCHEMA_VERSION);
    expect(realtimeCorpusReport.sourceGateReport).toBe('reports/closure-cutover-gate.report.json');
    expect(realtimeCorpusReport.scope).toBe(
      'All scripts from each closure cutover dominated set: compiled produced visible historical output and closure matches compiled.',
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
        dominatedScripts: 157,
        realtimeEventsPerScript: 37,
        matchedScripts: 157,
        mismatchedScripts: 0,
        failedScripts: 0,
        matchedComparisons: 17427,
        mismatchedComparisons: 0,
        mismatchKinds: {},
      },
      {
        corpus: 'v2',
        dominatedScripts: 89,
        realtimeEventsPerScript: 37,
        matchedScripts: 89,
        mismatchedScripts: 0,
        failedScripts: 0,
        matchedComparisons: 9879,
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

  it('pins the realtime event-cost profile shape and reconstruction ratios', () => {
    expect(realtimeEventCostProfile.schemaVersion).toBe(1);
    expect(realtimeEventCostProfile.measurement.eventModel).toContain('interpreter measures TealscriptEngine.updateBar');
    expect(realtimeEventCostProfile.measurement.reconstructionToIncrementalRatio).toContain('same-time replacement');
    expect(realtimeEventCostProfile.subjects.map((subject) => ({
      label: subject.label,
      localPath: subject.localPath,
      bars: subject.barCounts.map((point) => point.bars),
    }))).toEqual([
      {
        label: 'v1 control',
        localPath: 'sources/0002__ADWilkinson__pinescript-indicators.pine',
        bars: [160, 1000, 5000],
      },
      {
        label: 'v1 slow early block',
        localPath: 'sources/0033__ArunKBhaskar__PineScript.txt',
        bars: [160, 1000, 5000],
      },
      {
        label: 'v1 alert-heavy slow row',
        localPath: 'sources/0072__gocaman__Indicators.txt',
        bars: [160, 1000, 5000],
      },
    ]);
    expect(realtimeEventCostProfile.summary.map((entry) => ({
      label: entry.label,
      worstReplaceBackend: entry.worstReplaceBackend,
      reconstructionToIncrementalReplaceRatioAtMaxBars: entry.reconstructionToIncrementalReplaceRatioAtMaxBars,
    }))).toEqual([
      {
        label: 'v1 control',
        worstReplaceBackend: 'compiled',
        reconstructionToIncrementalReplaceRatioAtMaxBars: { compiled: 76.65, closure: 358.07 },
      },
      {
        label: 'v1 slow early block',
        worstReplaceBackend: 'closure',
        reconstructionToIncrementalReplaceRatioAtMaxBars: { compiled: 57.62, closure: 339.28 },
      },
      {
        label: 'v1 alert-heavy slow row',
        worstReplaceBackend: 'closure',
        reconstructionToIncrementalReplaceRatioAtMaxBars: { compiled: 0.42, closure: 3.55 },
      },
    ]);
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
        strategies: 12,
        activeStrategies: 5,
        matchedScripts: 12,
        mismatchedScripts: 0,
        failedScripts: 0,
        matchedComparisons: 1332,
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
        matchedComparisons: 444,
        mismatchedComparisons: 0,
        mismatchKinds: {},
      },
    ]);
  });
});
