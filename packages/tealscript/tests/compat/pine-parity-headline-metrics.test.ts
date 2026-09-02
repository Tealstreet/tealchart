import { describe, expect, it } from 'vitest';

import { checkPineParityHeadlineMetricsBlocks } from '../../scripts/update-pine-parity-headline-metrics.ts';

describe('Pine parity headline metrics docs', () => {
  it('keeps generated reviewer-facing metrics single-sourced', async () => {
    await expect(checkPineParityHeadlineMetricsBlocks()).resolves.toEqual([]);
  });
});
