import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';

// Ledger rows445/446; functions[199] allows const/input/simple int length.
describe('RSI length kind and qualifier', () => {
  it.each([5, 6])('rejects float length kinds in Pine v%s (row446)', (version) => {
    for (const call of ['ta.rsi(close, 3.0)', 'ta.rsi(length=3.0, source=close)', 'ta.rsi(close, float(3))', 'ta.rsi(close, input.float(3.0))']) {
      const result = checkProgram(parse(`//@version=${version}\nindicator("RSI kinds")\nx = ${call}`));
      expect(result.diagnostics.some((d) => d.code === 'type-mismatch' && /rsi.*length.*int/i.test(d.message)), call).toBe(true);
    }
  });

  it('retains the legacy v4 float overload eligibility', () => {
    expect(checkProgram(parse('//@version=4\nstudy("Legacy RSI")\nx = rsi(close, 3.0)')).diagnostics).toEqual([]);
  });

  it.each([5, 6])('accepts integer lengths and rejects series length in Pine v%s (row445)', (version) => {
    const accepted = checkProgram(parse(`//@version=${version}
indicator("RSI qualifiers")
simple int n = 3
x = ta.rsi(close, n)
y = ta.rsi(source=close, length=input.int(3))
z = ta.rsi(close, 3)`));
    expect(accepted.diagnostics).toEqual([]);
    const rejected = checkProgram(parse(`//@version=${version}\nindicator("RSI qualifier")\nx = ta.rsi(close, bar_index + 1)`));
    expect(rejected.diagnostics.some((d) => d.code === 'qualifier-mismatch' && d.message.includes("simple parameter 'length'") && d.message.includes('ta.rsi'))).toBe(true);
  });

});
