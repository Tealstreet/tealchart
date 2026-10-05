import { describe, expect, it } from 'vitest';

import { parse } from '../parser';
import { checkProgram } from './checker';

// Execution model / time-series-in-scopes: history of intermittently evaluated local variables warns of inconsistency.
describe('sparse local history consistency warning', () => {
  it.each([
    'if bar_index % 2 == 0',
    'for i = 0 to (bar_index % 2 == 0 ? 1 : int(na))',
  ])('warns about history inside %s', (header) => {
    const result = checkProgram(parse(`//@version=6
indicator("Sparse local history")
${header}
    basis = close + 7
    previous = basis[1]`));
    expect(result.diagnostics).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'inconsistent-local-history', severity: 'warning' }),
    ]));
    expect(result.diagnostics.filter((diagnostic) => diagnostic.severity === 'error')).toEqual([]);
  });

  it('does not warn for a global series sampled every bar inside a conditional', () => {
    const result = checkProgram(parse(`//@version=6
indicator("Global history")
basis = close + 7
if bar_index % 2 == 0
    previous = basis[1]`));
    expect(result.diagnostics).toEqual([]);
  });

  it('does not warn for local history in an unconditionally called function', () => {
    const result = checkProgram(parse(`//@version=6
indicator("Consistent function history")
previousValue() =>
    basis = close + 7
    basis[1]
plot(previousValue())`));
    expect(result.diagnostics).toEqual([]);
  });
});
