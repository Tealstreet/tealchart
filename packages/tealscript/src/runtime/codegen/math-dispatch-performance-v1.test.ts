import { describe, expect, it } from 'vitest';

import { parse } from '../../parser';
import { executeCompiled, tryCompile } from './execute';

const bars = Array.from({ length: 4096 }, (_, index) => ({
  time: 1788134400000 + index * 120000,
  open: 10.25,
  high: 11,
  low: 10,
  close: 10.25,
  volume: 1,
}));

describe('compiled math call-site dispatch', () => {
  it('preserves every result in a repeated round loop', () => {
    const compiled = tryCompile(
      parse(`//@version=6
indicator("Math dispatch CPU fixture v1")
float total = 0
for i = 0 to 30
    total += math.round(close + i / 10.0)
plot(total)`),
    );
    expect(compiled.success).toBe(true);
    let expected = 0;
    for (let index = 0; index < 31; index++) expected += Math.round(10.25 + index / 10);
    const result = executeCompiled(compiled, bars.slice(0, 64));
    expect(result?.errors).toEqual([]);
    expect(result?.profile.bars).toBe(64);
    expect(result?.plots[0].values).toEqual(Array(64).fill(expected));
  }, 30_000);

  it('preserves changing precision, signed ties, missing values and argument order', () => {
    const compiled = tryCompile(
      parse(`//@version=6
indicator("Round binding controls v1")
value = bar_index % 2 == 0 ? -1.25 : 1.25
precision = bar_index % 3 - 1
plot(math.round(value, precision), "positional")
plot(math.round(precision=precision, number=value), "named")
plot(math.round(number=na), "missing")
plot(math.round(number=-0.25), "negative zero")`),
    );
    expect(compiled.success).toBe(true);
    const result = executeCompiled(compiled, bars.slice(0, 6));
    const expected = [0, 1, -1.3, 0, -1, 1.3];
    expect(result?.errors).toEqual([]);
    expect(result?.plots[0].values).toEqual(
      expected.map((value, index) => (index % 2 === 0 && value === 0 ? -0 : value)),
    );
    expect(result?.plots[1].values).toEqual(result?.plots[0].values);
    expect(result?.plots[2].values).toEqual(Array(6).fill(null));
    expect(result?.plots[3].values.every((value) => Object.is(value, -0))).toBe(true);
  });

  it('keeps legacy named aliases and distinct unary call sites live', () => {
    const compiled = tryCompile(
      parse(`//@version=4
study("Legacy math dispatch controls v1")
plot(round(number=close, precision=1), "round")
plot(abs(number=-close), "abs")
plot(toradians(degrees=180), "radians")`),
    );
    expect(compiled.success).toBe(true);
    const result = executeCompiled(compiled, bars.slice(0, 2));
    expect(result?.errors).toEqual([]);
    expect(result?.plots.map(({ values }) => values)).toEqual([
      [10.3, 10.3],
      [10.25, 10.25],
      [Math.PI, Math.PI],
    ]);
  });
});
