/**
 * Tealchart - React wrapper for custom OHLCV canvas chart
 * Standalone component that accepts render options via props
 */

import type { PlotOutput } from '@tealstreet/tealscript';
import type { IndicatorPaneInfo } from './components/ChartContainer';

import React, { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';

import { flushSync } from 'react-dom';

import { ContextMenu } from './components/ContextMenu';
import { WebCanvasContext } from './rendering/WebCanvasContext';
import { useChartApiOptional } from './state/ChartApiContext';
import { getDecimalPlacesFromPrecision, PlotStyleOverride } from './state/chartState';
import { TealchartRenderer } from './TealchartRenderer';
import {
  Bar,
  ChartLineLabel,
  ChartMargins,
  ChartPane,
  ContextMenuItem,
  CrosshairState,
  DEFAULT_MARGINS,
  DragMode,
  InteractionState,
  OrderLineRenderData,
  PaneLayout,
  PendingOrderUpdate,
  PositionLineRenderData,
  PriceLine,
  PriceLineLabelBounds,
  RenderOptions,
  UnifiedPaneLayout,
  Viewport,
} from './types';

// Inline rotate icon SVG (replaces FontAwesome for bundle size)
const RotateIcon: React.FC<{ style?: React.CSSProperties }> = ({ style }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 512 512"
    width="12"
    height="12"
    style={style}
    fill="currentColor"
  >
    <path d="M105.1 202.6c7.7-21.8 20.2-42.3 37.8-59.8c62.5-62.5 163.8-62.5 226.3 0L386.3 160 352 160c-17.7 0-32 14.3-32 32s14.3 32 32 32l111.5 0c0 0 0 0 0 0l.4 0c17.7 0 32-14.3 32-32l0-112c0-17.7-14.3-32-32-32s-32 14.3-32 32l0 35.2L414.4 97.6c-87.5-87.5-229.3-87.5-316.8 0C73.2 122 55.6 150.7 44.8 181.4c-5.9 16.7 2.9 34.9 19.5 40.8s34.9-2.9 40.8-19.5zM39 289.3c-5 1.5-9.8 4.2-13.7 8.2c-4 4-6.7 8.8-8.1 14c-.3 1.2-.6 2.5-.8 3.8c-.3 1.7-.4 3.4-.4 5.1L16 432c0 17.7 14.3 32 32 32s32-14.3 32-32l0-35.1 17.6 17.5c0 0 0 0 0 0c87.5 87.4 229.3 87.4 316.7 0c24.4-24.4 42.1-53.1 52.9-83.8c5.9-16.7-2.9-34.9-19.5-40.8s-34.9 2.9-40.8 19.5c-7.7 21.8-20.2 42.3-37.8 59.8c-62.5 62.5-163.8 62.5-226.3 0l-.1-.1L125.6 352l34.4 0c17.7 0 32-14.3 32-32s-14.3-32-32-32L48.4 288c-4.4 0-8.5 .9-12.3 2.6c-.7 .3-1.4 .6-2.1 1c-.8 .4-1.5 .9-2.2 1.4c-1.3 .9-2.5 1.9-3.6 3c-.1 .1-.3 .2-.4 .4c-.1 .1-.3 .2-.4 .4l0 0z" />
  </svg>
);

// Cache NumberFormat instances by decimals to avoid recreating on every frame
const numberFormatCache = new Map<number, Intl.NumberFormat>();
function getNumberFormatter(decimals: number): Intl.NumberFormat {
  let formatter = numberFormatCache.get(decimals);
  if (!formatter) {
    formatter = new Intl.NumberFormat('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
      useGrouping: true,
    });
    numberFormatCache.set(decimals, formatter);
  }
  return formatter;
}

/**
 * Convert OrderLineRenderData to unified PriceLine format
 */
function orderLineToPriceLine(order: OrderLineRenderData, formatPrice: (price: number) => string): PriceLine {
  // TradingView LineStyle: 0=Solid, 1=Dotted, 2=Dashed, 3=LargeDashed, 4=SparseDotted
  const lineStyleMap: Record<number, 'solid' | 'dashed' | 'dotted'> = {
    0: 'solid',
    1: 'dotted',
    2: 'dashed',
    3: 'dashed',
    4: 'dotted', // SparseDotted
  };

  const chartLabel: ChartLineLabel = {
    offsetPercent: order.lineLength,
    segments: [
      ...(order.text
        ? [
            {
              text: order.text,
              textShort: order.textShort || undefined,
              backgroundColor: order.bodyBackgroundColor,
              textColor: order.bodyTextColor,
              borderColor: order.bodyBorderColor,
            },
          ]
        : []),
      ...(order.quantity
        ? [
            {
              text: order.quantity,
              textShort: order.quantityShort || undefined,
              backgroundColor: order.quantityBackgroundColor,
              textColor: order.quantityTextColor,
              borderColor: order.quantityBorderColor,
            },
          ]
        : []),
    ],
    buttons: order.cancellable
      ? [
          {
            type: 'cancel' as const,
            icon: '×',
            backgroundColor: order.cancelButtonBackgroundColor,
            iconColor: order.cancelButtonIconColor,
            borderColor: order.cancelButtonBorderColor,
            tooltip: order.cancelTooltip,
          },
        ]
      : [],
  };

  return {
    id: order.id,
    price: order.price,
    lineStyle: lineStyleMap[order.lineStyle] || 'dashed',
    color: order.lineColor,
    type: 'order',
    lineLength: order.lineLength,
    extendLeft: order.extendLeft,
    lineWidth: order.lineWidth,
    priority: 50, // Order lines: medium priority
    draggable: order.editable, // Only draggable if editable AND has onMove callback
    label: {
      primaryText: formatPrice(order.price),
      backgroundColor: order.bodyBackgroundColor,
      textColor: order.bodyTextColor,
    },
    chartLabel,
  };
}

/**
 * Convert PositionLineRenderData to unified PriceLine format
 */
function positionLineToPriceLine(position: PositionLineRenderData, formatPrice: (price: number) => string): PriceLine {
  // TradingView LineStyle: 0=Solid, 1=Dotted, 2=Dashed, 3=LargeDashed, 4=SparseDotted
  const lineStyleMap: Record<number, 'solid' | 'dashed' | 'dotted'> = {
    0: 'solid',
    1: 'dotted',
    2: 'dashed',
    3: 'dashed',
    4: 'dotted', // SparseDotted
  };

  let pnlTextColor = position.bodyTextColor;
  if (position.profitState === 'positive') {
    pnlTextColor = '#26a69a';
  } else if (position.profitState === 'negative') {
    pnlTextColor = '#ef5350';
  }

  const chartLabel: ChartLineLabel = {
    offsetPercent: position.lineLength,
    segments: [
      // Direction (Long/Short)
      ...(position.text
        ? [
            {
              text: position.text,
              textShort: position.textShort || undefined,
              backgroundColor: position.bodyBackgroundColor,
              textColor: position.bodyTextColor,
              borderColor: position.bodyBorderColor,
            },
          ]
        : []),
      // Size/Quantity
      ...(position.quantity
        ? [
            {
              text: position.quantity,
              textShort: position.quantityShort || undefined,
              backgroundColor: position.quantityBackgroundColor,
              textColor: position.quantityTextColor,
              borderColor: position.quantityBorderColor,
            },
          ]
        : []),
      // PnL
      ...(position.pnl
        ? [
            {
              text: position.pnl,
              textShort: position.pnlShort || undefined,
              backgroundColor: position.bodyBackgroundColor,
              textColor: pnlTextColor,
              borderColor: position.bodyBorderColor,
            },
          ]
        : []),
    ],
    buttons: [
      // TP/SL bracket buttons (shown when brackets are enabled for this position)
      // These are positioned first (left side) for drag accessibility
      ...(position.brackets !== null
        ? [
            {
              type: 'tp' as const,
              icon: 'TP',
              backgroundColor: position.bodyBackgroundColor, // Match position label
              iconColor: '#22c55e', // Green text
              borderColor: '#22c55e', // Green border
              tooltip: 'Drag to set Take Profit',
            },
          ]
        : []),
      ...(position.brackets !== null
        ? [
            {
              type: 'sl' as const,
              icon: 'SL',
              backgroundColor: position.bodyBackgroundColor, // Match position label
              iconColor: '#f97316', // Orange text
              borderColor: '#f97316', // Orange border
              tooltip: 'Drag to set Stop Loss',
            },
          ]
        : []),
      // Only show reverse button if onReverse callback was provided
      ...(position.reversible
        ? [
            {
              type: 'reverse' as const,
              icon: '↩',
              backgroundColor: position.reverseButtonBackgroundColor,
              iconColor: position.reverseButtonIconColor,
              borderColor: position.reverseButtonBorderColor,
            },
          ]
        : []),
      // Only show close button if onClose callback was provided
      ...(position.closeable
        ? [
            {
              type: 'close' as const,
              icon: '×',
              backgroundColor: position.closeButtonBackgroundColor,
              iconColor: position.closeButtonIconColor,
              borderColor: position.closeButtonBorderColor,
              tooltip: position.closeTooltip,
            },
          ]
        : []),
    ],
  };

  return {
    id: position.id,
    price: position.price,
    lineStyle: lineStyleMap[position.lineStyle] || 'solid',
    color: position.lineColor,
    type: 'position',
    lineLength: position.lineLength,
    extendLeft: position.extendLeft,
    lineWidth: position.lineWidth,
    priority: 75, // Position lines: second highest priority (after price lines)
    draggable: false, // Position lines are not draggable (no onMove callback)
    label: {
      primaryText: formatPrice(position.price),
      backgroundColor: position.bodyBackgroundColor,
      textColor: position.bodyTextColor,
    },
    chartLabel,
    // TEALSTREET: Position-specific fields for bracket TP/SL drag
    positionId: position.positionId,
    partialEnabled: position.partialEnabled,
    positionData: position.positionData ?? undefined,
    brackets: position.brackets,
  };
}

