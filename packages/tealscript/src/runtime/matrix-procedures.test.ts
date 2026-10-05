import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { createPineMatrix, decomposeLu, detMatrixValue, invMatrixValue } from './matrices';

const source = readFileSync(new URL('./matrices.ts', import.meta.url), 'utf8');
const matrix = (values: number[]) => {
  const m = createPineMatrix<number>(2, 2, 0);
  m.values = values;
  return m;
};
const functionBody = (name: string) => source.split(`export function ${name}`)[1].split('export function ')[0];

describe('packet008 documented LU procedures', () => {
  for (const rank of [365, 369, 373, 376]) {
    it(`rank ${rank}: inverse uses LU decomposition for the reference example`, () => {
      expect(functionBody('invMatrixValue')).toContain('decomposeLu');
      const input = matrix([1, 2, 3, 4]);
      const result = invMatrixValue(input);
      for (const [i, expected] of [-2, 1, 1.5, -0.5].entries()) expect(result.values[i]).toBeCloseTo(expected, 12);
      expect(input.values).toEqual([1, 2, 3, 4]);
    });
  }
  for (const rank of [1094, 1098, 1102, 1105]) {
    it(`rank ${rank}: determinant uses LU decomposition for the reference example`, () => {
      expect(functionBody('detMatrixValue')).toContain('decomposeLu');
      const input = matrix([3, 7, 1, -4]);
      expect(detMatrixValue(input)).toBe(-19);
      expect(input.values).toEqual([3, 7, 1, -4]);
    });
  }
});

describe('LU factors and triangular solves', () => {
  it('reconstructs the reference inverse input from P, unit-lower L and upper U', () => {
    const input = [
      [1, 2],
      [3, 4],
    ];
    const decomposition = decomposeLu(input)!;
    expect(decomposition.permutation).toEqual([1, 0]);
    expect(decomposition.sign).toBe(-1);
    const { factors } = decomposition;
    expect(factors[1][0]).toBeCloseTo(1 / 3, 14);
    for (let row = 0; row < 2; row++)
      for (let column = 0; column < 2; column++) {
        let product = 0;
        for (let k = 0; k < 2; k++) {
          const lower = row === k ? 1 : row > k ? factors[row][k] : 0;
          const upper = k <= column ? factors[k][column] : 0;
          product += lower * upper;
        }
        expect(product).toBeCloseTo(input[decomposition.permutation[row]][column], 12);
      }
    expect(input).toEqual([
      [1, 2],
      [3, 4],
    ]);
  });
});
