import { describe, expect, it } from 'vitest';

import { parse } from '../parser';
import { checkProgram } from './checker';

// Ledger rank1169: the reference accepts series int length, not float length.
// https://www.tradingview.com/pine-script-reference/v6/#fun_ta.dev
function check(body: string, version: number) {
  return checkProgram(parse(`//@version=${version}\nindicator("Dev length kind")\n${body}`)).diagnostics;
}

describe.each([5, 6])('ledger gaps30: Dev length integer kind in Pine v%i', (version) => {
  it.each([
    'ta.dev(close, 3.0)',
    'ta.dev(length=input.float(3.0, "Length"), source=close)',
    'ta.dev(source=close, length=close)',
  ])('rejects float length: %s', (call) => {
    expect(check(`plot(${call})`, version)).toEqual([
      expect.objectContaining({
        code: 'type-mismatch',
        message: expect.stringContaining('ta.dev length must be an integer'),
      }),
    ]);
  });

  it.each([
    'ta.dev(close, 3)',
    'ta.dev(length=input.int(3, "Length"), source=close)',
    'ta.dev(source=close, length=int(bar_index % 3) + 1)',
    'ta.dev(source=3.0, length=3)',
  ])('accepts numeric sources and integer lengths including series: %s', (call) => {
    expect(check(`plot(${call})`, version)).toEqual([]);
  });
});
