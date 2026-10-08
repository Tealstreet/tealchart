import { describe, expect, it } from 'vitest';
import { compatibilityBars, runCompatScript } from './fixtures';

describe('submatrix requires strictly increasing endpoints on each axis', () => {
  for (const version of [5, 6]) for (const receiver of [false, true]) for (const row of [false, true]) {
    it(`v${version} receiver=${receiver} row=${row}`, () => {
      const args = row ? 'from_row=1, to_row=1' : 'from_column=1, to_column=1';
      const result = runCompatScript(`//@version=${version}
indicator("Submatrix equal endpoints")
m = matrix.new<int>(2, 3, 17)
s = ${receiver ? `m.submatrix(${args})` : `matrix.submatrix(id=m, ${args})`}
plot(1, "After")`, { bars: compatibilityBars.slice(0, 1) });
      expect(result.errors.length).toBeGreaterThan(0);
    });
  }
});
