import type { DatafeedBar } from '../types';

import { describe, expect, it } from 'vitest';

import { normalizeDatafeedBar, normalizeDatafeedBars } from './normalizeDatafeedBars';

const baseBar = (time: number): DatafeedBar => ({
  time,
  open: 100,
  high: 110,
  low: 90,
  close: 105,
});

describe('normalizeDatafeedBar', () => {
  it('fills missing volume with zero', () => {
    expect(normalizeDatafeedBar(baseBar(1_700_000_000_000), '5').volume).toBe(0);
  });

  it('converts realistic epoch seconds to milliseconds', () => {
    expect(normalizeDatafeedBar(baseBar(1_700_000_123), '1D').time).toBe(1_700_000_123_000);
  });

  it('snaps realistic intraday bars to the bar-open bucket', () => {
    expect(normalizeDatafeedBar(baseBar(1_700_000_123_456), '5').time).toBe(1_700_000_100_000);
  });

  it('does not bucket-snap daily or weekly bars', () => {
    expect(normalizeDatafeedBar(baseBar(1_700_000_123_456), '1D').time).toBe(1_700_000_123_456);
    expect(normalizeDatafeedBar(baseBar(1_700_000_123_456), '1W').time).toBe(1_700_000_123_456);
  });

  it('leaves synthetic test-scale times unchanged', () => {
    expect(normalizeDatafeedBar(baseBar(1_000_000), '5').time).toBe(1_000_000);
  });

  it('normalizes arrays with the same resolution contract', () => {
    expect(normalizeDatafeedBars([baseBar(1_700_000_123_456)], '1')[0]?.time).toBe(1_700_000_100_000);
  });
});
