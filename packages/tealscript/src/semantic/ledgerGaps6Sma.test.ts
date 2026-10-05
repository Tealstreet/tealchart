import { describe, expect, it } from 'vitest';

import { parse } from '../parser';
import { checkProgram } from './checker';

// Literal contracts from the TradingView type-system tuple documentation and
// ta.sma reference; ledger-gaps-v1 ranks 206/207/214/219/235/236.
// https://www.tradingview.com/pine-script-docs/language/type-system/#tuples
// https://www.tradingview.com/pine-script-reference/v6/#fun_ta.sma
function check(body: string, version = 6) {
  return checkProgram(parse(`//@version=${version}\nindicator("Ledger gaps 6")\n${body}`));
}

describe('ledger gaps 6: SMA integer length (236)', () => {
  it.each(['3.0', 'input.float(3.0, "Length")', 'close'])('rejects float SMA length %s (236)', (length) => {
    expect(check(`plot(ta.sma(source=close, length=${length}))`).diagnostics).toEqual([
      expect.objectContaining({
        code: 'type-mismatch',
        message: expect.stringContaining('ta.sma length must be an integer'),
      }),
    ]);
  });

  it.each(['3', 'input.int(3, "Length")', 'int(bar_index % 3) + 1'])(
    'accepts integer SMA length %s including series (236)',
    (length) => {
      expect(check(`plot(ta.sma(source=close, length=${length}))`).diagnostics).toEqual([]);
    },
  );
});
