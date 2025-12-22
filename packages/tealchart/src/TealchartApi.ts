/**
 * TealchartApi - Per-chart API that mirrors TradingView's IChartWidgetApi
 * Provides access to chart-specific functionality like subscriptions, trading lines, etc.
 */

import { Subscription } from './events/EventEmitter';
import { createSyncPromise } from './utils/syncPromise';
import {
  BracketConfig,
  CrossHairMovedEventParams,
  EnhancedCrossHairState,
  InternalOrderLineAdapter,
  InternalPositionLineAdapter,
  IOrderLineAdapter,
  IPositionLineAdapter,
  IStudyApi,
  ITimeScaleApi,
  ISubscription,
  OrderLineOptions,
  OrderLineRenderData,
  PositionData,
  PositionLineOptions,
  PositionLineRenderData,
  ProfitState,
  ResolutionString,
  StudyInfo,
} from './types';

/**
 * Internal study state
 */
interface ManagedStudy {
  id: string;
  name: string;
  inputs: Record<string, unknown>;
  overrides: Record<string, unknown>;
  isOverlay: boolean;
  isLocked: boolean;
  isVisible: boolean;
}

/**
 * Callback for study creation (implemented by widget)
 */
export type StudyCreateCallback = (
  studyId: string,
  name: string,
  inputs: Record<string, unknown>
) => Promise<boolean>;

/**
 * Per-chart API (equivalent to TradingView's IChartWidgetApi)
 */
export class TealchartApi {
  private _symbol: string;
  private _interval: ResolutionString;
  private _account?: string;

  // Subscriptions
  private _crossHairMovedSubscription: Subscription<(params: CrossHairMovedEventParams) => void>;
  private _symbolChangedSubscription: Subscription<() => void>;
  private _intervalChangedSubscription: Subscription<(interval: ResolutionString) => void>;

  // Trading lines
  private _orderLines: Map<string, InternalOrderLineAdapter> = new Map();
  private _positionLines: Map<string, InternalPositionLineAdapter> = new Map();
  private _lineIdCounter = 0;
  private _onLinesChanged?: () => void;
  private _onOrderPriceChanged?: (orderId: string, newPrice: number) => void;

  // Studies
  private _studies: Map<string, ManagedStudy> = new Map();
  private _studyIdCounter = 0;
  private _onStudyCreate?: StudyCreateCallback;
  private _onStudyRemove?: (studyId: string) => void;

  // Callback for when symbol/interval changes need to propagate to widget
  private _onSymbolChange?: (symbol: string) => void;
  private _onIntervalChange?: (interval: ResolutionString) => void;

  constructor(symbol: string, interval: ResolutionString, account?: string) {
    this._symbol = symbol;
    this._interval = interval;
    this._account = account;

    this._crossHairMovedSubscription = new Subscription();
    this._symbolChangedSubscription = new Subscription();
    this._intervalChangedSubscription = new Subscription();
  }

  // ============================================================================
  // Symbol/Resolution
  // ============================================================================

  /**
   * Get current symbol
   */
  symbol(): string {
    return this._symbol;
  }

  /**
   * Set symbol (triggers onSymbolChanged subscription)
   */
  setSymbol(symbol: string): void {
    if (this._symbol !== symbol) {
      this._symbol = symbol;
      this._symbolChangedSubscription.emit();
      this._onSymbolChange?.(symbol);
    }
  }

  /**
   * Get current interval/resolution
   */
  resolution(): ResolutionString {
    return this._interval;
  }

  /**
   * Set interval (triggers onIntervalChanged subscription)
   */
  setResolution(interval: ResolutionString): void {
    if (this._interval !== interval) {
      this._interval = interval;
      this._intervalChangedSubscription.emit(interval);
      this._onIntervalChange?.(interval);
    }
  }

  // ============================================================================
  // Subscriptions (TradingView-style)
  // ============================================================================

  /**
   * Subscribe to crosshair movement events
   */
  crossHairMoved(): ISubscription<(params: CrossHairMovedEventParams) => void> {
    return this._crossHairMovedSubscription;
  }

  /**
   * Subscribe to symbol change events
   */
  onSymbolChanged(): ISubscription<() => void> {
    return this._symbolChangedSubscription;
  }

  /**
   * Subscribe to interval change events
   */
  onIntervalChanged(): ISubscription<(interval: ResolutionString) => void> {
    return this._intervalChangedSubscription;
  }

  // ============================================================================
  // Internal methods for emitting events (called by widget/renderer)
  // ============================================================================

  /**
   * @internal Emit crosshair moved event
   */
  emitCrossHairMoved(params: CrossHairMovedEventParams): void {
    this._crossHairMovedSubscription.emit(params);
  }

  /**
   * @internal Emit enhanced crosshair state (Tealstreet extension)
   */
  getEnhancedCrossHairState(params: CrossHairMovedEventParams): EnhancedCrossHairState {
    return {
      ...params,
      symbol: this._symbol,
      account: this._account,
    };
  }

