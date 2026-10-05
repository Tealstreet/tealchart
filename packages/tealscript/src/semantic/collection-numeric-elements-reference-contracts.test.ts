import { describe, expect, it } from 'vitest';

import { parse } from '../parser';
import { checkProgram } from './checker';

const helpers = [
  ['array', 'abs', '', 'id'],
  ['array', 'avg', '', 'id'],
  ['array', 'covariance', ', ai', 'id1'],
  ['array', 'max', ', 0', 'id'],
  ['array', 'median', '', 'id'],
  ['array', 'min', ', 0', 'id'],
  ['array', 'mode', '', 'id'],
  ['array', 'percentile_linear_interpolation', ', 50', 'id'],
  ['array', 'percentile_nearest_rank', ', 50', 'id'],
  ['array', 'percentrank', ', 0', 'id'],
  ['array', 'range', '', 'id'],
  ['array', 'standardize', '', 'id'],
  ['array', 'stdev', ', true', 'id'],
  ['array', 'sum', '', 'id'],
  ['array', 'variance', ', true', 'id'],
  ['matrix', 'avg', '', 'id'],
  ['matrix', 'det', '', 'id'],
  ['matrix', 'diff', ', 17', 'id1'],
  ['matrix', 'eigenvalues', '', 'id'],
  ['matrix', 'eigenvectors', '', 'id'],
  ['matrix', 'inv', '', 'id'],
  ['matrix', 'kron', ', mi', 'id1'],
  ['matrix', 'max', '', 'id'],
  ['matrix', 'median', '', 'id'],
  ['matrix', 'min', '', 'id'],
  ['matrix', 'mode', '', 'id'],
  ['matrix', 'mult', ', 17', 'id1'],
  ['matrix', 'pinv', '', 'id'],
  ['matrix', 'pow', ', 2', 'id'],
  ['matrix', 'trace', '', 'id'],
  ['matrix', 'sum', ', 17', 'id1'],
  ['matrix', 'is_antidiagonal', '', 'id'],
  ['matrix', 'is_antisymmetric', '', 'id'],
  ['matrix', 'is_binary', '', 'id'],
  ['matrix', 'is_diagonal', '', 'id'],
  ['matrix', 'is_identity', '', 'id'],
  ['matrix', 'is_stochastic', '', 'id'],
  ['matrix', 'is_symmetric', '', 'id'],
  ['matrix', 'is_triangular', '', 'id'],
  ['matrix', 'is_zero', '', 'id'],
] as const;

const check = (call: string) => checkProgram(parse(`//@version=6
indicator("Numeric collection element types")
type Point
    int score
ai = array.from(17, -8)
af = array.from(17.5, -8.5)
ab = array.from(false, true)
astring = array.from("alpha", "beta")
ap = array.from(Point.new(17), Point.new(-8))
mi = matrix.new<int>(2, 2, 17)
mf = matrix.new<float>(2, 2, 17.5)
mb = matrix.new<bool>(2, 2, false)
mstring = matrix.new<string>(2, 2, "alpha")
mp = matrix.new<Point>(2, 2, Point.new(17))
${call}
`));

describe('documented numeric collection helper element types', () => {
  for (const [kind, member, tail, parameter] of helpers) {
    it(`${kind}.${member} accepts int and float elements and rejects boolean string and object elements`, () => {
      const reference = `https://www.tradingview.com/pine-script-reference/v6/#fun_${kind}.${member}`;
      const prefix = kind === 'array' ? 'a' : 'm';
      const calls = (id: string) => [
        `${kind}.${member}(${id}${tail})`,
        `${kind}.${member}(${parameter}=${id}${tail})`,
        `${id}.${member}(${tail.startsWith(', ') ? tail.slice(2) : tail})`,
      ];
      for (const id of [`${prefix}i`, `${prefix}f`]) {
        for (const call of calls(id)) expect(check(call).diagnostics, reference).toEqual([]);
      }
      for (const id of [`${prefix}b`, `${prefix}string`, `${prefix}p`]) {
        for (const call of calls(id)) {
          expect(check(call).diagnostics, `${reference}; ${call}`).toEqual([
            expect.objectContaining({ code: 'type-mismatch' }),
          ]);
        }
      }
    });
  }
});
