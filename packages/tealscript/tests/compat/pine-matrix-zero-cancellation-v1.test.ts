import { describe, expect, it } from 'vitest';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

describe('zero matrices reject cancelling nonzero cells', () => {
  for (const version of [5, 6]) for (const receiver of [false, true]) for (const kind of ['int', 'float']) {
    it(`v${version} receiver=${receiver} kind=${kind}`, () => {
      const call = receiver ? 'm.is_zero()' : 'matrix.is_zero(m)';
      const result = runCompatScript(`//@version=${version}
indicator("Zero cancellation")
m = matrix.new<${kind}>(3, 2, 0)
plot(${call} ? 1 : 0, "Zero")
matrix.set(m, 2, 1, 2)
plot(${call} ? 1 : 0, "Two")
matrix.set(m, 2, 1, -1)
matrix.set(m, 2, 0, 1)
plot(${call} ? 1 : 0, "Cancellation")
matrix.set(m, 2, 1, 0)
matrix.set(m, 2, 0, 0)
plot(${call} ? 1 : 0, "Restored")`, { bars: compatibilityBars.slice(0, 3) });
      expect(result.errors).toEqual([]);
      for (const [title, value] of Object.entries({ Zero: 1, Two: 0, Cancellation: 0, Restored: 1 })) {
        expect(getPlot(result, title).values).toEqual([value, value, value]);
      }
    });
  }
});
