import type { SharedValue } from 'react-native-reanimated';
import type { NativeChartFrame } from '../render/nativeChartFrame';
import type { NativeViewportSharedValues } from '../render/nativeSharedViewport';
import type {
  NativeOrderDragZone,
  NativeTradeLineActionZone,
  NativeTradeLineObjectType,
  NativeTradeLineRow,
} from '../utils/tradeLineLayout';
import type { NativeGestureControlZone } from './nativeGestureControlZones';
import type {
  NativeBracketDragInteractionState,
  NativeOrderDragInteractionState,
  NativeTradeLineBracketType,
} from './nativeOemsDragState';

import { Gesture } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-worklets';

import { isNativeReservedControlPoint } from './nativeGestureControlZones';
import {
  beginNativeBracketDragState,
  beginNativeOrderDragState,
  clearNativeBracketDragState,
  releaseNativeBracketDragGesture,
  releaseNativeOrderDragGesture,
  clearNativeOrderDragState,
  finalizeNativeBracketDragState,
  finalizeNativeOrderDragState,
  getNativeBracketDragCommit,
  getNativeOrderDragCommit,
  updateNativeBracketDragState,
  updateNativeOrderDragState,
} from './nativeOemsDragState';
import {
  findNativeBracketDragZone,
  findNativeOrderDragZone,
  findNativeTradeLineActionZone,
} from './nativeTradeLineHitTest';

interface NativeGestureTouchEvent {
  allTouches: { x: number; y: number }[];
  changedTouches: { x: number; y: number }[];
}

function getNativeTouchPoint(event: NativeGestureTouchEvent): { x: number; y: number } | null {
  'worklet';
  const touch = event.changedTouches[0] ?? event.allTouches[0];
  return touch ? { x: touch.x, y: touch.y } : null;
}

function isNativeInitialSingleTouch(event: NativeGestureTouchEvent): boolean {
  'worklet';
  return event.allTouches.length === 1;
}

function getLiveNativePricePerPixel(sharedViewport: NativeViewportSharedValues, frame: NativeChartFrame): number {
  'worklet';
  const range = sharedViewport.priceMax.value - sharedViewport.priceMin.value;
  return frame.mainPane.height > 0 ? range / frame.mainPane.height : 0;
}

export interface NativeOrderDragGestureInput {
  commitOrderMove: (objectId: string, nextPrice: number) => void;
  onSelectTradeLine?: (objectType: NativeTradeLineObjectType, objectId: string) => void;
  controlZones?: readonly NativeGestureControlZone[];
  resetViewVisible?: SharedValue<boolean>;
  frame: NativeChartFrame | null;
  orderDragState: NativeOrderDragInteractionState;
  orderDragZones: SharedValue<NativeOrderDragZone[]>;
  sharedViewport: NativeViewportSharedValues;
  tradeLabelHeight: number;
  tradeLineActionZones: SharedValue<NativeTradeLineActionZone[]>;
  tradeLineRows: SharedValue<NativeTradeLineRow[]>;
}

export function createNativeOrderDragGesture({
  commitOrderMove,
  onSelectTradeLine,
  controlZones = [],
  resetViewVisible,
  frame,
  orderDragState,
  orderDragZones,
  sharedViewport,
  tradeLabelHeight,
  tradeLineActionZones,
  tradeLineRows,
}: NativeOrderDragGestureInput) {
  if (!frame) return Gesture.Pan().enabled(false);
  return Gesture.Pan()
    .minDistance(2)
    .onTouchesDown((event, stateManager) => {
      if (orderDragState.active.value) return;
      if (!isNativeInitialSingleTouch(event)) {
        stateManager.fail();
        return;
      }
      const point = getNativeTouchPoint(event);
      if (
        !point ||
        isNativeReservedControlPoint({ controlZones, frame, resetViewVisible, x: point.x, y: point.y }) ||
        findNativeTradeLineActionZone({
          zones: tradeLineActionZones.value,
          rows: tradeLineRows.value,
          x: point.x,
          y: point.y,
          sharedViewport,
          frame,
          tradeLabelHeight,
        })
      ) {
        stateManager.fail();
        return;
      }
      const zone = findNativeOrderDragZone({
        zones: orderDragZones.value,
        rows: tradeLineRows.value,
        x: point.x,
        y: point.y,
        sharedViewport,
        frame,
        tradeLabelHeight,
      });
      if (!zone) {
        stateManager.fail();
      }
    })
    .onBegin((event) => {
      const zone = findNativeOrderDragZone({
        zones: orderDragZones.value,
        rows: tradeLineRows.value,
        x: event.x,
        y: event.y,
        sharedViewport,
        frame,
        tradeLabelHeight,
      });
      if (!zone) return;
      if (onSelectTradeLine) {
        runOnJS(onSelectTradeLine)('order', zone.objectId);
      }
      beginNativeOrderDragState(orderDragState, zone, getLiveNativePricePerPixel(sharedViewport, frame));
    })
    .onUpdate((event) => {
      updateNativeOrderDragState(orderDragState, event.translationY);
    })
    .onEnd((event) => {
      const payload = getNativeOrderDragCommit(orderDragState, event.translationY);
      if (!payload) {
        clearNativeOrderDragState(orderDragState);
        return;
      }
      // Gesture over, preview not - see `releaseNativeOrderDragGesture`.
      releaseNativeOrderDragGesture(orderDragState);
      runOnJS(commitOrderMove)(payload.objectId, payload.price);
    })
    .onFinalize((_event, success) => {
      finalizeNativeOrderDragState(orderDragState, success);
    });
}

