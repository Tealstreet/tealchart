/**
 * ChartCore - Vanilla JS chart orchestration
 *
 * Combines:
 * - TealchartRenderer (canvas rendering)
 * - EventManager (mouse/touch/keyboard interactions)
 * - PriceLineManager (Konva layer for interactive order/position lines)
 * - ContextMenu
 *
 * This is the vanilla equivalent of Tealchart.tsx
 */

import type { PlotOutput } from '@tealstreet/tealscript';
import type { CrosshairState as EventCrosshairState, PaneDividerInfo } from '../interaction/EventManager';
import type { CrosshairState as PriceLineCrosshairState } from '../interaction/PriceLineManager';
import type { PlotStyleOverride } from '../state/chartState';

import Konva from 'konva';

import { EventManager } from '../interaction/EventManager';
import { PriceLineManager } from '../interaction/PriceLineManager';
import { WebCanvasContext } from '../rendering/WebCanvasContext';
import { getDecimalPlacesFromPrecision } from '../state/chartState';
import { TealchartRenderer } from '../TealchartRenderer';
import {
  Bar,
  ChartLineLabel,
  ChartMargins,
  ChartPane,
  ContextMenuItem,
  DEFAULT_MARGINS,
  OrderLineRenderData,
  PaneLayout,
  PendingOrderUpdate,
  PositionLineRenderData,
  PRICE_AXIS_RIGHT_PADDING,
  PriceLine,
  PriceLineLabelBounds,
  RenderOptions,
  UnifiedPaneLayout,
  Viewport,
} from '../types';
import { button, div, icons } from './dom';

// ============================================================================
// Types
// ============================================================================

export interface IndicatorPaneInfo {
  overlay: boolean;
  yAxisRange?: { min: number; max: number };
  name?: string;
  inputs?: Record<string, unknown>;
}

export interface ChartCoreOptions {
  /** Container element */
  container: HTMLElement;
  /** Initial width */
  width: number;
  /** Initial height */
  height: number;
  /** Render options for colors and styling */
  renderOptions?: Partial<RenderOptions>;
  /** Custom margins */
  margins?: Partial<ChartMargins>;
  /** Callback when viewport changes */
  onViewportChange?: (viewport: Viewport) => void;
  /** Callback when more historical bars needed */
  onRequestMoreBars?: (direction: 'left' | 'right') => void;
  /** Callback when order is moved via drag */
  onOrderMove?: (orderId: string, newPrice: number) => void;
  /** Callback when order cancel button clicked */
  onOrderCancel?: (orderId: string) => void;
  /** Callback when position close button clicked */
  onPositionClose?: (positionId: string) => void;
  /** Callback when position reverse button clicked */
  onPositionReverse?: (positionId: string) => void;
  /** Callback when TP drag ends */
  onTPDragEnd?: (positionId: string, price: number, partialPercent?: number) => void;
  /** Callback when SL drag ends */
  onSLDragEnd?: (positionId: string, price: number, partialPercent?: number) => void;
  /** Callback when TP clicked */
  onTPClick?: (positionId: string) => void;
  /** Callback when SL clicked */
  onSLClick?: (positionId: string) => void;
  /** Context menu callback */
  onContextMenu?: (unixTime: number, price: number) => ContextMenuItem[];
  /** Mouse down callback */
  onMouseDown?: () => void;
  /** Mouse up callback */
  onMouseUp?: () => void;
  /** Crosshair moved callback */
  onCrossHairMoved?: (price: number, time: number) => void;
  /** Called when pane heights change via divider drag */
  onPaneHeightsChange?: (heights: { paneId: string; heightRatio: number }[]) => void;
}

// ============================================================================
// Constants
// ============================================================================

const RESET_BUTTON_AUTO_HIDE_DELAY = 3000;

// ============================================================================
// Helper Functions
// ============================================================================

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
  const mainRatio = paneLayout.mainPaneHeight + paneLayout.volumePaneHeight;
  panes.push({
    id: 'main',
    type: 'main',
    heightRatio: mainRatio,
    yMin: 0,
    yMax: 0,
    fixedRange: false,
  });

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

/**
 * Cache NumberFormat instances by decimals
 */
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
 * Convert OrderLineRenderData to PriceLine
 */
function orderLineToPriceLine(order: OrderLineRenderData, formatPrice: (price: number) => string): PriceLine {
  const lineStyleMap: Record<number, 'solid' | 'dashed' | 'dotted'> = {
    0: 'solid',
    1: 'dotted',
    2: 'dashed',
    3: 'dashed',
    4: 'dotted',
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
    priority: 50,
    draggable: order.editable,
    label: {
      primaryText: formatPrice(order.price),
      backgroundColor: order.bodyBackgroundColor,
      textColor: order.bodyTextColor,
    },
    chartLabel,
  };
}

