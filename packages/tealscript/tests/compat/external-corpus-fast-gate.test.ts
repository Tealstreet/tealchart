import { describe, expect, it } from 'vitest';

import {
  FAST_CORPUS_GATE_EXPECTED_ROWS,
  runFastCorpusAcceptanceGate,
} from '../../scripts/run-external-pine-corpus-fast-gate.ts';

describe('external Pine corpus fast acceptance gate', () => {
  it('keeps a small real-script subset producing output', async () => {
    const { report, failures } = await runFastCorpusAcceptanceGate();

    expect(report.rows).toHaveLength(FAST_CORPUS_GATE_EXPECTED_ROWS);
    expect(failures, [
      'The fast corpus gate catches acceptance regressions on this selected real-script subset only.',
      'It does not replace the full pinned v5/v6/v7 corpus rerun or prove the whole corpus is clean.',
      ...failures.map(
        (failure) => `${failure.localPath}: ${failure.outcome} at ${failure.firstFailedStage ?? 'none'} (${failure.diagnostic})`,
      ),
    ].join('\n')).toEqual([]);
    expect(report.summary.funnel.output.count).toBe(FAST_CORPUS_GATE_EXPECTED_ROWS);
  });
});
