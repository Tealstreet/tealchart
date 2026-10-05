import { describe, expect, it } from 'vitest';
import { parse } from '../../parser';
import { checkProgram } from '../../semantic/checker';
import { executeScript } from '../compiledOnly';
import type { Bar } from '../context';

const bars: Bar[] = [
  [6, 9, 5, 7], [7, 12, 4, 8], [10, 15, 9, 11], [11, 16, 8, 12], [20, 25, 19, 24],
].map(([open, high, low, close], index) => ({ time: (index + 1) * 60_000, open, high, low, close, volume: 1 }));

function run(source: string, input = bars) {
  return executeScript(parse(`//@version=6\nindicator("pivot levels")\n${source}`), input);
}

function levels(type: string, input = bars) {
  const result = run(`levels = ta.pivot_point_levels("${type}", bar_index == 2)
${Array.from({ length: 11 }, (_, i) => `plot(array.get(levels, ${i}), "L${i}")`).join('\n')}
plot(array.size(levels), "Count")`, input);
  expect(result.errors).toEqual([]);
  expect(result.plots.every((plot) => plot.values.length === input.length)).toBe(true);
  expect(result.plots[11].values).toEqual(input.map(() => 11));
  return result.plots.slice(0, 11).map((plot) => plot.values[2]);
}

