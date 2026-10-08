import { describe, expect, it } from 'vitest';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

// https://www.tradingview.com/pine-script-reference/v6/#fun_matrix.is_symmetric
describe('matrix symmetry reads mirrored far pairs after mutation', () => {
  for (const version of [5, 6]) for (const receiver of [false, true]) {
    it(`v${version} ${receiver ? 'receiver' : 'namespace'}`, () => {
      const call = receiver ? 'm.is_symmetric()' : 'matrix.is_symmetric(id=m)';
      const values = [3, -2, 7, -2, -4, 5, 7, 5, 9];
      const result = runCompatScript(`//@version=${version}
indicator("Far pair symmetry")
m = matrix.new<int>(3, 3, 0)
${values.map((value, index) => `m.set(${Math.floor(index / 3)}, ${index % 3}, ${value})`).join('\n')}
plot(${call} ? 1 : 0, "Initial")
m.set(2, 0, -7)
plot(${call} ? 1 : 0, "One side changed")
m.set(0, 2, -7)
plot(${call} ? 1 : 0, "Pair matched")`, { bars: compatibilityBars.slice(0, 2) });
      expect(result.errors).toEqual([]);
      expect(getPlot(result, 'Initial').values).toEqual([1, 1]);
      expect(getPlot(result, 'One side changed').values).toEqual([0, 0]);
      expect(getPlot(result, 'Pair matched').values).toEqual([1, 1]);
    });
  }
});
