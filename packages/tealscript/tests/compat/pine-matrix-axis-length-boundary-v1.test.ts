import { describe, expect, it } from 'vitest';
import { compatibilityBars, runCompatScript } from './fixtures';

describe('matrix insertion rejects both short and long axes', () => {
  for (const version of [5, 6]) for (const receiver of [false, true]) for (const row of [false, true]) for (const long of [false, true]) {
    it(`v${version} receiver=${receiver} row=${row} long=${long}`, () => {
      const length = (row ? 3 : 2) + (long ? 1 : -1), method = row ? 'add_row' : 'add_col';
      const result = runCompatScript(`//@version=${version}
indicator("Axis length boundary")
m = matrix.new<int>(2, 3, 17)
a = array.new<int>(${length}, -8)
${receiver ? `m.${method}(1, a)` : `matrix.${method}(m, 1, a)`}
plot(1, "After")`, { bars: compatibilityBars.slice(0, 1) });
      expect(result.errors.length).toBeGreaterThan(0);
    });
  }
});
