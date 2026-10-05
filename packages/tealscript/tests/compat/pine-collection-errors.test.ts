import type { Bar } from '../../src/runtime/context';

import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser/parser';
import { executeScript } from '../../src/runtime/compiledOnly';
import { InMemoryRequestDatafeed } from '../../src/runtime/requestDatafeed';
import { addMatrixColumn, addMatrixRow, concatMatrix, createPineMatrix } from '../../src/runtime/matrices';
import { checkProgram } from '../../src/semantic/checker';

// Reference-derived refusal contracts from the Pine v6 Arrays and Matrices
// manuals' error-handling sections. Every valid control uses small hand-built
// collections. No capture CSVs or generated audit output are loaded by tests.
const bars: Bar[] = [0, 1, 2].map((index) => ({
  time: 1_700_000_000_000 + index * 120_000,
  open: 10,
  high: 12,
  low: 9,
  close: 11,
  volume: 100,
}));
function run(body: string, options?: Parameters<typeof executeScript>[3]) {
  const ast = parse(`//@version=6
indicator("Collection refusal")
${body}
plot(close, "After")`);
  expect(checkProgram(ast, { libraries: options?.libraries }).diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
  return executeScript(ast, bars, undefined, options);
}
function expectRefusal(body: string, message: RegExp) {
  const result = run(body);
  expect(result.errors).toHaveLength(1);
  expect(result.errors[0].message).toMatch(message);
  expect(result.profile.swallowedErrors).toBeUndefined();
  expect(result.profile.compiledBarErrors ?? 0).toBe(0);
  expect(result.plots.every((plot) => plot.values.every((value) => value === null))).toBe(true);
}
const receivers = [
  ['array.copy', 'array.copy(a)'],
  ['array.slice', 'array.slice(a,0,2)'],
  ['array.size', 'array.size(a)'],
  ['array.first', 'array.first(a)'],
  ['array.last', 'array.last(a)'],
  ['array.every', 'array.every(a)'],
  ['array.some', 'array.some(a)'],
  ['array.get', 'array.get(a,0)'],
  ['array.min', 'array.min(a,0)'],
  ['array.max', 'array.max(a,0)'],
  ['array.range', 'array.range(a)'],
  ['array.sum', 'array.sum(a)'],
  ['array.set', 'array.set(a,0,1.0)'],
  ['array.fill', 'array.fill(a,1.0,0,2)'],
  ['array.insert', 'array.insert(a,0,1.0)'],
  ['array.join', 'array.join(a,",")'],
  ['array.push', 'array.push(a,1.0)'],
  ['array.remove', 'array.remove(a,0)'],
  ['array.pop', 'array.pop(a)'],
  ['array.clear', 'array.clear(a)'],
  ['array.sort', 'array.sort(a,order.ascending)'],
  ['array.sort_indices', 'array.sort_indices(a,order.ascending)'],
  ['array.percentrank', 'array.percentrank(a,0)'],
  ['array.percentile_nearest_rank', 'array.percentile_nearest_rank(a,50)'],
  ['array.percentile_linear_interpolation', 'array.percentile_linear_interpolation(a,50)'],
  ['array.abs', 'array.abs(a)'],
  ['array.binary_search', 'array.binary_search(a,1.0)'],
  ['array.binary_search_leftmost', 'array.binary_search_leftmost(a,1.0)'],
  ['array.binary_search_rightmost', 'array.binary_search_rightmost(a,1.0)'],
  ['array.concat', 'array.concat(a,a)'],
  ['array.avg', 'array.avg(a)'],
  ['array.stdev', 'array.stdev(a,true)'],
  ['array.variance', 'array.variance(a,true)'],
  ['array.covariance', 'array.covariance(a,a,true)'],
  ['array.mode', 'array.mode(a)'],
  ['array.median', 'array.median(a)'],
  ['array.standardize', 'array.standardize(a)'],
  ['array.indexof', 'array.indexof(a,1.0)'],
  ['array.lastindexof', 'array.lastindexof(a,1.0)'],
  ['array.includes', 'array.includes(a,1.0)'],
  ['array.shift', 'array.shift(a)'],
  ['array.unshift', 'array.unshift(a,1.0)'],
  ['array.reverse', 'array.reverse(a)'],
  ['matrix.row', 'matrix.row(a,0)'],
  ['matrix.col', 'matrix.col(a,0)'],
  ['matrix.reshape', 'matrix.reshape(a,2,2)'],
  ['matrix.get', 'matrix.get(a,0,0)'],
  ['matrix.set', 'matrix.set(a,0,0,1.0)'],
  ['matrix.add_row', 'matrix.add_row(a,0,array.from(1.0,2.0))'],
  ['matrix.add_col', 'matrix.add_col(a,0,array.from(1.0,2.0))'],
  ['matrix.remove_row', 'matrix.remove_row(a,0)'],
  ['matrix.remove_col', 'matrix.remove_col(a,0)'],
  ['matrix.fill', 'matrix.fill(a,1.0,0,2,0,2)'],
  ['matrix.submatrix', 'matrix.submatrix(a,0,2,0,2)'],
  ['matrix.copy', 'matrix.copy(a)'],
  ['matrix.columns', 'matrix.columns(a)'],
  ['matrix.rows', 'matrix.rows(a)'],
  ['matrix.elements_count', 'matrix.elements_count(a)'],
  ['matrix.concat', 'matrix.concat(a,a)'],
  ['matrix.swap_rows', 'matrix.swap_rows(a,0,1)'],
  ['matrix.swap_columns', 'matrix.swap_columns(a,0,1)'],
  ['matrix.reverse', 'matrix.reverse(a)'],
  ['matrix.sort', 'matrix.sort(a,0,order.ascending)'],
  ['matrix.det', 'matrix.det(a)'],
  ['matrix.min', 'matrix.min(a)'],
  ['matrix.max', 'matrix.max(a)'],
  ['matrix.avg', 'matrix.avg(a)'],
  ['matrix.median', 'matrix.median(a)'],
  ['matrix.mode', 'matrix.mode(a)'],
  ['matrix.transpose', 'matrix.transpose(a)'],
  ['matrix.sum', 'matrix.sum(a,a)'],
  ['matrix.diff', 'matrix.diff(a,a)'],
  ['matrix.mult', 'matrix.mult(a,a)'],
  ['matrix.pinv', 'matrix.pinv(a)'],
  ['matrix.inv', 'matrix.inv(a)'],
  ['matrix.rank', 'matrix.rank(a)'],
  ['matrix.trace', 'matrix.trace(a)'],
  ['matrix.eigenvalues', 'matrix.eigenvalues(a)'],
  ['matrix.eigenvectors', 'matrix.eigenvectors(a)'],
  ['matrix.kron', 'matrix.kron(a,a)'],
  ['matrix.pow', 'matrix.pow(a,2)'],
  ['matrix.is_zero', 'matrix.is_zero(a)'],
  ['matrix.is_identity', 'matrix.is_identity(a)'],
  ['matrix.is_binary', 'matrix.is_binary(a)'],
  ['matrix.is_symmetric', 'matrix.is_symmetric(a)'],
  ['matrix.is_antisymmetric', 'matrix.is_antisymmetric(a)'],
  ['matrix.is_diagonal', 'matrix.is_diagonal(a)'],
  ['matrix.is_antidiagonal', 'matrix.is_antidiagonal(a)'],
  ['matrix.is_triangular', 'matrix.is_triangular(a)'],
  ['matrix.is_stochastic', 'matrix.is_stochastic(a)'],
  ['matrix.is_square', 'matrix.is_square(a)'],
] as const;

describe('collection runtime refusals', () => {
  it('keeps collection parameter hints scoped across UDFs and orders named receiver arguments', () => {
    const result = run(`readArray(array<float> receiver) => receiver.get(index=1)
readMatrix(matrix<float> receiver) => receiver.get(column=1, row=0)
a = array.from(3.0, 7.0)
m = matrix.new<float>(2, 2, 0.0)
m.set(0, 1, 9.0)
plot(readArray(a), "Array")
plot(readMatrix(m), "Matrix")`);
    expect(result.errors).toEqual([]);
    expect(result.plots[0].values).toEqual([7, 7, 7]);
    expect(result.plots[1].values).toEqual([9, 9, 9]);
    for (const [type, name, message] of [
      ['array<float>', 'readArray', /^Array.*na/],
      ['matrix<float>', 'readMatrix', /^Matrix.*na/],
    ] as const) {
      expectRefusal(`readArray(array<float> receiver) => receiver.get(index=1)
readMatrix(matrix<float> receiver) => receiver.get(column=1, row=0)
${type} missing = na
${name}(missing)`, message);
    }
  });

  it('preserves a local method named size ahead of generic collection dispatch on na', () => {
    const result = run(`method size(array<float> receiver) => 17
operation(array<float> receiver) => receiver.size()
array<float> missing = na
plot(operation(missing), "Custom")`);
    expect(result.errors).toEqual([]);
    expect(result.plots[0].values).toEqual([17, 17, 17]);
  });

  it('preserves map, UDT, and chart.point copy dispatch through UDF parameters', () => {
    const result = run(`type Store
    float value
copyMap(map<string, float> receiver) => receiver.copy()
copyStore(Store receiver) => receiver.copy()
copyPoint(chart.point receiver) => receiver.copy()
m = map.new<string, float>()
m.put("key", 5.0)
s = Store.new(7.0)
p = chart.point.from_index(0, 9.0)
mc = copyMap(m)
sc = copyStore(s)
pc = copyPoint(p)
plot(mc.get("key"), "Map")
plot(sc.value, "UDT")
plot(pc.price, "Point")
Store missingStore = na
chart.point missingPoint = na
plot(na(copyStore(missingStore)) ? 1 : 0, "Missing UDT")
plot(na(copyPoint(missingPoint)) ? 1 : 0, "Missing point")`);
    expect(result.errors).toEqual([]);
    expect(result.profile.swallowedErrors).toBeUndefined();
    expect(result.plots.slice(0, 5).map((plot) => plot.values)).toEqual([
      [5, 5, 5], [7, 7, 7], [9, 9, 9], [1, 1, 1], [1, 1, 1],
    ]);
  });

  it.each(['array<float>', 'matrix<float>'])('refuses a missing %s default through nested UDF calls', (type) => {
    const method = type.startsWith('array') ? 'size' : 'rows';
    expectRefusal(`inner(${type} receiver) => receiver.${method}()
outer(${type} receiver = na) => inner(receiver)
outer()`, /^(Array|Matrix).*na/);
  });

  it.each(['array<float>', 'matrix<float>'])('propagates a library UDF refusal for %s', (type) => {
    const method = type.startsWith('array') ? 'size' : 'rows';
    const library = parse(`//@version=6
library("Collections")
export read(${type} receiver) => receiver.${method}()`);
    const result = run(`import TestUser/Collections/1 as lib
${type} missing = na
value = lib.read(missing)`, { libraries: new Map([['TestUser/Collections/1', library]]) });
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].message).toMatch(/^(Array|Matrix).*na/);
    expect(result.profile.swallowedErrors).toBeUndefined();
    expect(result.plots.every((plot) => plot.values.every((value) => value === null))).toBe(true);
  });

  it.each(['array<float>', 'matrix<float>'])('propagates a request-expression UDF refusal for %s', (type) => {
    const method = type.startsWith('array') ? 'size' : 'columns';
    const result = run(`read(${type} receiver) => receiver.${method}()
${type} missing = na
value = request.security("TEST", "D", read(missing))`, {
      requestDatafeed: new InMemoryRequestDatafeed([{ symbol: 'TEST', timeframe: 'D', bars }]),
    });
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].message).toMatch(/^(Array|Matrix).*na/);
    expect(result.profile.swallowedErrors).toBeUndefined();
  });

  it.each([
    ['array<float>', 'receiver.size()', 'array.from(1.0, 2.0)'],
    ['array<float>', 'receiver.clear()', 'array.from(1.0, 2.0)'],
    ['array<float>', 'receiver.copy()', 'array.from(1.0, 2.0)'],
    ['matrix<float>', 'receiver.columns()', 'matrix.new<float>(2, 2, 1.0)'],
    ['matrix<float>', 'receiver.copy()', 'matrix.new<float>(2, 2, 1.0)'],
    ['matrix<float>', 'receiver.get(0, 0)', 'matrix.new<float>(2, 2, 1.0)'],
  ])('refuses an untyped UDF %s receiver calling %s', (type, call, init) => {
    const udf = `operation(receiver) => ${call}`;
    const control = run(`${udf}\na = ${init}\noperation(a)`);
    expect(control.errors).toEqual([]);
    expect(control.plots[0].values).toEqual([11, 11, 11]);
    expectRefusal(`${udf}\n${type} a = na\noperation(a)`, /Collection methods.*na/);
  });

  for (const [name, invocation] of receivers) {
    const matrix = name.startsWith('matrix.');
    const boolean = name === 'array.every' || name === 'array.some';
    const type = matrix ? 'matrix<float>' : boolean ? 'array<bool>' : 'array<float>';
    const setup = matrix
      ? `a = matrix.new<float>(2, 2, 0.0)
matrix.set(a, 0, 0, 1.0)
matrix.set(a, 1, 1, 2.0)`
      : boolean
        ? 'a = array.from(true, false, true)'
        : 'a = array.from(1.0, 2.0, 3.0)';
    it(`${name} rejects a typed UDF receiver that is na, with a passing valid control`, () => {
      const call = invocation.replace(name + '(a', 'receiver.' + name.split('.')[1] + '(')
        .replace('(,', '(').replace(/\ba\b/g, 'receiver');
      const udf = `operation(${type} receiver) => ${call}`;
      const control = run(`${udf}\n${setup}\noperation(a)`);
      expect(control.errors).toEqual([]);
      expect(control.profile.swallowedErrors).toBeUndefined();
      expect(control.plots[0].values).toEqual([11, 11, 11]);
      expectRefusal(`${udf}\n${type} a = na\noperation(a)`, /^(Array|Matrix).*na/i);
    });
    for (const method of [false, true]) {
      const call = method
        ? invocation.replace(name + '(a', 'a.' + name.split('.')[1] + '(').replace('(,', '(')
        : invocation;
      it(`${name} rejects na via ${method ? 'receiver' : 'namespace'} calls, with a passing valid control`, () => {
        const control = run(`${setup}\n${call}`);
        expect(control.errors).toEqual([]);
        expect(control.profile.swallowedErrors).toBeUndefined();
        expect(control.plots[0].values).toEqual([11, 11, 11]);
        expectRefusal(`${type} a = na\n${call}`, /^(Array|Matrix).*na/i);
      });
    }
  }

  it.each([
    ['array.insert(a, -4, 9.0)', /Array index -4 is out of bounds/],
    ['array.percentrank(a, 3)', /Array index 3 is out of bounds/],
    ['array.percentrank(a, -4)', /Array index -4 is out of bounds/],
    ['array.slice(a, 1, 1)', /Index 'from' should be less than index 'to'/],
  ] as const)('refuses %s', (call, message) => {
    expectRefusal(`a = array.from(1.0, 2.0, 3.0)\n${call}`, message);
  });

  it.each(['matrix.submatrix(a, 1, 1, 0, 2)', 'matrix.submatrix(a, 0, 2, 1, 1)'])('refuses %s', (call) => {
    expectRefusal(`a = matrix.new<float>(2, 2, 1.0)\n${call}`, /Matrix.*range/);
  });

  it.each([
    'a = matrix.new<float>(100001, 1, 0.0)',
    'a = matrix.new<float>(1, 100001, 0.0)',
    'a = matrix.new<float>(50000, 2, 0.0)\nmatrix.add_row(a)',
    'a = matrix.new<float>(2, 50000, 0.0)\nmatrix.add_col(a)',
    'a = matrix.new<float>(50000, 2, 0.0)\nb = matrix.new<float>(1, 2, 0.0)\nmatrix.concat(a, b)',
  ])('refuses matrix capacity overflow: %s', (body) => {
    expectRefusal(body, /Matrix is too large/);
  });

  it.each([
    ['array', 'array.concat(a, missing)'],
    ['array', 'array.covariance(a, missing)'],
    ['matrix', 'matrix.concat(a, missing)'],
    ['matrix', 'matrix.kron(a, missing)'],
  ])('refuses a missing second %s receiver: %s', (kind, call) => {
    const setup = kind === 'array' ? 'a = array.from(1.0, 2.0)' : 'a = matrix.new<float>(2, 2, 1.0)';
    expectRefusal(`${setup}\n${kind}<float> missing = na\n${call}`, /^(Array|Matrix).*na/i);
  });

  it('supports valid insertion endpoints and percentile-rank element indices', () => {
    const result = run(`a = array.from(1.0, 2.0, 3.0)
array.insert(a, -3, 0.0)
array.insert(a, 4, 4.0)
plot(array.get(a, 0), "First")
plot(array.get(a, -1), "Last")
plot(array.percentrank(a, 4), "Rank")`);
    expect(result.errors).toEqual([]);
    expect(result.plots.find((p) => p.title === 'First')?.values).toEqual([0, 0, 0]);
    expect(result.plots.find((p) => p.title === 'Last')?.values).toEqual([4, 4, 4]);
    expect(result.plots.find((p) => p.title === 'Rank')?.values).toEqual([100, 100, 100]);
  });

  it('allows the matrix capacity boundary and leaves refused growth unchanged', () => {
    const rows = createPineMatrix(49_999, 2, 7);
    addMatrixRow(rows, undefined);
    expect([rows.rows, rows.columns, rows.values.length]).toEqual([50_000, 2, 100_000]);
    const savedRows = [...rows.values];
    expect(() => addMatrixRow(rows, undefined)).toThrow('Matrix is too large');
    expect(() => concatMatrix(rows, createPineMatrix(1, 2, 9))).toThrow('Matrix is too large');
    expect([rows.rows, rows.columns, rows.values.length]).toEqual([50_000, 2, 100_000]);
    expect(rows.values).toEqual(savedRows);
    const columns = createPineMatrix(2, 49_999, 7);
    addMatrixColumn(columns, undefined);
    expect([columns.rows, columns.columns, columns.values.length]).toEqual([2, 50_000, 100_000]);
    const savedColumns = [...columns.values];
    expect(() => addMatrixColumn(columns, undefined)).toThrow('Matrix is too large');
    expect([columns.rows, columns.columns, columns.values.length]).toEqual([2, 50_000, 100_000]);
    expect(columns.values).toEqual(savedColumns);
  });

  it('returns na for percentrank of an empty array', () => {
    const result = run(`a = array.new<float>()
plot(array.percentrank(a, 0), "Rank")`);
    expect(result.errors).toEqual([]);
    expect(result.plots.find((p) => p.title === 'Rank')?.values).toEqual([null, null, null]);
  });

  it('reports a missing receiver inside a UDF and a persistent initializer', () => {
    expectRefusal(
      `f(array<float> a) => array.size(a)
array<float> missing = na
var size = f(missing)`,
      /Array.*na/i,
    );
  });
});
