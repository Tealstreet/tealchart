import { describe, expect, it } from 'vitest';

import { PercentileLinearInterpolation } from '../../src/runtime/codegen/ta-classes';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

// Returned v13 source SHA3ab123bce4e7; capture SHAf0db1d4bd934.
// Native bar5=13 contradicts entry835's blanket source-NA remark.
const source = `//@version=6
indicator("Linear percentile single hole length3 percentage50 v1", precision=16)
source = switch bar_index
    0 => 10.0
    1 => 11.0
    2 => 12.0
    3 => float(na)
    4 => 13.0
    5 => 13.0
    => 14.0
result = ta.percentile_linear_interpolation(source, 3, 50.0)
plot(bar_index, "INPUT_BAR_INDEX", display=display.data_window)
plot(source, "SOURCE", display=display.data_window)
plot(result, "PERCENTILE", display=display.data_window)
plot(na(result) ? 1 : 0, "RESULT_NA", display=display.data_window)
`;
const expected = [null, null, 11, null, null, 13, 13, 14];

describe('TOP20 job 10 native percentile overrides prose conflict', () => {
  it('retains exact captured missing slots and finite recovery before hole eviction', () => {
    const bars = Array.from({ length: 8 }, (_, index) => ({
      ...compatibilityBars[0],
      time: compatibilityBars[0].time + index * 60_000,
    }));
    const result = runCompatScript(source, { bars });
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'PERCENTILE').values).toEqual(expected);
    expect(getPlot(result, 'RESULT_NA').values).toEqual([1, 1, 0, 1, 1, 0, 0, 0]);
  });

  it('preserves captured recovery through snapshot and same-bar replacement', () => {
    const linear = new PercentileLinearInterpolation(3, 50);
    for (const [index, value] of [10, 11, 12, NaN, 13, 13, 14, 14].entries()) {
      const snapshot = linear.save();
      const actual = linear.compute(value);
      expect(Number.isNaN(actual) ? null : actual).toBe(expected[index]);
      linear.recompute(99);
      const replaced = linear.recompute(value);
      expect(Number.isNaN(replaced) ? null : replaced).toBe(expected[index]);
      linear.restore(snapshot);
      const replayed = linear.compute(value);
      expect(Number.isNaN(replayed) ? null : replayed).toBe(expected[index]);
    }
  });
});
