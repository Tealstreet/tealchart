import { describe, expect, it } from 'vitest';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

describe('slice fill uses local half-open bounds and retains missing parent borders', () => {
  for (const version of [5, 6]) for (const method of [false, true]) {
    it(`v${version} method=${method}`, () => {
      const missing = [97, -31, 17, null, null, 43, null, -83];
      const finite = [97, -31, 17, 5.5, 5.5, 43, null, -83];
      const result = runCompatScript(`//@version=${version}
indicator("Slice fill missing bounds")
parent = array.from(97.0, -31.0, 17.0, float(na), -8.0, 43.0, float(na), -83.0)
s = parent.slice(2, 6)
${method ? 's.fill(na, 1, 3)' : 'array.fill(id=s, index_to=3, value=na, index_from=1)'}
${missing.map((_, i) => `plot(parent.get(${i}), "MissingParent${i}")`).join('\n')}
${[17, null, null, 43].map((_, i) => `plot(s.get(${i}), "MissingSlice${i}")`).join('\n')}
${method ? 's.fill(5.5, 1, 3)' : 'array.fill(id=s, value=5.5, index_from=1, index_to=3)'}
${finite.map((_, i) => `plot(parent.get(${i}), "FiniteParent${i}")`).join('\n')}
${[17, 5.5, 5.5, 43].map((_, i) => `plot(s.get(${i}), "FiniteSlice${i}")`).join('\n')}
plot(parent.size(), "ParentSize")
plot(s.size(), "SliceSize")`, { bars: compatibilityBars.slice(0, 3) });
      expect(result.errors).toEqual([]);
      const check = (prefix: string, values: (number | null)[]) => values.forEach((value, i) => expect(getPlot(result, `${prefix}${i}`).values).toEqual([value, value, value]));
      check('MissingParent', missing);
      check('MissingSlice', [17, null, null, 43]);
      check('FiniteParent', finite);
      check('FiniteSlice', [17, 5.5, 5.5, 43]);
      expect(getPlot(result, 'ParentSize').values).toEqual([8, 8, 8]);
      expect(getPlot(result, 'SliceSize').values).toEqual([4, 4, 4]);
    });
  }
});
