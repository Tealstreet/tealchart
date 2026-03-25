/**
 * ChartCore - Vanilla JS chart orchestration
 *
 * Combines:
 * - TealchartRenderer (canvas rendering)
 * - EventManager (mouse/touch/keyboard interactions)
 * - InteractiveLineRenderer (HTML overlay for order/position labels)
 * - ContextMenu
 *
 * This is the vanilla equivalent of Tealchart.tsx
 */

import type { PlotOutput } from '@tealstreet/tealscript';
import type { CrosshairState as EventCrosshairState, PaneDividerInfo } from '../interaction/EventManager';
import type { DirtyFlags } from '../rendering/RenderScheduler';
import type { PlotStyleOverride } from '../state/chartState';

import { EventManager } from '../interaction/EventManager';
import { InteractiveLineRenderer } from '../interaction/InteractiveLineRenderer';
import { DIRTY } from '../rendering/RenderScheduler';
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
import { applyAutoScale } from '../viewport/viewScale';
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
  /** Called when auto-scale should be disabled (user starts price axis zoom) */
  onAutoScaleDisabled?: (paneId: string) => void;
  /** Called when viewport is reset (re-enables auto-scale) */
  onResetViewport?: () => void;
  /** Returns whether auto-scale is active for a given pane */
  isAutoScale?: (paneId: string) => boolean;
  /** Called on double-click/double-tap on a pane */
  onPaneDoubleClick?: (paneId: string) => void;
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
  private crosshairCanvas: HTMLCanvasElement | null = null;
  private crosshairCtx: CanvasRenderingContext2D | null = null;
  private resetButton: HTMLButtonElement | null = null;
  private resetButtonHoverZone: HTMLDivElement | null = null;
  private contextMenu: HTMLDivElement | null = null;
  // + button drawn on crosshair canvas — hit-test bounds for click detection
  private _plusButtonBounds: { x: number; y: number; r: number } | null = null;
  // Bound handler for + button click — stored so it can be removed on dispose
  private plusButtonClickHandler: (e: MouseEvent) => void;

  // Core components
  private renderer: TealchartRenderer;
  private eventManager: EventManager;
  private interactiveLineRenderer: InteractiveLineRenderer;

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
  /** Auto-scale computed Y ranges from AutoScaleManager (set by TealchartWidget each render) */
  private autoScalePaneYRanges = new Map<string, { yMin: number; yMax: number }>();
  private paneHeightOverrides = new Map<string, number>();
  private crosshair: EventCrosshairState = { visible: false, x: 0, y: 0 };
  private showResetButton = false;
  private resetButtonTimer: ReturnType<typeof setTimeout> | null = null;
  private cursor = 'crosshair';

  // Collision offset cache — keyed by geometry (IDs + prices + viewport).
  // Stores only the de-overlap offset per line, NOT label content.
  // Label content is always built fresh from current line data.
  private collisionOffsetCache = new Map<string, number>();
  private lastCollisionKey = '';
  private lastCollisionUpdate = 0;
  private labelBoundsCache: PriceLineLabelBounds[] = [];

  // RAF for full renders
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

    // Apply render options as CSS variables for HTML overlays
    this.applyCssVars();

    // Create main canvas — set CSS background to match render options to prevent flash before first paint
    this.canvas = document.createElement('canvas');
    this.canvas.style.display = 'block';
    this.canvas.style.backgroundColor = options.renderOptions?.backgroundColor || '#131722';
    this.chartContainer.appendChild(this.canvas);

    // Create crosshair overlay canvas — transparent, same size, on top of main canvas
    this.crosshairCanvas = document.createElement('canvas');
    this.crosshairCanvas.style.position = 'absolute';
    this.crosshairCanvas.style.top = '0';
    this.crosshairCanvas.style.left = '0';
    this.crosshairCanvas.style.pointerEvents = 'none';
    this.crosshairCanvas.style.zIndex = '3'; // Above interactive line labels (z-index: 2)
    this.chartContainer.appendChild(this.crosshairCanvas);

    // Set initial canvas sizes
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = options.width * dpr;
    this.canvas.height = options.height * dpr;
    this.canvas.style.width = `${options.width}px`;
    this.canvas.style.height = `${options.height}px`;

    this.crosshairCanvas.width = options.width * dpr;
    this.crosshairCanvas.height = options.height * dpr;
    this.crosshairCanvas.style.width = `${options.width}px`;
    this.crosshairCanvas.style.height = `${options.height}px`;

    // Get 2D context for main canvas
    const nativeCtx = this.canvas.getContext('2d');
    if (!nativeCtx) {
      throw new Error('Failed to get 2D canvas context');
    }
    nativeCtx.scale(dpr, dpr);

    // Get 2D context for crosshair canvas
    this.crosshairCtx = this.crosshairCanvas.getContext('2d');
    if (this.crosshairCtx) {
      this.crosshairCtx.scale(dpr, dpr);
    }

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

    // Initialize interactive line renderer (HTML overlay for order/position labels)
    this.interactiveLineRenderer = new InteractiveLineRenderer(this.chartContainer, {
      margins: this.margins,
      width: options.width,
      height: options.height,
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
      onOrderMove: (orderId, newPrice) => {
        // Store the original price so we can detect when the server confirms the move
        const originalOrder = this.orderLines.find((o) => o.id === orderId);
        const originalPrice = originalOrder?.price ?? newPrice;
        // Hold the line at the new price until the server confirms (or timeout reverts)
        this.pendingOrders.set(orderId, {
          orderId,
          pendingPrice: newPrice,
          originalPrice,
          startTime: Date.now(),
          timeoutId: setTimeout(() => {
            this.pendingOrders.delete(orderId);
            this.interactiveLineRenderer.forceRebuild();
            this.scheduleRender();
          }, 5000),
        });
        this.options.onOrderMove?.(orderId, newPrice);
      },
      onOrderCancel: (orderId) => this.options.onOrderCancel?.(orderId),
      onPositionClose: (positionId) => this.options.onPositionClose?.(positionId),
      onPositionReverse: (positionId) => this.options.onPositionReverse?.(positionId),
      onTPDragEnd: (positionId, price, partialPercent) => this.options.onTPDragEnd?.(positionId, price, partialPercent),
      onSLDragEnd: (positionId, price, partialPercent) => this.options.onSLDragEnd?.(positionId, price, partialPercent),
      onTPClick: (positionId) => this.options.onTPClick?.(positionId),
      onSLClick: (positionId) => this.options.onSLClick?.(positionId),
      formatPrice: (price) => {
        const pricePrecision = this.options.renderOptions?.pricePrecision;
        let decimals: number;
        if (pricePrecision && pricePrecision > 0) {
          decimals = getDecimalPlacesFromPrecision(pricePrecision);
        } else {
          const priceRange = (this.viewport?.priceMax ?? 0) - (this.viewport?.priceMin ?? 0);
          if (priceRange >= 10) decimals = 0;
          else if (priceRange >= 1) decimals = 1;
          else if (priceRange >= 0.1) decimals = 2;
          else decimals = 4;
        }
        return getNumberFormatter(decimals).format(price);
      },
      onCursorChange: (cursor) => {
        if (this.cursor !== cursor) {
          this.cursor = cursor;
          this.chartContainer.style.cursor = cursor;
        }
      },
    });

    // + button is now drawn on the crosshair canvas (no HTML element needed)

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
      isOverInteractiveElement: (x, y) => {
        // Check + button bounds (canvas-drawn, no DOM element)
        if (this._plusButtonBounds) {
          const b = this._plusButtonBounds;
          const dx = x - b.x;
          const dy = y - b.y;
          if (dx * dx + dy * dy <= b.r * b.r) {
            return true;
          }
        }
        const rect = this.chartContainer.getBoundingClientRect();
        return this.interactiveLineRenderer.isOverInteractiveElement(rect.left + x, rect.top + y);
      },
      onAutoScaleDisabled: (paneId: string) => this.options.onAutoScaleDisabled?.(paneId),
      isAutoScale: (paneId: string) => this.options.isAutoScale?.(paneId) ?? true,
      onViewportChange: (vp) => {
        this.viewport = vp;
        this.options.onViewportChange?.(vp);
        this.scheduleRender();
      },
      onViewportChangeInternal: (vp) => {
        // Internal update during drag - no external callback to avoid parent re-renders
        // Apply auto-scale during drag so price axis fits visible candles in real time
        this.viewport = this.options.isAutoScale?.('main') ? applyAutoScale(vp, this.bars) : vp;
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
      },
      onCrossHairVisibilityChange: (visible) => {
        this.crosshair = { ...this.crosshair, visible };
      },
      onMouseDown: () => this.options.onMouseDown?.(),
      onMouseUp: () => this.options.onMouseUp?.(),
      onContextMenu: (x, y, price, time) => this.handleContextMenu(x, y, price, time),
      onRender: () => this.scheduleRender(),
      onCrosshairRender: () => {
        // Called from within RAF (EventManager defers mousemove to RAF).
        // Render directly — no need to schedule another RAF frame.
        // Price label is drawn on canvas — zero DOM mutations.
        this.renderCrosshairOverlay();
        // Pointer cursor over canvas-drawn + button
        const b = this._plusButtonBounds;
        if (b) {
          const dx = this.crosshair.x - b.x;
          const dy = this.crosshair.y - b.y;
          const overPlus = dx * dx + dy * dy <= b.r * b.r;
          const wantCursor = overPlus ? 'pointer' : 'crosshair';
          if (this.cursor !== wantCursor) {
            this.cursor = wantCursor;
            this.chartContainer.style.cursor = wantCursor;
          }
        }
      },
      onCursorChange: (cursor) => {
        if (this.cursor !== cursor) {
          this.cursor = cursor;
          this.chartContainer.style.cursor = cursor;
        }
      },
      onPaneDoubleClick: (paneId) => this.options.onPaneDoubleClick?.(paneId),
    });

    // Click listener for canvas-drawn + button (stored for cleanup in dispose)
    this.plusButtonClickHandler = (e: MouseEvent) => {
      if (!this._plusButtonBounds || !this.options.onContextMenu) return;
      const rect = this.chartContainer.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const b = this._plusButtonBounds;
      const dx = x - b.x;
      const dy = y - b.y;
      if (dx * dx + dy * dy <= b.r * b.r) {
        e.stopPropagation();
        const price = this.renderer.publicYToPriceWithLayout(
          this.crosshair.y,
          this.viewport ?? TealchartRenderer.calculateViewport(this.bars),
          this.getUnifiedLayout(),
        );
        const time = this.renderer.publicXToTime(
          this.crosshair.x,
          this.viewport ?? TealchartRenderer.calculateViewport(this.bars),
        );
        this.handleContextMenu(rect.right - this.margins.right, rect.top + this.crosshair.y, price, time);
      }
    };
    this.chartContainer.addEventListener('click', this.plusButtonClickHandler);

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
    // No scheduleRender — paint() is called by the widget after pushing state
  }

  /**
   * Update a single bar (real-time) — fast path that mutates + paints directly.
   * Bypasses the widget's render pipeline for low-latency candle updates.
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
    // updateBar is the fast path — schedule an immediate repaint for this bar
    this.scheduleRender();
  }

  /**
   * Set viewport
   */
  setViewport(viewport: Viewport): void {
    this.viewport = viewport;
    // No scheduleRender — paint() is called by the widget after pushing state
  }

  /**
   * Set price lines
   */
  setPriceLines(lines: PriceLine[]): void {
    this.priceLines = lines;
    // No scheduleRender — paint() is called by the widget after pushing state
  }

  /**
   * Set order lines
   * Reference equality check - skip if same array (like React refs)
   * Skips updates during drag since orders don't change while dragging chart
   */
  private lastOrderLinePrices = new Map<string, number>();

  setOrderLines(lines: OrderLineRenderData[]): void {
    if (this.eventManager.getIsDragging() || this.interactiveLineRenderer?.isDragging()) return;
    if (lines === this.orderLines && this.pendingOrders.size === 0) return;

    // Detect which orders had their price changed since last call
    if (this.pendingOrders.size > 0) {
      for (const line of lines) {
        const prevPrice = this.lastOrderLinePrices.get(line.id);
        if (prevPrice !== undefined && prevPrice !== line.price && this.pendingOrders.has(line.id)) {
          // This order's price changed — server confirmed or app reverted
          const pending = this.pendingOrders.get(line.id)!;
          clearTimeout(pending.timeoutId);
          this.pendingOrders.delete(line.id);
          this.interactiveLineRenderer.forceRebuild();
        }
      }
    }

    // Update price tracking
    this.lastOrderLinePrices.clear();
    for (const line of lines) {
      this.lastOrderLinePrices.set(line.id, line.price);
    }

    this.orderLines = lines;
    this.cleanupPendingOrders();
    // No scheduleRender — paint() is called by the widget after pushing state
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
    // No scheduleRender — paint() is called by the widget after pushing state
  }

  /**
   * Set indicator plots
   * Reference equality check - skip if same array
   */
  setPlots(plots: PlotOutput[]): void {
    if (plots === this.plots) return;
    this.plots = plots;
    // No scheduleRender — paint() is called by the widget after pushing state
  }

  /**
   * Set pane layout
   */
  setPaneLayout(layout: PaneLayout): void {
    this.paneLayout = layout;
    // No scheduleRender — paint() is called by the widget after pushing state
  }

  /**
   * Set unified pane layout
   */
  setUnifiedPaneLayout(layout: UnifiedPaneLayout): void {
    this.unifiedPaneLayout = layout;
    // No scheduleRender — paint() is called by the widget after pushing state
  }

  /**
   * Set indicator pane info
   */
  setIndicatorPaneInfo(info: Record<string, IndicatorPaneInfo>): void {
    this.indicatorPaneInfo = info;
    // No scheduleRender — paint() is called by the widget after pushing state
  }

  /**
   * Set plot style overrides
   */
  setPlotStyleOverrides(overrides: Map<string, PlotStyleOverride>): void {
    this.plotStyleOverrides = overrides;
    // No scheduleRender — paint() is called by the widget after pushing state
  }

  /**
   * Update render options (colors, styles)
   */
  setCanvasOpacity(opacity: number): void {
    this.canvas.style.opacity = String(opacity);
    if (this.crosshairCanvas) {
      this.crosshairCanvas.style.opacity = String(opacity);
    }
  }

  setRenderOptions(options: Partial<RenderOptions>): void {
    this.options.renderOptions = { ...this.options.renderOptions, ...options };
    this.renderer.setOptions(options);
    if (options.backgroundColor) {
      this.canvas.style.backgroundColor = options.backgroundColor;
    }
    this.applyCssVars();
    // No scheduleRender — paint() is called by the widget after pushing state
  }

  /**
   * Apply render options as CSS variables on the chart container.
   * HTML overlays (labels, buttons) inherit these for consistent theming.
   */
  private applyCssVars(): void {
    const opts = this.options.renderOptions;
    if (!opts) return;
    const s = this.container.style;
    if (opts.fontFamily) s.setProperty('--tc-font-family', opts.fontFamily);
    if (opts.textColor) s.setProperty('--tc-text-color', opts.textColor);
    if (opts.backgroundColor) s.setProperty('--tc-background-color', opts.backgroundColor);
    if (opts.upColor) s.setProperty('--tc-up-color', opts.upColor);
    if (opts.downColor) s.setProperty('--tc-down-color', opts.downColor);
    if (opts.crosshairColor) s.setProperty('--tc-crosshair-color', opts.crosshairColor);
  }

  /**
   * Resize the chart
   */
  resize(width: number, height: number): void {
    this.options.width = width;
    this.options.height = height;
    this.chartContainer.style.width = `${width}px`;
    this.chartContainer.style.height = `${height}px`;

    // Resize main canvas
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

    // Resize crosshair overlay canvas
    if (this.crosshairCanvas) {
      this.crosshairCanvas.width = width * dpr;
      this.crosshairCanvas.height = height * dpr;
      this.crosshairCanvas.style.width = `${width}px`;
      this.crosshairCanvas.style.height = `${height}px`;
      const crosshairCtx = this.crosshairCanvas.getContext('2d');
      if (crosshairCtx) {
        crosshairCtx.scale(dpr, dpr);
      }
    }

    // Update renderer options
    this.renderer.setOptions({
      width,
      height,
    });

    // Update interactive line renderer dimensions
    this.interactiveLineRenderer.setDimensions(width, height, this.margins);

    // Update reset button position
    this.updateResetButtonPosition();

    // Resize triggers a full repaint via the widget's render scheduler
    this.scheduleRender();
  }

  /**
   * Reset viewport to auto-scale
   */
  resetViewport(): void {
    this.viewport = TealchartRenderer.calculateViewport(this.bars);
    this.paneYOverrides.clear();
    this.paneHeightOverrides.clear();
    this.options.onResetViewport?.();
    this.options.onViewportChange?.(this.viewport);
    this.scheduleRender();
  }

  /**
   * Set auto-scale computed Y ranges for indicator panes.
   * Called by TealchartWidget each render frame with ranges from AutoScaleManager.
   * These are used in getUnifiedLayout() for panes that don't have manual Y overrides.
   */
  setPaneYRanges(ranges: Map<string, { yMin: number; yMax: number }>): void {
    this.autoScalePaneYRanges = ranges;
    // No scheduleRender — paint() is called by the widget after pushing state
  }

  /**
   * Set pane heights (for loading persisted values)
   */
  setPaneHeights(heights: { paneId: string; heightRatio: number }[]): void {
    for (const { paneId, heightRatio } of heights) {
      this.paneHeightOverrides.set(paneId, heightRatio);
    }
    // No scheduleRender — paint() is called by the widget after pushing state
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
  dispose(preserveDom = false): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
    }
    if (this.resetButtonTimer) {
      clearTimeout(this.resetButtonTimer);
    }
    this.chartContainer.removeEventListener('click', this.plusButtonClickHandler);
    this.eventManager.dispose();
    this.interactiveLineRenderer.dispose();
    if (!preserveDom) {
      this.chartContainer.remove();
    }
    // When preserveDom is true, old DOM stays visible until new widget paints first frame
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

    // Apply Y-axis overrides (manual user zoom > auto-scale computed), then height overrides.
    // Manual paneYOverrides set fixedRange: true (user dragged Y axis).
    // Auto-scale ranges provide computed Y values without marking fixedRange.
    return {
      ...baseLayout,
      panes: baseLayout.panes.map((pane) => {
        const yOverride = this.paneYOverrides.get(pane.id);
        const autoScaleRange = this.autoScalePaneYRanges.get(pane.id);
        const heightOverride = this.paneHeightOverrides.get(pane.id);

        let yProps = {};
        if (yOverride) {
          // Manual override takes priority — marks fixedRange so renderer won't auto-scale
          yProps = { yMin: yOverride.yMin, yMax: yOverride.yMax, fixedRange: true };
        } else if (autoScaleRange) {
          // Auto-scale computed range — set Y values and mark fixedRange so renderer
          // uses these values instead of recalculating inline
          yProps = { yMin: autoScaleRange.yMin, yMax: autoScaleRange.yMax, fixedRange: true };
        }

        return {
          ...pane,
          ...yProps,
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

  private cleanupPendingOrders(): void {
    // Clear pending for orders that no longer exist (cancelled/filled)
    let cleaned = false;
    for (const [id, pending] of this.pendingOrders) {
      const exists = this.orderLines.some((o) => o.id === id);
      if (!exists) {
        clearTimeout(pending.timeoutId);
        this.pendingOrders.delete(id);
        cleaned = true;
      }
    }
    // Force rebuild so the line renders at the confirmed price (not the pending override)
    if (cleaned) {
      this.interactiveLineRenderer.forceRebuild();
    }
  }

  // ============================================================================
  // Private: Render
  // ============================================================================

  /**
   * Legacy scheduleRender — kept for updateBar() fast path, resize(), and
   * resetViewport() which are called from within ChartCore itself.
   * These trigger a full render via their own RAF (separate from widget scheduler).
   */
  private scheduleRender(): void {
    if (this.rafId !== null) return; // Already scheduled — coalesce

    this.rafId = requestAnimationFrame(() => {
      this.rafId = null;
      this.renderMainCanvas();
      this.renderCrosshairOverlay();
      this.updateInteractiveLines();
    });
  }

  /**
   * Paint the chart based on dirty flags from the widget's RenderScheduler.
   * Called synchronously — no second RAF. Only repaints what changed.
   */
  paint(dirty: DirtyFlags): void {
    const needsCanvasRepaint =
      dirty &
      (DIRTY.VIEWPORT |
        DIRTY.BARS |
        DIRTY.PLOTS |
        DIRTY.LAYOUT |
        DIRTY.OPTIONS |
        DIRTY.DATA_LOAD |
        DIRTY.LINES |
        DIRTY.FULL);

    if (needsCanvasRepaint) {
      this.renderMainCanvas();
    }

    // Crosshair overlay — repaint if crosshair moved OR canvas changed (crosshair position is viewport-relative)
    if (
      dirty &
      (DIRTY.CROSSHAIR |
        DIRTY.VIEWPORT |
        DIRTY.BARS |
        DIRTY.PLOTS |
        DIRTY.LAYOUT |
        DIRTY.OPTIONS |
        DIRTY.DATA_LOAD |
        DIRTY.LINES |
        DIRTY.FULL)
    ) {
      this.renderCrosshairOverlay();
    }

    // Interactive line labels — update positions or rebuild
    if (dirty & (DIRTY.LINES | DIRTY.VIEWPORT | DIRTY.BARS | DIRTY.DATA_LOAD | DIRTY.CROSSHAIR | DIRTY.FULL)) {
      this.updateInteractiveLines();
    }
  }

  /**
   * Render main canvas — candles, grid, axes, volume, indicators, price lines.
   * Does NOT draw crosshair (that's on the overlay canvas).
   */
  private renderMainCanvas(): void {
    if (this.bars.length === 0 || !this.viewport) {
      // Always clear the canvas to avoid stale content
      const ctx = this.canvas.getContext('2d');
      if (ctx) {
        const bgColor = this.options.renderOptions?.backgroundColor || '#131722';
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, this.options.width, this.options.height);
      }
      return;
    }

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

    // Skip the line being dragged — an HTML drag line replaces it during drag.
    const dragLineId = this.interactiveLineRenderer?.isDragging()
      ? this.interactiveLineRenderer.getState().getDragLineId()
      : null;
    const canvasPriceLines = dragLineId ? allPriceLines.filter((l) => l.id !== dragLineId) : allPriceLines;

    // Hide crosshair during interactive line drag (user is focused on the drag price)
    const lineDragging = this.interactiveLineRenderer?.isDragging() ?? false;
    const crosshairState = {
      visible: this.crosshair.visible && !lineDragging,
      x: this.crosshair.x,
      y: this.crosshair.y,
      price: 0,
      time: 0,
      paneId: null,
      paneValue: null,
    };

    // Render candles, grid, axes, volume, indicators, price lines on main canvas
    // Crosshair is NOT drawn here — it goes on the overlay canvas
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

    // Collision resolution cache — only recompute de-overlap when geometry changes.
    // Label content is always built fresh below so text/color changes are never stale.
    const crosshairColor = this.options.renderOptions?.crosshairColor || '#888888';
    const collisionKey =
      allPriceLines
        .map((l) => `${l.id}:${l.price.toFixed(6)}`)
        .sort()
        .join(',') +
      `|${vp.priceMin.toFixed(4)},${vp.priceMax.toFixed(4)}|${this.crosshair.visible}|${Math.round(this.crosshair.y)}`;
    const now = Date.now();
    const collisionKeyChanged = collisionKey !== this.lastCollisionKey;
    const isDragging = this.eventManager.getIsDragging();
    const shouldResolveCollisions = collisionKeyChanged || (isDragging && now - this.lastCollisionUpdate > 16);

    if (shouldResolveCollisions) {
      // Run expensive collision resolution
      const resolvedBounds = this.renderer.computePriceLineLabelBoundsWithLayout(
        allPriceLines,
        vp,
        layout,
        this.plots,
        this.crosshair.visible ? { y: this.crosshair.y, visible: true, color: crosshairColor } : undefined,
      );
      // Cache only the collision offsets (adjustedY - originalY) by line ID
      this.collisionOffsetCache.clear();
      for (const b of resolvedBounds) {
        this.collisionOffsetCache.set(b.lineId, b.adjustedY - b.originalY);
      }
      this.lastCollisionKey = collisionKey;
      this.lastCollisionUpdate = now;
      // Use the fully resolved bounds directly (content is fresh since allPriceLines is current)
      this.labelBoundsCache = resolvedBounds;
    } else {
      // Collision cache hit — geometry unchanged, but label content may have changed.
      // Refresh content fields in-place from current line data. O(n) with Map lookup.
      const lineMap = new Map(allPriceLines.map((l) => [l.id, l]));
      for (const b of this.labelBoundsCache) {
        const line = lineMap.get(b.lineId);
        if (line) {
          b.label = line.label;
          b.chartLabel = line.chartLabel;
          b.color = line.color;
        }
      }
    }
  }

  /**
   * Render crosshair overlay — just vertical + horizontal dashed lines + time label.
   * This is extremely cheap (~0.1ms) compared to renderMainCanvas().
   * Drawn on a separate transparent canvas on top of the main canvas.
   */
  private renderCrosshairOverlay(): void {
    if (!this.crosshairCtx || !this.crosshairCanvas) return;

    const ctx = this.crosshairCtx;
    const width = this.options.width;
    const height = this.options.height;

    // Clear the overlay
    ctx.clearRect(0, 0, width, height);

    // Hide crosshair during interactive line drag
    const lineDragging = this.interactiveLineRenderer?.isDragging() ?? false;
    if (!this.crosshair.visible || lineDragging) {
      this._plusButtonBounds = null;
      return;
    }
    if (!this.viewport) {
      this._plusButtonBounds = null;
      return;
    }

    const { x, y } = this.crosshair;
    const crosshairColor = this.options.renderOptions?.crosshairColor || '#888888';

    // Check if cursor is in chart area (horizontally)
    if (x < this.margins.left || x > width - this.margins.right) return;

    // Draw vertical crosshair line
    ctx.strokeStyle = crosshairColor;
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(x, this.margins.top);
    ctx.lineTo(x, height - this.margins.bottom);
    ctx.stroke();

    // Draw horizontal crosshair line across chart area
    // Stop short of the + context menu button (18px wide + 2px offset + 2px gap)
    const hasContextMenu = !!this.options.onContextMenu;
    if (y >= this.margins.top && y <= height - this.margins.bottom) {
      const rightStop = hasContextMenu ? width - this.margins.right - 22 : width - this.margins.right;
      ctx.beginPath();
      ctx.moveTo(this.margins.left, y);
      ctx.lineTo(rightStop, y);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    // Draw + button circle on the crosshair line (replaces HTML overlay)
    if (hasContextMenu && y >= this.margins.top && y <= height - this.margins.bottom) {
      const btnX = width - this.margins.right - 11; // center of 18px circle, 2px from axis
      const btnY = y;
      const btnR = 9; // 18px diameter / 2

      // Store bounds for hit-testing clicks
      this._plusButtonBounds = { x: btnX, y: btnY, r: btnR };

      // Check hover state
      const hx = this.crosshair.x;
      const hy = this.crosshair.y;
      const dxH = hx - btnX;
      const dyH = hy - btnY;
      const isHovered = dxH * dxH + dyH * dyH <= btnR * btnR;

      // Draw circle with optional hover fill
      if (isHovered) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.beginPath();
        ctx.arc(btnX, btnY, btnR, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.strokeStyle = crosshairColor;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(btnX, btnY, btnR, 0, Math.PI * 2);
      ctx.stroke();

      // Draw "+" text
      ctx.fillStyle = crosshairColor;
      ctx.font = '13px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('+', btnX, btnY);
    } else {
      this._plusButtonBounds = null;
    }

    // Draw time label on bottom axis
    const time = this.renderer.publicXToTime(x, this.viewport);
    const timeLabel = this.renderer.formatCrosshairTimePublic(time);
    const font = this.renderer.getFont();
    ctx.font = `11px ${font}`;
    const timeLabelWidth = ctx.measureText(timeLabel).width + 8;
    const timeLabelHeight = 18;
    const timeLabelX = x - timeLabelWidth / 2;
    const timeAxisTop = height - this.margins.bottom;
    const timeLabelY = timeAxisTop + (this.margins.bottom - timeLabelHeight) / 2;

    // Background
    ctx.fillStyle = crosshairColor;
    ctx.beginPath();
    ctx.roundRect(timeLabelX, timeLabelY, timeLabelWidth, timeLabelHeight, 2);
    ctx.fill();

    // Text
    ctx.fillStyle = this.options.renderOptions?.backgroundColor || '#131722';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(timeLabel, x, timeLabelY + timeLabelHeight / 2);

    // Draw price label on right Y-axis (replaces HTML crosshair label)
    if (y >= this.margins.top && y <= height - this.margins.bottom) {
      const price = this.renderer.publicYToPriceWithLayout(y, this.viewport, this.getUnifiedLayout());
      const pricePrecision = this.options.renderOptions?.pricePrecision;
      let decimals = 2;
      if (pricePrecision && pricePrecision > 0) {
        decimals = getDecimalPlacesFromPrecision(pricePrecision);
      }
      const priceText = price.toFixed(decimals);
      ctx.font = `11px ${font}`;
      const priceLabelWidth = ctx.measureText(priceText).width + 10;
      const priceLabelHeight = 18;
      const priceLabelX = width - this.margins.right;
      const priceLabelY = y - priceLabelHeight / 2;

      // Background
      ctx.fillStyle = crosshairColor;
      ctx.beginPath();
      ctx.roundRect(priceLabelX, priceLabelY, priceLabelWidth, priceLabelHeight, 2);
      ctx.fill();

      // Text
      ctx.fillStyle = this.options.renderOptions?.backgroundColor || '#131722';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(priceText, priceLabelX + priceLabelWidth / 2, y);
    }
  }

  /**
   * Update interactive line renderer (HTML overlay labels)
   */
  private updateInteractiveLines(): void {
    const crosshairColor = this.options.renderOptions?.crosshairColor || '#888888';
    // Filter out crosshair bounds — crosshair is fully canvas-drawn now
    const nonCrosshairBounds = this.labelBoundsCache.filter((b) => b.type !== 'crosshair');
    this.interactiveLineRenderer.update(nonCrosshairBounds, this.pendingOrders, {
      x: this.crosshair.x,
      y: this.crosshair.y,
      visible: this.crosshair.visible,
      color: crosshairColor,
    });
  }
}
