import type { GestureStateManager } from 'react-native-gesture-handler';
import type { SharedValue } from 'react-native-reanimated';
import type { Viewport } from '../../types';
import type { NativeChartFrame } from '../render/nativeChartFrame';
import type { NativeViewportSharedValues } from '../render/nativeSharedViewport';
import type { NativeOrderDragZone, NativeTradeLineActionZone, NativeTradeLineRow } from '../utils/tradeLineLayout';
import type { NativeCrosshairSharedValues } from './nativeCrosshair';
import type { NativeGestureControlZone } from './nativeGestureControlZones';
import type { NativeBracketDragInteractionState, NativeOrderDragInteractionState } from './nativeOemsDragState';
import type {
  NativeChartAxisPinchGestureState,
  NativeChartPanGestureState,
  NativePriceScaleGestureState,
  NativeTimeScaleGestureState,
} from './nativeViewportGestureState';

import { Gesture } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-worklets';

import { isNativeGestureControlPoint } from './nativeGestureControlZones';
import { canBeginNativeChartPan } from './nativeTradeLineHitTest';
import {
  beginNativeChartAxisPinchGestureState,
  beginNativeChartPanGestureStateFromFrame,
  beginNativePriceScaleGestureState,
  beginNativeTimeScaleGestureState,
  canBeginNativePriceScaleGesture,
  canBeginNativeTimeScaleGesture,
  finalizeNativeViewportGestureState,
  getNativePriceScaleHitGeometry,
  getNativeTimeScaleHitGeometry,
  getNativeViewportGestureCommit,
  updateNativeChartAxisPinchGestureState,
  updateNativeChartPanGestureState,
  updateNativePriceScaleGestureState,
  updateNativeTimeScaleGestureState,
} from './nativeViewportGestureState';

