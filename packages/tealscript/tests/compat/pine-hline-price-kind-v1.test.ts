import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic';

// Registered corpus1 invalid witnesses rows87/207; native captures are pending.
// The documented input int/float price excludes object and matrix handles.
describe('hline numeric price admission', () => {
  for (const price of ['chart.point.now(close)', 'matrix.new<int>(1, 1, 1)']) {
    it(`refuses ${price} with the numeric-price diagnostic`, () => {
      const source = `//@version=6\nindicator("Hline price")\nhline(${price})`;
      expect(checkProgram(parse(source)).diagnostics).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            code: 'type-mismatch',
            message: expect.stringContaining('hline price must be a number'),
          }),
        ]),
      );
    });
  }
});
