import type { SkImage } from '@shopify/react-native-skia';
import type { PlotOutput, WorkerError } from '@tealstreet/tealscript';
import type { ReactNode } from 'react';
import type { GestureResponderEvent, LayoutRectangle } from 'react-native';
import type {
  UserDrawingCommandEventListener,
  UserDrawingSelectedActionSurfaceCommand,
  UserDrawingSelectedActionSurfaceGroupId,
  UserDrawingState,
  UserDrawingTool,
} from './drawings';
import type { BuiltinIndicator } from './indicators/builtinIndicators';
import type { NativeGestureControlZone } from './mobile/interaction/nativeGestureControlZones';
import type { NativePaneDividerBand } from './mobile/interaction/nativePaneDivider';
import type { NativeChartFrame } from './mobile/render/nativeChartFrame';
import type { NativeGestureDebugOverlayHandle } from './mobile/render/NativeGestureDebugOverlay';
import type {
  NativeLegendActionCommand,
  NativeLegendActionHitTarget,
  NativeLegendIndicator,
  NativeLegendIndicatorPaneInfo,
} from './mobile/render/NativeChartLegendOverlay';
import type { NativeChartSettingsActionCommand } from './mobile/render/NativeChartSettingsOverlay';
import type { NativeCrosshairContextMenuState } from './mobile/render/NativeCrosshairContextMenuOverlay';
import type { NativeIndicatorPaneInfo } from './mobile/render/NativeIndicatorPlotLayer';
import type { NativePaneSnapshot } from './mobile/render/NativePaneDividerResizeLayer';
import type { NativeReleaseHold } from './mobile/interaction/nativeReleaseHold';
import type { NativeSelectedTradeLine, NativeTradeLineObjectType } from './mobile/utils/tradeLineLayout';
import type { ChartSettingsControlContext } from './settings/chartSettingsControls';
import type { ChartSettings, CurrentLayoutState, SaveStatus } from './state/chartState';
import type { ChartThemeInput } from './theme';
import type { ISaveLoadAdapter, LayoutMetadata } from './transformer/saveLoadIntegration';
import type { TealchartKeyValueStorage } from './transformer/storageSaveLoadAdapter';
import type {
  ContextMenuCallback,
  ContextMenuRenderContext,
  IBasicDataFeed,
  NativeContextMenuRenderResult,
  PriceLine,
  RenderOptions,
  ResolutionString,
  Viewport,
} from './types';
import type { PaneMaximizeState } from './utils/paneMaximize';
import type { ITealchartWidget, SaveChartErrorInfo } from './widgetContract';

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

import { Canvas, Skia, Image as SkiaImage, useCanvasRef } from '@shopify/react-native-skia';
import { Platform, StyleSheet, View } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import { useFrameCallback, useSharedValue } from 'react-native-reanimated';

import { LOADING_OPACITY } from './constants';
import {
  resolveUserDrawingObjectTreeModel,
  resolveUserDrawingRenderEntriesFromSlices,
  resolveUserDrawingSelectionActionAnchorFromDrawings,
} from './drawings';
import { EventEmitter } from './events/EventEmitter';
import { getIndicatorById } from './indicators/builtinIndicators';
import { isNativeGestureControlPoint } from './mobile/interaction/nativeGestureControlZones';
import { NativeGestureDebugOverlay } from './mobile/render/NativeGestureDebugOverlay';
import {
  createNativePaneGeometrySignature,
  createNativePaneRatioTarget,
  createNativeReleaseHold,
  nativePaneDividerBandsCaughtUp,
  nativePaneRangeOverridesCaughtUp,
  nativePaneRatiosCaughtUp,
  omitReleasedNativePaneRangeOverrides,
  resolveNativeReleaseHold,
} from './mobile/interaction/nativeReleaseHold';
import {
  NATIVE_RESET_VIEW_DISMISS_MS,
  resolveNativeResetViewButtonLayout,
  resolveNativeResetViewTapTarget,
} from './mobile/interaction/nativeResetViewButton';
import {
  findNativeOrderDragZone,
  findNativeTradeLineActionZone,
  findNativeTradeLineRow,
} from './mobile/interaction/nativeTradeLineHitTest';
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
import {
  NativeChartSettingsButton,
  NativeChartSettingsOverlay,
  resolveNativeChartSettingsActionTargets,
} from './mobile/render/NativeChartSettingsOverlay';
import { NativeCrosshairContextMenuOverlay } from './mobile/render/NativeCrosshairContextMenuOverlay';
import { NativeDrawingCategoryDismissOverlay } from './mobile/render/NativeDrawingCategoryDismissOverlay';
import { NativeIndicatorsOverlay } from './mobile/render/NativeIndicatorsOverlay';
import { NativeLayoutSelectorOverlay } from './mobile/render/NativeLayoutSelectorOverlay';
import {
  NATIVE_LEFT_TOOL_RAIL_DRAWER_WIDTH,
  NativeLeftToolRailOverlay,
} from './mobile/render/NativeLeftToolRailOverlay';
import { NativePaneDividerResizeLayer } from './mobile/render/NativePaneDividerResizeLayer';
import { getNativePaneAtY } from './mobile/render/nativeChartFrame';
import { resolveNativePaneDividerAtY } from './mobile/interaction/nativePaneDivider';
import type { NativePaneRangeOverrides } from './mobile/render/nativePaneRangeOverride';
import { normalizeNativePricePrecisionToTickSizeWorklet } from './mobile/render/nativePriceFormat';
import {
  nativeBarsMatchRequestedData,
  shouldDimNativeRenderForTransition,
  shouldHoldNativeRenderSnapshotForTransition,
  shouldUseNativeStaticRenderProjectionForTransition,
} from './mobile/render/nativeRenderTransition';
import { NativeResetViewButtonOverlay } from './mobile/render/NativeResetViewButtonOverlay';
import { NativeTopBarOverlay } from './mobile/render/NativeTopBarOverlay';
import { NativeUserDrawingObjectTreePanel } from './mobile/render/NativeUserDrawingObjectTreePanel';
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
  shouldRestoreNativeLayoutViewport,
  useNativeLayoutPersistence,
} from './mobile/useNativeLayoutPersistence';
import { useNativeTealchartCoreRuntime } from './mobile/useNativeTealchartCoreRuntime';
import { resolveNativeLeftToolRailToggleHitRect } from './mobile/utils/leftToolRailLayout';
import {
  applyNativePaneHeightOverrides,
  createNativePaneLayoutSignature,
  pruneNativePaneHeightOverrides,
} from './mobile/utils/nativePaneLayoutOverrides';
import { createNativePriceAxisLaneWidth } from './mobile/utils/nativePriceAxisLane';
import {
  createNativeUserDrawingCoordinateSpaces,
  resolveNativeUserDrawingInputPoint,
  resolveNativeUserDrawingSelectionPoint,
} from './mobile/utils/nativeUserDrawingGeometry';
import {
  getNativeOrderObjectId as getOrderObjectId,
  getNativePositionObjectId as getPositionObjectId,
} from './mobile/utils/tradeLineLayout';
import { applyChartOverridesToRenderOptions } from './overrides';
import { AVAILABLE_TIMEFRAMES, filterTimeframesBySupportedResolutions, getChartStore } from './state/chartState';
import { TealchartApi } from './TealchartApi';
import { DEFAULT_MARGINS } from './types';
import { NATIVE_PRICE_AXIS_TAG_SIZING } from './utils/priceAxisTagSizing';
import { IDLE_PANE_MAXIMIZE_STATE, togglePaneMaximize } from './utils/paneMaximize';
import { intervalToMs } from './viewport/viewScale';

const STATIC_TOP_BAR_HEIGHT = 36;
const TRADE_LABEL_HEIGHT = 18;
const TRADE_AXIS_TAG_HEIGHT = NATIVE_PRICE_AXIS_TAG_SIZING.trade.height;
const VOLUME_HEIGHT_RATIO = 0.15;
const NATIVE_CHART_UI_DEFAULTS = { leftToolRailCollapsed: true };
const EMPTY_NATIVE_USER_DRAWING_ANCHORS: NonNullable<UserDrawingState['draft']>['anchors'] = [];
const EMPTY_NATIVE_PRICE_LINES: PriceLine[] = [];
const EMPTY_NATIVE_INDICATOR_PLOTS: readonly PlotOutput[] = [];
const RESIZE_SNAPSHOT_RELEASE_HOLD_MS = 30;
const NATIVE_PANE_MAXIMIZE_HOLD_CEILING_MS = 250;
// Ceiling for a divider preview whose committed bands never arrive. Without it
// a pane that disappears mid-release freezes its stretched bitmap over the
// chart. It must outlast the settle fence, or it becomes the release path.
const NATIVE_PANE_DIVIDER_HOLD_CEILING_MS = 1200;
// Freeing the bitmaps trails the settle fence, so disposal can never uncover a
// preview that is still drawing.
const NATIVE_PANE_DIVIDER_DISPOSE_MS = 600;
const NATIVE_ANDROID_GESTURE_DEBUG_OVERLAY = Platform.OS === 'android';

interface NativePaneDividerReleaseTarget {
  bands: readonly NativePaneDividerBand[];
  ratios: Readonly<Record<string, number>>;
}

interface NativeResizeSnapshot {
  height: number;
  image: SkImage;
  width: number;
}

function disposeNativeResizeSnapshot(snapshot: NativeResizeSnapshot | null): void {
  snapshot?.image.dispose();
}

function formatNativeDebugNumber(value: number | null | undefined): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 'n/a';
  return `${Math.round(value)}`;
}

function formatNativeDebugRange(start: number | null | undefined, end: number | null | undefined): string {
  return `${formatNativeDebugNumber(start)}-${formatNativeDebugNumber(end)}`;
}

