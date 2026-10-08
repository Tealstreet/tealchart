import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';

const errors = (source: string) => checkProgram(parse(source)).diagnostics.filter((d) => d.severity === 'error');

describe('numeric array integer overloads v1', () => {
  for (const version of [5, 6]) {
    for (const form of ['namespace', 'receiver']) {
      for (const method of ['stdev', 'variance', 'percentile_linear_interpolation']) {
        const call =
          form === 'namespace'
            ? `array.${method}(a${method.startsWith('percentile') ? ', 50' : ''})`
            : `a.${method}(${method.startsWith('percentile') ? '50' : ''})`;
        it(`v${version} ${form} ${method} documented int overload`, () => {
          expect(
            errors(`//@version=${version}\nindicator("int overload")\na = array.from(1, 3)\nint x = ${call}\nplot(x)`),
          ).toEqual([]);
        });
        it(`v${version} ${form} ${method} float-to-int refusal control`, () => {
          expect(
            errors(
              `//@version=${version}\nindicator("float control")\na = array.from(1.0, 3.0)\nint x = ${call}\nplot(x)`,
            ).some((d) => d.code === 'type-mismatch'),
          ).toBe(true);
        });
        it(`v${version} ${form} ${method} float acceptance control`, () => {
          expect(
            errors(
              `//@version=${version}\nindicator("float control")\na = array.from(1.0, 3.0)\nfloat x = ${call}\nplot(x)`,
            ),
          ).toEqual([]);
        });
      }
    }
  }
});
