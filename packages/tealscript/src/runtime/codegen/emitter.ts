import type {
  Program, Statement, Expression,
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
} from '../../parser/ast';
import type { AnalysisContext, FuncInfo, ImportedMethodOverloadInfo, LocalMethodOverloadInfo, TACallSite, VarDeclInfo } from './analyzer';
import { BUILTIN_NAMESPACES } from '../../builtinMetadata';

const BAR_FIELDS: Record<string, string> = {
  open: '_s_open', high: '_s_high', low: '_s_low', close: '_s_close',
  volume: '_s_volume', time: '_s_time', bid: '_s_bid', ask: '_s_ask',
};

const BARSTATE_FIELDS = new Set([
  'isfirst', 'islast', 'ishistory', 'isrealtime', 'isnew', 'isconfirmed',
  'islastconfirmedhistory',
]);

const SYMINFO_FIELDS = new Set([
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
  main_period: 'ctx.timeframe.period',
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
  'math.log': 'Math.log', 'math.log10': 'Math.log10', 'math.exp': 'Math.exp',
  'math.sign': 'Math.sign', 'math.sin': 'Math.sin', 'math.cos': 'Math.cos',
  'math.tan': 'Math.tan', 'math.asin': 'Math.asin', 'math.acos': 'Math.acos',
  'math.atan': 'Math.atan',
  'math.max': 'Math.max', 'math.min': 'Math.min',
  'math.pi': 'Math.PI', 'math.e': 'Math.E',
  'math.phi': '1.618033988749895',
  'math.rphi': '0.618033988749895',
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
  'abs', 'ceil', 'floor', 'round', 'sqrt',
  'log', 'log10', 'pow', 'sign', 'max', 'min', 'avg', 'sum',
  'sin', 'cos', 'tan', 'asin', 'acos', 'atan', 'exp',
  'toradians', 'todegrees',
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
const LEGACY_BARE_COLOR_CONSTANTS: Record<string, string> = {
  aqua: '#00BCD4',
  black: '#363A45',
  blue: '#2196F3',
  fuchsia: '#E040FB',
  gray: '#787B86',
  green: '#4CAF50',
  lime: '#00E676',
  maroon: '#880E4F',
  navy: '#311B92',
  olive: '#808000',
  orange: '#FF9800',
  purple: '#9C27B0',
  red: '#F23645',
  silver: '#B2B5BE',
  teal: '#089981',
  white: '#FFFFFF',
  yellow: '#FDD835',
};
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

const ITERATION_CAP = 10000;
const DRAWING_NAMESPACES = new Set(['label', 'line', 'box', 'polyline', 'linefill', 'table', 'chart']);
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
  'array.binary_search': ['id', 'value'],
  'array.binary_search_leftmost': ['id', 'value'],
  'array.binary_search_rightmost': ['id', 'value'],
  'array.abs': ['id'],
  'array.min': ['id'],
  'array.max': ['id'],
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
  'array.percentrank': ['id', 'value'],
  'array.standardize': ['id'],
  'array.set': ['id', 'index', 'value'],
  'array.push': ['id', 'value'],
  'array.pop': ['id'],
  'array.shift': ['id'],
  'array.unshift': ['id', 'value'],
  'array.insert': ['id', 'index', 'value'],
  'array.remove': ['id', 'index'],
  'array.sort': ['id', 'order', 'sort_field'],
  'array.sort_indices': ['id', 'order'],
  'array.reverse': ['id'],
  'array.clear': ['id'],
  'array.join': ['id', 'separator'],
  'array.concat': ['id', 'id2'],
  'array.slice': ['id', 'index_from', 'index_to'],
  'array.fill': ['id', 'value', 'index_from', 'index_to'],
  'array.map': ['id', 'callback'],
  'array.filter': ['id', 'callback'],
};

const ARRAY_ARG_ALIASES: Record<string, Record<string, string>> = {
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
  'matrix.concat': ['id', 'id2'],
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
  'matrix.sum': { id: 'id1' },
  'matrix.diff': { id: 'id1' },
  'matrix.mult': { id: 'id1' },
  'matrix.kron': { id: 'id1' },
};

type CollectionKind = 'array' | 'map' | 'matrix';

interface FunctionEmitContext {
  localVars: Map<string, VarDeclInfo[]>;
  callSites: Map<CallExpression, number>;
  callSiteFunctions: Map<CallExpression, string[]>;
  calledFunctions: Map<string, Set<string>>;
  paramHistory: Map<string, Set<string>>;
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
    column: 'array', submatrix: 'matrix', diff: 'matrix', mult: 'matrix',
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

  const inferExpr = (expr: Expression | IfStatement): CollectionKind | undefined => {
    if (expr.type === 'IfStatement') return undefined;
    if (expr.type === 'Identifier') return vars.get(expr.name);
    if (expr.type === 'ArrayExpression') return 'array';
    if (expr.type === 'ConditionalExpression') {
      const consequent = inferExpr(expr.consequent);
      const alternate = inferExpr(expr.alternate);
      return consequent === alternate ? consequent : undefined;
    }
    if (expr.type !== 'CallExpression') return undefined;

    const fullName = staticMemberChainName(expr.callee) ?? '';
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
      default:
        break;
    }
  };

  for (const stmt of ast.body) visitStmt(stmt);
  return vars;
}

