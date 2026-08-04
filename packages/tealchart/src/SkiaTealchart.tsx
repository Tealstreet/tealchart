import type { SkImage } from '@shopify/react-native-skia';
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
import type { ChartSettings, CurrentLayoutState, SaveStatus } from './state/chartState';
import type { ChartThemeInput } from './theme';
import type { ISaveLoadAdapter, LayoutMetadata } from './transformer/saveLoadIntegration';
import type { TealchartKeyValueStorage } from './transformer/storageSaveLoadAdapter';
import type {
  ContextMenuCallback,
  IBasicDataFeed,
  PriceLine,
  RenderOptions,
  ResolutionString,
  Viewport,
} from './types';

import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { Canvas, Image as SkiaImage, useCanvasRef } from '@shopify/react-native-skia';
import { StyleSheet, View } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';

import { LOADING_OPACITY } from './constants';
import {
  resolveUserDrawingRenderEntriesFromSlices,
  resolveUserDrawingSelectionActionAnchorFromDrawings,
} from './drawings';
import { getIndicatorById } from './indicators/builtinIndicators';
import { isNativeGestureControlPoint } from './mobile/interaction/nativeGestureControlZones';
import {
  NATIVE_RESET_VIEW_DISMISS_MS,
  resolveNativeResetViewButtonLayout,
  resolveNativeResetViewTapTarget,
} from './mobile/interaction/nativeResetViewButton';
import { findNativeOrderDragZone, findNativeTradeLineActionZone } from './mobile/interaction/nativeTradeLineHitTest';
import { resolveNativeUserDrawingEditDragZones } from './mobile/interaction/nativeUserDrawingEditDragZones';
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
import { NativeLayoutSelectorOverlay } from './mobile/render/NativeLayoutSelectorOverlay';
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
  resolveNativeSelectedDrawingActionHitTargets,
  resolveNativeSelectedDrawingActionOverlayModel,
} from './mobile/render/NativeUserDrawingSelectionActionOverlay';
import { useNativeCountdownClock } from './mobile/render/useNativeCountdownClock';
import { useNativeSkiaLayoutRuntime } from './mobile/render/useNativeSkiaLayoutRuntime';
import { useNativeSkiaRenderModel } from './mobile/render/useNativeSkiaRenderModel';
import {
  createNativeChartLayoutSettings,
  resolveNativeDefaultLayoutPersistence,
  useNativeLayoutPersistence,
} from './mobile/useNativeLayoutPersistence';
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
const RESIZE_SNAPSHOT_RELEASE_HOLD_MS = 30;

interface NativeResizeSnapshot {
  height: number;
  image: SkImage;
  width: number;
}

