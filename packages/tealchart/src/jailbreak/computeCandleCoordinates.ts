import type { Bar, Viewport } from '../types';
import type { CandleCoordinates } from './types';

/**
 * Pure function that computes pixel positions for each bar.
 *
 * @param bars - OHLCV bar data
 * @param viewport - Current viewport (start/end time, price range)
 * @param chartWidth - Chart width in logical pixels (excluding margins)
 * @param margins - Left/right/top margins in pixels
 * @param priceToY - Function converting a price to Y coordinate
 * @param timeToX - Function converting a timestamp to X coordinate
 * @param candleSpacing - Spacing ratio between candles (0–1, default 0.2)
 * @param minCandleWidth - Minimum candle width in pixels
 * @returns Array of CandleCoordinates, same length as bars
 */
export function computeCandleCoordinates(
  bars: Bar[],
  viewport: Viewport,
  chartWidth: number,
  margins: { left: number; right: number; top: number },
  priceToY: (price: number) => number,
  timeToX: (time: number) => number,
  candleSpacing = 0.2,
  minCandleWidth = 1,
): CandleCoordinates[] {
  if (bars.length === 0) return [];

  // Calculate slot width from visible time range
  const timeRange = viewport.endTime - viewport.startTime;
  const visibleBarCount = bars.length;
  const slotWidth = timeRange > 0 && visibleBarCount > 0 ? chartWidth / visibleBarCount : 10;
  const candleWidth = Math.max(minCandleWidth, slotWidth * (1 - candleSpacing));
  const halfCandle = candleWidth / 2;
  const wickWidth = Math.max(1, Math.min(candleWidth * 0.15, 2));

  const result: CandleCoordinates[] = new Array(bars.length);

  for (let i = 0; i < bars.length; i++) {
    const bar = bars[i];
    const x = timeToX(bar.time);
    const isUp = bar.close >= bar.open;
    const bodyTop = priceToY(isUp ? bar.close : bar.open);
    const bodyBottom = priceToY(isUp ? bar.open : bar.close);

    result[i] = {
      center: x,
      left: x - halfCandle,
      right: x + halfCandle,
      candleWidth,
      top: bodyTop,
      bottom: bodyBottom,
      high: priceToY(bar.high),
      low: priceToY(bar.low),
      wickWidth,
    };
  }

  return result;
}
