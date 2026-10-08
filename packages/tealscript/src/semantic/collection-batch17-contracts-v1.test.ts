import { describe, expect, it } from 'vitest';

import { parse } from '../parser';
import { checkProgram } from './checker';

const header = `//@version=6
indicator("Collection batch17 contracts")
left = array.from(1, 2, 3)
right = array.from(2.0, 5.0, 8.0)`;

describe('collection batch17 required arguments and covariance return', () => {
  for (const call of [
    'array.covariance(left, right)',
    'array.covariance(id2=right, id1=left)',
    'left.covariance(id2=right)',
  ]) {
    it(`${call} returns series float even with constant array elements`, () => {
      const result = checkProgram(
        parse(`${header}
result = ${call}`),
      );
      expect(result.diagnostics).toEqual([]);
      expect(result.symbols.find((symbol) => symbol.name === 'result')?.type).toEqual({
        kind: 'float',
        qualifier: 'series',
      });
      const inputResult = checkProgram(parse(`${header}\nresult = ${call}\nchosen = input.float(result)`));
      expect(inputResult.diagnostics.map((diagnostic) => diagnostic.code)).toContain('qualifier-mismatch');
    });
  }

  for (const call of [
    'array.covariance(left)',
    'array.covariance(id2=right)',
    'array.covariance(id1=left)',
    'left.covariance()',
    'array.percentile_linear_interpolation(left)',
    'array.percentile_linear_interpolation(percentage=25)',
    'array.percentile_linear_interpolation(id=left)',
    'left.percentile_linear_interpolation()',
  ]) {
    it(`${call} refuses an omitted required argument`, () => {
      const diagnostics = checkProgram(
        parse(`${header}
result = ${call}`),
      ).diagnostics;
      expect(diagnostics.map((diagnostic) => diagnostic.code)).toContain('argument-count');
    });
  }
});
