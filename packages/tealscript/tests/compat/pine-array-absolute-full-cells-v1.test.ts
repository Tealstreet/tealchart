import { describe, expect, it } from 'vitest';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

describe('array absolute values preserve every source cell', () => {
  for (const version of [5, 6]) for (const method of [false, true]) {
    it(`v${version} method=${method}`, () => {
      const source = [-31.25, 0, 5.5, -8.25, 17.5];
      const expected = [31.25, 0, 5.5, 8.25, 17.5];
      const result = runCompatScript(`//@version=${version}
indicator("Absolute cells")
a = array.from(${source.join(', ')})
b = ${method ? 'a.abs()' : 'array.abs(id=a)'}
${source.map((_, i) => `plot(a.get(${i}), "Source${i}")\nplot(b.get(${i}), "Abs${i}")`).join('\n')}
b.set(0, 43)
a.set(2, -53)
plot(a.get(0), "SourceRetained")
plot(b.get(2), "ResultRetained")
plot(a.size(), "SourceSize")
plot(b.size(), "ResultSize")`, { bars: compatibilityBars.slice(0, 3) });
      expect(result.errors).toEqual([]);
      source.forEach((value, i) => expect(getPlot(result, `Source${i}`).values).toEqual([value, value, value]));
      expected.forEach((value, i) => expect(getPlot(result, `Abs${i}`).values).toEqual([value, value, value]));
      expect(getPlot(result, 'SourceRetained').values).toEqual([-31.25, -31.25, -31.25]);
      expect(getPlot(result, 'ResultRetained').values).toEqual([5.5, 5.5, 5.5]);
      for (const title of ['SourceSize', 'ResultSize']) expect(getPlot(result, title).values).toEqual([5, 5, 5]);
    });
  }
});
