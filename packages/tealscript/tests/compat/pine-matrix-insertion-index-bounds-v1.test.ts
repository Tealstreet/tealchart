import { describe, expect, it } from 'vitest';
import { compatibilityBars, runCompatScript } from './fixtures';

describe('matrix insertion rejects indices outside the inclusive insertion range', () => {
  for (const version of [5, 6]) for (const receiver of [false, true]) for (const row of [false, true]) for (const negative of [false, true]) {
    it(`v${version} receiver=${receiver} row=${row} negative=${negative}`, () => {
      const method = row ? 'add_row' : 'add_col', index = negative ? -1 : row ? 3 : 4;
      const result = runCompatScript(`//@version=${version}
indicator("Insertion index bounds")
m = matrix.new<int>(2, 3, 17)
a = array.new<int>(${row ? 3 : 2}, -8)
${receiver ? `m.${method}(${index}, a)` : `matrix.${method}(m, ${index}, a)`}
plot(1, "After")`, { bars: compatibilityBars.slice(0, 1) });
      expect(result.errors.length).toBeGreaterThan(0);
    });
  }
});
