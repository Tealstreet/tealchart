import { describe, expect, it } from 'vitest';

import { PercentileLinearInterpolation } from '../../src/runtime/codegen/ta-classes';
import { getPlot, runCompatScript } from './fixtures';

// V8 missing-current attempt2: source3ae7a91b7e41c751, CSVbe448e406706ac4e.
// oracle-replay-v8/intake-v8-v9-b8f-v1/owner-packets-v1/linear-percentile-hole-recovery.json
// Captured source_index establishes origin0; current missing remains unavailable.
const cases = [
  { length: 3, source: [1, 3, 5, NaN, 7, 9, 11, 11], expected: [null, null, 4.5, null, null, 8.5, 10.5, 11] },
  { length: 4, source: [10, 14, 9, NaN, 8, 15, 10, 14], expected: [null, null, null, null, null, null, 12.5, 14.5] },
];
const available = (value: number) => (Number.isNaN(value) ? null : value);

describe('native v8 linear-percentile single-hole recovery', () => {
  it.each(cases)('publishes the captured length $length recovery', ({ length, source, expected }) => {
    const percentile = new PercentileLinearInterpolation(length, 75);
    expect(source.map((value) => available(percentile.compute(value)))).toEqual(expected);
  });

  it.each(cases)('retains length $length recovery through replacement and restore', ({ length, source, expected }) => {
    const percentile = new PercentileLinearInterpolation(length, 75);
    const values = source.map((value) => {
      const snapshot = percentile.save();
      percentile.compute(value);
      percentile.recompute(NaN);
      percentile.recompute(value);
      percentile.restore(snapshot);
      return available(percentile.compute(value));
    });
    expect(values).toEqual(expected);
  });

  it('retains both captured compiled calls and the finite replacement control', () => {
    const result = runCompatScript(
      `//@version=6
indicator("Linear missing-current rollback v1")
phase = bar_index % 16
src3 = switch phase
    0 => 1.0
    1 => 3.0
    2 => 5.0
    3 => float(na)
    4 => 7.0
    5 => 9.0
    => 11.0
src4 = switch phase
    0 => 10.0
    1 => 14.0
    2 => 9.0
    3 => float(na)
    4 => 8.0
    5 => 15.0
    6 => 10.0
    7 => 14.0
    => 9.0
replacement3 = phase == 3 ? 7.0 : src3
plot(src3, title="source_len3")
plot(ta.percentile_linear_interpolation(src3, 3, 75), title="linear_len3_pct75_missing_current")
plot(ta.percentile_linear_interpolation(replacement3, 3, 75), title="linear_len3_pct75_replacement7")
plot(src4, title="source_len4")
plot(ta.percentile_linear_interpolation(src4, 4, 75), title="linear_len4_pct75_single_hole")
plot(bar_index, title="source_index")`,
      {
        bars: Array.from({ length: 8 }, (_, index) => ({
          time: 1788134400000 + index * 120000,
          open: 1,
          high: 2,
          low: 0,
          close: 1,
          volume: 1,
        })),
      },
    );
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'linear_len3_pct75_missing_current').values).toEqual(cases[0]!.expected);
    expect(getPlot(result, 'linear_len4_pct75_single_hole').values).toEqual(cases[1]!.expected);
    expect(getPlot(result, 'linear_len3_pct75_replacement7').values).toEqual([null, null, 4.5, 6.5, 7, 8.5, 10.5, 11]);
    expect(getPlot(result, 'source_index').values).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
  });
});
