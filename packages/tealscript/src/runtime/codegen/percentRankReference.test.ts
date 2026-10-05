import { expect, it } from 'vitest';

import { PercentRank } from './ta-classes';

// DOC-vs-NATIVE: native wins (18ace021d3). coverage-register-ta-1-v1
// rank_leading_builtin bars0..18; bars4..6 rank25/50/75, while rank_clean_builtin ranks100.
it('DOC-vs-NATIVE: matches the captured leading-hole population', () => {
  const rank = new PercentRank(4);
  const values = Array.from({ length: 19 }, (_, index) => {
    const value = rank.compute(index < 3 ? NaN : 10 + index % 7);
    return Number.isNaN(value) ? null : value;
  });
  expect(values).toEqual([
    null, null, null, null, 25, 50, 75, 0, 25, 50, 75, 100, 100, 100, 0, 25, 50, 75, 100,
  ]);
});

// 18ace021d3 / native rank_hole_builtin bars12-13: current NA ranks zero; recompute/restore retains the prior window.
it('replaces and restores the native percentrank prior-bar window', () => {
  const rank = new PercentRank(3);
  [1, 3, 5].forEach((value) => rank.compute(value));
  const snapshot = rank.save();
  expect(rank.compute(NaN)).toBe(0);
  expect(rank.recompute(4)).toBeCloseTo(200 / 3, 12);
  rank.restore(snapshot);
  expect(rank.compute(4)).toBeCloseTo(200 / 3, 12);
});

// Native rank_hole_builtin in oracle-probes/v2/captures/v2/coverage-register-ta-1-v1.csv
// counts missing prior comparisons as false, including a missing current source.
// Confirmed 9e9e494cff multiplies the count by 100 before division.
it('retains missing prior slots in the native percentrank denominator', () => {
  const rank = new PercentRank(3);
  expect(
    [1, 3, 5, NaN, 7, 9, 11].map((value) => rank.compute(value)).map((value) => (Number.isNaN(value) ? null : value)),
  ).toEqual([null, null, null, 0, 66.66666666666667, 66.66666666666667, 66.66666666666667]);
});
