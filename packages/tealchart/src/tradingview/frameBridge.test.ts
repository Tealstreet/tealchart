import { describe, expect, it, vi } from 'vitest';
import { normalizeTradingViewRenderFrame, toIndicatorDrawArgs } from './frameBridge';
import type { TradingViewRawRenderFrame } from './types';

describe('TradingView frame bridge', () => {
  function frame(): TradingViewRawRenderFrame {
    return {
      ctx: {} as CanvasRenderingContext2D,
      exchange: 'BINANCE',
      symbol: 'BTCUSDT',
      resolutionString: '1',
      realBars: [[1710000000, '1', '2', '0.5', '1.5', '100']],
      coordinateBars: [
        {
          top: 10,
          bottom: 20,
          center: 15,
          left: 12,
          right: 18,
          high: 8,
          low: 22,
          candleWidth: 6,
          wickWidth: 1,
        },
      ],
      coordinates: { mediaSize: { width: 800, height: 400 } },
      priceToCoord: vi.fn((price: number) => price * 2),
      coordToPrice: vi.fn((coord: number) => coord / 2),
      studySources: [{ id: 'study' }],
    };
  }

  it('normalizes TradingView bars and candle coordinates', () => {
    const normalized = normalizeTradingViewRenderFrame(frame());

    expect(normalized).toMatchObject({
      exchange: 'BINANCE',
      symbol: 'BTCUSDT',
      resolutionString: '1',
      chartWidth: 800,
      chartHeight: 400,
      bars: [{ time: 1710000000000, open: 1, high: 2, low: 0.5, close: 1.5, volume: 100 }],
      candleCoords: [{ top: 10, bottom: 20, center: 15, left: 12, right: 18 }],
    });
  });

  it('builds Tealchart indicator draw args', () => {
    const args = toIndicatorDrawArgs(frame());

    expect(args).toMatchObject({
      exchange: 'BINANCE',
      symbol: 'BTCUSDT',
      resolutionString: '1',
      chartWidth: 800,
      chartHeight: 400,
    });
    expect('settings' in (args ?? {})).toBe(false);
  });

  it('returns null for incomplete frames', () => {
    expect(normalizeTradingViewRenderFrame({})).toBeNull();
  });
});