  /**
   * @internal Emit current interval to subscribers (used for initialization)
   * This allows the parent to sync its state without triggering a data reload
   */
  emitCurrentInterval(): void {
    this._intervalChangedSubscription.emit(this._interval);
  }

  // ============================================================================
  // Data Management
  // ============================================================================

  /**
   * Check if chart data is ready.
   * Returns a boolean directly (TradingView direct mode compatible).
   * Note: In our implementation, we always return true since we don't load data
   * until onChartReady fires, by which point bars are already loaded.
   */
  dataReady(): boolean {
    // For custom chart, data is ready as soon as onChartReady fires
    // The ChartLineCoordinator can safely proceed with creating lines
    return true;
  }

  /**
   * Reset chart data and request fresh data from datafeed
   */
  resetData(): void {
    // TODO: Implement - should clear cached bars and trigger new data request
    console.warn('[Tealchart] resetData called - implementation pending');
  }

  // ============================================================================
  // Time Scale
  // ============================================================================

  /**
   * Get time scale API
   */
  getTimeScale(): ITimeScaleApi {
    // Return a minimal time scale API
    let rightOffset = 10; // Default right offset in bars

    return {
      defaultRightOffset: () => ({
        value: () => rightOffset,
        setValue: (value: number) => {
          rightOffset = value;
          // TODO: Apply to renderer viewport
        },
      }),
    };
  }

  // ============================================================================
  // Trading Lines
  // ============================================================================

  /**
   * Create an order line on the chart
   * Returns a Promise for TradingView API compatibility
   *
   * Each call creates a new stateful adapter (like TradingView).
   * The caller is responsible for storing the adapter reference
   * and calling remove() when done.
   */
  createOrderLine(options?: OrderLineOptions): Promise<IOrderLineAdapter> {
    const id = `order_${++this._lineIdCounter}`;
    const adapter = this._createOrderLineAdapter(id, options);
    this._orderLines.set(id, adapter);
    this._onLinesChanged?.();
    // Return a sync promise - .then() executes immediately to match TradingView behavior
    return createSyncPromise(adapter);
  }

  /**
   * Create a position line on the chart
   * Returns a Promise for TradingView API compatibility
   *
   * Each call creates a new stateful adapter (like TradingView).
   * The caller is responsible for storing the adapter reference
   * and calling remove() when done.
   */
  createPositionLine(options?: PositionLineOptions): Promise<IPositionLineAdapter> {
    const id = `position_${++this._lineIdCounter}`;
    const adapter = this._createPositionLineAdapter(id, options);
    this._positionLines.set(id, adapter);
    this._onLinesChanged?.();
    // Return a sync promise - .then() executes immediately to match TradingView behavior
    return createSyncPromise(adapter);
  }

