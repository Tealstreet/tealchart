import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { executeCompiledScript } from '../../src/runtime/codegen/execute';
import { checkProgram } from '../../src/semantic/checker';

function plots(body: string, closes: number[], version = 6) {
  const ast = parse(`//@version=${version}\nindicator("event memory")\n${body}\n`);
  expect(checkProgram(ast).diagnostics.filter((diagnostic) => diagnostic.severity === 'error')).toEqual([]);
  const result = executeCompiledScript(
    ast,
    closes.map((close, index) => ({
      time: 1700000000000 + index * 60000,
      open: close,
      high: close,
      low: close,
      close,
      volume: 1,
    })),
  );
  expect(result.status).toBe('success');
  if (result.status !== 'success') throw new Error(result.reason);
  expect(result.result.errors).toEqual([]);
  return result.result.plots.map((plot) => plot.values);
}

describe('event memory contracts', () => {
  it('keeps every anchored VWAP band unavailable before the first true anchor', () => {
    const values = plots(
      '[value, upper, lower] = ta.vwap(close, bar_index == 2, 2.0)\nplot(value)\nplot(upper)\nplot(lower)',
      [10, 20, 30, 50],
    );
    expect(values).toEqual([
      [null, null, 30, 40],
      [null, null, 30, 60],
      [null, null, 30, 20],
    ]);
  });

  it('skips an interior missing hlc3 sample without changing the VWAP accumulator', () => {
    const values = plots('plot(ta.vwap)', [10, NaN, 20, 30]);
    expect(values).toEqual([[10, null, 15, 20]]);
  });
  it('keeps scalar VWAP defined when a missing band multiplier makes both bands unavailable', () => {
    const values = plots(
      'float multiplier = na\n[value, upper, lower] = ta.vwap(close, bar_index == 0, multiplier)\nplot(value)\nplot(upper)\nplot(lower)',
      [10, 20],
    );
    expect(values).toEqual([
      [10, 15],
      [null, null],
      [null, null],
    ]);
  });

  it.each(['array.remove(value, -2)', 'value.remove(-2)'])(
    'uses end-relative remove coordinates and shifts only later slots: %s',
    (call) => {
      const values = plots(
        `value = array.from(17, -8, 43, 5)\nremoved = ${call}\nplot(removed)\nplot(value.size())\nplot(value.get(0))\nplot(value.get(1))\nplot(value.get(2))`,
        [10],
      );
      expect(values).toEqual([[43], [3], [17], [-8], [5]]);
    },
  );

  it('uses zero-based coordinates for a positive remove index', () => {
    const values = plots(
      'value = array.from(17, -8, 43, 5)\nremoved = value.remove(1)\nplot(removed)\nplot(value.get(1))',
      [10],
    );
    expect(values).toEqual([[-8], [43]]);
  });
  it('keeps barssince unavailable before the first true and resets on consecutive true bars', () => {
    const [values] = plots('plot(ta.barssince(close > 0))', [-1, -1, 1, -1, -1, 1, 1, -1]);
    expect(values).toEqual([null, null, 0, 1, 2, 0, 0, 1]);
  });

  it('keeps barssince unavailable when the condition never becomes true', () => {
    const [values] = plots('plot(ta.barssince(condition=close > 0))', [-1, -2, -3, -4]);
    expect(values).toEqual([null, null, null, null]);
  });

  it('uses TV-settled SMA seeding for a fixed v5 input EMA length', () => {
    const [values] = plots('length = input.int(3)\nplot(ta.ema(close, length))', [10, 20, 5, 30, 7], 5);
    // CF040 / native v2 EMA: a valid input-int length stays fixed, and the
    // first three source samples seed the mean before alpha=.5 updates.
    // The former changing-length witness created a fresh EMA per length;
    // its first-source seed never established that a length was frozen.
    expect(values.slice(0, 2)).toEqual([null, null]);
    let expected = (10 + 20 + 5) / 3;
    expect(values[2]).toBeCloseTo(expected, 12);
    expected += 0.5 * (30 - expected);
    expect(values[3]).toBeCloseTo(expected, 12);
    expected += 0.5 * (7 - expected);
    expect(values[4]).toBeCloseTo(expected, 12);
  });

  it('uses SMA-seeded EMA components and masks missing MACD samples', () => {
    const [values] = plots('[value, signal, histogram] = ta.macd(close, 2, 3, 3)\nplot(value)', [
      NaN,
      10,
      12,
      NaN,
      11,
      14,
    ]);
    // TV-settled CF040 / native v2 EMA: skip missing seed inputs and mask
    // their output. At 11: fast=11, slow=(10+12+11)/3=11. At 14:
    // fast=11+(2/3)*(14-11)=13, slow=11+(1/2)*(14-11)=12.5.
    expect(values).toEqual([null, null, null, null, 0, 0.5]);
  });
});
