import { describe, expect, it } from 'vitest';

import { getPlot, runCompatScript } from './fixtures';

// ~/cs/docs/tealscript-parity-archive/reference/pine-v6-reference-v1.json: ta.highestbars remarks.
// Ledger840: source NA is ignored. Current-bar maximum avoids offset compression;
// only the fourth bar is asserted, without pinning missing-bar output or expanded horizons.
describe('ledger840: highestbars missing source', () => {
  it('finds the current maximum after a source hole', () => {
    const bars = [1, 5, 2, 7].map((close, index) => ({
      time: (index + 1) * 60_000, open: close, high: close + 1, low: close - 1, close, volume: 1,
    }));
    const result = runCompatScript(`//@version=6
indicator("Highestbars hole")
source = bar_index == 1 ? na : close
plot(ta.highestbars(source, 3), "Offset")`, { bars });
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Offset').values[3]).toBe(0);
  });
});
