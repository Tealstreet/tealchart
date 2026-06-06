import type {
  AssignmentStatement,
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
  Program,
  SourceLocation,
  Statement,
  SwitchCase,
  SwitchExpression,
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
  CALENDAR_FUNCTION_NAMES,
  isExportableBuiltinConstantPath,
} from '../builtinMetadata';

export type SemanticDiagnosticSeverity = 'error' | 'warning';

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
  | 'string'
  | 'table'
  | 'udt'
  | 'unknown'
  | 'void';

export interface SemanticType {
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
}

export interface SemanticCheckOptions {
  libraries?: Map<string, Program>;
}

type TupleInitializerShape =
  | { kind: 'tuple'; arity: number }
  | { kind: 'non-tuple' }
  | { kind: 'unknown' };

interface SemanticImportedLibrary {
  alias: string;
  functions: Map<string, FunctionDeclaration>;
  types: Map<string, TypeDeclaration>;
  enums: Map<string, EnumDeclaration>;
  constants: Map<string, VariableDeclaration>;
  methods: Map<string, FunctionDeclaration[]>;
}

class SemanticScope {
  private readonly symbols = new Map<string, SemanticSymbol>();

  constructor(private readonly parent?: SemanticScope) {}

  declare(symbol: SemanticSymbol): SemanticSymbol | null {
    const existing = this.symbols.get(symbol.name);
    if (existing) return existing;
    this.symbols.set(symbol.name, symbol);
    return null;
  }

  lookup(name: string): SemanticSymbol | null {
    return this.symbols.get(name) ?? this.parent?.lookup(name) ?? null;
  }

  lookupLocal(name: string): SemanticSymbol | null {
    return this.symbols.get(name) ?? null;
  }

  allSymbols(): SemanticSymbol[] {
    return [...this.symbols.values()];
  }
}

