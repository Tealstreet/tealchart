import { describe, expect, it } from 'vitest';

import { parse } from '../parser';
import { checkProgram } from './checker';

// https://www.tradingview.com/pine-script-docs/language/type-system/#reference-types
// str.split returns an array reference, which always inherits series.
describe('string split reference qualifier', () => {
  it.each(['const', 'input', 'simple', 'series'])('returns series with %s source and separator', (qualifier) => {
    const declaration = qualifier === 'input'
      ? 'source = input.string("A:B")\nseparator = input.string(":")'
      : `${qualifier} string source = "A:B"\n${qualifier} string separator = ":"`;
    const result = checkProgram(parse(`//@version=6
indicator("Split reference")
${declaration}
parts = str.split(source, separator)
namedParts = str.split(string=source, separator=separator)
`));
    expect(result.diagnostics).toEqual([]);
    for (const name of ['parts', 'namedParts']) {
      expect(result.symbols.find((symbol) => symbol.name === name)?.type).toEqual({
        kind: 'array', qualifier: 'series', elementType: { kind: 'string' },
      });
    }
  });

  it('preserves scalar qualifier propagation independently of array results', () => {
    const result = checkProgram(parse(`//@version=6
indicator("Scalar control")
const string source = "abc"
simple string other = "a"
constantLength = str.length(source)
simpleContains = str.contains(source, other)
`));
    expect(result.diagnostics).toEqual([]);
    expect(result.symbols.find((symbol) => symbol.name === 'constantLength')?.type).toEqual({ kind: 'int', qualifier: 'const' });
    expect(result.symbols.find((symbol) => symbol.name === 'simpleContains')?.type).toEqual({ kind: 'bool', qualifier: 'simple' });
  });
});
