import { describe, expect, it } from 'vitest';

import { getPlot, runCompatScript } from '../../../tests/compat/fixtures';
import { PercentRank } from './ta-classes';

describe('ta.percentrank missing observations', () => {
  // DOC-vs-NATIVE: native wins (18ace021d3). coverage-register-ta-1-v1
  // rank_hole_builtin bars0..18: startup0..3, missing12/13, recovery14..18.
  it('DOC-vs-NATIVE: matches the captured current-hole and recovery ranks', () => {
    const result = runCompatScript(`//@version=6
indicator("Percent rank holes")
plot(ta.percentrank(close, 4), "Rank")
`, {
      bars: Array.from({ length: 19 }, (_, index) => ({
        time: index * 60_000, open: 10, high: 17, low: 9,
        close: index === 12 || index === 13 ? NaN : 10 + index % 7, volume: 1,
      })),
    });
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Rank').values).toEqual([
      null, null, null, null, 100, 100, 100, 0, 25, 50, 75, 100, 0, 0, 0, 25, 50, 75, 100,
    ]);
  });

  // 18ace021d3: native rank_leading_builtin counts previous physical slots; rollback is an internal control.
  it('restores the native prior-bar population on recompute and rollback', () => {
    const rank = new PercentRank(2);
    expect(rank.compute(NaN)).toBeNaN();
    expect(rank.compute(1)).toBeNaN();
    expect(rank.compute(2)).toBe(50);
    const saved = rank.save();
    expect(rank.compute(NaN)).toBe(0);
    expect(rank.recompute(3)).toBe(100);
    rank.restore(saved);
    expect(rank.compute(NaN)).toBe(0);
    expect(rank.compute(4)).toBe(50);
    expect(rank.compute(5)).toBe(50);
  });
});

// Native rank_hole_builtin/rank_leading_builtin in the register-ta-1 CSV
// retain missing slots rather than delaying the physical startup or denominator.
describe('native ta.percentrank missing observations', () => {
  it('counts preceding holes as false comparisons', () => {
    const result = runCompatScript(
      `//@version=6
indicator("Percent rank holes")
plot(ta.percentrank(close, 3), "Rank")
`,
      {
        bars: [1, 2, 3, NaN, 5, 6, 7].map((close, index) => ({
          time: index * 60_000,
          open: 1,
          high: 7,
          low: 1,
          close,
          volume: 1,
        })),
      },
    );
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Rank').values).toEqual([
      null,
      null,
      null,
      0,
      // Confirmed 9e9e494cff multiplies the count by 100 before division.
      66.66666666666667,
      66.66666666666667,
      66.66666666666667,
    ]);
  });

});
