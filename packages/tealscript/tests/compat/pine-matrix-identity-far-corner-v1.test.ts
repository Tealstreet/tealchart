import { describe, expect, it } from 'vitest';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

describe('identity matrices require unit diagonal and zero far off-diagonal cells', () => {
  for (const version of [5, 6]) for (const receiver of [false, true]) {
    it(`v${version} ${receiver ? 'receiver' : 'namespace'}`, () => {
      const call = receiver ? 'm.is_identity()' : 'matrix.is_identity(m)';
      const result = runCompatScript(`//@version=${version}
indicator("Identity far corners")
m = matrix.new<float>(3, 3, 0)
matrix.set(m, 0, 0, 1)
matrix.set(m, 1, 1, 1)
matrix.set(m, 2, 2, 1)
plot(${call} ? 1 : 0, "Identity")
matrix.set(m, 2, 0, -2)
plot(${call} ? 1 : 0, "OffDiagonal")
matrix.set(m, 2, 0, 0)
matrix.set(m, 2, 2, -1)
plot(${call} ? 1 : 0, "NegativeDiagonal")
matrix.set(m, 2, 2, 1)
plot(${call} ? 1 : 0, "Restored")`, { bars: compatibilityBars.slice(0, 3) });
      expect(result.errors).toEqual([]);
      for (const [title, value] of Object.entries({ Identity: 1, OffDiagonal: 0, NegativeDiagonal: 0, Restored: 1 })) {
        expect(getPlot(result, title).values).toEqual([value, value, value]);
      }
    });
  }
});
