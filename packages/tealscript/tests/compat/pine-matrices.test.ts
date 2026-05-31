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

  it('runs matrix mutation and shape helper idioms', () => {
    const result = runCompatScript(`
indicator("Matrix mutation helpers")
m = matrix.new_int(2, 2, 0)
m.set(0, 0, 1)
m.set(0, 1, 2)
m.set(1, 0, 3)
m.set(1, 1, 4)
m.add_row(1, array.from(5, 6))
removedCol = m.remove_col(1)
m.add_col(1, array.from(7, 8, 9))
removedRow = matrix.remove_row(m, 1)
m.swap_rows(0, 1)
m.swap_columns(0, 1)
reversed = m.copy()
reversed.reverse()
reshaped = m.copy()
reshaped.reshape(1, 4)
transposed = m.transpose()
filled = m.copy()
filled.fill(9)
rowsFromArray = matrix.new_int()
rowsFromArray.add_row(array.from(10, 11, 12))
colsFromArray = matrix.new_int()
colsFromArray.add_col(array.from(13, 14))
plot(m.get(0, 0), title="Mutated First")
plot(array.get(removedCol, 1), title="Removed Column Middle")
plot(array.get(removedRow, 1), title="Removed Row Second")
plot(matrix.get(reversed, 0, 0), title="Reversed First")
plot(reshaped.columns(), title="Reshaped Columns")
plot(transposed.rows(), title="Transposed Rows")
plot(filled.get(1, 1), title="Filled")
plot(rowsFromArray.columns(), title="Array Row Columns")
plot(colsFromArray.rows(), title="Array Column Rows")
`);

    expect(result.errors).toEqual([]);
    expect(roundSeries(getPlot(result, 'Mutated First').values)).toEqual([9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9]);
    expect(roundSeries(getPlot(result, 'Removed Column Middle').values)).toEqual([6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6]);
    expect(roundSeries(getPlot(result, 'Removed Row Second').values)).toEqual([8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8]);
    expect(roundSeries(getPlot(result, 'Reversed First').values)).toEqual([1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]);
    expect(roundSeries(getPlot(result, 'Reshaped Columns').values)).toEqual([4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4]);
    expect(roundSeries(getPlot(result, 'Transposed Rows').values)).toEqual([2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2]);
    expect(roundSeries(getPlot(result, 'Filled').values)).toEqual([9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9]);
    expect(roundSeries(getPlot(result, 'Array Row Columns').values)).toEqual([3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3]);
    expect(roundSeries(getPlot(result, 'Array Column Rows').values)).toEqual([2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2]);
  });

  it('runs matrix aggregate helper idioms', () => {
    const result = runCompatScript(`
indicator("Matrix aggregate helpers")
m = matrix.new_float(2, 3, 0)
m.set(0, 0, 1)
m.set(0, 1, 2)
m.set(0, 2, 2)
m.set(1, 0, 4)
m.set(1, 1, 8)
m.set(1, 2, 13)
plot(matrix.avg(m), title="Average")
plot(m.min(), title="Minimum")
plot(m.max(), title="Maximum")
plot(matrix.median(m), title="Median")
plot(m.mode(), title="Mode")
`);

    expect(result.errors).toEqual([]);
    expect(roundSeries(getPlot(result, 'Average').values)).toEqual([5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5]);
    expect(roundSeries(getPlot(result, 'Minimum').values)).toEqual([1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]);
    expect(roundSeries(getPlot(result, 'Maximum').values)).toEqual([13, 13, 13, 13, 13, 13, 13, 13, 13, 13, 13, 13]);
    expect(roundSeries(getPlot(result, 'Median').values)).toEqual([3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3]);
    expect(roundSeries(getPlot(result, 'Mode').values)).toEqual([2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2]);
  });
});
