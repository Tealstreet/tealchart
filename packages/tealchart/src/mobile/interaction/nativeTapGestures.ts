import type { SharedValue } from 'react-native-reanimated';
import type { NativeChartFrame } from '../render/nativeChartFrame';
import type { NativeViewportSharedValues } from '../render/nativeSharedViewport';
import type { NativeLeftToolRailLayout } from '../utils/leftToolRailLayout';
import type {
  NativeOrderDragZone,
  NativeTradeLineActionType,
  NativeTradeLineActionZone,
  NativeTradeLineObjectType,
  NativeTradeLineRow,
} from '../utils/tradeLineLayout';
import type { NativeCrosshairSharedValues } from './nativeCrosshair';
import type { NativeGestureControlZone } from './nativeGestureControlZones';

import { Gesture } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-worklets';

import { getNativePaneAtY } from '../render/nativeChartFrame';
import { isNativeLeftToolRailToggleTap } from '../utils/leftToolRailLayout';
import { resolveNativeCanvasTap } from './nativeCanvasTapResolver';
import { toggleNativeCrosshair } from './nativeCrosshair';
import {
  isNativeCrosshairContextMenuButtonTap,
  nativeCrosshairXToTime,
  nativeCrosshairYToPrice,
  resolveNativeCrosshairContextMenuButtonLayout,
  resolveNativeCrosshairPriceLabelText,
} from './nativeCrosshairContextMenu';
import { isNativeGestureControlPoint, isNativeReservedControlPoint } from './nativeGestureControlZones';
import {
  isNativeResetViewButtonTap,
  isNativeResetViewTapWithinTolerance,
  NATIVE_RESET_VIEW_HIT_SIZE,
  resolveNativeResetViewButtonLayout,
} from './nativeResetViewButton';
import { NATIVE_TAP_MAX_DISTANCE } from './nativeGestureThresholds';
import { findNativeTradeLineActionZone } from './nativeTradeLineHitTest';
import { canBeginNativePriceScaleGesture, getNativePriceScaleHitGeometry } from './nativeViewportGestureState';

export interface NativeCanvasTapGestureInput {
  bracketDragActive: SharedValue<boolean>;
  chartInteractionEnabled: boolean;
  commitTradeLineAction: (
    objectType: NativeTradeLineObjectType,
    objectId: string,
    actionType: NativeTradeLineActionType,
  ) => void;
  controlZones: readonly NativeGestureControlZone[];
  crosshair: NativeCrosshairSharedValues;
  resetViewVisible?: SharedValue<boolean>;
  drawingPlacementEnabled: boolean;
  drawingSelectionEnabled: boolean;
  frame: NativeChartFrame | null;
  hasContextMenu: boolean;
  onContextMenuTap: (time: number, price: number, anchorX: number, anchorY: number) => void;
  onDrawingPlacementTap: (x: number, y: number) => void;
  /** Calls `claim` when it takes the tap; otherwise the crosshair gets it. */
  onDrawingSelectionTap: (x: number, y: number, claim: () => void) => void;
  orderDragZones: SharedValue<NativeOrderDragZone[]>;
  pricePrecision: number;
  sharedViewport: NativeViewportSharedValues;
  tradeLabelHeight: number;
  tradeLineActionZones: SharedValue<NativeTradeLineActionZone[]>;
  tradeLineRows: SharedValue<NativeTradeLineRow[]>;
}

/**
 * The one gesture that owns a tap on the canvas.
 *
 * It replaces five that raced under `Gesture.Simultaneous`, each accepting
 * every tap and filtering inside its own `onEnd`. The point is resolved once
 * and exactly one outcome is dispatched, so the crosshair is the else-branch
 * rather than a competitor that has to be told to stand down.
 */
