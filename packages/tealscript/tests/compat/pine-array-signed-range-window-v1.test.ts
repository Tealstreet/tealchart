import { describe, expect, it } from 'vitest';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

describe('signed array ranges use the selected extrema without changing slots', () => {
  for (const version of [5, 6]) for (const method of [false, true]) for (const sliced of [false, true]) {
    it(`v${version} method=${method} slice=${sliced}`, () => {
      const values = [-31, 5, 17, -8];
      const result = runCompatScript(`//@version=${version}
indicator("Signed range")
parent = array.from(${sliced ? '-97, -31, 5, 17, -8, 101' : values.join(', ')})
a = ${sliced ? 'parent.slice(1, 5)' : 'parent'}
plot(${method ? 'a.range()' : 'array.range(id=a)'}, "Range")
${values.map((_, i) => `plot(a.get(${i}), "Source${i}")`).join('\n')}
plot(a.size(), "Size")`, { bars: compatibilityBars.slice(0, 3) });
      expect(result.errors).toEqual([]);
      expect(getPlot(result, 'Range').values).toEqual([48, 48, 48]);
      values.forEach((value, i) => expect(getPlot(result, `Source${i}`).values).toEqual([value, value, value]));
      expect(getPlot(result, 'Size').values).toEqual([4, 4, 4]);
    });
  }
});
