import { describe, expect, it } from 'vitest';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

// https://www.tradingview.com/pine-script-reference/v6/#fun_array.abs
describe('array abs transforms every signed finite cell in place order', () => {
  for (const version of [5, 6]) for (const receiver of [false, true]) for (const fractional of [false, true]) {
    it(`v${version} ${receiver ? 'receiver' : 'namespace'} ${fractional ? 'float' : 'int'}`, () => {
      const call = receiver ? 'values.abs()' : 'array.abs(id=values)';
      const sourceValues = fractional ? '-2.5, 3.25, -4.75' : '-2, 3, -4';
      const result = runCompatScript(`//@version=${version}
indicator("Signed array absolute cells")
values = array.from(${sourceValues})
absolute = ${call}
plot(absolute.get(0), "First")
plot(absolute.get(1), "Middle")
plot(absolute.get(2), "Last")
plot(absolute.size(), "Size")`, { bars: compatibilityBars.slice(0, 2) });
      expect(result.errors).toEqual([]);
      const expected = fractional ? [2.5, 3.25, 4.75] : [2, 3, 4];
      for (const [index, title] of ['First', 'Middle', 'Last'].entries()) {
        expect(getPlot(result, title).values).toEqual([expected[index], expected[index]]);
      }
      expect(getPlot(result, 'Size').values).toEqual([3, 3]);
    });
  }
});
