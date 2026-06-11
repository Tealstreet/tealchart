// 📱 MOBILE-PATCHED FILE
// This file has been customized for mobile and will NOT be overwritten by yarn sync.
// Mobile equivalent of TealchartWidget - accepts datafeed and handles all internal logic.

/**
 * SkiaTealchart - React Native Skia implementation of Tealchart
 *
 * Mobile equivalent of TealchartWidget on web:
 * - Accepts datafeed, symbol, interval (like TealchartWidget)
 * - Handles bar fetching, indicators, pane management internally
 * - Renders using Skia instead of canvas
 *
 * Architecture:
 * - Layer 1: Skia Canvas (static) - candles, grid, indicators via Picture recording
 * - Layer 2: Interactive RN Layer - order lines, position lines, crosshair
 * - Layer 3: Base Gesture Layer - pan, pinch, axis scaling with zone detection
 */

import type { WorkerError } from '@tealstreet/tealscript';
import type { IIndicatorManager } from './core/ChartWidgetCore';
import type {
  DrawingCoordinateSpace,
  UserDrawingEditDrag,
  UserDrawingFontFamily,
  UserDrawingHandleRole,
  UserDrawingLineStyle,
  UserDrawingStyle,
  UserDrawingTextAnnotation,
  UserDrawingTextAlign,
  UserDrawingTool,
  UpdateUserDrawingOptions,
} from './drawings';
import type { UserDrawingState } from './drawings';
import type { BuiltinIndicator } from './indicators/builtinIndicators';
import type { IndicatorSettingsData } from './mobile/components/IndicatorSettingsModalMobile';
import type { LabelBounds } from './mobile/hooks/useLabelCollision';
import type { MobileTealscriptIndicatorOptions } from './mobile/MobileIndicatorManager';
import type { PlotStyleOverride } from './state/chartState';
import type { ChartThemeInput } from './theme';
import type {
  ChartMargins,
  ContextMenuItem,
  IBasicDataFeed,
  OrderLineRenderData,
  PositionLineRenderData,
  PriceLine,
  RenderOptions,
  Viewport,
} from './types';

import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from 'react';

