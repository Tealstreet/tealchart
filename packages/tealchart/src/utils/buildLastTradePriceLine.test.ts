import { describe, expect, it } from 'vitest';

import type { Bar } from '../types';

import { buildLastTradePriceLine } from './buildLastTradePriceLine';

describe('buildLastTradePriceLine', () => {
  const latestBar: Bar = {
    time: 1710000000000,
    open: 100,
    high: 110,
    low: 95,
    close: 105,
    volume: 1,
  };

  it('builds a last-trade line using market precision', () => {
    const line = buildLastTradePriceLine({
      latestBar,
      interval: '1',
      pricePrecision: 0.01,
      upColor: '#00ff00',
      downColor: '#ff0000',
      renderLineOnCanvas: false,
      showAxisTag: true,
    });

    expect(line).toMatchObject({
      id: 'last-trade',
      price: 105,
      color: '#00ff00',
      lineStyle: 'dotted',
      renderLineOnCanvas: false,
      showAxisTag: true,
      label: {
        primaryText: '105.00',
      },
    });
    expect(line?.countdownToTime).toBe(1710000060000);
  });

  it('formats the last-trade label by magnitude when market precision is absent', () => {
    const line = buildLastTradePriceLine({
      latestBar: { ...latestBar, close: 12345.67 },
      interval: '1',
    });

    expect(line?.label.primaryText).toBe('12,345.7');
  });

  it('returns null when there is no bar data', () => {
    expect(
      buildLastTradePriceLine({
        latestBar: null,
        interval: '1',
      }),
    ).toBeNull();
  });
});
