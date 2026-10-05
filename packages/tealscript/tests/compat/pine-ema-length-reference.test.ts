import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';

describe('ta.ema length requires simple int or weaker', () => {
  // Ledger type-qualifier-system-v3#354/355 (global ranks253/254).
  // Reference functions[176] length allowedTypeIDs: simple/input/const int.
  // https://www.tradingview.com/pine-script-reference/v6/#fun_ta.ema
  it.each(['3', 'input.int(3)', 'timeframe.multiplier', 'int(3.0)'])('accepts int length %s', (length) => {
    const result = checkProgram(
      parse(`//@version=6
indicator("EMA length")
plot(ta.ema(close, ${length}))
`),
    );
    expect(result.diagnostics).toEqual([]);
  });

  it('refuses series int length', () => {
    const result = checkProgram(
      parse(`//@version=6
indicator("EMA length")
plot(ta.ema(close, bar_index + 1))
`),
    );
    expect(result.diagnostics).toMatchObject([{ code: 'qualifier-mismatch' }]);
  });

  it('still accepts documented series-int lengths for ta.sma', () => {
    const result = checkProgram(
      parse(`//@version=6
indicator("SMA length control")
plot(ta.sma(close, bar_index + 1))
`),
    );
    expect(result.diagnostics).toEqual([]);
  });

  it('refuses integral float EMA length in v5', () => {
    const result = checkProgram(
      parse(`//@version=5
indicator("EMA length")
plot(ta.ema(close, 3.0))
`),
    );
    expect(result.diagnostics).toMatchObject([{ code: 'type-mismatch' }]);
  });

  it.each([
    { call: 'ta.ema(close, 3.0)', kind: 'float' },
    { call: 'ta.ema(length=3.5, source=close)', kind: 'float' },
    { call: 'ta.ema(close, input.float(3.0))', kind: 'float' },
    { call: 'ta.ema(close, true)', kind: 'bool' },
    { call: 'ta.ema(close, "3")', kind: 'string' },
  ])('refuses $kind length in $call', ({ call }) => {
    const result = checkProgram(
      parse(`//@version=6
indicator("EMA length")
plot(${call})
`),
    );
    expect(result.diagnostics).toMatchObject([{ code: 'type-mismatch' }]);
  });
});
