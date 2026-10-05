import { describe, expect, it, vi } from 'vitest';
import { captureDispatchMatcher, executeCompiled, tryCompile } from './execute';
import { parse } from '../../parser';
import { InMemoryRequestDatafeed } from '../requestDatafeed';

const capture = (value: unknown, source?: unknown, scope?: object) => ({ kind: 'capture', value, source, scope });

describe('captured request dispatch reuse', () => {
  it('checks stable source bindings without serializing changing series values', () => {
    const scope = {};
    const script = {};
    const captures = { src: capture(10, { kind: 'series', name: 'close' }, scope), len: capture(2, { kind: 'expression', script }, scope) };
    const matches = captureDispatchMatcher(captures);
    const serialize = vi.spyOn(JSON, 'stringify');
    try {
      for (let bar = 0; bar < 100; bar++) {
        expect(matches({ len: capture(2, { kind: 'expression', script }, scope), src: capture(bar, { kind: 'series', name: 'close' }, scope) })).toBe(true);
      }
      expect(serialize).toHaveBeenCalledTimes(0);
    } finally { serialize.mockRestore(); }
    expect(matches({ ...captures, src: capture(10, { kind: 'series', name: 'open' }, scope) })).toBe(false);
    expect(matches({ ...captures, src: capture(10, { kind: 'series', name: 'close' }, {}) })).toBe(false);
    expect(matches({ ...captures, len: capture(2, { kind: 'expression', script: {} }, scope) })).toBe(false);
  });

  it('invalidates primitive captures, names and descriptor shape changes', () => {
    const matches = captureDispatchMatcher({ length: capture(2), src: capture(1, { kind: 'series', name: 'close' }) });
    expect(matches({ length: capture(2), src: capture(99, { kind: 'series', name: 'close' }) })).toBe(true);
    expect(matches({ length: capture(3), src: capture(1, { kind: 'series', name: 'close' }) })).toBe(false);
    expect(matches({ length: capture(2) })).toBe(false);
    expect(matches({ other: capture(2), src: capture(1, { kind: 'series', name: 'close' }) })).toBe(false);
    expect(matches({ length: 2, src: capture(1, { kind: 'series', name: 'close' }) })).toBe(false);
    expect(matches({ length: capture(2), src: capture(1) })).toBe(false);
  });

  it('detects in-place mutable values and nested expression capture changes', () => {
    const values = [1, 2];
    const script = {};
    const scope = {};
    const nested = { length: capture(2, undefined, scope) };
    const captures = { values: capture(values), nested: capture(0, { kind: 'expression', script, captures: nested }) };
    const matches = captureDispatchMatcher(captures);
    expect(matches(captures)).toBe(true);
    values.push(3);
    expect(matches(captures)).toBe(false);
    values.pop();
    nested.length.value = 3;
    expect(matches(captures)).toBe(false);
    nested.length.value = 2;
    nested.length.scope = {};
    expect(matches(captures)).toBe(false);
  });
});

const bars = Array.from({ length: 80 }, (_, index) => ({ time: (index + 1) * 120000, open: index, high: index + 1, low: index, close: index, volume: 100 }));
it('builds captured dispatch keys once per stable symbol instead of per bar', () => {
  const compiled = tryCompile(parse(`//@version=6
indicator("Captured dispatch allocation")
wrapped(simple string symbol, series float source, simple int length) =>
    request.security(symbol, "2", ta.sma(source, length), lookahead=barmerge.lookahead_on)
plot(wrapped("A", close, 2))
plot(wrapped("B", open, 3))`));
  expect(compiled.success).toBe(true);
  const requestDatafeed = new InMemoryRequestDatafeed(['A', 'B'].map(symbol => ({ symbol, timeframe: '2', bars })));
  const serialize = vi.spyOn(JSON, 'stringify');
  let result: ReturnType<typeof executeCompiled>;
  let dispatchKeys = 0;
  try {
    result = executeCompiled(compiled, bars, undefined, { requestDatafeed, runtime: { timeframe: { period: '2' } } });
    dispatchKeys = serialize.mock.calls.filter(([value]) => Array.isArray(value) && value.length === 6 && typeof value[0] === 'string' && value[0].startsWith('expression:')).length;
  } finally { serialize.mockRestore(); }
  expect(result!.errors).toEqual([]);
  expect(result!.plots.map(plot => plot.values)).toEqual([
    bars.map((_, index) => index === 0 ? null : index - 0.5),
    bars.map((_, index) => index < 2 ? null : index - 1),
  ]);
  expect(dispatchKeys).toBe(2);
});
