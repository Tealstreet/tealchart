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
  NativeGestureDebugEventHandler,
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

function formatNativeGestureDebugNumber(value: number): string {
  'worklet';
  return `${Math.round(value)}`;
}

function formatNativeGestureDebugPoint(point: { x: number; y: number } | null): string {
  'worklet';
  if (!point) return 'none';
  return `${formatNativeGestureDebugNumber(point.x)},${formatNativeGestureDebugNumber(point.y)}`;
}

function emitNativeGestureDebug(onDebugGestureEvent: NativeGestureDebugEventHandler | undefined, message: string): void {
  'worklet';
  if (!onDebugGestureEvent) return;
  runOnJS(onDebugGestureEvent)(message);
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
  onDebugGestureEvent?: NativeGestureDebugEventHandler;
  onIndicatorPaneScale?: (paneId: string, yMin: number, yMax: number) => void;
  onIndicatorPaneScaleStart?: (paneId: string) => void;
  onPaneDividerResizeEnd?: (success: boolean) => void;
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
  onDebugGestureEvent,
  onIndicatorPaneScale,
  onIndicatorPaneScaleStart,
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
    .onTouchesDown((event, stateManager) => {
      const point = getNativeTouchPoint(event);
      emitNativeGestureDebug(
        onDebugGestureEvent,
        `pan down touches=${event.allTouches.length} p=${formatNativeGestureDebugPoint(point)}`,
      );
      if (crosshair?.visible.value) {
        emitNativeGestureDebug(onDebugGestureEvent, 'pan fail crosshair-visible');
        stateManager.fail();
        return;
      }
      if (panActive.value) return;
      if (!isNativeInitialSingleTouch(event)) {
        emitNativeGestureDebug(onDebugGestureEvent, `pan fail touches=${event.allTouches.length}`);
        stateManager.fail();
        return;
      }
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
        emitNativeGestureDebug(onDebugGestureEvent, `pan fail hit=${formatNativeGestureDebugPoint(point)}`);
        stateManager.fail();
        return;
      }
      // A boundary between panes resizes them; it never pans or rescales, so it
      // claims the touch outright and the other targets stay null.
      const divider = frame && onPaneHeightsChange ? resolveNativePaneDividerAtY(frame, point.y) : null;
      chartPanGestureState.paneDividerTarget.value = divider;
      if (divider) {
        emitNativeGestureDebug(
          onDebugGestureEvent,
          `pan target divider y=${formatNativeGestureDebugNumber(divider.y)} index=${divider.dividerIndex}`,
        );
        chartPanGestureState.indicatorPaneTarget.value = null;
        if (paneDividerBands) {
          paneDividerBands.value = resolveNativePaneDividerBands({ target: divider, translationY: 0 });
        }
        if (onPaneDividerResizeStart) runOnJS(onPaneDividerResizeStart)();
        return;
      }

      const pane = getNativePaneAtY(frame, point.y);
      emitNativeGestureDebug(
        onDebugGestureEvent,
        `pan target ${pane ? pane.id : 'none'} type=${pane?.type ?? 'none'}`,
      );
      chartPanGestureState.indicatorPaneTarget.value =
        pane && pane.type === 'indicator' && pane.yMax > pane.yMin
          ? { id: pane.id, height: pane.height, startYMin: pane.yMin, startYMax: pane.yMax, yMin: pane.yMin, yMax: pane.yMax }
          : null;
      if (chartPanGestureState.indicatorPaneTarget.value && onIndicatorPaneScaleStart) {
        runOnJS(onIndicatorPaneScaleStart)(chartPanGestureState.indicatorPaneTarget.value.id);
      }
    })
    .onBegin(() => {
      // A divider drag resizes panes; it is not a viewport gesture. Starting one
      // marks the pan active and takes viewport ownership, and since the divider
      // branch commits no viewport, nothing ever hands either back — which left
      // `panActive` stuck true and made every drag after the first a no-op.
      if (chartPanGestureState.paneDividerTarget.value) {
        emitNativeGestureDebug(onDebugGestureEvent, 'pan begin divider');
        return;
      }
      if (crosshair?.visible.value) return;
      emitNativeGestureDebug(onDebugGestureEvent, 'pan begin viewport');
      beginNativeChartPanGestureStateFromFrame(chartPanGestureState, frame);
      runOnJS(beginNativeViewportInteraction)();
    })
    .onUpdate((event) => {
      // The two components are independent. Time slides across every pane; the
      // vertical drag moves only the pane it started in, so the main viewport
      // takes no vertical delta while one is targeted.
      const divider = chartPanGestureState.paneDividerTarget.value;
      if (divider) {
        emitNativeGestureDebug(onDebugGestureEvent, `pan update divider dy=${formatNativeGestureDebugNumber(event.translationY)}`);
        // Preview only. Each pane was captured to its own bitmap on touch-down,
        // so the drag just moves those, entirely on the UI thread. The real
        // heights are committed once, on release.
        if (paneDividerBands) {
          paneDividerBands.value = resolveNativePaneDividerBands({ target: divider, translationY: event.translationY });
        }
        return;
      }
      if (crosshair?.visible.value) return;

      const pane = chartPanGestureState.indicatorPaneTarget.value;
      emitNativeGestureDebug(
        onDebugGestureEvent,
        `pan update dx=${formatNativeGestureDebugNumber(event.translationX)} dy=${formatNativeGestureDebugNumber(event.translationY)} pane=${pane?.id ?? 'main'}`,
      );
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
        emitNativeGestureDebug(onDebugGestureEvent, `pan end divider dy=${formatNativeGestureDebugNumber(event.translationY)}`);
        if (onPaneHeightsChange) {
          runOnJS(onPaneHeightsChange)(
            resolveNativePaneDividerHeights({ target: dividerTarget, translationY: event.translationY }),
          );
        }
        return;
      }
      if (crosshair?.visible.value) return;
      // Only when the drag actually moved vertically. A sideways pan through an
      // indicator pane must not silently pin its range against auto-scale.
      const pane = chartPanGestureState.indicatorPaneTarget.value;
      if (pane && onIndicatorPaneScale && pane.yMin !== pane.startYMin) {
        runOnJS(onIndicatorPaneScale)(pane.id, pane.yMin, pane.yMax);
      }
      const nextViewport = getNativeViewportGestureCommit(panActive, sharedViewport);
      if (!nextViewport) return;
      emitNativeGestureDebug(onDebugGestureEvent, 'pan end viewport commit');
      runOnJS(commitPanViewport)(nextViewport);
    })
    .onFinalize((_event, success) => {
      emitNativeGestureDebug(onDebugGestureEvent, `pan finalize success=${success ? 'yes' : 'no'}`);
      if (chartPanGestureState.paneDividerTarget.value) {
        chartPanGestureState.paneDividerTarget.value = null;
        if (onPaneDividerResizeEnd) runOnJS(onPaneDividerResizeEnd)(success);
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
  onDebugGestureEvent?: NativeGestureDebugEventHandler;
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
  onDebugGestureEvent,
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
    .onTouchesDown((event, stateManager) => {
      emitNativeGestureDebug(onDebugGestureEvent, `pinch down touches=${event.allTouches.length}`);
      if (pinchActive.value) return;
      if (
        bracketDragActive.value ||
        bracketDragInteractionState.active.value ||
        orderDragState.active.value ||
        priceScaleActive.value ||
        timeScaleActive.value
      ) {
        emitNativeGestureDebug(onDebugGestureEvent, 'pinch fail competing-active');
        stateManager.fail();
        return;
      }
      if (event.allTouches.length < 2) {
        emitNativeGestureDebug(onDebugGestureEvent, 'pinch wait second-touch');
        return;
      }
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
        emitNativeGestureDebug(onDebugGestureEvent, 'pinch fail hit-test');
        stateManager.fail();
        return;
      }

      const transitioningFromPan = panActive.value;
      emitNativeGestureDebug(
        onDebugGestureEvent,
        `pinch activate center=${formatNativeGestureDebugNumber(vector.centerX)},${formatNativeGestureDebugNumber(vector.centerY)} span=${formatNativeGestureDebugNumber(vector.spanX)},${formatNativeGestureDebugNumber(vector.spanY)} fromPan=${transitioningFromPan ? 'yes' : 'no'}`,
      );
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
      emitNativeGestureDebug(
        onDebugGestureEvent,
        `pinch move span=${formatNativeGestureDebugNumber(vector.spanX)},${formatNativeGestureDebugNumber(vector.spanY)}`,
      );
      updateNativeChartAxisPinchGestureState(
        chartAxisPinchGestureState,
        vector.centerX,
        vector.centerY,
        vector.spanX,
        vector.spanY,
        frame,
      );
    })
    .onTouchesUp((event, stateManager) => {
      if (!pinchActive.value) return;
      if ((event.numberOfTouches ?? event.allTouches.length) >= 2 && event.allTouches.length >= 2) return;
      const nextViewport = getNativeViewportGestureCommit(pinchActive, sharedViewport);
      if (nextViewport) {
        emitNativeGestureDebug(onDebugGestureEvent, 'pinch end commit');
        runOnJS(commitPanViewport)(nextViewport);
      }
      stateManager.end();
    })
    .onTouchesCancelled((_event, stateManager) => {
      emitNativeGestureDebug(onDebugGestureEvent, 'pinch cancelled');
      if (pinchActive.value) stateManager.fail();
    })
    .onFinalize((_event, success) => {
      emitNativeGestureDebug(onDebugGestureEvent, `pinch finalize success=${success ? 'yes' : 'no'}`);
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
  onDebugGestureEvent?: NativeGestureDebugEventHandler;
  onIndicatorPaneScale?: (paneId: string, yMin: number, yMax: number) => void;
  onIndicatorPaneScaleStart?: (paneId: string) => void;
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
  onDebugGestureEvent,
  onIndicatorPaneScale,
  onIndicatorPaneScaleStart,
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
    .onTouchesDown((event, stateManager) => {
      const point = getNativeTouchPoint(event);
      emitNativeGestureDebug(
        onDebugGestureEvent,
        `priceScale down touches=${event.allTouches.length} p=${formatNativeGestureDebugPoint(point)} axis=${formatNativeGestureDebugNumber(geometry.axisLeft)}-${formatNativeGestureDebugNumber(geometry.axisRight)}`,
      );
      if (priceScaleActive.value) return;
      if (!isNativeInitialSingleTouch(event)) {
        emitNativeGestureDebug(onDebugGestureEvent, `priceScale fail touches=${event.allTouches.length}`);
        stateManager.fail();
        return;
      }
      if (!point || isNativeReservedControlPoint({ controlZones, frame, resetViewVisible, x: point.x, y: point.y })) {
        emitNativeGestureDebug(onDebugGestureEvent, `priceScale fail reserved p=${formatNativeGestureDebugPoint(point)}`);
        stateManager.fail();
        return;
      }

      indicatorPane.value = null;
      if (canBeginNativePriceScaleGesture(geometry, point.x, point.y)) {
        emitNativeGestureDebug(onDebugGestureEvent, 'priceScale target main');
        return;
      }

      const pane = onIndicatorPaneScale ? getNativePriceAxisPaneAt(frame, point.x, point.y) : null;
      if (!pane || pane.type !== 'indicator' || !(pane.yMax > pane.yMin)) {
        emitNativeGestureDebug(onDebugGestureEvent, `priceScale fail no-pane p=${formatNativeGestureDebugPoint(point)}`);
        stateManager.fail();
        return;
      }
      emitNativeGestureDebug(onDebugGestureEvent, `priceScale target pane=${pane.id}`);
      if (onIndicatorPaneScaleStart) runOnJS(onIndicatorPaneScaleStart)(pane.id);
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
      if (indicatorPane.value) {
        emitNativeGestureDebug(onDebugGestureEvent, `priceScale begin pane=${indicatorPane.value.id}`);
        return;
      }
      emitNativeGestureDebug(onDebugGestureEvent, 'priceScale begin main');
      beginNativePriceScaleGestureState(priceScaleGestureState, event.y, geometry.plotTop, geometry.plotHeight);
      runOnJS(beginNativeViewportInteraction)();
    })
    .onUpdate((event) => {
      const pane = indicatorPane.value;
      if (pane) {
        emitNativeGestureDebug(onDebugGestureEvent, `priceScale update pane=${pane.id} dy=${formatNativeGestureDebugNumber(event.translationY)}`);
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
      emitNativeGestureDebug(onDebugGestureEvent, `priceScale update main dy=${formatNativeGestureDebugNumber(event.translationY)}`);
      updateNativePriceScaleGestureState(priceScaleGestureState, event.translationY);
    })
    .onEnd(() => {
      const pane = indicatorPane.value;
      if (pane) {
        emitNativeGestureDebug(onDebugGestureEvent, `priceScale end pane=${pane.id}`);
        if (onIndicatorPaneScale) runOnJS(onIndicatorPaneScale)(pane.id, pane.yMin, pane.yMax);
        return;
      }
      const nextViewport = getNativeViewportGestureCommit(priceScaleActive, sharedViewport);
      if (!nextViewport) return;
      emitNativeGestureDebug(onDebugGestureEvent, 'priceScale end main commit');
      runOnJS(commitPanViewport)(nextViewport);
    })
    .onFinalize((_event, success) => {
      emitNativeGestureDebug(onDebugGestureEvent, `priceScale finalize success=${success ? 'yes' : 'no'}`);
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
  onDebugGestureEvent?: NativeGestureDebugEventHandler;
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
  onDebugGestureEvent,
  sharedViewport,
  timeScaleActive,
  timeScaleGestureState,
}: NativeTimeScaleGestureInput) {
  if (!frame) return Gesture.Pan().enabled(false);
  const geometry = getNativeTimeScaleHitGeometry(frame);

  return Gesture.Pan()
    .minDistance(2)
    .onTouchesDown((event, stateManager) => {
      const point = getNativeTouchPoint(event);
      emitNativeGestureDebug(
        onDebugGestureEvent,
        `timeScale down touches=${event.allTouches.length} p=${formatNativeGestureDebugPoint(point)} y=${formatNativeGestureDebugNumber(geometry.axisTop)}-${formatNativeGestureDebugNumber(geometry.axisBottom)}`,
      );
      if (timeScaleActive.value) return;
      if (!isNativeInitialSingleTouch(event)) {
        emitNativeGestureDebug(onDebugGestureEvent, `timeScale fail touches=${event.allTouches.length}`);
        stateManager.fail();
        return;
      }
      if (
        !point ||
        isNativeReservedControlPoint({ controlZones, frame, resetViewVisible, x: point.x, y: point.y }) ||
        !canBeginNativeTimeScaleGesture(geometry, point.x, point.y)
      ) {
        emitNativeGestureDebug(onDebugGestureEvent, `timeScale fail hit=${formatNativeGestureDebugPoint(point)}`);
        stateManager.fail();
      }
    })
    .onBegin(() => {
      emitNativeGestureDebug(onDebugGestureEvent, 'timeScale begin');
      beginNativeTimeScaleGestureState(timeScaleGestureState);
      runOnJS(beginNativeViewportInteraction)();
    })
    .onUpdate((event) => {
      emitNativeGestureDebug(onDebugGestureEvent, `timeScale update dx=${formatNativeGestureDebugNumber(event.translationX)}`);
      updateNativeTimeScaleGestureState(timeScaleGestureState, event.translationX);
    })
    .onEnd(() => {
      const nextViewport = getNativeViewportGestureCommit(timeScaleActive, sharedViewport);
      if (!nextViewport) return;
      emitNativeGestureDebug(onDebugGestureEvent, 'timeScale end commit');
      runOnJS(commitPanViewport)(nextViewport);
    })
    .onFinalize((_event, success) => {
      emitNativeGestureDebug(onDebugGestureEvent, `timeScale finalize success=${success ? 'yes' : 'no'}`);
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
