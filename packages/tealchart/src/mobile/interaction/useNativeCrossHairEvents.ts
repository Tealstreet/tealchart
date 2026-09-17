import type { NativeChartFrame } from '../render/nativeChartFrame';
import type { NativeViewportSharedValues } from '../render/nativeSharedViewport';
import type { NativeCrosshairSharedValues } from './nativeCrosshair';

import { useEffect, useMemo, useRef } from 'react';

import { useAnimatedReaction } from 'react-native-reanimated';
import { runOnJS } from 'react-native-worklets';

import { snapPriceToTick } from '../../interaction/crosshairSnap';
import {
  isNativeCrosshairOverMainPane,
  nativeCrosshairYToPrice,
  resolveNativeCrosshairSnappedTime,
} from './nativeCrosshairContextMenu';
import { createNativeCrossHairThrottle } from './nativeCrossHairThrottle';

/** Matches the web widget's crosshair emit rate. */
const NATIVE_CROSS_HAIR_EMIT_MS = 50;

interface UseNativeCrossHairEventsInput {
  crosshair: NativeCrosshairSharedValues;
  frame: NativeChartFrame | null;
  intervalMs: number;
  onCrossHairMoved: (time: number, price: number) => void;
  pricePrecision: number;
  sharedViewport: NativeViewportSharedValues;
}

/**
 * Reports the crosshair as `crossHairMoved` {time, price}, the way the web
 * widget does. Only over the price pane, where a y really is a price. Reads the
 * viewport inside the reaction so a pan under a still crosshair re-prices it.
 */
export function useNativeCrossHairEvents({
  crosshair,
  frame,
  intervalMs,
  onCrossHairMoved,
  pricePrecision,
  sharedViewport,
}: UseNativeCrossHairEventsInput): void {
  const onCrossHairMovedRef = useRef(onCrossHairMoved);
  onCrossHairMovedRef.current = onCrossHairMoved;

  const throttle = useMemo(
    () =>
      createNativeCrossHairThrottle(
        (time, price) => onCrossHairMovedRef.current(time, price),
        NATIVE_CROSS_HAIR_EMIT_MS,
      ),
    [],
  );
  useEffect(() => () => throttle.cancel(), [throttle]);

  const pushCrossHair = useMemo(() => (time: number, price: number) => throttle.push(time, price), [throttle]);

  useAnimatedReaction(
    () => {
      if (!frame || !crosshair.visible.value) return null;
      const y = crosshair.y.value;
      if (!isNativeCrosshairOverMainPane(frame, y)) return null;
      return {
        time: resolveNativeCrosshairSnappedTime(frame, sharedViewport, crosshair.x.value, intervalMs),
        price: snapPriceToTick(nativeCrosshairYToPrice(y, sharedViewport, frame), pricePrecision),
      };
    },
    (next, previous) => {
      if (!next) return;
      if (previous && previous.time === next.time && previous.price === next.price) return;
      runOnJS(pushCrossHair)(next.time, next.price);
    },
    [crosshair, frame, intervalMs, pricePrecision, pushCrossHair, sharedViewport],
  );
}
