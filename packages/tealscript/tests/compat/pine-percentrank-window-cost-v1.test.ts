import { describe, expect, it, vi } from 'vitest';

import { PercentRank } from '../../src/runtime/codegen/ta-classes';
import { getPlot, runCompatScript } from './fixtures';

const bars = Array.from({ length: 60 }, (_, index) => ({
  time: Date.UTC(2024, 0, 1, 0, index),
  open: index % 19,
  high: 30,
  low: -2,
  close: (index * 7) % 31,
  volume: 100,
}));

describe('TA percentrank advances retained windows without replaying every prefix', () => {
  it('a fixed identifier length computes once per chart bar', () => {
    const compute = vi.spyOn(PercentRank.prototype, 'compute');
    try {
      const result = runCompatScript(
        `//@version=6
indicator("Rank window cost")
n = 48
plot(ta.percentrank(close, n), "Rank")`,
        { bars },
      );
      expect(result.errors).toEqual([]);
      expect(getPlot(result, 'Rank').values).toHaveLength(bars.length);
      expect(getPlot(result, 'Rank').values.slice(0, 48)).toEqual(Array(48).fill(null));
      expect(compute).toHaveBeenCalledTimes(bars.length);
    } finally {
      compute.mockRestore();
    }
  });

  for (const length of [48, 240]) {
    it(`a retained series window of ${length} scans its preceding slots once`, () => {
      const get = vi.fn(() => 3);
      expect(PercentRank.computeWindow({ size: length + 1, capacity: length + 1, get }, length)).toBe(100);
      expect(get.mock.calls.length).toBeLessThanOrEqual(length + 2);
    });
  }
});
