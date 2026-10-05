import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';

// Ledger1426/1428, first-party v6 functions require a series float return.
// https://www.tradingview.com/pine-script-reference/v6/#fun_footprint.buy_volume
// https://www.tradingview.com/pine-script-reference/v6/#fun_footprint.sell_volume
describe('footprint buy/sell volume reference return types', () => {
  for (const member of ['buy_volume', 'sell_volume']) {
    it.each(['fp', 'id=fp'])(`${member}(%s) returns series float`, (argument) => {
      const result = checkProgram(
        parse(`//@version=6
indicator("Footprint type")
fp = request.footprint(10,70)
value = footprint.${member}(${argument})
`),
      );
      expect(result.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
      expect(result.symbols.find((symbol) => symbol.name === 'value')?.type).toEqual({
        kind: 'float',
        qualifier: 'series',
      });
    });
  }
});
