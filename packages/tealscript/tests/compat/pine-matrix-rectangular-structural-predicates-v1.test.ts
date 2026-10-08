import { describe, expect, it } from 'vitest';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

describe('documented structural matrix predicates return false for both rectangle orientations', () => {
  for (const member of ['is_identity', 'is_diagonal', 'is_antidiagonal', 'is_symmetric', 'is_antisymmetric', 'is_triangular']) for (const version of [5, 6]) for (const receiver of [false, true]) {
    it(`${member} v${version} receiver=${receiver}`, () => {
      const shapes = [[2, 3], [3, 2], [2, 2]];
      const result = runCompatScript(`//@version=${version}
indicator("Rectangular predicate guards")
${shapes.map(([rows, columns], i) => `m${i} = matrix.new<float>(${rows}, ${columns}, 0)\n${member === 'is_identity' ? `matrix.set(m${i}, 0, 0, 1)\nmatrix.set(m${i}, 1, 1, 1)\n` : ''}plot(${receiver ? `m${i}.${member}()` : `matrix.${member}(id=m${i})`} ? 1 : 0, "Shape${i}")`).join('\n')}`, { bars: compatibilityBars.slice(0, 3) });
      expect(result.errors).toEqual([]);
      [0, 0, 1].forEach((value, i) => expect(getPlot(result, `Shape${i}`).values).toEqual([value, value, value]));
    });
  }
});
