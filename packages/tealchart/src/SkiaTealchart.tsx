import type { WorkerError } from '@tealstreet/tealscript';
import type {
  UserDrawingCommandEventListener,
  UserDrawingSelectedActionSurfaceCommand,
  UserDrawingSelectedActionSurfaceGroupId,
  UserDrawingState,
  UserDrawingTool,
} from './drawings';
import type { NativeGestureControlZone } from './mobile/interaction/nativeGestureControlZones';
import type { NativeCrosshairContextMenuState } from './mobile/render/NativeCrosshairContextMenuOverlay';
import type { ChartThemeInput } from './theme';
import type { TealchartKeyValueStorage } from './transformer/storageSaveLoadAdapter';
import type {
  ContextMenuCallback,
  IBasicDataFeed,
  PriceLine,
  RenderOptions,
  ResolutionString,
  Viewport,
} from './types';

import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';

import { Canvas } from '@shopify/react-native-skia';
import { StyleSheet, View } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';

import { LOADING_OPACITY } from './constants';
import {
  resolveUserDrawingRenderEntriesFromSlices,
  resolveUserDrawingSelectionActionAnchorFromDrawings,
} from './drawings';
import { isNativeGestureControlPoint } from './mobile/interaction/nativeGestureControlZones';
import {
  NATIVE_RESET_VIEW_DISMISS_MS,
  resolveNativeResetViewButtonLayout,
  resolveNativeResetViewTapTarget,
} from './mobile/interaction/nativeResetViewButton';
import { findNativeOrderDragZone, findNativeTradeLineActionZone } from './mobile/interaction/nativeTradeLineHitTest';
import { useNativeChartGestureRuntime } from './mobile/interaction/useNativeChartGestureRuntime';
import { useNativeOemsLineRuntime } from './mobile/interaction/useNativeOemsLineRuntime';
import { useNativeSkiaInteractionRuntime } from './mobile/interaction/useNativeSkiaInteractionRuntime';
import { useNativeSkiaSharedValueBridge } from './mobile/interaction/useNativeSkiaSharedValueBridge';
import { useNativeTopBarActionRuntime } from './mobile/interaction/useNativeTopBarActionRuntime';
import { useNativeUserDrawingRuntime } from './mobile/interaction/useNativeUserDrawingRuntime';
import { useNativeViewportRuntime } from './mobile/interaction/useNativeViewportRuntime';
import { PRICE_AXIS_TAG_HEIGHT } from './mobile/render/nativeAxisTagLayout';
import { NativeChartCanvasLayers } from './mobile/render/NativeChartCanvasLayers';
import { NativeChartLegendOverlay } from './mobile/render/NativeChartLegendOverlay';
import { NativeCrosshairContextMenuOverlay } from './mobile/render/NativeCrosshairContextMenuOverlay';
import { NativeDrawingCategoryDismissOverlay } from './mobile/render/NativeDrawingCategoryDismissOverlay';
import {
  NATIVE_LEFT_TOOL_RAIL_DRAWER_WIDTH,
  NativeLeftToolRailOverlay,
} from './mobile/render/NativeLeftToolRailOverlay';
import { normalizeNativePricePrecisionToTickSizeWorklet } from './mobile/render/nativePriceFormat';
import {
  nativeBarsMatchRequestedData,
  shouldDimNativeRenderForTransition,
  shouldHoldNativeRenderSnapshotForTransition,
  shouldUseNativeStaticRenderProjectionForTransition,
} from './mobile/render/nativeRenderTransition';
import { NativeResetViewButtonOverlay } from './mobile/render/NativeResetViewButtonOverlay';
import { NativeTopBarOverlay } from './mobile/render/NativeTopBarOverlay';
import {
  NativeUserDrawingSelectionActionOverlay,
  resolveNativeSelectedDrawingActionControlZones,
  resolveNativeSelectedDrawingActionOverlayModel,
} from './mobile/render/NativeUserDrawingSelectionActionOverlay';
import { useNativeCountdownClock } from './mobile/render/useNativeCountdownClock';
import { useNativeSkiaLayoutRuntime } from './mobile/render/useNativeSkiaLayoutRuntime';
import { useNativeSkiaRenderModel } from './mobile/render/useNativeSkiaRenderModel';
import { useNativeTealchartCoreRuntime } from './mobile/useNativeTealchartCoreRuntime';
import { resolveNativeLeftToolRailToggleHitRect } from './mobile/utils/leftToolRailLayout';
import {
  createNativeUserDrawingCoordinateSpaces,
  resolveNativeUserDrawingInputPoint,
  resolveNativeUserDrawingSelectionPoint,
} from './mobile/utils/nativeUserDrawingGeometry';
import {
  getNativeOrderObjectId as getOrderObjectId,
  getNativePositionObjectId as getPositionObjectId,
} from './mobile/utils/tradeLineLayout';
import { getChartStore } from './state/chartState';
import { TealchartApi } from './TealchartApi';
import { DEFAULT_MARGINS } from './types';

