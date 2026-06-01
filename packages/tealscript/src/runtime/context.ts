/**
 * Execution Context
 *
 * Holds all state during Tealscript execution:
 * - Built-in series (OHLCV, time, volume)
 * - Execution state (bar_index, barstate)
 * - User inputs
 * - Plot outputs
 */

import type {
  BoxDrawingOutput,
  DrawingLimits,
  DrawingObjectType,
  DrawingOutput,
  LabelDrawingOutput,
  LineDrawingOutput,
  PolylineDrawingOutput,
} from './drawings/types';
import { DrawingStore } from './drawings/store';
import { Series } from './series';
import {
  cloneStrategyLedger,
  createStrategyLedger,
  type StrategyLedger,
  type StrategyLedgerSettings,
} from './strategy';

export type {
  BoxDrawingOutput,
  PolylineDrawingOutput,
  TableCellDrawingOutput,
  TableDrawingOutput,
  ChartPoint,
  DrawingOutput,
  LabelDrawingOutput,
  LineDrawingOutput,
  LineFillDrawingOutput,
  DrawingLimits,
} from './drawings/types';

/**
 * Bar data structure
 */
export interface Bar {
  time: number; // Unix timestamp in milliseconds
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

/**
 * Barstate - information about the current bar's state
 */
export interface BarState {
  /** True if this is the first bar */
  isfirst: boolean;
  /** True if this is the last bar */
  islast: boolean;
  /** True if processing historical bars */
  ishistory: boolean;
  /** True if processing realtime bar */
  isrealtime: boolean;
  /** True if this is a new bar (just opened) */
  isnew: boolean;
  /** True if the bar just closed */
  isconfirmed: boolean;
  /** True on the last confirmed historical bar */
  islastconfirmedhistory: boolean;
}

/**
 * Syminfo - symbol information
 */
export interface SymInfo {
  ticker: string;
  description: string;
  type: string; // 'crypto', 'stock', 'forex', etc.
  currency: string;
  basecurrency: string;
  mintick: number; // Minimum price movement
  pricescale: number; // Price precision
  timezone: string;
}

/**
 * Timeframe information
 */
export interface TimeframeInfo {
  period: string; // e.g., '1', '5', '60', 'D', 'W'
  multiplier: number; // e.g., 1, 5, 60
  isminutes: boolean;
  isdaily: boolean;
  isweekly: boolean;
  ismonthly: boolean;
  isintraday: boolean;
  isseconds: boolean;
  isticks: boolean;
}

/**
 * Plot output from a script
 */
export interface PlotOutput {
  id: string;
  type: 'plot' | 'hline' | 'bgcolor' | 'barcolor' | 'plotbar' | 'plotcandle' | 'plotshape' | 'plotchar' | 'plotarrow' | 'fill';
  title: string;
  values: (number | null)[];

  /** Script ID that produced this plot (set by TealscriptManager) */
  scriptId?: string;

  // Styling
  color: string | (string | null)[];
  linewidth?: number;
  style?: PlotStyle;
  lineStyle?: PlotLineStyle;
  offset?: number;
  trackprice?: boolean;
  histbase?: number;
  join?: boolean;
  editable?: boolean;
  showLast?: number;
  display?: number;
  format?: string;
  precision?: number;
  forceOverlay?: boolean;

  // For plotbar/plotcandle
  openValues?: (number | null)[];
  highValues?: (number | null)[];
  lowValues?: (number | null)[];
  closeValues?: (number | null)[];
  wickColor?: string | (string | null)[];
  borderColor?: string | (string | null)[];

  // For hline
  price?: number;

  // For shapes
  location?: 'abovebar' | 'belowbar' | 'top' | 'bottom' | 'absolute';
  shape?: string;
  size?: 'tiny' | 'small' | 'normal' | 'large' | 'huge' | 'auto';
  text?: string;
  textColor?: string | (string | null)[];
  char?: string;

  // For plotarrow
  colorup?: string;
  colordown?: string;
  minHeight?: number;
  maxHeight?: number;