function formatNativePaneRatioDebug(ratios: Readonly<Record<string, number>>): string {
  return Object.entries(ratios)
    .map(([paneId, ratio]) => `${paneId}:${ratio.toFixed(3)}`)
    .join(',');
}

/** Per-band top/height gap against the committed frame - what caughtUp measures. */
function formatNativePaneDividerBandDeltaDebug(
  bands: readonly NativePaneDividerBand[],
  panes: readonly { height: number; id: string; top: number }[],
): string {
  return bands
    .map((band, index) => {
      const pane = panes.find((candidate) => candidate.id === band.paneId);
      if (!pane) return `${index}:gone`;
      return `${index}:${formatNativeDebugNumber(pane.top - band.top)}/${formatNativeDebugNumber(pane.height - band.height)}`;
    })
    .join('|');
}

/**
 * Satisfies the same widget contract as the web `TealchartWidget`, so one host
 * lifecycle can drive either platform. `changeTheme` is a Tealstreet extension
 * with no TradingView counterpart, so it stays an own member.
 */
export interface SkiaTealchartHandle extends ITealchartWidget {
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
  /**
   * Renders the whole menu instead of a list of items. Given one, the chart
   * places and dismisses it exactly as it would its own menu and draws nothing
   * inside it. What it returns is captured at the tap and held until the menu
   * closes, so anything live inside it has to subscribe for itself.
   */
  renderContextMenu?: (context: ContextMenuRenderContext) => ReactNode | NativeContextMenuRenderResult;
  /** Called when anything but the host dismisses a host-rendered menu. */
  onContextMenuClose?: () => void;
  onViewportChange?: (viewport: Viewport) => void;
  onIntervalChange?: (interval: string) => void;
  onSymbolClick?: () => void;
  onSymbolChange?: (symbol: string) => void;
  onTealscriptError?: (scriptId: string, error: WorkerError) => void;
  onUserDrawingCommand?: UserDrawingCommandEventListener;
  onUserDrawingStateChange?: (state: UserDrawingState) => void;
  resizeFreeze?: boolean;
}

