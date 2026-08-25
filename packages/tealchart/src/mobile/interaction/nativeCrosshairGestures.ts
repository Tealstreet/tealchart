import type { SharedValue } from 'react-native-reanimated';
import type { NativeChartFrame } from '../render/nativeChartFrame';
import type { NativeViewportSharedValues } from '../render/nativeSharedViewport';
import type { NativeOrderDragZone, NativeTradeLineActionZone, NativeTradeLineRow } from '../utils/tradeLineLayout';
import type { NativeCrosshairSharedValues } from './nativeCrosshair';
import type { NativeGestureControlZone } from './nativeGestureControlZones';

import { Gesture } from 'react-native-gesture-handler';

import { beginNativeCrosshairDrag, toggleNativeCrosshair, updateNativeCrosshairDrag } from './nativeCrosshair';
import { isNativeCrosshairContextMenuButtonTap, resolveNativeCrosshairSnappedY } from './nativeCrosshairContextMenu';
import { isNativeReservedControlPoint } from './nativeGestureControlZones';
import { NATIVE_TAP_MAX_DISTANCE } from './nativeGestureThresholds';
import { isNativeResetViewRevealTap } from './nativeResetViewButton';
import { canBeginNativeChartPan } from './nativeTradeLineHitTest';

const NATIVE_CROSSHAIR_LONG_PRESS_MIN_DURATION_MS = 2000;

interface NativeCrosshairGestureEvent {
  allTouches?: { x: number; y: number }[];
  changedTouches?: { x: number; y: number }[];
  numberOfTouches?: number;
}

function getNativeCrosshairTouchPoint(event: NativeCrosshairGestureEvent): { x: number; y: number } | null {
  'worklet';
  const touch = event.changedTouches?.[0] ?? event.allTouches?.[0];
  return touch ? { x: touch.x, y: touch.y } : null;
}

function isNativeCrosshairSingleTouch(event: NativeCrosshairGestureEvent): boolean {
  'worklet';
  return (event.allTouches?.length ?? event.numberOfTouches ?? 1) === 1;
}

function canBeginNativeCrosshairInteraction({
  controlZones,
  resetViewVisible,
  frame,
  orderDragZones,
  point,
  sharedViewport,
  tradeLabelHeight,
  tradeLineActionZones,
  tradeLineRows,
}: {
  controlZones: readonly NativeGestureControlZone[];
  resetViewVisible?: SharedValue<boolean>;
  frame: NativeChartFrame;
  orderDragZones: SharedValue<NativeOrderDragZone[]>;
  point: { x: number; y: number };
  sharedViewport: NativeViewportSharedValues;
  tradeLabelHeight: number;
  tradeLineActionZones: SharedValue<NativeTradeLineActionZone[]>;
  tradeLineRows: SharedValue<NativeTradeLineRow[]>;
}): boolean {
  'worklet';
  if (isNativeReservedControlPoint({ controlZones, frame, resetViewVisible, x: point.x, y: point.y })) return false;
  return canBeginNativeChartPan({
    actionZones: tradeLineActionZones.value,
    orderDragZones: orderDragZones.value,
    rows: tradeLineRows.value,
    x: point.x,
    y: point.y,
    sharedViewport,
    frame,
    tradeLabelHeight,
  });
}

function toggleNativeCrosshairAtPoint({
  controlZones,
  resetViewVisible,
  crosshair,
  frame,
  hasContextMenu,
  orderDragZones,
  point,
  pricePrecision,
  sharedViewport,
  tradeLabelHeight,
  tradeLineActionZones,
  tradeLineRows,
}: {
  controlZones: readonly NativeGestureControlZone[];
  resetViewVisible?: SharedValue<boolean>;
  crosshair: NativeCrosshairSharedValues;
  frame: NativeChartFrame;
  hasContextMenu: boolean;
  orderDragZones: SharedValue<NativeOrderDragZone[]>;
  point: { x: number; y: number };
  pricePrecision: number;
  sharedViewport: NativeViewportSharedValues;
  tradeLabelHeight: number;
  tradeLineActionZones: SharedValue<NativeTradeLineActionZone[]>;
  tradeLineRows: SharedValue<NativeTradeLineRow[]>;
}): boolean {
  'worklet';
  if (isNativeResetViewRevealTap(frame, point.x, point.y)) return false;
  if (
    hasContextMenu &&
    crosshair.visible.value &&
    isNativeCrosshairContextMenuButtonTap({
      frame,
      crosshairY: resolveNativeCrosshairSnappedY(frame, sharedViewport, crosshair.y.value, pricePrecision),
      pricePrecision,
      priceLabelMinWidth: crosshair.priceLabelMaxWidth?.value ?? 0,
      sharedViewport,
      x: point.x,
      y: point.y,
    })
  ) {
    return false;
  }
  if (
    !canBeginNativeCrosshairInteraction({
      controlZones,
      resetViewVisible,
      frame,
      orderDragZones,
      point,
      sharedViewport,
      tradeLabelHeight,
      tradeLineActionZones,
      tradeLineRows,
    })
  ) {
    return false;
  }
  toggleNativeCrosshair(crosshair, frame, point.x, point.y);
  return true;
}

