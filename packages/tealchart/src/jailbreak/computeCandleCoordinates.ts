import type { Bar, Viewport } from '../types';
import type { CandleCoordinates } from './types';

/**
 * Pure function that computes pixel positions for each bar.
 * Matches the candle sizing logic in TealchartRenderer.drawCandlesInPane().
 *
 * @param bars - OHLCV bar data
 * @param viewport - Current viewport (start/end time, price range)
 * @param chartWidth - Chart width in logical pixels (area available for candles)
 * @param priceToY - Function converting a price to Y coordinate
 * @param timeToX - Function converting a timestamp to X coordinate
 * @param minCandleWidth - Minimum candle width in pixels
 * @returns Array of CandleCoordinates, same length as bars
 */
export function computeCandleCoordinates(
  bars: Bar[],
  viewport: Viewport,
  chartWidth: number,
  priceToY: (price: number) => number,
  timeToX: (time: number) => number,
  minCandleWidth = 3,
): CandleCoordinates[] {
  if (bars.length === 0) return [];

  // Match TealchartRenderer: compute candle width from bar interval
  const viewportTimeRange = viewport.endTime - viewport.startTime;
  let barInterval = viewportTimeRange / bars.length; // Fallback
  if (bars.length >= 2) {
    barInterval = bars[1].time - bars[0].time;
  }

  const pixelsPerMs = chartWidth / viewportTimeRange;
  const slotWidth = barInterval * pixelsPerMs;
  const spacingRatio = 0.2; // 20% spacing, 80% candle — matches TealchartRenderer
  const candleWidth = Math.max(minCandleWidth, slotWidth * (1 - spacingRatio));
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
