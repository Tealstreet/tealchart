/**
 * Custom Chart Types
 * Designed to be compatible with existing TradingView datafeed infrastructure
 */

import type { WorkerError } from '@tealstreet/tealscript';

// Reuse Bar type from existing codebase
export interface Bar {
  time: number; // Unix timestamp in milliseconds
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

// Viewport defines the visible area of the chart
export interface Viewport {
  startTime: number; // Left edge timestamp (ms)
  endTime: number; // Right edge timestamp (ms)
  priceMin: number; // Bottom price
  priceMax: number; // Top price
}

// ViewScaleState captures the proportional view state for viewport preservation
// across symbol/interval/account changes. Time axis is bar-count-based so that
// switching intervals preserves the number of visible candles (matching TradingView).
// Price axis is proportional (works across symbols with different price ranges).
export interface ViewScaleState {
  visibleBarCount: number; // number of candles visible (fractional OK)
  rightOffsetBars: number; // bars past last bar to right edge (negative = scrolled left)
  pricePaddingTop: number; // (priceMax - highestWick) / dataRange
  pricePaddingBottom: number; // (lowestWick - priceMin) / dataRange
}

// Rendering options
export interface RenderOptions {
  width: number;
  height: number;
  upColor: string;
  downColor: string;
  backgroundColor: string;
  textColor: string;
  gridColor: string;
  crosshairColor: string;
  showVolume: boolean;
  volumeHeight: number; // Percentage of chart height for volume (0-1)
  devicePixelRatio: number;
  candleSpacing: number; // Gap between candles in pixels
  minCandleWidth: number;
  maxCandleWidth: number;
  margins?: ChartMargins; // Custom margins override
  pricePrecision?: number; // Market price precision (e.g., 0.00001 for 5 decimal places)
  fontFamily?: string; // Font family for all chart text. Defaults to 'sans-serif' for canvas rendering.
  // Metadata for jailbreak indicators
  exchange?: string;
  symbol?: string;
  resolutionString?: string;
}

// Last trade info for rendering the current price line (legacy - use PriceLine instead)
export interface LastTradeInfo {
  price: number;
  barCloseTime: number; // Unix timestamp (ms) when the current bar closes
  isUp: boolean; // Whether current bar is up (green) or down (red)
}

// ============================================================================
// Price Line System - General purpose price lines with labels
// ============================================================================

/**
 * Line type for unified rendering
 */
export type PriceLineType = 'price' | 'order' | 'position' | 'liquidation' | 'crosshair';

/**
 * A price line that renders horizontally across the chart with a label.
 * Extended to support order, position, and liquidation lines with chart-area labels.
 */
export interface PriceLine {
  /** Unique identifier for this line */
  id: string;
  /** Price level where the line should be drawn */
  price: number;
  /** Line style */
  lineStyle: 'solid' | 'dashed' | 'dotted';
  /** Line and label border color */
  color: string;
  /** Price axis label configuration */
  label: PriceLineLabel;
  /** Priority for conflict resolution - higher priority lines keep their position */
  priority?: number;

  // === Extended fields for unified line system ===

  /** Line type for rendering logic (default: 'price') */
  type?: PriceLineType;
  /** Chart area label (multi-box label for orders/positions) */
  chartLabel?: ChartLineLabel;
  /** Line length percentage 0-100 (default: 100) */
  lineLength?: number;
  /** Whether line extends from left edge (default: true) */
  extendLeft?: boolean;
  /** Line thickness in pixels (default: 1) */
  lineWidth?: number;
  /** If true, label floats on top of other labels without collision detection */
  floatingLabel?: boolean;
  /** Target pane ID for this line (default: 'main'). Use for indicator pane crosshairs. */
  targetPaneId?: string;
  /**
   * If true, the line is drawn on canvas (for high-speed updates synced with candles)
   * while the label is rendered in Konva for collision resolution.
   * Use this for frequently-updating lines like last trade price.
   */
  renderLineOnCanvas?: boolean;
  /**
   * If set, the label's secondaryText will be computed as a countdown to this timestamp (ms).
   * The countdown is computed in the RAF loop, avoiding React re-renders every second.
   * Format: MM:SS or HH:MM:SS for times >= 1 hour.
   */
  countdownToTime?: number;
  /**
   * Whether this line is draggable (has onMove callback).
   * Only order lines with an onMove callback should be draggable.
   */
  draggable?: boolean;

  // === TEALSTREET: Position-specific fields for bracket TP/SL ===

