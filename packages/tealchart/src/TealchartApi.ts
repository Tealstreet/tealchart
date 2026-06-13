/**
 * TealchartApi - Per-chart API that mirrors TradingView's IChartWidgetApi
 * Provides access to chart-specific functionality like subscriptions, trading lines, etc.
 */

import { Subscription } from './events/EventEmitter';
import type {
  ChartTradingApi,
  ChartTradingExecutionLine,
  ChartTradingIntent,
  ChartTradingIntentHandler,
  ChartTradingLineStyle,
  ChartTradingAction,
  ChartTradingOrderLine,
  ChartTradingPositionLine,
  ChartTradingState,
} from './trading';
import {
  BracketConfig,
  CrossHairMovedEventParams,
  EnhancedCrossHairState,
  ExecutionDirection,
  ExecutionLineRenderData,
  IExecutionLineAdapter,
  InternalOrderLineAdapter,
  InternalPositionLineAdapter,
  InternalExecutionLineAdapter,
  IOrderLineAdapter,
  IPositionLineAdapter,
  IStudyApi,
  ISubscription,
  ITimeScaleApi,
  OrderLineOptions,
  OrderLineRenderData,
  ChartLabelButton,
  PositionData,
  PositionLineOptions,
  PositionLineRenderData,
  ProfitState,
  ResolutionString,
  StudyInfo,
} from './types';
import { createSyncPromise } from './utils/syncPromise';

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
export type StudyCreateCallback = (studyId: string, name: string, inputs: Record<string, unknown>) => Promise<boolean>;

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
  private _tradingIntentSubscription: Subscription<ChartTradingIntentHandler>;
  private _chartTradingApi: ChartTradingApi | null = null;
  private _chartTradingState: ChartTradingState = {};
  private _chartTradingOrderLineIds: Map<string, string> = new Map();
  private _chartTradingPositionLineIds: Map<string, string> = new Map();
  private _chartTradingExecutionLineIds: Map<string, string> = new Map();

  // Trading lines
  private _orderLines: Map<string, InternalOrderLineAdapter> = new Map();
  private _positionLines: Map<string, InternalPositionLineAdapter> = new Map();
  private _executionLines: Map<string, InternalExecutionLineAdapter> = new Map();
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
  private _onResetData?: () => void;

  constructor(symbol: string, interval: ResolutionString, account?: string) {
    this._symbol = symbol;
    this._interval = interval;
    this._account = account;

    this._crossHairMovedSubscription = new Subscription();
    this._symbolChangedSubscription = new Subscription();
    this._intervalChangedSubscription = new Subscription();
    this._tradingIntentSubscription = new Subscription();
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

  /**
   * Subscribe to chart trading intents emitted by order and position interactions.
   */
  onTradingIntent(): ISubscription<ChartTradingIntentHandler> {
    return this._tradingIntentSubscription;
  }

  /**
   * High-level chart trading facade for state-driven order, position, and execution rendering.
   */
  trading(): ChartTradingApi {
    if (!this._chartTradingApi) {
      this._chartTradingApi = {
        setState: (state) => this.setTradingState(state),
        getState: () => this.getTradingState(),
        onIntent: (handler) => {
          this._tradingIntentSubscription.subscribe(null, handler);
          return () => this._tradingIntentSubscription.unsubscribe(null, handler);
        },
      };
    }

    return this._chartTradingApi;
  }

  /**
   * Set the state rendered by the high-level chart trading facade.
   */
  setTradingState(state: ChartTradingState): void {
    this._setTradingState(state);
  }

  /**
   * Get the last state passed to the high-level chart trading facade.
   */
  getTradingState(): ChartTradingState {
    return this._cloneTradingState(this._chartTradingState);
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
   * @internal Emit a chart trading intent for adapter-compatible interactions.
   */
  emitTradingIntent(intent: ChartTradingIntent): void {
    this._tradingIntentSubscription.emit(intent);
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

  private _setTradingState(state: ChartTradingState): void {
    const nextState = this._cloneTradingState(state);

    this._syncChartTradingOrders(nextState.orders ?? []);
    this._syncChartTradingPositions(nextState.positions ?? []);
    this._syncChartTradingExecutions(nextState.executions ?? []);
    this._chartTradingState = nextState;
    this._onLinesChanged?.();
  }

  private _cloneTradingState(state: ChartTradingState): ChartTradingState {
    return {
      orders: state.orders?.map((order) => this._cloneTradingOrder(order)),
      positions: state.positions?.map((position) => this._cloneTradingPosition(position)),
      executions: state.executions?.map((execution) => this._cloneTradingExecution(execution)),
    };
  }

  private _cloneTradingOrder(order: ChartTradingOrderLine): ChartTradingOrderLine {
    return {
      ...order,
      label: order.label ? { ...order.label } : undefined,
      style: order.style ? { ...order.style } : undefined,
      actions: order.actions?.map((action) => ({ ...action })),
      brackets: order.brackets ? { ...order.brackets } : order.brackets,
    };
  }

  private _cloneTradingPosition(position: ChartTradingPositionLine): ChartTradingPositionLine {
    return {
      ...position,
      label: position.label ? { ...position.label } : undefined,
      style: position.style ? { ...position.style } : undefined,
      actions: position.actions?.map((action) => ({ ...action })),
      brackets: position.brackets ? { ...position.brackets } : position.brackets,
    };
  }

  private _cloneTradingExecution(execution: ChartTradingExecutionLine): ChartTradingExecutionLine {
    return {
      ...execution,
      label: execution.label ? { ...execution.label } : undefined,
      style: execution.style ? { ...execution.style } : undefined,
      actions: execution.actions?.map((action) => ({ ...action })),
    };
  }

  private _syncChartTradingOrders(orders: readonly ChartTradingOrderLine[]): void {
    const nextIds = new Set(orders.map((order) => order.id));

    for (const [id, lineId] of this._chartTradingOrderLineIds) {
      if (!nextIds.has(id)) {
        this._orderLines.delete(lineId);
        this._chartTradingOrderLineIds.delete(id);
      }
    }

    for (const order of orders) {
      const lineId = this._ownedTradingLineId('order', order.id);
      let adapter = this._orderLines.get(lineId);
      if (!adapter) {
        adapter = this._createOrderLineAdapter(lineId, { price: order.price });
        this._orderLines.set(lineId, adapter);
      }

      this._chartTradingOrderLineIds.set(order.id, lineId);
      this._applyChartTradingOrder(adapter, order);
    }
  }

  private _syncChartTradingPositions(positions: readonly ChartTradingPositionLine[]): void {
    const nextIds = new Set(positions.map((position) => position.id));

    for (const [id, lineId] of this._chartTradingPositionLineIds) {
      if (!nextIds.has(id)) {
        this._positionLines.delete(lineId);
        this._chartTradingPositionLineIds.delete(id);
      }
    }

    for (const position of positions) {
      const lineId = this._ownedTradingLineId('position', position.id);
      let adapter = this._positionLines.get(lineId);
      if (!adapter) {
        adapter = this._createPositionLineAdapter(lineId, { price: position.price });
        this._positionLines.set(lineId, adapter);
      }

      this._chartTradingPositionLineIds.set(position.id, lineId);
      this._applyChartTradingPosition(adapter, position);
    }
  }

  private _syncChartTradingExecutions(executions: readonly ChartTradingExecutionLine[]): void {
    const nextIds = new Set(executions.map((execution) => execution.id));

    for (const [id, lineId] of this._chartTradingExecutionLineIds) {
      if (!nextIds.has(id)) {
        this._executionLines.delete(lineId);
        this._chartTradingExecutionLineIds.delete(id);
      }
    }

    for (const execution of executions) {
      const lineId = this._ownedTradingLineId('execution', execution.id);
      let adapter = this._executionLines.get(lineId);
      if (!adapter) {
        adapter = this._createExecutionLineAdapter(lineId);
        this._executionLines.set(lineId, adapter);
      }

      this._chartTradingExecutionLineIds.set(execution.id, lineId);
      this._applyChartTradingExecution(adapter, execution);
    }
  }

  private _ownedTradingLineId(kind: 'order' | 'position' | 'execution', id: string): string {
    return `chart_trading_${kind}_${id}`;
  }

  private _applyChartTradingOrder(adapter: InternalOrderLineAdapter, order: ChartTradingOrderLine): void {
    const style = order.style;
    const text = order.label?.primary ?? this._defaultTradingLabel(order.side, 'Order');
    const textShort = order.label?.secondary ?? text;
    const quantity = this._formatTradingQuantity(order.label?.quantity ?? order.quantity);
    const cancellable = order.cancellable === true || this._hasEnabledTradingAction(order.actions, 'cancel');
    const editable = order.editable === true;

    adapter
      .setOrderId(order.orderId ?? order.id)
      .setPrice(order.price)
      .setText(text)
      .setQuantity(quantity)
      .setEditable(editable)
      .setCancellable(cancellable);

    adapter.setTextShort?.(textShort);
    adapter.setQuantityShort?.(quantity);
    adapter.setBrackets?.(this._toBracketConfig(order.brackets));
    adapter.setPartialEnabled?.(order.partialEnabled === true);
    adapter.setActions(this._toRenderActions(order.actions, style, 'rgba(33, 150, 243, 0.75)', '#2196F3'));

    if (editable) {
      adapter.onMove(() => {});
    }
    if (cancellable) {
      adapter.onCancel(() => {});
    }

    this._applyOrderTradingStyle(adapter, style, this._tradingLineColor(order.side, 'order'));
  }

  private _applyChartTradingPosition(adapter: InternalPositionLineAdapter, position: ChartTradingPositionLine): void {
    const style = position.style;
    const text = position.label?.primary ?? this._defaultTradingLabel(position.side, 'Position');
    const textShort = position.label?.secondary ?? text;
    const quantity = this._formatTradingQuantity(position.label?.quantity ?? position.quantity);
    const closeable = position.closeable === true || this._hasEnabledTradingAction(position.actions, 'close');
    const reversible = position.reversible === true || this._hasEnabledTradingAction(position.actions, 'reverse');
    const isLong = position.side !== 'short' && position.side !== 'sell';

    adapter
      .setPositionId(position.positionId ?? position.id)
      .setPrice(position.price)
      .setText(text)
      .setQuantity(quantity)
      .setCloseable(closeable)
      .setReversible(reversible);

    adapter.setTextShort?.(textShort);
    adapter.setQuantityShort?.(quantity);
    adapter.setPnl?.(position.label?.pnl ?? position.label?.secondary ?? '');
    adapter.setPnlShort?.(position.label?.pnl ?? position.label?.secondary ?? '');
    adapter.setProfitState?.(position.profitState ?? 'neutral');
    adapter.setPositionData?.({
      entryPrice: position.price,
      notional: position.notional ?? 0,
      isLong,
    });
    adapter.setBrackets?.(this._toBracketConfig(position.brackets));
    adapter.setPartialEnabled?.(position.partialEnabled === true);
    adapter.setActions(this._toRenderActions(position.actions, style, 'rgba(76, 175, 80, 0.75)', '#4CAF50'));

    if (closeable) {
      adapter.onClose(() => {});
    }
    if (reversible) {
      adapter.onReverse(() => {});
    }

    this._applyPositionTradingStyle(adapter, style, this._tradingLineColor(position.side, 'position'));
  }

  private _applyChartTradingExecution(adapter: InternalExecutionLineAdapter, execution: ChartTradingExecutionLine): void {
    const color = execution.style?.lineColor ?? this._tradingLineColor(execution.direction, 'order');

    adapter
      .setPrice(execution.price)
      .setTime(execution.time)
      .setDirection(execution.direction)
      .setText(execution.label?.primary ?? execution.direction.toUpperCase())
      .setTooltip(execution.label?.secondary ?? '')
      .setArrowColor(color);
  }

  private _toBracketConfig(brackets: ChartTradingOrderLine['brackets']): BracketConfig | null {
    if (!brackets) return null;
    return {
      takeProfit: brackets.takeProfit,
      stopLoss: brackets.stopLoss,
    };
  }

  private _toRenderActions(
    actions: readonly ChartTradingAction[] | undefined,
    style: ChartTradingLineStyle | undefined,
    defaultBackgroundColor: string,
    defaultBorderColor: string,
  ): ChartLabelButton[] {
    return (actions ?? [])
      .filter((action) => !action.disabled && !this._isBuiltInTradingAction(action.id))
      .map((action) => ({
        type: 'action' as const,
        actionId: action.id,
        icon: action.icon ?? action.label.slice(0, 2).toUpperCase(),
        backgroundColor: style?.actionBackgroundColor ?? defaultBackgroundColor,
        iconColor: style?.actionIconColor ?? '#FFFFFF',
        borderColor: style?.actionBorderColor ?? style?.lineColor ?? defaultBorderColor,
        tooltip: action.tooltip ?? action.label,
      }));
  }

  private _isBuiltInTradingAction(actionId: string): boolean {
    return actionId === 'cancel' || actionId === 'close' || actionId === 'reverse';
  }

  private _formatTradingQuantity(quantity: string | number | undefined): string {
    return quantity === undefined ? '' : String(quantity);
  }

  private _hasEnabledTradingAction(actions: readonly { id: string; disabled?: boolean }[] | undefined, id: string): boolean {
    return actions?.some((action) => action.id === id && !action.disabled) ?? false;
  }

  private _defaultTradingLabel(side: ChartTradingOrderLine['side'], fallback: string): string {
    if (!side) return fallback;
    return side.toUpperCase();
  }

  private _tradingLineColor(side: ChartTradingOrderLine['side'], kind: 'order' | 'position'): string {
    if (side === 'buy' || side === 'long') return '#22c55e';
    if (side === 'sell' || side === 'short') return '#ef4444';
    return kind === 'position' ? '#4CAF50' : '#2196F3';
  }

  private _lineStyleValue(style: ChartTradingLineStyle['lineStyle'] | undefined): number | undefined {
    if (style === undefined) return undefined;
    if (style === 'solid') return 0;
    if (style === 'dotted') return 1;
    if (style === 'dashed') return 2;
    return style;
  }

  private _applyOrderTradingStyle(
    adapter: InternalOrderLineAdapter,
    style: ChartTradingLineStyle | undefined,
    defaultLineColor: string,
  ): void {
    adapter.setLineColor(style?.lineColor ?? defaultLineColor);
    adapter.setLineStyle(this._lineStyleValue(style?.lineStyle) ?? 0);
    adapter.setLineWidth(style?.lineWidth ?? 1);
    adapter.setLineLength(style?.lineLength ?? 50);
    adapter.setExtendLeft(style?.extendLeft ?? false);
    adapter.setBodyBackgroundColor(style?.bodyBackgroundColor ?? 'rgba(33, 150, 243, 0.75)');
    adapter.setBodyTextColor(style?.bodyTextColor ?? '#FFFFFF');
    adapter.setBodyBorderColor(style?.bodyBorderColor ?? defaultLineColor);
    adapter.setQuantityBackgroundColor(style?.quantityBackgroundColor ?? 'rgba(33, 150, 243, 0.75)');
    adapter.setQuantityTextColor(style?.quantityTextColor ?? '#FFFFFF');
    adapter.setQuantityBorderColor(style?.quantityBorderColor ?? defaultLineColor);
    adapter.setCancelButtonBackgroundColor(style?.actionBackgroundColor ?? 'rgba(33, 150, 243, 0.75)');
    adapter.setCancelButtonIconColor(style?.actionIconColor ?? '#FFFFFF');
    adapter.setCancelButtonBorderColor(style?.actionBorderColor ?? defaultLineColor);
  }

  private _applyPositionTradingStyle(
    adapter: InternalPositionLineAdapter,
    style: ChartTradingLineStyle | undefined,
    defaultLineColor: string,
  ): void {
    adapter.setLineColor(style?.lineColor ?? defaultLineColor);
    adapter.setLineStyle(this._lineStyleValue(style?.lineStyle) ?? 0);
    adapter.setLineWidth(style?.lineWidth ?? 2);
    adapter.setLineLength(style?.lineLength ?? 100);
    adapter.setExtendLeft(style?.extendLeft ?? false);
    adapter.setBodyBackgroundColor(style?.bodyBackgroundColor ?? 'rgba(76, 175, 80, 0.75)');
    adapter.setBodyTextColor(style?.bodyTextColor ?? '#FFFFFF');
    adapter.setBodyBorderColor(style?.bodyBorderColor ?? defaultLineColor);
    adapter.setQuantityBackgroundColor(style?.quantityBackgroundColor ?? 'rgba(76, 175, 80, 0.75)');
    adapter.setQuantityTextColor(style?.quantityTextColor ?? '#FFFFFF');
    adapter.setQuantityBorderColor(style?.quantityBorderColor ?? defaultLineColor);
    adapter.setCloseButtonBackgroundColor(style?.actionBackgroundColor ?? 'rgba(244, 67, 54, 0.75)');
    adapter.setCloseButtonIconColor(style?.actionIconColor ?? '#FFFFFF');
    adapter.setCloseButtonBorderColor(style?.actionBorderColor ?? '#F44336');
    adapter.setReverseButtonBackgroundColor(style?.actionBackgroundColor ?? 'rgba(76, 175, 80, 0.75)');
    adapter.setReverseButtonIconColor(style?.actionIconColor ?? '#FFFFFF');
    adapter.setReverseButtonBorderColor(style?.actionBorderColor ?? defaultLineColor);
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
   * Reset chart data and request fresh data from datafeed.
   * Mirrors TradingView's resetData() — clears cached bars, unsubscribes
   * from real-time feed, and triggers a full reload cycle.
   */
  resetData(): void {
    this._onResetData?.();
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
   * Create an execution marker on the chart.
   * Returns a Promise for TradingView API compatibility.
   */
  createExecutionShape(): Promise<IExecutionLineAdapter> {
    const id = `execution_${++this._lineIdCounter}`;
    const adapter = this._createExecutionLineAdapter(id);
    this._executionLines.set(id, adapter);
    this._onLinesChanged?.();
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
      actions: [],
    };

    // Callbacks (not part of render data)
    let _onMoveCallback: ((price: number) => void) | null = null;
    let _onCancelCallback: (() => void) | null = null;
    let _onModifyCallback: ((text: string, price: number) => void) | null = null;
    let _pnlCalculator: ((price: number, percent: number) => string) | null = null;
    // TEALSTREET bracket callbacks
    let _onTPClick: (() => void) | null = null;
    let _onSLClick: (() => void) | null = null;
    let _onTPMove: ((price: number, partialPercent?: number) => void) | null = null;
    let _onSLMove: ((price: number, partialPercent?: number) => void) | null = null;
    let _onTPMoveEnd: ((price: number, partialPercent?: number) => void) | null = null;
    let _onSLMoveEnd: ((price: number, partialPercent?: number) => void) | null = null;

    // Capture references for closure
    const orderLines = this._orderLines;
    const onOrderPriceChanged = () => this._onOrderPriceChanged;
    const emitOrderBracketIntent = (
      type: 'bracket.tp.preview' | 'bracket.sl.preview' | 'bracket.tp.commit' | 'bracket.sl.commit',
      price: number,
      partialPercent?: number,
    ) => {
      this.emitTradingIntent({
        type,
        ownerType: 'order',
        ownerId: data.orderId ?? id,
        lineId: id,
        price,
        partialPercent: partialPercent ?? 100,
        source: 'native-line',
      });
    };
    const emitOrderBracketClickIntent = (type: 'bracket.tp.click' | 'bracket.sl.click') => {
      this.emitTradingIntent({
        type,
        ownerType: 'order',
        ownerId: data.orderId ?? id,
        lineId: id,
        source: 'native-line',
      });
    };
    const emitOrderCancelIntent = () => {
      this.emitTradingIntent({
        type: 'order.cancel',
        orderId: data.orderId ?? id,
        lineId: id,
        source: 'native-line',
      });
    };
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
      setActions(actions: ChartLabelButton[]) {
        data.actions = actions;
        notifyChange();
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
      onTPMove(callback: (price: number, partialPercent?: number) => void) {
        _onTPMove = callback;
        return this;
      },
      onSLMove(callback: (price: number, partialPercent?: number) => void) {
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
          callbacks: {
            onTPClick: () => {
              emitOrderBracketClickIntent('bracket.tp.click');
              _onTPClick?.();
            },
            onSLClick: () => {
              emitOrderBracketClickIntent('bracket.sl.click');
              _onSLClick?.();
            },
            onTPMove: (price, partialPercent) => {
              emitOrderBracketIntent('bracket.tp.preview', price, partialPercent);
              _onTPMove?.(price, partialPercent);
            },
            onSLMove: (price, partialPercent) => {
              emitOrderBracketIntent('bracket.sl.preview', price, partialPercent);
              _onSLMove?.(price, partialPercent);
            },
            onTPMoveEnd: (price, partialPercent) => {
              emitOrderBracketIntent('bracket.tp.commit', price, partialPercent);
              _onTPMoveEnd?.(price, partialPercent);
            },
            onSLMoveEnd: (price, partialPercent) => {
              emitOrderBracketIntent('bracket.sl.commit', price, partialPercent);
              _onSLMoveEnd?.(price, partialPercent);
            },
            onCancel: data.cancellable && _onCancelCallback
              ? () => {
                  emitOrderCancelIntent();
                  _onCancelCallback?.();
                }
              : undefined,
          },
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
      actions: [],
    };

    // Callbacks (not part of render data)
    let _onCloseCallback: (() => void) | null = null;
    let _onReverseCallback: (() => void) | null = null;
    let _onModifyCallback: ((text: string, price: number) => void) | null = null;
    let _pnlCalculator: ((price: number, percent: number) => string) | null = null;
    // TEALSTREET bracket callbacks
    let _onTPClick: (() => void) | null = null;
    let _onSLClick: (() => void) | null = null;
    let _onTPMove: ((price: number, partialPercent?: number) => void) | null = null;
    let _onSLMove: ((price: number, partialPercent?: number) => void) | null = null;
    let _onTPMoveEnd: ((price: number, partialPercent?: number) => void) | null = null;
    let _onSLMoveEnd: ((price: number, partialPercent?: number) => void) | null = null;

    // Capture references for closure
    const positionLines = this._positionLines;
    const emitPositionBracketIntent = (
      type: 'bracket.tp.preview' | 'bracket.sl.preview' | 'bracket.tp.commit' | 'bracket.sl.commit',
      price: number,
      partialPercent?: number,
    ) => {
      this.emitTradingIntent({
        type,
        ownerType: 'position',
        ownerId: data.positionId ?? id,
        lineId: id,
        price,
        partialPercent: partialPercent ?? 100,
        source: 'native-line',
      });
    };
    const emitPositionBracketClickIntent = (type: 'bracket.tp.click' | 'bracket.sl.click') => {
      this.emitTradingIntent({
        type,
        ownerType: 'position',
        ownerId: data.positionId ?? id,
        lineId: id,
        source: 'native-line',
      });
    };
    const emitPositionCloseIntent = () => {
      this.emitTradingIntent({
        type: 'position.close',
        positionId: data.positionId ?? id,
        lineId: id,
        source: 'native-line',
      });
    };
    const emitPositionReverseIntent = () => {
      this.emitTradingIntent({
        type: 'position.reverse',
        positionId: data.positionId ?? id,
        lineId: id,
        source: 'native-line',
      });
    };
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
      setCloseable(closeable: boolean) {
        data.closeable = closeable;
        notifyChange();
        return this;
      },
      setReversible(reversible: boolean) {
        data.reversible = reversible;
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
      setActions(actions: ChartLabelButton[]) {
        data.actions = actions;
        notifyChange();
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
      onTPMove(callback: (price: number, partialPercent?: number) => void) {
        _onTPMove = callback;
        return this;
      },
      onSLMove(callback: (price: number, partialPercent?: number) => void) {
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
        return {
          ...data,
          callbacks: {
            onTPClick: () => {
              emitPositionBracketClickIntent('bracket.tp.click');
              _onTPClick?.();
            },
            onSLClick: () => {
              emitPositionBracketClickIntent('bracket.sl.click');
              _onSLClick?.();
            },
            onTPMove: (price, partialPercent) => {
              emitPositionBracketIntent('bracket.tp.preview', price, partialPercent);
              _onTPMove?.(price, partialPercent);
            },
            onSLMove: (price, partialPercent) => {
              emitPositionBracketIntent('bracket.sl.preview', price, partialPercent);
              _onSLMove?.(price, partialPercent);
            },
            onTPMoveEnd: (price, partialPercent) => {
              emitPositionBracketIntent('bracket.tp.commit', price, partialPercent);
              _onTPMoveEnd?.(price, partialPercent);
            },
            onSLMoveEnd: (price, partialPercent) => {
              emitPositionBracketIntent('bracket.sl.commit', price, partialPercent);
              _onSLMoveEnd?.(price, partialPercent);
            },
            onClose: data.closeable && _onCloseCallback
              ? () => {
                  emitPositionCloseIntent();
                  _onCloseCallback?.();
                }
              : undefined,
            onReverse: data.reversible && _onReverseCallback
              ? () => {
                  emitPositionReverseIntent();
                  _onReverseCallback?.();
                }
              : undefined,
          },
        };
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

  /**
   * @internal Create execution line adapter with TradingView-compatible chaining
   */
  private _createExecutionLineAdapter(id: string): InternalExecutionLineAdapter {
    const data: ExecutionLineRenderData = {
      id,
      price: 0,
      time: 0,
      direction: 'buy',
      text: '',
      tooltip: '',
      arrowHeight: 20,
      arrowSpacing: 20,
      font: `11px sans-serif`,
      textColor: '#ffffff',
      arrowColor: '#26a69a',
    };

    const executionLines = this._executionLines;
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

    const adapter: InternalExecutionLineAdapter = {
      remove() {
        executionLines.delete(id);
        notifyChange();
      },
      getPrice() {
        return data.price;
      },
      setPrice(price: number) {
        data.price = price;
        notifyChange();
        return this;
      },
      getTime() {
        return data.time;
      },
      setTime(time: number) {
        data.time = time;
        notifyChange();
        return this;
      },
      getDirection() {
        return data.direction;
      },
      setDirection(direction: ExecutionDirection) {
        data.direction = direction;
        notifyChange();
        return this;
      },
      getText() {
        return data.text;
      },
      setText(text: string) {
        data.text = text;
        notifyChange();
        return this;
      },
      getTooltip() {
        return data.tooltip;
      },
      setTooltip(tooltip: string) {
        data.tooltip = tooltip;
        notifyChange();
        return this;
      },
      getArrowHeight() {
        return data.arrowHeight;
      },
      setArrowHeight(height: number) {
        data.arrowHeight = height;
        notifyChange();
        return this;
      },
      getArrowSpacing() {
        return data.arrowSpacing;
      },
      setArrowSpacing(spacing: number) {
        data.arrowSpacing = spacing;
        notifyChange();
        return this;
      },
      getFont() {
        return data.font;
      },
      setFont(font: string) {
        data.font = font;
        notifyChange();
        return this;
      },
      getTextColor() {
        return data.textColor;
      },
      setTextColor(color: string) {
        data.textColor = color;
        notifyChange();
        return this;
      },
      getArrowColor() {
        return data.arrowColor;
      },
      setArrowColor(color: string) {
        data.arrowColor = color;
        notifyChange();
        return this;
      },
      _getRenderData(): ExecutionLineRenderData {
        return { ...data };
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
    options?: { checkLimit?: boolean; priceScale?: string; displayName?: string },
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
   * Clear all execution markers without calling individual remove() callbacks
   */
  clearAllExecutionLines(): void {
    this._executionLines.clear();
    this._onLinesChanged?.();
  }

  /**
   * @internal Clean up all subscriptions, lines, and studies
   */
  dispose(): void {
    this._crossHairMovedSubscription.clear();
    this._symbolChangedSubscription.clear();
    this._intervalChangedSubscription.clear();
    this._tradingIntentSubscription.clear();
    this._orderLines.clear();
    this._positionLines.clear();
    this._executionLines.clear();
    this._chartTradingOrderLineIds.clear();
    this._chartTradingPositionLineIds.clear();
    this._chartTradingExecutionLineIds.clear();
    this._chartTradingState = {};
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
   * @internal Set callback for resetData
   */
  setOnResetData(callback: () => void): void {
    this._onResetData = callback;
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
   * @internal Get all execution markers for rendering
   */
  getExecutionLines(): Map<string, InternalExecutionLineAdapter> {
    return this._executionLines;
  }

  /**
   * @internal Get order line render data for canvas drawing
   * Deduplicates by orderId - when multiple lines have the same orderId,
   * only the last one is kept (typically the confirmed order, not the submitting one)
   */
  getOrderLinesRenderData(): OrderLineRenderData[] {
    const allLines = Array.from(this._orderLines.values()).map((adapter) => adapter._getRenderData());

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
    const allLines = Array.from(this._positionLines.values()).map((adapter) => adapter._getRenderData());

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
   * @internal Get execution marker render data for canvas drawing
   */
  getExecutionLinesRenderData(): ExecutionLineRenderData[] {
    return Array.from(this._executionLines.values()).map((adapter) => adapter._getRenderData());
  }

  /**
   * @internal Trigger onCancel callback for an order line
   * Called when cancel button is clicked in the Konva layer
   */
  triggerOrderCancel(orderId: string): void {
    const adapter = this._orderLines.get(orderId);
    if (adapter) {
      const renderData = adapter._getRenderData();
      this.emitTradingIntent({
        type: 'order.cancel',
        orderId: renderData.orderId ?? orderId,
        lineId: orderId,
        source: 'native-line',
      });
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
      const renderData = adapter._getRenderData();
      this.emitTradingIntent({
        type: 'order.move.commit',
        orderId: renderData.orderId ?? orderId,
        lineId: orderId,
        price: newPrice,
        source: 'native-line',
      });
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
      const renderData = adapter._getRenderData();
      this.emitTradingIntent({
        type: 'position.close',
        positionId: renderData.positionId ?? positionId,
        lineId: positionId,
        source: 'native-line',
      });
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
      const renderData = adapter._getRenderData();
      this.emitTradingIntent({
        type: 'position.reverse',
        positionId: renderData.positionId ?? positionId,
        lineId: positionId,
        source: 'native-line',
      });
      const callbacks = adapter._getCallbacks();
      if (callbacks.onReverse) {
        callbacks.onReverse();
      }
    }
  }

  /**
   * @internal Trigger a custom chart trading line action.
   */
  triggerLineAction(lineId: string, actionId: string): void {
    this.emitTradingIntent({
      type: 'line.action',
      lineId,
      actionId,
      source: 'native-line',
    });
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