export interface NativeCrosshairGestureInput {
  controlZones?: readonly NativeGestureControlZone[];
  resetViewVisible?: SharedValue<boolean>;
  crosshair: NativeCrosshairSharedValues;
  frame: NativeChartFrame | null;
  hasContextMenu?: boolean;
  orderDragZones: SharedValue<NativeOrderDragZone[]>;
  pricePrecision?: number;
  sharedViewport: NativeViewportSharedValues;
  tradeLabelHeight: number;
  tradeLineActionZones: SharedValue<NativeTradeLineActionZone[]>;
  tradeLineRows: SharedValue<NativeTradeLineRow[]>;
}
export function createNativeCrosshairLongPressGesture({
  controlZones = [],
  resetViewVisible,
  crosshair,
  frame,
  hasContextMenu = false,
  orderDragZones,
  pricePrecision = 2,
  sharedViewport,
  tradeLabelHeight,
  tradeLineActionZones,
  tradeLineRows,
}: NativeCrosshairGestureInput) {
  if (!frame) return Gesture.LongPress().enabled(false);
  return Gesture.LongPress()
    .minDuration(NATIVE_CROSSHAIR_LONG_PRESS_MIN_DURATION_MS)
    .maxDistance(NATIVE_TAP_MAX_DISTANCE)
    .onStart((event) => {
      toggleNativeCrosshairAtPoint({
        controlZones,
        resetViewVisible,
        crosshair,
        frame,
        hasContextMenu,
        orderDragZones,
        point: { x: event.x, y: event.y },
        pricePrecision,
        sharedViewport,
        tradeLabelHeight,
        tradeLineActionZones,
        tradeLineRows,
      });
    });
}

export function createNativeCrosshairPanGesture({
  controlZones = [],
  resetViewVisible,
  crosshair,
  frame,
  hasContextMenu = false,
  orderDragZones,
  pricePrecision = 2,
  sharedViewport,
  tradeLabelHeight,
  tradeLineActionZones,
  tradeLineRows,
}: NativeCrosshairGestureInput) {
  if (!frame) return Gesture.Pan().enabled(false);
  return Gesture.Pan()
    .minDistance(2)
    .onTouchesDown((event, stateManager) => {
      if (!crosshair.visible.value || !isNativeCrosshairSingleTouch(event)) {
        stateManager.fail();
        return;
      }
      const point = getNativeCrosshairTouchPoint(event);
      if (
        !point ||
        (hasContextMenu &&
          isNativeCrosshairContextMenuButtonTap({
            frame,
            crosshairY: resolveNativeCrosshairSnappedY(frame, sharedViewport, crosshair.y.value, pricePrecision),
            pricePrecision,
            priceLabelMinWidth: crosshair.priceLabelMaxWidth?.value ?? 0,
            sharedViewport,
            x: point.x,
            y: point.y,
          })) ||
        !canBeginNativeCrosshairInteraction({
          controlZones,
          resetViewVisible,
          frame,
          orderDragZones,
          point,
          sharedViewport,
          tradeLabelHeight,
          tradeLineActionZones,
          tradeLineRows,
        })
      ) {
        stateManager.fail();
      }
    })
    .onBegin(() => {
      beginNativeCrosshairDrag(crosshair);
    })
    .onUpdate((event) => {
      updateNativeCrosshairDrag(crosshair, frame, event.translationX, event.translationY);
    });
}