/**
 * Convert PositionLineRenderData to PriceLine
 */
function positionLineToPriceLine(position: PositionLineRenderData, formatPrice: (price: number) => string): PriceLine {
  const lineStyleMap: Record<number, 'solid' | 'dashed' | 'dotted'> = {
    0: 'solid',
    1: 'dotted',
    2: 'dashed',
    3: 'dashed',
    4: 'dotted',
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
      ...(position.brackets !== null
        ? [
            {
              type: 'tp' as const,
              icon: 'TP',
              backgroundColor: position.bodyBackgroundColor,
              iconColor: '#22c55e',
              borderColor: '#22c55e',
              tooltip: 'Drag to set Take Profit',
            },
          ]
        : []),
      ...(position.brackets !== null
        ? [
            {
              type: 'sl' as const,
              icon: 'SL',
              backgroundColor: position.bodyBackgroundColor,
              iconColor: '#f97316',
              borderColor: '#f97316',
              tooltip: 'Drag to set Stop Loss',
            },
          ]
        : []),
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
    priority: 75,
    draggable: false,
    label: {
      primaryText: formatPrice(position.price),
      backgroundColor: position.bodyBackgroundColor,
      textColor: position.bodyTextColor,
    },
    chartLabel,
    positionId: position.positionId,
    partialEnabled: position.partialEnabled,
    positionData: position.positionData ?? undefined,
    brackets: position.brackets,
  };
}

/**
 * Generate bracket lines (TP/SL) for a position
 */