  /**
   * @internal Create order line adapter with full TradingView + TEALSTREET compatibility
   */
  private _createOrderLineAdapter(id: string, options?: OrderLineOptions): InternalOrderLineAdapter {
    // Store all render data in a structured object
    const data: OrderLineRenderData = {
      id,
      orderId: undefined, // External order ID for deduplication
      price: options?.price ?? 0,
      quantity: String(options?.quantity ?? ''),
      quantityShort: '',
      text: options?.text ?? '',
      textShort: '',
      lineColor: options?.lineColor ?? '#2196F3',
      lineStyle: 0, // solid
      lineWidth: 1,
      lineLength: 50,
      extendLeft: false,
      editable: options?.editable ?? true,
      cancellable: options?.cancellable ?? false, // Set to true when onCancel callback is provided
      bodyBackgroundColor: options?.bodyBackgroundColor ?? 'rgba(33, 150, 243, 0.75)',
      bodyTextColor: options?.bodyTextColor ?? '#FFFFFF',
      bodyBorderColor: options?.bodyBorderColor ?? '#2196F3',
      quantityBackgroundColor: options?.quantityBackgroundColor ?? 'rgba(33, 150, 243, 0.75)',
      quantityTextColor: options?.quantityTextColor ?? '#FFFFFF',
      quantityBorderColor: options?.quantityBorderColor ?? '#2196F3',
      cancelButtonBackgroundColor: options?.cancelButtonBackgroundColor ?? 'rgba(33, 150, 243, 0.75)',
      cancelButtonIconColor: options?.cancelButtonIconColor ?? '#FFFFFF',
      cancelButtonBorderColor: options?.cancelButtonBorderColor ?? '#2196F3',
      cancelTooltip: 'Cancel',
      modifyTooltip: 'Modify',
      brackets: null,
      partialEnabled: false,
    };

    // Callbacks (not part of render data)
    let _onMoveCallback: ((price: number) => void) | null = null;
    let _onCancelCallback: (() => void) | null = null;
    let _onModifyCallback: ((text: string, price: number) => void) | null = null;
    let _pnlCalculator: ((price: number, percent: number) => string) | null = null;
    // TEALSTREET bracket callbacks
    let _onTPClick: (() => void) | null = null;
    let _onSLClick: (() => void) | null = null;
    let _onTPMove: ((price: number) => void) | null = null;
    let _onSLMove: ((price: number) => void) | null = null;
    let _onTPMoveEnd: ((price: number, partialPercent?: number) => void) | null = null;
    let _onSLMoveEnd: ((price: number, partialPercent?: number) => void) | null = null;

    // Capture references for closure
    const orderLines = this._orderLines;
    const onOrderPriceChanged = () => this._onOrderPriceChanged;
    // Debounce notifyChange to batch multiple setter calls (e.g., during initial line setup)
    let notifyPending = false;
    const notifyChange = () => {
      if (!notifyPending) {
        notifyPending = true;
        queueMicrotask(() => {
          notifyPending = false;
          this._onLinesChanged?.();
        });
      }
    };

    const adapter: InternalOrderLineAdapter = {
      // Lifecycle
      remove() {
        orderLines.delete(id);
        notifyChange();
      },

      // Price
      setPrice(p: number) {
        data.price = p;
        notifyChange();
        // Notify when price is set externally (for clearing pending drag state)
        onOrderPriceChanged()?.(id, p);
        return this;
      },
      getPrice() {
        return data.price;
      },

      // External order ID for deduplication
      setOrderId(orderId: string) {
        data.orderId = orderId;
        notifyChange();
        return this;
      },

      // Text and quantity
      setQuantity(q: string) {
        data.quantity = q;
        notifyChange();
        return this;
      },
      setText(t: string) {
        data.text = t;
        notifyChange();
        return this;
      },

      // Line styling
      setLineColor(color: string) {
        data.lineColor = color;
        notifyChange();
        return this;
      },
      setLineStyle(style: number) {
        data.lineStyle = style;
        notifyChange();
        return this;
      },
      setLineWidth(width: number) {
        data.lineWidth = width;
        notifyChange();
        return this;
      },
      setLineLength(length: number) {
        data.lineLength = length;
        notifyChange();
        return this;
      },
      setExtendLeft(extend: boolean) {
        data.extendLeft = extend;
        notifyChange();
        return this;
      },

      // Body styling
      setBodyBackgroundColor(color: string) {
        data.bodyBackgroundColor = color;
        notifyChange();
        return this;
      },
      setBodyTextColor(color: string) {
        data.bodyTextColor = color;
        notifyChange();
        return this;
      },
      setBodyBorderColor(color: string) {
        data.bodyBorderColor = color;
        notifyChange();
        return this;
      },

      // Font styling (no-op for TradingView API compatibility)
      // TODO: Implement font customization in tealchart renderer
      setBodyFont(_font: string) {
        return this;
      },
      setQuantityFont(_font: string) {
        return this;
      },

      // Quantity styling
      setQuantityBackgroundColor(color: string) {
        data.quantityBackgroundColor = color;
        notifyChange();
        return this;
      },
      setQuantityTextColor(color: string) {
        data.quantityTextColor = color;
        notifyChange();
        return this;
      },
      setQuantityBorderColor(color: string) {
        data.quantityBorderColor = color;
        notifyChange();
        return this;
      },

      // Cancel button styling
      setCancelButtonBackgroundColor(color: string) {
        data.cancelButtonBackgroundColor = color;
        notifyChange();
        return this;
      },
      setCancelButtonIconColor(color: string) {
        data.cancelButtonIconColor = color;
        notifyChange();
        return this;
      },
      setCancelButtonBorderColor(color: string) {
        data.cancelButtonBorderColor = color;
        notifyChange();
        return this;
      },

      // Tooltips
      setCancelTooltip(tooltip: string) {
        data.cancelTooltip = tooltip;
        return this;
      },
      setModifyTooltip(tooltip: string) {
        data.modifyTooltip = tooltip;
        return this;
      },

      // State
      setEditable(e: boolean) {
        data.editable = e;
        notifyChange();
        return this;
      },
      setCancellable(c: boolean) {
        data.cancellable = c;
        notifyChange();
        return this;
      },

      // Callbacks
      onMove(callback: (price: number) => void) {
        _onMoveCallback = callback;
        return this;
      },
      onCancel(callback: () => void) {
        _onCancelCallback = callback;
        // Show cancel button when callback is provided
        data.cancellable = true;
        notifyChange();
        return this;
      },
      onModify(callback: (text: string, price: number) => void) {
        _onModifyCallback = callback;
        return this;
      },

      // TEALSTREET: Compact display for mobile
      setTextShort(text: string) {
        data.textShort = text;
        return this;
      },
      setQuantityShort(quantity: string) {
        data.quantityShort = quantity;
        return this;
      },

      // TEALSTREET: Bracket TP/SL controls
      setBrackets(brackets: BracketConfig | null) {
        data.brackets = brackets;
        notifyChange();
        return this;
      },
      setPartialEnabled(enabled: boolean) {
        data.partialEnabled = enabled;
        return this;
      },
      setPnlCalculator(calculator: (price: number, percent: number) => string) {
        _pnlCalculator = calculator;
        return this;
      },

      // TEALSTREET: Bracket callbacks
      onTPClick(callback: () => void) {
        _onTPClick = callback;
        return this;
      },
      onSLClick(callback: () => void) {
        _onSLClick = callback;
        return this;
      },
      onTPMove(callback: (price: number) => void) {
        _onTPMove = callback;
        return this;
      },
      onSLMove(callback: (price: number) => void) {
        _onSLMove = callback;
        return this;
      },
      onTPMoveEnd(callback: (price: number, partialPercent?: number) => void) {
        _onTPMoveEnd = callback;
        return this;
      },
      onSLMoveEnd(callback: (price: number, partialPercent?: number) => void) {
        _onSLMoveEnd = callback;
        return this;
      },

      // @internal: Get render data for canvas drawing
      _getRenderData(): OrderLineRenderData {
        // editable should only be true if there's an onMove callback to handle the drag
        return {
          ...data,
          editable: data.editable && !!_onMoveCallback,
        };
      },

      // @internal: Get callbacks for interaction handling
      _getCallbacks() {
        return {
          onMove: _onMoveCallback,
          onCancel: _onCancelCallback,
          onModify: _onModifyCallback,
          pnlCalculator: _pnlCalculator,
          onTPClick: _onTPClick,
          onSLClick: _onSLClick,
          onTPMove: _onTPMove,
          onSLMove: _onSLMove,
          onTPMoveEnd: _onTPMoveEnd,
          onSLMoveEnd: _onSLMoveEnd,
        };
      },
    };

    return adapter;
  }

