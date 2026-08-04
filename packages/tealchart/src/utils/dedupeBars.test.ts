import type { Bar } from '../types';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { barValuesEqual, dedupeBarsByTime } from './dedupeBars';

const bar = (time: number, close = time): Bar => ({
  time,
  open: 1,
  high: 2,
  low: 0,
  close,
  volume: 1,
});

describe('dedupeBarsByTime', () => {
  afterEach(() => vi.restoreAllMocks());

  it('returns the same reference when already strictly increasing', () => {
    const bars = [bar(1), bar(2), bar(3)];
    expect(dedupeBarsByTime(bars)).toBe(bars);
  });

  it('returns short arrays unchanged', () => {
    const one = [bar(1)];
    expect(dedupeBarsByTime(one)).toBe(one);
    expect(dedupeBarsByTime([])).toEqual([]);
  });

  it('drops duplicate timestamps, keeping the last occurrence', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const bars = [bar(1, 10), bar(2, 20), bar(2, 99), bar(3, 30)];
    const out = dedupeBarsByTime(bars);
    expect(out.map((b) => b.time)).toEqual([1, 2, 3]);
    expect(out.find((b) => b.time === 2)?.close).toBe(99); // last wins
    expect(console.warn).not.toHaveBeenCalled();
  });

  it('re-sorts out-of-order bars and dedupes together', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const bars = [bar(3), bar(1), bar(2), bar(1, 42)];
    const out = dedupeBarsByTime(bars);
    expect(out.map((b) => b.time)).toEqual([1, 2, 3]);
    expect(out.find((b) => b.time === 1)?.close).toBe(42); // last-seen for that time
  });

  it('re-sorts out-of-order bars with no duplicates', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const out = dedupeBarsByTime([bar(3), bar(1), bar(2)]);
    expect(out.map((b) => b.time)).toEqual([1, 2, 3]);
    expect(warn).not.toHaveBeenCalled();
  });

  it('collapses the observed 3-per-timestamp feed pattern', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const bars = [bar(1), bar(1), bar(1), bar(2), bar(2), bar(2)];
    const out = dedupeBarsByTime(bars);
    expect(out.map((b) => b.time)).toEqual([1, 2]);
  });

  it('does not warn when the array is clean', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    dedupeBarsByTime([bar(1), bar(2), bar(3)]);
    expect(warn).not.toHaveBeenCalled();
  });
});

describe('barValuesEqual', () => {
  const full = (over: Partial<Bar> = {}): Bar => ({
    time: 1,
    open: 1,
    high: 2,
    low: 0,
    close: 1.5,
    volume: 10,
    ...over,
  });

  it('is true for identical time + OHLCV', () => {
    expect(barValuesEqual(full(), full())).toBe(true);
  });

  it('is false when any OHLCV field or time differs', () => {
    expect(barValuesEqual(full(), full({ close: 1.6 }))).toBe(false);
    expect(barValuesEqual(full(), full({ volume: 11 }))).toBe(false);
    expect(barValuesEqual(full(), full({ high: 2.1 }))).toBe(false);
    expect(barValuesEqual(full(), full({ time: 2 }))).toBe(false);
  });
});
