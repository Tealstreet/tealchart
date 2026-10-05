import type { Bar } from '../../src/runtime/context';

import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser/parser';
import { RMA, RSI } from '../../src/runtime/codegen/ta-classes';
import { executeScript } from '../../src/runtime/compiledOnly';

// Expected values are independently calculated on these small inputs using
// SMA-seeded Wilder smoothing. The missing-output mask and adjacent-bar RSI
// changes follow the TradingView rma-chain-v1 finding, without importing capture data.
function run(source: string, samples: number[]) {
  const holes = samples.flatMap((value, index) => (Number.isNaN(value) ? [index] : []));
  const bars: Bar[] = samples.map((value, index) => {
    const close = Number.isNaN(value) ? 100 : value;
    return { time: (index + 1) * 120_000, open: close, high: close + 1, low: close - 1, close, volume: 100 };
  });
  const result = executeScript(
    parse(`//@version=6
indicator("RMA and RSI missing inputs")
src = ${holes.length ? holes.map((index) => `bar_index == ${index}`).join(' or ') : 'false'} ? na : close
${source}`),
    bars,
  );
  expect(result.errors).toEqual([]);
  return result.plots;
}

function expectValues(actual: (number | null)[], expected: (number | null)[]) {
  expect(actual).toHaveLength(expected.length);
  expected.forEach((value, index) => {
    if (value === null) expect(actual[index], `bar ${index}`).toBeNull();
    else expect(actual[index], `bar ${index}`).toBeCloseTo(value, 10);
  });
}

describe('RMA and RSI missing-input behavior', () => {
  it('masks RMA holes while retaining its valid-sample seed and accumulator', () => {
    const plots = run('plot(ta.rma(src, 3))', [NaN, 3, NaN, 6, 9, NaN, NaN, 12, 15]);
    expectValues(plots[0].values, [null, null, null, null, 6, null, null, 8, 31 / 3]);
  });

  it('masks length-one RMA holes and resumes on the next valid input', () => {
    const plots = run('plot(ta.rma(src, 1))', [NaN, 3, NaN, 9]);
    expectValues(plots[0].values, [null, 3, null, 9]);
  });

  it('uses adjacent-bar RSI changes and masks holes plus the first recovery bar', () => {
    const plots = run(
      `plot(ta.rsi(src, 2), "RSI")
change = src - src[1]
gain = ta.rma(math.max(change, 0), 2)
loss = ta.rma(math.max(-change, 0), 2)
plot(100 - 100 / (1 + gain / loss), "Adjacent RSI")`,
      [10, 12, 11, NaN, NaN, 20, 18, 22],
    );
    for (const plot of plots) {
      expectValues(plot.values, [null, null, 200 / 3, null, null, null, 200 / 7, 1800 / 23]);
    }
  });

  it('does not count RSI changes across leading or seed-period holes', () => {
    const plots = run('plot(ta.rsi(src, 2))', [NaN, 10, 12, NaN, 20, 18, 22]);
    expectValues(plots[0].values, [null, null, null, null, null, 50, 250 / 3]);
  });

  it('restores RMA seed and accumulator for missing and valid replacement ticks', () => {
    const rma = new RMA(2);
    expect(rma.compute(2)).toBeNaN();
    expect(rma.compute(NaN)).toBeNaN();
    expect(rma.recompute(6)).toBe(4);
    expect(rma.recompute(NaN)).toBeNaN();
    expect(rma.recompute(10)).toBe(6);
    const confirmed = rma.save();
    expect(rma.compute(NaN)).toBeNaN();
    expect(rma.recompute(14)).toBe(10);
    expect(rma.recompute(NaN)).toBeNaN();
    rma.restore(confirmed);
    expect(rma.compute(14)).toBe(10);
  });

  it('restores RSI source adjacency and smoothing for replacement ticks', () => {
    const rsi = new RSI(2);
    [10, 12, 11].forEach((value) => rsi.compute(value));
    const confirmed = rsi.save();
    expect(rsi.compute(NaN)).toBeNaN();
    expect(rsi.recompute(13)).toBeCloseTo(600 / 7, 10);
    expect(rsi.recompute(NaN)).toBeNaN();
    expect(rsi.compute(20)).toBeNaN();
    expect(rsi.compute(18)).toBeCloseTo(200 / 7, 10);
    rsi.restore(confirmed);
    expect(rsi.compute(13)).toBeCloseTo(600 / 7, 10);
  });
});
