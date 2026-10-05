import { describe, expect, it } from 'vitest';

import { parse } from '../parser';
import { checkProgram } from './checker';

const reference = 'https://www.tradingview.com/pine-script-reference/v6/#fun_matrix.is_antisymmetric';
const check = (call: string) => checkProgram(parse(`//@version=6
indicator("Antisymmetric receiver signature")
m = matrix.new<float>(2, 2, 0.0)
${call}
`));

describe('documented matrix.is_antisymmetric receiver signature', () => {
  it('binds the receiver as its only ID and rejects extra positional arguments', () => {
    expect(check('m.is_antisymmetric()').diagnostics, reference).toEqual([]);
    expect(check('matrix.is_antisymmetric(id=m)').diagnostics, reference).toEqual([]);
    expect(check('m.is_antisymmetric(17)').diagnostics, reference).toEqual([
      expect.objectContaining({ code: 'argument-count' }),
    ]);
  });

  it('rejects an unknown named parameter on the zero-argument receiver form', () => {
    expect(check('m.is_antisymmetric()').diagnostics, reference).toEqual([]);
    expect(check('m.is_antisymmetric(extra=17)').diagnostics, reference).toEqual([
      expect.objectContaining({ code: 'unknown-argument' }),
    ]);
  });
});
