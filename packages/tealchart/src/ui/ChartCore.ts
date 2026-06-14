/**
 * ChartCore - Vanilla JS chart orchestration
 *
 * Combines:
 * - TealchartRenderer (canvas rendering)
 * - EventManager (mouse/touch/keyboard interactions)
 * - PriceLineManager (Konva overlay for order/position labels and controls)
 * - ContextMenu
 *
 * This is the vanilla equivalent of Tealchart.tsx
 */

import type { DrawingOutput, PlotOutput } from '@tealstreet/tealscript';
import type {
  CrosshairState as EventCrosshairState,
  DrawingDragEventOptions,
  DrawingInputResult,
  PaneDividerInfo,
} from '../interaction/EventManager';
import type { CanvasContext } from '../rendering/CanvasContext';
import type { DirtyFlags } from '../rendering/RenderScheduler';
import type { PlotStyleOverride } from '../state/chartState';
import type {
  UserDrawingAnchor,
  DrawingCoordinateSpace,
  DrawingScreenPoint,
  UserDrawingInputPoint,
  UserDrawingSelectionAtPointResult,
  UserDrawingSelectionInputOptions,
  UserDrawingState,
} from '../drawings';

import Konva from 'konva';

import { EventManager } from '../interaction/EventManager';
import { computePaneGeometry } from '../layout/chartGeometry';
import {
  isUserDrawingDragPlacementTool,
  isUserDrawingPathFamilyTool,
  renderUserDrawingLayer,
  resolveUserDrawingInputPointFromChart,
  resolveUserDrawingPlacementConstraint,
} from '../drawings';
import { PriceLineManager } from '../interaction/PriceLineManager';
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
  ExecutionLineRenderData,
  OrderLineRenderData,
  PaneLayout,
  PendingOrderUpdate,
  PositionData,
  PositionLineRenderData,
  PriceLine,
  PriceLineLabelBounds,
  RenderOptions,
  TIME_AXIS_HEIGHT,
  UnifiedPaneLayout,
  Viewport,
} from '../types';
import { safeToFixed } from '../utils/safeNumber';
import { applyAutoScale } from '../viewport/viewScale';
import { button, div, icons } from './dom';

// ============================================================================
// Types
// ============================================================================

