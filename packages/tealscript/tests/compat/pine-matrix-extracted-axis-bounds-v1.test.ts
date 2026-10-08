import { describe, expect, it } from 'vitest';
import { compatibilityBars, runCompatScript } from './fixtures';

describe('matrix row and column extraction reject out-of-bounds indices', () => {
  for (const version of [5, 6]) for (const receiver of [false, true]) for (const row of [false, true]) for (const negative of [false, true]) {
    it(`v${version} receiver=${receiver} row=${row} negative=${negative}`, () => {
      const method = row ? 'row' : 'col', index = negative ? -1 : row ? 2 : 3;
      const result = runCompatScript(`//@version=${version}
indicator("Extracted axis bounds")
m = matrix.new<int>(2, 3, 17)
a = ${receiver ? `m.${method}(${index})` : `matrix.${method}(m, ${index})`}
plot(1, "After")`, { bars: compatibilityBars.slice(0, 1) });
      expect(result.errors.length).toBeGreaterThan(0);
    });
  }
});
