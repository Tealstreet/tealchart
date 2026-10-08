import { describe, expect, it } from 'vitest';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

// https://www.tradingview.com/pine-script-reference/v6/#fun_array.range
describe('array range is maximum minus minimum over signed finite values', () => {
  for (const version of [5, 6]) for (const receiver of [false, true]) for (const mixed of [false, true]) {
    it(`v${version} ${receiver ? 'receiver' : 'namespace'} ${mixed ? 'mixed signs' : 'all negative'}`, () => {
      const call = receiver ? 'values.range()' : 'array.range(id=values)';
      const result = runCompatScript(`//@version=${version}
indicator("Signed finite array range")
values = array.from(-7.5, ${mixed ? '2.25' : '-2.25'}, -1.0)
plot(${call}, "Range")`, { bars: compatibilityBars.slice(0, 2) });
      expect(result.errors).toEqual([]);
      const expected = mixed ? 9.75 : 6.5;
      expect(getPlot(result, 'Range').values).toEqual([expected, expected]);
    });
  }
});
