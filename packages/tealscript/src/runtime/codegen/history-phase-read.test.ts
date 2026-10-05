import { expect, it, vi } from 'vitest';

import { HistoryBufferSizing } from './history';

it('uses the begun bar phase for repeated reads and preserves realtime bounds', () => {
  const sizing = new HistoryBufferSizing(2, 2);
  const realtime = vi.fn(() => false);
  const { NumericSeries, ValueSeries } = sizing.dependencies(2, realtime);
  const numeric = new NumericSeries(3, 2, 'close');
  const value = new ValueSeries(3, 2, 'value');
  numeric.push(7);
  numeric.push(9);
  value.push('before');
  value.push('now');
  sizing.beginBar(0, false);
  for (let i = 0; i < 100; i++) {
    expect(numeric.get(1)).toBe(7);
    expect(value.get(1)).toBe('before');
  }
  expect(realtime).not.toHaveBeenCalled();
  sizing.beginBar(1, true);
  expect(numeric.get(1)).toBe(7);
  expect(numeric.get(2)).toBeNaN();
  expect(() => numeric.get(3)).toThrow('Historical offset 3 exceeds max_bars_back 2');
  expect(() => value.get(3)).toThrow('Historical offset 3 exceeds max_bars_back 2');
});

it('still observes an injected realtime callback when no bar phase has begun', () => {
  const sizing = new HistoryBufferSizing();
  let realtime = false;
  const { NumericSeries } = sizing.dependencies(2, () => realtime);
  const numeric = new NumericSeries(3, 2, 'close');
  numeric.push(7);
  numeric.push(9);
  expect(numeric.get(0)).toBe(9);
  realtime = true;
  expect(() => numeric.get(1)).toThrow('Historical offset 1 exceeds max_bars_back 0');
});
