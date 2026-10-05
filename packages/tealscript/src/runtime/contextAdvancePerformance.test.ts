import { describe, expect, it } from 'vitest';

import { ExecutionContext } from './context';
import { Series } from './series';

describe('historical context series transitions', () => {
  it.skipIf(process.env.TEALSCRIPT_PERF_ASSERT !== '1')('coalesces each historical advance and value write', () => {
    const ctx = new ExecutionContext();
    ctx.loadBars([{ time: 0, open: 1, high: 3, low: -1, close: 2, volume: 4 }]);
    const advance = Series.prototype.advance;
    const set = Series.prototype.set;
    let calls = 0;
    Series.prototype.advance = function () {
      calls++;
      return advance.call(this);
    };
    Series.prototype.set = function (value) {
      calls++;
      return set.call(this, value);
    };
    try {
      expect(ctx.advanceBar()).toBe(true);
    } finally {
      Series.prototype.advance = advance;
      Series.prototype.set = set;
    }
    expect(ctx.close.get(0)).toBe(2);
    expect(calls).toBe(0);
  });

  it('retains committed and pending snapshots through updates and another bar', () => {
    const ctx = new ExecutionContext();
    const reference = new Series<number>();
    ctx.loadBars([
      { time: 0, open: 1, high: 3, low: -1, close: 2, volume: 4 },
      { time: 1, open: 2, high: 5, low: 0, close: 4, volume: 7 },
    ]);
    for (const value of [2, 4]) {
      reference.advance();
      reference.set(value);
      expect(ctx.advanceBar()).toBe(true);
      expect(ctx.close.snapshot()).toEqual(reference.snapshot());
      reference.set(value + 1);
      ctx.close.set(value + 1);
      expect(ctx.close.snapshot()).toEqual(reference.snapshot());
    }
    expect(ctx.advanceBar()).toBe(false);
    expect(ctx.close.snapshot()).toEqual(reference.snapshot());
  });
});
