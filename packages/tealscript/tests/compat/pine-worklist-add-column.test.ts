import { expect, it } from 'vitest';
import { parse } from '../../src/parser';
import { executeScript } from '../../src/runtime/compiledOnly';

// Authority: matrix.add_col v6 reference; comparative speed is NON-NORMATIVE.
for (const call of ['matrix.add_col(m, 0, values)', 'm.add_col(0, values)']) {
  it(`inserts a column without changing row order through ${call}`, () => {
    const source = `//@version=6
indicator("add column")
m = matrix.new<int>(2, 1, 0)
m.set(0, 0, 12)
m.set(1, 0, 22)
values = array.from(11, 21)
${call}
plot(m.get(0, 0))
plot(m.get(1, 0))
plot(m.get(0, 1))
plot(m.get(1, 1))
plot(m.rows())
plot(m.columns())`;
    const result = executeScript(parse(source), [{ time: 0, open: 1, high: 1, low: 1, close: 1, volume: 1 }]);
    expect(result.errors).toEqual([]);
    expect(result.plots.map((plot) => plot.values)).toEqual([[11], [21], [12], [22], [2], [2]]);
  });
}
