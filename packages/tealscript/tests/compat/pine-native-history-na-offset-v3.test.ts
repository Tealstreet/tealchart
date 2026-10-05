import { describe, expect, it } from 'vitest';
import { getPlot, runCompatScript } from './fixtures';

const bars = [
  {
    "time": 1788134400000.0,
    "open": 77682.0,
    "high": 77682.01,
    "low": 77572.0,
    "close": 77674.04,
    "volume": 0.0
  },
  {
    "time": 1788134520000.0,
    "open": 77674.5,
    "high": 77780.34,
    "low": 77646.0,
    "close": 77758.24,
    "volume": 0.0
  },
  {
    "time": 1788134640000.0,
    "open": 77758.24,
    "high": 77827.99,
    "low": 77724.0,
    "close": 77740.01,
    "volume": 0.0
  }
];

// Native authority: oracle-probes/v3/captures/v3/history-02-unavailable-offset-attempt1.csv.
describe('native v3 history offsets', () => {
  it('close[int(na)] returns the current close', () => {
    const result = runCompatScript(`//@version=6
indicator("V3-HISTORY-UNAVAILABLE-OFFSET")
plot(close[int(na)], "OUTCOME")
`, { bars });
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'OUTCOME').values).toEqual(bars.map(bar => bar.close));
  });
});
