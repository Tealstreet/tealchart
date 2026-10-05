import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';
import { getPlot, runCompatScript } from './fixtures';

// Official v6 reference: barstate.isnew; ta.alma/ta.swma remarks and examples.
// Small constructed prices, never TradingView input rows.
const bars = Array.from({ length: 10 }, (_, i) => ({
  time: 1_700_000_000_000 + i * 60000,
  open: i + 1,
  high: i + 2,
  low: i,
  close: i + 1,
  volume: 10,
}));
describe('ledger1102-1106 ALMA', () => {
  it('propagates a physical hole until it leaves the length3 window; floor default is false', () => {
    const result = runCompatScript(
      `//@version=6
indicator("ALMA holes")
s = bar_index == 5 ? na : close
plot(ta.alma(s, 3, 0.25, 2), "default")
plot(ta.alma(s, 3, 0.25, 2, false), "unfloored")
plot(ta.alma(s, 3, 0.25, 2, true), "floored")`,
      { bars },
    );
    expect(result.errors).toEqual([]);
    const values = getPlot(result, 'default').values;
    expect(values.map((v) => v === null)).toEqual([true, true, false, false, false, true, true, true, false, false]);
    expect(values).toEqual(getPlot(result, 'unfloored').values);
    // Reference example Gaussian weighting: length3, center0.5, sigma width1.5.
    const weights = [0, 1, 2].map((i) => Math.exp(-((i - 0.5) ** 2) / 4.5));
    expect(values[2]).toBeCloseTo(
      (weights[0]! + 2 * weights[1]! + 3 * weights[2]!) / weights.reduce((a, b) => a + b),
      12,
    );
    expect(getPlot(result, 'floored').values[2]).not.toBeCloseTo(values[2]!, 8);
  });
  it.each(['3', 'bar_index % 2 + 2'])('accepts an integer-kind length%s', (length) => {
    const checked = checkProgram(parse(`//@version=6\nindicator("ALMA")\nplot(ta.alma(close, ${length}, 0.25, 2))`));
    expect(checked.diagnostics).toEqual([]);
  });
  it('refuses a float-kind length even when numerically integral', () => {
    expect(
      checkProgram(parse('//@version=6\nindicator("ALMA")\nplot(ta.alma(close, 3.0, 0.25, 2))')).diagnostics.some(
        (d) => d.severity === 'error',
      ),
    ).toBe(true);
  });
  it('accepts legacy positional alma and rejects global alias in v5', () => {
    const result = runCompatScript('//@version=4\nstudy("ALMA")\nplot(alma(close, 3, 0.25, 2), "legacy")', { bars });
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'legacy').values[2]).not.toBeNull();
    expect(
      checkProgram(parse('//@version=5\nindicator("ALMA")\nplot(alma(close, 3, 0.25, 2))')).diagnostics.some(
        (d) => d.severity === 'error',
      ),
    ).toBe(true);
  });
});
