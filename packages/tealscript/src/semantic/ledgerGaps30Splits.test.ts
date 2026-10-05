import { describe, expect, it } from 'vitest';

import { parse } from '../parser';
import { checkProgram } from './checker';

// Ledger rank1167: both ticker and field are required by the official reference.
// https://www.tradingview.com/pine-script-reference/v6/#fun_request.splits
function check(call: string, version: number) {
  return checkProgram(parse(`//@version=${version}\nindicator("Splits required field")\nplot(${call})`)).diagnostics;
}

describe.each([5, 6])('ledger gaps30: splits required arguments in Pine v%i', (version) => {
  it.each([
    'request.splits("NASDAQ:AAPL")',
    'request.splits(ticker="NASDAQ:AAPL")',
    'request.splits("NASDAQ:AAPL", gaps=barmerge.gaps_off)',
    'request.splits(ticker="NASDAQ:AAPL", lookahead=barmerge.lookahead_off, ignore_invalid_symbol=true)',
  ])('rejects an omitted field even when optional arguments are supplied: %s', (call) => {
    expect(check(call, version)).toContainEqual(
      expect.objectContaining({
        code: 'argument-count',
        message: "request.splits() missing required argument 'field'",
      }),
    );
  });

  it('still requires the ticker when field and optional arguments are present', () => {
    expect(check('request.splits(field=splits.denominator, gaps=barmerge.gaps_off)', version)).toContainEqual(
      expect.objectContaining({
        code: 'argument-count',
        message: "request.splits() missing required argument 'ticker'",
      }),
    );
  });

  it.each([
    'request.splits("NASDAQ:AAPL", splits.denominator)',
    'request.splits(field=splits.numerator, ticker="NASDAQ:AAPL")',
    'request.splits(ticker="NASDAQ:AAPL", splits.denominator, barmerge.gaps_on, barmerge.lookahead_off, true)',
    'request.splits("NASDAQ:AAPL", field=splits.numerator, gaps=barmerge.gaps_off, lookahead=barmerge.lookahead_on, ignore_invalid_symbol=true)',
    'request.dividends("NASDAQ:AAPL", dividends.gross)',
    'request.earnings("NASDAQ:AAPL", earnings.actual)',
  ])('accepts complete requests with optional merge settings: %s', (call) => {
    expect(check(call, version)).toEqual([]);
  });

  it('preserves the split-field validation', () => {
    expect(check('request.splits("NASDAQ:AAPL", "numerator")', version)).toContainEqual(
      expect.objectContaining({
        code: 'type-mismatch',
        message: 'Invalid request.splits field: numerator',
      }),
    );
  });
});
