import { expect, it, vi } from 'vitest';

import { parse } from '../../parser';
import { ExecutionContext } from '../context';
import { InMemoryRequestDatafeed } from '../requestDatafeed';
import { executeCompiled, tryCompile } from './execute';

function requested(expression: string) {
  const bars = [1, 2, 3, 4].map((close, i) => ({
    time: i * 3_600_000,
    open: close,
    high: close,
    low: close,
    close,
    volume: 1,
  }));
  const compiled = tryCompile(
    parse(`//@version=6
indicator("requested builtin history")
plot(request.security("OTHER", "60", ${expression}))`),
  );
  expect(compiled.success).toBe(true);
  return executeCompiled(compiled, bars, undefined, {
    runtime: { timeframe: { period: '60' }, syminfo: { timezone: 'UTC' } },
    requestDatafeed: new InMemoryRequestDatafeed([{ symbol: 'OTHER', timeframe: '60', bars }]),
  })!;
}

it('avoids unused builtin histories for independent scalar missing checks', () => {
  const advance = vi.spyOn(ExecutionContext.prototype, 'advanceBar');
  try {
    const result = requested('na(close) ? 0 : close + bar_index');
    expect(result.errors).toEqual([]);
    expect(result.plots[0]!.values).toEqual([1, 3, 5, 7]);
    expect(advance).toHaveBeenCalledTimes(4);
  } finally {
    advance.mockRestore();
  }
});

it('synchronizes requested builtin histories before delayed calendar reads', () => {
  const advance = vi.spyOn(ExecutionContext.prototype, 'advanceBar');
  try {
    const result = requested('bar_index < 2 ? -1 : hour()');
    expect(result.errors).toEqual([]);
    expect(result.plots[0]!.values).toEqual([-1, -1, 2, 3]);
    expect(advance).toHaveBeenCalledTimes(8);
  } finally {
    advance.mockRestore();
  }
});