  // For fill
  plot1Id?: string;
  plot2Id?: string;
  fillgaps?: boolean;
}

export type PlotStyle =
  | 'line'
  | 'linebr'
  | 'stepline'
  | 'stepline_diamond'
  | 'histogram'
  | 'cross'
  | 'circles'
  | 'columns'
  | 'area'
  | 'areabr';

export type PlotLineStyle = 'solid' | 'dotted' | 'dashed';

export type AlertFrequency = 'once_per_bar' | 'once_per_bar_close' | 'all';

/**
 * Alert event from a direct alert() call.
 */
export interface AlertEvent {
  barIndex: number;
  time: number;
  message: string;
  frequency: AlertFrequency;
  isRealtime: boolean;
}

/**
 * Alert output from a script.
 */
export interface AlertOutput {
  id: string;
  type: 'alertcondition' | 'alert';
  title: string;
  message: string;
  values: (boolean | null)[];
  renderedMessages?: (string | null)[];
  frequency?: AlertFrequency;
  events: AlertEvent[];
}

export type LogLevel = 'info' | 'warning' | 'error';

/**
 * Log event from a Pine log.*() call.
 */
export interface LogOutput {
  level: LogLevel;
  barIndex: number;
  time: number;
  message: string;
}

/**
 * Input definition from indicator
 */
export interface InputDefinition {
  id: string;
  type: 'int' | 'float' | 'bool' | 'string' | 'source' | 'color' | 'price' | 'time' | 'timeframe' | 'symbol' | 'session' | 'text_area';
  title: string;
  defval: unknown;
  minval?: number;
  maxval?: number;
  step?: number;
  options?: unknown[];
  tooltip?: string;
  group?: string;
  inline?: string;
  confirm?: boolean;
  display?: unknown;
  active?: unknown;
}

/**
 * Execution Context - the runtime environment for a Tealscript
 */
export class ExecutionContext {
  private static readonly MAX_PLOT_OUTPUTS = 64;

  // =========================================================================
  // Built-in Series (OHLCV)
  // =========================================================================

  readonly open: Series<number>;
  readonly high: Series<number>;
  readonly low: Series<number>;
  readonly close: Series<number>;
  readonly volume: Series<number>;
  readonly time: Series<number>;
  readonly timenow: Series<number>;

  // HL2, HLC3, OHLC4 are computed on-demand

  // =========================================================================
  // Execution State
  // =========================================================================

  /** Current bar index (0-based) */
  bar_index: number = -1;

  /** Total number of bars */
  last_bar_index: number = -1;

  /** Current runtime wall-clock timestamp in milliseconds. */
  now: number = Date.now();

  /** Bar state information */
  barstate: BarState = {
    isfirst: true,
    islast: false,
    ishistory: true,
    isrealtime: false,
    isnew: true,
    isconfirmed: false,
    islastconfirmedhistory: false,
  };

  /** Symbol information */
  syminfo: SymInfo = {
    ticker: 'BTCUSDT',
    description: 'Bitcoin / Tether',
    type: 'crypto',
    currency: 'USDT',
    basecurrency: 'BTC',
    mintick: 0.01,
    pricescale: 100,
    timezone: 'UTC',
  };

  /** Timeframe information */
  timeframe: TimeframeInfo = {
    period: '60',
    multiplier: 60,
    isminutes: true,
    isdaily: false,
    isweekly: false,
    ismonthly: false,
    isintraday: true,
    isseconds: false,
    isticks: false,
  };

  // =========================================================================
  // User Inputs
  // =========================================================================

  /** Input definitions (from indicator declaration) */
  readonly inputDefinitions: InputDefinition[] = [];

  /** Current input values (from user settings) */
  readonly inputs: Map<string, unknown> = new Map();

  // =========================================================================
  // Plot Outputs
  // =========================================================================

  /** Plot outputs (populated during execution) */
  readonly plots: Map<string, PlotOutput> = new Map();

  /** Plot order (for layering) */
  readonly plotOrder: string[] = [];

  // =========================================================================
  // Drawing Outputs
  // =========================================================================

  private readonly drawingStore = new DrawingStore();

  /** Drawing object outputs (populated during execution) */
  readonly drawings: DrawingOutput[] = this.drawingStore.drawings;

  // =========================================================================
  // Alert Outputs
  // =========================================================================

  /** Alert outputs (populated during execution) */
  readonly alerts: Map<string, AlertOutput> = new Map();

  /** Alert order */
  readonly alertOrder: string[] = [];

  /** Pine log.*() events emitted during execution. */
  readonly logs: LogOutput[] = [];

  /** Strategy tester ledger state. */
  strategyLedger: StrategyLedger = createStrategyLedger();

  private realtimeStrategyLedgerSnapshot: StrategyLedger = createStrategyLedger();

  // =========================================================================
  // Internal State
  // =========================================================================

