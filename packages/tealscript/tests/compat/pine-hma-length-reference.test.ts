import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';

function diagnostics(call: string, version = 6) {
  return checkProgram(parse(`//@version=${version}\nindicator("HMA length contract")\nplot(${call})\n`)).diagnostics;
}

describe('HMA length declaration', () => {
  // Ledger ranks722–723: ta.hma length accepts simple/input/const int.
  // Archived v6 functions[175]; https://www.tradingview.com/pine-script-reference/v6/#fun_ta.hma
  it.each(['3', 'input.int(3)', 'timeframe.multiplier', 'int(3.0)'])('accepts integer length %s', (length) => {
    expect(diagnostics(`ta.hma(close, ${length})`)).toEqual([]);
  });

  it.each([5, 6])('refuses integral float length in v%i', (version) => {
    expect(diagnostics('ta.hma(close, 3.0)', version)).toMatchObject([{ code: 'type-mismatch' }]);
  });

  it.each([
    'ta.hma(length=3.5, source=close)',
    'ta.hma(close, input.float(3.0))',
    'ta.hma(close, float(timeframe.multiplier))',
    'ta.hma(close, true)',
    'ta.hma(close, "3")',
  ])('refuses non-integer length: %s', (call) => {
    expect(diagnostics(call)).toMatchObject([{ code: 'type-mismatch' }]);
  });

  it('retains the simple qualifier ceiling', () => {
    expect(diagnostics('ta.hma(close, bar_index + 1)')).toMatchObject([{ code: 'qualifier-mismatch' }]);
  });

  it('keeps series-integer SMA lengths eligible', () => {
    expect(diagnostics('ta.sma(close, bar_index + 1)')).toEqual([]);
  });

  it('keeps HMA source numeric', () => {
    expect(diagnostics('ta.hma(3.5, 3)')).toEqual([]);
    expect(diagnostics('ta.hma("3", 3)')).toMatchObject([{ code: 'type-mismatch' }]);
  });
});
