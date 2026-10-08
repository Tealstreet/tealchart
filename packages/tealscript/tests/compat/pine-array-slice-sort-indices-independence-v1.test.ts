import { describe, expect, it } from 'vitest';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

describe('slice sorted index result independence', () => {
  for (const version of [5, 6]) for (const method of [false, true]) {
    it(`v${version} method=${method}`, () => {
      const call = method ? 's.sort_indices()' : 'array.sort_indices(s)';
      const result = runCompatScript(`//@version=${version}
indicator("Slice indices independence")
a = array.from(101, 17, -8, 43, 5, 103)
s = a.slice(1, 5)
indices = ${call}
plot(indices.get(0), "Before0")
plot(indices.get(1), "Before1")
plot(indices.get(2), "Before2")
plot(indices.get(3), "Before3")
indices.set(0, 99)
indices.push(97)
s.set(2, -31)
${Array.from({ length: 6 }, (_, i) => `plot(a.get(${i}), "Parent${i}")`).join('\n')}
${Array.from({ length: 5 }, (_, i) => `plot(indices.get(${i}), "Result${i}")`).join('\n')}
plot(a.size(), "ParentSize")
plot(s.size(), "SliceSize")`, { bars: compatibilityBars.slice(0, 3) });
      expect(result.errors).toEqual([]);
      [1, 3, 0, 2].forEach((value, i) => expect(getPlot(result, `Before${i}`).values).toEqual([value, value, value]));
      [101, 17, -8, -31, 5, 103].forEach((value, i) => expect(getPlot(result, `Parent${i}`).values).toEqual([value, value, value]));
      [99, 3, 0, 2, 97].forEach((value, i) => expect(getPlot(result, `Result${i}`).values).toEqual([value, value, value]));
      expect(getPlot(result, 'ParentSize').values).toEqual([6, 6, 6]);
      expect(getPlot(result, 'SliceSize').values).toEqual([4, 4, 4]);
    });
  }
});
