import { describe, expect, it } from 'vitest';

import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

const reference = 'https://www.tradingview.com/pine-script-docs/language/matrices/#matrixinv-and-matrixpinv';
type Matrix2 = [number, number, number, number];

function multiply(a: Matrix2, b: Matrix2): Matrix2 {
  return [a[0] * b[0] + a[1] * b[2], a[0] * b[1] + a[1] * b[3], a[2] * b[0] + a[3] * b[2], a[2] * b[1] + a[3] * b[3]];
}

function expectNear(actual: Matrix2, expected: Matrix2): void {
  actual.forEach((value, index) => {
    expect(Number.isFinite(value), reference).toBe(true);
    expect(Math.abs(value - expected[index]!), reference).toBeLessThan(1e-12);
  });
}

describe('worklist1060 analytic rank-one2x2 pseudoinverse properties', () => {
  // Analytic identities only: no native bits, precision, or SVD algorithm credit.
  it.each(['matrix.pinv(a)', 'a.pinv()'])('satisfies Moore-Penrose identities through %s', (expression) => {
    const coordinates = [
      [0, 0],
      [0, 1],
      [1, 0],
      [1, 1],
    ] as const;
    const result = runCompatScript(
      `//@version=6
indicator("Rank-one pseudoinverse")
a = matrix.new<float>(2, 2, 0.0)
a.set(0, 0, 1.0)
a.set(0, 1, 2.0)
a.set(1, 0, 2.0)
a.set(1, 1, 4.0)
p = ${expression}
${coordinates.map(([row, column], index) => `plot(p.get(${row}, ${column}), "p${index}")`).join('\n')}`,
      { bars: compatibilityBars.slice(0, 1) },
    );
    expect(result.errors, reference).toEqual([]);
    const inverse = coordinates.map((_, index) => {
      const values = getPlot(result, `p${index}`).values;
      expect(values, reference).toHaveLength(1);
      expect(values[0], reference).not.toBeNull();
      return values[0]!;
    }) as Matrix2;
    const original: Matrix2 = [1, 2, 2, 4];
    expectNear(inverse, [1 / 25, 2 / 25, 2 / 25, 4 / 25]);
    expectNear(multiply(multiply(original, inverse), original), original);
    expectNear(multiply(multiply(inverse, original), inverse), inverse);
    for (const projection of [multiply(original, inverse), multiply(inverse, original)]) {
      expectNear(projection, [projection[0], projection[2], projection[1], projection[3]]);
    }
  });
});
