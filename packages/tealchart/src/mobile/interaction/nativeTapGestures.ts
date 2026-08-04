import type { SharedValue } from 'react-native-reanimated';
import type { NativeChartFrame } from '../render/nativeChartFrame';
import type { NativeViewportSharedValues } from '../render/nativeSharedViewport';
import type { NativeLeftToolRailLayout } from '../utils/leftToolRailLayout';
import type {
  NativeTradeLineActionType,
  NativeTradeLineActionZone,
  NativeTradeLineObjectType,
  NativeTradeLineRow,
} from '../utils/tradeLineLayout';
import type { NativeCrosshairSharedValues } from './nativeCrosshair';
import type { NativeGestureControlZone } from './nativeGestureControlZones';

import { Gesture } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-worklets';

import { isNativeLeftToolRailToggleTap } from '../utils/leftToolRailLayout';
import { isNativeCrosshairContextMenuButtonTap } from './nativeCrosshairContextMenu';
import { isNativeGestureControlPoint } from './nativeGestureControlZones';
import {
  isNativeResetViewButtonTap,
  isNativeResetViewTapWithinTolerance,
  NATIVE_RESET_VIEW_HIT_SIZE,
  resolveNativeResetViewButtonLayout,
} from './nativeResetViewButton';
import { NATIVE_TAP_MAX_DISTANCE } from './nativeGestureThresholds';
import { findNativeTradeLineActionZone } from './nativeTradeLineHitTest';

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

export interface NativeResetViewTapGestureState {
  blockedByContextMenuButton: SharedValue<boolean>;
  startX: SharedValue<number>;
  startY: SharedValue<number>;
  startedOnButton: SharedValue<boolean>;
}

export interface NativeResetViewTapGestureInput {
  controlZones?: readonly NativeGestureControlZone[];
  crosshair?: NativeCrosshairSharedValues;
  frame: NativeChartFrame | null;
  hasContextMenu?: boolean;
  onResetViewTap: (x: number, y: number) => void;
  pricePrecision?: number;
  resetTapGestureState: NativeResetViewTapGestureState;
  resetButtonVisible?: boolean;
  sharedViewport?: NativeViewportSharedValues;
}

export function createNativeResetViewTapGesture({
  controlZones = [],
  crosshair,
  frame,
  hasContextMenu = false,
  onResetViewTap,
  pricePrecision = 2,
  resetTapGestureState,
  resetButtonVisible = false,
  sharedViewport,
}: NativeResetViewTapGestureInput) {
  if (!frame) return Gesture.Tap().enabled(false);
  return Gesture.Tap()
    .maxDistance(resetButtonVisible ? NATIVE_RESET_VIEW_HIT_SIZE / 2 : NATIVE_TAP_MAX_DISTANCE)
    .onTouchesDown((event) => {
      const touch = event.changedTouches?.[0] ?? event.allTouches?.[0];
      if (!touch) {
        resetTapGestureState.blockedByContextMenuButton.value = false;
        resetTapGestureState.startedOnButton.value = false;
        return;
      }
      resetTapGestureState.startX.value = touch.x;
      resetTapGestureState.startY.value = touch.y;
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
        resetButtonVisible &&
        isNativeResetViewButtonTap(resolveNativeResetViewButtonLayout(frame), touch.x, touch.y);
    })
    .onEnd((event, success) => {
      if (!success) return;
      if (resetTapGestureState.blockedByContextMenuButton.value) return;
      if (resetButtonVisible) {
        if (resetTapGestureState.startedOnButton.value) {
          if (!isNativeResetViewButtonTap(resolveNativeResetViewButtonLayout(frame), event.x, event.y)) return;
        } else if (
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
      }
      runOnJS(onResetViewTap)(event.x, event.y);
    });
}

export interface NativeUserDrawingTapGestureInput {
  controlZones?: readonly NativeGestureControlZone[];
  enabled: boolean;
  frame: NativeChartFrame | null;
  onDrawingTap: (x: number, y: number) => void;
}

export function createNativeUserDrawingTapGesture({
  controlZones = [],
  enabled,
  frame,
  onDrawingTap,
}: NativeUserDrawingTapGestureInput) {
  if (!frame || !enabled) return Gesture.Tap().enabled(false);
  return Gesture.Tap()
    .maxDistance(NATIVE_TAP_MAX_DISTANCE)
    .onEnd((event, success) => {
      if (!success) return;
      if (isNativeGestureControlPoint(controlZones, event.x, event.y)) return;
      runOnJS(onDrawingTap)(event.x, event.y);
    });
}

export interface NativeTradeLineActionTapGestureInput {
  bracketDragActive: SharedValue<boolean>;
  commitTradeLineAction: (
    objectType: NativeTradeLineObjectType,
    objectId: string,
    actionType: NativeTradeLineActionType,
  ) => void;
  controlZones?: readonly NativeGestureControlZone[];
  frame: NativeChartFrame | null;
  sharedViewport: NativeViewportSharedValues;
  tradeLabelHeight: number;
  tradeLineActionZones: SharedValue<NativeTradeLineActionZone[]>;
  tradeLineRows: SharedValue<NativeTradeLineRow[]>;
}

export function createNativeTradeLineActionTapGesture({
  bracketDragActive,
  commitTradeLineAction,
  controlZones = [],
  frame,
  sharedViewport,
  tradeLabelHeight,
  tradeLineActionZones,
  tradeLineRows,
}: NativeTradeLineActionTapGestureInput) {
  if (!frame) return Gesture.Tap().enabled(false);
  return Gesture.Tap()
    .maxDistance(NATIVE_TAP_MAX_DISTANCE)
    .onEnd((event, success) => {
      if (!success) return;
      if (bracketDragActive.value) return;
      if (isNativeGestureControlPoint(controlZones, event.x, event.y)) return;
      const zone = findNativeTradeLineActionZone({
        zones: tradeLineActionZones.value,
        rows: tradeLineRows.value,
        x: event.x,
        y: event.y,
        sharedViewport,
        frame,
        tradeLabelHeight,
      });
      if (!zone) return;
      runOnJS(commitTradeLineAction)(zone.objectType, zone.objectId, zone.actionType);
    });
}
