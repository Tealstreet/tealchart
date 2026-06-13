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

  it('derives price coordinates from current candle coordinates instead of stale raw callbacks', () => {
    const normalized = normalizeTradingViewRenderFrame({
      ...frame(),
      realBars: [
        [1710000000, 90, 110, 90, 100, 100],
        [1710000060, 100, 120, 100, 110, 100],
      ],
      coordinateBars: [
        { center: 10, high: 20, low: 100 },
        { center: 20, high: -20, low: 60 },
      ],
      priceToCoord: vi.fn(() => 999),
      coordToPrice: vi.fn(() => 999),
    });

    expect(normalized?.priceToCoord(105)).toBeCloseTo(40);
    expect(normalized?.coordToPrice(40)).toBeCloseTo(105);
  });

  it('supports log-like current candle coordinate mappings', () => {
    const priceToCoord = (price: number) => 240 - 40 * Math.log(price);
    const normalized = normalizeTradingViewRenderFrame({
      ...frame(),
      realBars: [
        [1710000000, 2, 4, 2, 3, 100],
        [1710000060, 4, 8, 4, 6, 100],
      ],
      coordinateBars: [
        { center: 10, high: priceToCoord(4), low: priceToCoord(2) },
        { center: 20, high: priceToCoord(8), low: priceToCoord(4) },
      ],
      priceToCoord: vi.fn(() => 999),
      coordToPrice: vi.fn(() => 999),
    });

    expect(normalized?.priceToCoord(6)).toBeCloseTo(priceToCoord(6));
    expect(normalized?.coordToPrice(priceToCoord(6))).toBeCloseTo(6);
  });

  it('returns null for incomplete frames', () => {
    expect(normalizeTradingViewRenderFrame({})).toBeNull();
  });
});
