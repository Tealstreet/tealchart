import type { NativeChartFrame } from './nativeChartFrame';

export interface NativePrimitiveClip {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function createNativeOhlcvPrimitiveClip(frame: NativeChartFrame): NativePrimitiveClip {
  return {
    x: frame.contentLeft,
    y: frame.mainPane.top,
    width: Math.max(0, frame.priceAxisRight - frame.contentLeft),
    height: Math.max(0, frame.timeAxisBottom - frame.mainPane.top),
  };
}
