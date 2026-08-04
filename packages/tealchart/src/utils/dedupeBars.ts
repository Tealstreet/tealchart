import type { Bar } from '../types';

/**
 * True when two bars carry identical time + OHLCV. Used to drop no-op realtime
 * ticks (feeds re-send unchanged bars as heartbeats) so an identical bar doesn't
 * recompute indicators and repaint for zero visible change.
 */
export function barValuesEqual(a: Bar, b: Bar): boolean {
  return (
    a.time === b.time &&
    a.open === b.open &&
    a.high === b.high &&
    a.low === b.low &&
    a.close === b.close &&
    a.volume === b.volume
  );
}

/**
 * Normalize a bar array so it is strictly increasing in time with no duplicate
 * timestamps. Feeds (REST history + websocket merges, gap-recovery refetches,
 * paginated history) occasionally emit duplicate or out-of-order bars; drawing
 * them verbatim paints multiple candle bodies at one x (overlapping/"double"
 * candles). Like TradingView, tealchart defends against this on ingest instead
 * of trusting the datafeed.
 *
 * Duplicates keep the LAST occurrence (most recent data for that timestamp).
 * Returns the original array unchanged when it is already clean, so callers keep
 * reference-equality fast paths.
 */
export function dedupeBarsByTime(bars: Bar[], _context = 'bars'): Bar[] {
  if (bars.length < 2) return bars;

  // Fast path: already strictly increasing → nothing to fix, keep the reference.
  let outOfOrder = false;
  let hasDuplicate = false;
  for (let i = 1; i < bars.length; i++) {
    const delta = bars[i]!.time - bars[i - 1]!.time;
    if (delta < 0) outOfOrder = true;
    else if (delta === 0) hasDuplicate = true;
  }
  if (!outOfOrder && !hasDuplicate) return bars;

  const sorted = [...bars].sort((a, b) => a.time - b.time);
  const result: Bar[] = [];
  for (const bar of sorted) {
    const last = result[result.length - 1];
    if (last && last.time === bar.time) {
      result[result.length - 1] = bar; // duplicate timestamp — keep the last one
    } else {
      result.push(bar);
    }
  }

  return result;
}
