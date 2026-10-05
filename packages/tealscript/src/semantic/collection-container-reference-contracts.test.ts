import { describe, expect, it } from 'vitest';

import { parse } from '../parser';
import { checkProgram } from './checker';

const cases = [
  ['array', 'array.abs(ID)', 'id', 'a'],
  ['array', 'array.avg(ID)', 'id', 'a'],
  ['array', 'array.binary_search(ID, 17)', 'id', 'a'],
  ['array', 'array.binary_search_leftmost(ID, 17)', 'id', 'a'],
  ['array', 'array.binary_search_rightmost(ID, 17)', 'id', 'a'],
  ['array', 'array.clear(ID)', 'id', 'a'],
  ['array', 'array.concat(ID, a)', 'id1', 'a'],
  ['array', 'array.copy(ID)', 'id', 'a'],
  ['array', 'array.covariance(ID, a, true)', 'id1', 'a'],
  ['array', 'array.every(ID)', 'id', 'b'],
  ['array', 'array.fill(ID, 17)', 'id', 'a'],
  ['array', 'array.first(ID)', 'id', 'a'],
  ['array', 'array.get(ID, 0)', 'id', 'a'],
  ['array', 'array.includes(ID, 17)', 'id', 'a'],
  ['array', 'array.indexof(ID, 17)', 'id', 'a'],
  ['array', 'array.insert(ID, 0, 17)', 'id', 'a'],
  ['array', 'array.join(ID, "|")', 'id', 'a'],
  ['array', 'array.last(ID)', 'id', 'a'],
  ['array', 'array.lastindexof(ID, 17)', 'id', 'a'],
  ['array', 'array.max(ID, 0)', 'id', 'a'],
  ['array', 'array.median(ID)', 'id', 'a'],
  ['array', 'array.min(ID, 0)', 'id', 'a'],
  ['array', 'array.mode(ID)', 'id', 'a'],
  ['array', 'array.percentile_linear_interpolation(ID, 50)', 'id', 'a'],
  ['array', 'array.percentile_nearest_rank(ID, 50)', 'id', 'a'],
  ['array', 'array.percentrank(ID, 0)', 'id', 'a'],
  ['array', 'array.pop(ID)', 'id', 'a'],
  ['array', 'array.push(ID, 17)', 'id', 'a'],
  ['array', 'array.range(ID)', 'id', 'a'],
  ['array', 'array.remove(ID, 0)', 'id', 'a'],
  ['array', 'array.reverse(ID)', 'id', 'a'],
  ['array', 'array.set(ID, 0, 17)', 'id', 'a'],
  ['array', 'array.shift(ID)', 'id', 'a'],
  ['array', 'array.size(ID)', 'id', 'a'],
  ['array', 'array.slice(ID, 0, 1)', 'id', 'a'],
  ['array', 'array.some(ID)', 'id', 'b'],
  ['array', 'array.sort(ID)', 'id', 'a'],
  ['array', 'array.sort_indices(ID)', 'id', 'a'],
  ['array', 'array.standardize(ID)', 'id', 'a'],
  ['array', 'array.stdev(ID, true)', 'id', 'a'],
  ['array', 'array.sum(ID)', 'id', 'a'],
  ['array', 'array.unshift(ID, 17)', 'id', 'a'],
  ['array', 'array.variance(ID, true)', 'id', 'a'],
  ['matrix', 'matrix.add_col(ID, 0, a)', 'id', 'm'],
  ['matrix', 'matrix.add_row(ID, 0, a)', 'id', 'm'],
  ['matrix', 'matrix.avg(ID)', 'id', 'm'],
  ['matrix', 'matrix.col(ID, 0)', 'id', 'm'],
  ['matrix', 'matrix.columns(ID)', 'id', 'm'],
  ['matrix', 'matrix.concat(ID, m)', 'id1', 'm'],
  ['matrix', 'matrix.copy(ID)', 'id', 'm'],
  ['matrix', 'matrix.det(ID)', 'id', 'm'],
  ['matrix', 'matrix.diff(ID, 17)', 'id1', 'm'],
  ['matrix', 'matrix.eigenvalues(ID)', 'id', 'm'],
  ['matrix', 'matrix.eigenvectors(ID)', 'id', 'm'],
  ['matrix', 'matrix.elements_count(ID)', 'id', 'm'],
  ['matrix', 'matrix.fill(ID, 17)', 'id', 'm'],
  ['matrix', 'matrix.get(ID, 0, 0)', 'id', 'm'],
  ['matrix', 'matrix.inv(ID)', 'id', 'm'],
  ['matrix', 'matrix.kron(ID, m)', 'id1', 'm'],
  ['matrix', 'matrix.max(ID)', 'id', 'm'],
  ['matrix', 'matrix.median(ID)', 'id', 'm'],
  ['matrix', 'matrix.min(ID)', 'id', 'm'],
  ['matrix', 'matrix.mode(ID)', 'id', 'm'],
  ['matrix', 'matrix.mult(ID, 17)', 'id1', 'm'],
  ['matrix', 'matrix.pinv(ID)', 'id', 'm'],
  ['matrix', 'matrix.pow(ID, 2)', 'id', 'm'],
  ['matrix', 'matrix.rank(ID)', 'id', 'm'],
  ['matrix', 'matrix.remove_col(ID, 0)', 'id', 'm'],
  ['matrix', 'matrix.remove_row(ID, 0)', 'id', 'm'],
  ['matrix', 'matrix.reshape(ID, 1, 4)', 'id', 'm'],
  ['matrix', 'matrix.reverse(ID)', 'id', 'm'],
  ['matrix', 'matrix.row(ID, 0)', 'id', 'm'],
  ['matrix', 'matrix.rows(ID)', 'id', 'm'],
  ['matrix', 'matrix.set(ID, 0, 0, 17)', 'id', 'm'],
  ['matrix', 'matrix.sort(ID)', 'id', 'm'],
  ['matrix', 'matrix.submatrix(ID)', 'id', 'm'],
  ['matrix', 'matrix.sum(ID, 17)', 'id1', 'm'],
  ['matrix', 'matrix.swap_columns(ID, 0, 1)', 'id', 'm'],
  ['matrix', 'matrix.swap_rows(ID, 0, 1)', 'id', 'm'],
  ['matrix', 'matrix.trace(ID)', 'id', 'm'],
  ['matrix', 'matrix.transpose(ID)', 'id', 'm'],
  ['matrix', 'matrix.is_antidiagonal(ID)', 'id', 'm'],
  ['matrix', 'matrix.is_antisymmetric(ID)', 'id', 'm'],
  ['matrix', 'matrix.is_binary(ID)', 'id', 'm'],
  ['matrix', 'matrix.is_diagonal(ID)', 'id', 'm'],
  ['matrix', 'matrix.is_identity(ID)', 'id', 'm'],
  ['matrix', 'matrix.is_square(ID)', 'id', 'm'],
  ['matrix', 'matrix.is_stochastic(ID)', 'id', 'm'],
  ['matrix', 'matrix.is_symmetric(ID)', 'id', 'm'],
  ['matrix', 'matrix.is_triangular(ID)', 'id', 'm'],
  ['matrix', 'matrix.is_zero(ID)', 'id', 'm'],
  ['map', 'map.clear(ID)', 'id', 'p'],
  ['map', 'map.contains(ID, "key")', 'id', 'p'],
  ['map', 'map.copy(ID)', 'id', 'p'],
  ['map', 'map.get(ID, "key")', 'id', 'p'],
  ['map', 'map.keys(ID)', 'id', 'p'],
  ['map', 'map.put(ID, "key", 17)', 'id', 'p'],
  ['map', 'map.put_all(ID, p)', 'id', 'p'],
  ['map', 'map.remove(ID, "key")', 'id', 'p'],
  ['map', 'map.size(ID)', 'id', 'p'],
  ['map', 'map.values(ID)', 'id', 'p'],
] as const;

const check = (call: string) => checkProgram(parse(`//@version=6
indicator("Collection ID argument types")
a = array.from(17, -8)
b = array.from(false, true)
m = matrix.new<int>(2, 2, 17)
p = map.new<string, int>()
${call}
`));

describe('documented collection ID argument kinds', () => {
  for (const [kind, call, parameter, valid] of cases) {
    it(`${call.split('(')[0]} ${parameter} requires a ${kind} reference in positional and named calls`, () => {
      const reference = `https://www.tradingview.com/pine-script-reference/v6/#fun_${call.split('(')[0]}`;
      for (const prefix of ['', `${parameter}=`]) {
        expect(check(call.replace('ID', prefix + valid)).diagnostics, reference).toEqual([]);
        for (const invalid of ['17', '17.5', '"wrong"', 'false']) {
          expect(check(call.replace('ID', prefix + invalid)).diagnostics, reference).toEqual([
            expect.objectContaining({ code: 'type-mismatch' }),
          ]);
        }
      }
    });
  }
});
