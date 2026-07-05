import type { Bar } from '../types';

// Feeds that misbehave often do so every tick; throttle the warning so it stays
// informative without flooding the console.
const WARN_THROTTLE_MS = 10_000;
let lastWarnAt = 0;

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
export function dedupeBarsByTime(bars: Bar[], context = 'bars'): Bar[] {
  if (bars.length < 2) return bars;

  // Fast path: already strictly increasing → nothing to fix, keep the reference.
  let clean = true;
  for (let i = 1; i < bars.length; i++) {
    if (bars[i]!.time <= bars[i - 1]!.time) {
      clean = false;
      break;
    }
  }
  if (clean) return bars;

  const sorted = [...bars].sort((a, b) => a.time - b.time);
  const result: Bar[] = [];
  let dropped = 0;
  for (const bar of sorted) {
    const last = result[result.length - 1];
    if (last && last.time === bar.time) {
      result[result.length - 1] = bar; // duplicate timestamp — keep the last one
      dropped++;
    } else {
      result.push(bar);
    }
  }

  const now = Date.now();
  if (now - lastWarnAt > WARN_THROTTLE_MS) {
    lastWarnAt = now;
    console.warn(
      `[tealchart] normalized ${context}: dropped ${dropped} duplicate-timestamp bar(s)` +
        ` and/or re-sorted out-of-order bars (${bars.length} -> ${result.length}).`,
    );
  }
  return result;
}
