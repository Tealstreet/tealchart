import { describe, expect, it } from 'vitest';

import {
  compatibilityFailureClasses,
  compatibilityStages,
  createCompatibilityRunOutcome,
  formatPineCompatibilityCorpusMarkdown,
  PINE_COMPATIBILITY_SCHEMA_VERSION,
  runPineCompatibilityCorpus,
  summarizeCompatibilityOutcome,
  validateCompatibilityStageOutcome,
  validatePineScriptLedgerEntry,
  type CompatibilityStageOutcome,
  type PineScriptLedgerEntry,
} from '../../src';

describe('Pine compatibility steering model', () => {
  it('defines stable stages and failure classes for corpus reporting', () => {
    expect(compatibilityStages).toEqual([
      'parse',
      'semantic',
      'runtime',
      'datafeed',
      'output',
      'render',
    ]);
    expect(compatibilityFailureClasses).toEqual([
      'parse_gap',
      'semantic_gap',
      'unsupported_planned',
      'runtime_gap',
      'data_gap',
      'output_gap',
      'render_gap',
      'oracle_gap',
      'licensing_blocked',
    ]);
  });

  it('summarizes the first failed compatibility stage', () => {
    const stages: CompatibilityStageOutcome[] = [
      { stage: 'parse', status: 'passed' },
      { stage: 'semantic', status: 'passed' },
      {
        stage: 'runtime',
        status: 'failed',
        failureClass: 'runtime_gap',
        diagnostics: [{ code: 'runtime.unknown_identifier', message: 'Unknown identifier: ta.foo' }],
      },
      { stage: 'output', status: 'not_run' },
    ];

    expect(summarizeCompatibilityOutcome(stages)).toEqual({
      passed: false,
      firstFailureStage: 'runtime',
      firstFailureClass: 'runtime_gap',
    });
    expect(createCompatibilityRunOutcome({ scriptId: 'public-rsi-001', pineVersion: 'v6', stages })).toEqual({
      schemaVersion: PINE_COMPATIBILITY_SCHEMA_VERSION,
      scriptId: 'public-rsi-001',
      pineVersion: 'v6',
      stages,
      summary: {
        passed: false,
        firstFailureStage: 'runtime',
        firstFailureClass: 'runtime_gap',
      },
    });
  });

  it('requires failed stages to carry failure classes', () => {
    expect(validateCompatibilityStageOutcome({ stage: 'parse', status: 'failed' })).toEqual([
      'failed stage parse must include a failureClass',
    ]);
    expect(validateCompatibilityStageOutcome({ stage: 'parse', status: 'failed', failureClass: 'parse_gap' })).toEqual([]);
  });

  it('validates real-script intake ledger storage policy', () => {
    const entry: PineScriptLedgerEntry = {
      id: 'tv-docs-bar-magnifier',
      title: 'TradingView Bar Magnifier example',
      pineVersion: 'v6',
      category: 'strategy',
      source: {
        kind: 'official_docs',
        url: 'https://www.tradingview.com/pine-script-docs/concepts/strategies/',
        retrievedAt: '2026-06-02',
        licenseStatus: 'unknown',
      },
      featureTags: ['strategy', 'bar_magnifier', 'intrabar'],
      storagePolicy: 'reduced_fixture_only',
    };

    expect(validatePineScriptLedgerEntry(entry)).toEqual([]);
    expect(validatePineScriptLedgerEntry({
      ...entry,
      storagePolicy: 'raw_allowed',
    })).toEqual([
      'ledger entry tv-docs-bar-magnifier cannot store raw source when licenseStatus is unknown',
    ]);
    expect(validatePineScriptLedgerEntry({
      ...entry,
      id: '',
      title: '',
      featureTags: [],
    })).toEqual([
      'ledger entry id must not be empty',
      'ledger entry <missing> title must not be empty',
      'ledger entry <missing> must include at least one feature tag',
    ]);
  });

  it('runs an offline compatibility corpus and summarizes failures', () => {
    const passingEntry = createLedgerEntry({
      id: 'manual-sma-pass',
      featureTags: ['ta', 'plot'],
    });
    const runtimeGapEntry = createLedgerEntry({
      id: 'tv-public-request-gap',
      featureTags: ['request', 'timeframe'],
      source: {
        kind: 'public_script',
        searchContext: 'Public TradingView examples using request.security_lower_tf',
        licenseStatus: 'unknown',
      },
    });

    const run = runPineCompatibilityCorpus([
      {
        ledgerEntry: passingEntry,
        stages: [
          { stage: 'parse', status: 'passed' },
          { stage: 'semantic', status: 'passed' },
          { stage: 'runtime', status: 'passed' },
        ],
      },
      {
        ledgerEntry: runtimeGapEntry,
        stages: [
          { stage: 'parse', status: 'passed' },
          { stage: 'semantic', status: 'passed' },
          { stage: 'runtime', status: 'failed', failureClass: 'runtime_gap', message: 'request.security_lower_tf gap' },
          { stage: 'output', status: 'not_run' },
        ],
      },
    ]);

    expect(run.schemaVersion).toBe(PINE_COMPATIBILITY_SCHEMA_VERSION);
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toEqual(['manual-sma-pass', 'tv-public-request-gap']);
    expect(run.summary).toMatchObject({
      total: 2,
      passed: 1,
      failed: 1,
      byFirstFailureStage: { runtime: 1 },
      byFirstFailureClass: { runtime_gap: 1 },
      validationErrors: {},
    });
    expect(run.summary.byFeatureTag).toEqual({
      plot: { total: 1, passed: 1, failed: 0 },
      request: { total: 1, passed: 0, failed: 1 },
      ta: { total: 1, passed: 1, failed: 0 },
      timeframe: { total: 1, passed: 0, failed: 1 },
    });
  });

  it('reports validation errors without preventing offline corpus summaries', () => {
    const invalidEntry = createLedgerEntry({
      id: '',
      featureTags: [],
      source: {
        kind: 'public_script',
        licenseStatus: 'unknown',
      },
    });

    const run = runPineCompatibilityCorpus([
      {
        ledgerEntry: invalidEntry,
        stages: [{ stage: 'parse', status: 'failed' }],
      },
    ]);

    expect(run.summary.validationErrors).toEqual({
      '<case-1>': [
        'ledger entry id must not be empty',
        'ledger entry <missing> must include at least one feature tag',
        'ledger entry <missing> source must include a url or searchContext',
        'failed stage parse must include a failureClass',
      ],
    });
    expect(run.summary.failed).toBe(1);
  });

  it('formats a deterministic markdown corpus report', () => {
    const run = runPineCompatibilityCorpus([
      {
        ledgerEntry: createLedgerEntry({ id: 'manual-sma-pass', featureTags: ['plot', 'ta'] }),
        stages: [{ stage: 'parse', status: 'passed' }],
      },
      {
        ledgerEntry: createLedgerEntry({ id: 'manual-parser-gap', featureTags: ['syntax'] }),
        stages: [{ stage: 'parse', status: 'failed', failureClass: 'parse_gap' }],
      },
    ]);

    expect(formatPineCompatibilityCorpusMarkdown(run)).toBe(`# Pine Compatibility Corpus

Schema version: 1
Total: 2
Passed: 1
Failed: 1
Pass rate: 50.0%

## First Failure Stages
| Name | Count |
| --- | ---: |
| parse | 1 |

## First Failure Classes
| Name | Count |
| --- | ---: |
| parse_gap | 1 |

## Feature Tags
| Feature | Total | Passed | Failed |
| --- | ---: | ---: | ---: |
| plot | 1 | 1 | 0 |
| syntax | 1 | 0 | 1 |
| ta | 1 | 1 | 0 |
`);
  });
});

function createLedgerEntry(overrides: Partial<PineScriptLedgerEntry>): PineScriptLedgerEntry {
  return {
    id: 'manual-fixture',
    title: 'Manual compatibility fixture',
    pineVersion: 'v6',
    category: 'indicator',
    source: { kind: 'manual_fixture', licenseStatus: 'internal_fixture' },
    featureTags: ['manual'],
    storagePolicy: 'reduced_fixture_only',
    ...overrides,
  };
}
