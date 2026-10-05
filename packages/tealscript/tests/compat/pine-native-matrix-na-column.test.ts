import { describe, expect, it } from 'vitest';

import { createPineMatrix, getMatrixValue, removeMatrixColumn, swapMatrixColumns } from '../../src/runtime/matrices';
import { getPlot, runCompatScript } from './fixtures';

// Native v5 captures: remove_col SHA 2a8b8faa, swap_columns SHA 0c35b642.
// Both use one column; wider missing-index policy remains unobserved.
describe('native one-column missing matrix indices', () => {
  it('removes the captured sole column with an explicit missing index', () => {
    const result = runCompatScript(`//@version=6
indicator("Corpus matrix remove_col missing index v1")
values = matrix.new<float>(1, 1, close)
matrix.remove_col(values, int(na))
plot(matrix.columns(values), "columns_after")
plot(close, "close_control")`);
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'columns_after').values).toEqual(Array(12).fill(0));
  });

  it('retains the captured sole column when swapping missing with zero', () => {
    const result = runCompatScript(`//@version=6
indicator("Corpus matrix swap_columns missing index v1")
values = matrix.new<float>(1, 1, close)
matrix.swap_columns(values, int(na), 0)
plot(matrix.columns(values), "columns_after")
plot(close, "close_control")`);
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'columns_after').values).toEqual(Array(12).fill(1));
  });

  it('preserves valid-index removal and swaps', () => {
    const matrix = createPineMatrix<number>(1, 2, 3);
    matrix.values[1] = 7;
    swapMatrixColumns(matrix, 0, 1);
    expect(matrix.values).toEqual([7, 3]);
    expect(removeMatrixColumn(matrix, 1).values).toEqual([3]);
    expect(matrix.values).toEqual([7]);
  });

  it('retains unobserved missing-index refusals', () => {
    const matrix = createPineMatrix<number>(1, 2, 3);
    expect(() => removeMatrixColumn(matrix, NaN)).toThrow();
    expect(() => swapMatrixColumns(matrix, NaN, 0)).toThrow();
    expect(() => getMatrixValue(matrix, 0, NaN)).toThrow();
    const tall = createPineMatrix<number>(2, 1, 3);
    expect(() => removeMatrixColumn(tall, NaN)).toThrow();
    expect(() => swapMatrixColumns(tall, NaN, 0)).toThrow();
    const sole = createPineMatrix<number>(1, 1, 3);
    expect(() => swapMatrixColumns(sole, 0, NaN)).toThrow();
    expect(() => swapMatrixColumns(sole, NaN, 1)).toThrow();
  });
});
