import type { GestureType, SimultaneousGesture } from 'react-native-gesture-handler';
import type { SharedValue } from 'react-native-reanimated';
import type { Viewport } from '../../types';
import type { NativeChartFrame } from '../render/nativeChartFrame';
import type { NativeViewportSharedValues } from '../render/nativeSharedViewport';
import type { NativeSelectedDrawingActionHitTarget } from '../render/NativeUserDrawingSelectionActionOverlay';
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
import type { NativeOverlayActionHitTarget } from './nativeOverlayActionGestures';
import type { NativeTapClaimSharedValues } from './nativeTapClaim';
import type {
  NativeChartAxisPinchGestureState,
  NativeChartPanGestureState,
  NativePriceScaleGestureState,
  NativeTimeScaleGestureState,
} from './nativeViewportGestureState';

import { useCallback, useEffect, useMemo, useRef } from 'react';

import { useSharedValue } from 'react-native-reanimated';

import { createNativeChartGesture } from './nativeChartGestures';
import {
  createNativeCrosshairContextMenuTapGesture,
  createNativeCrosshairLongPressGesture,
  createNativeCrosshairPanGesture,
  createNativeCrosshairTapGesture,
} from './nativeCrosshairGestures';
import { createNativeBracketDragGesture, createNativeOrderDragGesture } from './nativeOemsDragGestures';
import { createNativeOverlayActionTapGesture } from './nativeOverlayActionGestures';
import { createNativeSelectedDrawingActionTapGesture } from './nativeSelectedDrawingActionGestures';
import { claimNativeTap } from './nativeTapClaim';
import {
  createNativeLeftToolRailToggleTapGesture,
  createNativeResetViewTapGesture,
  createNativeTradeLineActionTapGesture,
  createNativeUserDrawingTapGesture,
} from './nativeTapGestures';
import { createNativeUserDrawingEditDragGesture } from './nativeUserDrawingEditGestures';
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
  drawingEditDragZones?: readonly NativeGestureControlZone[];
  drawingInputEnabled: boolean;
  drawingSelectionEnabled: boolean;
  frame: NativeChartFrame | null;
  hasContextMenu?: boolean;
  hasDataViewport: boolean;
  leftToolRailLayout: NativeLeftToolRailLayout | null;
  orderDragState: NativeOrderDragInteractionState;
  orderDragZones: SharedValue<NativeOrderDragZone[]>;
  onDrawingTap: (x: number, y: number) => void;
  onDrawingEditDragBegin: (x: number, y: number) => void;
  onDrawingEditDragEnd: () => void;
  onDrawingEditDragMove: (x: number, y: number) => void;
  onDrawingSelectionTap: (x: number, y: number, claimTap: () => void) => void;
  onLeftToolRailToggleTap: () => void;
  onContextMenuTap: Parameters<typeof createNativeCrosshairContextMenuTapGesture>[0]['onContextMenuTap'];
  onOverlayAction?: (command: unknown) => void;
  onSelectedDrawingAction: Parameters<typeof createNativeSelectedDrawingActionTapGesture>[0]['onAction'];
  onSelectedDrawingActionPopoverGroupChange: Parameters<
    typeof createNativeSelectedDrawingActionTapGesture
  >[0]['onPopoverGroupChange'];
  onResetViewTap: Parameters<typeof createNativeResetViewTapGesture>[0]['onResetViewTap'];
  panActive: SharedValue<boolean>;
  pinchActive: SharedValue<boolean>;
  pricePrecision: number;
  priceScaleActive: SharedValue<boolean>;
  overlayActionTargets?: readonly NativeOverlayActionHitTarget[];
  resetButtonVisible?: boolean;
  selectedDrawingActionTargets?: readonly NativeSelectedDrawingActionHitTarget[];
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
  drawingEditDragZones = [],
  drawingInputEnabled,
  drawingSelectionEnabled,
  frame,
  hasContextMenu = false,
  hasDataViewport,
  leftToolRailLayout,
  orderDragState,
  orderDragZones,
  onDrawingTap,
  onDrawingEditDragBegin,
  onDrawingEditDragEnd,
  onDrawingEditDragMove,
  onDrawingSelectionTap,
  onLeftToolRailToggleTap,
  onContextMenuTap,
  onOverlayAction = () => undefined,
  onSelectedDrawingAction,
  onSelectedDrawingActionPopoverGroupChange,
  onResetViewTap,
  panActive,
  pinchActive,
  pricePrecision,
  priceScaleActive,
  overlayActionTargets = [],
  resetButtonVisible = false,
  selectedDrawingActionTargets = [],
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
  const stableOnDrawingEditDragBegin = useLatestNativeCallback(onDrawingEditDragBegin);
  const stableOnDrawingEditDragEnd = useLatestNativeCallback(onDrawingEditDragEnd);
  const stableOnDrawingEditDragMove = useLatestNativeCallback(onDrawingEditDragMove);
  const stableOnDrawingSelectionTap = useLatestNativeCallback(onDrawingSelectionTap);
  const stableOnDrawingTap = useLatestNativeCallback(onDrawingTap);
  const stableOnLeftToolRailToggleTap = useLatestNativeCallback(onLeftToolRailToggleTap);
  const stableOnContextMenuTap = useLatestNativeCallback(onContextMenuTap);
  const stableOnOverlayAction = useLatestNativeCallback(onOverlayAction);
  const stableOnSelectedDrawingAction = useLatestNativeCallback(onSelectedDrawingAction);
  const stableOnSelectedDrawingActionPopoverGroupChange = useLatestNativeCallback(
    onSelectedDrawingActionPopoverGroupChange,
  );
  const stableOnResetViewTap = useLatestNativeCallback(onResetViewTap);
  const resetTapStartX = useSharedValue(0);
  const resetTapStartY = useSharedValue(0);
  const resetTapStartedOnButton = useSharedValue(false);
  const resetTapBlockedByContextMenuButton = useSharedValue(false);
  const tapClaimSequence = useSharedValue(0);
  const tapClaimClaimedSequence = useSharedValue(0);
  const tapClaim = useMemo<NativeTapClaimSharedValues>(
    () => ({
      claimedSequence: tapClaimClaimedSequence,
      sequence: tapClaimSequence,
    }),
    [tapClaimClaimedSequence, tapClaimSequence],
  );
  const claimTap = useCallback(() => {
    claimNativeTap(tapClaim);
  }, [tapClaim]);
  const drawingEditDragActive = useSharedValue(false);
  const handleDrawingSelectionTap = useCallback(
    (x: number, y: number) => {
      stableOnDrawingSelectionTap(x, y, claimTap);
    },
    [claimTap, stableOnDrawingSelectionTap],
  );
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
      tapClaim,
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
    tapClaim,
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
      controlZones,
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
    controlZones,
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
      controlZones,
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
    controlZones,
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
      controlZones,
      frame: chartInteractionFrame,
      sharedViewport,
      tradeLabelHeight,
      tradeLineActionZones,
      tradeLineRows,
    });
  }, [
    bracketDragInteractionState,
    chartInteractionFrame,
    controlZones,
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
      controlZones,
      frame: chartInteractionFrame,
      sharedViewport,
      tradeLabelHeight,
      tradeLineActionZones,
      tradeLineRows,
    });
  }, [
    bracketDragActive,
    chartInteractionFrame,
    controlZones,
    sharedViewport,
    stableCommitTradeLineAction,
    tradeLabelHeight,
    tradeLineActionZones,
    tradeLineRows,
  ]);

  const selectedDrawingActionTapGesture = useMemo<GestureType>(() => {
    return createNativeSelectedDrawingActionTapGesture({
      enabled: selectedDrawingActionTargets.length > 0,
      onAction: stableOnSelectedDrawingAction,
      onPopoverGroupChange: stableOnSelectedDrawingActionPopoverGroupChange,
      targets: selectedDrawingActionTargets,
    });
  }, [selectedDrawingActionTargets, stableOnSelectedDrawingAction, stableOnSelectedDrawingActionPopoverGroupChange]);

  const overlayActionTapGesture = useMemo<GestureType>(() => {
    return createNativeOverlayActionTapGesture({
      enabled: overlayActionTargets.length > 0,
      onAction: stableOnOverlayAction,
      targets: overlayActionTargets,
    });
  }, [overlayActionTargets, stableOnOverlayAction]);

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
      onDrawingTap: handleDrawingSelectionTap,
    });
  }, [controlZones, dataFrame, drawingSelectionEnabled, handleDrawingSelectionTap]);

  // Drag zones are recomputed from bar data, so they get a new identity on every
  // tick. Held as a shared value the worklet reads at touch time, they stay out
  // of the gesture's dependencies and no longer rebuild it several times a second.
  const drawingEditDragZonesShared = useSharedValue<readonly NativeGestureControlZone[]>(drawingEditDragZones);
  useEffect(() => {
    drawingEditDragZonesShared.value = drawingEditDragZones;
  }, [drawingEditDragZones, drawingEditDragZonesShared]);

  const drawingEditDragGesture = useMemo<GestureType>(() => {
    return createNativeUserDrawingEditDragGesture({
      controlZones,
      dragActive: drawingEditDragActive,
      dragZones: drawingEditDragZonesShared,
      enabled: drawingSelectionEnabled,
      frame: dataFrame,
      onBeginDrag: stableOnDrawingEditDragBegin,
      onEndDrag: stableOnDrawingEditDragEnd,
      onMoveDrag: stableOnDrawingEditDragMove,
    });
  }, [
    controlZones,
    dataFrame,
    drawingEditDragActive,
    drawingEditDragZonesShared,
    drawingSelectionEnabled,
    stableOnDrawingEditDragBegin,
    stableOnDrawingEditDragEnd,
    stableOnDrawingEditDragMove,
  ]);

  const leftToolRailToggleTapGesture = useMemo<GestureType>(() => {
    return createNativeLeftToolRailToggleTapGesture({
      leftToolRailLayout,
      onToggleCollapsed: stableOnLeftToolRailToggleTap,
    });
  }, [leftToolRailLayout, stableOnLeftToolRailToggleTap]);

  const resetViewTapGesture = useMemo<GestureType>(() => {
    return createNativeResetViewTapGesture({
      controlZones,
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
    controlZones,
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
      controlZones,
      frame: chartInteractionFrame,
      priceScaleActive,
      priceScaleGestureState,
      sharedViewport,
    });
  }, [
    chartInteractionFrame,
    controlZones,
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
      controlZones,
      frame: chartInteractionFrame,
      sharedViewport,
      timeScaleActive,
      timeScaleGestureState,
    });
  }, [
    chartInteractionFrame,
    controlZones,
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
        drawingEditDragGesture,
        drawingSelectionTapGesture,
        drawingTapGesture,
        leftToolRailToggleTapGesture,
        orderDragGesture,
        overlayActionTapGesture,
        priceScaleGesture,
        resetViewTapGesture,
        selectedDrawingActionTapGesture,
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
      drawingEditDragGesture,
      drawingSelectionTapGesture,
      drawingTapGesture,
      leftToolRailToggleTapGesture,
      orderDragGesture,
      overlayActionTapGesture,
      priceScaleGesture,
      resetViewTapGesture,
      selectedDrawingActionTapGesture,
      timeScaleGesture,
      tradeLineActionTapGesture,
    ],
  );

  return { nativeChartGesture };
}
