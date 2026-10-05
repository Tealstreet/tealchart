import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { executeScript } from '../../src/runtime/compiledOnly';
import { checkProgram } from '../../src/semantic/checker';
import { compatibilityBars, getPlot } from './fixtures';

// Version-rules-v1#123/#124, ledger ranks448/449.
describe('RSI legacy parameter names', () => {
  it('accepts v4 RSI x/y and v5 source/length named bindings (rows448/449)', () => {
    expect(checkProgram(parse('//@version=4\nstudy("RSI slots")\nx = rsi(y=3, x=close)')).diagnostics).toEqual([]);
    expect(checkProgram(parse('//@version=5\nindicator("RSI slots")\nx = ta.rsi(length=3, source=close)')).diagnostics).toEqual([]);
    for (const call of ['ta.rsi(x=close, length=3)', 'ta.rsi(source=close, y=3)']) {
      expect(checkProgram(parse(`//@version=5\nindicator("Old slots")\nx = ${call}`)).diagnostics.some((d) => d.code === 'unknown-argument')).toBe(true);
    }
  });

  it('runs reversed named and mixed legacy RSI slots with the intended source and length', () => {
    const source = `//@version=4
study("RSI legacy execution")
n = input(3)
plot(rsi(y=3, x=close), "Static")
plot(rsi(x=close, 3), "Mixed")
plot(rsi(x=close, y=n), "Input")`;
    const bars = compatibilityBars.slice(0, 6).map((bar, i) => ({ ...bar, close: i + 10 }));
    const result = executeScript(parse(source), bars);
    expect(result.errors).toEqual([]);
    for (const title of ['Static', 'Mixed', 'Input']) {
      expect(getPlot(result, title).values).toEqual([null, null, null, 100, 100, 100]);
    }
  });

  it('leaves user-defined rsi x/y bindings in place', () => {
    const source = `//@version=4
study("Shadow RSI")
rsi(x, y) => x + y
plot(rsi(y=4, x=close), "Local")`;
    expect(checkProgram(parse(source)).diagnostics).toEqual([]);
    const result = executeScript(parse(source), compatibilityBars.slice(0, 3));
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Local').values).toEqual([106, 109, 111]);
  });
});
