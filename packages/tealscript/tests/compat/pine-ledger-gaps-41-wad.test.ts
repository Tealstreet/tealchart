import { describe, expect, it } from 'vitest';

import { getPlot, runCompatScript } from './fixtures';

// Authority: ~/cs/docs/tealscript-parity-archive/reference/pine-v6-reference-v1.json variables[24].
// Rank1616: only the selected momentum branch contributes; cumulative na inputs remain unasserted.
const source = '//@version=6\nindicator("Williams accumulation distribution")\nplot(ta.wad, "value")';
const first = { time: 1700000000000, open: 10, high: 12, low: 8, close: 10, volume: 100 };

describe('documented Williams accumulation branch composition', () => {
  it('uses low on a rise even when the unused high is missing', () => {
    const result = runCompatScript(source, {
      bars: [first, { ...first, time: first.time + 60000, high: NaN, low: 9, close: 11 }],
    });
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'value').values).toEqual([0, 2]);
  });

  it('uses high on a fall even when the unused low is missing', () => {
    const result = runCompatScript(source, {
      bars: [first, { ...first, time: first.time + 60000, high: 12, low: NaN, close: 9 }],
    });
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'value').values).toEqual([0, -3]);
  });
});
