import { describe, expect, it } from 'vitest';

import { getPlot, runCompatScript } from './fixtures';

// Bounded output properties; neither LU internals nor universal native bits.
const setup = `a = matrix.new<float>(2, 2, 0)
a.set(0, 0, 2)
a.set(0, 1, 3)
a.set(1, 0, 5)
a.set(1, 1, 7)
b = matrix.new<float>(2, 2, 0)
b.set(0, 0, 11)
b.set(0, 1, 13)
b.set(1, 0, 17)
b.set(1, 1, 19)`;

function value(body: string) {
  const result = runCompatScript(`//@version=6
indicator("Bounded determinant property")
${body}`);
  expect(result.errors).toEqual([]);
  return getPlot(result, 'Value').values;
}

describe('worklist 1324: float namespace determinant output properties', () => {
  it('preserves a known finite determinant', () => {
    for (const actual of value(`${setup}
plot(matrix.det(a), "Value")`))
      expect(actual).toBeCloseTo(-1, 10);
  });

  it('satisfies determinant multiplicativity within tolerance', () => {
    const values = value(`${setup}
c = matrix.mult(a, b)
plot(matrix.det(c) - matrix.det(a) * matrix.det(b), "Value")`);
    for (const actual of values) {
      expect(actual).not.toBeNull();
      expect(Math.abs(actual!)).toBeLessThanOrEqual(1e-9);
    }
  });

  it('returns zero for an exactly singular matrix', () => {
    const values = value(`s = matrix.new<float>(2, 2, 0)
s.set(0, 0, 2)
s.set(0, 1, 3)
s.set(1, 0, 4)
s.set(1, 1, 6)
plot(matrix.det(s), "Value")`);
    expect(values).toEqual(Array(values.length).fill(0));
  });
});

// Native source SHA256: 66ae3d58d1f98d44666273b649e080dab500c175f941a9c36654ff12e0c1f391.
it('retains the captured pivot-control determinant bits', () => {
  const result = runCompatScript(`//@version=6
indicator("V7 matrix-det-pivot-control-v6-v1")
m = matrix.new<float>(3,3,0)
matrix.set(m,0,1,2)
matrix.set(m,0,2,3)
matrix.set(m,1,0,4)
matrix.set(m,1,1,5)
matrix.set(m,1,2,6)
matrix.set(m,2,0,7)
matrix.set(m,2,1,8)
matrix.set(m,2,2,10)
plot(matrix.det(m),"DETERMINANT")
`);
  expect(result.errors).toEqual([]);
  const values = getPlot(result, 'DETERMINANT').values;
  expect(values).toEqual(Array(values.length).fill(-4.999999999999995));
});
