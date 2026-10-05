import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';

const check = (literal: string) => checkProgram(parse(`//@version=6\nindicator("Literal types")\nvalue = ${literal}`));

// https://www.tradingview.com/pine-script-docs/language/type-system/#float
// Rank 1864 follows spelling, including floats whose numeric value is integral.
describe('worklist 1864 decimal and exponent literal types', () => {
  it.each(['1.0', '0.0', '1e0', '1E0', '2e+0', '2E-0', '1e-2', '4.25E+3'])('%s infers float', (literal) => {
    const result = check(literal);
    expect(result.diagnostics).toEqual([]);
    expect(result.symbols.find((symbol) => symbol.name === 'value')?.type?.kind).toBe('float');
  });

  it.each(['0', '1', '27'])('%s remains an int without decimal or exponent syntax', (literal) => {
    const result = check(literal);
    expect(result.diagnostics).toEqual([]);
    expect(result.symbols.find((symbol) => symbol.name === 'value')?.type?.kind).toBe('int');
  });
});
