import { describe, expect, it } from 'vitest';

import { getPlot, runCompatScript } from './fixtures';

// https://www.tradingview.com/pine-script-reference/v6/#fun_ta.cmo
// Exact gain/loss sums retain flat steps; affine reflection exchanges the sums.
describe('CMO finite gain and loss symmetry', () => {
  it('length 2 preserves scale/translation and reverses reflected source', () => {
    const bars = [-6, 2, 2, -3, 12, -8, 7].map((close, index) => ({
      time: 1_700_000_000_000 + index * 60_000,
      open: close,
      high: close + 2,
      low: close - 3,
      close,
      volume: 100,
    }));
    const result = runCompatScript(
      `//@version=6
indicator("CMO affine controls")
plot(ta.cmo(close, 2), "Original")
plot(ta.cmo(2 * close + 11, 2), "Scaled")
plot(ta.cmo(-2 * close + 11, 2), "Reflected")`,
      { bars },
    );
    expect(result.errors).toEqual([]);
    const expected = [100, -100, 50, -100 / 7, -100 / 7];
    for (const [title, sign] of [
      ['Original', 1],
      ['Scaled', 1],
      ['Reflected', -1],
    ] as const) {
      const values = getPlot(result, title).values.slice(2);
      expect(values).toHaveLength(expected.length);
      values.forEach((value, index) => expect(value).toBeCloseTo(sign * expected[index]!, 12));
    }
  });
  it('length 4 preserves scale/translation and reverses reflected source', () => {
    const bars = [-6, 2, 2, -3, 12, -8, 7].map((close, index) => ({
      time: 1_700_000_000_000 + index * 60_000,
      open: close,
      high: close + 2,
      low: close - 3,
      close,
      volume: 100,
    }));
    const result = runCompatScript(
      `//@version=6
indicator("CMO affine controls")
plot(ta.cmo(close, 4), "Original")
plot(ta.cmo(2 * close + 11, 4), "Scaled")
plot(ta.cmo(-2 * close + 11, 4), "Reflected")`,
      { bars },
    );
    expect(result.errors).toEqual([]);
    const expected = [450 / 7, -25, 100 / 11];
    for (const [title, sign] of [
      ['Original', 1],
      ['Scaled', 1],
      ['Reflected', -1],
    ] as const) {
      const values = getPlot(result, title).values.slice(4);
      expect(values).toHaveLength(expected.length);
      values.forEach((value, index) => expect(value).toBeCloseTo(sign * expected[index]!, 12));
    }
  });
});
