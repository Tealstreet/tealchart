import { resolveDependencyMember } from './importedDependencies';
import { POSITIONAL_DRAWING_GETTERS } from '../drawings/singleIdGetters';
import { PINE_EXP_RUNTIME_HELPER } from './pineExp';
import { comparisonEqual } from './float-comparison';
import type {
  Program, Statement, Expression,
  BinaryExpression,
  VariableDeclaration,
  AssignmentStatement,
  TupleAssignment,
  IfStatement,
  OnceStatement,
  ForStatement,
  WhileStatement,
  CallExpression,
  CallArgument,
  FunctionDeclaration,
  MemberExpression,
  IndexExpression,
  Identifier,
  SwitchExpression,
  SourceLocation,
  TypeAnnotation,
} from '../../parser/ast';
import type { AnalysisContext, FuncInfo, ImportedMethodOverloadInfo, LocalMethodOverloadInfo, TACallSite, VarDeclInfo } from './analyzer';
import { BUILTIN_NAMESPACES } from '../../builtinMetadata';
import { pineVersionRules } from '../../pineVersionRules';
import { pineColorConstant } from '../../pineColorConstants';
import { checkProgram } from '../../semantic/checker';
import type { SemanticExpressionTypeContext, SemanticType } from '../../semantic/checker';

import { inferUdtArrayExpressions } from './udtArrayTypes';
import { invariantLineReads } from './drawingLoopReads';
import { extractStaticNumber } from './analyzer';
import { CORPORATE_FORECAST_MEMBERS } from '../../corporateForecastMetadata';
import { canonicalBuiltinArguments } from '../../pineBuiltinParameterRenames';

const BAR_FIELDS: Record<string, string> = {
  open: '_s_open', high: '_s_high', low: '_s_low', close: '_s_close',
  volume: '_s_volume', time: '_s_time', bid: '_s_bid', ask: '_s_ask',
};

const BARSTATE_FIELDS = new Set([
  'isfirst', 'islast', 'ishistory', 'isrealtime', 'isnew', 'isconfirmed',
  'islastconfirmedhistory',
]);

const SYMINFO_FIELDS = new Set([
  'recommendations_buy', 'recommendations_buy_strong', 'recommendations_hold',
  'recommendations_sell', 'recommendations_sell_strong', 'recommendations_total',
  'ticker', 'tickerid', 'prefix', 'root', 'currency', 'basecurrency',
  'description', 'type', 'timezone', 'session', 'pricescale', 'mintick',
  'pointvalue', 'mincontract', 'volumetype', 'main_tickerid', 'country',
  'sector', 'industry', 'isin', 'current_contract', 'expiration_date',
  'employees', 'shareholders', 'shares_outstanding_float',
  'shares_outstanding_total', 'recommendations_date', 'target_price_date',
  'target_price_average', 'target_price_estimates', 'target_price_high',
  'target_price_low', 'target_price_median',
]);

const SYMINFO_DERIVED_FIELDS: Record<string, string> = {
  tickerid: '(ctx.syminfo.tickerid ?? ctx.syminfo.ticker)',
  main_tickerid: '(ctx.syminfo.main_tickerid ?? ctx.syminfo.tickerid ?? ctx.syminfo.ticker)',
  exchange: '(ctx.syminfo.exchange ?? (ctx.syminfo.ticker.includes(":") ? ctx.syminfo.ticker.split(":")[0] : ""))',
  minmove: '(ctx.syminfo.mintick * ctx.syminfo.pricescale)',
};

const TIMEFRAME_FIELDS = new Set([
  'period', 'multiplier', 'isminutes', 'isdaily', 'isweekly', 'ismonthly',
  'isintraday', 'isseconds', 'isticks',
]);

const TIMEFRAME_DERIVED_FIELDS: Record<string, string> = {
  main_period: '(ctx.timeframe.main_period ?? ctx.timeframe.period)',
  isdwm: '(ctx.timeframe.isdaily || ctx.timeframe.isweekly || ctx.timeframe.ismonthly)',
};

const CHART_FIELDS: Record<string, string> = {
  bg_color: 'ctx.chart.bgColor',
  fg_color: 'ctx.chart.fgColor',
  left_visible_bar_time: 'ctx.chart.leftVisibleBarTime',
  right_visible_bar_time: 'ctx.chart.rightVisibleBarTime',
  is_standard: '(ctx.chart.type === "standard")',
  is_heikinashi: '(ctx.chart.type === "heikinashi")',
  is_kagi: '(ctx.chart.type === "kagi")',
  is_linebreak: '(ctx.chart.type === "linebreak")',
  is_pnf: '(ctx.chart.type === "pnf")',
  is_range: '(ctx.chart.type === "range")',
  is_renko: '(ctx.chart.type === "renko")',
};

const CALENDAR_PARTS = new Set(['year', 'month', 'weekofyear', 'dayofmonth', 'dayofweek', 'hour', 'minute', 'second']);
const RUNTIME_TIME_VALUES = new Set(['time_close', 'time_tradingday', 'timenow', 'last_bar_time']);
const DAYOFWEEK_CONSTANTS: Record<string, number> = {
  sunday: 1,
  monday: 2,
  tuesday: 3,
  wednesday: 4,
  thursday: 5,
  friday: 6,
  saturday: 7,
};
const DISPLAY_CONSTANTS: Record<string, number> = {
  none: 0,
  pane: 1,
  data_window: 2,
  status_line: 4,
  price_scale: 8,
  pine_screener: 16,
  all: 31,
};

const MATH_FUNCS: Record<string, string> = {
  'math.abs': 'Math.abs', 'math.ceil': 'Math.ceil', 'math.floor': 'Math.floor',
  'math.sqrt': 'Math.sqrt', 'math.pow': 'Math.pow',
  'math.exp': '_exp',


  'math.sign': 'Math.sign', 'math.sin': 'Math.sin', 'math.cos': 'Math.cos',
  'math.tan': 'Math.tan', 'math.asin': 'Math.asin', 'math.acos': 'Math.acos',
  'math.atan': 'Math.atan', 'math.tanh': 'Math.tanh',
  'math.max': 'Math.max', 'math.min': 'Math.min',
  'math.pi': 'Math.PI', 'math.e': 'Math.E',
  'math.phi': '1.618033988749895',
  'math.rphi': '0.6180339887498948',
};

const PLOT_FUNCTIONS = new Set([
  'plot', 'plotshape', 'plotchar', 'plotarrow', 'plotbar', 'plotcandle',
  'bgcolor', 'barcolor', 'hline', 'fill',
]);

const FOOTPRINT_METHODS = new Set([
  'total_volume',
  'buy_volume',
  'sell_volume',
  'delta',
  'rows',
  'poc',
  'vah',
  'val',
  'get_row_by_price',
  'up_price',
  'down_price',
  'has_buy_imbalance',
  'has_sell_imbalance',
]);

const PLOT_PRIMARY_ARGS: Record<string, string> = {
  plot: 'series',
  plotshape: 'series',
  plotchar: 'series',
  plotarrow: 'series',
  plotbar: 'open',
  plotcandle: 'open',
  bgcolor: 'color',
  barcolor: 'color',
  hline: 'price',
  fill: 'plot1',
};

const RUNTIME_STR_FUNCTIONS = new Set([
  'str.tostring',
  'str.tonumber',
  'str.tointeger',
  'str.length',
  'str.contains',
  'str.startswith',
  'str.endswith',
  'str.substring',
  'str.replace',
  'str.replace_all',
  'str.lower',
  'str.upper',
  'str.trim',
  'str.pos',
  'str.match',
  'str.repeat',
  'str.split',
]);

const LEGACY_GLOBAL_MATH_ALIASES = new Set([
  'abs', 'ceil', 'floor', 'round', 'round_to_mintick', 'sqrt',
  'log', 'log10', 'pow', 'sign', 'max', 'min', 'avg', 'sum',
  'sin', 'cos', 'tan', 'asin', 'acos', 'atan', 'exp',
  'toradians', 'todegrees', 'random',
]);

const LEGACY_GLOBAL_STR_ALIASES = new Map([
  ['tostring', 'str.tostring'],
  ['tonumber', 'str.tonumber'],
]);

const LEGACY_GLOBAL_TICKER_ALIASES = new Map([
  ['tickerid', 'ticker.new'],
  ['heikinashi', 'ticker.heikinashi'],
  ['renko', 'ticker.renko'],
  ['linebreak', 'ticker.linebreak'],
  ['kagi', 'ticker.kagi'],
  ['pointfigure', 'ticker.pointfigure'],
]);
const LEGACY_INPUT_TYPE_ALIASES = new Map([
  ['bool', 'input.bool'],
  ['color', 'input.color'],
  ['float', 'input.float'],
  ['integer', 'input.int'],
  ['int', 'input.int'],
  ['resolution', 'input.timeframe'],
  ['session', 'input.session'],
  ['source', 'input.source'],
  ['string', 'input.string'],
  ['symbol', 'input.symbol'],
  ['timeframe', 'input.timeframe'],
]);
const LEGACY_BARE_VISUAL_CONSTANTS = new Set([
  'area',
  'areabr',
  'circles',
  'columns',
  'cross',
  'dashed',
  'dotted',
  'histogram',
  'line',
  'solid',
  'stepline',
]);

const LOOP_TIME_LIMIT_MS = 500;
const DRAWING_NAMESPACES = new Set(['label', 'line', 'box', 'polyline', 'linefill', 'table', 'chart']);
const DRAWING_RECEIVER_TYPES = new Set(['label', 'line', 'box', 'polyline', 'linefill', 'table', 'chart.point']);
const DRAWING_CONSTRUCTOR_FUNCTIONS = new Set(['label.new', 'line.new', 'box.new', 'polyline.new', 'linefill.new', 'table.new']);

const ARRAY_FUNC_MAP: Record<string, string> = {
  'array.new': 'create', 'array.new_float': 'create', 'array.new_int': 'create',
  'array.new_bool': 'create', 'array.new_string': 'create', 'array.new_color': 'create',
  'array.new_line': 'create', 'array.new_label': 'create', 'array.new_box': 'create',
  'array.new_linefill': 'create', 'array.new_polyline': 'create',
  'array.new_table': 'create', 'array.new_chart_point': 'create',
  'array.from': 'from',
  'array.push': 'push', 'array.pop': 'pop',
  'array.shift': 'shift', 'array.unshift': 'unshift',
  'array.get': 'get', 'array.set': 'set',
  'array.size': 'size', 'array.clear': 'clear',
  'array.copy': 'copy', 'array.sort': 'sort',
  'array.reverse': 'reverse', 'array.concat': 'concat',
  'array.join': 'join', 'array.slice': 'slice',
  'array.includes': 'includes', 'array.indexof': 'indexOf',
  'array.lastindexof': 'lastIndexOf',
  'array.insert': 'insert', 'array.remove': 'remove',
  'array.first': 'first', 'array.last': 'last',
  'array.min': 'min', 'array.max': 'max',
  'array.sum': 'sum', 'array.avg': 'avg',
  'array.range': 'range', 'array.median': 'median',
  'array.mode': 'mode', 'array.abs': 'abs',
  'array.variance': 'variance', 'array.stdev': 'stdev',
  'array.covariance': 'covariance',
  'array.standardize': 'standardize',
  'array.sort_indices': 'sortIndices',
  'array.binary_search': 'binarySearch',
  'array.binary_search_leftmost': 'binarySearchLeftmost',
  'array.binary_search_rightmost': 'binarySearchRightmost',
  'array.percentile_nearest_rank': 'percentileNearestRank',
  'array.percentile_linear_interpolation': 'percentileLinearInterpolation',
  'array.percentrank': 'percentRank',
  'array.fill': 'fill',
  'array.every': 'every', 'array.some': 'some',
  'array.map': 'map', 'array.filter': 'filter',
};

const ARRAY_ARG_NAMES: Record<string, readonly string[]> = {
  'array.new': ['size', 'initial_value'],
  'array.new_float': ['size', 'initial_value'],
  'array.new_int': ['size', 'initial_value'],
  'array.new_bool': ['size', 'initial_value'],
  'array.new_string': ['size', 'initial_value'],
  'array.new_color': ['size', 'initial_value'],
  'array.new_line': ['size', 'initial_value'],
  'array.new_label': ['size', 'initial_value'],
  'array.new_box': ['size', 'initial_value'],
  'array.new_linefill': ['size', 'initial_value'],
  'array.new_polyline': ['size', 'initial_value'],
  'array.new_table': ['size', 'initial_value'],
  'array.new_chart_point': ['size', 'initial_value'],
  'array.copy': ['id'],
  'array.size': ['id'],
  'array.get': ['id', 'index'],
  'array.first': ['id'],
  'array.last': ['id'],
  'array.includes': ['id', 'value'],
  'array.every': ['id', 'callback'],
  'array.some': ['id', 'callback'],
  'array.indexof': ['id', 'value'],
  'array.lastindexof': ['id', 'value'],
  'array.binary_search': ['id', 'val', 'sort_field'],
  'array.binary_search_leftmost': ['id', 'val', 'sort_field'],
  'array.binary_search_rightmost': ['id', 'val', 'sort_field'],
  'array.abs': ['id'],
  'array.min': ['id', 'nth'],
  'array.max': ['id', 'nth'],
  'array.sum': ['id'],
  'array.avg': ['id'],
  'array.range': ['id'],
  'array.median': ['id'],
  'array.mode': ['id'],
  'array.variance': ['id', 'biased'],
  'array.stdev': ['id', 'biased'],
  'array.covariance': ['id1', 'id2', 'biased'],
  'array.percentile_nearest_rank': ['id', 'percentage'],
  'array.percentile_linear_interpolation': ['id', 'percentage'],
  'array.percentrank': ['id', 'index'],
  'array.standardize': ['id'],
  'array.set': ['id', 'index', 'value'],
  'array.push': ['id', 'value'],
  'array.pop': ['id'],
  'array.shift': ['id'],
  'array.unshift': ['id', 'value'],
  'array.insert': ['id', 'index', 'value'],
  'array.remove': ['id', 'index'],
  'array.sort': ['id', 'order', 'sort_field'],
  'array.sort_indices': ['id', 'order', 'sort_field'],
  'array.reverse': ['id'],
  'array.clear': ['id'],
  'array.join': ['id', 'separator'],
  'array.concat': ['id1', 'id2'],
  'array.slice': ['id', 'index_from', 'index_to'],
  'array.fill': ['id', 'value', 'index_from', 'index_to'],
  'array.map': ['id', 'callback'],
  'array.filter': ['id', 'callback'],
};

const ARRAY_ARG_ALIASES: Record<string, Record<string, string>> = {
  'array.binary_search': { value: 'val' },
  'array.binary_search_leftmost': { value: 'val' },
  'array.binary_search_rightmost': { value: 'val' },
  'array.concat': { id: 'id1' },
  'array.covariance': { id: 'id1' },
};

const MAP_FUNC_MAP: Record<string, string> = {
  'map.new': 'create',
  'map.put': 'put', 'map.get': 'get',
  'map.contains': 'contains', 'map.remove': 'remove',
  'map.clear': 'clear', 'map.copy': 'copy',
  'map.keys': 'keys', 'map.values': 'values',
  'map.size': 'size', 'map.put_all': 'putAll',
};

const MAP_ARG_NAMES: Record<string, readonly string[]> = {
  'map.new': [],
  'map.put': ['id', 'key', 'value'],
  'map.get': ['id', 'key'],
  'map.contains': ['id', 'key'],
  'map.remove': ['id', 'key'],
  'map.clear': ['id'],
  'map.copy': ['id'],
  'map.keys': ['id'],
  'map.values': ['id'],
  'map.size': ['id'],
  'map.put_all': ['id', 'id2'],
};

const MATRIX_FUNC_MAP: Record<string, string> = {
  'matrix.new': 'create', 'matrix.new_float': 'create', 'matrix.new_int': 'create',
  'matrix.new_bool': 'create', 'matrix.new_string': 'create', 'matrix.new_color': 'create',
  'matrix.get': 'get', 'matrix.set': 'set',
  'matrix.rows': 'rows', 'matrix.columns': 'columns',
  'matrix.elements_count': 'elementCount',
  'matrix.copy': 'copy', 'matrix.concat': 'concat',
  'matrix.row': 'row', 'matrix.col': 'col', 'matrix.column': 'col',
  'matrix.fill': 'fill', 'matrix.reshape': 'reshape',
  'matrix.add_row': 'addRow', 'matrix.add_col': 'addCol', 'matrix.add_column': 'addCol',
  'matrix.remove_row': 'removeRow', 'matrix.remove_col': 'removeCol', 'matrix.remove_column': 'removeCol',
  'matrix.swap_rows': 'swapRows', 'matrix.swap_columns': 'swapCols',
  'matrix.reverse': 'reverse', 'matrix.transpose': 'transpose',
  'matrix.avg': 'avg', 'matrix.min': 'min', 'matrix.max': 'max',
  'matrix.median': 'median', 'matrix.mode': 'mode', 'matrix.sum': 'sum',
  'matrix.diff': 'diff', 'matrix.mult': 'mult', 'matrix.pow': 'pow',
  'matrix.trace': 'trace', 'matrix.det': 'det', 'matrix.rank': 'rank',
  'matrix.inv': 'inv', 'matrix.pinv': 'pinv',
  'matrix.eigenvalues': 'eigenvalues', 'matrix.eigenvectors': 'eigenvectors',
  'matrix.kron': 'kron', 'matrix.sort': 'sort',
  'matrix.submatrix': 'submatrix',
  'matrix.is_square': 'isSquare', 'matrix.is_zero': 'isZero',
  'matrix.is_binary': 'isBinary', 'matrix.is_identity': 'isIdentity',
  'matrix.is_diagonal': 'isDiagonal', 'matrix.is_antidiagonal': 'isAntidiagonal',
  'matrix.is_symmetric': 'isSymmetric', 'matrix.is_antisymmetric': 'isAntisymmetric',
  'matrix.is_triangular': 'isTriangular', 'matrix.is_stochastic': 'isStochastic',
  'matrix.is_valid': 'isValid',
};

const MATRIX_ARG_NAMES: Record<string, readonly string[]> = {
  'matrix.new': ['rows', 'columns', 'initial_value'],
  'matrix.new_float': ['rows', 'columns', 'initial_value'],
  'matrix.new_int': ['rows', 'columns', 'initial_value'],
  'matrix.new_bool': ['rows', 'columns', 'initial_value'],
  'matrix.new_string': ['rows', 'columns', 'initial_value'],
  'matrix.new_color': ['rows', 'columns', 'initial_value'],
  'matrix.get': ['id', 'row', 'column'],
  'matrix.set': ['id', 'row', 'column', 'value'],
  'matrix.rows': ['id'],
  'matrix.columns': ['id'],
  'matrix.elements_count': ['id'],
  'matrix.copy': ['id'],
  'matrix.concat': ['id1', 'id2'],
  'matrix.row': ['id', 'row'],
  'matrix.col': ['id', 'column'],
  'matrix.column': ['id', 'column'],
  'matrix.fill': ['id', 'value', 'from_row', 'to_row', 'from_column', 'to_column'],
  'matrix.reshape': ['id', 'rows', 'columns'],
  'matrix.add_row': ['id', 'row', 'array_id'],
  'matrix.add_col': ['id', 'column', 'array_id'],
  'matrix.add_column': ['id', 'column', 'array_id'],
  'matrix.remove_row': ['id', 'row'],
  'matrix.remove_col': ['id', 'column'],
  'matrix.remove_column': ['id', 'column'],
  'matrix.swap_rows': ['id', 'row1', 'row2'],
  'matrix.swap_columns': ['id', 'column1', 'column2'],
  'matrix.reverse': ['id'],
  'matrix.transpose': ['id'],
  'matrix.avg': ['id'],
  'matrix.min': ['id'],
  'matrix.max': ['id'],
  'matrix.median': ['id'],
  'matrix.mode': ['id'],
  'matrix.sum': ['id1', 'id2'],
  'matrix.diff': ['id1', 'id2'],
  'matrix.mult': ['id1', 'id2'],
  'matrix.pow': ['id', 'power'],
  'matrix.trace': ['id'],
  'matrix.det': ['id'],
  'matrix.rank': ['id'],
  'matrix.inv': ['id'],
  'matrix.pinv': ['id'],
  'matrix.eigenvalues': ['id'],
  'matrix.eigenvectors': ['id'],
  'matrix.kron': ['id1', 'id2'],
  'matrix.sort': ['id', 'column', 'order', 'sort_field'],
  'matrix.submatrix': ['id', 'from_row', 'to_row', 'from_column', 'to_column'],
  'matrix.is_square': ['id'],
  'matrix.is_zero': ['id'],
  'matrix.is_binary': ['id'],
  'matrix.is_identity': ['id'],
  'matrix.is_diagonal': ['id'],
  'matrix.is_antidiagonal': ['id'],
  'matrix.is_symmetric': ['id'],
  'matrix.is_antisymmetric': ['id'],
  'matrix.is_triangular': ['id'],
  'matrix.is_stochastic': ['id'],
  'matrix.is_valid': ['id'],
};

const MATRIX_ARG_ALIASES: Record<string, Record<string, string>> = {
  'matrix.concat': { id: 'id1' },
  'matrix.sum': { id: 'id1' },
  'matrix.diff': { id: 'id1' },
  'matrix.mult': { id: 'id1' },
  'matrix.kron': { id: 'id1' },
};

type CollectionKind = 'array' | 'map' | 'matrix';

interface FunctionEmitContext {
  localVars: Map<string, VarDeclInfo[]>;
  callSites: Map<CallExpression, number>;
  defaultCallSites: Map<CallExpression, number>;
  callSiteFunctions: Map<CallExpression, string[]>;
  nestedCallSites: Set<CallExpression>;
  calledFunctions: Map<string, Set<string>>;
  paramHistory: Map<string, Set<string>>;
  deepParamHistory: Map<string, Set<string>>;
  conditionalCallSites: Set<CallExpression>;
  localHistory: Map<string, Set<string>>;
}

const COLLECTION_METHOD_RETURNS: Record<CollectionKind, Record<string, CollectionKind>> = {
  array: {
    copy: 'array', concat: 'array', slice: 'array', abs: 'array',
    standardize: 'array', sort_indices: 'array',
  },
  map: {
    copy: 'map', keys: 'array', values: 'array',
  },
  matrix: {
    copy: 'matrix', concat: 'matrix', row: 'array', col: 'array',
    column: 'array', submatrix: 'matrix', diff: 'matrix',
    sum: 'matrix', pow: 'matrix', inv: 'matrix', pinv: 'matrix', eigenvalues: 'array',
    eigenvectors: 'matrix', kron: 'matrix',
  },
};

const COLLECTION_METHOD_NAMES = new Set([
  ...Object.keys(ARRAY_FUNC_MAP).filter((name) => name !== 'array.new').map((name) => name.replace('array.', '')),
  ...Object.keys(MAP_FUNC_MAP).filter((name) => name !== 'map.new').map((name) => name.replace('map.', '')),
  ...Object.keys(MATRIX_FUNC_MAP).filter((name) => !name.startsWith('matrix.new')).map((name) => name.replace('matrix.', '')),
]);

const JS_RESERVED_WORDS = new Set([
  'await', 'break', 'case', 'catch', 'class', 'const', 'continue', 'debugger',
  'default', 'delete', 'do', 'else', 'enum', 'export', 'extends', 'finally',
  'for', 'function', 'if', 'import', 'in', 'instanceof', 'new', 'return',
  'super', 'switch', 'this', 'throw', 'try', 'typeof', 'var', 'void', 'while',
  'with', 'yield', 'let', 'static', 'implements', 'interface', 'package',
  'private', 'protected', 'public',
]);

function jsIdentifierPart(name: string): string {
  let out = '';
  for (const char of name) {
    if (/^[A-Za-z0-9_$]$/.test(char)) out += char;
    else out += `_u${char.codePointAt(0)?.toString(16) ?? '0'}_`;
  }
  if (!/^[A-Za-z_$]/.test(out)) out = `_${out}`;
  if (JS_RESERVED_WORDS.has(out)) out = `_${out}`;
  return out;
}

function jsPineName(name: string): string {
  return jsIdentifierPart(name);
}

function jsStateMember(prefix: string, name: string): string {
  return `${prefix}${jsIdentifierPart(name)}`;
}

function jsFunctionMember(name: string): string {
  return jsStateMember('_fn_', name);
}

function jsSeriesMember(name: string): string {
  return jsStateMember('_sv_', name);
}

function jsSeriesBarMember(name: string): string {
  return jsStateMember('_sv_bar_', name);
}

function jsVarMember(name: string): string {
  return jsStateMember('_v_', name);
}

function jsInitMember(name: string): string {
  return jsStateMember('__init_', name);
}

function jsGlobalMember(name: string): string {
  return jsStateMember('_g_', name);
}

function rootBlockPersistentKey(stmt: VariableDeclaration, name: string): string {
  const start = stmt.loc?.start;
  return `${name}_${start?.offset ?? start?.line ?? 0}_${start?.column ?? 0}`;
}

function jsCollectionHistoryMember(name: string): string {
  return jsStateMember('_collection_history_', name);
}

function collectionRuntimeMethodName(kind: CollectionKind, method: string): string | undefined {
  if (kind === 'array') return ARRAY_FUNC_MAP[`array.${method}`];
  if (kind === 'map') return MAP_FUNC_MAP[`map.${method}`];
  return MATRIX_FUNC_MAP[`matrix.${method}`];
}

function isCollectionReceiverMethod(kind: CollectionKind, method: string): boolean {
  const fullName = `${kind}.${method}`;
  if (kind === 'array') return fullName in ARRAY_FUNC_MAP && fullName !== 'array.new' && !fullName.startsWith('array.new_');
  if (kind === 'map') return fullName in MAP_FUNC_MAP && fullName !== 'map.new';
  return fullName in MATRIX_FUNC_MAP && fullName !== 'matrix.new' && !fullName.startsWith('matrix.new_');
}

function collectionArgNames(fullName: string): readonly string[] | undefined {
  if (fullName.startsWith('array.')) return ARRAY_ARG_NAMES[fullName];
  if (fullName.startsWith('map.')) return MAP_ARG_NAMES[fullName];
  return MATRIX_ARG_NAMES[fullName];
}

function collectionArgAliases(fullName: string): Record<string, string> {
  if (fullName.startsWith('array.')) return ARRAY_ARG_ALIASES[fullName] ?? {};
  if (fullName.startsWith('matrix.')) return MATRIX_ARG_ALIASES[fullName] ?? {};
  return {};
}

function staticMemberChainName(expr: Expression): string | undefined {
  if (expr.type === 'Identifier') return expr.name;
  if (expr.type !== 'MemberExpression') return undefined;
  const objectName = staticMemberChainName(expr.object);
  return objectName ? `${objectName}.${expr.property.name}` : undefined;
}

function isStaticNamespaceReceiverName(name: string | undefined): boolean {
  return name !== undefined && (name === 'array' || name === 'map' || name === 'matrix' || BUILTIN_NAMESPACES.has(name));
}

function collectionKindFromTypeAnnotation(annotation: VariableDeclaration['typeAnnotation']): CollectionKind | undefined {
  if (!annotation) return undefined;
  if (annotation.baseType === 'array' || annotation.baseType === 'map' || annotation.baseType === 'matrix') {
    return annotation.baseType;
  }
  return undefined;
}

function inferCollectionVars(ast: Program): Map<string, CollectionKind> {
  const vars = new Map<string, CollectionKind>();
  const userTypeVars = new Map<string, string>();
  const typeFieldKinds = new Map<string, Map<string, CollectionKind>>();

  for (const stmt of ast.body) {
    if (stmt.type !== 'TypeDeclaration') continue;
    const fields = new Map<string, CollectionKind>();
    for (const field of stmt.fields) {
      const kind = collectionKindFromTypeAnnotation(field.typeAnnotation);
      if (kind) fields.set(field.name.name, kind);
    }
    typeFieldKinds.set(stmt.name.name, fields);
  }

  const inferExpr = (expr: Expression | IfStatement): CollectionKind | undefined => {
    if (expr.type === 'IfStatement') return undefined;
    if (expr.type === 'Identifier') return vars.get(expr.name);
    if (expr.type === 'ArrayExpression') return 'array';
    if (expr.type === 'MemberExpression' && expr.object.type === 'Identifier') {
      const typeName = userTypeVars.get(expr.object.name);
      return typeName ? typeFieldKinds.get(typeName)?.get(expr.property.name) : undefined;
    }
    if (expr.type === 'ConditionalExpression') {
      const consequent = inferExpr(expr.consequent);
      const alternate = inferExpr(expr.alternate);
      return consequent === alternate ? consequent : undefined;
    }
    if (expr.type !== 'CallExpression') return undefined;

    const fullName = staticMemberChainName(expr.callee) ?? '';
    if (fullName === 'ta.pivot_point_levels') return 'array';
    if (fullName === 'array.new' || fullName.startsWith('array.new_') || fullName === 'array.from') return 'array';
    if (fullName === 'map.new') return 'map';
    if (fullName === 'matrix.new' || fullName.startsWith('matrix.new_')) return 'matrix';
    if (fullName.startsWith('array.')) return COLLECTION_METHOD_RETURNS.array[fullName.slice('array.'.length)];
    if (fullName.startsWith('map.')) return COLLECTION_METHOD_RETURNS.map[fullName.slice('map.'.length)];
    if (fullName.startsWith('matrix.')) return COLLECTION_METHOD_RETURNS.matrix[fullName.slice('matrix.'.length)];

    if (expr.callee.type !== 'MemberExpression') return undefined;
    const receiverKind = inferExpr(expr.callee.object);
    if (!receiverKind) return undefined;
    return COLLECTION_METHOD_RETURNS[receiverKind][expr.callee.property.name];
  };

  const visitStmt = (stmt: Statement): void => {
    switch (stmt.type) {
      case 'VariableDeclaration': {
        if (stmt.names.type === 'VariableDeclarator') {
          const annotationKind = collectionKindFromTypeAnnotation(stmt.typeAnnotation);
          const initKind = inferExpr(stmt.init);
          const kind = annotationKind ?? initKind;
          if (kind) vars.set(stmt.names.name.name, kind);
          const annotatedType = stmt.typeAnnotation?.baseType === 'udt'
            ? stmt.typeAnnotation.name
            : stmt.init.type === 'CallExpression'
              && stmt.init.callee.type === 'MemberExpression'
              && stmt.init.callee.property.name === 'new'
              && stmt.init.callee.object.type === 'Identifier'
              && typeFieldKinds.has(stmt.init.callee.object.name)
              ? stmt.init.callee.object.name
              : undefined;
          if (annotatedType) userTypeVars.set(stmt.names.name.name, annotatedType);
          if (annotatedType) {
            for (const [fieldName, fieldKind] of typeFieldKinds.get(annotatedType) ?? []) {
              vars.set(`${stmt.names.name.name}.${fieldName}`, fieldKind);
            }
          }
        }
        if (stmt.init.type === 'IfStatement') visitStmt(stmt.init);
        break;
      }
      case 'AssignmentStatement': {
        if (stmt.left.type === 'Identifier') {
          const kind = inferExpr(stmt.right);
          if (kind) vars.set(stmt.left.name, kind);
        }
        if (stmt.right.type === 'IfStatement') visitStmt(stmt.right);
        break;
      }
      case 'TupleAssignment':
        if (stmt.right.type === 'IfStatement') visitStmt(stmt.right);
        break;
      case 'ExpressionStatement':
        inferExpr(stmt.expression);
        break;
      case 'IfStatement':
        for (const s of stmt.consequent) visitStmt(s);
        if (stmt.alternate) {
          if (Array.isArray(stmt.alternate)) {
            for (const s of stmt.alternate) visitStmt(s);
          } else {
            visitStmt(stmt.alternate);
          }
        }
        break;
      case 'OnceStatement':
        if (stmt.test) inferExpr(stmt.test);
        for (const s of stmt.body) visitStmt(s);
        break;
      case 'ForStatement':
      case 'WhileStatement':
        for (const s of stmt.body) visitStmt(s);
        break;
      case 'MultiDeclaration':
        for (const d of stmt.declarations) visitStmt(d);
        break;
      case 'MultiAssignment':
        for (const a of stmt.assignments) visitStmt(a);
        break;
      case 'FunctionDeclaration':
        if (Array.isArray(stmt.body)) {
          for (const s of stmt.body) visitStmt(s);
        }
        break;
      default:
        break;
    }
  };

  for (const stmt of ast.body) visitStmt(stmt);
  return vars;
}

function inferCollectionHistoryVars(ast: Program, collectionVars: Map<string, CollectionKind>): Map<string, CollectionKind> {
  const historyVars = new Map<string, CollectionKind>();
  const visit = (value: unknown): void => {
    if (!value || typeof value !== 'object') return;
    const node = value as { type?: string; object?: { type?: string; name?: string } };
    if (node.type === 'IndexExpression' && node.object?.type === 'Identifier') {
      const kind = collectionVars.get(node.object.name ?? '');
      if (kind) historyVars.set(node.object.name ?? '', kind);
    }
    for (const key of Object.keys(value)) {
      if (key === 'loc') continue;
      const child = (value as Record<string, unknown>)[key];
      if (Array.isArray(child)) {
        for (const item of child) visit(item);
      } else {
        visit(child);
      }
    }
  };
  visit(ast);
  return historyVars;
}

function inferFunctionEmitContext(
  ast: Program,
  funcInfos: Map<string, FuncInfo>,
  importedFunctions: Map<string, string>,
  userFunctionOverloads: Map<string, string[]>,
  importedMethods: Map<string, string>,
  localMethodOverloads: Map<string, LocalMethodOverloadInfo[]>,
  importedMethodOverloads: Map<string, ImportedMethodOverloadInfo[]>,
  importedFunctionOwners: Map<string, string>,
  importedLocalFunctions: Map<string, string>,
  importedDependencyScopes: Map<string, Map<string, string>>,
): FunctionEmitContext {
  const functionNames = new Set(funcInfos.keys());
  const localVars = new Map<string, VarDeclInfo[]>();
  const callSites = new Map<CallExpression, number>();
  const defaultCallSites = new Map<CallExpression, number>();
  let defaultCallOwnerName: string | undefined;
  const callSiteFunctions = new Map<CallExpression, string[]>();
  const nestedCallSites = new Set<CallExpression>();
  const calledFunctions = new Map<string, Set<string>>();
  const paramHistory = new Map<string, Set<string>>();
  const deepParamHistory = new Map<string, Set<string>>();
  const conditionalCallSites = new Set<CallExpression>();
  let conditionalDepth = 0;
  const localHistory = new Map<string, Set<string>>();
  const regularLocalNames = new Map<string, Set<string>>();
  let callSiteIndex = 0;

  const taSourceArgs = (fullName: string, args: CallArgument[]): Expression[] => {
    if (!fullName.startsWith('ta.')) return [];
    const positional = args.filter((arg) => !arg.name).map((arg) => arg.value);
    const firstAliased = args.find((arg) => arg.name?.name === 'source' || arg.name?.name === 'series')?.value
      ?? positional[0];
    switch (fullName) {
      case 'ta.sma':
      case 'ta.ema':
      case 'ta.rma':
      case 'ta.smma':
      case 'ta.wma':
      case 'ta.vwma':
      case 'ta.swma':
      case 'ta.hma':
      case 'ta.alma':
      case 'ta.stdev':
      case 'ta.variance':
      case 'ta.dev':
      case 'ta.mom':
      case 'ta.roc':
      case 'ta.cum':
      case 'ta.highest':
      case 'ta.lowest':
        return firstAliased ? [firstAliased] : [];
      default:
        return [];
    }
  };

  const sameImportedLibraryFunctionName = (ownerName: string | undefined, calleeName: string): string | undefined => {
    const alias = ownerName ? importedFunctionOwners.get(ownerName) : undefined;
    return alias ? importedLocalFunctions.get(`${alias}.${calleeName}`) : undefined;
  };

  const registerCallSite = (expr: CallExpression, ownerName?: string): void => {
    let names: string[] = [];
    if (expr.callee.type === 'Identifier') {
      const sameLibraryFunction = sameImportedLibraryFunctionName(ownerName, expr.callee.name);
      names = sameLibraryFunction
        ? [sameLibraryFunction]
        : [
          ...(userFunctionOverloads.get(expr.callee.name) ?? [expr.callee.name]),
          ...(localMethodOverloads.get(expr.callee.name)?.map((overload) => overload.internalName) ?? []),
        ];
    } else if (expr.callee.type === 'MemberExpression') {
      const rawName = staticMemberChainName(expr.callee);
      const fullName = rawName ? resolveDependencyMember(rawName, ownerName, importedDependencyScopes) : undefined;
      const localOverloads = isStaticNamespaceReceiverName(staticMemberChainName(expr.callee.object))
        ? undefined
        : localMethodOverloads.get(expr.callee.property.name);
      const importedOverloads = importedMethodOverloads.get(expr.callee.property.name);
      if (localOverloads && localOverloads.length > 0) {
        names = localOverloads.map((overload) => overload.internalName);
      } else if (importedOverloads && importedOverloads.length > 0) {
        names = importedOverloads.map((overload) => overload.internalName);
      } else {
        names = [(fullName ? importedFunctions.get(fullName) : undefined)
          ?? importedMethods.get(expr.callee.property.name)
          ?? expr.callee.property.name];
      }
    }
    names = [...new Set(names.filter((name) => functionNames.has(name) && (!defaultCallOwnerName || !importedFunctionOwners.has(name))))];
    if (names.length === 0) return;
    if (defaultCallOwnerName) {
      if (!defaultCallSites.has(expr)) defaultCallSites.set(expr, callSiteIndex++);
      return;
    }
    callSites.set(expr, callSiteIndex++);
    callSiteFunctions.set(expr, names);
    if (ownerName) {
      nestedCallSites.add(expr);
      let called = calledFunctions.get(ownerName);
      if (!called) {
        called = new Set();
        calledFunctions.set(ownerName, called);
      }
      for (const name of names) called.add(name);
    }
  };

  const collectRegularLocals = (body: Statement[] | Expression): Set<string> => {
    const names = new Set<string>();
    const visitExpression = (expr: Expression | IfStatement): void => {
      if (expr.type === 'ForStatement' || expr.type === 'WhileStatement' || expr.type === 'IfStatement') {
        visit(expr);
      } else if (expr.type === 'SwitchExpression') {
        for (const branch of expr.cases) {
          if (Array.isArray(branch.consequent)) {
            for (const child of branch.consequent) visit(child);
          } else {
            visitExpression(branch.consequent);
          }
        }
      }
    };
    const visit = (stmt: Statement): void => {
      if (stmt.type === 'VariableDeclaration') {
        if (stmt.names.type === 'VariableDeclarator') {
          names.add(stmt.names.name.name);
        } else {
          for (const name of stmt.names.names) names.add(name.name);
        }
        visitExpression(stmt.init);
      } else if (stmt.type === 'MultiDeclaration') {
        for (const declaration of stmt.declarations) visit(declaration);
      } else if (stmt.type === 'IfStatement') {
        for (const child of stmt.consequent) visit(child);
        if (Array.isArray(stmt.alternate)) {
          for (const child of stmt.alternate) visit(child);
        } else if (stmt.alternate) {
          visit(stmt.alternate);
        }
      } else if (stmt.type === 'ForStatement' || stmt.type === 'WhileStatement') {
        for (const child of stmt.body) visit(child);
      } else if (stmt.type === 'ExpressionStatement') {
        visitExpression(stmt.expression);
      } else if (stmt.type === 'AssignmentStatement' || stmt.type === 'TupleAssignment') {
        visitExpression(stmt.right);
      }
    };
    if (Array.isArray(body)) {
      for (const stmt of body) visit(stmt);
    } else {
      visitExpression(body);
    }
    return names;
  };

  const walkExpr = (expr: Expression, ownerParams?: Set<string>, ownerName?: string): void => {
    switch (expr.type) {
      case 'CallExpression':
        registerCallSite(expr, ownerName);
        if (conditionalDepth > 0) conditionalCallSites.add(expr);
        if (ownerName && ownerParams) {
          const fullName = staticMemberChainName(expr.callee) ?? (expr.callee.type === 'Identifier' ? expr.callee.name : '');
          if (fullName.startsWith('ta.')) {
            for (const arg of taSourceArgs(fullName, expr.arguments)) {
              if (arg.type === 'Identifier' && ownerParams.has(arg.name)) {
                let params = paramHistory.get(ownerName);
                if (!params) {
                  params = new Set();
                  paramHistory.set(ownerName, params);
                }
                params.add(arg.name);
              } else if (arg.type === 'Identifier' && regularLocalNames.get(ownerName)?.has(arg.name)) {
                let locals = localHistory.get(ownerName);
                if (!locals) {
                  locals = new Set();
                  localHistory.set(ownerName, locals);
                }
                locals.add(arg.name);
              }
            }
          }
        }
        walkExpr(expr.callee, ownerParams, ownerName);
        for (const arg of expr.arguments) walkExpr(arg.value, ownerParams, ownerName);
        break;
      case 'MemberExpression':
        walkExpr(expr.object, ownerParams, ownerName);
        break;
      case 'IndexExpression':
        if (expr.object.type === 'Identifier' && ownerName && ownerParams?.has(expr.object.name)) {
          let params = paramHistory.get(ownerName);
          if (!params) {
            params = new Set();
            paramHistory.set(ownerName, params);
          }
          params.add(expr.object.name);
          if (expr.index.type === 'NumericLiteral' && (expr.index.value === 2 || expr.index.value === 3)) {
            const deep = deepParamHistory.get(ownerName) ?? new Set<string>();
            deep.add(expr.object.name);
            deepParamHistory.set(ownerName, deep);
          }
        } else if (expr.object.type === 'Identifier' && ownerName && regularLocalNames.get(ownerName)?.has(expr.object.name)) {
          let locals = localHistory.get(ownerName);
          if (!locals) {
            locals = new Set();
            localHistory.set(ownerName, locals);
          }
          locals.add(expr.object.name);
        }
        walkExpr(expr.object, ownerParams, ownerName);
        walkExpr(expr.index, ownerParams, ownerName);
        break;
      case 'BinaryExpression':
        walkExpr(expr.left, ownerParams, ownerName);
        walkExpr(expr.right, ownerParams, ownerName);
        break;
      case 'UnaryExpression':
        walkExpr(expr.argument, ownerParams, ownerName);
        break;
      case 'ConditionalExpression':
        walkExpr(expr.test, ownerParams, ownerName);
        conditionalDepth += 1;
        walkExpr(expr.consequent, ownerParams, ownerName);
        walkExpr(expr.alternate, ownerParams, ownerName);
        conditionalDepth -= 1;
        break;
      case 'SwitchExpression':
        if (expr.discriminant) walkExpr(expr.discriminant, ownerParams, ownerName);
        for (const branch of expr.cases) {
          if (branch.test) walkExpr(branch.test, ownerParams, ownerName);
          if (Array.isArray(branch.consequent)) {
            const owner = ownerName ? {
              name: { name: ownerName },
              params: [...(ownerParams ?? [])].map(name => ({ name })),
            } as FunctionDeclaration : undefined;
            for (const stmt of branch.consequent) walkStmt(stmt, owner);
          } else {
            walkExpr(branch.consequent, ownerParams, ownerName);
          }
        }
        break;
      case 'ForStatement':
      case 'WhileStatement': {
        const owner = ownerName ? {
          name: { name: ownerName },
          params: [...(ownerParams ?? [])].map(name => ({ name })),
        } as FunctionDeclaration : undefined;
        walkStmt(expr, owner);
        break;
      }
      case 'ArrayExpression':
        for (const element of expr.elements) walkExpr(element, ownerParams, ownerName);
        break;
      case 'LambdaExpression':
        walkExpr(expr.body, ownerParams, ownerName);
        break;
      default:
        break;
    }
  };

  const walkStmt = (stmt: Statement, owner?: FunctionDeclaration): void => {
    const ownerParams = owner ? new Set(owner.params.map((p) => p.name)) : undefined;
    const ownerName = owner?.name.name;
    switch (stmt.type) {
      case 'FunctionDeclaration':
        if (!localVars.has(stmt.name.name)) localVars.set(stmt.name.name, []);
        regularLocalNames.set(stmt.name.name, collectRegularLocals(stmt.body));
        paramHistory.set(stmt.name.name, new Set());
        localHistory.set(stmt.name.name, new Set());
        if (Array.isArray(stmt.body)) {
          for (const s of stmt.body) walkStmt(s, stmt);
        } else {
          walkExpr(stmt.body, new Set(stmt.params.map((p) => p.name)), stmt.name.name);
        }
        break;
      case 'VariableDeclaration':
        if (owner && (stmt.kind === 'var' || stmt.kind === 'varip') && stmt.names.type === 'VariableDeclarator') {
          localVars.get(owner.name.name)!.push({
            name: stmt.names.name.name,
            kind: stmt.kind,
            initExpr: stmt.init,
          });
        }
        if (stmt.init.type === 'IfStatement') walkStmt(stmt.init, owner);
        else walkExpr(stmt.init, owner ? new Set(owner.params.map((p) => p.name)) : undefined, owner?.name.name);
        break;
      case 'AssignmentStatement':
        if (stmt.right.type === 'IfStatement') walkStmt(stmt.right, owner);
        else walkExpr(stmt.right, owner ? new Set(owner.params.map((p) => p.name)) : undefined, owner?.name.name);
        if (stmt.left.type !== 'Identifier') walkExpr(stmt.left, owner ? new Set(owner.params.map((p) => p.name)) : undefined, owner?.name.name);
        break;
      case 'TupleAssignment':
        if (stmt.right.type === 'IfStatement') walkStmt(stmt.right, owner);
        else walkExpr(stmt.right, owner ? new Set(owner.params.map((p) => p.name)) : undefined, owner?.name.name);
        break;
      case 'ExpressionStatement':
        walkExpr(stmt.expression, owner ? new Set(owner.params.map((p) => p.name)) : undefined, owner?.name.name);
        break;
      case 'IfStatement':
        walkExpr(stmt.test, owner ? new Set(owner.params.map((p) => p.name)) : undefined, owner?.name.name);
        conditionalDepth += 1;
        for (const s of stmt.consequent) walkStmt(s, owner);
        if (stmt.alternate) {
          if (Array.isArray(stmt.alternate)) {
            for (const s of stmt.alternate) walkStmt(s, owner);
          } else {
            walkStmt(stmt.alternate, owner);
          }
        }
        conditionalDepth -= 1;
        break;
      case 'ForStatement':
        if (stmt.kind === 'numeric') {
          walkExpr(stmt.start, ownerParams, ownerName);
          walkExpr(stmt.end, ownerParams, ownerName);
          if (stmt.step) walkExpr(stmt.step, ownerParams, ownerName);
        } else {
          walkExpr(stmt.iterable, ownerParams, ownerName);
        }
        for (const s of stmt.body) walkStmt(s, owner);
        break;
      case 'WhileStatement':
        walkExpr(stmt.test, ownerParams, ownerName);
        for (const s of stmt.body) walkStmt(s, owner);
        break;
      case 'MultiDeclaration':
        for (const d of stmt.declarations) walkStmt(d, owner);
        break;
      case 'MultiAssignment':
        for (const a of stmt.assignments) walkStmt(a, owner);
        break;
      case 'MultiExpressionStatement':
        for (const e of stmt.expressions) walkExpr(e, ownerParams, ownerName);
        break;
      case 'TypeDeclaration':
        for (const field of stmt.fields) {
          if (field.defaultValue) walkExpr(field.defaultValue);
        }
        break;
      default:
        break;
    }
  };

  const walkFunctionInfo = (name: string, fi: FuncInfo): void => {
    if (localVars.has(name)) return;
    localVars.set(name, []);
    paramHistory.set(name, new Set());
    localHistory.set(name, new Set());
    regularLocalNames.set(name, collectRegularLocals(fi.body));
    if (Array.isArray(fi.body)) {
      const owner = {
        name: { name },
        params: fi.params.map((param) => ({ name: param })),
      } as FunctionDeclaration;
      for (const stmt of fi.body) walkStmt(stmt, owner);
    } else {
      walkExpr(fi.body, new Set(fi.params), name);
    }
  };

  for (const stmt of ast.body) walkStmt(stmt);
  for (const [name, fi] of funcInfos) walkFunctionInfo(name, fi);
  for (const [name, fi] of funcInfos) {
    if (importedFunctionOwners.has(name)) continue;
    defaultCallOwnerName = name;
    for (const value of fi.paramDefaults) if (value) walkExpr(value);
  }
  defaultCallOwnerName = undefined;
  return { localVars, callSites, defaultCallSites, callSiteFunctions, nestedCallSites, calledFunctions, paramHistory, deepParamHistory, conditionalCallSites, localHistory };
}

function inferRootRegularVars(ast: Program, includeBranchDeclarations = true): Set<string> {
  const vars = new Set<string>();
  const addDeclaration = (stmt: VariableDeclaration): void => {
    if (
      stmt.type === 'VariableDeclaration'
      && stmt.kind !== 'var'
      && stmt.kind !== 'varip'
    ) {
      if (stmt.names.type === 'VariableDeclarator') {
        vars.add(stmt.names.name.name);
      } else {
        for (const name of stmt.names.names) {
          if (name.name !== '_') vars.add(name.name);
        }
      }
    }
  };
  const addBranchDeclarations = (stmts: Statement[]): void => {
    for (const stmt of stmts) {
      if (stmt.type === 'VariableDeclaration') addDeclaration(stmt);
      else if (stmt.type === 'MultiDeclaration') {
        for (const declaration of stmt.declarations) addDeclaration(declaration);
      } else if (stmt.type === 'IfStatement') {
        addBranchDeclarations(stmt.consequent);
        if (Array.isArray(stmt.alternate)) addBranchDeclarations(stmt.alternate);
        else if (stmt.alternate) addBranchDeclarations([stmt.alternate]);
      }
    }
  };
  for (const stmt of ast.body) {
    if (stmt.type === 'VariableDeclaration') addDeclaration(stmt);
    else if (stmt.type === 'MultiDeclaration') {
      for (const declaration of stmt.declarations) addDeclaration(declaration);
    } else if (includeBranchDeclarations && stmt.type === 'IfStatement') {
      addBranchDeclarations(stmt.consequent);
      if (Array.isArray(stmt.alternate)) addBranchDeclarations(stmt.alternate);
      else if (stmt.alternate) addBranchDeclarations([stmt.alternate]);
    }
  }
  return vars;
}

function inferRootPersistentVars(ast: Program): Set<string> {
  const vars = new Set<string>();
  for (const stmt of ast.body) {
    if (stmt.type !== 'VariableDeclaration' || (stmt.kind !== 'var' && stmt.kind !== 'varip')) continue;
    if (stmt.names.type === 'VariableDeclarator') vars.add(stmt.names.name.name);
    else for (const name of stmt.names.names) if (name.name !== '_') vars.add(name.name);
  }
  return vars;
}

function inferRootSourceAliases(ast: Program): Map<string, Expression> {
  const aliases = new Map<string, Expression>();
  for (const stmt of ast.body) {
    if (
      stmt.type !== 'VariableDeclaration'
      || stmt.kind === 'var'
      || stmt.kind === 'varip'
      || stmt.names.type !== 'VariableDeclarator'
      || stmt.init.type === 'IfStatement'
    ) continue;
    const name = stmt.names.name.name;
    if (stmt.init.type === 'Identifier') {
      aliases.set(name, stmt.init);
      continue;
    }
    if (stmt.init.type === 'CallExpression') {
      const fullName = staticMemberChainName(stmt.init.callee) ?? '';
      const sourceArg = stmt.init.arguments[0]?.value;
      if (fullName === 'input.source' && sourceArg) aliases.set(name, sourceArg);
    }
  }
  return aliases;
}

function inferFieldHistory(ast: Program): Map<string, Set<string>> {
  const fields = new Map<string, Set<string>>();
  const visit = (value: unknown): void => {
    if (!value || typeof value !== 'object') return;
    const node = value as { type?: string; object?: unknown; property?: { name?: unknown } };
    if (node.type === 'IndexExpression') {
      const indexedObject = node.object as { type?: string; object?: unknown; property?: { name?: unknown } } | undefined;
      if (indexedObject?.type === 'MemberExpression') {
        const receiver = indexedObject.object as { type?: string; name?: unknown } | undefined;
        const field = indexedObject.property?.name;
        if (
          receiver?.type === 'Identifier'
          && typeof receiver.name === 'string'
          && receiver.name !== 'strategy'
          && typeof field === 'string'
        ) {
          let receiverFields = fields.get(receiver.name);
          if (!receiverFields) {
            receiverFields = new Set();
            fields.set(receiver.name, receiverFields);
          }
          receiverFields.add(field);
        }
      }
    }
    for (const key of Object.keys(value)) {
      if (key === 'loc') continue;
      const child = (value as Record<string, unknown>)[key];
      if (Array.isArray(child)) {
        for (const item of child) visit(item);
      } else {
        visit(child);
      }
    }
  };
  visit(ast);
  return fields;
}

function indexNodes(root: object): WeakSet<object> {
  const seen = new WeakSet<object>();
  const visit = (node: unknown): void => {
    if (!node || typeof node !== 'object' || seen.has(node)) return;
    seen.add(node);
    for (const key of Object.keys(node)) {
      if (key === 'loc') continue;
      const child = (node as Record<string, unknown>)[key];
      if (Array.isArray(child)) {
        for (const item of child) visit(item);
      } else {
        visit(child);
      }
    }
  };
  visit(root);
  return seen;
}

function indexLocalEvaluationNodes(root: object): WeakSet<object> {
  const seen = new WeakSet<object>();
  const local = new WeakSet<object>();
  const visit = (value: unknown, insideLocal: boolean): void => {
    if (!value || typeof value !== 'object') return;
    // Shared AST objects can first occur outside a local subtree, then inside it.
    if (seen.has(value) && (!insideLocal || local.has(value))) return;
    seen.add(value);
    if (insideLocal) local.add(value);
    const node = value as { type?: string; consequent?: unknown; alternate?: unknown; body?: unknown; cases?: unknown; right?: unknown; operator?: string };
    const localChildren: unknown[] = [];
    if (!insideLocal) {
      if (node.type === 'IfStatement' || node.type === 'ConditionalExpression') {
        localChildren.push(node.consequent, node.alternate);
      }
      if (['ForStatement', 'WhileStatement', 'OnceStatement', 'FunctionDeclaration'].includes(node.type ?? '')) {
        localChildren.push(node.body);
      }
      if (node.type === 'SwitchExpression') localChildren.push(node.cases);
      if (node.type === 'BinaryExpression' && ['and', 'or', '&&', '||'].includes(node.operator ?? '')) {
        localChildren.push(node.right);
      }
    }
    for (const key of Object.keys(value)) {
      if (key === 'loc') continue;
      const child = (value as Record<string, unknown>)[key];
      visit(child, insideLocal || localChildren.includes(child));
    }
  };
  visit(root, false);
  return local;
}

function containsFunctionCall(root: unknown): boolean {
  if (!root || typeof root !== 'object') return false;
  if (Array.isArray(root)) return root.some(containsFunctionCall);
  if ('type' in root && root.type === 'CallExpression') return true;
  return Object.values(root).some(containsFunctionCall);
}

function writesLoopCounter(root: unknown, name: string): boolean {
  if (!root || typeof root !== 'object') return false;
  if (Array.isArray(root)) return root.some((child) => writesLoopCounter(child, name));
  const node = root as Statement;
  if (node.type === 'AssignmentStatement' && node.left.type === 'Identifier' && node.left.name === name) return true;
  if (node.type === 'TupleAssignment' && node.names.some((target) => target.name === name)) return true;
  if (node.type === 'ForStatement' && (node.counter.name === name || (node.kind === 'collection' && node.indexCounter?.name === name))) return true;
  if (node.type === 'VariableDeclaration' && collectIdentifierReferences(node.names as unknown as Expression).has(name)) return true;
  return Object.entries(root).some(([key, child]) => key !== 'loc' && writesLoopCounter(child, name));
}

function collectIdentifierReferences(expr: Expression, references = new Set<string>()): Set<string> {
  if (expr.type === 'Identifier') {
    references.add(expr.name);
    return references;
  }
  for (const child of Object.values(expr)) {
    if (Array.isArray(child)) {
      for (const item of child) {
        if (item && typeof item === 'object') collectIdentifierReferences(item as Expression, references);
      }
    } else if (child && typeof child === 'object') {
      collectIdentifierReferences(child as Expression, references);
    }
  }
  return references;
}

export interface RequestContextSelection {
  ids: WeakMap<SemanticExpressionTypeContext, Map<CallExpression, number>>;
  callTypes: WeakMap<CallExpression, SemanticExpressionTypeContext>;
  nodes: WeakSet<CallExpression>;
}

export function emit(ast: Program, ctx: AnalysisContext, libraries?: Map<string, Program>, requestedContexts?: RequestContextSelection): string {
  const versionRules = pineVersionRules(ctx.pineVersion);
  let literalTimestampCount: number | undefined;
  const loopResultTypes = ctx.loopResultTypes ?? new WeakMap<ForStatement | WhileStatement, SemanticType[]>();
  let recordedExpressionTypes = ctx.recordedExpressionTypes;
  function expressionType(expression: Expression | IfStatement): SemanticType | undefined {
    if (!recordedExpressionTypes) {
      recordedExpressionTypes = new WeakMap();
      checkProgram(ast, { expressionTypes: recordedExpressionTypes, loopResultTypes, libraries });
    }
    return recordedExpressionTypes.get(expression);
  }
  function emitOmittedBoolMatrixAxis(name: string, receiverExpression: Expression | undefined, receiver: string, args: string[]): string | undefined {
    if (versionRules.allowsBoolNaHelpers || !receiverExpression || args.length >= 2
      || (name !== 'matrix.add_row' && name !== 'matrix.add_col')) return undefined;
    const type = expressionType(receiverExpression);
    if (type?.kind !== 'matrix' || type.elementType?.kind !== 'bool') return undefined;
    const row = name === 'matrix.add_row';
    return `((_m, _i) => deps._mtx.${row ? 'addRow' : 'addCol'}(_m, _i, deps._arr.create(${row ? '_m.columns' : '_m.rows'}, false)))(${receiver}, ${args[0] ?? 'undefined'})`;
  }
  function emitBoolMapReturn(name: string, receiverExpression: Expression | undefined, call: string): string {
    if (versionRules.allowsBoolNaHelpers || !receiverExpression
      || !['map.get', 'map.put', 'map.remove'].includes(name)) return call;
    const type = expressionType(receiverExpression);
    return type?.kind === 'map' && type.valueType?.kind === 'bool' ? `_nz(${call}, false)` : call;
  }
  function expressionKind(expression: Expression | IfStatement): SemanticType['kind'] | undefined {
    return expressionType(expression)?.kind;
  }
  const divisionSites = new Map<BinaryExpression, number>();
  const additionSites = new Map<BinaryExpression, number>();
  const subtractionOperands = new WeakMap<BinaryExpression, { left: string; right: string }>();
  function collectAdditiveOperand(expression: Expression | IfStatement): void {
    if (expression.type !== 'BinaryExpression' || expression.operator !== '-') return;
    if (!additionSites.has(expression)) additionSites.set(expression, additionSites.size);
    collectAdditiveOperand(expression.left);
  }
  function collectArithmeticSites(node: unknown): void {
    if (!node || typeof node !== 'object') return;
    const expression = node as Expression | AssignmentStatement;
    if (expression.type === 'BinaryExpression') {
      if (expression.operator === '/' && !divisionSites.has(expression)) divisionSites.set(expression, divisionSites.size);
      if (expression.operator === '+') collectAdditiveOperand(expression.right);
    }
    if (expression.type === 'AssignmentStatement' && expression.operator === '+=') collectAdditiveOperand(expression.right);
    for (const [key, value] of Object.entries(node)) {
      if (key === 'loc') continue;
      if (Array.isArray(value)) value.forEach(collectArithmeticSites);
      else collectArithmeticSites(value);
    }
  }
  collectArithmeticSites(ast);
  for (const info of ctx.funcInfos.values()) {
    collectArithmeticSites(info.body);
    collectArithmeticSites(info.paramDefaults);
  }
  const needsAdditiveContexts = ctx.pineVersion >= 5 && additionSites.size > 0;
  const arithmeticTypes = needsAdditiveContexts || (ctx.pineVersion >= 4 && !versionRules.constIntDivisionCanReturnFractional)
    ? checkProgram(ast, { libraries, recordCallTypeContexts: needsAdditiveContexts, recordTupleInitializerCallTypeContexts: false }) : undefined;
  const expressionTypes = arithmeticTypes?.expressionTypes;
  const resolvedUserMethods = new WeakMap<CallExpression, FunctionDeclaration | null>();
  let methodTypes: ReturnType<typeof checkProgram> | undefined;
  if (ctx.localMethodOverloads.size > 0 || requestedContexts?.ids) {
    recordedExpressionTypes ??= new WeakMap();
    methodTypes = checkProgram(ast, { expressionTypes: recordedExpressionTypes, loopResultTypes, resolvedUserMethods, libraries });
    if (requestedContexts?.callTypes) methodTypes.callTypeContexts = requestedContexts.callTypes;

  }
  const udtArrayExpressions = inferUdtArrayExpressions(ast, ctx.typeDecls, resolvedUserMethods);
  let needsDrawingBetween = false;
  const cachedLineReads = new Map<CallExpression, { cache: string; index: Identifier }>();
  const builtinCallCounts = new Map<string, number>();
  const functionCallPresence = new WeakMap<FuncInfo, boolean>();
  const runtimeErrorLocStack: SourceLocation[] = [];
  const collectionVars = inferCollectionVars(ast);
  const collectionHistoryVars = inferCollectionHistoryVars(ast, collectionVars);
  const functionEmitContext = inferFunctionEmitContext(
    ast,
    ctx.funcInfos,
    ctx.importedFunctions,
    ctx.userFunctionOverloads,
    ctx.importedMethods,
    ctx.localMethodOverloads,
    ctx.importedMethodOverloads,
    ctx.importedFunctionOwners,
    ctx.importedLocalFunctions,
    ctx.importedDependencyScopes,
  );
  function isConstIntPair(left?: SemanticType, right?: SemanticType): boolean {
    return left?.kind === 'int' && right?.kind === 'int'
      && left.qualifier === 'const' && right.qualifier === 'const';
  }

  function arithmeticContextDescriptor(context?: SemanticExpressionTypeContext): unknown {
    if (!context) return null;
    return {
      additions: Object.fromEntries([...additionSites].map(([site, id]) => [
        id, additiveAssociationMode(context.expressionTypes.get(site)),
      ])),
      divisions: Object.fromEntries([...divisionSites].map(([site, id]) => [
        id, isConstIntPair(context.expressionTypes.get(site.left), context.expressionTypes.get(site.right)),
      ])),
      calls: Object.fromEntries([...functionEmitContext.callSites].flatMap(([call, id]) => {
        const child = context.callTypeContexts.get(call);
        return child ? [[id, arithmeticContextDescriptor(child)]] : [];
      })),
    };
  }
  function methodContextDescriptor(context?: SemanticExpressionTypeContext): unknown {
    if (!context) return null;
    const selected = context.resolvedUserMethod;
    const method = selected && [...ctx.funcInfos].find(([, info]) => info.body === selected.body)?.[0];
    const callable = requestedContexts && (context.resolvedUserMethod ?? context.resolvedUserFunction);
    const callableName = callable && [...ctx.funcInfos].find(([, info]) => info.body === callable.body)?.[0];
    return {
      method,
      ...(requestedContexts?.ids ? { callable: callableName, requests: Object.fromEntries(ctx.securitySites.flatMap(site => {
        const id = requestedContexts.ids.get(context)?.get(site.node);
        return id === undefined ? [] : [[site.id, id]];
      })) } : {}),
      calls: Object.fromEntries([...functionEmitContext.callSites].flatMap(([call, id]) => {
        const child = context.callTypeContexts.get(call);
        return child ? [[id, methodContextDescriptor(child)]] : [];
      })),
    };
  }
  const rootRegularVars = inferRootRegularVars(ast);
  const rootPersistentVars = inferRootPersistentVars(ast);
  const rootDeclaredNames = new Set<string>();
  for (const statement of ast.body) {
    const declarations = statement.type === 'MultiDeclaration' ? statement.declarations : statement.type === 'VariableDeclaration' ? [statement] : [];
    for (const declaration of declarations) {
      if (declaration.names.type === 'VariableDeclarator') rootDeclaredNames.add(declaration.names.name.name);
      else for (const name of declaration.names.names) if (name.name !== '_') rootDeclaredNames.add(name.name);
    }
  }
  const rootSourceAliases = inferRootSourceAliases(ast);
  const fieldHistory = inferFieldHistory(ast);
  // A series-length lag call owns one source history across all offsets.
  const momentumSourceHistory = new Map<TACallSite, string>();
  for (const site of ctx.taCallSites) {
    if (['Mom', 'ROC', 'Change'].includes(site.className) && site.dynamicCtorArgExprs) {
      momentumSourceHistory.set(site, `_mom_source_${site.memberName}`);
    }
  }
  const hasDynamicLagCalls = [...momentumSourceHistory.keys()].some((site) => site.className !== 'Mom');
  const expressionHistory = new Map<IndexExpression, string>();
  const collectExpressionHistory = (value: unknown): void => {
    if (!value || typeof value !== 'object') return;
    const node = value as { type?: string; object?: Expression };
    if (node.type === 'IndexExpression' && node.object) {
      const object = node.object;
      const isKnownHistory = object.type === 'Identifier'
        || (object.type === 'CallExpression' && ctx.taCallSiteMap.has(object))
        || (object.type === 'MemberExpression' && (
          getMemberChainName(object)?.startsWith('strategy.')
          || ctx.taVarSiteMap.has(object)
          || (object.object.type === 'Identifier' && fieldHistory.get(object.object.name)?.has(object.property.name))
        ));
      if (!isKnownHistory && !getCollectionExprKind(object)) {
        expressionHistory.set(value as IndexExpression, `_expr_history_${expressionHistory.size}`);
      }
    }
    for (const key of Object.keys(value)) {
      if (key === 'loc') continue;
      const child = (value as Record<string, unknown>)[key];
      if (Array.isArray(child)) {
        for (const item of child) collectExpressionHistory(item);
      } else {
        collectExpressionHistory(child);
      }
    }
  };
  collectExpressionHistory(ast);
  const nodeMembership = new WeakMap<object, WeakSet<object>>();
  const containsNode = (root: unknown, target: object): boolean => {
    if (!root || typeof root !== 'object') return false;
    let nodes = nodeMembership.get(root);
    if (!nodes) {
      nodes = indexNodes(root);
      nodeMembership.set(root, nodes);
    }
    return nodes.has(target);
  };
  const expressionHistoryFunctions = new Set<string>();
  for (const [name, info] of ctx.funcInfos) {
    if ([...expressionHistory.keys(), ...momentumSourceHistory.keys()].some((expression) => containsNode(info.body, "node" in expression ? expression.node : expression))) {
      expressionHistoryFunctions.add(name);
    }
  }
  const onceStateMembers = new Set<string>();
  const taSiteFunctionNames = new Map<TACallSite, string>();
  for (const [name, fi] of ctx.funcInfos) {
    for (const site of ctx.taCallSites) {
      if (containsNode(fi.body, site.node)
        || (!ctx.importedFunctionOwners.has(name) && fi.paramDefaults.some((value) => value && containsNode(value, site.node)))) {
        taSiteFunctionNames.set(site, name);
      }
    }
  }
  const localEvaluationNodes = indexLocalEvaluationNodes(ast);
  const localTASites = new Set(ctx.taCallSites.filter((site) => taSiteFunctionNames.has(site) || localEvaluationNodes.has(site.node)));
  const dynamicWindowClasses = new Set(['Highest', 'Lowest', 'HighestBars', 'LowestBars', 'LinReg', 'Range', 'Median', 'Mode', 'PivotHigh', 'PivotLow', 'Dev', 'WMA']);
  const sharedHistoryClasses = new Set(['ALMA', 'BB', 'BBW', 'CCI', 'CMO', 'COG', 'Correlation']);
  const sharedHistorySites = new Set(ctx.taCallSites.filter((site) => {
    const length = site.dynamicCtorArgExprs?.[0];
    const qualifier = length && expressionType(length)?.qualifier;
    return length && sharedHistoryClasses.has(site.className) && qualifier !== 'const' && qualifier !== 'input' && qualifier !== 'simple';
  }));
  const percentRankHistorySites = new Set(ctx.taCallSites.filter((site) => {
    const length = site.dynamicCtorArgExprs?.[0];
    const qualifier = length && expressionType(length)?.qualifier;
    return length && site.className === 'PercentRank' && qualifier !== 'const' && qualifier !== 'input' && qualifier !== 'simple';
  }));
  const taSourceSeries = new Map<TACallSite, string>();
  const inlineTASourceSeries = new Set<TACallSite>();
  const sourceSeriesSMASites = ctx.taCallSites.filter((site) => site.className === 'SMA'
    && !localTASites.has(site) && !taSiteFunctionNames.has(site));
  const fixedLengthSMASites = new Set(sourceSeriesSMASites.filter((site) => {
    const length = site.dynamicCtorArgExprs?.[0];
    const qualifier = length && expressionType(length)?.qualifier;
    return !length || qualifier === 'const' || qualifier === 'input' || qualifier === 'simple';
  }));
  for (const site of ctx.taCallSites) {
    if (site.dynamicCtorArgExprs && (dynamicWindowClasses.has(site.className) || sharedHistorySites.has(site) || percentRankHistorySites.has(site))) {
      taSourceSeries.set(site, `_ta_source_${site.memberName.replace(/^_ta_/, '')}`);
      inlineTASourceSeries.add(site);
    }
    if (site.className === 'SMA' && !localTASites.has(site) && !taSiteFunctionNames.has(site) && site.computeArgExprs[0]?.type !== 'Identifier') {
      taSourceSeries.set(site, `_ta_source_${site.memberName.replace(/^_ta_/, '')}`);
      const references = collectIdentifierReferences(site.computeArgExprs[0]);
      if ([...references].some((name) => rootRegularVars.has(name) || ctx.seriesVars.has(name))) {
        inlineTASourceSeries.add(site);
      }
    }
  }

  const hasSharedHistoryCalls = [...taSourceSeries.keys()].some((site) => sharedHistoryClasses.has(site.className));
  const taHistoryEntryField = hasSharedHistoryCalls ? ', entry.historyBar' : '';
  const taHistoryBinding = hasSharedHistoryCalls ? ', historyBar' : '';

  const lines: string[] = [];
  const udtFactories = new Map<string, { member: string; names: string[]; varip: string[] }>();
  const indent = (n: number) => '  '.repeat(n);
  let fixnanIndex = 0;
  let indexedTAResultIndex = 0;
  let loopId = 0;
  const localNameStack: Map<string, string>[] = [];
  const nonnegativeIntegerLoopCounters = new Set<string>();
  const pendingRootShadows = new WeakMap<Map<string, string>, Set<string>>();
  let rootShadowIndex = 0;
  const localSourceNameStack: Map<string, string>[] = [];
  const localHistoryNameStack: Map<string, string>[] = [];
  const persistentLocalStack: Map<string, string>[] = [];
  const rootBlockPersistentLocals = new WeakMap<VariableDeclaration, { value: string; init: string; kind: 'var' | 'varip' }>();
  const rootBlockPersistentStates: { value: string; init: string; kind: 'var' | 'varip' }[] = [];
  const rootBlockPersistentInitByValue = new Map<string, string>();
  const functionNameStack: string[] = [];
  const functionStateNameStack: string[] = [];
  const defaultArgumentStateStack: string[] = [];
  type EnumRelatedType = string | (EnumRelatedType | undefined)[];
  const globalEnumValueTypes = new Map<string, EnumRelatedType>();
  const localEnumValueTypes = new WeakMap<Map<string, string>, Map<string, EnumRelatedType>>();
  const enumTypeNames = new Set([...ctx.enumValues.keys(), ...ctx.importedEnumValues.keys()].map((name) => name.slice(0, name.lastIndexOf('.'))));
  const enumArrayScalarMembers = new Set(['first', 'last', 'pop', 'shift', 'remove']);
  const enumArrayCollectionMembers = new Set(['copy', 'slice', 'concat']);
  const enumRequestSites = new Map(ctx.securitySites.filter((site) => site.kind !== 'seed').map((site) => [site.node, site]));
  const enumTitlesByValue = Object.fromEntries([
    ...[...ctx.enumValues].map(([name, value]) => [value, ctx.enumTitles.get(name)]),
    ...[...ctx.importedEnumValues].map(([name, value]) => [value, ctx.importedEnumTitles.get(name)]),
  ]);

  function enumVariableScope(name: string): Map<string, string> | undefined {
    for (const scopes of [localNameStack, persistentLocalStack]) {
      for (let i = scopes.length - 1; i >= 0; i--) {
        if (scopes[i].has(name)) return scopes[i];
      }
    }
    return undefined;
  }

  function enumRelatedTypeName(name?: string, importedAlias?: string): string | undefined {
    const qualifiedType = importedAlias && name ? `${importedAlias}.${name}` : undefined;
    return qualifiedType && (enumTypeNames.has(qualifiedType) || ctx.typeDecls.has(qualifiedType)) ? qualifiedType : name;
  }

  function enumRelatedAnnotationType(annotation?: TypeAnnotation | null, importedAlias?: string): string | undefined {
    if (annotation?.baseType === 'udt') return enumRelatedTypeName(annotation.name, importedAlias);
    if (annotation?.baseType === 'array' || annotation?.baseType === 'matrix') return `${annotation.baseType}<${enumRelatedTypeName(annotation.elementType, importedAlias)}>`;
    if (annotation?.baseType === 'map') return `map<${enumRelatedTypeName(annotation.keyType, importedAlias)},${enumRelatedTypeName(annotation.valueType, importedAlias)}>`;
    return undefined;
  }

  function enumRelatedBlockValueType(body: Statement[], bindings: Map<string, EnumRelatedType> | undefined, activeFunctions: Set<string>): EnumRelatedType | undefined {
    const locals = new Map(bindings);
    const functionName = [...activeFunctions].at(-1);
    const importedAlias = functionName ? ctx.importedFunctionOwners.get(functionName) : currentImportedAlias();
    for (const statement of body) {
      const declarations = statement.type === 'VariableDeclaration' ? [statement] : statement.type === 'MultiDeclaration' ? statement.declarations : [];
      for (const declaration of declarations) {
        if (declaration.names.type === 'VariableDeclarator') {
          locals.set(declaration.names.name.name, enumRelatedAnnotationType(declaration.typeAnnotation, importedAlias) ?? enumRelatedValueType(declaration.init, locals, activeFunctions) ?? '');
        } else {
          const types = enumRelatedValueType(declaration.init, locals, activeFunctions);
          declaration.names.names.forEach((variable, index) => locals.set(variable.name, Array.isArray(types) ? types[index] ?? '' : ''));
        }
      }
    }
    const tail = body.at(-1);
    if (tail?.type === 'VariableDeclaration' && tail.names.type === 'VariableDeclarator') return locals.get(tail.names.name.name) || undefined;
    if (tail?.type === 'IfStatement' || tail?.type === 'WhileStatement' || tail?.type === 'ForStatement') return enumRelatedValueType(tail, locals, activeFunctions);
    return tail?.type === 'ExpressionStatement' ? enumRelatedValueType(tail.expression, locals, activeFunctions) : undefined;
  }

  function commonEnumRelatedType(types: Array<EnumRelatedType | undefined>): EnumRelatedType | undefined {
    return types[0] && types.every((type) => JSON.stringify(type) === JSON.stringify(types[0])) ? types[0] : undefined;
  }

  function importedArrayGetUsesBuiltinIndex(expr: CallExpression, overloads: readonly { internalName: string }[]): boolean {
    if (expr.callee.type !== 'MemberExpression' || expr.callee.property.name !== 'get' || overloads.length === 0) return false;
    const index = orderedArgExpression(expr.arguments, ['index'], 'index', 0);
    return !!index && expressionKind(index) === 'int' && expressionType(expr.callee.object)?.kind === 'array'
      && overloads.every((overload) => {
        const info = ctx.funcInfos.get(overload.internalName);
        return info?.params.length === 2 && info.paramTypes[0]?.baseType === 'array' && info.paramTypes[1]?.baseType === 'string';
      });
  }

  function enumRelatedValueType(expr: Expression | IfStatement, bindings?: Map<string, EnumRelatedType>, activeFunctions = new Set<string>()): EnumRelatedType | undefined {
    if (expr.type === 'WhileStatement' || expr.type === 'ForStatement') {
      const locals = new Map(bindings);
      if (expr.type === 'ForStatement') {
        if (expr.kind === 'numeric') locals.set(expr.counter.name, '');
        else {
          const iterableType = enumRelatedValueType(expr.iterable, bindings, activeFunctions);
          if (typeof iterableType !== 'string') return undefined;
          if (iterableType.startsWith('array<')) {
            locals.set(expr.counter.name, iterableType.slice(6, -1));
            if (expr.indexCounter) locals.set(expr.indexCounter.name, '');
          } else if (iterableType.startsWith('matrix<')) {
            locals.set(expr.counter.name, `array<${iterableType.slice(7, -1)}>`);
            if (expr.indexCounter) locals.set(expr.indexCounter.name, '');
          } else if (iterableType.startsWith('map<')) {
            const separator = iterableType.indexOf(',');
            locals.set(expr.counter.name, iterableType.slice(separator + 1, -1));
            if (expr.indexCounter) locals.set(expr.indexCounter.name, iterableType.slice(4, separator));
          } else return undefined;
        }
      }
      return enumRelatedBlockValueType(expr.body, locals, activeFunctions);
    }
    if (expr.type === 'IfStatement') {
      const consequent = enumRelatedBlockValueType(expr.consequent, bindings, activeFunctions);
      if (!expr.alternate) return consequent;
      const alternate = Array.isArray(expr.alternate)
        ? enumRelatedBlockValueType(expr.alternate, bindings, activeFunctions)
        : expr.alternate ? enumRelatedValueType(expr.alternate, bindings, activeFunctions) : undefined;
      return commonEnumRelatedType([consequent, alternate]);
    }
    if (expr.type === 'SwitchExpression') {
      return commonEnumRelatedType(expr.cases.map((entry) => Array.isArray(entry.consequent)
        ? enumRelatedBlockValueType(entry.consequent, bindings, activeFunctions)
        : enumRelatedValueType(entry.consequent, bindings, activeFunctions)));
    }
    if (expr.type === 'Identifier') {
      if (bindings?.has(expr.name)) return bindings.get(expr.name) || undefined;
      const scope = enumVariableScope(expr.name);
      return scope ? localEnumValueTypes.get(scope)?.get(expr.name) : globalEnumValueTypes.get(expr.name);
    }
    if (expr.type === 'MemberExpression') {
      const rawName = getMemberChainName(expr);
      const name = rawName ? enumMemberName(rawName, [...activeFunctions].at(-1), bindings) : undefined;
      if (name && (ctx.enumValues.has(name) || ctx.importedEnumValues.has(name))) return name.slice(0, name.lastIndexOf('.'));
      const typeName = enumRelatedValueType(expr.object, bindings, activeFunctions);
      const typeInfo = typeof typeName === 'string' ? ctx.typeDecls.get(typeName) : undefined;
      const field = typeInfo?.node.fields.find((field) => field.name.name === expr.property.name);
      const importedAlias = typeInfo?.name.includes('.') ? typeInfo.name.slice(0, typeInfo.name.lastIndexOf('.')) : undefined;
      return enumRelatedAnnotationType(field?.typeAnnotation, importedAlias);
    }
    if (expr.type === 'ConditionalExpression') {
      const consequent = enumRelatedValueType(expr.consequent, bindings, activeFunctions);
      const alternate = enumRelatedValueType(expr.alternate, bindings, activeFunctions);
      if (expr.alternate.type === 'NaExpression') return consequent;
      if (expr.consequent.type === 'NaExpression') return alternate;
      return JSON.stringify(consequent) === JSON.stringify(alternate) ? consequent : undefined;
    }
    if (expr.type === 'ArrayExpression') return expr.elements.map((element) => enumRelatedValueType(element, bindings, activeFunctions));
    if (expr.type === 'IndexExpression') return enumRelatedValueType(expr.object, bindings, activeFunctions);
    if (expr.type !== 'CallExpression') return undefined;
    const name = getMemberChainName(expr.callee);
    const requestSite = enumRequestSites.get(expr);
    if (requestSite) {
      const type = enumRelatedValueType(requestSite.expressionExpr, bindings, activeFunctions);
      if (requestSite.kind === 'security') return type;
      const arrayType = (member: EnumRelatedType | undefined) => typeof member === 'string' ? `array<${member}>` : undefined;
      return Array.isArray(type) ? type.map(arrayType) : arrayType(type);
    }
    if (name === 'input.enum') {
      const defval = orderedArgExpression(expr.arguments, ['defval'], 'defval', 0);
      return defval ? enumRelatedValueType(defval, bindings, activeFunctions) : undefined;
    }
    if (name === 'array.new' || name === 'matrix.new' || name === 'map.new') {
      const functionName = [...activeFunctions].at(-1);
      const importedAlias = functionName ? ctx.importedFunctionOwners.get(functionName) : currentImportedAlias();
      if (name === 'map.new') return expr.typeArguments?.[1] ? `map<${enumRelatedTypeName(expr.typeArguments[0], importedAlias)},${enumRelatedTypeName(expr.typeArguments[1], importedAlias)}>` : undefined;
      return expr.typeArguments?.[0] ? `${name.slice(0, -4)}<${enumRelatedTypeName(expr.typeArguments[0], importedAlias)}>` : undefined;
    }
    if (name === 'array.from') {
      const types = expr.arguments.map((arg) => enumRelatedValueType(arg.value, bindings, activeFunctions));
      return typeof types[0] === 'string' && types.every((type) => type === types[0]) ? `array<${types[0]}>` : undefined;
    }
    const selectedMethod = resolvedUserMethods.get(expr);
    const selectedFunction = ctx.resolvedUserFunctionCalls.get(expr);
    const callables = (selectedFunction ? [selectedFunction] : functionEmitContext.callSiteFunctions.get(expr) ?? (name && ctx.funcInfos.has(name) ? [name] : [])).filter((functionName) => {
      if (expr.callee.type !== 'MemberExpression') return true;
      const importedMethods = ctx.importedMethodOverloads.get(expr.callee.property.name) ?? [];
      if (!importedMethods.some((method) => method.internalName === functionName)) return true;
      if (isStaticNamespaceReceiver(expr.callee.object) || importedArrayGetUsesBuiltinIndex(expr, importedMethods)) return false;
      return !validateUserFunctionCall(functionName, expr, 1, true);
    });
    const extraction = name === 'map.keys' || name === 'map.values'
      ? name.slice(4)
      : expr.callee.type === 'MemberExpression' ? expr.callee.property.name : undefined;
    const extractionReceiver = name === 'map.keys' || name === 'map.values'
      ? orderedArgExpression(expr.arguments, ['id'], 'id', 0)
      : expr.callee.type === 'MemberExpression' ? expr.callee.object : undefined;
    if ((extraction === 'keys' || extraction === 'values') && extractionReceiver && !selectedMethod && (selectedMethod === null || callables.length === 0)) {
      const type = enumRelatedValueType(extractionReceiver, bindings, activeFunctions);
      if (typeof type === 'string' && type.startsWith('map<')) {
        const separator = type.indexOf(',');
        const elementType = extraction === 'keys' ? type.slice(4, separator) : type.slice(separator + 1, -1);
        return `array<${elementType}>`;
      }
    }
    const mapValueMember = name?.startsWith('map.') ? name.slice(4) : expr.callee.type === 'MemberExpression' ? expr.callee.property.name : undefined;
    if ((mapValueMember === 'put' || mapValueMember === 'remove') && !selectedMethod && (selectedMethod === null || callables.length === 0)) {
      const mapValueParameters = mapValueMember === 'put' ? ['id', 'key', 'value'] : ['id', 'key'];
      const mapReceiver = name === `map.${mapValueMember}` ? orderedArgExpression(expr.arguments, mapValueParameters, 'id', 0) : expr.callee.type === 'MemberExpression' ? expr.callee.object : undefined;
      const type = mapReceiver ? enumRelatedValueType(mapReceiver, bindings, activeFunctions) : undefined;
      if (typeof type === 'string' && type.startsWith('map<')) return type.slice(type.indexOf(',') + 1, -1);
    }
    const getParameters = name === 'array.get' ? ['id', 'index'] : name === 'matrix.get' ? ['id', 'row', 'column'] : name === 'map.get' ? ['id', 'key'] : undefined;
    const receiver = getParameters
      ? orderedArgExpression(expr.arguments, getParameters, 'id', 0)
      : expr.callee.type === 'MemberExpression' && expr.callee.property.name === 'get' ? expr.callee.object : undefined;
    if (receiver && !selectedMethod && (selectedMethod === null || callables.length === 0)) {
      const type = enumRelatedValueType(receiver, bindings, activeFunctions);
      if (typeof type === 'string' && (type.startsWith('array<') || type.startsWith('matrix<'))) return type.slice(type.indexOf('<') + 1, -1);
      if (typeof type === 'string' && type.startsWith('map<')) return type.slice(type.indexOf(',') + 1, -1);
    }
    const matrixAxisMember = name?.startsWith('matrix.') ? name.slice(7) : expr.callee.type === 'MemberExpression' ? expr.callee.property.name : undefined;
    if ((matrixAxisMember === 'row' || matrixAxisMember === 'col' || matrixAxisMember === 'remove_row' || matrixAxisMember === 'remove_col') && !selectedMethod && (selectedMethod === null || callables.length === 0)) {
      const matrixReceiver = name === `matrix.${matrixAxisMember}` ? orderedArgExpression(expr.arguments, ['id'], 'id', 0) : expr.callee.type === 'MemberExpression' ? expr.callee.object : undefined;
      const type = matrixReceiver ? enumRelatedValueType(matrixReceiver, bindings, activeFunctions) : undefined;
      if (typeof type === 'string' && type.startsWith('matrix<')) return `array<${type.slice(7, -1)}>`;
    }
    const collectionPreservingReceiver = name === 'matrix.copy' || name === 'map.copy' || name === 'matrix.submatrix' || name === 'matrix.transpose'
      ? orderedArgExpression(expr.arguments, ['id'], 'id', 0)
      : expr.callee.type === 'MemberExpression' && ['copy', 'submatrix', 'transpose'].includes(expr.callee.property.name) ? expr.callee.object : undefined;
    if (collectionPreservingReceiver && !selectedMethod && (selectedMethod === null || callables.length === 0)) {
      const type = enumRelatedValueType(collectionPreservingReceiver, bindings, activeFunctions);
      if (typeof type === 'string' && (type.startsWith('matrix<') || type.startsWith('map<') || ctx.typeDecls.has(type))) return type;
    }
    const arrayReturnMember = name?.startsWith('array.') ? name.slice(6) : expr.callee.type === 'MemberExpression' ? expr.callee.property.name : undefined;
    if (arrayReturnMember && (enumArrayScalarMembers.has(arrayReturnMember) || enumArrayCollectionMembers.has(arrayReturnMember)) && !selectedMethod && (selectedMethod === null || callables.length === 0)) {
      const arrayReturnParameters = arrayReturnMember === 'concat' ? ['id1', 'id2'] : ['id'];
      const arrayReceiver = name === `array.${arrayReturnMember}` ? orderedArgExpression(expr.arguments, arrayReturnParameters, arrayReturnParameters[0]!, 0) : expr.callee.type === 'MemberExpression' ? expr.callee.object : undefined;
      const type = arrayReceiver ? enumRelatedValueType(arrayReceiver, bindings, activeFunctions) : undefined;
      if (typeof type === 'string' && type.startsWith('array<')) return enumArrayCollectionMembers.has(arrayReturnMember) ? type : type.slice(6, -1);
    }
    if (name?.endsWith('.copy') && !selectedMethod && (selectedMethod === null || callables.length === 0)) {
      const functionName = [...activeFunctions].at(-1);
      const alias = functionName ? ctx.importedFunctionOwners.get(functionName) : currentImportedAlias();
      const typeName = enumRelatedTypeName(name.slice(0, -5), alias);
      if (typeName && ctx.typeDecls.has(typeName)) return typeName;
    }
    if (name?.endsWith('.new')) {
      const typeName = name.slice(0, -4);
      const functionName = [...activeFunctions].at(-1);
      const alias = functionName ? ctx.importedFunctionOwners.get(functionName) : currentImportedAlias();
      const qualifiedType = alias ? ctx.importedLocalTypes.get(`${alias}.${typeName}`) : undefined;
      if (qualifiedType && ctx.typeDecls.has(qualifiedType)) return qualifiedType;
      if (ctx.typeDecls.has(typeName)) return typeName;
    }
    const functionNames = selectedMethod
      ? callables.filter((name) => ctx.funcInfos.get(name)?.body === selectedMethod.body)
      : callables;
    const returnTypes = functionNames.map((functionName) => {
      const info = ctx.funcInfos.get(functionName);
      if (!info || activeFunctions.has(functionName)) return undefined;
      const nestedActive = new Set([...activeFunctions, functionName]);
      const importedAlias = ctx.importedFunctionOwners.get(functionName);
      const locals = new Map<string, EnumRelatedType>(info.params.map((param, index) => {
        const annotation = info.paramTypeAnnotations[index];
        const argument = orderedArgExpression(expr.arguments, info.params, param, index) ?? info.paramDefaults[index];
        const inherited = !annotation && expr.callee.type === 'Identifier' && argument ? enumRelatedValueType(argument, bindings, activeFunctions) : undefined;
        return [param, enumRelatedAnnotationType(annotation, importedAlias) ?? inherited ?? ''];
      }));
      if (!Array.isArray(info.body)) return enumRelatedValueType(info.body, locals, nestedActive);
      return enumRelatedBlockValueType(info.body, locals, nestedActive);
    });
    return commonEnumRelatedType(returnTypes);
  }

  function isEnumValue(expr: Expression | IfStatement): boolean {
    const type = enumRelatedValueType(expr);
    return typeof type === 'string' && enumTypeNames.has(type);
  }

  function registerEnumVariable(stmt: VariableDeclaration): void {
    const type = enumRelatedAnnotationType(stmt.typeAnnotation, currentImportedAlias()) ?? enumRelatedValueType(stmt.init);
    const variables = stmt.names.type === 'VariableDeclarator' ? [stmt.names.name] : stmt.names.names;
    variables.forEach((variable, index) => {
      const valueType = stmt.names.type === 'VariableDeclarator' ? type : Array.isArray(type) ? type[index] : undefined;
      const scope = enumVariableScope(variable.name);
      const vars = scope ? (localEnumValueTypes.get(scope) ?? new Map<string, EnumRelatedType>()) : globalEnumValueTypes;
      if (scope) localEnumValueTypes.set(scope, vars);
      if (valueType) vars.set(variable.name, valueType);
      else vars.delete(variable.name);
    });
  }

  for (const stmt of ast.body) {
    if (stmt.type === 'VariableDeclaration') registerEnumVariable(stmt);
    else if (stmt.type === 'MultiDeclaration') stmt.declarations.forEach(registerEnumVariable);
  }

  function currentFunctionStateName(): string {
    return defaultArgumentStateStack.at(-1) ?? functionStateNameStack[functionStateNameStack.length - 1] ?? '_state';
  }

  function sameImportedLibraryFunctionName(calleeName: string): string | undefined {
    const currentFunctionName = functionNameStack[functionNameStack.length - 1];
    const alias = currentFunctionName ? ctx.importedFunctionOwners.get(currentFunctionName) : undefined;
    return alias ? ctx.importedLocalFunctions.get(`${alias}.${calleeName}`) : undefined;
  }

  function importedMemberName(name: string): string {
    return resolveDependencyMember(name, functionNameStack[functionNameStack.length - 1], ctx.importedDependencyScopes);
  }

  function currentImportedAlias(): string | undefined {
    const currentFunctionName = functionNameStack[functionNameStack.length - 1];
    return (currentFunctionName ? ctx.importedFunctionOwners.get(currentFunctionName) : undefined) ?? ctx.importedAliasContext;
  }

  function enumMemberName(name: string, functionName?: string, bindings?: Map<string, EnumRelatedType>): string | undefined {
    const root = name.split('.')[0]!;
    if (bindings?.has(root) || (!functionName && (currentLocalName(root) || currentPersistentLocalName(root)))) return undefined;
    const alias = functionName ? ctx.importedFunctionOwners.get(functionName) : currentImportedAlias();
    const qualified = alias ? `${alias}.${name}` : undefined;
    return qualified && ctx.importedEnumValues.has(qualified) ? qualified : importedMemberName(name);
  }

  function sameImportedLibraryTypeName(typeName: string): string | undefined {
    const alias = currentImportedAlias();
    return alias ? ctx.importedLocalTypes.get(`${alias}.${typeName}`) : undefined;
  }

  function sameImportedLibraryMethodOverloads(methodName: string): ImportedMethodOverloadInfo[] | undefined {
    const alias = currentImportedAlias();
    if (!alias) return undefined;
    const overloads = ctx.importedLocalMethods.get(`${alias}.${methodName}`);
    return overloads && overloads.length > 0 ? overloads : undefined;
  }

  function unknownImportedFunctionMessage(fullName: string): string {
    return `Unknown library function: ${fullName}`;
  }

  function unknownImportedMemberMessage(fullName: string): string {
    return `Unknown library member: ${fullName}`;
  }

  function resolveUserFunctionCallName(functionName: string, expr: CallExpression): string | undefined {
    const resolved = ctx.resolvedUserFunctionCalls.get(expr);
    if (resolved) return resolved;
    const overloads = ctx.userFunctionOverloads.get(functionName);
    if (overloads && overloads.length > 0) {
      const compatible = overloads.filter((name) => !validateUserFunctionCall(name, expr, 0, false));
      return compatible.length === 1 ? compatible[0] : undefined;
    }
    if (ctx.funcInfos.has(functionName)) return functionName;

    const methodOverloads = ctx.localMethodOverloads.get(functionName) ?? [];
    const compatibleMethods = methodOverloads.filter((overload) => !validateUserFunctionCall(overload.internalName, expr, 0, true));
    return compatibleMethods.length === 1 ? compatibleMethods[0]!.internalName : undefined;
  }

  function emitRequestedCallableCall(name: string, expr: CallExpression): string | undefined {
    if (!requestedContexts) return undefined;
    if (functionNameStack.length === 0) {
      const context = requestedContexts.callTypes.get(expr);
      const declaration = context?.resolvedUserMethod ?? context?.resolvedUserFunction;
      const selected = declaration && [...ctx.funcInfos].find(([, info]) => info.body === declaration.body)?.[0];
      return selected ? emitUserFunctionCall(selected, expr) : undefined;
    }
    const candidates = [...new Set([
      ...(ctx.localMethodOverloads.get(name) ?? []).map(overload => overload.internalName),
      ...(ctx.userFunctionOverloads.get(name) ?? []),
      ...(ctx.funcInfos.has(name) ? [name] : []),
    ])].filter(candidate => !validateUserFunctionCall(candidate, expr, 0, false));
    if (candidates.length < 2) return undefined;
    const id = functionEmitContext.callSites.get(expr);
    const branches = candidates.map(candidate =>
      `if (_methodContext?.calls[${id}]?.callable === ${JSON.stringify(candidate)}) return ${emitUserFunctionCall(candidate, expr)};`);
    const fallback = emitFunctionSyntaxMethodCall(name, expr);
    const regular = fallback ? undefined : resolveUserFunctionCallName(name, expr);
    const call = fallback ?? (regular ? emitUserFunctionCall(regular, expr) : runtimeErrorExpr(`No requested callable matched ${name}`));
    return `(() => { ${branches.join(' ')} return ${call}; })()`;
  }

  function emitFunctionSyntaxMethodCall(name: string, expr: CallExpression): string | undefined {
    const methods = (ctx.localMethodOverloads.get(name) ?? [])
      .filter(overload => !validateUserFunctionCall(overload.internalName, expr, 0, true));
    if (methods.length === 0) return undefined;

    // Evaluate provided arguments once, including when the regular function is
    // the fallback. Dispatching on the first argument must not repeat side effects.
    const argumentValues = new Map<Expression, string>();
    const callSiteId = functionEmitContext.callSites.get(expr) ?? 'x';
    const setup = expr.arguments.map((arg, index) => {
      const temporary = `_function_method_arg_${callSiteId}_${index}`;
      argumentValues.set(arg.value, temporary);
      return `const ${temporary} = ${emitExpr(arg.value)};`;
    }).join(' ');
    const branches = methods.flatMap(overload => {
      const params = ctx.funcInfos.get(overload.internalName)!.params;
      const receiver = orderedArgExpression(expr.arguments, params, params[0], 0);
      const value = receiver && argumentValues.get(receiver);
      if (!value) return [];
      const condition = localReceiverCondition(value, overload.receiverType);
      const call = emitUserFunctionCall(overload.internalName, expr, undefined, argumentValues);
      return [`if (${condition}) return ${call};`];
    });
    const regularFunction = ctx.funcInfos.has(name) || ctx.userFunctionOverloads.has(name)
      ? resolveUserFunctionCallName(name, expr)
      : undefined;
    const fallback = regularFunction
      ? emitUserFunctionCall(regularFunction, expr, undefined, argumentValues)
      : runtimeErrorExpr(`No method overload matched function call ${name}`);
    return `(() => { ${setup} ${branches.join(' ')} return ${fallback}; })()`;
  }

  function importedFunctionDisplayName(internalName: string): string | undefined {
    for (const [displayName, name] of ctx.importedFunctions) {
      if (name === internalName) return displayName;
    }
    return undefined;
  }

  function importedMethodDisplayName(internalName: string): string | undefined {
    for (const [methodName, name] of ctx.importedMethods) {
      if (name === internalName) return `${ctx.importedFunctionOwners.get(internalName)}.${methodName}`;
    }
    for (const [methodName, overloads] of ctx.importedMethodOverloads) {
      if (overloads.some((overload) => overload.internalName === internalName)) return `${ctx.importedFunctionOwners.get(internalName)}.${methodName}`;
    }
    return undefined;
  }

  function runtimeErrorExpr(message: string): string {
    return `ctx.runtimeError([${JSON.stringify(message)}])`;
  }

  function memberCallName(expr: CallExpression & { callee: MemberExpression }): string {
    const receiverName = getMemberChainName(expr.callee.object) ?? '?';
    return `${receiverName}.${expr.callee.property.name}`;
  }

  function callSiteLocalVars(callExpr: CallExpression): VarDeclInfo[] {
    const names = functionEmitContext.callSiteFunctions.get(callExpr) ?? [];
    const byName = new Map<string, VarDeclInfo>();
    for (const name of names) {
      for (const localVar of functionEmitContext.localVars.get(name) ?? []) {
        if (!byName.has(localVar.name)) byName.set(localVar.name, localVar);
      }
    }
    return [...byName.values()];
  }

  function callSiteHasTACalls(callExpr: CallExpression): boolean {
    const names = functionEmitContext.callSiteFunctions.get(callExpr) ?? [];
    return names.some((name) => ctx.funcInfos.get(name)?.hasTACalls === true);
  }

  function callSiteHasExpressionHistory(callExpr: CallExpression): boolean {
    const names = functionEmitContext.callSiteFunctions.get(callExpr) ?? [];
    return names.some((name) => expressionHistoryFunctions.has(name));
  }

  function callSiteNeedsState(callExpr: CallExpression): boolean {
    if (functionEmitContext.nestedCallSites.has(callExpr)) return false;
    const names = functionEmitContext.callSiteFunctions.get(callExpr) ?? [];
    return names.some((name) => functionNeedsState(name));
  }

  function callSiteHistoryParams(callExpr: CallExpression): string[] {
    if (functionEmitContext.nestedCallSites.has(callExpr)) return [];
    const names = functionEmitContext.callSiteFunctions.get(callExpr) ?? [];
    const params = new Set<string>();
    for (const name of names) {
      for (const param of functionEmitContext.paramHistory.get(name) ?? []) params.add(param);
    }
    return [...params];
  }

  function callSiteHistoryLocals(callExpr: CallExpression): string[] {
    if (functionEmitContext.nestedCallSites.has(callExpr)) return [];
    const names = functionEmitContext.callSiteFunctions.get(callExpr) ?? [];
    const locals = new Set<string>();
    for (const name of names) {
      for (const local of functionEmitContext.localHistory.get(name) ?? []) locals.add(local);
    }
    return [...locals];
  }

  function usesPineFloorModulo(): boolean {
    return ctx.pineVersion >= 5;
  }

  function emitModuloExpr(left: string, right: string): string {
    return usesPineFloorModulo() ? `_mod(${left}, ${right})` : `(${left} % ${right})`;
  }

  function emitDivisionExpr(left: string, right: string): string {
    return ctx.pineVersion === 5 ? `(${left} / _divisionDenominator(${right}))` : `(${left} / ${right})`;
  }

  function isUngroupedAdditiveExpression(expression: AssignmentStatement['right']): boolean {
    return expression.type === 'BinaryExpression' && !expression.parenthesized && ['+', '-'].includes(expression.operator);
  }

  function additiveAssociationMode(type?: SemanticType): number {
    if (type?.kind !== 'float') return -1;
    if (type.qualifier === 'const') return 0;
    return type.qualifier === 'series' ? 1 : -1;
  }

  function emitAssociatedAddition(current: string, expression: BinaryExpression): string {
    const operands = subtractionOperands.get(expression)!;
    const groupedLeft = `(${current} + ${operands.left})`;
    const left = expression.left.type === 'BinaryExpression' && expression.left.operator === '-'
      ? emitAddition(current, operands.left, expression.left, groupedLeft)
      : groupedLeft;
    return `(${left} - ${operands.right})`;
  }

  function emitAddition(current: string, rhs: string, expression: Expression | IfStatement, fallback: string): string {
    if (ctx.pineVersion < 5 || expression.type !== 'BinaryExpression' || expression.operator !== '-') return fallback;
    const grouped = `(${current} + ${rhs})`;
    const associated = emitAssociatedAddition(current, expression);
    if (functionNameStack.length > 0) {
      const mode = `_arithmeticContext?.additions[${additionSites.get(expression)}]`;
      return `(${mode} === 1 ? ${associated} : ${mode} === 0 ? ${grouped} : ${fallback})`;
    }
    const mode = additiveAssociationMode(expressionTypes?.get(expression));
    return mode === 1 ? associated : mode === 0 ? grouped : fallback;
  }

  function emitCompoundAssignmentExpr(current: string, operator: AssignmentStatement['operator'], rhs: string, expression: AssignmentStatement['right']): string {
    if (operator === '%=') return emitModuloExpr(current, rhs);
    if (operator === '/=') return emitDivisionExpr(current, rhs);
    if (operator === '+=' && expression.type === 'BinaryExpression' && expression.operator === '-' && !expression.parenthesized
      && !isUngroupedAdditiveExpression(expression.left) && !isUngroupedAdditiveExpression(expression.right)) {
      // Binary arithmetic emission wraps the whole RHS once; preserve each operand's grouping.
      return emitAddition(current, rhs, expression, `(${current} + ${rhs.slice(1, -1)})`);
    }
    const op = operator.charAt(0);
    const fallback = `(${current} ${op} ${rhs})`;
    return operator === '+=' ? emitAddition(current, rhs, expression, fallback) : fallback;
  }

  function emitAssignmentLine(pad: string, target: string, operator: AssignmentStatement['operator'], rhs: string, expression: AssignmentStatement['right']): void {
    if (operator === ':=') {
      lines.push(`${pad}${target} = ${rhs};`);
      return;
    }
    lines.push(`${pad}${target} = ${emitCompoundAssignmentExpr(target, operator, rhs, expression)};`);
  }

  function emitExpr(expr: Expression): string {
    if (ctx.discardedFootprintCalls?.has(expr)) return 'NaN';
    const value = emitExprValue(expr);
    return udtArrayExpressions.has(expr) ? `deps._arr.withUdtElementType(${value})` : value;
  }

  function emitExprValue(expr: Expression): string {
    const comparisonHelpers = ctx.pineVersion === 5
      ? { eq: '_eqLegacyNa', neq: '_neqLegacyNa', cmp: '_cmpLegacyNa' }
      : { eq: '_eq', neq: '_neq', cmp: '_cmp' };

    switch (expr.type) {
      case 'NumericLiteral':
        return String(expr.value);
      case 'StringLiteral':
        return JSON.stringify(expr.value);
      case 'BooleanLiteral':
        return expr.value ? 'true' : 'false';
      case 'ColorLiteral':
        return JSON.stringify(expr.value);
      case 'NaExpression':
        return 'NaN';
      case 'Identifier':
        {
          const taVarSite = ctx.taVarSiteMap.get(expr);
          if (taVarSite) return `this.${taVarSite.seriesName}.get(0)`;
        }
        return emitIdentifier(expr);
      case 'BinaryExpression': {
        const left = emitExpr(expr.left);
        const right = emitExpr(expr.right);
        if (expr.operator === '-') subtractionOperands.set(expr, { left, right });
        switch (expr.operator) {
          case '+':
            return emitAddition(left, right, expr.right, `(${left} + ${right})`);
          case 'and': {
            if (!versionRules.usesLazyLogicalOperators && expr.left.type === 'BinaryExpression' && expr.right.type === 'BinaryExpression'
              && expr.left.left.type === 'CallExpression' && expr.right.left.type === 'CallExpression') {
              const firstRead = cachedLineReads.get(expr.left.left);
              const secondRead = cachedLineReads.get(expr.right.left);
              const first = /^_cmpLegacyNa\((.+), (this\._s_(?:high|low)\.get\((?:0|_historyOffset\(\w+\))\)), "<="\)$/.exec(left);
              const second = /^_cmpLegacyNa\((.+), (this\._s_(?:high|low)\.get\((?:0|_historyOffset\(\w+\))\)), ">="\)$/.exec(right);
              if (firstRead && secondRead && firstRead.cache === secondRead.cache
                && firstRead.index.name === secondRead.index.name && first && second && first[1] === second[1]) {
                needsDrawingBetween = true;
                return `_betweenLegacyNa(${first[1]}, ${first[2]}, ${second[2]})`;
              }
            }
            return versionRules.usesLazyLogicalOperators
              ? `(_isTruthy(${left}) ? _isTruthy(${right}) : false)`
              : `_and(${left}, ${right})`;
          }
          case 'or':
            return versionRules.usesLazyLogicalOperators
              ? `(_isTruthy(${left}) ? true : _isTruthy(${right}))`
              : `_or(${left}, ${right})`;
          case '==':
            return `${comparisonHelpers.eq}(${left}, ${right})`;
          case '!=':
            return `${comparisonHelpers.neq}(${left}, ${right})`;
          case '>':
          case '<':
          case '>=':
          case '<=':
            return `${comparisonHelpers.cmp}(${left}, ${right}, "${expr.operator}")`;
          case '%':
            return emitModuloExpr(left, right);
          case '/': {
            if (ctx.pineVersion >= 6) {
              const numerator = extractStaticNumber(expr.left);
              const denominator = extractStaticNumber(expr.right);
              if (numerator !== null && denominator !== null) {
                const quotient = numerator / denominator;
                if (Number.isFinite(quotient) && quotient !== 0) return String(Number(quotient.toPrecision(16)));
              }
            }
            const leftType = expressionTypes?.get(expr.left);
            const rightType = expressionTypes?.get(expr.right);
            if (ctx.pineVersion >= 4 && !versionRules.constIntDivisionCanReturnFractional) {
              const divide = `this._deps.constIntDivide(${left}, ${right})`;
              if (functionNameStack.length > 0 && divisionSites.has(expr)) {
                return `(_arithmeticContext?.divisions[${divisionSites.get(expr)}] ? ${divide} : ${emitDivisionExpr(left, right)})`;

              }
              if (isConstIntPair(leftType, rightType)) return divide;
            }
            return emitDivisionExpr(left, right);
          }
          default:
            return `(${left} ${expr.operator} ${right})`;
        }
      }
      case 'UnaryExpression':
        if (expr.operator === 'not') return `(!_isTruthy(${emitExpr(expr.argument)}))`;
        return `(${expr.operator}${emitExpr(expr.argument)})`;
      case 'ConditionalExpression':
        return `(_isTruthy(${emitExpr(expr.test)}) ? ${emitExpr(expr.consequent)} : ${emitExpr(expr.alternate)})`;
      case 'SwitchExpression':
        return emitSwitchExpr(expr);
      case 'CallExpression':
        return emitCallExpr(expr);
      case 'MemberExpression':
        return emitMemberExpr(expr);
      case 'IndexExpression': {
        const history = emitIndexExpr(expr);
        if (versionRules.allowsBoolNaHelpers) return history;
        const kind = expressionKind(expr.object);
        if (kind === 'bool') return `_boolHistory(${history})`;
        if (kind === 'unknown' && expr.object.type === 'Identifier') {
          return `_boolHistory(${history}, typeof ${emitIdentifier(expr.object)} === "boolean")`;
        }
        return history;
      }
      case 'ArrayExpression':
        return `deps._arr.from(${expr.elements.map(emitExpr).join(', ')})`;
      case 'LambdaExpression':
        return `(${expr.params.map((p) => jsPineName(p.name)).join(', ')}) => ${emitExpr(expr.body)}`;
      case 'ForStatement':
      case 'WhileStatement':
        return 'NaN';
      default:
        return 'NaN';
    }
  }

  function emitIdentifier(id: Identifier): string {
    const name = id.name;
    const localName = currentLocalName(name);
    if (localName) return localName;
    const persistentLocalName = currentPersistentLocalName(name);
    if (persistentLocalName) return persistentLocalName;
    if (collectionHistoryVars.has(name)) {
      if (ctx.varDecls.some((v) => v.name === name)) return `this.${jsVarMember(name)}`;
      if (ctx.seriesVars.has(name)) return `this.${jsSeriesMember(name)}.get(0)`;
      if (rootRegularVars.has(name)) return `this.${jsGlobalMember(name)}`;
    }
    if (isUserDeclaredSeriesName(name)) return `this.${jsStateMember('_sv_', name)}.get(0)`;
    if (functionNameStack.length === 0 && rootRegularVars.has(name) && !rootPersistentVars.has(name)) {
      return `this.${jsStateMember('_g_', name)}`;
    }
    if (ctx.varDecls.some((v) => v.name === name)) return `this.${jsStateMember('_v_', name)}`;
    if (rootRegularVars.has(name)) return `this.${jsStateMember('_g_', name)}`;
    if (name === 'bar_index') return 'ctx.barIndex';
    if (name === 'last_bar_index') return 'ctx.lastBarIndex';
    if (name in BAR_FIELDS) return `this.${BAR_FIELDS[name]}.current()`;
    if (name === 'hl2') return '((ctx.bar.high + ctx.bar.low) / 2)';
    if (name === 'hlc3') return '((ctx.bar.high + ctx.bar.low + ctx.bar.close) / 3)';
    if (name === 'ohlc4') return '((ctx.bar.open + ctx.bar.high + ctx.bar.low + ctx.bar.close) / 4)';
    if (name === 'hlcc4') return '((ctx.bar.high + ctx.bar.low + ctx.bar.close + ctx.bar.close) / 4)';
    if (RUNTIME_TIME_VALUES.has(name)) return `ctx.runtimeTimeValue("${name}")`;
    if (CALENDAR_PARTS.has(name)) return `ctx.calendarPart("${name}", [], {})`;
    if (name === 'na') return 'NaN';
    if (name === 'true') return 'true';
    if (name === 'false') return 'false';
    if (name === 'math') return 'Math';
    if (ctx.capturedParams.has(name)) return `ctx.capture("${name}")`;
    if (LEGACY_INPUT_TYPE_ALIASES.has(name)) return JSON.stringify(LEGACY_INPUT_TYPE_ALIASES.get(name));
    const color = pineColorConstant(name, ctx.pineVersion);
    if (color) return JSON.stringify(color);
    if (LEGACY_BARE_VISUAL_CONSTANTS.has(name)) return JSON.stringify(name);
    if (name === 'ticker') return 'ctx.syminfo.ticker';
    if (name === 'period' && ctx.pineVersion < 4) return 'ctx.timeframe.period';
    if (name === 'tickerid' && ctx.pineVersion < 4) return '(ctx.syminfo.tickerid ?? ctx.syminfo.ticker)';
    if (name === 'n') return 'ctx.barIndex';
    if (versionRules.supportsLegacyTimeframeVariableAliases && name === 'isintraday') return 'ctx.timeframe.isintraday';
    if (versionRules.supportsLegacyTimeframeVariableAliases && name === 'interval') return 'ctx.timeframe.multiplier';
    if (name === 'sunday' && pineVersionRules(ctx.pineVersion).supportsLegacySundayConstant) return String(DAYOFWEEK_CONSTANTS.sunday);
    if (name === 'tr') return emitTrueRangeMemberValue();
    return jsPineName(name);
  }

  function emitAssignmentTarget(name: string): string {
    const localName = currentLocalName(name);
    if (localName) return localName;
    const persistentLocalName = currentPersistentLocalName(name);
    if (persistentLocalName) return persistentLocalName;
    if (functionNameStack.length === 0 && rootRegularVars.has(name) && !rootPersistentVars.has(name) && !ctx.seriesVars.has(name)) {
      return `this.${jsStateMember('_g_', name)}`;
    }
    return jsPineName(name);
  }

  function isPersistentAssignmentTarget(name: string): boolean {
    return Boolean(currentPersistentLocalName(name)) || ctx.varDecls.some((v) => v.name === name);
  }

  function currentLocalName(name: string): string | undefined {
    for (let i = localNameStack.length - 1; i >= 0; i--) {
      if (pendingRootShadows.get(localNameStack[i])?.has(name)) continue;
      const localName = localNameStack[i].get(name);
      if (localName) return localName;
    }
    return undefined;
  }

  function declarationLocalName(name: string): string | undefined {
    return localNameStack[localNameStack.length - 1]?.get(name) ?? currentLocalName(name);
  }

  function activateLocalDeclaration(name: string): void {
    const scope = localNameStack[localNameStack.length - 1];
    if (scope) pendingRootShadows.get(scope)?.delete(name);
  }

  function isRootGlobalShadow(name: string): boolean {
    return functionNameStack.length === 0 && rootDeclaredNames.has(name) && Boolean(currentLocalName(name));
  }

  function currentLocalSourceName(name: string): string | undefined {
    for (let i = localSourceNameStack.length - 1; i >= 0; i--) {
      const localName = localSourceNameStack[i].get(name);
      if (localName) return localName;
    }
    return undefined;
  }

  function currentLocalHistoryName(name: string): string | undefined {
    for (let i = localHistoryNameStack.length - 1; i >= 0; i--) {
      const localName = localHistoryNameStack[i].get(name);
      if (localName) return localName;
    }
    return undefined;
  }

  function localParamName(name: string): string {
    return `_p_${jsPineName(name)}`;
  }

  function localVariableName(name: string): string {
    return `_l_${jsPineName(name)}`;
  }

  function localSourceParamName(name: string): string {
    return `${localParamName(name)}__source`;
  }

  function localHistoryParamName(name: string): string {
    return `${localParamName(name)}__series`;
  }

  function localVariableHistoryParamName(name: string): string {
    return `${localParamName(name)}__local_series`;
  }

  function fieldHistoryMemberName(objectName: string, fieldName: string): string {
    return jsStateMember('_field_series_', `${objectName}_${fieldName}`);
  }

  function emitFieldHistoryPush(pad: string, objectName: string, objectExpr: string): void {
    const fields = fieldHistory.get(objectName);
    if (!fields) return;
    for (const field of fields) {
      const member = fieldHistoryMemberName(objectName, field);
      const tmp = `_field_${jsPineName(objectName)}_${jsPineName(field)}_${lines.length}`;
      lines.push(`${pad}const ${tmp} = _getField(${objectExpr}, "${field}");`);
      lines.push(`${pad}this.${member}_bar = this._updateScopeHistory(this.${member}, this.${member}_bar, ${tmp}, ctx.barIndex);`);
    }
  }

  function emitLocalHistoryPush(pad: string, name: string, valueExpr: string): void {
    const historyName = currentLocalHistoryName(name);
    if (!historyName) return;
    lines.push(`${pad}if (${historyName}) {`);
    lines.push(`${pad}  ${historyName}.__tealscriptLastBar = this._updateScopeHistory(${historyName}, ${historyName}.__tealscriptLastBar, ${valueExpr}, ctx.barIndex, false);`);
    lines.push(`${pad}}`);
  }

  function emitSeriesVarWrite(pad: string, name: string, valueExpr: string, readsOwnHistory = false): void {
    const seriesMember = jsStateMember('_sv_', name);
    const barMember = jsStateMember('_sv_bar_', name);
    if (readsOwnHistory) {
      lines.push(`${pad}if (this.${barMember} !== ctx.barIndex) {`);
      lines.push(`${pad}  this.${seriesMember}.push(NaN);`);
      lines.push(`${pad}  this.${barMember} = ctx.barIndex;`);
      lines.push(`${pad}}`);
      lines.push(`${pad}this.${seriesMember}.update(${valueExpr});`);
      return;
    }
    lines.push(`${pad}if (this.${barMember} !== ctx.barIndex) {`);
    lines.push(`${pad}  this.${seriesMember}.push(${valueExpr});`);
    lines.push(`${pad}  this.${barMember} = ctx.barIndex;`);
    lines.push(`${pad}} else {`);
    lines.push(`${pad}  this.${seriesMember}.update(${valueExpr});`);
    lines.push(`${pad}}`);
  }

  function emitRootLocalSeriesWrite(pad: string, name: string, valueExpr: string, readsOwnHistory = false): void {
    if (functionNameStack.length === 0 && ctx.seriesVars.has(name) && !isRootGlobalShadow(name)) {
      emitSeriesVarWrite(pad, name, valueExpr, readsOwnHistory);
    }
  }

  function functionRequestsData(name: string, seen = new Set<string>()): boolean {
    if (seen.has(name)) return false;
    seen.add(name);
    return ctx.securitySites.some((site) => site.ownerFunctionName === name)
      || [...(functionEmitContext.calledFunctions.get(name) ?? [])].some((callee) => functionRequestsData(callee, seen));
  }

  function emitSourceDescriptor(expr: Expression | undefined, replayExpression = false): string {
    if (!expr) return 'undefined';
    if (expr.type === 'Identifier') {
      const forwarded = currentLocalSourceName(expr.name);
      if (forwarded) return forwarded;
      if (ctx.capturedParams.has(expr.name)) return `ctx.captureSource("${expr.name}")`;
      const localCapture = ctx.requestSourceCaptures.get(expr)?.params.includes(expr.name);
      const rootAlias = rootSourceAliases.get(expr.name);
      if (!localCapture && rootAlias && rootAlias !== expr) return emitSourceDescriptor(rootAlias, replayExpression);
      if (!localCapture && (expr.name in BAR_FIELDS || ['hl2', 'hlc3', 'ohlc4', 'hlcc4'].includes(expr.name))) {
        return `{"kind":"series","name":${JSON.stringify(expr.name)}}`;
      }
    }
    if (!replayExpression) return 'undefined';
    let site = ctx.requestSourceSites.get(expr);
    if (!site) {
      const captures = ctx.requestSourceCaptures.get(expr) ?? { params: [], locals: [] };
      site = { id: ctx.requestSourceSites.size, expression: expr, ownerFunctionName: functionNameStack.at(-1), ...captures };
      ctx.requestSourceSites.set(expr, site);
    }
    return `ctx.requestSource(${site.id}, ${emitRequestCaptureObject(site.params)})`;
  }

  function emitCaptureDescriptor(param: string): string {
    const source = currentLocalSourceName(param)
      ?? (ctx.capturedParams.has(param) ? `ctx.captureSource("${param}")` : undefined);
    const resolved = currentLocalName(param) ?? currentPersistentLocalName(param);
    const value = resolved
      ?? (param in BAR_FIELDS ? `this.${BAR_FIELDS[param]}.get(0)` : undefined)
      ?? (ctx.seriesVars.has(param) ? `this.${jsStateMember('_sv_', param)}.get(0)` : undefined)
      ?? (ctx.varDecls.some((v) => v.name === param) ? `this.${jsStateMember('_v_', param)}` : undefined)
      ?? (rootRegularVars.has(param) ? `this.${jsStateMember('_g_', param)}` : undefined)
      ?? (ctx.capturedParams.has(param) && functionNameStack.length === 0 ? `ctx.capture("${param}")` : jsPineName(param));
    const scope = functionNameStack.length > 0 ? currentFunctionStateName() : 'this';
    return source
      ? `{kind:"capture", value:${value}, source:${source}, scope:${scope}}`
      : `{kind:"capture", value:${value}, scope:${scope}}`;
  }

  function emitRequestCaptureObject(params: string[] | undefined, independentRequests?: Map<string, Expression>): string {
    if (!params || params.length === 0) return 'undefined';
    return `{${params.map((param) => {
      const request = independentRequests?.get(param);
      const scope = functionNameStack.length > 0 ? currentFunctionStateName() : 'this';
      const descriptor = request ? `{kind:"capture", value:${emitExpr(request)}, scope:${scope}}` : emitCaptureDescriptor(param);
      return `${JSON.stringify(param)}:${descriptor}`;
    }).join(',')}}`;
  }

  function currentPersistentLocalName(name: string): string | undefined {
    for (let i = persistentLocalStack.length - 1; i >= 0; i--) {
      const localName = persistentLocalStack[i].get(name);
      if (localName) return localName;
    }
    return undefined;
  }

  function isUserDeclaredSeriesName(name: string): boolean {
    return ctx.seriesVars.has(name) && (
      rootRegularVars.has(name)
      || rootPersistentVars.has(name)
      || ctx.capturedParams.has(name)
      || Boolean(currentLocalName(name))
      || Boolean(currentPersistentLocalName(name))
    );
  }

  function currentPersistentLocalInitFlag(name: string, localName: string): string {
    return rootBlockPersistentInitByValue.get(localName) ?? `${currentFunctionStateName()}.${jsInitMember(name)}`;
  }

  function registerRootBlockPersistent(stmt: VariableDeclaration): void {
    if (stmt.kind !== 'var' && stmt.kind !== 'varip') return;
    if (stmt.names.type !== 'VariableDeclarator') return;
    const name = stmt.names.name.name;
    const key = rootBlockPersistentKey(stmt, name);
    const value = `this.${jsStateMember('_v_block_', key)}`;
    const init = `this.${jsStateMember('__init_block_', key)}`;
    const state = { value, init, kind: stmt.kind };
    rootBlockPersistentLocals.set(stmt, state);
    rootBlockPersistentStates.push(state);
    rootBlockPersistentInitByValue.set(value, init);
  }

  function registerRootBlockPersistentDeclarations(stmts: Statement[], inLocalScope = false): void {
    for (const stmt of stmts) {
      if (stmt.type === 'FunctionDeclaration') continue;
      if (stmt.type === 'VariableDeclaration') {
        if (inLocalScope) registerRootBlockPersistent(stmt);
        if (stmt.init.type === 'IfStatement') registerRootBlockPersistentDeclarations([stmt.init], inLocalScope);
      } else if (stmt.type === 'MultiDeclaration') {
        for (const declaration of stmt.declarations) {
          if (inLocalScope) registerRootBlockPersistent(declaration);
          if (declaration.init.type === 'IfStatement') registerRootBlockPersistentDeclarations([declaration.init], inLocalScope);
        }
      } else if (stmt.type === 'IfStatement') {
        registerRootBlockPersistentDeclarations(stmt.consequent, true);
        if (Array.isArray(stmt.alternate)) registerRootBlockPersistentDeclarations(stmt.alternate, true);
        else if (stmt.alternate) registerRootBlockPersistentDeclarations([stmt.alternate], true);
      } else if (stmt.type === 'OnceStatement' || stmt.type === 'ForStatement' || stmt.type === 'WhileStatement') {
        registerRootBlockPersistentDeclarations(stmt.body, true);
      }
    }
  }

  function rootBlockPersistentNames(stmts: Statement[]): Map<string, string> {
    const names = new Map<string, string>();
    for (const stmt of stmts) {
      if (stmt.type === 'VariableDeclaration') {
        const local = rootBlockPersistentLocals.get(stmt);
        if (local && stmt.names.type === 'VariableDeclarator') names.set(stmt.names.name.name, local.value);
      } else if (stmt.type === 'MultiDeclaration') {
        for (const declaration of stmt.declarations) {
          const local = rootBlockPersistentLocals.get(declaration);
          if (local && declaration.names.type === 'VariableDeclarator') names.set(declaration.names.name.name, local.value);
        }
      }
    }
    return names;
  }

  registerRootBlockPersistentDeclarations(ast.body);

  function emitMemberExpr(expr: MemberExpression): string {
    const rawChainName = getMemberChainName(expr);
    const chainName = rawChainName ? enumMemberName(rawChainName) : undefined;
    if (chainName) {
      const enumValue = ctx.enumValues.get(chainName);
      if (enumValue) return JSON.stringify(enumValue);

      const importedEnumValue = ctx.importedEnumValues.get(chainName);
      if (importedEnumValue) return JSON.stringify(importedEnumValue);
      if (chainName.startsWith('strategy.commission.')) return JSON.stringify(chainName.slice('strategy.commission.'.length));
      if (chainName.startsWith('strategy.direction.')) return JSON.stringify(chainName.slice('strategy.direction.'.length));
      if (chainName.startsWith('strategy.oca.')) return JSON.stringify(chainName.slice('strategy.oca.'.length));
      if (chainName === 'strategy.opentrades.capital_held') return 'ctx.strategyProp("opentrades.capital_held")';
      if (chainName === 'strategy.closedtrades.first_index') return 'ctx.strategyProp("closedtrades.first_index")';
    }

    if (expr.object.type === 'Identifier') {
      const ns = expr.object.name;
      const prop = expr.property.name;
      const fullName = importedMemberName(`${ns}.${prop}`);
      if (ns === 'size' && expressionKind(expr.object) === 'udt') {
        return `_getField(${emitExpr(expr.object)}, "${prop}")`;
      }

      const importedConstant = ctx.importedConstants.get(fullName);
      if (importedConstant) return emitExpr(importedConstant);

      if (ctx.importedNamespaces.has(ns) && !BUILTIN_NAMESPACES.has(ns)) {
        return `ctx.runtimeError([${JSON.stringify(unknownImportedMemberMessage(fullName))}])`;
      }

      if (ns === 'barstate' && BARSTATE_FIELDS.has(prop)) return `ctx.barstate.${prop}`;
      if (ns === 'syminfo' && prop in SYMINFO_DERIVED_FIELDS) return SYMINFO_DERIVED_FIELDS[prop]!;
      if (ns === 'syminfo' && SYMINFO_FIELDS.has(prop)) return `ctx.syminfo.${prop}`;
      if (ns === 'timeframe' && prop in TIMEFRAME_DERIVED_FIELDS) return TIMEFRAME_DERIVED_FIELDS[prop]!;
      if (ns === 'timeframe' && TIMEFRAME_FIELDS.has(prop)) return `ctx.timeframe.${prop}`;
      if (ns === 'chart' && prop in CHART_FIELDS) return CHART_FIELDS[prop]!;
      if (fullName === 'ta.tr') return emitTrueRangeMemberValue();
      const taVarSite = ctx.taVarSiteMap.get(expr);
      if (taVarSite) return `this.${taVarSite.seriesName}.get(0)`;
      if (DRAWING_NAMESPACES.has(ns) && prop === 'all') {
        return `deps._arr.readOnlyFrom(...ctx.callBuiltin("${fullName}", [], {}, ${nextBuiltinCallId(fullName)}))`;
      }
      if (ns === 'math' && fullName in MATH_FUNCS) return MATH_FUNCS[fullName];
      if (ns === 'strategy') return `ctx.strategyProp("${prop}")`;
      if (ns === 'color') return JSON.stringify(pineColorConstant(prop, ctx.pineVersion) ?? prop);
      if (ns === 'shape') return `"${prop}"`;
      if (ns === 'plotshape') return `"plotshape.${prop}"`;
      if (ns === 'location') return `"${prop}"`;
      if (ns === 'size') return `"${prop}"`;
      if (fullName === 'plot.style_columns' && versionRules.columnsStyleNumericValue !== undefined) {
        return String(versionRules.columnsStyleNumericValue);
      }
      if (ns === 'plot') return `"plot.${prop}"`;
      if (ns === 'display') return prop in DISPLAY_CONSTANTS ? String(DISPLAY_CONSTANTS[prop]) : `"${prop}"`;
      if (ns === 'format') return `"${prop}"`;
      if (ns === 'scale') return `"${prop}"`;
      if (ns === 'currency') return `"${prop}"`;
      const forecast = CORPORATE_FORECAST_MEMBERS[fullName];
      if (forecast) return `ctx.syminfo.${forecast.field}`;
      if (ns === 'dividends') return `"dividends.${prop}"`;
      if (ns === 'earnings') return `"earnings.${prop}"`;
      if (ns === 'splits') return `"splits.${prop}"`;
      if (ns === 'xloc') return `"${prop}"`;
      if (ns === 'yloc') return `"${prop}"`;
      if (ns === 'text') return `"${prop.replace('align_', '').replace('wrap_', '').replace('format_', '')}"`;
      if (ns === 'extend') return `"${prop}"`;
      if (ns === 'line') return `"${prop.replace('style_', '')}"`;
      if (ns === 'label') return `"${prop.replace('style_', '')}"`;
      if (ns === 'box') return `"${prop}"`;
      if (ns === 'hline') return `"${prop.replace('style_', '')}"`;
      if (ns === 'polyline') return `"${prop}"`;
      if (ns === 'linefill') return `"${prop}"`;
      if (ns === 'table') return `"${prop}"`;
      if (ns === 'font') return `"${prop.replace('family_', '')}"`;
      if (ns === 'position') return `"${prop}"`;
      if (ns === 'adjust' || ns === 'adjustment' || ns === 'backadjustment' || ns === 'settlement_as_close') return `"${prop}"`;
      if (ns === 'session') return `ctx.sessionValue("${prop}")`;
      if (ns === 'alert') return `"${prop.replace('freq_', '')}"`;
      if (ns === 'order') return `"${prop}"`;
      if (ns === 'barmerge') return `"barmerge.${prop}"`;
      if (ns === 'dayofweek' && prop in DAYOFWEEK_CONSTANTS) return String(DAYOFWEEK_CONSTANTS[prop]);
      if (ns === 'input') return `"${prop}"`;
      if (BUILTIN_NAMESPACES.has(ns)) return `ctx.callBuiltin("${fullName}", [], {}, ${nextBuiltinCallId(fullName)})`;
    }
    return `_getField(${emitExpr(expr.object)}, "${expr.property.name}")`;
  }

  function emitIndexExpr(expr: IndexExpression): string {
    const idx = emitExpr(expr.index);
    const historyIdx = nonnegativeIntegerLoopCounters.has(idx) ? idx : `_historyOffset(${idx})`;
    if (expr.object.type === 'CallExpression') {
      const taSite = ctx.taCallSiteMap.get(expr.object);
      if (taSite) {
        const tmp = `_ta_indexed_${indexedTAResultIndex++}`;
        const series = isFunctionScopedTASite(taSite)
          ? `this._scopedTASeries(${currentFunctionStateName()}, "${taSite.memberName}", ${taSite.className === 'PivotPointLevels'})`
          : `this._ta_result_${taSite.memberName}`;
        return `(() => { const ${tmp} = ${emitTACall(taSite, expr.object)}; const _series = ${series}; _series.push(${tmp}); return _series.get(${historyIdx}); })()`;
      }
    }
    if (expr.object.type === 'MemberExpression') {
      const chainName = getMemberChainName(expr.object);
      if (chainName?.startsWith('strategy.')) {
        return `ctx.strategyPropHistory("${chainName.slice('strategy.'.length)}", ${historyIdx})`;
      }
      const taVarSite = ctx.taVarSiteMap.get(expr.object);
      if (taVarSite) return `this.${taVarSite.seriesName}.get(${historyIdx})`;
      if (expr.object.object.type === 'Identifier') {
        const objectName = expr.object.object.name;
        const fieldName = expr.object.property.name;
        if (fieldHistory.get(objectName)?.has(fieldName)) {
          return `this.${fieldHistoryMemberName(objectName, fieldName)}.get(${historyIdx})`;
        }
      }
    }
    if (expr.object.type === 'Identifier') {
      const name = expr.object.name;
      const collectionKind = collectionVars.get(name);
      const historyName = currentLocalHistoryName(name);
      if (historyName) {
        const localName = currentLocalName(name) ?? jsPineName(name);
        return `(${historyName} ? ${historyName}.get(${historyIdx}) : _idx(${localName}, ${idx}))`;
      }
      if (collectionKind && collectionHistoryVars.has(name)) {
        const history = `this.${jsCollectionHistoryMember(name)}`;
        return `_historyCollection(${emitIdentifier(expr.object)}, ${history}, ${idx}, ${seriesHistoryHint(name)}, "collection:${name}", this._deps.historyCheck)`;
      }
      if (collectionKind) return `_idx(${emitIdentifier(expr.object)}, ${idx})`;
      const taVarSite = ctx.taVarSiteMap.get(expr.object);
      if (taVarSite) return `this.${taVarSite.seriesName}.get(${historyIdx})`;
      if (isUserDeclaredSeriesName(name)) return `this.${jsSeriesMember(name)}.get(${historyIdx})`;
      if (name in BAR_FIELDS) return `this.${BAR_FIELDS[name]}.get(${historyIdx})`;
      if (name === 'bar_index' || name === 'n') return `_historyBarIndex(${idx}, ctx.barIndex, ${seriesHistoryHint(name)}, this._deps.historyCheck)`;
      if (name === 'last_bar_index') return `_historyConstant(ctx.lastBarIndex, ${idx}, ctx.barIndex, ${seriesHistoryHint(name)}, this._deps.historyCheck)`;
      if (RUNTIME_TIME_VALUES.has(name)) return `ctx.runtimeTimeValue("${name}", ${historyIdx}, ${seriesHistoryHint(name)})`;
      if (CALENDAR_PARTS.has(name)) return `ctx.calendarPart("${name}", [this._s_time.get(${historyIdx})], {})`;
      if (name === 'hl2' || name === 'hlc3' || name === 'ohlc4' || name === 'hlcc4') {
        return `this._s_${name}.get(${historyIdx})`;
      }
    }
    const historyMember = expressionHistory.get(expr);
    if (historyMember) {
      const value = emitExpr(expr.object);
      const state = functionNameStack.length > 0 ? currentFunctionStateName() : 'undefined';
      const history = `_series.get(${historyIdx})`;
      const result = !versionRules.allowsBoolNaHelpers && expressionKind(expr.object) === 'unknown'
        ? `_boolHistory(${history}, typeof _value === "boolean")`
        : history;
      return `(() => { const _value = ${value}; const _series = this._expressionHistory(${state}, "${historyMember}", _value, ctx.barIndex); return ${result}; })()`;
    }
    return `_idx(${emitExpr(expr.object)}, ${idx})`;
  }

  function emitCallExpr(expr: CallExpression): string {
    const duplicateNamedArg = duplicateNamedArgument(expr.arguments);
    if (duplicateNamedArg) return runtimeErrorExpr(`Duplicate named argument: ${duplicateNamedArg}`);

    const taSite = ctx.taCallSiteMap.get(expr);
    if (taSite) return emitTACall(taSite, expr);

    const callee = expr.callee;
    const fullName = importedMemberName(getMemberChainName(callee) ?? (callee.type === 'Identifier' ? callee.name : ''));
    const namespace = fullName.split('.')[0] ?? '';

    const posArgs = expr.arguments.filter((a) => !a.name).map((a) => emitExpr(a.value));
    const hasNamedArgs = expr.arguments.some((arg) => arg.name);
    const collectionMethodKind = getCollectionMethodKind(expr);
    if (fullName === 'str.tostring' && expr.arguments.length === 1 && (!expr.arguments[0].name || expr.arguments[0].name.name === 'value')) {
      const enumName = getMemberChainName(expr.arguments[0].value);
      const title = enumName ? (ctx.enumTitles.get(enumName) ?? ctx.importedEnumTitles.get(enumName)) : undefined;
      if (title !== undefined) return JSON.stringify(title);
      if (isEnumValue(expr.arguments[0].value)) {
        const value = emitExpr(expr.arguments[0].value);
        const callId = nextBuiltinCallId(fullName);
        return `((__value) => Object.hasOwn(${JSON.stringify(enumTitlesByValue)}, __value) ? ${JSON.stringify(enumTitlesByValue)}[__value] : ctx.callBuiltin("str.tostring", [__value], {}, ${callId}))(${value})`;
      }
    }

    if (
      expr.callee.type === 'MemberExpression'
      && expr.callee.property.name === 'title'
      && expr.arguments.length === 0
    ) {
      const receiverName = getMemberChainName(expr.callee.object);
      const importedTitle = receiverName ? (ctx.enumTitles.get(receiverName) ?? ctx.importedEnumTitles.get(receiverName)) : undefined;
      if (importedTitle !== undefined) return JSON.stringify(importedTitle);
      const enumTitles = Object.fromEntries([...ctx.enumTitles, ...ctx.importedEnumTitles]);
      if (Object.keys(enumTitles).length > 0) {
        const receiver = emitExpr(expr.callee.object);
        const callId = nextBuiltinCallId('title');
        return `((__receiver) => (${JSON.stringify(enumTitles)}[__receiver] ?? ctx.callMethodBuiltin("title", __receiver, [], {}, ${callId})))(${receiver})`;
      }
    }

    const officialLibraryFunctionName = ctx.officialLibraryFunctions.get(fullName);
    if (officialLibraryFunctionName) {
      return `ctx.callBuiltin("${officialLibraryFunctionName}", [${posArgs.join(', ')}], ${emitNamedArgsObj(expr.arguments)}, ${nextBuiltinCallId(officialLibraryFunctionName)})`;
    }
    const importedFunctionName = ctx.resolvedUserFunctionCalls.get(expr) ?? ctx.importedFunctions.get(fullName);
    if (importedFunctionName) {
      return emitUserFunctionCall(importedFunctionName, expr);
    }
    if (
      namespace
      && ctx.importedNamespaces.has(namespace)
      && !BUILTIN_NAMESPACES.has(namespace)
      && expr.callee.type === 'MemberExpression'
    ) {
      const constructorTypeName = expr.callee.property.name === 'new'
        ? getMemberChainName(expr.callee.object)
        : undefined;
      if (constructorTypeName && !ctx.typeDecls.has(constructorTypeName) && ctx.importedLocalTypes.has(constructorTypeName)) {
        return runtimeErrorExpr(`Unknown library type: ${constructorTypeName}`);
      }
      if (!constructorTypeName || !ctx.typeDecls.has(constructorTypeName)) {
        return runtimeErrorExpr(unknownImportedFunctionMessage(fullName));
      }
    }
    if (expr.callee.type === 'Identifier') {
      const importedContextFunction = ctx.importedAliasContext ? ctx.importedLocalFunctions.get(`${ctx.importedAliasContext}.${fullName}`) : undefined;
      if (importedContextFunction && ctx.funcInfos.has(importedContextFunction)) return emitUserFunctionCall(importedContextFunction, expr);
      const sameLibraryFunction = sameImportedLibraryFunctionName(fullName);
      if (sameLibraryFunction) return emitUserFunctionCall(sameLibraryFunction, expr);
    }
    if (expr.callee.type === 'Identifier') {
      const requestedCall = emitRequestedCallableCall(fullName, expr);
      if (requestedCall) return requestedCall;
      const methodCall = emitFunctionSyntaxMethodCall(fullName, expr);
      if (methodCall) return methodCall;
      const resolvedFunction = resolveUserFunctionCallName(fullName, expr);
      if (resolvedFunction) return emitUserFunctionCall(resolvedFunction, expr);
    }

    if (fullName.startsWith('strategy.opentrades.') || fullName.startsWith('strategy.closedtrades.')) {
      return `ctx.strategyTradeProp("${fullName}", [${posArgs.join(', ')}], ${emitNamedArgsObj(expr.arguments)})`;
    }

    if (fullName === 'offset') {
      const source = orderedArgExpression(expr.arguments, ['source', 'offset'], 'source', 0);
      const offset = orderedArgExpression(expr.arguments, ['source', 'offset'], 'offset', 1);
      if (!source || !offset) return 'NaN';
      return emitIndexExpr({ type: 'IndexExpression', object: source, index: offset, loc: expr.loc } as IndexExpression);
    }

    if (fullName === 'iff') {
      return `ctx.callBuiltin("iff", [${posArgs.join(', ')}], ${emitNamedArgsObj(expr.arguments)}, ${nextBuiltinCallId(fullName)})`;
    }

    if (LEGACY_GLOBAL_MATH_ALIASES.has(fullName)) {
      const mathName = `math.${fullName}`;
      const args = canonicalBuiltinArguments(expr.arguments, mathName, ctx.pineVersion);
      return `ctx.mathCall("${mathName}", [${posArgs.join(', ')}], ${emitNamedArgsObj(args)}, ${builtinCallId(mathName, expr)})`;
    }

    // Math functions
    if (namespace === 'math' && hasNamedArgs) {
      return `ctx.mathCall("${fullName}", [${posArgs.join(', ')}], ${emitNamedArgsObj(expr.arguments)}, ${builtinCallId(fullName, expr)})`;
    }
    if (fullName === 'math.log') {
      builtinCallId(fullName, expr);
      return `ctx.mathLog(${posArgs.join(', ')})`;
    }
    if (fullName === 'math.avg') {
      return posArgs.length > 0
        ? `((${posArgs.join(' + ')}) / ${posArgs.length})`
        : 'NaN';
    }
    if (fullName === 'math.sum') {
      return `ctx.mathCall("${fullName}", [${posArgs.join(', ')}], {}, ${builtinCallId(fullName, expr)})`;
    }
    if (fullName === 'math.random') {
      return `ctx.mathCall("${fullName}", [${posArgs.join(', ')}], {}, ${builtinCallId(fullName, expr)})`;
    }
    if (fullName === 'math.round') {
      return `ctx.mathCall("${fullName}", [${posArgs.join(', ')}], {}, ${builtinCallId(fullName, expr)})`;
    }
    if (fullName in MATH_FUNCS) {
      const fn = MATH_FUNCS[fullName];
      if (fullName === 'math.todegrees') return `(${posArgs[0]} * 180 / Math.PI)`;
      if (fullName === 'math.toradians') return `(${posArgs[0]} * Math.PI / 180)`;
      return `${fn}(${posArgs.join(', ')})`;
    }
    if (namespace === 'math') {
      return `ctx.mathCall("${fullName}", [${posArgs.join(', ')}], {}, ${builtinCallId(fullName, expr)})`;
    }

    // nz / na
    if (fullName === 'nz') {
      const args = ctx.pineVersion <= 4 ? expr.arguments.map((arg) => {
        const alias = arg.name?.name === 'x' ? 'source' : arg.name?.name === 'y' ? 'replacement' : undefined;
        return alias ? { ...arg, name: { ...arg.name!, name: alias } } : arg;
      }) : expr.arguments;
      const value = emitOrderedArg(args, ['source', 'replacement'], 'source', 0) ?? 'NaN';
      const replacement = emitOrderedArg(args, ['source', 'replacement'], 'replacement', 1);
      if (replacement) return `_nz(${value}, ${replacement})`;
      const source = readOrderedCallArg(args, ['source', 'replacement'], 'source', 0);
      const sourceKind = source && expressionKind(source);
      if (sourceKind === 'color') return `_nz(${value}, "#00000000")`;
      if (sourceKind === 'bool' && versionRules.allowsBoolNaHelpers) return `_nz(${value}, false)`;
      return `_nz(${value})`;
    }
    if (fullName === 'na') {
      const operand = orderedArgExpression(expr.arguments, ['x'], 'x', 0);
      if (!operand) return 'NaN';
      const value = emitExpr(operand);
      const kind = expressionKind(operand);
      if (kind === 'int' || kind === 'float') return `_isNa(${value})`;
      if (ctx.pineVersion >= 5 && kind === 'string') return `((_value) => _value === "" || _isNa(_value))(${value})`;
      return `_isNa(ctx.callBuiltin("__resolveTableReference", [${value}]))`;
    }
    if (fullName === 'fixnan') {
      const value = emitOrderedArg(expr.arguments, ['source'], 'source', 0) ?? 'NaN';
      if (functionNameStack.length > 0) {
        return `this._fixnanValue(${currentFunctionStateName()}, ${nextBuiltinCallId('fixnan')}, ${value})`;
      }
      const fnIdx = fixnanIndex++;
      return `(_isNa(${value}) ? this._fixnan_${fnIdx} : (this._fixnan_${fnIdx} = ${value}))`;
    }

    // Type casts
    if (fullName === 'int') return `Math.trunc(${emitOrderedArg(expr.arguments, ['x'], 'x', 0) ?? 'NaN'})`;
    if (fullName === 'float') return `+(${emitOrderedArg(expr.arguments, ['x'], 'x', 0) ?? 'NaN'})`;
    if (fullName === 'bool') {
      const value = emitOrderedArg(expr.arguments, ['x'], 'x', 0) ?? 'NaN';
      return ctx.pineVersion === 5
        ? `((_value) => _isNa(_value) ? NaN : _isTruthy(_value))(${value})`
        : `_isTruthy(${value})`;
    }
    if (fullName === 'string') return `_string(${emitOrderedArg(expr.arguments, ['x'], 'x', 0) ?? 'NaN'})`;

    // String functions
    if (LEGACY_GLOBAL_STR_ALIASES.has(fullName)) {
      const strName = LEGACY_GLOBAL_STR_ALIASES.get(fullName)!;
      const args = fullName === 'tostring' && versionRules.allowsLegacyGlobalBuiltinAliases
        ? expr.arguments.map((arg) => {
          const legacyName = arg.name?.name;
          if (legacyName !== 'x' && legacyName !== 'y') return arg;
          return { ...arg, name: { ...arg.name!, name: legacyName === 'x' ? 'value' : 'format' } };
        })
        : expr.arguments;
      return `ctx.callBuiltin("${strName}", [${posArgs.join(', ')}], ${emitNamedArgsObj(canonicalBuiltinArguments(args, strName, ctx.pineVersion))}, ${nextBuiltinCallId(strName)})`;
    }
    if (RUNTIME_STR_FUNCTIONS.has(fullName)) {
      return `ctx.callBuiltin("${fullName}", [${posArgs.join(', ')}], ${emitNamedArgsObj(expr.arguments)}, ${nextBuiltinCallId(fullName)})`;
    }
    if (fullName === 'str.format') return `ctx.strFormat([${posArgs.join(', ')}], ${emitNamedArgsObj(expr.arguments)})`;
    if (fullName === 'str.format_time') return `ctx.strFormatTime([${posArgs.join(', ')}], ${emitNamedArgsObj(expr.arguments)})`;

    // Color functions
    if (fullName === 'color') {
      if (expr.arguments.length > 1 && !versionRules.supportsLegacyColorTransparencyOverload) {
        return runtimeErrorExpr('The color() transparency constructor was renamed to color.new() in Pine v4.');
      }
      if (expr.arguments.length <= 1 || expr.arguments.some((argument) => argument.name?.name === 'x')) {
        const castArg = emitOrderedArg(expr.arguments, ['x'], 'x', 0);
        if (castArg) return castArg;
      }
      const legacyColorTransparencyCall = expr.arguments.length <= 2
        || expr.arguments.some((argument) => argument.name?.name === 'color' || argument.name?.name === 'transp');
      return legacyColorTransparencyCall
        ? `ctx.colorNew([${posArgs.join(', ')}], ${emitNamedArgsObj(expr.arguments)})`
        : `ctx.colorRgb([${posArgs.join(', ')}], ${emitNamedArgsObj(expr.arguments)})`;
    }
    if (fullName === 'color.new') return `ctx.colorNew([${posArgs.join(', ')}], ${emitNamedArgsObj(expr.arguments)})`;
    if (fullName === 'color.rgb') return `ctx.colorRgb([${posArgs.join(', ')}], ${emitNamedArgsObj(expr.arguments)})`;
    if (fullName === 'color.r') return `ctx.colorR([${posArgs.join(', ')}], ${emitNamedArgsObj(expr.arguments)})`;
    if (fullName === 'color.g') return `ctx.colorG([${posArgs.join(', ')}], ${emitNamedArgsObj(expr.arguments)})`;
    if (fullName === 'color.b') return `ctx.colorB([${posArgs.join(', ')}], ${emitNamedArgsObj(expr.arguments)})`;
    if (fullName === 'color.t') return `ctx.colorT([${posArgs.join(', ')}], ${emitNamedArgsObj(expr.arguments)})`;
    if (fullName === 'color.from_gradient') return `ctx.colorFromGradient([${posArgs.join(', ')}], ${emitNamedArgsObj(expr.arguments)})`;


    // Array functions
    if (namespace === 'array' && isStaticCollectionNamespaceCall(expr, 'array')) {
      return emitArrayCall(fullName, expr);
    }

    // Map functions
    if (namespace === 'map' && isStaticCollectionNamespaceCall(expr, 'map')) {
      const argNames = MAP_ARG_NAMES[fullName];
      const args = argNames
        ? emitOrderedCallArgs(expr.arguments, argNames)
        : posArgs;
      if (argNames?.[0] === 'id' && hasPositionalReceiverBeforeNamedArg(expr.arguments, 'id')) {
        return `ctx.runtimeError(["map call receiver was supplied multiple times (positional and named 'id')"])`;
      }
      const mapped = MAP_FUNC_MAP[fullName];
      if (mapped) return emitBoolMapReturn(fullName, orderedArgExpression(expr.arguments, argNames ?? [], 'id', 0), `deps._map.${mapped}(${args.join(', ')})`);
      return `deps._map.${fullName.replace('map.', '')}(${args.join(', ')})`;
    }

    // Ticker functions
    const tickerFullName = LEGACY_GLOBAL_TICKER_ALIASES.get(fullName) ?? fullName;
    if (namespace === 'ticker' || LEGACY_GLOBAL_TICKER_ALIASES.has(fullName)) {
      const namedObj = emitNamedArgsObj(expr.arguments);
      if (tickerFullName === 'ticker.new') return `ctx.tickerNew([${posArgs.join(', ')}], ${namedObj})`;
      if (tickerFullName === 'ticker.modify') return `ctx.tickerModify([${posArgs.join(', ')}], ${namedObj})`;
      if (tickerFullName === 'ticker.standard') return `ctx.tickerStandard([${posArgs.join(', ')}], ${namedObj})`;
      if (tickerFullName === 'ticker.inherit') return `ctx.tickerInherit([${posArgs.join(', ')}], ${namedObj})`;
      if (tickerFullName === 'ticker.heikinashi') return `ctx.tickerHeikinashi([${posArgs.join(', ')}], ${namedObj})`;
      if (tickerFullName === 'ticker.renko') return `ctx.tickerRenko([${posArgs.join(', ')}], ${namedObj})`;
      if (tickerFullName === 'ticker.kagi') return `ctx.tickerKagi([${posArgs.join(', ')}], ${namedObj})`;
      if (tickerFullName === 'ticker.linebreak') return `ctx.tickerLinebreak([${posArgs.join(', ')}], ${namedObj})`;
      if (tickerFullName === 'ticker.pointfigure') return `ctx.tickerPointfigure([${posArgs.join(', ')}], ${namedObj})`;
      return runtimeErrorExpr(`Unknown function: ${fullName}`);
    }
    if (fullName === 'syminfo.prefix' || fullName === 'syminfo.ticker') {
      return `ctx.callBuiltin("${fullName}", [${posArgs.join(', ')}], ${emitNamedArgsObj(expr.arguments)}, ${nextBuiltinCallId(fullName)})`;
    }

    // Drawing functions — delegate to context
    if (namespace && DRAWING_NAMESPACES.has(namespace) && !collectionMethodKind) {
      if (expr.arguments.length === 1 && !expr.arguments[0].name) {
        if (fullName === 'line.get_y1') {
          const cached = cachedLineReads.get(expr);
          if (cached) {
            const index = emitExpr(cached.index);
            return `(${cached.cache}[${index}] ?? (${cached.cache}[${index}] = ctx.readLineY1(${posArgs[0]})))`;
          }
          return `ctx.readLineY1(${posArgs[0]})`;
        }
        if (fullName === 'label.get_text') return `ctx.readLabelText(${posArgs[0]})`;
        if (POSITIONAL_DRAWING_GETTERS.has(fullName)) return `ctx.readDrawingGetter(${JSON.stringify(fullName)}, ${posArgs[0]})`;
      }
      const namedObj = emitNamedArgsObj(expr.arguments);
      const callId = DRAWING_CONSTRUCTOR_FUNCTIONS.has(fullName)
        ? `ctx.nextBuiltinCallId("${fullName}")`
        : `${nextBuiltinCallId(fullName)}`;
      return `ctx.callBuiltin("${fullName}", [${posArgs.join(', ')}], ${namedObj}, ${callId})`;
    }

    // Matrix functions
    if (namespace === 'matrix' && isStaticCollectionNamespaceCall(expr, 'matrix')) {
      const argNames = MATRIX_ARG_NAMES[fullName];
      const args = argNames
        ? emitMatrixCallArgs(fullName, expr.arguments, argNames)
        : posArgs;
      if (argNames?.[0] === 'id' && hasPositionalReceiverBeforeNamedArg(expr.arguments, 'id')) {
        return `ctx.runtimeError(["matrix call receiver was supplied multiple times (positional and named 'id')"])`;
      }
      if (fullName === 'matrix.new' && expr.typeArguments?.[0] === 'bool'
        && !versionRules.allowsBoolNaHelpers && args.length < 3) {
        return `deps._mtx.create(${args[0] ?? '0'}, ${args[1] ?? '0'}, false)`;
      }
      const boolAxis = emitOmittedBoolMatrixAxis(fullName, orderedArgExpression(expr.arguments, argNames ?? [], 'id', 0), args[0] ?? 'undefined', args.slice(1));
      if (boolAxis) return boolAxis;
      const mapped = MATRIX_FUNC_MAP[fullName];
      if (mapped) return `deps._mtx.${mapped}(${args.join(', ')})`;
      return `deps._mtx.${fullName.replace('matrix.', '')}(${args.join(', ')})`;
    }

    // Request.security
    if (fullName === 'request.security' || fullName === 'security' || fullName === 'request.security_lower_tf' || fullName === 'request.seed') {
      const secSite = ctx.securitySites.find((s) => s.node === expr);
      if (secSite) {
        const requestId = requestedContexts?.nodes.has(secSite.node) && functionNameStack.length > 0
          ? `(_methodContext?.requests?.[${secSite.id}] ?? ${secSite.id})` : String(secSite.id);
        if (secSite.kind === 'seed') {
          const sourceExpr = secSite.sourceExpr ? emitExpr(secSite.sourceExpr) : '""';
          const symExpr = emitExpr(secSite.symbolExpr);
          const ignoreSymbolExpr = secSite.ignoreInvalidSymbolExpr ? emitExpr(secSite.ignoreInvalidSymbolExpr) : 'false';
          const calcExpr = secSite.calcBarsCountExpr ? emitExpr(secSite.calcBarsCountExpr) : 'undefined';
          const sourceDescriptorExpr = emitSourceDescriptor(secSite.expressionSourceParam
            ? { type: 'Identifier', name: secSite.expressionSourceParam, loc: undefined }
            : undefined);
          const captureExpr = emitRequestCaptureObject(secSite.expressionCaptureParams, secSite.independentRequestCaptures);
          return `ctx.requestSeed(${requestId}, ${sourceExpr}, ${symExpr}, ${ignoreSymbolExpr}, ${calcExpr}, ${sourceDescriptorExpr}, ${captureExpr})`;
        }
        const symExpr = emitExpr(secSite.symbolExpr);
        const tfExpr = emitExpr(secSite.timeframeExpr);
        if (secSite.kind === 'security_lower_tf') {
          const ignoreSymbolExpr = secSite.ignoreInvalidSymbolExpr ? emitExpr(secSite.ignoreInvalidSymbolExpr) : 'false';
          const currencyExpr = secSite.currencyExpr ? emitExpr(secSite.currencyExpr) : 'undefined';
          const ignoreTfExpr = secSite.ignoreInvalidTimeframeExpr ? emitExpr(secSite.ignoreInvalidTimeframeExpr) : 'false';
          const calcExpr = secSite.calcBarsCountExpr ? emitExpr(secSite.calcBarsCountExpr) : 'undefined';
          const sourceDescriptorExpr = emitSourceDescriptor(secSite.expressionSourceParam
            ? { type: 'Identifier', name: secSite.expressionSourceParam, loc: undefined }
            : undefined);
          const captureExpr = emitRequestCaptureObject(secSite.expressionCaptureParams, secSite.independentRequestCaptures);
          return `ctx.requestSecurityLowerTf(${requestId}, ${symExpr}, ${tfExpr}, ${ignoreSymbolExpr}, ${currencyExpr}, ${ignoreTfExpr}, ${calcExpr}, ${sourceDescriptorExpr}, ${captureExpr}, ${secSite.expressionTupleArity ?? 'undefined'})`;
        }
        const gapsExpr = secSite.gapsExpr ? emitExpr(secSite.gapsExpr) : '"barmerge.gaps_off"';
        const laExpr = secSite.lookaheadExpr ? emitExpr(secSite.lookaheadExpr) : '"barmerge.lookahead_off"';
        const ignoreSymbolExpr = secSite.ignoreInvalidSymbolExpr ? emitExpr(secSite.ignoreInvalidSymbolExpr) : 'false';
        const currencyExpr = secSite.currencyExpr ? emitExpr(secSite.currencyExpr) : 'undefined';
        const calcExpr = secSite.calcBarsCountExpr ? emitExpr(secSite.calcBarsCountExpr) : 'undefined';
        const sourceDescriptorExpr = emitSourceDescriptor(secSite.expressionSourceParam
          ? { type: 'Identifier', name: secSite.expressionSourceParam, loc: undefined }
          : undefined);
        const captureExpr = emitRequestCaptureObject(secSite.expressionCaptureParams, secSite.independentRequestCaptures);
        return `ctx.requestSecurity(${requestId}, ${symExpr}, ${tfExpr}, ${gapsExpr}, ${laExpr}, ${ignoreSymbolExpr}, ${currencyExpr}, ${calcExpr}, ${sourceDescriptorExpr}, ${captureExpr})`;
      }
    }
    if (fullName === 'request.currency_rate') {
      return `ctx.requestCurrencyRate([${posArgs.join(', ')}], ${emitNamedArgsObj(expr.arguments)})`;
    }
    if (fullName === 'request.footprint') {
      return `ctx.requestFootprint([${posArgs.join(', ')}], ${emitNamedArgsObj(expr.arguments)})`;
    }
    if (namespace === 'footprint' || namespace === 'volume_row') {
      return `ctx.callBuiltin("${fullName}", [${posArgs.join(', ')}], ${emitNamedArgsObj(expr.arguments)}, ${nextBuiltinCallId(fullName)})`;
    }
    const pointRequestName = fullName === 'dividends' && ctx.pineVersion < 5
      ? 'request.dividends' : fullName;
    if (
      pointRequestName === 'request.dividends'
      || pointRequestName === 'request.earnings'
      || pointRequestName === 'request.splits'
      || pointRequestName === 'request.financial'
      || pointRequestName === 'request.economic'
      || pointRequestName === 'request.quandl'
    ) {
      return `ctx.requestPointSeries("${pointRequestName}", [${posArgs.join(', ')}], ${emitNamedArgsObj(expr.arguments)})`;
    }

    // Plot functions
    if (PLOT_FUNCTIONS.has(fullName)) {
      return emitPlotCall(fullName, expr);
    }

    // Input functions
    if (fullName === 'input' || namespace === 'input') {
      return emitInputCall(fullName, expr);
    }

    // Alert
    if (fullName === 'alert') return `ctx.alert([${posArgs.join(', ')}], ${emitNamedArgsObj(expr.arguments)}, ${builtinCallId(fullName, expr)})`;
    if (fullName === 'alertcondition') return `ctx.alertCondition([${posArgs.join(', ')}], ${emitNamedArgsObj(expr.arguments)}, ${nextBuiltinCallId(fullName)})`;

    // Log
    if (fullName === 'log.info') return `ctx.logInfo([${posArgs.join(', ')}], ${emitNamedArgsObj(expr.arguments)})`;
    if (fullName === 'log.warning') return `ctx.logWarning([${posArgs.join(', ')}], ${emitNamedArgsObj(expr.arguments)})`;
    if (fullName === 'log.error') return `ctx.logError([${posArgs.join(', ')}], ${emitNamedArgsObj(expr.arguments)})`;

    // Runtime
    if (fullName === 'runtime.error') return emitRuntimeErrorCall(expr, expr.loc);
    if (fullName === 'max_bars_back') {
      return `ctx.callBuiltin("${fullName}", [${posArgs.join(', ')}], ${emitNamedArgsObj(expr.arguments)}, ${nextBuiltinCallId(fullName)})`;
    }

    // Time
    if (fullName === 'time') return `ctx.timeFilter(false, [${posArgs.join(', ')}], ${emitNamedArgsObj(expr.arguments)})`;
    if (fullName === 'time_close') {
      const args = versionRules.supportsLegacyResolutionDeclarationParams
        ? expr.arguments.map((argument) => argument.name?.name === 'resolution'
          ? { ...argument, name: { ...argument.name, name: 'timeframe' } }
          : argument)
        : expr.arguments;
      return `ctx.timeFilter(true, [${posArgs.join(', ')}], ${emitNamedArgsObj(args)})`;
    }
    if (fullName === 'timestamp') {
      const args = `[${posArgs.join(', ')}], ${emitNamedArgsObj(expr.arguments)}`;
      if (expr.arguments.length > 0 && expr.arguments.every(arg =>
        arg.value.type === 'NumericLiteral' || arg.value.type === 'StringLiteral')) {
        const namedZone = expr.arguments.find(arg => arg.name?.name === 'timezone');
        const firstPositional = expr.arguments.find(arg => !arg.name);
        const zone = namedZone?.value ?? (posArgs.length > 1 && firstPositional?.value.type === 'StringLiteral'
          ? firstPositional.value : undefined);
        literalTimestampCount ??= 0;
        return `ctx.timestamp(${args}, "literal_timestamp_${literalTimestampCount++}", ${zone ? emitExpr(zone) : 'undefined'})`;
      }
      return `ctx.timestamp(${args})`;
    }
    if (CALENDAR_PARTS.has(fullName)) return `ctx.calendarPart("${fullName}", [${posArgs.join(', ')}], ${emitNamedArgsObj(expr.arguments)})`;
    if (namespace === 'timeframe') {
      return `ctx.callBuiltin("${fullName}", [${posArgs.join(', ')}], ${emitNamedArgsObj(expr.arguments)}, ${nextBuiltinCallId(fullName)})`;
    }

    // Strategy functions
    if (fullName === 'strategy.entry') return emitStrategyCall('entry', expr);
    if (fullName === 'strategy.exit') return emitStrategyCall('exit', expr);
    if (fullName === 'strategy.close') return emitStrategyCall('close', expr);
    if (fullName === 'strategy.close_all') return emitStrategyCall('closeAll', expr);
    if (fullName === 'strategy.cancel') return emitStrategyCall('cancel', expr);
    if (fullName === 'strategy.cancel_all') return emitStrategyCall('cancelAll', expr);
    if (fullName === 'strategy.order') return emitStrategyCall('order', expr);
    if (fullName === 'strategy.default_entry_qty') {
      return `ctx.strategyDefaultEntryQty([${posArgs.join(', ')}], ${emitNamedArgsObj(expr.arguments)})`;
    }
    if (fullName === 'strategy.convert_to_account') {
      return `ctx.strategyConvertToAccount([${posArgs.join(', ')}], ${emitNamedArgsObj(expr.arguments)})`;
    }
    if (fullName === 'strategy.convert_to_symbol') {
      return `ctx.strategyConvertToSymbol([${posArgs.join(', ')}], ${emitNamedArgsObj(expr.arguments)})`;
    }
    if (fullName.startsWith('strategy.risk.')) {
      return `ctx.strategyRisk("${fullName}", [${posArgs.join(', ')}], ${emitNamedArgsObj(expr.arguments)})`;
    }

    // Strategy risk
    if (namespace === 'strategy' && expr.callee.type === 'MemberExpression') {
      const prop = expr.callee.property.name;
      if (prop === 'risk') return 'undefined';
    }

    // UDT constructor: MyType.new(field1=val1, ...)
    const constructorTypeName = expr.callee.type === 'MemberExpression' && expr.callee.property.name === 'new'
      ? getMemberChainName(expr.callee.object)
      : undefined;
    const resolvedConstructorTypeName = constructorTypeName
      ? (sameImportedLibraryTypeName(constructorTypeName) ?? (ctx.typeDecls.has(constructorTypeName) ? constructorTypeName : undefined))
      : undefined;
    if (resolvedConstructorTypeName && ctx.typeDecls.has(resolvedConstructorTypeName)) {
      return emitUdtConstructor(resolvedConstructorTypeName, expr);
    }

    const staticCopyTypeName = expr.callee.type === 'MemberExpression' && expr.callee.property.name === 'copy'
      ? getMemberChainName(expr.callee.object)
      : undefined;
    const resolvedStaticCopyTypeName = staticCopyTypeName
      ? (sameImportedLibraryTypeName(staticCopyTypeName) ?? (ctx.typeDecls.has(staticCopyTypeName) ? staticCopyTypeName : undefined))
      : undefined;
    if (
      resolvedStaticCopyTypeName
      && expr.callee.type === 'MemberExpression'
      && ctx.typeDecls.has(resolvedStaticCopyTypeName)
    ) {
      const copyArg = emitCollectionCallArgs(`${resolvedStaticCopyTypeName}.copy`, expr.arguments, ['id'])[0] ?? posArgs[0] ?? 'undefined';
      return `deps._udt.copy(${copyArg})`;
    }

    if (collectionMethodKind) {
      const methodExpr = expr as CallExpression & { callee: MemberExpression };
      const overloads = (ctx.localMethodOverloads.get(methodExpr.callee.property.name) ?? []).filter((overload) =>
        overload.receiverType === collectionMethodKind && !validateUserFunctionCall(overload.internalName, methodExpr, 1, true)
        && (!resolvedUserMethods.has(methodExpr) || ctx.funcInfos.get(overload.internalName)?.body === resolvedUserMethods.get(methodExpr)?.body)
      );
      if (overloads.length === 1) return emitUserFunctionCall(overloads[0]!.internalName, methodExpr, emitExpr(methodExpr.callee.object));
      if (overloads.length > 0) return emitLocalMethodCall(overloads, methodExpr);
      const importedOverloads = (sameImportedLibraryMethodOverloads(methodExpr.callee.property.name)
        ?? ctx.importedMethodOverloads.get(methodExpr.callee.property.name) ?? []).filter((overload) =>
        ctx.funcInfos.get(overload.internalName)?.paramTypes[0]?.baseType === collectionMethodKind
        && !validateUserFunctionCall(overload.internalName, methodExpr, 1, true)
        && (!resolvedUserMethods.has(methodExpr) || ctx.funcInfos.get(overload.internalName)?.body === resolvedUserMethods.get(methodExpr)?.body)
      );
      if (importedOverloads.length > 0) return emitImportedMethodCall(importedOverloads, methodExpr);
      const receiver = emitExpr((expr.callee as MemberExpression).object);
      const method = (expr.callee as MemberExpression).property.name;
      const resolvedRuntimeMethod = collectionRuntimeMethodName(collectionMethodKind, method);
      const runtimeMethod = resolvedRuntimeMethod ?? method;
      const methodFullName = `${collectionMethodKind}.${method}`;
      const methodArgNames = collectionArgNames(methodFullName)?.slice(1);
      const methodArgs = methodArgNames
        ? emitCollectionCallArgs(methodFullName, expr.arguments, methodArgNames)
        : posArgs;
      const boolAxis = collectionMethodKind === 'matrix'
        ? emitOmittedBoolMatrixAxis(methodFullName, (expr.callee as MemberExpression).object, receiver, methodArgs) : undefined;
      if (boolAxis) return boolAxis;
      const needsLegacyIndexGuard = collectionMethodKind === 'array'
        && !versionRules.allowsNegativeArrayIndices
        && ['get', 'set', 'insert', 'remove'].includes(runtimeMethod);
      if (resolvedRuntimeMethod && needsLegacyIndexGuard) {
        return `_legacyArray_${runtimeMethod}(${[receiver, ...methodArgs].join(', ')})`;
      }
      if (resolvedRuntimeMethod && !needsLegacyIndexGuard) {
        if (ctx.pineVersion === 5 && methodFullName === 'array.join') {
          methodArgs[0] ??= 'undefined';
          methodArgs[1] = 'true';
        }
        const helpers = collectionMethodKind === 'array' ? '_arr' : collectionMethodKind === 'map' ? '_map' : '_mtx';
        const call = `deps.${helpers}.${runtimeMethod}(${[receiver, ...methodArgs].join(', ')})`;
        return collectionMethodKind === 'map' ? emitBoolMapReturn(methodFullName, (expr.callee as MemberExpression).object, call) : call;
      }
      return `_callCollectionMethod("${collectionMethodKind}", ${receiver}, "${runtimeMethod}", [${methodArgs.join(', ')}])`;
    }

    if (expr.callee.type === 'MemberExpression') {
      const typeQualifiedOverloads = localTypeQualifiedMethodOverloads(expr.callee);
      if (typeQualifiedOverloads && typeQualifiedOverloads.length > 0) {
        return emitTypeQualifiedLocalMethodCall(typeQualifiedOverloads, expr as CallExpression & { callee: MemberExpression });
      }
    }

    if (expr.callee.type === 'MemberExpression' && !isStaticNamespaceReceiver(expr.callee.object)) {
      const localOverloads = ctx.localMethodOverloads.get(expr.callee.property.name);
      if (localOverloads && localOverloads.length > 0) {
        return emitLocalMethodCall(localOverloads, expr as CallExpression & { callee: MemberExpression });
      }
    }

    if (expr.callee.type === 'MemberExpression') {
      const importedOverloads = sameImportedLibraryMethodOverloads(expr.callee.property.name)
        ?? ctx.importedMethodOverloads.get(expr.callee.property.name);
      if (importedOverloads && importedOverloads.length > 0) {
        const index = expr.callee.property.name === 'get' ? orderedArgExpression(expr.arguments, ['index'], 'index', 0) : undefined;
        if (index && importedArrayGetUsesBuiltinIndex(expr, importedOverloads)) {
          return `deps._arr.get(${emitExpr(expr.callee.object)}, ${emitExpr(index)})`;
        }
        return emitImportedMethodCall(importedOverloads, expr as CallExpression & { callee: MemberExpression });
      }

      const localImportedOverloads = importedLocalMethodOverloadsByName(expr.callee.property.name);
      if (localImportedOverloads.length > 0) {
        return runtimeErrorExpr(`Unknown function: ${memberCallName(expr as CallExpression & { callee: MemberExpression })}`);
      }

      const importedMethodName = ctx.importedMethods.get(expr.callee.property.name);
      if (importedMethodName) {
        const receiver = emitExpr(expr.callee.object);
        return emitUserFunctionCall(importedMethodName, expr, receiver);
      }
    }

    // User-defined method
    if (expr.callee.type === 'MemberExpression' && ctx.funcInfos.has(expr.callee.property.name)) {
      if (validateUserFunctionCall(expr.callee.property.name, expr, 1, true)) {
        return emitReceiverBuiltinMethodCall(expr as CallExpression & { callee: MemberExpression });
      }
      const receiver = emitExpr(expr.callee.object);
      const methodName = expr.callee.property.name;
      return emitUserFunctionCall(methodName, expr, receiver);
    }

    if (expr.callee.type === 'MemberExpression' && !isStaticNamespaceReceiver(expr.callee.object)) {
      const receiverType = expressionType(expr.callee.object);
      const method = expr.callee.property.name;
      if (receiverType?.kind === 'udt'
        && ((receiverType.name === 'footprint' && method === 'rows')
          || (receiverType.name === 'volume_row' && method === 'up_price'))) {
        const name = `${receiverType.name}.${method}`;
        return `ctx.callBuiltin("${name}", [${[emitExpr(expr.callee.object), ...posArgs].join(', ')}], ${emitNamedArgsObj(expr.arguments)}, ${nextBuiltinCallId(name)})`;
      }
    }

    if (expr.callee.type === 'MemberExpression' && expr.callee.property.name === 'copy') {
      const receiver = emitExpr(expr.callee.object);
      const kindHint = getCollectionParameterKind(expr.callee.object);
      const nullableObjectCopy = getFunctionParameterType(expr.callee.object)?.baseType === 'udt';
      const callId = nextBuiltinCallId('chart.point.copy');
      return `((__receiver) => (__receiver?.type === "chart.point" ? ctx.callBuiltin("chart.point.copy", [__receiver], {}, ${callId}) : (__receiver && __receiver.__tealscriptUdt) ? deps._udt.copy(__receiver) : (${nullableObjectCopy} && _isNa(__receiver)) ? NaN : (${JSON.stringify(kindHint) ?? 'undefined'} || _isNa(__receiver) || (__receiver && (__receiver.__tealscriptArray || __receiver.__tealscriptMap || __receiver.__tealscriptMatrix || Array.isArray(__receiver)))) ? _callAnyCollectionMethod(ctx, __receiver, "copy", [], ${JSON.stringify(kindHint) ?? 'undefined'}) : ctx.callMethodBuiltin("copy", __receiver, [], ${emitNamedArgsObj(expr.arguments)}, ${callId})))(${receiver})`;
    }
    if (
      expr.callee.type === 'MemberExpression'
      && COLLECTION_METHOD_NAMES.has(expr.callee.property.name)
      && !isStaticNamespaceReceiver(expr.callee.object)
    ) {
      const receiver = emitExpr(expr.callee.object);
      const method = expr.callee.property.name;
      const kindHint = getCollectionParameterKind(expr.callee.object);
      const emittedKindHint = JSON.stringify(kindHint) ?? 'undefined';
      const methodArgs = emitCollectionReceiverArgs(expr.arguments, method, posArgs, kindHint);
      if (FOOTPRINT_METHODS.has(method)) {
        const namedArgs = emitNamedArgsObj(expr.arguments);
        const callId = nextBuiltinCallId(method);
        return `((__receiver) => (${emittedKindHint} || (__receiver && (__receiver.__tealscriptArray || __receiver.__tealscriptMap || __receiver.__tealscriptMatrix))) ? _callAnyCollectionMethod(ctx, __receiver, "${method}", [${methodArgs.join(', ')}], ${emittedKindHint}) : ctx.footprintMethod("${method}", __receiver, [${posArgs.join(', ')}], ${namedArgs}, ${callId}))(${receiver})`;
      }
      return `((__receiver) => (${emittedKindHint} || _isNa(__receiver) || (__receiver && (__receiver.__tealscriptArray || __receiver.__tealscriptMap || __receiver.__tealscriptMatrix || Array.isArray(__receiver)))) ? _callAnyCollectionMethod(ctx, __receiver, "${method}", [${methodArgs.join(', ')}], ${emittedKindHint}) : ctx.callMethodBuiltin("${method}", __receiver, [${posArgs.join(', ')}], ${emitNamedArgsObj(expr.arguments)}, ${nextBuiltinCallId(method)}))(${receiver})`;
    }

    if (expr.callee.type === 'MemberExpression' && FOOTPRINT_METHODS.has(expr.callee.property.name)) {
      const receiver = emitExpr(expr.callee.object);
      const methodName = expr.callee.property.name;
      return `ctx.footprintMethod("${methodName}", ${receiver}, [${posArgs.join(', ')}], ${emitNamedArgsObj(expr.arguments)}, ${nextBuiltinCallId(methodName)})`;
    }

    if (expr.callee.type === 'MemberExpression') {
      return emitReceiverBuiltinMethodCall(expr as CallExpression & { callee: MemberExpression });
    }

    // User-defined function
    if (expr.callee.type === 'Identifier') {
      const requestedCall = emitRequestedCallableCall(fullName, expr);
      if (requestedCall) return requestedCall;
      const methodCall = emitFunctionSyntaxMethodCall(fullName, expr);
      if (methodCall) return methodCall;
      const resolvedFunction = resolveUserFunctionCallName(fullName, expr);
      if (resolvedFunction) return emitUserFunctionCall(resolvedFunction, expr);
    }

    const callId = DRAWING_CONSTRUCTOR_FUNCTIONS.has(fullName)
      ? `ctx.nextBuiltinCallId("${fullName}")`
      : `${nextBuiltinCallId(fullName)}`;
    return `ctx.callBuiltin("${fullName}", [${posArgs.join(', ')}], {}, ${callId})`;
  }

  function emitImportedMethodCall(overloads: ImportedMethodOverloadInfo[], expr: CallExpression & { callee: MemberExpression }): string {
    const receiver = emitExpr(expr.callee.object);
    const temp = `_method_receiver_${functionEmitContext.callSites.get(expr) ?? 'x'}`;
    const privateMatchingOverload = (() => {
      if (currentImportedAlias()) return false;
      const localOverloads = importedLocalMethodOverloadsByName(expr.callee.property.name);
      const publicInternalNames = new Set(overloads.map((overload) => overload.internalName));
      return localOverloads.some((overload) => !publicInternalNames.has(overload.internalName) && importedMethodAcceptsArgs(overload.internalName, expr, 1));
    })();
    if (privateMatchingOverload) {
      return runtimeErrorExpr(`Unknown function: ${memberCallName(expr)}`);
    }
    const importedReceiverCondition = (receiverExpr: string, receiverType: string | null): string => {
      if (!receiverType) return 'true';
      const internalTypeName = receiverType.includes('.')
        ? receiverType.replace(/^([^.]+)\.(.+)$/, '$1__type__$2')
        : receiverType;
      const officialValueAtTimeData = receiverType.endsWith('.Data') ? ` || ${receiverExpr}.typeName === "TradingView.ValueAtTime.Data"` : '';
      return `_isNa(${receiverExpr}) || (${receiverExpr} && ${receiverExpr}.__tealscriptUdt && (${receiverExpr}.typeName === ${JSON.stringify(receiverType)} || ${receiverExpr}.typeName === ${JSON.stringify(internalTypeName)}${officialValueAtTimeData}))`;
    };
    const branches = overloads.map((overload) => {
      const call = emitUserFunctionCall(overload.internalName, expr, temp);
      if (!overload.receiverType) return `return ${call};`;
      const collectionReceiver = ctx.funcInfos.get(overload.internalName)?.paramTypes[0]?.baseType;
      if (collectionReceiver === 'array' || collectionReceiver === 'matrix' || collectionReceiver === 'map') {
        return `if (${localReceiverCondition(temp, collectionReceiver)}) return ${call};`;
      }
      const enumReceiver = enumRelatedAnnotationType(ctx.funcInfos.get(overload.internalName)?.paramTypeAnnotations[0], ctx.importedFunctionOwners.get(overload.internalName));
      if (typeof enumReceiver === 'string' && enumTypeNames.has(enumReceiver) && enumRelatedValueType(expr.callee.object) === enumReceiver) {
        const members = [...ctx.enumValues, ...ctx.importedEnumValues]
          .filter(([name]) => name.slice(0, name.lastIndexOf('.')) === enumReceiver).map(([, value]) => value);
        return `if (_isNa(${temp}) || ${JSON.stringify(members)}.includes(${temp})) return ${call};`;
      }
      return `if (${importedReceiverCondition(temp, overload.receiverType)}) return ${call};`;
    });
    return `(() => { const ${temp} = ${receiver}; ${branches.join(' ')} throw new Error("No imported method overload matched ${expr.callee.property.name} for receiver " + (${temp} && ${temp}.__tealscriptUdt ? ${temp}.typeName : typeof ${temp})); })()`;
  }

  function emitLocalMethodCall(overloads: LocalMethodOverloadInfo[], expr: CallExpression & { callee: MemberExpression }): string {
    const selected = functionNameStack.length === 0 && requestedContexts
      ? requestedContexts.callTypes.get(expr)?.resolvedUserMethod ?? resolvedUserMethods.get(expr)
      : resolvedUserMethods.get(expr);
    const selectedOverload = selected && overloads.find((overload) => ctx.funcInfos.get(overload.internalName)?.body === selected.body);
    if (selectedOverload && (functionStateNameStack.length === 0 || localNameStack.length === 0)) return emitUserFunctionCall(selectedOverload.internalName, expr, emitExpr(expr.callee.object));
    const receiver = emitExpr(expr.callee.object);
    const temp = `_method_receiver_${functionEmitContext.callSites.get(expr) ?? 'x'}`;
    const receiverKind = expressionKind(expr.callee.object);
    const compatible = overloads.filter((overload) => {
      if (validateUserFunctionCall(overload.internalName, expr, 1, true)) return false;
      if (
        receiverKind && receiverKind !== 'unknown' && overload.receiverType
        && (DRAWING_RECEIVER_TYPES.has(receiverKind) || DRAWING_RECEIVER_TYPES.has(overload.receiverType))
      ) return overload.receiverType === receiverKind;
      return true;
    });
    if (
      compatible.length === 0
      && ((receiverKind && DRAWING_RECEIVER_TYPES.has(receiverKind))
        || overloads.some((overload) => overload.receiverType && DRAWING_RECEIVER_TYPES.has(overload.receiverType)))
    ) {
      return emitReceiverBuiltinMethodCall(expr);
    }
    const candidates = compatible.length > 0 ? compatible : overloads;
    const branches = candidates.map((overload) => {
      const call = emitUserFunctionCall(overload.internalName, expr, temp);
      const condition = localReceiverCondition(temp, overload.receiverType);
      return condition === 'true' ? `return ${call};` : `if (${condition}) return ${call};`;
    });
    const contextualBranches = functionNameStack.length > 0 ? candidates.map((overload) => {
      const call = emitUserFunctionCall(overload.internalName, expr, temp);
      return `if (_methodContext?.calls[${functionEmitContext.callSites.get(expr)}]?.method === ${JSON.stringify(overload.internalName)}) return ${call};`;
    }) : [];
    const builtinCall = emitReceiverBuiltinMethodCall(expr, temp);
    return `(() => { const ${temp} = ${receiver}; ${contextualBranches.join(' ')} ${branches.join(' ')} if (ctx.hasMethodBuiltin(${JSON.stringify(expr.callee.property.name)}, ${temp})) return ${builtinCall}; throw new Error("No local method overload matched ${expr.callee.property.name} for receiver " + (${temp} && ${temp}.__tealscriptUdt ? ${temp}.typeName : typeof ${temp})); })()`;
  }

  function emitReceiverBuiltinMethodCall(expr: CallExpression & { callee: MemberExpression }, receiver = emitExpr(expr.callee.object)): string {
    const methodName = expr.callee.property.name;
    const args = expr.arguments.filter((arg) => !arg.name).map((arg) => emitExpr(arg.value));
    const receiverKind = expressionKind(expr.callee.object);
    const getterName = `${receiverKind}.${methodName}`;
    if (expr.arguments.length === 0 && POSITIONAL_DRAWING_GETTERS.has(getterName)) {
      return `ctx.readDrawingGetter(${JSON.stringify(getterName)}, ${receiver})`;
    }
    const resolvedName = receiverKind && DRAWING_RECEIVER_TYPES.has(receiverKind)
      ? `, ${JSON.stringify(`${receiverKind}.${methodName}`)}`
      : '';
    return `ctx.callMethodBuiltin("${methodName}", ${receiver}, [${args.join(', ')}], ${emitNamedArgsObj(expr.arguments)}, ${nextBuiltinCallId(methodName)}${resolvedName})`;
  }

  function localTypeQualifiedMethodOverloads(callee: MemberExpression): LocalMethodOverloadInfo[] | undefined {
    const receiverType = getMemberChainName(callee.object);
    if (!receiverType || !ctx.typeDecls.has(receiverType)) return undefined;
    const overloads = ctx.localMethodOverloads.get(callee.property.name) ?? [];
    return overloads.filter((overload) => overload.receiverType === receiverType);
  }

  function emitTypeQualifiedLocalMethodCall(overloads: LocalMethodOverloadInfo[], expr: CallExpression & { callee: MemberExpression }): string {
    const compatible = overloads.filter((overload) => !validateUserFunctionCall(overload.internalName, expr, 0, true));
    if (compatible.length === 1) return emitUserFunctionCall(compatible[0]!.internalName, expr);
    if (compatible.length > 1) {
      return runtimeErrorExpr(`Ambiguous local method overload for ${expr.callee.property.name}`);
    }
    return runtimeErrorExpr(
      validateUserFunctionCall(overloads[0]!.internalName, expr, 0, true)
        ?? `No local method overload matched ${expr.callee.property.name} for static receiver ${getMemberChainName(expr.callee.object)}`,
    );
  }

  function localReceiverCondition(receiver: string, receiverType: string | null): string {
    if (!receiverType) return 'true';
    if (ctx.typeDecls.has(receiverType)) {
      return `_isNa(${receiver}) || (${receiver} && ${receiver}.__tealscriptUdt && ${receiver}.typeName === ${JSON.stringify(receiverType)})`;
    }
    if (receiverType === 'array') return `_isNa(${receiver}) || (${receiver} && ${receiver}.__tealscriptArray) || Array.isArray(${receiver})`;
    if (receiverType === 'matrix') return `_isNa(${receiver}) || ${receiver} && ${receiver}.__tealscriptMatrix`;
    if (receiverType === 'map') return `_isNa(${receiver}) || ${receiver} && ${receiver}.__tealscriptMap`;
    if (receiverType === 'float' || receiverType === 'int') return `typeof ${receiver} === "number"`;
    if (receiverType === 'string') return `typeof ${receiver} === "string"`;
    if (receiverType === 'bool') return `typeof ${receiver} === "boolean"`;
    return 'true';
  }

  function importedLocalMethodOverloadsByName(methodName: string): ImportedMethodOverloadInfo[] {
    const overloads: ImportedMethodOverloadInfo[] = [];
    for (const [name, candidates] of ctx.importedLocalMethods) {
      if (name.endsWith(`.${methodName}`)) overloads.push(...candidates);
    }
    return overloads;
  }

  function importedMethodAcceptsArgs(internalName: string, expr: CallExpression, start: number): boolean {
    const fi = ctx.funcInfos.get(internalName);
    if (!fi) return false;
    const allowedParams = fi.params.slice(start);
    const positionalCount = expr.arguments.filter((arg) => !arg.name).length;
    if (positionalCount > allowedParams.length) return false;
    return expr.arguments.every((arg) => !arg.name || allowedParams.includes(arg.name.name));
  }

  function emitUserFunctionCall(name: string, expr: CallExpression, receiver?: string, argumentValues?: Map<Expression, string>): string {
    const fi = ctx.funcInfos.get(name)!;
    const args = expr.arguments;
    const start = receiver ? 1 : 0;
    const validationError = validateImportedCall(name, expr, start, receiver !== undefined)
      ?? validateUserFunctionCall(name, expr, start, receiver !== undefined);
    if (validationError) return runtimeErrorExpr(validationError);
    const callSiteId = functionEmitContext.callSites.get(expr);
    const stateCallSiteId = callSiteId ?? functionEmitContext.defaultCallSites.get(expr);
    const arithmeticContextArgs = arithmeticTypes ? [functionStateNameStack.length > 0
      ? `_arithmeticContext?.calls[${callSiteId}]`
      : JSON.stringify(arithmeticContextDescriptor(arithmeticTypes.callTypeContexts?.get(expr)))] : [];
    const methodContextArgs = methodTypes ? [functionStateNameStack.length > 0
      ? `_methodContext?.calls[${callSiteId}]`
      : JSON.stringify(methodContextDescriptor(methodTypes.callTypeContexts?.get(expr)))] : [];
    const localVars = functionEmitContext.localVars.get(name) ?? [];
    const hasTACalls = ctx.funcInfos.get(name)?.hasTACalls ?? false;
    const historyParams = functionEmitContext.paramHistory.get(name) ?? new Set();
    const historyLocals = functionEmitContext.localHistory.get(name) ?? new Set();
    const needsHistory = (historyParams.size > 0 || historyLocals.size > 0) && stateCallSiteId !== undefined;
    const currentFunctionName = functionNameStack[functionNameStack.length - 1];
    const hasState = (functionNeedsState(name) || Boolean(currentFunctionName) && needsHistory) && stateCallSiteId !== undefined;
    const stateArg = hasState
      ? currentFunctionName
        ? `this._childFnState(${defaultArgumentStateStack.at(-1) ?? '_state'}, ${stateCallSiteId}, [${localVars.map((localVar) => JSON.stringify(jsPineName(localVar.name))).join(', ')}], ${hasTACalls ? 'true' : 'false'}, ${expressionHistoryFunctions.has(name) ? 'true' : 'false'}, [${localVars.filter((localVar) => localVar.kind === 'varip').map((localVar) => JSON.stringify(jsPineName(localVar.name))).join(', ')}], [${localVars.filter((localVar) => localVar.kind === 'var').map((localVar) => JSON.stringify(jsPineName(localVar.name))).join(', ')}])`
        : `this.${jsStateMember('_fn_state_', String(stateCallSiteId))}`
      : 'undefined';
    const values = receiver ? [receiver] : [];
    const positional = args.filter((arg) => !arg.name).map((arg) => arg.value);
    const sourceArgs = new Map<string, Expression>();
    if (receiver) sourceArgs.set(fi.params[0], (expr.callee as MemberExpression).object);
    for (let i = start; i < fi.params.length; i++) {
      const param = fi.params[i];
      const named = args.find((arg) => arg.name?.name === param)?.value;
      if (named) {
        values.push(argumentValues?.get(named) ?? emitExpr(named));
        sourceArgs.set(param, named);
        continue;
      }
      const positionalIndex = i - start;
      const positionalArg = positional[positionalIndex];
      const defaultArg = fi.paramDefaults[i];
      const valueArg = positionalArg ?? defaultArg;
      if (!positionalArg && defaultArg) {
        // Defaults use the definition scope; supplied arguments keep caller bindings.
        const callerLocals = localNameStack.splice(0);
        const callerPersistent = persistentLocalStack.splice(0);
        const callerSources = localSourceNameStack.splice(0);
        const callerHistory = localHistoryNameStack.splice(0);
        functionNameStack.push(name);
        defaultArgumentStateStack.push(ctx.importedFunctionOwners.has(name) ? '_state' : stateArg);
        try {
          values.push(emitExpr(defaultArg));
        } finally {
          defaultArgumentStateStack.pop();
          functionNameStack.pop();
          localNameStack.push(...callerLocals);
          persistentLocalStack.push(...callerPersistent);
          localSourceNameStack.push(...callerSources);
          localHistoryNameStack.push(...callerHistory);
        }
      } else {
        values.push(valueArg ? argumentValues?.get(valueArg) ?? emitExpr(valueArg) : 'undefined');
      }
      if (valueArg) sourceArgs.set(param, valueArg);
    }
    const sourceDescriptors = fi.params.map((param) => emitSourceDescriptor(sourceArgs.get(param), functionRequestsData(name)));
    if (!needsHistory) {
      return `this.${jsFunctionMember(name)}(${['ctx', stateArg, ...arithmeticContextArgs, ...methodContextArgs, ...values, ...sourceDescriptors, ...fi.params.map(() => 'undefined'), ...historyLocals].join(', ')})`;

    }
    const tempPrefix = `_fn_arg_${stateCallSiteId}_`;
    const scopedState = `${tempPrefix}state`;
    const setup = values.map((value, index) => `const ${tempPrefix}${index} = ${value};`).join(' ')
      + (currentFunctionName ? ` const ${scopedState} = ${stateArg};` : '');
    const historyMember = (kind: string, variable: string): string => currentFunctionName
      ? `this._functionHistory(${scopedState}, ${JSON.stringify(`${kind}:${variable}`)})`
      : `this.${jsStateMember(kind === 'param' ? '_fn_param_series_' : '_fn_local_series_', `${stateCallSiteId}_${variable}`)}`;
    const historyUpdates: string[] = [];
    const historyArgs = fi.params.map((param, index) => {
      if (!historyParams.has(param)) return 'undefined';
      const member = `${tempPrefix}history_${index}`;
      historyUpdates.push(`const ${member} = ${historyMember('param', param)};`);
      const fillSkippedBars = ctx.pineVersion === 6 && !currentFunctionName
        && functionEmitContext.conditionalCallSites.has(expr)
        && functionEmitContext.deepParamHistory.get(name)?.has(param);
      historyUpdates.push(`${member}.__tealscriptLastBar = this._updateScopeHistory(${member}, ${member}.__tealscriptLastBar, ${tempPrefix}${index}, ctx.barIndex${fillSkippedBars ? '' : ', false'});`);
      return member;
    });
    const localHistoryArgs = [...historyLocals].map((local) => historyMember('local', local));
    const callValues = fi.params.map((_, index) => `${tempPrefix}${index}`);
    return `(() => { ${setup} ${historyUpdates.join(' ')} return this.${jsFunctionMember(name)}(${['ctx', currentFunctionName ? scopedState : stateArg, ...arithmeticContextArgs, ...methodContextArgs, ...callValues, ...sourceDescriptors, ...historyArgs, ...localHistoryArgs].join(', ')}); })()`;

  }

  function validateUserFunctionCall(name: string, expr: CallExpression, start: number, isMethod: boolean): string | undefined {
    const fi = ctx.funcInfos.get(name);
    if (!fi) return undefined;
    const displayName = isMethod && expr.callee.type === 'MemberExpression'
      ? expr.callee.property.name
      : name;
    const kind = isMethod ? 'method' : 'function';
    const allowedParams = fi.params.slice(start);
    const allowed = new Set(allowedParams);
    const namedBindings = new Set<string>();
    const positionalBindings = new Set<string>();
    let sawNamed = false;
    let positionalIndex = 0;

    for (const arg of expr.arguments) {
      if (arg.name) {
        sawNamed = true;
        const argName = arg.name.name;
        if (!allowed.has(argName)) return `Unknown argument '${argName}' for ${kind} ${displayName}`;
        if (namedBindings.has(argName)) return `Argument '${argName}' for ${kind} ${displayName} was supplied multiple times`;
        if (positionalBindings.has(argName)) return `Argument '${argName}' for ${kind} ${displayName} was supplied multiple times`;
        namedBindings.add(argName);
        continue;
      }
      if (sawNamed) return `${kind} ${displayName} cannot use positional arguments after named arguments`;
      const param = allowedParams[positionalIndex];
      if (!param) return `Too many arguments for ${kind} ${displayName}: expected ${allowedParams.length}, got ${positionalIndex + 1}`;
      if (namedBindings.has(param)) return `Argument '${param}' for ${kind} ${displayName} was supplied multiple times`;
      positionalBindings.add(param);
      positionalIndex += 1;
    }

    const supplied = new Set([...namedBindings, ...positionalBindings]);
    for (const param of allowedParams) {
      if (supplied.has(param)) continue;
      if (!fi.paramDefaults[fi.params.indexOf(param)]) {
        return `${kind} ${displayName} missing required argument '${param}'`;
      }
    }
    return undefined;
  }

  function validateImportedCall(name: string, expr: CallExpression, start: number, isMethod: boolean): string | undefined {
    const fi = ctx.funcInfos.get(name);
    if (!fi || !name.includes('__')) return undefined;
    const functionDisplayName = importedFunctionDisplayName(name);
    const methodName = importedMethodDisplayName(name);
    const displayName = isMethod && methodName
      ? methodName
      : functionDisplayName;
    if (!displayName) return undefined;

    const allowedParams = fi.params.slice(start);
    const allowed = new Set(allowedParams);
    for (const arg of expr.arguments) {
      if (arg.name && !allowed.has(arg.name.name)) {
        return `Unknown argument '${arg.name.name}' for library ${isMethod ? 'method' : 'function'} ${displayName}`;
      }
    }

    const positionalCount = expr.arguments.filter((arg) => !arg.name).length;
    if (positionalCount > allowedParams.length) {
      return `Too many arguments for library ${isMethod ? 'method' : 'function'} ${displayName}: expected ${allowedParams.length}, got ${positionalCount}`;
    }

    let positionalIndex = 0;
    for (const param of allowedParams) {
      const named = expr.arguments.some((arg) => arg.name?.name === param);
      const hasPositional = positionalIndex < positionalCount;
      if (!named && hasPositional) {
        positionalIndex += 1;
        continue;
      }
      if (!named && !fi.paramDefaults[fi.params.indexOf(param)]) {
        return `library ${isMethod ? 'method' : 'function'} ${displayName} missing required argument '${param}'`;
      }
    }
    return undefined;
  }

  function functionNeedsState(name: string, seen = new Set<string>()): boolean {
    if (seen.has(name)) return false;
    seen.add(name);
    const info = ctx.funcInfos.get(name);
    if (info?.hasTACalls) return true;
    if (info) {
      let containsCalls = functionCallPresence.get(info);
      if (containsCalls === undefined) {
        containsCalls = containsFunctionCall(info.body) || info.paramDefaults.some(containsFunctionCall);
        functionCallPresence.set(info, containsCalls);
      }
      if (containsCalls) return true;
    }
    if ((functionEmitContext.localVars.get(name)?.length ?? 0) > 0) return true;
    if (expressionHistoryFunctions.has(name)) return true;
    // A request's captured expression belongs to a stable UDF call scope even
    // when the function has no persistent variables or TA state.
    if (ctx.securitySites.some((site) => site.ownerFunctionName === name)) return true;
    for (const callee of functionEmitContext.calledFunctions.get(name) ?? []) {
      if (functionNeedsState(callee, seen)) return true;
    }
    return false;
  }

  function nextBuiltinCallId(name: string): string {
    const count = builtinCallCounts.get(name) ?? 0;
    builtinCallCounts.set(name, count + 1);
    return scopedBuiltinCallId(`${name}_${count}`);
  }

  function builtinCallId(name: string, expr: CallExpression): string {
    if ((name === 'alert' || name === 'math.random') && expr.loc) {
      return scopedBuiltinCallId(`${name}_${expr.loc.start.line}_${expr.loc.start.column}`);
    }
    return nextBuiltinCallId(name);
  }

  function getFunctionParameterType(expr: Expression): VariableDeclaration['typeAnnotation'] {
    // A missing receiver has no wrapper tag. Retain its declared type without
    // leaking parameter names into the global collection-variable lookup.
    if (expr.type !== 'Identifier' || currentLocalName(expr.name) !== localParamName(expr.name)) return undefined;
    const functionName = functionNameStack[functionNameStack.length - 1];
    const info = functionName ? ctx.funcInfos.get(functionName) : undefined;
    if (!info) return undefined;
    return info.paramTypes[info.params.indexOf(expr.name)];
  }

  function getCollectionParameterKind(expr: Expression): CollectionKind | undefined {
    return collectionKindFromTypeAnnotation(getFunctionParameterType(expr));
  }

  function scopedBuiltinCallId(id: string): string {
    const literal = JSON.stringify(id);
    return functionNameStack.length > 0
      ? `this._builtinCallId(${currentFunctionStateName()}, ${literal})`
      : literal;
  }

  function getCollectionExprKind(expr: Expression): CollectionKind | undefined {
    if (expr.type === 'Identifier') return collectionVars.get(expr.name);
    if (expr.type === 'ArrayExpression') return 'array';
    if (expr.type === 'MemberExpression') {
      const memberName = staticMemberChainName(expr);
      if (expr.property.name === 'all' && expr.object.type === 'Identifier' && DRAWING_NAMESPACES.has(expr.object.name) && expr.object.name !== 'chart') return 'array';
      const knownMemberKind = memberName ? collectionVars.get(memberName) : undefined;
      if (knownMemberKind) return knownMemberKind;
      if (expr.object.type === 'CallExpression') return getCollectionExprKind(expr.object);
      return undefined;
    }
    if (expr.type !== 'CallExpression') return undefined;

    const fullName = getMemberChainName(expr.callee) ?? (expr.callee.type === 'Identifier' ? expr.callee.name : '');
    if (fullName === 'ta.pivot_point_levels') return 'array';
    if (fullName === 'array.new' || fullName.startsWith('array.new_') || fullName === 'array.from') return 'array';
    if (fullName === 'map.new') return 'map';
    if (fullName === 'matrix.new' || fullName.startsWith('matrix.new_')) return 'matrix';
    if (
      expr.callee.type === 'MemberExpression'
      && expr.callee.object.type === 'Identifier'
      && collectionVars.has(expr.callee.object.name)
    ) {
      return undefined;
    }
    if (fullName.startsWith('array.')) return COLLECTION_METHOD_RETURNS.array[fullName.slice('array.'.length)];
    if (fullName.startsWith('map.')) return COLLECTION_METHOD_RETURNS.map[fullName.slice('map.'.length)];
    if (fullName.startsWith('matrix.')) return COLLECTION_METHOD_RETURNS.matrix[fullName.slice('matrix.'.length)];

    const methodKind = getCollectionMethodKind(expr);
    if (!methodKind || expr.callee.type !== 'MemberExpression') return undefined;
    return COLLECTION_METHOD_RETURNS[methodKind][expr.callee.property.name];
  }

  function getCollectionMethodKind(expr: CallExpression): CollectionKind | undefined {
    if (expr.callee.type !== 'MemberExpression') return undefined;
    const method = expr.callee.property.name;
    if (!COLLECTION_METHOD_NAMES.has(method)) return undefined;
    const kind = getCollectionExprKind(expr.callee.object);
    if (
      kind === 'matrix'
      && expr.callee.object.type === 'Identifier'
      && expr.callee.object.name === 'matrix'
      && isStaticCollectionNamespaceCall(expr, kind)
    ) return undefined;
    return kind && isCollectionReceiverMethod(kind, method) ? kind : undefined;
  }

  function emitExpressionStatement(expr: Expression, loc?: SourceLocation): string {
    if (expr.type === 'CallExpression') {
      const fullName = getMemberChainName(expr.callee) ?? (expr.callee.type === 'Identifier' ? expr.callee.name : '');
      if (fullName === 'runtime.error') return emitRuntimeErrorCall(expr, runtimeErrorLocStack[0] ?? loc ?? expr.loc);
    }
    return emitExpr(expr);
  }

  function emitTrueRangeMemberValue(): string {
    return `(() => { const _prevClose = this._s_close.get(1); return _prevClose === undefined || _isNa(_prevClose) ? NaN : Math.max(ctx.bar.high - ctx.bar.low, Math.abs(ctx.bar.high - _prevClose), Math.abs(ctx.bar.low - _prevClose)); })()`;
  }

  function emitWithRuntimeErrorLoc(loc: SourceLocation | undefined, fn: () => void): void {
    if (!loc || runtimeErrorLocStack.length > 0) {
      fn();
      return;
    }
    runtimeErrorLocStack.push(loc);
    try {
      fn();
    } finally {
      runtimeErrorLocStack.pop();
    }
  }

  function emitRuntimeErrorCall(expr: CallExpression, loc?: SourceLocation): string {
    const posArgs = expr.arguments.filter((a) => !a.name).map((a) => emitExpr(a.value));
    return `ctx.runtimeError([${posArgs.join(', ')}], ${emitNamedArgsObj(expr.arguments)}, ${loc?.start.line ?? 'undefined'}, ${loc?.start.column ?? 'undefined'})`;
  }

  function getMemberChainName(expr: Expression): string | undefined {
    if (expr.type === 'Identifier') return expr.name;
    if (expr.type !== 'MemberExpression') return undefined;
    const objectName = getMemberChainName(expr.object);
    return objectName ? `${objectName}.${expr.property.name}` : undefined;
  }

  function emitUdtConstructor(typeName: string, expr: CallExpression): string {
    const typeInfo = ctx.typeDecls.get(typeName)!;
    const namedArgs = new Map<string, string>();
    const positionalArgs: string[] = [];
    let sawNamed = false;
    for (const arg of expr.arguments) {
      if (arg.name) {
        sawNamed = true;
        namedArgs.set(arg.name.name, emitExpr(arg.value));
      } else {
        if (sawNamed) {
          return runtimeErrorExpr(`${typeInfo.name}.new cannot use positional arguments after named arguments`);
        }
        positionalArgs.push(emitExpr(arg.value));
      }
    }
    const fieldEntries: string[] = [];
    const varipFields: string[] = [];
    for (let i = 0; i < typeInfo.fields.length; i++) {
      const field = typeInfo.fields[i];
      let value: string;
      if (namedArgs.has(field.name)) {
        value = namedArgs.get(field.name)!;
      } else if (i < positionalArgs.length) {
        value = positionalArgs[i];
      } else if (field.defaultExpr) {
        value = emitExpr(field.defaultExpr);
      } else {
        value = typeInfo.node.fields[i].typeAnnotation?.baseType === 'bool' && !versionRules.allowsBoolNaHelpers ? 'false' : 'NaN';
      }
      fieldEntries.push(value);
      if (field.varip) varipFields.push(`"${field.name}"`);
    }
    let factory = udtFactories.get(typeName);
    if (!factory) {
      factory = { member: `_udtCtor_${udtFactories.size}`, names: typeInfo.fields.map((field) => field.name), varip: varipFields };
      udtFactories.set(typeName, factory);
    }
    return `this.${factory.member}([${fieldEntries.join(', ')}])`;
  }

  function importedPrivateCallErrorMessage(expr: CallExpression): string | undefined {
    if (currentImportedAlias()) return undefined;
    if (expr.callee.type !== 'MemberExpression') return undefined;
    const fullName = getMemberChainName(expr.callee) ?? '';
    const namespace = fullName.split('.')[0] ?? '';
    if (expr.callee.property.name === 'new') {
      const constructorTypeName = getMemberChainName(expr.callee.object);
      if (constructorTypeName && ctx.importedNamespaces.has(namespace) && !ctx.typeDecls.has(constructorTypeName) && ctx.importedLocalTypes.has(constructorTypeName)) {
        return `Unknown library type: ${constructorTypeName}`;
      }
      return undefined;
    }

    const memberCall = expr as CallExpression & { callee: MemberExpression };
    const localOverloads = importedLocalMethodOverloadsByName(expr.callee.property.name);
    if (localOverloads.length === 0) return undefined;
    const publicOverloads = ctx.importedMethodOverloads.get(expr.callee.property.name) ?? [];
    if (publicOverloads.length === 0) return `Unknown function: ${memberCallName(memberCall)}`;
    const publicInternalNames = new Set(publicOverloads.map((overload) => overload.internalName));
    const privateMatchingOverload = localOverloads.some((overload) => !publicInternalNames.has(overload.internalName) && importedMethodAcceptsArgs(overload.internalName, expr, 1));
    return privateMatchingOverload ? `Unknown function: ${memberCallName(memberCall)}` : undefined;
  }

  function emitTACall(site: TACallSite, _expr: CallExpression): string {
    const args = site.computeArgExprs.map(emitExpr);
    const scoped = isFunctionScopedTASite(site);
    const emitCtorArg = (argument: Expression, index: number): string => {
      const value = emitExpr(argument);
      return index === 0 && (site.integerDivisionLength || site.truncateTimeframeRatioLength) ? `Math.trunc(${value})` : value;
    };
    const ctorArgExpr = site.dynamicCtorArgExprs
      ? `[${site.dynamicCtorArgExprs.map(emitCtorArg).join(', ')}]`
      : `[${site.ctorArgs.map((arg) => JSON.stringify(arg)).join(', ')}]`;
    let member = scoped
      ? `this._scopedTA(${currentFunctionStateName()}, "${site.memberName}", "${site.className}", ${ctorArgExpr})`
      : site.dynamicCtorArgExprs
      ? `this._dynamicTA("${site.memberName}", "${site.className}", [${site.dynamicCtorArgExprs.map(emitCtorArg).join(', ')}])`
      : `this.${site.memberName}`;
    if (site.captureInitialCtorArgs) {
      const state = scoped ? currentFunctionStateName() : 'undefined';
      member = `(() => { const _args = ${ctorArgExpr}; const _state = ${state}; const _last = _state ? _state.__taLast?.get("${site.memberName}") : this._dynamicTALast.get("${site.memberName}"); return _last?.instance ?? this._scopedTA(_state, "${site.memberName}", "${site.className}", _args); })()`;
    }

    if (ctx.pineVersion === 5 && ['Cross', 'Crossover', 'Crossunder'].includes(site.className)) {
      return `(() => { const _a = ${args[0]}; const _b = ${args[1]}; const _instance = ${member}; const _value = ctx.isFirstTick ? _instance.compute(_a, _b) : _instance.recompute(_a, _b); return _a !== _a || _b !== _b ? NaN : _value; })()`;
    }

    const momentumHistory = momentumSourceHistory.get(site);
    if (momentumHistory) {
      const state = scoped ? currentFunctionStateName() : 'undefined';
      const source = args[0] ?? 'NaN';
      const length = site.dynamicCtorArgExprs?.[0] ? emitExpr(site.dynamicCtorArgExprs[0]) : '10';
      const history = `this._expressionHistory(${state}, "${momentumHistory}", ${source}, ctx.barIndex)`;
      return site.className === 'Mom'
        ? `this._momFromSeries(${history}, ${length})`
        : `this._lagChangeFromSeries(${history}, ${length}, ${site.className === 'ROC'})`;
    }
    if (site.className === 'PivotPointLevels') {
      const computeArgs = [...args, 'ctx.bar.open', 'ctx.bar.high', 'ctx.bar.low', 'ctx.bar.close'].join(', ');
      return `deps._arr.from(...(ctx.isFirstTick ? ${member}.compute(${computeArgs}) : ${member}.recompute(${computeArgs})))`;
    }
    if (site.dynamicCtorArgExprs && (site.className === 'Variance' || site.className === 'StdDev')) {
      const instance = scoped
        ? `this._scopedTA(${currentFunctionStateName()}, "${site.memberName}", "${site.className}", _args)`
        : `this._dynamicTA("${site.memberName}", "${site.className}", _args)`;
      return `(() => { const _args = ${ctorArgExpr}; const _instance = ${instance}; return ctx.isFirstTick ? _instance.compute(${args[0]}, _args[1]) : _instance.recompute(${args[0]}, _args[1]); })()`;
    }

    if (site.className === 'ATR') {
      return `(ctx.isFirstTick ? ${member}.compute(ctx.bar.high, ctx.bar.low, ctx.bar.close) : ${member}.recompute(ctx.bar.high, ctx.bar.low, ctx.bar.close))`;
    }

    if (site.className === 'Falling' && site.dynamicCtorArgExprs) {
      const state = scoped ? currentFunctionStateName() : 'undefined';
      const persistent = scoped
        ? `this._scopedTA(${state}, "${site.memberName}", "Falling", [1])`
        : `this._dynamicTA("${site.memberName}", "Falling", [1])`;
      const length = emitExpr(site.dynamicCtorArgExprs[0]);
      const source = args[0] ?? 'NaN';
      return `(ctx.isFirstTick ? ${persistent}.compute(${source}, ${length}) : ${persistent}.recompute(${source}, ${length}))`;
    }

    const windowSeries = taSourceSeries.get(site);
    if (percentRankHistorySites.has(site) && windowSeries) {
      const state = scoped ? currentFunctionStateName() : 'undefined';
      const history = `this._expressionHistory(${state}, ${JSON.stringify(windowSeries)}, ${args[0]}, ctx.barIndex)`;
      return `this._deps.PercentRank.computeWindow(${history}, ${emitExpr(site.dynamicCtorArgExprs![0])})`;
    }
    if (site.dynamicCtorArgExprs && sharedHistorySites.has(site) && windowSeries) {
      const state = scoped ? currentFunctionStateName() : 'undefined';
      const source = `[ctx.barIndex, [${args.join(', ')}]]`;
      return `this._historyTAFromSeries(${state}, ${JSON.stringify(site.memberName)}, ${JSON.stringify(site.className)}, ${ctorArgExpr}, this._expressionHistory(${state}, ${JSON.stringify(windowSeries)}, ${source}, ctx.barIndex), ctx.barIndex)`;
    }
    if (site.dynamicCtorArgExprs && dynamicWindowClasses.has(site.className) && windowSeries) {
      const source = args[0] ?? (site.className.startsWith('Highest') || site.className === 'PivotHigh' ? 'ctx.bar.high' : 'ctx.bar.low');
      const state = scoped ? currentFunctionStateName() : 'undefined';
      const sourceHistory = site.className === 'WMA' ? '_wmaSourceHistory' : '_expressionHistory';
      return `this._windowTAFromSeries(this.${sourceHistory}(${state}, ${JSON.stringify(windowSeries)}, ${source}, ctx.barIndex), ${JSON.stringify(site.className)}, ${ctorArgExpr}, ctx.barIndex)`;
    }

    if (site.className === 'TrueRange') {
      return `(ctx.isFirstTick ? ${member}.compute(ctx.bar.high, ctx.bar.low, ctx.bar.close) : ${member}.recompute(ctx.bar.high, ctx.bar.low, ctx.bar.close))`;
    }

    if (site.className === 'DMI' || site.className === 'ADX') {
      return `(ctx.isFirstTick ? ${member}.compute(ctx.bar.high, ctx.bar.low, ctx.bar.close) : ${member}.recompute(ctx.bar.high, ctx.bar.low, ctx.bar.close))`;
    }

    if (site.className === 'Supertrend') {
      return `(ctx.isFirstTick ? ${member}.compute(ctx.bar.high, ctx.bar.low, ctx.bar.close, ${args[0]}) : ${member}.recompute(ctx.bar.high, ctx.bar.low, ctx.bar.close, ${args[0]}))`;
    }

    if (site.className === 'SAR') {
      return `(ctx.isFirstTick ? ${member}.compute(ctx.bar.high, ctx.bar.low, ctx.bar.close) : ${member}.recompute(ctx.bar.high, ctx.bar.low, ctx.bar.close))`;
    }

    if (site.className === 'SMA' && (scoped || localTASites.has(site))) {
      return `(ctx.isFirstTick ? ${member}.compute(${args.join(', ')}) : ${member}.recompute(${args.join(', ')}))`;
    }

    if (site.className === 'SMA' && site.computeArgExprs[0]?.type === 'Identifier' && !isRootGlobalShadow(site.computeArgExprs[0].name)) {
      const sourceName = site.computeArgExprs[0].name;
      const historyName = currentLocalHistoryName(sourceName);
      const sourceSeries = historyName
        ?? (sourceName in BAR_FIELDS ? `this.${BAR_FIELDS[sourceName]}` : undefined)
        ?? (ctx.seriesVars.has(sourceName) ? `this.${jsSeriesMember(sourceName)}` : undefined);
      if (sourceSeries) {
        const length = site.dynamicCtorArgExprs?.[0]
          ? emitCtorArg(site.dynamicCtorArgExprs[0], 0)
          : JSON.stringify(site.ctorArgs[0] ?? 0);
        return `this._sma_source_${site.memberName}.compute(${sourceSeries}, ${length}, ctx.barIndex)`;
      }
    }
    const smaExpressionSeries = taSourceSeries.get(site);
    if (site.className === 'SMA' && smaExpressionSeries) {
      const length = site.dynamicCtorArgExprs?.[0]
        ? emitCtorArg(site.dynamicCtorArgExprs[0], 0)
        : JSON.stringify(site.ctorArgs[0] ?? 0);
      if (inlineTASourceSeries.has(site)) {
        const source = site.computeArgExprs[0] ? emitExpr(site.computeArgExprs[0]) : 'NaN';
        return `(() => { const _series = this.${smaExpressionSeries}; const _value = ${source}; if (this.${smaExpressionSeries}_bar < ctx.barIndex - 1) { for (let index = this.${smaExpressionSeries}_bar + 1; index < ctx.barIndex; index += 1) _series.push(NaN); } if (this.${smaExpressionSeries}_bar === ctx.barIndex) _series.update(_value); else _series.push(_value); this.${smaExpressionSeries}_bar = ctx.barIndex; return this._sma_source_${site.memberName}.compute(_series, ${length}, ctx.barIndex); })()`;
      }
      return `this._sma_source_${site.memberName}.compute(this.${smaExpressionSeries}, ${length}, ctx.barIndex)`;
    }

    if (site.className === 'VWAP') {
      const sourceName = ctx.pineVersion <= 4 ? 'x' : 'source';
      const sourceArg = readOrderedCallArg(site.node.arguments, [sourceName, 'anchor', 'stdev_mult'], sourceName, 0);
      const anchorArg = readOrderedCallArg(site.node.arguments, ['source', 'anchor', 'stdev_mult'], 'anchor', 1);
      const source = sourceArg ? emitExpr(sourceArg) : '((ctx.bar.high + ctx.bar.low + ctx.bar.close) / 3)';
      const anchor = anchorArg ? emitExpr(anchorArg)
        : `(ctx.barIndex === 0 || ctx.callBuiltin("timeframe.change", ["1D"], {}, ${nextBuiltinCallId('timeframe.change')}))`;
      const multiplierArg = readOrderedCallArg(site.node.arguments, ['source', 'anchor', 'stdev_mult'], 'stdev_mult', 2);
      const multiplier = multiplierArg ? emitExpr(multiplierArg) : 'NaN';
      return `(ctx.isFirstTick ? ${member}.compute(${source}, ${anchor}, ctx.bar.volume, ${multiplier}) : ${member}.recompute(${source}, ${anchor}, ctx.bar.volume, ${multiplier}))`;
    }

    if (site.className === 'WPR') {
      return `(ctx.isFirstTick ? ${member}.compute(ctx.bar.high, ctx.bar.low, ctx.bar.close) : ${member}.recompute(ctx.bar.high, ctx.bar.low, ctx.bar.close))`;
    }

    if (site.className === 'OBV') {
      const source = args[0] ?? 'ctx.bar.close';
      const volume = args[1] ?? 'ctx.bar.volume';
      return `(ctx.isFirstTick ? ${member}.compute(${source}, ${volume}) : ${member}.recompute(${source}, ${volume}))`;
    }

    if (site.className === 'BarIndex') {
      const source = args[0] ?? 'NaN';
      return `(ctx.isFirstTick ? ${member}.compute(${source}, ctx.barIndex) : ${member}.recompute(${source}, ctx.barIndex))`;
    }

    if (site.className === 'VWMA') {
      const source = args[0] ?? 'ctx.bar.close';
      return `(ctx.isFirstTick ? ${member}.compute(${source}, ctx.bar.volume) : ${member}.recompute(${source}, ctx.bar.volume))`;
    }

    if (site.className === 'Highest') {
      const source = args[0] ?? 'ctx.bar.high';
      return `(ctx.isFirstTick ? ${member}.compute(${source}) : ${member}.recompute(${source}))`;
    }

    if (site.className === 'Lowest') {
      const source = args[0] ?? 'ctx.bar.low';
      return `(ctx.isFirstTick ? ${member}.compute(${source}) : ${member}.recompute(${source}))`;
    }

    if (site.className === 'MFI') {
      const source = args[0] ?? '((ctx.bar.high + ctx.bar.low + ctx.bar.close) / 3)';
      return `(ctx.isFirstTick ? ${member}.compute(${source}, ctx.bar.volume) : ${member}.recompute(${source}, ctx.bar.volume))`;
    }

    if (site.className === 'KC' || site.className === 'KCW') {
      const source = args[0] ?? 'ctx.bar.close';
      return `(ctx.isFirstTick ? ${member}.compute(${source}, ctx.bar.high, ctx.bar.low, ctx.bar.close) : ${member}.recompute(${source}, ctx.bar.high, ctx.bar.low, ctx.bar.close))`;
    }

    if (site.className === 'HighestBars') {
      const source = args[0] ?? 'ctx.bar.high';
      return `(ctx.isFirstTick ? ${member}.compute(${source}) : ${member}.recompute(${source}))`;
    }

    if (site.className === 'LowestBars') {
      const source = args[0] ?? 'ctx.bar.low';
      return `(ctx.isFirstTick ? ${member}.compute(${source}) : ${member}.recompute(${source}))`;
    }

    if (site.className === 'PivotHigh') {
      const source = args[0] ?? 'ctx.bar.high';
      return `(ctx.isFirstTick ? ${member}.compute(${source}) : ${member}.recompute(${source}))`;
    }

    if (site.className === 'PivotLow') {
      const source = args[0] ?? 'ctx.bar.low';
      return `(ctx.isFirstTick ? ${member}.compute(${source}) : ${member}.recompute(${source}))`;
    }

    const argStr = args.join(', ');
    return `(ctx.isFirstTick ? ${member}.compute(${argStr}) : ${member}.recompute(${argStr}))`;
  }

  function emitNamedArgsObj(args: { name?: Identifier; value: Expression }[]): string {
    const entries = args.filter((a) => a.name).map((a) => `${a.name!.name}: ${emitExpr(a.value)}`);
    return entries.length > 0 ? `{${entries.join(', ')}}` : '{}';
  }

  function inputDefaultSourceName(value: Expression | undefined): string | undefined {
    if (value?.type !== 'Identifier') return undefined;
    return ['open', 'high', 'low', 'close', 'hl2', 'hlc3', 'ohlc4', 'hlcc4', 'volume', 'bid', 'ask'].includes(value.name)
      ? value.name
      : undefined;
  }

  function hasStaticInputTitle(args: { name?: Identifier; value: Expression }[]): boolean {
    const namedTitle = args.find((arg) => arg.name?.name === 'title');
    if (namedTitle) return namedTitle.value.type === 'StringLiteral';

    let positionalIndex = 0;
    for (const arg of args) {
      if (arg.name) continue;
      if (positionalIndex === 1) return arg.value.type === 'StringLiteral';
      positionalIndex++;
    }

    return true;
  }

  function duplicateNamedArgument(args: { name?: Identifier | null }[]): string | undefined {
    const names = new Set<string>();
    for (const arg of args) {
      const name = arg.name?.name;
      if (!name) continue;
      if (names.has(name)) return name;
      names.add(name);
    }
    return undefined;
  }

  function emitOrderedArg(args: { name?: Identifier; value: Expression }[], names: string[], name: string, index: number): string | undefined {
    const expression = orderedArgExpression(args, names, name, index);
    return expression ? emitExpr(expression) : undefined;
  }

  function orderedArgExpression(args: { name?: Identifier; value: Expression }[], names: readonly string[], name: string, index: number): Expression | undefined {
    const named = args.find((arg) => arg.name?.name === name)?.value;
    if (named) return named;
    const positional = args.filter((arg) => !arg.name).map((arg) => arg.value);
    const positionalIndex = index - names.slice(0, index).filter((param) => args.some((arg) => arg.name?.name === param)).length;
    return positional[positionalIndex];
  }

  function emitOrderedCallArgs(
    args: { name?: Identifier; value: Expression }[],
    names: readonly string[],
    aliases: Record<string, string> = {},
  ): string[] {
    const namedArgs = new Map<string, Expression>();
    for (const arg of args) {
      if (!arg.name) continue;
      namedArgs.set(aliases[arg.name.name] ?? arg.name.name, arg.value);
    }

    const positional = args.filter((arg) => !arg.name).map((arg) => arg.value);
    const values: Array<string | undefined> = [];
    for (let index = 0; index < names.length; index++) {
      const name = names[index]!;
      const named = namedArgs.get(name);
      if (named) {
        values.push(emitExpr(named));
        continue;
      }
      const positionalIndex = index - names.slice(0, index).filter((param) => namedArgs.has(param)).length;
      const positionalArg = positional[positionalIndex];
      values.push(positionalArg ? emitExpr(positionalArg) : undefined);
    }
    while (values.length > 0 && values[values.length - 1] === undefined) values.pop();
    return values.map((value) => value ?? 'undefined');
  }

  function emitVariadicCallArgs(
    args: { name?: Identifier; value: Expression }[],
    prefix: string,
  ): string[] {
    const values: Array<string | undefined> = [];
    const assigned: boolean[] = [];
    for (const arg of args) {
      if (!arg.name) continue;
      const match = arg.name.name.match(new RegExp(`^${prefix}(\\d+)$`));
      if (!match) continue;
      const index = Number(match[1]);
      if (!Number.isSafeInteger(index)) continue;
      values[index] = emitExpr(arg.value);
      assigned[index] = true;
    }
    for (const arg of args) {
      if (arg.name) continue;
      let index = 0;
      while (assigned[index]) index += 1;
      values[index] = emitExpr(arg.value);
      assigned[index] = true;
    }
    while (values.length > 0 && values[values.length - 1] === undefined) values.pop();
    return values.map((value) => value ?? 'undefined');
  }

  function hasPositionalReceiverBeforeNamedArg(args: { name?: Identifier; value: Expression }[], receiverName: string): boolean {
    let sawPositional = false;
    for (const arg of args) {
      if (!arg.name) sawPositional = true;
      if (arg.name?.name === receiverName) return sawPositional;
    }
    return false;
  }

  function emitCollectionReceiverArgs(
    args: { name?: Identifier; value: Expression }[],
    method: string,
    fallbackPosArgs: string[],
    kindHint?: CollectionKind,
  ): string[] {
    const candidates = kindHint ? [`${kindHint}.${method}`] : [`array.${method}`, `map.${method}`, `matrix.${method}`];
    const matchingCandidates = candidates.filter((candidate) => collectionArgNames(candidate));
    if (matchingCandidates.length !== 1) return fallbackPosArgs;
    const fullName = matchingCandidates[0]!;
    const argNames = collectionArgNames(fullName)?.slice(1);
    if (!argNames) return fallbackPosArgs;
    return emitCollectionCallArgs(fullName, args, argNames);
  }

  function readOrderedCallArg(args: CallArgument[], names: readonly string[], name: string, index: number): Expression | undefined {
    const named = args.find((arg) => arg.name?.name === name)?.value;
    if (named) return named;
    const positional = args.filter((arg) => !arg.name).map((arg) => arg.value);
    const priorNamedCount = names.slice(0, index).filter((param) => args.some((arg) => arg.name?.name === param)).length;
    return positional[index - priorNamedCount];
  }

  function isStaticNamespaceReceiver(expr: Expression): boolean {
    if (expr.type === 'Identifier' && collectionVars.has(expr.name)) return false;
    const receiverName = getMemberChainName(expr);
    return isStaticNamespaceReceiverName(receiverName);
  }

  function isStaticCollectionNamespaceCall(expr: CallExpression, kind: CollectionKind): boolean {
    if (expr.callee.type !== 'MemberExpression') return true;
    if (expr.callee.object.type !== 'Identifier' || expr.callee.object.name !== kind) return true;
    if (!collectionVars.has(kind)) return true;
    if (!currentLocalName(kind) && !currentPersistentLocalName(kind) && !rootRegularVars.has(kind) && !rootPersistentVars.has(kind)) return true;
    const method = expr.callee.property.name;
    if (kind === 'matrix' && (method === 'get' || method === 'set')) {
      const names = MATRIX_ARG_NAMES[`matrix.${method}`]!;
      const id = readOrderedCallArg(expr.arguments, names, 'id', 0);
      if (expr.arguments.length === names.length && id && getCollectionExprKind(id) === kind) return true;
    }
    if (method === 'new'
      || (kind === 'array' && (method === 'from' || method.startsWith('new_')))
      || (kind === 'matrix' && method.startsWith('new_'))) return true;
    const fullName = `${kind}.${method}`;
    const argNames = collectionArgNames(fullName);
    if (!argNames?.[0]) return false;
    const aliases = collectionArgAliases(fullName);
    const namedReceiver = expr.arguments.find((arg) => arg.name && (aliases[arg.name.name] ?? arg.name.name) === argNames[0]);
    // A single other collection is the argument to a receiver method such as
    // matrix.sum(other), not a complete namespace call matrix.sum(id1, id2).
    if (!namedReceiver && argNames[1] === 'id2' && expr.arguments.length === 1) return false;
    const receiver = namedReceiver?.value ?? expr.arguments.find((arg) => !arg.name)?.value;
    return receiver !== undefined && getCollectionExprKind(receiver) === kind;
  }

  function emitCollectionCallArgs(
    fullName: string,
    args: { name?: Identifier; value: Expression }[],
    names: readonly string[],
  ): string[] {
    if (fullName.startsWith('matrix.')) return emitMatrixCallArgs(fullName, args, names);
    return emitOrderedCallArgs(args, names, collectionArgAliases(fullName));
  }

  function emitMatrixCallArgs(
    fullName: string,
    args: { name?: Identifier; value: Expression }[],
    names: readonly string[],
  ): string[] {
    const hasNamedInsertIndex = args.some((arg) => arg.name?.name === 'row' || arg.name?.name === 'column');
    const hasNamedArray = args.some((arg) => arg.name?.name === 'array_id');
    const positional = args.filter((arg) => !arg.name);
    const firstName = names[0];
    const arrayIsSecondArg = fullName === 'matrix.add_row' || fullName === 'matrix.add_col' || fullName === 'matrix.add_column';
    // Keep numeric indices in the index slot; preserve the existing array shorthand.
    // A runtime distinction also covers UDF returns without evaluating them twice.
    const insertArgument = (value: Expression): string =>
      `...((value) => typeof value === "number" ? [value] : [undefined, value])(${emitExpr(value)})`;
    if (arrayIsSecondArg && !hasNamedInsertIndex && !hasNamedArray) {
      if (firstName === 'id') {
        const namedId = args.find((arg) => arg.name?.name === 'id')?.value;
        if (namedId && positional.length === 1) {
          return [emitExpr(namedId), insertArgument(positional[0]!.value)];
        }
        if (!namedId && positional.length === 2) {
          return [emitExpr(positional[0]!.value), insertArgument(positional[1]!.value)];
        }
      } else if (positional.length === 1) {
        return [insertArgument(positional[0]!.value)];
      }
    }
    return emitOrderedCallArgs(args, names, MATRIX_ARG_ALIASES[fullName]);
  }

  function isFunctionScopedTASite(site: TACallSite): boolean {
    const currentFunctionName = functionNameStack[functionNameStack.length - 1];
    return currentFunctionName !== undefined && taSiteFunctionNames.get(site) === currentFunctionName;
  }

  function emitPlotCall(funcName: string, expr: CallExpression): string {
    const site = ctx.plotSites.find((p) => p.node === expr);
    const idx = site?.index ?? 0;
    const funcCallIndex = site?.funcCallIndex ?? 0;
    const posArgs = expr.arguments.filter((a) => !a.name).map((a) => emitExpr(a.value));
    const namedObj = emitNamedArgsObj(expr.arguments);
    const primaryName = PLOT_PRIMARY_ARGS[funcName] ?? 'series';
    const primaryValue = emitOrderedArg(expr.arguments, [primaryName], primaryName, 0) ?? 'NaN';
    const hasNamedPrimary = expr.arguments.some((arg) => arg.name?.name === primaryName);
    const extraArgs = hasNamedPrimary ? posArgs : posArgs.slice(1);
    return `ctx.plot(${idx}, "${funcName}", ${funcCallIndex}, ${primaryValue}, ${namedObj}, [${extraArgs.join(', ')}])`;
  }

  function emitInputCall(funcName: string, expr: CallExpression): string {
    const site = ctx.inputSites.find((s) => s.node === expr);
    const id = site?.id ?? 'unknown';
    const posArgs = expr.arguments.filter((a) => !a.name).map((a) => emitExpr(a.value));
    const defaultExpression = expr.arguments.find((arg) => arg.name?.name === 'defval')?.value ?? expr.arguments.find((arg) => !arg.name)?.value;
    const sourceHint = funcName === 'input' ? inputDefaultSourceName(defaultExpression) : undefined;
    const defaultType = funcName === 'input' && !sourceHint && defaultExpression ? expressionType(defaultExpression) : undefined;
    const typeHint = defaultType?.qualifier === 'const' ? defaultType.kind : undefined;
    const metadataEntries = [
      site?.defaultTitle ? `__tealscriptInputDefaultTitle: ${JSON.stringify(site.defaultTitle)}` : undefined,
      sourceHint ? `__tealscriptInputDefaultSource: "${sourceHint}"` : undefined,
      typeHint ? `__tealscriptInputDefaultType: "${typeHint}"` : undefined,
      hasStaticInputTitle(expr.arguments) ? undefined : '__tealscriptStaticTitle: false',
    ].filter(Boolean);
    const namedObj = metadataEntries.length > 0
      ? `({...${emitNamedArgsObj(expr.arguments)}, ${metadataEntries.join(', ')}})`
      : emitNamedArgsObj(expr.arguments);
    return `ctx.input("${id}", "${funcName}", ${posArgs[0] ?? 'undefined'}, ${namedObj}, [${posArgs.slice(1).join(', ')}])`;
  }

  function emitStrategyCall(method: string, expr: CallExpression): string {
    const posArgs = expr.arguments.filter((a) => !a.name).map((a) => emitExpr(a.value));
    const namedObj = emitNamedArgsObj(expr.arguments);
    const args = posArgs.length > 0 ? `${posArgs.join(', ')}, ${namedObj}` : namedObj;
    return `ctx.strategy${method.charAt(0).toUpperCase() + method.slice(1)}(${args})`;
  }

  function emitArrayCall(fullName: string, expr: CallExpression): string {
    const argNames = ARRAY_ARG_NAMES[fullName];
    const posArgs = fullName === 'array.from'
      ? emitVariadicCallArgs(expr.arguments, 'arg')
      : argNames
      ? emitOrderedCallArgs(expr.arguments, argNames, ARRAY_ARG_ALIASES[fullName])
      : expr.arguments.filter((a) => !a.name).map((a) => emitExpr(a.value));
    if (!versionRules.allowsNegativeArrayIndices && ['array.get', 'array.set', 'array.insert', 'array.remove'].includes(fullName)) {
      posArgs[1] = `_arrayIndex(${posArgs[1] ?? 'undefined'})`;
    }
    if (fullName === 'array.push') return `ctx.arrayPush(${posArgs.join(', ')})`;
    if (fullName === 'array.set') return `ctx.arraySet(${posArgs.join(', ')})`;
    if (fullName === 'array.unshift') return `ctx.arrayUnshift(${posArgs.join(', ')})`;
    if (fullName === 'array.insert') return `ctx.arrayInsert(${posArgs.join(', ')})`;
    if (fullName === 'array.concat') return `ctx.arrayConcat(${posArgs.join(', ')})`;
    const isBoolConstructor = fullName === 'array.new_bool'
      || (fullName === 'array.new' && expr.typeArguments?.[0] === 'bool');
    if (isBoolConstructor && !versionRules.allowsBoolNaHelpers && posArgs.length < 2) {
      return `deps._arr.create(${posArgs[0] ?? '0'}, false)`;
    }
    if (ctx.pineVersion === 5 && fullName === 'array.join') {
      posArgs[1] ??= 'undefined';
      posArgs[2] = 'true';
    }
    const mapped = ARRAY_FUNC_MAP[fullName];
    if (mapped) return `deps._arr.${mapped}(${posArgs.join(', ')})`;
    return `deps._arr.${fullName.replace('array.', '')}(${posArgs.join(', ')})`;
  }

  function emitSwitchExpr(expr: SwitchExpression): string {
    let hasDefault = false;
    const missingResult = !versionRules.allowsBoolNaHelpers && expressionKind(expr) === 'bool' ? 'false' : 'NaN';

    if (expr.discriminant) {
      const eqHelper = ctx.pineVersion === 5 ? '_eqLegacyNa' : '_eq';
      const disc = emitExpr(expr.discriminant);
      const parts: string[] = [];
      for (const c of expr.cases) {
        if (c.test) {
          const body = Array.isArray(c.consequent)
            ? emitBlockAsExpr(c.consequent)
            : emitExpr(c.consequent);
          parts.push(`${eqHelper}(${disc}, ${emitExpr(c.test)}) ? ${body}`);
        } else {
          hasDefault = true;
          const body = Array.isArray(c.consequent)
            ? emitBlockAsExpr(c.consequent)
            : emitExpr(c.consequent);
          parts.push(body);
        }
      }
      if (parts.length === 0) return missingResult;
      if (!hasDefault) parts.push(missingResult);
      return `(${parts.join(' : ')})`;
    }

    const parts: string[] = [];
    for (const c of expr.cases) {
      if (c.test) {
        const body = Array.isArray(c.consequent)
          ? emitBlockAsExpr(c.consequent)
          : emitExpr(c.consequent);
        parts.push(`_isTruthy(${emitExpr(c.test)}) ? ${body}`);
      } else {
        hasDefault = true;
        const body = Array.isArray(c.consequent)
          ? emitBlockAsExpr(c.consequent)
          : emitExpr(c.consequent);
        parts.push(body);
      }
    }
    if (parts.length === 0) return missingResult;
    if (!hasDefault) parts.push(missingResult);
    return `(${parts.join(' : ')})`;
  }

  function emitBlockAsExpr(stmts: Statement[]): string {
    if (stmts.length === 1 && stmts[0].type === 'ExpressionStatement') {
      return emitExpr(stmts[0].expression);
    }
    const statementBlock = emitStatementBlockAsExpr(stmts);
    if (statementBlock) return statementBlock;
    const inline = emitInlineBlockAsExpr(stmts);
    return inline ?? 'NaN';
  }

  function emitStatementBlockAsExpr(stmts: Statement[]): string | null {
    if (stmts.length === 0) return 'NaN';
    const lastStmt = stmts[stmts.length - 1];
    if (
      lastStmt.type !== 'ExpressionStatement'
      && lastStmt.type !== 'IfStatement'
      && lastStmt.type !== 'ForStatement'
      && lastStmt.type !== 'WhileStatement'
      && lastStmt.type !== 'VariableDeclaration'
      && lastStmt.type !== 'AssignmentStatement'
    ) {
      return null;
    }

    const retName = `_block_ret_${lines.length}`;
    const start = lines.length;
    const blockLocals = collectFunctionLocalNames(stmts);
    localNameStack.push(blockLocals);
    lines.push(`let ${retName} = NaN;`);
    for (let i = 0; i < stmts.length - 1; i++) emitStmt(stmts[i], 0);
    if (lastStmt.type === 'AssignmentStatement') {
      emitStmt(lastStmt, 0);
      lines.push(`${retName} = ${emitExpr(lastStmt.left)};`);
    } else if (!emitTailAssignment(lastStmt, 0, retName)) emitStmt(lastStmt, 0);
    lines.push(`return ${retName};`);
    localNameStack.pop();
    return `(() => { ${lines.splice(start).join(' ')} })()`;
  }

  function emitInlineBlockAsExpr(stmts: Statement[]): string | null {
    if (stmts.length === 0) return 'NaN';
    const body: string[] = [];
    const functionLocals = collectFunctionLocalNames(stmts);
    localNameStack.push(functionLocals);
    for (let i = 0; i < stmts.length; i++) {
      const stmt = stmts[i];
      const isLast = i === stmts.length - 1;
      if (isLast) {
        if (stmt.type !== 'ExpressionStatement') {
          localNameStack.pop();
          return null;
        }
        body.push(`return ${emitExpr(stmt.expression)};`);
        continue;
      }
      if (stmt.type === 'VariableDeclaration') {
        if (stmt.names.type !== 'VariableDeclarator') {
          localNameStack.pop();
          return null;
        }
        if (
          stmt.init.type === 'IfStatement'
          || stmt.init.type === 'ForStatement'
          || stmt.init.type === 'WhileStatement'
        ) {
          localNameStack.pop();
          return null;
        }
        body.push(`let ${currentLocalName(stmt.names.name.name) ?? localVariableName(stmt.names.name.name)} = ${emitExpr(stmt.init)};`);
        continue;
      }
      if (stmt.type === 'AssignmentStatement') {
        if (
          stmt.right.type === 'IfStatement'
          || stmt.right.type === 'ForStatement'
          || stmt.right.type === 'WhileStatement'
        ) {
          localNameStack.pop();
          return null;
        }
        const left = emitExpr(stmt.left);
        const right = emitExpr(stmt.right);
        body.push(stmt.operator === ':=' ? `${left} = ${right};` : `${left} = ${emitCompoundAssignmentExpr(left, stmt.operator, right, stmt.right)};`);
        continue;
      }
      if (stmt.type === 'MultiDeclaration') {
        for (const declaration of stmt.declarations) {
          if (declaration.names.type !== 'VariableDeclarator') {
            localNameStack.pop();
            return null;
          }
          if (
            declaration.init.type === 'IfStatement'
            || declaration.init.type === 'ForStatement'
            || declaration.init.type === 'WhileStatement'
          ) {
            localNameStack.pop();
            return null;
          }
          body.push(`let ${currentLocalName(declaration.names.name.name) ?? localVariableName(declaration.names.name.name)} = ${emitExpr(declaration.init)};`);
        }
        continue;
      }
      localNameStack.pop();
      return null;
    }
    localNameStack.pop();
    return `(() => { ${body.join(' ')} })()`;
  }

  function emitStmt(stmt: Statement, depth: number): void {
    const pad = indent(depth);
    switch (stmt.type) {
      case 'IndicatorDeclaration':
        break;
      case 'VariableDeclaration':
        emitVarDecl(stmt, depth);
        break;
      case 'AssignmentStatement':
        emitAssignment(stmt, depth);
        break;
      case 'TupleAssignment':
        emitTupleAssignment(stmt, depth);
        break;
      case 'ExpressionStatement':
        lines.push(`${pad}${emitExpressionStatement(stmt.expression, stmt.loc)};`);
        break;
      case 'IfStatement':
        emitWithRuntimeErrorLoc(stmt.loc, () => emitIf(stmt, depth));
        break;
      case 'OnceStatement':
        emitWithRuntimeErrorLoc(stmt.loc, () => emitOnce(stmt, depth));
        break;
      case 'ForStatement':
        emitWithRuntimeErrorLoc(stmt.loc, () => emitFor(stmt, depth));
        break;
      case 'WhileStatement':
        emitWithRuntimeErrorLoc(stmt.loc, () => emitWhile(stmt, depth));
        break;
      case 'BreakStatement':
        lines.push(`${pad}break;`);
        break;
      case 'ContinueStatement':
        lines.push(`${pad}continue;`);
        break;
      case 'FunctionDeclaration':
        break;
      case 'MultiDeclaration':
        for (const d of stmt.declarations) emitStmt(d, depth);
        break;
      case 'MultiAssignment':
        for (const a of stmt.assignments) emitStmt(a, depth);
        break;
      case 'MultiExpressionStatement':
        for (const e of stmt.expressions) {
          lines.push(`${pad}${emitExpr(e)};`);
        }
        break;
      case 'EnumDeclaration':
      case 'TypeDeclaration':
      case 'ImportDeclaration':
      case 'LibraryDeclaration':
        break;
    }
  }

  function isDiscardTupleName(name: string): boolean {
    return name === '_';
  }

  function rootBlockDeclarationName(name: string, stmt: VariableDeclaration): string | undefined {
    if (functionNameStack.length > 0 || localNameStack.length === 0 || !rootRegularVars.has(name)) return undefined;
    return `${localVariableName(name)}_${stmt.loc?.start.offset ?? lines.length}`;
  }

  function bindRootBlockDeclaration(name: string, localName: string | undefined): void {
    if (localName) localNameStack[localNameStack.length - 1].set(name, localName);
  }

  function emitVarDecl(stmt: VariableDeclaration, depth: number): string | undefined {
    registerEnumVariable(stmt);
    const pad = indent(depth);
    if (stmt.names.type === 'VariableDeclarator' && stmt.names.name.name === '_' && stmt.kind !== 'var' && stmt.kind !== 'varip') {
      if (stmt.init.type === 'IfStatement') emitIf(stmt.init, depth);
      else if (stmt.init.type === 'ForStatement') emitFor(stmt.init, depth);
      else if (stmt.init.type === 'WhileStatement') emitWhile(stmt.init, depth);
      else lines.push(`${pad}${emitExpr(stmt.init)};`);
      return;
    }
    if (stmt.names.type === 'TupleDeclarator') {
      const tmpVar = `_tup_${stmt.names.names.map((n) => n.name).join('_')}_${lines.length}`;
      if (stmt.init.type === 'IfStatement') {
        lines.push(`${pad}let ${tmpVar} = [];`);
        emitIf(stmt.init, depth, tmpVar);
      } else if (stmt.init.type === 'ForStatement') {
        lines.push(`${pad}let ${tmpVar} = [];`);
        emitFor(stmt.init, depth, tmpVar);
      } else if (stmt.init.type === 'WhileStatement') {
        lines.push(`${pad}let ${tmpVar} = [];`);
        emitWhile(stmt.init, depth, tmpVar);
      } else {
        lines.push(`${pad}const ${tmpVar} = ${emitExpr(stmt.init)};`);
      }
      for (let i = 0; i < stmt.names.names.length; i++) {
        const name = stmt.names.names[i].name;
        if (isDiscardTupleName(name)) continue;
        const blockLocal = rootBlockDeclarationName(name, stmt);
        bindRootBlockDeclaration(name, blockLocal);
        activateLocalDeclaration(name);
        const localDeclName = blockLocal ?? declarationLocalName(name);
        const isRootRegular = rootRegularVars.has(name) && functionNameStack.length === 0;
        const value = `_idx(${tmpVar}, ${i})`;
        if (localDeclName) {
          lines.push(`${pad}let ${localDeclName} = ${value};`);
          emitRootLocalSeriesWrite(pad, name, localDeclName);
          emitLocalHistoryPush(pad, name, localDeclName);
          emitFieldHistoryPush(pad, name, localDeclName);
        } else if (ctx.seriesVars.has(name)) {
          emitSeriesVarWrite(pad, name, value);
          emitLocalHistoryPush(pad, name, `this.${jsSeriesMember(name)}.get(0)`);
          emitFieldHistoryPush(pad, name, `this.${jsSeriesMember(name)}.get(0)`);
        } else if (isRootRegular) {
          lines.push(`${pad}this.${jsGlobalMember(name)} = ${value};`);
          emitLocalHistoryPush(pad, name, `this.${jsGlobalMember(name)}`);
          emitFieldHistoryPush(pad, name, `this.${jsGlobalMember(name)}`);
        } else {
          const bareName = jsPineName(name);
          lines.push(`${pad}let ${bareName} = ${value};`);
          emitLocalHistoryPush(pad, name, bareName);
          emitFieldHistoryPush(pad, name, bareName);
        }
      }
      return tmpVar;
    }

    const name = stmt.names.name.name;
    const ifDefault = ctx.pineVersion >= 5 && expressionKind(stmt.init) === 'string' ? '""'
      : stmt.typeAnnotation?.baseType === 'bool' && !versionRules.allowsBoolNaHelpers ? 'false' : 'NaN';
    const isRootExecutionScope = depth === 2 && functionNameStack.length === 0;
    const blockLocal = stmt.kind === 'var' || stmt.kind === 'varip' ? undefined : rootBlockDeclarationName(name, stmt);
    const isRootRegularTarget = !blockLocal && rootRegularVars.has(name) && functionNameStack.length === 0;
    const importedPrivateError = stmt.init.type === 'CallExpression' ? importedPrivateCallErrorMessage(stmt.init) : undefined;
    if (importedPrivateError) {
      lines.push(`${pad}${runtimeErrorExpr(importedPrivateError)};`);
      if (ctx.seriesVars.has(name)) {
        emitSeriesVarWrite(pad, name, 'NaN');
      } else if (rootRegularVars.has(name) && isRootExecutionScope) {
        lines.push(`${pad}this.${jsGlobalMember(name)} = NaN;`);
      } else {
        lines.push(`${pad}let ${currentLocalName(name) ?? jsPineName(name)} = NaN;`);
      }
      return;
    }

    if (stmt.kind === 'var' || stmt.kind === 'varip') {
      const persistentStart = `_drawStart_${jsPineName(name)}`;
      const localPersistent = currentPersistentLocalName(name);
      if (localPersistent) {
        const initFlag = currentPersistentLocalInitFlag(name, localPersistent);
        lines.push(`${pad}if (!${initFlag}) {`);
        lines.push(`${pad}  const ${persistentStart} = ctx.drawingCount();`);
        if (stmt.init.type === 'IfStatement') {
          lines.push(`${pad}  ${localPersistent} = ${ifDefault};`);
          emitIf(stmt.init, depth + 1, localPersistent);
        } else if (stmt.init.type === 'ForStatement') {
          lines.push(`${pad}  ${localPersistent} = NaN;`);
          emitFor(stmt.init, depth + 1, localPersistent, true);
        } else if (stmt.init.type === 'WhileStatement') {
          lines.push(`${pad}  ${localPersistent} = NaN;`);
          emitWhile(stmt.init, depth + 1, localPersistent, true);
        } else {
          lines.push(`${pad}  ${localPersistent} = ${emitExpr(stmt.init)};`);
        }
        lines.push(`${pad}  ctx.markPersistentRuntimeValue(${localPersistent});`);
        lines.push(`${pad}  ${initFlag} = true;`);
        lines.push(`${pad}  ctx.markDrawingsPersistentFrom(${persistentStart});`);
        lines.push(`${pad}}`);
        emitLocalHistoryPush(pad, name, localPersistent);
        return;
      }
      if (stmt.init.type === 'IfStatement') {
        lines.push(`${pad}if (!this.${jsInitMember(name)}) {`);
        lines.push(`${pad}  const ${persistentStart} = ctx.drawingCount();`);
        lines.push(`${pad}  this.${jsVarMember(name)} = ${ifDefault};`);
        emitIf(stmt.init, depth + 1, `this.${jsVarMember(name)}`);
        lines.push(`${pad}  ctx.markPersistentRuntimeValue(this.${jsVarMember(name)});`);
        lines.push(`${pad}  this.${jsInitMember(name)} = true;`);
        lines.push(`${pad}  ctx.markDrawingsPersistentFrom(${persistentStart});`);
        lines.push(`${pad}}`);
      } else if (stmt.init.type === 'ForStatement') {
        lines.push(`${pad}if (!this.${jsInitMember(name)}) {`);
        lines.push(`${pad}  const ${persistentStart} = ctx.drawingCount();`);
        lines.push(`${pad}  this.${jsVarMember(name)} = NaN;`);
        emitFor(stmt.init, depth + 1, `this.${jsVarMember(name)}`, true);
        lines.push(`${pad}  ctx.markPersistentRuntimeValue(this.${jsVarMember(name)});`);
        lines.push(`${pad}  this.${jsInitMember(name)} = true;`);
        lines.push(`${pad}  ctx.markDrawingsPersistentFrom(${persistentStart});`);
        lines.push(`${pad}}`);
      } else if (stmt.init.type === 'WhileStatement') {
        lines.push(`${pad}if (!this.${jsInitMember(name)}) {`);
        lines.push(`${pad}  const ${persistentStart} = ctx.drawingCount();`);
        lines.push(`${pad}  this.${jsVarMember(name)} = NaN;`);
        emitWhile(stmt.init, depth + 1, `this.${jsVarMember(name)}`, true);
        lines.push(`${pad}  ctx.markPersistentRuntimeValue(this.${jsVarMember(name)});`);
        lines.push(`${pad}  this.${jsInitMember(name)} = true;`);
        lines.push(`${pad}  ctx.markDrawingsPersistentFrom(${persistentStart});`);
        lines.push(`${pad}}`);
      } else {
        lines.push(`${pad}if (!this.${jsInitMember(name)}) {`);
        lines.push(`${pad}  const ${persistentStart} = ctx.drawingCount();`);
        lines.push(`${pad}  this.${jsVarMember(name)} = ${emitExpr(stmt.init)};`);
        lines.push(`${pad}  ctx.markPersistentRuntimeValue(this.${jsVarMember(name)});`);
        lines.push(`${pad}  this.${jsInitMember(name)} = true;`);
        lines.push(`${pad}  ctx.markDrawingsPersistentFrom(${persistentStart});`);
        lines.push(`${pad}}`);
      }
      if (ctx.seriesVars.has(name)) {
        emitSeriesVarWrite(pad, name, `ctx.barIndex === 0 ? this.${jsVarMember(name)} : this.${jsSeriesMember(name)}.get(0)`);
      }
      return;
    }

    // Regular variable
    if (stmt.init.type === 'IfStatement') {
      const localDeclName = blockLocal ?? declarationLocalName(name);
      const target = localDeclName ?? (isRootRegularTarget ? `this.${jsGlobalMember(name)}` : jsPineName(name));
      lines.push(isRootRegularTarget ? `${pad}${target} = ${ifDefault};` : `${pad}let ${target} = ${ifDefault};`);
      emitIf(stmt.init, depth, target);
      bindRootBlockDeclaration(name, blockLocal);
        activateLocalDeclaration(name);
      if (ctx.seriesVars.has(name) && !isRootGlobalShadow(name)) {
        emitSeriesVarWrite(pad, name, target);
      }
      emitLocalHistoryPush(pad, name, target);
      emitFieldHistoryPush(pad, name, target);
      return;
    }
    if (stmt.init.type === 'ForStatement') {
      const localDeclName = blockLocal ?? declarationLocalName(name);
      const target = localDeclName ?? (isRootRegularTarget ? `this.${jsGlobalMember(name)}` : jsPineName(name));
      lines.push(isRootRegularTarget ? `${pad}${target} = NaN;` : `${pad}let ${target} = NaN;`);
      emitFor(stmt.init, depth, target);
      bindRootBlockDeclaration(name, blockLocal);
        activateLocalDeclaration(name);
      if (ctx.seriesVars.has(name) && !isRootGlobalShadow(name)) {
        emitSeriesVarWrite(pad, name, target);
      }
      emitLocalHistoryPush(pad, name, target);
      emitFieldHistoryPush(pad, name, target);
      return;
    }
    if (stmt.init.type === 'WhileStatement') {
      const localDeclName = blockLocal ?? declarationLocalName(name);
      const target = localDeclName ?? (isRootRegularTarget ? `this.${jsGlobalMember(name)}` : jsPineName(name));
      lines.push(isRootRegularTarget ? `${pad}${target} = NaN;` : `${pad}let ${target} = NaN;`);
      emitWhile(stmt.init, depth, target);
      bindRootBlockDeclaration(name, blockLocal);
        activateLocalDeclaration(name);
      if (ctx.seriesVars.has(name) && !isRootGlobalShadow(name)) {
        emitSeriesVarWrite(pad, name, target);
      }
      emitLocalHistoryPush(pad, name, target);
      emitFieldHistoryPush(pad, name, target);
      return;
    }

    const rhs = ctx.pineVersion >= 5 && stmt.typeAnnotation?.baseType === 'string' && stmt.init.type === 'NaExpression'
      ? '""' : emitExpr(stmt.init);
    bindRootBlockDeclaration(name, blockLocal);
        activateLocalDeclaration(name);

    const taSite = stmt.init.type === 'CallExpression' ? ctx.taCallSiteMap.get(stmt.init) : null;
    if (taSite?.returnsTuple && stmt.names.type === 'VariableDeclarator') {
      lines.push(`${pad}const ${currentLocalName(name) ?? jsPineName(name)} = ${rhs};`);
      return;
    }

    const localDeclName = blockLocal ?? declarationLocalName(name);
    if (localDeclName) {
      lines.push(`${pad}let ${localDeclName} = ${rhs};`);
      emitRootLocalSeriesWrite(pad, name, localDeclName, rhs.includes(`this.${jsStateMember('_sv_', name)}.get(`));
      emitLocalHistoryPush(pad, name, localDeclName);
      emitFieldHistoryPush(pad, name, localDeclName);
    } else if (ctx.seriesVars.has(name) && !isRootGlobalShadow(name)) {
      emitSeriesVarWrite(pad, name, rhs, rhs.includes(`this.${jsStateMember('_sv_', name)}.get(`));
      emitLocalHistoryPush(pad, name, `this.${jsSeriesMember(name)}.get(0)`);
      emitFieldHistoryPush(pad, name, `this.${jsSeriesMember(name)}.get(0)`);
    } else if (isRootRegularTarget) {
      lines.push(`${pad}this.${jsGlobalMember(name)} = ${rhs};`);
      emitFieldHistoryPush(pad, name, `this.${jsGlobalMember(name)}`);
    } else {
      const bareName = jsPineName(name);
      lines.push(`${pad}let ${bareName} = ${rhs};`);
      emitLocalHistoryPush(pad, name, bareName);
      emitFieldHistoryPush(pad, name, bareName);
    }
  }

  function emitAssignment(stmt: AssignmentStatement, depth: number): void {
    const pad = indent(depth);
    if (stmt.right.type === 'IfStatement') {
      const tmpVar = `_if_${lines.length}`;
      lines.push(`${pad}let ${tmpVar} = NaN;`);
      emitIf(stmt.right, depth, tmpVar);
      emitAssignmentWithValue(stmt, depth, tmpVar);
      return;
    }
    if (stmt.right.type === 'ForStatement' || stmt.right.type === 'WhileStatement') {
      const tmpVar = `_loop_${lines.length}`;
      lines.push(`${pad}let ${tmpVar} = NaN;`);
      if (stmt.right.type === 'ForStatement') emitFor(stmt.right, depth, tmpVar);
      else emitWhile(stmt.right, depth, tmpVar);
      emitAssignmentWithValue(stmt, depth, tmpVar);
      return;
    }
    emitAssignmentWithValue(stmt, depth, emitExpr(stmt.right));
  }

  function emitAssignmentWithValue(stmt: AssignmentStatement, depth: number, rhs: string): void {
    const pad = indent(depth);
    if (stmt.left.type === 'Identifier') {
      const name = stmt.left.name;
      const persistentAssignmentStart = isPersistentAssignmentTarget(name) ? `_drawStart_assign_${jsPineName(name)}_${lines.length}` : undefined;
      if (persistentAssignmentStart) {
        lines.push(`${pad}const ${persistentAssignmentStart} = ctx.drawingCount();`);
      }
      const localName = currentLocalName(name);
      if (localName) {
        emitAssignmentLine(pad, localName, stmt.operator, rhs, stmt.right);
        emitRootLocalSeriesWrite(pad, name, localName, rhs.includes(`this.${jsStateMember('_sv_', name)}.get(`));
        emitLocalHistoryPush(pad, name, localName);
        if (persistentAssignmentStart) {
          lines.push(`${pad}ctx.markPersistentRuntimeValue(${localName});`);
          lines.push(`${pad}if (${persistentAssignmentStart} !== undefined) ctx.markDrawingsPersistentFrom(${persistentAssignmentStart});`);
        }
        return;
      }
      const localPersistent = currentPersistentLocalName(name);
      if (localPersistent) {
        emitAssignmentLine(pad, localPersistent, stmt.operator, rhs, stmt.right);
        if (persistentAssignmentStart) {
          lines.push(`${pad}ctx.markPersistentRuntimeValue(${localPersistent});`);
          lines.push(`${pad}if (${persistentAssignmentStart} !== undefined) ctx.markDrawingsPersistentFrom(${persistentAssignmentStart});`);
        }
        emitLocalHistoryPush(pad, name, localPersistent);
        return;
      }
      if (ctx.seriesVars.has(name)) {
        const tmpVar = `_assign_${jsPineName(name)}_${lines.length}`;
        if (stmt.operator === ':=') {
          lines.push(`${pad}const ${tmpVar} = ${rhs};`);
        } else {
          lines.push(`${pad}const ${tmpVar} = ${emitCompoundAssignmentExpr(`this.${jsSeriesMember(name)}.get(0)`, stmt.operator, rhs, stmt.right)};`);
        }
        emitSeriesVarWrite(pad, name, tmpVar);
        if (persistentAssignmentStart) {
          lines.push(`${pad}ctx.markPersistentRuntimeValue(${tmpVar});`);
          lines.push(`${pad}if (${persistentAssignmentStart} !== undefined) ctx.markDrawingsPersistentFrom(${persistentAssignmentStart});`);
        }
        return;
      }
      if (ctx.varDecls.some((v) => v.name === name)) {
        emitAssignmentLine(pad, `this.${jsVarMember(name)}`, stmt.operator, rhs, stmt.right);
        if (persistentAssignmentStart) {
          lines.push(`${pad}ctx.markPersistentRuntimeValue(this.${jsVarMember(name)});`);
          lines.push(`${pad}if (${persistentAssignmentStart} !== undefined) ctx.markDrawingsPersistentFrom(${persistentAssignmentStart});`);
        }
        return;
      }
      emitAssignmentLine(pad, emitAssignmentTarget(name), stmt.operator, rhs, stmt.right);
      if (persistentAssignmentStart) {
        lines.push(`${pad}ctx.markPersistentRuntimeValue(${emitAssignmentTarget(name)});`);
        lines.push(`${pad}if (${persistentAssignmentStart} !== undefined) ctx.markDrawingsPersistentFrom(${persistentAssignmentStart});`);
      }
      return;
    }

    if (stmt.left.type === 'MemberExpression') {
      const obj = emitExpr(stmt.left.object);
      const field = stmt.left.property.name;
      if (stmt.operator === ':=') {
        lines.push(`${pad}_setField(${obj}, "${field}", ${rhs});`);
      } else {
        lines.push(`${pad}_setField(${obj}, "${field}", ${emitCompoundAssignmentExpr(`_getField(${obj}, "${field}")`, stmt.operator, rhs, stmt.right)});`);
      }
      lines.push(`${pad}ctx.markPersistentUdtField(${obj}, "${field}");`);
      if (stmt.left.object.type === 'Identifier') {
        emitFieldHistoryPush(pad, stmt.left.object.name, obj);
      }
      return;
    }
    if (stmt.left.type === 'IndexExpression') {
      const obj = stmt.left.object.type === 'Identifier' && collectionHistoryVars.has(stmt.left.object.name)
        ? emitIdentifier(stmt.left.object)
        : emitExpr(stmt.left.object);
      const idx = emitExpr(stmt.left.index);
      if (stmt.operator === ':=') {
        lines.push(`${pad}_setIndex(${obj}, ${idx}, ${rhs});`);
      } else {
        lines.push(`${pad}_setIndex(${obj}, ${idx}, ${emitCompoundAssignmentExpr(`_idx(${obj}, ${idx})`, stmt.operator, rhs, stmt.right)});`);
      }
      return;
    }
    const left = emitExpr(stmt.left);
    lines.push(stmt.operator === ':=' ? `${pad}${left} = ${rhs};` : `${pad}${left} = ${emitCompoundAssignmentExpr(left, stmt.operator, rhs, stmt.right)};`);
  }

  function emitTupleAssignment(stmt: TupleAssignment, depth: number): void {
    const pad = indent(depth);
    const tmpVar = `_tup_${stmt.names.map((n) => n.name).join('_')}_${lines.length}`;
    if (stmt.right.type === 'IfStatement') {
      lines.push(`${pad}let ${tmpVar} = [];`);
      emitIf(stmt.right, depth, tmpVar);
    } else if (stmt.right.type === 'ForStatement') {
      lines.push(`${pad}let ${tmpVar} = [];`);
      emitFor(stmt.right, depth, tmpVar);
    } else if (stmt.right.type === 'WhileStatement') {
      lines.push(`${pad}let ${tmpVar} = [];`);
      emitWhile(stmt.right, depth, tmpVar);
    } else {
      lines.push(`${pad}const ${tmpVar} = ${emitExpr(stmt.right)};`);
    }
    for (let i = 0; i < stmt.names.length; i++) {
      const name = stmt.names[i].name;
      if (isDiscardTupleName(name)) continue;
      const localName = currentLocalName(name);
      const value = `_idx(${tmpVar}, ${i})`;
      if (localName) {
        lines.push(`${pad}${localName} = ${value};`);
        emitLocalHistoryPush(pad, name, localName);
        emitFieldHistoryPush(pad, name, localName);
      } else if (currentPersistentLocalName(name)) {
        const localPersistent = currentPersistentLocalName(name)!;
        lines.push(`${pad}${localPersistent} = ${value};`);
        emitLocalHistoryPush(pad, name, localPersistent);
      } else if (ctx.seriesVars.has(name)) {
        emitSeriesVarWrite(pad, name, value);
        emitLocalHistoryPush(pad, name, `this.${jsSeriesMember(name)}.get(0)`);
        emitFieldHistoryPush(pad, name, `this.${jsSeriesMember(name)}.get(0)`);
      } else {
        const localPersistent = currentPersistentLocalName(name);
        if (localPersistent) {
          lines.push(`${pad}${localPersistent} = ${value};`);
        } else if (ctx.varDecls.some((v) => v.name === name)) {
          lines.push(`${pad}this.${jsVarMember(name)} = ${value};`);
        } else {
          lines.push(`${pad}${emitAssignmentTarget(name)} = ${value};`);
        }
      }
    }
  }

  function emitIf(stmt: IfStatement, depth: number, assignTarget?: string): void {
    const pad = indent(depth);
    const scopeBlockLocals = true;
    const rootConsequentPersistentLocals = functionNameStack.length === 0 ? rootBlockPersistentNames(stmt.consequent) : undefined;
    lines.push(`${pad}if (_isTruthy(${emitExpr(stmt.test)})) {`);
    if (scopeBlockLocals) localNameStack.push(collectBlockLocalNames(stmt.consequent));
    if (rootConsequentPersistentLocals?.size) persistentLocalStack.push(rootConsequentPersistentLocals);
    if (assignTarget && stmt.consequent.length > 0) {
      const lastStmt = stmt.consequent[stmt.consequent.length - 1];
      for (let i = 0; i < stmt.consequent.length - 1; i++) {
        emitStmt(stmt.consequent[i], depth + 1);
      }
      if (!emitTailAssignment(lastStmt, depth + 1, assignTarget)) emitStmt(lastStmt, depth + 1);
    } else {
      for (const s of stmt.consequent) emitStmt(s, depth + 1);
    }
    if (rootConsequentPersistentLocals?.size) persistentLocalStack.pop();
    if (scopeBlockLocals) localNameStack.pop();
    if (stmt.alternate) {
      if (Array.isArray(stmt.alternate)) {
        const rootAlternatePersistentLocals = functionNameStack.length === 0 ? rootBlockPersistentNames(stmt.alternate) : undefined;
        lines.push(`${pad}} else {`);
        if (scopeBlockLocals) localNameStack.push(collectBlockLocalNames(stmt.alternate));
        if (rootAlternatePersistentLocals?.size) persistentLocalStack.push(rootAlternatePersistentLocals);
        if (assignTarget && stmt.alternate.length > 0) {
          const lastStmt = stmt.alternate[stmt.alternate.length - 1];
          for (let i = 0; i < stmt.alternate.length - 1; i++) {
            emitStmt(stmt.alternate[i], depth + 1);
          }
          if (!emitTailAssignment(lastStmt, depth + 1, assignTarget)) emitStmt(lastStmt, depth + 1);
        } else {
          for (const s of stmt.alternate) emitStmt(s, depth + 1);
        }
        if (rootAlternatePersistentLocals?.size) persistentLocalStack.pop();
        if (scopeBlockLocals) localNameStack.pop();
        lines.push(`${pad}}`);
      } else {
        lines.push(`${pad}} else`);
        emitIf(stmt.alternate, depth, assignTarget);
      }
    } else {
      if (assignTarget && ctx.pineVersion >= 5 && expressionKind(stmt) === 'string') {
        lines.push(`${pad}} else {`);
        lines.push(`${pad}  ${assignTarget} = "";`);
      } else if (assignTarget && !versionRules.allowsBoolNaHelpers && expressionKind(stmt) === 'bool') {
        lines.push(`${pad}} else {`);
        lines.push(`${pad}  ${assignTarget} = false;`);
      }
      lines.push(`${pad}}`);
    }
  }

  function onceStateMember(stmt: OnceStatement): string {
    const start = stmt.loc?.start;
    return `_once_${start?.offset ?? start?.line ?? 0}_${start?.column ?? 0}`;
  }

  function emitOnce(stmt: OnceStatement, depth: number): void {
    const pad = indent(depth);
    const member = onceStateMember(stmt);
    onceStateMembers.add(member);
    const condition = stmt.test ? `_isTruthy(${emitExpr(stmt.test)})` : 'true';
    lines.push(`${pad}if (!this.${member} && ${condition}) {`);
    lines.push(`${indent(depth + 1)}this.${member} = true;`);
    const scopeBlockLocals = true;
    const rootPersistentLocals = functionNameStack.length === 0 ? rootBlockPersistentNames(stmt.body) : undefined;
    if (scopeBlockLocals) localNameStack.push(collectBlockLocalNames(stmt.body));
    if (rootPersistentLocals?.size) persistentLocalStack.push(rootPersistentLocals);
    for (const s of stmt.body) emitStmt(s, depth + 1);
    if (rootPersistentLocals?.size) persistentLocalStack.pop();
    if (scopeBlockLocals) localNameStack.pop();
    lines.push(`${pad}}`);
  }

  function emitTailAssignment(stmt: Statement, depth: number, assignTarget: string): boolean {
    if (stmt.type === 'VariableDeclaration') {
      const tupleValue = emitVarDecl(stmt, depth);
      const value = stmt.names.type === 'VariableDeclarator' ? emitIdentifier(stmt.names.name) : tupleValue;
      if (value) lines.push(`${indent(depth)}${assignTarget} = ${value};`);
      return true;
    }
    if (stmt.type === 'AssignmentStatement' && stmt.left.type === 'Identifier') {
      emitAssignment(stmt, depth);
      lines.push(`${indent(depth)}${assignTarget} = ${emitIdentifier(stmt.left)};`);
      return true;
    }
    if (stmt.type === 'ExpressionStatement') {
      lines.push(`${indent(depth)}${assignTarget} = ${emitExpr(stmt.expression)};`);
      return true;
    }
    if (stmt.type === 'IfStatement') {
      emitIf(stmt, depth, assignTarget);
      return true;
    }
    if (stmt.type === 'ForStatement') {
      emitFor(stmt, depth, assignTarget);
      return true;
    }
    if (stmt.type === 'WhileStatement') {
      emitWhile(stmt, depth, assignTarget);
      return true;
    }
    return false;
  }

  function emitLoopBody(stmts: Statement[], depth: number, assignTarget?: string): void {
    const scopeBlockLocals = true;
    const rootPersistentLocals = functionNameStack.length === 0 ? rootBlockPersistentNames(stmts) : undefined;
    if (scopeBlockLocals) localNameStack.push(collectBlockLocalNames(stmts));
    if (rootPersistentLocals?.size) persistentLocalStack.push(rootPersistentLocals);
    if (!assignTarget || stmts.length === 0) {
      for (const s of stmts) emitStmt(s, depth);
      if (rootPersistentLocals?.size) persistentLocalStack.pop();
      if (scopeBlockLocals) localNameStack.pop();
      return;
    }
    const lastStmt = stmts[stmts.length - 1];
    for (let i = 0; i < stmts.length - 1; i++) emitStmt(stmts[i], depth);
    if (!emitTailAssignment(lastStmt, depth, assignTarget)) emitStmt(lastStmt, depth);
    if (rootPersistentLocals?.size) persistentLocalStack.pop();
    if (scopeBlockLocals) localNameStack.pop();
  }

  function emitLoopTimeCheck(started: string, depth: number, loc?: SourceLocation, sampled = false): void {
    const line = loc?.start.line;
    const location = line === undefined ? '' : ` at line ${line}`;
    const pad = indent(depth);
    if (sampled) lines.push(`${pad}if ((++this._loopIters & 63) === 0) {`);
    const checkPad = sampled ? indent(depth + 1) : pad;
    if (sampled) lines.push(`${checkPad}this._loopTime = this._loopNow();`);
    else lines.push(`${checkPad}if (--this._loopDepth === 0) this._loopTime = this._loopNow();`);
    lines.push(`${checkPad}if (this._loopTime - ${sampled ? 'this._loopStarted' : started} > ${LOOP_TIME_LIMIT_MS}) ctx.runtimeError(["Loop${location} exceeds the ${LOOP_TIME_LIMIT_MS} ms execution time limit"], undefined, ${line});`);
    if (sampled) lines.push(`${pad}}`);
  }

  function emitLoopResultDefault(stmt: ForStatement | WhileStatement, depth: number, target?: string): void {
    if (!target || versionRules.allowsBoolNaHelpers) return;
    expressionType(stmt);
    const types = loopResultTypes.get(stmt);
    if (!types?.some((type) => type.kind === 'bool')) return;
    const defaults = types.map((type) => type.kind === 'bool' ? 'false' : 'NaN');
    const value = defaults.length === 1 ? defaults[0] : `[${defaults.join(', ')}]`;
    lines.push(`${indent(depth)}${target} = ${value};`);
  }

  function loopAccumulators(stmt: ForStatement): string[] {
    if (stmt.kind !== 'numeric' || functionNameStack.length > 0) return [];
    const names = new Set<string>();
    const declared = new Set<string>([stmt.counter.name]);
    let safe = true;
    const visit = (value: unknown): void => {
      if (!value || typeof value !== 'object') return;
      if (Array.isArray(value)) { value.forEach(visit); return; }
      const node = value as Statement | Expression;
      if (node.type === 'FunctionDeclaration' || node.type === 'LambdaExpression') safe = false;
      if (node.type === 'CallExpression' && !(node.callee.type === 'Identifier' && node.callee.name === 'nz' && !ctx.funcInfos.has('nz') && !ast.body.some((statement) => statement.type === 'FunctionDeclaration' && statement.name.name === 'nz') && !rootDeclaredNames.has('nz'))) safe = false;
      if (node.type === 'ForStatement') { declared.add(node.counter.name); if (node.kind === 'collection' && node.indexCounter) declared.add(node.indexCounter.name); }
      if (node.type === 'VariableDeclaration') collectIdentifierReferences(node.names as unknown as Expression).forEach((name) => declared.add(name));
      if (node.type === 'AssignmentStatement' && node.left.type === 'Identifier'
        && rootRegularVars.has(node.left.name) && !ctx.seriesVars.has(node.left.name)
        && ['+=', '-=', '*='].includes(node.operator)) names.add(node.left.name);
      for (const [key, child] of Object.entries(value)) if (key !== 'loc') visit(child);
    };
    visit(stmt.body);
    const boundaryNames = collectIdentifierReferences(stmt.start);
    collectIdentifierReferences(stmt.end, boundaryNames);
    if (stmt.step) collectIdentifierReferences(stmt.step, boundaryNames);
    return safe ? [...names].filter((name) => !declared.has(name) && !boundaryNames.has(name)) : [];
  }

  function emitFor(stmt: ForStatement, depth: number, assignTarget?: string, stopAfterFirstIteration = false): void {
    emitLoopResultDefault(stmt, depth, assignTarget);
    const started = `_loop_started_${loopId++}`;
    const accumulators = loopAccumulators(stmt).map((name) => [name, `${started}_${jsPineName(name)}`] as const);
    const locals = accumulators.map(([name, local]) => `let ${local} = ${emitAssignmentTarget(name)};`).join(' ');
    lines.push(`${indent(depth)}{ if (this._loopDepth++ === 0) this._loopStarted = this._loopTime = this._loopNow(); const ${started} = this._loopStarted; ${locals} try {`);
    depth += 1;
    const pad = indent(depth);
    const reads = functionNameStack.length === 0 && ctx.localMethodOverloads.size === 0 && ctx.importedMethodOverloads.size === 0 && ctx.importedNamespaces.size === 0
      ? invariantLineReads(stmt, expressionType) : new Map<CallExpression, { array: Identifier; index: Identifier }>();
    const newReads: CallExpression[] = [];
    const arrays = new Map<string, string>();
    for (const [call, read] of reads) {
      if (cachedLineReads.has(call)) continue;
      let cache = arrays.get(read.array.name);
      if (!cache) {
        cache = `_loop_line_levels_${loopId++}`;
        arrays.set(read.array.name, cache);
        lines.push(`${pad}const ${cache} = [];`);
      }
      cachedLineReads.set(call, { cache, index: read.index });
      newReads.push(call);
    }
    if (stmt.kind === 'numeric') {
      const currentLoopId = loopId++;
      const counter = stmt.counter.name;
      const counterName = jsPineName(counter);
      const endName = `_loop_end_${currentLoopId}`;
      const stepName = `_loop_step_${currentLoopId}`;
      const guardName = `_loop_iter_${currentLoopId}`;
      const start = emitExpr(stmt.start);
      const end = emitExpr(stmt.end);
      const stepMagnitude = stmt.step ? `Math.abs(${emitExpr(stmt.step)})` : '1';
      const step = `(${counterName} <= ${endName} ? ${stepMagnitude} : -${stepMagnitude})`;
      const fixedStep = !stmt.step || (stmt.step.type === 'NumericLiteral' && Number.isFinite(stmt.step.value) && stmt.step.value !== 0);
      const fixedDirection = fixedStep && stmt.start.type === 'NumericLiteral' && stmt.end.type === 'NumericLiteral'
        ? (stmt.start.value <= stmt.end.value ? '<=' : '>=') : undefined;
      const boundary = fixedDirection
        ? `${counterName} ${fixedDirection} ${endName}`
        : `(${stepName} > 0 ? ${counterName} <= ${endName} : ${counterName} >= ${endName})`;
      const condition = versionRules.forLoopEndBoundaryIsDynamic && stmt.end.type !== 'NumericLiteral'
        ? `(${guardName} > 0 && (${endName} = ${end}), ${boundary})`
        : boundary;
      const guardedCondition = stopAfterFirstIteration ? `${guardName} < 1 && ${condition}` : condition;
      lines.push(`${pad}for (let ${counterName} = ${start}, ${endName} = ${end}, ${stepName} = ${step}, ${guardName} = 0; ${guardedCondition}; ${counterName} += ${stepName}, ${guardName}++) {`);
      emitLoopTimeCheck(started, depth + 1, stmt.loc, true);
      const safeHistoryCounter = !stmt.step && stmt.start.type === 'NumericLiteral' && stmt.end.type === 'NumericLiteral'
        && Number.isSafeInteger(stmt.start.value) && stmt.start.value >= 0
        && Number.isSafeInteger(stmt.end.value) && stmt.end.value >= 0 && !writesLoopCounter(stmt.body, counter);
      const alreadySafe = nonnegativeIntegerLoopCounters.has(counterName);
      if (safeHistoryCounter) nonnegativeIntegerLoopCounters.add(counterName);
      else nonnegativeIntegerLoopCounters.delete(counterName);
      localNameStack.push(new Map([[counter, counterName], ...accumulators]));
      emitLoopBody(stmt.body, depth + 1, assignTarget);
      localNameStack.pop();
      if (alreadySafe) nonnegativeIntegerLoopCounters.add(counterName);
      else nonnegativeIntegerLoopCounters.delete(counterName);
      lines.push(`${pad}}`);
    } else {
      const counter = stmt.counter.name;
      const counterName = localVariableName(counter);
      const iterable = emitExpr(stmt.iterable);
      const iterVar = `_iter_${counterName}`;
      if (stmt.indexCounter) {
        const entryVar = `_entry_${counterName}`;
        const indexCounterName = localVariableName(stmt.indexCounter.name);
        lines.push(`${pad}{ const ${iterVar} = ${iterable};`);
        lines.push(`${pad}if (${iterVar} && ${iterVar}.__tealscriptMap) deps._map.beginIteration(${iterVar}); try {`);
        lines.push(`${pad}for (let _i = 0; ${stopAfterFirstIteration ? "_i < 1 && " : ""}_i < _iterSize(${iterVar}); _i++) {`);
        lines.push(`${indent(depth + 1)}const ${entryVar} = _iterEntry(${iterVar}, _i);`);
        lines.push(`${indent(depth + 1)}let ${indexCounterName} = ${entryVar}[0];`);
        lines.push(`${indent(depth + 1)}let ${counterName} = ${entryVar}[1];`);
        localNameStack.push(new Map([[stmt.indexCounter.name, indexCounterName], [counter, counterName]]));
      } else {
        lines.push(`${pad}{ const ${iterVar} = ${iterable}; for (let _i = 0; ${stopAfterFirstIteration ? "_i < 1 && " : ""}_i < _iterSize(${iterVar}); _i++) {`);
        lines.push(`${indent(depth + 1)}let ${counterName} = _iterGet(${iterVar}, _i);`);
        localNameStack.push(new Map([[counter, counterName]]));
      }
      emitLoopTimeCheck(started, depth + 1, stmt.loc, true);
      emitLoopBody(stmt.body, depth + 1, assignTarget);
      localNameStack.pop();
      if (stmt.indexCounter) {
        lines.push(`${pad}} } finally { if (${iterVar} && ${iterVar}.__tealscriptMap) deps._map.endIteration(${iterVar}); } }`);
      } else {
        lines.push(`${pad}}}`);
      }
    }
    for (const call of newReads) cachedLineReads.delete(call);
    lines.push(`${pad}} finally {`);
    for (const [name, local] of accumulators) lines.push(`${indent(depth + 1)}${emitAssignmentTarget(name)} = ${local};`);
    emitLoopTimeCheck(started, depth + 1, stmt.loc);
    lines.push(`${pad}} }`);
  }

  function emitWhile(stmt: WhileStatement, depth: number, assignTarget?: string, stopAfterFirstIteration = false): void {
    emitLoopResultDefault(stmt, depth, assignTarget);
    const started = `_loop_started_${loopId++}`;
    lines.push(`${indent(depth)}{ if (this._loopDepth++ === 0) this._loopStarted = this._loopTime = this._loopNow(); const ${started} = this._loopStarted; try {`);
    depth += 1;
    const pad = indent(depth);
    const guardName = `_loop_iter_${loopId++}`;
    const condition = stopAfterFirstIteration ? `${guardName} < 1 && ` : "";
    lines.push(`${pad}for (let ${guardName} = 0; ${condition}_isTruthy(${emitExpr(stmt.test)}); ${guardName}++) {`);
    emitLoopTimeCheck(started, depth + 1, stmt.loc, true);
    emitLoopBody(stmt.body, depth + 1, assignTarget);
    lines.push(`${pad}}`);
    lines.push(`${pad}} finally {`);
    emitLoopTimeCheck(started, depth + 1, stmt.loc);
    lines.push(`${pad}} }`);
  }

  function collectFunctionLocalNames(stmts: Statement[]): Map<string, string> {
    const names = new Map<string, string>();
    const visit = (stmt: Statement): void => {
      if (stmt.type === 'VariableDeclaration') {
        if (stmt.kind === 'var' || stmt.kind === 'varip') return;
        if (stmt.names.type === 'VariableDeclarator') {
          names.set(stmt.names.name.name, localVariableName(stmt.names.name.name));
        } else {
          for (const name of stmt.names.names) names.set(name.name, localVariableName(name.name));
        }
      } else if (stmt.type === 'MultiDeclaration') {
        for (const declaration of stmt.declarations) visit(declaration);
      }
    };
    for (const stmt of stmts) visit(stmt);
    return names;
  }

  function collectBlockLocalNames(stmts: Statement[]): Map<string, string> {
    const names = collectFunctionLocalNames(stmts);
    if (functionNameStack.length > 0) return names;
    for (const name of [...names.keys()]) {
      if (rootRegularVars.has(name) && !rootDeclaredNames.has(name)) names.delete(name);
      else if (rootDeclaredNames.has(name)) names.set(name, `${localVariableName(name)}_${rootShadowIndex++}`);
    }
    pendingRootShadows.set(names, new Set([...names.keys()].filter((name) => rootDeclaredNames.has(name))));
    return names;
  }

  function emitFunctionBody(stmts: Statement[]): void {
    if (stmts.length === 0) return;
    const functionLocals = collectFunctionLocalNames(stmts);
    localNameStack.push(functionLocals);
    const lastStmt = stmts[stmts.length - 1];
    for (let i = 0; i < stmts.length - 1; i++) {
      emitStmt(stmts[i], 2);
    }
    if (lastStmt.type === 'ExpressionStatement') {
      lines.push(`    return ${emitExpr(lastStmt.expression)};`);
      localNameStack.pop();
      return;
    }
    const retName = `_fn_ret_${lines.length}`;
    lines.push(`    let ${retName} = NaN;`);
    if (emitTailAssignment(lastStmt, 2, retName)) {
      lines.push(`    return ${retName};`);
    } else {
      emitStmt(lastStmt, 2);
    }
    localNameStack.pop();
  }

  // --- Generate the class ---

  lines.push('// Generated by TealScript codegen');
  lines.push(`const _allowsNegativeArrayIndices = ${versionRules.allowsNegativeArrayIndices};`);
  lines.push('return class GeneratedScript {');

  function seriesMaxBarsBackExpr(name: string): string {
    const hint = ctx.maxBarsBackHints.get(name);
    return hint === undefined ? 'deps.maxBarsBack' : `Math.max(deps.maxBarsBack, ${hint})`;
  }

  function seriesHistoryHint(name: string): number {
    return ctx.maxBarsBackHints.get(name) ?? 0;
  }

  // Constructor
  lines.push('  constructor(deps) {');
  lines.push('    this._deps = deps;');
  lines.push('    const _clock = performance;');
  lines.push('    this._loopNow = _clock.now.bind(_clock);');
  const udtFactoryInsertionIndex = lines.length;

  // Bar field series
  for (const [name, field] of Object.entries(BAR_FIELDS)) {
    const maxBarsBack = name === 'close'
      ? `Math.min(10000, ${seriesMaxBarsBackExpr(name)})`
      : seriesMaxBarsBackExpr(name);
    lines.push(`    this.${field} = new deps.NumericSeries(${maxBarsBack} + 1, ${maxBarsBack}, "${name}", ${seriesHistoryHint(name)});`);
  }

  // Computed bar field series (only if history-accessed)
  const computedBarFields = ['hl2', 'hlc3', 'ohlc4', 'hlcc4'];
  for (const name of computedBarFields) {
    if (ctx.barFieldSeriesVars.has(name)) {
      const maxBarsBack = seriesMaxBarsBackExpr(name);
      lines.push(`    this._s_${name} = new deps.NumericSeries(${maxBarsBack} + 1, ${maxBarsBack}, "${name}", ${seriesHistoryHint(name)});`);
    }
  }

  // Series vars
  for (const name of ctx.seriesVars) {
    const maxBarsBack = seriesMaxBarsBackExpr(name);
    lines.push(`    this.${jsSeriesMember(name)} = new deps.ValueSeries(${maxBarsBack} + 1, ${maxBarsBack}, "var:${name}", ${seriesHistoryHint(name)});`);
    lines.push(`    this.${jsSeriesBarMember(name)} = -1;`);
  }
  for (const [objectName, fields] of fieldHistory) {
    for (const field of fields) {
      const maxBarsBack = seriesMaxBarsBackExpr(objectName);
      lines.push(`    this.${fieldHistoryMemberName(objectName, field)} = new deps.ValueSeries(${maxBarsBack} + 1, ${maxBarsBack}, "field:${objectName}:${field}", ${seriesHistoryHint(objectName)});`);
    }
  }
  for (const member of [...expressionHistory.values(), ...momentumSourceHistory.values()]) {
    lines.push(`    this.${member} = new deps.ValueSeries(deps.maxBarsBack + 1, deps.maxBarsBack, "${member}");`);
    lines.push(`    this.${member}_bar = -1;`);
  }
  for (const name of collectionHistoryVars.keys()) {
    const maxBarsBack = seriesMaxBarsBackExpr(name);
    lines.push(`    this.${jsCollectionHistoryMember(name)} = new deps.ValueSeries(${maxBarsBack} + 1, ${maxBarsBack}, "collection:${name}", ${seriesHistoryHint(name)});`);
  }

  // Var/varip
  for (const v of ctx.varDecls) {
    lines.push(`    this.${jsVarMember(v.name)} = NaN;`);
    lines.push(`    this.${jsInitMember(v.name)} = false;`);
  }
  for (const state of rootBlockPersistentStates) {
    lines.push(`    ${state.value} = NaN;`);
    lines.push(`    ${state.init} = false;`);
  }
  for (const name of rootRegularVars) {
    if (!ctx.seriesVars.has(name) && !ctx.varDecls.some((v) => v.name === name)) {
      lines.push(`    this.${jsGlobalMember(name)} = NaN;`);
    }
  }
  for (const [callExpr, id] of functionEmitContext.callSites) {
    const localVars = callSiteLocalVars(callExpr);
    const hasTACalls = callSiteHasTACalls(callExpr);
    const hasExpressionHistory = callSiteHasExpressionHistory(callExpr);
    if (callSiteNeedsState(callExpr)) {
      lines.push(`    this.${jsStateMember('_fn_state_', String(id))} = {`);
      lines.push(`      __historyKey: "fn:${id}",`);
      lines.push(`      __callPath: ${JSON.stringify(`fn_${id}`)},`);
      lines.push(`      __varipNames: [${localVars.filter((localVar) => localVar.kind === 'varip').map((localVar) => JSON.stringify(jsPineName(localVar.name))).join(', ')}],`);
      lines.push(`      __udtNames: [${localVars.filter((localVar) => localVar.kind === 'var').map((localVar) => JSON.stringify(jsPineName(localVar.name))).join(', ')}],`);
      for (const localVar of localVars) {
        lines.push(`      ${jsVarMember(localVar.name)}: NaN,`);
        lines.push(`      ${jsInitMember(localVar.name)}: false,`);
      }
      if (hasTACalls) {
        lines.push('      __taCache: new Map(),');
        lines.push('      __taSeries: new Map(),');
        lines.push('      __taLast: new Map(),');
      }
      if (hasExpressionHistory) lines.push('      __expressionHistories: new Map(),');
      lines.push('    };');
    }
    for (const param of callSiteHistoryParams(callExpr)) {
      lines.push(`    this.${jsStateMember('_fn_param_series_', `${id}_${param}`)} = new deps.ValueSeries(deps.maxBarsBack + 1, deps.maxBarsBack, "${jsStateMember('_fn_param_series_', `${id}_${param}`)}");`);
      lines.push(`    this.${jsStateMember('_fn_param_series_', `${id}_${param}`)}.__tealscriptLastBar = -1;`);
    }
    for (const local of callSiteHistoryLocals(callExpr)) {
      lines.push(`    this.${jsStateMember('_fn_local_series_', `${id}_${local}`)} = new deps.ValueSeries(deps.maxBarsBack + 1, deps.maxBarsBack, "${jsStateMember('_fn_local_series_', `${id}_${local}`)}");`);
      lines.push(`    this.${jsStateMember('_fn_local_series_', `${id}_${local}`)}.__tealscriptLastBar = -1;`);
    }
  }

  // TA members
  for (const site of ctx.taCallSites) {
    if (site.dynamicCtorArgExprs) continue;
    const argsStr = site.ctorArgs.map((a) => JSON.stringify(a)).join(', ');
    lines.push(`    this.${site.memberName} = new deps.${site.className}(${argsStr});`);
  }
  for (const site of ctx.taCallSites) {
    const seriesClass = site.className === 'PivotPointLevels' ? 'ValueSeries' : 'NumericSeries';
    lines.push(`    this._ta_result_${site.memberName} = new deps.${seriesClass}(deps.maxBarsBack + 1, deps.maxBarsBack, "_ta_result_${site.memberName}");`);
  }
  for (const memberName of taSourceSeries.values()) {
    lines.push(`    this.${memberName} = new deps.ValueSeries(deps.maxBarsBack + 1, deps.maxBarsBack, "${memberName}");`);
    lines.push(`    this.${memberName}_bar = -1;`);
  }
  for (const site of ctx.taVarSites) {
    const ctorArgs = site.className === 'VWAP' ? 'false, NaN' : '';
    lines.push(`    this.${site.memberName} = new deps.${site.className}(${ctorArgs});`);
    lines.push(`    this.${site.seriesName} = new deps.NumericSeries(deps.maxBarsBack + 1, deps.maxBarsBack, "${site.seriesName}");`);
  }

  for (const site of sourceSeriesSMASites) {
    const fixedLength = fixedLengthSMASites.has(site);
    const capacity = site.dynamicCtorArgExprs ? (fixedLength ? '0' : 'deps.maxBarsBack + 1') : JSON.stringify(Number(site.ctorArgs[0]) + 1);
    lines.push(`    this._sma_source_${site.memberName} = deps.SMA.sourceHistory(${capacity}, ${fixedLength});`);
  }

  // Placeholder for fixnan members (filled after body emission)
  const fixnanPlaceholderIdx = lines.length;
  lines.push('    this._dynamicTACache = new Map();');
  lines.push('    this._dynamicTALast = new Map();');
  lines.push('  }');
  lines.push('  _copyCollection(kind, value) {');
  lines.push('    if (kind === "array" && value?.__tealscriptArray) return this._deps._arr.copy(value, true);');
  lines.push('    if (kind === "matrix" && value?.__tealscriptMatrix) return this._deps._mtx.copy(value);');
  lines.push('    if (kind === "map" && value?.__tealscriptMap) return this._deps._map.copy(value);');
  lines.push('    return value;');
  lines.push('  }');
  lines.push('  _updateScopeHistory(series, lastBar, value, barIndex, fillGaps = true) {');
  lines.push('    lastBar = Number.isFinite(lastBar) ? lastBar : -1;');
  lines.push('    const fill = series.size === 0 ? NaN : series.get(0);');
  lines.push('    if (fillGaps && lastBar < barIndex - 1) {');
  lines.push('      for (let index = lastBar + 1; index < barIndex; index += 1) series.push(fill);');
  lines.push('    }');
  lines.push('    if (lastBar === barIndex) series.update(value);');
  lines.push('    else series.push(value);');
  lines.push('    return barIndex;');
  lines.push('  }');

  lines.push('  _dynamicTA(memberName, className, args) {');
  lines.push('    const last = this._dynamicTALast.get(memberName);');
  lines.push('    if (last && last.args.length === args.length) {');
  lines.push('      let unchanged = true;');
  lines.push('      for (let index = 0; index < args.length; index += 1) {');
  lines.push('        if (!Object.is(last.args[index], args[index])) { unchanged = false; break; }');
  lines.push('      }');
  lines.push('      if (unchanged) return last.instance;');
  lines.push('    }');
  lines.push('    const keyArgs = className === "Variance" || className === "StdDev" ? args.slice(0, 1) : args;');
  lines.push('    const key = memberName + ":" + keyArgs.map((arg) => typeof arg + "=" + String(arg)).join("|");');
  lines.push('    let entry = this._dynamicTACache.get(key);');
  lines.push('    if (!entry) {');
  lines.push('      entry = { className, args, instance: new this._deps[className](...args) };');
  lines.push('      this._dynamicTACache.set(key, entry);');
  lines.push('    }');
  lines.push('    this._dynamicTALast.set(memberName, entry);');
  lines.push('    return entry.instance;');
  lines.push('  }');
  lines.push('  _expressionHistory(state, member, value, barIndex) {');
  lines.push('    const owner = state ?? this;');
  lines.push('    if (state) {');
  lines.push('      if (!owner.__expressionHistories) owner.__expressionHistories = new Map();');
  lines.push('      let entry = owner.__expressionHistories.get(member);');
  lines.push('      if (!entry) { entry = { series: new this._deps.ValueSeries(this._deps.maxBarsBack + 1, this._deps.maxBarsBack, owner.__historyKey + ":expression:" + member), lastBar: -1 }; owner.__expressionHistories.set(member, entry); }');
  lines.push('      const series = entry.series;');
  lines.push('      if (entry.lastBar === barIndex) series.update(value); else series.push(value);');
  lines.push('      entry.lastBar = barIndex;');
  lines.push('      return series;');
  lines.push('    }');
  lines.push('    const series = owner[member];');
  lines.push('    const lastBar = owner[member + "_bar"];');
  lines.push('    const fill = series.size === 0 ? NaN : series.get(0);');
  lines.push('    if (lastBar < barIndex - 1) {');
  lines.push('      for (let index = lastBar + 1; index < barIndex; index += 1) series.push(fill);');
  lines.push('    }');
  lines.push('    if (owner[member + "_bar"] === barIndex) series.update(value);');
  lines.push('    else series.push(value);');
  lines.push('    owner[member + "_bar"] = barIndex;');
  lines.push('    return series;');
  lines.push('  }');
  lines.push('  _scopedTA(state, memberName, className, args) {');
  lines.push('    if (!state) return this._dynamicTA(memberName, className, args);');
  lines.push('    if (!state.__taCache) state.__taCache = new Map();');
  lines.push('    if (!state.__taLast) state.__taLast = new Map();');
  lines.push('    const last = state.__taLast.get(memberName);');
  lines.push('    if (last && last.args.length === args.length && last.args.every((value, index) => Object.is(value, args[index]))) return last.instance;');
  lines.push('    const keyArgs = className === "Variance" || className === "StdDev" ? args.slice(0, 1) : args;');
  lines.push('    const key = memberName + ":" + keyArgs.map((arg) => typeof arg + "=" + String(arg)).join("|");');
  lines.push('    let entry = state.__taCache.get(key);');
  lines.push('    if (!entry) {');
  lines.push('      entry = { className, args, instance: new this._deps[className](...args) };');
  lines.push('      state.__taCache.set(key, entry);');
  lines.push('    }');
  lines.push('    state.__taLast.set(memberName, entry);');
  lines.push('    return entry.instance;');
  lines.push('  }');
  lines.push('  _scopedTASeries(state, memberName, returnsArray = false) {');
  lines.push('    if (!state) return this[`_ta_result_${memberName}`];');
  lines.push('    if (!state.__taSeries) state.__taSeries = new Map();');
  lines.push('    let series = state.__taSeries.get(memberName);');
  lines.push('    if (!series) {');
  lines.push('      const Series = returnsArray ? this._deps.ValueSeries : this._deps.NumericSeries;');
  lines.push('      series = new Series(this._deps.maxBarsBack + 1, this._deps.maxBarsBack, state.__historyKey + ":ta:" + memberName);');
  lines.push('      state.__taSeries.set(memberName, series);');
  lines.push('    }');
  lines.push('    return series;');
  lines.push('  }');
  lines.push('  _momFromSeries(series, length) {');
  lines.push('    const n = Number(length);');
  lines.push('    if (!Number.isFinite(n) || Math.trunc(n) !== n || n < 1) throw new Error(`TA length must be a positive integer; got ${Number.isNaN(n) ? "na" : n}. TradingView rejects zero, negative, fractional, and na lengths, so guard computed lengths or add one before calling TA functions`);');
  lines.push('    return Number(series.get(0)) - Number(series.get(n));');
  lines.push('  }');
  if (hasDynamicLagCalls) {
    lines.push('  _lagChangeFromSeries(series, length, rate) {');
    lines.push('    const difference = this._momFromSeries(series, length);');
    lines.push('    const previous = Number(series.get(Number(length)));');
    lines.push('    if (rate) return previous === 0 ? NaN : (100 * difference) / previous;');
    lines.push('    const current = series.get(0);');
    lines.push('    return typeof current === "boolean" && previous === previous ? current !== Boolean(previous) : difference;');
    lines.push('  }');
  }
  // Immutable slot metadata preserves WMA warmup/fill through bounded history
  // eviction, while the normal series update/restore handles replacement.
  lines.push('  _wmaSourceHistory(state, member, source, barIndex) {');
  lines.push('    const series = this._expressionHistory(state, member, NaN, barIndex);');
  lines.push('    const previous = series.get(1);');
  lines.push('    const defined = !Number.isNaN(Number(source));');
  lines.push('    series.update({ source: Number(source), filled: defined ? Number(source) : (previous?.filled ?? NaN), valid: (previous?.valid ?? 0) + (defined ? 1 : 0) });');
  lines.push('    return series;');
  lines.push('  }');
  if (hasSharedHistoryCalls) {
    lines.push('  _historyTAFromSeries(state, memberName, className, args, series, barIndex) {');
    lines.push('    const instance = this._scopedTA(state, memberName, className, args);');
    lines.push('    const entry = state ? state.__taLast.get(memberName) : this._dynamicTALast.get(memberName);');
    lines.push('    if (entry.historyBar === barIndex) return instance.recompute(...series.get(0)[1]);');
    lines.push('    const samples = [];');
    lines.push('    for (let index = 0; index < series.size; index++) {');
    lines.push('      const sample = series.get(index);');
    lines.push('      if (!Array.isArray(sample)) continue;');
    lines.push('      if (sample[0] <= entry.historyBar) break;');
    lines.push('      if (samples.length === 0 || samples[samples.length - 1][0] !== sample[0]) samples.push(sample);');
    lines.push('    }');
    lines.push('    let result = NaN;');
    lines.push('    for (let index = samples.length - 1; index >= 0; index--) result = instance.compute(...samples[index][1]);');
    lines.push('    entry.historyBar = barIndex;');
    lines.push('    return result;');
    lines.push('  }');
  }
  lines.push('  _windowTAFromSeries(series, className, args, barIndex) {');
  lines.push('    if (["Highest", "Lowest", "HighestBars", "LowestBars"].includes(className)) {');
  lines.push('      const n = Number(args[0]);');
  lines.push('      const highest = className === "Highest" || className === "HighestBars";');
  lines.push('      const returnsOffset = className.endsWith("Bars");');
  lines.push('      if (!this._windowTAStates) this._windowTAStates = new WeakMap();');
  lines.push('      let state = this._windowTAStates.get(series);');
  lines.push(
    '      const rebuild = !state || state.className !== className || !Object.is(state.length, args[0]) || state.barIndex + 1 !== barIndex;',
  );
  lines.push('      if (rebuild) {');
  lines.push('        new this._deps[className](...args);');
  lines.push('        series.get(Math.min(n - 1, series.capacity - 1));');
  lines.push('        state = { className, length: args[0], barIndex, queue: [], head: 0, samples: Math.min(series.size, n) };');
  lines.push('        this._windowTAStates.set(series, state);');
  lines.push('      }');
  lines.push('      const queue = state.queue;');
  lines.push('      for (let offset = rebuild ? Math.min(series.size, n) - 1 : 0; offset >= 0; offset--) {');
  lines.push('        const value = Number(series.get(offset));');
  lines.push('        if (Number.isNaN(value)) { queue.length = 0; state.head = 0; continue; }');
  lines.push('        while (queue.length > state.head) {');
  lines.push('          const previous = queue[queue.length - 1][1];');
  lines.push(
    '          const betterZero = !returnsOffset && value === 0 && previous === 0 && !Object.is(value, previous) && (highest ? Object.is(value, 0) : Object.is(value, -0));',
  );
  lines.push('          if (!(highest ? value > previous : value < previous) && !betterZero) break;');
  lines.push('          queue.pop();');
  lines.push('        }');
  lines.push('        queue.push([barIndex - offset, value]);');
  lines.push('      }');
  lines.push('      while (state.head < queue.length && queue[state.head][0] <= barIndex - n) state.head++;');
  lines.push('      if (!rebuild) state.samples = Math.min(n, state.samples + 1); const first = queue[state.head];');
  lines.push(
    '      const result = state.samples < n ? NaN : first ? (returnsOffset ? first[0] - barIndex : first[1]) : (returnsOffset ? 0 : NaN);',
  );
  lines.push('      state.barIndex = barIndex;');
  lines.push(
    '      if (state.head > 128 && state.head * 2 > queue.length) { state.queue = queue.slice(state.head); state.head = 0; }',
  );
  lines.push('      return result;');
  lines.push('    }');
  lines.push('    const pivot = className === "PivotHigh" || className === "PivotLow";');
  lines.push('    const strengths = pivot ? this._deps[className].windowStrengths(...args) : undefined;');
  lines.push('    const instance = pivot ? undefined : new this._deps[className](...args);');
  lines.push('    const n = Number(args[0]) + (className === "PivotHigh" || className === "PivotLow" ? Number(args[1]) + 1 : 0);');
  lines.push('    if (Number.isInteger(n) && n > 0) series.get(Math.min(n - 1, series.capacity - 1));');
  lines.push('    if (className === "WMA") {');
  lines.push('      if (series.size < n) return NaN;');
  lines.push('      const filledWMA = args[1];');
  lines.push('      const current = series.get(0);');
  lines.push('      if (filledWMA && (Number.isNaN(current.source) || current.valid < n)) return NaN;');
  lines.push('      let result = NaN;');
  lines.push('      for (let index = n - 1; index >= 0; index -= 1) {');
  lines.push('        const slot = series.get(index);');
  lines.push('        result = instance.compute(filledWMA ? slot.filled : Number(slot));');
  lines.push('      }');
  lines.push('      return result;');
  lines.push('    }');
  lines.push('    const skipNa = ["Median", "Mode", "Range"].includes(className);');
  lines.push('    const samples = [];');
  lines.push('    for (let index = 0; index < series.size && samples.length < n; index += 1) {');
  lines.push('      const value = Number(series.get(index));');
  lines.push('      if (!skipNa || !Number.isNaN(value)) samples.push(value);');
  lines.push('    }');
  lines.push('    if (samples.length < n) return NaN;');
  lines.push('    if (pivot) return this._deps[className].computeWindow(samples, ...strengths);');
  lines.push('    let result = NaN;');
  lines.push(
    '    for (let index = samples.length - 1; index >= 0; index -= 1) result = instance.compute(samples[index]);',
  );
  lines.push('    return result;');
  lines.push('  }');
  lines.push('  _builtinCallId(state, id) {');
  lines.push('    return state ? `${state.__callPath}:${id}` : id;');
  lines.push('  }');
  lines.push('  _fixnanValue(state, id, value) {');
  lines.push('    if (!state.__fixnan) state.__fixnan = new Map();');
  lines.push('    if (_isNa(value)) return state.__fixnan.has(id) ? state.__fixnan.get(id) : NaN;');
  lines.push('    state.__fixnan.set(id, value);');
  lines.push('    return value;');
  lines.push('  }');
  lines.push('  _childFnState(parentState, callSiteId, localNames, hasTACalls, hasExpressionHistory, varipNames, udtNames) {');
  lines.push('    if (!parentState) return undefined;');
  lines.push('    if (!parentState.__fnStates) parentState.__fnStates = new Map();');
  lines.push('    let state = parentState.__fnStates.get(callSiteId);');
  lines.push('    if (!state) {');
  lines.push('      state = { __historyKey: parentState.__historyKey + "/" + callSiteId, __callPath: `${parentState.__callPath}/${callSiteId}`, __varipNames: varipNames, __udtNames: udtNames };');
  lines.push('      for (const name of localNames) {');
  lines.push('        state[`_v_${name}`] = NaN;');
  lines.push('        state[`__init_${name}`] = false;');
  lines.push('      }');
  lines.push('      if (hasTACalls) {');
  lines.push('        state.__taCache = new Map();');
  lines.push('        state.__taSeries = new Map();');
  lines.push('        state.__taLast = new Map();');
  lines.push('      }');
  lines.push('      if (hasExpressionHistory) state.__expressionHistories = new Map();');
  lines.push('      parentState.__fnStates.set(callSiteId, state);');
  lines.push('    }');
  lines.push('    return state;');
  lines.push('  }');
  lines.push('  _functionHistory(state, member) {');
  lines.push('    if (!state.__functionHistories) state.__functionHistories = new Map();');
  lines.push('    let series = state.__functionHistories.get(member);');
  lines.push('    if (!series) {');
  lines.push('      series = new this._deps.ValueSeries(this._deps.maxBarsBack + 1, this._deps.maxBarsBack, state.__historyKey + ":function:" + member);');
  lines.push('      series.__tealscriptLastBar = -1;');
  lines.push('      state.__functionHistories.set(member, series);');
  lines.push('    }');
  lines.push('    return series;');
  lines.push('  }');
  lines.push('  _saveChildFnStates(states) {');
  lines.push('    return Array.from((states ?? new Map()).entries()).map(([key, state]) => [key, this._saveFnState(state)]);');
  lines.push('  }');
  lines.push('  _saveFnState(state) {');
  lines.push('    const snap = {};');
  lines.push('    for (const [key, value] of Object.entries(state)) {');
  lines.push('      if (key !== "__taCache" && key !== "__taSeries" && key !== "__taLast" && key !== "__fnStates" && key !== "__expressionHistories" && key !== "__functionHistories" && key !== "__fixnan") snap[key] = value;');
  lines.push('    }');
  lines.push('    if (state.__fixnan) snap.__fixnan = Array.from(state.__fixnan.entries());');
  lines.push(`    if (state.__taCache) snap.__taCache = Array.from(state.__taCache.entries()).map(([key, entry]) => [key, entry.className, entry.args, entry.instance.save()${taHistoryEntryField}]);`);
  lines.push('    if (state.__taSeries) snap.__taSeries = Array.from(state.__taSeries.entries()).map(([key, series]) => [key, series.save()]);');
  lines.push('    if (state.__fnStates) snap.__fnStates = this._saveChildFnStates(state.__fnStates);');
  lines.push('    if (state.__expressionHistories) snap.__expressionHistories = Array.from(state.__expressionHistories.entries()).map(([key, entry]) => [key, entry.lastBar, entry.series.save()]);');
  lines.push('    if (state.__functionHistories) snap.__functionHistories = Array.from(state.__functionHistories.entries()).map(([key, series]) => [key, series.__tealscriptLastBar, series.save()]);');
  lines.push('    return snap;');
  lines.push('  }');
  lines.push('  _restoreChildFnStates(snapshots) {');
  lines.push('    const states = new Map();');
  lines.push('    for (const [key, snap] of snapshots ?? []) {');
  lines.push('      const state = {};');
  lines.push('      this._restoreFnState(state, snap);');
  lines.push('      states.set(key, state);');
  lines.push('    }');
  lines.push('    return states;');
  lines.push('  }');
  lines.push('  _restoreFnState(state, snap) {');
  lines.push('    for (const [key, value] of Object.entries(snap ?? {})) {');
  lines.push('      if (key !== "__taCache" && key !== "__taSeries" && key !== "__taLast" && key !== "__fnStates" && key !== "__expressionHistories" && key !== "__functionHistories" && key !== "__fixnan") state[key] = value;');
  lines.push('    }');
  lines.push('    state.__fixnan = new Map(snap?.__fixnan ?? []);');
  lines.push('    state.__taCache = new Map();');
  lines.push(`    for (const [key, className, args, saved${taHistoryBinding}] of snap?.__taCache ?? []) {`);
  lines.push('      const instance = new this._deps[className](...args);');
  lines.push('      instance.restore(saved);');
  lines.push(`      state.__taCache.set(key, { className, args, instance${taHistoryBinding} });`);
  lines.push('    }');
  lines.push('    state.__taSeries = new Map();');
  lines.push('    for (const [key, saved] of snap?.__taSeries ?? []) {');
  lines.push('      const series = new this._deps.NumericSeries(this._deps.maxBarsBack + 1, this._deps.maxBarsBack, state.__historyKey + ":ta:" + key);');
  lines.push('      series.restore(saved);');
  lines.push('      state.__taSeries.set(key, series);');
  lines.push('    }');
  lines.push('    state.__taLast = new Map();');
  lines.push('    state.__fnStates = this._restoreChildFnStates(snap?.__fnStates);');
  lines.push('    state.__expressionHistories = new Map();');
  lines.push('    for (const [key, lastBar, saved] of snap?.__expressionHistories ?? []) {');
  lines.push('      const series = new this._deps.ValueSeries(this._deps.maxBarsBack + 1, this._deps.maxBarsBack, state.__historyKey + ":expression:" + key);');
  lines.push('      series.restore(saved);');
  lines.push('      state.__expressionHistories.set(key, { lastBar, series });');
  lines.push('    }');
  lines.push('    state.__functionHistories = new Map();');
  lines.push('    for (const [key, lastBar, saved] of snap?.__functionHistories ?? []) {');
  lines.push('      const series = this._functionHistory(state, key);');
  lines.push('      series.restore(saved);');
  lines.push('      series.__tealscriptLastBar = lastBar;');
  lines.push('    }');
  lines.push('  }');

  // User-defined functions
  const bodyParameterTypes = new Map<string, { path: string; types: Map<string, EnumRelatedType> }[]>();
  if ((enumTypeNames.size > 0 || ctx.typeDecls.size > 0) && [...ctx.funcInfos.values()].some((info) => info.paramTypeAnnotations.some((annotation) => !annotation))) {
    const types = checkProgram(ast, { libraries, recordCallTypeContexts: true, recordMethodFunctionCallTypeContexts: true, resolvedUserMethods: new WeakMap() });
    const collectBodyParameterTypes = (parent: SemanticExpressionTypeContext, path?: string, inheritedDefaults?: Map<string, EnumRelatedType>): void => {
      for (const [call, id] of functionEmitContext.callSites) {
        if (!path && functionEmitContext.nestedCallSites.has(call)) continue;
        const child = parent.callTypeContexts.get(call);
        if (!child) continue;
        const callPath = path ? `${path}/${id}` : `fn_${id}`;
        const selectedMethod = call.callee.type === 'MemberExpression'
          ? resolvedUserMethods.has(call) ? resolvedUserMethods.get(call) : child.resolvedUserMethod
          : undefined;
        const localMethod = selectedMethod && call.callee.type === 'MemberExpression'
          ? ctx.localMethodOverloads.get(call.callee.property.name)?.find((overload) => ctx.funcInfos.get(overload.internalName)?.body === selectedMethod.body)
          : undefined;
        const name = call.callee.type === 'Identifier' ? resolveUserFunctionCallName(call.callee.name, call) : localMethod?.internalName;
        const info = name ? ctx.funcInfos.get(name) : undefined;
        let nestedDefaults: Map<string, EnumRelatedType> | undefined;
        if (name && info && !ctx.importedFunctionOwners.has(name)) {
          const parameters = new Map<string, EnumRelatedType>();
          info.params.forEach((param, index) => {
            if (info.paramTypeAnnotations[index]) return;
            const argument = localMethod && call.callee.type === 'MemberExpression'
              ? index === 0 ? call.callee.object : orderedArgExpression(call.arguments, info.params.slice(1), param, index - 1)
              : orderedArgExpression(call.arguments, info.params, param, index);
            const type = argument ? parent.expressionTypes.get(argument) : undefined;
            const defaultValue = !argument ? info.paramDefaults[index] : undefined;
            const defaultType = defaultValue ? enumRelatedValueType(defaultValue)
              : argument?.type === 'Identifier' && (!type || type.kind === 'unknown') ? inheritedDefaults?.get(argument.name) : undefined;
            if (typeof defaultType === 'string' && (enumTypeNames.has(defaultType) || ctx.typeDecls.has(defaultType) || ((defaultValue || (argument?.type === 'Identifier' && inheritedDefaults?.has(argument.name))) && defaultType.match(/^(?:array|matrix|map)<(.+)>$/)?.[1]?.split(',').some((name) => enumTypeNames.has(name.trim()) || ctx.typeDecls.has(name.trim()))))) {
              parameters.set(param, defaultType);
              (nestedDefaults ??= new Map()).set(param, defaultType);
            }
            if (type?.kind === 'udt' && type.name && (enumTypeNames.has(type.name) || ctx.typeDecls.has(type.name))) parameters.set(param, type.name);
            const collectionType = type?.kind === 'array' || type?.kind === 'matrix'
              ? `${type.kind}<${type.elementType?.name ?? type.elementType?.kind}>`
              : type?.kind === 'map' ? `map<${type.keyType?.name ?? type.keyType?.kind},${type.valueType?.name ?? type.valueType?.kind}>` : undefined;
            if (collectionType?.match(/^(?:array|matrix|map)<(.+)>$/)?.[1]?.split(',').some((name) => enumTypeNames.has(name.trim()) || ctx.typeDecls.has(name.trim()))) parameters.set(param, collectionType);
          });
          if (parameters.size > 0) {
            const profiles = bodyParameterTypes.get(name) ?? [];
            profiles.push({ path: callPath, types: parameters });
            bodyParameterTypes.set(name, profiles);
          }
        }
        collectBodyParameterTypes(child, callPath, nestedDefaults);
      }
    };
    if (types.expressionTypes && types.callTypeContexts) collectBodyParameterTypes({ expressionTypes: types.expressionTypes, callTypeContexts: types.callTypeContexts });
  }
  for (const [name, fi] of ctx.funcInfos) {
    const paramNames = fi.params.map(localParamName);
    const functionStateName = '_state';
    const sourceParamNames = fi.params.map(localSourceParamName);
    const historyParamNames = fi.params.map(localHistoryParamName);
    const localHistoryVars = [...(functionEmitContext.localHistory.get(name) ?? new Set())];
    const localHistoryParamNames = localHistoryVars.map(localVariableHistoryParamName);
    const localNames = new Map(fi.params.map((param) => [param, localParamName(param)]));
    const localSourceNames = new Map(fi.params.map((param) => [param, localSourceParamName(param)]));
    const localHistoryNames = new Map([
      ...fi.params.map((param) => [param, localHistoryParamName(param)] as [string, string]),
      ...localHistoryVars.map((local) => [local, localVariableHistoryParamName(local)] as [string, string]),
    ]);
    const localVars = new Map((functionEmitContext.localVars.get(name) ?? []).map((v) => [v.name, `${functionStateName}.${jsVarMember(v.name)}`]));
    const functionParams = ['ctx', functionStateName, ...(arithmeticTypes ? ['_arithmeticContext'] : []), ...(methodTypes ? ['_methodContext'] : []), ...paramNames, ...sourceParamNames, ...historyParamNames, ...localHistoryParamNames].join(', ');

    lines.push(`  ${jsFunctionMember(name)}(${functionParams}) {`);
    functionNameStack.push(name);
    functionStateNameStack.push(functionStateName);
    localNameStack.push(localNames);
    const declaredParameterTypes = new Map(fi.params.flatMap((param, index) => {
      const type = enumRelatedAnnotationType(fi.paramTypeAnnotations[index], currentImportedAlias());
      return type ? [[param, type] as [string, string]] : [];
    }));
    localEnumValueTypes.set(localNames, declaredParameterTypes);
    localSourceNameStack.push(localSourceNames);
    localHistoryNameStack.push(localHistoryNames);
    persistentLocalStack.push(localVars);
    for (let i = 0; i < fi.params.length; i++) {
      const defaultExpr = fi.paramDefaults[i];
      if (defaultExpr) {
        lines.push(`    if (${paramNames[i]} === undefined) ${paramNames[i]} = ${emitExpr(defaultExpr)};`);
      }
    }
    const emitBody = (): void => {
      if (Array.isArray(fi.body)) emitFunctionBody(fi.body);
      else lines.push(`    return ${emitExpr(fi.body)};`);
    };
    for (const profile of bodyParameterTypes.get(name) ?? []) {
      lines.push(`    if (_state?.__callPath === ${JSON.stringify(profile.path)}) {`);
      localEnumValueTypes.set(localNames, new Map([...declaredParameterTypes, ...profile.types]));
      emitBody();
      lines.push('      return;');
      lines.push('    }');
    }
    localEnumValueTypes.set(localNames, declaredParameterTypes);
    emitBody();
    persistentLocalStack.pop();
    localHistoryNameStack.pop();
    localSourceNameStack.pop();
    localNameStack.pop();
    functionStateNameStack.pop();
    functionNameStack.pop();
    lines.push('  }');
  }

  // onBar method
  lines.push('  onBar(ctx) {');
  const loopClockInsertionIndex = lines.length;
  for (const diagnostic of ctx.importDiagnostics) {
    lines.push(`    ${runtimeErrorExpr(diagnostic)};`);
  }

  // Push bar field series
  for (const [field, member] of Object.entries(BAR_FIELDS)) {
    if (ctx.barFieldSeriesVars.has(field) || ctx.usedBarFields.has(field) || field === 'close' || field === 'open' || field === 'high' || field === 'low') {
      lines.push(`    if (ctx.isFirstTick) this.${member}.push(ctx.bar.${field}); else this.${member}.update(ctx.bar.${field});`);
    }
  }

  // Push computed bar field series
  const computedFieldExprs: Record<string, string> = {
    hl2: '(ctx.bar.high + ctx.bar.low) / 2',
    hlc3: '(ctx.bar.high + ctx.bar.low + ctx.bar.close) / 3',
    ohlc4: '(ctx.bar.open + ctx.bar.high + ctx.bar.low + ctx.bar.close) / 4',
    hlcc4: '(ctx.bar.high + ctx.bar.low + ctx.bar.close + ctx.bar.close) / 4',
  };
  for (const name of computedBarFields) {
    if (ctx.barFieldSeriesVars.has(name)) {
      lines.push(`    if (ctx.isFirstTick) this._s_${name}.push(${computedFieldExprs[name]}); else this._s_${name}.update(${computedFieldExprs[name]});`);
    }
  }

  // Update TA variable series
  for (const site of ctx.taVarSites) {
    if (site.className === 'VWAP') {
      const source = '((ctx.bar.high + ctx.bar.low + ctx.bar.close) / 3)';
      const anchor = '(ctx.barIndex === 0 || ctx.callBuiltin("timeframe.change", ["1D"], {}, "vwap_variable_anchor"))';
      lines.push(`    if (ctx.isFirstTick) this.${site.seriesName}.push(this.${site.memberName}.compute(${source}, ${anchor}, ctx.bar.volume)); else this.${site.seriesName}.update(this.${site.memberName}.recompute(${source}, ${anchor}, ctx.bar.volume));`);
    } else if (site.className === 'OBV') {
      lines.push(`    if (ctx.isFirstTick) this.${site.seriesName}.push(this.${site.memberName}.compute(ctx.bar.close, ctx.bar.volume)); else this.${site.seriesName}.update(this.${site.memberName}.recompute(ctx.bar.close, ctx.bar.volume));`);
    } else {
      lines.push(`    if (ctx.isFirstTick) this.${site.seriesName}.push(this.${site.memberName}.compute(ctx.bar.open, ctx.bar.high, ctx.bar.low, ctx.bar.close, ctx.bar.volume)); else this.${site.seriesName}.update(this.${site.memberName}.recompute(ctx.bar.open, ctx.bar.high, ctx.bar.low, ctx.bar.close, ctx.bar.volume));`);
    }
  }
  for (const [site, memberName] of taSourceSeries) {
    if (inlineTASourceSeries.has(site)) continue;
    const sourceArg = site.computeArgExprs[0];
    if (sourceArg) {
      lines.push(`    if (ctx.isFirstTick) this.${memberName}.push(${emitExpr(sourceArg)}); else this.${memberName}.update(${emitExpr(sourceArg)});`);
      lines.push(`    this.${memberName}_bar = ctx.barIndex;`);
    }
  }
  // Emit body
  for (const stmt of ast.body) {
    emitStmt(stmt, 2);
  }
  for (const [name, kind] of collectionHistoryVars) {
    const collectionIdentifier = { type: 'Identifier', name } as Identifier;
    const currentCollection = emitIdentifier(collectionIdentifier);
    lines.push(`    if (ctx.isFirstTick) this.${jsCollectionHistoryMember(name)}.push(this._copyCollection(${JSON.stringify(kind)}, ${currentCollection})); else this.${jsCollectionHistoryMember(name)}.update(this._copyCollection(${JSON.stringify(kind)}, ${currentCollection}));`);
  }

  lines.push('  }');
  if (loopId > 0) {
    lines.splice(loopClockInsertionIndex, 0, '    this._loopIters = 0; this._loopDepth = 0;');
  }

  // Insert fixnan member initialization into the constructor
  if (fixnanIndex > 0) {
    const fixnanLines: string[] = [];
    for (let i = 0; i < fixnanIndex; i++) {
      fixnanLines.push(`    this._fixnan_${i} = NaN;`);
    }
    lines.splice(fixnanPlaceholderIdx, 0, ...fixnanLines);
  }
  for (const member of onceStateMembers) {
    lines.splice(fixnanPlaceholderIdx, 0, `    this.${member} = false;`);
  }

  const varipStates = [
    ...ctx.varDecls.filter((v) => v.kind === 'varip').map((v) => ({ value: `this.${jsVarMember(v.name)}`, init: `this.${jsInitMember(v.name)}` })),
    ...rootBlockPersistentStates.filter((state) => state.kind === 'varip'),
  ];
  const varipFunctionStates = [...functionEmitContext.callSites]
    .filter(([callExpr]) => callSiteNeedsState(callExpr))
    .map(([, id]) => `this.${jsStateMember('_fn_state_', String(id))}`);
  const varipUdtStates = [
    ...ctx.varDecls.filter((v) => v.kind === 'var').map((v) => `this.${jsVarMember(v.name)}`),
    ...rootBlockPersistentStates.filter((state) => state.kind === 'var').map((state) => state.value),
  ];
  lines.push('  _saveUdtVarip(object) {');
  lines.push('    if (!object || object.__tealscriptUdt !== true) return [];');
  lines.push('    return Array.from(object.varipFields).flatMap((name) => {');
  lines.push('      const value = object.fields.get(name);');
  lines.push('      return ["number", "string", "boolean"].includes(typeof value) ? [[name, value]] : [];');
  lines.push('    });');
  lines.push('  }');
  lines.push('  _restoreUdtVarip(object, fields) {');
  lines.push('    if (!object || object.__tealscriptUdt !== true) return;');
  lines.push('    for (const [name, value] of fields) {');
  lines.push('      if (object.varipFields.has(name) && object.fields.has(name)) object.fields.set(name, value);');
  lines.push('    }');
  lines.push('  }');
  lines.push('  _saveFnVarip(state, barTime, before) {');
  lines.push('    return [(state.__varipNames ?? []).map((name) => [name, this._deps._udt.captureVaripReference(state[`_v_${name}`], barTime, before), state[`__init_${name}`]]), Array.from(state.__fnStates ?? []).map(([id, child]) => [id, this._saveFnVarip(child, barTime, before)]), (state.__udtNames ?? []).map((name) => [name, this._saveUdtVarip(state[`_v_${name}`])])];');
  lines.push('  }');
  lines.push('  _restoreFnVarip(state, snap) {');
  lines.push('    state.__varipNames = snap[0].map(([name]) => name);');
  lines.push('    for (const [name, value, initialized] of snap[0]) {');
  lines.push('      state[`_v_${name}`] = this._deps._udt.restoreVaripReference(value);');
  lines.push('      state[`__init_${name}`] = initialized;');
  lines.push('    }');
  lines.push('    state.__udtNames = snap[2].map(([name]) => name);');
  lines.push('    for (const [name, fields] of snap[2]) this._restoreUdtVarip(state[`_v_${name}`], fields);');
  lines.push('    if (!state.__fnStates) state.__fnStates = new Map();');
  lines.push('    for (const [id, child] of snap[1]) {');
  lines.push('      if (!state.__fnStates.has(id)) state.__fnStates.set(id, {});');
  lines.push('      this._restoreFnVarip(state.__fnStates.get(id), child);');
  lines.push('    }');
  lines.push('  }');
  lines.push('  saveVarip(barTime, before = false) {');
  lines.push('    return [');
  for (const state of varipStates) lines.push(`      [this._deps._udt.captureVaripReference(${state.value}, barTime, before), ${state.init}],`);
  for (const state of varipFunctionStates) lines.push(`      this._saveFnVarip(${state}, barTime, before),`);
  for (const state of varipUdtStates) lines.push(`      this._saveUdtVarip(${state}),`);
  lines.push('    ];');
  lines.push('  }');
  lines.push('  restoreVarip(snap) {');
  for (const [index, state] of varipStates.entries()) {
    lines.push(`    ${state.value} = this._deps._udt.restoreVaripReference(snap[${index}][0]);`);
    lines.push(`    ${state.init} = snap[${index}][1];`);
  }
  for (const [index, state] of varipFunctionStates.entries()) {
    lines.push(`    this._restoreFnVarip(${state}, snap[${varipStates.length + index}]);`);
  }
  for (const [index, state] of varipUdtStates.entries()) {
    lines.push(`    this._restoreUdtVarip(${state}, snap[${varipStates.length + varipFunctionStates.length + index}]);`);
  }
  lines.push('  }');

  // save/restore for realtime rollback
  lines.push('  save() {');
  lines.push('    return {');
  for (const site of sourceSeriesSMASites) {
    lines.push(`      _sma_source_${site.memberName}: this._sma_source_${site.memberName}.save(),`);
  }
  for (const field of Object.values(BAR_FIELDS)) {
    lines.push(`      ${field}: this.${field}.save(),`);
  }
  for (const name of computedBarFields) {
    if (ctx.barFieldSeriesVars.has(name)) {
      lines.push(`      _s_${name}: this._s_${name}.save(),`);
    }
  }
  for (const name of ctx.seriesVars) {
    lines.push(`      ${jsSeriesMember(name)}: this.${jsSeriesMember(name)}.save(),`);
    lines.push(`      ${jsSeriesBarMember(name)}: this.${jsSeriesBarMember(name)},`);
  }
  for (const [objectName, fields] of fieldHistory) {
    for (const field of fields) {
      const member = fieldHistoryMemberName(objectName, field);
      lines.push(`      ${member}: this.${member}.save(),`);
    }
  }
  for (const member of [...expressionHistory.values(), ...momentumSourceHistory.values()]) {
    lines.push(`      ${member}: this.${member}.save(),`);
    lines.push(`      ${member}_bar: this.${member}_bar,`);
  }
  for (const name of collectionHistoryVars.keys()) {
    lines.push(`      ${jsCollectionHistoryMember(name)}: this.${jsCollectionHistoryMember(name)}.save(),`);
  }
  for (const v of ctx.varDecls) {
    lines.push(`      ${jsVarMember(v.name)}: this.${jsVarMember(v.name)},`);
    lines.push(`      ${jsInitMember(v.name)}: this.${jsInitMember(v.name)},`);
  }
  for (const state of rootBlockPersistentStates) {
    const valueMember = state.value.replace(/^this\./, '');
    const initMember = state.init.replace(/^this\./, '');
    lines.push(`      ${valueMember}: ${state.value},`);
    lines.push(`      ${initMember}: ${state.init},`);
  }
  for (const name of rootRegularVars) {
    if (!ctx.seriesVars.has(name) && !ctx.varDecls.some((v) => v.name === name)) {
      lines.push(`      ${jsGlobalMember(name)}: this.${jsGlobalMember(name)},`);
    }
  }
  for (const [callExpr, id] of functionEmitContext.callSites) {
    const localVars = callSiteLocalVars(callExpr);
    const hasTACalls = callSiteHasTACalls(callExpr);
    if (callSiteNeedsState(callExpr)) {
      const stateMember = jsStateMember('_fn_state_', String(id));
      lines.push(`      ${stateMember}: {`);
      for (const localVar of localVars) {
        lines.push(`        ${jsVarMember(localVar.name)}: this.${stateMember}.${jsVarMember(localVar.name)},`);
        lines.push(`        ${jsInitMember(localVar.name)}: this.${stateMember}.${jsInitMember(localVar.name)},`);
      }
      if (hasTACalls) {
        lines.push(`        __taCache: Array.from(this.${stateMember}.__taCache.entries()).map(([key, entry]) => [key, entry.className, entry.args, entry.instance.save()]),`);
        lines.push(`        __taSeries: Array.from(this.${stateMember}.__taSeries.entries()).map(([key, series]) => [key, series.save()]),`);
      }
      if (hasDynamicLagCalls && callSiteHasExpressionHistory(callExpr)) {
        lines.push(`        __expressionHistories: Array.from(this.${stateMember}.__expressionHistories.entries()).map(([key, entry]) => [key, entry.lastBar, entry.series.save()]),`);
      }
      lines.push(`        __fixnan: Array.from(this.${stateMember}.__fixnan ?? []),`);
      lines.push(`        __fnStates: this._saveChildFnStates(this.${stateMember}.__fnStates),`);
      lines.push('      },');
    }
    for (const param of callSiteHistoryParams(callExpr)) {
      const member = jsStateMember('_fn_param_series_', `${id}_${param}`);
      lines.push(`      ${member}: this.${member}.save(),`);
      lines.push(`      ${member}_bar: this.${member}.__tealscriptLastBar ?? -1,`);
    }
    for (const local of callSiteHistoryLocals(callExpr)) {
      const member = jsStateMember('_fn_local_series_', `${id}_${local}`);
      lines.push(`      ${member}: this.${member}.save(),`);
      lines.push(`      ${member}_bar: this.${member}.__tealscriptLastBar ?? -1,`);
    }
  }
  for (const site of ctx.taCallSites) {
    if (site.dynamicCtorArgExprs) continue;
    lines.push(`      ${site.memberName}: this.${site.memberName}.save(),`);
  }
  for (const site of ctx.taCallSites) {
    lines.push(`      _ta_result_${site.memberName}: this._ta_result_${site.memberName}.save(),`);
  }
  for (const memberName of taSourceSeries.values()) {
    lines.push(`      ${memberName}: this.${memberName}.save(),`);
    lines.push(`      ${memberName}_bar: this.${memberName}_bar,`);
  }
  lines.push(`      _dynamicTACache: Array.from(this._dynamicTACache.entries()).map(([key, entry]) => [key, entry.className, entry.args, entry.instance.save()${taHistoryEntryField}]),`);
  for (const site of ctx.taVarSites) {
    lines.push(`      ${site.memberName}: this.${site.memberName}.save(),`);
    lines.push(`      ${site.seriesName}: this.${site.seriesName}.save(),`);
  }
  for (let i = 0; i < fixnanIndex; i++) {
    lines.push(`      _fixnan_${i}: this._fixnan_${i},`);
  }
  for (const member of onceStateMembers) {
    lines.push(`      ${member}: this.${member},`);
  }
  lines.push('    };');
  lines.push('  }');

  lines.push('  restore(snap) {');
  lines.push('    this._windowTAStates = undefined;');
  for (const site of sourceSeriesSMASites) {
    lines.push(`    this._sma_source_${site.memberName}.restore(snap._sma_source_${site.memberName});`);
  }
  for (const field of Object.values(BAR_FIELDS)) {
    lines.push(`    this.${field}.restore(snap.${field});`);
  }
  for (const name of computedBarFields) {
    if (ctx.barFieldSeriesVars.has(name)) {
      lines.push(`    this._s_${name}.restore(snap._s_${name});`);
    }
  }
  for (const name of ctx.seriesVars) {
    lines.push(`    this.${jsSeriesMember(name)}.restore(snap.${jsSeriesMember(name)});`);
    lines.push(`    this.${jsSeriesBarMember(name)} = snap.${jsSeriesBarMember(name)};`);
  }
  for (const [objectName, fields] of fieldHistory) {
    for (const field of fields) {
      const member = fieldHistoryMemberName(objectName, field);
      lines.push(`    this.${member}.restore(snap.${member});`);
    }
  }
  for (const member of [...expressionHistory.values(), ...momentumSourceHistory.values()]) {
    lines.push(`    this.${member}.restore(snap.${member});`);
    lines.push(`    this.${member}_bar = snap.${member}_bar;`);
  }
  for (const name of collectionHistoryVars.keys()) {
    lines.push(`    this.${jsCollectionHistoryMember(name)}.restore(snap.${jsCollectionHistoryMember(name)});`);
  }
  for (const v of ctx.varDecls) {
    if (v.kind !== 'varip') {
      lines.push(`    this.${jsVarMember(v.name)} = snap.${jsVarMember(v.name)};`);
      lines.push(`    this.${jsInitMember(v.name)} = snap.${jsInitMember(v.name)};`);
    }
  }
  for (const state of rootBlockPersistentStates) {
    if (state.kind !== 'varip') {
      const valueMember = state.value.replace(/^this\./, '');
      const initMember = state.init.replace(/^this\./, '');
      lines.push(`    ${state.value} = snap.${valueMember};`);
      lines.push(`    ${state.init} = snap.${initMember};`);
    }
  }
  for (const name of rootRegularVars) {
    if (!ctx.seriesVars.has(name) && !ctx.varDecls.some((v) => v.name === name)) {
      lines.push(`    this.${jsGlobalMember(name)} = snap.${jsGlobalMember(name)};`);
    }
  }
  for (const [callExpr, id] of functionEmitContext.callSites) {
    const localVars = callSiteLocalVars(callExpr);
    const hasTACalls = callSiteHasTACalls(callExpr);
    if (callSiteNeedsState(callExpr)) {
      const stateMember = jsStateMember('_fn_state_', String(id));
      lines.push(`    if (snap.${stateMember}) {`);
      for (const localVar of localVars) {
        if (localVar.kind === 'varip') continue;
        lines.push(`      this.${stateMember}.${jsVarMember(localVar.name)} = snap.${stateMember}.${jsVarMember(localVar.name)};`);
        lines.push(`      this.${stateMember}.${jsInitMember(localVar.name)} = snap.${stateMember}.${jsInitMember(localVar.name)};`);
      }
      if (hasTACalls) {
        lines.push(`      this.${stateMember}.__taCache = new Map();`);
        lines.push(`      for (const [key, className, args, state] of snap.${stateMember}.__taCache ?? []) {`);
        lines.push('        const instance = new this._deps[className](...args);');
        lines.push('        instance.restore(state);');
        lines.push(`        this.${stateMember}.__taCache.set(key, { className, args, instance });`);
        lines.push('      }');
        lines.push(`      this.${stateMember}.__taSeries = new Map();`);
        lines.push(`      for (const [key, state] of snap.${stateMember}.__taSeries ?? []) {`);
        lines.push(`        const series = new this._deps.NumericSeries(this._deps.maxBarsBack + 1, this._deps.maxBarsBack, this.${stateMember}.__historyKey + ":ta:" + key);`);
        lines.push('        series.restore(state);');
        lines.push(`        this.${stateMember}.__taSeries.set(key, series);`);
        lines.push('      }');
        lines.push(`      this.${stateMember}.__taLast = new Map();`);
      }
      if (hasDynamicLagCalls && callSiteHasExpressionHistory(callExpr)) {
        lines.push(`      this.${stateMember}.__expressionHistories = new Map();`);
        lines.push(`      for (const [key, lastBar, saved] of snap.${stateMember}.__expressionHistories ?? []) {`);
        lines.push(`        const series = new this._deps.ValueSeries(this._deps.maxBarsBack + 1, this._deps.maxBarsBack, this.${stateMember}.__historyKey + ":expression:" + key);`);
        lines.push('        series.restore(saved);');
        lines.push(`        this.${stateMember}.__expressionHistories.set(key, { lastBar, series });`);
        lines.push('      }');
      }
      lines.push(`      this.${stateMember}.__fixnan = new Map(snap.${stateMember}.__fixnan ?? []);`);
      lines.push(`      this.${stateMember}.__fnStates = this._restoreChildFnStates(snap.${stateMember}.__fnStates);`);
      lines.push('    }');
    }
    for (const param of callSiteHistoryParams(callExpr)) {
      const member = jsStateMember('_fn_param_series_', `${id}_${param}`);
      lines.push(`    this.${member}.restore(snap.${member});`);
      lines.push(`    this.${member}.__tealscriptLastBar = snap.${member}_bar ?? -1;`);
    }
    for (const local of callSiteHistoryLocals(callExpr)) {
      const member = jsStateMember('_fn_local_series_', `${id}_${local}`);
      lines.push(`    this.${member}.restore(snap.${member});`);
      lines.push(`    this.${member}.__tealscriptLastBar = snap.${member}_bar ?? -1;`);
    }
  }
  for (const site of ctx.taCallSites) {
    if (site.dynamicCtorArgExprs) continue;
    lines.push(`    this.${site.memberName}.restore(snap.${site.memberName});`);
  }
  for (const site of ctx.taCallSites) {
    lines.push(`    this._ta_result_${site.memberName}.restore(snap._ta_result_${site.memberName});`);
  }
  for (const memberName of taSourceSeries.values()) {
    lines.push(`    this.${memberName}.restore(snap.${memberName});`);
    lines.push(`    this.${memberName}_bar = snap.${memberName}_bar;`);
  }
  lines.push('    this._dynamicTACache = new Map();');
  lines.push('    this._dynamicTALast = new Map();');
  lines.push(`    for (const [key, className, args, state${taHistoryBinding}] of snap._dynamicTACache ?? []) {`);
  lines.push('      const instance = new this._deps[className](...args);');
  lines.push('      instance.restore(state);');
  lines.push(`      this._dynamicTACache.set(key, { className, args, instance${taHistoryBinding} });`);
  lines.push('    }');
  for (const site of ctx.taVarSites) {
    lines.push(`    this.${site.memberName}.restore(snap.${site.memberName});`);
    lines.push(`    this.${site.seriesName}.restore(snap.${site.seriesName});`);
  }
  for (let i = 0; i < fixnanIndex; i++) {
    lines.push(`    this._fixnan_${i} = snap._fixnan_${i};`);
  }
  for (const member of onceStateMembers) {
    lines.push(`    this.${member} = snap.${member};`);
  }
  lines.push('  }');

  lines.push('};');

  if (needsDrawingBetween) {
    lines.unshift('function _betweenLegacyNa(value, upper, lower) { return !_isNa(value) && !_isNa(upper) && !_isNa(lower) && value <= upper && value >= lower; }');
  }
  lines.splice(udtFactoryInsertionIndex, 0, ...[...udtFactories].map(([typeName, factory]) =>
    `    this.${factory.member} = deps._udt.factory(${JSON.stringify(typeName)}, ${JSON.stringify(factory.names)}, [${factory.varip.join(', ')}]);`));
  return lines.join('\n');
}

export const RUNTIME_HELPERS = `
${PINE_EXP_RUNTIME_HELPER}
function _divisionDenominator(v) { const n = Number(v); return n === 0 ? NaN : n; }
function _isNa(v) { return v !== v || v === undefined || v === null; }
function _string(v) { return _isNa(v) ? NaN : String(v); }
function _boolHistory(v, sourceIsBool = true) { return sourceIsBool && _isNa(v) ? false : v; }
function _isTruthy(v) { return v !== false && v !== 0 && !_isNa(v); }
// Native v4 comparison and builtin MFI share one captured predicate.
const _comparisonEqual = ${comparisonEqual.toString()};
function _eq(a, b) { return _isNa(a) || _isNa(b) ? false : _comparisonEqual(a, b); }
function _neq(a, b) { return _isNa(a) || _isNa(b) ? false : !_comparisonEqual(a, b); }
function _cmp(a, b, op) {
  if (_isNa(a) || _isNa(b)) return false;
  if (_comparisonEqual(a, b)) return op === '>=' || op === '<=';
  switch (op) {
    case '>': return a > b;
    case '<': return a < b;
    case '>=': return a >= b;
    case '<=': return a <= b;
  }
  return false;
}
function _eqLegacyNa(a, b) { return _isNa(a) || _isNa(b) ? NaN : a === b; }
function _neqLegacyNa(a, b) { return _isNa(a) || _isNa(b) ? NaN : a !== b; }
function _cmpLegacyNa(a, b, op) {
  if (_isNa(a) || _isNa(b)) return NaN;
  switch (op) {
    case '>': return a > b;
    case '<': return a < b;
    case '>=': return a >= b;
    case '<=': return a <= b;
  }
  return false;
}
function _mod(a, b) {
  if (_isNa(a) || _isNa(b)) return NaN;
  return a - b * Math.floor(a / b);
}
function _nz(v, repl) { return _isNa(v) ? (repl !== undefined ? repl : 0) : v; }
function _and(a, b) { return _isTruthy(a) && _isTruthy(b); }
function _or(a, b) { return _isTruthy(a) || _isTruthy(b); }
function _idx(obj, i) {
  if (obj && obj.__tealscriptArray) return deps._arr.get(obj, i);
  if (obj && obj.__tealscriptMatrix) return deps._mtx.row(obj, i);
  return obj[i];
}
function _historyOffset(i) {
  if (typeof i === 'number' && i >= 0 && i < Infinity) return Math.trunc(i);
  const value = Number(i);
  const offset = Number.isFinite(value) ? Math.trunc(value) : value;
  if (Number.isFinite(offset) && offset < 0) throw new Error("Historical offset " + offset + " is invalid; bars back must be non-negative");
  return Number.isNaN(offset) ? 0 : Number.isFinite(offset) ? offset : NaN;
}
function _historyBarIndex(i, barIndex, hint, check) {
  const offset = _historyOffset(i);
  check("bar_index", offset, hint);
  return Number.isFinite(offset) && offset >= 0 && offset <= barIndex ? barIndex - offset : NaN;
}
function _historyConstant(value, i, barIndex, hint, check) {
  const offset = _historyOffset(i);
  check("last_bar_index", offset, hint);
  return Number.isFinite(offset) && offset >= 0 && offset <= barIndex ? value : NaN;
}
function _historyCollection(current, series, i, hint, key, check) {
  const offset = _historyOffset(i);
  check(key, offset, hint);
  if (!Number.isFinite(offset) || offset < 0) return NaN;
  if (offset === 0) return current;
  const value = series.get(offset - 1);
  return value?.__tealscriptArray ? deps._arr.readOnlyCopy(value) : value;
}
function _setIndex(obj, i, val) {
  if (obj && obj.__tealscriptArray) { deps._arr.set(obj, i, val); return; }
  obj[i] = val;
}
function _getField(obj, name) {
  if (obj && obj.__tealscriptUdt) return deps._udt.getField(obj, name);
  if (obj && typeof obj === 'object') return obj[name];
  return undefined;
}
function _setField(obj, name, val) {
  if (obj && obj.__tealscriptUdt) { deps._udt.setField(obj, name, val); return; }
  if (obj && typeof obj === 'object') obj[name] = val;
}
const _collectionMethodAliases = {
  array: ${JSON.stringify(Object.fromEntries(Object.entries(ARRAY_FUNC_MAP).map(([key, value]) => [key.replace('array.', ''), value])))},
  map: ${JSON.stringify(Object.fromEntries(Object.entries(MAP_FUNC_MAP).map(([key, value]) => [key.replace('map.', ''), value])))},
  matrix: ${JSON.stringify(Object.fromEntries(Object.entries(MATRIX_FUNC_MAP).map(([key, value]) => [key.replace('matrix.', ''), value])))},
};
function _arrayIndex(index) {
  if (!_allowsNegativeArrayIndices && index < 0) {
    throw new Error('Array index ' + index + ' is negative in this Pine version');
  }
  return index;
}
function _legacyArray_get(obj, index) {
  _arrayIndex(index);
  return deps._arr.get(obj, index);
}
function _legacyArray_set(obj, index, value) {
  _arrayIndex(index);
  return deps._arr.set(obj, index, value);
}
function _legacyArray_insert(obj, index, value) {
  _arrayIndex(index);
  return deps._arr.insert(obj, index, value);
}
function _legacyArray_remove(obj, index) {
  _arrayIndex(index);
  return deps._arr.remove(obj, index);
}
function _callCollectionMethod(kind, obj, name, args) {
  const runtimeName = _collectionMethodAliases[kind]?.[name] ?? name;
  if (kind === 'array') {
    if (!_allowsNegativeArrayIndices && ['get', 'set', 'insert', 'remove'].includes(runtimeName)) _arrayIndex(args[0]);
    return deps._arr[runtimeName](obj, ...args);
  }
  if (kind === 'map') return deps._map[runtimeName](obj, ...args);
  if (kind === 'matrix') return deps._mtx[runtimeName](obj, ...args);
  return undefined;
}
function _callAnyCollectionMethod(ctx, obj, name, args, kindHint) {
  if (_isNa(obj)) {
    if (kindHint) return _callCollectionMethod(kindHint, obj, name, args);
    return ctx.runtimeError(["Collection methods cannot be called when the ID is na"]);
  }
  if (obj && obj.__tealscriptArray) return _callCollectionMethod("array", obj, name, args);
  if (obj && obj.__tealscriptMap) return _callCollectionMethod("map", obj, name, args);
  if (obj && obj.__tealscriptMatrix) return _callCollectionMethod("matrix", obj, name, args);
  return undefined;
}
function _iterSize(obj) {
  if (obj && obj.__tealscriptArray) return deps._arr.size(obj);
  if (obj && obj.__tealscriptMap) return deps._map.size(obj);
  if (obj && obj.__tealscriptMatrix) return deps._mtx.rows(obj);
  if (Array.isArray(obj)) return obj.length;
  return 0;
}
function _iterGet(obj, i) {
  if (obj && obj.__tealscriptArray) return deps._arr.get(obj, i);
  if (obj && obj.__tealscriptMap) return Array.from(obj.entries.values())[i];
  if (obj && obj.__tealscriptMatrix) return deps._mtx.row(obj, i);
  if (Array.isArray(obj)) return obj[i];
  return undefined;
}
function _iterEntry(obj, i) {
  if (obj && obj.__tealscriptMap) return Array.from(obj.entries.entries())[i];
  return [i, _iterGet(obj, i)];
}
`;
