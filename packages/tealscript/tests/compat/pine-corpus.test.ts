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
    expect(compatibilityCheckpointLedger.entries).toHaveLength(104);
    expect(run.summary.total).toBe(104);
    expect(run.summary.passed).toBe(103);
    expect(run.summary.failed).toBe(1);
    expect(run.summary.plannedUnsupported).toBe(1);
    expect(run.summary.actionableFailed).toBe(0);
    expect(run.summary.byFirstFailureStage).toEqual({ semantic: 1 });
    expect(run.summary.byFirstFailureClass).toEqual({ unsupported_planned: 1 });
    expect(run.summary.validationErrors).toEqual({});
    expect(run.summary.byFeatureTag).toMatchObject({
      inputs: { total: 5, passed: 5, failed: 0 },
      legacy: { total: 1, passed: 1, failed: 0 },
      builtins: { total: 2, passed: 2, failed: 0 },
      request: { total: 13, passed: 12, failed: 1 },
      runtime: { total: 3, passed: 3, failed: 0 },
      sessions: { total: 4, passed: 4, failed: 0 },
      strategy: { total: 22, passed: 22, failed: 0 },
      time: { total: 3, passed: 3, failed: 0 },
      timeframes: { total: 2, passed: 2, failed: 0 },
      ticker: { total: 2, passed: 2, failed: 0 },
      trailing_stop: { total: 2, passed: 2, failed: 0 },
      trend_filter: { total: 7, passed: 7, failed: 0 },
      visuals: { total: 23, passed: 23, failed: 0 },
      alerts: { total: 3, passed: 3, failed: 0 },
      arrays: { total: 6, passed: 6, failed: 0 },
      brackets: { total: 1, passed: 1, failed: 0 },
      boxes: { total: 3, passed: 3, failed: 0 },
      box_setters: { total: 1, passed: 1, failed: 0 },
      candles: { total: 1, passed: 1, failed: 0 },
      channels: { total: 4, passed: 4, failed: 0 },
      currency: { total: 1, passed: 1, failed: 0 },
      custom_bars: { total: 1, passed: 1, failed: 0 },
      dashboard: { total: 8, passed: 8, failed: 0 },
      corporate_actions: { total: 1, passed: 1, failed: 0 },
      dividends: { total: 1, passed: 1, failed: 0 },
      drawings: { total: 7, passed: 7, failed: 0 },
      economic: { total: 1, passed: 1, failed: 0 },
      earnings: { total: 1, passed: 1, failed: 0 },
      financial: { total: 1, passed: 1, failed: 0 },
      fills: { total: 7, passed: 7, failed: 0 },
      footprint: { total: 1, passed: 0, failed: 1 },
      imports: { total: 7, passed: 7, failed: 0 },
      libraries: { total: 7, passed: 7, failed: 0 },
      labels: { total: 2, passed: 2, failed: 0 },
      linefills: { total: 1, passed: 1, failed: 0 },
      lines: { total: 2, passed: 2, failed: 0 },
      logs: { total: 1, passed: 1, failed: 0 },
      layout: { total: 3, passed: 3, failed: 0 },
      map: { total: 1, passed: 1, failed: 0 },
      matrix: { total: 1, passed: 1, failed: 0 },
      methods: { total: 3, passed: 3, failed: 0 },
      multi_symbol: { total: 1, passed: 1, failed: 0 },
      objects: { total: 4, passed: 4, failed: 0 },
      performance: { total: 3, passed: 3, failed: 0 },
      momentum: { total: 2, passed: 2, failed: 0 },
      oscillator: { total: 7, passed: 7, failed: 0 },
      plot_metadata: { total: 1, passed: 1, failed: 0 },
      polylines: { total: 1, passed: 1, failed: 0 },
      risk: { total: 5, passed: 5, failed: 0 },
      roc: { total: 1, passed: 1, failed: 0 },
      screener: { total: 1, passed: 1, failed: 0 },
      seed: { total: 1, passed: 1, failed: 0 },
      splits: { total: 1, passed: 1, failed: 0 },
      heikin_ashi: { total: 3, passed: 3, failed: 0 },
      intrabar: { total: 4, passed: 3, failed: 1 },
      markers: { total: 3, passed: 3, failed: 0 },
      realtime: { total: 2, passed: 2, failed: 0 },
      signals: { total: 46, passed: 46, failed: 0 },
      declaration_metadata: { total: 1, passed: 1, failed: 0 },
      output: { total: 35, passed: 35, failed: 0 },
      supertrend: { total: 1, passed: 1, failed: 0 },
      ta: { total: 23, passed: 23, failed: 0 },
      barssince: { total: 1, passed: 1, failed: 0 },
      valuewhen: { total: 1, passed: 1, failed: 0 },
      event_memory: { total: 1, passed: 1, failed: 0 },
      crossover: { total: 1, passed: 1, failed: 0 },
      adx: { total: 1, passed: 1, failed: 0 },
      cci: { total: 1, passed: 1, failed: 0 },
      cmo: { total: 1, passed: 1, failed: 0 },
      dmi: { total: 1, passed: 1, failed: 0 },
      donchian: { total: 1, passed: 1, failed: 0 },
      highest: { total: 1, passed: 1, failed: 0 },
      lowest: { total: 1, passed: 1, failed: 0 },
      linreg: { total: 1, passed: 1, failed: 0 },
      kc: { total: 1, passed: 1, failed: 0 },
      moving_average: { total: 1, passed: 1, failed: 0 },
      vwma: { total: 1, passed: 1, failed: 0 },
      wma: { total: 1, passed: 1, failed: 0 },
      alma: { total: 1, passed: 1, failed: 0 },
      hma: { total: 1, passed: 1, failed: 0 },
      percentile: { total: 1, passed: 1, failed: 0 },
      percentrank: { total: 1, passed: 1, failed: 0 },
      statistics: { total: 1, passed: 1, failed: 0 },
      range: { total: 1, passed: 1, failed: 0 },
      rising: { total: 1, passed: 1, failed: 0 },
      falling: { total: 1, passed: 1, failed: 0 },
      mfi: { total: 1, passed: 1, failed: 0 },
      mom: { total: 1, passed: 1, failed: 0 },
      sar: { total: 1, passed: 1, failed: 0 },
      stoch: { total: 1, passed: 1, failed: 0 },
      tsi: { total: 1, passed: 1, failed: 0 },
      source_identity: { total: 6, passed: 6, failed: 0 },
      state: { total: 7, passed: 7, failed: 0 },
      syminfo: { total: 1, passed: 1, failed: 0 },
      tables: { total: 12, passed: 12, failed: 0 },
      barstate: { total: 2, passed: 2, failed: 0 },
      table_setters: { total: 1, passed: 1, failed: 0 },
      udf: { total: 9, passed: 9, failed: 0 },
      udt: { total: 3, passed: 3, failed: 0 },
      unsupported: { total: 1, passed: 0, failed: 1 },
      varip: { total: 1, passed: 1, failed: 0 },
      trade_accessors: { total: 2, passed: 2, failed: 0 },
      open_trades: { total: 1, passed: 1, failed: 0 },
      volatility: { total: 3, passed: 3, failed: 0 },
      vwap: { total: 1, passed: 1, failed: 0 },
      wpr: { total: 1, passed: 1, failed: 0 },
      zigzag: { total: 1, passed: 1, failed: 0 },
      zones: { total: 2, passed: 2, failed: 0 },
    });
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('public-mtf-trend-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('public-input-configuration-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('public-legacy-v4-copy-paste-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('public-date-session-input-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('public-syminfo-metadata-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('public-varip-array-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('public-supertrend-signal-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('public-adx-dmi-trend-strength-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('public-parabolic-sar-reversal-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('public-linear-regression-channel-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('public-keltner-channel-signal-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('public-donchian-channel-signal-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('public-range-trend-filter-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('public-event-memory-signal-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('public-moving-average-ribbon-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('public-percentile-rank-signal-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('public-stochastic-signal-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('public-mfi-signal-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('public-cci-signal-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('public-cmo-signal-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('public-tsi-signal-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('public-roc-signal-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('public-momentum-signal-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('public-williams-r-signal-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('public-marker-signal-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('public-label-signal-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('public-line-signal-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('public-volatility-band-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('public-anchored-vwap-band-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('public-dashboard-table-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('public-barstate-dashboard-checkpoint');
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
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('public-loop-header-layout-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('public-wrapped-call-layout-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('public-udt-array-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('public-session-state-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('public-drawing-zone-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('public-box-zone-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('public-drawing-copy-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('public-linefill-channel-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('public-zigzag-polyline-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('public-strategy-bracket-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('public-strategy-trailing-stop-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('public-strategy-metadata-checkpoint');
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
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('public-plot-metadata-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('public-synthetic-ticker-checkpoint');
  });

  it('renders a stable checkpoint corpus report', () => {
    const markdown = formatPineCompatibilityCorpusMarkdown(runPineCompatibilityCorpus(compatibilityCheckpointCorpus));

    expect(markdown).toContain('Total: 104');
    expect(markdown).toContain('Passed: 103');
    expect(markdown).toContain('Failed: 1');
    expect(markdown).toContain('Planned unsupported: 1');
    expect(markdown).toContain('Actionable failed: 0');
    expect(markdown).toContain('Pass rate: 99.0%');
    expect(markdown).toContain('Actionable pass rate: 100.0%');
    expect(markdown).toContain('| semantic | 1 |');
    expect(markdown).toContain('| unsupported_planned | 1 |');
    expect(markdown).toContain('| inputs | 5 | 5 | 0 |');
    expect(markdown).toContain('| legacy | 1 | 1 | 0 |');
    expect(markdown).toContain('| runtime | 3 | 3 | 0 |');
    expect(markdown).toContain('| sessions | 4 | 4 | 0 |');
    expect(markdown).toContain('| strategy | 22 | 22 | 0 |');
    expect(markdown).toContain('| time | 3 | 3 | 0 |');
    expect(markdown).toContain('| timeframes | 2 | 2 | 0 |');
    expect(markdown).toContain('| request | 13 | 12 | 1 |');
    expect(markdown).toContain('| alerts | 3 | 3 | 0 |');
    expect(markdown).toContain('| arrays | 6 | 6 | 0 |');
    expect(markdown).toContain('| barstate | 2 | 2 | 0 |');
    expect(markdown).toContain('| brackets | 1 | 1 | 0 |');
    expect(markdown).toContain('| boxes | 3 | 3 | 0 |');
    expect(markdown).toContain('| box_setters | 1 | 1 | 0 |');
    expect(markdown).toContain('| candles | 1 | 1 | 0 |');
    expect(markdown).toContain('| channels | 4 | 4 | 0 |');
    expect(markdown).toContain('| currency | 1 | 1 | 0 |');
    expect(markdown).toContain('| custom_bars | 1 | 1 | 0 |');
    expect(markdown).toContain('| dashboard | 8 | 8 | 0 |');
    expect(markdown).toContain('| corporate_actions | 1 | 1 | 0 |');
    expect(markdown).toContain('| dividends | 1 | 1 | 0 |');
    expect(markdown).toContain('| drawings | 7 | 7 | 0 |');
    expect(markdown).toContain('| economic | 1 | 1 | 0 |');
    expect(markdown).toContain('| earnings | 1 | 1 | 0 |');
    expect(markdown).toContain('| financial | 1 | 1 | 0 |');
    expect(markdown).toContain('| fills | 7 | 7 | 0 |');
    expect(markdown).toContain('| footprint | 1 | 0 | 1 |');
    expect(markdown).toContain('| imports | 7 | 7 | 0 |');
    expect(markdown).toContain('| libraries | 7 | 7 | 0 |');
    expect(markdown).toContain('| labels | 2 | 2 | 0 |');
    expect(markdown).toContain('| linefills | 1 | 1 | 0 |');
    expect(markdown).toContain('| lines | 2 | 2 | 0 |');
    expect(markdown).toContain('| logs | 1 | 1 | 0 |');
    expect(markdown).toContain('| layout | 3 | 3 | 0 |');
    expect(markdown).toContain('| map | 1 | 1 | 0 |');
    expect(markdown).toContain('| matrix | 1 | 1 | 0 |');
    expect(markdown).toContain('| methods | 3 | 3 | 0 |');
    expect(markdown).toContain('| objects | 4 | 4 | 0 |');
    expect(markdown).toContain('| momentum | 2 | 2 | 0 |');
    expect(markdown).toContain('| oscillator | 7 | 7 | 0 |');
    expect(markdown).toContain('| performance | 3 | 3 | 0 |');
    expect(markdown).toContain('| plot_metadata | 1 | 1 | 0 |');
    expect(markdown).toContain('| polylines | 1 | 1 | 0 |');
    expect(markdown).toContain('| risk | 5 | 5 | 0 |');
    expect(markdown).toContain('| roc | 1 | 1 | 0 |');
    expect(markdown).toContain('| screener | 1 | 1 | 0 |');
    expect(markdown).toContain('| seed | 1 | 1 | 0 |');
    expect(markdown).toContain('| splits | 1 | 1 | 0 |');
    expect(markdown).toContain('| heikin_ashi | 3 | 3 | 0 |');
    expect(markdown).toContain('| intrabar | 4 | 3 | 1 |');
    expect(markdown).toContain('| markers | 3 | 3 | 0 |');
    expect(markdown).toContain('| realtime | 2 | 2 | 0 |');
    expect(markdown).toContain('| signals | 46 | 46 | 0 |');
    expect(markdown).toContain('| declaration_metadata | 1 | 1 | 0 |');
    expect(markdown).toContain('| output | 35 | 35 | 0 |');
    expect(markdown).toContain('| supertrend | 1 | 1 | 0 |');
    expect(markdown).toContain('| ta | 23 | 23 | 0 |');
    expect(markdown).toContain('| barssince | 1 | 1 | 0 |');
    expect(markdown).toContain('| valuewhen | 1 | 1 | 0 |');
    expect(markdown).toContain('| event_memory | 1 | 1 | 0 |');
    expect(markdown).toContain('| crossover | 1 | 1 | 0 |');
    expect(markdown).toContain('| adx | 1 | 1 | 0 |');
    expect(markdown).toContain('| cci | 1 | 1 | 0 |');
    expect(markdown).toContain('| cmo | 1 | 1 | 0 |');
    expect(markdown).toContain('| dmi | 1 | 1 | 0 |');
    expect(markdown).toContain('| donchian | 1 | 1 | 0 |');
    expect(markdown).toContain('| highest | 1 | 1 | 0 |');
    expect(markdown).toContain('| lowest | 1 | 1 | 0 |');
    expect(markdown).toContain('| kc | 1 | 1 | 0 |');
    expect(markdown).toContain('| moving_average | 1 | 1 | 0 |');
    expect(markdown).toContain('| vwma | 1 | 1 | 0 |');
    expect(markdown).toContain('| wma | 1 | 1 | 0 |');
    expect(markdown).toContain('| alma | 1 | 1 | 0 |');
    expect(markdown).toContain('| hma | 1 | 1 | 0 |');
    expect(markdown).toContain('| percentile | 1 | 1 | 0 |');
    expect(markdown).toContain('| percentrank | 1 | 1 | 0 |');
    expect(markdown).toContain('| statistics | 1 | 1 | 0 |');
    expect(markdown).toContain('| range | 1 | 1 | 0 |');
    expect(markdown).toContain('| rising | 1 | 1 | 0 |');
    expect(markdown).toContain('| falling | 1 | 1 | 0 |');
    expect(markdown).toContain('| linreg | 1 | 1 | 0 |');
    expect(markdown).toContain('| mfi | 1 | 1 | 0 |');
    expect(markdown).toContain('| mom | 1 | 1 | 0 |');
    expect(markdown).toContain('| sar | 1 | 1 | 0 |');
    expect(markdown).toContain('| stoch | 1 | 1 | 0 |');
    expect(markdown).toContain('| tsi | 1 | 1 | 0 |');
    expect(markdown).toContain('| source_identity | 6 | 6 | 0 |');
    expect(markdown).toContain('| state | 7 | 7 | 0 |');
    expect(markdown).toContain('| syminfo | 1 | 1 | 0 |');
    expect(markdown).toContain('| tables | 12 | 12 | 0 |');
    expect(markdown).toContain('| table_setters | 1 | 1 | 0 |');
    expect(markdown).toContain('| ticker | 2 | 2 | 0 |');
    expect(markdown).toContain('| trailing_stop | 2 | 2 | 0 |');
    expect(markdown).toContain('| trend_filter | 7 | 7 | 0 |');
    expect(markdown).toContain('| trade_accessors | 2 | 2 | 0 |');
    expect(markdown).toContain('| open_trades | 1 | 1 | 0 |');
    expect(markdown).toContain('| udf | 9 | 9 | 0 |');
    expect(markdown).toContain('| udt | 3 | 3 | 0 |');
    expect(markdown).toContain('| unsupported | 1 | 0 | 1 |');
    expect(markdown).toContain('| varip | 1 | 1 | 0 |');
    expect(markdown).toContain('| visuals | 23 | 23 | 0 |');
    expect(markdown).toContain('| volatility | 3 | 3 | 0 |');
    expect(markdown).toContain('| vwap | 1 | 1 | 0 |');
    expect(markdown).toContain('| wpr | 1 | 1 | 0 |');
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

    expect(run.summary.total).toBe(104);
    expect(run.summary.passed).toBe(103);
    expect(run.summary.failed).toBe(1);
    expect(run.summary.plannedUnsupported).toBe(1);
    expect(run.summary.actionableFailed).toBe(0);
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
      total: 104,
      byCategory: { indicator: 82, strategy: 22 },
      bySourceKind: { official_docs: 28, public_script: 76 },
      byPineVersion: { v4: 1, v6: 103 },
      byStoragePolicy: { reduced_fixture_only: 104 },
    });
    expect(index.byFeatureTag).toMatchObject({
      inputs: 5,
      legacy: 1,
      builtins: 2,
      request: 13,
      runtime: 3,
      sessions: 4,
      strategy: 22,
      time: 3,
      timeframes: 2,
      ticker: 2,
      trailing_stop: 2,
      trend_filter: 7,
      visuals: 23,
      alerts: 3,
      arrays: 6,
      brackets: 1,
      boxes: 3,
      box_setters: 1,
      candles: 1,
      channels: 4,
      currency: 1,
      custom_bars: 1,
      dashboard: 8,
      declaration_metadata: 1,
      corporate_actions: 1,
      dividends: 1,
      drawings: 7,
      economic: 1,
      earnings: 1,
      financial: 1,
      footprint: 1,
      fills: 7,
      imports: 7,
      libraries: 7,
      labels: 2,
      linefills: 1,
      lines: 2,
      logs: 1,
      layout: 3,
      map: 1,
      matrix: 1,
      methods: 3,
      multi_symbol: 1,
      objects: 4,
      momentum: 2,
      oscillator: 7,
      performance: 3,
      plot_metadata: 1,
      polylines: 1,
      risk: 5,
      roc: 1,
      screener: 1,
      seed: 1,
      splits: 1,
      heikin_ashi: 3,
      intrabar: 4,
      markers: 3,
      realtime: 2,
      signals: 46,
      output: 35,
      supertrend: 1,
      ta: 23,
      barssince: 1,
      valuewhen: 1,
      event_memory: 1,
      crossover: 1,
      adx: 1,
      cci: 1,
      cmo: 1,
      dmi: 1,
      donchian: 1,
      highest: 1,
      lowest: 1,
      kc: 1,
      moving_average: 1,
      vwma: 1,
      wma: 1,
      alma: 1,
      hma: 1,
      percentile: 1,
      percentrank: 1,
      statistics: 1,
      range: 1,
      rising: 1,
      falling: 1,
      linreg: 1,
      mfi: 1,
      mom: 1,
      sar: 1,
      stoch: 1,
      tsi: 1,
      source_identity: 6,
      state: 7,
      syminfo: 1,
      tables: 12,
      barstate: 2,
      table_setters: 1,
      trade_accessors: 2,
      open_trades: 1,
      udf: 9,
      udt: 3,
      unsupported: 1,
      varip: 1,
      volatility: 3,
      vwap: 1,
      wpr: 1,
      zigzag: 1,
      zones: 2,
    });
    expect(markdown).toContain('# Pine Compatibility Coverage');
    expect(markdown).toContain('Total checkpoints: 104');
    expect(markdown).toContain('| official_docs | 28 |');
    expect(markdown).toContain('| public_script | 76 |');
    expect(markdown).toContain('| reduced_fixture_only | 104 |');
    expect(formatPineCompatibilityCoverageJson(index)).toContain('"total": 104');
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

      expect(readFileSync(join(outDir, 'pine-compatibility-corpus.json'), 'utf8')).toContain('"passed": 103');
      expect(readFileSync(join(outDir, 'pine-compatibility-corpus.json'), 'utf8')).toContain('"actionableFailed": 0');
      expect(readFileSync(join(outDir, 'pine-compatibility-corpus.md'), 'utf8')).toContain('Pass rate: 99.0%');
      expect(readFileSync(join(outDir, 'pine-compatibility-corpus.md'), 'utf8')).toContain('Actionable pass rate: 100.0%');
      expect(readFileSync(join(outDir, 'pine-compatibility-coverage.json'), 'utf8')).toContain('"total": 104');
      expect(readFileSync(join(outDir, 'pine-compatibility-coverage.md'), 'utf8')).toContain('Total checkpoints: 104');
    } finally {
      rmSync(outDir, { recursive: true, force: true });
    }
  });
});

function resolveCorpusStages(stages: PineCompatibilityCorpusStages): CompatibilityStageOutcome[] {
  return typeof stages === 'function' ? stages() : stages;
}
