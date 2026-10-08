import { describe, expect, it } from 'vitest';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

describe('array numeric sorting distinguishes signed magnitude and decimal text', () => {
  for (const version of [5, 6]) for (const receiver of [false, true]) for (const descending of [false, true]) {
    it(`v${version} receiver=${receiver} descending=${descending}`, () => {
      const order = descending ? 'order.descending' : 'order.ascending';
      const result = runCompatScript(`//@version=${version}
indicator("Numeric comparator discrimination")
a = array.from(-3.5, 12.5, -20.0, 2.25, 10.0)
alias = a
${receiver ? `alias.sort(${order})` : `array.sort(alias, ${order})`}
${Array.from({ length: 5 }, (_, i) => `plot(array.get(a, ${i}), "Cell${i}")`).join('\n')}
plot(array.size(a), "Size")`, { bars: compatibilityBars.slice(0, 3) });
      expect(result.errors).toEqual([]);
      const expected = descending ? [12.5, 10, 2.25, -3.5, -20] : [-20, -3.5, 2.25, 10, 12.5];
      expected.forEach((value, i) => expect(getPlot(result, `Cell${i}`).values).toEqual([value, value, value]));
      expect(getPlot(result, 'Size').values).toEqual([5, 5, 5]);
    });
  }
});
