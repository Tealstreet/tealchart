import { describe, expect, it } from 'vitest';

import {
  FAST_CORPUS_REFUSAL_GATE_EXPECTED_ROWS,
  runFastCorpusRefusalGate,
} from '../../scripts/run-external-pine-corpus-refusal-gate.ts';

describe('external Pine corpus fast refusal gate', () => {
  it('keeps a small refusal subset failing with the expected diagnostics', async () => {
    const { report, failures } = await runFastCorpusRefusalGate();

    expect(report.rows).toHaveLength(FAST_CORPUS_REFUSAL_GATE_EXPECTED_ROWS);
    expect(failures, [
      'The fast corpus refusal gate catches correct refusal regressions on this selected subset only.',
      'It asserts specific diagnostics so a different failure cannot mask a lost refusal.',
      ...failures.map(
        (failure) => `${failure.localPath}: expected ${failure.expectedFailureStage} containing ${failure.expectedDiagnosticIncludes}, actual ${failure.actualOutcome} at ${failure.actualFailureStage ?? 'none'} (${failure.actualDiagnostic})`,
      ),
    ].join('\n')).toEqual([]);
    expect(report.summary.funnel.output.count).toBe(0);
  });
});
