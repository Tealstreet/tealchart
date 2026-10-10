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
import type { AnalysisSelectionFrame } from '../analysis/analysisSelection';
import type { HistoryBackfillDirection, HistoryBackfillRequestHint } from '../core/historyBackfill';
import type {
  DrawingCoordinateSpace,
  DrawingScreenPoint,
  UserDrawingAnchor,
  UserDrawingInputPoint,
  UserDrawingSelectionAtPointResult,
  UserDrawingSelectionInputOptions,
  UserDrawingState,
} from '../drawings';
import type {
  DrawingDragEventOptions,
  DrawingInputEventOptions,
  DrawingInputResult,
  CrosshairState as EventCrosshairState,
  PaneDividerInfo,
} from '../interaction/EventManager';
import type { BracketDragPreviewState } from '../rendering/bracketDragPreview';
import type { CanvasContext } from '../rendering/CanvasContext';
import type { DirtyFlags } from '../rendering/RenderScheduler';
import type { PlotStyleOverride } from '../state/chartState';

import Konva from 'konva';

import {
  DEFAULT_BUY_CANDLE_COLOR,
  DEFAULT_SELL_CANDLE_COLOR,
  DEFAULT_TRADE_LINE_FILLED_SEGMENT_TEXT_COLOR,
  PANE_DIVIDER_HIGHLIGHT_BAND,
  PANE_DIVIDER_HIGHLIGHT_LINE,
  STOP_LOSS_COLOR,
} from '../constants';
import {
  getUserDrawingPlacementMode,
  hitTestUserDrawings,
  isUserDrawingPathFamilyTool,
  renderUserDrawingLayer,
  resolveUserDrawingInputPointFromChart,
  resolveUserDrawingMagnetInputPoint,
  resolveUserDrawingPlacementConstraint,
} from '../drawings';
import { snapPriceToTick, snapTimeToInterval } from '../interaction/crosshairSnap';
import { EventManager } from '../interaction/EventManager';
import { getOemsOrderObjectId, getOemsPositionObjectId } from '../interaction/oemsLineState';
import { OemsTradingRuntime } from '../interaction/OemsTradingRuntime';
import { PriceLineManager } from '../interaction/PriceLineManager';
import { computePaneGeometry, computeTradingLineLabelMinX, WEB_CHART_CHROME_METRICS } from '../layout/chartGeometry';
import { drawBracketDragPreview } from '../rendering/bracketDragPreview';
import { drawJailbreakTooltipGroups } from '../rendering/jailbreakTooltips';
import { DIRTY } from '../rendering/RenderScheduler';
import { WebCanvasContext } from '../rendering/WebCanvasContext';
import { getDecimalPlacesFromPrecision } from '../state/chartState';
import { TealchartRenderer } from '../TealchartRenderer';
import {
  Awaitable,
  Bar,
  ChartMargins,
  ChartPane,
  ContextMenuCloseOptions,
  ContextMenuItem,
  ContextMenuRenderContext,
  DEFAULT_MARGINS,
  ExecutionLineRenderData,
  OemsActionResult,
  OrderLineRenderData,
  PaneLayout,
  PositionLineRenderData,
  PRICE_AXIS_RIGHT_PADDING,
  PriceLine,
  PriceLineLabelBounds,
  RenderOptions,
  ResolutionString,
  TIME_AXIS_HEIGHT,
  UnifiedPaneLayout,
  Viewport,
} from '../types';
import { dedupeBarsByTime } from '../utils/dedupeBars';
import { resolveWebPriceAxisLaneTagLayout } from '../utils/priceAxisTagSizing';
import { safeNum, safeToFixed } from '../utils/safeNumber';
import { tradingLineToBracketLines } from '../utils/tradeLineBrackets';
import { orderLineToPriceLine, positionLineToPriceLine } from '../utils/tradingPriceLines';
import { applyAutoScale, intervalToMs } from '../viewport/viewScale';
import { applyChromeThemeVars } from './chromeTheme';
import { button, div, icons } from './dom';
import { mountWebFloatingElement, positionFixedFloatingElement, resolveFixedFloatingPosition } from './FloatingLayer';
import { showWebOverlayError, type WebOverlayEnvironment, type WebOverlayHost, type WebOverlayHostFactory } from './OverlayHost';

// ============================================================================
// Types
// ============================================================================

export interface IndicatorPaneInfo {
  overlay: boolean;
  yAxisRange?: { min: number; max: number };
  explicitPlotZOrder?: boolean;
  format?: string;
  name?: string;
  precision?: number;
  scale?: string;
  inputs?: Record<string, unknown>;
}

export interface ChartCoreOptions {
  /** Container element */
  container: HTMLElement;
  overlayHost?: WebOverlayHostFactory;
  /** Initial width */
  width: number;
  /** Initial height */
  height: number;
  /** Active bar interval */
  interval?: ResolutionString;
  /** Render options for colors and styling */
  renderOptions?: Partial<RenderOptions>;
  /** Minimum x for chart-area trading labels after overlay chrome. */
  chartLabelMinX?: number;
  /** Custom margins */
  margins?: Partial<ChartMargins>;
  /** Callback when viewport changes */
  onViewportChange?: (viewport: Viewport) => void;
  /** Callback when more historical bars needed */
  onRequestMoreBars?: (direction: HistoryBackfillDirection, hint?: HistoryBackfillRequestHint) => void;
  /** Callback when order is moved via drag */
  onOrderMove?: (orderId: string, newPrice: number) => Awaitable<OemsActionResult>;
  /** Callback while an order is being dragged */
  onOrderMoving?: (orderId: string, newPrice: number) => Awaitable<OemsActionResult>;
  /** Callback when order cancel button clicked */
  onOrderCancel?: (orderId: string) => Awaitable<OemsActionResult>;
  /** Callback when position close button clicked */
  onPositionClose?: (positionId: string) => Awaitable<OemsActionResult>;
  /** Callback when position reverse button clicked */
  onPositionReverse?: (positionId: string) => Awaitable<OemsActionResult>;
  /** Context menu callback */
  onContextMenu?: (unixTime: number, price: number) => ContextMenuItem[];
  /**
   * Renders the whole menu instead of a list of items. Given one, the chart
   * places and dismisses it exactly as it would its own menu and draws nothing
   * inside it.
   */
  renderContextMenu?: (context: ContextMenuRenderContext) => HTMLElement | null;
  /**
   * Fired when a host-rendered menu is dismissed by anything other than the
   * host itself - an outside click, a new menu, teardown. Without it a host has
   * no way to know its content stopped being on screen, and keeps it alive.
   */
  onContextMenuClose?: () => void;
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
    options?: Pick<UserDrawingSelectionInputOptions, 'additive' | 'toggleSelected'>,
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
  /** Called when temporary measure drag starts */
  onUserDrawingMeasureStart?: (point: UserDrawingInputPoint) => boolean;
  /** Called while temporary measure drag moves */
  onUserDrawingMeasureMove?: (point: UserDrawingInputPoint) => boolean;
  /** Called when temporary measure drag ends */
  onUserDrawingMeasureEnd?: () => void;
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
  /** Selected bar time for numeric indicator readouts; undefined returns to the latest bar. */
  onIndicatorReadoutTimeChange?: (time?: number) => void;
  /** Called when pane heights change via divider drag */
  onPaneHeightsChange?: (heights: { paneId: string; heightRatio: number }[]) => void;
  /** Called when auto-scale should be disabled (user starts price axis zoom) */
  onAutoScaleDisabled?: (paneId: string) => void;
  /** Called when viewport is reset (re-enables auto-scale) */
  onResetViewport?: () => void;
  /** Returns whether auto-scale is active for a given pane */
  isAutoScale?: (paneId: string) => boolean;
  /** Called on double-click/double-tap on a pane */
  onPaneDoubleClick?: (
    paneId: string,
    point: DrawingScreenPoint,
    spacesByPaneId: ReadonlyMap<string, DrawingCoordinateSpace>,
  ) => void;
}

// ============================================================================
// Constants
// ============================================================================

// Pane overlays (the divider line + pane legends) sit on top of the drawn pane
// content, so they must use the renderer's computePanesLayout origin, which lays panes
// out from y=0 (candles draw behind the transparent top bar). Offsetting by margins.top
// would place them below the real pane boundary and content would bleed past the
// divider. The regression test in TealchartRenderer.test.ts locks these two origins
// together. (Drawing input + pane hit-testing still pass margins.top; those map screen
// points to prices and should also match the renderer, but reconciling them changes
// drawing placement and is tracked as a separate, verified follow-up.)
const PANE_OVERLAY_TOP_OFFSET = 0;

