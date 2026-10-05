import type { Bar } from '../../src/runtime';

import { expect, it, vi } from 'vitest';

import { parse } from '../../src/parser';
import { InMemoryRequestDatafeed } from '../../src/runtime';
import { executeCompiled, tryCompile } from '../../src/runtime/codegen/execute';

// Reference: ~/cs/docs/tealscript-parity-archive/reference/pine-v6-reference-v1.json /entries/652,704.
// Work bounds apply only after invariant inputs and the complete EMA state are proven fixed.
function execute(expression: string, captured = false) {
  const bars: Bar[] = Array.from({ length: 100 }, (_, index) => ({
    time: 1_700_000_000_000 + index * 120_000,
    open: 3,
    high: 6,
    low: 3,
    close: index < 10 ? 3 : 6,
    volume: 1,
  }));
  const compiled = tryCompile(
    parse(`//@version=6
indicator("Fixed requested state")
amount = input.int(3)
${captured ? `f(src) => request.security("BTCUSDT", "2", ${expression})\nplot(f(close))` : `f(src) => request.security("BTCUSDT", "2", ${expression})\nplot(f(amount))`}
`),
  );
  const child = compiled.securityScripts?.get(0);
  if (!child) throw new Error('Missing request script');
  const spy = vi.spyOn(child.ScriptClass.prototype, 'onBar');
  try {
    const result = executeCompiled(compiled, bars, undefined, {
      requestDatafeed: new InMemoryRequestDatafeed([{ symbol: 'BTCUSDT', timeframe: '2', bars }]),
      runtime: { timeframe: { period: '2', multiplier: 2, isminutes: true, isintraday: true } },
    });
    expect(result?.errors).toEqual([]);
    expect(result?.profile.swallowedErrors ?? []).toEqual([]);
    return { values: result?.plots[0].values ?? [], calls: spy.mock.calls.length };
  } finally {
    spy.mockRestore();
  }
}

it('stops repeating an invariant requested EMA only after its state settles', () => {
  const result = execute('ta.ema(src, 3)');
  expect(result.values.slice(3)).toEqual(Array(97).fill(3));
  expect(result.calls).toBeLessThanOrEqual(5);
});

it('keeps evaluating a captured bar source after an initial constant stretch', () => {
  const result = execute('ta.ema(src, 3)', true);
  expect(result.values.slice(3, 10)).toEqual(Array(7).fill(3));
  expect(result.values[99]).toBe(6);
  expect(result.calls).toBe(100);
});

it.each(['ta.ema(close[1], 3)', 'ta.ema(bar_index < 10 ? 3 : 6, 3)'])(
  'retains the changing requested context for %s',
  (expression) => {
    const result = execute(expression);
    expect(result.values[99]).toBe(6);
    expect(result.calls).toBe(100);
  },
);
