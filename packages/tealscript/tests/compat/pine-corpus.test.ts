import { describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

import {
  createPineCompatibilityCoverageIndex,
  formatPineCompatibilityCoverageJson,
  formatPineCompatibilityCoverageMarkdown,
  formatPineCompatibilityCorpusJson,
  formatPineCompatibilityCorpusMarkdown,
  runPineCompatibilityCorpus,
  runPineCompatibilityLedger,
  validatePineScriptLedger,
} from '../../src';
import { compatibilityCheckpointCorpus, compatibilityCheckpointLedger } from './pine-ledger';

describe('Pine compatibility checkpoint corpus', () => {
  it('keeps source-linked reduced checkpoints in the offline corpus', () => {
    const run = runPineCompatibilityCorpus(compatibilityCheckpointCorpus);

    expect(validatePineScriptLedger(compatibilityCheckpointLedger)).toEqual({});
    expect(compatibilityCheckpointLedger.entries).toHaveLength(38);
    expect(run.summary.total).toBe(38);
    expect(run.summary.passed).toBe(38);
    expect(run.summary.failed).toBe(0);
    expect(run.summary.validationErrors).toEqual({});
    expect(run.summary.byFeatureTag).toMatchObject({
      inputs: { total: 2, passed: 2, failed: 0 },
      request: { total: 6, passed: 6, failed: 0 },
      runtime: { total: 2, passed: 2, failed: 0 },
      sessions: { total: 3, passed: 3, failed: 0 },
      strategy: { total: 12, passed: 12, failed: 0 },
      time: { total: 2, passed: 2, failed: 0 },
      timeframes: { total: 1, passed: 1, failed: 0 },
      ticker: { total: 2, passed: 2, failed: 0 },
      visuals: { total: 9, passed: 9, failed: 0 },
      alerts: { total: 3, passed: 3, failed: 0 },
      brackets: { total: 1, passed: 1, failed: 0 },
      boxes: { total: 1, passed: 1, failed: 0 },
      candles: { total: 1, passed: 1, failed: 0 },
      channels: { total: 1, passed: 1, failed: 0 },
      dashboard: { total: 1, passed: 1, failed: 0 },
      drawings: { total: 3, passed: 3, failed: 0 },
      imports: { total: 1, passed: 1, failed: 0 },
      libraries: { total: 1, passed: 1, failed: 0 },
      linefills: { total: 1, passed: 1, failed: 0 },
      methods: { total: 1, passed: 1, failed: 0 },
      multi_symbol: { total: 1, passed: 1, failed: 0 },
      objects: { total: 1, passed: 1, failed: 0 },
      performance: { total: 1, passed: 1, failed: 0 },
      polylines: { total: 1, passed: 1, failed: 0 },
      screener: { total: 1, passed: 1, failed: 0 },
      heikin_ashi: { total: 3, passed: 3, failed: 0 },
      signals: { total: 5, passed: 5, failed: 0 },
      state: { total: 2, passed: 2, failed: 0 },
      tables: { total: 3, passed: 3, failed: 0 },
      udf: { total: 1, passed: 1, failed: 0 },
      udt: { total: 1, passed: 1, failed: 0 },
      zigzag: { total: 1, passed: 1, failed: 0 },
      zones: { total: 1, passed: 1, failed: 0 },
    });
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('public-mtf-trend-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('public-dashboard-table-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('public-screener-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('public-library-helper-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('public-object-method-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('public-session-state-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('public-drawing-zone-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('public-linefill-channel-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('public-zigzag-polyline-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('public-strategy-bracket-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('public-strategy-stats-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('public-alert-signal-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('public-custom-candle-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('public-synthetic-ticker-checkpoint');
  });

  it('renders a stable checkpoint corpus report', () => {
    const markdown = formatPineCompatibilityCorpusMarkdown(runPineCompatibilityCorpus(compatibilityCheckpointCorpus));

    expect(markdown).toContain('Total: 38');
    expect(markdown).toContain('Pass rate: 100.0%');
    expect(markdown).toContain('| inputs | 2 | 2 | 0 |');
    expect(markdown).toContain('| runtime | 2 | 2 | 0 |');
    expect(markdown).toContain('| sessions | 3 | 3 | 0 |');
    expect(markdown).toContain('| strategy | 12 | 12 | 0 |');
    expect(markdown).toContain('| time | 2 | 2 | 0 |');
    expect(markdown).toContain('| timeframes | 1 | 1 | 0 |');
    expect(markdown).toContain('| request | 6 | 6 | 0 |');
    expect(markdown).toContain('| alerts | 3 | 3 | 0 |');
    expect(markdown).toContain('| brackets | 1 | 1 | 0 |');
    expect(markdown).toContain('| boxes | 1 | 1 | 0 |');
    expect(markdown).toContain('| candles | 1 | 1 | 0 |');
    expect(markdown).toContain('| channels | 1 | 1 | 0 |');
    expect(markdown).toContain('| dashboard | 1 | 1 | 0 |');
    expect(markdown).toContain('| drawings | 3 | 3 | 0 |');
    expect(markdown).toContain('| imports | 1 | 1 | 0 |');
    expect(markdown).toContain('| libraries | 1 | 1 | 0 |');
    expect(markdown).toContain('| linefills | 1 | 1 | 0 |');
    expect(markdown).toContain('| methods | 1 | 1 | 0 |');
    expect(markdown).toContain('| objects | 1 | 1 | 0 |');
    expect(markdown).toContain('| performance | 1 | 1 | 0 |');
    expect(markdown).toContain('| polylines | 1 | 1 | 0 |');
    expect(markdown).toContain('| screener | 1 | 1 | 0 |');
    expect(markdown).toContain('| heikin_ashi | 3 | 3 | 0 |');
    expect(markdown).toContain('| signals | 5 | 5 | 0 |');
    expect(markdown).toContain('| state | 2 | 2 | 0 |');
    expect(markdown).toContain('| tables | 3 | 3 | 0 |');
    expect(markdown).toContain('| ticker | 2 | 2 | 0 |');
    expect(markdown).toContain('| udt | 1 | 1 | 0 |');
    expect(markdown).toContain('| zigzag | 1 | 1 | 0 |');
    expect(markdown).toContain('| zones | 1 | 1 | 0 |');
    expect(markdown).not.toContain('Validation Errors');
  });

  it('runs checkpoint ledgers through the offline corpus runner', () => {
    const stagesById = new Map(compatibilityCheckpointCorpus.map((corpusCase) => [
      corpusCase.ledgerEntry.id,
      corpusCase.stages,
    ]));
    const run = runPineCompatibilityLedger(
      compatibilityCheckpointLedger,
      (entry) => stagesById.get(entry.id) ?? [{ stage: 'parse', status: 'not_run' }],
    );
    const json = formatPineCompatibilityCorpusJson(run);

    expect(run.summary.total).toBe(38);
    expect(run.summary.passed).toBe(38);
    expect(run.summary.validationErrors).toEqual({});
    expect(json).toContain('"schemaVersion": 1');
    expect(json).toContain('"scriptId": "official-builtins-checkpoint"');
    expect(json.endsWith('\n')).toBe(true);
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

  it('builds a checkpoint coverage index from intake metadata', () => {
    const index = createPineCompatibilityCoverageIndex(compatibilityCheckpointLedger);
    const markdown = formatPineCompatibilityCoverageMarkdown(index);

    expect(index).toMatchObject({
      schemaVersion: 1,
      total: 38,
      byCategory: { indicator: 26, strategy: 12 },
      bySourceKind: { official_docs: 22, public_script: 16 },
      byPineVersion: { v6: 38 },
      byStoragePolicy: { reduced_fixture_only: 38 },
    });
    expect(index.byFeatureTag).toMatchObject({
      inputs: 2,
      request: 6,
      runtime: 2,
      sessions: 3,
      strategy: 12,
      time: 2,
      timeframes: 1,
      ticker: 2,
      visuals: 9,
      alerts: 3,
      brackets: 1,
      boxes: 1,
      candles: 1,
      channels: 1,
      dashboard: 1,
      drawings: 3,
      imports: 1,
      libraries: 1,
      linefills: 1,
      methods: 1,
      multi_symbol: 1,
      objects: 1,
      performance: 1,
      polylines: 1,
      screener: 1,
      heikin_ashi: 3,
      signals: 5,
      state: 2,
      tables: 3,
      udf: 1,
      udt: 1,
      zigzag: 1,
      zones: 1,
    });
    expect(markdown).toContain('# Pine Compatibility Coverage');
    expect(markdown).toContain('Total checkpoints: 38');
    expect(markdown).toContain('| official_docs | 22 |');
    expect(markdown).toContain('| public_script | 16 |');
    expect(markdown).toContain('| reduced_fixture_only | 38 |');
    expect(formatPineCompatibilityCoverageJson(index)).toContain('"total": 38');
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

      expect(readFileSync(join(outDir, 'pine-compatibility-corpus.json'), 'utf8')).toContain('"passed": 38');
      expect(readFileSync(join(outDir, 'pine-compatibility-corpus.md'), 'utf8')).toContain('Pass rate: 100.0%');
      expect(readFileSync(join(outDir, 'pine-compatibility-coverage.json'), 'utf8')).toContain('"total": 38');
      expect(readFileSync(join(outDir, 'pine-compatibility-coverage.md'), 'utf8')).toContain('Total checkpoints: 38');
    } finally {
      rmSync(outDir, { recursive: true, force: true });
    }
  });
});
