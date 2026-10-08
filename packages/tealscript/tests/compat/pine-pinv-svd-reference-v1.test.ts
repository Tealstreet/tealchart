import { describe, expect, it } from 'vitest';

import { getPlot, runCompatScript } from './fixtures';

const reference = 'https://www.tradingview.com/pine-script-reference/v6/#fun_matrix.pinv';

const cases = [
  {
    name: 'rank-one small first column',
    rows: [
      [1e-8, 1],
      [1e-8, 1],
    ],
    expected: [5e-9, 5e-9, 0.5, 0.5],
  },
  {
    name: 'rank-one reversed columns',
    rows: [
      [1, 1e-8],
      [1, 1e-8],
    ],
    expected: [0.5, 0.5, 5e-9, 5e-9],
  },
  {
    name: 'official invertible example',
    rows: [
      [1, 2],
      [3, 4],
    ],
    expected: [-2, 1, 1.5, -0.5],
  },
  {
    name: 'rank-one integer example',
    rows: [
      [1, 2],
      [2, 4],
    ],
    expected: [0.04, 0.08, 0.08, 0.16],
  },
  {
    name: 'tall orthogonal matrix',
    rows: [
      [1, 0],
      [0, 2],
      [0, 0],
    ],
    expected: [1, 0, 0, 0, 0.5, 0],
  },
  {
    name: 'wide orthogonal matrix',
    rows: [
      [1, 0, 0],
      [0, 2, 0],
    ],
    expected: [1, 0, 0, 0.5, 0, 0],
  },
  {
    name: 'zero matrix',
    rows: [
      [0, 0],
      [0, 0],
      [0, 0],
    ],
    expected: [0, 0, 0, 0, 0, 0],
  },
];

describe(`documented SVD Moore-Penrose values [${reference}]`, () => {
  for (const { name, rows, expected } of cases) {
    it(name, () => {
      const declarations = rows.flatMap((row, i) => row.map((value, j) => `matrix.set(a, ${i}, ${j}, ${value})`));
      const plots = expected.map(
        (_, i) => `plot(matrix.get(p, ${Math.floor(i / rows.length)}, ${i % rows.length}), "p${i}")`,
      );
      const source = `//@version=6
indicator("SVD pseudoinverse")
a = matrix.new<float>(${rows.length}, ${rows[0].length}, 0)
${declarations.join('\n')}
p = matrix.pinv(a)
${plots.join('\n')}`;
      const result = runCompatScript(source);
      expect(result.errors).toEqual([]);
      expect(result.profile?.compiledBarErrors?.count ?? 0).toBe(0);
      expected.forEach((value, i) => {
        const values = getPlot(result, `p${i}`).values;
        expect(values.length).toBeGreaterThan(0);
        values.forEach((actual) => expect(actual).toBeCloseTo(value, 14));
      });
    });
  }
});