function positionToBracketLines(position: PositionLineRenderData, formatPrice: (price: number) => string): PriceLine[] {
  const bracketLines: PriceLine[] = [];
  const brackets = position.brackets;

  if (!brackets) return bracketLines;

  if (brackets.takeProfit !== undefined && brackets.takeProfit > 0) {
    bracketLines.push({
      id: `${position.id}-tp`,
      price: brackets.takeProfit,
      lineStyle: 'dashed',
      color: '#22c55e',
      type: 'price',
      lineLength: 100,
      extendLeft: true,
      lineWidth: 1,
      priority: 70,
      label: {
        primaryText: formatPrice(brackets.takeProfit),
        secondaryText: 'TP',
        backgroundColor: '#22c55e',
        textColor: '#ffffff',
      },
    });
  }

  if (brackets.stopLoss !== undefined && brackets.stopLoss > 0) {
    bracketLines.push({
      id: `${position.id}-sl`,
      price: brackets.stopLoss,
      lineStyle: 'dashed',
      color: '#f97316',
      type: 'price',
      lineLength: 100,
      extendLeft: true,
      lineWidth: 1,
      priority: 70,
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

// ============================================================================
// ChartCore Class
// ============================================================================

export class ChartCore {
  private options: ChartCoreOptions;
  private margins: ChartMargins;

  // DOM elements
  private container: HTMLElement;
  private chartContainer: HTMLDivElement;
  private canvas: HTMLCanvasElement;
  private resetButton: HTMLButtonElement | null = null;
  private resetButtonHoverZone: HTMLDivElement | null = null;
  private contextMenu: HTMLDivElement | null = null;
  private contextMenuPlusButton: HTMLDivElement | null = null;

  // Core components
  private renderer: TealchartRenderer;
  private eventManager: EventManager;
  private priceLineManager: PriceLineManager | null = null;

  // Konva
  private stage: Konva.Stage | null = null;
  private layer: Konva.Layer | null = null;

  // Data refs
  private bars: Bar[] = [];
  private viewport: Viewport | null = null;
  private priceLines: PriceLine[] = [];
  private orderLines: OrderLineRenderData[] = [];
  private positionLines: PositionLineRenderData[] = [];
  private plots: PlotOutput[] = [];
  private paneLayout: PaneLayout | undefined;
  private unifiedPaneLayout: UnifiedPaneLayout | undefined;
  private indicatorPaneInfo: Record<string, IndicatorPaneInfo> = {};
  private plotStyleOverrides: Map<string, PlotStyleOverride> = new Map();

  // State
  private pendingOrders = new Map<string, PendingOrderUpdate>();
  private paneYOverrides = new Map<string, { yMin: number; yMax: number }>();
  private paneHeightOverrides = new Map<string, number>();
  private crosshair: EventCrosshairState = { visible: false, x: 0, y: 0 };
  private showResetButton = false;
  private resetButtonTimer: ReturnType<typeof setTimeout> | null = null;
  private cursor = 'crosshair';

  // Label bounds dirty checking (React pattern from Tealchart.tsx:696-727)
  private lastBoundsKey = '';
  private lastBoundsUpdate = 0;
  private labelBoundsCache: PriceLineLabelBounds[] = [];

  // RAF
  private rafId: number | null = null;

  constructor(options: ChartCoreOptions) {
    this.options = options;
    this.container = options.container;
    this.margins = { ...DEFAULT_MARGINS, ...options.margins };

    // Create chart container
    this.chartContainer = div({
      style: {
        position: 'relative',
        width: `${options.width}px`,
        height: `${options.height}px`,
        overflow: 'hidden',
      },
    });
    this.container.appendChild(this.chartContainer);

    // Create canvas
    this.canvas = document.createElement('canvas');
    this.canvas.style.display = 'block';
    this.chartContainer.appendChild(this.canvas);

    // Set initial canvas size
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = options.width * dpr;
    this.canvas.height = options.height * dpr;
    this.canvas.style.width = `${options.width}px`;
    this.canvas.style.height = `${options.height}px`;

    // Get 2D context
    const nativeCtx = this.canvas.getContext('2d');
    if (!nativeCtx) {
      throw new Error('Failed to get 2D canvas context');
    }
    nativeCtx.scale(dpr, dpr);

    // Wrap in CanvasContext abstraction (enables Skia implementation for React Native)
    const ctx = new WebCanvasContext(nativeCtx);

    // Initialize renderer
    this.renderer = new TealchartRenderer(
      ctx,
      {
        ...options.renderOptions,
        width: options.width,
        height: options.height,
      },
      this.margins,
    );

    // Initialize Konva stage and layer
    this.initKonva();

    // Create context menu "+" button (HTML overlay — not Konva, for reliable clicks)
    this.initContextMenuPlusButton();

    // Initialize event manager
    this.eventManager = new EventManager(this.chartContainer, {
      getViewport: () => this.viewport ?? TealchartRenderer.calculateViewport(this.bars),
      getDimensions: () => ({
        width: this.options.width,
        height: this.options.height,
        priceAxisWidth: this.margins.right,
        timeAxisHeight: this.margins.bottom,
        topMargin: this.margins.top,
        leftMargin: this.margins.left,
      }),
      getPriceFromY: (y) =>
        this.renderer.publicYToPriceWithLayout(
          y,
          this.viewport ?? TealchartRenderer.calculateViewport(this.bars),
          this.getUnifiedLayout(),
        ),
      getTimeFromX: (x) =>
        this.renderer.publicXToTime(x, this.viewport ?? TealchartRenderer.calculateViewport(this.bars)),
      getPaneAtY: (y) => this.getPaneAtY(y),
      getDividerAtY: (y) => this.getDividerAtY(y),
      onPaneHeightsChange: (heights) => {
        for (const { paneId, heightRatio } of heights) {
          this.paneHeightOverrides.set(paneId, heightRatio);
        }
        this.options.onPaneHeightsChange?.(heights);
        this.scheduleRender();
      },
      isOverInteractiveElement: (x, y) => this.isOverInteractiveElement(x, y),
      onViewportChange: (vp) => {
        this.viewport = vp;
        this.options.onViewportChange?.(vp);
        this.scheduleRender();
      },
      onViewportChangeInternal: (vp) => {
        // Internal update during drag - no external callback to avoid parent re-renders
        this.viewport = vp;
        this.scheduleRender();
      },
      onPaneYRangeChange: (paneId, yMin, yMax) => {
        this.paneYOverrides.set(paneId, { yMin, yMax });
        this.scheduleRender();
      },
      onRequestMoreBars: (dir) => {
        // Only request more bars if viewport is actually before the earliest bar
        // This matches React's behavior - prevents loading history on every left pan
        if (dir === 'left' && this.bars.length > 0 && this.viewport) {
          if (this.viewport.startTime < this.bars[0].time) {
            this.options.onRequestMoreBars?.(dir);
          }
        } else {
          this.options.onRequestMoreBars?.(dir);
        }
      },
      onCrossHairMoved: (x, y) => {
        this.crosshair = { visible: true, x, y };
        const price = this.renderer.publicYToPriceWithLayout(
          y,
          this.viewport ?? TealchartRenderer.calculateViewport(this.bars),
          this.getUnifiedLayout(),
        );
        const time = this.renderer.publicXToTime(x, this.viewport ?? TealchartRenderer.calculateViewport(this.bars));
        this.options.onCrossHairMoved?.(price, time);
        this.updateContextMenuPlusButton(y, true);
        this.scheduleRender();
      },
      onCrossHairVisibilityChange: (visible) => {
        this.crosshair = { ...this.crosshair, visible };
        this.updateContextMenuPlusButton(this.crosshair.y, visible);
        this.scheduleRender();
      },
      onMouseDown: () => this.options.onMouseDown?.(),
      onMouseUp: () => this.options.onMouseUp?.(),
      onContextMenu: (x, y, price, time) => this.handleContextMenu(x, y, price, time),
      onRender: () => this.scheduleRender(),
      onCursorChange: (cursor) => {
        this.cursor = cursor;
        this.chartContainer.style.cursor = cursor;
        if (this.stage) {
          this.stage.container().style.cursor = cursor;
        }
      },
    });

    // Create reset button
    this.createResetButton();

    // Set cursor style
    this.chartContainer.style.cursor = this.cursor;
  }

  // ============================================================================
  // Public API
  // ============================================================================

  /**
   * Set bar data
   * Uses reference equality check - bars array is always new when data changes
   */
  setBars(bars: Bar[]): void {
    // Reference check — skip if same array (real-time ticks use updateBar instead)
    if (bars === this.bars) return;

    this.bars = bars;
    if (bars.length > 0 && !this.viewport) {
      this.viewport = TealchartRenderer.calculateViewport(bars);
    }
    this.scheduleRender();
  }

  /**
   * Update a single bar (real-time)
   */
  updateBar(bar: Bar): void {
    if (this.bars.length === 0) {
      this.bars.push(bar);
    } else {
      const lastBar = this.bars[this.bars.length - 1];
      if (bar.time === lastBar.time) {
        this.bars[this.bars.length - 1] = bar;
      } else if (bar.time > lastBar.time) {
        this.bars.push(bar);
      }
    }
    this.scheduleRender();
  }

  /**
   * Set viewport
   */
  setViewport(viewport: Viewport): void {
    this.viewport = viewport;
    this.scheduleRender();
  }

  /**
   * Set price lines
   */
  setPriceLines(lines: PriceLine[]): void {
    this.priceLines = lines;
    this.scheduleRender();
  }

  /**
   * Set order lines
   * Reference equality check - skip if same array (like React refs)
   * Skips updates during drag since orders don't change while dragging chart
   */
  setOrderLines(lines: OrderLineRenderData[]): void {
    if (this.eventManager.getIsDragging()) return;
    if (lines === this.orderLines) return;
    this.orderLines = lines;
    this.cleanupPendingOrders();
    this.scheduleRender();
  }

  /**
   * Set position lines
   * Reference equality check - skip if same array
   * Skips updates during drag since positions don't change while dragging chart
   */
  setPositionLines(lines: PositionLineRenderData[]): void {
    if (this.eventManager.getIsDragging()) return;
    if (lines === this.positionLines) return;
    this.positionLines = lines;
    this.scheduleRender();
  }

  /**
   * Set indicator plots
   * Reference equality check - skip if same array
   */
  setPlots(plots: PlotOutput[]): void {
    if (plots === this.plots) return;
    this.plots = plots;
    this.scheduleRender();
  }

  /**
   * Set pane layout
   */
  setPaneLayout(layout: PaneLayout): void {
    this.paneLayout = layout;
    this.scheduleRender();
  }

  /**
   * Set unified pane layout
   */
  setUnifiedPaneLayout(layout: UnifiedPaneLayout): void {
    this.unifiedPaneLayout = layout;
    this.scheduleRender();
  }

  /**
   * Set indicator pane info
   */
  setIndicatorPaneInfo(info: Record<string, IndicatorPaneInfo>): void {
    this.indicatorPaneInfo = info;
    this.scheduleRender();
  }

  /**
   * Set plot style overrides
   */
  setPlotStyleOverrides(overrides: Map<string, PlotStyleOverride>): void {
    this.plotStyleOverrides = overrides;
    this.scheduleRender();
  }

  /**
   * Update render options (colors, styles)
   */
  setRenderOptions(options: Partial<RenderOptions>): void {
    this.options.renderOptions = { ...this.options.renderOptions, ...options };
    this.renderer.setOptions(options);
    this.scheduleRender();
  }

  /**
   * Resize the chart
   */
  resize(width: number, height: number): void {
    this.options.width = width;
    this.options.height = height;
    this.chartContainer.style.width = `${width}px`;
    this.chartContainer.style.height = `${height}px`;

    // Resize canvas
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = width * dpr;
    this.canvas.height = height * dpr;
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;

    // Reset context scale
    const ctx = this.canvas.getContext('2d');
    if (ctx) {
      ctx.scale(dpr, dpr);
    }

    // Update renderer options
    this.renderer.setOptions({
      width,
      height,
    });

    if (this.stage) {
      this.stage.width(width);
      this.stage.height(height);
    }

    if (this.priceLineManager) {
      this.priceLineManager.setDimensions(width, height, this.margins);
    }

    // Update reset button position
    this.updateResetButtonPosition();

    this.scheduleRender();
  }

  /**
   * Reset viewport to auto-scale
   */
  resetViewport(): void {
    this.viewport = TealchartRenderer.calculateViewport(this.bars);
    this.paneYOverrides.clear();
    this.paneHeightOverrides.clear();
    this.options.onViewportChange?.(this.viewport);
    this.scheduleRender();
  }

  /**
   * Set pane heights (for loading persisted values)
   */
  setPaneHeights(heights: { paneId: string; heightRatio: number }[]): void {
    for (const { paneId, heightRatio } of heights) {
      this.paneHeightOverrides.set(paneId, heightRatio);
    }
    this.scheduleRender();
  }

  /**
   * Get current pane heights
   */
  getPaneHeights(): { paneId: string; heightRatio: number }[] {
    const layout = this.getUnifiedLayout();
    return layout.panes.map((pane) => ({
      paneId: pane.id,
      heightRatio: pane.heightRatio,
    }));
  }

  /**
   * Get current bars
   */
  getBars(): Bar[] {
    return this.bars;
  }

  /**
   * Get current viewport
   */
  getViewport(): Viewport | null {
    return this.viewport;
  }

  /**
   * Get renderer for advanced access
   */
  getRenderer(): TealchartRenderer {
    return this.renderer;
  }

  /**
   * Dispose and clean up
   */
  dispose(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
    }
    if (this.resetButtonTimer) {
      clearTimeout(this.resetButtonTimer);
    }
    this.eventManager.dispose();
    this.priceLineManager?.dispose();
    this.stage?.destroy();
    this.chartContainer.remove();
  }

  // ============================================================================
  // Private: Konva Setup
  // ============================================================================

  private initKonva(): void {
    // Create Konva container
    const konvaContainer = div({
      style: {
        position: 'absolute',
        top: '0',
        left: '0',
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
      },
    });
    this.chartContainer.appendChild(konvaContainer);

    // Create stage
    this.stage = new Konva.Stage({
      container: konvaContainer,
      width: this.options.width,
      height: this.options.height,
    });

    // Enable pointer events on stage container for interactions
    const stageContainer = this.stage.container();
    stageContainer.style.pointerEvents = 'auto';
    // Set initial cursor
    stageContainer.style.cursor = 'crosshair';

    // Create layer
    this.layer = new Konva.Layer();
    this.stage.add(this.layer);

    // Create PriceLineManager
    this.priceLineManager = new PriceLineManager({
      layer: this.layer,
      width: this.options.width,
      height: this.options.height,
      margins: this.margins,
      yToPrice: (y) =>
        this.renderer.publicYToPriceWithLayout(
          y,
          this.viewport ?? TealchartRenderer.calculateViewport(this.bars),
          this.getUnifiedLayout(),
        ),
      priceToY: (price) =>
        this.renderer.publicPriceToYWithLayout(
          price,
          this.viewport ?? TealchartRenderer.calculateViewport(this.bars),
          this.getUnifiedLayout(),
        ),
      onOrderMove: (id, price) => this.options.onOrderMove?.(id, price),
      onOrderCancel: (id) => this.options.onOrderCancel?.(id),
      onPositionClose: (id) => this.options.onPositionClose?.(id),
      onPositionReverse: (id) => this.options.onPositionReverse?.(id),
      onTPDragEnd: (id, price, partial) => this.options.onTPDragEnd?.(id, price, partial),
      onSLDragEnd: (id, price, partial) => this.options.onSLDragEnd?.(id, price, partial),
      onTPClick: (id) => this.options.onTPClick?.(id),
      onSLClick: (id) => this.options.onSLClick?.(id),
      onCursorChange: (cursor) => {
        this.cursor = cursor === 'default' ? 'crosshair' : cursor;
        this.chartContainer.style.cursor = this.cursor;
        // Also set on Konva stage container for proper cursor display
        if (this.stage) {
          this.stage.container().style.cursor = this.cursor;
        }
      },
    });
  }

  // ============================================================================
  // Private: Reset Button
  // ============================================================================

  private createResetButton(): void {
    // Circular reset button - matches React version
    this.resetButton = button({
      style: {
        position: 'absolute',
        width: '28px',
        height: '28px',
        borderRadius: '50%',
        backgroundColor: 'rgba(60, 60, 70, 0.85)',
        border: 'none',
        outline: 'none',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: '0',
        transition: 'opacity 0.2s ease-in-out',
        pointerEvents: 'none',
        zIndex: '10',
      },
      attrs: { title: 'Reset view' },
      onClick: () => this.resetViewport(),
      onMouseEnter: () => this.showResetButtonFn(),
      onMouseLeave: () => this.hideResetButtonFn(),
    });

    // Add refresh icon
    this.resetButton.appendChild(icons.refresh(14, '#d1d4dc'));

    this.chartContainer.appendChild(this.resetButton);

    // Create circular hover zone (larger than button for easier targeting)
    this.resetButtonHoverZone = div({
      style: {
        position: 'absolute',
        width: '100px',
        height: '100px',
        borderRadius: '50%',
        zIndex: '1',
        // Debug: uncomment to see hover zone
        // backgroundColor: 'rgba(255, 0, 0, 0.1)',
      },
      onMouseEnter: () => this.showResetButtonFn(),
      onMouseLeave: () => this.hideResetButtonFn(),
    });
    this.chartContainer.appendChild(this.resetButtonHoverZone);

    // Position button and hover zone
    this.updateResetButtonPosition();
  }

  private updateResetButtonPosition(): void {
    const centerX = this.options.width / 2;
    const bottomY = this.options.height - this.margins.bottom - 60;

    if (this.resetButton) {
      this.resetButton.style.left = `${centerX}px`;
      this.resetButton.style.top = `${bottomY}px`;
      this.resetButton.style.transform = 'translate(-50%, -50%)';
    }

    if (this.resetButtonHoverZone) {
      this.resetButtonHoverZone.style.left = `${centerX}px`;
      this.resetButtonHoverZone.style.top = `${bottomY}px`;
      this.resetButtonHoverZone.style.transform = 'translate(-50%, -50%)';
    }
  }

  private showResetButtonFn(): void {
    if (this.resetButton) {
      this.resetButton.style.opacity = '1';
      this.resetButton.style.pointerEvents = 'auto';
      this.showResetButton = true;
    }
  }

  private hideResetButtonFn(): void {
    if (this.resetButton) {
      this.resetButton.style.opacity = '0';
      this.resetButton.style.pointerEvents = 'none';
      this.showResetButton = false;
    }
  }

  // ============================================================================
  // Context Menu + Button
  // ============================================================================

  private initContextMenuPlusButton(): void {
    const btn = div({
      style: {
        position: 'absolute',
        right: `${this.margins.right + 2}px`,
        width: '18px',
        height: '18px',
        borderRadius: '50%',
        border: `1px solid ${this.options.renderOptions?.crosshairColor || '#787b86'}`,
        display: 'none',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        zIndex: '5',
        fontSize: '14px',
        lineHeight: '1',
        color: this.options.renderOptions?.crosshairColor || '#787b86',
        userSelect: 'none',
        pointerEvents: 'auto',
      },
      text: '+',
      onClick: (e) => {
        e.stopPropagation();
        const y = this.crosshair.y;
        const price = this.renderer.publicYToPriceWithLayout(
          y,
          this.viewport ?? TealchartRenderer.calculateViewport(this.bars),
          this.getUnifiedLayout(),
        );
        const time = this.renderer.publicXToTime(
          this.crosshair.x,
          this.viewport ?? TealchartRenderer.calculateViewport(this.bars),
        );
        const rect = this.chartContainer.getBoundingClientRect();
        this.handleContextMenu(rect.right - this.margins.right, rect.top + y, price, time);
      },
    });

    btn.addEventListener('mouseenter', () => {
      btn.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
    });
    btn.addEventListener('mouseleave', () => {
      btn.style.backgroundColor = 'transparent';
    });

    this.contextMenuPlusButton = btn;
    this.chartContainer.appendChild(btn);
  }

  private updateContextMenuPlusButton(y: number, visible: boolean): void {
    if (!this.contextMenuPlusButton) return;
    if (visible && this.options.onContextMenu) {
      this.contextMenuPlusButton.style.display = 'flex';
      this.contextMenuPlusButton.style.top = `${y - 9}px`;
    } else {
      this.contextMenuPlusButton.style.display = 'none';
    }
  }

  setContextMenuCallback(callback: (unixTime: number, price: number) => ContextMenuItem[]): void {
    this.options.onContextMenu = callback;
  }

  private handleContextMenu(screenX: number, screenY: number, price: number, time: number): void {
    if (!this.options.onContextMenu) return;

    const items = this.options.onContextMenu(time, price);
    if (items.length === 0) return;

    // Remove existing menu
    this.contextMenu?.remove();

    // Create menu
    this.contextMenu = div({
      style: {
        position: 'fixed',
        left: `${screenX}px`,
        top: `${screenY}px`,
        backgroundColor: '#1e222d',
        border: '1px solid #363a45',
        borderRadius: '4px',
        padding: '4px 0',
        zIndex: '1000',
        minWidth: '150px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
      },
    });

    for (const item of items) {
      const menuItem = div({
        style: {
          padding: '8px 12px',
          fontSize: '12px',
          color: '#d1d4dc',
          cursor: 'pointer',
        },
        text: item.text,
        onClick: () => {
          item.click();
          this.contextMenu?.remove();
          this.contextMenu = null;
        },
        onMouseEnter: (e) => {
          (e.target as HTMLElement).style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
        },
        onMouseLeave: (e) => {
          (e.target as HTMLElement).style.backgroundColor = 'transparent';
        },
      });
      this.contextMenu.appendChild(menuItem);
    }

    document.body.appendChild(this.contextMenu);

    // Close on click outside
    const closeMenu = (e: MouseEvent) => {
      if (this.contextMenu && !this.contextMenu.contains(e.target as Node)) {
        this.contextMenu.remove();
        this.contextMenu = null;
        document.removeEventListener('click', closeMenu);
      }
    };
    setTimeout(() => document.addEventListener('click', closeMenu), 0);
  }

  // ============================================================================
  // Private: Helpers
  // ============================================================================

  private getUnifiedLayout(): UnifiedPaneLayout {
    const baseLayout = this.unifiedPaneLayout || convertToUnifiedLayout(this.paneLayout);

    // Apply user Y-axis overrides and height overrides
    // Renderer handles auto-scaling for indicator panes without overrides
    return {
      ...baseLayout,
      panes: baseLayout.panes.map((pane) => {
        const yOverride = this.paneYOverrides.get(pane.id);
        const heightOverride = this.paneHeightOverrides.get(pane.id);

        return {
          ...pane,
          ...(yOverride ? { yMin: yOverride.yMin, yMax: yOverride.yMax, fixedRange: true } : {}),
          ...(heightOverride !== undefined ? { heightRatio: heightOverride } : {}),
        };
      }),
    };
  }

  private getPaneAtY(y: number): { paneId: string; yMin: number; yMax: number; paneHeight: number } | null {
    const layout = this.getUnifiedLayout();
    const timeAxisHeight = layout.timeAxisHeight;
    const topMargin = this.margins.top;
    const availableHeight = this.options.height - timeAxisHeight - topMargin;

    let currentTop = topMargin;
    for (const pane of layout.panes) {
      const paneHeight = availableHeight * pane.heightRatio;
      const paneBottom = currentTop + paneHeight;

      if (y >= currentTop && y < paneBottom) {
        let yMin = pane.yMin;
        let yMax = pane.yMax;

        // For main pane without override, use viewport prices
        if (pane.type === 'main' && !pane.fixedRange && this.viewport) {
          yMin = this.viewport.priceMin;
          yMax = this.viewport.priceMax;
        }

        return { paneId: pane.id, yMin, yMax, paneHeight };
      }

      currentTop = paneBottom;
    }

    return null;
  }

  private getDividerAtY(y: number): PaneDividerInfo | null {
    const layout = this.getUnifiedLayout();
    const panes = layout.panes;

    // Need at least 2 panes for a divider
    if (panes.length < 2) return null;

    const timeAxisHeight = layout.timeAxisHeight;
    const topMargin = this.margins.top;
    const availableHeight = this.options.height - timeAxisHeight - topMargin;

    const DIVIDER_HIT_ZONE = 6; // Pixels around divider that count as "over divider"

    let currentTop = topMargin;
    for (let i = 0; i < panes.length - 1; i++) {
      const pane = panes[i];
      const nextPane = panes[i + 1];
      const paneHeight = availableHeight * pane.heightRatio;
      const dividerY = currentTop + paneHeight;

      // Check if y is within hit zone of this divider
      if (Math.abs(y - dividerY) <= DIVIDER_HIT_ZONE) {
        return {
          dividerIndex: i,
          y: dividerY,
          paneAboveId: pane.id,
          paneBelowId: nextPane.id,
          paneAboveRatio: pane.heightRatio,
          paneBelowRatio: nextPane.heightRatio,
        };
      }

      currentTop += paneHeight;
    }

    return null;
  }

  private isOverInteractiveElement(x: number, y: number): boolean {
    if (!this.stage) return false;

    const hit = this.stage.getIntersection({ x, y });
    return hit !== null && hit.listening();
  }

  private cleanupPendingOrders(): void {
    // Remove pending orders that no longer exist in orderLines
    // Simple O(n*m) but both n and m are typically small (<10 orders)
    for (const [id, pending] of this.pendingOrders) {
      const exists = this.orderLines.some((o) => o.id === id);
      if (!exists) {
        clearTimeout(pending.timeoutId);
        this.pendingOrders.delete(id);
      }
    }
  }

  // ============================================================================
  // Private: Render
  // ============================================================================

  private scheduleRender(): void {
    if (this.rafId !== null) return; // Already scheduled — coalesce

    this.rafId = requestAnimationFrame(() => {
      this.rafId = null;
      this.render();
    });
  }

  private render(): void {
    if (this.bars.length === 0 || !this.viewport) return;

    const vp = this.viewport;
    const layout = this.getUnifiedLayout();

    // Create price formatter
    let decimals: number;
    const pricePrecision = this.options.renderOptions?.pricePrecision;
    if (pricePrecision && pricePrecision > 0) {
      decimals = getDecimalPlacesFromPrecision(pricePrecision);
    } else {
      const priceRange = vp.priceMax - vp.priceMin;
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

    // Get latest bar for last-trade line
    const latestBar = this.bars.length > 0 ? this.bars[this.bars.length - 1] : null;

    // Build all price lines
    const allPriceLines: PriceLine[] = [
      ...this.priceLines.map((p) => {
        if (p.renderLineOnCanvas && p.id === 'last-trade' && latestBar) {
          const isUp = latestBar.close >= latestBar.open;
          return {
            ...p,
            price: latestBar.close,
            color: isUp
              ? this.renderer.getOptions()?.upColor || '#26a69a'
              : this.renderer.getOptions()?.downColor || '#ef5350',
            label: {
              ...p.label,
              primaryText: formatPrice(latestBar.close),
            },
            priority: p.priority ?? 100,
          };
        }
        return { ...p, priority: p.priority ?? 100 };
      }),
      ...this.orderLines.map((o) => {
        const pending = this.pendingOrders.get(o.id);
        if (pending) {
          return orderLineToPriceLine({ ...o, price: pending.pendingPrice }, formatPrice);
        }
        return orderLineToPriceLine(o, formatPrice);
      }),
      ...this.positionLines.map((p) => positionLineToPriceLine(p, formatPrice)),
      ...this.positionLines.flatMap((p) => positionToBracketLines(p, formatPrice)),
    ];

    // Filter canvas-only price lines (order/position handled by Konva)
    const canvasPriceLines = allPriceLines.filter((line) => line.type !== 'order' && line.type !== 'position');

    // Render canvas
    const crosshairColor = this.options.renderOptions?.crosshairColor || '#888888';
    const crosshairState = {
      visible: this.crosshair.visible,
      x: this.crosshair.x,
      y: this.crosshair.y,
      price: 0,
      time: 0,
      paneId: null,
      paneValue: null,
    };

    this.renderer.renderWithLayout(
      this.bars,
      vp,
      layout,
      canvasPriceLines,
      this.plots,
      this.indicatorPaneInfo,
      crosshairState,
      this.plotStyleOverrides,
    );

    this.renderer.drawCrosshair(crosshairState, vp, layout);

    // Compute label bounds for Konva layer (with dirty checking)
    // React pattern from Tealchart.tsx:696-727: only recompute when key changes or throttled during drag
    const linePrices = allPriceLines.map((l) => l.price.toFixed(6)).join(',');
    const boundsKey = `${vp.priceMin.toFixed(4)},${vp.priceMax.toFixed(4)}|${linePrices}|${this.crosshair.visible}|${Math.round(this.crosshair.y)}`;
    const now = Date.now();
    const keyChanged = boundsKey !== this.lastBoundsKey;
    const isDragging = this.eventManager.getIsDragging();
    const shouldRecompute = keyChanged || (isDragging && now - this.lastBoundsUpdate > 16);

    if (shouldRecompute) {
      this.labelBoundsCache = this.renderer.computePriceLineLabelBoundsWithLayout(
        allPriceLines,
        vp,
        layout,
        this.plots,
        this.crosshair.visible ? { y: this.crosshair.y, visible: true, color: crosshairColor } : undefined,
      );
      this.lastBoundsKey = boundsKey;
      this.lastBoundsUpdate = now;
    }

    // Update PriceLineManager
    const priceLineCrosshair: PriceLineCrosshairState = {
      x: this.crosshair.x,
      y: this.crosshair.y,
      visible: this.crosshair.visible,
      color: crosshairColor,
    };

    this.priceLineManager?.update(this.labelBoundsCache, this.pendingOrders, priceLineCrosshair);
  }
}
