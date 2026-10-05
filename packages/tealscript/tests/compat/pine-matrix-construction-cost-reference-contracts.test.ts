import { describe, expect, it, vi } from 'vitest';

import { parse } from '../../src/parser';
import { MATRIX_HELPERS } from '../../src/runtime/codegen/compile';
import { executeCompiledScript } from '../../src/runtime/codegen/execute';
import type { PineMatrix } from '../../src/runtime/matrices';

const bar = { time: 60_000, open: 10, high: 11, low: 9, close: 10, volume: 100 };

function measureCellWrites(body: string): number {
  const create = MATRIX_HELPERS.create;
  let cellWrites = 0;
  let allocated: PineMatrix | undefined;
  const spy = vi.spyOn(MATRIX_HELPERS, 'create').mockImplementation((...args) => {
    const matrix = create(...args);
    cellWrites += matrix.values.length;
    matrix.values = new Proxy(matrix.values, {
      set(target, property, value, receiver) {
        if (typeof property === 'string' && /^\d+$/.test(property)) cellWrites += 1;
        return Reflect.set(target, property, value, receiver);
      },
    });
    allocated = matrix;
    return matrix;
  });
  try {
    const execution = executeCompiledScript(parse(`//@version=6
indicator("Matrix construction cost")
${body}
plot(matrix.avg(m))`), [bar]);
    if (execution.status !== 'success') throw new Error(execution.reason);
    expect(execution.result.errors).toEqual([]);
    expect(execution.result.plots[0].values).toEqual([31]);
    expect(allocated?.values).toEqual(Array(64).fill(31));
    return cellWrites;
  } finally {
    spy.mockRestore();
  }
}

// fun_matrix.add_col / method matrix.add_col remarks[0]: preallocation and row insertion are cheaper.
// Count initialized cells plus actual storage writes; this bounds work without relying on wall-clock load.
describe('matrix construction storage work', () => {
  it.each(['namespace', 'method'])('avoids repeated column movement through the %s form', (form) => {
    const columnCall = form === 'namespace' ? 'matrix.add_col(m, i, values)' : 'm.add_col(i, values)';
    const rowCall = form === 'namespace' ? 'matrix.add_row(m, i, values)' : 'm.add_row(i, values)';
    const preallocated = measureCellWrites('m = matrix.new<float>(8, 8, 31)');
    const columns = measureCellWrites(`m = matrix.new<float>(8, 0)
values = array.new<float>(8, 31)
for i = 0 to 7
    ${columnCall}`);
    const rows = measureCellWrites(`m = matrix.new<float>(0, 8)
values = array.new<float>(8, 31)
for i = 0 to 7
    ${rowCall}`);

    expect(columns).toBeGreaterThan(preallocated);
    expect(columns).toBeGreaterThan(rows * 2);
  });
});
