import { describe, expect, it } from 'vitest';

import {
  createPineCompatibilityCoverageIndex,
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
    expect(compatibilityCheckpointLedger.entries).toHaveLength(11);
    expect(run.summary.total).toBe(11);
    expect(run.summary.passed).toBe(11);
    expect(run.summary.failed).toBe(0);
    expect(run.summary.validationErrors).toEqual({});
    expect(run.summary.byFeatureTag).toMatchObject({
      request: { total: 2, passed: 2, failed: 0 },
      strategy: { total: 3, passed: 3, failed: 0 },
      visuals: { total: 2, passed: 2, failed: 0 },
    });
    expect(run.outcomes.map((outcome) => outcome.scriptId)).toContain('public-mtf-trend-checkpoint');
  });

  it('renders a stable checkpoint corpus report', () => {
    const markdown = formatPineCompatibilityCorpusMarkdown(runPineCompatibilityCorpus(compatibilityCheckpointCorpus));

    expect(markdown).toContain('Total: 11');
    expect(markdown).toContain('Pass rate: 100.0%');
    expect(markdown).toContain('| strategy | 3 | 3 | 0 |');
    expect(markdown).toContain('| request | 2 | 2 | 0 |');
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

    expect(run.summary.total).toBe(11);
    expect(run.summary.passed).toBe(11);
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
      total: 11,
      byCategory: { indicator: 8, strategy: 3 },
      bySourceKind: { official_docs: 8, public_script: 3 },
      byPineVersion: { v6: 11 },
      byStoragePolicy: { reduced_fixture_only: 11 },
    });
    expect(index.byFeatureTag).toMatchObject({
      request: 2,
      strategy: 3,
      visuals: 2,
    });
    expect(markdown).toContain('# Pine Compatibility Coverage');
    expect(markdown).toContain('Total checkpoints: 11');
    expect(markdown).toContain('| official_docs | 8 |');
    expect(markdown).toContain('| reduced_fixture_only | 11 |');
  });
});
