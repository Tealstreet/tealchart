import { describe, expect, it } from 'vitest';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

describe('numeric array interior missing fill retains distinct borders', () => {
  for (const version of [5, 6]) for (const receiver of [false, true]) {
    it(`v${version} receiver=${receiver}`, () => {
      const result = runCompatScript(`//@version=${version}
indicator("Interior missing array fill")
a = array.from(17.0, -8.0, 43.0, -31.0, 5.0)
alias = a
${receiver ? 'alias.fill(na, 1, 3)' : 'array.fill(index_to=3, value=na, id=alias, index_from=1)'}
${Array.from({ length: 5 }, (_, i) => `plot(array.get(a, ${i}), "Cell${i}")`).join('\n')}
plot(array.size(a), "Size")`, { bars: compatibilityBars.slice(0, 3) });
      expect(result.errors).toEqual([]);
      [17, null, null, -31, 5].forEach((value, i) => expect(getPlot(result, `Cell${i}`).values).toEqual([value, value, value]));
      expect(getPlot(result, 'Size').values).toEqual([5, 5, 5]);
    });
  }
});
