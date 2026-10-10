import { describe, expect, it } from 'vitest';

import { normalizeDatafeedBar } from './normalizeDatafeedBars';
import { intervalToMs, MONTH_MS } from './intervalMs';

const MINUTE = 60_000;
const DAY = 24 * 60 * MINUTE;

describe('intervalToMs', () => {
  it('reads uppercase M as months, not minutes', () => {
    expect(intervalToMs('1M')).toBe(MONTH_MS);
    expect(intervalToMs('M')).toBe(MONTH_MS);
    expect(intervalToMs('3M')).toBe(3 * MONTH_MS);
    expect(intervalToMs('12M')).toBe(12 * MONTH_MS);
    expect(MONTH_MS).toBe(30 * DAY);
  });

  it('keeps lowercase m as minutes and numeric resolutions as minutes', () => {
    expect(intervalToMs('1m')).toBe(MINUTE);
    expect(intervalToMs('5m')).toBe(5 * MINUTE);
    expect(intervalToMs('1')).toBe(MINUTE);
    expect(intervalToMs('240')).toBe(240 * MINUTE);
  });

  it('keeps days and weeks', () => {
    expect(intervalToMs('D')).toBe(DAY);
    expect(intervalToMs('1D')).toBe(DAY);
    expect(intervalToMs('W')).toBe(7 * DAY);
    expect(intervalToMs('2W')).toBe(14 * DAY);
  });

  it('gives a monthly chart a history window of months, not minutes', () => {
    // The widget's first fetch is `now - INITIAL_BAR_COUNT * intervalToMs(interval)`;
    // with "1M" read as a minute, 300 bars reached back five hours.
    expect(300 * intervalToMs('1M')).toBeGreaterThan(20 * 365 * DAY);
  });

  it('never re-buckets a monthly bar to a fixed grid', () => {
    const octFirst = Date.UTC(2026, 9, 1);
    expect(normalizeDatafeedBar({ time: octFirst, open: 1, high: 1, low: 1, close: 1 }, '1M').time).toBe(octFirst);
  });
});
