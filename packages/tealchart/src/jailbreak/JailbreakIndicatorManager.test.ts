import type { IndicatorDrawArgs } from './types';

import { describe, expect, it, vi } from 'vitest';

import { BarsIndicator } from './BarsIndicator';
import { JailbreakIndicatorManager } from './JailbreakIndicatorManager';

class Recorder extends BarsIndicator {
  seen: IndicatorDrawArgs[] = [];
  draw(args: IndicatorDrawArgs): void {
    this.seen.push(args);
  }
}

const baseArgs = {
  ctx: {} as CanvasRenderingContext2D,
  bars: [],
  candleCoords: [],
  exchange: 'bybit',
  symbol: 'BTCUSDT',
  resolutionString: '60',
  chartWidth: 100,
  chartHeight: 100,
  priceToCoord: (price: number) => price,
  coordToPrice: (coord: number) => coord,
};

describe('JailbreakIndicatorManager repaint handler', () => {
  it('hands the host repaint handler to every draw as requestRepaint', () => {
    const manager = new JailbreakIndicatorManager();
    const behind = new Recorder();
    const after = new Recorder();
    manager.register('behind', behind, {}, true);
    manager.register('after', after, {}, false);
    const repaint = vi.fn();
    manager.setRepaintHandler(repaint);

    manager.drawBehindCandles(baseArgs);
    manager.drawAfterCandles(baseArgs);

    expect(behind.seen[0].requestRepaint).toBe(repaint);
    expect(after.seen[0].requestRepaint).toBe(repaint);
    after.seen[0].requestRepaint?.();
    expect(repaint).toHaveBeenCalledTimes(1);
  });

  it('leaves requestRepaint out without a handler, and after it is cleared', () => {
    const manager = new JailbreakIndicatorManager();
    const indicator = new Recorder();
    manager.register('after', indicator, {}, false);

    manager.drawAfterCandles(baseArgs);
    manager.setRepaintHandler(() => {});
    manager.setRepaintHandler(null);
    manager.drawAfterCandles(baseArgs);

    expect(indicator.seen.map((args) => args.requestRepaint)).toEqual([undefined, undefined]);
  });

  it("keeps a host's own requestRepaint", () => {
    const manager = new JailbreakIndicatorManager();
    const indicator = new Recorder();
    manager.register('after', indicator, {}, false);
    manager.setRepaintHandler(() => {});
    const own = vi.fn();

    manager.drawAfterCandles({ ...baseArgs, requestRepaint: own });

    expect(indicator.seen[0].requestRepaint).toBe(own);
  });
});
