import { describe, expect, it } from 'vitest';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

describe('binary matrices inspect signed far corners of rectangular grids', () => {
  for (const version of [5, 6]) for (const receiver of [false, true]) for (const kind of ['int', 'float']) {
    it(`v${version} receiver=${receiver} kind=${kind}`, () => {
      const call = receiver ? 'm.is_binary()' : 'matrix.is_binary(m)';
      const result = runCompatScript(`//@version=${version}
indicator("Binary far corners")
m = matrix.new<${kind}>(3, 2, 0)
matrix.set(m, 0, 1, 1)
matrix.set(m, 1, 0, 1)
plot(${call} ? 1 : 0, "Binary")
matrix.set(m, 2, 1, 2)
plot(${call} ? 1 : 0, "Two")
matrix.set(m, 2, 1, -1)
plot(${call} ? 1 : 0, "NegativeOne")
matrix.set(m, 2, 1, 1)
plot(${call} ? 1 : 0, "Restored")`, { bars: compatibilityBars.slice(0, 3) });
      expect(result.errors).toEqual([]);
      for (const [title, value] of Object.entries({ Binary: 1, Two: 0, NegativeOne: 0, Restored: 1 })) {
        expect(getPlot(result, title).values).toEqual([value, value, value]);
      }
    });
  }
});