/**
 * Generate bracket lines (TP/SL) for a position with active brackets
 */
function positionToBracketLines(position: PositionLineRenderData, formatPrice: (price: number) => string): PriceLine[] {
  const bracketLines: PriceLine[] = [];
  const brackets = position.brackets;

  if (!brackets) return bracketLines;

  // Take Profit bracket line
  if (brackets.takeProfit !== undefined && brackets.takeProfit > 0) {
    bracketLines.push({
      id: `${position.id}-tp`,
      price: brackets.takeProfit,
      lineStyle: 'dashed',
      color: '#22c55e', // Green for TP
      type: 'price',
      lineLength: 100,
      extendLeft: true,
      lineWidth: 1,
      priority: 70, // Slightly lower than position line
      label: {
        primaryText: formatPrice(brackets.takeProfit),
        secondaryText: 'TP',
        backgroundColor: '#22c55e',
        textColor: '#ffffff',
      },
    });
  }

  // Stop Loss bracket line
  if (brackets.stopLoss !== undefined && brackets.stopLoss > 0) {
    bracketLines.push({
      id: `${position.id}-sl`,
      price: brackets.stopLoss,
      lineStyle: 'dashed',
      color: '#f97316', // Orange for SL
      type: 'price',
      lineLength: 100,
      extendLeft: true,
      lineWidth: 1,
      priority: 70, // Slightly lower than position line
      label: {
        primaryText: formatPrice(brackets.stopLoss),
        secondaryText: 'SL',
        backgroundColor: '#f97316',
        textColor: '#ffffff',
      },
    });
  }

  return bracketLines;
}

/**
 * Convert legacy PaneLayout to UnifiedPaneLayout
 */
function convertToUnifiedLayout(paneLayout?: PaneLayout): UnifiedPaneLayout {
  const timeAxisHeight = 30;

  if (!paneLayout) {
    return {
      panes: [
        {
          id: 'main',
          type: 'main',
          heightRatio: 1.0,
          yMin: 0,
          yMax: 0,
          fixedRange: false,
        },
      ],
      timeAxisHeight,
    };
  }

  const panes: ChartPane[] = [];

  // Main pane - combines mainPaneHeight and volumePaneHeight since volume is now overlay
  const mainRatio = paneLayout.mainPaneHeight + paneLayout.volumePaneHeight;
  panes.push({
    id: 'main',
    type: 'main',
    heightRatio: mainRatio,
    yMin: 0,
    yMax: 0,
    fixedRange: false,
  });

  // Indicator panes
  for (const indicatorPane of paneLayout.indicatorPanes) {
    panes.push({
      id: indicatorPane.id,
      type: 'indicator',
      heightRatio: indicatorPane.heightRatio,
      yMin: indicatorPane.yMin,
      yMax: indicatorPane.yMax,
      fixedRange: indicatorPane.fixedRange,
      indicatorIds: indicatorPane.indicatorIds,
    });
  }

  return { panes, timeAxisHeight };
}

export interface TealchartProps {
  width: number;
  height: number;
  bars: Bar[];
  /** Render options for colors and styling. Omit width/height/devicePixelRatio as they are set automatically. */
  renderOptions?: Partial<Omit<RenderOptions, 'width' | 'height' | 'devicePixelRatio'>>;
  /** Custom margins to override defaults (e.g., for transparent top bar overlay) */
  margins?: Partial<ChartMargins>;
  /** Price lines to render (last trade, orders, positions, etc.) */
  priceLines?: PriceLine[];
  /** Order lines to render (limit orders, stops, etc.) */
  orderLines?: OrderLineRenderData[];
  /** Position lines to render (open positions with PnL) */
  positionLines?: PositionLineRenderData[];
  /** Tealscript indicator plot outputs */
  plots?: PlotOutput[];
  /** Pane layout for multi-pane indicator rendering (legacy - prefer unifiedPaneLayout) */
  paneLayout?: PaneLayout;
  /** Unified pane layout - preferred over paneLayout */
  unifiedPaneLayout?: UnifiedPaneLayout;
  /** Map from study ID to indicator pane info */
  indicatorPaneInfo?: Record<string, IndicatorPaneInfo>;
  /** Map from plotId to style overrides for customizing plot appearance */
  plotStyleOverrides?: Map<string, PlotStyleOverride>;
  onBarsUpdateRef?: React.MutableRefObject<((bars: Bar[]) => void) | null>;
  onViewportChange?: (viewport: Viewport) => void;
  onRequestMoreBars?: (direction: 'left' | 'right') => void;
  /** Context menu callback - returns menu items for a given time/price */
  onContextMenu?: (unixTime: number, price: number) => ContextMenuItem[];
  /** Called on mouse down (for hotkey integration) */
  onMouseDown?: () => void;
  /** Called on mouse up (for hotkey integration) */
  onMouseUp?: () => void;
  /** Called when crosshair position changes (for hotkey integration) */
  onCrossHairMoved?: (price: number, time: number) => void;
}

