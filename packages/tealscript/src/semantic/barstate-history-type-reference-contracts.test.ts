import { describe, expect, it } from 'vitest';

import { parse } from '../parser';
import { checkProgram } from './checker';

// pine-v6-reference variables[129]: barstate.ishistory is a series bool.
describe('barstate.ishistory reference type', () => {
  it('infers series bool without an explicit annotation', () => {
    const result = checkProgram(parse(`//@version=6
indicator("History type")
history = barstate.ishistory`));
    expect(result.diagnostics).toEqual([]);
    expect(result.symbols.find((symbol) => symbol.name === 'history')?.type)
      .toEqual({ kind: 'bool', qualifier: 'series' });
  });

  it('refuses to weaken history to simple bool', () => {
    const result = checkProgram(parse(`//@version=6
indicator("History qualifier")
simple bool history = barstate.ishistory`));
    expect(result.diagnostics).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'qualifier-mismatch', severity: 'error' }),
    ]));
  });
});
