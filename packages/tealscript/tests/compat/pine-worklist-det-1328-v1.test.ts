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

describe('worklist 1328: float method determinant output properties', () => {
  it('preserves a known finite determinant', () => {
    for (const actual of value(`${setup}
plot(a.det(), "Value")`))
      expect(actual).toBeCloseTo(-1, 10);
  });

  it('satisfies determinant multiplicativity within tolerance', () => {
    const values = value(`${setup}
c = matrix.mult(a, b)
plot(c.det() - a.det() * b.det(), "Value")`);
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
plot(s.det(), "Value")`);
    expect(values).toEqual(Array(values.length).fill(0));
  });
});
