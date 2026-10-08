import { describe, expect, it } from 'vitest';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

describe('array extrema use zero-based signed numeric ranks', () => {
  for (const version of [5, 6]) for (const method of [false, true]) for (const sliced of [false, true]) {
    it(`v${version} method=${method} slice=${sliced}`, () => {
      const source = [-31, 5, 17, -8, 43];
      const sorted = [-31, -8, 5, 17, 43];
      const result = runCompatScript(`//@version=${version}
indicator("Ranked extrema")
parent = array.from(${sliced ? '97, -31, 5, 17, -8, 43, -83' : source.join(', ')})
a = ${sliced ? 'parent.slice(1, 6)' : 'parent'}
${sorted.map((_, i) => `plot(${method ? `a.min(${i})` : `array.min(id=a, nth=${i})`}, "Min${i}")\nplot(${method ? `a.max(${i})` : `array.max(id=a, nth=${i})`}, "Max${i}")`).join('\n')}
${source.map((_, i) => `plot(a.get(${i}), "Source${i}")`).join('\n')}
plot(a.size(), "Size")`, { bars: compatibilityBars.slice(0, 3) });
      expect(result.errors).toEqual([]);
      sorted.forEach((value, i) => expect(getPlot(result, `Min${i}`).values).toEqual([value, value, value]));
      [...sorted].reverse().forEach((value, i) => expect(getPlot(result, `Max${i}`).values).toEqual([value, value, value]));
      source.forEach((value, i) => expect(getPlot(result, `Source${i}`).values).toEqual([value, value, value]));
      expect(getPlot(result, 'Size').values).toEqual([5, 5, 5]);
    });
  }
});
