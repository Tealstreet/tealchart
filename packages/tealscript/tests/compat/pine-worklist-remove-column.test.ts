import { expect, it } from 'vitest';
import { parse } from '../../src/parser';
import { executeScript } from '../../src/runtime/compiledOnly';

// Authority: matrix.remove_col v6 reference; native CF020 preserves omitted-last rule.
for (const call of ['matrix.remove_col(m, 0)', 'm.remove_col(0)']) {
  it(`uses zero-based columns through ${call}`, () => {
    const source = `//@version=6
indicator("remove column")
m = matrix.new<int>(2, 2, 0)
m.set(0, 0, 11)
m.set(0, 1, 12)
m.set(1, 0, 21)
m.set(1, 1, 22)
removed = ${call}
plot(removed.get(0))
plot(removed.get(1))
plot(m.get(0, 0))
plot(m.get(1, 0))
plot(m.rows())
plot(m.columns())`;
    const result = executeScript(parse(source), [{ time: 0, open: 1, high: 1, low: 1, close: 1, volume: 1 }]);
    expect(result.errors).toEqual([]);
    expect(result.plots.map((plot) => plot.values)).toEqual([[11], [21], [12], [22], [2], [1]]);
  });
}