  /**
   * @internal Create position line adapter with full TradingView + TEALSTREET compatibility
   */
  private _createPositionLineAdapter(id: string, options?: PositionLineOptions): InternalPositionLineAdapter {
    // Store all render data in a structured object
    const data: PositionLineRenderData = {
      id,
      positionId: undefined, // External position ID for deduplication
      price: options?.price ?? 0,
      quantity: String(options?.quantity ?? ''),
      quantityShort: '',
      text: options?.text ?? '',
      textShort: '',
      lineColor: options?.lineColor ?? '#4CAF50',
      lineStyle: 0, // solid
      lineWidth: 2,
      lineLength: 100,
      extendLeft: false,
      bodyBackgroundColor: options?.bodyBackgroundColor ?? 'rgba(76, 175, 80, 0.75)',
      bodyTextColor: options?.bodyTextColor ?? '#FFFFFF',
      bodyBorderColor: options?.bodyBorderColor ?? '#4CAF50',
      quantityBackgroundColor: options?.quantityBackgroundColor ?? 'rgba(76, 175, 80, 0.75)',
      quantityTextColor: options?.quantityTextColor ?? '#FFFFFF',
      quantityBorderColor: options?.quantityBorderColor ?? '#4CAF50',
      closeable: false, // Set to true when onClose callback is provided
      closeButtonBackgroundColor: options?.closeButtonBackgroundColor ?? 'rgba(244, 67, 54, 0.75)',
      closeButtonIconColor: options?.closeButtonIconColor ?? '#FFFFFF',
      closeButtonBorderColor: options?.closeButtonBorderColor ?? '#F44336',
      reversible: false, // Set to true when onReverse callback is provided
      reverseButtonBackgroundColor: options?.reverseButtonBackgroundColor ?? 'rgba(76, 175, 80, 0.75)',
      reverseButtonIconColor: options?.reverseButtonIconColor ?? '#FFFFFF',
      reverseButtonBorderColor: options?.reverseButtonBorderColor ?? '#4CAF50',
      closeTooltip: 'Close position',
      protectTooltipText: options?.protectTooltipText ?? '',
      // TEALSTREET extensions
      pnl: '',
      pnlShort: '',
      profitState: 'neutral',
      brackets: null,
      partialEnabled: false,
      positionData: null,
    };

    // Callbacks (not part of render data)
    let _onCloseCallback: (() => void) | null = null;
    let _onReverseCallback: (() => void) | null = null;
    let _onModifyCallback: ((text: string, price: number) => void) | null = null;
    let _pnlCalculator: ((price: number, percent: number) => string) | null = null;
    // TEALSTREET bracket callbacks
    let _onTPClick: (() => void) | null = null;
    let _onSLClick: (() => void) | null = null;
    let _onTPMove: ((price: number) => void) | null = null;
    let _onSLMove: ((price: number) => void) | null = null;
    let _onTPMoveEnd: ((price: number, partialPercent?: number) => void) | null = null;
    let _onSLMoveEnd: ((price: number, partialPercent?: number) => void) | null = null;

    // Capture references for closure
    const positionLines = this._positionLines;
    // Debounce notifyChange to batch multiple setter calls (e.g., during initial line setup)
    let notifyPending = false;
    const notifyChange = () => {
      if (!notifyPending) {
        notifyPending = true;
        queueMicrotask(() => {
          notifyPending = false;
          this._onLinesChanged?.();
        });
      }
    };

    const adapter: InternalPositionLineAdapter = {
      // Lifecycle
      remove() {
        positionLines.delete(id);
        notifyChange();
      },

      // Price
      setPrice(p: number) {
        data.price = p;
        notifyChange();
        return this;
      },
      getPrice() {
        return data.price;
      },

      // External position ID for deduplication
      setPositionId(positionId: string) {
        data.positionId = positionId;
        notifyChange();
        return this;
      },

      // Text and quantity
      setQuantity(q: string) {
        data.quantity = q;
        notifyChange();
        return this;
      },
      setText(t: string) {
        data.text = t;
        notifyChange();
        return this;
      },

      // Line styling
      setLineColor(color: string) {
        data.lineColor = color;
        notifyChange();
        return this;
      },
      setLineStyle(style: number) {
        data.lineStyle = style;
        notifyChange();
        return this;
      },
      setLineWidth(width: number) {
        data.lineWidth = width;
        notifyChange();
        return this;
      },
      setLineLength(length: number) {
        data.lineLength = length;
        notifyChange();
        return this;
      },
      setExtendLeft(extend: boolean) {
        data.extendLeft = extend;
        notifyChange();
        return this;
      },

      // Body styling
      setBodyBackgroundColor(color: string) {
        data.bodyBackgroundColor = color;
        notifyChange();
        return this;
      },
      setBodyTextColor(color: string) {
        data.bodyTextColor = color;
        notifyChange();
        return this;
      },
      setBodyBorderColor(color: string) {
        data.bodyBorderColor = color;
        notifyChange();
        return this;
      },

      // Font styling (no-op for TradingView API compatibility)
      // TODO: Implement font customization in tealchart renderer
      setBodyFont(_font: string) {
        return this;
      },
      setQuantityFont(_font: string) {
        return this;
      },

      // Quantity styling
      setQuantityBackgroundColor(color: string) {
        data.quantityBackgroundColor = color;
        notifyChange();
        return this;
      },
      setQuantityTextColor(color: string) {
        data.quantityTextColor = color;
        notifyChange();
        return this;
      },
      setQuantityBorderColor(color: string) {
        data.quantityBorderColor = color;
        notifyChange();
        return this;
      },

      // Reverse button styling
      setReverseButtonBackgroundColor(color: string) {
        data.reverseButtonBackgroundColor = color;
        notifyChange();
        return this;
      },
      setReverseButtonIconColor(color: string) {
        data.reverseButtonIconColor = color;
        notifyChange();
        return this;
      },
      setReverseButtonBorderColor(color: string) {
        data.reverseButtonBorderColor = color;
        notifyChange();
        return this;
      },

      // Close button styling
      setCloseButtonBackgroundColor(color: string) {
        data.closeButtonBackgroundColor = color;
        notifyChange();
        return this;
      },
      setCloseButtonIconColor(color: string) {
        data.closeButtonIconColor = color;
        notifyChange();
        return this;
      },
      setCloseButtonBorderColor(color: string) {
        data.closeButtonBorderColor = color;
        notifyChange();
        return this;
      },

      // Tooltips
      setCloseTooltip(tooltip: string) {
        data.closeTooltip = tooltip;
        return this;
      },
      setProtectTooltipText(text: string) {
        data.protectTooltipText = text;
        return this;
      },

      // Callbacks
      onClose(callback: () => void) {
        _onCloseCallback = callback;
        // Show close button when callback is provided
        data.closeable = true;
        notifyChange();
        return this;
      },
      onReverse(callback: () => void) {
        _onReverseCallback = callback;
        // Show reverse button when callback is provided
        data.reversible = true;
        notifyChange();
        return this;
      },
      onModify(callback: (text: string, price: number) => void) {
        _onModifyCallback = callback;
        return this;
      },

      // TEALSTREET: PnL display
      setPnl(pnl: string) {
        data.pnl = pnl;
        notifyChange();
        return this;
      },
      setPnlShort(pnl: string) {
        data.pnlShort = pnl;
        return this;
      },
      setProfitState(state: ProfitState) {
        data.profitState = state;
        notifyChange();
        return this;
      },

      // TEALSTREET: Compact display for mobile
      setTextShort(text: string) {
        data.textShort = text;
        return this;
      },
      setQuantityShort(quantity: string) {
        data.quantityShort = quantity;
        return this;
      },

      // TEALSTREET: Position data for calculations
      setPositionData(posData: PositionData) {
        data.positionData = posData;
        return this;
      },

      // TEALSTREET: Bracket TP/SL controls
      setBrackets(brackets: BracketConfig | null) {
        data.brackets = brackets;
        notifyChange();
        return this;
      },
      setPartialEnabled(enabled: boolean) {
        data.partialEnabled = enabled;
        return this;
      },
      setPnlCalculator(calculator: (price: number, percent: number) => string) {
        _pnlCalculator = calculator;
        return this;
      },

      // TEALSTREET: Bracket callbacks
      onTPClick(callback: () => void) {
        _onTPClick = callback;
        return this;
      },
      onSLClick(callback: () => void) {
        _onSLClick = callback;
        return this;
      },
      onTPMove(callback: (price: number) => void) {
        _onTPMove = callback;
        return this;
      },
      onSLMove(callback: (price: number) => void) {
        _onSLMove = callback;
        return this;
      },
      onTPMoveEnd(callback: (price: number, partialPercent?: number) => void) {
        _onTPMoveEnd = callback;
        return this;
      },
      onSLMoveEnd(callback: (price: number, partialPercent?: number) => void) {
        _onSLMoveEnd = callback;
        return this;
      },

      // @internal: Get render data for canvas drawing
      _getRenderData(): PositionLineRenderData {
        return data;
      },

      // @internal: Get callbacks for interaction handling
      _getCallbacks() {
        return {
          onClose: _onCloseCallback,
          onReverse: _onReverseCallback,
          onModify: _onModifyCallback,
          pnlCalculator: _pnlCalculator,
          onTPClick: _onTPClick,
          onSLClick: _onSLClick,
          onTPMove: _onTPMove,
          onSLMove: _onSLMove,
          onTPMoveEnd: _onTPMoveEnd,
          onSLMoveEnd: _onSLMoveEnd,
        };
      },
    };

    return adapter;
  }