export function createNativeCanvasTapGesture({
  bracketDragActive,
  chartInteractionEnabled,
  commitTradeLineAction,
  controlZones,
  resetViewVisible,
  crosshair,
  drawingPlacementEnabled,
  drawingSelectionEnabled,
  frame,
  hasContextMenu,
  onContextMenuTap,
  onDrawingPlacementTap,
  onDrawingSelectionTap,
  orderDragZones,
  pricePrecision,
  sharedViewport,
  tradeLabelHeight,
  tradeLineActionZones,
  tradeLineRows,
}: NativeCanvasTapGestureInput) {
  if (!frame) return Gesture.Tap().enabled(false);

  const toggleCrosshairAt = (x: number, y: number) => {
    toggleNativeCrosshair(crosshair, frame, x, y);
  };

  // Drawing hit-testing happens on the JS thread inside the consumer's handler,
  // so ownership cannot be settled with the rest. Offering the tap and falling
  // through is still a guarantee rather than an opt-in: the crosshair fires
  // unless the drawing system actually claims, and no caller can forget to
  // participate because the fallback lives here, not in them.
  const offerToDrawings = (x: number, y: number) => {
    if (drawingPlacementEnabled) {
      onDrawingPlacementTap(x, y);
      return;
    }
    let claimed = false;
    onDrawingSelectionTap(x, y, () => {
      claimed = true;
    });
    setTimeout(() => {
      if (claimed) return;
      toggleCrosshairAt(x, y);
    }, 0);
  };

  return Gesture.Tap()
    .maxDistance(NATIVE_TAP_MAX_DISTANCE)
    .onEnd((event, success) => {
      if (!success) return;
      const outcome = resolveNativeCanvasTap(
        { x: event.x, y: event.y },
        {
          bracketDragActive: bracketDragActive.value,
          chartInteractionEnabled,
          controlZones,
          resetViewVisible,
          crosshairVisible: crosshair.visible.value,
          crosshairY: crosshair.y.value,
          drawingTapEnabled: drawingPlacementEnabled || drawingSelectionEnabled,
          frame,
          hasContextMenu,
          orderDragZones: orderDragZones.value,
          pricePrecision,
          sharedViewport,
          tradeLabelHeight,
          tradeLineActionZones: tradeLineActionZones.value,
          tradeLineRows: tradeLineRows.value,
        },
      );

      if (outcome.kind === 'none') return;
      if (outcome.kind === 'tradeLineAction') {
        runOnJS(commitTradeLineAction)(outcome.objectType, outcome.objectId, outcome.actionType);
        return;
      }
      if (outcome.kind === 'crosshairContextMenu') {
        // The menu opens at the crosshair, not at the finger.
        const time = nativeCrosshairXToTime(crosshair.x.value, sharedViewport, frame);
        const price = nativeCrosshairYToPrice(crosshair.y.value, sharedViewport, frame);
        const layout = resolveNativeCrosshairContextMenuButtonLayout(
          frame,
          crosshair.y.value,
          pricePrecision,
          resolveNativeCrosshairPriceLabelText(frame, sharedViewport, crosshair.y.value, pricePrecision),
        );
        runOnJS(onContextMenuTap)(time, price, layout.centerX, layout.centerY);
        return;
      }
      if (outcome.kind === 'drawingThenCrosshair') {
        runOnJS(offerToDrawings)(event.x, event.y);
        return;
      }
      runOnJS(toggleCrosshairAt)(event.x, event.y);
    });
}

export interface NativeLeftToolRailToggleTapGestureInput {
  leftToolRailLayout: NativeLeftToolRailLayout | null;
  onToggleCollapsed: () => void;
}

export function createNativeLeftToolRailToggleTapGesture({
  leftToolRailLayout,
  onToggleCollapsed,
}: NativeLeftToolRailToggleTapGestureInput) {
  if (!leftToolRailLayout) return Gesture.Tap().enabled(false);
  return Gesture.Tap()
    .maxDistance(NATIVE_TAP_MAX_DISTANCE)
    .onEnd((event, success) => {
      if (!success) return;
      if (!isNativeLeftToolRailToggleTap(leftToolRailLayout, event.x, event.y)) return;
      runOnJS(onToggleCollapsed)();
    });
}

export interface NativePriceAxisResetTapGestureInput {
  controlZones?: readonly NativeGestureControlZone[];
  resetViewVisible?: SharedValue<boolean>;
  frame: NativeChartFrame | null;
  onResetView: () => void;
}

/**
 * Double tap the price axis to reset the view — the same outcome as the reset
 * button, reached from the axis the user was just scaling.
 *
 * Deliberately the same hit geometry the price-scale drag uses, so the two
 * cannot disagree about where the axis is. The drag itself needs movement to
 * activate, and the axis is outside the crosshair's region, so nothing else
 * claims these taps.
 */
export function createNativePriceAxisResetTapGesture({
  controlZones = [],
  resetViewVisible,
  frame,
  onResetView,
}: NativePriceAxisResetTapGestureInput) {
  if (!frame) return Gesture.Tap().enabled(false);
  const geometry = getNativePriceScaleHitGeometry(frame);

  return Gesture.Tap()
    .numberOfTaps(2)
    .maxDistance(NATIVE_TAP_MAX_DISTANCE)
    .onEnd((event, success) => {
      if (!success) return;
      if (isNativeReservedControlPoint({ controlZones, frame, resetViewVisible, x: event.x, y: event.y })) return;
      if (!canBeginNativePriceScaleGesture(geometry, event.x, event.y)) return;
      runOnJS(onResetView)();
    });
}

export interface NativePaneMaximizeTapGestureInput {
  controlZones?: readonly NativeGestureControlZone[];
  resetViewVisible?: SharedValue<boolean>;
  frame: NativeChartFrame | null;
  onTogglePaneMaximize: (paneId: string) => void;
}

/**
 * Double tap a pane to blow it up to the whole canvas, tap again to put the
 * panes back - web's `onPaneDoubleClick`, which native never had.
 *
 * Only armed with a second pane on screen, so a plain chart's taps are left
 * entirely to the crosshair.
 */
