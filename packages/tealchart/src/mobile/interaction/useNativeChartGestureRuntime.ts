import type { GestureType } from 'react-native-gesture-handler';
import type { SharedValue } from 'react-native-reanimated';
import type { Viewport } from '../../types';
import type { NativePaneDividerBand, NativePaneHeight } from './nativePaneDivider';
import type { NativeChartFrame } from '../render/nativeChartFrame';
import type { NativePaneRangeOverrides } from '../render/nativePaneRangeOverride';
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
import type {
  NativeChartAxisPinchGestureState,
  NativeChartPanGestureState,
  NativeGestureDebugEventHandler,
  NativePriceScaleGestureState,
  NativeTimeScaleGestureState,
} from './nativeViewportGestureState';

import { useCallback, useEffect, useMemo, useRef } from 'react';

import { useSharedValue } from 'react-native-reanimated';

import { createNativeChartGesture, type NativeChartGesture } from './nativeChartGestures';
import {
  createNativeCrosshairLongPressGesture,
  createNativeCrosshairPanGesture,
} from './nativeCrosshairGestures';
import { createNativeBracketDragGesture, createNativeOrderDragGesture } from './nativeOemsDragGestures';
import { createNativeOverlayActionTapGesture } from './nativeOverlayActionGestures';
import { createNativeSelectedDrawingActionTapGesture } from './nativeSelectedDrawingActionGestures';
import {
  createNativeCanvasTapGesture,
  createNativeLeftToolRailToggleTapGesture,
  createNativePaneMaximizeTapGesture,
  createNativePriceAxisResetTapGesture,
  createNativeResetViewTapGesture,
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
  intervalMs: number;
  leftToolRailLayout: NativeLeftToolRailLayout | null;
  onDebugGestureEvent?: NativeGestureDebugEventHandler;
  orderDragState: NativeOrderDragInteractionState;
  orderDragZones: SharedValue<NativeOrderDragZone[]>;
  onDrawingTap: (x: number, y: number) => void;
  onIndicatorPaneScale?: (paneId: string, yMin: number, yMax: number) => void;
  onIndicatorPaneScaleStart?: (paneId: string) => void;
  onPaneDividerResizeEnd?: (success: boolean) => void;
  onPaneDividerResizeStart?: () => void;
  onPaneHeightsChange?: (heights: NativePaneHeight[]) => void;
  paneDividerBands?: SharedValue<NativePaneDividerBand[]>;
  paneRangeOverrides?: SharedValue<NativePaneRangeOverrides>;
  onDrawingEditDragBegin: (x: number, y: number) => void;
  onDrawingEditDragEnd: () => void;
  onDrawingEditDragMove: (x: number, y: number) => void;
  onDrawingSelectionTap: (x: number, y: number, claimTap: () => void) => void;
  onLeftToolRailToggleTap: () => void;
  onContextMenuTap: Parameters<typeof createNativeCanvasTapGesture>[0]['onContextMenuTap'];
  onSelectTradeLine: Parameters<typeof createNativeCanvasTapGesture>[0]['onSelectTradeLine'];
  onClearTradeLineSelection: Parameters<typeof createNativeCanvasTapGesture>[0]['onClearTradeLineSelection'];
  onOverlayAction?: (command: unknown) => void;
  onSelectedDrawingAction: Parameters<typeof createNativeSelectedDrawingActionTapGesture>[0]['onAction'];
  onSelectedDrawingActionPopoverGroupChange: Parameters<
    typeof createNativeSelectedDrawingActionTapGesture
  >[0]['onPopoverGroupChange'];
  onPriceAxisResetTap: () => void;
  onTogglePaneMaximize?: (paneId: string) => void;
  onResetViewTap: Parameters<typeof createNativeResetViewTapGesture>[0]['onResetViewTap'];
  panActive: SharedValue<boolean>;
  pinchActive: SharedValue<boolean>;
  pricePrecision: number;
  priceScaleActive: SharedValue<boolean>;
  overlayActionTargets?: readonly NativeOverlayActionHitTarget[];
  resetViewVisible?: SharedValue<boolean>;
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
  nativeChartGesture: NativeChartGesture;
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

const noopNativeIndicatorPaneScale = (_paneId: string, _yMin: number, _yMax: number) => undefined;
const noopNativePaneHeightsChange = (_heights: NativePaneHeight[]) => undefined;
const noopNativePaneDividerResize = () => undefined;

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
  intervalMs,
  leftToolRailLayout,
  onDebugGestureEvent,
  orderDragState,
  orderDragZones,
  onDrawingTap,
  onIndicatorPaneScale,
  onIndicatorPaneScaleStart,
  onPaneDividerResizeEnd,
  onPaneDividerResizeStart,
  onPaneHeightsChange,
  paneDividerBands,
  paneRangeOverrides,
  onDrawingEditDragBegin,
  onDrawingEditDragEnd,
  onDrawingEditDragMove,
  onDrawingSelectionTap,
  onLeftToolRailToggleTap,
  onContextMenuTap,
  onSelectTradeLine,
  onClearTradeLineSelection,
  onOverlayAction = () => undefined,
  onSelectedDrawingAction,
  onSelectedDrawingActionPopoverGroupChange,
  onPriceAxisResetTap,
  onTogglePaneMaximize = () => undefined,
  onResetViewTap,
  panActive,
  pinchActive,
  pricePrecision,
  priceScaleActive,
  overlayActionTargets = [],
  resetViewVisible,
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
  const stableOnDebugGestureEvent = useLatestNativeCallback(onDebugGestureEvent ?? (() => undefined));
  const stableOnIndicatorPaneScale = useLatestNativeCallback(onIndicatorPaneScale ?? noopNativeIndicatorPaneScale);
  const stableOnIndicatorPaneScaleStart = useLatestNativeCallback(onIndicatorPaneScaleStart ?? (() => undefined));
  const stableOnPaneHeightsChange = useLatestNativeCallback(onPaneHeightsChange ?? noopNativePaneHeightsChange);
  const stableOnPaneDividerResizeStart = useLatestNativeCallback(onPaneDividerResizeStart ?? noopNativePaneDividerResize);
  const stableOnPaneDividerResizeEnd = useLatestNativeCallback(onPaneDividerResizeEnd ?? noopNativePaneDividerResize);
  const stableOnLeftToolRailToggleTap = useLatestNativeCallback(onLeftToolRailToggleTap);
  const stableOnContextMenuTap = useLatestNativeCallback(onContextMenuTap);
  const stableOnOverlayAction = useLatestNativeCallback(onOverlayAction);
  const stableOnSelectedDrawingAction = useLatestNativeCallback(onSelectedDrawingAction);
  const stableOnSelectedDrawingActionPopoverGroupChange = useLatestNativeCallback(
    onSelectedDrawingActionPopoverGroupChange,
  );
  const stableOnPriceAxisResetTap = useLatestNativeCallback(onPriceAxisResetTap);
  const stableOnTogglePaneMaximize = useLatestNativeCallback(onTogglePaneMaximize);
  const stableOnResetViewTap = useLatestNativeCallback(onResetViewTap);
  const resetTapStartX = useSharedValue(0);
  const resetTapStartY = useSharedValue(0);
  const resetTapStartedOnButton = useSharedValue(false);
  const resetTapBlockedByContextMenuButton = useSharedValue(false);
  const resetTapMaxTravel = useSharedValue(0);
  const drawingCrosshairFallbackSuppressedUntilMs = useSharedValue(0);
  const paneMaximizeCrosshairSnapshotActive = useSharedValue(false);
  const paneMaximizeCrosshairSnapshotVisible = useSharedValue(false);
  const paneMaximizeCrosshairSnapshotX = useSharedValue(0);
  const paneMaximizeCrosshairSnapshotY = useSharedValue(0);
  const drawingEditDragActive = useSharedValue(false);
  const handleDrawingSelectionTap = useCallback(
    (x: number, y: number, claim: () => void) => {
      stableOnDrawingSelectionTap(x, y, claim);
    },
    [stableOnDrawingSelectionTap],
  );
  const resetTapGestureState = useMemo(
    () => ({
      blockedByContextMenuButton: resetTapBlockedByContextMenuButton,
      maxTravel: resetTapMaxTravel,
      startX: resetTapStartX,
      startY: resetTapStartY,
      startedOnButton: resetTapStartedOnButton,
    }),
    [
      resetTapBlockedByContextMenuButton,
      resetTapMaxTravel,
      resetTapStartX,
      resetTapStartY,
      resetTapStartedOnButton,
    ],
  );
  const dataFrame = hasDataViewport ? frame : null;
  const chartInteractionFrame = drawingInputEnabled ? null : dataFrame;
  const crosshairInteractionFrame = resolveNativeCrosshairInteractionFrame({ dataFrame, drawingInputEnabled });
  const chartPanGesture = useMemo<GestureType>(() => {
    return createNativeChartPanGesture({
      beginNativeViewportInteraction: stableBeginNativeViewportInteraction,
      cancelNativeViewportInteraction: stableCancelNativeViewportInteraction,
      chartPanGestureState,
      onIndicatorPaneScale: stableOnIndicatorPaneScale,
      onIndicatorPaneScaleStart: stableOnIndicatorPaneScaleStart,
      onPaneHeightsChange: stableOnPaneHeightsChange,
      onPaneDividerResizeStart: stableOnPaneDividerResizeStart,
      onPaneDividerResizeEnd: stableOnPaneDividerResizeEnd,
      paneDividerBands,
      paneRangeOverrides,
      commitPanViewport: stableCommitPanViewport,
      controlZones,
      resetViewVisible,
      crosshair,
      frame: chartInteractionFrame,
      onDebugGestureEvent: stableOnDebugGestureEvent,
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
    stableOnIndicatorPaneScaleStart,
    stableOnPaneHeightsChange,
    stableOnPaneDividerResizeStart,
    stableOnPaneDividerResizeEnd,
    stableOnDebugGestureEvent,
    paneDividerBands,
    stableCommitPanViewport,
    controlZones,
    resetViewVisible,
    crosshair,
    tradeLabelHeight,
    tradeLineActionZones,
    tradeLineRows,
  ]);

  // One gesture owns the canvas tap. It replaces the crosshair tap, the
  // crosshair context-menu tap, the trade-line action tap and both drawing
  // taps, which used to race under Gesture.Simultaneous and each decide for
  // themselves whether the tap was theirs.
  const paneMaximizeTapGesture = useMemo<GestureType>(() => {
    return createNativePaneMaximizeTapGesture({
      bracketDragActive,
      chartInteractionEnabled: !drawingInputEnabled,
      controlZones,
      crosshair,
      drawingCrosshairFallbackSuppressedUntilMs,
      paneMaximizeCrosshairSnapshotActive,
      paneMaximizeCrosshairSnapshotVisible,
      paneMaximizeCrosshairSnapshotX,
      paneMaximizeCrosshairSnapshotY,
      drawingTapEnabled: drawingInputEnabled || drawingSelectionEnabled,
      frame: chartInteractionFrame,
      hasContextMenu,
      onTogglePaneMaximize: stableOnTogglePaneMaximize,
      orderDragZones,
      pricePrecision,
      resetViewVisible,
      sharedViewport,
      tradeLabelHeight,
      tradeLineActionZones,
      tradeLineRows,
    });
  }, [
    bracketDragActive,
    chartInteractionFrame,
    controlZones,
    crosshair,
    drawingCrosshairFallbackSuppressedUntilMs,
    paneMaximizeCrosshairSnapshotActive,
    paneMaximizeCrosshairSnapshotVisible,
    paneMaximizeCrosshairSnapshotX,
    paneMaximizeCrosshairSnapshotY,
    drawingInputEnabled,
    drawingSelectionEnabled,
    hasContextMenu,
    orderDragZones,
    pricePrecision,
    resetViewVisible,
    sharedViewport,
    stableOnTogglePaneMaximize,
    tradeLabelHeight,
    tradeLineActionZones,
    tradeLineRows,
  ]);

  const canvasTapGesture = useMemo<GestureType>(() => {
    return createNativeCanvasTapGesture({
      bracketDragActive,
      chartInteractionEnabled: !drawingInputEnabled,
      commitTradeLineAction: stableCommitTradeLineAction,
      controlZones,
      resetViewVisible,
      crosshair,
      drawingCrosshairFallbackSuppressedUntilMs,
      drawingPlacementEnabled: drawingInputEnabled,
      drawingSelectionEnabled,
      frame: dataFrame,
      hasContextMenu,
      intervalMs,
      onContextMenuTap: stableOnContextMenuTap,
      onDrawingPlacementTap: stableOnDrawingTap,
      onDrawingSelectionTap: stableOnDrawingSelectionTap,
      onSelectTradeLine,
      onClearTradeLineSelection,
      orderDragZones,
      pricePrecision,
      sharedViewport,
      tradeLabelHeight,
      tradeLineActionZones,
      tradeLineRows,
    });
  }, [
    bracketDragActive,
    controlZones,
    resetViewVisible,
    crosshair,
    drawingCrosshairFallbackSuppressedUntilMs,
    dataFrame,
    drawingInputEnabled,
    drawingSelectionEnabled,
    hasContextMenu,
    intervalMs,
    orderDragZones,
    pricePrecision,
    sharedViewport,
    stableCommitTradeLineAction,
    stableOnContextMenuTap,
    stableOnDrawingSelectionTap,
    stableOnDrawingTap,
    onSelectTradeLine,
    onClearTradeLineSelection,
    tradeLabelHeight,
    tradeLineActionZones,
    tradeLineRows,
  ]);

  const crosshairPanGesture = useMemo<GestureType>(() => {
    return createNativeCrosshairPanGesture({
      controlZones,
      resetViewVisible,
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
    resetViewVisible,
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
      resetViewVisible,
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
    resetViewVisible,
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

  const orderDragGesture = useMemo<GestureType>(() => {
    return createNativeOrderDragGesture({
      commitOrderMove: stableCommitOrderMove,
      onSelectTradeLine,
      controlZones,
      resetViewVisible,
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
    resetViewVisible,
    orderDragState,
    orderDragZones,
    onSelectTradeLine,
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
      resetViewVisible,
      frame: chartInteractionFrame,
      onDebugGestureEvent: stableOnDebugGestureEvent,
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
    resetViewVisible,
    orderDragState,
    orderDragZones,
    panActive,
    pinchActive,
    priceScaleActive,
    sharedViewport,
    stableBeginNativeViewportInteraction,
    stableCancelNativeViewportInteraction,
    stableCommitPanViewport,
    stableOnDebugGestureEvent,
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
      onSelectTradeLine,
      controlZones,
      resetViewVisible,
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
    resetViewVisible,
    onSelectTradeLine,
    sharedViewport,
    stableClearNativeBracketDrag,
    stableCommitBracketMove,
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
      resetViewVisible,
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
    resetViewVisible,
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
      resetViewVisible,
      crosshair,
      frame: chartInteractionFrame,
      hasContextMenu,
      onResetViewTap: stableOnResetViewTap,
      pricePrecision,
      resetTapGestureState,
      sharedViewport,
    });
  }, [
    chartInteractionFrame,
    controlZones,
    crosshair,
    hasContextMenu,
    pricePrecision,
    resetTapGestureState,
    resetViewVisible,
    sharedViewport,
    stableOnResetViewTap,
  ]);

  const priceAxisResetTapGesture = useMemo<GestureType>(() => {
    return createNativePriceAxisResetTapGesture({
      controlZones,
      resetViewVisible,
      frame: chartInteractionFrame,
      onResetView: stableOnPriceAxisResetTap,
    });
  }, [chartInteractionFrame, controlZones, stableOnPriceAxisResetTap]);

  const priceScaleGesture = useMemo<GestureType>(() => {
    return createNativePriceScaleGesture({
      beginNativeViewportInteraction: stableBeginNativeViewportInteraction,
      cancelNativeViewportInteraction: stableCancelNativeViewportInteraction,
      commitPanViewport: stableCommitPanViewport,
      controlZones,
      resetViewVisible,
      frame: chartInteractionFrame,
      onDebugGestureEvent: stableOnDebugGestureEvent,
      onIndicatorPaneScale: stableOnIndicatorPaneScale,
      onIndicatorPaneScaleStart: stableOnIndicatorPaneScaleStart,
      paneRangeOverrides,
      priceScaleActive,
      priceScaleGestureState,
      sharedViewport,
    });
  }, [
    chartInteractionFrame,
    controlZones,
    resetViewVisible,
    paneRangeOverrides,
    priceScaleActive,
    priceScaleGestureState,
    sharedViewport,
    stableBeginNativeViewportInteraction,
    stableCancelNativeViewportInteraction,
    stableCommitPanViewport,
    stableOnDebugGestureEvent,
    stableOnIndicatorPaneScale,
    stableOnIndicatorPaneScaleStart,
  ]);

  const timeScaleGesture = useMemo<GestureType>(() => {
    return createNativeTimeScaleGesture({
      beginNativeViewportInteraction: stableBeginNativeViewportInteraction,
      cancelNativeViewportInteraction: stableCancelNativeViewportInteraction,
      commitPanViewport: stableCommitPanViewport,
      controlZones,
      resetViewVisible,
      frame: chartInteractionFrame,
      onDebugGestureEvent: stableOnDebugGestureEvent,
      sharedViewport,
      timeScaleActive,
      timeScaleGestureState,
    });
  }, [
    chartInteractionFrame,
    controlZones,
    resetViewVisible,
    sharedViewport,
    stableBeginNativeViewportInteraction,
    stableCancelNativeViewportInteraction,
    stableCommitPanViewport,
    stableOnDebugGestureEvent,
    timeScaleActive,
    timeScaleGestureState,
  ]);

  const nativeChartGesture = useMemo(
    () =>
      createNativeChartGesture({
        chartAxisPinchGesture,
        bracketDragGesture,
        chartPanGesture,
        canvasTapGesture,
        crosshairLongPressGesture,
        crosshairPanGesture,
        drawingEditDragGesture,
        leftToolRailToggleTapGesture,
        orderDragGesture,
        overlayActionTapGesture,
        paneMaximizeTapGesture,
        priceAxisResetTapGesture,
        priceScaleGesture,
        resetViewTapGesture,
        selectedDrawingActionTapGesture,
        timeScaleGesture,
      }),
    [
      chartAxisPinchGesture,
      bracketDragGesture,
      chartPanGesture,
      canvasTapGesture,
      crosshairLongPressGesture,
      crosshairPanGesture,
      drawingEditDragGesture,
      leftToolRailToggleTapGesture,
      orderDragGesture,
      overlayActionTapGesture,
      paneMaximizeTapGesture,
      priceAxisResetTapGesture,
      priceScaleGesture,
      resetViewTapGesture,
      selectedDrawingActionTapGesture,
      timeScaleGesture,
    ],
  );

  return { nativeChartGesture };
}
