import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';

// Pine v6 reference na overloads 66–67; ledger ranks 46–47 and 50–53.
const numericSources = [
  ['typed unavailable float', 'float(na)', 'const'],
  ['const int', '1', 'const'],
  ['const float', '1.5', 'const'],
  ['input int', 'input.int(1)', 'input'],
  ['input float', 'input.float(1.5)', 'input'],
  ['simple int', 'syminfo.minmove', 'simple'],
  ['simple float', 'syminfo.mintick', 'simple'],
  ['series int', 'bar_index', 'series'],
  ['series float', 'close', 'series'],
] as const;

describe('documented na overload return qualifiers', () => {
  for (const [name, expression, qualifier] of numericSources) {
    it(`selects the bool overload for ${name}`, () => {
      const result = checkProgram(parse(`//@version=6\nindicator("NA overload")\nsource = ${expression}\nvalue = na(source)`));
      expect(result.diagnostics).toEqual([]);
      expect(result.symbols.find((symbol) => symbol.name === 'source')?.type?.qualifier).toBe(qualifier);
      expect(result.symbols.find((symbol) => symbol.name === 'value')?.type).toEqual({
        kind: 'bool', qualifier: qualifier === 'series' ? 'series' : 'simple',
      });
    });
  }

  for (const [name, expression] of [
    ['const string', '"defined"'],
    ['input string', 'input.string("defined")'],
    ['simple string', 'syminfo.ticker'],
    ['series string', 'str.tostring(close)'],
    ['const color', 'color.red'],
    ['input color', 'input.color(color.red)'],
    ['array', 'array.new<float>(1)'],
    ['matrix', 'matrix.new<float>(1, 1)'],
  ]) {
    it(`uses the series bool overload for ${name}`, () => {
      const result = checkProgram(parse(`//@version=6\nindicator("Reference NA")\nvalue = na(${expression})`));
      expect(result.diagnostics).toEqual([]);
      expect(result.symbols.find((symbol) => symbol.name === 'value')?.type).toEqual({ kind: 'bool', qualifier: 'series' });
    });
  }
  it('refuses na() results as input defaults requiring const bool', () => {
    const result = checkProgram(parse('//@version=6\nindicator("NA input default")\nvalue = input.bool(na(float(na)), "Enabled")'));
    expect(result.diagnostics).toEqual([
      expect.objectContaining({ code: 'qualifier-mismatch', message: expect.stringContaining("simple value to const parameter 'defval'") }),
    ]);
  });

});