  /** External position ID (for bracket callbacks) */
  positionId?: string;
  /** Whether partial percentage is enabled for this position */
  partialEnabled?: boolean;
  /** Position data for PnL calculations during drag */
  positionData?: PositionData;
  /** Current bracket configuration (TP/SL prices if already set) */
  brackets?: BracketConfig | null;
  /** Adapter callbacks carried through render data for direct invocation */
  callbacks?: {
    onTPClick?: () => void;
    onSLClick?: () => void;
    onTPMove?: (price: number, partialPercent?: number) => void;
    onSLMove?: (price: number, partialPercent?: number) => void;
    onTPMoveEnd?: (price: number, partialPercent?: number) => void;
    onSLMoveEnd?: (price: number, partialPercent?: number) => void;
    onClose?: () => void;
    onReverse?: () => void;
    onCancel?: () => void;
  };
}

/**
 * Chart area label with multiple text segments and buttons
 * Used for order/position lines that need complex labels in the chart area
 */
export interface ChartLineLabel {
  /** Position as percentage 0-100 of chart width where label sits */
  offsetPercent: number;
  /** Text segments rendered as separate styled boxes */
  segments: ChartLabelSegment[];
  /** Interactive buttons (cancel, close, reverse) */
  buttons?: ChartLabelButton[];
}

/**
 * A single text segment in a chart area label
 */
export interface ChartLabelSegment {
  /** Main text to display */
  text: string;
  /** Compact version for narrow displays */
  textShort?: string;
  /** Background color of the segment box */
  backgroundColor: string;
  /** Text color */
  textColor: string;
  /** Border color of the segment box */
  borderColor: string;
}

/**
 * An interactive button in a chart area label
 */
export interface ChartLabelButton {
  /** Button type for click handling */
  type: 'cancel' | 'close' | 'reverse' | 'tp' | 'sl';
  /** Icon character to display (e.g., 'X', '↩', 'TP', 'SL') */
  icon: string;
  /** Background color */
  backgroundColor: string;
  /** Icon color */
  iconColor: string;
  /** Border color */
  borderColor: string;
  /** Tooltip text on hover */
  tooltip?: string;
}

/**
 * Label configuration for a price line
 */
export interface PriceLineLabel {
  /** Primary text (usually the price) */
  primaryText: string;
  /** Optional secondary text (countdown, quantity, side, etc.) */
  secondaryText?: string;
  /** Background color (default: semi-transparent dark) */
  backgroundColor?: string;
  /** Text color (default: inherits from line color) */
  textColor?: string;
}

/**
 * Internal representation of a price line label with computed position
 */
export interface PriceLineLabelBounds {
  lineId: string;
  price: number;
  originalY: number;
  adjustedY: number;
  width: number;
  height: number;
  color: string;
  label: PriceLineLabel;
  lineStyle: 'solid' | 'dashed' | 'dotted';
  /** True when the price is outside the visible viewport */
  isOffScreen?: boolean;

  // === Extended fields for unified line system ===

  /** Line type for rendering logic */
  type?: PriceLineType;
  /** Chart area label (multi-box label for orders/positions) */
  chartLabel?: ChartLineLabel;
  /** Line length percentage 0-100 */
  lineLength?: number;
  /** Whether line extends from left edge */
  extendLeft?: boolean;
  /** Line thickness in pixels */
  lineWidth?: number;
  /** If true, label floats on top without collision detection */
  floatingLabel?: boolean;
  /** Priority for conflict resolution - higher priority labels keep their position */
  priority?: number;
  /** If true, line is drawn on canvas, only label in Konva (for high-speed lines) */
  renderLineOnCanvas?: boolean;
  /** Countdown target time (ms) - PriceLineLayer computes secondaryText from this */
  countdownToTime?: number;
  /** Whether this line is draggable (has onMove callback) */
  draggable?: boolean;

  // === TEALSTREET: Position-specific fields for bracket TP/SL ===

  /** External position ID (for bracket callbacks) */
  positionId?: string;
  /** Whether partial percentage is enabled for this position */
  partialEnabled?: boolean;
  /** Position data for PnL calculations during drag */
  positionData?: PositionData;
  /** Current bracket configuration (TP/SL prices if already set) */
  brackets?: BracketConfig | null;
  /** Adapter callbacks carried through render data for direct invocation */
  callbacks?: {
    onTPClick?: () => void;
    onSLClick?: () => void;
    onTPMove?: (price: number, partialPercent?: number) => void;
    onSLMove?: (price: number, partialPercent?: number) => void;
    onTPMoveEnd?: (price: number, partialPercent?: number) => void;
    onSLMoveEnd?: (price: number, partialPercent?: number) => void;
    onClose?: () => void;
    onReverse?: () => void;
    onCancel?: () => void;
  };

  // === Pane targeting for multi-pane support ===

