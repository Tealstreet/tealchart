import { afterEach, describe, expect, it } from 'vitest';

import { clearChartStoreCache } from '../state/chartState';
import { formatUserDrawingDateRangeDuration, resolveUserDrawingDateRangeMetrics } from './dateRange';

describe('user drawing date range metrics', () => {
  afterEach(() => {
    clearChartStoreCache();
  });

  it('formats elapsed durations by largest useful unit', () => {
    expect(formatUserDrawingDateRangeDuration(500)).toBe('500 ms');
    expect(formatUserDrawingDateRangeDuration(2_000)).toBe('2 seconds');
    expect(formatUserDrawingDateRangeDuration(90_000)).toBe('1.5 minutes');
    expect(formatUserDrawingDateRangeDuration(7_200_000)).toBe('2 hours');
    expect(formatUserDrawingDateRangeDuration(129_600_000)).toBe('1.5 days');
  });

  it('resolves anchor order independent duration labels', () => {
    expect(resolveUserDrawingDateRangeMetrics({ time: 0, price: 10 }, { time: 90_000, price: 20 })).toEqual({
      deltaMs: 90_000,
      label: '1.5 minutes',
    });
    expect(resolveUserDrawingDateRangeMetrics({ time: 90_000, price: 20 }, { time: 0, price: 10 })).toEqual({
      deltaMs: 90_000,
      label: '1.5 minutes',
    });
  });
});
