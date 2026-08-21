import type { NativeChartFrame } from './nativeChartFrame';

export interface NativePrimitiveClip {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Candles and volume are deliberately allowed to overflow the main pane down to
 * the time axis, so a wick near the bottom is not sheared off. But a pane with
 * no height - which is what maximising another pane leaves behind - has nothing
 * to overflow FROM, and the wicks would stroke along the seam across the pane
 * that was maximised.
 */
export function createNativeOhlcvPrimitiveClip(frame: NativeChartFrame): NativePrimitiveClip {
  'worklet';
  if (frame.mainPane.height <= 0) return { x: 0, y: 0, width: 0, height: 0 };
  return {
    x: frame.contentLeft,
    y: frame.mainPane.top,
    width: Math.max(0, frame.priceAxisRight - frame.contentLeft),
    height: Math.max(0, frame.timeAxisBottom - frame.mainPane.top),
  };
}
