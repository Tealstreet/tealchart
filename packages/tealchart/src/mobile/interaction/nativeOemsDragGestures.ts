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
import type { NativeOrderMoveGesture } from './nativeOrderMoveLease';

import { Gesture } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-worklets';

import { isNativeReservedControlPoint } from './nativeGestureControlZones';
import {
  beginNativeBracketDragState,
  beginNativeOrderDragState,
  clearNativeBracketDragState,
  clearNativeOrderDragState,
  finalizeNativeBracketDragState,
  finalizeNativeOrderDragState,
  getNativeBracketDragCommit,
  getNativeOrderDragCommit,
  hasNativeOrderTouchState,
  releaseNativeBracketDragGesture,
  releaseNativeOrderDragGesture,
  updateNativeBracketDragState,
  updateNativeOrderDragState,
} from './nativeOemsDragState';
import { resolveNativePartialBracketLadderDirection } from './nativePartialBracketZone';
import {
  findNativeBracketDragZone,
  findNativeOrderDragZone,
  findNativeTradeLineActionZone,
  findNativeTradeLineRow,
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
  beginOrderMove: (objectId: string, price: number, gesture: NativeOrderMoveGesture) => void;
  commitOrderMove: (objectId: string, nextPrice: number, gesture: NativeOrderMoveGesture) => void;
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
  beginOrderMove,
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
    .maxPointers(1)
    .minDistance(2)
    .onTouchesDown((event, stateManager) => {
      if (!hasNativeOrderTouchState(orderDragState)) {
        stateManager.fail();
        return;
      }
      if (orderDragState.active.value) return;
      orderDragState.touchArmed.value = false;
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
      if (!zone && onSelectTradeLine) {
        const row = findNativeTradeLineRow({
          rows: tradeLineRows.value,
          x: point.x,
          y: point.y,
          sharedViewport,
          frame,
          tradeLabelHeight,
        });
        if (row) {
          runOnJS(onSelectTradeLine)(row.objectType, row.objectId);
        }
      }
      if (!zone) {
        stateManager.fail();
        return;
      }
      if (orderDragState.touchSequence.value >= Number.MAX_SAFE_INTEGER) {
        stateManager.fail();
        return;
      }
      orderDragState.touchSequence.value += 1;
      orderDragState.touchStartedAt.value = Date.now();
      orderDragState.touchArmed.value = true;
    })
    .onBegin((event) => {
      if (!hasNativeOrderTouchState(orderDragState)) return;
      if (!orderDragState.touchArmed.value || orderDragState.active.value) return;
      orderDragState.touchArmed.value = false;
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
      // Claim the native state before either JS notification can rerender the chart.
      beginNativeOrderDragState(orderDragState, zone, getLiveNativePricePerPixel(sharedViewport, frame));
      if (onSelectTradeLine) {
        runOnJS(onSelectTradeLine)('order', zone.objectId);
      }
      runOnJS(beginOrderMove)(zone.objectId, zone.price, {
        sequence: orderDragState.touchSequence.value,
        startedAt: orderDragState.touchStartedAt.value,
      });
    })
    .onUpdate((event) => {
      if (!hasNativeOrderTouchState(orderDragState)) return;
      updateNativeOrderDragState(orderDragState, event.translationY);
    })
    .onEnd((event) => {
      if (!hasNativeOrderTouchState(orderDragState)) {
        clearNativeOrderDragState(orderDragState);
        return;
      }
      const payload = getNativeOrderDragCommit(orderDragState, event.translationY);
      if (!payload) {
        clearNativeOrderDragState(orderDragState);
        return;
      }
      // Gesture over, preview not - see `releaseNativeOrderDragGesture`.
      releaseNativeOrderDragGesture(orderDragState);
      runOnJS(commitOrderMove)(payload.objectId, payload.price, {
        sequence: orderDragState.touchSequence.value,
        startedAt: orderDragState.touchStartedAt.value,
      });
    })
    .onFinalize((_event, success) => {
      if (orderDragState.touchArmed) orderDragState.touchArmed.value = false;
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
      if (bracketDragInteractionState.active.value) {
        // A second finger joining the drag in progress.
        if (!isNativeInitialSingleTouch(event)) return;
        // A FIRST finger while still active: the last drag never finalized, so
        // nothing is holding it. Resuming it committed a TP wherever the next pan
        // ended, and a tap could never dismiss its picker (AGT-123).
        clearNativeBracketDragState(bracketDragInteractionState);
      }
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
        resolveNativePartialBracketLadderDirection(frame, event.x),
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
