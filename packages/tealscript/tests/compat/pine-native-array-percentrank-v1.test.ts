import { describe, expect, it } from 'vitest';

import { createPineArray, percentRankArrayValue, pushArrayValue } from '../../src/runtime/arrays';
import { compatibilityBars, runCompatScript } from './fixtures';

function arrayOf(values: number[]) {
  const array = createPineArray<number>();
  values.forEach((value) => pushArrayValue(array, value));
  return array;
}

// Native v7 missing-index capture and v14 fraction-and-ties capture, historical rows only.
describe('captured array percentrank arithmetic', () => {
  it.each([
    [[1, 2, 4], 1, 50],
    [[1, 2, 3], 0, 0],
    [[1, 2, 2, 4], 1, 66.66666666666667],
  ] as const)('matches the captured rank of %j at index %i', (values, index, rank) => {
    expect(percentRankArrayValue(arrayOf([...values]), index)).toBe(rank);
  });

  it('retains the captured missing-index result', () => {
    expect(percentRankArrayValue(arrayOf([1, 2, 4]), NaN)).toBe(0);
  });

  for (const method of [false, true]) {
    it(`matches captured int/float minima and tied ranks through ${method ? 'methods' : 'namespace calls'}`, () => {
      const call = (id: string, index: number) =>
        method ? `${id}.percentrank(${index})` : `array.percentrank(${id}, ${index})`;
      const result = runCompatScript(
        `//@version=6
indicator("Captured array percentrank")
i = array.from(1, 2, 3)
f = array.from(1.0, 2.0, 3.0)
t = array.from(1.0, 2.0, 2.0, 4.0)
plot(${call('i', 0)}, "INT_MIN")
plot(${call('f', 0)}, "FLOAT_MIN")
plot(${call('t', 1)}, "TIE")`,
        { bars: compatibilityBars.slice(0, 2) },
      );
      expect(result.errors).toEqual([]);
      expect(result.plots.map((plot) => plot.values)).toEqual([
        [0, 0],
        [0, 0],
        [66.66666666666667, 66.66666666666667],
      ]);
    });
  }
});

// These expectations preserve T behavior, not native authority; the domains await v29.
describe('held array percentrank domains retain T behavior', () => {
  it.each([
    [[8], 0, 100],
    [[1, 2], 0, 50],
    [[1, 2], 1, 100],
    [[-4, 2, 6], 1, 66.66666666666666],
    [[NaN, 1, 2, 4], 2, 66.66666666666666],
    [[1, NaN, 4], 1, NaN],
    [[1, 2, Infinity], 1, 66.66666666666666],
    [[1, 1, 2, 2, 4], 2, 80],
    [[1, 2, 2, 4], 0, 25],
    [[2, 2, 2], 1, 100],
    [[], 0, NaN],
  ] as const)('preserves the T rank of %j at index %i', (values, index, rank) => {
    expect(percentRankArrayValue(arrayOf([...values]), index)).toBe(rank);
  });

  it.each([-1, 3])('preserves the T refusal at index %i', (index) => {
    expect(() => percentRankArrayValue(arrayOf([1, 2, 4]), index)).toThrow(
      `Array index ${index} is out of bounds. Array size is 3`,
    );
  });
});
