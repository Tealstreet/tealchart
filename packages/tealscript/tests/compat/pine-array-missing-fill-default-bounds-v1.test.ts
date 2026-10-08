import { describe, expect, it } from 'vitest';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

describe('omitted numeric array fill bounds cover all cells and supplied suffix', () => {
  for (const version of [5, 6]) for (const receiver of [false, true]) {
    it(`v${version} receiver=${receiver}`, () => {
      const result = runCompatScript(`//@version=${version}
indicator("Missing full and suffix fill")
a = array.from(17.0, -8.0, 43.0, -31.0)
${receiver ? 'a.fill(na)' : 'array.fill(value=na, id=a)'}
${Array.from({ length: 4 }, (_, i) => `plot(array.get(a, ${i}), "Full${i}")`).join('\n')}
${receiver ? 'a.fill(5.0, 2)' : 'array.fill(index_from=2, id=a, value=5.0)'}
${Array.from({ length: 4 }, (_, i) => `plot(array.get(a, ${i}), "Suffix${i}")`).join('\n')}
plot(array.size(a), "Size")`, { bars: compatibilityBars.slice(0, 3) });
      expect(result.errors).toEqual([]);
      for (let i = 0; i < 4; i++) expect(getPlot(result, `Full${i}`).values).toEqual([null, null, null]);
      [null, null, 5, 5].forEach((value, i) => expect(getPlot(result, `Suffix${i}`).values).toEqual([value, value, value]));
      expect(getPlot(result, 'Size').values).toEqual([4, 4, 4]);
    });
  }
});
