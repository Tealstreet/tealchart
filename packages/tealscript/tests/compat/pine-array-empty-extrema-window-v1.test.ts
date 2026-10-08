import { describe, expect, it } from 'vitest';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

describe('empty extrema preserve unavailable results and their selected window', () => {
  for (const version of [5, 6]) for (const method of [false, true]) for (const sliced of [false, true]) {
    it(`v${version} method=${method} slice=${sliced}`, () => {
      const call = (name: string, rank: number) => method ? `a.${name}(${rank})` : `array.${name}(id=a, nth=${rank})`;
      const result = runCompatScript(`//@version=${version}
indicator("Empty extrema")
parent = ${sliced ? 'array.from(-31, 5, 43)' : 'array.new<int>(0)'}
a = ${sliced ? 'parent.slice(1, 2)' : 'parent'}
${sliced ? 'a.pop()' : ''}
plot(${call('min', 0)}, "Min0")
plot(${call('max', 0)}, "Max0")
plot(${call('min', 2)}, "Min2")
plot(${call('max', 2)}, "Max2")
plot(a.size(), "Size")
plot(parent.size(), "ParentSize")
${sliced ? 'plot(parent.get(0), "Left")\nplot(parent.get(1), "Right")' : ''}`, { bars: compatibilityBars.slice(0, 3) });
      expect(result.errors).toEqual([]);
      for (const title of ['Min0', 'Max0', 'Min2', 'Max2']) expect(getPlot(result, title).values).toEqual([null, null, null]);
      expect(getPlot(result, 'Size').values).toEqual([0, 0, 0]);
      expect(getPlot(result, 'ParentSize').values).toEqual(sliced ? [2, 2, 2] : [0, 0, 0]);
      if (sliced) {
        expect(getPlot(result, 'Left').values).toEqual([-31, -31, -31]);
        expect(getPlot(result, 'Right').values).toEqual([43, 43, 43]);
      }
    });
  }
});
