import { describe, expect, it } from 'vitest';

import { parse } from '../../parser/parser';
import { executeCompiled, tryCompile } from './execute';

const bars = [10, 20, 30].map((close, index) => ({
  time: 1_788_134_400_000 + index * 120_000,
  open: close,
  high: close + 1,
  low: close - 1,
  close,
  volume: 1,
}));

function run(version: number, offset: string) {
  const compiled = tryCompile(
    parse(`//@version=${version}
indicator("History offset boundaries")
source = close * 2
offset = ${offset}
plot(close[offset], "Close")
plot(source[offset], "Source")
plot(bar_index[offset], "Index")`),
  );
  expect(compiled.success).toBe(true);
  const result = executeCompiled(compiled, bars);
  expect(result).not.toBeNull();
  return result!;
}

describe.each([5, 6])('v%s history offset boundaries', (version) => {
  it('truncates fractions toward zero before rejecting negative offsets', () => {
    const result = run(version, '-0.9');
    expect(result.errors).toEqual([]);
    expect(result.plots.map((plot) => plot.values)).toEqual([
      [10, 20, 30],
      [20, 40, 60],
      [0, 1, 2],
    ]);
  });

  it('rejects fractions whose truncated offset remains negative', () => {
    const result = run(version, '-1.1');
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]?.message).toMatch(/Historical offset -1 .*non-negative/);
    expect(result.plots.flatMap((plot) => plot.values)).toEqual([]);
  });

  it('retains positive fractional history offsets', () => {
    const result = run(version, '1.9');
    expect(result.errors).toEqual([]);
    expect(result.plots.map((plot) => plot.values)).toEqual([
      [null, 10, 20],
      [null, 20, 40],
      [null, 0, 1],
    ]);
  });

  it('retains current values for a missing offset', () => {
    const result = run(version, 'float(na)');
    expect(result.errors).toEqual([]);
    expect(result.plots.map((plot) => plot.values)).toEqual([
      [10, 20, 30],
      [20, 40, 60],
      [0, 1, 2],
    ]);
  });
});
