import type { LegacyGestureStateManager as GestureStateManager } from 'react-native-gesture-handler';
import type { SharedValue } from 'react-native-reanimated';
import type { Viewport } from '../../types';
import type { NativeChartFrame } from '../render/nativeChartFrame';
import type { NativePaneRangeOverrides } from '../render/nativePaneRangeOverride';
import type { NativePaneDividerBand, NativePaneHeight } from './nativePaneDivider';
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

import { getNativePaneAtY, getNativePriceAxisPaneAt } from '../render/nativeChartFrame';
import { resolveNativePaneDividerAtY, resolveNativePaneDividerBands, resolveNativePaneDividerHeights } from './nativePaneDivider';
import {
  resolveNativeIndicatorPaneTranslateRange,
} from '../render/nativePaneRangeOverride';
import { isNativeReservedControlPoint } from './nativeGestureControlZones';
import { resolveNativeIndicatorPaneScaleRange } from './nativeIndicatorPaneScale';
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
  controlZones,
  resetViewVisible,
  frame,
  orderDragZones,
  sharedViewport,
  tradeLabelHeight,
  tradeLineActionZones,
  tradeLineRows,
}: {
  event: NativeGestureTouchEvent;
  controlZones: readonly NativeGestureControlZone[];
  resetViewVisible?: SharedValue<boolean>;
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

  const touchPoints = [vector.firstTouch, vector.secondTouch];
  for (let index = 0; index < touchPoints.length; index += 1) {
    const point = touchPoints[index];
    if (isNativeReservedControlPoint({ controlZones, frame, resetViewVisible, x: point.x, y: point.y })) return null;
  }

  const points = [...touchPoints, { x: vector.centerX, y: vector.centerY }];
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
  resetViewVisible?: SharedValue<boolean>;
  crosshair?: NativeCrosshairSharedValues;
  frame: NativeChartFrame | null;
  onIndicatorPaneScale?: (paneId: string, yMin: number, yMax: number) => void;
  onPaneDividerResizeEnd?: () => void;
  onPaneDividerResizeStart?: () => void;
  onPaneHeightsChange?: (heights: NativePaneHeight[]) => void;
  paneDividerBands?: SharedValue<NativePaneDividerBand[]>;
  orderDragZones: SharedValue<NativeOrderDragZone[]>;
  paneRangeOverrides?: SharedValue<NativePaneRangeOverrides>;
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
  resetViewVisible,
  crosshair,
  frame,
  onIndicatorPaneScale,
  onPaneDividerResizeEnd,
  onPaneDividerResizeStart,
  onPaneHeightsChange,
  paneDividerBands,
  orderDragZones,
  paneRangeOverrides,
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
        isNativeReservedControlPoint({ controlZones, frame, resetViewVisible, x: point.x, y: point.y }) ||
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
        return;
      }
      // A boundary between panes resizes them; it never pans or rescales, so it
      // claims the touch outright and the other targets stay null.
      const divider = frame && onPaneHeightsChange ? resolveNativePaneDividerAtY(frame, point.y) : null;
      chartPanGestureState.paneDividerTarget.value = divider;
      if (divider) {
        chartPanGestureState.indicatorPaneTarget.value = null;
        if (paneDividerBands) {
          paneDividerBands.value = resolveNativePaneDividerBands({ target: divider, translationY: 0 });
        }
        if (onPaneDividerResizeStart) runOnJS(onPaneDividerResizeStart)();
        return;
      }

      const pane = getNativePaneAtY(frame, point.y);
      chartPanGestureState.indicatorPaneTarget.value =
        pane && pane.type === 'indicator' && pane.yMax > pane.yMin
          ? { id: pane.id, height: pane.height, startYMin: pane.yMin, startYMax: pane.yMax, yMin: pane.yMin, yMax: pane.yMax }
          : null;
    })
    .onBegin(() => {
      // A divider drag resizes panes; it is not a viewport gesture. Starting one
      // marks the pan active and takes viewport ownership, and since the divider
      // branch commits no viewport, nothing ever hands either back — which left
      // `panActive` stuck true and made every drag after the first a no-op.
      if (chartPanGestureState.paneDividerTarget.value) return;
      beginNativeChartPanGestureStateFromFrame(chartPanGestureState, frame);
      runOnJS(beginNativeViewportInteraction)();
    })
    .onUpdate((event) => {
      // The two components are independent. Time slides across every pane; the
      // vertical drag moves only the pane it started in, so the main viewport
      // takes no vertical delta while one is targeted.
      const divider = chartPanGestureState.paneDividerTarget.value;
      if (divider) {
        // Preview only. Each pane was captured to its own bitmap on touch-down,
        // so the drag just moves those, entirely on the UI thread. The real
        // heights are committed once, on release.
        if (paneDividerBands) {
          paneDividerBands.value = resolveNativePaneDividerBands({ target: divider, translationY: event.translationY });
        }
        return;
      }

      const pane = chartPanGestureState.indicatorPaneTarget.value;
      updateNativeChartPanGestureState(chartPanGestureState, event.translationX, pane ? 0 : event.translationY);
      if (!pane) return;

      const next = resolveNativeIndicatorPaneTranslateRange({
        paneHeight: pane.height,
        startYMax: pane.startYMax,
        startYMin: pane.startYMin,
        translationY: event.translationY,
      });
      chartPanGestureState.indicatorPaneTarget.value = { ...pane, yMin: next.yMin, yMax: next.yMax };
      if (paneRangeOverrides) {
        paneRangeOverrides.value = { ...paneRangeOverrides.value, [pane.id]: next };
      }
    })
    .onEnd((event) => {
      const dividerTarget = chartPanGestureState.paneDividerTarget.value;
      if (dividerTarget) {
        if (onPaneHeightsChange) {
          runOnJS(onPaneHeightsChange)(
            resolveNativePaneDividerHeights({ target: dividerTarget, translationY: event.translationY }),
          );
        }
        return;
      }
      // Only when the drag actually moved vertically. A sideways pan through an
      // indicator pane must not silently pin its range against auto-scale.
      const pane = chartPanGestureState.indicatorPaneTarget.value;
      if (pane && onIndicatorPaneScale && pane.yMin !== pane.startYMin) {
        runOnJS(onIndicatorPaneScale)(pane.id, pane.yMin, pane.yMax);
      }
      const nextViewport = getNativeViewportGestureCommit(panActive, sharedViewport);
      if (!nextViewport) return;
      runOnJS(commitPanViewport)(nextViewport);
    })
    .onFinalize((_event, success) => {
      if (chartPanGestureState.paneDividerTarget.value) {
        chartPanGestureState.paneDividerTarget.value = null;
        if (onPaneDividerResizeEnd) runOnJS(onPaneDividerResizeEnd)();
      }
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
  controlZones?: readonly NativeGestureControlZone[];
  resetViewVisible?: SharedValue<boolean>;
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
  controlZones = [],
  resetViewVisible,
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
        controlZones,
        resetViewVisible,
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
  controlZones?: readonly NativeGestureControlZone[];
  resetViewVisible?: SharedValue<boolean>;
  frame: NativeChartFrame | null;
  onIndicatorPaneScale?: (paneId: string, yMin: number, yMax: number) => void;
  paneRangeOverrides?: SharedValue<NativePaneRangeOverrides>;
  priceScaleActive: SharedValue<boolean>;
  priceScaleGestureState: NativePriceScaleGestureState;
  sharedViewport: NativeViewportSharedValues;
}

export function createNativePriceScaleGesture({
  beginNativeViewportInteraction,
  cancelNativeViewportInteraction,
  commitPanViewport,
  controlZones = [],
  resetViewVisible,
  frame,
  onIndicatorPaneScale,
  paneRangeOverrides,
  priceScaleActive,
  priceScaleGestureState,
  sharedViewport,
}: NativePriceScaleGestureInput) {
  if (!frame) return Gesture.Pan().enabled(false);
  const geometry = getNativePriceScaleHitGeometry(frame);
  // Which pane the drag scales is decided by where it went down, and held for
  // the whole gesture so wandering into a neighbouring pane keeps scaling the
  // one it started on. The target lives on the gesture state, not here — see
  // NativeIndicatorPaneScaleTarget.
  const indicatorPane = priceScaleGestureState.indicatorPaneTarget;

  return Gesture.Pan()
    .minDistance(2)
    .onTouchesDown((event, stateManager: GestureStateManager) => {
      if (priceScaleActive.value) return;
      if (!isNativeInitialSingleTouch(event)) {
        stateManager.fail();
        return;
      }
      const point = getNativeTouchPoint(event);
      if (!point || isNativeReservedControlPoint({ controlZones, frame, resetViewVisible, x: point.x, y: point.y })) {
        stateManager.fail();
        return;
      }

      indicatorPane.value = null;
      if (canBeginNativePriceScaleGesture(geometry, point.x, point.y)) return;

      const pane = onIndicatorPaneScale ? getNativePriceAxisPaneAt(frame, point.x, point.y) : null;
      if (!pane || pane.type !== 'indicator' || !(pane.yMax > pane.yMin)) {
        stateManager.fail();
        return;
      }
      indicatorPane.value = {
        id: pane.id,
        height: pane.height,
        startYMin: pane.yMin,
        startYMax: pane.yMax,
        yMin: pane.yMin,
        yMax: pane.yMax,
      };
    })
    .onBegin((event) => {
      if (indicatorPane.value) return;
      beginNativePriceScaleGestureState(priceScaleGestureState, event.y, geometry.plotTop, geometry.plotHeight);
      runOnJS(beginNativeViewportInteraction)();
    })
    .onUpdate((event) => {
      const pane = indicatorPane.value;
      if (pane) {
        // Tracked on the UI thread and committed once on release. Committing
        // per update rebuilt the frame — and with it this gesture — on every
        // frame of the drag, which is what made it crawl.
        const next = resolveNativeIndicatorPaneScaleRange({
          paneHeight: pane.height,
          plotHeight: geometry.plotHeight,
          startYMax: pane.startYMax,
          startYMin: pane.startYMin,
          translationY: event.translationY,
        });
        indicatorPane.value = { ...pane, yMin: next.yMin, yMax: next.yMax };
        if (paneRangeOverrides) {
          paneRangeOverrides.value = { ...paneRangeOverrides.value, [pane.id]: next };
        }
        return;
      }
      updateNativePriceScaleGestureState(priceScaleGestureState, event.translationY);
    })
    .onEnd(() => {
      const pane = indicatorPane.value;
      if (pane) {
        if (onIndicatorPaneScale) runOnJS(onIndicatorPaneScale)(pane.id, pane.yMin, pane.yMax);
        return;
      }
      const nextViewport = getNativeViewportGestureCommit(priceScaleActive, sharedViewport);
      if (!nextViewport) return;
      runOnJS(commitPanViewport)(nextViewport);
    })
    .onFinalize((_event, success) => {
      if (indicatorPane.value) {
        indicatorPane.value = null;
        return;
      }
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
  controlZones?: readonly NativeGestureControlZone[];
  resetViewVisible?: SharedValue<boolean>;
  frame: NativeChartFrame | null;
  sharedViewport: NativeViewportSharedValues;
  timeScaleActive: SharedValue<boolean>;
  timeScaleGestureState: NativeTimeScaleGestureState;
}

export function createNativeTimeScaleGesture({
  beginNativeViewportInteraction,
  cancelNativeViewportInteraction,
  commitPanViewport,
  controlZones = [],
  resetViewVisible,
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
      if (
        !point ||
        isNativeReservedControlPoint({ controlZones, frame, resetViewVisible, x: point.x, y: point.y }) ||
        !canBeginNativeTimeScaleGesture(geometry, point.x, point.y)
      ) {
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