export function createNativePaneMaximizeTapGesture({
  controlZones = [],
  resetViewVisible,
  frame,
  onTogglePaneMaximize,
}: NativePaneMaximizeTapGestureInput) {
  if (!frame || frame.panes.length <= 1) return Gesture.Tap().enabled(false);

  return Gesture.Tap()
    .numberOfTaps(2)
    .maxDistance(NATIVE_TAP_MAX_DISTANCE)
    .onEnd((event, success) => {
      if (!success) return;
      if (isNativeReservedControlPoint({ controlZones, frame, resetViewVisible, x: event.x, y: event.y })) return;
      if (event.x < frame.contentLeft || event.x >= frame.priceAxisHitLeft) return;
      const pane = getNativePaneAtY(frame, event.y);
      if (!pane) return;
      runOnJS(onTogglePaneMaximize)(pane.id);
    });
}

export interface NativeResetViewTapGestureState {
  blockedByContextMenuButton: SharedValue<boolean>;
  maxTravel: SharedValue<number>;
  startX: SharedValue<number>;
  startY: SharedValue<number>;
  startedOnButton: SharedValue<boolean>;
}

export interface NativeResetViewTapGestureInput {
  controlZones?: readonly NativeGestureControlZone[];
  resetViewVisible?: SharedValue<boolean>;
  crosshair?: NativeCrosshairSharedValues;
  frame: NativeChartFrame | null;
  hasContextMenu?: boolean;
  onResetViewTap: (x: number, y: number) => void;
  pricePrecision?: number;
  resetTapGestureState: NativeResetViewTapGestureState;
  sharedViewport?: NativeViewportSharedValues;
}

export function createNativeResetViewTapGesture({
  controlZones = [],
  resetViewVisible,
  crosshair,
  frame,
  hasContextMenu = false,
  onResetViewTap,
  pricePrecision = 2,
  resetTapGestureState,
  sharedViewport,
}: NativeResetViewTapGestureInput) {
  if (!frame) return Gesture.Tap().enabled(false);
  return Gesture.Tap()
    // Visibility is a shared value, and `maxDistance` is gesture config that
    // cannot read one, so the permissive bound is always in force and the
    // travel a hidden button demands is enforced in the handlers instead.
    .maxDistance(NATIVE_RESET_VIEW_HIT_SIZE / 2)
    .onTouchesDown((event) => {
      const touch = event.changedTouches?.[0] ?? event.allTouches?.[0];
      resetTapGestureState.maxTravel.value = 0;
      if (!touch) {
        resetTapGestureState.blockedByContextMenuButton.value = false;
        resetTapGestureState.startedOnButton.value = false;
        return;
      }
      resetTapGestureState.startX.value = touch.x;
      resetTapGestureState.startY.value = touch.y;
      const buttonVisible = resetViewVisible?.value === true;
      // The button's own circle is resolved from the frame by the gestures that
      // must yield to it, so this gesture only has to check foreign zones.
      if (isNativeGestureControlPoint(controlZones, touch.x, touch.y)) {
        resetTapGestureState.blockedByContextMenuButton.value = true;
        resetTapGestureState.startedOnButton.value = false;
        return;
      }
      resetTapGestureState.blockedByContextMenuButton.value = Boolean(
        hasContextMenu &&
        crosshair?.visible.value &&
        isNativeCrosshairContextMenuButtonTap({
          frame,
          crosshairY: crosshair.y.value,
          pricePrecision,
          sharedViewport,
          x: touch.x,
          y: touch.y,
        }),
      );
      resetTapGestureState.startedOnButton.value =
        !resetTapGestureState.blockedByContextMenuButton.value &&
        buttonVisible &&
        isNativeResetViewButtonTap(resolveNativeResetViewButtonLayout(frame), touch.x, touch.y);
    })
    // `maxDistance` used to enforce this continuously. It measures travel, not
    // displacement, so without it a flick that returns to where it started
    // would read as a tap and reveal the button.
    .onTouchesMove((event) => {
      const touch = event.changedTouches?.[0] ?? event.allTouches?.[0];
      if (!touch) return;
      const dx = touch.x - resetTapGestureState.startX.value;
      const dy = touch.y - resetTapGestureState.startY.value;
      resetTapGestureState.maxTravel.value = Math.max(
        resetTapGestureState.maxTravel.value,
        Math.sqrt(dx * dx + dy * dy),
      );
    })
    .onEnd((event, success) => {
      if (!success) return;
      if (resetTapGestureState.blockedByContextMenuButton.value) return;
      if (resetTapGestureState.startedOnButton.value) {
        if (!isNativeResetViewButtonTap(resolveNativeResetViewButtonLayout(frame), event.x, event.y)) return;
      } else if (
        resetTapGestureState.maxTravel.value > NATIVE_TAP_MAX_DISTANCE ||
        !isNativeResetViewTapWithinTolerance(
          resetTapGestureState.startX.value,
          resetTapGestureState.startY.value,
          event.x,
          event.y,
          NATIVE_TAP_MAX_DISTANCE,
        )
      ) {
        return;
      }
      runOnJS(onResetViewTap)(event.x, event.y);
    });
}