function inferFunctionEmitContext(
  ast: Program,
  funcInfos: Map<string, FuncInfo>,
  importedFunctions: Map<string, string>,
  userFunctionOverloads: Map<string, string[]>,
  importedMethods: Map<string, string>,
  localMethodOverloads: Map<string, LocalMethodOverloadInfo[]>,
  importedMethodOverloads: Map<string, ImportedMethodOverloadInfo[]>,
): FunctionEmitContext {
  const functionNames = new Set(funcInfos.keys());
  const localVars = new Map<string, VarDeclInfo[]>();
  const callSites = new Map<CallExpression, number>();
  const callSiteFunctions = new Map<CallExpression, string[]>();
  const calledFunctions = new Map<string, Set<string>>();
  const paramHistory = new Map<string, Set<string>>();
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
    if (!ownerName?.includes('__')) return undefined;
    const alias = ownerName.split('__')[0];
    const candidate = `${alias}__${calleeName}`;
    return functionNames.has(candidate) ? candidate : undefined;
  };

  const registerCallSite = (expr: CallExpression, ownerName?: string): void => {
    let names: string[] = [];
    if (expr.callee.type === 'Identifier') {
      const sameLibraryFunction = sameImportedLibraryFunctionName(ownerName, expr.callee.name);
      names = sameLibraryFunction ? [sameLibraryFunction] : (userFunctionOverloads.get(expr.callee.name) ?? [expr.callee.name]);
    } else if (expr.callee.type === 'MemberExpression') {
      const fullName = staticMemberChainName(expr.callee);
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
    names = [...new Set(names.filter((name) => functionNames.has(name)))];
    if (names.length === 0) return;
    callSites.set(expr, callSiteIndex++);
    callSiteFunctions.set(expr, names);
    if (ownerName) {
      let called = calledFunctions.get(ownerName);
      if (!called) {
        called = new Set();
        calledFunctions.set(ownerName, called);
      }
      for (const name of names) called.add(name);
    }
  };

  const collectRegularLocals = (stmts: Statement[]): Set<string> => {
    const names = new Set<string>();
    const visit = (stmt: Statement): void => {
      if (stmt.type === 'VariableDeclaration') {
        if (stmt.kind !== 'var' && stmt.kind !== 'varip') {
          if (stmt.names.type === 'VariableDeclarator') {
            names.add(stmt.names.name.name);
          } else {
            for (const name of stmt.names.names) names.add(name.name);
          }
        }
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
      }
    };
    for (const stmt of stmts) visit(stmt);
    return names;
  };

  const walkExpr = (expr: Expression, ownerParams?: Set<string>, ownerName?: string): void => {
    switch (expr.type) {
      case 'CallExpression':
        registerCallSite(expr, ownerName);
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
        walkExpr(expr.consequent, ownerParams, ownerName);
        walkExpr(expr.alternate, ownerParams, ownerName);
        break;
      case 'SwitchExpression':
        if (expr.discriminant) walkExpr(expr.discriminant, ownerParams, ownerName);
        for (const branch of expr.cases) {
          if (branch.test) walkExpr(branch.test, ownerParams, ownerName);
          if (Array.isArray(branch.consequent)) {
            for (const stmt of branch.consequent) walkStmt(stmt);
          } else {
            walkExpr(branch.consequent, ownerParams, ownerName);
          }
        }
        break;
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
    switch (stmt.type) {
      case 'FunctionDeclaration':
        if (!localVars.has(stmt.name.name)) localVars.set(stmt.name.name, []);
        if (Array.isArray(stmt.body)) regularLocalNames.set(stmt.name.name, collectRegularLocals(stmt.body));
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
        for (const s of stmt.consequent) walkStmt(s, owner);
        if (stmt.alternate) {
          if (Array.isArray(stmt.alternate)) {
            for (const s of stmt.alternate) walkStmt(s, owner);
          } else {
            walkStmt(stmt.alternate, owner);
          }
        }
        break;
      case 'ForStatement':
        if (stmt.kind === 'numeric') {
          walkExpr(stmt.start);
          walkExpr(stmt.end);
          if (stmt.step) walkExpr(stmt.step);
        } else {
          walkExpr(stmt.iterable);
        }
        for (const s of stmt.body) walkStmt(s, owner);
        break;
      case 'WhileStatement':
        walkExpr(stmt.test);
        for (const s of stmt.body) walkStmt(s, owner);
        break;
      case 'MultiDeclaration':
        for (const d of stmt.declarations) walkStmt(d, owner);
        break;
      case 'MultiAssignment':
        for (const a of stmt.assignments) walkStmt(a, owner);
        break;
      case 'MultiExpressionStatement':
        for (const e of stmt.expressions) walkExpr(e);
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
    if (Array.isArray(fi.body)) {
      regularLocalNames.set(name, collectRegularLocals(fi.body));
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
  return { localVars, callSites, callSiteFunctions, calledFunctions, paramHistory, localHistory };
}

function inferRootRegularVars(ast: Program): Set<string> {
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
    } else if (stmt.type === 'IfStatement') {
      addBranchDeclarations(stmt.consequent);
      if (Array.isArray(stmt.alternate)) addBranchDeclarations(stmt.alternate);
      else if (stmt.alternate) addBranchDeclarations([stmt.alternate]);
    }
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
    for (const child of Object.values(value)) {
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

function containsNode(root: unknown, target: object): boolean {
  const seen = new WeakSet<object>();
  const visit = (node: unknown): boolean => {
    if (!node || typeof node !== 'object') return false;
    if (node === target) return true;
    if (seen.has(node)) return false;
    seen.add(node);

    for (const child of Object.values(node)) {
      if (Array.isArray(child)) {
        if (child.some((item) => visit(item))) return true;
      } else if (visit(child)) {
        return true;
      }
    }
    return false;
  };
  return visit(root);
}

export function emit(ast: Program, ctx: AnalysisContext): string {
  const builtinCallCounts = new Map<string, number>();
  const runtimeErrorLocStack: SourceLocation[] = [];
  const collectionVars = inferCollectionVars(ast);
  const functionEmitContext = inferFunctionEmitContext(
    ast,
    ctx.funcInfos,
    ctx.importedFunctions,
    ctx.userFunctionOverloads,
    ctx.importedMethods,
    ctx.localMethodOverloads,
    ctx.importedMethodOverloads,
  );
  const rootRegularVars = inferRootRegularVars(ast);
  const rootSourceAliases = inferRootSourceAliases(ast);
  const fieldHistory = inferFieldHistory(ast);
  const onceStateMembers = new Set<string>();
  const taSiteFunctionNames = new Map<TACallSite, string>();
  for (const [name, fi] of ctx.funcInfos) {
    for (const site of ctx.taCallSites) {
      if (containsNode(fi.body, site.node)) taSiteFunctionNames.set(site, name);
    }
  }
  const smaSourceSeries = new Map<TACallSite, string>();
  for (const site of ctx.taCallSites) {
    if (site.className === 'SMA' && !taSiteFunctionNames.has(site) && site.computeArgExprs[0]?.type !== 'Identifier') {
      smaSourceSeries.set(site, `_ta_source_${site.memberName.replace(/^_ta_/, '')}`);
    }
  }

  const lines: string[] = [];
  const indent = (n: number) => '  '.repeat(n);
  let fixnanIndex = 0;
  let indexedTAResultIndex = 0;
  const localNameStack: Map<string, string>[] = [];
  const localSourceNameStack: Map<string, string>[] = [];
  const localHistoryNameStack: Map<string, string>[] = [];
  const persistentLocalStack: Map<string, string>[] = [];
  const functionNameStack: string[] = [];

  function sameImportedLibraryFunctionName(calleeName: string): string | undefined {
    const currentFunctionName = functionNameStack[functionNameStack.length - 1];
    if (!currentFunctionName?.includes('__')) return undefined;
    const alias = currentFunctionName.split('__')[0];
    const candidate = `${alias}__${calleeName}`;
    return ctx.funcInfos.has(candidate) ? candidate : undefined;
  }

  function currentImportedAlias(): string | undefined {
    const currentFunctionName = functionNameStack[functionNameStack.length - 1];
    return currentFunctionName?.includes('__') ? currentFunctionName.split('__')[0] : ctx.importedAliasContext;
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
    const overloads = ctx.userFunctionOverloads.get(functionName);
    if (!overloads || overloads.length === 0) return ctx.funcInfos.has(functionName) ? functionName : undefined;
    const compatible = overloads.filter((name) => !validateUserFunctionCall(name, expr, 0, false));
    return compatible.length === 1 ? compatible[0] : undefined;
  }

  function importedFunctionDisplayName(internalName: string): string | undefined {
    for (const [displayName, name] of ctx.importedFunctions) {
      if (name === internalName) return displayName;
    }
    return undefined;
  }

  function importedMethodDisplayName(internalName: string): string | undefined {
    for (const [methodName, name] of ctx.importedMethods) {
      if (name === internalName) return `${internalName.split('__')[0]}.${methodName}`;
    }
    for (const [methodName, overloads] of ctx.importedMethodOverloads) {
      if (overloads.some((overload) => overload.internalName === internalName)) return `${internalName.split('__')[0]}.${methodName}`;
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

  function callSiteNeedsState(callExpr: CallExpression): boolean {
    const names = functionEmitContext.callSiteFunctions.get(callExpr) ?? [];
    return names.some((name) => functionNeedsState(name));
  }

  function callSiteHistoryParams(callExpr: CallExpression): string[] {
    const names = functionEmitContext.callSiteFunctions.get(callExpr) ?? [];
    const params = new Set<string>();
    for (const name of names) {
      for (const param of functionEmitContext.paramHistory.get(name) ?? []) params.add(param);
    }
    return [...params];
  }

  function callSiteHistoryLocals(callExpr: CallExpression): string[] {
    const names = functionEmitContext.callSiteFunctions.get(callExpr) ?? [];
    const locals = new Set<string>();
    for (const name of names) {
      for (const local of functionEmitContext.localHistory.get(name) ?? []) locals.add(local);
    }
    return [...locals];
  }

  function emitExpr(expr: Expression): string {
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
        return emitIdentifier(expr);
      case 'BinaryExpression': {
        const left = emitExpr(expr.left);
        const right = emitExpr(expr.right);
        switch (expr.operator) {
          case 'and':
            return `(_isTruthy(${left}) ? _isTruthy(${right}) : false)`;
          case 'or':
            return `(_isTruthy(${left}) ? true : _isTruthy(${right}))`;
          case '==':
            return `_eq(${left}, ${right})`;
          case '!=':
            return `_neq(${left}, ${right})`;
          case '>':
          case '<':
          case '>=':
          case '<=':
            return `_cmp(${left}, ${right}, "${expr.operator}")`;
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
      case 'IndexExpression':
        return emitIndexExpr(expr);
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
    if (name in BAR_FIELDS) return `this.${BAR_FIELDS[name]}.get(0)`;
    if (name === 'hl2') return '((ctx.bar.high + ctx.bar.low) / 2)';
    if (name === 'hlc3') return '((ctx.bar.high + ctx.bar.low + ctx.bar.close) / 3)';
    if (name === 'ohlc4') return '((ctx.bar.open + ctx.bar.high + ctx.bar.low + ctx.bar.close) / 4)';
    if (name === 'hlcc4') return '((ctx.bar.high + ctx.bar.low + ctx.bar.close + ctx.bar.close) / 4)';
    if (name === 'bar_index') return 'ctx.barIndex';
    if (name === 'last_bar_index') return 'ctx.lastBarIndex';
    if (RUNTIME_TIME_VALUES.has(name)) return `ctx.runtimeTimeValue("${name}")`;
    if (CALENDAR_PARTS.has(name)) return `ctx.calendarPart("${name}", [], {})`;
    if (name === 'na') return 'NaN';
    if (name === 'true') return 'true';
    if (name === 'false') return 'false';
    if (name === 'math') return 'Math';
    if (ctx.capturedParams.has(name)) return `ctx.capture("${name}")`;
    if (ctx.seriesVars.has(name)) return `this.${jsStateMember('_sv_', name)}.get(0)`;
    if (ctx.varDecls.some((v) => v.name === name)) return `this.${jsStateMember('_v_', name)}`;
    if (rootRegularVars.has(name)) return `this.${jsStateMember('_g_', name)}`;
    if (LEGACY_INPUT_TYPE_ALIASES.has(name)) return JSON.stringify(LEGACY_INPUT_TYPE_ALIASES.get(name));
    if (Object.prototype.hasOwnProperty.call(LEGACY_BARE_COLOR_CONSTANTS, name)) return JSON.stringify(LEGACY_BARE_COLOR_CONSTANTS[name]);
    if (LEGACY_BARE_VISUAL_CONSTANTS.has(name)) return JSON.stringify(name);
    if (name === 'ticker') return 'ctx.syminfo.ticker';
    if (name === 'tickerid') return '(ctx.syminfo.tickerid ?? ctx.syminfo.ticker)';
    if (name === 'n') return 'ctx.barIndex';
    if (name === 'tr') return emitTrueRangeMemberValue();
    return jsPineName(name);
  }

  function emitAssignmentTarget(name: string): string {
    const localName = currentLocalName(name);
    if (localName) return localName;
    const persistentLocalName = currentPersistentLocalName(name);
    if (persistentLocalName) return persistentLocalName;
    if (rootRegularVars.has(name) && !ctx.seriesVars.has(name) && !ctx.varDecls.some((v) => v.name === name)) {
      return `this.${jsStateMember('_g_', name)}`;
    }
    return jsPineName(name);
  }

  function isPersistentAssignmentTarget(name: string): boolean {
    return Boolean(currentPersistentLocalName(name)) || ctx.varDecls.some((v) => v.name === name);
  }

  function currentLocalName(name: string): string | undefined {
    for (let i = localNameStack.length - 1; i >= 0; i--) {
      const localName = localNameStack[i].get(name);
      if (localName) return localName;
    }
    return undefined;
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
    return jsPineName(name);
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
      lines.push(`${pad}if (this.${member}.size < ctx.barIndex + 1) this.${member}.push(${tmp});`);
      lines.push(`${pad}else this.${member}.update(${tmp});`);
    }
  }

  function emitLocalHistoryPush(pad: string, name: string, valueExpr: string): void {
    const historyName = currentLocalHistoryName(name);
    if (!historyName) return;
    lines.push(`${pad}if (${historyName}) {`);
    lines.push(`${pad}  if (${historyName}.size < ctx.barIndex + 1) ${historyName}.push(${valueExpr});`);
    lines.push(`${pad}  else ${historyName}.update(${valueExpr});`);
    lines.push(`${pad}}`);
  }

  function emitSeriesVarWrite(pad: string, name: string, valueExpr: string): void {
    const seriesMember = jsStateMember('_sv_', name);
    const barMember = jsStateMember('_sv_bar_', name);
    lines.push(`${pad}if (this.${barMember} !== ctx.barIndex) {`);
    lines.push(`${pad}  this.${seriesMember}.push(${valueExpr});`);
    lines.push(`${pad}  this.${barMember} = ctx.barIndex;`);
    lines.push(`${pad}} else {`);
    lines.push(`${pad}  this.${seriesMember}.update(${valueExpr});`);
    lines.push(`${pad}}`);
  }

  function emitSourceDescriptor(expr: Expression | undefined): string {
    if (!expr || expr.type !== 'Identifier') return 'undefined';
    const forwarded = currentLocalSourceName(expr.name);
    if (forwarded) return forwarded;
    if (ctx.capturedParams.has(expr.name)) return `ctx.captureSource("${expr.name}")`;
    const rootAlias = rootSourceAliases.get(expr.name);
    if (rootAlias && rootAlias !== expr) return emitSourceDescriptor(rootAlias);
    return expr.name in BAR_FIELDS || expr.name === 'hl2' || expr.name === 'hlc3' || expr.name === 'ohlc4' || expr.name === 'hlcc4'
      ? `{"kind":"series","name":${JSON.stringify(expr.name)}}`
      : 'undefined';
  }

  function emitCaptureDescriptor(param: string): string {
    const source = currentLocalSourceName(param);
    const resolved = currentLocalName(param) ?? currentPersistentLocalName(param);
    const value = resolved
      ?? (param in BAR_FIELDS ? `this.${BAR_FIELDS[param]}.get(0)` : undefined)
      ?? (ctx.seriesVars.has(param) ? `this.${jsStateMember('_sv_', param)}.get(0)` : undefined)
      ?? (ctx.varDecls.some((v) => v.name === param) ? `this.${jsStateMember('_v_', param)}` : undefined)
      ?? (rootRegularVars.has(param) ? `this.${jsStateMember('_g_', param)}` : undefined)
      ?? (ctx.capturedParams.has(param) && functionNameStack.length === 0 ? `ctx.capture("${param}")` : jsPineName(param));
    return source
      ? `{kind:"capture", value:${value}, source:${source}}`
      : `{kind:"capture", value:${value}}`;
  }

  function emitRequestCaptureObject(params: string[] | undefined): string {
    if (!params || params.length === 0) return 'undefined';
    return `{${params.map((param) => `${JSON.stringify(param)}:${emitCaptureDescriptor(param)}`).join(',')}}`;
  }

  function currentPersistentLocalName(name: string): string | undefined {
    for (let i = persistentLocalStack.length - 1; i >= 0; i--) {
      const localName = persistentLocalStack[i].get(name);
      if (localName) return localName;
    }
    return undefined;
  }

  function emitMemberExpr(expr: MemberExpression): string {
    const chainName = getMemberChainName(expr);
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
      const fullName = `${ns}.${prop}`;

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
        return `deps._arr.from(...ctx.callBuiltin("${fullName}", [], {}, "${nextBuiltinCallId(fullName)}"))`;
      }
      if (ns === 'math' && fullName in MATH_FUNCS) return MATH_FUNCS[fullName];
      if (ns === 'strategy') return `ctx.strategyProp("${prop}")`;
      if (ns === 'color') return `"${prop}"`;
      if (ns === 'shape') return `"${prop}"`;
      if (ns === 'plotshape') return `"plotshape.${prop}"`;
      if (ns === 'location') return `"${prop}"`;
      if (ns === 'size') return `"${prop}"`;
      if (ns === 'plot') return `"plot.${prop}"`;
      if (ns === 'display') return prop in DISPLAY_CONSTANTS ? String(DISPLAY_CONSTANTS[prop]) : `"${prop}"`;
      if (ns === 'format') return `"${prop}"`;
      if (ns === 'scale') return `"${prop}"`;
      if (ns === 'currency') return `"${prop}"`;
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
      if (BUILTIN_NAMESPACES.has(ns)) return `ctx.callBuiltin("${fullName}", [], {}, "${nextBuiltinCallId(fullName)}")`;
    }
    return `_getField(${emitExpr(expr.object)}, "${expr.property.name}")`;
  }

  function emitIndexExpr(expr: IndexExpression): string {
    const idx = emitExpr(expr.index);
    if (expr.object.type === 'CallExpression') {
      const taSite = ctx.taCallSiteMap.get(expr.object);
      if (taSite) {
        const tmp = `_ta_indexed_${indexedTAResultIndex++}`;
        const series = isFunctionScopedTASite(taSite)
          ? `this._scopedTASeries(_state, "${taSite.memberName}")`
          : `this._ta_result_${taSite.memberName}`;
        return `(() => { const ${tmp} = ${emitTACall(taSite, expr.object)}; const _series = ${series}; _series.push(${tmp}); return _series.get(${idx}); })()`;
      }
    }
    if (expr.object.type === 'MemberExpression') {
      const chainName = getMemberChainName(expr.object);
      if (chainName?.startsWith('strategy.')) {
        return `ctx.strategyPropHistory("${chainName.slice('strategy.'.length)}", ${idx})`;
      }
      const taVarSite = ctx.taVarSiteMap.get(expr.object);
      if (taVarSite) return `this.${taVarSite.seriesName}.get(${idx})`;
      if (expr.object.object.type === 'Identifier') {
        const objectName = expr.object.object.name;
        const fieldName = expr.object.property.name;
        if (fieldHistory.get(objectName)?.has(fieldName)) {
          return `this.${fieldHistoryMemberName(objectName, fieldName)}.get(${idx})`;
        }
      }
    }
    if (expr.object.type === 'Identifier') {
      const name = expr.object.name;
      const collectionKind = collectionVars.get(name);
      const historyName = currentLocalHistoryName(name);
      if (historyName) {
        const localName = currentLocalName(name) ?? jsPineName(name);
        return `(${historyName} ? ${historyName}.get(${idx}) : _idx(${localName}, ${idx}))`;
      }
      if (name in BAR_FIELDS) return `this.${BAR_FIELDS[name]}.get(${idx})`;
      if (name === 'bar_index' || name === 'n') return `(${idx} > ctx.barIndex ? NaN : ctx.barIndex - ${idx})`;
      if (name === 'last_bar_index') return 'ctx.lastBarIndex';
      if (RUNTIME_TIME_VALUES.has(name)) return `ctx.runtimeTimeValue("${name}", ${idx})`;
      if (CALENDAR_PARTS.has(name)) return `ctx.calendarPart("${name}", [this._s_time.get(${idx})], {})`;
      if (name === 'hl2' || name === 'hlc3' || name === 'ohlc4' || name === 'hlcc4') {
        return `this._s_${name}.get(${idx})`;
      }
      if (ctx.seriesVars.has(name) && collectionKind !== 'array') return `this.${jsSeriesMember(name)}.get(${idx})`;
      if (collectionKind) return `_idx(${emitIdentifier(expr.object)}, ${idx})`;
    }
    return `_idx(${emitExpr(expr.object)}, ${idx})`;
  }

  function emitCallExpr(expr: CallExpression): string {
    const duplicateNamedArg = duplicateNamedArgument(expr.arguments);
    if (duplicateNamedArg) return runtimeErrorExpr(`Duplicate named argument: ${duplicateNamedArg}`);

    const taSite = ctx.taCallSiteMap.get(expr);
    if (taSite) return emitTACall(taSite, expr);

    const callee = expr.callee;
    const fullName = getMemberChainName(callee) ?? (callee.type === 'Identifier' ? callee.name : '');
    const namespace = fullName.split('.')[0] ?? '';

    const posArgs = expr.arguments.filter((a) => !a.name).map((a) => emitExpr(a.value));
    const hasNamedArgs = expr.arguments.some((arg) => arg.name);
    const collectionMethodKind = getCollectionMethodKind(expr);

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
        return `((__receiver) => (${JSON.stringify(enumTitles)}[__receiver] ?? ctx.callMethodBuiltin("title", __receiver, [], {}, "${callId}")))(${receiver})`;
      }
    }

    const importedFunctionName = ctx.importedFunctions.get(fullName);
    if (importedFunctionName) {
      return emitUserFunctionCall(importedFunctionName, expr);
    }
    const officialLibraryFunctionName = ctx.officialLibraryFunctions.get(fullName);
    if (officialLibraryFunctionName) {
      return `ctx.callBuiltin("${officialLibraryFunctionName}", [${posArgs.join(', ')}], ${emitNamedArgsObj(expr.arguments)}, "${nextBuiltinCallId(officialLibraryFunctionName)}")`;
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
      const importedContextFunction = ctx.importedAliasContext ? `${ctx.importedAliasContext}__${fullName}` : undefined;
      if (importedContextFunction && ctx.funcInfos.has(importedContextFunction)) return emitUserFunctionCall(importedContextFunction, expr);
      const sameLibraryFunction = sameImportedLibraryFunctionName(fullName);
      if (sameLibraryFunction) return emitUserFunctionCall(sameLibraryFunction, expr);
    }
    if (expr.callee.type === 'Identifier') {
      const resolvedFunction = resolveUserFunctionCallName(fullName, expr);
      if (resolvedFunction) return emitUserFunctionCall(resolvedFunction, expr);
    }

    if (fullName.startsWith('strategy.opentrades.') || fullName.startsWith('strategy.closedtrades.')) {
      return `ctx.strategyTradeProp("${fullName}", [${posArgs.join(', ')}], ${emitNamedArgsObj(expr.arguments)})`;
    }

    if (fullName === 'iff') {
      return `ctx.callBuiltin("iff", [${posArgs.join(', ')}], ${emitNamedArgsObj(expr.arguments)}, "${nextBuiltinCallId(fullName)}")`;
    }

    if (LEGACY_GLOBAL_MATH_ALIASES.has(fullName)) {
      const mathName = `math.${fullName}`;
      return `ctx.mathCall("${mathName}", [${posArgs.join(', ')}], ${emitNamedArgsObj(expr.arguments)}, "${builtinCallId(mathName, expr)}")`;
    }

    // Math functions
    if (namespace === 'math' && hasNamedArgs) {
      return `ctx.mathCall("${fullName}", [${posArgs.join(', ')}], ${emitNamedArgsObj(expr.arguments)}, "${builtinCallId(fullName, expr)}")`;
    }
    if (fullName === 'math.avg') {
      return posArgs.length > 0
        ? `((${posArgs.join(' + ')}) / ${posArgs.length})`
        : 'NaN';
    }
    if (fullName === 'math.sum') {
      return `ctx.mathCall("${fullName}", [${posArgs.join(', ')}], {}, "${builtinCallId(fullName, expr)}")`;
    }
    if (fullName === 'math.random') {
      return `ctx.mathCall("${fullName}", [${posArgs.join(', ')}], {}, "${builtinCallId(fullName, expr)}")`;
    }
    if (fullName === 'math.round') {
      return `ctx.mathCall("${fullName}", [${posArgs.join(', ')}], {}, "${builtinCallId(fullName, expr)}")`;
    }
    if (fullName in MATH_FUNCS) {
      const fn = MATH_FUNCS[fullName];
      if (fullName === 'math.todegrees') return `(${posArgs[0]} * 180 / Math.PI)`;
      if (fullName === 'math.toradians') return `(${posArgs[0]} * Math.PI / 180)`;
      return `${fn}(${posArgs.join(', ')})`;
    }
    if (namespace === 'math') {
      return `ctx.mathCall("${fullName}", [${posArgs.join(', ')}], {}, "${builtinCallId(fullName, expr)}")`;
    }

    // nz / na
    if (fullName === 'nz') {
      const value = emitOrderedArg(expr.arguments, ['source', 'replacement'], 'source', 0) ?? 'NaN';
      const replacement = emitOrderedArg(expr.arguments, ['source', 'replacement'], 'replacement', 1);
      return replacement ? `_nz(${value}, ${replacement})` : `_nz(${value})`;
    }
    if (fullName === 'na') {
      const value = emitOrderedArg(expr.arguments, ['x'], 'x', 0);
      return value ? `_isNa(${value})` : 'NaN';
    }
    if (fullName === 'fixnan') {
      const fnIdx = fixnanIndex++;
      const value = emitOrderedArg(expr.arguments, ['source'], 'source', 0) ?? 'NaN';
      return `(_isNa(${value}) ? this._fixnan_${fnIdx} : (this._fixnan_${fnIdx} = ${value}))`;
    }

    // Type casts
    if (fullName === 'int') return `Math.trunc(${emitOrderedArg(expr.arguments, ['x'], 'x', 0) ?? 'NaN'})`;
    if (fullName === 'float') return `+(${emitOrderedArg(expr.arguments, ['x'], 'x', 0) ?? 'NaN'})`;
    if (fullName === 'bool') return `_isTruthy(${emitOrderedArg(expr.arguments, ['x'], 'x', 0) ?? 'NaN'})`;
    if (fullName === 'string') return `String(${emitOrderedArg(expr.arguments, ['x'], 'x', 0) ?? 'NaN'})`;

    // String functions
    if (LEGACY_GLOBAL_STR_ALIASES.has(fullName)) {
      const strName = LEGACY_GLOBAL_STR_ALIASES.get(fullName)!;
      return `ctx.callBuiltin("${strName}", [${posArgs.join(', ')}], ${emitNamedArgsObj(expr.arguments)}, "${nextBuiltinCallId(strName)}")`;
    }
    if (RUNTIME_STR_FUNCTIONS.has(fullName)) {
      return `ctx.callBuiltin("${fullName}", [${posArgs.join(', ')}], ${emitNamedArgsObj(expr.arguments)}, "${nextBuiltinCallId(fullName)}")`;
    }
    if (fullName === 'str.format') return `ctx.strFormat([${posArgs.join(', ')}], ${emitNamedArgsObj(expr.arguments)})`;
    if (fullName === 'str.format_time') return `ctx.strFormatTime([${posArgs.join(', ')}], ${emitNamedArgsObj(expr.arguments)})`;

    // Color functions
    if (fullName === 'color') {
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

    if (fullName === 'ta.pivot_point_levels') return emitPivotPointLevelsCall(expr);

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
      if (mapped) return `deps._map.${mapped}(${args.join(', ')})`;
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
      return `ctx.callBuiltin("${fullName}", [${posArgs.join(', ')}], ${emitNamedArgsObj(expr.arguments)}, "${nextBuiltinCallId(fullName)}")`;
    }

    // Drawing functions — delegate to context
    if (namespace && DRAWING_NAMESPACES.has(namespace)) {
      const namedObj = emitNamedArgsObj(expr.arguments);
      const callId = DRAWING_CONSTRUCTOR_FUNCTIONS.has(fullName)
        ? `ctx.nextBuiltinCallId("${fullName}")`
        : `"${nextBuiltinCallId(fullName)}"`;
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
      const mapped = MATRIX_FUNC_MAP[fullName];
      if (mapped) return `deps._mtx.${mapped}(${args.join(', ')})`;
      return `deps._mtx.${fullName.replace('matrix.', '')}(${args.join(', ')})`;
    }

    // Request.security
    if (fullName === 'request.security' || fullName === 'security' || fullName === 'request.security_lower_tf' || fullName === 'request.seed') {
      const secSite = ctx.securitySites.find((s) => s.node === expr);
      if (secSite) {
        if (secSite.kind === 'seed') {
          const sourceExpr = secSite.sourceExpr ? emitExpr(secSite.sourceExpr) : '""';
          const symExpr = emitExpr(secSite.symbolExpr);
          const ignoreSymbolExpr = secSite.ignoreInvalidSymbolExpr ? emitExpr(secSite.ignoreInvalidSymbolExpr) : 'false';
          const calcExpr = secSite.calcBarsCountExpr ? emitExpr(secSite.calcBarsCountExpr) : 'undefined';
          const sourceDescriptorExpr = emitSourceDescriptor(secSite.expressionSourceParam
            ? { type: 'Identifier', name: secSite.expressionSourceParam, loc: undefined }
            : undefined);
          const captureExpr = emitRequestCaptureObject(secSite.expressionCaptureParams);
          return `ctx.requestSeed(${secSite.id}, ${sourceExpr}, ${symExpr}, ${ignoreSymbolExpr}, ${calcExpr}, ${sourceDescriptorExpr}, ${captureExpr})`;
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
          const captureExpr = emitRequestCaptureObject(secSite.expressionCaptureParams);
          return `ctx.requestSecurityLowerTf(${secSite.id}, ${symExpr}, ${tfExpr}, ${ignoreSymbolExpr}, ${currencyExpr}, ${ignoreTfExpr}, ${calcExpr}, ${sourceDescriptorExpr}, ${captureExpr})`;
        }
        const gapsExpr = secSite.gapsExpr ? emitExpr(secSite.gapsExpr) : '"barmerge.gaps_off"';
        const laExpr = secSite.lookaheadExpr ? emitExpr(secSite.lookaheadExpr) : '"barmerge.lookahead_off"';
        const ignoreSymbolExpr = secSite.ignoreInvalidSymbolExpr ? emitExpr(secSite.ignoreInvalidSymbolExpr) : 'false';
        const currencyExpr = secSite.currencyExpr ? emitExpr(secSite.currencyExpr) : 'undefined';
        const calcExpr = secSite.calcBarsCountExpr ? emitExpr(secSite.calcBarsCountExpr) : 'undefined';
        const sourceDescriptorExpr = emitSourceDescriptor(secSite.expressionSourceParam
          ? { type: 'Identifier', name: secSite.expressionSourceParam, loc: undefined }
          : undefined);
        const captureExpr = emitRequestCaptureObject(secSite.expressionCaptureParams);
        return `ctx.requestSecurity(${secSite.id}, ${symExpr}, ${tfExpr}, ${gapsExpr}, ${laExpr}, ${ignoreSymbolExpr}, ${currencyExpr}, ${calcExpr}, ${sourceDescriptorExpr}, ${captureExpr})`;
      }
    }
    if (fullName === 'request.currency_rate') {
      return `ctx.requestCurrencyRate([${posArgs.join(', ')}], ${emitNamedArgsObj(expr.arguments)})`;
    }
    if (fullName === 'request.footprint') {
      return `ctx.requestFootprint([${posArgs.join(', ')}], ${emitNamedArgsObj(expr.arguments)})`;
    }
    if (namespace === 'footprint' || namespace === 'volume_row') {
      return `ctx.callBuiltin("${fullName}", [${posArgs.join(', ')}], ${emitNamedArgsObj(expr.arguments)}, "${nextBuiltinCallId(fullName)}")`;
    }
    if (
      fullName === 'request.dividends'
      || fullName === 'request.earnings'
      || fullName === 'request.splits'
      || fullName === 'request.financial'
      || fullName === 'request.economic'
      || fullName === 'request.quandl'
    ) {
      return `ctx.requestPointSeries("${fullName}", [${posArgs.join(', ')}], ${emitNamedArgsObj(expr.arguments)})`;
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
    if (fullName === 'alert') return `ctx.alert([${posArgs.join(', ')}], ${emitNamedArgsObj(expr.arguments)}, "${builtinCallId(fullName, expr)}")`;
    if (fullName === 'alertcondition') return `ctx.alertCondition([${posArgs.join(', ')}], ${emitNamedArgsObj(expr.arguments)}, "${nextBuiltinCallId(fullName)}")`;

    // Log
    if (fullName === 'log.info') return `ctx.logInfo([${posArgs.join(', ')}], ${emitNamedArgsObj(expr.arguments)})`;
    if (fullName === 'log.warning') return `ctx.logWarning([${posArgs.join(', ')}], ${emitNamedArgsObj(expr.arguments)})`;
    if (fullName === 'log.error') return `ctx.logError([${posArgs.join(', ')}], ${emitNamedArgsObj(expr.arguments)})`;

    // Runtime
    if (fullName === 'runtime.error') return emitRuntimeErrorCall(expr, expr.loc);
    if (fullName === 'max_bars_back') {
      return `ctx.callBuiltin("${fullName}", [${posArgs.join(', ')}], ${emitNamedArgsObj(expr.arguments)}, "${nextBuiltinCallId(fullName)}")`;
    }

    // Time
    if (fullName === 'time') return `ctx.timeFilter(false, [${posArgs.join(', ')}], ${emitNamedArgsObj(expr.arguments)})`;
    if (fullName === 'time_close') return `ctx.timeFilter(true, [${posArgs.join(', ')}], ${emitNamedArgsObj(expr.arguments)})`;
    if (fullName === 'timestamp') return `ctx.timestamp([${posArgs.join(', ')}], ${emitNamedArgsObj(expr.arguments)})`;
    if (CALENDAR_PARTS.has(fullName)) return `ctx.calendarPart("${fullName}", [${posArgs.join(', ')}], ${emitNamedArgsObj(expr.arguments)})`;
    if (namespace === 'timeframe') {
      return `ctx.callBuiltin("${fullName}", [${posArgs.join(', ')}], ${emitNamedArgsObj(expr.arguments)}, "${nextBuiltinCallId(fullName)}")`;
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
    if (
      staticCopyTypeName
      && expr.callee.type === 'MemberExpression'
      && ctx.typeDecls.has(staticCopyTypeName)
    ) {
      const copyArg = emitCollectionCallArgs(`${staticCopyTypeName}.copy`, expr.arguments, ['id'])[0] ?? posArgs[0] ?? 'undefined';
      return `deps._udt.copy(${copyArg})`;
    }

    if (expr.callee.type === 'MemberExpression' && !isStaticNamespaceReceiver(expr.callee.object)) {
      const localOverloads = ctx.localMethodOverloads.get(expr.callee.property.name);
      if (localOverloads && localOverloads.length > 0) {
        return emitLocalMethodCall(localOverloads, expr as CallExpression & { callee: MemberExpression });
      }
    }

    // User-defined method
    if (expr.callee.type === 'MemberExpression' && ctx.funcInfos.has(expr.callee.property.name)) {
      const receiver = emitExpr(expr.callee.object);
      const methodName = expr.callee.property.name;
      return emitUserFunctionCall(methodName, expr, receiver);
    }

    if (expr.callee.type === 'MemberExpression') {
      const importedOverloads = sameImportedLibraryMethodOverloads(expr.callee.property.name)
        ?? ctx.importedMethodOverloads.get(expr.callee.property.name);
      if (importedOverloads && importedOverloads.length > 0) {
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

    if (collectionMethodKind) {
      const receiver = emitExpr((expr.callee as MemberExpression).object);
      const method = (expr.callee as MemberExpression).property.name;
      const runtimeMethod = collectionRuntimeMethodName(collectionMethodKind, method) ?? method;
      const methodFullName = `${collectionMethodKind}.${method}`;
      const methodArgNames = collectionArgNames(methodFullName)?.slice(1);
      const methodArgs = methodArgNames
        ? emitCollectionCallArgs(methodFullName, expr.arguments, methodArgNames)
        : posArgs;
      return `_callCollectionMethod("${collectionMethodKind}", ${receiver}, "${runtimeMethod}", [${methodArgs.join(', ')}])`;
    }
    if (expr.callee.type === 'MemberExpression' && expr.callee.property.name === 'copy') {
      const receiver = emitExpr(expr.callee.object);
      return `((__receiver) => (__receiver && __receiver.__tealscriptUdt) ? deps._udt.copy(__receiver) : _callAnyCollectionMethod(__receiver, "copy", []))(${receiver})`;
    }
    if (
      expr.callee.type === 'MemberExpression'
      && COLLECTION_METHOD_NAMES.has(expr.callee.property.name)
      && !isStaticNamespaceReceiver(expr.callee.object)
    ) {
      const receiver = emitExpr(expr.callee.object);
      const method = expr.callee.property.name;
      const methodArgs = emitCollectionReceiverArgs(expr.arguments, method, posArgs);
      if (FOOTPRINT_METHODS.has(method)) {
        const namedArgs = emitNamedArgsObj(expr.arguments);
        const callId = nextBuiltinCallId(method);
        return `((__receiver) => (__receiver && (__receiver.__tealscriptArray || __receiver.__tealscriptMap || __receiver.__tealscriptMatrix)) ? _callAnyCollectionMethod(__receiver, "${method}", [${methodArgs.join(', ')}]) : ctx.footprintMethod("${method}", __receiver, [${posArgs.join(', ')}], ${namedArgs}, "${callId}"))(${receiver})`;
      }
      return `_callAnyCollectionMethod(${receiver}, "${method}", [${methodArgs.join(', ')}])`;
    }

    if (expr.callee.type === 'MemberExpression' && FOOTPRINT_METHODS.has(expr.callee.property.name)) {
      const receiver = emitExpr(expr.callee.object);
      const methodName = expr.callee.property.name;
      return `ctx.footprintMethod("${methodName}", ${receiver}, [${posArgs.join(', ')}], ${emitNamedArgsObj(expr.arguments)}, "${nextBuiltinCallId(methodName)}")`;
    }

    if (expr.callee.type === 'MemberExpression') {
      const receiver = emitExpr(expr.callee.object);
      const methodName = expr.callee.property.name;
      return `ctx.callMethodBuiltin("${methodName}", ${receiver}, [${posArgs.join(', ')}], ${emitNamedArgsObj(expr.arguments)}, "${nextBuiltinCallId(methodName)}")`;
    }

    // User-defined function
    if (expr.callee.type === 'Identifier') {
      const resolvedFunction = resolveUserFunctionCallName(fullName, expr);
      if (resolvedFunction) return emitUserFunctionCall(resolvedFunction, expr);
    }

    const callId = DRAWING_CONSTRUCTOR_FUNCTIONS.has(fullName)
      ? `ctx.nextBuiltinCallId("${fullName}")`
      : `"${nextBuiltinCallId(fullName)}"`;
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
    const branches = overloads.map((overload) => {
      const call = emitUserFunctionCall(overload.internalName, expr, temp);
      if (!overload.receiverType) return `return ${call};`;
      return `if (${temp} && ${temp}.__tealscriptUdt && ${temp}.typeName === ${JSON.stringify(overload.receiverType)}) return ${call};`;
    });
    return `(() => { const ${temp} = ${receiver}; ${branches.join(' ')} throw new Error("No imported method overload matched ${expr.callee.property.name} for receiver " + (${temp} && ${temp}.__tealscriptUdt ? ${temp}.typeName : typeof ${temp})); })()`;
  }

  function emitLocalMethodCall(overloads: LocalMethodOverloadInfo[], expr: CallExpression & { callee: MemberExpression }): string {
    const receiver = emitExpr(expr.callee.object);
    const temp = `_method_receiver_${functionEmitContext.callSites.get(expr) ?? 'x'}`;
    const compatible = overloads.filter((overload) => !validateUserFunctionCall(overload.internalName, expr, 1, true));
    const candidates = compatible.length > 0 ? compatible : overloads;
    const branches = candidates.map((overload) => {
      const call = emitUserFunctionCall(overload.internalName, expr, temp);
      const condition = localReceiverCondition(temp, overload.receiverType);
      return condition === 'true' ? `return ${call};` : `if (${condition}) return ${call};`;
    });
    return `(() => { const ${temp} = ${receiver}; ${branches.join(' ')} throw new Error("No local method overload matched ${expr.callee.property.name} for receiver " + (${temp} && ${temp}.__tealscriptUdt ? ${temp}.typeName : typeof ${temp})); })()`;
  }

  function localReceiverCondition(receiver: string, receiverType: string | null): string {
    if (!receiverType) return 'true';
    if (ctx.typeDecls.has(receiverType)) {
      return `${receiver} && ${receiver}.__tealscriptUdt && ${receiver}.typeName === ${JSON.stringify(receiverType)}`;
    }
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

  function emitUserFunctionCall(name: string, expr: CallExpression, receiver?: string): string {
    const fi = ctx.funcInfos.get(name)!;
    const args = expr.arguments;
    const start = receiver ? 1 : 0;
    const validationError = validateImportedCall(name, expr, start, receiver !== undefined)
      ?? validateUserFunctionCall(name, expr, start, receiver !== undefined);
    if (validationError) return runtimeErrorExpr(validationError);
    const callSiteId = functionEmitContext.callSites.get(expr);
    const localVars = functionEmitContext.localVars.get(name) ?? [];
    const hasTACalls = ctx.funcInfos.get(name)?.hasTACalls ?? false;
    const hasState = functionNeedsState(name) && callSiteId !== undefined;
    const currentFunctionName = functionNameStack[functionNameStack.length - 1];
    const stateArg = hasState
      ? currentFunctionName
        ? `this._childFnState(_state, ${callSiteId}, [${localVars.map((localVar) => JSON.stringify(jsPineName(localVar.name))).join(', ')}], ${hasTACalls ? 'true' : 'false'})`
        : `this.${jsStateMember('_fn_state_', String(callSiteId))}`
      : 'undefined';
    const values = receiver ? [receiver] : [];
    const positional = args.filter((arg) => !arg.name).map((arg) => arg.value);
    const sourceArgs = new Map<string, Expression>();
    if (receiver) sourceArgs.set(fi.params[0], (expr.callee as MemberExpression).object);
    for (let i = start; i < fi.params.length; i++) {
      const param = fi.params[i];
      const named = args.find((arg) => arg.name?.name === param)?.value;
      if (named) {
        values.push(emitExpr(named));
        sourceArgs.set(param, named);
        continue;
      }
      const positionalIndex = i - start;
      const positionalArg = positional[positionalIndex];
      const defaultArg = fi.paramDefaults[i];
      const valueArg = positionalArg ?? defaultArg;
      values.push(valueArg ? emitExpr(valueArg) : 'undefined');
      if (valueArg) sourceArgs.set(param, valueArg);
    }
    const sourceDescriptors = fi.params.map((param) => emitSourceDescriptor(sourceArgs.get(param)));
    const historyParams = functionEmitContext.paramHistory.get(name) ?? new Set();
    const historyLocals = functionEmitContext.localHistory.get(name) ?? new Set();
    const needsHistory = (historyParams.size > 0 || historyLocals.size > 0) && callSiteId !== undefined;
    if (!needsHistory) {
      return `this.${jsFunctionMember(name)}(${['ctx', stateArg, ...values, ...sourceDescriptors, ...fi.params.map(() => 'undefined'), ...historyLocals].join(', ')})`;
    }
    const tempPrefix = `_fn_arg_${callSiteId}_`;
    const setup = values.map((value, index) => `const ${tempPrefix}${index} = ${value};`).join(' ');
    const historyUpdates: string[] = [];
    const historyArgs = fi.params.map((param, index) => {
      if (!historyParams.has(param)) return 'undefined';
      const member = `this.${jsStateMember('_fn_param_series_', `${callSiteId}_${param}`)}`;
      historyUpdates.push(`${member}.push(${tempPrefix}${index});`);
      return member;
    });
    const localHistoryArgs = [...historyLocals].map((local) => `this.${jsStateMember('_fn_local_series_', `${callSiteId}_${local}`)}`);
    const callValues = fi.params.map((_, index) => `${tempPrefix}${index}`);
    return `(() => { ${setup} ${historyUpdates.join(' ')} return this.${jsFunctionMember(name)}(${['ctx', stateArg, ...callValues, ...sourceDescriptors, ...historyArgs, ...localHistoryArgs].join(', ')}); })()`;
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
    if ((functionEmitContext.localVars.get(name)?.length ?? 0) > 0) return true;
    if (ctx.funcInfos.get(name)?.hasTACalls ?? false) return true;
    for (const callee of functionEmitContext.calledFunctions.get(name) ?? []) {
      if (functionNeedsState(callee, seen)) return true;
    }
    return false;
  }

  function nextBuiltinCallId(name: string): string {
    const count = builtinCallCounts.get(name) ?? 0;
    builtinCallCounts.set(name, count + 1);
    return `${name}_${count}`;
  }

  function builtinCallId(name: string, expr: CallExpression): string {
    if ((name === 'alert' || name === 'math.random') && expr.loc) {
      return `${name}_${expr.loc.start.line}_${expr.loc.start.column}`;
    }
    return nextBuiltinCallId(name);
  }

  function getCollectionExprKind(expr: Expression): CollectionKind | undefined {
    if (expr.type === 'Identifier') return collectionVars.get(expr.name);
    if (expr.type === 'ArrayExpression') return 'array';
    if (expr.type === 'MemberExpression') {
      if (expr.object.type === 'CallExpression') return getCollectionExprKind(expr.object);
      return undefined;
    }
    if (expr.type !== 'CallExpression') return undefined;

    const fullName = getMemberChainName(expr.callee) ?? (expr.callee.type === 'Identifier' ? expr.callee.name : '');
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
        value = 'NaN';
      }
      fieldEntries.push(`["${field.name}", ${value}]`);
      if (field.varip) varipFields.push(`"${field.name}"`);
    }
    return `deps._udt.create("${typeName}", [${fieldEntries.join(', ')}], [${varipFields.join(', ')}])`;
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
    const ctorArgExpr = site.dynamicCtorArgExprs
      ? `[${site.dynamicCtorArgExprs.map(emitExpr).join(', ')}]`
      : `[${site.ctorArgs.map((arg) => JSON.stringify(arg)).join(', ')}]`;
    const member = scoped
      ? `this._scopedTA(_state, "${site.memberName}", "${site.className}", ${ctorArgExpr})`
      : site.dynamicCtorArgExprs
      ? `this._dynamicTA("${site.memberName}", "${site.className}", [${site.dynamicCtorArgExprs.map(emitExpr).join(', ')}])`
      : `this.${site.memberName}`;

    if (site.className === 'ATR') {
      return `(ctx.isFirstTick ? ${member}.compute(ctx.bar.high, ctx.bar.low, ctx.bar.close) : ${member}.recompute(ctx.bar.high, ctx.bar.low, ctx.bar.close))`;
    }

    if (site.className === 'TrueRange') {
      return `(ctx.isFirstTick ? ${member}.compute(ctx.bar.high, ctx.bar.low, ctx.bar.close) : ${member}.recompute(ctx.bar.high, ctx.bar.low, ctx.bar.close))`;
    }

    if (site.className === 'DMI' || site.className === 'ADX') {
      return `(ctx.isFirstTick ? ${member}.compute(ctx.bar.high, ctx.bar.low, ctx.bar.close) : ${member}.recompute(ctx.bar.high, ctx.bar.low, ctx.bar.close))`;
    }

    if (site.className === 'Supertrend') {
      return `(ctx.isFirstTick ? ${member}.compute(ctx.bar.high, ctx.bar.low, ctx.bar.close) : ${member}.recompute(ctx.bar.high, ctx.bar.low, ctx.bar.close))`;
    }

    if (site.className === 'SAR') {
      return `(ctx.isFirstTick ? ${member}.compute(ctx.bar.high, ctx.bar.low) : ${member}.recompute(ctx.bar.high, ctx.bar.low))`;
    }

    if (site.className === 'SMA' && site.computeArgExprs[0]?.type === 'Identifier') {
      const sourceName = site.computeArgExprs[0].name;
      const historyName = currentLocalHistoryName(sourceName);
      const sourceSeries = historyName
        ?? (sourceName in BAR_FIELDS ? `this.${BAR_FIELDS[sourceName]}` : undefined)
        ?? (ctx.seriesVars.has(sourceName) ? `this.${jsSeriesMember(sourceName)}` : undefined);
      if (sourceSeries) {
        const length = site.dynamicCtorArgExprs?.[0]
          ? emitExpr(site.dynamicCtorArgExprs[0])
          : JSON.stringify(site.ctorArgs[0] ?? 0);
        return `this._smaFromSeries(${sourceSeries}, ${length})`;
      }
    }
    const smaExpressionSeries = smaSourceSeries.get(site);
    if (site.className === 'SMA' && smaExpressionSeries) {
      const length = site.dynamicCtorArgExprs?.[0]
        ? emitExpr(site.dynamicCtorArgExprs[0])
        : JSON.stringify(site.ctorArgs[0] ?? 0);
      return `this._smaFromSeries(this.${smaExpressionSeries}, ${length})`;
    }

    if (site.className === 'VWAP') {
      const sourceArg = readOrderedCallArg(site.node.arguments, ['source', 'anchor', 'stdev_mult'], 'source', 0);
      const anchorArg = readOrderedCallArg(site.node.arguments, ['source', 'anchor', 'stdev_mult'], 'anchor', 1);
      const source = sourceArg ? emitExpr(sourceArg) : '((ctx.bar.high + ctx.bar.low + ctx.bar.close) / 3)';
      const anchor = anchorArg ? emitExpr(anchorArg) : 'false';
      return `(ctx.isFirstTick ? ${member}.compute(${source}, ${anchor}, ctx.bar.volume) : ${member}.recompute(${source}, ${anchor}, ctx.bar.volume))`;
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
    const named = args.find((arg) => arg.name?.name === name)?.value;
    if (named) return emitExpr(named);
    const positional = args.filter((arg) => !arg.name).map((arg) => arg.value);
    const positionalIndex = index - names.slice(0, index).filter((param) => args.some((arg) => arg.name?.name === param)).length;
    const arg = positional[positionalIndex];
    return arg ? emitExpr(arg) : undefined;
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
  ): string[] {
    const candidates = [`array.${method}`, `map.${method}`, `matrix.${method}`];
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
    const method = expr.callee.property.name;
    return method === 'new'
      || (kind === 'array' && (method === 'from' || method.startsWith('new_')))
      || (kind === 'matrix' && method.startsWith('new_'));
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
    if (arrayIsSecondArg && !hasNamedInsertIndex && !hasNamedArray) {
      if (firstName === 'id') {
        const namedId = args.find((arg) => arg.name?.name === 'id')?.value;
        if (namedId && positional.length === 1) {
          return [emitExpr(namedId), 'undefined', emitExpr(positional[0]!.value)];
        }
        if (!namedId && positional.length === 2) {
          return [emitExpr(positional[0]!.value), 'undefined', emitExpr(positional[1]!.value)];
        }
      } else if (positional.length === 1) {
        return ['undefined', emitExpr(positional[0]!.value)];
      }
    }
    return emitOrderedCallArgs(args, names, MATRIX_ARG_ALIASES[fullName]);
  }

  function isFunctionScopedTASite(site: TACallSite): boolean {
    const currentFunctionName = functionNameStack[functionNameStack.length - 1];
    return currentFunctionName !== undefined && taSiteFunctionNames.get(site) === currentFunctionName;
  }

  function emitPivotPointLevelsCall(expr: CallExpression): string {
    const developing = emitOrderedArg(expr.arguments, ['type', 'anchor', 'developing'], 'developing', 2) ?? 'false';
    return `_pivotPointLevels(${developing}, this._s_high.get(0), this._s_low.get(0), this._s_close.get(0), this._s_high.get(1), this._s_low.get(1), this._s_close.get(1))`;
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
    const sourceHint = funcName === 'input'
      ? inputDefaultSourceName(expr.arguments.find((arg) => arg.name?.name === 'defval')?.value ?? expr.arguments.find((arg) => !arg.name)?.value)
      : undefined;
    const metadataEntries = [
      sourceHint ? `__tealscriptInputDefaultSource: "${sourceHint}"` : undefined,
      hasStaticInputTitle(expr.arguments) ? undefined : '__tealscriptStaticTitle: false',
    ].filter(Boolean);
    const namedObj = metadataEntries.length > 0
      ? `({...${emitNamedArgsObj(expr.arguments)}, ${metadataEntries.join(', ')}})`
      : emitNamedArgsObj(expr.arguments);
    return `ctx.input("${id}", "${funcName}", ${posArgs[0] ?? 'NaN'}, ${namedObj}, [${posArgs.slice(1).join(', ')}])`;
  }

  function emitStrategyCall(method: string, expr: CallExpression): string {
    const posArgs = expr.arguments.filter((a) => !a.name).map((a) => emitExpr(a.value));
    const namedObj = emitNamedArgsObj(expr.arguments);
    const args = posArgs.length > 0 ? `${posArgs.join(', ')}, ${namedObj}` : namedObj;
    return `ctx.strategy${method.charAt(0).toUpperCase() + method.slice(1)}(${args})`;
  }

  function emitArrayCall(fullName: string, expr: CallExpression): string {
    const argNames = ARRAY_ARG_NAMES[fullName];
    const posArgs = argNames
      ? emitOrderedCallArgs(expr.arguments, argNames, ARRAY_ARG_ALIASES[fullName])
      : expr.arguments.filter((a) => !a.name).map((a) => emitExpr(a.value));
    if (fullName === 'array.push') return `ctx.arrayPush(${posArgs.join(', ')})`;
    if (fullName === 'array.set') return `ctx.arraySet(${posArgs.join(', ')})`;
    if (fullName === 'array.unshift') return `ctx.arrayUnshift(${posArgs.join(', ')})`;
    if (fullName === 'array.insert') return `ctx.arrayInsert(${posArgs.join(', ')})`;
    if (fullName === 'array.concat') return `ctx.arrayConcat(${posArgs.join(', ')})`;
    const mapped = ARRAY_FUNC_MAP[fullName];
    if (mapped) return `deps._arr.${mapped}(${posArgs.join(', ')})`;
    return `deps._arr.${fullName.replace('array.', '')}(${posArgs.join(', ')})`;
  }

  function emitSwitchExpr(expr: SwitchExpression): string {
    let hasDefault = false;

    if (expr.discriminant) {
      const disc = emitExpr(expr.discriminant);
      const parts: string[] = [];
      for (const c of expr.cases) {
        if (c.test) {
          const body = Array.isArray(c.consequent)
            ? emitBlockAsExpr(c.consequent)
            : emitExpr(c.consequent);
          parts.push(`_eq(${disc}, ${emitExpr(c.test)}) ? ${body}`);
        } else {
          hasDefault = true;
          const body = Array.isArray(c.consequent)
            ? emitBlockAsExpr(c.consequent)
            : emitExpr(c.consequent);
          parts.push(body);
        }
      }
      if (parts.length === 0) return 'NaN';
      if (!hasDefault) parts.push('NaN');
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
    if (parts.length === 0) return 'NaN';
    if (!hasDefault) parts.push('NaN');
    return `(${parts.join(' : ')})`;
  }

  function emitBlockAsExpr(stmts: Statement[]): string {
    if (stmts.length === 1 && stmts[0].type === 'ExpressionStatement') {
      return emitExpr(stmts[0].expression);
    }
    const inline = emitInlineBlockAsExpr(stmts);
    return inline ?? 'NaN';
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
        body.push(`let ${stmt.names.name.name} = ${emitExpr(stmt.init)};`);
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
        body.push(`${emitExpr(stmt.left)} ${stmt.operator === ':=' ? '=' : stmt.operator} ${emitExpr(stmt.right)};`);
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
          body.push(`let ${declaration.names.name.name} = ${emitExpr(declaration.init)};`);
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

  function emitVarDecl(stmt: VariableDeclaration, depth: number): void {
    const pad = indent(depth);
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
        const localDeclName = currentLocalName(name);
        const isRootRegular = rootRegularVars.has(name) && functionNameStack.length === 0;
        const value = `_idx(${tmpVar}, ${i})`;
        if (localDeclName) {
          lines.push(`${pad}let ${localDeclName} = ${value};`);
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
      return;
    }

    const name = stmt.names.name.name;
    const isRootExecutionScope = depth === 2 && functionNameStack.length === 0;
    const isRootRegularTarget = rootRegularVars.has(name) && functionNameStack.length === 0;
    const importedPrivateError = stmt.init.type === 'CallExpression' ? importedPrivateCallErrorMessage(stmt.init) : undefined;
    if (importedPrivateError) {
      lines.push(`${pad}${runtimeErrorExpr(importedPrivateError)};`);
      if (ctx.seriesVars.has(name)) {
        emitSeriesVarWrite(pad, name, 'NaN');
      } else if (rootRegularVars.has(name) && isRootExecutionScope) {
        lines.push(`${pad}this.${jsGlobalMember(name)} = NaN;`);
      } else {
        lines.push(`${pad}let ${jsPineName(name)} = NaN;`);
      }
      return;
    }

    if (stmt.kind === 'var' || stmt.kind === 'varip') {
      const persistentStart = `_drawStart_${jsPineName(name)}`;
      const localPersistent = currentPersistentLocalName(name);
      if (localPersistent) {
        const initFlag = `_state.${jsInitMember(name)}`;
        lines.push(`${pad}if (!${initFlag}) {`);
        lines.push(`${pad}  const ${persistentStart} = ctx.drawingCount();`);
        if (stmt.init.type === 'IfStatement') {
          lines.push(`${pad}  ${localPersistent} = NaN;`);
          emitIf(stmt.init, depth + 1, localPersistent);
        } else if (stmt.init.type === 'ForStatement') {
          lines.push(`${pad}  ${localPersistent} = NaN;`);
          emitFor(stmt.init, depth + 1, localPersistent);
        } else if (stmt.init.type === 'WhileStatement') {
          lines.push(`${pad}  ${localPersistent} = NaN;`);
          emitWhile(stmt.init, depth + 1, localPersistent);
        } else {
          lines.push(`${pad}  ${localPersistent} = ${emitExpr(stmt.init)};`);
        }
        lines.push(`${pad}  ctx.markPersistentRuntimeValue(${localPersistent});`);
        lines.push(`${pad}  ${initFlag} = true;`);
        lines.push(`${pad}  ctx.markDrawingsPersistentFrom(${persistentStart});`);
        lines.push(`${pad}}`);
        return;
      }
      if (stmt.init.type === 'IfStatement') {
        lines.push(`${pad}if (!this.${jsInitMember(name)}) {`);
        lines.push(`${pad}  const ${persistentStart} = ctx.drawingCount();`);
        lines.push(`${pad}  this.${jsVarMember(name)} = NaN;`);
        emitIf(stmt.init, depth + 1, `this.${jsVarMember(name)}`);
        lines.push(`${pad}  ctx.markPersistentRuntimeValue(this.${jsVarMember(name)});`);
        lines.push(`${pad}  this.${jsInitMember(name)} = true;`);
        lines.push(`${pad}  ctx.markDrawingsPersistentFrom(${persistentStart});`);
        lines.push(`${pad}}`);
      } else if (stmt.init.type === 'ForStatement') {
        lines.push(`${pad}if (!this.${jsInitMember(name)}) {`);
        lines.push(`${pad}  const ${persistentStart} = ctx.drawingCount();`);
        lines.push(`${pad}  this.${jsVarMember(name)} = NaN;`);
        emitFor(stmt.init, depth + 1, `this.${jsVarMember(name)}`);
        lines.push(`${pad}  ctx.markPersistentRuntimeValue(this.${jsVarMember(name)});`);
        lines.push(`${pad}  this.${jsInitMember(name)} = true;`);
        lines.push(`${pad}  ctx.markDrawingsPersistentFrom(${persistentStart});`);
        lines.push(`${pad}}`);
      } else if (stmt.init.type === 'WhileStatement') {
        lines.push(`${pad}if (!this.${jsInitMember(name)}) {`);
        lines.push(`${pad}  const ${persistentStart} = ctx.drawingCount();`);
        lines.push(`${pad}  this.${jsVarMember(name)} = NaN;`);
        emitWhile(stmt.init, depth + 1, `this.${jsVarMember(name)}`);
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
      const localDeclName = currentLocalName(name);
      const target = localDeclName ?? (isRootRegularTarget ? `this.${jsGlobalMember(name)}` : jsPineName(name));
      lines.push(isRootRegularTarget ? `${pad}${target} = NaN;` : `${pad}let ${target} = NaN;`);
      emitIf(stmt.init, depth, target);
      if (ctx.seriesVars.has(name)) {
        emitSeriesVarWrite(pad, name, target);
      }
      emitLocalHistoryPush(pad, name, target);
      emitFieldHistoryPush(pad, name, target);
      return;
    }
    if (stmt.init.type === 'ForStatement') {
      const localDeclName = currentLocalName(name);
      const target = localDeclName ?? (isRootRegularTarget ? `this.${jsGlobalMember(name)}` : jsPineName(name));
      lines.push(isRootRegularTarget ? `${pad}${target} = NaN;` : `${pad}let ${target} = NaN;`);
      emitFor(stmt.init, depth, target);
      if (ctx.seriesVars.has(name)) {
        emitSeriesVarWrite(pad, name, target);
      }
      emitLocalHistoryPush(pad, name, target);
      emitFieldHistoryPush(pad, name, target);
      return;
    }
    if (stmt.init.type === 'WhileStatement') {
      const localDeclName = currentLocalName(name);
      const target = localDeclName ?? (isRootRegularTarget ? `this.${jsGlobalMember(name)}` : jsPineName(name));
      lines.push(isRootRegularTarget ? `${pad}${target} = NaN;` : `${pad}let ${target} = NaN;`);
      emitWhile(stmt.init, depth, target);
      if (ctx.seriesVars.has(name)) {
        emitSeriesVarWrite(pad, name, target);
      }
      emitLocalHistoryPush(pad, name, target);
      emitFieldHistoryPush(pad, name, target);
      return;
    }

    const rhs = emitExpr(stmt.init);

    const taSite = stmt.init.type === 'CallExpression' ? ctx.taCallSiteMap.get(stmt.init) : null;
    if (taSite?.returnsTuple && stmt.names.type === 'VariableDeclarator') {
      lines.push(`${pad}const ${name} = ${rhs};`);
      return;
    }

    const localDeclName = currentLocalName(name);
    if (localDeclName) {
      lines.push(`${pad}let ${localDeclName} = ${rhs};`);
      emitLocalHistoryPush(pad, name, localDeclName);
      emitFieldHistoryPush(pad, name, localDeclName);
    } else if (ctx.seriesVars.has(name)) {
      emitSeriesVarWrite(pad, name, rhs);
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
        if (stmt.operator === ':=') {
          lines.push(`${pad}${localName} = ${rhs};`);
        } else {
          lines.push(`${pad}${localName} ${stmt.operator} ${rhs};`);
        }
        emitLocalHistoryPush(pad, name, localName);
        if (persistentAssignmentStart) {
          lines.push(`${pad}ctx.markPersistentRuntimeValue(${localName});`);
          lines.push(`${pad}if (${persistentAssignmentStart} !== undefined) ctx.markDrawingsPersistentFrom(${persistentAssignmentStart});`);
        }
        return;
      }
      if (ctx.seriesVars.has(name)) {
        const tmpVar = `_assign_${jsPineName(name)}_${lines.length}`;
        if (stmt.operator === ':=') {
          lines.push(`${pad}const ${tmpVar} = ${rhs};`);
        } else {
          const op = stmt.operator.charAt(0);
          lines.push(`${pad}const ${tmpVar} = this.${jsSeriesMember(name)}.get(0) ${op} ${rhs};`);
        }
        emitSeriesVarWrite(pad, name, tmpVar);
        if (persistentAssignmentStart) {
          lines.push(`${pad}ctx.markPersistentRuntimeValue(${tmpVar});`);
          lines.push(`${pad}if (${persistentAssignmentStart} !== undefined) ctx.markDrawingsPersistentFrom(${persistentAssignmentStart});`);
        }
        return;
      }
      if (ctx.varDecls.some((v) => v.name === name)) {
        const localPersistent = currentPersistentLocalName(name);
        if (localPersistent) {
          if (stmt.operator === ':=') {
            lines.push(`${pad}${localPersistent} = ${rhs};`);
          } else {
            lines.push(`${pad}${localPersistent} ${stmt.operator} ${rhs};`);
          }
          if (persistentAssignmentStart) {
            lines.push(`${pad}ctx.markPersistentRuntimeValue(${localPersistent});`);
            lines.push(`${pad}if (${persistentAssignmentStart} !== undefined) ctx.markDrawingsPersistentFrom(${persistentAssignmentStart});`);
          }
          return;
        }
        if (stmt.operator === ':=') {
          lines.push(`${pad}this.${jsVarMember(name)} = ${rhs};`);
        } else {
          lines.push(`${pad}this.${jsVarMember(name)} ${stmt.operator} ${rhs};`);
        }
        if (persistentAssignmentStart) {
          lines.push(`${pad}ctx.markPersistentRuntimeValue(this.${jsVarMember(name)});`);
          lines.push(`${pad}if (${persistentAssignmentStart} !== undefined) ctx.markDrawingsPersistentFrom(${persistentAssignmentStart});`);
        }
        return;
      }
      if (stmt.operator === ':=') {
        lines.push(`${pad}${emitAssignmentTarget(name)} = ${rhs};`);
      } else {
        lines.push(`${pad}${emitAssignmentTarget(name)} ${stmt.operator} ${rhs};`);
      }
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
        const op = stmt.operator.charAt(0);
        lines.push(`${pad}_setField(${obj}, "${field}", _getField(${obj}, "${field}") ${op} ${rhs});`);
      }
      lines.push(`${pad}ctx.markPersistentUdtField(${obj}, "${field}");`);
      if (stmt.left.object.type === 'Identifier') {
        emitFieldHistoryPush(pad, stmt.left.object.name, obj);
      }
      return;
    }
    if (stmt.left.type === 'IndexExpression') {
      const obj = emitExpr(stmt.left.object);
      const idx = emitExpr(stmt.left.index);
      if (stmt.operator === ':=') {
        lines.push(`${pad}_setIndex(${obj}, ${idx}, ${rhs});`);
      } else {
        const op = stmt.operator.charAt(0);
        lines.push(`${pad}_setIndex(${obj}, ${idx}, _idx(${obj}, ${idx}) ${op} ${rhs});`);
      }
      return;
    }
    lines.push(`${pad}${emitExpr(stmt.left)} ${stmt.operator === ':=' ? '=' : stmt.operator} ${rhs};`);
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
    const scopeBlockLocals = functionNameStack.length > 0;
    lines.push(`${pad}if (_isTruthy(${emitExpr(stmt.test)})) {`);
    if (scopeBlockLocals) localNameStack.push(collectFunctionLocalNames(stmt.consequent));
    if (assignTarget && stmt.consequent.length > 0) {
      const lastStmt = stmt.consequent[stmt.consequent.length - 1];
      for (let i = 0; i < stmt.consequent.length - 1; i++) {
        emitStmt(stmt.consequent[i], depth + 1);
      }
      if (!emitTailAssignment(lastStmt, depth + 1, assignTarget)) emitStmt(lastStmt, depth + 1);
    } else {
      for (const s of stmt.consequent) emitStmt(s, depth + 1);
    }
    if (scopeBlockLocals) localNameStack.pop();
    if (stmt.alternate) {
      if (Array.isArray(stmt.alternate)) {
        lines.push(`${pad}} else {`);
        if (scopeBlockLocals) localNameStack.push(collectFunctionLocalNames(stmt.alternate));
        if (assignTarget && stmt.alternate.length > 0) {
          const lastStmt = stmt.alternate[stmt.alternate.length - 1];
          for (let i = 0; i < stmt.alternate.length - 1; i++) {
            emitStmt(stmt.alternate[i], depth + 1);
          }
          if (!emitTailAssignment(lastStmt, depth + 1, assignTarget)) emitStmt(lastStmt, depth + 1);
        } else {
          for (const s of stmt.alternate) emitStmt(s, depth + 1);
        }
        if (scopeBlockLocals) localNameStack.pop();
        lines.push(`${pad}}`);
      } else {
        lines.push(`${pad}} else`);
        emitIf(stmt.alternate, depth, assignTarget);
      }
    } else {
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
    const scopeBlockLocals = functionNameStack.length > 0;
    if (scopeBlockLocals) localNameStack.push(collectFunctionLocalNames(stmt.body));
    for (const s of stmt.body) emitStmt(s, depth + 1);
    if (scopeBlockLocals) localNameStack.pop();
    lines.push(`${pad}}`);
  }

  function emitTailAssignment(stmt: Statement, depth: number, assignTarget: string): boolean {
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
    const scopeBlockLocals = functionNameStack.length > 0;
    if (scopeBlockLocals) localNameStack.push(collectFunctionLocalNames(stmts));
    if (!assignTarget || stmts.length === 0) {
      for (const s of stmts) emitStmt(s, depth);
      if (scopeBlockLocals) localNameStack.pop();
      return;
    }
    const lastStmt = stmts[stmts.length - 1];
    for (let i = 0; i < stmts.length - 1; i++) emitStmt(stmts[i], depth);
    if (!emitTailAssignment(lastStmt, depth, assignTarget)) emitStmt(lastStmt, depth);
    if (scopeBlockLocals) localNameStack.pop();
  }

  function emitFor(stmt: ForStatement, depth: number, assignTarget?: string): void {
    const pad = indent(depth);
    if (stmt.kind === 'numeric') {
      const counter = stmt.counter.name;
      const counterName = jsPineName(counter);
      const start = emitExpr(stmt.start);
      const end = emitExpr(stmt.end);
      const step = stmt.step ? emitExpr(stmt.step) : '1';
      lines.push(`${pad}for (let ${counterName} = ${start}, _end = ${end}, _step = ${step}, _iter = 0; _step > 0 ? ${counterName} <= _end : ${counterName} >= _end; ${counterName} += _step, _iter++) {`);
      lines.push(`${indent(depth + 1)}if (_iter >= ${ITERATION_CAP}) break;`);
      localNameStack.push(new Map([[counter, counterName]]));
      emitLoopBody(stmt.body, depth + 1, assignTarget);
      localNameStack.pop();
      lines.push(`${pad}}`);
    } else {
      const counter = stmt.counter.name;
      const counterName = jsPineName(counter);
      const iterable = emitExpr(stmt.iterable);
      const iterVar = `_iter_${counterName}`;
      if (stmt.indexCounter) {
        const entriesVar = `_entries_${counterName}`;
        const indexCounterName = jsPineName(stmt.indexCounter.name);
        lines.push(`${pad}{ const ${iterVar} = ${iterable}; const ${entriesVar} = _iterEntries(${iterVar});`);
        lines.push(`${pad}for (let _i = 0; _i < ${entriesVar}.length && _i < ${ITERATION_CAP}; _i++) {`);
        lines.push(`${indent(depth + 1)}let ${indexCounterName} = ${entriesVar}[_i][0];`);
        lines.push(`${indent(depth + 1)}let ${counterName} = ${entriesVar}[_i][1];`);
        localNameStack.push(new Map([[stmt.indexCounter.name, indexCounterName], [counter, counterName]]));
      } else {
        lines.push(`${pad}{ const ${iterVar} = ${iterable}; for (let _i = 0; _i < _iterSize(${iterVar}) && _i < ${ITERATION_CAP}; _i++) {`);
        lines.push(`${indent(depth + 1)}let ${counterName} = _iterGet(${iterVar}, _i);`);
        localNameStack.push(new Map([[counter, counterName]]));
      }
      emitLoopBody(stmt.body, depth + 1, assignTarget);
      localNameStack.pop();
      lines.push(`${pad}}}`)
    }
  }

  function emitWhile(stmt: WhileStatement, depth: number, assignTarget?: string): void {
    const pad = indent(depth);
    lines.push(`${pad}for (let _iter = 0; _iter < ${ITERATION_CAP} && _isTruthy(${emitExpr(stmt.test)}); _iter++) {`);
    emitLoopBody(stmt.body, depth + 1, assignTarget);
    lines.push(`${pad}}`);
  }

  function collectFunctionLocalNames(stmts: Statement[]): Map<string, string> {
    const names = new Map<string, string>();
    const visit = (stmt: Statement): void => {
      if (stmt.type === 'VariableDeclaration') {
        if (stmt.kind === 'var' || stmt.kind === 'varip') return;
        if (stmt.names.type === 'VariableDeclarator') {
          names.set(stmt.names.name.name, jsPineName(stmt.names.name.name));
        } else {
          for (const name of stmt.names.names) names.set(name.name, jsPineName(name.name));
        }
      } else if (stmt.type === 'MultiDeclaration') {
        for (const declaration of stmt.declarations) visit(declaration);
      }
    };
    for (const stmt of stmts) visit(stmt);
    return names;
  }

  function emitsFunctionNameReturn(stmt: Statement, functionName: string): boolean {
    if (stmt.type === 'VariableDeclaration' && stmt.names.type === 'VariableDeclarator') {
      return stmt.names.name.name === functionName;
    }
    return stmt.type === 'AssignmentStatement'
      && stmt.left.type === 'Identifier'
      && stmt.left.name === functionName;
  }

  function emitFunctionBody(stmts: Statement[], functionName: string): void {
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
    if (lastStmt.type === 'IfStatement') {
      const retName = `_fn_ret_${lines.length}`;
      lines.push(`    let ${retName} = NaN;`);
      emitIf(lastStmt, 2, retName);
      lines.push(`    return ${retName};`);
      localNameStack.pop();
      return;
    }
    if (lastStmt.type === 'ForStatement' || lastStmt.type === 'WhileStatement') {
      const retName = `_fn_ret_${lines.length}`;
      lines.push(`    let ${retName} = NaN;`);
      if (lastStmt.type === 'ForStatement') emitFor(lastStmt, 2, retName);
      else emitWhile(lastStmt, 2, retName);
      lines.push(`    return ${retName};`);
      localNameStack.pop();
      return;
    }
    emitStmt(lastStmt, 2);
    if (emitsFunctionNameReturn(lastStmt, functionName)) {
      lines.push(`    return ${currentLocalName(functionName) ?? emitAssignmentTarget(functionName)};`);
    }
    localNameStack.pop();
  }

  // --- Generate the class ---

  lines.push('// Generated by TealScript codegen');
  lines.push('return class GeneratedScript {');

  // Constructor
  lines.push('  constructor(deps) {');
  lines.push('    this._deps = deps;');

  // Bar field series
  for (const field of Object.values(BAR_FIELDS)) {
    lines.push(`    this.${field} = new deps.NumericSeries(deps.maxBarsBack);`);
  }

  // Computed bar field series (only if history-accessed)
  const computedBarFields = ['hl2', 'hlc3', 'ohlc4', 'hlcc4'];
  for (const name of computedBarFields) {
    if (ctx.barFieldSeriesVars.has(name)) {
      lines.push(`    this._s_${name} = new deps.NumericSeries(deps.maxBarsBack);`);
    }
  }

  // Series vars
  for (const name of ctx.seriesVars) {
    lines.push(`    this.${jsSeriesMember(name)} = new deps.ValueSeries(deps.maxBarsBack);`);
    lines.push(`    this.${jsSeriesBarMember(name)} = -1;`);
  }
  for (const [objectName, fields] of fieldHistory) {
    for (const field of fields) {
      lines.push(`    this.${fieldHistoryMemberName(objectName, field)} = new deps.ValueSeries(deps.maxBarsBack);`);
    }
  }

  // Var/varip
  for (const v of ctx.varDecls) {
    lines.push(`    this.${jsVarMember(v.name)} = NaN;`);
    lines.push(`    this.${jsInitMember(v.name)} = false;`);
  }
  for (const name of rootRegularVars) {
    if (!ctx.seriesVars.has(name) && !ctx.varDecls.some((v) => v.name === name)) {
      lines.push(`    this.${jsGlobalMember(name)} = NaN;`);
    }
  }
  for (const [callExpr, id] of functionEmitContext.callSites) {
    const localVars = callSiteLocalVars(callExpr);
    const hasTACalls = callSiteHasTACalls(callExpr);
    if (callSiteNeedsState(callExpr)) {
      lines.push(`    this.${jsStateMember('_fn_state_', String(id))} = {`);
      for (const localVar of localVars) {
        lines.push(`      ${jsVarMember(localVar.name)}: NaN,`);
        lines.push(`      ${jsInitMember(localVar.name)}: false,`);
      }
      if (hasTACalls) {
        lines.push('      __taCache: new Map(),');
        lines.push('      __taSeries: new Map(),');
      }
      lines.push('    };');
    }
    for (const param of callSiteHistoryParams(callExpr)) {
      lines.push(`    this.${jsStateMember('_fn_param_series_', `${id}_${param}`)} = new deps.ValueSeries(deps.maxBarsBack);`);
    }
    for (const local of callSiteHistoryLocals(callExpr)) {
      lines.push(`    this.${jsStateMember('_fn_local_series_', `${id}_${local}`)} = new deps.ValueSeries(deps.maxBarsBack);`);
    }
  }

  // TA members
  for (const site of ctx.taCallSites) {
    if (site.dynamicCtorArgExprs) continue;
    const argsStr = site.ctorArgs.map((a) => JSON.stringify(a)).join(', ');
    lines.push(`    this.${site.memberName} = new deps.${site.className}(${argsStr});`);
  }
  for (const site of ctx.taCallSites) {
    lines.push(`    this._ta_result_${site.memberName} = new deps.NumericSeries(deps.maxBarsBack);`);
  }
  for (const memberName of smaSourceSeries.values()) {
    lines.push(`    this.${memberName} = new deps.ValueSeries(deps.maxBarsBack);`);
  }
  for (const site of ctx.taVarSites) {
    lines.push(`    this.${site.memberName} = new deps.${site.className}();`);
    lines.push(`    this.${site.seriesName} = new deps.NumericSeries(deps.maxBarsBack);`);
  }

  // Placeholder for fixnan members (filled after body emission)
  const fixnanPlaceholderIdx = lines.length;
  lines.push('    this._dynamicTACache = new Map();');
  lines.push('  }');

  lines.push('  _dynamicTA(memberName, className, args) {');
  lines.push('    const key = memberName + ":" + args.map((arg) => typeof arg + "=" + String(arg)).join("|");');
  lines.push('    let entry = this._dynamicTACache.get(key);');
  lines.push('    if (!entry) {');
  lines.push('      entry = { className, args, instance: new this._deps[className](...args) };');
  lines.push('      this._dynamicTACache.set(key, entry);');
  lines.push('    }');
  lines.push('    return entry.instance;');
  lines.push('  }');
  lines.push('  _scopedTA(state, memberName, className, args) {');
  lines.push('    if (!state) return this._dynamicTA(memberName, className, args);');
  lines.push('    if (!state.__taCache) state.__taCache = new Map();');
  lines.push('    const key = memberName + ":" + args.map((arg) => typeof arg + "=" + String(arg)).join("|");');
  lines.push('    let entry = state.__taCache.get(key);');
  lines.push('    if (!entry) {');
  lines.push('      entry = { className, args, instance: new this._deps[className](...args) };');
  lines.push('      state.__taCache.set(key, entry);');
  lines.push('    }');
  lines.push('    return entry.instance;');
  lines.push('  }');
  lines.push('  _scopedTASeries(state, memberName) {');
  lines.push('    if (!state) return this[`_ta_result_${memberName}`];');
  lines.push('    if (!state.__taSeries) state.__taSeries = new Map();');
  lines.push('    let series = state.__taSeries.get(memberName);');
  lines.push('    if (!series) {');
  lines.push('      series = new this._deps.NumericSeries(this._deps.maxBarsBack);');
  lines.push('      state.__taSeries.set(memberName, series);');
  lines.push('    }');
  lines.push('    return series;');
  lines.push('  }');
  lines.push('  _smaFromSeries(series, length) {');
  lines.push('    const n = Math.max(1, Math.trunc(Number(length)));');
  lines.push('    let sum = 0;');
  lines.push('    for (let i = 0; i < n; i++) {');
  lines.push('      const value = Number(series?.get(i));');
  lines.push('      if (Number.isNaN(value)) return NaN;');
  lines.push('      sum += value;');
  lines.push('    }');
  lines.push('    return sum / n;');
  lines.push('  }');
  lines.push('  _childFnState(parentState, callSiteId, localNames, hasTACalls) {');
  lines.push('    if (!parentState) return undefined;');
  lines.push('    if (!parentState.__fnStates) parentState.__fnStates = new Map();');
  lines.push('    let state = parentState.__fnStates.get(callSiteId);');
  lines.push('    if (!state) {');
  lines.push('      state = {};');
  lines.push('      for (const name of localNames) {');
  lines.push('        state[`_v_${name}`] = NaN;');
  lines.push('        state[`__init_${name}`] = false;');
  lines.push('      }');
  lines.push('      if (hasTACalls) {');
  lines.push('        state.__taCache = new Map();');
  lines.push('        state.__taSeries = new Map();');
  lines.push('      }');
  lines.push('      parentState.__fnStates.set(callSiteId, state);');
  lines.push('    }');
  lines.push('    return state;');
  lines.push('  }');
  lines.push('  _saveChildFnStates(states) {');
  lines.push('    return Array.from((states ?? new Map()).entries()).map(([key, state]) => [key, this._saveFnState(state)]);');
  lines.push('  }');
  lines.push('  _saveFnState(state) {');
  lines.push('    const snap = {};');
  lines.push('    for (const [key, value] of Object.entries(state)) {');
  lines.push('      if (key !== "__taCache" && key !== "__taSeries" && key !== "__fnStates") snap[key] = value;');
  lines.push('    }');
  lines.push('    if (state.__taCache) snap.__taCache = Array.from(state.__taCache.entries()).map(([key, entry]) => [key, entry.className, entry.args, entry.instance.save()]);');
  lines.push('    if (state.__taSeries) snap.__taSeries = Array.from(state.__taSeries.entries()).map(([key, series]) => [key, series.save()]);');
  lines.push('    if (state.__fnStates) snap.__fnStates = this._saveChildFnStates(state.__fnStates);');
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
  lines.push('      if (key !== "__taCache" && key !== "__taSeries" && key !== "__fnStates") state[key] = value;');
  lines.push('    }');
  lines.push('    state.__taCache = new Map();');
  lines.push('    for (const [key, className, args, saved] of snap?.__taCache ?? []) {');
  lines.push('      const instance = new this._deps[className](...args);');
  lines.push('      instance.restore(saved);');
  lines.push('      state.__taCache.set(key, { className, args, instance });');
  lines.push('    }');
  lines.push('    state.__taSeries = new Map();');
  lines.push('    for (const [key, saved] of snap?.__taSeries ?? []) {');
  lines.push('      const series = new this._deps.NumericSeries(this._deps.maxBarsBack);');
  lines.push('      series.restore(saved);');
  lines.push('      state.__taSeries.set(key, series);');
  lines.push('    }');
  lines.push('    state.__fnStates = this._restoreChildFnStates(snap?.__fnStates);');
  lines.push('  }');

  // User-defined functions
  for (const [name, fi] of ctx.funcInfos) {
    const paramNames = fi.params.map(localParamName);
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
    const localVars = new Map((functionEmitContext.localVars.get(name) ?? []).map((v) => [v.name, `_state.${jsVarMember(v.name)}`]));
    const functionParams = ['ctx', '_state', ...paramNames, ...sourceParamNames, ...historyParamNames, ...localHistoryParamNames].join(', ');
    lines.push(`  ${jsFunctionMember(name)}(${functionParams}) {`);
    functionNameStack.push(name);
    localNameStack.push(localNames);
    localSourceNameStack.push(localSourceNames);
    localHistoryNameStack.push(localHistoryNames);
    persistentLocalStack.push(localVars);
    for (let i = 0; i < fi.params.length; i++) {
      const defaultExpr = fi.paramDefaults[i];
      if (defaultExpr) {
        lines.push(`    if (${paramNames[i]} === undefined) ${paramNames[i]} = ${emitExpr(defaultExpr)};`);
      }
    }
    if (Array.isArray(fi.body)) {
      emitFunctionBody(fi.body, name);
    } else {
      lines.push(`    return ${emitExpr(fi.body)};`);
    }
    persistentLocalStack.pop();
    localHistoryNameStack.pop();
    localSourceNameStack.pop();
    localNameStack.pop();
    functionNameStack.pop();
    lines.push('  }');
  }

  // onBar method
  lines.push('  onBar(ctx) {');
  for (const diagnostic of ctx.importDiagnostics) {
    lines.push(`    ${runtimeErrorExpr(diagnostic)};`);
  }

  // Push bar field series
  for (const [field, member] of Object.entries(BAR_FIELDS)) {
    if (ctx.barFieldSeriesVars.has(field) || ctx.usedBarFields.has(field) || field === 'close' || field === 'open' || field === 'high' || field === 'low') {
      lines.push(`    this.${member}.push(ctx.bar.${field});`);
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
      lines.push(`    this._s_${name}.push(${computedFieldExprs[name]});`);
    }
  }

  // Update TA variable series
  for (const site of ctx.taVarSites) {
    if (site.className === 'OBV') {
      lines.push(`    this.${site.seriesName}.push(this.${site.memberName}.compute(ctx.bar.close, ctx.bar.volume));`);
    } else {
      lines.push(`    this.${site.seriesName}.push(this.${site.memberName}.compute(ctx.bar.open, ctx.bar.high, ctx.bar.low, ctx.bar.close, ctx.bar.volume));`);
    }
  }
  for (const [site, memberName] of smaSourceSeries) {
    const sourceArg = site.computeArgExprs[0];
    if (sourceArg) {
      lines.push(`    this.${memberName}.push(${emitExpr(sourceArg)});`);
    }
  }

  // Emit body
  for (const stmt of ast.body) {
    emitStmt(stmt, 2);
  }

  lines.push('  }');

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

  // save/restore for realtime rollback
  lines.push('  save() {');
  lines.push('    return {');
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
  for (const v of ctx.varDecls) {
    lines.push(`      ${jsVarMember(v.name)}: this.${jsVarMember(v.name)},`);
    lines.push(`      ${jsInitMember(v.name)}: this.${jsInitMember(v.name)},`);
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
      lines.push(`        __fnStates: this._saveChildFnStates(this.${stateMember}.__fnStates),`);
      lines.push('      },');
    }
    for (const param of callSiteHistoryParams(callExpr)) {
      const member = jsStateMember('_fn_param_series_', `${id}_${param}`);
      lines.push(`      ${member}: this.${member}.save(),`);
    }
    for (const local of callSiteHistoryLocals(callExpr)) {
      const member = jsStateMember('_fn_local_series_', `${id}_${local}`);
      lines.push(`      ${member}: this.${member}.save(),`);
    }
  }
  for (const site of ctx.taCallSites) {
    if (site.dynamicCtorArgExprs) continue;
    lines.push(`      ${site.memberName}: this.${site.memberName}.save(),`);
  }
  for (const site of ctx.taCallSites) {
    lines.push(`      _ta_result_${site.memberName}: this._ta_result_${site.memberName}.save(),`);
  }
  lines.push('      _dynamicTACache: Array.from(this._dynamicTACache.entries()).map(([key, entry]) => [key, entry.className, entry.args, entry.instance.save()]),');
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
  for (const v of ctx.varDecls) {
    if (v.kind !== 'varip') {
      lines.push(`    this.${jsVarMember(v.name)} = snap.${jsVarMember(v.name)};`);
      lines.push(`    this.${jsInitMember(v.name)} = snap.${jsInitMember(v.name)};`);
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
        lines.push('        const series = new this._deps.NumericSeries(this._deps.maxBarsBack);');
        lines.push('        series.restore(state);');
        lines.push(`        this.${stateMember}.__taSeries.set(key, series);`);
        lines.push('      }');
      }
      lines.push(`      this.${stateMember}.__fnStates = this._restoreChildFnStates(snap.${stateMember}.__fnStates);`);
      lines.push('    }');
    }
    for (const param of callSiteHistoryParams(callExpr)) {
      const member = jsStateMember('_fn_param_series_', `${id}_${param}`);
      lines.push(`    this.${member}.restore(snap.${member});`);
    }
    for (const local of callSiteHistoryLocals(callExpr)) {
      const member = jsStateMember('_fn_local_series_', `${id}_${local}`);
      lines.push(`    this.${member}.restore(snap.${member});`);
    }
  }
  for (const site of ctx.taCallSites) {
    if (site.dynamicCtorArgExprs) continue;
    lines.push(`    this.${site.memberName}.restore(snap.${site.memberName});`);
  }
  for (const site of ctx.taCallSites) {
    lines.push(`    this._ta_result_${site.memberName}.restore(snap._ta_result_${site.memberName});`);
  }
  lines.push('    this._dynamicTACache = new Map();');
  lines.push('    for (const [key, className, args, state] of snap._dynamicTACache ?? []) {');
  lines.push('      const instance = new this._deps[className](...args);');
  lines.push('      instance.restore(state);');
  lines.push('      this._dynamicTACache.set(key, { className, args, instance });');
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

  return lines.join('\n');
}

export const RUNTIME_HELPERS = `
function _isNa(v) { return v !== v || v === undefined || v === null; }
function _isTruthy(v) { return v !== false && v !== 0 && !_isNa(v); }
function _eq(a, b) { return _isNa(a) || _isNa(b) ? false : a === b; }
function _neq(a, b) { return _isNa(a) || _isNa(b) ? false : a !== b; }
function _cmp(a, b, op) {
  if (_isNa(a) || _isNa(b)) return false;
  switch (op) {
    case '>': return a > b;
    case '<': return a < b;
    case '>=': return a >= b;
    case '<=': return a <= b;
  }
  return false;
}
function _nz(v, repl) { return _isNa(v) ? (repl !== undefined ? repl : 0) : v; }
function _and(a, b) { return _isTruthy(a) && _isTruthy(b); }
function _or(a, b) { return _isTruthy(a) || _isTruthy(b); }
function _idx(obj, i) {
  if (obj && obj.__tealscriptArray) return deps._arr.get(obj, i);
  if (obj && obj.__tealscriptMatrix) return deps._mtx.row(obj, i);
  return obj[i];
}
function _setIndex(obj, i, val) {
  if (obj && obj.__tealscriptArray) { deps._arr.set(obj, i, val); return; }
  obj[i] = val;
}
function _pivotPointLevels(developing, currentHigh, currentLow, currentClose, previousHigh, previousLow, previousClose) {
  const usePrevious = !_isTruthy(developing) && !_isNa(previousHigh) && !_isNa(previousLow) && !_isNa(previousClose);
  const high = usePrevious ? previousHigh : currentHigh;
  const low = usePrevious ? previousLow : currentLow;
  const close = usePrevious ? previousClose : currentClose;
  if (_isNa(high) || _isNa(low) || _isNa(close)) {
    return deps._arr.from(NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN, NaN);
  }
  const range = high - low;
  const p = (high + low + close) / 3;
  const r1 = 2 * p - low;
  const s1 = 2 * p - high;
  const r2 = p + range;
  const s2 = p - range;
  const r3 = high + 2 * (p - low);
  const s3 = low - 2 * (high - p);
  const r4 = r3 + range;
  const s4 = s3 - range;
  const r5 = r4 + range;
  const s5 = s4 - range;
  return deps._arr.from(p, s1, r1, s2, r2, s3, r3, s4, r4, s5, r5);
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
function _callCollectionMethod(kind, obj, name, args) {
  const runtimeName = _collectionMethodAliases[kind]?.[name] ?? name;
  if (kind === 'array') return deps._arr[runtimeName](obj, ...args);
  if (kind === 'map') return deps._map[runtimeName](obj, ...args);
  if (kind === 'matrix') return deps._mtx[runtimeName](obj, ...args);
  return undefined;
}
function _callAnyCollectionMethod(obj, name, args) {
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
function _iterEntries(obj) {
  if (obj && obj.__tealscriptMap) return Array.from(obj.entries.entries());
  if (obj && obj.__tealscriptArray) {
    var result = [];
    var size = deps._arr.size(obj);
    for (var i = 0; i < size; i++) result.push([i, deps._arr.get(obj, i)]);
    return result;
  }
  if (obj && obj.__tealscriptMatrix) {
    var result = [];
    var rows = deps._mtx.rows(obj);
    for (var i = 0; i < rows; i++) result.push([i, deps._mtx.row(obj, i)]);
    return result;
  }
  if (Array.isArray(obj)) return obj.map(function(v, i) { return [i, v]; });
  return [];
}
`;