  /** All bars data */
  private bars: Bar[] = [];

  /** Indicator title */
  indicatorTitle: string = 'Untitled';
  indicatorShortTitle?: string;

  /** Indicator settings */
  indicatorOverlay: boolean = false;
  indicatorPrecision: number = 2;
  indicatorFormat?: string;
  indicatorScale?: string;
  indicatorTimeframe?: string;
  indicatorTimeframeGaps?: boolean;
  indicatorExplicitPlotZOrder?: boolean;
  indicatorCalcBarsCount?: number;
  indicatorMaxBarsBack?: number;

  constructor() {
    this.open = new Series<number>();
    this.high = new Series<number>();
    this.low = new Series<number>();
    this.close = new Series<number>();
    this.volume = new Series<number>();
    this.time = new Series<number>();
    this.timenow = new Series<number>();
  }

  // =========================================================================
  // Computed Built-in Series
  // =========================================================================

  /** (high + low) / 2 */
  get hl2(): number {
    const h = this.high.get(0);
    const l = this.low.get(0);
    if (h === undefined || l === undefined) return NaN;
    return (h + l) / 2;
  }

  /** (high + low + close) / 3 */
  get hlc3(): number {
    const h = this.high.get(0);
    const l = this.low.get(0);
    const c = this.close.get(0);
    if (h === undefined || l === undefined || c === undefined) return NaN;
    return (h + l + c) / 3;
  }

  /** (open + high + low + close) / 4 */
  get ohlc4(): number {
    const o = this.open.get(0);
    const h = this.high.get(0);
    const l = this.low.get(0);
    const c = this.close.get(0);
    if (o === undefined || h === undefined || l === undefined || c === undefined) return NaN;
    return (o + h + l + c) / 4;
  }

  /** Typical price alias for hlc3 */
  get hlcc4(): number {
    const h = this.high.get(0);
    const l = this.low.get(0);
    const c = this.close.get(0);
    if (h === undefined || l === undefined || c === undefined) return NaN;
    return (h + l + c + c) / 4;
  }

  // =========================================================================
  // Bar Management
  // =========================================================================

  /**
   * Initialize context with bar data
   */
  loadBars(bars: Bar[]): void {
    this.bars = bars;
    this.last_bar_index = bars.length - 1;

    // Reset all built-in series
    this.open.reset();
    this.high.reset();
    this.low.reset();
    this.close.reset();
    this.volume.reset();
    this.time.reset();
    this.timenow.reset();

    this.bar_index = -1;
  }

  /**
   * Advance to the next bar
   */
  advanceBar(): boolean {
    this.bar_index++;

    if (this.bar_index >= this.bars.length) {
      return false;
    }

    const bar = this.bars[this.bar_index];

    // Advance all built-in series
    this.open.advance();
    this.high.advance();
    this.low.advance();
    this.close.advance();
    this.volume.advance();
    this.time.advance();
    this.timenow.advance();

    // Set values for current bar
    this.open.set(bar.open);
    this.high.set(bar.high);
    this.low.set(bar.low);
    this.close.set(bar.close);
    this.volume.set(bar.volume);
    this.time.set(bar.time);
    this.timenow.set(this.now);

    // Update barstate
    this.barstate.isfirst = this.bar_index === 0;
    this.barstate.islast = this.bar_index === this.last_bar_index;
    this.barstate.ishistory = true;
    this.barstate.isrealtime = false;
    this.barstate.isnew = true;
    this.barstate.isconfirmed = true;
    this.barstate.islastconfirmedhistory = this.barstate.islast;

    return true;
  }

  /**
   * Update current bar with new data (realtime)
   */
  updateCurrentBar(bar: Bar): void {
    this.bars[this.bar_index] = bar;
    this.open.set(bar.open);
    this.high.set(bar.high);
    this.low.set(bar.low);
    this.close.set(bar.close);
    this.volume.set(bar.volume);
    this.time.set(bar.time);
    this.timenow.set(this.now);

    this.barstate.isnew = false;
    this.barstate.isrealtime = true;
    this.barstate.ishistory = false;
    this.barstate.isconfirmed = false;
    this.barstate.islastconfirmedhistory = false;
  }

  /**
   * Mark the current realtime bar as confirmed for its closing update.
   */
  confirmCurrentRealtimeBar(): void {
    this.barstate.isnew = false;
    this.barstate.isrealtime = true;
    this.barstate.ishistory = false;
    this.barstate.isconfirmed = true;
    this.barstate.islastconfirmedhistory = false;
  }

