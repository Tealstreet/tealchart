import { describe, expect, it } from 'vitest';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

describe('signed odd and even array medians use sorted ranks without mutating source', () => {
  for (const version of [5, 6]) for (const receiver of [false, true]) for (const sliced of [false, true]) {
    it(`v${version} receiver=${receiver} sliced=${sliced}`, () => {
      const result = runCompatScript(`//@version=${version}
indicator("Signed median ranks")
${sliced ? 'parent = array.from(97.0, -31.0, 5.0, 17.0, -8.0, 43.0, -83.0)\na = array.slice(parent, 1, 6)' : 'a = array.from(-31.0, 5.0, 17.0, -8.0, 43.0)'}
even = array.slice(a, 0, 4)
plot(${receiver ? 'a.median()' : 'array.median(id=a)'}, "Odd")
plot(${receiver ? 'even.median()' : 'array.median(id=even)'}, "Even")
${Array.from({ length: 5 }, (_, i) => `plot(array.get(a, ${i}), "Cell${i}")`).join('\n')}
plot(array.size(a), "Size")`, { bars: compatibilityBars.slice(0, 3) });
      expect(result.errors).toEqual([]);
      expect(getPlot(result, 'Odd').values).toEqual([5, 5, 5]);
      expect(getPlot(result, 'Even').values).toEqual([-1.5, -1.5, -1.5]);
      [-31, 5, 17, -8, 43].forEach((value, i) => expect(getPlot(result, `Cell${i}`).values).toEqual([value, value, value]));
      expect(getPlot(result, 'Size').values).toEqual([5, 5, 5]);
    });
  }
});
