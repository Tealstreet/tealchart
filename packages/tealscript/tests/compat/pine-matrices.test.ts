import { describe, expect, it } from 'vitest';

import { getPlot, roundSeries, runCompatScript } from './fixtures';

describe('Pine matrix compatibility', () => {
  it('runs basic matrix constructor, accessor, and row/column idioms', () => {
    const result = runCompatScript(`
indicator("Matrix basics")
m = matrix.new_float(2, 2, 0)
m.set(0, 1, 3)
matrix.set(m, 1, 0, 5)
copy = m.copy()
copy.set(0, 1, 9)
row = m.row(1)
col = matrix.col(m, 1)
plot(m.rows(), title="Rows")
plot(matrix.columns(m), title="Columns")
plot(matrix.elements_count(m), title="Elements")
plot(m.get(0, 1), title="Original")
plot(copy.get(0, 1), title="Copy")
plot(array.get(row, 0), title="Row First")
plot(array.get(col, 0), title="Column First")
plot(m.is_square() ? 1 : 0, title="Square")
plot(matrix.is_valid(m) ? 1 : 0, title="Valid")
`);

    expect(result.errors).toEqual([]);
    expect(roundSeries(getPlot(result, 'Rows').values)).toEqual([2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2]);
    expect(roundSeries(getPlot(result, 'Columns').values)).toEqual([2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2]);
    expect(roundSeries(getPlot(result, 'Elements').values)).toEqual([4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4]);
    expect(roundSeries(getPlot(result, 'Original').values)).toEqual([3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3]);
    expect(roundSeries(getPlot(result, 'Copy').values)).toEqual([9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9]);
    expect(roundSeries(getPlot(result, 'Row First').values)).toEqual([5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5]);
    expect(roundSeries(getPlot(result, 'Column First').values)).toEqual([3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3]);
    expect(roundSeries(getPlot(result, 'Square').values)).toEqual([1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]);
    expect(roundSeries(getPlot(result, 'Valid').values)).toEqual([1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]);
  });
});
