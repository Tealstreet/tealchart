import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { executeScript } from '../../src/runtime/compiledOnly';
import { RSI } from '../../src/runtime/codegen/ta-classes';
import { compatibilityBars, getPlot } from './fixtures';

// Ledger gaps 442/443. Authority: reference functions[199] and
// https://www.tradingview.com/pine-script-docs/migration-guides/to-pine-version-5/#removed-an-rsi-overload
// Expected values below follow the published RMA ratio; no hole-bridging policy
// (TRACE-REQUIRED row444) is inferred from that formula.
describe('RSI ledger contracts', () => {
  it('returns na for zero upward and downward RMA after warmup (row443)', () => {
    const bars = compatibilityBars.map((bar) => ({ ...bar, close: 10 }));
    const result = executeScript(parse(`//@version=6
indicator("Flat RSI")
plot(ta.rsi(close, 3), "Flat")
plot(ta.rsi(bar_index, 3), "Rising")
plot(ta.rsi(-bar_index, 3), "Falling")`), bars);
    expect(result.errors).toEqual([]);
    expect(getPlot(result, 'Flat').values).toEqual(bars.map(() => null));
    expect(getPlot(result, 'Rising').values).toEqual([null, null, null, ...Array(9).fill(100)]);
    expect(getPlot(result, 'Falling').values).toEqual([null, null, null, ...Array(9).fill(0)]);
  });

  it('restores the flat RSI state before same-bar recomputation (row443)', () => {
    const rsi = new RSI(2);
    expect([rsi.compute(10), rsi.compute(10), rsi.compute(10)]).toEqual([NaN, NaN, NaN]);
    expect(rsi.recompute(11)).toBe(100);
    expect(rsi.recompute(10)).toBeNaN();
    expect(rsi.compute(9)).toBe(0);
  });

  it('does not count leading missing samples toward RSI warmup (row442)', () => {
    const rsi = new RSI(2);
    expect([NaN, NaN, 10, 11, 12].map((v) => rsi.compute(v))).toEqual([NaN, NaN, NaN, NaN, 100]);
  });
});
