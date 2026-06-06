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
    expect(compatibilityCheckpointLedger.entries).toHaveLength(60);
    expect(run.summary.total).toBe(60);
    expect(run.summary.passed).toBe(60);
    expect(run.summary.failed).toBe(0);
    expect(run.summary.validationErrors).toEqual({});
    expect(run.summary.byFeatureTag).toMatchObject({
      inputs: { total: 2, passed: 2, failed: 0 },
      request: { total: 12, passed: 12, failed: 0 },
      runtime: { total: 2, passed: 2, failed: 0 },
      sessions: { total: 3, passed: 3, failed: 0 },
      strategy: { total: 19, passed: 19, failed: 0 },
      time: { total: 2, passed: 2, failed: 0 },
      timeframes: { total: 1, passed: 1, failed: 0 },
      ticker: { total: 2, passed: 2, failed: 0 },
      trailing_stop: { total: 2, passed: 2, failed: 0 },
      visuals: { total: 14, passed: 14, failed: 0 },
      alerts: { total: 3, passed: 3, failed: 0 },
      brackets: { total: 1, passed: 1, failed: 0 },
      boxes: { total: 1, passed: 1, failed: 0 },
      candles: { total: 1, passed: 1, failed: 0 },
      channels: { total: 1, passed: 1, failed: 0 },
      currency: { total: 1, passed: 1, failed: 0 },
      dashboard: { total: 2, passed: 2, failed: 0 },
      corporate_actions: { total: 1, passed: 1, failed: 0 },
      dividends: { total: 1, passed: 1, failed: 0 },
      drawings: { total: 3, passed: 3, failed: 0 },
      economic: { total: 1, passed: 1, failed: 0 },
      earnings: { total: 1, passed: 1, failed: 0 },
      financial: { total: 1, passed: 1, failed: 0 },
      fills: { total: 6, passed: 6, failed: 0 },
      imports: { total: 7, passed: 7, failed: 0 },
      libraries: { total: 7, passed: 7, failed: 0 },
      linefills: { total: 1, passed: 1, failed: 0 },
      layout: { total: 1, passed: 1, failed: 0 },
      methods: { total: 2, passed: 2, failed: 0 },
      multi_symbol: { total: 1, passed: 1, failed: 0 },
      objects: { total: 2, passed: 2, failed: 0 },
      performance: { total: 1, passed: 1, failed: 0 },
      polylines: { total: 1, passed: 1, failed: 0 },
      risk: { total: 5, passed: 5, failed: 0 },
      screener: { total: 1, passed: 1, failed: 0 },
      seed: { total: 1, passed: 1, failed: 0 },
      splits: { total: 1, passed: 1, failed: 0 },
      heikin_ashi: { total: 3, passed: 3, failed: 0 },
      markers: { total: 3, passed: 3, failed: 0 },
      signals: { total: 13, passed: 13, failed: 0 },
      source_identity: { total: 6, passed: 6, failed: 0 },
      state: { total: 3, passed: 3, failed: 0 },
      tables: { total: 4, passed: 4, failed: 0 },
      udf: { total: 7, passed: 7, failed: 0 },
      udt: { total: 2, passed: 2, failed: 0 },
      volatility: { total: 1, passed: 1, failed: 0 },
      zigzag: { total: 1, passed: 1, failed: 0 },
      zones: { total: 1, passed: 1, failed: 0 },
    });
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('public-mtf-trend-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('public-marker-signal-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('public-volatility-band-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('public-dashboard-table-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('public-screener-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('public-currency-conversion-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('public-earnings-event-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('public-corporate-actions-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('public-financial-dashboard-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('public-economic-macro-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('public-seed-dataset-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('public-library-helper-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('public-library-source-helper-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('public-library-block-source-helper-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('public-library-block-switch-source-helper-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('public-library-arithmetic-source-helper-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('public-object-method-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('public-udt-state-layout-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('public-session-state-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('public-drawing-zone-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('public-linefill-channel-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('public-zigzag-polyline-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('public-strategy-bracket-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('public-strategy-trailing-stop-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('public-strategy-stats-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('official-bar-magnifier-recalculate-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('official-max-position-risk-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('official-intraday-filled-orders-risk-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('official-consecutive-loss-days-risk-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('official-intraday-loss-risk-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('official-max-drawdown-risk-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('public-alert-signal-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('public-custom-candle-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('public-synthetic-ticker-checkpoint');
  });

  it('renders a stable checkpoint corpus report', () => {
    const markdown = formatPineCompatibilityCorpusMarkdown(runPineCompatibilityCorpus(compatibilityCheckpointCorpus));

    expect(markdown).toContain('Total: 60');
    expect(markdown).toContain('Pass rate: 100.0%');
    expect(markdown).toContain('| inputs | 2 | 2 | 0 |');
    expect(markdown).toContain('| runtime | 2 | 2 | 0 |');
    expect(markdown).toContain('| sessions | 3 | 3 | 0 |');
    expect(markdown).toContain('| strategy | 19 | 19 | 0 |');
    expect(markdown).toContain('| time | 2 | 2 | 0 |');
    expect(markdown).toContain('| timeframes | 1 | 1 | 0 |');
    expect(markdown).toContain('| request | 12 | 12 | 0 |');
    expect(markdown).toContain('| alerts | 3 | 3 | 0 |');
    expect(markdown).toContain('| brackets | 1 | 1 | 0 |');
    expect(markdown).toContain('| boxes | 1 | 1 | 0 |');
    expect(markdown).toContain('| candles | 1 | 1 | 0 |');
    expect(markdown).toContain('| channels | 1 | 1 | 0 |');
    expect(markdown).toContain('| currency | 1 | 1 | 0 |');
    expect(markdown).toContain('| dashboard | 2 | 2 | 0 |');
    expect(markdown).toContain('| corporate_actions | 1 | 1 | 0 |');
    expect(markdown).toContain('| dividends | 1 | 1 | 0 |');
    expect(markdown).toContain('| drawings | 3 | 3 | 0 |');
    expect(markdown).toContain('| economic | 1 | 1 | 0 |');
    expect(markdown).toContain('| earnings | 1 | 1 | 0 |');
    expect(markdown).toContain('| financial | 1 | 1 | 0 |');
    expect(markdown).toContain('| fills | 6 | 6 | 0 |');
    expect(markdown).toContain('| imports | 7 | 7 | 0 |');
    expect(markdown).toContain('| libraries | 7 | 7 | 0 |');
    expect(markdown).toContain('| linefills | 1 | 1 | 0 |');
    expect(markdown).toContain('| layout | 1 | 1 | 0 |');
    expect(markdown).toContain('| methods | 2 | 2 | 0 |');
    expect(markdown).toContain('| objects | 2 | 2 | 0 |');
    expect(markdown).toContain('| performance | 1 | 1 | 0 |');
    expect(markdown).toContain('| polylines | 1 | 1 | 0 |');
    expect(markdown).toContain('| risk | 5 | 5 | 0 |');
    expect(markdown).toContain('| screener | 1 | 1 | 0 |');
    expect(markdown).toContain('| seed | 1 | 1 | 0 |');
    expect(markdown).toContain('| splits | 1 | 1 | 0 |');
    expect(markdown).toContain('| heikin_ashi | 3 | 3 | 0 |');
    expect(markdown).toContain('| markers | 3 | 3 | 0 |');
    expect(markdown).toContain('| signals | 13 | 13 | 0 |');
    expect(markdown).toContain('| source_identity | 6 | 6 | 0 |');
    expect(markdown).toContain('| state | 3 | 3 | 0 |');
    expect(markdown).toContain('| tables | 4 | 4 | 0 |');
    expect(markdown).toContain('| ticker | 2 | 2 | 0 |');
    expect(markdown).toContain('| trailing_stop | 2 | 2 | 0 |');
    expect(markdown).toContain('| udt | 2 | 2 | 0 |');
    expect(markdown).toContain('| volatility | 1 | 1 | 0 |');
    expect(markdown).toContain('| zigzag | 1 | 1 | 0 |');
    expect(markdown).toContain('| zones | 1 | 1 | 0 |');
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

    expect(run.summary.total).toBe(60);
    expect(run.summary.passed).toBe(60);
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
      total: 60,
      byCategory: { indicator: 41, strategy: 19 },
      bySourceKind: { official_docs: 28, public_script: 32 },
      byPineVersion: { v6: 60 },
      byStoragePolicy: { reduced_fixture_only: 60 },
    });
    expect(index.byFeatureTag).toMatchObject({
      inputs: 2,
      request: 12,
      runtime: 2,
      sessions: 3,
      strategy: 19,
      time: 2,
      timeframes: 1,
      ticker: 2,
      trailing_stop: 2,
      visuals: 14,
      alerts: 3,
      brackets: 1,
      boxes: 1,
      candles: 1,
      channels: 1,
      currency: 1,
      dashboard: 2,
      corporate_actions: 1,
      dividends: 1,
      drawings: 3,
      economic: 1,
      earnings: 1,
      financial: 1,
      fills: 6,
      imports: 7,
      libraries: 7,
      linefills: 1,
      layout: 1,
      methods: 2,
      multi_symbol: 1,
      objects: 2,
      performance: 1,
      polylines: 1,
      risk: 5,
      screener: 1,
      seed: 1,
      splits: 1,
      heikin_ashi: 3,
      markers: 3,
      signals: 13,
      source_identity: 6,
      state: 3,
      tables: 4,
      udf: 7,
      udt: 2,
      volatility: 1,
      zigzag: 1,
      zones: 1,
    });
    expect(markdown).toContain('# Pine Compatibility Coverage');
    expect(markdown).toContain('Total checkpoints: 60');
    expect(markdown).toContain('| official_docs | 28 |');
    expect(markdown).toContain('| public_script | 32 |');
    expect(markdown).toContain('| reduced_fixture_only | 60 |');
    expect(formatPineCompatibilityCoverageJson(index)).toContain('"total": 60');
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

      expect(readFileSync(join(outDir, 'pine-compatibility-corpus.json'), 'utf8')).toContain('"passed": 60');
      expect(readFileSync(join(outDir, 'pine-compatibility-corpus.md'), 'utf8')).toContain('Pass rate: 100.0%');
      expect(readFileSync(join(outDir, 'pine-compatibility-coverage.json'), 'utf8')).toContain('"total": 60');
      expect(readFileSync(join(outDir, 'pine-compatibility-coverage.md'), 'utf8')).toContain('Total checkpoints: 60');
    } finally {
      rmSync(outDir, { recursive: true, force: true });
    }
  });
});

function resolveCorpusStages(stages: PineCompatibilityCorpusStages): CompatibilityStageOutcome[] {
  return typeof stages === 'function' ? stages() : stages;
}
