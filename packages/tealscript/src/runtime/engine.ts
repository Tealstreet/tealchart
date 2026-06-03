/**
 * Tealscript Execution Engine
 *
 * Executes parsed Tealscript AST bar-by-bar.
 * This is the interpreter that evaluates expressions and statements.
 */

import type {
  Program,
  Statement,
  Expression,
  IndicatorDeclaration,
  LibraryDeclaration,
  ImportDeclaration,
  TypeDeclaration,
  EnumDeclaration,
  TypeFieldDeclaration,
  TypeAnnotation,
  FunctionDeclaration,
  VariableDeclaration,
  AssignmentStatement,
  IfStatement,
  ForStatement,
  WhileStatement,
  Identifier,
  BinaryExpression,
  UnaryExpression,
  ConditionalExpression,
  SwitchExpression,
  CallExpression,
  CallArgument,
  MemberExpression,
  IndexExpression,
} from '../parser/ast';
import { isExportableBuiltinConstantPath } from '../builtinMetadata';

import {
  absArrayValue,
  avgArrayValue,
  binarySearchArrayValue,
  binarySearchLeftmostArrayValue,
  binarySearchRightmostArrayValue,
  clearArray,
  concatArray,
  copyArray,
  covarianceArrayValue,
  createPineArray,
  firstArrayValue,
  getArraySize,
  getArrayValue,
  includesArrayValue,
  indexOfArrayValue,
  insertArrayValue,
  isPineArray,
  joinArray,
  lastArrayValue,
  lastIndexOfArrayValue,
  maxArrayValue,
  medianArrayValue,
  minArrayValue,
  modeArrayValue,
  percentileLinearInterpolationArrayValue,
  percentileNearestRankArrayValue,
  percentRankArrayValue,
  popArrayValue,
  pushArrayValue,
  rangeArrayValue,
  removeArrayValue,
  reverseArray,
  setArrayValue,
  shiftArrayValue,
  sliceArray,
  sortArray,
  sortIndicesArrayValue,
  standardizeArrayValue,
  stdevArrayValue,
  sumArrayValue,
  unshiftArrayValue,
  varianceArrayValue,
  type PineArray,
} from './arrays';
import type { BuiltinFunction, BuiltinRegistry } from './builtins/registry';
import {
  registerBoxBuiltins,
  registerDrawingConstants,
  registerLabelBuiltins,
  registerLineBuiltins,
  registerLineFillBuiltins,
  registerPolylineBuiltins,
  registerTableBuiltins,
  type DrawingBuiltinRuntime,
} from './builtins/drawings';
import { ExecutionContext, type AlertFrequency, type AlertOutput, type Bar, type ChartPoint, type DrawingOutput, type InputDefinition, type LineDrawingOutput, type LogLevel, type LogOutput, type PlotLineStyle, type PlotOutput, type PlotStyle, type SessionClassificationInfo, type SessionClosureKind, type SymInfo, type TimeframeInfo } from './context';
import {
  getDrawingValue,
  toDrawingId as toDrawingIdValue,
  toLineWidth as toLineWidthValue,
  withDrawing,
} from './drawings/helpers';
import {
  addMatrixColumn,
  addMatrixRow,
  avgMatrixValue,
  concatMatrix,
  copyMatrix,
  createPineMatrix,
  detMatrixValue,
  diffMatrixValue,
  eigenvaluesMatrixValue,
  eigenvectorsMatrixValue,
  fillMatrix,
  getMatrixColumns,
  getMatrixElementCount,
  getMatrixRows,
  getMatrixValue,
  invMatrixValue,
  isAntidiagonalMatrix,
  isAntisymmetricMatrix,
  isBinaryMatrix,
  isDiagonalMatrix,
  isIdentityMatrix,
  isPineMatrix,
  isSquareMatrix,
  isStochasticMatrix,
  isSymmetricMatrix,
  isTriangularMatrix,
  isValidMatrix,
  isZeroMatrix,
  kronMatrixValue,
  matrixColumn,
  matrixRow,
  maxMatrixValue,
  medianMatrixValue,
  minMatrixValue,
  modeMatrixValue,
  multMatrixValue,
  pinvMatrixValue,
  powMatrixValue,
  rankMatrixValue,
  removeMatrixColumn,
  removeMatrixRow,
  reshapeMatrix,
  reverseMatrix,
  setMatrixValue,
  sortMatrixRows,
  submatrixValue,
  sumMatrixValue,
  swapMatrixColumns,
  swapMatrixRows,
  traceMatrixValue,
  transposeMatrix,
  type PineMatrix,
} from './matrices';
import {
  copyUdtObject,
  createPineUdtObject,
  getUdtField,
  isPineUdtObject,
  setUdtField,
  type PineUdtObject,
} from './objects';
import {
  clearMap,
  containsMapKey,
  copyMap,
  createPineMap,
  getMapSize,
  getMapValue,
  isPineMap,
  mapEntries,
  mapKeys,
  mapValues,
  putAllMapValues,
  putMapValue,
  removeMapValue,
  type PineMap,
} from './maps';
import { Scope, createRootScope, type ScopeSnapshot } from './scope';
import {
  corporateActionRequestKey,
  currencyRateRequestKey,
  economicRequestKey,
  financialRequestKey,
  seedRequestSymbol,
  type RequestDataContext,
  type RequestDatafeed,
  type RequestSeriesFamily,
  type RequestSeriesPoint,
} from './requestDatafeed';
import {
  cancelAllStrategyOrders,
  cancelStrategyOrder,
  fillPendingStrategyMarketOrders,
  fillPendingStrategyOrdersOnTicks,
  fillStrategyMarketOrder,
  selectStrategyIntrabarContext,
  submitStrategyOrder,
  cloneStrategyLedger,
  type StrategyDirection,
  type StrategyFill,
  type StrategyIntrabarContext,
  type StrategyIntrabarDatafeed,
  type StrategyLedger,
  type StrategyLedgerSettings,
  type StrategyOcaType,
  type StrategyQuantityType,
  type StrategyTrade,
} from './strategy';

/**
 * Execution result
 */
export interface ExecutionResult {
  plots: PlotOutput[];
  drawings: DrawingOutput[];
  alerts: AlertOutput[];
  logs: LogOutput[];
  inputs: InputDefinition[];
  declaration: IndicatorDeclarationMetadata;
  indicatorTitle: string;
  indicatorShortTitle?: string;
  indicatorOverlay: boolean;
  indicatorPrecision: number;
  indicatorFormat?: string;
  indicatorScale?: string;
  indicatorTimeframe?: string;
  indicatorTimeframeGaps?: boolean;
  indicatorExplicitPlotZOrder?: boolean;
  indicatorBehindChart?: boolean;
  indicatorCalcBarsCount?: number;
  indicatorMaxBarsBack?: number;
  indicatorDynamicRequests: boolean;
  indicatorDrawingLimits: {
    label: number;
    line: number;
    box: number;
    polyline: number;
  };
  strategy: StrategyLedger;
  errors: ExecutionError[];
  profile: RuntimeProfile;
}

const STRATEGY_ORDER_ARGS = ['id', 'direction', 'qty', 'limit', 'stop', 'oca_name', 'oca_type', 'comment', 'alert_message', 'disable_alert'] as const;
const STRATEGY_EXIT_ARGS = [
  'id',
  'from_entry',
  'qty',
  'qty_percent',
  'profit',
  'limit',
  'loss',
  'stop',
  'trail_price',
  'trail_points',
  'trail_offset',
  'oca_name',
  'comment',
  'comment_profit',
  'comment_loss',
  'comment_trailing',
  'alert_message',
  'alert_profit',
  'alert_loss',
  'alert_trailing',
  'disable_alert',
] as const;
const STRATEGY_CLOSE_ARGS = ['id', 'comment', 'qty', 'qty_percent', 'alert_message', 'immediately', 'disable_alert'] as const;
const STRATEGY_CLOSE_ALL_ARGS = ['comment', 'alert_message', 'immediately', 'disable_alert'] as const;
const REQUEST_SECURITY_ARGS = ['symbol', 'timeframe', 'expression', 'gaps', 'lookahead', 'ignore_invalid_symbol', 'currency', 'calc_bars_count'] as const;
const REQUEST_SECURITY_LOWER_TF_ARGS = ['symbol', 'timeframe', 'expression', 'ignore_invalid_symbol', 'currency', 'ignore_invalid_timeframe', 'calc_bars_count'] as const;
const REQUEST_CURRENCY_RATE_ARGS = ['from', 'to', 'ignore_invalid_currency'] as const;
const REQUEST_SERIES_ARGS = ['ticker', 'field', 'gaps', 'lookahead', 'ignore_invalid_symbol', 'currency'] as const;
const REQUEST_FINANCIAL_ARGS = ['symbol', 'financial_id', 'period', 'gaps', 'ignore_invalid_symbol', 'currency'] as const;
const REQUEST_ECONOMIC_ARGS = ['country_code', 'field', 'gaps', 'ignore_invalid_symbol'] as const;
const REQUEST_SEED_ARGS = ['source', 'symbol', 'expression', 'ignore_invalid_symbol', 'calc_bars_count'] as const;

export interface IndicatorDeclarationMetadata {
  title: string;
  shortTitle?: string;
  overlay: boolean;
  precision: number;
  format?: string;
  scale?: string;
  timeframe?: string;
  timeframeGaps?: boolean;
  explicitPlotZOrder?: boolean;
  behindChart?: boolean;
  calcBarsCount?: number;
  maxBarsBack?: number;
  dynamicRequests: boolean;
  drawingLimits: {
    label: number;
    line: number;
    box: number;
    polyline: number;
  };
}

export interface RuntimeProfile {
  elapsedMs: number;
  bars: number;
  statements: number;
  expressions: number;
  builtinCalls: number;
  requestContexts: number;
  maxBarsBack: number;
  errors: number;
}

/**
 * Execution error
 */
export interface ExecutionError {
  message: string;
  line?: number;
  column?: number;
}

export interface TealscriptEngineOptions {
  requestDatafeed?: RequestDatafeed;
  strategyIntrabarDatafeed?: StrategyIntrabarDatafeed;
  libraries?: Map<string, Program>;
  runtime?: TealscriptRuntimeOptions;
}

export interface TealscriptRuntimeOptions {
  syminfo?: Partial<SymInfo>;
  timeframe?: Partial<TimeframeInfo>;
  session?: Partial<SessionClassificationInfo>;
  now?: number;
}

interface ImportedLibrary {
  path: string;
  alias: string;
  functions: Map<string, FunctionDeclaration>;
  exportedFunctions: Set<string>;
  methods: Map<string, FunctionDeclaration[]>;
  types: Map<string, TypeDeclaration>;
  exportedTypes: Set<string>;
  enums: Map<string, Map<string, string>>;
  constants: Map<string, unknown>;
}

type TimeframeUnit = 'tick' | 'second' | 'minute' | 'day' | 'week' | 'month';
type RuntimeSessionKind = Extract<SessionClosureKind, 'premarket' | 'regular' | 'postmarket' | 'extended'>;

interface TimeframeSpec {
  period: string;
  multiplier: number;
  unit: TimeframeUnit;
}

interface RandomBuiltinState {
  seed: number;
  state: number;
}

interface RequestEvaluationCacheEntry {
  bars: Bar[];
  values: unknown[];
}

interface TickerModifierParts {
  base: string;
  modifiers: string[];
}

interface ExpressionHistoryEntry {
  barIndex: number;
  values: unknown[];
}

const PLANNED_UNSUPPORTED_NAMESPACES = new Set(['ticker']);

/**
 * Tealscript Engine - executes AST bar-by-bar
 */
export class TealscriptEngine {
  private static readonly MAX_LOOP_ITERATIONS = 10000;
  private static readonly MAX_BUILTIN_SOURCE_HISTORY = 10000;
  private static readonly MAX_UNIQUE_REQUEST_CONTEXTS = 40;
  private static readonly MAX_STRATEGY_ORDER_FILL_RECALCULATIONS = 20;

  private ctx: ExecutionContext;
  private scope: Scope;
  private builtins: BuiltinRegistry;
  private typeDeclarations: Map<string, TypeDeclaration>;
  private userFunctions: Map<string, FunctionDeclaration>;
  private userMethods: Map<string, FunctionDeclaration[]>;
  private functionScopes: Map<string, Scope>;
  private requestDatafeed?: RequestDatafeed;
  private strategyIntrabarDatafeed?: StrategyIntrabarDatafeed;
  private libraries: Map<string, Program>;
  private importedLibraries = new Map<string, ImportedLibrary>();
  private requestEvaluationCache = new Map<string, RequestEvaluationCacheEntry>();
  private requestContextKeys = new Set<string>();
  private requestExpressionIds = new WeakMap<Expression, number>();
  private expressionHistory = new WeakMap<Expression, ExpressionHistoryEntry>();
  private nextRequestExpressionId = 0;
  private inferredMaxBarsBack = 0;
  private userFunctionCallStack: string[] = [];
  private importedLibraryCallStack: string[] = [];
  private indicatorDynamicRequests = true;
  private requestContextDepth = 0;
  private requestLocalScopeDepth = 0;
  private errors: ExecutionError[] = [];
  private profileStartMs = 0;
  private profileBars = 0;
  private profileStatements = 0;
  private profileExpressions = 0;
  private profileBuiltinCalls = 0;
  private runtimeOptions: TealscriptRuntimeOptions;
  private hasStrategyDeclaration = false;
  private strategyOrderFillRecalculationRequested = false;
  private currentStrategyIntrabarContext: StrategyIntrabarContext | null = null;
  private orderFillScopeSnapshot: ScopeSnapshot | null = null;
  private orderFillFunctionScopeSnapshots = new Map<string, ScopeSnapshot>();

  constructor(options: TealscriptEngineOptions = {}) {
    this.ctx = new ExecutionContext();
    this.scope = createRootScope();
    this.builtins = new Map();
    this.typeDeclarations = new Map();
    this.userFunctions = new Map();
    this.userMethods = new Map();
    this.functionScopes = new Map();
    this.requestDatafeed = options.requestDatafeed;
    this.strategyIntrabarDatafeed = options.strategyIntrabarDatafeed;
    this.libraries = options.libraries ?? new Map();
    this.runtimeOptions = options.runtime ?? {};
    this.applyRuntimeOptions(this.runtimeOptions);

    this.registerBuiltins();
  }

  private applyRuntimeOptions(options: TealscriptRuntimeOptions): void {
    if (options.syminfo) {
      this.ctx.syminfo = {
        ...this.ctx.syminfo,
        ...options.syminfo,
      };
    }
    if (options.timeframe) {
      this.ctx.timeframe = {
        ...this.ctx.timeframe,
        ...options.timeframe,
      };
    }
    if (typeof options.now === 'number' && Number.isFinite(options.now)) {
      this.ctx.setNow(options.now);
    }
  }

  private getRuntimeNow(): number {
    return typeof this.runtimeOptions.now === 'number' && Number.isFinite(this.runtimeOptions.now) ? this.runtimeOptions.now : Date.now();
  }

  /**
   * Execute a parsed program on bar data
   */
  execute(ast: Program, bars: Bar[], inputs?: Map<string, unknown>): ExecutionResult {
    this.errors = [];
    this.resetProfile();
    this.ctx.reset();
    this.scope = createRootScope();
    this.typeDeclarations.clear();
    this.functionScopes.clear();
    this.importedLibraries.clear();
    this.requestEvaluationCache.clear();
    this.requestContextKeys.clear();
    this.requestExpressionIds = new WeakMap();
    this.expressionHistory = new WeakMap();
    this.nextRequestExpressionId = 0;
    this.inferredMaxBarsBack = 0;
    this.userFunctionCallStack = [];
    this.importedLibraryCallStack = [];
    this.indicatorDynamicRequests = true;
    this.hasStrategyDeclaration = false;
    this.strategyOrderFillRecalculationRequested = false;
    this.currentStrategyIntrabarContext = null;
    this.orderFillScopeSnapshot = null;
    this.orderFillFunctionScopeSnapshots.clear();
    this.requestContextDepth = 0;
    this.requestLocalScopeDepth = 0;
    this.applyRuntimeOptions(this.runtimeOptions);
    this.registerTypeDeclarations(ast);
    this.registerUserFunctions(ast);
    this.registerLibraryImports(ast);

    this.ctx.setNow(this.getRuntimeNow());

    // Load bars into context
    this.ctx.loadBars(bars);

    // Set user inputs
    if (inputs) {
      for (const [key, value] of inputs) {
        this.ctx.setInput(key, value);
      }
    }

    // Execute bar by bar
    while (this.ctx.advanceBar()) {
      this.profileBars += 1;
      // Advance scope to new bar
      this.scope.advanceBar();
      for (const functionScope of this.functionScopes.values()) {
        functionScope.advanceBar();
      }
      this.resetPerBarBuiltinState();
      this.currentStrategyIntrabarContext = null;
      this.captureOrderFillRecalculationState();
      const isLastBar = this.ctx.bar_index === this.ctx.last_bar_index;
      if (isLastBar) {
        this.ctx.captureRealtimeRollbackState();
      }
      this.fillPendingStrategyMarketOrdersForCurrentBar();
      this.strategyOrderFillRecalculationRequested = false;

      if (this.executeHistoricalStatements(ast)) {
        return this.createExecutionResult();
      }
      this.fillPendingStrategyOrdersForCurrentBar();
      if (this.recalculateHistoricalStrategyOrderFills(ast)) {
        return this.createExecutionResult();
      }

      // Commit bar — only snapshot on the last bar (for realtime rollback)
      this.scope.commit(isLastBar);
      for (const functionScope of this.functionScopes.values()) {
        functionScope.commit(isLastBar);
      }
      this.ctx.commitBar();
    }

    return this.createExecutionResult();
  }

  private executeHistoricalStatements(ast: Program): boolean {
    for (const stmt of ast.body) {
      try {
        this.executeStatement(stmt);
      } catch (error) {
        this.errors.push({
          message: error instanceof Error ? error.message : String(error),
          line: stmt.loc?.start.line,
          column: stmt.loc?.start.column,
        });
        if (error instanceof RuntimeErrorException) {
          return true;
        }
      }
    }
    return false;
  }

  private createExecutionResult(): ExecutionResult {
    const declaration = this.createDeclarationMetadata();

    return {
      plots: this.ctx.getPlots(),
      drawings: this.ctx.getDrawings(),
      alerts: this.ctx.getAlerts(),
      logs: this.ctx.getLogs(),
      inputs: this.ctx.inputDefinitions.map((def) => ({ ...def })),
      declaration,
      indicatorTitle: declaration.title,
      indicatorShortTitle: declaration.shortTitle,
      indicatorOverlay: declaration.overlay,
      indicatorPrecision: declaration.precision,
      indicatorFormat: declaration.format,
      indicatorScale: declaration.scale,
      indicatorTimeframe: declaration.timeframe,
      indicatorTimeframeGaps: declaration.timeframeGaps,
      indicatorExplicitPlotZOrder: declaration.explicitPlotZOrder,
      indicatorBehindChart: declaration.behindChart,
      indicatorCalcBarsCount: declaration.calcBarsCount,
      indicatorMaxBarsBack: declaration.maxBarsBack,
      indicatorDynamicRequests: declaration.dynamicRequests,
      indicatorDrawingLimits: declaration.drawingLimits,
      strategy: this.ctx.strategyLedger,
      errors: this.errors,
      profile: this.getProfile(),
    };
  }

  getProfile(): RuntimeProfile {
    return {
      elapsedMs: Date.now() - this.profileStartMs,
      bars: this.profileBars,
      statements: this.profileStatements,
      expressions: this.profileExpressions,
      builtinCalls: this.profileBuiltinCalls,
      requestContexts: this.requestContextKeys.size,
      maxBarsBack: this.inferredMaxBarsBack,
      errors: this.errors.length,
    };
  }

  getStrategyLedger(): StrategyLedger {
    return cloneStrategyLedger(this.ctx.strategyLedger);
  }

  private createDeclarationMetadata(): IndicatorDeclarationMetadata {
    return {
      title: this.ctx.indicatorTitle,
      shortTitle: this.ctx.indicatorShortTitle,
      overlay: this.ctx.indicatorOverlay,
      precision: this.ctx.indicatorPrecision,
      format: this.ctx.indicatorFormat,
      scale: this.ctx.indicatorScale,
      timeframe: this.ctx.indicatorTimeframe,
      timeframeGaps: this.ctx.indicatorTimeframeGaps,
      explicitPlotZOrder: this.ctx.indicatorExplicitPlotZOrder,
      behindChart: this.ctx.indicatorBehindChart,
      calcBarsCount: this.ctx.indicatorCalcBarsCount,
      maxBarsBack: this.ctx.indicatorMaxBarsBack,
      dynamicRequests: this.indicatorDynamicRequests,
      drawingLimits: {
        label: this.ctx.getDrawingLimit('label'),
        line: this.ctx.getDrawingLimit('line'),
        box: this.ctx.getDrawingLimit('box'),
        polyline: this.ctx.getDrawingLimit('polyline'),
      },
    };
  }

  private resetProfile(): void {
    this.profileStartMs = Date.now();
    this.profileBars = 0;
    this.profileStatements = 0;
    this.profileExpressions = 0;
    this.profileBuiltinCalls = 0;
  }

  /**
   * Execute for realtime bar update
   */
  updateBar(ast: Program, bar: Bar): PlotOutput[] {
    this.errors = [];
    this.resetProfile();
    const currentBar = this.ctx.getBar(this.ctx.last_bar_index);
    if (currentBar && bar.time > currentBar.time) {
      if (this.ctx.barstate.isrealtime && !this.ctx.barstate.isconfirmed) {
        this.executeConfirmedRealtimeClose(ast, currentBar);
      }

      this.scope.commit(false);
      for (const functionScope of this.functionScopes.values()) {
        functionScope.commit(false);
      }
      this.ctx.commitBar();

      this.scope.advanceBar();
      for (const functionScope of this.functionScopes.values()) {
        functionScope.advanceBar();
      }
      this.ctx.setNow(this.getRuntimeNow());
      this.ctx.startRealtimeBar(bar);
      this.captureOrderFillRecalculationState();
      this.strategyOrderFillRecalculationRequested = false;
      this.fillPendingStrategyMarketOrdersForCurrentBar();
      this.scope.commit(true);
      for (const functionScope of this.functionScopes.values()) {
        functionScope.commit(true);
      }
      this.ctx.captureRealtimeRollbackState();
      this.prepareRealtimeExecution(ast);
      if (this.shouldExecuteRealtimeStatements()) {
        this.executeRealtimeStatements(ast);
      } else {
        this.fillPendingStrategyOrdersForCurrentBar();
      }
      this.handleRealtimeStrategyOrderFillRecalculation(ast);

      return this.ctx.getPlots();
    }
    if (currentBar && bar.time < currentBar.time) {
      throw new Error(`Out-of-order bar update: ${bar.time} < ${currentBar.time}`);
    }

    // Rollback to last committed state
    this.scope.rollback();
    for (const functionScope of this.functionScopes.values()) {
      functionScope.rollback();
    }
    this.ctx.rollbackBar();
    this.ctx.bar_index = this.ctx.last_bar_index;
    this.ctx.setNow(this.getRuntimeNow());
    this.requestEvaluationCache.clear();
    this.requestContextKeys.clear();

    // Truncate plot arrays to remove the last bar's appended values
    // so re-execution can re-append them cleanly without duplication
    this.ctx.truncatePlots(this.ctx.last_bar_index);
    this.ctx.truncateDrawings(this.ctx.last_bar_index);
    this.ctx.truncateAlerts(this.ctx.last_bar_index);
    this.ctx.truncateLogs(this.ctx.last_bar_index);

    // Update current bar data
    this.ctx.updateCurrentBar(bar);
    this.prepareRealtimeExecution(ast);
    this.captureOrderFillRecalculationState();
    this.strategyOrderFillRecalculationRequested = false;

    // Re-execute statements for current bar when Pine strategy settings allow it.
    if (this.shouldExecuteRealtimeStatements()) {
      this.executeRealtimeStatements(ast);
    } else {
      this.fillPendingStrategyOrdersForCurrentBar();
    }
    this.handleRealtimeStrategyOrderFillRecalculation(ast);

    return this.ctx.getPlots();
  }

  private executeConfirmedRealtimeClose(ast: Program, bar: Bar): void {
    this.scope.rollback();
    for (const functionScope of this.functionScopes.values()) {
      functionScope.rollback();
    }
    this.ctx.rollbackBar();
    this.ctx.bar_index = this.ctx.last_bar_index;
    this.ctx.setNow(this.getRuntimeNow());
    this.ctx.truncatePlots(this.ctx.last_bar_index);
    this.ctx.truncateDrawings(this.ctx.last_bar_index);
    this.ctx.truncateAlerts(this.ctx.last_bar_index);
    this.ctx.truncateLogs(this.ctx.last_bar_index);
    this.ctx.updateCurrentBar(bar);
    this.ctx.confirmCurrentRealtimeBar();
    this.prepareRealtimeExecution(ast);
    this.captureOrderFillRecalculationState();
    this.strategyOrderFillRecalculationRequested = false;
    this.executeRealtimeStatements(ast);
    this.handleRealtimeStrategyOrderFillRecalculation(ast);
  }

  private prepareRealtimeExecution(ast: Program): void {
    this.requestEvaluationCache.clear();
    this.requestContextKeys.clear();
    this.resetPerBarBuiltinState();
    this.currentStrategyIntrabarContext = null;
    this.registerTypeDeclarations(ast);
    this.registerUserFunctions(ast);
    this.importedLibraries.clear();
    this.registerLibraryImports(ast);
  }

  private shouldExecuteRealtimeStatements(): boolean {
    if (!this.hasStrategyDeclaration) {
      return true;
    }
    return this.ctx.strategyLedger.settings.calcOnEveryTick || this.ctx.barstate.isconfirmed;
  }

  private executeRealtimeStatements(ast: Program): void {
    this.profileBars += 1;
    for (const stmt of ast.body) {
      try {
        this.executeStatement(stmt);
      } catch (error) {
        this.errors.push({
          message: error instanceof Error ? error.message : String(error),
          line: stmt.loc?.start.line,
          column: stmt.loc?.start.column,
        });
        if (error instanceof RuntimeErrorException) {
          throw error;
        }
        // Log error but continue
        console.error('Execution error:', error);
      }
    }
    this.fillPendingStrategyOrdersForCurrentBar();
  }

  private recalculateHistoricalStrategyOrderFills(ast: Program): boolean {
    if (!this.ctx.strategyLedger.settings.calcOnOrderFills) {
      this.strategyOrderFillRecalculationRequested = false;
      return false;
    }

    let recalculations = 0;
    while (this.strategyOrderFillRecalculationRequested) {
      recalculations += 1;
      if (recalculations > TealscriptEngine.MAX_STRATEGY_ORDER_FILL_RECALCULATIONS) {
        this.errors.push({
          message: `strategy calc_on_order_fills exceeded ${TealscriptEngine.MAX_STRATEGY_ORDER_FILL_RECALCULATIONS} recalculations on bar ${this.ctx.bar_index}`,
        });
        this.strategyOrderFillRecalculationRequested = false;
        return true;
      }

      this.strategyOrderFillRecalculationRequested = false;
      this.prepareHistoricalOrderFillRecalculation();
      if (this.executeHistoricalStatements(ast)) {
        return true;
      }
      this.fillPendingStrategyOrdersForCurrentBar();
    }

    return false;
  }

  private recalculateRealtimeStrategyOrderFills(ast: Program): boolean {
    if (!this.ctx.strategyLedger.settings.calcOnOrderFills) {
      this.strategyOrderFillRecalculationRequested = false;
      return false;
    }

    let recalculations = 0;
    while (this.strategyOrderFillRecalculationRequested) {
      recalculations += 1;
      if (recalculations > TealscriptEngine.MAX_STRATEGY_ORDER_FILL_RECALCULATIONS) {
        this.errors.push({
          message: `strategy calc_on_order_fills exceeded ${TealscriptEngine.MAX_STRATEGY_ORDER_FILL_RECALCULATIONS} recalculations on bar ${this.ctx.bar_index}`,
        });
        this.strategyOrderFillRecalculationRequested = false;
        return true;
      }

      this.strategyOrderFillRecalculationRequested = false;
      this.prepareRealtimeOrderFillRecalculation(ast);
      this.executeRealtimeStatements(ast);
    }

    return false;
  }

  private handleRealtimeStrategyOrderFillRecalculation(ast: Program): void {
    if (!this.recalculateRealtimeStrategyOrderFills(ast)) {
      return;
    }

    this.rollbackRealtimeExecution();
    const message = this.errors.at(-1)?.message ?? 'strategy calc_on_order_fills realtime recalculation failed';
    throw new Error(message);
  }

  private rollbackRealtimeExecution(): void {
    this.scope.rollback();
    for (const functionScope of this.functionScopes.values()) {
      functionScope.rollback();
    }
    this.ctx.rollbackBar();
    this.ctx.bar_index = this.ctx.last_bar_index;
    this.currentStrategyIntrabarContext = null;
  }

  private captureOrderFillRecalculationState(): void {
    this.orderFillScopeSnapshot = this.scope.snapshot();
    this.orderFillFunctionScopeSnapshots = new Map();
    for (const [key, functionScope] of this.functionScopes) {
      this.orderFillFunctionScopeSnapshots.set(key, functionScope.snapshot());
    }
  }

  private prepareHistoricalOrderFillRecalculation(): void {
    if (this.orderFillScopeSnapshot) {
      this.scope.restore(this.orderFillScopeSnapshot);
    }
    for (const [key, snapshot] of this.orderFillFunctionScopeSnapshots) {
      this.functionScopes.get(key)?.restore(snapshot);
    }
    this.requestEvaluationCache.clear();
    this.resetPerBarBuiltinState();
    this.ctx.truncatePlots(this.ctx.bar_index);
    this.ctx.truncateDrawings(this.ctx.bar_index);
    this.ctx.truncateLogs(this.ctx.bar_index);
  }

  private prepareRealtimeOrderFillRecalculation(ast: Program): void {
    if (this.orderFillScopeSnapshot) {
      this.scope.restore(this.orderFillScopeSnapshot);
    }
    for (const [key, snapshot] of this.orderFillFunctionScopeSnapshots) {
      this.functionScopes.get(key)?.restore(snapshot);
    }
    this.ctx.truncatePlots(this.ctx.bar_index);
    this.ctx.truncateDrawings(this.ctx.bar_index);
    this.ctx.truncateAlerts(this.ctx.bar_index, { preserveStrategyFillAlerts: true });
    this.ctx.truncateLogs(this.ctx.bar_index);
    this.prepareRealtimeExecution(ast);
  }

  /**
   * Get current alert outputs.
   */
  getAlerts(): AlertOutput[] {
    return this.ctx.getAlerts().map((alert) => ({
      ...alert,
      values: [...alert.values],
      renderedMessages: alert.renderedMessages ? [...alert.renderedMessages] : undefined,
      events: alert.events.map((event) => ({ ...event })),
    }));
  }

  /**
   * Get current drawing outputs.
   */
  getDrawings(): DrawingOutput[] {
    return this.ctx.getDrawings();
  }

  /**
   * Get current Pine log outputs.
   */
  getLogs(): LogOutput[] {
    return this.ctx.getLogs();
  }

  // ===========================================================================
  // Statement Execution
  // ===========================================================================

  private executeStatement(stmt: Statement): void {
    this.executeStatementInternal(stmt, true);
  }

  private executeStatementInternal(stmt: Statement, countProfile: boolean): void {
    if (countProfile) {
      this.profileStatements += 1;
    }

    switch (stmt.type) {
      case 'IndicatorDeclaration':
        this.executeIndicator(stmt);
        break;
      case 'LibraryDeclaration':
        this.executeLibrary(stmt);
        break;
      case 'ImportDeclaration':
        this.executeImport(stmt);
        break;
      case 'TypeDeclaration':
        break;
      case 'FunctionDeclaration':
        break;
      case 'VariableDeclaration':
        this.executeVariableDeclaration(stmt);
        break;
      case 'AssignmentStatement':
        this.executeAssignment(stmt);
        break;
      case 'ExpressionStatement':
        this.evaluateExpression(stmt.expression);
        break;
      case 'IfStatement':
        this.executeIf(stmt);
        break;
      case 'ForStatement':
        this.executeFor(stmt);
        break;
      case 'WhileStatement':
        this.executeWhile(stmt);
        break;
      case 'BreakStatement':
        throw new BreakException();
      case 'ContinueStatement':
        throw new ContinueException();
    }
  }

  private executeIndicator(stmt: IndicatorDeclaration): void {
    // Only process on first bar
    if (this.ctx.bar_index !== 0) return;

    if (stmt.title) {
      this.ctx.indicatorTitle = this.evaluateExpression(stmt.title) as string;
    }
    if (stmt.shorttitle) {
      this.ctx.indicatorShortTitle = this.toStringValue(this.evaluateExpression(stmt.shorttitle));
    }
    if (stmt.overlay) {
      this.ctx.indicatorOverlay = this.isTruthy(this.evaluateExpression(stmt.overlay));
    }
    if (stmt.format) {
      this.ctx.indicatorFormat = this.toStringValue(this.evaluateExpression(stmt.format));
    }
    if (stmt.precision) {
      this.ctx.indicatorPrecision = Math.trunc(this.toNumber(this.evaluateExpression(stmt.precision)));
    }
    if (stmt.scale) {
      this.ctx.indicatorScale = this.toStringValue(this.evaluateExpression(stmt.scale));
    }
    if (stmt.max_bars_back) {
      this.ctx.indicatorMaxBarsBack = this.normalizeMaxBarsBack(this.evaluateExpression(stmt.max_bars_back));
    }
    if (stmt.timeframe_gaps) {
      this.ctx.indicatorTimeframeGaps = this.isTruthy(this.evaluateExpression(stmt.timeframe_gaps));
    }
    if (stmt.explicit_plot_zorder) {
      this.ctx.indicatorExplicitPlotZOrder = this.isTruthy(this.evaluateExpression(stmt.explicit_plot_zorder));
    }
    if (stmt.behind_chart) {
      this.ctx.indicatorBehindChart = this.isTruthy(this.evaluateExpression(stmt.behind_chart));
    }
    if (stmt.calc_bars_count) {
      this.ctx.indicatorCalcBarsCount = this.normalizeNonNegativeInteger(
        this.evaluateExpression(stmt.calc_bars_count),
        'indicator calc_bars_count',
      );
    }
    this.applyDrawingLimit(stmt.max_labels_count, 'label', 'max_labels_count');
    this.applyDrawingLimit(stmt.max_lines_count, 'line', 'max_lines_count');
    this.applyDrawingLimit(stmt.max_boxes_count, 'box', 'max_boxes_count');
    this.applyDrawingLimit(stmt.max_polylines_count, 'polyline', 'max_polylines_count');
    if (stmt.timeframe) {
      this.applyIndicatorTimeframe(this.evaluateExpression(stmt.timeframe));
    }
    if (stmt.dynamic_requests) {
      this.indicatorDynamicRequests = this.isTruthy(this.evaluateExpression(stmt.dynamic_requests));
    }
    if (stmt.declarationKind === 'strategy') {
      this.applyStrategyDeclaration(stmt);
      this.hasStrategyDeclaration = true;
    }
  }

  private selectStrategyIntrabarContextForCurrentBar(): StrategyIntrabarContext | null {
    if (this.currentStrategyIntrabarContext) {
      return this.currentStrategyIntrabarContext;
    }

    if (!this.hasStrategyDeclaration) {
      return null;
    }

    const chartBar = this.ctx.getCurrentBar();
    if (!chartBar) {
      return null;
    }

    const context = selectStrategyIntrabarContext({
      useBarMagnifier: this.ctx.strategyLedger.settings.useBarMagnifier,
      datafeed: this.strategyIntrabarDatafeed,
      request: {
        symbol: this.ctx.syminfo.ticker,
        timeframe: this.ctx.timeframe.period,
        chartBarTime: chartBar.time,
        chartBarIndex: this.ctx.bar_index,
        chartBar,
      },
    });
    this.ctx.recordStrategyIntrabarContext(context);
    this.currentStrategyIntrabarContext = context;
    return context;
  }

  private applyStrategyDeclaration(stmt: IndicatorDeclaration): void {
    const settings: Partial<StrategyLedgerSettings> = {
      title: this.ctx.indicatorTitle,
      currency: this.ctx.syminfo.currency,
    };

    if (stmt.initial_capital !== undefined) {
      settings.initialCapital = this.normalizeNonNegativeNumber(
        this.evaluateExpression(stmt.initial_capital),
        'strategy initial_capital',
      );
    }
    if (stmt.currency !== undefined) {
      settings.currency = this.toStringValue(this.evaluateExpression(stmt.currency));
    }
    if (stmt.default_qty_type !== undefined) {
      settings.defaultQtyType = this.normalizeStrategyDefaultQtyType(this.evaluateExpression(stmt.default_qty_type));
    }
    if (stmt.default_qty_value !== undefined) {
      settings.defaultQtyValue = this.normalizeNonNegativeNumber(
        this.evaluateExpression(stmt.default_qty_value),
        'strategy default_qty_value',
      );
    }
    if (stmt.pyramiding !== undefined) {
      settings.pyramiding = this.normalizeNonNegativeInteger(this.evaluateExpression(stmt.pyramiding), 'strategy pyramiding');
    }
    if (stmt.commission_type !== undefined) {
      settings.commissionType = this.normalizeStrategyCommissionType(this.evaluateExpression(stmt.commission_type));
    }
    if (stmt.commission_value !== undefined) {
      settings.commissionValue = this.normalizeNonNegativeNumber(
        this.evaluateExpression(stmt.commission_value),
        'strategy commission_value',
      );
    }
    if (stmt.slippage !== undefined) {
      settings.slippageTicks = this.normalizeNonNegativeInteger(this.evaluateExpression(stmt.slippage), 'strategy slippage');
    }
    if (stmt.margin_long !== undefined) {
      settings.marginLong = this.normalizeNonNegativeNumber(this.evaluateExpression(stmt.margin_long), 'strategy margin_long');
    }
    if (stmt.margin_short !== undefined) {
      settings.marginShort = this.normalizeNonNegativeNumber(this.evaluateExpression(stmt.margin_short), 'strategy margin_short');
    }
    if (stmt.calc_on_order_fills !== undefined) {
      settings.calcOnOrderFills = this.isTruthy(this.evaluateExpression(stmt.calc_on_order_fills));
    }
    if (stmt.calc_on_every_tick !== undefined) {
      settings.calcOnEveryTick = this.isTruthy(this.evaluateExpression(stmt.calc_on_every_tick));
    }
    if (stmt.process_orders_on_close !== undefined) {
      settings.processOrdersOnClose = this.isTruthy(this.evaluateExpression(stmt.process_orders_on_close));
    }
    if (stmt.use_bar_magnifier !== undefined) {
      settings.useBarMagnifier = this.isTruthy(this.evaluateExpression(stmt.use_bar_magnifier));
    }

    this.ctx.setStrategyLedger(settings);
  }

  private executeLibrary(_stmt: LibraryDeclaration): void {
    if (this.ctx.bar_index !== 0) return;

    // Local library scripts can execute their global demo code in this runtime.
    // Published-library import resolution is still intentionally unsupported.
  }

  private executeImport(stmt: ImportDeclaration): void {
    if (this.importedLibraries.has(stmt.alias.name)) return;
    if (this.ctx.bar_index !== 0) return;

    throw new Error(`import declarations are not supported yet: ${stmt.path} as ${stmt.alias.name}`);
  }

  private normalizeMaxBarsBack(value: unknown): number {
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || !Number.isInteger(value)) {
      throw new Error('indicator max_bars_back must be a non-negative integer');
    }
    return value;
  }

  private normalizeNonNegativeNumber(value: unknown, name: string): number {
    const number = this.toNumber(value);
    if (!Number.isFinite(number) || number < 0) {
      throw new Error(`${name} must be a non-negative number`);
    }
    return number;
  }

  private normalizeNonNegativeInteger(value: unknown, name: string): number {
    const number = this.normalizeNonNegativeNumber(value, name);
    if (!Number.isInteger(number)) {
      throw new Error(`${name} must be a non-negative integer`);
    }
    return number;
  }

  private normalizeStrategyDefaultQtyType(value: unknown): StrategyLedgerSettings['defaultQtyType'] {
    if (value === 'fixed' || value === 'cash' || value === 'percent_of_equity') {
      return value;
    }
    throw new Error(`Invalid strategy default_qty_type: ${this.toStringValue(value)}`);
  }

  private normalizeStrategyCommissionType(value: unknown): StrategyLedgerSettings['commissionType'] {
    if (value === 'percent' || value === 'cash_per_order' || value === 'cash_per_contract') {
      return value;
    }
    throw new Error(`Invalid strategy commission_type: ${this.toStringValue(value)}`);
  }

  private applyDrawingLimit(
    expression: Expression | undefined,
    type: 'label' | 'line' | 'box' | 'polyline',
    name: string,
  ): void {
    if (!expression) return;
    const value = this.evaluateExpression(expression);
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || !Number.isInteger(value)) {
      throw new Error(`indicator ${name} must be a non-negative integer`);
    }
    this.ctx.setDrawingLimit(type, value);
  }

  private applyIndicatorTimeframe(value: unknown): void {
    const period = this.toStringValue(value).trim().toUpperCase();
    if (period === '') return;

    const info = this.getTimeframeInfo(period);
    if (info === null) {
      throw new Error(`Invalid indicator timeframe: ${period}`);
    }

    this.ctx.timeframe = info;
    this.ctx.indicatorTimeframe = info.period;
  }

  private getTimeframeInfo(period: string): ExecutionContext['timeframe'] | null {
    const spec = this.parseTimeframeSpec(period);
    if (!spec) return null;

    return {
      period: spec.period,
      multiplier: spec.multiplier,
      isminutes: spec.unit === 'minute',
      isdaily: spec.unit === 'day',
      isweekly: spec.unit === 'week',
      ismonthly: spec.unit === 'month',
      isintraday: spec.unit === 'minute' || spec.unit === 'second' || spec.unit === 'tick',
      isseconds: spec.unit === 'second',
      isticks: spec.unit === 'tick',
    };
  }

  private registerTypeDeclarations(ast: Program): void {
    this.typeDeclarations.clear();
    for (const stmt of ast.body) {
      if (stmt.type === 'TypeDeclaration') {
        this.typeDeclarations.set(stmt.name.name, stmt);
      }
    }
  }

  private registerUserFunctions(ast: Program): void {
    this.userFunctions.clear();
    this.userMethods.clear();
    for (const stmt of ast.body) {
      if (stmt.type === 'FunctionDeclaration') {
        const scopeKey = this.userCallableScopeKey(stmt);
        if (stmt.isMethod) {
          const overloads = this.userMethods.get(stmt.name.name) ?? [];
          overloads.push(stmt);
          this.userMethods.set(stmt.name.name, overloads);
        } else {
          this.userFunctions.set(stmt.name.name, stmt);
        }
        if (!this.functionScopes.has(scopeKey)) {
          this.functionScopes.set(scopeKey, this.scope.createChild());
        }
      }
    }
  }

  private registerLibraryImports(ast: Program): void {
    for (const stmt of ast.body) {
      if (stmt.type !== 'ImportDeclaration') continue;

      const libraryAst = this.libraries.get(stmt.path);
      if (!libraryAst) continue;

      const functions = new Map<string, FunctionDeclaration>();
      const exportedFunctions = new Set<string>();
      const methods = new Map<string, FunctionDeclaration[]>();
      const types = new Map<string, TypeDeclaration>();
      const exportedTypes = new Set<string>();
      const enums = new Map<string, Map<string, string>>();
      const constants = new Map<string, unknown>();
      for (const libraryStmt of libraryAst.body) {
        if (libraryStmt.type === 'FunctionDeclaration') {
          if (libraryStmt.isMethod) {
            const overloads = methods.get(libraryStmt.name.name) ?? [];
            overloads.push(libraryStmt);
            methods.set(libraryStmt.name.name, overloads);
          } else {
            functions.set(libraryStmt.name.name, libraryStmt);
            if (libraryStmt.exported) {
              exportedFunctions.add(libraryStmt.name.name);
            }
          }
          const scopeKey = this.importedFunctionScopeKey(stmt.alias.name, libraryStmt);
          if (!this.functionScopes.has(scopeKey)) {
            this.functionScopes.set(scopeKey, this.scope.createChild());
          }
        }
        if (libraryStmt.type === 'TypeDeclaration') {
          types.set(libraryStmt.name.name, libraryStmt);
          if (libraryStmt.exported) {
            exportedTypes.add(libraryStmt.name.name);
          }
        }
        if (libraryStmt.type === 'EnumDeclaration' && libraryStmt.exported) {
          enums.set(libraryStmt.name.name, this.createImportedEnumValues(stmt.path, libraryStmt));
        }
        if (libraryStmt.type === 'VariableDeclaration' && libraryStmt.exported && libraryStmt.names.type === 'VariableDeclarator') {
          const value = this.evaluateLibraryConstantExpression(libraryStmt.init);
          if (value !== undefined) {
            constants.set(libraryStmt.names.name.name, value);
          }
        }
      }

      this.importedLibraries.set(stmt.alias.name, {
        path: stmt.path,
        alias: stmt.alias.name,
        functions,
        exportedFunctions,
        methods,
        types,
        exportedTypes,
        enums,
        constants,
      });
    }
  }

  private createImportedEnumValues(libraryPath: string, declaration: EnumDeclaration): Map<string, string> {
    const values = new Map<string, string>();
    for (const field of declaration.fields) {
      values.set(field.name.name, `${libraryPath}.${declaration.name.name}.${field.name.name}`);
    }
    return values;
  }

  private evaluateLibraryConstantExpression(expression: Expression): unknown {
    switch (expression.type) {
      case 'NumericLiteral':
      case 'StringLiteral':
      case 'BooleanLiteral':
      case 'ColorLiteral':
        return expression.value;
      case 'NaExpression':
        return Number.NaN;
      case 'UnaryExpression': {
        if (expression.argument.type !== 'NumericLiteral') return undefined;
        return expression.operator === '-' ? -expression.argument.value : expression.argument.value;
      }
      case 'MemberExpression': {
        const memberPath = this.getMemberPath(expression);
        if (!memberPath || !isExportableBuiltinConstantPath(memberPath)) return undefined;
        return this.evaluateBuiltinMemberConstant(memberPath);
      }
      default:
        return undefined;
    }
  }

  private evaluateBuiltinMemberConstant(memberPath: string[]): unknown {
    const namespace = memberPath.slice(0, -1).join('.');
    const prop = memberPath[memberPath.length - 1]!;
    const fullName = memberPath.join('.');

    try {
      if (namespace === 'barstate' && prop in this.ctx.barstate) {
        return this.ctx.barstate[prop as keyof typeof this.ctx.barstate];
      }
      if (namespace === 'syminfo') {
        return this.evaluateSyminfo(prop);
      }
      if (namespace === 'timeframe') {
        return this.evaluateTimeframe(prop);
      }
      if (namespace === 'strategy') {
        return this.evaluateStrategy(prop);
      }

      const builtin = this.builtins.get(fullName);
      return builtin ? builtin([], new Map(), this.ctx, this.scope, fullName) : undefined;
    } catch {
      return undefined;
    }
  }

  private executeVariableDeclaration(stmt: VariableDeclaration): void {
    const kind = stmt.kind;

    if (stmt.names.type === 'VariableDeclarator') {
      const name = stmt.names.name.name;
      if (this.shouldSkipInitializedPersistentDeclaration(kind, [name])) {
        return;
      }
      const drawingCount = this.ctx.getDrawingCount();
      const value = this.evaluateExpression(stmt.init);
      this.scope.declare(name, kind, value, this.getTypeAnnotationName(stmt.typeAnnotation));
      this.markPersistentDeclarationDrawings(kind, drawingCount);
    } else if (stmt.names.type === 'TupleDeclarator') {
      const names = stmt.names.names.map((name) => name.name);
      if (this.shouldSkipInitializedPersistentDeclaration(kind, names)) {
        return;
      }
      const drawingCount = this.ctx.getDrawingCount();
      const value = this.evaluateExpression(stmt.init);
      // Tuple destructuring
      if (!Array.isArray(value)) {
        throw new Error('Cannot destructure non-array value');
      }
      const values = value as unknown[];
      for (let i = 0; i < stmt.names.names.length; i++) {
        const name = stmt.names.names[i].name;
        this.scope.declare(name, kind, values[i]);
      }
      this.markPersistentDeclarationDrawings(kind, drawingCount);
    }
  }

  private getTypeAnnotationName(typeAnnotation: TypeAnnotation | null | undefined): string | undefined {
    if (!typeAnnotation) return undefined;
    return typeAnnotation.baseType === 'udt' ? typeAnnotation.name : typeAnnotation.baseType;
  }

  private shouldSkipInitializedPersistentDeclaration(kind: string, names: string[]): boolean {
    if (kind !== 'var' && kind !== 'varip') return false;
    return names.every((name) => this.scope.getEntry(name)?.initialized);
  }

  private markPersistentDeclarationDrawings(kind: string, fromIndex: number): void {
    if (kind === 'var' || kind === 'varip') {
      this.ctx.markDrawingsPersistentFrom(fromIndex);
    }
  }

  private executeAssignment(stmt: AssignmentStatement): void {
    const value = this.evaluateExpression(stmt.right);

    if (stmt.left.type === 'Identifier') {
      const name = stmt.left.name;
      const currentValue = this.scope.get(name);

      const newValue = this.applyAssignmentOperator(currentValue, value, stmt.operator);

      this.scope.set(name, newValue);
    } else if (stmt.left.type === 'IndexExpression') {
      this.executeIndexAssignment(stmt.left, value, stmt.operator);
    } else {
      this.executeMemberAssignment(stmt.left, value, stmt.operator);
    }
  }

  private executeMemberAssignment(target: MemberExpression, value: unknown, operator: AssignmentStatement['operator']): void {
    const object = this.evaluateExpression(target.object);
    if (!isPineUdtObject(object)) {
      throw new Error('Member assignment expects a user-defined type object');
    }

    const fieldName = target.property.name;
    const currentValue = getUdtField(object, fieldName);
    setUdtField(object, fieldName, this.applyAssignmentOperator(currentValue, value, operator));
  }

  private executeIndexAssignment(target: IndexExpression, value: unknown, operator: AssignmentStatement['operator']): void {
    const index = this.normalizeIndexOffset(this.evaluateExpression(target.index));
    if (index === null) {
      throw new Error('Array assignment index must be a finite non-negative number');
    }

    const array = this.evaluateExpression(target.object);
    if (!Array.isArray(array) && !isPineArray(array)) {
      throw new Error('Index assignment expects an array');
    }

    const currentValue = this.readArrayElement(array, index);
    const newValue = this.applyAssignmentOperator(currentValue, value, operator);
    this.writeArrayElement(array, index, newValue);
  }

  private applyAssignmentOperator(currentValue: unknown, value: unknown, operator: AssignmentStatement['operator']): unknown {
    if (operator === ':=') return value;

    const numCurrent = currentValue as number;
    const numValue = value as number;
    switch (operator) {
      case '+=':
        return numCurrent + numValue;
      case '-=':
        return numCurrent - numValue;
      case '*=':
        return numCurrent * numValue;
      case '/=':
        return numCurrent / numValue;
      case '%=':
        return numCurrent % numValue;
    }
  }

  private executeIf(stmt: IfStatement): void {
    const condition = this.evaluateExpression(stmt.test);

    if (this.isTruthy(condition)) {
      const childScope = this.scope.createChild();
      const savedScope = this.scope;
      this.scope = childScope;
      this.requestLocalScopeDepth++;

      try {
        for (const s of stmt.consequent) {
          this.executeStatement(s);
        }
      } finally {
        this.requestLocalScopeDepth--;
        this.scope = savedScope;
      }
    } else if (stmt.alternate) {
      if (Array.isArray(stmt.alternate)) {
        const childScope = this.scope.createChild();
        const savedScope = this.scope;
        this.scope = childScope;
        this.requestLocalScopeDepth++;

        try {
          for (const s of stmt.alternate) {
            this.executeStatement(s);
          }
        } finally {
          this.requestLocalScopeDepth--;
          this.scope = savedScope;
        }
      } else {
        // else-if
        this.executeIf(stmt.alternate);
      }
    }
  }

  private executeFor(stmt: ForStatement): void {
    if (stmt.kind === 'collection') {
      this.executeForIn(stmt);
      return;
    }

    const start = this.evaluateExpression(stmt.start) as number;
    const end = this.evaluateExpression(stmt.end) as number;
    const step = stmt.step ? (this.evaluateExpression(stmt.step) as number) : 1;
    if (step === 0) {
      throw new Error('For loop step cannot be zero');
    }

    const childScope = this.scope.createChild();
    const savedScope = this.scope;
    this.scope = childScope;
    this.requestLocalScopeDepth++;

    let iterations = 0;

    try {
      for (let i = start; step > 0 ? i <= end : i >= end; i += step) {
        if (++iterations > TealscriptEngine.MAX_LOOP_ITERATIONS) {
          throw new Error('Maximum loop iterations exceeded');
        }

        this.scope.declare(stmt.counter.name, 'none', i);

        try {
          for (const s of stmt.body) {
            this.executeStatement(s);
          }
        } catch (e) {
          if (e instanceof BreakException) break;
          if (e instanceof ContinueException) continue;
          throw e;
        }
      }
    } finally {
      this.requestLocalScopeDepth--;
      this.scope = savedScope;
    }
  }

  private executeForIn(stmt: Extract<ForStatement, { kind: 'collection' }>): void {
    const iterable = this.evaluateExpression(stmt.iterable);
    let values: unknown[];
    let keys: unknown[] | null = null;

    if (Array.isArray(iterable)) {
      values = iterable;
    } else if (isPineArray(iterable)) {
      values = Array.from({ length: getArraySize(iterable) }, (_, index) => getArrayValue(iterable, index));
    } else if (isPineMap(iterable)) {
      const entries = mapEntries(iterable);
      keys = entries.map(([key]) => key);
      values = entries.map(([, value]) => value);
    } else if (isPineMatrix(iterable)) {
      values = Array.from({ length: iterable.rows }, (_, row) => matrixRow(iterable, row));
    } else {
      throw new Error('For-in loop expects an array, map, or matrix');
    }

    const childScope = this.scope.createChild();
    const savedScope = this.scope;
    this.scope = childScope;
    this.requestLocalScopeDepth++;

    let iterations = 0;

    try {
      for (let index = 0; index < values.length; index++) {
        if (++iterations > TealscriptEngine.MAX_LOOP_ITERATIONS) {
          throw new Error('Maximum loop iterations exceeded');
        }

        const value = values[index];
        if (stmt.indexCounter) {
          this.scope.declare(stmt.indexCounter.name, 'none', keys ? keys[index] : index);
        }
        this.scope.declare(stmt.counter.name, 'none', value);

        try {
          for (const s of stmt.body) {
            this.executeStatement(s);
          }
        } catch (e) {
          if (e instanceof BreakException) break;
          if (e instanceof ContinueException) continue;
          throw e;
        }
      }
    } finally {
      this.requestLocalScopeDepth--;
      this.scope = savedScope;
    }
  }

  private executeWhile(stmt: WhileStatement): void {
    const childScope = this.scope.createChild();
    const savedScope = this.scope;
    this.scope = childScope;
    this.requestLocalScopeDepth++;

    let iterations = 0;

    try {
      while (this.isTruthy(this.evaluateExpression(stmt.test))) {
        if (++iterations > TealscriptEngine.MAX_LOOP_ITERATIONS) {
          throw new Error('Maximum loop iterations exceeded');
        }

        try {
          for (const s of stmt.body) {
            this.executeStatement(s);
          }
        } catch (e) {
          if (e instanceof BreakException) break;
          if (e instanceof ContinueException) continue;
          throw e;
        }
      }
    } finally {
      this.requestLocalScopeDepth--;
      this.scope = savedScope;
    }
  }

  // ===========================================================================
  // Expression Evaluation
  // ===========================================================================

  private evaluateExpression(expr: Expression): unknown {
    this.profileExpressions += 1;
    switch (expr.type) {
      case 'NumericLiteral':
        return expr.value;
      case 'StringLiteral':
        return expr.value;
      case 'BooleanLiteral':
        return expr.value;
      case 'ColorLiteral':
        return expr.value;
      case 'NaExpression':
        return NaN; // Tealscript 'na' is represented as NaN

      case 'Identifier':
        return this.evaluateIdentifier(expr);

      case 'BinaryExpression':
        return this.evaluateBinary(expr);

      case 'UnaryExpression':
        return this.evaluateUnary(expr);

      case 'ConditionalExpression':
        return this.evaluateConditional(expr);

      case 'SwitchExpression':
        return this.evaluateSwitch(expr);

      case 'ForStatement':
        return this.evaluateLoopExpression(this.executeFunctionFor(expr));

      case 'WhileStatement':
        return this.evaluateLoopExpression(this.executeFunctionWhile(expr));

      case 'CallExpression':
        return this.evaluateCall(expr);

      case 'MemberExpression':
        return this.evaluateMember(expr);

      case 'IndexExpression':
        return this.evaluateIndex(expr);

      case 'ArrayExpression':
        return expr.elements.map((e) => this.evaluateExpression(e));

      default:
        throw new Error(`Unknown expression type: ${(expr as Expression).type}`);
    }
  }

  private evaluateLoopExpression(result: { hasResult: boolean; value?: unknown }): unknown {
    return result.hasResult ? result.value : NaN;
  }

  private evaluateIdentifier(expr: Identifier): unknown {
    const name = expr.name;

    // Check built-in series first
    switch (name) {
      case 'open':
        return this.ctx.open.get(0);
      case 'high':
        return this.ctx.high.get(0);
      case 'low':
        return this.ctx.low.get(0);
      case 'close':
        return this.ctx.close.get(0);
      case 'volume':
        return this.ctx.volume.get(0);
      case 'time':
        return this.ctx.time.get(0);
      case 'time_tradingday':
        return this.getTradingDayTime(this.ctx.time.get(0), this.ctx.syminfo.timezone);
      case 'timenow':
        return this.ctx.timenow.get(0);
      case 'time_close':
        return this.getBarCloseTime(this.ctx.time.get(0), this.ctx.timeframe.period);
      case 'last_bar_time':
        return this.ctx.getBar(this.ctx.last_bar_index)?.time ?? Number.NaN;
      case 'year':
        return this.getCalendarPart('year', this.ctx.time.get(0), this.ctx.syminfo.timezone);
      case 'month':
        return this.getCalendarPart('month', this.ctx.time.get(0), this.ctx.syminfo.timezone);
      case 'weekofyear':
        return this.getCalendarPart('weekofyear', this.ctx.time.get(0), this.ctx.syminfo.timezone);
      case 'dayofmonth':
        return this.getCalendarPart('dayofmonth', this.ctx.time.get(0), this.ctx.syminfo.timezone);
      case 'dayofweek':
        return this.getCalendarPart('dayofweek', this.ctx.time.get(0), this.ctx.syminfo.timezone);
      case 'hour':
        return this.getCalendarPart('hour', this.ctx.time.get(0), this.ctx.syminfo.timezone);
      case 'minute':
        return this.getCalendarPart('minute', this.ctx.time.get(0), this.ctx.syminfo.timezone);
      case 'second':
        return this.getCalendarPart('second', this.ctx.time.get(0), this.ctx.syminfo.timezone);
      case 'bar_index':
        return this.ctx.bar_index;
      case 'last_bar_index':
        return this.ctx.last_bar_index;
      case 'hl2':
        return this.ctx.hl2;
      case 'hlc3':
        return this.ctx.hlc3;
      case 'ohlc4':
        return this.ctx.ohlc4;
      case 'ta.obv':
        return this.updateObv(this.ctx.close.get(0)!, this.ctx.close.get(1), this.ctx.volume.get(0)!, this.scope, '_ta_obv_value');
      case 'ta.tr':
        return this.currentTrueRange(false);
    }

    // Check scope
    if (this.scope.has(name)) {
      return this.scope.get(name);
    }

    throw new Error(`Unknown identifier: ${name}`);
  }

  private evaluateBinary(expr: BinaryExpression): unknown {
    const left = expr.operator === 'and' || expr.operator === 'or'
      ? this.evaluateRequestConditionalOperand(expr.left)
      : this.evaluateExpression(expr.left);

    if (expr.operator === 'and') {
      if (!this.isTruthy(left)) return false;
      return this.isTruthy(this.evaluateRequestConditionalOperand(expr.right));
    }

    if (expr.operator === 'or') {
      if (this.isTruthy(left)) return true;
      return this.isTruthy(this.evaluateRequestConditionalOperand(expr.right));
    }

    const right = this.evaluateExpression(expr.right);

    // Pine comparison operators return false when either operand is an
    // undefined variable. Arithmetic keeps propagating na.
    if (this.isNa(left) || this.isNa(right)) {
      if (this.isComparisonOperator(expr.operator)) {
        return false;
      }
      return NaN;
    }

    switch (expr.operator) {
      // Arithmetic
      case '+':
        if (typeof left === 'string' || typeof right === 'string') {
          return `${this.toStringValue(left)}${this.toStringValue(right)}`;
        }
        return (left as number) + (right as number);
      case '-':
        return (left as number) - (right as number);
      case '*':
        return (left as number) * (right as number);
      case '/':
        return (left as number) / (right as number);
      case '%':
        return (left as number) % (right as number);

      // Comparison
      case '==':
        return left === right;
      case '!=':
        return left !== right;
      case '<':
        return (left as number) < (right as number);
      case '>':
        return (left as number) > (right as number);
      case '<=':
        return (left as number) <= (right as number);
      case '>=':
        return (left as number) >= (right as number);

      default:
        throw new Error(`Unknown operator: ${expr.operator}`);
    }
  }

  private evaluateUnary(expr: UnaryExpression): unknown {
    const arg = this.evaluateExpression(expr.argument);

    switch (expr.operator) {
      case '-':
        return -(arg as number);
      case '+':
        return +(arg as number);
      case 'not':
        return !this.isTruthy(arg);
      default:
        throw new Error(`Unknown unary operator: ${expr.operator}`);
    }
  }

  private evaluateConditional(expr: ConditionalExpression): unknown {
    const test = this.evaluateExpression(expr.test);
    if (this.isTruthy(test)) {
      return this.evaluateRequestConditionalOperand(expr.consequent);
    } else {
      return this.evaluateRequestConditionalOperand(expr.alternate);
    }
  }

  private evaluateRequestConditionalOperand(expr: Expression): unknown {
    this.requestLocalScopeDepth++;
    try {
      return this.evaluateExpression(expr);
    } finally {
      this.requestLocalScopeDepth--;
    }
  }

  private evaluateSwitch(expr: SwitchExpression): unknown {
    if (expr.discriminant) {
      const discriminant = this.evaluateExpression(expr.discriminant);
      for (const switchCase of expr.cases) {
        if (!switchCase.test) {
          return this.evaluateSwitchConsequent(switchCase.consequent);
        }
        const test = this.evaluateExpression(switchCase.test);
        if (this.switchValuesEqual(discriminant, test)) {
          return this.evaluateSwitchConsequent(switchCase.consequent);
        }
      }
      return NaN;
    }

    for (const switchCase of expr.cases) {
      if (!switchCase.test || this.isTruthy(this.evaluateExpression(switchCase.test))) {
        return this.evaluateSwitchConsequent(switchCase.consequent);
      }
    }

    return NaN;
  }

  private evaluateSwitchConsequent(consequent: Expression | Statement[]): unknown {
    if (!Array.isArray(consequent)) {
      return this.evaluateExpression(consequent);
    }

    const result = this.executeFunctionStatements(consequent);
    return result.hasResult ? result.value : Number.NaN;
  }

  private switchValuesEqual(left: unknown, right: unknown): boolean {
    if (this.isNa(left) || this.isNa(right)) return false;
    return left === right;
  }

  private evaluateCall(expr: CallExpression): unknown {
    // Get function name (could be identifier or member expression)
    let funcName: string;
    let namespace: string | undefined;

    if (expr.callee.type === 'Identifier') {
      funcName = expr.callee.name;
    } else if (expr.callee.type === 'MemberExpression') {
      const memberPath = this.getMemberPath(expr.callee);
      if (memberPath) {
        namespace = memberPath.slice(0, -1).join('.');
      }
      funcName = expr.callee.property.name;
    } else {
      throw new Error('Invalid callee type');
    }

    const fullName = namespace ? `${namespace}.${funcName}` : funcName;

    if (namespace === 'strategy' && !this.isStrategyOrderFunction(fullName)) {
      throw new Error(`strategy.* functions are not supported yet: ${fullName}`);
    }
    if (namespace && this.isUnsupportedDrawingNamespace(namespace)) {
      throw new Error(`${namespace}.* functions are not supported yet: ${fullName}`);
    }
    if (fullName === 'request.security') {
      this.assertCanEvaluateRequest(fullName);
      return this.evaluateRequestSecurity(expr, this.nextBuiltinCallId(fullName));
    }
    if (fullName === 'request.security_lower_tf') {
      this.assertCanEvaluateRequest(fullName);
      return this.evaluateRequestSecurityLowerTf(expr, this.nextBuiltinCallId(fullName));
    }
    if (fullName === 'request.currency_rate') {
      this.assertCanEvaluateRequest(fullName);
      return this.evaluateRequestCurrencyRate(expr);
    }
    if (fullName === 'request.dividends') {
      this.assertCanEvaluateRequest(fullName);
      return this.evaluateRequestCorporateAction(expr, 'dividends', 'dividends.gross', true);
    }
    if (fullName === 'request.earnings') {
      this.assertCanEvaluateRequest(fullName);
      return this.evaluateRequestCorporateAction(expr, 'earnings', 'earnings.actual', true);
    }
    if (fullName === 'request.splits') {
      this.assertCanEvaluateRequest(fullName);
      return this.evaluateRequestCorporateAction(expr, 'splits', 'splits.denominator', false);
    }
    if (fullName === 'request.financial') {
      this.assertCanEvaluateRequest(fullName);
      return this.evaluateRequestFinancial(expr);
    }
    if (fullName === 'request.economic') {
      this.assertCanEvaluateRequest(fullName);
      return this.evaluateRequestEconomic(expr);
    }
    if (fullName === 'request.seed') {
      this.assertCanEvaluateRequest(fullName);
      return this.evaluateRequestSeed(expr, this.nextBuiltinCallId(fullName));
    }
    if (fullName === 'request.footprint') {
      throw new Error(
        'request.footprint is not supported yet: footprint data requires a host-provided footprint/intrabar volume model',
      );
    }
    if (namespace === 'request') {
      throw new Error(`request.* functions are not supported yet: ${fullName}`);
    }

    // Evaluate arguments
    const args: unknown[] = [];
    const namedArgs = new Map<string, unknown>();

    for (const arg of expr.arguments) {
      const value = this.evaluateExpression(arg.value);
      if (arg.name) {
        const argName = arg.name.name;
        if (namedArgs.has(argName)) {
          throw new Error(`Duplicate named argument: ${argName}`);
        }
        namedArgs.set(argName, value);
      } else {
        args.push(value);
      }
    }

    if (namespace && funcName === 'new') {
      const currentLibraryType = this.findCurrentLibraryType(namespace);
      if (currentLibraryType) {
        return this.evaluateImportedTypeConstructor(currentLibraryType.library, currentLibraryType.declaration, args, namedArgs);
      }
      if (this.typeDeclarations.has(namespace)) {
        return this.evaluateTypeConstructor(namespace, args, namedArgs);
      }
      const importedType = this.findImportedType(namespace);
      if (importedType && importedType.exported) {
        return this.evaluateImportedTypeConstructor(importedType.library, importedType.declaration, args, namedArgs);
      }
      if (importedType) {
        throw new Error(`Unknown library type: ${namespace}`);
      }
    }

    if (namespace && funcName === 'copy') {
      const currentLibraryType = this.findCurrentLibraryType(namespace);
      if (currentLibraryType) {
        return this.evaluateTypeCopy(`${currentLibraryType.library.alias}.${currentLibraryType.declaration.name.name}`, args, namedArgs);
      }
      if (this.typeDeclarations.has(namespace)) {
        return this.evaluateTypeCopy(namespace, args, namedArgs);
      }
      const importedType = this.findImportedType(namespace);
      if (importedType && importedType.exported) {
        return this.evaluateTypeCopy(`${importedType.library.alias}.${importedType.declaration.name.name}`, args, namedArgs);
      }
      if (importedType) {
        throw new Error(`Unknown library type: ${namespace}`);
      }
    }

    if (namespace && this.importedLibraries.has(namespace)) {
      return this.evaluateImportedFunction(namespace, funcName, args, namedArgs);
    }

    if (namespace && expr.callee.type === 'MemberExpression' && this.scope.has(namespace)) {
      const receiver = this.evaluateExpression(expr.callee.object);
      const userMethod = this.findCallableUserMethod(funcName, [receiver, ...args], namedArgs, receiver);
      if (userMethod) {
        return this.evaluateUserFunction(
          userMethod,
          [receiver, ...args],
          namedArgs,
          `method ${funcName}`,
          this.userCallableScopeKey(userMethod),
        );
      }
      const importedMethod = this.findCallableImportedMethod(receiver, funcName, [receiver, ...args], namedArgs);
      if (importedMethod) {
        return this.evaluateImportedLibraryFunction(
          importedMethod.library,
          importedMethod.method,
          [receiver, ...args],
          namedArgs,
        );
      }
      if (isPineArray(receiver) || isPineMatrix(receiver) || isPineMap(receiver)) {
        const methodBuiltinName = this.getMethodBuiltinName(funcName, receiver);
        const methodBuiltin = this.builtins.get(methodBuiltinName);
        if (methodBuiltin) {
          return methodBuiltin([receiver, ...args], namedArgs, this.ctx, this.scope, this.nextBuiltinCallId(methodBuiltinName));
        }
      }
      if (funcName === 'copy' && isPineUdtObject(receiver)) {
        this.assertNoArguments('copy', args, namedArgs);
        return copyUdtObject(receiver);
      }
    }

    const builtin = this.builtins.get(fullName);
    if (builtin) {
      return builtin(args, namedArgs, this.ctx, this.scope, this.builtinCallId(fullName, expr));
    }

    if (namespace && !this.scope.has(namespace) && this.isPlannedUnsupportedNamespace(namespace)) {
      throw new Error(`${namespace}.* functions are not supported yet: ${fullName}`);
    }

    if (expr.callee.type === 'MemberExpression') {
      let receiver: unknown;
      try {
        receiver = this.evaluateExpression(expr.callee.object);
      } catch (error) {
        if (expr.callee.object.type !== 'CallExpression') {
          throw new Error(`Unknown function: ${fullName}`);
        }
        throw error;
      }
      const userMethod = this.findCallableUserMethod(funcName, [receiver, ...args], namedArgs, receiver);
      if (userMethod) {
        return this.evaluateUserFunction(
          userMethod,
          [receiver, ...args],
          namedArgs,
          `method ${funcName}`,
          this.userCallableScopeKey(userMethod),
        );
      }
      const importedMethod = this.findCallableImportedMethod(receiver, funcName, [receiver, ...args], namedArgs);
      if (importedMethod) {
        return this.evaluateImportedLibraryFunction(
          importedMethod.library,
          importedMethod.method,
          [receiver, ...args],
          namedArgs,
        );
      }
      const methodBuiltinName = this.getMethodBuiltinName(funcName, receiver);
      const methodBuiltin = this.builtins.get(methodBuiltinName);
      if (methodBuiltin) {
        return methodBuiltin([receiver, ...args], namedArgs, this.ctx, this.scope, this.nextBuiltinCallId(methodBuiltinName));
      }
      if (funcName === 'copy' && isPineUdtObject(receiver)) {
        this.assertNoArguments('copy', args, namedArgs);
        return copyUdtObject(receiver);
      }
    }

    if (!namespace) {
      const importedLibrary = this.currentImportedLibrary();
      const libraryFunction = importedLibrary?.functions.get(funcName);
      if (importedLibrary && libraryFunction) {
        return this.evaluateImportedLibraryFunction(importedLibrary, libraryFunction, args, namedArgs);
      }

      const userFunction = this.userFunctions.get(funcName);
      if (userFunction) {
        return this.evaluateUserFunction(userFunction, args, namedArgs);
      }
    }

    throw new Error(`Unknown function: ${fullName}`);
  }

  private isStrategyOrderFunction(fullName: string): boolean {
    return (
      fullName === 'strategy.entry'
      || fullName === 'strategy.order'
      || fullName === 'strategy.exit'
      || fullName === 'strategy.close'
      || fullName === 'strategy.close_all'
      || fullName === 'strategy.cancel'
      || fullName === 'strategy.cancel_all'
    );
  }

  private userCallableScopeKey(fn: FunctionDeclaration): string {
    if (!fn.isMethod) return fn.name.name;

    const locKey = fn.loc
      ? `${fn.loc.start.line}:${fn.loc.start.column}-${fn.loc.end.line}:${fn.loc.end.column}`
      : `${fn.params.map((param) => param.typeAnnotation?.baseType ?? 'any').join(',')}#${fn.params.length}`;
    return `method:${fn.name.name}:${locKey}`;
  }

  private importedFunctionScopeKey(alias: string, fn: FunctionDeclaration): string {
    const locKey = fn.loc
      ? `${fn.loc.start.line}:${fn.loc.start.column}-${fn.loc.end.line}:${fn.loc.end.column}`
      : fn.name.name;
    return `import:${alias}:${fn.name.name}:${locKey}`;
  }

  private evaluateImportedFunction(
    alias: string,
    functionName: string,
    args: unknown[],
    namedArgs: Map<string, unknown>,
  ): unknown {
    const library = this.importedLibraries.get(alias);
    const fn = library?.functions.get(functionName);
    if (!library || !fn || !library.exportedFunctions.has(functionName)) {
      throw new Error(`Unknown library function: ${alias}.${functionName}`);
    }
    return this.evaluateImportedLibraryFunction(library, fn, args, namedArgs);
  }

  private currentImportedLibrary(): ImportedLibrary | undefined {
    const alias = this.importedLibraryCallStack.at(-1);
    return alias ? this.importedLibraries.get(alias) : undefined;
  }

  private evaluateImportedLibraryFunction(
    library: ImportedLibrary,
    fn: FunctionDeclaration,
    args: unknown[],
    namedArgs: Map<string, unknown>,
  ): unknown {
    const scopeKey = this.importedFunctionScopeKey(library.alias, fn);
    this.importedLibraryCallStack.push(library.alias);
    try {
      return this.evaluateUserFunction(
        fn,
        args,
        namedArgs,
        `library function ${library.alias}.${fn.name.name}`,
        scopeKey,
        scopeKey,
      );
    } finally {
      this.importedLibraryCallStack.pop();
    }
  }

  private findImportedType(namespace: string): { library: ImportedLibrary; declaration: TypeDeclaration; exported: boolean } | undefined {
    const parts = namespace.split('.');
    if (parts.length !== 2) return undefined;
    const [alias, typeName] = parts;
    if (!alias || !typeName) return undefined;

    const library = this.importedLibraries.get(alias);
    const declaration = library?.types.get(typeName);
    if (!library || !declaration) return undefined;

    return {
      library,
      declaration,
      exported: library.exportedTypes.has(typeName),
    };
  }

  private findCurrentLibraryType(typeName: string): { library: ImportedLibrary; declaration: TypeDeclaration } | undefined {
    if (typeName.includes('.')) return undefined;

    const library = this.currentImportedLibrary();
    const declaration = library?.types.get(typeName);
    return library && declaration ? { library, declaration } : undefined;
  }

  private evaluateImportedTypeConstructor(
    library: ImportedLibrary,
    declaration: TypeDeclaration,
    args: unknown[],
    namedArgs: Map<string, unknown>,
  ): PineUdtObject {
    this.importedLibraryCallStack.push(library.alias);
    try {
      return this.evaluateTypeConstructor(`${library.alias}.${declaration.name.name}`, args, namedArgs, declaration);
    } finally {
      this.importedLibraryCallStack.pop();
    }
  }

  private evaluateTypeCopy(typeName: string, args: unknown[], namedArgs: Map<string, unknown>): PineUdtObject {
    const source = this.getCallArg(args, namedArgs, 0, 'id');
    if (!isPineUdtObject(source)) {
      throw new Error(`${typeName}.copy expects a user-defined type object`);
    }
    if (source.typeName !== typeName) {
      throw new Error(`${typeName}.copy expects ${typeName}, got ${source.typeName}`);
    }
    if (args.length > 1 || namedArgs.size > (namedArgs.has('id') ? 1 : 0)) {
      throw new Error(`${typeName}.copy expects one object argument`);
    }
    return copyUdtObject(source);
  }

  private findCallableUserMethod(
    methodName: string,
    args: unknown[],
    namedArgs: Map<string, unknown>,
    receiver: unknown,
  ): FunctionDeclaration | undefined {
    const overloads = this.userMethods.get(methodName);
    return overloads?.find((method) => (
      this.methodReceiverMatches(method, receiver)
      && this.canCallUserFunction(method, args, namedArgs)
    ));
  }

  private methodReceiverMatches(method: FunctionDeclaration, receiver: unknown): boolean {
    const annotation = this.getTypeAnnotationName(method.params[0]?.typeAnnotation);
    if (!annotation) return true;

    if (isPineUdtObject(receiver)) {
      return annotation === receiver.typeName;
    }

    return !this.typeDeclarations.has(annotation);
  }

  private findCallableImportedMethod(
    receiver: unknown,
    methodName: string,
    args: unknown[],
    namedArgs: Map<string, unknown>,
  ): { library: ImportedLibrary; method: FunctionDeclaration } | undefined {
    if (!isPineUdtObject(receiver)) return undefined;

    const [alias, receiverTypeName] = receiver.typeName.split('.');
    if (!alias || !receiverTypeName) return undefined;

    const library = this.importedLibraries.get(alias);
    const overloads = library?.methods.get(methodName);
    if (!library || !overloads) return undefined;

    const isInsideSameLibrary = this.currentImportedLibrary()?.alias === alias;
    const method = overloads.find((candidate) => {
      const receiverAnnotation = this.getTypeAnnotationName(candidate.params[0]?.typeAnnotation);
      if (receiverAnnotation !== receiverTypeName) return false;
      if (!isInsideSameLibrary && candidate.exported !== true) return false;
      return this.canCallUserFunction(candidate, args, namedArgs);
    });
    return method ? { library, method } : undefined;
  }

  private evaluateTypeConstructor(
    typeName: string,
    args: unknown[],
    namedArgs: Map<string, unknown>,
    declaration = this.typeDeclarations.get(typeName),
  ): PineUdtObject {
    if (!declaration) {
      throw new Error(`Unknown user-defined type: ${typeName}`);
    }
    if (args.length > declaration.fields.length) {
      throw new Error(`Too many arguments for ${typeName}.new: expected ${declaration.fields.length}, got ${args.length}`);
    }

    const fieldValues = new Map<string, unknown>();
    const varipFields = new Set<string>();
    const fieldNames = new Set(declaration.fields.map((field) => field.name.name));
    for (const argName of namedArgs.keys()) {
      if (!fieldNames.has(argName)) {
        throw new Error(`Unknown field '${argName}' for ${typeName}.new`);
      }
    }

    declaration.fields.forEach((field, index) => {
      const fieldName = field.name.name;
      let value: unknown;
      if (index < args.length) {
        if (namedArgs.has(fieldName)) {
          throw new Error(`Field '${fieldName}' for ${typeName}.new was supplied multiple times`);
        }
        value = args[index];
      } else if (namedArgs.has(fieldName)) {
        value = namedArgs.get(fieldName);
      } else {
        value = this.evaluateTypeFieldDefault(field);
      }
      if (field.varip) {
        varipFields.add(fieldName);
      }
      fieldValues.set(fieldName, value);
    });

    return createPineUdtObject(typeName, fieldValues, varipFields);
  }

  private evaluateTypeFieldDefault(field: TypeFieldDeclaration): unknown {
    if (field.defaultValue) return this.evaluateExpression(field.defaultValue);
    return field.typeAnnotation?.baseType === 'bool' ? false : Number.NaN;
  }

  private assertNoArguments(name: string, args: unknown[], namedArgs: Map<string, unknown>): void {
    if (args.length > 0 || namedArgs.size > 0) {
      throw new Error(`${name} expects no arguments`);
    }
  }

  private isUnsupportedDrawingNamespace(_namespace: string): boolean {
    return false;
  }

  private isPlannedUnsupportedNamespace(namespace: string): boolean {
    return PLANNED_UNSUPPORTED_NAMESPACES.has(namespace);
  }

  private assertCanEvaluateRequest(fullName: string): void {
    if (this.indicatorDynamicRequests) {
      return;
    }
    if (this.requestContextDepth > 0) {
      throw new Error(`Nested request.* calls require dynamic_requests=true: ${fullName}`);
    }
    if (this.requestLocalScopeDepth > 0) {
      throw new Error(`request.* calls in local scopes require dynamic_requests=true: ${fullName}`);
    }
  }

  private evaluateRequestSecurity(expr: CallExpression, callId: string): unknown {
    const symbolArg = this.getOrderedCallArgument(expr, REQUEST_SECURITY_ARGS, 0);
    const timeframeArg = this.getOrderedCallArgument(expr, REQUEST_SECURITY_ARGS, 1);
    const expressionArg = this.getOrderedCallArgument(expr, REQUEST_SECURITY_ARGS, 2);

    if (!symbolArg || !timeframeArg || !expressionArg) {
      throw new Error('request.security requires symbol, timeframe, and expression arguments');
    }
    if (!this.requestDatafeed) {
      throw new Error('request.security requires a request datafeed');
    }

    const symbol = this.normalizeRequestSymbol(this.evaluateExpression(symbolArg.value));
    const timeframe = this.normalizeRequestTimeframe(this.evaluateExpression(timeframeArg.value));
    const gaps = this.normalizeBarmergeGaps(this.evaluateOptionalOrderedCallArgument(expr, REQUEST_SECURITY_ARGS, 3) ?? 'barmerge.gaps_off');
    const lookahead = this.normalizeBarmergeLookahead(
      this.evaluateOptionalOrderedCallArgument(expr, REQUEST_SECURITY_ARGS, 4) ?? 'barmerge.lookahead_off',
    );
    const ignoreInvalidSymbol = this.isTruthy(this.evaluateOptionalOrderedCallArgument(expr, REQUEST_SECURITY_ARGS, 5) ?? false);
    const currency = this.normalizeOptionalRequestCurrency(this.evaluateOptionalOrderedCallArgument(expr, REQUEST_SECURITY_ARGS, 6));
    const calcBarsCount = this.normalizeOptionalPositiveInteger(this.evaluateOptionalOrderedCallArgument(expr, REQUEST_SECURITY_ARGS, 7));
    const expressionId = this.requestExpressionCacheId(expressionArg.value);
    this.trackRequestContext(
      this.requestLimitKey('request.security', expressionId, symbol, timeframe, currency, calcBarsCount),
    );

    const result = this.requestDatafeed.getBars({ symbol, timeframe, calcBarsCount, currency });
    if (!result.ok) {
      if (ignoreInvalidSymbol && (result.code === 'invalid_symbol' || result.code === 'missing_context')) {
        return Number.NaN;
      }
      throw new Error(`request.security failed: ${result.message}`);
    }

    const cacheKey = this.requestEvaluationCacheKey(callId, expressionId, symbol, timeframe, currency, calcBarsCount);
    let cached = this.requestEvaluationCache.get(cacheKey);
    if (!cached) {
      cached = {
        bars: result.context.bars,
        values: this.evaluateRequestExpressionSeries(expressionArg.value, result.context),
      };
      this.requestEvaluationCache.set(cacheKey, cached);
    }

    return this.mergeRequestedValue(cached.bars, cached.values, gaps, lookahead);
  }

  private evaluateRequestSecurityLowerTf(expr: CallExpression, callId: string): PineArray {
    const symbolArg = this.getOrderedCallArgument(expr, REQUEST_SECURITY_LOWER_TF_ARGS, 0);
    const timeframeArg = this.getOrderedCallArgument(expr, REQUEST_SECURITY_LOWER_TF_ARGS, 1);
    const expressionArg = this.getOrderedCallArgument(expr, REQUEST_SECURITY_LOWER_TF_ARGS, 2);

    if (!symbolArg || !timeframeArg || !expressionArg) {
      throw new Error('request.security_lower_tf requires symbol, timeframe, and expression arguments');
    }
    if (!this.requestDatafeed) {
      throw new Error('request.security_lower_tf requires a request datafeed');
    }

    const symbol = this.normalizeRequestSymbol(this.evaluateExpression(symbolArg.value));
    const timeframe = this.normalizeRequestTimeframe(this.evaluateExpression(timeframeArg.value));
    const ignoreInvalidSymbol = this.isTruthy(this.evaluateOptionalOrderedCallArgument(expr, REQUEST_SECURITY_LOWER_TF_ARGS, 3) ?? false);
    const currency = this.normalizeOptionalRequestCurrency(this.evaluateOptionalOrderedCallArgument(expr, REQUEST_SECURITY_LOWER_TF_ARGS, 4));
    const ignoreInvalidTimeframe = this.isTruthy(this.evaluateOptionalOrderedCallArgument(expr, REQUEST_SECURITY_LOWER_TF_ARGS, 5) ?? false);
    const calcBarsCount = this.normalizeOptionalPositiveInteger(this.evaluateOptionalOrderedCallArgument(expr, REQUEST_SECURITY_LOWER_TF_ARGS, 6));
    const expressionId = this.requestExpressionCacheId(expressionArg.value);
    this.trackRequestContext(
      this.requestLimitKey('request.security_lower_tf', expressionId, symbol, timeframe, currency, calcBarsCount),
    );

    if (!this.isLowerRequestTimeframe(timeframe)) {
      if (ignoreInvalidTimeframe) {
        return createPineArray();
      }
      throw new Error(`request.security_lower_tf requires a lower timeframe than the chart timeframe: ${timeframe}`);
    }

    const result = this.requestDatafeed.getBars({ symbol, timeframe, calcBarsCount, currency });
    if (!result.ok) {
      if (ignoreInvalidSymbol && (result.code === 'invalid_symbol' || result.code === 'missing_context')) {
        return createPineArray();
      }
      if (ignoreInvalidTimeframe && result.code === 'invalid_timeframe') {
        return createPineArray();
      }
      throw new Error(`request.security_lower_tf failed: ${result.message}`);
    }

    const cacheKey = this.requestEvaluationCacheKey(callId, expressionId, symbol, timeframe, currency, calcBarsCount);
    let cached = this.requestEvaluationCache.get(cacheKey);
    if (!cached) {
      cached = {
        bars: result.context.bars,
        values: this.evaluateRequestExpressionSeries(expressionArg.value, result.context),
      };
      this.requestEvaluationCache.set(cacheKey, cached);
    }

    return this.collectLowerTimeframeValues(cached.bars, cached.values);
  }

  private evaluateRequestCurrencyRate(expr: CallExpression): unknown {
    const fromArg = this.getOrderedCallArgument(expr, REQUEST_CURRENCY_RATE_ARGS, 0);
    const toArg = this.getOrderedCallArgument(expr, REQUEST_CURRENCY_RATE_ARGS, 1);

    if (!fromArg || !toArg) {
      throw new Error('request.currency_rate requires from and to currency arguments');
    }

    const fromCurrency = this.normalizeOptionalRequestCurrency(this.evaluateExpression(fromArg.value));
    const toCurrency = this.normalizeOptionalRequestCurrency(this.evaluateExpression(toArg.value));
    const ignoreInvalidCurrency = this.isTruthy(this.evaluateOptionalOrderedCallArgument(expr, REQUEST_CURRENCY_RATE_ARGS, 2) ?? false);

    if (!fromCurrency || !toCurrency) {
      if (ignoreInvalidCurrency) {
        return Number.NaN;
      }
      throw new Error('request.currency_rate requires non-empty currency codes');
    }
    if (fromCurrency === toCurrency) {
      return 1;
    }
    if (!this.requestDatafeed?.getSeries) {
      throw new Error('request.currency_rate requires a request series datafeed');
    }

    const key = currencyRateRequestKey(fromCurrency, toCurrency);
    this.trackRequestContext(`request.currency_rate\u0000${key}`);
    const result = this.requestDatafeed.getSeries({ family: 'currency_rate', key });
    if (!result.ok) {
      if (ignoreInvalidCurrency && (result.code === 'invalid_currency' || result.code === 'missing_context')) {
        return Number.NaN;
      }
      throw new Error(`request.currency_rate failed: ${result.message}`);
    }

    return this.mergeRequestSeriesValue(result.context.points);
  }

  private evaluateRequestCorporateAction(expr: CallExpression, family: 'dividends' | 'earnings' | 'splits', defaultField: string, supportsCurrency: boolean): unknown {
    const tickerArg = this.getOrderedCallArgument(expr, REQUEST_SERIES_ARGS, 0);
    if (!tickerArg) {
      throw new Error(`request.${family} requires a ticker argument`);
    }

    const ticker = this.normalizeRequestSymbol(this.evaluateExpression(tickerArg.value));
    const field = this.normalizeRequestSeriesField(this.evaluateOptionalOrderedCallArgument(expr, REQUEST_SERIES_ARGS, 1), defaultField);
    const gaps = this.normalizeBarmergeGaps(this.evaluateOptionalOrderedCallArgument(expr, REQUEST_SERIES_ARGS, 2) ?? 'barmerge.gaps_off');
    const lookahead = this.normalizeBarmergeLookahead(
      this.evaluateOptionalOrderedCallArgument(expr, REQUEST_SERIES_ARGS, 3) ?? 'barmerge.lookahead_off',
    );
    const ignoreInvalidSymbol = this.isTruthy(this.evaluateOptionalOrderedCallArgument(expr, REQUEST_SERIES_ARGS, 4) ?? false);
    const currency = supportsCurrency
      ? this.normalizeOptionalRequestCurrency(this.evaluateOptionalOrderedCallArgument(expr, REQUEST_SERIES_ARGS, 5))
      : undefined;
    const key = corporateActionRequestKey(ticker, field, currency);

    return this.evaluateRequestPointSeries({
      family,
      key,
      functionName: `request.${family}`,
      gaps,
      lookahead,
      ignoreInvalid: ignoreInvalidSymbol,
    });
  }

  private evaluateRequestFinancial(expr: CallExpression): unknown {
    const symbolArg = this.getOrderedCallArgument(expr, REQUEST_FINANCIAL_ARGS, 0);
    const financialIdArg = this.getOrderedCallArgument(expr, REQUEST_FINANCIAL_ARGS, 1);
    const periodArg = this.getOrderedCallArgument(expr, REQUEST_FINANCIAL_ARGS, 2);
    if (!symbolArg || !financialIdArg || !periodArg) {
      throw new Error('request.financial requires symbol, financial_id, and period arguments');
    }

    const symbol = this.normalizeRequestSymbol(this.evaluateExpression(symbolArg.value));
    const financialId = this.toStringValue(this.evaluateExpression(financialIdArg.value)).trim();
    const period = this.toStringValue(this.evaluateExpression(periodArg.value)).trim().toUpperCase();
    const gaps = this.normalizeBarmergeGaps(this.evaluateOptionalOrderedCallArgument(expr, REQUEST_FINANCIAL_ARGS, 3) ?? 'barmerge.gaps_off');
    const ignoreInvalidSymbol = this.isTruthy(this.evaluateOptionalOrderedCallArgument(expr, REQUEST_FINANCIAL_ARGS, 4) ?? false);
    const currency = this.normalizeOptionalRequestCurrency(this.evaluateOptionalOrderedCallArgument(expr, REQUEST_FINANCIAL_ARGS, 5));

    return this.evaluateRequestPointSeries({
      family: 'financial',
      key: financialRequestKey(symbol, financialId, period, currency),
      functionName: 'request.financial',
      gaps,
      lookahead: 'barmerge.lookahead_off',
      ignoreInvalid: ignoreInvalidSymbol,
    });
  }

  private evaluateRequestEconomic(expr: CallExpression): unknown {
    const countryCodeArg = this.getOrderedCallArgument(expr, REQUEST_ECONOMIC_ARGS, 0);
    const fieldArg = this.getOrderedCallArgument(expr, REQUEST_ECONOMIC_ARGS, 1);
    if (!countryCodeArg || !fieldArg) {
      throw new Error('request.economic requires country_code and field arguments');
    }

    const countryCode = this.toStringValue(this.evaluateExpression(countryCodeArg.value)).trim().toUpperCase();
    const field = this.toStringValue(this.evaluateExpression(fieldArg.value)).trim();
    const gaps = this.normalizeBarmergeGaps(this.evaluateOptionalOrderedCallArgument(expr, REQUEST_ECONOMIC_ARGS, 2) ?? 'barmerge.gaps_off');
    const ignoreInvalidSymbol = this.isTruthy(this.evaluateOptionalOrderedCallArgument(expr, REQUEST_ECONOMIC_ARGS, 3) ?? false);

    return this.evaluateRequestPointSeries({
      family: 'economic',
      key: economicRequestKey(countryCode, field),
      functionName: 'request.economic',
      gaps,
      lookahead: 'barmerge.lookahead_off',
      ignoreInvalid: ignoreInvalidSymbol,
    });
  }

  private evaluateRequestSeed(expr: CallExpression, callId: string): unknown {
    const sourceArg = this.getOrderedCallArgument(expr, REQUEST_SEED_ARGS, 0);
    const symbolArg = this.getOrderedCallArgument(expr, REQUEST_SEED_ARGS, 1);
    const expressionArg = this.getOrderedCallArgument(expr, REQUEST_SEED_ARGS, 2);

    if (!sourceArg || !symbolArg || !expressionArg) {
      throw new Error('request.seed requires source, symbol, and expression arguments');
    }
    if (!this.requestDatafeed) {
      throw new Error('request.seed requires a request datafeed');
    }

    const source = this.toStringValue(this.evaluateExpression(sourceArg.value)).trim();
    const symbol = this.toStringValue(this.evaluateExpression(symbolArg.value)).trim();
    const requestSymbol = seedRequestSymbol(source, symbol);
    const timeframe = this.ctx.timeframe.period;
    const ignoreInvalidSymbol = this.isTruthy(this.evaluateOptionalOrderedCallArgument(expr, REQUEST_SEED_ARGS, 3) ?? false);
    const calcBarsCount = this.normalizeOptionalPositiveInteger(this.evaluateOptionalOrderedCallArgument(expr, REQUEST_SEED_ARGS, 4));
    const expressionId = this.requestExpressionCacheId(expressionArg.value);
    this.trackRequestContext(
      this.requestLimitKey('request.seed', expressionId, requestSymbol, timeframe, undefined, calcBarsCount),
    );

    const result = this.requestDatafeed.getBars({ symbol: requestSymbol, timeframe, calcBarsCount });
    if (!result.ok) {
      if (ignoreInvalidSymbol && (result.code === 'invalid_symbol' || result.code === 'missing_context')) {
        return Number.NaN;
      }
      throw new Error(`request.seed failed: ${result.message}`);
    }

    const cacheKey = this.requestEvaluationCacheKey(callId, expressionId, requestSymbol, timeframe, undefined, calcBarsCount);
    let cached = this.requestEvaluationCache.get(cacheKey);
    if (!cached) {
      cached = {
        bars: result.context.bars,
        values: this.evaluateRequestExpressionSeries(expressionArg.value, result.context),
      };
      this.requestEvaluationCache.set(cacheKey, cached);
    }

    return this.mergeRequestedValue(cached.bars, cached.values, 'barmerge.gaps_off', 'barmerge.lookahead_off');
  }

  private evaluateRequestPointSeries(options: {
    family: RequestSeriesFamily;
    key: string;
    functionName: string;
    gaps: 'barmerge.gaps_off' | 'barmerge.gaps_on';
    lookahead: 'barmerge.lookahead_off' | 'barmerge.lookahead_on';
    ignoreInvalid: boolean;
  }): number {
    this.trackRequestContext(`${options.functionName}\u0000${options.key}`);
    if (options.lookahead !== 'barmerge.lookahead_off') {
      throw new Error(`${options.functionName} with lookahead_on is not implemented yet`);
    }
    if (!this.requestDatafeed?.getSeries) {
      throw new Error(`${options.functionName} requires a request series datafeed`);
    }

    const result = this.requestDatafeed.getSeries({ family: options.family, key: options.key });
    if (!result.ok) {
      if (options.ignoreInvalid && (result.code === 'invalid_symbol' || result.code === 'missing_context' || result.code === 'unsupported_context')) {
        return Number.NaN;
      }
      throw new Error(`${options.functionName} failed: ${result.message}`);
    }

    return this.mergeRequestSeriesValue(result.context.points, options.gaps);
  }

  private getOrderedCallArgument(expr: CallExpression, names: readonly string[], position: number): CallArgument | undefined {
    const name = names[position];
    const positionalPosition = position - names.slice(0, position).filter((priorName) => (
      expr.arguments.some((arg) => arg.name?.name === priorName)
    )).length;
    return name
      ? expr.arguments.find((arg) => arg.name?.name === name) ?? expr.arguments.filter((arg) => !arg.name)[positionalPosition]
      : undefined;
  }

  private evaluateOptionalOrderedCallArgument(expr: CallExpression, names: readonly string[], position: number): unknown {
    const arg = this.getOrderedCallArgument(expr, names, position);
    return arg ? this.evaluateExpression(arg.value) : undefined;
  }

  private normalizeRequestSymbol(value: unknown): string {
    const symbol = this.toStringValue(value).trim();
    if (symbol === '' || symbol === this.ctx.syminfo.ticker) {
      return this.ctx.syminfo.ticker;
    }
    return symbol;
  }

  private normalizeRequestTimeframe(value: unknown): string {
    const timeframe = this.toStringValue(value).trim().toUpperCase();
    if (timeframe === '' || timeframe === this.ctx.timeframe.period) {
      return this.ctx.timeframe.period;
    }
    return timeframe;
  }

  private normalizeBarmergeGaps(value: unknown): 'barmerge.gaps_off' | 'barmerge.gaps_on' {
    const normalized = this.toStringValue(value);
    if (normalized === 'barmerge.gaps_on') return 'barmerge.gaps_on';
    if (normalized === 'barmerge.gaps_off') return 'barmerge.gaps_off';
    throw new Error(`Unsupported request.security gaps mode: ${normalized}`);
  }

  private normalizeBarmergeLookahead(value: unknown): 'barmerge.lookahead_off' | 'barmerge.lookahead_on' {
    const normalized = this.toStringValue(value);
    if (normalized === 'barmerge.lookahead_on') return 'barmerge.lookahead_on';
    if (normalized === 'barmerge.lookahead_off') return 'barmerge.lookahead_off';
    throw new Error(`Unsupported request.security lookahead mode: ${normalized}`);
  }

  private normalizeRequestSeriesField(value: unknown, defaultField: string): string {
    if (value === undefined || this.isNa(value)) {
      return defaultField;
    }

    const field = this.toStringValue(value).trim();
    return field === '' ? defaultField : field;
  }

  private normalizeOptionalPositiveInteger(value: unknown): number | undefined {
    if (value === undefined || this.isNa(value)) {
      return undefined;
    }

    const count = Math.trunc(this.toNumber(value));
    return Number.isFinite(count) && count > 0 ? count : undefined;
  }

  private normalizeOptionalRequestCurrency(value: unknown): string | undefined {
    if (value === undefined || this.isNa(value)) {
      return undefined;
    }

    const currency = this.toStringValue(value).trim().toUpperCase();
    return currency === '' ? undefined : currency;
  }

  private isLowerRequestTimeframe(timeframe: string): boolean {
    const requestDuration = this.getTimeframeDurationMs(timeframe);
    const chartDuration = this.getTimeframeDurationMs(this.ctx.timeframe.period);
    return requestDuration !== null && chartDuration !== null && requestDuration < chartDuration;
  }

  private requestEvaluationCacheKey(
    callId: string,
    expressionId: string,
    symbol: string,
    timeframe: string,
    currency: string | undefined,
    calcBarsCount: number | undefined,
  ): string {
    return `${callId}\u0000${expressionId}\u0000${symbol}\u0000${timeframe}\u0000${currency ?? ''}\u0000${calcBarsCount ?? ''}`;
  }

  private requestLimitKey(
    functionName: string,
    expressionId: string,
    symbol: string,
    timeframe: string,
    currency: string | undefined,
    calcBarsCount: number | undefined,
  ): string {
    return `${functionName}\u0000${expressionId}\u0000${symbol}\u0000${timeframe}\u0000${currency ?? ''}\u0000${calcBarsCount ?? ''}`;
  }

  private trackRequestContext(key: string): void {
    this.requestContextKeys.add(key);
    if (this.requestContextKeys.size > TealscriptEngine.MAX_UNIQUE_REQUEST_CONTEXTS) {
      throw new Error(
        `Too many unique request.* contexts: maximum is ${TealscriptEngine.MAX_UNIQUE_REQUEST_CONTEXTS}`,
      );
    }
  }

  private requestExpressionCacheId(expression: Expression): string {
    if (expression.loc) {
      return `${expression.loc.start.line}:${expression.loc.start.column}-${expression.loc.end.line}:${expression.loc.end.column}`;
    }

    const existing = this.requestExpressionIds.get(expression);
    if (existing !== undefined) {
      return `expr:${existing}`;
    }

    const next = this.nextRequestExpressionId++;
    this.requestExpressionIds.set(expression, next);
    return `expr:${next}`;
  }

  private evaluateRequestExpressionSeries(expression: Expression, requestContext: RequestDataContext): unknown[] {
    const engine = new TealscriptEngine({
      requestDatafeed: this.requestDatafeed,
      libraries: this.libraries,
      runtime: {
        ...this.runtimeOptions,
        session: requestContext.session,
        syminfo: this.ctx.syminfo,
        timeframe: this.ctx.timeframe,
        now: this.ctx.now,
      },
    });
    engine.importedLibraryCallStack = [...this.importedLibraryCallStack];
    engine.indicatorDynamicRequests = this.indicatorDynamicRequests;
    engine.requestContextDepth = this.requestContextDepth + 1;
    engine.requestContextKeys = this.requestContextKeys;
    engine.ctx.setNow(this.ctx.now);
    engine.ctx.syminfo = {
      ...engine.ctx.syminfo,
      ...requestContext.syminfo,
      ticker: requestContext.syminfo?.ticker ?? requestContext.symbol,
      currency: requestContext.currency ?? requestContext.syminfo?.currency ?? engine.ctx.syminfo.currency,
    };

    const timeframeInfo = engine.getTimeframeInfo(requestContext.timeframe);
    if (!timeframeInfo) {
      throw new Error(`Invalid request.security timeframe: ${requestContext.timeframe}`);
    }
    engine.ctx.timeframe = timeframeInfo;
    engine.ctx.loadBars(requestContext.bars);
    engine.userFunctions = new Map(this.userFunctions);
    engine.userMethods = new Map(Array.from(this.userMethods, ([name, methods]) => [name, [...methods]]));
    engine.importedLibraries = new Map(this.importedLibraries);
    engine.functionScopes.clear();
    for (const fn of engine.userFunctions.values()) {
      engine.functionScopes.set(engine.userCallableScopeKey(fn), engine.scope.createChild());
    }
    for (const methods of engine.userMethods.values()) {
      for (const method of methods) {
        engine.functionScopes.set(engine.userCallableScopeKey(method), engine.scope.createChild());
      }
    }
    for (const [alias, library] of engine.importedLibraries) {
      for (const fn of library.functions.values()) {
        engine.functionScopes.set(engine.importedFunctionScopeKey(alias, fn), engine.scope.createChild());
      }
      for (const methods of library.methods.values()) {
        for (const method of methods) {
          engine.functionScopes.set(engine.importedFunctionScopeKey(alias, method), engine.scope.createChild());
        }
      }
    }

    const values: unknown[] = [];
    while (engine.ctx.advanceBar()) {
      engine.scope.advanceBar();
      for (const functionScope of engine.functionScopes.values()) {
        functionScope.advanceBar();
      }
      engine.resetPerBarBuiltinState();
      values.push(engine.evaluateExpression(expression));
      const isLastBar = engine.ctx.bar_index === engine.ctx.last_bar_index;
      engine.scope.commit(isLastBar);
      for (const functionScope of engine.functionScopes.values()) {
        functionScope.commit(isLastBar);
      }
      engine.ctx.commitBar();
    }

    return values;
  }

  private mergeRequestedValue(
    requestBars: Bar[],
    requestedValues: unknown[],
    gaps: 'barmerge.gaps_off' | 'barmerge.gaps_on',
    lookahead: 'barmerge.lookahead_off' | 'barmerge.lookahead_on',
  ): unknown {
    const chartTime = this.ctx.time.get(0);
    if (chartTime === undefined || requestBars.length === 0) {
      return Number.NaN;
    }

    const selectedIndex = lookahead === 'barmerge.lookahead_on'
      ? this.findActiveRequestBarIndex(requestBars, chartTime)
      : this.findConfirmedRequestBarIndex(requestBars, chartTime);
    if (selectedIndex < 0) {
      return Number.NaN;
    }

    if (gaps === 'barmerge.gaps_on') {
      const availableAt = lookahead === 'barmerge.lookahead_on'
        ? requestBars[selectedIndex]?.time
        : requestBars[selectedIndex + 1]?.time;
      if (availableAt === undefined || !this.isFirstChartBarAtOrAfter(availableAt)) {
        return Number.NaN;
      }
    }

    return requestedValues[selectedIndex] ?? Number.NaN;
  }

  private findActiveRequestBarIndex(requestBars: Bar[], chartTime: number): number {
    let index = -1;
    for (let i = 0; i < requestBars.length; i++) {
      if (requestBars[i]!.time <= chartTime) {
        index = i;
      } else {
        break;
      }
    }
    return index;
  }

  private findConfirmedRequestBarIndex(requestBars: Bar[], chartTime: number): number {
    let index = -1;
    for (let i = 0; i < requestBars.length - 1; i++) {
      if (requestBars[i + 1]!.time <= chartTime) {
        index = i;
      } else {
        break;
      }
    }
    return index;
  }

  private isFirstChartBarAtOrAfter(time: number): boolean {
    const previous = this.ctx.getBar(this.ctx.bar_index - 1);
    return !previous || previous.time < time;
  }

  private collectLowerTimeframeValues(requestBars: Bar[], requestedValues: unknown[]): PineArray {
    const array = createPineArray();
    const chartStart = this.ctx.time.get(0);
    if (chartStart === undefined || requestBars.length === 0) {
      return array;
    }

    const chartEnd = this.getCurrentChartBarEndTime(chartStart);
    if (!Number.isFinite(chartEnd) || chartEnd <= chartStart) {
      return array;
    }

    for (let index = 0; index < requestBars.length; index++) {
      const requestTime = requestBars[index]!.time;
      if (requestTime >= chartStart && requestTime < chartEnd) {
        pushArrayValue(array, requestedValues[index] ?? Number.NaN);
      }
    }

    return array;
  }

  private getCurrentChartBarEndTime(chartStart: number): number {
    const nextBar = this.ctx.getBar(this.ctx.bar_index + 1);
    if (nextBar) {
      return nextBar.time;
    }

    return this.getBarCloseTime(chartStart, this.ctx.timeframe.period);
  }

  private mergeRequestSeriesValue(
    points: RequestSeriesPoint[],
    gaps: 'barmerge.gaps_off' | 'barmerge.gaps_on' = 'barmerge.gaps_off',
  ): number {
    const chartTime = this.ctx.time.get(0);
    if (chartTime === undefined || points.length === 0) {
      return Number.NaN;
    }

    const sortedPoints = [...points].sort((left, right) => left.time - right.time);
    let value = Number.NaN;
    let valueTime = Number.NaN;
    for (const point of sortedPoints) {
      if (point.time <= chartTime) {
        value = point.value;
        valueTime = point.time;
      } else {
        break;
      }
    }
    if (gaps === 'barmerge.gaps_on') {
      return Number.isFinite(value) && this.isFirstChartBarAtOrAfter(valueTime)
        ? value
        : Number.NaN;
    }
    return value;
  }

  private registerDrawingBuiltins(): void {
    registerLabelBuiltins(this.builtins, this.createDrawingBuiltinRuntime());
    registerLineBuiltins(this.builtins, this.createDrawingBuiltinRuntime());
    registerLineFillBuiltins(this.builtins, this.createDrawingBuiltinRuntime());
    registerBoxBuiltins(this.builtins, this.createDrawingBuiltinRuntime());
    registerPolylineBuiltins(this.builtins, this.createDrawingBuiltinRuntime());
    registerTableBuiltins(this.builtins, this.createDrawingBuiltinRuntime());

    registerDrawingConstants(this.builtins);
  }

  private createDrawingBuiltinRuntime(): DrawingBuiltinRuntime {
    return {
      isNa: (value) => this.isNa(value),
      toNullableNumber: (value) => this.toNullableNumber(value),
      toStringValue: (value) => this.toStringValue(value),
      toNumber: (value) => this.toNumber(value),
      toNullableColor: (value) => this.toNullableColor(value),
      toOptionalString: (value) => this.toOptionalString(value),
      toLineWidth: (value) => this.toLineWidth(value),
      toDrawingId: (value) => this.toDrawingId(value),
      withLine: (value, ctx, fn) => this.withLine(value, ctx, fn),
      getLineValue: (value, ctx, fn) => this.getLineValue(value, ctx, fn),
      interpolateLinePrice: (line, x) => this.interpolateLinePrice(line, x),
    };
  }

  private toDrawingId(value: unknown): string | undefined {
    return toDrawingIdValue(value, (candidate) => this.isNa(candidate));
  }

  private toLineWidth(value: unknown): number {
    return toLineWidthValue(value, (candidate, min, max) => this.clampNumber(candidate, min, max));
  }

  private withLine(value: unknown, ctx: ExecutionContext, fn: (line: LineDrawingOutput) => void): void {
    withDrawing(value, ctx, 'line', (candidate) => this.isNa(candidate), fn);
  }

  private getLineValue<T>(value: unknown, ctx: ExecutionContext, fn: (line: LineDrawingOutput) => T): T | number {
    return getDrawingValue(value, ctx, 'line', (candidate) => this.isNa(candidate), fn);
  }

  private interpolateLinePrice(line: LineDrawingOutput, x: number): number {
    if (line.xloc !== 'bar_index') return Number.NaN;
    if (
      line.x1 === null
      || line.x2 === null
      || line.y1 === null
      || line.y2 === null
      || !Number.isFinite(x)
    ) {
      return Number.NaN;
    }

    if (line.x1 === line.x2) {
      return x === line.x1 ? line.y1 : Number.NaN;
    }

    const slope = (line.y2 - line.y1) / (line.x2 - line.x1);
    return line.y1 + slope * (x - line.x1);
  }

  private getMethodBuiltinName(methodName: string, receiver: unknown): string {
    if (isPineMatrix(receiver)) {
      return `matrix.${methodName}`;
    }
    if (isPineMap(receiver)) {
      return `map.${methodName}`;
    }

    switch (methodName) {
      case 'size':
      case 'get':
      case 'set':
      case 'push':
      case 'pop':
      case 'shift':
      case 'unshift':
      case 'copy':
      case 'first':
      case 'last':
      case 'includes':
      case 'every':
      case 'some':
      case 'indexof':
      case 'lastindexof':
      case 'binary_search':
      case 'binary_search_leftmost':
      case 'binary_search_rightmost':
      case 'insert':
      case 'remove':
      case 'sort':
      case 'sort_indices':
      case 'reverse':
      case 'join':
      case 'concat':
      case 'slice':
      case 'abs':
      case 'min':
      case 'max':
      case 'sum':
      case 'avg':
      case 'range':
      case 'median':
      case 'mode':
      case 'variance':
      case 'stdev':
      case 'covariance':
      case 'percentile_nearest_rank':
      case 'percentile_linear_interpolation':
      case 'percentrank':
      case 'standardize':
      case 'fill':
      case 'clear':
        return `array.${methodName}`;
      default:
        return `array.${methodName}`;
    }
  }

  private canCallUserFunction(fn: FunctionDeclaration, args: unknown[], namedArgs: Map<string, unknown>): boolean {
    if (args.length > fn.params.length) return false;

    const paramNames = new Set(fn.params.map((param) => param.name));
    for (const argName of namedArgs.keys()) {
      if (!paramNames.has(argName)) return false;
    }

    const noDuplicateBindings = fn.params.every((param, index) => {
      const hasPositionalValue = index < args.length;
      return !(hasPositionalValue && namedArgs.has(param.name));
    });
    if (!noDuplicateBindings) return false;

    return fn.params.every((param, index) => {
      const hasValue = index < args.length || namedArgs.has(param.name);
      return hasValue || param.defaultValue;
    });
  }

  private evaluateUserFunction(
    fn: FunctionDeclaration,
    args: unknown[],
    namedArgs: Map<string, unknown>,
    displayName = `function ${fn.name.name}`,
    scopeKey = this.userCallableScopeKey(fn),
    recursionKey = scopeKey,
  ): unknown {
    const recursiveIndex = this.userFunctionCallStack.indexOf(recursionKey);
    if (recursiveIndex !== -1) {
      const cycle = [...this.userFunctionCallStack.slice(recursiveIndex), recursionKey].join(' -> ');
      throw new Error(`Recursive user function calls are not supported: ${cycle}`);
    }

    if (args.length > fn.params.length) {
      throw new Error(
        `Too many arguments for ${displayName}: expected ${fn.params.length}, got ${args.length}`,
      );
    }

    const paramNames = new Set(fn.params.map((param) => param.name));
    for (const argName of namedArgs.keys()) {
      if (!paramNames.has(argName)) {
        throw new Error(`Unknown argument '${argName}' for ${displayName}`);
      }
    }

    const parameterValues = fn.params.map((param, index) => {
      const paramName = param.name;
      if (namedArgs.has(paramName)) {
        if (index < args.length) {
          throw new Error(
            `Argument '${paramName}' for ${displayName} was supplied multiple times`,
          );
        }
        return namedArgs.get(paramName);
      }
      if (index < args.length) {
        return args[index];
      }
      if (param.defaultValue) {
        return this.evaluateExpression(param.defaultValue);
      }
      return undefined;
    });

    const savedScope = this.scope;
    const functionScope = this.functionScopes.get(scopeKey) ?? this.scope.createChild();
    this.scope = functionScope;
    this.userFunctionCallStack.push(recursionKey);

    try {
      for (let i = 0; i < fn.params.length; i++) {
        const paramName = fn.params[i].name;
        const value = parameterValues[i];
        this.scope.declare(paramName, 'none', value);
      }

      if (Array.isArray(fn.body)) {
        let result: unknown = undefined;
        for (const stmt of fn.body) {
          const statementResult = this.executeFunctionStatement(stmt);
          if (statementResult.hasResult) {
            result = statementResult.value;
          }
        }
        return result;
      }

      return this.evaluateExpression(fn.body);
    } finally {
      this.userFunctionCallStack.pop();
      this.scope = savedScope;
    }
  }

  private executeFunctionStatement(stmt: Statement): { hasResult: boolean; value?: unknown } {
    this.profileStatements += 1;

    if (stmt.type === 'ExpressionStatement') {
      return { hasResult: true, value: this.evaluateExpression(stmt.expression) };
    }

    if (stmt.type === 'IfStatement') {
      return this.executeFunctionIf(stmt);
    }

    if (stmt.type === 'ForStatement') {
      return this.executeFunctionFor(stmt);
    }

    if (stmt.type === 'WhileStatement') {
      return this.executeFunctionWhile(stmt);
    }

    this.executeStatementInternal(stmt, false);
    return { hasResult: false };
  }

  private executeFunctionFor(stmt: ForStatement): { hasResult: boolean; value?: unknown } {
    if (stmt.kind === 'collection') {
      return this.executeFunctionForIn(stmt);
    }

    const start = this.evaluateExpression(stmt.start) as number;
    const end = this.evaluateExpression(stmt.end) as number;
    const step = stmt.step ? (this.evaluateExpression(stmt.step) as number) : 1;
    if (step === 0) {
      throw new Error('For loop step cannot be zero');
    }

    const childScope = this.scope.createChild();
    const savedScope = this.scope;
    this.scope = childScope;

    let iterations = 0;
    let result: { hasResult: boolean; value?: unknown } = { hasResult: false };

    try {
      for (let i = start; step > 0 ? i <= end : i >= end; i += step) {
        if (++iterations > TealscriptEngine.MAX_LOOP_ITERATIONS) {
          throw new Error('Maximum loop iterations exceeded');
        }

        this.scope.declare(stmt.counter.name, 'none', i);

        try {
          const statementResult = this.executeFunctionLoopBody(stmt.body);
          if (statementResult.hasResult) {
            result = statementResult;
          }
        } catch (e) {
          if (e instanceof BreakException) break;
          if (e instanceof ContinueException) continue;
          throw e;
        }
      }
      return result;
    } finally {
      this.scope = savedScope;
    }
  }

  private executeFunctionForIn(
    stmt: Extract<ForStatement, { kind: 'collection' }>,
  ): { hasResult: boolean; value?: unknown } {
    const iterable = this.evaluateExpression(stmt.iterable);
    let values: unknown[];
    let keys: unknown[] | null = null;

    if (Array.isArray(iterable)) {
      values = iterable;
    } else if (isPineArray(iterable)) {
      values = Array.from({ length: getArraySize(iterable) }, (_, index) => getArrayValue(iterable, index));
    } else if (isPineMap(iterable)) {
      const entries = mapEntries(iterable);
      keys = entries.map(([key]) => key);
      values = entries.map(([, value]) => value);
    } else if (isPineMatrix(iterable)) {
      values = Array.from({ length: iterable.rows }, (_, row) => matrixRow(iterable, row));
    } else {
      throw new Error('For-in loop expects an array, map, or matrix');
    }

    const childScope = this.scope.createChild();
    const savedScope = this.scope;
    this.scope = childScope;

    let iterations = 0;
    let result: { hasResult: boolean; value?: unknown } = { hasResult: false };

    try {
      for (let index = 0; index < values.length; index++) {
        if (++iterations > TealscriptEngine.MAX_LOOP_ITERATIONS) {
          throw new Error('Maximum loop iterations exceeded');
        }

        const value = values[index];
        if (stmt.indexCounter) {
          this.scope.declare(stmt.indexCounter.name, 'none', keys ? keys[index] : index);
        }
        this.scope.declare(stmt.counter.name, 'none', value);

        try {
          const statementResult = this.executeFunctionLoopBody(stmt.body);
          if (statementResult.hasResult) {
            result = statementResult;
          }
        } catch (e) {
          if (e instanceof BreakException) break;
          if (e instanceof ContinueException) continue;
          throw e;
        }
      }
      return result;
    } finally {
      this.scope = savedScope;
    }
  }

  private executeFunctionWhile(stmt: WhileStatement): { hasResult: boolean; value?: unknown } {
    const childScope = this.scope.createChild();
    const savedScope = this.scope;
    this.scope = childScope;

    let iterations = 0;
    let result: { hasResult: boolean; value?: unknown } = { hasResult: false };

    try {
      while (this.isTruthy(this.evaluateExpression(stmt.test))) {
        if (++iterations > TealscriptEngine.MAX_LOOP_ITERATIONS) {
          throw new Error('Maximum loop iterations exceeded');
        }

        try {
          const statementResult = this.executeFunctionLoopBody(stmt.body);
          if (statementResult.hasResult) {
            result = statementResult;
          }
        } catch (e) {
          if (e instanceof BreakException) break;
          if (e instanceof ContinueException) continue;
          throw e;
        }
      }
      return result;
    } finally {
      this.scope = savedScope;
    }
  }

  private executeFunctionLoopBody(statements: Statement[]): { hasResult: boolean; value?: unknown } {
    let result: { hasResult: boolean; value?: unknown } = { hasResult: false };
    for (const statement of statements) {
      const statementResult = this.executeFunctionStatement(statement);
      if (statementResult.hasResult) {
        result = statementResult;
      }
    }
    return result;
  }

  private executeFunctionStatements(statements: Statement[]): { hasResult: boolean; value?: unknown } {
    const childScope = this.scope.createChild();
    const savedScope = this.scope;
    this.scope = childScope;

    try {
      let result: { hasResult: boolean; value?: unknown } = { hasResult: false };
      for (const statement of statements) {
        const statementResult = this.executeFunctionStatement(statement);
        if (statementResult.hasResult) {
          result = statementResult;
        }
      }
      return result;
    } finally {
      this.scope = savedScope;
    }
  }

  private executeFunctionIf(stmt: IfStatement): { hasResult: boolean; value?: unknown } {
    const condition = this.evaluateExpression(stmt.test);

    if (this.isTruthy(condition)) {
      return this.executeFunctionStatements(stmt.consequent);
    }

    if (!stmt.alternate) {
      return { hasResult: false };
    }

    if (Array.isArray(stmt.alternate)) {
      return this.executeFunctionStatements(stmt.alternate);
    }

    return this.executeFunctionIf(stmt.alternate);
  }

  private evaluateMember(expr: MemberExpression): unknown {
    // Handle namespace.constant patterns (e.g., color.red)
    const memberPath = this.getMemberPath(expr);
    if (memberPath) {
      const namespace = memberPath.slice(0, -1).join('.');
      const prop = memberPath[memberPath.length - 1]!;
      const fullName = `${namespace}.${prop}`;

      if (namespace === 'barstate' && prop in this.ctx.barstate) {
        return this.ctx.barstate[prop as keyof typeof this.ctx.barstate];
      }
      if (namespace === 'syminfo') {
        return this.evaluateSyminfo(prop);
      }
      if (namespace === 'timeframe') {
        return this.evaluateTimeframe(prop);
      }
      if (namespace === 'strategy') {
        return this.evaluateStrategy(prop);
      }
      const importedLibrary = this.importedLibraries.get(namespace);
      if (importedLibrary?.constants.has(prop)) {
        return importedLibrary.constants.get(prop);
      }
      if (memberPath.length === 3) {
        const [alias, enumName, fieldName] = memberPath;
        const enumValues = alias && enumName ? this.importedLibraries.get(alias)?.enums.get(enumName) : undefined;
        if (fieldName && enumValues?.has(fieldName)) {
          return enumValues.get(fieldName);
        }
      }

      // Check builtins
      const builtin = this.builtins.get(fullName);
      if (builtin) {
        // It's a constant, call with no args
        return builtin([], new Map(), this.ctx, this.scope, fullName);
      }

      if (this.scope.has(namespace)) {
        const value = this.scope.get(namespace);
        if (this.isChartPoint(value) && (prop === 'time' || prop === 'index' || prop === 'price')) {
          return value[prop] ?? Number.NaN;
        }
        if (isPineUdtObject(value)) {
          return getUdtField(value, prop);
        }
      }
    }

    const object = this.evaluateExpression(expr.object);
    if (isPineUdtObject(object)) {
      return getUdtField(object, expr.property.name);
    }

    throw new Error('Member access not supported except for namespaced constants and user-defined type fields');
  }

  private getMemberPath(expr: MemberExpression): string[] | null {
    if (expr.object.type === 'Identifier') {
      return [expr.object.name, expr.property.name];
    }
    if (expr.object.type === 'MemberExpression') {
      const parent = this.getMemberPath(expr.object);
      return parent ? [...parent, expr.property.name] : null;
    }
    return null;
  }

  private isChartPoint(value: unknown): value is ChartPoint {
    return (
      typeof value === 'object'
      && value !== null
      && (value as { type?: unknown }).type === 'chart.point'
    );
  }

  private evaluateSyminfo(prop: string): unknown {
    switch (prop) {
      case 'ticker':
      case 'description':
      case 'type':
      case 'currency':
      case 'basecurrency':
      case 'mintick':
      case 'pricescale':
      case 'timezone':
        return this.ctx.syminfo[prop];
      case 'tickerid':
      case 'main_tickerid':
        return this.ctx.syminfo.ticker;
      case 'root':
        return this.ctx.syminfo.basecurrency;
      case 'prefix':
        return '';
      case 'session':
        return 'regular';
      case 'minmove':
        return this.ctx.syminfo.mintick * this.ctx.syminfo.pricescale;
      default:
        throw new Error(`Unknown syminfo property: ${prop}`);
    }
  }

  private evaluateTimeframe(prop: string): unknown {
    switch (prop) {
      case 'period':
      case 'multiplier':
      case 'isminutes':
      case 'isdaily':
      case 'isweekly':
      case 'ismonthly':
      case 'isintraday':
      case 'isseconds':
      case 'isticks':
        return this.ctx.timeframe[prop];
      case 'main_period':
        return this.ctx.timeframe.period;
      case 'isdwm':
        return this.ctx.timeframe.isdaily || this.ctx.timeframe.isweekly || this.ctx.timeframe.ismonthly;
      default:
        throw new Error(`Unknown timeframe property: ${prop}`);
    }
  }

  private evaluateStrategy(prop: string): unknown {
    const ledger = this.ctx.strategyLedger;
    switch (prop) {
      case 'long':
        return 'long';
      case 'short':
        return 'short';
      case 'fixed':
        return 'fixed';
      case 'cash':
        return 'cash';
      case 'percent_of_equity':
        return 'percent_of_equity';
      case 'equity':
        return ledger.equity;
      case 'initial_capital':
        return ledger.initialCapital;
      case 'netprofit':
        return ledger.netProfit;
      case 'grossprofit':
        return ledger.grossProfit;
      case 'grossloss':
        return ledger.grossLoss;
      case 'openprofit':
        return ledger.position.openProfit;
      case 'position_size':
        return ledger.position.size;
      case 'position_avg_price':
        return ledger.position.avgPrice ?? Number.NaN;
      case 'opentrades':
        return ledger.openTrades.length;
      case 'closedtrades':
        return ledger.closedTrades.length;
      case 'wintrades':
        return ledger.closedTrades.filter((trade) => trade.profit > 0).length;
      case 'losstrades':
        return ledger.closedTrades.filter((trade) => trade.profit < 0).length;
      case 'eventrades':
        return ledger.closedTrades.filter((trade) => trade.profit === 0).length;
      case 'max_runup':
        return ledger.maxRunup;
      case 'max_drawdown':
        return ledger.maxDrawdown;
      default:
        throw new Error(`Unknown strategy property: ${prop}`);
    }
  }

  private evaluateIndex(expr: IndexExpression): unknown {
    const offset = this.normalizeIndexOffset(this.evaluateExpression(expr.index));
    if (offset === null) {
      return Number.NaN;
    }

    if (expr.object.type === 'Identifier') {
      const name = expr.object.name;
      if (this.scope.has(name)) {
        const value = this.scope.get(name);
        if (Array.isArray(value) || isPineArray(value)) {
          return this.naIfMissing(this.readArrayElement(value, offset));
        }
      }

      switch (name) {
        case 'open':
          this.checkHistoryOffset(offset);
          return this.naIfMissing(this.ctx.open.get(offset));
        case 'high':
          this.checkHistoryOffset(offset);
          return this.naIfMissing(this.ctx.high.get(offset));
        case 'low':
          this.checkHistoryOffset(offset);
          return this.naIfMissing(this.ctx.low.get(offset));
        case 'close':
          this.checkHistoryOffset(offset);
          return this.naIfMissing(this.ctx.close.get(offset));
        case 'volume':
          this.checkHistoryOffset(offset);
          return this.naIfMissing(this.ctx.volume.get(offset));
        case 'time':
          this.checkHistoryOffset(offset);
          return this.naIfMissing(this.ctx.time.get(offset));
        case 'time_tradingday':
          this.checkHistoryOffset(offset);
          return this.naIfMissing(this.getTradingDayTime(this.ctx.time.get(offset), this.ctx.syminfo.timezone));
        case 'timenow':
          this.checkHistoryOffset(offset);
          return this.naIfMissing(this.ctx.timenow.get(offset));
        case 'time_close': {
          this.checkHistoryOffset(offset);
          const openTime = this.ctx.time.get(offset);
          return openTime === undefined ? Number.NaN : this.naIfMissing(this.getBarCloseTime(openTime, this.ctx.timeframe.period));
        }
        case 'last_bar_time':
          this.checkHistoryOffset(offset);
          return offset > this.ctx.bar_index ? Number.NaN : this.naIfMissing(this.ctx.getBar(this.ctx.last_bar_index)?.time);
        case 'hl2':
          this.checkHistoryOffset(offset);
          return this.naIfMissing(this.getHl2(offset));
        case 'hlc3':
          this.checkHistoryOffset(offset);
          return this.naIfMissing(this.getHlc3(offset));
        case 'ohlc4':
          this.checkHistoryOffset(offset);
          return this.naIfMissing(this.getOhlc4(offset));
        case 'ta.obv':
          this.checkHistoryOffset(offset);
          this.updateObv(this.ctx.close.get(0)!, this.ctx.close.get(1), this.ctx.volume.get(0)!, this.scope, '_ta_obv_value');
          return this.naIfMissing(this.scope.getWithOffset('_ta_obv_value', offset));
        case 'ta.tr':
          this.checkHistoryOffset(offset);
          return this.naIfMissing(this.trueRange(offset, false));
      }

      if (this.scope.has(name)) {
        this.checkHistoryOffset(offset);
        return this.naIfMissing(this.scope.getWithOffset(name, offset));
      }

      throw new Error(`Unknown identifier: ${name}`);
    }

    // Array index access
    const obj = this.evaluateExpression(expr.object);
    if (Array.isArray(obj) || isPineArray(obj)) {
      return this.naIfMissing(this.readArrayElement(obj, offset));
    }

    this.checkHistoryOffset(offset);
    return this.naIfMissing(this.readExpressionHistory(expr.object, obj, offset));
  }

  private checkHistoryOffset(offset: number): void {
    this.inferredMaxBarsBack = Math.max(this.inferredMaxBarsBack, offset);
    const maxBarsBack = this.ctx.indicatorMaxBarsBack;
    if (maxBarsBack !== undefined && offset > maxBarsBack) {
      throw new Error(`History reference [${offset}] exceeds indicator max_bars_back ${maxBarsBack}`);
    }
  }

  private readExpressionHistory(expression: Expression, currentValue: unknown, offset: number): unknown {
    let entry = this.expressionHistory.get(expression);
    if (!entry) {
      entry = { barIndex: -1, values: [] };
      this.expressionHistory.set(expression, entry);
    }

    entry.barIndex = this.ctx.bar_index;
    entry.values[this.ctx.bar_index] = currentValue;

    const targetIndex = this.ctx.bar_index - offset;
    return targetIndex < 0 ? undefined : entry.values[targetIndex];
  }

  private getHl2(offset: number): number {
    const high = this.ctx.high.get(offset);
    const low = this.ctx.low.get(offset);
    return high === undefined || low === undefined ? Number.NaN : (high + low) / 2;
  }

  private getHlc3(offset: number): number {
    const high = this.ctx.high.get(offset);
    const low = this.ctx.low.get(offset);
    const close = this.ctx.close.get(offset);
    return high === undefined || low === undefined || close === undefined ? Number.NaN : (high + low + close) / 3;
  }

  private getOhlc4(offset: number): number {
    const open = this.ctx.open.get(offset);
    const high = this.ctx.high.get(offset);
    const low = this.ctx.low.get(offset);
    const close = this.ctx.close.get(offset);
    return open === undefined || high === undefined || low === undefined || close === undefined
      ? Number.NaN
      : (open + high + low + close) / 4;
  }

  private currentTrueRange(handleNa: boolean): number {
    return this.trueRange(0, handleNa);
  }

  private trueRange(offset: number, handleNa: boolean): number {
    const high = this.ctx.high.get(offset);
    const low = this.ctx.low.get(offset);
    const prevClose = this.ctx.close.get(offset + 1);
    if (high === undefined || low === undefined || Number.isNaN(high) || Number.isNaN(low)) return Number.NaN;
    if (prevClose === undefined || Number.isNaN(prevClose)) {
      return handleNa ? high - low : Number.NaN;
    }
    return Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose));
  }

  private updateObv(source: number, previousSource: number | undefined, volume: number, scope: Scope, key: string): number {
    const barKey = `${key}_bar_index`;
    const existing = scope.get(key) as number | undefined;
    if (scope.get(barKey) === this.ctx.bar_index && existing !== undefined) {
      return existing;
    }

    let obv = (scope.get(key) as number) ?? 0;
    if (previousSource !== undefined) {
      if (source > previousSource) {
        obv += volume;
      } else if (source < previousSource) {
        obv -= volume;
      }
    }
    this.setBuiltinState(scope, key, obv);
    this.setBuiltinState(scope, barKey, this.ctx.bar_index);
    return obv;
  }

  private readArrayElement(array: unknown, index: number): unknown {
    if (isPineArray(array)) {
      return getArrayValue(array, index);
    }
    if (Array.isArray(array)) {
      return array[index];
    }
    throw new Error('Index access on non-array/non-series');
  }

  private writeArrayElement(array: unknown, index: number, value: unknown): void {
    if (isPineArray(array)) {
      setArrayValue(array, index, value);
      return;
    }
    if (Array.isArray(array)) {
      if (index < 0 || index >= array.length) {
        throw new Error(`Array index ${index} is out of bounds. Array size is ${array.length}`);
      }
      array[index] = value;
      return;
    }
    throw new Error('Index assignment expects an array');
  }

  // ===========================================================================
  // Helpers
  // ===========================================================================

  private isTruthy(value: unknown): boolean {
    if (this.isNa(value)) return false;
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value !== 0;
    if (typeof value === 'string') return value.length > 0;
    return !!value;
  }

  private isNa(value: unknown): boolean {
    return typeof value === 'number' && isNaN(value);
  }

  private isComparisonOperator(operator: string): boolean {
    return (
      operator === '==' ||
      operator === '!=' ||
      operator === '<' ||
      operator === '>' ||
      operator === '<=' ||
      operator === '>='
    );
  }

  private normalizeIndexOffset(value: unknown): number | null {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      return null;
    }

    const offset = Math.trunc(value);
    return offset < 0 ? null : offset;
  }

  private naIfMissing(value: unknown): unknown {
    return value === undefined ? Number.NaN : value;
  }

  private toPlotValue(value: unknown): number | null {
    if (value === null || value === undefined || this.isNa(value)) {
      return null;
    }
    return value as number;
  }

  private toPlotColor(value: unknown): string | null {
    if (value === null || value === undefined || this.isNa(value)) {
      return null;
    }
    return String(value);
  }

  private setOhlcPlotBar(
    plot: PlotOutput | undefined,
    barIndex: number,
    open: number | null,
    high: number | null,
    low: number | null,
    close: number | null,
    color: string | null,
    wickColor?: string | null,
    borderColor?: string | null,
  ): void {
    if (!plot) return;

    const hasGap = open === null || high === null || low === null || close === null;
    const normalizedOpen = hasGap ? null : open;
    const normalizedHigh = hasGap ? null : high;
    const normalizedLow = hasGap ? null : low;
    const normalizedClose = hasGap ? null : close;
    const normalizedColor = hasGap ? null : color;

    const setAtBar = <T>(values: T[] | undefined, value: T): void => {
      if (!values) return;
      while (values.length < barIndex) {
        values.push(null as T);
      }
      values[barIndex] = value;
    };

    setAtBar(plot.openValues, normalizedOpen);
    setAtBar(plot.highValues, normalizedHigh);
    setAtBar(plot.lowValues, normalizedLow);
    setAtBar(plot.closeValues, normalizedClose);
    setAtBar(plot.values, normalizedClose);
    if (Array.isArray(plot.color)) {
      setAtBar(plot.color, normalizedColor);
    }
    if (Array.isArray(plot.wickColor)) {
      setAtBar(plot.wickColor, hasGap ? null : (wickColor ?? normalizedColor));
    }
    if (Array.isArray(plot.borderColor)) {
      setAtBar(plot.borderColor, hasGap ? null : (borderColor ?? normalizedColor));
    }
  }

  private setPlotColorValue(plot: PlotOutput | undefined, barIndex: number, color: string | null, value: number | null): void {
    if (!plot || barIndex < 0) return;

    while (plot.values.length < barIndex) {
      plot.values.push(null);
    }
    plot.values[barIndex] = value;

    if (Array.isArray(plot.color)) {
      while (plot.color.length < barIndex) {
        plot.color.push(null);
      }
      plot.color[barIndex] = color;
    }
  }

  private toStringValue(value: unknown, format?: string): string {
    if (value === null || value === undefined || this.isNa(value)) {
      return 'NaN';
    }
    if (typeof value === 'number') {
      if (format) {
        return this.formatNumber(value, format);
      }
      return String(value);
    }
    return String(value);
  }

  private replaceStringOccurrence(source: string, target: string, replacement: string, occurrenceArg: unknown): string {
    const occurrence = occurrenceArg === undefined ? 0 : Math.trunc(this.toNumber(occurrenceArg));
    if (!Number.isFinite(occurrence) || occurrence < 0) return source;
    if (target === '') return occurrence === 0 ? source.replace(target, replacement) : source;
    if (occurrence === 0) return source.replace(target, replacement);

    let fromIndex = 0;
    for (let index = 0; index <= occurrence; index++) {
      const matchIndex = source.indexOf(target, fromIndex);
      if (matchIndex === -1) return source;
      if (index === occurrence) {
        return source.slice(0, matchIndex) + replacement + source.slice(matchIndex + target.length);
      }
      fromIndex = matchIndex + target.length;
    }
    return source;
  }

  private toOptionalString(value: unknown): string | undefined {
    if (value === null || value === undefined || this.isNa(value)) {
      return undefined;
    }
    return String(value);
  }

  private getCallArg(args: unknown[], namedArgs: Map<string, unknown>, index: number, name: string, fallback?: unknown): unknown {
    return namedArgs.has(name) ? namedArgs.get(name) : args[index] !== undefined ? args[index] : fallback;
  }

  private getOrderedCallArg(
    args: unknown[],
    namedArgs: Map<string, unknown>,
    names: readonly string[],
    index: number,
    fallback?: unknown,
  ): unknown {
    const name = names[index];
    const positionalIndex = index - names.slice(0, index).filter((priorName) => namedArgs.has(priorName)).length;
    return name && namedArgs.has(name)
      ? namedArgs.get(name)
      : args[positionalIndex] !== undefined
        ? args[positionalIndex]
        : fallback;
  }

  private getCallArgAny(
    args: unknown[],
    namedArgs: Map<string, unknown>,
    index: number,
    names: string[],
    fallback?: unknown,
    label = names.join('/'),
  ): unknown {
    const matches = names.filter((name) => namedArgs.has(name));
    if (matches.length > 1) {
      throw new Error(`Argument ${label} was supplied multiple times: ${matches.join(', ')}`);
    }
    if (matches.length === 1) {
      return namedArgs.get(matches[0]);
    }
    return args[index] !== undefined ? args[index] : fallback;
  }

  private getTaSourceLengthArgs(
    args: unknown[],
    namedArgs: Map<string, unknown>,
    ctx: ExecutionContext,
    defaultSource: 'high' | 'low',
  ): [number, number] {
    if (!namedArgs.has('source') && !namedArgs.has('length') && args.length === 1) {
      return [this.getCurrentSeriesValue(ctx, defaultSource), this.normalizeLookbackLength(args[0])];
    }

    const source = this.toNumber(this.getCallArg(args, namedArgs, 0, 'source', this.getCurrentSeriesValue(ctx, defaultSource)));
    const length = this.normalizeLookbackLength(this.getCallArg(args, namedArgs, 1, 'length'));
    return [source, length];
  }

  private getCurrentSeriesValue(ctx: ExecutionContext, source: 'high' | 'low'): number {
    return source === 'high' ? (ctx.high.get(0) ?? NaN) : (ctx.low.get(0) ?? NaN);
  }

  private toOptionalNumber(value: unknown): number | undefined {
    if (value === undefined || value === null || this.isNa(value)) return undefined;
    const numberValue = this.toNumber(value);
    return Number.isFinite(numberValue) ? numberValue : undefined;
  }

  private toOptionalInteger(value: unknown): number | undefined {
    const numberValue = this.toOptionalNumber(value);
    return numberValue === undefined ? undefined : Math.trunc(numberValue);
  }

  private toOptionalBoolean(value: unknown): boolean | undefined {
    if (value === undefined || value === null || this.isNa(value)) return undefined;
    return this.isTruthy(value);
  }

  private formatNumber(value: number, format: string): string {
    const decimalMatch = format.match(/\.([0#]+)/);
    if (decimalMatch) {
      return value.toFixed(decimalMatch[1].length);
    }
    if (/^[#0,]+$/.test(format)) {
      return Math.round(value).toString();
    }
    return String(value);
  }

  private clampNumber(value: unknown, min: number, max: number): number {
    const numericValue = typeof value === 'number' ? value : Number(value ?? 0);
    if (!Number.isFinite(numericValue)) return min;
    return Math.min(max, Math.max(min, Math.round(numericValue)));
  }

  private transparencyToAlpha(transparency: unknown): number {
    const normalizedTransparency = this.clampNumber(transparency ?? 0, 0, 100);
    return this.clampNumber(((100 - normalizedTransparency) / 100) * 255, 0, 255);
  }

  private alphaToTransparency(alpha: number): number {
    return this.clampNumber(100 - (alpha / 255) * 100, 0, 100);
  }

  private formatColor(red: unknown, green: unknown, blue: unknown, transparency: unknown = 0): string {
    const channels = [red, green, blue, this.transparencyToAlpha(transparency)];
    return `#${channels.map((channel) => this.clampNumber(channel, 0, 255).toString(16).padStart(2, '0').toUpperCase()).join('')}`;
  }

  private formatTimestamp(timestamp: unknown, format: string, timezone: string): string {
    const value = this.toNumber(timestamp);
    if (!Number.isFinite(value)) return 'NaN';

    const offsetMinutes = this.getTimezoneOffsetMinutes(timezone, value);
    const offsetMs = offsetMinutes * 60_000;
    const date = new Date(value + offsetMs);
    const pad = (part: number, length = 2): string => String(part).padStart(length, '0');
    const formatOffset = (): string => {
      const sign = offsetMinutes >= 0 ? '+' : '-';
      const absolute = Math.abs(offsetMinutes);
      return `${sign}${pad(Math.trunc(absolute / 60))}${pad(absolute % 60)}`;
    };
    const tokens: Array<[string, string]> = [
      ['yyyy', String(date.getUTCFullYear())],
      ['yy', pad(date.getUTCFullYear() % 100)],
      ['MM', pad(date.getUTCMonth() + 1)],
      ['M', String(date.getUTCMonth() + 1)],
      ['dd', pad(date.getUTCDate())],
      ['d', String(date.getUTCDate())],
      ['HH', pad(date.getUTCHours())],
      ['H', String(date.getUTCHours())],
      ['mm', pad(date.getUTCMinutes())],
      ['m', String(date.getUTCMinutes())],
      ['ss', pad(date.getUTCSeconds())],
      ['s', String(date.getUTCSeconds())],
      ['SSS', pad(date.getUTCMilliseconds(), 3)],
      ['Z', formatOffset()],
    ];

    let result = '';
    for (let index = 0; index < format.length;) {
      if (format[index] === "'") {
        index += 1;
        while (index < format.length) {
          if (format[index] === "'") {
            if (format[index + 1] === "'") {
              result += "'";
              index += 2;
              continue;
            }
            index += 1;
            break;
          }
          result += format[index];
          index += 1;
        }
        continue;
      }

      const token = tokens.find(([candidate]) => format.startsWith(candidate, index));
      if (token) {
        result += token[1];
        index += token[0].length;
      } else {
        result += format[index];
        index += 1;
      }
    }
    return result;
  }

  private parseColor(value: unknown): { red: number; green: number; blue: number; alpha: number } | null {
    if (typeof value !== 'string') return null;

    const match = value.match(/^#([0-9a-fA-F]{6})([0-9a-fA-F]{2})?$/);
    if (!match) return null;

    const hex = match[1];
    return {
      red: parseInt(hex.slice(0, 2), 16),
      green: parseInt(hex.slice(2, 4), 16),
      blue: parseInt(hex.slice(4, 6), 16),
      alpha: match[2] ? parseInt(match[2], 16) : 255,
    };
  }

  private isFiniteNumber(value: unknown): value is number {
    return typeof value === 'number' && Number.isFinite(value);
  }

  private toNumber(value: unknown): number {
    if (typeof value === 'number') return value;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : Number.NaN;
  }

  private toNullableNumber(value: unknown): number | null {
    const numberValue = this.toNumber(value);
    return Number.isFinite(numberValue) ? numberValue : null;
  }

  private parsePineStringNumber(source: string): number {
    const trimmed = source.trim();
    if (trimmed.length === 0) return Number.NaN;
    if (!/^[+-]?(?:(?:\d+(?:\.\d*)?)|(?:\.\d+))(?:[eE][+-]?\d+)?$/.test(trimmed)) {
      return Number.NaN;
    }

    const value = Number(trimmed);
    return Number.isFinite(value) ? value : Number.NaN;
  }

  private roundToMintick(value: number, tick: number): number {
    if (!Number.isFinite(value) || !Number.isFinite(tick) || tick <= 0) return Number.NaN;

    const quotient = value / tick;
    const epsilon = Number.EPSILON * Math.max(1, Math.abs(quotient));
    const rounded = Math.round(quotient + epsilon) * tick;
    const decimals = this.decimalPlacesForTick(tick);
    return Number(rounded.toFixed(decimals));
  }

  private decimalPlacesForTick(tick: number): number {
    const text = tick.toString().toLowerCase();
    if (text.includes('e-')) {
      return Math.min(12, Math.max(0, Number(text.split('e-')[1]) || 0));
    }

    const fraction = text.split('.')[1] ?? '';
    return Math.min(12, fraction.replace(/0+$/, '').length);
  }

  private toNullableColor(value: unknown): string | null {
    return typeof value === 'string' ? value : null;
  }

  private setBuiltinState(scope: Scope, key: string, value: unknown): void {
    if (scope.has(key)) {
      scope.set(key, value);
    } else {
      scope.declare(key, 'var', value);
    }
  }

  private normalizeLookbackLength(value: unknown): number {
    return typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.trunc(value)) : 0;
  }

  private updateBuiltinSourceHistory(scope: Scope, key: string, source: number, keep: number): number[] {
    const history = (scope.get(key) as number[] | undefined) ?? [];
    this.prependBoundedHistory(history, source, keep);
    this.setBuiltinState(scope, key, history);
    return history;
  }

  private getCompleteSourceWindow(scope: Scope, key: string, source: number, length: number): number[] | null {
    if (isNaN(source) || length < 1) return null;
    const maxLengthKey = `${key}_max_length`;
    const previousMaxLength = scope.get(maxLengthKey) as number | undefined;
    const maxLength = Math.max(length, previousMaxLength ?? 0);
    this.setBuiltinState(scope, maxLengthKey, maxLength);

    const keep = Math.min(
      Math.max(maxLength, this.ctx.bar_index + 1),
      TealscriptEngine.MAX_BUILTIN_SOURCE_HISTORY,
    );
    const values = this.updateBuiltinSourceHistory(scope, key, source, keep);
    const window = values.slice(0, length);
    if (window.length < length || window.some((value) => isNaN(value))) return null;
    return window;
  }

  private getAvailableSourceWindow(scope: Scope, key: string, source: number, length: number): number[] {
    if (isNaN(source) || length < 1) return [];
    const values = this.updateBuiltinSourceHistory(scope, key, source, length);
    return values.slice(0, length).filter((value) => !isNaN(value));
  }

  private getCompleteNonNaSourceWindow(scope: Scope, key: string, source: number, length: number): number[] | null {
    if (length < 1) return null;
    const history = (scope.get(key) as number[] | undefined) ?? [];
    if (!isNaN(source)) {
      this.prependBoundedHistory(history, source, length);
    } else if (history.length > length) {
      history.length = length;
    }
    this.setBuiltinState(scope, key, history);
    return history.length < length ? null : history;
  }

  private prependBoundedHistory<T>(history: T[], source: T, keep: number): void {
    const truncatedLimit = Math.trunc(keep);
    const limit = Number.isFinite(truncatedLimit) ? Math.max(0, truncatedLimit) : 0;
    if (limit === 0) {
      history.length = 0;
      return;
    }

    history.unshift(source);
    if (history.length > limit) {
      history.length = limit;
    }
  }

  private updateBuiltinEmaState(scope: Scope, key: string, value: number, length: number): number {
    const alpha = 2 / (length + 1);
    const previous = scope.get(key) as number | undefined;
    const next = previous === undefined || isNaN(previous) ? value : alpha * value + (1 - alpha) * previous;
    this.setBuiltinState(scope, key, next);
    return next;
  }

  private calculateKeltnerChannel(
    scope: Scope,
    callId: string,
    source: number,
    length: number,
    multiplier: number,
    useTrueRange: boolean,
  ): [number, number, number] {
    const high = this.ctx.high.get(0);
    const low = this.ctx.low.get(0);
    if (
      length < 1
      || isNaN(source)
      || !Number.isFinite(multiplier)
      || high === undefined
      || low === undefined
      || isNaN(high)
      || isNaN(low)
    ) {
      return [NaN, NaN, NaN];
    }

    const previousClose = this.ctx.close.get(1);
    const trueRange = previousClose === undefined || isNaN(previousClose)
      ? high - low
      : Math.max(high - low, Math.abs(high - previousClose), Math.abs(low - previousClose));
    const span = useTrueRange ? trueRange : high - low;
    const baseKey = `_ta_kc_${callId}_${length}_${multiplier}_${useTrueRange ? 'tr' : 'hl'}`;
    const basis = this.updateBuiltinEmaState(scope, `${baseKey}_basis`, source, length);
    const range = this.updateBuiltinEmaState(scope, `${baseKey}_range`, span, length);

    return [basis, basis + range * multiplier, basis - range * multiplier];
  }

  private nextSeededRandom(scope: Scope, key: string, seed: number): number {
    const state = scope.get(key) as RandomBuiltinState | undefined;
    const current = state?.seed === seed ? state.state : this.hashRandomSeed(seed);
    const nextState = (current + 0x6d2b79f5) >>> 0;
    let value = nextState;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    this.setBuiltinState(scope, key, { seed, state: nextState });
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  }

  private hashRandomCallId(callId: string): number {
    let value = 0x811c9dc5;
    for (let index = 0; index < callId.length; index += 1) {
      value ^= callId.charCodeAt(index);
      value = Math.imul(value, 0x01000193);
    }
    return value >>> 0;
  }

  private hashRandomSeed(seed: number): number {
    let value = seed >>> 0;
    value ^= value >>> 16;
    value = Math.imul(value, 0x7feb352d);
    value ^= value >>> 15;
    value = Math.imul(value, 0x846ca68b);
    value ^= value >>> 16;
    return value >>> 0;
  }

  private toExclusiveUnitRandom(value: number): number {
    if (value <= 0) return Number.EPSILON;
    if (value >= 1) return 1 - Number.EPSILON;
    return value;
  }

  private getCompletePairedSourceWindows(
    scope: Scope,
    leftKey: string,
    rightKey: string,
    leftSource: number,
    rightSource: number,
    length: number,
  ): [number[], number[]] | null {
    if (length < 1 || isNaN(leftSource) || isNaN(rightSource)) return null;
    const leftValues = this.updateBuiltinSourceHistory(scope, leftKey, leftSource, length);
    const rightValues = this.updateBuiltinSourceHistory(scope, rightKey, rightSource, length);
    if (
      leftValues.length < length
      || rightValues.length < length
      || leftValues.some((value) => isNaN(value))
      || rightValues.some((value) => isNaN(value))
    ) {
      return null;
    }
    return [leftValues, rightValues];
  }

  // ===========================================================================
  // Built-in Functions Registration
  // ===========================================================================

  private registerBuiltins(): void {
    // Plot functions
    this.registerPlotBuiltins();

    // Input functions
    this.registerInputBuiltins();

    // Math functions
    this.registerMathBuiltins();

    // String functions
    this.registerStringBuiltins();

    // Drawing object functions
    this.registerDrawingBuiltins();

    // Time/calendar functions
    this.registerTimeBuiltins();

    // Array functions
    this.registerArrayBuiltins();

    // Matrix functions
    this.registerMatrixBuiltins();

    // Map functions
    this.registerMapBuiltins();

    // Color constants
    this.registerColorBuiltins();

    // TA functions (basic stubs for now)
    this.registerTaBuiltins();

    // Visual constants (shape, location, size)
    this.registerVisualConstants();

    // Alert functions and constants
    this.registerAlertBuiltins();

    // Runtime helpers
    this.registerRuntimeBuiltins();

    // Request helpers and constants
    this.registerRequestBuiltins();

    // Ticker constructors and constants
    this.registerTickerBuiltins();

    // Pine Logs helpers
    this.registerLogBuiltins();

    // Strategy declaration constants
    this.registerStrategyBuiltins();
  }

  // Plot call ordering is reset on every bar so output arrays align by call site.
  private plotCallIndex = 0;
  private builtinCallCounts = new Map<string, number>();

  private resetPerBarBuiltinState(): void {
    this.plotCallIndex = 0;
    this.builtinCallCounts.clear();
  }

  private registerRuntimeBuiltins(): void {
    this.builtins.set('runtime.error', (args, namedArgs) => {
      const message = namedArgs.has('message') ? namedArgs.get('message') : args[0];
      throw new RuntimeErrorException(this.toStringValue(message ?? ''));
    });
  }

  private registerStrategyBuiltins(): void {
    this.builtins.set('strategy.commission.percent', () => 'percent');
    this.builtins.set('strategy.commission.cash_per_order', () => 'cash_per_order');
    this.builtins.set('strategy.commission.cash_per_contract', () => 'cash_per_contract');
    this.builtins.set('strategy.oca.cancel', () => 'cancel');
    this.builtins.set('strategy.oca.reduce', () => 'reduce');
    this.builtins.set('strategy.oca.none', () => 'none');
    this.builtins.set('strategy.opentrades.entry_id', (args, namedArgs) => (
      this.strategyOpenTrade(args, namedArgs)?.entryOrderId ?? ''
    ));
    this.builtins.set('strategy.opentrades.entry_price', (args, namedArgs) => (
      this.strategyOpenTrade(args, namedArgs)?.entryPrice ?? Number.NaN
    ));
    this.builtins.set('strategy.opentrades.entry_bar_index', (args, namedArgs) => (
      this.strategyOpenTrade(args, namedArgs)?.entryBarIndex ?? Number.NaN
    ));
    this.builtins.set('strategy.opentrades.entry_time', (args, namedArgs) => (
      this.strategyOpenTrade(args, namedArgs)?.entryTime ?? Number.NaN
    ));
    this.builtins.set('strategy.opentrades.size', (args, namedArgs) => {
      const trade = this.strategyOpenTrade(args, namedArgs);
      if (!trade) {
        return Number.NaN;
      }
      return trade.direction === 'long' ? trade.qty : -trade.qty;
    });
    this.builtins.set('strategy.opentrades.profit', (args, namedArgs) => {
      const trade = this.strategyOpenTrade(args, namedArgs);
      if (!trade) {
        return Number.NaN;
      }
      const close = this.ctx.close.get(0) ?? Number.NaN;
      const sign = trade.direction === 'long' ? 1 : -1;
      return (close - trade.entryPrice) * trade.qty * sign;
    });
    this.builtins.set('strategy.opentrades.commission', (args, namedArgs) => (
      this.strategyOpenTrade(args, namedArgs)?.commission ?? Number.NaN
    ));
    this.builtins.set('strategy.closedtrades.entry_id', (args, namedArgs) => (
      this.strategyClosedTrade(args, namedArgs)?.entryOrderId ?? ''
    ));
    this.builtins.set('strategy.closedtrades.exit_id', (args, namedArgs) => (
      this.strategyClosedTrade(args, namedArgs)?.exitOrderId ?? ''
    ));
    this.builtins.set('strategy.closedtrades.entry_price', (args, namedArgs) => (
      this.strategyClosedTrade(args, namedArgs)?.entryPrice ?? Number.NaN
    ));
    this.builtins.set('strategy.closedtrades.exit_price', (args, namedArgs) => (
      this.strategyClosedTrade(args, namedArgs)?.exitPrice ?? Number.NaN
    ));
    this.builtins.set('strategy.closedtrades.entry_bar_index', (args, namedArgs) => (
      this.strategyClosedTrade(args, namedArgs)?.entryBarIndex ?? Number.NaN
    ));
    this.builtins.set('strategy.closedtrades.exit_bar_index', (args, namedArgs) => (
      this.strategyClosedTrade(args, namedArgs)?.exitBarIndex ?? Number.NaN
    ));
    this.builtins.set('strategy.closedtrades.entry_time', (args, namedArgs) => (
      this.strategyClosedTrade(args, namedArgs)?.entryTime ?? Number.NaN
    ));
    this.builtins.set('strategy.closedtrades.exit_time', (args, namedArgs) => (
      this.strategyClosedTrade(args, namedArgs)?.exitTime ?? Number.NaN
    ));
    this.builtins.set('strategy.closedtrades.size', (args, namedArgs) => {
      const trade = this.strategyClosedTrade(args, namedArgs);
      if (!trade) {
        return Number.NaN;
      }
      return trade.direction === 'long' ? trade.qty : -trade.qty;
    });
    this.builtins.set('strategy.closedtrades.profit', (args, namedArgs) => (
      this.strategyClosedTrade(args, namedArgs)?.profit ?? Number.NaN
    ));
    this.builtins.set('strategy.closedtrades.commission', (args, namedArgs) => (
      this.strategyClosedTrade(args, namedArgs)?.commission ?? Number.NaN
    ));
    this.builtins.set('strategy.entry', (args, namedArgs) => this.submitStrategyOrderBuiltin(args, namedArgs, true));
    this.builtins.set('strategy.order', (args, namedArgs) => this.submitStrategyOrderBuiltin(args, namedArgs, false));
    this.builtins.set('strategy.exit', (args, namedArgs) => this.submitStrategyExitBuiltin(args, namedArgs));
    this.builtins.set('strategy.close', (args, namedArgs) => this.submitStrategyCloseBuiltin(args, namedArgs));
    this.builtins.set('strategy.close_all', (args, namedArgs) => this.submitStrategyCloseAllBuiltin(args, namedArgs));
    this.builtins.set('strategy.cancel', (args, namedArgs) => {
      const id = this.toStringValue(this.getCallArg(args, namedArgs, 0, 'id', ''));
      cancelStrategyOrder(this.ctx.strategyLedger, id, this.ctx.bar_index, this.ctx.time.get(0) ?? 0);
      return undefined;
    });
    this.builtins.set('strategy.cancel_all', () => {
      cancelAllStrategyOrders(this.ctx.strategyLedger, this.ctx.bar_index, this.ctx.time.get(0) ?? 0);
      return undefined;
    });
  }

  private strategyOpenTrade(args: unknown[], namedArgs: Map<string, unknown>): StrategyTrade | undefined {
    return this.ctx.strategyLedger.openTrades[this.strategyTradeIndex(args, namedArgs)];
  }

  private strategyClosedTrade(args: unknown[], namedArgs: Map<string, unknown>): StrategyTrade | undefined {
    return this.ctx.strategyLedger.closedTrades[this.strategyTradeIndex(args, namedArgs)];
  }

  private strategyTradeIndex(args: unknown[], namedArgs: Map<string, unknown>): number {
    const value = this.getCallArg(args, namedArgs, 0, 'trade_num');
    if (value === undefined) {
      throw new Error('strategy trade_num is required');
    }
    const index = this.toOptionalNumber(value);
    if (index === undefined || index < 0 || !Number.isInteger(index)) {
      throw new Error('strategy trade_num must be a non-negative integer');
    }
    return index;
  }

  private submitStrategyOrderBuiltin(args: unknown[], namedArgs: Map<string, unknown>, isEntry: boolean): undefined {
    const id = this.toStringValue(this.getOrderedCallArg(args, namedArgs, STRATEGY_ORDER_ARGS, 0, ''));
    const direction = this.normalizeStrategyDirection(this.getOrderedCallArg(args, namedArgs, STRATEGY_ORDER_ARGS, 1));
    const rawQty = this.toOptionalNumber(this.getOrderedCallArg(args, namedArgs, STRATEGY_ORDER_ARGS, 2));
    const qtyType = rawQty === undefined ? this.ctx.strategyLedger.settings.defaultQtyType : 'fixed';
    const qtyValue = rawQty ?? this.ctx.strategyLedger.settings.defaultQtyValue;
    const limitPrice = this.toOptionalNumber(this.getOrderedCallArg(args, namedArgs, STRATEGY_ORDER_ARGS, 3));
    const stopPrice = this.toOptionalNumber(this.getOrderedCallArg(args, namedArgs, STRATEGY_ORDER_ARGS, 4));
    const ocaName = this.toOptionalString(this.getOrderedCallArg(args, namedArgs, STRATEGY_ORDER_ARGS, 5));
    const ocaType = this.normalizeOptionalStrategyOcaType(this.getOrderedCallArg(args, namedArgs, STRATEGY_ORDER_ARGS, 6));
    const comment = this.toOptionalString(this.getOrderedCallArg(args, namedArgs, STRATEGY_ORDER_ARGS, 7));
    const alertMessage = this.toOptionalString(this.getOrderedCallArg(args, namedArgs, STRATEGY_ORDER_ARGS, 8));

    if (id === '') {
      throw new Error('strategy order id must not be empty');
    }
    if (!Number.isFinite(qtyValue) || qtyValue <= 0) {
      throw new Error('strategy order qty must be a positive number');
    }
    if (isEntry && !this.canSubmitStrategyEntry(direction)) {
      return undefined;
    }
    const requestedQty = this.resolveStrategyOrderQty(qtyType, qtyValue, limitPrice, stopPrice);

    const order = submitStrategyOrder(this.ctx.strategyLedger, {
      id,
      direction,
      qty: requestedQty,
      qtyType,
      qtyValue,
      isEntry,
      requestedQty,
      limitPrice,
      stopPrice,
      ocaName,
      ocaType,
      comment,
      alertMessage,
      barIndex: this.ctx.bar_index,
      time: this.ctx.time.get(0) ?? 0,
    });
    if (this.ctx.strategyLedger.settings.processOrdersOnClose) {
      const fill = fillStrategyMarketOrder(
        this.ctx.strategyLedger,
        order,
        this.ctx.close.get(0) ?? Number.NaN,
        this.ctx.bar_index,
        this.ctx.time.get(0) ?? 0,
      );
      this.emitStrategyFillAlerts(fill ? [fill] : []);
    }

    return undefined;
  }

  private canSubmitStrategyEntry(direction: StrategyDirection): boolean {
    const openEntries = this.ctx.strategyLedger.openTrades.filter((trade) => trade.direction === direction).length;
    return openEntries < this.ctx.strategyLedger.settings.pyramiding + 1;
  }

  private resolveStrategyOrderQty(
    qtyType: StrategyQuantityType,
    qtyValue: number,
    limitPrice: number | undefined,
    stopPrice: number | undefined,
  ): number {
    if (qtyType === 'fixed') {
      return qtyValue;
    }

    const priceBasis = limitPrice ?? stopPrice ?? this.ctx.close.get(0) ?? Number.NaN;
    if (!Number.isFinite(priceBasis) || priceBasis <= 0) {
      throw new Error('strategy order price basis must be positive for cash or percent sizing');
    }
    if (qtyType === 'cash') {
      return qtyValue / priceBasis;
    }
    const qty = (this.ctx.strategyLedger.equity * (qtyValue / 100)) / priceBasis;
    if (!Number.isFinite(qty) || qty <= 0) {
      throw new Error('strategy order resolved qty must be a positive number');
    }
    return qty;
  }

  private fillPendingStrategyOrdersForCurrentBar(): void {
    const context = this.selectStrategyIntrabarContextForCurrentBar();
    if (!context) {
      return;
    }

    const fills = fillPendingStrategyOrdersOnTicks(this.ctx.strategyLedger, context.ticks, this.ctx.bar_index);
    this.emitStrategyFillAlerts(fills);
  }

  private fillPendingStrategyMarketOrdersForCurrentBar(): void {
    const fills = fillPendingStrategyMarketOrders(
      this.ctx.strategyLedger,
      this.ctx.open.get(0) ?? Number.NaN,
      this.ctx.bar_index,
      this.ctx.time.get(0) ?? 0,
    );
    this.emitStrategyFillAlerts(fills);
  }

  private emitStrategyFillAlerts(fills: StrategyFill[]): void {
    if (fills.length > 0 && this.ctx.strategyLedger.settings.calcOnOrderFills) {
      this.strategyOrderFillRecalculationRequested = true;
    }

    for (const fill of fills) {
      if (fill.alertMessage === undefined || fill.alertMessage === '') {
        continue;
      }
      this.ctx.addAlertEvent('strategy_order_fills', fill.alertMessage, 'all');
    }
  }

  private submitStrategyExitBuiltin(args: unknown[], namedArgs: Map<string, unknown>): undefined {
    const id = this.toStringValue(this.getOrderedCallArg(args, namedArgs, STRATEGY_EXIT_ARGS, 0, ''));
    if (id === '') {
      throw new Error('strategy exit id must not be empty');
    }

    const fromEntry = this.toOptionalString(this.getOrderedCallArg(args, namedArgs, STRATEGY_EXIT_ARGS, 1));
    const matchingTrades = this.ctx.strategyLedger.openTrades.filter((trade) => (
      fromEntry === undefined ? true : trade.entryOrderId === fromEntry
    ));
    if (matchingTrades.length === 0) {
      return undefined;
    }

    const direction = matchingTrades[0]?.direction;
    if (direction === undefined) {
      return undefined;
    }

    const exitDirection: StrategyDirection = direction === 'long' ? 'short' : 'long';
    const openQty = matchingTrades.reduce((total, trade) => total + trade.qty, 0);
    const qty = this.resolveStrategyCloseQty(
      openQty,
      this.toOptionalNumber(this.getOrderedCallArg(args, namedArgs, STRATEGY_EXIT_ARGS, 2)),
      this.toOptionalNumber(this.getOrderedCallArg(args, namedArgs, STRATEGY_EXIT_ARGS, 3)),
      'strategy exit',
    );
    if (qty <= 0) {
      return undefined;
    }

    const limitPrice = this.toOptionalNumber(this.getOrderedCallArg(args, namedArgs, STRATEGY_EXIT_ARGS, 5));
    const stopPrice = this.toOptionalNumber(this.getOrderedCallArg(args, namedArgs, STRATEGY_EXIT_ARGS, 7));
    const trailPrice = this.toOptionalNumber(this.getOrderedCallArg(args, namedArgs, STRATEGY_EXIT_ARGS, 8));
    const trailPoints = this.toOptionalNumber(this.getOrderedCallArg(args, namedArgs, STRATEGY_EXIT_ARGS, 9));
    const trailOffset = this.toOptionalNumber(this.getOrderedCallArg(args, namedArgs, STRATEGY_EXIT_ARGS, 10));
    const trailActivationPrice = this.resolveStrategyTrailActivationPrice(direction, matchingTrades, trailPrice, trailPoints);
    if (limitPrice === undefined && stopPrice === undefined && trailActivationPrice === undefined) {
      throw new Error('strategy.exit requires a limit, stop, or trailing stop price');
    }
    if (trailActivationPrice !== undefined && trailOffset === undefined) {
      throw new Error('strategy.exit trailing stop requires trail_offset');
    }

    const comment = this.toOptionalString(this.getOrderedCallArg(args, namedArgs, STRATEGY_EXIT_ARGS, 12));
    const commentProfit = this.toOptionalString(this.getOrderedCallArg(args, namedArgs, STRATEGY_EXIT_ARGS, 13));
    const commentLoss = this.toOptionalString(this.getOrderedCallArg(args, namedArgs, STRATEGY_EXIT_ARGS, 14));
    const commentTrailing = this.toOptionalString(this.getOrderedCallArg(args, namedArgs, STRATEGY_EXIT_ARGS, 15));
    const alertMessage = this.toOptionalString(this.getOrderedCallArg(args, namedArgs, STRATEGY_EXIT_ARGS, 16));
    const alertProfit = this.toOptionalString(this.getOrderedCallArg(args, namedArgs, STRATEGY_EXIT_ARGS, 17));
    const alertLoss = this.toOptionalString(this.getOrderedCallArg(args, namedArgs, STRATEGY_EXIT_ARGS, 18));
    const alertTrailing = this.toOptionalString(this.getOrderedCallArg(args, namedArgs, STRATEGY_EXIT_ARGS, 19));
    const exitOrderCount = [limitPrice, stopPrice, trailActivationPrice].filter((value) => value !== undefined).length;
    const suffixOrders = exitOrderCount > 1;
    const exitOcaName = suffixOrders ? this.strategyExitOcaName(id, fromEntry) : undefined;
    this.cancelObsoleteStrategyExitOrders(id, fromEntry, suffixOrders);

    if (limitPrice !== undefined) {
      this.submitOrReplaceStrategyExitOrder({
        id: suffixOrders ? `${id} Limit` : id,
        direction: exitDirection,
        qty,
        qtyType: 'fixed',
        qtyValue: qty,
        limitPrice,
        fromEntry,
        ocaName: exitOcaName,
        ocaType: suffixOrders ? 'cancel' : undefined,
        comment: commentProfit ?? comment,
        alertMessage: alertProfit ?? alertMessage,
        barIndex: this.ctx.bar_index,
        time: this.ctx.time.get(0) ?? 0,
      });
    }

    if (stopPrice !== undefined) {
      this.submitOrReplaceStrategyExitOrder({
        id: suffixOrders ? `${id} Stop` : id,
        direction: exitDirection,
        qty,
        qtyType: 'fixed',
        qtyValue: qty,
        stopPrice,
        fromEntry,
        ocaName: exitOcaName,
        ocaType: suffixOrders ? 'cancel' : undefined,
        comment: commentLoss ?? comment,
        alertMessage: alertLoss ?? alertMessage,
        barIndex: this.ctx.bar_index,
        time: this.ctx.time.get(0) ?? 0,
      });
    }

    if (trailActivationPrice !== undefined && trailOffset !== undefined) {
      this.submitOrReplaceStrategyExitOrder({
        id: suffixOrders ? `${id} Trail` : id,
        direction: exitDirection,
        qty,
        qtyType: 'fixed',
        qtyValue: qty,
        trailActivationPrice,
        trailOffset,
        fromEntry,
        ocaName: exitOcaName,
        ocaType: suffixOrders ? 'cancel' : undefined,
        comment: commentTrailing ?? comment,
        alertMessage: alertTrailing ?? alertMessage,
        barIndex: this.ctx.bar_index,
        time: this.ctx.time.get(0) ?? 0,
      });
    }

    return undefined;
  }

  private resolveStrategyTrailActivationPrice(
    direction: StrategyDirection,
    trades: Array<{ entryPrice: number; qty?: number }>,
    trailPrice: number | undefined,
    trailPoints: number | undefined,
  ): number | undefined {
    if (trailPrice !== undefined) {
      return trailPrice;
    }
    if (trailPoints === undefined) {
      return undefined;
    }
    if (!Number.isFinite(trailPoints) || trailPoints < 0) {
      throw new Error('strategy.exit trail_points must be a non-negative number');
    }
    let weightedTotal = 0;
    let totalQty = 0;
    let unweightedTotal = 0;
    for (const trade of trades) {
      unweightedTotal += trade.entryPrice;
      const qty = trade.qty;
      if (qty !== undefined && Number.isFinite(qty) && qty > 0) {
        weightedTotal += trade.entryPrice * qty;
        totalQty += qty;
      }
    }
    const entryPrice = totalQty > 0
      ? weightedTotal / totalQty
      : trades.length > 0
        ? unweightedTotal / trades.length
        : undefined;
    if (entryPrice === undefined) {
      return undefined;
    }
    return direction === 'long' ? entryPrice + trailPoints : entryPrice - trailPoints;
  }

  private strategyExitOcaName(id: string, fromEntry: string | undefined): string {
    return fromEntry === undefined ? id : `${fromEntry}:${id}`;
  }

  private cancelObsoleteStrategyExitOrders(id: string, fromEntry: string | undefined, suffixOrders: boolean): void {
    const activeIds = suffixOrders
      ? new Set([`${id} Limit`, `${id} Stop`, `${id} Trail`])
      : new Set([id]);

    for (const order of this.ctx.strategyLedger.orders) {
      if (order.status !== 'pending' || order.fromEntry !== fromEntry) {
        continue;
      }
      if (order.id !== id && order.id !== `${id} Limit` && order.id !== `${id} Stop` && order.id !== `${id} Trail`) {
        continue;
      }
      if (activeIds.has(order.id)) {
        continue;
      }

      order.status = 'cancelled';
      order.updatedBarIndex = this.ctx.bar_index;
      order.updatedTime = this.ctx.time.get(0) ?? 0;
    }
  }

  private submitOrReplaceStrategyExitOrder(input: Parameters<typeof submitStrategyOrder>[1]): void {
    const existingOrder = this.ctx.strategyLedger.orders.find((order) => (
      order.status === 'pending'
      && order.id === input.id
      && order.fromEntry === input.fromEntry
    ));
    if (!existingOrder) {
      submitStrategyOrder(this.ctx.strategyLedger, input);
      return;
    }

    const triggerChanged = existingOrder.limitPrice !== input.limitPrice
      || existingOrder.stopPrice !== input.stopPrice
      || existingOrder.trailActivationPrice !== input.trailActivationPrice
      || existingOrder.trailOffset !== input.trailOffset;
    existingOrder.direction = input.direction;
    if (input.trailActivationPrice !== undefined || input.trailOffset !== undefined) {
      existingOrder.type = 'trailing_stop';
    } else if (input.limitPrice !== undefined && input.stopPrice !== undefined) {
      existingOrder.type = 'stop_limit';
    } else if (input.limitPrice !== undefined) {
      existingOrder.type = 'limit';
    } else if (input.stopPrice !== undefined) {
      existingOrder.type = 'stop';
    } else {
      existingOrder.type = 'market';
    }
    existingOrder.qty = input.qty;
    existingOrder.qtyType = input.qtyType;
    existingOrder.qtyValue = input.qtyValue;
    existingOrder.limitPrice = input.limitPrice;
    existingOrder.stopPrice = input.stopPrice;
    existingOrder.trailActivationPrice = input.trailActivationPrice;
    existingOrder.trailOffset = input.trailOffset;
    existingOrder.fromEntry = input.fromEntry;
    existingOrder.ocaName = input.ocaName;
    existingOrder.ocaType = input.ocaType;
    existingOrder.comment = input.comment;
    existingOrder.alertMessage = input.alertMessage;
    if (triggerChanged) {
      existingOrder.stopLimitActivated = false;
      existingOrder.stopLimitActivatedBarIndex = null;
      existingOrder.stopLimitActivatedTime = null;
      existingOrder.trailingActivated = false;
      existingOrder.trailingActivatedBarIndex = null;
      existingOrder.trailingActivatedTime = null;
      existingOrder.trailingBestPrice = undefined;
      existingOrder.trailingStopPrice = undefined;
      existingOrder.activationBarIndex = input.barIndex;
      existingOrder.activationTime = input.time;
    }
    existingOrder.updatedBarIndex = input.barIndex;
    existingOrder.updatedTime = input.time;
  }

  private submitStrategyCloseBuiltin(args: unknown[], namedArgs: Map<string, unknown>): undefined {
    const id = this.toStringValue(this.getOrderedCallArg(args, namedArgs, STRATEGY_CLOSE_ARGS, 0, ''));
    if (id === '') {
      throw new Error('strategy close id must not be empty');
    }

    const matchingTrades = this.ctx.strategyLedger.openTrades.filter((trade) => trade.entryOrderId === id);
    if (matchingTrades.length === 0) {
      return undefined;
    }

    const direction = matchingTrades[0]?.direction;
    if (direction === undefined) {
      return undefined;
    }

    const openQty = matchingTrades.reduce((total, trade) => total + trade.qty, 0);
    const qty = this.resolveStrategyCloseQty(
      openQty,
      this.toOptionalNumber(this.getOrderedCallArg(args, namedArgs, STRATEGY_CLOSE_ARGS, 2)),
      this.toOptionalNumber(this.getOrderedCallArg(args, namedArgs, STRATEGY_CLOSE_ARGS, 3)),
      'strategy close',
    );
    if (qty <= 0) {
      return undefined;
    }

    this.submitFilledStrategyCloseOrder({
      id: `Close ${id}`,
      direction: direction === 'long' ? 'short' : 'long',
      qty,
      fromEntry: id,
      comment: this.toOptionalString(this.getOrderedCallArg(args, namedArgs, STRATEGY_CLOSE_ARGS, 1)),
      alertMessage: this.toOptionalString(this.getOrderedCallArg(args, namedArgs, STRATEGY_CLOSE_ARGS, 4)),
    });
    return undefined;
  }

  private submitStrategyCloseAllBuiltin(args: unknown[], namedArgs: Map<string, unknown>): undefined {
    const position = this.ctx.strategyLedger.position;
    if (position.direction === null || position.size === 0) {
      return undefined;
    }

    this.submitFilledStrategyCloseOrder({
      id: 'Close All',
      direction: position.direction === 'long' ? 'short' : 'long',
      qty: Math.abs(position.size),
      comment: this.toOptionalString(this.getOrderedCallArg(args, namedArgs, STRATEGY_CLOSE_ALL_ARGS, 0)),
      alertMessage: this.toOptionalString(this.getOrderedCallArg(args, namedArgs, STRATEGY_CLOSE_ALL_ARGS, 1)),
    });
    return undefined;
  }

  private resolveStrategyCloseQty(openQty: number, rawQty: number | undefined, rawQtyPercent: number | undefined, name: string): number {
    if (rawQty !== undefined) {
      if (!Number.isFinite(rawQty) || rawQty <= 0) {
        throw new Error(`${name} qty must be a positive number`);
      }
      return Math.min(rawQty, openQty);
    }
    if (rawQtyPercent !== undefined) {
      if (!Number.isFinite(rawQtyPercent) || rawQtyPercent <= 0) {
        throw new Error(`${name} qty_percent must be a positive number`);
      }
      return Math.min(openQty * (rawQtyPercent / 100), openQty);
    }
    return openQty;
  }

  private submitFilledStrategyCloseOrder(input: {
    id: string;
    direction: StrategyDirection;
    qty: number;
    fromEntry?: string;
    comment?: string;
    alertMessage?: string;
  }): void {
    const order = submitStrategyOrder(this.ctx.strategyLedger, {
      id: input.id,
      direction: input.direction,
      qty: input.qty,
      qtyType: 'fixed',
      qtyValue: input.qty,
      fromEntry: input.fromEntry,
      comment: input.comment,
      alertMessage: input.alertMessage,
      barIndex: this.ctx.bar_index,
      time: this.ctx.time.get(0) ?? 0,
    });
    if (this.ctx.strategyLedger.settings.processOrdersOnClose) {
      const fill = fillStrategyMarketOrder(
        this.ctx.strategyLedger,
        order,
        this.ctx.close.get(0) ?? Number.NaN,
        this.ctx.bar_index,
        this.ctx.time.get(0) ?? 0,
      );
      this.emitStrategyFillAlerts(fill ? [fill] : []);
    }
  }

  private normalizeStrategyDirection(value: unknown): StrategyDirection {
    if (value === 'long' || value === 'short') {
      return value;
    }
    throw new Error(`Invalid strategy direction: ${this.toStringValue(value)}`);
  }

  private normalizeOptionalStrategyOcaType(value: unknown): StrategyOcaType | undefined {
    if (value === undefined || value === null || this.isNa(value)) {
      return undefined;
    }
    if (value === 'cancel' || value === 'reduce' || value === 'none') {
      return value;
    }
    throw new Error(`Invalid strategy oca_type: ${this.toStringValue(value)}`);
  }

  private registerRequestBuiltins(): void {
    this.builtins.set('barmerge.gaps_off', () => 'barmerge.gaps_off');
    this.builtins.set('barmerge.gaps_on', () => 'barmerge.gaps_on');
    this.builtins.set('barmerge.lookahead_off', () => 'barmerge.lookahead_off');
    this.builtins.set('barmerge.lookahead_on', () => 'barmerge.lookahead_on');
    this.builtins.set('dividends.gross', () => 'dividends.gross');
    this.builtins.set('dividends.net', () => 'dividends.net');
    this.builtins.set('earnings.actual', () => 'earnings.actual');
    this.builtins.set('earnings.estimate', () => 'earnings.estimate');
    this.builtins.set('earnings.standardized', () => 'earnings.standardized');
    this.builtins.set('splits.denominator', () => 'splits.denominator');
    this.builtins.set('splits.numerator', () => 'splits.numerator');
  }

  private registerLogBuiltins(): void {
    const addLog = (level: LogLevel, args: unknown[], namedArgs: Map<string, unknown>) => {
      const rawMessage = namedArgs.has('message') ? namedArgs.get('message') : args[0];
      const formatArgs = namedArgs.has('message') ? args : args.slice(1);
      const message = this.formatLogMessage(rawMessage, formatArgs);
      this.ctx.addLog(level, message);
      return undefined;
    };

    this.builtins.set('log.info', (args, namedArgs) => addLog('info', args, namedArgs));
    this.builtins.set('log.warning', (args, namedArgs) => addLog('warning', args, namedArgs));
    this.builtins.set('log.error', (args, namedArgs) => addLog('error', args, namedArgs));
  }

  private formatLogMessage(message: unknown, args: unknown[]): string {
    const template = this.toStringValue(message ?? '');
    if (args.length === 0) {
      return template;
    }
    return template.replace(/\{(\d+)(?:,[^}:]+)?(?::([^}]+))?\}/g, (_match, index: string, format: string | undefined) => {
      return this.toStringValue(args[Number(index)], format);
    });
  }

  private nextBuiltinCallId(name: string): string {
    this.profileBuiltinCalls += 1;
    const index = this.builtinCallCounts.get(name) ?? 0;
    this.builtinCallCounts.set(name, index + 1);
    return `${name}_${index}`;
  }

  private builtinCallId(name: string, expr: CallExpression): string {
    if ((name === 'alert' || name === 'math.random' || name === 'ta.macd' || name === 'ta.obv') && expr.loc) {
      this.profileBuiltinCalls += 1;
      return `${name}_${expr.loc.start.line}_${expr.loc.start.column}`;
    }

    return this.nextBuiltinCallId(name);
  }

  private registerPlotBuiltins(): void {
    const plotArgs = ['series', 'title', 'color', 'linewidth', 'style', 'trackprice', 'histbase', 'offset', 'join', 'editable', 'show_last', 'display', 'format', 'precision', 'force_overlay', 'linestyle'] as const;
    const hlineArgs = ['price', 'title', 'color', 'linestyle', 'linewidth', 'editable', 'display'] as const;
    const bgcolorArgs = ['color', 'offset', 'editable', 'show_last', 'title', 'display', 'force_overlay'] as const;
    const barcolorArgs = ['color', 'offset', 'editable', 'show_last', 'title', 'display'] as const;
    const plotbarArgs = ['open', 'high', 'low', 'close', 'title', 'color', 'editable', 'show_last', 'display', 'format', 'precision', 'force_overlay'] as const;
    const plotcandleArgs = ['open', 'high', 'low', 'close', 'title', 'color', 'wickcolor', 'editable', 'show_last', 'bordercolor', 'display', 'format', 'precision', 'force_overlay'] as const;
    const plotshapeArgs = ['series', 'title', 'style', 'location', 'color', 'offset', 'text', 'textcolor', 'editable', 'size', 'show_last', 'display', 'format', 'precision', 'force_overlay'] as const;
    const plotcharArgs = ['series', 'title', 'char', 'location', 'color', 'offset', 'text', 'textcolor', 'editable', 'size', 'show_last', 'display', 'format', 'precision', 'force_overlay'] as const;
    const plotarrowArgs = ['series', 'title', 'colorup', 'colordown', 'offset', 'minheight', 'maxheight', 'editable', 'show_last', 'display', 'format', 'precision', 'force_overlay'] as const;
    const fillArgs = ['plot1', 'plot2', 'color', 'title', 'editable', 'show_last', 'fillgaps', 'display'] as const;

    this.builtins.set('plot', (args, namedArgs, ctx) => {
      const value = this.getOrderedCallArg(args, namedArgs, plotArgs, 0) as number;
      const callIndex = this.plotCallIndex++;
      const titleArg = this.getOrderedCallArg(args, namedArgs, plotArgs, 1);
      const hasExplicitTitle = namedArgs.has('title') || titleArg !== undefined;
      const title = (titleArg ?? `Plot ${callIndex + 1}`) as string;
      const colorArg = this.getOrderedCallArg(args, namedArgs, plotArgs, 2, '#2196F3');
      const color = this.toPlotColor(colorArg);
      const linewidth = this.toOptionalInteger(this.getOrderedCallArg(args, namedArgs, plotArgs, 3, 1)) ?? 1;
      const style = (this.getOrderedCallArg(args, namedArgs, plotArgs, 4, 'line')) as string;
      const trackprice = this.toOptionalBoolean(this.getOrderedCallArg(args, namedArgs, plotArgs, 5));
      const histbase = this.toOptionalNumber(this.getOrderedCallArg(args, namedArgs, plotArgs, 6));
      const offset = this.toOptionalInteger(this.getOrderedCallArg(args, namedArgs, plotArgs, 7));
      const join = this.toOptionalBoolean(this.getOrderedCallArg(args, namedArgs, plotArgs, 8));
      const editable = this.toOptionalBoolean(this.getOrderedCallArg(args, namedArgs, plotArgs, 9));
      const showLast = this.toOptionalInteger(this.getOrderedCallArg(args, namedArgs, plotArgs, 10));
      const display = this.toOptionalInteger(this.getOrderedCallArg(args, namedArgs, plotArgs, 11));
      const format = this.toOptionalString(this.getOrderedCallArg(args, namedArgs, plotArgs, 12));
      const precision = this.toOptionalInteger(this.getOrderedCallArg(args, namedArgs, plotArgs, 13));
      const forceOverlay = this.toOptionalBoolean(this.getOrderedCallArg(args, namedArgs, plotArgs, 14));
      const lineStyle = this.toOptionalString(this.getOrderedCallArg(args, namedArgs, plotArgs, 15)) as PlotLineStyle | undefined;

      // Use plot call order for untitled plots so multiple plot(...) calls do
      // not collapse into one "Plot" series across every bar.
      const id = hasExplicitTitle ? `plot_${title}` : `plot_untitled_${callIndex}`;

      if (ctx.bar_index === 0) {
        ctx.registerPlot({
          id,
          type: 'plot',
          title,
          color: [], // Always array for per-bar colors
          linewidth,
          style: style as PlotStyle,
          offset,
          trackprice,
          histbase,
          join,
          editable,
          showLast,
          display,
          format,
          precision,
          forceOverlay,
          lineStyle,
        });
      }

      // Add color to array for this bar (supports dynamic colors)
      const plot = ctx.plots.get(id);
      if (plot && Array.isArray(plot.color)) {
        plot.color.push(color);
      }

      ctx.addPlotValue(id, this.toPlotValue(value));
      return id;
    });

    this.builtins.set('hline', (args, namedArgs, ctx) => {
      const price = this.toNumber(this.getOrderedCallArg(args, namedArgs, hlineArgs, 0));
      const title = (this.getOrderedCallArg(args, namedArgs, hlineArgs, 1, 'HLine')) as string;
      const color = (this.getOrderedCallArg(args, namedArgs, hlineArgs, 2, '#787B86')) as string;
      const lineStyle = this.getOrderedCallArg(args, namedArgs, hlineArgs, 3, 'solid') as PlotLineStyle;
      const linewidth = this.toOptionalInteger(this.getOrderedCallArg(args, namedArgs, hlineArgs, 4, 1)) ?? 1;
      const editable = this.toOptionalBoolean(this.getOrderedCallArg(args, namedArgs, hlineArgs, 5));
      const display = this.toOptionalInteger(this.getOrderedCallArg(args, namedArgs, hlineArgs, 6));

      const id = `hline_${title}`;

      if (ctx.bar_index === 0) {
        ctx.registerPlot({
          id,
          type: 'hline',
          title,
          color,
          linewidth,
          lineStyle,
          editable,
          display,
          price,
        });
      }

      return id;
    });

    this.builtins.set('bgcolor', (args, namedArgs, ctx) => {
      const color = this.toPlotColor(this.getOrderedCallArg(args, namedArgs, bgcolorArgs, 0));
      const offset = this.toOptionalInteger(this.getOrderedCallArg(args, namedArgs, bgcolorArgs, 1)) ?? 0;
      const editable = this.toOptionalBoolean(this.getOrderedCallArg(args, namedArgs, bgcolorArgs, 2));
      const showLast = this.toOptionalInteger(this.getOrderedCallArg(args, namedArgs, bgcolorArgs, 3));
      const title = (this.getOrderedCallArg(args, namedArgs, bgcolorArgs, 4, 'bgcolor')) as string;
      const display = this.toOptionalInteger(this.getOrderedCallArg(args, namedArgs, bgcolorArgs, 5));
      const forceOverlay = this.toOptionalBoolean(this.getOrderedCallArg(args, namedArgs, bgcolorArgs, 6));

      const id = `bgcolor_${title}`;

      if (ctx.bar_index === 0) {
        ctx.registerPlot({
          id,
          type: 'bgcolor',
          title,
          color: [],
          offset,
          editable,
          showLast,
          display,
          forceOverlay,
        });
      }

      const plot = ctx.plots.get(id);
      this.setPlotColorValue(plot, ctx.bar_index + offset, color, color === null ? null : 1);

      return color;
    });

    this.builtins.set('barcolor', (args, namedArgs, ctx, _scope, callId) => {
      const color = this.toPlotColor(this.getOrderedCallArg(args, namedArgs, barcolorArgs, 0));
      const offset = this.toOptionalInteger(this.getOrderedCallArg(args, namedArgs, barcolorArgs, 1)) ?? 0;
      const editable = this.toOptionalBoolean(this.getOrderedCallArg(args, namedArgs, barcolorArgs, 2));
      const showLast = this.toOptionalInteger(this.getOrderedCallArg(args, namedArgs, barcolorArgs, 3));
      const title = (this.getOrderedCallArg(args, namedArgs, barcolorArgs, 4, callId)) as string;
      const display = this.toOptionalInteger(this.getOrderedCallArg(args, namedArgs, barcolorArgs, 5));
      const id = `barcolor_${title}`;

      let plot = ctx.plots.get(id);
      if (!plot) {
        ctx.registerPlot({
          id,
          type: 'barcolor',
          title,
          color: [],
          offset,
          editable,
          showLast,
          display,
        });
        plot = ctx.plots.get(id);
      }

      this.setPlotColorValue(plot, ctx.bar_index + offset, color, null);
      return color;
    });

    this.builtins.set('plotbar', (args, namedArgs, ctx, _scope, callId) => {
      const open = this.toPlotValue(this.getOrderedCallArg(args, namedArgs, plotbarArgs, 0));
      const high = this.toPlotValue(this.getOrderedCallArg(args, namedArgs, plotbarArgs, 1));
      const low = this.toPlotValue(this.getOrderedCallArg(args, namedArgs, plotbarArgs, 2));
      const close = this.toPlotValue(this.getOrderedCallArg(args, namedArgs, plotbarArgs, 3));
      const title = (this.getOrderedCallArg(args, namedArgs, plotbarArgs, 4, callId)) as string;
      const color = this.toPlotColor(
        this.getOrderedCallArg(
          args,
          namedArgs,
          plotbarArgs,
          5,
          close !== null && open !== null && close >= open ? '#4CAF50' : '#F44336',
        ),
      );
      const editable = this.toOptionalBoolean(this.getOrderedCallArg(args, namedArgs, plotbarArgs, 6));
      const showLast = this.toOptionalInteger(this.getOrderedCallArg(args, namedArgs, plotbarArgs, 7));
      const display = this.toOptionalInteger(this.getOrderedCallArg(args, namedArgs, plotbarArgs, 8));
      const format = this.toOptionalString(this.getOrderedCallArg(args, namedArgs, plotbarArgs, 9));
      const precision = this.toOptionalInteger(this.getOrderedCallArg(args, namedArgs, plotbarArgs, 10));
      const forceOverlay = this.toOptionalBoolean(this.getOrderedCallArg(args, namedArgs, plotbarArgs, 11));
      const id = `plotbar_${title}`;

      let plot = ctx.plots.get(id);
      if (!plot) {
        ctx.registerPlot({
          id,
          type: 'plotbar',
          title,
          color: [],
          openValues: [],
          highValues: [],
          lowValues: [],
          closeValues: [],
          editable,
          showLast,
          display,
          format,
          precision,
          forceOverlay,
        });
        plot = ctx.plots.get(id);
      }

      this.setOhlcPlotBar(plot, ctx.bar_index, open, high, low, close, color);
      return close;
    });

    this.builtins.set('plotcandle', (args, namedArgs, ctx, _scope, callId) => {
      const open = this.toPlotValue(this.getOrderedCallArg(args, namedArgs, plotcandleArgs, 0));
      const high = this.toPlotValue(this.getOrderedCallArg(args, namedArgs, plotcandleArgs, 1));
      const low = this.toPlotValue(this.getOrderedCallArg(args, namedArgs, plotcandleArgs, 2));
      const close = this.toPlotValue(this.getOrderedCallArg(args, namedArgs, plotcandleArgs, 3));
      const title = (this.getOrderedCallArg(args, namedArgs, plotcandleArgs, 4, callId)) as string;
      const defaultColor = close !== null && open !== null && close >= open ? '#4CAF50' : '#F44336';
      const color = this.toPlotColor(this.getOrderedCallArg(args, namedArgs, plotcandleArgs, 5, defaultColor));
      const wickColor = this.toPlotColor(this.getOrderedCallArg(args, namedArgs, plotcandleArgs, 6, color));
      const editable = this.toOptionalBoolean(this.getOrderedCallArg(args, namedArgs, plotcandleArgs, 7));
      const showLast = this.toOptionalInteger(this.getOrderedCallArg(args, namedArgs, plotcandleArgs, 8));
      const borderColor = this.toPlotColor(this.getOrderedCallArg(args, namedArgs, plotcandleArgs, 9, color));
      const display = this.toOptionalInteger(this.getOrderedCallArg(args, namedArgs, plotcandleArgs, 10));
      const format = this.toOptionalString(this.getOrderedCallArg(args, namedArgs, plotcandleArgs, 11));
      const precision = this.toOptionalInteger(this.getOrderedCallArg(args, namedArgs, plotcandleArgs, 12));
      const forceOverlay = this.toOptionalBoolean(this.getOrderedCallArg(args, namedArgs, plotcandleArgs, 13));
      const id = `plotcandle_${title}`;

      let plot = ctx.plots.get(id);
      if (!plot) {
        ctx.registerPlot({
          id,
          type: 'plotcandle',
          title,
          color: [],
          openValues: [],
          highValues: [],
          lowValues: [],
          closeValues: [],
          wickColor: [],
          borderColor: [],
          editable,
          showLast,
          display,
          format,
          precision,
          forceOverlay,
        });
        plot = ctx.plots.get(id);
      }

      this.setOhlcPlotBar(plot, ctx.bar_index, open, high, low, close, color, wickColor, borderColor);
      return close;
    });

    // Plot style constants
    this.builtins.set('plot.style_line', () => 'line');
    this.builtins.set('plot.style_linebr', () => 'linebr');
    this.builtins.set('plot.style_stepline', () => 'stepline');
    this.builtins.set('plot.style_stepline_diamond', () => 'stepline_diamond');
    this.builtins.set('plot.style_histogram', () => 'histogram');
    this.builtins.set('plot.style_circles', () => 'circles');
    this.builtins.set('plot.style_cross', () => 'cross');
    this.builtins.set('plot.style_columns', () => 'columns');
    this.builtins.set('plot.style_area', () => 'area');
    this.builtins.set('plot.style_areabr', () => 'areabr');
    this.builtins.set('plot.linestyle_solid', () => 'solid');
    this.builtins.set('plot.linestyle_dotted', () => 'dotted');
    this.builtins.set('plot.linestyle_dashed', () => 'dashed');
    this.builtins.set('hline.style_solid', () => 'solid');
    this.builtins.set('hline.style_dotted', () => 'dotted');
    this.builtins.set('hline.style_dashed', () => 'dashed');

    // =========================================================================
    // plotshape - Conditional shape markers
    // =========================================================================
    this.builtins.set('plotshape', (args, namedArgs, ctx) => {
      const series = this.getOrderedCallArg(args, namedArgs, plotshapeArgs, 0); // Can be boolean or number
      const title = (this.getOrderedCallArg(args, namedArgs, plotshapeArgs, 1, 'Shape')) as string;
      const style = (this.getOrderedCallArg(args, namedArgs, plotshapeArgs, 2, 'circle')) as string;
      const location = (this.getOrderedCallArg(args, namedArgs, plotshapeArgs, 3, 'abovebar')) as string;
      const color = this.toPlotColor(this.getOrderedCallArg(args, namedArgs, plotshapeArgs, 4, '#2196F3'));
      const offset = this.toOptionalInteger(this.getOrderedCallArg(args, namedArgs, plotshapeArgs, 5));
      const text = (this.getOrderedCallArg(args, namedArgs, plotshapeArgs, 6, '')) as string;
      const textColor = this.toPlotColor(this.getOrderedCallArg(args, namedArgs, plotshapeArgs, 7, '#FFFFFF'));
      const editable = this.toOptionalBoolean(this.getOrderedCallArg(args, namedArgs, plotshapeArgs, 8));
      const size = (this.getOrderedCallArg(args, namedArgs, plotshapeArgs, 9, 'normal')) as string;
      const showLast = this.toOptionalInteger(this.getOrderedCallArg(args, namedArgs, plotshapeArgs, 10));
      const display = this.toOptionalInteger(this.getOrderedCallArg(args, namedArgs, plotshapeArgs, 11));
      const format = this.toOptionalString(this.getOrderedCallArg(args, namedArgs, plotshapeArgs, 12));
      const precision = this.toOptionalInteger(this.getOrderedCallArg(args, namedArgs, plotshapeArgs, 13));
      const forceOverlay = this.toOptionalBoolean(this.getOrderedCallArg(args, namedArgs, plotshapeArgs, 14));

      const id = `plotshape_${title}`;

      if (ctx.bar_index === 0) {
        ctx.registerPlot({
          id,
          type: 'plotshape',
          title,
          color: [],
          shape: style,
          location: location as 'abovebar' | 'belowbar' | 'top' | 'bottom' | 'absolute',
          size: size as 'tiny' | 'small' | 'normal' | 'large' | 'huge' | 'auto',
          text,
          textColor: textColor ?? undefined,
          offset,
          editable,
          showLast,
          display,
          format,
          precision,
          forceOverlay,
        });
      }

      // Add color to array for this bar
      const plot = ctx.plots.get(id);
      if (plot && Array.isArray(plot.color)) {
        plot.color.push(color);
      }

      // Determine value - true/non-zero means show shape
      let value: number | null = null;
      if (typeof series === 'boolean') {
        value = series ? 1 : null;
      } else if (typeof series === 'number') {
        value = !isNaN(series) && series !== 0 ? series : null;
      }

      ctx.addPlotValue(id, value);
      return series;
    });

    // =========================================================================
    // plotchar - Custom character markers
    // =========================================================================
    this.builtins.set('plotchar', (args, namedArgs, ctx) => {
      const series = this.getOrderedCallArg(args, namedArgs, plotcharArgs, 0); // Can be boolean or number
      const title = (this.getOrderedCallArg(args, namedArgs, plotcharArgs, 1, 'Char')) as string;
      const char = (this.getOrderedCallArg(args, namedArgs, plotcharArgs, 2, '●')) as string;
      const location = (this.getOrderedCallArg(args, namedArgs, plotcharArgs, 3, 'abovebar')) as string;
      const color = this.toPlotColor(this.getOrderedCallArg(args, namedArgs, plotcharArgs, 4, '#2196F3'));
      const offset = this.toOptionalInteger(this.getOrderedCallArg(args, namedArgs, plotcharArgs, 5));
      const text = (this.getOrderedCallArg(args, namedArgs, plotcharArgs, 6, '')) as string;
      const textColor = this.toPlotColor(this.getOrderedCallArg(args, namedArgs, plotcharArgs, 7, '#FFFFFF'));
      const editable = this.toOptionalBoolean(this.getOrderedCallArg(args, namedArgs, plotcharArgs, 8));
      const size = (this.getOrderedCallArg(args, namedArgs, plotcharArgs, 9, 'normal')) as string;
      const showLast = this.toOptionalInteger(this.getOrderedCallArg(args, namedArgs, plotcharArgs, 10));
      const display = this.toOptionalInteger(this.getOrderedCallArg(args, namedArgs, plotcharArgs, 11));
      const format = this.toOptionalString(this.getOrderedCallArg(args, namedArgs, plotcharArgs, 12));
      const precision = this.toOptionalInteger(this.getOrderedCallArg(args, namedArgs, plotcharArgs, 13));
      const forceOverlay = this.toOptionalBoolean(this.getOrderedCallArg(args, namedArgs, plotcharArgs, 14));

      const id = `plotchar_${title}`;

      if (ctx.bar_index === 0) {
        ctx.registerPlot({
          id,
          type: 'plotchar',
          title,
          color: [],
          char,
          location: location as 'abovebar' | 'belowbar' | 'top' | 'bottom' | 'absolute',
          size: size as 'tiny' | 'small' | 'normal' | 'large' | 'huge' | 'auto',
          text,
          textColor: textColor ?? undefined,
          offset,
          editable,
          showLast,
          display,
          format,
          precision,
          forceOverlay,
        });
      }

      // Add color to array for this bar
      const plot = ctx.plots.get(id);
      if (plot && Array.isArray(plot.color)) {
        plot.color.push(color);
      }

      // Determine value
      let value: number | null = null;
      if (typeof series === 'boolean') {
        value = series ? 1 : null;
      } else if (typeof series === 'number') {
        value = !isNaN(series) && series !== 0 ? series : null;
      }

      ctx.addPlotValue(id, value);
      return series;
    });

    // =========================================================================
    // plotarrow - Directional arrows
    // =========================================================================
    this.builtins.set('plotarrow', (args, namedArgs, ctx) => {
      const series = this.getOrderedCallArg(args, namedArgs, plotarrowArgs, 0) as number; // Positive = up arrow, negative = down arrow
      const title = (this.getOrderedCallArg(args, namedArgs, plotarrowArgs, 1, 'Arrow')) as string;
      const colorup = this.toPlotColor(this.getOrderedCallArg(args, namedArgs, plotarrowArgs, 2, '#4CAF50'));
      const colordown = this.toPlotColor(this.getOrderedCallArg(args, namedArgs, plotarrowArgs, 3, '#F44336'));
      const offset = this.toOptionalInteger(this.getOrderedCallArg(args, namedArgs, plotarrowArgs, 4));
      const minHeight = this.toOptionalInteger(this.getOrderedCallArg(args, namedArgs, plotarrowArgs, 5));
      const maxHeight = this.toOptionalInteger(this.getOrderedCallArg(args, namedArgs, plotarrowArgs, 6));
      const editable = this.toOptionalBoolean(this.getOrderedCallArg(args, namedArgs, plotarrowArgs, 7));
      const showLast = this.toOptionalInteger(this.getOrderedCallArg(args, namedArgs, plotarrowArgs, 8));
      const display = this.toOptionalInteger(this.getOrderedCallArg(args, namedArgs, plotarrowArgs, 9));
      const format = this.toOptionalString(this.getOrderedCallArg(args, namedArgs, plotarrowArgs, 10));
      const precision = this.toOptionalInteger(this.getOrderedCallArg(args, namedArgs, plotarrowArgs, 11));
      const forceOverlay = this.toOptionalBoolean(this.getOrderedCallArg(args, namedArgs, plotarrowArgs, 12));

      const id = `plotarrow_${title}`;

      if (ctx.bar_index === 0) {
        ctx.registerPlot({
          id,
          type: 'plotarrow',
          title,
          color: [],
          colorup: colorup ?? undefined,
          colordown: colordown ?? undefined,
          location: 'abovebar', // Arrows position relative to price
          offset,
          minHeight,
          maxHeight,
          editable,
          showLast,
          display,
          format,
          precision,
          forceOverlay,
        });
      }

      // Determine color based on value sign
      const plot = ctx.plots.get(id);
      if (plot && Array.isArray(plot.color)) {
        if (isNaN(series) || series === 0) {
          plot.color.push(null);
        } else {
          plot.color.push(series > 0 ? colorup : colordown);
        }
      }

      // Value determines arrow direction and size
      const value = isNaN(series) || series === 0 ? null : series;
      ctx.addPlotValue(id, value);
      return series;
    });

    // =========================================================================
    // fill - Fill area between two plots
    // =========================================================================
    this.builtins.set('fill', (args, namedArgs, ctx, _scope, callId) => {
      const canonicalNamedArgs = new Map(namedArgs);
      if (!canonicalNamedArgs.has('plot1') && canonicalNamedArgs.has('hline1')) canonicalNamedArgs.set('plot1', canonicalNamedArgs.get('hline1'));
      if (!canonicalNamedArgs.has('plot2') && canonicalNamedArgs.has('hline2')) canonicalNamedArgs.set('plot2', canonicalNamedArgs.get('hline2'));

      const plot1Id = this.resolveFillPlotId(this.getOrderedCallArg(args, canonicalNamedArgs, fillArgs, 0), ctx);
      const plot2Id = this.resolveFillPlotId(this.getOrderedCallArg(args, canonicalNamedArgs, fillArgs, 1), ctx);
      const color = this.toPlotColor(this.getOrderedCallArg(args, canonicalNamedArgs, fillArgs, 2, 'rgba(33, 150, 243, 0.2)'));
      const titleArg = this.getOrderedCallArg(args, canonicalNamedArgs, fillArgs, 3);
      const hasExplicitTitle = canonicalNamedArgs.has('title') || titleArg !== undefined;
      const title = (titleArg ?? 'Fill') as string;
      const editable = this.toOptionalBoolean(this.getOrderedCallArg(args, canonicalNamedArgs, fillArgs, 4));
      const showLast = this.toOptionalInteger(this.getOrderedCallArg(args, canonicalNamedArgs, fillArgs, 5));
      const fillgaps = this.toOptionalBoolean(this.getOrderedCallArg(args, canonicalNamedArgs, fillArgs, 6));
      const display = this.toOptionalInteger(this.getOrderedCallArg(args, canonicalNamedArgs, fillArgs, 7));

      const id = hasExplicitTitle ? `fill_${title}` : `fill_${callId}`;

      if (ctx.bar_index === 0) {
        ctx.registerPlot({
          id,
          type: 'fill',
          title,
          color: [],
          plot1Id,
          plot2Id,
          editable,
          showLast,
          fillgaps,
          display,
        });
      }

      // Add color for this bar (supports dynamic colors)
      const plot = ctx.plots.get(id);
      if (plot && Array.isArray(plot.color)) {
        plot.color.push(color);
      }

      // Fill doesn't have a value per se, but we track it for consistency
      ctx.addPlotValue(id, 1);
      return null;
    });
  }

  private resolveFillPlotId(value: unknown, ctx: ExecutionContext): string {
    const reference = String(value);
    if (ctx.plots.has(reference)) {
      return reference;
    }

    for (const prefix of ['plot_', 'hline_']) {
      const id = `${prefix}${reference}`;
      if (ctx.plots.has(id)) {
        return id;
      }
    }

    return reference.startsWith('plot_') || reference.startsWith('hline_') ? reference : `plot_${reference}`;
  }

  private normalizeAlertFrequency(value: unknown): AlertFrequency {
    if (value === 'all' || value === 'once_per_bar_close' || value === 'once_per_bar') {
      return value;
    }
    return 'once_per_bar';
  }

  private registerAlertBuiltins(): void {
    this.builtins.set('alertcondition', (args, namedArgs, ctx, _scope, callId) => {
      const condition = namedArgs.has('condition') ? namedArgs.get('condition') : args[0];
      const title = String(namedArgs.get('title') ?? args[1] ?? callId);
      const message = String(namedArgs.get('message') ?? args[2] ?? '');
      const id = `alertcondition_${title}`;
      const isActive = this.isTruthy(condition);

      if (!ctx.alerts.has(id)) {
        ctx.registerAlert({
          id,
          type: 'alertcondition',
          title,
          message,
          renderedMessages: [],
        });
      }

      ctx.setAlertConditionValue(id, isActive ? true : null, isActive ? this.renderAlertConditionMessage(message, ctx) : null);
      return condition;
    });

    this.builtins.set('alert', (args, namedArgs, ctx, _scope, callId) => {
      const message = String(namedArgs.get('message') ?? args[0] ?? '');
      const frequency = this.normalizeAlertFrequency(namedArgs.get('freq') ?? args[1]);
      const id = `alert_${callId}`;

      ctx.addAlertEvent(id, message, frequency);
      return undefined;
    });

    this.builtins.set('alert.freq_all', () => 'all');
    this.builtins.set('alert.freq_once_per_bar', () => 'once_per_bar');
    this.builtins.set('alert.freq_once_per_bar_close', () => 'once_per_bar_close');
  }

  private renderAlertConditionMessage(message: string, ctx: ExecutionContext): string {
    return message.replace(/\{\{\s*([^{}]+?)\s*\}\}/g, (placeholder, rawName: string) => {
      const name = rawName.trim();
      const value = this.resolveAlertPlaceholder(name, ctx);
      return value === undefined ? placeholder : this.toStringValue(value);
    });
  }

  private resolveAlertPlaceholder(name: string, ctx: ExecutionContext): unknown {
    switch (name) {
      case 'open':
        return ctx.open.get(0);
      case 'high':
        return ctx.high.get(0);
      case 'low':
        return ctx.low.get(0);
      case 'close':
        return ctx.close.get(0);
      case 'volume':
        return ctx.volume.get(0);
      case 'ticker':
        return ctx.syminfo.ticker;
      case 'exchange':
        return ctx.syminfo.ticker.includes(':') ? ctx.syminfo.ticker.split(':')[0] : '';
      case 'interval':
        return ctx.timeframe.period;
      default:
        return this.resolveAlertPlotPlaceholder(name, ctx);
    }
  }

  private resolveAlertPlotPlaceholder(name: string, ctx: ExecutionContext): unknown {
    const indexMatch = /^plot_(\d+)$/.exec(name);
    if (indexMatch) {
      const index = Number(indexMatch[1]);
      const plot = ctx.getPlots().filter((output) => output.type === 'plot')[index];
      return plot?.values[ctx.bar_index];
    }

    const titleMatch = /^plot\("(.+)"\)$/.exec(name);
    if (titleMatch) {
      const title = titleMatch[1];
      const plot = ctx.getPlots().find((output) => output.type === 'plot' && output.title === title);
      return plot?.values[ctx.bar_index];
    }

    return undefined;
  }

  private registerInputBuiltins(): void {
    type InputType = InputDefinition['type'];
    type InputMetadata = Omit<InputDefinition, 'id' | 'type' | 'title' | 'defval'>;
    const inputRangeArgs = ['defval', 'title', 'minval', 'maxval', 'step', 'tooltip', 'inline', 'group', 'confirm', 'display', 'active'] as const;
    const inputOptionsArgs = ['defval', 'title', 'options', 'tooltip', 'inline', 'group', 'confirm', 'display', 'active'] as const;
    const inputSimpleArgs = ['defval', 'title', 'tooltip', 'inline', 'group', 'confirm', 'display', 'active'] as const;

    const inferInputType = (value: unknown): InputType => {
      if (typeof value === 'number') return Number.isInteger(value) ? 'int' : 'float';
      if (typeof value === 'boolean') return 'bool';
      if (typeof value === 'string') return 'string';
      return 'source';
    };

    const inputArg = (
      args: unknown[],
      namedArgs: Map<string, unknown>,
      names: readonly string[],
      index: number,
      fallback?: unknown,
    ): unknown => this.getOrderedCallArg(args, namedArgs, names, index, fallback);

    const optionalNumberArg = (
      args: unknown[],
      namedArgs: Map<string, unknown>,
      names: readonly string[],
      index: number,
    ): number | undefined => {
      const value = inputArg(args, namedArgs, names, index);
      if (value === undefined) return undefined;
      const number = this.toNumber(value);
      return Number.isFinite(number) ? number : undefined;
    };

    const optionalStringArg = (
      args: unknown[],
      namedArgs: Map<string, unknown>,
      names: readonly string[],
      index: number,
    ): string | undefined => {
      return this.toOptionalString(inputArg(args, namedArgs, names, index));
    };

    const optionalBoolArg = (
      args: unknown[],
      namedArgs: Map<string, unknown>,
      names: readonly string[],
      index: number,
    ): boolean | undefined => {
      const value = inputArg(args, namedArgs, names, index);
      return value === undefined ? undefined : this.isTruthy(value);
    };

    const optionsArg = (args: unknown[], namedArgs: Map<string, unknown>, names: readonly string[]): unknown[] | undefined => {
      const value = inputArg(args, namedArgs, names, 2);
      return Array.isArray(value) ? value : undefined;
    };

    const commonMetadata = (
      args: unknown[],
      namedArgs: Map<string, unknown>,
      names: readonly string[],
      startIndex: number,
      includeConfirm = true,
    ): InputMetadata => {
      const metadata: InputMetadata = {
        tooltip: optionalStringArg(args, namedArgs, names, startIndex),
        inline: optionalStringArg(args, namedArgs, names, startIndex + 1),
        group: optionalStringArg(args, namedArgs, names, startIndex + 2),
        display: inputArg(args, namedArgs, names, startIndex + (includeConfirm ? 4 : 3)),
        active: inputArg(args, namedArgs, names, startIndex + (includeConfirm ? 5 : 4)),
      };
      if (includeConfirm) {
        metadata.confirm = optionalBoolArg(args, namedArgs, names, startIndex + 3);
      }
      return metadata;
    };

    const rangeMetadata = (args: unknown[], namedArgs: Map<string, unknown>, type: InputType): InputMetadata => {
      const positionalOptions = Array.isArray(inputArg(args, namedArgs, inputOptionsArgs, 2));
      const hasOptions = namedArgs.has('options') || positionalOptions;
      if (hasOptions && (namedArgs.has('minval') || namedArgs.has('maxval') || namedArgs.has('step'))) {
        throw new Error(`input.${type} cannot use options together with minval/maxval/step`);
      }
      const names = hasOptions ? inputOptionsArgs : inputRangeArgs;
      const metadata: InputMetadata = {
        options: optionsArg(args, namedArgs, names),
        ...commonMetadata(args, namedArgs, names, hasOptions ? 3 : 5),
      };

      if (!hasOptions && (type === 'int' || type === 'float')) {
        metadata.minval = optionalNumberArg(args, namedArgs, names, 2);
        metadata.maxval = optionalNumberArg(args, namedArgs, names, 3);
        metadata.step = optionalNumberArg(args, namedArgs, names, 4);
      }

      return metadata;
    };

    const metadataForInput = (type: InputType, args: unknown[], namedArgs: Map<string, unknown>): InputMetadata => {
      if (type === 'int' || type === 'float') {
        return rangeMetadata(args, namedArgs, type);
      }
      if (type === 'price') {
        return commonMetadata(args, namedArgs, inputSimpleArgs, 2);
      }
      if (type === 'string' || type === 'timeframe') {
        return {
          options: optionsArg(args, namedArgs, inputOptionsArgs),
          ...commonMetadata(args, namedArgs, inputOptionsArgs, 3),
        };
      }
      return commonMetadata(args, namedArgs, inputSimpleArgs, 2);
    };

    const validateInputDefault = (type: InputType, defval: unknown, metadata: InputMetadata): void => {
      if ((type === 'int' || type === 'float' || type === 'price' || type === 'time') && typeof defval !== 'number') {
        throw new Error(`input.${type} defval must be a number`);
      }
      if (type === 'int' && !Number.isInteger(defval)) {
        throw new Error('input.int defval must be an integer');
      }
      if (type === 'bool' && typeof defval !== 'boolean') {
        throw new Error('input.bool defval must be a boolean');
      }
      if ((type === 'string' || type === 'timeframe' || type === 'symbol' || type === 'session' || type === 'text_area') && typeof defval !== 'string') {
        throw new Error(`input.${type} defval must be a string`);
      }
      if (metadata.minval !== undefined && typeof defval === 'number' && defval < metadata.minval) {
        throw new Error(`input.${type} defval must be greater than or equal to minval`);
      }
      if (metadata.maxval !== undefined && typeof defval === 'number' && defval > metadata.maxval) {
        throw new Error(`input.${type} defval must be less than or equal to maxval`);
      }
      if (metadata.options !== undefined && !metadata.options.some((option) => Object.is(option, defval))) {
        throw new Error(`input.${type} defval must be one of options`);
      }
    };

    const createInputFunc = (type: InputType) => {
      return (args: unknown[], namedArgs: Map<string, unknown>, ctx: ExecutionContext) => {
        const defval = inputArg(args, namedArgs, inputSimpleArgs, 0);
        const title = this.toStringValue(inputArg(args, namedArgs, inputSimpleArgs, 1, type));
        const metadata = metadataForInput(type, args, namedArgs);

        const id = `input_${title}`;

        if (ctx.bar_index === 0) {
          validateInputDefault(type, defval, metadata);
          ctx.registerInput({
            id,
            type,
            title,
            defval,
            ...metadata,
          });
        }

        return ctx.getInput(id) ?? defval;
      };
    };

    this.builtins.set('input', (args, namedArgs, ctx) => {
      const defval = inputArg(args, namedArgs, inputSimpleArgs, 0);
      return createInputFunc(inferInputType(defval))(args, namedArgs, ctx);
    });
    this.builtins.set('input.int', createInputFunc('int'));
    this.builtins.set('input.float', createInputFunc('float'));
    this.builtins.set('input.bool', createInputFunc('bool'));
    this.builtins.set('input.string', createInputFunc('string'));
    this.builtins.set('input.color', createInputFunc('color'));
    this.builtins.set('input.price', createInputFunc('price'));
    this.builtins.set('input.time', createInputFunc('time'));
    this.builtins.set('input.timeframe', createInputFunc('timeframe'));
    this.builtins.set('input.symbol', createInputFunc('symbol'));
    this.builtins.set('input.session', createInputFunc('session'));
    this.builtins.set('input.text_area', createInputFunc('text_area'));

    // input.source is special - it returns a series
    this.builtins.set('input.source', (args, namedArgs, ctx) => {
      const defval = inputArg(args, namedArgs, inputSimpleArgs, 0); // Should be a series like 'close'
      const title = this.toStringValue(inputArg(args, namedArgs, inputSimpleArgs, 1, 'Source'));
      const id = `input_${title}`;
      const metadata = {
        tooltip: optionalStringArg(args, namedArgs, inputSimpleArgs, 2),
        inline: optionalStringArg(args, namedArgs, inputSimpleArgs, 3),
        group: optionalStringArg(args, namedArgs, inputSimpleArgs, 4),
        confirm: optionalBoolArg(args, namedArgs, inputSimpleArgs, 5),
        display: inputArg(args, namedArgs, inputSimpleArgs, 6),
        active: inputArg(args, namedArgs, inputSimpleArgs, 7),
      };

      if (ctx.bar_index === 0) {
        ctx.registerInput({
          id,
          type: 'source',
          title,
          defval,
          ...metadata,
        });
      }

      const inputValue = ctx.getInput(id);
      const registeredDefault = ctx.inputDefinitions.find((input) => input.id === id)?.defval;
      if (inputValue === undefined || inputValue === registeredDefault) {
        return defval;
      }
      return this.resolveInputSourceValue(inputValue, ctx);
    });
  }

  private resolveInputSourceValue(value: unknown, ctx: ExecutionContext): unknown {
    if (typeof value !== 'string') return value;

    switch (value) {
      case 'open':
        return ctx.open.get(0);
      case 'high':
        return ctx.high.get(0);
      case 'low':
        return ctx.low.get(0);
      case 'close':
        return ctx.close.get(0);
      case 'hl2':
        return ctx.hl2;
      case 'hlc3':
        return ctx.hlc3;
      case 'ohlc4':
        return ctx.ohlc4;
      case 'hlcc4':
        return ctx.hlcc4;
      default:
        return value;
    }
  }

  private registerMathBuiltins(): void {
    this.builtins.set('math.pi', () => Math.PI);
    this.builtins.set('math.e', () => Math.E);
    this.builtins.set('math.phi', () => (1 + Math.sqrt(5)) / 2);
    const unaryMath = (name: string, fn: (value: number) => number): void => {
      this.builtins.set(name, (args, namedArgs) => fn(this.toNumber(this.getCallArg(args, namedArgs, 0, 'number'))));
    };

    unaryMath('math.abs', Math.abs);
    this.builtins.set('math.max', (args) => Math.max(...(args as number[])));
    this.builtins.set('math.min', (args) => Math.min(...(args as number[])));
    this.builtins.set('math.avg', (args) => {
      if (args.length === 0) return Number.NaN;
      const values = args.map((arg) => this.toNumber(arg));
      if (values.some((value) => Number.isNaN(value))) return Number.NaN;
      return values.reduce((sum, value) => sum + value, 0) / values.length;
    });
    this.builtins.set('math.sum', (args, namedArgs, _ctx, scope, callId) => {
      const mathSumArgs = ['source', 'length'];
      const source = this.toNumber(this.getOrderedCallArg(args, namedArgs, mathSumArgs, 0));
      const length = this.normalizeLookbackLength(this.getOrderedCallArg(args, namedArgs, mathSumArgs, 1));
      const values = this.getCompleteNonNaSourceWindow(scope, `_math_sum_source_${callId}`, source, length);
      return values ? values.reduce((sum, value) => sum + value, 0) : Number.NaN;
    });
    this.builtins.set('math.random', (args, namedArgs, _ctx, scope, callId) => {
      const mathRandomArgs = ['min', 'max', 'seed'];
      const min = this.toNumber(this.getOrderedCallArg(args, namedArgs, mathRandomArgs, 0, 0));
      const max = this.toNumber(this.getOrderedCallArg(args, namedArgs, mathRandomArgs, 1, 1));
      const seedArg = this.getOrderedCallArg(args, namedArgs, mathRandomArgs, 2);
      if (!Number.isFinite(min) || !Number.isFinite(max) || max <= min) return Number.NaN;

      let randomValue: number;
      if (seedArg === undefined) {
        randomValue = this.nextSeededRandom(scope, `_math_random_${callId}`, this.hashRandomCallId(callId));
      } else {
        const seed = Math.trunc(this.toNumber(seedArg));
        if (!Number.isFinite(seed)) return Number.NaN;
        randomValue = this.nextSeededRandom(scope, `_math_random_${callId}`, seed);
      }

      return min + this.toExclusiveUnitRandom(randomValue) * (max - min);
    });
    unaryMath('math.sqrt', Math.sqrt);
    this.builtins.set('math.pow', (args, namedArgs) => {
      const mathPowArgs = ['base', 'exponent'];
      const base = this.toNumber(this.getOrderedCallArg(args, namedArgs, mathPowArgs, 0));
      const exponent = this.toNumber(this.getOrderedCallArg(args, namedArgs, mathPowArgs, 1));
      return Math.pow(base, exponent);
    });
    unaryMath('math.log', Math.log);
    unaryMath('math.log10', Math.log10);
    unaryMath('math.exp', Math.exp);
    this.builtins.set('math.round', (args, namedArgs) => {
      const mathRoundArgs = ['number', 'precision'];
      const value = this.toNumber(this.getOrderedCallArg(args, namedArgs, mathRoundArgs, 0));
      const precisionArg = this.getOrderedCallArg(args, namedArgs, mathRoundArgs, 1);
      const precision = precisionArg === undefined ? 0 : Math.trunc(this.toNumber(precisionArg));
      const factor = 10 ** precision;
      return Math.round(value * factor) / factor;
    });
    this.builtins.set('math.round_to_mintick', (args, namedArgs) => {
      const value = this.toNumber(this.getCallArg(args, namedArgs, 0, 'number'));
      const tick = this.ctx.syminfo.mintick;
      return this.roundToMintick(value, tick);
    });
    unaryMath('math.trunc', Math.trunc);
    unaryMath('math.floor', Math.floor);
    unaryMath('math.ceil', Math.ceil);
    unaryMath('math.sign', Math.sign);
    unaryMath('math.sin', Math.sin);
    unaryMath('math.cos', Math.cos);
    unaryMath('math.tan', Math.tan);
    unaryMath('math.asin', Math.asin);
    unaryMath('math.acos', Math.acos);
    unaryMath('math.atan', Math.atan);
    unaryMath('math.toradians', (number) => number * (Math.PI / 180));
    unaryMath('math.todegrees', (number) => number * (180 / Math.PI));

    // nz - replace na with value
    this.builtins.set('nz', (args, namedArgs) => {
      const nzArgs = ['source', 'replacement'];
      const value = this.getOrderedCallArg(args, namedArgs, nzArgs, 0);
      const replacement = this.getOrderedCallArg(args, namedArgs, nzArgs, 1, 0);
      this.rejectBoolNaHelperArgs('nz', [value, replacement]);
      return this.isNa(value) ? replacement : value;
    });

    this.builtins.set('fixnan', (args, namedArgs, _ctx, scope, callId) => {
      const value = this.getCallArg(args, namedArgs, 0, 'source');
      this.rejectBoolNaHelperArgs('fixnan', [value]);
      const key = `_fixnan_${callId}`;
      if (this.isNa(value)) {
        return scope.has(key) ? scope.get(key) : Number.NaN;
      }
      this.setBuiltinState(scope, key, value);
      return value;
    });

    this.builtins.set('float', (args, namedArgs) => this.toNumber(this.getCallArg(args, namedArgs, 0, 'x')));
    this.builtins.set('int', (args, namedArgs) => {
      const value = this.toNumber(this.getCallArg(args, namedArgs, 0, 'x'));
      return Number.isNaN(value) ? Number.NaN : Math.trunc(value);
    });
    this.builtins.set('bool', (args, namedArgs) => this.isTruthy(this.getCallArg(args, namedArgs, 0, 'x')));
    this.builtins.set('string', (args, namedArgs) => this.toStringValue(this.getCallArg(args, namedArgs, 0, 'x')));

    // na function
    this.builtins.set('na', (args, namedArgs) => {
      if (args.length === 0 && !namedArgs.has('x')) return NaN;
      const value = this.getCallArg(args, namedArgs, 0, 'x');
      return typeof value === 'number' && isNaN(value);
    });
  }

  private rejectBoolNaHelperArgs(functionName: 'nz' | 'fixnan', args: unknown[]): void {
    if (args.some((value) => typeof value === 'boolean')) {
      throw new Error(`${functionName}() does not accept bool arguments in Pine v6`);
    }
  }

  private registerStringBuiltins(): void {
    const stringSourceArgs = [['source', 'string']] as const;
    const stringPatternArgs = [['source', 'string'], ['str', 'substring', 'target']] as const;
    const stringSubstringArgs = [['source', 'string'], ['begin_pos'], ['end_pos']] as const;
    const stringMatchArgs = [['source', 'string'], ['regex', 'pattern']] as const;
    const stringRepeatArgs = [['source', 'string'], ['count', 'repeat_count'], ['separator']] as const;
    const stringSplitArgs = [['source', 'string'], ['separator']] as const;
    const stringReplaceArgs = [['source', 'string'], ['target', 'str', 'substring'], ['replacement'], ['occurrence']] as const;
    const stringReplaceAllArgs = [['source', 'string'], ['target', 'str', 'substring'], ['replacement']] as const;
    const getOrderedStringArg = (
      args: unknown[],
      namedArgs: Map<string, unknown>,
      params: readonly (readonly string[])[],
      index: number,
      fallback?: unknown,
      label = params[index]?.join('/') ?? `arg${index}`,
    ): unknown => {
      const names = params[index] ?? [];
      const matches = names.filter((name) => namedArgs.has(name));
      if (matches.length > 1) {
        throw new Error(`Argument ${label} was supplied multiple times: ${matches.join(', ')}`);
      }
      if (matches.length === 1) return namedArgs.get(matches[0]);

      const priorNamedCount = params
        .slice(0, index)
        .filter((priorNames) => priorNames.some((name) => namedArgs.has(name))).length;
      const positionalIndex = index - priorNamedCount;
      return args[positionalIndex] !== undefined ? args[positionalIndex] : fallback;
    };

    this.builtins.set('str.tostring', (args, namedArgs) => {
      const value = this.getOrderedCallArg(args, namedArgs, ['value', 'format'], 0);
      const format = this.getOrderedCallArg(args, namedArgs, ['value', 'format'], 1) as string | undefined;
      return this.toStringValue(value, format);
    });
    this.builtins.set('str.tonumber', (args, namedArgs) => {
      const source = this.toStringValue(this.getCallArg(args, namedArgs, 0, 'string'));
      return this.parsePineStringNumber(source);
    });
    this.builtins.set('str.format_time', (args, namedArgs) => {
      const formatTimeArgs = ['time', 'format', 'timezone'];
      const timestampArg = this.getOrderedCallArg(args, namedArgs, formatTimeArgs, 0, this.ctx.time.get(0));
      const formatArg = this.getOrderedCallArg(args, namedArgs, formatTimeArgs, 1);
      const timezoneArg = this.getOrderedCallArg(args, namedArgs, formatTimeArgs, 2);
      const timestamp = this.toNumber(timestampArg);
      const format = formatArg === undefined || formatArg === '' ? "yyyy-MM-dd'T'HH:mm:ssZ" : this.toStringValue(formatArg);
      const timezone = timezoneArg === undefined || timezoneArg === '' ? this.ctx.syminfo.timezone : this.toStringValue(timezoneArg);
      return this.formatTimestamp(timestamp, format, timezone);
    });

    this.builtins.set('str.format', (args, namedArgs) => {
      const template = this.toStringValue(namedArgs.get('format') ?? args[0]);
      const valueOffset = namedArgs.has('format') ? 0 : 1;
      return template.replace(/\{(\d+)(?:,[^}:]+)?(?::([^}]+))?\}/g, (_match, index: string, format: string | undefined) => {
        return this.toStringValue(args[Number(index) + valueOffset], format);
      });
    });

    const stringSourceArg = (args: unknown[], namedArgs: Map<string, unknown>, index = 0) =>
      getOrderedStringArg(args, namedArgs, stringSourceArgs, index, undefined, 'str source/string');
    const stringPatternArg = (args: unknown[], namedArgs: Map<string, unknown>, index = 1) =>
      getOrderedStringArg(args, namedArgs, stringPatternArgs, index, undefined, 'str pattern');

    this.builtins.set('str.length', (args, namedArgs) => this.toStringValue(stringSourceArg(args, namedArgs)).length);
    this.builtins.set('str.contains', (args, namedArgs) =>
      this.toStringValue(stringSourceArg(args, namedArgs)).includes(this.toStringValue(stringPatternArg(args, namedArgs))),
    );
    this.builtins.set('str.startswith', (args, namedArgs) =>
      this.toStringValue(stringSourceArg(args, namedArgs)).startsWith(this.toStringValue(stringPatternArg(args, namedArgs))),
    );
    this.builtins.set('str.endswith', (args, namedArgs) =>
      this.toStringValue(stringSourceArg(args, namedArgs)).endsWith(this.toStringValue(stringPatternArg(args, namedArgs))),
    );
    this.builtins.set('str.pos', (args, namedArgs) => {
      const index = this.toStringValue(stringSourceArg(args, namedArgs)).indexOf(
        this.toStringValue(stringPatternArg(args, namedArgs)),
      );
      return index === -1 ? NaN : index;
    });
    this.builtins.set('str.substring', (args, namedArgs) => {
      const source = this.toStringValue(stringSourceArg(args, namedArgs));
      const beginArg = getOrderedStringArg(args, namedArgs, stringSubstringArgs, 1, 0, 'str.substring begin_pos');
      const endArg = getOrderedStringArg(args, namedArgs, stringSubstringArgs, 2, undefined, 'str.substring end_pos');
      const begin = Math.trunc(this.toNumber(beginArg));
      const end = endArg === undefined ? undefined : Math.trunc(this.toNumber(endArg));
      return source.substring(begin, end);
    });
    this.builtins.set('str.match', (args, namedArgs) => {
      const regexArg = getOrderedStringArg(args, namedArgs, stringMatchArgs, 1, undefined, 'str.match regex');
      const match = this.toStringValue(stringSourceArg(args, namedArgs)).match(new RegExp(this.toStringValue(regexArg)));
      return match?.[0] ?? '';
    });
    this.builtins.set('str.repeat', (args, namedArgs) => {
      const sourceArg = stringSourceArg(args, namedArgs);
      if (this.isNa(sourceArg)) return Number.NaN;
      const repeat = Math.trunc(
        this.toNumber(getOrderedStringArg(args, namedArgs, stringRepeatArgs, 1, undefined, 'str.repeat count')),
      );
      if (!Number.isFinite(repeat) || repeat < 0) return Number.NaN;
      const separator = getOrderedStringArg(args, namedArgs, stringRepeatArgs, 2, '', 'str.repeat separator');
      return Array.from({ length: repeat }, () => this.toStringValue(sourceArg)).join(this.toStringValue(separator));
    });
    this.builtins.set('str.split', (args, namedArgs) => {
      const array = createPineArray<string>();
      array.values.push(
        ...this.toStringValue(stringSourceArg(args, namedArgs)).split(
          this.toStringValue(getOrderedStringArg(args, namedArgs, stringSplitArgs, 1, undefined, 'str.split separator')),
        ),
      );
      return array;
    });
    this.builtins.set('str.upper', (args, namedArgs) => this.toStringValue(stringSourceArg(args, namedArgs)).toUpperCase());
    this.builtins.set('str.lower', (args, namedArgs) => this.toStringValue(stringSourceArg(args, namedArgs)).toLowerCase());
    this.builtins.set('str.trim', (args, namedArgs) => this.toStringValue(stringSourceArg(args, namedArgs)).trim());
    this.builtins.set('str.replace', (args, namedArgs) => {
      return this.replaceStringOccurrence(
        this.toStringValue(stringSourceArg(args, namedArgs)),
        this.toStringValue(stringPatternArg(args, namedArgs)),
        this.toStringValue(getOrderedStringArg(args, namedArgs, stringReplaceArgs, 2, undefined, 'str.replace replacement')),
        getOrderedStringArg(args, namedArgs, stringReplaceArgs, 3, undefined, 'str.replace occurrence'),
      );
    });
    this.builtins.set('str.replace_all', (args, namedArgs) => {
      return this.toStringValue(stringSourceArg(args, namedArgs))
        .split(this.toStringValue(stringPatternArg(args, namedArgs)))
        .join(
          this.toStringValue(
            getOrderedStringArg(args, namedArgs, stringReplaceAllArgs, 2, undefined, 'str.replace_all replacement'),
          ),
        );
    });
  }

  private registerArrayBuiltins(): void {
    const createArray = (args: unknown[], namedArgs: Map<string, unknown>) => {
      const size = this.getCallArg(args, namedArgs, 0, 'size') as number | undefined;
      const initialValue = namedArgs.has('initial_value')
        ? namedArgs.get('initial_value')
        : args[namedArgs.has('size') ? 0 : 1];
      return createPineArray(size, initialValue);
    };
    const readArray = (value: unknown): PineArray | unknown[] => {
      if (Array.isArray(value)) {
        return value;
      }
      if (!isPineArray(value)) {
        throw new Error('Expected array');
      }
      return value;
    };
    const readMutableArray = (value: unknown): PineArray => {
      if (!isPineArray(value)) {
        throw new Error('Expected mutable array');
      }
      return value;
    };
    const copyReadonlyArray = (value: PineArray | unknown[]): PineArray => {
      if (Array.isArray(value)) {
        const array = createPineArray(value.length);
        value.forEach((item, index) => {
          array.values[index] = item;
        });
        return array;
      }
      return value;
    };
    const isArrayLike = (value: unknown): boolean => Array.isArray(value) || isPineArray(value);
    const arrayReceiverArg = (args: unknown[], namedArgs: Map<string, unknown>): unknown => {
      return isArrayLike(args[0]) ? args[0] : namedArgs.has('id') ? namedArgs.get('id') : args[0];
    };
    const arrayCallArg = (
      args: unknown[],
      namedArgs: Map<string, unknown>,
      index: number,
      name: string,
      fallback?: unknown,
      priorNames: string[] = index > 0 ? ['id'] : [],
    ): unknown => {
      const positionalIndex = index - priorNames.filter((priorName) => namedArgs.has(priorName)).length;
      return this.getCallArg(args, namedArgs, positionalIndex, name, fallback);
    };
    const readArrayFromCall = (args: unknown[], namedArgs: Map<string, unknown>): PineArray | unknown[] => {
      return readArray(arrayReceiverArg(args, namedArgs));
    };
    const readMutableArrayFromCall = (args: unknown[], namedArgs: Map<string, unknown>): PineArray => {
      return readMutableArray(arrayReceiverArg(args, namedArgs));
    };
    const arrayPairFirstArg = (args: unknown[], namedArgs: Map<string, unknown>): unknown => {
      return namedArgs.has('id1') || namedArgs.has('id') ? this.getCallArgAny(args, namedArgs, 0, ['id1', 'id']) : args[0];
    };
    const arrayPairSecondArg = (args: unknown[], namedArgs: Map<string, unknown>): unknown => {
      return arrayCallArg(args, namedArgs, 1, 'id2', undefined, ['id1', 'id']);
    };

    this.builtins.set('array.new', createArray);
    this.builtins.set('array.new_float', createArray);
    this.builtins.set('array.new_int', createArray);
    this.builtins.set('array.new_bool', createArray);
    this.builtins.set('array.new_string', createArray);
    this.builtins.set('array.new_color', createArray);
    this.builtins.set('array.new_label', createArray);
    this.builtins.set('array.new_line', createArray);
    this.builtins.set('array.new_box', createArray);
    this.builtins.set('array.new_linefill', createArray);
    this.builtins.set('array.new_polyline', createArray);
    this.builtins.set('array.new_table', createArray);
    this.builtins.set('array.from', (args) => {
      const array = createPineArray();
      array.values.push(...args);
      return array;
    });
    this.builtins.set('array.copy', (args, namedArgs) => copyArray(copyReadonlyArray(readArrayFromCall(args, namedArgs))));

    this.builtins.set('array.size', (args, namedArgs) => {
      const array = readArrayFromCall(args, namedArgs);
      return Array.isArray(array) ? array.length : getArraySize(array);
    });
    this.builtins.set('array.get', (args, namedArgs) => {
      const array = readArrayFromCall(args, namedArgs);
      const index = arrayCallArg(args, namedArgs, 1, 'index') as number;
      return Array.isArray(array) ? array[Math.trunc(index)] : getArrayValue(array, index);
    });
    this.builtins.set('array.first', (args, namedArgs) => firstArrayValue(copyReadonlyArray(readArrayFromCall(args, namedArgs))));
    this.builtins.set('array.last', (args, namedArgs) => lastArrayValue(copyReadonlyArray(readArrayFromCall(args, namedArgs))));
    this.builtins.set('array.includes', (args, namedArgs) => includesArrayValue(copyReadonlyArray(readArrayFromCall(args, namedArgs)), arrayCallArg(args, namedArgs, 1, 'value')));
    this.builtins.set('array.every', (args, namedArgs) => {
      const array = copyReadonlyArray(readArrayFromCall(args, namedArgs));
      for (let index = 0; index < getArraySize(array); index++) {
        if (!this.isTruthy(getArrayValue(array, index))) return false;
      }
      return true;
    });
    this.builtins.set('array.some', (args, namedArgs) => {
      const array = copyReadonlyArray(readArrayFromCall(args, namedArgs));
      for (let index = 0; index < getArraySize(array); index++) {
        if (this.isTruthy(getArrayValue(array, index))) return true;
      }
      return false;
    });
    this.builtins.set('array.indexof', (args, namedArgs) => indexOfArrayValue(copyReadonlyArray(readArrayFromCall(args, namedArgs)), arrayCallArg(args, namedArgs, 1, 'value')));
    this.builtins.set('array.lastindexof', (args, namedArgs) => lastIndexOfArrayValue(copyReadonlyArray(readArrayFromCall(args, namedArgs)), arrayCallArg(args, namedArgs, 1, 'value')));
    this.builtins.set('array.binary_search', (args, namedArgs) => binarySearchArrayValue(copyReadonlyArray(readArrayFromCall(args, namedArgs)), arrayCallArg(args, namedArgs, 1, 'value')));
    this.builtins.set('array.binary_search_leftmost', (args, namedArgs) => binarySearchLeftmostArrayValue(copyReadonlyArray(readArrayFromCall(args, namedArgs)), arrayCallArg(args, namedArgs, 1, 'value')));
    this.builtins.set('array.binary_search_rightmost', (args, namedArgs) => binarySearchRightmostArrayValue(copyReadonlyArray(readArrayFromCall(args, namedArgs)), arrayCallArg(args, namedArgs, 1, 'value')));
    this.builtins.set('array.abs', (args, namedArgs) => absArrayValue(copyReadonlyArray(readArrayFromCall(args, namedArgs))));
    this.builtins.set('array.min', (args, namedArgs) => minArrayValue(copyReadonlyArray(readArrayFromCall(args, namedArgs))));
    this.builtins.set('array.max', (args, namedArgs) => maxArrayValue(copyReadonlyArray(readArrayFromCall(args, namedArgs))));
    this.builtins.set('array.sum', (args, namedArgs) => sumArrayValue(copyReadonlyArray(readArrayFromCall(args, namedArgs))));
    this.builtins.set('array.avg', (args, namedArgs) => avgArrayValue(copyReadonlyArray(readArrayFromCall(args, namedArgs))));
    this.builtins.set('array.range', (args, namedArgs) => rangeArrayValue(copyReadonlyArray(readArrayFromCall(args, namedArgs))));
    this.builtins.set('array.median', (args, namedArgs) => medianArrayValue(copyReadonlyArray(readArrayFromCall(args, namedArgs))));
    this.builtins.set('array.mode', (args, namedArgs) => modeArrayValue(copyReadonlyArray(readArrayFromCall(args, namedArgs))));
    this.builtins.set('array.variance', (args, namedArgs) => varianceArrayValue(
      copyReadonlyArray(readArrayFromCall(args, namedArgs)),
      this.isTruthy(arrayCallArg(args, namedArgs, 1, 'biased', true)),
    ));
    this.builtins.set('array.stdev', (args, namedArgs) => stdevArrayValue(
      copyReadonlyArray(readArrayFromCall(args, namedArgs)),
      this.isTruthy(arrayCallArg(args, namedArgs, 1, 'biased', true)),
    ));
    this.builtins.set('array.covariance', (args, namedArgs) => covarianceArrayValue(
      copyReadonlyArray(readArray(arrayPairFirstArg(args, namedArgs))),
      copyReadonlyArray(readArray(arrayPairSecondArg(args, namedArgs))),
      this.isTruthy(arrayCallArg(args, namedArgs, 2, 'biased', true, ['id1', 'id', 'id2'])),
    ));
    this.builtins.set('array.percentile_nearest_rank', (args, namedArgs) => percentileNearestRankArrayValue(
      copyReadonlyArray(readArrayFromCall(args, namedArgs)),
      this.toNumber(arrayCallArg(args, namedArgs, 1, 'percentage')),
    ));
    this.builtins.set('array.percentile_linear_interpolation', (args, namedArgs) => percentileLinearInterpolationArrayValue(
      copyReadonlyArray(readArrayFromCall(args, namedArgs)),
      this.toNumber(arrayCallArg(args, namedArgs, 1, 'percentage')),
    ));
    this.builtins.set('array.percentrank', (args, namedArgs) => percentRankArrayValue(
      copyReadonlyArray(readArrayFromCall(args, namedArgs)),
      this.toNumber(arrayCallArg(args, namedArgs, 1, 'value')),
    ));
    this.builtins.set('array.standardize', (args, namedArgs) => standardizeArrayValue(copyReadonlyArray(readArrayFromCall(args, namedArgs))));
    this.builtins.set('array.set', (args, namedArgs) => {
      setArrayValue(
        readMutableArrayFromCall(args, namedArgs),
        arrayCallArg(args, namedArgs, 1, 'index') as number,
        arrayCallArg(args, namedArgs, 2, 'value', undefined, ['id', 'index']),
      );
      return null;
    });
    this.builtins.set('array.push', (args, namedArgs) => pushArrayValue(readMutableArrayFromCall(args, namedArgs), arrayCallArg(args, namedArgs, 1, 'value')));
    this.builtins.set('array.pop', (args, namedArgs) => popArrayValue(readMutableArrayFromCall(args, namedArgs)));
    this.builtins.set('array.shift', (args, namedArgs) => shiftArrayValue(readMutableArrayFromCall(args, namedArgs)));
    this.builtins.set('array.unshift', (args, namedArgs) => unshiftArrayValue(readMutableArrayFromCall(args, namedArgs), arrayCallArg(args, namedArgs, 1, 'value')));
    this.builtins.set('array.insert', (args, namedArgs) => insertArrayValue(
      readMutableArrayFromCall(args, namedArgs),
      arrayCallArg(args, namedArgs, 1, 'index') as number,
      arrayCallArg(args, namedArgs, 2, 'value', undefined, ['id', 'index']),
    ));
    this.builtins.set('array.remove', (args, namedArgs) => removeArrayValue(readMutableArrayFromCall(args, namedArgs), arrayCallArg(args, namedArgs, 1, 'index') as number));
    this.builtins.set('array.sort', (args, namedArgs) => {
      sortArray(
        readMutableArrayFromCall(args, namedArgs),
        arrayCallArg(args, namedArgs, 1, 'order'),
        arrayCallArg(args, namedArgs, 2, 'sort_field', undefined, ['id', 'order']),
      );
      return null;
    });
    this.builtins.set('array.sort_indices', (args, namedArgs) => sortIndicesArrayValue(
      copyReadonlyArray(readArrayFromCall(args, namedArgs)),
      arrayCallArg(args, namedArgs, 1, 'order'),
    ));
    this.builtins.set('array.reverse', (args, namedArgs) => {
      reverseArray(readMutableArrayFromCall(args, namedArgs));
      return null;
    });
    this.builtins.set('array.join', (args, namedArgs) => joinArray(copyReadonlyArray(readArrayFromCall(args, namedArgs)), arrayCallArg(args, namedArgs, 1, 'separator')));
    this.builtins.set('array.concat', (args, namedArgs) => concatArray(readMutableArrayFromCall(args, namedArgs), copyReadonlyArray(readArray(arrayCallArg(args, namedArgs, 1, 'id2')))));
    this.builtins.set('array.slice', (args, namedArgs) => sliceArray(
      copyReadonlyArray(readArrayFromCall(args, namedArgs)),
      arrayCallArg(args, namedArgs, 1, 'index_from') as number,
      arrayCallArg(args, namedArgs, 2, 'index_to', undefined, ['id', 'index_from']) as number,
    ));
    this.builtins.set('array.fill', (args, namedArgs) => {
      const array = readMutableArrayFromCall(args, namedArgs);
      const size = getArraySize(array);
      const indexFromArg = arrayCallArg(args, namedArgs, 2, 'index_from', undefined, ['id', 'value']);
      const indexToArg = arrayCallArg(args, namedArgs, 3, 'index_to', undefined, ['id', 'value', 'index_from']);
      const from = indexFromArg === undefined ? 0 : Math.trunc(this.toNumber(indexFromArg));
      const to = indexToArg === undefined ? size : Math.trunc(this.toNumber(indexToArg));
      if (!Number.isFinite(from) || !Number.isFinite(to) || from < 0 || to > size || from > to) {
        throw new Error('Array fill indices are out of bounds');
      }
      for (let index = from; index < to; index++) {
        setArrayValue(array, index, arrayCallArg(args, namedArgs, 1, 'value'));
      }
      return null;
    });
    this.builtins.set('array.clear', (args, namedArgs) => {
      clearArray(readMutableArrayFromCall(args, namedArgs));
      return null;
    });
  }

  private registerMatrixBuiltins(): void {
    const createMatrix = (args: unknown[], namedArgs: Map<string, unknown>) => createPineMatrix(
      this.getCallArg(args, namedArgs, 0, 'rows') as number | undefined,
      this.getCallArg(args, namedArgs, 1, 'columns') as number | undefined,
      this.getCallArg(args, namedArgs, 2, 'initial_value'),
    );
    const readMatrix = (value: unknown): PineMatrix => {
      if (!isPineMatrix(value)) {
        throw new Error('Expected matrix');
      }
      return value;
    };
    const readMatrixArithmeticOperand = (value: unknown): PineMatrix | number => {
      return isPineMatrix(value) ? value : this.toNumber(value);
    };
    const readMatrixMultOperand = (value: unknown): PineMatrix | PineArray | number => {
      if (isPineMatrix(value) || isPineArray(value)) {
        return value;
      }
      return this.toNumber(value);
    };
    const matrixCallArg = (
      args: unknown[],
      namedArgs: Map<string, unknown>,
      index: number,
      name: string,
      fallback?: unknown,
      priorNames: string[] = index > 0 ? ['id'] : [],
    ): unknown => {
      const positionalIndex = index - priorNames.filter((priorName) => namedArgs.has(priorName)).length;
      return this.getCallArg(args, namedArgs, positionalIndex, name, fallback);
    };
    const optionalMatrixCallRangeArg = (
      args: unknown[],
      namedArgs: Map<string, unknown>,
      index: number,
      name: string,
      priorNames?: string[],
    ): number | undefined => {
      const value = matrixCallArg(args, namedArgs, index, name, undefined, priorNames);
      return value === undefined ? undefined : this.toNumber(value);
    };
    const readInsertionArgs = (args: unknown[], namedArgs: Map<string, unknown>, indexName: 'row' | 'column'): [number | undefined, PineArray | undefined] => {
      const indexArg = matrixCallArg(args, namedArgs, 1, indexName);
      const arrayArg = matrixCallArg(args, namedArgs, 2, 'array_id', undefined, ['id', indexName]);
      if (indexArg === undefined) {
        if (arrayArg !== undefined && !isPineArray(arrayArg)) {
          throw new Error('Expected array');
        }
        return [undefined, arrayArg];
      }
      if (isPineArray(indexArg) && !namedArgs.has(indexName)) {
        return [undefined, indexArg];
      }
      if (arrayArg === undefined) {
        return [indexArg as number, undefined];
      }
      if (!isPineArray(arrayArg)) {
        throw new Error('Expected array');
      }
      return [indexArg as number, arrayArg];
    };
    const matrixPairFirstArg = (args: unknown[], namedArgs: Map<string, unknown>): unknown => {
      return isPineMatrix(args[0]) ? args[0] : this.getCallArgAny(args, namedArgs, 0, ['id1', 'id']);
    };
    const matrixPairSecondArg = (args: unknown[], namedArgs: Map<string, unknown>): unknown => {
      return matrixCallArg(args, namedArgs, 1, 'id2', undefined, ['id1', 'id']);
    };

    this.builtins.set('matrix.new', createMatrix);
    this.builtins.set('matrix.new_float', createMatrix);
    this.builtins.set('matrix.new_int', createMatrix);
    this.builtins.set('matrix.new_bool', createMatrix);
    this.builtins.set('matrix.new_string', createMatrix);
    this.builtins.set('matrix.new_color', createMatrix);
    this.builtins.set('matrix.rows', (args, namedArgs) => getMatrixRows(readMatrix(this.matrixReceiverArg(args, namedArgs))));
    this.builtins.set('matrix.columns', (args, namedArgs) => getMatrixColumns(readMatrix(this.matrixReceiverArg(args, namedArgs))));
    this.builtins.set('matrix.elements_count', (args, namedArgs) => getMatrixElementCount(readMatrix(this.matrixReceiverArg(args, namedArgs))));
    this.builtins.set('matrix.get', (args, namedArgs) => getMatrixValue(
      readMatrix(this.matrixReceiverArg(args, namedArgs)),
      matrixCallArg(args, namedArgs, 1, 'row') as number,
      matrixCallArg(args, namedArgs, 2, 'column', undefined, ['id', 'row']) as number,
    ));
    this.builtins.set('matrix.set', (args, namedArgs) => {
      setMatrixValue(
        readMatrix(this.matrixReceiverArg(args, namedArgs)),
        matrixCallArg(args, namedArgs, 1, 'row') as number,
        matrixCallArg(args, namedArgs, 2, 'column', undefined, ['id', 'row']) as number,
        matrixCallArg(args, namedArgs, 3, 'value', undefined, ['id', 'row', 'column']),
      );
      return null;
    });
    this.builtins.set('matrix.fill', (args, namedArgs) => {
      fillMatrix(
        readMatrix(this.matrixReceiverArg(args, namedArgs)),
        matrixCallArg(args, namedArgs, 1, 'value'),
        optionalMatrixCallRangeArg(args, namedArgs, 2, 'from_row', ['id', 'value']),
        optionalMatrixCallRangeArg(args, namedArgs, 3, 'to_row', ['id', 'value', 'from_row']),
        optionalMatrixCallRangeArg(args, namedArgs, 4, 'from_column', ['id', 'value', 'from_row', 'to_row']),
        optionalMatrixCallRangeArg(args, namedArgs, 5, 'to_column', ['id', 'value', 'from_row', 'to_row', 'from_column']),
      );
      return null;
    });
    this.builtins.set('matrix.reshape', (args, namedArgs) => {
      reshapeMatrix(
        readMatrix(this.matrixReceiverArg(args, namedArgs)),
        matrixCallArg(args, namedArgs, 1, 'rows') as number,
        matrixCallArg(args, namedArgs, 2, 'columns', undefined, ['id', 'rows']) as number,
      );
      return null;
    });
    this.builtins.set('matrix.add_row', (args, namedArgs) => {
      const [row, values] = readInsertionArgs(args, namedArgs, 'row');
      addMatrixRow(readMatrix(this.matrixReceiverArg(args, namedArgs)), row, values);
      return null;
    });
    this.builtins.set('matrix.add_col', (args, namedArgs) => {
      const [column, values] = readInsertionArgs(args, namedArgs, 'column');
      addMatrixColumn(readMatrix(this.matrixReceiverArg(args, namedArgs)), column, values);
      return null;
    });
    this.builtins.set('matrix.add_column', (args, namedArgs) => {
      const [column, values] = readInsertionArgs(args, namedArgs, 'column');
      addMatrixColumn(readMatrix(this.matrixReceiverArg(args, namedArgs)), column, values);
      return null;
    });
    this.builtins.set('matrix.remove_row', (args, namedArgs) => removeMatrixRow(
      readMatrix(this.matrixReceiverArg(args, namedArgs)),
      matrixCallArg(args, namedArgs, 1, 'row') as number,
    ));
    this.builtins.set('matrix.remove_col', (args, namedArgs) => removeMatrixColumn(
      readMatrix(this.matrixReceiverArg(args, namedArgs)),
      matrixCallArg(args, namedArgs, 1, 'column') as number,
    ));
    this.builtins.set('matrix.remove_column', (args, namedArgs) => removeMatrixColumn(
      readMatrix(this.matrixReceiverArg(args, namedArgs)),
      matrixCallArg(args, namedArgs, 1, 'column') as number,
    ));
    this.builtins.set('matrix.swap_rows', (args, namedArgs) => {
      swapMatrixRows(
        readMatrix(this.matrixReceiverArg(args, namedArgs)),
        matrixCallArg(args, namedArgs, 1, 'row1') as number,
        matrixCallArg(args, namedArgs, 2, 'row2', undefined, ['id', 'row1']) as number,
      );
      return null;
    });
    this.builtins.set('matrix.swap_columns', (args, namedArgs) => {
      swapMatrixColumns(
        readMatrix(this.matrixReceiverArg(args, namedArgs)),
        matrixCallArg(args, namedArgs, 1, 'column1') as number,
        matrixCallArg(args, namedArgs, 2, 'column2', undefined, ['id', 'column1']) as number,
      );
      return null;
    });
    this.builtins.set('matrix.reverse', (args, namedArgs) => {
      reverseMatrix(readMatrix(this.matrixReceiverArg(args, namedArgs)));
      return null;
    });
    this.builtins.set('matrix.transpose', (args, namedArgs) => transposeMatrix(readMatrix(this.matrixReceiverArg(args, namedArgs))));
    this.builtins.set('matrix.avg', (args, namedArgs) => avgMatrixValue(readMatrix(this.matrixReceiverArg(args, namedArgs))));
    this.builtins.set('matrix.min', (args, namedArgs) => minMatrixValue(readMatrix(this.matrixReceiverArg(args, namedArgs))));
    this.builtins.set('matrix.max', (args, namedArgs) => maxMatrixValue(readMatrix(this.matrixReceiverArg(args, namedArgs))));
    this.builtins.set('matrix.median', (args, namedArgs) => medianMatrixValue(readMatrix(this.matrixReceiverArg(args, namedArgs))));
    this.builtins.set('matrix.mode', (args, namedArgs) => modeMatrixValue(readMatrix(this.matrixReceiverArg(args, namedArgs))));
    this.builtins.set('matrix.sum', (args, namedArgs) => sumMatrixValue(readMatrix(matrixPairFirstArg(args, namedArgs)), readMatrixArithmeticOperand(matrixPairSecondArg(args, namedArgs))));
    this.builtins.set('matrix.diff', (args, namedArgs) => diffMatrixValue(readMatrix(matrixPairFirstArg(args, namedArgs)), readMatrixArithmeticOperand(matrixPairSecondArg(args, namedArgs))));
    this.builtins.set('matrix.mult', (args, namedArgs) => multMatrixValue(readMatrix(matrixPairFirstArg(args, namedArgs)), readMatrixMultOperand(matrixPairSecondArg(args, namedArgs))));
    this.builtins.set('matrix.pow', (args, namedArgs) => powMatrixValue(readMatrix(this.matrixReceiverArg(args, namedArgs)), this.toNumber(matrixCallArg(args, namedArgs, 1, 'power'))));
    this.builtins.set('matrix.trace', (args, namedArgs) => traceMatrixValue(readMatrix(this.matrixReceiverArg(args, namedArgs))));
    this.builtins.set('matrix.det', (args, namedArgs) => detMatrixValue(readMatrix(this.matrixReceiverArg(args, namedArgs))));
    this.builtins.set('matrix.rank', (args, namedArgs) => rankMatrixValue(readMatrix(this.matrixReceiverArg(args, namedArgs))));
    this.builtins.set('matrix.inv', (args, namedArgs) => invMatrixValue(readMatrix(this.matrixReceiverArg(args, namedArgs))));
    this.builtins.set('matrix.pinv', (args, namedArgs) => pinvMatrixValue(readMatrix(this.matrixReceiverArg(args, namedArgs))));
    this.builtins.set('matrix.eigenvalues', (args, namedArgs) => eigenvaluesMatrixValue(readMatrix(this.matrixReceiverArg(args, namedArgs))));
    this.builtins.set('matrix.eigenvectors', (args, namedArgs) => eigenvectorsMatrixValue(readMatrix(this.matrixReceiverArg(args, namedArgs))));
    this.builtins.set('matrix.kron', (args, namedArgs) => kronMatrixValue(readMatrix(matrixPairFirstArg(args, namedArgs)), readMatrix(matrixPairSecondArg(args, namedArgs))));
    this.builtins.set('matrix.sort', (args, namedArgs) => {
      sortMatrixRows(
        readMatrix(this.matrixReceiverArg(args, namedArgs)),
        matrixCallArg(args, namedArgs, 1, 'column') as number | undefined,
        matrixCallArg(args, namedArgs, 2, 'order', undefined, ['id', 'column']),
        matrixCallArg(args, namedArgs, 3, 'sort_field', undefined, ['id', 'column', 'order']),
      );
      return null;
    });
    this.builtins.set('matrix.submatrix', (args, namedArgs) => {
      const matrix = readMatrix(this.matrixReceiverArg(args, namedArgs));
      return submatrixValue(
        matrix,
        optionalMatrixCallRangeArg(args, namedArgs, 1, 'from_row'),
        optionalMatrixCallRangeArg(args, namedArgs, 2, 'to_row', ['id', 'from_row']),
        optionalMatrixCallRangeArg(args, namedArgs, 3, 'from_column', ['id', 'from_row', 'to_row']),
        optionalMatrixCallRangeArg(args, namedArgs, 4, 'to_column', ['id', 'from_row', 'to_row', 'from_column']),
      );
    });
    this.builtins.set('matrix.concat', (args, namedArgs) => {
      const matrix = namedArgs.has('id') || namedArgs.has('id1') ? readMatrix(this.getCallArgAny(args, namedArgs, 0, ['id1', 'id'])) : readMatrix(this.matrixReceiverArg(args, namedArgs));
      const other = namedArgs.has('id') || namedArgs.has('id1') ? this.getCallArg(args, namedArgs, 0, 'id2') : matrixCallArg(args, namedArgs, 1, 'id2', undefined, ['id1', 'id']);
      concatMatrix(matrix, readMatrix(other));
      return null;
    });
    this.builtins.set('matrix.copy', (args, namedArgs) => copyMatrix(readMatrix(this.matrixReceiverArg(args, namedArgs))));
    this.builtins.set('matrix.row', (args, namedArgs) => matrixRow(readMatrix(this.matrixReceiverArg(args, namedArgs)), matrixCallArg(args, namedArgs, 1, 'row') as number));
    this.builtins.set('matrix.col', (args, namedArgs) => matrixColumn(readMatrix(this.matrixReceiverArg(args, namedArgs)), matrixCallArg(args, namedArgs, 1, 'column') as number));
    this.builtins.set('matrix.column', (args, namedArgs) => matrixColumn(readMatrix(this.matrixReceiverArg(args, namedArgs)), matrixCallArg(args, namedArgs, 1, 'column') as number));
    this.builtins.set('matrix.is_square', (args, namedArgs) => {
      return isSquareMatrix(readMatrix(this.matrixReceiverArg(args, namedArgs)));
    });
    this.builtins.set('matrix.is_valid', (args, namedArgs) => isValidMatrix(this.matrixReceiverArg(args, namedArgs)));
    this.builtins.set('matrix.is_zero', (args, namedArgs) => isZeroMatrix(readMatrix(this.matrixReceiverArg(args, namedArgs))));
    this.builtins.set('matrix.is_binary', (args, namedArgs) => isBinaryMatrix(readMatrix(this.matrixReceiverArg(args, namedArgs))));
    this.builtins.set('matrix.is_identity', (args, namedArgs) => isIdentityMatrix(readMatrix(this.matrixReceiverArg(args, namedArgs))));
    this.builtins.set('matrix.is_diagonal', (args, namedArgs) => isDiagonalMatrix(readMatrix(this.matrixReceiverArg(args, namedArgs))));
    this.builtins.set('matrix.is_antidiagonal', (args, namedArgs) => isAntidiagonalMatrix(readMatrix(this.matrixReceiverArg(args, namedArgs))));
    this.builtins.set('matrix.is_symmetric', (args, namedArgs) => isSymmetricMatrix(readMatrix(this.matrixReceiverArg(args, namedArgs))));
    this.builtins.set('matrix.is_antisymmetric', (args, namedArgs) => isAntisymmetricMatrix(readMatrix(this.matrixReceiverArg(args, namedArgs))));
    this.builtins.set('matrix.is_triangular', (args, namedArgs) => isTriangularMatrix(readMatrix(this.matrixReceiverArg(args, namedArgs))));
    this.builtins.set('matrix.is_stochastic', (args, namedArgs) => isStochasticMatrix(readMatrix(this.matrixReceiverArg(args, namedArgs))));
  }

  private optionalMatrixRangeArg(args: unknown[], namedArgs: Map<string, unknown>, index: number, name: string): number | undefined {
    const value = this.getCallArg(args, namedArgs, index, name);
    return value === undefined ? undefined : this.toNumber(value);
  }

  private matrixReceiverArg(args: unknown[], namedArgs: Map<string, unknown>): unknown {
    return isPineMatrix(args[0]) ? args[0] : namedArgs.has('id') ? namedArgs.get('id') : args[0];
  }

  private registerMapBuiltins(): void {
    const readMap = (value: unknown): PineMap => {
      if (!isPineMap(value)) {
        throw new Error('Expected map');
      }
      return value;
    };

    this.builtins.set('map.new', () => createPineMap());
    this.builtins.set('map.size', (args, namedArgs) => getMapSize(readMap(this.mapReceiverArg(args, namedArgs))));
    this.builtins.set('map.put', (args, namedArgs) => {
      return putMapValue(
        readMap(this.mapReceiverArg(args, namedArgs, ['key', 'value'])),
        this.getMapCallArg(args, namedArgs, 1, 'key', undefined, ['id']),
        this.getMapCallArg(args, namedArgs, 2, 'value', undefined, ['id', 'key']),
      );
    });
    this.builtins.set('map.get', (args, namedArgs) => getMapValue(
      readMap(this.mapReceiverArg(args, namedArgs, ['key'])),
      this.getMapCallArg(args, namedArgs, 1, 'key', undefined, ['id']),
    ));
    this.builtins.set('map.contains', (args, namedArgs) => containsMapKey(
      readMap(this.mapReceiverArg(args, namedArgs, ['key'])),
      this.getMapCallArg(args, namedArgs, 1, 'key', undefined, ['id']),
    ));
    this.builtins.set('map.remove', (args, namedArgs) => removeMapValue(
      readMap(this.mapReceiverArg(args, namedArgs, ['key'])),
      this.getMapCallArg(args, namedArgs, 1, 'key', undefined, ['id']),
    ));
    this.builtins.set('map.clear', (args, namedArgs) => {
      clearMap(readMap(this.mapReceiverArg(args, namedArgs)));
      return null;
    });
    this.builtins.set('map.copy', (args, namedArgs) => copyMap(readMap(this.mapReceiverArg(args, namedArgs))));
    this.builtins.set('map.keys', (args, namedArgs) => mapKeys(readMap(this.mapReceiverArg(args, namedArgs))));
    this.builtins.set('map.values', (args, namedArgs) => mapValues(readMap(this.mapReceiverArg(args, namedArgs))));
    this.builtins.set('map.put_all', (args, namedArgs) => {
      putAllMapValues(
        readMap(this.mapReceiverArg(args, namedArgs, ['id2'])),
        readMap(this.getMapCallArg(args, namedArgs, 1, 'id2', undefined, ['id'])),
      );
      return null;
    });
  }

  private mapReceiverArg(args: unknown[], namedArgs: Map<string, unknown>, tailNames: readonly string[] = []): unknown {
    if (this.mapUsesPositionalReceiver(args, namedArgs, tailNames) && namedArgs.has('id')) {
      throw new Error("map call receiver was supplied multiple times (positional and named 'id')");
    }
    return this.mapUsesPositionalReceiver(args, namedArgs, tailNames) ? args[0] : namedArgs.has('id') ? namedArgs.get('id') : args[0];
  }

  private mapUsesPositionalReceiver(args: unknown[], namedArgs: Map<string, unknown>, tailNames: readonly string[] = []): boolean {
    if (!isPineMap(args[0])) return false;
    if (!namedArgs.has('id')) return true;

    const missingTailCount = tailNames.filter((tailName) => !namedArgs.has(tailName)).length;
    return missingTailCount === 0 || args.length > missingTailCount;
  }

  private getMapCallArg(
    args: unknown[],
    namedArgs: Map<string, unknown>,
    index: number,
    name: string,
    fallback?: unknown,
    priorNames: readonly string[] = [],
  ): unknown {
    const tailNames = [name, ...priorNames.filter((priorName) => priorName !== 'id' && priorName !== name)];
    const hasPositionalReceiver = this.mapUsesPositionalReceiver(args, namedArgs, tailNames);
    const positionalIndex = index - priorNames.filter((priorName) => namedArgs.has(priorName) && (priorName !== 'id' || !hasPositionalReceiver)).length;
    return this.getCallArg(args, namedArgs, positionalIndex, name, fallback);
  }

  private registerColorBuiltins(): void {
    const colorNewArgs = ['color', 'transp'] as const;
    const colorRgbArgs = ['red', 'green', 'blue', 'transp'] as const;
    const colorChannelArgs = ['color'] as const;
    const colorGradientArgs = ['value', 'bottom_value', 'top_value', 'bottom_color', 'top_color'] as const;

    // Color constants
    const colors: Record<string, string> = {
      'color.red': '#F44336',
      'color.green': '#4CAF50',
      'color.blue': '#2196F3',
      'color.orange': '#FF9800',
      'color.yellow': '#FFEB3B',
      'color.purple': '#9C27B0',
      'color.white': '#FFFFFF',
      'color.black': '#000000',
      'color.gray': '#9E9E9E',
      'color.silver': '#B2B5BE',
      'color.maroon': '#880E4F',
      'color.olive': '#808000',
      'color.lime': '#00E676',
      'color.aqua': '#00BCD4',
      'color.teal': '#009688',
      'color.navy': '#0D47A1',
      'color.fuchsia': '#E91E63',
    };

    for (const [name, value] of Object.entries(colors)) {
      this.builtins.set(name, () => value);
    }
    this.builtins.set('color.none', () => Number.NaN);

    this.builtins.set('color.new', (args, namedArgs) => {
      const color = this.getOrderedCallArg(args, namedArgs, colorNewArgs, 0);
      const transparency = namedArgs.has('transp')
        ? namedArgs.get('transp')
        : namedArgs.has('transparency')
          ? namedArgs.get('transparency')
          : this.getOrderedCallArg(args, namedArgs, colorNewArgs, 1, 0);
      const parsedColor = this.parseColor(color);
      if (!parsedColor) {
        return color;
      }

      return this.formatColor(parsedColor.red, parsedColor.green, parsedColor.blue, transparency);
    });

    this.builtins.set('color.rgb', (args, namedArgs) =>
      this.formatColor(
        this.getOrderedCallArg(args, namedArgs, colorRgbArgs, 0),
        this.getOrderedCallArg(args, namedArgs, colorRgbArgs, 1),
        this.getOrderedCallArg(args, namedArgs, colorRgbArgs, 2),
        namedArgs.has('transp')
          ? namedArgs.get('transp')
          : namedArgs.has('transparency')
            ? namedArgs.get('transparency')
            : this.getOrderedCallArg(args, namedArgs, colorRgbArgs, 3, 0),
      ),
    );

    this.builtins.set('color.r', (args, namedArgs) => this.parseColor(this.getOrderedCallArg(args, namedArgs, colorChannelArgs, 0))?.red ?? Number.NaN);
    this.builtins.set('color.g', (args, namedArgs) => this.parseColor(this.getOrderedCallArg(args, namedArgs, colorChannelArgs, 0))?.green ?? Number.NaN);
    this.builtins.set('color.b', (args, namedArgs) => this.parseColor(this.getOrderedCallArg(args, namedArgs, colorChannelArgs, 0))?.blue ?? Number.NaN);
    this.builtins.set('color.t', (args, namedArgs) => {
      const parsedColor = this.parseColor(this.getOrderedCallArg(args, namedArgs, colorChannelArgs, 0));
      return parsedColor ? this.alphaToTransparency(parsedColor.alpha) : Number.NaN;
    });

    this.builtins.set('color.from_gradient', (args, namedArgs) => {
      const value = this.getOrderedCallArg(args, namedArgs, colorGradientArgs, 0);
      const bottomValue = this.getOrderedCallArg(args, namedArgs, colorGradientArgs, 1);
      const topValue = this.getOrderedCallArg(args, namedArgs, colorGradientArgs, 2);
      const bottomColor = this.parseColor(this.getOrderedCallArg(args, namedArgs, colorGradientArgs, 3));
      const topColor = this.parseColor(this.getOrderedCallArg(args, namedArgs, colorGradientArgs, 4));

      if (!this.isFiniteNumber(value) || !this.isFiniteNumber(bottomValue) || !this.isFiniteNumber(topValue) || !bottomColor || !topColor) {
        return Number.NaN;
      }

      const range = topValue - bottomValue;
      const ratio = range === 0 ? 0 : Math.min(1, Math.max(0, (value - bottomValue) / range));
      const interpolate = (from: number, to: number): number => from + (to - from) * ratio;
      return this.formatColor(
        interpolate(bottomColor.red, topColor.red),
        interpolate(bottomColor.green, topColor.green),
        interpolate(bottomColor.blue, topColor.blue),
        this.alphaToTransparency(interpolate(bottomColor.alpha, topColor.alpha)),
      );
    });
  }

  private registerVisualConstants(): void {
    // =========================================================================
    // Shape Constants (for plotshape)
    // =========================================================================
    const shapes: Record<string, string> = {
      'shape.triangleup': 'triangleup',
      'shape.triangledown': 'triangledown',
      'shape.circle': 'circle',
      'shape.cross': 'cross',
      'shape.diamond': 'diamond',
      'shape.arrowup': 'arrowup',
      'shape.arrowdown': 'arrowdown',
      'shape.flag': 'flag',
      'shape.labelup': 'labelup',
      'shape.labeldown': 'labeldown',
      'shape.square': 'square',
      'shape.xcross': 'xcross',
    };

    for (const [name, value] of Object.entries(shapes)) {
      this.builtins.set(name, () => value);
    }

    // =========================================================================
    // Location Constants (for plotshape, plotchar)
    // =========================================================================
    const locations: Record<string, string> = {
      'location.abovebar': 'abovebar',
      'location.belowbar': 'belowbar',
      'location.top': 'top',
      'location.bottom': 'bottom',
      'location.absolute': 'absolute',
    };

    for (const [name, value] of Object.entries(locations)) {
      this.builtins.set(name, () => value);
    }

    // =========================================================================
    // Size Constants (for plotshape, plotchar)
    // =========================================================================
    const sizes: Record<string, string> = {
      'size.tiny': 'tiny',
      'size.small': 'small',
      'size.normal': 'normal',
      'size.large': 'large',
      'size.huge': 'huge',
      'size.auto': 'auto',
    };

    for (const [name, value] of Object.entries(sizes)) {
      this.builtins.set(name, () => value);
    }

    const displayConstants: Record<string, number> = {
      'display.none': 0,
      'display.pane': 1,
      'display.data_window': 2,
      'display.status_line': 4,
      'display.price_scale': 8,
      'display.all': 15,
    };

    for (const [name, value] of Object.entries(displayConstants)) {
      this.builtins.set(name, () => value);
    }

    const formatConstants: Record<string, string> = {
      'format.inherit': 'inherit',
      'format.price': 'price',
      'format.volume': 'volume',
      'format.percent': 'percent',
    };

    for (const [name, value] of Object.entries(formatConstants)) {
      this.builtins.set(name, () => value);
    }

    const scaleConstants: Record<string, string> = {
      'scale.left': 'left',
      'scale.right': 'right',
      'scale.none': 'none',
    };

    for (const [name, value] of Object.entries(scaleConstants)) {
      this.builtins.set(name, () => value);
    }

    const orderConstants: Record<string, string> = {
      'order.ascending': 'ascending',
      'order.descending': 'descending',
    };

    for (const [name, value] of Object.entries(orderConstants)) {
      this.builtins.set(name, () => value);
    }

    const currencyConstants: Record<string, string> = {
      'currency.AUD': 'AUD',
      'currency.CAD': 'CAD',
      'currency.CHF': 'CHF',
      'currency.EUR': 'EUR',
      'currency.GBP': 'GBP',
      'currency.JPY': 'JPY',
      'currency.USD': 'USD',
      'currency.USDT': 'USDT',
    };

    for (const [name, value] of Object.entries(currencyConstants)) {
      this.builtins.set(name, () => value);
    }
  }

  private registerTickerBuiltins(): void {
    this.builtins.set('session.regular', () => 'regular');
    this.builtins.set('session.extended', () => 'extended');
    this.builtins.set('session.ismarket', () => this.evaluateSessionState('regular', 'session.ismarket'));
    this.builtins.set('session.ispremarket', () => this.evaluateSessionState('premarket', 'session.ispremarket'));
    this.builtins.set('session.ispostmarket', () => this.evaluateSessionState('postmarket', 'session.ispostmarket'));
    this.builtins.set('adjustment.none', () => 'none');
    this.builtins.set('adjustment.splits', () => 'splits');
    this.builtins.set('adjustment.dividends', () => 'dividends');
    this.builtins.set('backadjustment.on', () => 'on');
    this.builtins.set('backadjustment.off', () => 'off');
    this.builtins.set('backadjustment.inherit', () => 'inherit');
    this.builtins.set('settlement_as_close.on', () => 'on');
    this.builtins.set('settlement_as_close.off', () => 'off');
    this.builtins.set('settlement_as_close.inherit', () => 'inherit');

    const tickerNewArgs = [['prefix'], ['ticker'], ['session'], ['adjustment'], ['backadjustment'], ['settlement_as_close']] as const;
    const tickerModifyArgs = [['tickerid'], ['session'], ['adjustment'], ['backadjustment'], ['settlement_as_close']] as const;
    const tickerSymbolArgs = [['symbol', 'tickerid']] as const;
    const tickerInheritArgs = [['from_tickerid'], ['symbol']] as const;
    const tickerRenkoArgs = [['symbol', 'tickerid'], ['style'], ['param'], ['request_wicks'], ['source']] as const;
    const tickerLinebreakArgs = [['symbol', 'tickerid'], ['number_of_lines']] as const;
    const tickerKagiArgs = [['symbol', 'tickerid'], ['style'], ['param', 'reversal', 'reversal_amount']] as const;
    const tickerPointfigureArgs = [['symbol', 'tickerid'], ['source'], ['style'], ['param'], ['reversal']] as const;
    const getOrderedTickerArg = (
      args: unknown[],
      namedArgs: Map<string, unknown>,
      params: readonly (readonly string[])[],
      index: number,
      fallback?: unknown,
    ): unknown => {
      const names = params[index] ?? [];
      const matches = names.filter((name) => namedArgs.has(name));
      if (matches.length > 1) {
        throw new Error(`Ticker argument was supplied multiple times: ${matches.join(', ')}`);
      }
      if (matches.length === 1) return namedArgs.get(matches[0]);

      const priorNamedCount = params
        .slice(0, index)
        .filter((priorNames) => priorNames.some((name) => namedArgs.has(name))).length;
      const positionalIndex = index - priorNamedCount;
      return args[positionalIndex] !== undefined ? args[positionalIndex] : fallback;
    };

    this.builtins.set('ticker.new', (args, namedArgs) => {
      const prefix = this.toStringValue(getOrderedTickerArg(args, namedArgs, tickerNewArgs, 0, ''));
      const ticker = this.toStringValue(getOrderedTickerArg(args, namedArgs, tickerNewArgs, 1, ''));
      const session = this.normalizeTickerSession(getOrderedTickerArg(args, namedArgs, tickerNewArgs, 2));
      const adjustment = this.normalizeTickerModifier(
        getOrderedTickerArg(args, namedArgs, tickerNewArgs, 3),
        'adjustment',
        ['none', 'splits', 'dividends'],
      );
      const backadjustment = this.normalizeTickerModifier(
        getOrderedTickerArg(args, namedArgs, tickerNewArgs, 4),
        'backadjustment',
        ['on', 'off', 'inherit'],
      );
      const settlementAsClose = this.normalizeTickerModifier(
        getOrderedTickerArg(args, namedArgs, tickerNewArgs, 5),
        'settlement_as_close',
        ['on', 'off', 'inherit'],
      );
      return this.buildTickerId(prefix, ticker, {
        session,
        adjustment,
        backadjustment,
        settlementAsClose,
      });
    });

    this.builtins.set('ticker.modify', (args, namedArgs) => {
      const tickerId = this.toStringValue(getOrderedTickerArg(args, namedArgs, tickerModifyArgs, 0, ''));
      const current = this.parseTickerModifierMap(
        this.parseTickerModifierParts(tickerId, 'ticker.modify').modifiers,
      );
      const sessionArg = getOrderedTickerArg(args, namedArgs, tickerModifyArgs, 1);
      const adjustmentArg = getOrderedTickerArg(args, namedArgs, tickerModifyArgs, 2);
      const backadjustmentArg = getOrderedTickerArg(args, namedArgs, tickerModifyArgs, 3);
      const settlementAsCloseArg = getOrderedTickerArg(args, namedArgs, tickerModifyArgs, 4);
      const hasSession = sessionArg !== undefined;
      const hasAdjustment = adjustmentArg !== undefined;
      const hasBackadjustment = backadjustmentArg !== undefined;
      const hasSettlementAsClose = settlementAsCloseArg !== undefined;
      const session = hasSession
        ? this.normalizeTickerSession(sessionArg)
        : this.normalizeTickerSession(current.get('session'));
      const adjustment = hasAdjustment
        ? this.normalizeTickerModifier(
          adjustmentArg,
          'adjustment',
          ['none', 'splits', 'dividends'],
        )
        : this.normalizeTickerModifier(current.get('adjustment'), 'adjustment', ['none', 'splits', 'dividends']);
      const backadjustment = hasBackadjustment
        ? this.normalizeTickerModifier(
          backadjustmentArg,
          'backadjustment',
          ['on', 'off', 'inherit'],
        )
        : this.normalizeTickerModifier(current.get('backadjustment'), 'backadjustment', ['on', 'off', 'inherit']);
      const settlementAsClose = hasSettlementAsClose
        ? this.normalizeTickerModifier(
          settlementAsCloseArg,
          'settlement_as_close',
          ['on', 'off', 'inherit'],
        )
        : this.normalizeTickerModifier(
          current.get('settlement_as_close'),
          'settlement_as_close',
          ['on', 'off', 'inherit'],
        );
      return this.applyTickerModifiers(tickerId, {
        session,
        adjustment,
        backadjustment,
        settlementAsClose,
      });
    });

    this.builtins.set('ticker.standard', (args, namedArgs) => {
      const tickerId = this.toStringValue(getOrderedTickerArg(args, namedArgs, tickerSymbolArgs, 0, ''));
      return this.parseTickerModifierParts(tickerId, 'ticker.standard').base;
    });

    this.builtins.set('ticker.inherit', (args, namedArgs) => {
      const fromTickerId = this.toStringValue(getOrderedTickerArg(args, namedArgs, tickerInheritArgs, 0, ''));
      const symbol = this.toStringValue(getOrderedTickerArg(args, namedArgs, tickerInheritArgs, 1, ''));
      const source = this.parseTickerModifierParts(fromTickerId, 'ticker.inherit');
      const target = this.parseTickerModifierParts(symbol, 'ticker.inherit');
      return source.modifiers.length === 0 ? target.base : `${target.base}|${source.modifiers.join('|')}`;
    });

    this.builtins.set('ticker.heikinashi', (args, namedArgs) => {
      const tickerId = this.toStringValue(getOrderedTickerArg(args, namedArgs, tickerSymbolArgs, 0, ''));
      return this.applyTickerChart(tickerId, 'heikinashi');
    });

    this.builtins.set('ticker.renko', (args, namedArgs) => {
      const tickerId = this.toStringValue(getOrderedTickerArg(args, namedArgs, tickerRenkoArgs, 0, ''));
      const style = this.toStringValue(getOrderedTickerArg(args, namedArgs, tickerRenkoArgs, 1, ''));
      const param = getOrderedTickerArg(args, namedArgs, tickerRenkoArgs, 2);
      const requestWicks = getOrderedTickerArg(args, namedArgs, tickerRenkoArgs, 3);
      const source = getOrderedTickerArg(args, namedArgs, tickerRenkoArgs, 4);
      return this.applyTickerChart(tickerId, 'renko', [style, param, requestWicks, source]);
    });

    this.builtins.set('ticker.linebreak', (args, namedArgs) => {
      const tickerId = this.toStringValue(getOrderedTickerArg(args, namedArgs, tickerLinebreakArgs, 0, ''));
      const numberOfLines = getOrderedTickerArg(args, namedArgs, tickerLinebreakArgs, 1);
      return this.applyTickerChart(tickerId, 'linebreak', [numberOfLines]);
    });

    this.builtins.set('ticker.kagi', (args, namedArgs) => {
      const tickerId = this.toStringValue(getOrderedTickerArg(args, namedArgs, tickerKagiArgs, 0, ''));
      const style = getOrderedTickerArg(args, namedArgs, tickerKagiArgs, 1);
      const param = getOrderedTickerArg(args, namedArgs, tickerKagiArgs, 2);
      return this.applyTickerChart(tickerId, 'kagi', [style, param]);
    });

    this.builtins.set('ticker.pointfigure', (args, namedArgs) => {
      const tickerId = this.toStringValue(getOrderedTickerArg(args, namedArgs, tickerPointfigureArgs, 0, ''));
      const source = this.toStringValue(getOrderedTickerArg(args, namedArgs, tickerPointfigureArgs, 1, ''));
      const style = this.toStringValue(getOrderedTickerArg(args, namedArgs, tickerPointfigureArgs, 2, ''));
      const param = getOrderedTickerArg(args, namedArgs, tickerPointfigureArgs, 3);
      const reversal = getOrderedTickerArg(args, namedArgs, tickerPointfigureArgs, 4);
      return this.applyTickerChart(tickerId, 'pointfigure', [source, style, param, reversal]);
    });
  }

  private normalizeTickerSession(value: unknown): 'regular' | 'extended' | undefined {
    if (value === undefined || this.isNa(value)) {
      return undefined;
    }

    const session = this.toStringValue(value).trim().toLowerCase();
    if (session === '' || session === 'regular' || session === 'session.regular') {
      return 'regular';
    }
    if (session === 'extended' || session === 'session.extended') {
      return 'extended';
    }
    throw new Error(`Unsupported ticker session: ${session}`);
  }

  private evaluateSessionState(kind: 'regular' | 'premarket' | 'postmarket', name: string): boolean {
    const session = this.runtimeOptions.session?.[kind];
    if (session === undefined || session === '') {
      throw new RuntimeErrorException(`${name} requires exchange session classification, which is not available in this runtime`);
    }

    const timestamp = this.ctx.time.get(0);
    if (timestamp === undefined || !Number.isFinite(timestamp)) return false;

    const timezone = this.runtimeOptions.session?.timezone?.trim()
      || this.ctx.syminfo.timezone;
    if (this.isExchangeSessionClosed(timestamp, timezone, kind)) {
      return false;
    }
    return this.isTimestampInSession(timestamp, session, timezone);
  }

  private normalizeTickerModifier(
    value: unknown,
    name: string,
    allowedValues: readonly string[],
  ): string | undefined {
    if (value === undefined || this.isNa(value)) {
      return undefined;
    }

    const normalized = this.toStringValue(value).trim().toLowerCase();
    if (normalized === '') {
      return undefined;
    }

    const bareValue = normalized.startsWith(`${name}.`) ? normalized.slice(name.length + 1) : normalized;
    if (!allowedValues.includes(bareValue)) {
      throw new Error(`Unsupported ticker ${name}: ${normalized}`);
    }

    return bareValue;
  }

  private buildTickerId(
    prefix: string,
    ticker: string,
    modifiers: {
      session?: 'regular' | 'extended';
      adjustment?: string;
      backadjustment?: string;
      settlementAsClose?: string;
    },
  ): string {
    const base = prefix.trim() === '' ? ticker.trim() : `${prefix.trim()}:${ticker.trim()}`;
    return this.applyTickerModifiers(base, modifiers);
  }

  private applyTickerModifiers(
    tickerId: string,
    modifiers: {
      session?: 'regular' | 'extended';
      adjustment?: string;
      backadjustment?: string;
      settlementAsClose?: string;
    },
  ): string {
    let result = tickerId;
    result = this.upsertTickerModifier(
      result,
      'session',
      modifiers.session === 'extended' ? 'extended' : undefined,
      'ticker.new/ticker.modify',
    );
    result = this.upsertTickerModifier(
      result,
      'adjustment',
      modifiers.adjustment === undefined || modifiers.adjustment === 'none' ? undefined : modifiers.adjustment,
      'ticker.new/ticker.modify',
    );
    result = this.upsertTickerModifier(
      result,
      'backadjustment',
      modifiers.backadjustment === undefined || modifiers.backadjustment === 'inherit'
        ? undefined
        : modifiers.backadjustment,
      'ticker.new/ticker.modify',
    );
    result = this.upsertTickerModifier(
      result,
      'settlement_as_close',
      modifiers.settlementAsClose === undefined || modifiers.settlementAsClose === 'inherit'
        ? undefined
        : modifiers.settlementAsClose,
      'ticker.new/ticker.modify',
    );
    return result;
  }

  private applyTickerChart(tickerId: string, chart: string, params: unknown[] = []): string {
    const normalizedParams = params
      .filter((param) => param !== undefined && !this.isNa(param))
      .map((param) => encodeURIComponent(this.toStringValue(param).trim()));
    const chartModifier = normalizedParams.length === 0
      ? chart
      : `${chart}:${normalizedParams.join(':')}`;
    return this.upsertTickerModifier(tickerId, 'chart', chartModifier, `ticker.${chart}`);
  }

  private parseTickerModifierParts(tickerId: string, context: string): TickerModifierParts {
    const [base = '', ...modifiers] = tickerId.trim().split('|');
    const normalizedBase = base.trim();
    if (normalizedBase === '') {
      throw new Error(`${context} requires a non-empty ticker id`);
    }
    return {
      base: normalizedBase,
      modifiers: modifiers.filter((modifier) => modifier.trim() !== ''),
    };
  }

  private parseTickerModifierMap(modifiers: string[]): Map<string, string> {
    const result = new Map<string, string>();
    for (const modifier of modifiers) {
      const separatorIndex = modifier.indexOf('=');
      if (separatorIndex <= 0) {
        continue;
      }
      const key = modifier.slice(0, separatorIndex).trim();
      const value = modifier.slice(separatorIndex + 1).trim();
      if (key !== '') {
        result.set(key, value);
      }
    }
    return result;
  }

  private upsertTickerModifier(
    tickerId: string,
    key: string,
    value: string | undefined,
    context: string,
  ): string {
    const { base, modifiers } = this.parseTickerModifierParts(tickerId, context);
    const prefix = `${key}=`;
    const kept = modifiers.filter((modifier) => !modifier.startsWith(prefix));
    if (value !== undefined) {
      kept.push(`${key}=${value}`);
    }
    return kept.length === 0 ? base : `${base}|${kept.join('|')}`;
  }

  /**
   * Get a series accessor for a given source value.
   * Maps current bar values back to their source series.
   */
  private getKnownSeriesForSource(source: number, ctx: ExecutionContext): { get: (offset: number) => number | undefined } | undefined {
    // Check if source matches any built-in series at offset 0
    if (source === ctx.close.get(0)) return ctx.close;
    if (source === ctx.high.get(0)) return ctx.high;
    if (source === ctx.low.get(0)) return ctx.low;
    if (source === ctx.open.get(0)) return ctx.open;
    if (source === ctx.volume.get(0)) return ctx.volume;
    // Check derived series
    if (source === ctx.hl2)
      return {
        get: (i) => {
          const h = ctx.high.get(i);
          const l = ctx.low.get(i);
          return h !== undefined && l !== undefined ? (h + l) / 2 : undefined;
        },
      };
    if (source === ctx.hlc3)
      return {
        get: (i) => {
          const h = ctx.high.get(i);
          const l = ctx.low.get(i);
          const c = ctx.close.get(i);
          return h !== undefined && l !== undefined && c !== undefined ? (h + l + c) / 3 : undefined;
        },
      };
    if (source === ctx.ohlc4)
      return {
        get: (i) => {
          const o = ctx.open.get(i);
          const h = ctx.high.get(i);
          const l = ctx.low.get(i);
          const c = ctx.close.get(i);
          return o !== undefined && h !== undefined && l !== undefined && c !== undefined
            ? (o + h + l + c) / 4
            : undefined;
        },
      };
    if (source === ctx.hlcc4)
      return {
        get: (i) => {
          const h = ctx.high.get(i);
          const l = ctx.low.get(i);
          const c = ctx.close.get(i);
          return h !== undefined && l !== undefined && c !== undefined ? (h + l + c + c) / 4 : undefined;
        },
      };
    return undefined;
  }

  private getSeriesForSource(source: number, ctx: ExecutionContext): { get: (offset: number) => number | undefined } {
    // Default: fallback to close (most common case)
    return this.getKnownSeriesForSource(source, ctx) ?? ctx.close;
  }

  private registerTaBuiltins(): void {
    // SMA - Simple Moving Average
    this.builtins.set('ta.sma', (args, namedArgs, _ctx, scope, callId) => {
      const taSourceLengthArgs = ['source', 'length'];
      const source = this.toNumber(this.getOrderedCallArg(args, namedArgs, taSourceLengthArgs, 0));
      const length = this.normalizeLookbackLength(this.getOrderedCallArg(args, namedArgs, taSourceLengthArgs, 1));
      const values = this.getCompleteSourceWindow(scope, `_ta_sma_source_${callId}`, source, length);
      if (!values) return NaN;

      // Calculate SMA using history
      let sum = 0;
      for (const value of values) {
        sum += value;
      }

      return sum / length;
    });

    // EMA - Exponential Moving Average
    this.builtins.set('ta.ema', (args, namedArgs, _ctx, scope, callId) => {
      const taSourceLengthArgs = ['source', 'length'];
      const source = this.toNumber(this.getOrderedCallArg(args, namedArgs, taSourceLengthArgs, 0));
      const length = this.normalizeLookbackLength(this.getOrderedCallArg(args, namedArgs, taSourceLengthArgs, 1));

      if (isNaN(source) || length < 1) return NaN;
      return this.updateBuiltinEmaState(scope, `_ta_ema_${callId}_${length}`, source, length);
    });

    // RSI - Relative Strength Index
    this.builtins.set('ta.rsi', (args, namedArgs, ctx, scope) => {
      const taSourceLengthArgs = ['source', 'length'];
      const source = this.toNumber(this.getOrderedCallArg(args, namedArgs, taSourceLengthArgs, 0));
      const length = this.normalizeLookbackLength(this.getOrderedCallArg(args, namedArgs, taSourceLengthArgs, 1));

      // Get the series for the source value
      const series = this.getSeriesForSource(source, ctx);

      // Get previous values - use unique key based on source
      const avgGainKey = `_rsi_gain_${length}_${source}`;
      const avgLossKey = `_rsi_loss_${length}_${source}`;

      const prevSource = series.get(1);
      if (prevSource === undefined) return NaN;

      const change = source - prevSource;
      const gain = change > 0 ? change : 0;
      const loss = change < 0 ? -change : 0;

      let avgGain = scope.get(avgGainKey) as number | undefined;
      let avgLoss = scope.get(avgLossKey) as number | undefined;

      if (avgGain === undefined || avgLoss === undefined) {
        // Initialize
        let totalGain = 0;
        let totalLoss = 0;

        for (let i = 0; i < length; i++) {
          const curr = series.get(i);
          const prev = series.get(i + 1);
          if (curr === undefined || prev === undefined) continue;

          const c = curr - prev;
          if (c > 0) totalGain += c;
          else totalLoss -= c;
        }

        avgGain = totalGain / length;
        avgLoss = totalLoss / length;
      } else {
        // Smoothed average
        avgGain = (avgGain * (length - 1) + gain) / length;
        avgLoss = (avgLoss * (length - 1) + loss) / length;
      }

      scope.declare(avgGainKey, 'var', avgGain);
      scope.declare(avgLossKey, 'var', avgLoss);

      if (avgLoss === 0) return 100;
      const rs = avgGain / avgLoss;
      return 100 - 100 / (1 + rs);
    });

    this.builtins.set('ta.barssince', (args, namedArgs, _ctx, scope, callId) => {
      const taBarssinceArgs = ['condition'];
      const condition = this.isTruthy(this.getOrderedCallArg(args, namedArgs, taBarssinceArgs, 0));
      const key = `_barssince_${callId}`;
      const previous = scope.get(key) as number | undefined;
      const value = condition ? 0 : previous === undefined || isNaN(previous) ? NaN : previous + 1;
      this.setBuiltinState(scope, key, value);
      return value;
    });

    this.builtins.set('ta.valuewhen', (args, namedArgs, _ctx, scope, callId) => {
      const taValuewhenArgs = ['condition', 'source', 'occurrence'];
      const condition = this.isTruthy(this.getOrderedCallArg(args, namedArgs, taValuewhenArgs, 0));
      const source = this.getOrderedCallArg(args, namedArgs, taValuewhenArgs, 1) as number;
      const occurrence = Math.max(0, Math.trunc(this.toNumber(this.getOrderedCallArg(args, namedArgs, taValuewhenArgs, 2, 0))));
      const key = `_valuewhen_${callId}`;
      const values = (scope.get(key) as unknown[] | undefined) ?? [];

      if (condition) {
        values.unshift(source);
      }

      this.setBuiltinState(scope, key, values);
      return values[occurrence] ?? NaN;
    });

    // Change - difference from N bars ago
    this.builtins.set('ta.change', (args, namedArgs, ctx, scope, callId) => {
      const taChangeArgs = ['source', 'length'];
      const rawSource = this.getOrderedCallArg(args, namedArgs, taChangeArgs, 0);
      const length = this.normalizeLookbackLength(this.getOrderedCallArg(args, namedArgs, taChangeArgs, 1, 1));

      if (typeof rawSource === 'boolean') {
        const key = `_change_bool_${callId}`;
        const history = (scope.get(key) as boolean[] | undefined) ?? [];
        const previous = history[length - 1];
        this.prependBoundedHistory(history, rawSource, length);
        this.setBuiltinState(scope, key, history);
        return previous === undefined ? false : rawSource !== previous;
      }

      const source = rawSource as number;

      // Get the series for the source value
      const series = this.getSeriesForSource(source, ctx);
      const prev = series.get(length);
      if (prev === undefined) return NaN;

      return source - prev;
    });

    // Crossover - source1 crosses above source2
    // Uses scope to track previous values of both arguments
    this.builtins.set('ta.crossover', (args, namedArgs, ctx, scope) => {
      const taCrossArgs = ['source1', 'source2'];
      const source1 = this.toNumber(this.getOrderedCallArg(args, namedArgs, taCrossArgs, 0));
      const source2 = this.toNumber(this.getOrderedCallArg(args, namedArgs, taCrossArgs, 1));

      // Try to get series for source1 (if it's a built-in series)
      const series1 = this.getSeriesForSource(source1, ctx);
      const series2 = this.getSeriesForSource(source2, ctx);

      // Get previous values
      const prev1 = series1.get(1);
      const prev2 = series2.get(1);

      // If we can't get historical values, use scope tracking
      const trackKey1 = `_cross_src1_${source1}`;
      const trackKey2 = `_cross_src2_${source2}`;

      const trackedPrev1 = prev1 ?? (scope.get(trackKey1) as number | undefined);
      const trackedPrev2 = prev2 ?? (scope.get(trackKey2) as number | undefined);

      // Store current values for next bar
      scope.declare(trackKey1, 'var', source1);
      scope.declare(trackKey2, 'var', source2);

      if (trackedPrev1 === undefined || trackedPrev2 === undefined) {
        return false; // Not enough data
      }

      // Crossover: current above, previous at or below
      return source1 > source2 && trackedPrev1 <= trackedPrev2;
    });

    // Crossunder - source1 crosses below source2
    this.builtins.set('ta.crossunder', (args, namedArgs, ctx, scope) => {
      const taCrossArgs = ['source1', 'source2'];
      const source1 = this.toNumber(this.getOrderedCallArg(args, namedArgs, taCrossArgs, 0));
      const source2 = this.toNumber(this.getOrderedCallArg(args, namedArgs, taCrossArgs, 1));

      // Try to get series for source1 (if it's a built-in series)
      const series1 = this.getSeriesForSource(source1, ctx);
      const series2 = this.getSeriesForSource(source2, ctx);

      // Get previous values
      const prev1 = series1.get(1);
      const prev2 = series2.get(1);

      // If we can't get historical values, use scope tracking
      const trackKey1 = `_crossu_src1_${source1}`;
      const trackKey2 = `_crossu_src2_${source2}`;

      const trackedPrev1 = prev1 ?? (scope.get(trackKey1) as number | undefined);
      const trackedPrev2 = prev2 ?? (scope.get(trackKey2) as number | undefined);

      // Store current values for next bar
      scope.declare(trackKey1, 'var', source1);
      scope.declare(trackKey2, 'var', source2);

      if (trackedPrev1 === undefined || trackedPrev2 === undefined) {
        return false; // Not enough data
      }

      // Crossunder: current below, previous at or above
      return source1 < source2 && trackedPrev1 >= trackedPrev2;
    });

    this.builtins.set('ta.cross', (args, namedArgs, ctx, scope, callId) => {
      const taCrossArgs = ['source1', 'source2'];
      const source1 = this.toNumber(this.getOrderedCallArg(args, namedArgs, taCrossArgs, 0));
      const source2 = this.toNumber(this.getOrderedCallArg(args, namedArgs, taCrossArgs, 1));
      const series1 = this.getKnownSeriesForSource(source1, ctx);
      const series2 = this.getKnownSeriesForSource(source2, ctx);
      const trackKey1 = `_cross_any_src1_${callId}`;
      const trackKey2 = `_cross_any_src2_${callId}`;
      const stored1 = scope.get(trackKey1) as number | undefined;
      const stored2 = scope.get(trackKey2) as number | undefined;
      const previous1 = stored1 !== undefined && stored1 !== source1 ? (series1?.get(1) ?? stored1) : stored1;
      const previous2 = stored2 !== undefined && stored2 !== source2 ? (series2?.get(1) ?? stored2) : stored2;

      this.setBuiltinState(scope, trackKey1, source1);
      this.setBuiltinState(scope, trackKey2, source2);

      if (previous1 === undefined || previous2 === undefined || isNaN(source1) || isNaN(source2) || isNaN(previous1) || isNaN(previous2)) {
        return false;
      }

      return (source1 > source2 && previous1 <= previous2) || (source1 < source2 && previous1 >= previous2);
    });

    // Highest - returns highest value of source over length bars
    this.builtins.set('ta.highest', (args, namedArgs, ctx, scope, callId) => {
      const [source, length] = this.getTaSourceLengthArgs(args, namedArgs, ctx, 'high');
      const values = this.getAvailableSourceWindow(scope, `_ta_highest_source_${callId}`, source, length);
      if (values.length === 0) return NaN;

      let highest = -Infinity;
      for (const value of values) {
        if (value > highest) {
          highest = value;
        }
      }

      return highest === -Infinity ? NaN : highest;
    });

    // Lowest - returns lowest value of source over length bars
    this.builtins.set('ta.lowest', (args, namedArgs, ctx, scope, callId) => {
      const [source, length] = this.getTaSourceLengthArgs(args, namedArgs, ctx, 'low');
      const values = this.getAvailableSourceWindow(scope, `_ta_lowest_source_${callId}`, source, length);
      if (values.length === 0) return NaN;

      let lowest = Infinity;
      for (const value of values) {
        if (value < lowest) {
          lowest = value;
        }
      }

      return lowest === Infinity ? NaN : lowest;
    });

    this.builtins.set('ta.range', (args, namedArgs, _ctx, scope, callId) => {
      const source = this.toNumber(this.getCallArg(args, namedArgs, 0, 'source'));
      const length = this.normalizeLookbackLength(this.getCallArg(args, namedArgs, 1, 'length'));
      const values = this.getAvailableSourceWindow(scope, `_ta_range_source_${callId}`, source, length);

      let highest = -Infinity;
      let lowest = Infinity;
      for (const value of values) {
        if (value > highest) highest = value;
        if (value < lowest) lowest = value;
      }

      return highest === -Infinity || lowest === Infinity ? NaN : highest - lowest;
    });

    this.builtins.set('ta.rising', (args, namedArgs, _ctx, scope, callId) => {
      const source = this.toNumber(this.getCallArg(args, namedArgs, 0, 'source'));
      const length = this.normalizeLookbackLength(this.getCallArg(args, namedArgs, 1, 'length'));
      if (isNaN(source) || length < 1) return false;

      const key = `_ta_rising_source_${callId}`;
      const nextHistory = this.updateBuiltinSourceHistory(scope, key, source, length + 1);

      for (let i = 1; i <= length; i++) {
        const value = nextHistory[i];
        if (value === undefined || isNaN(value) || source <= value) {
          return false;
        }
      }

      return true;
    });

    this.builtins.set('ta.falling', (args, namedArgs, _ctx, scope, callId) => {
      const source = this.toNumber(this.getCallArg(args, namedArgs, 0, 'source'));
      const length = this.normalizeLookbackLength(this.getCallArg(args, namedArgs, 1, 'length'));
      if (isNaN(source) || length < 1) return false;

      const key = `_ta_falling_source_${callId}`;
      const nextHistory = this.updateBuiltinSourceHistory(scope, key, source, length + 1);

      for (let i = 1; i <= length; i++) {
        const value = nextHistory[i];
        if (value === undefined || isNaN(value) || source >= value) {
          return false;
        }
      }

      return true;
    });

    this.builtins.set('ta.highestbars', (args, namedArgs, ctx, scope, callId) => {
      const [source, length] = this.getTaSourceLengthArgs(args, namedArgs, ctx, 'high');
      if (length < 1) return NaN;
      const values = this.updateBuiltinSourceHistory(scope, `_ta_highestbars_source_${callId}`, source, length);

      let highest = -Infinity;
      let offset = NaN;
      for (let index = 0; index < values.length; index++) {
        const value = values[index]!;
        if (isNaN(value)) continue;
        if (value > highest) {
          highest = value;
          offset = index;
        }
      }

      return offset;
    });

    this.builtins.set('ta.lowestbars', (args, namedArgs, ctx, scope, callId) => {
      const [source, length] = this.getTaSourceLengthArgs(args, namedArgs, ctx, 'low');
      if (length < 1) return NaN;
      const values = this.updateBuiltinSourceHistory(scope, `_ta_lowestbars_source_${callId}`, source, length);

      let lowest = Infinity;
      let offset = NaN;
      for (let index = 0; index < values.length; index++) {
        const value = values[index]!;
        if (isNaN(value)) continue;
        if (value < lowest) {
          lowest = value;
          offset = index;
        }
      }

      return offset;
    });

    this.builtins.set('ta.vwma', (args, namedArgs, ctx, scope, callId) => {
      const taSourceLengthArgs = ['source', 'length'];
      const source = this.toNumber(this.getOrderedCallArg(args, namedArgs, taSourceLengthArgs, 0));
      const length = this.normalizeLookbackLength(this.getOrderedCallArg(args, namedArgs, taSourceLengthArgs, 1));
      const values = this.getCompleteSourceWindow(scope, `_ta_vwma_source_${callId}`, source, length);
      if (!values) return NaN;

      let weightedSum = 0;
      let volumeSum = 0;
      for (let i = 0; i < length; i++) {
        const value = values[i]!;
        const volume = ctx.volume.get(i);
        if (value !== undefined && volume !== undefined && !isNaN(value) && !isNaN(volume)) {
          weightedSum += value * volume;
          volumeSum += volume;
        }
      }

      return volumeSum === 0 ? NaN : weightedSum / volumeSum;
    });

    // ATR - Average True Range
    this.builtins.set('ta.atr', (args, namedArgs, ctx, scope) => {
      const length = this.normalizeLookbackLength(this.getCallArg(args, namedArgs, 0, 'length'));

      // Calculate True Range
      const high = ctx.high.get(0)!;
      const low = ctx.low.get(0)!;
      const prevClose = ctx.close.get(1);

      let tr: number;
      if (prevClose === undefined) {
        tr = high - low;
      } else {
        tr = Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose));
      }

      // Use RMA (Wilder's smoothing) for ATR
      const atrKey = `_atr_${length}`;
      let prevAtr = scope.get(atrKey) as number | undefined;

      let atr: number;
      if (prevAtr === undefined || isNaN(prevAtr)) {
        // Initialize with simple average of TR
        let sum = 0;
        for (let i = 0; i < length; i++) {
          const h = ctx.high.get(i);
          const l = ctx.low.get(i);
          const pc = ctx.close.get(i + 1);
          if (h === undefined || l === undefined) continue;

          let t = h - l;
          if (pc !== undefined) {
            t = Math.max(h - l, Math.abs(h - pc), Math.abs(l - pc));
          }
          sum += t;
        }
        atr = sum / length;
      } else {
        // Wilder's smoothing
        atr = (prevAtr * (length - 1) + tr) / length;
      }

      scope.declare(atrKey, 'var', atr);
      return atr;
    });

    // MACD - returns [macdLine, signalLine, histogram]
    this.builtins.set('ta.macd', (args, namedArgs, ctx, scope, callId) => {
      const source = this.toNumber(this.getCallArg(args, namedArgs, 0, 'source'));
      const fastLen = this.normalizeLookbackLength(this.getCallArg(args, namedArgs, 1, 'fastlen', 12));
      const slowLen = this.normalizeLookbackLength(this.getCallArg(args, namedArgs, 2, 'slowlen', 26));
      const signalLen = this.normalizeLookbackLength(this.getCallArg(args, namedArgs, 3, 'siglen', 9));

      // Calculate EMAs
      const fastAlpha = 2 / (fastLen + 1);
      const slowAlpha = 2 / (slowLen + 1);
      const signalAlpha = 2 / (signalLen + 1);

      const fastKey = `_ta_macd_fast_${callId}_${fastLen}`;
      const slowKey = `_ta_macd_slow_${callId}_${slowLen}`;
      const signalKey = `_ta_macd_signal_${callId}_${signalLen}`;

      let fastEma = (scope.get(fastKey) as number) ?? source;
      let slowEma = (scope.get(slowKey) as number) ?? source;

      fastEma = fastAlpha * source + (1 - fastAlpha) * fastEma;
      slowEma = slowAlpha * source + (1 - slowAlpha) * slowEma;

      const macdLine = fastEma - slowEma;

      let signalLine = (scope.get(signalKey) as number) ?? macdLine;
      signalLine = signalAlpha * macdLine + (1 - signalAlpha) * signalLine;

      const histogram = macdLine - signalLine;

      this.setBuiltinState(scope, fastKey, fastEma);
      this.setBuiltinState(scope, slowKey, slowEma);
      this.setBuiltinState(scope, signalKey, signalLine);

      return [macdLine, signalLine, histogram];
    });

    // STDEV - Standard Deviation
    this.builtins.set('ta.stdev', (args, namedArgs, _ctx, scope, callId) => {
      const taStdevArgs = ['source', 'length', 'biased'];
      const source = this.toNumber(this.getOrderedCallArg(args, namedArgs, taStdevArgs, 0));
      const length = this.normalizeLookbackLength(this.getOrderedCallArg(args, namedArgs, taStdevArgs, 1));
      const biased = this.isTruthy(this.getOrderedCallArg(args, namedArgs, taStdevArgs, 2, true));
      const values = this.getCompleteSourceWindow(scope, `_ta_stdev_source_${callId}`, source, length);
      if (!values) return NaN;

      // Calculate mean
      const mean = values.reduce((a, b) => a + b, 0) / values.length;

      // Calculate variance (population standard deviation)
      const squaredDiffs = values.map((v) => Math.pow(v - mean, 2));
      const divisor = biased ? values.length : values.length - 1;
      if (divisor <= 0) return NaN;
      const variance = squaredDiffs.reduce((a, b) => a + b, 0) / divisor;

      return Math.sqrt(variance);
    });

    this.builtins.set('ta.variance', (args, namedArgs, _ctx, scope, callId) => {
      const taVarianceArgs = ['source', 'length', 'biased'];
      const source = this.toNumber(this.getOrderedCallArg(args, namedArgs, taVarianceArgs, 0));
      const length = this.normalizeLookbackLength(this.getOrderedCallArg(args, namedArgs, taVarianceArgs, 1));
      const biased = this.isTruthy(this.getOrderedCallArg(args, namedArgs, taVarianceArgs, 2, true));
      const values = this.getCompleteSourceWindow(scope, `_ta_variance_source_${callId}`, source, length);
      if (!values) return NaN;

      const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
      const divisor = biased ? values.length : values.length - 1;
      if (divisor <= 0) return NaN;
      return values.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) / divisor;
    });

    this.builtins.set('ta.dev', (args, namedArgs, _ctx, scope, callId) => {
      const taDevArgs = ['source', 'length'];
      const source = this.toNumber(this.getOrderedCallArg(args, namedArgs, taDevArgs, 0));
      const length = this.normalizeLookbackLength(this.getOrderedCallArg(args, namedArgs, taDevArgs, 1));
      const values = this.getCompleteSourceWindow(scope, `_ta_dev_source_${callId}`, source, length);
      if (!values) return NaN;

      const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
      return values.reduce((sum, value) => sum + Math.abs(value - mean), 0) / values.length;
    });

    this.builtins.set('ta.correlation', (args, namedArgs, _ctx, scope, callId) => {
      const taCorrelationArgs = ['source1', 'source2', 'length'];
      const sourceA = this.toNumber(this.getOrderedCallArg(args, namedArgs, taCorrelationArgs, 0));
      const sourceB = this.toNumber(this.getOrderedCallArg(args, namedArgs, taCorrelationArgs, 1));
      const length = this.normalizeLookbackLength(this.getOrderedCallArg(args, namedArgs, taCorrelationArgs, 2));
      const windows = this.getCompletePairedSourceWindows(
        scope,
        `_ta_correlation_source_a_${callId}`,
        `_ta_correlation_source_b_${callId}`,
        sourceA,
        sourceB,
        length,
      );
      if (!windows) return NaN;

      const [leftValues, rightValues] = windows;
      const leftMean = leftValues.reduce((sum, value) => sum + value, 0) / length;
      const rightMean = rightValues.reduce((sum, value) => sum + value, 0) / length;
      let covariance = 0;
      let leftVariance = 0;
      let rightVariance = 0;

      for (let index = 0; index < length; index++) {
        const leftDelta = leftValues[index] - leftMean;
        const rightDelta = rightValues[index] - rightMean;
        covariance += leftDelta * rightDelta;
        leftVariance += leftDelta ** 2;
        rightVariance += rightDelta ** 2;
      }

      const denominator = Math.sqrt(leftVariance * rightVariance);
      return denominator === 0 ? NaN : covariance / denominator;
    });

    this.builtins.set('ta.cog', (args, namedArgs, _ctx, scope, callId) => {
      const taCogArgs = ['source', 'length'];
      const source = this.toNumber(this.getOrderedCallArg(args, namedArgs, taCogArgs, 0));
      const length = this.normalizeLookbackLength(this.getOrderedCallArg(args, namedArgs, taCogArgs, 1));
      const values = this.getCompleteSourceWindow(scope, `_ta_cog_source_${callId}`, source, length);
      if (!values) return NaN;

      const sum = values.reduce((total, value) => total + value, 0);
      if (sum === 0) return NaN;

      const weighted = values.reduce((total, value, index) => total + value * (index + 1), 0);
      return -weighted / sum;
    });

    this.builtins.set('ta.median', (args, namedArgs, _ctx, scope, callId) => {
      const taMedianArgs = ['source', 'length'];
      const source = this.toNumber(this.getOrderedCallArg(args, namedArgs, taMedianArgs, 0));
      const length = this.normalizeLookbackLength(this.getOrderedCallArg(args, namedArgs, taMedianArgs, 1));
      const values = this.getCompleteSourceWindow(scope, `_ta_median_source_${callId}`, source, length);
      if (!values) return NaN;

      const sorted = [...values].sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
    });

    this.builtins.set('ta.mode', (args, namedArgs, _ctx, scope, callId) => {
      const taModeArgs = ['source', 'length'];
      const source = this.toNumber(this.getOrderedCallArg(args, namedArgs, taModeArgs, 0));
      const length = this.normalizeLookbackLength(this.getOrderedCallArg(args, namedArgs, taModeArgs, 1));
      const values = this.getCompleteSourceWindow(scope, `_ta_mode_source_${callId}`, source, length);
      if (!values) return NaN;

      const counts = new Map<number, number>();
      for (const value of values) {
        counts.set(value, (counts.get(value) ?? 0) + 1);
      }

      let mode = values[0];
      let modeCount = counts.get(mode) ?? 0;
      for (const [value, count] of counts) {
        if (count > modeCount || (count === modeCount && value < mode)) {
          mode = value;
          modeCount = count;
        }
      }
      return mode;
    });

    this.builtins.set('ta.percentile_nearest_rank', (args, namedArgs, _ctx, scope, callId) => {
      const taPercentileArgs = ['source', 'length', 'percentage'];
      const source = this.toNumber(this.getOrderedCallArg(args, namedArgs, taPercentileArgs, 0));
      const length = this.normalizeLookbackLength(this.getOrderedCallArg(args, namedArgs, taPercentileArgs, 1));
      const percentage = Math.min(100, Math.max(0, this.toNumber(this.getOrderedCallArg(args, namedArgs, taPercentileArgs, 2))));
      const values = this.getCompleteSourceWindow(scope, `_ta_percentile_nearest_source_${callId}`, source, length);
      if (!values || isNaN(percentage)) return NaN;

      const sorted = [...values].sort((a, b) => a - b);
      const rank = Math.max(1, Math.ceil((percentage / 100) * sorted.length));
      return sorted[rank - 1];
    });

    this.builtins.set('ta.percentile_linear_interpolation', (args, namedArgs, _ctx, scope, callId) => {
      const taPercentileArgs = ['source', 'length', 'percentage'];
      const source = this.toNumber(this.getOrderedCallArg(args, namedArgs, taPercentileArgs, 0));
      const length = this.normalizeLookbackLength(this.getOrderedCallArg(args, namedArgs, taPercentileArgs, 1));
      const percentage = Math.min(100, Math.max(0, this.toNumber(this.getOrderedCallArg(args, namedArgs, taPercentileArgs, 2))));
      const values = this.getCompleteSourceWindow(scope, `_ta_percentile_linear_source_${callId}`, source, length);
      if (!values || isNaN(percentage)) return NaN;

      const sorted = [...values].sort((a, b) => a - b);
      const rank = (percentage / 100) * (sorted.length - 1);
      const lower = Math.floor(rank);
      const upper = Math.ceil(rank);
      if (lower === upper) return sorted[lower];

      const fraction = rank - lower;
      return sorted[lower] + (sorted[upper] - sorted[lower]) * fraction;
    });

    this.builtins.set('ta.percentrank', (args, namedArgs, _ctx, scope, callId) => {
      const taPercentrankArgs = ['source', 'length'];
      const source = this.toNumber(this.getOrderedCallArg(args, namedArgs, taPercentrankArgs, 0));
      const length = this.normalizeLookbackLength(this.getOrderedCallArg(args, namedArgs, taPercentrankArgs, 1));
      const values = this.getCompleteSourceWindow(scope, `_ta_percentrank_source_${callId}`, source, length);
      if (!values) return NaN;

      const belowOrEqual = values.filter((value) => value <= source).length;
      return (belowOrEqual / values.length) * 100;
    });

    this.builtins.set('ta.cum', (args, namedArgs, _ctx, scope, callId) => {
      const taCumArgs = ['source'];
      const source = this.toNumber(this.getOrderedCallArg(args, namedArgs, taCumArgs, 0));
      if (isNaN(source)) return NaN;

      const key = `_ta_cum_${callId}`;
      const previous = (scope.get(key) as number | undefined) ?? 0;
      const total = previous + source;
      this.setBuiltinState(scope, key, total);
      return total;
    });

    // VWAP - Volume Weighted Average Price
    // Note: Simplified version - doesn't reset at session boundaries
    this.builtins.set('ta.vwap', (_args, _namedArgs, ctx, scope) => {
      // VWAP = Σ(Typical Price × Volume) / Σ(Volume)
      // Typical Price = (High + Low + Close) / 3

      const high = ctx.high.get(0)!;
      const low = ctx.low.get(0)!;
      const close = ctx.close.get(0)!;
      const volume = ctx.volume.get(0)!;

      const typicalPrice = (high + low + close) / 3;
      const tpv = typicalPrice * volume;

      // Get cumulative values from scope
      const cumTpvKey = '_vwap_cum_tpv';
      const cumVolKey = '_vwap_cum_vol';

      const prevCumTpv = (scope.get(cumTpvKey) as number) ?? 0;
      const prevCumVol = (scope.get(cumVolKey) as number) ?? 0;

      const cumTpv = prevCumTpv + tpv;
      const cumVol = prevCumVol + volume;

      scope.declare(cumTpvKey, 'var', cumTpv);
      scope.declare(cumVolKey, 'var', cumVol);

      return cumVol > 0 ? cumTpv / cumVol : NaN;
    });

    this.builtins.set('ta.stoch', (args, namedArgs, _ctx, scope, callId) => {
      const taStochArgs = ['source', 'high', 'low', 'length'];
      const source = this.toNumber(this.getOrderedCallArg(args, namedArgs, taStochArgs, 0));
      const highSource = this.toNumber(this.getOrderedCallArg(args, namedArgs, taStochArgs, 1));
      const lowSource = this.toNumber(this.getOrderedCallArg(args, namedArgs, taStochArgs, 2));
      const length = this.normalizeLookbackLength(this.getOrderedCallArg(args, namedArgs, taStochArgs, 3, 14));
      const windows = this.getCompletePairedSourceWindows(
        scope,
        `_ta_stoch_high_${callId}`,
        `_ta_stoch_low_${callId}`,
        highSource,
        lowSource,
        length,
      );
      if (isNaN(source) || !windows) return NaN;

      const [highValues, lowValues] = windows;
      const highestHigh = Math.max(...highValues);
      const lowestLow = Math.min(...lowValues);
      const range = highestHigh - lowestLow;
      return range === 0 ? NaN : ((source - lowestLow) / range) * 100;
    });

    this.builtins.set('ta.mfi', (args, namedArgs, ctx, scope, callId) => {
      const taMfiArgs = namedArgs.has('series') && !namedArgs.has('source') ? ['series', 'length'] : ['source', 'length'];
      const source = this.toNumber(this.getOrderedCallArg(args, namedArgs, taMfiArgs, 0));
      const length = this.normalizeLookbackLength(this.getOrderedCallArg(args, namedArgs, taMfiArgs, 1, 14));
      const volume = ctx.volume.get(0);
      const sourceKey = `_ta_mfi_source_${callId}`;
      const positiveKey = `_ta_mfi_positive_${callId}`;
      const negativeKey = `_ta_mfi_negative_${callId}`;
      const sourceHistory = (scope.get(sourceKey) as number[] | undefined) ?? [];
      const previousSource = sourceHistory[0];
      this.prependBoundedHistory(sourceHistory, source, length + 1);
      this.setBuiltinState(scope, sourceKey, sourceHistory);

      if (length < 1 || isNaN(source) || volume === undefined || isNaN(volume)) return NaN;

      let positiveFlow = 0;
      let negativeFlow = 0;
      if (previousSource !== undefined && !isNaN(previousSource)) {
        const rawFlow = source * volume;
        if (source > previousSource) positiveFlow = rawFlow;
        if (source < previousSource) negativeFlow = rawFlow;
      }

      const positiveFlows = this.updateBuiltinSourceHistory(scope, positiveKey, positiveFlow, length);
      const negativeFlows = this.updateBuiltinSourceHistory(scope, negativeKey, negativeFlow, length);
      if (positiveFlows.length < length || negativeFlows.length < length) return NaN;

      const positiveSum = positiveFlows.reduce((sum, value) => sum + value, 0);
      const negativeSum = negativeFlows.reduce((sum, value) => sum + value, 0);
      if (negativeSum === 0) return positiveSum === 0 ? 50 : 100;
      if (positiveSum === 0) return 0;
      return 100 - 100 / (1 + positiveSum / negativeSum);
    });

    this.builtins.set('ta.wpr', (args, namedArgs, ctx) => {
      const taWprArgs = ['length'];
      const length = this.normalizeLookbackLength(this.getOrderedCallArg(args, namedArgs, taWprArgs, 0, 14));
      const close = ctx.close.get(0);
      if (length < 1 || close === undefined || isNaN(close)) return NaN;

      let highestHigh = -Infinity;
      let lowestLow = Infinity;
      for (let offset = 0; offset < length; offset++) {
        const high = ctx.high.get(offset);
        const low = ctx.low.get(offset);
        if (high === undefined || low === undefined || isNaN(high) || isNaN(low)) return NaN;
        if (high > highestHigh) highestHigh = high;
        if (low < lowestLow) lowestLow = low;
      }

      const range = highestHigh - lowestLow;
      return range === 0 ? NaN : ((close - highestHigh) / range) * 100;
    });

    this.builtins.set('ta.cmo', (args, namedArgs, _ctx, scope, callId) => {
      const taSourceLengthArgs = ['source', 'length'];
      const source = this.toNumber(this.getOrderedCallArg(args, namedArgs, taSourceLengthArgs, 0));
      const length = this.normalizeLookbackLength(this.getOrderedCallArg(args, namedArgs, taSourceLengthArgs, 1, 14));
      const values = this.getCompleteSourceWindow(scope, `_ta_cmo_source_${callId}`, source, length + 1);
      if (!values) return NaN;

      let gains = 0;
      let losses = 0;
      for (let index = 0; index < length; index++) {
        const change = values[index] - values[index + 1];
        if (change > 0) gains += change;
        if (change < 0) losses -= change;
      }

      const total = gains + losses;
      return total === 0 ? 0 : ((gains - losses) / total) * 100;
    });

    this.builtins.set('ta.tsi', (args, namedArgs, _ctx, scope, callId) => {
      const taTsiArgs = ['source', 'short_length', 'long_length'];
      const source = this.toNumber(this.getOrderedCallArg(args, namedArgs, taTsiArgs, 0));
      const shortLength = this.normalizeLookbackLength(this.getOrderedCallArg(args, namedArgs, taTsiArgs, 1));
      const longLength = this.normalizeLookbackLength(this.getOrderedCallArg(args, namedArgs, taTsiArgs, 2));
      if (isNaN(source) || shortLength < 1 || longLength < 1) return NaN;

      const sourceKey = `_ta_tsi_source_${callId}`;
      const sourceHistory = (scope.get(sourceKey) as number[] | undefined) ?? [];
      const previousSource = sourceHistory[0];
      this.prependBoundedHistory(sourceHistory, source, 2);
      this.setBuiltinState(scope, sourceKey, sourceHistory);

      if (previousSource === undefined || isNaN(previousSource)) return NaN;

      const momentum = source - previousSource;
      const absMomentum = Math.abs(momentum);
      const longAlpha = 2 / (longLength + 1);
      const shortAlpha = 2 / (shortLength + 1);

      const ema = (key: string, value: number, alpha: number): number => {
        const previous = scope.get(key) as number | undefined;
        const next = previous === undefined || isNaN(previous) ? value : alpha * value + (1 - alpha) * previous;
        this.setBuiltinState(scope, key, next);
        return next;
      };

      const baseKey = `_ta_tsi_${callId}_${shortLength}_${longLength}`;
      const smoothedMomentum = ema(`${baseKey}_momentum_long`, momentum, longAlpha);
      const smoothedAbsMomentum = ema(`${baseKey}_abs_long`, absMomentum, longAlpha);
      const doubleSmoothedMomentum = ema(`${baseKey}_momentum_short`, smoothedMomentum, shortAlpha);
      const doubleSmoothedAbsMomentum = ema(`${baseKey}_abs_short`, smoothedAbsMomentum, shortAlpha);

      return doubleSmoothedAbsMomentum === 0 ? 0 : doubleSmoothedMomentum / doubleSmoothedAbsMomentum;
    });

    this.builtins.set('ta.kc', (args, namedArgs, _ctx, scope, callId) => {
      const taChannelArgs = ['series', 'length', 'mult', 'useTrueRange'];
      const source = this.toNumber(this.getOrderedCallArg(args, namedArgs, taChannelArgs, 0));
      const length = this.normalizeLookbackLength(this.getOrderedCallArg(args, namedArgs, taChannelArgs, 1));
      const multiplier = this.toNumber(this.getOrderedCallArg(args, namedArgs, taChannelArgs, 2));
      const useTrueRangeArg = this.getOrderedCallArg(args, namedArgs, taChannelArgs, 3);
      const useTrueRange = useTrueRangeArg === undefined ? true : this.isTruthy(useTrueRangeArg);

      return this.calculateKeltnerChannel(scope, callId, source, length, multiplier, useTrueRange);
    });

    this.builtins.set('ta.kcw', (args, namedArgs, _ctx, scope, callId) => {
      const taChannelArgs = ['series', 'length', 'mult', 'useTrueRange'];
      const source = this.toNumber(this.getOrderedCallArg(args, namedArgs, taChannelArgs, 0));
      const length = this.normalizeLookbackLength(this.getOrderedCallArg(args, namedArgs, taChannelArgs, 1));
      const multiplier = this.toNumber(this.getOrderedCallArg(args, namedArgs, taChannelArgs, 2));
      const useTrueRangeArg = this.getOrderedCallArg(args, namedArgs, taChannelArgs, 3);
      const useTrueRange = useTrueRangeArg === undefined ? true : this.isTruthy(useTrueRangeArg);
      const [basis, upper, lower] = this.calculateKeltnerChannel(scope, callId, source, length, multiplier, useTrueRange);

      return basis === 0 || isNaN(basis) || isNaN(upper) || isNaN(lower) ? NaN : (upper - lower) / basis;
    });

    // MOM - Momentum
    this.builtins.set('ta.mom', (args, namedArgs, _ctx, scope, callId) => {
      const taSourceLengthArgs = ['source', 'length'];
      const source = this.toNumber(this.getOrderedCallArg(args, namedArgs, taSourceLengthArgs, 0));
      const length = this.normalizeLookbackLength(this.getOrderedCallArg(args, namedArgs, taSourceLengthArgs, 1, 10));
      const values = this.getCompleteSourceWindow(scope, `_ta_mom_source_${callId}`, source, length + 1);
      const prev = values?.[length];

      if (prev === undefined) return NaN;

      // Momentum = Current - Previous (length bars ago)
      return source - prev;
    });

    this.builtins.set('ta.cci', (args, namedArgs, _ctx, scope, callId) => {
      const taSourceLengthArgs = ['source', 'length'];
      const source = this.toNumber(this.getOrderedCallArg(args, namedArgs, taSourceLengthArgs, 0));
      const length = this.normalizeLookbackLength(this.getOrderedCallArg(args, namedArgs, taSourceLengthArgs, 1, 20));
      const values = this.getCompleteSourceWindow(scope, `_ta_cci_source_${callId}`, source, length);
      if (!values) return NaN;

      const basis = values.reduce((sum, value) => sum + value, 0) / length;
      const meanDeviation = values.reduce((sum, value) => sum + Math.abs(value - basis), 0) / length;
      return meanDeviation === 0 ? 0 : (source - basis) / (0.015 * meanDeviation);
    });

    // OBV - On-Balance Volume
    this.builtins.set('ta.obv', (args, namedArgs, ctx, scope, callId) => {
      const taObvArgs = ['source', 'volume'];
      const source = this.toNumber(this.getOrderedCallArg(args, namedArgs, taObvArgs, 0, ctx.close.get(0)));
      const volume = this.toNumber(this.getOrderedCallArg(args, namedArgs, taObvArgs, 1, ctx.volume.get(0)));
      const previousSource = this.getCompleteSourceWindow(scope, `_ta_obv_source_${callId}`, source, 2)?.[1];
      return this.updateObv(source, previousSource, volume, scope, `_ta_obv_value_${callId}`);
    });

    // =========================================================================
    // Phase 1: Additional TA Functions
    // =========================================================================

    // RMA - Wilder's Smoothed Moving Average (also known as SMMA)
    // Formula: alpha = 1/length, rma = alpha * source + (1 - alpha) * prev_rma
    this.builtins.set('ta.rma', (args, namedArgs, _ctx, scope, callId) => {
      const taSourceLengthArgs = ['source', 'length'];
      const source = this.toNumber(this.getOrderedCallArg(args, namedArgs, taSourceLengthArgs, 0));
      const length = this.normalizeLookbackLength(this.getOrderedCallArg(args, namedArgs, taSourceLengthArgs, 1));
      if (isNaN(source) || length < 1) return NaN;
      const alpha = 1 / length;

      const rmaKey = `_ta_rma_${callId}_${length}`;
      const previous = scope.get(rmaKey) as number | undefined;
      const rma = previous === undefined || isNaN(previous) ? source : alpha * source + (1 - alpha) * previous;
      this.setBuiltinState(scope, rmaKey, rma);
      return rma;
    });

    // WMA - Weighted Moving Average
    // Formula: wma = sum(source[i] * weight[i]) / sum(weights) where weight = length - i
    this.builtins.set('ta.wma', (args, namedArgs, _ctx, scope, callId) => {
      const taSourceLengthArgs = ['source', 'length'];
      const source = this.toNumber(this.getOrderedCallArg(args, namedArgs, taSourceLengthArgs, 0));
      const length = this.normalizeLookbackLength(this.getOrderedCallArg(args, namedArgs, taSourceLengthArgs, 1));
      const values = this.getCompleteSourceWindow(scope, `_ta_wma_source_${callId}`, source, length);
      if (!values) return NaN;

      let weightedSum = 0;
      let weightSum = 0;

      for (let i = 0; i < length; i++) {
        const val = values[i]!;

        const weight = length - i; // Most recent has highest weight
        weightedSum += val * weight;
        weightSum += weight;
      }

      return weightedSum / weightSum;
    });

    this.builtins.set('ta.swma', (args, namedArgs, _ctx, scope, callId) => {
      const taSwmaArgs = ['source'];
      const source = this.toNumber(this.getOrderedCallArg(args, namedArgs, taSwmaArgs, 0));
      const values = this.getCompleteSourceWindow(scope, `_ta_swma_source_${callId}`, source, 4);
      if (!values) return NaN;

      return (values[0] + values[1] * 2 + values[2] * 2 + values[3]) / 6;
    });

    this.builtins.set('ta.alma', (args, namedArgs, _ctx, scope, callId) => {
      const taAlmaArgs = ['series', 'length', 'offset', 'sigma', 'floor'];
      const source = this.toNumber(this.getOrderedCallArg(args, namedArgs, taAlmaArgs, 0));
      const length = this.normalizeLookbackLength(this.getOrderedCallArg(args, namedArgs, taAlmaArgs, 1));
      const offset = this.toNumber(this.getOrderedCallArg(args, namedArgs, taAlmaArgs, 2));
      const sigma = this.toNumber(this.getOrderedCallArg(args, namedArgs, taAlmaArgs, 3));
      const useFlooredOffset = this.isTruthy(this.getOrderedCallArg(args, namedArgs, taAlmaArgs, 4));
      const values = this.getCompleteSourceWindow(scope, `_ta_alma_source_${callId}`, source, length);
      if (!values || isNaN(offset) || !Number.isFinite(sigma) || sigma === 0) return NaN;

      const m = useFlooredOffset ? Math.floor(offset * (length - 1)) : offset * (length - 1);
      const s = length / sigma;
      let weightedSum = 0;
      let weightSum = 0;

      for (let i = 0; i < length; i++) {
        const weight = Math.exp(-Math.pow(i - m, 2) / (2 * s * s));
        weightedSum += values[length - 1 - i] * weight;
        weightSum += weight;
      }

      return weightSum === 0 ? NaN : weightedSum / weightSum;
    });

    // HMA - Hull Moving Average
    // Formula: wma(2 * wma(src, len/2) - wma(src, len), sqrt(len))
    this.builtins.set('ta.hma', (args, namedArgs, ctx, scope, callId) => {
      const taSourceLengthArgs = ['source', 'length'];
      const source = this.toNumber(this.getOrderedCallArg(args, namedArgs, taSourceLengthArgs, 0));
      const length = this.normalizeLookbackLength(this.getOrderedCallArg(args, namedArgs, taSourceLengthArgs, 1));

      const series = this.getSeriesForSource(source, ctx);

      // Helper to calculate WMA
      const calcWma = (len: number, offset: number = 0): number => {
        let weightedSum = 0;
        let weightSum = 0;

        for (let i = 0; i < len; i++) {
          const val = series.get(i + offset);
          if (val === undefined || isNaN(val)) return NaN;

          const weight = len - i;
          weightedSum += val * weight;
          weightSum += weight;
        }

        return weightedSum / weightSum;
      };

      const halfLen = Math.floor(length / 2);
      const sqrtLen = Math.round(Math.sqrt(length));

      // Calculate WMA(src, len/2) and WMA(src, len) for current and past bars
      const hmaRawKey = `_ta_hma_raw_${callId}_${length}`;
      let hmaRawHistory = (scope.get(hmaRawKey) as number[]) ?? [];

      const wmaHalf = calcWma(halfLen);
      const wmaFull = calcWma(length);

      if (isNaN(wmaHalf) || isNaN(wmaFull)) return NaN;

      const rawHma = 2 * wmaHalf - wmaFull;

      hmaRawHistory.push(rawHma);
      if (hmaRawHistory.length > sqrtLen) hmaRawHistory.shift();
      scope.declare(hmaRawKey, 'var', hmaRawHistory);

      // WMA of the raw values
      if (hmaRawHistory.length < sqrtLen) return NaN;

      let weightedSum = 0;
      let weightSum = 0;
      for (let i = 0; i < sqrtLen; i++) {
        const idx = hmaRawHistory.length - 1 - i;
        const weight = sqrtLen - i;
        weightedSum += hmaRawHistory[idx] * weight;
        weightSum += weight;
      }

      return weightedSum / weightSum;
    });

    // BB - Bollinger Bands
    // Returns [middle, upper, lower]
    this.builtins.set('ta.bb', (args, namedArgs, _ctx, scope, callId) => {
      const taBbArgs = ['series', 'length', 'mult'];
      const source = this.toNumber(this.getOrderedCallArg(args, namedArgs, taBbArgs, 0));
      const length = this.normalizeLookbackLength(this.getOrderedCallArg(args, namedArgs, taBbArgs, 1));
      const mult = this.toNumber(this.getOrderedCallArg(args, namedArgs, taBbArgs, 2, 2.0));
      const values = this.getCompleteSourceWindow(scope, `_ta_bb_source_${callId}`, source, length);
      if (!values) return [NaN, NaN, NaN];

      // Calculate SMA (middle)
      const sum = values.reduce((total, value) => total + value, 0);

      const middle = sum / length;

      // Calculate standard deviation
      const squaredDiffs = values.map((v) => Math.pow(v - middle, 2));
      const variance = squaredDiffs.reduce((a, b) => a + b, 0) / length;
      const stdev = Math.sqrt(variance);

      const upper = middle + mult * stdev;
      const lower = middle - mult * stdev;

      return [middle, upper, lower];
    });

    // BBW - Bollinger Bands Width
    this.builtins.set('ta.bbw', (args, namedArgs, ctx, scope, callId) => {
      const taBbArgs = ['series', 'length', 'mult'];
      const source = this.toNumber(this.getOrderedCallArg(args, namedArgs, taBbArgs, 0));
      const length = this.normalizeLookbackLength(this.getOrderedCallArg(args, namedArgs, taBbArgs, 1));
      const mult = this.toNumber(this.getOrderedCallArg(args, namedArgs, taBbArgs, 2, 2.0));
      const bb = this.builtins.get('ta.bb') as BuiltinFunction | undefined;
      if (!bb) return NaN;

      const [middle, upper, lower] = bb([source, length, mult], new Map(), ctx, scope, callId) as number[];
      if (middle === 0 || isNaN(middle) || isNaN(upper) || isNaN(lower)) return NaN;

      return (upper - lower) / middle;
    });

    // ROC - Rate of Change (percentage)
    // Formula: (current - previous) / previous * 100
    this.builtins.set('ta.roc', (args, namedArgs, _ctx, scope, callId) => {
      const taSourceLengthArgs = ['source', 'length'];
      const source = this.toNumber(this.getOrderedCallArg(args, namedArgs, taSourceLengthArgs, 0));
      const length = this.normalizeLookbackLength(this.getOrderedCallArg(args, namedArgs, taSourceLengthArgs, 1, 1));
      const values = this.getCompleteSourceWindow(scope, `_ta_roc_source_${callId}`, source, length + 1);
      const prev = values?.[length];

      if (prev === undefined || prev === 0) return NaN;

      return ((source - prev) / prev) * 100;
    });

    // TR - True Range (as a function, can also be accessed as variable)
    this.builtins.set('ta.tr', (args, namedArgs) => {
      return this.currentTrueRange(this.isTruthy(this.getCallArg(args, namedArgs, 0, 'handle_na', false)));
    });

    // SuperTrend - ATR-based trend indicator
    // Returns [supertrend value, direction (1 = up, -1 = down)]
    this.builtins.set('ta.supertrend', (args, namedArgs, ctx, scope) => {
      const factor = this.toNumber(this.getCallArg(args, namedArgs, 0, 'factor', 3.0));
      const atrLength = this.normalizeLookbackLength(this.getCallArg(args, namedArgs, 1, 'atrPeriod', 10));

      const high = ctx.high.get(0)!;
      const low = ctx.low.get(0)!;
      const close = ctx.close.get(0)!;

      // Calculate ATR using RMA
      const prevClose = ctx.close.get(1);
      let tr: number;
      if (prevClose === undefined) {
        tr = high - low;
      } else {
        tr = Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose));
      }

      const atrKey = `_st_atr_${atrLength}`;
      let atr = scope.get(atrKey) as number | undefined;

      if (atr === undefined || isNaN(atr)) {
        // Initialize with simple average
        let sum = 0;
        for (let i = 0; i < atrLength; i++) {
          const h = ctx.high.get(i);
          const l = ctx.low.get(i);
          const pc = ctx.close.get(i + 1);
          if (h === undefined || l === undefined) continue;
          let t = h - l;
          if (pc !== undefined) {
            t = Math.max(h - l, Math.abs(h - pc), Math.abs(l - pc));
          }
          sum += t;
        }
        atr = sum / atrLength;
      } else {
        atr = (atr * (atrLength - 1) + tr) / atrLength;
      }
      scope.declare(atrKey, 'var', atr);

      // Calculate basic upper and lower bands
      const hl2 = (high + low) / 2;
      const basicUpperBand = hl2 + factor * atr;
      const basicLowerBand = hl2 - factor * atr;

      // Get previous values
      const prevUpperKey = `_st_upper_${factor}_${atrLength}`;
      const prevLowerKey = `_st_lower_${factor}_${atrLength}`;
      const prevDirKey = `_st_dir_${factor}_${atrLength}`;

      let prevUpper = scope.get(prevUpperKey) as number | undefined;
      let prevLower = scope.get(prevLowerKey) as number | undefined;
      let prevDir = scope.get(prevDirKey) as number | undefined;
      const prevCloseVal = ctx.close.get(1);

      // Final upper band
      let finalUpperBand: number;
      if (prevUpper === undefined || prevCloseVal === undefined) {
        finalUpperBand = basicUpperBand;
      } else {
        finalUpperBand = basicUpperBand < prevUpper || prevCloseVal > prevUpper ? basicUpperBand : prevUpper;
      }

      // Final lower band
      let finalLowerBand: number;
      if (prevLower === undefined || prevCloseVal === undefined) {
        finalLowerBand = basicLowerBand;
      } else {
        finalLowerBand = basicLowerBand > prevLower || prevCloseVal < prevLower ? basicLowerBand : prevLower;
      }

      // Determine direction
      let direction: number;
      if (prevDir === undefined) {
        direction = close > finalUpperBand ? 1 : -1;
      } else {
        if (prevDir === -1 && close > finalUpperBand) {
          direction = 1;
        } else if (prevDir === 1 && close < finalLowerBand) {
          direction = -1;
        } else {
          direction = prevDir;
        }
      }

      // SuperTrend value
      const supertrend = direction === 1 ? finalLowerBand : finalUpperBand;

      scope.declare(prevUpperKey, 'var', finalUpperBand);
      scope.declare(prevLowerKey, 'var', finalLowerBand);
      scope.declare(prevDirKey, 'var', direction);

      return [supertrend, direction];
    });

    // DMI - Directional Movement Index
    // Returns [diPlus, diMinus, adx]
    this.builtins.set('ta.dmi', (args, namedArgs, ctx, scope) => {
      const length = this.normalizeLookbackLength(this.getCallArg(args, namedArgs, 0, 'diLength', 14));
      const adxSmoothing = this.normalizeLookbackLength(this.getCallArg(args, namedArgs, 1, 'adxSmoothing', 14));
      if (length < 1 || adxSmoothing < 1) {
        return [NaN, NaN, NaN];
      }

      const high = ctx.high.get(0)!;
      const low = ctx.low.get(0)!;
      const prevHigh = ctx.high.get(1);
      const prevLow = ctx.low.get(1);
      const prevClose = ctx.close.get(1);

      // Calculate True Range
      let tr: number;
      if (prevClose === undefined) {
        tr = high - low;
      } else {
        tr = Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose));
      }

      // Calculate +DM and -DM
      let plusDM = 0;
      let minusDM = 0;

      if (prevHigh !== undefined && prevLow !== undefined) {
        const upMove = high - prevHigh;
        const downMove = prevLow - low;

        if (upMove > downMove && upMove > 0) {
          plusDM = upMove;
        }
        if (downMove > upMove && downMove > 0) {
          minusDM = downMove;
        }
      }

      // Smooth with RMA (Wilder's smoothing)
      const alpha = 1 / length;

      const smoothTrKey = `_dmi_tr_${length}`;
      const smoothPlusDmKey = `_dmi_plusdm_${length}`;
      const smoothMinusDmKey = `_dmi_minusdm_${length}`;
      const smoothAdxKey = `_dmi_adx_${length}_${adxSmoothing}`;

      let smoothTr = (scope.get(smoothTrKey) as number) ?? tr;
      let smoothPlusDm = (scope.get(smoothPlusDmKey) as number) ?? plusDM;
      let smoothMinusDm = (scope.get(smoothMinusDmKey) as number) ?? minusDM;

      smoothTr = alpha * tr + (1 - alpha) * smoothTr;
      smoothPlusDm = alpha * plusDM + (1 - alpha) * smoothPlusDm;
      smoothMinusDm = alpha * minusDM + (1 - alpha) * smoothMinusDm;

      scope.declare(smoothTrKey, 'var', smoothTr);
      scope.declare(smoothPlusDmKey, 'var', smoothPlusDm);
      scope.declare(smoothMinusDmKey, 'var', smoothMinusDm);

      // Calculate DI+ and DI-
      const diPlus = smoothTr > 0 ? (smoothPlusDm / smoothTr) * 100 : 0;
      const diMinus = smoothTr > 0 ? (smoothMinusDm / smoothTr) * 100 : 0;

      // Calculate DX and smooth to get ADX
      const diSum = diPlus + diMinus;
      const dx = diSum > 0 ? (Math.abs(diPlus - diMinus) / diSum) * 100 : 0;

      let adx = (scope.get(smoothAdxKey) as number) ?? dx;
      const adxAlpha = 1 / adxSmoothing;
      adx = adxAlpha * dx + (1 - adxAlpha) * adx;
      scope.declare(smoothAdxKey, 'var', adx);

      return [diPlus, diMinus, adx];
    });

    // SAR - Parabolic Stop and Reverse
    this.builtins.set('ta.sar', (args, namedArgs, ctx, scope) => {
      const start = this.toNumber(this.getCallArg(args, namedArgs, 0, 'start', 0.02));
      const increment = this.toNumber(this.getCallArg(args, namedArgs, 1, 'inc', 0.02));
      const maximum = this.toNumber(this.getCallArg(args, namedArgs, 2, 'max', 0.2));

      const high = ctx.high.get(0)!;
      const low = ctx.low.get(0)!;

      const sarKey = '_sar_value';
      const epKey = '_sar_ep'; // Extreme Point
      const afKey = '_sar_af'; // Acceleration Factor
      const trendKey = '_sar_trend'; // 1 = up, -1 = down

      let sar = scope.get(sarKey) as number | undefined;
      let ep = scope.get(epKey) as number | undefined;
      let af = scope.get(afKey) as number | undefined;
      let trend = scope.get(trendKey) as number | undefined;

      if (sar === undefined || ep === undefined || af === undefined || trend === undefined) {
        // Initialize - start with downtrend assumption
        sar = high;
        ep = low;
        af = start;
        trend = -1;
      } else {
        // Calculate new SAR
        sar = sar + af * (ep - sar);

        if (trend === 1) {
          // Uptrend
          // SAR can't be above prior two lows
          const prevLow1 = ctx.low.get(1);
          const prevLow2 = ctx.low.get(2);
          if (prevLow1 !== undefined) sar = Math.min(sar, prevLow1);
          if (prevLow2 !== undefined) sar = Math.min(sar, prevLow2);

          if (low < sar) {
            // Trend reversal
            trend = -1;
            sar = ep;
            ep = low;
            af = start;
          } else {
            if (high > ep) {
              ep = high;
              af = Math.min(af + increment, maximum);
            }
          }
        } else {
          // Downtrend
          // SAR can't be below prior two highs
          const prevHigh1 = ctx.high.get(1);
          const prevHigh2 = ctx.high.get(2);
          if (prevHigh1 !== undefined) sar = Math.max(sar, prevHigh1);
          if (prevHigh2 !== undefined) sar = Math.max(sar, prevHigh2);

          if (high > sar) {
            // Trend reversal
            trend = 1;
            sar = ep;
            ep = high;
            af = start;
          } else {
            if (low < ep) {
              ep = low;
              af = Math.min(af + increment, maximum);
            }
          }
        }
      }

      scope.declare(sarKey, 'var', sar);
      scope.declare(epKey, 'var', ep);
      scope.declare(afKey, 'var', af);
      scope.declare(trendKey, 'var', trend);

      return sar;
    });

    // PivotHigh - Detect pivot highs
    // Returns the pivot high price or na
    this.builtins.set('ta.pivothigh', (args, namedArgs, ctx) => {
      const hasSource = namedArgs.has('source') || args.length >= 3 || (args.length === 1 && namedArgs.size === 0);
      const sourceArg = hasSource ? this.getCallArg(args, namedArgs, 0, 'source') : ctx.high.get(0)!;
      const leftIndex = hasSource ? 1 : 0;
      const rightIndex = hasSource ? 2 : 1;
      const source = this.toNumber(sourceArg);
      const leftBars = this.normalizeLookbackLength(this.getCallArg(args, namedArgs, leftIndex, 'leftbars', 5));
      const rightBars = this.normalizeLookbackLength(this.getCallArg(args, namedArgs, rightIndex, 'rightbars', 5));

      const series = this.getSeriesForSource(source, ctx);

      // We need rightBars of data after the potential pivot
      // The pivot would be at offset = rightBars
      const pivotValue = series.get(rightBars);
      if (pivotValue === undefined) return NaN;

      // Check left side (bars before the pivot, at higher offsets)
      for (let i = 1; i <= leftBars; i++) {
        const val = series.get(rightBars + i);
        if (val === undefined || val >= pivotValue) return NaN;
      }

      // Check right side (bars after the pivot, at lower offsets)
      for (let i = 1; i <= rightBars; i++) {
        const val = series.get(rightBars - i);
        if (val === undefined || val >= pivotValue) return NaN;
      }

      return pivotValue;
    });

    // PivotLow - Detect pivot lows
    // Returns the pivot low price or na
    this.builtins.set('ta.pivotlow', (args, namedArgs, ctx) => {
      const hasSource = namedArgs.has('source') || args.length >= 3 || (args.length === 1 && namedArgs.size === 0);
      const sourceArg = hasSource ? this.getCallArg(args, namedArgs, 0, 'source') : ctx.low.get(0)!;
      const leftIndex = hasSource ? 1 : 0;
      const rightIndex = hasSource ? 2 : 1;
      const source = this.toNumber(sourceArg);
      const leftBars = this.normalizeLookbackLength(this.getCallArg(args, namedArgs, leftIndex, 'leftbars', 5));
      const rightBars = this.normalizeLookbackLength(this.getCallArg(args, namedArgs, rightIndex, 'rightbars', 5));

      const series = this.getSeriesForSource(source, ctx);

      // The pivot would be at offset = rightBars
      const pivotValue = series.get(rightBars);
      if (pivotValue === undefined) return NaN;

      // Check left side (bars before the pivot, at higher offsets)
      for (let i = 1; i <= leftBars; i++) {
        const val = series.get(rightBars + i);
        if (val === undefined || val <= pivotValue) return NaN;
      }

      // Check right side (bars after the pivot, at lower offsets)
      for (let i = 1; i <= rightBars; i++) {
        const val = series.get(rightBars - i);
        if (val === undefined || val <= pivotValue) return NaN;
      }

      return pivotValue;
    });

    this.builtins.set('ta.linreg', (args, namedArgs, _ctx, scope, callId) => {
      const source = this.toNumber(this.getCallArg(args, namedArgs, 0, 'source'));
      const length = this.normalizeLookbackLength(this.getCallArg(args, namedArgs, 1, 'length'));
      const offset = this.toNumber(this.getCallArg(args, namedArgs, 2, 'offset', 0));
      const values = this.getCompleteSourceWindow(scope, `_ta_linreg_source_${callId}`, source, length);
      if (!values || isNaN(offset)) return NaN;

      const n = length;
      let sumX = 0;
      let sumY = 0;
      let sumXY = 0;
      let sumX2 = 0;

      for (let i = 0; i < n; i++) {
        const x = i;
        const y = values[n - 1 - i];
        sumX += x;
        sumY += y;
        sumXY += x * y;
        sumX2 += x * x;
      }

      const denominator = n * sumX2 - sumX * sumX;
      if (denominator === 0) return NaN;

      const slope = (n * sumXY - sumX * sumY) / denominator;
      const intercept = (sumY - slope * sumX) / n;

      return intercept + slope * (length - 1 - offset);
    });
  }

  private registerTimeBuiltins(): void {
    const timeframeArgs = ['timeframe'] as const;
    const secondsArgs = ['seconds'] as const;
    const calendarArgs = ['time', 'timezone'] as const;

    this.builtins.set('timestamp', (args, namedArgs) => this.evaluateTimestamp(args, namedArgs));
    this.builtins.set('time', (args, namedArgs) => this.evaluateTimeFilter(args, namedArgs, false));
    this.builtins.set('time_close', (args, namedArgs) => this.evaluateTimeFilter(args, namedArgs, true));
    this.builtins.set('timeframe.in_seconds', (args, namedArgs) => {
      const timeframeArg = this.getOrderedCallArg(args, namedArgs, timeframeArgs, 0, this.ctx.timeframe.period);
      const timeframe = timeframeArg === undefined || timeframeArg === '' ? this.ctx.timeframe.period : this.toStringValue(timeframeArg);
      const duration = this.getTimeframeDurationMs(timeframe);
      return duration === null ? Number.NaN : duration / 1000;
    });
    this.builtins.set('timeframe.from_seconds', (args, namedArgs) => {
      return this.timeframeFromSeconds(this.toNumber(this.getOrderedCallArg(args, namedArgs, secondsArgs, 0)));
    });
    this.builtins.set('timeframe.change', (args, namedArgs) => {
      const timeframeArg = this.getOrderedCallArg(args, namedArgs, timeframeArgs, 0, this.ctx.timeframe.period);
      const timeframe = timeframeArg === undefined || timeframeArg === '' ? this.ctx.timeframe.period : this.toStringValue(timeframeArg);
      const duration = this.getTimeframeDurationMs(timeframe);
      const currentTime = this.ctx.time.get(0);
      const previousTime = this.ctx.time.get(1);
      if (duration === null || currentTime === undefined || !Number.isFinite(currentTime)) return false;
      if (previousTime === undefined || !Number.isFinite(previousTime)) return true;

      const currentTimezoneOffsetMs = this.getTimezoneOffsetMinutes(this.ctx.syminfo.timezone, currentTime) * 60_000;
      const previousTimezoneOffsetMs = this.getTimezoneOffsetMinutes(this.ctx.syminfo.timezone, previousTime) * 60_000;
      return Math.floor((currentTime + currentTimezoneOffsetMs) / duration) !== Math.floor((previousTime + previousTimezoneOffsetMs) / duration);
    });

    for (const part of ['year', 'month', 'weekofyear', 'dayofmonth', 'dayofweek', 'hour', 'minute', 'second']) {
      this.builtins.set(part, (args, namedArgs) => {
        const timestampArg = this.getOrderedCallArg(args, namedArgs, calendarArgs, 0, this.ctx.time.get(0));
        const timezoneArg = this.getOrderedCallArg(args, namedArgs, calendarArgs, 1, this.ctx.syminfo.timezone);
        const timestamp = this.toNumber(timestampArg);
        const timezone = timezoneArg === undefined || timezoneArg === '' ? this.ctx.syminfo.timezone : this.toStringValue(timezoneArg);
        return this.getCalendarPart(part, timestamp, timezone);
      });
    }

    this.builtins.set('dayofweek.sunday', () => 1);
    this.builtins.set('dayofweek.monday', () => 2);
    this.builtins.set('dayofweek.tuesday', () => 3);
    this.builtins.set('dayofweek.wednesday', () => 4);
    this.builtins.set('dayofweek.thursday', () => 5);
    this.builtins.set('dayofweek.friday', () => 6);
    this.builtins.set('dayofweek.saturday', () => 7);
  }

  private timeframeFromSeconds(seconds: number): string {
    if (!Number.isFinite(seconds) || seconds <= 0) return '';

    const roundedSeconds = Math.ceil(seconds);
    const secondsMultipliers = [1, 5, 10, 15, 30, 45];
    const secondsMatch = secondsMultipliers.find((multiplier) => roundedSeconds <= multiplier);
    if (secondsMatch !== undefined) return `${secondsMatch}S`;

    if (roundedSeconds < 86_400) {
      return String(Math.min(1440, Math.ceil(roundedSeconds / 60)));
    }

    if (roundedSeconds < 604_800) {
      return `${Math.min(365, Math.ceil(roundedSeconds / 86_400))}D`;
    }

    if (roundedSeconds < 2_592_000) {
      return `${Math.min(52, Math.ceil(roundedSeconds / 604_800))}W`;
    }

    return `${Math.min(12, Math.ceil(roundedSeconds / 2_592_000))}M`;
  }

  private evaluateTimeFilter(args: unknown[], namedArgs: Map<string, unknown>, closeTime: boolean): number {
    const timeArgs = ['timeframe', 'session', 'timezone'] as const;
    const timestamp = this.ctx.time.get(0) ?? Number.NaN;
    const timeframeArg = this.getOrderedCallArg(args, namedArgs, timeArgs, 0, this.ctx.timeframe.period);
    const sessionArg = this.getOrderedCallArg(args, namedArgs, timeArgs, 1);
    const timezoneArg = this.getOrderedCallArg(args, namedArgs, timeArgs, 2, this.ctx.syminfo.timezone);
    const timeframe = timeframeArg === undefined || timeframeArg === '' ? this.ctx.timeframe.period : this.toStringValue(timeframeArg);
    const session = sessionArg === undefined || sessionArg === '' ? undefined : this.toStringValue(sessionArg);
    const timezone = timezoneArg === undefined || timezoneArg === '' ? this.ctx.syminfo.timezone : this.toStringValue(timezoneArg);

    if (!Number.isFinite(timestamp)) return Number.NaN;
    if (session && this.isExchangeSessionClosed(timestamp, timezone, this.getRuntimeSessionKind(session, timestamp, timezone))) {
      return Number.NaN;
    }
    if (session && !this.isTimestampInSession(timestamp, session, timezone)) {
      return Number.NaN;
    }

    const openTime = this.getTimeframeOpenTime(timestamp, timeframe, timezone);
    return closeTime ? this.getTimeframeCloseTime(openTime, timeframe, timezone) : openTime;
  }

  private evaluateTimestamp(args: unknown[], namedArgs: Map<string, unknown>): number {
    const timestampDateArgs = ['year', 'month', 'day', 'hour', 'minute', 'second'] as const;
    if (args.length === 0 && namedArgs.size === 0) return Number.NaN;

    if (namedArgs.size === 0 && args.length === 1 && typeof args[0] === 'string') {
      const parsed = Date.parse(args[0]);
      return Number.isFinite(parsed) ? parsed : Number.NaN;
    }

    let timezone = this.ctx.syminfo.timezone;
    let positionalDateArgs = args;
    if (namedArgs.has('timezone')) {
      timezone = this.toStringValue(namedArgs.get('timezone'));
    } else if (typeof args[0] === 'string') {
      timezone = this.toStringValue(args[0]);
      positionalDateArgs = args.slice(1);
    }

    const year = this.toNumber(this.getOrderedCallArg(positionalDateArgs, namedArgs, timestampDateArgs, 0));
    const month = this.toNumber(this.getOrderedCallArg(positionalDateArgs, namedArgs, timestampDateArgs, 1));
    const day = this.toNumber(this.getOrderedCallArg(positionalDateArgs, namedArgs, timestampDateArgs, 2));
    const hour = this.toNumber(this.getOrderedCallArg(positionalDateArgs, namedArgs, timestampDateArgs, 3, 0));
    const minute = this.toNumber(this.getOrderedCallArg(positionalDateArgs, namedArgs, timestampDateArgs, 4, 0));
    const second = this.toNumber(this.getOrderedCallArg(positionalDateArgs, namedArgs, timestampDateArgs, 5, 0));

    if ([year, month, day, hour, minute, second].some((value) => !Number.isFinite(value))) {
      return Number.NaN;
    }

    return this.resolveLocalTimestamp(timezone, year, month, day, hour, minute, second);
  }

  private resolveLocalTimestamp(timezone: string, year: number, month: number, day: number, hour: number, minute: number, second: number): number {
    const utcGuess = Date.UTC(Math.trunc(year), Math.trunc(month) - 1, Math.trunc(day), Math.trunc(hour), Math.trunc(minute), Math.trunc(second));
    const initialOffset = this.getTimezoneOffsetMinutes(timezone, utcGuess);
    const resolvedTimestamp = utcGuess - initialOffset * 60000;
    const resolvedOffset = this.getTimezoneOffsetMinutes(timezone, resolvedTimestamp);
    const finalTimestamp = utcGuess - resolvedOffset * 60000;
    const finalOffset = this.getTimezoneOffsetMinutes(timezone, finalTimestamp);

    const localDate = new Date(finalTimestamp + finalOffset * 60000);
    const roundTrips =
      localDate.getUTCFullYear() === Math.trunc(year) &&
      localDate.getUTCMonth() === Math.trunc(month) - 1 &&
      localDate.getUTCDate() === Math.trunc(day) &&
      localDate.getUTCHours() === Math.trunc(hour) &&
      localDate.getUTCMinutes() === Math.trunc(minute) &&
      localDate.getUTCSeconds() === Math.trunc(second);

    if (!roundTrips && resolvedOffset !== initialOffset) {
      return finalTimestamp + (resolvedOffset - initialOffset) * 60000;
    }

    return finalTimestamp;
  }

  private getTradingDayTime(timestamp: unknown, timezone: string): number {
    const value = this.toNumber(timestamp);
    if (!Number.isFinite(value)) return Number.NaN;
    const year = this.getCalendarPart('year', value, timezone);
    const month = this.getCalendarPart('month', value, timezone);
    const day = this.getCalendarPart('dayofmonth', value, timezone);
    return this.resolveLocalTimestamp(timezone, year, month, day, 0, 0, 0);
  }

  private getCalendarPart(part: string, timestamp: unknown, timezone: string): number {
    const value = this.toNumber(timestamp);
    if (!Number.isFinite(value)) return Number.NaN;

    const date = new Date(value + this.getTimezoneOffsetMinutes(timezone, value) * 60000);
    switch (part) {
      case 'year':
        return date.getUTCFullYear();
      case 'month':
        return date.getUTCMonth() + 1;
      case 'weekofyear':
        return this.getIsoWeek(date);
      case 'dayofmonth':
        return date.getUTCDate();
      case 'dayofweek':
        return date.getUTCDay() + 1;
      case 'hour':
        return date.getUTCHours();
      case 'minute':
        return date.getUTCMinutes();
      case 'second':
        return date.getUTCSeconds();
      default:
        return Number.NaN;
    }
  }

  private getBarCloseTime(timestamp: unknown, timeframe: string): number {
    const value = this.toNumber(timestamp);
    const duration = this.getTimeframeDurationMs(timeframe);
    if (!Number.isFinite(value) || duration === null) return Number.NaN;
    return value + duration;
  }

  private getTimeframeOpenTime(timestamp: number, timeframe: string, timezone: string): number {
    const spec = this.parseTimeframeSpec(timeframe);
    if (!spec || spec.unit === 'tick') return Number.NaN;
    if (spec.period === this.ctx.timeframe.period) return timestamp;

    if (spec.unit === 'month') {
      const year = this.getCalendarPart('year', timestamp, timezone);
      const month = this.getCalendarPart('month', timestamp, timezone);
      const monthIndex = year * 12 + (month - 1);
      const bucketMonthIndex = Math.floor(monthIndex / spec.multiplier) * spec.multiplier;
      const bucketYear = Math.floor(bucketMonthIndex / 12);
      const bucketMonth = (bucketMonthIndex % 12) + 1;
      return this.resolveLocalTimestamp(timezone, bucketYear, bucketMonth, 1, 0, 0, 0);
    }

    if (spec.unit === 'week') {
      const offsetMinutes = this.getTimezoneOffsetMinutes(timezone, timestamp);
      const localDate = new Date(timestamp + offsetMinutes * 60_000);
      const localMidnight = Date.UTC(localDate.getUTCFullYear(), localDate.getUTCMonth(), localDate.getUTCDate());
      const mondayOffset = (localDate.getUTCDay() + 6) % 7;
      const weekStartLocal = localMidnight - mondayOffset * 86_400_000;
      const anchorMonday = Date.UTC(1970, 0, 5);
      const bucketLocal = Math.floor((weekStartLocal - anchorMonday) / (spec.multiplier * 7 * 86_400_000)) * spec.multiplier * 7 * 86_400_000 + anchorMonday;
      const bucketDate = new Date(bucketLocal);
      return this.resolveLocalTimestamp(timezone, bucketDate.getUTCFullYear(), bucketDate.getUTCMonth() + 1, bucketDate.getUTCDate(), 0, 0, 0);
    }

    if (spec.unit === 'day') {
      const offsetMinutes = this.getTimezoneOffsetMinutes(timezone, timestamp);
      const localDate = new Date(timestamp + offsetMinutes * 60_000);
      const localMidnight = Date.UTC(localDate.getUTCFullYear(), localDate.getUTCMonth(), localDate.getUTCDate());
      const bucketLocal = Math.floor(localMidnight / (spec.multiplier * 86_400_000)) * spec.multiplier * 86_400_000;
      const bucketDate = new Date(bucketLocal);
      return this.resolveLocalTimestamp(timezone, bucketDate.getUTCFullYear(), bucketDate.getUTCMonth() + 1, bucketDate.getUTCDate(), 0, 0, 0);
    }

    const duration = this.getTimeframeDurationMs(timeframe);
    if (duration === null) return Number.NaN;
    const offsetMs = this.getTimezoneOffsetMinutes(timezone, timestamp) * 60_000;
    return Math.floor((timestamp + offsetMs) / duration) * duration - offsetMs;
  }

  private getTimeframeCloseTime(openTime: number, timeframe: string, timezone: string): number {
    if (!Number.isFinite(openTime)) return Number.NaN;
    const spec = this.parseTimeframeSpec(timeframe);
    if (!spec || spec.unit === 'tick') return Number.NaN;

    if (spec.unit === 'month') {
      const year = this.getCalendarPart('year', openTime, timezone);
      const month = this.getCalendarPart('month', openTime, timezone);
      return this.resolveLocalTimestamp(timezone, year, month + spec.multiplier, 1, 0, 0, 0);
    }

    if (spec.unit === 'week' || spec.unit === 'day') {
      const year = this.getCalendarPart('year', openTime, timezone);
      const month = this.getCalendarPart('month', openTime, timezone);
      const day = this.getCalendarPart('dayofmonth', openTime, timezone);
      const days = spec.unit === 'week' ? spec.multiplier * 7 : spec.multiplier;
      return this.resolveLocalTimestamp(timezone, year, month, day + days, 0, 0, 0);
    }

    const duration = this.getTimeframeDurationMs(timeframe);
    return duration === null ? Number.NaN : openTime + duration;
  }

  private getTimeframeDurationMs(timeframe: string): number | null {
    const spec = this.parseTimeframeSpec(timeframe);
    if (!spec) return null;

    switch (spec.unit) {
      case 'tick':
        return null;
      case 'second':
        return spec.multiplier * 1_000;
      case 'minute':
        return spec.multiplier * 60_000;
      case 'day':
        return spec.multiplier * 86_400_000;
      case 'week':
        return spec.multiplier * 7 * 86_400_000;
      case 'month':
        return spec.multiplier * 30 * 86_400_000;
      default:
        return null;
    }
  }

  private parseTimeframeSpec(timeframe: string): TimeframeSpec | null {
    const normalized = timeframe.trim().toUpperCase();
    if (normalized === '') return this.parseTimeframeSpec(this.ctx.timeframe.period);

    if (/^\d+$/.test(normalized)) {
      const multiplier = Number(normalized);
      return multiplier > 0 ? { period: normalized, multiplier, unit: 'minute' } : null;
    }

    const match = /^(\d+)?([TSDWM])$/.exec(normalized);
    if (!match) return null;

    const multiplier = match[1] === undefined ? 1 : Number(match[1]);
    if (!Number.isInteger(multiplier) || multiplier <= 0) return null;

    const unit = match[2];
    if (unit === 'S' && ![1, 5, 10, 15, 30, 45].includes(multiplier)) {
      return null;
    }

    switch (unit) {
      case 'T':
        return { period: normalized, multiplier, unit: 'tick' };
      case 'S':
        return { period: normalized, multiplier, unit: 'second' };
      case 'D':
        return { period: normalized, multiplier, unit: 'day' };
      case 'W':
        return { period: normalized, multiplier, unit: 'week' };
      case 'M':
        return { period: normalized, multiplier, unit: 'month' };
      default:
        return null;
    }
  }

  private isTimestampInSession(timestamp: number, session: string, timezone: string): boolean {
    const normalized = session.trim().toLowerCase();
    if (normalized === '' || normalized === 'regular' || normalized === 'extended' || normalized === 'session.regular' || normalized === 'session.extended') {
      return true;
    }
    if (normalized === '24x7') {
      return true;
    }

    const [periods, days = '1234567'] = session.split(':', 2);
    if (!periods || !/^[1-7]+$/.test(days)) return false;

    return periods.split(',').some((period) => this.isTimestampInSessionPeriod(timestamp, period.trim(), days, timezone));
  }

  private isExchangeSessionClosed(timestamp: number, timezone: string, kind?: RuntimeSessionKind): boolean {
    const session = this.runtimeOptions.session;
    if (!session) return false;

    const localDate = this.getExchangeCalendarDate(timestamp, timezone);
    if (session.closedDates?.some((date) => date.trim() === localDate)) {
      return true;
    }

    return session.closures?.some((closure) => {
      if (closure.date.trim() !== localDate) return false;
      const sessions = closure.sessions;
      if (!sessions || sessions.length === 0 || sessions.includes('all')) return true;
      if (!kind) return false;
      if (sessions.includes(kind)) return true;
      if (kind === 'extended') {
        return this.isClosedExtendedSessionSegment(timestamp, timezone, sessions);
      }
      return sessions.includes('extended');
    }) ?? false;
  }

  private getRuntimeSessionKind(session: string, timestamp: number, timezone: string): RuntimeSessionKind | undefined {
    const normalized = session.trim().toLowerCase();
    if (normalized === 'regular' || normalized === 'session.regular') return 'regular';
    if (normalized === 'extended' || normalized === 'session.extended') return 'extended';

    for (const kind of ['premarket', 'regular', 'postmarket'] as const) {
      if (this.isRuntimeSessionSegmentActive(timestamp, kind, timezone) && this.isTimestampInSession(timestamp, session, timezone)) {
        return kind;
      }
    }
    return undefined;
  }

  private isClosedExtendedSessionSegment(timestamp: number, timezone: string, sessions: SessionClosureKind[]): boolean {
    return (['premarket', 'regular', 'postmarket'] as const).some((kind) => (
      sessions.includes(kind) && this.isRuntimeSessionSegmentActive(timestamp, kind, timezone)
    ));
  }

  private isRuntimeSessionSegmentActive(timestamp: number, kind: 'premarket' | 'regular' | 'postmarket', timezone: string): boolean {
    const session = this.runtimeOptions.session?.[kind];
    if (session === undefined || session === '') return false;
    const sessionTimezone = this.runtimeOptions.session?.timezone?.trim() || timezone;
    return this.isTimestampInSession(timestamp, session, sessionTimezone);
  }

  private getExchangeCalendarDate(timestamp: number, timezone: string): string {
    const year = this.getCalendarPart('year', timestamp, timezone);
    const month = this.getCalendarPart('month', timestamp, timezone);
    const day = this.getCalendarPart('dayofmonth', timestamp, timezone);
    return `${year.toString().padStart(4, '0')}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
  }

  private isTimestampInSessionPeriod(timestamp: number, period: string, days: string, timezone: string): boolean {
    const match = /^(\d{4})-(\d{4})$/.exec(period);
    if (!match) return false;

    const start = this.parseSessionMinute(match[1]);
    const end = this.parseSessionMinute(match[2]);
    if (start === null || end === null) return false;

    const day = this.getCalendarPart('dayofweek', timestamp, timezone);
    const hour = this.getCalendarPart('hour', timestamp, timezone);
    const minute = this.getCalendarPart('minute', timestamp, timezone);
    const minuteOfDay = hour * 60 + minute;

    if (start === end) {
      const sessionDay = start === 0 || minuteOfDay < start ? day : this.nextPineDay(day);
      return days.includes(String(sessionDay));
    }

    if (start < end) {
      return days.includes(String(day)) && minuteOfDay >= start && minuteOfDay < end;
    }

    if (minuteOfDay >= start) {
      return days.includes(String(this.nextPineDay(day)));
    }
    if (minuteOfDay < end) {
      return days.includes(String(day));
    }
    return false;
  }

  private nextPineDay(day: number): number {
    return day >= 7 ? 1 : day + 1;
  }

  private parseSessionMinute(value: string): number | null {
    const hour = Number(value.slice(0, 2));
    const minute = Number(value.slice(2, 4));
    if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
    return hour * 60 + minute;
  }

  private getTimezoneOffsetMinutes(timezone: string, timestamp: number): number {
    const fixedOffset = this.parseFixedTimezoneOffsetMinutes(timezone);
    if (fixedOffset !== null) {
      return fixedOffset;
    }
    return this.getIanaTimezoneOffsetMinutes(timezone, timestamp) ?? 0;
  }

  private parseFixedTimezoneOffsetMinutes(timezone: string): number | null {
    if (timezone === 'UTC' || timezone === 'GMT' || timezone === 'Etc/UTC') {
      return 0;
    }

    const match = /^(?:UTC|GMT)([+-])(\d{1,2})(?::?(\d{2}))?$/.exec(timezone);
    if (!match) {
      return null;
    }

    const sign = match[1] === '+' ? 1 : -1;
    const hours = Number(match[2]);
    const minutes = match[3] === undefined ? 0 : Number(match[3]);
    return sign * (hours * 60 + minutes);
  }

  private getIanaTimezoneOffsetMinutes(timezone: string, timestamp: number): number | null {
    if (!Number.isFinite(timestamp)) return null;

    try {
      const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hourCycle: 'h23',
      }).formatToParts(new Date(timestamp));
      const values = new Map(parts.map((part) => [part.type, part.value]));
      const year = Number(values.get('year'));
      const month = Number(values.get('month'));
      const day = Number(values.get('day'));
      const hour = Number(values.get('hour'));
      const minute = Number(values.get('minute'));
      const second = Number(values.get('second'));
      if ([year, month, day, hour, minute, second].some((value) => !Number.isFinite(value))) {
        return null;
      }

      const zonedAsUtc = Date.UTC(year, month - 1, day, hour, minute, second);
      return Math.round((zonedAsUtc - timestamp) / 60000);
    } catch {
      return null;
    }
  }

  private getIsoWeek(date: Date): number {
    const copy = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
    const day = copy.getUTCDay() || 7;
    copy.setUTCDate(copy.getUTCDate() + 4 - day);
    const yearStart = new Date(Date.UTC(copy.getUTCFullYear(), 0, 1));
    return Math.ceil(((copy.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  }
}

/**
 * Exception for break statement
 */
class BreakException extends Error {
  constructor() {
    super('break');
    this.name = 'BreakException';
  }
}

/**
 * Exception for continue statement
 */
class ContinueException extends Error {
  constructor() {
    super('continue');
    this.name = 'ContinueException';
  }
}

/**
 * Exception for runtime.error().
 */
class RuntimeErrorException extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RuntimeErrorException';
  }
}

/**
 * Create and execute a script
 */
export function executeScript(
  ast: Program,
  bars: Bar[],
  inputs?: Map<string, unknown>,
  options?: TealscriptEngineOptions,
): ExecutionResult {
  const engine = new TealscriptEngine(options);
  return engine.execute(ast, bars, inputs);
}
