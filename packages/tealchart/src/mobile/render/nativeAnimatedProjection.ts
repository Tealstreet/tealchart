import type { NativeChartFrame } from './nativeChartFrame';
import type { NativeViewportSharedValues } from './nativeSharedViewport';

import { useDerivedValue } from 'react-native-reanimated';

import { sharedPriceToNativeY, sharedTimeToNativeX } from './nativeSharedViewport';

export function useSharedNativeTimeX(time: number, sharedViewport: NativeViewportSharedValues, frame: NativeChartFrame) {
  return useDerivedValue(() => sharedTimeToNativeX(time, sharedViewport, frame));
}

export function useSharedNativePriceY(price: number, sharedViewport: NativeViewportSharedValues, frame: NativeChartFrame) {
  return useDerivedValue(() => sharedPriceToNativeY(price, sharedViewport, frame));
}

export function clampNativeValue(value: number, min: number, max: number): number {
  'worklet';
  return Math.max(min, Math.min(max, value));
}
