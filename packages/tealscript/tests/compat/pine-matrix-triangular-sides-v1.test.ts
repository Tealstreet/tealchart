import { describe, expect, it } from 'vitest';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

// https://www.tradingview.com/pine-script-reference/v6/#fun_matrix.is_triangular
const cases = [
  { name: 'upper', values: [3, 2, 5, 0, -2, 7, 0, 0, 4], expected: 1 },
  { name: 'lower', values: [3, 0, 0, -2, -2, 0, 5, 7, 4], expected: 1 },
  { name: 'diagonal', values: [3, 0, 0, 0, -2, 0, 0, 0, 4], expected: 1 },
  { name: 'neither far corners', values: [3, 0, 5, 0, -2, 0, 7, 0, 4], expected: 0 },
];
describe('triangular matrices may have either zero half, not necessarily both', () => {
  for (const version of [5, 6]) for (const receiver of [false, true]) for (const sample of cases) {
    it(`v${version} ${receiver ? 'receiver' : 'namespace'} ${sample.name}`, () => {
      const call = receiver ? 'm.is_triangular()' : 'matrix.is_triangular(id=m)';
      const result = runCompatScript(`//@version=${version}
indicator("Triangular sides")
m = matrix.new<int>(3, 3, 0)
${sample.values.map((value, index) => `m.set(${Math.floor(index / 3)}, ${index % 3}, ${value})`).join('\n')}
plot(${call} ? 1 : 0, "Triangular")`, { bars: compatibilityBars.slice(0, 2) });
      expect(result.errors).toEqual([]);
      expect(getPlot(result, 'Triangular').values).toEqual([sample.expected, sample.expected]);
    });
  }
});