export interface NativeBracketDragGestureInput {
  bracketDragInteractionState: NativeBracketDragInteractionState;
  clearNativeBracketDrag: () => void;
  commitBracketMove: (
    objectType: NativeTradeLineObjectType,
    objectId: string,
    bracketType: NativeTradeLineBracketType,
    price: number,
    partialPercent?: number,
  ) => void;
  onSelectTradeLine?: (objectType: NativeTradeLineObjectType, objectId: string) => void;
  controlZones?: readonly NativeGestureControlZone[];
  resetViewVisible?: SharedValue<boolean>;
  frame: NativeChartFrame | null;
  sharedViewport: NativeViewportSharedValues;
  tradeLabelHeight: number;
  tradeLineActionZones: SharedValue<NativeTradeLineActionZone[]>;
  tradeLineRows: SharedValue<NativeTradeLineRow[]>;
}

export function createNativeBracketDragGesture({
  bracketDragInteractionState,
  clearNativeBracketDrag,
  commitBracketMove,
  onSelectTradeLine,
  controlZones = [],
  resetViewVisible,
  frame,
  sharedViewport,
  tradeLabelHeight,
  tradeLineActionZones,
  tradeLineRows,
}: NativeBracketDragGestureInput) {
  if (!frame) return Gesture.Pan().enabled(false);
  return Gesture.Pan()
    .minDistance(2)
    .onTouchesDown((event, stateManager) => {
      if (bracketDragInteractionState.active.value) return;
      if (!isNativeInitialSingleTouch(event)) {
        stateManager.fail();
        return;
      }
      const point = getNativeTouchPoint(event);
      if (!point || isNativeReservedControlPoint({ controlZones, frame, resetViewVisible, x: point.x, y: point.y })) {
        stateManager.fail();
        return;
      }
      const zone = findNativeBracketDragZone({
        zones: tradeLineActionZones.value,
        rows: tradeLineRows.value,
        x: point.x,
        y: point.y,
        sharedViewport,
        frame,
        tradeLabelHeight,
      });
      if (!zone) {
        stateManager.fail();
      }
    })
    .onBegin((event) => {
      const zone = findNativeBracketDragZone({
        zones: tradeLineActionZones.value,
        rows: tradeLineRows.value,
        x: event.x,
        y: event.y,
        sharedViewport,
        frame,
        tradeLabelHeight,
      });
      if (!zone) return;
      if (onSelectTradeLine) {
        runOnJS(onSelectTradeLine)(zone.objectType, zone.objectId);
      }
      beginNativeBracketDragState(
        bracketDragInteractionState,
        zone,
        getLiveNativePricePerPixel(sharedViewport, frame),
        event.x,
        event.y,
      );
    })
    .onUpdate((event) => {
      updateNativeBracketDragState(bracketDragInteractionState, event.translationX, event.translationY);
    })
    .onEnd((event) => {
      const payload = getNativeBracketDragCommit(bracketDragInteractionState, event.translationX, event.translationY);
      if (!payload) {
        clearNativeBracketDragState(bracketDragInteractionState);
        return;
      }
      if (payload === 'clear') {
        clearNativeBracketDragState(bracketDragInteractionState);
        runOnJS(clearNativeBracketDrag)();
        return;
      }
      // Gesture over, preview not. Only the commit branch hands off - the two
      // branches above have no JS-side path that could ever retire a preview,
      // so they must keep clearing outright.
      releaseNativeBracketDragGesture(bracketDragInteractionState);
      runOnJS(commitBracketMove)(
        payload.objectType,
        payload.objectId,
        payload.bracketType,
        payload.price,
        payload.partialPercent,
      );
    })
    .onFinalize((_event, success) => {
      finalizeNativeBracketDragState(bracketDragInteractionState, success);
    });
}
