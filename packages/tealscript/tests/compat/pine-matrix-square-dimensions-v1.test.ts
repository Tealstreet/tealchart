import { describe, expect, it } from 'vitest';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

describe('matrix square classification depends on both dimensions', () => {
  for (const version of [5, 6]) for (const receiver of [false, true]) {
    it(`v${version} receiver=${receiver}`, () => {
      const shapes = [[2, 3], [3, 2], [2, 2], [3, 3]];
      const result = runCompatScript(`//@version=${version}
indicator("Square dimension discrimination")
${shapes.map(([rows, cols], i) => `m${i} = matrix.new<float>(${rows}, ${cols}, -8.5)\nplot(${receiver ? `m${i}.is_square()` : `matrix.is_square(m${i})`} ? 1 : 0, "Shape${i}")`).join('\n')}`, { bars: compatibilityBars.slice(0, 3) });
      expect(result.errors).toEqual([]);
      [0, 0, 1, 1].forEach((value, i) => expect(getPlot(result, `Shape${i}`).values).toEqual([value, value, value]));
    });
  }
});
