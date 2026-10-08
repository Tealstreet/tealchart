import { describe, expect, it } from 'vitest';
import { compatibilityBars, runCompatScript } from './fixtures';

describe('matrix ranges reject reversed endpoints instead of normalizing their order', () => {
  for (const version of [5, 6]) for (const receiver of [false, true]) for (const fill of [false, true]) for (const row of [false, true]) {
    it(`v${version} receiver=${receiver} fill=${fill} row=${row}`, () => {
      const axis = row ? 'row' : 'column', args = `from_${axis}=1, to_${axis}=0`, method = fill ? 'fill' : 'submatrix';
      const call = receiver ? `m.${method}(${fill ? 'value=29, ' : ''}${args})` : `matrix.${method}(id=m, ${fill ? 'value=29, ' : ''}${args})`;
      const result = runCompatScript(`//@version=${version}
indicator("Matrix reversed range")
m = matrix.new<int>(2, 3, 17)
${fill ? call : `s = ${call}`}
plot(1, "After")`, { bars: compatibilityBars.slice(0, 1) });
      expect(result.errors.length).toBeGreaterThan(0);
    });
  }
});