function disposeNativeResizeSnapshot(snapshot: NativeResizeSnapshot | null): void {
  snapshot?.image.dispose();
}

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
  save_load_adapter?: ISaveLoadAdapter | null;
  disable_default_layout_persistence?: boolean;
  auto_save_delay?: number;
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
  resizeFreeze?: boolean;
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
    resizeFreeze = false,
    chartKey: propChartKey,
    uiPreferencesStorage,
    save_load_adapter,
    disable_default_layout_persistence,
    auto_save_delay,
  },
  ref,
) {
  const canvasRef = useCanvasRef();
  const resizeSnapshotRef = useRef<NativeResizeSnapshot | null>(null);
  const resizeSnapshotClearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [resizeSnapshot, setResizeSnapshotState] = useState<NativeResizeSnapshot | null>(null);
  const setResizeSnapshot = useCallback((nextSnapshot: NativeResizeSnapshot | null) => {
    setResizeSnapshotState((currentSnapshot) => {
      if (currentSnapshot?.image !== nextSnapshot?.image) {
        disposeNativeResizeSnapshot(currentSnapshot);
      }
      resizeSnapshotRef.current = nextSnapshot;
      return nextSnapshot;
    });
  }, []);
  const resizeSnapshotVisible = resizeSnapshot !== null;
  const resizeLayoutFrozen = resizeFreeze && resizeSnapshotVisible;
  const layoutPropHeight = resizeLayoutFrozen ? resizeSnapshot.height : propHeight;
  const layoutPropWidth = resizeLayoutFrozen ? resizeSnapshot.width : propWidth;
  const chartKey = propChartKey ?? propSymbol;
  const nativeLayoutDirtyRef = useRef<() => void>(() => undefined);
  const markNativeLayoutDirtyIfReady = useCallback(() => {
    nativeLayoutDirtyRef.current();
  }, []);
  const handleNativeIntervalChangeForLayout = useCallback(
    (nextInterval: string) => {
      onIntervalChange?.(nextInterval);
      markNativeLayoutDirtyIfReady();
    },
    [markNativeLayoutDirtyIfReady, onIntervalChange],
  );
  const handleNativeSymbolChangeForLayout = useCallback(
    (nextSymbol: string) => {
      onSymbolChange?.(nextSymbol);
      markNativeLayoutDirtyIfReady();
    },
    [markNativeLayoutDirtyIfReady, onSymbolChange],
  );
  const handleNativeUserDrawingCommandForLayout: UserDrawingCommandEventListener = useCallback(
    (event) => {
      onUserDrawingCommand?.(event);
      if (event.source !== 'layout') markNativeLayoutDirtyIfReady();
    },
    [markNativeLayoutDirtyIfReady, onUserDrawingCommand],
  );
  const nativeLayoutPersistence = useMemo(
    () =>
      resolveNativeDefaultLayoutPersistence({
        autoSaveDelay: auto_save_delay,
        chartKey,
        disableDefaultLayoutPersistence: disable_default_layout_persistence,
        saveLoadAdapter: save_load_adapter,
        storage: uiPreferencesStorage,
      }),
    [auto_save_delay, chartKey, disable_default_layout_persistence, save_load_adapter, uiPreferencesStorage],
  );
  const chartStore = useMemo(
    () =>
      getChartStore(chartKey, {
        uiPreferencesStorage,
        defaultUiPreferences: NATIVE_CHART_UI_DEFAULTS,
      }),
    [chartKey, uiPreferencesStorage],
  );
  const [uiPreferences, setUiPreferences] = useState(() => chartStore.uiPreferences.get());
  const [nativeCurrentLayout, setNativeCurrentLayout] = useState<CurrentLayoutState>(() =>
    chartStore.currentLayout.get(),
  );
  const [nativeSaveStatus, setNativeSaveStatus] = useState<SaveStatus>(() => chartStore.saveStatus.get());
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
  useEffect(() => {
    setNativeCurrentLayout(chartStore.currentLayout.get());
    return chartStore.currentLayout.listen((nextLayout) => {
      setNativeCurrentLayout(nextLayout);
    });
  }, [chartStore]);
  useEffect(() => {
    setNativeSaveStatus(chartStore.saveStatus.get());
    return chartStore.saveStatus.listen((nextStatus) => {
      setNativeSaveStatus(nextStatus);
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
    indicatorManager,
    interval,
    isLoading,
    isLoadingMoreBars,
    requestMoreBars,
    setImperativeTheme,
    symbol,
  } = useNativeTealchartCoreRuntime({
    datafeed,
    onIntervalChange: handleNativeIntervalChangeForLayout,
    onLayoutDirty: markNativeLayoutDirtyIfReady,
    onSymbolChange: handleNativeSymbolChangeForLayout,
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
  const handleNativeViewportChangeForLayout = useCallback(
    (nextViewport: Viewport) => {
      onViewportChange?.(nextViewport);
      markNativeLayoutDirtyIfReady();
    },
    [markNativeLayoutDirtyIfReady, onViewportChange],
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
    [chartApi, setImperativeTheme],
  );

  const { frame, margins, onLayout, options } = useNativeSkiaLayoutRuntime({
    imperativeTheme,
    leftToolRailCollapsed,
    marginsProp,
    pricePrecision: nativePricePrecision,
    propHeight: layoutPropHeight,
    propWidth: layoutPropWidth,
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
    applyNativeViewport,
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
    onViewportChange: handleNativeViewportChangeForLayout,
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
    replaceNativeUserDrawingState,
    selectNativeUserDrawingAtPoint,
    selectNativeUserDrawingTool,
    undoNativeUserDrawingCommand,
    updateNativeUserDrawingEditDrag,
    userDrawingCommandAvailability,
    userDrawingRecentToolsByCategory,
    userDrawingState: nativeUserDrawingState,
  } = useNativeUserDrawingRuntime({
    initialUserDrawingState: userDrawingState,
    onUserDrawingCommand: handleNativeUserDrawingCommandForLayout,
    onUserDrawingStateChange,
  });
  const nativeUserDrawingDrawings = nativeUserDrawingState.drawings;
  const nativeUserDrawingSelection = nativeUserDrawingState.selection;
  const nativeUserDrawingDraft = nativeUserDrawingState.draft;
  const nativeUserDrawingMeasure = nativeUserDrawingState.measure;
  const nativeUserDrawingTextEdit = nativeUserDrawingState.textEdit;
  const nativeUserDrawingDefaultStylesByKind = nativeUserDrawingState.defaultStylesByKind;
  const applyNativeLayoutSettings = useCallback(
    async (settings: ChartSettings) => {
      const nextSymbol = settings.symbol || symbol;
      if (nextSymbol && nextSymbol !== chartApi.symbol()) {
        chartApi.setSymbol(nextSymbol);
      }

      if (settings.interval && settings.interval !== chartApi.resolution()) {
        setNativeDisplayedInterval(settings.interval);
        chartApi.setResolution(settings.interval);
      }

      for (const study of chartApi.getAllStudies()) {
        chartApi.removeStudy(study.id);
      }
      for (const indicator of settings.indicators ?? []) {
        const builtinIndicator = getIndicatorById(indicator.builtinId);
        if (!builtinIndicator) continue;
        await chartApi.createStudy(
          builtinIndicator.id,
          builtinIndicator.overlay,
          false,
          indicator.inputs,
          {},
          { displayName: indicator.name },
        );
      }

      replaceNativeUserDrawingState(settings.userDrawingState);
      chartStore.settings.set({
        ...chartStore.settings.get(),
        autoScale: settings.autoScale,
        chartType: settings.chartType || 'candle',
        indicators: settings.indicators || [],
        interval: settings.interval || interval,
        showVolume: settings.showVolume,
        symbol: nextSymbol,
        userDrawingState: settings.userDrawingState,
        viewport: settings.viewport,
        volumeHeight: settings.volumeHeight,
      });
      if (settings.viewport) {
        applyNativeViewport(settings.viewport);
      }
    },
    [applyNativeViewport, chartApi, chartStore, interval, replaceNativeUserDrawingState, symbol],
  );
  const nativeLayoutSettings = createNativeChartLayoutSettings({
    autoScale: nativeAutoScaleEnabled,
    chartType: 'candle',
    indicators: indicatorManager?.getLayoutIndicators() ?? [],
    interval: interval as ResolutionString,
    showVolume: true,
    symbol,
    userDrawingState: nativeUserDrawingState,
    viewport: hasDataViewport ? viewport : undefined,
    volumeHeight: VOLUME_HEIGHT_RATIO,
  });
  const {
    deleteNativeLayout,
    getNativeLayouts,
    loadNativeLayout,
    markNativeLayoutDirty,
    renameNativeLayout,
    saveNativeLayoutAs,
    saveNativeLayoutNow,
  } = useNativeLayoutPersistence({
    autoSaveDelay: nativeLayoutPersistence.autoSaveDelay,
    chartStore,
    currentLayoutStorage: nativeLayoutPersistence.currentLayoutStorage,
    currentLayoutStorageKey: nativeLayoutPersistence.currentLayoutStorageKey,
    currentSettings: nativeLayoutSettings,
    onApplyLayout: applyNativeLayoutSettings,
    readyToCreateDefaultLayout: hasDataViewport,
    saveLoadAdapter: nativeLayoutPersistence.saveLoadAdapter,
  });
  useEffect(() => {
    nativeLayoutDirtyRef.current = markNativeLayoutDirty;
    return () => {
      if (nativeLayoutDirtyRef.current === markNativeLayoutDirty) {
        nativeLayoutDirtyRef.current = () => undefined;
      }
    };
  }, [markNativeLayoutDirty]);
  const nativeLayoutSelectorEnabled = nativeLayoutPersistence.saveLoadAdapter !== null;
  const [nativeLayoutSelectorOpen, setNativeLayoutSelectorOpen] = useState(false);
  const [nativeLayoutSelectorLayouts, setNativeLayoutSelectorLayouts] = useState<LayoutMetadata[]>([]);
  const [nativeLayoutSelectorLoading, setNativeLayoutSelectorLoading] = useState(false);
  const [nativeLayoutSelectorError, setNativeLayoutSelectorError] = useState<string | null>(null);
  const refreshNativeLayoutSelector = useCallback(async () => {
    if (!nativeLayoutSelectorEnabled) return;
    setNativeLayoutSelectorLoading(true);
    setNativeLayoutSelectorError(null);
    try {
      setNativeLayoutSelectorLayouts(await getNativeLayouts());
    } catch {
      setNativeLayoutSelectorError('Could not load layouts');
    } finally {
      setNativeLayoutSelectorLoading(false);
    }
  }, [getNativeLayouts, nativeLayoutSelectorEnabled]);
  useEffect(() => {
    if (!nativeLayoutSelectorOpen) return;
    void refreshNativeLayoutSelector();
  }, [nativeLayoutSelectorOpen, refreshNativeLayoutSelector]);
  useEffect(() => {
    if (!nativeLayoutSelectorEnabled) {
      setNativeLayoutSelectorOpen(false);
      setNativeLayoutSelectorLayouts([]);
    }
  }, [nativeLayoutSelectorEnabled]);
  const openNativeLayoutSelector = useCallback(() => {
    if (!nativeLayoutSelectorEnabled) return;
    setNativeLayoutSelectorOpen(true);
  }, [nativeLayoutSelectorEnabled]);
  const handleNativeLayoutSelectorLoad = useCallback(
    (layoutId: string | number) => {
      setNativeLayoutSelectorLoading(true);
      setNativeLayoutSelectorError(null);
      void loadNativeLayout(layoutId)
        .then(() => {
          setNativeLayoutSelectorOpen(false);
        })
        .catch(() => {
          setNativeLayoutSelectorError('Could not load layout');
        })
        .finally(() => {
          setNativeLayoutSelectorLoading(false);
        });
    },
    [loadNativeLayout],
  );
  const handleNativeLayoutSelectorSave = useCallback(() => {
    setNativeLayoutSelectorLoading(true);
    setNativeLayoutSelectorError(null);
    void saveNativeLayoutNow()
      .then(refreshNativeLayoutSelector)
      .catch(() => {
        setNativeLayoutSelectorError('Could not save layout');
      })
      .finally(() => {
        setNativeLayoutSelectorLoading(false);
      });
  }, [refreshNativeLayoutSelector, saveNativeLayoutNow]);
  const handleNativeLayoutSelectorSaveAs = useCallback(
    (layoutName: string) => {
      setNativeLayoutSelectorLoading(true);
      setNativeLayoutSelectorError(null);
      void saveNativeLayoutAs(layoutName)
        .then(refreshNativeLayoutSelector)
        .catch(() => {
          setNativeLayoutSelectorError('Could not save layout');
        })
        .finally(() => {
          setNativeLayoutSelectorLoading(false);
        });
    },
    [refreshNativeLayoutSelector, saveNativeLayoutAs],
  );
  const handleNativeLayoutSelectorRename = useCallback(
    (layoutId: string | number, nextName: string) => {
      setNativeLayoutSelectorLoading(true);
      setNativeLayoutSelectorError(null);
      void renameNativeLayout(layoutId, nextName)
        .then(refreshNativeLayoutSelector)
        .catch(() => {
          setNativeLayoutSelectorError('Could not rename layout');
        })
        .finally(() => {
          setNativeLayoutSelectorLoading(false);
        });
    },
    [refreshNativeLayoutSelector, renameNativeLayout],
  );
  const handleNativeLayoutSelectorDelete = useCallback(
    (layoutId: string | number) => {
      setNativeLayoutSelectorLoading(true);
      setNativeLayoutSelectorError(null);
      void deleteNativeLayout(layoutId)
        .then(refreshNativeLayoutSelector)
        .catch(() => {
          setNativeLayoutSelectorError('Could not delete layout');
        })
        .finally(() => {
          setNativeLayoutSelectorLoading(false);
        });
    },
    [deleteNativeLayout, refreshNativeLayoutSelector],
  );
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
      if (!dragPoint) return;
      beginNativeUserDrawingEditDragAtPoint(dragPoint.point, dragPoint.spacesByPaneId);
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
    onLayoutClick: nativeLayoutSelectorEnabled ? openNativeLayoutSelector : undefined,
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
    layoutName: nativeCurrentLayout.layoutName,
    layoutSelectorEnabled: nativeLayoutSelectorEnabled,
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
  const nativeUserDrawingSelectionActionOverlayModel = useMemo(
    () =>
      frame
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
  const nativeUserDrawingSelectionActionTargets = useMemo(
    () => resolveNativeSelectedDrawingActionHitTargets(nativeUserDrawingSelectionActionOverlayModel),
    [nativeUserDrawingSelectionActionOverlayModel],
  );
  const nativeUserDrawingEditDragZones = useMemo(
    () =>
      nativeDrawingSelectionEnabled
        ? resolveNativeUserDrawingEditDragZones({
            anchor: nativeUserDrawingSelectionActionAnchor,
            drawings: nativeUserDrawingDrawings,
            selection: nativeUserDrawingSelection,
            spacesByPaneId: nativeUserDrawingCoordinateSpaces,
          })
        : [],
    [
      nativeDrawingSelectionEnabled,
      nativeUserDrawingCoordinateSpaces,
      nativeUserDrawingDrawings,
      nativeUserDrawingSelection,
      nativeUserDrawingSelectionActionAnchor,
    ],
  );
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

    if (nativeUserDrawingSelectionActionOverlayModel) {
      zones.push({
        x1: nativeUserDrawingSelectionActionOverlayModel.position.left,
        x2:
          nativeUserDrawingSelectionActionOverlayModel.position.left +
          nativeUserDrawingSelectionActionOverlayModel.surfaceWidth,
        y1: nativeUserDrawingSelectionActionOverlayModel.position.top,
        y2:
          nativeUserDrawingSelectionActionOverlayModel.position.top +
          nativeUserDrawingSelectionActionOverlayModel.surfaceHeight,
      });
    }

    return zones;
  }, [
    frame,
    hasDataViewport,
    leftToolRailLayout,
    nativeOpenDrawingCategoryId,
    nativeResetViewButtonLayout,
    nativeResetViewButtonVisible,
    nativeUserDrawingSelectionActionOverlayModel,
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
    onDrawingEditDragBegin: handleNativeUserDrawingEditDragBegin,
    onDrawingEditDragEnd: endNativeUserDrawingEditDrag,
    onDrawingEditDragMove: handleNativeUserDrawingEditDragMove,
    onDrawingSelectionTap: handleNativeUserDrawingSelectionTap,
    onLeftToolRailToggleTap: toggleLeftToolRailCollapsed,
    onContextMenuTap: handleNativeContextMenuTap,
    onSelectedDrawingAction: handleNativeSelectedDrawingAction,
    onSelectedDrawingActionPopoverGroupChange: setNativeSelectedActionPopoverGroupId,
    onResetViewTap: handleNativeResetViewTap,
    panActive,
    pinchActive,
    pricePrecision: nativePricePrecision,
    priceScaleActive,
    resetButtonVisible: nativeResetViewButtonVisible,
    selectedDrawingActionTargets: nativeUserDrawingSelectionActionTargets,
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

  useLayoutEffect(() => {
    if (!resizeFreeze) {
      return;
    }

    if (resizeSnapshotClearTimerRef.current !== null) {
      clearTimeout(resizeSnapshotClearTimerRef.current);
      resizeSnapshotClearTimerRef.current = null;
    }

    if (resizeSnapshotRef.current || !frame || !canvasRef.current) return;

    try {
      const image = canvasRef.current.makeImageSnapshot();
      if (!image) return;
      setResizeSnapshot({
        image,
        width: frame.dimensions.width,
        height: frame.dimensions.height,
      });
    } catch {
      setResizeSnapshot(null);
    }
  }, [canvasRef, frame, resizeFreeze, setResizeSnapshot]);

  useEffect(() => {
    if (resizeFreeze || !resizeSnapshotRef.current || resizeSnapshotClearTimerRef.current !== null) return;

    resizeSnapshotClearTimerRef.current = setTimeout(() => {
      resizeSnapshotClearTimerRef.current = null;
      setResizeSnapshot(null);
    }, RESIZE_SNAPSHOT_RELEASE_HOLD_MS);
  }, [resizeFreeze, setResizeSnapshot]);

  useEffect(() => {
    return () => {
      if (resizeSnapshotClearTimerRef.current !== null) {
        clearTimeout(resizeSnapshotClearTimerRef.current);
      }
      disposeNativeResizeSnapshot(resizeSnapshotRef.current);
      resizeSnapshotRef.current = null;
    };
  }, []);

  const liveChartMounted = !resizeLayoutFrozen && frame && nativeRenderProjection;

  return (
    <View style={[styles.container, { backgroundColor }]} onLayout={onLayout}>
      {liveChartMounted ? (
        <View pointerEvents={resizeSnapshotVisible ? 'none' : 'auto'} style={styles.liveChartLayer}>
          <GestureDetector gesture={nativeChartGesture}>
            <Canvas ref={canvasRef} style={styles.canvas}>
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
        </View>
      ) : null}
      <Canvas style={[styles.snapshotLayer, !resizeSnapshotVisible && styles.hiddenSnapshotLayer]} pointerEvents="none">
        {resizeSnapshot ? (
          <SkiaImage
            fit="fill"
            height={Math.max(propHeight ?? resizeSnapshot.height, 1)}
            image={resizeSnapshot.image}
            width={Math.max(propWidth ?? resizeSnapshot.width, 1)}
            x={0}
            y={0}
          />
        ) : null}
      </Canvas>
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
      {nativeLayoutSelectorOpen ? (
        <NativeLayoutSelectorOverlay
          backgroundColor={backgroundColor}
          currentLayout={nativeCurrentLayout}
          errorText={nativeLayoutSelectorError}
          gridColor={gridColor}
          layouts={nativeLayoutSelectorLayouts}
          loading={nativeLayoutSelectorLoading}
          mutedTextColor={nativeMutedTextColor}
          onClose={() => setNativeLayoutSelectorOpen(false)}
          onDelete={handleNativeLayoutSelectorDelete}
          onLoad={handleNativeLayoutSelectorLoad}
          onRefresh={refreshNativeLayoutSelector}
          onRename={handleNativeLayoutSelectorRename}
          onSave={handleNativeLayoutSelectorSave}
          onSaveAs={handleNativeLayoutSelectorSaveAs}
          saveStatus={nativeSaveStatus}
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
  liveChartLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  snapshotLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  hiddenSnapshotLayer: {
    opacity: 0,
  },
});
