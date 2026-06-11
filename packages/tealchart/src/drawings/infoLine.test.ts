import { afterEach, describe, expect, it } from 'vitest';

import { clearChartStoreCache } from '../state/chartState';
import { resolveUserDrawingInfoLineMetrics } from './infoLine';

describe('user drawing info line metrics', () => {
  afterEach(() => {
    clearChartStoreCache();
  });

  it('combines signed price and elapsed time labels', () => {
    expect(
      resolveUserDrawingInfoLineMetrics({ time: 0, price: 100 }, { time: 60_000, price: 125 }),
    ).toEqual({
      priceDelta: 25,
      percent: 25,
      deltaMs: 60_000,
      label: '+25.00 (+25.00%) / 1 minute',
    });
  });
});
