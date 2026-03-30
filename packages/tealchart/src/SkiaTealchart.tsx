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

import type { IIndicatorManager } from './core/ChartWidgetCore';
import type { BuiltinIndicator } from './indicators/builtinIndicators';
import type { IndicatorSettingsData } from './mobile/components/IndicatorSettingsModalMobile';
import type { LabelBounds } from './mobile/hooks/useLabelCollision';
import type { PlotOutput, PlotStyleOverride } from './state/chartState';
import type {
  Bar,
  ChartMargins,
  ContextMenuItem,
  IBasicDataFeed,
  OrderLineRenderData,
  PositionLineRenderData,
  PriceLine,
  RenderOptions,
  UnifiedPaneLayout,
  Viewport,
} from './types';

import React, { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';

import {
  Canvas,
  createPicture,
  DashPathEffect,
  Group,
  Picture,
  Rect,
  Skia,
  Line as SkiaLine,
  Text as SkiaText,
  useFont,
  vec,
} from '@shopify/react-native-skia';
import { LayoutChangeEvent, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS } from 'react-native-reanimated';

import { LOADING_OPACITY } from './constants';
import { useTealchartCore } from './core/useTealchartCore';
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
import { CollectedTextItem, SkiaCanvasContext } from './rendering/SkiaCanvasContext';
import { TealchartRenderer } from './TealchartRenderer';
import { DEFAULT_MARGINS } from './types';
import { buildLastTradePriceLine } from './utils/buildLastTradePriceLine';
import { safeToFixed } from './utils/safeNumber';
import { ViewportController } from './viewport/ViewportController';
import { intervalToMs } from './viewport/viewScale';

// Indicator pane info type (matches web)
interface IndicatorPaneInfo {
  name: string;
  inputs?: Record<string, unknown>;
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
}

export const SkiaTealchart: React.FC<SkiaTealchartProps> = ({
  width: propWidth,
  height: propHeight,
  // Required datafeed prop
  datafeed,
  symbol: propSymbol,
  interval: propInterval = '15',
  // Rendering props
  renderOptions,
  margins: marginsProp,
  priceLines,
  orderLines,
  positionLines,
  plotStyleOverrides,
  onViewportChange,
  onContextMenu,
  onCrossHairMoved,
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
}) => {
  // ==========================================================================
  // Core Hook + Indicator Management
  // ==========================================================================

  // Force re-render helper for indicator updates
  const [, forceUpdate] = useReducer((x: number) => x + 1, 0);

  // Create indicator manager (stable ref)
  const indicatorManagerRef = useRef<MobileIndicatorManager | null>(null);
  if (!indicatorManagerRef.current) {
    indicatorManagerRef.current = new MobileIndicatorManager();
    indicatorManagerRef.current.setOnUpdate(forceUpdate);
  }

  // Use core hook for bar fetching and state management
  const coreResult = useTealchartCore({
    datafeed,
    symbol: propSymbol,
    interval: propInterval,
    indicatorManager: indicatorManagerRef.current as IIndicatorManager,
    onSymbolChange,
    onIntervalChange,
  });

  // Get values from core hook
  const { bars, symbol, interval, isLoading, unifiedLayout } = coreResult;

  // Get supported resolutions from core (for filtering timeframe selector)
  const supportedResolutions = coreResult.core?.getSupportedResolutions() ?? null;

  // Get indicator state from manager
  const plots = indicatorManagerRef.current?.getPlots() || [];
  const baseUnifiedPaneLayout = indicatorManagerRef.current?.getUnifiedLayout() || unifiedLayout;
  const indicatorPaneInfo = indicatorManagerRef.current?.getIndicatorPaneInfo() || {};

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
  // State for re-rendering the reset button when any pane has auto-scale disabled
  const [autoScaleAllEnabled, setAutoScaleAllEnabled] = useState(true);

  // Track the first bar's time to detect reloads with the same count
  const barsFirstTimeRef = useRef<number | null>(bars.length > 0 ? bars[0].time : null);

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
    console.log('[SkiaTealchart] margins:', margins, 'showTopBar:', showTopBar);
    return {
      width: dimensions.width,
      height: dimensions.height,
      devicePixelRatio: 1,
      backgroundColor: renderOptions?.backgroundColor || '#131722',
      upColor: renderOptions?.upColor || '#26a69a',
      downColor: renderOptions?.downColor || '#ef5350',
      textColor: renderOptions?.textColor || '#d1d4dc',
      gridColor: renderOptions?.gridColor || 'rgba(255, 255, 255, 0.06)',
      showVolume: renderOptions?.showVolume ?? true,
      volumeHeight: renderOptions?.volumeHeight ?? 0.15,
      minCandleWidth: renderOptions?.minCandleWidth ?? 1,
      ...renderOptions,
      // Pass margins with top bar offset so price labels have safe zone
      margins,
    };
  }, [dimensions.width, dimensions.height, renderOptions, margins, showTopBar]);

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
    setAutoScaleAllEnabled(false);
  }, []);

  const getIsAutoScale = useCallback((paneId: string) => viewportControllerRef.current.isAutoScale(paneId), []);

  const handleResetViewport = useCallback(() => {
    setAutoScaleAllEnabled(true);
    if (bars.length > 0) {
      const vp = viewportControllerRef.current.handleReset(bars, intervalToMs(interval));
      setViewport(vp);
      onViewportChange?.(vp);
    }
  }, [bars, interval, onViewportChange]);

  const { composedGesture } = useChartGestures({
    dimensions: chartDimensions,
    bars,
    viewport,
    onViewportChange: handleViewportChange,
    onSwipeBlockChange,
    onAutoScaleDisabled: handleAutoScaleDisabled,
    isAutoScale: getIsAutoScale,
  });

  // ==========================================================================
  // Crosshair State
  // ==========================================================================

  const [crosshairVisible, setCrosshairVisible] = useState(false);
  // Store the crosshair position (updated via runOnJS from gestures)
  const [lastCrosshairPosition, setLastCrosshairPosition] = useState({ x: 0, y: 0 });

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
  const [settingsInputDefs, setSettingsInputDefs] = useState<import('@tealstreet/tealscript').InputDefinition[]>([]);
  const [settingsPlots, setSettingsPlots] = useState<import('@tealstreet/tealscript').PlotOutput[]>([]);

  const handleOpenIndicatorSettings = useCallback((instanceId: string) => {
    const manager = indicatorManagerRef.current;
    if (!manager) return;

    const activeInd = manager.getIndicator(instanceId);
    if (!activeInd) return;

    const inputDefs = manager.getInputDefinitions(instanceId);
    const indicatorPlots = manager.getPlots().filter((p) => p.scriptId === instanceId);

    setSettingsIndicator({
      id: activeInd.instanceId,
      name: activeInd.indicator.name,
      inputs: activeInd.inputs ?? {},
      styleOverrides: activeInd.styleOverrides,
    });
    setSettingsInputDefs(inputDefs);
    setSettingsPlots(indicatorPlots);
    setSettingsModalVisible(true);
  }, []);

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

  // Long press gesture for crosshair
  const longPressGesture = useMemo(
    () =>
      Gesture.LongPress()
        .minDuration(300)
        .onStart((event) => {
          runOnJS(setCrosshairVisible)(true);
          runOnJS(handleCrosshairMove)(event.x, event.y);
        }),
    [handleCrosshairMove],
  );

  // Pan gesture for moving crosshair (active after long press)
  const crosshairPanGesture = useMemo(
    () =>
      Gesture.Pan()
        .enabled(crosshairVisible)
        .onUpdate((event) => {
          runOnJS(handleCrosshairMove)(event.x, event.y);
        })
        .onEnd(() => {
          // Keep crosshair visible after pan ends - tap elsewhere to hide
        }),
    [crosshairVisible, handleCrosshairMove],
  );

  // Tap gesture to hide crosshair
  const tapGesture = useMemo(
    () =>
      Gesture.Tap()
        .enabled(crosshairVisible)
        .onEnd(() => {
          runOnJS(setCrosshairVisible)(false);
        }),
    [crosshairVisible],
  );

  // Double-tap handler for pane maximize/restore
  const handleDoubleTap = useCallback(
    (y: number) => {
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
    [unifiedPaneLayout, coreResult.core, dimensions.height, margins],
  );

  // Double-tap gesture for pane maximize/restore
  const doubleTapGesture = useMemo(
    () =>
      Gesture.Tap()
        .numberOfTaps(2)
        .onEnd((event) => {
          runOnJS(handleDoubleTap)(event.y);
        }),
    [handleDoubleTap],
  );

  // Combine all gestures
  const allGestures = useMemo(
    () =>
      Gesture.Race(
        doubleTapGesture,
        longPressGesture,
        Gesture.Simultaneous(composedGesture, crosshairPanGesture, tapGesture),
      ),
    [doubleTapGesture, longPressGesture, composedGesture, crosshairPanGesture, tapGesture],
  );

  // ==========================================================================
  // Label Collision Resolution
  // ==========================================================================

  // Build label bounds for collision resolution
  const labelBoundsInput = useMemo(() => {
    if (!viewport) return [];

    const bounds: LabelBounds[] = [];
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
  const resolvedLabels = useLabelCollision(labelBoundsInput);

  // Create map from id to adjustedY
  const labelAdjustments = useMemo(() => {
    const map = new Map<string, number>();
    resolvedLabels.forEach((label) => {
      map.set(label.id, label.adjustedY);
    });
    return map;
  }, [resolvedLabels]);

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
        const ctx = new SkiaCanvasContext(canvas, Skia);
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

  // Font for Skia text rendering in bracket preview
  const bracketFont = useFont(null, 12);

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

  // ==========================================================================
  // Render
  // ==========================================================================

  if (dimensions.width === 0 || dimensions.height === 0) {
    return <View style={styles.container} onLayout={onLayout} />;
  }

  return (
    <View style={styles.container} onLayout={onLayout}>
      {/* Layer 1: Skia Canvas (static rendering) */}
      <Canvas
        style={[
          styles.absoluteFill,
          { width: dimensions.width, height: dimensions.height, opacity: isLoading ? LOADING_OPACITY : 1 },
        ]}
      >
        {picture && <Picture picture={picture} />}

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
            showContextMenuButton={!!onContextMenu}
            onContextMenuPress={handleContextMenuPress}
          />
        )}
      </View>

      {/* Layer 3: Base Gesture Handler */}
      <GestureDetector gesture={allGestures}>
        <Animated.View style={[styles.absoluteFill, { width: dimensions.width, height: dimensions.height }]} />
      </GestureDetector>

      {/* Reset viewport button — re-enables auto-scale */}
      {!autoScaleAllEnabled && (
        <TouchableOpacity style={styles.resetButton} onPress={handleResetViewport} activeOpacity={0.7}>
          <Text style={styles.resetButtonText}>↻</Text>
        </TouchableOpacity>
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
};

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
  interactiveLayer: {
    // Interactive elements go here
    // pointerEvents="box-none" allows touches to pass through to gesture layer
  },
  resetButton: {
    position: 'absolute',
    bottom: 40, // Above time axis
    alignSelf: 'center',
    left: '50%',
    marginLeft: -14, // Half of width (28)
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