  /**
   * Start a new unconfirmed realtime bar.
   */
  startRealtimeBar(bar: Bar): void {
    this.bars.push(bar);
    this.last_bar_index = this.bars.length - 1;
    this.bar_index = this.last_bar_index;

    this.open.advance();
    this.high.advance();
    this.low.advance();
    this.close.advance();
    this.volume.advance();
    this.time.advance();
    this.timenow.advance();

    this.open.set(bar.open);
    this.high.set(bar.high);
    this.low.set(bar.low);
    this.close.set(bar.close);
    this.volume.set(bar.volume);
    this.time.set(bar.time);
    this.timenow.set(this.now);

    this.barstate.isfirst = this.bar_index === 0;
    this.barstate.islast = true;
    this.barstate.ishistory = false;
    this.barstate.isrealtime = true;
    this.barstate.isnew = true;
    this.barstate.isconfirmed = false;
    this.barstate.islastconfirmedhistory = false;
  }

  /**
   * Commit current bar (bar closed)
   */
  commitBar(): void {
    this.open.commit();
    this.high.commit();
    this.low.commit();
    this.close.commit();
    this.volume.commit();
    this.time.commit();
    this.timenow.commit();

    this.barstate.isconfirmed = true;
    this.barstate.islastconfirmedhistory = this.barstate.ishistory && this.barstate.islast;
  }

  /**
   * Rollback current bar (discard realtime changes)
   */
  rollbackBar(): void {
    this.open.rollback();
    this.high.rollback();
    this.low.rollback();
    this.close.rollback();
    this.volume.rollback();
    this.time.rollback();
    this.timenow.rollback();
    this.strategyLedger = cloneStrategyLedger(this.realtimeStrategyLedgerSnapshot);
  }

  /**
   * Snapshot state before the replaceable realtime bar executes.
   */
  captureRealtimeRollbackState(): void {
    this.realtimeStrategyLedgerSnapshot = cloneStrategyLedger(this.strategyLedger);
  }

  /**
   * Add a new bar (realtime)
   */
  addBar(bar: Bar): void {
    this.bars.push(bar);
    this.last_bar_index = this.bars.length - 1;
  }

  /**
   * Get bar at index
   */
  getBar(index: number): Bar | undefined {
    return this.bars[index];
  }

  /**
   * Get current bar
   */
  getCurrentBar(): Bar | undefined {
    return this.bars[this.bar_index];
  }

  /**
   * Set the current runtime wall-clock timestamp.
   */
  setNow(now: number): void {
    this.now = now;
  }

  // =========================================================================
  // Input Management
  // =========================================================================

  /**
   * Register an input definition
   */
  registerInput(def: InputDefinition): void {
    this.inputDefinitions.push(def);
    if (!this.inputs.has(def.id)) {
      this.inputs.set(def.id, def.defval);
    }
  }

  /**
   * Set input value
   */
  setInput(id: string, value: unknown): void {
    this.inputs.set(id, value);
  }

  /**
   * Get input value
   */
  getInput<T>(id: string): T | undefined {
    return this.inputs.get(id) as T | undefined;
  }

  // =========================================================================
  // Plot Management
  // =========================================================================

  /**
   * Register a plot
   */
  registerPlot(plot: Omit<PlotOutput, 'values'>): void {
    const isLimitedPlot = plot.type !== 'hline';
    if (!this.plots.has(plot.id) && isLimitedPlot && this.countLimitedPlots() >= ExecutionContext.MAX_PLOT_OUTPUTS) {
      throw new Error(`Too many plot outputs: maximum is ${ExecutionContext.MAX_PLOT_OUTPUTS}`);
    }

    const fullPlot: PlotOutput = {
      ...plot,
      values: [],
    };
    this.plots.set(plot.id, fullPlot);
    this.plotOrder.push(plot.id);
  }

  /**
   * Add value to a plot
   */
  addPlotValue(id: string, value: number | null): void {
    const plot = this.plots.get(id);
    if (plot) {
      plot.values.push(value);
    }
  }

