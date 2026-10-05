import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { executeScript } from '../../src/runtime/compiledOnly';

const bars = [{ time: 60_000, open: 1, high: 1, low: 1, close: 1, volume: 1 }];
const execute = (body: string) => {
  const result = executeScript(parse(`//@version=6\nindicator("Partial matrix clauses")\n${body}`), bars);
  expect(result.errors).toEqual([]);
  return result.plots.map((plot) => plot.values[0]);
};

describe('PARTIAL 981-989: finite symmetric QL domain', () => {
  // Reference functions[617-620], methods[198-201] specify Implicit QL.
  // These residuals certify a symmetric domain, without pinning vector sign or order.
  for (const receiver of [false, true]) {
    it(`${receiver ? 'receiver' : 'namespace'} returns real roots and an independent eigenvector basis`, () => {
      const values = execute(`m = matrix.new<float>(3, 3, 0.0)
matrix.set(m, 0, 1, 2.0)
matrix.set(m, 1, 0, 2.0)
matrix.set(m, 2, 2, 1.0)
roots = ${receiver ? 'm.eigenvalues()' : 'matrix.eigenvalues(m)'}
vectors = ${receiver ? 'm.eigenvectors()' : 'matrix.eigenvectors(m)'}
plot(math.abs(matrix.det(vectors)), "independence")
for column = 0 to 2
    x = matrix.get(vectors, 0, column)
    y = matrix.get(vectors, 1, column)
    z = matrix.get(vectors, 2, column)
    residual = 1e10
    for index = 0 to 2
        root = array.get(roots, index)
        candidate = math.abs(2.0 * y - root * x) + math.abs(2.0 * x - root * y) + math.abs(z - root * z)
        residual := math.min(residual, candidate)
    matrix.set(m, column, column, residual)
plot(array.get(roots, 0), "root0")
plot(array.get(roots, 1), "root1")
plot(array.get(roots, 2), "root2")
plot(matrix.get(m, 0, 0), "residual0")
plot(matrix.get(m, 1, 1), "residual1")
plot(matrix.get(m, 2, 2), "residual2")`);
      expect(values.every((value) => typeof value === 'number' && Number.isFinite(value))).toBe(true);
      expect(values[0]).toBeGreaterThan(0);
      const roots = values
        .slice(1, 4)
        .map(Number)
        .sort((a, b) => a - b);
      [-2, 1, 2].forEach((root, index) => expect(roots[index]).toBeCloseTo(root, 8));
      values.slice(4).forEach((value) => expect(value).toBeCloseTo(0, 8));
    });
  }
});

describe('PARTIAL 1060-1065: pseudoinverse rectangular domain', () => {
  // Reference functions[610-611], methods[191-192] describe Moore-Penrose/SVD.
  // This exact rectangular result leaves algorithm identity and thresholds open.
  for (const receiver of [false, true]) {
    it(`${receiver ? 'receiver' : 'namespace'} returns the rectangular Moore-Penrose inverse`, () => {
      const values = execute(`m = matrix.new<float>(3, 2, 0.0)
matrix.set(m, 0, 0, 1.0)
matrix.set(m, 1, 1, 2.0)
inverse = ${receiver ? 'm.pinv()' : 'matrix.pinv(m)'}
plot(matrix.rows(inverse), "rows")
plot(matrix.columns(inverse), "columns")
plot(matrix.get(inverse, 0, 0), "a")
plot(matrix.get(inverse, 0, 1), "b")
plot(matrix.get(inverse, 0, 2), "c")
plot(matrix.get(inverse, 1, 0), "d")
plot(matrix.get(inverse, 1, 1), "e")
plot(matrix.get(inverse, 1, 2), "f")
plot(matrix.get(m, 1, 1), "source")`);
      expect(values).toEqual([2, 3, 1, 0, 0, 0, 0.5, 0, 2]);
    });
  }
});