  // ============================================================================
  // Studies
  // ============================================================================

  /**
   * Create a study on the chart.
   *
   * The `name` parameter can be:
   * - A built-in indicator name (e.g., "Moving Average", "RSI")
   * - A Tealscript code string (starting with `//@version`)
   *
   * @param name - Indicator name or Tealscript code
   * @param forceOverlay - Force rendering on main price pane
   * @param lock - Lock the study from user edits
   * @param inputs - Initial input values
   * @param overrides - Style overrides
   * @param options - Additional options
   */
  async createStudy(
    name: string,
    forceOverlay?: boolean,
    lock?: boolean,
    inputs?: Record<string, unknown>,
    overrides?: Record<string, unknown>,
    options?: { checkLimit?: boolean; priceScale?: string; displayName?: string }
  ): Promise<IStudyApi | null> {
    const studyId = `study_${++this._studyIdCounter}`;

    // Use displayName if provided, otherwise fall back to name
    const displayName = options?.displayName ?? name;

    // Create managed study state
    const study: ManagedStudy = {
      id: studyId,
      name: displayName,
      inputs: inputs ?? {},
      overrides: overrides ?? {},
      isOverlay: forceOverlay ?? false,
      isLocked: lock ?? false,
      isVisible: true,
    };

    // If a creation callback is set, delegate to the widget
    if (this._onStudyCreate) {
      const success = await this._onStudyCreate(studyId, name, inputs ?? {});
      if (!success) {
        return null;
      }
    }

    // Store the study
    this._studies.set(studyId, study);

    // Return a study API for controlling this study
    return this._createStudyApi(studyId);
  }

