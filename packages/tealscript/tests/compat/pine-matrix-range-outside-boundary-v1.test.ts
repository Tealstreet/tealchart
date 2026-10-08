import { describe, expect, it } from 'vitest';
import { compatibilityBars, runCompatScript } from './fixtures';

describe('matrix fill and submatrix reject ranges outside the selected axis', () => {
  for (const version of [5, 6]) for (const receiver of [false, true]) for (const fill of [false, true]) for (const row of [false, true]) for (const negative of [false, true]) {
    it(`v${version} receiver=${receiver} fill=${fill} row=${row} negative=${negative}`, () => {
      const axis = row ? 'row' : 'column', end = negative ? 1 : row ? 3 : 4;
      const args = `from_${axis}=${negative ? -1 : 0}, to_${axis}=${end}`;
      const method = fill ? 'fill' : 'submatrix';
      const call = receiver ? `m.${method}(${fill ? 'value=29, ' : ''}${args})` : `matrix.${method}(id=m, ${fill ? 'value=29, ' : ''}${args})`;
      const result = runCompatScript(`//@version=${version}
indicator("Matrix range outside boundary")
m = matrix.new<int>(2, 3, 17)
${fill ? call : `s = ${call}`}
plot(1, "After")`, { bars: compatibilityBars.slice(0, 1) });
      expect(result.errors.length).toBeGreaterThan(0);
    });
  }
});
