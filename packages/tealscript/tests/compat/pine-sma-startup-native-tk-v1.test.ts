import { describe, expect, it } from 'vitest';
import { getPlot, runCompatScript } from './fixtures';

// Native v2 primitives-sma-stdev attempt2, first three confirmed chart bars.
describe('Native SMA first qualifying mean', () => {
  for (const length of [2, 3]) {
    for (const input of [false, true]) {
      it(`length=${length} input=${input}`, () => {
        const closes = [77674.04, 77758.24, 77740.01];
        const bars = closes.map((close, index) => ({
          time: 1788134400000 + index * 120000,
          open: [77682, 77674.5, 77758.24][index],
          high: [77682.01, 77780.34, 77827.99][index],
          low: [77572, 77646, 77724][index], close, volume: 1,
        }));
        const result = runCompatScript(`//@version=6
indicator("Native SMA startup")
length = ${input ? `input.int(${length})` : length}
plot(ta.sma(close, length), "Mean")`, { bars });
        expect(result.errors).toEqual([]);
        expect(result.profile.compiledBarErrors?.count ?? 0).toBe(0);
        expect(getPlot(result, 'Mean').values).toEqual(length === 2
          ? [null, 77716.14, 77749.125]
          : [null, null, 77724.09666666666]);
      });
    }
  }
});
