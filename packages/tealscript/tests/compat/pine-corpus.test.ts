import { describe, expect, it } from 'vitest';

import {
  formatPineCompatibilityCorpusMarkdown,
  runPineCompatibilityCorpus,
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
});