const ARRAY_CONSTRUCTOR_ELEMENT_TYPES = new Map<string, SemanticTypeKind>([
  ['array.new_bool', 'bool'],
  ['array.new_box', 'box'],
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

const INPUT_DEFAULT_TYPE_REQUIREMENTS = new Map<string, 'bool' | 'int' | 'number' | 'string'>([
  ['input.bool', 'bool'],
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
const ALERT_FREQUENCY_VALUES = new Set(['all', 'once_per_bar', 'once_per_bar_close']);
const ALERT_FREQUENCY_CONSTANT_VALUES = new Map([
  ['alert.freq_all', 'all'],
  ['alert.freq_once_per_bar', 'once_per_bar'],
  ['alert.freq_once_per_bar_close', 'once_per_bar_close'],
]);
const REQUEST_GAPS_MODES = new Set(['barmerge.gaps_on', 'barmerge.gaps_off']);
const REQUEST_LOOKAHEAD_MODES = new Set(['barmerge.lookahead_on', 'barmerge.lookahead_off']);
const REQUEST_BARMERGE_MODE_CALLS = new Set([
  'request.security',
  'request.dividends',
  'request.earnings',
  'request.splits',
  'request.financial',
  'request.economic',
]);
const REQUEST_DIVIDENDS_FIELD_VALUES = new Set(['dividends.gross', 'dividends.net']);
const REQUEST_DIVIDENDS_FIELD_CONSTANT_VALUES = new Map([...REQUEST_DIVIDENDS_FIELD_VALUES].map((value) => [value, value]));
const REQUEST_EARNINGS_FIELD_VALUES = new Set(['earnings.actual', 'earnings.estimate', 'earnings.standardized']);
const REQUEST_EARNINGS_FIELD_CONSTANT_VALUES = new Map([...REQUEST_EARNINGS_FIELD_VALUES].map((value) => [value, value]));
const REQUEST_SPLITS_FIELD_VALUES = new Set(['splits.denominator', 'splits.numerator']);
const REQUEST_SPLITS_FIELD_CONSTANT_VALUES = new Map([...REQUEST_SPLITS_FIELD_VALUES].map((value) => [value, value]));

const COLOR_CONSTRUCTOR_NAMES = new Set(['color.new', 'color.rgb']);
const COLOR_CHANNEL_NAMES = new Set(['color.r', 'color.g', 'color.b', 'color.t']);

const MATH_CONSTANT_NAMES = new Set(['math.pi', 'math.e', 'math.phi']);
const MATH_PRESERVE_NUMERIC_NAMES = new Set(['math.abs', 'math.max', 'math.min']);
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
  'math.pow',
]);
const MATH_INT_RETURN_NAMES = new Set(['math.trunc', 'math.floor', 'math.ceil']);
const MATH_SERIES_FLOAT_RETURN_NAMES = new Set([
  'math.sum',
  'math.random',
  'math.toradians',
  'math.todegrees',
]);

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
const STRING_INT_RETURN_NAMES = new Set(['str.length', 'str.pos']);

const TA_BOOL_RETURN_NAMES = new Set(['ta.cross', 'ta.crossover', 'ta.crossunder', 'ta.rising', 'ta.falling']);
const TA_INT_RETURN_NAMES = new Set(['ta.barssince', 'ta.highestbars', 'ta.lowestbars']);
const TA_FLOAT_RETURN_NAMES = new Set([
  'ta.alma',
  'ta.atr',
  'ta.bbw',
  'ta.cci',
  'ta.cmo',
  'ta.cog',
  'ta.correlation',
  'ta.cum',
  'ta.dev',
  'ta.ema',
  'ta.hma',
  'ta.linreg',
  'ta.mfi',
  'ta.obv',
  'ta.percentile_linear_interpolation',
  'ta.percentile_nearest_rank',
  'ta.percentrank',
  'ta.rma',
  'ta.roc',
  'ta.rsi',
  'ta.sar',
  'ta.sma',
  'ta.stdev',
  'ta.stoch',
  'ta.swma',
  'ta.tr',
  'ta.tsi',
  'ta.variance',
  'ta.vwma',
  'ta.wma',
  'ta.wpr',
]);
const TA_SOURCE_RETURN_NAMES = new Set(['ta.range', 'ta.median', 'ta.mode', 'ta.mom']);
const TA_DEFAULT_SOURCE_RETURN_NAMES = new Set(['ta.highest', 'ta.lowest']);
const TA_FLOAT_MEMBER_NAMES = new Set(['ta.iii', 'ta.nvi', 'ta.obv', 'ta.pvi', 'ta.pvt', 'ta.tr', 'ta.wad', 'ta.wvad']);

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

const SYMINFO_STRING_MEMBER_NAMES = new Set([
  'syminfo.basecurrency',
  'syminfo.country',
  'syminfo.currency',
  'syminfo.current_contract',
  'syminfo.description',
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
  'request.splits',
]);

const STRATEGY_FLOAT_MEMBER_NAMES = new Set([
  'strategy.equity',
  'strategy.grossloss',
  'strategy.grossprofit',
  'strategy.initial_capital',
  'strategy.max_drawdown',
  'strategy.max_runup',
  'strategy.netprofit',
  'strategy.openprofit',
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
]);

const BUILTIN_FUNCTIONS = new Set([
  'alert',
  'alertcondition',
  'barcolor',
  'bgcolor',
  'bool',
  'fill',
  'fixnan',
  'float',
  'hline',
  'indicator',
  'int',
  'label',
  'line',
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
  'string',
  'strategy',
  'time',
  'time_close',
  'timestamp',
  ...CALENDAR_FUNCTION_NAMES,
]);

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

const STRATEGY_ORDER_PARAMS = ['id', 'direction', 'qty', 'limit', 'stop', 'oca_name', 'oca_type', 'comment', 'alert_message', 'disable_alert'];
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
const STRATEGY_DIRECTION_VALUES = new Set(['long', 'short']);
const STRATEGY_ALLOWED_ENTRY_DIRECTION_VALUES = new Set(['all', 'long', 'short']);
const STRATEGY_OCA_TYPE_VALUES = new Set(['cancel', 'reduce', 'none']);
const STRATEGY_DEFAULT_QTY_TYPE_VALUES = new Set(['fixed', 'cash', 'percent_of_equity']);
const STRATEGY_COMMISSION_TYPE_VALUES = new Set(['percent', 'cash_per_order', 'cash_per_contract']);
const STRATEGY_CASH_OR_PERCENT_RISK_TYPE_VALUES = new Set(['cash', 'percent_of_equity']);
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
  aliases?: Record<string, string>;
  overloads?: string[][];
  minArgs?: number;
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
  ['alert', { params: ['message', 'freq'], minArgs: 1, allowNamedPrefixWithPositional: true }],
  ['alertcondition', { params: ['condition', 'title', 'message'], minArgs: 1, allowNamedPrefixWithPositional: true }],
  ['barcolor', { params: ['color', 'offset', 'editable', 'show_last', 'title', 'display'], minArgs: 1, allowNamedPrefixWithPositional: true }],
  ['bgcolor', { params: ['color', 'offset', 'editable', 'show_last', 'title', 'display', 'force_overlay'], minArgs: 1, allowNamedPrefixWithPositional: true }],
  ['bool', { params: ['x'], minArgs: 1, maxArgs: 1, allowNamedPrefixWithPositional: true }],
  ['chart.point.copy', { params: ['id'], minArgs: 1, maxArgs: 1, allowNamedPrefixWithPositional: true }],
  ['chart.point.from_index', { params: ['index', 'price'], minArgs: 2, maxArgs: 2, allowNamedPrefixWithPositional: true }],
  ['chart.point.from_time', { params: ['time', 'price'], minArgs: 2, maxArgs: 2, allowNamedPrefixWithPositional: true }],
  ['chart.point.new', { params: ['time', 'index', 'price'], minArgs: 3, maxArgs: 3, allowNamedPrefixWithPositional: true }],
  ['chart.point.now', { params: ['price'], minArgs: 0, maxArgs: 1, allowNamedPrefixWithPositional: true }],
  ['color.new', { params: ['color', 'transp'], minArgs: 2, maxArgs: 2, allowNamedPrefixWithPositional: true }],
  ['color.rgb', { params: ['red', 'green', 'blue', 'transp'], minArgs: 3, maxArgs: 4, allowNamedPrefixWithPositional: true }],
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
      aliases: { hline1: 'plot1', hline2: 'plot2' },
      minArgs: 3,
      allowNamedPrefixWithPositional: true,
    },
  ],
  ['fixnan', { params: ['source'], minArgs: 1, maxArgs: 1, allowNamedPrefixWithPositional: true }],
  ['float', { params: ['x'], minArgs: 1, maxArgs: 1, allowNamedPrefixWithPositional: true }],
  ['hline', { params: ['price', 'title', 'color', 'linestyle', 'linewidth', 'editable', 'display'], minArgs: 1, allowNamedPrefixWithPositional: true }],
  ['int', { params: ['x'], minArgs: 1, maxArgs: 1, allowNamedPrefixWithPositional: true }],
  [
    'label.new',
    {
      params: ['x', 'y', 'text', 'xloc', 'yloc', 'color', 'style', 'textcolor', 'size', 'textalign', 'tooltip', 'text_font_family', 'force_overlay', 'text_formatting'],
      minArgs: 2,
      maxArgs: 14,
      allowNamedPrefixWithPositional: true,
    },
  ],
  ['label.delete', { params: ['id'], minArgs: 1, maxArgs: 1, allowNamedPrefixWithPositional: true }],
  ['label.copy', { params: ['id'], minArgs: 1, maxArgs: 1, allowNamedPrefixWithPositional: true }],
  ['label.set_x', { params: ['id', 'x'], minArgs: 2, maxArgs: 2, allowNamedPrefixWithPositional: true }],
  ['label.set_y', { params: ['id', 'y'], minArgs: 2, maxArgs: 2, allowNamedPrefixWithPositional: true }],
  ['label.set_xy', { params: ['id', 'x', 'y'], minArgs: 3, maxArgs: 3, allowNamedPrefixWithPositional: true }],
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
  ['line.set_first_point', { params: ['id', 'first_point'], minArgs: 2, maxArgs: 2, allowNamedPrefixWithPositional: true }],
  ['line.set_second_point', { params: ['id', 'second_point'], minArgs: 2, maxArgs: 2, allowNamedPrefixWithPositional: true }],
  ['line.set_xloc', { params: ['id', 'x1', 'x2', 'xloc'], minArgs: 4, maxArgs: 4, allowNamedPrefixWithPositional: true }],
  ['line.set_extend', { params: ['id', 'extend'], minArgs: 2, maxArgs: 2, allowNamedPrefixWithPositional: true }],
  ['line.set_color', { params: ['id', 'color'], minArgs: 2, maxArgs: 2, allowNamedPrefixWithPositional: true }],
  ['line.set_style', { params: ['id', 'style'], minArgs: 2, maxArgs: 2, allowNamedPrefixWithPositional: true }],
  ['line.set_width', { params: ['id', 'width'], minArgs: 2, maxArgs: 2, allowNamedPrefixWithPositional: true }],
  ['line.get_x1', { params: ['id'], minArgs: 1, maxArgs: 1, allowNamedPrefixWithPositional: true }],
  ['line.get_x2', { params: ['id'], minArgs: 1, maxArgs: 1, allowNamedPrefixWithPositional: true }],
  ['line.get_y1', { params: ['id'], minArgs: 1, maxArgs: 1, allowNamedPrefixWithPositional: true }],
  ['line.get_y2', { params: ['id'], minArgs: 1, maxArgs: 1, allowNamedPrefixWithPositional: true }],
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
  ['box.set_text_size', { params: ['id', 'size'], minArgs: 2, maxArgs: 2, allowNamedPrefixWithPositional: true }],
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
  ['linefill.new', { params: ['line1', 'line2', 'color'], minArgs: 2, maxArgs: 3, allowNamedPrefixWithPositional: true }],
  ['linefill.delete', { params: ['id'], minArgs: 1, maxArgs: 1, allowNamedPrefixWithPositional: true }],
  ['linefill.set_color', { params: ['id', 'color'], minArgs: 2, maxArgs: 2, allowNamedPrefixWithPositional: true }],
  ['linefill.get_line1', { params: ['id'], minArgs: 1, maxArgs: 1, allowNamedPrefixWithPositional: true }],
  ['linefill.get_line2', { params: ['id'], minArgs: 1, maxArgs: 1, allowNamedPrefixWithPositional: true }],
  [
    'table.new',
    {
      params: ['position', 'columns', 'rows', 'bgcolor', 'frame_color', 'frame_width', 'border_color', 'border_width'],
      minArgs: 2,
      requiredParams: ['columns', 'rows'],
      maxArgs: 8,
      allowNamedPrefixWithPositional: true,
    },
  ],
  ['table.delete', { params: ['table_id'], minArgs: 1, maxArgs: 1, allowNamedPrefixWithPositional: true }],
  ['table.clear', { params: ['table_id', 'start_column', 'start_row', 'end_column', 'end_row'], minArgs: 3, maxArgs: 5, allowNamedPrefixWithPositional: true }],
  ['table.merge_cells', { params: ['table_id', 'start_column', 'start_row', 'end_column', 'end_row'], minArgs: 5, maxArgs: 5, allowNamedPrefixWithPositional: true }],
  ['table.set_position', { params: ['table_id', 'position'], minArgs: 2, maxArgs: 2, allowNamedPrefixWithPositional: true }],
  ['table.set_bgcolor', { params: ['table_id', 'bgcolor'], minArgs: 2, maxArgs: 2, allowNamedPrefixWithPositional: true }],
  ['table.set_frame_color', { params: ['table_id', 'frame_color'], minArgs: 2, maxArgs: 2, allowNamedPrefixWithPositional: true }],
  ['table.set_frame_width', { params: ['table_id', 'frame_width'], minArgs: 2, maxArgs: 2, allowNamedPrefixWithPositional: true }],
  ['table.set_border_color', { params: ['table_id', 'border_color'], minArgs: 2, maxArgs: 2, allowNamedPrefixWithPositional: true }],
  ['table.set_border_width', { params: ['table_id', 'border_width'], minArgs: 2, maxArgs: 2, allowNamedPrefixWithPositional: true }],
  [
    'table.cell',
    {
      params: ['table_id', 'column', 'row', 'text', 'width', 'height', 'text_color', 'text_halign', 'text_valign', 'text_size', 'bgcolor', 'text_font_family', 'text_formatting', 'tooltip'],
      minArgs: 3,
      maxArgs: 14,
      allowNamedPrefixWithPositional: true,
    },
  ],
  ['table.cell_set_text', { params: ['table_id', 'column', 'row', 'text'], minArgs: 4, maxArgs: 4, allowNamedPrefixWithPositional: true }],
  ['table.cell_set_bgcolor', { params: ['table_id', 'column', 'row', 'bgcolor'], minArgs: 4, maxArgs: 4, allowNamedPrefixWithPositional: true }],
  ['table.cell_set_text_color', { params: ['table_id', 'column', 'row', 'text_color'], minArgs: 4, maxArgs: 4, allowNamedPrefixWithPositional: true }],
  ['table.cell_set_text_size', { params: ['table_id', 'column', 'row', 'text_size'], minArgs: 4, maxArgs: 4, allowNamedPrefixWithPositional: true }],
  ['table.cell_set_width', { params: ['table_id', 'column', 'row', 'width'], minArgs: 4, maxArgs: 4, allowNamedPrefixWithPositional: true }],
  ['table.cell_set_height', { params: ['table_id', 'column', 'row', 'height'], minArgs: 4, maxArgs: 4, allowNamedPrefixWithPositional: true }],
  ['table.cell_set_text_halign', { params: ['table_id', 'column', 'row', 'text_halign'], minArgs: 4, maxArgs: 4, allowNamedPrefixWithPositional: true }],
  ['table.cell_set_text_valign', { params: ['table_id', 'column', 'row', 'text_valign'], minArgs: 4, maxArgs: 4, allowNamedPrefixWithPositional: true }],
  ['table.cell_set_text_font_family', { params: ['table_id', 'column', 'row', 'text_font_family'], minArgs: 4, maxArgs: 4, allowNamedPrefixWithPositional: true }],
  ['table.cell_set_text_formatting', { params: ['table_id', 'column', 'row', 'text_formatting'], minArgs: 4, maxArgs: 4, allowNamedPrefixWithPositional: true }],
  ['table.cell_set_tooltip', { params: ['table_id', 'column', 'row', 'tooltip'], minArgs: 4, maxArgs: 4, allowNamedPrefixWithPositional: true }],
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
      minArgs: 1,
      allowNamedPrefixWithPositional: true,
    },
  ],
  [
    'plotbar',
    {
      params: ['open', 'high', 'low', 'close', 'title', 'color', 'editable', 'show_last', 'display', 'format', 'precision', 'force_overlay'],
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
  ['input.session', { params: ['defval', 'title', 'tooltip', 'inline', 'group', 'confirm', 'display', 'active'], minArgs: 1, allowNamedPrefixWithPositional: true }],
  ['input.text_area', { params: ['defval', 'title', 'tooltip', 'inline', 'group', 'confirm', 'display', 'active'], minArgs: 1, allowNamedPrefixWithPositional: true }],
  ['input.source', { params: ['defval', 'title', 'tooltip', 'inline', 'group', 'confirm', 'display', 'active'], minArgs: 1, allowNamedPrefixWithPositional: true }],
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
  ['math.sqrt', { params: ['number'], minArgs: 1, maxArgs: 1, allowNamedPrefixWithPositional: true }],
  ['math.log', { params: ['number'], minArgs: 1, maxArgs: 1, allowNamedPrefixWithPositional: true }],
  ['math.log10', { params: ['number'], minArgs: 1, maxArgs: 1, allowNamedPrefixWithPositional: true }],
  ['math.exp', { params: ['number'], minArgs: 1, maxArgs: 1, allowNamedPrefixWithPositional: true }],
  ['math.trunc', { params: ['number'], minArgs: 1, maxArgs: 1, allowNamedPrefixWithPositional: true }],
  ['math.floor', { params: ['number'], minArgs: 1, maxArgs: 1, allowNamedPrefixWithPositional: true }],
  ['math.ceil', { params: ['number'], minArgs: 1, maxArgs: 1, allowNamedPrefixWithPositional: true }],
  ['math.sign', { params: ['number'], minArgs: 1, maxArgs: 1, allowNamedPrefixWithPositional: true }],
  ['math.sin', { params: ['number'], minArgs: 1, maxArgs: 1, allowNamedPrefixWithPositional: true }],
  ['math.cos', { params: ['number'], minArgs: 1, maxArgs: 1, allowNamedPrefixWithPositional: true }],
  ['math.tan', { params: ['number'], minArgs: 1, maxArgs: 1, allowNamedPrefixWithPositional: true }],
  ['math.asin', { params: ['number'], minArgs: 1, maxArgs: 1, allowNamedPrefixWithPositional: true }],
  ['math.acos', { params: ['number'], minArgs: 1, maxArgs: 1, allowNamedPrefixWithPositional: true }],
  ['math.atan', { params: ['number'], minArgs: 1, maxArgs: 1, allowNamedPrefixWithPositional: true }],
  ['math.toradians', { params: ['number'], minArgs: 1, maxArgs: 1, allowNamedPrefixWithPositional: true }],
  ['math.todegrees', { params: ['number'], minArgs: 1, maxArgs: 1, allowNamedPrefixWithPositional: true }],
  ['math.max', { params: ['number0', 'number1'], minArgs: 2, allowExtraPositional: true, allowNamedPrefixWithPositional: true, variadicParamPrefix: 'number' }],
  ['math.min', { params: ['number0', 'number1'], minArgs: 2, allowExtraPositional: true, allowNamedPrefixWithPositional: true, variadicParamPrefix: 'number' }],
  ['math.avg', { params: ['number0', 'number1'], minArgs: 2, allowExtraPositional: true, allowNamedPrefixWithPositional: true, variadicParamPrefix: 'number' }],
  ['math.pow', { params: ['base', 'exponent'], minArgs: 2, maxArgs: 2, allowNamedPrefixWithPositional: true }],
  ['math.round', { params: ['number', 'precision'], minArgs: 1, maxArgs: 2, allowNamedPrefixWithPositional: true }],
  ['math.round_to_mintick', { params: ['number'], minArgs: 1, maxArgs: 1, allowNamedPrefixWithPositional: true }],
  ['math.sum', { params: ['source', 'length'], minArgs: 2, maxArgs: 2, allowNamedPrefixWithPositional: true }],
  ['math.random', { params: ['min', 'max', 'seed'], minArgs: 0, maxArgs: 3, allowNamedPrefixWithPositional: true }],
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
  ['request.splits', { params: ['ticker', 'field', 'gaps', 'lookahead', 'ignore_invalid_symbol'], minArgs: 1, allowNamedPrefixWithPositional: true }],
  ['request.financial', { params: ['symbol', 'financial_id', 'period', 'gaps', 'ignore_invalid_symbol', 'currency'], minArgs: 3, allowNamedPrefixWithPositional: true }],
  ['request.economic', { params: ['country_code', 'field', 'gaps', 'ignore_invalid_symbol'], minArgs: 2, allowNamedPrefixWithPositional: true }],
  ['request.seed', { params: ['source', 'symbol', 'expression', 'ignore_invalid_symbol', 'calc_bars_count'], minArgs: 3, allowNamedPrefixWithPositional: true }],
  ['runtime.error', { params: ['message'], minArgs: 1, maxArgs: 1 }],
  ['string', { params: ['x'], minArgs: 1, maxArgs: 1, allowNamedPrefixWithPositional: true }],
  ['str.tostring', { params: ['value', 'format'], minArgs: 1, maxArgs: 2, allowNamedPrefixWithPositional: true }],
  ['str.tonumber', { params: ['string'], minArgs: 1, maxArgs: 1, allowNamedPrefixWithPositional: true }],
  ['str.format_time', { params: ['time', 'format', 'timezone'], minArgs: 0, maxArgs: 3, allowNamedPrefixWithPositional: true }],
  ['str.format', { params: ['format'], minArgs: 1, allowExtraPositional: true, allowNamedPrefixWithPositional: true }],
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
  ['strategy.cancel', { params: ['id'], minArgs: 1, maxArgs: 1, allowNamedPrefixWithPositional: true }],
  ['strategy.cancel_all', { params: [], minArgs: 0, maxArgs: 0 }],
  ['strategy.close', { params: ['id', 'comment', 'qty', 'qty_percent', 'alert_message', 'immediately', 'disable_alert'], minArgs: 1, allowNamedPrefixWithPositional: true }],
  ['strategy.close_all', { params: ['comment', 'alert_message', 'immediately', 'disable_alert'], minArgs: 0, allowNamedPrefixWithPositional: true }],
  ['strategy.entry', { params: STRATEGY_ORDER_PARAMS, minArgs: 2, maxArgs: STRATEGY_ORDER_PARAMS.length, allowNamedPrefixWithPositional: true }],
  ['strategy.exit', { params: STRATEGY_EXIT_PARAMS, minArgs: 1, maxArgs: STRATEGY_EXIT_PARAMS.length, allowNamedPrefixWithPositional: true }],
  ['strategy.order', { params: STRATEGY_ORDER_PARAMS, minArgs: 2, maxArgs: STRATEGY_ORDER_PARAMS.length, allowNamedPrefixWithPositional: true }],
  ['strategy.risk.allow_entry_in', { params: ['value'], minArgs: 1, maxArgs: 1, allowNamedPrefixWithPositional: true }],
  ['strategy.risk.max_cons_loss_days', { params: ['count', 'alert_message'], minArgs: 1, maxArgs: 2, allowNamedPrefixWithPositional: true }],
  ['strategy.risk.max_drawdown', { params: ['value', 'type', 'alert_message'], minArgs: 2, maxArgs: 3, allowNamedPrefixWithPositional: true }],
  ['strategy.risk.max_intraday_filled_orders', { params: ['count', 'alert_message'], minArgs: 1, maxArgs: 2, allowNamedPrefixWithPositional: true }],
  ['strategy.risk.max_intraday_loss', { params: ['value', 'type', 'alert_message'], minArgs: 2, maxArgs: 3, allowNamedPrefixWithPositional: true }],
  ['strategy.risk.max_position_size', { params: ['contracts'], minArgs: 1, maxArgs: 1, allowNamedPrefixWithPositional: true }],
  ['ta.alma', { params: ['series', 'length', 'offset', 'sigma', 'floor'], minArgs: 4, maxArgs: 5, allowNamedPrefixWithPositional: true }],
  ['ta.atr', { params: ['length'], minArgs: 1, maxArgs: 1 }],
  ['ta.barssince', { params: ['condition'], minArgs: 1, maxArgs: 1, allowNamedPrefixWithPositional: true }],
  ['ta.bb', { params: ['series', 'length', 'mult'], minArgs: 3, maxArgs: 3, allowNamedPrefixWithPositional: true }],
  ['ta.bbw', { params: ['series', 'length', 'mult'], minArgs: 3, maxArgs: 3, allowNamedPrefixWithPositional: true }],
  ['ta.valuewhen', { params: ['condition', 'source', 'occurrence'], minArgs: 3, maxArgs: 3, allowNamedPrefixWithPositional: true }],
  ['ta.change', { params: ['source', 'length'], minArgs: 1, maxArgs: 2, allowNamedPrefixWithPositional: true }],
  ['ta.cci', { params: ['source', 'length'], minArgs: 2, maxArgs: 2, allowNamedPrefixWithPositional: true }],
  ['ta.cmo', { params: ['source', 'length'], minArgs: 2, maxArgs: 2, allowNamedPrefixWithPositional: true }],
  ['ta.cum', { params: ['source'], minArgs: 1, maxArgs: 1, allowNamedPrefixWithPositional: true }],
  ['ta.crossover', { params: ['source1', 'source2'], minArgs: 2, maxArgs: 2, allowNamedPrefixWithPositional: true }],
  ['ta.crossunder', { params: ['source1', 'source2'], minArgs: 2, maxArgs: 2, allowNamedPrefixWithPositional: true }],
  ['ta.cross', { params: ['source1', 'source2'], minArgs: 2, maxArgs: 2, allowNamedPrefixWithPositional: true }],
  ['ta.correlation', { params: ['source1', 'source2', 'length'], minArgs: 3, maxArgs: 3, allowNamedPrefixWithPositional: true }],
  ['ta.cog', { params: ['source', 'length'], minArgs: 2, maxArgs: 2, allowNamedPrefixWithPositional: true }],
  ['ta.dev', { params: ['source', 'length'], minArgs: 2, maxArgs: 2, allowNamedPrefixWithPositional: true }],
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
  ['ta.mom', { params: ['source', 'length'], minArgs: 2, maxArgs: 2, allowNamedPrefixWithPositional: true }],
  ['ta.range', { params: ['source', 'length'], minArgs: 2, maxArgs: 2, allowNamedPrefixWithPositional: true }],
  ['ta.rising', { params: ['source', 'length'], minArgs: 2, maxArgs: 2, allowNamedPrefixWithPositional: true }],
  ['ta.falling', { params: ['source', 'length'], minArgs: 2, maxArgs: 2, allowNamedPrefixWithPositional: true }],
  ['ta.rma', { params: ['source', 'length'], minArgs: 2, maxArgs: 2, allowNamedPrefixWithPositional: true }],
  ['ta.roc', { params: ['source', 'length'], minArgs: 2, maxArgs: 2, allowNamedPrefixWithPositional: true }],
  ['ta.rsi', { params: ['source', 'length'], minArgs: 2, maxArgs: 2, allowNamedPrefixWithPositional: true }],
  ['ta.sar', { params: ['start', 'inc', 'max'], minArgs: 3, maxArgs: 3, allowNamedPrefixWithPositional: true }],
  ['ta.sma', { params: ['source', 'length'], minArgs: 2, maxArgs: 2, allowNamedPrefixWithPositional: true }],
  ['ta.stdev', { params: ['source', 'length', 'biased'], minArgs: 2, maxArgs: 3, allowNamedPrefixWithPositional: true }],
  ['ta.stoch', { params: ['source', 'high', 'low', 'length'], minArgs: 4, maxArgs: 4, allowNamedPrefixWithPositional: true }],
  ['ta.supertrend', { params: ['factor', 'atrPeriod'], minArgs: 2, maxArgs: 2, allowNamedPrefixWithPositional: true }],
  ['ta.swma', { params: ['source'], minArgs: 1, maxArgs: 1, allowNamedPrefixWithPositional: true }],
  ['ta.tr', { params: ['handle_na'], minArgs: 0, maxArgs: 1 }],
  ['ta.tsi', { params: ['source', 'short_length', 'long_length'], minArgs: 3, maxArgs: 3, allowNamedPrefixWithPositional: true }],
  ['ta.variance', { params: ['source', 'length', 'biased'], minArgs: 2, maxArgs: 3, allowNamedPrefixWithPositional: true }],
  ['ta.vwap', { params: ['source', 'anchor', 'stdev_mult'], minArgs: 0, maxArgs: 3, allowNamedPrefixWithPositional: true }],
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
  ['ticker.kagi', { params: ['symbol', 'style', 'param'], minArgs: 3, maxArgs: 3, allowNamedPrefixWithPositional: true }],
  ['ticker.pointfigure', { params: ['symbol', 'source', 'style', 'param', 'reversal'], minArgs: 5, maxArgs: 5, allowNamedPrefixWithPositional: true }],
  ['time', { params: ['timeframe', 'session', 'timezone'], minArgs: 0, maxArgs: 3, allowNamedPrefixWithPositional: true }],
  ['time_close', { params: ['timeframe', 'session', 'timezone'], minArgs: 0, maxArgs: 3, allowNamedPrefixWithPositional: true }],
  ['timeframe.change', { params: ['timeframe'], minArgs: 0, maxArgs: 1, allowNamedPrefixWithPositional: true }],
  ['timeframe.from_seconds', { params: ['seconds'], minArgs: 1, maxArgs: 1, allowNamedPrefixWithPositional: true }],
  ['timeframe.in_seconds', { params: ['timeframe'], minArgs: 0, maxArgs: 1, allowNamedPrefixWithPositional: true }],
  ['timeframe.to_seconds', { params: ['timeframe'], minArgs: 0, maxArgs: 1, allowNamedPrefixWithPositional: true }],
  ['timestamp', { params: ['timezone', 'year', 'month', 'day', 'hour', 'minute', 'second'], minArgs: 1, maxArgs: 7, allowNamedPrefixWithPositional: true }],
]);

