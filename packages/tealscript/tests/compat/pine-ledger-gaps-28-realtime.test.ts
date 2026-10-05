import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { ExecutionContext } from '../../src/runtime/context';
import { checkProgram } from '../../src/semantic/checker';

// Official v6 reference: barstate.isnew; ta.alma/ta.swma remarks and examples.
// Small constructed prices, never TradingView input rows.
const bars = Array.from({ length: 10 }, (_, i) => ({
  time: 1_700_000_000_000 + i * 60000,
  open: i + 1,
  high: i + 2,
  low: i,
  close: i + 1,
  volume: 10,
}));
describe('ledger1081-1083 realtime opening state', () => {
  it('is new on historical and successive realtime opening updates', () => {
    const ctx = new ExecutionContext();
    ctx.loadBars(bars.slice(0, 2));
    expect(ctx.advanceBar()).toBe(true);
    expect(ctx.barstate.isnew).toBe(true);
    ctx.startRealtimeBar(bars[2]!);
    expect(ctx.barstate.isnew).toBe(true);
    ctx.updateCurrentBar({ ...bars[2]!, close: 8 });
    ctx.startRealtimeBar(bars[3]!);
    expect(ctx.barstate.isnew).toBe(true);
  });
  it('is not new on successive realtime updates or the closing update', () => {
    const ctx = new ExecutionContext();
    ctx.loadBars(bars.slice(0, 2));
    ctx.advanceBar();
    ctx.startRealtimeBar(bars[2]!);
    ctx.updateCurrentBar({ ...bars[2]!, close: 8 });
    expect(ctx.barstate.isnew).toBe(false);
    ctx.updateCurrentBar({ ...bars[2]!, close: 9 });
    expect(ctx.barstate.isnew).toBe(false);
    ctx.confirmCurrentRealtimeBar();
    expect(ctx.barstate.isnew).toBe(false);
  });
  it('infers series bool and refuses simple/const downqualification', () => {
    const checked = checkProgram(parse('//@version=6\nindicator("isnew")\nx = barstate.isnew\nplot(x ? 1 : 0)'));
    expect(checked.diagnostics).toEqual([]);
    expect(checked.symbols.find((s) => s.name === 'x')?.type).toEqual({ kind: 'bool', qualifier: 'series' });
    for (const qualifier of ['simple', 'const']) {
      expect(
        checkProgram(parse(`//@version=6\nindicator("isnew")\n${qualifier} bool x = barstate.isnew`)).diagnostics.some(
          (d) => d.severity === 'error',
        ),
      ).toBe(true);
    }
  });
});