const STATIC_TOP_BAR_HEIGHT = 36;
const TRADE_LABEL_HEIGHT = 18;
const VOLUME_HEIGHT_RATIO = 0.15;
const MOBILE_TOP_BAR_TIMEFRAME_VALUES = new Set<ResolutionString>(['1', '5', '15', '30', '60']);
const NATIVE_CHART_UI_DEFAULTS = { leftToolRailCollapsed: true };
const EMPTY_NATIVE_USER_DRAWING_ANCHORS: NonNullable<UserDrawingState['draft']>['anchors'] = [];
const EMPTY_NATIVE_PRICE_LINES: PriceLine[] = [];

export interface SkiaTealchartHandle {
  chart(index?: number): TealchartApi;
  activeChart(): TealchartApi;
  changeTheme(theme: ChartThemeInput): void;
}

export interface SkiaTealchartProps {
  chartKey?: string;
  width?: number;
  height?: number;
  datafeed?: IBasicDataFeed;
  symbol: string;
  interval?: string;
  renderOptions?: Partial<RenderOptions>;
  theme?: ChartThemeInput;
  margins?: Partial<typeof DEFAULT_MARGINS>;
  priceLines?: PriceLine[];
  pricePrecision?: number;
  showTopBar?: boolean;
  supportedResolutions?: ResolutionString[];
  uiPreferencesStorage?: TealchartKeyValueStorage | null;
  userDrawingState?: UserDrawingState;
  onIndicatorsClick?: () => void;
  onContextMenu?: ContextMenuCallback;
  onViewportChange?: (viewport: Viewport) => void;
  onIntervalChange?: (interval: string) => void;
  onSymbolClick?: () => void;
  onSymbolChange?: (symbol: string) => void;
  onTealscriptError?: (scriptId: string, error: WorkerError) => void;
  onUserDrawingCommand?: UserDrawingCommandEventListener;
  onUserDrawingStateChange?: (state: UserDrawingState) => void;
}

