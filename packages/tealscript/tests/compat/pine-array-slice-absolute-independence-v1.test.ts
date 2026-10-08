import { describe, expect, it } from 'vitest';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

describe('array absolute values selected window independence', () => {
  for (const version of [5, 6]) for (const method of [false, true]) {
    it(`v${version} method=${method}`, () => {
      const call = method ? 's.abs()' : 'array.abs(id=s)';
      const result = runCompatScript(`//@version=${version}
indicator("Slice absolute values")
a = array.from(-101, -17, 0, 43, -5, -103)
s = a.slice(1, 5)
b = ${call}
${Array.from({ length: 4 }, (_, i) => `plot(b.get(${i}), "Before${i}")`).join('\n')}
b.set(0, 71)
b.push(97)
s.set(3, -31)
${Array.from({ length: 6 }, (_, i) => `plot(a.get(${i}), "Parent${i}")`).join('\n')}
${Array.from({ length: 5 }, (_, i) => `plot(b.get(${i}), "Result${i}")`).join('\n')}
plot(a.size(), "ParentSize")
plot(s.size(), "SliceSize")`, { bars: compatibilityBars.slice(0, 3) });
      expect(result.errors).toEqual([]);
      [17, 0, 43, 5].forEach((value, i) => expect(getPlot(result, `Before${i}`).values).toEqual([value, value, value]));
      [-101, -17, 0, 43, -31, -103].forEach((value, i) => expect(getPlot(result, `Parent${i}`).values).toEqual([value, value, value]));
      [71, 0, 43, 5, 97].forEach((value, i) => expect(getPlot(result, `Result${i}`).values).toEqual([value, value, value]));
      expect(getPlot(result, 'ParentSize').values).toEqual([6, 6, 6]);
      expect(getPlot(result, 'SliceSize').values).toEqual([4, 4, 4]);
    });
  }
});
