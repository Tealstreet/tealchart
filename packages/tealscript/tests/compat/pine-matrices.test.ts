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

  it('runs documented matrix concatenation idioms', () => {
    const result = runCompatScript(`
indicator("Matrix concat")
left = matrix.new_int(2, 2, 0)
left.set(0, 0, 1)
left.set(0, 1, 2)
left.set(1, 0, 3)
left.set(1, 1, 4)
right = matrix.new_int(1, 2, 0)
right.set(0, 0, 5)
right.set(0, 1, 6)
left.concat(right)
namespace = matrix.new_int()
matrix.concat(namespace, right)
plot(left.rows(), title="Rows")
plot(left.get(2, 0), title="Appended First")
plot(left.get(2, 1), title="Appended Second")
plot(right.rows(), title="Right Rows")
plot(namespace.rows(), title="Namespace Rows")
plot(namespace.get(0, 1), title="Namespace Value")
`);

    expect(result.errors).toEqual([]);
    expect(roundSeries(getPlot(result, 'Rows').values)).toEqual([3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3]);
    expect(roundSeries(getPlot(result, 'Appended First').values)).toEqual([5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5]);
    expect(roundSeries(getPlot(result, 'Appended Second').values)).toEqual([6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6]);
    expect(roundSeries(getPlot(result, 'Right Rows').values)).toEqual([1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]);
    expect(roundSeries(getPlot(result, 'Namespace Rows').values)).toEqual([1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]);
    expect(roundSeries(getPlot(result, 'Namespace Value').values)).toEqual([6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6]);
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

  it('runs matrix pseudoinverse idioms', () => {
    const result = runCompatScript(`
indicator("Matrix pseudoinverse")
wide = matrix.new_float(2, 3, 0)
wide.set(0, 0, 1)
wide.set(0, 1, 2)
wide.set(0, 2, 3)
wide.set(1, 0, 4)
wide.set(1, 1, 5)
wide.set(1, 2, 6)
widePinv = matrix.pinv(wide)
singular = matrix.new_float(2, 2, 0)
singular.set(0, 0, 1)
singular.set(0, 1, 2)
singular.set(1, 0, 2)
singular.set(1, 1, 4)
singularPinv = singular.pinv()
plot(widePinv.rows(), title="Wide Rows")
plot(widePinv.columns(), title="Wide Columns")
plot(widePinv.get(0, 0), title="Wide First")
plot(widePinv.get(2, 1), title="Wide Last")
plot(singularPinv.get(0, 0), title="Singular First")
plot(singularPinv.get(1, 1), title="Singular Last")
`);

    expect(result.errors).toEqual([]);
    expect(roundSeries(getPlot(result, 'Wide Rows').values)).toEqual([3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3]);
    expect(roundSeries(getPlot(result, 'Wide Columns').values)).toEqual([2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2]);
    expect(roundSeries(getPlot(result, 'Wide First').values)).toEqual([-0.944444, -0.944444, -0.944444, -0.944444, -0.944444, -0.944444, -0.944444, -0.944444, -0.944444, -0.944444, -0.944444, -0.944444]);
    expect(roundSeries(getPlot(result, 'Wide Last').values)).toEqual([-0.222222, -0.222222, -0.222222, -0.222222, -0.222222, -0.222222, -0.222222, -0.222222, -0.222222, -0.222222, -0.222222, -0.222222]);
    expect(roundSeries(getPlot(result, 'Singular First').values)).toEqual([0.04, 0.04, 0.04, 0.04, 0.04, 0.04, 0.04, 0.04, 0.04, 0.04, 0.04, 0.04]);
    expect(roundSeries(getPlot(result, 'Singular Last').values)).toEqual([0.16, 0.16, 0.16, 0.16, 0.16, 0.16, 0.16, 0.16, 0.16, 0.16, 0.16, 0.16]);
  });

  it('runs matrix eigenvalue idioms', () => {
    const result = runCompatScript(`
indicator("Matrix eigenvalues")
values = matrix.new_float(2, 2, 0)
values.set(0, 0, 2)
values.set(0, 1, 4)
values.set(1, 0, 6)
values.set(1, 1, 8)
eigen = matrix.eigenvalues(values)
plot(array.size(eigen), title="Count")
plot(array.get(eigen, 0), title="First")
plot(array.get(eigen, 1), title="Second")
`);

    expect(result.errors).toEqual([]);
    expect(roundSeries(getPlot(result, 'Count').values)).toEqual([2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2]);
    expect(roundSeries(getPlot(result, 'First').values)).toEqual([10.744563, 10.744563, 10.744563, 10.744563, 10.744563, 10.744563, 10.744563, 10.744563, 10.744563, 10.744563, 10.744563, 10.744563]);
    expect(roundSeries(getPlot(result, 'Second').values)).toEqual([-0.744563, -0.744563, -0.744563, -0.744563, -0.744563, -0.744563, -0.744563, -0.744563, -0.744563, -0.744563, -0.744563, -0.744563]);
  });

  it('runs matrix eigenvector idioms', () => {
    const result = runCompatScript(`
indicator("Matrix eigenvectors")
values = matrix.new_float(2, 2, 0)
values.set(0, 0, 2)
values.set(1, 1, 3)
vectors = matrix.eigenvectors(values)
plot(vectors.rows(), title="Rows")
plot(vectors.columns(), title="Columns")
plot(vectors.get(0, 0), title="First X")
plot(vectors.get(1, 0), title="First Y")
plot(vectors.get(0, 1), title="Second X")
plot(vectors.get(1, 1), title="Second Y")
`);

    expect(result.errors).toEqual([]);
    expect(roundSeries(getPlot(result, 'Rows').values)).toEqual([2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2]);
    expect(roundSeries(getPlot(result, 'Columns').values)).toEqual([2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2]);
    expect(roundSeries(getPlot(result, 'First X').values)).toEqual([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
    expect(roundSeries(getPlot(result, 'First Y').values)).toEqual([1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]);
    expect(roundSeries(getPlot(result, 'Second X').values)).toEqual([1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]);
    expect(roundSeries(getPlot(result, 'Second Y').values)).toEqual([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
  });

  it('runs matrix UDT sort field idioms', () => {
    const result = runCompatScript(`
indicator("Matrix UDT sort fields")
type Ranked
    float score
    string name
values = matrix.new<Ranked>()
values.add_row(array.from(Ranked.new(3, "C"), Ranked.new(30, "cc")))
values.add_row(array.from(Ranked.new(1, "A"), Ranked.new(10, "aa")))
values.add_row(array.from(Ranked.new(2, "B"), Ranked.new(20, "bb")))
values.sort(0, order.ascending, "score")
firstByName = values.get(0, 0)
matrix.sort(values, 1, order.descending, 1)
firstByIndex = values.get(0, 1)
plot(firstByName.score, title="First Score")
plot(firstByIndex.score, title="First Column Score")
`);

    expect(result.errors).toEqual([]);
    expect(roundSeries(getPlot(result, 'First Score').values)).toEqual([1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]);
    expect(roundSeries(getPlot(result, 'First Column Score').values)).toEqual([30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30]);
  });

  it('prefers scoped matrix receivers over the matrix namespace', () => {
    const result = runCompatScript(`
indicator("Matrix receiver shadowing")
matrix = matrix.new_int(2, 2, 0)
matrix.set(0, 0, 7)
plot(matrix.rows(), title="Rows")
plot(matrix.get(0, 0), title="First")
`);

    expect(result.errors).toEqual([]);
    expect(roundSeries(getPlot(result, 'Rows').values)).toEqual([2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2]);
    expect(roundSeries(getPlot(result, 'First').values)).toEqual([7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7]);
  });
});
