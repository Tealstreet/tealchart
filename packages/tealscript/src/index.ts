/**
 * @tealstreet/tealscript
 *
 * A browser-based Tealscript runtime for TradingView-compatible indicators.
 */

// Parser
export {
  // Parser functions
  parse,
  validate,
  formatParseError,
  TealscriptParseError,
  type ParseOptions,
  type ParseResult,
  type ParseStartRule,
  // AST types
  type Program,
  type Statement,
  type Expression,
  type IndicatorDeclaration,
  type VariableDeclaration,
  type AssignmentStatement,
  type ExpressionStatement,
  type IfStatement,
  type ForStatement,
  type WhileStatement,
  type BreakStatement,
  type ContinueStatement,
  type Identifier,
  type Literal,
  type NumericLiteral,
  type StringLiteral,
  type BooleanLiteral,
  type ColorLiteral,
  type BinaryExpression,
  type UnaryExpression,
  type ConditionalExpression,
  type CallExpression,
  type MemberExpression,
  type IndexExpression,
  type ArrayExpression,
  type NaExpression,
  type TypeAnnotation,
  type SourceLocation,
  // Type guards
  isExpression,
  isStatement,
  isLiteral,
} from './parser';

// Runtime
export {
  // Engine
  TealscriptEngine,
  executeScript,
  type ExecutionResult,
  type ExecutionError,
  type TealscriptEngineOptions,
  // Context
  ExecutionContext,
  createContext,
  type Bar,
  type BarState,
  type SymInfo,
  type TimeframeInfo,
  type PlotOutput,
  type PlotStyle,
  type DrawingOutput,
  type LabelDrawingOutput,
  type LineDrawingOutput,
  type LineFillDrawingOutput,
  type BoxDrawingOutput,
  type AlertEvent,
  type AlertFrequency,
  type AlertOutput,
  type LogLevel,
  type LogOutput,
  type InputDefinition,
  // Request datafeed
  InMemoryRequestDatafeed,
  requestDatafeedKey,
  type RequestDataContext,
  type RequestDatafeed,
  type RequestDatafeedErrorCode,
  type RequestDatafeedFailure,
  type RequestDatafeedKey,
  type RequestDatafeedQuery,
  type RequestDatafeedResult,
  type RequestDatafeedSuccess,
  // Series
  Series,
  seriesFrom,
  constantSeries,
  getValue,
  isSeries,
  type SeriesSnapshot,
  type MaybeSeriesValue,
  // Scope
  Scope,
  createRootScope,
  type VarKind,
  type VariableEntry,
  type ScopeSnapshot,
} from './runtime';

// Worker
export {
  TealscriptWorker,
  TealscriptWorkerFactory,
  type TealscriptWorkerOptions,
  type WorkerResult,
  type WorkerError,
  type ResultCallback,
  type ErrorCallback,
  // Protocol types
  type ToWorkerMessage,
  type FromWorkerMessage,
  type WorkerOutputBundle,
  type NormalizedWorkerOutputBundle,
  type WorkerOutputMetadata,
  type InitMessage,
  type UpdateBarsMessage,
  type UpdateBarMessage,
  type SetInputsMessage,
  type DisposeMessage,
  type ReadyMessage,
  type ResultMessage,
  type ErrorMessage,
  type ParseErrorMessage,
  createResultMessage,
  getResultOutput,
} from './worker';
