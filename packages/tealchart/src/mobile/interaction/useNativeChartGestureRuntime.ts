import type { GestureType, SimultaneousGesture } from 'react-native-gesture-handler';
import type { SharedValue } from 'react-native-reanimated';
import type { Viewport } from '../../types';
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
import type { NativeBracketDragInteractionState, NativeOrderDragInteractionState } from './nativeOemsDragState';
import type {
  NativeChartAxisPinchGestureState,
  NativeChartPanGestureState,
  NativePriceScaleGestureState,
  NativeTimeScaleGestureState,
} from './nativeViewportGestureState';

import { useCallback, useMemo, useRef } from 'react';

import { useSharedValue } from 'react-native-reanimated';

import { createNativeChartGesture } from './nativeChartGestures';
import {
  createNativeCrosshairContextMenuTapGesture,
  createNativeCrosshairLongPressGesture,
  createNativeCrosshairPanGesture,
  createNativeCrosshairTapGesture,
} from './nativeCrosshairGestures';
import { createNativeBracketDragGesture, createNativeOrderDragGesture } from './nativeOemsDragGestures';
import {
  createNativeLeftToolRailToggleTapGesture,
  createNativeResetViewTapGesture,
  createNativeTradeLineActionTapGesture,
  createNativeUserDrawingTapGesture,
} from './nativeTapGestures';
import {
  createNativeChartAxisPinchGesture,
  createNativeChartPanGesture,
  createNativePriceScaleGesture,
  createNativeTimeScaleGesture,
} from './nativeViewportGestures';

export interface NativeChartGestureRuntimeInput {
  beginNativeViewportInteraction: () => void;
  bracketDragActive: SharedValue<boolean>;
  bracketDragInteractionState: NativeBracketDragInteractionState;
  cancelNativeViewportInteraction: () => void;
  chartAxisPinchGestureState: NativeChartAxisPinchGestureState;
  chartPanGestureState: NativeChartPanGestureState;
  clearNativeBracketDrag: () => void;
  commitBracketMove: Parameters<typeof createNativeBracketDragGesture>[0]['commitBracketMove'];
  commitOrderMove: Parameters<typeof createNativeOrderDragGesture>[0]['commitOrderMove'];
  commitPanViewport: (nextViewport: Viewport) => void;
  commitTradeLineAction: (
    objectType: NativeTradeLineObjectType,
    objectId: string,
    actionType: NativeTradeLineActionType,
  ) => void;
  controlZones?: readonly NativeGestureControlZone[];
  crosshair: NativeCrosshairSharedValues;
  drawingInputEnabled: boolean;
  drawingSelectionEnabled: boolean;
  frame: NativeChartFrame | null;
  hasContextMenu?: boolean;
  hasDataViewport: boolean;
  leftToolRailLayout: NativeLeftToolRailLayout | null;
  orderDragState: NativeOrderDragInteractionState;
  orderDragZones: SharedValue<NativeOrderDragZone[]>;
  onDrawingTap: (x: number, y: number) => void;
  onDrawingSelectionTap: (x: number, y: number) => void;
  onLeftToolRailToggleTap: () => void;
  onContextMenuTap: Parameters<typeof createNativeCrosshairContextMenuTapGesture>[0]['onContextMenuTap'];
  onResetViewTap: Parameters<typeof createNativeResetViewTapGesture>[0]['onResetViewTap'];
  panActive: SharedValue<boolean>;
  pinchActive: SharedValue<boolean>;
  pricePrecision: number;
  priceScaleActive: SharedValue<boolean>;
  resetButtonVisible?: boolean;
  priceScaleGestureState: NativePriceScaleGestureState;
  sharedViewport: NativeViewportSharedValues;
  timeScaleActive: SharedValue<boolean>;
  timeScaleGestureState: NativeTimeScaleGestureState;
  tradeLabelHeight: number;
  tradeLineActionZones: SharedValue<NativeTradeLineActionZone[]>;
  tradeLineRows: SharedValue<NativeTradeLineRow[]>;
}

export interface NativeChartGestureRuntime {
  nativeChartGesture: SimultaneousGesture;
}

export function resolveNativeCrosshairInteractionFrame({
  dataFrame,
  drawingInputEnabled,
}: {
  dataFrame: NativeChartFrame | null;
  drawingInputEnabled: boolean;
}): NativeChartFrame | null {
  return drawingInputEnabled ? null : dataFrame;
}

function useLatestNativeCallback<T extends (...args: never[]) => void>(callback: T): T {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  return useCallback(
    ((...args: Parameters<T>) => {
      callbackRef.current(...args);
    }) as T,
    [],
  );
}