export const SkiaTealchart = forwardRef<SkiaTealchartHandle, SkiaTealchartProps>(function SkiaTealchart(
  {
    width: propWidth,
    height: propHeight,
    datafeed,
    symbol: propSymbol,
    interval: propInterval = '15',
    renderOptions,
    theme = 'Dark',
    margins: marginsProp,
    priceLines,
    pricePrecision = 2,
    showTopBar = true,
    supportedResolutions,
    userDrawingState,
    onIndicatorsClick,
    onContextMenu,
    onViewportChange,
    onIntervalChange,
    onSymbolClick,
    onSymbolChange,
    onTealscriptError,
    onUserDrawingCommand,
    onUserDrawingStateChange,
    chartKey: propChartKey,
    uiPreferencesStorage,
  },
  ref,
) {
  const chartKey = propChartKey ?? propSymbol;
  const chartStore = useMemo(
    () =>
      getChartStore(chartKey, {
        uiPreferencesStorage,
        defaultUiPreferences: NATIVE_CHART_UI_DEFAULTS,
      }),
    [chartKey, uiPreferencesStorage],
  );
  const [uiPreferences, setUiPreferences] = useState(() => chartStore.uiPreferences.get());
  const [nativeAutoScaleEnabled, setNativeAutoScaleEnabled] = useState(() => chartStore.settings.get().autoScale);
  useEffect(() => {
    setUiPreferences(chartStore.uiPreferences.get());
    return chartStore.uiPreferences.listen((nextPreferences) => {
      setUiPreferences(nextPreferences);
    });
  }, [chartStore]);
  useEffect(() => {
    setNativeAutoScaleEnabled(chartStore.settings.get().autoScale);
    return chartStore.settings.listen((nextSettings) => {
      setNativeAutoScaleEnabled(nextSettings.autoScale);
    });
  }, [chartStore]);
  const leftToolRailCollapsed = uiPreferences.leftToolRailCollapsed;
  const [nativeOpenDrawingCategoryId, setNativeOpenDrawingCategoryId] = useState<string | null>(null);
  const toggleLeftToolRailCollapsed = useCallback(() => {
    chartStore.uiPreferences.setKey('leftToolRailCollapsed', !chartStore.uiPreferences.get().leftToolRailCollapsed);
  }, [chartStore]);
  const dismissNativeOpenDrawingCategory = useCallback(() => {
    setNativeOpenDrawingCategoryId(null);
  }, []);
  useEffect(() => {
    if (leftToolRailCollapsed) setNativeOpenDrawingCategoryId(null);
  }, [leftToolRailCollapsed]);

  const {
    bars,
    barsContext,
    chartApi,
    forceUpdate,
    imperativeTheme,
    interval,
    isLoading,
    isLoadingMoreBars,
    requestMoreBars,
    setImperativeTheme,
    symbol,
  } = useNativeTealchartCoreRuntime({
    datafeed,
    onIntervalChange,
    onSymbolChange,
    onTealscriptError,
    propInterval,
    propSymbol,
    theme,
  });
  const [nativeDisplayedInterval, setNativeDisplayedInterval] = useState(interval);
  useEffect(() => {
    setNativeDisplayedInterval(interval);
  }, [interval]);
  const nativePricePrecision = useMemo(
    () => normalizeNativePricePrecisionToTickSizeWorklet(pricePrecision),
    [pricePrecision],
  );
  const loadedBarsInterval = bars.length > 0 ? (barsContext?.interval ?? interval) : interval;
  const {
    bracketDragActive,
    bracketDragInteractionState,
    bracketDragState,
    chartAxisPinchGestureState,
    chartPanGestureState,
    crosshair,
    orderDragState,
    orderDragZones,
    panActive,
    panMetrics,
    panStartViewport,
    pinchActive,
    priceAutoScale,
    priceScaleActive,
    priceScaleGestureState,
    sharedPriceAxisTagSources,
    sharedViewport,
    timeScaleActive,
    timeScaleGestureState,
    tradeLineActionZones,
    tradeLineRows,
    viewportSyncEpoch,
  } = useNativeSkiaInteractionRuntime({ autoScaleEnabled: nativeAutoScaleEnabled });
  useImperativeHandle(
    ref,
    () => ({
      chart(index = 0): TealchartApi {
        if (index !== 0) {
          throw new RangeError(`SkiaTealchart only has one chart; received index ${index}`);
        }
        return chartApi;
      },
      activeChart(): TealchartApi {
        return chartApi;
      },
      changeTheme(nextTheme: ChartThemeInput): void {
        setImperativeTheme(nextTheme);
      },
    }),
    [chartApi],
  );

  const { frame, margins, onLayout, options } = useNativeSkiaLayoutRuntime({
    imperativeTheme,
    leftToolRailCollapsed,
    marginsProp,
    pricePrecision: nativePricePrecision,
    propHeight,
    propWidth,
    renderOptions,
    showTopBar,
    theme,
    topBarHeight: STATIC_TOP_BAR_HEIGHT,
  });

  const nativeBarsReadyForRequestedData = nativeBarsMatchRequestedData({
    barsContext,
    barsLength: bars.length,
    interval,
    symbol,
  });

  const {
    beginNativeViewportInteraction,
    cancelNativeViewportInteraction,
    commitPanViewport,
    dataLoadRenderBlocked,
    hasDataViewport,
    projection,
    resetNativeViewport,
    viewport,
  } = useNativeViewportRuntime({
    autoScaleEnabled: nativeAutoScaleEnabled,
    bars,
    barsMatchRequestedData: nativeBarsReadyForRequestedData,
    frame,
    interval,
    isLoading,
    loadedBarsInterval,
    onRequestMoreBars: requestMoreBars,
    onViewportChange,
    panActive,
    panMetrics,
    panStartViewport,
    pinchActive,
    priceAutoScale,
    priceScaleActive,
    sharedViewport,
    symbol,
    timeScaleActive,
    viewportSyncEpoch,
  });
  const liveNativeRenderSnapshot = useMemo(
    () => ({
      bars,
      hasDataViewport,
      interval: loadedBarsInterval,
      priceLines: priceLines ?? EMPTY_NATIVE_PRICE_LINES,
      projection,
      viewport,
    }),
    [bars, hasDataViewport, loadedBarsInterval, priceLines, projection, viewport],
  );
  const nativeRenderSnapshotRef = useRef(liveNativeRenderSnapshot);
  const nativeRenderTransitionPending = shouldDimNativeRenderForTransition({
    barsContext,
    barsLength: bars.length,
    interval,
    isLoading,
    symbol,
  });
  const shouldHoldNativeRenderSnapshot = shouldHoldNativeRenderSnapshotForTransition({
    barsContext,
    barsLength: bars.length,
    hasDataViewport,
    interval,
    isLoading,
    previousBarsLength: nativeRenderSnapshotRef.current.bars.length,
    previousHasDataViewport: nativeRenderSnapshotRef.current.hasDataViewport,
    previousProjectionReady: Boolean(nativeRenderSnapshotRef.current.projection),
    projectionReady: Boolean(projection),
    symbol,
  });
  const nativeRenderSnapshot = shouldHoldNativeRenderSnapshot
    ? nativeRenderSnapshotRef.current
    : liveNativeRenderSnapshot;
  useEffect(() => {
    if (shouldHoldNativeRenderSnapshot || bars.length === 0 || !hasDataViewport || !projection) return;
    nativeRenderSnapshotRef.current = liveNativeRenderSnapshot;
  }, [bars.length, hasDataViewport, liveNativeRenderSnapshot, projection, shouldHoldNativeRenderSnapshot]);
  const nativeRenderBars = nativeRenderSnapshot.bars;
  const nativeRenderHasDataViewport = nativeRenderSnapshot.hasDataViewport;
  const nativeRenderInterval = nativeRenderSnapshot.interval;
  const nativeRenderPriceLines = nativeRenderSnapshot.priceLines;
  const nativeRenderProjection = nativeRenderSnapshot.projection;
  const nativeRenderViewport = nativeRenderSnapshot.viewport;
  const useStaticNativeRenderProjection = shouldUseNativeStaticRenderProjectionForTransition({
    dataLoadRenderBlocked,
    holdingSnapshot: shouldHoldNativeRenderSnapshot,
  });
  const staticNativeRenderProjection = useStaticNativeRenderProjection ? nativeRenderProjection : null;
  const [nativeResetViewButtonVisible, setNativeResetViewButtonVisible] = useState(false);
  const [nativeContextMenu, setNativeContextMenu] = useState<NativeCrosshairContextMenuState | null>(null);
  const nativeResetViewButtonTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasNativeContextMenu = Boolean(onContextMenu);
  const closeNativeContextMenu = useCallback(() => {
    setNativeContextMenu(null);
    crosshair.visible.value = false;
  }, [crosshair]);
  const handleNativeContextMenuTap = useCallback(
    (time: number, price: number, anchorX: number, anchorY: number) => {
      const items = onContextMenu?.(time, price) ?? [];
      setNativeContextMenu(items.length > 0 ? { anchorX, anchorY, items } : null);
    },
    [onContextMenu],
  );
  useEffect(() => {
    if (!onContextMenu) setNativeContextMenu(null);
  }, [onContextMenu]);
  const clearNativeResetViewButtonTimer = useCallback(() => {
    if (nativeResetViewButtonTimerRef.current) {
      clearTimeout(nativeResetViewButtonTimerRef.current);
      nativeResetViewButtonTimerRef.current = null;
    }
  }, []);
  const hideNativeResetViewButton = useCallback(() => {
    clearNativeResetViewButtonTimer();
    setNativeResetViewButtonVisible(false);
  }, [clearNativeResetViewButtonTimer]);
  const showNativeResetViewButton = useCallback(() => {
    clearNativeResetViewButtonTimer();
    setNativeResetViewButtonVisible(true);
    nativeResetViewButtonTimerRef.current = setTimeout(() => {
      setNativeResetViewButtonVisible(false);
      nativeResetViewButtonTimerRef.current = null;
    }, NATIVE_RESET_VIEW_DISMISS_MS);
  }, [clearNativeResetViewButtonTimer]);

  useEffect(
    () => () => {
      clearNativeResetViewButtonTimer();
    },
    [clearNativeResetViewButtonTimer],
  );

  const {
    beginNativeUserDrawingEditDragAtPoint,
    dispatchNativeUserDrawingSelectedAction,
    endNativeUserDrawingEditDrag,
    handleNativeUserDrawingInput,
    redoNativeUserDrawingCommand,
    selectNativeUserDrawingAtPoint,
    selectNativeUserDrawingTool,
    undoNativeUserDrawingCommand,
    updateNativeUserDrawingEditDrag,
    userDrawingCommandAvailability,
    userDrawingRecentToolsByCategory,
    userDrawingState: nativeUserDrawingState,
  } = useNativeUserDrawingRuntime({
    initialUserDrawingState: userDrawingState,
    onUserDrawingCommand,
    onUserDrawingStateChange,
  });
  const [nativeSelectedActionPopoverGroupId, setNativeSelectedActionPopoverGroupId] =
    useState<UserDrawingSelectedActionSurfaceGroupId | null>(null);
  const nativeSelectedDrawingId = nativeUserDrawingState.selection?.drawingId ?? null;
  const nativeUserDrawingCoordinateSpaces = useMemo(
    () =>
      frame && nativeRenderViewport && nativeRenderHasDataViewport
        ? createNativeUserDrawingCoordinateSpaces({ bars: nativeRenderBars, frame, viewport: nativeRenderViewport })
        : null,
    [frame, nativeRenderBars, nativeRenderHasDataViewport, nativeRenderViewport],
  );
  useEffect(() => {
    setNativeSelectedActionPopoverGroupId(null);
  }, [nativeSelectedDrawingId]);
  const handleNativeUserDrawingToolSelect = useCallback(
    (tool: UserDrawingTool) => {
      selectNativeUserDrawingTool(tool);
      setNativeOpenDrawingCategoryId(null);
      setNativeSelectedActionPopoverGroupId(null);
    },
    [selectNativeUserDrawingTool],
  );
  const nativeDrawingInputEnabled = nativeUserDrawingState.activeTool !== 'select';
  const nativeDrawingSelectionEnabled = nativeUserDrawingState.activeTool === 'select';
  const handleNativeUserDrawingTap = useCallback(
    (x: number, y: number) => {
      if (!frame || !nativeUserDrawingCoordinateSpaces || !nativeDrawingInputEnabled) return;
      const point = resolveNativeUserDrawingInputPoint({
        bars: nativeRenderBars,
        frame,
        spacesByPaneId: nativeUserDrawingCoordinateSpaces,
        state: nativeUserDrawingState,
        viewport: nativeRenderViewport,
        x,
        y,
      });
      if (!point) return;
      handleNativeUserDrawingInput(point);
    },
    [
      frame,
      handleNativeUserDrawingInput,
      nativeDrawingInputEnabled,
      nativeRenderBars,
      nativeRenderViewport,
      nativeUserDrawingCoordinateSpaces,
      nativeUserDrawingState,
    ],
  );
  const handleNativeUserDrawingSelectionTap = useCallback(
    (x: number, y: number, claimTap: () => void) => {
      if (!frame || !nativeUserDrawingCoordinateSpaces || !nativeDrawingSelectionEnabled) return;
      const selectionPoint = resolveNativeUserDrawingSelectionPoint({
        bars: nativeRenderBars,
        frame,
        spacesByPaneId: nativeUserDrawingCoordinateSpaces,
        viewport: nativeRenderViewport,
        x,
        y,
      });
      if (!selectionPoint) return;
      const result = selectNativeUserDrawingAtPoint(selectionPoint.point, selectionPoint.spacesByPaneId);
      if (result.hit || result.changed) claimTap();
    },
    [
      frame,
      nativeDrawingSelectionEnabled,
      nativeRenderBars,
      nativeRenderViewport,
      nativeUserDrawingCoordinateSpaces,
      selectNativeUserDrawingAtPoint,
    ],
  );
  const resolveNativeUserDrawingEditDragPoint = useCallback(
    (x: number, y: number) => {
      if (!frame || !nativeUserDrawingCoordinateSpaces || !nativeDrawingSelectionEnabled) return null;
      return resolveNativeUserDrawingSelectionPoint({
        bars: nativeRenderBars,
        frame,
        spacesByPaneId: nativeUserDrawingCoordinateSpaces,
        viewport: nativeRenderViewport,
        x,
        y,
      });
    },
    [frame, nativeDrawingSelectionEnabled, nativeRenderBars, nativeRenderViewport, nativeUserDrawingCoordinateSpaces],
  );
  const handleNativeUserDrawingEditDragBegin = useCallback(
    (x: number, y: number) => {
      const dragPoint = resolveNativeUserDrawingEditDragPoint(x, y);
      if (dragPoint) beginNativeUserDrawingEditDragAtPoint(dragPoint.point, dragPoint.spacesByPaneId);
    },
    [beginNativeUserDrawingEditDragAtPoint, resolveNativeUserDrawingEditDragPoint],
  );
  const handleNativeUserDrawingEditDragMove = useCallback(
    (x: number, y: number) => {
      updateNativeUserDrawingEditDrag({ x, y });
    },
    [updateNativeUserDrawingEditDrag],
  );
  const handleNativeSelectedDrawingAction = useCallback(
    (command: UserDrawingSelectedActionSurfaceCommand) => {
      dispatchNativeUserDrawingSelectedAction(command);
      setNativeSelectedActionPopoverGroupId(null);
    },
    [dispatchNativeUserDrawingSelectedAction],
  );

  const { commitNativeTopBarRuntimeAction } = useNativeTopBarActionRuntime({
    chartApi,
    onSymbolClick,
    onIndicatorsClick,
    redoUserDrawingCommand: redoNativeUserDrawingCommand,
    undoUserDrawingCommand: undoNativeUserDrawingCommand,
  });
  const handleNativeTopBarAction = useCallback(
    (action: Parameters<typeof commitNativeTopBarRuntimeAction>[0]) => {
      if (action.type === 'timeframe' && action.interval) {
        setNativeDisplayedInterval(action.interval);
      }
      commitNativeTopBarRuntimeAction(action);
    },
    [commitNativeTopBarRuntimeAction],
  );

  const {
    clearNativeBracketDrag,
    commitBracketMove,
    commitOrderMove,
    commitTradeLineAction,
    lineSnapshot,
    syncNativeOemsDragStateForSnapshot,
  } = useNativeOemsLineRuntime({
    bracketDragInteractionState,
    bracketDragState,
    chartApi,
    forceUpdate,
    orderDragState,
  });

  const {
    axisFont,
    backgroundColor,
    gridColor,
    leftToolRailLayout,
    nativeMutedTextColor,
    nativePriceLines,
    plotPrimitiveClip,
    priceAxisTagSources,
    smallFont,
    textColor,
    textFont,
    topBarLayout,
    tradeLineGeometries,
    visibleBars,
    volumeHeight,
  } = useNativeSkiaRenderModel({
    bars: nativeRenderBars,
    frame,
    interval: nativeRenderInterval,
    leftToolRailCollapsed,
    lineSnapshot,
    marginsBottom: margins.bottom,
    onIndicatorsClick,
    options,
    priceAxisTagHeight: PRICE_AXIS_TAG_HEIGHT,
    priceLines: nativeRenderPriceLines,
    pricePrecision: nativePricePrecision,
    projection: nativeRenderProjection,
    showTopBar,
    supportedResolutions,
    symbol,
    topBarInterval: nativeDisplayedInterval,
    topBarDefaultVisibleValues: MOBILE_TOP_BAR_TIMEFRAME_VALUES,
    topBarHeight: STATIC_TOP_BAR_HEIGHT,
    tradeLabelHeight: TRADE_LABEL_HEIGHT,
    userDrawingActiveTool: nativeUserDrawingState.activeTool,
    userDrawingCommandAvailability,
    userDrawingRecentToolsByCategory,
    volumeHeightRatio: VOLUME_HEIGHT_RATIO,
  });

  const { resolvedPriceAxisTags } = useNativeSkiaSharedValueBridge({
    bracketDragState: bracketDragInteractionState,
    frame,
    hasDataViewport: nativeRenderHasDataViewport,
    orderDragState,
    orderDragZones,
    priceAxisTagHeight: PRICE_AXIS_TAG_HEIGHT,
    priceAxisTagSources,
    sharedPriceAxisTagSources,
    sharedViewport,
    syncNativeOemsDragStateForSnapshot,
    tradeLineActionZones,
    tradeLineGeometries,
    tradeLineRows,
  });
  const nativeCountdownEnabled = useMemo(
    () => nativePriceLines.some((line) => line.countdownToTime !== undefined),
    [nativePriceLines],
  );
  const nativeCountdownNowMs = useNativeCountdownClock(nativeCountdownEnabled);
  const nativeUserDrawingDrawings = nativeUserDrawingState.drawings;
  const nativeUserDrawingSelection = nativeUserDrawingState.selection;
  const nativeUserDrawingDraft = nativeUserDrawingState.draft;
  const nativeUserDrawingMeasure = nativeUserDrawingState.measure;
  const nativeUserDrawingTextEdit = nativeUserDrawingState.textEdit;
  const nativeUserDrawingDefaultStylesByKind = nativeUserDrawingState.defaultStylesByKind;
  const nativeUserDrawingSelectionActionAnchor = useMemo(() => {
    if (!nativeUserDrawingCoordinateSpaces || !nativeUserDrawingSelection) return null;
    return resolveUserDrawingSelectionActionAnchorFromDrawings({
      drawings: nativeUserDrawingDrawings,
      selection: nativeUserDrawingSelection,
      spacesByPaneId: nativeUserDrawingCoordinateSpaces,
    });
  }, [nativeUserDrawingCoordinateSpaces, nativeUserDrawingDrawings, nativeUserDrawingSelection]);
  const nativeSelectionActionLeftInset = leftToolRailLayout?.collapsed
    ? 16
    : (leftToolRailLayout?.railRect.width ?? 0) + 8;
  const nativeSelectionActionTopInset = showTopBar ? STATIC_TOP_BAR_HEIGHT + 8 : 8;
  const nativeUserDrawingSelectionActionModel = useMemo(
    () =>
      frame && nativeUserDrawingSelectionActionAnchor
        ? resolveNativeSelectedDrawingActionOverlayModel({
            activeBackgroundColor: gridColor,
            activeTextColor: options.upColor,
            anchor: nativeUserDrawingSelectionActionAnchor,
            backgroundColor,
            bottomInset: 8,
            gridColor,
            leftInset: nativeSelectionActionLeftInset,
            mutedTextColor: nativeMutedTextColor,
            onAction: handleNativeSelectedDrawingAction,
            onPopoverGroupChange: setNativeSelectedActionPopoverGroupId,
            openPopoverGroupId: nativeSelectedActionPopoverGroupId,
            rightInset: 8,
            textColor,
            topInset: nativeSelectionActionTopInset,
            userDrawingDefaultStylesByKind: nativeUserDrawingDefaultStylesByKind,
            userDrawingDraft: nativeUserDrawingDraft,
            userDrawingDrawings: nativeUserDrawingDrawings,
            userDrawingSelection: nativeUserDrawingSelection,
            userDrawingTextEdit: nativeUserDrawingTextEdit,
            viewportHeight: frame.dimensions.height,
            viewportWidth: frame.dimensions.width,
          })
        : null,
    [
      backgroundColor,
      frame,
      gridColor,
      handleNativeSelectedDrawingAction,
      nativeMutedTextColor,
      nativeSelectedActionPopoverGroupId,
      nativeSelectionActionLeftInset,
      nativeSelectionActionTopInset,
      nativeUserDrawingDefaultStylesByKind,
      nativeUserDrawingDraft,
      nativeUserDrawingDrawings,
      nativeUserDrawingSelection,
      nativeUserDrawingSelectionActionAnchor,
      nativeUserDrawingTextEdit,
      options.upColor,
      textColor,
    ],
  );

  const isNativeTradeLineTouchTarget = useCallback(
    (x: number, y: number) => {
      if (!frame) return false;
      return Boolean(
        findNativeTradeLineActionZone({
          zones: tradeLineActionZones.value,
          rows: tradeLineRows.value,
          x,
          y,
          sharedViewport,
          frame,
          tradeLabelHeight: TRADE_LABEL_HEIGHT,
        }) ||
        findNativeOrderDragZone({
          zones: orderDragZones.value,
          rows: tradeLineRows.value,
          x,
          y,
          sharedViewport,
          frame,
          tradeLabelHeight: TRADE_LABEL_HEIGHT,
        }),
      );
    },
    [frame, orderDragZones, sharedViewport, tradeLineActionZones, tradeLineRows],
  );
  const nativeResetViewButtonLayout = useMemo(
    () => (frame ? resolveNativeResetViewButtonLayout(frame) : null),
    [frame],
  );
  const nativeUserDrawingEditDragZones = useMemo<readonly NativeGestureControlZone[]>(() => {
    if (!nativeDrawingSelectionEnabled || !nativeUserDrawingSelectionActionAnchor) return [];
    const { bounds } = nativeUserDrawingSelectionActionAnchor;
    return [
      {
        x1: bounds.x,
        x2: bounds.x + bounds.width,
        y1: bounds.y,
        y2: bounds.y + bounds.height,
      },
    ];
  }, [nativeDrawingSelectionEnabled, nativeUserDrawingSelectionActionAnchor]);
  const nativeGestureControlZones = useMemo<readonly NativeGestureControlZone[]>(() => {
    const zones: NativeGestureControlZone[] = [];
    if (frame && topBarLayout) {
      zones.push({
        x1: 0,
        x2: frame.dimensions.width,
        y1: 0,
        y2: topBarLayout.height,
      });
    }

    if (leftToolRailLayout) {
      const drawerWidth =
        nativeOpenDrawingCategoryId && !leftToolRailLayout.collapsed ? NATIVE_LEFT_TOOL_RAIL_DRAWER_WIDTH : 0;
      const toggleHitRect = resolveNativeLeftToolRailToggleHitRect(leftToolRailLayout);
      zones.push({
        x1: leftToolRailLayout.x,
        x2: Math.max(
          leftToolRailLayout.x + leftToolRailLayout.width + drawerWidth,
          toggleHitRect ? toggleHitRect.x + toggleHitRect.width : 0,
        ),
        y1: leftToolRailLayout.y,
        y2: leftToolRailLayout.y + leftToolRailLayout.height,
      });
    }

    if (nativeResetViewButtonLayout && nativeResetViewButtonVisible && hasDataViewport) {
      zones.push({
        x1: nativeResetViewButtonLayout.centerX - nativeResetViewButtonLayout.hitRadius,
        x2: nativeResetViewButtonLayout.centerX + nativeResetViewButtonLayout.hitRadius,
        y1: nativeResetViewButtonLayout.centerY - nativeResetViewButtonLayout.hitRadius,
        y2: nativeResetViewButtonLayout.centerY + nativeResetViewButtonLayout.hitRadius,
      });
    }

    zones.push(...resolveNativeSelectedDrawingActionControlZones(nativeUserDrawingSelectionActionModel));

    return zones;
  }, [
    frame,
    hasDataViewport,
    leftToolRailLayout,
    nativeOpenDrawingCategoryId,
    nativeResetViewButtonLayout,
    nativeResetViewButtonVisible,
    nativeUserDrawingSelectionActionModel,
    topBarLayout,
  ]);
  const handleNativeResetViewTap = useCallback(
    (x: number, y: number) => {
      if (!frame || !hasDataViewport) return;
      const target = resolveNativeResetViewTapTarget({
        frame,
        resetButtonVisible: nativeResetViewButtonVisible,
        x,
        y,
        isControlTarget: isNativeGestureControlPoint(nativeGestureControlZones, x, y),
        isTradeLineTarget: isNativeTradeLineTouchTarget(x, y),
      });
      if (!target) return;
      if (target === 'button') {
        resetNativeViewport();
        hideNativeResetViewButton();
        return;
      }
      showNativeResetViewButton();
    },
    [
      frame,
      hasDataViewport,
      hideNativeResetViewButton,
      isNativeTradeLineTouchTarget,
      nativeGestureControlZones,
      nativeResetViewButtonVisible,
      resetNativeViewport,
      showNativeResetViewButton,
    ],
  );

  const { nativeChartGesture } = useNativeChartGestureRuntime({
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
    controlZones: nativeGestureControlZones,
    crosshair,
    drawingEditDragZones: nativeUserDrawingEditDragZones,
    drawingInputEnabled: nativeDrawingInputEnabled,
    drawingSelectionEnabled: nativeDrawingSelectionEnabled,
    frame,
    hasContextMenu: hasNativeContextMenu,
    hasDataViewport,
    leftToolRailLayout,
    orderDragState,
    orderDragZones,
    onDrawingTap: handleNativeUserDrawingTap,
    onDrawingSelectionTap: handleNativeUserDrawingSelectionTap,
    onDrawingEditDragBegin: handleNativeUserDrawingEditDragBegin,
    onDrawingEditDragEnd: endNativeUserDrawingEditDrag,
    onDrawingEditDragMove: handleNativeUserDrawingEditDragMove,
    onLeftToolRailToggleTap: toggleLeftToolRailCollapsed,
    onContextMenuTap: handleNativeContextMenuTap,
    onResetViewTap: handleNativeResetViewTap,
    panActive,
    pinchActive,
    pricePrecision: nativePricePrecision,
    priceScaleActive,
    resetButtonVisible: nativeResetViewButtonVisible,
    priceScaleGestureState,
    sharedViewport,
    timeScaleActive,
    timeScaleGestureState,
    tradeLabelHeight: TRADE_LABEL_HEIGHT,
    tradeLineActionZones,
    tradeLineRows,
  });
  const nativeUserDrawingRenderEntries = useMemo(
    () =>
      resolveUserDrawingRenderEntriesFromSlices({
        draft: nativeUserDrawingDraft,
        drawings: nativeUserDrawingDrawings,
        measure: nativeUserDrawingMeasure,
        selection: nativeUserDrawingSelection,
      }),
    [nativeUserDrawingDraft, nativeUserDrawingDrawings, nativeUserDrawingMeasure, nativeUserDrawingSelection],
  );
  const nativeUserDrawingDraftAnchors = nativeUserDrawingDraft?.anchors ?? EMPTY_NATIVE_USER_DRAWING_ANCHORS;
  const nativeUserDrawingDraftAnchorColor = nativeUserDrawingDraft?.style.lineColor;
  const nativeCanvasLoading = nativeRenderTransitionPending && nativeRenderBars.length > 0;
  const nativeLegendLoading = nativeRenderTransitionPending || isLoadingMoreBars;

  return (
    <View style={[styles.container, { backgroundColor }]} onLayout={onLayout}>
      {frame && nativeRenderProjection && (
        <GestureDetector gesture={nativeChartGesture}>
          <Canvas style={styles.canvas}>
            <NativeChartCanvasLayers
              axisFont={axisFont}
              backgroundColor={backgroundColor}
              bracketDragState={bracketDragState}
              crosshair={crosshair}
              extraPriceLines={nativePriceLines}
              frame={frame}
              getOrderObjectId={getOrderObjectId}
              getPositionObjectId={getPositionObjectId}
              gridColor={gridColor}
              hasDataViewport={nativeRenderHasDataViewport}
              hasContextMenu={hasNativeContextMenu}
              lineSnapshot={lineSnapshot}
              options={options}
              plotOpacity={nativeCanvasLoading ? LOADING_OPACITY : 1}
              orderDragState={orderDragState}
              plotPrimitiveClip={plotPrimitiveClip}
              pricePrecision={nativePricePrecision}
              nowMs={nativeCountdownNowMs}
              resolvedPriceAxisTags={resolvedPriceAxisTags}
              sharedViewport={sharedViewport}
              smallFont={smallFont}
              staticProjection={staticNativeRenderProjection}
              textColor={textColor}
              textFont={textFont}
              tradeLabelHeight={TRADE_LABEL_HEIGHT}
              tradeLineGeometries={tradeLineGeometries}
              userDrawingDraftAnchorColor={nativeUserDrawingDraftAnchorColor}
              userDrawingDraftAnchors={nativeUserDrawingDraftAnchors}
              userDrawingRenderEntries={nativeUserDrawingRenderEntries}
              visibleBars={visibleBars}
              volumeHeight={volumeHeight}
            />
          </Canvas>
        </GestureDetector>
      )}
      {topBarLayout && (
        <NativeTopBarOverlay
          backgroundColor={backgroundColor}
          gridColor={gridColor}
          mutedTextColor={nativeMutedTextColor}
          onAction={handleNativeTopBarAction}
          textColor={textColor}
          topBarLayout={topBarLayout}
        />
      )}
      {frame && (
        <NativeChartLegendOverlay
          bars={nativeRenderBars}
          downColor={options.downColor}
          frame={frame}
          interval={nativeRenderInterval}
          isLoading={nativeLegendLoading}
          leftToolRailLayout={leftToolRailLayout}
          mutedTextColor={nativeMutedTextColor}
          pricePrecision={nativePricePrecision}
          symbol={symbol}
          textColor={textColor}
          upColor={options.upColor}
        />
      )}
      {frame && nativeOpenDrawingCategoryId && leftToolRailLayout && !leftToolRailLayout.collapsed && (
        <NativeDrawingCategoryDismissOverlay
          height={Math.max(0, frame.dimensions.height - (topBarLayout?.height ?? 0))}
          onDismiss={dismissNativeOpenDrawingCategory}
          top={topBarLayout?.height ?? 0}
          width={frame.dimensions.width}
        />
      )}
      {leftToolRailLayout && (
        <NativeLeftToolRailOverlay
          backgroundColor={backgroundColor}
          gridColor={gridColor}
          leftToolRailLayout={leftToolRailLayout}
          mutedTextColor={nativeMutedTextColor}
          activeBackgroundColor={gridColor}
          activeTextColor={options.upColor}
          openCategoryId={nativeOpenDrawingCategoryId}
          onCategoryOpenChange={setNativeOpenDrawingCategoryId}
          onToolSelect={handleNativeUserDrawingToolSelect}
          onToggleCollapsed={toggleLeftToolRailCollapsed}
          toggleBackgroundColor={textColor}
        />
      )}
      {frame && nativeUserDrawingSelectionActionAnchor && (
        <NativeUserDrawingSelectionActionOverlay
          activeBackgroundColor={gridColor}
          activeTextColor={options.upColor}
          anchor={nativeUserDrawingSelectionActionAnchor}
          backgroundColor={backgroundColor}
          bottomInset={8}
          gridColor={gridColor}
          leftInset={nativeSelectionActionLeftInset}
          mutedTextColor={nativeMutedTextColor}
          onAction={handleNativeSelectedDrawingAction}
          onPopoverGroupChange={setNativeSelectedActionPopoverGroupId}
          openPopoverGroupId={nativeSelectedActionPopoverGroupId}
          rightInset={8}
          textColor={textColor}
          topInset={nativeSelectionActionTopInset}
          userDrawingDefaultStylesByKind={nativeUserDrawingDefaultStylesByKind}
          userDrawingDraft={nativeUserDrawingDraft}
          userDrawingDrawings={nativeUserDrawingDrawings}
          userDrawingSelection={nativeUserDrawingSelection}
          userDrawingTextEdit={nativeUserDrawingTextEdit}
          viewportHeight={frame.dimensions.height}
          viewportWidth={frame.dimensions.width}
        />
      )}
      {nativeResetViewButtonLayout && nativeResetViewButtonVisible && hasDataViewport && (
        <NativeResetViewButtonOverlay layout={nativeResetViewButtonLayout} />
      )}
      {frame && nativeContextMenu ? (
        <NativeCrosshairContextMenuOverlay
          backgroundColor={backgroundColor}
          dimensions={frame.dimensions}
          menu={nativeContextMenu}
          onClose={closeNativeContextMenu}
          renderOptions={options}
          textColor={textColor}
        />
      ) : null}
    </View>
  );
});

SkiaTealchart.displayName = 'SkiaTealchart';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
    position: 'relative',
  },
  canvas: {
    flex: 1,
  },
});
