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

const EXPECTED_CHECKPOINT_TOTAL = compatibilityCheckpointLedger.entries.length;
const EXPECTED_CHECKPOINT_FAILED = 2;
const EXPECTED_CHECKPOINT_PLANNED_UNSUPPORTED = 2;
const EXPECTED_CHECKPOINT_PASSED = EXPECTED_CHECKPOINT_TOTAL - EXPECTED_CHECKPOINT_FAILED;

describe('Pine compatibility checkpoint corpus', () => {
  it('keeps source-linked reduced checkpoints in the offline corpus', () => {
    const run = runPineCompatibilityCorpus(compatibilityCheckpointCorpus);

    expect(validatePineScriptLedger(compatibilityCheckpointLedger)).toEqual({});
    expect(run.summary.total).toBe(EXPECTED_CHECKPOINT_TOTAL);
    expect(run.summary.passed).toBe(EXPECTED_CHECKPOINT_PASSED);
    expect(run.summary.failed).toBe(EXPECTED_CHECKPOINT_FAILED);
    expect(run.summary.plannedUnsupported).toBe(EXPECTED_CHECKPOINT_PLANNED_UNSUPPORTED);
    expect(run.summary.actionableFailed).toBe(0);
    expect(run.summary.byFirstFailureStage).toEqual({ semantic: 1, runtime: 1 });
    expect(run.summary.byFirstFailureClass).toEqual({ unsupported_planned: 2 });
    expect(run.summary.validationErrors).toEqual({});
    expect(run.summary.byFeatureTag).toMatchObject({
      inputs: { total: 17, passed: 17, failed: 0 },
      legacy: { total: 19, passed: 19, failed: 0 },
      v4_compat: { total: 3, passed: 3, failed: 0 },
      v5_compat: { total: 10, passed: 10, failed: 0 },
      builtins: { total: 2, passed: 2, failed: 0 },
      request: { total: 16, passed: 14, failed: 2 },
      runtime: { total: 54, passed: 54, failed: 0 },
      sessions: { total: 4, passed: 4, failed: 0 },
      strategy: { total: 42, passed: 42, failed: 0 },
      time: { total: 7, passed: 7, failed: 0 },
      timeframes: { total: 3, passed: 3, failed: 0 },
      ticker: { total: 2, passed: 2, failed: 0 },
      trailing_stop: { total: 3, passed: 3, failed: 0 },
      trend_filter: { total: 9, passed: 9, failed: 0 },
      visuals: { total: 41, passed: 41, failed: 0 },
      alerts: { total: 10, passed: 10, failed: 0 },
      arrays: { total: 25, passed: 25, failed: 0 },
      strings: { total: 4, passed: 4, failed: 0 },
      str_format: { total: 2, passed: 2, failed: 0 },
      str_split: { total: 1, passed: 1, failed: 0 },
      str_match: { total: 1, passed: 1, failed: 0 },
      calendar: { total: 1, passed: 1, failed: 0 },
      dayofweek: { total: 1, passed: 1, failed: 0 },
      timestamp: { total: 1, passed: 1, failed: 0 },
      brackets: { total: 3, passed: 3, failed: 0 },
      boxes: { total: 4, passed: 4, failed: 0 },
      box_setters: { total: 1, passed: 1, failed: 0 },
      candles: { total: 3, passed: 3, failed: 0 },
      channels: { total: 5, passed: 5, failed: 0 },
      currency: { total: 1, passed: 1, failed: 0 },
      custom_bars: { total: 1, passed: 1, failed: 0 },
      dashboard: { total: 15, passed: 15, failed: 0 },
      corporate_actions: { total: 1, passed: 1, failed: 0 },
      dividends: { total: 2, passed: 2, failed: 0 },
      drawings: { total: 19, passed: 19, failed: 0 },
      economic: { total: 1, passed: 1, failed: 0 },
      earnings: { total: 2, passed: 2, failed: 0 },
      financial: { total: 2, passed: 2, failed: 0 },
      fills: { total: 14, passed: 14, failed: 0 },
      footprint: { total: 1, passed: 0, failed: 1 },
      imports: { total: 8, passed: 8, failed: 0 },
      libraries: { total: 8, passed: 8, failed: 0 },
      labels: { total: 7, passed: 7, failed: 0 },
      linefills: { total: 1, passed: 1, failed: 0 },
      lines: { total: 5, passed: 5, failed: 0 },
      logs: { total: 2, passed: 2, failed: 0 },
      layout: { total: 10, passed: 10, failed: 0 },
      map: { total: 6, passed: 6, failed: 0 },
      matrix: { total: 5, passed: 5, failed: 0 },
      collections: { total: 10, passed: 10, failed: 0 },
      methods: { total: 6, passed: 6, failed: 0 },
      multi_symbol: { total: 1, passed: 1, failed: 0 },
      objects: { total: 6, passed: 6, failed: 0 },
      performance: { total: 6, passed: 6, failed: 0 },
      momentum: { total: 2, passed: 2, failed: 0 },
      oscillator: { total: 10, passed: 10, failed: 0 },
      plot_metadata: { total: 1, passed: 1, failed: 0 },
      polylines: { total: 2, passed: 2, failed: 0 },
      risk: { total: 6, passed: 6, failed: 0 },
      roc: { total: 1, passed: 1, failed: 0 },
      screener: { total: 1, passed: 1, failed: 0 },
      seed: { total: 1, passed: 1, failed: 0 },
      splits: { total: 1, passed: 1, failed: 0 },
      heikin_ashi: { total: 3, passed: 3, failed: 0 },
      integration: { total: 11, passed: 11, failed: 0 },
      intrabar: { total: 5, passed: 3, failed: 2 },
      markers: { total: 3, passed: 3, failed: 0 },
      realtime: { total: 4, passed: 4, failed: 0 },
      signals: { total: 192, passed: 192, failed: 0 },
      declaration_metadata: { total: 5, passed: 5, failed: 0 },
      output: { total: 233, passed: 233, failed: 0 },
      supertrend: { total: 1, passed: 1, failed: 0 },
      ta: { total: 77, passed: 77, failed: 0 },
      barcolor: { total: 4, passed: 4, failed: 0 },
      barssince: { total: 2, passed: 2, failed: 0 },
      valuewhen: { total: 2, passed: 2, failed: 0 },
      event_memory: { total: 1, passed: 1, failed: 0 },
      crossover: { total: 3, passed: 3, failed: 0 },
      adx: { total: 1, passed: 1, failed: 0 },
      cci: { total: 1, passed: 1, failed: 0 },
      cmo: { total: 1, passed: 1, failed: 0 },
      dmi: { total: 1, passed: 1, failed: 0 },
      donchian: { total: 1, passed: 1, failed: 0 },
      highest: { total: 1, passed: 1, failed: 0 },
      lowest: { total: 1, passed: 1, failed: 0 },
      linreg: { total: 1, passed: 1, failed: 0 },
      kc: { total: 2, passed: 2, failed: 0 },
      moving_average: { total: 2, passed: 2, failed: 0 },
      vwma: { total: 1, passed: 1, failed: 0 },
      wma: { total: 1, passed: 1, failed: 0 },
      alma: { total: 1, passed: 1, failed: 0 },
      hma: { total: 1, passed: 1, failed: 0 },
      percentile: { total: 2, passed: 2, failed: 0 },
      percentrank: { total: 2, passed: 2, failed: 0 },
      statistics: { total: 3, passed: 3, failed: 0 },
      range: { total: 1, passed: 1, failed: 0 },
      rising: { total: 1, passed: 1, failed: 0 },
      falling: { total: 1, passed: 1, failed: 0 },
      mfi: { total: 1, passed: 1, failed: 0 },
      mom: { total: 1, passed: 1, failed: 0 },
      sar: { total: 1, passed: 1, failed: 0 },
      stoch: { total: 2, passed: 2, failed: 0 },
      tsi: { total: 1, passed: 1, failed: 0 },
      source_identity: { total: 6, passed: 6, failed: 0 },
      state: { total: 35, passed: 35, failed: 0 },
      syminfo: { total: 2, passed: 2, failed: 0 },
      tables: { total: 21, passed: 21, failed: 0 },
      barstate: { total: 10, passed: 10, failed: 0 },
      table_setters: { total: 1, passed: 1, failed: 0 },
      udf: { total: 23, passed: 23, failed: 0 },
      udt: { total: 7, passed: 7, failed: 0 },
      unsupported: { total: 2, passed: 0, failed: 2 },
      varip: { total: 2, passed: 2, failed: 0 },
      trade_accessors: { total: 4, passed: 4, failed: 0 },
      open_trades: { total: 2, passed: 2, failed: 0 },
      cancel: { total: 1, passed: 1, failed: 0 },
      volatility: { total: 5, passed: 5, failed: 0 },
      vwap: { total: 3, passed: 3, failed: 0 },
      wpr: { total: 1, passed: 1, failed: 0 },
      obv: { total: 2, passed: 2, failed: 0 },
      zigzag: { total: 1, passed: 1, failed: 0 },
      zones: { total: 2, passed: 2, failed: 0 },
      rsi: { total: 6, passed: 6, failed: 0 },
      macd: { total: 1, passed: 1, failed: 0 },
      atr: { total: 1, passed: 1, failed: 0 },
      pvt: { total: 1, passed: 1, failed: 0 },
      divergence: { total: 3, passed: 3, failed: 0 },
      pivots: { total: 4, passed: 4, failed: 0 },
      var: { total: 11, passed: 11, failed: 0 },
      parser: { total: 12, passed: 12, failed: 0 },
      edge_case: { total: 20, passed: 20, failed: 0 },
      nested_calls: { total: 1, passed: 1, failed: 0 },
      ternary: { total: 3, passed: 3, failed: 0 },
      tuple: { total: 2, passed: 1, failed: 1 },
      na: { total: 12, passed: 12, failed: 0 },
      color: { total: 3, passed: 3, failed: 0 },
      bands: { total: 3, passed: 3, failed: 0 },
      history: { total: 9, passed: 9, failed: 0 },
      series: { total: 14, passed: 14, failed: 0 },
      operators: { total: 10, passed: 10, failed: 0 },
      arithmetic: { total: 5, passed: 5, failed: 0 },
      scope: { total: 6, passed: 6, failed: 0 },
      control_flow: { total: 6, passed: 6, failed: 0 },
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
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('public-obv-signal-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('realworld-rsi-ob-os-signal-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('realworld-macd-crossover-signal-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('realworld-atr-position-sizing-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('realworld-pvt-signal-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('realworld-bb-kc-squeeze-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('realworld-ma-ribbon-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('realworld-barcolor-trend-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('realworld-udf-smoothed-rsi-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('realworld-rsi-divergence-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('realworld-volume-analysis-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('realworld-multi-indicator-dashboard-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('realworld-oscillator-combo-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('realworld-ma-crossover-alert-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('realworld-vwap-dev-bands-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('realworld-pivot-support-resistance-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('realworld-adv-strategy-stats-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('realworld-adv-udt-methods-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('realworld-adv-udf-defaults-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('realworld-adv-drawing-lifecycle-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('realworld-adv-switch-enum-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('realworld-adv-matrix-operations-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('realworld-adv-map-state-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('realworld-adv-conditional-plotting-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('realworld-adv-forin-array-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('realworld-adv-strformat-dashboard-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('realtime-islast-table-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('realtime-isconfirmed-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('realtime-multi-alert-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('realtime-alert-freq-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('realtime-isfirst-init-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('realtime-isnew-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('realtime-log-levels-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('realtime-strformat-alert-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('realtime-alertcondition-crossover-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('realtime-lastbar-summary-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('edge-nested-calls-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('edge-ternary-arg-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('edge-empty-udf-body-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('edge-tuple-return-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('edge-na-propagation-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('edge-cumsum-accumulation-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('edge-valuewhen-crossover-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('edge-plotshape-dynamic-text-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('edge-color-rgb-clamp-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('edge-input-source-udf-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('edge-multi-exit-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('edge-array-copy-sort-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('v5-study-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('v5-generic-input-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('v5-hex-color-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('v5-sma-global-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('v5-ema-global-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('v5-rsi-global-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('v5-mixed-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('parser-long-line-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('parser-nested-ternary-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('parser-continued-lines-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('parser-comment-continuation-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('parser-empty-lines-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('parser-inline-comments-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('parser-long-switch-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('deep-v4-integer-input-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('deep-for-map-kv-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('deep-generic-array-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('deep-switch-string-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('deep-string-concat-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('deep-request-security-tuple-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('deep-plotcandle-colors-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('deep-bb-fill-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('deep-strategy-oca-exit-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('deep-type-cast-chain-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('deep-nested-udf-state-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('deep-label-delete-lifecycle-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('official-exec-model-barstate-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('official-type-cast-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('official-array-stats-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('official-array-slice-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('official-map-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('official-udt-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('official-method-dispatch-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('official-inputs-all-types-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('official-plots-hline-fill-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('official-bgcolor-trend-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('official-strategy-entry-close-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('official-plotshape-plotchar-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('official-repainting-guard-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('official-conditionals-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('integration-trend-system-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('integration-volatility-dashboard-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('integration-ma-strategy-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('integration-price-action-scanner-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('integration-risk-management-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('integration-custom-oscillator-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('integration-ema-state-table-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('integration-equity-tracker-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('integration-divergence-detector-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('integration-oscillator-gradient-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('integration-ichimoku-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('legacy-v4-study-resolution-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('legacy-v4-input-type-integer-bool-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('legacy-plotshape-default-location-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('legacy-strategy-position-size-zero-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('legacy-array-new-float-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('legacy-str-tostring-format-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('legacy-timeframe-period-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('legacy-ta-change-two-arg-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('legacy-nz-two-arg-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('legacy-math-max-variadic-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('libfin-library-export-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('libfin-enum-switch-barcolor-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('libfin-request-financial-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('libfin-request-dividends-earnings-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('libfin-strategy-pyramiding-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('libfin-strategy-commission-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('libfin-ta-vwap-anchor-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('libfin-str-format-time-timezone-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('libfin-conditional-na-inference-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('libfin-runtime-error-guard-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('adv-label-array-cap-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('adv-table-merged-header-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('adv-line-extend-dashed-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('adv-box-with-text-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('adv-polyline-price-action-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('adv-label-dynamic-tooltip-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('adv-hline-fill-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('adv-plotbar-ohlc-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('adv-table-gradient-color-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('adv-drawing-cleanup-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('ctrl-series-history-udf-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('ctrl-var-in-for-expr-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('ctrl-udf-var-isolation-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('ctrl-switch-expr-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('ctrl-nested-udf-state-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('ctrl-for-expr-return-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('ctrl-if-block-multi-stmt-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('ctrl-for-break-expr-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('ctrl-while-expr-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('ctrl-chained-ternary-na-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('string-time-na-strformat-multi-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('string-time-na-strsplit-iteration-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('string-time-na-strmatch-regex-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('string-time-na-calendar-gate-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('string-time-na-timestamp-filter-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('string-time-na-na-arith-propagation-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('string-time-na-nz-replacement-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('string-time-na-fixnan-forwardfill-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('string-time-na-barssince-never-true-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('string-time-na-color-new-hex-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('coll-matrix-avg-col-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('coll-matrix-transpose-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('coll-array-stats-pipeline-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('coll-array-binary-search-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('coll-map-category-aggregation-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('coll-array-every-some-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('coll-matrix-identity-check-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('coll-size-tracking-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('coll-array-standardize-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('coll-map-key-delete-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('input-int-range-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('input-string-options-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('indicator-overlay-precision-format-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('strategy-full-declaration-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('runtime-error-specific-bar-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('input-multi-type-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('input-time-default-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('indicator-max-bars-back-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('input-driven-ta-rsi-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('indicator-shorttitle-overlay-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('ops-float-division-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('ops-modulo-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('ops-string-comparison-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('ops-boolean-arithmetic-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('ops-comparison-chaining-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('ops-precedence-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('ops-compound-assignment-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('ops-unary-minus-series-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('ops-not-operator-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('ops-na-equality-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('series-history-deep-lookback-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('series-history-derived-series-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('series-history-varip-vs-var-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('series-history-udf-arg-history-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('series-history-rolling-sum-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('series-history-change-of-sma-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('series-history-bar-index-semantics-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('series-history-variable-shadowing-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('series-history-ema-warmup-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('series-history-prev-bar-tracking-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('adv-strategy-tp-sl-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('adv-strategy-pyramiding-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('adv-strategy-bidirectional-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('adv-strategy-closedtrades-accessors-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('adv-strategy-opentrades-accessors-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('adv-strategy-risk-max-position-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('adv-strategy-process-orders-on-close-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('adv-strategy-equity-tracking-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('adv-strategy-multi-exit-from-entry-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('adv-strategy-cancel-checkpoint');
  });

  it('renders a stable checkpoint corpus report', () => {
    const markdown = formatPineCompatibilityCorpusMarkdown(runPineCompatibilityCorpus(compatibilityCheckpointCorpus));

    expect(markdown).toContain(`Total: ${EXPECTED_CHECKPOINT_TOTAL}`);
    expect(markdown).toContain(`Passed: ${EXPECTED_CHECKPOINT_PASSED}`);
    expect(markdown).toContain(`Failed: ${EXPECTED_CHECKPOINT_FAILED}`);
    expect(markdown).toContain(`Planned unsupported: ${EXPECTED_CHECKPOINT_PLANNED_UNSUPPORTED}`);
    expect(markdown).toContain('Actionable failed: 0');
    expect(markdown).toContain('Actionable pass rate: 100.0%');
    expect(markdown).toContain('| semantic | 1 |');
    expect(markdown).toContain('| runtime | 1 |');
    expect(markdown).toContain('| unsupported_planned | 2 |');
    expect(markdown).toContain('| inputs | 17 | 17 | 0 |');
    expect(markdown).toContain('| legacy | 19 | 19 | 0 |');
    expect(markdown).toContain('| v4_compat | 3 | 3 | 0 |');
    expect(markdown).toContain('| v5_compat | 10 | 10 | 0 |');
    expect(markdown).toContain('| integration | 11 | 11 | 0 |');
    expect(markdown).toContain('| strategy | 42 | 42 | 0 |');
    expect(markdown).toContain('| runtime | 54 | 54 | 0 |');
    expect(markdown).toContain('| sessions | 4 | 4 | 0 |');
    expect(markdown).toContain('| time | 7 | 7 | 0 |');
    expect(markdown).toContain('| timeframes | 3 | 3 | 0 |');
    expect(markdown).toContain('| request | 16 | 14 | 2 |');
    expect(markdown).toContain('| alerts | 10 | 10 | 0 |');
    expect(markdown).toContain('| arrays | 25 | 25 | 0 |');
    expect(markdown).toContain('| barcolor | 4 | 4 | 0 |');
    expect(markdown).toContain('| barstate | 10 | 10 | 0 |');
    expect(markdown).toContain('| brackets | 3 | 3 | 0 |');
    expect(markdown).toContain('| boxes | 4 | 4 | 0 |');
    expect(markdown).toContain('| box_setters | 1 | 1 | 0 |');
    expect(markdown).toContain('| candles | 3 | 3 | 0 |');
    expect(markdown).toContain('| channels | 5 | 5 | 0 |');
    expect(markdown).toContain('| currency | 1 | 1 | 0 |');
    expect(markdown).toContain('| custom_bars | 1 | 1 | 0 |');
    expect(markdown).toContain('| dashboard | 15 | 15 | 0 |');
    expect(markdown).toContain('| corporate_actions | 1 | 1 | 0 |');
    expect(markdown).toContain('| dividends | 2 | 2 | 0 |');
    expect(markdown).toContain('| drawings | 19 | 19 | 0 |');
    expect(markdown).toContain('| economic | 1 | 1 | 0 |');
    expect(markdown).toContain('| earnings | 2 | 2 | 0 |');
    expect(markdown).toContain('| financial | 2 | 2 | 0 |');
    expect(markdown).toContain('| fills | 14 | 14 | 0 |');
    expect(markdown).toContain('| footprint | 1 | 0 | 1 |');
    expect(markdown).toContain('| imports | 8 | 8 | 0 |');
    expect(markdown).toContain('| libraries | 8 | 8 | 0 |');
    expect(markdown).toContain('| labels | 7 | 7 | 0 |');
    expect(markdown).toContain('| linefills | 1 | 1 | 0 |');
    expect(markdown).toContain('| lines | 5 | 5 | 0 |');
    expect(markdown).toContain('| logs | 2 | 2 | 0 |');
    expect(markdown).toContain('| layout | 10 | 10 | 0 |');
    expect(markdown).toContain('| map | 6 | 6 | 0 |');
    expect(markdown).toContain('| matrix | 5 | 5 | 0 |');
    expect(markdown).toContain('| collections | 10 | 10 | 0 |');
    expect(markdown).toContain('| methods | 6 | 6 | 0 |');
    expect(markdown).toContain('| objects | 6 | 6 | 0 |');
    expect(markdown).toContain('| momentum | 2 | 2 | 0 |');
    expect(markdown).toContain('| oscillator | 10 | 10 | 0 |');
    expect(markdown).toContain('| performance | 6 | 6 | 0 |');
    expect(markdown).toContain('| plot_metadata | 1 | 1 | 0 |');
    expect(markdown).toContain('| polylines | 2 | 2 | 0 |');
    expect(markdown).toContain('| risk | 6 | 6 | 0 |');
    expect(markdown).toContain('| roc | 1 | 1 | 0 |');
    expect(markdown).toContain('| screener | 1 | 1 | 0 |');
    expect(markdown).toContain('| seed | 1 | 1 | 0 |');
    expect(markdown).toContain('| splits | 1 | 1 | 0 |');
    expect(markdown).toContain('| heikin_ashi | 3 | 3 | 0 |');
    expect(markdown).toContain('| intrabar | 5 | 3 | 2 |');
    expect(markdown).toContain('| markers | 3 | 3 | 0 |');
    expect(markdown).toContain('| realtime | 4 | 4 | 0 |');
    expect(markdown).toContain('| signals | 192 | 192 | 0 |');
    expect(markdown).toContain('| declaration_metadata | 5 | 5 | 0 |');
    expect(markdown).toContain('| output | 233 | 233 | 0 |');
    expect(markdown).toContain('| supertrend | 1 | 1 | 0 |');
    expect(markdown).toContain('| ta | 77 | 77 | 0 |');
    expect(markdown).toContain('| barssince | 2 | 2 | 0 |');
    expect(markdown).toContain('| valuewhen | 2 | 2 | 0 |');
    expect(markdown).toContain('| event_memory | 1 | 1 | 0 |');
    expect(markdown).toContain('| crossover | 3 | 3 | 0 |');
    expect(markdown).toContain('| adx | 1 | 1 | 0 |');
    expect(markdown).toContain('| cci | 1 | 1 | 0 |');
    expect(markdown).toContain('| cmo | 1 | 1 | 0 |');
    expect(markdown).toContain('| dmi | 1 | 1 | 0 |');
    expect(markdown).toContain('| donchian | 1 | 1 | 0 |');
    expect(markdown).toContain('| highest | 1 | 1 | 0 |');
    expect(markdown).toContain('| lowest | 1 | 1 | 0 |');
    expect(markdown).toContain('| kc | 2 | 2 | 0 |');
    expect(markdown).toContain('| moving_average | 2 | 2 | 0 |');
    expect(markdown).toContain('| vwma | 1 | 1 | 0 |');
    expect(markdown).toContain('| wma | 1 | 1 | 0 |');
    expect(markdown).toContain('| alma | 1 | 1 | 0 |');
    expect(markdown).toContain('| hma | 1 | 1 | 0 |');
    expect(markdown).toContain('| percentile | 2 | 2 | 0 |');
    expect(markdown).toContain('| percentrank | 2 | 2 | 0 |');
    expect(markdown).toContain('| statistics | 3 | 3 | 0 |');
    expect(markdown).toContain('| range | 1 | 1 | 0 |');
    expect(markdown).toContain('| rising | 1 | 1 | 0 |');
    expect(markdown).toContain('| falling | 1 | 1 | 0 |');
    expect(markdown).toContain('| linreg | 1 | 1 | 0 |');
    expect(markdown).toContain('| mfi | 1 | 1 | 0 |');
    expect(markdown).toContain('| mom | 1 | 1 | 0 |');
    expect(markdown).toContain('| sar | 1 | 1 | 0 |');
    expect(markdown).toContain('| stoch | 2 | 2 | 0 |');
    expect(markdown).toContain('| tsi | 1 | 1 | 0 |');
    expect(markdown).toContain('| source_identity | 6 | 6 | 0 |');
    expect(markdown).toContain('| state | 35 | 35 | 0 |');
    expect(markdown).toContain('| syminfo | 2 | 2 | 0 |');
    expect(markdown).toContain('| tables | 21 | 21 | 0 |');
    expect(markdown).toContain('| table_setters | 1 | 1 | 0 |');
    expect(markdown).toContain('| ticker | 2 | 2 | 0 |');
    expect(markdown).toContain('| trailing_stop | 3 | 3 | 0 |');
    expect(markdown).toContain('| trend_filter | 9 | 9 | 0 |');
    expect(markdown).toContain('| trade_accessors | 4 | 4 | 0 |');
    expect(markdown).toContain('| open_trades | 2 | 2 | 0 |');
    expect(markdown).toContain('| cancel | 1 | 1 | 0 |');
    expect(markdown).toContain('| udf | 23 | 23 | 0 |');
    expect(markdown).toContain('| udt | 7 | 7 | 0 |');
    expect(markdown).toContain('| unsupported | 2 | 0 | 2 |');
    expect(markdown).toContain('| varip | 2 | 2 | 0 |');
    expect(markdown).toContain('| visuals | 41 | 41 | 0 |');
    expect(markdown).toContain('| volatility | 5 | 5 | 0 |');
    expect(markdown).toContain('| vwap | 3 | 3 | 0 |');
    expect(markdown).toContain('| wpr | 1 | 1 | 0 |');
    expect(markdown).toContain('| obv | 2 | 2 | 0 |');
    expect(markdown).toContain('| zigzag | 1 | 1 | 0 |');
    expect(markdown).toContain('| zones | 2 | 2 | 0 |');
    expect(markdown).toContain('| rsi | 6 | 6 | 0 |');
    expect(markdown).toContain('| macd | 1 | 1 | 0 |');
    expect(markdown).toContain('| atr | 1 | 1 | 0 |');
    expect(markdown).toContain('| pvt | 1 | 1 | 0 |');
    expect(markdown).toContain('| divergence | 3 | 3 | 0 |');
    expect(markdown).toContain('| pivots | 4 | 4 | 0 |');
    expect(markdown).toContain('| v5_compat | 10 | 10 | 0 |');
    expect(markdown).toContain('| parser | 12 | 12 | 0 |');
    expect(markdown).toContain('| edge_case | 20 | 20 | 0 |');
    expect(markdown).toContain('| bands | 3 | 3 | 0 |');
    expect(markdown).toContain('| history | 9 | 9 | 0 |');
    expect(markdown).toContain('| series | 14 | 14 | 0 |');
    expect(markdown).toContain('| operators | 10 | 10 | 0 |');
    expect(markdown).toContain('| arithmetic | 5 | 5 | 0 |');
    expect(markdown).toContain('| scope | 6 | 6 | 0 |');
    expect(markdown).toContain('| control_flow | 6 | 6 | 0 |');
    expect(markdown).toContain('| strings | 4 | 4 | 0 |');
    expect(markdown).toContain('| str_format | 2 | 2 | 0 |');
    expect(markdown).toContain('| str_split | 1 | 1 | 0 |');
    expect(markdown).toContain('| str_match | 1 | 1 | 0 |');
    expect(markdown).toContain('| calendar | 1 | 1 | 0 |');
    expect(markdown).toContain('| dayofweek | 1 | 1 | 0 |');
    expect(markdown).toContain('| timestamp | 1 | 1 | 0 |');
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

    expect(run.summary.total).toBe(EXPECTED_CHECKPOINT_TOTAL);
    expect(run.summary.passed).toBe(EXPECTED_CHECKPOINT_PASSED);
    expect(run.summary.failed).toBe(EXPECTED_CHECKPOINT_FAILED);
    expect(run.summary.plannedUnsupported).toBe(EXPECTED_CHECKPOINT_PLANNED_UNSUPPORTED);
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
      total: EXPECTED_CHECKPOINT_TOTAL,
      byCategory: { indicator: 261, strategy: 42 },
      bySourceKind: { official_docs: 42, public_script: 261 },
      byPineVersion: { v4: 4, v5: 10, v6: 289 },
      byStoragePolicy: { reduced_fixture_only: EXPECTED_CHECKPOINT_TOTAL },
    });
    expect(index.byFeatureTag).toMatchObject({
      inputs: 17,
      legacy: 19,
      v4_compat: 3,
      v5_compat: 10,
      builtins: 2,
      request: 16,
      runtime: 54,
      sessions: 4,
      strategy: 42,
      time: 7,
      timeframes: 3,
      ticker: 2,
      trailing_stop: 3,
      trend_filter: 9,
      visuals: 41,
      alerts: 10,
      arrays: 25,
      barcolor: 4,
      brackets: 3,
      boxes: 4,
      box_setters: 1,
      candles: 3,
      channels: 5,
      currency: 1,
      custom_bars: 1,
      dashboard: 15,
      declaration_metadata: 5,
      corporate_actions: 1,
      dividends: 2,
      drawings: 19,
      economic: 1,
      earnings: 2,
      financial: 2,
      footprint: 1,
      fills: 14,
      imports: 8,
      integration: 11,
      libraries: 8,
      labels: 7,
      linefills: 1,
      lines: 5,
      logs: 2,
      layout: 10,
      map: 6,
      matrix: 5,
      collections: 10,
      methods: 6,
      multi_symbol: 1,
      objects: 6,
      momentum: 2,
      oscillator: 10,
      performance: 6,
      plot_metadata: 1,
      polylines: 2,
      risk: 6,
      roc: 1,
      screener: 1,
      seed: 1,
      splits: 1,
      heikin_ashi: 3,
      intrabar: 5,
      markers: 3,
      realtime: 4,
      signals: 192,
      output: 233,
      supertrend: 1,
      ta: 77,
      barssince: 2,
      valuewhen: 2,
      event_memory: 1,
      crossover: 3,
      adx: 1,
      cci: 1,
      cmo: 1,
      dmi: 1,
      donchian: 1,
      highest: 1,
      lowest: 1,
      kc: 2,
      moving_average: 2,
      vwma: 1,
      wma: 1,
      alma: 1,
      hma: 1,
      percentile: 2,
      percentrank: 2,
      statistics: 3,
      range: 1,
      rising: 1,
      falling: 1,
      linreg: 1,
      mfi: 1,
      mom: 1,
      sar: 1,
      stoch: 2,
      tsi: 1,
      source_identity: 6,
      state: 35,
      syminfo: 2,
      tables: 21,
      barstate: 10,
      table_setters: 1,
      trade_accessors: 4,
      open_trades: 2,
      cancel: 1,
      udf: 23,
      udt: 7,
      unsupported: 2,
      varip: 2,
      volatility: 5,
      vwap: 3,
      wpr: 1,
      obv: 2,
      zigzag: 1,
      zones: 2,
      rsi: 6,
      macd: 1,
      atr: 1,
      pvt: 1,
      divergence: 3,
      pivots: 4,
      parser: 12,
      edge_case: 20,
      nested_calls: 1,
      ternary: 3,
      tuple: 2,
      na: 12,
      color: 3,
      bands: 3,
      history: 9,
      series: 14,
      scope: 6,
      control_flow: 6,
      var: 11,
      strings: 4,
      operators: 10,
      arithmetic: 5,
      str_format: 2,
      str_split: 1,
      str_match: 1,
      calendar: 1,
      dayofweek: 1,
      timestamp: 1,
    });
    expect(markdown).toContain('# Pine Compatibility Coverage');
    expect(markdown).toContain(`Total checkpoints: ${EXPECTED_CHECKPOINT_TOTAL}`);
    expect(markdown).toContain('| official_docs | 42 |');
    expect(markdown).toContain('| public_script | 261 |');
    expect(markdown).toContain(`| reduced_fixture_only | ${EXPECTED_CHECKPOINT_TOTAL} |`);
    expect(formatPineCompatibilityCoverageJson(index)).toContain(`"total": ${EXPECTED_CHECKPOINT_TOTAL}`);
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

      expect(readFileSync(join(outDir, 'pine-compatibility-corpus.json'), 'utf8')).toContain(
        `"passed": ${EXPECTED_CHECKPOINT_PASSED}`,
      );
      expect(readFileSync(join(outDir, 'pine-compatibility-corpus.json'), 'utf8')).toContain('"actionableFailed": 0');
      expect(readFileSync(join(outDir, 'pine-compatibility-corpus.md'), 'utf8')).toContain('Pass rate: 99.3%');
      expect(readFileSync(join(outDir, 'pine-compatibility-corpus.md'), 'utf8')).toContain('Actionable pass rate: 100.0%');
      expect(readFileSync(join(outDir, 'pine-compatibility-coverage.json'), 'utf8')).toContain(
        `"total": ${EXPECTED_CHECKPOINT_TOTAL}`,
      );
      expect(readFileSync(join(outDir, 'pine-compatibility-coverage.md'), 'utf8')).toContain(
        `Total checkpoints: ${EXPECTED_CHECKPOINT_TOTAL}`,
      );
    } finally {
      rmSync(outDir, { recursive: true, force: true });
    }
  });
});

function resolveCorpusStages(stages: PineCompatibilityCorpusStages): CompatibilityStageOutcome[] {
  return typeof stages === 'function' ? stages() : stages;
}
