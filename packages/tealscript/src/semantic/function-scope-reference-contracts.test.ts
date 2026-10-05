import { describe, expect, it } from 'vitest';

import { parse } from '../parser';
import { checkProgram } from './checker';

// User-defined functions / no-nested-definitions: function definitions belong to global scope.
describe('Pine function definition scope', () => {
  it('rejects a function defined inside another function', () => {
    const result = checkProgram(parse(`//@version=6
indicator("Nested definition")
outer() =>
    inner() =>
        close
    inner()
plot(outer())`));
    expect(result.diagnostics).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'function-scope', severity: 'error' }),
    ]));
  });

  it('allows global functions to call other global functions', () => {
    const result = checkProgram(parse(`//@version=6
indicator("Global functions")
inner() => close + 7
outer() => inner() * 2
plot(outer())`));
    expect(result.diagnostics.filter((diagnostic) => diagnostic.severity === 'error')).toEqual([]);
    expect(result.symbols.filter((symbol) => symbol.kind === 'function').map((symbol) => symbol.name))
      .toEqual(expect.arrayContaining(['inner', 'outer']));
  });
});
