import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';

// ATR length is simple int; highest length admits series int in both overloads.
// Ledger283/298: integer kind and qualifier are independent restrictions.
// https://www.tradingview.com/pine-script-reference/v6/#fun_ta.highest
const declarations = [
  { qualifier: 'const', float: 'const float lengthValue = 2.0', int: 'const int lengthValue = 2' },
  { qualifier: 'input', float: 'input float lengthValue = input.float(2.0)', int: 'input int lengthValue = input.int(2)' },
  { qualifier: 'simple', float: 'simple float lengthValue = 2.0', int: 'simple int lengthValue = 2' },
  { qualifier: 'series', float: 'series float lengthValue = close', int: 'series int lengthValue = bar_index % 2 + 2' },
];
const highestCalls = [
  'ta.highest(length=lengthValue)',
  'ta.highest(close, lengthValue)', 'ta.highest(length=lengthValue, source=close)',
];
const floatCases = declarations.flatMap((declaration) => highestCalls.map((call) => ({ ...declaration, call, title: `highest ${declaration.qualifier}: ${call}` })));

function source(declaration: string, call: string) {
  return `//@version=6\nindicator("Integer TA length")\n${declaration}\nplot(${call})`;
}

describe('ledger gaps 8: highest integer length contract', () => {
  it.each(floatCases)('accepts the documented integer and refuses float: $title', ({ float, int, call }) => {
    expect(checkProgram(parse(source(int, call))).diagnostics).toEqual([]);
    expect(checkProgram(parse(source(float, call))).diagnostics).toEqual([
      expect.objectContaining({ code: 'type-mismatch', message: expect.stringContaining('length must be an integer'), severity: 'error' }),
    ]);
  });

});