export const Tealchart: React.FC<TealchartProps> = ({
  width,
  height,
  bars,
  renderOptions,
  margins: marginsProp,
  priceLines,
  orderLines,
  positionLines,
  plots,
  paneLayout,
  unifiedPaneLayout,
  indicatorPaneInfo,
  plotStyleOverrides,
  onBarsUpdateRef,
  onViewportChange,
  onRequestMoreBars,
  onContextMenu,
  onMouseDown,
  onMouseUp,
  onCrossHairMoved,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stageRef = useRef<any>(null); // Konva Stage ref for hit detection

  // Access chart API for order/position callbacks (TradingView pattern)
  const chartApi = useChartApiOptional();
  const rendererRef = useRef<TealchartRenderer | null>(null);

  // Merge custom margins with defaults (memoized to prevent effect re-runs)
  const margins: ChartMargins = useMemo(
    () => ({
      ...DEFAULT_MARGINS,
      ...marginsProp,
    }),
    [marginsProp?.top, marginsProp?.right, marginsProp?.bottom, marginsProp?.left],
  );

  // For imperative updates
  const barsRef = useRef<Bar[]>(bars);
  const rafIdRef = useRef<number | null>(null);
  const viewportRef = useRef<Viewport | null>(null);
  const priceLinesRef = useRef<PriceLine[] | undefined>(priceLines);
  const orderLinesRef = useRef<OrderLineRenderData[] | undefined>(orderLines);
  const positionLinesRef = useRef<PositionLineRenderData[] | undefined>(positionLines);
  const plotsRef = useRef<PlotOutput[] | undefined>(plots);
  const paneLayoutRef = useRef<PaneLayout | undefined>(paneLayout);
  const unifiedPaneLayoutRef = useRef<UnifiedPaneLayout | undefined>(unifiedPaneLayout);
  const indicatorPaneInfoRef = useRef<Record<string, IndicatorPaneInfo> | undefined>(indicatorPaneInfo);
  const plotStyleOverridesRef = useRef<Map<string, PlotStyleOverride> | undefined>(plotStyleOverrides);

  // Crosshair state
  const crosshairRef = useRef<CrosshairState>({
    visible: false,
    x: 0,
    y: 0,
    price: 0,
    time: 0,
    paneId: null,
    paneValue: null,
  });

  // Force re-render for instant crosshair hide (bypasses RAF delay)
  const [, forceRender] = useReducer((x: number) => x + 1, 0);

  // Touch interaction state
  const touchCrosshairLockedRef = useRef(false); // When true, crosshair stays visible and can be dragged
  const touchCrosshairPositionRef = useRef({ x: 0, y: 0 }); // Locked crosshair position
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null); // For tap vs drag detection
  const activeTouchesRef = useRef<Map<number, { x: number; y: number }>>(new Map()); // For pinch detection
  const pinchStartDistanceRef = useRef<number>(0); // Initial pinch distance
  const pinchStartViewportRef = useRef<Viewport | null>(null); // Viewport at pinch start
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTouchDraggingRef = useRef(false); // Track if we've moved enough to be a drag
  const touchYPanUnlockedRef = useRef(false); // Mobile Y-lock: Y panning locked by default until price axis dragged
  const TOUCH_TAP_THRESHOLD = 10; // Max movement in px to still count as tap
  const LONG_PRESS_DURATION = 500; // ms

  // Reset button visibility (controlled by hover zone on web, tap on mobile)
  const [showResetButton, setShowResetButton] = useState(false);
  const resetButtonRef = useRef<HTMLButtonElement>(null);
  const resetButtonAutoHideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const RESET_BUTTON_AUTO_HIDE_DELAY = 3000; // ms

  // Start/reset auto-hide timer for mobile reset button
  const startResetButtonAutoHideTimer = useCallback(() => {
    // Clear existing timer
    if (resetButtonAutoHideTimerRef.current) {
      clearTimeout(resetButtonAutoHideTimerRef.current);
    }
    // Start new timer
    resetButtonAutoHideTimerRef.current = setTimeout(() => {
      setShowResetButton(false);
      resetButtonAutoHideTimerRef.current = null;
    }, RESET_BUTTON_AUTO_HIDE_DELAY);
  }, []);

  // Clear auto-hide timer (for cleanup or when hiding button)
  const clearResetButtonAutoHideTimer = useCallback(() => {
    if (resetButtonAutoHideTimerRef.current) {
      clearTimeout(resetButtonAutoHideTimerRef.current);
      resetButtonAutoHideTimerRef.current = null;
    }
  }, []);

  // Viewport state
  const [viewport, setViewport] = useState<Viewport>(() => TealchartRenderer.calculateViewport(bars));

  // Cursor state (needs to be state to trigger re-render)
  const [cursor, setCursor] = useState<string>('crosshair');

  // Pending order updates for optimistic UI feedback
  // Version state triggers re-renders when pending orders change
  const pendingOrdersRef = useRef<Map<string, PendingOrderUpdate>>(new Map());
  const [_pendingOrdersVersion, setPendingOrdersVersion] = useState(0);

  // Computed label bounds for Konva layer (updated after each render)
  // Use ref + version counter for immediate updates during drag/scroll
  const labelBoundsRef = useRef<PriceLineLabelBounds[]>([]);
  const [labelBoundsVersion, setLabelBoundsVersion] = useState(0);

  // Dirty tracking for label bounds - skip expensive recomputation when nothing changed
  // Key format: "viewportPriceMin,priceMax|line1Price,line2Price,...|crosshairY"
  const lastLabelBoundsKeyRef = useRef<string>('');
  const lastLabelBoundsUpdateRef = useRef<number>(0);

  // Context menu state
  const [contextMenuState, setContextMenuState] = useState<{
    visible: boolean;
    x: number;
    y: number;
    items: ContextMenuItem[];
  }>({ visible: false, x: 0, y: 0, items: [] });

  // Interaction state (declared early so we can check isDragging below)
  const interactionRef = useRef<InteractionState>({
    isDragging: false,
    dragMode: 'none',
    dragStartX: 0,
    dragStartY: 0,
    dragStartViewport: null,
    hoveredBar: null,
    hoveredX: 0,
    hoveredY: 0,
    isOverPriceAxis: false,
    draggedPaneId: null,
    dragStartPaneYRange: null,
  });

  // Track if cursor is controlled by Konva (don't override with crosshair)
  const isOverKonvaElementRef = useRef(false);

  // Per-pane Y-axis zoom overrides (for indicator panes)
  const paneYOverridesRef = useRef<Map<string, { yMin: number; yMax: number }>>(new Map());

  // Track previous interactive line state for cursor reset detection
  // Format: "count:id1@price1,id2@price2,..." - cheap to compare
  const prevInteractiveLinesFingerprintRef = useRef<string>('');

  // Keep refs in sync (but not viewport during drag, when viewportRef is the source of truth)
  if (!interactionRef.current.isDragging) {
    viewportRef.current = viewport;
  }
  priceLinesRef.current = priceLines;
  orderLinesRef.current = orderLines;
  positionLinesRef.current = positionLines;
  plotsRef.current = plots;
  paneLayoutRef.current = paneLayout;
  unifiedPaneLayoutRef.current = unifiedPaneLayout;
  indicatorPaneInfoRef.current = indicatorPaneInfo;
  plotStyleOverridesRef.current = plotStyleOverrides;

  // Detect changes to interactive lines (orders/positions) that may require cursor reset
  // When lines are removed while hovering, we won't get mouseout events
  // Note: Only track IDs, not prices - price changes don't affect hover state
  // (pending mechanism handles visual position during price updates)
  const currentFingerprint = useMemo(() => {
    const orderIds = (orderLines || []).map((o) => o.id).sort();
    const posIds = (positionLines || []).map((p) => p.id).sort();
    return `${orderIds.length + posIds.length}:${[...orderIds, ...posIds].join(',')}`;
  }, [orderLines, positionLines]);

  // Reset cursor if interactive lines changed while hovering
  if (
    prevInteractiveLinesFingerprintRef.current !== '' &&
    prevInteractiveLinesFingerprintRef.current !== currentFingerprint &&
    isOverKonvaElementRef.current
  ) {
    isOverKonvaElementRef.current = false;
    setCursor('crosshair');
  }
  prevInteractiveLinesFingerprintRef.current = currentFingerprint;

  // Clear pending orders for orders that no longer exist (case 2: non-atomic exchange updates)
  // When an order is removed, the drag is effectively complete - no need to wait
  const currentOrderIds = new Set((orderLines || []).map((o) => o.id));
  for (const [orderId, pending] of pendingOrdersRef.current) {
    if (!currentOrderIds.has(orderId)) {
      clearTimeout(pending.timeoutId);
      pendingOrdersRef.current.delete(orderId);
    }
  }

  // Clear pending orders when orderLines price changes from original (case 1: atomic updates)
  // Any price change indicates the update completed (exchange may round to tick size)
  for (const [orderId, pending] of pendingOrdersRef.current) {
    const order = (orderLines || []).find((o) => o.id === orderId);
    if (order && Math.abs(order.price - pending.originalPrice) > 0.0000001) {
      // Order price changed from original - update is complete
      clearTimeout(pending.timeoutId);
      pendingOrdersRef.current.delete(orderId);
    }
  }

  // Schedule a render using requestAnimationFrame (batches updates)
  // Always cancels pending RAF to ensure latest ref data is used (fixes race with async React renders)
  const scheduleRender = useCallback(() => {
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
    }

    rafIdRef.current = requestAnimationFrame(() => {
      rafIdRef.current = null;
      if (rendererRef.current && barsRef.current.length > 0 && viewportRef.current) {
        // Create price formatter using market precision (same logic as renderer)
        const vp = viewportRef.current;
        let decimals: number;
        if (renderOptions?.pricePrecision && renderOptions.pricePrecision > 0) {
          decimals = getDecimalPlacesFromPrecision(renderOptions.pricePrecision);
        } else {
          const priceRange = vp.priceMax - vp.priceMin;
          // Match renderer's getDecimalPlaces logic
          if (priceRange >= 10) decimals = 0;
          else if (priceRange >= 1) decimals = 1;
          else if (priceRange >= 0.1) decimals = 2;
          else if (priceRange >= 0.01) decimals = 3;
          else if (priceRange >= 0.001) decimals = 4;
          else if (priceRange >= 0.0001) decimals = 5;
          else decimals = 6;
        }
        const numberFormatter = getNumberFormatter(decimals);
        const formatPrice = (price: number) => numberFormatter.format(price);

        // Get the latest bar from ref for high-speed line updates (same source as candle rendering)
        const currentBars = barsRef.current;
        const latestBar = currentBars.length > 0 ? currentBars[currentBars.length - 1] : null;

        // Merge all line types into unified priceLines array
        // Price lines from props get highest priority (100) so their labels stay aligned
        // For orders with pending updates, use pendingPrice to prevent snap-back on drag release
        // For lines with renderLineOnCanvas (like last-trade), use latest bar price from ref
        const allPriceLines: PriceLine[] = [
          ...(priceLinesRef.current?.map((p) => {
            // For high-speed lines, override price from barsRef to stay in sync with candles
            if (p.renderLineOnCanvas && p.id === 'last-trade' && latestBar) {
              const isUp = latestBar.close >= latestBar.open;
              return {
                ...p,
                price: latestBar.close,
                // Update color based on current bar direction
                color: isUp
                  ? rendererRef.current?.getOptions()?.upColor || '#26a69a'
                  : rendererRef.current?.getOptions()?.downColor || '#ef5350',
                label: {
                  ...p.label,
                  primaryText: formatPrice(latestBar.close),
                  // countdownToTime passed through - PriceLineLayer computes the text
                },
                priority: p.priority ?? 100,
              };
            }
            return { ...p, priority: p.priority ?? 100 };
          }) || []),
          ...(orderLinesRef.current?.map((o) => {
            const pending = pendingOrdersRef.current.get(o.id);
            if (pending) {
              // Use pending price to keep line at dragged position until update completes
              return orderLineToPriceLine({ ...o, price: pending.pendingPrice }, formatPrice);
            }
            return orderLineToPriceLine(o, formatPrice);
          }) || []),
          ...(positionLinesRef.current?.map((p) => positionLineToPriceLine(p, formatPrice)) || []),
          // Add bracket lines (TP/SL) for positions with active brackets
          ...(positionLinesRef.current?.flatMap((p) => positionToBracketLines(p, formatPrice)) || []),
        ];

        // Filter out order/position lines for canvas - Konva handles these interactively
        const canvasPriceLines = allPriceLines.filter((line) => line.type !== 'order' && line.type !== 'position');

        // Crosshair price lines are now created by the renderer after auto-scaling
        // This ensures correct Y-axis values for indicator panes

        // Get unified layout - prefer direct unifiedPaneLayout, fall back to converting legacy paneLayout
        const baseLayout = unifiedPaneLayoutRef.current || convertToUnifiedLayout(paneLayoutRef.current);

        // Apply pane Y-axis overrides for indicator panes that have been manually zoomed
        const layout: UnifiedPaneLayout = {
          ...baseLayout,
          panes: baseLayout.panes.map((pane) => {
            const override = paneYOverridesRef.current.get(pane.id);
            if (override) {
              return { ...pane, yMin: override.yMin, yMax: override.yMax, fixedRange: true };
            }
            return pane;
          }),
        };

        // Validate crosshair position is in valid region (not in dead zones)
        // This catches cases where mouse events were missed (rapid movement off canvas)
        const crosshair = crosshairRef.current;
        const opts = rendererRef.current.getOptions();
        const isValidCrosshairPosition =
          crosshair.x >= opts.margins.left &&
          crosshair.x <= opts.width - opts.margins.right &&
          crosshair.y >= opts.margins.top &&
          crosshair.y <= opts.height - opts.margins.bottom;

        // Update visibility based on position validation
        if (!isValidCrosshairPosition) {
          crosshair.visible = false;
        }

        // Use unified pane rendering - handles main chart, indicator panes, price lines, and crosshair
        // Note: Order/position lines excluded - they're rendered by Konva for interactivity
        rendererRef.current.renderWithLayout(
          barsRef.current,
          viewportRef.current,
          layout,
          canvasPriceLines,
          plotsRef.current,
          indicatorPaneInfoRef.current,
          crosshair,
          plotStyleOverridesRef.current,
        );

        // Draw crosshair time label on canvas (vertical + horizontal lines drawn by Konva)
        rendererRef.current.drawCrosshair(crosshair, viewportRef.current, layout);

        // Calculate crosshair price and time from position for Konva layer and event emission
        if (crosshair.visible) {
          crosshair.price = rendererRef.current.publicYToPriceWithLayout(crosshair.y, viewportRef.current, layout);
          crosshair.time = rendererRef.current.publicXToTime(crosshair.x, viewportRef.current);
          // Emit crosshair moved event for hotkey integration
          onCrossHairMoved?.(crosshair.price, crosshair.time);
        }

        // Compute label bounds for ALL price lines (including order/position/crosshair) for Konva layer
        // Use dirty checking to skip expensive recomputation when nothing changed
        // Crosshair is passed directly to avoid duplicate pane computation
        const linePrices = allPriceLines.map((l) => l.price.toFixed(6)).join(',');
        const boundsKey = `${vp.priceMin.toFixed(4)},${vp.priceMax.toFixed(4)}|${linePrices}|${Math.round(crosshair.y)}`;
        const now = Date.now();
        const isDragging = interactionRef.current.isDragging;

        // Recompute if: key changed, or it's been >50ms and not dragging (throttle non-critical updates)
        const keyChanged = boundsKey !== lastLabelBoundsKeyRef.current;
        const shouldRecompute = keyChanged || (isDragging && now - lastLabelBoundsUpdateRef.current > 16);

        if (shouldRecompute) {
          const crosshairColor = renderOptions?.crosshairColor || '#888888';
          const computedBounds = rendererRef.current.computePriceLineLabelBoundsWithLayout(
            allPriceLines,
            viewportRef.current,
            layout,
            plotsRef.current,
            crosshair.visible ? { y: crosshair.y, visible: true, color: crosshairColor } : undefined,
          );
          labelBoundsRef.current = computedBounds;
          lastLabelBoundsKeyRef.current = boundsKey;
          lastLabelBoundsUpdateRef.current = now;

          // Trigger re-render for Konva layer
          // Use flushSync during drag for immediate updates (no batching delay)
          if (isDragging) {
            flushSync(() => setLabelBoundsVersion((v) => v + 1));
          } else {
            setLabelBoundsVersion((v) => v + 1);
          }
        }
      }
    });
  }, []);

  // Register imperative update callback
  useEffect(() => {
    if (onBarsUpdateRef) {
      onBarsUpdateRef.current = (newBars: Bar[]) => {
        barsRef.current = newBars;
        scheduleRender();
      };
    }
    return () => {
      if (onBarsUpdateRef) {
        onBarsUpdateRef.current = null;
      }
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, [onBarsUpdateRef, scheduleRender]);

  // Check if position is over price axis (right margin area)
  const isOverPriceAxis = useCallback(
    (x: number): boolean => {
      return x > width - margins.right;
    },
    [width, margins.right],
  );

  // Check if position is in a dead zone (top bar or time axis - areas where crosshair shouldn't show)
  const isInDeadZone = useCallback(
    (x: number, y: number): boolean => {
      // Top bar dead zone
      if (y < margins.top) return true;
      // Time axis dead zone (bottom)
      if (y > height - margins.bottom) return true;
      // Price axis is handled separately (allows Y-axis dragging)
      return false;
    },
    [margins.top, margins.bottom, height],
  );

  // Get the pane at a given Y coordinate
  const getPaneAtY = useCallback(
    (y: number): { paneId: string; pane: ChartPane; yMin: number; yMax: number } | null => {
      const layout = unifiedPaneLayoutRef.current || convertToUnifiedLayout(paneLayoutRef.current);
      const timeAxisHeight = layout.timeAxisHeight;
      const availableHeight = height - timeAxisHeight;

      let currentTop = 0;
      for (const pane of layout.panes) {
        const paneHeight = availableHeight * pane.heightRatio;
        const paneBottom = currentTop + paneHeight;

        if (y >= currentTop && y < paneBottom) {
          // Check for Y-axis override
          const override = paneYOverridesRef.current.get(pane.id);
          const yMin = override?.yMin ?? pane.yMin;
          const yMax = override?.yMax ?? pane.yMax;

          // For main pane, use viewport prices if not overridden
          if (pane.type === 'main' && !override && viewportRef.current) {
            return {
              paneId: pane.id,
              pane,
              yMin: viewportRef.current.priceMin,
              yMax: viewportRef.current.priceMax,
            };
          }

          return { paneId: pane.id, pane, yMin, yMax };
        }
        currentTop = paneBottom;
      }
      return null;
    },
    [height],
  );

  // Get chart dimensions
  const getChartDimensions = useCallback(() => {
    const chartWidth = width - margins.left - margins.right;
    const chartHeight = height - margins.top - margins.bottom;
    return { chartWidth, chartHeight };
  }, [width, height, margins]);

  // Check if position is in reset button hover zone (lower center area) - for mouse
  const isInResetButtonZone = useCallback(
    (x: number, y: number): boolean => {
      const centerX = width / 2;
      const bottomY = height - margins.bottom - 60; // 60px from bottom of chart area
      const zoneRadius = 50; // Hover zone radius
      const dx = x - centerX;
      const dy = y - bottomY;
      return Math.sqrt(dx * dx + dy * dy) < zoneRadius;
    },
    [width, height, margins.bottom],
  );

  // Check if position is in mobile reset button toggle zone (bottom 150px of canvas)
  const isInMobileResetZone = useCallback(
    (y: number): boolean => {
      return y > height - 150;
    },
    [height],
  );

  // Snap X position to nearest bar interval (for crosshair)
  // Snaps to grid based on bar interval, even in empty space
  const snapToBarCenter = useCallback(
    (x: number): number => {
      const bars = barsRef.current;
      const currentViewport = viewportRef.current;
      if (bars.length < 2 || !currentViewport) return x;

      const { chartWidth } = getChartDimensions();
      const viewportTimeRange = currentViewport.endTime - currentViewport.startTime;

      // Get bar interval from actual bars
      const barInterval = bars[1].time - bars[0].time;

      // Convert X to time
      const ratio = (x - margins.left) / chartWidth;
      const time = currentViewport.startTime + ratio * viewportTimeRange;

      // Round time to nearest bar interval boundary
      // Use the first bar's time as the reference point for the grid
      const firstBarTime = bars[0].time;
      const timeSinceFirst = time - firstBarTime;
      const intervalCount = Math.round(timeSinceFirst / barInterval);
      const snappedTime = firstBarTime + intervalCount * barInterval;

      // Convert snapped time back to X
      const snappedRatio = (snappedTime - currentViewport.startTime) / viewportTimeRange;
      return margins.left + snappedRatio * chartWidth;
    },
    [getChartDimensions, margins.left],
  );

  // Reset viewport to initial state
  const resetViewport = useCallback(() => {
    if (barsRef.current.length > 0) {
      const newViewport = TealchartRenderer.calculateViewport(barsRef.current);
      setViewport(newViewport);
      viewportRef.current = newViewport;
      onViewportChange?.(newViewport);
      // Re-lock mobile Y panning (unlocked by price axis drag)
      touchYPanUnlockedRef.current = false;
      // Reset auto-hide timer on button click (keeps button visible for another 3s)
      startResetButtonAutoHideTimer();
    }
  }, [onViewportChange, startResetButtonAutoHideTimer]);

  // Handle order move from Konva drag
  // Uses TradingView pattern: calls the stateful onMove callback registered on the order line adapter
  const handleOrderMove = useCallback(
    (orderId: string, newPrice: number) => {
      // Get the current order to find original price
      const order = orderLinesRef.current?.find((o) => o.id === orderId);
      if (!order) return;

      // Create pending update for optimistic UI
      const pending: PendingOrderUpdate = {
        orderId,
        pendingPrice: newPrice,
        originalPrice: order.price,
        startTime: Date.now(),
        timeoutId: setTimeout(() => {
          // Clear pending state after timeout
          pendingOrdersRef.current.delete(orderId);
          setPendingOrdersVersion((v) => v + 1);
        }, 5000),
      };

      // Clear any existing pending for this order
      const existing = pendingOrdersRef.current.get(orderId);
      if (existing) {
        clearTimeout(existing.timeoutId);
      }

      pendingOrdersRef.current.set(orderId, pending);
      setPendingOrdersVersion((v) => v + 1);

      // Call the stateful onMove callback on the order line adapter
      chartApi?.triggerOrderMove(orderId, newPrice);
    },
    [chartApi],
  );

  // Handle order cancel from Konva button click
  // Uses TradingView pattern: calls the stateful onCancel callback registered on the order line adapter
  const handleOrderCancel = useCallback(
    (orderId: string) => {
      chartApi?.triggerOrderCancel(orderId);
    },
    [chartApi],
  );

  // Handle position close from Konva button click
  // Uses TradingView pattern: calls the stateful onClose callback registered on the position line adapter
  const handlePositionClose = useCallback(
    (positionId: string) => {
      chartApi?.triggerPositionClose(positionId);
    },
    [chartApi],
  );

  const handlePositionReverse = useCallback(
    (positionId: string) => {
      chartApi?.triggerPositionReverse(positionId);
    },
    [chartApi],
  );

  // Handle cursor change from Konva layer (hover over interactive elements)
  const handleKonvaCursorChange = useCallback((newCursor: 'default' | 'pointer' | 'grab' | 'grabbing') => {
    if (newCursor === 'default') {
      // When leaving Konva interactive elements, allow canvas to control cursor again
      isOverKonvaElementRef.current = false;
      setCursor('crosshair');
    } else {
      // Konva is controlling cursor - don't let canvas override
      isOverKonvaElementRef.current = true;
      setCursor(newCursor);
    }
  }, []);

  // Close context menu
  const closeContextMenu = useCallback(() => {
    setContextMenuState((prev) => ({ ...prev, visible: false }));
  }, []);

  // Open context menu at given position with price
  const openContextMenu = useCallback(
    (price: number, screenX: number, screenY: number) => {
      if (!onContextMenu) return;

      // Get unixTime from current crosshair position or use current time
      const unixTime = crosshairRef.current.time || Date.now();

      // Get menu items from callback
      const items = onContextMenu(unixTime, price);

      // Don't show if no items
      if (!items || items.length === 0) return;

      setContextMenuState({
        visible: true,
        x: screenX,
        y: screenY,
        items,
      });
    },
    [onContextMenu],
  );

  // Handle context menu button click from PriceLineLayer (+ button)
  const handleContextMenuButtonClick = useCallback(
    (price: number, screenX: number, screenY: number) => {
      openContextMenu(price, screenX, screenY);
    },
    [openContextMenu],
  );

  // Coordinate conversion functions for Konva layer
  // Uses pane-aware methods that match the canvas coordinate system (main pane starts at Y=0)
  const priceToY = useCallback((price: number) => {
    const renderer = rendererRef.current;
    const currentViewport = viewportRef.current;
    if (!renderer || !currentViewport) return 0;
    const layout = unifiedPaneLayoutRef.current || convertToUnifiedLayout(paneLayoutRef.current);
    // Pane-aware method returns Y in canvas coordinates (main pane at Y=0)
    // Konva Stage is positioned at mainPaneBounds.top via CSS, so internal Y matches canvas Y
    return renderer.publicPriceToYWithLayout(price, currentViewport, layout);
  }, []);

  const yToPrice = useCallback((y: number) => {
    const renderer = rendererRef.current;
    const currentViewport = viewportRef.current;
    if (!renderer || !currentViewport) return 0;
    const layout = unifiedPaneLayoutRef.current || convertToUnifiedLayout(paneLayoutRef.current);
    // Pane-aware method - Konva Y is already in canvas coordinates
    return renderer.publicYToPriceWithLayout(y, currentViewport, layout);
  }, []);

  // Get combined render options
  const getFullRenderOptions = useCallback((): Partial<RenderOptions> => {
    return {
      ...renderOptions,
      width,
      height,
      devicePixelRatio: typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1,
      margins,
    };
  }, [width, height, renderOptions, margins]);

  // Initialize/resize canvas - only when dimensions change
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const nativeCtx = canvas.getContext('2d');
    if (!nativeCtx) return;

    // Set canvas size for HiDPI
    const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    // Wrap in CanvasContext abstraction (enables Skia implementation for React Native)
    const ctx = new WebCanvasContext(nativeCtx);

    // Create renderer if it doesn't exist, or update context after resize
    if (!rendererRef.current) {
      rendererRef.current = new TealchartRenderer(ctx, getFullRenderOptions());
    } else {
      // Renderer exists but canvas was resized - need to update context
      rendererRef.current = new TealchartRenderer(ctx, getFullRenderOptions());
    }
    scheduleRender();
  }, [width, height]); // Only re-run on size changes

  // Update renderer options when renderOptions/margins change (without clearing canvas)
  useEffect(() => {
    if (rendererRef.current) {
      rendererRef.current.setOptions(getFullRenderOptions());
      scheduleRender();
    }
  }, [getFullRenderOptions, scheduleRender]);

  // Track the time range of current bars to detect interval changes
  const lastBarsTimeRangeRef = useRef<{ start: number; end: number } | null>(null);

  // Sync bars ref when props change
  useEffect(() => {
    barsRef.current = bars;

    if (bars.length === 0) return;

    const newTimeRange = { start: bars[0].time, end: bars[bars.length - 1].time };
    const lastTimeRange = lastBarsTimeRangeRef.current;

    // Recalculate viewport if:
    // 1. This is the first load (no previous time range)
    // 2. The time range has changed significantly (different interval or symbol)
    const needsViewportRecalc =
      !lastTimeRange ||
      Math.abs(newTimeRange.start - lastTimeRange.start) > 60000 || // More than 1 minute difference
      Math.abs(newTimeRange.end - lastTimeRange.end) > 60000;

    if (needsViewportRecalc) {
      lastBarsTimeRangeRef.current = newTimeRange;
      const newViewport = TealchartRenderer.calculateViewport(bars);
      setViewport(newViewport);
    }
  }, [bars]);

  // Sync viewport ref and schedule render when viewport state changes
  useEffect(() => {
    viewportRef.current = viewport;
    scheduleRender();
  }, [viewport, scheduleRender]);

  // Schedule render when priceLines, orderLines, positionLines, plots, or pane layout change
  useEffect(() => {
    scheduleRender();
  }, [priceLines, orderLines, positionLines, plots, paneLayout, indicatorPaneInfo, scheduleRender]);

  // Escape key cancels any active viewport drag operation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && interactionRef.current.isDragging) {
        // Reset drag state without applying changes
        interactionRef.current.isDragging = false;
        interactionRef.current.dragMode = 'none';
        // Restore viewport to pre-drag state if available
        if (interactionRef.current.dragStartViewport) {
          viewportRef.current = interactionRef.current.dragStartViewport;
          setViewport(interactionRef.current.dragStartViewport);
        }
        interactionRef.current.dragStartViewport = null;
        setCursor('crosshair');
        scheduleRender();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [scheduleRender]);

  // Window-level mouse move handler for drag continuation off canvas
  const handleWindowMouseMove = useCallback(
    (e: MouseEvent) => {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;

      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const interaction = interactionRef.current;
      const { chartHeight } = getChartDimensions();

      if (interaction.isDragging && interaction.dragStartViewport) {
        const dx = x - interaction.dragStartX;
        const dy = y - interaction.dragStartY;

        if (interaction.dragMode === 'pan') {
          // Pan in both X and Y directions
          const timeRange = interaction.dragStartViewport.endTime - interaction.dragStartViewport.startTime;
          const priceRange = interaction.dragStartViewport.priceMax - interaction.dragStartViewport.priceMin;

          const pixelsPerMs = width / timeRange;
          const pixelsPerPrice = chartHeight / priceRange;

          const timeDelta = -dx / pixelsPerMs;
          const priceDelta = dy / pixelsPerPrice; // Inverted because Y increases downward

          const newViewport: Viewport = {
            startTime: interaction.dragStartViewport.startTime + timeDelta,
            endTime: interaction.dragStartViewport.endTime + timeDelta,
            priceMin: interaction.dragStartViewport.priceMin + priceDelta,
            priceMax: interaction.dragStartViewport.priceMax + priceDelta,
          };

          viewportRef.current = newViewport;
          scheduleRender();

          // Request more bars if panning to edges
          const currentBars = barsRef.current;
          if (timeDelta < 0 && currentBars.length > 0 && newViewport.startTime < currentBars[0].time) {
            onRequestMoreBars?.('left');
          }
        } else if (interaction.dragMode === 'priceAxisZoom' && interaction.dragStartPaneYRange) {
          // Price axis zoom: drag down = larger range (zoom out), drag up = smaller range (zoom in)
          // Use exponential scaling for natural feel and to prevent negative/zero ranges
          const startRange = interaction.dragStartPaneYRange;
          const yRange = startRange.yMax - startRange.yMin;
          const dragRatio = dy / chartHeight; // -1 to +1 for full height drag
          // Exponential zoom: e^(dragRatio * 2) gives smooth scaling
          // dy > 0 (drag down) = zoom out (larger range), dy < 0 (drag up) = zoom in (smaller range)
          const zoomFactor = Math.exp(dragRatio * 2);
          const newYRange = yRange * zoomFactor;

          // Zoom centered on the middle of the current Y range
          const yCenter = (startRange.yMax + startRange.yMin) / 2;
          const newYMin = yCenter - newYRange / 2;
          const newYMax = yCenter + newYRange / 2;

          // Check if we're zooming the main pane or an indicator pane
          if (interaction.draggedPaneId === 'main') {
            // Main pane: update viewport
            const newViewport: Viewport = {
              ...interaction.dragStartViewport,
              priceMin: newYMin,
              priceMax: newYMax,
            };
            viewportRef.current = newViewport;
          } else if (interaction.draggedPaneId) {
            // Indicator pane: update pane Y override
            paneYOverridesRef.current.set(interaction.draggedPaneId, {
              yMin: newYMin,
              yMax: newYMax,
            });
          }

          scheduleRender();
        }
      }
    },
    [width, getChartDimensions, scheduleRender, onRequestMoreBars],
  );

  // Window-level mouse up handler for drag continuation off canvas
  const handleWindowMouseUp = useCallback(() => {
    // Emit mouse up event for hotkey integration
    onMouseUp?.();

    // Sync viewport state after drag ends
    if (interactionRef.current.isDragging && viewportRef.current) {
      setViewport(viewportRef.current);
      onViewportChange?.(viewportRef.current);
    }
    interactionRef.current.isDragging = false;
    interactionRef.current.dragMode = 'none';
    interactionRef.current.dragStartViewport = null;
    // Reset cursor based on current position
    setCursor(interactionRef.current.isOverPriceAxis ? 'ns-resize' : 'crosshair');
    // Hide crosshair when mouse released outside canvas
    crosshairRef.current.visible = false;
    scheduleRender();

    // Remove window listeners
    window.removeEventListener('mousemove', handleWindowMouseMove);
    window.removeEventListener('mouseup', handleWindowMouseUp);
  }, [onViewportChange, onMouseUp, handleWindowMouseMove, scheduleRender]);

  // Check if a point is over a Konva interactive element (for hit detection)
  const isOverKonvaInteractiveElement = useCallback((clientX: number, clientY: number): boolean => {
    if (!stageRef.current) return false;

    const stage = stageRef.current;
    const stageContainer = stage.container?.();
    if (!stageContainer) return false;

    // Get position relative to Konva stage
    const stageRect = stageContainer.getBoundingClientRect();
    const stageX = clientX - stageRect.left;
    const stageY = clientY - stageRect.top;

    // Check if within stage bounds
    if (stageX < 0 || stageY < 0 || stageX > stage.width() || stageY > stage.height()) {
      return false;
    }

    // Use Konva's hit detection
    const shape = stage.getIntersection({ x: stageX, y: stageY });
    if (!shape) return false;

    // Check if it's an interactive shape (not stage or layer)
    const shapeType = shape.getClassName?.();
    return shapeType !== 'Stage' && shapeType !== 'Layer';
  }, []);

  // Mouse handlers for pan/zoom - attached to container for unified event handling
  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      // Skip if over a Konva interactive element (let Konva handle it)
      if (isOverKonvaInteractiveElement(e.clientX, e.clientY)) {
        return;
      }

      // Emit mouse down event for hotkey integration
      onMouseDown?.();

      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;

      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      // Determine drag mode based on where click started
      const dragMode: DragMode = isOverPriceAxis(x) ? 'priceAxisZoom' : 'pan';

      // For price axis zoom, detect which pane we're zooming
      let draggedPaneId: string | null = null;
      let dragStartPaneYRange: { yMin: number; yMax: number } | null = null;

      if (dragMode === 'priceAxisZoom') {
        const paneInfo = getPaneAtY(y);
        if (paneInfo) {
          draggedPaneId = paneInfo.paneId;
          dragStartPaneYRange = { yMin: paneInfo.yMin, yMax: paneInfo.yMax };
        }
      }

      interactionRef.current = {
        ...interactionRef.current,
        isDragging: true,
        dragMode,
        dragStartX: x,
        dragStartY: y,
        dragStartViewport: { ...viewport },
        draggedPaneId,
        dragStartPaneYRange,
      };

      // Update cursor
      setCursor(dragMode === 'priceAxisZoom' ? 'ns-resize' : 'grabbing');

      // Attach window listeners for drag continuation off canvas
      window.addEventListener('mousemove', handleWindowMouseMove);
      window.addEventListener('mouseup', handleWindowMouseUp);
    },
    [
      viewport,
      isOverPriceAxis,
      getPaneAtY,
      handleWindowMouseMove,
      handleWindowMouseUp,
      onMouseDown,
      isOverKonvaInteractiveElement,
    ],
  );

  // Container mouse move - handles crosshair and cursor updates (drag handled by window listener)
  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;

      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const interaction = interactionRef.current;

      // Track if over price axis for cursor
      interactionRef.current.isOverPriceAxis = isOverPriceAxis(x);
      interactionRef.current.hoveredX = x;
      interactionRef.current.hoveredY = y;

      // Check if in reset button zone
      const inResetZone = isInResetButtonZone(x, y);
      if (inResetZone !== showResetButton) {
        setShowResetButton(inResetZone);
      }

      // Update crosshair position (hide when over price axis or in dead zones)
      // Snap X to nearest bar center for vertical line
      const inDeadZone = isInDeadZone(x, y);
      crosshairRef.current.visible = !interactionRef.current.isOverPriceAxis && !inDeadZone;
      crosshairRef.current.x = snapToBarCenter(x);
      crosshairRef.current.y = y;

      // Crosshair value calculation is now done by the renderer at render time
      // This ensures correct values with auto-scaled indicator pane Y ranges

      // Schedule render for crosshair update (if not dragging, which already schedules via window)
      if (!interaction.isDragging) {
        scheduleRender();
        // Update cursor when not dragging AND not over Konva interactive element
        if (!isOverKonvaElementRef.current) {
          setCursor(interactionRef.current.isOverPriceAxis ? 'ns-resize' : 'crosshair');
        }
      }
    },
    [
      isOverPriceAxis,
      isInDeadZone,
      isInResetButtonZone,
      showResetButton,
      scheduleRender,
      snapToBarCenter,
      height,
      margins,
      renderOptions,
    ],
  );

  const handleMouseLeave = useCallback(
    (_e: React.MouseEvent<HTMLDivElement>) => {
      // Only reset if not dragging (dragging continues via window listeners)
      if (!interactionRef.current.isDragging) {
        // Check if crosshair was visible (for instant hide via forceRender)
        const wasVisible = crosshairRef.current.visible;
        interactionRef.current.isOverPriceAxis = false;
        // Hide crosshair and reset button
        crosshairRef.current.visible = false;
        // Also reset touch crosshair lock when leaving
        touchCrosshairLockedRef.current = false;
        setShowResetButton(false);
        // Force immediate re-render for instant crosshair hide (bypasses RAF delay)
        if (wasVisible) {
          forceRender();
        }
        scheduleRender();
        setCursor('crosshair');
      }
    },
    [scheduleRender, forceRender],
  );

  // Document-level mousemove listener to catch fast mouse exits
  // The container's onMouseLeave can miss events when the mouse moves quickly
  useEffect(() => {
    const handleDocumentMouseMove = (e: MouseEvent) => {
      // Skip if dragging (drag continues via window listeners)
      if (interactionRef.current.isDragging) return;
      // Skip if crosshair not visible (nothing to hide)
      if (!crosshairRef.current.visible) return;
      // Skip if no container ref
      if (!containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const isInside =
        e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom;

      if (!isInside) {
        // Mouse is outside container - hide crosshair
        // Force immediate re-render for instant crosshair hide (bypasses RAF delay)
        crosshairRef.current.visible = false;
        touchCrosshairLockedRef.current = false;
        interactionRef.current.isOverPriceAxis = false;
        setShowResetButton(false);
        forceRender();
        scheduleRender();
        setCursor('crosshair');
      }
    };

    document.addEventListener('mousemove', handleDocumentMouseMove);
    return () => {
      document.removeEventListener('mousemove', handleDocumentMouseMove);
    };
  }, [scheduleRender, forceRender]);

  // Helper to calculate distance between two touch points
  const getTouchDistance = useCallback((touches: Map<number, { x: number; y: number }>) => {
    const points = Array.from(touches.values());
    if (points.length < 2) return 0;
    const dx = points[1].x - points[0].x;
    const dy = points[1].y - points[0].y;
    return Math.sqrt(dx * dx + dy * dy);
  }, []);

  // Clear long press timer
  const clearLongPressTimer = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  // Touch handlers as refs for native event listeners (passive: false support)
  const handleTouchStartRef = useRef<(e: TouchEvent) => void>(null!);
  const handleTouchMoveRef = useRef<(e: TouchEvent) => void>(null!);
  const handleTouchEndRef = useRef<(e: TouchEvent) => void>(null!);

  // Touch start handler - uses native event for passive: false support
  handleTouchStartRef.current = (e: TouchEvent) => {
    // Check if touch is over the reset button (let button handle it)
    if (resetButtonRef.current && e.target instanceof Node && resetButtonRef.current.contains(e.target)) {
      // Don't prevent default - let button handle the touch
      return;
    }

    // Check if touch is over a Konva interactive element (let Konva handle it)
    const firstTouch = e.touches[0];
    if (firstTouch && isOverKonvaInteractiveElement(firstTouch.clientX, firstTouch.clientY)) {
      // Don't prevent default - let Konva handle the touch
      return;
    }

    e.preventDefault(); // Prevent browser gestures

    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    // Track all active touches
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      activeTouchesRef.current.set(touch.identifier, {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top,
      });
    }

    const touchCount = activeTouchesRef.current.size;

    if (touchCount === 1) {
      // Single finger touch
      const touch = e.touches[0];
      const x = touch.clientX - rect.left;
      const y = touch.clientY - rect.top;

      // Record touch start for tap detection
      touchStartRef.current = { x, y, time: Date.now() };
      isTouchDraggingRef.current = false;

      // Start long press timer (for context menu)
      clearLongPressTimer();
      longPressTimerRef.current = setTimeout(() => {
        // Only trigger if we haven't started dragging
        if (!isTouchDraggingRef.current && onContextMenu) {
          const price = yToPrice(y);
          if (!isInDeadZone(x, y) && !isOverPriceAxis(x)) {
            openContextMenu(price, touch.clientX, touch.clientY);
          }
        }
        longPressTimerRef.current = null;
      }, LONG_PRESS_DURATION);

      // Determine drag mode based on where touch started (same as mouse)
      const dragMode: DragMode = isOverPriceAxis(x) ? 'priceAxisZoom' : 'pan';

      // For price axis zoom, detect which pane we're zooming
      let draggedPaneId: string | null = null;
      let dragStartPaneYRange: { yMin: number; yMax: number } | null = null;

      if (dragMode === 'priceAxisZoom') {
        const paneInfo = getPaneAtY(y);
        if (paneInfo) {
          draggedPaneId = paneInfo.paneId;
          dragStartPaneYRange = { yMin: paneInfo.yMin, yMax: paneInfo.yMax };
        }
      }

      // If crosshair is NOT locked, prepare for potential pan or price axis zoom
      // If crosshair IS locked, prepare for potential crosshair drag
      if (!touchCrosshairLockedRef.current) {
        interactionRef.current = {
          ...interactionRef.current,
          dragStartX: x,
          dragStartY: y,
          dragStartViewport: { ...viewport },
          dragMode,
          draggedPaneId,
          dragStartPaneYRange,
        };
      }
    } else if (touchCount === 2) {
      // Two finger touch - prepare for pinch zoom
      clearLongPressTimer();
      isTouchDraggingRef.current = true; // Pinch counts as drag (not tap)

      pinchStartDistanceRef.current = getTouchDistance(activeTouchesRef.current);
      pinchStartViewportRef.current = { ...viewport };
    }
  };

  // Touch move handler - uses native event for passive: false support
  handleTouchMoveRef.current = (e: TouchEvent) => {
    // Let reset button handle its own touch events
    if (resetButtonRef.current && e.target instanceof Node && resetButtonRef.current.contains(e.target)) {
      return;
    }

    e.preventDefault();

    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    // Update all active touch positions
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      activeTouchesRef.current.set(touch.identifier, {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top,
      });
    }

    const touchCount = activeTouchesRef.current.size;

    if (touchCount === 1 && touchStartRef.current) {
      const touch = e.touches[0];
      const x = touch.clientX - rect.left;
      const y = touch.clientY - rect.top;

      // Check if we've moved enough to be considered a drag
      const dx = x - touchStartRef.current.x;
      const dy = y - touchStartRef.current.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance > TOUCH_TAP_THRESHOLD) {
        isTouchDraggingRef.current = true;
        interactionRef.current.isDragging = true; // Prevent viewport sync from overwriting during drag
        clearLongPressTimer(); // Cancel long press if dragging
        setShowResetButton(false); // Hide reset button when dragging starts
        clearResetButtonAutoHideTimer(); // Clear the auto-hide timer too

        if (touchCrosshairLockedRef.current) {
          // Crosshair is locked - drag moves crosshair proportionally
          // Move crosshair by the delta from drag start, not to absolute position
          const newX = touchCrosshairPositionRef.current.x + dx;
          const newY = touchCrosshairPositionRef.current.y + dy;

          // Update crosshair position (with bounds checking)
          crosshairRef.current.x = snapToBarCenter(Math.max(margins.left, Math.min(width - margins.right, newX)));
          crosshairRef.current.y = Math.max(margins.top, Math.min(height - margins.bottom, newY));
          crosshairRef.current.visible = true;

          // Update the stored position for continuous dragging
          touchCrosshairPositionRef.current = { x: newX, y: newY };
          touchStartRef.current = { x, y, time: touchStartRef.current.time };

          scheduleRender();
        } else {
          // Crosshair not locked - pan or price axis zoom
          const interaction = interactionRef.current;
          if (interaction.dragStartViewport) {
            const { chartWidth, chartHeight } = getChartDimensions();

            if (interaction.dragMode === 'priceAxisZoom' && interaction.dragStartPaneYRange) {
              // Price axis zoom: drag down = larger range (zoom out), drag up = smaller range (zoom in)
              // Unlock Y panning for mobile when price axis is interacted with
              touchYPanUnlockedRef.current = true;

              const startRange = interaction.dragStartPaneYRange;
              const yRange = startRange.yMax - startRange.yMin;
              const dragRatio = dy / chartHeight;
              const zoomFactor = Math.exp(dragRatio * 2);
              const newYRange = yRange * zoomFactor;

              // Zoom centered on the middle of the current Y range
              const yCenter = (startRange.yMax + startRange.yMin) / 2;
              const newYMin = yCenter - newYRange / 2;
              const newYMax = yCenter + newYRange / 2;

              // Check if we're zooming the main pane or an indicator pane
              if (interaction.draggedPaneId === 'main') {
                // Main pane: update viewport
                const newViewport: Viewport = {
                  ...interaction.dragStartViewport,
                  priceMin: newYMin,
                  priceMax: newYMax,
                };
                setViewport(newViewport);
                onViewportChange?.(newViewport);
              } else if (interaction.draggedPaneId) {
                // Indicator pane: update pane Y override
                paneYOverridesRef.current.set(interaction.draggedPaneId, {
                  yMin: newYMin,
                  yMax: newYMax,
                });
              }
              scheduleRender();
            } else {
              // Pan mode - X always pans, Y only pans if unlocked (mobile Y-lock feature)
              // On mobile, Y panning is locked by default until user drags price axis
              const timeRange = interaction.dragStartViewport.endTime - interaction.dragStartViewport.startTime;
              const priceRange = interaction.dragStartViewport.priceMax - interaction.dragStartViewport.priceMin;

              const pixelsPerMs = chartWidth / timeRange;
              const pixelsPerPrice = chartHeight / priceRange;

              const timeDelta = -dx / pixelsPerMs;
              // Mobile Y-lock: Y panning locked by default until price axis is dragged
              const priceDelta = touchYPanUnlockedRef.current ? dy / pixelsPerPrice : 0;

              const newViewport: Viewport = {
                startTime: interaction.dragStartViewport.startTime + timeDelta,
                endTime: interaction.dragStartViewport.endTime + timeDelta,
                priceMin: interaction.dragStartViewport.priceMin + priceDelta,
                priceMax: interaction.dragStartViewport.priceMax + priceDelta,
              };

              // Use ref directly like mouse handler (synchronous, no React batching issues)
              viewportRef.current = newViewport;
              scheduleRender();

              // Request more bars if panning left
              const currentBars = barsRef.current;
              if (timeDelta > 0 && currentBars.length > 0 && newViewport.startTime < currentBars[0].time) {
                onRequestMoreBars?.('left');
              }
            }
          }
        }
      }
    } else if (touchCount === 2 && pinchStartViewportRef.current && pinchStartDistanceRef.current > 0) {
      // Pinch zoom
      const currentDistance = getTouchDistance(activeTouchesRef.current);
      if (currentDistance > 0) {
        const scale = pinchStartDistanceRef.current / currentDistance; // Inverse: spread = zoom in

        const startViewport = pinchStartViewportRef.current;
        const timeRange = startViewport.endTime - startViewport.startTime;
        const newTimeRange = timeRange * scale;

        // Zoom centered on chart center
        const centerTime = (startViewport.startTime + startViewport.endTime) / 2;
        const newStartTime = centerTime - newTimeRange / 2;
        const newEndTime = centerTime + newTimeRange / 2;

        const newViewport: Viewport = {
          ...startViewport,
          startTime: newStartTime,
          endTime: newEndTime,
        };

        setViewport(newViewport);
        onViewportChange?.(newViewport);

        // Request more bars if zooming out
        const currentBars = barsRef.current;
        if (scale > 1 && currentBars.length > 0 && newViewport.startTime < currentBars[0].time) {
          onRequestMoreBars?.('left');
        }
      }
    }
  };

  // Touch end handler - uses native event for passive: false support
  handleTouchEndRef.current = (e: TouchEvent) => {
    // Let reset button handle its own touch events
    if (resetButtonRef.current && e.target instanceof Node && resetButtonRef.current.contains(e.target)) {
      return;
    }

    e.preventDefault();

    // Remove ended touches
    for (let i = 0; i < e.changedTouches.length; i++) {
      activeTouchesRef.current.delete(e.changedTouches[i].identifier);
    }

    clearLongPressTimer();

    // Check if this was a tap (not a drag)
    if (touchStartRef.current && !isTouchDraggingRef.current && activeTouchesRef.current.size === 0) {
      const elapsed = Date.now() - touchStartRef.current.time;

      // It's a tap if we didn't drag and it was quick
      if (elapsed < 300) {
        const x = touchStartRef.current.x;
        const y = touchStartRef.current.y;

        // Mobile: tap in bottom 150px toggles reset button visibility
        if (isInMobileResetZone(y)) {
          setShowResetButton((prev) => {
            if (!prev) {
              // Showing button - start auto-hide timer
              startResetButtonAutoHideTimer();
              return true;
            } else {
              // Hiding button - clear timer
              clearResetButtonAutoHideTimer();
              return false;
            }
          });
        }

        // Crosshair toggle (independent of reset button toggle)
        if (!isInDeadZone(x, y) && !isOverPriceAxis(x)) {
          // Toggle crosshair locked state
          if (touchCrosshairLockedRef.current) {
            // Hide crosshair
            touchCrosshairLockedRef.current = false;
            crosshairRef.current.visible = false;
          } else {
            // Show and lock crosshair at tap position
            touchCrosshairLockedRef.current = true;
            touchCrosshairPositionRef.current = { x, y };
            crosshairRef.current.x = snapToBarCenter(x);
            crosshairRef.current.y = y;
            crosshairRef.current.visible = true;
          }
          scheduleRender();
        }
      }
    }

    // Reset state when all touches end
    if (activeTouchesRef.current.size === 0) {
      // Sync viewport to React state after drag ends (like mouse up does)
      if (isTouchDraggingRef.current && viewportRef.current) {
        setViewport(viewportRef.current);
        onViewportChange?.(viewportRef.current);
      }

      touchStartRef.current = null;
      isTouchDraggingRef.current = false;
      interactionRef.current.isDragging = false; // Reset drag flag
      pinchStartDistanceRef.current = 0;
      pinchStartViewportRef.current = null;
    }
  };

  // Handle right-click context menu - attached to container for unified event handling
  const handleContextMenu = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      e.preventDefault();
      if (!onContextMenu) return;

      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;

      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      // Don't show context menu in dead zones
      if (isInDeadZone(x, y) || isOverPriceAxis(x)) return;

      // Only show context menu on main pane (not indicator panes)
      const renderer = rendererRef.current;
      if (renderer && paneLayout) {
        const layout: UnifiedPaneLayout = {
          panes: [
            {
              id: 'main',
              type: 'main' as const,
              heightRatio: 1 - (paneLayout.indicatorPanes?.reduce((sum, p) => sum + p.heightRatio, 0) || 0),
              yMin: 0,
              yMax: 1,
              fixedRange: false,
            },
            ...(paneLayout.indicatorPanes?.map((p) => ({
              id: p.id,
              type: 'indicator' as const,
              heightRatio: p.heightRatio,
              yMin: p.yMin ?? 0,
              yMax: p.yMax ?? 1,
              fixedRange: false,
            })) || []),
          ],
          timeAxisHeight: margins.bottom,
        };
        const computedPanes = renderer.computePanesLayout(layout, height);
        const mainPane = computedPanes[0];
        if (mainPane && (y < mainPane.top || y >= mainPane.bottom)) {
          return; // Click is outside main pane
        }
      }

      // Get price from Y coordinate
      const price = yToPrice(y);
      openContextMenu(price, e.clientX, e.clientY);
    },
    [onContextMenu, isInDeadZone, isOverPriceAxis, yToPrice, openContextMenu, paneLayout, height, margins.bottom],
  );

  // Wheel handler as ref to avoid recreation on every render
  const handleWheelRef = useRef<(e: WheelEvent) => void>(null!);
  handleWheelRef.current = (e: WheelEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Close context menu on scroll/zoom
    if (contextMenuState.visible) {
      closeContextMenu();
    }

    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect || !viewportRef.current) return;

    const currentViewport = viewportRef.current;
    const { chartWidth } = getChartDimensions();

    // Handle horizontal scroll (trackpad two-finger swipe)
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
      // Horizontal pan
      const timeRange = currentViewport.endTime - currentViewport.startTime;
      const pixelsPerMs = chartWidth / timeRange;
      const timeDelta = e.deltaX / pixelsPerMs;

      const newViewport: Viewport = {
        ...currentViewport,
        startTime: currentViewport.startTime + timeDelta,
        endTime: currentViewport.endTime + timeDelta,
      };

      setViewport(newViewport);
      onViewportChange?.(newViewport);

      // Request more bars if panning left
      const currentBars = barsRef.current;
      if (timeDelta < 0 && currentBars.length > 0 && newViewport.startTime < currentBars[0].time) {
        onRequestMoreBars?.('left');
      }
    } else {
      // Vertical scroll = zoom (smaller factor for smoother zoom)
      const zoomFactor = e.deltaY > 0 ? 1.015 : 0.985;
      const timeRange = currentViewport.endTime - currentViewport.startTime;
      const newTimeRange = timeRange * zoomFactor;

      // Zoom centered on chart center (TradingView style)
      const centerTime = (currentViewport.startTime + currentViewport.endTime) / 2;
      const newStartTime = centerTime - newTimeRange / 2;
      const newEndTime = centerTime + newTimeRange / 2;

      const newViewport: Viewport = {
        ...currentViewport,
        startTime: newStartTime,
        endTime: newEndTime,
      };

      setViewport(newViewport);
      onViewportChange?.(newViewport);

      // Request more bars if zooming out expands beyond existing bars
      const currentBars = barsRef.current;
      if (zoomFactor > 1 && currentBars.length > 0 && newStartTime < currentBars[0].time) {
        onRequestMoreBars?.('left');
      }
    }
  };

  // Native wheel event listener with passive: false to properly prevent scroll
  // Attached to container (not canvas) for unified event handling
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      handleWheelRef.current?.(e);
    };

    // Use capture: true to catch wheel events before Konva can intercept them
    container.addEventListener('wheel', handleWheel, { passive: false, capture: true });

    return () => {
      container.removeEventListener('wheel', handleWheel, { capture: true });
    };
  }, []);

  // Native touch event listeners with passive: false to allow preventDefault
  // This is required because React's synthetic touch events are passive by default
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleTouchStart = (e: TouchEvent) => {
      handleTouchStartRef.current?.(e);
    };
    const handleTouchMove = (e: TouchEvent) => {
      handleTouchMoveRef.current?.(e);
    };
    const handleTouchEnd = (e: TouchEvent) => {
      handleTouchEndRef.current?.(e);
    };

    // Use capture: true and passive: false to properly handle touch events
    container.addEventListener('touchstart', handleTouchStart, { passive: false, capture: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: false, capture: true });
    container.addEventListener('touchend', handleTouchEnd, { passive: false, capture: true });
    container.addEventListener('touchcancel', handleTouchEnd, { passive: false, capture: true });

    return () => {
      container.removeEventListener('touchstart', handleTouchStart, { capture: true });
      container.removeEventListener('touchmove', handleTouchMove, { capture: true });
      container.removeEventListener('touchend', handleTouchEnd, { capture: true });
      container.removeEventListener('touchcancel', handleTouchEnd, { capture: true });
    };
  }, []);

  // Reset button position
  const resetButtonStyle: React.CSSProperties = {
    position: 'absolute',
    left: width / 2,
    top: height - margins.bottom - 60,
    transform: 'translate(-50%, -50%)',
    width: 28,
    height: 28,
    borderRadius: '50%',
    backgroundColor: 'rgba(60, 60, 70, 0.85)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    opacity: showResetButton ? 1 : 0,
    transition: 'opacity 0.2s ease-in-out',
    pointerEvents: showResetButton ? 'auto' : 'none',
    border: 'none',
    outline: 'none',
  };

  // Compute main pane dimensions for Konva overlay using actual pane layout
  // Not memoized because it depends on renderer which is a ref
  const computeMainPaneBounds = () => {
    const renderer = rendererRef.current;
    if (!renderer) {
      // Fallback when renderer not ready
      return { top: margins.top, height: height - margins.top - margins.bottom };
    }

    // Get the unified layout (prefer direct, fall back to legacy conversion)
    const layout: UnifiedPaneLayout =
      unifiedPaneLayout ||
      (paneLayout
        ? {
            panes: [
              {
                id: 'main',
                type: 'main' as const,
                heightRatio: 1 - (paneLayout.indicatorPanes?.reduce((sum, p) => sum + p.heightRatio, 0) || 0),
                yMin: 0,
                yMax: 1,
                fixedRange: false,
              },
              ...(paneLayout.indicatorPanes?.map((p) => ({
                id: p.id,
                type: 'indicator' as const,
                heightRatio: p.heightRatio,
                yMin: p.yMin ?? 0,
                yMax: p.yMax ?? 1,
                fixedRange: false,
              })) || []),
            ],
            timeAxisHeight: margins.bottom,
          }
        : {
            panes: [{ id: 'main', type: 'main' as const, heightRatio: 1, yMin: 0, yMax: 1, fixedRange: false }],
            timeAxisHeight: margins.bottom,
          });

    const computedPanes = renderer.computePanesLayout(layout, height);
    const mainPane = computedPanes[0]; // First pane is always the main pane

    return { top: mainPane?.top ?? margins.top, height: mainPane?.height ?? height - margins.top - margins.bottom };
  };

  const mainPaneBounds = computeMainPaneBounds();

  // Filter label bounds for order/position lines only (interactive elements)
  // Stage now covers full chart height, so no Y offset adjustment needed
  // Computed directly (not memoized) for immediate updates during drag
  // labelBoundsVersion is used to trigger re-render when ref updates
  void labelBoundsVersion; // Reference to trigger re-render
  void _pendingOrdersVersion; // Reference to trigger re-render on pending state change
  // Include order, position, crosshair, and high-speed lines in Konva layer
  // PriceLineLayer handles z-ordering: non-floating render first, floating (crosshair) renders on top
  // Hide crosshair when hovering over interactive elements (order/position labels)
  // Lines with renderLineOnCanvas only have their LABEL in Konva (line drawn on canvas for sync)
  const konvaLabelBounds = labelBoundsRef.current
    .filter(
      (b) =>
        b.type === 'order' ||
        b.type === 'position' ||
        (b.type === 'crosshair' && !isOverKonvaElementRef.current) ||
        b.renderLineOnCanvas,
    )
    .map((b) => {
      // For orders with pending updates, override Y position to prevent snap-back
      // This handles the case where RAF hasn't run yet to update labelBoundsRef
      const pending = b.type === 'order' ? pendingOrdersRef.current.get(b.lineId) : undefined;
      if (pending) {
        const pendingY = priceToY(pending.pendingPrice);
        return {
          ...b,
          price: pending.pendingPrice,
          adjustedY: pendingY,
        };
      }
      return b; // No adjustment needed - Stage covers full chart height
    });

  // Check if we should render the Konva layer (for order/position/crosshair lines)
  const hasKonvaElements = konvaLabelBounds.length > 0;

  // Check if crosshair is on main pane (for showing + button and context menu)
  const crosshairBound = konvaLabelBounds.find((b) => b.type === 'crosshair');
  const isCrosshairOnMainPane = !crosshairBound?.targetPaneId || crosshairBound.targetPaneId === 'main';

  return (
    <div
      ref={containerRef}
      style={{ position: 'relative', width, height, cursor, touchAction: 'none' }}
      // Use capture phase handlers to catch events before Konva's canvas intercepts them
      // Touch events use native listeners (via useEffect) for passive: false support
      onMouseDownCapture={handleMouseDown}
      onMouseMoveCapture={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onContextMenuCapture={handleContextMenu}
    >
      <canvas
        ref={canvasRef}
        style={{
          display: 'block',
        }}
      />
      {/* Interactive line labels rendered by ChartCore's InteractiveLineRenderer (HTML overlays) */}
      <button
        ref={resetButtonRef}
        style={resetButtonStyle}
        onClick={resetViewport}
        onMouseEnter={() => setShowResetButton(true)}
        title="Reset view"
      >
        <RotateIcon style={{ color: 'rgba(255, 255, 255, 0.8)' }} />
      </button>
      {/* Context menu overlay */}
      {contextMenuState.visible && (
        <ContextMenu
          items={contextMenuState.items}
          x={contextMenuState.x}
          y={contextMenuState.y}
          onClose={closeContextMenu}
          containerBottom={canvasRef.current?.getBoundingClientRect().bottom}
        />
      )}
    </div>
  );
};

Tealchart.displayName = 'Tealchart';
