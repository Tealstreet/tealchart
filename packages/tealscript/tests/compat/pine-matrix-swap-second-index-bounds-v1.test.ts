import { describe, expect, it } from 'vitest';
import { compatibilityBars, runCompatScript } from './fixtures';

describe('matrix swaps reject an invalid second axis index', () => {
  for (const version of [5, 6]) for (const receiver of [false, true]) for (const row of [false, true]) for (const negative of [false, true]) {
    it(`v${version} receiver=${receiver} row=${row} negative=${negative}`, () => {
      const method = row ? 'swap_rows' : 'swap_columns', index = negative ? -1 : row ? 2 : 3;
      const result = runCompatScript(`//@version=${version}
indicator("Swap second index bounds")
m = matrix.new<int>(2, 3, 17)
${receiver ? `m.${method}(0, ${index})` : `matrix.${method}(m, 0, ${index})`}
plot(1, "After")`, { bars: compatibilityBars.slice(0, 1) });
      expect(result.errors.length).toBeGreaterThan(0);
    });
  }
});