interface NativeGestureTouchEvent {
  allTouches: { x: number; y: number }[];
  changedTouches: { x: number; y: number }[];
  numberOfTouches?: number;
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

interface NativeTwoTouchVector {
  centerX: number;
  centerY: number;
  spanX: number;
  spanY: number;
  firstTouch: { x: number; y: number };
  secondTouch: { x: number; y: number };
}

function getNativeTwoTouchVector(event: NativeGestureTouchEvent): NativeTwoTouchVector | null {
  'worklet';
  const firstTouch = event.allTouches[0];
  const secondTouch = event.allTouches[1];
  if (!firstTouch || !secondTouch) return null;
  return {
    centerX: (firstTouch.x + secondTouch.x) / 2,
    centerY: (firstTouch.y + secondTouch.y) / 2,
    spanX: secondTouch.x - firstTouch.x,
    spanY: secondTouch.y - firstTouch.y,
    firstTouch,
    secondTouch,
  };
}

function canBeginNativeChartAxisPinch({
  event,
  frame,
  orderDragZones,
  sharedViewport,
  tradeLabelHeight,
  tradeLineActionZones,
  tradeLineRows,
}: {
  event: NativeGestureTouchEvent;
  frame: NativeChartFrame;
  orderDragZones: SharedValue<NativeOrderDragZone[]>;
  sharedViewport: NativeViewportSharedValues;
  tradeLabelHeight: number;
  tradeLineActionZones: SharedValue<NativeTradeLineActionZone[]>;
  tradeLineRows: SharedValue<NativeTradeLineRow[]>;
}): NativeTwoTouchVector | null {
  'worklet';
  const vector = getNativeTwoTouchVector(event);
  if (!vector) return null;

  const points = [vector.firstTouch, vector.secondTouch, { x: vector.centerX, y: vector.centerY }];
  for (let index = 0; index < points.length; index += 1) {
    const point = points[index];
    if (
      !canBeginNativeChartPan({
        actionZones: tradeLineActionZones.value,
        orderDragZones: orderDragZones.value,
        rows: tradeLineRows.value,
        x: point.x,
        y: point.y,
        sharedViewport,
        frame,
        tradeLabelHeight,
      })
    ) {
      return null;
    }
  }

  return vector;
}

export interface NativeChartPanGestureInput {
  beginNativeViewportInteraction: () => void;
  cancelNativeViewportInteraction: () => void;
  chartPanGestureState: NativeChartPanGestureState;
  commitPanViewport: (nextViewport: Viewport) => void;
  controlZones?: readonly NativeGestureControlZone[];
  crosshair?: NativeCrosshairSharedValues;
  frame: NativeChartFrame | null;
  orderDragZones: SharedValue<NativeOrderDragZone[]>;
  panActive: SharedValue<boolean>;
  sharedViewport: NativeViewportSharedValues;
  tradeLabelHeight: number;
  tradeLineActionZones: SharedValue<NativeTradeLineActionZone[]>;
  tradeLineRows: SharedValue<NativeTradeLineRow[]>;
}

export function createNativeChartPanGesture({
  beginNativeViewportInteraction,
  cancelNativeViewportInteraction,
  chartPanGestureState,
  commitPanViewport,
  controlZones = [],
  crosshair,
  frame,
  orderDragZones,
  panActive,
  sharedViewport,
  tradeLabelHeight,
  tradeLineActionZones,
  tradeLineRows,
}: NativeChartPanGestureInput) {
  if (!frame) return Gesture.Pan().enabled(false);

  return Gesture.Pan()
    .minDistance(2)
    .onTouchesDown((event, stateManager: GestureStateManager) => {
      if (panActive.value) return;
      if (crosshair?.visible.value) {
        stateManager.fail();
        return;
      }
      if (!isNativeInitialSingleTouch(event)) {
        stateManager.fail();
        return;
      }
      const point = getNativeTouchPoint(event);
      if (
        !point ||
        isNativeGestureControlPoint(controlZones, point.x, point.y) ||
        !canBeginNativeChartPan({
          actionZones: tradeLineActionZones.value,
          orderDragZones: orderDragZones.value,
          rows: tradeLineRows.value,
          x: point.x,
          y: point.y,
          sharedViewport,
          frame,
          tradeLabelHeight,
        })
      ) {
        stateManager.fail();
      }
    })
    .onBegin(() => {
      beginNativeChartPanGestureStateFromFrame(chartPanGestureState, frame);
      runOnJS(beginNativeViewportInteraction)();
    })
    .onUpdate((event) => {
      updateNativeChartPanGestureState(chartPanGestureState, event.translationX, event.translationY);
    })
    .onEnd(() => {
      const nextViewport = getNativeViewportGestureCommit(panActive, sharedViewport);
      if (!nextViewport) return;
      runOnJS(commitPanViewport)(nextViewport);
    })
    .onFinalize((_event, success) => {
      if (
        finalizeNativeViewportGestureState({
          active: panActive,
          sharedViewport,
          startViewport: chartPanGestureState.startViewport,
          success,
        })
      ) {
        runOnJS(cancelNativeViewportInteraction)();
      }
    });
}

export interface NativeChartAxisPinchGestureInput {
  beginNativeViewportInteraction: () => void;
  bracketDragActive: SharedValue<boolean>;
  bracketDragInteractionState: NativeBracketDragInteractionState;
  cancelNativeViewportInteraction: () => void;
  chartAxisPinchGestureState: NativeChartAxisPinchGestureState;
  commitPanViewport: (nextViewport: Viewport) => void;
  frame: NativeChartFrame | null;
  orderDragState: NativeOrderDragInteractionState;
  orderDragZones: SharedValue<NativeOrderDragZone[]>;
  panActive: SharedValue<boolean>;
  pinchActive: SharedValue<boolean>;
  priceScaleActive: SharedValue<boolean>;
  sharedViewport: NativeViewportSharedValues;
  timeScaleActive: SharedValue<boolean>;
  tradeLabelHeight: number;
  tradeLineActionZones: SharedValue<NativeTradeLineActionZone[]>;
  tradeLineRows: SharedValue<NativeTradeLineRow[]>;
}

export function createNativeChartAxisPinchGesture({
  beginNativeViewportInteraction,
  bracketDragActive,
  bracketDragInteractionState,
  cancelNativeViewportInteraction,
  chartAxisPinchGestureState,
  commitPanViewport,
  frame,
  orderDragState,
  orderDragZones,
  panActive,
  pinchActive,
  priceScaleActive,
  sharedViewport,
  timeScaleActive,
  tradeLabelHeight,
  tradeLineActionZones,
  tradeLineRows,
}: NativeChartAxisPinchGestureInput) {
  if (!frame) return Gesture.Manual().enabled(false);

  return Gesture.Manual()
    .onTouchesDown((event, stateManager: GestureStateManager) => {
      if (pinchActive.value) return;
      if (
        bracketDragActive.value ||
        bracketDragInteractionState.active.value ||
        orderDragState.active.value ||
        priceScaleActive.value ||
        timeScaleActive.value
      ) {
        stateManager.fail();
        return;
      }
      if (event.allTouches.length < 2) return;
      const vector = canBeginNativeChartAxisPinch({
        event,
        frame,
        orderDragZones,
        sharedViewport,
        tradeLabelHeight,
        tradeLineActionZones,
        tradeLineRows,
      });
      if (!vector) {
        stateManager.fail();
        return;
      }

      const transitioningFromPan = panActive.value;
      if (transitioningFromPan) {
        panActive.value = false;
      }
      beginNativeChartAxisPinchGestureState(
        chartAxisPinchGestureState,
        vector.centerX,
        vector.centerY,
        vector.spanX,
        vector.spanY,
        frame,
      );
      if (!transitioningFromPan) {
        runOnJS(beginNativeViewportInteraction)();
      }
      stateManager.activate();
    })
    .onTouchesMove((event) => {
      if (!pinchActive.value) return;
      const vector = getNativeTwoTouchVector(event);
      if (!vector) return;
      updateNativeChartAxisPinchGestureState(
        chartAxisPinchGestureState,
        vector.centerX,
        vector.centerY,
        vector.spanX,
        vector.spanY,
        frame,
      );
    })
    .onTouchesUp((event, stateManager: GestureStateManager) => {
      if (!pinchActive.value) return;
      if ((event.numberOfTouches ?? event.allTouches.length) >= 2 && event.allTouches.length >= 2) return;
      const nextViewport = getNativeViewportGestureCommit(pinchActive, sharedViewport);
      if (nextViewport) {
        runOnJS(commitPanViewport)(nextViewport);
      }
      stateManager.end();
    })
    .onTouchesCancelled((_event, stateManager: GestureStateManager) => {
      if (pinchActive.value) stateManager.fail();
    })
    .onFinalize((_event, success) => {
      if (
        finalizeNativeViewportGestureState({
          active: pinchActive,
          sharedViewport,
          startViewport: chartAxisPinchGestureState.startViewport,
          success,
        })
      ) {
        runOnJS(cancelNativeViewportInteraction)();
      }
    });
}

export interface NativePriceScaleGestureInput {
  beginNativeViewportInteraction: () => void;
  cancelNativeViewportInteraction: () => void;
  commitPanViewport: (nextViewport: Viewport) => void;
  frame: NativeChartFrame | null;
  priceScaleActive: SharedValue<boolean>;
  priceScaleGestureState: NativePriceScaleGestureState;
  sharedViewport: NativeViewportSharedValues;
}

export function createNativePriceScaleGesture({
  beginNativeViewportInteraction,
  cancelNativeViewportInteraction,
  commitPanViewport,
  frame,
  priceScaleActive,
  priceScaleGestureState,
  sharedViewport,
}: NativePriceScaleGestureInput) {
  if (!frame) return Gesture.Pan().enabled(false);
  const geometry = getNativePriceScaleHitGeometry(frame);

  return Gesture.Pan()
    .minDistance(2)
    .onTouchesDown((event, stateManager: GestureStateManager) => {
      if (priceScaleActive.value) return;
      if (!isNativeInitialSingleTouch(event)) {
        stateManager.fail();
        return;
      }
      const point = getNativeTouchPoint(event);
      if (!point || !canBeginNativePriceScaleGesture(geometry, point.x, point.y)) {
        stateManager.fail();
      }
    })
    .onBegin((event) => {
      beginNativePriceScaleGestureState(priceScaleGestureState, event.y, geometry.plotTop, geometry.plotHeight);
      runOnJS(beginNativeViewportInteraction)();
    })
    .onUpdate((event) => {
      updateNativePriceScaleGestureState(priceScaleGestureState, event.translationY);
    })
    .onEnd(() => {
      const nextViewport = getNativeViewportGestureCommit(priceScaleActive, sharedViewport);
      if (!nextViewport) return;
      runOnJS(commitPanViewport)(nextViewport);
    })
    .onFinalize((_event, success) => {
      if (
        finalizeNativeViewportGestureState({
          active: priceScaleActive,
          sharedViewport,
          startViewport: priceScaleGestureState.startViewport,
          success,
        })
      ) {
        runOnJS(cancelNativeViewportInteraction)();
      }
    });
}

export interface NativeTimeScaleGestureInput {
  beginNativeViewportInteraction: () => void;
  cancelNativeViewportInteraction: () => void;
  commitPanViewport: (nextViewport: Viewport) => void;
  frame: NativeChartFrame | null;
  sharedViewport: NativeViewportSharedValues;
  timeScaleActive: SharedValue<boolean>;
  timeScaleGestureState: NativeTimeScaleGestureState;
}

export function createNativeTimeScaleGesture({
  beginNativeViewportInteraction,
  cancelNativeViewportInteraction,
  commitPanViewport,
  frame,
  sharedViewport,
  timeScaleActive,
  timeScaleGestureState,
}: NativeTimeScaleGestureInput) {
  if (!frame) return Gesture.Pan().enabled(false);
  const geometry = getNativeTimeScaleHitGeometry(frame);

  return Gesture.Pan()
    .minDistance(2)
    .onTouchesDown((event, stateManager: GestureStateManager) => {
      if (timeScaleActive.value) return;
      if (!isNativeInitialSingleTouch(event)) {
        stateManager.fail();
        return;
      }
      const point = getNativeTouchPoint(event);
      if (!point || !canBeginNativeTimeScaleGesture(geometry, point.x, point.y)) {
        stateManager.fail();
      }
    })
    .onBegin(() => {
      beginNativeTimeScaleGestureState(timeScaleGestureState);
      runOnJS(beginNativeViewportInteraction)();
    })
    .onUpdate((event) => {
      updateNativeTimeScaleGestureState(timeScaleGestureState, event.translationX);
    })
    .onEnd(() => {
      const nextViewport = getNativeViewportGestureCommit(timeScaleActive, sharedViewport);
      if (!nextViewport) return;
      runOnJS(commitPanViewport)(nextViewport);
    })
    .onFinalize((_event, success) => {
      if (
        finalizeNativeViewportGestureState({
          active: timeScaleActive,
          sharedViewport,
          startViewport: timeScaleGestureState.startViewport,
          success,
        })
      ) {
        runOnJS(cancelNativeViewportInteraction)();
      }
    });
}