  /**
   * Get all studies on the chart
   */
  getAllStudies(): StudyInfo[] {
    return Array.from(this._studies.values()).map((study) => ({
      id: study.id,
      name: study.name,
      isVisible: study.isVisible,
      inputs: study.inputs,
    }));
  }

  /**
   * Get a study by its ID
   */
  getStudyById(id: string): IStudyApi | null {
    if (!this._studies.has(id)) {
      return null;
    }
    return this._createStudyApi(id);
  }

  /**
   * Remove a study from the chart
   */
  removeStudy(studyId: string): void {
    if (this._studies.has(studyId)) {
      this._studies.delete(studyId);
      this._onStudyRemove?.(studyId);
    }
  }

  /**
   * Toggle visibility of a study
   */
  toggleStudyVisibility(studyId: string): void {
    const study = this._studies.get(studyId);
    if (study) {
      study.isVisible = !study.isVisible;
      // TODO: Trigger re-render/re-execute with visibility change
    }
  }

  /**
   * @internal Create a study API adapter for a given study
   */
  private _createStudyApi(studyId: string): IStudyApi {
    const studies = this._studies;
    const onStudyCreate = () => this._onStudyCreate;

    return {
      applyOverrides(overrides: Record<string, unknown>): void {
        const study = studies.get(studyId);
        if (study) {
          study.overrides = { ...study.overrides, ...overrides };
          // TODO: Trigger re-render with new overrides
        }
      },

      // Extended methods for full control
      remove(): void {
        studies.delete(studyId);
      },

      setInputs(inputs: Record<string, unknown>): void {
        const study = studies.get(studyId);
        if (study) {
          study.inputs = { ...study.inputs, ...inputs };
          // TODO: Trigger script re-execution with new inputs
        }
      },

      getInputs(): Record<string, unknown> {
        return studies.get(studyId)?.inputs ?? {};
      },

      getId(): string {
        return studyId;
      },

      getName(): string {
        return studies.get(studyId)?.name ?? '';
      },
    };
  }