const INDICATOR_DECLARATION_KEYS = new Set([
  'type',
  'declarationKind',
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
  ...INDICATOR_DECLARATION_KEYS,
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
  'display.all',
]);
const DISPLAY_OPTION_CONSTANT_VALUES = new Map([...DISPLAY_OPTION_VALUES].map((value) => [value, value]));

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
]);
const DRAWING_LABEL_STYLE_CONSTANT_VALUES = new Map([
  ['label.style_none', 'none'],
  ['label.style_label_up', 'label_up'],
  ['label.style_label_down', 'label_down'],
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
]);
const DRAWING_TEXT_HALIGN_VALUES = new Set(['left', 'center', 'right']);
const DRAWING_TEXT_HALIGN_CONSTANT_VALUES = new Map([
  ['text.align_left', 'left'],
  ['text.align_center', 'center'],
  ['text.align_right', 'right'],
]);
const DRAWING_TEXT_VALIGN_VALUES = new Set(['top', 'middle', 'bottom']);
const DRAWING_TEXT_VALIGN_CONSTANT_VALUES = new Map([
  ['text.align_top', 'top'],
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
const DRAWING_SIZE_PARAMETER_CALLEES = new Set(['label.new', 'label.set_size', 'box.set_text_size']);

for (const name of CALENDAR_FUNCTION_NAMES) {
  BUILTIN_SIGNATURES.set(name, { params: ['time', 'timezone'], minArgs: 1, maxArgs: 2, allowNamedPrefixWithPositional: true });
}

for (const name of STRATEGY_TRADE_ACCESSORS) {
  BUILTIN_SIGNATURES.set(`strategy.opentrades.${name}`, { params: ['trade_num'], minArgs: 1, maxArgs: 1 });
}

for (const name of STRATEGY_CLOSED_TRADE_ACCESSORS) {
  BUILTIN_SIGNATURES.set(`strategy.closedtrades.${name}`, { params: ['trade_num'], minArgs: 1, maxArgs: 1 });
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

for (const name of [
  'array.binary_search',
  'array.binary_search_leftmost',
  'array.binary_search_rightmost',
  'array.includes',
  'array.indexof',
  'array.lastindexof',
]) {
  BUILTIN_SIGNATURES.set(name, { params: ['id', 'value'], minArgs: 2, maxArgs: 2, allowNamedPrefixWithPositional: true });
}

BUILTIN_SIGNATURES.set('array.concat', { params: ['id', 'id2'], minArgs: 2, maxArgs: 2, allowNamedPrefixWithPositional: true });
BUILTIN_SIGNATURES.set('array.fill', { params: ['id', 'value', 'index_from', 'index_to'], minArgs: 2, maxArgs: 4, allowNamedPrefixWithPositional: true });
BUILTIN_SIGNATURES.set('array.join', { params: ['id', 'separator'], minArgs: 1, maxArgs: 2, allowNamedPrefixWithPositional: true });
BUILTIN_SIGNATURES.set('array.reverse', { params: ['id'], minArgs: 1, maxArgs: 1, allowNamedPrefixWithPositional: true });
BUILTIN_SIGNATURES.set('array.slice', { params: ['id', 'index_from', 'index_to'], minArgs: 3, maxArgs: 3, allowNamedPrefixWithPositional: true });
BUILTIN_SIGNATURES.set('array.sort', { params: ['id', 'order', 'sort_field'], minArgs: 1, maxArgs: 3, allowNamedPrefixWithPositional: true });
BUILTIN_SIGNATURES.set('array.sort_indices', { params: ['id', 'order'], minArgs: 1, maxArgs: 2, allowNamedPrefixWithPositional: true });

for (const name of ['array.abs', 'array.avg', 'array.max', 'array.median', 'array.min', 'array.mode', 'array.range', 'array.standardize', 'array.sum']) {
  BUILTIN_SIGNATURES.set(name, { params: ['id'], minArgs: 1, maxArgs: 1, allowNamedPrefixWithPositional: true });
}

for (const name of ['array.stdev', 'array.variance']) {
  BUILTIN_SIGNATURES.set(name, { params: ['id', 'biased'], minArgs: 1, maxArgs: 2, allowNamedPrefixWithPositional: true });
}

for (const name of ['array.percentile_linear_interpolation', 'array.percentile_nearest_rank']) {
  BUILTIN_SIGNATURES.set(name, { params: ['id', 'percentage'], minArgs: 2, maxArgs: 2, allowNamedPrefixWithPositional: true });
}

BUILTIN_SIGNATURES.set('array.covariance', { params: ['id1', 'id2', 'biased'], aliases: { id: 'id1' }, minArgs: 2, maxArgs: 3, allowNamedPrefixWithPositional: true });
BUILTIN_SIGNATURES.set('array.percentrank', { params: ['id', 'value'], minArgs: 2, maxArgs: 2, allowNamedPrefixWithPositional: true });

BUILTIN_SIGNATURES.set('array.from', { params: [], minArgs: 0, allowExtraPositional: true });

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

BUILTIN_SIGNATURES.set('matrix.remove_row', { params: ['id', 'row'], minArgs: 2, maxArgs: 2, allowNamedPrefixWithPositional: true });
for (const name of ['matrix.remove_col', 'matrix.remove_column']) {
  BUILTIN_SIGNATURES.set(name, { params: ['id', 'column'], minArgs: 2, maxArgs: 2, allowNamedPrefixWithPositional: true });
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

const PLANNED_UNSUPPORTED_BUILTIN_CALL_MESSAGES = new Map<string, string>([
  [
    'request.footprint',
    'request.footprint is not supported yet: footprint data requires a host-provided footprint/intrabar volume model',
  ],
  ['ticker.rangebar', 'ticker.* functions are not supported yet: ticker.rangebar'],
]);

export function checkProgram(program: Program, options: SemanticCheckOptions = {}): SemanticCheckResult {
  return new SemanticChecker(options).check(program);
}

class SemanticChecker {
  private diagnostics: SemanticDiagnostic[] = [];
  private rootScope = new SemanticScope();
  private typeDeclarations = new Map<string, TypeDeclaration>();
  private enumDeclarations = new Map<string, EnumDeclaration>();
  private methodDeclarations = new Map<string, FunctionDeclaration[]>();
  private importedLibraries = new Map<string, SemanticImportedLibrary>();
  private functionSymbolDeclarations = new WeakMap<SemanticSymbol, FunctionDeclaration>();
  private activeReturnInferences = new Set<FunctionDeclaration>();

  constructor(private readonly options: SemanticCheckOptions = {}) {}

  check(program: Program): SemanticCheckResult {
    this.diagnostics = [];
    this.rootScope = new SemanticScope();
    this.typeDeclarations = this.collectTypeDeclarations(program.body);
    this.enumDeclarations = this.collectEnumDeclarations(program.body);
    this.methodDeclarations = this.collectMethodDeclarations(program.body);
    this.importedLibraries = this.collectImportedLibraries(program);
    this.functionSymbolDeclarations = new WeakMap();
    this.activeReturnInferences = new Set();
    this.checkLibraryExportDeclarations(program.body);
    this.checkStatements(program.body, this.rootScope);
    return {
      diagnostics: this.diagnostics,
      symbols: this.rootScope.allSymbols(),
    };
  }

  private checkStatements(statements: Statement[], scope: SemanticScope): void {
    for (const statement of statements) {
      this.checkStatement(statement, scope);
    }
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

    const globalVariableQualifiers = this.collectGlobalVariableQualifiers(statements);
    const dynamicRequestsAllowed = this.libraryDynamicRequestsAllowed(libraryDeclaration);
    for (const declaration of exportedDeclarations) {
      if (declaration.type !== 'FunctionDeclaration') continue;
      this.checkExportedFunctionScope(declaration, globalVariableQualifiers, dynamicRequestsAllowed);
    }
  }

  private collectImportedLibraries(program: Program): Map<string, SemanticImportedLibrary> {
    const libraries = new Map<string, SemanticImportedLibrary>();
    if (!this.options.libraries?.size) return libraries;

    for (const statement of program.body) {
      if (statement.type !== 'ImportDeclaration') continue;

      const libraryProgram = this.options.libraries.get(statement.path);
      if (!libraryProgram) continue;

      const types = new Map<string, TypeDeclaration>();
      const enums = new Map<string, EnumDeclaration>();
      const constants = new Map<string, VariableDeclaration>();
      const functions = new Map<string, FunctionDeclaration>();
      const methods = new Map<string, FunctionDeclaration[]>();
      for (const libraryStatement of libraryProgram.body) {
        if (libraryStatement.type === 'TypeDeclaration' && libraryStatement.exported) {
          types.set(libraryStatement.name.name, libraryStatement);
        } else if (libraryStatement.type === 'EnumDeclaration' && libraryStatement.exported) {
          enums.set(libraryStatement.name.name, libraryStatement);
        } else if (libraryStatement.type === 'VariableDeclaration' && libraryStatement.exported && libraryStatement.names.type === 'VariableDeclarator') {
          constants.set(libraryStatement.names.name.name, libraryStatement);
        } else if (libraryStatement.type === 'FunctionDeclaration' && libraryStatement.isMethod && libraryStatement.exported) {
          const overloads = methods.get(libraryStatement.name.name) ?? [];
          overloads.push(libraryStatement);
          methods.set(libraryStatement.name.name, overloads);
        } else if (libraryStatement.type === 'FunctionDeclaration' && !libraryStatement.isMethod && libraryStatement.exported) {
          functions.set(libraryStatement.name.name, libraryStatement);
        }
      }

      libraries.set(statement.alias.name, {
        alias: statement.alias.name,
        functions,
        types,
        enums,
        constants,
        methods,
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
        return this.inferTupleElementTypes(declaration.body, functionScope);
      }

      return this.inferTupleElementTypesFromStatements(declaration.body, functionScope);
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
      if (statement.type !== 'VariableDeclaration') continue;
      const type = this.typeFromAnnotation(statement.typeAnnotation);
      for (const name of this.declaredNames(statement)) {
        globals.set(name, type?.qualifier);
      }
    }
    return globals;
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

    const visitExpression = (expression: Expression, localNames: Set<string>): void => {
      if (expression.type === 'Identifier') {
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
        visitExpression(expression.callee, localNames);
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
            this.visitFunctionScopeNode(switchCase.consequent, new Set(localNames), visitExpression, visitStatement);
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
      }
    };

    const visitStatement = (statement: Statement, localNames: Set<string>): void => {
      switch (statement.type) {
        case 'VariableDeclaration':
          visitInitializer(statement.init, localNames);
          for (const name of this.declaredNames(statement)) localNames.add(name);
          return;
        case 'AssignmentStatement':
          this.visitAssignmentTargetExpression(statement.left, localNames, visitExpression);
          visitExpression(statement.right, localNames);
          return;
        case 'ExpressionStatement':
          visitExpression(statement.expression, localNames);
          return;
        case 'IfStatement':
          visitExpression(statement.test, localNames);
          this.visitFunctionScopeNode(statement.consequent, new Set(localNames), visitExpression, visitStatement);
          if (Array.isArray(statement.alternate)) {
            this.visitFunctionScopeNode(statement.alternate, new Set(localNames), visitExpression, visitStatement);
          } else if (statement.alternate) {
            visitStatement(statement.alternate, new Set(localNames));
          }
          return;
        case 'ForStatement': {
          if (statement.kind === 'collection') {
            visitExpression(statement.iterable, localNames);
          } else {
            visitExpression(statement.start, localNames);
            visitExpression(statement.end, localNames);
            if (statement.step) visitExpression(statement.step, localNames);
          }
          const forLocals = new Set(localNames);
          forLocals.add(statement.counter.name);
          if (statement.kind === 'collection' && statement.indexCounter) forLocals.add(statement.indexCounter.name);
          this.visitFunctionScopeNode(statement.body, forLocals, visitExpression, visitStatement);
          return;
        }
        case 'WhileStatement':
          visitExpression(statement.test, localNames);
          this.visitFunctionScopeNode(statement.body, new Set(localNames), visitExpression, visitStatement);
          return;
        case 'FunctionDeclaration':
        case 'TypeDeclaration':
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
    this.visitFunctionScopeNode(declaration.body, functionLocals, visitExpression, visitStatement);
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
      case 'AssignmentStatement':
        return this.expressionReferencesAnyName(statement.left, names)
          || this.expressionReferencesAnyName(statement.right, names);
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
    switch (statement.type) {
      case 'IndicatorDeclaration':
        this.checkIndicatorDeclarationArguments(statement);
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
          statement.process_orders_on_close,
          statement.use_bar_magnifier,
          statement.risk_free_rate,
          statement.backtest_fill_limits_assumption,
          statement.close_entries_rule,
          statement.fill_orders_on_standard_ohlc,
        ]);
        break;
      case 'LibraryDeclaration':
        this.checkLibraryDeclarationArguments(statement);
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
      case 'VariableDeclaration':
        this.checkVariableDeclaration(statement, scope);
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

  private checkIndicatorDeclarationArguments(statement: IndicatorDeclaration): void {
    const displayName = `${statement.declarationKind}()`;
    const allowedKeys = statement.declarationKind === 'strategy'
      ? STRATEGY_DECLARATION_KEYS
      : INDICATOR_DECLARATION_KEYS;
    this.checkDeclarationKnownProperties(statement, allowedKeys, displayName);
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
    this.checkNonNegativeLiteralIntegerValue(
      statement.calc_bars_count,
      `${statement.declarationKind} calc_bars_count must be a non-negative integer`,
    );
    this.checkNonNegativeLiteralIntegerValue(
      statement.max_labels_count,
      `${statement.declarationKind} max_labels_count must be a non-negative integer`,
    );
    this.checkNonNegativeLiteralIntegerValue(
      statement.max_lines_count,
      `${statement.declarationKind} max_lines_count must be a non-negative integer`,
    );
    this.checkNonNegativeLiteralIntegerValue(
      statement.max_boxes_count,
      `${statement.declarationKind} max_boxes_count must be a non-negative integer`,
    );
    this.checkNonNegativeLiteralIntegerValue(
      statement.max_polylines_count,
      `${statement.declarationKind} max_polylines_count must be a non-negative integer`,
    );
    if (statement.declarationKind === 'strategy') {
      this.checkStrategyDeclarationLiteralValueConstraints(statement);
    }
  }

  private checkLibraryDeclarationArguments(statement: LibraryDeclaration): void {
    this.checkDeclarationKnownProperties(statement, LIBRARY_DECLARATION_KEYS, 'library()');
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
  ): void {
    if (!expression) return;

    const value = this.namespacedConstantStringValue(expression, constantValues, namespacePrefix);
    if (value !== undefined && !allowedValues.has(value)) {
      this.addDiagnostic('type-mismatch', `${messagePrefix}: ${value}`, expression.loc);
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
        `Unknown argument '${key}' for ${displayName}`,
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

  private declareFunction(statement: FunctionDeclaration, scope: SemanticScope): void {
    const existingLocal = scope.lookupLocal(statement.name.name);
    if (!statement.isMethod || !existingLocal || existingLocal.kind !== 'function' || existingLocal.isMethod !== true) {
      const symbol: SemanticSymbol = {
        name: statement.name.name,
        kind: 'function',
        isMethod: statement.isMethod,
        loc: statement.name.loc,
      };
      if (this.declare(scope, symbol) && !statement.isMethod) {
        this.functionSymbolDeclarations.set(symbol, statement);
      }
    }
    const functionScope = new SemanticScope(scope);

    for (const parameter of statement.params) {
      this.checkTypeAnnotation(statement.name.name, parameter.typeAnnotation ?? undefined, parameter.loc);
      this.declare(functionScope, {
        name: parameter.name,
        kind: 'parameter',
        type: this.typeFromAnnotation(parameter.typeAnnotation ?? undefined),
        loc: parameter.loc,
      });
      if (parameter.defaultValue) this.checkExpression(parameter.defaultValue, scope);
    }

    if (Array.isArray(statement.body)) {
      this.checkStatements(statement.body, functionScope);
    } else {
      this.checkExpression(statement.body, functionScope);
    }
  }

  private checkVariableDeclaration(statement: VariableDeclaration, scope: SemanticScope): void {
    this.checkVariableInitializer(statement.init, scope);
    this.checkTypeAnnotation('variable declaration', statement.typeAnnotation, statement.loc);
    this.checkTypeCompatibility(statement.typeAnnotation, statement.init, scope, statement.loc);
    if (statement.names.type === 'TupleDeclarator') {
      this.declareTuple(statement.names, statement.init, scope);
      return;
    }

    this.declare(scope, {
      name: statement.names.name.name,
      kind: 'variable',
      type: this.typeFromAnnotation(statement.typeAnnotation ?? undefined) ?? this.inferVariableInitializerType(statement.init, scope),
      loc: statement.names.name.loc,
    });
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

  private declareTuple(tuple: TupleDeclarator, init: Expression | IfStatement, scope: SemanticScope): void {
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
      this.declare(scope, { name: name.name, kind: 'variable', type: elementTypes?.[index] ?? UNKNOWN_SEMANTIC_TYPE, loc: name.loc });
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
            : this.normalizeTupleInitializerShapes(this.tupleInitializerArmShapes(init.alternate, new SemanticScope(scope)))
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
      if (statement.type === 'VariableDeclaration' && statement.names.type === 'VariableDeclarator') {
        const type = this.typeFromAnnotation(statement.typeAnnotation ?? undefined) ?? this.inferVariableInitializerType(statement.init, scope);
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
    if (expression.type === 'CallExpression') {
      const builtinTupleShape = this.builtinTupleInitializerShape(expression, scope);
      if (builtinTupleShape) return [builtinTupleShape];
      const tupleTypes = this.inferBuiltinTupleElementTypes(expression, scope)
        ?? this.inferUserFunctionTupleElementTypes(expression, scope)
        ?? this.inferUserMethodTupleElementTypes(expression, scope);
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

    const symbol = scope.lookup(expression.callee.name);
    const declaration =
      symbol?.kind === 'function' && symbol.isMethod !== true ? this.functionSymbolDeclarations.get(symbol) : undefined;
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
    if (this.isBuiltinCollectionMemberMethod(receiverType, expression.callee.property.name)) return undefined;

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
      ?? this.inferUserMethodTupleElementTypes(init, scope);
  }

  private inferBuiltinTupleElementTypes(expression: CallExpression, _scope: SemanticScope): SemanticType[] | undefined {
    const calleeName = this.memberPath(expression.callee).join('.');
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
      if (statement.type === 'VariableDeclaration' && statement.names.type === 'VariableDeclarator') {
        const type = this.typeFromAnnotation(statement.typeAnnotation ?? undefined) ?? this.inferVariableInitializerType(statement.init, scope);
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
    if (!statement.alternate) return consequentTypes;

    const alternateTypes = Array.isArray(statement.alternate)
      ? this.inferTupleElementTypesFromStatements(statement.alternate, new SemanticScope(scope))
      : this.inferIfTupleElementTypes(statement.alternate, new SemanticScope(scope));

    return this.mergeTupleElementTypes(consequentTypes, alternateTypes);
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

    return this.inferTupleElementTypesFromStatements(statement.body, loopScope);
  }

  private inferWhileTupleElementTypes(statement: WhileStatement, scope: SemanticScope): SemanticType[] | undefined {
    return this.inferTupleElementTypesFromStatements(statement.body, new SemanticScope(scope));
  }

  private inferSwitchTupleElementTypes(expression: SwitchExpression, scope: SemanticScope): SemanticType[] | undefined {
    let mergedTypes: SemanticType[] | undefined;
    for (const switchCase of expression.cases) {
      const caseScope = new SemanticScope(scope);
      const caseTypes = Array.isArray(switchCase.consequent)
        ? this.inferTupleElementTypesFromStatements(switchCase.consequent, caseScope)
        : this.inferTupleElementTypes(switchCase.consequent, caseScope);
      if (!caseTypes) return undefined;
      mergedTypes = mergedTypes ? this.mergeTupleElementTypes(mergedTypes, caseTypes) : caseTypes;
      if (!mergedTypes) return undefined;
    }

    return mergedTypes;
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

    if (this.isAssignableType(rightType, leftType)) return { ...rightType, qualifier };
    if (this.isAssignableType(leftType, rightType)) return { ...leftType, qualifier };

    return { kind: 'unknown', qualifier };
  }

  private checkAssignment(statement: AssignmentStatement, scope: SemanticScope): void {
    this.checkExpression(statement.right, scope);
    this.checkAssignmentTarget(statement, scope);
    if (statement.left.type === 'Identifier') {
      this.checkIdentifierAssignmentType(statement, scope);
      this.checkIdentifierCompoundAssignmentType(statement, scope);
    } else if (statement.left.type === 'MemberExpression') {
      this.checkUdtFieldAssignmentType(statement.left, statement.right, scope, statement.operator);
    } else if (statement.left.type === 'IndexExpression') {
      this.checkIndexAssignmentType(statement.left, statement.right, scope, statement.operator);
    }
  }

  private checkIdentifierAssignmentType(statement: AssignmentStatement, scope: SemanticScope): void {
    if (statement.operator !== ':=' || statement.left.type !== 'Identifier') return;

    const targetType = scope.lookup(statement.left.name)?.type;
    if (!targetType) return;

    const sourceType = this.inferExpressionType(statement.right, scope);
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
      `Cannot assign ${this.formatSemanticType(sourceType)} value to ${this.formatSemanticType(targetType)} variable ${statement.left.name}`,
      statement.loc,
    );
  }

  private checkIdentifierCompoundAssignmentType(statement: AssignmentStatement, scope: SemanticScope): void {
    if (statement.operator === ':=' || statement.left.type !== 'Identifier') return;

    const targetType = scope.lookup(statement.left.name)?.type;
    if (!targetType || targetType.kind === 'unknown') return;

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
      `Cannot assign ${this.formatSemanticType(resultType)} value to ${this.formatSemanticType(targetType)} variable ${statement.left.name}`,
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

    this.checkIndexExpression(statement.left, scope);
  }

  private checkIf(statement: IfStatement, scope: SemanticScope): void {
    this.checkExpression(statement.test, scope);
    this.checkBooleanContext(statement.test, scope);
    this.checkStatements(statement.consequent, new SemanticScope(scope));
    if (Array.isArray(statement.alternate)) {
      this.checkStatements(statement.alternate, new SemanticScope(scope));
    } else if (statement.alternate) {
      this.checkIf(statement.alternate, scope);
    }
  }

  private checkFor(statement: ForStatement, scope: SemanticScope): void {
    const loopScope = new SemanticScope(scope);
    if (statement.kind === 'collection') {
      const iterableType = this.inferExpressionType(statement.iterable, scope);
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
    this.checkStatements(statement.body, new SemanticScope(scope));
  }

  private checkDirectNaComparison(expression: Expression): void {
    if (expression.type !== 'BinaryExpression' || (expression.operator !== '==' && expression.operator !== '!=')) return;
    if (!this.isNaLiteralExpression(expression.left) && !this.isNaLiteralExpression(expression.right)) return;

    this.addDiagnostic(
      'invalid-na-comparison',
      'Do not compare directly to na; use na(value) instead',
      expression.loc,
    );
  }

  private checkLogicalOperands(expression: Expression, scope: SemanticScope): void {
    if (expression.type !== 'BinaryExpression' || (expression.operator !== 'and' && expression.operator !== 'or')) return;

    this.checkBooleanContext(expression.left, scope);
    this.checkBooleanContext(expression.right, scope);
  }

  private checkBooleanContext(expression: Expression, scope: SemanticScope): void {
    const type = this.inferExpressionType(expression, scope);
    if (!this.isNumericType(type)) return;

    this.addDiagnostic(
      'implicit-numeric-bool',
      `Numeric ${type.kind} expression cannot be used as a boolean; compare it explicitly or wrap it in bool(...)`,
      expression.loc,
    );
  }

  private isNaLiteralExpression(expression: Expression): boolean {
    return expression.type === 'NaExpression';
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
        this.checkExpression(expression.right, scope);
        this.checkDirectNaComparison(expression);
        this.checkLogicalOperands(expression, scope);
        break;
      case 'UnaryExpression':
        this.checkExpression(expression.argument, scope);
        break;
      case 'ConditionalExpression':
        this.checkExpression(expression.test, scope);
        this.checkBooleanContext(expression.test, scope);
        this.checkExpressions(scope, [expression.consequent, expression.alternate]);
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
    }
  }

  private checkSwitchExpression(expression: SwitchExpression, scope: SemanticScope): void {
    if (expression.discriminant) this.checkExpression(expression.discriminant, scope);
    for (const switchCase of expression.cases) {
      this.checkSwitchCase(switchCase, scope);
    }
  }

  private checkSwitchCase(switchCase: SwitchCase, scope: SemanticScope): void {
    if (switchCase.test) this.checkExpression(switchCase.test, scope);
    if (Array.isArray(switchCase.consequent)) {
      this.checkStatements(switchCase.consequent, new SemanticScope(scope));
    } else {
      this.checkExpression(switchCase.consequent, scope);
    }
  }

  private checkCallExpression(expression: CallExpression, scope: SemanticScope): void {
    this.checkCallee(expression.callee, scope);
    this.checkBuiltinSignature(expression, scope);
    this.checkUdtConstructorSignature(expression, scope);
    this.checkImportedLibraryCallAvailability(expression, scope);
    this.checkArrayConstructorTypeArguments(expression);
    this.checkMatrixConstructorTypeArguments(expression);
    this.checkMapConstructorTypeArguments(expression);
    this.checkArrayCallTypes(expression, scope);
    this.checkArraySortFieldType(expression, scope);
    this.checkMatrixCallTypes(expression, scope);
    this.checkMatrixSortFieldType(expression, scope);
    this.checkMapCallTypes(expression, scope);
    this.checkInputDefaultValueType(expression, scope);
    this.checkMaxBarsBackLiteralArguments(expression);
    this.checkAlertFrequencyLiteralArguments(expression);
    this.checkRequestCalcBarsCountLiteralArguments(expression);
    this.checkRequestBarmergeModeLiteralArguments(expression);
    this.checkRequestSeriesFieldLiteralArguments(expression, scope);
    this.checkVisualLineStyleLiteralArguments(expression);
    this.checkVisualFormatPrecisionLiteralArguments(expression);
    this.checkMarkerStyleLocationSizeLiteralArguments(expression);
    this.checkVisualNumericOptionLiteralArguments(expression);
    this.checkDisplayOptionLiteralArguments(expression);
    this.checkDrawingCoordinateOptionLiteralArguments(expression, scope);
    this.checkDrawingStyleOptionLiteralArguments(expression, scope);
    this.checkDrawingTextOptionLiteralArguments(expression, scope);
    this.checkTablePositionOptionLiteralArguments(expression, scope);
    this.checkDrawingSizeOptionLiteralArguments(expression, scope);
    this.checkTickerOptionLiteralArguments(expression, scope);
    this.checkStrategyLiteralArgumentConstraints(expression);
    this.checkUserCallableArguments(expression, scope);
    this.checkUserMethodReceiverType(expression, scope);
    for (const argument of expression.arguments) {
      this.checkExpression(argument.value, scope);
    }
  }

  private checkCallee(callee: Expression, scope: SemanticScope): void {
    if (callee.type === 'Identifier') {
      if (!BUILTIN_FUNCTIONS.has(callee.name) && !scope.lookup(callee.name)) {
        this.addDiagnostic('unknown-function', `Unknown function: ${callee.name}`, callee.loc);
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
    if (expression.object.type === 'Identifier' && BUILTIN_NAMESPACES.has(expression.object.name)) {
      return;
    }
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
        return;
      }
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

  private checkIndexExpression(expression: IndexExpression, scope: SemanticScope): void {
    this.checkExpression(expression.object, scope);
    this.checkExpression(expression.index, scope);
  }

  private checkIndexAssignmentType(target: IndexExpression, value: Expression, scope: SemanticScope, operator: AssignmentStatement['operator']): void {
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
    const displayName = this.memberPath(expression.callee).join('.');
    const signature = this.resolveBuiltinSignature(displayName, expression, scope);
    if (!signature) {
      this.checkUnsupportedBuiltinNamespaceCall(expression, displayName, scope);
      return;
    }

    this.checkArgumentOrder(expression.arguments, displayName, signature);
    this.checkArgumentNames(expression.arguments, signature, displayName);
    this.checkArgumentCount(expression.arguments, signature, displayName);
    this.checkDuplicateArgumentBindings(expression.arguments, signature, displayName);
  }

  private resolveBuiltinSignature(displayName: string, expression: CallExpression, scope: SemanticScope): BuiltinSignature | undefined {
    if (displayName === 'line.new') {
      return this.usesLinePointOverload(expression, scope) ? LINE_NEW_POINT_SIGNATURE : LINE_NEW_COORDINATE_SIGNATURE;
    }
    if (displayName === 'box.new') {
      return this.usesBoxPointOverload(expression, scope) ? BOX_NEW_POINT_SIGNATURE : BOX_NEW_COORDINATE_SIGNATURE;
    }
    return BUILTIN_SIGNATURES.get(displayName);
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
    const namespace = this.memberPath(expression.callee)[0];
    if (!namespace) return;

    const plannedUnsupportedMessage = PLANNED_UNSUPPORTED_BUILTIN_CALL_MESSAGES.get(displayName);
    if (plannedUnsupportedMessage && !scope.lookup(namespace)) {
      this.addDiagnostic('unsupported-feature', plannedUnsupportedMessage, expression.callee.loc);
      return;
    }

    if (!SIGNED_BUILTIN_CALL_NAMESPACES.has(namespace)) return;
    this.addDiagnostic('unknown-function', `Unknown function: ${displayName}`, expression.callee.loc);
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
    const importedReceiver = this.importedReceiverType(receiverType);
    if (!importedReceiver) return;

    if (this.resolveLocalUserCallable(expression, scope)) return;
    if (this.importedLibraries.get(importedReceiver.alias)?.methods.has(expression.callee.property.name)) return;

    const displayName = this.memberPath(expression.callee).join('.') || expression.callee.property.name;
    this.addDiagnostic('unknown-function', `Unknown function: ${displayName}`, expression.callee.loc);
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
        this.addDiagnostic('duplicate-argument', `Field '${fieldName}' for ${displayName}() was supplied multiple times`, argument.name.loc);
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
      default:
        return false;
    }
  }

  private checkMapCallTypes(expression: CallExpression, scope: SemanticScope): void {
    const mapCall = this.resolveMapCall(expression, scope);
    if (!mapCall) return;

    switch (mapCall.operation) {
      case 'put':
        this.checkMapArgumentType(mapCall.mapType.keyType, mapCall.keyArgument, 'map key', scope);
        this.checkMapArgumentType(mapCall.mapType.valueType, mapCall.valueArgument, 'map value', scope);
        break;
      case 'get':
      case 'contains':
      case 'remove':
        this.checkMapArgumentType(mapCall.mapType.keyType, mapCall.keyArgument, 'map key', scope);
        break;
    }
  }

  private checkInputDefaultValueType(expression: CallExpression, scope: SemanticScope): void {
    const displayName = this.memberPath(expression.callee).join('.');
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
    this.checkInputDefaultOptionsConstraint(expression, displayName, defval);
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
    }
  }

  private checkInputDefaultRangeConstraints(expression: CallExpression, displayName: string, defval: Expression): void {
    if (displayName !== 'input.int' && displayName !== 'input.float') return;

    const options = this.getCallArgument(expression.arguments, 'options', 2);
    if (options?.type === 'ArrayExpression') return;

    const defvalValue = this.constantLiteralValue(defval);
    if (typeof defvalValue !== 'number') return;

    const minval = this.getCallArgument(expression.arguments, 'minval', 2);
    const minvalValue = minval ? this.constantLiteralValue(minval) : undefined;
    if (typeof minvalValue === 'number' && defvalValue < minvalValue) {
      this.addDiagnostic('type-mismatch', `${displayName} defval must be greater than or equal to minval`, defval.loc);
      return;
    }

    const maxval = this.getCallArgument(expression.arguments, 'maxval', 3);
    const maxvalValue = maxval ? this.constantLiteralValue(maxval) : undefined;
    if (typeof maxvalValue === 'number' && defvalValue > maxvalValue) {
      this.addDiagnostic('type-mismatch', `${displayName} defval must be less than or equal to maxval`, defval.loc);
    }
  }

  private checkInputDefaultOptionsConstraint(expression: CallExpression, displayName: string, defval: Expression): void {
    const defvalValue = this.constantLiteralValue(defval);
    if (defvalValue === undefined) return;

    const options = this.getCallArgument(expression.arguments, 'options', 2);
    if (!options || options.type !== 'ArrayExpression') return;

    const optionValues = options.elements.map((element) => this.constantLiteralValue(element));
    if (optionValues.some((option) => option === undefined)) return;

    if (!optionValues.some((option) => Object.is(option, defvalValue))) {
      this.addDiagnostic('type-mismatch', `${displayName} defval must be one of options`, defval.loc);
    }
  }

  private constantLiteralValue(expression: Expression): number | string | boolean | undefined {
    if (expression.type === 'NumericLiteral' || expression.type === 'StringLiteral' || expression.type === 'BooleanLiteral') {
      return expression.value;
    }
    if (expression.type === 'UnaryExpression' && expression.argument.type === 'NumericLiteral') {
      if (expression.operator === '-') return -expression.argument.value;
      if (expression.operator === '+') return expression.argument.value;
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

  private checkMaxBarsBackLiteralArguments(expression: CallExpression): void {
    if (this.memberPath(expression.callee).join('.') !== 'max_bars_back') return;

    const num = this.getCallArgument(expression.arguments, 'num', 1);
    this.checkNonNegativeLiteralIntegerValue(num, 'max_bars_back num must be a non-negative integer');
  }

  private checkRequestCalcBarsCountLiteralArguments(expression: CallExpression): void {
    const calleeName = this.memberPath(expression.callee).join('.');
    const calcBarsCountPosition = this.requestCalcBarsCountPosition(calleeName);
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

  private checkRequestBarmergeModeLiteralArguments(expression: CallExpression): void {
    const calleeName = this.memberPath(expression.callee).join('.');
    const binding = this.requestBarmergeModeBinding(calleeName);
    if (!binding) return;

    if (binding.gaps !== undefined) {
      const gaps = this.resolveCallArgumentExpression(expression, binding.parameterNames, binding.gaps);
      this.checkRequestBarmergeModeLiteralValue(
        gaps,
        REQUEST_GAPS_MODES,
        `Invalid ${calleeName} gaps mode`,
      );
    }
    if (binding.lookahead !== undefined) {
      const lookahead = this.resolveCallArgumentExpression(expression, binding.parameterNames, binding.lookahead);
      this.checkRequestBarmergeModeLiteralValue(
        lookahead,
        REQUEST_LOOKAHEAD_MODES,
        `Invalid ${calleeName} lookahead mode`,
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
  ): void {
    if (!expression) return;

    const value = this.constantLiteralValue(expression);
    if (typeof value === 'string' && !allowedValues.has(value)) {
      this.addDiagnostic('type-mismatch', `${messagePrefix}: ${value}`, expression.loc);
    }
  }

  private checkRequestSeriesFieldLiteralArguments(expression: CallExpression, scope: SemanticScope): void {
    const calleeName = this.memberPath(expression.callee).join('.');
    if (calleeName !== 'request.dividends' && calleeName !== 'request.earnings' && calleeName !== 'request.splits') return;

    const signature = this.resolveBuiltinSignature(calleeName, expression, scope);
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

  private checkVisualLineStyleLiteralArguments(expression: CallExpression): void {
    const calleeName = this.memberPath(expression.callee).join('.');
    const signature = BUILTIN_SIGNATURES.get(calleeName);
    if (!signature) return;

    switch (calleeName) {
      case 'plot': {
        const style = this.resolveCallArgumentExpression(expression, signature.params, signature.params.indexOf('style'));
        this.checkNamespacedConstantStringValue(
          style,
          PLOT_STYLE_VALUES,
          PLOT_STYLE_CONSTANT_VALUES,
          'plot.style_',
          'Invalid plot style',
        );
        const linestyle = this.resolveCallArgumentExpression(expression, signature.params, signature.params.indexOf('linestyle'));
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
        const linestyle = this.resolveCallArgumentExpression(expression, signature.params, signature.params.indexOf('linestyle'));
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

  private checkVisualFormatPrecisionLiteralArguments(expression: CallExpression): void {
    const calleeName = this.memberPath(expression.callee).join('.');
    if (!VISUAL_FORMAT_PRECISION_CALLS.has(calleeName)) return;

    const parameterNames = BUILTIN_SIGNATURES.get(calleeName)?.params;
    if (!parameterNames) return;

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
    const precision = this.resolveCallArgumentExpression(expression, parameterNames, precisionIndex);
    this.checkNonNegativeLiteralIntegerValue(
      precision,
      `${calleeName} precision must be a non-negative integer`,
    );
  }

  private checkMarkerStyleLocationSizeLiteralArguments(expression: CallExpression): void {
    const calleeName = this.memberPath(expression.callee).join('.');
    if (calleeName !== 'plotshape' && calleeName !== 'plotchar') return;

    const parameterNames = BUILTIN_SIGNATURES.get(calleeName)?.params;
    if (!parameterNames) return;

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

  private checkVisualNumericOptionLiteralArguments(expression: CallExpression): void {
    const calleeName = this.memberPath(expression.callee).join('.');
    const parameterNames = BUILTIN_SIGNATURES.get(calleeName)?.params;
    if (!parameterNames) return;

    if (calleeName === 'plot' || calleeName === 'hline') {
      const linewidth = this.resolveCallArgumentExpression(expression, parameterNames, parameterNames.indexOf('linewidth'));
      this.checkPositiveLiteralIntegerValue(
        linewidth,
        `${calleeName} linewidth must be a positive integer`,
      );
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

  private checkDisplayOptionLiteralArguments(expression: CallExpression): void {
    const calleeName = this.memberPath(expression.callee).join('.');
    const signature = BUILTIN_SIGNATURES.get(calleeName);
    if (!signature?.params.includes('display')) return;

    const candidates = new Set<Expression>();
    const namedDisplay = expression.arguments.find((argument) => argument.name?.name === 'display')?.value;
    if (namedDisplay) candidates.add(namedDisplay);

    for (const parameterNames of [signature.params, ...(signature.overloads ?? [])]) {
      const displayIndex = parameterNames.indexOf('display');
      if (displayIndex === -1) continue;
      const display = this.resolveCallArgumentExpression(expression, parameterNames, displayIndex);
      if (display) candidates.add(display);
    }

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
    );
  }

  private checkDrawingSizeOptionLiteralArguments(expression: CallExpression, scope: SemanticScope): void {
    const calleeName = this.memberPath(expression.callee).join('.');
    const signature = this.resolveBuiltinSignature(calleeName, expression, scope);
    if (!signature) return;

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

  private checkTickerOptionLiteralArguments(expression: CallExpression, scope: SemanticScope): void {
    const calleeName = this.memberPath(expression.callee).join('.');
    if (calleeName !== 'ticker.new' && calleeName !== 'ticker.modify') return;

    const signature = this.resolveBuiltinSignature(calleeName, expression, scope);
    if (!signature) return;
    if (this.hasUnstableOptionArgumentBindings(expression.arguments, signature)) return;

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
    this.checkPositiveLiteralNumberArgument(expression, 'qty', 2, 'strategy.exit qty must be a positive number');
    this.checkPositiveLiteralNumberArgument(expression, 'qty_percent', 3, 'strategy.exit qty_percent must be a positive number');
    this.checkPositiveLiteralNumberArgument(expression, 'profit', 4, 'strategy.exit profit must be a positive number');
    this.checkPositiveLiteralNumberArgument(expression, 'loss', 6, 'strategy.exit loss must be a positive number');
    this.checkNonNegativeLiteralNumberArgument(expression, 'trail_points', 9, 'strategy.exit trail_points must be a non-negative number');
    this.checkPositiveLiteralNumberArgument(expression, 'trail_offset', 10, 'strategy.exit trailing stop offset must be positive');
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
    if (!argument) return;

    const value = this.constantLiteralValue(argument);
    if (typeof value === 'number' && value <= 0) {
      this.addDiagnostic('type-mismatch', message, argument.loc);
    }
  }

  private checkNonNegativeLiteralNumberArgument(
    expression: CallExpression,
    name: string,
    positionalIndex: number,
    message: string,
  ): void {
    const argument = this.getCallArgument(expression.arguments, name, positionalIndex);
    if (!argument) return;

    const value = this.constantLiteralValue(argument);
    if (typeof value === 'number' && value < 0) {
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

  private checkArrayCallTypes(expression: CallExpression, scope: SemanticScope): void {
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

  private checkMatrixCallTypes(expression: CallExpression, scope: SemanticScope): void {
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

  private checkMatrixSortFieldType(expression: CallExpression, scope: SemanticScope): void {
    const sortFieldArgument = this.resolveMatrixSortFieldArgument(expression, scope);
    if (!sortFieldArgument) return;

    this.checkSortFieldType(sortFieldArgument, scope, 'matrix.sort');
  }

  private checkArraySortFieldType(expression: CallExpression, scope: SemanticScope): void {
    const sortFieldArgument = this.resolveArraySortFieldArgument(expression, scope);
    if (!sortFieldArgument) return;

    this.checkSortFieldType(sortFieldArgument, scope, 'array.sort');
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

  private resolveMatrixSortFieldArgument(expression: CallExpression, scope: SemanticScope): Expression | undefined {
    if (expression.callee.type !== 'MemberExpression' || expression.callee.property.name !== 'sort') return undefined;

    const isNamespaceCall = expression.callee.object.type === 'Identifier' && expression.callee.object.name === 'matrix';
    if (isNamespaceCall) return this.getCallArgument(expression.arguments, 'sort_field', 3);

    const receiverType = this.inferExpressionType(expression.callee.object, scope);
    if (receiverType.kind !== 'matrix') return undefined;

    return this.getCallArgument(expression.arguments, 'sort_field', 2);
  }

  private resolveArraySortFieldArgument(expression: CallExpression, scope: SemanticScope): Expression | undefined {
    if (expression.callee.type !== 'MemberExpression' || expression.callee.property.name !== 'sort') return undefined;

    const isNamespaceCall = expression.callee.object.type === 'Identifier' && expression.callee.object.name === 'array';
    if (isNamespaceCall) return this.getCallArgument(expression.arguments, 'sort_field', 2);

    const receiverType = this.inferExpressionType(expression.callee.object, scope);
    if (receiverType.kind !== 'array') return undefined;

    return this.getCallArgument(expression.arguments, 'sort_field', 1);
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
    if (!this.isInvalidTemplateTypeName(keyTypeName) && !MAP_KEY_TYPE_NAMES.has(keyTypeName)) {
      this.addDiagnostic('invalid-type-template', 'Map key type must be int, float, bool, string, or color in map.new', expression.loc);
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

  private checkMatrixConstructorTypeArguments(expression: CallExpression): void {
    if (this.memberPath(expression.callee).join('.') !== 'matrix.new' || !expression.typeArguments) return;
    if (expression.typeArguments.length !== 1) {
      this.addDiagnostic('invalid-type-template', 'matrix.new() expects exactly 1 type argument', expression.loc);
      return;
    }

    this.checkTemplateTypeName(expression.typeArguments[0], 'matrix element', expression.loc);
  }

  private resolveMapCall(
    expression: CallExpression,
    scope: SemanticScope,
  ): { operation: 'contains' | 'get' | 'put' | 'remove'; mapType: SemanticType; keyArgument?: Expression; valueArgument?: Expression } | null {
    if (expression.callee.type !== 'MemberExpression') return null;

    const methodName = expression.callee.property.name;
    if (!this.isCheckedMapOperation(methodName)) return null;

    const receiverType = this.inferExpressionType(expression.callee.object, scope);
    if (receiverType.kind === 'map') {
      return {
        operation: methodName,
        mapType: receiverType,
        keyArgument: expression.arguments[0]?.value,
        valueArgument: expression.arguments[1]?.value,
      };
    }

    if (expression.callee.object.type !== 'Identifier' || expression.callee.object.name !== 'map') return null;

    const mapArgument = expression.arguments[0]?.value;
    if (!mapArgument) return null;
    const mapType = this.inferExpressionType(mapArgument, scope);
    if (mapType.kind !== 'map') return null;

    return {
      operation: methodName,
      mapType,
      keyArgument: expression.arguments[1]?.value,
      valueArgument: expression.arguments[2]?.value,
    };
  }

  private isCheckedMapOperation(operation: string): operation is 'contains' | 'get' | 'put' | 'remove' {
    return operation === 'contains' || operation === 'get' || operation === 'put' || operation === 'remove';
  }

  private checkUserMethodReceiverType(expression: CallExpression, scope: SemanticScope): void {
    if (expression.callee.type !== 'MemberExpression') return;

    const methods = this.methodDeclarations.get(expression.callee.property.name);
    if (!methods?.length) return;

    const receiverType = this.inferExpressionType(expression.callee.object, scope);
    if (receiverType.kind === 'unknown') return;
    if (this.isBuiltinCollectionMemberMethod(receiverType, expression.callee.property.name)) return;

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
    const offendingArgument = this.firstPositionalArgumentAfterNamed(expression.arguments);
    const callable = this.resolveLocalUserCallable(expression, scope)
      ?? this.resolveImportedUserFunctionDiagnosticCallable(expression)
      ?? this.resolveImportedUserMethodDiagnosticCallable(expression, scope);
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
  }

  private resolveLocalUserCallable(
    expression: CallExpression,
    scope: SemanticScope,
  ): { declaration: FunctionDeclaration; displayName: string; parameterOffset: number } | undefined {
    if (expression.callee.type === 'Identifier') {
      const symbol = scope.lookup(expression.callee.name);
      const declaration =
        symbol?.kind === 'function' && symbol.isMethod !== true ? this.functionSymbolDeclarations.get(symbol) : undefined;
      return declaration
        ? { declaration, displayName: `function ${expression.callee.name}`, parameterOffset: 0 }
        : undefined;
    }

    if (expression.callee.type !== 'MemberExpression') return undefined;

    const receiverType = this.inferExpressionType(expression.callee.object, scope);
    if (receiverType.kind === 'unknown') return undefined;
    if (this.isBuiltinCollectionMemberMethod(receiverType, expression.callee.property.name)) return undefined;

    const callCompatibleDeclaration = this.findUserMethodDeclaration(expression.callee.property.name, receiverType, expression, scope);
    if (callCompatibleDeclaration) {
      return { declaration: callCompatibleDeclaration, displayName: `method ${expression.callee.property.name}`, parameterOffset: 1 };
    }

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

  private resolveImportedUserFunctionCallable(
    expression: CallExpression,
  ): { declaration: FunctionDeclaration; displayName: string; parameterOffset: number; libraryAlias: string } | undefined {
    if (expression.callee.type !== 'MemberExpression') return undefined;

    const path = this.memberPath(expression.callee);
    if (path.length !== 2) return undefined;

    const [alias, functionName] = path;
    if (!alias || !functionName) return undefined;

    const declaration = this.importedLibraries.get(alias)?.functions.get(functionName);
    if (!declaration || !this.callArgumentsFitParameters(expression.arguments, declaration.params)) return undefined;

    return {
      declaration,
      displayName: `library function ${alias}.${functionName}`,
      parameterOffset: 0,
      libraryAlias: alias,
    };
  }

  private resolveImportedUserFunctionDiagnosticCallable(
    expression: CallExpression,
  ): { declaration: FunctionDeclaration; displayName: string; parameterOffset: number; libraryAlias: string } | undefined {
    const compatibleCallable = this.resolveImportedUserFunctionCallable(expression);
    if (compatibleCallable) return compatibleCallable;
    if (expression.callee.type !== 'MemberExpression') return undefined;

    const path = this.memberPath(expression.callee);
    if (path.length !== 2) return undefined;

    const [alias, functionName] = path;
    if (!alias || !functionName) return undefined;

    const declaration = this.importedLibraries.get(alias)?.functions.get(functionName);
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
  ): { declaration: FunctionDeclaration; displayName: string; parameterOffset: number; libraryAlias?: string } | undefined {
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
  ): { declaration: FunctionDeclaration; displayName: string; parameterOffset: number; libraryAlias?: string } | undefined {
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
        this.addDiagnostic('unknown-argument', `Unknown argument '${name}' for ${displayName}`, arg.name.loc);
        hasUnknownArgument = true;
        continue;
      }

      if (seenNames.has(name)) {
        this.addDiagnostic('duplicate-argument', `Argument '${name}' for ${displayName} was supplied multiple times`, arg.name.loc);
        continue;
      }
      seenNames.add(name);
      suppliedNames.add(name);

      const parameterIndex = paramNames.indexOf(name);
      if (parameterIndex !== -1 && parameterIndex < positionalCount) {
        this.addDiagnostic('duplicate-argument', `Argument '${name}' for ${displayName} was supplied multiple times`, arg.name.loc);
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

  private checkArgumentNames(args: CallArgument[], signature: BuiltinSignature, displayName: string): void {
    if (signature.allowExtraNamed) return;
    const allowed = new Set(this.resolveSignatureParams(args, signature));
    const mixedInputRangeArg = this.firstMixedInputRangeOptionsArgument(args, signature, displayName);
    if (mixedInputRangeArg?.name) {
      this.addDiagnostic(
        'invalid-overload',
        `${displayName}() cannot use options together with minval/maxval/step`,
        mixedInputRangeArg.name.loc,
      );
    }
    for (const arg of args) {
      if (arg.name && !allowed.has(this.canonicalSignatureArgumentName(arg.name.name, signature))) {
        if (
          mixedInputRangeArg
          && INPUT_RANGE_OPTION_RANGE_PARAMS.has(this.canonicalSignatureArgumentName(arg.name.name, signature))
        ) continue;
        this.addDiagnostic('unknown-argument', `Unknown argument '${arg.name.name}' for ${displayName}()`, arg.name.loc);
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
    const thirdPositional = args.filter((arg) => !arg.name)[2]?.value;
    const usesOptionsOverload = suppliedNames.has('options') || thirdPositional?.type === 'ArrayExpression';
    if (!usesOptionsOverload) return undefined;

    return args.find((arg) => {
      if (!arg.name) return false;
      return INPUT_RANGE_OPTION_RANGE_PARAMS.has(this.canonicalSignatureArgumentName(arg.name.name, signature));
    });
  }

  private checkArgumentCount(args: CallArgument[], signature: BuiltinSignature, displayName: string): void {
    const params = this.resolveSignatureParams(args, signature);
    const binding = signature.allowNamedPrefixWithPositional ? this.bindSignatureArguments(args, signature, params) : undefined;
    const positionalCount = this.leadingPositionalCount(args);
    const suppliedNames = binding?.boundParams ?? new Set(args.flatMap((arg) => (arg.name ? [this.canonicalSignatureArgumentName(arg.name.name, signature)] : [])));
    const omitsOptionalLeadingParam = this.omitsOptionalLeadingParam(params, positionalCount, suppliedNames, signature);
    const boundParamCount = binding?.boundParams.size ?? params.filter((param, index) => {
      const positionalIndex = this.effectivePositionalIndex(index, omitsOptionalLeadingParam);
      return (positionalIndex !== -1 && positionalIndex < positionalCount) || suppliedNames.has(param);
    }).length;
    const minArgs = signature.minArgs ?? 0;
    const maxArgs = signature.allowExtraPositional ? Infinity : (signature.maxArgs ?? params.length);

    if (boundParamCount < minArgs) {
      this.addDiagnostic('argument-count', `${displayName}() expects at least ${minArgs} argument${minArgs === 1 ? '' : 's'}`, args[0]?.loc);
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

  private checkDuplicateArgumentBindings(args: CallArgument[], signature: BuiltinSignature, displayName: string): void {
    const params = this.resolveSignatureParams(args, signature);
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
          this.addDiagnostic('duplicate-argument', `Argument '${arg.name.name}' for ${displayName}() was supplied multiple times`, arg.name.loc);
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
        this.addDiagnostic('duplicate-argument', `Argument '${name}' for ${displayName}() was supplied multiple times`, arg.name.loc);
        continue;
      }
      seenNames.add(canonicalName);

      const positionalIndex = this.effectivePositionalIndex(params.indexOf(canonicalName), omitsOptionalLeadingParam);
      if (positionalIndex !== -1 && positionalIndex < positionalCount) {
        this.addDiagnostic('duplicate-argument', `Argument '${name}' for ${displayName}() was supplied multiple times`, arg.name.loc);
      }
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
    return signature.aliases?.[name] ?? name;
  }

  private resolveSignatureParams(args: CallArgument[], signature: BuiltinSignature): string[] {
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
      const maxIndex = Math.max(signature.params.length - 1, positionalMaxIndex, namedMaxIndex);
      return Array.from({ length: maxIndex + 1 }, (_, index) => `${signature.variadicParamPrefix}${index}`);
    }

    if (!signature.overloads) return signature.params;

    const suppliedNames = new Set(args.flatMap((arg) => (arg.name ? [this.canonicalSignatureArgumentName(arg.name.name, signature)] : [])));
    const thirdPositional = args.filter((arg) => !arg.name)[2]?.value;
    const usesOptionsOverload = suppliedNames.has('options') || thirdPositional?.type === 'ArrayExpression';
    const optionsOverload = signature.overloads.find((params) => params.includes('options'));
    const rangeOverload = signature.overloads.find((params) => params.includes('minval'));

    return (usesOptionsOverload ? optionsOverload : rangeOverload) ?? signature.params;
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
    if (this.isKnownIdentifier(identifier.name) || scope.lookup(identifier.name)) return;
    this.addDiagnostic('unknown-identifier', `Unknown identifier: ${identifier.name}`, identifier.loc);
  }

  private checkTypeAnnotation(owner: string, annotation?: TypeAnnotation | null, loc?: SourceLocation): void {
    if (!annotation) return;

    if (annotation.baseType === 'array' || annotation.baseType === 'matrix') {
      this.checkTemplateTypeName(annotation.elementType, `${annotation.baseType} element`, loc ?? annotation.loc);
      return;
    }

    if (annotation.baseType === 'map') {
      this.checkTemplateTypeName(annotation.keyType, 'map key', loc ?? annotation.loc);
      this.checkTemplateTypeName(annotation.valueType, 'map value', loc ?? annotation.loc);
      if (!this.isInvalidTemplateTypeName(annotation.keyType) && !MAP_KEY_TYPE_NAMES.has(annotation.keyType)) {
        this.addDiagnostic('invalid-type-template', `Map key type must be int, float, bool, string, or color in ${owner}`, loc ?? annotation.loc);
      }
    }
  }

  private checkTemplateTypeName(typeName: string, role: string, loc?: SourceLocation): void {
    if (TYPE_QUALIFIER_NAMES.has(typeName)) {
      this.addDiagnostic('invalid-type-template', `Invalid ${role} type '${typeName}'; qualifiers cannot be used as template types`, loc);
    }
    if (COLLECTION_TYPE_NAMES.has(typeName)) {
      this.addDiagnostic('invalid-type-template', `Invalid ${role} type '${typeName}'; collection template types must include their element templates`, loc);
    }
    const templateType = this.parseTemplateTypeName(typeName);
    if (!templateType) return;

    if (templateType.kind === 'array' || templateType.kind === 'matrix') {
      this.checkTemplateTypeName(templateType.args[0] ?? '', `${role} element`, loc);
      return;
    }

    const [keyTypeName, valueTypeName] = templateType.args;
    if (keyTypeName) {
      this.checkTemplateTypeName(keyTypeName, `${role} key`, loc);
      if (!this.isInvalidTemplateTypeName(keyTypeName) && !MAP_KEY_TYPE_NAMES.has(keyTypeName)) {
        this.addDiagnostic('invalid-type-template', `Map key type must be int, float, bool, string, or color in ${role}`, loc);
      }
    }
    if (valueTypeName) {
      this.checkTemplateTypeName(valueTypeName, `${role} value`, loc);
    }
  }

  private isInvalidTemplateTypeName(typeName: string): boolean {
    return TYPE_QUALIFIER_NAMES.has(typeName) || COLLECTION_TYPE_NAMES.has(typeName);
  }

  private checkExpressions(scope: SemanticScope, expressions: Array<Expression | undefined>): void {
    for (const expression of expressions) {
      if (expression) this.checkExpression(expression, scope);
    }
  }

  private typeFromAnnotation(annotation?: TypeAnnotation | null): SemanticType | undefined {
    if (!annotation) return undefined;

    const qualifier = annotation.qualifier;
    if (annotation.baseType === 'array' || annotation.baseType === 'matrix') {
      return {
        kind: annotation.baseType,
        qualifier,
        elementType: this.typeFromName(annotation.elementType),
      };
    }

    if (annotation.baseType === 'map') {
      return {
        kind: 'map',
        qualifier,
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
    switch (expression.type) {
      case 'NumericLiteral':
        return Number.isInteger(expression.value) ? { kind: 'int', qualifier: 'const' } : { kind: 'float', qualifier: 'const' };
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
      case 'UnaryExpression':
        return { kind: 'unknown', qualifier: this.inferExpressionType(expression.argument, scope).qualifier };
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
        if (expression.object.type === 'Identifier' && expression.object.name === 'session') {
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
        const drawingAllType = this.inferDrawingAllMemberType(expression);
        if (drawingAllType) return drawingAllType;
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

  private inferExpressionTypeFromStatements(statements: Statement[], scope: SemanticScope): SemanticType | undefined {
    let returnType: SemanticType | undefined;
    for (const statement of statements) {
      if (statement.type === 'VariableDeclaration' && statement.names.type === 'VariableDeclarator') {
        const type = this.typeFromAnnotation(statement.typeAnnotation ?? undefined) ?? this.inferVariableInitializerType(statement.init, scope);
        scope.declare({
          name: statement.names.name.name,
          kind: 'variable',
          type,
          loc: statement.names.name.loc,
        });
        returnType = undefined;
        continue;
      }
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
      returnType = undefined;
    }
    return returnType;
  }

  private inferIfExpressionType(statement: IfStatement, scope: SemanticScope): SemanticType {
    const consequentType = this.inferExpressionTypeFromStatements(statement.consequent, new SemanticScope(scope));
    if (!statement.alternate) {
      if (!consequentType) return { kind: 'unknown', qualifier: this.inferExpressionType(statement.test, scope).qualifier };
      return {
        ...consequentType,
        qualifier: this.maxQualifier(
          consequentType,
          { kind: 'unknown', qualifier: this.inferExpressionType(statement.test, scope).qualifier },
        ),
      };
    }

    const alternateType = Array.isArray(statement.alternate)
      ? this.inferExpressionTypeFromStatements(statement.alternate, new SemanticScope(scope))
      : this.inferIfExpressionType(statement.alternate, new SemanticScope(scope));

    if (!consequentType || !alternateType) {
      return { kind: 'unknown', qualifier: this.inferIfExpressionQualifier(statement, scope) };
    }

    const mergedType = this.mergeCompatibleType(consequentType, alternateType);
    return {
      ...mergedType,
      qualifier: this.maxQualifier(
        mergedType,
        { kind: 'unknown', qualifier: this.inferExpressionType(statement.test, scope).qualifier },
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
          ? [this.inferIfExpressionType(statement.alternate, new SemanticScope(scope))]
          : []),
    );
  }

  private inferExpressionTypesFromStatements(statements: Statement[], scope: SemanticScope): SemanticType[] {
    const types: SemanticType[] = [];
    for (const statement of statements) {
      if (statement.type === 'VariableDeclaration' && statement.names.type === 'VariableDeclarator') {
        const type = this.typeFromAnnotation(statement.typeAnnotation ?? undefined) ?? this.inferVariableInitializerType(statement.init, scope);
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

  private inferForExpressionType(statement: ForStatement, scope: SemanticScope): SemanticType | undefined {
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

    const bodyType = this.inferExpressionTypeFromStatements(statement.body, loopScope);
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
        return {
          kind: leftType.kind === 'float' || rightType.kind === 'float' || expression.operator === '/' ? 'float' : 'int',
          qualifier,
        };
      }
    }

    return { kind: 'unknown', qualifier };
  }

  private inferIdentifierType(identifier: Identifier, scope: SemanticScope): SemanticType {
    const builtinType = BUILTIN_GLOBAL_TYPES.get(identifier.name);
    if (builtinType) return builtinType;

    const symbol = scope.lookup(identifier.name);
    return symbol?.type ?? { kind: 'unknown' };
  }

  private inferCallType(expression: CallExpression, scope: SemanticScope): SemanticType {
    const calleePath = this.memberPath(expression.callee);
    const calleeName = calleePath.join('.');
    const referenceReturnType = REFERENCE_CONSTRUCTOR_RETURN_TYPES.get(calleeName);
    if (referenceReturnType) return { kind: referenceReturnType };
    if (calleeName === 'plot') return { kind: 'plot' };
    if (calleeName === 'hline') return { kind: 'hline' };
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
    if (calleeName === 'line.get_x1' || calleeName === 'line.get_x2') return { kind: 'int' };
    if (calleeName === 'line.get_y1' || calleeName === 'line.get_y2' || calleeName === 'line.get_price') return { kind: 'float' };
    if (calleeName === 'box.get_left' || calleeName === 'box.get_right') return { kind: 'int' };
    if (calleeName === 'box.get_top' || calleeName === 'box.get_bottom') return { kind: 'float' };
    if (calleeName === 'box.get_bgcolor' || calleeName === 'box.get_border_color') return { kind: 'color' };
    if (calleeName === 'box.get_text' || calleeName === 'box.get_text_halign' || calleeName === 'box.get_text_valign') return { kind: 'string' };
    if (calleeName === 'linefill.get_line1' || calleeName === 'linefill.get_line2') return { kind: 'line' };

    const namespace = calleePath[0];
    const inputType = this.inferInputCallType(expression, scope, calleePath);
    if (inputType) return inputType;
    const colorType = this.inferColorCallType(expression, scope, calleePath);
    if (colorType) return colorType;
    const mathType = this.inferMathCallType(expression, scope, calleePath);
    if (mathType) return mathType;
    const stringType = this.inferStringCallType(expression, scope, calleePath);
    if (stringType) return stringType;
    const taType = this.inferTaCallType(expression, scope, calleePath);
    if (taType) return taType;
    const requestType = this.inferRequestCallType(expression, scope, calleePath);
    if (requestType) return requestType;
    const timeType = this.inferTimeCallType(calleePath);
    if (timeType) return timeType;
    const tickerType = this.inferTickerCallType(calleePath);
    if (tickerType) return tickerType;
    const strategyType = this.inferStrategyCallType(calleePath);
    if (strategyType) return strategyType;
    if (namespace === 'input') return { kind: 'unknown', qualifier: 'input' };
    if (namespace === 'request' || namespace === 'ta' || namespace === 'time' || namespace === 'time_close' || calleePath.join('.') === 'timeframe.change') {
      return { kind: 'unknown', qualifier: 'series' };
    }
    if (calleePath.join('.') === 'bool') return { kind: 'bool', qualifier: this.inferCallArgumentMaxQualifier(expression, scope) };
    if (calleePath.join('.') === 'float') return { kind: 'float', qualifier: this.inferCallArgumentMaxQualifier(expression, scope) };
    if (calleePath.join('.') === 'int') return { kind: 'int', qualifier: this.inferCallArgumentMaxQualifier(expression, scope) };
    if (calleePath.join('.') === 'string') return { kind: 'string', qualifier: this.inferCallArgumentMaxQualifier(expression, scope) };
    if (calleePath.join('.') === 'fixnan') return this.inferFixnanCallType(expression, scope);
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
    const mapValueReadType = this.inferMapValueReadCallType(expression, scope);
    if (mapValueReadType) return mapValueReadType;
    const userFunctionType = this.inferUserFunctionCallType(expression, scope);
    if (userFunctionType) return userFunctionType;
    const importedUserFunctionType = this.inferImportedUserFunctionCallType(expression, scope);
    if (importedUserFunctionType) return importedUserFunctionType;
    const userMethodType = this.inferUserMethodCallType(expression, scope);
    if (userMethodType) return userMethodType;
    const importedUserMethodType = this.inferImportedUserMethodCallType(expression, scope);
    if (importedUserMethodType) return importedUserMethodType;
    if (calleePath.join('.') === 'array.from') {
      return {
        kind: 'array',
        qualifier: this.inferCallArgumentMaxQualifier(expression, scope),
        elementType: this.inferArrayElementType(expression.arguments.map((argument) => argument.value), scope),
      };
    }
    if (calleePath.join('.') === 'map.new' && expression.typeArguments?.length === 2) {
      return {
        kind: 'map',
        keyType: this.typeFromName(expression.typeArguments[0]),
        valueType: this.typeFromName(expression.typeArguments[1]),
      };
    }
    if (calleePath.join('.') === 'array.new' && expression.typeArguments?.length === 1) {
      return {
        kind: 'array',
        elementType: this.typeFromName(expression.typeArguments[0]),
      };
    }
    if (calleePath.join('.') === 'matrix.new' && expression.typeArguments?.length === 1) {
      return {
        kind: 'matrix',
        elementType: this.typeFromName(expression.typeArguments[0]),
      };
    }
    const arrayElementType = ARRAY_CONSTRUCTOR_ELEMENT_TYPES.get(calleePath.join('.'));
    if (arrayElementType) {
      return {
        kind: 'array',
        elementType: { kind: arrayElementType },
      };
    }
    if (calleePath.length === 2 && calleePath[1] === 'new' && calleePath[0] && this.typeDeclarations.has(calleePath[0])) {
      return { kind: 'udt', name: calleePath[0] };
    }
    if (calleePath.length === 3 && calleePath[2] === 'new') {
      const [alias, typeName] = calleePath;
      if (alias && typeName && this.importedLibraries.get(alias)?.types.has(typeName)) {
        return { kind: 'udt', name: `${alias}.${typeName}` };
      }
    }
    return { kind: 'unknown', qualifier: this.inferMaxQualifier(expression.arguments.map((argument) => argument.value), scope) };
  }

  private inferInputCallType(expression: CallExpression, scope: SemanticScope, calleePath: string[]): SemanticType | undefined {
    const calleeName = calleePath.join('.');
    if (calleeName === 'input.source') {
      const source = this.inferCallArgumentType(expression, scope, ['defval'], 0);
      return source ? { ...source, qualifier: source.qualifier ?? 'series' } : { kind: 'unknown', qualifier: 'series' };
    }
    if (calleeName === 'input.enum') {
      const defval = this.inferCallArgumentType(expression, scope, ['defval'], 0);
      return defval ? { ...defval, qualifier: 'input' } : { kind: 'unknown', qualifier: 'input' };
    }

    const kind = INPUT_RETURN_TYPES.get(calleeName);
    return kind ? { kind, qualifier: 'input' } : undefined;
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

  private inferMathConstantType(expression: MemberExpression): SemanticType | undefined {
    return MATH_CONSTANT_NAMES.has(this.memberPath(expression).join('.')) ? { kind: 'float', qualifier: 'const' } : undefined;
  }

  private inferMathCallType(expression: CallExpression, scope: SemanticScope, calleePath: string[]): SemanticType | undefined {
    const calleeName = calleePath.join('.');
    const qualifier = this.inferCallArgumentMaxQualifier(expression, scope);
    if (MATH_PRESERVE_NUMERIC_NAMES.has(calleeName)) {
      return { kind: this.inferAllIntArguments(expression, scope) ? 'int' : 'float', qualifier };
    }
    if (MATH_FLOAT_RETURN_NAMES.has(calleeName)) return { kind: 'float', qualifier };
    if (MATH_INT_RETURN_NAMES.has(calleeName)) return { kind: 'int', qualifier };
    if (MATH_SERIES_FLOAT_RETURN_NAMES.has(calleeName)) return { kind: 'float', qualifier: 'series' };
    if (calleeName === 'math.avg' || calleeName === 'math.round_to_mintick') {
      return { kind: 'float', qualifier: this.simpleOrSeriesQualifier(qualifier) };
    }
    if (calleeName === 'math.round') {
      const precision = this.inferCallArgumentType(expression, scope, ['number', 'precision'], 1);
      return { kind: precision ? 'float' : 'int', qualifier };
    }
    return undefined;
  }

  private inferAllIntArguments(expression: CallExpression, scope: SemanticScope): boolean {
    return expression.arguments.length > 0 && expression.arguments.every((argument) => this.inferExpressionType(argument.value, scope).kind === 'int');
  }

  private simpleOrSeriesQualifier(qualifier: SemanticQualifier | undefined): SemanticQualifier {
    return qualifier === 'series' ? 'series' : 'simple';
  }

  private inferStringCallType(expression: CallExpression, scope: SemanticScope, calleePath: string[]): SemanticType | undefined {
    const calleeName = calleePath.join('.');
    const qualifier = this.inferCallArgumentMaxQualifier(expression, scope);
    if (STRING_RETURN_NAMES.has(calleeName)) return { kind: 'string', qualifier };
    if (calleeName === 'str.tonumber') return { kind: 'float', qualifier };
    if (STRING_BOOL_RETURN_NAMES.has(calleeName)) return { kind: 'bool', qualifier };
    if (STRING_INT_RETURN_NAMES.has(calleeName)) return { kind: 'int', qualifier };
    if (calleeName === 'str.split') {
      return {
        kind: 'array',
        qualifier,
        elementType: { kind: 'string' },
      };
    }
    return undefined;
  }

  private inferTaCallType(expression: CallExpression, scope: SemanticScope, calleePath: string[]): SemanticType | undefined {
    const calleeName = calleePath.join('.');
    if (TA_BOOL_RETURN_NAMES.has(calleeName)) return { kind: 'bool', qualifier: 'series' };
    if (TA_INT_RETURN_NAMES.has(calleeName)) return { kind: 'int', qualifier: 'series' };
    if (TA_FLOAT_RETURN_NAMES.has(calleeName)) return { kind: 'float', qualifier: 'series' };
    if (TA_SOURCE_RETURN_NAMES.has(calleeName)) {
      return this.inferTaSourceReturnType(expression, scope, ['source', 'length'], 0);
    }
    if (TA_DEFAULT_SOURCE_RETURN_NAMES.has(calleeName)) {
      return this.inferTaOptionalSourceReturnType(expression, scope);
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

  private inferRequestCallType(expression: CallExpression, scope: SemanticScope, calleePath: string[]): SemanticType | undefined {
    const calleeName = calleePath.join('.');
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

  private inferTimeCallType(calleePath: string[]): SemanticType | undefined {
    const calleeName = calleePath.join('.');
    if (calleeName === 'time' || calleeName === 'time_close') return { kind: 'int', qualifier: 'series' };
    if (calleeName === 'timeframe.change') return { kind: 'bool', qualifier: 'series' };
    if (calleeName === 'timeframe.in_seconds' || calleeName === 'timeframe.to_seconds') return { kind: 'int', qualifier: 'simple' };
    if (calleeName === 'timeframe.from_seconds') return { kind: 'string', qualifier: 'simple' };
    if (calleeName === 'timestamp') return { kind: 'int', qualifier: 'const' };
    return undefined;
  }

  private inferTickerCallType(calleePath: string[]): SemanticType | undefined {
    return TICKER_STRING_RETURN_NAMES.has(calleePath.join('.')) ? { kind: 'string', qualifier: 'simple' } : undefined;
  }

  private inferFixnanCallType(expression: CallExpression, scope: SemanticScope): SemanticType {
    const source = this.inferCallArgumentType(expression, scope, ['source'], 0);
    return source ?? { kind: 'unknown', qualifier: this.inferCallArgumentMaxQualifier(expression, scope) };
  }

  private inferNzCallType(expression: CallExpression, scope: SemanticScope): SemanticType {
    const parameterNames = ['source', 'replacement'];
    const source = this.inferCallArgumentType(expression, scope, parameterNames, 0);
    const replacement = this.inferCallArgumentType(expression, scope, parameterNames, 1);
    if (!source) return replacement ?? { kind: 'unknown', qualifier: this.inferCallArgumentMaxQualifier(expression, scope) };
    if (!replacement) return source;

    const mergedType = this.mergeCompatibleType(source, replacement);
    return {
      ...mergedType,
      qualifier: this.maxQualifier(source, replacement),
    };
  }

  private inferCallArgumentType(
    expression: CallExpression,
    scope: SemanticScope,
    parameterNames: string[],
    index: number,
  ): SemanticType | undefined {
    const argument = this.resolveCallArgumentExpression(expression, parameterNames, index);
    return argument ? this.inferExpressionType(argument, scope) : undefined;
  }

  private resolveCallArgumentExpression(
    expression: CallExpression,
    parameterNames: string[],
    index: number,
  ): Expression | undefined {
    const name = parameterNames[index];
    if (!name) return undefined;

    const named = expression.arguments.find((argument) => argument.name?.name === name);
    if (named) return named.value;

    const priorNamedCount = parameterNames
      .slice(0, index)
      .filter((priorName) => expression.arguments.some((argument) => argument.name?.name === priorName))
      .length;
    const positional = expression.arguments.filter((argument) => !argument.name)[index - priorNamedCount];
    return positional?.value;
  }

  private inferUserFunctionCallType(expression: CallExpression, scope: SemanticScope): SemanticType | undefined {
    if (expression.callee.type !== 'Identifier') return undefined;

    const symbol = scope.lookup(expression.callee.name);
    const declaration =
      symbol?.kind === 'function' && symbol.isMethod !== true ? this.functionSymbolDeclarations.get(symbol) : undefined;
    if (!declaration) return undefined;

    return this.inferFunctionReturnType(declaration, this.inferCallableParameterTypes(declaration, expression.arguments, scope));
  }

  private inferUserFunctionTupleElementTypes(expression: CallExpression, scope: SemanticScope): SemanticType[] | undefined {
    if (expression.callee.type !== 'Identifier') return undefined;

    const symbol = scope.lookup(expression.callee.name);
    const declaration =
      symbol?.kind === 'function' && symbol.isMethod !== true ? this.functionSymbolDeclarations.get(symbol) : undefined;
    if (!declaration) return undefined;

    return this.inferFunctionTupleElementTypes(declaration, this.inferCallableParameterTypes(declaration, expression.arguments, scope));
  }

  private inferImportedUserFunctionCallType(expression: CallExpression, scope: SemanticScope): SemanticType | undefined {
    const callable = this.resolveImportedUserFunctionCallable(expression);
    if (!callable) return undefined;

    return this.normalizeImportedLibraryReturnType(this.inferFunctionReturnType(
      callable.declaration,
      this.inferImportedCallableParameterTypes(callable.libraryAlias, callable.declaration, expression.arguments, scope),
    ));
  }

  private inferUserMethodCallType(expression: CallExpression, scope: SemanticScope): SemanticType | undefined {
    if (expression.callee.type !== 'MemberExpression') return undefined;

    const receiverType = this.inferExpressionType(expression.callee.object, scope);
    if (receiverType.kind === 'unknown') return undefined;
    if (this.isBuiltinCollectionMemberMethod(receiverType, expression.callee.property.name)) return undefined;

    const method = this.findUserMethodDeclaration(expression.callee.property.name, receiverType, expression, scope);
    if (!method) return undefined;

    return this.inferFunctionReturnType(method, this.inferCallableParameterTypes(method, expression.arguments, scope, receiverType));
  }

  private inferImportedUserMethodCallType(expression: CallExpression, scope: SemanticScope): SemanticType | undefined {
    const callable = this.resolveImportedUserMethodCallable(expression, scope);
    if (!callable?.libraryAlias) return undefined;

    return this.normalizeImportedLibraryReturnType(this.inferFunctionReturnType(
      callable.declaration,
      this.inferImportedCallableParameterTypes(callable.libraryAlias, callable.declaration, expression.arguments, scope),
    ));
  }

  private normalizeImportedLibraryReturnType(type: SemanticType | undefined): SemanticType | undefined {
    if (!type) return undefined;
    if (type.qualifier !== 'const' && type.qualifier !== 'input') return type;
    return { ...type, qualifier: 'simple' };
  }

  private inferUserMethodTupleElementTypes(expression: CallExpression, scope: SemanticScope): SemanticType[] | undefined {
    if (expression.callee.type !== 'MemberExpression') return undefined;

    const receiverType = this.inferExpressionType(expression.callee.object, scope);
    if (receiverType.kind === 'unknown') return undefined;
    if (this.isBuiltinCollectionMemberMethod(receiverType, expression.callee.property.name)) return undefined;

    const method = this.findUserMethodDeclaration(expression.callee.property.name, receiverType, expression, scope);
    if (!method) return undefined;

    return this.inferFunctionTupleElementTypes(method, this.inferCallableParameterTypes(method, expression.arguments, scope, receiverType));
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

  private userMethodReceiverSpecificityScore(method: FunctionDeclaration, receiverType: SemanticType): number {
    const methodReceiverType = this.typeFromAnnotation(method.params[0]?.typeAnnotation ?? undefined);
    if (!methodReceiverType) return 0;

    let score = this.typeSpecificityScore(methodReceiverType, receiverType);
    if (methodReceiverType.qualifier === receiverType.qualifier) score += 2;
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
      if (!this.isAssignableQualifier(expectedType.qualifier, actualType.qualifier)) return undefined;
      score += this.typeSpecificityScore(expectedType, actualType);
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
      if (!this.isAssignableQualifier(expectedType.qualifier, actualType.qualifier)) return undefined;
      score += this.typeSpecificityScore(expectedType, actualType);
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
  ): Map<string, SemanticType> {
    const parameterTypes = new Map<string, SemanticType>();
    for (const [index, parameter] of declaration.params.entries()) {
      if (index === 0) {
        const receiverType = this.importedSemanticTypeFromAnnotation(libraryAlias, parameter.typeAnnotation ?? undefined);
        if (receiverType) parameterTypes.set(parameter.name, receiverType);
        continue;
      }

      const argument = this.getCallArgument(args, parameter.name, index - 1);
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

    if (this.isArrayBooleanOperation(methodName)) return { kind: 'bool' };
    if (methodName === 'join') return { kind: 'string' };
    if (this.isArrayIntegerOperation(methodName)) return { kind: 'int' };
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

    switch (methodName) {
      case 'concat':
      case 'copy':
      case 'slice':
        return {
          kind: 'array',
          elementType: receiverType.elementType,
        };
      case 'abs':
      case 'standardize':
        return {
          kind: 'array',
          elementType: { kind: 'float' },
        };
      case 'sort_indices':
        return {
          kind: 'array',
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

    return receiverType.elementType;
  }

  private inferMatrixHelperReceiverType(expression: CallExpression, scope: SemanticScope): SemanticType | undefined {
    if (expression.callee.type !== 'MemberExpression') return undefined;

    if (expression.callee.object.type === 'Identifier' && expression.callee.object.name === 'matrix') {
      const matrixArgument = this.getCallArgument(expression.arguments, 'id', 0);
      return matrixArgument ? this.inferExpressionType(matrixArgument, scope) : undefined;
    }

    return this.inferExpressionType(expression.callee.object, scope);
  }

  private inferMapValueReadCallType(expression: CallExpression, scope: SemanticScope): SemanticType | undefined {
    if (expression.callee.type !== 'MemberExpression' || expression.callee.property.name !== 'get') return undefined;

    const mapCall = this.resolveMapCall(expression, scope);
    return mapCall?.operation === 'get' && mapCall.mapType.kind === 'map' ? mapCall.mapType.valueType : undefined;
  }

  private inferIndexExpressionType(expression: IndexExpression, scope: SemanticScope): SemanticType {
    const objectType = this.inferExpressionType(expression.object, scope);
    if (objectType.kind === 'array' && objectType.elementType) return objectType.elementType;
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

  private inferMemberExpressionType(expression: MemberExpression, scope: SemanticScope): SemanticType {
    const path = this.memberPath(expression);
    const memberName = path.join('.');
    if (memberName === 'session.ismarket' || memberName === 'session.ispremarket' || memberName === 'session.ispostmarket') {
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
    const importedConstantType = this.inferImportedConstantMemberType(expression, scope);
    if (importedConstantType) return importedConstantType;
    const enumType = this.inferEnumMemberType(expression, scope);
    if (enumType) return enumType;

    const objectType = this.inferExpressionType(expression.object, scope);
    if (objectType.kind !== 'udt' || !objectType.name) return objectType;

    const field = this.findUdtField(objectType.name, expression.property.name);
    return this.typeFromAnnotation(field?.typeAnnotation ?? undefined) ?? { kind: 'unknown', qualifier: objectType.qualifier };
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
    if (STRATEGY_STRING_ACCESSOR_NAMES.has(calleeName)) return { kind: 'string', qualifier: 'series' };
    if (STRATEGY_INT_ACCESSOR_NAMES.has(calleeName)) return { kind: 'int', qualifier: 'series' };
    if (STRATEGY_FLOAT_ACCESSOR_NAMES.has(calleeName)) return { kind: 'float', qualifier: 'series' };
    return undefined;
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
    return [...this.memberPath(expression.object), expression.property.name];
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
        qualifier,
        elementType: this.typeFromName(templateType.args[0] ?? 'unknown'),
      };
    }
    if (templateType?.kind === 'map') {
      return {
        kind: 'map',
        qualifier,
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
        return { kind: name, qualifier };
      default:
        return { kind: 'udt', qualifier, name };
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

  private checkTypeCompatibility(annotation: TypeAnnotation | undefined | null, init: Expression | IfStatement, scope: SemanticScope, loc?: SourceLocation): void {
    const targetType = this.typeFromAnnotation(annotation);
    if (!targetType || !this.canCheckTypeCompatibility(annotation)) return;

    const initType = init.type === 'IfStatement'
      ? this.inferIfExpressionType(init, scope)
      : this.inferExpressionType(init, scope);

    if (targetType.qualifier && initType.qualifier && QUALIFIER_RANK[initType.qualifier] > QUALIFIER_RANK[targetType.qualifier]) {
      this.addDiagnostic(
        'qualifier-mismatch',
        `Cannot assign ${initType.qualifier} value to ${targetType.qualifier} ${targetType.kind}`,
        loc,
      );
    }

    this.checkControlInitializerArmCompatibility(targetType, init, scope, loc);

    if (!this.isAssignableType(targetType, initType)) {
      this.addDiagnostic(
        'type-mismatch',
        `Cannot assign ${this.formatSemanticType(initType)} value to ${this.formatSemanticType(targetType)} variable`,
        loc,
      );
    }
  }

  private checkControlInitializerArmCompatibility(
    targetType: SemanticType,
    init: Expression | IfStatement,
    scope: SemanticScope,
    loc?: SourceLocation,
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
        `Cannot assign ${formattedType} value to ${this.formatSemanticType(targetType)} variable`,
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
          ? this.inferIfExpressionType(init.alternate, new SemanticScope(scope))
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
        && MAP_KEY_TYPE_NAMES.has(annotation.keyType)
        && !this.isInvalidTemplateTypeName(annotation.valueType);
    }

    return true;
  }

  private isAssignableType(targetType: SemanticType, sourceType: SemanticType): boolean {
    if (targetType.kind === 'unknown' || sourceType.kind === 'unknown') return true;

    if (targetType.kind === 'array' && sourceType.kind === 'array') {
      return this.isAssignableType(targetType.elementType ?? UNKNOWN_SEMANTIC_TYPE, sourceType.elementType ?? UNKNOWN_SEMANTIC_TYPE);
    }

    if (targetType.kind === 'matrix' && sourceType.kind === 'matrix') {
      return this.isAssignableType(targetType.elementType ?? UNKNOWN_SEMANTIC_TYPE, sourceType.elementType ?? UNKNOWN_SEMANTIC_TYPE);
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

  private declare(scope: SemanticScope, symbol: SemanticSymbol): boolean {
    const existing = scope.declare(symbol);
    if (!existing) return true;
    this.addDiagnostic('duplicate-symbol', `Duplicate declaration: ${symbol.name}`, symbol.loc);
    return false;
  }

  private isKnownIdentifier(name: string): boolean {
    return BUILTIN_GLOBALS.has(name) || BUILTIN_NAMESPACES.has(name);
  }

  private addDiagnostic(code: string, message: string, loc?: SourceLocation): void {
    this.diagnostics.push({
      code,
      message,
      severity: 'error',
      line: loc?.start.line,
      column: loc?.start.column,
    });
  }
}