  /**
   * Truncate all plot value (and color) arrays to the given length.
   * Used before re-executing the last bar so that re-appended values
   * don't duplicate the previous tick's output.
   */
  truncatePlots(length: number): void {
    for (const plot of this.plots.values()) {
      plot.values.length = length;
      if (Array.isArray(plot.color)) {
        plot.color.length = length;
      }
      if (plot.openValues) plot.openValues.length = length;
      if (plot.highValues) plot.highValues.length = length;
      if (plot.lowValues) plot.lowValues.length = length;
      if (plot.closeValues) plot.closeValues.length = length;
      if (Array.isArray(plot.wickColor)) plot.wickColor.length = length;
      if (Array.isArray(plot.borderColor)) plot.borderColor.length = length;
    }
  }

  /**
   * Get all plots as array
   */
  getPlots(): PlotOutput[] {
    return this.plotOrder.map((id) => this.plots.get(id)!).filter(Boolean);
  }

  private countLimitedPlots(): number {
    let count = 0;
    for (const plot of this.plots.values()) {
      if (plot.type !== 'hline') {
        count++;
      }
    }
    return count;
  }

  /**
   * Add a drawing object output.
   */
  addDrawing(drawing: DrawingOutput): void {
    this.drawingStore.add(drawing);
  }

  /**
   * Configure the maximum number of drawings retained per object type.
   */
  setDrawingLimit(type: keyof DrawingLimits, value: number): void {
    this.drawingStore.setLimit(type, value);
  }

  getDrawingLimit(type: keyof DrawingLimits): number {
    return this.drawingStore.getLimit(type);
  }

  /**
   * Current number of drawing outputs.
   */
  getDrawingCount(): number {
    return this.drawingStore.count();
  }

  /**
   * Mark drawings created from an index onward as persistent.
   */
  markDrawingsPersistentFrom(index: number): void {
    this.drawingStore.markPersistentFrom(index);
  }

  /**
   * Get a drawing object by handle ID.
   */
  getDrawing(id: string): DrawingOutput | undefined {
    return this.drawingStore.get(id);
  }

  getDrawingIds(type: DrawingObjectType): string[] {
    return this.drawingStore.getIds(type);
  }

  /**
   * Delete a drawing object by handle ID.
   */
  deleteDrawing(id: string): void {
    this.drawingStore.delete(id);
  }

  /**
   * Copy a label drawing object to a new handle ID.
   */
  copyLabelDrawing(id: string, newId: string): LabelDrawingOutput | undefined {
    return this.drawingStore.copyLabel(id, newId, this.bar_index);
  }

  /**
   * Copy a line drawing object to a new handle ID.
   */
  copyLineDrawing(id: string, newId: string): LineDrawingOutput | undefined {
    return this.drawingStore.copyLine(id, newId, this.bar_index);
  }

  /**
   * Copy a box drawing object to a new handle ID.
   */
  copyBoxDrawing(id: string, newId: string): BoxDrawingOutput | undefined {
    return this.drawingStore.copyBox(id, newId, this.bar_index);
  }

  /**
   * Copy a polyline drawing object to a new handle ID.
   */
  copyPolylineDrawing(id: string, newId: string): PolylineDrawingOutput | undefined {
    return this.drawingStore.copyPolyline(id, newId, this.bar_index);
  }

  /**
   * Get all drawing outputs as array.
   */
  getDrawings(): DrawingOutput[] {
    return this.drawingStore.all();
  }

  /**
   * Remove drawing outputs from a bar index onward.
   */
  truncateDrawings(fromBarIndex: number): void {
    this.drawingStore.truncateFromBarIndex(fromBarIndex);
  }

  // =========================================================================
  // Alert Management
  // =========================================================================

  /**
   * Register an alert output.
   */
  registerAlert(alert: Omit<AlertOutput, 'values' | 'events'>): void {
    const fullAlert: AlertOutput = {
      ...alert,
      values: [],
      events: [],
    };
    this.alerts.set(alert.id, fullAlert);
    this.alertOrder.push(alert.id);
  }

  /**
   * Set an alertcondition value for the current bar.
   */
  setAlertConditionValue(id: string, value: boolean | null, renderedMessage?: string | null): void {
    const alert = this.alerts.get(id);
    if (!alert) return;

    while (alert.values.length < this.bar_index) {
      alert.values.push(null);
      alert.renderedMessages?.push(null);
    }
    alert.values[this.bar_index] = value;
    if (alert.renderedMessages) {
      alert.renderedMessages[this.bar_index] = renderedMessage ?? null;
    }
  }

