import { describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

import {
  createPineCompatibilityCoverageIndex,
  createPineParseSemanticStageOutcomes,
  formatPineCompatibilityCoverageJson,
  formatPineCompatibilityCoverageMarkdown,
  formatPineCompatibilityCorpusJson,
  formatPineCompatibilityCorpusMarkdown,
  parse,
  runPineCompatibilityCorpus,
  runPineCompatibilityLedger,
  validatePineScriptLedger,
  type CompatibilityStageOutcome,
  type PineCompatibilityCorpusStages,
} from '../../src';
import { compatibilityCheckpointCorpus, compatibilityCheckpointLedger } from './pine-ledger';

describe('Pine compatibility checkpoint corpus', () => {
  it('keeps source-linked reduced checkpoints in the offline corpus', () => {
    const run = runPineCompatibilityCorpus(compatibilityCheckpointCorpus);

    expect(validatePineScriptLedger(compatibilityCheckpointLedger)).toEqual({});
    expect(compatibilityCheckpointLedger.entries).toHaveLength(78);
    expect(run.summary.total).toBe(78);
    expect(run.summary.passed).toBe(77);
    expect(run.summary.failed).toBe(1);
    expect(run.summary.byFirstFailureStage).toEqual({ semantic: 1 });
    expect(run.summary.byFirstFailureClass).toEqual({ unsupported_planned: 1 });
    expect(run.summary.validationErrors).toEqual({});
    expect(run.summary.byFeatureTag).toMatchObject({
      inputs: { total: 3, passed: 3, failed: 0 },
      request: { total: 13, passed: 12, failed: 1 },
      runtime: { total: 3, passed: 3, failed: 0 },
      sessions: { total: 3, passed: 3, failed: 0 },
      strategy: { total: 21, passed: 21, failed: 0 },
      time: { total: 2, passed: 2, failed: 0 },
      timeframes: { total: 1, passed: 1, failed: 0 },
      ticker: { total: 2, passed: 2, failed: 0 },
      trailing_stop: { total: 2, passed: 2, failed: 0 },
      visuals: { total: 20, passed: 20, failed: 0 },
      alerts: { total: 3, passed: 3, failed: 0 },
      arrays: { total: 5, passed: 5, failed: 0 },
      brackets: { total: 1, passed: 1, failed: 0 },
      boxes: { total: 3, passed: 3, failed: 0 },
      box_setters: { total: 1, passed: 1, failed: 0 },
      candles: { total: 1, passed: 1, failed: 0 },
      channels: { total: 1, passed: 1, failed: 0 },
      currency: { total: 1, passed: 1, failed: 0 },
      custom_bars: { total: 1, passed: 1, failed: 0 },
      dashboard: { total: 7, passed: 7, failed: 0 },
      corporate_actions: { total: 1, passed: 1, failed: 0 },
      dividends: { total: 1, passed: 1, failed: 0 },
      drawings: { total: 7, passed: 7, failed: 0 },
      economic: { total: 1, passed: 1, failed: 0 },
      earnings: { total: 1, passed: 1, failed: 0 },
      financial: { total: 1, passed: 1, failed: 0 },
      fills: { total: 6, passed: 6, failed: 0 },
      footprint: { total: 1, passed: 0, failed: 1 },
      imports: { total: 7, passed: 7, failed: 0 },
      libraries: { total: 7, passed: 7, failed: 0 },
      labels: { total: 2, passed: 2, failed: 0 },
      linefills: { total: 1, passed: 1, failed: 0 },
      lines: { total: 2, passed: 2, failed: 0 },
      logs: { total: 1, passed: 1, failed: 0 },
      layout: { total: 1, passed: 1, failed: 0 },
      map: { total: 1, passed: 1, failed: 0 },
      matrix: { total: 1, passed: 1, failed: 0 },
      methods: { total: 3, passed: 3, failed: 0 },
      multi_symbol: { total: 1, passed: 1, failed: 0 },
      objects: { total: 4, passed: 4, failed: 0 },
      performance: { total: 3, passed: 3, failed: 0 },
      polylines: { total: 1, passed: 1, failed: 0 },
      risk: { total: 5, passed: 5, failed: 0 },
      screener: { total: 1, passed: 1, failed: 0 },
      seed: { total: 1, passed: 1, failed: 0 },
      splits: { total: 1, passed: 1, failed: 0 },
      heikin_ashi: { total: 3, passed: 3, failed: 0 },
      intrabar: { total: 4, passed: 3, failed: 1 },
      markers: { total: 3, passed: 3, failed: 0 },
      realtime: { total: 2, passed: 2, failed: 0 },
      signals: { total: 22, passed: 22, failed: 0 },
      source_identity: { total: 6, passed: 6, failed: 0 },
      state: { total: 5, passed: 5, failed: 0 },
      syminfo: { total: 1, passed: 1, failed: 0 },
      tables: { total: 11, passed: 11, failed: 0 },
      table_setters: { total: 1, passed: 1, failed: 0 },
      udf: { total: 7, passed: 7, failed: 0 },
      udt: { total: 3, passed: 3, failed: 0 },
      unsupported: { total: 1, passed: 0, failed: 1 },
      varip: { total: 1, passed: 1, failed: 0 },
      trade_accessors: { total: 2, passed: 2, failed: 0 },
      open_trades: { total: 1, passed: 1, failed: 0 },
      volatility: { total: 1, passed: 1, failed: 0 },
      zigzag: { total: 1, passed: 1, failed: 0 },
      zones: { total: 2, passed: 2, failed: 0 },
    });
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('public-mtf-trend-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('public-input-configuration-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('public-syminfo-metadata-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('public-varip-array-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('public-marker-signal-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('public-label-signal-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('public-line-signal-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('public-volatility-band-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('public-dashboard-table-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('public-table-setter-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('public-matrix-scoreboard-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('public-map-signal-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('public-array-signal-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('public-screener-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('public-currency-conversion-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('public-earnings-event-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('public-corporate-actions-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('public-financial-dashboard-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('public-economic-macro-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('public-seed-dataset-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('public-footprint-request-diagnostic-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('public-library-helper-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('public-library-source-helper-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('public-library-block-source-helper-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('public-library-block-switch-source-helper-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('public-library-arithmetic-source-helper-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('public-object-method-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('public-udt-state-layout-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('public-udt-array-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('public-session-state-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('public-drawing-zone-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('public-box-zone-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('public-drawing-copy-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('public-linefill-channel-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('public-zigzag-polyline-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('public-strategy-bracket-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('public-strategy-trailing-stop-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('public-strategy-stats-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('public-strategy-trade-list-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('public-strategy-open-trade-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('official-bar-magnifier-recalculate-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('official-max-position-risk-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('official-intraday-filled-orders-risk-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('official-consecutive-loss-days-risk-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('official-intraday-loss-risk-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('official-max-drawdown-risk-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('public-alert-signal-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('public-log-signal-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('public-runtime-error-guard-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('public-custom-candle-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('public-custom-bar-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('public-synthetic-ticker-checkpoint');
  });

  it('renders a stable checkpoint corpus report', () => {
    const markdown = formatPineCompatibilityCorpusMarkdown(runPineCompatibilityCorpus(compatibilityCheckpointCorpus));

    expect(markdown).toContain('Total: 78');
    expect(markdown).toContain('Passed: 77');
    expect(markdown).toContain('Failed: 1');
    expect(markdown).toContain('Pass rate: 98.7%');
    expect(markdown).toContain('| semantic | 1 |');
    expect(markdown).toContain('| unsupported_planned | 1 |');
    expect(markdown).toContain('| inputs | 3 | 3 | 0 |');
    expect(markdown).toContain('| runtime | 3 | 3 | 0 |');
    expect(markdown).toContain('| sessions | 3 | 3 | 0 |');
    expect(markdown).toContain('| strategy | 21 | 21 | 0 |');
    expect(markdown).toContain('| time | 2 | 2 | 0 |');
    expect(markdown).toContain('| timeframes | 1 | 1 | 0 |');
    expect(markdown).toContain('| request | 13 | 12 | 1 |');
    expect(markdown).toContain('| alerts | 3 | 3 | 0 |');
    expect(markdown).toContain('| arrays | 5 | 5 | 0 |');
    expect(markdown).toContain('| brackets | 1 | 1 | 0 |');
    expect(markdown).toContain('| boxes | 3 | 3 | 0 |');
    expect(markdown).toContain('| box_setters | 1 | 1 | 0 |');
    expect(markdown).toContain('| candles | 1 | 1 | 0 |');
    expect(markdown).toContain('| channels | 1 | 1 | 0 |');
    expect(markdown).toContain('| currency | 1 | 1 | 0 |');
    expect(markdown).toContain('| custom_bars | 1 | 1 | 0 |');
    expect(markdown).toContain('| dashboard | 7 | 7 | 0 |');
    expect(markdown).toContain('| corporate_actions | 1 | 1 | 0 |');
    expect(markdown).toContain('| dividends | 1 | 1 | 0 |');
    expect(markdown).toContain('| drawings | 7 | 7 | 0 |');
    expect(markdown).toContain('| economic | 1 | 1 | 0 |');
    expect(markdown).toContain('| earnings | 1 | 1 | 0 |');
    expect(markdown).toContain('| financial | 1 | 1 | 0 |');
    expect(markdown).toContain('| fills | 6 | 6 | 0 |');
    expect(markdown).toContain('| footprint | 1 | 0 | 1 |');
    expect(markdown).toContain('| imports | 7 | 7 | 0 |');
    expect(markdown).toContain('| libraries | 7 | 7 | 0 |');
    expect(markdown).toContain('| labels | 2 | 2 | 0 |');
    expect(markdown).toContain('| linefills | 1 | 1 | 0 |');
    expect(markdown).toContain('| lines | 2 | 2 | 0 |');
    expect(markdown).toContain('| logs | 1 | 1 | 0 |');
    expect(markdown).toContain('| layout | 1 | 1 | 0 |');
    expect(markdown).toContain('| map | 1 | 1 | 0 |');
    expect(markdown).toContain('| matrix | 1 | 1 | 0 |');
    expect(markdown).toContain('| methods | 3 | 3 | 0 |');
    expect(markdown).toContain('| objects | 4 | 4 | 0 |');
    expect(markdown).toContain('| performance | 3 | 3 | 0 |');
    expect(markdown).toContain('| polylines | 1 | 1 | 0 |');
    expect(markdown).toContain('| risk | 5 | 5 | 0 |');
    expect(markdown).toContain('| screener | 1 | 1 | 0 |');
    expect(markdown).toContain('| seed | 1 | 1 | 0 |');
    expect(markdown).toContain('| splits | 1 | 1 | 0 |');
    expect(markdown).toContain('| heikin_ashi | 3 | 3 | 0 |');
    expect(markdown).toContain('| intrabar | 4 | 3 | 1 |');
    expect(markdown).toContain('| markers | 3 | 3 | 0 |');
    expect(markdown).toContain('| realtime | 2 | 2 | 0 |');
    expect(markdown).toContain('| signals | 22 | 22 | 0 |');
    expect(markdown).toContain('| source_identity | 6 | 6 | 0 |');
    expect(markdown).toContain('| state | 5 | 5 | 0 |');
    expect(markdown).toContain('| syminfo | 1 | 1 | 0 |');
    expect(markdown).toContain('| tables | 11 | 11 | 0 |');
    expect(markdown).toContain('| table_setters | 1 | 1 | 0 |');
    expect(markdown).toContain('| ticker | 2 | 2 | 0 |');
    expect(markdown).toContain('| trailing_stop | 2 | 2 | 0 |');
    expect(markdown).toContain('| trade_accessors | 2 | 2 | 0 |');
    expect(markdown).toContain('| open_trades | 1 | 1 | 0 |');
    expect(markdown).toContain('| udt | 3 | 3 | 0 |');
    expect(markdown).toContain('| unsupported | 1 | 0 | 1 |');
    expect(markdown).toContain('| varip | 1 | 1 | 0 |');
    expect(markdown).toContain('| visuals | 20 | 20 | 0 |');
    expect(markdown).toContain('| volatility | 1 | 1 | 0 |');
    expect(markdown).toContain('| zigzag | 1 | 1 | 0 |');
    expect(markdown).toContain('| zones | 2 | 2 | 0 |');
    expect(markdown).not.toContain('Validation Errors');
  });

  it('runs checkpoint ledgers through the offline corpus runner', () => {
    const stagesById = new Map(compatibilityCheckpointCorpus.map((corpusCase) => [
      corpusCase.ledgerEntry.id,
      resolveCorpusStages(corpusCase.stages),
    ]));
    const run = runPineCompatibilityLedger(
      compatibilityCheckpointLedger,
      (entry) => stagesById.get(entry.id) ?? [{ stage: 'parse', status: 'not_run' }],
    );
    const json = formatPineCompatibilityCorpusJson(run);

    expect(run.summary.total).toBe(78);
    expect(run.summary.passed).toBe(77);
    expect(run.summary.failed).toBe(1);
    expect(run.summary.validationErrors).toEqual({});
    expect(json).toContain('"schemaVersion": 1');
    expect(json).toContain('"scriptId": "official-builtins-checkpoint"');
    expect(json.endsWith('\n')).toBe(true);
  });

  it('accepts deterministic stage factories for source-backed semantic checkpoints', () => {
    const library = parse(`
library("SignalKit", true)
export fast(series float source, simple int length) => ta.sma(source, length)
`);
    const run = runPineCompatibilityCorpus([
      {
        ledgerEntry: {
          id: 'public-library-helper-stage-factory-checkpoint',
          title: 'Public Library Helper Stage Factory Checkpoint',
          pineVersion: 'v6',
          category: 'indicator',
          source: {
            kind: 'public_script',
            searchContext: 'TradingView public scripts search: library helper',
            retrievedAt: '2026-06-02',
            licenseStatus: 'unknown',
          },
          featureTags: ['libraries', 'imports', 'udf', 'signals'],
          storagePolicy: 'reduced_fixture_only',
        },
        stages: () => [
          ...createPineParseSemanticStageOutcomes(`
indicator("Public Library Helper Registry Checkpoint")
import TestUser/SignalKit/1 as signals
plot(signals.fast(close, 2), title="Fast")
`, {
            libraries: new Map([['TestUser/SignalKit/1', library]]),
          }),
          {
            stage: 'runtime',
            status: 'skipped',
            message: 'semantic registry checkpoint; runtime binding is covered by pine-language fixtures',
          },
          { stage: 'datafeed', status: 'skipped', message: 'semantic registry checkpoint' },
          { stage: 'output', status: 'skipped', message: 'semantic registry checkpoint' },
          { stage: 'render', status: 'skipped', message: 'semantic registry checkpoint' },
        ],
      },
    ]);

    expect(run.outcomes[0]?.summary).toEqual({ passed: true });
    expect(run.outcomes[0]?.stages).toMatchObject([
      { stage: 'parse', status: 'passed' },
      { stage: 'semantic', status: 'passed' },
      { stage: 'runtime', status: 'skipped' },
      { stage: 'datafeed', status: 'skipped' },
      { stage: 'output', status: 'skipped' },
      { stage: 'render', status: 'skipped' },
    ]);
    expect(run.summary.byFeatureTag).toMatchObject({
      imports: { total: 1, passed: 1, failed: 0 },
      libraries: { total: 1, passed: 1, failed: 0 },
    });
  });

  it('counts not-run stages as incomplete compatibility outcomes', () => {
    const entry = compatibilityCheckpointLedger.entries[0]!;
    const run = runPineCompatibilityCorpus([
      {
        ledgerEntry: entry,
        stages: [{ stage: 'parse', status: 'passed' }],
      },
    ]);

    expect(run.outcomes[0]?.summary).toEqual({
      passed: false,
      firstFailureStage: 'semantic',
    });
    expect(run.summary).toMatchObject({
      total: 1,
      passed: 0,
      failed: 1,
      byFirstFailureStage: { semantic: 1 },
    });
    expect(run.summary.byFeatureTag).toMatchObject({
      builtins: { total: 1, passed: 0, failed: 1 },
    });
  });

  it('treats explicitly skipped stages as pass-neutral compatibility outcomes', () => {
    const entry = compatibilityCheckpointLedger.entries[0]!;
    const run = runPineCompatibilityCorpus([
      {
        ledgerEntry: entry,
        stages: [
          { stage: 'parse', status: 'passed' },
          { stage: 'semantic', status: 'passed' },
          { stage: 'runtime', status: 'passed' },
          { stage: 'datafeed', status: 'skipped', message: 'deterministic local fixture' },
          { stage: 'output', status: 'passed' },
          { stage: 'render', status: 'skipped', message: 'manual visual comparison' },
        ],
      },
    ]);
    const markdown = formatPineCompatibilityCorpusMarkdown(run);

    expect(run.outcomes[0]?.summary).toEqual({ passed: true });
    expect(run.summary).toMatchObject({
      total: 1,
      passed: 1,
      failed: 0,
      byFirstFailureStage: {},
      byFirstFailureClass: {},
    });
    expect(run.summary.byFeatureTag).toMatchObject({
      builtins: { total: 1, passed: 1, failed: 0 },
    });
    expect(markdown).toContain('Pass rate: 100.0%');
    expect(markdown).toContain('## First Failure Stages\n- None\n\n## First Failure Classes\n- None');
  });

  it('builds a checkpoint coverage index from intake metadata', () => {
    const index = createPineCompatibilityCoverageIndex(compatibilityCheckpointLedger);
    const markdown = formatPineCompatibilityCoverageMarkdown(index);

    expect(index).toMatchObject({
      schemaVersion: 1,
      total: 78,
      byCategory: { indicator: 57, strategy: 21 },
      bySourceKind: { official_docs: 28, public_script: 50 },
      byPineVersion: { v6: 78 },
      byStoragePolicy: { reduced_fixture_only: 78 },
    });
    expect(index.byFeatureTag).toMatchObject({
      inputs: 3,
      request: 13,
      runtime: 3,
      sessions: 3,
      strategy: 21,
      time: 2,
      timeframes: 1,
      ticker: 2,
      trailing_stop: 2,
      visuals: 20,
      alerts: 3,
      arrays: 5,
      brackets: 1,
      boxes: 3,
      box_setters: 1,
      candles: 1,
      channels: 1,
      currency: 1,
      custom_bars: 1,
      dashboard: 7,
      corporate_actions: 1,
      dividends: 1,
      drawings: 7,
      economic: 1,
      earnings: 1,
      financial: 1,
      footprint: 1,
      fills: 6,
      imports: 7,
      libraries: 7,
      labels: 2,
      linefills: 1,
      lines: 2,
      logs: 1,
      layout: 1,
      map: 1,
      matrix: 1,
      methods: 3,
      multi_symbol: 1,
      objects: 4,
      performance: 3,
      polylines: 1,
      risk: 5,
      screener: 1,
      seed: 1,
      splits: 1,
      heikin_ashi: 3,
      intrabar: 4,
      markers: 3,
      realtime: 2,
      signals: 22,
      source_identity: 6,
      state: 5,
      syminfo: 1,
      tables: 11,
      table_setters: 1,
      trade_accessors: 2,
      open_trades: 1,
      udf: 7,
      udt: 3,
      unsupported: 1,
      varip: 1,
      volatility: 1,
      zigzag: 1,
      zones: 2,
    });
    expect(markdown).toContain('# Pine Compatibility Coverage');
    expect(markdown).toContain('Total checkpoints: 78');
    expect(markdown).toContain('| official_docs | 28 |');
    expect(markdown).toContain('| public_script | 50 |');
    expect(markdown).toContain('| reduced_fixture_only | 78 |');
    expect(formatPineCompatibilityCoverageJson(index)).toContain('"total": 78');
  });

  it('generates deterministic dashboard artifacts for CI', () => {
    const outDir = mkdtempSync(join(tmpdir(), 'pine-compat-dashboard-'));
    try {
      execFileSync(process.execPath, [
        '--experimental-strip-types',
        resolve(__dirname, '..', '..', 'scripts', 'generate-pine-compatibility-dashboard.ts'),
        '--outDir',
        outDir,
      ], {
        cwd: resolve(__dirname, '..', '..'),
        encoding: 'utf8',
        stdio: 'pipe',
      });

      expect(readFileSync(join(outDir, 'pine-compatibility-corpus.json'), 'utf8')).toContain('"passed": 77');
      expect(readFileSync(join(outDir, 'pine-compatibility-corpus.md'), 'utf8')).toContain('Pass rate: 98.7%');
      expect(readFileSync(join(outDir, 'pine-compatibility-coverage.json'), 'utf8')).toContain('"total": 78');
      expect(readFileSync(join(outDir, 'pine-compatibility-coverage.md'), 'utf8')).toContain('Total checkpoints: 78');
    } finally {
      rmSync(outDir, { recursive: true, force: true });
    }
  });
});

function resolveCorpusStages(stages: PineCompatibilityCorpusStages): CompatibilityStageOutcome[] {
  return typeof stages === 'function' ? stages() : stages;
}