export function useNativeChartGestureRuntime({
  beginNativeViewportInteraction,
  bracketDragActive,
  bracketDragInteractionState,
  cancelNativeViewportInteraction,
  chartAxisPinchGestureState,
  chartPanGestureState,
  clearNativeBracketDrag,
  commitBracketMove,
  commitOrderMove,
  commitPanViewport,
  commitTradeLineAction,
  controlZones = [],
  crosshair,
  drawingInputEnabled,
  drawingSelectionEnabled,
  frame,
  hasContextMenu = false,
  hasDataViewport,
  leftToolRailLayout,
  orderDragState,
  orderDragZones,
  onDrawingTap,
  onDrawingSelectionTap,
  onLeftToolRailToggleTap,
  onContextMenuTap,
  onResetViewTap,
  panActive,
  pinchActive,
  pricePrecision,
  priceScaleActive,
  resetButtonVisible = false,
  priceScaleGestureState,
  sharedViewport,
  timeScaleActive,
  timeScaleGestureState,
  tradeLabelHeight,
  tradeLineActionZones,
  tradeLineRows,
}: NativeChartGestureRuntimeInput): NativeChartGestureRuntime {
  const stableBeginNativeViewportInteraction = useLatestNativeCallback(beginNativeViewportInteraction);
  const stableCancelNativeViewportInteraction = useLatestNativeCallback(cancelNativeViewportInteraction);
  const stableClearNativeBracketDrag = useLatestNativeCallback(clearNativeBracketDrag);
  const stableCommitBracketMove = useLatestNativeCallback(commitBracketMove);
  const stableCommitOrderMove = useLatestNativeCallback(commitOrderMove);
  const stableCommitPanViewport = useLatestNativeCallback(commitPanViewport);
  const stableCommitTradeLineAction = useLatestNativeCallback(commitTradeLineAction);
  const stableOnDrawingSelectionTap = useLatestNativeCallback(onDrawingSelectionTap);
  const stableOnDrawingTap = useLatestNativeCallback(onDrawingTap);
  const stableOnLeftToolRailToggleTap = useLatestNativeCallback(onLeftToolRailToggleTap);
  const stableOnContextMenuTap = useLatestNativeCallback(onContextMenuTap);
  const stableOnResetViewTap = useLatestNativeCallback(onResetViewTap);
  const resetTapStartX = useSharedValue(0);
  const resetTapStartY = useSharedValue(0);
  const resetTapStartedOnButton = useSharedValue(false);
  const resetTapBlockedByContextMenuButton = useSharedValue(false);
  const resetTapGestureState = useMemo(
    () => ({
      blockedByContextMenuButton: resetTapBlockedByContextMenuButton,
      startX: resetTapStartX,
      startY: resetTapStartY,
      startedOnButton: resetTapStartedOnButton,
    }),
    [resetTapBlockedByContextMenuButton, resetTapStartX, resetTapStartY, resetTapStartedOnButton],
  );
  const dataFrame = hasDataViewport ? frame : null;
  const chartInteractionFrame = drawingInputEnabled ? null : dataFrame;
  const crosshairInteractionFrame = resolveNativeCrosshairInteractionFrame({ dataFrame, drawingInputEnabled });
  const chartPanGesture = useMemo<GestureType>(() => {
    return createNativeChartPanGesture({
      beginNativeViewportInteraction: stableBeginNativeViewportInteraction,
      cancelNativeViewportInteraction: stableCancelNativeViewportInteraction,
      chartPanGestureState,
      commitPanViewport: stableCommitPanViewport,
      controlZones,
      crosshair,
      frame: chartInteractionFrame,
      orderDragZones,
      panActive,
      sharedViewport,
      tradeLabelHeight,
      tradeLineActionZones,
      tradeLineRows,
    });
  }, [
    chartPanGestureState,
    chartInteractionFrame,
    orderDragZones,
    panActive,
    sharedViewport,
    stableBeginNativeViewportInteraction,
    stableCancelNativeViewportInteraction,
    stableCommitPanViewport,
    controlZones,
    crosshair,
    tradeLabelHeight,
    tradeLineActionZones,
    tradeLineRows,
  ]);

  const crosshairTapGesture = useMemo<GestureType>(() => {
    return createNativeCrosshairTapGesture({
      controlZones,
      crosshair,
      frame: crosshairInteractionFrame,
      hasContextMenu,
      orderDragZones,
      pricePrecision,
      sharedViewport,
      tradeLabelHeight,
      tradeLineActionZones,
      tradeLineRows,
    });
  }, [
    controlZones,
    crosshairInteractionFrame,
    crosshair,
    hasContextMenu,
    orderDragZones,
    pricePrecision,
    sharedViewport,
    tradeLabelHeight,
    tradeLineActionZones,
    tradeLineRows,
  ]);

  const crosshairPanGesture = useMemo<GestureType>(() => {
    return createNativeCrosshairPanGesture({
      controlZones,
      crosshair,
      frame: crosshairInteractionFrame,
      hasContextMenu,
      orderDragZones,
      pricePrecision,
      sharedViewport,
      tradeLabelHeight,
      tradeLineActionZones,
      tradeLineRows,
    });
  }, [
    controlZones,
    crosshairInteractionFrame,
    crosshair,
    hasContextMenu,
    orderDragZones,
    pricePrecision,
    sharedViewport,
    tradeLabelHeight,
    tradeLineActionZones,
    tradeLineRows,
  ]);

  const crosshairLongPressGesture = useMemo<GestureType>(() => {
    return createNativeCrosshairLongPressGesture({
      controlZones,
      crosshair,
      frame: crosshairInteractionFrame,
      hasContextMenu,
      orderDragZones,
      pricePrecision,
      sharedViewport,
      tradeLabelHeight,
      tradeLineActionZones,
      tradeLineRows,
    });
  }, [
    controlZones,
    crosshairInteractionFrame,
    crosshair,
    hasContextMenu,
    orderDragZones,
    pricePrecision,
    sharedViewport,
    tradeLabelHeight,
    tradeLineActionZones,
    tradeLineRows,
  ]);

  const crosshairContextMenuTapGesture = useMemo<GestureType>(() => {
    return createNativeCrosshairContextMenuTapGesture({
      crosshair,
      frame: crosshairInteractionFrame,
      hasContextMenu,
      onContextMenuTap: stableOnContextMenuTap,
      pricePrecision,
      sharedViewport,
    });
  }, [crosshairInteractionFrame, crosshair, hasContextMenu, pricePrecision, sharedViewport, stableOnContextMenuTap]);

  const orderDragGesture = useMemo<GestureType>(() => {
    return createNativeOrderDragGesture({
      commitOrderMove: stableCommitOrderMove,
      frame: chartInteractionFrame,
      orderDragState,
      orderDragZones,
      sharedViewport,
      tradeLabelHeight,
      tradeLineActionZones,
      tradeLineRows,
    });
  }, [
    chartInteractionFrame,
    orderDragState,
    orderDragZones,
    sharedViewport,
    stableCommitOrderMove,
    tradeLabelHeight,
    tradeLineActionZones,
    tradeLineRows,
  ]);

  const chartAxisPinchGesture = useMemo<GestureType>(() => {
    return createNativeChartAxisPinchGesture({
      beginNativeViewportInteraction: stableBeginNativeViewportInteraction,
      bracketDragActive,
      bracketDragInteractionState,
      cancelNativeViewportInteraction: stableCancelNativeViewportInteraction,
      chartAxisPinchGestureState,
      commitPanViewport: stableCommitPanViewport,
      frame: chartInteractionFrame,
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
    });
  }, [
    bracketDragActive,
    bracketDragInteractionState,
    chartAxisPinchGestureState,
    chartInteractionFrame,
    orderDragState,
    orderDragZones,
    panActive,
    pinchActive,
    priceScaleActive,
    sharedViewport,
    stableBeginNativeViewportInteraction,
    stableCancelNativeViewportInteraction,
    stableCommitPanViewport,
    timeScaleActive,
    tradeLabelHeight,
    tradeLineActionZones,
    tradeLineRows,
  ]);

  const bracketDragGesture = useMemo<GestureType>(() => {
    return createNativeBracketDragGesture({
      bracketDragInteractionState,
      clearNativeBracketDrag: stableClearNativeBracketDrag,
      commitBracketMove: stableCommitBracketMove,
      frame: chartInteractionFrame,
      sharedViewport,
      tradeLabelHeight,
      tradeLineActionZones,
      tradeLineRows,
    });
  }, [
    bracketDragInteractionState,
    chartInteractionFrame,
    sharedViewport,
    stableClearNativeBracketDrag,
    stableCommitBracketMove,
    tradeLabelHeight,
    tradeLineActionZones,
    tradeLineRows,
  ]);

  const tradeLineActionTapGesture = useMemo<GestureType>(() => {
    return createNativeTradeLineActionTapGesture({
      bracketDragActive,
      commitTradeLineAction: stableCommitTradeLineAction,
      frame: chartInteractionFrame,
      sharedViewport,
      tradeLabelHeight,
      tradeLineActionZones,
      tradeLineRows,
    });
  }, [
    bracketDragActive,
    chartInteractionFrame,
    sharedViewport,
    stableCommitTradeLineAction,
    tradeLabelHeight,
    tradeLineActionZones,
    tradeLineRows,
  ]);

  const drawingTapGesture = useMemo<GestureType>(() => {
    return createNativeUserDrawingTapGesture({
      controlZones,
      enabled: drawingInputEnabled,
      frame: dataFrame,
      onDrawingTap: stableOnDrawingTap,
    });
  }, [controlZones, dataFrame, drawingInputEnabled, stableOnDrawingTap]);

  const drawingSelectionTapGesture = useMemo<GestureType>(() => {
    return createNativeUserDrawingTapGesture({
      controlZones,
      enabled: drawingSelectionEnabled,
      frame: dataFrame,
      onDrawingTap: stableOnDrawingSelectionTap,
    });
  }, [controlZones, dataFrame, drawingSelectionEnabled, stableOnDrawingSelectionTap]);

  const leftToolRailToggleTapGesture = useMemo<GestureType>(() => {
    return createNativeLeftToolRailToggleTapGesture({
      leftToolRailLayout,
      onToggleCollapsed: stableOnLeftToolRailToggleTap,
    });
  }, [leftToolRailLayout, stableOnLeftToolRailToggleTap]);

  const resetViewTapGesture = useMemo<GestureType>(() => {
    return createNativeResetViewTapGesture({
      crosshair,
      frame: chartInteractionFrame,
      hasContextMenu,
      onResetViewTap: stableOnResetViewTap,
      pricePrecision,
      resetTapGestureState,
      resetButtonVisible,
      sharedViewport,
    });
  }, [
    chartInteractionFrame,
    crosshair,
    hasContextMenu,
    pricePrecision,
    resetButtonVisible,
    resetTapGestureState,
    sharedViewport,
    stableOnResetViewTap,
  ]);

  const priceScaleGesture = useMemo<GestureType>(() => {
    return createNativePriceScaleGesture({
      beginNativeViewportInteraction: stableBeginNativeViewportInteraction,
      cancelNativeViewportInteraction: stableCancelNativeViewportInteraction,
      commitPanViewport: stableCommitPanViewport,
      frame: chartInteractionFrame,
      priceScaleActive,
      priceScaleGestureState,
      sharedViewport,
    });
  }, [
    chartInteractionFrame,
    priceScaleActive,
    priceScaleGestureState,
    sharedViewport,
    stableBeginNativeViewportInteraction,
    stableCancelNativeViewportInteraction,
    stableCommitPanViewport,
  ]);

  const timeScaleGesture = useMemo<GestureType>(() => {
    return createNativeTimeScaleGesture({
      beginNativeViewportInteraction: stableBeginNativeViewportInteraction,
      cancelNativeViewportInteraction: stableCancelNativeViewportInteraction,
      commitPanViewport: stableCommitPanViewport,
      frame: chartInteractionFrame,
      sharedViewport,
      timeScaleActive,
      timeScaleGestureState,
    });
  }, [
    chartInteractionFrame,
    sharedViewport,
    stableBeginNativeViewportInteraction,
    stableCancelNativeViewportInteraction,
    stableCommitPanViewport,
    timeScaleActive,
    timeScaleGestureState,
  ]);

  const nativeChartGesture = useMemo(
    () =>
      createNativeChartGesture({
        chartAxisPinchGesture,
        bracketDragGesture,
        chartPanGesture,
        crosshairContextMenuTapGesture,
        crosshairLongPressGesture,
        crosshairPanGesture,
        crosshairTapGesture,
        drawingSelectionTapGesture,
        drawingTapGesture,
        leftToolRailToggleTapGesture,
        orderDragGesture,
        priceScaleGesture,
        resetViewTapGesture,
        timeScaleGesture,
        tradeLineActionTapGesture,
      }),
    [
      chartAxisPinchGesture,
      bracketDragGesture,
      chartPanGesture,
      crosshairContextMenuTapGesture,
      crosshairLongPressGesture,
      crosshairPanGesture,
      crosshairTapGesture,
      drawingSelectionTapGesture,
      drawingTapGesture,
      leftToolRailToggleTapGesture,
      orderDragGesture,
      priceScaleGesture,
      resetViewTapGesture,
      timeScaleGesture,
      tradeLineActionTapGesture,
    ],
  );

  return { nativeChartGesture };
}