  /** Target pane ID for this line (default: 'main') */
  targetPaneId?: string;
}

/**
 * TradingView-style overrides using dot-notation paths
 * Allows customization similar to TradingView's applyOverrides API
 */
export interface ChartOverrides {
  // Candle style
  'mainSeriesProperties.candleStyle.upColor'?: string;
  'mainSeriesProperties.candleStyle.downColor'?: string;
  'mainSeriesProperties.candleStyle.wickUpColor'?: string;
  'mainSeriesProperties.candleStyle.wickDownColor'?: string;
  // Pane properties
  'paneProperties.background'?: string;
  'paneProperties.vertGridProperties.color'?: string;
  'paneProperties.horzGridProperties.color'?: string;
  // Scale properties
  'scalesProperties.textColor'?: string;
  // Crosshair properties
  'paneProperties.crossHairProperties.color'?: string;
  // Volume properties
  'volumePaneProperties.showVolume'?: boolean;
  'volumePaneProperties.volumeHeight'?: number;
  // Allow arbitrary string keys for extensibility
  [key: string]: string | number | boolean | undefined;
}

// Chart margins
export interface ChartMargins {
  top: number;
  right: number; // Space for price axis
  bottom: number; // Space for time axis
  left: number;
}

export const TIME_AXIS_HEIGHT = 26;

// Drag mode types
export type DragMode = 'none' | 'pan' | 'priceAxisZoom';

// Mouse/interaction state
export interface InteractionState {
  isDragging: boolean;
  dragMode: DragMode;
  dragStartX: number;
  dragStartY: number;
  dragStartViewport: Viewport | null;
  hoveredBar: Bar | null;
  hoveredX: number;
  hoveredY: number;
  isOverPriceAxis: boolean;
  /** ID of the pane being Y-axis zoomed (null = main pane uses viewport) */
  draggedPaneId: string | null;
  /** Starting Y range of the pane being zoomed */
  dragStartPaneYRange: { yMin: number; yMax: number } | null;
}

/**
 * Pending order update for optimistic UI
 */
export interface PendingOrderUpdate {
  /** Order ID being updated */
  orderId: string;
  /** New price (optimistic) */
  pendingPrice: number;
  /** Original price (for revert) */
  originalPrice: number;
  /** Timestamp when pending state started */
  startTime: number;
  /** Timeout ID for auto-revert */
  timeoutId: ReturnType<typeof setTimeout>;
}

// Crosshair state
export interface CrosshairState {
  visible: boolean;
  x: number;
  y: number;
  price: number;
  time: number;
  /** ID of the pane the crosshair is currently in (null = main pane) */
  paneId: string | null;
  /** Value in the current pane's Y coordinate system (for indicator panes) */
  paneValue: number | null;
}

// Default render options
export const DEFAULT_RENDER_OPTIONS: RenderOptions = {
  width: 800,
  height: 400,
  upColor: '#26a69a',
  downColor: '#ef5350',
  backgroundColor: '#1e222d',
  textColor: '#787b86',
  gridColor: '#363a45',
  crosshairColor: '#758696',
  showVolume: true,
  volumeHeight: 0.2,
  devicePixelRatio: 1,
  candleSpacing: 2,
  minCandleWidth: 3,
  maxCandleWidth: 30,
};

// Default margins
export const DEFAULT_MARGINS: ChartMargins = {
  top: 10,
  right: 58, // Price axis (tightened to match label width)
  bottom: TIME_AXIS_HEIGHT, // Time axis
  left: 5,
};

// ============================================================================
// TradingView-Compatible Types
// These mirror TradingView's charting library types for drop-in replacement
// ============================================================================

/**
 * Widget events that can be subscribed to
 */
export type WidgetEvent =
  | 'onAutoSaveNeeded'
  | 'layout_about_to_be_changed'
  | 'chart_loaded'
  | 'layout_changed'
  | 'mouse_down'
  | 'mouse_up';

/**
 * Resolution string type (matches TradingView's nominal type)
 */
export type ResolutionString = string;

/**
 * CrossHair event params (matches TradingView's interface)
 */
export interface CrossHairMovedEventParams {
  price: number;
  time: number;
}

/**
 * Enhanced crosshair state with symbol/account (Tealstreet extension)
 */
export interface EnhancedCrossHairState extends CrossHairMovedEventParams {
  symbol?: string;
  account?: string;
}

/**
 * TradingView-style subscription interface
 */

export interface ISubscription<T extends (...args: any[]) => void> {
  subscribe(obj: object | null, callback: T): void;
  unsubscribe(obj: object | null, callback: T): void;
  unsubscribeAll(obj: object | null): void;
}

/**
 * Context menu item (matches TradingView's interface)
 */
export interface ContextMenuItem {
  position: 'top' | 'bottom';
  text: string;
  click: () => void;
  enabled?: boolean;
}

/**
 * Context menu callback
 */
export type ContextMenuCallback = (unixTime: number, price: number) => ContextMenuItem[];

/**
 * Time scale API (subset of TradingView's ITimeScaleApi)
 */
export interface ITimeScaleApi {
  defaultRightOffset(): {
    value(): number;
    setValue(value: number): void;
  };
}

/**
 * Order line options
 */
export interface OrderLineOptions {
  price?: number;
  quantity?: number;
  text?: string;
  lineColor?: string;
  bodyBackgroundColor?: string;
  bodyTextColor?: string;
  bodyBorderColor?: string;
  quantityBackgroundColor?: string;
  quantityTextColor?: string;
  quantityBorderColor?: string;
  cancelButtonBackgroundColor?: string;
  cancelButtonIconColor?: string;
  cancelButtonBorderColor?: string;
  editable?: boolean;
  cancellable?: boolean;
}

/**
 * Order line adapter (matches TradingView's IOrderLineAdapter)
 */
export interface IOrderLineAdapter {
  remove(): void;
  /** Set external order ID for deduplication (e.g., exchange order ID) */
  setOrderId(orderId: string): this;
  setPrice(price: number): this;
  setQuantity(quantity: string): this;
  setText(text: string): this;
  setLineColor(color: string): this;
  setLineStyle(style: number): this;
  setLineWidth(width: number): this;
  setLineLength(length: number): this;
  setExtendLeft(extend: boolean): this;
  setBodyBackgroundColor(color: string): this;
  setBodyTextColor(color: string): this;
  setBodyBorderColor(color: string): this;
  setQuantityBackgroundColor(color: string): this;
  setQuantityTextColor(color: string): this;
  setQuantityBorderColor(color: string): this;
  setCancelButtonBackgroundColor(color: string): this;
  setCancelButtonIconColor(color: string): this;
  setCancelButtonBorderColor(color: string): this;
  setCancelTooltip(tooltip: string): this;
  setModifyTooltip(tooltip: string): this;
  setEditable(editable: boolean): this;
  setCancellable(cancellable: boolean): this;
  onMove(callback: (price: number) => void): this;
  onCancel(callback: () => void): this;
  onModify(callback: (text: string, price: number) => void): this;
  getPrice(): number;
}

/**
 * Position line options
 */
export interface PositionLineOptions {
  price?: number;
  quantity?: number;
  text?: string;
  lineColor?: string;
  bodyBackgroundColor?: string;
  bodyTextColor?: string;
  bodyBorderColor?: string;
  quantityBackgroundColor?: string;
  quantityTextColor?: string;
  quantityBorderColor?: string;
  reverseButtonBackgroundColor?: string;
  reverseButtonIconColor?: string;
  reverseButtonBorderColor?: string;
  closeButtonBackgroundColor?: string;
  closeButtonIconColor?: string;
  closeButtonBorderColor?: string;
  protectTooltipText?: string;
}

/**
 * Position line adapter (matches TradingView's IPositionLineAdapter)
 */
export interface IPositionLineAdapter {
  remove(): void;
  /** Set external position ID for deduplication */
  setPositionId(positionId: string): this;
  setPrice(price: number): this;
  setQuantity(quantity: string): this;
  setText(text: string): this;
  setExtendLeft(extend: boolean): this;
  setLineLength(length: number): this;
  setLineColor(color: string): this;
  setLineStyle(style: number): this;
  setLineWidth(width: number): this;
  setBodyBackgroundColor(color: string): this;
  setBodyTextColor(color: string): this;
  setBodyBorderColor(color: string): this;
  setQuantityBackgroundColor(color: string): this;
  setQuantityTextColor(color: string): this;
  setQuantityBorderColor(color: string): this;
  setReverseButtonBackgroundColor(color: string): this;
  setReverseButtonIconColor(color: string): this;
  setReverseButtonBorderColor(color: string): this;
  setCloseButtonBackgroundColor(color: string): this;
  setCloseButtonIconColor(color: string): this;
  setCloseButtonBorderColor(color: string): this;
  setCloseTooltip(tooltip: string): this;
  setProtectTooltipText(text: string): this;
  onClose(callback: () => void): this;
  onReverse(callback: () => void): this;
  onModify(callback: (text: string, price: number) => void): this;
  getPrice(): number;
}

/**
 * Execution line direction (matches TradingView's Direction type)
 */
export type ExecutionDirection = 'buy' | 'sell';

/**
 * Execution line adapter (matches TradingView's IExecutionLineAdapter)
 */
export interface IExecutionLineAdapter {
  remove(): void;
  getPrice(): number;
  setPrice(price: number): this;
  getTime(): number;
  setTime(time: number): this;
  getDirection(): ExecutionDirection;
  setDirection(direction: ExecutionDirection): this;
  getText(): string;
  setText(text: string): this;
  getTooltip(): string;
  setTooltip(tooltip: string): this;
  getArrowHeight(): number;
  setArrowHeight(height: number): this;
  getArrowSpacing(): number;
  setArrowSpacing(spacing: number): this;
  getFont(): string;
  setFont(font: string): this;
  getTextColor(): string;
  setTextColor(color: string): this;
  getArrowColor(): string;
  setArrowColor(color: string): this;
}

/**
 * Study info (for getAllStudies)
 */
export interface StudyInfo {
  id: string;
  name: string;
  isVisible: boolean;
  inputs: Record<string, unknown>;
}

/**
 * Study API for controlling indicators
 */
export interface IStudyApi {
  /** Apply style overrides to the study */
  applyOverrides(overrides: Record<string, unknown>): void;
  /** Remove the study from the chart */
  remove(): void;
  /** Update input values */
  setInputs(inputs: Record<string, unknown>): void;
  /** Get current input values */
  getInputs(): Record<string, unknown>;
  /** Get the study ID */
  getId(): string;
  /** Get the study name */
  getName(): string;
}

/**
 * Minimal datafeed interface for chart compatibility
 * Consumers should use the existing DefaultDatafeed from the web app
 */
export interface IBasicDataFeed {
  onReady(callback: (config: DatafeedConfiguration) => void): void;
  resolveSymbol(
    symbolName: string,
    onResolve: (symbolInfo: LibrarySymbolInfo) => void,
    onError: (reason: string) => void,
  ): void;
  getBars(
    symbolInfo: LibrarySymbolInfo,
    resolution: ResolutionString,
    periodParams: PeriodParams,
    onResult: (bars: Bar[], meta: { noData?: boolean }) => void,
    onError: (reason: string) => void,
  ): void;
  subscribeBars(
    symbolInfo: LibrarySymbolInfo,
    resolution: ResolutionString,
    onTick: (bar: Bar) => void,
    listenerGuid: string,
    onResetCacheNeededCallback: () => void,
  ): void;
  unsubscribeBars(listenerGuid: string): void;
}

/**
 * Datafeed configuration
 */
export interface DatafeedConfiguration {
  supported_resolutions?: ResolutionString[];
  supports_marks?: boolean;
  supports_time?: boolean;
  supports_timescale_marks?: boolean;
}

/**
 * Library symbol info (subset of TradingView's)
 */
export interface LibrarySymbolInfo {
  name: string;
  ticker?: string;
  exchange?: string;
  full_name?: string;
  description?: string;
  type?: string;
  session?: string;
  timezone?: string;
  minmov?: number;
  pricescale?: number;
  has_intraday?: boolean;
  has_seconds?: boolean;
  has_daily?: boolean;
  has_weekly_and_monthly?: boolean;
  intraday_multipliers?: string[];
  seconds_multipliers?: string[];
  supported_resolutions?: ResolutionString[];
}

/**
 * Period params for getBars
 */
export interface PeriodParams {
  from: number;
  to: number;
  countBack?: number;
  firstDataRequest?: boolean;
}

/**
 * Widget options (mirrors TradingView's TradingTerminalWidgetOptions)
 */
export interface TealchartWidgetOptions {
  container: HTMLElement;
  symbol: string;
  /** Initial interval. If omitted, uses persisted per-chart value from localStorage. */
  interval?: ResolutionString;
  datafeed: IBasicDataFeed;
  /** Initial render options applied before overrides and symbol metadata. */
  renderOptions?: Partial<RenderOptions>;
  locale?: string;
  autosize?: boolean;
  fullscreen?: boolean;
  theme?: 'Light' | 'Dark';
  overrides?: ChartOverrides;
  // Additional Tealstreet-specific options
  account?: string;
  /** Unique key for per-chart state persistence (e.g., panelId or tabId) */
  chartKey?: string;
  /** Whether to show the built-in top bar with timeframe selector (default: true) */
  showTopBar?: boolean;
  /**
   * SaveLoadAdapter for loading/saving layouts (same pattern as TradingView's save_load_adapter)
   * When provided, enables layout selector UI in the top bar
   */
  save_load_adapter?: import('./transformer').ISaveLoadAdapter;
  /**
   * Auto-save delay in seconds (same pattern as TradingView's auto_save_delay)
   * When set, automatically saves the layout after this many seconds of inactivity
   * following a change. Set to 0 or omit to disable auto-save.
   */
  auto_save_delay?: number;
  /**
   * Factory function to create a Tealscript Web Worker.
   * Required to enable Tealscript indicators.
   *
   * For Vite/Turbopack:
   * ```typescript
   * createTealscriptWorker: () => new Worker(
   *   new URL('@tealstreet/tealscript/src/worker/worker.ts', import.meta.url),
   *   { type: 'module' }
   * )
   * ```
   */
  createTealscriptWorker?: () => Worker;
  /**
   * Called when a TealScript study emits a parse/runtime error after creation.
   * The script id is the study id returned by createStudy().
   */
  onTealscriptError?: (scriptId: string, error: WorkerError) => void;
  /**
   * Gap detection configuration for automatic bar recovery.
   * When enabled, the chart will detect gaps in bar data (from network issues,
   * tab visibility changes, laptop sleep, etc.) and automatically refetch.
   */
  gapDetection?: GapDetectionOptions;
  /**
   * Whether to show TP/SL bracket buttons on position lines.
   * When enabled, position lines show draggable TP (take profit) and SL (stop loss) buttons.
   * Default: true
   */
  showBracketButtons?: boolean;
  /**
   * Whether to enable debug logging for this chart instance.
   * When enabled, logs are captured to a ring buffer and can be displayed in the UI.
   * Console output is also enabled when true.
   * Default: false
   */
  debugLoggingEnabled?: boolean;
  /**
   * Completely disable the debug overlay and logger (for performance profiling).
   * When true, no logger is created and no debug UI is shown.
   * Default: false
   */
  disableDebugOverlay?: boolean;
  /**
   * Factory map for jailbreak (canvas-drawing) indicators.
   * Keys are builtin indicator IDs (e.g., 'dwmo').
   * Values are factory functions that return a BarsIndicator instance.
   *
   * When an IndicatorInstance references a jailbreak builtin, the widget
   * uses this map to instantiate the BarsIndicator and register it with
   * the JailbreakIndicatorManager.
   */
  jailbreakIndicatorFactories?: Record<string, () => import('./jailbreak/BarsIndicator').BarsIndicator>;
}

// ============================================================================
// Order/Position Line Render Data (Internal)
// These types extract displayable properties from line adapters for rendering
// ============================================================================

/**
 * Profit state for position line PnL coloring
 */
export type ProfitState = 'positive' | 'negative' | 'neutral';

/**
 * Bracket configuration for TP/SL
 */
export interface BracketConfig {
  takeProfit?: number;
  stopLoss?: number;
}

/**
 * Position data for TEALSTREET extensions
 */
export interface PositionData {
  entryPrice: number;
  notional: number;
  isLong: boolean;
}

/**
 * Internal render data extracted from order line adapter
 * Contains all properties needed to draw an order line on canvas
 */
export interface OrderLineRenderData {
  id: string;
  /** External order ID (e.g., exchange order ID) for deduplication */
  orderId?: string;
  price: number;
  quantity: string;
  quantityShort: string; // TEALSTREET: compact display
  text: string;
  textShort: string; // TEALSTREET: compact display
  // Line styling
  lineColor: string;
  lineStyle: number; // 0=solid, 1=dotted, 2=dashed
  lineWidth: number;
  lineLength: number; // Percentage 0-100
  extendLeft: boolean;
  // State
  editable: boolean;
  cancellable: boolean;
  // Body styling
  bodyBackgroundColor: string;
  bodyTextColor: string;
  bodyBorderColor: string;
  // Quantity box styling
  quantityBackgroundColor: string;
  quantityTextColor: string;
  quantityBorderColor: string;
  // Cancel button styling
  cancelButtonBackgroundColor: string;
  cancelButtonIconColor: string;
  cancelButtonBorderColor: string;
  // Tooltips
  cancelTooltip: string;
  modifyTooltip: string;
  // TEALSTREET: Bracket state
  brackets: BracketConfig | null;
  partialEnabled: boolean;
  /** Adapter callbacks carried through render data for direct invocation */
  callbacks?: {
    onTPClick?: () => void;
    onSLClick?: () => void;
    onTPMove?: (price: number, partialPercent?: number) => void;
    onSLMove?: (price: number, partialPercent?: number) => void;
    onTPMoveEnd?: (price: number, partialPercent?: number) => void;
    onSLMoveEnd?: (price: number, partialPercent?: number) => void;
    onCancel?: () => void;
  };
}

/**
 * Internal render data extracted from position line adapter
 * Contains all properties needed to draw a position line on canvas
 */
export interface PositionLineRenderData {
  id: string;
  /** External position ID for deduplication */
  positionId?: string;
  price: number;
  quantity: string;
  quantityShort: string; // TEALSTREET: compact display
  text: string;
  textShort: string; // TEALSTREET: compact display
  // Line styling
  lineColor: string;
  lineStyle: number; // 0=solid, 1=dotted, 2=dashed
  lineWidth: number;
  lineLength: number; // Percentage 0-100
  extendLeft: boolean;
  // Body styling
  bodyBackgroundColor: string;
  bodyTextColor: string;
  bodyBorderColor: string;
  // Quantity box styling
  quantityBackgroundColor: string;
  quantityTextColor: string;
  quantityBorderColor: string;
  // Close button styling
  closeable: boolean; // Whether close button is shown (set when onClose callback is provided)
  closeButtonBackgroundColor: string;
  closeButtonIconColor: string;
  closeButtonBorderColor: string;
  // Reverse button styling
  reversible: boolean; // Whether reverse button is shown (set when onReverse callback is provided)
  reverseButtonBackgroundColor: string;
  reverseButtonIconColor: string;
  reverseButtonBorderColor: string;
  // Tooltips
  closeTooltip: string;
  protectTooltipText: string;
  // TEALSTREET extensions
  pnl: string;
  pnlShort: string;
  profitState: ProfitState;
  brackets: BracketConfig | null;
  partialEnabled: boolean;
  positionData: PositionData | null;
  /** Adapter callbacks carried through render data for direct invocation */
  callbacks?: {
    onTPClick?: () => void;
    onSLClick?: () => void;
    onTPMove?: (price: number, partialPercent?: number) => void;
    onSLMove?: (price: number, partialPercent?: number) => void;
    onTPMoveEnd?: (price: number, partialPercent?: number) => void;
    onSLMoveEnd?: (price: number, partialPercent?: number) => void;
    onClose?: () => void;
    onReverse?: () => void;
  };
}

/**
 * Internal render data extracted from execution line adapter.
 * Contains all properties needed to draw execution markers on canvas.
 */
export interface ExecutionLineRenderData {
  id: string;
  price: number;
  /** Unix timestamp in seconds for TradingView compatibility */
  time: number;
  direction: ExecutionDirection;
  text: string;
  tooltip: string;
  arrowHeight: number;
  arrowSpacing: number;
  font: string;
  textColor: string;
  arrowColor: string;
}

// ============================================================================
// TEALSTREET Extension Interfaces
// Custom methods added via patches to TradingView library
// ============================================================================

/**
 * TEALSTREET extensions for order line adapter
 * These methods are available in the patched TradingView library
 */
export interface TealstreetOrderLineExtensions {
  // Compact display for mobile
  setTextShort(text: string): IOrderLineAdapter;
  setQuantityShort(quantity: string): IOrderLineAdapter;
  // Bracket TP/SL controls
  setBrackets(brackets: BracketConfig | null): IOrderLineAdapter;
  setPartialEnabled(enabled: boolean): IOrderLineAdapter;
  setPnlCalculator(calculator: (price: number, percent: number) => string): IOrderLineAdapter;
  // Bracket callbacks
  onTPClick(callback: () => void): IOrderLineAdapter;
  onSLClick(callback: () => void): IOrderLineAdapter;
  onTPMove(callback: (price: number) => void): IOrderLineAdapter;
  onSLMove(callback: (price: number) => void): IOrderLineAdapter;
  onTPMoveEnd(callback: (price: number, partialPercent?: number) => void): IOrderLineAdapter;
  onSLMoveEnd(callback: (price: number, partialPercent?: number) => void): IOrderLineAdapter;
}

/**
 * TEALSTREET extensions for position line adapter
 * These methods are available in the patched TradingView library
 */
export interface TealstreetPositionLineExtensions {
  // PnL display
  setPnl(pnl: string): IPositionLineAdapter;
  setPnlShort(pnl: string): IPositionLineAdapter;
  setProfitState(state: ProfitState): IPositionLineAdapter;
  // Compact display for mobile
  setTextShort(text: string): IPositionLineAdapter;
  setQuantityShort(quantity: string): IPositionLineAdapter;
  // Position data for calculations
  setPositionData(data: PositionData): IPositionLineAdapter;
  // Bracket TP/SL controls
  setBrackets(brackets: BracketConfig | null): IPositionLineAdapter;
  setPartialEnabled(enabled: boolean): IPositionLineAdapter;
  setPnlCalculator(calculator: (price: number, percent: number) => string): IPositionLineAdapter;
  // Bracket callbacks
  onTPClick(callback: () => void): IPositionLineAdapter;
  onSLClick(callback: () => void): IPositionLineAdapter;
  onTPMove(callback: (price: number) => void): IPositionLineAdapter;
  onSLMove(callback: (price: number) => void): IPositionLineAdapter;
  onTPMoveEnd(callback: (price: number, partialPercent?: number) => void): IPositionLineAdapter;
  onSLMoveEnd(callback: (price: number, partialPercent?: number) => void): IPositionLineAdapter;
}

/**
 * Combined order line adapter with TEALSTREET extensions
 */
export type FullOrderLineAdapter = IOrderLineAdapter & Partial<TealstreetOrderLineExtensions>;

/**
 * Combined position line adapter with TEALSTREET extensions
 */
export type FullPositionLineAdapter = IPositionLineAdapter & Partial<TealstreetPositionLineExtensions>;

/**
 * Internal order line callbacks (used for interaction handling)
 * @internal
 */
export interface OrderLineCallbacks {
  onMove: ((price: number) => void) | null;
  onCancel: (() => void) | null;
  onModify: ((text: string, price: number) => void) | null;
  pnlCalculator: ((price: number, percent: number) => string) | null;
  onTPClick: (() => void) | null;
  onSLClick: (() => void) | null;
  onTPMove: ((price: number) => void) | null;
  onSLMove: ((price: number) => void) | null;
  onTPMoveEnd: ((price: number, partialPercent?: number) => void) | null;
  onSLMoveEnd: ((price: number, partialPercent?: number) => void) | null;
}

/**
 * Internal position line callbacks (used for interaction handling)
 * @internal
 */
export interface PositionLineCallbacks {
  onClose: (() => void) | null;
  onReverse: (() => void) | null;
  onModify: ((text: string, price: number) => void) | null;
  pnlCalculator: ((price: number, percent: number) => string) | null;
  onTPClick: (() => void) | null;
  onSLClick: (() => void) | null;
  onTPMove: ((price: number) => void) | null;
  onSLMove: ((price: number) => void) | null;
  onTPMoveEnd: ((price: number, partialPercent?: number) => void) | null;
  onSLMoveEnd: ((price: number, partialPercent?: number) => void) | null;
}

/**
 * Internal order line adapter with render data getter (used by TealchartApi)
 * @internal
 */
export interface InternalOrderLineAdapter extends FullOrderLineAdapter {
  _getRenderData(): OrderLineRenderData;
  _getCallbacks(): OrderLineCallbacks;
  // TradingView API compatibility (no-op)
  setBodyFont(font: string): this;
  setQuantityFont(font: string): this;
}

/**
 * Internal position line adapter with render data getter (used by TealchartApi)
 * @internal
 */
export interface InternalPositionLineAdapter extends FullPositionLineAdapter {
  _getRenderData(): PositionLineRenderData;
  _getCallbacks(): PositionLineCallbacks;
  // TradingView API compatibility (no-op)
  setBodyFont(font: string): this;
  setQuantityFont(font: string): this;
}

/**
 * Internal execution line adapter with render data getter (used by TealchartApi)
 * @internal
 */
export interface InternalExecutionLineAdapter extends IExecutionLineAdapter {
  _getRenderData(): ExecutionLineRenderData;
}

// ============================================================================
// Unified Pane System
// All chart regions (main, indicators) are represented as panes with shared interface
// ============================================================================

/**
 * Pane type discriminator
 */
export type ChartPaneType = 'main' | 'indicator';

/**
 * Unified chart pane - main chart and indicator panes use the same interface
 * The main chart is "just another pane" with type: 'main'
 */
export interface ChartPane {
  /** Unique pane ID ('main' for main pane, 'pane_1', 'pane_2', etc. for indicators) */
  id: string;
  /** Pane type - 'main' renders candles/volume, 'indicator' renders plots */
  type: ChartPaneType;
  /** Pane height as ratio of available space (0-1) */
  heightRatio: number;
  /** Current Y-axis minimum (set from viewport for main, auto-scaled or fixed for indicators) */
  yMin: number;
  /** Current Y-axis maximum */
  yMax: number;
  /** Whether the Y-axis range is fixed (false for main, true for RSI 0-100, etc.) */
  fixedRange: boolean;
  /** Indicator instance IDs rendered in this pane (only for type: 'indicator') */
  indicatorIds?: string[];
}

/**
 * Computed pane with pixel positions - calculated at render time from ChartPane
 */
export interface ComputedPane extends ChartPane {
  /** Pixel offset from canvas top */
  top: number;
  /** Pixel height of this pane */
  height: number;
  /** Bottom edge (top + height) */
  bottom: number;
}

/**
 * Layout configuration for all panes (new unified format)
 */
export interface UnifiedPaneLayout {
  /** All panes in render order (main first, then indicators) */
  panes: ChartPane[];
  /** Pixels reserved for time axis at bottom */
  timeAxisHeight: number;
}

/**
 * Default unified pane layout - just the main pane
 */
export const DEFAULT_UNIFIED_PANE_LAYOUT: UnifiedPaneLayout = {
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
  timeAxisHeight: TIME_AXIS_HEIGHT,
};

// ============================================================================
// Legacy Pane Types (for backward compatibility during migration)
// ============================================================================

/**
 * An indicator pane for non-overlay indicators
 * @deprecated Use ChartPane with type: 'indicator' instead
 */
export interface IndicatorPane {
  /** Unique pane ID (auto-generated) */
  id: string;
  /** Indicator instance IDs rendered in this pane */
  indicatorIds: string[];
  /** Pane height as ratio of total chart height (0-1) */
  heightRatio: number;
  /** Current Y-axis minimum */
  yMin: number;
  /** Current Y-axis maximum */
  yMax: number;
  /** Whether the Y-axis range is fixed (e.g., RSI: 0-100) */
  fixedRange: boolean;
}

/**
 * Layout configuration for all panes
 * @deprecated Use UnifiedPaneLayout instead
 */
export interface PaneLayout {
  /** Main price pane height ratio (e.g., 0.6) */
  mainPaneHeight: number;
  /** Volume pane height ratio (e.g., 0.1) */
  volumePaneHeight: number;
  /** Indicator panes (in order from top to bottom below volume) */
  indicatorPanes: IndicatorPane[];
}

/**
 * Default pane layout
 * @deprecated Use DEFAULT_UNIFIED_PANE_LAYOUT instead
 */
export const DEFAULT_PANE_LAYOUT: PaneLayout = {
  mainPaneHeight: 0.7,
  volumePaneHeight: 0.1,
  indicatorPanes: [],
};

/**
 * Default height for new indicator panes
 */
export const DEFAULT_INDICATOR_PANE_HEIGHT = 0.15;

/**
 * Minimum pane height ratio
 */
export const MIN_PANE_HEIGHT = 0.05;

/**
 * Right padding for price axis labels (pixels from canvas edge)
 */
export const PRICE_AXIS_RIGHT_PADDING = 2;

// ============================================================================
// Gap Detection & Recovery
// ============================================================================

/**
 * Reason for triggering a gap detection recovery
 */
export type GapDetectionReason = 'network-reconnect' | 'visibility-change' | 'bar-timeout' | 'bar-gap';

/**
 * Configuration options for gap detection
 */
export interface GapDetectionOptions {
  /** Multiplier for bar timeout (default: 2 = wait 2x the interval) */
  barTimeoutMultiplier?: number;
  /** Debounce delay for visibility changes in ms (default: 1000) */
  visibilityDebounceMs?: number;
  /** Debounce delay for network reconnection in ms (default: 2000) */
  networkDebounceMs?: number;
  /** Minimum bar timeout in ms (default: 30000) */
  minBarTimeoutMs?: number;
  /** Gap threshold multiplier - gap detected if time > interval * this (default: 1.5) */
  gapThresholdMultiplier?: number;
  /** Whether gap detection is enabled (default: true) */
  enabled?: boolean;
  /** Maximum number of recovery retries before giving up (default: 3) */
  maxRetries?: number;
  /** Base backoff time in ms, doubles each retry (default: 5000) */
  baseBackoffMs?: number;
}

/**
 * Event emitted when gap detection triggers a recovery
 */
export interface GapDetectionEvent {
  /** Reason for the recovery */
  reason: GapDetectionReason;
  /** Timestamp when the event was triggered */
  timestamp: number;
  /** Additional details about the gap */
  details?: {
    expectedBarTime?: number;
    actualBarTime?: number;
    gapMs?: number;
  };
}

/**
 * Error state from gap detection when max retries exceeded
 */
export interface GapDetectionErrorState {
  /** Whether there is an active error */
  hasError: boolean;
  /** Number of retries attempted */
  retryCount: number;
  /** Maximum retries allowed */
  maxRetries: number;
  /** The reason that caused the error */
  reason?: GapDetectionReason;
}