  /**
   * @internal Set callback for study creation (called by widget)
   */
  setOnStudyCreate(callback: StudyCreateCallback): void {
    this._onStudyCreate = callback;
  }

  /**
   * @internal Set callback for study removal (called by widget)
   */
  setOnStudyRemove(callback: (studyId: string) => void): void {
    this._onStudyRemove = callback;
  }

  /**
   * @internal Get all studies for the widget to render
   */
  getStudies(): Map<string, ManagedStudy> {
    return this._studies;
  }

  // ============================================================================
  // Cleanup
  // ============================================================================

  /**
   * Clear all order lines without calling individual remove() callbacks
   * Use this during chart reset/recreation to avoid orphaned line references
   */
  clearAllOrderLines(): void {
    this._orderLines.clear();
    this._onLinesChanged?.();
  }

  /**
   * Clear all position lines without calling individual remove() callbacks
   * Use this during chart reset/recreation to avoid orphaned line references
   */
  clearAllPositionLines(): void {
    this._positionLines.clear();
    this._onLinesChanged?.();
  }

  /**
   * @internal Clean up all subscriptions, lines, and studies
   */
  dispose(): void {
    this._crossHairMovedSubscription.clear();
    this._symbolChangedSubscription.clear();
    this._intervalChangedSubscription.clear();
    this._orderLines.clear();
    this._positionLines.clear();
    this._studies.clear();
  }

  // ============================================================================
  // Internal setters for widget integration
  // ============================================================================

  /**
   * @internal Set callback for symbol changes
   */
  setOnSymbolChange(callback: (symbol: string) => void): void {
    this._onSymbolChange = callback;
  }

  /**
   * @internal Set callback for interval changes
   */
  setOnIntervalChange(callback: (interval: ResolutionString) => void): void {
    this._onIntervalChange = callback;
  }

  /**
   * @internal Set account for enhanced crosshair state
   */
  setAccount(account: string): void {
    this._account = account;
  }

  /**
   * @internal Get all order lines for rendering
   */
  getOrderLines(): Map<string, InternalOrderLineAdapter> {
    return this._orderLines;
  }

  /**
   * @internal Get all position lines for rendering
   */
  getPositionLines(): Map<string, InternalPositionLineAdapter> {
    return this._positionLines;
  }

  /**
   * @internal Get order line render data for canvas drawing
   * Deduplicates by orderId - when multiple lines have the same orderId,
   * only the last one is kept (typically the confirmed order, not the submitting one)
   */
  getOrderLinesRenderData(): OrderLineRenderData[] {
    const allLines = Array.from(this._orderLines.values())
      .map((adapter) => adapter._getRenderData());

    // Deduplicate by orderId - keep last occurrence (Map overwrites earlier entries)
    const seenOrderIds = new Map<string, OrderLineRenderData>();
    const result: OrderLineRenderData[] = [];

    for (const line of allLines) {
      if (line.orderId) {
        // Has external orderId - dedupe by it
        seenOrderIds.set(line.orderId, line);
      } else {
        // No orderId - include directly
        result.push(line);
      }
    }

    // Add deduplicated lines (last occurrence of each orderId)
    result.push(...seenOrderIds.values());
    return result;
  }

  /**
   * @internal Get position line render data for canvas drawing
   * Deduplicates by positionId - when multiple lines have the same positionId,
   * only the last one is kept
   */
  getPositionLinesRenderData(): PositionLineRenderData[] {
    const allLines = Array.from(this._positionLines.values())
      .map((adapter) => adapter._getRenderData());

    // Deduplicate by positionId - keep last occurrence (Map overwrites earlier entries)
    const seenPositionIds = new Map<string, PositionLineRenderData>();
    const result: PositionLineRenderData[] = [];

    for (const line of allLines) {
      if (line.positionId) {
        // Has external positionId - dedupe by it
        seenPositionIds.set(line.positionId, line);
      } else {
        // No positionId - include directly
        result.push(line);
      }
    }

    // Add deduplicated lines (last occurrence of each positionId)
    result.push(...seenPositionIds.values());
    return result;
  }

