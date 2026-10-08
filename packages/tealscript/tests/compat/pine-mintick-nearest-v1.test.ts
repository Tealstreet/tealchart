import { describe, expect, it } from 'vitest';

import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

// https://www.tradingview.com/pine-script-reference/v6/#fun_math.round_to_mintick
// The nearest tick is selected, with ties rounding up.
describe('documented mintick nearest selection', () => {
  it.each([
    { value: '1000000000000000.25', expected: 1000000000000000 },
    { value: '-1000000000000000.75', expected: -1000000000000001 },
    { value: '1000000000000000', expected: 1000000000000000 },
    { value: '4503599627370496', expected: 4503599627370496 },
    { value: '1000000000000000.75', expected: 1000000000000001 },
    { value: '-1000000000000000.25', expected: -1000000000000000 },
    { value: '0.5', expected: 1 },
    { value: '-0.5', expected: 0 },
    { value: 'na', expected: null },
  ])('rounds $value to the closest integer tick', ({ value, expected }) => {
    const result = runCompatScript(
      `//@version=6
indicator("Nearest tick")
plot(math.round_to_mintick(${value}), title="Positional")
plot(math.round_to_mintick(number=${value}), title="Named")`,
      {
        bars: compatibilityBars.slice(0, 2),
        engineOptions: { runtime: { syminfo: { mintick: 1 } } },
      },
    );
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Positional').values).toEqual([expected, expected]);
    expect(getPlot(result, 'Named').values).toEqual([expected, expected]);
  });

  it('preserves decimal compensation and exact quarter-tick ties', () => {
    for (const [tick, value, expected] of [
      [0.01, 1.005, 1.01],
      [0.25, 1.125, 1.25],
      [0.25, -1.125, -1],
    ]) {
      const result = runCompatScript(
        `//@version=6\nindicator("Tick controls")\nplot(math.round_to_mintick(${value}), title="Value")`,
        {
          bars: compatibilityBars.slice(0, 1),
          engineOptions: { runtime: { syminfo: { mintick: tick } } },
        },
      );
      expect(result.errors).toEqual([]);
      expect(getPlot(result, 'Value').values).toEqual([expected]);
    }
  });
});