// TradingView-style blue resize highlight drawn over a hovered pane divider.

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
function resolvePositiveTradingColor(renderOptions?: Partial<RenderOptions> | null): string {
  return renderOptions?.upColor ?? DEFAULT_BUY_CANDLE_COLOR;
}

function resolveNegativeTradingColor(renderOptions?: Partial<RenderOptions> | null): string {
  return renderOptions?.downColor ?? DEFAULT_SELL_CANDLE_COLOR;
}

interface CrosshairPlusButtonBounds {
  hitBottom: number;
  hitLeft: number;
  hitRight: number;
  hitTop: number;
  r: number;
  x: number;
  y: number;
}

const CROSSHAIR_PRICE_LABEL_HEIGHT = 18;
const BRACKET_PREVIEW_LABEL_PADDING_X = 8;
const CROSSHAIR_PRICE_LABEL_HORIZONTAL_PADDING = 12;
const CROSSHAIR_PRICE_LABEL_WIDTH_GUARD = 2;
const CROSSHAIR_PLUS_BUTTON_RADIUS = 9;
const CROSSHAIR_PLUS_BUTTON_RIGHT_OFFSET = 11;
const CROSSHAIR_PLUS_BUTTON_LINE_GAP = 4;

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
  private contextMenuCloseHandler: ((e: MouseEvent) => void) | null = null;
  private contextMenuCloseTimer: ReturnType<typeof setTimeout> | null = null;
  // + button drawn on crosshair canvas — hit-test bounds for click detection
  private _plusButtonBounds: CrosshairPlusButtonBounds | null = null;
  private contextMenuResizeObserver: ResizeObserver | null = null;
  private contextMenuIsCustom = false;
  private contextMenuHost?: WebOverlayHost;
  private contextMenuEnvironment?: WebOverlayEnvironment;
  private contextMenuHostCleanup?: () => void;
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
  private jailbreakTooltipBarsCache: {
    source: Bar[];
    length: number;
    firstTime: number | undefined;
    lastTime: number | undefined;
    lastClose: number | undefined;
    barsInSeconds: Bar[];
  } | null = null;
  private viewport: Viewport | null = null;
  private priceLines: PriceLine[] = [];
  private get orderLines(): OrderLineRenderData[] {
    return this.tradingRuntime.getOrderLines();
  }
  private get positionLines(): PositionLineRenderData[] {
    return this.tradingRuntime.getPositionLines();
  }
  private executionLines: ExecutionLineRenderData[] = [];
  private plots: PlotOutput[] = [];
  private codedPlots: PlotOutput[] = [];
  private drawings: DrawingOutput[] = [];
  private userDrawingState: UserDrawingState | null = null;
  private userDrawingDraftPreviewAnchor: UserDrawingAnchor | null = null;
  private userDrawingMeasureLastPoint: UserDrawingInputPoint | null = null;
  private paneLayout: PaneLayout | undefined;
  private unifiedPaneLayout: UnifiedPaneLayout | undefined;
  private indicatorPaneInfo: Record<string, IndicatorPaneInfo> = {};
  private plotStyleOverrides: Map<string, PlotStyleOverride> = new Map();

  // State
  private readonly tradingRuntime: OemsTradingRuntime;
  private get oemsActions() {
    return this.tradingRuntime.oemsActions;
  }
  // Keeps a dragged line on the chart while its row is out of the feed, and
  // retires the hold when a matching row returns under any id. See the
  // optimistic-holding section of this package's CLAUDE.md.
  private paneYOverrides = new Map<string, { yMin: number; yMax: number }>();
  /** Auto-scale computed Y ranges from AutoScaleManager (set by TealchartWidget each render) */
  private autoScalePaneYRanges = new Map<string, { yMin: number; yMax: number }>();
  private crosshair: EventCrosshairState = { visible: false, x: 0, y: 0 };
  /** Widest crosshair price seen, an input to the axis width and nothing else. */
  private crosshairPriceLabelMeasuredWidth = 0;
  private hoveredPaneDivider: PaneDividerInfo | null = null;
  private showResetButton = false;
  private resetButtonTimer: ReturnType<typeof setTimeout> | null = null;
  private cursor = 'crosshair';
  private requestedCursor = 'crosshair';

  // Bracket drag preview state (TP/SL drag visualization on crosshair canvas)
  private _bracketDragState: BracketDragPreviewState | null = null;

  // Collision offset cache — keyed by geometry (IDs + prices + viewport).
  // Stores only the de-overlap offset per line, NOT label content.
  // Label content is always built fresh from current line data.
  private collisionOffsetCache = new Map<string, number>();
  private lastCollisionKey = '';
  private lastCollisionUpdate = 0;
  private labelBoundsCache: PriceLineLabelBounds[] = [];

  // RAF for full renders
  private rafId: number | null = null;

  private applyCursor(cursor: string): void {
    this.requestedCursor = cursor;
    this.applyResolvedCursor();
  }

  private resolveCursor(): string {
    // Cursor priority is centralized here: active gestures lock the cursor,
    // then price-line drags, then passive hover intent.
    const activeGestureCursor = this.eventManager?.getActiveCursor();
    if (activeGestureCursor) return activeGestureCursor;
    if (this.priceLineManager?.isDragging()) return 'grabbing';
    if (this.requestedCursor === 'pointer' || this.requestedCursor === 'crosshair') {
      return this.getKonvaCursorAt(this.crosshair.x, this.crosshair.y) ?? this.requestedCursor;
    }
    return this.requestedCursor;
  }

  private applyResolvedCursor(): void {
    const nextCursor = this.resolveCursor();

    this.cursor = nextCursor;
    if (this.chartContainer.style.cursor !== nextCursor) {
      this.chartContainer.style.cursor = nextCursor;
    }
    if (this.stage) {
      const stageContainer = this.stage.container();
      if (stageContainer.style.cursor !== nextCursor) {
        stageContainer.style.cursor = nextCursor;
      }
    }
  }

  constructor(options: ChartCoreOptions) {
    this.options = options;
    this.container = options.container;
    this.margins = { ...DEFAULT_MARGINS, ...options.margins };
    this.tradingRuntime = new OemsTradingRuntime({
      priceTolerance: () => this.options.renderOptions?.pricePrecision ?? 0,
      onChange: () => this.scheduleRender(),
      onOrderMove: (id, price) => this.options.onOrderMove?.(id, price),
      onOrderCancel: (id) => this.options.onOrderCancel?.(id),
      onPositionClose: (id) => this.options.onPositionClose?.(id),
      onPositionReverse: (id) => this.options.onPositionReverse?.(id),
    });

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
        chartLabelMinX: this.getChartLabelMinX(),
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
          formatPrice: (price) => this.formatAxisTagPrice(price),
          growPriceAxisTagWidth: (bound, text) =>
            this.renderer.growPriceLineAxisLabelWidth({ id: bound.lineId, type: bound.type }, text),
          onOrderMoving: (orderId, newPrice) => this.options.onOrderMoving?.(orderId, newPrice),
          onOrderCancel: (orderId) => this.handleOrderCancel(orderId),
          onPositionClose: (positionId) => this.handlePositionClose(positionId),
          onPositionReverse: (positionId) => this.handlePositionReverse(positionId),
          onTPDragEnd: (bound, price, partialPercent) => this.handleBracketMoveEnd('tp', bound, price, partialPercent),
          onSLDragEnd: (bound, price, partialPercent) => this.handleBracketMoveEnd('sl', bound, price, partialPercent),
          onTPClick: (bound) => this.handleBracketClick('tp', bound),
          onSLClick: (bound) => this.handleBracketClick('sl', bound),
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
          chartLabelMinX: this.getChartLabelMinX(),
          onCursorChange: (cursor) => this.applyCursor(cursor),
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
      getIntervalMs: () => intervalToMs(this.options.interval ?? '60'),
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
      onPaneDividerHover: (divider) => {
        const changed =
          (this.hoveredPaneDivider?.dividerIndex ?? -1) !== (divider?.dividerIndex ?? -1) ||
          (this.hoveredPaneDivider?.y ?? -1) !== (divider?.y ?? -1);
        this.hoveredPaneDivider = divider;
        if (changed) this.renderCrosshairOverlay();
      },
      onPaneHeightsChange: (heights) => {
        // The widget owns pane heights; it writes them into the pane manager
        // and pushes the layout back. Keeping a second copy here is what made a
        // maximize invisible behind the heights a drag had left.
        this.options.onPaneHeightsChange?.(heights);
        this.scheduleRender();
      },
      isOverInteractiveElement: (x, y) => {
        // The + button is canvas-drawn, so it has no element to take the press
        // and this is what keeps a click on it from starting a pan.
        if (this.isOverCrosshairPlusButton(x, y)) return true;
        const priceLineHit = this.priceLineManager?.updateHoverAt(x, y) ?? null;
        if (!priceLineHit) {
          this.priceLineManager?.clearHover();
        }
        return this.isOverKonvaInteractiveElement(x, y);
      },
      isOverCrosshairChrome: (x, y) => this.isOverCrosshairPlusButton(x, y),
      isOverUnlockedUserDrawing: (x, y) => this.isOverUnlockedUserDrawing(x, y),
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
      onRequestMoreBars: (dir, hint) => {
        // Only request more bars if viewport is actually before the earliest bar
        // This matches React's behavior - prevents loading history on every left pan
        const requestedViewport = hint?.viewport ?? this.viewport;
        if (dir === 'left' && this.bars.length > 0 && requestedViewport) {
          if (requestedViewport.startTime < this.bars[0].time) {
            this.options.onRequestMoreBars?.(dir, hint ?? { viewport: requestedViewport });
          }
        } else {
          this.options.onRequestMoreBars?.(dir, hint);
        }
      },
      snapCrosshairPoint: (x, y) => this.resolveSnappedCrosshairPoint(x, y),
      onCrossHairMoved: (x, y, options) => {
        this.crosshair = { visible: true, x, y };
        // Preview the in-progress click-placed drawing following the cursor between clicks.
        const draftTool = this.userDrawingState?.draft?.tool;
        if (draftTool && getUserDrawingPlacementMode(draftTool) === 'click') {
          const previewPoint = this.resolveUserDrawingInputPoint(x, y);
          // Clear the preview when the cursor is over an unresolvable region so it never sticks.
          this.userDrawingDraftPreviewAnchor = previewPoint
            ? this.resolveConstrainedUserDrawingPlacementPoint(previewPoint, options).anchor
            : null;
          this.scheduleRender();
        }
        const price = this.renderer.publicYToPriceWithLayout(
          y,
          this.viewport ?? TealchartRenderer.calculateViewport(this.bars),
          this.getUnifiedLayout(),
        );
        const time = this.renderer.publicXToTime(x, this.viewport ?? TealchartRenderer.calculateViewport(this.bars));
        this.options.onCrossHairMoved?.(price, time);
        this.options.onIndicatorReadoutTimeChange?.(time);
      },
      onCrossHairVisibilityChange: (visible) => {
        this.crosshair = { ...this.crosshair, visible };
        if (!visible) this.options.onIndicatorReadoutTimeChange?.();
      },
      onMouseDown: () => this.options.onMouseDown?.(),
      onMouseUp: () => this.options.onMouseUp?.(),
      onChartSurfaceClick: () => this.priceLineManager?.clearSelectedLine(),
      onContextMenu: (x, y, price, time) => this.handleContextMenu(x, y, price, time),
      onRender: () => this.scheduleRender(),
      onCrosshairRender: () => {
        // Called from within RAF (EventManager defers mousemove to RAF).
        // Render directly — no need to schedule another RAF frame.
        // Price label is drawn on canvas — zero DOM mutations.
        this.renderCrosshairOverlay();
        if (this.eventManager.getIsDragging()) return;
        // Pointer cursor over canvas-drawn + button
        if (this._plusButtonBounds) {
          const overPlus = this.isOverCrosshairPlusButton(this.crosshair.x, this.crosshair.y);
          const wantCursor =
            overPlus || this.isOverUnlockedUserDrawing(this.crosshair.x, this.crosshair.y) ? 'pointer' : 'crosshair';
          if (this.cursor !== wantCursor) {
            this.applyCursor(wantCursor);
          }
        }
      },
      onCursorChange: (cursor) => this.applyCursor(cursor),
      onPaneDoubleClick: (paneId, point) => {
        if (!this.viewport) return;
        // Double-clicking the price axis resets the view — the same outcome as
        // the reset button, reached from the axis the user was just scaling.
        // Checked before the drawing intent, which has nothing to find out here.
        if (this.isOverPriceAxis(point.x)) {
          this.resetViewport();
          return;
        }
        this.options.onPaneDoubleClick?.(paneId, point, this.getUserDrawingSpaces(this.viewport));
      },
    });

    // Click listener for canvas-drawn + button (stored for cleanup in dispose)
    this.plusButtonClickHandler = (e: MouseEvent) => {
      if (!this._plusButtonBounds || !this.hasContextMenu()) return;
      const rect = this.chartContainer.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const b = this._plusButtonBounds;
      if (this.isOverCrosshairPlusButton(x, y)) {
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
        this.handleContextMenu(rect.left + b.x, rect.top + b.y, price, time, 'crosshairButton');
      }
    };
    this.chartContainer.addEventListener('click', this.plusButtonClickHandler);

    // Create reset button
    this.createResetButton();

    // Set cursor style
    this.chartContainer.style.cursor = this.cursor;
  }

  private getChartLabelMinX(): number {
    return this.options.chartLabelMinX ?? computeTradingLineLabelMinX(WEB_CHART_CHROME_METRICS, this.margins);
  }

  // ============================================================================
  // Public API
  // ============================================================================

  /**
   * Set bar data
   * Uses reference equality check - bars array is always new when data changes
   */
  setBars(bars: Bar[]): void {
    this.jailbreakTooltipBarsCache = null;
    // Reference check — skip if same array. Real-time ticks mutate the widget's
    // shared bar array in place, so this is called with the same reference and
    // the render still runs (paint() calls renderMainCanvas regardless).
    if (bars === this.bars) return;

    // Render-source guard: dedupe duplicate/out-of-order timestamps so candles never
    // draw as overlapping bodies, regardless of which feed path produced the array.
    this.bars = dedupeBarsByTime(bars, 'render bars');
    if (this.bars.length > 0 && !this.viewport) {
      // Use the normalized bars: calculateViewport slices the trailing bars, which is
      // only the newest candles when the array is sorted.
      this.viewport = TealchartRenderer.calculateViewport(this.bars);
    }
    // No scheduleRender — paint() is called by the widget after pushing state
  }

  /**
   * Set viewport
   */
  setViewport(viewport: Viewport): void {
    this.viewport = viewport;
    // No scheduleRender — paint() is called by the widget after pushing state
  }

  setInterval(interval: ResolutionString): void {
    this.options.interval = interval;
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
  setOrderLines(lines: OrderLineRenderData[]): void {
    if (this.eventManager.getIsDragging() || this.priceLineManager?.isDragging()) return;
    this.tradingRuntime.setOrderLines(lines);
    // No scheduleRender — paint() is called by the widget after pushing state
  }

  /**
   * Set position lines
   * Reference equality check - skip if same array
   * Skips updates during drag since positions don't change while dragging chart
   */
  setPositionLines(lines: PositionLineRenderData[]): void {
    if (this.eventManager.getIsDragging() || this.priceLineManager?.isDragging()) return;
    this.tradingRuntime.setPositionLines(lines);
    // No scheduleRender — paint() is called by the widget after pushing state
  }

  private getOrderObjectId(line: OrderLineRenderData): string {
    return getOemsOrderObjectId(line);
  }
  private getPositionObjectId(line: PositionLineRenderData): string {
    return getOemsPositionObjectId(line);
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
    if (plots === this.codedPlots) return;
    this.codedPlots = plots;
    this.applyPlotDisplayOverrides();
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
      this.userDrawingMeasureLastPoint = null;
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
    this.applyPlotDisplayOverrides();
    // No scheduleRender — paint() is called by the widget after pushing state
  }

  getPlots(): readonly PlotOutput[] {
    return this.plots;
  }

  private applyPlotDisplayOverrides(): void {
    this.plots = this.codedPlots.map((plot) => {
      const display = plot.editable === false ? undefined : this.plotStyleOverrides.get(plot.id)?.display;
      return display === undefined ? plot : { ...plot, display };
    });
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

  setChartLabelMinX(chartLabelMinX: number | undefined): void {
    if (this.options.chartLabelMinX === chartLabelMinX) return;
    this.options.chartLabelMinX = chartLabelMinX;
    const resolvedChartLabelMinX = this.getChartLabelMinX();
    this.renderer.setOptions({ chartLabelMinX: resolvedChartLabelMinX });
    this.priceLineManager?.setChartLabelMinX(resolvedChartLabelMinX);
    this.scheduleRender();
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
    // Konva stops redrawing a layer's hit graph while anything on it is being
    // dragged, so every hit test taken during a trading-line drag reads the
    // graph as it was before the drag started. The crosshair's own hit test is
    // one of those: it found nothing under the cursor, concluded the pointer
    // was over empty plot, and stayed visible for the whole drag - hidden only
    // by the gate ChartCore applies while a line is dragging. Releasing lifted
    // that gate a frame before any mouse move could correct it, and the
    // crosshair flashed. The layer holds a handful of trading lines, so keeping
    // its hit graph live through a drag is cheap.
    Konva.hitOnDragEnabled = true;

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
    return hit !== null && hit.listening() && !this.isPassiveCrosshairHit(hit);
  }

  private getKonvaCursorAt(x: number, y: number): string | null {
    if (!this.stage) return null;
    const hit = this.stage.getIntersection({ x, y });
    if (hit === null || !hit.listening() || this.isPassiveCrosshairHit(hit)) return null;

    let node: Konva.Node | null = hit;
    while (node && node !== this.stage) {
      const cursor = node.getAttr('tealchartCursor');
      if (typeof cursor === 'string') return cursor;
      if (node.draggable()) return 'grab';
      node = node.getParent();
    }
    return null;
  }

  private isPassiveCrosshairHit(hit: Konva.Node): boolean {
    let node: Konva.Node | null = hit;
    while (node && node !== this.stage) {
      if (node.getAttr('tealchartPassiveCrosshairHit') === true) return true;
      node = node.getParent();
    }
    return false;
  }

  /** True when hovering a grabbable (unlocked) drawing in select mode — for the cursor. */
  /** The + button is click chrome, but not crosshair-suppressing chrome. */
  private isOverCrosshairPlusButton(x: number, y: number): boolean {
    const bounds = this._plusButtonBounds;
    if (!bounds) return false;
    if (x >= bounds.hitLeft && x <= bounds.hitRight && y >= bounds.hitTop && y <= bounds.hitBottom) {
      return true;
    }
    const dx = x - bounds.x;
    const dy = y - bounds.y;
    return dx * dx + dy * dy <= bounds.r * bounds.r;
  }

  private isOverUnlockedUserDrawing(x: number, y: number): boolean {
    const state = this.userDrawingState;
    if (!state || state.activeTool !== 'select' || !this.viewport) return false;
    const drawings = state.drawings;
    if (!drawings || drawings.length === 0) return false;
    const hit = hitTestUserDrawings(drawings, { x, y }, this.getUserDrawingSpaces(this.viewport), {
      labelHeight: 20,
    });
    return hit !== null && !hit.drawing.locked;
  }

  private handleOrderMove(id: string, price: number): void {
    this.tradingRuntime.handleOrderMove(id, price);
  }
  private handleOrderCancel(id: string): void {
    this.tradingRuntime.handleOrderCancel(id);
  }
  private handlePositionClose(id: string): void {
    this.tradingRuntime.handlePositionClose(id);
  }
  private handlePositionReverse(id: string): void {
    this.tradingRuntime.handlePositionReverse(id);
  }
  private handleBracketMoveEnd(
    type: 'tp' | 'sl',
    bound: PriceLineLabelBounds,
    price: number,
    partialPercent?: number,
  ): void {
    this.tradingRuntime.handleBracketMoveEnd(type, bound, price, partialPercent);
  }
  private handleBracketClick(type: 'tp' | 'sl', bound: PriceLineLabelBounds): void {
    this.tradingRuntime.handleBracketClick(type, bound);
  }

  private getBoundTradingObject(bound: PriceLineLabelBounds) {
    return this.tradingRuntime.getBoundTradingObject(bound);
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

  /** Whether an x coordinate falls in the right-hand price axis. */
  isOverPriceAxis(x: number): boolean {
    return x >= this.options.width - this.margins.right;
  }

  /**
   * Reset viewport to auto-scale
   */
  resetViewport(): void {
    this.viewport = TealchartRenderer.calculateViewport(this.bars);
    this.paneYOverrides.clear();
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
   * Pixel top of each indicator pane, from the same geometry the canvas renders
   * (height overrides applied). Used to keep pane legends aligned during resize.
   */
  getIndicatorPaneTops(): { paneId: string; top: number }[] {
    const panes = computePaneGeometry({
      paneLayout: this.getUnifiedLayout(),
      height: this.options.height,
      topOffset: PANE_OVERLAY_TOP_OFFSET,
    });
    return panes.filter((pane) => pane.type === 'indicator').map((pane) => ({ paneId: pane.id, top: pane.top }));
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
    this.closeContextMenu();
    this.eventManager.dispose();
    this.tradingRuntime.dispose();
    this.priceLineManager?.dispose();
    this.stage?.destroy();
    if (!preserveDom) {
      this.chartContainer.remove();
    }
    // When preserveDom is true, old DOM stays visible until new widget paints first frame
  }

  // ============================================================================
  // Private: Pane Divider Highlight
  // ============================================================================

  /**
   * TradingView-style resize highlight: a soft halo band plus a solid line drawn
   * over a hovered pane divider. Rendered on the crosshair overlay canvas.
   */
  private drawPaneDividerHighlight(ctx: CanvasRenderingContext2D, y: number, width: number): void {
    ctx.save();
    ctx.fillStyle = PANE_DIVIDER_HIGHLIGHT_BAND;
    ctx.fillRect(0, y - 3, width, 6);
    ctx.strokeStyle = PANE_DIVIDER_HIGHLIGHT_LINE;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
    ctx.restore();
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

    // Create circular hover zone (larger than button for easier targeting).
    // Must sit above the chart canvas + Konva interactive layer (z-index 2) and
    // crosshair overlay (z-index 3) so it actually receives hover; just below the
    // button (z-index 10). Pointer events still bubble to chartContainer, so this
    // does not block panning/crosshair.
    this.resetButtonHoverZone = div({
      style: {
        position: 'absolute',
        width: '100px',
        height: '100px',
        borderRadius: '50%',
        zIndex: '9',
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
    const bottomY = this.options.height - this.margins.bottom - 30;

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

  setContextMenuCloseHandler(handler: () => void): void {
    this.options.onContextMenuClose = handler;
  }

  setContextMenuRenderer(renderer: (context: ContextMenuRenderContext) => HTMLElement | null): void {
    this.options.renderContextMenu = renderer;
    // The "+" is drawn only when a menu exists, so a renderer registered after
    // init has to repaint to appear at all.
    this.scheduleRender();
  }

  private hasContextMenu(): boolean {
    return !!this.options.onContextMenu || !!this.options.renderContextMenu;
  }

  private handleContextMenu(
    screenX: number,
    screenY: number,
    price: number,
    time: number,
    placement: 'default' | 'crosshairButton' = 'default',
  ): void {
    const drawingItems =
      this.viewport && this.userDrawingState?.activeTool === 'select'
        ? this.options.onUserDrawingContextMenu?.({ x: screenX, y: screenY }, this.getUserDrawingSpaces(this.viewport))
        : undefined;
    // Only the "+" button. Right-click and long-press arrive here too, and a
    // host that renders a quick-order widget for the button has not asked to
    // replace those. A drawing's own menu still wins over both.
    const custom =
      placement !== 'crosshairButton' || (drawingItems && drawingItems.length > 0)
        ? null
        : (this.options.renderContextMenu?.({
            anchorX: screenX,
            anchorY: screenY,
            close: (closeOptions) => this.closeContextMenu(closeOptions),
            price,
            unixTime: time,
          }) ?? null);
    const items = custom
      ? []
      : ((drawingItems && drawingItems.length > 0 ? drawingItems : this.options.onContextMenu?.(time, price)) ?? []);
    // Replacing a menu, not dismissing one - the crosshair this menu is
    // anchored to has to survive the swap.
    this.closeContextMenu({ retainCrosshair: true });
    if (!custom && items.length === 0) return;

    // Create menu
    this.contextMenu = div({
      style: custom
        ? { position: 'fixed', left: `${screenX}px`, top: `${screenY}px`, zIndex: '1000' }
        : {
            position: 'fixed',
            left: `${screenX}px`,
            top: `${screenY}px`,
            backgroundColor: 'var(--tc-menu-bg, var(--tc-canvas-bg, #1e222d))',
            border: '1px solid var(--tc-border, #363a45)',
            borderRadius: '4px',
            padding: '4px 0',
            zIndex: '1000',
            minWidth: '150px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
          },
    });
    // Portaled to document.body, so it can't inherit the widget root's theme vars.
    applyChromeThemeVars(this.contextMenu, this.options.renderOptions);
    this.contextMenu.addEventListener('mousedown', (event) => event.stopPropagation());
    this.contextMenu.addEventListener('mouseup', (event) => event.stopPropagation());
    if (custom) {
      // Nothing above a host's own box is ours to swallow: React delegates at
      // its root container, and a click that never reaches it is a dead button.
      // Outside-click dismissal reads `contains`, not propagation, so it holds.
      this.contextMenuIsCustom = true;
      this.eventManager.setCrosshairPinned(true);
      this.contextMenu.appendChild(custom);
    } else {
      this.contextMenu.addEventListener('click', (event) => event.stopPropagation());
      this.contextMenu.addEventListener('contextmenu', (event) => event.stopPropagation());
    }

    for (const item of items) {
      const menuItem = div({
        style: {
          padding: '8px 12px',
          fontSize: '12px',
          color: 'var(--tc-text, #d1d4dc)',
          cursor: item.enabled === false ? 'default' : 'pointer',
          opacity: item.enabled === false ? '0.5' : '1',
        },
        text: item.text,
        onClick: (event) => {
          event.stopPropagation();
          if (item.enabled === false) return;
          item.click();
          this.closeContextMenu();
        },
        onMouseEnter: (e) => {
          if (item.enabled === false) return;
          (e.target as HTMLElement).style.backgroundColor = 'var(--tc-hover-bg, rgba(255, 255, 255, 0.05))';
        },
        onMouseLeave: (e) => {
          (e.target as HTMLElement).style.backgroundColor = 'transparent';
        },
      });
      this.contextMenu.appendChild(menuItem);
    }

    if (this.options.overlayHost) {
      this.mountHostedContextMenu(this.contextMenu, screenX, screenY, placement);
      return;
    }
    mountWebFloatingElement(this.contextMenu);
    this.positionContextMenu(screenX, screenY, placement);
    // Host content is commonly mounted a tick later - a React root rendering
    // into the element we just returned measures zero until it does.
    if (custom && typeof ResizeObserver !== 'undefined') {
      this.contextMenuResizeObserver = new ResizeObserver(() => this.positionContextMenu(screenX, screenY, placement));
      this.contextMenuResizeObserver.observe(this.contextMenu);
    }

    // Close on click outside
    this.contextMenuCloseHandler = (e: MouseEvent) => {
      if (this.contextMenu && !this.contextMenu.contains(e.target as Node)) {
        this.closeContextMenu();
      }
    };
    this.contextMenuCloseTimer = setTimeout(() => {
      this.contextMenuCloseTimer = null;
      if (!this.contextMenu || !this.contextMenuCloseHandler) return;
      document.addEventListener('click', this.contextMenuCloseHandler);
    }, 0);
  }

  private mountHostedContextMenu(menu: HTMLDivElement, x: number, y: number, placement: 'default' | 'crosshairButton'): void {
    const fail = (error: string) => queueMicrotask(() => {
      if (this.contextMenu !== menu) return;
      showWebOverlayError(this.container, error);
      this.closeContextMenu();
    });
    try {
      const host = this.options.overlayHost!({ kind: 'floating', source: this.container, onError: fail });
      this.contextMenuHost = host;
      void host.ready.then((environment) => {
        if (this.contextMenu !== menu || this.contextMenuHost !== host) return;
        this.contextMenuEnvironment = environment;
        environment.portalRoot.append(menu);
        this.positionContextMenu(x, y, placement);
        host.setContent(menu);
        this.contextMenuHostCleanup = host.subscribeInput((input) => {
          if ((input.type === 'pointerdown' && !input.inside) ||
            (input.type === 'keydown' && ((input.inside && (!input.sourceId || input.sourceId === host.surfaceId)) ||
              (input.event.target as Node | null)?.ownerDocument === environment.sourceWindow.document) &&
              (input.event as KeyboardEvent).key === 'Escape')) {
            if (input.type === 'keydown') input.event.preventDefault();
            this.closeContextMenu();
          }
        });
        const Resize = (environment.window as Window & typeof globalThis).ResizeObserver;
        if (Resize) {
          this.contextMenuResizeObserver = new Resize(() => this.positionContextMenu(x, y, placement));
          this.contextMenuResizeObserver.observe(menu);
        }
      }).catch((error: unknown) => fail(error instanceof Error ? error.message : String(error)));
    } catch (error) { fail(error instanceof Error ? error.message : String(error)); }
  }

  private positionContextMenu(screenX: number, screenY: number, placement: 'default' | 'crosshairButton'): void {
    if (!this.contextMenu) return;
    const rect = this.contextMenu.getBoundingClientRect();
    const menuWidth = rect.width || 150;
    const menuHeight = rect.height || this.contextMenu.offsetHeight || 0;
    const gap = 6;
    const anchor = this.contextMenuHost?.sourcePoint({ clientX: screenX, clientY: screenY }) ?? { x: screenX, y: screenY };
    const desiredLeft = placement === 'crosshairButton' ? anchor.x - menuWidth - gap : anchor.x;
    const desiredTop = placement === 'crosshairButton' ? anchor.y + gap : anchor.y;

    if (this.contextMenuEnvironment) {
      const environment = this.contextMenuEnvironment;
      const position = resolveFixedFloatingPosition({ desiredLeft, desiredTop, width: menuWidth, height: menuHeight,
        viewport: { width: environment.sourceWindow.innerWidth, height: environment.sourceWindow.innerHeight } });
      const target = environment.targetPoint({ x: position.left, y: position.top });
      this.contextMenu.style.left = `${target.x}px`;
      this.contextMenu.style.top = `${target.y}px`;
      return;
    }

    positionFixedFloatingElement(this.contextMenu, {
      desiredLeft,
      desiredTop,
      fallbackWidth: menuWidth,
      fallbackHeight: menuHeight,
      margin: 8,
    });
  }

  private closeContextMenu(options?: ContextMenuCloseOptions): void {
    const hadCustomMenu = this.contextMenuIsCustom;
    this.contextMenuIsCustom = false;
    this.contextMenuHostCleanup?.();
    this.contextMenuHostCleanup = undefined;
    this.contextMenuHost?.dispose();
    this.contextMenuHost = undefined;
    this.contextMenuEnvironment = undefined;
    if (this.contextMenuCloseTimer) {
      clearTimeout(this.contextMenuCloseTimer);
      this.contextMenuCloseTimer = null;
    }
    if (this.contextMenuCloseHandler) {
      document.removeEventListener('click', this.contextMenuCloseHandler);
      this.contextMenuCloseHandler = null;
    }
    this.contextMenuResizeObserver?.disconnect();
    this.contextMenuResizeObserver = null;
    this.contextMenu?.remove();
    this.contextMenu = null;
    if (!hadCustomMenu) return;
    this.eventManager.setCrosshairPinned(false);
    // A dismissal drops the crosshair the way leaving the chart would have;
    // a completed quick order keeps it, so its "+" is ready for the next one.
    if (!options?.retainCrosshair) this.eventManager.hideCrosshair();
    this.options.onContextMenuClose?.();
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

  private resolveSnappedCrosshairPoint(x: number, y: number): { x: number; y: number } {
    const viewport = this.viewport;
    if (!viewport) return { x, y };

    const layout = this.getUnifiedLayout();
    const intervalMs = intervalToMs(this.options.interval ?? '60');
    const snappedTime = snapTimeToInterval(this.renderer.publicXToTime(x, viewport), intervalMs);
    const snappedX = this.renderer.publicTimeToX(snappedTime, viewport);
    const panes = computePaneGeometry({
      paneLayout: layout,
      height: this.options.height,
      topOffset: this.margins.top,
    });
    const pane = panes.find((candidate) => y >= candidate.top && y < candidate.bottom);
    if (pane?.id !== 'main') return { x: snappedX, y };

    const pricePrecision = this.options.renderOptions?.pricePrecision;
    const snappedPrice = snapPriceToTick(this.renderer.publicYToPriceWithLayout(y, viewport, layout), pricePrecision);
    return {
      x: snappedX,
      y: this.renderer.publicPriceToYWithLayout(snappedPrice, viewport, layout),
    };
  }

  private handleUserDrawingInput(
    x: number,
    y: number,
    source: 'mouse' | 'touch' = 'mouse',
    options: { additiveSelection?: boolean; constrainedPlacement?: boolean } = {},
  ): DrawingInputResult {
    if (!this.viewport) return false;

    if (this.userDrawingState?.activeTool === 'select') {
      const chartLeft = this.margins.left;
      const chartRight = this.options.width;
      if (x < chartLeft || x >= chartRight || !this.getPaneAtY(y)) return false;

      const selection = this.options.onUserDrawingSelection?.({ x, y }, this.getUserDrawingSpaces(this.viewport), {
        additive: options.additiveSelection,
        toggleSelected: source === 'touch',
      });
      return source === 'touch' && (selection?.hit === true || selection?.changed === true)
        ? { handled: true, allowPaneDoubleClick: true }
        : false;
    }

    if (!this.options.onUserDrawingInput) return false;

    const point = this.resolveUserDrawingInputPoint(x, y);
    if (!point) return false;
    return this.options.onUserDrawingInput(this.resolveConstrainedUserDrawingPlacementPoint(point, options));
  }

  private resolveUserDrawingInputPoint(
    x: number,
    y: number,
    options?: Pick<DrawingDragEventOptions, 'pressure'>,
  ): UserDrawingInputPoint | null {
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
    const inputPane = panes.find((pane) => pane.id === point.paneId);
    const anchor =
      options?.pressure === undefined
        ? point.anchor
        : {
            ...point.anchor,
            pressure: options.pressure,
          };
    const inputPoint = {
      ...point,
      anchor,
      bars: sourcePane?.type === 'main' && this.bars.length > 0 ? this.bars : undefined,
    };
    if (
      !inputPane ||
      (this.userDrawingState?.magnetMode ?? 'off') === 'off' ||
      !this.userDrawingState ||
      isUserDrawingPathFamilyTool(this.userDrawingState.activeTool)
    ) {
      return inputPoint;
    }

    return resolveUserDrawingMagnetInputPoint({
      mode: this.userDrawingState.magnetMode,
      point: inputPoint,
      screenPoint: { x, y },
      space: {
        viewport: this.viewport,
        pane: inputPane,
        chartLeft: this.margins.left,
        // Match the candle/drawing time->x scale (full width) so magnet snapping lands on candles.
        chartRight: this.options.width,
        bars: inputPoint.bars,
      },
    });
  }

  private resolveConstrainedUserDrawingPlacementPoint(
    point: UserDrawingInputPoint,
    options?: DrawingDragEventOptions | DrawingInputEventOptions,
  ): UserDrawingInputPoint {
    if (!this.viewport || !this.userDrawingState) return point;
    return resolveUserDrawingPlacementConstraint({
      tool: this.userDrawingState.activeTool,
      // Click placement constrains the pending anchor relative to the last-placed draft point.
      startPoint: this.resolveClickPlacementConstraintStartPoint(),
      currentPoint: point,
      spacesByPaneId: this.getUserDrawingSpaces(this.viewport),
      options,
    });
  }

  private resolveClickPlacementConstraintStartPoint(): UserDrawingInputPoint | null {
    const draft = this.userDrawingState?.draft;
    if (!draft || draft.anchors.length === 0) return null;
    return { paneId: draft.paneId, anchor: draft.anchors[draft.anchors.length - 1]! };
  }

  private handleUserDrawingDragStart(x: number, y: number, options?: DrawingDragEventOptions): boolean {
    if (!this.viewport) return false;

    if (this.userDrawingState?.measureMode === 'on') {
      const point = this.resolveUserDrawingInputPoint(x, y);
      if (!point || this.options.onUserDrawingMeasureStart?.(point) !== true) return false;
      this.userDrawingMeasureLastPoint = point;
      this.scheduleRender();
      return true;
    }

    if (this.userDrawingState && isUserDrawingPathFamilyTool(this.userDrawingState.activeTool)) {
      const point = this.resolveUserDrawingInputPoint(x, y, options);
      return point ? this.options.onUserDrawingPathDragStart?.(point) === true : false;
    }

    if (this.userDrawingState?.activeTool !== 'select') return false;

    const chartLeft = this.margins.left;
    const chartRight = this.options.width - this.margins.right;
    if (x < chartLeft || x >= chartRight || !this.getPaneAtY(y)) return false;

    return this.options.onUserDrawingEditStart?.({ x, y }, this.getUserDrawingSpaces(this.viewport), options) === true;
  }

  private handleUserDrawingDragPending(x: number, y: number): boolean {
    if (!this.viewport || !this.userDrawingState) {
      return false;
    }

    if (this.userDrawingState.measureMode === 'on') {
      return (
        !!this.options.onUserDrawingMeasureStart &&
        !!this.options.onUserDrawingMeasureMove &&
        !!this.options.onUserDrawingMeasureEnd &&
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

    if (this.userDrawingState?.measureMode === 'on') {
      const point = this.resolveUserDrawingInputPoint(x, y);
      if (!point || !this.userDrawingMeasureLastPoint) return false;
      this.userDrawingMeasureLastPoint = point;
      const changed = this.options.onUserDrawingMeasureMove?.(point) === true;
      if (changed) this.scheduleRender();
      return changed;
    }

    if (this.userDrawingState && isUserDrawingPathFamilyTool(this.userDrawingState.activeTool)) {
      const point = this.resolveUserDrawingInputPoint(x, y, options);
      return point ? this.options.onUserDrawingPathDragMove?.(point) === true : false;
    }

    if (this.userDrawingState?.activeTool !== 'select') return false;
    return this.options.onUserDrawingEditMove?.({ x, y }) === true;
  }

  private handleUserDrawingDragEnd(): void {
    if (this.userDrawingState?.measureMode === 'on') {
      this.userDrawingMeasureLastPoint = null;
      this.options.onUserDrawingMeasureEnd?.();
      this.scheduleRender();
      return;
    }

    if (this.userDrawingState && isUserDrawingPathFamilyTool(this.userDrawingState.activeTool)) {
      this.options.onUserDrawingPathDragEnd?.();
      return;
    }

    this.options.onUserDrawingEditEnd?.();
  }

  private handleUserDrawingDragCancel(): void {
    if (this.userDrawingState?.measureMode === 'on') {
      this.userDrawingMeasureLastPoint = null;
      this.options.onUserDrawingCancelDraft?.();
      this.scheduleRender();
      return;
    }

    if (this.userDrawingState && isUserDrawingPathFamilyTool(this.userDrawingState.activeTool)) {
      this.options.onUserDrawingCancelDraft?.();
      this.scheduleRender();
    }
  }

  getAnalysisSelectionFrame(identity: string | null): AnalysisSelectionFrame | null {
    if (!identity || !this.bars.length || !this.viewport) return null;
    const mainPane = computePaneGeometry({
      paneLayout: this.getUnifiedLayout(),
      height: this.options.height,
      topOffset: this.margins.top,
    }).find((pane) => pane.type === 'main');
    if (!mainPane || mainPane.height <= 0) return null;
    return {
      identity,
      scaleIdentity: JSON.stringify(this.options.renderOptions),
      timeRange: { from: this.viewport.startTime, to: this.viewport.endTime },
      priceRange: { from: this.viewport.priceMin, to: this.viewport.priceMax },
      projectionLeft: this.margins.left,
      projectionRight: this.options.width,
      plot: {
        left: this.margins.left,
        top: mainPane.top,
        width: this.options.width - this.margins.left - this.margins.right,
        height: mainPane.height,
      },
    };
  }

  canStartAnalysisSelection(): boolean {
    return !this.eventManager.getIsDragging() && !this.priceLineManager?.isDragging();
  }

  private isMainPaneVisible(): boolean {
    const mainPane = computePaneGeometry({
      paneLayout: this.getUnifiedLayout(),
      height: this.options.height,
      topOffset: this.margins.top,
    }).find((pane) => pane.type === 'main');
    return (mainPane?.height ?? 0) > 0;
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
      // Maximising another pane collapses this one to zero height. Without this
      // its drawings flatten onto the seam and paint over the maximised pane.
      if (pane.height <= 0) continue;
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
        // Match the candle time->x scale (candles span the full width, under the price
        // axis) so drawings stay pinned to candles as the viewport zooms.
        chartRight: this.options.width,
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
      topOffset: PANE_OVERLAY_TOP_OFFSET,
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

  // ============================================================================
  // Private: Render
  // ============================================================================

  /**
   * Legacy scheduleRender — kept for resize(), resetViewport(), and interaction
   * callbacks (pan/zoom/crosshair) that are driven from within ChartCore itself.
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

    const formatPrice = (price: number) => this.formatAxisTagPrice(price);

    // Get latest bar for last-trade line
    const latestBar = this.bars.length > 0 ? this.bars[this.bars.length - 1] : null;
    const renderOptions = { ...this.renderer.getOptions(), ...this.options.renderOptions };
    const positiveTradingColor = resolvePositiveTradingColor(renderOptions);
    const negativeTradingColor = resolveNegativeTradingColor(renderOptions);

    // Build all price lines
    const allPriceLines: PriceLine[] = [
      ...this.priceLines.map((p) => {
        if (p.renderLineOnCanvas && p.id === 'last-trade' && latestBar) {
          const isUp = latestBar.close >= latestBar.open;
          return {
            ...p,
            price: latestBar.close,
            color: isUp
              ? this.renderer.getOptions()?.upColor || DEFAULT_BUY_CANDLE_COLOR
              : this.renderer.getOptions()?.downColor || DEFAULT_SELL_CANDLE_COLOR,
            label: {
              ...p.label,
              primaryText: formatPrice(latestBar.close),
            },
            priority: p.priority ?? 100,
          };
        }
        return { ...p, priority: p.priority ?? 100 };
      }),
      ...this.orderLines.map((o) => orderLineToPriceLine(o, formatPrice, positiveTradingColor)),
      ...this.positionLines.map((p) =>
        positionLineToPriceLine(p, formatPrice, positiveTradingColor, negativeTradingColor),
      ),
      ...this.orderLines.flatMap((o) => tradingLineToBracketLines(o, formatPrice, positiveTradingColor)),
      ...this.positionLines.flatMap((p) => tradingLineToBracketLines(p, formatPrice, positiveTradingColor)),
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
    const collisionKeyWithAxis = `${collisionKey}|axis:${this.margins.right}`;
    const now = Date.now();
    const collisionKeyChanged = collisionKeyWithAxis !== this.lastCollisionKey;
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
      this.lastCollisionKey = collisionKeyWithAxis;
      this.lastCollisionUpdate = now;
      // Use the fully resolved bounds directly (content is fresh since allPriceLines is current)
      this.labelBoundsCache = resolvedBounds;
    } else {
      // Collision cache hit — geometry unchanged, but label content may have changed.
      // Refresh content fields in-place from current line data. O(n) with Map lookup.
      const lineMap = new Map(allPriceLines.map((l) => [l.id, l]));
      const computedPanes = this.renderer.computePanesLayout(layout, this.options.height);
      const mainPane = computedPanes.find((pane) => pane.type === 'main');
      if (mainPane) {
        mainPane.yMin = vp.priceMin;
        mainPane.yMax = vp.priceMax;
      }
      for (const b of this.labelBoundsCache) {
        const line = lineMap.get(b.lineId);
        if (line) {
          const targetPaneId = line.targetPaneId || 'main';
          const targetPane = computedPanes.find((pane) => pane.id === targetPaneId) || mainPane;
          const collisionOffset = this.collisionOffsetCache.get(b.lineId) ?? b.adjustedY - b.originalY;
          if (targetPane) {
            b.originalY = this.renderer.valueToY(line.price, targetPane);
            b.adjustedY = b.originalY + collisionOffset;
          }
          b.price = line.price;
          b.label = line.label;
          b.chartLabel = line.chartLabel;
          b.color = line.color;
          b.lineStyle = line.lineStyle;
          b.lineLength = line.lineLength;
          b.lineLengthUnit = line.lineLengthUnit;
          b.extendLeft = line.extendLeft;
          b.lineWidth = line.lineWidth;
          b.renderLineOnCanvas = line.renderLineOnCanvas;
          b.countdownToTime = line.countdownToTime;
          b.draggable = line.draggable;
          b.actionState = line.actionState;
          b.orderId = line.orderId;
          b.positionId = line.positionId;
          b.partialEnabled = line.partialEnabled;
          b.positionData = line.positionData;
          b.brackets = line.brackets;
          b.callbacks = line.callbacks;
          b.targetPaneId = line.targetPaneId;
        }
      }
    }

    const canvasLabelBounds = dragLineId
      ? this.labelBoundsCache.filter((bound) => bound.lineId !== dragLineId)
      : this.labelBoundsCache;

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
    this.growPriceAxisWidthFromMeasuredLabels();

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

    // Highlight the hovered pane divider (resize affordance). Drawn on the overlay
    // so it tracks the cursor without repainting the main canvas. The crosshair is
    // suppressed over a divider, so this must run before the visibility early-return.
    if (this.hoveredPaneDivider) {
      this.drawPaneDividerHighlight(ctx, this.hoveredPaneDivider.y, width);
    }

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

    let priceLabel: {
      text: string;
      textX: number;
      x: number;
      y: number;
      width: number;
      height: number;
    } | null = null;
    if (y >= this.margins.top && y <= height - this.margins.bottom) {
      // The pane under the cursor, not always the price pane: an indicator pane
      // carries its own scale, and RSI or MACD read as nonsense at market
      // precision.
      const { value, decimals } = this.renderer.publicYToPaneValueWithLayout(
        y,
        this.viewport,
        this.getUnifiedLayout(),
        this.options.renderOptions?.pricePrecision,
      );
      const priceText = getNumberFormatter(decimals).format(safeNum(value, 0, 'crosshairPrice'));
      const font = this.renderer.getFont();
      ctx.font = `11px ${font}`;
      const lane = resolveWebPriceAxisLaneTagLayout(width, this.margins.right, PRICE_AXIS_RIGHT_PADDING);
      // Recorded so the axis can widen to hold it, not so the tag can. A tag
      // that sizes to its own text moves the "+" button anchored beside it
      // every time the price crosses a digit.
      this.crosshairPriceLabelMeasuredWidth = Math.max(
        this.crosshairPriceLabelMeasuredWidth,
        Math.ceil(ctx.measureText(priceText).width) +
          CROSSHAIR_PRICE_LABEL_HORIZONTAL_PADDING +
          CROSSHAIR_PRICE_LABEL_WIDTH_GUARD,
      );
      const priceLabelWidth = Math.max(lane.width, this.crosshairPriceLabelMeasuredWidth);
      const priceLabelX = lane.x + lane.width - priceLabelWidth;
      priceLabel = {
        text: priceText,
        textX: priceLabelX + priceLabelWidth / 2,
        x: priceLabelX,
        y: y - CROSSHAIR_PRICE_LABEL_HEIGHT / 2,
        width: priceLabelWidth,
        height: CROSSHAIR_PRICE_LABEL_HEIGHT,
      };
    }
    const hasContextMenu = this.hasContextMenu();
    const crosshairButton =
      hasContextMenu && priceLabel
        ? {
            x: priceLabel.x - CROSSHAIR_PLUS_BUTTON_RIGHT_OFFSET,
            y,
            r: CROSSHAIR_PLUS_BUTTON_RADIUS,
          }
        : null;

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
    if (y >= this.margins.top && y <= height - this.margins.bottom) {
      const rightStop = crosshairButton
        ? crosshairButton.x - crosshairButton.r - CROSSHAIR_PLUS_BUTTON_LINE_GAP
        : width - this.margins.right;
      ctx.beginPath();
      ctx.moveTo(this.margins.left, y);
      ctx.lineTo(rightStop, y);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    // Draw + button circle on the crosshair line
    if (crosshairButton && priceLabel) {
      const btnX = crosshairButton.x;
      const btnY = crosshairButton.y;
      const btnR = crosshairButton.r;

      // Store a forgiving hit target from the circular button through the price
      // label. The circle stays visually compact, but users moving toward the
      // right-axis label do not lose the affordance before they can click it.
      this._plusButtonBounds = {
        x: btnX,
        y: btnY,
        r: btnR,
        hitLeft: btnX - btnR - 4,
        hitRight: priceLabel.x + priceLabel.width,
        hitTop: priceLabel.y - 4,
        hitBottom: priceLabel.y + priceLabel.height + 4,
      };

      // Check hover state
      const isHovered = this.isOverCrosshairPlusButton(this.crosshair.x, this.crosshair.y);

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
    if (priceLabel) {
      // Background
      ctx.fillStyle = crosshairColor;
      ctx.beginPath();
      ctx.roundRect(priceLabel.x, priceLabel.y, priceLabel.width, priceLabel.height, 2);
      ctx.fill();

      // Text
      ctx.fillStyle = this.options.renderOptions?.backgroundColor || '#131722';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(priceLabel.text, priceLabel.textX, y);
    }

    // Draw jailbreak indicator tooltips
    this._drawJailbreakTooltips(ctx, x, y);
    this.renderer.renderTealScriptDrawingTooltip(new WebCanvasContext(ctx), x, y);
  }

  private getJailbreakTooltipBarsInSeconds(bars: Bar[]): Bar[] {
    const firstTime = bars[0]?.time;
    const lastBar = bars[bars.length - 1];
    const lastTime = lastBar?.time;
    const lastClose = lastBar?.close;
    const cache = this.jailbreakTooltipBarsCache;
    if (
      cache &&
      cache.source === bars &&
      cache.length === bars.length &&
      cache.firstTime === firstTime &&
      cache.lastTime === lastTime &&
      cache.lastClose === lastClose
    ) {
      return cache.barsInSeconds;
    }

    const barsInSeconds = bars.map((b) => ({ ...b, time: Math.floor(b.time / 1000) }));
    this.jailbreakTooltipBarsCache = {
      source: bars,
      length: bars.length,
      firstTime,
      lastTime,
      lastClose,
      barsInSeconds,
    };
    return barsInSeconds;
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

    const exchange = this.options.renderOptions?.exchange ?? '';
    const symbol = this.options.renderOptions?.symbol ?? '';

    const tooltipGroups = jailbreakManager.getTooltips({
      bars: this.getJailbreakTooltipBarsInSeconds(bars),
      mouseX: cursorX,
      mouseY: cursorY,
      barIndex,
      price,
      exchange,
      symbol,
    });

    drawJailbreakTooltipGroups(ctx, tooltipGroups, {
      cursorX,
      cursorY,
      chartWidth: width,
      rightMargin: this.margins.right,
      leftMinX: this.getChartLabelMinX(),
      font: this.renderer.getFont(),
      backgroundColor: this.options.renderOptions?.backgroundColor,
      textColor: this.options.renderOptions?.crosshairColor,
    });
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
    // Keyed on the adapter id, like everything else the OEMS layer touches. The
    // venue-id precedence that used to be here failed its lookup outright for
    // any host that sets an order/position id, so the drag ran with no preview.
    const position = this.positionLines.find((p) => this.getPositionObjectId(p) === lineId);
    const positiveTradingColor = resolvePositiveTradingColor({
      ...this.renderer.getOptions(),
      ...this.options.renderOptions,
    });
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
        color:
          type === 'tp'
            ? (position.brackets?.takeProfitColor ?? positiveTradingColor)
            : (position.brackets?.stopLossColor ?? STOP_LOSS_COLOR),
      };
      this.renderCrosshairOverlay();
      return;
    }

    // Fall back to order lines — use order price as entry
    const order = this.orderLines.find((o) => this.getOrderObjectId(o) === lineId);
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
        color:
          type === 'tp'
            ? (order.brackets?.takeProfitColor ?? positiveTradingColor)
            : (order.brackets?.stopLossColor ?? STOP_LOSS_COLOR),
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
    drawBracketDragPreview(ctx, state, {
      chartWidth: this.options.width - this.margins.right,
      font: this.renderer.getFont(),
      priceToY: (price) => this.renderer.publicPriceToYWithLayout(price, this.viewport!, this.getUnifiedLayout()),
      drawPriceAxisLabel: (context, price, y, color) =>
        this._drawBracketPreviewPriceAxisLabel(context, price, y, color),
    });
  }

  private _drawBracketPreviewPriceAxisLabel(
    ctx: CanvasRenderingContext2D,
    price: number,
    y: number,
    color: string,
  ): void {
    const pricePrecision = this.options.renderOptions?.pricePrecision;
    let decimals: number;
    if (pricePrecision && pricePrecision > 0) {
      decimals = getDecimalPlacesFromPrecision(pricePrecision);
    } else {
      const priceRange = this.viewport ? this.viewport.priceMax - this.viewport.priceMin : 0;
      if (priceRange >= 10) decimals = 0;
      else if (priceRange >= 1) decimals = 1;
      else if (priceRange >= 0.1) decimals = 2;
      else if (priceRange >= 0.01) decimals = 3;
      else if (priceRange >= 0.001) decimals = 4;
      else if (priceRange >= 0.0001) decimals = 5;
      else decimals = 6;
    }
    const priceText = getNumberFormatter(decimals).format(price);
    const labelHeight = 18;
    // The lane, not a fit to the price - the same rule the crosshair's tag
    // follows, and for the same reason: this tag is read while it moves.
    const lane = resolveWebPriceAxisLaneTagLayout(this.options.width, this.margins.right, PRICE_AXIS_RIGHT_PADDING);
    const labelWidth = Math.max(lane.width, ctx.measureText(priceText).width + BRACKET_PREVIEW_LABEL_PADDING_X * 2);
    const labelX = lane.x + lane.width - labelWidth;
    const minY = this.margins.top;
    const maxY = this.options.height - this.margins.bottom - labelHeight;
    const labelY = Math.max(minY, Math.min(maxY, y - labelHeight / 2));

    ctx.save();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(labelX, labelY, labelWidth, labelHeight, 2);
    ctx.fill();
    ctx.fillStyle = DEFAULT_TRADE_LINE_FILLED_SEGMENT_TEXT_COLOR;
    ctx.font = `11px ${this.renderer.getFont()}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(priceText, labelX + labelWidth / 2, labelY + labelHeight / 2);
    ctx.restore();
  }

  /**
   * Update interactive line layer
   */
  private updateInteractiveLines(): void {
    if (this.priceLineManager?.isDragging()) {
      return;
    }
    // Every interactive line is positioned against the main pane, so a
    // collapsed one leaves them nowhere to go but the seam.
    this.priceLineManager?.update(this.isMainPaneVisible() ? this.labelBoundsCache : [], {
      x: 0,
      y: 0,
      visible: false,
      color: '',
    });
  }

  /**
   * The tick's decimals when the host gave a precision, otherwise as many as
   * the visible range needs. Shared by the rendered line labels and by the
   * live price a drag writes into its own tag.
   */
  private formatAxisTagPrice(price: number): string {
    const pricePrecision = this.options.renderOptions?.pricePrecision;
    let decimals: number;
    if (pricePrecision && pricePrecision > 0) {
      decimals = getDecimalPlacesFromPrecision(pricePrecision);
    } else {
      const vp = this.viewport ?? TealchartRenderer.calculateViewport(this.bars);
      const priceRange = vp.priceMax - vp.priceMin;
      if (priceRange >= 10) decimals = 0;
      else if (priceRange >= 1) decimals = 1;
      else if (priceRange >= 0.1) decimals = 2;
      else if (priceRange >= 0.01) decimals = 3;
      else if (priceRange >= 0.001) decimals = 4;
      else if (priceRange >= 0.0001) decimals = 5;
      else decimals = 6;
    }
    return getNumberFormatter(decimals).format(price);
  }

  private growPriceAxisWidthFromMeasuredLabels(): void {
    const measuredValueAxisWidth = this.renderer.getMeasuredValueAxisWidth();
    const measuredLineAxisWidth =
      this.labelBoundsCache.length > 0
        ? Math.ceil(Math.max(...this.labelBoundsCache.map((bound) => bound.width + PRICE_AXIS_RIGHT_PADDING)))
        : 0;
    const nextRight = Math.ceil(
      Math.max(
        this.margins.right,
        measuredValueAxisWidth,
        measuredLineAxisWidth,
        this.crosshairPriceLabelMeasuredWidth + PRICE_AXIS_RIGHT_PADDING,
      ),
    );
    if (!Number.isFinite(nextRight) || nextRight <= this.margins.right) return;

    this.margins = { ...this.margins, right: nextRight };
    const chartLabelMinX = this.getChartLabelMinX();
    this.renderer.setOptions({ chartLabelMinX, margins: this.margins });
    this.priceLineManager?.setDimensions(this.options.width, this.options.height, this.margins);
    this.priceLineManager?.setChartLabelMinX(chartLabelMinX);
    this.scheduleRender();
  }
}
