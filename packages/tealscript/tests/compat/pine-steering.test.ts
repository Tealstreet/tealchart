import { describe, expect, it } from 'vitest';

import {
  compatibilityFailureClasses,
  compatibilityStages,
  createCompatibilityRunOutcome,
  PINE_COMPATIBILITY_SCHEMA_VERSION,
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
});
