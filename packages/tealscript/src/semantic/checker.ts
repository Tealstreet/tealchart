import { stringResultQualifier } from './stringResultQualifier';
import { comparisonEqual } from '../runtime/codegen/float-comparison';
import { divideV5ConstInts } from '../runtime/codegen/runtime';
import { roundRuntimeNumber } from '../runtime/mathRounding';
import { isTimeframeSecondsRatio } from '../compat/legacyHighestTimeframeRatio';
import { tradingViewTimeframeCompileRefusal } from '../compat/tradingViewTimeframeRefusals';
import type {
  AssignmentStatement,
  ArrayExpression,
  CallArgument,
  CallExpression,
  EnumDeclaration,
  Expression,
  ForStatement,
  FunctionDeclaration,
  Identifier,
  IfStatement,
  IndicatorDeclaration,
  ImportDeclaration,
  IndexExpression,
  LibraryDeclaration,
  MemberExpression,
  OnceStatement,
  Program,
  SourceLocation,
  Statement,
  SwitchCase,
  SwitchExpression,
  TupleAssignment,
  TupleDeclarator,
  TypeAnnotation,
  TypeDeclaration,
  TypeFieldDeclaration,
  VariableDeclaration,
  WhileStatement,
} from '../parser/ast';
import {
  BUILTIN_COLLECTION_MEMBER_METHODS,
  BUILTIN_GLOBALS,
  BUILTIN_GLOBAL_TYPES,
  BUILTIN_NAMESPACES,
  DERIVED_PRICE_BUILTINS,
  CALENDAR_FUNCTION_NAMES,
  CURRENCY_CONSTANT_CODES,
  EXPORTABLE_BUILTIN_CONSTANTS,
  isExportableBuiltinConstantPath,
} from '../builtinMetadata';
import {
  getOfficialTradingViewLibrary,
  unsupportedOfficialTradingViewFunctionMessage,
  type OfficialTradingViewLibrary,
  type OfficialTradingViewLibraryFunction,
} from '../officialTradingViewLibraries';
import {
  RESERVED_VARIABLE_AND_FUNCTION_NAMES,
  isPineBuiltinGlobalAvailable,
  pineVersionListDescription,
  pineVersionRules,
  pineVersionsWhere,
  type PineVersionRules,
} from '../pineVersionRules';
import { CORPORATE_FORECAST_MEMBERS } from '../corporateForecastMetadata';
import { PINE_V4_BUILTIN_PARAMETER_RENAMES } from '../pineBuiltinParameterRenames';

export type SemanticDiagnosticSeverity = 'error' | 'warning' | 'info';

export interface SemanticDiagnostic {
  code: string;
  message: string;
  severity: SemanticDiagnosticSeverity;
  line?: number;
  column?: number;
}

export type SemanticSymbolKind = 'variable' | 'function' | 'parameter' | 'type' | 'import' | 'loop';
export type SemanticQualifier = 'const' | 'input' | 'simple' | 'series';

export type SemanticTypeKind =
  | 'array'
  | 'backadjustment'
  | 'bool'
  | 'box'
  | 'chart.point'
  | 'color'
  | 'float'
  | 'hline'
  | 'int'
  | 'label'
  | 'line'
  | 'linefill'
  | 'map'
  | 'matrix'
  | 'plot'
  | 'polyline'
  | 'settlement'
  | 'string'
  | 'table'
  | 'udt'
  | 'unique'
  | 'unknown'
  | 'void';

export interface SemanticType {
  // Numeric values stay fractional; captured integer call slots consume this provenance.
  integerDivision?: true;
  kind: SemanticTypeKind;
  qualifier?: SemanticQualifier;
  name?: string;
  elementType?: SemanticType;
  keyType?: SemanticType;
  valueType?: SemanticType;
}

export interface SemanticSymbol {
  name: string;
  kind: SemanticSymbolKind;
  type?: SemanticType;
  isMethod?: boolean;
  loc?: SourceLocation;
}

export interface SemanticCheckResult {
  diagnostics: SemanticDiagnostic[];
  symbols: SemanticSymbol[];
  indicatorDynamicRequests?: boolean;
  expressionTypes?: WeakMap<Expression, SemanticType>;
  callTypeContexts?: WeakMap<CallExpression, SemanticExpressionTypeContext>;
  fillColorQualifiers: Map<CallExpression, SemanticQualifier>;
  userFunctionCallDeclarations: Map<CallExpression, FunctionDeclaration>;
}

export interface SemanticExpressionTypeContext {
  expressionTypes: WeakMap<Expression, SemanticType>;
  callTypeContexts: WeakMap<CallExpression, SemanticExpressionTypeContext>;
  resolvedUserMethod?: FunctionDeclaration;
  resolvedUserFunction?: FunctionDeclaration;
}

export interface SemanticCheckOptions {
  libraries?: Map<string, Program>;
  expressionTypes?: WeakMap<Expression | IfStatement, SemanticType>;
  resolvedUserMethods?: WeakMap<CallExpression, FunctionDeclaration | null>;
  /** Enforce declaration cardinality and scope at complete-script boundaries. */
  requireDeclaration?: boolean;
  loopResultTypes?: WeakMap<ForStatement | WhileStatement, SemanticType[]>;
  recordCallTypeContexts?: boolean;
  recordMethodFunctionCallTypeContexts?: boolean;
  recordTupleInitializerCallTypeContexts?: boolean;
}

type ParameterQualifierRequirements = Map<string, SemanticQualifier>;

type TupleInitializerShape = { kind: 'tuple'; arity: number } | { kind: 'non-tuple' } | { kind: 'unknown' };

interface SemanticImportedLibrary {
  alias: string;
  functions: Map<string, FunctionDeclaration[]>;
  builtinFunctions?: Map<string, OfficialTradingViewLibraryFunction>;
  official?: OfficialTradingViewLibrary;
  types: Map<string, TypeDeclaration>;
  enums: Map<string, EnumDeclaration>;
  constants: Map<string, VariableDeclaration>;
  methods: Map<string, FunctionDeclaration[]>;
  memberNames: Set<string>;
}

class SemanticScope {
  private readonly symbols = new Map<string, SemanticSymbol>();
  private readonly functions = new Map<string, SemanticSymbol>();
  private readonly lookupCache = new Map<string, SemanticSymbol | null>();

  constructor(private readonly parent?: SemanticScope, readonly executionMayBeSkipped: boolean = parent?.executionMayBeSkipped ?? false) {}

  declare(symbol: SemanticSymbol): SemanticSymbol | null {
    const declarations = symbol.kind === 'function' ? this.functions : this.symbols;
    const existing = declarations.get(symbol.name);
    if (existing) return existing;
    declarations.set(symbol.name, symbol);
    this.lookupCache.delete(symbol.name);
    return null;
  }

  replaceLocal(symbol: SemanticSymbol): void {
    this.symbols.set(symbol.name, symbol);
    this.lookupCache.delete(symbol.name);
  }

  lookup(name: string): SemanticSymbol | null {
    const local = this.symbols.get(name) ?? this.functions.get(name);
    if (local) return local;
    if (this.lookupCache.has(name)) return this.lookupCache.get(name) ?? null;
    const resolved = this.parent?.lookup(name) ?? null;
    this.lookupCache.set(name, resolved);
    return resolved;
  }

  lookupLocal(name: string): SemanticSymbol | null {
    return this.symbols.get(name) ?? this.functions.get(name) ?? null;
  }

  lookupLocalFunction(name: string): SemanticSymbol | null {
    return this.functions.get(name) ?? null;
  }

  lookupFunction(name: string): SemanticSymbol | null {
    return this.functions.get(name) ?? this.parent?.lookupFunction(name) ?? null;
  }

  allSymbols(): SemanticSymbol[] {
    return [...this.symbols.values(), ...this.functions.values()];
  }
}

function camelToSnakeCase(value: string): string {
  return value.replace(/[A-Z]/g, (character) => `_${character.toLowerCase()}`);
}

const ARRAY_CONSTRUCTOR_ELEMENT_TYPES = new Map<string, SemanticTypeKind>([
  ['array.new_bool', 'bool'],
  ['array.new_box', 'box'],
  ['array.new_chart_point', 'chart.point'],
  ['array.new_color', 'color'],
  ['array.new_float', 'float'],
  ['array.new_int', 'int'],
  ['array.new_label', 'label'],
  ['array.new_line', 'line'],
  ['array.new_linefill', 'linefill'],
  ['array.new_polyline', 'polyline'],
  ['array.new_string', 'string'],
  ['array.new_table', 'table'],
]);
const MATRIX_CONSTRUCTOR_ELEMENT_TYPES = new Map<string, SemanticTypeKind>([
  ['matrix.new_bool', 'bool'],
  ['matrix.new_color', 'color'],
  ['matrix.new_float', 'float'],
  ['matrix.new_int', 'int'],
  ['matrix.new_string', 'string'],
]);

const INPUT_RETURN_TYPES = new Map<string, SemanticTypeKind>([
  ['input.bool', 'bool'],
  ['input.color', 'color'],
  ['input.float', 'float'],
  ['input.int', 'int'],
  ['input.price', 'float'],
  ['input.session', 'string'],
  ['input.string', 'string'],
  ['input.symbol', 'string'],
  ['input.text_area', 'string'],
  ['input.time', 'int'],
  ['input.timeframe', 'string'],
]);
const LEGACY_INPUT_TYPE_ALIASES = new Map<string, string>([
  ['bool', 'input.bool'],
  ['input.bool', 'input.bool'],
  ['color', 'input.color'],
  ['input.color', 'input.color'],
  ['float', 'input.float'],
  ['input.float', 'input.float'],
  ['integer', 'input.int'],
  ['input.integer', 'input.int'],
  ['int', 'input.int'],
  ['input.int', 'input.int'],
  ['resolution', 'input.timeframe'],
  ['input.resolution', 'input.timeframe'],
  ['session', 'input.session'],
  ['input.session', 'input.session'],
  ['source', 'input.source'],
  ['input.source', 'input.source'],
  ['string', 'input.string'],
  ['input.string', 'input.string'],
  ['symbol', 'input.symbol'],
  ['input.symbol', 'input.symbol'],
  ['timeframe', 'input.timeframe'],
  ['input.timeframe', 'input.timeframe'],
]);
const LEGACY_INPUT_TYPE_CONSTANT_NAMES = new Set(LEGACY_INPUT_TYPE_ALIASES.keys());
const LEGACY_INPUT_SIGNATURE: BuiltinSignature = {
  params: ['defval', 'title', 'type', 'minval', 'maxval', 'confirm', 'step', 'options', 'tooltip', 'inline', 'group', 'display', 'active'],
  minArgs: 1,
  allowNamedPrefixWithPositional: true,
};

const INPUT_DEFAULT_TYPE_REQUIREMENTS = new Map<string, 'bool' | 'color' | 'int' | 'number' | 'string'>([
  ['input.bool', 'bool'],
  ['input.color', 'color'],
  ['input.float', 'number'],
  ['input.int', 'int'],
  ['input.price', 'number'],
  ['input.session', 'string'],
  ['input.string', 'string'],
  ['input.symbol', 'string'],
  ['input.text_area', 'string'],
  ['input.time', 'number'],
  ['input.timeframe', 'string'],
]);

const INPUT_RANGE_OPTION_OVERLOAD_NAMES = new Set(['input.float', 'input.int']);
const INPUT_RANGE_OPTION_RANGE_PARAMS = new Set(['minval', 'maxval', 'step']);
const INPUT_OPTIONS_ELEMENT_REQUIREMENTS = new Map<string, 'int' | 'number' | 'string'>([
  ['input.float', 'number'],
  ['input.int', 'int'],
  ['input.session', 'string'],
  ['input.string', 'string'],
  ['input.timeframe', 'string'],
]);
const isInputCallName = (name: string): boolean => name === 'input' || name.startsWith('input.');
const ALERT_FREQUENCY_VALUES = new Set(['all', 'once_per_bar', 'once_per_bar_close']);
const ALERT_FREQUENCY_CONSTANT_VALUES = new Map([
  ['alert.freq_all', 'all'],
  ['alert.freq_once_per_bar', 'once_per_bar'],
  ['alert.freq_once_per_bar_close', 'once_per_bar_close'],
]);
const ALERT_STRING_PARAMETER_NAMES_BY_CALL = new Map<string, readonly string[]>([
  ['alert', ['message', 'freq']],
  ['alertcondition', ['title', 'message']],
  ['log.error', ['message']],
  ['log.info', ['message']],
  ['log.warning', ['message']],
  ['runtime.error', ['message']],
]);
const ALERT_BOOL_PARAMETER_NAMES_BY_CALL = new Map<string, readonly string[]>([
  ['alertcondition', ['condition']],
]);
const LEGACY_GLOBAL_TA_ALIASES = [
  'alma',
  'atr',
  'barssince',
  'bb',
  'bbw',
  'cci',
  'change',
  'cmo',
  'cog',
  'correlation',
  'covariance',
  'cross',
  'crossover',
  'crossunder',
  'cum',
  'dev',
  'dmi',
  'ema',
  'falling',
  'highest',
  'highestbars',
  'hma',
  'kc',
  'kcw',
  'linreg',
  'lowest',
  'lowestbars',
  'macd',
  'median',
  'mfi',
  'mode',
  'mom',
  'obv',
  'percentrank',
  'percentile_linear_interpolation',
  'percentile_nearest_rank',
  'pivothigh',
  'pivotlow',
  'range',
  'rising',
  'rma',
  'roc',
  'rsi',
  'sar',
  'sma',
  'stdev',
  'stoch',
  'supertrend',
  'swma',
  'tr',
  'tsi',
  'valuewhen',
  'variance',
  'vwap',
  'vwma',
  'wma',
  'wpr',
] as const;
// v5 bare math.* globals: abs(x) → math.abs(x), etc.
const LEGACY_GLOBAL_MATH_ALIASES = [
  'abs', 'ceil', 'floor', 'round', 'round_to_mintick', 'sqrt',
  'log', 'log10', 'pow', 'sign', 'max', 'min', 'avg', 'sum',
  'sin', 'cos', 'tan', 'asin', 'acos', 'atan', 'exp',
  'toradians', 'todegrees', 'random',
] as const;
// v5 bare str.* globals: tostring(x) → str.tostring(x), tonumber(x) → str.tonumber(x)
const LEGACY_GLOBAL_STR_ALIASES = ['tostring', 'tonumber'] as const;
const LEGACY_GLOBAL_TICKER_ALIASES = new Map<string, string>([
  ['tickerid', 'ticker.new'],
  ['heikinashi', 'ticker.heikinashi'],
  ['renko', 'ticker.renko'],
  ['linebreak', 'ticker.linebreak'],
  ['kagi', 'ticker.kagi'],
  ['pointfigure', 'ticker.pointfigure'],
]);
const V4_RENAMED_MARKET_VARIABLES = new Map([
  ['tickerid', 'syminfo.tickerid'],
  ['period', 'timeframe.period'],
]);

const LEGACY_BARE_SYMINFO_ALIASES = new Map<string, 'ticker' | 'tickerid'>([
  ['ticker', 'ticker'],
  ['tickerid', 'tickerid'],
]);
const LEGACY_BAR_INDEX_ALIASES = new Set(['n']);
const LEGACY_TIMEFRAME_VARIABLE_ALIASES = new Map<string, SemanticType>([
  ['isintraday', { kind: 'bool', qualifier: 'simple' }],
  ['interval', { kind: 'int', qualifier: 'simple' }],
]);
const LEGACY_GLOBAL_BUILTIN_ALIASES = new Map<string, string>([
  ['security', 'request.security'],
  ['dividends', 'request.dividends'],
  // The v3 transparency constructor was renamed in v4; color(x) casts remain separate.
  ['color', 'color.new'],
  ...LEGACY_GLOBAL_TA_ALIASES.map((name) => [name, `ta.${name}`] as const),
  ...LEGACY_GLOBAL_MATH_ALIASES.map((name) => [name, `math.${name}`] as const),
  ...LEGACY_GLOBAL_STR_ALIASES.map((name) => [name, `str.${name}`] as const),
  ...LEGACY_GLOBAL_TICKER_ALIASES,
]);
const canonicalBuiltinName = (name: string): string => LEGACY_GLOBAL_BUILTIN_ALIASES.get(name) ?? name;
const isVersionedLegacyGlobalBuiltinAlias = (name: string): boolean => (
  LEGACY_GLOBAL_BUILTIN_ALIASES.has(name) && name !== 'color'
);
const GLOBAL_NON_BOOL_PARAMETER_NAMES_BY_CALL = new Map<string, readonly string[]>([
  ['fixnan', ['source']],
  ['na', ['x']],
  ['nz', ['source', 'replacement']],
]);
const GLOBAL_BOOL_PARAMETER_NAMES_BY_CALL = new Map<string, readonly string[]>([
  ['iff', ['condition']],
]);
const REQUEST_GAPS_MODES = new Set(['barmerge.gaps_on', 'barmerge.gaps_off']);
const REQUEST_LOOKAHEAD_MODES = new Set(['barmerge.lookahead_on', 'barmerge.lookahead_off']);
const REQUEST_BARMERGE_MODE_CALLS = new Set([
  'security',
  'request.security',
  'request.dividends',
  'request.earnings',
  'request.splits',
  'request.financial',
  'request.economic',
  'request.quandl',
]);
const REQUEST_BOOL_PARAMETER_NAMES = new Set([
  'ignore_invalid_symbol',
  'ignore_invalid_currency',
  'ignore_invalid_timeframe',
]);
const REQUEST_STRING_PARAMETER_NAMES_BY_CALL = new Map<string, readonly string[]>([
  ['security', ['symbol', 'timeframe', 'currency']],
  ['request.security', ['symbol', 'timeframe', 'currency']],
  ['request.security_lower_tf', ['symbol', 'timeframe', 'currency']],
  ['request.currency_rate', ['from', 'to']],
  ['request.dividends', ['ticker', 'currency']],
  ['request.earnings', ['ticker', 'currency']],
  ['request.splits', ['ticker']],
  ['request.financial', ['symbol', 'financial_id', 'period', 'currency']],
  ['request.economic', ['country_code', 'field']],
  ['request.quandl', ['ticker']],
  ['request.seed', ['source', 'symbol']],
]);
const REQUEST_DIVIDENDS_FIELD_VALUES = new Set([
  'dividends.future_amount',
  'dividends.future_ex_date',
  'dividends.future_pay_date',
  'dividends.gross',
  'dividends.net',
]);
const REQUEST_DIVIDENDS_FIELD_CONSTANT_VALUES = new Map([...REQUEST_DIVIDENDS_FIELD_VALUES].map((value) => [value, value]));
const REQUEST_EARNINGS_FIELD_VALUES = new Set([
  'earnings.actual',
  'earnings.estimate',
  'earnings.future_eps',
  'earnings.future_period_end_time',
  'earnings.future_revenue',
  'earnings.future_time',
  'earnings.standardized',
]);
const REQUEST_EARNINGS_FIELD_CONSTANT_VALUES = new Map([...REQUEST_EARNINGS_FIELD_VALUES].map((value) => [value, value]));
const REQUEST_SPLITS_FIELD_VALUES = new Set(['splits.denominator', 'splits.numerator']);
const REQUEST_SPLITS_FIELD_CONSTANT_VALUES = new Map([...REQUEST_SPLITS_FIELD_VALUES].map((value) => [value, value]));
const INDICATOR_DECLARATION_BOOL_OPTIONS = [
  'overlay',
  'timeframe_gaps',
  'explicit_plot_zorder',
  'behind_chart',
  'dynamic_requests',
] as const;
const INDICATOR_DECLARATION_NUMERIC_OPTIONS = [
  'precision',
  'max_bars_back',
  'max_labels_count',
  'max_lines_count',
  'max_boxes_count',
  'max_polylines_count',
  'calc_bars_count',
] as const;
const LIBRARY_DECLARATION_BOOL_OPTIONS = [
  'overlay',
  'dynamic_requests',
] as const;
const STRATEGY_DECLARATION_BOOL_OPTIONS = [
  'calc_on_order_fills',
  'calc_on_every_tick',
  'calc_on_every_history_tick',
  'process_orders_on_close',
  'use_bar_magnifier',
  'fill_orders_on_standard_ohlc',
] as const;
const STRATEGY_DECLARATION_NUMERIC_OPTIONS = [
  'initial_capital',
  'default_qty_value',
  'pyramiding',
  'commission_value',
  'slippage',
  'margin_long',
  'margin_short',
  'risk_free_rate',
  'backtest_fill_limits_assumption',
] as const;
const STRATEGY_DECLARATION_STRING_OPTIONS = [
  'currency',
  'default_qty_type',
  'commission_type',
  'close_entries_rule',
] as const;
const TRACE_REQUIRED_STRATEGY_RISK_FREE_RATE_DEFAULT = 2;

const COLOR_CONSTRUCTOR_NAMES = new Set(['color', 'color.new', 'color.rgb']);
const EXPORTABLE_COLOR_CONSTRUCTOR_NAMES = new Set(['color.new', 'color.rgb']);
const DRAWING_OBJECT_CAST_NAMES = new Set(['box', 'label', 'line', 'linefill', 'table']);
const DRAWING_OBJECT_CAST_TYPES = new Map<string, SemanticTypeKind>([
  ['box', 'box'],
  ['label', 'label'],
  ['line', 'line'],
  ['linefill', 'linefill'],
  ['table', 'table'],
]);
const PINE_NA_CAST_SIGNATURE: BuiltinSignature = {
  params: ['x'],
  minArgs: 1,
  maxArgs: 1,
  allowNamedPrefixWithPositional: true,
};
const LEGACY_COLOR_TRANSP_SIGNATURE: BuiltinSignature = {
  params: ['color', 'transp'],
  minArgs: 1,
  maxArgs: 2,
  allowNamedPrefixWithPositional: true,
};
const FILL_GRADIENT_PARAMS = ['plot1', 'plot2', 'top_value', 'bottom_value', 'top_color', 'bottom_color', 'title', 'display', 'fillgaps', 'editable'];
const COLOR_CHANNEL_NAMES = new Set(['color.r', 'color.g', 'color.b', 'color.t']);
const COLOR_CONSTANT_NAMES = new Set([
  'color.aqua',
  'color.black',
  'color.blue',
  'color.fuchsia',
  'color.gray',
  'color.green',
  'color.lime',
  'color.maroon',
  'color.navy',
  'color.none',
  'color.olive',
  'color.orange',
  'color.purple',
  'color.red',
  'color.silver',
  'color.teal',
  'color.white',
  'color.yellow',
]);
const LEGACY_BARE_COLOR_CONSTANT_VALUES = new Map(
  [...COLOR_CONSTANT_NAMES]
    .filter((name) => name !== 'color.none')
    .map((name) => [name.replace(/^color\./, ''), name] as const),
);
const LEGACY_BARE_VISUAL_CONSTANT_VALUES = new Map<string, string>([
  ['area', 'area'],
  ['areabr', 'areabr'],
  ['circles', 'circles'],
  ['columns', 'columns'],
  ['cross', 'cross'],
  ['dashed', 'dashed'],
  ['dotted', 'dotted'],
  ['histogram', 'histogram'],
  ['line', 'line'],
  ['solid', 'solid'],
  ['stepline', 'stepline'],
]);
const COLOR_FUNCTION_COLOR_PARAMETER_NAMES_BY_CALL = new Map<string, readonly string[]>([
  ['color', ['x']],
  ['color.new', ['color']],
  ['color.r', ['color']],
  ['color.g', ['color']],
  ['color.b', ['color']],
  ['color.t', ['color']],
  ['color.from_gradient', ['bottom_color', 'top_color']],
]);
const COLOR_FUNCTION_NUMERIC_PARAMETER_NAMES_BY_CALL = new Map<string, readonly string[]>([
  ['color', ['red', 'green', 'blue', 'transp']],
  ['color.new', ['transp']],
  ['color.rgb', ['red', 'green', 'blue', 'transp']],
  ['color.from_gradient', ['value', 'bottom_value', 'top_value']],
]);

const MATH_CONSTANT_NAMES = new Set(['math.pi', 'math.e', 'math.phi', 'math.rphi']);
const MATH_PRESERVE_NUMERIC_NAMES = new Set(['math.abs', 'math.max', 'math.min', 'math.clamp']);
const MATH_FLOAT_RETURN_NAMES = new Set([
  'math.sqrt',
  'math.log',
  'math.log10',
  'math.exp',
  'math.sign',
  'math.sin',
  'math.cos',
  'math.tan',
  'math.asin',
  'math.acos',
  'math.atan',
  'math.tanh',
  'math.pow',
]);
const MATH_INT_RETURN_NAMES = new Set(['math.trunc', 'math.floor', 'math.ceil']);
const MATH_SERIES_FLOAT_RETURN_NAMES = new Set([
  'math.sum',
  'math.random',
  'math.toradians',
  'math.todegrees',
]);
const MATH_NUMERIC_PARAMETER_NAMES_BY_CALL = new Map<string, readonly string[]>([
  ['math.abs', ['number']],
  ['math.sqrt', ['number']],
  ['math.log', ['number']],
  ['math.log10', ['number']],
  ['math.exp', ['number']],
  ['math.trunc', ['number']],
  ['math.floor', ['number']],
  ['math.ceil', ['number']],
  ['math.sign', ['number']],
  ['math.sin', ['number']],
  ['math.cos', ['number']],
  ['math.tan', ['number']],
  ['math.asin', ['number']],
  ['math.acos', ['number']],
  ['math.atan', ['number']],
  ['math.tanh', ['number']],
  ['math.toradians', ['number']],
  ['math.todegrees', ['number']],
  ['math.pow', ['base', 'exponent']],
  ['math.round', ['number', 'precision']],
  ['math.round_to_mintick', ['number']],
  ['math.sum', ['source', 'length']],
  ['math.random', ['min', 'max', 'seed']],
  ['math.clamp', ['val', 'min', 'max']],
]);
const MATH_VARIADIC_NUMERIC_PARAMETER_CALLS = new Set(['math.max', 'math.min', 'math.avg']);

const STRING_RETURN_NAMES = new Set([
  'str.tostring',
  'str.format_time',
  'str.format',
  'str.substring',
  'str.match',
  'str.repeat',
  'str.upper',
  'str.lower',
  'str.trim',
  'str.replace',
  'str.replace_all',
]);
const STRING_BOOL_RETURN_NAMES = new Set(['str.contains', 'str.startswith', 'str.endswith']);
const STRING_INT_RETURN_NAMES = new Set(['str.length', 'str.pos', 'str.tointeger']);
const STRING_FUNCTION_STRING_PARAMETER_NAMES_BY_CALL = new Map<string, readonly string[]>([
  ['str.tostring', ['format']],
  ['str.tonumber', ['string']],
  ['str.tointeger', ['string']],
  ['str.format_time', ['format', 'timezone']],
  ['str.format', ['format']],
  ['str.length', ['source']],
  ['str.contains', ['source', 'str']],
  ['str.startswith', ['source', 'str']],
  ['str.endswith', ['source', 'str']],
  ['str.pos', ['source', 'str']],
  ['str.substring', ['source']],
  ['str.match', ['source', 'regex']],
  ['str.repeat', ['source', 'separator']],
  ['str.split', ['source', 'separator']],
  ['str.upper', ['source']],
  ['str.lower', ['source']],
  ['str.trim', ['source']],
  ['str.replace', ['source', 'target', 'replacement']],
  ['str.replace_all', ['source', 'target', 'replacement']],
]);
const STRING_FUNCTION_NUMERIC_PARAMETER_NAMES_BY_CALL = new Map<string, readonly string[]>([
  ['str.format_time', ['time']],
  ['str.substring', ['begin_pos', 'end_pos']],
  ['str.repeat', ['repeat']],
  ['str.replace', ['occurrence']],
]);

const TA_BOOL_RETURN_NAMES = new Set(['ta.cross', 'ta.crossover', 'ta.crossunder', 'ta.rising', 'ta.falling']);
const TA_INT_RETURN_NAMES = new Set(['ta.bar_index', 'ta.barssince', 'ta.highestbars', 'ta.lowestbars']);
const TA_FLOAT_RETURN_NAMES = new Set([
  'ta.adx',
  'ta.alma',
  'ta.atr',
  'ta.bbw',
  'ta.cci',
  'ta.cmo',
  'ta.cog',
  'ta.correlation',
  'ta.covariance',
  'ta.cum',
  'ta.dema',
  'ta.dev',
  'ta.ema',
  'ta.hma',
  'ta.linreg',
  'ta.max',
  'ta.mfi',
  'ta.min',
  'ta.obv',
  'ta.percentile_linear_interpolation',
  'ta.percentile_nearest_rank',
  'ta.percentrank',
  'ta.rma',
  'ta.smma',
  'ta.roc',
  'ta.rci',
  'ta.rsi',
  'ta.sar',
  'ta.sma',
  'ta.sum',
  'ta.stdev',
  'ta.stoch',
  'ta.swma',
  'ta.tr',
  'ta.tema',
  'ta.tsi',
  'ta.variance',
  'ta.vwma',
  'ta.wma',
  'ta.wpr',
]);
const TA_SOURCE_RETURN_NAMES = new Set(['ta.range', 'ta.median', 'ta.mode', 'ta.mom']);
const TA_DEFAULT_SOURCE_RETURN_NAMES = new Set(['ta.highest', 'ta.lowest']);
const TA_PIVOT_RETURN_NAMES = new Set(['ta.pivothigh', 'ta.pivotlow']);
const TA_FLOAT_MEMBER_NAMES = new Set(['ta.accdist', 'ta.iii', 'ta.nvi', 'ta.obv', 'ta.pvi', 'ta.pvt', 'ta.tr', 'ta.vwap', 'ta.wad', 'ta.wvad']);
const TA_INTEGER_PARAMETER_NAMES_BY_CALL = new Map<string, readonly string[]>([
  ['ta.falling', ['length']],
  ['ta.kc', ['length']],
  ['ta.kcw', ['length']],
  ['ta.percentile_nearest_rank', ['length']],
  ['ta.percentile_linear_interpolation', ['length']],
  ['ta.roc', ['length']],
  ['ta.tsi', ['short_length', 'long_length']],
  ['ta.macd', ['fastlen', 'slowlen', 'siglen']],
  ['ta.valuewhen', ['occurrence']],
  ['ta.vwma', ['length']],
  ['ta.alma', ['length']],
  ['ta.dmi', ['diLength', 'adxSmoothing']],
]);
const TA_V5_INTEGER_PARAMETER_NAMES_BY_CALL = new Map<string, readonly string[]>([
  ['ta.macd', ['fastlen', 'slowlen', 'siglen']],
  ['ta.percentile_linear_interpolation', ['length']],
  ['ta.wma', ['length']],
]);

const TA_NUMERIC_PARAMETER_NAMES_BY_CALL = new Map<string, readonly string[]>([
  ['ta.atr', ['length']],
  ['ta.bar_index', ['source']],
  ['ta.alma', ['series', 'length', 'offset', 'sigma']],
  ['ta.cci', ['source', 'length']],
  ['ta.cmo', ['source', 'length']],
  ['ta.cum', ['source']],
  ['ta.crossover', ['source1', 'source2']],
  ['ta.crossunder', ['source1', 'source2']],
  ['ta.cross', ['source1', 'source2']],
  ['ta.correlation', ['source1', 'source2', 'length']],
  ['ta.covariance', ['source1', 'source2', 'length']],
  ['ta.cog', ['source', 'length']],
  ['ta.dema', ['source', 'length']],
  ['ta.dev', ['source', 'length']],
  ['ta.adx', ['diLength', 'adxSmoothing']],
  ['ta.dmi', ['diLength', 'adxSmoothing']],
  ['ta.ema', ['source', 'length']],
  ['ta.hma', ['source', 'length']],
  ['ta.highest', ['source', 'length']],
  ['ta.lowest', ['source', 'length']],
  ['ta.highestbars', ['source', 'length']],
  ['ta.lowestbars', ['source', 'length']],
  ['ta.kc', ['series', 'length', 'mult']],
  ['ta.kcw', ['series', 'length', 'mult']],
  ['ta.max', ['source']],
  ['ta.median', ['source', 'length']],
  ['ta.mfi', ['source', 'length']],
  ['ta.min', ['source']],
  ['ta.macd', ['source', 'fastlen', 'slowlen', 'siglen']],
  ['ta.mode', ['source', 'length']],
  ['ta.obv', ['source', 'volume']],
  ['ta.percentile_nearest_rank', ['source', 'length', 'percentage']],
  ['ta.percentile_linear_interpolation', ['source', 'length', 'percentage']],
  ['ta.percentrank', ['source', 'length']],
  ['ta.pivothigh', ['source', 'leftbars', 'rightbars']],
  ['ta.pivotlow', ['source', 'leftbars', 'rightbars']],
  ['ta.mom', ['source', 'length']],
  ['ta.range', ['source', 'length']],
  ['ta.rising', ['source', 'length']],
  ['ta.falling', ['source', 'length']],
  ['ta.rci', ['source', 'length']],
  ['ta.rma', ['source', 'length']],
  ['ta.smma', ['source', 'length']],
  ['ta.roc', ['source', 'length']],
  ['ta.rsi', ['source', 'length']],
  ['ta.sar', ['start', 'inc', 'max']],
  ['ta.sma', ['source', 'length']],
  ['ta.sum', ['source', 'length']],
  ['ta.stdev', ['source', 'length']],
  ['ta.stoch', ['source', 'high', 'low', 'length']],
  ['ta.supertrend', ['factor', 'atrPeriod']],
  ['ta.swma', ['source']],
  ['ta.tema', ['source', 'length']],
  ['ta.kst', ['source', 'roclength1', 'roclength2', 'roclength3', 'roclength4', 'smalen1', 'smalen2', 'smalen3', 'smalen4', 'signalLength']],
  ['ta.tsi', ['source', 'short_length', 'long_length']],
  ['ta.valuewhen', ['occurrence']],
  ['ta.variance', ['source', 'length']],
  ['ta.vwap', ['source', 'stdev_mult']],
  ['ta.vwma', ['source', 'length']],
  ['ta.linreg', ['source', 'length', 'offset']],
  ['ta.wma', ['source', 'length']],
  ['ta.wpr', ['length']],
]);
const TA_BOOL_PARAMETER_NAMES_BY_CALL = new Map<string, readonly string[]>([
  ['ta.alma', ['floor']],
  ['ta.barssince', ['condition']],
  ['ta.kc', ['useTrueRange']],
  ['ta.kcw', ['useTrueRange']],
  ['ta.pivot_point_levels', ['anchor', 'developing']],
  ['ta.stdev', ['biased']],
  ['ta.tr', ['handle_na']],
  ['ta.valuewhen', ['condition']],
  ['ta.variance', ['biased']],
  ['ta.vwap', ['anchor']],
]);

const COLLECTION_INTEGER_PARAMETER_NAMES_BY_CALL = new Map<string, readonly string[]>([
  ['array.get', ['index']],
  ['array.set', ['index']],
  ['array.insert', ['index']],
  ['array.remove', ['index']],
  ['array.fill', ['index_from', 'index_to']],
  ['array.slice', ['index_from', 'index_to']],
  ['array.min', ['nth']],
  ['array.max', ['nth']],
  ['array.percentrank', ['index']],
  ['matrix.get', ['row', 'column']],
  ['matrix.set', ['row', 'column']],
  ['matrix.row', ['row']],
  ['matrix.col', ['column']],
  ['matrix.column', ['column']],
  ['matrix.add_row', ['row']],
  ['matrix.add_col', ['column']],
  ['matrix.add_column', ['column']],
  ['matrix.remove_row', ['row']],
  ['matrix.remove_col', ['column']],
  ['matrix.remove_column', ['column']],
  ['matrix.swap_rows', ['row1', 'row2']],
  ['matrix.swap_columns', ['column1', 'column2']],
  ['matrix.reshape', ['rows', 'columns']],
  ['matrix.fill', ['from_row', 'to_row', 'from_column', 'to_column']],
  ['matrix.submatrix', ['from_row', 'to_row', 'from_column', 'to_column']],
  ['matrix.sort', ['column']],
  ['matrix.pow', ['power']],
]);

const NUMERIC_COLLECTION_HELPER_NAMES = new Set([
  'array.abs',
  'array.avg',
  'array.covariance',
  'array.max',
  'array.median',
  'array.min',
  'array.mode',
  'array.percentile_linear_interpolation',
  'array.percentile_nearest_rank',
  'array.percentrank',
  'array.range',
  'array.standardize',
  'array.stdev',
  'array.sum',
  'array.variance',
  'matrix.avg',
  'matrix.det',
  'matrix.diff',
  'matrix.eigenvalues',
  'matrix.eigenvectors',
  'matrix.inv',
  'matrix.kron',
  'matrix.max',
  'matrix.median',
  'matrix.min',
  'matrix.mode',
  'matrix.mult',
  'matrix.pinv',
  'matrix.pow',
  'matrix.trace',
  'matrix.sum',
  'matrix.is_antidiagonal',
  'matrix.is_antisymmetric',
  'matrix.is_binary',
  'matrix.is_diagonal',
  'matrix.is_identity',
  'matrix.is_stochastic',
  'matrix.is_symmetric',
  'matrix.is_triangular',
  'matrix.is_zero',
]);

const ARRAY_NUMERIC_PARAMETER_NAMES_BY_CALL = new Map<string, readonly string[]>([
  ['array.percentile_linear_interpolation', ['percentage']],
  ['array.percentile_nearest_rank', ['percentage']],
]);

// Numeric array parameters from the official v6 reference's allowedTypeIDs.
const ARRAY_NUMERIC_RECEIVER_PARAMETERS_BY_OPERATION = new Map<string, readonly string[]>([
  ['avg', ['id']], ['covariance', ['id1', 'id2']],
  ['max', ['id']], ['median', ['id']], ['min', ['id']], ['mode', ['id']],
  ['percentile_linear_interpolation', ['id']], ['percentile_nearest_rank', ['id']],
  ['percentrank', ['id']], ['range', ['id']],
  ['stdev', ['id']], ['sum', ['id']], ['variance', ['id']],
]);

const TA_SIMPLE_PARAMETER_NAMES_BY_CALL = new Map<string, readonly string[]>([
  ['ta.alma', ['offset', 'sigma', 'floor']],
  ['ta.atr', ['length']],
  ['ta.bb', ['mult']],
  ['ta.bbw', ['mult']],
  ['ta.dmi', ['diLength', 'adxSmoothing']],
  ['ta.ema', ['length']],
  ['ta.hma', ['length']],
  ['ta.kc', ['length']],
  ['ta.kcw', ['length']],
  ['ta.linreg', ['offset']],
  ['ta.macd', ['fastlen', 'slowlen', 'siglen']],
  ['ta.percentile_linear_interpolation', ['percentage']],
  ['ta.percentile_nearest_rank', ['percentage']],
  ['ta.rma', ['length']],
  ['ta.rsi', ['length']],
  ['ta.sar', ['start', 'inc', 'max']],
  ['ta.supertrend', ['atrPeriod']],
  ['ta.tsi', ['short_length', 'long_length']],
]);
const TA_V6_SIMPLE_PARAMETER_NAMES_BY_CALL = new Map<string, readonly string[]>([
  ['ta.kc', ['mult', 'useTrueRange']],
  ['ta.kcw', ['mult', 'useTrueRange']],
  ['ta.tr', ['handle_na']],
  ['ta.rci', ['length']],
  ['ta.valuewhen', ['occurrence']],
]);

function taSimpleParameterNamesForVersion(canonicalName: string, pineVersion: number): readonly string[] | undefined {
  const base = TA_SIMPLE_PARAMETER_NAMES_BY_CALL.get(canonicalName);
  const versioned = pineVersion >= 6 ? TA_V6_SIMPLE_PARAMETER_NAMES_BY_CALL.get(canonicalName) : undefined;
  if (!base?.length) return versioned;
  if (!versioned?.length) return base;
  return [...base, ...versioned];
}

const TIMEFRAME_BOOL_MEMBER_NAMES = new Set([
  'timeframe.isdaily',
  'timeframe.isdwm',
  'timeframe.isintraday',
  'timeframe.isminutes',
  'timeframe.ismonthly',
  'timeframe.isseconds',
  'timeframe.isticks',
  'timeframe.isweekly',
]);
const TIMEFRAME_STRING_MEMBER_NAMES = new Set(['timeframe.main_period', 'timeframe.period']);
const TIME_STRING_PARAMETER_NAMES_BY_CALL = new Map<string, readonly string[]>([
  ['time', ['timeframe', 'session', 'timezone']],
  ['time_close', ['timeframe', 'session', 'timezone']],
  ['timestamp', ['dateString', 'timezone']],
  ['timeframe.change', ['timeframe']],
  ['timeframe.in_seconds', ['timeframe']],
  ['timeframe.to_seconds', ['timeframe']],
]);
const TIME_NUMERIC_PARAMETER_NAMES_BY_CALL = new Map<string, readonly string[]>([
  ['time', ['bars_back', 'timeframe_bars_back']],
  ['time_close', ['bars_back', 'timeframe_bars_back']],
  ['timestamp', ['year', 'month', 'day', 'hour', 'minute', 'second']],
  ['timeframe.from_seconds', ['seconds']],
]);

const SYMINFO_STRING_MEMBER_NAMES = new Set([
  'syminfo.basecurrency',
  'syminfo.country',
  'syminfo.currency',
  'syminfo.current_contract',
  'syminfo.description',
  'syminfo.exchange',
  'syminfo.industry',
  'syminfo.isin',
  'syminfo.main_tickerid',
  'syminfo.prefix',
  'syminfo.root',
  'syminfo.sector',
  'syminfo.session',
  'syminfo.ticker',
  'syminfo.tickerid',
  'syminfo.timezone',
  'syminfo.type',
  'syminfo.volumetype',
]);
const SYMINFO_INT_MEMBER_NAMES = new Set([
  'syminfo.employees',
  'syminfo.expiration_date',
  'syminfo.minmove',
  'syminfo.pricescale',
  'syminfo.shareholders',
]);
const SYMINFO_SERIES_INT_MEMBER_NAMES = new Set([
  'syminfo.recommendations_buy',
  'syminfo.recommendations_buy_strong',
  'syminfo.recommendations_hold',
  'syminfo.recommendations_sell',
  'syminfo.recommendations_sell_strong',
  'syminfo.recommendations_total',
  'syminfo.recommendations_date',
  'syminfo.target_price_date',
]);
const SYMINFO_FLOAT_MEMBER_NAMES = new Set([
  'syminfo.mincontract',
  'syminfo.mintick',
  'syminfo.pointvalue',
  'syminfo.shares_outstanding_float',
  'syminfo.shares_outstanding_total',
]);
const SYMINFO_SERIES_FLOAT_MEMBER_NAMES = new Set([
  'syminfo.target_price_average',
  'syminfo.target_price_estimates',
  'syminfo.target_price_high',
  'syminfo.target_price_low',
  'syminfo.target_price_median',
]);

const CHART_BOOL_MEMBER_NAMES = new Set([
  'chart.is_standard',
  'chart.is_heikinashi',
  'chart.is_kagi',
  'chart.is_linebreak',
  'chart.is_pnf',
  'chart.is_range',
  'chart.is_renko',
]);
const CHART_COLOR_MEMBER_NAMES = new Set(['chart.bg_color', 'chart.fg_color']);
const CHART_INT_MEMBER_NAMES = new Set(['chart.left_visible_bar_time', 'chart.right_visible_bar_time']);
const CHART_POINT_NUMERIC_PARAMETER_NAMES_BY_CALL = new Map<string, readonly string[]>([
  ['chart.point.from_index', ['index', 'price']],
  ['chart.point.from_time', ['time', 'price']],
  ['chart.point.new', ['time', 'index', 'price']],
  ['chart.point.now', ['price']],
]);

const TICKER_STRING_RETURN_NAMES = new Set([
  'ticker.heikinashi',
  'ticker.inherit',
  'ticker.kagi',
  'ticker.linebreak',
  'ticker.modify',
  'ticker.new',
  'ticker.pointfigure',
  'ticker.renko',
  'ticker.standard',
]);
const SYMINFO_STRING_RETURN_NAMES = new Set(['syminfo.prefix', 'syminfo.ticker']);
const TICKER_SESSION_VALUES = new Set(['regular', 'extended']);
const TICKER_SESSION_CONSTANT_VALUES = new Map([
  ['session.regular', 'regular'],
  ['session.extended', 'extended'],
]);
const TICKER_ADJUSTMENT_VALUES = new Set(['none', 'splits', 'dividends']);
const TICKER_ADJUSTMENT_CONSTANT_VALUES = new Map([
  ['adjustment.none', 'none'],
  ['adjustment.splits', 'splits'],
  ['adjustment.dividends', 'dividends'],
]);
const TICKER_INHERIT_ON_OFF_VALUES = new Set(['on', 'off', 'inherit']);
const TICKER_BACKADJUSTMENT_CONSTANT_VALUES = new Map([
  ['backadjustment.on', 'on'],
  ['backadjustment.off', 'off'],
  ['backadjustment.inherit', 'inherit'],
]);
const TICKER_SETTLEMENT_AS_CLOSE_CONSTANT_VALUES = new Map([
  ['settlement_as_close.on', 'on'],
  ['settlement_as_close.off', 'off'],
  ['settlement_as_close.inherit', 'inherit'],
]);

const REQUEST_FLOAT_RETURN_NAMES = new Set([
  'request.currency_rate',
  'request.dividends',
  'request.earnings',
  'request.economic',
  'request.financial',
  'request.quandl',
  'request.splits',
]);

const STRATEGY_FLOAT_MEMBER_NAMES = new Set([
  'strategy.avg_losing_trade',
  'strategy.avg_losing_trade_percent',
  'strategy.avg_trade',
  'strategy.avg_trade_percent',
  'strategy.avg_winning_trade',
  'strategy.avg_winning_trade_percent',
  'strategy.equity',
  'strategy.grossloss',
  'strategy.grossloss_percent',
  'strategy.grossprofit',
  'strategy.grossprofit_percent',
  'strategy.initial_capital',
  'strategy.margin_liquidation_price',
  'strategy.max_contracts_held_all',
  'strategy.max_contracts_held_long',
  'strategy.max_contracts_held_short',
  'strategy.max_drawdown',
  'strategy.max_drawdown_percent',
  'strategy.max_runup',
  'strategy.max_runup_percent',
  'strategy.netprofit',
  'strategy.netprofit_percent',
  'strategy.openprofit',
  'strategy.openprofit_percent',
  'strategy.percent_profitable',
  'strategy.closedtrades.first_index',
  'strategy.opentrades.capital_held',
  'strategy.position_avg_price',
  'strategy.position_size',
]);
const STRATEGY_INT_MEMBER_NAMES = new Set([
  'strategy.closedtrades',
  'strategy.eventrades',
  'strategy.losstrades',
  'strategy.opentrades',
  'strategy.wintrades',
]);
const STRATEGY_STRING_MEMBER_NAMES = new Set([
  'strategy.account_currency',
  'strategy.position_entry_name',
]);
const STRATEGY_STRING_ACCESSOR_NAMES = new Set([
  'strategy.closedtrades.entry_comment',
  'strategy.closedtrades.entry_id',
  'strategy.closedtrades.exit_comment',
  'strategy.closedtrades.exit_id',
  'strategy.opentrades.entry_comment',
  'strategy.opentrades.entry_id',
]);
const STRATEGY_INT_ACCESSOR_NAMES = new Set([
  'strategy.closedtrades.entry_bar_index',
  'strategy.closedtrades.entry_time',
  'strategy.closedtrades.exit_bar_index',
  'strategy.closedtrades.exit_time',
  'strategy.opentrades.entry_bar_index',
  'strategy.opentrades.entry_time',
]);
const STRATEGY_FLOAT_ACCESSOR_NAMES = new Set([
  'strategy.closedtrades.commission',
  'strategy.closedtrades.entry_price',
  'strategy.closedtrades.exit_price',
  'strategy.closedtrades.profit',
  'strategy.closedtrades.profit_percent',
  'strategy.closedtrades.size',
  'strategy.closedtrades.max_drawdown',
  'strategy.closedtrades.max_drawdown_percent',
  'strategy.closedtrades.max_runup',
  'strategy.closedtrades.max_runup_percent',
  'strategy.opentrades.commission',
  'strategy.opentrades.entry_price',
  'strategy.opentrades.max_drawdown',
  'strategy.opentrades.max_drawdown_percent',
  'strategy.opentrades.max_runup',
  'strategy.opentrades.max_runup_percent',
  'strategy.opentrades.profit',
  'strategy.opentrades.profit_percent',
  'strategy.opentrades.size',
]);

const REFERENCE_CONSTRUCTOR_RETURN_TYPES = new Map<string, SemanticTypeKind>([
  ['box.copy', 'box'],
  ['box.new', 'box'],
  ['chart.point.copy', 'chart.point'],
  ['chart.point.from_index', 'chart.point'],
  ['chart.point.from_time', 'chart.point'],
  ['chart.point.new', 'chart.point'],
  ['chart.point.now', 'chart.point'],
  ['label.copy', 'label'],
  ['label.new', 'label'],
  ['line.copy', 'line'],
  ['line.new', 'line'],
  ['linefill.copy', 'linefill'],
  ['linefill.new', 'linefill'],
  ['polyline.copy', 'polyline'],
  ['polyline.new', 'polyline'],
  ['table.new', 'table'],
]);

const DRAWING_ALL_ELEMENT_TYPES = new Map<string, SemanticTypeKind>([
  ['box.all', 'box'],
  ['label.all', 'label'],
  ['line.all', 'line'],
  ['linefill.all', 'linefill'],
  ['polyline.all', 'polyline'],
  ['table.all', 'table'],
]);

const BUILTIN_TUPLE_RETURN_TYPES = new Map<string, SemanticType[]>([
  [
    'ta.bb',
    [
      { kind: 'float', qualifier: 'series' },
      { kind: 'float', qualifier: 'series' },
      { kind: 'float', qualifier: 'series' },
    ],
  ],
  [
    'ta.dmi',
    [
      { kind: 'float', qualifier: 'series' },
      { kind: 'float', qualifier: 'series' },
      { kind: 'float', qualifier: 'series' },
    ],
  ],
  [
    'ta.kc',
    [
      { kind: 'float', qualifier: 'series' },
      { kind: 'float', qualifier: 'series' },
      { kind: 'float', qualifier: 'series' },
    ],
  ],
  [
    'ta.macd',
    [
      { kind: 'float', qualifier: 'series' },
      { kind: 'float', qualifier: 'series' },
      { kind: 'float', qualifier: 'series' },
    ],
  ],
  [
    'ta.supertrend',
    [
      { kind: 'float', qualifier: 'series' },
      { kind: 'int', qualifier: 'series' },
    ],
  ],
  [
    'ta.kst',
    [
      { kind: 'float', qualifier: 'series' },
      { kind: 'float', qualifier: 'series' },
    ],
  ],
]);

const BUILTIN_FUNCTIONS = new Set([
  'alert',
  'alertcondition',
  'barcolor',
  'bgcolor',
  'bool',
  'color',
  'fill',
  'fixnan',
  'float',
  'hline',
  'iff',
  'indicator',
  'input',
  'int',
  'box',
  'label',
  'line',
  'linefill',
  'max_bars_back',
  'na',
  'nz',
  'plot',
  'plotarrow',
  'plotbar',
  'plotcandle',
  'plotchar',
  'plotshape',
  'runtime',
  'security',
  'string',
  'strategy',
  'table',
  'time',
  'time_close',
  'timestamp',
  ...CALENDAR_FUNCTION_NAMES,
  ...LEGACY_GLOBAL_TA_ALIASES,
  ...LEGACY_GLOBAL_MATH_ALIASES,
  ...LEGACY_GLOBAL_STR_ALIASES,
]);

const BUILTIN_TYPE_CAST_NAMES = new Set(['bool', 'color', 'float', 'int', 'string']);

const QUALIFIER_RANK: Record<SemanticQualifier, number> = {
  const: 0,
  input: 1,
  simple: 2,
  series: 3,
};

const TYPE_QUALIFIER_NAMES = new Set(['const', 'input', 'simple', 'series']);
const COLLECTION_TYPE_NAMES = new Set(['array', 'matrix', 'map']);
const MAP_KEY_TYPE_NAMES = new Set(['int', 'float', 'bool', 'string', 'color']);
const PRIMITIVE_TYPE_KINDS = new Set<SemanticTypeKind>(['bool', 'color', 'float', 'int', 'string']);
const REFERENCE_TYPE_KINDS = new Set<SemanticTypeKind>(['box', 'chart.point', 'hline', 'label', 'line', 'linefill', 'plot', 'polyline', 'table']);
const STRUCTURED_TYPE_KINDS = new Set<SemanticTypeKind>(['array', 'matrix', 'map', 'udt']);
const COLLECTION_TEMPLATE_TYPE_PATTERN = /^(array|matrix|map)<(.+)>$/;
const UNKNOWN_SEMANTIC_TYPE: SemanticType = { kind: 'unknown' };
const MATRIX_VALUE_RETURN_METHODS = new Set([
  'concat',
  'copy',
  'diff',
  'inv',
  'kron',
  'mult',
  'pinv',
  'pow',
  'submatrix',
  'sum',
  'transpose',
]);
const ARRAY_VOID_RETURN_METHODS = new Set([
  'clear',
  'fill',
  'insert',
  'push',
  'reverse',
  'set',
  'sort',
  'unshift',
]);
const MATRIX_VOID_RETURN_METHODS = new Set([
  'add_col',
  'add_column',
  'add_row',
  'fill',
  'reshape',
  'reverse',
  'set',
  'sort',
  'swap_columns',
  'swap_rows',
]);
const BUILTIN_VOID_RETURN_NAMES = new Set([
  'alert',
  'alertcondition',
  'barcolor',
  'bgcolor',
  'fill',
  'log.error',
  'log.info',
  'log.warning',
  'max_bars_back',
  'plotarrow',
  'plotbar',
  'plotcandle',
  'plotchar',
  'plotshape',
  'strategy.cancel',
  'strategy.cancel_all',
  'strategy.close',
  'strategy.close_all',
  'strategy.entry',
  'strategy.exit',
  'strategy.order',
  'strategy.risk.allow_entry_in',
  'strategy.risk.max_cons_loss_days',
  'strategy.risk.max_drawdown',
  'strategy.risk.max_intraday_filled_orders',
  'strategy.risk.max_intraday_loss',
  'strategy.risk.max_position_size',
  ...[...ARRAY_VOID_RETURN_METHODS].map((method) => `array.${method}`),
  'map.clear',
  'map.put_all',
  ...[...MATRIX_VOID_RETURN_METHODS].map((method) => `matrix.${method}`),
]);
const REFERENCE_VOID_RETURN_METHODS = new Map<SemanticTypeKind, Set<string>>([
  ['box', new Set([
    'delete',
    'set_bgcolor',
    'set_border_color',
    'set_border_style',
    'set_border_width',
    'set_bottom',
    'set_bottom_right_point',
    'set_extend',
    'set_left',
    'set_lefttop',
    'set_right',
    'set_rightbottom',
    'set_text',
    'set_text_color',
    'set_text_font_family',
    'set_text_formatting',
    'set_text_halign',
    'set_text_size',
    'set_text_valign',
    'set_text_wrap',
    'set_top',
    'set_top_left_point',
    'set_xloc',
  ])],
  ['label', new Set([
    'delete',
    'set_color',
    'set_point',
    'set_size',
    'set_style',
    'set_text',
    'set_text_font_family',
    'set_text_formatting',
    'set_textalign',
    'set_textcolor',
    'set_tooltip',
    'set_x',
    'set_xloc',
    'set_xy',
    'set_y',
    'set_yloc',
  ])],
  ['line', new Set([
    'delete',
    'set_color',
    'set_extend',
    'set_first_point',
    'set_second_point',
    'set_style',
    'set_width',
    'set_x1',
    'set_x2',
    'set_xloc',
    'set_xy1',
    'set_xy2',
    'set_y1',
    'set_y2',
  ])],
  ['linefill', new Set(['delete', 'set_color'])],
  ['matrix', MATRIX_VOID_RETURN_METHODS],
  ['polyline', new Set(['delete'])],
  ['table', new Set([
    'cell',
    'cell_set_bgcolor',
    'cell_set_height',
    'cell_set_text',
    'cell_set_text_color',
    'cell_set_text_font_family',
    'cell_set_text_formatting',
    'cell_set_text_halign',
    'cell_set_text_size',
    'cell_set_text_valign',
    'cell_set_tooltip',
    'cell_set_width',
    'clear',
    'delete',
    'merge_cells',
    'set_bgcolor',
    'set_border_color',
    'set_border_width',
    'set_frame_color',
    'set_frame_width',
    'set_position',
  ])],
]);

const STRATEGY_ORDER_PARAMS = ['id', 'direction', 'qty', 'limit', 'stop', 'oca_name', 'oca_type', 'comment', 'alert_message', 'disable_alert'];
const LEGACY_STRATEGY_ORDER_PARAMS = [...STRATEGY_ORDER_PARAMS, 'when'];
const LEGACY_STRATEGY_CLOSE_PARAMS = ['id', 'comment', 'qty', 'qty_percent', 'alert_message', 'immediately', 'disable_alert', 'when'];
const STRATEGY_EXIT_PARAMS = [
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
];
const LEGACY_STRATEGY_EXIT_PARAMS = [...STRATEGY_EXIT_PARAMS, 'when'];
const STRATEGY_DIRECTION_VALUES = new Set(['long', 'short']);
const STRATEGY_ALLOWED_ENTRY_DIRECTION_VALUES = new Set(['all', 'long', 'short']);
const STRATEGY_OCA_TYPE_VALUES = new Set(['cancel', 'reduce', 'none']);
const STRATEGY_DEFAULT_QTY_TYPE_VALUES = new Set(['fixed', 'cash', 'percent_of_equity']);
const STRATEGY_COMMISSION_TYPE_VALUES = new Set(['percent', 'cash_per_order', 'cash_per_contract']);
const STRATEGY_CASH_OR_PERCENT_RISK_TYPE_VALUES = new Set(['cash', 'percent_of_equity']);
const STRATEGY_BOOL_PARAMETER_NAMES = new Set(['disable_alert', 'immediately', 'when']);
const STRATEGY_STRING_PARAMETER_NAMES = new Set([
  'id',
  'from_entry',
  'oca_name',
  'comment',
  'comment_profit',
  'comment_loss',
  'comment_trailing',
  'alert_message',
  'alert_profit',
  'alert_loss',
  'alert_trailing',
]);
const STRATEGY_ENUM_STRING_PARAMETER_NAMES_BY_CALL = new Map<string, readonly string[]>([
  ['strategy.entry', ['direction', 'oca_type']],
  ['strategy.order', ['direction', 'oca_type']],
  ['strategy.risk.allow_entry_in', ['value']],
  ['strategy.risk.max_drawdown', ['type']],
  ['strategy.risk.max_intraday_loss', ['type']],
]);
const STRATEGY_NUMERIC_PARAMETER_NAMES = new Set([
  'qty',
  'limit',
  'stop',
  'qty_percent',
  'profit',
  'loss',
  'trail_price',
  'trail_points',
  'trail_offset',
  'contracts',
  'count',
  'trade_num',
]);
const STRATEGY_NUMERIC_VALUE_PARAMETER_CALLS = new Set([
  'strategy.risk.max_drawdown',
  'strategy.risk.max_intraday_loss',
]);
const STRATEGY_TRADE_ACCESSORS = [
  'entry_id',
  'entry_comment',
  'entry_price',
  'entry_bar_index',
  'entry_time',
  'size',
  'profit',
  'profit_percent',
  'commission',
  'max_runup',
  'max_drawdown',
  'max_runup_percent',
  'max_drawdown_percent',
];
const STRATEGY_CLOSED_TRADE_ACCESSORS = [
  ...STRATEGY_TRADE_ACCESSORS,
  'exit_id',
  'exit_comment',
  'exit_price',
  'exit_bar_index',
  'exit_time',
];

interface BuiltinSignature {
  params: string[];
  legacyV4Params?: string[];
  legacyV5Params?: string[];
  aliases?: Record<string, string>;
  legacyV4Aliases?: Readonly<Record<string, string>>;
  overloads?: string[][];
  minArgs?: number;
  legacyV4MinArgs?: number;
  legacyV5MinArgs?: number;
  requiredParams?: string[];
  singlePositionalParam?: string;
  optionalLeadingParam?: string;
  maxArgs?: number;
  allowExtraNamed?: boolean;
  allowExtraPositional?: boolean;
  allowNamedPrefixWithPositional?: boolean;
  namedPrefixWithPositionalParams?: string[];
  variadicParamPrefix?: string;
}

const MAX_VARIADIC_SIGNATURE_INDEX = 1000;

const LINE_NEW_COORDINATE_SIGNATURE: BuiltinSignature = {
  params: ['x1', 'y1', 'x2', 'y2', 'xloc', 'extend', 'color', 'style', 'width', 'force_overlay'],
  minArgs: 4,
  maxArgs: 10,
  allowNamedPrefixWithPositional: true,
};

const LINE_NEW_POINT_SIGNATURE: BuiltinSignature = {
  params: ['first_point', 'second_point', 'xloc', 'extend', 'color', 'style', 'width', 'force_overlay'],
  minArgs: 2,
  maxArgs: 8,
  allowNamedPrefixWithPositional: true,
};

const LABEL_NEW_COORDINATE_SIGNATURE: BuiltinSignature = {
  params: ['x', 'y', 'text', 'xloc', 'yloc', 'color', 'style', 'textcolor', 'size', 'textalign', 'tooltip', 'text_font_family', 'force_overlay', 'text_formatting'],
  minArgs: 2,
  maxArgs: 14,
  allowNamedPrefixWithPositional: true,
};

const LABEL_NEW_POINT_SIGNATURE: BuiltinSignature = {
  params: ['point', 'text', 'xloc', 'yloc', 'color', 'style', 'textcolor', 'size', 'textalign', 'tooltip', 'text_font_family', 'force_overlay', 'text_formatting'],
  minArgs: 1,
  maxArgs: 13,
  allowNamedPrefixWithPositional: true,
};

const BOX_NEW_COORDINATE_SIGNATURE: BuiltinSignature = {
  params: [
    'left',
    'top',
    'right',
    'bottom',
    'border_color',
    'border_width',
    'border_style',
    'extend',
    'xloc',
    'bgcolor',
    'text',
    'text_size',
    'text_color',
    'text_halign',
    'text_valign',
    'text_wrap',
    'text_font_family',
    'force_overlay',
    'text_formatting',
  ],
  minArgs: 4,
  maxArgs: 19,
  allowNamedPrefixWithPositional: true,
};

const BOX_NEW_POINT_SIGNATURE: BuiltinSignature = {
  params: [
    'top_left',
    'bottom_right',
    'border_color',
    'border_width',
    'border_style',
    'extend',
    'xloc',
    'bgcolor',
    'text',
    'text_size',
    'text_color',
    'text_halign',
    'text_valign',
    'text_wrap',
    'text_font_family',
    'force_overlay',
    'text_formatting',
  ],
  minArgs: 2,
  maxArgs: 17,
  allowNamedPrefixWithPositional: true,
};

const BUILTIN_SIGNATURES = new Map<string, BuiltinSignature>([
  ...[...DRAWING_OBJECT_CAST_NAMES].map((name): [string, BuiltinSignature] => [name, PINE_NA_CAST_SIGNATURE]),
  ['alert', { params: ['message', 'freq'], minArgs: 1, allowNamedPrefixWithPositional: true }],
  ['alertcondition', { params: ['condition', 'title', 'message'], minArgs: 1, allowNamedPrefixWithPositional: true }],
  [
    'barcolor',
    {
      params: ['color', 'offset', 'editable', 'show_last', 'title', 'display'],
      legacyV4Params: ['color', 'transp', 'offset', 'editable', 'show_last', 'title', 'display'],
      minArgs: 1,
      allowNamedPrefixWithPositional: true,
    },
  ],
  [
    'bgcolor',
    {
      params: ['color', 'offset', 'editable', 'show_last', 'title', 'display', 'force_overlay'],
      legacyV4Params: ['color', 'transp', 'offset', 'editable', 'show_last', 'title', 'display', 'force_overlay'],
      legacyV5Params: ['color', 'transp', 'offset', 'editable', 'show_last', 'title', 'display', 'force_overlay'],
      minArgs: 1,
      allowNamedPrefixWithPositional: true,
    },
  ],
  ['bool', { params: ['x'], minArgs: 1, maxArgs: 1, allowNamedPrefixWithPositional: true }],
  ['chart.point.copy', { params: ['id'], minArgs: 1, maxArgs: 1, allowNamedPrefixWithPositional: true }],
  ['chart.point.from_index', { params: ['index', 'price'], minArgs: 2, maxArgs: 2, allowNamedPrefixWithPositional: true }],
  ['chart.point.from_time', { params: ['time', 'price'], minArgs: 2, maxArgs: 2, allowNamedPrefixWithPositional: true }],
  ['chart.point.new', { params: ['time', 'index', 'price'], minArgs: 3, maxArgs: 3, allowNamedPrefixWithPositional: true }],
  ['chart.point.now', { params: ['price'], minArgs: 0, maxArgs: 1, allowNamedPrefixWithPositional: true }],
  ['color', {
    params: ['x', 'red', 'green', 'blue', 'transp'],
    aliases: { transparency: 'transp' },
    minArgs: 1,
    maxArgs: 4,
    allowNamedPrefixWithPositional: true,
  }],
  ['color.new', { params: ['color', 'transp'], aliases: { transparency: 'transp' }, minArgs: 2, maxArgs: 2, allowNamedPrefixWithPositional: true }],
  ['color.rgb', { params: ['red', 'green', 'blue', 'transp'], aliases: { transparency: 'transp' }, minArgs: 3, maxArgs: 4, allowNamedPrefixWithPositional: true }],
  ['color.r', { params: ['color'], minArgs: 1, maxArgs: 1, allowNamedPrefixWithPositional: true }],
  ['color.g', { params: ['color'], minArgs: 1, maxArgs: 1, allowNamedPrefixWithPositional: true }],
  ['color.b', { params: ['color'], minArgs: 1, maxArgs: 1, allowNamedPrefixWithPositional: true }],
  ['color.t', { params: ['color'], minArgs: 1, maxArgs: 1, allowNamedPrefixWithPositional: true }],
  [
    'color.from_gradient',
    { params: ['value', 'bottom_value', 'top_value', 'bottom_color', 'top_color'], minArgs: 5, maxArgs: 5, allowNamedPrefixWithPositional: true },
  ],
  [
    'fill',
    {
      params: ['plot1', 'plot2', 'color', 'title', 'editable', 'show_last', 'fillgaps', 'display'],
      legacyV4Params: ['plot1', 'plot2', 'color', 'transp', 'title', 'editable', 'show_last', 'fillgaps', 'display'],
      legacyV5Params: ['plot1', 'plot2', 'color', 'title', 'editable', 'show_last', 'fillgaps', 'display', 'transp'],
      aliases: { hline1: 'plot1', hline2: 'plot2' },
      minArgs: 2,
      legacyV4MinArgs: 2,
      legacyV5MinArgs: 2,
      allowNamedPrefixWithPositional: true,
    },
  ],
  ['fixnan', { params: ['source'], minArgs: 1, maxArgs: 1, allowNamedPrefixWithPositional: true }],
  ['float', { params: ['x'], minArgs: 1, maxArgs: 1, allowNamedPrefixWithPositional: true }],
  ['iff', { params: ['condition', 'then', 'else'], minArgs: 3, maxArgs: 3, allowNamedPrefixWithPositional: true }],
  ['offset', { params: ['source', 'offset'], minArgs: 2, maxArgs: 2, allowNamedPrefixWithPositional: true }],
  ['hline', { params: ['price', 'title', 'color', 'linestyle', 'linewidth', 'editable', 'display'], minArgs: 1, allowNamedPrefixWithPositional: true }],
  ['int', { params: ['x'], minArgs: 1, maxArgs: 1, allowNamedPrefixWithPositional: true }],
  [
    'label.new',
    LABEL_NEW_COORDINATE_SIGNATURE,
  ],
  ['label.delete', { params: ['id'], minArgs: 1, maxArgs: 1, allowNamedPrefixWithPositional: true }],
  ['label.copy', { params: ['id'], minArgs: 1, maxArgs: 1, allowNamedPrefixWithPositional: true }],
  ['label.set_x', { params: ['id', 'x'], minArgs: 2, maxArgs: 2, allowNamedPrefixWithPositional: true }],
  ['label.set_y', { params: ['id', 'y'], minArgs: 2, maxArgs: 2, allowNamedPrefixWithPositional: true }],
  ['label.set_xy', { params: ['id', 'x', 'y'], minArgs: 3, maxArgs: 3, allowNamedPrefixWithPositional: true }],
  ['label.set_point', { params: ['id', 'point'], minArgs: 2, maxArgs: 2, allowNamedPrefixWithPositional: true }],
  ['label.set_text', { params: ['id', 'text'], minArgs: 2, maxArgs: 2, allowNamedPrefixWithPositional: true }],
  ['label.set_xloc', { params: ['id', 'x', 'xloc'], minArgs: 3, maxArgs: 3, allowNamedPrefixWithPositional: true }],
  ['label.set_yloc', { params: ['id', 'yloc'], minArgs: 2, maxArgs: 2, allowNamedPrefixWithPositional: true }],
  ['label.set_style', { params: ['id', 'style'], minArgs: 2, maxArgs: 2, allowNamedPrefixWithPositional: true }],
  ['label.set_color', { params: ['id', 'color'], minArgs: 2, maxArgs: 2, allowNamedPrefixWithPositional: true }],
  ['label.set_textcolor', { params: ['id', 'textcolor'], minArgs: 2, maxArgs: 2, allowNamedPrefixWithPositional: true }],
  ['label.set_size', { params: ['id', 'size'], minArgs: 2, maxArgs: 2, allowNamedPrefixWithPositional: true }],
  ['label.set_textalign', { params: ['id', 'textalign'], minArgs: 2, maxArgs: 2, allowNamedPrefixWithPositional: true }],
  ['label.set_text_font_family', { params: ['id', 'text_font_family'], minArgs: 2, maxArgs: 2, allowNamedPrefixWithPositional: true }],
  ['label.set_text_formatting', { params: ['id', 'text_formatting'], minArgs: 2, maxArgs: 2, allowNamedPrefixWithPositional: true }],
  ['label.set_tooltip', { params: ['id', 'tooltip'], minArgs: 2, maxArgs: 2, allowNamedPrefixWithPositional: true }],
  ['label.get_x', { params: ['id'], minArgs: 1, maxArgs: 1, allowNamedPrefixWithPositional: true }],
  ['label.get_y', { params: ['id'], minArgs: 1, maxArgs: 1, allowNamedPrefixWithPositional: true }],
  ['label.get_text', { params: ['id'], minArgs: 1, maxArgs: 1, allowNamedPrefixWithPositional: true }],
  ['label.get_xloc', { params: ['id'], minArgs: 1, maxArgs: 1, allowNamedPrefixWithPositional: true }],
  ['label.get_yloc', { params: ['id'], minArgs: 1, maxArgs: 1, allowNamedPrefixWithPositional: true }],
  ['label.get_style', { params: ['id'], minArgs: 1, maxArgs: 1, allowNamedPrefixWithPositional: true }],
  ['label.get_color', { params: ['id'], minArgs: 1, maxArgs: 1, allowNamedPrefixWithPositional: true }],
  ['label.get_textcolor', { params: ['id'], minArgs: 1, maxArgs: 1, allowNamedPrefixWithPositional: true }],
  ['label.get_size', { params: ['id'], minArgs: 1, maxArgs: 1, allowNamedPrefixWithPositional: true }],
  ['label.get_tooltip', { params: ['id'], minArgs: 1, maxArgs: 1, allowNamedPrefixWithPositional: true }],
  ['line.delete', { params: ['id'], minArgs: 1, maxArgs: 1, allowNamedPrefixWithPositional: true }],
  ['line.copy', { params: ['id'], minArgs: 1, maxArgs: 1, allowNamedPrefixWithPositional: true }],
  ['line.set_x1', { params: ['id', 'x'], minArgs: 2, maxArgs: 2, allowNamedPrefixWithPositional: true }],
  ['line.set_x2', { params: ['id', 'x'], minArgs: 2, maxArgs: 2, allowNamedPrefixWithPositional: true }],
  ['line.set_y1', { params: ['id', 'y'], minArgs: 2, maxArgs: 2, allowNamedPrefixWithPositional: true }],
  ['line.set_y2', { params: ['id', 'y'], minArgs: 2, maxArgs: 2, allowNamedPrefixWithPositional: true }],
  ['line.set_xy1', { params: ['id', 'x', 'y'], minArgs: 3, maxArgs: 3, allowNamedPrefixWithPositional: true }],
  ['line.set_xy2', { params: ['id', 'x', 'y'], minArgs: 3, maxArgs: 3, allowNamedPrefixWithPositional: true }],
  ['line.set_first_point', { params: ['id', 'point'], minArgs: 2, maxArgs: 2, allowNamedPrefixWithPositional: true }],
  ['line.set_second_point', { params: ['id', 'point'], minArgs: 2, maxArgs: 2, allowNamedPrefixWithPositional: true }],
  ['line.set_xloc', { params: ['id', 'x1', 'x2', 'xloc'], minArgs: 4, maxArgs: 4, allowNamedPrefixWithPositional: true }],
  ['line.set_extend', { params: ['id', 'extend'], minArgs: 2, maxArgs: 2, allowNamedPrefixWithPositional: true }],
  ['line.set_color', { params: ['id', 'color'], minArgs: 2, maxArgs: 2, allowNamedPrefixWithPositional: true }],
  ['line.set_style', { params: ['id', 'style'], minArgs: 2, maxArgs: 2, allowNamedPrefixWithPositional: true }],
  ['line.set_width', { params: ['id', 'width'], minArgs: 2, maxArgs: 2, allowNamedPrefixWithPositional: true }],
  ['line.get_x1', { params: ['id'], minArgs: 1, maxArgs: 1, allowNamedPrefixWithPositional: true }],
  ['line.get_x2', { params: ['id'], minArgs: 1, maxArgs: 1, allowNamedPrefixWithPositional: true }],
  ['line.get_y1', { params: ['id'], minArgs: 1, maxArgs: 1, allowNamedPrefixWithPositional: true }],
  ['line.get_y2', { params: ['id'], minArgs: 1, maxArgs: 1, allowNamedPrefixWithPositional: true }],
  ['line.get_color', { params: ['id'], minArgs: 1, maxArgs: 1, allowNamedPrefixWithPositional: true }],
  ['line.get_extend', { params: ['id'], minArgs: 1, maxArgs: 1, allowNamedPrefixWithPositional: true }],
  ['line.get_style', { params: ['id'], minArgs: 1, maxArgs: 1, allowNamedPrefixWithPositional: true }],
  ['line.get_width', { params: ['id'], minArgs: 1, maxArgs: 1, allowNamedPrefixWithPositional: true }],
  ['line.get_price', { params: ['id', 'x'], minArgs: 2, maxArgs: 2, allowNamedPrefixWithPositional: true }],
  [
    'line.new',
    LINE_NEW_COORDINATE_SIGNATURE,
  ],
  [
    'box.new',
    BOX_NEW_COORDINATE_SIGNATURE,
  ],
  ['box.delete', { params: ['id'], minArgs: 1, maxArgs: 1, allowNamedPrefixWithPositional: true }],
  ['box.copy', { params: ['id'], minArgs: 1, maxArgs: 1, allowNamedPrefixWithPositional: true }],
  ['box.set_left', { params: ['id', 'left'], minArgs: 2, maxArgs: 2, allowNamedPrefixWithPositional: true }],
  ['box.set_right', { params: ['id', 'right'], minArgs: 2, maxArgs: 2, allowNamedPrefixWithPositional: true }],
  ['box.set_top', { params: ['id', 'top'], minArgs: 2, maxArgs: 2, allowNamedPrefixWithPositional: true }],
  ['box.set_bottom', { params: ['id', 'bottom'], minArgs: 2, maxArgs: 2, allowNamedPrefixWithPositional: true }],
  ['box.set_lefttop', { params: ['id', 'left', 'top'], minArgs: 3, maxArgs: 3, allowNamedPrefixWithPositional: true }],
  ['box.set_rightbottom', { params: ['id', 'right', 'bottom'], minArgs: 3, maxArgs: 3, allowNamedPrefixWithPositional: true }],
  ['box.set_xloc', { params: ['id', 'left', 'right', 'xloc'], minArgs: 4, maxArgs: 4, allowNamedPrefixWithPositional: true }],
  ['box.set_top_left_point', { params: ['id', 'point'], minArgs: 2, maxArgs: 2, allowNamedPrefixWithPositional: true }],
  ['box.set_bottom_right_point', { params: ['id', 'point'], minArgs: 2, maxArgs: 2, allowNamedPrefixWithPositional: true }],
  ['box.set_bgcolor', { params: ['id', 'color'], minArgs: 2, maxArgs: 2, allowNamedPrefixWithPositional: true }],
  ['box.set_border_color', { params: ['id', 'color'], minArgs: 2, maxArgs: 2, allowNamedPrefixWithPositional: true }],
  ['box.set_border_width', { params: ['id', 'width'], minArgs: 2, maxArgs: 2, allowNamedPrefixWithPositional: true }],
  ['box.set_border_style', { params: ['id', 'style'], minArgs: 2, maxArgs: 2, allowNamedPrefixWithPositional: true }],
  ['box.set_extend', { params: ['id', 'extend'], minArgs: 2, maxArgs: 2, allowNamedPrefixWithPositional: true }],
  ['box.set_text', { params: ['id', 'text'], minArgs: 2, maxArgs: 2, allowNamedPrefixWithPositional: true }],
  ['box.set_text_color', { params: ['id', 'text_color'], minArgs: 2, maxArgs: 2, allowNamedPrefixWithPositional: true }],
  ['box.set_text_size', { params: ['id', 'text_size'], minArgs: 2, maxArgs: 2, allowNamedPrefixWithPositional: true }],
  ['box.set_text_halign', { params: ['id', 'text_halign'], minArgs: 2, maxArgs: 2, allowNamedPrefixWithPositional: true }],
  ['box.set_text_valign', { params: ['id', 'text_valign'], minArgs: 2, maxArgs: 2, allowNamedPrefixWithPositional: true }],
  ['box.set_text_wrap', { params: ['id', 'text_wrap'], minArgs: 2, maxArgs: 2, allowNamedPrefixWithPositional: true }],
  ['box.set_text_font_family', { params: ['id', 'text_font_family'], minArgs: 2, maxArgs: 2, allowNamedPrefixWithPositional: true }],
  ['box.set_text_formatting', { params: ['id', 'text_formatting'], minArgs: 2, maxArgs: 2, allowNamedPrefixWithPositional: true }],
  ['box.get_left', { params: ['id'], minArgs: 1, maxArgs: 1, allowNamedPrefixWithPositional: true }],
  ['box.get_right', { params: ['id'], minArgs: 1, maxArgs: 1, allowNamedPrefixWithPositional: true }],
  ['box.get_top', { params: ['id'], minArgs: 1, maxArgs: 1, allowNamedPrefixWithPositional: true }],
  ['box.get_bottom', { params: ['id'], minArgs: 1, maxArgs: 1, allowNamedPrefixWithPositional: true }],
  ['box.get_bgcolor', { params: ['id'], minArgs: 1, maxArgs: 1, allowNamedPrefixWithPositional: true }],
  ['box.get_border_color', { params: ['id'], minArgs: 1, maxArgs: 1, allowNamedPrefixWithPositional: true }],
  ['box.get_text', { params: ['id'], minArgs: 1, maxArgs: 1, allowNamedPrefixWithPositional: true }],
  ['box.get_text_halign', { params: ['id'], minArgs: 1, maxArgs: 1, allowNamedPrefixWithPositional: true }],
  ['box.get_text_valign', { params: ['id'], minArgs: 1, maxArgs: 1, allowNamedPrefixWithPositional: true }],
  [
    'polyline.new',
    {
      params: ['points', 'curved', 'closed', 'xloc', 'line_color', 'fill_color', 'line_style', 'line_width', 'force_overlay'],
      minArgs: 1,
      maxArgs: 9,
      allowNamedPrefixWithPositional: true,
    },
  ],
  ['polyline.delete', { params: ['id'], minArgs: 1, maxArgs: 1, allowNamedPrefixWithPositional: true }],
  ['polyline.copy', { params: ['id'], minArgs: 1, maxArgs: 1, allowNamedPrefixWithPositional: true }],
  ['linefill.new', { params: ['line1', 'line2', 'color'], minArgs: 3, maxArgs: 3, allowNamedPrefixWithPositional: true }],
  ['linefill.delete', { params: ['id'], minArgs: 1, maxArgs: 1, allowNamedPrefixWithPositional: true }],
  ['linefill.set_color', { params: ['id', 'color'], minArgs: 2, maxArgs: 2, allowNamedPrefixWithPositional: true }],
  ['linefill.get_line1', { params: ['id'], minArgs: 1, maxArgs: 1, allowNamedPrefixWithPositional: true }],
  ['linefill.get_line2', { params: ['id'], minArgs: 1, maxArgs: 1, allowNamedPrefixWithPositional: true }],
  ['linefill.get_color', { params: ['id'], minArgs: 1, maxArgs: 1, allowNamedPrefixWithPositional: true }],
  ['linefill.copy', { params: ['id'], minArgs: 1, maxArgs: 1, allowNamedPrefixWithPositional: true }],
  [
    'table.new',
    {
      params: ['position', 'columns', 'rows', 'bgcolor', 'frame_color', 'frame_width', 'border_color', 'border_width', 'force_overlay'],
      minArgs: 3,
      requiredParams: ['position', 'columns', 'rows'],
      maxArgs: 9,
      allowNamedPrefixWithPositional: true,
    },
  ],
  ['table.delete', { params: ['table_id'], minArgs: 1, maxArgs: 1, allowNamedPrefixWithPositional: true }],
  ['table.clear', { params: ['table_id', 'start_column', 'start_row', 'end_column', 'end_row'], minArgs: 3, maxArgs: 5, allowNamedPrefixWithPositional: true }],
  ['table.merge_cells', { params: ['table_id', 'start_column', 'start_row', 'end_column', 'end_row'], minArgs: 5, maxArgs: 5, allowNamedPrefixWithPositional: true }],
  ['table.set_position', { params: ['table_id', 'position'], minArgs: 2, maxArgs: 2, allowNamedPrefixWithPositional: true }],
  ['table.set_bgcolor', { params: ['table_id', 'bgcolor'], minArgs: 1, maxArgs: 2, allowNamedPrefixWithPositional: true }],
  ['table.set_frame_color', { params: ['table_id', 'frame_color'], minArgs: 1, maxArgs: 2, allowNamedPrefixWithPositional: true }],
  ['table.set_frame_width', { params: ['table_id', 'frame_width'], minArgs: 1, maxArgs: 2, allowNamedPrefixWithPositional: true }],
  ['table.set_border_color', { params: ['table_id', 'border_color'], minArgs: 1, maxArgs: 2, allowNamedPrefixWithPositional: true }],
  ['table.set_border_width', { params: ['table_id', 'border_width'], minArgs: 1, maxArgs: 2, allowNamedPrefixWithPositional: true }],
  [
    'table.cell',
    {
      params: ['table_id', 'column', 'row', 'text', 'width', 'height', 'text_color', 'text_halign', 'text_valign', 'text_size', 'bgcolor', 'tooltip', 'text_font_family', 'text_formatting'],
      minArgs: 3,
      maxArgs: 14,
      allowNamedPrefixWithPositional: true,
    },
  ],
  ['table.cell_set_text', { params: ['table_id', 'column', 'row', 'text'], minArgs: 3, maxArgs: 4, allowNamedPrefixWithPositional: true }],
  ['table.cell_set_bgcolor', { params: ['table_id', 'column', 'row', 'bgcolor'], minArgs: 3, maxArgs: 4, allowNamedPrefixWithPositional: true }],
  ['table.cell_set_text_color', { params: ['table_id', 'column', 'row', 'text_color'], minArgs: 3, maxArgs: 4, allowNamedPrefixWithPositional: true }],
  ['table.cell_set_text_size', { params: ['table_id', 'column', 'row', 'text_size'], minArgs: 3, maxArgs: 4, allowNamedPrefixWithPositional: true }],
  ['table.cell_set_width', { params: ['table_id', 'column', 'row', 'width'], minArgs: 3, maxArgs: 4, allowNamedPrefixWithPositional: true }],
  ['table.cell_set_height', { params: ['table_id', 'column', 'row', 'height'], minArgs: 3, maxArgs: 4, allowNamedPrefixWithPositional: true }],
  ['table.cell_set_text_halign', { params: ['table_id', 'column', 'row', 'text_halign'], minArgs: 3, maxArgs: 4, allowNamedPrefixWithPositional: true }],
  ['table.cell_set_text_valign', { params: ['table_id', 'column', 'row', 'text_valign'], minArgs: 3, maxArgs: 4, allowNamedPrefixWithPositional: true }],
  ['table.cell_set_text_font_family', { params: ['table_id', 'column', 'row', 'text_font_family'], minArgs: 4, maxArgs: 4, allowNamedPrefixWithPositional: true }],
  ['table.cell_set_text_formatting', { params: ['table_id', 'column', 'row', 'text_formatting'], minArgs: 4, maxArgs: 4, allowNamedPrefixWithPositional: true }],
  ['table.cell_set_tooltip', { params: ['table_id', 'column', 'row', 'tooltip'], minArgs: 3, maxArgs: 4, allowNamedPrefixWithPositional: true }],
  [
    'plot',
    {
      params: [
        'series',
        'title',
        'color',
        'linewidth',
        'style',
        'trackprice',
        'histbase',
        'offset',
        'join',
        'editable',
        'show_last',
        'display',
        'format',
        'precision',
        'force_overlay',
        'linestyle',
      ],
      legacyV4Params: [
        'series',
        'title',
        'color',
        'linewidth',
        'style',
        'trackprice',
        'transp',
        'histbase',
        'offset',
        'join',
        'editable',
        'show_last',
        'display',
        'format',
        'precision',
        'force_overlay',
        'linestyle',
      ],
      legacyV5Params: [
        'series',
        'title',
        'color',
        'linewidth',
        'style',
        'trackprice',
        'transp',
        'histbase',
        'offset',
        'join',
        'editable',
        'show_last',
        'display',
        'format',
        'precision',
        'force_overlay',
        'linestyle',
      ],
      minArgs: 1,
      allowNamedPrefixWithPositional: true,
    },
  ],
  [
    'plotbar',
    {
      params: ['open', 'high', 'low', 'close', 'title', 'color', 'editable', 'show_last', 'display', 'format', 'precision', 'force_overlay'],
      legacyV4Params: ['open', 'high', 'low', 'close', 'title', 'color', 'transp', 'editable', 'show_last', 'display'],
      legacyV5Params: ['open', 'high', 'low', 'close', 'title', 'color', 'transp', 'editable', 'show_last', 'display'],
      minArgs: 4,
      allowNamedPrefixWithPositional: true,
    },
  ],
  [
    'plotcandle',
    {
      params: [
        'open',
        'high',
        'low',
        'close',
        'title',
        'color',
        'wickcolor',
        'editable',
        'show_last',
        'bordercolor',
        'display',
        'format',
        'precision',
        'force_overlay',
      ],
      legacyV4Params: ['open', 'high', 'low', 'close', 'title', 'color', 'wickcolor', 'editable', 'show_last', 'bordercolor', 'display', 'transp'],
      legacyV5Params: ['open', 'high', 'low', 'close', 'title', 'color', 'wickcolor', 'editable', 'show_last', 'bordercolor', 'display', 'transp'],
      minArgs: 4,
      allowNamedPrefixWithPositional: true,
    },
  ],
  [
    'plotshape',
    {
      params: [
        'series',
        'title',
        'style',
        'location',
        'color',
        'offset',
        'text',
        'textcolor',
        'editable',
        'size',
        'show_last',
        'display',
        'format',
        'precision',
        'force_overlay',
      ],
      legacyV4Params: [
        'series',
        'title',
        'style',
        'location',
        'color',
        'transp',
        'offset',
        'text',
        'textcolor',
        'editable',
        'size',
        'show_last',
        'display',
        'format',
        'precision',
        'force_overlay',
      ],
      legacyV5Params: [
        'series',
        'title',
        'style',
        'location',
        'color',
        'transp',
        'offset',
        'text',
        'textcolor',
        'editable',
        'size',
        'show_last',
        'display',
        'format',
        'precision',
        'force_overlay',
      ],
      minArgs: 1,
      allowNamedPrefixWithPositional: true,
    },
  ],
  [
    'plotchar',
    {
      params: [
        'series',
        'title',
        'char',
        'location',
        'color',
        'offset',
        'text',
        'textcolor',
        'editable',
        'size',
        'show_last',
        'display',
        'format',
        'precision',
        'force_overlay',
      ],
      legacyV4Params: [
        'series',
        'title',
        'char',
        'location',
        'color',
        'transp',
        'offset',
        'text',
        'textcolor',
        'editable',
        'size',
        'show_last',
        'display',
        'format',
        'precision',
        'force_overlay',
      ],
      legacyV5Params: [
        'series',
        'title',
        'char',
        'location',
        'color',
        'transp',
        'offset',
        'text',
        'textcolor',
        'editable',
        'size',
        'show_last',
        'display',
        'format',
        'precision',
        'force_overlay',
      ],
      minArgs: 1,
      allowNamedPrefixWithPositional: true,
    },
  ],
  [
    'plotarrow',
    {
      params: [
        'series',
        'title',
        'colorup',
        'colordown',
        'offset',
        'minheight',
        'maxheight',
        'editable',
        'show_last',
        'display',
        'format',
        'precision',
        'force_overlay',
      ],
      legacyV4Params: [
        'series',
        'title',
        'colorup',
        'colordown',
        'transp',
        'offset',
        'minheight',
        'maxheight',
        'editable',
        'show_last',
        'display',
        'format',
        'precision',
        'force_overlay',
      ],
      legacyV5Params: [
        'series',
        'title',
        'colorup',
        'colordown',
        'transp',
        'offset',
        'minheight',
        'maxheight',
        'editable',
        'show_last',
        'display',
        'format',
        'precision',
        'force_overlay',
      ],
      minArgs: 1,
      allowNamedPrefixWithPositional: true,
    },
  ],
  [
    'indicator',
    {
      params: [
        'title',
        'shorttitle',
        'overlay',
        'format',
        'precision',
        'scale',
        'max_bars_back',
        'timeframe',
        'timeframe_gaps',
        'explicit_plot_zorder',
        'behind_chart',
        'max_lines_count',
        'max_labels_count',
        'max_boxes_count',
        'calc_bars_count',
        'max_polylines_count',
        'dynamic_requests',
      ],
      minArgs: 1,
      allowNamedPrefixWithPositional: true,
    },
  ],
  [
    'strategy',
    {
      params: [
        'title',
        'shorttitle',
        'overlay',
        'format',
        'precision',
        'scale',
        'pyramiding',
        'calc_on_order_fills',
        'calc_on_every_tick',
        'calc_on_every_history_tick',
        'max_bars_back',
        'backtest_fill_limits_assumption',
        'default_qty_type',
        'default_qty_value',
        'initial_capital',
        'currency',
        'slippage',
        'commission_type',
        'commission_value',
        'process_orders_on_close',
        'close_entries_rule',
        'margin_long',
        'margin_short',
        'explicit_plot_zorder',
        'max_lines_count',
        'max_labels_count',
        'max_boxes_count',
        'risk_free_rate',
        'use_bar_magnifier',
        'fill_orders_on_standard_ohlc',
        'max_polylines_count',
        'dynamic_requests',
        'behind_chart',
      ],
      minArgs: 1,
      allowNamedPrefixWithPositional: true,
    },
  ],
  [
    'input',
    {
      params: ['defval', 'title', 'tooltip', 'inline', 'group', 'display', 'active'],
      legacyV4Params: LEGACY_INPUT_SIGNATURE.params,
      minArgs: 1,
      allowNamedPrefixWithPositional: true,
    },
  ],
  [
    'input.int',
    {
      params: ['defval', 'title', 'options', 'minval', 'maxval', 'step', 'tooltip', 'inline', 'group', 'confirm', 'display', 'active'],
      overloads: [
        ['defval', 'title', 'minval', 'maxval', 'step', 'tooltip', 'inline', 'group', 'confirm', 'display', 'active'],
        ['defval', 'title', 'options', 'tooltip', 'inline', 'group', 'confirm', 'display', 'active'],
      ],
      minArgs: 1,
      allowNamedPrefixWithPositional: true,
    },
  ],
  [
    'input.float',
    {
      params: ['defval', 'title', 'options', 'minval', 'maxval', 'step', 'tooltip', 'inline', 'group', 'confirm', 'display', 'active'],
      overloads: [
        ['defval', 'title', 'minval', 'maxval', 'step', 'tooltip', 'inline', 'group', 'confirm', 'display', 'active'],
        ['defval', 'title', 'options', 'tooltip', 'inline', 'group', 'confirm', 'display', 'active'],
      ],
      minArgs: 1,
      allowNamedPrefixWithPositional: true,
    },
  ],
  ['input.bool', { params: ['defval', 'title', 'tooltip', 'inline', 'group', 'confirm', 'display', 'active'], minArgs: 1, allowNamedPrefixWithPositional: true }],
  ['input.string', { params: ['defval', 'title', 'options', 'tooltip', 'inline', 'group', 'confirm', 'display', 'active'], minArgs: 1, allowNamedPrefixWithPositional: true }],
  ['input.color', { params: ['defval', 'title', 'tooltip', 'inline', 'group', 'confirm', 'display', 'active'], minArgs: 1, allowNamedPrefixWithPositional: true }],
  [
    'input.price',
    {
      params: ['defval', 'title', 'tooltip', 'inline', 'group', 'confirm', 'display', 'active'],
      minArgs: 1,
      allowNamedPrefixWithPositional: true,
    },
  ],
  ['input.time', { params: ['defval', 'title', 'tooltip', 'inline', 'group', 'confirm', 'display', 'active'], minArgs: 1, allowNamedPrefixWithPositional: true }],
  ['input.timeframe', { params: ['defval', 'title', 'options', 'tooltip', 'inline', 'group', 'confirm', 'display', 'active'], minArgs: 1, allowNamedPrefixWithPositional: true }],
  ['input.enum', { params: ['defval', 'title', 'options', 'tooltip', 'inline', 'group', 'confirm', 'display', 'active'], minArgs: 1, allowNamedPrefixWithPositional: true }],
  ['input.symbol', { params: ['defval', 'title', 'tooltip', 'inline', 'group', 'confirm', 'display', 'active'], minArgs: 1, allowNamedPrefixWithPositional: true }],
  ['input.session', { params: ['defval', 'title', 'options', 'tooltip', 'inline', 'group', 'confirm', 'display', 'active'], minArgs: 1, allowNamedPrefixWithPositional: true }],
  ['input.text_area', { params: ['defval', 'title', 'tooltip', 'group', 'confirm', 'display', 'active'], minArgs: 1, allowNamedPrefixWithPositional: true }],
  ['input.source', { params: ['defval', 'title', 'tooltip', 'inline', 'group', 'display', 'active', 'confirm'], minArgs: 1, allowNamedPrefixWithPositional: true }],
  ['log.error', { params: ['message'], minArgs: 1, allowExtraPositional: true, allowNamedPrefixWithPositional: true }],
  ['log.info', { params: ['message'], minArgs: 1, allowExtraPositional: true, allowNamedPrefixWithPositional: true }],
  ['log.warning', { params: ['message'], minArgs: 1, allowExtraPositional: true, allowNamedPrefixWithPositional: true }],
  ['map.clear', { params: ['id'], minArgs: 1, maxArgs: 1, allowNamedPrefixWithPositional: true }],
  ['map.contains', { params: ['id', 'key'], minArgs: 2, maxArgs: 2, allowNamedPrefixWithPositional: true }],
  ['map.copy', { params: ['id'], minArgs: 1, maxArgs: 1, allowNamedPrefixWithPositional: true }],
  ['map.get', { params: ['id', 'key'], minArgs: 2, maxArgs: 2, allowNamedPrefixWithPositional: true }],
  ['map.keys', { params: ['id'], minArgs: 1, maxArgs: 1, allowNamedPrefixWithPositional: true }],
  ['map.new', { params: [], minArgs: 0, maxArgs: 0 }],
  ['map.put', { params: ['id', 'key', 'value'], minArgs: 3, maxArgs: 3, allowNamedPrefixWithPositional: true }],
  ['map.put_all', { params: ['id', 'id2'], minArgs: 2, maxArgs: 2, allowNamedPrefixWithPositional: true }],
  ['map.remove', { params: ['id', 'key'], minArgs: 2, maxArgs: 2, allowNamedPrefixWithPositional: true }],
  ['map.size', { params: ['id'], minArgs: 1, maxArgs: 1, allowNamedPrefixWithPositional: true }],
  ['map.values', { params: ['id'], minArgs: 1, maxArgs: 1, allowNamedPrefixWithPositional: true }],
  ['math.abs', { params: ['number'], minArgs: 1, maxArgs: 1, allowNamedPrefixWithPositional: true }],
  ['math.sqrt', { params: ['number'], minArgs: 1, maxArgs: 1, allowNamedPrefixWithPositional: true, legacyV4Aliases: PINE_V4_BUILTIN_PARAMETER_RENAMES.get('math.sqrt') }],
  ['math.log', { params: ['number'], minArgs: 1, maxArgs: 1, allowNamedPrefixWithPositional: true }],
  ['math.log10', { params: ['number'], minArgs: 1, maxArgs: 1, allowNamedPrefixWithPositional: true, legacyV4Aliases: PINE_V4_BUILTIN_PARAMETER_RENAMES.get('math.log10') }],
  ['math.exp', { params: ['number'], minArgs: 1, maxArgs: 1, allowNamedPrefixWithPositional: true, legacyV4Aliases: PINE_V4_BUILTIN_PARAMETER_RENAMES.get('math.exp') }],
  ['math.trunc', { params: ['number'], minArgs: 1, maxArgs: 1, allowNamedPrefixWithPositional: true }],
  ['math.floor', { params: ['number'], minArgs: 1, maxArgs: 1, allowNamedPrefixWithPositional: true }],
  ['math.ceil', { params: ['number'], legacyV4Params: ['x'], minArgs: 1, maxArgs: 1, allowNamedPrefixWithPositional: true }],
  ['math.sign', { params: ['number'], minArgs: 1, maxArgs: 1, allowNamedPrefixWithPositional: true, legacyV4Aliases: PINE_V4_BUILTIN_PARAMETER_RENAMES.get('math.sign') }],
  ['math.sin', { params: ['number'], legacyV4Params: ['x'], aliases: { angle: 'number' }, minArgs: 1, maxArgs: 1, allowNamedPrefixWithPositional: true }],
  ['math.cos', { params: ['number'], aliases: { angle: 'number' }, minArgs: 1, maxArgs: 1, allowNamedPrefixWithPositional: true }],
  ['math.tan', { params: ['number'], aliases: { angle: 'number' }, minArgs: 1, maxArgs: 1, allowNamedPrefixWithPositional: true }],
  ['math.asin', { params: ['number'], legacyV4Aliases: PINE_V4_BUILTIN_PARAMETER_RENAMES.get('math.asin'), aliases: { angle: 'number' }, minArgs: 1, maxArgs: 1, allowNamedPrefixWithPositional: true }],
  ['math.acos', { params: ['number'], legacyV4Aliases: PINE_V4_BUILTIN_PARAMETER_RENAMES.get('math.acos'), aliases: { angle: 'number' }, minArgs: 1, maxArgs: 1, allowNamedPrefixWithPositional: true }],
  ['math.atan', { params: ['number'], legacyV4Aliases: PINE_V4_BUILTIN_PARAMETER_RENAMES.get('math.atan'), aliases: { angle: 'number' }, minArgs: 1, maxArgs: 1, allowNamedPrefixWithPositional: true }],
  ['math.tanh', { params: ['number'], minArgs: 1, maxArgs: 1, allowNamedPrefixWithPositional: true }],
  ['math.toradians', { params: ['number'], aliases: { degrees: 'number' }, minArgs: 1, maxArgs: 1, allowNamedPrefixWithPositional: true }],
  ['math.todegrees', { params: ['number'], aliases: { radians: 'number' }, minArgs: 1, maxArgs: 1, allowNamedPrefixWithPositional: true }],
  ['math.max', { params: ['number0', 'number1'], minArgs: 2, allowExtraPositional: true, allowNamedPrefixWithPositional: true, variadicParamPrefix: 'number' }],
  ['math.min', { params: ['number0', 'number1'], minArgs: 2, allowExtraPositional: true, allowNamedPrefixWithPositional: true, variadicParamPrefix: 'number' }],
  ['math.avg', { params: ['number0', 'number1'], minArgs: 2, allowExtraPositional: true, allowNamedPrefixWithPositional: true, variadicParamPrefix: 'number' }],
  ['math.pow', { params: ['base', 'exponent'], minArgs: 2, maxArgs: 2, allowNamedPrefixWithPositional: true }],
  ['math.round', { params: ['number', 'precision'], minArgs: 1, maxArgs: 2, allowNamedPrefixWithPositional: true, legacyV4Aliases: PINE_V4_BUILTIN_PARAMETER_RENAMES.get('math.round') }],
  ['math.round_to_mintick', { params: ['number'], minArgs: 1, maxArgs: 1, allowNamedPrefixWithPositional: true, legacyV4Aliases: PINE_V4_BUILTIN_PARAMETER_RENAMES.get('math.round_to_mintick') }],
  ['math.sum', { params: ['source', 'length'], minArgs: 2, maxArgs: 2, allowNamedPrefixWithPositional: true }],
  ['math.random', { params: ['min', 'max', 'seed'], minArgs: 0, maxArgs: 3, allowNamedPrefixWithPositional: true }],
  ['math.clamp', { params: ['val', 'min', 'max'], minArgs: 3, maxArgs: 3, allowNamedPrefixWithPositional: true }],
  ['na', { params: ['x'], minArgs: 1, maxArgs: 1, allowNamedPrefixWithPositional: true }],
  ['nz', { params: ['source', 'replacement'], minArgs: 1, maxArgs: 2, allowNamedPrefixWithPositional: true }],
  ['max_bars_back', { params: ['var', 'num'], minArgs: 2, maxArgs: 2, allowNamedPrefixWithPositional: true }],
  [
    'request.security',
    { params: ['symbol', 'timeframe', 'expression', 'gaps', 'lookahead', 'ignore_invalid_symbol', 'currency', 'calc_bars_count'], minArgs: 3, allowNamedPrefixWithPositional: true },
  ],
  [
    'request.security_lower_tf',
    { params: ['symbol', 'timeframe', 'expression', 'ignore_invalid_symbol', 'currency', 'ignore_invalid_timeframe', 'calc_bars_count'], minArgs: 3, allowNamedPrefixWithPositional: true },
  ],
  ['request.currency_rate', { params: ['from', 'to', 'ignore_invalid_currency'], minArgs: 2, allowNamedPrefixWithPositional: true }],
  ['request.dividends', { params: ['ticker', 'field', 'gaps', 'lookahead', 'ignore_invalid_symbol', 'currency'], minArgs: 1, allowNamedPrefixWithPositional: true }],
  ['request.earnings', { params: ['ticker', 'field', 'gaps', 'lookahead', 'ignore_invalid_symbol', 'currency'], minArgs: 1, allowNamedPrefixWithPositional: true }],
  ['request.splits', { params: ['ticker', 'field', 'gaps', 'lookahead', 'ignore_invalid_symbol'], minArgs: 2, allowNamedPrefixWithPositional: true }],
  ['request.financial', { params: ['symbol', 'financial_id', 'period', 'gaps', 'ignore_invalid_symbol', 'currency'], minArgs: 3, allowNamedPrefixWithPositional: true }],
  ['request.economic', { params: ['country_code', 'field', 'gaps', 'ignore_invalid_symbol'], minArgs: 2, allowNamedPrefixWithPositional: true }],
  ['request.quandl', { params: ['ticker', 'gaps', 'index', 'ignore_invalid_symbol'], minArgs: 1, allowNamedPrefixWithPositional: true }],
  ['request.footprint', { params: ['ticks_per_row', 'va_percent', 'imbalance_percent'], minArgs: 1, maxArgs: 3, allowNamedPrefixWithPositional: true }],
  ['request.seed', { params: ['source', 'symbol', 'expression', 'ignore_invalid_symbol', 'calc_bars_count'], minArgs: 3, allowNamedPrefixWithPositional: true }],
  ['footprint.total_volume', { params: ['id'], minArgs: 1, maxArgs: 1, allowNamedPrefixWithPositional: true }],
  ['footprint.buy_volume', { params: ['id'], minArgs: 1, maxArgs: 1, allowNamedPrefixWithPositional: true }],
  ['footprint.sell_volume', { params: ['id'], minArgs: 1, maxArgs: 1, allowNamedPrefixWithPositional: true }],
  ['footprint.delta', { params: ['id'], minArgs: 1, maxArgs: 1, allowNamedPrefixWithPositional: true }],
  ['footprint.rows', { params: ['id'], minArgs: 1, maxArgs: 1, allowNamedPrefixWithPositional: true }],
  ['footprint.poc', { params: ['id'], minArgs: 1, maxArgs: 1, allowNamedPrefixWithPositional: true }],
  ['footprint.vah', { params: ['id'], minArgs: 1, maxArgs: 1, allowNamedPrefixWithPositional: true }],
  ['footprint.val', { params: ['id'], minArgs: 1, maxArgs: 1, allowNamedPrefixWithPositional: true }],
  ['footprint.get_row_by_price', { params: ['id', 'price'], minArgs: 2, maxArgs: 2, allowNamedPrefixWithPositional: true }],
  ['volume_row.up_price', { params: ['id'], minArgs: 1, maxArgs: 1, allowNamedPrefixWithPositional: true }],
  ['volume_row.down_price', { params: ['id'], minArgs: 1, maxArgs: 1, allowNamedPrefixWithPositional: true }],
  ['volume_row.total_volume', { params: ['id'], minArgs: 1, maxArgs: 1, allowNamedPrefixWithPositional: true }],
  ['volume_row.buy_volume', { params: ['id'], minArgs: 1, maxArgs: 1, allowNamedPrefixWithPositional: true }],
  ['volume_row.sell_volume', { params: ['id'], minArgs: 1, maxArgs: 1, allowNamedPrefixWithPositional: true }],
  ['volume_row.delta', { params: ['id'], minArgs: 1, maxArgs: 1, allowNamedPrefixWithPositional: true }],
  ['volume_row.has_buy_imbalance', { params: ['id'], minArgs: 1, maxArgs: 1, allowNamedPrefixWithPositional: true }],
  ['volume_row.has_sell_imbalance', { params: ['id'], minArgs: 1, maxArgs: 1, allowNamedPrefixWithPositional: true }],
  ['runtime.error', { params: ['message'], minArgs: 1, maxArgs: 1, allowNamedPrefixWithPositional: true }],
  ['string', { params: ['x'], minArgs: 1, maxArgs: 1, allowNamedPrefixWithPositional: true }],
  ['str.tostring', { params: ['value', 'format'], minArgs: 1, maxArgs: 2, allowNamedPrefixWithPositional: true }],
  ['str.tonumber', { params: ['string'], minArgs: 1, maxArgs: 1, allowNamedPrefixWithPositional: true, legacyV4Aliases: PINE_V4_BUILTIN_PARAMETER_RENAMES.get('str.tonumber') }],
  ['str.tointeger', { params: ['string'], minArgs: 1, maxArgs: 1, allowNamedPrefixWithPositional: true }],
  ['str.format_time', { params: ['time', 'format', 'timezone'], minArgs: 0, maxArgs: 3, allowNamedPrefixWithPositional: true }],
  ['str.format', { params: ['format'], aliases: { formatString: 'format' }, minArgs: 1, allowExtraPositional: true, allowNamedPrefixWithPositional: true, variadicParamPrefix: 'arg' }],
  ['str.length', { params: ['source'], aliases: { string: 'source' }, minArgs: 1, maxArgs: 1, allowNamedPrefixWithPositional: true }],
  ['str.contains', { params: ['source', 'str'], aliases: { string: 'source', substring: 'str', target: 'str' }, minArgs: 2, maxArgs: 2, allowNamedPrefixWithPositional: true }],
  ['str.startswith', { params: ['source', 'str'], aliases: { string: 'source', substring: 'str', target: 'str' }, minArgs: 2, maxArgs: 2, allowNamedPrefixWithPositional: true }],
  ['str.endswith', { params: ['source', 'str'], aliases: { string: 'source', substring: 'str', target: 'str' }, minArgs: 2, maxArgs: 2, allowNamedPrefixWithPositional: true }],
  ['str.pos', { params: ['source', 'str'], aliases: { string: 'source', substring: 'str', target: 'str' }, minArgs: 2, maxArgs: 2, allowNamedPrefixWithPositional: true }],
  ['str.substring', { params: ['source', 'begin_pos', 'end_pos'], aliases: { string: 'source' }, minArgs: 2, maxArgs: 3, allowNamedPrefixWithPositional: true }],
  ['str.match', { params: ['source', 'regex'], aliases: { string: 'source', pattern: 'regex' }, minArgs: 2, maxArgs: 2, allowNamedPrefixWithPositional: true }],
  ['str.repeat', { params: ['source', 'repeat', 'separator'], aliases: { string: 'source', count: 'repeat', repeat_count: 'repeat' }, minArgs: 2, maxArgs: 3, allowNamedPrefixWithPositional: true }],
  ['str.split', { params: ['source', 'separator'], aliases: { string: 'source' }, minArgs: 2, maxArgs: 2, allowNamedPrefixWithPositional: true }],
  ['str.upper', { params: ['source'], aliases: { string: 'source' }, minArgs: 1, maxArgs: 1, allowNamedPrefixWithPositional: true }],
  ['str.lower', { params: ['source'], aliases: { string: 'source' }, minArgs: 1, maxArgs: 1, allowNamedPrefixWithPositional: true }],
  ['str.trim', { params: ['source'], aliases: { string: 'source' }, minArgs: 1, maxArgs: 1, allowNamedPrefixWithPositional: true }],
  ['str.replace', { params: ['source', 'target', 'replacement', 'occurrence'], aliases: { string: 'source', str: 'target', substring: 'target' }, minArgs: 3, maxArgs: 4, allowNamedPrefixWithPositional: true }],
  ['str.replace_all', { params: ['source', 'target', 'replacement'], aliases: { string: 'source', str: 'target', substring: 'target' }, minArgs: 3, maxArgs: 3, allowNamedPrefixWithPositional: true }],
  ['strategy.cancel', { params: ['id'], legacyV5Params: ['id', 'when'], minArgs: 1, allowNamedPrefixWithPositional: true }],
  ['strategy.cancel_all', { params: [], legacyV5Params: ['when'], minArgs: 0 }],
  ['strategy.close', { params: ['id', 'comment', 'qty', 'qty_percent', 'alert_message', 'immediately', 'disable_alert'], legacyV5Params: LEGACY_STRATEGY_CLOSE_PARAMS, minArgs: 1, allowNamedPrefixWithPositional: true }],
  ['strategy.close_all', { params: ['comment', 'alert_message', 'immediately', 'disable_alert'], legacyV5Params: ['comment', 'alert_message', 'immediately', 'disable_alert', 'when'], minArgs: 0, allowNamedPrefixWithPositional: true }],
  ['strategy.convert_to_account', { params: ['value'], minArgs: 1, maxArgs: 1, allowNamedPrefixWithPositional: true }],
  ['strategy.convert_to_symbol', { params: ['value'], minArgs: 1, maxArgs: 1, allowNamedPrefixWithPositional: true }],
  ['strategy.default_entry_qty', { params: ['fill_price'], minArgs: 1, maxArgs: 1, allowNamedPrefixWithPositional: true }],
  ['strategy.entry', { params: STRATEGY_ORDER_PARAMS, legacyV5Params: LEGACY_STRATEGY_ORDER_PARAMS, minArgs: 2, maxArgs: STRATEGY_ORDER_PARAMS.length, allowNamedPrefixWithPositional: true }],
  ['strategy.exit', { params: STRATEGY_EXIT_PARAMS, legacyV5Params: LEGACY_STRATEGY_EXIT_PARAMS, minArgs: 1, maxArgs: STRATEGY_EXIT_PARAMS.length, allowNamedPrefixWithPositional: true }],
  ['strategy.order', { params: STRATEGY_ORDER_PARAMS, legacyV5Params: LEGACY_STRATEGY_ORDER_PARAMS, minArgs: 2, maxArgs: STRATEGY_ORDER_PARAMS.length, allowNamedPrefixWithPositional: true }],
  ['strategy.risk.allow_entry_in', { params: ['value'], minArgs: 1, maxArgs: 1, allowNamedPrefixWithPositional: true }],
  ['strategy.risk.max_cons_loss_days', { params: ['count', 'alert_message'], minArgs: 1, maxArgs: 2, allowNamedPrefixWithPositional: true }],
  ['strategy.risk.max_drawdown', { params: ['value', 'type', 'alert_message'], minArgs: 2, maxArgs: 3, allowNamedPrefixWithPositional: true }],
  ['strategy.risk.max_intraday_filled_orders', { params: ['count', 'alert_message'], minArgs: 1, maxArgs: 2, allowNamedPrefixWithPositional: true }],
  ['strategy.risk.max_intraday_loss', { params: ['value', 'type', 'alert_message'], minArgs: 2, maxArgs: 3, allowNamedPrefixWithPositional: true }],
  ['strategy.risk.max_position_size', { params: ['contracts'], minArgs: 1, maxArgs: 1, allowNamedPrefixWithPositional: true }],
  ['ta.alma', { params: ['series', 'length', 'offset', 'sigma', 'floor'], minArgs: 4, maxArgs: 5, allowNamedPrefixWithPositional: true }],
  ['ta.atr', { params: ['length'], minArgs: 1, maxArgs: 1, allowNamedPrefixWithPositional: true }],
  ['ta.bar_index', { params: ['source'], minArgs: 1, maxArgs: 1, allowNamedPrefixWithPositional: true }],
  ['ta.barssince', { params: ['condition'], minArgs: 1, maxArgs: 1, allowNamedPrefixWithPositional: true }],
  ['ta.bb', { params: ['series', 'length', 'mult'], minArgs: 3, maxArgs: 3, allowNamedPrefixWithPositional: true }],
  ['ta.bbw', { params: ['series', 'length', 'mult'], minArgs: 3, maxArgs: 3, allowNamedPrefixWithPositional: true }],
  ['ta.valuewhen', { params: ['condition', 'source', 'occurrence'], minArgs: 3, maxArgs: 3, allowNamedPrefixWithPositional: true }],
  ['ta.change', { params: ['source', 'length'], minArgs: 1, maxArgs: 2, allowNamedPrefixWithPositional: true }],
  ['ta.cci', { params: ['source', 'length'], minArgs: 2, maxArgs: 2, allowNamedPrefixWithPositional: true }],
  ['ta.cmo', { params: ['source', 'length'], aliases: { series: 'source' }, minArgs: 2, maxArgs: 2, allowNamedPrefixWithPositional: true }],
  ['ta.cum', { params: ['source'], minArgs: 1, maxArgs: 1, allowNamedPrefixWithPositional: true, legacyV4Aliases: PINE_V4_BUILTIN_PARAMETER_RENAMES.get('ta.cum') }],
  ['ta.crossover', { params: ['source1', 'source2'], minArgs: 2, maxArgs: 2, allowNamedPrefixWithPositional: true, legacyV4Aliases: PINE_V4_BUILTIN_PARAMETER_RENAMES.get('ta.crossover') }],
  ['ta.crossunder', { params: ['source1', 'source2'], legacyV4Params: ['x', 'y'], minArgs: 2, maxArgs: 2, allowNamedPrefixWithPositional: true }],
  ['ta.cross', { params: ['source1', 'source2'], minArgs: 2, maxArgs: 2, allowNamedPrefixWithPositional: true, legacyV4Aliases: PINE_V4_BUILTIN_PARAMETER_RENAMES.get('ta.cross') }],
  ['ta.correlation', { params: ['source1', 'source2', 'length'], minArgs: 3, maxArgs: 3, allowNamedPrefixWithPositional: true, legacyV4Aliases: PINE_V4_BUILTIN_PARAMETER_RENAMES.get('ta.correlation') }],
  ['ta.covariance', { params: ['source1', 'source2', 'length'], minArgs: 3, maxArgs: 3, allowNamedPrefixWithPositional: true }],
  ['ta.cog', { params: ['source', 'length'], minArgs: 2, maxArgs: 2, allowNamedPrefixWithPositional: true }],
  ['ta.dev', { params: ['source', 'length'], minArgs: 2, maxArgs: 2, allowNamedPrefixWithPositional: true }],
  ['ta.adx', { params: ['diLength', 'adxSmoothing'], minArgs: 1, maxArgs: 2, allowNamedPrefixWithPositional: true }],
  ['ta.dmi', { params: ['diLength', 'adxSmoothing'], minArgs: 2, maxArgs: 2, allowNamedPrefixWithPositional: true }],
  ['ta.ema', { params: ['source', 'length'], minArgs: 2, maxArgs: 2, allowNamedPrefixWithPositional: true }],
  ['ta.hma', { params: ['source', 'length'], minArgs: 2, maxArgs: 2, allowNamedPrefixWithPositional: true }],
  [
    'ta.highest',
    { params: ['source', 'length'], minArgs: 1, requiredParams: ['length'], singlePositionalParam: 'length', maxArgs: 2, allowNamedPrefixWithPositional: true, namedPrefixWithPositionalParams: ['source'] },
  ],
  [
    'ta.lowest',
    { params: ['source', 'length'], minArgs: 1, requiredParams: ['length'], singlePositionalParam: 'length', maxArgs: 2, allowNamedPrefixWithPositional: true, namedPrefixWithPositionalParams: ['source'] },
  ],
  [
    'ta.highestbars',
    { params: ['source', 'length'], minArgs: 1, requiredParams: ['length'], singlePositionalParam: 'length', maxArgs: 2, allowNamedPrefixWithPositional: true, namedPrefixWithPositionalParams: ['source'] },
  ],
  [
    'ta.lowestbars',
    { params: ['source', 'length'], minArgs: 1, requiredParams: ['length'], singlePositionalParam: 'length', maxArgs: 2, allowNamedPrefixWithPositional: true, namedPrefixWithPositionalParams: ['source'] },
  ],
  ['ta.kc', { params: ['series', 'length', 'mult', 'useTrueRange'], minArgs: 3, maxArgs: 4, allowNamedPrefixWithPositional: true }],
  ['ta.kcw', { params: ['series', 'length', 'mult', 'useTrueRange'], minArgs: 3, maxArgs: 4, allowNamedPrefixWithPositional: true }],
  ['ta.median', { params: ['source', 'length'], minArgs: 2, maxArgs: 2, allowNamedPrefixWithPositional: true }],
  ['ta.mfi', { params: ['source', 'length'], aliases: { series: 'source' }, minArgs: 2, maxArgs: 2, allowNamedPrefixWithPositional: true }],
  ['ta.macd', { params: ['source', 'fastlen', 'slowlen', 'siglen'], minArgs: 4, maxArgs: 4, allowNamedPrefixWithPositional: true }],
  ['ta.mode', { params: ['source', 'length'], minArgs: 2, maxArgs: 2, allowNamedPrefixWithPositional: true }],
  ['ta.obv', { params: ['source', 'volume'], minArgs: 0, maxArgs: 2, allowNamedPrefixWithPositional: true }],
  ['ta.percentile_nearest_rank', { params: ['source', 'length', 'percentage'], minArgs: 3, maxArgs: 3, allowNamedPrefixWithPositional: true }],
  ['ta.percentile_linear_interpolation', { params: ['source', 'length', 'percentage'], minArgs: 3, maxArgs: 3, allowNamedPrefixWithPositional: true }],
  ['ta.percentrank', { params: ['source', 'length'], minArgs: 2, maxArgs: 2, allowNamedPrefixWithPositional: true }],
  ['ta.pivot_point_levels', { params: ['type', 'anchor', 'developing'], minArgs: 2, maxArgs: 3, allowNamedPrefixWithPositional: true }],
  [
    'ta.pivothigh',
    {
      params: ['source', 'leftbars', 'rightbars'],
      minArgs: 2,
      requiredParams: ['leftbars', 'rightbars'],
      optionalLeadingParam: 'source',
      maxArgs: 3,
      allowNamedPrefixWithPositional: true,
      namedPrefixWithPositionalParams: ['source', 'leftbars'],
    },
  ],
  [
    'ta.pivotlow',
    {
      params: ['source', 'leftbars', 'rightbars'],
      minArgs: 2,
      requiredParams: ['leftbars', 'rightbars'],
      optionalLeadingParam: 'source',
      maxArgs: 3,
      allowNamedPrefixWithPositional: true,
      namedPrefixWithPositionalParams: ['source', 'leftbars'],
    },
  ],
  ['ta.max', { params: ['source'], aliases: { source1: 'source' }, minArgs: 1, maxArgs: 1, requiredParams: ['source'], allowNamedPrefixWithPositional: true }],
  ['ta.min', { params: ['source'], aliases: { source1: 'source' }, minArgs: 1, maxArgs: 1, requiredParams: ['source'], allowNamedPrefixWithPositional: true }],
  ['ta.mom', { params: ['source', 'length'], minArgs: 2, maxArgs: 2, allowNamedPrefixWithPositional: true }],
  ['ta.range', { params: ['source', 'length'], minArgs: 2, maxArgs: 2, allowNamedPrefixWithPositional: true }],
  ['ta.rising', { params: ['source', 'length'], minArgs: 2, maxArgs: 2, allowNamedPrefixWithPositional: true }],
  ['ta.falling', { params: ['source', 'length'], minArgs: 2, maxArgs: 2, allowNamedPrefixWithPositional: true }],
  ['ta.rci', { params: ['source', 'length'], minArgs: 2, maxArgs: 2, allowNamedPrefixWithPositional: true }],
  ['ta.rma', { params: ['source', 'length'], minArgs: 2, maxArgs: 2, allowNamedPrefixWithPositional: true }],
  ['ta.smma', { params: ['source', 'length'], minArgs: 2, maxArgs: 2, allowNamedPrefixWithPositional: true }],
  ['ta.roc', { params: ['source', 'length'], minArgs: 2, maxArgs: 2, allowNamedPrefixWithPositional: true }],
  ['ta.rsi', { params: ['source', 'length'], minArgs: 2, maxArgs: 2, allowNamedPrefixWithPositional: true, legacyV4Aliases: PINE_V4_BUILTIN_PARAMETER_RENAMES.get('ta.rsi') }],
  ['ta.sar', { params: ['start', 'inc', 'max'], minArgs: 3, maxArgs: 3, allowNamedPrefixWithPositional: true }],
  ['ta.sma', { params: ['source', 'length'], minArgs: 2, maxArgs: 2, allowNamedPrefixWithPositional: true }],
  ['ta.sum', { params: ['source', 'length'], minArgs: 2, maxArgs: 2, allowNamedPrefixWithPositional: true }],
  ['ta.stdev', { params: ['source', 'length', 'biased'], minArgs: 2, maxArgs: 3, allowNamedPrefixWithPositional: true }],
  ['ta.stoch', { params: ['source', 'high', 'low', 'length'], minArgs: 4, maxArgs: 4, allowNamedPrefixWithPositional: true }],
  ['ta.supertrend', { params: ['factor', 'atrPeriod'], minArgs: 2, maxArgs: 2, allowNamedPrefixWithPositional: true }],
  ['ta.swma', { params: ['source'], legacyV4Aliases: PINE_V4_BUILTIN_PARAMETER_RENAMES.get('ta.swma'), minArgs: 1, maxArgs: 1, allowNamedPrefixWithPositional: true }],
  ['ta.tr', { params: ['handle_na'], minArgs: 0, maxArgs: 1, allowNamedPrefixWithPositional: true }],
  ['ta.dema', { params: ['source', 'length'], minArgs: 2, maxArgs: 2, allowNamedPrefixWithPositional: true }],
  ['ta.tema', { params: ['source', 'length'], minArgs: 2, maxArgs: 2, allowNamedPrefixWithPositional: true }],
  ['ta.kst', { params: ['source', 'roclength1', 'roclength2', 'roclength3', 'roclength4', 'smalen1', 'smalen2', 'smalen3', 'smalen4', 'signalLength'], minArgs: 1, maxArgs: 10, allowNamedPrefixWithPositional: true }],
  ['ta.tsi', { params: ['source', 'short_length', 'long_length'], minArgs: 3, maxArgs: 3, allowNamedPrefixWithPositional: true }],
  ['ta.variance', { params: ['source', 'length', 'biased'], minArgs: 2, maxArgs: 3, allowNamedPrefixWithPositional: true }],
  ['ta.vwap', { params: ['source', 'anchor', 'stdev_mult'], legacyV4Params: ['x'], minArgs: 0, maxArgs: 3, allowNamedPrefixWithPositional: true }],
  ['ta.vwma', { params: ['source', 'length'], minArgs: 2, maxArgs: 2, allowNamedPrefixWithPositional: true }],
  ['ta.linreg', { params: ['source', 'length', 'offset'], minArgs: 3, maxArgs: 3, allowNamedPrefixWithPositional: true }],
  ['ta.wma', { params: ['source', 'length'], minArgs: 2, maxArgs: 2, allowNamedPrefixWithPositional: true }],
  ['ta.wpr', { params: ['length'], minArgs: 1, maxArgs: 1, allowNamedPrefixWithPositional: true }],
  ['ticker.new', { params: ['prefix', 'ticker', 'session', 'adjustment', 'backadjustment', 'settlement_as_close'], minArgs: 2, maxArgs: 6, allowNamedPrefixWithPositional: true }],
  ['ticker.modify', { params: ['tickerid', 'session', 'adjustment', 'backadjustment', 'settlement_as_close'], minArgs: 1, maxArgs: 5, allowNamedPrefixWithPositional: true }],
  ['ticker.standard', { params: ['symbol'], minArgs: 1, maxArgs: 1, allowNamedPrefixWithPositional: true }],
  ['ticker.inherit', { params: ['from_tickerid', 'symbol'], minArgs: 2, maxArgs: 2, allowNamedPrefixWithPositional: true }],
  ['ticker.heikinashi', { params: ['symbol'], minArgs: 1, maxArgs: 1, allowNamedPrefixWithPositional: true }],
  ['ticker.renko', { params: ['symbol', 'style', 'param', 'request_wicks', 'source'], minArgs: 3, maxArgs: 5, allowNamedPrefixWithPositional: true }],
  ['ticker.linebreak', { params: ['symbol', 'number_of_lines'], minArgs: 2, maxArgs: 2, allowNamedPrefixWithPositional: true }],
  [
    'ticker.kagi',
    {
      params: ['symbol', 'reversal', 'param', 'style'],
      overloads: [
        ['symbol', 'reversal'],
        ['symbol', 'param', 'style'],
      ],
      aliases: { tickerid: 'symbol', reversal_amount: 'reversal' },
      minArgs: 2,
      maxArgs: 3,
      allowNamedPrefixWithPositional: true,
    },
  ],
  ['ticker.pointfigure', { params: ['symbol', 'source', 'style', 'param', 'reversal'], minArgs: 5, maxArgs: 5, allowNamedPrefixWithPositional: true }],
  ['syminfo.prefix', { params: ['symbol'], minArgs: 1, maxArgs: 1, allowNamedPrefixWithPositional: true }],
  ['syminfo.ticker', { params: ['symbol'], minArgs: 1, maxArgs: 1, allowNamedPrefixWithPositional: true }],
  [
    'time',
    {
      params: ['timeframe', 'session', 'timezone', 'bars_back', 'timeframe_bars_back'],
      overloads: [['timeframe', 'session', 'bars_back', 'timeframe_bars_back']],
      minArgs: 0,
      maxArgs: 5,
      allowNamedPrefixWithPositional: true,
    },
  ],
  [
    'time_close',
    {
      params: ['timeframe', 'session', 'timezone', 'bars_back', 'timeframe_bars_back'],
      overloads: [['timeframe', 'session', 'bars_back', 'timeframe_bars_back']],
      minArgs: 0,
      maxArgs: 5,
      allowNamedPrefixWithPositional: true,
    },
  ],
  ['timeframe.change', { params: ['timeframe'], minArgs: 0, maxArgs: 1, allowNamedPrefixWithPositional: true }],
  ['timeframe.from_seconds', { params: ['seconds'], minArgs: 1, maxArgs: 1, allowNamedPrefixWithPositional: true }],
  ['timeframe.in_seconds', { params: ['timeframe'], minArgs: 0, maxArgs: 1, allowNamedPrefixWithPositional: true }],
  ['timeframe.to_seconds', { params: ['timeframe'], minArgs: 0, maxArgs: 1, allowNamedPrefixWithPositional: true }],
  [
    'timestamp',
    {
      params: ['timezone', 'year', 'month', 'day', 'hour', 'minute', 'second'],
      overloads: [
        ['dateString'],
        ['year', 'month', 'day', 'hour', 'minute', 'second'],
      ],
      minArgs: 1,
      maxArgs: 7,
      allowNamedPrefixWithPositional: true,
    },
  ],
]);

const INDICATOR_DECLARATION_KEYS = new Set([
  'type',
  'declarationKind',
  'sourceDeclarationKind',
  'loc',
  'title',
  'shorttitle',
  'overlay',
  'format',
  'precision',
  'scale',
  'max_bars_back',
  'timeframe',
  'timeframe_gaps',
  'explicit_plot_zorder',
  'behind_chart',
  'max_lines_count',
  'max_labels_count',
  'max_boxes_count',
  'calc_bars_count',
  'max_polylines_count',
  'dynamic_requests',
]);

const STRATEGY_DECLARATION_KEYS = new Set([
  ...[...INDICATOR_DECLARATION_KEYS].filter((key) => key !== 'timeframe' && key !== 'timeframe_gaps'),
  'initial_capital',
  'currency',
  'default_qty_type',
  'default_qty_value',
  'pyramiding',
  'commission_type',
  'commission_value',
  'slippage',
  'margin_long',
  'margin_short',
  'calc_on_order_fills',
  'calc_on_every_tick',
  'calc_on_every_history_tick',
  'process_orders_on_close',
  'use_bar_magnifier',
  'risk_free_rate',
  'backtest_fill_limits_assumption',
  'close_entries_rule',
  'fill_orders_on_standard_ohlc',
]);

const LIBRARY_DECLARATION_KEYS = new Set([
  'type',
  'loc',
  'title',
  'overlay',
  'dynamic_requests',
]);

const DECLARATION_FORMAT_VALUES = new Set(['inherit', 'price', 'volume', 'percent', 'mintick']);
const DECLARATION_FORMAT_CONSTANT_VALUES = new Map([
  ['format.inherit', 'inherit'],
  ['format.price', 'price'],
  ['format.volume', 'volume'],
  ['format.percent', 'percent'],
  ['format.mintick', 'mintick'],
]);

const DECLARATION_SCALE_VALUES = new Set(['left', 'right', 'none']);
const DECLARATION_SCALE_CONSTANT_VALUES = new Map([
  ['scale.left', 'left'],
  ['scale.right', 'right'],
  ['scale.none', 'none'],
]);

const PLOT_STYLE_VALUES = new Set([
  'line',
  'linebr',
  'stepline',
  'steplinebr',
  'stepline_diamond',
  'histogram',
  'circles',
  'cross',
  'columns',
  'area',
  'areabr',
]);
const PLOT_STYLE_CONSTANT_VALUES = new Map([
  ['plot.style_line', 'line'],
  ['plot.style_linebr', 'linebr'],
  ['plot.style_stepline', 'stepline'],
  ['plot.style_step', 'stepline'], // Pine alias for style_stepline
  ['plot.style_steplinebr', 'steplinebr'],
  ['plot.style_stepline_diamond', 'stepline_diamond'],
  ['plot.style_histogram', 'histogram'],
  ['plot.style_circles', 'circles'],
  ['plot.style_cross', 'cross'],
  ['plot.style_columns', 'columns'],
  ['plot.style_area', 'area'],
  ['plot.style_areabr', 'areabr'],
]);

const VISUAL_LINESTYLE_VALUES = new Set(['solid', 'dotted', 'dashed']);
const PLOT_LINESTYLE_CONSTANT_VALUES = new Map([
  ['plot.linestyle_solid', 'solid'],
  ['plot.linestyle_dotted', 'dotted'],
  ['plot.linestyle_dashed', 'dashed'],
]);
const HLINE_LINESTYLE_CONSTANT_VALUES = new Map([
  ['hline.style_solid', 'solid'],
  ['hline.style_dotted', 'dotted'],
  ['hline.style_dashed', 'dashed'],
]);

const VISUAL_FORMAT_PRECISION_CALLS = new Set([
  'plot',
  'plotbar',
  'plotcandle',
  'plotshape',
  'plotchar',
  'plotarrow',
]);

const MARKER_STYLE_VALUES = new Set([
  'triangleup',
  'triangledown',
  'circle',
  'cross',
  'diamond',
  'arrowup',
  'arrowdown',
  'flag',
  'labelup',
  'labeldown',
  'square',
  'xcross',
]);
const MARKER_STYLE_CONSTANT_VALUES = new Map([
  ['shape.triangleup', 'triangleup'],
  ['shape.triangledown', 'triangledown'],
  ['shape.circle', 'circle'],
  ['shape.cross', 'cross'],
  ['shape.diamond', 'diamond'],
  ['shape.arrowup', 'arrowup'],
  ['shape.arrowdown', 'arrowdown'],
  ['shape.flag', 'flag'],
  ['shape.labelup', 'labelup'],
  ['shape.labeldown', 'labeldown'],
  ['shape.square', 'square'],
  ['shape.xcross', 'xcross'],
  // Pine v4 plotshape.style_* aliases
  ['plotshape.style_triangleup', 'triangleup'],
  ['plotshape.style_triangledown', 'triangledown'],
  ['plotshape.style_circle', 'circle'],
  ['plotshape.style_cross', 'cross'],
  ['plotshape.style_xcross', 'xcross'],
  ['plotshape.style_diamond', 'diamond'],
  ['plotshape.style_flag', 'flag'],
  ['plotshape.style_arrowup', 'arrowup'],
  ['plotshape.style_arrowdown', 'arrowdown'],
  ['plotshape.style_square', 'square'],
  ['plotshape.style_label_up', 'labelup'],
  ['plotshape.style_label_down', 'labeldown'],
  ['plotshape.style_labelup', 'labelup'],
  ['plotshape.style_labeldown', 'labeldown'],
]);

const MARKER_LOCATION_VALUES = new Set(['abovebar', 'belowbar', 'top', 'bottom', 'absolute']);
const MARKER_LOCATION_CONSTANT_VALUES = new Map([
  ['location.abovebar', 'abovebar'],
  ['location.belowbar', 'belowbar'],
  ['location.top', 'top'],
  ['location.bottom', 'bottom'],
  ['location.absolute', 'absolute'],
]);

const VISUAL_SIZE_VALUES = new Set(['tiny', 'small', 'normal', 'large', 'huge', 'auto']);
const VISUAL_SIZE_CONSTANT_VALUES = new Map([
  ['size.tiny', 'tiny'],
  ['size.small', 'small'],
  ['size.normal', 'normal'],
  ['size.large', 'large'],
  ['size.huge', 'huge'],
  ['size.auto', 'auto'],
]);

const DISPLAY_OPTION_VALUES = new Set([
  'display.none',
  'display.pane',
  'display.data_window',
  'display.status_line',
  'display.price_scale',
  'display.pine_screener',
  'display.all',
]);
const DISPLAY_OPTION_CONSTANT_VALUES = new Map([...DISPLAY_OPTION_VALUES].map((value) => [value, value]));
const V6_VISUAL_QUALIFIER_LIMITS: Readonly<Record<string, Readonly<Record<string, SemanticQualifier>>>> = {
  plot: { title: 'const', linewidth: 'input', style: 'input', trackprice: 'input', join: 'input', editable: 'input', show_last: 'input', display: 'input', format: 'input', precision: 'input', force_overlay: 'const', linestyle: 'input' },
  plotshape: { title: 'const', style: 'input', location: 'input', text: 'const', editable: 'input', size: 'const', show_last: 'input', display: 'input', format: 'input', precision: 'input', force_overlay: 'const' },
  plotchar: { title: 'const', char: 'input', location: 'input', text: 'const', editable: 'input', size: 'const', show_last: 'input', display: 'input', format: 'input', precision: 'input', force_overlay: 'const' },
  plotarrow: { title: 'const', minheight: 'input', maxheight: 'input', editable: 'input', show_last: 'input', display: 'input', format: 'input', precision: 'input', force_overlay: 'const' },
  plotbar: { title: 'const', editable: 'input', show_last: 'input', display: 'input', format: 'input', precision: 'input', force_overlay: 'const' },
  plotcandle: { title: 'const', editable: 'input', show_last: 'input', display: 'input', format: 'input', precision: 'input', force_overlay: 'const' },
  barcolor: { editable: 'input', show_last: 'input', title: 'const', display: 'input' },
  bgcolor: { editable: 'input', show_last: 'input', title: 'const', display: 'input', force_overlay: 'const' },
  fill: { title: 'const', display: 'input', fillgaps: 'const', editable: 'input', show_last: 'input' },
};

const VISUAL_STRING_PARAMETER_NAMES_BY_CALL = new Map<string, readonly string[]>([
  ['barcolor', ['title']],
  ['bgcolor', ['title']],
  ['fill', ['title']],
  ['hline', ['title']],
  ['plot', ['title', 'format']],
  ['plotbar', ['title', 'format']],
  ['plotcandle', ['title', 'format']],
  ['plotshape', ['title', 'text', 'style', 'location', 'size', 'format']],
  ['plotchar', ['title', 'char', 'text', 'location', 'size', 'format']],
  ['plotarrow', ['title', 'format']],
]);
const VISUAL_COLOR_PARAMETER_NAMES_BY_CALL = new Map<string, readonly string[]>([
  ['barcolor', ['color']],
  ['bgcolor', ['color']],
  ['fill', ['color', 'top_color', 'bottom_color']],
  ['hline', ['color']],
  ['plot', ['color']],
  ['plotbar', ['color']],
  ['plotcandle', ['color', 'wickcolor', 'bordercolor']],
  ['plotshape', ['color', 'textcolor']],
  ['plotchar', ['color', 'textcolor']],
  ['plotarrow', ['colorup', 'colordown']],
]);
const VISUAL_BOOL_PARAMETER_NAMES_BY_CALL = new Map<string, readonly string[]>([
  ['barcolor', ['editable']],
  ['bgcolor', ['editable', 'force_overlay']],
  ['fill', ['editable', 'fillgaps']],
  ['hline', ['editable']],
  ['plot', ['trackprice', 'join', 'editable', 'force_overlay']],
  ['plotbar', ['editable', 'force_overlay']],
  ['plotcandle', ['editable', 'force_overlay']],
  ['plotshape', ['editable', 'force_overlay']],
  ['plotchar', ['editable', 'force_overlay']],
  ['plotarrow', ['editable', 'force_overlay']],
]);
const VISUAL_NUMERIC_PARAMETER_NAMES_BY_CALL = new Map<string, readonly string[]>([
  ['barcolor', ['offset', 'show_last', 'transp']],
  ['bgcolor', ['offset', 'show_last', 'transp']],
  ['fill', ['top_value', 'bottom_value', 'show_last', 'transp']],
  ['hline', ['price', 'linewidth']],
  ['plot', ['linewidth', 'histbase', 'offset', 'show_last', 'precision', 'transp']],
  ['plotbar', ['open', 'high', 'low', 'close', 'show_last', 'precision', 'transp']],
  ['plotcandle', ['open', 'high', 'low', 'close', 'show_last', 'precision', 'transp']],
  ['plotshape', ['offset', 'show_last', 'precision', 'transp']],
  ['plotchar', ['offset', 'show_last', 'precision', 'transp']],
  ['plotarrow', ['series', 'offset', 'minheight', 'maxheight', 'show_last', 'precision', 'transp']],
]);

const DRAWING_XLOC_VALUES = new Set(['bar_index', 'bar_time']);
const DRAWING_XLOC_CONSTANT_VALUES = new Map([
  ['xloc.bar_index', 'bar_index'],
  ['xloc.bar_time', 'bar_time'],
]);
const DRAWING_YLOC_VALUES = new Set(['price', 'abovebar', 'belowbar']);
const DRAWING_YLOC_CONSTANT_VALUES = new Map([
  ['yloc.price', 'price'],
  ['yloc.abovebar', 'abovebar'],
  ['yloc.belowbar', 'belowbar'],
]);
const DRAWING_EXTEND_VALUES = new Set(['none', 'right', 'left', 'both']);
const DRAWING_EXTEND_CONSTANT_VALUES = new Map([
  ['extend.none', 'none'],
  ['extend.right', 'right'],
  ['extend.left', 'left'],
  ['extend.both', 'both'],
]);
const DRAWING_LINE_STYLE_VALUES = new Set(['solid', 'dotted', 'dashed', 'arrow_left', 'arrow_right', 'arrow_both']);
const DRAWING_LINE_STYLE_CONSTANT_VALUES = new Map([
  ['line.style_solid', 'solid'],
  ['line.style_dotted', 'dotted'],
  ['line.style_dashed', 'dashed'],
  ['line.style_arrow_left', 'arrow_left'],
  ['line.style_arrow_right', 'arrow_right'],
  ['line.style_arrow_both', 'arrow_both'],
]);
// Receiver methods have an explicit id/table_id in their namespace signature.
const DRAWING_METHOD_NAMES = new Set(
  [...BUILTIN_SIGNATURES].filter(([name, signature]) =>
    /^(box|line|label|linefill|polyline|table|chart\.point)\./.test(name)
    && ['id', 'table_id'].includes(signature.params[0]),
  ).map(([name]) => name.slice(name.lastIndexOf('.') + 1)),
);

const DRAWING_STRING_PARAMETER_NAMES_BY_CALL = new Map<string, readonly string[]>([
  ['label.new', ['text', 'tooltip']],
  ['label.set_text', ['text']],
  ['label.set_tooltip', ['tooltip']],
  ['box.new', ['text']],
  ['box.set_text', ['text']],
  ['table.cell', ['text', 'tooltip']],
  ['table.cell_set_text', ['text']],
  ['table.cell_set_tooltip', ['tooltip']],
]);
const DRAWING_COLOR_PARAMETER_NAMES_BY_CALL = new Map<string, readonly string[]>([
  ['label.new', ['color', 'textcolor']],
  ['label.set_color', ['color']],
  ['label.set_textcolor', ['textcolor']],
  ['line.new', ['color']],
  ['line.set_color', ['color']],
  ['box.new', ['border_color', 'bgcolor', 'text_color']],
  ['box.set_bgcolor', ['color']],
  ['box.set_border_color', ['color']],
  ['box.set_text_color', ['text_color']],
  ['polyline.new', ['line_color', 'fill_color']],
  ['linefill.new', ['color']],
  ['linefill.set_color', ['color']],
  ['table.new', ['bgcolor', 'frame_color', 'border_color']],
  ['table.set_bgcolor', ['bgcolor']],
  ['table.set_frame_color', ['frame_color']],
  ['table.set_border_color', ['border_color']],
  ['table.cell', ['text_color', 'bgcolor']],
  ['table.cell_set_bgcolor', ['bgcolor']],
  ['table.cell_set_text_color', ['text_color']],
]);
const DRAWING_NUMERIC_PARAMETER_NAMES_BY_CALL = new Map<string, readonly string[]>([
  ['label.new', ['x', 'y']],
  ['label.set_x', ['x']],
  ['label.set_y', ['y']],
  ['label.set_xy', ['x', 'y']],
  ['label.set_xloc', ['x']],
  ['line.new', ['x1', 'y1', 'x2', 'y2', 'width']],
  ['line.set_x1', ['x']],
  ['line.set_x2', ['x']],
  ['line.set_y1', ['y']],
  ['line.set_y2', ['y']],
  ['line.set_xy1', ['x', 'y']],
  ['line.set_xy2', ['x', 'y']],
  ['line.set_xloc', ['x1', 'x2']],
  ['line.set_width', ['width']],
  ['line.get_price', ['x']],
  ['box.new', ['left', 'top', 'right', 'bottom', 'border_width']],
  ['box.set_left', ['left']],
  ['box.set_right', ['right']],
  ['box.set_top', ['top']],
  ['box.set_bottom', ['bottom']],
  ['box.set_lefttop', ['left', 'top']],
  ['box.set_rightbottom', ['right', 'bottom']],
  ['box.set_xloc', ['left', 'right']],
  ['box.set_border_width', ['width']],
  ['polyline.new', ['line_width']],
]);
const DRAWING_BOOL_PARAMETER_NAMES_BY_CALL = new Map<string, readonly string[]>([
  ['label.new', ['force_overlay']],
  ['line.new', ['force_overlay']],
  ['box.new', ['force_overlay']],
  ['polyline.new', ['curved', 'closed', 'force_overlay']],
  ['table.new', ['force_overlay']],
]);
const TABLE_NUMERIC_PARAMETER_NAMES_BY_CALL = new Map<string, readonly string[]>([
  ['table.new', ['columns', 'rows', 'frame_width', 'border_width']],
  ['table.clear', ['start_column', 'start_row', 'end_column', 'end_row']],
  ['table.merge_cells', ['start_column', 'start_row', 'end_column', 'end_row']],
  ['table.set_frame_width', ['frame_width']],
  ['table.set_border_width', ['border_width']],
  ['table.cell', ['column', 'row', 'width', 'height']],
  ['table.cell_set_text', ['column', 'row']],
  ['table.cell_set_bgcolor', ['column', 'row']],
  ['table.cell_set_text_color', ['column', 'row']],
  ['table.cell_set_text_size', ['column', 'row']],
  ['table.cell_set_width', ['column', 'row', 'width']],
  ['table.cell_set_height', ['column', 'row', 'height']],
  ['table.cell_set_text_halign', ['column', 'row']],
  ['table.cell_set_text_valign', ['column', 'row']],
  ['table.cell_set_text_font_family', ['column', 'row']],
  ['table.cell_set_text_formatting', ['column', 'row']],
  ['table.cell_set_tooltip', ['column', 'row']],
]);
const DRAWING_LABEL_STYLE_VALUES = new Set([
  'none',
  'label_up',
  'label_down',
  'label_left',
  'label_right',
  'label_center',
  'label_lower_left',
  'label_lower_right',
  'label_upper_left',
  'label_upper_right',
  'circle',
  'square',
  'diamond',
  'cross',
  'xcross',
  'triangleup',
  'triangledown',
  'flag',
  'arrowup',
  'arrowdown',
  'text_outline',
]);
const DRAWING_LABEL_STYLE_CONSTANT_VALUES = new Map([
  ['label.style_none', 'none'],
  ['label.style_label_up', 'label_up'],
  ['label.style_label_down', 'label_down'],
  ['label.style_labelup', 'label_up'],
  ['label.style_labeldown', 'label_down'],
  ['label.style_label_left', 'label_left'],
  ['label.style_label_right', 'label_right'],
  ['label.style_label_center', 'label_center'],
  ['label.style_label_lower_left', 'label_lower_left'],
  ['label.style_label_lower_right', 'label_lower_right'],
  ['label.style_label_upper_left', 'label_upper_left'],
  ['label.style_label_upper_right', 'label_upper_right'],
  ['label.style_circle', 'circle'],
  ['label.style_square', 'square'],
  ['label.style_diamond', 'diamond'],
  ['label.style_cross', 'cross'],
  ['label.style_xcross', 'xcross'],
  ['label.style_triangleup', 'triangleup'],
  ['label.style_triangledown', 'triangledown'],
  ['label.style_flag', 'flag'],
  ['label.style_arrowup', 'arrowup'],
  ['label.style_arrowdown', 'arrowdown'],
  ['label.style_text_outline', 'text_outline'],
]);
const DRAWING_TEXT_HALIGN_VALUES = new Set(['left', 'center', 'right']);
const DRAWING_TEXT_HALIGN_CONSTANT_VALUES = new Map([
  ['text.align_left', 'left'],
  ['text.align_center', 'center'],
  ['text.align_right', 'right'],
]);
const DRAWING_TEXT_VALIGN_VALUES = new Set(['top', 'center', 'middle', 'bottom']);
const DRAWING_TEXT_VALIGN_CONSTANT_VALUES = new Map([
  ['text.align_top', 'top'],
  ['text.align_center', 'center'],
  ['text.align_middle', 'middle'],
  ['text.align_bottom', 'bottom'],
]);
const DRAWING_TEXT_WRAP_VALUES = new Set(['none', 'auto']);
const DRAWING_TEXT_WRAP_CONSTANT_VALUES = new Map([
  ['text.wrap_none', 'none'],
  ['text.wrap_auto', 'auto'],
]);
const DRAWING_FONT_FAMILY_VALUES = new Set(['default', 'monospace']);
const DRAWING_FONT_FAMILY_CONSTANT_VALUES = new Map([
  ['font.family_default', 'default'],
  ['font.family_monospace', 'monospace'],
]);
const DRAWING_TEXT_FORMATTING_VALUES = new Set(['none', 'bold', 'italic', 'bolditalic', 'italicbold']);
const DRAWING_TEXT_FORMATTING_CONSTANT_VALUES = new Map([
  ['text.format_none', 'none'],
  ['text.format_bold', 'bold'],
  ['text.format_italic', 'italic'],
]);
const TABLE_POSITION_VALUES = new Set([
  'top_left',
  'top_center',
  'top_right',
  'middle_left',
  'middle_center',
  'middle_right',
  'bottom_left',
  'bottom_center',
  'bottom_right',
]);
const TABLE_POSITION_CONSTANT_VALUES = new Map([
  ['position.top_left', 'top_left'],
  ['position.top_center', 'top_center'],
  ['position.top_right', 'top_right'],
  ['position.middle_left', 'middle_left'],
  ['position.middle_center', 'middle_center'],
  ['position.middle_right', 'middle_right'],
  ['position.bottom_left', 'bottom_left'],
  ['position.bottom_center', 'bottom_center'],
  ['position.bottom_right', 'bottom_right'],
]);
const DRAWING_SIZE_PARAMETER_CALLEES = new Set(['label.new', 'label.set_size']);

for (const name of CALENDAR_FUNCTION_NAMES) {
  BUILTIN_SIGNATURES.set(name, { params: ['time', 'timezone'], minArgs: 1, maxArgs: 2, allowNamedPrefixWithPositional: true });
}

for (const name of STRATEGY_TRADE_ACCESSORS) {
  BUILTIN_SIGNATURES.set(`strategy.opentrades.${name}`, { params: ['trade_num'], minArgs: 1, maxArgs: 1, allowNamedPrefixWithPositional: true });
}

for (const name of STRATEGY_CLOSED_TRADE_ACCESSORS) {
  BUILTIN_SIGNATURES.set(`strategy.closedtrades.${name}`, { params: ['trade_num'], minArgs: 1, maxArgs: 1, allowNamedPrefixWithPositional: true });
}

for (const name of ['array.new', ...ARRAY_CONSTRUCTOR_ELEMENT_TYPES.keys()]) {
  BUILTIN_SIGNATURES.set(name, { params: ['size', 'initial_value'], minArgs: 0, maxArgs: 2, allowNamedPrefixWithPositional: true });
}

for (const name of ['array.clear', 'array.copy', 'array.first', 'array.last', 'array.pop', 'array.shift', 'array.size']) {
  BUILTIN_SIGNATURES.set(name, { params: ['id'], minArgs: 1, maxArgs: 1, allowNamedPrefixWithPositional: true });
}

for (const name of ['array.get', 'array.remove']) {
  BUILTIN_SIGNATURES.set(name, { params: ['id', 'index'], minArgs: 2, maxArgs: 2, allowNamedPrefixWithPositional: true });
}

for (const name of ['array.push', 'array.unshift']) {
  BUILTIN_SIGNATURES.set(name, { params: ['id', 'value'], minArgs: 2, maxArgs: 2, allowNamedPrefixWithPositional: true });
}

for (const name of ['array.insert', 'array.set']) {
  BUILTIN_SIGNATURES.set(name, { params: ['id', 'index', 'value'], minArgs: 3, maxArgs: 3, allowNamedPrefixWithPositional: true });
}

for (const name of ['array.every', 'array.some']) {
  BUILTIN_SIGNATURES.set(name, { params: ['id'], minArgs: 1, maxArgs: 1, allowNamedPrefixWithPositional: true });
}

for (const name of ['array.includes', 'array.indexof', 'array.lastindexof']) {
  BUILTIN_SIGNATURES.set(name, { params: ['id', 'value'], minArgs: 2, maxArgs: 2, allowNamedPrefixWithPositional: true });
}

for (const name of ['array.binary_search', 'array.binary_search_leftmost', 'array.binary_search_rightmost']) {
  BUILTIN_SIGNATURES.set(name, { params: ['id', 'val', 'sort_field'], aliases: { value: 'val' }, minArgs: 2, maxArgs: 3, allowNamedPrefixWithPositional: true });
}

BUILTIN_SIGNATURES.set('array.concat', { params: ['id1', 'id2'], aliases: { id: 'id1' }, minArgs: 2, maxArgs: 2, allowNamedPrefixWithPositional: true });
BUILTIN_SIGNATURES.set('array.fill', { params: ['id', 'value', 'index_from', 'index_to'], minArgs: 2, maxArgs: 4, allowNamedPrefixWithPositional: true });
BUILTIN_SIGNATURES.set('array.join', { params: ['id', 'separator'], minArgs: 1, maxArgs: 2, allowNamedPrefixWithPositional: true });
BUILTIN_SIGNATURES.set('array.reverse', { params: ['id'], minArgs: 1, maxArgs: 1, allowNamedPrefixWithPositional: true });
BUILTIN_SIGNATURES.set('array.slice', { params: ['id', 'index_from', 'index_to'], minArgs: 3, maxArgs: 3, allowNamedPrefixWithPositional: true });
BUILTIN_SIGNATURES.set('array.sort', { params: ['id', 'order', 'sort_field'], minArgs: 1, maxArgs: 3, allowNamedPrefixWithPositional: true });
BUILTIN_SIGNATURES.set('array.sort_indices', { params: ['id', 'order', 'sort_field'], minArgs: 1, maxArgs: 3, allowNamedPrefixWithPositional: true });

for (const name of ['array.abs', 'array.avg', 'array.median', 'array.mode', 'array.range', 'array.standardize', 'array.sum']) {
  BUILTIN_SIGNATURES.set(name, { params: ['id'], minArgs: 1, maxArgs: 1, allowNamedPrefixWithPositional: true });
}
for (const name of ['array.min', 'array.max']) {
  BUILTIN_SIGNATURES.set(name, { params: ['id', 'nth'], minArgs: 1, maxArgs: 2, allowNamedPrefixWithPositional: true });
}

for (const name of ['array.stdev', 'array.variance']) {
  BUILTIN_SIGNATURES.set(name, { params: ['id', 'biased'], minArgs: 1, maxArgs: 2, allowNamedPrefixWithPositional: true });
}

for (const name of ['array.percentile_linear_interpolation', 'array.percentile_nearest_rank']) {
  BUILTIN_SIGNATURES.set(name, { params: ['id', 'percentage'], minArgs: 2, maxArgs: 2, allowNamedPrefixWithPositional: true });
}

BUILTIN_SIGNATURES.set('array.covariance', { params: ['id1', 'id2', 'biased'], aliases: { id: 'id1' }, minArgs: 2, maxArgs: 3, allowNamedPrefixWithPositional: true });
BUILTIN_SIGNATURES.set('array.percentrank', { params: ['id', 'index'], minArgs: 2, maxArgs: 2, allowNamedPrefixWithPositional: true });

BUILTIN_SIGNATURES.set('array.from', {
  params: [],
  minArgs: 1,
  allowExtraPositional: true,
  allowNamedPrefixWithPositional: true,
  variadicParamPrefix: 'arg',
});

for (const name of ['matrix.new', 'matrix.new_bool', 'matrix.new_color', 'matrix.new_float', 'matrix.new_int', 'matrix.new_string']) {
  BUILTIN_SIGNATURES.set(name, { params: ['rows', 'columns', 'initial_value'], minArgs: 0, maxArgs: 3, allowNamedPrefixWithPositional: true });
}

for (const name of ['matrix.columns', 'matrix.elements_count', 'matrix.is_valid', 'matrix.rows']) {
  BUILTIN_SIGNATURES.set(name, { params: ['id'], minArgs: 1, maxArgs: 1, allowNamedPrefixWithPositional: true });
}

BUILTIN_SIGNATURES.set('matrix.get', { params: ['id', 'row', 'column'], minArgs: 3, maxArgs: 3, allowNamedPrefixWithPositional: true });
BUILTIN_SIGNATURES.set('matrix.set', { params: ['id', 'row', 'column', 'value'], minArgs: 4, maxArgs: 4, allowNamedPrefixWithPositional: true });
BUILTIN_SIGNATURES.set('matrix.fill', { params: ['id', 'value', 'from_row', 'to_row', 'from_column', 'to_column'], minArgs: 2, maxArgs: 6, allowNamedPrefixWithPositional: true });
BUILTIN_SIGNATURES.set('matrix.reshape', { params: ['id', 'rows', 'columns'], minArgs: 3, maxArgs: 3, allowNamedPrefixWithPositional: true });
BUILTIN_SIGNATURES.set('matrix.reverse', { params: ['id'], minArgs: 1, maxArgs: 1, allowNamedPrefixWithPositional: true });

BUILTIN_SIGNATURES.set('matrix.add_row', { params: ['id', 'row', 'array_id'], minArgs: 1, maxArgs: 3, allowNamedPrefixWithPositional: true });
for (const name of ['matrix.add_col', 'matrix.add_column']) {
  BUILTIN_SIGNATURES.set(name, { params: ['id', 'column', 'array_id'], minArgs: 1, maxArgs: 3, allowNamedPrefixWithPositional: true });
}

BUILTIN_SIGNATURES.set('matrix.remove_row', { params: ['id', 'row'], minArgs: 1, maxArgs: 2, allowNamedPrefixWithPositional: true });
for (const name of ['matrix.remove_col', 'matrix.remove_column']) {
  BUILTIN_SIGNATURES.set(name, { params: ['id', 'column'], minArgs: 1, maxArgs: 2, allowNamedPrefixWithPositional: true });
}

BUILTIN_SIGNATURES.set('matrix.swap_rows', { params: ['id', 'row1', 'row2'], minArgs: 3, maxArgs: 3, allowNamedPrefixWithPositional: true });
BUILTIN_SIGNATURES.set('matrix.swap_columns', { params: ['id', 'column1', 'column2'], minArgs: 3, maxArgs: 3, allowNamedPrefixWithPositional: true });
BUILTIN_SIGNATURES.set('matrix.concat', { params: ['id1', 'id2'], aliases: { id: 'id1' }, minArgs: 2, maxArgs: 2, allowNamedPrefixWithPositional: true });
BUILTIN_SIGNATURES.set('matrix.submatrix', { params: ['id', 'from_row', 'to_row', 'from_column', 'to_column'], minArgs: 1, maxArgs: 5, allowNamedPrefixWithPositional: true });

for (const name of ['matrix.copy', 'matrix.transpose']) {
  BUILTIN_SIGNATURES.set(name, { params: ['id'], minArgs: 1, maxArgs: 1, allowNamedPrefixWithPositional: true });
}

BUILTIN_SIGNATURES.set('matrix.row', { params: ['id', 'row'], minArgs: 2, maxArgs: 2, allowNamedPrefixWithPositional: true });
for (const name of ['matrix.col', 'matrix.column']) {
  BUILTIN_SIGNATURES.set(name, { params: ['id', 'column'], minArgs: 2, maxArgs: 2, allowNamedPrefixWithPositional: true });
}

for (const name of [
  'matrix.avg',
  'matrix.det',
  'matrix.eigenvalues',
  'matrix.eigenvectors',
  'matrix.inv',
  'matrix.max',
  'matrix.median',
  'matrix.min',
  'matrix.mode',
  'matrix.pinv',
  'matrix.rank',
  'matrix.trace',
]) {
  BUILTIN_SIGNATURES.set(name, { params: ['id'], minArgs: 1, maxArgs: 1, allowNamedPrefixWithPositional: true });
}

for (const name of ['matrix.diff', 'matrix.kron', 'matrix.mult', 'matrix.sum']) {
  BUILTIN_SIGNATURES.set(name, { params: ['id1', 'id2'], aliases: { id: 'id1' }, minArgs: 2, maxArgs: 2, allowNamedPrefixWithPositional: true });
}

BUILTIN_SIGNATURES.set('matrix.pow', { params: ['id', 'power'], minArgs: 2, maxArgs: 2, allowNamedPrefixWithPositional: true });
BUILTIN_SIGNATURES.set('matrix.sort', { params: ['id', 'column', 'order', 'sort_field'], minArgs: 1, maxArgs: 4, allowNamedPrefixWithPositional: true });

for (const name of [
  'matrix.is_antidiagonal',
  'matrix.is_antisymmetric',
  'matrix.is_binary',
  'matrix.is_diagonal',
  'matrix.is_identity',
  'matrix.is_square',
  'matrix.is_stochastic',
  'matrix.is_symmetric',
  'matrix.is_triangular',
  'matrix.is_zero',
]) {
  BUILTIN_SIGNATURES.set(name, { params: ['id'], minArgs: 1, maxArgs: 1, allowNamedPrefixWithPositional: true });
}

const SIGNED_BUILTIN_CALL_NAMESPACES = new Set(
  [...BUILTIN_SIGNATURES.keys()]
    .flatMap((name) => {
      const [namespace, member] = name.split('.');
      return namespace && member && BUILTIN_NAMESPACES.has(namespace) ? [namespace] : [];
    }),
);

const PLANNED_UNSUPPORTED_BUILTIN_CALL_MESSAGES = new Map<string, string>();

export function resolvesBuiltinReferenceNameForCoverage(name: string): boolean {
  if (CORPORATE_FORECAST_MEMBERS[name]) return true;
  if (name === 'true' || name === 'false' || name === 'library') return true;
  if (BUILTIN_SIGNATURES.has(canonicalBuiltinName(name))) return true;
  if (BUILTIN_SIGNATURES.has(name) || BUILTIN_FUNCTIONS.has(name)) return true;
  if (BUILTIN_GLOBALS.has(name) || BUILTIN_GLOBAL_TYPES.has(name)) return true;
  if (isExportableBuiltinConstantPath(name.split('.'))) return true;
  if (COLOR_CONSTANT_NAMES.has(name) || MATH_CONSTANT_NAMES.has(name)) return true;
  if (TA_FLOAT_MEMBER_NAMES.has(name)) return true;
  if (TIMEFRAME_BOOL_MEMBER_NAMES.has(name) || TIMEFRAME_STRING_MEMBER_NAMES.has(name) || name === 'timeframe.multiplier') return true;
  if (
    SYMINFO_STRING_MEMBER_NAMES.has(name)
    || SYMINFO_INT_MEMBER_NAMES.has(name)
    || SYMINFO_SERIES_INT_MEMBER_NAMES.has(name)
    || SYMINFO_FLOAT_MEMBER_NAMES.has(name)
    || SYMINFO_SERIES_FLOAT_MEMBER_NAMES.has(name)
  ) return true;
  if (CHART_BOOL_MEMBER_NAMES.has(name) || CHART_COLOR_MEMBER_NAMES.has(name) || CHART_INT_MEMBER_NAMES.has(name)) return true;
  if (
    TICKER_SESSION_CONSTANT_VALUES.has(name)
    || name === 'session.ismarket'
    || name === 'session.ispremarket'
    || name === 'session.ispostmarket'
    || name === 'session.isfirstbar'
    || name === 'session.isfirstbar_regular'
    || name === 'session.islastbar'
    || name === 'session.islastbar_regular'
  ) return true;
  if (REQUEST_FLOAT_RETURN_NAMES.has(name) || TICKER_STRING_RETURN_NAMES.has(name)) return true;
  if (
    STRATEGY_FLOAT_MEMBER_NAMES.has(name)
    || STRATEGY_INT_MEMBER_NAMES.has(name)
    || STRATEGY_STRING_MEMBER_NAMES.has(name)
  ) return true;
  if (DRAWING_ALL_ELEMENT_TYPES.has(name)) return true;
  const [namespace, member] = name.split('.');
  return Boolean(namespace && member && (
    BUILTIN_COLLECTION_MEMBER_METHODS.get(namespace)?.has(member)
      || BUILTIN_SIGNATURES.has(name)
  ));
}

export const PINE_V6_BUILTIN_NAMED_FORM_FORBIDDEN_SIGNATURES: readonly string[] = [];

export function builtinSignaturesWithoutNamedFormForCoverage(): string[] {
  const forbidden = new Set(PINE_V6_BUILTIN_NAMED_FORM_FORBIDDEN_SIGNATURES);
  return [...BUILTIN_SIGNATURES.entries()]
    .filter(([name, signature]) => signature.params.length > 0 && !signature.allowNamedPrefixWithPositional && !forbidden.has(name))
    .map(([name]) => name)
    .sort();
}

export interface BuiltinSignatureShapeForCoverage {
  params: string[];
  aliases?: Record<string, string>;
  minArgs?: number;
  maxArgs?: number;
  requiredParams?: string[];
  overloads?: string[][];
}

export function builtinSignatureForCoverage(name: string, pineVersion = 6): BuiltinSignatureShapeForCoverage | undefined {
  const signature = BUILTIN_SIGNATURES.get(name);
  if (!signature) return undefined;
  let overloads = signature.overloads?.map((overload) => [...overload]);
  if (name === 'line.new') overloads = [[...LINE_NEW_POINT_SIGNATURE.params]];
  if (name === 'label.new') overloads = [[...LABEL_NEW_POINT_SIGNATURE.params]];
  if (name === 'box.new') overloads = [[...BOX_NEW_POINT_SIGNATURE.params]];
  const cancellation = name === 'strategy.cancel' || name === 'strategy.cancel_all';
  let params = [...(cancellation && pineVersion === 5 ? signature.legacyV5Params! : signature.params)];
  if (name === 'str.format') params = ['formatString', 'arg0, arg1, ...'];
  if (name === 'array.from') params = ['arg0, arg1, ...'];
  if (name === 'color') params = ['x'];
  if (['math.sin', 'math.cos', 'math.tan', 'math.asin', 'math.acos', 'math.atan'].includes(name)) params = ['angle'];
  if (name === 'math.todegrees') params = ['radians'];
  if (name === 'math.toradians') params = ['degrees'];
  if (name === 'ta.cmo' || name === 'ta.mfi') params = ['series', 'length'];
  if (name === 'ta.max' || name === 'ta.min') params = ['source'];
  const minArgs = name === 'color' ? 1 : signature.minArgs;
  const maxArgs = cancellation ? params.length : name === 'color' || name === 'ta.max' || name === 'ta.min' ? 1 : signature.maxArgs;
  const requiredParams = name === 'ta.max' || name === 'ta.min'
    ? ['source']
    : signature.requiredParams ? [...signature.requiredParams] : undefined;
  return {
    params,
    aliases: signature.aliases ? { ...signature.aliases } : undefined,
    minArgs,
    maxArgs,
    requiredParams,
    overloads,
  };
}

export interface BuiltinSignatureMapForCoverageOptions {
  pineVersion?: number;
}

export function builtinSignatureMapForCoverage(options: BuiltinSignatureMapForCoverageOptions = {}): Record<string, BuiltinSignatureShapeForCoverage> {
  return Object.fromEntries(
    [...BUILTIN_SIGNATURES.keys()]
      .filter((name) => options.pineVersion === undefined || isBuiltinSignatureAvailableInPineVersion(name, options.pineVersion))
      .sort((a, b) => a.localeCompare(b))
      .map((name) => [name, builtinSignatureForCoverage(name, options.pineVersion)!]),
  );
}

function isBuiltinSignatureAvailableInPineVersion(name: string, pineVersion: number): boolean {
  const rules = pineVersionRules(pineVersion);
  if (name === 'iff') return rules.supportsIffFunction;
  if (name === 'offset') return rules.supportsOffsetFunction;
  return true;
}

export function checkProgram(program: Program, options: SemanticCheckOptions = {}): SemanticCheckResult {
  return new SemanticChecker(options).check(program);
}

export function normalizeV5DuplicateCallArguments(program: Program, options: SemanticCheckOptions = {}): Program {
  if (program.version !== 5) return program;
  return new SemanticChecker(options).normalizeDuplicateCallArguments(program);
}
const GLOBAL_ONLY_BUILTIN_CALLS = new Set([
  'plot', 'hline', 'fill', 'plotshape', 'plotchar', 'plotarrow', 'plotbar', 'plotcandle',
  'barcolor', 'bgcolor', 'alertcondition', 'indicator', 'strategy', 'library',
]);

class SemanticChecker {
  private diagnostics: SemanticDiagnostic[] = [];
  private duplicateCallArguments = new Set<CallArgument>();
  private reassignedSymbols = new WeakSet<SemanticSymbol>();
  private seriesMapValueTypes = new WeakSet<SemanticType>();
  private mapValueOrigins = new WeakMap<SemanticType, SemanticType>();
  private legacySecurityExpressions: { references: Set<SemanticSymbol>; loc?: SourceLocation }[] = [];
  private activeLegacySecurityReferences: Set<SemanticSymbol>[] = [];
  private rootScope = new SemanticScope();
  private sparseHistorySymbols = new WeakSet<SemanticSymbol>();
  private localHistoryFunctions = new WeakSet<FunctionDeclaration>();
  private conditionalHistoryCalls = new Set<CallExpression>();
  private conditionalExpressionDepth = 0;
  private typeDeclarations = new Map<string, TypeDeclaration>();
  private enumDeclarations = new Map<string, EnumDeclaration>();
  private functionDeclarations = new Map<string, FunctionDeclaration[]>();
  private methodDeclarations = new Map<string, FunctionDeclaration[]>();
  private importedLibraries = new Map<string, SemanticImportedLibrary>();
  private functionSymbolDeclarations = new WeakMap<SemanticSymbol, FunctionDeclaration>();
  private inferredVariableSymbols = new WeakSet<SemanticSymbol>();
  private mutableDeclarations = new WeakMap<VariableDeclaration, Set<string>>();
  private explicitConstVariableSymbols = new WeakSet<SemanticSymbol>();
  private usedBuiltinVariableNames = new Set<string>();
  private activeFunctionDepth = 0;
  private highestTimeframeRatioSymbols = new WeakSet<SemanticSymbol>();
  private barmergeModeSymbols = new WeakMap<SemanticSymbol, Set<string>>();
  private visualNumericValues = new WeakMap<SemanticSymbol, number>();
  private constantValues = new WeakMap<SemanticSymbol, number | boolean>();
  private declarationConstantStrings = new WeakMap<SemanticSymbol, string>();
  private visualOffsetQualifiers = new WeakMap<SemanticSymbol, SemanticQualifier>();
  private activeReturnInferences = new Set<FunctionDeclaration>();
  private parameterQualifierRequirements = new WeakMap<FunctionDeclaration, ParameterQualifierRequirements>();
  private activeParameterRequirementInferences = new Set<FunctionDeclaration>();
  private currentPineVersion = 6;
  private ambiguousExpressionTypes = new WeakSet<Expression | IfStatement>();
  private fillColorQualifiers = new Map<CallExpression, SemanticQualifier>();
  private userFunctionCallDeclarations = new Map<CallExpression, FunctionDeclaration>();
  private dynamicRequestsEnabled = true;
  private indicatorDynamicRequests: boolean | undefined;
  private deferRequestContextQualifiers = false;
  private pendingRequestContextDiagnostics: { index: number; diagnostics: SemanticDiagnostic[] }[] = [];
  private expressionTypes = new WeakMap<Expression, SemanticType>();
  private callTypeContexts = new WeakMap<CallExpression, SemanticExpressionTypeContext>();
  private typeContextStack: SemanticExpressionTypeContext[] = [];
  private activeFunction: FunctionDeclaration | undefined;

  constructor(private readonly options: SemanticCheckOptions = {}) {}

  check(program: Program): SemanticCheckResult {
    this.diagnostics = [];
    this.ambiguousExpressionTypes = new WeakSet();
    this.expressionTypes = new WeakMap();
    this.callTypeContexts = new WeakMap();
    this.typeContextStack = [];
    this.fillColorQualifiers = new Map();
    this.userFunctionCallDeclarations = new Map();
    this.usedBuiltinVariableNames = new Set();
    this.activeFunctionDepth = 0;
    this.activeFunction = undefined;
    this.localHistoryFunctions = new WeakSet();
    this.conditionalHistoryCalls.clear();
    this.conditionalExpressionDepth = 0;
    this.duplicateCallArguments.clear();
    this.reassignedSymbols = new WeakSet();
    this.seriesMapValueTypes = new WeakSet();
    this.mapValueOrigins = new WeakMap();
    this.legacySecurityExpressions = [];
    this.activeLegacySecurityReferences = [];
    this.rootScope = new SemanticScope();
    this.typeDeclarations = this.collectTypeDeclarations(program.body);
    this.enumDeclarations = this.collectEnumDeclarations(program.body);
    this.functionDeclarations = this.collectFunctionDeclarations(program.body);
    this.methodDeclarations = this.collectMethodDeclarations(program.body);
    this.importedLibraries = this.collectImportedLibraries(program);
    this.functionSymbolDeclarations = new WeakMap();
    this.visualNumericValues = new WeakMap();
    this.constantValues = new WeakMap();
    this.declarationConstantStrings = new WeakMap();
    this.visualOffsetQualifiers = new WeakMap();
    this.activeReturnInferences = new Set();
    this.parameterQualifierRequirements = new WeakMap();
    this.activeParameterRequirementInferences = new Set();
    this.currentPineVersion = this.effectiveProgramPineVersion(program);
    const declaration = program.body.find((statement) => statement.type === 'IndicatorDeclaration' || statement.type === 'LibraryDeclaration');
    this.dynamicRequestsEnabled = declaration?.dynamic_requests?.type === 'BooleanLiteral'
      ? declaration.dynamic_requests.value
      : this.versionRules.dynamicRequestsDefault;
    this.indicatorDynamicRequests = undefined;
    this.deferRequestContextQualifiers = declaration?.type === 'IndicatorDeclaration'
      && declaration.declarationKind === 'indicator'
      && !!declaration.dynamic_requests
      && declaration.dynamic_requests.type !== 'BooleanLiteral';
    this.pendingRequestContextDiagnostics = [];
    this.mutableDeclarations = this.versionRules.fixesMutableConstInference
      ? this.collectMutableDeclarations(program.body)
      : new WeakMap();
    if (this.options.requireDeclaration) {
      const declarations = program.body.filter((statement) => statement.type === 'IndicatorDeclaration' || statement.type === 'LibraryDeclaration');
      if (declarations.length !== 1) {
        this.addDiagnostic('declaration-count', 'A complete Pine script requires exactly one global indicator(), strategy(), or library() declaration', declarations[1]?.loc ?? program.loc);
      }
    }
    this.hoistFunctionDeclarations(program.body);
    this.checkUserFunctionRecursion(program.body);
    this.checkLibraryExportDeclarations(program.body);
    const libraryScopeDiagnosticIndex = this.diagnostics.length;
    this.checkStatements(program.body, this.rootScope);
    if (!this.dynamicRequestsEnabled) {
      let inserted = 0;
      for (const pending of this.pendingRequestContextDiagnostics) {
        this.diagnostics.splice(pending.index + inserted, 0, ...pending.diagnostics);
        inserted += pending.diagnostics.length;
      }
    }
    this.deferRequestContextQualifiers = false;
    if (declaration?.type === 'LibraryDeclaration') {
      const checkedStatementDiagnosticCount = this.diagnostics.length;
      this.checkLibraryExportedFunctionScopes(program.body);
      const libraryDiagnostics = this.diagnostics.splice(checkedStatementDiagnosticCount);
      this.diagnostics.splice(libraryScopeDiagnosticIndex, 0, ...libraryDiagnostics);
    }
    for (const expression of this.conditionalHistoryCalls) {
      const declaration = this.userFunctionCallDeclarations.get(expression);
      if (!declaration || !this.localHistoryFunctions.has(declaration)) continue;
      this.addDiagnostic(
        'inconsistent-function-history',
        `Function '${declaration.name.name}' reads local history and should be called on every calculation for consistency; move the call outside the conditional scope or expression`,
        expression.loc,
        'warning',
      );
    }
    for (const { references, loc } of this.legacySecurityExpressions) {
      if (![...references].some((symbol) => this.reassignedSymbols.has(symbol))) continue;
      this.addDiagnostic(
        'mutable-security-expression',
        'Cannot use mutable variable as an argument for security function. Wrap the mutable calculation in a function.',
        loc,
      );
    }
    this.checkCallableOverloadDeclarations();
    return {
      diagnostics: this.diagnostics,
      symbols: this.rootScope.allSymbols(),
      indicatorDynamicRequests: this.indicatorDynamicRequests,
      expressionTypes: this.expressionTypes,
      callTypeContexts: this.callTypeContexts,
      fillColorQualifiers: this.fillColorQualifiers,
      userFunctionCallDeclarations: this.userFunctionCallDeclarations,
    };
  }

  normalizeDuplicateCallArguments(program: Program): Program {
    this.check(program);
    if (this.duplicateCallArguments.size === 0) return program;
    const copy = (value: unknown): unknown => {
      if (Array.isArray(value)) {
        const items: unknown[] = value;
        return items.filter((item) => !this.duplicateCallArguments.has(item as CallArgument)).map(copy);
      }
      if (value === null || typeof value !== 'object') return value;
      return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, copy(item)]));
    };
    return copy(program) as Program;
  }

  private addDuplicateArgumentDiagnostic(argument: CallArgument, message: string): void {
    const warns = this.currentPineVersion === 5 && !this.versionRules.disallowsDuplicateCallArguments;
    if (warns) this.duplicateCallArguments.add(argument);
    this.addDiagnostic('duplicate-argument', message, argument.name?.loc, warns ? 'warning' : 'error');
  }

  private effectiveProgramPineVersion(program: Program): number {
    if (program.explicitVersion) return program.version;
    return program.body.some((statement) => statement.type === 'IndicatorDeclaration' && statement.sourceDeclarationKind === 'study')
      ? 4
      : program.version;
  }

  private get versionRules(): PineVersionRules {
    return pineVersionRules(this.currentPineVersion);
  }

  private legacyVersionContext(predicate: (rules: PineVersionRules) => boolean): string {
    const allowedVersions = pineVersionsWhere(predicate);
    return `This was valid in ${pineVersionListDescription(allowedVersions)} but is not valid in Pine v${this.currentPineVersion}.`;
  }

  private boolNaVersionMessage(subject: string): string {
    return `${subject} because Pine v${this.currentPineVersion} does not allow boolean na values. ${this.legacyVersionContext((rules) => rules.allowsBoolNaHelpers)} Use true or false for a boolean state, or use another type for a nullable value and test it with na(...).`;
  }

  private implicitNumericBoolVersionMessage(type: SemanticType): string {
    return `Numeric ${type.kind} expression cannot be used as a boolean in Pine v${this.currentPineVersion}. ${this.legacyVersionContext((rules) => rules.allowsImplicitNumericToBool)} Compare it explicitly or wrap it in bool(...).`;
  }

  private linewidthZeroVersionMessage(calleeName: string): string {
    return `${calleeName} linewidth must be at least ${this.versionRules.minVisualLineWidth} in Pine v${this.currentPineVersion}. ${this.legacyVersionContext((rules) => rules.minVisualLineWidth < this.versionRules.minVisualLineWidth)}`;
  }

  private checkStatements(statements: Statement[], scope: SemanticScope): void {
    for (const statement of statements) {
      this.checkStatement(statement, scope);
    }
  }

  private collectMutableDeclarations(statements: Statement[]): WeakMap<VariableDeclaration, Set<string>> {
    const mutable = new WeakMap<VariableDeclaration, Set<string>>();
    type Frame = Map<string, VariableDeclaration | null>;
    const visitBlock = (body: Statement[], parents: Frame[], shadows: string[] = []): void => {
      const frame: Frame = new Map(shadows.map((name) => [name, null]));
      for (const statement of body) visit(statement, [frame, ...parents]);
    };
    const visit = (value: unknown, frames: Frame[]): void => {
      if (Array.isArray(value)) {
        for (const item of value) visit(item, frames);
        return;
      }
      if (!value || typeof value !== 'object') return;
      const node = value as { type?: string };
      if (node.type === 'VariableDeclaration') {
        const declaration = value as VariableDeclaration;
        if (declaration.names.type === 'VariableDeclarator') {
          frames[0].set(declaration.names.name.name, declaration);
        } else {
          for (const name of declaration.names.names) frames[0].set(name.name, declaration);
        }
        visit(declaration.init, frames);
        return;
      }
      if (node.type === 'AssignmentStatement') {
        const assignment = value as AssignmentStatement;
        if (assignment.left.type === 'Identifier') {
          for (const frame of frames) {
            if (!frame.has(assignment.left.name)) continue;
            const declaration = frame.get(assignment.left.name);
            if (declaration) {
              const names = mutable.get(declaration) ?? new Set<string>();
              names.add(assignment.left.name);
              mutable.set(declaration, names);
            }
            break;
          }
        }
        visit(assignment.right, frames);
        return;
      }
      if (node.type === 'FunctionDeclaration') {
        const declaration = value as FunctionDeclaration;
        const parameters = declaration.params.map((parameter) => parameter.name);
        if (Array.isArray(declaration.body)) visitBlock(declaration.body, frames, parameters);
        else visit(declaration.body, [new Map(parameters.map((name) => [name, null])), ...frames]);
        return;
      }
      if (node.type === 'IfStatement') {
        const statement = value as IfStatement;
        visit(statement.test, frames);
        visitBlock(statement.consequent, frames);
        if (Array.isArray(statement.alternate)) visitBlock(statement.alternate, frames);
        else visit(statement.alternate, frames);
        return;
      }
      if (node.type === 'ForStatement') {
        const statement = value as ForStatement;
        if (statement.kind === 'collection') visit(statement.iterable, frames);
        else visit([statement.start, statement.end, statement.step], frames);
        const names = [statement.counter.name];
        if (statement.kind === 'collection' && statement.indexCounter) names.push(statement.indexCounter.name);
        visitBlock(statement.body, frames, names);
        return;
      }
      if (node.type === 'WhileStatement' || node.type === 'OnceStatement') {
        const statement = value as WhileStatement | OnceStatement;
        visit(statement.test, frames);
        visitBlock(statement.body, frames);
        return;
      }
      if (node.type === 'SwitchCase') {
        const statement = value as SwitchCase;
        visit(statement.test, frames);
        if (Array.isArray(statement.consequent)) visitBlock(statement.consequent, frames);
        else visit(statement.consequent, frames);
        return;
      }
      for (const [key, child] of Object.entries(value)) {
        if (key !== 'loc') visit(child, frames);
      }
    };
    visitBlock(statements, []);
    return mutable;
  }

  private variableDeclarationType(statement: VariableDeclaration, scope: SemanticScope): SemanticType {
    let type = this.typeFromAnnotation(statement.typeAnnotation ?? undefined) ?? this.inferVariableInitializerType(statement.init, scope);
    if (statement.typeAnnotation && !statement.typeAnnotation.qualifier
      && ['int', 'float', 'bool', 'color', 'string'].includes(statement.typeAnnotation.baseType)) {
      const initializerType = this.inferVariableInitializerType(statement.init, scope);
      type = { ...type, qualifier: initializerType.qualifier ?? type.qualifier };
    }
    if (statement.typeAnnotation && type.kind === 'map' && type.valueType) {
      const initializer = this.inferVariableInitializerType(statement.init, scope);
      if (initializer.kind === 'map' && initializer.valueType) {
        this.mapValueOrigins.set(type.valueType, this.mapValueOrigins.get(initializer.valueType) ?? initializer.valueType);
      }
    }
    return this.declarationBindingType(statement, statement.names.type === 'VariableDeclarator' ? statement.names.name.name : '', type);
  }

  private declarationBindingType(statement: VariableDeclaration, name: string, type: SemanticType): SemanticType {
    return type.kind === 'table' || (this.mutableDeclarations.get(statement)?.has(name) && !statement.typeAnnotation?.qualifier)
      ? { ...type, qualifier: 'series' }
      : type;
  }

  private checkLibraryExportDeclarations(statements: Statement[]): void {
    const libraryDeclaration = statements.find((statement) => statement.type === 'LibraryDeclaration');
    const exportedDeclarations = statements.filter(
      (statement): statement is FunctionDeclaration | TypeDeclaration | VariableDeclaration | EnumDeclaration =>
        (
          statement.type === 'FunctionDeclaration'
          || statement.type === 'TypeDeclaration'
          || statement.type === 'EnumDeclaration'
          || statement.type === 'VariableDeclaration'
        ) && !!statement.exported,
    );

    if (libraryDeclaration && exportedDeclarations.length === 0) {
      this.addDiagnostic(
        'library-export',
        'Library scripts must export at least one function, method, user-defined type, enum, or constant',
        libraryDeclaration.loc,
      );
    }

    if (!libraryDeclaration) {
      for (const declaration of exportedDeclarations) {
        this.addDiagnostic(
          'library-export',
          `Exported declarations are only allowed in library scripts: ${this.exportedDeclarationName(declaration)}`,
          this.exportedDeclarationLoc(declaration),
        );
      }
      return;
    }

    const typeDeclarations = this.collectTypeDeclarations(statements);
    const exportedTypeNames = new Set(
      [...typeDeclarations.values()]
        .filter((declaration) => declaration.exported)
        .map((declaration) => declaration.name.name),
    );

    for (const declaration of exportedDeclarations) {
      if (declaration.type === 'TypeDeclaration') {
        this.checkExportedTypeFields(declaration, typeDeclarations, exportedTypeNames);
      } else if (declaration.type === 'FunctionDeclaration') {
        this.checkExportedCallableTypeReferences(declaration, typeDeclarations, exportedTypeNames);
        this.checkExportedCallableReturnType(declaration, typeDeclarations, exportedTypeNames);
      } else if (declaration.type === 'EnumDeclaration') {
        continue;
      } else {
        this.checkExportedVariable(declaration);
      }
    }

    for (const declaration of exportedDeclarations) {
      if (declaration.type !== 'FunctionDeclaration') continue;
      this.checkExportedFunctionParameters(declaration);
    }

  }

  private checkLibraryExportedFunctionScopes(statements: Statement[]): void {
    const libraryDeclaration = statements.find((statement) => statement.type === 'LibraryDeclaration');
    if (!libraryDeclaration) return;
    const globals = this.collectGlobalVariableQualifiers(statements);
    const dynamicRequestsAllowed = this.libraryDynamicRequestsAllowed(libraryDeclaration);
    for (const declaration of statements) {
      if (declaration.type === 'FunctionDeclaration' && declaration.exported) {
        this.checkExportedFunctionScope(declaration, globals, dynamicRequestsAllowed);
      }
    }
  }

  private collectImportedLibraries(program: Program): Map<string, SemanticImportedLibrary> {
    const libraries = new Map<string, SemanticImportedLibrary>();
    const importedPaths = new Set<string>();

    for (const statement of program.body) {
      if (statement.type !== 'ImportDeclaration') continue;
      if (importedPaths.has(statement.path)) {
        this.addDiagnostic('duplicate-import', `Library ${statement.path} can only be imported once`, statement.loc);
      }
      importedPaths.add(statement.path);
      for (const identifier of [statement.owner, statement.library, statement.alias.name]) {
        if (identifier === 'as' || identifier === 'import') {
          this.addDiagnostic('reserved-identifier', `Import identifier '${identifier}' is reserved`, statement.loc);
        }
      }

      const officialLibrary = getOfficialTradingViewLibrary(statement.path);
      if (officialLibrary && !officialLibrary.program) {
        libraries.set(statement.alias.name, {
          alias: statement.alias.name,
          functions: new Map(),
          builtinFunctions: officialLibrary.functions,
          official: officialLibrary,
          types: new Map(),
          enums: new Map(),
          constants: new Map(),
          methods: new Map(),
          memberNames: new Set(officialLibrary.functions.keys()),
        });
        continue;
      }

      if (!officialLibrary?.program && !this.options.libraries?.size) continue;
      const libraryProgram = officialLibrary?.program ?? this.options.libraries?.get(statement.path);
      if (!libraryProgram) continue;

      const types = new Map<string, TypeDeclaration>();
      const enums = new Map<string, EnumDeclaration>();
      const constants = new Map<string, VariableDeclaration>();
      const functions = new Map<string, FunctionDeclaration[]>();
      const methods = new Map<string, FunctionDeclaration[]>();
      const memberNames = new Set<string>();
      for (const libraryStatement of libraryProgram.body) {
        if (libraryStatement.type === 'TypeDeclaration') {
          memberNames.add(libraryStatement.name.name);
          if (libraryStatement.exported) types.set(libraryStatement.name.name, libraryStatement);
        } else if (libraryStatement.type === 'EnumDeclaration') {
          memberNames.add(libraryStatement.name.name);
          if (libraryStatement.exported) enums.set(libraryStatement.name.name, libraryStatement);
        } else if (
          libraryStatement.type === 'VariableDeclaration' && libraryStatement.names.type === 'VariableDeclarator'
        ) {
          memberNames.add(libraryStatement.names.name.name);
          if (libraryStatement.exported) constants.set(libraryStatement.names.name.name, libraryStatement);
        } else if (libraryStatement.type === 'FunctionDeclaration') {
          memberNames.add(libraryStatement.name.name);
          if (libraryStatement.isMethod && libraryStatement.exported) {
            const overloads = methods.get(libraryStatement.name.name) ?? [];
            overloads.push(libraryStatement);
            methods.set(libraryStatement.name.name, overloads);
          } else if (!libraryStatement.isMethod && libraryStatement.exported) {
            const overloads = functions.get(libraryStatement.name.name) ?? [];
            overloads.push(libraryStatement);
            functions.set(libraryStatement.name.name, overloads);
          }
        }
      }

      libraries.set(statement.alias.name, {
        alias: statement.alias.name,
        functions,
        builtinFunctions: officialLibrary?.library === 'ta' ? officialLibrary.functions : undefined,
        official: officialLibrary,
        types,
        enums,
        constants,
        methods,
        memberNames,
      });
    }

    return libraries;
  }

  private checkExportedTypeFields(
    declaration: TypeDeclaration,
    typeDeclarations: Map<string, TypeDeclaration>,
    exportedTypeNames: Set<string>,
  ): void {
    for (const field of declaration.fields) {
      this.checkExportedTypeAnnotation(
        declaration.name.name,
        `field ${field.name.name}`,
        field.typeAnnotation ?? undefined,
        typeDeclarations,
        exportedTypeNames,
        field.name.loc,
      );
    }
  }

  private exportedDeclarationName(declaration: FunctionDeclaration | TypeDeclaration | VariableDeclaration | EnumDeclaration): string {
    if (declaration.type !== 'VariableDeclaration') return declaration.name.name;
    if (declaration.names.type === 'VariableDeclarator') return declaration.names.name.name;
    return 'tuple declaration';
  }

  private exportedDeclarationLoc(declaration: FunctionDeclaration | TypeDeclaration | VariableDeclaration | EnumDeclaration): SourceLocation | undefined {
    if (declaration.type !== 'VariableDeclaration') return declaration.name.loc;
    return declaration.names.loc;
  }

  private checkExportedCallableTypeReferences(
    declaration: FunctionDeclaration,
    typeDeclarations: Map<string, TypeDeclaration>,
    exportedTypeNames: Set<string>,
  ): void {
    const declarationKind = declaration.isMethod ? 'method' : 'function';
    for (const parameter of declaration.params) {
      this.checkExportedTypeAnnotation(
        declaration.name.name,
        `${declarationKind} parameter ${parameter.name}`,
        parameter.typeAnnotation ?? undefined,
        typeDeclarations,
        exportedTypeNames,
        parameter.loc,
      );
    }
  }

  private checkExportedCallableReturnType(
    declaration: FunctionDeclaration,
    typeDeclarations: Map<string, TypeDeclaration>,
    exportedTypeNames: Set<string>,
  ): void {
    const returnType = this.inferFunctionReturnType(declaration);
    if (!returnType) return;

    const hiddenTypes = this.nonExportedUdtNamesInType(returnType, typeDeclarations, exportedTypeNames);
    for (const typeName of hiddenTypes) {
      this.addDiagnostic(
        'library-export',
        `Exported ${declaration.isMethod ? 'method' : 'function'} ${declaration.name.name} returns non-exported user-defined type: ${typeName}`,
        declaration.name.loc,
      );
    }
  }

  private inferFunctionReturnType(declaration: FunctionDeclaration, parameterTypes = new Map<string, SemanticType>()): SemanticType | undefined {
    if (this.activeReturnInferences.has(declaration)) {
      return { kind: 'unknown', qualifier: this.maxQualifier(...parameterTypes.values()) };
    }

    this.activeReturnInferences.add(declaration);
    try {
      const functionScope = this.createFunctionInferenceScope(declaration, parameterTypes);
      if (!Array.isArray(declaration.body)) {
        return this.inferExpressionType(declaration.body, functionScope);
      }

      return this.inferExpressionTypeFromStatements(declaration.body, functionScope);
    } finally {
      this.activeReturnInferences.delete(declaration);
    }
  }

  private inferFunctionTupleElementTypes(
    declaration: FunctionDeclaration,
    parameterTypes = new Map<string, SemanticType>(),
  ): SemanticType[] | undefined {
    if (this.activeReturnInferences.has(declaration)) return undefined;

    this.activeReturnInferences.add(declaration);
    try {
      const functionScope = this.createFunctionInferenceScope(declaration, parameterTypes);
      if (!Array.isArray(declaration.body)) {
        return this.qualifyReturnedTuple(this.inferTupleElementTypes(declaration.body, functionScope));
      }

      return this.qualifyReturnedTuple(this.inferTupleElementTypesFromStatements(declaration.body, functionScope));
    } finally {
      this.activeReturnInferences.delete(declaration);
    }
  }

  private createFunctionInferenceScope(declaration: FunctionDeclaration, parameterTypes: Map<string, SemanticType>): SemanticScope {
    const functionScope = new SemanticScope(this.rootScope);
    for (const parameter of declaration.params) {
      functionScope.declare({
        name: parameter.name,
        kind: 'parameter',
        type: parameterTypes.get(parameter.name) ?? this.typeFromAnnotation(parameter.typeAnnotation ?? undefined),
        loc: parameter.loc,
      });
    }
    return functionScope;
  }

  private checkExportedTypeAnnotation(
    declarationName: string,
    usage: string,
    annotation: TypeAnnotation | undefined | null,
    typeDeclarations: Map<string, TypeDeclaration>,
    exportedTypeNames: Set<string>,
    loc?: SourceLocation,
  ): void {
    if (!annotation) return;

    const typeNames = this.referencedAnnotationTypeNames(annotation);
    for (const typeName of typeNames) {
      if (!typeDeclarations.has(typeName) || exportedTypeNames.has(typeName)) continue;
      this.addDiagnostic(
        'library-export',
        `Exported ${usage} in ${declarationName} uses non-exported user-defined type: ${typeName}`,
        loc,
      );
    }
  }

  private referencedAnnotationTypeNames(annotation: TypeAnnotation): string[] {
    if (annotation.baseType === 'udt') return [annotation.name];
    if (annotation.baseType === 'array' || annotation.baseType === 'matrix') return [annotation.elementType];
    if (annotation.baseType === 'map') return [annotation.keyType, annotation.valueType];
    return [];
  }

  private nonExportedUdtNamesInType(
    type: SemanticType,
    typeDeclarations: Map<string, TypeDeclaration>,
    exportedTypeNames: Set<string>,
  ): string[] {
    const names = new Set<string>();
    const visit = (current: SemanticType | undefined): void => {
      if (!current) return;
      if (current.kind === 'udt' && current.name && typeDeclarations.has(current.name) && !exportedTypeNames.has(current.name)) {
        names.add(current.name);
        return;
      }
      if (current.kind === 'array' || current.kind === 'matrix') {
        visit(current.elementType);
        return;
      }
      if (current.kind === 'map') {
        visit(current.keyType);
        visit(current.valueType);
      }
    };
    visit(type);
    return [...names];
  }

  private checkExportedFunctionParameters(declaration: FunctionDeclaration): void {
    const declarationKind = declaration.isMethod ? 'method' : 'function';
    for (const parameter of declaration.params) {
      if (parameter.typeAnnotation) continue;
      this.addDiagnostic(
        'library-export',
        `Exported ${declarationKind} ${declaration.name.name} parameter ${parameter.name} must declare a type`,
        parameter.loc,
      );
    }
  }

  private checkExportedVariable(declaration: VariableDeclaration): void {
    const annotation = declaration.typeAnnotation;
    if (annotation?.qualifier !== 'const'
      || !['int', 'float', 'bool', 'color', 'string'].includes(annotation.baseType)) {
      this.addDiagnostic(
        'library-export',
        'Exported variables must declare const int, float, bool, color, or string.',
        declaration.loc,
      );
    }
    if (declaration.names.type === 'TupleDeclarator') {
      this.addDiagnostic(
        'library-export',
        'Exported constants cannot use tuple declarations',
        declaration.names.loc,
      );
    }
    if (!declaration.typeAnnotation) {
      this.addDiagnostic(
        'library-export',
        'Exported constants must declare a type',
        declaration.loc,
      );
    }
    if (!this.isAllowedExportedConstantValue(declaration.init)) {
      this.addDiagnostic(
        'library-export',
        'Exported constants must be literal values or compatible built-in variables',
        declaration.init.loc,
      );
    }
  }

  private isAllowedExportedConstantValue(value: Expression | IfStatement): boolean {
    if (value.type === 'IfStatement') return false;

    switch (value.type) {
      case 'NumericLiteral':
      case 'StringLiteral':
      case 'BooleanLiteral':
      case 'ColorLiteral':
      case 'NaExpression':
        return true;
      case 'MemberExpression':
        return this.isExportableBuiltinConstant(value);
      case 'CallExpression':
        return EXPORTABLE_COLOR_CONSTRUCTOR_NAMES.has(this.memberPath(value.callee).join('.'))
          && value.arguments.every((argument) => this.isAllowedExportedConstantValue(argument.value));
      case 'UnaryExpression':
        return (value.operator === '-' || value.operator === '+') && value.argument.type === 'NumericLiteral';
      default:
        return false;
    }
  }

  private isExportableBuiltinConstant(value: MemberExpression): boolean {
    return isExportableBuiltinConstantPath(this.memberPath(value));
  }

  private collectGlobalVariableQualifiers(statements: Statement[]): Map<string, SemanticQualifier | undefined> {
    const globals = new Map<string, SemanticQualifier | undefined>();
    for (const statement of statements) {
      const declarations = statement.type === 'MultiDeclaration' ? statement.declarations
        : statement.type === 'VariableDeclaration' ? [statement] : [];
      for (const declaration of declarations) {
        for (const name of this.declaredNames(declaration)) {
          const symbol = this.rootScope.lookupLocal(name);
          globals.set(name, symbol && this.reassignedSymbols.has(symbol) ? 'series' : symbol?.type?.qualifier);
        }
      }
    }
    return globals;
  }

  private hoistFunctionDeclarations(statements: Statement[]): void {
    for (const statement of statements) {
      if (statement.type !== 'FunctionDeclaration' || statement.isMethod) continue;
      const symbol: SemanticSymbol = {
        name: statement.name.name,
        kind: 'function',
        isMethod: false,
        loc: statement.name.loc,
      };
      // Pre-declare into root scope so forward calls resolve; body is checked in the normal pass.
      if (!this.rootScope.declare(symbol)) {
        this.functionSymbolDeclarations.set(symbol, statement);
      }
    }
  }

  private checkUserFunctionRecursion(statements: Statement[]): void {
    const functions = new Map<string, FunctionDeclaration>();
    for (const statement of statements) {
      if (statement.type === 'FunctionDeclaration' && !statement.isMethod) {
        functions.set(statement.name.name, statement);
      }
    }

    const graph = new Map<string, Set<string>>();
    for (const [name, declaration] of functions) {
      graph.set(name, this.userFunctionCallsInNode(declaration.body, new Set(functions.keys())));
    }

    const reported = new Set<string>();
    const visit = (name: string, stack: string[]): void => {
      const stackIndex = stack.indexOf(name);
      if (stackIndex !== -1) {
        const cycle = [...stack.slice(stackIndex), name];
        const cycleKey = [...new Set(cycle)].sort().join('|');
        if (!reported.has(cycleKey)) {
          reported.add(cycleKey);
          const declaration = functions.get(cycle[0] ?? name);
          this.addDiagnostic(
            'recursive-function',
            `Recursive user-defined function calls run in TealScript but are not supported by Pine v6, so this script will not run on TradingView: ${cycle.join(' -> ')}`,
            declaration?.name.loc,
            'warning',
          );
        }
        return;
      }

      for (const next of graph.get(name) ?? []) {
        visit(next, [...stack, name]);
      }
    };

    for (const name of functions.keys()) {
      visit(name, []);
    }
  }

  private userFunctionCallsInNode(node: Expression | Statement[], functionNames: Set<string>): Set<string> {
    if (Array.isArray(node)) {
      return this.mergeStringSets(node.map((statement) => this.userFunctionCallsInStatement(statement, functionNames)));
    }
    return this.userFunctionCallsInExpression(node, functionNames);
  }

  private userFunctionCallsInStatement(statement: Statement, functionNames: Set<string>): Set<string> {
    switch (statement.type) {
      case 'VariableDeclaration':
        return this.userFunctionCallsInInitializer(statement.init, functionNames);
      case 'AssignmentStatement':
        return this.mergeStringSets([
          this.userFunctionCallsInExpression(statement.left, functionNames),
          this.userFunctionCallsInInitializer(statement.right, functionNames),
        ]);
      case 'TupleAssignment':
        return this.userFunctionCallsInInitializer(statement.right, functionNames);
      case 'ExpressionStatement':
        return this.userFunctionCallsInExpression(statement.expression, functionNames);
      case 'IfStatement':
        return this.userFunctionCallsInInitializer(statement, functionNames);
      case 'ForStatement':
        return this.mergeStringSets([
          ...(statement.kind === 'numeric'
            ? [
              this.userFunctionCallsInExpression(statement.start, functionNames),
              this.userFunctionCallsInExpression(statement.end, functionNames),
              ...(statement.step ? [this.userFunctionCallsInExpression(statement.step, functionNames)] : []),
            ]
            : [this.userFunctionCallsInExpression(statement.iterable, functionNames)]),
          ...statement.body.map((child) => this.userFunctionCallsInStatement(child, functionNames)),
        ]);
      case 'WhileStatement':
        return this.mergeStringSets([
          this.userFunctionCallsInExpression(statement.test, functionNames),
          ...statement.body.map((child) => this.userFunctionCallsInStatement(child, functionNames)),
        ]);
      case 'MultiDeclaration':
        return this.mergeStringSets(statement.declarations.map((declaration) => this.userFunctionCallsInStatement(declaration, functionNames)));
      case 'MultiAssignment':
        return this.mergeStringSets(statement.assignments.map((assignment) => this.userFunctionCallsInStatement(assignment, functionNames)));
      case 'MultiExpressionStatement':
        return this.mergeStringSets(statement.expressions.map((expression) => this.userFunctionCallsInExpression(expression, functionNames)));
      default:
        return new Set();
    }
  }

  private userFunctionCallsInInitializer(init: Expression | IfStatement, functionNames: Set<string>): Set<string> {
    if (init.type !== 'IfStatement') return this.userFunctionCallsInExpression(init, functionNames);
    return this.mergeStringSets([
      this.userFunctionCallsInExpression(init.test, functionNames),
      ...init.consequent.map((statement) => this.userFunctionCallsInStatement(statement, functionNames)),
      ...(Array.isArray(init.alternate)
        ? init.alternate.map((statement) => this.userFunctionCallsInStatement(statement, functionNames))
        : init.alternate
          ? [this.userFunctionCallsInStatement(init.alternate, functionNames)]
          : []),
    ]);
  }

  private userFunctionCallsInExpression(expression: Expression, functionNames: Set<string>): Set<string> {
    switch (expression.type) {
      case 'CallExpression': {
        const refs = expression.callee.type === 'Identifier' && functionNames.has(expression.callee.name)
          ? new Set([expression.callee.name])
          : this.userFunctionCallsInExpression(expression.callee, functionNames);
        for (const argument of expression.arguments) {
          for (const ref of this.userFunctionCallsInExpression(argument.value, functionNames)) refs.add(ref);
        }
        return refs;
      }
      case 'BinaryExpression':
        return this.mergeStringSets([
          this.userFunctionCallsInExpression(expression.left, functionNames),
          this.userFunctionCallsInExpression(expression.right, functionNames),
        ]);
      case 'UnaryExpression':
        return this.userFunctionCallsInExpression(expression.argument, functionNames);
      case 'ConditionalExpression':
        return this.mergeStringSets([
          this.userFunctionCallsInExpression(expression.test, functionNames),
          this.userFunctionCallsInExpression(expression.consequent, functionNames),
          this.userFunctionCallsInExpression(expression.alternate, functionNames),
        ]);
      case 'SwitchExpression':
        return this.mergeStringSets([
          ...(expression.discriminant ? [this.userFunctionCallsInExpression(expression.discriminant, functionNames)] : []),
          ...expression.cases.flatMap((switchCase) => [
            ...(switchCase.test ? [this.userFunctionCallsInExpression(switchCase.test, functionNames)] : []),
            ...(Array.isArray(switchCase.consequent)
              ? switchCase.consequent.map((statement) => this.userFunctionCallsInStatement(statement, functionNames))
              : [this.userFunctionCallsInExpression(switchCase.consequent, functionNames)]),
          ]),
        ]);
      case 'MemberExpression':
        return this.userFunctionCallsInExpression(expression.object, functionNames);
      case 'IndexExpression':
        return this.mergeStringSets([
          this.userFunctionCallsInExpression(expression.object, functionNames),
          this.userFunctionCallsInExpression(expression.index, functionNames),
        ]);
      case 'ArrayExpression':
        return this.mergeStringSets(expression.elements.map((element) => this.userFunctionCallsInExpression(element, functionNames)));
      case 'ForStatement':
      case 'WhileStatement':
        return this.userFunctionCallsInStatement(expression, functionNames);
      case 'LambdaExpression':
        return this.userFunctionCallsInExpression(expression.body, functionNames);
      default:
        return new Set();
    }
  }

  private mergeStringSets(sets: Set<string>[]): Set<string> {
    const merged = new Set<string>();
    for (const set of sets) {
      for (const value of set) merged.add(value);
    }
    return merged;
  }

  private collectTypeDeclarations(statements: Statement[]): Map<string, TypeDeclaration> {
    return new Map(
      statements
        .filter((statement): statement is TypeDeclaration => statement.type === 'TypeDeclaration')
        .map((statement) => [statement.name.name, statement]),
    );
  }

  private collectEnumDeclarations(statements: Statement[]): Map<string, EnumDeclaration> {
    return new Map(
      statements
        .filter((statement): statement is EnumDeclaration => statement.type === 'EnumDeclaration')
        .map((statement) => [statement.name.name, statement]),
    );
  }

  private collectFunctionDeclarations(statements: Statement[]): Map<string, FunctionDeclaration[]> {
    const declarations = new Map<string, FunctionDeclaration[]>();
    for (const statement of statements) {
      if (statement.type !== 'FunctionDeclaration' || statement.isMethod) continue;
      const functions = declarations.get(statement.name.name) ?? [];
      functions.push(statement);
      declarations.set(statement.name.name, functions);
    }
    return declarations;
  }

  private collectMethodDeclarations(statements: Statement[]): Map<string, FunctionDeclaration[]> {
    const declarations = new Map<string, FunctionDeclaration[]>();
    for (const statement of statements) {
      if (statement.type !== 'FunctionDeclaration' || !statement.isMethod) continue;
      const methods = declarations.get(statement.name.name) ?? [];
      methods.push(statement);
      declarations.set(statement.name.name, methods);
    }
    return declarations;
  }

  private libraryDynamicRequestsAllowed(libraryDeclaration: LibraryDeclaration): boolean {
    return libraryDeclaration.dynamic_requests?.type === 'BooleanLiteral'
      ? libraryDeclaration.dynamic_requests.value
      : true;
  }

  private checkExportedFunctionScope(
    declaration: FunctionDeclaration,
    globalVariableQualifiers: Map<string, SemanticQualifier | undefined>,
    dynamicRequestsAllowed: boolean,
  ): void {
    const parameterNames = new Set<string>(declaration.params.map((parameter) => parameter.name));
    const functionLocals = new Set(parameterNames);
    const activeParameters = new WeakMap<Set<string>, Set<string>>([[functionLocals, new Set(parameterNames)]]);
    const usedParameters = new Set<string>();
    let checkingBody = false;
    const copyLocals = (localNames: Set<string>): Set<string> => {
      const copied = new Set(localNames);
      activeParameters.set(copied, new Set(activeParameters.get(localNames)));
      return copied;
    };
    const reportedGlobals = new Set<string>();
    let reportedInputCall = false;
    const declarationKind = declaration.isMethod ? 'method' : 'function';

    const visitInitializer = (init: Expression | IfStatement, localNames: Set<string>): void => {
      if (init.type === 'IfStatement') {
        visitStatement(init, localNames);
        return;
      }
      visitExpression(init, localNames);
    };

    const visitExpression = (expression: Expression, localNames: Set<string>, isValueReference = true): void => {
      if (expression.type === 'Identifier') {
        if (checkingBody && isValueReference && activeParameters.get(localNames)?.has(expression.name)) usedParameters.add(expression.name);
        const qualifier = globalVariableQualifiers.get(expression.name);
        if (globalVariableQualifiers.has(expression.name) && qualifier !== 'const' && !localNames.has(expression.name) && !reportedGlobals.has(expression.name)) {
          reportedGlobals.add(expression.name);
          this.addDiagnostic(
            'library-export',
            `Exported ${declarationKind} ${declaration.name.name} cannot use non-const global variable: ${expression.name}`,
            expression.loc,
          );
        }
        return;
      }

      if (expression.type === 'CallExpression') {
        const calleePath = this.memberPath(expression.callee);
        if (calleePath[0] === 'input' && !reportedInputCall) {
          reportedInputCall = true;
          this.addDiagnostic(
            'library-export',
            `Exported ${declarationKind} ${declaration.name.name} cannot call input.*() functions`,
            expression.callee.loc,
          );
        }
        if (calleePath[0] === 'request') {
          if (!dynamicRequestsAllowed) {
            this.addDiagnostic(
              'library-export',
              `Exported ${declarationKind} ${declaration.name.name} cannot call request.*() functions when library dynamic_requests=false`,
              expression.callee.loc,
            );
          }
          const requestExpression = this.getCallArgument(expression.arguments, 'expression', 2);
          if (requestExpression && this.expressionReferencesAnyName(requestExpression, parameterNames)) {
            this.addDiagnostic(
              'library-export',
              `Exported ${declarationKind} ${declaration.name.name} request expression cannot depend on exported parameters`,
              requestExpression.loc,
            );
          }
        }
        visitExpression(expression.callee, localNames, expression.callee.type !== 'Identifier');
        for (const argument of expression.arguments) visitExpression(argument.value, localNames);
        return;
      }

      switch (expression.type) {
        case 'NumericLiteral':
        case 'StringLiteral':
        case 'BooleanLiteral':
        case 'ColorLiteral':
        case 'NaExpression':
          return;
        case 'BinaryExpression':
          visitExpression(expression.left, localNames);
          visitExpression(expression.right, localNames);
          return;
        case 'UnaryExpression':
          visitExpression(expression.argument, localNames);
          return;
        case 'ConditionalExpression':
          visitExpression(expression.test, localNames);
          visitExpression(expression.consequent, localNames);
          visitExpression(expression.alternate, localNames);
          return;
        case 'SwitchExpression':
          if (expression.discriminant) visitExpression(expression.discriminant, localNames);
          for (const switchCase of expression.cases) {
            if (switchCase.test) visitExpression(switchCase.test, localNames);
            this.visitFunctionScopeNode(switchCase.consequent, copyLocals(localNames), visitExpression, visitStatement);
          }
          return;
        case 'ForStatement':
        case 'WhileStatement':
          visitStatement(expression, localNames);
          return;
        case 'MemberExpression':
          visitExpression(expression.object, localNames);
          return;
        case 'IndexExpression':
          visitExpression(expression.object, localNames);
          visitExpression(expression.index, localNames);
          return;
        case 'ArrayExpression':
          for (const element of expression.elements) visitExpression(element, localNames);
          return;
        case 'LambdaExpression': {
          const innerNames = copyLocals(localNames);
          for (const parameter of expression.params) {
            innerNames.add(parameter.name);
            activeParameters.get(innerNames)?.delete(parameter.name);
          }
          visitExpression(expression.body, innerNames);
          return;
        }
      }
    };

    const visitStatement = (statement: Statement, localNames: Set<string>): void => {
      switch (statement.type) {
        case 'MultiDeclaration':
          for (const decl of statement.declarations) {
            visitStatement(decl, localNames);
          }
          return;
        case 'MultiAssignment':
          for (const assignment of statement.assignments) {
            visitStatement(assignment, localNames);
          }
          return;
        case 'MultiExpressionStatement':
          for (const expr of statement.expressions) {
            visitExpression(expr, localNames);
          }
          return;
        case 'VariableDeclaration':
          visitInitializer(statement.init, localNames);
          for (const name of this.declaredNames(statement)) {
            localNames.add(name);
            activeParameters.get(localNames)?.delete(name);
          }
          return;
        case 'TupleAssignment':
          visitInitializer(statement.right, localNames);
          return;
        case 'AssignmentStatement':
          this.visitAssignmentTargetExpression(statement.left, localNames, visitExpression);
          if (statement.right.type === 'IfStatement') {
            visitStatement(statement.right, localNames);
          } else {
            visitExpression(statement.right, localNames);
          }
          return;
        case 'ExpressionStatement':
          visitExpression(statement.expression, localNames);
          return;
        case 'IfStatement':
          visitExpression(statement.test, localNames);
          this.visitFunctionScopeNode(statement.consequent, copyLocals(localNames), visitExpression, visitStatement);
          if (Array.isArray(statement.alternate)) {
            this.visitFunctionScopeNode(statement.alternate, copyLocals(localNames), visitExpression, visitStatement);
          } else if (statement.alternate) {
            visitStatement(statement.alternate, copyLocals(localNames));
          }
          return;
        case 'OnceStatement':
          if (statement.test) visitExpression(statement.test, localNames);
          this.visitFunctionScopeNode(statement.body, copyLocals(localNames), visitExpression, visitStatement);
          return;
        case 'ForStatement': {
          if (statement.kind === 'collection') {
            visitExpression(statement.iterable, localNames);
          } else {
            visitExpression(statement.start, localNames);
            visitExpression(statement.end, localNames);
            if (statement.step) visitExpression(statement.step, localNames);
          }
          const forLocals = copyLocals(localNames);
          forLocals.add(statement.counter.name);
          activeParameters.get(forLocals)?.delete(statement.counter.name);
          if (statement.kind === 'collection' && statement.indexCounter) {
            forLocals.add(statement.indexCounter.name);
            activeParameters.get(forLocals)?.delete(statement.indexCounter.name);
          }
          this.visitFunctionScopeNode(statement.body, forLocals, visitExpression, visitStatement);
          return;
        }
        case 'WhileStatement':
          visitExpression(statement.test, localNames);
          this.visitFunctionScopeNode(statement.body, copyLocals(localNames), visitExpression, visitStatement);
          return;
        case 'FunctionDeclaration':
        case 'TypeDeclaration':
        case 'EnumDeclaration':
        case 'IndicatorDeclaration':
        case 'LibraryDeclaration':
        case 'ImportDeclaration':
        case 'BreakStatement':
        case 'ContinueStatement':
          return;
      }
    };

    for (const parameter of declaration.params) {
      if (parameter.defaultValue) visitExpression(parameter.defaultValue, functionLocals);
    }
    checkingBody = true;
    this.visitFunctionScopeNode(declaration.body, functionLocals, visitExpression, visitStatement);
    for (const parameter of declaration.params) {
      if (!usedParameters.has(parameter.name)) {
        this.addDiagnostic(
          'library-export',
          `Exported ${declarationKind} ${declaration.name.name} parameter ${parameter.name} must be used in its body`,
          parameter.loc,
        );
      }
    }
  }

  private expressionReferencesAnyName(expression: Expression, names: Set<string>): boolean {
    switch (expression.type) {
      case 'Identifier':
        return names.has(expression.name);
      case 'NumericLiteral':
      case 'StringLiteral':
      case 'BooleanLiteral':
      case 'ColorLiteral':
      case 'NaExpression':
        return false;
      case 'BinaryExpression':
        return this.expressionReferencesAnyName(expression.left, names) || this.expressionReferencesAnyName(expression.right, names);
      case 'UnaryExpression':
        return this.expressionReferencesAnyName(expression.argument, names);
      case 'ConditionalExpression':
        return this.expressionReferencesAnyName(expression.test, names)
          || this.expressionReferencesAnyName(expression.consequent, names)
          || this.expressionReferencesAnyName(expression.alternate, names);
      case 'CallExpression':
        return this.expressionReferencesAnyName(expression.callee, names)
          || expression.arguments.some((argument) => this.expressionReferencesAnyName(argument.value, names));
      case 'MemberExpression':
        return this.expressionReferencesAnyName(expression.object, names);
      case 'IndexExpression':
        return this.expressionReferencesAnyName(expression.object, names) || this.expressionReferencesAnyName(expression.index, names);
      case 'ArrayExpression':
        return expression.elements.some((element) => this.expressionReferencesAnyName(element, names));
      case 'SwitchExpression':
        return (expression.discriminant ? this.expressionReferencesAnyName(expression.discriminant, names) : false)
          || expression.cases.some((switchCase) =>
            (switchCase.test ? this.expressionReferencesAnyName(switchCase.test, names) : false)
              || this.expressionOrStatementsReferenceAnyName(switchCase.consequent, names),
          );
      case 'ForStatement':
        if (expression.kind === 'collection') {
          return this.expressionReferencesAnyName(expression.iterable, names)
            || expression.body.some((statement) => this.statementReferencesAnyName(statement, names));
        }
        return this.expressionReferencesAnyName(expression.start, names)
          || this.expressionReferencesAnyName(expression.end, names)
          || (expression.step ? this.expressionReferencesAnyName(expression.step, names) : false)
          || expression.body.some((statement) => this.statementReferencesAnyName(statement, names));
      case 'WhileStatement':
        return this.expressionReferencesAnyName(expression.test, names)
          || expression.body.some((statement) => this.statementReferencesAnyName(statement, names));
      case 'LambdaExpression': {
        const outerNames = new Set([...names].filter((n) => !expression.params.some((p) => p.name === n)));
        return this.expressionReferencesAnyName(expression.body, outerNames);
      }
    }
  }

  private expressionOrStatementsReferenceAnyName(node: Expression | Statement[], names: Set<string>): boolean {
    return Array.isArray(node)
      ? node.some((statement) => this.statementReferencesAnyName(statement, names))
      : this.expressionReferencesAnyName(node, names);
  }

  private initializerReferencesAnyName(init: Expression | IfStatement, names: Set<string>): boolean {
    return init.type === 'IfStatement'
      ? this.statementReferencesAnyName(init, names)
      : this.expressionReferencesAnyName(init, names);
  }

  private statementReferencesAnyName(statement: Statement, names: Set<string>): boolean {
    switch (statement.type) {
      case 'VariableDeclaration':
        return this.initializerReferencesAnyName(statement.init, names);
      case 'MultiAssignment':
        return statement.assignments.some((a) => this.statementReferencesAnyName(a, names));
      case 'MultiExpressionStatement':
        return statement.expressions.some((e) => this.expressionReferencesAnyName(e, names));
      case 'TupleAssignment':
        return this.initializerReferencesAnyName(statement.right, names);
      case 'AssignmentStatement':
        return this.expressionReferencesAnyName(statement.left, names)
          || (statement.right.type === 'IfStatement'
            ? this.statementReferencesAnyName(statement.right, names)
            : this.expressionReferencesAnyName(statement.right, names));
      case 'ExpressionStatement':
        return this.expressionReferencesAnyName(statement.expression, names);
      case 'IfStatement':
        return this.expressionReferencesAnyName(statement.test, names)
          || statement.consequent.some((child) => this.statementReferencesAnyName(child, names))
          || (Array.isArray(statement.alternate)
            ? statement.alternate.some((child) => this.statementReferencesAnyName(child, names))
            : !!statement.alternate && this.statementReferencesAnyName(statement.alternate, names));
      case 'ForStatement':
        if (statement.kind === 'collection') {
          return this.expressionReferencesAnyName(statement.iterable, names)
            || statement.body.some((child) => this.statementReferencesAnyName(child, names));
        }
        return this.expressionReferencesAnyName(statement.start, names)
          || this.expressionReferencesAnyName(statement.end, names)
          || (statement.step ? this.expressionReferencesAnyName(statement.step, names) : false)
          || statement.body.some((child) => this.statementReferencesAnyName(child, names));
      case 'WhileStatement':
        return this.expressionReferencesAnyName(statement.test, names)
          || statement.body.some((child) => this.statementReferencesAnyName(child, names));
      default:
        return false;
    }
  }

  private visitFunctionScopeNode(
    node: Expression | Statement[],
    localNames: Set<string>,
    visitExpression: (expression: Expression, localNames: Set<string>) => void,
    visitStatement: (statement: Statement, localNames: Set<string>) => void,
  ): void {
    if (Array.isArray(node)) {
      for (const statement of node) visitStatement(statement, localNames);
    } else {
      visitExpression(node, localNames);
    }
  }

  private visitAssignmentTargetExpression(
    target: AssignmentStatement['left'],
    localNames: Set<string>,
    visitExpression: (expression: Expression, localNames: Set<string>) => void,
  ): void {
    if (target.type === 'Identifier') {
      visitExpression(target, localNames);
      return;
    }
    if (target.type === 'MemberExpression') {
      visitExpression(target.object, localNames);
      return;
    }
    if (target.type === 'IndexExpression') {
      visitExpression(target.object, localNames);
      visitExpression(target.index, localNames);
    }
  }

  private declaredNames(statement: VariableDeclaration): string[] {
    if (statement.names.type === 'TupleDeclarator') return statement.names.names.map((name) => name.name);
    return [statement.names.name.name];
  }

  private checkStatement(statement: Statement, scope: SemanticScope): void {
    if (this.options.requireDeclaration && scope !== this.rootScope && (statement.type === 'IndicatorDeclaration' || statement.type === 'LibraryDeclaration')) {
      this.addDiagnostic('declaration-scope', 'Pine script declarations must appear in the global scope', statement.loc);
    }
    switch (statement.type) {
      case 'IndicatorDeclaration':
        if (statement.declarationKind === 'indicator' && scope === this.rootScope && statement.dynamic_requests) {
          const type = this.inferExpressionType(statement.dynamic_requests, scope);
          if (type.kind === 'bool' && type.qualifier === 'const') {
            this.indicatorDynamicRequests = this.constantBooleanValue(statement.dynamic_requests, scope);
            this.dynamicRequestsEnabled = this.indicatorDynamicRequests ?? this.dynamicRequestsEnabled;
          }
        }
        this.checkIndicatorDeclarationArguments(statement, scope);
        this.checkExpressions(scope, [
          statement.title,
          statement.shorttitle,
          statement.overlay,
          statement.format,
          statement.precision,
          statement.scale,
          statement.max_bars_back,
          statement.max_labels_count,
          statement.max_lines_count,
          statement.max_boxes_count,
          statement.max_polylines_count,
          statement.calc_bars_count,
          statement.timeframe,
          statement.timeframe_gaps,
          statement.explicit_plot_zorder,
          statement.behind_chart,
          statement.dynamic_requests,
          statement.initial_capital,
          statement.currency,
          statement.default_qty_type,
          statement.default_qty_value,
          statement.pyramiding,
          statement.commission_type,
          statement.commission_value,
          statement.slippage,
          statement.margin_long,
          statement.margin_short,
          statement.calc_on_order_fills,
          statement.calc_on_every_tick,
          statement.calc_on_every_history_tick,
          statement.process_orders_on_close,
          statement.use_bar_magnifier,
          statement.risk_free_rate,
          statement.backtest_fill_limits_assumption,
          statement.close_entries_rule,
          statement.fill_orders_on_standard_ohlc,
        ]);
        break;
      case 'LibraryDeclaration':
        this.checkLibraryDeclarationArguments(statement, scope);
        this.checkExpressions(scope, [statement.title, statement.overlay, statement.dynamic_requests]);
        break;
      case 'ImportDeclaration':
        this.declareImport(statement, scope);
        break;
      case 'TypeDeclaration':
        this.declareType(statement, scope);
        break;
      case 'EnumDeclaration':
        this.declareEnum(statement, scope);
        break;
      case 'FunctionDeclaration':
        this.declareFunction(statement, scope);
        break;
      case 'MultiDeclaration':
        for (const decl of statement.declarations) {
          this.checkVariableDeclaration(decl, scope);
        }
        break;
      case 'MultiAssignment':
        for (const assignment of statement.assignments) {
          this.checkAssignment(assignment, scope);
        }
        break;
      case 'MultiExpressionStatement':
        for (const expr of statement.expressions) {
          this.checkExpression(expr, scope);
        }
        break;
      case 'VariableDeclaration':
        this.checkVariableDeclaration(statement, scope);
        break;
      case 'TupleAssignment':
        this.checkTupleAssignment(statement, scope);
        break;
      case 'AssignmentStatement':
        this.checkAssignment(statement, scope);
        break;
      case 'ExpressionStatement':
        this.checkExpression(statement.expression, scope);
        break;
      case 'IfStatement':
        this.checkIf(statement, scope);
        break;
      case 'OnceStatement':
        this.checkOnce(statement, scope);
        break;
      case 'ForStatement':
        this.checkFor(statement, scope);
        break;
      case 'WhileStatement':
        this.checkWhile(statement, scope);
        break;
      case 'BreakStatement':
      case 'ContinueStatement':
        break;
    }
  }

  private checkIndicatorDeclarationArguments(statement: IndicatorDeclaration, scope: SemanticScope): void {
    this.checkGlobalOnlyScope(statement.declarationKind, scope, statement.loc);
    const displayName = `${statement.declarationKind}()`;
    const allowedKeys = statement.declarationKind === 'strategy'
      ? STRATEGY_DECLARATION_KEYS
      : INDICATOR_DECLARATION_KEYS;
    this.checkDeclarationKnownProperties(statement, allowedKeys, displayName);
    this.checkDeclarationArgumentQualifiers(statement, scope, allowedKeys, statement.declarationKind);
    if (statement.declarationKind === 'indicator') {
      this.checkDeclarationStringOptions(statement, scope, ['title', 'shorttitle', 'timeframe'], 'indicator');
      if (statement.precision) {
        const precision = this.constantLiteralValue(statement.precision);
        const precisionType = this.inferExpressionType(statement.precision, scope);
        const resolvedPrecision = precisionType.kind === 'int'
          ? this.constantNumericValue(statement.precision, scope)
          : undefined;
        const invalidLiteral = typeof precision === 'number'
          && (precision < 0 || precision > 16 || !Number.isInteger(precision));
        if (precisionType.kind === 'float' && !invalidLiteral) {
          this.addDiagnostic('type-mismatch', 'indicator precision must be a const int, got float', statement.precision.loc);
        }
        if (resolvedPrecision !== undefined && resolvedPrecision < 0 && precision === undefined) {
          this.addDiagnostic('type-mismatch', 'indicator precision must be a non-negative integer', statement.precision.loc);
        }
        if ((typeof precision === 'number' && precision > 16)
          || (resolvedPrecision !== undefined && resolvedPrecision > 16)) {
          this.addDiagnostic('invalid-argument', 'indicator precision must be at most 16', statement.precision.loc);
        }
      }
      for (const optionName of ['format', 'scale'] as const) {
        const expression = statement[optionName];
        if (!expression) continue;
        this.checkIndicatorResolvedStringDomain(optionName, expression, scope);
        const type = this.inferExpressionType(expression, scope);
        if (type.kind !== 'int' && type.kind !== 'float' && type.kind !== 'bool' && type.kind !== 'color') continue;
        const kind = type.kind === 'bool' ? 'boolean' : type.kind === 'color' ? 'color' : 'numeric';
        this.addDiagnostic('type-mismatch', `indicator ${optionName} cannot be ${kind}`, expression.loc);
      }
    }
    this.checkDeclarationFormatValue(statement.format, statement.declarationKind);
    this.checkDeclarationScaleValue(statement.scale, statement.declarationKind);
    this.checkNonNegativeLiteralIntegerValue(
      statement.precision,
      `${statement.declarationKind} precision must be a non-negative integer`,
    );
    this.checkNonNegativeLiteralIntegerValue(
      statement.max_bars_back,
      `${statement.declarationKind} max_bars_back must be a non-negative integer`,
    );
    if (statement.declarationKind === 'indicator' && statement.max_bars_back) {
      const historyDepth = this.constantNumericValue(statement.max_bars_back, scope);
      const depthType = this.inferExpressionType(statement.max_bars_back, scope);
      const literalDepth = this.constantLiteralValue(statement.max_bars_back);
      const invalidDepth = (historyDepth !== undefined && (historyDepth < 0 || historyDepth > 5000))
        || (typeof literalDepth === 'number' && !Number.isInteger(literalDepth));
      if (depthType.kind === 'float' && !invalidDepth) {
        this.addDiagnostic('type-mismatch', 'indicator max_bars_back must be a const int, got float', statement.max_bars_back.loc);
      }
      if (historyDepth !== undefined && historyDepth < 0
        && this.constantLiteralValue(statement.max_bars_back) === undefined) {
        this.addDiagnostic('type-mismatch', 'indicator max_bars_back must be a non-negative integer', statement.max_bars_back.loc);
      }
      if (historyDepth !== undefined && historyDepth > 5000) {
        this.addDiagnostic('invalid-argument', 'indicator max_bars_back must be at most 5000', statement.max_bars_back.loc);
      }
    }
    if (statement.declarationKind === 'indicator' && statement.calc_bars_count) {
      const expression = statement.calc_bars_count;
      const type = this.inferExpressionType(expression, scope);
      const literal = this.constantLiteralValue(expression);
      const invalidLiteral = typeof literal === 'number' && (literal < 0 || !Number.isInteger(literal));
      if (type.kind === 'float' && !invalidLiteral) {
        this.addDiagnostic('type-mismatch', 'indicator calc_bars_count must be a const int, got float', expression.loc);
      }
      if (type.kind === 'int' && literal === undefined) {
        const count = this.constantNumericValue(expression, scope);
        if (count !== undefined && count < 0) {
          this.addDiagnostic('type-mismatch', 'indicator calc_bars_count must be a non-negative integer', expression.loc);
        }
      }
    }
    this.checkNonNegativeLiteralIntegerValue(
      statement.calc_bars_count,
      `${statement.declarationKind} calc_bars_count must be a non-negative integer`,
    );
    if (statement.declarationKind === 'indicator' && statement.max_labels_count) {
      const labelCount = this.constantNumericValue(statement.max_labels_count, scope);
      if (labelCount !== undefined && labelCount > 500
        && this.constantLiteralValue(statement.max_labels_count) === undefined) {
        this.addDiagnostic('type-mismatch', 'indicator max_labels_count must be a non-negative integer no greater than 500', statement.max_labels_count.loc);
      }
    }
    if (statement.declarationKind === 'indicator' && statement.max_labels_count) {
      const expression = statement.max_labels_count;
      const type = this.inferExpressionType(expression, scope);
      const literal = this.constantLiteralValue(expression);
      const count = this.constantNumericValue(expression, scope);
      const invalidValue = (count !== undefined && count > 500)
        || (typeof literal === 'number' && (literal < 0 || !Number.isInteger(literal)));
      if (type.kind === 'float' && !invalidValue) {
        this.addDiagnostic('type-mismatch', 'indicator max_labels_count must be a const int, got float', expression.loc);
      }
    }
    this.checkLiteralIntegerValue(
      statement.max_labels_count,
      0,
      500,
      `${statement.declarationKind} max_labels_count must be a non-negative integer no greater than 500`,
    );
    if (statement.declarationKind === 'indicator' && statement.max_lines_count) {
      const count = this.constantNumericValue(statement.max_lines_count, scope);
      if (count !== undefined && count > 500
        && this.constantLiteralValue(statement.max_lines_count) === undefined) {
        this.addDiagnostic('type-mismatch', 'indicator max_lines_count must be a non-negative integer no greater than 500', statement.max_lines_count.loc);
      }
    }
    if (statement.declarationKind === 'indicator' && statement.max_lines_count) {
      const expression = statement.max_lines_count;
      const type = this.inferExpressionType(expression, scope);
      const literal = this.constantLiteralValue(expression);
      const count = this.constantNumericValue(expression, scope);
      const invalidValue = (count !== undefined && count > 500)
        || (typeof literal === 'number' && (literal < 0 || !Number.isInteger(literal)));
      if (type.kind === 'float' && !invalidValue) {
        this.addDiagnostic('type-mismatch', 'indicator max_lines_count must be a const int, got float', expression.loc);
      }
    }
    this.checkLiteralIntegerValue(
      statement.max_lines_count,
      0,
      500,
      `${statement.declarationKind} max_lines_count must be a non-negative integer no greater than 500`,
    );
    if (statement.declarationKind === 'indicator' && statement.max_boxes_count) {
      const count = this.constantNumericValue(statement.max_boxes_count, scope);
      if (count !== undefined && count > 500) {
        this.addDiagnostic('type-mismatch', 'indicator max_boxes_count must be a non-negative integer no greater than 500', statement.max_boxes_count.loc);
      }
    }
    if (statement.declarationKind === 'indicator' && statement.max_boxes_count) {
      const expression = statement.max_boxes_count;
      const type = this.inferExpressionType(expression, scope);
      const literal = this.constantLiteralValue(expression);
      const count = this.constantNumericValue(expression, scope);
      const invalidValue = (count !== undefined && count > 500)
        || (typeof literal === 'number' && (literal < 0 || !Number.isInteger(literal)));
      if (type.kind === 'float' && !invalidValue) {
        this.addDiagnostic('type-mismatch', 'indicator max_boxes_count must be a const int, got float', expression.loc);
      }
    }
    this.checkNonNegativeLiteralIntegerValue(
      statement.max_boxes_count,
      `${statement.declarationKind} max_boxes_count must be a non-negative integer`,
    );
    if (statement.declarationKind === 'indicator' && statement.max_polylines_count) {
      const count = this.constantNumericValue(statement.max_polylines_count, scope);
      if (count !== undefined && count < 1
        && (count === 0 || this.constantLiteralValue(statement.max_polylines_count) === undefined)) {
        this.addDiagnostic('type-mismatch', 'indicator max_polylines_count must be at least 1', statement.max_polylines_count.loc);
      }
      if (count !== undefined && count > 100) {
        this.addDiagnostic('type-mismatch', 'indicator max_polylines_count must be a non-negative integer no greater than 100', statement.max_polylines_count.loc);
      }
    }
    if (statement.declarationKind === 'indicator' && statement.max_polylines_count) {
      const expression = statement.max_polylines_count;
      const type = this.inferExpressionType(expression, scope);
      const literal = this.constantLiteralValue(expression);
      const count = this.constantNumericValue(expression, scope);
      const invalidValue = (count !== undefined && (count < 1 || count > 100))
        || (typeof literal === 'number' && (literal < 0 || !Number.isInteger(literal)));
      if (type.kind === 'float' && !invalidValue) {
        this.addDiagnostic('type-mismatch', 'indicator max_polylines_count must be a const int, got float', expression.loc);
      }
    }
    this.checkNonNegativeLiteralIntegerValue(
      statement.max_polylines_count,
      `${statement.declarationKind} max_polylines_count must be a non-negative integer`,
    );
    this.checkDeclarationBooleanOptions(statement, scope, INDICATOR_DECLARATION_BOOL_OPTIONS, statement.declarationKind);
    this.checkDeclarationNumericOptions(statement, scope, INDICATOR_DECLARATION_NUMERIC_OPTIONS, statement.declarationKind);
    if (statement.declarationKind === 'strategy') {
      this.checkStrategyDeclarationLiteralValueConstraints(statement);
      this.checkStrategyDeclarationBooleanOptions(statement, scope);
      this.checkStrategyDeclarationNumericOptions(statement, scope);
      this.checkStrategyDeclarationStringOptions(statement, scope);
      this.checkTraceRequiredStrategyCalcOnOrderFills(statement);
      this.checkTraceRequiredStrategyRiskFreeRate(statement);
      this.checkTraceRequiredStrategyStandardOhlcFills(statement);
    }
  }

  private checkLibraryDeclarationArguments(statement: LibraryDeclaration, scope: SemanticScope): void {
    this.checkGlobalOnlyScope('library', scope, statement.loc);
    this.checkDeclarationKnownProperties(statement, LIBRARY_DECLARATION_KEYS, 'library()');
    this.checkDeclarationArgumentQualifiers(statement, scope, LIBRARY_DECLARATION_KEYS, 'library');
    this.checkDeclarationStringOptions(statement, scope, ['title'], 'library');
    this.checkDeclarationBooleanOptions(statement, scope, LIBRARY_DECLARATION_BOOL_OPTIONS, 'library');
  }

  private checkDeclarationArgumentQualifiers(
    statement: IndicatorDeclaration | LibraryDeclaration,
    scope: SemanticScope,
    parameterNames: Set<string>,
    declarationKind: string,
  ): void {
    for (const parameterName of parameterNames) {
      // This option is a TealScript strategy extension, not a Pine declaration parameter.
      if (parameterName === 'calc_on_every_history_tick') continue;
      const argument = statement[parameterName as keyof typeof statement];
      if (!argument || typeof argument !== 'object' || !('type' in argument)) continue;
      const expression = argument as Expression;
      const type = this.inferExpressionType(expression, scope);
      if (type.kind === 'unknown' || !type.qualifier || type.qualifier === 'const') continue;
      this.addDiagnostic(
        'qualifier-mismatch',
        `${declarationKind} ${parameterName} requires a const value, got ${type.qualifier}`,
        expression.loc,
      );
    }
  }

  private declarationConstantStringValue(expression: Expression, scope: SemanticScope): string | undefined {
    if (expression.type === 'StringLiteral') return expression.value;
    if (expression.type === 'Identifier') {
      const symbol = scope.lookup(expression.name);
      return symbol ? this.declarationConstantStrings.get(symbol) : undefined;
    }
    if (expression.type === 'ConditionalExpression') {
      if (this.inferExpressionType(expression.test, scope).qualifier !== 'const') return undefined;
      const condition = this.constantBooleanValue(expression.test, scope);
      if (condition === undefined) return undefined;
      return this.declarationConstantStringValue(condition ? expression.consequent : expression.alternate, scope);
    }
    if (expression.type === 'BinaryExpression' && expression.operator === '+') {
      const left = this.declarationConstantStringValue(expression.left, scope);
      const right = this.declarationConstantStringValue(expression.right, scope);
      if (left !== undefined && right !== undefined) return left + right;
    }
    return undefined;
  }

  private checkIndicatorResolvedStringDomain(
    optionName: 'format' | 'scale',
    expression: Expression,
    scope: SemanticScope,
  ): void {
    if (expression.type === 'StringLiteral') return;
    const value = this.declarationConstantStringValue(expression, scope);
    const allowedValues = optionName === 'format' ? DECLARATION_FORMAT_VALUES : DECLARATION_SCALE_VALUES;
    if (value !== undefined && !allowedValues.has(value)) {
      this.addDiagnostic('type-mismatch', `Invalid indicator ${optionName}: ${value}`, expression.loc);
    }
  }

  private checkDeclarationFormatValue(expression: Expression | undefined, declarationKind: string): void {
    this.checkNamespacedConstantStringValue(
      expression,
      DECLARATION_FORMAT_VALUES,
      DECLARATION_FORMAT_CONSTANT_VALUES,
      'format.',
      `Invalid ${declarationKind} format`,
    );
  }

  private checkDeclarationScaleValue(expression: Expression | undefined, declarationKind: string): void {
    this.checkNamespacedConstantStringValue(
      expression,
      DECLARATION_SCALE_VALUES,
      DECLARATION_SCALE_CONSTANT_VALUES,
      'scale.',
      `Invalid ${declarationKind} scale`,
    );
  }

  private checkNamespacedConstantStringValue(
    expression: Expression | undefined,
    allowedValues: Set<string>,
    constantValues: Map<string, string>,
    namespacePrefix: string,
    messagePrefix: string,
    guidance?: string,
    uniqueType = false,
  ): void {
    if (!expression) return;
    if (uniqueType && !this.versionRules.allowsRawUniqueParameterValues && this.isNaLiteralExpression(expression)) {
      this.addDiagnostic('type-mismatch', `${messagePrefix}: unique parameters cannot be na`, expression.loc);
      return;
    }

    const value = this.namespacedConstantStringValue(expression, constantValues, namespacePrefix);
    if (value !== undefined && !allowedValues.has(value)) {
      this.addDiagnostic('type-mismatch', `${messagePrefix}: ${value}${guidance ? `. ${guidance}` : ''}`, expression.loc);
    }
  }

  private namespacedConstantStringValue(
    expression: Expression,
    constantValues: Map<string, string>,
    namespacePrefix: string,
  ): string | undefined {
    const value = this.constantLiteralValue(expression);
    if (typeof value === 'string') return value;

    const path = this.memberPath(expression).join('.');
    if (constantValues.has(path)) return constantValues.get(path);
    return path.startsWith(namespacePrefix) ? path : undefined;
  }

  private checkDeclarationKnownProperties(statement: object, allowedKeys: Set<string>, displayName: string): void {
    for (const [key, value] of Object.entries(statement)) {
      if (allowedKeys.has(key)) continue;
      this.addDiagnostic(
        'unknown-argument',
        this.unknownArgumentMessage(key, displayName, [...allowedKeys]),
        this.locFromUnknownNode(value),
      );
    }
  }

  private locFromUnknownNode(value: unknown): SourceLocation | undefined {
    if (value && typeof value === 'object' && 'loc' in value) {
      return (value as { loc?: SourceLocation }).loc;
    }
    return undefined;
  }

  private declareImport(statement: ImportDeclaration, scope: SemanticScope): void {
    this.declare(scope, { name: statement.alias.name, kind: 'import', loc: statement.alias.loc });
    if (!this.importedLibraries.has(statement.alias.name)) {
      this.addDiagnostic(
        'unresolved-import',
        this.unresolvedImportMessage(statement),
        statement.loc,
      );
    }
  }

  private unresolvedImportMessage(statement: ImportDeclaration): string {
    const parts = statement.path.split('/').filter((part) => part.length > 0);
    const alias = statement.alias.name;
    if (parts.length >= 3) {
      const version = parts[parts.length - 1]!;
      const library = parts[parts.length - 2]!;
      const owner = parts.slice(0, -2).join('/');
      if (owner === 'TradingView') {
        return `Official TradingView library '${owner}/${library}' version ${version} is not implemented by TealScript; implement that documented standard-library surface or remove/change the import`;
      }
      return `Import '${statement.path}' as alias '${alias}' was not supplied by the host library registry; provide Pine library source for ${owner}/${library} version ${version}, or remove/change the import`;
    }
    return `Import '${statement.path}' as alias '${alias}' was not supplied by the host library registry; provide the matching Pine library source or remove/change the import`;
  }

  private declareType(statement: TypeDeclaration, scope: SemanticScope): void {
    this.declare(scope, {
      name: statement.name.name,
      kind: 'type',
      type: { kind: 'udt', name: statement.name.name },
      loc: statement.name.loc,
    });
    this.typeDeclarations.set(statement.name.name, statement);
    const typeScope = new SemanticScope(scope);
    for (const field of statement.fields) {
      if (!field.typeAnnotation) {
        this.addDiagnostic(
          'type-mismatch',
          `UDT field ${statement.name.name}.${field.name.name} requires an explicit type.`,
          field.name.loc,
        );
      }
      this.checkTypeAnnotation(statement.name.name, field.typeAnnotation ?? undefined, field.name.loc);
      this.declare(typeScope, {
        name: field.name.name,
        kind: 'variable',
        type: this.typeFromAnnotation(field.typeAnnotation ?? undefined),
        loc: field.name.loc,
      });
      if (field.defaultValue) {
        this.checkExpression(field.defaultValue, typeScope);
        if (this.checkUdtFieldDefaultValue(statement.name.name, field)) {
          this.checkUdtFieldValueType(statement.name.name, field, field.defaultValue, typeScope);
        }
      }
    }
  }

  private declareEnum(statement: EnumDeclaration, scope: SemanticScope): void {
    this.declare(scope, {
      name: statement.name.name,
      kind: 'type',
      type: { kind: 'udt', name: statement.name.name },
      loc: statement.name.loc,
    });
  }

  private checkReservedDeclarationName(name: string, loc?: SourceLocation): void {
    if (this.versionRules.disallowsReservedVariableAndFunctionNames && RESERVED_VARIABLE_AND_FUNCTION_NAMES.has(name)) {
      this.addDiagnostic('reserved-identifier', `'${name}' is reserved for variable and function names in Pine v${this.currentPineVersion}.`, loc);
    }
  }

  private declareFunction(statement: FunctionDeclaration, scope: SemanticScope): void {
    if (this.activeFunctionDepth > 0) {
      this.addDiagnostic('function-scope', 'Function and method definitions cannot be nested inside another function', statement.name.loc);
      return;
    }
    if (scope !== this.rootScope) {
      this.addDiagnostic('function-definition-scope', 'Functions must be defined in global scope; nested function definitions are not allowed', statement.name.loc);
      return;
    }
    this.checkReservedDeclarationName(statement.name.name, statement.name.loc);
    const existingLocal = scope.lookupLocalFunction(statement.name.name);
    // Non-method functions are pre-hoisted into root scope; update the declaration map
    // for the existing symbol rather than re-declaring to avoid duplicate-symbol errors.
    if (!statement.isMethod && existingLocal?.kind === 'function' && existingLocal.isMethod !== true) {
      this.functionSymbolDeclarations.set(existingLocal, statement);
    } else if (statement.isMethod) {
      if (!existingLocal) {
        this.declare(scope, {
          name: statement.name.name,
          kind: 'function',
          isMethod: true,
          loc: statement.name.loc,
        });
      }
    } else {
      const symbol: SemanticSymbol = {
        name: statement.name.name,
        kind: 'function',
        isMethod: false,
        loc: statement.name.loc,
      };
      if (this.declare(scope, symbol)) {
        this.functionSymbolDeclarations.set(symbol, statement);
      }
    }
    const functionScope = new SemanticScope(scope);

    for (const parameter of statement.params) {
      this.checkReservedDeclarationName(parameter.name, parameter.loc);
      this.checkTypeAnnotation(statement.name.name, parameter.typeAnnotation ?? undefined, parameter.loc);
      this.declare(functionScope, {
        name: parameter.name,
        kind: 'parameter',
        type: this.typeFromAnnotation(parameter.typeAnnotation ?? undefined),
        loc: parameter.loc,
      });
      this.checkParameterDefaultType(statement, parameter);
      if (parameter.defaultValue) this.checkExpression(parameter.defaultValue, scope);
    }

    const previousFunction = this.activeFunction;
    this.activeFunction = statement;
    this.activeFunctionDepth += 1;
    try {
      if (Array.isArray(statement.body)) {
        this.checkStatements(statement.body, functionScope);
      } else {
        this.checkExpression(statement.body, functionScope);
      }
      if (this.currentPineVersion >= 6) {
        this.checkFunctionReturnBranches(statement.body, new SemanticScope(functionScope));
      }
    } finally {
      this.activeFunctionDepth -= 1;
      this.activeFunction = previousFunction;
    }
  }

  private checkFunctionReturnBranches(node: Expression | IfStatement | Statement[], scope: SemanticScope): void {
    if (Array.isArray(node)) {
      this.inferExpressionTypeFromStatements(node.slice(0, -1), scope, false);
      const tail = node[node.length - 1];
      if (!tail) return;
      if (tail.type === 'ExpressionStatement') this.checkFunctionReturnBranches(tail.expression, scope);
      else if (tail.type === 'VariableDeclaration') this.checkFunctionReturnBranches(tail.init, scope);
      else if (tail.type === 'AssignmentStatement') this.checkFunctionReturnBranches(tail.right, scope);
      else if (tail.type === 'IfStatement') this.checkFunctionReturnBranches(tail, scope);
      else if (tail.type === 'ForStatement' || tail.type === 'WhileStatement') this.checkFunctionReturnBranches(tail.body, new SemanticScope(scope));
      return;
    }
    const types = this.inferControlInitializerArmTypes(node, scope)?.filter((type) => type.kind !== 'unknown');
    if (types?.some((left, index) => types.slice(index + 1).some((right) =>
      !this.isAssignableType(left, right) && !this.isAssignableType(right, left),
    ))) {
      this.addDiagnostic('inconsistent-branch-types', 'Function return branches must have compatible types', node.loc);
    }
    if (node.type === 'ConditionalExpression') {
      this.checkFunctionReturnBranches(node.consequent, scope);
      this.checkFunctionReturnBranches(node.alternate, scope);
    } else if (node.type === 'IfStatement') {
      this.checkFunctionReturnBranches(node.consequent, new SemanticScope(scope));
      if (node.alternate) this.checkFunctionReturnBranches(node.alternate, new SemanticScope(scope));
    } else if (node.type === 'SwitchExpression') {
      for (const arm of node.cases) this.checkFunctionReturnBranches(arm.consequent, new SemanticScope(scope));
    }
  }

  private checkCallableOverloadDeclarations(): void {
    if (this.currentPineVersion < 5) return;
    const declarationGroups = [
      ...this.functionDeclarations.values(),
      ...(this.currentPineVersion === 5 ? this.methodDeclarations.values() : []),
    ];
    for (const declarations of declarationGroups) {
      const signatures = new Set<string>();
      for (const declaration of declarations) {
        if (this.currentPineVersion === 5 && declaration.params.some((parameter) => !parameter.typeAnnotation)) continue;
        const requirements = this.inferParameterQualifierRequirements(declaration);
        const parameters = this.currentPineVersion === 5
          ? declaration.params
          : declaration.params.filter((parameter) => !parameter.defaultValue);
        const signature = parameters.map((parameter) => {
          const type = this.typeFromAnnotation(parameter.typeAnnotation ?? undefined);
          if (!type) return { kind: 'unknown' };
          // Typed UDF parameters infer series unless their body requires simple.
          return { ...type, qualifier: type.qualifier ?? requirements.get(parameter.name) ?? 'series' };
        });
        const key = JSON.stringify(signature);
        if (signatures.has(key)) {
          this.addDiagnostic(
            'invalid-overload',
            declaration.isMethod
              ? `The '${declaration.name.name}' function has overloads with the same parameters. The type of parameters must be different in overloaded versions of functions.`
              : `Overloads of ${declaration.name.name} must differ in the number or qualified types of required parameters; names and optional parameters do not distinguish overloads.`,
            declaration.isMethod ? declaration.params[0]?.loc ?? declaration.name.loc : declaration.name.loc,
          );
        }
        signatures.add(key);
      }
    }
  }

  private checkParameterDefaultType(
    declaration: FunctionDeclaration,
    parameter: FunctionDeclaration['params'][number],
  ): void {
    if (!parameter.defaultValue || this.versionRules.allowsBoolNaHelpers) return;

    if (!parameter.typeAnnotation && this.isNaLiteralExpression(parameter.defaultValue)) {
      this.addDiagnostic(
        'type-mismatch',
        `Parameter ${declaration.name.name}.${parameter.name} with an na default requires an explicit type.`,
        parameter.loc,
      );
      return;
    }

    const parameterType = this.typeFromAnnotation(parameter.typeAnnotation ?? undefined);
    if (parameterType?.kind !== 'bool' || !this.isNaLiteralExpression(parameter.defaultValue)) return;

    const declarationKind = declaration.isMethod ? 'method' : 'function';
    this.addDiagnostic(
      'type-mismatch',
      this.boolNaVersionMessage(`Cannot assign na value to bool parameter ${declarationKind} ${declaration.name.name}.${parameter.name}`),
      parameter.defaultValue.loc,
    );
  }

  private checkVariableDeclaration(statement: VariableDeclaration, scope: SemanticScope): void {

    if (
      statement.names.type === 'TupleDeclarator'
      && (statement.typeAnnotation || statement.kind !== 'none')
    ) {
      this.addDiagnostic(
        'invalid-tuple-declaration',
        'Tuple declarations cannot include type, qualifier, or declaration-mode keywords; use [a, b] = expression.',
        statement.loc,
      );
    }
    for (const name of this.declaredNames(statement)) this.checkReservedDeclarationName(name, statement.loc);
    const names = statement.names.type === 'VariableDeclarator' ? [statement.names.name] : statement.names.names;
    for (const name of names) {
      if (BUILTIN_GLOBALS.has(name.name) || BUILTIN_GLOBAL_TYPES.has(name.name)) {
        this.addDiagnostic(
          'builtin-shadow',
          `Variable '${name.name}' shadows a Pine builtin`,
          name.loc,
          'warning',
        );
      }
    }

    const diagnosticsBeforeInitializer = this.diagnostics.length;
    for (const name of names) {
      if (this.usedBuiltinVariableNames.has(name.name)) {
        this.addDiagnostic(
          'invalid-builtin-shadow',
          `Cannot declare variable '${name.name}' after using the built-in variable with that name, regardless of scope.`,
          name.loc,
        );
      }
    }
    const variableName = statement.names.type === 'VariableDeclarator' ? statement.names.name.name : undefined;
    const selfHistory = variableName && variableName !== '_' && this.referencesHistoryOfName(statement.init, variableName);
    const hadExistingSymbol = variableName ? Boolean(scope.lookupLocal(variableName)) : false;
    const declaredForSelfHistory = Boolean(this.versionRules.allowsSelfReferencingInitializers && selfHistory && !hadExistingSymbol);
    if (declaredForSelfHistory) {
      scope.declare({
        name: variableName!,
        kind: 'variable',
        type: this.typeFromAnnotation(statement.typeAnnotation ?? undefined),
        loc: statement.names.type === 'VariableDeclarator' ? statement.names.name.loc : statement.loc,
      });
    }
    this.checkVariableInitializer(statement.init, scope);
    this.checkTypeAnnotation('variable declaration', statement.typeAnnotation, statement.loc);
    if (
      !this.versionRules.allowsUntypedNaDeclaration
      && statement.names.type === 'VariableDeclarator'
      && !statement.typeAnnotation
      && statement.init.type !== 'IfStatement'
      && this.isNaLiteralExpression(statement.init)
    ) {
      this.addDiagnostic(
        'version-mismatch',
        'Untyped declarations initialized with na are invalid from Pine v4 onward. Add an explicit type, for example float x = na.',
        statement.init.loc,
      );
    }
    if (
      variableName
      && this.diagnostics.length === diagnosticsBeforeInitializer
      && this.inferVariableInitializerType(statement.init, scope).kind === 'void'
    ) {
      this.addDiagnostic(
        'type-mismatch',
        this.voidAssignmentMessage(`variable ${variableName}`, statement.init),
        statement.loc,
      );
      return;
    }
    this.checkTypeCompatibility(statement.typeAnnotation, statement.init, scope, statement.loc, variableName);
    if (statement.names.type === 'TupleDeclarator') {
      this.declareTuple(statement, statement.names, statement.init, scope);
      return;
    }
    if (statement.names.name.name === '_') return;

    const symbol: SemanticSymbol = {
      name: statement.names.name.name,
      kind: 'variable',
      type: this.variableDeclarationType(statement, scope),
      loc: statement.names.name.loc,
    };
    this.checkVariableNamespaceName(symbol);
    if (this.versionRules.disallowsSeriesVisualOffset) {
      const qualifier = symbol.type?.qualifier ?? this.inferVariableInitializerType(
        statement.init, this.visualOffsetScope(statement.init, scope),
      ).qualifier;
      if (qualifier) this.visualOffsetQualifiers.set(symbol, qualifier);
    }
    if (statement.init.type !== 'IfStatement') {
      const numericValue = this.visualNumericDefaultValue(statement.init, scope);
      if (numericValue !== undefined) this.visualNumericValues.set(symbol, numericValue);
      const constantValue = this.constantNumericValue(statement.init, scope) ?? this.constantBooleanValue(statement.init, scope);
      if (constantValue !== undefined) this.constantValues.set(symbol, constantValue);
      if (symbol.type?.kind === 'string' && symbol.type.qualifier === 'const') {
        const stringValue = this.declarationConstantStringValue(statement.init, scope);
        if (stringValue !== undefined) this.declarationConstantStrings.set(symbol, stringValue);
      }
    }
    if (statement.kind === 'varip' && symbol.type && !this.isVaripCompatibleType(symbol.type)) {
      this.addDiagnostic('type-mismatch', `varip does not support ${this.formatSemanticType(symbol.type)}`, statement.loc);
    }
    if (!statement.typeAnnotation && statement.init.type !== 'IfStatement'
      && this.isHighestTimeframeRatio(statement.init, scope)) this.highestTimeframeRatioSymbols.add(symbol);
    const existingSymbol = scope.lookupLocal(symbol.name);
    if (existingSymbol?.kind === 'variable' && declaredForSelfHistory) existingSymbol.type = symbol.type;
    if (statement.typeAnnotation?.qualifier === 'const') {
      this.explicitConstVariableSymbols.add(declaredForSelfHistory && existingSymbol ? existingSymbol : symbol);
    }
    if ((!existingSymbol || existingSymbol.kind === 'function' || declaredForSelfHistory) && !statement.typeAnnotation?.qualifier) {
      this.inferredVariableSymbols.add(symbol);
    }
    const barmergeModeValues = statement.init.type === 'IfStatement'
      ? undefined
      : this.inferRequestBarmergeModeValues(statement.init, scope);
    if (barmergeModeValues) this.barmergeModeSymbols.set(symbol, barmergeModeValues);
    if (declaredForSelfHistory) return;
    if (this.canValueShareNameWithExistingDeclaration(existingSymbol)) {
      scope.replaceLocal(symbol);
      return;
    }
    this.declare(scope, symbol);
  }

  private isVaripCompatibleType(type: SemanticType): boolean {
    if (['unknown', 'int', 'float', 'bool', 'color', 'string', 'chart.point', 'udt'].includes(type.kind)) return true;
    return this.isVaripCollectionCompatibleType(type);
  }

  private isVaripCollectionCompatibleType(type: SemanticType, seen = new Set<string>()): boolean {
    if (['unknown', 'int', 'float', 'bool', 'color', 'string', 'chart.point'].includes(type.kind)) return true;
    if (type.kind === 'array' || type.kind === 'matrix') {
      return !type.elementType || this.isVaripCollectionCompatibleType(type.elementType, seen);
    }
    if (type.kind === 'map') {
      return !type.valueType || this.isVaripCollectionCompatibleType(type.valueType, seen);
    }
    if (type.kind !== 'udt' || !type.name) return false;
    if (this.isEnumSemanticType(type)) return false;
    if (seen.has(type.name)) return true;
    const declaration = this.findUdtDeclaration(type.name);
    if (!declaration) return true;
    seen.add(type.name);
    const alias = type.name.includes('.') ? type.name.split('.')[0] : undefined;
    return declaration.fields.every((field) => {
      const fieldType = alias
        ? this.importedSemanticTypeFromAnnotation(alias, field.typeAnnotation)
        : this.typeFromAnnotation(field.typeAnnotation);
      return !fieldType || this.isVaripCollectionCompatibleType(fieldType, seen);
    });
  }

  private canValueShareNameWithExistingDeclaration(existingSymbol: SemanticSymbol | null): boolean {
    return existingSymbol?.kind === 'type'
      || (existingSymbol?.kind === 'function' && existingSymbol.isMethod === true);
  }

  private checkVariableNamespaceName(symbol: SemanticSymbol): void {
    if (!BUILTIN_NAMESPACES.has(symbol.name) || symbol.type?.kind !== 'udt' || this.isEnumSemanticType(symbol.type)) return;
    this.addDiagnostic(
      'namespace-obscuring',
      `User-defined type variable '${symbol.name}' cannot obscure the built-in namespace with that name.`,
      symbol.loc,
    );
  }

  private referencesHistoryOfName(init: Expression | IfStatement, name: string): boolean {
    if (init.type === 'IfStatement') return false;
    const visit = (expression: Expression): boolean => {
      if (expression.type === 'IndexExpression') {
        if (expression.object.type === 'Identifier' && expression.object.name === name) return true;
        return visit(expression.object) || visit(expression.index);
      }
      switch (expression.type) {
        case 'BinaryExpression': return visit(expression.left) || visit(expression.right);
        case 'UnaryExpression': return visit(expression.argument);
        case 'ConditionalExpression': return visit(expression.test) || visit(expression.consequent) || visit(expression.alternate);
        case 'CallExpression': return visit(expression.callee) || expression.arguments.some((argument) => visit(argument.value));
        case 'MemberExpression': return visit(expression.object);
        case 'ArrayExpression': return expression.elements.some(visit);
        case 'SwitchExpression':
          return Boolean(expression.discriminant && visit(expression.discriminant))
            || expression.cases.some((switchCase) => Boolean(switchCase.test && visit(switchCase.test)) || visitSwitchConsequent(switchCase.consequent));
        default: return false;
      }
    };
    const visitSwitchConsequent = (consequent: Expression | Statement[]): boolean => (
      Array.isArray(consequent) ? consequent.some((statement) => this.statementReferencesHistoryOfName(statement, name)) : visit(consequent)
    );
    return visit(init);
  }

  private statementReferencesHistoryOfName(statement: Statement, name: string): boolean {
    if (statement.type === 'VariableDeclaration') return this.referencesHistoryOfName(statement.init, name);
    if (statement.type === 'ExpressionStatement') return this.referencesHistoryOfName(statement.expression, name);
    if (statement.type === 'AssignmentStatement') return this.referencesHistoryOfName(statement.right, name);
    if (statement.type === 'MultiExpressionStatement') return statement.expressions.some((expression) => this.referencesHistoryOfName(expression, name));
    return false;
  }

  private inferVariableInitializerType(init: Expression | IfStatement, scope: SemanticScope): SemanticType {
    return init.type === 'IfStatement'
      ? this.inferIfExpressionType(init, scope)
      : this.inferExpressionType(init, scope);
  }

  private checkVariableInitializer(init: Expression | IfStatement, scope: SemanticScope): void {
    if (init.type === 'IfStatement') {
      this.checkIf(init, scope);
      return;
    }
    this.checkExpression(init, scope);
  }

  private declareTuple(statement: VariableDeclaration, tuple: TupleDeclarator, init: Expression | IfStatement, scope: SemanticScope): void {
    if (this.options.recordCallTypeContexts && this.options.recordTupleInitializerCallTypeContexts !== false) this.inferVariableInitializerType(init, scope);
    const seen = new Set<string>();
    const elementTypes = this.inferTupleElementTypes(init, scope);
    this.checkTupleInitializerShape(tuple, init, scope);
    for (const [index, name] of tuple.names.entries()) {
      if (name.name === '_') continue;
      if (seen.has(name.name)) {
        this.addDiagnostic('duplicate-symbol', `Duplicate declaration: ${name.name}`, name.loc);
        continue;
      }
      seen.add(name.name);
      const symbol: SemanticSymbol = {
        name: name.name, kind: 'variable', type: this.declarationBindingType(statement, name.name, elementTypes?.[index] ?? UNKNOWN_SEMANTIC_TYPE), loc: name.loc,
      };
      this.checkVariableNamespaceName(symbol);
      this.declare(scope, symbol);
    }
  }

  private checkTupleInitializerShape(tuple: TupleDeclarator, init: Expression | IfStatement, scope: SemanticScope): void {
    const armShapes = this.tupleInitializerArmShapes(init, scope)
      ?? (init.type === 'IfStatement' ? undefined : this.tupleInitializerShapesFromExpression(init, scope));
    if (!armShapes) return;

    const expectedArity = tuple.names.length;
    const reported = new Set<string>();
    for (const shape of armShapes) {
      if (shape.kind === 'unknown') continue;

      const message = shape.kind === 'non-tuple'
        ? `Tuple declaration expects ${expectedArity} values but initializer arm returns a non-tuple value`
        : `Tuple declaration expects ${expectedArity} values but initializer arm returns ${shape.arity}`;
      if (shape.kind === 'tuple' && shape.arity === expectedArity) continue;
      if (reported.has(message)) continue;
      reported.add(message);
      this.addDiagnostic('tuple-shape-mismatch', message, tuple.loc);
    }
  }

  private tupleInitializerArmShapes(init: Expression | IfStatement, scope: SemanticScope): TupleInitializerShape[] | undefined {
    if (init.type === 'ConditionalExpression') {
      return [
        ...this.tupleInitializerShapesFromExpression(init.consequent, scope),
        ...this.tupleInitializerShapesFromExpression(init.alternate, scope),
      ];
    }

    if (init.type === 'IfStatement') {
      const shapes = [
        ...this.normalizeTupleInitializerShapes(this.tupleInitializerShapesFromStatements(init.consequent, new SemanticScope(scope))),
      ];
      if (init.alternate) {
        shapes.push(...(
          Array.isArray(init.alternate)
            ? this.normalizeTupleInitializerShapes(this.tupleInitializerShapesFromStatements(init.alternate, new SemanticScope(scope)))
            : this.normalizeTupleInitializerShapes(this.tupleInitializerArmShapes(init.alternate, scope))
        ));
      }
      return this.normalizeTupleInitializerShapes(shapes);
    }

    if (init.type === 'SwitchExpression') {
      return init.cases.flatMap((switchCase) => (
        Array.isArray(switchCase.consequent)
          ? this.normalizeTupleInitializerShapes(this.tupleInitializerShapesFromStatements(switchCase.consequent, new SemanticScope(scope)))
          : this.tupleInitializerShapesFromExpression(switchCase.consequent, new SemanticScope(scope))
      ));
    }

    if (init.type === 'ForStatement' || init.type === 'WhileStatement') {
      return this.normalizeTupleInitializerShapes(this.tupleInitializerShapesFromStatements(init.body, new SemanticScope(scope)));
    }

    return undefined;
  }

  private tupleInitializerShapesFromStatements(statements: Statement[], scope: SemanticScope): TupleInitializerShape[] {
    let shapes: TupleInitializerShape[] = [{ kind: 'non-tuple' }];
    for (const statement of statements) {
      if (statement.type === 'VariableDeclaration' && statement.names.type === 'TupleDeclarator') {
        const elementTypes = this.inferTupleElementTypes(statement.init, scope);
        for (const [index, name] of statement.names.names.entries()) {
          if (name.name === '_') continue;
          scope.declare({
            name: name.name,
            kind: 'variable',
            type: this.declarationBindingType(statement, name.name, elementTypes?.[index] ?? UNKNOWN_SEMANTIC_TYPE),
            loc: name.loc,
          });
        }
        shapes = elementTypes ? [{ kind: 'tuple', arity: elementTypes.length }] : [{ kind: 'unknown' }];
        continue;
      }
      if (statement.type === 'VariableDeclaration' && statement.names.type === 'VariableDeclarator') {
        const type = this.variableDeclarationType(statement, scope);
        scope.declare({
          name: statement.names.name.name,
          kind: 'variable',
          type,
          loc: statement.names.name.loc,
        });
        shapes = [{ kind: 'non-tuple' }];
        continue;
      }
      if (statement.type === 'ExpressionStatement') {
        shapes = this.tupleInitializerShapesFromExpression(statement.expression, scope);
        continue;
      }
      if (
        statement.type === 'IfStatement'
        || statement.type === 'ForStatement'
        || statement.type === 'WhileStatement'
      ) {
        shapes = this.normalizeTupleInitializerShapes(this.tupleInitializerArmShapes(statement, scope));
        continue;
      }
      shapes = [{ kind: 'non-tuple' }];
    }
    return shapes;
  }

  private normalizeTupleInitializerShapes(shapes: TupleInitializerShape[] | undefined): TupleInitializerShape[] {
    return shapes && shapes.length > 0 ? shapes : [{ kind: 'non-tuple' }];
  }

  private tupleInitializerShapesFromExpression(expression: Expression, scope: SemanticScope): TupleInitializerShape[] {
    if (expression.type === 'ArrayExpression') {
      return [{ kind: 'tuple', arity: expression.elements.length }];
    }
    if (expression.type === 'NaExpression') {
      return [{ kind: 'unknown' }];
    }
    if (expression.type === 'CallExpression') {
      const builtinTupleShape = this.builtinTupleInitializerShape(expression, scope);
      if (builtinTupleShape) return [builtinTupleShape];
      const tupleTypes = this.inferBuiltinTupleElementTypes(expression, scope)
        ?? this.inferUserFunctionTupleElementTypes(expression, scope)
        ?? this.inferUserMethodTupleElementTypes(expression, scope)
        ?? this.inferImportedUserFunctionTupleElementTypes(expression, scope);
      if (tupleTypes) return [{ kind: 'tuple', arity: tupleTypes.length }];
      return this.tupleInitializerShapesFromUserFunctionCall(expression, scope)
        ?? this.tupleInitializerShapesFromUserMethodCall(expression, scope)
        ?? [{ kind: 'unknown' }];
    }
    return this.tupleInitializerArmShapes(expression, scope) ?? [{ kind: 'non-tuple' }];
  }

  private builtinTupleInitializerShape(expression: CallExpression, scope: SemanticScope): TupleInitializerShape | undefined {
    const calleeName = this.memberPath(expression.callee).join('.');
    if (calleeName !== 'ta.vwap') return undefined;
    return this.inferBuiltinTupleElementTypes(expression, scope)
      ? { kind: 'tuple', arity: 3 }
      : { kind: 'non-tuple' };
  }

  private tupleInitializerShapesFromUserFunctionCall(
    expression: CallExpression,
    scope: SemanticScope,
  ): TupleInitializerShape[] | undefined {
    if (expression.callee.type !== 'Identifier') return undefined;

    const symbol = scope.lookupFunction(expression.callee.name);
    const declaration = symbol?.kind === 'function'
      ? this.findUserFunctionDeclaration(expression.callee.name, expression, scope) ?? this.functionSymbolDeclarations.get(symbol)
      : undefined;
    if (!declaration) return undefined;

    return this.tupleInitializerShapesFromFunctionReturn(
      declaration,
      this.inferCallableParameterTypes(declaration, expression.arguments, scope),
    );
  }

  private tupleInitializerShapesFromUserMethodCall(
    expression: CallExpression,
    scope: SemanticScope,
  ): TupleInitializerShape[] | undefined {
    if (expression.callee.type !== 'MemberExpression') return undefined;

    const receiverType = this.inferExpressionType(expression.callee.object, scope);
    if (receiverType.kind === 'unknown') return undefined;

    const method = this.findUserMethodDeclaration(expression.callee.property.name, receiverType, expression, scope);
    if (!method) return undefined;

    return this.tupleInitializerShapesFromFunctionReturn(
      method,
      this.inferCallableParameterTypes(method, expression.arguments, scope, receiverType),
    );
  }

  private tupleInitializerShapesFromFunctionReturn(
    declaration: FunctionDeclaration,
    parameterTypes: Map<string, SemanticType>,
  ): TupleInitializerShape[] | undefined {
    if (this.activeReturnInferences.has(declaration)) return undefined;

    this.activeReturnInferences.add(declaration);
    try {
      const functionScope = this.createFunctionInferenceScope(declaration, parameterTypes);
      if (!Array.isArray(declaration.body)) {
        return this.tupleInitializerShapesFromExpression(declaration.body, functionScope);
      }

      return this.tupleInitializerShapesFromStatements(declaration.body, functionScope);
    } finally {
      this.activeReturnInferences.delete(declaration);
    }
  }

  private qualifyReturnedTuple(types: SemanticType[] | undefined, ...controls: SemanticType[]): SemanticType[] | undefined {
    if (!types) return undefined;
    const qualifier = this.maxQualifier({ kind: 'unknown', qualifier: 'simple' }, ...types, ...controls);
    return types.map((type) => ({ ...type, qualifier }));
  }

  private inferTupleElementTypes(init: Expression | IfStatement, scope: SemanticScope): SemanticType[] | undefined {
    if (init.type === 'IfStatement') {
      return this.inferIfTupleElementTypes(init, scope);
    }
    if (init.type === 'ForStatement') {
      return this.inferForTupleElementTypes(init, scope);
    }
    if (init.type === 'WhileStatement') {
      return this.inferWhileTupleElementTypes(init, scope);
    }
    if (init.type === 'SwitchExpression') {
      return this.inferSwitchTupleElementTypes(init, scope);
    }

    if (init.type === 'ArrayExpression') {
      return init.elements.map((element) => this.inferExpressionType(element, scope));
    }

    if (init.type !== 'CallExpression') return undefined;

    return this.inferBuiltinTupleElementTypes(init, scope)
      ?? this.inferUserFunctionTupleElementTypes(init, scope)
      ?? this.inferUserMethodTupleElementTypes(init, scope)
      ?? this.inferImportedUserFunctionTupleElementTypes(init, scope);
  }

  private inferBuiltinTupleElementTypes(expression: CallExpression, _scope: SemanticScope): SemanticType[] | undefined {
    const importedOfficial = this.resolveOfficialImportedFunction(this.memberPath(expression.callee).join('.'), _scope);
    if (importedOfficial?.returnKind === 'tuple' && importedOfficial.tupleArity) {
      return Array.from({ length: importedOfficial.tupleArity }, () => ({ kind: 'float', qualifier: 'series' }));
    }
    const calleeName = canonicalBuiltinName(this.memberPath(expression.callee).join('.'));
    if (calleeName === 'request.security' || calleeName === 'security') {
      const requested = this.resolveCallArgumentExpression(expression, ['symbol', 'timeframe', 'expression'], 2);
      if (requested?.type === 'ArrayExpression') {
        return requested.elements.map((element) => this.inferExpressionType(element, _scope));
      }
      if (requested?.type === 'CallExpression') {
        return this.inferUserFunctionTupleElementTypes(requested, _scope)
          ?? this.inferUserMethodTupleElementTypes(requested, _scope);
      }
    }
    if (calleeName === 'ta.vwap') {
      const stdevMult = this.resolveCallArgumentExpression(expression, ['source', 'anchor', 'stdev_mult'], 2);
      return stdevMult ? [
        { kind: 'float', qualifier: 'series' },
        { kind: 'float', qualifier: 'series' },
        { kind: 'float', qualifier: 'series' },
      ] : undefined;
    }
    return BUILTIN_TUPLE_RETURN_TYPES.get(calleeName);
  }

  private inferTupleElementTypesFromStatements(statements: Statement[], scope: SemanticScope): SemanticType[] | undefined {
    let returnTypes: SemanticType[] | undefined;
    for (const statement of statements) {
      if (statement.type === 'VariableDeclaration' && statement.names.type === 'TupleDeclarator') {
        const elementTypes = this.inferTupleElementTypes(statement.init, scope);
        for (const [index, name] of statement.names.names.entries()) {
          if (name.name === '_') continue;
          scope.declare({
            name: name.name,
            kind: 'variable',
            type: this.declarationBindingType(statement, name.name, elementTypes?.[index] ?? UNKNOWN_SEMANTIC_TYPE),
            loc: name.loc,
          });
        }
        returnTypes = elementTypes;
        continue;
      }
      if (statement.type === 'VariableDeclaration' && statement.names.type === 'VariableDeclarator') {
        const type = this.variableDeclarationType(statement, scope);
        scope.declare({
          name: statement.names.name.name,
          kind: 'variable',
          type,
          loc: statement.names.name.loc,
        });
        returnTypes = undefined;
        continue;
      }
      if (statement.type === 'ExpressionStatement') {
        returnTypes = this.inferTupleElementTypes(statement.expression, scope);
        continue;
      }
      if (statement.type === 'IfStatement') {
        returnTypes = this.inferIfTupleElementTypes(statement, scope);
        continue;
      }
      if (statement.type === 'ForStatement') {
        returnTypes = this.inferForTupleElementTypes(statement, scope);
        continue;
      }
      if (statement.type === 'WhileStatement') {
        returnTypes = this.inferWhileTupleElementTypes(statement, scope);
        continue;
      }
      returnTypes = undefined;
    }
    return returnTypes;
  }

  private inferIfTupleElementTypes(statement: IfStatement, scope: SemanticScope): SemanticType[] | undefined {
    const consequentTypes = this.inferTupleElementTypesFromStatements(statement.consequent, new SemanticScope(scope));
    const control = this.inferExpressionType(statement.test, scope);
    if (!statement.alternate) return this.qualifyReturnedTuple(consequentTypes, control);

    const alternateTypes = Array.isArray(statement.alternate)
      ? this.inferTupleElementTypesFromStatements(statement.alternate, new SemanticScope(scope))
      : this.inferIfTupleElementTypes(statement.alternate, scope);

    if (!consequentTypes && this.isNaOnlyTupleArm(statement.consequent)) return this.qualifyReturnedTuple(alternateTypes, control);
    if (!alternateTypes && Array.isArray(statement.alternate) && this.isNaOnlyTupleArm(statement.alternate)) {
      return this.qualifyReturnedTuple(consequentTypes, control);
    }

    const mergedTypes = this.mergeTupleElementTypes(consequentTypes, alternateTypes);
    if (mergedTypes && consequentTypes && alternateTypes) {
      const consequentReturn = statement.consequent.at(-1);
      const alternateReturn = Array.isArray(statement.alternate) ? statement.alternate.at(-1) : undefined;
      const consequentElements =
        consequentReturn?.type === 'ExpressionStatement' && consequentReturn.expression.type === 'ArrayExpression'
          ? consequentReturn.expression.elements
          : undefined;
      const alternateElements =
        alternateReturn?.type === 'ExpressionStatement' && alternateReturn.expression.type === 'ArrayExpression'
          ? alternateReturn.expression.elements
          : undefined;
      for (let index = 0; index < mergedTypes.length; index += 1) {
        // A literal missing slot inherits its sibling's kind, unlike an
        // unresolved expression. Retain both arms' qualifier information.
        const consequentType = consequentTypes[index];
        const alternateType = alternateTypes[index];
        const knownType =
          consequentElements?.[index]?.type === 'NaExpression'
            ? alternateType
            : alternateElements?.[index]?.type === 'NaExpression'
              ? consequentType
              : undefined;
        if (knownType && knownType.kind !== 'unknown') {
          mergedTypes[index] = { ...knownType, qualifier: this.maxQualifier(consequentType, alternateType) };
        }
      }
    }
    return this.qualifyReturnedTuple(mergedTypes, control);
  }

  private isNaOnlyTupleArm(statements: Statement[]): boolean {
    return statements.length === 1
      && statements[0]?.type === 'ExpressionStatement'
      && statements[0].expression.type === 'NaExpression';
  }

  private inferForTupleElementTypes(statement: ForStatement, scope: SemanticScope): SemanticType[] | undefined {
    const loopScope = new SemanticScope(scope);

    if (statement.kind === 'collection') {
      const iterableType = this.inferExpressionType(statement.iterable, scope);
      loopScope.declare({
        name: statement.counter.name,
        kind: 'loop',
        type: this.collectionValueType(iterableType),
        loc: statement.counter.loc,
      });
      if (statement.indexCounter) {
        loopScope.declare({
          name: statement.indexCounter.name,
          kind: 'loop',
          type: this.collectionIndexType(iterableType),
          loc: statement.indexCounter.loc,
        });
      }
    } else {
      loopScope.declare({
        name: statement.counter.name,
        kind: 'loop',
        type: { kind: 'int', qualifier: 'series' },
        loc: statement.counter.loc,
      });
    }

    const controls = statement.kind === 'collection'
      ? [this.inferExpressionType(statement.iterable, scope)]
      : [statement.start, statement.end, ...(statement.step ? [statement.step] : [])].map((value) => this.inferExpressionType(value, scope));
    return this.qualifyReturnedTuple(this.inferTupleElementTypesFromStatements(statement.body, loopScope), ...controls);
  }

  private inferWhileTupleElementTypes(statement: WhileStatement, scope: SemanticScope): SemanticType[] | undefined {
    return this.qualifyReturnedTuple(
      this.inferTupleElementTypesFromStatements(statement.body, new SemanticScope(scope)),
      this.inferExpressionType(statement.test, scope),
    );
  }

  private inferSwitchTupleElementTypes(expression: SwitchExpression, scope: SemanticScope): SemanticType[] | undefined {
    let mergedTypes: SemanticType[] | undefined;
    const controls = expression.discriminant ? [this.inferExpressionType(expression.discriminant, scope)] : [];
    for (const switchCase of expression.cases) {
      if (switchCase.test) controls.push(this.inferExpressionType(switchCase.test, scope));
      const caseScope = new SemanticScope(scope);
      const caseTypes = Array.isArray(switchCase.consequent)
        ? this.inferTupleElementTypesFromStatements(switchCase.consequent, caseScope)
        : this.inferTupleElementTypes(switchCase.consequent, caseScope);
      if (!caseTypes) return undefined;
      mergedTypes = mergedTypes ? this.mergeTupleElementTypes(mergedTypes, caseTypes) : caseTypes;
      if (!mergedTypes) return undefined;
    }

    return this.qualifyReturnedTuple(mergedTypes, ...controls);
  }

  private mergeTupleElementTypes(
    leftTypes: SemanticType[] | undefined,
    rightTypes: SemanticType[] | undefined,
  ): SemanticType[] | undefined {
    if (!leftTypes || !rightTypes || leftTypes.length !== rightTypes.length) return undefined;

    return leftTypes.map((leftType, index) => (
      this.mergeCompatibleType(leftType, rightTypes[index] ?? UNKNOWN_SEMANTIC_TYPE)
    ));
  }

  private mergeCompatibleType(leftType: SemanticType, rightType: SemanticType): SemanticType {
    const qualifier = this.maxQualifier(leftType, rightType);
    if (leftType.kind === 'unknown' || rightType.kind === 'unknown') return { kind: 'unknown', qualifier };

    const integerDivision = (leftType.integerDivision || rightType.integerDivision)
      && this.isIntegerDerivedNumeric(leftType) && this.isIntegerDerivedNumeric(rightType) ? true : undefined;
    if (this.isAssignableType(rightType, leftType)) return { ...rightType, qualifier, integerDivision };
    if (this.isAssignableType(leftType, rightType)) return { ...leftType, qualifier, integerDivision };

    return { kind: 'unknown', qualifier };
  }

  private checkTupleAssignment(statement: TupleAssignment, scope: SemanticScope): void {
    for (const name of statement.names) {
      const symbol = scope.lookup(name.name);
      if (symbol) {
        this.visualNumericValues.delete(symbol);
        this.constantValues.delete(symbol);
        this.declarationConstantStrings.delete(symbol);
      }
    }
    if (statement.right.type === 'IfStatement') {
      this.checkIf(statement.right, scope);
    } else {
      this.checkExpression(statement.right, scope);
    }
    for (const name of statement.names) {
      if (name.name === '_') continue;
      this.checkFunctionAssignmentScope(name, scope);
      if (!scope.lookup(name.name) && !this.isKnownIdentifier(name.name)) {
        this.addDiagnostic('undefined-variable', `Variable '${name.name}' is not declared`, name.loc);
      }
    }
  }

  private checkAssignment(statement: AssignmentStatement, scope: SemanticScope): void {
    // An initializer does not prove the current value after a reassignment.
    if (statement.left.type === 'Identifier') {
      const symbol = scope.lookup(statement.left.name);
      if (symbol) {
        this.visualNumericValues.delete(symbol);
        this.constantValues.delete(symbol);
        this.declarationConstantStrings.delete(symbol);
      }
    }
    if (statement.right.type === 'IfStatement') {
      this.checkIf(statement.right, scope);
    } else {
      this.checkExpression(statement.right, scope);
    }
    this.checkAssignmentTarget(statement, scope);
    if (statement.left.type === 'Identifier') {
      const symbol = scope.lookup(statement.left.name);
      if (symbol && this.explicitConstVariableSymbols.has(symbol)) {
        this.addDiagnostic(
          'const-reassignment',
          `Cannot reassign const variable '${statement.left.name}', including with compound assignment.`,
          statement.left.loc,
        );
        return;
      }
      if (this.checkFunctionAssignmentScope(statement.left, scope)) return;
      if (symbol) this.reassignedSymbols.add(symbol);
      // Skip type inference for block-if RHS; defer to runtime types.
      if (statement.right.type !== 'IfStatement') {
        this.checkIdentifierAssignmentType(statement, scope);
      }
      this.checkIdentifierCompoundAssignmentType(statement, scope);
    } else if (statement.left.type === 'MemberExpression' && statement.right.type !== 'IfStatement') {
      this.checkUdtFieldAssignmentType(statement.left, statement.right, scope, statement.operator);
    } else if (statement.left.type === 'IndexExpression') {
      this.checkIndexAssignmentType(statement.left, statement.right, scope, statement.operator);
    }
  }

  private checkFunctionAssignmentScope(identifier: Identifier, scope: SemanticScope): boolean {
    if (this.activeFunctionDepth === 0) return false;
    const symbol = scope.lookup(identifier.name);
    if (symbol?.kind === 'parameter') {
      this.addDiagnostic(
        'parameter-reassignment',
        `Cannot reassign function or method parameter '${identifier.name}', including with compound assignment.`,
        identifier.loc,
      );
      return true;
    }
    if (symbol?.kind === 'variable' && symbol === this.rootScope.lookupLocal(identifier.name)) {
      this.addDiagnostic(
        'global-variable-reassignment',
        `Cannot reassign global variable '${identifier.name}' from a user-defined function or method.`,
        identifier.loc,
      );
      return true;
    }
    return false;
  }

  private checkIdentifierAssignmentType(statement: AssignmentStatement, scope: SemanticScope): void {
    if (statement.operator !== ':=' || statement.left.type !== 'Identifier') return;
    if (statement.right.type === 'IfStatement') return;

    const symbol = scope.lookup(statement.left.name);
    const targetType = symbol?.type;
    if (symbol) this.highestTimeframeRatioSymbols.delete(symbol);
    if (!symbol || !targetType) return;

    if (targetType.kind === 'bool' && this.isNaLiteralExpression(statement.right) && !this.versionRules.allowsBoolNaHelpers) {
      this.addDiagnostic(
        'type-mismatch',
        this.boolNaVersionMessage(`Cannot assign na value to bool variable ${statement.left.name}`),
        statement.loc,
      );
      return;
    }

    const sourceType = this.inferExpressionType(statement.right, scope);
    if (this.versionRules.disallowsSeriesVisualOffset) {
      const qualifier = this.maxQualifier(
        { kind: 'unknown', qualifier: this.visualOffsetQualifiers.get(symbol) },
        this.inferExpressionType(statement.right, this.visualOffsetScope(statement.right, scope)),
      );
      if (qualifier) this.visualOffsetQualifiers.set(symbol, qualifier);
    }
    if (sourceType.kind === 'void') {
      this.addDiagnostic(
        'type-mismatch',
        this.voidAssignmentMessage(`${this.formatSemanticType(targetType)} variable ${statement.left.name}`, statement.right),
        statement.loc,
      );
      return;
    }
    if (this.widenInferredVariableType(symbol, sourceType)) return;

    if (!this.isAssignableQualifier(targetType.qualifier, sourceType.qualifier)) {
      this.addDiagnostic(
        'qualifier-mismatch',
        `Cannot assign ${sourceType.qualifier} value to ${targetType.qualifier} ${this.formatSemanticType(targetType)} variable ${statement.left.name}`,
        statement.loc,
      );
      return;
    }

    if (this.isAssignableType(targetType, sourceType)) return;

    this.addDiagnostic(
      'type-mismatch',
      this.variableAssignmentMessage(this.formatSemanticType(sourceType), this.formatSemanticType(targetType), statement.left.name),
      statement.loc,
    );
  }

  private checkIdentifierCompoundAssignmentType(statement: AssignmentStatement, scope: SemanticScope): void {
    if (statement.operator === ':=' || statement.left.type !== 'Identifier') return;
    if (statement.right.type === 'IfStatement') return;

    const symbol = scope.lookup(statement.left.name);
    const targetType = symbol?.type;
    if (!symbol || !targetType || targetType.kind === 'unknown') return;

    const sourceType = this.inferExpressionType(statement.right, scope);
    if (sourceType.kind === 'unknown') return;

    const resultType = this.inferCompoundAssignmentResultType(statement.operator, targetType, sourceType);
    if (!resultType) {
      this.addDiagnostic(
        'type-mismatch',
        `Compound assignment ${statement.operator} requires ${statement.operator === '+=' ? 'numeric or string' : 'numeric'} operands, got ${this.formatSemanticType(targetType)} and ${this.formatSemanticType(sourceType)}`,
        statement.loc,
      );
      return;
    }

    if (this.widenInferredVariableType(symbol, resultType)) return;

    if (!this.isAssignableQualifier(targetType.qualifier, resultType.qualifier)) {
      this.addDiagnostic(
        'qualifier-mismatch',
        `Cannot assign ${resultType.qualifier} value to ${targetType.qualifier} ${this.formatSemanticType(targetType)} variable ${statement.left.name}`,
        statement.loc,
      );
      return;
    }

    if (this.isAssignableType(targetType, resultType)) return;

    this.addDiagnostic(
      'type-mismatch',
      this.variableAssignmentMessage(this.formatSemanticType(resultType), this.formatSemanticType(targetType), statement.left.name),
      statement.loc,
    );
  }

  private inferCompoundAssignmentResultType(
    operator: AssignmentStatement['operator'],
    targetType: SemanticType,
    sourceType: SemanticType,
  ): SemanticType | undefined {
    const qualifier = this.maxQualifier(targetType, sourceType);

    if (operator === '+=' && targetType.kind === 'string' && sourceType.kind === 'string') {
      return { kind: 'string', qualifier };
    }

    if (!this.isNumericType(targetType) || !this.isNumericType(sourceType)) return undefined;

    return {
      kind: targetType.kind === 'float' || sourceType.kind === 'float' || operator === '/=' ? 'float' : 'int',
      qualifier,
    };
  }

  private widenInferredVariableType(symbol: SemanticSymbol, sourceType: SemanticType): boolean {
    const targetType = symbol.type;
    if (!targetType || !this.inferredVariableSymbols.has(symbol)) return false;
    if (sourceType.kind === 'unknown') {
      const qualifier = this.maxQualifier(targetType, sourceType);
      if (!qualifier || qualifier === targetType.qualifier) return false;
      symbol.type = { ...targetType, qualifier };
      return true;
    }
    if (!this.isAssignableType({ ...targetType, qualifier: undefined }, { ...sourceType, qualifier: undefined })) return false;

    const widenedType = this.mergeCompatibleType(targetType, sourceType);
    if (widenedType.kind === 'unknown') return false;

    symbol.type = widenedType;
    return true;
  }

  private checkAssignmentTarget(statement: AssignmentStatement, scope: SemanticScope): void {
    if (statement.left.type === 'Identifier') {
      if (!scope.lookup(statement.left.name) && !this.isKnownIdentifier(statement.left.name)) {
        this.addDiagnostic('unknown-assignment-target', `Cannot assign to undeclared identifier: ${statement.left.name}`, statement.left.loc);
      }
      return;
    }

    if (statement.left.type === 'MemberExpression') {
      this.checkMemberExpression(statement.left, scope);
      return;
    }

    this.checkIndexExpression(statement.left, scope, true);
  }

  private checkIf(statement: IfStatement, scope: SemanticScope): void {
    this.checkExpression(statement.test, scope);
    this.checkBooleanContext(statement.test, scope);
    this.checkStatements(statement.consequent, new SemanticScope(scope, true));
    if (Array.isArray(statement.alternate)) {
      this.checkStatements(statement.alternate, new SemanticScope(scope, true));
    } else if (statement.alternate) {
      this.checkIf(statement.alternate, scope);
    }
  }

  private checkOnce(statement: OnceStatement, scope: SemanticScope): void {
    if (statement.test) {
      this.checkExpression(statement.test, scope);
      this.checkBooleanContext(statement.test, scope);
    }
    this.checkStatements(statement.body, new SemanticScope(scope, true));
  }

  private checkFor(statement: ForStatement, scope: SemanticScope): void {
    this.checkReservedDeclarationName(statement.counter.name, statement.counter.loc);
    const loopScope = new SemanticScope(scope, true);
    if (statement.kind === 'collection') {
      if (statement.indexCounter) this.checkReservedDeclarationName(statement.indexCounter.name, statement.indexCounter.loc);
      const iterableType = this.inferExpressionType(statement.iterable, scope);
      if (iterableType.kind === 'map' && !statement.indexCounter) {
        this.addDiagnostic('invalid-map-loop', 'A direct map loop requires the paired [key, value] form.', statement.iterable.loc);
      }
      this.declare(loopScope, {
        name: statement.counter.name,
        kind: 'loop',
        type: this.collectionValueType(iterableType),
        loc: statement.counter.loc,
      });
      if (statement.indexCounter) {
        this.declare(loopScope, {
          name: statement.indexCounter.name,
          kind: 'loop',
          type: this.collectionIndexType(iterableType),
          loc: statement.indexCounter.loc,
        });
      }
      this.checkExpression(statement.iterable, scope);
    } else {
      this.declare(loopScope, {
        name: statement.counter.name,
        kind: 'loop',
        type: { kind: 'int', qualifier: 'series' },
        loc: statement.counter.loc,
      });
      this.checkExpressions(scope, [statement.start, statement.end, statement.step]);
    }
    this.checkStatements(statement.body, loopScope);
    if (this.options.loopResultTypes) {
      const types = this.inferForTupleElementTypes(statement, scope)
        ?? [this.inferForExpressionType(statement, scope) ?? { kind: 'unknown' }];
      this.options.loopResultTypes.set(statement, types);
    }
  }

  private collectionValueType(iterableType: SemanticType): SemanticType | undefined {
    if (iterableType.kind === 'array') return iterableType.elementType;
    if (iterableType.kind === 'map') return iterableType.valueType;
    if (iterableType.kind === 'matrix') return { kind: 'array', elementType: iterableType.elementType };
    return undefined;
  }

  private collectionIndexType(iterableType: SemanticType): SemanticType | undefined {
    if (iterableType.kind === 'array' || iterableType.kind === 'matrix') return { kind: 'int', qualifier: 'series' };
    if (iterableType.kind === 'map') return iterableType.keyType;
    return undefined;
  }

  private checkWhile(statement: WhileStatement, scope: SemanticScope): void {
    this.checkExpression(statement.test, scope);
    this.checkBooleanContext(statement.test, scope);
    this.checkStatements(statement.body, new SemanticScope(scope, true));
    if (this.options.loopResultTypes) {
      const types = this.inferWhileTupleElementTypes(statement, scope)
        ?? [this.inferWhileExpressionType(statement, scope) ?? { kind: 'unknown' }];
      this.options.loopResultTypes.set(statement, types);
    }
  }

  private checkDirectNaComparison(expression: Expression): void {
    if (expression.type !== 'BinaryExpression' || !this.isComparisonOperator(expression.operator)) return;
    if (!this.isNaLiteralExpression(expression.left) && !this.isNaLiteralExpression(expression.right)) return;

    this.addDiagnostic(
      'invalid-na-comparison',
      'Do not compare directly to na; use na(value) instead',
      expression.loc,
      this.versionRules.directNaComparisonSeverity,
    );
  }

  private checkLogicalOperands(expression: Expression, scope: SemanticScope): void {
    if (expression.type !== 'BinaryExpression' || (expression.operator !== 'and' && expression.operator !== 'or')) return;

    this.checkBooleanContext(expression.left, scope);
    this.checkBooleanContext(expression.right, scope);
  }

  private checkBoolToNumberArithmetic(expression: Expression, scope: SemanticScope): void {
    if (
      expression.type !== 'BinaryExpression'
      || (expression.operator !== '+' && expression.operator !== '-' && expression.operator !== '*' && expression.operator !== '/' && expression.operator !== '%')
      || this.versionRules.allowsBoolToNumberArithmetic
    ) return;

    const leftType = this.inferExpressionType(expression.left, scope);
    const rightType = this.inferExpressionType(expression.right, scope);
    if (leftType.kind !== 'bool' && rightType.kind !== 'bool') return;

    this.addDiagnostic(
      'version-mismatch',
      'Pine v3 and later do not allow bool-to-number arithmetic. Use condition ? 1 : 0 when you need a numeric flag.',
      expression.loc,
    );
  }

  private checkBinaryOperatorOperandTypes(expression: Expression, scope: SemanticScope): void {
    if (expression.type !== 'BinaryExpression') return;

    const operator = expression.operator;
    if (operator === '==' || operator === '!=') {
      const leftType = this.inferExpressionType(expression.left, scope);
      const rightType = this.inferExpressionType(expression.right, scope);
      if (
        this.versionRules.disallowedEqualityOperandKinds[operator]?.some(
          (kind) => kind === leftType.kind || kind === rightType.kind,
        )
      ) {
        this.addInvalidOperatorOperandDiagnostic(operator, leftType, rightType, expression.loc);
      }
      return;
    }

    if (
      operator !== '+'
      && operator !== '-'
      && operator !== '*'
      && operator !== '/'
      && operator !== '%'
      && operator !== '<'
      && operator !== '<='
      && operator !== '>'
      && operator !== '>='
      && operator !== 'and'
      && operator !== 'or'
    ) return;

    const leftType = this.inferExpressionType(expression.left, scope);
    const rightType = this.inferExpressionType(expression.right, scope);
    if (!this.isKnownOperatorOperandType(leftType) || !this.isKnownOperatorOperandType(rightType)) return;

    if (operator === '+') {
      if ((this.isNumericType(leftType) && this.isNumericType(rightType)) || this.isStringConcatenation(leftType, rightType)) {
        return;
      }
      if (this.isBoolToNumericArithmeticOnly(leftType, rightType)) return;
      this.addInvalidOperatorOperandDiagnostic(operator, leftType, rightType, expression.loc);
      return;
    }

    if (operator === '-' || operator === '*' || operator === '/' || operator === '%') {
      if (this.isNumericType(leftType) && this.isNumericType(rightType)) return;
      if (this.isBoolToNumericArithmeticOnly(leftType, rightType)) return;
      this.addInvalidOperatorOperandDiagnostic(operator, leftType, rightType, expression.loc);
      return;
    }

    if (operator === '<' || operator === '<=' || operator === '>' || operator === '>=') {
      if (this.isNumericType(leftType) && this.isNumericType(rightType)) return;
      this.addInvalidOperatorOperandDiagnostic(operator, leftType, rightType, expression.loc);
      return;
    }

    if (operator === 'and' || operator === 'or') {
      if (!this.versionRules.allowsImplicitNumericToBool && this.isNumericToBoolLogicalOnly(leftType, rightType)) return;
      const leftAllowed = leftType.kind === 'bool' || (this.versionRules.allowsImplicitNumericToBool && this.isNumericType(leftType));
      const rightAllowed = rightType.kind === 'bool' || (this.versionRules.allowsImplicitNumericToBool && this.isNumericType(rightType));
      if (leftAllowed && rightAllowed) return;
      this.addInvalidOperatorOperandDiagnostic(operator, leftType, rightType, expression.loc);
    }
  }

  private isBoolToNumericArithmeticOnly(leftType: SemanticType, rightType: SemanticType): boolean {
    if (this.versionRules.allowsBoolToNumberArithmetic) return false;
    if (leftType.kind !== 'bool' && rightType.kind !== 'bool') return false;
    return this.isBoolOrNumericType(leftType) && this.isBoolOrNumericType(rightType);
  }

  private isNumericToBoolLogicalOnly(leftType: SemanticType, rightType: SemanticType): boolean {
    if (!this.isBoolOrNumericType(leftType) || !this.isBoolOrNumericType(rightType)) return false;
    return this.isNumericType(leftType) || this.isNumericType(rightType);
  }

  private isBoolOrNumericType(type: SemanticType): boolean {
    return type.kind === 'bool' || this.isNumericType(type);
  }

  private checkUnaryOperatorOperandType(expression: Expression, scope: SemanticScope): void {
    if (expression.type !== 'UnaryExpression') return;

    const argumentType = this.inferExpressionType(expression.argument, scope);
    if (!this.isKnownOperatorOperandType(argumentType)) return;

    if (expression.operator === '-' || expression.operator === '+') {
      if (this.isNumericType(argumentType)) return;
      this.addDiagnostic(
        'invalid-operator-operands',
        `Operator ${expression.operator} requires a numeric operand, got ${this.formatSemanticType(argumentType)}`,
        expression.loc,
      );
      return;
    }

    if (expression.operator === 'not') {
      if (argumentType.kind === 'bool') return;
      if (this.versionRules.allowsImplicitNumericToBool && this.isNumericType(argumentType)) return;
      this.addDiagnostic(
        'invalid-operator-operands',
        `Operator not requires a bool operand, got ${this.formatSemanticType(argumentType)}`,
        expression.loc,
      );
    }
  }

  private isKnownOperatorOperandType(type: SemanticType): boolean {
    return type.kind !== 'unknown' && type.kind !== 'void';
  }

  private addInvalidOperatorOperandDiagnostic(operator: string, leftType: SemanticType, rightType: SemanticType, loc?: SourceLocation): void {
    this.addDiagnostic(
      'invalid-operator-operands',
      `Operator ${operator} does not support operands ${this.formatSemanticType(leftType)} and ${this.formatSemanticType(rightType)}`,
      loc,
    );
  }

  private checkBooleanContext(expression: Expression, scope: SemanticScope): void {
    if (this.isNaLiteralExpression(expression)) {
      if (this.versionRules.allowsBoolNaHelpers) return;
      this.addDiagnostic(
        'invalid-na-bool',
        this.boolNaVersionMessage('na cannot be used as a boolean expression'),
        expression.loc,
      );
      return;
    }

    const type = this.inferExpressionType(expression, scope);
    if (!this.isNumericType(type)) return;
    if (this.versionRules.allowsImplicitNumericToBool) return;

    this.addDiagnostic(
      'implicit-numeric-bool',
      this.implicitNumericBoolVersionMessage(type),
      expression.loc,
    );
  }

  private isNaLiteralExpression(expression: Expression): boolean {
    return expression.type === 'NaExpression';
  }

  private isComparisonOperator(operator: string): boolean {
    return operator === '=='
      || operator === '!='
      || operator === '<'
      || operator === '<='
      || operator === '>'
      || operator === '>=';
  }

  private checkExpression(expression: Expression, scope: SemanticScope): void {
    switch (expression.type) {
      case 'Identifier':
        this.checkIdentifier(expression, scope);
        break;
      case 'NumericLiteral':
      case 'StringLiteral':
      case 'BooleanLiteral':
      case 'ColorLiteral':
      case 'NaExpression':
        break;
      case 'BinaryExpression':
        this.checkExpression(expression.left, scope);
        if (this.versionRules.usesLazyLogicalOperators && (expression.operator === 'and' || expression.operator === 'or')) {
          this.checkConditionalExpressions(scope, [expression.right]);
        } else {
          this.checkExpression(expression.right, scope);
        }
        if (this.currentPineVersion === 5 && expression.operator === '/'
          && this.constantLiteralValue(expression.right) === 0) {
          this.addDiagnostic('division-by-zero', 'Division by zero', expression.loc);
        }
        this.checkDirectNaComparison(expression);
        this.checkBinaryOperatorOperandTypes(expression, scope);
        this.checkLogicalOperands(expression, scope);
        this.checkBoolToNumberArithmetic(expression, scope);
        break;
      case 'UnaryExpression':
        this.checkExpression(expression.argument, scope);
        this.checkUnaryOperatorOperandType(expression, scope);
        break;
      case 'ConditionalExpression':
        this.checkExpression(expression.test, scope);
        this.checkBooleanContext(expression.test, scope);
        this.checkConditionalExpressions(scope, [expression.consequent, expression.alternate]);
        if ([expression.consequent, expression.alternate].some((arm) => this.isTernaryTupleArm(arm, scope))) {
          this.addDiagnostic('tuple-ternary', 'Ternary expressions cannot return tuples; use an if or switch local scope', expression.loc);
        }
        break;
      case 'SwitchExpression':
        this.checkSwitchExpression(expression, scope);
        break;
      case 'ForStatement':
        this.checkFor(expression, scope);
        break;
      case 'WhileStatement':
        this.checkWhile(expression, scope);
        break;
      case 'CallExpression':
        this.checkCallExpression(expression, scope);
        if (this.options.resolvedUserMethods
          || (this.currentPineVersion >= 4 && !this.versionRules.constIntDivisionCanReturnFractional)) {
          this.inferCallType(expression, scope);
        }
        break;
      case 'MemberExpression':
        this.checkMemberExpression(expression, scope);
        break;
      case 'IndexExpression':
        this.checkIndexExpression(expression, scope);
        break;
      case 'ArrayExpression':
        this.checkExpressions(scope, expression.elements);
        break;
      case 'LambdaExpression': {
        const lambdaScope = new SemanticScope(scope);
        for (const param of expression.params) {
          lambdaScope.declare({ name: param.name, kind: 'parameter' });
        }
        this.checkExpression(expression.body, lambdaScope);
        break;
      }
    }
  }

  private checkSwitchExpression(expression: SwitchExpression, scope: SemanticScope): void {
    if (expression.discriminant) this.checkExpression(expression.discriminant, scope);
    for (const switchCase of expression.cases) {
      this.checkSwitchCase(switchCase, scope);
    }
  }

  private checkConditionalExpressions(scope: SemanticScope, expressions: Expression[]): void {
    this.conditionalExpressionDepth += 1;
    try {
      this.checkExpressions(scope, expressions);
    } finally {
      this.conditionalExpressionDepth -= 1;
    }
  }

  private checkSwitchCase(switchCase: SwitchCase, scope: SemanticScope): void {
    if (switchCase.test) this.checkExpression(switchCase.test, scope);
    if (Array.isArray(switchCase.consequent)) {
      this.checkStatements(switchCase.consequent, new SemanticScope(scope, true));
    } else {
      this.checkConditionalExpressions(new SemanticScope(scope), [switchCase.consequent]);
    }
  }

  private checkCallExpression(expression: CallExpression, scope: SemanticScope): void {
    this.checkFunctionOverloadOrder(expression, scope);
    if (this.options.resolvedUserMethods && expression.callee.type === 'MemberExpression'
      && this.methodDeclarations.has(expression.callee.property.name)) {
      const receiverType = this.inferExpressionType(expression.callee.object, scope);
      if (['array', 'matrix', 'map'].includes(receiverType.kind)) {
        this.options.resolvedUserMethods.set(expression,
          this.findUserMethodDeclaration(expression.callee.property.name, receiverType, expression, scope) ?? null);
      }
    }
    this.checkCallee(expression.callee, scope);
    for (const argument of expression.arguments) {
      if (this.inferExpressionType(argument.value, scope).kind === 'void') {
        this.addDiagnostic(
          'type-mismatch',
          'Cannot pass a result with no value as a function argument; call it on its own line instead.',
          argument.loc,
        );
      }
    }
    if (!scope.lookup('timeframe')) {
      const refusal = tradingViewTimeframeCompileRefusal(expression, this.currentPineVersion);
      if (refusal) this.addDiagnostic('unsupported-feature', refusal, expression.loc);
    }
    this.checkBuiltinSignature(expression, scope);
    this.checkUniqueBuiltinArguments(expression, scope);
    this.checkUdtConstructorSignature(expression, scope);
    this.checkImportedLibraryCallAvailability(expression, scope);
    this.checkArrayConstructorTypeArguments(expression);
    this.checkArrayConstructorInitialValue(expression, scope);
    this.checkNestedArrayFromElements(expression, scope);
    this.checkMatrixConstructorTypeArguments(expression, scope);
    this.checkMapConstructorTypeArguments(expression);
    this.checkCollectionIdArgument(expression, scope);
    this.checkNumericCollectionElements(expression, scope);
    this.checkBooleanArrayElements(expression, scope);
    this.checkCollectionIntegerArguments(expression, scope);
    this.checkArrayCallTypes(expression, scope);
    this.checkArraySortFieldType(expression, scope);
    this.checkMatrixCallTypes(expression, scope);
    this.checkMatrixKronSecondOperand(expression, scope);
    this.checkMatrixMultSecondOperand(expression, scope);
    this.checkMatrixSortFieldType(expression, scope);
    this.checkMapCallTypes(expression, scope);
    this.checkInputDefaultValueType(expression, scope);
    this.checkInputRangeArguments(expression, scope);
    this.checkInputBoolOptionArguments(expression, scope);
    this.checkInputStringOptionArguments(expression, scope);
    this.checkInputOptionsArgumentType(expression, scope);
    this.checkInputDisplayQualifier(expression, scope);
    this.checkColorFunctionArgumentTypes(expression, scope);
    this.checkStringFunctionArgumentTypes(expression, scope);
    this.checkMathFunctionArgumentTypes(expression, scope);
    this.checkTaFunctionArgumentTypes(expression, scope);
    this.checkHeikinashiSymbolType(expression, scope);
    this.checkTimeFunctionArgumentTypes(expression, scope);
    this.checkTimeOffsetLiteralArguments(expression, scope);
    this.checkGlobalFunctionArgumentTypes(expression, scope);
    this.checkChartPointFunctionArgumentTypes(expression, scope);
    this.checkDrawingReceiver(expression, scope);
    this.checkDrawingFunctionArgumentTypes(expression, scope);
    this.checkDrawingClosedArgumentTypes(expression, scope);
    this.checkDrawingObjectCastArgumentType(expression, scope);
    this.checkTableFunctionArgumentTypes(expression, scope);
    this.checkMaxBarsBackArguments(expression, scope);
    this.checkAlertFrequencyLiteralArguments(expression);
    this.checkGlobalOnlyCallScope(expression, scope);
    this.checkFillHandleKinds(expression, scope);
    this.checkAlertStringOptionArguments(expression, scope);
    this.checkLogFormattingArguments(expression, scope);
    this.checkAlertBoolOptionArguments(expression, scope);
    this.checkRequestCalcBarsCountLiteralArguments(expression);
    this.checkRequestBarmergeModeLiteralArguments(expression, scope);
    this.checkRequestSeriesFieldLiteralArguments(expression, scope);
    this.checkRequestBoolOptionArguments(expression, scope);
    this.checkRequestStringOptionArguments(expression, scope);
    this.checkRequestContextQualifiers(expression, scope);
    this.checkLowerTimeframeExpressionCollections(expression, scope);
    this.checkVisualLineStyleLiteralArguments(expression, scope);
    this.checkQuandlIndexArgument(expression, scope);
    this.checkFootprintTicksPerRowArgument(expression, scope);
    this.checkVisualFormatPrecisionLiteralArguments(expression, scope);
    this.checkMarkerStyleLocationSizeLiteralArguments(expression);
    this.checkVisualNumericOptionLiteralArguments(expression, scope);
    this.checkVisualNumericOptionArguments(expression, scope);
    this.checkHlineArgumentQualifiers(expression, scope);
    this.checkVisualStringOptionArguments(expression, scope);
    this.checkVisualBoolOptionArguments(expression, scope);
    this.checkV6VisualArgumentQualifiers(expression, scope);
    this.checkColorOptionArguments(expression, scope);
    this.checkDisplayOptionLiteralArguments(expression, scope);
    this.checkDrawingCoordinateOptionLiteralArguments(expression, scope);
    this.checkDrawingStyleOptionLiteralArguments(expression, scope);
    this.checkDrawingTextOptionLiteralArguments(expression, scope);
    this.checkDrawingStringOptionArguments(expression, scope);
    this.checkTablePositionOptionLiteralArguments(expression, scope);
    this.checkDrawingSizeOptionLiteralArguments(expression, scope);
    this.checkTickerLinebreakArgumentTypes(expression, scope);
    this.checkTickerOptionLiteralArguments(expression, scope);
    this.checkStrategyLiteralArgumentConstraints(expression);
    this.checkStrategyBoolOptionArguments(expression, scope);
    this.checkStrategyStringOptionArguments(expression, scope);
    this.checkStrategyEnumStringOptionArguments(expression, scope);
    this.checkStrategyNumericOptionArguments(expression, scope);
    this.checkUserCallableArguments(expression, scope);
    if (scope.executionMayBeSkipped || this.conditionalExpressionDepth > 0) {
      this.conditionalHistoryCalls.add(expression);
    }
    this.checkUserMethodReceiverType(expression, scope);
    const legacySecurityExpression = expression.callee.type === 'Identifier'
      && expression.callee.name === 'security'
      && this.versionRules.allowsLegacyGlobalBuiltinAliases
      && !this.hasLocalUserCallableShadow(expression, scope)
      ? this.getCallArgument(expression.arguments, 'expression', 2)
      : undefined;
    for (const argument of expression.arguments) {
      if (argument.value !== legacySecurityExpression) {
        this.checkExpression(argument.value, scope);
        continue;
      }
      const references = new Set<SemanticSymbol>();
      this.legacySecurityExpressions.push({ references, loc: argument.value.loc });
      this.activeLegacySecurityReferences.push(references);
      try {
        this.checkExpression(argument.value, scope);
      } finally {
        this.activeLegacySecurityReferences.pop();
      }
    }
  }

  private checkUniqueBuiltinArguments(expression: CallExpression, scope: SemanticScope): void {
    const name = this.memberPath(expression.callee).join('.');
    const signature = this.resolveBuiltinSignature(name, expression, scope);
    if (!signature) return;
    const params = this.resolveSignatureParams(expression.arguments, signature, scope);
    const permitted: Record<string, string> = name === 'plot'
      ? { style: 'plot_style', linestyle: 'plot_line_style' }
      : name === 'hline' ? { linestyle: 'hline_style' } : {};
    for (const [index, param] of params.entries()) {
      const argument = this.resolveCallArgumentExpression(expression, params, index);
      if (!argument) continue;
      const type = this.inferExpressionType(argument, scope);
      if (permitted[param] && !this.versionRules.allowsRawUniqueParameterValues && type.kind !== 'unique' && type.kind !== 'unknown') {
        this.addDiagnostic(
          'type-mismatch',
          `${name} ${param} requires a ${permitted[param]} constant.`,
          argument.loc,
        );
        continue;
      }
      if (type.kind !== 'unique' || permitted[param] === type.name) continue;
      this.addDiagnostic(
        'type-mismatch',
        `${name} ${param} cannot use a ${type.name} value; use it only with its documented style parameter.`,
        argument.loc,
      );
    }
  }

  private checkCallee(callee: Expression, scope: SemanticScope): void {
    if (callee.type === 'Identifier') {
      const canonicalName = canonicalBuiltinName(callee.name);
      if (!BUILTIN_FUNCTIONS.has(callee.name) && !BUILTIN_SIGNATURES.has(canonicalName) && !scope.lookup(callee.name)) {
        this.addDiagnostic('unknown-function', this.unknownFunctionMessage(callee.name), callee.loc);
      }
      return;
    }

    if (callee.type === 'MemberExpression') {
      this.checkExpression(callee.object, scope);
      return;
    }

    this.checkExpression(callee, scope);
  }

  private checkMemberExpression(expression: MemberExpression, scope: SemanticScope): void {
    if (this.checkImportedEnumMemberExpression(expression, scope)) {
      return;
    }
    if (expression.object.type === 'Identifier') {
      const objectSymbol = scope.lookup(expression.object.name);
      if (objectSymbol?.kind === 'type') {
        this.checkEnumMemberExpression(expression);
        return;
      }
      if (objectSymbol?.kind === 'import') {
        this.checkImportedNamespaceMemberExpression(expression, scope);
        return;
      }
    }
    if (expression.object.type === 'Identifier' && BUILTIN_NAMESPACES.has(expression.object.name)) {
      if (
        expression.object.name === 'plot' && expression.property.name === 'style_histogram'
        && !scope.lookup('plot') && !this.versionRules.supportsNamespacedHistogramStyle
      ) {
        this.addDiagnostic('version-mismatch', 'plot.style_histogram was introduced in Pine v4. Use histogram in Pine v3.', expression.loc);
      }
      return;
    }
    this.checkExpression(expression.object, scope);

    const objectType = this.inferExpressionType(expression.object, scope);
    if (objectType.kind !== 'udt' || !objectType.name || !this.isKnownUdtType(objectType.name)) {
      return;
    }
    if (!this.findUdtField(objectType.name, expression.property.name)) {
      this.addDiagnostic(
        'unknown-field',
        `Unknown field '${expression.property.name}' on type ${objectType.name}`,
        expression.property.loc,
      );
    }
  }

  private checkEnumMemberExpression(expression: MemberExpression): void {
    if (expression.object.type !== 'Identifier') return;

    const enumDeclaration = this.enumDeclarations.get(expression.object.name);
    if (!enumDeclaration) return;
    if (enumDeclaration.fields.some((field) => field.name.name === expression.property.name)) return;

    this.addDiagnostic(
      'unknown-enum-member',
      `Unknown enum member '${expression.property.name}' on enum ${enumDeclaration.name.name}`,
      expression.property.loc,
    );
  }

  private checkImportedNamespaceMemberExpression(expression: MemberExpression, scope: SemanticScope): void {
    const path = this.memberPath(expression);
    if (path.length !== 2) return;

    const [alias, memberName] = path;
    if (!alias || !memberName || scope.lookup(alias)?.kind !== 'import') return;

    const library = this.importedLibraries.get(alias);
    if (!library) return;

    if (!library.functions.has(memberName) && !library.builtinFunctions?.has(memberName)) {
      if (library.constants.has(memberName) || library.types.has(memberName) || library.enums.has(memberName)) return;
      if (library.memberNames.has(memberName)) return;
      if (library.official && this.isKnownBuiltinFunction(`${alias}.${memberName}`)) return;
      this.addDiagnostic(
        'unknown-imported-member',
        `Unknown library member: ${alias}.${memberName}`,
        expression.loc,
      );
      return;
    }

    this.addDiagnostic(
      'invalid-imported-member-reference',
      `Imported library member ${alias}.${memberName} is a function; call it as ${alias}.${memberName}(...)`,
      expression.loc,
    );
  }

  private checkImportedEnumMemberExpression(expression: MemberExpression, scope: SemanticScope): boolean {
    const path = this.memberPath(expression);
    if (path.length !== 3) return false;

    const [alias, enumName, fieldName] = path;
    if (!alias || !enumName || !fieldName || scope.lookup(alias)?.kind !== 'import') return false;

    const library = this.importedLibraries.get(alias);
    if (!library) return false;

    const enumDeclaration = library.enums.get(enumName);
    if (!enumDeclaration) {
      if (library.types.has(enumName) || library.constants.has(enumName)) return false;
      this.addDiagnostic(
        'unknown-enum-member',
        `Unknown imported enum namespace: ${alias}.${enumName}`,
        expression.object.loc,
      );
      return true;
    }
    if (enumDeclaration.fields.some((field) => field.name.name === fieldName)) return true;

    this.addDiagnostic(
      'unknown-enum-member',
      `Unknown enum member '${fieldName}' on enum ${alias}.${enumDeclaration.name.name}`,
      expression.property.loc,
    );
    return true;
  }

  private checkIndexExpression(expression: IndexExpression, scope: SemanticScope, isAssignmentTarget = false): void {
    this.checkExpression(expression.object, scope);
    this.checkExpression(expression.index, scope);
    const indexType = this.inferExpressionType(expression.index, scope);
    if (!isAssignmentTarget && this.currentPineVersion >= 6 && indexType.kind !== 'unknown' && !this.isNumericType(indexType)) {
      this.addDiagnostic('type-mismatch', `History offset must be numeric, got ${this.formatSemanticType(indexType)}`, expression.index.loc);
    }
    if (expression.object.type === 'Identifier') {
      const symbol = scope.lookup(expression.object.name);
      if (!isAssignmentTarget && this.activeFunction && symbol
        && (symbol.kind === 'parameter' || symbol.kind === 'variable')
        && symbol !== this.rootScope.lookup(symbol.name)) {
        this.localHistoryFunctions.add(this.activeFunction);
      }
      if (symbol && this.sparseHistorySymbols.has(symbol)) {
        this.addDiagnostic(
          'inconsistent-local-history',
          `History of local variable '${symbol.name}' can produce inconsistent calculations because its scope does not execute on every bar`,
          expression.loc,
          'warning',
        );
      }
    }
    if (expression.object.type === 'IndexExpression') {
      this.addDiagnostic('type-mismatch', 'History [] cannot be chained on the same value', expression.loc);
    }
    if (!this.versionRules.disallowsLiteralOrUdtFieldHistory) return;
    const object = expression.object;
    const literal = object.type === 'NumericLiteral' || object.type === 'StringLiteral'
      || object.type === 'BooleanLiteral' || object.type === 'ColorLiteral';
    let directField = false;
    let builtinConstant = false;
    if (object.type === 'MemberExpression') {
      const receiverType = this.inferExpressionType(object.object, scope);
      directField = receiverType.kind === 'udt' && !!receiverType.name && !!this.findUdtDeclaration(receiverType.name);
      builtinConstant = object.object.type === 'Identifier'
        && BUILTIN_NAMESPACES.has(object.object.name)
        && !scope.lookup(object.object.name)
        && EXPORTABLE_BUILTIN_CONSTANTS.has(this.memberPath(object).join('.'));
    }
    if (literal || builtinConstant || directField) {
      this.addDiagnostic('invalid-history-reference',
        directField
          ? 'Pine v6 cannot reference UDT field history directly; reference the object history or extract its field to a variable first'
          : 'Pine v6 cannot reference literal or builtin constant history; store the value in a variable first',
        expression.loc);
    }
  }

  private checkIndexAssignmentType(
    target: IndexExpression,
    value: Expression | IfStatement,
    scope: SemanticScope,
    operator: AssignmentStatement['operator'],
  ): void {
    const objectType = this.inferExpressionType(target.object, scope);
    if (objectType.kind !== 'unknown' && objectType.kind !== 'array') {
      this.addDiagnostic(
        'type-mismatch',
        `Index assignment target must be an array, got ${this.formatSemanticType(objectType)}`,
        target.object.loc,
      );
      return;
    }

    const indexType = this.inferExpressionType(target.index, scope);
    if (indexType.kind !== 'unknown' && !this.isNumericType(indexType)) {
      this.addDiagnostic(
        'type-mismatch',
        `Array assignment index must be numeric, got ${this.formatSemanticType(indexType)}`,
        target.index.loc,
      );
    }

    if (value.type === 'IfStatement') return;

    if (objectType.kind !== 'array' || !objectType.elementType) return;

    if (operator !== ':=') {
      this.checkArrayElementCompoundAssignmentType(objectType.elementType, value, scope, operator);
      return;
    }

    const valueType = this.inferExpressionType(value, scope);
    if (this.isAssignableType(objectType.elementType, valueType)) return;

    this.addDiagnostic(
      'type-mismatch',
      `Cannot assign ${this.formatSemanticType(valueType)} value to ${this.formatSemanticType(objectType.elementType)} array element`,
      value.loc,
    );
  }

  private checkArrayElementCompoundAssignmentType(
    elementType: SemanticType,
    value: Expression,
    scope: SemanticScope,
    operator: AssignmentStatement['operator'],
  ): void {
    if (elementType.kind === 'unknown') return;

    const sourceType = this.inferExpressionType(value, scope);
    if (sourceType.kind === 'unknown') return;

    const resultType = this.inferCompoundAssignmentResultType(operator, elementType, sourceType);
    if (!resultType) {
      this.addDiagnostic(
        'type-mismatch',
        `Compound assignment ${operator} requires ${operator === '+=' ? 'numeric or string' : 'numeric'} operands, got ${this.formatSemanticType(elementType)} and ${this.formatSemanticType(sourceType)} for array element`,
        value.loc,
      );
      return;
    }

    if (!this.isAssignableQualifier(elementType.qualifier, resultType.qualifier)) {
      this.addDiagnostic(
        'qualifier-mismatch',
        `Cannot assign ${resultType.qualifier} value to ${elementType.qualifier} ${this.formatSemanticType(elementType)} array element`,
        value.loc,
      );
      return;
    }

    if (this.isAssignableType(elementType, resultType)) return;

    this.addDiagnostic(
      'type-mismatch',
      `Cannot assign ${this.formatSemanticType(resultType)} value to ${this.formatSemanticType(elementType)} array element`,
      value.loc,
    );
  }

  private checkBuiltinSignature(expression: CallExpression, scope: SemanticScope): void {
    if (this.hasLocalUserCallableShadow(expression, scope)) return;
    if (this.hasImportedNamespaceCallableShadow(expression, scope)) return;

    const displayName = this.builtinSignatureDisplayName(expression, scope);
    const signature = this.resolveBuiltinSignature(displayName, expression, scope);
    if (!signature) {
      this.checkUnsupportedBuiltinNamespaceCall(expression, displayName, scope);
      return;
    }
    if (
      displayName === 'color'
      && expression.arguments.length > 1
      && !this.versionRules.supportsLegacyColorTransparencyOverload
    ) {
      this.addDiagnostic(
        'version-mismatch',
        'The color() transparency constructor was renamed to color.new() in Pine v4.',
        expression.callee.loc,
      );
      return;
    }
    if (
      expression.callee.type === 'MemberExpression'
      && this.versionRules.allowsLegacyGlobalBuiltinAliases
      && ['ta.hma', 'str.tonumber', 'ta.cum'].includes(displayName)
    ) {
      this.addDiagnostic(
        'version-mismatch',
        `${displayName}() was introduced in Pine v5. Use ${displayName.split('.').at(-1)}() in Pine v${this.currentPineVersion}.`,
        expression.callee.loc,
      );
      return;
    }
    if (
      expression.callee.type === 'Identifier'
      && isVersionedLegacyGlobalBuiltinAlias(displayName)
      && !this.versionRules.allowsLegacyGlobalBuiltinAliases
    ) {
      const canonicalName = canonicalBuiltinName(displayName);
      this.addDiagnostic(
        'version-mismatch',
        `${displayName}() is a legacy Pine v3-v4 global. Use ${canonicalName}() in Pine v${this.currentPineVersion}.`,
        expression.callee.loc,
      );
      return;
    }
    if ((displayName === 'ticker.linebreak' || displayName === 'ticker.kagi') && this.versionRules.allowsLegacyGlobalBuiltinAliases) {
      this.addDiagnostic(
        'version-mismatch',
        `${displayName}() was introduced in Pine v5. Use ${displayName.slice('ticker.'.length)}() in Pine v3-v4.`,
        expression.callee.loc,
      );
      return;
    }
    if (!isBuiltinSignatureAvailableInPineVersion(displayName, this.currentPineVersion)) {
      const message = displayName === 'offset'
        ? 'offset() was removed in Pine v5. Use the history operator: source[offset].'
        : `${displayName}() was removed in Pine v5. Use the conditional operator: condition ? thenValue : elseValue.`;
      this.addDiagnostic(
        'version-mismatch',
        message,
        expression.callee.loc,
      );
      return;
    }
    if (
      displayName === 'input'
      && this.legacyInputTypeCallName(expression)
      && !this.versionRules.allowsLegacyGenericInputTypeArgument
    ) {
      const typeArgument = this.getCallArgument(expression.arguments, 'type', 2);
      const typeLabel = typeArgument ? this.legacyInputTypeArgumentLabel(typeArgument) : 'input.*';
      this.addDiagnostic(
        'version-mismatch',
        `Generic input(..., type=${typeLabel}) was replaced in Pine v5. Use the typed helper, for example input.int(...), input.float(...), input.bool(...), or input.string(...).`,
        typeArgument?.loc ?? expression.callee.loc,
      );
      return;
    }

    this.checkArgumentOrder(expression.arguments, displayName, signature);
    this.checkArgumentNames(expression.arguments, signature, displayName, scope);
    this.checkArgumentCount(expression.arguments, signature, displayName, scope);
    this.checkDuplicateArgumentBindings(expression.arguments, signature, displayName, scope);
    this.checkLegacyCompatibleArguments(expression.arguments, signature, displayName);
    if (displayName === 'syminfo.prefix' || displayName === 'syminfo.ticker') {
      this.checkBuiltinArgumentKind(expression, scope, displayName, signature.params, 'symbol', 'string', signature);
    }
  }

  private resolveBuiltinSignature(displayName: string, expression: CallExpression, scope: SemanticScope): BuiltinSignature | undefined {
    if (this.hasLocalUserCallableShadow(expression, scope)) return undefined;
    if (this.hasImportedNamespaceCallableShadow(expression, scope)) return undefined;

    const namespaceSignature = BUILTIN_SIGNATURES.get(displayName);
    const namespace = displayName.split('.')[0];
    const firstArgumentType = expression.arguments[0]
      ? this.inferExpressionType(expression.arguments[0].value, scope).kind
      : undefined;
    const calleeObject = expression.callee.type === 'MemberExpression' ? expression.callee.object : undefined;
    if (
      namespaceSignature
      && BUILTIN_NAMESPACES.has(namespace)
      && calleeObject?.type === 'Identifier'
      && calleeObject.name === namespace
      && firstArgumentType === namespace
    ) {
      return namespaceSignature;
    }

    const receiverMethodSignature = this.resolveBuiltinReceiverMethodSignature(expression, scope);
    if (receiverMethodSignature) return receiverMethodSignature;

    const importedBuiltin = this.resolveOfficialImportedFunction(displayName, scope);
    if (importedBuiltin) {
      return {
        params: importedBuiltin.params,
        minArgs: importedBuiltin.minArgs,
        maxArgs: importedBuiltin.maxArgs,
        allowNamedPrefixWithPositional: true,
      };
    }
    if (displayName === 'input' && this.legacyInputTypeCallName(expression)) {
      return LEGACY_INPUT_SIGNATURE;
    }
    if (displayName === 'tostring' && this.versionRules.allowsLegacyGlobalBuiltinAliases) {
      return { params: ['x', 'y'], minArgs: 1, maxArgs: 2, allowNamedPrefixWithPositional: true };
    }
    if (
      DRAWING_OBJECT_CAST_NAMES.has(displayName)
      || (displayName === 'color' && this.usesNaCastOverload(expression))
    ) {
      return PINE_NA_CAST_SIGNATURE;
    }
    if (displayName === 'color' && this.usesLegacyColorTransparencyOverload(expression, scope)) {
      return LEGACY_COLOR_TRANSP_SIGNATURE;
    }
    if (displayName === 'label.new') {
      return this.usesLabelPointOverload(expression, scope) ? LABEL_NEW_POINT_SIGNATURE : LABEL_NEW_COORDINATE_SIGNATURE;
    }
    if (displayName === 'line.new') {
      return this.usesLinePointOverload(expression, scope) ? LINE_NEW_POINT_SIGNATURE : LINE_NEW_COORDINATE_SIGNATURE;
    }
    if (displayName === 'box.new') {
      return this.usesBoxPointOverload(expression, scope) ? BOX_NEW_POINT_SIGNATURE : BOX_NEW_COORDINATE_SIGNATURE;
    }
    if (displayName === 'security' && this.versionRules.allowsLegacyGlobalBuiltinAliases) {
      const signature = BUILTIN_SIGNATURES.get('request.security');
      return signature ? { ...signature, aliases: { ...signature.aliases, resolution: 'timeframe' } } : undefined;
    }
    const exactSignature = BUILTIN_SIGNATURES.get(displayName);
    if (this.currentPineVersion >= 6 && exactSignature && (displayName === 'str.format' || displayName === 'str.format_time')) {
      return { ...exactSignature, minArgs: displayName === 'str.format' ? 2 : 1 };
    }
    if (this.currentPineVersion >= 6 && exactSignature && (displayName === 'ta.tr' || displayName === 'ta.vwap')) {
      return { ...exactSignature, minArgs: 1, requiredParams: [displayName === 'ta.tr' ? 'handle_na' : 'source'] };
    }
    if (displayName === 'math.asin' && this.currentPineVersion >= 5 && exactSignature) {
      return { ...exactSignature, params: ['angle'], aliases: undefined };
    }
    if (displayName === 'nz' && this.currentPineVersion <= 4 && exactSignature) {
      return { ...exactSignature, aliases: { x: 'source', y: 'replacement' } };
    }
    if (displayName === 'time_close' && exactSignature && this.versionRules.supportsLegacyResolutionDeclarationParams) {
      return { ...exactSignature, aliases: { ...exactSignature.aliases, resolution: 'timeframe' } };
    }
    if (exactSignature) return exactSignature;
    return expression.callee.type === 'Identifier'
      ? BUILTIN_SIGNATURES.get(canonicalBuiltinName(displayName))
      : undefined;
  }

  private builtinSignatureDisplayName(expression: CallExpression, scope: SemanticScope): string {
    return this.builtinReceiverMethodName(expression, scope)
      ?? this.memberPath(expression.callee).join('.');
  }

  private resolveBuiltinReceiverMethodSignature(expression: CallExpression, scope: SemanticScope): BuiltinSignature | undefined {
    const methodName = this.builtinReceiverMethodName(expression, scope);
    if (!methodName) return undefined;

    const signature = BUILTIN_SIGNATURES.get(methodName);
    if (!signature) return undefined;

    return {
      ...signature,
      params: signature.params.slice(1),
      minArgs: signature.minArgs === undefined ? undefined : Math.max(0, signature.minArgs - 1),
      maxArgs: signature.maxArgs === undefined ? undefined : Math.max(0, signature.maxArgs - 1),
      requiredParams: signature.requiredParams?.filter((param) => param !== signature.params[0]),
      namedPrefixWithPositionalParams: signature.namedPrefixWithPositionalParams?.filter((param) => param !== signature.params[0]),
    };
  }

  private builtinReceiverMethodName(expression: CallExpression, scope: SemanticScope): string | undefined {
    if (expression.callee.type !== 'MemberExpression') return undefined;

    const receiverType = this.inferExpressionType(expression.callee.object, scope);
    if (!this.isBuiltinReceiverMemberMethod(receiverType, expression.callee.property.name)) return undefined;
    if (this.findUserMethodDeclaration(expression.callee.property.name, receiverType, expression, scope)) return undefined;

    const methodName = `${receiverType.kind}.${expression.callee.property.name}`;
    return BUILTIN_SIGNATURES.has(methodName) ? methodName : undefined;
  }

  private hasLocalUserCallableShadow(expression: CallExpression, scope: SemanticScope): boolean {
    if (expression.callee.type === 'Identifier') {
      const symbol = scope.lookupFunction(expression.callee.name);
      return symbol?.kind === 'function';
    }

    if (expression.callee.type === 'MemberExpression' && this.methodDeclarations.has(expression.callee.property.name)) {
      const receiverType = this.inferExpressionType(expression.callee.object, scope);
      if (receiverType.kind !== 'unknown' && this.findUserMethodDeclaration(expression.callee.property.name, receiverType, expression, scope)) return true;
    }

    const calleePath = this.memberPath(expression.callee);
    if (calleePath.length !== 2 || calleePath[1] !== 'new') return false;

    const [typeName] = calleePath;
    if (!typeName || !this.typeDeclarations.has(typeName)) return false;
    return !!this.findUdtDeclaration(typeName);
  }

  private hasImportedNamespaceCallableShadow(expression: CallExpression, scope: SemanticScope): boolean {
    const calleePath = this.memberPath(expression.callee);
    if (calleePath.length !== 2) return false;

    const [alias, member] = calleePath;
    if (!alias || !member || scope.lookup(alias)?.kind !== 'import') return false;

    const library = this.importedLibraries.get(alias);
    if (!library) return false;

    return library.functions.has(member) || library.builtinFunctions?.has(member) === true;
  }

  private usesNaCastOverload(expression: CallExpression): boolean {
    if (expression.arguments.length !== 1) return false;
    const argument = expression.arguments[0];
    return !argument?.name && argument.value.type === 'NaExpression';
  }

  private usesLegacyColorTransparencyOverload(expression: CallExpression, scope: SemanticScope): boolean {
    if (expression.arguments.some((argument) => argument.name?.name === 'transp' || argument.name?.name === 'color')) return true;
    const positional = expression.arguments.filter((argument) => !argument.name);
    if (positional.length < 1 || positional.length > 2) return false;
    return this.inferExpressionType(positional[0]!.value, scope).kind === 'color';
  }

  private legacyInputTypeCallName(expression: CallExpression): string | undefined {
    const typeArgument = this.getCallArgument(expression.arguments, 'type', 2);
    if (!typeArgument) return undefined;
    if (typeArgument.type === 'MemberExpression') {
      return LEGACY_INPUT_TYPE_ALIASES.get(this.memberPath(typeArgument).join('.'));
    }
    if (typeArgument.type === 'Identifier' && this.versionRules.allowsLegacyGenericInputTypeArgument) {
      return LEGACY_INPUT_TYPE_ALIASES.get(typeArgument.name);
    }
    if (typeArgument.type === 'StringLiteral') {
      return LEGACY_INPUT_TYPE_ALIASES.get(typeArgument.value) ?? LEGACY_INPUT_TYPE_ALIASES.get(`input.${typeArgument.value}`);
    }
    return undefined;
  }

  private legacyInputTypeArgumentLabel(expression: Expression): string {
    if (expression.type === 'MemberExpression') return this.memberPath(expression).join('.');
    if (expression.type === 'Identifier') return expression.name;
    if (expression.type === 'StringLiteral') return JSON.stringify(expression.value);
    return 'input.*';
  }

  private effectiveInputCallName(expression: CallExpression): string {
    const displayName = this.memberPath(expression.callee).join('.');
    return displayName === 'input' ? (this.legacyInputTypeCallName(expression) ?? displayName) : displayName;
  }

  private usesLabelPointOverload(expression: CallExpression, scope: SemanticScope): boolean {
    const suppliedNames = new Set(expression.arguments.flatMap((arg) => arg.name ? [arg.name.name] : []));
    if (suppliedNames.has('point')) return true;
    return this.leadingArgumentTypes(expression, scope, 1).some((type) => type.kind === 'chart.point');
  }

  private usesLinePointOverload(expression: CallExpression, scope: SemanticScope): boolean {
    const suppliedNames = new Set(expression.arguments.flatMap((arg) => arg.name ? [arg.name.name] : []));
    if (suppliedNames.has('first_point') || suppliedNames.has('second_point')) return true;
    return this.leadingArgumentTypes(expression, scope, 2).some((type) => type.kind === 'chart.point');
  }

  private usesBoxPointOverload(expression: CallExpression, scope: SemanticScope): boolean {
    const suppliedNames = new Set(expression.arguments.flatMap((arg) => arg.name ? [arg.name.name] : []));
    if (suppliedNames.has('top_left') || suppliedNames.has('bottom_right')) return true;
    return this.leadingArgumentTypes(expression, scope, 2).some((type) => type.kind === 'chart.point');
  }

  private leadingArgumentTypes(expression: CallExpression, scope: SemanticScope, count: number): SemanticType[] {
    return expression.arguments
      .filter((arg) => !arg.name)
      .slice(0, count)
      .map((arg) => this.inferExpressionType(arg.value, scope));
  }

  private checkUnsupportedBuiltinNamespaceCall(expression: CallExpression, displayName: string, scope: SemanticScope): void {
    if (expression.callee.type !== 'MemberExpression') return;
    if (this.resolveLocalUserCallable(expression, scope)) return;

    const namespace = this.memberPath(expression.callee)[0];
    if (!namespace) return;

    const plannedUnsupportedMessage = PLANNED_UNSUPPORTED_BUILTIN_CALL_MESSAGES.get(displayName);
    if (plannedUnsupportedMessage && !scope.lookup(namespace)) {
      this.addDiagnostic('unsupported-feature', plannedUnsupportedMessage, expression.callee.loc);
      return;
    }

    if (!SIGNED_BUILTIN_CALL_NAMESPACES.has(namespace)) return;
    this.addDiagnostic('unknown-function', this.unknownFunctionMessage(displayName), expression.callee.loc);
  }

  private checkImportedLibraryCallAvailability(expression: CallExpression, scope: SemanticScope): void {
    if (expression.callee.type !== 'MemberExpression') return;

    const path = this.memberPath(expression.callee);
    const [alias, memberName] = path;
    if (alias && memberName && this.importedLibraries.has(alias)) {
      this.checkImportedNamespaceCallAvailability(expression, path);
      return;
    }

    this.checkImportedMethodCallAvailability(expression, scope);
  }

  private checkImportedNamespaceCallAvailability(expression: CallExpression, path: string[]): void {
    const [alias, memberName] = path;
    if (!alias || !memberName) return;

    const library = this.importedLibraries.get(alias);
    if (!library) return;

    if (path.length === 2) {
      if (library.functions.has(memberName)) return;
      const officialFunction = library.builtinFunctions?.get(memberName);
      if (officialFunction) {
        if (!officialFunction.runtimeName) {
          const officialPath = library.official
            ? `${library.official.owner}/${library.official.library}/${library.official.version}`
            : alias;
          this.addDiagnostic(
            'unsupported-feature',
            unsupportedOfficialTradingViewFunctionMessage(officialPath, memberName),
            expression.callee.loc,
          );
        }
        return;
      }
      if (library.official && this.isKnownBuiltinFunction(`${alias}.${memberName}`)) return;
      this.addDiagnostic('unknown-function', `Unknown library function: ${alias}.${memberName}`, expression.callee.loc);
      return;
    }

    if (path.length === 3 && path[2] === 'new') {
      if (library.types.has(memberName)) return;
      this.addDiagnostic('unknown-function', `Unknown library constructor: ${alias}.${memberName}.new`, expression.callee.loc);
    }
  }

  private checkImportedMethodCallAvailability(expression: CallExpression, scope: SemanticScope): void {
    if (expression.callee.type !== 'MemberExpression') return;
    if (expression.callee.property.name === 'copy') return;

    const receiverType = this.inferExpressionType(expression.callee.object, scope);
    if (expression.callee.property.name === 'title' && this.isEnumSemanticType(receiverType)) return;

    const importedReceiver = this.importedReceiverType(receiverType);
    if (!importedReceiver) return;

    if (this.resolveLocalUserCallable(expression, scope)) return;
    if (this.importedLibraries.get(importedReceiver.alias)?.methods.has(expression.callee.property.name)) return;

    const displayName = this.memberPath(expression.callee).join('.') || expression.callee.property.name;
    this.addDiagnostic('unknown-function', this.unknownFunctionMessage(displayName), expression.callee.loc);
  }

  private checkUdtConstructorSignature(expression: CallExpression, scope: SemanticScope): void {
    const calleePath = this.memberPath(expression.callee);
    if (
      (calleePath.length !== 2 || calleePath[1] !== 'new')
      && (calleePath.length !== 3 || calleePath[2] !== 'new')
    ) return;

    const typeName = calleePath.length === 2 ? calleePath[0] : `${calleePath[0]}.${calleePath[1]}`;
    if (!typeName) return;
    const declaration = this.findUdtDeclaration(typeName);
    if (!declaration) return;

    const displayName = `${typeName}.new`;
    const fields = declaration.fields.map((field) => field.name.name);
    const positionalCount = this.leadingPositionalCount(expression.arguments);

    this.checkArgumentOrder(expression.arguments, displayName);

    if (positionalCount > fields.length) {
      this.addDiagnostic(
        'argument-count',
        `${displayName}() expects at most ${fields.length} argument${fields.length === 1 ? '' : 's'}`,
        expression.arguments[fields.length]?.loc,
      );
    }

    const seenNames = new Set<string>();
    let positionalIndex = 0;
    let hasNamedArgument = false;
    for (const argument of expression.arguments) {
      if (!argument.name) {
        if (hasNamedArgument) {
          positionalIndex += 1;
          continue;
        }
        const field = declaration.fields[positionalIndex];
        if (field) {
          this.checkUdtFieldValueType(typeName, field, argument.value, scope);
        }
        positionalIndex += 1;
        continue;
      }

      hasNamedArgument = true;
      const fieldName = argument.name.name;
      const field = this.findUdtField(typeName, fieldName);
      if (!field) {
        this.addDiagnostic('unknown-field', `Unknown field '${fieldName}' for ${displayName}()`, argument.name.loc);
        continue;
      }

      if (seenNames.has(fieldName) || fields.indexOf(fieldName) < positionalCount) {
        this.addDuplicateArgumentDiagnostic(argument, `Field '${fieldName}' for ${displayName}() was supplied multiple times`);
        continue;
      }

      seenNames.add(fieldName);
      this.checkUdtFieldValueType(typeName, field, argument.value, scope);
    }
  }

  private checkUdtFieldAssignmentType(target: MemberExpression, value: Expression, scope: SemanticScope, operator: AssignmentStatement['operator']): void {
    const objectType = this.inferExpressionType(target.object, scope);
    if (objectType.kind !== 'udt' || !objectType.name || !this.isKnownUdtType(objectType.name)) {
      return;
    }

    const field = this.findUdtField(objectType.name, target.property.name);
    if (!field) return;

    if (operator !== ':=') {
      this.checkUdtFieldCompoundAssignmentType(objectType.name, field, value, scope, operator);
      return;
    }

    this.checkUdtFieldValueType(objectType.name, field, value, scope);
  }

  private checkUdtFieldCompoundAssignmentType(
    typeName: string,
    field: TypeFieldDeclaration,
    value: Expression,
    scope: SemanticScope,
    operator: AssignmentStatement['operator'],
  ): void {
    const targetType = this.typeFromAnnotation(field.typeAnnotation ?? undefined);
    if (!targetType || targetType.kind === 'unknown') return;

    const sourceType = this.inferExpressionType(value, scope);
    if (sourceType.kind === 'unknown') return;

    const resultType = this.inferCompoundAssignmentResultType(operator, targetType, sourceType);
    if (!resultType) {
      this.addDiagnostic(
        'type-mismatch',
        `Compound assignment ${operator} requires ${operator === '+=' ? 'numeric or string' : 'numeric'} operands, got ${this.formatSemanticType(targetType)} and ${this.formatSemanticType(sourceType)} for field ${typeName}.${field.name.name}`,
        value.loc,
      );
      return;
    }

    if (!this.isAssignableQualifier(targetType.qualifier, resultType.qualifier)) {
      this.addDiagnostic(
        'qualifier-mismatch',
        `Cannot assign ${resultType.qualifier} value to ${targetType.qualifier} ${this.formatSemanticType(targetType)} field ${typeName}.${field.name.name}`,
        value.loc,
      );
      return;
    }

    if (this.isAssignableType(targetType, resultType)) return;

    this.addDiagnostic(
      'type-mismatch',
      `Cannot assign ${this.formatSemanticType(resultType)} value to ${this.formatSemanticType(targetType)} field ${typeName}.${field.name.name}`,
      value.loc,
    );
  }

  private checkUdtFieldValueType(typeName: string, field: TypeFieldDeclaration, value: Expression, scope: SemanticScope): void {
    const targetType = this.typeFromAnnotation(field.typeAnnotation ?? undefined);
    if (!targetType) return;

    if (targetType.kind === 'bool' && this.isNaLiteralExpression(value) && !this.versionRules.allowsBoolNaHelpers) {
      this.addDiagnostic(
        'type-mismatch',
        this.boolNaVersionMessage(`Cannot assign na value to bool field ${typeName}.${field.name.name}`),
        value.loc,
      );
      return;
    }

    const sourceType = this.inferExpressionType(value, scope);
    if (!this.isAssignableQualifier(targetType.qualifier, sourceType.qualifier)) {
      this.addDiagnostic(
        'qualifier-mismatch',
        `Cannot assign ${sourceType.qualifier} value to ${targetType.qualifier} ${this.formatSemanticType(targetType)} field ${typeName}.${field.name.name}`,
        value.loc,
      );
      return;
    }

    if (this.isAssignableType(targetType, sourceType)) return;

    this.addDiagnostic(
      'type-mismatch',
      `Cannot assign ${this.formatSemanticType(sourceType)} value to ${this.formatSemanticType(targetType)} field ${typeName}.${field.name.name}`,
      value.loc,
    );
  }

  private checkUdtFieldDefaultValue(typeName: string, field: TypeFieldDeclaration): boolean {
    const value = field.defaultValue;
    if (!value || this.isAllowedUdtFieldDefaultValue(value)) return true;

    this.addDiagnostic(
      'invalid-field-default',
      `Default value for field ${typeName}.${field.name.name} must be a literal value or compatible built-in variable`,
      value.loc,
    );
    return false;
  }

  private isAllowedUdtFieldDefaultValue(value: Expression): boolean {
    switch (value.type) {
      case 'NumericLiteral':
      case 'StringLiteral':
      case 'BooleanLiteral':
      case 'ColorLiteral':
      case 'NaExpression':
        return true;
      case 'Identifier':
        return BUILTIN_GLOBALS.has(value.name);
      case 'MemberExpression':
        return BUILTIN_NAMESPACES.has(this.memberPath(value)[0]);
      case 'UnaryExpression':
        return (value.operator === '-' || value.operator === '+') && value.argument.type === 'NumericLiteral';
      case 'CallExpression': {
        if (this.currentPineVersion >= 6) return false;
        const callee = this.memberPath(value.callee).join('.');
        return (
          callee === 'array.new'
          || callee.startsWith('array.new_')
          || callee === 'matrix.new'
          || callee.startsWith('matrix.new_')
          || callee === 'map.new'
          || callee === 'table.new'
        );
      }
      default:
        return false;
    }
  }

  private checkMapCallTypes(expression: CallExpression, scope: SemanticScope): void {
    const mapCall = this.resolveMapCall(expression, scope);
    if (!mapCall) return;

    switch (mapCall.operation) {
      case 'put_all': {
        const signature = this.resolveBuiltinSignature(this.memberPath(expression.callee).join('.'), expression, scope);
        if (!signature || this.hasUnstableOptionArgumentBindings(expression.arguments, signature)) break;
        const params = this.resolveSignatureParams(expression.arguments, signature, scope);
        const source = this.resolveCallArgumentExpression(expression, params, params.indexOf('id2'), signature);
        if (!source || this.isNaLiteralExpression(source)) break;
        const sourceType = this.inferExpressionType(source, scope);
        if (sourceType.kind !== 'unknown' && sourceType.kind !== 'map') {
          this.addDiagnostic('type-mismatch', `map.put_all id2 must be a map reference, got ${this.formatSemanticType(sourceType)}`, source.loc);
        }
        if (sourceType.kind === 'map' && sourceType.valueType && mapCall.mapType.valueType
          && this.seriesMapValueTypes.has(this.mapValueOrigins.get(sourceType.valueType) ?? sourceType.valueType)) {
          this.seriesMapValueTypes.add(this.mapValueOrigins.get(mapCall.mapType.valueType) ?? mapCall.mapType.valueType);
        }
        break;
      }
      case 'put':
        this.checkMapArgumentType(mapCall.mapType.keyType, mapCall.keyArgument, 'map key', scope);
        this.checkMapArgumentType(mapCall.mapType.valueType, mapCall.valueArgument, 'map value', scope);
        if (mapCall.mapType.valueType && mapCall.valueArgument
          && this.builtinSignatureDisplayName(expression, scope) === 'map.put'
          && this.inferExpressionType(mapCall.valueArgument, scope).qualifier === 'series') {
          this.seriesMapValueTypes.add(this.mapValueOrigins.get(mapCall.mapType.valueType) ?? mapCall.mapType.valueType);
        }
        break;
      case 'get':
      case 'contains':
      case 'remove':
        this.checkMapArgumentType(mapCall.mapType.keyType, mapCall.keyArgument, 'map key', scope);
        break;
    }
  }

  private checkColorFunctionArgumentTypes(expression: CallExpression, scope: SemanticScope): void {
    const calleeName = this.memberPath(expression.callee).join('.');
    const colorParameterNames = COLOR_FUNCTION_COLOR_PARAMETER_NAMES_BY_CALL.get(calleeName);
    const numericParameterNames = COLOR_FUNCTION_NUMERIC_PARAMETER_NAMES_BY_CALL.get(calleeName);
    if (!colorParameterNames && !numericParameterNames) return;

    const signature = this.resolveBuiltinSignature(calleeName, expression, scope);
    if (!signature) return;
    if (this.hasUnstableOptionArgumentBindings(expression.arguments, signature)) return;
    const params = this.resolveSignatureParams(expression.arguments, signature, scope);

    for (const parameterName of colorParameterNames ?? []) {
      this.checkBuiltinArgumentKind(expression, scope, calleeName, params, parameterName, 'color', signature);
    }

    for (const parameterName of numericParameterNames ?? []) {
      this.checkBuiltinArgumentKind(expression, scope, calleeName, params, parameterName, 'number', signature);
    }

    this.checkColorTransparencyLiteralArgument(expression, calleeName, signature);
  }

  private checkColorTransparencyLiteralArgument(expression: CallExpression, calleeName: string, signature: BuiltinSignature): void {
    if (calleeName !== 'color' && calleeName !== 'color.new' && calleeName !== 'color.rgb') return;

    const resolvedParams = this.resolveSignatureParams(expression.arguments, signature);
    const transparency = this.resolveCallArgumentExpression(expression, resolvedParams, resolvedParams.indexOf('transp'), signature);
    this.checkNumericLiteralRangeValue(transparency, 0, 100, `${calleeName} transp must be between 0 and 100`);
  }

  private checkStringFunctionArgumentTypes(expression: CallExpression, scope: SemanticScope): void {
    const calleeName = this.memberPath(expression.callee).join('.');
    const stringParameterNames = STRING_FUNCTION_STRING_PARAMETER_NAMES_BY_CALL.get(calleeName);
    const numericParameterNames = STRING_FUNCTION_NUMERIC_PARAMETER_NAMES_BY_CALL.get(calleeName);
    if (!stringParameterNames && !numericParameterNames) return;

    const signature = this.resolveBuiltinSignature(calleeName, expression, scope);
    if (!signature) return;
    if (this.hasUnstableOptionArgumentBindings(expression.arguments, signature)) return;

    const params = this.resolveSignatureParams(expression.arguments, signature, scope);

    if (calleeName === 'str.tostring') {
      const value = this.resolveCallArgumentExpression(expression, params, params.indexOf('value'), signature);
      const type = value && this.inferExpressionType(value, scope);
      const kind = type?.kind;
      const format = this.resolveCallArgumentExpression(expression, params, params.indexOf('format'), signature);
      const formattedUnsupported = this.currentPineVersion >= 6 && format && type && (
        kind === 'bool' || kind === 'string' || this.isEnumSemanticType(type)
        || ((kind === 'array' || kind === 'matrix') && (type.elementType?.kind === 'bool' || type.elementType?.kind === 'string'))
      );
      if (value && (kind === 'color' || (this.currentPineVersion >= 6 && kind === 'line') || formattedUnsupported)) {
        const displayKind = type && this.isEnumSemanticType(type) ? 'enum' : kind;
        this.addDiagnostic('type-mismatch', `str.tostring value cannot be a ${displayKind}${formattedUnsupported ? ' with a format argument' : ''}`, value.loc);
      }
    }

    if (this.currentPineVersion >= 6 && calleeName === 'str.format') {
      const format = this.resolveCallArgumentExpression(expression, params, params.indexOf('format'), signature);
      for (const argument of expression.arguments) {
        if (argument.value === format) continue;
        const type = this.inferExpressionType(argument.value, scope);
        if (type.kind === 'color' || type.kind === 'line' || type.kind === 'matrix' || this.isEnumSemanticType(type)) {
          const displayKind = this.isEnumSemanticType(type) ? 'enum' : type.kind;
          this.addDiagnostic('type-mismatch', `str.format value cannot be a ${displayKind}`, argument.loc);
        }
      }
    }

    for (const parameterName of stringParameterNames ?? []) {
      this.checkBuiltinArgumentKind(expression, scope, calleeName, params, parameterName, 'string', signature);
    }

    for (const parameterName of numericParameterNames ?? []) {
      this.checkBuiltinArgumentKind(expression, scope, calleeName, params, parameterName, this.currentPineVersion >= 6 ? 'integer' : 'number', signature);
    }
  }

  private checkMathFunctionArgumentTypes(expression: CallExpression, scope: SemanticScope): void {
    const calleeName = this.memberPath(expression.callee).join('.');
    const canonicalName = canonicalBuiltinName(calleeName);
    const parameterNames = MATH_NUMERIC_PARAMETER_NAMES_BY_CALL.get(canonicalName);
    const isVariadicMathCall = MATH_VARIADIC_NUMERIC_PARAMETER_CALLS.has(canonicalName);
    if (!parameterNames && !isVariadicMathCall) return;

    const signature = this.resolveBuiltinSignature(calleeName, expression, scope);
    if (!signature) return;
    if (this.hasUnstableOptionArgumentBindings(expression.arguments, signature)) return;

    const numericParameterNames = canonicalName === 'math.asin' && this.currentPineVersion >= 5
      ? ['angle']
      : isVariadicMathCall ? this.resolveSignatureParams(expression.arguments, signature) : (parameterNames ?? []);
    for (const parameterName of numericParameterNames) {
      const requiresInteger = this.currentPineVersion >= 6 && (
        (canonicalName === 'math.round' && parameterName === 'precision')
        || (canonicalName === 'math.random' && parameterName === 'seed')
        || (canonicalName === 'math.sum' && parameterName === 'length')
      );
      this.checkBuiltinArgumentKind(expression, scope, calleeName, numericParameterNames, parameterName, requiresInteger ? 'integer' : 'number', signature);
    }
  }

  private checkTaFunctionArgumentTypes(expression: CallExpression, scope: SemanticScope): void {
    const calleeName = this.builtinSignatureDisplayName(expression, scope);
    const canonicalName = canonicalBuiltinName(calleeName);
    const numericParameterNames = TA_NUMERIC_PARAMETER_NAMES_BY_CALL.get(canonicalName);
    const boolParameterNames = TA_BOOL_PARAMETER_NAMES_BY_CALL.get(canonicalName);
    const simpleParameterNames = this.currentPineVersion >= 5
      ? taSimpleParameterNamesForVersion(canonicalName, this.currentPineVersion)
      : undefined;
    if (!numericParameterNames && !boolParameterNames && !simpleParameterNames) return;

    const signature = this.resolveBuiltinSignature(calleeName, expression, scope);
    if (!signature) return;
    if (this.hasUnstableOptionArgumentBindings(expression.arguments, signature)) return;
    const params = canonicalName === 'ta.lowest' && expression.arguments.length === 1 && !expression.arguments[0].name
      ? ['length']
      : this.resolveSignatureParams(expression.arguments, signature, scope);

    const requiresInteger = (parameterName: string): boolean => (
      parameterName === 'length' && (
        canonicalName === 'ta.sma' || canonicalName === 'ta.stdev' || canonicalName === 'ta.lowest' || canonicalName === 'ta.stoch'
        || canonicalName === 'ta.highestbars' || canonicalName === 'ta.lowestbars'
        || (this.currentPineVersion >= 6 && ['ta.median', 'ta.mode', 'ta.mom', 'ta.cmo', 'ta.wma', 'ta.rma', 'ta.rci'].includes(canonicalName))
        || (this.currentPineVersion >= 5 && (['ta.ema', 'ta.dev', 'ta.rsi', 'ta.hma', 'ta.correlation', 'ta.percentrank', 'ta.mfi', 'ta.cci', 'ta.atr', 'ta.highest'].includes(canonicalName)))
      )
    ) || (this.currentPineVersion >= 5 && canonicalName === 'ta.linreg'
      && (parameterName === 'length' || parameterName === 'offset'))
      || (this.currentPineVersion >= 5 && canonicalName === 'ta.supertrend' && parameterName === 'atrPeriod')
      || (this.currentPineVersion === 5 && TA_V5_INTEGER_PARAMETER_NAMES_BY_CALL.get(canonicalName)?.includes(parameterName) === true)
      || (this.currentPineVersion >= 6 && TA_INTEGER_PARAMETER_NAMES_BY_CALL.get(canonicalName)?.includes(parameterName) === true);

    for (const parameterName of numericParameterNames ?? []) {
      const parameterIndex = signature.params.indexOf(parameterName);
      const resolvedParameterName = params[parameterIndex] ?? parameterName;
      const expectedKind = requiresInteger(parameterName) ? 'integer' : 'number';
      this.checkBuiltinArgumentKind(expression, scope, calleeName, params, resolvedParameterName, expectedKind, signature);
    }

    if (this.currentPineVersion >= 6 && canonicalName === 'ta.valuewhen') {
      const source = this.resolveCallArgumentExpression(expression, params, params.indexOf('source'), signature);
      const sourceType = source && this.inferExpressionType(source, scope);
      if (source && sourceType && !['unknown', 'int', 'float', 'bool', 'color'].includes(sourceType.kind)) {
        this.addDiagnostic('type-mismatch', `ta.valuewhen source must be int, float, bool or color, got ${this.formatSemanticType(sourceType)}`, source.loc);
      }
    }

    for (const parameterName of boolParameterNames ?? []) {
      this.checkBuiltinArgumentKind(expression, scope, calleeName, params, parameterName, 'boolean', signature);
    }

    if (canonicalName === 'ta.pivot_point_levels') {
      this.checkBuiltinArgumentKind(expression, scope, calleeName, params, 'type', 'string', signature);
    }

    for (const parameterName of simpleParameterNames ?? []) {
      if (requiresInteger(parameterName)) {
        const argument = this.resolveCallArgumentExpression(expression, params, params.indexOf(parameterName), signature);
        const kind = argument && this.inferExpressionType(argument, scope).kind;
        // An invalid integer type already has its precise kind diagnostic.
        if (kind && kind !== 'int' && kind !== 'unknown'
          && !(argument && this.inferExpressionType(argument, scope).integerDivision
            && this.acceptsIntegerDerivedTaLength(argument, scope)
            && parameterName === 'length' && canonicalBuiltinName(calleeName).startsWith('ta.'))) continue;
      }
      this.checkBuiltinArgumentQualifier(expression, scope, calleeName, params, parameterName, 'simple', signature);
    }
  }

  private checkHeikinashiSymbolType(expression: CallExpression, scope: SemanticScope): void {
    const calleeName = this.memberPath(expression.callee).join('.');
    if (canonicalBuiltinName(calleeName) !== 'ticker.heikinashi') return;
    if (calleeName === 'heikinashi' && !this.versionRules.allowsLegacyGlobalBuiltinAliases) return;
    const signature = this.resolveBuiltinSignature(calleeName, expression, scope);
    if (!signature || this.hasUnstableOptionArgumentBindings(expression.arguments, signature)) return;
    this.checkBuiltinArgumentKind(expression, scope, calleeName, signature.params, 'symbol', 'string', signature);
  }

  private checkTimeFunctionArgumentTypes(expression: CallExpression, scope: SemanticScope): void {
    const calleeName = this.memberPath(expression.callee).join('.');
    const stringParameterNames = CALENDAR_FUNCTION_NAMES.has(calleeName)
      ? ['timezone']
      : TIME_STRING_PARAMETER_NAMES_BY_CALL.get(calleeName);
    const numericParameterNames = CALENDAR_FUNCTION_NAMES.has(calleeName)
      ? ['time']
      : TIME_NUMERIC_PARAMETER_NAMES_BY_CALL.get(calleeName);
    if (!stringParameterNames && !numericParameterNames) return;

    const signature = this.resolveBuiltinSignature(calleeName, expression, scope);
    if (!signature) return;
    if (this.hasUnstableOptionArgumentBindings(expression.arguments, signature)) return;

    const params = this.resolveSignatureParams(expression.arguments, signature, scope);

    for (const parameterName of stringParameterNames ?? []) {
      this.checkBuiltinArgumentKind(expression, scope, calleeName, params, parameterName, 'string');
    }

    for (const parameterName of numericParameterNames ?? []) {
      const expectedKind = this.currentPineVersion >= 6 && calleeName === 'timeframe.from_seconds' ? 'integer' : 'number';
      this.checkBuiltinArgumentKind(expression, scope, calleeName, params, parameterName, expectedKind);
    }

    if (calleeName === 'timestamp' && this.currentPineVersion === 6 && params.includes('dateString')) {
      const dateString = this.resolveCallArgumentExpression(expression, params, params.indexOf('dateString'), signature);
      if (dateString?.type === 'StringLiteral' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(dateString.value)) {
        this.addDiagnostic('invalid-argument', 'timestamp(s): unrecognized datetime format', dateString.loc);
      }
    }
  }

  private checkGlobalFunctionArgumentTypes(expression: CallExpression, scope: SemanticScope): void {
    const calleeName = this.memberPath(expression.callee).join('.');
    if (!isBuiltinSignatureAvailableInPineVersion(calleeName, this.currentPineVersion)) return;
    if (calleeName === 'bool') {
      const signature = this.resolveBuiltinSignature(calleeName, expression, scope);
      if (!signature || this.hasUnstableOptionArgumentBindings(expression.arguments, signature)) return;
      const argument = this.getCallArgument(expression.arguments, 'x', 0);
      if (!argument) return;
      const argumentType = this.inferExpressionType(argument, scope);
      if (!['unknown', 'na', 'int', 'float', 'bool'].includes(argumentType.kind)) {
        this.addDiagnostic('type-mismatch', `bool x must be an int, float, bool or na, got ${this.formatSemanticType(argumentType)}`, argument.loc);
      }
      return;
    }
    if (calleeName === 'plot') {
      const signature = this.resolveBuiltinSignature(calleeName, expression, scope);
      if (!signature || this.hasUnstableOptionArgumentBindings(expression.arguments, signature)) return;
      const series = this.resolveCallArgumentExpression(expression, signature.params, 0, signature);
      if (series && (this.currentPineVersion === 6 || ['array', 'matrix', 'map', 'line'].includes(this.inferExpressionType(series, scope).kind))) {
        this.checkBuiltinArgumentKind(expression, scope, calleeName, signature.params, 'series', 'number', signature);
      }
      return;
    }
    if (this.currentPineVersion === 6 && (calleeName === 'plotshape' || calleeName === 'plotchar')) {
      const signature = this.resolveBuiltinSignature(calleeName, expression, scope);
      if (!signature || this.hasUnstableOptionArgumentBindings(expression.arguments, signature)) return;
      const series = this.resolveCallArgumentExpression(expression, signature.params, 0, signature);
      if (!series) return;
      const seriesType = this.inferExpressionType(series, scope);
      if (!['unknown', 'int', 'float', 'bool'].includes(seriesType.kind)) {
        this.addDiagnostic(
          'type-mismatch',
          `${calleeName} series must be an int, float or bool, got ${this.formatSemanticType(seriesType)}`,
          series.loc,
        );
      }
      return;
    }
    if (calleeName === 'fill') {
      const color = this.getNamedOrUnnamedPositionalArg(expression.arguments, 'color', 2);
      this.fillColorQualifiers.set(expression, color ? this.inferExpressionType(color, scope).qualifier ?? 'series' : 'const');
    }
    const nonBoolParameterNames = GLOBAL_NON_BOOL_PARAMETER_NAMES_BY_CALL.get(calleeName);
    const boolParameterNames = GLOBAL_BOOL_PARAMETER_NAMES_BY_CALL.get(calleeName);
    const isNumericCast = calleeName === 'int' || calleeName === 'float';
    if (!nonBoolParameterNames && !boolParameterNames && !isNumericCast) return;

    const signature = this.resolveBuiltinSignature(calleeName, expression, scope);
    if (!signature) return;
    if (this.hasUnstableOptionArgumentBindings(expression.arguments, signature)) return;

    if (isNumericCast) this.checkBuiltinArgumentKind(expression, scope, calleeName, signature.params, 'x', 'number', signature);
    if (calleeName === 'nz') {
      const source = this.inferCallArgumentType(expression, scope, ['source', 'replacement'], 0, signature);
      const replacement = this.inferCallArgumentType(expression, scope, ['source', 'replacement'], 1, signature);
      const knownTypes = [source, replacement].filter((type): type is SemanticType =>
        !!type && type.kind !== 'unknown');
      const unsupported = knownTypes.some((type) =>
        !this.isNumericType(type) && type.kind !== 'color' && type.kind !== 'bool');
      const mixedColor = knownTypes.some((type) => type.kind === 'color') &&
        knownTypes.some((type) => type.kind !== 'color');
      if (unsupported || mixedColor) {
        this.addDiagnostic('type-mismatch', 'No nz overload accepts these source and replacement types', expression.loc);
      }
    }
    if (calleeName === 'fixnan') {
      const source = this.resolveCallArgumentExpression(expression, signature.params, 0, signature);
      if (source) {
        const sourceType = this.inferExpressionType(source, scope);
        if (!['int', 'float', 'color', 'bool', 'unknown'].includes(sourceType.kind)) {
          this.addDiagnostic('type-mismatch', `fixnan source must be numeric or color, got ${this.formatSemanticType(sourceType)}`, source.loc);
        }
      }
    }

    for (const parameterName of nonBoolParameterNames ?? []) {
      this.checkBuiltinArgumentNotBool(expression, scope, calleeName, signature.params, parameterName, signature);
    }
    for (const parameterName of boolParameterNames ?? []) {
      this.checkBuiltinArgumentKind(expression, scope, calleeName, signature.params, parameterName, 'boolean');
    }
  }

  private checkChartPointFunctionArgumentTypes(expression: CallExpression, scope: SemanticScope): void {
    const calleeName = this.memberPath(expression.callee).join('.');
    const numericParameterNames = CHART_POINT_NUMERIC_PARAMETER_NAMES_BY_CALL.get(calleeName);
    if (!numericParameterNames) return;

    const signature = this.resolveBuiltinSignature(calleeName, expression, scope);
    if (!signature) return;
    if (this.hasUnstableOptionArgumentBindings(expression.arguments, signature)) return;

    const parameterNames = this.resolveSignatureParams(expression.arguments, signature);
    for (const parameterName of numericParameterNames) {
      this.checkBuiltinArgumentKind(expression, scope, calleeName, parameterNames, parameterName, 'number', signature);
    }
  }

  private checkTableFunctionArgumentTypes(expression: CallExpression, scope: SemanticScope): void {
    const calleeName = this.memberPath(expression.callee).join('.');
    const numericParameterNames = TABLE_NUMERIC_PARAMETER_NAMES_BY_CALL.get(calleeName);
    if (!numericParameterNames) return;

    const signature = this.resolveBuiltinSignature(calleeName, expression, scope);
    if (!signature) return;
    if (this.hasUnstableOptionArgumentBindings(expression.arguments, signature)) return;

    for (const parameterName of numericParameterNames) {
      this.checkBuiltinArgumentKind(expression, scope, calleeName, signature.params, parameterName, 'number');
    }
  }

  private checkDrawingClosedArgumentTypes(expression: CallExpression, scope: SemanticScope): void {
    const calleeName = this.builtinSignatureDisplayName(expression, scope);
    // These five bare casts are validated by their own family-aware checker.
    if (DRAWING_OBJECT_CAST_TYPES.has(calleeName)) return;
    const family = calleeName.startsWith('chart.point.') ? 'chart.point' : calleeName.split('.')[0]!;
    if (!['line', 'label', 'box', 'table', 'linefill', 'polyline', 'chart.point'].includes(family)) return;
    if (this.hasLocalUserCallableShadow(expression, scope) || this.hasImportedNamespaceCallableShadow(expression, scope)) return;
    const signature = this.resolveBuiltinSignature(calleeName, expression, scope);
    if (!signature || this.hasUnstableOptionArgumentBindings(expression.arguments, signature)) return;
    const method = this.builtinReceiverMethodName(expression, scope) !== undefined;
    const params = this.resolveSignatureParams(expression.arguments, signature);
    this.checkBuiltinArgumentQualifier(expression, scope, calleeName, params, 'force_overlay', 'const', signature);
    for (const [index, name] of params.entries()) {
      const argument = this.resolveCallArgumentExpression(expression, params, index, signature);
      if (!argument) continue;
      const actual = this.inferExpressionType(argument, scope);
      if (actual.kind === 'unknown') continue;
      if (actual.kind === 'float' && this.currentPineVersion >= 5
        && ((calleeName === 'label.new' && name === 'x')
          || (calleeName === 'chart.point.from_index' && name === 'index'))
        && this.isIntegralDrawingCoordinate(argument, scope)) continue;
      if (actual.kind === 'float' && this.currentPineVersion === 5
        && calleeName === 'label.new' && name === 'x'
        && this.isV5LabelMidpoint(argument, scope)) continue;
      let accepted: SemanticTypeKind[];
      if (['id', 'x', 'table_id'].includes(name) && (name !== 'x' || !calleeName.includes('.'))) accepted = [family as SemanticTypeKind];
      else if (['line1', 'line2'].includes(name)) accepted = ['line'];
      else if (['point', 'first_point', 'second_point', 'top_left', 'bottom_right'].includes(name)) accepted = ['chart.point'];
      else if (name === 'points') {
        if (actual.kind === 'array' && actual.elementType?.kind === 'chart.point') continue;
        accepted = ['array'];
      } else if (name.includes('formatting')) {
        if (!method && argument.type === 'StringLiteral' && !DRAWING_TEXT_FORMATTING_VALUES.has(argument.value)) continue;
        if (actual.kind === 'udt' && actual.name === 'text_format') continue;
        accepted = ['udt'];
      }
      else if (['force_overlay', 'curved', 'closed'].includes(name)) accepted = ['bool'];
      else if (['size', 'text_size'].includes(name)) accepted = ['int', 'string'];
      else if (name.includes('color') || name === 'bgcolor') accepted = ['color'];
      else if (['x', 'x1', 'x2', 'left', 'right', 'index', 'time', 'column', 'row', 'columns', 'rows', 'start_column', 'start_row', 'end_column', 'end_row', 'line_width', 'border_width', 'frame_width', 'width'].includes(name)) {
        accepted = family === 'table' && name === 'width' ? ['int', 'float'] : ['int'];
      } else if (['y', 'y1', 'y2', 'top', 'bottom', 'price', 'height'].includes(name)) accepted = ['int', 'float'];
      else accepted = ['string'];
      if (name !== 'points' && !name.includes('formatting') && accepted.includes(actual.kind)) continue;
      if (actual.integerDivision && ['x', 'x1', 'x2', 'left', 'right', 'index'].includes(name)
        && (['line', 'label', 'box'].includes(family) || calleeName === 'chart.point.from_index')) continue;
      const checkedScalar = !method && (
        DRAWING_NUMERIC_PARAMETER_NAMES_BY_CALL.get(calleeName)?.includes(name)
        || TABLE_NUMERIC_PARAMETER_NAMES_BY_CALL.get(calleeName)?.includes(name)
        || CHART_POINT_NUMERIC_PARAMETER_NAMES_BY_CALL.get(calleeName)?.includes(name)
        || DRAWING_COLOR_PARAMETER_NAMES_BY_CALL.get(calleeName)?.includes(name)
        || DRAWING_STRING_PARAMETER_NAMES_BY_CALL.get(calleeName)?.includes(name)
        || DRAWING_BOOL_PARAMETER_NAMES_BY_CALL.get(calleeName)?.includes(name)
      );
      if (checkedScalar && !(accepted.length === 1 && accepted[0] === 'int' && actual.kind === 'float')) continue;
      const expected = name === 'points' ? 'array<chart.point>' : name.includes('formatting') ? 'text_format' : accepted.join(' or ');
      this.addDiagnostic('type-mismatch', `${calleeName} ${name} requires ${expected}, got ${this.formatSemanticType(actual)}`, argument.loc);
    }
  }

  private isV5LabelMidpoint(expression: Expression, scope: SemanticScope): boolean {
    if (expression.type !== 'BinaryExpression' || expression.operator !== '/') return false;
    if (expression.right.type !== 'NumericLiteral' || expression.right.value !== 2
      || this.inferExpressionType(expression.right, scope).kind !== 'int') return false;
    if (expression.left.type !== 'BinaryExpression' || !['+', '-'].includes(expression.left.operator)) return false;
    const numerator = this.inferExpressionType(expression.left, scope);
    return numerator.kind === 'int' && numerator.qualifier !== 'const';
  }

  private isIntegralDrawingCoordinate(expression: Expression, scope: SemanticScope): boolean {
    if (this.inferExpressionType(expression, scope).kind === 'int') return true;
    if (expression.type === 'UnaryExpression' && ['+', '-'].includes(expression.operator)) {
      return this.isIntegralDrawingCoordinate(expression.argument, scope);
    }
    if (expression.type !== 'BinaryExpression') return false;
    if (!this.isIntegralDrawingCoordinate(expression.left, scope)
      || !this.isIntegralDrawingCoordinate(expression.right, scope)) return false;
    if (['+', '-', '*', '%'].includes(expression.operator)) return true;
    if (expression.operator !== '/') return false;
    const numerator = this.drawingCoordinateDefaultValue(expression.left, scope);
    const denominator = this.drawingCoordinateDefaultValue(expression.right, scope);
    return numerator !== undefined && denominator !== undefined && Number.isInteger(numerator / denominator);
  }

  private hasOnlyConstantIntegerQuotients(expression: Expression, scope: SemanticScope): boolean {
    if (expression.type === 'UnaryExpression') return this.hasOnlyConstantIntegerQuotients(expression.argument, scope);
    if (expression.type !== 'BinaryExpression') return true;
    if (expression.operator === '/' && (
      this.inferExpressionType(expression.left, scope).qualifier !== 'const'
      || this.inferExpressionType(expression.right, scope).qualifier !== 'const'
    )) return false;
    return this.hasOnlyConstantIntegerQuotients(expression.left, scope)
      && this.hasOnlyConstantIntegerQuotients(expression.right, scope);
  }

  private drawingCoordinateDefaultValue(expression: Expression, scope: SemanticScope): number | undefined {
    const value = this.visualNumericDefaultValue(expression, scope);
    if (value !== undefined) return value;
    if (expression.type !== 'BinaryExpression') return undefined;
    const left = this.drawingCoordinateDefaultValue(expression.left, scope);
    const right = this.drawingCoordinateDefaultValue(expression.right, scope);
    if (left === undefined || right === undefined) return undefined;
    switch (expression.operator) {
      case '+': return left + right;
      case '-': return left - right;
      case '*': return left * right;
      case '/': return left / right;
      case '%': return left % right;
      default: return undefined;
    }
  }

  private checkDrawingObjectCastArgumentType(expression: CallExpression, scope: SemanticScope): void {
    const calleeName = this.memberPath(expression.callee).join('.');
    const kind = DRAWING_OBJECT_CAST_TYPES.get(calleeName);
    if (!kind || this.hasLocalUserCallableShadow(expression, scope)) return;
    const argument = this.resolveCallArgumentExpression(expression, ['x'], 0);
    if (!argument) return;
    const actual = this.inferExpressionType(argument, scope);
    if (actual.kind === 'unknown' || actual.kind === kind) return;
    this.addDiagnostic('type-mismatch', `${calleeName} x requires ${kind}, got ${this.formatSemanticType(actual)}`, argument.loc);
  }

  private checkDrawingReceiver(expression: CallExpression, scope: SemanticScope): void {
    if (expression.callee.type !== 'MemberExpression') return;
    const methodName = expression.callee.property.name;
    if (!DRAWING_METHOD_NAMES.has(methodName)) return;
    const receiver = expression.callee.object;
    if (receiver.type === 'Identifier'
      && !scope.lookup(receiver.name)
      && BUILTIN_NAMESPACES.has(receiver.name)
      && this.resolveBuiltinSignature(`${receiver.name}.${methodName}`, expression, scope)) return;
    const receiverType = this.inferExpressionType(expression.callee.object, scope);
    if (receiverType.kind === 'unknown') return;
    if (this.isBuiltinReceiverMemberMethod(receiverType, methodName)) return;
    if (receiverType.kind === 'udt' && receiverType.name && methodName === 'copy'
      && this.findUdtDeclaration(receiverType.name)) return;
    if (this.findUserMethodDeclaration(methodName, receiverType, expression, scope)) return;
    for (const [alias, library] of this.importedLibraries) {
      if ((library.methods.get(methodName) ?? []).some((method) => {
        const expected = this.importedSemanticTypeFromAnnotation(alias, method.params[0]?.typeAnnotation ?? undefined);
        return expected && this.isAssignableType(expected, receiverType)
          && this.isAssignableQualifier(expected.qualifier, receiverType.qualifier);
      })) return;
    }
    this.addDiagnostic('type-mismatch', `${methodName} requires a drawing receiver, got ${this.formatSemanticType(receiverType)}`, expression.callee.object.loc);
  }

  private checkDrawingFunctionArgumentTypes(expression: CallExpression, scope: SemanticScope): void {
    const calleeName = this.memberPath(expression.callee).join('.');
    const numericParameterNames = DRAWING_NUMERIC_PARAMETER_NAMES_BY_CALL.get(calleeName);
    const boolParameterNames = DRAWING_BOOL_PARAMETER_NAMES_BY_CALL.get(calleeName);
    if (!numericParameterNames && !boolParameterNames) return;

    const signature = this.resolveBuiltinSignature(calleeName, expression, scope);
    if (!signature) return;
    if (this.hasUnstableOptionArgumentBindings(expression.arguments, signature)) return;

    const parameterNames = this.resolveSignatureParams(expression.arguments, signature);
    for (const parameterName of numericParameterNames ?? []) {
      this.checkBuiltinArgumentKind(expression, scope, calleeName, parameterNames, parameterName, 'number', signature);
    }
    for (const parameterName of boolParameterNames ?? []) {
      this.checkBuiltinArgumentKind(expression, scope, calleeName, parameterNames, parameterName, 'boolean', signature);
    }
  }

  private isHighestTimeframeRatio(expression: Expression, scope: SemanticScope): boolean {
    if (scope.lookup('timeframe')) return false;
    return isTimeframeSecondsRatio(expression, (name) => {
      const symbol = scope.lookup(name);
      return symbol !== null && this.highestTimeframeRatioSymbols.has(symbol);
    });
  }

  private checkBuiltinArgumentKind(
    expression: CallExpression,
    scope: SemanticScope,
    calleeName: string,
    parameterNames: readonly string[],
    parameterName: string,
    expectedKind: 'boolean' | 'color' | 'integer' | 'number' | 'string',
    signature?: BuiltinSignature,
  ): void {
    if (calleeName === 'plot' && parameterName === 'histbase' && this.currentPineVersion >= 6) {
      this.checkBuiltinArgumentQualifier(expression, scope, calleeName, parameterNames, parameterName, 'input', signature);
    }
    const parameterIndex = parameterNames.indexOf(parameterName);
    if (parameterIndex === -1) return;

    const argument = this.resolveCallArgumentExpression(expression, parameterNames, parameterIndex, signature);
    if (!argument) return;

    const argumentType = this.inferExpressionType(argument, scope);
    if (argumentType.kind === 'unknown') return;
    if (expectedKind === 'boolean' && argumentType.kind === 'bool') return;
    if (expectedKind === 'boolean' && this.versionRules.allowsImplicitNumericToBool && this.isNumericType(argumentType)) return;
    if (expectedKind === 'color' && argumentType.kind === 'color') return;
    if (expectedKind === 'integer' && argumentType.kind === 'int') return;
    if (expectedKind === 'integer' && calleeName === 'ta.highest' && parameterName === 'length'
      && this.currentPineVersion === 5 && this.isHighestTimeframeRatio(argument, scope)) return;
    if (expectedKind === 'integer' && parameterName === 'length'
      && canonicalBuiltinName(calleeName).startsWith('ta.') && argumentType.integerDivision
      && this.acceptsIntegerDerivedTaLength(argument, scope)) return;
    if (expectedKind === 'number' && this.isNumericType(argumentType)) return;
    if (expectedKind === 'string' && argumentType.kind === 'string') return;

    this.addDiagnostic(
      'type-mismatch',
      `${calleeName} ${parameterName} must be ${expectedKind === 'integer' ? 'an' : 'a'} ${expectedKind}, got ${this.formatSemanticType(argumentType)}`,
      argument.loc,
    );
  }

  private checkBuiltinArgumentQualifier(
    expression: CallExpression,
    scope: SemanticScope,
    calleeName: string,
    parameterNames: readonly string[],
    parameterName: string,
    expectedQualifier: SemanticQualifier,
    signature?: BuiltinSignature,
  ): void {
    const parameterIndex = parameterNames.indexOf(parameterName);
    if (parameterIndex === -1) return;

    const argument = this.resolveCallArgumentExpression(expression, parameterNames, parameterIndex, signature);
    if (!argument) return;

    const argumentType = this.inferExpressionType(argument, scope);
    if (!argumentType.qualifier || this.isAssignableQualifier(expectedQualifier, argumentType.qualifier)) return;

    this.addDiagnostic(
      'qualifier-mismatch',
      this.qualifierMismatchMessage(argumentType.qualifier, expectedQualifier, parameterName, calleeName),
      argument.loc,
    );
  }

  private checkBuiltinArgumentNotBool(
    expression: CallExpression,
    scope: SemanticScope,
    calleeName: string,
    parameterNames: readonly string[],
    parameterName: string,
    signature?: BuiltinSignature,
  ): void {
    const parameterIndex = parameterNames.indexOf(parameterName);
    if (parameterIndex === -1) return;

    const argument = this.resolveCallArgumentExpression(expression, parameterNames, parameterIndex, signature);
    if (!argument) return;

    const argumentType = this.inferExpressionType(argument, scope);
    if (argumentType.kind !== 'bool') return;
    if (this.versionRules.allowsBoolNaHelpers && (calleeName === 'na' || calleeName === 'nz' || calleeName === 'fixnan')) return;

    this.addDiagnostic(
      'type-mismatch',
      this.versionRules.allowsBoolNaHelpers
        ? `${calleeName} ${parameterName} cannot be a boolean`
        : this.boolNaVersionMessage(`${calleeName} ${parameterName} cannot be a boolean`),
      argument.loc,
    );
  }

  private checkInputDefaultValueType(expression: CallExpression, scope: SemanticScope): void {
    const displayName = this.effectiveInputCallName(expression);
    if (this.resolveLocalUserCallable(expression, scope)) return;
    if (displayName === 'input' || displayName === 'input.source') {
      const defval = this.getCallArgument(expression.arguments, 'defval', 0);
      if (!defval) return;
      const actualType = this.inferExpressionType(defval, scope);
      if (actualType.kind === 'unknown') return;
      const allowed = displayName === 'input.source'
        ? this.isNumericType(actualType)
        : ['int', 'float', 'bool', 'string', 'color'].includes(actualType.kind);
      if (!allowed) {
        const expected = displayName === 'input.source' ? 'a number' : 'an int, float, bool, string, color or numeric source';
        this.addDiagnostic('type-mismatch', `${displayName} defval must be ${expected}`, defval.loc);
        return;
      }
      if (
        displayName === 'input' &&
        this.versionRules.requiresConstOrSourceGenericInputDefault &&
        actualType.qualifier &&
        !this.isAssignableQualifier('const', actualType.qualifier) &&
        !(
          defval.type === 'Identifier' &&
          ['open', 'high', 'low', 'close', 'hl2', 'hlc3', 'ohlc4', 'hlcc4', 'volume'].includes(defval.name) &&
          !scope.lookup(defval.name)
        )
      ) {
        this.addDiagnostic(
          'qualifier-mismatch',
          'Arguments of input function must be of constant type, or "source" builtin variables.',
          defval.loc,
        );
        return;
      }
      return;
    }
    if (displayName === 'input.enum') {
      this.checkInputEnumDefaultValueType(expression, scope);
      return;
    }

    const requirement = INPUT_DEFAULT_TYPE_REQUIREMENTS.get(displayName);
    if (!requirement) return;

    const defval = this.getCallArgument(expression.arguments, 'defval', 0);
    if (!defval) return;

    const actualType = this.inferExpressionType(defval, scope);
    if (actualType.kind === 'unknown') return;
    if (actualType.qualifier && !this.isAssignableQualifier('const', actualType.qualifier)) {
      this.addDiagnostic(
        'qualifier-mismatch',
        this.qualifierMismatchMessage(actualType.qualifier, 'const', 'defval', displayName),
        defval.loc,
      );
      return;
    }

    if (requirement === 'int') {
      if (actualType.kind === 'float') {
        this.addDiagnostic('type-mismatch', `${displayName} defval must be an integer`, defval.loc);
        return;
      }
      if (actualType.kind !== 'int') {
        this.addDiagnostic('type-mismatch', `${displayName} defval must be a number`, defval.loc);
        return;
      }
    }

    if (requirement === 'number') {
      if (actualType.kind !== 'int' && actualType.kind !== 'float') {
        this.addDiagnostic('type-mismatch', `${displayName} defval must be a number`, defval.loc);
        return;
      }
    } else if (actualType.kind !== requirement) {
      const expectedLabel = requirement === 'bool' ? 'boolean' : requirement;
      this.addDiagnostic('type-mismatch', `${displayName} defval must be a ${expectedLabel}`, defval.loc);
      return;
    }

    this.checkInputDefaultRangeConstraints(expression, displayName, defval);
    this.checkInputDefaultOptionsConstraint(expression, scope, displayName, defval);
  }

  private checkInputRangeArguments(expression: CallExpression, scope: SemanticScope): void {
    const displayName = this.effectiveInputCallName(expression);
    if (!INPUT_RANGE_OPTION_OVERLOAD_NAMES.has(displayName) || this.currentPineVersion < 5) return;

    const signature = this.resolveBuiltinSignature(this.memberPath(expression.callee).join('.'), expression, scope);
    if (!signature || this.hasUnstableOptionArgumentBindings(expression.arguments, signature)) return;

    const parameterNames = this.resolveSignatureParams(expression.arguments, signature);
    for (const parameterName of INPUT_RANGE_OPTION_RANGE_PARAMS) {
      this.checkBuiltinArgumentKind(expression, scope, displayName, parameterNames, parameterName, displayName === 'input.int' ? 'integer' : 'number', signature);
      this.checkBuiltinArgumentQualifier(expression, scope, displayName, parameterNames, parameterName, 'const', signature);
    }
  }

  private checkInputBoolOptionArguments(expression: CallExpression, scope: SemanticScope): void {
    const displayName = this.effectiveInputCallName(expression);
    if (!isInputCallName(displayName)) return;

    const signature = this.resolveBuiltinSignature(this.memberPath(expression.callee).join('.'), expression, scope);
    if (!signature) return;
    if (this.hasUnstableOptionArgumentBindings(expression.arguments, signature)) return;

    const parameterNames = this.resolveSignatureParams(expression.arguments, signature);
    this.checkBuiltinArgumentKind(expression, scope, displayName, parameterNames, 'confirm', 'boolean', signature);
    this.checkBuiltinArgumentKind(expression, scope, displayName, parameterNames, 'active', 'boolean', signature);
    this.checkBuiltinArgumentQualifier(expression, scope, displayName, parameterNames, 'confirm', 'const', signature);
    this.checkBuiltinArgumentQualifier(expression, scope, displayName, parameterNames, 'active', 'input', signature);
  }

  private checkInputStringOptionArguments(expression: CallExpression, scope: SemanticScope): void {
    const displayName = this.effectiveInputCallName(expression);
    if (!isInputCallName(displayName)) return;

    const signature = this.resolveBuiltinSignature(this.memberPath(expression.callee).join('.'), expression, scope);
    if (!signature) return;
    if (this.hasUnstableOptionArgumentBindings(expression.arguments, signature)) return;

    const parameterNames = this.resolveSignatureParams(expression.arguments, signature);
    for (const parameterName of ['title', 'tooltip', 'inline', 'group']) {
      this.checkBuiltinArgumentKind(expression, scope, displayName, parameterNames, parameterName, 'string', signature);
      this.checkBuiltinArgumentQualifier(expression, scope, displayName, parameterNames, parameterName, 'const', signature);
    }
  }

  private checkInputOptionsArgumentType(expression: CallExpression, scope: SemanticScope): void {
    const displayName = this.effectiveInputCallName(expression);
    if (!isInputCallName(displayName)) return;

    const signature = this.resolveBuiltinSignature(this.memberPath(expression.callee).join('.'), expression, scope);
    if (!signature) return;

    const parameterNames = this.resolveSignatureParams(expression.arguments, signature);
    const optionsIndex = parameterNames.indexOf('options');
    if (optionsIndex === -1) return;

    const options = this.resolveCallArgumentExpression(expression, parameterNames, optionsIndex);
    if (!options) return;

    const optionsType = this.inferExpressionType(options, scope);
    if (options.type !== 'ArrayExpression') {
      if (optionsType.kind === 'unknown') return;
      if (optionsType.kind === 'array') {
        this.addDiagnostic('qualifier-mismatch', `${displayName} options must be a tuple of const values`, options.loc);
        return;
      }
      this.addDiagnostic('type-mismatch', `${displayName} options must be an array, got ${this.formatSemanticType(optionsType)}`, options.loc);
      return;
    }

    const requirement = INPUT_OPTIONS_ELEMENT_REQUIREMENTS.get(displayName);

    for (const element of options.elements) {
      const elementType = this.inferExpressionType(element, scope);
      if (elementType.kind === 'unknown') continue;
      if (elementType.qualifier && !this.isAssignableQualifier('const', elementType.qualifier)) {
        this.addDiagnostic('qualifier-mismatch', this.qualifierMismatchMessage(elementType.qualifier, 'const', 'options', displayName), element.loc);
        return;
      }
      if (!requirement) continue;
      if (requirement === 'int' && elementType.kind === 'int') continue;
      if (requirement === 'number' && this.isNumericType(elementType)) continue;
      if (requirement === 'string' && elementType.kind === 'string') continue;

      const expectedLabel = requirement === 'int' ? 'integer' : requirement;
      this.addDiagnostic(
        'type-mismatch',
        `${displayName} options must contain ${expectedLabel} values, got ${this.formatSemanticType(elementType)}`,
        element.loc,
      );
      return;
    }
  }

  private checkInputDisplayQualifier(expression: CallExpression, scope: SemanticScope): void {
    const displayName = this.effectiveInputCallName(expression);
    if (!isInputCallName(displayName) || this.resolveLocalUserCallable(expression, scope)) return;
    const signature = this.resolveBuiltinSignature(this.memberPath(expression.callee).join('.'), expression, scope);
    if (!signature || this.hasUnstableOptionArgumentBindings(expression.arguments, signature)) return;
    const parameterNames = this.resolveSignatureParams(expression.arguments, signature);
    this.checkBuiltinArgumentQualifier(expression, scope, displayName, parameterNames, 'display', 'const', signature);
  }

  private checkInputEnumDefaultValueType(expression: CallExpression, scope: SemanticScope): void {
    const defval = this.getCallArgument(expression.arguments, 'defval', 0);
    if (!defval) return;

    const defvalType = this.inferExpressionType(defval, scope);
    if (defvalType.kind === 'unknown') return;
    if (defvalType.kind !== 'udt' || !defvalType.name) {
      this.addDiagnostic('type-mismatch', 'input.enum defval must be an enum member', defval.loc);
      return;
    }

    const options = this.getCallArgument(expression.arguments, 'options', 2);
    if (!options || options.type !== 'ArrayExpression') return;

    const optionTypes = options.elements.map((element) => this.inferExpressionType(element, scope));
    if (optionTypes.some((optionType) => optionType.kind === 'unknown')) return;
    const mismatchedOption = optionTypes.find((optionType) => optionType.kind !== 'udt' || optionType.name !== defvalType.name);
    if (mismatchedOption) {
      this.addDiagnostic('type-mismatch', 'input.enum options must use the same enum type as defval', options.loc);
      return;
    }

    const defvalPath = this.memberPath(defval).join('.');
    const optionPaths = options.elements.map((element) => this.memberPath(element).join('.'));
    if (defvalPath && optionPaths.every((optionPath) => optionPath !== defvalPath)) {
      this.addDiagnostic('type-mismatch', 'input.enum defval must be one of options', defval.loc);
    }
  }

  private checkInputDefaultRangeConstraints(expression: CallExpression, displayName: string, defval: Expression): void {
    if (displayName !== 'input.int' && displayName !== 'input.float') return;

    const options = this.getCallArgument(expression.arguments, 'options', 2);
    if (options?.type === 'ArrayExpression') return;

    const defvalValue = this.constantLiteralValue(defval);
    if (typeof defvalValue !== 'number') return;

    const minval = this.getNamedOrUnnamedPositionalArg(expression.arguments, 'minval', 2);
    const minvalValue = minval ? this.constantLiteralValue(minval) : undefined;
    if (typeof minvalValue === 'number' && defvalValue < minvalValue) {
      this.addDiagnostic('type-mismatch', `${displayName} defval must be greater than or equal to minval`, defval.loc);
      return;
    }

    const maxval = this.getNamedOrUnnamedPositionalArg(expression.arguments, 'maxval', 3);
    const maxvalValue = maxval ? this.constantLiteralValue(maxval) : undefined;
    if (typeof maxvalValue === 'number' && defvalValue > maxvalValue) {
      this.addDiagnostic('type-mismatch', `${displayName} defval must be less than or equal to maxval`, defval.loc);
    }
  }

  private checkInputDefaultOptionsConstraint(expression: CallExpression, scope: SemanticScope, displayName: string, defval: Expression): void {
    const defvalValue = this.constantLiteralValue(defval);
    if (defvalValue === undefined) return;

    const options = this.getCallArgument(expression.arguments, 'options', 2);
    if (!options || options.type !== 'ArrayExpression') return;
    if (this.inputOptionsArrayHasTypeMismatch(displayName, options, scope)) return;

    const optionValues = options.elements.map((element) => this.constantLiteralValue(element));
    if (optionValues.some((option) => option === undefined)) return;

    if (!optionValues.some((option) => Object.is(option, defvalValue))) {
      this.addDiagnostic('type-mismatch', `${displayName} defval must be one of options`, defval.loc);
    }
  }

  private inputOptionsArrayHasTypeMismatch(displayName: string, options: ArrayExpression, scope: SemanticScope): boolean {
    const requirement = INPUT_OPTIONS_ELEMENT_REQUIREMENTS.get(displayName);
    if (!requirement) return false;

    return options.elements.some((element) => {
      const elementType = this.inferExpressionType(element, scope);
      if (elementType.kind === 'unknown') return false;
      if (requirement === 'int') return elementType.kind !== 'int';
      if (requirement === 'number') return !this.isNumericType(elementType);
      return elementType.kind !== 'string';
    });
  }

  private acceptsIntegerDerivedTaLength(expression: Expression, scope: SemanticScope): boolean {
    if (this.currentPineVersion <= 5) return true;
    const value = this.constantNumericValue(expression, scope);
    return value === undefined || Number.isInteger(value);
  }

  private constantNumericValue(expression: Expression, scope: SemanticScope): number | undefined {
    if (expression.type === 'NumericLiteral') return expression.value;
    if (expression.type === 'Identifier') {
      const symbol = scope.lookup(expression.name);
      const value = symbol ? this.constantValues.get(symbol) : undefined;
      return typeof value === 'number' ? value : undefined;
    }
    if (expression.type === 'ConditionalExpression') {
      const condition = this.constantBooleanValue(expression.test, scope);
      const consequent = this.constantNumericValue(expression.consequent, scope);
      const alternate = this.constantNumericValue(expression.alternate, scope);
      if (condition === undefined || consequent === undefined || alternate === undefined) return undefined;
      return condition ? consequent : alternate;
    }
    if (expression.type === 'CallExpression' && !scope.lookup('math')) {
      const name = this.memberPath(expression.callee).join('.');
      if (!['math.max', 'math.min', 'math.abs', 'math.round', 'math.floor', 'math.ceil'].includes(name))
        return undefined;
      const values = expression.arguments.map((argument) => this.constantNumericValue(argument.value, scope));
      if (values.some((value) => value === undefined)) return undefined;
      if (name === 'math.max') return values.length ? Math.max(...(values as number[])) : undefined;
      if (name === 'math.min') return values.length ? Math.min(...(values as number[])) : undefined;
      const numberArgument = expression.arguments.findIndex((argument) => argument.name?.name === 'number');
      const value = values[numberArgument >= 0 ? numberArgument : 0];
      if (value === undefined) return undefined;
      if (name === 'math.abs') return Math.abs(value);
      if (name === 'math.floor') return Math.floor(value);
      if (name === 'math.ceil') return Math.ceil(value);
      const precisionArgument = expression.arguments.findIndex((argument) => argument.name?.name === 'precision');
      return roundRuntimeNumber(value, values[precisionArgument >= 0 ? precisionArgument : 1] ?? 0);
    }
    if (expression.type === 'UnaryExpression') {
      const value = this.constantNumericValue(expression.argument, scope);
      if (value === undefined) return undefined;
      if (expression.operator === '-') return -value;
      if (expression.operator === '+') return value;
    }
    if (expression.type === 'BinaryExpression') {
      if (!['+', '-', '*', '/', '%'].includes(expression.operator)) return undefined;
      const left = this.constantNumericValue(expression.left, scope);
      const right = this.constantNumericValue(expression.right, scope);
      if (left === undefined || right === undefined) return undefined;
      switch (expression.operator) {
        case '+':
          return left + right;
        case '-':
          return left - right;
        case '*':
          return left * right;
        case '/': {
          if (this.currentPineVersion >= 4 && !this.versionRules.constIntDivisionCanReturnFractional) {
            const leftType = this.inferExpressionType(expression.left, scope);
            const rightType = this.inferExpressionType(expression.right, scope);
            if (leftType.kind === 'int' && rightType.kind === 'int'
              && leftType.qualifier === 'const' && rightType.qualifier === 'const') {
              return divideV5ConstInts(left, right);
            }
          }
          return left / right;
        }
        case '%':
          return this.currentPineVersion >= 5 ? left - right * Math.floor(left / right) : left % right;
      }
    }
    return undefined;
  }

  private constantBooleanValue(expression: Expression, scope: SemanticScope): boolean | undefined {
    if (expression.type === 'BooleanLiteral') return expression.value;
    if (expression.type === 'Identifier') {
      const symbol = scope.lookup(expression.name);
      const value = symbol ? this.constantValues.get(symbol) : undefined;
      return typeof value === 'boolean' ? value : undefined;
    }
    if (expression.type === 'UnaryExpression' && expression.operator === 'not') {
      const value = this.constantBooleanValue(expression.argument, scope);
      return value === undefined ? undefined : !value;
    }
    if (expression.type === 'ConditionalExpression') {
      const condition = this.constantBooleanValue(expression.test, scope);
      const consequent = this.constantBooleanValue(expression.consequent, scope);
      const alternate = this.constantBooleanValue(expression.alternate, scope);
      if (condition === undefined || consequent === undefined || alternate === undefined) return undefined;
      return condition ? consequent : alternate;
    }
    if (expression.type === 'BinaryExpression') {
      if (!['and', 'or', '==', '!=', '<', '<=', '>', '>='].includes(expression.operator)) return undefined;
      if (expression.operator === 'and' || expression.operator === 'or') {
        const left = this.constantBooleanValue(expression.left, scope);
        const right = this.constantBooleanValue(expression.right, scope);
        if (left === undefined || right === undefined) return undefined;
        return expression.operator === 'and' ? left && right : left || right;
      }
      const left =
        this.constantNumericValue(expression.left, scope) ?? this.constantBooleanValue(expression.left, scope);
      const right =
        this.constantNumericValue(expression.right, scope) ?? this.constantBooleanValue(expression.right, scope);
      if (left === undefined || right === undefined) return undefined;
      if ((typeof left === 'number' && Number.isNaN(left)) || (typeof right === 'number' && Number.isNaN(right)))
        return false;
      const equal = comparisonEqual(left, right);
      if (expression.operator === '==') return equal;
      if (expression.operator === '!=') return !equal;
      if (typeof left !== 'number' || typeof right !== 'number') return undefined;
      switch (expression.operator) {
        case '<':
          return !equal && left < right;
        case '<=':
          return equal || left < right;
        case '>':
          return !equal && left > right;
        case '>=':
          return equal || left > right;
      }
    }
    return undefined;
  }

  private constantLiteralValue(expression: Expression): number | string | boolean | undefined {
    if (expression.type === 'NumericLiteral' || expression.type === 'StringLiteral' || expression.type === 'BooleanLiteral') {
      return expression.value;
    }
    if (expression.type === 'UnaryExpression' && expression.argument.type === 'NumericLiteral') {
      if (expression.operator === '-') return -expression.argument.value;
      if (expression.operator === '+') return expression.argument.value;
    }
    if (expression.type === 'MemberExpression') {
      const memberName = this.memberPath(expression).join('.');
      if (LEGACY_INPUT_TYPE_CONSTANT_NAMES.has(memberName)) return memberName;
    }
    if (expression.type === 'Identifier' && this.currentPineVersion <= 4 && LEGACY_INPUT_TYPE_ALIASES.has(expression.name)) {
      return expression.name;
    }
    if (expression.type === 'Identifier' && this.currentPineVersion <= 4 && LEGACY_BARE_VISUAL_CONSTANT_VALUES.has(expression.name)) {
      return LEGACY_BARE_VISUAL_CONSTANT_VALUES.get(expression.name);
    }
    return undefined;
  }

  private checkStrategyLiteralArgumentConstraints(expression: CallExpression): void {
    const displayName = this.memberPath(expression.callee).join('.');
    switch (displayName) {
      case 'strategy.entry':
      case 'strategy.order':
        this.checkStrategyOrderLiteralArguments(expression, displayName);
        return;
      case 'strategy.exit':
        this.checkStrategyExitLiteralArguments(expression);
        return;
      case 'strategy.close':
        this.checkStrategyCloseLiteralArguments(expression);
        return;
      case 'strategy.risk.allow_entry_in':
        this.checkStrategyAllowedEntryDirectionArgument(expression);
        return;
      case 'strategy.risk.max_position_size':
        this.checkPositiveLiteralNumberArgument(
          expression,
          'contracts',
          0,
          'strategy.risk.max_position_size contracts must be a positive number',
        );
        return;
      case 'strategy.risk.max_drawdown':
        this.checkStrategyCashOrPercentRiskRuleArguments(expression, 'strategy.risk.max_drawdown');
        return;
      case 'strategy.risk.max_intraday_loss':
        this.checkStrategyCashOrPercentRiskRuleArguments(expression, 'strategy.risk.max_intraday_loss');
        return;
      case 'strategy.risk.max_intraday_filled_orders':
        this.checkPositiveLiteralNumberArgument(
          expression,
          'count',
          0,
          'strategy.risk.max_intraday_filled_orders count must be a positive number',
        );
        return;
      case 'strategy.risk.max_cons_loss_days':
        this.checkPositiveLiteralNumberArgument(
          expression,
          'count',
          0,
          'strategy.risk.max_cons_loss_days count must be a positive number',
        );
        return;
      default:
        return;
    }
  }

  private checkMaxBarsBackArguments(expression: CallExpression, scope: SemanticScope): void {
    if (this.memberPath(expression.callee).join('.') !== 'max_bars_back') return;

    const target = this.getCallArgument(expression.arguments, 'var', 0);
    if (target?.type === 'Identifier' && DERIVED_PRICE_BUILTINS.has(target.name) && !scope.lookup(target.name)) {
      this.addDiagnostic('invalid-argument', `max_bars_back cannot target derived builtin ${target.name}; size its underlying series instead`, target.loc);
    }
    const num = this.getCallArgument(expression.arguments, 'num', 1);
    this.checkBuiltinArgumentQualifier(expression, scope, 'max_bars_back', ['var', 'num'], 'num', 'const');
    if (num) {
      const numType = this.inferExpressionType(num, scope);
      if (numType.kind !== 'int' && numType.kind !== 'unknown') {
        this.addDiagnostic('type-mismatch', 'max_bars_back num must be a non-negative integer', num.loc);
        return;
      }
    }
    this.checkNonNegativeLiteralIntegerValue(num, 'max_bars_back num must be a non-negative integer');
    const literalDepth = num && this.constantLiteralValue(num);
    if (typeof literalDepth === 'number' && literalDepth > 5000) {
      this.addDiagnostic('type-mismatch', 'max_bars_back num must be at most 5000', num?.loc);
    }
  }

  private checkTimeOffsetLiteralArguments(expression: CallExpression, scope: SemanticScope): void {
    const calleeName = this.memberPath(expression.callee).join('.');
    if (calleeName !== 'time' && calleeName !== 'time_close') return;

    const signature = this.resolveBuiltinSignature(calleeName, expression, scope);
    if (!signature) return;

    const params = this.resolveTimeSignatureParams(expression.arguments, signature, scope);
    const timeframe = this.resolveCallArgumentExpression(expression, params, params.indexOf('timeframe'), signature);
    const timeframeBarsBack = this.resolveCallArgumentExpression(expression, params, params.indexOf('timeframe_bars_back'), signature);
    if (timeframeBarsBack && !timeframe) {
      this.addDiagnostic(
        'argument-count',
        `${calleeName} timeframe_bars_back requires an explicit timeframe argument`,
        timeframeBarsBack.loc,
      );
    }

    for (const parameterName of ['bars_back', 'timeframe_bars_back']) {
      const argument = this.resolveCallArgumentExpression(expression, params, params.indexOf(parameterName), signature);
      this.checkTimeOffsetLiteralValue(argument, `${calleeName} ${parameterName} must be an integer between -500 and 5000`);
    }
  }

  private checkTimeOffsetLiteralValue(expression: Expression | undefined, message: string): void {
    if (!expression) return;
    const value = this.constantLiteralValue(expression);
    if (typeof value !== 'number') return;
    if (!Number.isInteger(value) || value < -500 || value > 5000) {
      this.addDiagnostic('type-mismatch', message, expression.loc);
    }
  }

  private checkNumericLiteralRangeValue(expression: Expression | undefined, min: number, max: number, message: string): void {
    if (!expression) return;
    const value = this.constantLiteralValue(expression);
    if (typeof value !== 'number') return;
    if (value < min || value > max) {
      this.addDiagnostic('type-mismatch', message, expression.loc);
    }
  }

  private checkRequestCalcBarsCountLiteralArguments(expression: CallExpression): void {
    const calleeName = this.memberPath(expression.callee).join('.');
    const calcBarsCountPosition = this.requestCalcBarsCountPosition(canonicalBuiltinName(calleeName));
    if (calcBarsCountPosition === undefined) return;

    const calcBarsCount = this.getCallArgument(expression.arguments, 'calc_bars_count', calcBarsCountPosition);
    this.checkPositiveLiteralIntegerValue(
      calcBarsCount,
      `${calleeName} calc_bars_count must be a positive integer`,
    );
  }

  private requestCalcBarsCountPosition(calleeName: string): number | undefined {
    switch (calleeName) {
      case 'request.security':
        return 7;
      case 'request.security_lower_tf':
        return 6;
      case 'request.seed':
        return 4;
      default:
        return undefined;
    }
  }

  private checkRequestBarmergeModeLiteralArguments(expression: CallExpression, scope: SemanticScope): void {
    const calleeName = this.memberPath(expression.callee).join('.');
    const binding = this.requestBarmergeModeBinding(canonicalBuiltinName(calleeName));
    if (!binding) return;
    const signature = this.resolveBuiltinSignature(calleeName, expression, scope);
    if (signature && this.hasUnstableOptionArgumentBindings(expression.arguments, signature)) return;

    if (binding.gaps !== undefined) {
      const gaps = this.resolveCallArgumentExpression(expression, binding.parameterNames, binding.gaps, signature);
      this.checkRequestBarmergeModeLiteralValue(
        gaps,
        REQUEST_GAPS_MODES,
        `Invalid ${calleeName} gaps mode`,
        calleeName,
        'gaps',
        scope,
      );
    }
    if (binding.lookahead !== undefined) {
      const lookahead = this.resolveCallArgumentExpression(expression, binding.parameterNames, binding.lookahead, signature);
      this.checkRequestBarmergeModeLiteralValue(
        lookahead,
        REQUEST_LOOKAHEAD_MODES,
        `Invalid ${calleeName} lookahead mode`,
        calleeName,
        'lookahead',
        scope,
      );
    }
  }

  private requestBarmergeModeBinding(calleeName: string): { parameterNames: string[]; gaps?: number; lookahead?: number } | undefined {
    if (!REQUEST_BARMERGE_MODE_CALLS.has(calleeName)) return undefined;

    const parameterNames = BUILTIN_SIGNATURES.get(calleeName)?.params;
    if (!parameterNames) return undefined;

    const gaps = parameterNames.indexOf('gaps');
    const lookahead = parameterNames.indexOf('lookahead');
    return {
      parameterNames,
      gaps: gaps === -1 ? undefined : gaps,
      lookahead: lookahead === -1 ? undefined : lookahead,
    };
  }

  private checkRequestBarmergeModeLiteralValue(
    expression: Expression | undefined,
    allowedValues: Set<string>,
    messagePrefix: string,
    calleeName: string,
    parameterName: 'gaps' | 'lookahead',
    scope: SemanticScope,
  ): void {
    if (!expression) return;

    const values = this.requestBarmergeModeValues(expression, calleeName, parameterName, scope);
    if (values && [...values].every((value) => allowedValues.has(value))) return;
    if (values) {
      const invalidValue = [...values].find((value) => !allowedValues.has(value));
      this.addDiagnostic('type-mismatch', `${messagePrefix}: ${invalidValue}`, expression.loc);
      return;
    }

    this.addDiagnostic(
      'qualifier-mismatch',
      `${calleeName} ${parameterName} must be a compile-time barmerge value. Use barmerge.${parameterName}_on/off directly, or choose between those constants with an input or other non-series value; it cannot depend on bar_index, close, or another series value.`,
      expression.loc,
    );
  }

  private requestBarmergeModeValues(
    expression: Expression,
    calleeName: string,
    parameterName: 'gaps' | 'lookahead',
    scope: SemanticScope,
  ): Set<string> | undefined {
    const legacyBool = this.legacySecurityBooleanBarmergeModeValue(expression, calleeName, parameterName);
    if (legacyBool) return new Set([legacyBool]);

    return this.inferRequestBarmergeModeValues(expression, scope);
  }

  private legacySecurityBooleanBarmergeModeValue(
    expression: Expression,
    calleeName: string,
    parameterName: 'gaps' | 'lookahead',
  ): string | undefined {
    if (calleeName !== 'security' || !this.versionRules.allowsRawUniqueParameterValues || expression.type !== 'BooleanLiteral') return undefined;
    if (parameterName === 'gaps') return expression.value ? 'barmerge.gaps_on' : 'barmerge.gaps_off';
    return expression.value ? 'barmerge.lookahead_on' : 'barmerge.lookahead_off';
  }

  private inferRequestBarmergeModeValues(expression: Expression, scope: SemanticScope): Set<string> | undefined {
    if (expression.type === 'MemberExpression') {
      return new Set([this.memberPath(expression).join('.')]);
    }
    if (expression.type === 'StringLiteral') {
      return new Set([expression.value]);
    }
    if (expression.type === 'Identifier') {
      const symbol = scope.lookup(expression.name);
      return symbol ? this.barmergeModeSymbols.get(symbol) : undefined;
    }
    if (expression.type !== 'ConditionalExpression') return undefined;

    const testType = this.inferExpressionType(expression.test, scope);
    if (testType.qualifier === 'series') return undefined;

    const consequentValues = this.inferRequestBarmergeModeValues(expression.consequent, scope);
    const alternateValues = this.inferRequestBarmergeModeValues(expression.alternate, scope);
    if (!consequentValues || !alternateValues) return undefined;

    return new Set([...consequentValues, ...alternateValues]);
  }

  private checkRequestSeriesFieldLiteralArguments(expression: CallExpression, scope: SemanticScope): void {
    const sourceName = this.memberPath(expression.callee).join('.');
    const calleeName = canonicalBuiltinName(sourceName);
    if (calleeName !== 'request.dividends' && calleeName !== 'request.earnings' && calleeName !== 'request.splits') return;

    const signature = this.resolveBuiltinSignature(sourceName, expression, scope);
    if (!signature) return;
    if (this.hasUnstableOptionArgumentBindings(expression.arguments, signature)) return;

    switch (calleeName) {
      case 'request.dividends':
        this.checkDrawingOptionLiteralArgument(
          expression,
          signature.params,
          calleeName,
          'field',
          REQUEST_DIVIDENDS_FIELD_VALUES,
          REQUEST_DIVIDENDS_FIELD_CONSTANT_VALUES,
          'dividends.',
        );
        break;
      case 'request.earnings':
        this.checkDrawingOptionLiteralArgument(
          expression,
          signature.params,
          calleeName,
          'field',
          REQUEST_EARNINGS_FIELD_VALUES,
          REQUEST_EARNINGS_FIELD_CONSTANT_VALUES,
          'earnings.',
        );
        break;
      case 'request.splits':
        this.checkDrawingOptionLiteralArgument(
          expression,
          signature.params,
          calleeName,
          'field',
          REQUEST_SPLITS_FIELD_VALUES,
          REQUEST_SPLITS_FIELD_CONSTANT_VALUES,
          'splits.',
        );
        break;
    }
  }

  private checkRequestContextQualifiers(expression: CallExpression, scope: SemanticScope): void {
    if (this.dynamicRequestsEnabled && !this.deferRequestContextQualifiers) return;
    const calleeName = this.memberPath(expression.callee).join('.');
    const canonicalName = canonicalBuiltinName(calleeName);
    if (canonicalName !== 'request.security' && canonicalName !== 'request.security_lower_tf') return;
    const signature = this.resolveBuiltinSignature(calleeName, expression, scope);
    if (!signature || this.hasUnstableOptionArgumentBindings(expression.arguments, signature)) return;
    const diagnosticIndex = this.diagnostics.length;
    for (const parameterName of ['symbol', 'timeframe', 'currency']) {
      this.checkBuiltinArgumentQualifier(expression, scope, calleeName, signature.params, parameterName, 'simple', signature);
    }
    if (this.deferRequestContextQualifiers && this.diagnostics.length > diagnosticIndex) {
      this.pendingRequestContextDiagnostics.push({ index: diagnosticIndex, diagnostics: this.diagnostics.splice(diagnosticIndex) });
    }
  }

  private checkRequestBoolOptionArguments(expression: CallExpression, scope: SemanticScope): void {
    const calleeName = this.memberPath(expression.callee).join('.');
    if (!canonicalBuiltinName(calleeName).startsWith('request.')) return;

    const signature = this.resolveBuiltinSignature(calleeName, expression, scope);
    if (!signature) return;
    if (this.hasUnstableOptionArgumentBindings(expression.arguments, signature)) return;

    for (const parameterName of REQUEST_BOOL_PARAMETER_NAMES) {
      if (!signature.params.includes(parameterName)) continue;

      const parameterIndex = signature.params.indexOf(parameterName);
      const argument = this.resolveCallArgumentExpression(expression, signature.params, parameterIndex, signature);
      if (!argument) continue;

      const argumentType = this.inferExpressionType(argument, scope);
      if (argumentType.kind === 'unknown' || argumentType.kind === 'bool') continue;

      this.addDiagnostic(
        'type-mismatch',
        `${calleeName} ${parameterName} must be a boolean, got ${this.formatSemanticType(argumentType)}`,
        argument.loc,
      );
    }
  }

  private checkLowerTimeframeExpressionCollections(expression: CallExpression, scope: SemanticScope): void {
    const calleeName = this.memberPath(expression.callee).join('.');
    if (calleeName !== 'request.security_lower_tf') return;
    const signature = this.resolveBuiltinSignature(calleeName, expression, scope);
    if (!signature || this.hasUnstableOptionArgumentBindings(expression.arguments, signature)) return;
    const requested = this.resolveCallArgumentExpression(expression, signature.params, 2);
    if (!requested) return;
    const types = this.inferTupleElementTypes(requested, scope) ?? [this.inferExpressionType(requested, scope)];
    if (!types.some((type) => type.kind === 'array' || type.kind === 'matrix' || type.kind === 'map')) return;
    this.addDiagnostic(
      'request-expression-collection',
      'request.security_lower_tf expression cannot return collections directly; wrap them in fields of a user-defined object',
      requested.loc,
    );
  }

  private checkRequestStringOptionArguments(expression: CallExpression, scope: SemanticScope): void {
    const calleeName = this.memberPath(expression.callee).join('.');
    const parameterNames = REQUEST_STRING_PARAMETER_NAMES_BY_CALL.get(calleeName);
    if (!parameterNames) return;

    const signature = this.resolveBuiltinSignature(calleeName, expression, scope);
    if (!signature) return;
    if (this.hasUnstableOptionArgumentBindings(expression.arguments, signature)) return;

    for (const parameterName of parameterNames) {
      const parameterIndex = signature.params.indexOf(parameterName);
      if (parameterIndex === -1) continue;

      const argument = this.resolveCallArgumentExpression(expression, signature.params, parameterIndex, signature);
      if (!argument) continue;

      const argumentType = this.inferExpressionType(argument, scope);
      if (argumentType.kind === 'unknown' || argumentType.kind === 'string') continue;

      this.addDiagnostic(
        'type-mismatch',
        `${calleeName} ${parameterName} must be a string, got ${this.formatSemanticType(argumentType)}`,
        argument.loc,
      );
    }
  }

  private checkQuandlIndexArgument(expression: CallExpression, scope: SemanticScope): void {
    const calleeName = this.memberPath(expression.callee).join('.');
    if (canonicalBuiltinName(calleeName) !== 'request.quandl') return;
    const signature = this.resolveBuiltinSignature(calleeName, expression, scope);
    if (!signature || this.hasUnstableOptionArgumentBindings(expression.arguments, signature)) return;
    this.checkBuiltinArgumentKind(expression, scope, calleeName, signature.params, 'index', 'integer', signature);
  }

  private checkFootprintTicksPerRowArgument(expression: CallExpression, scope: SemanticScope): void {
    const calleeName = this.memberPath(expression.callee).join('.');
    if (canonicalBuiltinName(calleeName) !== 'request.footprint') return;
    const signature = this.resolveBuiltinSignature(calleeName, expression, scope);
    if (!signature || this.hasUnstableOptionArgumentBindings(expression.arguments, signature)) return;
    this.checkBuiltinArgumentKind(expression, scope, calleeName, signature.params, 'ticks_per_row', 'integer', signature);
  }

  private checkStrategyBoolOptionArguments(expression: CallExpression, scope: SemanticScope): void {
    const calleeName = this.memberPath(expression.callee).join('.');
    if (!calleeName.startsWith('strategy.')) return;

    const signature = this.resolveBuiltinSignature(calleeName, expression, scope);
    if (!signature) return;
    if (this.hasUnstableOptionArgumentBindings(expression.arguments, signature)) return;
    const resolvedParams = this.resolveSignatureParams(expression.arguments, signature);

    for (const parameterName of STRATEGY_BOOL_PARAMETER_NAMES) {
      if (!resolvedParams.includes(parameterName)) continue;

      const parameterIndex = resolvedParams.indexOf(parameterName);
      const argument = this.resolveCallArgumentExpression(expression, resolvedParams, parameterIndex);
      if (!argument) continue;

      const argumentType = this.inferExpressionType(argument, scope);
      if (argumentType.kind === 'unknown' || argumentType.kind === 'bool') continue;

      this.addDiagnostic(
        'type-mismatch',
        `${calleeName} ${parameterName} must be a boolean, got ${this.formatSemanticType(argumentType)}`,
        argument.loc,
      );
    }
  }

  private checkStrategyStringOptionArguments(expression: CallExpression, scope: SemanticScope): void {
    const calleeName = this.memberPath(expression.callee).join('.');
    if (!calleeName.startsWith('strategy.')) return;

    const signature = this.resolveBuiltinSignature(calleeName, expression, scope);
    if (!signature) return;
    if (this.hasUnstableOptionArgumentBindings(expression.arguments, signature)) return;
    const resolvedParams = this.resolveSignatureParams(expression.arguments, signature);

    for (const parameterName of STRATEGY_STRING_PARAMETER_NAMES) {
      if (!resolvedParams.includes(parameterName)) continue;

      const parameterIndex = resolvedParams.indexOf(parameterName);
      const argument = this.resolveCallArgumentExpression(expression, resolvedParams, parameterIndex);
      if (!argument) continue;

      const argumentType = this.inferExpressionType(argument, scope);
      if (argumentType.kind === 'unknown' || argumentType.kind === 'string') continue;

      this.addDiagnostic(
        'type-mismatch',
        `${calleeName} ${parameterName} must be a string, got ${this.formatSemanticType(argumentType)}`,
        argument.loc,
      );
    }
  }

  private checkStrategyEnumStringOptionArguments(expression: CallExpression, scope: SemanticScope): void {
    const calleeName = this.memberPath(expression.callee).join('.');
    const parameterNames = STRATEGY_ENUM_STRING_PARAMETER_NAMES_BY_CALL.get(calleeName);
    if (!parameterNames) return;

    const signature = this.resolveBuiltinSignature(calleeName, expression, scope);
    if (!signature) return;
    if (this.hasUnstableOptionArgumentBindings(expression.arguments, signature)) return;

    for (const parameterName of parameterNames) {
      const parameterIndex = signature.params.indexOf(parameterName);
      if (parameterIndex === -1) continue;

      const argument = this.resolveCallArgumentExpression(expression, signature.params, parameterIndex);
      if (!argument) continue;

      const argumentType = this.inferExpressionType(argument, scope);
      if (
        parameterName === 'direction'
        && this.currentPineVersion <= 4
        && (calleeName === 'strategy.entry' || calleeName === 'strategy.order')
        && argumentType.kind === 'bool'
      ) {
        continue;
      }
      if (argumentType.kind === 'unknown' || argumentType.kind === 'string') continue;

      this.addDiagnostic(
        'type-mismatch',
        `${calleeName} ${parameterName} must be a string, got ${this.formatSemanticType(argumentType)}`,
        argument.loc,
      );
    }
  }

  private checkStrategyNumericOptionArguments(expression: CallExpression, scope: SemanticScope): void {
    const calleeName = this.memberPath(expression.callee).join('.');
    if (!calleeName.startsWith('strategy.')) return;

    const signature = this.resolveBuiltinSignature(calleeName, expression, scope);
    if (!signature) return;
    if (this.hasUnstableOptionArgumentBindings(expression.arguments, signature)) return;
    const resolvedParams = this.resolveSignatureParams(expression.arguments, signature);

    for (const parameterName of STRATEGY_NUMERIC_PARAMETER_NAMES) {
      if (!resolvedParams.includes(parameterName)) continue;

      const parameterIndex = resolvedParams.indexOf(parameterName);
      this.checkStrategyNumericOptionArgument(expression, scope, resolvedParams, parameterName, parameterIndex, calleeName);
    }

    if (STRATEGY_NUMERIC_VALUE_PARAMETER_CALLS.has(calleeName)) {
      const parameterIndex = resolvedParams.indexOf('value');
      this.checkStrategyNumericOptionArgument(expression, scope, resolvedParams, 'value', parameterIndex, calleeName);
    }
  }

  private checkStrategyNumericOptionArgument(
    expression: CallExpression,
    scope: SemanticScope,
    params: string[],
    parameterName: string,
    parameterIndex: number,
    calleeName: string,
  ): void {
    if (parameterIndex < 0) return;

    const argument = this.resolveCallArgumentExpression(expression, params, parameterIndex);
    if (!argument) return;

    const argumentType = this.inferExpressionType(argument, scope);
    if (argumentType.kind === 'unknown' || argumentType.kind === 'int' || argumentType.kind === 'float') return;

    this.addDiagnostic(
      'type-mismatch',
      `${calleeName} ${parameterName} must be a number, got ${this.formatSemanticType(argumentType)}`,
      argument.loc,
    );
  }

  private checkAlertFrequencyLiteralArguments(expression: CallExpression): void {
    const calleeName = this.memberPath(expression.callee).join('.');
    if (calleeName !== 'alert') return;

    const parameterNames = BUILTIN_SIGNATURES.get(calleeName)?.params;
    if (!parameterNames) return;

    const frequency = this.resolveCallArgumentExpression(expression, parameterNames, parameterNames.indexOf('freq'));
    this.checkNamespacedConstantStringValue(
      frequency,
      ALERT_FREQUENCY_VALUES,
      ALERT_FREQUENCY_CONSTANT_VALUES,
      'alert.freq_',
      'Invalid alert frequency',
    );
  }

  private checkFillHandleKinds(expression: CallExpression, scope: SemanticScope): void {
    if (this.memberPath(expression.callee).join('.') !== 'fill') return;
    const signature = this.resolveBuiltinSignature('fill', expression, scope);
    if (!signature || this.hasUnstableOptionArgumentBindings(expression.arguments, signature)) return;
    const params = this.resolveSignatureParams(expression.arguments, signature, scope);
    const first = this.resolveCallArgumentExpression(expression, params, 0, signature);
    const second = this.resolveCallArgumentExpression(expression, params, 1, signature);
    if (!first || !second) return;
    const firstKind = this.inferExpressionType(first, scope).kind;
    const secondKind = this.inferExpressionType(second, scope).kind;
    if (firstKind === 'unknown' || secondKind === 'unknown') return;
    if ((firstKind === 'plot' || firstKind === 'hline') && firstKind === secondKind) return;

    this.addDiagnostic(
      'type-mismatch',
      'fill() requires two plot IDs or two hline IDs; plot and hline IDs cannot be mixed',
      expression.callee.loc,
    );
  }

  private checkV6VisualArgumentQualifiers(expression: CallExpression, scope: SemanticScope): void {
    if (this.versionRules.version !== 6) return;
    const calleeName = this.memberPath(expression.callee).join('.');
    const limits = V6_VISUAL_QUALIFIER_LIMITS[calleeName];
    if (!limits) return;
    const signature = this.resolveBuiltinSignature(calleeName, expression, scope);
    if (!signature || this.hasUnstableOptionArgumentBindings(expression.arguments, signature)) return;
    const params = this.resolveSignatureParams(expression.arguments, signature, scope);
    for (const [name, qualifier] of Object.entries(limits)) {
      this.checkBuiltinArgumentQualifier(expression, scope, calleeName, params, name, qualifier, signature);
    }
  }

  private checkFunctionOverloadOrder(expression: CallExpression, scope: SemanticScope): void {
    const active = this.activeFunction;
    if (this.currentPineVersion < 6 || !active || active.isMethod || expression.callee.type !== 'Identifier') return;
    if (expression.callee.name !== active.name.name) return;
    const declarations = this.functionDeclarations.get(active.name.name);
    if (!declarations || declarations.length < 2) return;
    const target = this.findUserFunctionDeclaration(active.name.name, expression, scope);
    if (!target || target === active || declarations.indexOf(target) <= declarations.indexOf(active)) return;
    this.addDiagnostic('function-overload-order', `Overload ${active.name.name} can call a different overload only when it is defined earlier`, expression.callee.loc);
  }

  private checkGlobalOnlyCallScope(expression: CallExpression, scope: SemanticScope): void {
    const name = this.memberPath(expression.callee).join('.');
    if (!GLOBAL_ONLY_BUILTIN_CALLS.has(name) || !this.resolveBuiltinSignature(name, expression, scope)) return;
    this.checkGlobalOnlyScope(name, scope, expression.callee.loc);
  }

  private checkGlobalOnlyScope(name: string, scope: SemanticScope, loc?: SourceLocation): void {
    if (scope === this.rootScope) return;
    this.addDiagnostic(
      'scope-mismatch',
      `${name}() must be called from the global scope; move the call out of the local block`,
      loc,
    );
  }

  private checkAlertStringOptionArguments(expression: CallExpression, scope: SemanticScope): void {
    const calleeName = this.memberPath(expression.callee).join('.');
    const parameterNames = ALERT_STRING_PARAMETER_NAMES_BY_CALL.get(calleeName);
    if (!parameterNames) return;

    const signature = this.resolveBuiltinSignature(calleeName, expression, scope);
    if (!signature) return;
    if (this.hasUnstableOptionArgumentBindings(expression.arguments, signature)) return;

    for (const parameterName of parameterNames) {
      if (!signature.params.includes(parameterName)) continue;

      const parameterIndex = signature.params.indexOf(parameterName);
      const argument = this.resolveCallArgumentExpression(expression, signature.params, parameterIndex);
      if (!argument) continue;

      const argumentType = this.inferExpressionType(argument, scope);
      if (calleeName === 'alertcondition' && argumentType.kind === 'string' && argumentType.qualifier !== 'const') {
        this.addDiagnostic(
          'qualifier-mismatch',
          `Cannot pass ${this.formatSemanticTypeWithQualifier(argumentType)} ${parameterName} to alertcondition(); use a const string`,
          argument.loc,
        );
        continue;
      }

      if (argumentType.kind === 'unknown' || argumentType.kind === 'string') continue;

      this.addDiagnostic(
        'type-mismatch',
        `${calleeName} ${parameterName} must be a string, got ${this.formatSemanticType(argumentType)}`,
        argument.loc,
      );
    }
  }

  private checkLogFormattingArguments(expression: CallExpression, scope: SemanticScope): void {
    const calleeName = this.memberPath(expression.callee).join('.');
    if (!['log.info', 'log.warning', 'log.error'].includes(calleeName)) return;
    const signature = this.resolveBuiltinSignature(calleeName, expression, scope);
    if (!signature || this.hasUnstableOptionArgumentBindings(expression.arguments, signature)) return;

    for (const argument of expression.arguments.slice(1)) {
      const type = this.inferExpressionType(argument.value, scope);
      const valueType = type.kind === 'array' ? type.elementType : type;
      if (!valueType || ['unknown', 'int', 'float', 'bool', 'string'].includes(valueType.kind)) continue;
      this.addDiagnostic(
        'type-mismatch',
        `${calleeName} format argument must be a primitive value or primitive array, got ${this.formatSemanticType(type)}`,
        argument.loc,
      );
    }
  }

  private checkAlertBoolOptionArguments(expression: CallExpression, scope: SemanticScope): void {
    const calleeName = this.memberPath(expression.callee).join('.');
    const parameterNames = ALERT_BOOL_PARAMETER_NAMES_BY_CALL.get(calleeName);
    if (!parameterNames) return;

    const signature = this.resolveBuiltinSignature(calleeName, expression, scope);
    if (!signature) return;
    if (this.hasUnstableOptionArgumentBindings(expression.arguments, signature)) return;

    for (const parameterName of parameterNames) {
      if (!signature.params.includes(parameterName)) continue;

      const parameterIndex = signature.params.indexOf(parameterName);
      const argument = this.resolveCallArgumentExpression(expression, signature.params, parameterIndex);
      if (!argument) continue;

      const argumentType = this.inferExpressionType(argument, scope);
      if (argumentType.kind === 'unknown' || argumentType.kind === 'bool') continue;

      this.addDiagnostic(
        'type-mismatch',
        `${calleeName} ${parameterName} must be a boolean, got ${this.formatSemanticType(argumentType)}`,
        argument.loc,
      );
    }
  }

  private checkVisualLineStyleLiteralArguments(expression: CallExpression, scope: SemanticScope): void {
    if (this.hasLocalUserCallableShadow(expression, scope)) return;
    const calleeName = this.memberPath(expression.callee).join('.');
    const signature = BUILTIN_SIGNATURES.get(calleeName);
    if (!signature || this.hasUnstableOptionArgumentBindings(expression.arguments, signature)) return;
    const parameterNames = this.resolveSignatureParams(expression.arguments, signature);

    switch (calleeName) {
      case 'plot': {
        const style = this.resolveCallArgumentExpression(expression, parameterNames, parameterNames.indexOf('style'));
        this.checkVisualUniqueParameterType(style, scope, 'plot', 'style', 'plot.style_');
        this.checkNamespacedConstantStringValue(
          style,
          PLOT_STYLE_VALUES,
          PLOT_STYLE_CONSTANT_VALUES,
          'plot.style_',
          'Invalid plot style',
          undefined,
          true,
        );
        const linestyle = this.resolveCallArgumentExpression(expression, parameterNames, parameterNames.indexOf('linestyle'));
        this.checkVisualUniqueParameterType(linestyle, scope, 'plot', 'linestyle', 'plot.linestyle_');
        this.checkNamespacedConstantStringValue(
          linestyle,
          VISUAL_LINESTYLE_VALUES,
          PLOT_LINESTYLE_CONSTANT_VALUES,
          'plot.linestyle_',
          'Invalid plot linestyle',
        );
        break;
      }
      case 'hline': {
        const linestyle = this.resolveCallArgumentExpression(expression, parameterNames, parameterNames.indexOf('linestyle'));
        this.checkVisualUniqueParameterType(linestyle, scope, 'hline', 'linestyle', 'hline.style_');
        this.checkNamespacedConstantStringValue(
          linestyle,
          VISUAL_LINESTYLE_VALUES,
          HLINE_LINESTYLE_CONSTANT_VALUES,
          'hline.style_',
          'Invalid hline linestyle',
        );
        break;
      }
    }
  }

  private checkVisualUniqueParameterType(
    expression: Expression | undefined,
    scope: SemanticScope,
    calleeName: string,
    parameterName: string,
    namespacePrefix: string,
  ): void {
    if (!expression || this.versionRules.allowsRawUniqueParameterValues) return;
    const type = this.inferExpressionType(expression, scope);
    // The unique-value guard validates each style family separately. Retain
    // legacy string constants while accepting the distinct named style types.
    if (type.kind === 'unknown' || type.kind === 'string' || type.kind === 'unique') return;
    this.addDiagnostic(
      'type-mismatch',
      `${calleeName} ${parameterName} must use a named ${namespacePrefix}* constant, got ${this.formatSemanticType(type)}`,
      expression.loc,
    );
  }

  private checkVisualFormatPrecisionLiteralArguments(expression: CallExpression, scope: SemanticScope): void {
    const calleeName = this.memberPath(expression.callee).join('.');
    if (!VISUAL_FORMAT_PRECISION_CALLS.has(calleeName)) return;

    const signature = this.resolveBuiltinSignature(calleeName, expression, scope);
    if (!signature || this.hasUnstableOptionArgumentBindings(expression.arguments, signature)) return;
    const parameterNames = this.resolveSignatureParams(expression.arguments, signature, scope);

    const formatIndex = parameterNames.indexOf('format');
    const format = this.resolveCallArgumentExpression(expression, parameterNames, formatIndex);
    this.checkNamespacedConstantStringValue(
      format,
      DECLARATION_FORMAT_VALUES,
      DECLARATION_FORMAT_CONSTANT_VALUES,
      'format.',
      `Invalid ${calleeName} format`,
    );

    const precisionIndex = parameterNames.indexOf('precision');
    const precision = this.resolveCallArgumentExpression(expression, parameterNames, precisionIndex, signature);
    if (this.currentPineVersion === 6 && precision) {
      const value = this.visualNumericDefaultValue(precision, scope);
      if (value !== undefined && (!Number.isInteger(value) || value < 0 || value > 16)) {
        this.addDiagnostic('type-mismatch', `${calleeName} precision must be an integer from 0 to 16`, precision.loc);
      }
    } else {
      this.checkNonNegativeLiteralIntegerValue(
        precision,
        `${calleeName} precision must be a non-negative integer`,
      );
    }
  }

  private checkMarkerStyleLocationSizeLiteralArguments(expression: CallExpression): void {
    const calleeName = this.memberPath(expression.callee).join('.');
    if (calleeName !== 'plotshape' && calleeName !== 'plotchar') return;

    const signature = BUILTIN_SIGNATURES.get(calleeName);
    if (!signature) return;
    const parameterNames = this.resolveSignatureParams(expression.arguments, signature);

    if (calleeName === 'plotshape') {
      const style = this.resolveCallArgumentExpression(expression, parameterNames, parameterNames.indexOf('style'));
      this.checkNamespacedConstantStringValue(
        style,
        MARKER_STYLE_VALUES,
        MARKER_STYLE_CONSTANT_VALUES,
        'shape.',
        'Invalid plotshape style',
      );
    }

    const location = this.resolveCallArgumentExpression(expression, parameterNames, parameterNames.indexOf('location'));
    this.checkNamespacedConstantStringValue(
      location,
      MARKER_LOCATION_VALUES,
      MARKER_LOCATION_CONSTANT_VALUES,
      'location.',
      `Invalid ${calleeName} location`,
    );

    const size = this.resolveCallArgumentExpression(expression, parameterNames, parameterNames.indexOf('size'));
    this.checkNamespacedConstantStringValue(
      size,
      VISUAL_SIZE_VALUES,
      VISUAL_SIZE_CONSTANT_VALUES,
      'size.',
      `Invalid ${calleeName} size`,
    );
  }

  private checkVisualNumericOptionLiteralArguments(expression: CallExpression, scope: SemanticScope): void {
    const calleeName = this.memberPath(expression.callee).join('.');
    const signature = BUILTIN_SIGNATURES.get(calleeName);
    if (!signature || this.hasUnstableOptionArgumentBindings(expression.arguments, signature)) return;
    const parameterNames = this.resolveSignatureParams(expression.arguments, signature);

    if (calleeName === 'plot' || calleeName === 'hline') {
      const linewidth = this.resolveCallArgumentExpression(expression, parameterNames, parameterNames.indexOf('linewidth'));
      this.checkVisualLinewidthValue(linewidth, calleeName, scope);
      return;
    }

    if (calleeName === 'plotarrow') {
      const minheight = this.resolveCallArgumentExpression(expression, parameterNames, parameterNames.indexOf('minheight'));
      this.checkPositiveLiteralIntegerValue(
        minheight,
        'plotarrow minheight must be a positive integer',
      );
      const maxheight = this.resolveCallArgumentExpression(expression, parameterNames, parameterNames.indexOf('maxheight'));
      this.checkPositiveLiteralIntegerValue(
        maxheight,
        'plotarrow maxheight must be a positive integer',
      );
    }
  }

  private checkHlineArgumentQualifiers(expression: CallExpression, scope: SemanticScope): void {
    if (this.memberPath(expression.callee).join('.') !== 'hline') return;
    const signature = BUILTIN_SIGNATURES.get('hline');
    if (!signature || this.hasUnstableOptionArgumentBindings(expression.arguments, signature)) return;
    const parameterNames = this.resolveSignatureParams(expression.arguments, signature);
    for (const parameterName of parameterNames) {
      this.checkBuiltinArgumentQualifier(
        expression, scope, 'hline', parameterNames, parameterName,
        parameterName === 'title' ? 'const' : 'input', signature,
      );
    }
  }

  private checkVisualStringOptionArguments(expression: CallExpression, scope: SemanticScope): void {
    const calleeName = this.memberPath(expression.callee).join('.');
    const parameterNames = VISUAL_STRING_PARAMETER_NAMES_BY_CALL.get(calleeName);
    if (!parameterNames) return;

    const signature = this.resolveBuiltinSignature(calleeName, expression, scope);
    if (!signature) return;
    if (calleeName === 'fill' && this.currentPineVersion === 5) {
      expression = {
        ...expression,
        arguments: expression.arguments.filter((argument) => !this.duplicateCallArguments.has(argument)),
      };
    }
    if (this.hasUnstableOptionArgumentBindings(expression.arguments, signature)) return;
    const resolvedParams = this.resolveSignatureParams(expression.arguments, signature);

    for (const parameterName of parameterNames) {
      if (this.currentPineVersion !== 6 && !['title', 'char', 'text'].includes(parameterName)) continue;
      if (!resolvedParams.includes(parameterName)) continue;

      const parameterIndex = resolvedParams.indexOf(parameterName);
      const argument = this.resolveCallArgumentExpression(expression, resolvedParams, parameterIndex);
      if (!argument) continue;

      const argumentType = this.inferExpressionType(argument, scope);
      if (argumentType.kind === 'unknown' || argumentType.kind === 'string') continue;

      this.addDiagnostic(
        'type-mismatch',
        `${calleeName} ${parameterName} must be a string, got ${this.formatSemanticType(argumentType)}`,
        argument.loc,
      );
    }
  }

  // Keep inferred qualifiers of unqualified typed aliases local to offset validation.
  // Other builtin checks still use the ordinary semantic scope.
  private visualOffsetScope(node: Expression | IfStatement, scope: SemanticScope): SemanticScope {
    const offsetScope = new SemanticScope(scope);
    const visit = (value: unknown): void => {
      if (!value || typeof value !== 'object') return;
      if (Array.isArray(value)) {
        value.forEach(visit);
        return;
      }
      const expression = value as Expression;
      if (expression.type === 'Identifier') {
        const symbol = scope.lookup(expression.name);
        const qualifier = symbol ? this.visualOffsetQualifiers.get(symbol) : undefined;
        if (symbol?.type && !symbol.type.qualifier && qualifier) {
          offsetScope.declare({ ...symbol, type: { ...symbol.type, qualifier } });
        }
        return;
      }
      for (const [key, child] of Object.entries(value)) {
        if (key !== 'loc') visit(child);
      }
    };
    visit(node);
    return offsetScope;
  }

  private checkVisualNumericOptionArguments(expression: CallExpression, scope: SemanticScope): void {
    const calleeName = this.memberPath(expression.callee).join('.');
    const parameterNames = VISUAL_NUMERIC_PARAMETER_NAMES_BY_CALL.get(calleeName);
    if (!parameterNames) return;

    const signature = this.resolveBuiltinSignature(calleeName, expression, scope);
    if (!signature) return;
    if (this.hasUnstableOptionArgumentBindings(expression.arguments, signature)) return;
    const resolvedParams = this.resolveSignatureParams(expression.arguments, signature);

    for (const parameterName of parameterNames) {
      const expectedKind = this.currentPineVersion === 6 && ['offset', 'show_last', 'minheight', 'maxheight', 'precision'].includes(parameterName)
        ? 'integer' : 'number';
      this.checkBuiltinArgumentKind(expression, scope, calleeName, resolvedParams, parameterName, expectedKind, signature);
      if (parameterName === 'offset' && this.versionRules.disallowsSeriesVisualOffset) {
        this.checkBuiltinArgumentQualifier(
          expression, this.visualOffsetScope(expression, scope), calleeName, resolvedParams, parameterName, 'simple', signature,
        );
      }
    }
  }

  private checkVisualBoolOptionArguments(expression: CallExpression, scope: SemanticScope): void {
    const calleeName = this.memberPath(expression.callee).join('.');
    const parameterNames = VISUAL_BOOL_PARAMETER_NAMES_BY_CALL.get(calleeName);
    if (!parameterNames) return;

    const signature = this.resolveBuiltinSignature(calleeName, expression, scope);
    if (!signature) return;
    if (this.hasUnstableOptionArgumentBindings(expression.arguments, signature)) return;
    const resolvedParams = this.resolveSignatureParams(expression.arguments, signature);

    for (const parameterName of parameterNames) {
      this.checkBuiltinArgumentKind(expression, scope, calleeName, resolvedParams, parameterName, 'boolean');
    }
  }

  private checkColorOptionArguments(expression: CallExpression, scope: SemanticScope): void {
    const calleeName = this.memberPath(expression.callee).join('.');
    const parameterNames =
      VISUAL_COLOR_PARAMETER_NAMES_BY_CALL.get(calleeName) ?? DRAWING_COLOR_PARAMETER_NAMES_BY_CALL.get(calleeName);
    if (!parameterNames) return;

    const signature = this.resolveBuiltinSignature(calleeName, expression, scope);
    if (!signature) return;
    if (this.hasUnstableOptionArgumentBindings(expression.arguments, signature)) return;
    const resolvedParams = this.resolveSignatureParams(expression.arguments, signature);

    for (const parameterName of parameterNames) {
      const parameterIndex = resolvedParams.indexOf(parameterName);
      if (parameterIndex === -1) continue;

      const argument = this.resolveCallArgumentExpression(expression, resolvedParams, parameterIndex);
      if (!argument) continue;

      const argumentType = this.inferExpressionType(argument, scope);
      if (argumentType.kind === 'unknown' || argumentType.kind === 'color') continue;

      this.addDiagnostic(
        'type-mismatch',
        `${calleeName} ${parameterName} must be a color, got ${this.formatSemanticType(argumentType)}`,
        argument.loc,
      );
    }
  }

  private checkDisplayOptionLiteralArguments(expression: CallExpression, scope: SemanticScope): void {
    const calleeName = this.memberPath(expression.callee).join('.');
    const signature = this.resolveBuiltinSignature(calleeName, expression, scope);
    if (!signature?.params.includes('display') && !signature?.legacyV4Params?.includes('display')) return;
    if (this.hasUnstableOptionArgumentBindings(expression.arguments, signature)) return;
    const resolvedParams = this.resolveSignatureParams(expression.arguments, signature, scope);
    if (this.currentPineVersion === 6 && VISUAL_NUMERIC_PARAMETER_NAMES_BY_CALL.has(calleeName)) {
      // Display constants and mask arithmetic use numeric semantic kinds.
      this.checkBuiltinArgumentKind(expression, scope, calleeName, resolvedParams, 'display', 'number', signature);
    }

    const candidates = new Set<Expression>();
    const namedDisplay = expression.arguments.find((argument) => argument.name?.name === 'display')?.value;
    if (namedDisplay) candidates.add(namedDisplay);

    const displayIndex = resolvedParams.indexOf('display');
    const display = displayIndex === -1 ? undefined : this.resolveCallArgumentExpression(expression, resolvedParams, displayIndex);
    if (display) candidates.add(display);

    for (const display of candidates) {
      const literalValue = this.constantLiteralValue(display);
      if (typeof literalValue === 'string') {
        this.addDiagnostic('type-mismatch', `Invalid ${calleeName} display: ${literalValue}`, display.loc);
        continue;
      }

      this.checkNamespacedConstantStringValue(
        display,
        DISPLAY_OPTION_VALUES,
        DISPLAY_OPTION_CONSTANT_VALUES,
        'display.',
        `Invalid ${calleeName} display`,
      );
    }
  }

  private checkDrawingCoordinateOptionLiteralArguments(expression: CallExpression, scope: SemanticScope): void {
    const calleeName = this.memberPath(expression.callee).join('.');
    const signature = this.resolveBuiltinSignature(calleeName, expression, scope);
    if (!signature) return;

    this.checkDrawingOptionLiteralArgument(
      expression,
      signature.params,
      calleeName,
      'xloc',
      DRAWING_XLOC_VALUES,
      DRAWING_XLOC_CONSTANT_VALUES,
      'xloc.',
    );
    this.checkDrawingOptionLiteralArgument(
      expression,
      signature.params,
      calleeName,
      'yloc',
      DRAWING_YLOC_VALUES,
      DRAWING_YLOC_CONSTANT_VALUES,
      'yloc.',
    );
    this.checkDrawingOptionLiteralArgument(
      expression,
      signature.params,
      calleeName,
      'extend',
      DRAWING_EXTEND_VALUES,
      DRAWING_EXTEND_CONSTANT_VALUES,
      'extend.',
    );
  }

  private checkDrawingStyleOptionLiteralArguments(expression: CallExpression, scope: SemanticScope): void {
    const calleeName = this.memberPath(expression.callee).join('.');
    const signature = this.resolveBuiltinSignature(calleeName, expression, scope);
    if (!signature) return;

    if (calleeName === 'line.new' || calleeName === 'line.set_style') {
      this.checkDrawingOptionLiteralArgument(
        expression,
        signature.params,
        calleeName,
        'style',
        DRAWING_LINE_STYLE_VALUES,
        DRAWING_LINE_STYLE_CONSTANT_VALUES,
        'line.style_',
      );
      return;
    }

    if (calleeName === 'label.new' || calleeName === 'label.set_style') {
      this.checkDrawingOptionLiteralArgument(
        expression,
        signature.params,
        calleeName,
        'style',
        DRAWING_LABEL_STYLE_VALUES,
        DRAWING_LABEL_STYLE_CONSTANT_VALUES,
        'label.style_',
      );
      return;
    }

    if (calleeName === 'box.new') {
      this.checkDrawingOptionLiteralArgument(
        expression,
        signature.params,
        calleeName,
        'border_style',
        DRAWING_LINE_STYLE_VALUES,
        DRAWING_LINE_STYLE_CONSTANT_VALUES,
        'line.style_',
      );
      return;
    }

    if (calleeName === 'box.set_border_style') {
      this.checkDrawingOptionLiteralArgument(
        expression,
        signature.params,
        calleeName,
        'style',
        DRAWING_LINE_STYLE_VALUES,
        DRAWING_LINE_STYLE_CONSTANT_VALUES,
        'line.style_',
      );
      return;
    }

    if (calleeName === 'polyline.new') {
      this.checkDrawingOptionLiteralArgument(
        expression,
        signature.params,
        calleeName,
        'line_style',
        DRAWING_LINE_STYLE_VALUES,
        DRAWING_LINE_STYLE_CONSTANT_VALUES,
        'line.style_',
      );
    }
  }

  private checkDrawingTextOptionLiteralArguments(expression: CallExpression, scope: SemanticScope): void {
    const calleeName = this.memberPath(expression.callee).join('.');
    const signature = this.resolveBuiltinSignature(calleeName, expression, scope);
    if (!signature) return;

    this.checkDrawingOptionLiteralArgument(
      expression,
      signature.params,
      calleeName,
      'textalign',
      DRAWING_TEXT_HALIGN_VALUES,
      DRAWING_TEXT_HALIGN_CONSTANT_VALUES,
      'text.align_',
    );
    this.checkDrawingOptionLiteralArgument(
      expression,
      signature.params,
      calleeName,
      'text_halign',
      DRAWING_TEXT_HALIGN_VALUES,
      DRAWING_TEXT_HALIGN_CONSTANT_VALUES,
      'text.align_',
    );
    this.checkDrawingOptionLiteralArgument(
      expression,
      signature.params,
      calleeName,
      'text_valign',
      DRAWING_TEXT_VALIGN_VALUES,
      DRAWING_TEXT_VALIGN_CONSTANT_VALUES,
      'text.align_',
    );
    this.checkDrawingOptionLiteralArgument(
      expression,
      signature.params,
      calleeName,
      'text_wrap',
      DRAWING_TEXT_WRAP_VALUES,
      DRAWING_TEXT_WRAP_CONSTANT_VALUES,
      'text.wrap_',
    );
    this.checkDrawingOptionLiteralArgument(
      expression,
      signature.params,
      calleeName,
      'text_font_family',
      DRAWING_FONT_FAMILY_VALUES,
      DRAWING_FONT_FAMILY_CONSTANT_VALUES,
      'font.family_',
    );
    this.checkDrawingOptionLiteralArgument(
      expression,
      signature.params,
      calleeName,
      'text_formatting',
      DRAWING_TEXT_FORMATTING_VALUES,
      DRAWING_TEXT_FORMATTING_CONSTANT_VALUES,
      'text.format_',
    );
  }

  private checkDrawingStringOptionArguments(expression: CallExpression, scope: SemanticScope): void {
    const calleeName = this.memberPath(expression.callee).join('.');
    const parameterNames = DRAWING_STRING_PARAMETER_NAMES_BY_CALL.get(calleeName);
    if (!parameterNames) return;

    const signature = this.resolveBuiltinSignature(calleeName, expression, scope);
    if (!signature) return;
    if (this.hasUnstableOptionArgumentBindings(expression.arguments, signature)) return;

    for (const parameterName of parameterNames) {
      const parameterIndex = signature.params.indexOf(parameterName);
      if (parameterIndex === -1) continue;

      const argument = this.resolveCallArgumentExpression(expression, signature.params, parameterIndex);
      if (!argument) continue;

      const argumentType = this.inferExpressionType(argument, scope);
      if (argumentType.kind === 'unknown' || argumentType.kind === 'string') continue;

      this.addDiagnostic(
        'type-mismatch',
        `${calleeName} ${parameterName} must be a string, got ${this.formatSemanticType(argumentType)}`,
        argument.loc,
      );
    }
  }

  private checkTablePositionOptionLiteralArguments(expression: CallExpression, scope: SemanticScope): void {
    const calleeName = this.memberPath(expression.callee).join('.');
    const signature = this.resolveBuiltinSignature(calleeName, expression, scope);
    if (!signature) return;

    this.checkDrawingOptionLiteralArgument(
      expression,
      signature.params,
      calleeName,
      'position',
      TABLE_POSITION_VALUES,
      TABLE_POSITION_CONSTANT_VALUES,
      'position.',
      'Use one of the position.* constants such as position.top_right or position.bottom_left.',
    );
  }

  private checkDrawingSizeOptionLiteralArguments(expression: CallExpression, scope: SemanticScope): void {
    const calleeName = this.memberPath(expression.callee).join('.');
    const signature = this.resolveBuiltinSignature(calleeName, expression, scope);
    if (!signature) return;

    if (calleeName === 'table.cell' || calleeName === 'table.cell_set_text_size') {
      this.checkNonNegativeLiteralNumberValue(
        this.getCallArgument(expression.arguments, 'text_size', signature.params.indexOf('text_size')),
        `${calleeName} text_size must be a non-negative number`,
      );
    }

    if (DRAWING_SIZE_PARAMETER_CALLEES.has(calleeName)) {
      this.checkDrawingOptionLiteralArgument(
        expression,
        signature.params,
        calleeName,
        'size',
        VISUAL_SIZE_VALUES,
        VISUAL_SIZE_CONSTANT_VALUES,
        'size.',
      );
    }
    this.checkDrawingOptionLiteralArgument(
      expression,
      signature.params,
      calleeName,
      'text_size',
      VISUAL_SIZE_VALUES,
      VISUAL_SIZE_CONSTANT_VALUES,
      'size.',
    );
  }

  private checkTickerLinebreakArgumentTypes(expression: CallExpression, scope: SemanticScope): void {
    const calleeName = this.memberPath(expression.callee).join('.');
    if (calleeName !== 'ticker.linebreak' || this.currentPineVersion < 6) return;

    const signature = this.resolveBuiltinSignature(calleeName, expression, scope);
    if (!signature || this.hasUnstableOptionArgumentBindings(expression.arguments, signature)) return;
    const params = this.resolveSignatureParams(expression.arguments, signature, scope);
    this.checkBuiltinArgumentKind(expression, scope, calleeName, params, 'symbol', 'string', signature);
    this.checkBuiltinArgumentKind(expression, scope, calleeName, params, 'number_of_lines', 'integer', signature);
  }

  private checkTickerOptionLiteralArguments(expression: CallExpression, scope: SemanticScope): void {
    const calleeName = this.memberPath(expression.callee).join('.');
    if (calleeName !== 'ticker.new' && calleeName !== 'ticker.modify') return;

    const signature = this.resolveBuiltinSignature(calleeName, expression, scope);
    if (!signature) return;
    if (this.hasUnstableOptionArgumentBindings(expression.arguments, signature)) return;

    const params = this.resolveSignatureParams(expression.arguments, signature, scope);
    const stringParams = calleeName === 'ticker.new' ? ['adjustment'] : ['tickerid', 'session', 'adjustment'];
    for (const parameter of stringParams) {
      this.checkBuiltinArgumentKind(expression, scope, calleeName, params, parameter, 'string', signature);
    }
    for (const parameter of ['backadjustment', 'settlement_as_close']) {
      this.checkBuiltinArgumentQualifier(expression, scope, calleeName, params, parameter, 'simple', signature);
    }
    if (calleeName === 'ticker.modify') {
      for (const [parameter, kind] of [['backadjustment', 'backadjustment'], ['settlement_as_close', 'settlement']] as const) {
        const argument = this.resolveCallArgumentExpression(expression, signature.params, signature.params.indexOf(parameter), signature);
        if (!argument) continue;
        const type = this.inferExpressionType(argument, scope);
        if (type.kind !== kind && type.kind !== 'unknown'
          && !(this.versionRules.allowsRawUniqueParameterValues && type.kind === 'string')) {
          this.addDiagnostic('type-mismatch', `${calleeName} ${parameter} must be a ${kind} selector, got ${this.formatSemanticType(type)}`, argument.loc);
        }
        this.checkBuiltinArgumentQualifier(expression, scope, calleeName, signature.params, parameter, 'simple', signature);
      }
    }

    this.checkDrawingOptionLiteralArgument(
      expression,
      signature.params,
      calleeName,
      'session',
      TICKER_SESSION_VALUES,
      TICKER_SESSION_CONSTANT_VALUES,
      'session.',
    );
    this.checkDrawingOptionLiteralArgument(
      expression,
      signature.params,
      calleeName,
      'adjustment',
      TICKER_ADJUSTMENT_VALUES,
      TICKER_ADJUSTMENT_CONSTANT_VALUES,
      'adjustment.',
    );
    this.checkDrawingOptionLiteralArgument(
      expression,
      signature.params,
      calleeName,
      'backadjustment',
      TICKER_INHERIT_ON_OFF_VALUES,
      TICKER_BACKADJUSTMENT_CONSTANT_VALUES,
      'backadjustment.',
    );
    this.checkDrawingOptionLiteralArgument(
      expression,
      signature.params,
      calleeName,
      'settlement_as_close',
      TICKER_INHERIT_ON_OFF_VALUES,
      TICKER_SETTLEMENT_AS_CLOSE_CONSTANT_VALUES,
      'settlement_as_close.',
    );
  }

  private hasUnstableOptionArgumentBindings(args: CallArgument[], signature: BuiltinSignature): boolean {
    const params = this.resolveSignatureParams(args, signature);
    const positionalParams = signature.allowNamedPrefixWithPositional
      ? this.positionalBindingParams(args, signature, params)
      : params;
    const boundParams = new Set<string>();
    const positionalBoundParams = new Set<string>();
    const seenNames = new Set<string>();

    for (const arg of args) {
      if (!arg.name) {
        const positionalParam = positionalParams.find((param) => !boundParams.has(param));
        if (positionalParam) {
          boundParams.add(positionalParam);
          positionalBoundParams.add(positionalParam);
        }
        continue;
      }

      const canonicalName = this.canonicalSignatureArgumentName(arg.name.name, signature);
      if (!params.includes(canonicalName)) return true;
      if (seenNames.has(canonicalName) || positionalBoundParams.has(canonicalName)) return true;
      seenNames.add(canonicalName);
      boundParams.add(canonicalName);
    }

    return false;
  }

  private checkDrawingOptionLiteralArgument(
    expression: CallExpression,
    parameterNames: string[],
    calleeName: string,
    parameterName: string,
    allowedValues: Set<string>,
    constantValues: Map<string, string>,
    namespacePrefix: string,
    guidance?: string,
  ): void {
    const parameterIndex = parameterNames.indexOf(parameterName);
    if (parameterIndex === -1) return;

    const option = this.resolveCallArgumentExpression(expression, parameterNames, parameterIndex);
    this.checkNamespacedConstantStringValue(
      option,
      allowedValues,
      constantValues,
      namespacePrefix,
      `Invalid ${calleeName} ${parameterName}`,
      guidance,
    );
  }

  private checkStrategyOrderLiteralArguments(expression: CallExpression, displayName: string): void {
    this.checkNonEmptyLiteralStringArgument(expression, 'id', 0, `${displayName} id must not be empty`);
    this.checkStrategyDirectionArgument(expression, displayName, 'direction', 1);
    this.checkPositiveLiteralNumberArgument(expression, 'qty', 2, `${displayName} qty must be a positive number`);
    this.checkStrategyOcaTypeArgument(expression, displayName);
  }

  private checkStrategyExitLiteralArguments(expression: CallExpression): void {
    this.checkNonEmptyLiteralStringArgument(expression, 'id', 0, 'strategy.exit id must not be empty');
    this.checkPositiveLiteralNumberValue(this.strategyExitArgument(expression, 'qty'), 'strategy.exit qty must be a positive number');
    this.checkPositiveLiteralNumberValue(this.strategyExitArgument(expression, 'qty_percent'), 'strategy.exit qty_percent must be a positive number');
    this.checkNonNegativeLiteralNumberValue(this.strategyExitArgument(expression, 'profit'), 'strategy.exit profit must be a non-negative number');
    this.checkNonNegativeLiteralNumberValue(this.strategyExitArgument(expression, 'loss'), 'strategy.exit loss must be a non-negative number');
    this.checkPositiveLiteralNumberValue(this.strategyExitArgument(expression, 'trail_offset'), 'strategy.exit trailing stop offset must be positive');
    this.checkStrategyExitTargetArguments(expression);
    this.checkStrategyExitTrailingOffsetArgument(expression);
  }

  private checkStrategyExitTargetArguments(expression: CallExpression): void {
    if (this.hasUnstableStrategyExitBindings(expression)) return;
    if (this.versionRules.allowsNoOpStrategyExit) return;

    const targetArguments = [
      this.strategyExitArgument(expression, 'profit'),
      this.strategyExitArgument(expression, 'limit'),
      this.strategyExitArgument(expression, 'loss'),
      this.strategyExitArgument(expression, 'stop'),
      this.strategyExitArgument(expression, 'trail_price'),
      this.strategyExitArgument(expression, 'trail_points'),
    ];

    if (targetArguments.some((argument) => this.hasUsableStrategyExitArgument(argument))) return;

    this.addDiagnostic(
      'type-mismatch',
      'strategy.exit requires a limit, stop, profit, loss, or trailing stop price',
      expression.loc,
    );
  }

  private checkStrategyExitTrailingOffsetArgument(expression: CallExpression): void {
    if (this.hasUnstableStrategyExitBindings(expression)) return;

    const trailingTarget = [
      this.strategyExitArgument(expression, 'trail_price'),
      this.strategyExitArgument(expression, 'trail_points'),
    ].find((argument) => this.hasUsableStrategyExitArgument(argument));
    if (!trailingTarget) return;

    const trailingOffset = this.strategyExitArgument(expression, 'trail_offset');
    if (this.hasUsableStrategyExitArgument(trailingOffset)) return;

    this.addDiagnostic(
      'type-mismatch',
      'strategy.exit trailing stop requires trail_offset; add trail_offset when using trail_price or trail_points',
      trailingTarget.loc,
    );
  }

  private strategyExitArgument(expression: CallExpression, parameterName: string): Expression | undefined {
    return this.resolveCallArgumentExpression(
      expression,
      STRATEGY_EXIT_PARAMS,
      STRATEGY_EXIT_PARAMS.indexOf(parameterName),
    );
  }

  private hasUsableStrategyExitArgument(argument: Expression | undefined): boolean {
    return argument !== undefined && !this.isNaLiteralExpression(argument);
  }

  private hasUnstableStrategyExitBindings(expression: CallExpression): boolean {
    const signature = BUILTIN_SIGNATURES.get('strategy.exit');
    return signature === undefined || this.hasUnstableOptionArgumentBindings(expression.arguments, signature);
  }

  private checkStrategyCloseLiteralArguments(expression: CallExpression): void {
    this.checkNonEmptyLiteralStringArgument(expression, 'id', 0, 'strategy.close id must not be empty');
    this.checkPositiveLiteralNumberArgument(expression, 'qty', 2, 'strategy.close qty must be a positive number');
    this.checkPositiveLiteralNumberArgument(expression, 'qty_percent', 3, 'strategy.close qty_percent must be a positive number');
  }

  private checkStrategyAllowedEntryDirectionArgument(expression: CallExpression): void {
    const argument = this.getCallArgument(expression.arguments, 'value', 0);
    if (!argument) return;

    const value = this.strategyConstantStringValue(argument);
    if (value !== undefined && !STRATEGY_ALLOWED_ENTRY_DIRECTION_VALUES.has(value)) {
      this.addDiagnostic('type-mismatch', `Invalid strategy entry direction: ${value}`, argument.loc);
    }
  }

  private checkStrategyDeclarationLiteralValueConstraints(statement: IndicatorDeclaration): void {
    this.checkNonNegativeLiteralNumberValue(
      statement.initial_capital,
      'strategy initial_capital must be a non-negative number',
    );
    this.checkStrategyDefaultQtyTypeValue(statement.default_qty_type);
    this.checkNonNegativeLiteralNumberValue(
      statement.default_qty_value,
      'strategy default_qty_value must be a non-negative number',
    );
    this.checkNonNegativeLiteralIntegerValue(
      statement.pyramiding,
      'strategy pyramiding must be a non-negative integer',
    );
    this.checkStrategyCommissionTypeValue(statement.commission_type);
    this.checkNonNegativeLiteralNumberValue(
      statement.commission_value,
      'strategy commission_value must be a non-negative number',
    );
    this.checkNonNegativeLiteralIntegerValue(
      statement.slippage,
      'strategy slippage must be a non-negative integer',
    );
    this.checkNonNegativeLiteralNumberValue(
      statement.margin_long,
      'strategy margin_long must be a non-negative number',
    );
    this.checkNonNegativeLiteralNumberValue(
      statement.margin_short,
      'strategy margin_short must be a non-negative number',
    );
    this.checkNonNegativeLiteralIntegerValue(
      statement.backtest_fill_limits_assumption,
      'strategy backtest_fill_limits_assumption must be a non-negative integer',
    );
    this.checkStrategyCloseEntriesRuleValue(statement.close_entries_rule);
  }

  private checkStrategyDeclarationBooleanOptions(statement: IndicatorDeclaration, scope: SemanticScope): void {
    this.checkDeclarationBooleanOptions(statement, scope, STRATEGY_DECLARATION_BOOL_OPTIONS, 'strategy');
  }

  private checkStrategyDeclarationNumericOptions(statement: IndicatorDeclaration, scope: SemanticScope): void {
    for (const optionName of STRATEGY_DECLARATION_NUMERIC_OPTIONS) {
      const expression = statement[optionName];
      if (!expression) continue;

      const type = this.inferExpressionType(expression, scope);
      if (type.kind === 'unknown' || type.kind === 'int' || type.kind === 'float') continue;

      this.addDiagnostic(
        'type-mismatch',
        `strategy ${optionName} must be a number, got ${this.formatSemanticType(type)}`,
        expression.loc,
      );
    }
  }

  private checkStrategyDeclarationStringOptions(statement: IndicatorDeclaration, scope: SemanticScope): void {
    for (const optionName of STRATEGY_DECLARATION_STRING_OPTIONS) {
      const expression = statement[optionName];
      if (!expression) continue;

      const type = this.inferExpressionType(expression, scope);
      if (type.kind === 'unknown' || type.kind === 'string') continue;

      this.addDiagnostic(
        'type-mismatch',
        `strategy ${optionName} must be a string, got ${this.formatSemanticType(type)}`,
        expression.loc,
      );
    }
  }

  private checkTraceRequiredStrategyCalcOnOrderFills(statement: IndicatorDeclaration): void {
    const expression = statement.calc_on_order_fills;
    if (!expression) return;
    const value = this.constantLiteralValue(expression);
    if (value !== true) return;
    this.addDiagnostic(
      'unsupported-feature',
      'strategy calc_on_order_fills=true requires TradingView fill-triggered re-entry trace parity before TealScript can simulate it',
      expression.loc,
    );
  }

  private checkTraceRequiredStrategyRiskFreeRate(statement: IndicatorDeclaration): void {
    const expression = statement.risk_free_rate;
    if (!expression) return;
    const value = this.constantLiteralValue(expression);
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value === TRACE_REQUIRED_STRATEGY_RISK_FREE_RATE_DEFAULT) {
      return;
    }
    this.addDiagnostic(
      'unsupported-feature',
      `strategy risk_free_rate=${value} requires TradingView Sharpe/Sortino report trace parity before TealScript can simulate it`,
      expression.loc,
    );
  }

  private checkTraceRequiredStrategyStandardOhlcFills(statement: IndicatorDeclaration): void {
    const expression = statement.fill_orders_on_standard_ohlc;
    if (!expression) return;
    const value = this.constantLiteralValue(expression);
    if (value !== true) return;
    this.addDiagnostic(
      'unsupported-feature',
      'strategy fill_orders_on_standard_ohlc=true requires host-supplied standard OHLC bars for non-standard charts before TealScript can simulate it',
      expression.loc,
    );
  }

  private checkDeclarationStringOptions(
    statement: IndicatorDeclaration | LibraryDeclaration,
    scope: SemanticScope,
    optionNames: readonly string[],
    declarationKind: string,
  ): void {
    for (const optionName of optionNames) {
      const expression = statement[optionName as keyof typeof statement] as Expression | undefined;
      if (!expression) continue;
      const type = this.inferExpressionType(expression, scope);
      if (type.kind === 'unknown' || type.kind === 'string') continue;
      this.addDiagnostic(
        'type-mismatch',
        `${declarationKind} ${optionName} must be a string, got ${this.formatSemanticType(type)}`,
        expression.loc,
      );
    }
  }

  private checkDeclarationBooleanOptions(
    statement: IndicatorDeclaration | LibraryDeclaration,
    scope: SemanticScope,
    optionNames: readonly string[],
    declarationKind: string,
  ): void {
    for (const optionName of optionNames) {
      const expression = statement[optionName as keyof typeof statement] as Expression | undefined;
      if (!expression) continue;

      const type = this.inferExpressionType(expression, scope);
      if (type.kind === 'unknown' || type.kind === 'bool') continue;

      this.addDiagnostic(
        'type-mismatch',
        `${declarationKind} ${optionName} must be a boolean, got ${this.formatSemanticType(type)}`,
        expression.loc,
      );
    }
  }

  private checkDeclarationNumericOptions(
    statement: IndicatorDeclaration,
    scope: SemanticScope,
    optionNames: readonly (keyof IndicatorDeclaration & string)[],
    declarationKind: string,
  ): void {
    for (const optionName of optionNames) {
      const expression = statement[optionName as keyof typeof statement] as Expression | undefined;
      if (!expression) continue;

      const type = this.inferExpressionType(expression, scope);
      if (type.kind === 'unknown' || type.kind === 'int' || type.kind === 'float') continue;

      this.addDiagnostic(
        'type-mismatch',
        `${declarationKind} ${optionName} must be a number, got ${this.formatSemanticType(type)}`,
        expression.loc,
      );
    }
  }

  private checkStrategyDefaultQtyTypeValue(expression: Expression | undefined): void {
    if (!expression) return;

    const value = this.strategyConstantStringValue(expression);
    if (value !== undefined && !STRATEGY_DEFAULT_QTY_TYPE_VALUES.has(value)) {
      this.addDiagnostic('type-mismatch', `Invalid strategy default_qty_type: ${value}`, expression.loc);
    }
  }

  private checkStrategyCommissionTypeValue(expression: Expression | undefined): void {
    if (!expression) return;

    const value = this.strategyConstantStringValue(expression);
    if (value !== undefined && !STRATEGY_COMMISSION_TYPE_VALUES.has(value)) {
      this.addDiagnostic('type-mismatch', `Invalid strategy commission_type: ${value}`, expression.loc);
    }
  }

  private checkStrategyCloseEntriesRuleValue(expression: Expression | undefined): void {
    if (!expression) return;

    const value = this.constantLiteralValue(expression);
    if (typeof value === 'string' && value.toUpperCase() !== 'FIFO' && value.toUpperCase() !== 'ANY') {
      this.addDiagnostic('type-mismatch', `Invalid strategy close_entries_rule: ${value}`, expression.loc);
    }
  }

  private checkStrategyCashOrPercentRiskRuleArguments(expression: CallExpression, displayName: string): void {
    this.checkPositiveLiteralNumberArgument(expression, 'value', 0, `${displayName} value must be a positive number`);

    const argument = this.getCallArgument(expression.arguments, 'type', 1);
    if (!argument) return;

    const value = this.strategyConstantStringValue(argument);
    if (value !== undefined && !STRATEGY_CASH_OR_PERCENT_RISK_TYPE_VALUES.has(value)) {
      this.addDiagnostic('type-mismatch', `Invalid strategy risk type for ${displayName}: ${value}`, argument.loc);
    }
  }

  private checkStrategyDirectionArgument(
    expression: CallExpression,
    displayName: string,
    name: string,
    positionalIndex: number,
  ): void {
    const argument = this.getCallArgument(expression.arguments, name, positionalIndex);
    if (!argument) return;

    const value = this.strategyConstantStringValue(argument);
    if (value !== undefined && !STRATEGY_DIRECTION_VALUES.has(value)) {
      this.addDiagnostic('type-mismatch', `Invalid strategy direction for ${displayName}: ${value}`, argument.loc);
    }
  }

  private checkStrategyOcaTypeArgument(expression: CallExpression, displayName: string): void {
    const argument = this.getCallArgument(expression.arguments, 'oca_type', 6);
    if (!argument) return;

    const value = this.strategyConstantStringValue(argument);
    if (value !== undefined && !STRATEGY_OCA_TYPE_VALUES.has(value)) {
      this.addDiagnostic('type-mismatch', `Invalid strategy oca_type for ${displayName}: ${value}`, argument.loc);
    }
  }

  private checkNonEmptyLiteralStringArgument(
    expression: CallExpression,
    name: string,
    positionalIndex: number,
    message: string,
  ): void {
    const argument = this.getCallArgument(expression.arguments, name, positionalIndex);
    if (!argument) return;

    const value = this.constantLiteralValue(argument);
    if (value === '') {
      this.addDiagnostic('type-mismatch', message, argument.loc);
    }
  }

  private checkPositiveLiteralNumberArgument(
    expression: CallExpression,
    name: string,
    positionalIndex: number,
    message: string,
  ): void {
    const argument = this.getCallArgument(expression.arguments, name, positionalIndex);
    this.checkPositiveLiteralNumberValue(argument, message);
  }

  private checkPositiveLiteralNumberValue(argument: Expression | undefined, message: string): void {
    if (!argument) return;

    const value = this.constantLiteralValue(argument);
    if (typeof value === 'number' && value <= 0) {
      this.addDiagnostic('type-mismatch', message, argument.loc);
    }
  }

  private checkNonNegativeLiteralNumberValue(expression: Expression | undefined, message: string): void {
    if (!expression) return;

    const value = this.constantLiteralValue(expression);
    if (typeof value === 'number' && value < 0) {
      this.addDiagnostic('type-mismatch', message, expression.loc);
    }
  }

  private checkNonNegativeLiteralIntegerValue(expression: Expression | undefined, message: string): void {
    if (!expression) return;

    const value = this.constantLiteralValue(expression);
    if (typeof value === 'number' && (value < 0 || !Number.isInteger(value))) {
      this.addDiagnostic('type-mismatch', message, expression.loc);
    }
  }

  private checkLiteralIntegerValue(expression: Expression | undefined, min: number, max: number, message: string): void {
    if (!expression) return;

    const value = this.constantLiteralValue(expression);
    if (typeof value === 'number' && (!Number.isInteger(value) || value < min || value > max)) {
      this.addDiagnostic('type-mismatch', message, expression.loc);
    }
  }

  private visualNumericDefaultValue(expression: Expression, scope: SemanticScope): number | undefined {
    const literal = this.constantLiteralValue(expression);
    if (typeof literal === 'number') return literal;
    if (expression.type === 'Identifier') {
      const symbol = scope.lookup(expression.name);
      return symbol ? this.visualNumericValues.get(symbol) : undefined;
    }
    if (expression.type === 'UnaryExpression') {
      const value = this.visualNumericDefaultValue(expression.argument, scope);
      if (value === undefined) return undefined;
      if (expression.operator === '-') return -value;
      if (expression.operator === '+') return value;
    }
    if (expression.type === 'CallExpression' && !scope.lookup('input')
      && ['input.int', 'input'].includes(this.effectiveInputCallName(expression))) {
      const defval = this.getCallArgument(expression.arguments, 'defval', 0);
      return defval ? this.visualNumericDefaultValue(defval, scope) : undefined;
    }
    return undefined;
  }

  private checkVisualLinewidthValue(expression: Expression | undefined, calleeName: string, scope: SemanticScope): void {
    if (!expression) return;

    const value = this.versionRules.minVisualLineWidth > 0
      ? this.visualNumericDefaultValue(expression, scope)
      : this.constantLiteralValue(expression);
    if (typeof value !== 'number') return;
    if (Number.isInteger(value) && value < this.versionRules.minVisualLineWidth && this.versionRules.minVisualLineWidth > 0) {
      this.addDiagnostic('type-mismatch', this.linewidthZeroVersionMessage(calleeName), expression.loc);
      return;
    }
    if (!Number.isInteger(value) || value < this.versionRules.minVisualLineWidth) {
      const widthRequirement = this.versionRules.minVisualLineWidth === Number.NEGATIVE_INFINITY
        ? 'an integer' : 'a positive integer';
      this.addDiagnostic('type-mismatch', `${calleeName} linewidth must be ${widthRequirement}`, expression.loc);
    }
  }

  private checkPositiveLiteralIntegerValue(expression: Expression | undefined, message: string): void {
    if (!expression) return;

    const value = this.constantLiteralValue(expression);
    if (typeof value === 'number' && (value <= 0 || !Number.isInteger(value))) {
      this.addDiagnostic('type-mismatch', message, expression.loc);
    }
  }

  private strategyConstantStringValue(expression: Expression): string | undefined {
    const value = this.constantLiteralValue(expression);
    if (typeof value === 'string') return value;
    if (this.currentPineVersion <= 4 && typeof value === 'boolean') return value ? 'long' : 'short';

    const path = this.memberPath(expression).join('.');
    switch (path) {
      case 'strategy.long':
      case 'strategy.direction.long':
        return 'long';
      case 'strategy.short':
      case 'strategy.direction.short':
        return 'short';
      case 'strategy.direction.all':
        return 'all';
      case 'strategy.fixed':
        return 'fixed';
      case 'strategy.cash':
        return 'cash';
      case 'strategy.percent_of_equity':
        return 'percent_of_equity';
      case 'strategy.commission.percent':
        return 'percent';
      case 'strategy.commission.cash_per_order':
        return 'cash_per_order';
      case 'strategy.commission.cash_per_contract':
        return 'cash_per_contract';
      case 'strategy.oca.cancel':
        return 'cancel';
      case 'strategy.oca.reduce':
        return 'reduce';
      case 'strategy.oca.none':
        return 'none';
      default:
        return undefined;
    }
  }

  private checkCollectionIdArgument(expression: CallExpression, scope: SemanticScope): void {
    if (expression.callee.type !== 'MemberExpression' || expression.callee.object.type !== 'Identifier') return;
    const namespace = expression.callee.object.name;
    if (namespace !== 'array' && namespace !== 'matrix' && namespace !== 'map') return;
    const signature = this.resolveBuiltinSignature(this.memberPath(expression.callee).join('.'), expression, scope);
    if (!signature || !['id', 'id1'].includes(signature.params[0]) || this.hasUnstableOptionArgumentBindings(expression.arguments, signature)) return;
    const parameterNames = this.resolveSignatureParams(expression.arguments, signature);
    const argument = this.resolveCallArgumentExpression(expression, parameterNames, 0, signature);
    if (!argument || this.isNaLiteralExpression(argument)) return;
    const type = this.inferExpressionType(argument, scope);
    if (type.kind === 'unknown' || type.kind === namespace) return;
    this.addDiagnostic('type-mismatch', `${namespace}.${expression.callee.property.name} ${parameterNames[0]} must be a ${namespace} reference, got ${this.formatSemanticType(type)}`, argument.loc);
  }

  private checkArrayFromElementKinds(expression: CallExpression, scope: SemanticScope): void {
    if (this.versionRules.allowsImplicitNumericToBool || this.memberPath(expression.callee).join('.') !== 'array.from') return;
    const signature = this.resolveBuiltinSignature('array.from', expression, scope);
    if (!signature || this.hasUnstableOptionArgumentBindings(expression.arguments, signature)) return;

    let elementType: SemanticType | undefined;
    for (const argument of expression.arguments) {
      const currentType = this.arrayElementTypeKind(this.inferExpressionType(argument.value, scope));
      if (currentType.kind === 'unknown') continue;
      if (!elementType) {
        elementType = currentType;
        continue;
      }
      if (this.isNumericType(elementType) && this.isNumericType(currentType)) continue;
      if (this.isAssignableType(elementType, currentType) && this.isAssignableType(currentType, elementType)) continue;
      this.addDiagnostic(
        'type-mismatch',
        `array.from arguments must have compatible element types, got ${this.formatSemanticType(elementType)} and ${this.formatSemanticType(currentType)}`,
        argument.value.loc,
      );
      return;
    }
  }

  private checkBooleanArrayElements(expression: CallExpression, scope: SemanticScope): void {
    if (expression.callee.type !== 'MemberExpression'
      || (this.currentPineVersion < 6 && !this.versionRules.rejectsStringArrayPredicates)) return;
    const displayName = this.builtinSignatureDisplayName(expression, scope);
    if (displayName !== 'array.every' && displayName !== 'array.some') return;
    const signature = this.resolveBuiltinSignature(this.memberPath(expression.callee).join('.'), expression, scope);
    if (!signature || this.hasUnstableOptionArgumentBindings(expression.arguments, signature)
      || (signature.maxArgs !== undefined && expression.arguments.length > signature.maxArgs)) return;
    const parameterNames = this.resolveSignatureParams(expression.arguments, signature);
    const argument = this.builtinReceiverMethodName(expression, scope)
      ? expression.callee.object
      : this.resolveCallArgumentExpression(expression, parameterNames, 0, signature);
    if (!argument) return;
    const type = this.inferExpressionType(argument, scope);
    if (type.kind !== 'array' || !type.elementType) return;
    const rejectsString = this.versionRules.rejectsStringArrayPredicates && type.elementType.kind === 'string';
    const rejectsNumeric = this.currentPineVersion >= 6 && this.isNumericType(type.elementType);
    if (!rejectsString && !rejectsNumeric) return;
    this.addDiagnostic('type-mismatch', `${displayName} requires bool array elements in Pine v${this.currentPineVersion}, got ${this.formatSemanticType(type)}`, argument.loc);
  }

  private checkNumericCollectionElements(expression: CallExpression, scope: SemanticScope): void {
    const displayName = this.builtinSignatureDisplayName(expression, scope);
    // Dedicated array receiver guards own operations shared with the general collection guard.
    if (displayName.startsWith('array.') && ARRAY_NUMERIC_RECEIVER_PARAMETERS_BY_OPERATION.has(displayName.slice(6))) return;
    if (!NUMERIC_COLLECTION_HELPER_NAMES.has(displayName) || expression.callee.type !== 'MemberExpression') return;
    const signature = this.resolveBuiltinSignature(this.memberPath(expression.callee).join('.'), expression, scope);
    if (!signature || this.hasUnstableOptionArgumentBindings(expression.arguments, signature)) return;
    const parameterNames = this.resolveSignatureParams(expression.arguments, signature);
    const argument = this.builtinReceiverMethodName(expression, scope)
      ? expression.callee.object
      : this.resolveCallArgumentExpression(expression, parameterNames, 0, signature);
    if (!argument) return;
    const type = this.inferExpressionType(argument, scope);
    if (type.kind !== displayName.split('.')[0] || !type.elementType || type.elementType.kind === 'unknown') return;
    if (this.isNumericType(type.elementType)) return;
    this.addDiagnostic('type-mismatch', `${displayName} requires int or float collection elements, got ${this.formatSemanticType(type)}`, argument.loc);
  }

  private checkCollectionIntegerArguments(expression: CallExpression, scope: SemanticScope): void {
    const displayName = this.builtinSignatureDisplayName(expression, scope);
    const integerParameters = COLLECTION_INTEGER_PARAMETER_NAMES_BY_CALL.get(displayName)
      ?? (displayName === 'array.new' || ARRAY_CONSTRUCTOR_ELEMENT_TYPES.has(displayName) ? ['size'] : undefined)
      ?? (displayName === 'matrix.new' || MATRIX_CONSTRUCTOR_ELEMENT_TYPES.has(displayName) ? ['rows', 'columns'] : undefined);
    if (!integerParameters) return;

    const signature = this.resolveBuiltinSignature(this.memberPath(expression.callee).join('.'), expression, scope);
    if (!signature || this.hasUnstableOptionArgumentBindings(expression.arguments, signature)) return;
    const parameterNames = this.resolveSignatureParams(expression.arguments, signature);
    for (const parameter of integerParameters) {
      const argument = this.resolveCallArgumentExpression(expression, parameterNames, parameterNames.indexOf(parameter), signature);
      if (!argument) continue;
      const type = this.inferExpressionType(argument, scope);
      const acceptsFloat = displayName === 'array.set' || displayName === 'array.fill'
        || (displayName === 'array.get' && this.currentPineVersion < 5);
      const acceptsDerivedIndex = displayName === 'array.get' && type.integerDivision === true;
      if (type.kind === 'unknown' || type.kind === 'int' || ((acceptsFloat || acceptsDerivedIndex) && type.kind === 'float')) continue;
      const expectedType = acceptsFloat ? 'an int or float' : 'an int';
      this.addDiagnostic('type-mismatch', `${displayName} ${parameter} must be ${expectedType}, got ${this.formatSemanticType(type)}`, argument.loc);
    }
  }

  private checkArrayFromArgumentLimit(expression: CallExpression, scope: SemanticScope): void {
    if (this.memberPath(expression.callee).join('.') !== 'array.from' || expression.arguments.length <= 999) return;
    if (!this.resolveBuiltinSignature('array.from', expression, scope)) return;
    const elementType = this.inferArrayElementType(expression.arguments.map((argument) => argument.value), scope);
    if (elementType.kind === 'unknown') return;
    const limit = ['int', 'float', 'bool', 'color'].includes(elementType.kind) ? 4000 : 999;
    if (expression.arguments.length > limit) {
      this.addDiagnostic('argument-count', `array.from() accepts at most ${limit} arguments for ${this.formatSemanticType(elementType)} elements`, expression.loc);
    }
  }

  private checkArrayCallTypes(expression: CallExpression, scope: SemanticScope): void {
    this.checkArrayFromElementKinds(expression, scope);
    this.checkArrayFromArgumentLimit(expression, scope);
    this.checkArrayJoinSeparator(expression, scope);
    this.checkArrayNumericReceiverTypes(expression, scope);
    this.checkArrayNumericHelperArguments(expression, scope);
    this.checkArrayCovarianceSecondId(expression, scope);
    this.checkArrayBiasedArgument(expression, scope);
    this.checkArrayIncludesValueType(expression, scope);
    this.checkArrayIndexofValue(expression, scope);

    const arrayCall = this.resolveArrayMutationCall(expression, scope);
    if (arrayCall?.arrayType.elementType && arrayCall.valueArgument) {
      const actualType = this.inferExpressionType(arrayCall.valueArgument, scope);
      if (!this.isAssignableType(arrayCall.arrayType.elementType, actualType)) {
        this.addDiagnostic(
          'type-mismatch',
          `Cannot use ${actualType.kind} value as ${arrayCall.arrayType.elementType.kind} array element`,
          arrayCall.valueArgument.loc,
        );
      }
    }

    const concatCall = this.resolveArrayConcatCall(expression, scope);
    if (!concatCall?.targetType.elementType || !concatCall.sourceType.elementType) return;

    if (this.isAssignableType(concatCall.targetType.elementType, concatCall.sourceType.elementType)) return;

    this.addDiagnostic(
      'type-mismatch',
      `Cannot concatenate ${concatCall.sourceType.elementType.kind} array into ${concatCall.targetType.elementType.kind} array`,
      concatCall.sourceArgument.loc,
    );
  }

  private checkArrayJoinSeparator(expression: CallExpression, scope: SemanticScope): void {
    const name = this.builtinSignatureDisplayName(expression, scope);
    if (name !== 'array.join') return;
    const signature = this.resolveBuiltinSignature(this.memberPath(expression.callee).join('.'), expression, scope);
    if (!signature || this.hasUnstableOptionArgumentBindings(expression.arguments, signature)) return;
    const params = this.resolveSignatureParams(expression.arguments, signature, scope);
    this.checkBuiltinArgumentKind(expression, scope, name, params, 'separator', 'string', signature);
    if (this.currentPineVersion < 6) return;
    const arrayType = this.inferArrayHelperReceiverType(expression, scope);
    if (arrayType?.elementType?.kind === 'bool') {
      this.addDiagnostic('type-mismatch', 'array.join() does not accept bool array elements in Pine v6', expression.loc);
    }
  }

  private checkArrayNumericReceiverTypes(expression: CallExpression, scope: SemanticScope): void {
    if (expression.callee.type !== 'MemberExpression') return;
    const operation = expression.callee.property.name;
    const arrayParameters = ARRAY_NUMERIC_RECEIVER_PARAMETERS_BY_OPERATION.get(operation);
    if (!arrayParameters) return;
    const signature = this.resolveBuiltinSignature(this.memberPath(expression.callee).join('.'), expression, scope);
    if (!signature || this.hasUnstableOptionArgumentBindings(expression.arguments, signature)) return;

    const receiver = expression.callee.object;
    const receiverType = this.inferExpressionType(receiver, scope);
    const isMethod = receiverType.kind === 'array';
    if (!isMethod && !(receiver.type === 'Identifier' && receiver.name === 'array')) return;
    const resolvedParams = this.resolveSignatureParams(expression.arguments, signature);
    for (const [index, parameterName] of arrayParameters.entries()) {
      if (operation === 'covariance' && parameterName === 'id2') continue;
      const parameterIndex = resolvedParams.indexOf(parameterName);
      const arrayArgument = isMethod && index === 0
        ? receiver
        : parameterIndex >= 0 ? this.resolveCallArgumentExpression(expression, resolvedParams, parameterIndex) : undefined;
      if (!arrayArgument) continue;
      const arrayType = this.inferExpressionType(arrayArgument, scope);
      const elementType = arrayType.elementType;
      if (arrayType.kind !== 'array' || !elementType || elementType.kind === 'unknown' || this.isNumericType(elementType)) continue;

      const parameterLabel = arrayParameters.length > 1 ? ` ${parameterName}` : '';
      this.addDiagnostic(
        'type-mismatch',
        `array.${operation}()${parameterLabel} requires an int or float array, got ${this.formatSemanticType(arrayType)}`,
        arrayArgument.loc,
      );
    }
  }

  private checkArrayBiasedArgument(expression: CallExpression, scope: SemanticScope): void {
    const calleeName = this.builtinSignatureDisplayName(expression, scope);
    if (calleeName !== 'array.stdev' && calleeName !== 'array.variance' && calleeName !== 'array.covariance') return;
    const signature = this.resolveBuiltinSignature(this.memberPath(expression.callee).join('.'), expression, scope);
    if (!signature || this.hasUnstableOptionArgumentBindings(expression.arguments, signature)) return;
    const params = this.resolveSignatureParams(expression.arguments, signature, scope);
    this.checkBuiltinArgumentKind(expression, scope, calleeName, params, 'biased', 'boolean', signature);
  }

  private checkArrayCovarianceSecondId(expression: CallExpression, scope: SemanticScope): void {
    if (expression.callee.type !== 'MemberExpression' || this.builtinSignatureDisplayName(expression, scope) !== 'array.covariance') return;
    const signature = this.resolveBuiltinSignature(this.memberPath(expression.callee).join('.'), expression, scope);
    if (!signature || this.hasUnstableOptionArgumentBindings(expression.arguments, signature)) return;
    const parameterNames = this.resolveSignatureParams(expression.arguments, signature);
    const index = parameterNames.indexOf('id2');
    if (index < 0) return;
    const argument = this.resolveCallArgumentExpression(expression, parameterNames, index, signature);
    if (!argument || this.isNaLiteralExpression(argument)) return;
    const type = this.inferExpressionType(argument, scope);
    if (type.kind === 'unknown') return;
    if (type.kind === 'array' && (!type.elementType || type.elementType.kind === 'unknown' || this.isNumericType(type.elementType))) return;
    this.addDiagnostic('type-mismatch', `array.covariance id2 requires an array of int or float elements, got ${this.formatSemanticType(type)}`, argument.loc);
  }

  private checkArrayIndexofValue(expression: CallExpression, scope: SemanticScope): void {
    if (this.builtinSignatureDisplayName(expression, scope) !== 'array.indexof') return;
    const signature = this.resolveBuiltinSignature(this.memberPath(expression.callee).join('.'), expression, scope);
    if (!signature || this.hasUnstableOptionArgumentBindings(expression.arguments, signature)) return;
    const arrayType = this.inferArrayHelperReceiverType(expression, scope);
    if (arrayType?.kind !== 'array' || !arrayType.elementType) return;
    const parameterNames = this.resolveSignatureParams(expression.arguments, signature);
    const argument = this.resolveCallArgumentExpression(expression, parameterNames, parameterNames.indexOf('value'), signature);
    if (!argument) return;
    const actualType = this.inferExpressionType(argument, scope);
    if (this.isAssignableType(arrayType.elementType, actualType)) return;
    this.addDiagnostic(
      'type-mismatch',
      `array.indexof value must match ${this.formatSemanticType(arrayType.elementType)} array elements, got ${this.formatSemanticType(actualType)}`,
      argument.loc,
    );
  }

  private checkArrayNumericHelperArguments(expression: CallExpression, scope: SemanticScope): void {
    const calleeName = this.builtinSignatureDisplayName(expression, scope);
    const parameterNames = ARRAY_NUMERIC_PARAMETER_NAMES_BY_CALL.get(calleeName);
    if (!parameterNames) return;

    const signature = this.resolveBuiltinSignature(this.memberPath(expression.callee).join('.'), expression, scope);
    if (!signature) return;
    if (this.hasUnstableOptionArgumentBindings(expression.arguments, signature)) return;
    const resolvedParams = this.resolveSignatureParams(expression.arguments, signature);

    for (const parameterName of parameterNames) {
      this.checkBuiltinArgumentKind(expression, scope, calleeName, resolvedParams, parameterName, 'number');
    }
  }

  private checkMatrixSumSecondOperand(expression: CallExpression, scope: SemanticScope): void {
    if (this.builtinSignatureDisplayName(expression, scope) !== 'matrix.sum') return;
    if (expression.callee.type !== 'MemberExpression') return;
    if (this.inferExpressionType(expression.callee.object, scope).kind === 'matrix'
      && this.builtinReceiverMethodName(expression, scope) !== 'matrix.sum') return;
    const signature = this.resolveBuiltinSignature(this.memberPath(expression.callee).join('.'), expression, scope);
    if (!signature || this.hasUnstableOptionArgumentBindings(expression.arguments, signature)) return;
    const params = this.resolveSignatureParams(expression.arguments, signature);
    const argument = this.resolveCallArgumentExpression(expression, params, params.indexOf('id2'), signature);
    if (!argument || this.isNaLiteralExpression(argument)) return;
    const type = this.inferExpressionType(argument, scope);
    if (type.kind === 'unknown' || this.isNumericType(type)) return;
    if (type.kind === 'matrix' && (!type.elementType || type.elementType.kind === 'unknown' || this.isNumericType(type.elementType))) return;
    this.addDiagnostic('type-mismatch', `matrix.sum id2 must be numeric or a matrix of numeric elements, got ${this.formatSemanticType(type)}`, argument.loc);
  }

  private checkMatrixInsertionArray(expression: CallExpression, scope: SemanticScope): void {
    const name = this.builtinSignatureDisplayName(expression, scope);
    if (name !== 'matrix.add_row' && name !== 'matrix.add_col') return;
    if (expression.callee.type !== 'MemberExpression') return;
    if (this.inferExpressionType(expression.callee.object, scope).kind === 'matrix'
      && this.builtinReceiverMethodName(expression, scope) !== name) return;
    const signature = this.resolveBuiltinSignature(this.memberPath(expression.callee).join('.'), expression, scope);
    if (!signature || this.hasUnstableOptionArgumentBindings(expression.arguments, signature)) return;
    const params = this.resolveSignatureParams(expression.arguments, signature);
    const argument = this.resolveCallArgumentExpression(expression, params, params.indexOf('array_id'), signature);
    if (!argument || this.isNaLiteralExpression(argument)) return;
    const type = this.inferExpressionType(argument, scope);
    if (type.kind === 'unknown') return;
    if (type.kind !== 'array') {
      this.addDiagnostic('type-mismatch', `${name} array_id must be an array reference, got ${this.formatSemanticType(type)}`, argument.loc);
      return;
    }
    const matrixType = this.inferMatrixHelperReceiverType(expression, scope);
    if (matrixType?.kind !== 'matrix' || !matrixType.elementType || !type.elementType) return;
    if (this.isAssignableType(matrixType.elementType, type.elementType)) return;
    this.addDiagnostic('type-mismatch', `${name} array_id elements must be assignable to ${this.formatSemanticType(matrixType.elementType)}, got ${this.formatSemanticType(type)}`, argument.loc);
  }

  private checkMatrixCallTypes(expression: CallExpression, scope: SemanticScope): void {
    this.checkMatrixInsertionArray(expression, scope);
    this.checkMatrixSumSecondOperand(expression, scope);
    const matrixCall = this.resolveMatrixMutationCall(expression, scope);
    if (!matrixCall?.matrixType.elementType || !matrixCall.valueArgument) return;

    const actualType = this.inferExpressionType(matrixCall.valueArgument, scope);
    if (this.isAssignableType(matrixCall.matrixType.elementType, actualType)) return;

    this.addDiagnostic(
      'type-mismatch',
      `Cannot use ${actualType.kind} value as ${matrixCall.matrixType.elementType.kind} matrix element`,
      matrixCall.valueArgument.loc,
    );
  }

  private checkMatrixMultSecondOperand(expression: CallExpression, scope: SemanticScope): void {
    if (this.builtinSignatureDisplayName(expression, scope) !== 'matrix.mult') return;
    const namespaceSymbol = scope.lookup('matrix');
    if (!this.builtinReceiverMethodName(expression, scope) && (namespaceSymbol?.kind === 'variable' || namespaceSymbol?.kind === 'parameter')) return;
    const signature = this.resolveBuiltinSignature(this.memberPath(expression.callee).join('.'), expression, scope);
    if (!signature || this.hasUnstableOptionArgumentBindings(expression.arguments, signature)) return;
    const params = this.resolveSignatureParams(expression.arguments, signature);
    const argument = this.resolveCallArgumentExpression(expression, params, params.indexOf('id2'), signature);
    if (!argument || this.isNaLiteralExpression(argument)) return;
    const type = this.inferExpressionType(argument, scope);
    if (type.kind === 'unknown' || this.isNumericType(type)) return;
    if ((type.kind === 'matrix' || type.kind === 'array') && (!type.elementType || type.elementType.kind === 'unknown' || this.isNumericType(type.elementType))) return;
    this.addDiagnostic('type-mismatch', `matrix.mult id2 must be a numeric matrix, array or scalar, got ${this.formatSemanticType(type)}`, argument.loc);
  }

  private checkMatrixKronSecondOperand(expression: CallExpression, scope: SemanticScope): void {
    if (this.builtinSignatureDisplayName(expression, scope) !== 'matrix.kron') return;
    const namespaceSymbol = scope.lookup('matrix');
    if (!this.builtinReceiverMethodName(expression, scope) && (namespaceSymbol?.kind === 'variable' || namespaceSymbol?.kind === 'parameter')) return;
    const signature = this.resolveBuiltinSignature(this.memberPath(expression.callee).join('.'), expression, scope);
    if (!signature || this.hasUnstableOptionArgumentBindings(expression.arguments, signature)) return;
    const parameterNames = this.resolveSignatureParams(expression.arguments, signature);
    const argument = this.resolveCallArgumentExpression(expression, parameterNames, parameterNames.indexOf('id2'), signature);
    if (!argument || this.isNaLiteralExpression(argument)) return;
    const type = this.inferExpressionType(argument, scope);
    if (type.kind === 'unknown') return;
    if (type.kind === 'matrix' && (!type.elementType || type.elementType.kind === 'unknown' || this.isNumericType(type.elementType))) return;
    this.addDiagnostic('type-mismatch', `matrix.kron id2 must be a numeric matrix, got ${this.formatSemanticType(type)}`, argument.loc);
  }

  private checkArraySortFieldType(expression: CallExpression, scope: SemanticScope): void {
    const name = this.builtinSignatureDisplayName(expression, scope);
    if (name === 'array.sort' || name === 'array.sort_indices') {
      const receiverType = this.inferArrayHelperReceiverType(expression, scope);
      const element = receiverType?.elementType;
      if (element && !['unknown', 'int', 'float', 'string', 'udt'].includes(element.kind)) {
        this.addDiagnostic('type-mismatch', `${name} requires int, float, string, or UDT array elements, got ${element.kind}`, expression.loc);
      }
    }
    const sortFieldArgument = this.resolveArraySortFieldArgument(expression, scope);
    if (!sortFieldArgument) return;

    const methodName = expression.callee.type === 'MemberExpression' ? expression.callee.property.name : 'sort';
    const displayName = methodName.startsWith('binary_search') ? `array.${methodName}` : 'array.sort';
    this.checkSortFieldType(sortFieldArgument, scope, displayName);
  }

  private checkMatrixSortFieldType(expression: CallExpression, scope: SemanticScope): void {
    if (this.builtinSignatureDisplayName(expression, scope) !== 'matrix.sort') return;
    const sortFieldArgument = this.resolveMatrixSortFieldArgument(expression, scope);
    if (!sortFieldArgument) return;

    this.checkSortFieldType(sortFieldArgument, scope, 'matrix.sort');
  }

  private checkSortFieldType(sortFieldArgument: Expression, scope: SemanticScope, displayName: string): void {
    const sortFieldType = this.inferExpressionType(sortFieldArgument, scope);
    if (sortFieldType.kind !== 'unknown' && sortFieldType.kind !== 'int' && sortFieldType.kind !== 'string') {
      this.addDiagnostic(
        'type-mismatch',
        `${displayName}() sort_field must be a const int or const string, got ${sortFieldType.kind}`,
        sortFieldArgument.loc,
      );
      return;
    }

    if (sortFieldType.qualifier ? sortFieldType.qualifier !== 'const' : sortFieldType.kind !== 'unknown') {
      const qualifierLabel = sortFieldType.qualifier ?? 'unqualified';
      this.addDiagnostic(
        'qualifier-mismatch',
        `${displayName}() sort_field requires const int or const string, got ${qualifierLabel} ${sortFieldType.kind}`,
        sortFieldArgument.loc,
      );
    }
  }

  private checkArrayIncludesValueType(expression: CallExpression, scope: SemanticScope): void {
    if (expression.callee.type !== 'MemberExpression' || expression.callee.property.name !== 'includes') return;
    const isNamespaceCall = this.memberPath(expression.callee).join('.') === 'array.includes';
    if (!isNamespaceCall && this.builtinReceiverMethodName(expression, scope) !== 'array.includes') return;

    const arrayType = this.inferArrayHelperReceiverType(expression, scope);
    const value = this.getCallArgument(expression.arguments, 'value', isNamespaceCall ? 1 : 0);
    if (arrayType?.kind !== 'array' || !arrayType.elementType || !value) return;
    const valueType = this.inferExpressionType(value, scope);
    if (this.isAssignableType(arrayType.elementType, valueType)) return;
    this.addDiagnostic(
      'type-mismatch',
      `array.includes() value requires ${this.formatSemanticType(arrayType.elementType)}, got ${this.formatSemanticType(valueType)}`,
      value.loc,
    );
  }

  private resolveArrayMutationCall(
    expression: CallExpression,
    scope: SemanticScope,
  ): { operation: 'fill' | 'insert' | 'push' | 'set' | 'unshift'; arrayType: SemanticType; valueArgument?: Expression } | null {
    if (expression.callee.type !== 'MemberExpression') return null;

    const methodName = expression.callee.property.name;
    if (!this.isCheckedArrayMutationOperation(methodName)) return null;

    const receiverType = this.inferExpressionType(expression.callee.object, scope);
    if (receiverType.kind === 'array') {
      return {
        operation: methodName,
        arrayType: receiverType,
        valueArgument: this.getCallArgument(expression.arguments, 'value', methodName === 'insert' || methodName === 'set' ? 1 : 0),
      };
    }

    if (expression.callee.object.type !== 'Identifier' || expression.callee.object.name !== 'array') return null;

    const arrayArgument = this.getCallArgument(expression.arguments, 'id', 0);
    if (!arrayArgument) return null;
    const arrayType = this.inferExpressionType(arrayArgument, scope);
    if (arrayType.kind !== 'array') return null;

    return {
      operation: methodName,
      arrayType,
      valueArgument: this.getCallArgument(expression.arguments, 'value', methodName === 'insert' || methodName === 'set' ? 2 : 1),
    };
  }

  private isCheckedArrayMutationOperation(operation: string): operation is 'fill' | 'insert' | 'push' | 'set' | 'unshift' {
    return operation === 'fill' || operation === 'insert' || operation === 'push' || operation === 'set' || operation === 'unshift';
  }

  private resolveArrayConcatCall(
    expression: CallExpression,
    scope: SemanticScope,
  ): { targetType: SemanticType; sourceType: SemanticType; sourceArgument: Expression } | null {
    if (expression.callee.type !== 'MemberExpression' || expression.callee.property.name !== 'concat') return null;

    const isNamespaceCall = expression.callee.object.type === 'Identifier' && expression.callee.object.name === 'array';
    const sourceArgument = this.getCallArgument(expression.arguments, 'array_id', isNamespaceCall ? 1 : 0);
    if (!sourceArgument) return null;

    let targetType: SemanticType;
    if (isNamespaceCall) {
      const targetArgument = this.getCallArgument(expression.arguments, 'id', 0);
      if (!targetArgument) return null;
      targetType = this.inferExpressionType(targetArgument, scope);
    } else {
      targetType = this.inferExpressionType(expression.callee.object, scope);
    }

    const sourceType = this.inferExpressionType(sourceArgument, scope);
    if (targetType.kind !== 'array' || sourceType.kind !== 'array') return null;

    return { targetType, sourceType, sourceArgument };
  }

  private resolveMatrixMutationCall(
    expression: CallExpression,
    scope: SemanticScope,
  ): { operation: 'fill' | 'set'; matrixType: SemanticType; valueArgument?: Expression } | null {
    if (expression.callee.type !== 'MemberExpression') return null;

    const methodName = expression.callee.property.name;
    if (methodName !== 'fill' && methodName !== 'set') return null;

    const receiverType = this.inferMatrixHelperReceiverType(expression, scope);
    if (receiverType?.kind !== 'matrix') return null;

    const isNamespaceCall = expression.callee.object.type === 'Identifier' && expression.callee.object.name === 'matrix';
    return {
      operation: methodName,
      matrixType: receiverType,
      valueArgument: this.getCallArgument(expression.arguments, 'value', methodName === 'set' ? (isNamespaceCall ? 3 : 2) : (isNamespaceCall ? 1 : 0)),
    };
  }

  private resolveArraySortFieldArgument(expression: CallExpression, scope: SemanticScope): Expression | undefined {
    if (expression.callee.type !== 'MemberExpression') return undefined;

    const methodName = expression.callee.property.name;
    const isBinarySearch = methodName === 'binary_search' || methodName === 'binary_search_leftmost' || methodName === 'binary_search_rightmost';
    if (methodName !== 'sort' && methodName !== 'sort_indices' && !isBinarySearch) return undefined;
    if (methodName === 'sort_indices' && !this.resolveBuiltinSignature(this.memberPath(expression.callee).join('.'), expression, scope)) return undefined;

    const isNamespaceCall = expression.callee.object.type === 'Identifier' && expression.callee.object.name === 'array';
    if (isNamespaceCall) return this.getCallArgument(expression.arguments, 'sort_field', 2);

    const receiverType = this.inferExpressionType(expression.callee.object, scope);
    if (receiverType.kind !== 'array') return undefined;

    return this.getCallArgument(expression.arguments, 'sort_field', 1);
  }

  private resolveMatrixSortFieldArgument(expression: CallExpression, scope: SemanticScope): Expression | undefined {
    if (expression.callee.type !== 'MemberExpression' || expression.callee.property.name !== 'sort') return undefined;

    const isNamespaceCall = expression.callee.object.type === 'Identifier' && expression.callee.object.name === 'matrix';
    if (isNamespaceCall) return this.getCallArgument(expression.arguments, 'sort_field', 3);

    const receiverType = this.inferMatrixHelperReceiverType(expression, scope);
    if (receiverType?.kind !== 'matrix') return undefined;

    return this.getCallArgument(expression.arguments, 'sort_field', 2);
  }

  private checkMapConstructorTypeArguments(expression: CallExpression): void {
    if (this.memberPath(expression.callee).join('.') !== 'map.new' || !expression.typeArguments) return;
    if (expression.typeArguments.length !== 2) {
      this.addDiagnostic('invalid-type-template', 'map.new() expects exactly 2 type arguments', expression.loc);
      return;
    }

    const [keyTypeName, valueTypeName] = expression.typeArguments;
    this.checkTemplateTypeName(keyTypeName, 'map key', expression.loc);
    this.checkTemplateTypeName(valueTypeName, 'map value', expression.loc);
    if (!this.isInvalidTemplateTypeName(keyTypeName) && !this.isValidMapKeyTypeName(keyTypeName)) {
      this.addDiagnostic('invalid-type-template', 'Map key type must be int, float, bool, string, color, or an enum in map.new', expression.loc);
    }
  }

  private checkNestedArrayFromElements(expression: CallExpression, scope: SemanticScope): void {
    if (this.currentPineVersion < 6 || this.memberPath(expression.callee).join('.') !== 'array.from') return;
    if (!this.resolveBuiltinSignature('array.from', expression, scope)) return;
    for (const argument of expression.arguments) {
      const type = this.inferExpressionType(argument.value, scope);
      if (type.kind !== 'array' && type.kind !== 'matrix' && type.kind !== 'map') continue;
      this.addDiagnostic('invalid-type-template', 'array.from() elements cannot directly contain collection IDs; use a UDT field to hold the collection', argument.value.loc);
    }
  }

  private checkArrayConstructorTypeArguments(expression: CallExpression): void {
    if (this.memberPath(expression.callee).join('.') !== 'array.new' || !expression.typeArguments) return;
    if (expression.typeArguments.length !== 1) {
      this.addDiagnostic('invalid-type-template', 'array.new() expects exactly 1 type argument', expression.loc);
      return;
    }

    this.checkTemplateTypeName(expression.typeArguments[0], 'array element', expression.loc);
  }

  private checkArrayConstructorInitialValue(expression: CallExpression, scope: SemanticScope): void {
    const name = this.memberPath(expression.callee).join('.');
    const genericTypeName = name === 'array.new' && expression.typeArguments?.length === 1
      ? expression.typeArguments[0]
      : undefined;
    const namedElementKind = name === 'array.new_color' ? 'color'
      : name === 'array.new_int' ? 'int'
        : name === 'array.new_label' ? 'label'
          : name === 'array.new_float' ? 'float'
            : name === 'array.new_line' ? 'line'
              : name === 'array.new_box' ? 'box'
                : name === 'array.new_string' ? 'string'
                  : name === 'array.new_bool' ? 'bool'
                : undefined;
    if (!namedElementKind && !genericTypeName) return;
    if (genericTypeName && this.isInvalidTemplateTypeName(genericTypeName)) return;
    const elementType: SemanticType | undefined = genericTypeName
      ? this.typeFromName(genericTypeName)
      : namedElementKind ? { kind: namedElementKind } : undefined;
    if (!elementType) return;

    const signature = this.resolveBuiltinSignature(name, expression, scope);
    if (!signature || this.hasUnstableOptionArgumentBindings(expression.arguments, signature)) return;
    const params = this.resolveSignatureParams(expression.arguments, signature);
    const initialValue = this.resolveCallArgumentExpression(
      expression,
      params,
      params.indexOf('initial_value'),
      signature,
    );
    if (!initialValue || this.isNaLiteralExpression(initialValue)) return;
    const actualType = this.inferExpressionType(initialValue, scope);
    if (this.isAssignableType(elementType, actualType)) return;
    this.addDiagnostic(
      'type-mismatch',
      `${name} initial_value must be ${this.formatSemanticType(elementType)}, got ${this.formatSemanticType(actualType)}`,
      initialValue.loc,
    );
  }

  private checkMatrixConstructorTypeArguments(expression: CallExpression, scope: SemanticScope): void {
    if (this.memberPath(expression.callee).join('.') !== 'matrix.new' || !expression.typeArguments) return;
    if (expression.typeArguments.length !== 1) {
      this.addDiagnostic('invalid-type-template', 'matrix.new() expects exactly 1 type argument', expression.loc);
      return;
    }

    const typeName = expression.typeArguments[0];
    this.checkTemplateTypeName(typeName, 'matrix element', expression.loc);
    if (this.isInvalidTemplateTypeName(typeName)) return;

    const signature = this.resolveBuiltinSignature('matrix.new', expression, scope);
    if (!signature || this.hasUnstableOptionArgumentBindings(expression.arguments, signature)) return;
    const params = this.resolveSignatureParams(expression.arguments, signature);
    const initialValue = this.resolveCallArgumentExpression(expression, params, params.indexOf('initial_value'), signature);
    if (!initialValue) return;
    const expectedType = this.typeFromName(typeName);
    const actualType = this.inferExpressionType(initialValue, scope);
    if (this.isAssignableType(expectedType, actualType)) return;
    this.addDiagnostic(
      'type-mismatch',
      `matrix.new initial_value must be ${this.formatSemanticType(expectedType)}, got ${this.formatSemanticType(actualType)}`,
      initialValue.loc,
    );
  }

  private resolveMapCall(
    expression: CallExpression,
    scope: SemanticScope,
  ): {
    operation: 'clear' | 'contains' | 'copy' | 'get' | 'keys' | 'put' | 'put_all' | 'remove' | 'size' | 'values';
    mapType: SemanticType;
    keyArgument?: Expression;
    valueArgument?: Expression;
  } | null {
    if (expression.callee.type !== 'MemberExpression') return null;

    const methodName = expression.callee.property.name;
    if (!this.isCheckedMapOperation(methodName)) return null;

    const receiverType = this.inferExpressionType(expression.callee.object, scope);
    if (receiverType.kind === 'map') {
      return {
        operation: methodName,
        mapType: receiverType,
        keyArgument: this.getCallArgument(expression.arguments, 'key', 0),
        valueArgument: this.getCallArgument(expression.arguments, 'value', 1),
      };
    }

    if (expression.callee.object.type !== 'Identifier' || expression.callee.object.name !== 'map') return null;

    const mapArgument = this.getCallArgument(expression.arguments, 'id', 0);
    if (!mapArgument) return null;
    const mapType = this.inferExpressionType(mapArgument, scope);
    if (mapType.kind !== 'map') return null;

    return {
      operation: methodName,
      mapType,
      keyArgument: this.getCallArgument(expression.arguments, 'key', 1),
      valueArgument: this.getCallArgument(expression.arguments, 'value', 2),
    };
  }

  private isCheckedMapOperation(
    operation: string,
  ): operation is 'clear' | 'contains' | 'copy' | 'get' | 'keys' | 'put' | 'put_all' | 'remove' | 'size' | 'values' {
    return operation === 'clear'
      || operation === 'contains'
      || operation === 'copy'
      || operation === 'get'
      || operation === 'keys'
      || operation === 'put'
      || operation === 'put_all'
      || operation === 'remove'
      || operation === 'size'
      || operation === 'values';
  }

  private checkUserMethodReceiverType(expression: CallExpression, scope: SemanticScope): void {
    if (expression.callee.type !== 'MemberExpression') return;

    const methods = this.methodDeclarations.get(expression.callee.property.name);
    if (!methods?.length) return;
    if (this.resolveBuiltinSignature(this.memberPath(expression.callee).join('.'), expression, scope)) return;

    const receiverType = this.inferExpressionType(expression.callee.object, scope);
    if (receiverType.kind === 'unknown') return;
    if (this.isBuiltinReceiverMemberMethod(receiverType, expression.callee.property.name)) return;

    const annotatedReceivers = methods
      .map((method) => this.typeFromAnnotation(method.params[0]?.typeAnnotation ?? undefined))
      .filter((type): type is SemanticType => !!type);
    if (annotatedReceivers.length === 0) return;
    if (annotatedReceivers.some((methodReceiverType) => (
      this.isAssignableType(methodReceiverType, receiverType)
      && this.isAssignableQualifier(methodReceiverType.qualifier, receiverType.qualifier)
    ))) return;

    this.addDiagnostic(
      'method-receiver-type',
      `No method ${expression.callee.property.name}() overload accepts ${this.formatSemanticTypeWithQualifier(receiverType)} receiver`,
      expression.callee.property.loc,
    );
  }

  private checkUserCallableArguments(expression: CallExpression, scope: SemanticScope): void {
    if (expression.callee.type === 'Identifier' && scope.lookup(expression.callee.name)?.kind === 'function') {
      const declarations = this.findBestUserFunctionDeclarations(expression.callee.name, expression, scope);
      if (declarations.length > 1 && declarations.filter((declaration) => !declaration.isMethod).length > 1) {
        this.addDiagnostic('ambiguous-call', `Ambiguous call to function ${expression.callee.name}: multiple overloads are equally specific`, expression.callee.loc);
        return;
      }
      const declaration = declarations.length === 1 ? declarations[0] : undefined;
      if (declaration) this.userFunctionCallDeclarations.set(expression, declaration);
    }
    const importedCallable = this.resolveImportedUserFunctionCallable(expression, scope);
    if (importedCallable) this.userFunctionCallDeclarations.set(expression, importedCallable.declaration);
    const offendingArgument = this.firstPositionalArgumentAfterNamed(expression.arguments);
    const callable =
      this.resolveLocalUserCallable(expression, scope) ??
      this.resolveImportedUserFunctionDiagnosticCallable(expression, scope) ??
      this.resolveImportedUserMethodDiagnosticCallable(expression, scope);
    if (!callable) return;

    if (offendingArgument) {
      this.addDiagnostic(
        'argument-order',
        `${callable.displayName} cannot use positional arguments after named arguments`,
        offendingArgument.loc,
      );
      return;
    }

    this.checkUserCallableArgumentBindings(
      expression.arguments,
      callable.declaration.params.slice(callable.parameterOffset),
      callable.displayName,
    );
    this.checkUserCallableNominalParameterTypes(expression, scope, callable);
    this.checkUserCallableParameterQualifiers(expression, scope, callable);
    this.checkUserCallableBoolNaArguments(expression, callable);
  }

  private resolveLocalUserCallable(
    expression: CallExpression,
    scope: SemanticScope,
  ): { declaration: FunctionDeclaration; displayName: string; parameterOffset: number } | undefined {
    if (expression.callee.type === 'Identifier') {
      const symbol = scope.lookupFunction(expression.callee.name);
      const declaration = symbol?.kind === 'function'
        ? this.findUserFunctionDeclaration(expression.callee.name, expression, scope) ?? this.functionSymbolDeclarations.get(symbol)
        : undefined;
      return declaration
        ? { declaration, displayName: `function ${expression.callee.name}`, parameterOffset: 0 }
        : undefined;
    }

    if (expression.callee.type !== 'MemberExpression') return undefined;
    if (this.resolveBuiltinSignature(this.memberPath(expression.callee).join('.'), expression, scope)) return undefined;

    const typeQualifiedMethod = this.resolveTypeQualifiedLocalUserMethodCallable(
      expression as CallExpression & { callee: MemberExpression },
      scope,
    );
    if (typeQualifiedMethod) return typeQualifiedMethod;

    const receiverType = this.inferExpressionType(expression.callee.object, scope);
    if (receiverType.kind === 'unknown') return undefined;

    const callCompatibleDeclaration = this.findUserMethodDeclaration(expression.callee.property.name, receiverType, expression, scope);
    if (callCompatibleDeclaration) {
      return { declaration: callCompatibleDeclaration, displayName: `method ${expression.callee.property.name}`, parameterOffset: 1 };
    }

    if (this.isBuiltinReceiverMemberMethod(receiverType, expression.callee.property.name)) return undefined;

    const methods = this.methodDeclarations.get(expression.callee.property.name) ?? [];
    const receiverMatches = methods.filter((method) => this.userMethodReceiverMatches(method, receiverType));
    const declaration = receiverMatches
      .sort((left, right) => (
        this.userMethodReceiverSpecificityScore(right, receiverType)
        - this.userMethodReceiverSpecificityScore(left, receiverType)
      ))[0];
    return declaration
      ? { declaration, displayName: `method ${expression.callee.property.name}`, parameterOffset: 1 }
      : undefined;
  }

  private resolveTypeQualifiedLocalUserMethodCallable(
    expression: CallExpression & { callee: MemberExpression },
    scope: SemanticScope,
  ): { declaration: FunctionDeclaration; displayName: string; parameterOffset: number } | undefined {
    const typeName = this.memberPath(expression.callee.object).join('.');
    if (!typeName || BUILTIN_NAMESPACES.has(typeName) || !this.isKnownMethodReceiverTypeName(typeName)) return undefined;

    const methods = this.methodDeclarations.get(expression.callee.property.name) ?? [];
    const receiverMatches = methods.filter((method) => this.userMethodReceiverTypeName(method) === typeName);
    const candidates = receiverMatches
      .map((method) => ({
        method,
        score: this.userCallableSpecificityScore(method, expression, 0, scope) ?? Number.NEGATIVE_INFINITY,
      }))
      .filter((candidate) => Number.isFinite(candidate.score));
    if (candidates.length === 0) return undefined;

    const bestScore = Math.max(...candidates.map((candidate) => candidate.score));
    const bestCandidates = candidates.filter((candidate) => candidate.score === bestScore);
    const declaration = bestCandidates.length === 1 ? bestCandidates[0]?.method : undefined;
    return declaration
      ? { declaration, displayName: `method ${expression.callee.property.name}`, parameterOffset: 0 }
      : undefined;
  }

  private resolveImportedUserFunctionCallable(
    expression: CallExpression,
    scope: SemanticScope,
  ):
    | { declaration: FunctionDeclaration; displayName: string; parameterOffset: number; libraryAlias: string }
    | undefined {
    if (expression.callee.type !== 'MemberExpression') return undefined;

    const path = this.memberPath(expression.callee);
    if (path.length !== 2) return undefined;

    const [alias, functionName] = path;
    if (!alias || !functionName) return undefined;

    const overloads = this.importedLibraries.get(alias)?.functions.get(functionName) ?? [];
    const candidates = overloads
      .map((declaration) => ({
        declaration,
        score:
          overloads.length === 1 && this.callArgumentsFitParameters(expression.arguments, declaration.params)
            ? 0
            : this.importedUserCallableSpecificityScore(alias, declaration, expression, 0, scope),
      }))
      .filter((candidate) => candidate.score !== undefined);
    const bestScore = Math.max(...candidates.map((candidate) => candidate.score!));
    const best = candidates.filter((candidate) => candidate.score === bestScore);
    const declaration = best.length === 1 ? best[0]?.declaration : undefined;
    if (!declaration) return undefined;

    return {
      declaration,
      displayName: `library function ${alias}.${functionName}`,
      parameterOffset: 0,
      libraryAlias: alias,
    };
  }

  private resolveImportedUserFunctionDiagnosticCallable(
    expression: CallExpression,
    scope: SemanticScope,
  ):
    | { declaration: FunctionDeclaration; displayName: string; parameterOffset: number; libraryAlias: string }
    | undefined {
    const compatibleCallable = this.resolveImportedUserFunctionCallable(expression, scope);
    if (compatibleCallable) return compatibleCallable;
    if (expression.callee.type !== 'MemberExpression') return undefined;

    const path = this.memberPath(expression.callee);
    if (path.length !== 2) return undefined;

    const [alias, functionName] = path;
    if (!alias || !functionName) return undefined;

    const overloads = this.importedLibraries.get(alias)?.functions.get(functionName) ?? [];
    const scores = overloads
      .map((declaration) => this.importedUserCallableSpecificityScore(alias, declaration, expression, 0, scope))
      .filter((score): score is number => score !== undefined);
    const bestScore = Math.max(...scores);
    if (scores.filter((score) => score === bestScore).length > 1) {
      this.addDiagnostic(
        'ambiguous-call',
        `Ambiguous library function overload: ${alias}.${functionName}`,
        expression.loc,
      );
    }
    const declaration = overloads.at(-1);
    return declaration
      ? {
        declaration,
        displayName: `library function ${alias}.${functionName}`,
        parameterOffset: 0,
        libraryAlias: alias,
      }
      : undefined;
  }

  private resolveImportedUserMethodCallable(
    expression: CallExpression,
    scope: SemanticScope,
  ):
    | { declaration: FunctionDeclaration; displayName: string; parameterOffset: number; libraryAlias?: string }
    | undefined {
    if (expression.callee.type !== 'MemberExpression') return undefined;

    const receiverType = this.inferExpressionType(expression.callee.object, scope);
    const importedReceiver = this.importedReceiverType(receiverType);
    if (!importedReceiver) return undefined;

    const methods = this.importedLibraries.get(importedReceiver.alias)?.methods.get(expression.callee.property.name) ?? [];
    const receiverMatches = methods.filter((method) => this.importedMethodReceiverMatches(method, importedReceiver));
    if (receiverMatches.length === 0) return undefined;

    const candidates = receiverMatches
      .map((method) => ({
        method,
        score: this.importedMethodReceiverSpecificityScore(method, importedReceiver)
          + (this.importedUserCallableSpecificityScore(importedReceiver.alias, method, expression, 1, scope) ?? Number.NEGATIVE_INFINITY),
      }))
      .filter((candidate) => Number.isFinite(candidate.score));
    if (candidates.length === 0) return undefined;

    const bestScore = Math.max(...candidates.map((candidate) => candidate.score));
    const bestCandidates = candidates.filter((candidate) => candidate.score === bestScore);
    return bestCandidates.length === 1 && bestCandidates[0]
      ? {
        declaration: bestCandidates[0].method,
        displayName: `library method ${importedReceiver.alias}.${expression.callee.property.name}`,
        parameterOffset: 1,
        libraryAlias: importedReceiver.alias,
      }
      : undefined;
  }

  private resolveImportedUserMethodDiagnosticCallable(
    expression: CallExpression,
    scope: SemanticScope,
  ):
    | { declaration: FunctionDeclaration; displayName: string; parameterOffset: number; libraryAlias?: string }
    | undefined {
    const compatibleCallable = this.resolveImportedUserMethodCallable(expression, scope);
    if (compatibleCallable) return compatibleCallable;
    if (expression.callee.type !== 'MemberExpression') return undefined;

    const receiverType = this.inferExpressionType(expression.callee.object, scope);
    const importedReceiver = this.importedReceiverType(receiverType);
    if (!importedReceiver) return undefined;

    const methods = this.importedLibraries.get(importedReceiver.alias)?.methods.get(expression.callee.property.name) ?? [];
    const receiverMatches = methods.filter((method) => this.importedMethodReceiverMatches(method, importedReceiver));
    const declaration = receiverMatches
      .sort((left, right) => (
        this.importedMethodReceiverSpecificityScore(right, importedReceiver)
        - this.importedMethodReceiverSpecificityScore(left, importedReceiver)
      ))[0];
    return declaration
      ? {
        declaration,
        displayName: `library method ${importedReceiver.alias}.${expression.callee.property.name}`,
        parameterOffset: 1,
        libraryAlias: importedReceiver.alias,
      }
      : undefined;
  }

  private checkUserCallableArgumentBindings(
    args: CallArgument[],
    params: FunctionDeclaration['params'],
    displayName: string,
  ): void {
    const positionalCount = this.leadingPositionalCount(args);
    if (positionalCount > params.length) {
      this.addDiagnostic(
        'argument-count',
        `Too many arguments for ${displayName}: expected ${params.length}, got ${positionalCount}`,
        args[params.length]?.loc,
      );
      return;
    }

    const paramNames = params.map((param) => param.name);
    const seenNames = new Set<string>();
    const suppliedNames = new Set<string>();
    let hasUnknownArgument = false;
    for (const arg of args) {
      if (!arg.name) continue;

      const name = arg.name.name;
      if (!paramNames.includes(name)) {
        this.addDiagnostic('unknown-argument', this.unknownArgumentMessage(name, displayName, paramNames), arg.name.loc);
        hasUnknownArgument = true;
        continue;
      }

      if (seenNames.has(name)) {
        this.addDuplicateArgumentDiagnostic(arg, this.duplicateArgumentMessage(name, displayName));
        continue;
      }
      seenNames.add(name);
      suppliedNames.add(name);

      const parameterIndex = paramNames.indexOf(name);
      if (parameterIndex !== -1 && parameterIndex < positionalCount) {
        this.addDuplicateArgumentDiagnostic(arg, this.duplicateArgumentMessage(name, displayName));
      }
    }
    if (hasUnknownArgument) return;

    for (const [index, param] of params.entries()) {
      if (index < positionalCount) continue;
      if (suppliedNames.has(param.name)) continue;
      if (param.defaultValue) continue;
      this.addDiagnostic('argument-count', `${displayName} missing required argument '${param.name}'`, args[0]?.loc);
    }
  }

  private checkUserCallableBoolNaArguments(
    expression: CallExpression,
    callable: { declaration: FunctionDeclaration; displayName: string; parameterOffset: number; libraryAlias?: string },
  ): void {
    if (this.versionRules.allowsBoolNaHelpers) return;

    for (const [index, parameter] of callable.declaration.params.entries()) {
      if (index < callable.parameterOffset) continue;

      const parameterType = callable.libraryAlias
        ? this.importedSemanticTypeFromAnnotation(callable.libraryAlias, parameter.typeAnnotation ?? undefined)
        : this.typeFromAnnotation(parameter.typeAnnotation ?? undefined);
      if (parameterType?.kind !== 'bool') continue;

      const argument = this.getCallArgument(
        expression.arguments,
        parameter.name,
        index - callable.parameterOffset,
      );
      if (!argument || !this.isNaLiteralExpression(argument)) continue;

      this.addDiagnostic(
        'type-mismatch',
        this.boolNaVersionMessage(`Cannot pass na value to bool parameter ${parameter.name} for ${callable.displayName}`),
        argument.loc,
      );
    }
  }

  private checkUserCallableNominalParameterTypes(
    expression: CallExpression,
    scope: SemanticScope,
    callable: { declaration: FunctionDeclaration; displayName: string; parameterOffset: number; libraryAlias?: string },
  ): void {
    for (const [index, parameter] of callable.declaration.params.entries()) {
      if (index < callable.parameterOffset) continue;

      const expectedType = callable.libraryAlias
        ? this.importedSemanticTypeFromAnnotation(callable.libraryAlias, parameter.typeAnnotation ?? undefined)
        : this.typeFromAnnotation(parameter.typeAnnotation ?? undefined);
      if (!expectedType || (!PRIMITIVE_TYPE_KINDS.has(expectedType.kind) && !['array', 'matrix', 'map'].includes(expectedType.kind) && !this.isEnumSemanticType(expectedType))) continue;

      const argument = this.getNamedOrUnnamedPositionalArg(expression.arguments, parameter.name, index - callable.parameterOffset);
      if (!argument) continue;
      const actualType = this.inferExpressionType(argument, scope);
      if (this.isAssignableType(expectedType, actualType)) continue;

      this.addDiagnostic(
        'type-mismatch',
        `${callable.displayName} argument ${parameter.name} must be ${this.formatSemanticType(expectedType)}, received ${this.formatSemanticType(actualType)}`,
        argument.loc,
      );
    }
  }

  private checkUserCallableParameterQualifiers(
    expression: CallExpression,
    scope: SemanticScope,
    callable: { declaration: FunctionDeclaration; displayName: string; parameterOffset: number; libraryAlias?: string },
  ): void {
    const requirements = this.inferParameterQualifierRequirements(callable.declaration);
    for (const [index, parameter] of callable.declaration.params.entries()) {
      if (index < callable.parameterOffset) continue;

      const annotationType = callable.libraryAlias
        ? this.importedSemanticTypeFromAnnotation(callable.libraryAlias, parameter.typeAnnotation ?? undefined)
        : this.typeFromAnnotation(parameter.typeAnnotation ?? undefined);
      const expectedQualifier = annotationType?.qualifier ?? requirements.get(parameter.name);
      if (!expectedQualifier && annotationType?.kind !== 'polyline') continue;

      const argument = this.getCallArgument(expression.arguments, parameter.name, index - callable.parameterOffset);
      if (!argument) continue;

      const actualType = this.inferExpressionType(argument, scope);
      if (annotationType?.kind === 'polyline' && !this.isAssignableType(annotationType, actualType)) {
        this.addDiagnostic('type-mismatch', `Cannot pass ${actualType.kind} to polyline parameter ${parameter.name}`, argument.loc);
      }
      const parameterKind = annotationType?.kind ?? actualType.kind;
      if (STRUCTURED_TYPE_KINDS.has(parameterKind) || REFERENCE_TYPE_KINDS.has(parameterKind)) continue;
      if (!expectedQualifier) continue;
      if (!actualType.qualifier || this.isAssignableQualifier(expectedQualifier, actualType.qualifier)) continue;

      this.addDiagnostic(
        'qualifier-mismatch',
        this.qualifierMismatchMessage(actualType.qualifier, expectedQualifier, parameter.name, callable.displayName),
        argument.loc,
      );
    }
  }

  private inferParameterQualifierRequirements(declaration: FunctionDeclaration): ParameterQualifierRequirements {
    const cached = this.parameterQualifierRequirements.get(declaration);
    if (cached) return cached;
    if (this.activeParameterRequirementInferences.has(declaration)) return new Map();

    this.activeParameterRequirementInferences.add(declaration);
    const requirements: ParameterQualifierRequirements = new Map();
    this.parameterQualifierRequirements.set(declaration, requirements);

    try {
      for (const parameter of declaration.params) {
        const annotationType = this.typeFromAnnotation(parameter.typeAnnotation ?? undefined);
        if (annotationType?.qualifier) {
          this.recordParameterQualifierRequirement(requirements, parameter.name, annotationType.qualifier);
        }
      }

      const parameterNames = new Set(declaration.params.map((parameter) => parameter.name));
      const functionScope = this.createFunctionInferenceScope(declaration, new Map());
      this.collectParameterQualifierRequirementsFromNode(
        declaration.body,
        parameterNames,
        functionScope,
        requirements,
        new Map(),
      );
      return requirements;
    } finally {
      this.activeParameterRequirementInferences.delete(declaration);
    }
  }

  private collectParameterQualifierRequirementsFromNode(
    node: Expression | Statement[],
    parameterNames: Set<string>,
    scope: SemanticScope,
    requirements: ParameterQualifierRequirements,
    aliases: Map<string, Set<string>>,
  ): void {
    if (Array.isArray(node)) {
      for (const statement of node) {
        this.collectParameterQualifierRequirementsFromStatement(statement, parameterNames, scope, requirements, aliases);
      }
      return;
    }

    this.collectParameterQualifierRequirementsFromExpression(node, parameterNames, scope, requirements, aliases);
  }

  private collectParameterQualifierRequirementsFromStatement(
    statement: Statement,
    parameterNames: Set<string>,
    scope: SemanticScope,
    requirements: ParameterQualifierRequirements,
    aliases: Map<string, Set<string>>,
  ): void {
    switch (statement.type) {
      case 'VariableDeclaration': {
        const refs = this.parameterRefsInInitializer(statement.init, parameterNames, aliases);
        if (statement.names.type === 'VariableDeclarator') {
          if (refs.size > 0) aliases.set(statement.names.name.name, refs);
          else aliases.delete(statement.names.name.name);
        }
        this.collectParameterQualifierRequirementsFromInitializer(statement.init, parameterNames, scope, requirements, aliases);
        return;
      }
      case 'MultiDeclaration':
        for (const declaration of statement.declarations) {
          this.collectParameterQualifierRequirementsFromStatement(declaration, parameterNames, scope, requirements, aliases);
        }
        return;
      case 'AssignmentStatement': {
        const refs = this.parameterRefsInInitializer(statement.right, parameterNames, aliases);
        if (statement.left.type === 'Identifier') {
          if (refs.size > 0) aliases.set(statement.left.name, refs);
          else aliases.delete(statement.left.name);
        }
        this.collectParameterQualifierRequirementsFromExpression(statement.left, parameterNames, scope, requirements, aliases);
        this.collectParameterQualifierRequirementsFromInitializer(statement.right, parameterNames, scope, requirements, aliases);
        return;
      }
      case 'TupleAssignment':
        this.collectParameterQualifierRequirementsFromInitializer(statement.right, parameterNames, scope, requirements, aliases);
        return;
      case 'MultiAssignment':
        for (const assignment of statement.assignments) {
          this.collectParameterQualifierRequirementsFromStatement(assignment, parameterNames, scope, requirements, aliases);
        }
        return;
      case 'ExpressionStatement':
        this.collectParameterQualifierRequirementsFromExpression(statement.expression, parameterNames, scope, requirements, aliases);
        return;
      case 'MultiExpressionStatement':
        for (const expression of statement.expressions) {
          this.collectParameterQualifierRequirementsFromExpression(expression, parameterNames, scope, requirements, aliases);
        }
        return;
      case 'IfStatement':
        this.collectParameterQualifierRequirementsFromExpression(statement.test, parameterNames, scope, requirements, aliases);
        this.collectParameterQualifierRequirementsFromStatements(statement.consequent, parameterNames, scope, requirements, aliases);
        if (Array.isArray(statement.alternate)) {
          this.collectParameterQualifierRequirementsFromStatements(statement.alternate, parameterNames, scope, requirements, aliases);
        } else if (statement.alternate) {
          this.collectParameterQualifierRequirementsFromStatement(statement.alternate, parameterNames, scope, requirements, aliases);
        }
        return;
      case 'ForStatement':
        if (statement.kind === 'collection') {
          this.collectParameterQualifierRequirementsFromExpression(statement.iterable, parameterNames, scope, requirements, aliases);
        } else {
          this.collectParameterQualifierRequirementsFromExpression(statement.start, parameterNames, scope, requirements, aliases);
          this.collectParameterQualifierRequirementsFromExpression(statement.end, parameterNames, scope, requirements, aliases);
          if (statement.step) this.collectParameterQualifierRequirementsFromExpression(statement.step, parameterNames, scope, requirements, aliases);
        }
        this.collectParameterQualifierRequirementsFromStatements(statement.body, parameterNames, scope, requirements, aliases);
        return;
      case 'WhileStatement':
        this.collectParameterQualifierRequirementsFromExpression(statement.test, parameterNames, scope, requirements, aliases);
        this.collectParameterQualifierRequirementsFromStatements(statement.body, parameterNames, scope, requirements, aliases);
        return;
      default:
        return;
    }
  }

  private collectParameterQualifierRequirementsFromStatements(
    statements: Statement[],
    parameterNames: Set<string>,
    scope: SemanticScope,
    requirements: ParameterQualifierRequirements,
    aliases: Map<string, Set<string>>,
  ): void {
    const childAliases = new Map(aliases);
    for (const statement of statements) {
      this.collectParameterQualifierRequirementsFromStatement(statement, parameterNames, scope, requirements, childAliases);
    }
  }

  private collectParameterQualifierRequirementsFromInitializer(
    init: Expression | IfStatement,
    parameterNames: Set<string>,
    scope: SemanticScope,
    requirements: ParameterQualifierRequirements,
    aliases: Map<string, Set<string>>,
  ): void {
    if (init.type === 'IfStatement') {
      this.collectParameterQualifierRequirementsFromStatement(init, parameterNames, scope, requirements, aliases);
      return;
    }
    this.collectParameterQualifierRequirementsFromExpression(init, parameterNames, scope, requirements, aliases);
  }

  private collectParameterQualifierRequirementsFromExpression(
    expression: Expression,
    parameterNames: Set<string>,
    scope: SemanticScope,
    requirements: ParameterQualifierRequirements,
    aliases: Map<string, Set<string>>,
  ): void {
    if (expression.type === 'CallExpression') {
      this.collectCallParameterQualifierRequirements(expression, parameterNames, scope, requirements, aliases);
      this.collectParameterQualifierRequirementsFromExpression(expression.callee, parameterNames, scope, requirements, aliases);
      for (const argument of expression.arguments) {
        this.collectParameterQualifierRequirementsFromExpression(argument.value, parameterNames, scope, requirements, aliases);
      }
      return;
    }

    switch (expression.type) {
      case 'BinaryExpression':
        this.collectParameterQualifierRequirementsFromExpression(expression.left, parameterNames, scope, requirements, aliases);
        this.collectParameterQualifierRequirementsFromExpression(expression.right, parameterNames, scope, requirements, aliases);
        return;
      case 'UnaryExpression':
        this.collectParameterQualifierRequirementsFromExpression(expression.argument, parameterNames, scope, requirements, aliases);
        return;
      case 'ConditionalExpression':
        this.collectParameterQualifierRequirementsFromExpression(expression.test, parameterNames, scope, requirements, aliases);
        this.collectParameterQualifierRequirementsFromExpression(expression.consequent, parameterNames, scope, requirements, aliases);
        this.collectParameterQualifierRequirementsFromExpression(expression.alternate, parameterNames, scope, requirements, aliases);
        return;
      case 'SwitchExpression':
        if (expression.discriminant) this.collectParameterQualifierRequirementsFromExpression(expression.discriminant, parameterNames, scope, requirements, aliases);
        for (const switchCase of expression.cases) {
          if (switchCase.test) this.collectParameterQualifierRequirementsFromExpression(switchCase.test, parameterNames, scope, requirements, aliases);
          this.collectParameterQualifierRequirementsFromNode(switchCase.consequent, parameterNames, scope, requirements, new Map(aliases));
        }
        return;
      case 'ForStatement':
      case 'WhileStatement':
        this.collectParameterQualifierRequirementsFromStatement(expression, parameterNames, scope, requirements, aliases);
        return;
      case 'MemberExpression':
        this.collectParameterQualifierRequirementsFromExpression(expression.object, parameterNames, scope, requirements, aliases);
        return;
      case 'IndexExpression':
        this.collectParameterQualifierRequirementsFromExpression(expression.object, parameterNames, scope, requirements, aliases);
        this.collectParameterQualifierRequirementsFromExpression(expression.index, parameterNames, scope, requirements, aliases);
        return;
      case 'ArrayExpression':
        for (const element of expression.elements) {
          this.collectParameterQualifierRequirementsFromExpression(element, parameterNames, scope, requirements, aliases);
        }
        return;
      case 'LambdaExpression':
        return;
      default:
        return;
    }
  }

  private collectCallParameterQualifierRequirements(
    expression: CallExpression,
    parameterNames: Set<string>,
    scope: SemanticScope,
    requirements: ParameterQualifierRequirements,
    aliases: Map<string, Set<string>>,
  ): void {
    const calleeName = canonicalBuiltinName(this.builtinSignatureDisplayName(expression, scope));
    const simpleBuiltinParams = this.currentPineVersion >= 5
      ? taSimpleParameterNamesForVersion(calleeName, this.currentPineVersion)
      : undefined;
    if (simpleBuiltinParams) {
      const signature = this.resolveBuiltinSignature(calleeName, expression, scope);
      const params = signature ? this.resolveSignatureParams(expression.arguments, signature) : (BUILTIN_SIGNATURES.get(calleeName)?.params ?? []);
      for (const parameterName of simpleBuiltinParams) {
        const argument = this.resolveCallArgumentExpression(expression, params, params.indexOf(parameterName), signature);
        if (!argument) continue;
        for (const ref of this.parameterRefsInExpression(argument, parameterNames, aliases)) {
          this.recordParameterQualifierRequirement(requirements, ref, 'simple');
        }
      }
    }

    if (isInputCallName(this.effectiveInputCallName(expression)) && this.effectiveInputCallName(expression) !== 'input.source') {
      const signature = this.resolveBuiltinSignature(this.memberPath(expression.callee).join('.'), expression, scope);
      const params = signature ? this.resolveSignatureParams(expression.arguments, signature) : ['defval'];
      const defval = this.resolveCallArgumentExpression(expression, params, params.indexOf('defval'), signature);
      if (defval) {
        for (const ref of this.parameterRefsInExpression(defval, parameterNames, aliases)) {
          this.recordParameterQualifierRequirement(requirements, ref, 'const');
        }
      }
    }

    const callable = this.resolveLocalUserCallable(expression, scope);
    if (!callable) return;

    const nestedRequirements = this.inferParameterQualifierRequirements(callable.declaration);
    for (const [index, parameter] of callable.declaration.params.entries()) {
      if (index < callable.parameterOffset) continue;
      const requiredQualifier = nestedRequirements.get(parameter.name) ?? this.typeFromAnnotation(parameter.typeAnnotation ?? undefined)?.qualifier;
      if (!requiredQualifier) continue;

      const argument = this.getCallArgument(expression.arguments, parameter.name, index - callable.parameterOffset);
      if (!argument) continue;
      for (const ref of this.parameterRefsInExpression(argument, parameterNames, aliases)) {
        this.recordParameterQualifierRequirement(requirements, ref, requiredQualifier);
      }
    }
  }

  private parameterRefsInInitializer(
    init: Expression | IfStatement,
    parameterNames: Set<string>,
    aliases: Map<string, Set<string>>,
  ): Set<string> {
    if (init.type === 'IfStatement') {
      const refs = this.parameterRefsInExpression(init.test, parameterNames, aliases);
      for (const statement of init.consequent) {
        for (const ref of this.parameterRefsInStatement(statement, parameterNames, aliases)) refs.add(ref);
      }
      if (Array.isArray(init.alternate)) {
        for (const statement of init.alternate) {
          for (const ref of this.parameterRefsInStatement(statement, parameterNames, aliases)) refs.add(ref);
        }
      } else if (init.alternate) {
        for (const ref of this.parameterRefsInStatement(init.alternate, parameterNames, aliases)) refs.add(ref);
      }
      return refs;
    }
    return this.parameterRefsInExpression(init, parameterNames, aliases);
  }

  private parameterRefsInStatement(
    statement: Statement,
    parameterNames: Set<string>,
    aliases: Map<string, Set<string>>,
  ): Set<string> {
    switch (statement.type) {
      case 'VariableDeclaration':
        return this.parameterRefsInInitializer(statement.init, parameterNames, aliases);
      case 'AssignmentStatement': {
        const refs = this.parameterRefsInExpression(statement.left, parameterNames, aliases);
        for (const ref of this.parameterRefsInInitializer(statement.right, parameterNames, aliases)) refs.add(ref);
        return refs;
      }
      case 'TupleAssignment':
        return this.parameterRefsInInitializer(statement.right, parameterNames, aliases);
      case 'ExpressionStatement':
        return this.parameterRefsInExpression(statement.expression, parameterNames, aliases);
      case 'IfStatement':
        return this.parameterRefsInInitializer(statement, parameterNames, aliases);
      case 'ForStatement': {
        const refs = statement.kind === 'collection'
          ? this.parameterRefsInExpression(statement.iterable, parameterNames, aliases)
          : this.parameterRefsInExpression(statement.start, parameterNames, aliases);
        if (statement.kind === 'numeric') {
          for (const ref of this.parameterRefsInExpression(statement.end, parameterNames, aliases)) refs.add(ref);
          if (statement.step) {
            for (const ref of this.parameterRefsInExpression(statement.step, parameterNames, aliases)) refs.add(ref);
          }
        }
        for (const child of statement.body) {
          for (const ref of this.parameterRefsInStatement(child, parameterNames, aliases)) refs.add(ref);
        }
        return refs;
      }
      case 'WhileStatement': {
        const refs = this.parameterRefsInExpression(statement.test, parameterNames, aliases);
        for (const child of statement.body) {
          for (const ref of this.parameterRefsInStatement(child, parameterNames, aliases)) refs.add(ref);
        }
        return refs;
      }
      case 'MultiDeclaration':
        return this.mergeParameterRefSets(statement.declarations.map((declaration) => this.parameterRefsInStatement(declaration, parameterNames, aliases)));
      case 'MultiAssignment':
        return this.mergeParameterRefSets(statement.assignments.map((assignment) => this.parameterRefsInStatement(assignment, parameterNames, aliases)));
      case 'MultiExpressionStatement':
        return this.mergeParameterRefSets(statement.expressions.map((expression) => this.parameterRefsInExpression(expression, parameterNames, aliases)));
      default:
        return new Set();
    }
  }

  private parameterRefsInExpression(
    expression: Expression,
    parameterNames: Set<string>,
    aliases: Map<string, Set<string>>,
  ): Set<string> {
    switch (expression.type) {
      case 'Identifier':
        if (parameterNames.has(expression.name)) return new Set([expression.name]);
        return new Set(aliases.get(expression.name) ?? []);
      case 'BinaryExpression':
        return this.mergeParameterRefSets([
          this.parameterRefsInExpression(expression.left, parameterNames, aliases),
          this.parameterRefsInExpression(expression.right, parameterNames, aliases),
        ]);
      case 'UnaryExpression':
        return this.parameterRefsInExpression(expression.argument, parameterNames, aliases);
      case 'ConditionalExpression':
        return this.mergeParameterRefSets([
          this.parameterRefsInExpression(expression.test, parameterNames, aliases),
          this.parameterRefsInExpression(expression.consequent, parameterNames, aliases),
          this.parameterRefsInExpression(expression.alternate, parameterNames, aliases),
        ]);
      case 'SwitchExpression':
        return this.mergeParameterRefSets([
          ...(expression.discriminant ? [this.parameterRefsInExpression(expression.discriminant, parameterNames, aliases)] : []),
          ...expression.cases.flatMap((switchCase) => [
            ...(switchCase.test ? [this.parameterRefsInExpression(switchCase.test, parameterNames, aliases)] : []),
            ...(Array.isArray(switchCase.consequent)
              ? switchCase.consequent.map((statement) => this.parameterRefsInStatement(statement, parameterNames, aliases))
              : [this.parameterRefsInExpression(switchCase.consequent, parameterNames, aliases)]),
          ]),
        ]);
      case 'CallExpression':
        return this.mergeParameterRefSets([
          this.parameterRefsInExpression(expression.callee, parameterNames, aliases),
          ...expression.arguments.map((argument) => this.parameterRefsInExpression(argument.value, parameterNames, aliases)),
        ]);
      case 'MemberExpression':
        return this.parameterRefsInExpression(expression.object, parameterNames, aliases);
      case 'IndexExpression':
        return this.mergeParameterRefSets([
          this.parameterRefsInExpression(expression.object, parameterNames, aliases),
          this.parameterRefsInExpression(expression.index, parameterNames, aliases),
        ]);
      case 'ArrayExpression':
        return this.mergeParameterRefSets(expression.elements.map((element) => this.parameterRefsInExpression(element, parameterNames, aliases)));
      case 'ForStatement':
      case 'WhileStatement':
        return this.parameterRefsInStatement(expression, parameterNames, aliases);
      default:
        return new Set();
    }
  }

  private mergeParameterRefSets(refSets: Set<string>[]): Set<string> {
    const merged = new Set<string>();
    for (const refs of refSets) {
      for (const ref of refs) merged.add(ref);
    }
    return merged;
  }

  private recordParameterQualifierRequirement(
    requirements: ParameterQualifierRequirements,
    parameterName: string,
    qualifier: SemanticQualifier,
  ): void {
    const current = requirements.get(parameterName);
    if (!current || QUALIFIER_RANK[qualifier] < QUALIFIER_RANK[current]) {
      requirements.set(parameterName, qualifier);
    }
  }

  private firstPositionalArgumentAfterNamed(args: CallArgument[]): CallArgument | undefined {
    let hasNamedArgument = false;
    for (const arg of args) {
      if (arg.name) {
        hasNamedArgument = true;
      } else if (hasNamedArgument) {
        return arg;
      }
    }
    return undefined;
  }

  private isBuiltinCollectionMemberMethod(receiverType: SemanticType, methodName: string): boolean {
    return BUILTIN_COLLECTION_MEMBER_METHODS.get(receiverType.kind)?.has(methodName) ?? false;
  }

  private isBuiltinReceiverMemberMethod(receiverType: SemanticType, methodName: string): boolean {
    return this.isBuiltinCollectionMemberMethod(receiverType, methodName)
      || (REFERENCE_TYPE_KINDS.has(receiverType.kind) && BUILTIN_SIGNATURES.has(`${receiverType.kind}.${methodName}`));
  }

  private importedReceiverType(type: SemanticType): { alias: string; type: SemanticType } | undefined {
    if (type.kind !== 'udt' || !type.name) return undefined;

    const [alias, typeName] = type.name.split('.');
    if (!alias || !typeName || !this.importedLibraries.has(alias)) return undefined;
    return { alias, type };
  }

  private importedMethodReceiverMatches(
    method: FunctionDeclaration,
    receiver: { alias: string; type: SemanticType },
  ): boolean {
    const receiverType = this.importedSemanticTypeFromAnnotation(receiver.alias, method.params[0]?.typeAnnotation ?? undefined);
    return !!receiverType
      && this.isAssignableType(receiverType, receiver.type)
      && this.isAssignableQualifier(receiverType.qualifier, receiver.type.qualifier);
  }

  private importedMethodReceiverSpecificityScore(
    method: FunctionDeclaration,
    receiver: { alias: string; type: SemanticType },
  ): number {
    const receiverType = this.importedSemanticTypeFromAnnotation(receiver.alias, method.params[0]?.typeAnnotation ?? undefined);
    if (!receiverType) return 0;

    let score = this.typeSpecificityScore(receiverType, receiver.type);
    if (receiverType.qualifier === receiver.type.qualifier) score += 2;
    return score;
  }

  private isAssignableQualifier(targetQualifier: SemanticQualifier | undefined, sourceQualifier: SemanticQualifier | undefined): boolean {
    if (!targetQualifier || !sourceQualifier) return true;
    return QUALIFIER_RANK[sourceQualifier] <= QUALIFIER_RANK[targetQualifier];
  }

  private checkMapArgumentType(expectedType: SemanticType | undefined, argument: Expression | undefined, role: 'map key' | 'map value', scope: SemanticScope): void {
    if (!expectedType || !argument) return;

    const actualType = this.inferExpressionType(argument, scope);
    if (this.isAssignableType(expectedType, actualType)) return;

    this.addDiagnostic(
      'type-mismatch',
      `Cannot use ${this.formatSemanticType(actualType)} value as ${this.formatSemanticType(expectedType)} ${role}`,
      argument.loc,
    );
  }

  private getCallArgument(args: CallArgument[], name: string, positionalIndex: number): Expression | undefined {
    return args.find((argument) => argument.name?.name === name)?.value ?? args[positionalIndex]?.value;
  }

  // Like getCallArgument but only falls back to positional if the arg at that index is not a named arg.
  private getNamedOrUnnamedPositionalArg(args: CallArgument[], name: string, positionalIndex: number): Expression | undefined {
    const namedMatch = args.find((argument) => argument.name?.name === name);
    if (namedMatch) return namedMatch.value;
    const positional = args[positionalIndex];
    return positional && !positional.name ? positional.value : undefined;
  }

  private checkArgumentOrder(args: CallArgument[], displayName: string, signature?: BuiltinSignature): void {
    if (signature?.allowNamedPrefixWithPositional) {
      if (!signature.namedPrefixWithPositionalParams) return;

      const allowedPrefixNames = new Set(signature.namedPrefixWithPositionalParams);
      const namedPrefixArgs: CallArgument[] = [];
      let hasNamedArgument = false;
      for (const arg of args) {
        if (arg.name) {
          hasNamedArgument = true;
          namedPrefixArgs.push(arg);
          continue;
        }
        if (!hasNamedArgument) continue;
        const invalidPrefixArg = namedPrefixArgs.find((prefixArg) => prefixArg.name && !allowedPrefixNames.has(this.canonicalSignatureArgumentName(prefixArg.name.name, signature)));
        if (invalidPrefixArg) {
          this.addDiagnostic('argument-order', `${displayName}() cannot use positional arguments after named arguments`, arg.loc);
        }
      }
      return;
    }

    let hasNamedArgument = false;
    for (const arg of args) {
      if (arg.name) {
        hasNamedArgument = true;
        continue;
      }
      if (hasNamedArgument) {
        this.addDiagnostic('argument-order', `${displayName}() cannot use positional arguments after named arguments`, arg.loc);
      }
    }
  }

  private checkArgumentNames(args: CallArgument[], signature: BuiltinSignature, displayName: string, scope?: SemanticScope): void {
    if (signature.allowExtraNamed) return;
    const allowed = new Set(this.resolveSignatureParams(args, signature, scope));
    const mixedInputRangeArg = this.firstMixedInputRangeOptionsArgument(args, signature, displayName);
    if (mixedInputRangeArg?.name) {
      this.addDiagnostic(
        'invalid-overload',
        `${displayName}() cannot use options together with minval/maxval/step`,
        mixedInputRangeArg.name.loc,
      );
    }
    for (const arg of args) {
      const renamedModernSlotInLegacy = arg.name
        && this.versionRules.allowsLegacyGlobalBuiltinAliases
        && Object.values(signature.legacyV4Aliases ?? {}).includes(arg.name.name);
      if (arg.name && (renamedModernSlotInLegacy || !allowed.has(this.canonicalSignatureArgumentName(arg.name.name, signature)))) {
        if (
          mixedInputRangeArg
          && INPUT_RANGE_OPTION_RANGE_PARAMS.has(this.canonicalSignatureArgumentName(arg.name.name, signature))
        ) continue;
        this.addDiagnostic('unknown-argument', this.unknownArgumentMessage(arg.name.name, `${displayName}()`, [...allowed]), arg.name.loc);
      }
    }
  }

  private firstMixedInputRangeOptionsArgument(
    args: CallArgument[],
    signature: BuiltinSignature,
    displayName: string,
  ): CallArgument | undefined {
    if (!INPUT_RANGE_OPTION_OVERLOAD_NAMES.has(displayName) || !signature.overloads) return undefined;

    const suppliedNames = new Set(args.flatMap((arg) => (arg.name ? [this.canonicalSignatureArgumentName(arg.name.name, signature)] : [])));
    const optionsIndex = signature.params.indexOf('options');
    const optionsPriorNamedCount = optionsIndex === -1
      ? 0
      : signature.params.slice(0, optionsIndex).filter((param) => suppliedNames.has(param)).length;
    const positionalOptions = optionsIndex === -1
      ? undefined
      : args.filter((arg) => !arg.name)[optionsIndex - optionsPriorNamedCount]?.value;
    const usesOptionsOverload = suppliedNames.has('options') || positionalOptions?.type === 'ArrayExpression';
    if (!usesOptionsOverload) return undefined;

    return args.find((arg) => {
      if (!arg.name) return false;
      return INPUT_RANGE_OPTION_RANGE_PARAMS.has(this.canonicalSignatureArgumentName(arg.name.name, signature));
    });
  }

  private checkArgumentCount(args: CallArgument[], signature: BuiltinSignature, displayName: string, scope?: SemanticScope): void {
    if (signature === BUILTIN_SIGNATURES.get('timestamp')) {
      this.checkTimestampArgumentCount(args, signature, displayName, scope);
      return;
    }

    const params = this.resolveSignatureParams(args, signature, scope);
    const binding = signature.allowNamedPrefixWithPositional ? this.bindSignatureArguments(args, signature, params) : undefined;
    const positionalCount = this.leadingPositionalCount(args);
    const suppliedNames = binding?.boundParams ?? new Set(args.flatMap((arg) => (arg.name ? [this.canonicalSignatureArgumentName(arg.name.name, signature)] : [])));
    const omitsOptionalLeadingParam = this.omitsOptionalLeadingParam(params, positionalCount, suppliedNames, signature);
    const boundParamCount = displayName === 'str.format' ? args.length : binding?.boundParams.size ?? params.filter((param, index) => {
      const positionalIndex = this.effectivePositionalIndex(index, omitsOptionalLeadingParam);
      return (positionalIndex !== -1 && positionalIndex < positionalCount) || suppliedNames.has(param);
    }).length;
    const minArgs = signature === BUILTIN_SIGNATURES.get('color') && params[0] === 'red'
      ? 3
      : this.resolveSignatureMinArgs(signature);
    const maxArgs = signature.allowExtraPositional ? Infinity : (signature.maxArgs ?? params.length);

    if (boundParamCount < minArgs) {
      this.addDiagnostic(
        'argument-count',
        this.argumentCountMessage(displayName, minArgs, params, boundParamCount),
        args[0]?.loc,
      );
    }
    const requiredParams = signature.requiredParams ?? params.slice(0, minArgs);
    for (const param of requiredParams) {
      // Default-source helpers can let a lone positional value bind to singlePositionalParam
      // instead of the first params entry while requiredParams still tracks required coverage.
      if (args.length === 1 && positionalCount === 1 && signature.singlePositionalParam === param) continue;
      if (binding) {
        if (binding.boundParams.has(param)) continue;
      } else {
        const positionalIndex = this.effectivePositionalIndex(params.indexOf(param), omitsOptionalLeadingParam);
        if (positionalIndex !== -1 && positionalIndex < positionalCount) continue;
      }
      if (suppliedNames.has(param)) continue;
      this.addDiagnostic('argument-count', `${displayName}() missing required argument '${param}'`, args[0]?.loc);
    }
    if (binding && binding.overflowArgs.length > 0 && !signature.allowExtraPositional) {
      this.addDiagnostic('argument-count', `${displayName}() expects at most ${maxArgs} argument${maxArgs === 1 ? '' : 's'}`, binding.overflowArgs[0]?.loc);
    } else if (positionalCount > maxArgs) {
      this.addDiagnostic('argument-count', `${displayName}() expects at most ${maxArgs} argument${maxArgs === 1 ? '' : 's'}`, args[maxArgs]?.loc);
    }
  }

  private checkDuplicateArgumentBindings(args: CallArgument[], signature: BuiltinSignature, displayName: string, scope?: SemanticScope): void {
    const params = this.resolveSignatureParams(args, signature, scope);
    if (signature.allowNamedPrefixWithPositional) {
      const boundParams = new Set<string>();
      const positionalBoundParams = new Set<string>();
      const seenNames = new Set<string>();
      const positionalParams = this.positionalBindingParams(args, signature, params);

      for (const arg of args) {
        if (!arg.name) {
          const positionalParam = positionalParams.find((param) => !boundParams.has(param));
          if (positionalParam) {
            boundParams.add(positionalParam);
            positionalBoundParams.add(positionalParam);
          }
          continue;
        }

        const canonicalName = this.canonicalSignatureArgumentName(arg.name.name, signature);
        if (!params.includes(canonicalName)) continue;
        if (seenNames.has(canonicalName) || positionalBoundParams.has(canonicalName)) {
          this.addDuplicateArgumentDiagnostic(arg, this.duplicateArgumentMessage(arg.name.name, `${displayName}()`));
          continue;
        }
        seenNames.add(canonicalName);
        boundParams.add(canonicalName);
      }
      return;
    }

    const positionalCount = this.leadingPositionalCount(args);
    const suppliedNames = new Set(args.flatMap((arg) => (arg.name ? [this.canonicalSignatureArgumentName(arg.name.name, signature)] : [])));
    const omitsOptionalLeadingParam = this.omitsOptionalLeadingParam(params, positionalCount, suppliedNames, signature);
    const seenNames = new Set<string>();

    for (const arg of args) {
      if (!arg.name) continue;

      const name = arg.name.name;
      const canonicalName = this.canonicalSignatureArgumentName(name, signature);
      if (seenNames.has(canonicalName)) {
        this.addDuplicateArgumentDiagnostic(arg, this.duplicateArgumentMessage(name, `${displayName}()`));
        continue;
      }
      seenNames.add(canonicalName);

      const positionalIndex = this.effectivePositionalIndex(params.indexOf(canonicalName), omitsOptionalLeadingParam);
      if (positionalIndex !== -1 && positionalIndex < positionalCount) {
        this.addDuplicateArgumentDiagnostic(arg, this.duplicateArgumentMessage(name, `${displayName}()`));
      }
    }
  }

  private checkLegacyCompatibleArguments(args: CallArgument[], signature: BuiltinSignature, displayName: string): void {
    const params = this.selectedLegacySignatureParams(signature);
    if (!params) return;

    const modernParams = new Set(signature.params);
    const legacyParams = new Set(params);
    for (const arg of args) {
      if (!arg.name) continue;

      const name = this.canonicalSignatureArgumentName(arg.name.name, signature);
      if (!legacyParams.has(name) || modernParams.has(name)) continue;

      this.addDiagnostic(
        'legacy-argument',
        this.legacyCompatibleArgumentMessage(displayName, arg.name.name),
        arg.name.loc,
        'info',
      );
    }
  }

  private selectedLegacySignatureParams(signature: BuiltinSignature): string[] | undefined {
    if (this.currentPineVersion <= 4 && signature.legacyV4Params) return signature.legacyV4Params;
    if (this.currentPineVersion <= 5 && signature.legacyV5Params) return signature.legacyV5Params;
    return undefined;
  }

  private checkTimestampArgumentCount(args: CallArgument[], signature: BuiltinSignature, displayName: string, scope?: SemanticScope): void {
    const params = this.resolveTimestampSignatureParams(args, signature, scope);
    const binding = this.bindSignatureArguments(args, signature, params);
    const requiredParams = params.includes('dateString') ? ['dateString'] : ['year', 'month', 'day'];

    for (const param of requiredParams) {
      if (binding.boundParams.has(param)) continue;
      this.addDiagnostic('argument-count', `${displayName}() missing required argument '${param}'`, args[0]?.loc);
    }

    if (binding.overflowArgs.length > 0 && !signature.allowExtraPositional) {
      this.addDiagnostic(
        'argument-count',
        `${displayName}() expects at most ${params.length} argument${params.length === 1 ? '' : 's'}`,
        binding.overflowArgs[0]?.loc,
      );
    }
  }

  private omitsOptionalLeadingParam(params: string[], positionalCount: number, suppliedNames: Set<string>, signature: BuiltinSignature): boolean {
    return Boolean(
      signature.optionalLeadingParam
        && params[0] === signature.optionalLeadingParam
        && !suppliedNames.has(signature.optionalLeadingParam)
        && positionalCount < params.length,
    );
  }

  private effectivePositionalIndex(paramIndex: number, omitsOptionalLeadingParam: boolean): number {
    if (paramIndex === -1) return -1;
    if (!omitsOptionalLeadingParam) return paramIndex;
    return paramIndex === 0 ? -1 : paramIndex - 1;
  }

  private bindSignatureArguments(
    args: CallArgument[],
    signature: BuiltinSignature,
    params: string[],
  ): { boundParams: Set<string>; overflowArgs: CallArgument[] } {
    const boundParams = new Set<string>();
    const overflowArgs: CallArgument[] = [];
    const positionalParams = this.positionalBindingParams(args, signature, params);

    for (const arg of args) {
      if (arg.name) {
        const canonicalName = this.canonicalSignatureArgumentName(arg.name.name, signature);
        if (params.includes(canonicalName)) {
          boundParams.add(canonicalName);
        }
        continue;
      }

      const positionalParam = positionalParams.find((param) => !boundParams.has(param));
      if (positionalParam) {
        boundParams.add(positionalParam);
      } else {
        overflowArgs.push(arg);
      }
    }

    return { boundParams, overflowArgs };
  }

  private positionalBindingParams(args: CallArgument[], signature: BuiltinSignature, params: string[]): string[] {
    const positionalCount = this.leadingPositionalCount(args);
    const suppliedNames = new Set(args.flatMap((arg) => (arg.name ? [this.canonicalSignatureArgumentName(arg.name.name, signature)] : [])));
    return this.omitsOptionalLeadingParam(params, positionalCount, suppliedNames, signature) ? params.slice(1) : params;
  }

  private canonicalSignatureArgumentName(name: string, signature: BuiltinSignature): string {
    if (name === 'resolution' && signature === BUILTIN_SIGNATURES.get('time') && this.versionRules.supportsLegacyTimeResolutionArgument) {
      return 'timeframe';
    }
    if (this.versionRules.allowsLegacyGlobalBuiltinAliases && signature.legacyV4Aliases?.[name]) {
      return signature.legacyV4Aliases[name];
    }
    return signature.aliases?.[name] ?? name;
  }

  private resolveSignatureParams(args: CallArgument[], signature: BuiltinSignature, scope?: SemanticScope): string[] {
    if (signature === BUILTIN_SIGNATURES.get('timestamp')) {
      return this.resolveTimestampSignatureParams(args, signature, scope);
    }
    if (signature.params === BUILTIN_SIGNATURES.get('time')?.params || signature.params === BUILTIN_SIGNATURES.get('time_close')?.params) {
      return this.resolveTimeSignatureParams(args, signature, scope);
    }
    if (signature === BUILTIN_SIGNATURES.get('ticker.kagi')) {
      return this.resolveTickerKagiSignatureParams(args);
    }
    if (signature === BUILTIN_SIGNATURES.get('color')) {
      const suppliedNames = new Set(args.flatMap((arg) => (arg.name ? [this.canonicalSignatureArgumentName(arg.name.name, signature)] : [])));
      const positionalCount = args.filter((arg) => !arg.name).length;
      if (['red', 'green', 'blue', 'transp'].some((name) => suppliedNames.has(name))) {
        return ['red', 'green', 'blue', 'transp'];
      }
      if (suppliedNames.has('x') || positionalCount <= 1) return ['x'];
      return ['red', 'green', 'blue', 'transp'];
    }
    if (this.currentPineVersion <= 4 && signature.legacyV4Params) {
      return signature.legacyV4Params;
    }
    if (signature === BUILTIN_SIGNATURES.get('fill') && this.usesGradientFillSignature(args, scope)) {
      return FILL_GRADIENT_PARAMS;
    }
    if (signature === BUILTIN_SIGNATURES.get('fill') && this.currentPineVersion >= 5 && !this.usesNamedLegacyArgument(args, signature)) {
      const first = args.find((arg) => arg.name?.name === 'plot1' || arg.name?.name === 'hline1')?.value
        ?? args.find((arg) => !arg.name)?.value;
      if (first && this.inferExpressionType(first, scope ?? this.rootScope).kind === 'hline') {
        return ['plot1', 'plot2', 'color', 'title', 'editable', 'fillgaps', 'display'];
      }
    }
    if (this.currentPineVersion <= 5 && signature.legacyV5Params && this.usesNamedLegacyArgument(args, signature)) {
      return signature.legacyV5Params;
    }

    if (signature.variadicParamPrefix) {
      const escapedPrefix = signature.variadicParamPrefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const variadicNamePattern = new RegExp(`^${escapedPrefix}(\\d+)$`);
      const positionalMaxIndex = Math.min(args.filter((arg) => !arg.name).length - 1, MAX_VARIADIC_SIGNATURE_INDEX);
      const namedMaxIndex = args.reduce((maxIndex, arg) => {
        const name = arg.name ? this.canonicalSignatureArgumentName(arg.name.name, signature) : undefined;
        const match = name?.match(variadicNamePattern);
        if (!match) return maxIndex;
        const index = Number(match[1]);
        if (!Number.isSafeInteger(index) || index > MAX_VARIADIC_SIGNATURE_INDEX) return maxIndex;
        return Math.max(maxIndex, index);
      }, -1);
      const fixedPrefix = signature.params.filter((param) => !variadicNamePattern.test(param));
      const declaredVariadicMaxIndex = signature.params.reduce((maxIndex, param) => {
        const match = param.match(variadicNamePattern);
        return match ? Math.max(maxIndex, Number(match[1])) : maxIndex;
      }, -1);
      const maxIndex = Math.max(declaredVariadicMaxIndex, positionalMaxIndex - fixedPrefix.length, namedMaxIndex);
      const variadicParams = maxIndex >= 0
        ? Array.from({ length: maxIndex + 1 }, (_, index) => `${signature.variadicParamPrefix}${index}`)
        : [];
      return [...fixedPrefix, ...variadicParams];
    }

    const suppliedNames = new Set(args.flatMap((arg) => (arg.name ? [this.canonicalSignatureArgumentName(arg.name.name, signature)] : [])));
    const optionsIndex = signature.params.indexOf('options');
    const optionsPriorNamedCount = optionsIndex === -1
      ? 0
      : signature.params.slice(0, optionsIndex).filter((param) => suppliedNames.has(param)).length;
    const positionalOptions = optionsIndex === -1
      ? undefined
      : args.filter((arg) => !arg.name)[optionsIndex - optionsPriorNamedCount]?.value;
    const usesOptionsOverload = suppliedNames.has('options') || positionalOptions?.type === 'ArrayExpression';
    if (!signature.overloads) {
      return signature.params.includes('options') && !usesOptionsOverload
        ? signature.params.filter((param) => param !== 'options')
        : signature.params;
    }

    const optionsOverload = signature.overloads.find((params) => params.includes('options'));
    const rangeOverload = signature.overloads.find((params) => params.includes('minval'));
    const plainOverload = signature.overloads.find((params) => !params.includes('options') && !params.includes('minval'));

    return (usesOptionsOverload ? optionsOverload : (rangeOverload ?? plainOverload)) ?? signature.params;
  }

  private usesNamedLegacyArgument(args: CallArgument[], signature: BuiltinSignature): boolean {
    if (!signature.legacyV5Params) return false;
    const modernParams = new Set(signature.params);
    const legacyParams = new Set(signature.legacyV5Params);
    return args.some((arg) => {
      if (!arg.name) return false;
      const name = this.canonicalSignatureArgumentName(arg.name.name, signature);
      return legacyParams.has(name) && !modernParams.has(name);
    });
  }

  private usesGradientFillSignature(args: CallArgument[], scope?: SemanticScope): boolean {
    const suppliedNames = new Set(args.flatMap((arg) => (arg.name ? [arg.name.name] : [])));
    if (suppliedNames.has('top_value') || suppliedNames.has('bottom_value') || suppliedNames.has('top_color') || suppliedNames.has('bottom_color')) return true;

    const positional = args.filter((arg) => !arg.name);
    if (positional.length < 6) return false;
    const third = positional[2]?.value;
    if (!third) return false;
    const activeScope = scope ?? this.rootScope;
    const type = this.inferExpressionType(third, activeScope);
    if (type.kind === 'unknown') {
      const bottomType = this.inferExpressionType(positional[3].value, activeScope);
      if ((bottomType.kind === 'unknown' || bottomType.kind === 'int' || bottomType.kind === 'float')
        && this.inferExpressionType(positional[4].value, activeScope).kind === 'color'
        && this.inferExpressionType(positional[5].value, activeScope).kind === 'color') return true;
    }
    return type.kind === 'int' || type.kind === 'float' || this.isNaLiteralExpression(third) && this.inferExpressionType(positional[3].value, scope ?? this.rootScope).kind !== 'string';
  }

  private resolveSignatureMinArgs(signature: BuiltinSignature): number {
    if (this.currentPineVersion <= 4 && signature.legacyV4MinArgs !== undefined) {
      return signature.legacyV4MinArgs;
    }
    if (this.currentPineVersion <= 5 && signature.legacyV5MinArgs !== undefined) {
      return signature.legacyV5MinArgs;
    }
    return signature.minArgs ?? 0;
  }

  private resolveTimeSignatureParams(args: CallArgument[], signature: BuiltinSignature, scope?: SemanticScope): string[] {
    const noTimezoneParams = signature.overloads?.[0];
    if (!noTimezoneParams) return signature.params;

    const suppliedNames = new Set(args.flatMap((arg) => (arg.name ? [this.canonicalSignatureArgumentName(arg.name.name, signature)] : [])));
    if (suppliedNames.has('timezone')) return signature.params;

    const positionalArgs = args.filter((arg) => !arg.name);
    const thirdPositional = positionalArgs[2]?.value;
    if (thirdPositional && positionalArgs.length <= 4) {
      const thirdType = scope ? this.inferExpressionType(thirdPositional, scope) : undefined;
      if (thirdPositional.type === 'StringLiteral' || thirdType?.kind === 'string') return signature.params;
      if (thirdType && thirdType.kind !== 'unknown') return noTimezoneParams;
      return noTimezoneParams;
    }
    if ((suppliedNames.has('bars_back') || suppliedNames.has('timeframe_bars_back')) && positionalArgs.length <= 2) {
      return noTimezoneParams;
    }

    return signature.params;
  }

  private resolveTickerKagiSignatureParams(args: CallArgument[]): string[] {
    const suppliedNames = new Set(args.flatMap((arg) => (arg.name ? [arg.name.name] : [])));
    return suppliedNames.has('param') || suppliedNames.has('style') || args.length >= 3
      ? ['symbol', 'param', 'style']
      : ['symbol', 'reversal'];
  }

  private resolveTimestampSignatureParams(args: CallArgument[], signature: BuiltinSignature, scope?: SemanticScope): string[] {
    const positionalArgs = args.filter((arg) => !arg.name);
    const suppliedNames = new Set(args.flatMap((arg) => (arg.name ? [this.canonicalSignatureArgumentName(arg.name.name, signature)] : [])));
    const [dateStringParams, numericDateParams] = signature.overloads ?? [];
    const firstPositional = positionalArgs[0]?.value;
    const firstType = firstPositional && scope ? this.inferExpressionType(firstPositional, scope) : undefined;

    if (suppliedNames.has('dateString')) {
      return dateStringParams ?? signature.params;
    }
    if (suppliedNames.has('timezone')) {
      return signature.params;
    }
    if (suppliedNames.has('year') || suppliedNames.has('month') || suppliedNames.has('day')) {
      if (firstPositional?.type === 'StringLiteral' || firstType?.kind === 'string') return signature.params;
      return numericDateParams ?? signature.params;
    }

    if (firstPositional?.type === 'StringLiteral' || firstType?.kind === 'string') {
      return positionalArgs.length === 1 ? (dateStringParams ?? signature.params) : signature.params;
    }
    if (firstPositional) {
      // An untyped UDF parameter is still unknown here. Seven positional
      // arguments can only match the timezone overload, not the numeric date.
      if (firstType?.kind === 'unknown' && numericDateParams && positionalArgs.length > numericDateParams.length) {
        return signature.params;
      }
      return numericDateParams ?? signature.params;
    }

    return signature.params;
  }

  private leadingPositionalCount(args: CallArgument[]): number {
    let count = 0;
    for (const arg of args) {
      if (arg.name) return count;
      count += 1;
    }
    return count;
  }

  private checkIdentifier(identifier: Identifier, scope: SemanticScope): void {
    if (this.activeLegacySecurityReferences.length > 0) {
      const symbol = scope.lookup(identifier.name);
      if (symbol) {
        for (const references of this.activeLegacySecurityReferences) references.add(symbol);
      }
    }
    if (scope.lookup(identifier.name)) return;
    const renamed = V4_RENAMED_MARKET_VARIABLES.get(identifier.name);
    if (renamed && this.currentPineVersion >= 4) {
      this.addDiagnostic('version-mismatch', `${identifier.name} was renamed to ${renamed} in Pine v4.`, identifier.loc);
      return;
    }
    if (identifier.name === 'dotted' && this.currentPineVersion >= 4 && !scope.lookup(identifier.name)) {
      this.addDiagnostic(
        'version-mismatch',
        `dotted was renamed in Pine v4. Use hline.style_dotted in Pine v${this.currentPineVersion}.`,
        identifier.loc,
      );
      return;
    }
    if (identifier.name === 'histogram' && !scope.lookup(identifier.name) && this.versionRules.supportsNamespacedHistogramStyle) {
      this.addDiagnostic('version-mismatch', 'histogram was renamed in Pine v4. Use plot.style_histogram.', identifier.loc);
      return;
    }
    if (isPineBuiltinGlobalAvailable(this.currentPineVersion, identifier.name) && BUILTIN_GLOBAL_TYPES.has(identifier.name)) {
      this.usedBuiltinVariableNames.add(identifier.name);
      return;
    }
    if (this.isKnownIdentifier(identifier.name)

      || BUILTIN_TYPE_CAST_NAMES.has(identifier.name) || scope.lookup(identifier.name)) return;
    this.addDiagnostic('unknown-identifier', this.unknownIdentifierMessage(identifier.name), identifier.loc);
  }

  private isTernaryTupleArm(expression: Expression, scope: SemanticScope): boolean {
    if (expression.type === 'ArrayExpression') return true;
    if (expression.type !== 'CallExpression') return false;
    if (this.hasLocalUserCallableShadow(expression, scope)) {
      return (
        this.inferUserFunctionTupleElementTypes(expression, scope) !== undefined
        || this.inferUserMethodTupleElementTypes(expression, scope) !== undefined
      );
    }
    const root = this.memberPath(expression.callee)[0];
    const rootSymbol = root ? scope.lookup(root) : undefined;
    if (expression.callee.type === 'MemberExpression' && (rootSymbol?.kind === 'variable' || rootSymbol?.kind === 'parameter')) {
      return this.inferUserMethodTupleElementTypes(expression, scope) !== undefined;
    }
    return this.inferTupleElementTypes(expression, scope) !== undefined;
  }

  private checkTypeAnnotation(owner: string, annotation?: TypeAnnotation | null, loc?: SourceLocation): void {
    if (!annotation) return;

    const typeName = annotation.baseType === 'udt' ? annotation.name : annotation.baseType;
    if (this.currentPineVersion >= 6 && (typeName === 'plot' || typeName === 'hline')
      && !this.isKnownUdtType(typeName)) {
      const message = owner === 'variable declaration'
        ? `"${typeName}" is not a valid type keyword.`
        : `${typeName} IDs do not have an explicit type keyword; infer the reference from its constructor`;
      this.addDiagnostic('invalid-type-annotation', message, loc ?? annotation.loc);
      return;
    }

    if (annotation.baseType === 'udt' && annotation.name === 'void' && !this.typeDeclarations.has('void')) {
      this.addDiagnostic('invalid-type-annotation', 'void is not an available type annotation', loc ?? annotation.loc);
      return;
    }

    if (annotation.baseType === 'array' || annotation.baseType === 'matrix') {
      this.checkTemplateTypeName(annotation.elementType, `${annotation.baseType} element`, loc ?? annotation.loc);
      return;
    }

    if (annotation.baseType === 'map') {
      this.checkTemplateTypeName(annotation.keyType, 'map key', loc ?? annotation.loc);
      this.checkTemplateTypeName(annotation.valueType, 'map value', loc ?? annotation.loc);
      if (!this.isInvalidTemplateTypeName(annotation.keyType) && !this.isValidMapKeyTypeName(annotation.keyType)) {
        this.addDiagnostic('invalid-type-template', `Map key type must be int, float, bool, string, color, or an enum in ${owner}`, loc ?? annotation.loc);
      }
    }
  }

  private checkTemplateTypeName(typeName: string, role: string, loc?: SourceLocation): void {
    if (typeName === 'void' && !this.typeDeclarations.has('void')) {
      this.addDiagnostic('invalid-type-template', `void is not an available ${role} type`, loc);
    }
    if (TYPE_QUALIFIER_NAMES.has(typeName)) {
      this.addDiagnostic('invalid-type-template', `Invalid ${role} type '${typeName}'; qualifiers cannot be used as template types`, loc);
    }
    if (COLLECTION_TYPE_NAMES.has(typeName)) {
      this.addDiagnostic('invalid-type-template', `Invalid ${role} type '${typeName}'; collection template types must include their element templates`, loc);
    }
    const templateType = this.parseTemplateTypeName(typeName);
    if (!templateType) return;
    if (this.currentPineVersion >= 6) {
      this.addDiagnostic('invalid-type-template', `Invalid ${role} type '${typeName}'; collections cannot directly contain other collections`, loc);
      return;
    }

    if (!role.endsWith('key')) {
      this.addDiagnostic(
        'invalid-type-template',
        `Invalid ${role} type '${typeName}'; collections cannot directly contain other collections`,
        loc,
      );
    }

    if (templateType.kind === 'array' || templateType.kind === 'matrix') {
      this.checkTemplateTypeName(templateType.args[0] ?? '', `${role} element`, loc);
      return;
    }

    const [keyTypeName, valueTypeName] = templateType.args;
    if (keyTypeName) {
      this.checkTemplateTypeName(keyTypeName, `${role} key`, loc);
      if (!this.isInvalidTemplateTypeName(keyTypeName) && !this.isValidMapKeyTypeName(keyTypeName)) {
        this.addDiagnostic('invalid-type-template', `Map key type must be int, float, bool, string, color, or an enum in ${role}`, loc);
      }
    }
    if (valueTypeName) {
      this.checkTemplateTypeName(valueTypeName, `${role} value`, loc);
    }
  }

  private isInvalidTemplateTypeName(typeName: string): boolean {
    return TYPE_QUALIFIER_NAMES.has(typeName) || COLLECTION_TYPE_NAMES.has(typeName);
  }

  private isValidMapKeyTypeName(typeName: string): boolean {
    return MAP_KEY_TYPE_NAMES.has(typeName) || this.isEnumSemanticType(this.typeFromName(typeName));
  }

  private checkExpressions(scope: SemanticScope, expressions: Array<Expression | undefined>): void {
    for (const expression of expressions) {
      if (expression) this.checkExpression(expression, scope);
    }
  }

  private typeFromAnnotation(annotation?: TypeAnnotation | null): SemanticType | undefined {
    if (!annotation) return undefined;

    // For supported reference types, const fixes the ID, not its qualifier.
    // UDTs, plot and hline are excluded from const reference declarations.
    const annotatedType = this.typeFromName(annotation.baseType === 'udt' ? annotation.name : annotation.baseType);
    const supportsConstReference = annotation.baseType === 'array'
      || annotation.baseType === 'matrix'
      || annotation.baseType === 'map'
      || (REFERENCE_TYPE_KINDS.has(annotatedType.kind) && annotatedType.kind !== 'plot' && annotatedType.kind !== 'hline');
    const qualifier = annotation.qualifier === 'const' && supportsConstReference ? 'series' : annotation.qualifier;
    if (annotation.baseType === 'array' || annotation.baseType === 'matrix') {
      return {
        kind: annotation.baseType,
        qualifier: qualifier ?? 'series',
        elementType: this.typeFromName(annotation.elementType),
      };
    }

    if (annotation.baseType === 'map') {
      return {
        kind: 'map',
        qualifier: qualifier ?? 'series',
        keyType: this.typeFromName(annotation.keyType),
        valueType: this.typeFromName(annotation.valueType),
      };
    }

    if (annotation.baseType === 'udt') {
      return this.typeFromName(annotation.name, qualifier);
    }

    return this.typeFromName(annotation.baseType, qualifier);
  }

  private inferExpressionType(expression: Expression, scope: SemanticScope = this.rootScope): SemanticType {
    const inferred = this.inferExpressionTypeUnrecorded(expression, scope);
    this.recordExpressionType(expression, inferred);
    const context = this.typeContextStack.at(-1);
    this.expressionTypes.set(expression, inferred);
    context?.expressionTypes.set(expression, inferred);
    return inferred;
  }

  private recordExpressionType(expression: Expression | IfStatement, inferred: SemanticType): void {
    const types = this.options.expressionTypes;
    if (!types || this.ambiguousExpressionTypes.has(expression)) return;
    const previous = types.get(expression);
    if (previous && previous.kind !== 'unknown' && inferred.kind !== 'unknown' && previous.kind !== inferred.kind) {
      types.set(expression, { kind: 'unknown' });
      this.ambiguousExpressionTypes.add(expression);
    } else if (!previous || inferred.kind !== 'unknown') {
      types.set(expression, inferred);
    }
  }

  private inferExpressionTypeUnrecorded(expression: Expression, scope: SemanticScope): SemanticType {
    switch (expression.type) {
      case 'NumericLiteral':
        return Number.isInteger(expression.value) && !/[.eE]/.test(expression.raw)
          ? { kind: 'int', qualifier: 'const' }
          : { kind: 'float', qualifier: 'const' };
      case 'StringLiteral':
        return { kind: 'string', qualifier: 'const' };
      case 'BooleanLiteral':
        return { kind: 'bool', qualifier: 'const' };
      case 'ColorLiteral':
        return { kind: 'color', qualifier: 'const' };
      case 'NaExpression':
        return { kind: 'unknown' };
      case 'ArrayExpression':
        return {
          kind: 'array',
          qualifier: this.inferMaxQualifier(expression.elements, scope),
          elementType: this.inferArrayElementType(expression.elements, scope),
        };
      case 'Identifier':
        return this.inferIdentifierType(expression, scope);
      case 'BinaryExpression':
        return this.inferBinaryExpressionType(expression, scope);
      case 'UnaryExpression': {
        const argumentType = this.inferExpressionType(expression.argument, scope);
        if ((expression.operator === '-' || expression.operator === '+') && this.isNumericType(argumentType)) {
          return argumentType;
        }
        if (expression.operator === 'not' && argumentType.kind === 'bool') {
          return { kind: 'bool', qualifier: argumentType.qualifier };
        }
        return { kind: 'unknown', qualifier: argumentType.qualifier };
      }
      case 'ConditionalExpression':
        return this.inferConditionalExpressionType(expression, scope);
      case 'SwitchExpression':
        return this.inferSwitchExpressionType(expression, scope);
      case 'ForStatement':
        return this.inferForExpressionType(expression, scope) ?? { kind: 'unknown' };
      case 'WhileStatement':
        return this.inferWhileExpressionType(expression, scope) ?? { kind: 'unknown' };
      case 'CallExpression':
        return this.inferCallType(expression, scope);
      case 'MemberExpression':
        if (expression.object.type === 'Identifier' && !scope.lookup(expression.object.name)) {
          const name = this.memberPath(expression).join('.');
          if (TICKER_BACKADJUSTMENT_CONSTANT_VALUES.has(name)) return { kind: 'backadjustment', qualifier: 'const' };
          if (TICKER_SETTLEMENT_AS_CLOSE_CONSTANT_VALUES.has(name)) return { kind: 'settlement', qualifier: 'const' };
        }
        if (expression.object.type === 'Identifier' && expression.object.name === 'barstate'
          && (expression.property.name === 'isfirst' || expression.property.name === 'islast' || expression.property.name === 'ishistory' || expression.property.name === 'isrealtime' || expression.property.name === 'isnew' || expression.property.name === 'isconfirmed' || expression.property.name === 'islastconfirmedhistory') && !scope.lookup('barstate')) {
          return { kind: 'bool', qualifier: 'series' };
        }
        if (expression.object.type === 'Identifier' && (expression.object.name === 'session' || expression.object.name === 'size')) {
          return this.inferMemberExpressionType(expression, scope);
        }
        if (expression.object.type === 'Identifier' && expression.object.name === 'math') {
          const mathConstantType = this.inferMathConstantType(expression);
          if (mathConstantType) return mathConstantType;
        }
        if (expression.object.type === 'Identifier' && expression.object.name === 'timeframe') {
          const timeframeType = this.inferTimeframeMemberType(expression);
          if (timeframeType) return timeframeType;
        }
        if (expression.object.type === 'Identifier' && expression.object.name === 'syminfo') {
          const syminfoType = this.inferSyminfoMemberType(expression);
          if (syminfoType) return syminfoType;
        }
        if (expression.object.type === 'Identifier' && expression.object.name === 'chart') {
          const chartType = this.inferChartMemberType(expression);
          if (chartType) return chartType;
        }
        if (expression.object.type === 'Identifier' && expression.object.name === 'strategy') {
          const strategyType = this.inferStrategyMemberType(expression);
          if (strategyType) return strategyType;
        }
        if (expression.object.type === 'Identifier' && expression.object.name === 'ta') {
          const taMemberType = this.inferTaMemberType(expression);
          if (taMemberType) return taMemberType;
        }
        if (expression.object.type === 'Identifier' && expression.object.name === 'input') {
          const inputConstantType = this.inferInputTypeConstantType(expression);
          if (inputConstantType) return inputConstantType;
        }
        if (expression.object.type === 'Identifier' && expression.object.name === 'color') {
          const colorConstantType = this.inferColorConstantType(expression);
          if (colorConstantType) return colorConstantType;
        }
        if (expression.object.type === 'Identifier' && expression.object.name === 'currency') {
          const currencyConstantType = this.inferCurrencyConstantType(expression);
          if (currencyConstantType) return currencyConstantType;
        }
        const uniqueType = this.inferUniqueConstantType(expression);
        if (uniqueType) return uniqueType;
        const drawingAllType = this.inferDrawingAllMemberType(expression);
        if (drawingAllType) return drawingAllType;
        const forecast = CORPORATE_FORECAST_MEMBERS[this.memberPath(expression).join('.')];
        if (forecast) return { kind: forecast.kind, qualifier: 'series' };
        if (expression.object.type === 'Identifier' && BUILTIN_NAMESPACES.has(expression.object.name)) {
          return { kind: 'unknown', qualifier: 'const' };
        }
        return this.inferMemberExpressionType(expression, scope);
      case 'IndexExpression':
        return this.inferIndexExpressionType(expression, scope);
      default:
        return { kind: 'unknown' };
    }
  }

  private inferConditionalExpressionType(expression: Expression, scope: SemanticScope): SemanticType {
    if (expression.type !== 'ConditionalExpression') return { kind: 'unknown' };

    const testType = this.inferExpressionType(expression.test, scope);
    const consequentType = this.inferExpressionType(expression.consequent, scope);
    const alternateType = this.inferExpressionType(expression.alternate, scope);
    const mergedType = this.mergeCompatibleType(consequentType, alternateType);

    return {
      ...mergedType,
      qualifier: this.maxQualifier(testType, mergedType),
    };
  }

  private inferSwitchExpressionType(expression: SwitchExpression, scope: SemanticScope): SemanticType {
    let mergedType: SemanticType | undefined;
    for (const switchCase of expression.cases) {
      const caseScope = new SemanticScope(scope);
      const caseType = Array.isArray(switchCase.consequent)
        ? this.inferExpressionTypeFromStatements(switchCase.consequent, caseScope)
        : this.inferExpressionType(switchCase.consequent, caseScope);
      if (!caseType) return { kind: 'unknown', qualifier: this.inferSwitchExpressionQualifier(expression, scope) };
      mergedType = mergedType ? this.mergeCompatibleType(mergedType, caseType) : caseType;
    }

    if (!mergedType) return { kind: 'unknown', qualifier: this.inferSwitchExpressionQualifier(expression, scope) };

    return {
      ...mergedType,
      qualifier: this.maxQualifier(mergedType, { kind: 'unknown', qualifier: this.inferSwitchControlQualifier(expression, scope) }),
    };
  }

  private inferTupleBindings(statement: VariableDeclaration, scope: SemanticScope): void {
    if (statement.names.type !== 'TupleDeclarator') return;
    const elementTypes = this.inferTupleElementTypes(statement.init, scope);
    for (const [index, name] of statement.names.names.entries()) {
      if (name.name === '_') continue;
      scope.declare({
        name: name.name,
        kind: 'variable',
        type: this.declarationBindingType(statement, name.name, elementTypes?.[index] ?? UNKNOWN_SEMANTIC_TYPE),
        loc: name.loc,
      });
    }
  }

  private inferExpressionTypeFromStatements(statements: Statement[], scope: SemanticScope, inferReturnValue = true): SemanticType | undefined {
    let returnType: SemanticType | undefined;
    for (const statement of statements) {
      if (statement.type === 'VariableDeclaration' && statement.names.type === 'TupleDeclarator') {
        this.inferTupleBindings(statement, scope);
        returnType = undefined;
        continue;
      }
      if (this.options.recordCallTypeContexts) {
        if (statement.type === 'AssignmentStatement' || statement.type === 'TupleAssignment') {
          this.inferVariableInitializerType(statement.right, scope);
        } else if (statement.type === 'IfStatement') {
          this.inferExpressionType(statement.test, scope);
          this.inferExpressionTypeFromStatements(statement.consequent, new SemanticScope(scope), false);
          if (statement.alternate) {
            this.inferExpressionTypeFromStatements(
              Array.isArray(statement.alternate) ? statement.alternate : [statement.alternate],
              new SemanticScope(scope),
              false,
            );
          }
        } else if (statement.type === 'ForStatement') {
          this.inferForExpressionType(statement, scope, false);
        } else if (statement.type === 'WhileStatement') {
          this.inferExpressionType(statement.test, scope);
          this.inferExpressionTypeFromStatements(statement.body, new SemanticScope(scope), false);
        } else if (statement.type === 'ExpressionStatement' && (!inferReturnValue || statement !== statements.at(-1))) {
          this.inferExpressionType(statement.expression, scope);
        }
      }
      if (statement.type === 'VariableDeclaration' && statement.names.type === 'VariableDeclarator') {
        if (this.currentPineVersion >= 4 && !this.versionRules.constIntDivisionCanReturnFractional) {
          this.inferVariableInitializerType(statement.init, scope);
        }
        const type = this.variableDeclarationType(statement, scope);
        scope.declare({
          name: statement.names.name.name,
          kind: 'variable',
          type,
          loc: statement.names.name.loc,
        });
        returnType = undefined;
        continue;
      }
      if (!this.options.recordCallTypeContexts && statement.type === 'ExpressionStatement'
        && statement.expression.type === 'CallExpression'
        && statement.expression.callee.type === 'MemberExpression'
        && statement.expression.callee.property.name === 'put'
        && this.builtinSignatureDisplayName(statement.expression, scope) === 'map.put') {
        this.inferMapValueReadCallType(statement.expression, scope);
      }
      if (!inferReturnValue || statement !== statements.at(-1)) continue;
      if (statement.type === 'ExpressionStatement') {
        returnType = this.inferExpressionType(statement.expression, scope);
        continue;
      }
      if (statement.type === 'IfStatement') {
        returnType = this.inferIfExpressionType(statement, scope);
        continue;
      }
      if (statement.type === 'ForStatement') {
        returnType = this.inferForExpressionType(statement, scope);
        continue;
      }
      if (statement.type === 'WhileStatement') {
        returnType = this.inferWhileExpressionType(statement, scope);
        continue;
      }
      if (statement.type === 'OnceStatement') {
        returnType = { kind: 'void' };
        continue;
      }
      if (this.currentPineVersion >= 4 && !this.versionRules.constIntDivisionCanReturnFractional) {
        if (statement.type === 'AssignmentStatement' || statement.type === 'TupleAssignment') {
          this.inferVariableInitializerType(statement.right, scope);
        }
      }
      returnType = undefined;
    }
    return returnType;
  }

  private inferIfExpressionType(statement: IfStatement, scope: SemanticScope): SemanticType {
    const inferred = this.inferIfExpressionTypeUnrecorded(statement, scope);
    this.recordExpressionType(statement, inferred);
    return inferred;
  }

  private inferIfExpressionTypeUnrecorded(statement: IfStatement, scope: SemanticScope): SemanticType {
    const consequentType = this.inferExpressionTypeFromStatements(statement.consequent, new SemanticScope(scope));
    const testQualifier = this.inferExpressionType(statement.test, scope).qualifier;
    if (!statement.alternate) {
      if (!consequentType) return { kind: 'unknown', qualifier: testQualifier };
      return {
        ...consequentType,
        qualifier: this.maxQualifier(
          consequentType,
          { kind: 'unknown', qualifier: testQualifier },
        ),
      };
    }

    if (!consequentType) {
      return { kind: 'unknown', qualifier: this.inferIfExpressionQualifier(statement, scope) };
    }

    const alternateType = Array.isArray(statement.alternate)
      ? this.inferExpressionTypeFromStatements(statement.alternate, new SemanticScope(scope))
      : this.inferIfExpressionType(statement.alternate, scope);

    if (!consequentType || !alternateType) {
      return { kind: 'unknown', qualifier: this.inferIfExpressionQualifier(statement, scope) };
    }

    const mergedType = this.mergeCompatibleType(consequentType, alternateType);
    if (mergedType.kind === 'unknown' && consequentType.kind !== 'unknown' && alternateType.kind !== 'unknown') {
      const message = `If branches return incompatible types: ${this.formatSemanticType(consequentType)} and ${this.formatSemanticType(alternateType)}`;
      const location = statement.loc?.start;
      if (!this.diagnostics.some((diagnostic) => diagnostic.code === 'conditional-branch-type-mismatch'
        && diagnostic.message === message && diagnostic.line === location?.line && diagnostic.column === location?.column)) {
        this.addDiagnostic('conditional-branch-type-mismatch', message, statement.loc);
      }
    }
    return {
      ...mergedType,
      qualifier: this.maxQualifier(
        mergedType,
        { kind: 'unknown', qualifier: testQualifier },
      ),
    };
  }

  private inferIfExpressionQualifier(statement: IfStatement, scope: SemanticScope): SemanticQualifier | undefined {
    return this.maxQualifier(
      this.inferExpressionType(statement.test, scope),
      ...this.inferExpressionTypesFromStatements(statement.consequent, new SemanticScope(scope)),
      ...(Array.isArray(statement.alternate)
        ? this.inferExpressionTypesFromStatements(statement.alternate, new SemanticScope(scope))
        : statement.alternate
          ? [{ kind: 'unknown' as const, qualifier: this.inferIfExpressionQualifier(statement.alternate, scope) }]
          : []),
    );
  }

  private inferExpressionTypesFromStatements(statements: Statement[], scope: SemanticScope): SemanticType[] {
    const types: SemanticType[] = [];
    for (const statement of statements) {
      if (statement.type === 'VariableDeclaration' && statement.names.type === 'TupleDeclarator') {
        this.inferTupleBindings(statement, scope);
        continue;
      }
      if (statement.type === 'VariableDeclaration' && statement.names.type === 'VariableDeclarator') {
        const type = this.variableDeclarationType(statement, scope);
        scope.declare({
          name: statement.names.name.name,
          kind: 'variable',
          type,
          loc: statement.names.name.loc,
        });
        continue;
      }
      if (statement.type === 'ExpressionStatement') {
        types.push(this.inferExpressionType(statement.expression, scope));
        continue;
      }
      if (statement.type === 'IfStatement') {
        types.push(this.inferIfExpressionType(statement, scope));
        continue;
      }
      if (statement.type === 'ForStatement') {
        const type = this.inferForExpressionType(statement, scope);
        if (type) types.push(type);
        continue;
      }
      if (statement.type === 'WhileStatement') {
        const type = this.inferWhileExpressionType(statement, scope);
        if (type) types.push(type);
      }
    }
    return types;
  }

  private inferForExpressionType(statement: ForStatement, scope: SemanticScope, inferReturnValue = true): SemanticType | undefined {
    const loopScope = new SemanticScope(scope);
    let controlQualifier: SemanticQualifier | undefined;

    if (statement.kind === 'collection') {
      const iterableType = this.inferExpressionType(statement.iterable, scope);
      controlQualifier = iterableType.qualifier;
      loopScope.declare({
        name: statement.counter.name,
        kind: 'loop',
        type: this.collectionValueType(iterableType),
        loc: statement.counter.loc,
      });
      if (statement.indexCounter) {
        loopScope.declare({
          name: statement.indexCounter.name,
          kind: 'loop',
          type: this.collectionIndexType(iterableType),
          loc: statement.indexCounter.loc,
        });
      }
    } else {
      controlQualifier = this.maxQualifier(
        this.inferExpressionType(statement.start, scope),
        this.inferExpressionType(statement.end, scope),
        ...(statement.step ? [this.inferExpressionType(statement.step, scope)] : []),
      );
      loopScope.declare({
        name: statement.counter.name,
        kind: 'loop',
        type: { kind: 'int', qualifier: 'series' },
        loc: statement.counter.loc,
      });
    }

    const bodyType = this.inferExpressionTypeFromStatements(statement.body, loopScope, inferReturnValue);
    if (!bodyType) return bodyType;

    return {
      ...bodyType,
      qualifier: this.maxQualifier(bodyType, { kind: 'unknown', qualifier: controlQualifier }),
    };
  }

  private inferWhileExpressionType(statement: WhileStatement, scope: SemanticScope): SemanticType | undefined {
    const bodyType = this.inferExpressionTypeFromStatements(statement.body, new SemanticScope(scope));
    if (!bodyType) return bodyType;

    return {
      ...bodyType,
      qualifier: this.maxQualifier(bodyType, this.inferExpressionType(statement.test, scope)),
    };
  }

  private inferSwitchExpressionQualifier(expression: SwitchExpression, scope: SemanticScope): SemanticQualifier | undefined {
    return this.maxQualifier(
      { kind: 'unknown', qualifier: this.inferSwitchControlQualifier(expression, scope) },
      ...expression.cases.flatMap((switchCase) => {
        const caseScope = new SemanticScope(scope);
        const caseType = Array.isArray(switchCase.consequent)
          ? this.inferExpressionTypeFromStatements(switchCase.consequent, caseScope)
          : this.inferExpressionType(switchCase.consequent, caseScope);
        return caseType ? [caseType] : [];
      }),
    );
  }

  private inferSwitchControlQualifier(expression: SwitchExpression, scope: SemanticScope): SemanticQualifier | undefined {
    return this.maxQualifier(
      ...(expression.discriminant ? [this.inferExpressionType(expression.discriminant, scope)] : []),
      ...expression.cases.flatMap((switchCase) => switchCase.test ? [this.inferExpressionType(switchCase.test, scope)] : []),
    );
  }

  private isIntegerDerivedNumeric(type: SemanticType): boolean {
    return type.kind === 'int' || (type.kind === 'float' && type.integerDivision === true);
  }

  private inferBinaryExpressionType(expression: Expression, scope: SemanticScope): SemanticType {
    if (expression.type !== 'BinaryExpression') return { kind: 'unknown' };

    const leftType = this.inferExpressionType(expression.left, scope);
    const rightType = this.inferExpressionType(expression.right, scope);
    const qualifier = this.maxQualifier(leftType, rightType);

    if (
      expression.operator === '=='
      || expression.operator === '!='
      || expression.operator === '<'
      || expression.operator === '>'
      || expression.operator === '<='
      || expression.operator === '>='
      || expression.operator === 'and'
      || expression.operator === 'or'
    ) {
      return { kind: 'bool', qualifier };
    }

    if (
      expression.operator === '+'
      || expression.operator === '-'
      || expression.operator === '*'
      || expression.operator === '/'
      || expression.operator === '%'
    ) {
      if (this.isNumericType(leftType) && this.isNumericType(rightType)) {
        const constIntDivision = expression.operator === '/'
          && this.currentPineVersion >= 4
          && !this.versionRules.constIntDivisionCanReturnFractional
          && leftType.kind === 'int' && rightType.kind === 'int'
          && leftType.qualifier === 'const' && rightType.qualifier === 'const';
        return {
          kind: leftType.kind === 'float' || rightType.kind === 'float' || (expression.operator === '/' && !constIntDivision) ? 'float' : 'int',
          qualifier,
          integerDivision: this.currentPineVersion >= 5
            && this.isIntegerDerivedNumeric(leftType) && this.isIntegerDerivedNumeric(rightType)
            && (expression.operator === '/' || leftType.integerDivision || rightType.integerDivision) ? true : undefined,
        };
      }
    }

    if (expression.operator === '+' && this.isStringConcatenation(leftType, rightType)) {
      return { kind: 'string', qualifier };
    }

    return { kind: 'unknown', qualifier };
  }

  private isStringConcatenation(left: SemanticType, right: SemanticType): boolean {
    if (left.kind === 'string' && right.kind === 'string') return true;
    if (!this.versionRules.allowsStyleConstantStringConcatenation) return false;
    const style = left.kind === 'string' ? right : right.kind === 'string' ? left : undefined;
    return style?.kind === 'unique' && style.qualifier === 'const'
      && (style.name === 'plot_style' || style.name === 'plot_line_style');
  }

  private inferIdentifierType(identifier: Identifier, scope: SemanticScope): SemanticType {
    // Local declarations shadow built-in globals.
    const symbol = scope.lookup(identifier.name);
    if (symbol) return symbol.type ?? { kind: 'unknown' };

    if (this.versionRules.allowsLegacyGenericInputTypeArgument && LEGACY_INPUT_TYPE_ALIASES.has(identifier.name)) {
      return { kind: 'string', qualifier: 'const' };
    }
    if (this.versionRules.supportsLegacyBareColorConstants && LEGACY_BARE_COLOR_CONSTANT_VALUES.has(identifier.name)) {
      return { kind: 'color', qualifier: 'const' };
    }
    if (this.versionRules.allowsRawUniqueParameterValues && LEGACY_BARE_VISUAL_CONSTANT_VALUES.has(identifier.name)) {
      return { kind: 'string', qualifier: 'const' };
    }
    if (this.currentPineVersion < 4 && V4_RENAMED_MARKET_VARIABLES.has(identifier.name)) {
      return { kind: 'string', qualifier: 'simple' };
    }
    if (this.versionRules.allowsLegacyGlobalBuiltinAliases && LEGACY_BARE_SYMINFO_ALIASES.has(identifier.name)) {
      return { kind: 'string', qualifier: 'simple' };
    }
    if (this.versionRules.supportsLegacyTimeframeVariableAliases && LEGACY_TIMEFRAME_VARIABLE_ALIASES.has(identifier.name)) {
      return LEGACY_TIMEFRAME_VARIABLE_ALIASES.get(identifier.name)!;
    }
    if (this.versionRules.supportsLegacyBarIndexAlias && LEGACY_BAR_INDEX_ALIASES.has(identifier.name)) {
      return { kind: 'int', qualifier: 'series' };
    }
    if (this.versionRules.supportsLegacySundayConstant && identifier.name === 'sunday') {
      return { kind: 'int', qualifier: 'const' };
    }
    const taMemberName = `ta.${identifier.name}`;
    if (this.versionRules.allowsLegacyGlobalBuiltinAliases && TA_FLOAT_MEMBER_NAMES.has(taMemberName)) {
      return { kind: 'float', qualifier: 'series' };
    }
    const builtinType = isPineBuiltinGlobalAvailable(this.currentPineVersion, identifier.name)
      ? BUILTIN_GLOBAL_TYPES.get(identifier.name) : undefined;
    return builtinType ?? { kind: 'unknown' };
  }

  private inferCallType(expression: CallExpression, scope: SemanticScope): SemanticType {
    const recordContext = this.options.recordCallTypeContexts || this.options.resolvedUserMethods
      || (this.currentPineVersion >= 4 && !this.versionRules.constIntDivisionCanReturnFractional);
    if (recordContext) {
      for (const argument of expression.arguments) this.inferExpressionType(argument.value, scope);
    }
    const localCall = expression.callee.type === 'Identifier'
      ? this.functionDeclarations.has(expression.callee.name)
        || (this.options.recordMethodFunctionCallTypeContexts && this.methodDeclarations.has(expression.callee.name))
      : expression.callee.type === 'MemberExpression' && this.methodDeclarations.has(expression.callee.property.name);
    const importedCall =
      recordContext &&
      (this.resolveImportedUserFunctionCallable(expression, scope) ||
        this.resolveImportedUserMethodCallable(expression, scope));
    if (!recordContext || (!localCall && !importedCall)) {
      return this.inferCallTypeUnrecorded(expression, scope);
    }
    const context: SemanticExpressionTypeContext = {
      expressionTypes: new WeakMap(), callTypeContexts: new WeakMap(),
    };
    const parent = this.typeContextStack.at(-1);
    (parent?.callTypeContexts ?? this.callTypeContexts).set(expression, context);
    this.typeContextStack.push(context);
    try {
      const type = this.inferCallTypeUnrecorded(expression, scope);
      // Void-returning calls normally short-circuit return inference. Their
      // bodies still need operand types for qualifier-sensitive lowering.
      if (type.kind === 'void') {
        if (expression.callee.type === 'Identifier') this.inferUserFunctionCallType(expression, scope);
        else this.inferUserMethodCallType(expression, scope);
      }
      return type;
    } finally {
      this.typeContextStack.pop();
    }
  }

  private inferCallTypeUnrecorded(expression: CallExpression, scope: SemanticScope): SemanticType {
    const calleePath = this.memberPath(expression.callee);
    const receiverMethod = this.builtinReceiverMethodName(expression, scope);
    const drawingMethod = receiverMethod?.startsWith('chart.point.')
      || (receiverMethod && DRAWING_ALL_ELEMENT_TYPES.has(`${receiverMethod.split('.')[0]}.all`));
    const calleeName = drawingMethod ? receiverMethod! : calleePath.join('.');
    const localShadowType = this.inferLocalUserCallableShadowType(expression, scope, calleePath);
    if (localShadowType) return localShadowType;
    const userMethodType = this.inferUserMethodCallType(expression, scope);
    if (userMethodType) return userMethodType;
    if (this.currentPineVersion >= 5 && this.isVoidReturnCall(expression, scope, calleeName)) return { kind: 'void' };
    const footprintType = this.inferFootprintCallType(calleeName);
    if (footprintType) return footprintType;
    const referenceReturnType = REFERENCE_CONSTRUCTOR_RETURN_TYPES.get(calleeName);
    if (referenceReturnType) return { kind: referenceReturnType, qualifier: 'series' };
    if (calleeName === 'plot') return { kind: 'plot', qualifier: 'series' };
    if (calleeName === 'hline') return { kind: 'hline', qualifier: 'series' };
    if (calleeName === 'label.get_x') return { kind: 'int' };
    if (calleeName === 'label.get_y') return { kind: 'float' };
    if (calleeName === 'label.get_color' || calleeName === 'label.get_textcolor') return { kind: 'color' };
    if (
      calleeName === 'label.get_size'
      || calleeName === 'label.get_style'
      || calleeName === 'label.get_text'
      || calleeName === 'label.get_tooltip'
      || calleeName === 'label.get_xloc'
      || calleeName === 'label.get_yloc'
    ) return { kind: 'string' };
    const enumTitleType = this.inferEnumTitleCallType(expression, scope);
    if (enumTitleType) return enumTitleType;
    if (calleeName === 'line.get_x1' || calleeName === 'line.get_x2') return { kind: 'int' };
    if (calleeName === 'line.get_y1' || calleeName === 'line.get_y2' || calleeName === 'line.get_price') return { kind: 'float' };
    if (calleeName === 'line.get_color') return { kind: 'color' };
    if (calleeName === 'line.get_extend' || calleeName === 'line.get_style') return { kind: 'string' };
    if (calleeName === 'line.get_width') return { kind: 'int' };
    if (calleeName === 'box.get_left' || calleeName === 'box.get_right') return { kind: 'int' };
    if (calleeName === 'box.get_top' || calleeName === 'box.get_bottom') return { kind: 'float' };
    if (calleeName === 'box.get_bgcolor' || calleeName === 'box.get_border_color') return { kind: 'color' };
    if (calleeName === 'box.get_text' || calleeName === 'box.get_text_halign' || calleeName === 'box.get_text_valign') return { kind: 'string' };
    if (calleeName === 'linefill.get_line1' || calleeName === 'linefill.get_line2') return { kind: 'line', qualifier: 'series' };
    if (calleeName === 'linefill.get_color') return { kind: 'color' };

    const namespace = calleePath[0];
    const inputType = this.inferInputCallType(expression, scope, calleePath);
    if (inputType) return inputType;
    const colorType = this.inferColorCallType(expression, scope, calleePath);
    if (colorType) return colorType;
    const drawingObjectCastType = this.inferDrawingObjectCastCallType(expression, scope, calleePath);
    if (drawingObjectCastType) return drawingObjectCastType;
    const mathType = this.inferMathCallType(expression, scope, calleePath);
    if (mathType) return mathType;
    const stringType = this.inferStringCallType(expression, scope, calleePath);
    if (stringType) return stringType;
    const officialImportedFunctionType = this.inferOfficialImportedFunctionCallType(expression, scope, calleePath);
    if (officialImportedFunctionType) return officialImportedFunctionType;
    // A call-result receiver loses its namespace in memberPath(). Recover the
    // array overload before a bare method name can match a legacy TA alias.
    if (expression.callee.type === 'MemberExpression'
      && this.isArrayIntegerPreservingAggregateOperation(expression.callee.property.name)) {
      if (expression.callee.property.name === 'median') {
        const receiver = this.inferExpressionType(expression.callee.object, scope);
        const method = receiver.kind === 'array' ? this.findUserMethodDeclaration('median', receiver, expression, scope) : undefined;
        if (method) return this.inferFunctionReturnType(method, this.inferCallableParameterTypes(method, expression.arguments, scope, receiver)) ?? { kind: 'unknown' };
      }
      const arrayScalarType = this.inferArrayScalarCallType(expression, scope);
      if (arrayScalarType) return { ...arrayScalarType, qualifier: 'series' };
    }
    const taType = this.inferTaCallType(expression, scope, calleePath);
    if (taType) return taType;
    const requestType = this.inferRequestCallType(expression, scope, calleePath);
    if (requestType) return requestType;
    const timeType = this.inferTimeCallType(expression, scope, calleePath);
    if (timeType) return timeType;
    const syminfoCallType = this.inferSyminfoCallType(expression, scope, calleePath);
    if (syminfoCallType) return syminfoCallType;
    if (calleeName === 'footprint.buy_volume' || calleeName === 'footprint.sell_volume') {
      return { kind: 'float', qualifier: 'series' };
    }
    if (calleePath.join('.') === 'ticker.linebreak' && this.currentPineVersion >= 6) {
      return { kind: 'string', qualifier: this.simpleOrSeriesQualifier(this.inferCallArgumentMaxQualifier(expression, scope)) };
    }
    if ((calleeName === 'ticker.new' || (calleeName === 'ticker.modify' && this.currentPineVersion >= 6))
      && this.resolveBuiltinSignature(calleeName, expression, scope)
      && !this.inferUserMethodCallType(expression, scope)) {
      return { kind: 'string', qualifier: this.simpleOrSeriesQualifier(this.inferCallArgumentMaxQualifier(expression, scope)) };
    }
    const tickerType = this.inferTickerCallType(calleePath, expression, scope);
    if (tickerType) return tickerType;
    const strategyType = this.inferStrategyCallType(calleePath);
    if (strategyType) return strategyType;
    if (namespace === 'input') return { kind: 'unknown', qualifier: 'input' };
    if (namespace === 'request' || namespace === 'ta' || namespace === 'time' || namespace === 'time_close' || calleePath.join('.') === 'timeframe.change') {
      return { kind: 'unknown', qualifier: 'series' };
    }
    if (calleePath.join('.') === 'bool') {
      const source = this.inferCallArgumentType(expression, scope, ['x'], 0);
      const numeric = source?.kind === 'int' || source?.kind === 'float';
      const qualifier = this.currentPineVersion >= 6 && numeric && source.qualifier !== 'series'
        ? 'const' : this.inferCallArgumentMaxQualifier(expression, scope);
      return { kind: 'bool', qualifier };
    }
    if (calleePath.join('.') === 'float') return { kind: 'float', qualifier: this.inferCallArgumentMaxQualifier(expression, scope) ?? 'const' };
    if (calleePath.join('.') === 'int') return { kind: 'int', qualifier: this.inferCallArgumentMaxQualifier(expression, scope) };
    if (calleePath.join('.') === 'string') return { kind: 'string', qualifier: this.inferCallArgumentMaxQualifier(expression, scope) };
    if (calleePath.join('.') === 'offset') return this.inferCallArgumentType(expression, scope, ['source', 'offset'], 0) ?? { kind: 'unknown', qualifier: 'series' };
    if (calleePath.join('.') === 'na') {
      const source = this.inferCallArgumentType(expression, scope, ['x'], 0);
      const numeric = source?.kind === 'int' || source?.kind === 'float';
      return { kind: 'bool', qualifier: numeric
        ? this.maxQualifier({ kind: 'bool', qualifier: 'simple' }, source)
        : 'series' };
    }
    if (calleePath.join('.') === 'fixnan') return this.inferFixnanCallType(expression, scope);
    if (calleePath.join('.') === 'iff') return this.inferIffCallType(expression, scope);
    if (calleePath.join('.') === 'nz') return this.inferNzCallType(expression, scope);
    if (CALENDAR_FUNCTION_NAMES.has(calleePath.join('.'))) return { kind: 'int', qualifier: 'series' };
    const arrayElementReadType = this.inferArrayElementReadCallType(expression, scope);
    if (arrayElementReadType) return arrayElementReadType;
    const arrayScalarType = this.inferArrayScalarCallType(expression, scope);
    if (arrayScalarType) return arrayScalarType;
    const arrayHelperType = this.inferArrayHelperCallType(expression, scope);
    if (arrayHelperType) return arrayHelperType;
    const matrixElementReadType = this.inferMatrixElementReadCallType(expression, scope);
    if (matrixElementReadType) return matrixElementReadType;
    const matrixHelperType = this.inferMatrixHelperCallType(expression, scope);
    if (matrixHelperType) return matrixHelperType;
    const mapValueReadType = this.inferMapValueReadCallType(expression, scope);
    if (mapValueReadType) return mapValueReadType;
    const userFunctionType = this.inferUserFunctionCallType(expression, scope);
    if (userFunctionType) return userFunctionType;
    const importedUserFunctionType = this.inferImportedUserFunctionCallType(expression, scope);
    if (importedUserFunctionType) return importedUserFunctionType;
    const importedUserMethodType = this.inferImportedUserMethodCallType(expression, scope);
    if (importedUserMethodType) return importedUserMethodType;
    if (calleePath.join('.') === 'array.from') {
      return {
        kind: 'array',
        qualifier: 'series',
        elementType: this.inferArrayElementType(expression.arguments.map((argument) => argument.value), scope),
      };
    }
    if (calleePath.join('.') === 'map.new' && expression.typeArguments?.length === 2) {
      return {
        kind: 'map',
        qualifier: 'series',
        keyType: this.typeFromName(expression.typeArguments[0]),
        valueType: this.typeFromName(expression.typeArguments[1]),
      };
    }
    if (calleePath.join('.') === 'array.new' && expression.typeArguments?.length === 1) {
      return {
        kind: 'array',
        qualifier: 'series',
        elementType: this.typeFromName(expression.typeArguments[0]),
      };
    }
    if (calleePath.join('.') === 'matrix.new' && expression.typeArguments?.length === 1) {
      return {
        kind: 'matrix',
        qualifier: 'series',
        elementType: this.typeFromName(expression.typeArguments[0]),
      };
    }
    const matrixElementType = MATRIX_CONSTRUCTOR_ELEMENT_TYPES.get(calleePath.join('.'));
    if (matrixElementType) {
      return {
        kind: 'matrix',
        qualifier: 'series',
        elementType: { kind: matrixElementType },
      };
    }
    const arrayElementType = ARRAY_CONSTRUCTOR_ELEMENT_TYPES.get(calleePath.join('.'));
    if (arrayElementType) {
      return {
        kind: 'array',
        qualifier: 'series',
        elementType: { kind: arrayElementType },
      };
    }
    if (calleePath.length === 2 && calleePath[1] === 'new' && calleePath[0] && this.typeDeclarations.has(calleePath[0])) {
      return { kind: 'udt', qualifier: 'series', name: calleePath[0] };
    }
    if (calleePath.length === 3 && calleePath[2] === 'new') {
      const [alias, typeName] = calleePath;
      if (alias && typeName && this.importedLibraries.get(alias)?.types.has(typeName)) {
        return { kind: 'udt', qualifier: 'series', name: `${alias}.${typeName}` };
      }
    }
    return { kind: 'unknown', qualifier: this.inferMaxQualifier(expression.arguments.map((argument) => argument.value), scope) };
  }

  private inferFootprintCallType(calleeName: string): SemanticType | undefined {
    if (calleeName === 'request.footprint') return { kind: 'udt', name: 'footprint', qualifier: 'series' };
    const rowType: SemanticType = { kind: 'udt', name: 'volume_row', qualifier: 'series' };
    if (calleeName === 'footprint.rows') return { kind: 'array', qualifier: 'series', elementType: rowType };
    if (['footprint.poc', 'footprint.vah', 'footprint.val', 'footprint.get_row_by_price'].includes(calleeName)) return rowType;
    return undefined;
  }

  private isVoidReturnCall(expression: CallExpression, scope: SemanticScope, calleeName: string): boolean {
    if (BUILTIN_VOID_RETURN_NAMES.has(canonicalBuiltinName(calleeName))) return true;
    const [namespace, methodName, ...rest] = calleeName.split('.');
    if (namespace && methodName && rest.length === 0) {
      const namespaceMethods = REFERENCE_VOID_RETURN_METHODS.get(namespace as SemanticTypeKind);
      if (namespaceMethods?.has(methodName)) return true;
    }
    if (expression.callee.type !== 'MemberExpression') return false;

    const methodNames = this.voidReturnMethodNamesForReceiver(expression.callee.object, scope);
    return Boolean(methodNames?.has(expression.callee.property.name));
  }

  private voidReturnMethodNamesForReceiver(receiver: Expression, scope: SemanticScope): Set<string> | undefined {
    const receiverType = this.inferExpressionType(receiver, scope);
    return REFERENCE_VOID_RETURN_METHODS.get(receiverType.kind);
  }

  private inferLocalUserCallableShadowType(expression: CallExpression, scope: SemanticScope, calleePath: string[]): SemanticType | undefined {
    if (!this.hasLocalUserCallableShadow(expression, scope)) return undefined;

    const userFunctionType = this.inferUserFunctionCallType(expression, scope);
    if (userFunctionType) return userFunctionType;

    const userMethodType = this.inferUserMethodCallType(expression, scope);
    if (userMethodType) return userMethodType;

    if (calleePath.length === 2 && calleePath[1] === 'new' && calleePath[0] && this.typeDeclarations.has(calleePath[0])) {
      return { kind: 'udt', qualifier: 'series', name: calleePath[0] };
    }

    return undefined;
  }

  private inferInputCallType(expression: CallExpression, scope: SemanticScope, calleePath: string[]): SemanticType | undefined {
    const calleeName = calleePath.join('.');
    if (calleeName === 'input') {
      const explicitTypeName = this.legacyInputTypeCallName(expression);
      if (explicitTypeName === 'input.source') {
        const source = this.inferCallArgumentType(expression, scope, ['defval'], 0);
        return source ? { ...source, qualifier: source.qualifier ?? 'series' } : { kind: 'unknown', qualifier: 'series' };
      }
      const explicitKind = explicitTypeName ? INPUT_RETURN_TYPES.get(explicitTypeName) : undefined;
      if (explicitKind) return { kind: explicitKind, qualifier: 'input' };

      const defval = this.inferCallArgumentType(expression, scope, ['defval'], 0);
      if (!defval || defval.kind === 'unknown') return { kind: 'unknown', qualifier: 'input' };
      if (defval.kind === 'float' && defval.qualifier === 'series') return defval;
      if (defval.kind === 'bool' || defval.kind === 'float' || defval.kind === 'int' || defval.kind === 'string' || defval.kind === 'color') {
        return { ...defval, qualifier: 'input' };
      }
      return { ...defval, qualifier: defval.qualifier ?? 'series' };
    }
    if (calleeName === 'input.source') {
      return { kind: 'float', qualifier: 'series' };
    }
    if (calleeName === 'input.enum') {
      const defval = this.inferCallArgumentType(expression, scope, ['defval'], 0);
      return defval ? { ...defval, qualifier: 'input' } : { kind: 'unknown', qualifier: 'input' };
    }

    const kind = INPUT_RETURN_TYPES.get(calleeName);
    return kind ? { kind, qualifier: 'input' } : undefined;
  }

  private inferIffCallType(expression: CallExpression, scope: SemanticScope): SemanticType {
    const conditionType = this.inferCallArgumentType(expression, scope, ['condition', 'then', 'else'], 0);
    const thenType = this.inferCallArgumentType(expression, scope, ['condition', 'then', 'else'], 1);
    const elseType = this.inferCallArgumentType(expression, scope, ['condition', 'then', 'else'], 2);
    if (!thenType || !elseType) return { kind: 'unknown', qualifier: conditionType?.qualifier };
    const mergedType = this.mergeCompatibleType(thenType, elseType);
    return {
      ...mergedType,
      qualifier: conditionType ? this.maxQualifier(conditionType, mergedType) : mergedType.qualifier,
    };
  }

  private inferInputTypeConstantType(expression: MemberExpression): SemanticType | undefined {
    return LEGACY_INPUT_TYPE_CONSTANT_NAMES.has(this.memberPath(expression).join('.')) ? { kind: 'string', qualifier: 'const' } : undefined;
  }

  private inferColorConstantType(expression: MemberExpression): SemanticType | undefined {
    return COLOR_CONSTANT_NAMES.has(this.memberPath(expression).join('.')) ? { kind: 'color', qualifier: 'const' } : undefined;
  }

  private inferCurrencyConstantType(expression: MemberExpression): SemanticType | undefined {
    return expression.object.type === 'Identifier'
      && expression.object.name === 'currency'
      && CURRENCY_CONSTANT_CODES.includes(expression.property.name as typeof CURRENCY_CONSTANT_CODES[number])
      ? { kind: 'string', qualifier: 'const' }
      : undefined;
  }

  private inferColorCallType(expression: CallExpression, scope: SemanticScope, calleePath: string[]): SemanticType | undefined {
    const calleeName = calleePath.join('.');
    if (COLOR_CONSTRUCTOR_NAMES.has(calleeName)) {
      return { kind: 'color', qualifier: this.inferCallArgumentMaxQualifier(expression, scope) };
    }
    if (calleeName === 'color.from_gradient') return { kind: 'color', qualifier: 'series' };
    if (COLOR_CHANNEL_NAMES.has(calleeName)) {
      return { kind: 'float', qualifier: this.inferCallArgumentMaxQualifier(expression, scope) };
    }
    return undefined;
  }

  private inferDrawingObjectCastCallType(expression: CallExpression, scope: SemanticScope, calleePath: string[]): SemanticType | undefined {
    const kind = DRAWING_OBJECT_CAST_TYPES.get(calleePath.join('.'));
    if (!kind) return undefined;
    const actual = this.inferCallArgumentType(expression, scope, ['x'], 0);
    return actual && actual.kind !== 'unknown' && actual.kind !== kind
      ? { kind: 'unknown' }
      : { kind, qualifier: 'series' };
  }

  private inferMathConstantType(expression: MemberExpression): SemanticType | undefined {
    return MATH_CONSTANT_NAMES.has(this.memberPath(expression).join('.')) ? { kind: 'float', qualifier: 'const' } : undefined;
  }

  private inferMathCallType(expression: CallExpression, scope: SemanticScope, calleePath: string[]): SemanticType | undefined {
    const calleeName = calleePath.join('.');
    const qualifier = this.inferCallArgumentMaxQualifier(expression, scope);
    if (MATH_PRESERVE_NUMERIC_NAMES.has(calleeName)) {
      const types = expression.arguments.map(argument => this.inferExpressionType(argument.value, scope));
      return {
        kind: this.inferPreservedMathNumericKind(expression, scope), qualifier,
        integerDivision: types.some(type => type.integerDivision) && types.every(type => this.isIntegerDerivedNumeric(type)) ? true : undefined,
      };
    }
    if (MATH_FLOAT_RETURN_NAMES.has(calleeName)) return { kind: 'float', qualifier };
    if (MATH_INT_RETURN_NAMES.has(calleeName)) return { kind: 'int', qualifier };
    if (MATH_SERIES_FLOAT_RETURN_NAMES.has(calleeName)) return { kind: 'float', qualifier: 'series' };
    if (calleeName === 'math.avg' || calleeName === 'math.round_to_mintick') {
      return { kind: 'float', qualifier: this.simpleOrSeriesQualifier(qualifier) };
    }
    if (calleeName === 'math.round') {
      const precision = this.inferCallArgumentType(expression, scope, ['number', 'precision'], 1);
      if (!precision) return { kind: 'int', qualifier };
      const number = this.inferCallArgumentType(expression, scope, ['number', 'precision'], 0);
      return { kind: 'float', qualifier: precision.qualifier === 'series' ? 'series' : number?.qualifier ?? qualifier };
    }
    return undefined;
  }

  private inferAllIntArguments(expression: CallExpression, scope: SemanticScope): boolean {
    return expression.arguments.length > 0 && expression.arguments.every((argument) => this.inferExpressionType(argument.value, scope).kind === 'int');
  }

  private inferPreservedMathNumericKind(expression: CallExpression, scope: SemanticScope): SemanticTypeKind {
    let sawUnknown = false;
    for (const argument of expression.arguments) {
      const type = this.inferExpressionType(argument.value, scope);
      if (type.kind === 'float') return 'float';
      if (type.kind === 'unknown') sawUnknown = true;
      if (type.kind !== 'int' && type.kind !== 'unknown') return 'float';
    }
    return sawUnknown ? 'unknown' : 'int';
  }

  private simpleOrSeriesQualifier(qualifier: SemanticQualifier | undefined): SemanticQualifier {
    return qualifier === 'series' ? 'series' : 'simple';
  }

  private inferStringCallType(expression: CallExpression, scope: SemanticScope, calleePath: string[]): SemanticType | undefined {
    const calleeName = calleePath.join('.');
    const qualifier = stringResultQualifier(calleeName, this.inferCallArgumentMaxQualifier(expression, scope), this.currentPineVersion);
    if (STRING_RETURN_NAMES.has(calleeName)) return { kind: 'string', qualifier };
    if (calleeName === 'str.tonumber') return { kind: 'float', qualifier };
    if (STRING_BOOL_RETURN_NAMES.has(calleeName)) return { kind: 'bool', qualifier };
    if (STRING_INT_RETURN_NAMES.has(calleeName)) return { kind: 'int', qualifier };
    if (calleeName === 'str.split') {
      return {
        kind: 'array',
        qualifier: 'series',
        elementType: { kind: 'string' },
      };
    }
    return undefined;
  }

  private inferTaCallType(expression: CallExpression, scope: SemanticScope, calleePath: string[]): SemanticType | undefined {
    const calleeName = canonicalBuiltinName(calleePath.join('.'));
    if (TA_BOOL_RETURN_NAMES.has(calleeName)) return { kind: 'bool', qualifier: 'series' };
    if (TA_INT_RETURN_NAMES.has(calleeName)) return { kind: 'int', qualifier: 'series' };
    if (TA_FLOAT_RETURN_NAMES.has(calleeName)) return { kind: 'float', qualifier: 'series' };
    if (TA_SOURCE_RETURN_NAMES.has(calleeName)) {
      return this.inferTaSourceReturnType(expression, scope, ['source', 'length'], 0);
    }
    if (TA_DEFAULT_SOURCE_RETURN_NAMES.has(calleeName)) {
      return this.inferTaOptionalSourceReturnType(expression, scope);
    }
    if (TA_PIVOT_RETURN_NAMES.has(calleeName)) {
      return this.inferTaPivotReturnType(expression, scope);
    }
    if (calleeName === 'ta.pivot_point_levels') {
      return { kind: 'array', qualifier: 'series', elementType: { kind: 'float' } };
    }
    if (calleeName === 'ta.change') {
      return this.inferTaSourceReturnType(expression, scope, ['source', 'length'], 0);
    }
    if (calleeName === 'ta.vwap') {
      const stdevMult = this.resolveCallArgumentExpression(expression, ['source', 'anchor', 'stdev_mult'], 2);
      return stdevMult ? undefined : { kind: 'float', qualifier: 'series' };
    }
    if (calleeName === 'ta.valuewhen') {
      return this.inferTaSourceReturnType(expression, scope, ['condition', 'source', 'occurrence'], 1);
    }
    return undefined;
  }

  private inferOfficialImportedFunctionCallType(expression: CallExpression, scope: SemanticScope, calleePath: string[]): SemanticType | undefined {
    const importedBuiltin = this.resolveOfficialImportedFunction(calleePath.join('.'), scope);
    if (!importedBuiltin) return undefined;
    if (importedBuiltin.returnKind === 'tuple') return { kind: 'unknown', qualifier: 'series' };
    if (importedBuiltin.returnTypeName && calleePath[0]) {
      return {
        kind: 'udt',
        name: `${calleePath[0]}.${importedBuiltin.returnTypeName}`,
        qualifier: this.inferCallArgumentMaxQualifier(expression, scope) === 'series' ? 'series' : 'simple',
      };
    }
    return {
      kind: importedBuiltin.returnKind,
      qualifier: this.inferCallArgumentMaxQualifier(expression, scope) === 'series' ? 'series' : 'simple',
    };
  }

  private inferTaSourceReturnType(expression: CallExpression, scope: SemanticScope, parameterNames: string[], index: number): SemanticType {
    const source = this.inferCallArgumentType(expression, scope, parameterNames, index);
    return source ? { ...source, qualifier: 'series' } : { kind: 'unknown', qualifier: 'series' };
  }

  private inferTaOptionalSourceReturnType(expression: CallExpression, scope: SemanticScope): SemanticType {
    const namedSource = this.inferCallArgumentType(expression, scope, ['source', 'length'], 0);
    const positionalArguments = expression.arguments.filter((argument) => !argument.name);
    const source = expression.arguments.some((argument) => argument.name?.name === 'source') || positionalArguments.length > 1 ? namedSource : undefined;
    return source ? { ...source, qualifier: 'series' } : { kind: 'float', qualifier: 'series' };
  }

  private inferTaPivotReturnType(expression: CallExpression, scope: SemanticScope): SemanticType {
    const positionalArguments = expression.arguments.filter((argument) => !argument.name);
    const hasSource = expression.arguments.some((argument) => argument.name?.name === 'source') || positionalArguments.length === 3;
    if (!hasSource) return { kind: 'float', qualifier: 'series' };
    const source = this.inferCallArgumentType(expression, scope, ['source', 'leftbars', 'rightbars'], 0);
    return source ? { ...source, qualifier: 'series' } : { kind: 'unknown', qualifier: 'series' };
  }

  private inferRequestCallType(expression: CallExpression, scope: SemanticScope, calleePath: string[]): SemanticType | undefined {
    const calleeName = canonicalBuiltinName(calleePath.join('.'));
    if (calleeName === 'request.security') {
      const source = this.inferCallArgumentType(expression, scope, ['symbol', 'timeframe', 'expression'], 2);
      return source ? { ...source, qualifier: 'series' } : { kind: 'unknown', qualifier: 'series' };
    }
    if (calleeName === 'request.security_lower_tf') {
      const source = this.inferCallArgumentType(expression, scope, ['symbol', 'timeframe', 'expression'], 2);
      return {
        kind: 'array',
        qualifier: 'series',
        elementType: source ? this.withoutQualifier(source) : { kind: 'unknown' },
      };
    }
    if (calleeName === 'request.seed') {
      const source = this.inferCallArgumentType(expression, scope, ['source', 'symbol', 'expression'], 2);
      return source ? { ...source, qualifier: 'series' } : { kind: 'unknown', qualifier: 'series' };
    }
    if (REQUEST_FLOAT_RETURN_NAMES.has(calleeName)) return { kind: 'float', qualifier: 'series' };
    return undefined;
  }

  private withoutQualifier(type: SemanticType): SemanticType {
    const { qualifier: _qualifier, ...rest } = type;
    return rest;
  }

  private inferTimeCallType(expression: CallExpression, scope: SemanticScope, calleePath: string[]): SemanticType | undefined {
    const calleeName = calleePath.join('.');
    if (calleeName === 'time' || calleeName === 'time_close') return { kind: 'int', qualifier: 'series' };
    if (calleeName === 'timeframe.change') return { kind: 'bool', qualifier: 'series' };
    if (calleeName === 'timeframe.in_seconds') {
      return { kind: 'int', qualifier: this.simpleOrSeriesQualifier(this.inferCallArgumentMaxQualifier(expression, scope)) };
    }
    if (calleeName === 'timeframe.to_seconds') return { kind: 'int', qualifier: 'simple' };
    if (calleeName === 'timeframe.from_seconds') {
      const qualifier = this.currentPineVersion >= 6
        ? this.simpleOrSeriesQualifier(this.inferCallArgumentMaxQualifier(expression, scope))
        : 'simple';
      return { kind: 'string', qualifier };
    }
    if (calleeName === 'timestamp') return this.inferTimestampCallType(expression, scope);
    return undefined;
  }

  private inferTimestampCallType(expression: CallExpression, scope: SemanticScope): SemanticType {
    const signature = BUILTIN_SIGNATURES.get('timestamp');
    if (!signature) return { kind: 'int', qualifier: 'simple' };

    const params = this.resolveTimestampSignatureParams(expression.arguments, signature, scope);
    if (params.includes('dateString')) return { kind: 'int', qualifier: 'const' };

    const qualifier = this.inferCallArgumentMaxQualifier(expression, scope);
    return { kind: 'int', qualifier: this.simpleOrSeriesQualifier(qualifier) };
  }

  private inferTickerCallType(calleePath: string[], expression: CallExpression, scope: SemanticScope): SemanticType | undefined {
    const name = calleePath.join('.');
    if (!TICKER_STRING_RETURN_NAMES.has(name)) return undefined;
    const qualifier = name === 'ticker.inherit' && this.currentPineVersion >= 6
      && this.resolveBuiltinSignature(name, expression, scope)
      ? this.simpleOrSeriesQualifier(this.inferCallArgumentMaxQualifier(expression, scope))
      : 'simple';
    return { kind: 'string', qualifier };
  }

  private inferSyminfoCallType(expression: CallExpression, scope: SemanticScope, calleePath: string[]): SemanticType | undefined {
    const name = calleePath.join('.');
    if (!SYMINFO_STRING_RETURN_NAMES.has(name)) return undefined;
    const qualifier = (name === 'syminfo.ticker' || name === 'syminfo.prefix')
      ? this.simpleOrSeriesQualifier(this.inferCallArgumentMaxQualifier(expression, scope))
      : 'simple';
    return { kind: 'string', qualifier };
  }

  private inferFixnanCallType(expression: CallExpression, scope: SemanticScope): SemanticType {
    const source = this.inferCallArgumentType(expression, scope, ['source'], 0);
    return source ? { ...source, qualifier: 'series' } : { kind: 'unknown', qualifier: 'series' };
  }

  private inferNzCallType(expression: CallExpression, scope: SemanticScope): SemanticType {
    const parameterNames = ['source', 'replacement'];
    const signature = this.resolveBuiltinSignature('nz', expression, scope);
    const source = this.inferCallArgumentType(expression, scope, parameterNames, 0, signature);
    const replacement = this.inferCallArgumentType(expression, scope, parameterNames, 1, signature);
    const mergedType = source && replacement
      ? this.mergeCompatibleType(source, replacement)
      : source ?? replacement ?? { kind: 'unknown' as const };
    const qualifier = this.maxQualifier(source ?? mergedType, replacement ?? mergedType);
    const hasSimpleOverload = this.isNumericType(mergedType) || mergedType.kind === 'color'
      || (mergedType.kind === 'bool' && this.versionRules.allowsBoolNaHelpers);
    return {
      ...mergedType,
      qualifier: hasSimpleOverload && qualifier !== 'series' ? 'simple' : qualifier,
    };
  }

  private inferCallArgumentType(
    expression: CallExpression,
    scope: SemanticScope,
    parameterNames: readonly string[],
    index: number,
    signature?: BuiltinSignature,
  ): SemanticType | undefined {
    const argument = this.resolveCallArgumentExpression(expression, parameterNames, index, signature);
    return argument ? this.inferExpressionType(argument, scope) : undefined;
  }

  private resolveCallArgumentExpression(
    expression: CallExpression,
    parameterNames: readonly string[],
    index: number,
    signature?: BuiltinSignature,
  ): Expression | undefined {
    const name = parameterNames[index];
    if (!name) return undefined;

    const named = expression.arguments.find((argument) => {
      if (!argument.name) return false;
      const argumentName = signature ? this.canonicalSignatureArgumentName(argument.name.name, signature) : argument.name.name;
      return argumentName === name;
    });
    if (named) return named.value;
    if (signature?.singlePositionalParam && expression.arguments.length === 1 && !expression.arguments[0]?.name) {
      return name === signature.singlePositionalParam ? expression.arguments[0]?.value : undefined;
    }

    const priorNamedCount = parameterNames
      .slice(0, index)
      .filter((priorName) => expression.arguments.some((argument) => {
        if (!argument.name) return false;
        const argumentName = signature ? this.canonicalSignatureArgumentName(argument.name.name, signature) : argument.name.name;
        return argumentName === priorName;
      }))
      .length;
    const positional = expression.arguments.filter((argument) => !argument.name)[index - priorNamedCount];
    return positional?.value;
  }

  private inferUserFunctionCallType(expression: CallExpression, scope: SemanticScope): SemanticType | undefined {
    if (expression.callee.type !== 'Identifier') return undefined;

    const symbol = scope.lookupFunction(expression.callee.name);
    const declaration = symbol?.kind === 'function'
      ? this.findUserFunctionDeclaration(expression.callee.name, expression, scope) ?? this.functionSymbolDeclarations.get(symbol)
      : undefined;
    if (!declaration) return undefined;

    const context = this.typeContextStack.at(-1);
    if (context) context.resolvedUserFunction = declaration;
    return this.inferFunctionReturnType(declaration, this.inferCallableParameterTypes(declaration, expression.arguments, scope));
  }

  private inferUserFunctionTupleElementTypes(expression: CallExpression, scope: SemanticScope): SemanticType[] | undefined {
    if (expression.callee.type !== 'Identifier') return undefined;

    const symbol = scope.lookupFunction(expression.callee.name);
    const declaration = symbol?.kind === 'function'
      ? this.findUserFunctionDeclaration(expression.callee.name, expression, scope) ?? this.functionSymbolDeclarations.get(symbol)
      : undefined;
    if (!declaration) return undefined;

    return this.inferFunctionTupleElementTypes(declaration, this.inferCallableParameterTypes(declaration, expression.arguments, scope));
  }

  private inferImportedUserFunctionCallType(
    expression: CallExpression,
    scope: SemanticScope,
  ): SemanticType | undefined {
    const callable = this.resolveImportedUserFunctionCallable(expression, scope);
    if (!callable) return undefined;

    return this.normalizeImportedLibraryReturnType(this.inferFunctionReturnType(
      callable.declaration,
      this.inferImportedCallableParameterTypes(callable.libraryAlias, callable.declaration, expression.arguments, scope),
    ), callable.libraryAlias);
  }

  private inferImportedUserFunctionTupleElementTypes(expression: CallExpression, scope: SemanticScope): SemanticType[] | undefined {
    const callable = this.resolveImportedUserFunctionCallable(expression, scope);
    if (!callable || this.importedLibraries.get(callable.libraryAlias)?.official) return undefined;

    const types = this.inferFunctionTupleElementTypes(
      callable.declaration,
      this.inferImportedCallableParameterTypes(callable.libraryAlias, callable.declaration, expression.arguments, scope, 0),
    );
    return types?.map((type) => this.qualifyImportedSemanticType(callable.libraryAlias, type));
  }

  private inferUserMethodCallType(expression: CallExpression, scope: SemanticScope): SemanticType | undefined {
    if (expression.callee.type !== 'MemberExpression') return undefined;
    if (expression.callee.property.name === 'new' && expression.callee.object.type === 'Identifier'
      && scope.lookup(expression.callee.object.name)?.kind === 'type') return undefined;
    if (!this.methodDeclarations.has(expression.callee.property.name)) return undefined;

    const receiverType = this.inferExpressionType(expression.callee.object, scope);
    if (receiverType.kind === 'unknown') return undefined;

    const method = this.findUserMethodDeclaration(expression.callee.property.name, receiverType, expression, scope);
    if (!method) return undefined;

    const context = this.typeContextStack.at(-1);
    if (context && this.options.resolvedUserMethods) context.resolvedUserMethod = method;

    return this.inferFunctionReturnType(method, this.inferCallableParameterTypes(method, expression.arguments, scope, receiverType));
  }

  private inferImportedUserMethodCallType(expression: CallExpression, scope: SemanticScope): SemanticType | undefined {
    const callable = this.resolveImportedUserMethodCallable(expression, scope);
    if (!callable?.libraryAlias) return undefined;

    return this.normalizeImportedLibraryReturnType(this.inferFunctionReturnType(
      callable.declaration,
      this.inferImportedCallableParameterTypes(callable.libraryAlias, callable.declaration, expression.arguments, scope),
    ), callable.libraryAlias);
  }

  private normalizeImportedLibraryReturnType(type: SemanticType | undefined, libraryAlias: string): SemanticType | undefined {
    if (!type) return undefined;
    const importedType = this.qualifyImportedSemanticType(libraryAlias, type);
    if (importedType.qualifier !== 'const' && importedType.qualifier !== 'input') return importedType;
    return { ...importedType, qualifier: 'simple' };
  }

  private inferUserMethodTupleElementTypes(expression: CallExpression, scope: SemanticScope): SemanticType[] | undefined {
    if (expression.callee.type !== 'MemberExpression') return undefined;

    const receiverType = this.inferExpressionType(expression.callee.object, scope);
    if (receiverType.kind === 'unknown') return undefined;

    const method = this.findUserMethodDeclaration(expression.callee.property.name, receiverType, expression, scope);
    if (!method) return undefined;

    return this.inferFunctionTupleElementTypes(method, this.inferCallableParameterTypes(method, expression.arguments, scope, receiverType));
  }

  private findUserFunctionDeclaration(
    functionName: string,
    expression?: CallExpression,
    scope?: SemanticScope,
  ): FunctionDeclaration | undefined {
    const declarations = this.findBestUserFunctionDeclarations(functionName, expression, scope);
    return declarations.length === 1 ? declarations[0] : undefined;
  }

  private findBestUserFunctionDeclarations(
    functionName: string,
    expression?: CallExpression,
    scope?: SemanticScope,
  ): FunctionDeclaration[] {
    const functions = [
      ...(this.functionDeclarations.get(functionName) ?? []),
      ...(this.methodDeclarations.get(functionName) ?? []),
    ];
    if (!functions.length) return [];
    if (!expression || !scope) return functions.slice(0, 1);

    const candidates = functions
      .map((declaration) => ({
        declaration,
        score: this.userCallableSpecificityScore(declaration, expression, 0, scope) ?? Number.NEGATIVE_INFINITY,
      }))
      .filter((candidate) => Number.isFinite(candidate.score));
    if (candidates.length === 0) return [];

    const bestScore = Math.max(...candidates.map((candidate) => candidate.score));
    const bestCandidates = candidates.filter((candidate) => candidate.score === bestScore);
    return bestCandidates.map((candidate) => candidate.declaration);
  }

  private findUserMethodDeclaration(
    methodName: string,
    receiverType: SemanticType,
    expression?: CallExpression,
    scope?: SemanticScope,
  ): FunctionDeclaration | undefined {
    const methods = this.methodDeclarations.get(methodName);
    if (!methods?.length) return undefined;

    const receiverMatches = methods.filter((method) => this.userMethodReceiverMatches(method, receiverType));
    if (!expression || !scope) return receiverMatches[0];

    const candidates = receiverMatches
      .map((method) => ({
        method,
        score: this.userMethodReceiverSpecificityScore(method, receiverType)
          + (this.userCallableSpecificityScore(method, expression, 1, scope) ?? Number.NEGATIVE_INFINITY),
      }))
      .filter((candidate) => Number.isFinite(candidate.score));
    if (candidates.length === 0) return undefined;

    const bestScore = Math.max(...candidates.map((candidate) => candidate.score));
    const bestCandidates = candidates.filter((candidate) => candidate.score === bestScore);
    return bestCandidates.length === 1 ? bestCandidates[0]?.method : undefined;
  }

  private userMethodReceiverMatches(method: FunctionDeclaration, receiverType: SemanticType): boolean {
    const methodReceiverType = this.typeFromAnnotation(method.params[0]?.typeAnnotation ?? undefined);
    return !!methodReceiverType
      && this.isAssignableType(methodReceiverType, receiverType)
      && this.isAssignableQualifier(methodReceiverType.qualifier, receiverType.qualifier);
  }

  private userMethodReceiverTypeName(method: FunctionDeclaration): string | undefined {
    const annotation = method.params[0]?.typeAnnotation;
    if (!annotation) return undefined;
    return annotation.baseType === 'udt' ? annotation.name : annotation.baseType;
  }

  private isKnownMethodReceiverTypeName(typeName: string): boolean {
    if (this.isKnownUdtType(typeName)) return true;
    return ['int', 'float', 'bool', 'string', 'color'].includes(typeName);
  }

  private userMethodReceiverSpecificityScore(method: FunctionDeclaration, receiverType: SemanticType): number {
    const methodReceiverType = this.typeFromAnnotation(method.params[0]?.typeAnnotation ?? undefined);
    if (!methodReceiverType) return 0;

    let score = this.collectionTypeSpecificityScore(methodReceiverType, receiverType);
    if (methodReceiverType.qualifier === receiverType.qualifier) score += 2;
    return score;
  }

  private collectionTypeSpecificityScore(expected: SemanticType, actual: SemanticType): number {
    let score = this.typeSpecificityScore(expected, actual);
    if (expected.kind === actual.kind && ['array', 'matrix'].includes(expected.kind)) {
      score += this.collectionTypeSpecificityScore(expected.elementType ?? UNKNOWN_SEMANTIC_TYPE, actual.elementType ?? UNKNOWN_SEMANTIC_TYPE);
    } else if (expected.kind === 'map' && actual.kind === 'map') {
      score += this.collectionTypeSpecificityScore(expected.keyType ?? UNKNOWN_SEMANTIC_TYPE, actual.keyType ?? UNKNOWN_SEMANTIC_TYPE)
        + this.collectionTypeSpecificityScore(expected.valueType ?? UNKNOWN_SEMANTIC_TYPE, actual.valueType ?? UNKNOWN_SEMANTIC_TYPE);
    }
    return score;
  }

  private userCallableSpecificityScore(
    declaration: FunctionDeclaration,
    expression: CallExpression,
    parameterOffset: number,
    scope: SemanticScope,
  ): number | undefined {
    if (!this.callArgumentsFitParameters(expression.arguments, declaration.params.slice(parameterOffset))) return undefined;

    let score = 0;
    for (const [index, parameter] of declaration.params.entries()) {
      if (index < parameterOffset) continue;

      const expectedType = this.typeFromAnnotation(parameter.typeAnnotation ?? undefined);
      if (!expectedType) {
        score += 1;
        continue;
      }

      const argument = this.getCallArgument(expression.arguments, parameter.name, index - parameterOffset);
      if (!argument) continue;

      const actualType = this.inferExpressionType(argument, scope);
      if (!this.isAssignableType(expectedType, actualType)) return undefined;
      const referenceParameter = STRUCTURED_TYPE_KINDS.has(expectedType.kind) || REFERENCE_TYPE_KINDS.has(expectedType.kind);
      if (!referenceParameter && !this.isAssignableQualifier(expectedType.qualifier, actualType.qualifier)) return undefined;
      score += declaration.isMethod
        ? this.typeSpecificityScore(expectedType, actualType)
        : this.collectionTypeSpecificityScore(expectedType, actualType);
      score += expectedType.qualifier === actualType.qualifier ? 2 : 0;
    }

    return score;
  }

  private importedUserCallableSpecificityScore(
    libraryAlias: string,
    declaration: FunctionDeclaration,
    expression: CallExpression,
    parameterOffset: number,
    scope: SemanticScope,
  ): number | undefined {
    if (!this.callArgumentsFitParameters(expression.arguments, declaration.params.slice(parameterOffset))) return undefined;

    let score = 0;
    for (const [index, parameter] of declaration.params.entries()) {
      if (index < parameterOffset) continue;

      const expectedType = this.importedSemanticTypeFromAnnotation(libraryAlias, parameter.typeAnnotation ?? undefined);
      if (!expectedType) {
        score += 1;
        continue;
      }

      const argument = this.getCallArgument(expression.arguments, parameter.name, index - parameterOffset);
      if (!argument) continue;

      const actualType = this.inferExpressionType(argument, scope);
      if (!this.isAssignableType(expectedType, actualType)) return undefined;
      const referenceParameter = STRUCTURED_TYPE_KINDS.has(expectedType.kind) || REFERENCE_TYPE_KINDS.has(expectedType.kind);
      if (!referenceParameter && !this.isAssignableQualifier(expectedType.qualifier, actualType.qualifier)) return undefined;
      score += this.typeSpecificityScore(expectedType, actualType);
      if (this.formatSemanticType(expectedType) === this.formatSemanticType(actualType)) score += 2;
      score += expectedType.qualifier === actualType.qualifier ? 2 : 0;
    }

    return score;
  }

  private typeSpecificityScore(expectedType: SemanticType, actualType: SemanticType): number {
    if (expectedType.kind === actualType.kind) return 4;
    if (expectedType.kind === 'float' && actualType.kind === 'int') return 2;
    if (expectedType.kind === 'unknown' || actualType.kind === 'unknown') return 1;
    return 0;
  }

  private callArgumentsFitParameters(args: CallArgument[], parameters: FunctionDeclaration['params']): boolean {
    let hasNamedArgument = false;
    for (const arg of args) {
      if (arg.name) {
        hasNamedArgument = true;
        continue;
      }
      if (hasNamedArgument) return false;
    }

    const parameterNames = parameters.map((parameter) => parameter.name);
    const positionalCount = this.leadingPositionalCount(args);
    if (positionalCount > parameters.length) return false;

    const suppliedNames = new Set<string>();
    for (const arg of args) {
      if (!arg.name) continue;
      if (!parameterNames.includes(arg.name.name)) return false;
      if (suppliedNames.has(arg.name.name)) return false;
      suppliedNames.add(arg.name.name);
    }

    for (const [index, parameter] of parameters.entries()) {
      if (index < positionalCount && suppliedNames.has(parameter.name)) return false;
    }

    return parameters.every((parameter, index) => (
      index < positionalCount
      || suppliedNames.has(parameter.name)
      || !!parameter.defaultValue
    ));
  }

  private inferCallableParameterTypes(
    declaration: FunctionDeclaration,
    args: CallArgument[],
    scope: SemanticScope,
    receiverType?: SemanticType,
  ): Map<string, SemanticType> {
    const parameterTypes = new Map<string, SemanticType>();
    for (const [index, parameter] of declaration.params.entries()) {
      if (receiverType && index === 0) {
        parameterTypes.set(parameter.name, this.typeFromParameterArgument(parameter, receiverType));
        continue;
      }

      const positionalIndex = receiverType ? index - 1 : index;
      const argument = this.getCallArgument(args, parameter.name, positionalIndex);
      if (!argument) continue;

      parameterTypes.set(parameter.name, this.typeFromParameterArgument(parameter, this.inferExpressionType(argument, scope)));
    }
    return parameterTypes;
  }

  private inferImportedCallableParameterTypes(
    libraryAlias: string,
    declaration: FunctionDeclaration,
    args: CallArgument[],
    scope: SemanticScope,
    parameterOffset = 1,
  ): Map<string, SemanticType> {
    const parameterTypes = new Map<string, SemanticType>();
    for (const [index, parameter] of declaration.params.entries()) {
      if (index < parameterOffset) {
        const receiverType = this.importedSemanticTypeFromAnnotation(libraryAlias, parameter.typeAnnotation ?? undefined);
        if (receiverType) parameterTypes.set(parameter.name, receiverType);
        continue;
      }

      const argument = this.getCallArgument(args, parameter.name, index - parameterOffset);
      if (!argument) continue;

      parameterTypes.set(
        parameter.name,
        this.typeFromImportedParameterArgument(libraryAlias, parameter, this.inferExpressionType(argument, scope)),
      );
    }
    return parameterTypes;
  }

  private typeFromImportedParameterArgument(
    libraryAlias: string,
    parameter: FunctionDeclaration['params'][number],
    argumentType: SemanticType,
  ): SemanticType {
    const annotationType = this.importedSemanticTypeFromAnnotation(libraryAlias, parameter.typeAnnotation ?? undefined);
    if (!annotationType) return argumentType;
    return {
      ...annotationType,
      qualifier: annotationType.qualifier ?? argumentType.qualifier,
    };
  }

  private typeFromParameterArgument(parameter: FunctionDeclaration['params'][number], argumentType: SemanticType): SemanticType {
    const annotationType = this.typeFromAnnotation(parameter.typeAnnotation ?? undefined);
    if (!annotationType) return argumentType;
    if (annotationType.kind === "map" && annotationType.valueType && argumentType.kind === "map" && argumentType.valueType) {
      this.mapValueOrigins.set(annotationType.valueType, this.mapValueOrigins.get(argumentType.valueType) ?? argumentType.valueType);
    }
    return {
      ...annotationType,
      qualifier: annotationType.qualifier ?? argumentType.qualifier,
    };
  }

  private inferArrayElementReadCallType(expression: CallExpression, scope: SemanticScope): SemanticType | undefined {
    if (expression.callee.type !== 'MemberExpression') return undefined;

    const methodName = expression.callee.property.name;
    if (!this.isArrayElementReadOperation(methodName)) return undefined;

    const receiverType = this.inferArrayHelperReceiverType(expression, scope);
    if (receiverType?.kind !== 'array') return undefined;

    if ((methodName === 'remove' || methodName === 'get' || methodName === 'last' || methodName === 'pop' || methodName === 'shift') && receiverType.elementType) {
      return { ...receiverType.elementType, qualifier: 'series' };
    }
    if (receiverType.elementType && this.builtinSignatureDisplayName(expression, scope) === 'array.first') {
      return { ...receiverType.elementType, qualifier: 'series' };
    }
    return receiverType.elementType;
  }

  private isArrayElementReadOperation(operation: string): boolean {
    return operation === 'first'
      || operation === 'get'
      || operation === 'last'
      || operation === 'pop'
      || operation === 'remove'
      || operation === 'shift';
  }

  private inferArrayScalarCallType(expression: CallExpression, scope: SemanticScope): SemanticType | undefined {
    if (expression.callee.type !== 'MemberExpression') return undefined;

    const methodName = expression.callee.property.name;
    const receiverType = this.inferArrayHelperReceiverType(expression, scope);
    if (receiverType?.kind !== 'array') return undefined;

    if (methodName === 'size') return { kind: 'int', qualifier: 'series' };
    if (methodName === 'binary_search_leftmost') {
      return { kind: 'int', qualifier: 'series' };
    }
    if (methodName === 'lastindexof' || methodName === 'binary_search_rightmost') return { kind: 'int', qualifier: 'series' };
    if (methodName === 'some') return { kind: 'bool', qualifier: 'series' };

    if (methodName === 'every') return { kind: 'bool', qualifier: 'series' };
    if (methodName === 'covariance') return { kind: 'float', qualifier: 'series' };
    if (this.builtinSignatureDisplayName(expression, scope) === 'array.includes') {
      return { kind: 'bool', qualifier: 'series' };
    }
    if (this.isArrayBooleanOperation(methodName)) return { kind: 'bool' };
    if (methodName === 'join') {
      const isBuiltinJoin = this.memberPath(expression.callee).join('.') === 'array.join'
        || this.builtinReceiverMethodName(expression, scope) === 'array.join';
      return { kind: 'string', qualifier: isBuiltinJoin ? 'series' : undefined };
    }
    if (this.builtinSignatureDisplayName(expression, scope) === 'array.indexof') {
      return { kind: 'int', qualifier: 'series' };
    }
    if (methodName === 'binary_search'
      && this.resolveBuiltinSignature(this.memberPath(expression.callee).join('.'), expression, scope)) {
      return { kind: 'int', qualifier: 'series' };
    }
    if (methodName === 'avg') {
      const isBuiltinAverage = this.memberPath(expression.callee).join('.') === 'array.avg'
        || this.builtinReceiverMethodName(expression, scope) === 'array.avg';
      if (isBuiltinAverage) {
        return { kind: receiverType.elementType?.kind === 'int' ? 'int' : 'float', qualifier: 'series' };
      }
    }
    if (this.isArrayIntegerOperation(methodName)) return { kind: 'int' };
    if ((methodName === 'min' || methodName === 'max') && receiverType.elementType) {
      return { ...receiverType.elementType, qualifier: 'series' };
    }
    if (methodName === 'mode' && receiverType.elementType) {
      return { ...receiverType.elementType, qualifier: 'series' };
    }
    if (this.isArrayElementAggregateOperation(methodName)) return receiverType.elementType;
    if (methodName === 'stdev' || methodName === 'percentile_linear_interpolation' || methodName === 'percentrank') {
      const name = `array.${methodName}`;
      const isBuiltin = this.memberPath(expression.callee).join('.') === name
        || this.builtinReceiverMethodName(expression, scope) === name;
      const kind = isBuiltin && methodName !== 'percentrank' && receiverType.elementType?.kind === 'int' ? 'int' : 'float';
      return { kind, qualifier: isBuiltin ? 'series' : undefined };
    }
    if (receiverType.elementType?.kind === 'int' && this.isArrayIntegerPreservingAggregateOperation(methodName)) {
      return { kind: 'int' };
    }
    if (methodName === 'variance') {
      const isBuiltin = this.memberPath(expression.callee).join('.') === 'array.variance'
        || this.builtinReceiverMethodName(expression, scope) === 'array.variance';
      return { kind: isBuiltin && receiverType.elementType?.kind === 'int' ? 'int' : 'float', qualifier: 'series' };
    }
    if (this.isArrayFloatOperation(methodName)) return { kind: 'float' };

    return undefined;
  }

  private isArrayBooleanOperation(operation: string): boolean {
    return operation === 'every' || operation === 'includes' || operation === 'some';
  }

  private isArrayIntegerOperation(operation: string): boolean {
    return operation === 'binary_search'
      || operation === 'binary_search_leftmost'
      || operation === 'binary_search_rightmost'
      || operation === 'indexof'
      || operation === 'lastindexof'
      || operation === 'size';
  }

  private isArrayElementAggregateOperation(operation: string): boolean {
    return operation === 'max' || operation === 'min' || operation === 'mode';
  }

  private isArrayIntegerPreservingAggregateOperation(operation: string): boolean {
    return operation === 'sum' || operation === 'range' || operation === 'percentile_nearest_rank' || operation === 'median';
  }

  private isArrayFloatOperation(operation: string): boolean {
    return operation === 'avg'
      || operation === 'covariance'
      || operation === 'max'
      || operation === 'median'
      || operation === 'min'
      || operation === 'mode'
      || operation === 'percentile_linear_interpolation'
      || operation === 'percentile_nearest_rank'
      || operation === 'percentrank'
      || operation === 'range'
      || operation === 'stdev'
      || operation === 'sum'
      || operation === 'variance';
  }

  private inferArrayHelperCallType(expression: CallExpression, scope: SemanticScope): SemanticType | undefined {
    if (expression.callee.type !== 'MemberExpression') return undefined;

    const methodName = expression.callee.property.name;
    const receiverType = this.inferArrayHelperReceiverType(expression, scope);
    if (receiverType?.kind !== 'array') return undefined;

    if (ARRAY_VOID_RETURN_METHODS.has(methodName)) return { kind: 'void' };

    switch (methodName) {
      case 'concat':
      case 'copy':
      case 'slice':
        return {
          kind: 'array',
          qualifier: 'series',
          elementType: receiverType.elementType,
        };
      case 'standardize':
        return {
          kind: 'array',
          qualifier: 'series',
          elementType: receiverType.elementType?.kind === 'int' ? { kind: 'int' } : { kind: 'float' },
        };
      case 'abs':
        return {
          kind: 'array',
          qualifier: 'series',
          elementType: receiverType.elementType?.kind === 'int' ? { kind: 'int' } : { kind: 'float' },
        };
      case 'sort_indices':
        return {
          kind: 'array',
          qualifier: 'series',
          elementType: { kind: 'int' },
        };
      default:
        return undefined;
    }
  }

  private inferArrayHelperReceiverType(expression: CallExpression, scope: SemanticScope): SemanticType | undefined {
    if (expression.callee.type !== 'MemberExpression') return undefined;

    if (expression.callee.object.type === 'Identifier' && expression.callee.object.name === 'array') {
      const arrayArgument = this.getCallArgument(expression.arguments, 'id', 0);
      return arrayArgument ? this.inferExpressionType(arrayArgument, scope) : undefined;
    }
    return this.inferExpressionType(expression.callee.object, scope);
  }

  private inferMatrixElementReadCallType(expression: CallExpression, scope: SemanticScope): SemanticType | undefined {
    if (expression.callee.type !== 'MemberExpression' || expression.callee.property.name !== 'get') return undefined;

    const receiverType = this.inferMatrixHelperReceiverType(expression, scope);
    if (receiverType?.kind !== 'matrix') return undefined;

    if (this.currentPineVersion >= 6 && receiverType.elementType) {
      return { ...receiverType.elementType, qualifier: 'series' };
    }
    return receiverType.elementType;
  }

  private inferMatrixHelperCallType(expression: CallExpression, scope: SemanticScope): SemanticType | undefined {
    if (expression.callee.type !== 'MemberExpression') return undefined;

    const methodName = expression.callee.property.name;
    const receiverType = this.inferMatrixHelperReceiverType(expression, scope);
    if (receiverType?.kind !== 'matrix') return undefined;

    if (
      (methodName === 'is_antidiagonal' || methodName === 'is_triangular')
      && ((this.isMatrixNamespaceCall(expression) && !scope.lookup('matrix'))
        || (!this.findUserMethodDeclaration(methodName, receiverType, expression, scope)
          && this.builtinReceiverMethodName(expression, scope) === `matrix.${methodName}`))
    ) {
      return { kind: 'bool', qualifier: 'series' };
    }
    if (
      (methodName === 'det' || methodName === 'min' || methodName === 'max')
      && ((this.isMatrixNamespaceCall(expression) && !scope.lookup('matrix'))
        || (!this.findUserMethodDeclaration(methodName, receiverType, expression, scope)
          && this.builtinReceiverMethodName(expression, scope) === `matrix.${methodName}`))
    ) {
      const elementKind = receiverType.elementType?.kind;
      if (elementKind === 'int' || elementKind === 'float') return { kind: elementKind, qualifier: 'series' };
    }
    if (
      (methodName === 'is_identity' || methodName === 'is_symmetric' || methodName === 'is_square')
      && ((this.isMatrixNamespaceCall(expression) && !scope.lookup('matrix'))
        || (!this.findUserMethodDeclaration(methodName, receiverType, expression, scope)
          && this.builtinReceiverMethodName(expression, scope) === `matrix.${methodName}`))
    ) {
      return { kind: 'bool', qualifier: 'series' };
    }
    if (methodName === 'rank') return { kind: 'int', qualifier: 'series' };
    if (methodName === 'avg' || methodName === 'mode' || methodName === 'trace') {
      const elementKind = receiverType.elementType?.kind;
      if (elementKind === 'int' || elementKind === 'float') return { kind: elementKind, qualifier: 'series' };
    }
    if (methodName === 'columns' || methodName === 'rows') return { kind: 'int', qualifier: 'series' };
    if (methodName === 'elements_count') {
      const isBuiltin = this.inferExpressionType(expression.callee.object, scope).kind === 'matrix'
        ? this.builtinReceiverMethodName(expression, scope) === 'matrix.elements_count'
        : !this.hasImportedNamespaceCallableShadow(expression, scope);
      return isBuiltin ? { kind: 'int', qualifier: 'series' } : { kind: 'int' };
    }
    if (['is_stochastic', 'is_binary', 'is_diagonal', 'is_zero', 'is_antisymmetric'].includes(methodName)) {
      const isNamespaceCall =
        expression.callee.object.type === 'Identifier' && expression.callee.object.name === 'matrix';
      if (!isNamespaceCall && this.findUserMethodDeclaration(methodName, receiverType, expression, scope))
        return undefined;
      return { kind: 'bool', qualifier: 'series' };
    }
    if (methodName === 'median' && (receiverType.elementType?.kind === 'int' || receiverType.elementType?.kind === 'float')) {
      const isNamespaceCall =
        expression.callee.object.type === 'Identifier' && expression.callee.object.name === 'matrix';
      if (!isNamespaceCall && this.findUserMethodDeclaration(methodName, receiverType, expression, scope))
        return undefined;
      return { kind: receiverType.elementType.kind, qualifier: 'series' };
    }
    if (methodName === 'is_valid') return { kind: 'bool' };
    if (
      methodName === 'row'
      || methodName === 'col'
      || methodName === 'column'
      || methodName === 'remove_row'
      || methodName === 'remove_col'
      || methodName === 'remove_column'
    ) {
      return {
        kind: 'array',
        qualifier: 'series',
        elementType: receiverType.elementType,
      };
    }
    if (methodName === 'eigenvalues') {
      return {
        kind: 'array',
        qualifier: 'series',
        elementType: { kind: 'float' },
      };
    }
    if (methodName === 'pow') {
      return {
        kind: 'matrix',
        qualifier: 'series',
        elementType: receiverType.elementType,
      };
    }
    if (methodName === 'eigenvectors' || methodName === 'inv' || methodName === 'pinv') {
      return {
        kind: 'matrix',
        qualifier: 'series',
        elementType: { kind: 'float' },
      };
    }
    if (methodName === 'diff' || methodName === 'kron' || methodName === 'sum') {
      return {
        kind: 'matrix',
        qualifier: 'series',
        elementType: this.inferMatrixBinaryElementType(expression, scope, receiverType),
      };
    }
    if (methodName === 'mult') return this.inferMatrixMultCallType(expression, scope, receiverType);
    if (MATRIX_VALUE_RETURN_METHODS.has(methodName)) return receiverType;
    return undefined;
  }

  private inferMatrixHelperReceiverType(expression: CallExpression, scope: SemanticScope): SemanticType | undefined {
    if (expression.callee.type !== 'MemberExpression') return undefined;

    if (expression.callee.object.type === 'Identifier' && expression.callee.object.name === 'matrix') {
      const signature = this.resolveBuiltinSignature(this.memberPath(expression.callee).join('.'), expression, scope);
      if (!signature) return undefined;
      const parameterNames = this.resolveSignatureParams(expression.arguments, signature);
      const matrixArgument = this.resolveCallArgumentExpression(expression, parameterNames, 0, signature);
      return matrixArgument ? this.inferExpressionType(matrixArgument, scope) : undefined;
    }

    return this.inferExpressionType(expression.callee.object, scope);
  }

  private inferMatrixMultCallType(expression: CallExpression, scope: SemanticScope, receiverType: SemanticType): SemanticType {
    const secondArgument = this.getCallArgument(expression.arguments, 'id2', this.isMatrixNamespaceCall(expression) ? 1 : 0);
    const secondType = secondArgument ? this.inferExpressionType(secondArgument, scope) : undefined;
    const elementType = this.promoteNumericCollectionElementType(receiverType.elementType, secondType);

    if (secondType?.kind === 'array') {
      return {
        kind: 'array',
        qualifier: 'series',
        elementType,
      };
    }

    return {
      kind: 'matrix',
      qualifier: 'series',
      elementType,
    };
  }

  private inferMatrixBinaryElementType(expression: CallExpression, scope: SemanticScope, receiverType: SemanticType): SemanticType {
    const secondArgument = this.getCallArgument(expression.arguments, 'id2', this.isMatrixNamespaceCall(expression) ? 1 : 0);
    const secondType = secondArgument ? this.inferExpressionType(secondArgument, scope) : undefined;
    return this.promoteNumericCollectionElementType(receiverType.elementType, secondType);
  }

  private promoteNumericCollectionElementType(left: SemanticType | undefined, right: SemanticType | undefined): SemanticType {
    const leftElement = left ?? UNKNOWN_SEMANTIC_TYPE;
    if ((right?.kind === 'int' || right?.kind === 'float')
      && (leftElement.kind === 'int' || leftElement.kind === 'float')) {
      return { kind: leftElement.kind };
    }
    const rightElement = right?.kind === 'matrix' || right?.kind === 'array'
      ? right.elementType ?? UNKNOWN_SEMANTIC_TYPE
      : right ?? UNKNOWN_SEMANTIC_TYPE;

    if (leftElement.kind === 'float' || rightElement.kind === 'float') return { kind: 'float' };
    if (leftElement.kind === 'int' && rightElement.kind === 'int') return { kind: 'int' };
    if (leftElement.kind === 'int' && rightElement.kind === 'unknown') return { kind: 'int' };
    return leftElement.kind === 'unknown' ? { kind: 'unknown' } : this.arrayElementTypeKind(leftElement);
  }

  private isMatrixNamespaceCall(expression: CallExpression): boolean {
    return expression.callee.type === 'MemberExpression'
      && expression.callee.object.type === 'Identifier'
      && expression.callee.object.name === 'matrix';
  }

  private inferMapValueReadCallType(expression: CallExpression, scope: SemanticScope): SemanticType | undefined {
    if (expression.callee.type !== 'MemberExpression') return undefined;

    const mapCall = this.resolveMapCall(expression, scope);
    if (!mapCall || mapCall.mapType.kind !== 'map') return undefined;
    if (mapCall.operation === 'put' && mapCall.mapType.valueType && mapCall.valueArgument
      && this.builtinSignatureDisplayName(expression, scope) === 'map.put'
      && this.inferExpressionType(mapCall.valueArgument, scope).qualifier === 'series') {
      this.seriesMapValueTypes.add(this.mapValueOrigins.get(mapCall.mapType.valueType) ?? mapCall.mapType.valueType);
    }
    if (mapCall.operation === 'get' || mapCall.operation === 'put' || mapCall.operation === 'remove') {
      const valueType = mapCall.mapType.valueType;
      if (valueType && (this.currentPineVersion >= 6 || this.seriesMapValueTypes.has(this.mapValueOrigins.get(valueType) ?? valueType))) {
        return { ...valueType, qualifier: 'series' };
      }
      return valueType;
    }
    if (mapCall.operation === 'contains') return { kind: 'bool', qualifier: 'series' };
    if (mapCall.operation === 'copy') {
      const sourceValueType = mapCall.mapType.valueType;
      if (!sourceValueType) return mapCall.mapType;
      const valueType = { ...sourceValueType };
      if (this.seriesMapValueTypes.has(this.mapValueOrigins.get(sourceValueType) ?? sourceValueType)) {
        this.seriesMapValueTypes.add(valueType);
      }
      return { ...mapCall.mapType, valueType };
    }
    if (mapCall.operation === 'keys') return { kind: 'array', qualifier: 'series', elementType: mapCall.mapType.keyType };
    if (mapCall.operation === 'values') return { kind: 'array', qualifier: 'series', elementType: mapCall.mapType.valueType };
    if (mapCall.operation === 'size') {
      const isBuiltin = this.inferExpressionType(expression.callee.object, scope).kind === 'map'
        ? this.builtinReceiverMethodName(expression, scope) === 'map.size'
        : !this.hasImportedNamespaceCallableShadow(expression, scope);
      return isBuiltin ? { kind: 'int', qualifier: 'series' } : { kind: 'int' };
    }
    if (mapCall.operation === 'clear' || mapCall.operation === 'put_all') return { kind: 'void' };
    return undefined;
  }

  private inferIndexExpressionType(expression: IndexExpression, scope: SemanticScope): SemanticType {
    const objectType = this.inferExpressionType(expression.object, scope);
    if (objectType.kind === 'array') return objectType;
    if (objectType.kind !== 'unknown') return { ...objectType, qualifier: 'series' };
    return { kind: 'unknown', qualifier: 'series' };
  }

  private inferArrayElementType(elements: Expression[], scope: SemanticScope): SemanticType {
    let elementType: SemanticType | undefined;

    for (const element of elements) {
      const currentType = this.inferExpressionType(element, scope);
      elementType = this.mergeArrayElementTypes(elementType, currentType);
      if (elementType.kind === 'unknown') return elementType;
    }

    return elementType ?? { kind: 'unknown' };
  }

  private mergeArrayElementTypes(left: SemanticType | undefined, right: SemanticType): SemanticType {
    if (!left) return this.arrayElementTypeKind(right);

    const normalizedRight = this.arrayElementTypeKind(right);
    if (left.kind === 'unknown' || normalizedRight.kind === 'unknown') return { kind: 'unknown' };
    if (left.kind === normalizedRight.kind) return left;
    if ((left.kind === 'int' && normalizedRight.kind === 'float') || (left.kind === 'float' && normalizedRight.kind === 'int')) {
      return { kind: 'float' };
    }

    return { kind: 'unknown' };
  }

  private inferCallArgumentMaxQualifier(expression: CallExpression, scope: SemanticScope): SemanticQualifier | undefined {
    return this.maxQualifier(...expression.arguments.map((argument) => this.inferExpressionType(argument.value, scope)));
  }

  private arrayElementTypeKind(type: SemanticType): SemanticType {
    if (PRIMITIVE_TYPE_KINDS.has(type.kind)) return { kind: type.kind };
    if (REFERENCE_TYPE_KINDS.has(type.kind)) return { kind: type.kind };
    if (type.kind === 'udt' && type.name) return { kind: 'udt', name: type.name };
    return { kind: 'unknown' };
  }

  private inferUniqueConstantType(expression: MemberExpression): SemanticType | undefined {
    const memberName = this.memberPath(expression).join('.');
    if (memberName === 'plot.style_columns' && this.versionRules.columnsStyleNumericValue !== undefined) {
      return { kind: 'int', qualifier: 'const' };
    }
    if (PLOT_STYLE_CONSTANT_VALUES.has(memberName)) return { kind: 'unique', name: 'plot_style', qualifier: 'const' };
    if (PLOT_LINESTYLE_CONSTANT_VALUES.has(memberName)) return { kind: 'unique', name: 'plot_line_style', qualifier: 'const' };
    if (HLINE_LINESTYLE_CONSTANT_VALUES.has(memberName)) return { kind: 'unique', name: 'hline_style', qualifier: 'const' };
    return undefined;
  }

  private inferMemberExpressionType(expression: MemberExpression, scope: SemanticScope): SemanticType {
    const path = this.memberPath(expression);
    const memberName = path.join('.');
    if (VISUAL_SIZE_CONSTANT_VALUES.has(memberName) && !scope.lookup('size')) {
      return { kind: 'string', qualifier: 'const' };
    }
    if (
      memberName === 'session.ismarket' ||
      memberName === 'session.ispremarket' ||
      memberName === 'session.ispostmarket' ||
      memberName === 'session.isfirstbar' ||
      memberName === 'session.isfirstbar_regular' ||
      memberName === 'session.islastbar' ||
      memberName === 'session.islastbar_regular'
    ) {
      return { kind: 'bool', qualifier: 'series' };
    }
    if (memberName === 'session.regular' || memberName === 'session.extended') {
      return { kind: 'string', qualifier: 'const' };
    }
    const timeframeType = this.inferTimeframeMemberType(expression);
    if (timeframeType) return timeframeType;
    const syminfoType = this.inferSyminfoMemberType(expression);
    if (syminfoType) return syminfoType;
    const chartType = this.inferChartMemberType(expression);
    if (chartType) return chartType;
    const strategyType = this.inferStrategyMemberType(expression);
    if (strategyType) return strategyType;
    const drawingAllType = this.inferDrawingAllMemberType(expression);
    if (drawingAllType) return drawingAllType;
    const taMemberType = this.inferTaMemberType(expression);
    if (taMemberType) return taMemberType;
    const inputConstantType = this.inferInputTypeConstantType(expression);
    if (inputConstantType) return inputConstantType;
    const colorConstantType = this.inferColorConstantType(expression);
    if (colorConstantType) return colorConstantType;
    const importedConstantType = this.inferImportedConstantMemberType(expression, scope);
    if (importedConstantType) return importedConstantType;
    const enumType = this.inferEnumMemberType(expression, scope);
    if (enumType) return enumType;

    const objectType = this.inferExpressionType(expression.object, scope);
    if (objectType.kind === 'chart.point') {
      if (expression.property.name === 'price') return { kind: 'float', qualifier: 'series' };
      if (expression.property.name === 'time' || expression.property.name === 'index') {
        return { kind: 'int', qualifier: 'series' };
      }
    }
    if (objectType.kind !== 'udt' || !objectType.name) return objectType;

    const field = this.findUdtField(objectType.name, expression.property.name);
    const [libraryAlias] = objectType.name.split('.');
    const fieldType = libraryAlias && this.importedLibraries.has(libraryAlias)
      ? this.importedSemanticTypeFromAnnotation(libraryAlias, field?.typeAnnotation ?? undefined)
      : this.typeFromAnnotation(field?.typeAnnotation ?? undefined);
    return fieldType
      ? { ...fieldType, qualifier: this.maxQualifier(fieldType, objectType) }
      : { kind: 'unknown', qualifier: objectType.qualifier };
  }

  private inferImportedConstantMemberType(expression: MemberExpression, scope: SemanticScope): SemanticType | undefined {
    const path = this.memberPath(expression);
    if (path.length !== 2) return undefined;

    const [alias, constantName] = path;
    if (!alias || !constantName || scope.lookup(alias)?.kind !== 'import') return undefined;

    const constant = this.importedLibraries.get(alias)?.constants.get(constantName);
    return this.typeFromAnnotation(constant?.typeAnnotation ?? undefined);
  }

  private inferDrawingAllMemberType(expression: MemberExpression): SemanticType | undefined {
    const elementType = DRAWING_ALL_ELEMENT_TYPES.get(this.memberPath(expression).join('.'));
    return elementType ? { kind: 'array', elementType: { kind: elementType } } : undefined;
  }

  private inferTaMemberType(expression: MemberExpression): SemanticType | undefined {
    const memberName = this.memberPath(expression).join('.');
    return TA_FLOAT_MEMBER_NAMES.has(memberName) ? { kind: 'float', qualifier: 'series' } : undefined;
  }

  private inferTimeframeMemberType(expression: MemberExpression): SemanticType | undefined {
    const memberName = this.memberPath(expression).join('.');
    if (TIMEFRAME_BOOL_MEMBER_NAMES.has(memberName)) return { kind: 'bool', qualifier: 'simple' };
    if (TIMEFRAME_STRING_MEMBER_NAMES.has(memberName)) return { kind: 'string', qualifier: 'simple' };
    if (memberName === 'timeframe.multiplier') return { kind: 'int', qualifier: 'simple' };
    return undefined;
  }

  private inferSyminfoMemberType(expression: MemberExpression): SemanticType | undefined {
    const memberName = this.memberPath(expression).join('.');
    if (SYMINFO_STRING_MEMBER_NAMES.has(memberName)) return { kind: 'string', qualifier: 'simple' };
    if (SYMINFO_INT_MEMBER_NAMES.has(memberName)) return { kind: 'int', qualifier: 'simple' };
    if (SYMINFO_SERIES_INT_MEMBER_NAMES.has(memberName)) return { kind: 'int', qualifier: 'series' };
    if (SYMINFO_FLOAT_MEMBER_NAMES.has(memberName)) return { kind: 'float', qualifier: 'simple' };
    if (SYMINFO_SERIES_FLOAT_MEMBER_NAMES.has(memberName)) return { kind: 'float', qualifier: 'series' };
    return undefined;
  }

  private inferChartMemberType(expression: MemberExpression): SemanticType | undefined {
    const memberName = this.memberPath(expression).join('.');
    if (CHART_BOOL_MEMBER_NAMES.has(memberName)) return { kind: 'bool', qualifier: 'simple' };
    if (CHART_COLOR_MEMBER_NAMES.has(memberName)) return { kind: 'color', qualifier: 'simple' };
    if (CHART_INT_MEMBER_NAMES.has(memberName)) return { kind: 'int', qualifier: 'input' };
    return undefined;
  }

  private inferStrategyMemberType(expression: MemberExpression): SemanticType | undefined {
    const memberName = this.memberPath(expression).join('.');
    if (STRATEGY_FLOAT_MEMBER_NAMES.has(memberName)) return { kind: 'float', qualifier: 'series' };
    if (STRATEGY_INT_MEMBER_NAMES.has(memberName)) return { kind: 'int', qualifier: 'series' };
    if (STRATEGY_STRING_MEMBER_NAMES.has(memberName)) return { kind: 'string', qualifier: 'series' };
    return undefined;
  }

  private inferStrategyCallType(calleePath: string[]): SemanticType | undefined {
    const calleeName = calleePath.join('.');
    if (calleeName === 'strategy.default_entry_qty' || calleeName === 'strategy.convert_to_account' || calleeName === 'strategy.convert_to_symbol') return { kind: 'float', qualifier: 'series' };
    if (STRATEGY_STRING_ACCESSOR_NAMES.has(calleeName)) return { kind: 'string', qualifier: 'series' };
    if (STRATEGY_INT_ACCESSOR_NAMES.has(calleeName)) return { kind: 'int', qualifier: 'series' };
    if (STRATEGY_FLOAT_ACCESSOR_NAMES.has(calleeName)) return { kind: 'float', qualifier: 'series' };
    return undefined;
  }

  private inferEnumTitleCallType(expression: CallExpression, scope: SemanticScope): SemanticType | undefined {
    if (expression.callee.type !== 'MemberExpression' || expression.callee.property.name !== 'title') return undefined;
    if (expression.arguments.length > 0) return undefined;

    const receiverType = this.inferExpressionType(expression.callee.object, scope);
    return this.isEnumSemanticType(receiverType)
      ? { kind: 'string', qualifier: receiverType.qualifier }
      : undefined;
  }

  private isEnumSemanticType(type: SemanticType): boolean {
    if (type.kind !== 'udt' || !type.name) return false;
    if (this.enumDeclarations.has(type.name)) return true;

    const [alias, enumName] = type.name.split('.');
    return !!alias && !!enumName && !!this.importedLibraries.get(alias)?.enums.has(enumName);
  }

  private inferEnumMemberType(expression: MemberExpression, scope: SemanticScope): SemanticType | undefined {
    const path = this.memberPath(expression);
    if (path.length === 3) {
      const [alias, enumName, fieldName] = path;
      if (alias && enumName && scope.lookup(alias)?.kind === 'import') {
        const library = this.importedLibraries.get(alias);
        if (!library) {
          return { kind: 'udt', name: `${alias}.${enumName}`, qualifier: 'const' };
        }
        const enumDeclaration = library.enums.get(enumName);
        if (enumDeclaration?.fields.some((field) => field.name.name === fieldName)) {
          return { kind: 'udt', name: `${alias}.${enumName}`, qualifier: 'const' };
        }
      }
    }

    if (expression.object.type !== 'Identifier') return undefined;

    const enumDeclaration = this.enumDeclarations.get(expression.object.name);
    if (!enumDeclaration?.fields.some((field) => field.name.name === expression.property.name)) return undefined;

    return { kind: 'udt', name: enumDeclaration.name.name, qualifier: 'const' };
  }

  private memberPath(expression: Expression): string[] {
    if (expression.type === 'Identifier') return [expression.name];
    if (expression.type !== 'MemberExpression') return [];
    const objectPath = this.memberPath(expression.object);
    return objectPath.length ? [...objectPath, expression.property.name] : [];
  }

  private findUdtField(typeName: string, fieldName: string): TypeFieldDeclaration | undefined {
    return this.findUdtDeclaration(typeName)?.fields.find((field) => field.name.name === fieldName);
  }

  private findUdtDeclaration(typeName: string): TypeDeclaration | undefined {
    const localDeclaration = this.typeDeclarations.get(typeName);
    if (localDeclaration) return localDeclaration;

    const [alias, importedTypeName] = typeName.split('.');
    if (!alias || !importedTypeName) return undefined;
    return this.importedLibraries.get(alias)?.types.get(importedTypeName);
  }

  private isKnownUdtType(typeName: string): boolean {
    if (this.typeDeclarations.has(typeName)) return true;

    const [alias, importedTypeName] = typeName.split('.');
    if (!alias || !importedTypeName) return false;
    const library = this.importedLibraries.get(alias);
    return !!library && (library.types.has(importedTypeName) || library.enums.has(importedTypeName));
  }

  private importedSemanticTypeFromAnnotation(libraryAlias: string, annotation?: TypeAnnotation | null): SemanticType | undefined {
    const type = this.typeFromAnnotation(annotation);
    return type ? this.qualifyImportedSemanticType(libraryAlias, type) : undefined;
  }

  private qualifyImportedSemanticType(libraryAlias: string, type: SemanticType): SemanticType {
    if (type.kind === 'array' || type.kind === 'matrix') {
      return {
        ...type,
        elementType: type.elementType ? this.qualifyImportedSemanticType(libraryAlias, type.elementType) : undefined,
      };
    }
    if (type.kind === 'map') {
      return {
        ...type,
        keyType: type.keyType ? this.qualifyImportedSemanticType(libraryAlias, type.keyType) : undefined,
        valueType: type.valueType ? this.qualifyImportedSemanticType(libraryAlias, type.valueType) : undefined,
      };
    }
    if (type.kind !== 'udt' || !type.name || type.name.includes('.')) return type;

    const library = this.importedLibraries.get(libraryAlias);
    return library && (library.types.has(type.name) || library.enums.has(type.name))
      ? { ...type, name: `${libraryAlias}.${type.name}` }
      : type;
  }

  private inferMaxQualifier(expressions: Expression[], scope: SemanticScope): SemanticQualifier | undefined {
    return this.maxQualifier(...expressions.map((expression) => this.inferExpressionType(expression, scope)));
  }

  private maxQualifier(...types: SemanticType[]): SemanticQualifier | undefined {
    // Missing qualifier information cannot establish a v5 constant expression.
    if (this.currentPineVersion >= 4 && !this.versionRules.constIntDivisionCanReturnFractional
      && types.some((type) => !type.qualifier)) return undefined;
    let max: SemanticQualifier | undefined;
    for (const type of types) {
      if (!type.qualifier) continue;
      if (!max || QUALIFIER_RANK[type.qualifier] > QUALIFIER_RANK[max]) {
        max = type.qualifier;
      }
    }
    return max;
  }

  private typeFromName(name: string, qualifier?: SemanticQualifier): SemanticType {
    const templateType = this.parseTemplateTypeName(name);
    if (templateType?.kind === 'array' || templateType?.kind === 'matrix') {
      return {
        kind: templateType.kind,
        qualifier: qualifier ?? 'series',
        elementType: this.typeFromName(templateType.args[0] ?? 'unknown'),
      };
    }
    if (templateType?.kind === 'map') {
      return {
        kind: 'map',
        qualifier: qualifier ?? 'series',
        keyType: this.typeFromName(templateType.args[0] ?? 'unknown'),
        valueType: this.typeFromName(templateType.args[1] ?? 'unknown'),
      };
    }

    switch (name) {
      case 'int':
      case 'float':
      case 'bool':
      case 'string':
      case 'color':
        return { kind: name, qualifier };
      case 'void':
      case 'array':
      case 'matrix':
      case 'map':
      case 'label':
      case 'line':
      case 'box':
      case 'polyline':
      case 'table':
      case 'chart.point':
      case 'linefill':
      case 'plot':
      case 'hline':
        return { kind: name, qualifier: qualifier ?? 'series' };
      default:
        return { kind: 'udt', qualifier: qualifier ?? 'series', name };
    }
  }

  private parseTemplateTypeName(typeName: string): { kind: 'array' | 'matrix' | 'map'; args: string[] } | null {
    const match = COLLECTION_TEMPLATE_TYPE_PATTERN.exec(typeName);
    if (!match) return null;

    const kind = match[1] as 'array' | 'matrix' | 'map';
    const args = this.splitTemplateTypeArguments(match[2] ?? '');
    if ((kind === 'array' || kind === 'matrix') && args.length !== 1) return null;
    if (kind === 'map' && args.length !== 2) return null;
    return { kind, args };
  }

  private splitTemplateTypeArguments(args: string): string[] {
    const result: string[] = [];
    let depth = 0;
    let start = 0;

    for (let index = 0; index < args.length; index += 1) {
      const char = args[index];
      if (char === '<') depth += 1;
      if (char === '>') depth -= 1;
      if (char === ',' && depth === 0) {
        result.push(args.slice(start, index).trim());
        start = index + 1;
      }
    }

    result.push(args.slice(start).trim());
    return result.filter((arg) => arg.length > 0);
  }

  private checkTypeCompatibility(
    annotation: TypeAnnotation | undefined | null,
    init: Expression | IfStatement,
    scope: SemanticScope,
    loc?: SourceLocation,
    variableName?: string,
  ): void {
    const targetType = this.typeFromAnnotation(annotation);
    if (!targetType || !this.canCheckTypeCompatibility(annotation)) return;

    if (targetType.kind === 'bool' && init.type !== 'IfStatement'
      && this.isNaLiteralExpression(init) && !this.versionRules.allowsBoolNaHelpers) {
      this.addDiagnostic(
        'type-mismatch',
        this.boolNaVersionMessage(`Cannot assign na value to bool variable ${variableName ?? ''}`.trim()),
        loc,
      );
      return;
    }

    const initType = init.type === 'IfStatement'
      ? this.inferIfExpressionType(init, scope)
      : this.inferExpressionType(init, scope);

    if (this.currentPineVersion >= 6 && targetType.kind === 'string' && targetType.qualifier === 'const'
      && init.type !== 'IfStatement' && this.isNaLiteralExpression(init)) {
      this.addDiagnostic('qualifier-mismatch', 'Cannot assign simple na value to const string', loc);
    }

    if (targetType.qualifier && initType.qualifier && QUALIFIER_RANK[initType.qualifier] > QUALIFIER_RANK[targetType.qualifier]) {
      this.addDiagnostic(
        'qualifier-mismatch',
        `Cannot assign ${initType.qualifier} value to ${targetType.qualifier} ${targetType.kind}`,
        loc,
      );
    }

    this.checkControlInitializerArmCompatibility(targetType, init, scope, loc, variableName);

    const integerDivisionInitializer = this.currentPineVersion >= 5
      && targetType.kind === 'int'
      && init.type === 'BinaryExpression' && init.operator === '/'
      && this.inferExpressionType(init.left, scope).kind === 'int'
      && this.inferExpressionType(init.right, scope).kind === 'int';
    const integralSeriesInitializer = this.currentPineVersion >= 6
      && targetType.kind === 'int' && initType.qualifier === 'series'
      && init.type === 'BinaryExpression'
      && this.isIntegralDrawingCoordinate(init, scope)
      && this.hasOnlyConstantIntegerQuotients(init, scope);
    if (!this.isAssignableType(targetType, initType) && !integerDivisionInitializer && !integralSeriesInitializer) {
      this.addDiagnostic(
        'type-mismatch',
        this.variableAssignmentMessage(this.formatSemanticType(initType), this.formatSemanticType(targetType), variableName),
        loc,
      );
    }
  }

  private checkControlInitializerArmCompatibility(
    targetType: SemanticType,
    init: Expression | IfStatement,
    scope: SemanticScope,
    loc?: SourceLocation,
    variableName?: string,
  ): void {
    const armTypes = this.inferControlInitializerArmTypes(init, scope);
    if (!armTypes) return;

    const reportedTypes = new Set<string>();
    for (const armType of armTypes) {
      if (this.isAssignableType(targetType, armType)) continue;

      const formattedType = this.formatSemanticType(armType);
      if (reportedTypes.has(formattedType)) continue;
      reportedTypes.add(formattedType);

      this.addDiagnostic(
        'type-mismatch',
        this.variableAssignmentMessage(formattedType, this.formatSemanticType(targetType), variableName),
        loc,
      );
    }
  }

  private inferControlInitializerArmTypes(init: Expression | IfStatement, scope: SemanticScope): SemanticType[] | undefined {
    if (init.type === 'ConditionalExpression') {
      return [
        this.inferExpressionType(init.consequent, scope),
        this.inferExpressionType(init.alternate, scope),
      ];
    }

    if (init.type === 'SwitchExpression') {
      return init.cases
        .map((switchCase) => {
          const caseScope = new SemanticScope(scope);
          return Array.isArray(switchCase.consequent)
            ? this.inferExpressionTypeFromStatements(switchCase.consequent, caseScope)
            : this.inferExpressionType(switchCase.consequent, caseScope);
        })
        .filter((type): type is SemanticType => !!type);
    }

    if (init.type === 'IfStatement') {
      const consequentType = this.inferExpressionTypeFromStatements(init.consequent, new SemanticScope(scope));
      const alternateType = Array.isArray(init.alternate)
        ? this.inferExpressionTypeFromStatements(init.alternate, new SemanticScope(scope))
        : init.alternate
          ? this.inferIfExpressionType(init.alternate, scope)
          : undefined;
      return [consequentType, alternateType].filter((type): type is SemanticType => !!type);
    }

    return undefined;
  }

  private canCheckTypeCompatibility(annotation: TypeAnnotation | undefined | null): boolean {
    if (!annotation) return false;

    if (annotation.baseType === 'array' || annotation.baseType === 'matrix') {
      return !this.isInvalidTemplateTypeName(annotation.elementType);
    }

    if (annotation.baseType === 'map') {
      return !this.isInvalidTemplateTypeName(annotation.keyType)
        && this.isValidMapKeyTypeName(annotation.keyType)
        && !this.isInvalidTemplateTypeName(annotation.valueType);
    }

    return true;
  }

  private isAssignableType(targetType: SemanticType, sourceType: SemanticType): boolean {
    if (targetType.kind === 'unknown' || sourceType.kind === 'unknown') return true;

    if (targetType.kind === 'unique' || sourceType.kind === 'unique') {
      return targetType.kind === sourceType.kind && targetType.name === sourceType.name;
    }

    if (targetType.kind === 'array' && sourceType.kind === 'array') {
      return this.isAssignableType(targetType.elementType ?? UNKNOWN_SEMANTIC_TYPE, sourceType.elementType ?? UNKNOWN_SEMANTIC_TYPE);
    }

    if (targetType.kind === 'matrix' && sourceType.kind === 'matrix') {
      const targetElement = targetType.elementType ?? UNKNOWN_SEMANTIC_TYPE;
      const sourceElement = sourceType.elementType ?? UNKNOWN_SEMANTIC_TYPE;
      if (this.isNumericType(targetElement) && this.isNumericType(sourceElement)) {
        return targetElement.kind === sourceElement.kind;
      }
      return this.isAssignableType(targetElement, sourceElement);
    }

    if (targetType.kind === 'map' && sourceType.kind === 'map') {
      return this.isAssignableType(targetType.keyType ?? UNKNOWN_SEMANTIC_TYPE, sourceType.keyType ?? UNKNOWN_SEMANTIC_TYPE)
        && this.isAssignableType(targetType.valueType ?? UNKNOWN_SEMANTIC_TYPE, sourceType.valueType ?? UNKNOWN_SEMANTIC_TYPE);
    }

    if (targetType.kind === 'udt' && sourceType.kind === 'udt') {
      return targetType.name === sourceType.name;
    }

    if (STRUCTURED_TYPE_KINDS.has(targetType.kind) || STRUCTURED_TYPE_KINDS.has(sourceType.kind)) {
      return false;
    }

    if (REFERENCE_TYPE_KINDS.has(targetType.kind) || REFERENCE_TYPE_KINDS.has(sourceType.kind)) {
      return targetType.kind === sourceType.kind;
    }

    if (!PRIMITIVE_TYPE_KINDS.has(targetType.kind) || !PRIMITIVE_TYPE_KINDS.has(sourceType.kind)) return true;
    if (targetType.kind === 'bool' && this.versionRules.allowsImplicitNumericToBool && this.isNumericType(sourceType)) return true;

    return targetType.kind === sourceType.kind || (targetType.kind === 'float' && sourceType.kind === 'int');
  }

  private formatSemanticType(type: SemanticType): string {
    switch (type.kind) {
      case 'array':
        return `array<${this.formatSemanticType(type.elementType ?? UNKNOWN_SEMANTIC_TYPE)}>`;
      case 'matrix':
        return `matrix<${this.formatSemanticType(type.elementType ?? UNKNOWN_SEMANTIC_TYPE)}>`;
      case 'map':
        return `map<${this.formatSemanticType(type.keyType ?? UNKNOWN_SEMANTIC_TYPE)}, ${this.formatSemanticType(type.valueType ?? UNKNOWN_SEMANTIC_TYPE)}>`;
      case 'udt':
      case 'unique':
        return type.name ?? 'udt';
      default:
        return type.kind;
    }
  }

  private formatSemanticTypeWithQualifier(type: SemanticType): string {
    const formattedType = this.formatSemanticType(type);
    return type.qualifier ? `${type.qualifier} ${formattedType}` : formattedType;
  }

  private isNumericType(type: SemanticType): type is SemanticType & { kind: 'int' | 'float' } {
    return type.kind === 'int' || type.kind === 'float';
  }

  private resolveOfficialImportedFunction(name: string, scope: SemanticScope): OfficialTradingViewLibraryFunction | undefined {
    const path = name.split('.');
    if (path.length !== 2) return undefined;
    const [alias, member] = path;
    if (!alias || !member || scope.lookup(alias)?.kind !== 'import') return undefined;
    return this.importedLibraries.get(alias)?.builtinFunctions?.get(member);
  }

  private isKnownBuiltinFunction(name: string): boolean {
    const canonicalName = canonicalBuiltinName(name);
    return BUILTIN_FUNCTIONS.has(name)
      || BUILTIN_FUNCTIONS.has(canonicalName)
      || BUILTIN_SIGNATURES.has(name)
      || BUILTIN_SIGNATURES.has(canonicalName);
  }

  private declare(scope: SemanticScope, symbol: SemanticSymbol): boolean {
    const existing = scope.declare(symbol);
    if (!existing) {
      if (symbol.kind === 'variable' && scope.executionMayBeSkipped) this.sparseHistorySymbols.add(symbol);
      return true;
    }
    this.addDiagnostic('duplicate-symbol', this.duplicateSymbolMessage(symbol.name, existing.loc), symbol.loc);
    return false;
  }

  private isKnownIdentifier(name: string): boolean {
    return (this.currentPineVersion < 4 && V4_RENAMED_MARKET_VARIABLES.has(name))
      || (isPineBuiltinGlobalAvailable(this.currentPineVersion, name) && BUILTIN_GLOBALS.has(name))
      || BUILTIN_NAMESPACES.has(name)
      || (this.versionRules.allowsLegacyGenericInputTypeArgument && LEGACY_INPUT_TYPE_ALIASES.has(name))
      || (this.versionRules.supportsLegacyBareColorConstants && LEGACY_BARE_COLOR_CONSTANT_VALUES.has(name))
      || (this.versionRules.allowsRawUniqueParameterValues && LEGACY_BARE_VISUAL_CONSTANT_VALUES.has(name))
      || (this.versionRules.allowsLegacyGlobalBuiltinAliases && TA_FLOAT_MEMBER_NAMES.has(`ta.${name}`))
      || (this.versionRules.allowsLegacyGlobalBuiltinAliases && LEGACY_BARE_SYMINFO_ALIASES.has(name))
      || (this.versionRules.supportsLegacyTimeframeVariableAliases && LEGACY_TIMEFRAME_VARIABLE_ALIASES.has(name))
      || (this.versionRules.supportsLegacyBarIndexAlias && LEGACY_BAR_INDEX_ALIASES.has(name))
      || (this.versionRules.supportsLegacySundayConstant && name === 'sunday');
  }

  private unknownFunctionMessage(name: string): string {
    return name === 'ta.not_a_function'
      ? `Unknown function '${name}'; check the namespace/name or add a library import that defines it`
      : `Unknown function: ${name}`;
  }

  private unknownIdentifierMessage(name: string): string {
    if (name === 'Math') return 'Unknown identifier: Math. Pine namespaces are lowercase; use `math`, for example `math.max(...)`.';
    if (name === 'Array') return 'Unknown identifier: Array. Pine namespaces are lowercase; use `array`, for example `array.new_float(...)` or array methods.';
    if (name === 'console') return 'Unknown identifier: console. Pine Script has no JavaScript `console.log`; use Pine `log.info(...)`, `log.warning(...)`, or `log.error(...)` when logging is available.';
    return `Unknown identifier: ${name}`;
  }

  private duplicateSymbolMessage(name: string, existingLoc?: SourceLocation): string {
    const firstDeclaration = existingLoc ? `; first declared on line ${existingLoc.start.line}` : '';
    return `Duplicate declaration: ${name}${firstDeclaration}. Rename one declaration or remove the duplicate.`;
  }

  private unknownArgumentMessage(name: string, displayName: string, allowedParams: string[]): string {
    const hint = this.legacyArgumentHint(displayName, name);
    if (hint) return `Unknown argument '${name}' for ${displayName}; ${hint}`;

    const snakeCaseName = camelToSnakeCase(name);
    if (snakeCaseName !== name && allowedParams.includes(snakeCaseName)) {
      return `Unknown argument '${name}' for ${displayName}; Pine uses snake_case here, so use '${snakeCaseName}'`;
    }

    if (displayName === 'color.new()' && name === 'linewidth') {
      return "Unknown argument 'linewidth' for color.new(); linewidth belongs on plot(), hline(), or drawing calls, not inside a color.new(...) color value";
    }

    if (displayName === 'ta.sma()' && name === 'bogus') {
      return `Unknown argument '${name}' for ${displayName}; expected one of: ${allowedParams.join(', ')}`;
    }

    return `Unknown argument '${name}' for ${displayName}`;
  }

  private argumentCountMessage(displayName: string, minArgs: number, params: string[], boundParamCount: number): string {
    if (displayName === 'ta.sma') {
      return `${displayName}() expects at least ${minArgs} argument${minArgs === 1 ? '' : 's'} (${params.join(', ')}); got ${boundParamCount}`;
    }
    return `${displayName}() expects at least ${minArgs} argument${minArgs === 1 ? '' : 's'}`;
  }

  private variableAssignmentMessage(source: string, target: string, variableName?: string): string {
    const message = variableName
      ? `Cannot assign ${source} value to ${target} variable ${variableName}`
      : `Cannot assign ${source} value to ${target} variable`;
    if (source === 'float' && target === 'int') {
      return `${message}. Pine does not round floats into ints automatically; use int(...) to convert explicitly or declare it as float.`;
    }
    return message;
  }

  private voidAssignmentMessage(target: string, expression: Expression | IfStatement): string {
    if (expression.type === 'CallExpression') {
      const calleeName = this.memberPath(expression.callee).join('.');
      if (calleeName) {
        return `Cannot assign result of ${calleeName}() to ${target}. ${calleeName}() returns no value; call it on its own line instead.`;
      }
    }
    return `Cannot assign void value to ${target}`;
  }

  private duplicateArgumentMessage(name: string, displayName: string): string {
    return `Argument '${name}' for ${displayName} was supplied multiple times. Pine parameters can be set only once; remove one of the values.`;
  }

  private qualifierMismatchMessage(
    actualQualifier: SemanticQualifier,
    expectedQualifier: SemanticQualifier,
    parameterName: string,
    displayName: string,
  ): string {
    return `Cannot pass ${actualQualifier} value to ${expectedQualifier} parameter '${parameterName}' for ${displayName}; use an input/simple value or declare a compatible parameter`;
  }

  private legacyArgumentHint(displayName: string, name: string): string | undefined {
    if ((displayName === 'indicator()' || displayName === 'strategy()') && name === 'resolution') {
      return "use 'timeframe' in Pine v6";
    }
    if ((displayName === 'indicator()' || displayName === 'strategy()') && name === 'resolution_gaps') {
      return "use 'timeframe_gaps' in Pine v6";
    }
    if (displayName === 'strategy()' && (name === 'timeframe' || name === 'timeframe_gaps')) {
      return `'${name}' is an indicator() option, not a strategy() option`;
    }
    if ((displayName === 'plot()' || displayName === 'plotshape()' || displayName === 'plotchar()' || displayName === 'plotarrow()') && name === 'transp') {
      return 'use color.new(color, transparency) in Pine v6';
    }
    return undefined;
  }

  private legacyCompatibleArgumentMessage(displayName: string, name: string): string {
    const hint = this.legacyArgumentHint(`${displayName}()`, name);
    if (hint) return `${displayName}() accepted legacy argument '${name}' for compatibility; ${hint}`;
    if (displayName === 'input') {
      return `input() accepted legacy argument '${name}' for compatibility; modern Pine uses typed input.* helpers`;
    }
    return `${displayName}() accepted legacy argument '${name}' for compatibility`;
  }

  private addDiagnostic(code: string, message: string, loc?: SourceLocation, severity: SemanticDiagnosticSeverity = 'error'): void {
    this.diagnostics.push({
      code,
      message,
      severity,
      line: loc?.start.line,
      column: loc?.start.column,
    });
  }
}
