import { describe, expect, it, vi } from 'vitest';
import { BarsIndicator } from '../jailbreak/BarsIndicator';
import type { IndicatorDrawArgs } from '../jailbreak/types';
import { TradingViewOverlayBridge } from './overlayBridge';
import type { TradingViewRawRenderFrame } from './types';

class RecordingIndicator extends BarsIndicator {
  behind: IndicatorDrawArgs[] = [];
  after: IndicatorDrawArgs[] = [];

  drawBehind(args: IndicatorDrawArgs): void {
    this.behind.push(args);
  }

  drawInFront(args: IndicatorDrawArgs): void {
    this.after.push(args);
  }
}

describe('TradingView overlay bridge', () => {
  function frame(): TradingViewRawRenderFrame {
    return {
      ctx: {} as CanvasRenderingContext2D,
      bars: [{ time: 1, open: 1, high: 2, low: 0, close: 1.5, volume: 10 }],
      candleCoords: [{ top: 10, bottom: 20, center: 15, left: 12, right: 18, candleWidth: 6, high: 8, low: 22, wickWidth: 1 }],
      chartWidth: 100,
      chartHeight: 80,
      priceToCoord: vi.fn(),
      coordToPrice: vi.fn(),
    };
  }

  it('routes TradingView callbacks through the jailbreak indicator manager', () => {
    const behind = new RecordingIndicator();
    const after = new RecordingIndicator();
    const bridge = new TradingViewOverlayBridge({
      indicators: [
        { id: 'behind', indicator: behind, settings: { alpha: 1 }, behindCandles: true },
        { id: 'after', indicator: after, settings: { alpha: 2 } },
      ],
    });
    const callbacks = bridge.callbacks();

    callbacks.beforeBars?.(frame());
    callbacks.afterBars?.(frame());

    expect(behind.behind).toHaveLength(1);
    expect(behind.behind[0]?.settings).toEqual({ alpha: 1 });
    expect(after.after).toHaveLength(1);
    expect(after.after[0]?.settings).toEqual({ alpha: 2 });
  });

  it('can request native candle suppression from bridge config or indicator settings', () => {
    const bridge = new TradingViewOverlayBridge({ hideNativeCandles: true });
    expect(bridge.callbacks().shouldSkipNativeBars?.(frame())).toBe(true);

    const settingsBridge = new TradingViewOverlayBridge({
      indicators: [{ id: 'hide', indicator: new RecordingIndicator(), settings: { hideCandles: true } }],
    });
    expect(settingsBridge.callbacks().shouldSkipNativeBars?.(frame())).toBe(true);
  });
});
