import { expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';
import { getPlot, runCompatScript } from './fixtures';

const source =
  '//@version=6\nindicator("Eigenvectors facet 983")\nm = matrix.new<float>(3, 3, 0)\nmatrix.set(m, 0, 0, 2)\nmatrix.set(m, 0, 1, 1)\nmatrix.set(m, 1, 0, 1)\nmatrix.set(m, 1, 1, 2)\nmatrix.set(m, 2, 2, 4)\nv = m.eigenvectors()\nplot(matrix.get(v, 0, 0), "v00")\nplot(matrix.get(v, 0, 1), "v01")\nplot(matrix.get(v, 0, 2), "v02")\nplot(matrix.get(v, 1, 0), "v10")\nplot(matrix.get(v, 1, 1), "v11")\nplot(matrix.get(v, 1, 2), "v12")\nplot(matrix.get(v, 2, 0), "v20")\nplot(matrix.get(v, 2, 1), "v21")\nplot(matrix.get(v, 2, 2), "v22")\nplot(matrix.get(m, 0, 0), "source00")\n';

it('certifies documented symmetric-real eigenvector facet 983 without selecting native basis order', () => {
  expect(checkProgram(parse(source)).diagnostics.filter((item) => item.severity === 'error')).toEqual([]);
  const result = runCompatScript(source);
  expect(result.errors).toEqual([]);
  const columns = [0, 1, 2].map((column) =>
    [0, 1, 2].map((row) => getPlot(result, `v${row}${column}`).values[0] as number),
  );
  const spectrum: number[] = [];
  for (const [index, vector] of columns.entries()) {
    expect(vector.every(Number.isFinite)).toBe(true);
    expect(vector.reduce((sum, value) => sum + value * value, 0)).toBeCloseTo(1, 12);
    const product = [2 * vector[0] + vector[1], vector[0] + 2 * vector[1], 4 * vector[2]];
    const eigenvalue = vector.reduce((sum, value, row) => sum + value * product[row], 0);
    spectrum.push(eigenvalue);
    product.forEach((value, row) => expect(value).toBeCloseTo(eigenvalue * vector[row], 12));
    for (const other of columns.slice(index + 1)) {
      expect(vector.reduce((sum, value, row) => sum + value * other[row], 0)).toBeCloseTo(0, 12);
    }
  }
  spectrum.sort((a, b) => a - b).forEach((value, index) => expect(value).toBeCloseTo([1, 3, 4][index], 12));
  expect(getPlot(result, 'source00').values).toEqual(Array(result.plots[0].values.length).fill(2));
});
