import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { PercentileLinearInterpolation } from '../../src/runtime/codegen/ta-classes';
import { executeScript } from '../../src/runtime/compiledOnly';
import fixture from './fixtures/pine-native-linear-residual-v1.json';

describe('native linear percentile hole ranks preserve finite cells and missing recovery', () => {
  const scenario = fixture.scenarios[1];
  const source = readFileSync(new URL('../../oracle-probes/v2/coverage-ta-1-v1.pine', import.meta.url), 'utf8');
  const result = executeScript(parse(source), scenario.bars);
  const cells = [
    ...[40, 41, 42, 43, 44, 45, 46, 47, 48, 54].map((index) => ({ percentage: 25, index })),
    ...[40, 41, 42, 43, 44, 45].map((index) => ({ percentage: 75, index })),
  ];

  it.each(cells)('preserves native finite pct$percentage bar$index', ({ percentage, index }) => {
    const title = `percentile_linear_interpolation_len14_pct${percentage}_hole40_41`;
    const native = scenario.columns.find((column) => column.title === title)!.values[index];
    const actual = result.plots.find((plot) => plot.title === title)!.values[index];
    expect(result.errors).toEqual([]);
    expect(native).not.toBeNull();
    expect(actual).not.toBeNull();
    expect(Math.abs(actual! - native!)).toBeLessThanOrEqual(1e-10);
  });

  it.each([25, 75])('restores pct%i rank state across missing insertion and eviction', (percentage) => {
    const title = `percentile_linear_interpolation_len14_pct${percentage}_hole40_41`;
    const native = scenario.columns.find((column) => column.title === title)!.values;
    const linear = new PercentileLinearInterpolation(14, percentage);
    const assertNative = (actual: number, index: number) => {
      if (native[index] === null) expect(actual, `bar ${index}`).toBeNaN();
      else expect(Math.abs(actual - native[index]!), `bar ${index}`).toBeLessThanOrEqual(1e-10);
    };
    scenario.bars.forEach((bar, index) => {
      const value = index === 40 || index === 41 ? NaN : bar.close;
      const snapshot = linear.save();
      assertNative(linear.compute(value), index);
      linear.recompute(bar.close + 1);
      assertNative(linear.recompute(value), index);
      linear.restore(snapshot);
      assertNative(linear.compute(value), index);
    });
  });
});
