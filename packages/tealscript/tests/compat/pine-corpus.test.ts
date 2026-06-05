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
    expect(compatibilityCheckpointLedger.entries).toHaveLength(26);
    expect(run.summary.total).toBe(26);
    expect(run.summary.passed).toBe(26);
    expect(run.summary.failed).toBe(0);
    expect(run.summary.validationErrors).toEqual({});
    expect(run.summary.byFeatureTag).toMatchObject({
      inputs: { total: 2, passed: 2, failed: 0 },
      request: { total: 4, passed: 4, failed: 0 },
      runtime: { total: 2, passed: 2, failed: 0 },
      sessions: { total: 2, passed: 2, failed: 0 },
      strategy: { total: 10, passed: 10, failed: 0 },
      time: { total: 2, passed: 2, failed: 0 },
      timeframes: { total: 1, passed: 1, failed: 0 },
      ticker: { total: 1, passed: 1, failed: 0 },
      visuals: { total: 5, passed: 5, failed: 0 },
      dashboard: { total: 1, passed: 1, failed: 0 },
      signals: { total: 1, passed: 1, failed: 0 },
      tables: { total: 1, passed: 1, failed: 0 },
    });
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('public-mtf-trend-checkpoint');
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('public-dashboard-table-checkpoint');
  });

  it('renders a stable checkpoint corpus report', () => {
    const markdown = formatPineCompatibilityCorpusMarkdown(runPineCompatibilityCorpus(compatibilityCheckpointCorpus));

    expect(markdown).toContain('Total: 26');
    expect(markdown).toContain('Pass rate: 100.0%');
    expect(markdown).toContain('| inputs | 2 | 2 | 0 |');
    expect(markdown).toContain('| runtime | 2 | 2 | 0 |');
    expect(markdown).toContain('| sessions | 2 | 2 | 0 |');
    expect(markdown).toContain('| strategy | 10 | 10 | 0 |');
    expect(markdown).toContain('| time | 2 | 2 | 0 |');
    expect(markdown).toContain('| timeframes | 1 | 1 | 0 |');
    expect(markdown).toContain('| request | 4 | 4 | 0 |');
    expect(markdown).toContain('| dashboard | 1 | 1 | 0 |');
    expect(markdown).toContain('| tables | 1 | 1 | 0 |');
    expect(markdown).toContain('| ticker | 1 | 1 | 0 |');
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

    expect(run.summary.total).toBe(26);
    expect(run.summary.passed).toBe(26);
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
      total: 26,
      byCategory: { indicator: 16, strategy: 10 },
      bySourceKind: { official_docs: 22, public_script: 4 },
      byPineVersion: { v6: 26 },
      byStoragePolicy: { reduced_fixture_only: 26 },
    });
    expect(index.byFeatureTag).toMatchObject({
      inputs: 2,
      request: 4,
      runtime: 2,
      sessions: 2,
      strategy: 10,
      time: 2,
      timeframes: 1,
      ticker: 1,
      visuals: 5,
      dashboard: 1,
      signals: 1,
      tables: 1,
    });
    expect(markdown).toContain('# Pine Compatibility Coverage');
    expect(markdown).toContain('Total checkpoints: 26');
    expect(markdown).toContain('| official_docs | 22 |');
    expect(markdown).toContain('| public_script | 4 |');
    expect(markdown).toContain('| reduced_fixture_only | 26 |');
    expect(formatPineCompatibilityCoverageJson(index)).toContain('"total": 26');
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

      expect(readFileSync(join(outDir, 'pine-compatibility-corpus.json'), 'utf8')).toContain('"passed": 26');
      expect(readFileSync(join(outDir, 'pine-compatibility-corpus.md'), 'utf8')).toContain('Pass rate: 100.0%');
      expect(readFileSync(join(outDir, 'pine-compatibility-coverage.json'), 'utf8')).toContain('"total": 26');
      expect(readFileSync(join(outDir, 'pine-compatibility-coverage.md'), 'utf8')).toContain('Total checkpoints: 26');
    } finally {
      rmSync(outDir, { recursive: true, force: true });
    }
  });
});
