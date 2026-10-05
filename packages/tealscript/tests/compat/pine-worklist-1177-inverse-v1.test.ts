import { expect, it } from 'vitest';

import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

it('rank 1177 documented inverse product is identity for finite nonsingular float method', () => {
  const result = runCompatScript(
    `//@version=6
indicator("Inverse product 1177")
a = matrix.new<float>(3, 3, 0)
matrix.set(a, 0, 0, 0)
matrix.set(a, 0, 1, 2)
matrix.set(a, 0, 2, 1)
matrix.set(a, 1, 0, 1)
matrix.set(a, 1, 1, 1)
matrix.set(a, 1, 2, 0)
matrix.set(a, 2, 0, 2)
matrix.set(a, 2, 1, 0)
matrix.set(a, 2, 2, 1)
matrix<float> b = a.inv()
left = matrix.mult(a, b)
right = matrix.mult(b, a)
${Array.from({ length: 9 }, (_, i) => `plot(matrix.get(left, ${Math.floor(i / 3)}, ${i % 3}), "L${i}")\nplot(matrix.get(right, ${Math.floor(i / 3)}, ${i % 3}), "R${i}")`).join('\n')}
plot(matrix.get(a, 0, 1), "Original")`,
    { bars: compatibilityBars.slice(0, 2) },
  );
  expect(result.errors).toEqual([]);
  for (let i = 0; i < 9; i++) {
    for (const prefix of ['L', 'R']) {
      for (const value of getPlot(result, `${prefix}${i}`).values) expect(value).toBeCloseTo(i % 4 === 0 ? 1 : 0, 12);
    }
  }
  expect(getPlot(result, 'Original').values).toEqual([2, 2]);
});