function resolveNativeContextMenuRenderResult(
  value: ReactNode | NativeContextMenuRenderResult | null | undefined,
): NativeContextMenuRenderResult | null {
  if (!value) return null;
  if (typeof value === 'object' && 'content' in value) return value as NativeContextMenuRenderResult;
  return { content: value };
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
    pricePrecision,
    showTopBar = true,
    supportedResolutions,
    userDrawingState,
    onContextMenu,
    renderContextMenu,
    onContextMenuClose,
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
  const [nativeChartProperties, setNativeChartProperties] = useState(() => chartStore.settings.get().chartProperties);
  const [nativePreservedTvProperties, setNativePreservedTvProperties] = useState(
    () => chartStore.settings.get().preservedTvProperties,
  );
  const [nativeShowVolume, setNativeShowVolume] = useState(() => chartStore.settings.get().showVolume);
  const [nativeShowIndicatorOutputAxisLabels, setNativeShowIndicatorOutputAxisLabels] = useState(
    () => chartStore.settings.get().showIndicatorOutputAxisLabels,
  );
  const [nativeChartSettingsOpen, setNativeChartSettingsOpen] = useState(false);
  const [nativeIndicatorsOpen, setNativeIndicatorsOpen] = useState(false);
  useEffect(() => {
    setNativeAutoScaleEnabled(chartStore.settings.get().autoScale);
    setNativeChartProperties(chartStore.settings.get().chartProperties);
    setNativePreservedTvProperties(chartStore.settings.get().preservedTvProperties);
    setNativeShowVolume(chartStore.settings.get().showVolume);
    setNativeShowIndicatorOutputAxisLabels(chartStore.settings.get().showIndicatorOutputAxisLabels);
    return chartStore.settings.listen((nextSettings) => {
      setNativeAutoScaleEnabled(nextSettings.autoScale);
      setNativeChartProperties(nextSettings.chartProperties);
      setNativePreservedTvProperties(nextSettings.preservedTvProperties);
      setNativeShowVolume(nextSettings.showVolume);
      setNativeShowIndicatorOutputAxisLabels(nextSettings.showIndicatorOutputAxisLabels);
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
  const nativeTopBarTimeframeValues = useMemo(
    () => new Set<ResolutionString>(uiPreferences.favoriteTimeframeValues),
    [uiPreferences.favoriteTimeframeValues],
  );
  const nativeTopBarMenuTimeframes = useMemo(
    () => filterTimeframesBySupportedResolutions(supportedResolutions, AVAILABLE_TIMEFRAMES),
    [supportedResolutions],
  );
  const [nativeOpenDrawingCategoryId, setNativeOpenDrawingCategoryId] = useState<string | null>(null);
  const toggleLeftToolRailCollapsed = useCallback(() => {
    chartStore.uiPreferences.setKey('leftToolRailCollapsed', !chartStore.uiPreferences.get().leftToolRailCollapsed);
  }, [chartStore]);
  const toggleNativeFavoriteTimeframe = useCallback(
    (timeframe: ResolutionString) => {
      const current = new Set(chartStore.uiPreferences.get().favoriteTimeframeValues);
      if (current.has(timeframe)) {
        current.delete(timeframe);
      } else {
        current.add(timeframe);
      }
      const nextFavorites = AVAILABLE_TIMEFRAMES.map((option) => option.value).filter((value) => current.has(value));
      chartStore.uiPreferences.setKey('favoriteTimeframeValues', nextFavorites);
    },
    [chartStore],
  );
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
  const [nativeLegendActionTargets, setNativeLegendActionTargets] = useState<readonly NativeLegendActionHitTarget[]>(
    [],
  );
  const [nativeChartSettingsButtonLayout, setNativeChartSettingsButtonLayout] = useState<LayoutRectangle | null>(null);
  const handleNativeChartSettingsButtonLayout = useCallback((layout: LayoutRectangle) => {
    setNativeChartSettingsButtonLayout((previous) =>
      previous &&
      previous.x === layout.x &&
      previous.y === layout.y &&
      previous.width === layout.width &&
      previous.height === layout.height
        ? previous
        : layout,
    );
  }, []);
  // Dropped while the sheet is open so the scrim tap that dismisses it cannot
  // also land on the gear underneath and reopen it.
  const nativeChartSettingsActionTargets = useMemo(
    () => (nativeChartSettingsOpen ? [] : resolveNativeChartSettingsActionTargets(nativeChartSettingsButtonLayout)),
    [nativeChartSettingsButtonLayout, nativeChartSettingsOpen],
  );
  useEffect(() => {
    setNativeDisplayedInterval(interval);
  }, [interval]);
  const nativePricePrecision = useMemo(
    () => normalizeNativePricePrecisionToTickSizeWorklet(pricePrecision ?? Number.NaN),
    [pricePrecision],
  );
  const createNativeInitialPriceAxisWidth = useCallback(
    () => createNativePriceAxisLaneWidth({ pricePrecision: nativePricePrecision, measurementTexts: [] }),
    [nativePricePrecision],
  );
  const [nativePriceAxisWidth, setNativePriceAxisWidth] = useState(createNativeInitialPriceAxisWidth);
  useEffect(() => {
    const nextWidth = createNativeInitialPriceAxisWidth();
    setNativePriceAxisWidth((current) => Math.max(current, nextWidth));
  }, [createNativeInitialPriceAxisWidth]);
  // The overlay's append callback is defined further down, after the gesture
  // runtime it reads flags from. Render-side handoff probes above that point
  // reach it through this sink; on-device is the only place these are readable.
  const nativeGestureDebugSinkRef = useRef<((message: string) => void) | null>(null);
  const emitNativeChartDebugEntry = useCallback((message: string) => {
    nativeGestureDebugSinkRef.current?.(message);
  }, []);
  const nativeReleaseHoldTokenRef = useRef(0);
  const createNextNativeReleaseHoldToken = useCallback(() => {
    nativeReleaseHoldTokenRef.current += 1;
    return nativeReleaseHoldTokenRef.current;
  }, []);
  const [nativePaneRangeReleaseHold, setNativePaneRangeReleaseHold] =
    useState<NativeReleaseHold<NativePaneRangeOverrides> | null>(null);
  const [nativePaneDividerReleaseHold, setNativePaneDividerReleaseHold] =
    useState<NativeReleaseHold<NativePaneDividerReleaseTarget> | null>(null);
  // Pane geometry the divider preview is waiting to see painted, not merely
  // committed. Null once the canvas has echoed it back.
  const [nativePaneDividerPresentationTarget, setNativePaneDividerPresentationTarget] = useState<string | null>(null);
  const [nativeMaximizeReleaseHold, setNativeMaximizeReleaseHold] =
    useState<NativeReleaseHold<Readonly<Record<string, number>>> | null>(null);
  // Pane heights the user set by dragging a divider. Chart-owned, exactly as web
  // keeps them in ChartCore rather than pushing them back into the manager.
  const [nativePaneHeightOverrides, setNativePaneHeightOverrides] = useState<Readonly<Record<string, number>>>({});
  const handleNativePaneHeightsChange = useCallback(
    (heights: readonly { heightRatio: number; paneId: string }[], bands: readonly NativePaneDividerBand[]) => {
      const target = createNativePaneRatioTarget(heights);
      if (Object.keys(target).length > 0) {
        emitNativeChartDebugEntry(`divider commit ${formatNativePaneRatioDebug(target)}`);
        setNativePaneDividerReleaseHold(
          createNativeReleaseHold({
            kind: 'paneDividerResize',
            releaseFrames: 0,
            target: { bands, ratios: target },
            token: createNextNativeReleaseHoldToken(),
          }),
        );
      }
      setNativePaneHeightOverrides((current) => {
        let changed = false;
        const next = { ...current };
        for (const { heightRatio, paneId } of heights) {
          if (next[paneId] === heightRatio) continue;
          next[paneId] = heightRatio;
          changed = true;
        }
        return changed ? next : current;
      });
    },
    [createNextNativeReleaseHoldToken, emitNativeChartDebugEntry],
  );

  const nativePaneMaximizeStateRef = useRef<PaneMaximizeState>(IDLE_PANE_MAXIMIZE_STATE);
  // Inside the canvas a maximize is atomic now: every consumer of pane geometry
  // reads it through a derived value, so the commit paints all-old and the
  // propagation after it paints all-new, both self-consistent. The legend cannot
  // join that channel - it is a React Native view outside the canvas, and it
  // drops a pane's rows the moment the pane's height reaches zero - so it uses
  // the same release-hold controller as divider/range gestures.
  const nativeMaximizeHolding = nativeMaximizeReleaseHold !== null;
  const nativeMaximizeFrameRef = useRef<NativeChartFrame | null>(null);
  const nativeMaximizeHoldTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancelNativeMaximizeHoldTimeout = useCallback(() => {
    if (nativeMaximizeHoldTimeoutRef.current === null) return;
    clearTimeout(nativeMaximizeHoldTimeoutRef.current);
    nativeMaximizeHoldTimeoutRef.current = null;
  }, []);

  const handleNativeTogglePaneMaximize = useCallback(
    (paneId: string) => {
      const panes = nativePaneLayoutRef.current?.panes;
      if (!panes) return;
      const toggled = togglePaneMaximize(nativePaneMaximizeStateRef.current, panes, paneId);
      if (!toggled) return;
      nativePaneMaximizeStateRef.current = toggled.state;

      cancelNativeMaximizeHoldTimeout();
      setNativeMaximizeReleaseHold(
        createNativeReleaseHold({
          kind: 'paneMaximizeLegend',
          target: toggled.heightRatios,
          token: createNextNativeReleaseHoldToken(),
        }),
      );
      setNativePaneHeightOverrides((current) => ({ ...current, ...toggled.heightRatios }));
    },
    [cancelNativeMaximizeHoldTimeout, createNextNativeReleaseHoldToken],
  );

  const nativeIndicatorPaneLayoutBase = indicatorManager?.getUnifiedLayout();
  const nativePaneLayoutBaseIds = (nativeIndicatorPaneLayoutBase?.panes ?? []).map((pane) => pane.id).join('|');
  // Deleting the indicator under a dragged divider used to leave its half of the
  // ratio behind, and pane heights are absolute shares - the main pane laid out
  // at 15% of the plot with the rest blank.
  useEffect(() => {
    const paneIds = nativePaneLayoutBaseIds === '' ? [] : nativePaneLayoutBaseIds.split('|');
    setNativePaneHeightOverrides((current) => pruneNativePaneHeightOverrides(current, paneIds));
  }, [nativePaneLayoutBaseIds]);
  // Keyed on the signature, never on the layout object: the manager mints a new
  // wrapper per call, so once a divider drag leaves height overrides behind an
  // object-keyed memo hands back a new layout every render, and the frame and
  // every gesture rebuild with it.
  const nativePaneLayoutSignature = createNativePaneLayoutSignature(
    nativeIndicatorPaneLayoutBase,
    nativePaneHeightOverrides,
  );
  const nativePaneLayoutInputRef = useRef({
    base: nativeIndicatorPaneLayoutBase,
    overrides: nativePaneHeightOverrides,
  });
  nativePaneLayoutInputRef.current.base = nativeIndicatorPaneLayoutBase;
  nativePaneLayoutInputRef.current.overrides = nativePaneHeightOverrides;
  const nativeIndicatorPaneLayout = useMemo(() => {
    const { base, overrides } = nativePaneLayoutInputRef.current;
    return base ? applyNativePaneHeightOverrides(base, overrides) : base;
  }, [nativePaneLayoutSignature]);
  // The maximize toggle runs off a gesture callback, so it reads the panes from
  // a ref rather than closing over a layout that re-renders under it.
  const nativePaneLayoutRef = useRef(nativeIndicatorPaneLayout);
  nativePaneLayoutRef.current = nativeIndicatorPaneLayout;
  // Panes added or removed while maximized restore first, the way web's
  // PaneManager does - otherwise the survivors keep the 0 ratios that the
  // vanished pane's maximize gave them and the chart renders empty.
  useEffect(() => {
    const { maximizedPaneId, savedHeightRatios } = nativePaneMaximizeStateRef.current;
    if (!maximizedPaneId || !savedHeightRatios) return;
    const panes = nativeIndicatorPaneLayoutBase?.panes ?? [];
    const samePanes =
      panes.length === Object.keys(savedHeightRatios).length &&
      panes.every((pane) => savedHeightRatios[pane.id] !== undefined);
    if (samePanes) return;
    nativePaneMaximizeStateRef.current = IDLE_PANE_MAXIMIZE_STATE;
    cancelNativeMaximizeHoldTimeout();
    setNativeMaximizeReleaseHold(
      createNativeReleaseHold({
        kind: 'paneMaximizeLegend',
        target: savedHeightRatios,
        token: createNextNativeReleaseHoldToken(),
      }),
    );
    setNativePaneHeightOverrides((current) => ({ ...current, ...savedHeightRatios }));
    // Keyed on the signature: the layout object itself is minted fresh per call.
  }, [cancelNativeMaximizeHoldTimeout, createNextNativeReleaseHoldToken, nativePaneLayoutSignature]);

  // Both counters are read every render; the manager advances them only when
  // the thing each memo actually reads has moved.
  const nativeIndicatorPlotsRevision = indicatorManager?.getPlotsRevision() ?? 0;
  const nativeIndicatorsRevision = indicatorManager?.getIndicatorsRevision() ?? 0;
  const nativeIndicatorPlots = useMemo<readonly PlotOutput[]>(
    () => indicatorManager?.getPlots() ?? EMPTY_NATIVE_INDICATOR_PLOTS,
    [indicatorManager, nativeIndicatorPlotsRevision],
  );
  const nativeIndicatorPaneInfo = useMemo<Readonly<Record<string, NativeIndicatorPaneInfo>>>(() => {
    const paneInfo = indicatorManager?.getIndicatorPaneInfo() ?? {};
    const panes = nativeIndicatorPaneLayout?.panes ?? [];
    const result: Record<string, NativeIndicatorPaneInfo> = {};

    for (const [scriptId, info] of Object.entries(paneInfo)) {
      const pane = panes.find(
        (candidate) => candidate.type === 'indicator' && candidate.indicatorIds?.includes(scriptId),
      );
      result[scriptId] = {
        overlay: info.overlay,
        paneId: pane?.id,
      };
    }

    return result;
  }, [indicatorManager, nativeIndicatorsRevision, nativeIndicatorPaneLayout]);
  // Keyed on the indicator revision, never on the pane layout: hiding the only
  // indicator in a pane leaves the layout untouched, so the eye icon and the
  // dimmed row stayed on the value from before the tap.
  const nativeLegendIndicators = useMemo<readonly NativeLegendIndicator[]>(
    () =>
      indicatorManager?.getIndicators().map((indicator) => ({
        id: indicator.instanceId,
        inputs: indicator.inputs ?? {},
        isVisible: indicator.isVisible,
        name: indicator.indicator.name,
      })) ?? [],
    [indicatorManager, nativeIndicatorsRevision],
  );
  const nativeLegendIndicatorPaneInfo = useMemo<Readonly<Record<string, NativeLegendIndicatorPaneInfo>>>(() => {
    const paneInfo = indicatorManager?.getIndicatorPaneInfo() ?? {};
    const panes = nativeIndicatorPaneLayout?.panes ?? [];
    const result: Record<string, NativeLegendIndicatorPaneInfo> = {};

    for (const [scriptId, info] of Object.entries(paneInfo)) {
      const pane = panes.find(
        (candidate) => candidate.type === 'indicator' && candidate.indicatorIds?.includes(scriptId),
      );
      result[scriptId] = {
        inputs: info.inputs,
        name: info.name,
        overlay: info.overlay,
        paneId: pane?.id,
      };
    }

    return result;
  }, [indicatorManager, nativeIndicatorsRevision, nativeIndicatorPaneLayout]);
  const handleNativeToggleIndicator = useCallback(
    (indicatorId: string) => {
      chartApi.toggleStudyVisibility(indicatorId);
    },
    [chartApi],
  );
  const handleNativeRemoveIndicator = useCallback(
    (indicatorId: string) => {
      chartApi.removeStudy(indicatorId);
    },
    [chartApi],
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
    paneDividerBands,
    paneRangeOverrides,
    sharedPriceAxisTagSources,
    sharedViewport,
    timeScaleActive,
    timeScaleGestureState,
    tradeLineActionZones,
    tradeLineRows,
    viewportGestureOwner,
    viewportSyncEpoch,
  } = useNativeSkiaInteractionRuntime({ autoScaleEnabled: nativeAutoScaleEnabled });

  // One bitmap per pane, captured when a divider drag starts. The drag stretches
  // these instead of re-laying-out the chart every frame; committing the real
  // heights per frame is correct and unusably slow.
  const [nativePaneSnapshots, setNativePaneSnapshots] = useState<readonly NativePaneSnapshot[]>([]);
  const [nativeSelectedTradeLine, setNativeSelectedTradeLine] = useState<NativeSelectedTradeLine | null>(null);
  const handleNativeSelectTradeLine = useCallback((objectType: NativeTradeLineObjectType, objectId: string) => {
    setNativeSelectedTradeLine({ objectType, objectId });
  }, []);
  const handleNativeClearTradeLineSelection = useCallback(() => {
    setNativeSelectedTradeLine(null);
  }, []);
  const nativePaneSnapshotsRef = useRef<readonly NativePaneSnapshot[]>([]);
  const replaceNativePaneSnapshots = useCallback((next: readonly NativePaneSnapshot[]) => {
    for (const snapshot of nativePaneSnapshotsRef.current) snapshot.image.dispose();
    nativePaneSnapshotsRef.current = next;
    setNativePaneSnapshots(next);
  }, []);
  const nativePaneSnapshotFrameRef = useRef<NativeChartFrame | null>(null);
  const clearNativePaneDividerReleaseHold = useCallback(() => {
    setNativePaneDividerReleaseHold(null);
    setNativePaneDividerPresentationTarget(null);
    paneDividerBands.value = [];
    replaceNativePaneSnapshots([]);
  }, [paneDividerBands, replaceNativePaneSnapshots]);

  const handleNativePaneDividerResizeStart = useCallback(() => {
    // Grabbing again before the last release landed must not let that release
    // wipe the bitmaps this drag just captured.
    setNativePaneDividerReleaseHold(null);
    setNativePaneDividerPresentationTarget(null);
    const canvas = canvasRef.current;
    const currentFrame = nativePaneSnapshotFrameRef.current;
    if (!canvas || !currentFrame) return;
    try {
      const captured: NativePaneSnapshot[] = [];
      for (const pane of currentFrame.panes) {
        if (pane.height <= 0) continue;
        const image = canvas.makeImageSnapshot(Skia.XYWHRect(0, pane.top, currentFrame.dimensions.width, pane.height));
        if (!image) continue;
        captured.push({ height: pane.height, image, paneId: pane.id, top: pane.top });
      }
      replaceNativePaneSnapshots(captured);
      emitNativeChartDebugEntry(`divider capture n=${captured.length}`);
    } catch {
      replaceNativePaneSnapshots([]);
      emitNativeChartDebugEntry('divider capture failed');
    }
  }, [canvasRef, emitNativeChartDebugEntry, replaceNativePaneSnapshots]);

  // Success releases through nativePaneDividerReleaseHold, after the committed
  // frame confirms the target ratios. Failed/cancelled gestures have no commit
  // to wait for, so the preview can disappear immediately.
  const handleNativePaneDividerResizeEnd = useCallback(
    (success = true) => {
      if (success) return;
      emitNativeChartDebugEntry('divider abort');
      clearNativePaneDividerReleaseHold();
    },
    [clearNativePaneDividerReleaseHold, emitNativeChartDebugEntry],
  );

  useEffect(
    () => () => {
      clearNativePaneDividerReleaseHold();
    },
    [clearNativePaneDividerReleaseHold],
  );

  // Imperative overrides layer over the prop, mirroring imperativeTheme. Reset
  // when the prop changes so a host that later drives renderOptions by prop is
  // not permanently clobbered by one applyOverrides call.
  const [imperativeRenderOptions, setImperativeRenderOptions] = useState<Partial<RenderOptions> | null>(null);
  useEffect(() => {
    setImperativeRenderOptions(null);
  }, [renderOptions]);
  // Volume comes from persisted settings so the layout and what is drawn cannot
  // disagree. An imperative applyOverrides still wins, matching the widget
  // contract where explicit calls beat stored state.
  const effectiveRenderOptions = useMemo(
    () => ({
      ...applyChartOverridesToRenderOptions(renderOptions ?? {}, nativeChartProperties ?? {}),
      showVolume: nativeShowVolume,
      showIndicatorOutputAxisLabels: nativeShowIndicatorOutputAxisLabels,
      ...(imperativeRenderOptions ?? {}),
    }),
    [
      imperativeRenderOptions,
      nativeChartProperties,
      nativeShowIndicatorOutputAxisLabels,
      nativeShowVolume,
      renderOptions,
    ],
  );

  const widgetEmitterRef = useRef<EventEmitter | null>(null);
  if (!widgetEmitterRef.current) widgetEmitterRef.current = new EventEmitter();
  const widgetEmitter = widgetEmitterRef.current;
  const widgetDisposedRef = useRef(false);
  useEffect(() => {
    return () => {
      widgetDisposedRef.current = true;
      widgetEmitter.removeAllListeners();
    };
  }, [widgetEmitter]);

  // Handle members read through refs: useImperativeHandle deps stay narrow, so a
  // member closing over props or state directly would freeze at first render.
  const effectiveRenderOptionsRef = useRef(effectiveRenderOptions);
  effectiveRenderOptionsRef.current = effectiveRenderOptions;

  // Mirrors the web widget, which emits chart_loaded once the first bars land.
  const chartReadyRef = useRef(false);
  useEffect(() => {
    if (chartReadyRef.current || isLoading || bars.length === 0) return;
    chartReadyRef.current = true;
    chartApi.emitDataLoaded();
    widgetEmitter.emit('chart_loaded');
  }, [bars.length, chartApi, isLoading, widgetEmitter]);

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
      activeChartIndex(): number {
        return 0;
      },
      chartsCount(): number {
        return 1;
      },
      changeTheme(nextTheme: ChartThemeInput): void {
        setImperativeTheme(nextTheme);
      },
      applyOverrides(overrides): void {
        // Accumulate the overrides alone, never a snapshot of the merged result.
        // Snapshotting props here would pin them for the render between a prop
        // change and the reset effect, flashing the previous theme.
        setImperativeRenderOptions((current) => applyChartOverridesToRenderOptions(current ?? {}, overrides));
      },
      /** @stub Accepted and dropped — study overrides are not applied yet. */
      applyStudiesOverrides(): void {},
      headerReady(): Promise<void> {
        return Promise.resolve();
      },
      onChartReady(callback: () => void): void {
        if (widgetDisposedRef.current) return;
        if (chartReadyRef.current) {
          callback();
          return;
        }
        // One-shot, matching the web widget, which clears its ready callbacks
        // after firing. Leaving them subscribed would re-run them on reload.
        const once = () => {
          widgetEmitter.unsubscribe('chart_loaded', once);
          callback();
        };
        widgetEmitter.subscribe('chart_loaded', once);
      },
      onContextMenu(callback: ContextMenuCallback): void {
        setImperativeContextMenu(() => callback);
      },
      /**
       * React owns this component's teardown — unmount effects dispose Skia
       * images, timers and subscriptions. Tearing those down while still mounted
       * would render freed Skia resources, so this only marks the widget dead.
       */
      remove(): void {
        widgetDisposedRef.current = true;
        widgetEmitter.removeAllListeners();
      },
      /** @stub Accepted and dropped — native persists through its save/load adapter. */
      saveChartToServer(_onComplete?: () => void, onFail?: (error: SaveChartErrorInfo) => void): void {
        onFail?.({ message: 'Method not implemented: saveChartToServer' });
      },
      /** @stub Accepted and dropped — there is no CSS surface to target. */
      setCSSCustomProperty(): void {},
      subscribe(event, callback): void {
        if (widgetDisposedRef.current) return;
        widgetEmitter.subscribe(event, callback as (...args: unknown[]) => void);
      },
    }),
    [chartApi, setImperativeTheme, widgetEmitter],
  );

  const { frame, margins, onLayout, options } = useNativeSkiaLayoutRuntime({
    imperativeTheme,
    leftToolRailCollapsed,
    marginsProp,
    paneLayout: nativeIndicatorPaneLayout,
    priceAxisWidth: nativePriceAxisWidth,
    pricePrecision: nativePricePrecision,
    propHeight: layoutPropHeight,
    propWidth: layoutPropWidth,
    renderOptions: effectiveRenderOptions,
    showTopBar,
    theme,
    topBarHeight: STATIC_TOP_BAR_HEIGHT,
  });

  nativePaneSnapshotFrameRef.current = frame;

  // Signature of the geometry the committed frame paints. The divider preview
  // reads it inside the canvas, where hiding the bitmap rides the same mapper
  // run as the plot paths rebuilding. Nothing here decides when the preview
  // disappears - the draw pass does.
  const nativePaneGeometrySignature = frame ? createNativePaneGeometrySignature(frame.panes) : '';
  // Presented frames since the release settled. The preview counts these on the
  // UI thread to outlive the path rebuild; see the fence in
  // NativePaneDividerResizeLayer for why it is a count and not a signal.
  const nativePaneDividerSettleFrames = useSharedValue(0);
  const nativePaneDividerSettling = nativePaneDividerPresentationTarget !== null;
  const nativePaneDividerFrameCallback = useFrameCallback(() => {
    nativePaneDividerSettleFrames.value += 1;
  }, false);
  useEffect(() => {
    // The mock in src/test has no handle; the counter is a device concern.
    if (!nativePaneDividerFrameCallback?.setActive) return;
    nativePaneDividerFrameCallback.setActive(nativePaneDividerSettling);
  }, [nativePaneDividerFrameCallback, nativePaneDividerSettling]);

  // Disposal only, and deliberately later than the hide: the images are freed a
  // whole settle after the bitmap stopped drawing, so this can never uncover it.
  useEffect(() => {
    if (nativePaneDividerPresentationTarget === null) return;
    if (nativePaneDividerPresentationTarget !== nativePaneGeometrySignature) return;
    const timeout = setTimeout(() => {
      emitNativeChartDebugEntry('divider disposed');
      setNativePaneDividerPresentationTarget(null);
      replaceNativePaneSnapshots([]);
    }, NATIVE_PANE_DIVIDER_DISPOSE_MS);
    return () => clearTimeout(timeout);
  }, [
    emitNativeChartDebugEntry,
    nativePaneDividerPresentationTarget,
    nativePaneGeometrySignature,
    replaceNativePaneSnapshots,
  ]);

  // The target-band check is a committed-state gate. Once the live frame's pane
  // pixels match the final dragged bands, the frozen pre-drag bitmap must go
  // away immediately; holding it longer is itself the visible stale-state flap.
  useEffect(() => {
    if (!frame || !nativePaneDividerReleaseHold) return;
    const caughtUp = nativePaneDividerBandsCaughtUp({
      bands: nativePaneDividerReleaseHold.target.bands,
      panes: frame.panes,
    });
    emitNativeChartDebugEntry(
      `divider check caught=${caughtUp ? 'y' : 'n'} d=${formatNativePaneDividerBandDeltaDebug(nativePaneDividerReleaseHold.target.bands, frame.panes)}`,
    );
    const resolution = resolveNativeReleaseHold({
      caughtUp,
      hold: nativePaneDividerReleaseHold,
    });
    if (resolution.hold === nativePaneDividerReleaseHold) return;
    setNativePaneDividerReleaseHold(resolution.hold);
    if (!resolution.released) return;
    // Hands the preview its retirement condition. The bitmap hides itself in
    // the draw pass once the canvas paints this geometry; JS only disposes.
    emitNativeChartDebugEntry('divider settled');
    nativePaneDividerSettleFrames.value = 0;
    setNativePaneDividerPresentationTarget(nativePaneGeometrySignature);
  }, [emitNativeChartDebugEntry, frame, nativePaneDividerReleaseHold, nativePaneGeometrySignature]);

  // Documented ceiling, not the release path: a pane that vanishes mid-release
  // never lands its bands, and the stretched bitmap would cover the chart forever.
  useEffect(() => {
    if (!nativePaneDividerReleaseHold && nativePaneDividerPresentationTarget === null) return;
    const timeout = setTimeout(() => {
      emitNativeChartDebugEntry('divider ceiling');
      clearNativePaneDividerReleaseHold();
    }, NATIVE_PANE_DIVIDER_HOLD_CEILING_MS);
    return () => clearTimeout(timeout);
  }, [
    clearNativePaneDividerReleaseHold,
    emitNativeChartDebugEntry,
    nativePaneDividerPresentationTarget,
    nativePaneDividerReleaseHold,
  ]);

  // Held while the transition runs, so the legend stays on the geometry it was
  // last drawn at rather than dropping a collapsing pane's rows a commit early.
  if (!nativeMaximizeHolding && frame) nativeMaximizeFrameRef.current = frame;
  const nativeLegendFrame = nativeMaximizeHolding ? (nativeMaximizeFrameRef.current ?? frame) : frame;

  useLayoutEffect(() => {
    if (!frame || !nativeMaximizeReleaseHold) return;
    const resolution = resolveNativeReleaseHold({
      caughtUp: nativePaneRatiosCaughtUp({
        panes: frame.panes,
        ratios: nativeMaximizeReleaseHold.target,
      }),
      hold: nativeMaximizeReleaseHold,
    });
    if (resolution.hold === nativeMaximizeReleaseHold) return;
    if (resolution.released) cancelNativeMaximizeHoldTimeout();
    setNativeMaximizeReleaseHold(resolution.hold);
  }, [cancelNativeMaximizeHoldTimeout, frame, nativeMaximizeReleaseHold]);

  useEffect(() => {
    if (!nativeMaximizeReleaseHold) {
      cancelNativeMaximizeHoldTimeout();
      return;
    }
    cancelNativeMaximizeHoldTimeout();
    const token = nativeMaximizeReleaseHold.token;
    const timeout = setTimeout(() => {
      if (nativeMaximizeHoldTimeoutRef.current === timeout) nativeMaximizeHoldTimeoutRef.current = null;
      setNativeMaximizeReleaseHold((current) => (current?.token === token ? null : current));
    }, NATIVE_PANE_MAXIMIZE_HOLD_CEILING_MS);
    nativeMaximizeHoldTimeoutRef.current = timeout;
    return () => {
      if (nativeMaximizeHoldTimeoutRef.current === timeout) nativeMaximizeHoldTimeoutRef.current = null;
      clearTimeout(timeout);
    };
  }, [cancelNativeMaximizeHoldTimeout, nativeMaximizeReleaseHold]);

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
    viewportGestureActive: nativeViewportGestureActive,
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
    viewportGestureOwner,
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
  // Full-chart render transition holds are only for viewport/data interactions.
  // Pane-divider resize owns its own pane bitmap presentation. Feeding it into
  // the generic native interaction gate can preserve a pre-resize full-chart
  // projection underneath the divider overlay, which shows up as release flap.
  const nativeRenderTransitionInteractionActive = nativeViewportGestureActive;
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
    nativeInteractionActive: nativeRenderTransitionInteractionActive,
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
    nativeInteractionActive: nativeRenderTransitionInteractionActive,
  });
  const staticNativeRenderProjection = useStaticNativeRenderProjection ? nativeRenderProjection : null;
  // Shared, not React state: revealing the button and dismissing it 2.5s later
  // used to re-render the whole chart and, because visibility was a control-zone
  // dependency, rebuild every gesture with it.
  const nativeResetViewButtonVisible = useSharedValue(false);
  const nativeResetViewButtonVisibleRef = useRef(false);
  const setNativeResetViewButtonVisible = useCallback(
    (visible: boolean) => {
      nativeResetViewButtonVisibleRef.current = visible;
      nativeResetViewButtonVisible.value = visible;
    },
    [nativeResetViewButtonVisible],
  );
  const [nativeContextMenu, setNativeContextMenu] = useState<NativeCrosshairContextMenuState | null>(null);
  const nativeResetViewButtonTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // The callback can arrive as a prop or through the imperative widget contract.
  // Both must feed one source, or gesture gating reads a different value than the
  // handler and the "+" menu never opens.
  const [imperativeContextMenu, setImperativeContextMenu] = useState<ContextMenuCallback | null>(null);
  const activeContextMenu = imperativeContextMenu ?? onContextMenu ?? null;
  const hasNativeContextMenu = Boolean(activeContextMenu) || Boolean(renderContextMenu);
  const contextMenuViewportWidth = frame?.dimensions.width;
  const contextMenuViewportHeight = frame?.dimensions.height;
  const closeNativeContextMenu = useCallback(() => {
    setNativeContextMenu((current) => {
      if (current?.content) onContextMenuClose?.();
      return null;
    });
    crosshair.visible.value = false;
  }, [crosshair, onContextMenuClose]);
  const handleNativeContextMenuTap = useCallback(
    (time: number, price: number, anchorX: number, anchorY: number) => {
      const hostMenu = resolveNativeContextMenuRenderResult(
        renderContextMenu?.({
          anchorX,
          anchorY,
          close: closeNativeContextMenu,
          price,
          unixTime: time,
          viewportHeight: contextMenuViewportHeight,
          viewportWidth: contextMenuViewportWidth,
        }),
      );
      if (hostMenu) {
        setNativeContextMenu({
          anchorX,
          anchorY,
          content: hostMenu.content,
          contentHeight: hostMenu.height,
          contentWidth: hostMenu.width,
          items: [],
        });
        return;
      }
      const items = activeContextMenu?.(time, price) ?? [];
      setNativeContextMenu(items.length > 0 ? { anchorX, anchorY, items } : null);
    },
    [activeContextMenu, closeNativeContextMenu, contextMenuViewportHeight, contextMenuViewportWidth, renderContextMenu],
  );
  useEffect(() => {
    if (!activeContextMenu && !renderContextMenu) setNativeContextMenu(null);
  }, [activeContextMenu, renderContextMenu]);
  const clearNativeResetViewButtonTimer = useCallback(() => {
    if (nativeResetViewButtonTimerRef.current) {
      clearTimeout(nativeResetViewButtonTimerRef.current);
      nativeResetViewButtonTimerRef.current = null;
    }
  }, []);
  const hideNativeResetViewButton = useCallback(() => {
    clearNativeResetViewButtonTimer();
    setNativeResetViewButtonVisible(false);
  }, [clearNativeResetViewButtonTimer, setNativeResetViewButtonVisible]);
  const showNativeResetViewButton = useCallback(() => {
    clearNativeResetViewButtonTimer();
    setNativeResetViewButtonVisible(true);
    nativeResetViewButtonTimerRef.current = setTimeout(() => {
      setNativeResetViewButtonVisible(false);
      nativeResetViewButtonTimerRef.current = null;
    }, NATIVE_RESET_VIEW_DISMISS_MS);
  }, [clearNativeResetViewButtonTimer, setNativeResetViewButtonVisible]);

  useEffect(
    () => () => {
      clearNativeResetViewButtonTimer();
    },
    [clearNativeResetViewButtonTimer],
  );

  useEffect(() => {
    if (hasDataViewport) return;
    clearNativeResetViewButtonTimer();
    setNativeResetViewButtonVisible(false);
  }, [clearNativeResetViewButtonTimer, hasDataViewport, setNativeResetViewButtonVisible]);

  const [nativeObjectTreeOpen, setNativeObjectTreeOpen] = useState(false);
  const openNativeObjectTree = useCallback(() => setNativeObjectTreeOpen(true), []);

  const {
    beginNativeUserDrawingEditDragAtPoint,
    dispatchNativeUserDrawingObjectTreeAction,
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
    userDrawingEditDragActive: nativeUserDrawingEditDragActive,
    userDrawingRecentToolsByCategory,
    userDrawingState: nativeUserDrawingState,
  } = useNativeUserDrawingRuntime({
    initialUserDrawingState: userDrawingState,
    onUserDrawingCommand: handleNativeUserDrawingCommandForLayout,
    onUserDrawingObjectTreeOpen: openNativeObjectTree,
    onUserDrawingStateChange,
  });
  const nativeObjectTreeModel = useMemo(
    () => resolveUserDrawingObjectTreeModel(nativeUserDrawingState),
    [nativeUserDrawingState],
  );
  const nativeUserDrawingDrawings = nativeUserDrawingState.drawings;
  const nativeUserDrawingSelection = nativeUserDrawingState.selection;
  const nativeUserDrawingDraft = nativeUserDrawingState.draft;
  const nativeUserDrawingMeasure = nativeUserDrawingState.measure;
  const nativeUserDrawingTextEdit = nativeUserDrawingState.textEdit;
  const nativeUserDrawingDefaultStylesByKind = nativeUserDrawingState.defaultStylesByKind;
  const applyNativeLayoutSettings = useCallback(
    async (settings: ChartSettings) => {
      // The native chart is a controlled component: `symbol` is owned by the
      // host, so a layout restores everything except which market to show.
      // Honouring the saved symbol would push a market from whenever the layout
      // was saved back into the host — usually from another exchange — and the
      // host then corrects itself while the chart stays on a symbol its account
      // cannot resolve, which reads as a chart that never loads.
      const nextSymbol = propSymbol || symbol;
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
        const studyApi = await chartApi.createStudy(
          builtinIndicator.id,
          builtinIndicator.overlay,
          false,
          indicator.inputs,
          {},
          { displayName: indicator.name },
        );
        if (indicator.isVisible === false && studyApi) {
          chartApi.toggleStudyVisibility(studyApi.getId());
        }
      }

      replaceNativeUserDrawingState(settings.userDrawingState);
      chartStore.settings.set({
        ...chartStore.settings.get(),
        autoScale: settings.autoScale ?? true,
        chartProperties: settings.chartProperties,
        preservedTvProperties: settings.preservedTvProperties,
        chartType: settings.chartType || 'candle',
        indicators: settings.indicators || [],
        interval: settings.interval || interval,
        showIndicatorOutputAxisLabels: settings.showIndicatorOutputAxisLabels,
        showVolume: settings.showVolume,
        symbol: nextSymbol,
        userDrawingState: settings.userDrawingState,
        viewport: settings.viewport,
        volumeHeight: settings.volumeHeight,
      });
      const restoreViewport =
        settings.viewport && shouldRestoreNativeLayoutViewport({ layoutSymbol: settings.symbol, symbol: nextSymbol });
      if (restoreViewport) {
        applyNativeViewport(settings.viewport, {
          // The store has not applied the layout's own auto-scale yet, so the
          // restore has to carry it rather than read the previous chart's.
          autoScaleEnabled: settings.autoScale !== false,
          fitPriceToBars: true,
        });
      }
    },
    [applyNativeViewport, chartApi, chartStore, interval, propSymbol, replaceNativeUserDrawingState, symbol],
  );
  // Writes go straight to the store; the store listener above pushes the value
  // into effectiveRenderOptions, so the sheet does not touch rendering itself.
  const nativeChartSettingsContext = useMemo<ChartSettingsControlContext>(
    () => ({
      getSettings: () => chartStore.settings.get(),
      setSetting: (key, value) => chartStore.settings.setKey(key, value),
      setChartProperties: (properties) => chartStore.settings.setKey('chartProperties', properties),
      markLayoutDirty: markNativeLayoutDirtyIfReady,
    }),
    [chartStore, markNativeLayoutDirtyIfReady],
  );

  const nativeLayoutSettings = useMemo(
    () =>
      createNativeChartLayoutSettings({
        autoScale: nativeAutoScaleEnabled,
        chartProperties: nativeChartProperties,
        preservedTvProperties: nativePreservedTvProperties,
        chartType: 'candle',
        indicators: indicatorManager?.getLayoutIndicators() ?? [],
        interval: interval as ResolutionString,
        showIndicatorOutputAxisLabels: nativeShowIndicatorOutputAxisLabels,
        showVolume: nativeShowVolume,
        symbol,
        userDrawingState: nativeUserDrawingState,
        viewport: hasDataViewport ? viewport : undefined,
        // The native renderer sizes the volume pane from VOLUME_HEIGHT_RATIO, so
        // persisting anything else would save a height that is never drawn.
        volumeHeight: VOLUME_HEIGHT_RATIO,
      }),
    // Every input, or a save quietly persists a stale snapshot.
    [
      hasDataViewport,
      indicatorManager,
      interval,
      nativeAutoScaleEnabled,
      nativeChartProperties,
      nativeIndicatorsRevision,
      nativePreservedTvProperties,
      nativeShowIndicatorOutputAxisLabels,
      nativeShowVolume,
      nativeUserDrawingState,
      symbol,
      viewport,
    ],
  );
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
    onIndicatorsClick: () => setNativeIndicatorsOpen(true),
    redoUserDrawingCommand: redoNativeUserDrawingCommand,
    undoUserDrawingCommand: undoNativeUserDrawingCommand,
  });
  const handleNativeIndicatorSelect = useCallback(
    (indicator: BuiltinIndicator) => {
      void chartApi.createStudy(indicator.id, indicator.overlay, false, {}, {}, { displayName: indicator.name });
    },
    [chartApi],
  );
  const handleNativeTopBarAction = useCallback(
    (action: Parameters<typeof commitNativeTopBarRuntimeAction>[0]) => {
      if (action.type === 'timeframe' && action.interval) {
        setNativeDisplayedInterval(action.interval);
      }
      commitNativeTopBarRuntimeAction(action);
    },
    [commitNativeTopBarRuntimeAction],
  );
  const handleNativeOverlayAction = useCallback(
    (command: unknown) => {
      const overlayCommand = command as NativeChartSettingsActionCommand | NativeLegendActionCommand | null;
      if (!overlayCommand) return;
      if (!('indicatorId' in overlayCommand) || typeof overlayCommand.indicatorId !== 'string') return;
      if (overlayCommand.type === 'toggleIndicator') {
        chartApi.toggleStudyVisibility(overlayCommand.indicatorId);
        return;
      }
      if (overlayCommand.type === 'removeIndicator') {
        chartApi.removeStudy(overlayCommand.indicatorId);
      }
    },
    [chartApi],
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
    chartApi,
    forceUpdate,
    orderDragState,
    pricePrecision: nativePricePrecision,
  });
  useEffect(() => {
    if (!nativeSelectedTradeLine) return;
    const stillPresent =
      nativeSelectedTradeLine.objectType === 'order'
        ? lineSnapshot.orderLines.some((line) => getOrderObjectId(line) === nativeSelectedTradeLine.objectId)
        : lineSnapshot.positionLines.some((line) => getPositionObjectId(line) === nativeSelectedTradeLine.objectId);
    if (!stillPresent) {
      setNativeSelectedTradeLine(null);
    }
  }, [lineSnapshot.orderLines, lineSnapshot.positionLines, nativeSelectedTradeLine]);

  const {
    axisFont,
    backgroundColor,
    chromeTheme,
    gridColor,
    leftToolRailLayout,
    measuredPriceAxisWidth,
    nativeMutedTextColor,
    nativePriceLines,
    plotPrimitiveClip,
    priceAxisTagSources,
    smallFont,
    textColor,
    textFont,
    topBarLayout,
    tradeAxisFont,
    tradeLineGeometries,
    visibleBars,
    volumeHeight,
  } = useNativeSkiaRenderModel({
    bars: nativeRenderBars,
    frame,
    interval: nativeRenderInterval,
    indicatorsEnabled: true,
    layoutName: nativeCurrentLayout.layoutName,
    layoutSelectorEnabled: nativeLayoutSelectorEnabled,
    leftToolRailCollapsed,
    lineSnapshot,
    marginsBottom: margins.bottom,
    options,
    priceAxisTagHeight: PRICE_AXIS_TAG_HEIGHT,
    priceLines: nativeRenderPriceLines,
    pricePrecision: nativePricePrecision,
    projection: nativeRenderProjection,
    selectedTradeLine: nativeSelectedTradeLine,
    showTopBar,
    supportedResolutions,
    symbol,
    topBarInterval: nativeDisplayedInterval,
    topBarDefaultVisibleValues: nativeTopBarTimeframeValues,
    topBarHeight: STATIC_TOP_BAR_HEIGHT,
    tradeAxisTagHeight: TRADE_AXIS_TAG_HEIGHT,
    userDrawingActiveTool: nativeUserDrawingState.activeTool,
    userDrawingCommandAvailability,
    userDrawingRecentToolsByCategory,
    volumeHeightRatio: VOLUME_HEIGHT_RATIO,
  });
  useLayoutEffect(() => {
    const nextWidth = Math.ceil(measuredPriceAxisWidth);
    if (!Number.isFinite(nextWidth) || nextWidth <= nativePriceAxisWidth) return;
    setNativePriceAxisWidth(nextWidth);
  }, [measuredPriceAxisWidth, nativePriceAxisWidth]);

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
        }) ||
        findNativeTradeLineRow({
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
            activeBackgroundColor: chromeTheme.activeBackgroundColor,
            activeTextColor: options.upColor,
            anchor: nativeUserDrawingSelectionActionAnchor,
            backgroundColor: chromeTheme.popoverBackgroundColor,
            bottomInset: 8,
            gridColor: chromeTheme.borderColor,
            leftInset: nativeSelectionActionLeftInset,
            mutedTextColor: chromeTheme.mutedTextColor,
            onAction: handleNativeSelectedDrawingAction,
            onPopoverGroupChange: setNativeSelectedActionPopoverGroupId,
            openPopoverGroupId: nativeSelectedActionPopoverGroupId,
            rightInset: 8,
            textColor: chromeTheme.textColor,
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
      chromeTheme.activeBackgroundColor,
      chromeTheme.borderColor,
      chromeTheme.mutedTextColor,
      chromeTheme.popoverBackgroundColor,
      chromeTheme.textColor,
      frame,
      handleNativeSelectedDrawingAction,
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
    ],
  );
  // Hidden for the drag, so its buttons stop taking taps and stop suppressing
  // gestures underneath where they used to be.
  const nativeUserDrawingSelectionActionTargets = useMemo(
    () =>
      nativeUserDrawingEditDragActive
        ? []
        : resolveNativeSelectedDrawingActionHitTargets(nativeUserDrawingSelectionActionOverlayModel),
    [nativeUserDrawingEditDragActive, nativeUserDrawingSelectionActionOverlayModel],
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
      const toggleHitRect = resolveNativeLeftToolRailToggleHitRect(leftToolRailLayout);
      if (leftToolRailLayout.collapsed) {
        // Collapsed, the toggle is the only thing here that can be pressed.
        // Reserving the rail's whole column anyway made a full-height strip
        // down the left edge fail the chart pan, so the drag fell through to
        // whatever contains the chart instead of panning it.
        if (toggleHitRect) {
          zones.push({
            x1: toggleHitRect.x,
            x2: toggleHitRect.x + toggleHitRect.width,
            y1: toggleHitRect.y,
            y2: toggleHitRect.y + toggleHitRect.height,
          });
        }
      } else {
        const drawerWidth = nativeOpenDrawingCategoryId ? NATIVE_LEFT_TOOL_RAIL_DRAWER_WIDTH : 0;
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

    zones.push(...nativeLegendActionTargets);
    zones.push(...nativeChartSettingsActionTargets);

    return zones;
  }, [
    frame,
    leftToolRailLayout,
    nativeChartSettingsActionTargets,
    nativeLegendActionTargets,
    nativeOpenDrawingCategoryId,
    nativeUserDrawingSelectionActionOverlayModel,
    topBarLayout,
  ]);
  const nativeOverlayActionTargets = useMemo(() => [], []);
  const nativeGestureDebugOverlayRef = useRef<NativeGestureDebugOverlayHandle | null>(null);
  const appendNativeGestureDebugEntry = useCallback(
    (message: string) => {
      if (!NATIVE_ANDROID_GESTURE_DEBUG_OVERLAY) return;
      const owner = viewportGestureOwner.owner.value;
      const active = `${panActive.value ? 'p' : '-'}${pinchActive.value ? 'z' : '-'}${priceScaleActive.value ? 'y' : '-'}${timeScaleActive.value ? 'x' : '-'}`;
      nativeGestureDebugOverlayRef.current?.append(`${owner}/${active} ${message}`);
    },
    [panActive, pinchActive, priceScaleActive, timeScaleActive, viewportGestureOwner],
  );
  nativeGestureDebugSinkRef.current = appendNativeGestureDebugEntry;
  const resolveNativeGestureDebugHit = useCallback(
    (x: number, y: number): string => {
      if (!frame) return 'no-frame';
      if (isNativeGestureControlPoint(nativeGestureControlZones, x, y)) return 'reserved';
      const divider = resolveNativePaneDividerAtY(frame, y);
      if (divider) return `divider#${divider.dividerIndex}@${formatNativeDebugNumber(divider.y)}`;
      if (y >= frame.timeAxisTop && y <= frame.timeAxisBottom) {
        return `timeAxis y=${formatNativeDebugRange(frame.timeAxisTop, frame.timeAxisBottom)}`;
      }
      if (x >= frame.priceAxisHitLeft && x <= frame.priceAxisRight) {
        const pane = getNativePaneAtY(frame, y);
        return `priceAxis ${pane?.id ?? 'none'}`;
      }
      const pane = getNativePaneAtY(frame, y);
      return pane ? `pane ${pane.id}:${pane.type}` : 'outside';
    },
    [frame, nativeGestureControlZones],
  );
  const appendNativeRawTouchDebugEntry = useCallback(
    (phase: 'start' | 'move' | 'end' | 'cancel', event: GestureResponderEvent) => {
      if (!NATIVE_ANDROID_GESTURE_DEBUG_OVERLAY) return;
      const nativeEvent = event.nativeEvent as typeof event.nativeEvent & {
        touches?: readonly unknown[];
        changedTouches?: readonly unknown[];
      };
      const x = nativeEvent.locationX;
      const y = nativeEvent.locationY;
      appendNativeGestureDebugEntry(
        `raw ${phase} hit=${resolveNativeGestureDebugHit(x, y)} loc=${formatNativeDebugNumber(x)},${formatNativeDebugNumber(y)} page=${formatNativeDebugNumber(nativeEvent.pageX)},${formatNativeDebugNumber(nativeEvent.pageY)} touches=${nativeEvent.touches?.length ?? 'n/a'} changed=${nativeEvent.changedTouches?.length ?? 'n/a'}`,
      );
    },
    [appendNativeGestureDebugEntry, resolveNativeGestureDebugHit],
  );
  const nativeGestureDebugSummary = useMemo(() => {
    if (!NATIVE_ANDROID_GESTURE_DEBUG_OVERLAY) return [];
    if (!frame) return ['frame: none'];
    const dividerYs = frame.panes.slice(0, -1).map((pane) => formatNativeDebugNumber(pane.bottom));
    return [
      `f ${formatNativeDebugNumber(frame.dimensions.width)}x${formatNativeDebugNumber(frame.dimensions.height)} p=${frame.panes.length} div=${dividerYs.length > 0 ? dividerYs.join(',') : 'none'}`,
      `snap=${nativePaneSnapshots.length} hold=${nativePaneDividerReleaseHold ? 'y' : 'n'} set=${nativePaneDividerPresentationTarget ? 'y' : 'n'} main=${formatNativeDebugRange(frame.mainPane.top, frame.mainPane.bottom)}`,
    ];
  }, [frame, nativePaneDividerPresentationTarget, nativePaneDividerReleaseHold, nativePaneSnapshots.length]);
  // Same outcome as the reset button, different input. The button also hides
  // itself on use; do that here too so a reveal from an earlier tap does not
  // linger over an already-reset chart.
  // Dragging an indicator pane's axis pins that pane's range, the same trade as
  // web: the user has said what they want to see, so auto-scale stops moving it.
  const handleNativeIndicatorPaneScaleStart = useCallback(
    (paneId: string) => {
      setNativePaneRangeReleaseHold((current) => {
        if (!current?.target[paneId]) return current;
        const { [paneId]: _releasedPane, ...remaining } = current.target;
        return Object.keys(remaining).length === 0
          ? null
          : createNativeReleaseHold({
              kind: 'paneRangeOverride',
              target: remaining,
              token: createNextNativeReleaseHoldToken(),
            });
      });
      const currentOverride = paneRangeOverrides.value[paneId];
      if (currentOverride) {
        const nextOverrides = omitReleasedNativePaneRangeOverrides({
          current: paneRangeOverrides.value,
          released: { [paneId]: currentOverride },
        });
        paneRangeOverrides.value = nextOverrides;
      }
    },
    [createNextNativeReleaseHoldToken, paneRangeOverrides],
  );
  const handleNativeIndicatorPaneScale = useCallback(
    (paneId: string, yMin: number, yMax: number) => {
      const target = { [paneId]: { yMin, yMax } };
      setNativePaneRangeReleaseHold((current) =>
        createNativeReleaseHold({
          kind: 'paneRangeOverride',
          target: { ...(current?.target ?? {}), ...target },
          token: createNextNativeReleaseHoldToken(),
        }),
      );
      indicatorManager?.setIndicatorPaneManualRange(paneId, yMin, yMax);
    },
    [createNextNativeReleaseHoldToken, indicatorManager],
  );

  useLayoutEffect(() => {
    if (!frame || !nativePaneRangeReleaseHold) return;
    const resolution = resolveNativeReleaseHold({
      caughtUp: nativePaneRangeOverridesCaughtUp({
        overrides: nativePaneRangeReleaseHold.target,
        panes: frame.panes,
      }),
      hold: nativePaneRangeReleaseHold,
    });
    if (resolution.hold === nativePaneRangeReleaseHold) return;
    setNativePaneRangeReleaseHold(resolution.hold);
    if (!resolution.released) return;
    paneRangeOverrides.value = omitReleasedNativePaneRangeOverrides({
      current: paneRangeOverrides.value,
      released: nativePaneRangeReleaseHold.target,
    });
  }, [frame, nativePaneRangeReleaseHold, paneRangeOverrides]);

  const handleNativePriceAxisResetTap = useCallback(() => {
    if (!hasDataViewport) return;
    resetNativeViewport();
    hideNativeResetViewButton();
  }, [hasDataViewport, hideNativeResetViewButton, resetNativeViewport]);

  const handleNativeResetViewTap = useCallback(
    (x: number, y: number) => {
      if (!frame || !hasDataViewport) return;
      const target = resolveNativeResetViewTapTarget({
        frame,
        resetButtonVisible: nativeResetViewButtonVisibleRef.current,
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
    intervalMs: intervalToMs(nativeRenderInterval),
    leftToolRailLayout,
    onDebugGestureEvent: appendNativeGestureDebugEntry,
    orderDragState,
    orderDragZones,
    overlayActionTargets: nativeOverlayActionTargets,
    onDrawingTap: handleNativeUserDrawingTap,
    onIndicatorPaneScale: handleNativeIndicatorPaneScale,
    onIndicatorPaneScaleStart: handleNativeIndicatorPaneScaleStart,
    onPaneHeightsChange: handleNativePaneHeightsChange,
    onTogglePaneMaximize: handleNativeTogglePaneMaximize,
    onPaneDividerResizeStart: handleNativePaneDividerResizeStart,
    onPaneDividerResizeEnd: handleNativePaneDividerResizeEnd,
    paneDividerBands,
    paneRangeOverrides,
    onDrawingEditDragBegin: handleNativeUserDrawingEditDragBegin,
    onDrawingEditDragEnd: endNativeUserDrawingEditDrag,
    onDrawingEditDragMove: handleNativeUserDrawingEditDragMove,
    onDrawingSelectionTap: handleNativeUserDrawingSelectionTap,
    onLeftToolRailToggleTap: toggleLeftToolRailCollapsed,
    onContextMenuTap: handleNativeContextMenuTap,
    onSelectTradeLine: handleNativeSelectTradeLine,
    onClearTradeLineSelection: handleNativeClearTradeLineSelection,
    onOverlayAction: handleNativeOverlayAction,
    onSelectedDrawingAction: handleNativeSelectedDrawingAction,
    onSelectedDrawingActionPopoverGroupChange: setNativeSelectedActionPopoverGroupId,
    onPriceAxisResetTap: handleNativePriceAxisResetTap,
    onResetViewTap: handleNativeResetViewTap,
    panActive,
    pinchActive,
    pricePrecision: nativePricePrecision,
    priceScaleActive,
    resetViewVisible: nativeResetViewButtonVisible,
    selectedDrawingActionTargets: nativeUserDrawingSelectionActionTargets,
    priceScaleGestureState,
    sharedViewport,
    timeScaleActive,
    timeScaleGestureState,
    tradeLabelHeight: TRADE_LABEL_HEIGHT,
    tradeLineActionZones,
    tradeLineRows,
    viewportGestureOwner,
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
        <View
          onTouchCancel={(event) => appendNativeRawTouchDebugEntry('cancel', event)}
          onTouchEnd={(event) => appendNativeRawTouchDebugEntry('end', event)}
          onTouchMove={(event) => appendNativeRawTouchDebugEntry('move', event)}
          onTouchStart={(event) => appendNativeRawTouchDebugEntry('start', event)}
          pointerEvents={resizeSnapshotVisible ? 'none' : 'auto'}
          style={styles.liveChartLayer}
        >
          <GestureDetector gesture={nativeChartGesture}>
            <Canvas ref={canvasRef} style={styles.canvas}>
              <NativeChartCanvasLayers
                axisFont={axisFont}
                backgroundColor={backgroundColor}
                bars={nativeRenderBars}
                bracketDragState={bracketDragState}
                crosshair={crosshair}
                extraPriceLines={nativePriceLines}
                frame={frame}
                getOrderObjectId={getOrderObjectId}
                getPositionObjectId={getPositionObjectId}
                gridColor={gridColor}
                hasDataViewport={nativeRenderHasDataViewport}
                hasContextMenu={hasNativeContextMenu}
                intervalMs={intervalToMs(nativeRenderInterval)}
                indicatorPaneInfo={nativeIndicatorPaneInfo}
                indicatorPlots={nativeIndicatorPlots}
                paneRangeOverrides={paneRangeOverrides}
                indicatorTotalBarCount={nativeRenderBars.length}
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
                tradeAxisFont={tradeAxisFont}
                tradeAxisTagHeight={TRADE_AXIS_TAG_HEIGHT}
                tradeLabelHeight={TRADE_LABEL_HEIGHT}
                tradeLineGeometries={tradeLineGeometries}
                userDrawingDraftAnchorColor={nativeUserDrawingDraftAnchorColor}
                userDrawingDraftAnchors={nativeUserDrawingDraftAnchors}
                userDrawingRenderEntries={nativeUserDrawingRenderEntries}
                visibleBars={visibleBars}
                volumeHeight={volumeHeight}
              />
              {nativePaneSnapshots.length > 0 && frame ? (
                <NativePaneDividerResizeLayer
                  backgroundColor={backgroundColor}
                  bands={paneDividerBands}
                  paneGeometry={nativePaneGeometrySignature}
                  settleFrames={nativePaneDividerSettleFrames}
                  settledGeometry={nativePaneDividerPresentationTarget}
                  snapshots={nativePaneSnapshots}
                  target={chartPanGestureState.paneDividerTarget}
                  width={frame.dimensions.width}
                />
              ) : null}
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
          activeBackgroundColor={chromeTheme.activeBackgroundColor}
          backgroundColor={chromeTheme.topBarBackgroundColor}
          favoriteTimeframeValues={uiPreferences.favoriteTimeframeValues}
          gridColor={chromeTheme.borderColor}
          menuBackgroundColor={chromeTheme.menuBackgroundColor}
          menuTimeframes={nativeTopBarMenuTimeframes}
          mutedTextColor={chromeTheme.mutedTextColor}
          onAction={handleNativeTopBarAction}
          onFavoriteTimeframeToggle={toggleNativeFavoriteTimeframe}
          textColor={chromeTheme.textColor}
          topBarLayout={topBarLayout}
        />
      )}
      {frame && (
        <NativeChartLegendOverlay
          bars={nativeRenderBars}
          downColor={options.downColor}
          frame={nativeLegendFrame ?? frame}
          gridColor={gridColor}
          activeIndicators={nativeLegendIndicators}
          indicatorPaneInfo={nativeLegendIndicatorPaneInfo}
          interval={nativeRenderInterval}
          isLoading={nativeLegendLoading}
          leftToolRailLayout={leftToolRailLayout}
          mutedTextColor={nativeMutedTextColor}
          onActionTargetsChange={setNativeLegendActionTargets}
          onRemoveIndicator={handleNativeRemoveIndicator}
          onToggleIndicator={handleNativeToggleIndicator}
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
          backgroundColor={chromeTheme.leftToolRailBackgroundColor}
          gridColor={chromeTheme.borderColor}
          leftToolRailLayout={leftToolRailLayout}
          mutedTextColor={chromeTheme.mutedTextColor}
          activeBackgroundColor={chromeTheme.activeBackgroundColor}
          activeTextColor={options.upColor}
          openCategoryId={nativeOpenDrawingCategoryId}
          onCategoryOpenChange={setNativeOpenDrawingCategoryId}
          onToolSelect={handleNativeUserDrawingToolSelect}
          onToggleCollapsed={toggleLeftToolRailCollapsed}
          toggleBackgroundColor={chromeTheme.textColor}
        />
      )}
      {frame && nativeUserDrawingSelectionActionAnchor && !nativeUserDrawingEditDragActive && (
        <NativeUserDrawingSelectionActionOverlay
          activeBackgroundColor={chromeTheme.activeBackgroundColor}
          activeTextColor={options.upColor}
          anchor={nativeUserDrawingSelectionActionAnchor}
          backgroundColor={chromeTheme.popoverBackgroundColor}
          bottomInset={8}
          gridColor={chromeTheme.borderColor}
          leftInset={nativeSelectionActionLeftInset}
          mutedTextColor={chromeTheme.mutedTextColor}
          onAction={handleNativeSelectedDrawingAction}
          onPopoverGroupChange={setNativeSelectedActionPopoverGroupId}
          openPopoverGroupId={nativeSelectedActionPopoverGroupId}
          rightInset={8}
          textColor={chromeTheme.textColor}
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
      {nativeResetViewButtonLayout && hasDataViewport && (
        <NativeResetViewButtonOverlay layout={nativeResetViewButtonLayout} visible={nativeResetViewButtonVisible} />
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
      <NativeChartSettingsButton
        backgroundColor={chromeTheme.canvasBackgroundColor}
        axisHeight={frame?.dimensions.margins.bottom ?? 0}
        onLayoutRectChange={handleNativeChartSettingsButtonLayout}
        onPress={() => setNativeChartSettingsOpen(true)}
        textColor={chromeTheme.mutedTextColor}
      />
      {nativeChartSettingsOpen ? (
        <NativeChartSettingsOverlay
          activeBackgroundColor={chromeTheme.activeBackgroundColor}
          backgroundColor={chromeTheme.modalBackgroundColor}
          context={nativeChartSettingsContext}
          gridColor={chromeTheme.borderColor}
          mutedTextColor={chromeTheme.mutedTextColor}
          onClose={() => setNativeChartSettingsOpen(false)}
          textColor={chromeTheme.textColor}
        />
      ) : null}
      {nativeIndicatorsOpen ? (
        <NativeIndicatorsOverlay
          activeBackgroundColor={chromeTheme.activeBackgroundColor}
          backgroundColor={chromeTheme.modalBackgroundColor}
          gridColor={chromeTheme.borderColor}
          mutedTextColor={chromeTheme.mutedTextColor}
          onClose={() => setNativeIndicatorsOpen(false)}
          onSelect={handleNativeIndicatorSelect}
          textColor={chromeTheme.textColor}
        />
      ) : null}
      {nativeLayoutSelectorOpen ? (
        <NativeLayoutSelectorOverlay
          backgroundColor={chromeTheme.modalBackgroundColor}
          currentLayout={nativeCurrentLayout}
          errorText={nativeLayoutSelectorError}
          gridColor={chromeTheme.borderColor}
          layouts={nativeLayoutSelectorLayouts}
          loading={nativeLayoutSelectorLoading}
          mutedTextColor={chromeTheme.mutedTextColor}
          onClose={() => setNativeLayoutSelectorOpen(false)}
          onDelete={handleNativeLayoutSelectorDelete}
          onLoad={handleNativeLayoutSelectorLoad}
          onRefresh={refreshNativeLayoutSelector}
          onRename={handleNativeLayoutSelectorRename}
          onSave={handleNativeLayoutSelectorSave}
          onSaveAs={handleNativeLayoutSelectorSaveAs}
          saveStatus={nativeSaveStatus}
          textColor={chromeTheme.textColor}
        />
      ) : null}
      {nativeObjectTreeOpen ? (
        <NativeUserDrawingObjectTreePanel
          backgroundColor={chromeTheme.modalBackgroundColor}
          gridColor={chromeTheme.borderColor}
          model={nativeObjectTreeModel}
          mutedTextColor={chromeTheme.mutedTextColor}
          onClose={() => setNativeObjectTreeOpen(false)}
          onDispatch={dispatchNativeUserDrawingObjectTreeAction}
          textColor={chromeTheme.textColor}
        />
      ) : null}
      {NATIVE_ANDROID_GESTURE_DEBUG_OVERLAY ? (
        <NativeGestureDebugOverlay
          ref={nativeGestureDebugOverlayRef}
          summary={nativeGestureDebugSummary}
          title="TEALCHART DEBUG v9"
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
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  snapshotLayer: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  hiddenSnapshotLayer: {
    opacity: 0,
  },
});