  /**
   * Add an alert() event for the current bar.
   */
  addAlertEvent(id: string, message: string, frequency: AlertFrequency): void {
    if (frequency === 'once_per_bar_close' && !this.barstate.isconfirmed) {
      return;
    }

    if (frequency !== 'all' && this.hasNonAllAlertEventForCurrentBar(id)) {
      return;
    }

    let alert = this.alerts.get(id);
    if (!alert) {
      this.registerAlert({
        id,
        type: 'alert',
        title: 'alert',
        message,
        frequency,
      });
      alert = this.alerts.get(id);
    }

    if (!alert) return;

    const currentBar = this.getCurrentBar();
    while (alert.values.length < this.bar_index) {
      alert.values.push(null);
    }
    alert.values[this.bar_index] = true;
    alert.message = message;
    alert.frequency = frequency;
    alert.events.push({
      barIndex: this.bar_index,
      time: currentBar?.time ?? this.time.get(0) ?? 0,
      message,
      frequency,
      isRealtime: this.barstate.isrealtime,
    });
  }

  private hasNonAllAlertEventForCurrentBar(id: string): boolean {
    const alert = this.alerts.get(id);
    if (!alert || alert.type !== 'alert') {
      return false;
    }

    return alert.events.some((event) => event.barIndex === this.bar_index && event.frequency !== 'all');
  }

  /**
   * Truncate all alert arrays and events to the given length.
   */
  truncateAlerts(length: number): void {
    for (const alert of this.alerts.values()) {
      alert.values.length = length;
      if (alert.renderedMessages) {
        alert.renderedMessages.length = length;
      }
      alert.events = alert.events.filter((event) => event.barIndex < length);
    }
  }

  /**
   * Get all alerts as array.
   */
  getAlerts(): AlertOutput[] {
    return this.alertOrder.map((id) => this.alerts.get(id)!).filter(Boolean);
  }

  // =========================================================================
  // Log Management
  // =========================================================================

  /**
   * Add a Pine log.*() event for the current bar.
   */
  addLog(level: LogLevel, message: string): void {
    const currentBar = this.getCurrentBar();
    this.logs.push({
      level,
      barIndex: this.bar_index,
      time: currentBar?.time ?? this.time.get(0) ?? 0,
      message,
    });
  }

  /**
   * Remove logs emitted from a bar index onward.
   */
  truncateLogs(fromBarIndex: number): void {
    for (let index = this.logs.length - 1; index >= 0; index--) {
      if (this.logs[index].barIndex < fromBarIndex) {
        break;
      }
      this.logs.pop();
    }
  }

  /**
   * Get all logs as array.
   */
  getLogs(): LogOutput[] {
    return this.logs.map((log) => ({ ...log }));
  }

  /**
   * Reset strategy ledger from declaration settings.
   */
  setStrategyLedger(settings: Partial<StrategyLedgerSettings>): void {
    this.strategyLedger = createStrategyLedger(settings);
    this.captureRealtimeRollbackState();
  }

  // =========================================================================
  // Reset
  // =========================================================================

  /**
   * Reset context for new execution
   */
  reset(): void {
    this.bar_index = -1;
    this.plots.clear();
    this.plotOrder.length = 0;
    this.drawingStore.clear();
    this.alerts.clear();
    this.alertOrder.length = 0;
    this.logs.length = 0;
    this.indicatorTitle = 'Untitled';
    this.indicatorShortTitle = undefined;
    this.indicatorOverlay = false;
    this.indicatorPrecision = 2;
    this.indicatorFormat = undefined;
    this.indicatorScale = undefined;
    this.indicatorTimeframe = undefined;
    this.indicatorTimeframeGaps = undefined;
    this.indicatorExplicitPlotZOrder = undefined;
    this.indicatorCalcBarsCount = undefined;
    this.indicatorMaxBarsBack = undefined;
    this.strategyLedger = createStrategyLedger();
    this.captureRealtimeRollbackState();
    this.timeframe = {
      period: '60',
      multiplier: 60,
      isminutes: true,
      isdaily: false,
      isweekly: false,
      ismonthly: false,
      isintraday: true,
      isseconds: false,
      isticks: false,
    };
    // Clear input definitions - they get re-registered on bar_index === 0
    this.inputDefinitions.length = 0;

    // Don't reset inputs Map - user-set values persist between executions
  }
}

/**
 * Create a context from bar data
 */
export function createContext(bars: Bar[]): ExecutionContext {
  const ctx = new ExecutionContext();
  ctx.loadBars(bars);
  return ctx;
}
