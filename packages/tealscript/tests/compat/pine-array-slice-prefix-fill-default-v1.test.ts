import { describe, expect, it } from 'vitest';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

describe('array slice prefix fill omitted start', () => {
  for (const version of [5, 6]) for (const method of [false, true]) for (const explicit of [false, true]) {
    it(`v${version} method=${method} explicit=${explicit}`, () => {
      const start = explicit ? ', index_from=0' : '';
      const call = method ? `s.fill(index_to=2, value=-31${start})` : `array.fill(index_to=2, value=-31, id=s${start})`;
      const result = runCompatScript(`//@version=${version}
indicator("Slice prefix fill")
a = array.from(101, 17, -8, 43, 5, 103)
s = a.slice(1, 5)
${call}
${Array.from({ length: 6 }, (_, i) => `plot(a.get(${i}), "Cell${i}")`).join('\n')}
plot(a.size(), "ParentSize")
plot(s.size(), "SliceSize")`, { bars: compatibilityBars.slice(0, 3) });
      expect(result.errors).toEqual([]);
      [101, -31, -31, 43, 5, 103].forEach((value, i) => {
        expect(getPlot(result, `Cell${i}`).values).toEqual([value, value, value]);
      });
      expect(getPlot(result, 'ParentSize').values).toEqual([6, 6, 6]);
      expect(getPlot(result, 'SliceSize').values).toEqual([4, 4, 4]);
    });
  }
});
