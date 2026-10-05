import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { executeCompiled, tryCompile } from '../../src/runtime/codegen/execute';

const bars = Array.from({ length: 5004 }, (_, index) => ({
  time: (index + 1) * 60000,
  open: index,
  high: index + 2,
  low: index - 2,
  close: index,
  volume: 100,
}));

function run(body: string, count = 600) {
  const compiled = tryCompile(
    parse(`//@version=6
indicator("Window demand ceiling")
${body}`),
  );
  expect(compiled.success, compiled.unsupported.join('; ')).toBe(true);
  const result = executeCompiled(compiled, bars.slice(0, count));
  if (!result) throw new Error('No compiled result');
  return result;
}

describe('window reservations stay within existing retention', () => {
  it("keeps J's one-bar v5 oversized highest window in warmup", () => {
    const compiled = tryCompile(
      parse(`//@version=5
indicator("Y3 demand5001 v1")
plot(ta.highest(high, bar_index + 5002))`),
    );
    expect(compiled.success).toBe(true);
    const result = executeCompiled(compiled, bars.slice(0, 1));
    if (!result) throw new Error('No compiled result');
    expect(result.errors).toEqual([]);
    expect(result.plots[0].values).toHaveLength(1);
    expect(result.plots[0].values[0]).toBeNull();
  });

  it.each(['414', '445', '455'])(
    'v7:%s growing extrema do not manufacture an offset5001 read',
    () => {
      const result = run(
        `length = bar_index + 1
plot(ta.highest(high, length))
plot(ta.lowest(low, length))`,
        bars.length,
      );
      expect(result.errors).toEqual([]);
      expect(result.profile.maxBarsBack).toBe(500);
      expect(result.plots[0].values).toHaveLength(bars.length);
    },
    60000,
  );

  it.each([
    ['1420', 5000],
    ['1654', 720],
  ])('v56:%s large extrema preserve demand metadata500', (_, length) => {
    const result = run(`length = input.int(${length})
plot(ta.highest(high, length))
plot(ta.lowest(low, length))`);
    expect(result.errors).toEqual([]);
    expect(result.profile.maxBarsBack).toBe(500);
  });

  it('caps a generic pivot warmup reservation without increasing demand metadata', () => {
    const result = run(`strength = input.int(360)
plot(ta.pivothigh(high, strength, strength))
plot(ta.pivotlow(low, strength, strength))`);
    expect(result.errors).toEqual([]);
    expect(result.profile.maxBarsBack).toBe(500);
  });

  it('keeps an actual user-series offset5001 read refused', () => {
    const result = run(`value = close * 2
depth = bar_index > 500 ? 5001 : 1
plot(value[depth])`);
    expect(result.errors[0]?.message).toMatch(/Historical offset 5001 exceeds max_bars_back 5000/);
  });
});