  /**
   * @internal Trigger onCancel callback for an order line
   * Called when cancel button is clicked in the Konva layer
   */
  triggerOrderCancel(orderId: string): void {
    const adapter = this._orderLines.get(orderId);
    if (adapter) {
      const callbacks = adapter._getCallbacks();
      if (callbacks.onCancel) {
        callbacks.onCancel();
      }
    }
  }

  /**
   * @internal Trigger onMove callback for an order line
   * Called when order line is dragged to a new price in the Konva layer
   */
  triggerOrderMove(orderId: string, newPrice: number): void {
    const adapter = this._orderLines.get(orderId);
    if (adapter) {
      const callbacks = adapter._getCallbacks();
      if (callbacks.onMove) {
        callbacks.onMove(newPrice);
      }
    }
  }

  /**
   * @internal Trigger onClose callback for a position line
   * Called when close button is clicked in the Konva layer
   */
  triggerPositionClose(positionId: string): void {
    const adapter = this._positionLines.get(positionId);
    if (adapter) {
      const callbacks = adapter._getCallbacks();
      if (callbacks.onClose) {
        callbacks.onClose();
      }
    }
  }

  /**
   * @internal Trigger onReverse callback for a position line
   * Called when reverse button is clicked in the Konva layer
   */
  triggerPositionReverse(positionId: string): void {
    const adapter = this._positionLines.get(positionId);
    if (adapter) {
      const callbacks = adapter._getCallbacks();
      if (callbacks.onReverse) {
        callbacks.onReverse();
      }
    }
  }

  // ============================================================================
  // TEALSTREET: Bracket TP/SL Trigger Methods
  // ============================================================================

  /**
   * @internal Trigger onTPClick callback for a position line
   * Called when TP button is clicked (without drag)
   */
  triggerTPClick(positionId: string): void {
    const adapter = this._positionLines.get(positionId);
    if (adapter) {
      const callbacks = adapter._getCallbacks();
      if (callbacks.onTPClick) {
        callbacks.onTPClick();
      }
    }
  }

  /**
   * @internal Trigger onSLClick callback for a position line
   * Called when SL button is clicked (without drag)
   */
  triggerSLClick(positionId: string): void {
    const adapter = this._positionLines.get(positionId);
    if (adapter) {
      const callbacks = adapter._getCallbacks();
      if (callbacks.onSLClick) {
        callbacks.onSLClick();
      }
    }
  }

  /**
   * @internal Trigger onTPMove callback for a position line
   * Called during TP button drag to show preview
   */
  triggerTPMove(positionId: string, price: number): void {
    const adapter = this._positionLines.get(positionId);
    if (adapter) {
      const callbacks = adapter._getCallbacks();
      if (callbacks.onTPMove) {
        callbacks.onTPMove(price);
      }
    }
  }

  /**
   * @internal Trigger onSLMove callback for a position line
   * Called during SL button drag to show preview
   */
  triggerSLMove(positionId: string, price: number): void {
    const adapter = this._positionLines.get(positionId);
    if (adapter) {
      const callbacks = adapter._getCallbacks();
      if (callbacks.onSLMove) {
        callbacks.onSLMove(price);
      }
    }
  }

  /**
   * @internal Trigger onTPMoveEnd callback for a position line
   * Called when TP button drag ends to place bracket order
   */
  triggerTPMoveEnd(positionId: string, price: number, partialPercent?: number): void {
    const adapter = this._positionLines.get(positionId);
    if (adapter) {
      const callbacks = adapter._getCallbacks();
      if (callbacks.onTPMoveEnd) {
        callbacks.onTPMoveEnd(price, partialPercent);
      }
    }
  }

  /**
   * @internal Trigger onSLMoveEnd callback for a position line
   * Called when SL button drag ends to place bracket order
   */
  triggerSLMoveEnd(positionId: string, price: number, partialPercent?: number): void {
    const adapter = this._positionLines.get(positionId);
    if (adapter) {
      const callbacks = adapter._getCallbacks();
      if (callbacks.onSLMoveEnd) {
        callbacks.onSLMoveEnd(price, partialPercent);
      }
    }
  }

  /**
   * @internal Get position line adapter by ID for callback access
   * Used by PriceLineLayer to get pnlCalculator during drag
   */
  getPositionAdapter(positionId: string): InternalPositionLineAdapter | undefined {
    return this._positionLines.get(positionId);
  }

  /**
   * @internal Set callback for when lines are changed (triggers re-render)
   */
  setOnLinesChanged(callback: () => void): void {
    this._onLinesChanged = callback;
  }

  /**
   * @internal Set callback for when an order's price is changed via setPrice()
   * Used to detect when external updates complete (clearing pending drag state)
   */
  setOnOrderPriceChanged(callback: (orderId: string, newPrice: number) => void): void {
    this._onOrderPriceChanged = callback;
  }
}