export interface IndicatorPaneInfo {
  overlay: boolean;
  yAxisRange?: { min: number; max: number };
  explicitPlotZOrder?: boolean;
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
  /** Context menu callback */
  onContextMenu?: (unixTime: number, price: number) => ContextMenuItem[];
  /** Mouse down callback */
  onMouseDown?: () => void;
  /** Mouse up callback */
  onMouseUp?: () => void;
  /** Called when a chart-surface click/tap resolves to a user drawing input point */
  onUserDrawingInput?: (point: UserDrawingInputPoint) => boolean;
  /** Called when select-mode chart-surface input should select or clear a user drawing */
  onUserDrawingSelection?: (
    point: DrawingScreenPoint,
    spacesByPaneId: ReadonlyMap<string, DrawingCoordinateSpace>,
    options?: Pick<UserDrawingSelectionInputOptions, 'additive'>,
  ) => UserDrawingSelectionAtPointResult;
  /** Called when select-mode pointer down may start editing a user drawing */
  onUserDrawingEditStart?: (
    point: DrawingScreenPoint,
    spacesByPaneId: ReadonlyMap<string, DrawingCoordinateSpace>,
    options?: DrawingDragEventOptions,
  ) => boolean;
  /** Called when select-mode context menu input may target a user drawing */
  onUserDrawingContextMenu?: (
    point: DrawingScreenPoint,
    spacesByPaneId: ReadonlyMap<string, DrawingCoordinateSpace>,
  ) => ContextMenuItem[];
  /** Called while an active user drawing edit drag moves */
  onUserDrawingEditMove?: (point: DrawingScreenPoint) => boolean;
  /** Called when an active user drawing edit drag ends */
  onUserDrawingEditEnd?: () => void;
  /** Called when a two-anchor drawing tool drag starts placement */
  onUserDrawingPlacementDragStart?: (point: UserDrawingInputPoint) => boolean;
  /** Called when a two-anchor drawing tool drag commits placement */
  onUserDrawingPlacementDragEnd?: (point: UserDrawingInputPoint) => boolean;
  /** Called when path-tool pointer down starts collecting freehand samples */
  onUserDrawingPathDragStart?: (point: UserDrawingInputPoint) => boolean;
  /** Called while an active path-tool drag collects freehand samples */
  onUserDrawingPathDragMove?: (point: UserDrawingInputPoint) => boolean;
  /** Called when an active path-tool drag ends */
  onUserDrawingPathDragEnd?: () => void;
  /** Called when an active drawing draft is cancelled before normal completion */
  onUserDrawingCancelDraft?: () => void;
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
  onPaneDoubleClick?: (paneId: string, point: DrawingScreenPoint, spacesByPaneId: ReadonlyMap<string, DrawingCoordinateSpace>) => void;
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Convert legacy PaneLayout to UnifiedPaneLayout
 */
function convertToUnifiedLayout(paneLayout?: PaneLayout): UnifiedPaneLayout {
  const timeAxisHeight = TIME_AXIS_HEIGHT;

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
    buttons: [
      ...(order.brackets !== null
        ? [
            {
              type: 'tp' as const,
              icon: 'TP',
              backgroundColor: order.bodyBackgroundColor,
              iconColor: '#22c55e',
              borderColor: '#22c55e',
              tooltip: 'Drag to set Take Profit',
            },
          ]
        : []),
      ...(order.brackets !== null
        ? [
            {
              type: 'sl' as const,
              icon: 'SL',
              backgroundColor: order.bodyBackgroundColor,
              iconColor: '#f97316',
              borderColor: '#f97316',
              tooltip: 'Drag to set Stop Loss',
            },
          ]
        : []),
      ...(order.cancellable
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
        : []),
    ],
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
    partialEnabled: order.partialEnabled,
    brackets: order.brackets,
    callbacks: order.callbacks,
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
    callbacks: position.callbacks,
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
  private canvasContext: CanvasContext;
  private eventManager: EventManager;
  private priceLineManager: PriceLineManager | null = null;
  private stage: Konva.Stage | null = null;

  // Data refs
  private bars: Bar[] = [];
  private viewport: Viewport | null = null;
  private priceLines: PriceLine[] = [];
  private orderLines: OrderLineRenderData[] = [];
  private positionLines: PositionLineRenderData[] = [];
  private executionLines: ExecutionLineRenderData[] = [];
  private plots: PlotOutput[] = [];
  private drawings: DrawingOutput[] = [];
  private userDrawingState: UserDrawingState | null = null;
  private userDrawingDraftPreviewAnchor: UserDrawingAnchor | null = null;
  private userDrawingPlacementDragStartPoint: UserDrawingInputPoint | null = null;
  private userDrawingPlacementDragLastPoint: UserDrawingInputPoint | null = null;
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

  // Bracket drag preview state (TP/SL drag visualization on crosshair canvas)
  private _bracketDragState: {
    type: 'tp' | 'sl';
    positionId: string;
    price: number;
    entryPrice: number;
    partialPercent: number;
    partialEnabled: boolean;
    dragStartX: number;
    dragCurrentX: number;
    positionData: PositionData;
  } | null = null;

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

    // Apply render options as CSS variables for shared chart UI
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
    this.canvasContext = ctx;

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

    this.initKonvaInteractiveLines();

    if (this.stage) {
      const layer = this.stage.getLayers()[0];
      if (layer) {
        this.priceLineManager = new PriceLineManager({
          layer,
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
          onOrderMove: (orderId, newPrice) => this.handleOrderMove(orderId, newPrice),
          onOrderCancel: (orderId) => this.options.onOrderCancel?.(orderId),
          onPositionClose: (positionId) => this.options.onPositionClose?.(positionId),
          onPositionReverse: (positionId) => this.options.onPositionReverse?.(positionId),
          onTPMovePreview: (positionId, price, partialPercent, dragStartX, dragCurrentX) => {
            this._updateBracketDragState('tp', positionId, price, partialPercent, dragStartX, dragCurrentX);
          },
          onSLMovePreview: (positionId, price, partialPercent, dragStartX, dragCurrentX) => {
            this._updateBracketDragState('sl', positionId, price, partialPercent, dragStartX, dragCurrentX);
          },
          onTPSLDragEnd: () => {
            this._bracketDragState = null;
            this.renderCrosshairOverlay();
          },
          onTPSLDragCancel: () => {
            this._bracketDragState = null;
            this.renderCrosshairOverlay();
          },
          fontFamily: this.renderer.font,
          onCursorChange: (cursor) => {
            const wasDragging = this.cursor === 'grabbing';
            this.cursor = cursor;
            this.chartContainer.style.cursor = cursor;
            if (this.stage) {
              this.stage.container().style.cursor = cursor;
            }
            if (cursor === 'grabbing' || wasDragging) {
              this.crosshair.visible = false;
              this.renderCrosshairOverlay();
            }
          },
        });
      }
    }

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
      onDrawingInput: (x, y, source, options) => this.handleUserDrawingInput(x, y, source, options),
      onDrawingDragPending: (x, y) => this.handleUserDrawingDragPending(x, y),
      onDrawingDragStart: (x, y, _source, options) => this.handleUserDrawingDragStart(x, y, options),
      onDrawingDragMove: (x, y, _source, options) => this.handleUserDrawingDragMove(x, y, options),
      onDrawingDragEnd: () => this.handleUserDrawingDragEnd(),
      onDrawingDragCancel: () => this.handleUserDrawingDragCancel(),
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
        if (this.isOverKonvaInteractiveElement(x, y)) {
          return true;
        }
        return false;
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
        this.cursor = cursor;
        this.chartContainer.style.cursor = cursor;
        if (this.stage) {
          this.stage.container().style.cursor = cursor;
        }
      },
      onPaneDoubleClick: (paneId, point) => {
        if (!this.viewport) return;
        this.options.onPaneDoubleClick?.(paneId, point, this.getUserDrawingSpaces(this.viewport));
      },
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
    if (this.eventManager.getIsDragging() || this.priceLineManager?.isDragging()) return;
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
    if (this.eventManager.getIsDragging() || this.priceLineManager?.isDragging()) return;
    if (lines === this.positionLines) return;
    this.positionLines = lines;
    // No scheduleRender — paint() is called by the widget after pushing state
  }

  /**
   * Set execution markers
   * Reference equality check - skip if same array
   */
  setExecutionLines(lines: ExecutionLineRenderData[]): void {
    if (lines === this.executionLines) return;
    this.executionLines = lines;
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
   * Set indicator drawings
   * Reference equality check - skip if same array
   */
  setDrawings(drawings: DrawingOutput[]): void {
    if (drawings === this.drawings) return;
    this.drawings = drawings;
    // No scheduleRender — paint() is called by the widget after pushing state
  }

  /**
   * Set user drawing state
   * Reference equality check - skip if same object
   */
  setUserDrawingState(state: UserDrawingState): void {
    if (state === this.userDrawingState) return;
    this.userDrawingState = state;
    if (!state.draft) {
      this.userDrawingDraftPreviewAnchor = null;
      this.userDrawingPlacementDragStartPoint = null;
      this.userDrawingPlacementDragLastPoint = null;
    }
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
   * Set the jailbreak indicator manager for custom indicator rendering on the canvas.
   * Pass null to disable jailbreak indicators.
   */
  setJailbreakManager(
    manager: import('../jailbreak/JailbreakIndicatorManager').JailbreakIndicatorManager | null,
  ): void {
    this.renderer.setJailbreakManager(manager);
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
    if (options.fontFamily !== undefined) {
      this.priceLineManager?.setFontFamily(this.renderer.font);
    }
    if (options.backgroundColor) {
      this.canvas.style.backgroundColor = options.backgroundColor;
    }
    this.applyCssVars();
    // No scheduleRender — paint() is called by the widget after pushing state
  }

  /**
   * Apply render options as CSS variables on the chart container.
   * Shared chart UI inherits these for consistent theming.
   */
  private applyCssVars(): void {
    const opts = this.options.renderOptions;
    if (!opts) return;
    const s = this.container.style;
    if (opts.fontFamily && s.getPropertyValue('--tc-font-family') !== opts.fontFamily) {
      s.setProperty('--tc-font-family', opts.fontFamily);
    }
    if (opts.textColor && s.getPropertyValue('--tc-text-color') !== opts.textColor) {
      s.setProperty('--tc-text-color', opts.textColor);
    }
    if (opts.backgroundColor && s.getPropertyValue('--tc-background-color') !== opts.backgroundColor) {
      s.setProperty('--tc-background-color', opts.backgroundColor);
    }
    if (opts.upColor && s.getPropertyValue('--tc-up-color') !== opts.upColor) {
      s.setProperty('--tc-up-color', opts.upColor);
    }
    if (opts.downColor && s.getPropertyValue('--tc-down-color') !== opts.downColor) {
      s.setProperty('--tc-down-color', opts.downColor);
    }
    if (opts.crosshairColor && s.getPropertyValue('--tc-crosshair-color') !== opts.crosshairColor) {
      s.setProperty('--tc-crosshair-color', opts.crosshairColor);
    }
  }

  private initKonvaInteractiveLines(): void {
    const konvaContainer = div({
      style: {
        position: 'absolute',
        top: '0',
        left: '0',
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: '2',
      },
    });
    this.chartContainer.appendChild(konvaContainer);

    this.stage = new Konva.Stage({
      container: konvaContainer,
      width: this.options.width,
      height: this.options.height,
    });

    const stageContainer = this.stage.container();
    stageContainer.style.pointerEvents = 'auto';
    stageContainer.style.cursor = this.cursor;

    const layer = new Konva.Layer();
    this.stage.add(layer);
  }

  private isOverKonvaInteractiveElement(x: number, y: number): boolean {
    if (!this.stage) return false;
    const hit = this.stage.getIntersection({ x, y });
    return hit !== null && hit.listening();
  }

  private handleOrderMove(orderId: string, newPrice: number): void {
    const originalOrder = this.orderLines.find((o) => o.id === orderId);
    const originalPrice = originalOrder?.price ?? newPrice;
    this.pendingOrders.set(orderId, {
      orderId,
      pendingPrice: newPrice,
      originalPrice,
      startTime: Date.now(),
      timeoutId: setTimeout(() => {
        this.pendingOrders.delete(orderId);
        this.scheduleRender();
      }, 5000),
    });
    this.scheduleRender();
    this.options.onOrderMove?.(orderId, newPrice);
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

    if (this.stage) {
      this.stage.width(width);
      this.stage.height(height);
    }
    this.priceLineManager?.setDimensions(width, height, this.margins);

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

  getUserDrawingSpacesForCurrentViewport(): Map<string, DrawingCoordinateSpace> | null {
    return this.viewport ? this.getUserDrawingSpaces(this.viewport) : null;
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
    this.priceLineManager?.dispose();
    this.stage?.destroy();
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
    const drawingItems =
      this.viewport && this.userDrawingState?.activeTool === 'select'
        ? this.options.onUserDrawingContextMenu?.({ x: screenX, y: screenY }, this.getUserDrawingSpaces(this.viewport))
        : undefined;
    const items = (drawingItems && drawingItems.length > 0 ? drawingItems : this.options.onContextMenu?.(time, price)) ?? [];
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
    this.contextMenu.addEventListener('mousedown', (event) => event.stopPropagation());
    this.contextMenu.addEventListener('mouseup', (event) => event.stopPropagation());
    this.contextMenu.addEventListener('click', (event) => event.stopPropagation());
    this.contextMenu.addEventListener('contextmenu', (event) => event.stopPropagation());

    for (const item of items) {
      const menuItem = div({
        style: {
          padding: '8px 12px',
          fontSize: '12px',
          color: '#d1d4dc',
          cursor: item.enabled === false ? 'default' : 'pointer',
          opacity: item.enabled === false ? '0.5' : '1',
        },
        text: item.text,
        onClick: (event) => {
          event.stopPropagation();
          if (item.enabled === false) return;
          item.click();
          this.contextMenu?.remove();
          this.contextMenu = null;
        },
        onMouseEnter: (e) => {
          if (item.enabled === false) return;
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
    const panes = computePaneGeometry({
      paneLayout: layout,
      height: this.options.height,
      topOffset: this.margins.top,
    });

    for (const pane of panes) {
      if (y >= pane.top && y < pane.bottom) {
        let yMin = pane.yMin;
        let yMax = pane.yMax;

        // For main pane without override, use viewport prices
        if (pane.type === 'main' && !pane.fixedRange && this.viewport) {
          yMin = this.viewport.priceMin;
          yMax = this.viewport.priceMax;
        }

        return { paneId: pane.id, yMin, yMax, paneHeight: pane.height };
      }
    }

    return null;
  }

  private handleUserDrawingInput(
    x: number,
    y: number,
    source: 'mouse' | 'touch' = 'mouse',
    options: { additiveSelection?: boolean } = {},
  ): DrawingInputResult {
    if (!this.viewport) return false;

    if (this.userDrawingState?.activeTool === 'select') {
      const chartLeft = this.margins.left;
      const chartRight = this.options.width - this.margins.right;
      if (x < chartLeft || x >= chartRight || !this.getPaneAtY(y)) return false;

      const selection = this.options.onUserDrawingSelection?.({ x, y }, this.getUserDrawingSpaces(this.viewport), {
        additive: options.additiveSelection,
      });
      return source === 'touch' && (selection?.hit === true || selection?.changed === true)
        ? { handled: true, allowPaneDoubleClick: true }
        : false;
    }

    if (!this.options.onUserDrawingInput) return false;

    const point = this.resolveUserDrawingInputPoint(x, y);
    return point ? this.options.onUserDrawingInput(point) : false;
  }

  private resolveUserDrawingInputPoint(x: number, y: number): UserDrawingInputPoint | null {
    if (!this.viewport) return null;

    const layout = this.getUnifiedLayout();
    const panes = computePaneGeometry({
      paneLayout: layout,
      height: this.options.height,
      topOffset: this.margins.top,
    }).map((pane) => {
      const yRange =
        pane.type === 'main' && !pane.fixedRange
          ? { yMin: this.viewport!.priceMin, yMax: this.viewport!.priceMax }
          : { yMin: pane.yMin, yMax: pane.yMax };
      return {
        id: pane.id,
        top: pane.top,
        height: pane.height,
        bottom: pane.bottom,
        ...yRange,
      };
    });

    const point = resolveUserDrawingInputPointFromChart({
      point: { x, y },
      viewport: this.viewport,
      panes,
      width: this.options.width,
      margins: this.margins,
    });
    if (!point) return null;

    const sourcePane = layout.panes.find((pane) => pane.id === point.paneId);
    return {
      ...point,
      bars: sourcePane?.type === 'main' && this.bars.length > 0 ? this.bars : undefined,
    };
  }

  private resolveConstrainedUserDrawingPlacementPoint(
    point: UserDrawingInputPoint,
    options?: DrawingDragEventOptions,
  ): UserDrawingInputPoint {
    if (!this.viewport || !this.userDrawingState) return point;
    return resolveUserDrawingPlacementConstraint({
      tool: this.userDrawingState.activeTool,
      startPoint: this.userDrawingPlacementDragStartPoint,
      currentPoint: point,
      spacesByPaneId: this.getUserDrawingSpaces(this.viewport),
      options,
    });
  }

  private handleUserDrawingDragStart(x: number, y: number, options?: DrawingDragEventOptions): boolean {
    if (!this.viewport) return false;

    if (this.userDrawingState && isUserDrawingDragPlacementTool(this.userDrawingState.activeTool)) {
      const point = this.resolveUserDrawingInputPoint(x, y);
      if (!point || this.options.onUserDrawingPlacementDragStart?.(point) !== true) return false;
      this.userDrawingPlacementDragStartPoint = point;
      const previewPoint = this.resolveConstrainedUserDrawingPlacementPoint(point, options);
      this.userDrawingDraftPreviewAnchor = previewPoint.anchor;
      this.userDrawingPlacementDragLastPoint = previewPoint;
      this.scheduleRender();
      return true;
    }

    if (this.userDrawingState && isUserDrawingPathFamilyTool(this.userDrawingState.activeTool)) {
      const point = this.resolveUserDrawingInputPoint(x, y);
      return point ? this.options.onUserDrawingPathDragStart?.(point) === true : false;
    }

    if (this.userDrawingState?.activeTool !== 'select') return false;

    const chartLeft = this.margins.left;
    const chartRight = this.options.width - this.margins.right;
    if (x < chartLeft || x >= chartRight || !this.getPaneAtY(y)) return false;

    return this.options.onUserDrawingEditStart?.({ x, y }, this.getUserDrawingSpaces(this.viewport), options) === true;
  }

  private handleUserDrawingDragPending(x: number, y: number): boolean {
    if (
      !this.viewport ||
      !this.userDrawingState
    ) {
      return false;
    }

    if (isUserDrawingDragPlacementTool(this.userDrawingState.activeTool)) {
      return (
        !!this.options.onUserDrawingPlacementDragStart &&
        !!this.options.onUserDrawingPlacementDragEnd &&
        this.resolveUserDrawingInputPoint(x, y) !== null
      );
    }

    if (
      !isUserDrawingPathFamilyTool(this.userDrawingState.activeTool) ||
      !this.options.onUserDrawingPathDragStart ||
      !this.options.onUserDrawingPathDragMove ||
      !this.options.onUserDrawingPathDragEnd
    ) {
      return false;
    }
    return this.resolveUserDrawingInputPoint(x, y) !== null;
  }

  private handleUserDrawingDragMove(x: number, y: number, options?: DrawingDragEventOptions): boolean {
    if (!this.viewport) return false;

    if (this.userDrawingState && isUserDrawingDragPlacementTool(this.userDrawingState.activeTool)) {
      const point = this.resolveUserDrawingInputPoint(x, y);
      if (!point || !this.userDrawingPlacementDragLastPoint) return false;
      const previewPoint = this.resolveConstrainedUserDrawingPlacementPoint(point, options);
      this.userDrawingDraftPreviewAnchor = previewPoint.anchor;
      this.userDrawingPlacementDragLastPoint = previewPoint;
      this.scheduleRender();
      return true;
    }

    if (this.userDrawingState && isUserDrawingPathFamilyTool(this.userDrawingState.activeTool)) {
      const point = this.resolveUserDrawingInputPoint(x, y);
      return point ? this.options.onUserDrawingPathDragMove?.(point) === true : false;
    }

    if (this.userDrawingState?.activeTool !== 'select') return false;
    return this.options.onUserDrawingEditMove?.({ x, y }) === true;
  }

  private handleUserDrawingDragEnd(): void {
    if (this.userDrawingState && isUserDrawingDragPlacementTool(this.userDrawingState.activeTool)) {
      const point = this.userDrawingPlacementDragLastPoint;
      this.userDrawingDraftPreviewAnchor = null;
      this.userDrawingPlacementDragStartPoint = null;
      this.userDrawingPlacementDragLastPoint = null;
      if (point) {
        this.options.onUserDrawingPlacementDragEnd?.(point);
      } else {
        this.scheduleRender();
      }
      return;
    }

    if (this.userDrawingState && isUserDrawingPathFamilyTool(this.userDrawingState.activeTool)) {
      this.options.onUserDrawingPathDragEnd?.();
      return;
    }

    this.options.onUserDrawingEditEnd?.();
  }

  private handleUserDrawingDragCancel(): void {
    if (this.userDrawingState && isUserDrawingDragPlacementTool(this.userDrawingState.activeTool)) {
      this.userDrawingDraftPreviewAnchor = null;
      this.userDrawingPlacementDragStartPoint = null;
      this.userDrawingPlacementDragLastPoint = null;
      this.options.onUserDrawingCancelDraft?.();
      this.scheduleRender();
      return;
    }

    if (this.userDrawingState && isUserDrawingPathFamilyTool(this.userDrawingState.activeTool)) {
      this.options.onUserDrawingCancelDraft?.();
      this.scheduleRender();
    }
  }

  private getUserDrawingSpaces(viewport: Viewport): Map<string, DrawingCoordinateSpace> {
    const layout = this.getUnifiedLayout();
    const computedPanes = computePaneGeometry({
      paneLayout: layout,
      height: this.options.height,
      topOffset: this.margins.top,
    });
    const spaces = new Map<string, DrawingCoordinateSpace>();

    for (const pane of computedPanes) {
      const yRange =
        pane.type === 'main' && !pane.fixedRange
          ? { yMin: viewport.priceMin, yMax: viewport.priceMax }
          : { yMin: pane.yMin, yMax: pane.yMax };
      spaces.set(pane.id, {
        viewport,
        pane: {
          id: pane.id,
          top: pane.top,
          height: pane.height,
          bottom: pane.bottom,
          ...yRange,
        },
        chartLeft: this.margins.left,
        chartRight: this.options.width - this.margins.right,
        bars: pane.type === 'main' ? this.bars : undefined,
      });
    }

    return spaces;
  }

  private getDividerAtY(y: number): PaneDividerInfo | null {
    const layout = this.getUnifiedLayout();
    const panes = layout.panes;

    // Need at least 2 panes for a divider
    if (panes.length < 2) return null;

    const computedPanes = computePaneGeometry({
      paneLayout: layout,
      height: this.options.height,
      topOffset: this.margins.top,
    });

    const DIVIDER_HIT_ZONE = 6; // Pixels around divider that count as "over divider"

    for (let i = 0; i < computedPanes.length - 1; i++) {
      const pane = panes[i];
      const nextPane = panes[i + 1];
      const dividerY = computedPanes[i]!.bottom;

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
    if (cleaned) this.scheduleRender();
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
        DIRTY.DRAWINGS |
        DIRTY.USER_DRAWINGS |
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
        DIRTY.DRAWINGS |
        DIRTY.USER_DRAWINGS |
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

    // Skip the line being dragged — the Konva drag line replaces it during drag.
    const dragLineId = this.priceLineManager?.getDragLineId() ?? null;
    const canvasPriceLines = (dragLineId ? allPriceLines.filter((l) => l.id !== dragLineId) : allPriceLines).filter(
      (line) => line.type !== 'order' && line.type !== 'position',
    );

    // Hide crosshair during interactive line drag (user is focused on the drag price)
    const lineDragging = this.priceLineManager?.isDragging() ?? false;
    const crosshairState = {
      visible: this.crosshair.visible && !lineDragging,
      x: this.crosshair.x,
      y: this.crosshair.y,
      price: 0,
      time: 0,
      paneId: null,
      paneValue: null,
    };

    // Collision resolution cache — only recompute de-overlap when geometry changes.
    // Label content is always built fresh below so text/color changes are never stale.
    // Include bucketed text length per line — triggers rebuild when label width changes
    // significantly (e.g., PnL grows from "$1" to "$1,234"). Bucket to nearest 3 chars
    // so minor text changes (same visual width) don't cause unnecessary rebuilds.
    const collisionKey =
      allPriceLines
        .map((l) => {
          const textLen = l.chartLabel?.segments.reduce((sum, s) => sum + (s.text?.length || 0), 0) || 0;
          return `${l.id}:${safeToFixed(l.price, 6, 'collisionKey.price')}:${Math.round(textLen / 3)}`;
        })
        .sort()
        .join(',') +
      `|${safeToFixed(vp.priceMin, 4, 'collisionKey.priceMin')},${safeToFixed(vp.priceMax, 4, 'collisionKey.priceMax')}`;
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
        undefined,
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
          b.price = line.price;
          b.label = line.label;
          b.chartLabel = line.chartLabel;
          b.color = line.color;
          b.lineStyle = line.lineStyle;
          b.lineLength = line.lineLength;
          b.extendLeft = line.extendLeft;
          b.lineWidth = line.lineWidth;
          b.renderLineOnCanvas = line.renderLineOnCanvas;
          b.countdownToTime = line.countdownToTime;
          b.draggable = line.draggable;
          b.positionId = line.positionId;
          b.partialEnabled = line.partialEnabled;
          b.positionData = line.positionData;
          b.brackets = line.brackets;
          b.callbacks = line.callbacks;
          b.targetPaneId = line.targetPaneId;
        }
      }
    }

    const canvasLabelBounds = (dragLineId ? this.labelBoundsCache.filter((bound) => bound.lineId !== dragLineId) : this.labelBoundsCache)
      .filter((bound) => bound.type !== 'order' && bound.type !== 'position');

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
      canvasLabelBounds,
      this.executionLines,
      this.drawings,
    );

    if (this.userDrawingState) {
      renderUserDrawingLayer(this.canvasContext, this.userDrawingState, this.getUserDrawingSpaces(vp), {
        draftPreviewAnchor: this.userDrawingDraftPreviewAnchor ?? undefined,
        onImageLoad: () => this.scheduleRender(),
      });
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

    // Draw bracket drag preview (even when crosshair is hidden during drag)
    if (this._bracketDragState && this.viewport) {
      this._drawBracketPreview(ctx);
    }

    // Hide crosshair during interactive line drag
    const lineDragging = this.priceLineManager?.isDragging() ?? false;
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

    // Draw + button circle on the crosshair line
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
      const priceText = safeToFixed(price, decimals, 'crosshairPrice');
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

    // Draw jailbreak indicator tooltips
    this._drawJailbreakTooltips(ctx, x, y);
  }

  /**
   * Draw jailbreak indicator tooltips near the crosshair.
   * Collects tooltips from all visible indicators and renders grouped text boxes.
   */
  private _drawJailbreakTooltips(ctx: CanvasRenderingContext2D, cursorX: number, cursorY: number): void {
    const jailbreakManager = this.renderer.getJailbreakManager();
    if (!jailbreakManager || jailbreakManager.size === 0) return;
    if (!this.viewport || this.bars.length === 0) return;

    const width = this.options.width;

    // Compute price at crosshair Y
    const layout = this.getUnifiedLayout();
    const price = this.renderer.publicYToPriceWithLayout(cursorY, this.viewport, layout);

    // Find bar index nearest to crosshair X via time
    const time = this.renderer.publicXToTime(cursorX, this.viewport);
    let barIndex = 0;
    const bars = this.bars;
    // Binary search for nearest bar
    let lo = 0;
    let hi = bars.length - 1;
    while (lo <= hi) {
      const mid = (lo + hi) >>> 1;
      if (bars[mid].time < time) {
        lo = mid + 1;
      } else {
        hi = mid - 1;
      }
    }
    barIndex = Math.min(lo, bars.length - 1);

    // Convert bars to seconds for indicator compatibility (same as buildJailbreakDrawArgs)
    const barsInSeconds = bars.map((b) => ({ ...b, time: Math.floor(b.time / 1000) }));

    const exchange = this.options.renderOptions?.exchange ?? '';
    const symbol = this.options.renderOptions?.symbol ?? '';

    const tooltipGroups = jailbreakManager.getTooltips({
      bars: barsInSeconds,
      mouseX: cursorX,
      mouseY: cursorY,
      barIndex,
      price,
      exchange,
      symbol,
    });

    if (tooltipGroups.length === 0) return;

    // Separate tooltip groups by position
    const leftGroups: typeof tooltipGroups = [];
    const hoverGroups: typeof tooltipGroups = [];
    for (const group of tooltipGroups) {
      // Check the position of the first tooltip in the group
      const pos = group[0]?.position ?? 'left';
      if (pos === 'hover') {
        hoverGroups.push(group);
      } else {
        // both 'left' and 'right' go to left for now (matching TV behavior)
        leftGroups.push(group);
      }
    }

    const bgColor = this.options.renderOptions?.backgroundColor || '#131722';
    const textColor = this.options.renderOptions?.crosshairColor || '#888888';

    if (leftGroups.length > 0) {
      this._drawTooltipGroups(ctx, leftGroups, cursorX, cursorY, width, bgColor, textColor, 'left');
    }
    if (hoverGroups.length > 0) {
      this._drawTooltipGroups(ctx, hoverGroups, cursorX, cursorY, width, bgColor, textColor, 'hover');
    }
  }

  /**
   * Render tooltip groups as a canvas text box.
   */
  private _drawTooltipGroups(
    ctx: CanvasRenderingContext2D,
    groups: import('../jailbreak/types').CrossHairTooltip[][],
    cursorX: number,
    cursorY: number,
    chartWidth: number,
    bgColor: string,
    defaultTextColor: string,
    alignment: 'left' | 'hover',
  ): void {
    const flat = groups.flat();
    if (flat.length === 0) return;

    const fontSize = 12;
    const font = this.renderer.getFont();
    ctx.font = `${fontSize}px ${font}`;

    // Measure max text width
    let maxTextWidth = 0;
    for (const t of flat) {
      const w = ctx.measureText(t.text).width;
      if (w > maxTextWidth) maxTextWidth = w;
    }

    const textHeight = 15;
    const padding = 5;
    const groupPadding = 0.2;

    // Calculate total height including group separators
    const totalRows = flat.length + (groups.length - 1) * groupPadding * 2;
    const tooltipHeight = textHeight * totalRows + padding;
    const tooltipWidth = maxTextWidth + padding * 2;

    // Position the tooltip
    let rectX: number;
    if (alignment === 'left') {
      rectX = 20;
    } else {
      // hover: position near cursor, flip side if too close to edge
      const fitsRight = cursorX + 15 + tooltipWidth < chartWidth - this.margins.right;
      rectX = fitsRight ? cursorX + 15 : cursorX - tooltipWidth - 15;
    }
    const rectY = cursorY - tooltipHeight / 2;

    // Draw background
    ctx.fillStyle = bgColor;
    ctx.globalAlpha = 0.85;
    ctx.beginPath();
    ctx.roundRect(rectX, rectY, tooltipWidth, tooltipHeight, 3);
    ctx.fill();
    ctx.globalAlpha = 1.0;

    // Draw border
    ctx.strokeStyle = defaultTextColor;
    ctx.globalAlpha = 0.3;
    ctx.lineWidth = 0.5;
    ctx.strokeRect(rectX, rectY, tooltipWidth, tooltipHeight);
    ctx.globalAlpha = 1.0;

    // Draw text rows
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    let rowOffset = 0;
    for (let gi = 0; gi < groups.length; gi++) {
      const group = groups[gi];
      for (const tooltip of group) {
        ctx.fillStyle = tooltip.color || defaultTextColor;
        ctx.fillText(tooltip.text, rectX + padding, rectY + rowOffset * textHeight + padding / 1.2);
        rowOffset++;
      }

      // Draw separator line between groups (not after last)
      if (gi < groups.length - 1) {
        rowOffset += groupPadding;
        ctx.beginPath();
        ctx.strokeStyle = defaultTextColor;
        ctx.globalAlpha = 0.3;
        ctx.moveTo(rectX, rectY + rowOffset * textHeight + padding / 2);
        ctx.lineTo(rectX + tooltipWidth, rectY + rowOffset * textHeight + padding / 2);
        ctx.stroke();
        ctx.globalAlpha = 1.0;
        rowOffset += groupPadding;
      }
    }
  }

  /**
   * Update bracket drag state from interactive line move callbacks.
   * Looks up position or order lines to get entryPrice + positionData for preview.
   */
  private _updateBracketDragState(
    type: 'tp' | 'sl',
    lineId: string,
    price: number,
    partialPercent: number,
    dragStartX: number,
    dragCurrentX: number,
  ): void {
    // Try position lines first
    const position = this.positionLines.find((p) => (p.positionId || p.id) === lineId);
    if (position?.positionData) {
      this._bracketDragState = {
        type,
        positionId: lineId,
        price,
        entryPrice: position.positionData.entryPrice,
        partialPercent,
        partialEnabled: position.partialEnabled ?? false,
        dragStartX,
        dragCurrentX,
        positionData: position.positionData,
      };
      this.renderCrosshairOverlay();
      return;
    }

    // Fall back to order lines — use order price as entry
    const order = this.orderLines.find((o) => (o.orderId || o.id) === lineId);
    if (order) {
      this._bracketDragState = {
        type,
        positionId: lineId,
        price,
        entryPrice: order.price,
        partialPercent,
        partialEnabled: order.partialEnabled ?? false,
        dragStartX,
        dragCurrentX,
        positionData: { entryPrice: order.price, isLong: true, notional: 0 },
      };
      this.renderCrosshairOverlay();
    }
  }

  /**
   * Draw TP/SL bracket preview on the crosshair overlay canvas.
   * Ported from TradingView's _drawBracketLines + _drawBracketZone.
   */
  private _drawBracketPreview(ctx: CanvasRenderingContext2D): void {
    const state = this._bracketDragState;
    if (!state || !this.viewport) return;

    const chartWidth = this.options.width - this.margins.right;
    const color = state.type === 'tp' ? '#22c55e' : '#f97316';
    const bracketType = state.type === 'tp' ? 'TP' : 'SL';
    const isPartialMode = state.partialEnabled;

    // Convert prices to Y coordinates
    const layout = this.getUnifiedLayout();
    const bracketY = this.renderer.publicPriceToYWithLayout(state.price, this.viewport, layout);
    const entryY = this.renderer.publicPriceToYWithLayout(state.entryPrice, this.viewport, layout);

    // Compute PnL inline (only when notional > 0, i.e. for positions)
    const pd = state.positionData;
    const hasPnl = pd.notional > 0;
    const priceDiff = pd.isLong ? state.price - state.entryPrice : state.entryPrice - state.price;
    const pnl = hasPnl ? ((priceDiff * pd.notional) / state.entryPrice) * (state.partialPercent / 100) : 0;
    const percentDistance = ((state.price - state.entryPrice) / state.entryPrice) * 100;

    // Format values
    const pnlText = hasPnl ? (pnl >= 0 ? '+' : '-') + '$' + safeToFixed(Math.abs(pnl), 2) : '';
    const pctSign = percentDistance >= 0 ? '+' : '';
    const percentText = pctSign + safeToFixed(percentDistance, 2) + '%';

    // Build type label
    const typeLabel =
      isPartialMode && state.partialPercent < 100 ? state.partialPercent + '% Partial ' + bracketType : bracketType;

    ctx.save();

    // ========= Zone visualization =========
    const zoneHalfWidth = 220;
    const centerX = state.dragStartX;
    const cursorOnRight = state.dragCurrentX > centerX;
    const leftEdge = Math.max(0, centerX - zoneHalfWidth);
    const rightEdge = Math.min(chartWidth, centerX + zoneHalfWidth);

    const top = Math.min(entryY, bracketY);
    const bottom = Math.max(entryY, bracketY);
    const height = bottom - top;
    const isDraggingUp = bracketY < entryY;

    const bgColor = '#1e222d';
    const borderColor = '#363a45';

    if (isPartialMode && height > 0) {
      // Fill rectangle with low opacity
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.08;
      ctx.fillRect(leftEdge, top, rightEdge - leftEdge, height);

      // Dashed rectangle border
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.globalAlpha = 0.6;
      ctx.strokeRect(leftEdge, top, rightEdge - leftEdge, height);

      // V-shape diagonal lines from center to corners
      ctx.beginPath();
      if (isDraggingUp) {
        ctx.moveTo(leftEdge, top);
        ctx.lineTo(centerX, bottom);
        ctx.lineTo(rightEdge, top);
      } else {
        ctx.moveTo(leftEdge, bottom);
        ctx.lineTo(centerX, top);
        ctx.lineTo(rightEdge, bottom);
      }
      ctx.stroke();

      // Zone boundary lines at 55px intervals
      ctx.globalAlpha = 0.3;
      const zoneOffsets = [55, 110, 165];
      for (const offset of zoneOffsets) {
        ctx.beginPath();
        ctx.moveTo(centerX - offset, top);
        ctx.lineTo(centerX - offset, bottom);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(centerX + offset, top);
        ctx.lineTo(centerX + offset, bottom);
        ctx.stroke();
      }

      ctx.globalAlpha = 1.0;
      ctx.setLineDash([]);

      // Partial % labels
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const padding = 3;
      const boxHeight = 14;
      const labelBoxY = isDraggingUp ? top - 4 - boxHeight : bottom + 4;
      const labelTextY = labelBoxY + boxHeight / 2;

      const bottomLabels = [
        { percent: 10, x: leftEdge, side: 'left' as const },
        { percent: 25, x: centerX - 165, side: 'left' as const },
        { percent: 50, x: centerX - 110, side: 'left' as const },
        { percent: 75, x: centerX - 55, side: 'left' as const },
        { percent: 100, x: centerX, side: 'center' as const },
        { percent: 75, x: centerX + 55, side: 'right' as const },
        { percent: 50, x: centerX + 110, side: 'right' as const },
        { percent: 25, x: centerX + 165, side: 'right' as const },
        { percent: 10, x: rightEdge, side: 'right' as const },
      ];

      for (const label of bottomLabels) {
        const text = label.percent + '%';
        const textWidth = ctx.measureText(text).width;
        const boxWidth = textWidth + padding * 2;
        const boxX = label.x - boxWidth / 2;

        const isHighlighted =
          label.percent === state.partialPercent &&
          (label.side === 'center' ||
            (label.side === 'right' && cursorOnRight) ||
            (label.side === 'left' && !cursorOnRight));

        if (isHighlighted) {
          ctx.fillStyle = color;
          ctx.globalAlpha = 0.3;
          ctx.fillRect(boxX, labelBoxY, boxWidth, boxHeight);
          ctx.globalAlpha = 1.0;
        }

        ctx.fillStyle = bgColor;
        ctx.fillRect(boxX, labelBoxY, boxWidth, boxHeight);
        ctx.strokeStyle = isHighlighted ? color : borderColor;
        ctx.lineWidth = 1;
        ctx.strokeRect(boxX, labelBoxY, boxWidth, boxHeight);
        ctx.fillStyle = isHighlighted ? color : '#787b86';
        ctx.fillText(text, label.x, labelTextY);
      }
    }

    // ========= Horizontal dashed line =========
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = color;
    ctx.globalAlpha = 1.0;
    const roundedBracketY = Math.round(bracketY);
    const lineStartX = !isPartialMode ? state.dragStartX : 0;
    ctx.beginPath();
    ctx.moveTo(lineStartX, roundedBracketY);
    ctx.lineTo(chartWidth, roundedBracketY);
    ctx.stroke();

    // ========= Main label (PnL | type | %) =========
    const labelParts = [pnlText, typeLabel, percentText].filter(Boolean);

    // Position label
    const cornerY = isPartialMode
      ? isDraggingUp
        ? top + 20
        : bottom - 20
      : isDraggingUp
        ? bracketY - 14
        : bracketY + 14;

    let cornerX: number;
    if (isPartialMode) {
      const offset =
        state.partialPercent === 100
          ? 0
          : state.partialPercent === 75
            ? 55
            : state.partialPercent === 50
              ? 110
              : state.partialPercent === 25
                ? 165
                : 220;
      if (offset === 0) {
        cornerX = centerX;
      } else {
        cornerX = cursorOnRight ? centerX + offset : centerX - offset;
      }
    } else {
      cornerX = state.dragStartX;
    }

    ctx.font = '11px sans-serif';
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    ctx.setLineDash([]);

    const sectionPadding = 10;
    const dividerWidth = 1;
    let totalWidth = 0;
    const sectionWidths = labelParts.map((part) => {
      const w = ctx.measureText(part).width + sectionPadding * 2;
      totalWidth += w;
      return w;
    });
    totalWidth += (labelParts.length - 1) * dividerWidth;

    const labelBoxHeight = 20;
    const labelBoxX = cornerX - totalWidth / 2;
    const mainLabelBoxY = cornerY - labelBoxHeight / 2;

    // Label background
    ctx.fillStyle = bgColor;
    ctx.fillRect(labelBoxX, mainLabelBoxY, totalWidth, labelBoxHeight);
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.strokeRect(labelBoxX, mainLabelBoxY, totalWidth, labelBoxHeight);

    // Draw each section with dividers
    let xOffset = labelBoxX;
    for (let i = 0; i < labelParts.length; i++) {
      const sectionWidth = sectionWidths[i];

      if (i > 0) {
        ctx.strokeStyle = color;
        ctx.globalAlpha = 0.4;
        ctx.beginPath();
        ctx.moveTo(xOffset, mainLabelBoxY + 3);
        ctx.lineTo(xOffset, mainLabelBoxY + labelBoxHeight - 3);
        ctx.stroke();
        ctx.globalAlpha = 1.0;
        xOffset += dividerWidth;
      }

      ctx.fillStyle = color;
      ctx.fillText(labelParts[i], xOffset + sectionWidth / 2, cornerY);
      xOffset += sectionWidth;
    }

    // ========= Vertical line and price offset labels =========
    if (state.entryPrice && state.price && height > 0) {
      const vertLineX = !isPartialMode ? state.dragStartX : rightEdge;
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.globalAlpha = 0.6;
      ctx.beginPath();
      ctx.moveTo(vertLineX, top);
      ctx.lineTo(vertLineX, bottom);
      ctx.stroke();
      ctx.globalAlpha = 1.0;
      ctx.setLineDash([]);

      ctx.textBaseline = 'middle';
      ctx.textAlign = 'left';
      ctx.font = '10px sans-serif';
      const rightLabelX = vertLineX + 6;

      const priceRange = state.price - state.entryPrice;
      const rightLabels = [
        { percent: 10, yRatio: 0.1 },
        { percent: 25, yRatio: 0.25 },
        { percent: 50, yRatio: 0.5 },
        { percent: 75, yRatio: 0.75 },
        { percent: 100, yRatio: 1.0 },
      ];

      for (const label of rightLabels) {
        let labelYPos = isDraggingUp ? bottom - height * label.yRatio : top + height * label.yRatio;

        if (label.percent === 100) {
          labelYPos += isDraggingUp ? 8 : -8;
        }

        const priceAtLevel = state.entryPrice + priceRange * label.yRatio;
        const percentOffset = ((priceAtLevel - state.entryPrice) / state.entryPrice) * 100;
        const sign = percentOffset >= 0 ? '' : '-';
        const text = sign + safeToFixed(Math.abs(percentOffset), 1) + '%';

        ctx.fillStyle = color;
        ctx.globalAlpha = 0.7;
        ctx.fillText(text, rightLabelX, labelYPos);
      }
      ctx.globalAlpha = 1.0;
    }

    ctx.restore();
  }

  /**
   * Update interactive line layer
   */
  private updateInteractiveLines(): void {
    if (this.priceLineManager?.isDragging()) {
      return;
    }
    this.priceLineManager?.update(this.labelBoundsCache, this.pendingOrders, {
      x: 0,
      y: 0,
      visible: false,
      color: '',
    });
  }
}
