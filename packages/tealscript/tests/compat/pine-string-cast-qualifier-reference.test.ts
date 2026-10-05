import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';

describe('string cast reference overload qualifiers', () => {
  // Ledger type-qualifier-system-v3#169-176 (global ranks245-252).
  // https://www.tradingview.com/pine-script-reference/v6/#fun_string
  it.each([
    { qualifier: 'const', expression: '"literal"' },
    { qualifier: 'input', expression: 'input.string("default")' },
    { qualifier: 'simple', expression: 'syminfo.ticker' },
    { qualifier: 'series', expression: 'bar_index == 0 ? "first" : "later"' },
  ])('accepts $qualifier string x and returns the same qualifier', ({ qualifier, expression }) => {
    const result = checkProgram(
      parse(`//@version=6
indicator("String cast qualifiers")
source = ${expression}
cast = string(source)
`),
    );

    expect(result.diagnostics).toEqual([]);
    const types = new Map(result.symbols.map((symbol) => [symbol.name, symbol.type]));
    expect(types.get('source')).toEqual({ kind: 'string', qualifier });
    expect(types.get('cast')).toEqual({ kind: 'string', qualifier });
  });
});