import {
  Canvas,
  Circle,
  createPicture,
  DashPathEffect,
  Group,
  Oval,
  Path as SkiaPath,
  Picture,
  Rect,
  Skia,
  Line as SkiaLine,
  Text as SkiaText,
  useFont,
  vec,
} from '@shopify/react-native-skia';
import { LayoutChangeEvent, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { LOADING_OPACITY } from './constants';
import { useTealchartCore } from './core/useTealchartCore';
import {
  applyUserDrawingEditDrag,
  appendUserDrawingPathDragPoint,
  beginUserDrawingEditDragAtPoint,
  beginUserDrawingPathDrag,
  beginUserDrawingTextEdit,
  cancelUserDrawingDraft as cancelUserDrawingDraftState,
  cancelUserDrawingTextEdit,
  clearUserDrawings as clearUserDrawingsState,
  commitUserDrawingPathDrag,
  commitUserDrawingTextEdit,
  createUserDrawingState,
  deleteUserDrawing as deleteUserDrawingState,
  handleUserDrawingInput,
  isUserDrawingPathFamilyTool,
  normalizeUserDrawingFontFamily,
  normalizeUserDrawingFontSize,
  resolveUserDrawingSelectionAtPoint,
  resolveUserDrawingTextEditMetrics,
  splitUserDrawingTextLines,
  selectUserDrawingById,
  setUserDrawingText,
  setUserDrawingTool,
  USER_DRAWING_FONT_FAMILIES,
  updateUserDrawingTextEdit,
} from './drawings';
import { ChartTopBarComponent } from './mobile/components/ChartTopBarComponent';
import { ContextMenuComponent } from './mobile/components/ContextMenuComponent';
import { CrosshairComponent } from './mobile/components/CrosshairComponent';
import { IndicatorSettingsModalMobile } from './mobile/components/IndicatorSettingsModalMobile';
import { IndicatorsModalMobile } from './mobile/components/IndicatorsModalMobile';
import { OrderLineComponent } from './mobile/components/OrderLineComponent';
import { PositionLineComponent } from './mobile/components/PositionLineComponent';
import { useChartGestures } from './mobile/hooks/useChartGestures';
import { useLabelCollision } from './mobile/hooks/useLabelCollision';
import { MobileIndicatorManager } from './mobile/MobileIndicatorManager';
import { priceToY, xToTime, yToPrice } from './mobile/utils/coordinates';
import { resolveMobileUserDrawingFontFamily } from './mobile/utils/drawingFonts';
import { resolveMobileUserDrawingInputPoint } from './mobile/utils/drawingInput';
import {
  exportMobileUserDrawingStateForLayout,
  importMobileUserDrawingStateFromLayout,
} from './mobile/utils/drawingPersistence';
import {
  resolveMobileUserDrawingBalloonLayout,
  resolveMobileUserDrawingInfoLineLabelPosition,
  resolveMobileUserDrawingMeasurementLabelPosition,
  resolveMobileUserDrawingRenderModel,
  resolveMobileUserDrawingPriceRangeLabelPosition,
  resolveMobileUserDrawingRiskRewardLabelPosition,
  resolveMobileUserDrawingTextLabelLayout,
  resolveMobileUserDrawingTrendAngleLabelPosition,
} from './mobile/utils/drawingRenderModel';
import type {
  MobileUserDrawingCalloutPrimitive,
  MobileUserDrawingCommentPrimitive,
  MobileUserDrawingNotePrimitive,
  MobileUserDrawingPriceNotePrimitive,
  MobileUserDrawingTextLabelPrimitive,
} from './mobile/utils/drawingRenderModel';
import {
  setMobileUserDrawingLocked,
  setMobileUserDrawingTextAlign,
  setMobileUserDrawingVisibility,
  updateMobileUserDrawingStyle,
} from './mobile/utils/drawingStyle';
import { CollectedTextItem, SkiaCanvasContext } from './rendering/SkiaCanvasContext';
import { TealchartRenderer } from './TealchartRenderer';
import { mergeChartThemeRenderOptions } from './theme';
import { DEFAULT_MARGINS, DEFAULT_RENDER_OPTIONS } from './types';
import { buildLastTradePriceLine } from './utils/buildLastTradePriceLine';
import { safeToFixed } from './utils/safeNumber';
import { ViewportController } from './viewport/ViewportController';
import { intervalToMs } from './viewport/viewScale';

const RESET_BUTTON_HIDE_DELAY_MS = 5000;
const RESET_BUTTON_FADE_MS = 220;
const RESET_BUTTON_REVEAL_THROTTLE_MS = 250;

function dashIntervalsForUserDrawingLineStyle(lineStyle: UserDrawingLineStyle): number[] | null {
  switch (lineStyle) {
    case 'dashed':
      return [6, 4];
    case 'dotted':
      return [2, 4];
    case 'solid':
      return null;
  }
}

export type SkiaTealscriptIndicatorOptions = MobileTealscriptIndicatorOptions;

export interface SkiaTealchartHandle {
  addTealscriptIndicator(options: SkiaTealscriptIndicatorOptions): string | null;
  removeTealscriptIndicator(instanceId: string): void;
  changeTheme(theme: ChartThemeInput): void;
  getUserDrawingState(): UserDrawingState;
  exportUserDrawingStateForLayout(): UserDrawingState | undefined;
  importUserDrawingStateFromLayout(state?: UserDrawingState | null): void;
  setUserDrawingState(state: UserDrawingState): void;
  setActiveUserDrawingTool(tool: UserDrawingTool): void;
  selectUserDrawing(drawingId: string | null, handle?: UserDrawingHandleRole): void;
  deleteUserDrawing(drawingId?: string): boolean;
  deleteSelectedUserDrawing(): boolean;
  clearUserDrawings(): void;
  cancelUserDrawingDraft(): void;
  beginUserDrawingTextEdit(drawingId?: string): boolean;
  updateUserDrawingTextEdit(value: string): boolean;
  commitUserDrawingTextEdit(): boolean;
  cancelUserDrawingTextEdit(): boolean;
  setUserDrawingText(drawingId: string, text: string): boolean;
  updateUserDrawingStyle(style: Partial<UserDrawingStyle>, options?: UpdateUserDrawingOptions): boolean;
  setUserDrawingTextAlign(textAlign: UserDrawingTextAlign, options?: UpdateUserDrawingOptions): boolean;
  setUserDrawingVisibility(visible: boolean, options?: UpdateUserDrawingOptions): boolean;
  setUserDrawingLocked(locked: boolean, options?: UpdateUserDrawingOptions): boolean;
}

export interface SkiaTealchartProps {
  /** Datafeed for fetching bars - widget handles bar fetching internally (REQUIRED) */
  datafeed: IBasicDataFeed;
  /** Symbol to display (e.g., "BTC/USDT") */
  symbol: string;
  /** Timeframe interval (e.g., "15", "1h") */
  interval?: string;

  // ===========================================================================
  // Layout & Rendering
  // ===========================================================================
  width?: number;
  height?: number;
  /** Render options for colors and styling */
  renderOptions?: Partial<Omit<RenderOptions, 'width' | 'height' | 'devicePixelRatio'>>;
  /** Built-in or custom chart theme. Explicit renderOptions override theme values. */
  theme?: ChartThemeInput;
  /** Custom margins to override defaults */
  margins?: Partial<ChartMargins>;
  /** Price lines to render (last trade, orders, positions, etc.) */
  priceLines?: PriceLine[];
  /** Order lines to render (limit orders, stops, etc.) */
  orderLines?: OrderLineRenderData[];
  /** Position lines to render (open positions with PnL) */
  positionLines?: PositionLineRenderData[];
  /** Map from plotId to style overrides */
  plotStyleOverrides?: Map<string, PlotStyleOverride>;
  /** Called when viewport changes */
  onViewportChange?: (viewport: Viewport) => void;
  /** Context menu callback */
  onContextMenu?: (unixTime: number, price: number) => ContextMenuItem[];
  /** Called when crosshair position changes */
  onCrossHairMoved?: (price: number, time: number) => void;
  /** Initial user drawing state; later prop changes replace the chart's local drawing state. */
  userDrawingState?: UserDrawingState;
  /** Called when the chart updates user drawing state through input or its public API. */
  onUserDrawingStateChange?: (state: UserDrawingState) => void;
  /** Called when gesture blocks/unblocks parent scroll */
  onSwipeBlockChange?: (blocked: boolean) => void;
  /** Called when order price is changed via drag */
  onOrderMove?: (orderId: string, newPrice: number) => void;
  /** Called when order is cancelled */
  onOrderCancel?: (orderId: string) => void;
  /** Called when position is closed */
  onPositionClose?: (positionId: string) => void;
  /** Called when position is reversed */
  onPositionReverse?: (positionId: string) => void;
  /** Price precision for display */
  pricePrecision?: number;
  // ===========================================================================
  // Top Bar Props
  // ===========================================================================
  /** Whether to show the top bar (default: true) */
  showTopBar?: boolean;
  /** Exchange name (e.g., "Binance") */
  exchangeName?: string;
  /** Called when timeframe changes */
  onIntervalChange?: (interval: string) => void;
  /** Called when symbol changes */
  onSymbolChange?: (symbol: string) => void;
  // ===========================================================================
  // Indicator Props
  // ===========================================================================
  /** Called when an indicator is selected from the modal */
  onAddIndicator?: (indicator: BuiltinIndicator) => void;
  /** Called to open indicator settings for a given instance ID */
  onOpenIndicatorSettings?: (instanceId: string) => void;
  /** Called when a Tealscript parse/runtime error occurs */
  onTealscriptError?: (scriptId: string, error: WorkerError) => void;
}

export const SkiaTealchart = forwardRef<SkiaTealchartHandle, SkiaTealchartProps>(function SkiaTealchart(
  {
    width: propWidth,
    height: propHeight,
    // Required datafeed prop
    datafeed,
    symbol: propSymbol,
    interval: propInterval = '15',
    // Rendering props
    renderOptions,
    theme = 'Dark',
    margins: marginsProp,
    priceLines,
    orderLines,
    positionLines,
    plotStyleOverrides,
    onViewportChange,
    onContextMenu,
    onCrossHairMoved,
    userDrawingState: propUserDrawingState,
    onUserDrawingStateChange,
    onSwipeBlockChange,
    onOrderMove,
    onOrderCancel,
    onPositionClose,
    onPositionReverse,
    pricePrecision = 2,
    // Top bar props
    showTopBar = true,
    exchangeName,
    onIntervalChange,
    onSymbolChange,
    // Indicator props
    onAddIndicator,
    onTealscriptError,
  },
  ref,
) {
  // ==========================================================================
  // Core Hook + Indicator Management
  // ==========================================================================

  // Force re-render helper for indicator updates
  const [, forceUpdate] = useReducer((x: number) => x + 1, 0);
  const [imperativeTheme, setImperativeTheme] = useState<ChartThemeInput | null>(null);
  const [uncontrolledUserDrawingState, setUncontrolledUserDrawingState] = useState<UserDrawingState>(() =>
    propUserDrawingState ?? createUserDrawingState(),
  );
  const effectiveUserDrawingState = uncontrolledUserDrawingState;
  const userDrawingStateRef = useRef(effectiveUserDrawingState);
  const userDrawingIdCounterRef = useRef(0);
  const userDrawingEditDragRef = useRef<UserDrawingEditDrag | null>(null);

  const commitUserDrawingState = useCallback(
    (nextState: UserDrawingState) => {
      userDrawingStateRef.current = nextState;
      setUncontrolledUserDrawingState(nextState);
      onUserDrawingStateChange?.(nextState);
    },
    [onUserDrawingStateChange],
  );

  const commitUserDrawingStateIfChanged = useCallback(
    (nextState: UserDrawingState) => {
      if (nextState === userDrawingStateRef.current) return false;
      commitUserDrawingState(nextState);
      return true;
    },
    [commitUserDrawingState],
  );

  useEffect(() => {
    if (propUserDrawingState) {
      userDrawingStateRef.current = propUserDrawingState;
      setUncontrolledUserDrawingState(propUserDrawingState);
    }
  }, [propUserDrawingState]);

  useEffect(() => {
    setImperativeTheme(null);
  }, [theme]);

  // Create indicator manager (stable ref)
  const indicatorManagerRef = useRef<MobileIndicatorManager | null>(null);
  if (!indicatorManagerRef.current) {
    indicatorManagerRef.current = new MobileIndicatorManager();
    indicatorManagerRef.current.setOnUpdate(forceUpdate);
  }

  useLayoutEffect(() => {
    const manager = indicatorManagerRef.current;
    if (!manager || !onTealscriptError) return;
    manager.onErrorSubscribe(onTealscriptError);
    return () => {
      manager.onErrorUnsubscribe(onTealscriptError);
    };
  }, [onTealscriptError]);

  useImperativeHandle(
    ref,
    () => ({
      addTealscriptIndicator(options: SkiaTealscriptIndicatorOptions): string | null {
        return indicatorManagerRef.current?.addTealscriptIndicator(options) ?? null;
      },
      removeTealscriptIndicator(instanceId: string): void {
        indicatorManagerRef.current?.removeIndicator(instanceId);
      },
      changeTheme(nextTheme: ChartThemeInput): void {
        setImperativeTheme(nextTheme);
      },
      getUserDrawingState(): UserDrawingState {
        return userDrawingStateRef.current;
      },
      exportUserDrawingStateForLayout(): UserDrawingState | undefined {
        return exportMobileUserDrawingStateForLayout(userDrawingStateRef.current);
      },
      importUserDrawingStateFromLayout(nextState?: UserDrawingState | null): void {
        commitUserDrawingState(importMobileUserDrawingStateFromLayout(nextState));
      },
      setUserDrawingState(nextState: UserDrawingState): void {
        commitUserDrawingState(nextState);
      },
      setActiveUserDrawingTool(tool: UserDrawingTool): void {
        commitUserDrawingStateIfChanged(setUserDrawingTool(userDrawingStateRef.current, tool));
      },
      selectUserDrawing(drawingId: string | null, handle?: UserDrawingHandleRole): void {
        commitUserDrawingStateIfChanged(selectUserDrawingById(userDrawingStateRef.current, drawingId, handle));
      },
      deleteUserDrawing(drawingId?: string): boolean {
        const nextState = deleteUserDrawingState(userDrawingStateRef.current, { drawingId });
        return commitUserDrawingStateIfChanged(nextState);
      },
      deleteSelectedUserDrawing(): boolean {
        const nextState = deleteUserDrawingState(userDrawingStateRef.current);
        return commitUserDrawingStateIfChanged(nextState);
      },
      clearUserDrawings(): void {
        commitUserDrawingStateIfChanged(clearUserDrawingsState(userDrawingStateRef.current));
      },
      cancelUserDrawingDraft(): void {
        commitUserDrawingStateIfChanged(cancelUserDrawingDraftState(userDrawingStateRef.current));
      },
      beginUserDrawingTextEdit(drawingId?: string): boolean {
        return commitUserDrawingStateIfChanged(beginUserDrawingTextEdit(userDrawingStateRef.current, drawingId));
      },
      updateUserDrawingTextEdit(value: string): boolean {
        return commitUserDrawingStateIfChanged(updateUserDrawingTextEdit(userDrawingStateRef.current, value));
      },
      commitUserDrawingTextEdit(): boolean {
        return commitUserDrawingStateIfChanged(commitUserDrawingTextEdit(userDrawingStateRef.current));
      },
      cancelUserDrawingTextEdit(): boolean {
        return commitUserDrawingStateIfChanged(cancelUserDrawingTextEdit(userDrawingStateRef.current));
      },
      setUserDrawingText(drawingId: string, text: string): boolean {
        return commitUserDrawingStateIfChanged(setUserDrawingText(userDrawingStateRef.current, drawingId, text));
      },
      updateUserDrawingStyle(style: Partial<UserDrawingStyle>, options: UpdateUserDrawingOptions = {}): boolean {
        return commitUserDrawingStateIfChanged(updateMobileUserDrawingStyle(userDrawingStateRef.current, style, options));
      },
      setUserDrawingTextAlign(textAlign: UserDrawingTextAlign, options: UpdateUserDrawingOptions = {}): boolean {
        return commitUserDrawingStateIfChanged(
          setMobileUserDrawingTextAlign(userDrawingStateRef.current, textAlign, options),
        );
      },
      setUserDrawingVisibility(visible: boolean, options: UpdateUserDrawingOptions = {}): boolean {
        return commitUserDrawingStateIfChanged(
          setMobileUserDrawingVisibility(userDrawingStateRef.current, visible, options),
        );
      },
      setUserDrawingLocked(locked: boolean, options: UpdateUserDrawingOptions = {}): boolean {
        return commitUserDrawingStateIfChanged(setMobileUserDrawingLocked(userDrawingStateRef.current, locked, options));
      },
    }),
    [commitUserDrawingState, commitUserDrawingStateIfChanged],
  );

  // Use core hook for bar fetching and state management
  const coreResult = useTealchartCore({
    datafeed,
    symbol: propSymbol,
    interval: propInterval,
    indicatorManager: indicatorManagerRef.current as unknown as IIndicatorManager,
    onSymbolChange,
    onIntervalChange,
  });

  // Get values from core hook
  const { bars, symbol, interval, isLoading, unifiedLayout } = coreResult;

  // Get supported resolutions from core (for filtering timeframe selector)
  const supportedResolutions = coreResult.core?.getSupportedResolutions() ?? null;

  // Get indicator state from manager
  const plots = indicatorManagerRef.current?.getPlots() || [];
  const drawings = indicatorManagerRef.current?.getDrawings() || [];
  const baseUnifiedPaneLayout = indicatorManagerRef.current?.getUnifiedLayout() || unifiedLayout;
  const indicatorPaneInfo = indicatorManagerRef.current?.getIndicatorPaneInfo() || {};

  const activeIndicatorIds = indicatorManagerRef.current?.getIndicators().map((ind) => ind.indicator.id) || [];

  // Handle indicator addition
  const handleAddIndicatorInternal = useCallback(
    (indicator: BuiltinIndicator) => {
      if (indicatorManagerRef.current) {
        console.log('[SkiaTealchart] Adding indicator:', indicator.id);
        indicatorManagerRef.current.addIndicator(indicator);
      }
      // Also call external callback if provided
      onAddIndicator?.(indicator);
    },
    [onAddIndicator],
  );

  // ==========================================================================
  // Dimensions & Layout
  // ==========================================================================

  const [dimensions, setDimensions] = useState({ width: propWidth || 0, height: propHeight || 0 });

  useEffect(() => {
    if (propWidth && propHeight) {
      setDimensions({ width: propWidth, height: propHeight });
    }
  }, [propWidth, propHeight]);

  const onLayout = useCallback(
    (event: LayoutChangeEvent) => {
      if (!propWidth || !propHeight) {
        const { width, height } = event.nativeEvent.layout;
        setDimensions({ width, height });
      }
    },
    [propWidth, propHeight],
  );

  // Top bar safe zone - just enough to keep price labels below the toolbar content
  // The top bar is 36px tall but we only need ~26px clearance (content is centered)
  const TOP_BAR_SAFE_ZONE = 26;

  // Increase top margin when top bar is shown to create safe zone for price labels
  const margins: ChartMargins = useMemo(
    () => ({
      ...DEFAULT_MARGINS,
      ...marginsProp,
      // Add safe zone to top margin so price labels don't overlap with top bar
      top: (marginsProp?.top ?? DEFAULT_MARGINS.top) + (showTopBar ? TOP_BAR_SAFE_ZONE : 0),
    }),
    [marginsProp, showTopBar],
  );

  // Chart uses full height (top bar overlays on top, but margins create safe zone)

  // ==========================================================================
  // Viewport State
  // ==========================================================================

  const [viewport, setViewport] = useState<Viewport | null>(() =>
    bars.length > 0 ? TealchartRenderer.calculateViewport(bars) : null,
  );

  const barsLengthRef = useRef(bars.length);
  const viewportControllerRef = useRef(new ViewportController());

  // Track the first bar's time to detect reloads with the same count
  const barsFirstTimeRef = useRef<number | null>(bars.length > 0 ? bars[0].time : null);

  // Compute auto-scale Y ranges for indicator panes (matching TealchartWidget behavior)
  const unifiedPaneLayout = useMemo(() => {
    if (!viewport || plots.length === 0 || !baseUnifiedPaneLayout) return baseUnifiedPaneLayout;

    // Compute auto-scale Y ranges for indicator panes via ViewportController
    const indicatorPanes = baseUnifiedPaneLayout.panes
      .filter((p) => p.type === 'indicator' && p.indicatorIds)
      .map((p) => ({ id: p.id, fixedRange: p.fixedRange, indicatorIds: p.indicatorIds! }));

    const ranges = viewportControllerRef.current.computePaneYRanges(
      indicatorPanes,
      plots,
      bars,
      viewport.startTime,
      viewport.endTime,
    );

    if (ranges.size === 0) return baseUnifiedPaneLayout;

    return {
      ...baseUnifiedPaneLayout,
      panes: baseUnifiedPaneLayout.panes.map((pane) => {
        const range = ranges.get(pane.id);
        if (range) {
          return { ...pane, yMin: range.yMin, yMax: range.yMax };
        }
        return pane;
      }),
    };
  }, [baseUnifiedPaneLayout, viewport, plots, bars]);

  const userDrawingInputPanes = useMemo(() => {
    if (!viewport || !unifiedPaneLayout) return [];

    const availableHeight = dimensions.height - unifiedPaneLayout.timeAxisHeight - margins.top;
    let currentTop = margins.top;

    return unifiedPaneLayout.panes.map((pane) => {
      const height = availableHeight * pane.heightRatio;
      const yRange =
        pane.type === 'main' && !pane.fixedRange
          ? { yMin: viewport.priceMin, yMax: viewport.priceMax }
          : { yMin: pane.yMin, yMax: pane.yMax };
      const resolvedPane = {
        id: pane.id,
        top: currentTop,
        height,
        bottom: currentTop + height,
        ...yRange,
      };
      currentTop += height;
      return resolvedPane;
    });
  }, [dimensions.height, margins.top, unifiedPaneLayout, viewport]);

  const userDrawingSpacesByPaneId = useMemo(() => {
    if (!viewport) return new Map<string, DrawingCoordinateSpace>();

    return new Map(
      userDrawingInputPanes.map((pane) => [
        pane.id,
        {
          viewport,
          pane,
          chartLeft: margins.left,
          chartRight: dimensions.width - margins.right,
          bars: pane.id === 'main' ? bars : undefined,
        },
      ]),
    );
  }, [bars, dimensions.width, margins.left, margins.right, userDrawingInputPanes, viewport]);

  const userDrawingPrimitives = useMemo(
    () => resolveMobileUserDrawingRenderModel(effectiveUserDrawingState, userDrawingSpacesByPaneId),
    [effectiveUserDrawingState, userDrawingSpacesByPaneId],
  );
  const activeUserDrawingTextEditPrimitive = useMemo(
    () =>
      userDrawingPrimitives.find(
        (
          primitive,
        ): primitive is
          | MobileUserDrawingTextLabelPrimitive
          | MobileUserDrawingNotePrimitive
          | MobileUserDrawingCalloutPrimitive
          | MobileUserDrawingPriceNotePrimitive
          | MobileUserDrawingCommentPrimitive =>
          (primitive.kind === 'textLabel' ||
            primitive.kind === 'note' ||
            primitive.kind === 'callout' ||
            primitive.kind === 'priceNote' ||
            primitive.kind === 'comment') &&
          primitive.editing &&
          primitive.id === effectiveUserDrawingState.textEdit?.drawingId,
      ),
    [effectiveUserDrawingState.textEdit?.drawingId, userDrawingPrimitives],
  );
  const activeUserDrawingTextEditorStyle = useMemo(() => {
    if (!activeUserDrawingTextEditPrimitive) return null;
    const value = activeUserDrawingTextEditPrimitive.editValue ?? activeUserDrawingTextEditPrimitive.text;
    const editMetrics = resolveUserDrawingTextEditMetrics(value);
    const width = Math.max(120, Math.min(260, editMetrics.longestLineLength * 7 + 32));
    const height = Math.max(32, Math.min(160, editMetrics.lines.length * 18 + 14));
    const chartRight = dimensions.width - margins.right;
    const left = Math.max(
      margins.left,
      Math.min(activeUserDrawingTextEditPrimitive.point.x - width / 2, chartRight - width - 8),
    );

    return {
      left,
      top: Math.max(margins.top, activeUserDrawingTextEditPrimitive.point.y - height / 2),
      width,
      height,
      color: activeUserDrawingTextEditPrimitive.style.textColor ?? activeUserDrawingTextEditPrimitive.style.lineColor,
      fontSize: normalizeUserDrawingFontSize(activeUserDrawingTextEditPrimitive.style.fontSize ?? 12),
      fontFamily: resolveMobileUserDrawingFontFamily(
        activeUserDrawingTextEditPrimitive.style.fontFamily,
        Platform.OS,
      ),
      borderColor: activeUserDrawingTextEditPrimitive.style.lineColor,
    };
  }, [activeUserDrawingTextEditPrimitive, dimensions.width, margins.left, margins.right, margins.top]);

  useEffect(() => {
    if (bars.length === 0) {
      // Reset refs when bars are cleared so next load always triggers
      barsLengthRef.current = 0;
      barsFirstTimeRef.current = null;
      return;
    }

    const firstTime = bars[0].time;
    const lengthChanged = bars.length !== barsLengthRef.current;
    const identityChanged = firstTime !== barsFirstTimeRef.current;

    if (lengthChanged || identityChanged) {
      barsLengthRef.current = bars.length;
      barsFirstTimeRef.current = firstTime;

      const newViewport = viewportControllerRef.current.handleBarsLoaded(bars, intervalToMs(interval));
      setViewport(newViewport);
      onViewportChange?.(newViewport);
    }
  }, [bars, onViewportChange]);

  const handleViewportChange = useCallback(
    (newViewport: Viewport) => {
      const vp = viewportControllerRef.current.handleViewportChange(newViewport, bars, intervalToMs(interval));
      setViewport(vp);
      onViewportChange?.(vp);
    },
    [onViewportChange, bars, interval],
  );

  // ==========================================================================
  // Render Options
  // ==========================================================================

  const fullRenderOptions: RenderOptions = useMemo(() => {
    const themedRenderOptions = mergeChartThemeRenderOptions(imperativeTheme ?? theme, renderOptions);
    return {
      width: dimensions.width,
      height: dimensions.height,
      devicePixelRatio: 1,
      backgroundColor: themedRenderOptions.backgroundColor ?? DEFAULT_RENDER_OPTIONS.backgroundColor,
      upColor: themedRenderOptions.upColor ?? DEFAULT_RENDER_OPTIONS.upColor,
      downColor: themedRenderOptions.downColor ?? DEFAULT_RENDER_OPTIONS.downColor,
      textColor: themedRenderOptions.textColor ?? DEFAULT_RENDER_OPTIONS.textColor,
      gridColor: themedRenderOptions.gridColor ?? DEFAULT_RENDER_OPTIONS.gridColor,
      showVolume: themedRenderOptions.showVolume ?? true,
      volumeHeight: themedRenderOptions.volumeHeight ?? 0.15,
      minCandleWidth: themedRenderOptions.minCandleWidth ?? 1,
      ...themedRenderOptions,
      crosshairColor: themedRenderOptions.crosshairColor ?? DEFAULT_RENDER_OPTIONS.crosshairColor,
      candleSpacing: themedRenderOptions.candleSpacing ?? DEFAULT_RENDER_OPTIONS.candleSpacing,
      maxCandleWidth: themedRenderOptions.maxCandleWidth ?? DEFAULT_RENDER_OPTIONS.maxCandleWidth,
      // Pass margins with top bar offset so price labels have safe zone
      margins,
    };
  }, [dimensions.width, dimensions.height, imperativeTheme, margins, renderOptions, theme]);

  const effectivePriceLines = useMemo(() => {
    const latestBar = bars.length > 0 ? bars[bars.length - 1] : null;
    const lastTradeLine = buildLastTradePriceLine({
      latestBar,
      interval,
      pricePrecision,
      upColor: fullRenderOptions.upColor,
      downColor: fullRenderOptions.downColor,
      renderLineOnCanvas: false,
    });
    const nonLastTradeLines = (priceLines ?? []).filter((line) => line.id !== 'last-trade');

    return lastTradeLine ? [...nonLastTradeLines, lastTradeLine] : nonLastTradeLines;
  }, [bars, interval, priceLines, pricePrecision, fullRenderOptions.upColor, fullRenderOptions.downColor]);

  // ==========================================================================
  // Gestures (using unified hook)
  // ==========================================================================

  const chartDimensions = useMemo(
    () => ({
      width: dimensions.width,
      height: dimensions.height,
      margins,
    }),
    [dimensions.width, dimensions.height, margins],
  );

  const handleAutoScaleDisabled = useCallback((paneId: string) => {
    viewportControllerRef.current.disableAutoScale(paneId);
  }, []);

  const getIsAutoScale = useCallback((paneId: string) => viewportControllerRef.current.isAutoScale(paneId), []);

  const handleResetViewport = useCallback(() => {
    if (bars.length > 0) {
      const vp = viewportControllerRef.current.handleReset(bars, intervalToMs(interval));
      setViewport(vp);
      onViewportChange?.(vp);
    }
  }, [bars, interval, onViewportChange]);

  // ==========================================================================
  // Crosshair State
  // ==========================================================================

  const [crosshairVisible, setCrosshairVisible] = useState(false);
  // Store the crosshair position (updated via runOnJS from gestures)
  const [lastCrosshairPosition, setLastCrosshairPosition] = useState({ x: 0, y: 0 });
  const crosshairDragStartX = useSharedValue(0);
  const crosshairDragStartY = useSharedValue(0);

  const [resetButtonVisible, setResetButtonVisible] = useState(false);
  const resetButtonOpacity = useSharedValue(0);
  const resetButtonHideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resetButtonFadeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resetButtonLastRevealAtRef = useRef(0);

  const clearResetButtonTimers = useCallback(() => {
    if (resetButtonHideTimerRef.current) {
      clearTimeout(resetButtonHideTimerRef.current);
      resetButtonHideTimerRef.current = null;
    }
    if (resetButtonFadeTimerRef.current) {
      clearTimeout(resetButtonFadeTimerRef.current);
      resetButtonFadeTimerRef.current = null;
    }
  }, []);

  const hideResetButtonOverlay = useCallback(() => {
    resetButtonOpacity.value = withTiming(0, { duration: RESET_BUTTON_FADE_MS });
    resetButtonFadeTimerRef.current = setTimeout(() => {
      setResetButtonVisible(false);
      resetButtonFadeTimerRef.current = null;
    }, RESET_BUTTON_FADE_MS);
  }, [resetButtonOpacity]);

  const revealResetButtonOverlay = useCallback(
    (force = false) => {
      const now = Date.now();
      if (!force && now - resetButtonLastRevealAtRef.current < RESET_BUTTON_REVEAL_THROTTLE_MS) return;
      resetButtonLastRevealAtRef.current = now;

      clearResetButtonTimers();
      setResetButtonVisible(true);
      resetButtonOpacity.value = withTiming(1, { duration: 120 });
      resetButtonHideTimerRef.current = setTimeout(() => {
        resetButtonHideTimerRef.current = null;
        hideResetButtonOverlay();
      }, RESET_BUTTON_HIDE_DELAY_MS);
    },
    [clearResetButtonTimers, hideResetButtonOverlay, resetButtonOpacity],
  );

  const revealResetButtonIfInBottomRegion = useCallback(
    (_x: number, y: number) => {
      if (dimensions.height <= 0) return;
      if (y >= dimensions.height * (2 / 3) && y <= dimensions.height) {
        revealResetButtonOverlay();
      }
    },
    [dimensions.height, revealResetButtonOverlay],
  );

  const handleResetButtonPress = useCallback(() => {
    handleResetViewport();
    revealResetButtonOverlay(true);
  }, [handleResetViewport, revealResetButtonOverlay]);

  const resetButtonAnimatedStyle = useAnimatedStyle(() => ({
    opacity: resetButtonOpacity.value,
  }));

  useEffect(
    () => () => {
      clearResetButtonTimers();
    },
    [clearResetButtonTimers],
  );

  // Context menu state
  const [contextMenuVisible, setContextMenuVisible] = useState(false);
  const [contextMenuItems, setContextMenuItems] = useState<ContextMenuItem[]>([]);
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0, price: 0, time: 0 });

  // ==========================================================================
  // Bracket Drag Preview State (TP/SL drag on Skia canvas)
  // ==========================================================================

  const [bracketDragState, setBracketDragState] = useState<{
    type: 'tp' | 'sl';
    positionId: string;
    price: number;
    entryPrice: number;
    isLong: boolean;
    notional: number;
  } | null>(null);

  const handleTPMove = useCallback(
    (positionId: string, price: number) => {
      const pos = positionLines?.find((p) => p.id === positionId || p.positionId === positionId);
      if (pos?.positionData) {
        setBracketDragState({
          type: 'tp',
          positionId,
          price,
          entryPrice: pos.positionData.entryPrice,
          isLong: pos.positionData.isLong,
          notional: pos.positionData.notional,
        });
      }
    },
    [positionLines],
  );

  const handleSLMove = useCallback(
    (positionId: string, price: number) => {
      const pos = positionLines?.find((p) => p.id === positionId || p.positionId === positionId);
      if (pos?.positionData) {
        setBracketDragState({
          type: 'sl',
          positionId,
          price,
          entryPrice: pos.positionData.entryPrice,
          isLong: pos.positionData.isLong,
          notional: pos.positionData.notional,
        });
      }
    },
    [positionLines],
  );

  // Order TP/SL drag move handlers (for Skia bracket preview)
  const handleOrderTPMove = useCallback(
    (orderId: string, price: number) => {
      const order = orderLines?.find((o) => o.id === orderId || o.orderId === orderId);
      if (order) {
        setBracketDragState({
          type: 'tp',
          positionId: orderId,
          price,
          entryPrice: order.price,
          isLong: true, // Approximation — actual side determined by OrderLineManager
          notional: 0,
        });
      }
    },
    [orderLines],
  );

  const handleOrderSLMove = useCallback(
    (orderId: string, price: number) => {
      const order = orderLines?.find((o) => o.id === orderId || o.orderId === orderId);
      if (order) {
        setBracketDragState({
          type: 'sl',
          positionId: orderId,
          price,
          entryPrice: order.price,
          isLong: true, // Approximation — actual side determined by OrderLineManager
          notional: 0,
        });
      }
    },
    [orderLines],
  );

  const handleTPSLDragEnd = useCallback(() => {
    setBracketDragState(null);
  }, []);

  // Indicators modal state
  const [indicatorsModalVisible, setIndicatorsModalVisible] = useState(false);

  const handleIndicatorsPress = useCallback(() => {
    setIndicatorsModalVisible(true);
  }, []);

  const handleIndicatorsModalClose = useCallback(() => {
    setIndicatorsModalVisible(false);
  }, []);

  const handleSelectIndicator = useCallback(
    (indicator: BuiltinIndicator) => {
      console.log('[SkiaTealchart] handleSelectIndicator called:', indicator.id, indicator.name);
      // Use internal handler which manages indicators in datafeed mode
      handleAddIndicatorInternal(indicator);
    },
    [handleAddIndicatorInternal],
  );

  // Indicator settings modal state
  const [settingsModalVisible, setSettingsModalVisible] = useState(false);
  const [settingsIndicator, setSettingsIndicator] = useState<IndicatorSettingsData | null>(null);
  const [settingsInputDefs] = useState<import('@tealstreet/tealscript').InputDefinition[]>([]);
  const [settingsPlots] = useState<import('@tealstreet/tealscript').PlotOutput[]>([]);

  const handleSettingsModalClose = useCallback(() => {
    setSettingsModalVisible(false);
    setSettingsIndicator(null);
  }, []);

  const handleSettingsSave = useCallback(
    (inputs: Record<string, unknown>, styleOverrides?: PlotStyleOverride[]) => {
      const manager = indicatorManagerRef.current;
      if (!manager || !settingsIndicator) return;

      manager.updateInputs(settingsIndicator.id, inputs);
      if (styleOverrides) {
        manager.updateStyleOverrides(settingsIndicator.id, styleOverrides);
      }
    },
    [settingsIndicator],
  );

  // Handle crosshair move callback
  const handleCrosshairMove = useCallback(
    (x: number, y: number) => {
      // Update last position for context menu
      setLastCrosshairPosition({ x, y });

      if (!viewport || !onCrossHairMoved) return;
      const price = yToPrice(y, viewport, chartDimensions);
      const time = xToTime(x, viewport, chartDimensions);
      onCrossHairMoved(price, time);
    },
    [viewport, chartDimensions, onCrossHairMoved],
  );

  const isPointInChartArea = useCallback(
    (x: number, y: number) => {
      const chartLeft = chartDimensions.margins.left;
      const chartRight = chartDimensions.width - chartDimensions.margins.right;
      const chartTop = chartDimensions.margins.top;
      const chartBottom = chartDimensions.height - chartDimensions.margins.bottom;

      return x >= chartLeft && x < chartRight && y >= chartTop && y < chartBottom;
    },
    [chartDimensions],
  );

  const measureUserDrawingTextLabelLine = useCallback((drawing: UserDrawingTextAnnotation, line: string): number => {
    const normalizedFontFamily = normalizeUserDrawingFontFamily(drawing.style.fontFamily ?? 'sans-serif');
    const nativeFontFamily = resolveMobileUserDrawingFontFamily(normalizedFontFamily, Platform.OS);
    const typeface = Skia.FontMgr.System().matchFamilyStyle(nativeFontFamily);
    const font = Skia.Font(typeface, normalizeUserDrawingFontSize(drawing.style.fontSize ?? 12));
    return font.measureText(line).width;
  }, []);

  const handleUserDrawingTap = useCallback(
    (x: number, y: number) => {
      if (!viewport) return false;

      if (effectiveUserDrawingState.activeTool === 'select') {
        if (!isPointInChartArea(x, y)) return false;

        const selection = resolveUserDrawingSelectionAtPoint(
          effectiveUserDrawingState,
          { x, y },
          userDrawingSpacesByPaneId,
          { hitTest: { labelHeight: 20, measureTextLabelLine: measureUserDrawingTextLabelLine } },
        );
        if (selection.changed) {
          commitUserDrawingState(selection.state);
        }
        return selection.hit || selection.changed;
      }

      const point = resolveMobileUserDrawingInputPoint({
        point: { x, y },
        viewport,
        dimensions: chartDimensions,
        panes: userDrawingInputPanes,
        bars,
      });
      if (!point) return false;

      const nextState = handleUserDrawingInput(effectiveUserDrawingState, point, {
        createId: () => {
          const existingIds = new Set(effectiveUserDrawingState.drawings.map((drawing) => drawing.id));
          let id = '';
          do {
            id = `drawing_${++userDrawingIdCounterRef.current}`;
          } while (existingIds.has(id));
          return id;
        },
      });
      if (nextState === effectiveUserDrawingState) return false;

      commitUserDrawingState(nextState);
      return true;
    },
    [
      chartDimensions,
      commitUserDrawingState,
      effectiveUserDrawingState,
      isPointInChartArea,
      measureUserDrawingTextLabelLine,
      userDrawingInputPanes,
      userDrawingSpacesByPaneId,
      bars,
      viewport,
    ],
  );

  const handleUserDrawingEditStart = useCallback(
    (x: number, y: number) => {
      if (!viewport) return false;
      if (!isPointInChartArea(x, y)) return false;

      if (isUserDrawingPathFamilyTool(effectiveUserDrawingState.activeTool)) {
        const point = resolveMobileUserDrawingInputPoint({
          point: { x, y },
          viewport,
          dimensions: chartDimensions,
          panes: userDrawingInputPanes,
          bars,
        });
        if (!point) return false;

        return commitUserDrawingStateIfChanged(beginUserDrawingPathDrag(userDrawingStateRef.current, point));
      }

      if (effectiveUserDrawingState.activeTool !== 'select') return false;

      const result = beginUserDrawingEditDragAtPoint(
        effectiveUserDrawingState,
        { x, y },
        userDrawingSpacesByPaneId,
        { hitTest: { labelHeight: 20, measureTextLabelLine: measureUserDrawingTextLabelLine } },
      );
      if (!result.hit || !result.drag) return false;

      userDrawingEditDragRef.current = result.drag;
      if (result.changed) {
        commitUserDrawingState(result.state);
      }
      return true;
    },
    [
      chartDimensions,
      commitUserDrawingState,
      commitUserDrawingStateIfChanged,
      effectiveUserDrawingState,
      isPointInChartArea,
      measureUserDrawingTextLabelLine,
      userDrawingInputPanes,
      userDrawingSpacesByPaneId,
      bars,
      viewport,
    ],
  );

  const handleUserDrawingEditMove = useCallback(
    (x: number, y: number) => {
      if (viewport && isUserDrawingPathFamilyTool(effectiveUserDrawingState.activeTool)) {
        const point = resolveMobileUserDrawingInputPoint({
          point: { x, y },
          viewport,
          dimensions: chartDimensions,
          panes: userDrawingInputPanes,
          bars,
        });
        if (!point) return;

        commitUserDrawingStateIfChanged(appendUserDrawingPathDragPoint(userDrawingStateRef.current, point));
        return;
      }

      const drag = userDrawingEditDragRef.current;
      if (!drag) return;

      const nextState = applyUserDrawingEditDrag(effectiveUserDrawingState, drag, { x, y });
      if (nextState !== effectiveUserDrawingState) {
        commitUserDrawingState(nextState);
      }
    },
    [
      chartDimensions,
      commitUserDrawingState,
      commitUserDrawingStateIfChanged,
      effectiveUserDrawingState,
      userDrawingInputPanes,
      bars,
      viewport,
    ],
  );

  const handleUserDrawingEditEnd = useCallback(() => {
    if (isUserDrawingPathFamilyTool(userDrawingStateRef.current.activeTool)) {
      commitUserDrawingStateIfChanged(
        commitUserDrawingPathDrag(userDrawingStateRef.current, {
          createId: () => {
            const existingIds = new Set(userDrawingStateRef.current.drawings.map((drawing) => drawing.id));
            let id = '';
            do {
              id = `drawing_${++userDrawingIdCounterRef.current}`;
            } while (existingIds.has(id));
            return id;
          },
        }),
      );
      return;
    }

    userDrawingEditDragRef.current = null;
  }, [commitUserDrawingStateIfChanged]);

  const { composedGesture } = useChartGestures({
    dimensions: chartDimensions,
    bars,
    viewport,
    onViewportChange: handleViewportChange,
    enabled: !crosshairVisible,
    onSwipeBlockChange,
    onAutoScaleDisabled: handleAutoScaleDisabled,
    isAutoScale: getIsAutoScale,
    onInteraction: revealResetButtonIfInBottomRegion,
    onDrawingEditStart: handleUserDrawingEditStart,
    onDrawingEditMove: handleUserDrawingEditMove,
    onDrawingEditEnd: handleUserDrawingEditEnd,
  });

  const handleCrosshairTap = useCallback(
    (x: number, y: number) => {
      revealResetButtonIfInBottomRegion(x, y);

      if (handleUserDrawingTap(x, y)) return;

      if (crosshairVisible) {
        setCrosshairVisible(false);
        return;
      }

      if (!isPointInChartArea(x, y)) return;

      setCrosshairVisible(true);
      handleCrosshairMove(x, y);
    },
    [crosshairVisible, handleCrosshairMove, handleUserDrawingTap, isPointInChartArea, revealResetButtonIfInBottomRegion],
  );

  // Pan gesture for moving crosshair (active only while crosshair is visible)
  const crosshairPanGesture = useMemo(
    () =>
      Gesture.Pan()
        .enabled(crosshairVisible)
        .onStart((event) => {
          runOnJS(revealResetButtonIfInBottomRegion)(event.x, event.y);
          crosshairDragStartX.value = lastCrosshairPosition.x;
          crosshairDragStartY.value = lastCrosshairPosition.y;
        })
        .onUpdate((event) => {
          runOnJS(revealResetButtonIfInBottomRegion)(event.x, event.y);
          runOnJS(handleCrosshairMove)(
            crosshairDragStartX.value + event.translationX,
            crosshairDragStartY.value + event.translationY,
          );
        })
        .onEnd(() => {
          // Keep crosshair visible after pan ends - tap elsewhere to hide
        }),
    [
      crosshairVisible,
      crosshairDragStartX,
      crosshairDragStartY,
      handleCrosshairMove,
      lastCrosshairPosition,
      revealResetButtonIfInBottomRegion,
    ],
  );

  // Single tap toggles crosshair immediately. Drag gestures win once movement starts.
  const tapGesture = useMemo(
    () =>
      Gesture.Tap()
        .maxDuration(250)
        .maxDistance(10)
        .onEnd((event) => {
          runOnJS(handleCrosshairTap)(event.x, event.y);
        }),
    [handleCrosshairTap],
  );

  // Double-tap handler for pane maximize/restore
  const handleDoubleTap = useCallback(
    (x: number, y: number) => {
      if (effectiveUserDrawingState.activeTool === 'select' && isPointInChartArea(x, y)) {
        const selection = resolveUserDrawingSelectionAtPoint(
          effectiveUserDrawingState,
          { x, y },
          userDrawingSpacesByPaneId,
          { hitTest: { labelHeight: 20, measureTextLabelLine: measureUserDrawingTextLabelLine } },
        );
        const selectedId = selection.state.selection?.drawingId;
        const selectedDrawing = selectedId
          ? selection.state.drawings.find((drawing) => drawing.id === selectedId)
          : null;
        if (
          selection.hit &&
          (selectedDrawing?.kind === 'textLabel' ||
            selectedDrawing?.kind === 'note' ||
            selectedDrawing?.kind === 'callout' ||
            selectedDrawing?.kind === 'priceNote' ||
            selectedDrawing?.kind === 'comment')
        ) {
          const nextState = beginUserDrawingTextEdit(selection.state, selectedDrawing.id);
          if (nextState !== selection.state) {
            commitUserDrawingState(nextState);
            return;
          }
        }
      }

      if (!unifiedPaneLayout || !coreResult.core) return;
      const panes = unifiedPaneLayout.panes;
      const availableHeight = dimensions.height - (margins.bottom || DEFAULT_MARGINS.bottom);
      let currentTop = margins.top || 0;

      for (const pane of panes) {
        const paneHeight = availableHeight * pane.heightRatio;
        if (y >= currentTop && y < currentTop + paneHeight) {
          coreResult.core.toggleMaximizePane(pane.id);
          return;
        }
        currentTop += paneHeight;
      }
    },
    [
      commitUserDrawingState,
      coreResult.core,
      dimensions.height,
      effectiveUserDrawingState,
      isPointInChartArea,
      margins,
      measureUserDrawingTextLabelLine,
      unifiedPaneLayout,
      userDrawingSpacesByPaneId,
    ],
  );

  // Double-tap gesture for pane maximize/restore
  const doubleTapGesture = useMemo(
    () =>
      Gesture.Tap()
        .numberOfTaps(2)
        .onEnd((event) => {
          runOnJS(handleDoubleTap)(event.x, event.y);
        }),
    [handleDoubleTap],
  );

  const tapOrDoubleTapGesture = useMemo(
    () =>
      effectiveUserDrawingState.activeTool === 'select'
        ? Gesture.Exclusive(doubleTapGesture, tapGesture)
        : tapGesture,
    [doubleTapGesture, effectiveUserDrawingState.activeTool, tapGesture],
  );

  // Combine all gestures
  const allGestures = useMemo(
    () => Gesture.Race(crosshairPanGesture, tapOrDoubleTapGesture, composedGesture),
    [composedGesture, crosshairPanGesture, tapOrDoubleTapGesture],
  );

  // ==========================================================================
  // Label Collision Resolution
  // ==========================================================================

  // Build label bounds for collision resolution
  const labelBoundsInput = useMemo(() => {
    if (!viewport) return [];

    const bounds: Array<LabelBounds & { id: string }> = [];
    const labelHeight = 20;

    // Add order line labels
    orderLines?.forEach((order) => {
      bounds.push({
        id: `order-${order.id}`,
        originalY: priceToY(order.price, viewport, chartDimensions),
        adjustedY: 0,
        height: labelHeight,
        priority: 1, // Orders have lower priority than positions
      });
    });

    // Add position line labels
    positionLines?.forEach((pos) => {
      bounds.push({
        id: `position-${pos.id}`,
        originalY: priceToY(pos.price, viewport, chartDimensions),
        adjustedY: 0,
        height: labelHeight,
        priority: 2, // Positions have higher priority
      });
    });

    return bounds;
  }, [viewport, chartDimensions, orderLines, positionLines]);

  // Resolve collisions
  useLabelCollision(labelBoundsInput);

  // ==========================================================================
  // Context Menu Handler
  // ==========================================================================

  const handleContextMenuPress = useCallback(
    (price: number, time: number) => {
      if (onContextMenu) {
        const items = onContextMenu(time, price);
        if (items && items.length > 0) {
          setContextMenuItems(items);
          setContextMenuPosition({
            x: lastCrosshairPosition.x,
            y: lastCrosshairPosition.y,
            price,
            time,
          });
          setContextMenuVisible(true);
        }
      }
    },
    [onContextMenu, lastCrosshairPosition],
  );

  const handleContextMenuClose = useCallback(() => {
    setContextMenuVisible(false);
    setContextMenuItems([]);
  }, []);

  // ==========================================================================
  // Skia Picture Rendering (Layer 1: Static)
  // ==========================================================================

  const { picture, textItems } = useMemo(() => {
    if (!viewport || bars.length === 0 || dimensions.width === 0 || dimensions.height === 0) {
      return { picture: null, textItems: [] as CollectedTextItem[] };
    }

    let collectedText: CollectedTextItem[] = [];

    const pic = createPicture(
      (canvas) => {
        const ctx = new SkiaCanvasContext(canvas as any, Skia as any);
        // Pass margins as third parameter (constructor doesn't read from options.margins)
        const renderer = new TealchartRenderer(ctx, fullRenderOptions, margins);

        renderer.renderWithLayout(
          bars,
          viewport,
          unifiedPaneLayout,
          effectivePriceLines,
          plots,
          indicatorPaneInfo,
          undefined,
          plotStyleOverrides,
          undefined,
          undefined,
          drawings,
        );

        collectedText = ctx.getCollectedText();
      },
      { width: dimensions.width, height: dimensions.height },
    );

    return { picture: pic, textItems: collectedText };
  }, [
    bars,
    viewport,
    dimensions,
    fullRenderOptions,
    margins,
    effectivePriceLines,
    plots,
    drawings,
    unifiedPaneLayout,
    indicatorPaneInfo,
    plotStyleOverrides,
  ]);

  // ==========================================================================
  // Text Style Helper
  // ==========================================================================

  const getTextStyle = useCallback((item: CollectedTextItem) => {
    let left = item.x;
    let top = item.y;

    const estimatedWidth = item.text.length * item.fontSize * 0.6;

    if (item.textAlign === 'center') {
      left = item.x - estimatedWidth / 2;
    } else if (item.textAlign === 'right' || item.textAlign === 'end') {
      left = item.x - estimatedWidth;
    }

    if (item.textBaseline === 'top') {
      // top is default in RN
    } else if (item.textBaseline === 'middle') {
      top = item.y - item.fontSize / 2;
    } else if (item.textBaseline === 'bottom') {
      top = item.y - item.fontSize;
    } else {
      // 'alphabetic' - roughly 80% of font size above baseline
      top = item.y - item.fontSize * 0.8;
    }

    return {
      position: 'absolute' as const,
      left,
      top,
      fontSize: item.fontSize,
      color: item.color,
    };
  }, []);

  // ==========================================================================
  // Bracket Drag Preview (Skia rendering data)
  // ==========================================================================

  // Fonts for Skia text rendering in bracket preview and drawing labels.
  const bracketFont = useFont(null, 12);
  const userDrawingTextFonts = useMemo(() => {
    const fontSizes = [10, 12, 14, 16] as const;
    const fonts: Partial<Record<UserDrawingFontFamily, Partial<Record<(typeof fontSizes)[number], ReturnType<typeof Skia.Font>>>>> =
      {};

    for (const fontFamily of USER_DRAWING_FONT_FAMILIES) {
      const nativeFontFamily = resolveMobileUserDrawingFontFamily(fontFamily, Platform.OS);
      const typeface = Skia.FontMgr.System().matchFamilyStyle(nativeFontFamily);
      const familyFonts: Partial<Record<(typeof fontSizes)[number], ReturnType<typeof Skia.Font>>> = {};
      for (const fontSize of fontSizes) {
        familyFonts[fontSize] = Skia.Font(typeface, fontSize);
      }
      fonts[fontFamily] = familyFonts;
    }

    return fonts;
  }, []);
  const getUserDrawingTextFont = useCallback(
    (fontSize: number | undefined, fontFamily: string | undefined) => {
      const normalizedFontFamily = normalizeUserDrawingFontFamily(fontFamily ?? 'sans-serif');
      const normalizedFontSize = normalizeUserDrawingFontSize(fontSize ?? 12);
      return userDrawingTextFonts[normalizedFontFamily]?.[normalizedFontSize] ?? bracketFont;
    },
    [bracketFont, userDrawingTextFonts],
  );

  // Compute bracket drag preview rendering data
  const bracketPreview = useMemo(() => {
    if (!bracketDragState || !viewport) return null;

    const { type, price, entryPrice, isLong, notional } = bracketDragState;
    const y = priceToY(price, viewport, chartDimensions);

    // PnL estimate: notional * (price - entry) / entry for long, inverted for short
    const priceDelta = isLong ? price - entryPrice : entryPrice - price;
    const pnl = (priceDelta / entryPrice) * notional;
    const pnlSign = pnl >= 0 ? '+' : '';
    const priceText = safeToFixed(price, pricePrecision);
    const pnlText = `${pnlSign}${safeToFixed(pnl, 2)}`;
    const labelText = `${type.toUpperCase()} ${priceText}  ${pnlText}`;

    const color = type === 'tp' ? '#22c55e' : '#f97316';
    const chartLeft = chartDimensions.margins.left;
    const chartRight = chartDimensions.width - chartDimensions.margins.right;

    return { y, color, labelText, chartLeft, chartRight, pnl };
  }, [bracketDragState, viewport, chartDimensions, pricePrecision]);

  const crosshairOverlay = useMemo(() => {
    if (!viewport || !crosshairVisible) return null;

    const chartLeft = margins.left;
    const chartRight = dimensions.width - margins.right;
    const chartTop = margins.top;
    const chartBottom = dimensions.height - margins.bottom;
    const { x, y } = lastCrosshairPosition;

    if (x < chartLeft || x > chartRight) return null;

    const hasContextMenu = !!onContextMenu;
    const horizontalRight = hasContextMenu ? chartRight - 26 : chartRight;
    const showHorizontal = y >= chartTop && y <= chartBottom;

    return {
      color: fullRenderOptions.crosshairColor,
      x,
      y,
      chartLeft,
      chartRight,
      chartTop,
      chartBottom,
      horizontalRight,
      showHorizontal,
    };
  }, [
    viewport,
    crosshairVisible,
    margins.left,
    margins.right,
    margins.top,
    margins.bottom,
    dimensions.width,
    dimensions.height,
    lastCrosshairPosition,
    onContextMenu,
    fullRenderOptions.crosshairColor,
  ]);

  // ==========================================================================
  // Render
  // ==========================================================================

  if (dimensions.width === 0 || dimensions.height === 0) {
    return (
      <View style={[styles.container, { backgroundColor: fullRenderOptions.backgroundColor }]} onLayout={onLayout} />
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: fullRenderOptions.backgroundColor }]} onLayout={onLayout}>
      {/* Layer 1: Skia Canvas (static rendering) */}
      <Canvas
        style={[
          styles.absoluteFill,
          { width: dimensions.width, height: dimensions.height, opacity: isLoading ? LOADING_OPACITY : 1 },
        ]}
      >
        {picture && <Picture picture={picture} />}

        {userDrawingPrimitives.map((primitive) => {
          if (primitive.kind === 'line') {
            if (primitive.style.lineVisible === false) return null;
            const dash = dashIntervalsForUserDrawingLineStyle(primitive.style.lineStyle);

            return (
              <Group key={primitive.id} clip={primitive.clip}>
                <SkiaLine
                  p1={vec(primitive.start.x, primitive.start.y)}
                  p2={vec(primitive.end.x, primitive.end.y)}
                  color={primitive.style.lineColor}
                  opacity={primitive.opacity}
                  strokeWidth={Math.max(1, primitive.style.lineWidth)}
                  style="stroke"
                >
                  {dash && <DashPathEffect intervals={dash} />}
                </SkiaLine>
                {primitive.arrowHead && (
                  <>
                    <SkiaLine
                      p1={vec(primitive.arrowHead.left.x, primitive.arrowHead.left.y)}
                      p2={vec(primitive.end.x, primitive.end.y)}
                      color={primitive.style.lineColor}
                      opacity={primitive.opacity}
                      strokeWidth={Math.max(1, primitive.style.lineWidth)}
                      style="stroke"
                    >
                      {dash && <DashPathEffect intervals={dash} />}
                    </SkiaLine>
                    <SkiaLine
                      p1={vec(primitive.arrowHead.right.x, primitive.arrowHead.right.y)}
                      p2={vec(primitive.end.x, primitive.end.y)}
                      color={primitive.style.lineColor}
                      opacity={primitive.opacity}
                      strokeWidth={Math.max(1, primitive.style.lineWidth)}
                      style="stroke"
                    >
                      {dash && <DashPathEffect intervals={dash} />}
                    </SkiaLine>
                  </>
                )}
              </Group>
            );
          }

          if (primitive.kind === 'infoLine') {
            const dash = dashIntervalsForUserDrawingLineStyle(primitive.style.lineStyle);
            const font = getUserDrawingTextFont(primitive.style.fontSize, primitive.style.fontFamily);
            const textBounds = font ? font.measureText(primitive.label) : { width: 0 };
            const labelPosition = resolveMobileUserDrawingInfoLineLabelPosition(primitive, textBounds);

            return (
              <Group key={primitive.id} clip={primitive.clip} opacity={primitive.opacity}>
                {primitive.style.lineVisible !== false && (
                  <SkiaLine
                    p1={vec(primitive.start.x, primitive.start.y)}
                    p2={vec(primitive.end.x, primitive.end.y)}
                    color={primitive.style.lineColor}
                    strokeWidth={Math.max(1, primitive.style.lineWidth)}
                    style="stroke"
                  >
                    {dash && <DashPathEffect intervals={dash} />}
                  </SkiaLine>
                )}
                {font && (
                  <SkiaText
                    x={labelPosition.x}
                    y={labelPosition.y}
                    text={primitive.label}
                    font={font}
                    color={primitive.style.textColor ?? primitive.style.lineColor}
                  />
                )}
              </Group>
            );
          }

          if (primitive.kind === 'forecast') {
            const dash = dashIntervalsForUserDrawingLineStyle(primitive.style.lineStyle);
            const font = getUserDrawingTextFont(primitive.style.fontSize, primitive.style.fontFamily);
            const changeTextBounds = font ? font.measureText(primitive.changeLabel) : { width: 0 };
            const fontSize = normalizeUserDrawingFontSize(primitive.style.fontSize ?? 12);

            return (
              <Group key={primitive.id} clip={primitive.clip} opacity={primitive.opacity}>
                {primitive.style.lineVisible !== false && (
                  <SkiaLine
                    p1={vec(primitive.start.x, primitive.start.y)}
                    p2={vec(primitive.end.x, primitive.end.y)}
                    color={primitive.style.lineColor}
                    strokeWidth={Math.max(1, primitive.style.lineWidth)}
                    style="stroke"
                  >
                    {dash && <DashPathEffect intervals={dash} />}
                  </SkiaLine>
                )}
                {font && (
                  <>
                    <SkiaText
                      x={primitive.start.x + 4}
                      y={primitive.start.y - 4}
                      text={primitive.sourceLabel}
                      font={font}
                      color={primitive.style.textColor ?? primitive.style.lineColor}
                    />
                    <SkiaText
                      x={primitive.end.x - font.measureText(primitive.targetLabel).width - 4}
                      y={primitive.end.y - 4}
                      text={primitive.targetLabel}
                      font={font}
                      color={primitive.style.textColor ?? primitive.style.lineColor}
                    />
                    <SkiaText
                      x={primitive.labelPoint.x - changeTextBounds.width / 2}
                      y={primitive.labelPoint.y - fontSize}
                      text={primitive.changeLabel}
                      font={font}
                      color={primitive.style.textColor ?? primitive.style.lineColor}
                    />
                  </>
                )}
              </Group>
            );
          }

          if (primitive.kind === 'projection') {
            const dash = dashIntervalsForUserDrawingLineStyle(primitive.style.lineStyle);
            const font = getUserDrawingTextFont(primitive.style.fontSize, primitive.style.fontFamily);
            const changeTextBounds = font ? font.measureText(primitive.changeLabel) : { width: 0 };
            const targetTextBounds = font ? font.measureText(primitive.targetLabel) : { width: 0 };
            const fontSize = normalizeUserDrawingFontSize(primitive.style.fontSize ?? 12);
            const path = Skia.Path.Make();
            path.moveTo(primitive.start.x, primitive.start.y);
            path.lineTo(primitive.pivot.x, primitive.pivot.y);
            path.lineTo(primitive.target.x, primitive.target.y);

            return (
              <Group key={primitive.id} clip={primitive.clip} opacity={primitive.opacity}>
                {primitive.style.lineVisible !== false && (
                  <SkiaPath
                    path={path}
                    color={primitive.style.lineColor}
                    strokeWidth={Math.max(1, primitive.style.lineWidth)}
                    style="stroke"
                  >
                    {dash && <DashPathEffect intervals={dash} />}
                  </SkiaPath>
                )}
                {font && (
                  <>
                    <SkiaText
                      x={primitive.start.x + 4}
                      y={primitive.start.y - 4}
                      text={primitive.startLabel}
                      font={font}
                      color={primitive.style.textColor ?? primitive.style.lineColor}
                    />
                    <SkiaText
                      x={primitive.pivot.x + 4}
                      y={primitive.pivot.y - 4}
                      text={primitive.pivotLabel}
                      font={font}
                      color={primitive.style.textColor ?? primitive.style.lineColor}
                    />
                    <SkiaText
                      x={primitive.target.x - targetTextBounds.width - 4}
                      y={primitive.target.y - 4}
                      text={primitive.targetLabel}
                      font={font}
                      color={primitive.style.textColor ?? primitive.style.lineColor}
                    />
                    <SkiaText
                      x={primitive.labelPoint.x - changeTextBounds.width / 2}
                      y={primitive.labelPoint.y - fontSize}
                      text={primitive.changeLabel}
                      font={font}
                      color={primitive.style.textColor ?? primitive.style.lineColor}
                    />
                  </>
                )}
              </Group>
            );
          }

          if (primitive.kind === 'trendAngle') {
            const dash = dashIntervalsForUserDrawingLineStyle(primitive.style.lineStyle);
            const font = getUserDrawingTextFont(primitive.style.fontSize, primitive.style.fontFamily);
            const textBounds = font ? font.measureText(primitive.label) : { width: 0 };
            const labelPosition = resolveMobileUserDrawingTrendAngleLabelPosition(primitive, textBounds);

            return (
              <Group key={primitive.id} clip={primitive.clip} opacity={primitive.opacity}>
                {primitive.style.lineVisible !== false && (
                  <SkiaLine
                    p1={vec(primitive.start.x, primitive.start.y)}
                    p2={vec(primitive.end.x, primitive.end.y)}
                    color={primitive.style.lineColor}
                    strokeWidth={Math.max(1, primitive.style.lineWidth)}
                    style="stroke"
                  >
                    {dash && <DashPathEffect intervals={dash} />}
                  </SkiaLine>
                )}
                {font && (
                  <SkiaText
                    x={labelPosition.x}
                    y={labelPosition.y}
                    text={primitive.label}
                    font={font}
                    color={primitive.style.textColor ?? primitive.style.lineColor}
                  />
                )}
              </Group>
            );
          }

          if (primitive.kind === 'crossLine') {
            if (primitive.style.lineVisible === false) return null;
            const dash = dashIntervalsForUserDrawingLineStyle(primitive.style.lineStyle);

            return (
              <Group key={primitive.id} clip={primitive.clip}>
                <SkiaLine
                  p1={vec(primitive.horizontal.start.x, primitive.horizontal.start.y)}
                  p2={vec(primitive.horizontal.end.x, primitive.horizontal.end.y)}
                  color={primitive.style.lineColor}
                  opacity={primitive.opacity}
                  strokeWidth={Math.max(1, primitive.style.lineWidth)}
                  style="stroke"
                >
                  {dash && <DashPathEffect intervals={dash} />}
                </SkiaLine>
                <SkiaLine
                  p1={vec(primitive.vertical.start.x, primitive.vertical.start.y)}
                  p2={vec(primitive.vertical.end.x, primitive.vertical.end.y)}
                  color={primitive.style.lineColor}
                  opacity={primitive.opacity}
                  strokeWidth={Math.max(1, primitive.style.lineWidth)}
                  style="stroke"
                >
                  {dash && <DashPathEffect intervals={dash} />}
                </SkiaLine>
              </Group>
            );
          }

          if (primitive.kind === 'pitchfork') {
            if (primitive.style.lineVisible === false) return null;
            const dash = dashIntervalsForUserDrawingLineStyle(primitive.style.lineStyle);

            return (
              <Group key={primitive.id} clip={primitive.clip} opacity={primitive.opacity}>
                <SkiaLine
                  p1={vec(primitive.median.start.x, primitive.median.start.y)}
                  p2={vec(primitive.median.end.x, primitive.median.end.y)}
                  color={primitive.style.lineColor}
                  strokeWidth={Math.max(1, primitive.style.lineWidth)}
                  style="stroke"
                >
                  {dash && <DashPathEffect intervals={dash} />}
                </SkiaLine>
                <SkiaLine
                  p1={vec(primitive.upper.start.x, primitive.upper.start.y)}
                  p2={vec(primitive.upper.end.x, primitive.upper.end.y)}
                  color={primitive.style.lineColor}
                  strokeWidth={Math.max(1, primitive.style.lineWidth)}
                  style="stroke"
                >
                  {dash && <DashPathEffect intervals={dash} />}
                </SkiaLine>
                <SkiaLine
                  p1={vec(primitive.lower.start.x, primitive.lower.start.y)}
                  p2={vec(primitive.lower.end.x, primitive.lower.end.y)}
                  color={primitive.style.lineColor}
                  strokeWidth={Math.max(1, primitive.style.lineWidth)}
                  style="stroke"
                >
                  {dash && <DashPathEffect intervals={dash} />}
                </SkiaLine>
              </Group>
            );
          }

          if (
            primitive.kind === 'pitchfan' ||
            primitive.kind === 'fibFan' ||
            primitive.kind === 'fibSpeedResistanceFan' ||
            primitive.kind === 'gannFan'
          ) {
            if (primitive.style.lineVisible === false) return null;
            const dash = dashIntervalsForUserDrawingLineStyle(primitive.style.lineStyle);

            return (
              <Group key={primitive.id} clip={primitive.clip} opacity={primitive.opacity}>
                {primitive.rays.map((ray) => (
                  <SkiaLine
                    key={ray.ratio}
                    p1={vec(ray.start.x, ray.start.y)}
                    p2={vec(ray.end.x, ray.end.y)}
                    color={primitive.style.lineColor}
                    strokeWidth={Math.max(1, primitive.style.lineWidth)}
                    style="stroke"
                  >
                    {dash && <DashPathEffect intervals={dash} />}
                  </SkiaLine>
                ))}
              </Group>
            );
          }

          if (primitive.kind === 'fibChannel') {
            const dash = dashIntervalsForUserDrawingLineStyle(primitive.style.lineStyle);
            const path = Skia.Path.Make();
            const [firstPoint, ...remainingPoints] = primitive.points;
            if (!firstPoint) return null;
            path.moveTo(firstPoint.x, firstPoint.y);
            for (const point of remainingPoints) {
              path.lineTo(point.x, point.y);
            }
            path.close();

            return (
              <Group key={primitive.id} clip={primitive.clip} opacity={primitive.opacity}>
                {primitive.style.fillVisible !== false && primitive.style.fillColor && (
                  <SkiaPath path={path} color={primitive.style.fillColor} />
                )}
                {primitive.style.lineVisible !== false &&
                  primitive.levels.map((level) => (
                    <SkiaLine
                      key={`${primitive.id}:level:${level.ratio}`}
                      p1={vec(level.start.x, level.start.y)}
                      p2={vec(level.end.x, level.end.y)}
                      color={primitive.style.lineColor}
                      strokeWidth={Math.max(1, primitive.style.lineWidth)}
                      style="stroke"
                    >
                      {dash && <DashPathEffect intervals={dash} />}
                    </SkiaLine>
                  ))}
              </Group>
            );
          }

          if (
            primitive.kind === 'fibTimeZone' ||
            primitive.kind === 'trendBasedFibTime' ||
            primitive.kind === 'cyclicLines'
          ) {
            if (primitive.style.lineVisible === false) return null;
            const dash = dashIntervalsForUserDrawingLineStyle(primitive.style.lineStyle);

            return (
              <Group key={primitive.id} clip={primitive.clip} opacity={primitive.opacity}>
                {primitive.levels.map((level) => (
                  <SkiaLine
                    key={`${primitive.id}:level:${level.ratio}`}
                    p1={vec(level.start.x, level.start.y)}
                    p2={vec(level.end.x, level.end.y)}
                    color={primitive.style.lineColor}
                    strokeWidth={Math.max(1, primitive.style.lineWidth)}
                    style="stroke"
                  >
                    {dash && <DashPathEffect intervals={dash} />}
                  </SkiaLine>
                ))}
              </Group>
            );
          }

          if (primitive.kind === 'timeCycles') {
            if (primitive.style.lineVisible === false) return null;
            const dash = dashIntervalsForUserDrawingLineStyle(primitive.style.lineStyle);

            return (
              <Group key={primitive.id} clip={primitive.clip} opacity={primitive.opacity}>
                {primitive.cycles.map((cycle) => {
                  const path = Skia.Path.Make();
                  const [firstPoint, ...remainingPoints] = cycle.points;
                  if (firstPoint) {
                    path.moveTo(firstPoint.x, firstPoint.y);
                    for (const point of remainingPoints) {
                      path.lineTo(point.x, point.y);
                    }
                  }

                  return (
                    <Group key={`${primitive.id}:cycle:${cycle.ratio}`}>
                      <SkiaLine
                        p1={vec(cycle.startBoundary.start.x, cycle.startBoundary.start.y)}
                        p2={vec(cycle.startBoundary.end.x, cycle.startBoundary.end.y)}
                        color={primitive.style.lineColor}
                        strokeWidth={Math.max(1, primitive.style.lineWidth)}
                        style="stroke"
                      >
                        {dash && <DashPathEffect intervals={dash} />}
                      </SkiaLine>
                      <SkiaLine
                        p1={vec(cycle.endBoundary.start.x, cycle.endBoundary.start.y)}
                        p2={vec(cycle.endBoundary.end.x, cycle.endBoundary.end.y)}
                        color={primitive.style.lineColor}
                        strokeWidth={Math.max(1, primitive.style.lineWidth)}
                        style="stroke"
                      >
                        {dash && <DashPathEffect intervals={dash} />}
                      </SkiaLine>
                      {firstPoint && (
                        <SkiaPath
                          path={path}
                          color={primitive.style.lineColor}
                          strokeWidth={Math.max(1, primitive.style.lineWidth)}
                          style="stroke"
                        >
                          {dash && <DashPathEffect intervals={dash} />}
                        </SkiaPath>
                      )}
                    </Group>
                  );
                })}
              </Group>
            );
          }

          if (primitive.kind === 'sineLine') {
            if (primitive.style.lineVisible === false) return null;
            const dash = dashIntervalsForUserDrawingLineStyle(primitive.style.lineStyle);
            const path = Skia.Path.Make();
            const [firstPoint, ...remainingPoints] = primitive.points;
            if (!firstPoint) return null;
            path.moveTo(firstPoint.x, firstPoint.y);
            for (const point of remainingPoints) {
              path.lineTo(point.x, point.y);
            }

            return (
              <Group key={primitive.id} clip={primitive.clip} opacity={primitive.opacity}>
                <SkiaPath
                  path={path}
                  color={primitive.style.lineColor}
                  strokeWidth={Math.max(1, primitive.style.lineWidth)}
                  style="stroke"
                >
                  {dash && <DashPathEffect intervals={dash} />}
                </SkiaPath>
              </Group>
            );
          }

          if (primitive.kind === 'arrowMarker') {
            const dash = dashIntervalsForUserDrawingLineStyle(primitive.style.lineStyle);
            const path = Skia.Path.Make();
            const [firstPoint, ...remainingPoints] = primitive.points;
            if (!firstPoint) return null;
            path.moveTo(firstPoint.x, firstPoint.y);
            for (const point of remainingPoints) {
              path.lineTo(point.x, point.y);
            }
            path.close();

            return (
              <Group key={primitive.id} opacity={primitive.opacity} clip={primitive.clip}>
                {primitive.style.fillVisible !== false && (
                  <SkiaPath
                    path={path}
                    color={primitive.style.fillColor ?? primitive.style.lineColor}
                    style="fill"
                  />
                )}
                {primitive.style.lineVisible !== false && (
                  <SkiaPath
                    path={path}
                    color={primitive.style.lineColor}
                    style="stroke"
                    strokeWidth={Math.max(1, primitive.style.lineWidth)}
                    strokeJoin="round"
                  >
                    {dash && <DashPathEffect intervals={dash} />}
                  </SkiaPath>
                )}
              </Group>
            );
          }

          if (primitive.kind === 'arrowMark') {
            const dash = dashIntervalsForUserDrawingLineStyle(primitive.style.lineStyle);
            const path = Skia.Path.Make();
            const [firstPoint, ...remainingPoints] = primitive.points;
            if (!firstPoint) return null;
            path.moveTo(firstPoint.x, firstPoint.y);
            for (const point of remainingPoints) {
              path.lineTo(point.x, point.y);
            }
            path.close();

            return (
              <Group key={primitive.id} opacity={primitive.opacity} clip={primitive.clip}>
                {primitive.style.fillVisible !== false && (
                  <SkiaPath
                    path={path}
                    color={primitive.style.fillColor ?? primitive.style.lineColor}
                    style="fill"
                  />
                )}
                {primitive.style.lineVisible !== false && (
                  <SkiaPath
                    path={path}
                    color={primitive.style.lineColor}
                    style="stroke"
                    strokeWidth={Math.max(1, primitive.style.lineWidth)}
                    strokeJoin="round"
                  >
                    {dash && <DashPathEffect intervals={dash} />}
                  </SkiaPath>
                )}
              </Group>
            );
          }

          if (primitive.kind === 'rectangle') {
            const dash = dashIntervalsForUserDrawingLineStyle(primitive.style.lineStyle);

            return (
              <Group key={primitive.id} opacity={primitive.opacity} clip={primitive.clip}>
                {primitive.style.fillVisible !== false && primitive.style.fillColor && (
                  <Rect
                    x={primitive.rect.x}
                    y={primitive.rect.y}
                    width={primitive.rect.width}
                    height={primitive.rect.height}
                    color={primitive.style.fillColor}
                  />
                )}
                {primitive.style.lineVisible !== false && (
                  <Rect
                    x={primitive.rect.x}
                    y={primitive.rect.y}
                    width={primitive.rect.width}
                    height={primitive.rect.height}
                    color={primitive.style.lineColor}
                    style="stroke"
                    strokeWidth={Math.max(1, primitive.style.lineWidth)}
                  >
                    {dash && <DashPathEffect intervals={dash} />}
                  </Rect>
                )}
              </Group>
            );
          }

          if (primitive.kind === 'gannBox' || primitive.kind === 'gannSquare') {
            const dash = dashIntervalsForUserDrawingLineStyle(primitive.style.lineStyle);
            const path = Skia.Path.Make();
            for (const level of primitive.levels) {
              path.moveTo(level.horizontal.start.x, level.horizontal.start.y);
              path.lineTo(level.horizontal.end.x, level.horizontal.end.y);
              path.moveTo(level.vertical.start.x, level.vertical.start.y);
              path.lineTo(level.vertical.end.x, level.vertical.end.y);
            }
            for (const angle of primitive.angles) {
              path.moveTo(angle.start.x, angle.start.y);
              path.lineTo(angle.end.x, angle.end.y);
            }

            return (
              <Group key={primitive.id} opacity={primitive.opacity} clip={primitive.clip}>
                {primitive.style.fillVisible !== false && primitive.style.fillColor && (
                  <Rect
                    x={primitive.rect.x}
                    y={primitive.rect.y}
                    width={primitive.rect.width}
                    height={primitive.rect.height}
                    color={primitive.style.fillColor}
                  />
                )}
                {primitive.style.lineVisible !== false && (
                  <SkiaPath
                    path={path}
                    color={primitive.style.lineColor}
                    style="stroke"
                    strokeWidth={Math.max(1, primitive.style.lineWidth)}
                    strokeCap="round"
                    strokeJoin="round"
                  >
                    {dash && <DashPathEffect intervals={dash} />}
                  </SkiaPath>
                )}
              </Group>
            );
          }

          if (primitive.kind === 'circle') {
            const dash = dashIntervalsForUserDrawingLineStyle(primitive.style.lineStyle);

            return (
              <Group key={primitive.id} opacity={primitive.opacity} clip={primitive.clip}>
                {primitive.style.fillVisible !== false && primitive.style.fillColor && (
                  <Circle
                    cx={primitive.center.x}
                    cy={primitive.center.y}
                    r={primitive.radius}
                    color={primitive.style.fillColor}
                  />
                )}
                {primitive.style.lineVisible !== false && (
                  <Circle
                    cx={primitive.center.x}
                    cy={primitive.center.y}
                    r={primitive.radius}
                    color={primitive.style.lineColor}
                    style="stroke"
                    strokeWidth={Math.max(1, primitive.style.lineWidth)}
                  >
                    {dash && <DashPathEffect intervals={dash} />}
                  </Circle>
                )}
              </Group>
            );
          }

          if (primitive.kind === 'fibCircles') {
            if (primitive.style.lineVisible === false) return null;
            const dash = dashIntervalsForUserDrawingLineStyle(primitive.style.lineStyle);

            return (
              <Group key={primitive.id} opacity={primitive.opacity} clip={primitive.clip}>
                {primitive.circles.map((circle) => (
                  <Circle
                    key={`${primitive.id}:circle:${circle.ratio}`}
                    cx={primitive.center.x}
                    cy={primitive.center.y}
                    r={circle.radius}
                    color={primitive.style.lineColor}
                    style="stroke"
                    strokeWidth={Math.max(1, primitive.style.lineWidth)}
                  >
                    {dash && <DashPathEffect intervals={dash} />}
                  </Circle>
                ))}
              </Group>
            );
          }

          if (primitive.kind === 'fibSpeedResistanceArcs') {
            if (primitive.style.lineVisible === false) return null;
            const dash = dashIntervalsForUserDrawingLineStyle(primitive.style.lineStyle);

            return (
              <Group key={primitive.id} opacity={primitive.opacity} clip={primitive.clip}>
                {primitive.arcs.map((arc) => {
                  const path = Skia.Path.Make();
                  const startDeg = (arc.startAngle * 180) / Math.PI;
                  const sweepDeg = ((arc.endAngle - arc.startAngle) * 180) / Math.PI;
                  path.arcToOval(
                    Skia.XYWHRect(
                      primitive.center.x - arc.radius,
                      primitive.center.y - arc.radius,
                      arc.radius * 2,
                      arc.radius * 2,
                    ),
                    startDeg,
                    sweepDeg,
                    false,
                  );
                  return (
                    <SkiaPath
                      key={`${primitive.id}:arc:${arc.ratio}`}
                      path={path}
                      color={primitive.style.lineColor}
                      style="stroke"
                      strokeWidth={Math.max(1, primitive.style.lineWidth)}
                    >
                      {dash && <DashPathEffect intervals={dash} />}
                    </SkiaPath>
                  );
                })}
              </Group>
            );
          }

          if (primitive.kind === 'fibWedge') {
            if (primitive.style.lineVisible === false && primitive.style.fillVisible === false) return null;
            const dash = dashIntervalsForUserDrawingLineStyle(primitive.style.lineStyle);
            const boundaryPath = Skia.Path.Make();
            for (const boundary of primitive.boundaries) {
              boundaryPath.moveTo(boundary.start.x, boundary.start.y);
              boundaryPath.lineTo(boundary.end.x, boundary.end.y);
            }
            const outerArc = primitive.arcs[primitive.arcs.length - 1];
            const fillPath = Skia.Path.Make();
            fillPath.moveTo(primitive.center.x, primitive.center.y);
            if (outerArc) {
              fillPath.lineTo(
                primitive.center.x + Math.cos(outerArc.startAngle) * primitive.baseRadius,
                primitive.center.y + Math.sin(outerArc.startAngle) * primitive.baseRadius,
              );
              fillPath.arcToOval(
                Skia.XYWHRect(
                  primitive.center.x - primitive.baseRadius,
                  primitive.center.y - primitive.baseRadius,
                  primitive.baseRadius * 2,
                  primitive.baseRadius * 2,
                ),
                (outerArc.startAngle * 180) / Math.PI,
                ((outerArc.endAngle - outerArc.startAngle) * 180) / Math.PI,
                false,
              );
              fillPath.close();
            }

            return (
              <Group key={primitive.id} opacity={primitive.opacity} clip={primitive.clip}>
                {primitive.style.fillVisible !== false && primitive.style.fillColor && (
                  <SkiaPath path={fillPath} color={primitive.style.fillColor} style="fill" />
                )}
                {primitive.style.lineVisible !== false && (
                  <>
                    <SkiaPath
                      path={boundaryPath}
                      color={primitive.style.lineColor}
                      style="stroke"
                      strokeWidth={Math.max(1, primitive.style.lineWidth)}
                      strokeCap="round"
                    >
                      {dash && <DashPathEffect intervals={dash} />}
                    </SkiaPath>
                    {primitive.arcs.map((arc) => {
                      const path = Skia.Path.Make();
                      const startDeg = (arc.startAngle * 180) / Math.PI;
                      const sweepDeg = ((arc.endAngle - arc.startAngle) * 180) / Math.PI;
                      path.arcToOval(
                        Skia.XYWHRect(
                          primitive.center.x - arc.radius,
                          primitive.center.y - arc.radius,
                          arc.radius * 2,
                          arc.radius * 2,
                        ),
                        startDeg,
                        sweepDeg,
                        false,
                      );
                      return (
                        <SkiaPath
                          key={`${primitive.id}:arc:${arc.ratio}`}
                          path={path}
                          color={primitive.style.lineColor}
                          style="stroke"
                          strokeWidth={Math.max(1, primitive.style.lineWidth)}
                          strokeCap="round"
                        >
                          {dash && <DashPathEffect intervals={dash} />}
                        </SkiaPath>
                      );
                    })}
                  </>
                )}
              </Group>
            );
          }

          if (primitive.kind === 'ellipse') {
            const dash = dashIntervalsForUserDrawingLineStyle(primitive.style.lineStyle);

            return (
              <Group key={primitive.id} opacity={primitive.opacity} clip={primitive.clip}>
                {primitive.style.fillVisible !== false && primitive.style.fillColor && (
                  <Oval
                    x={primitive.rect.x}
                    y={primitive.rect.y}
                    width={primitive.rect.width}
                    height={primitive.rect.height}
                    color={primitive.style.fillColor}
                  />
                )}
                {primitive.style.lineVisible !== false && (
                  <Oval
                    x={primitive.rect.x}
                    y={primitive.rect.y}
                    width={primitive.rect.width}
                    height={primitive.rect.height}
                    color={primitive.style.lineColor}
                    style="stroke"
                    strokeWidth={Math.max(1, primitive.style.lineWidth)}
                  >
                    {dash && <DashPathEffect intervals={dash} />}
                  </Oval>
                )}
              </Group>
            );
          }

          if (
            primitive.kind === 'path' ||
            primitive.kind === 'brush' ||
            primitive.kind === 'highlighter' ||
            primitive.kind === 'curve' ||
            primitive.kind === 'arc' ||
            primitive.kind === 'fibSpiral'
          ) {
            const dash = dashIntervalsForUserDrawingLineStyle(primitive.style.lineStyle);
            const path = Skia.Path.Make();
            const [firstPoint, ...remainingPoints] = primitive.points;
            if (!firstPoint) return null;
            path.moveTo(firstPoint.x, firstPoint.y);
            for (const point of remainingPoints) {
              path.lineTo(point.x, point.y);
            }

            return (
              <Group key={primitive.id} opacity={primitive.opacity} clip={primitive.clip}>
                {primitive.style.lineVisible !== false && (
                  <SkiaPath
                    path={path}
                    color={primitive.style.lineColor}
                    style="stroke"
                    strokeWidth={Math.max(1, primitive.style.lineWidth)}
                    strokeCap="round"
                    strokeJoin="round"
                  >
                    {dash && <DashPathEffect intervals={dash} />}
                  </SkiaPath>
                )}
              </Group>
            );
          }

          if (primitive.kind === 'anchoredVwap') {
            const dash = dashIntervalsForUserDrawingLineStyle(primitive.style.lineStyle);
            const path = Skia.Path.Make();
            const [firstPoint, ...remainingPoints] = primitive.points;
            if (!firstPoint) return null;
            path.moveTo(firstPoint.x, firstPoint.y);
            for (const point of remainingPoints) {
              path.lineTo(point.x, point.y);
            }

            return (
              <Group key={primitive.id} opacity={primitive.opacity} clip={primitive.clip}>
                {primitive.style.lineVisible !== false && (
                  <SkiaPath
                    path={path}
                    color={primitive.style.lineColor}
                    style="stroke"
                    strokeWidth={Math.max(1, primitive.style.lineWidth)}
                    strokeCap="round"
                    strokeJoin="round"
                  >
                    {dash && <DashPathEffect intervals={dash} />}
                  </SkiaPath>
                )}
              </Group>
            );
          }

          if (primitive.kind === 'triangle') {
            const dash = dashIntervalsForUserDrawingLineStyle(primitive.style.lineStyle);
            const path = Skia.Path.Make();
            const [firstPoint, ...remainingPoints] = primitive.points;
            if (!firstPoint) return null;
            path.moveTo(firstPoint.x, firstPoint.y);
            for (const point of remainingPoints) {
              path.lineTo(point.x, point.y);
            }
            path.close();

            return (
              <Group key={primitive.id} opacity={primitive.opacity} clip={primitive.clip}>
                {primitive.style.fillVisible !== false && primitive.style.fillColor && (
                  <SkiaPath path={path} color={primitive.style.fillColor} />
                )}
                {primitive.style.lineVisible !== false && (
                  <SkiaPath
                    path={path}
                    color={primitive.style.lineColor}
                    style="stroke"
                    strokeWidth={Math.max(1, primitive.style.lineWidth)}
                    strokeCap="round"
                    strokeJoin="round"
                  >
                    {dash && <DashPathEffect intervals={dash} />}
                  </SkiaPath>
                )}
              </Group>
            );
          }

          if (
            primitive.kind === 'parallelChannel' ||
            primitive.kind === 'regressionTrend' ||
            primitive.kind === 'rotatedRectangle' ||
            primitive.kind === 'flatTopBottom' ||
            primitive.kind === 'disjointChannel'
          ) {
            const dash = dashIntervalsForUserDrawingLineStyle(primitive.style.lineStyle);
            const path = Skia.Path.Make();
            const [firstPoint, ...remainingPoints] = primitive.points;
            if (!firstPoint) return null;
            path.moveTo(firstPoint.x, firstPoint.y);
            for (const point of remainingPoints) {
              path.lineTo(point.x, point.y);
            }
            path.close();

            return (
              <Group key={primitive.id} opacity={primitive.opacity} clip={primitive.clip}>
                {primitive.style.fillVisible !== false && primitive.style.fillColor && (
                  <SkiaPath path={path} color={primitive.style.fillColor} />
                )}
                {primitive.style.lineVisible !== false && (
                  <SkiaPath
                    path={path}
                    color={primitive.style.lineColor}
                    style="stroke"
                    strokeWidth={Math.max(1, primitive.style.lineWidth)}
                    strokeCap="round"
                    strokeJoin="round"
                  >
                    {dash && <DashPathEffect intervals={dash} />}
                  </SkiaPath>
                )}
              </Group>
            );
          }

          if (primitive.kind === 'riskRewardPosition') {
            const dash = dashIntervalsForUserDrawingLineStyle(primitive.style.lineStyle);
            const font = getUserDrawingTextFont(primitive.style.fontSize, primitive.style.fontFamily);
            const rewardTextBounds = font ? font.measureText(primitive.rewardLabel) : { width: 0 };
            const riskTextBounds = font ? font.measureText(primitive.riskLabel) : { width: 0 };
            const ratioTextBounds = font ? font.measureText(primitive.ratioLabel) : { width: 0 };
            const rewardLabelPosition = resolveMobileUserDrawingRiskRewardLabelPosition(
              { labelPoint: primitive.rewardLabelPoint, style: primitive.style },
              rewardTextBounds,
            );
            const riskLabelPosition = resolveMobileUserDrawingRiskRewardLabelPosition(
              { labelPoint: primitive.riskLabelPoint, style: primitive.style },
              riskTextBounds,
            );
            const ratioLabelPosition = resolveMobileUserDrawingRiskRewardLabelPosition(
              { labelPoint: primitive.ratioLabelPoint, style: primitive.style },
              ratioTextBounds,
            );

            return (
              <Group key={primitive.id} opacity={primitive.opacity} clip={primitive.clip}>
                {primitive.style.fillVisible !== false && (
                  <>
                    <Rect
                      x={primitive.profitRect.x}
                      y={primitive.profitRect.y}
                      width={primitive.profitRect.width}
                      height={primitive.profitRect.height}
                      color="rgba(34, 197, 94, 0.18)"
                    />
                    <Rect
                      x={primitive.riskRect.x}
                      y={primitive.riskRect.y}
                      width={primitive.riskRect.width}
                      height={primitive.riskRect.height}
                      color="rgba(244, 63, 94, 0.18)"
                    />
                  </>
                )}
                {primitive.style.lineVisible !== false && (
                  <>
                    <Rect
                      x={primitive.profitRect.x}
                      y={primitive.profitRect.y}
                      width={primitive.profitRect.width}
                      height={primitive.profitRect.height}
                      color="#22c55e"
                      style="stroke"
                      strokeWidth={Math.max(1, primitive.style.lineWidth)}
                    >
                      {dash && <DashPathEffect intervals={dash} />}
                    </Rect>
                    <Rect
                      x={primitive.riskRect.x}
                      y={primitive.riskRect.y}
                      width={primitive.riskRect.width}
                      height={primitive.riskRect.height}
                      color="#f43f5e"
                      style="stroke"
                      strokeWidth={Math.max(1, primitive.style.lineWidth)}
                    >
                      {dash && <DashPathEffect intervals={dash} />}
                    </Rect>
                    {[primitive.targetLine, primitive.entryLine, primitive.stopLine].map((line, index) => (
                      <SkiaLine
                        key={`${primitive.id}:line:${index}`}
                        p1={vec(line.start.x, line.start.y)}
                        p2={vec(line.end.x, line.end.y)}
                        color={primitive.style.lineColor}
                        strokeWidth={Math.max(1, primitive.style.lineWidth)}
                        style="stroke"
                      >
                        {dash && <DashPathEffect intervals={dash} />}
                      </SkiaLine>
                    ))}
                  </>
                )}
                {font && (
                  <>
                    <SkiaText
                      x={rewardLabelPosition.x}
                      y={rewardLabelPosition.y}
                      text={primitive.rewardLabel}
                      font={font}
                      color={primitive.style.textColor ?? primitive.style.lineColor}
                    />
                    <SkiaText
                      x={riskLabelPosition.x}
                      y={riskLabelPosition.y}
                      text={primitive.riskLabel}
                      font={font}
                      color={primitive.style.textColor ?? primitive.style.lineColor}
                    />
                    <SkiaText
                      x={ratioLabelPosition.x}
                      y={ratioLabelPosition.y}
                      text={primitive.ratioLabel}
                      font={font}
                      color={primitive.style.textColor ?? primitive.style.lineColor}
                    />
                  </>
                )}
              </Group>
            );
          }

          if (primitive.kind === 'barsPattern') {
            return (
              <Group key={primitive.id} opacity={primitive.opacity} clip={primitive.clip}>
                {primitive.bars.map((bar) => {
                  const color = bar.up ? '#22c55e' : '#f43f5e';
                  const bodyTop = Math.min(bar.openY, bar.closeY);
                  const bodyHeight = Math.max(1, Math.abs(bar.closeY - bar.openY));
                  const bodyX = bar.x - bar.bodyWidth / 2;

                  return (
                    <Group key={`${primitive.id}:bar:${bar.time}`}>
                      {primitive.style.lineVisible !== false && (
                        <SkiaLine
                          p1={vec(bar.x, bar.highY)}
                          p2={vec(bar.x, bar.lowY)}
                          color={color}
                          strokeWidth={Math.max(1, primitive.style.lineWidth)}
                          style="stroke"
                        />
                      )}
                      {primitive.style.fillVisible !== false && (
                        <Rect x={bodyX} y={bodyTop} width={bar.bodyWidth} height={bodyHeight} color={color} />
                      )}
                      {primitive.style.lineVisible !== false && (
                        <Rect
                          x={bodyX}
                          y={bodyTop}
                          width={bar.bodyWidth}
                          height={bodyHeight}
                          color={primitive.style.lineColor}
                          style="stroke"
                          strokeWidth={Math.max(1, primitive.style.lineWidth)}
                        />
                      )}
                    </Group>
                  );
                })}
              </Group>
            );
          }

          if (primitive.kind === 'priceRange') {
            const dash = dashIntervalsForUserDrawingLineStyle(primitive.style.lineStyle);
            const font = getUserDrawingTextFont(primitive.style.fontSize, primitive.style.fontFamily);
            const textBounds = font ? font.measureText(primitive.label) : { width: 0 };
            const labelPosition = resolveMobileUserDrawingPriceRangeLabelPosition(primitive, textBounds);

            return (
              <Group key={primitive.id} opacity={primitive.opacity} clip={primitive.clip}>
                {primitive.style.fillVisible !== false && primitive.style.fillColor && (
                  <Rect
                    x={primitive.rect.x}
                    y={primitive.rect.y}
                    width={primitive.rect.width}
                    height={primitive.rect.height}
                    color={primitive.style.fillColor}
                  />
                )}
                {primitive.style.lineVisible !== false && (
                  <Rect
                    x={primitive.rect.x}
                    y={primitive.rect.y}
                    width={primitive.rect.width}
                    height={primitive.rect.height}
                    color={primitive.style.lineColor}
                    style="stroke"
                    strokeWidth={Math.max(1, primitive.style.lineWidth)}
                  >
                    {dash && <DashPathEffect intervals={dash} />}
                  </Rect>
                )}
                {font && (
                  <SkiaText
                    x={labelPosition.x}
                    y={labelPosition.y}
                    text={primitive.label}
                    font={font}
                    color={primitive.style.textColor ?? primitive.style.lineColor}
                  />
                )}
              </Group>
            );
          }

          if (primitive.kind === 'datePriceRange') {
            const dash = dashIntervalsForUserDrawingLineStyle(primitive.style.lineStyle);
            const font = getUserDrawingTextFont(primitive.style.fontSize, primitive.style.fontFamily);
            const priceTextBounds = font ? font.measureText(primitive.priceLabel) : { width: 0 };
            const dateTextBounds = font ? font.measureText(primitive.dateLabel) : { width: 0 };
            const priceLabelPosition = resolveMobileUserDrawingMeasurementLabelPosition(
              { labelPoint: primitive.priceLabelPoint, style: primitive.style },
              priceTextBounds,
            );
            const dateLabelPosition = resolveMobileUserDrawingMeasurementLabelPosition(
              { labelPoint: primitive.dateLabelPoint, style: primitive.style },
              dateTextBounds,
            );

            return (
              <Group key={primitive.id} opacity={primitive.opacity} clip={primitive.clip}>
                {primitive.style.fillVisible !== false && primitive.style.fillColor && (
                  <Rect
                    x={primitive.rect.x}
                    y={primitive.rect.y}
                    width={primitive.rect.width}
                    height={primitive.rect.height}
                    color={primitive.style.fillColor}
                  />
                )}
                {primitive.style.lineVisible !== false && (
                  <Rect
                    x={primitive.rect.x}
                    y={primitive.rect.y}
                    width={primitive.rect.width}
                    height={primitive.rect.height}
                    color={primitive.style.lineColor}
                    style="stroke"
                    strokeWidth={Math.max(1, primitive.style.lineWidth)}
                  >
                    {dash && <DashPathEffect intervals={dash} />}
                  </Rect>
                )}
                {font && (
                  <>
                    <SkiaText
                      x={priceLabelPosition.x}
                      y={priceLabelPosition.y}
                      text={primitive.priceLabel}
                      font={font}
                      color={primitive.style.textColor ?? primitive.style.lineColor}
                    />
                    <SkiaText
                      x={dateLabelPosition.x}
                      y={dateLabelPosition.y}
                      text={primitive.dateLabel}
                      font={font}
                      color={primitive.style.textColor ?? primitive.style.lineColor}
                    />
                  </>
                )}
              </Group>
            );
          }

          if (primitive.kind === 'fibRetracement' || primitive.kind === 'fibExtension') {
            const dash = dashIntervalsForUserDrawingLineStyle(primitive.style.lineStyle);
            const font = getUserDrawingTextFont(primitive.style.fontSize, primitive.style.fontFamily);

            return (
              <Group key={primitive.id} opacity={primitive.opacity} clip={primitive.clip}>
                {primitive.style.lineVisible !== false &&
                  primitive.levels.map((level) => (
                    <SkiaLine
                      key={`${primitive.id}:level:${level.ratio}:line`}
                      p1={vec(level.start.x, level.start.y)}
                      p2={vec(level.end.x, level.end.y)}
                      color={primitive.style.lineColor}
                      strokeWidth={Math.max(1, primitive.style.lineWidth)}
                      strokeCap="round"
                    >
                      {dash && <DashPathEffect intervals={dash} />}
                    </SkiaLine>
                  ))}
                {font &&
                  primitive.levels.map((level) => (
                    <SkiaText
                      key={`${primitive.id}:level:${level.ratio}:label`}
                      x={level.start.x + 4}
                      y={level.start.y - 2}
                      text={level.label}
                      font={font}
                      color={primitive.style.textColor ?? primitive.style.lineColor}
                    />
                  ))}
              </Group>
            );
          }

          if (primitive.kind === 'dateRange') {
            const dash = dashIntervalsForUserDrawingLineStyle(primitive.style.lineStyle);
            const font = getUserDrawingTextFont(primitive.style.fontSize, primitive.style.fontFamily);
            const textBounds = font ? font.measureText(primitive.label) : { width: 0 };
            const labelPosition = resolveMobileUserDrawingPriceRangeLabelPosition(primitive, textBounds);

            return (
              <Group key={primitive.id} opacity={primitive.opacity} clip={primitive.clip}>
                {primitive.style.fillVisible !== false && primitive.style.fillColor && (
                  <Rect
                    x={primitive.rect.x}
                    y={primitive.rect.y}
                    width={primitive.rect.width}
                    height={primitive.rect.height}
                    color={primitive.style.fillColor}
                  />
                )}
                {primitive.style.lineVisible !== false && (
                  <Rect
                    x={primitive.rect.x}
                    y={primitive.rect.y}
                    width={primitive.rect.width}
                    height={primitive.rect.height}
                    color={primitive.style.lineColor}
                    style="stroke"
                    strokeWidth={Math.max(1, primitive.style.lineWidth)}
                  >
                    {dash && <DashPathEffect intervals={dash} />}
                  </Rect>
                )}
                {font && (
                  <SkiaText
                    x={labelPosition.x}
                    y={labelPosition.y}
                    text={primitive.label}
                    font={font}
                    color={primitive.style.textColor ?? primitive.style.lineColor}
                  />
                )}
              </Group>
            );
          }

          if (primitive.kind === 'pin') {
            const radius = primitive.radius;
            const stem = radius * 1.8;
            const dash = dashIntervalsForUserDrawingLineStyle(primitive.style.lineStyle);
            const color = primitive.style.lineColor;
            return (
              <Group key={primitive.id} opacity={primitive.opacity} clip={primitive.clip}>
                <Circle
                  cx={primitive.point.x}
                  cy={primitive.point.y - stem}
                  r={radius}
                  color={primitive.style.fillColor ?? color}
                />
                <Circle
                  cx={primitive.point.x}
                  cy={primitive.point.y - stem}
                  r={radius}
                  color={color}
                  style="stroke"
                  strokeWidth={1}
                >
                  {dash && <DashPathEffect intervals={dash} />}
                </Circle>
                <SkiaLine
                  p1={vec(primitive.point.x, primitive.point.y - stem + radius)}
                  p2={vec(primitive.point.x, primitive.point.y)}
                  color={color}
                  strokeWidth={Math.max(1, primitive.style.lineWidth)}
                >
                  {dash && <DashPathEffect intervals={dash} />}
                </SkiaLine>
              </Group>
            );
          }

          if (
            primitive.kind === 'textLabel' ||
            primitive.kind === 'note' ||
            primitive.kind === 'callout' ||
            primitive.kind === 'priceNote' ||
            primitive.kind === 'comment' ||
            primitive.kind === 'balloon'
          ) {
            const font = getUserDrawingTextFont(primitive.style.fontSize, primitive.style.fontFamily);
            if (!font) return null;
            const dash = dashIntervalsForUserDrawingLineStyle(primitive.style.lineStyle);
            const measuredWidths = splitUserDrawingTextLines(primitive.text).map((line) => font.measureText(line).width);
            const layout =
              primitive.kind === 'balloon'
                ? resolveMobileUserDrawingBalloonLayout(primitive, measuredWidths)
                : resolveMobileUserDrawingTextLabelLayout(primitive, measuredWidths);
            const balloonTailPath = primitive.kind === 'balloon' ? Skia.Path.Make() : null;
            if (balloonTailPath && 'tail' in layout) {
              balloonTailPath.moveTo(layout.tail.left.x, layout.tail.left.y);
              balloonTailPath.lineTo(layout.tail.tip.x, layout.tail.tip.y);
              balloonTailPath.lineTo(layout.tail.right.x, layout.tail.right.y);
              balloonTailPath.close();
            }

            return (
              <Group key={primitive.id} opacity={primitive.opacity} clip={primitive.clip}>
                {(primitive.kind === 'callout' || primitive.kind === 'priceNote') && (
                  <SkiaLine
                    p1={vec(primitive.tip.x, primitive.tip.y)}
                    p2={vec(primitive.point.x, primitive.point.y)}
                    color={primitive.style.lineColor}
                    strokeWidth={Math.max(1, primitive.style.lineWidth)}
                  >
                    {dash && <DashPathEffect intervals={dash} />}
                  </SkiaLine>
                )}
                {primitive.style.fillVisible !== false && primitive.style.fillColor && (
                  <>
                    <Rect
                      x={layout.box.x}
                      y={layout.box.y}
                      width={layout.box.width}
                      height={layout.box.height}
                      color={primitive.style.fillColor}
                    />
                    {balloonTailPath && <SkiaPath path={balloonTailPath} color={primitive.style.fillColor} />}
                  </>
                )}
                {primitive.style.lineVisible !== false && (
                  <>
                    <Rect
                      x={layout.box.x}
                      y={layout.box.y}
                      width={layout.box.width}
                      height={layout.box.height}
                      color={primitive.style.lineColor}
                      style="stroke"
                      strokeWidth={Math.max(1, primitive.style.lineWidth)}
                    >
                      {dash && <DashPathEffect intervals={dash} />}
                    </Rect>
                    {balloonTailPath && (
                      <SkiaPath
                        path={balloonTailPath}
                        color={primitive.style.lineColor}
                        style="stroke"
                        strokeWidth={Math.max(1, primitive.style.lineWidth)}
                      >
                        {dash && <DashPathEffect intervals={dash} />}
                      </SkiaPath>
                    )}
                  </>
                )}
                {layout.lines.map((line, index) => (
                  <SkiaText
                    key={`${primitive.id}:line:${index}`}
                    x={line.x}
                    y={line.y}
                    text={line.text}
                    font={font}
                    color={primitive.style.textColor ?? primitive.style.lineColor}
                  />
                ))}
              </Group>
            );
          }

          if (primitive.kind !== 'handle') return null;

          return (
            <Group key={primitive.id} clip={primitive.clip}>
              <Circle
                cx={primitive.point.x}
                cy={primitive.point.y}
                r={primitive.radius}
                color={primitive.fillColor}
                style="fill"
              />
              <Circle
                cx={primitive.point.x}
                cy={primitive.point.y}
                r={primitive.radius}
                color={primitive.strokeColor}
                style="stroke"
                strokeWidth={1}
              />
            </Group>
          );
        })}

        {/* Crosshair lines mirror the web overlay and avoid RN dashed-border gaps on iOS. */}
        {crosshairOverlay && (
          <Group>
            <SkiaLine
              p1={vec(crosshairOverlay.x, crosshairOverlay.chartTop)}
              p2={vec(crosshairOverlay.x, crosshairOverlay.chartBottom)}
              color={crosshairOverlay.color}
              strokeWidth={1}
              style="stroke"
            >
              <DashPathEffect intervals={[4, 4]} />
            </SkiaLine>

            {crosshairOverlay.showHorizontal && (
              <SkiaLine
                p1={vec(crosshairOverlay.chartLeft, crosshairOverlay.y)}
                p2={vec(crosshairOverlay.horizontalRight, crosshairOverlay.y)}
                color={crosshairOverlay.color}
                strokeWidth={1}
                style="stroke"
              >
                <DashPathEffect intervals={[4, 4]} />
              </SkiaLine>
            )}
          </Group>
        )}

        {/* Bracket drag preview (TP/SL dashed line + label) */}
        {bracketPreview && bracketFont && (
          <Group>
            {/* Dashed horizontal line at drag price */}
            <SkiaLine
              p1={vec(bracketPreview.chartLeft, bracketPreview.y)}
              p2={vec(bracketPreview.chartRight, bracketPreview.y)}
              color={bracketPreview.color}
              strokeWidth={1.5}
              style="stroke"
            >
              <DashPathEffect intervals={[6, 4]} />
            </SkiaLine>

            {/* Label background */}
            <Rect
              x={bracketPreview.chartRight - 160}
              y={bracketPreview.y - 18}
              width={155}
              height={16}
              color="rgba(19, 23, 34, 0.9)"
            />
            {/* Label border */}
            <Rect
              x={bracketPreview.chartRight - 160}
              y={bracketPreview.y - 18}
              width={155}
              height={16}
              color={bracketPreview.color}
              style="stroke"
              strokeWidth={1}
            />

            {/* Label text */}
            <SkiaText
              x={bracketPreview.chartRight - 156}
              y={bracketPreview.y - 6}
              text={bracketPreview.labelText}
              font={bracketFont}
              color={bracketPreview.pnl >= 0 ? '#22c55e' : '#ef4444'}
            />
          </Group>
        )}
      </Canvas>

      {/* Layer 2: Interactive RN Layer (order lines, crosshair, etc.) */}
      <View style={[styles.absoluteFill, styles.interactiveLayer]} pointerEvents="box-none">
        {/* Text labels from Skia renderer */}
        {textItems.map((item, index) => (
          <Text key={`${item.text}-${item.x}-${item.y}-${index}`} style={getTextStyle(item)} numberOfLines={1}>
            {item.text}
          </Text>
        ))}

        {/* Order lines */}
        {viewport &&
          orderLines?.map((order) => (
            <OrderLineComponent
              key={order.id}
              order={order}
              viewport={viewport}
              dimensions={chartDimensions}
              pricePrecision={pricePrecision}
              useNarrowText={dimensions.width < 400}
              onPriceChange={onOrderMove}
              onCancel={onOrderCancel}
              onTPMovePreview={handleOrderTPMove}
              onSLMovePreview={handleOrderSLMove}
              onTPSLDragEnd={handleTPSLDragEnd}
            />
          ))}

        {/* Position lines */}
        {viewport &&
          positionLines?.map((position) => (
            <PositionLineComponent
              key={position.id}
              position={position}
              viewport={viewport}
              dimensions={chartDimensions}
              pricePrecision={pricePrecision}
              useNarrowText={dimensions.width < 400}
              onClose={onPositionClose}
              onReverse={onPositionReverse}
              onTPMovePreview={handleTPMove}
              onSLMovePreview={handleSLMove}
              onTPSLDragEnd={handleTPSLDragEnd}
            />
          ))}

        {/* Crosshair */}
        {viewport && (
          <CrosshairComponent
            x={lastCrosshairPosition.x}
            y={lastCrosshairPosition.y}
            visible={crosshairVisible}
            viewport={viewport}
            dimensions={chartDimensions}
            pricePrecision={pricePrecision}
            color={fullRenderOptions.crosshairColor}
            showContextMenuButton={!!onContextMenu}
            showLines={false}
            onContextMenuPress={handleContextMenuPress}
          />
        )}
      </View>

      {/* Layer 3: Base Gesture Handler */}
      <GestureDetector gesture={allGestures}>
        <Animated.View style={[styles.absoluteFill, { width: dimensions.width, height: dimensions.height }]} />
      </GestureDetector>

      {/* Reset viewport button — re-enables auto-scale */}
      {resetButtonVisible && (
        <Animated.View style={[styles.resetButtonContainer, resetButtonAnimatedStyle]} pointerEvents="box-none">
          <TouchableOpacity
            style={styles.resetButton}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            onPress={handleResetButtonPress}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Reset chart viewport"
            accessibilityHint="Resets zoom and auto-scale"
          >
            <Text style={styles.resetButtonText}>↻</Text>
          </TouchableOpacity>
        </Animated.View>
      )}

      {activeUserDrawingTextEditPrimitive && activeUserDrawingTextEditorStyle && (
        <TextInput
          accessibilityLabel="Edit drawing text"
          autoFocus
          blurOnSubmit={false}
          multiline
          selectTextOnFocus
          value={activeUserDrawingTextEditPrimitive.editValue ?? activeUserDrawingTextEditPrimitive.text}
          onChangeText={(value: string) => {
            commitUserDrawingStateIfChanged(updateUserDrawingTextEdit(userDrawingStateRef.current, value));
          }}
          onBlur={() => {
            commitUserDrawingStateIfChanged(commitUserDrawingTextEdit(userDrawingStateRef.current));
          }}
          style={[styles.userDrawingTextEditor, activeUserDrawingTextEditorStyle]}
        />
      )}

      {/* Top Bar (overlay on top of chart) */}
      {showTopBar && (
        <View style={styles.topBarOverlay} pointerEvents="box-none">
          <ChartTopBarComponent
            symbol={symbol}
            exchangeName={exchangeName}
            interval={interval}
            onIntervalChange={onIntervalChange}
            onIndicatorsPress={handleIndicatorsPress}
            supportedResolutions={supportedResolutions}
            userDrawingState={effectiveUserDrawingState}
            onUserDrawingToolSelect={(tool) =>
              commitUserDrawingStateIfChanged(setUserDrawingTool(userDrawingStateRef.current, tool))
            }
            onUserDrawingDeleteSelected={() => {
              commitUserDrawingStateIfChanged(deleteUserDrawingState(userDrawingStateRef.current));
            }}
            onUserDrawingCancelDraft={() => {
              commitUserDrawingStateIfChanged(cancelUserDrawingDraftState(userDrawingStateRef.current));
            }}
            onUserDrawingClearAll={() => {
              commitUserDrawingStateIfChanged(clearUserDrawingsState(userDrawingStateRef.current));
            }}
            onUserDrawingStyleChange={(style) => {
              commitUserDrawingStateIfChanged(updateMobileUserDrawingStyle(userDrawingStateRef.current, style));
            }}
            onUserDrawingTextAlignChange={(textAlign) => {
              commitUserDrawingStateIfChanged(
                setMobileUserDrawingTextAlign(userDrawingStateRef.current, textAlign),
              );
            }}
            onUserDrawingVisibilityChange={(visible) => {
              commitUserDrawingStateIfChanged(
                setMobileUserDrawingVisibility(userDrawingStateRef.current, visible),
              );
            }}
            onUserDrawingLockedChange={(locked, includeLocked) => {
              commitUserDrawingStateIfChanged(
                setMobileUserDrawingLocked(userDrawingStateRef.current, locked, { includeLocked }),
              );
            }}
          />
        </View>
      )}

      {/* Context Menu (Modal) */}
      <ContextMenuComponent
        visible={contextMenuVisible}
        items={contextMenuItems}
        x={contextMenuPosition.x}
        y={contextMenuPosition.y}
        price={contextMenuPosition.price}
        time={contextMenuPosition.time}
        pricePrecision={pricePrecision}
        onClose={handleContextMenuClose}
      />

      {/* Indicators Modal */}
      <IndicatorsModalMobile
        visible={indicatorsModalVisible}
        onClose={handleIndicatorsModalClose}
        onSelectIndicator={handleSelectIndicator}
        activeIndicatorIds={activeIndicatorIds}
      />

      {/* Indicator Settings Modal */}
      <IndicatorSettingsModalMobile
        visible={settingsModalVisible}
        onClose={handleSettingsModalClose}
        indicator={settingsIndicator}
        inputDefinitions={settingsInputDefs}
        plots={settingsPlots}
        onSave={handleSettingsSave}
      />
    </View>
  );
});

SkiaTealchart.displayName = 'SkiaTealchart';

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  absoluteFill: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  topBarOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    // No background - transparent overlay
  },
  userDrawingTextEditor: {
    position: 'absolute',
    zIndex: 6,
    minHeight: 30,
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderWidth: 1,
    borderRadius: 4,
    backgroundColor: 'rgba(9, 12, 18, 0.92)',
    lineHeight: 18,
  },
  interactiveLayer: {
    // Interactive elements go here
    // pointerEvents="box-none" allows touches to pass through to gesture layer
  },
  resetButtonContainer: {
    position: 'absolute',
    bottom: 40, // Above time axis
    alignSelf: 'center',
    left: '50%',
    marginLeft: -14, // Half of width (28)
  },
  resetButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(42, 46, 57, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  resetButtonText: {
    color: '#d1d4dc',
    fontSize: 16,
  },
});

export default SkiaTealchart;
