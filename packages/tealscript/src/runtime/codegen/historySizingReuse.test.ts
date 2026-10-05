import { describe, expect, it, vi } from 'vitest';

import { HistoryBufferSizing } from './history';

describe('series sizing records remain shared across guarded reads', () => {
  it('does not look up the sizing key again for repeated reads of an existing series', () => {
    const sizing = new HistoryBufferSizing();
    const { ValueSeries } = sizing.dependencies(499, () => false);
    const key = 'repeated-read-cost';
    const series = new ValueSeries(500, 499, key);
    for (let index = 0; index < 500; index++) series.push(index);
    const get = vi.spyOn(Map.prototype, 'get');
    let lookups: number;
    let sum = 0;
    try {
      for (let offset = 0; offset < 100; offset++) sum += Number(series.get(offset));
      lookups = get.mock.calls.filter(([lookupKey]) => lookupKey === key).length;
    } finally {
      get.mockRestore();
    }
    expect(sum).toBe(44950);
    expect(lookups).toBe(0);
    expect(sizing.maxBarsBack).toBe(99);
  });

  it('keeps later hints visible to previously constructed numeric and value series', () => {
    const sizing = new HistoryBufferSizing();
    let realtime = false;
    const deps = sizing.dependencies(499, () => realtime);
    const numeric = new deps.NumericSeries(500, 499, 'shared');
    const value = new deps.ValueSeries(500, 499, 'shared', 300);
    for (let index = 0; index < 500; index++) {
      numeric.push(index);
      value.push(`v${index}`);
    }
    expect(numeric.get(200)).toBe(299);
    realtime = true;
    expect(numeric.get(300)).toBe(199);
    expect(value.get(300)).toBe('v199');
    expect(() => numeric.get(301)).toThrow('Historical offset 301 exceeds max_bars_back 300');
    expect(() => value.get(301)).toThrow('Historical offset 301 exceeds max_bars_back 300');
    expect(sizing.maxBarsBack).toBe(300);
  });

  it('keeps historyCheck hints visible to an existing guarded series', () => {
    const sizing = new HistoryBufferSizing();
    let realtime = false;
    const deps = sizing.dependencies(499, () => realtime);
    const series = new deps.NumericSeries(500, 499, 'close');
    for (let index = 0; index < 500; index++) series.push(index);
    series.get(1);
    deps.historyCheck('close', 1, 150);
    realtime = true;
    expect(series.get(150)).toBe(349);
    expect(() => series.get(151)).toThrow('Historical offset 151 exceeds max_bars_back 150');
  });

  it('retains independent requirements and series snapshots', () => {
    const sizing = new HistoryBufferSizing();
    let realtime = false;
    const deps = sizing.dependencies(499, () => realtime);
    const first = new deps.ValueSeries(500, 499, 'first');
    const second = new deps.NumericSeries(500, 499, 'second');
    first.push({ value: 10 });
    const snapshot = first.save();
    first.update({ value: 20 });
    first.restore(snapshot);
    expect(first.get(0)).toEqual({ value: 10 });
    first.get(100);
    second.get(1);
    realtime = true;
    expect(first.get(100)).toBeNaN();
    expect(() => second.get(100)).toThrow('Historical offset 100 exceeds max_bars_back 1');
  });

  it.each([false, true])('keeps missing and negative offsets unavailable, realtime=%s', (realtime) => {
    const sizing = new HistoryBufferSizing();
    const deps = sizing.dependencies(499, () => realtime);
    const numeric = new deps.NumericSeries(500, 499, 'close');
    const value = new deps.ValueSeries(500, 499, 'user');
    for (const offset of [NaN, Infinity, -Infinity, -1]) {
      expect(numeric.get(offset)).toBeNaN();
      expect(value.get(offset)).toBeNaN();
    }
    expect(sizing.maxBarsBack).toBe(0);
  });
});
