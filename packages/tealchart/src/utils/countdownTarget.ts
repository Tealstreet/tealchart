/**
 * The time a price-line countdown runs to. Once the current bar's close has passed,
 * it runs to the following close (`then`) instead of sitting at 00:00 until the
 * venue's first candle of the new bar arrives, which took ~1.6 s on mobile (AGT-90).
 */
export function countdownTargetMs(to: number, then: number | undefined, nowMs: number): number {
  'worklet';
  return then !== undefined && nowMs >= to ? then : to;
}
