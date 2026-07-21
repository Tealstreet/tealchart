/**
 * Calculate the partial TP/SL percentage from horizontal drag distance.
 *
 * These thresholds mirror TradingView's bracket magnet behavior: dragging the
 * TP/SL handle farther horizontally reduces the bracket size.
 */
export function calculatePartialBracketPercentFromDelta(deltaX: number): number {
  const absoluteDeltaX = Math.abs(deltaX);
  if (absoluteDeltaX <= 27) return 100;
  if (absoluteDeltaX <= 82) return 75;
  if (absoluteDeltaX <= 137) return 50;
  if (absoluteDeltaX <= 192) return 25;
  return 10;
}

export function calculatePartialBracketPercent(startX: number, currentX: number): number {
  return calculatePartialBracketPercentFromDelta(currentX - startX);
}