describe('pivot point levels reference contract', () => {
  // TradingView Pivot Points Standard formulas on H=12, L=4, C=8, O=6;
  // Woodie also uses the new anchored period's open=10. Small inputs only.
  // https://www.tradingview.com/support/solutions/43000521824-pivot-points-standard/
  it.each([
    { type: 'Traditional', expected: [8, 12, 4, 16, 0, 20, -4, 24, -8, 28, -12] },
    { type: 'Fibonacci', expected: [8, 11.056, 4.944, 12.944, 3.056, 16, 0, null, null, null, null] },
    { type: 'Woodie', expected: [9, 14, 6, 17, 1, 22, -2, 30, -10, null, null] },
    { type: 'Classic', expected: [8, 12, 4, 16, 0, 24, -8, 32, -16, null, null] },
    { type: 'DM', expected: [9, 14, 6, null, null, null, null, null, null, null, null] },
    { type: 'Camarilla', expected: [8, 8.733333333333333, 7.266666666666667, 9.466666666666667, 6.533333333333333, 10.2, 5.8, 12.4, 3.6, 24, -8] },
  ])('calculates $type in P/R/S order with na for absent levels', ({ type, expected }) => {
    const actual = levels(type);
    expected.forEach((value, index) => {
      if (value === null) expect(actual[index]).toBeNull();
      else expect(actual[index]).toBeCloseTo(value, 10);
    });
  });

  it.each([
    { open: 10, expected: [7, 10, 2] },
    { open: 8, expected: [8, 12, 4] },
  ])('uses the anchored period open=$open for the DM branch', ({ open, expected }) => {
    const input = bars.map((bar, index) => index === 0 ? { ...bar, open } : bar);
    expect(levels('DM', input).slice(0, 3)).toEqual(expected);
  });

  it('holds completed-period levels until the next anchor and excludes the new anchor bar', () => {
    const result = run(`levels = ta.pivot_point_levels(type="Traditional", anchor=bar_index % 2 == 0)
plot(array.get(levels, 0))
plot(array.get(levels, 1))
plot(array.get(levels, 2))`);
    expect(result.errors).toEqual([]);
    expect(result.plots.map((plot) => plot.values)).toEqual([
      [null, null, 8, 8, 12], [null, null, 12, 12, 16], [null, null, 4, 4, 8],
    ]);
  });

  it('accepts a series type and selects its formula at the anchor', () => {
    const result = run(`kind = bar_index < 4 ? "DM" : "Fibonacci"
levels = ta.pivot_point_levels(kind, bar_index % 2 == 0)
plot(array.get(levels, 0))
plot(array.get(levels, 3))`);
    expect(result.errors).toEqual([]);
    expect(result.plots[0].values).toEqual([null, null, 9, 9, 12]);
    expect(result.plots[1].values).toEqual([null, null, null, null, 16.944]);
  });

  it('develops from bar zero without an anchor and resets on an anchor', () => {
    const result = run(`held = ta.pivot_point_levels("Traditional", false)
live = ta.pivot_point_levels(developing=true, anchor=false, type="Traditional")
reset = ta.pivot_point_levels("Traditional", bar_index == 2, true)
plot(array.get(held, 0))
plot(array.get(live, 0))
plot(array.get(reset, 0))`);
    expect(result.errors).toEqual([]);
    const expected = [7, 8, 10, 32 / 3, 53 / 3];
    result.plots[1].values.forEach((value, index) => expect(value).toBeCloseTo(expected[index], 10));
    expect(result.plots[0].values).toEqual([null, null, null, null, null]);
    expect(result.plots[2].values).toEqual([7, 8, 35 / 3, 12, 19]);
  });

  it('keeps UDF invocation state separate for different anchor conditions', () => {
    const result = run(`pivot(bool anchor) =>
    values = ta.pivot_point_levels("Traditional", anchor)
    array.get(values, 0)
plot(pivot(bar_index == 2))
plot(pivot(bar_index == 4))`);
    expect(result.errors).toEqual([]);
    expect(result.plots.map((plot) => plot.values)).toEqual([
      [null, null, 8, 8, 8], [null, null, null, null, 32 / 3],
    ]);
  });

  it('preserves returned array history and isolates caller mutations', () => {
    const result = run(`levels = ta.pivot_point_levels("Traditional", bar_index == 2)
plot(array.get(levels, 0))
previous = levels[1]
plot(bar_index > 0 ? array.get(previous, 0) : na)
array.set(levels, 0, 999)`);
    expect(result.errors).toEqual([]);
    expect(result.plots[0].values).toEqual([null, null, 8, 8, 8]);
    expect(result.plots[1].values).toEqual([null, 999, 999, 999, 999]);
  });

  it('reports Woodie developing as a public runtime error and halts execution', () => {
    const result = run(`levels = ta.pivot_point_levels("Woodie", true, bar_index == 2)
plot(array.get(levels, 0))`);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].message).toMatch(/Woodie.*developing|developing.*Woodie/);
    expect(result.plots[0].values).toEqual([null, 7]);
    expect(result.profile?.swallowedErrors ?? []).toEqual([]);
  });

  it('requires a boolean anchor instead of accepting a timeframe string', () => {
    const ast = parse('//@version=6\nindicator("bad anchor")\nlevels = ta.pivot_point_levels("Traditional", "Daily")');
    expect(checkProgram(ast).diagnostics.some((diagnostic) => /anchor/.test(diagnostic.message))).toBe(true);
  });

  it.each([false, true])('rejects Woodie developing even before a completed interval (anchor=%s)', (anchor) => {
    const result = run(`levels = ta.pivot_point_levels("Woodie", ${anchor}, true)
plot(array.size(levels))`);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].message).toMatch(/Woodie/);
    expect(result.plots).toEqual([]);
    expect(result.profile?.swallowedErrors ?? []).toEqual([]);
  });

  it.each([false, true])('retains array-valued call result history (UDF=%s)', (udf) => {
    const expression = 'ta.pivot_point_levels("Traditional", bar_index == 2)[1]';
    const source = udf
      ? `previous() => ${expression}\nprior = previous()`
      : `prior = ${expression}`;
    const result = run(`${source}\nplot(bar_index > 0 ? array.get(prior, 0) : na)`);
    expect(result.errors).toEqual([]);
    expect(result.plots[0].values).toEqual([null, null, null, 8, 8]);
  });

  it('restores developing interval state when replacing a tick or loading a snapshot', async () => {
    const { PivotPointLevels } = await import('./ta-classes');
    const ta = new PivotPointLevels();
    expect(ta.compute('Traditional', false, true, 6, 9, 5, 7)[0]).toBe(7);
    const saved = ta.save();
    expect(ta.compute('Traditional', false, true, 7, 20, 1, 8)[0]).toBe(29 / 3);
    expect(ta.recompute('Traditional', false, true, 7, 12, 4, 8)[0]).toBe(8);
    expect(ta.compute('Traditional', true, false, 10, 15, 9, 11)[0]).toBe(8);
    ta.restore(saved);
    expect(ta.compute('Traditional', false, true, 7, 12, 4, 8)[0]).toBe(8);
  });

  it('recomputes Woodie at an anchor using the replacement open', async () => {
    const { PivotPointLevels } = await import('./ta-classes');
    const ta = new PivotPointLevels();
    ta.compute('Woodie', false, false, 6, 9, 5, 7);
    ta.compute('Woodie', false, false, 7, 12, 4, 8);
    expect(ta.compute('Woodie', true, false, 100, 110, 90, 105)[0]).toBe(54);
    expect(ta.recompute('Woodie', true, false, 10, 15, 9, 11)[0]).toBe(9);
    expect(ta.compute('Woodie', false, false, 20, 25, 19, 24)[0]).toBe(9);
  });
});
