import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

import { pineV6ReferenceManualBuiltinNames } from '../src/compat/pineV6ReferenceManualAudit.ts';

type PropertyKind =
  | 'boolean-domain'
  | 'color-domain'
  | 'collection-shape'
  | 'enum-constant'
  | 'handle-shape'
  | 'integer-domain'
  | 'nonnegative'
  | 'numeric-domain'
  | 'numeric-range'
  | 'string-domain'
  | 'tuple-coherence'
  | 'void-side-effect';

type PropertyStrength = 'value-bound' | 'shape-only' | 'side-effect-only';

interface MemberProperty {
  member: string;
  kind: PropertyKind;
  strength: PropertyStrength;
  assertion: string;
  citation: string;
  appliesWhen: string;
}

interface SkippedMember {
  member: string;
  reason: string;
}

const REFERENCE = 'https://www.tradingview.com/pine-script-reference/v6/';
const CONCEPTS = {
  arrays: 'https://www.tradingview.com/pine-script-docs/language/arrays/',
  barStates: 'https://www.tradingview.com/pine-script-docs/concepts/bar-states/',
  chartInfo: 'https://www.tradingview.com/pine-script-docs/concepts/chart-information/',
  colors: 'https://www.tradingview.com/pine-script-docs/visuals/colors/',
  drawings: 'https://www.tradingview.com/pine-script-docs/visuals/lines-and-boxes/',
  matrices: 'https://www.tradingview.com/pine-script-docs/language/matrices/',
  otherTimeframes: 'https://www.tradingview.com/pine-script-docs/concepts/other-timeframes-and-data/',
  strategies: 'https://www.tradingview.com/pine-script-docs/concepts/strategies/',
  strings: 'https://www.tradingview.com/pine-script-docs/concepts/strings/',
  tables: 'https://www.tradingview.com/pine-script-docs/visuals/tables/',
  textShapes: 'https://www.tradingview.com/pine-script-docs/visuals/text-and-shapes/',
  time: 'https://www.tradingview.com/pine-script-docs/concepts/time/',
  timeframes: 'https://www.tradingview.com/pine-script-docs/concepts/timeframes/',
} as const;

const EXACT_CONSTANT_NAMESPACE_PREFIXES = [
  'adjustment.',
  'alert.freq_',
  'backadjustment.',
  'barmerge.',
  'currency.',
  'dayofweek.',
  'display.',
  'dividends.gross',
  'dividends.net',
  'earnings.actual',
  'earnings.standardized',
  'extend.',
  'font.',
  'format.',
  'hline.style_',
  'location.',
  'order.',
  'plot.linestyle_',
  'plot.style_',
  'position.',
  'scale.',
  'settlement_as_close.',
  'shape.',
  'size.',
  'splits.denominator',
  'splits.numerator',
  'text.',
  'xloc.',
  'yloc.',
  'label.style_',
  'line.style_',
  'math.e',
  'math.phi',
  'math.pi',
  'math.rphi',
  'session.extended',
  'session.regular',
  'strategy.cash',
  'strategy.commission.',
  'strategy.direction.',
  'strategy.fixed',
  'strategy.long',
  'strategy.oca.',
  'strategy.percent_of_equity',
  'strategy.short',
] as const;

const BOOLEAN_MEMBERS = new Set([
  'array.every',
  'array.includes',
  'array.some',
  'barstate.isconfirmed',
  'barstate.isfirst',
  'barstate.ishistory',
  'barstate.islast',
  'barstate.islastconfirmedhistory',
  'barstate.isnew',
  'barstate.isrealtime',
  'bool',
  'chart.is_heikinashi',
  'chart.is_kagi',
  'chart.is_linebreak',
  'chart.is_pnf',
  'chart.is_range',
  'chart.is_renko',
  'chart.is_standard',
  'false',
  'map.contains',
  'matrix.is_antidiagonal',
  'matrix.is_antisymmetric',
  'matrix.is_binary',
  'matrix.is_diagonal',
  'matrix.is_identity',
  'matrix.is_square',
  'matrix.is_stochastic',
  'matrix.is_symmetric',
  'matrix.is_triangular',
  'matrix.is_valid',
  'matrix.is_zero',
  'session.isfirstbar',
  'session.isfirstbar_regular',
  'session.islastbar',
  'session.islastbar_regular',
  'session.ismarket',
  'session.ispostmarket',
  'session.ispremarket',
  'str.contains',
  'str.endswith',
  'str.startswith',
  'ta.cross',
  'ta.crossover',
  'ta.crossunder',
  'ta.falling',
  'ta.rising',
  'timeframe.change',
  'timeframe.isdaily',
  'timeframe.isdwm',
  'timeframe.isintraday',
  'timeframe.isminutes',
  'timeframe.ismonthly',
  'timeframe.isseconds',
  'timeframe.isticks',
  'timeframe.isweekly',
  'true',
  'volume_row.has_buy_imbalance',
  'volume_row.has_sell_imbalance',
]);

const NONNEGATIVE_MEMBERS = new Set([
  'array.size',
  'bar_index',
  'color.b',
  'color.g',
  'color.r',
  'color.t',
  'dayofmonth',
  'hour',
  'last_bar_index',
  'last_bar_time',
  'math.abs',
  'math.sqrt',
  'matrix.columns',
  'matrix.elements_count',
  'matrix.rank',
  'matrix.rows',
  'minute',
  'month',
  'second',
  'str.length',
  'array.range',
  'array.stdev',
  'array.variance',
  'map.size',
  'matrix.stdev',
  'matrix.variance',
  'strategy.closedtrades',
  'strategy.closedtrades.commission',
  'strategy.closedtrades.entry_bar_index',
  'strategy.closedtrades.entry_time',
  'strategy.closedtrades.exit_bar_index',
  'strategy.closedtrades.exit_time',
  'strategy.closedtrades.max_drawdown',
  'strategy.closedtrades.max_drawdown_percent',
  'strategy.closedtrades.max_runup',
  'strategy.closedtrades.max_runup_percent',
  'strategy.eventrades',
  'strategy.grossprofit',
  'strategy.grossprofit_percent',
  'strategy.initial_capital',
  'strategy.losstrades',
  'strategy.max_contracts_held_all',
  'strategy.max_contracts_held_long',
  'strategy.max_contracts_held_short',
  'strategy.max_drawdown',
  'strategy.max_drawdown_percent',
  'strategy.max_runup',
  'strategy.max_runup_percent',
  'strategy.opentrades',
  'strategy.opentrades.capital_held',
  'strategy.opentrades.commission',
  'strategy.opentrades.entry_bar_index',
  'strategy.opentrades.entry_time',
  'strategy.opentrades.max_drawdown',
  'strategy.opentrades.max_drawdown_percent',
  'strategy.opentrades.max_runup',
  'strategy.opentrades.max_runup_percent',
  'strategy.wintrades',
  'syminfo.employees',
  'syminfo.expiration_date',
  'syminfo.mincontract',
  'syminfo.minmove',
  'syminfo.mintick',
  'syminfo.pointvalue',
  'syminfo.pricescale',
  'syminfo.recommendations_buy',
  'syminfo.recommendations_buy_strong',
  'syminfo.recommendations_date',
  'syminfo.recommendations_hold',
  'syminfo.recommendations_sell',
  'syminfo.recommendations_sell_strong',
  'syminfo.recommendations_total',
  'syminfo.shareholders',
  'syminfo.shares_outstanding_float',
  'syminfo.shares_outstanding_total',
  'syminfo.target_price_average',
  'syminfo.target_price_date',
  'syminfo.target_price_estimates',
  'syminfo.target_price_high',
  'syminfo.target_price_low',
  'syminfo.target_price_median',
  'ta.barssince',
  'ta.bbw',
  'ta.highestbars',
  'ta.lowestbars',
  'ta.range',
  'time',
  'time_close',
  'time_tradingday',
  'timestamp',
  'timenow',
  'volume',
  'weekofyear',
  'year',
]);

const INTEGER_MEMBERS = new Set([
  'bar_index',
  'dayofmonth',
  'dayofweek',
  'hour',
  'last_bar_index',
  'last_bar_time',
  'math.ceil',
  'math.floor',
  'math.sign',
  'math.trunc',
  'minute',
  'month',
  'second',
  'str.pos',
  'time',
  'time_close',
  'time_tradingday',
  'timeframe.in_seconds',
  'timestamp',
  'timenow',
  'weekofyear',
  'year',
]);

const STRING_MEMBERS = new Set([
  'input.session',
  'input.string',
  'input.symbol',
  'input.text_area',
  'input.timeframe',
  'label.get_text',
  'str.format',
  'str.format_time',
  'str.join',
  'str.lower',
  'str.match',
  'str.repeat',
  'str.replace',
  'str.replace_all',
  'str.substring',
  'str.tostring',
  'str.trim',
  'str.upper',
  'strategy.account_currency',
  'strategy.closedtrades.entry_comment',
  'strategy.closedtrades.entry_id',
  'strategy.closedtrades.exit_comment',
  'strategy.closedtrades.exit_id',
  'strategy.opentrades.entry_comment',
  'strategy.opentrades.entry_id',
  'strategy.position_entry_name',
  'array.join',
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
  'ticker.heikinashi',
  'ticker.inherit',
  'ticker.kagi',
  'ticker.linebreak',
  'ticker.modify',
  'ticker.new',
  'ticker.pointfigure',
  'ticker.renko',
  'ticker.standard',
  'timeframe.from_seconds',
  'timeframe.main_period',
  'timeframe.period',
]);

const COLLECTION_MEMBERS = [
  /^array\.(abs|binary_search.*|concat|copy|from|keys|new.*|reverse|slice|sort_indices|standardize)$/,
  /^box\.all$/,
  /^label\.all$/,
  /^line\.all$/,
  /^linefill\.all$/,
  /^map\.(copy|keys|new|values)$/,
  /^matrix\.(add_col|add_row|col|concat|copy|diff|eigenvalues|eigenvectors|fill|inv|kron|mult|new.*|pinv|pow|remove_col|remove_row|reshape|reverse|row|sort|submatrix|swap_columns|swap_rows|transpose)$/,
  /^polyline\.all$/,
  /^request\.security_lower_tf$/,
  /^str\.split$/,
  /^table\.all$/,
];

const HANDLE_MEMBERS = [
  /^(box|chart\.point|label|line|linefill|polyline|table)\.(copy|from_index|from_time|new|now)$/,
  /^linefill\.get_line[12]$/,
  /^(box|label|line|linefill|polyline|table)$/,
];

const VOID_SIDE_EFFECT_MEMBERS = [
  /^alert$/,
  /^alertcondition$/,
  /^array\.(clear|fill|insert|pop|push|remove|set|shift|sort|unshift)$/,
  /^barcolor$/,
  /^bgcolor$/,
  /^box\.(delete|set_)/,
  /^fill$/,
  /^hline$/,
  /^label\.(delete|set_)/,
  /^line\.(delete|set_)/,
  /^linefill\.(delete|set_color)$/,
  /^log\.(error|info|warning)$/,
  /^map\.(clear|put|put_all|remove)$/,
  /^matrix\.(add_col|add_row|concat|fill|remove_col|remove_row|reshape|reverse|set|sort|swap_columns|swap_rows)$/,
  /^max_bars_back$/,
  /^plot/,
  /^polyline\.delete$/,
  /^strategy\.(cancel|cancel_all|close|close_all|entry|exit|order)$/,
  /^strategy$/,
  /^strategy\.risk\./,
  /^table\.(cell|cell_set_|clear|delete|merge_cells|set_)/,
];

const NUMERIC_RANGE: Record<string, { min: number; max: number; citation: string; assertion?: string }> = {
  'color.b': { min: 0, max: 255, citation: CONCEPTS.colors },
  'color.g': { min: 0, max: 255, citation: CONCEPTS.colors },
  'color.r': { min: 0, max: 255, citation: CONCEPTS.colors },
  'color.t': { min: 0, max: 100, citation: CONCEPTS.colors },
  'dayofmonth': { min: 1, max: 31, citation: CONCEPTS.time },
  'dayofweek': { min: 1, max: 7, citation: CONCEPTS.time },
  'hour': { min: 0, max: 23, citation: CONCEPTS.time },
  'math.acos': { min: 0, max: Math.PI, citation: REFERENCE },
  'math.asin': { min: -Math.PI / 2, max: Math.PI / 2, citation: REFERENCE },
  'math.atan': { min: -Math.PI / 2, max: Math.PI / 2, citation: REFERENCE },
  'math.cos': { min: -1, max: 1, citation: REFERENCE },
  'math.random': { min: 0, max: 1, citation: REFERENCE, assertion: 'finite value is inside the requested min/max range; exact pseudo-random sequence remains trace-required' },
  'math.sign': { min: -1, max: 1, citation: REFERENCE, assertion: 'finite value is one of -1, 0, or 1' },
  'math.sin': { min: -1, max: 1, citation: REFERENCE },
  'math.tanh': { min: -1, max: 1, citation: REFERENCE },
  'minute': { min: 0, max: 59, citation: CONCEPTS.time },
  'month': { min: 1, max: 12, citation: CONCEPTS.time },
  'second': { min: 0, max: 59, citation: CONCEPTS.time },
  'ta.cmo': { min: -100, max: 100, citation: REFERENCE },
  'ta.dmi': { min: 0, max: 100, citation: REFERENCE, assertion: '+DI, -DI, and ADX tuple values are inside [0, 100] when finite' },
  'ta.mfi': { min: 0, max: 100, citation: REFERENCE },
  'ta.rci': { min: -100, max: 100, citation: REFERENCE },
  'ta.rsi': { min: 0, max: 100, citation: REFERENCE },
  'ta.stoch': { min: 0, max: 100, citation: REFERENCE },
  'ta.tsi': { min: -100, max: 100, citation: REFERENCE },
  'ta.wpr': { min: -100, max: 0, citation: REFERENCE },
  'timeframe.in_seconds': { min: 0, max: Number.POSITIVE_INFINITY, citation: CONCEPTS.timeframes, assertion: 'finite value is a positive integer second count for a valid timeframe' },
  'weekofyear': { min: 1, max: 53, citation: CONCEPTS.time },
  'array.indexof': { min: -1, max: Number.POSITIVE_INFINITY, citation: CONCEPTS.arrays, assertion: 'finite result is -1 or a nonnegative element index' },
  'array.lastindexof': { min: -1, max: Number.POSITIVE_INFINITY, citation: CONCEPTS.arrays, assertion: 'finite result is -1 or a nonnegative element index' },
  'array.percentrank': { min: 0, max: 100, citation: CONCEPTS.arrays },
  'str.pos': { min: -1, max: Number.POSITIVE_INFINITY, citation: CONCEPTS.strings, assertion: 'finite result is -1 or a nonnegative character position' },
};

const TUPLE_COHERENCE: Record<string, { assertion: string; citation: string }> = {
  'ta.bb': { assertion: 'when all tuple members are finite and multiplier is nonnegative, upper >= basis >= lower', citation: REFERENCE },
  'ta.kc': { assertion: 'when all tuple members are finite and multiplier is nonnegative, upper >= basis >= lower', citation: REFERENCE },
  'ta.macd': { assertion: 'when all tuple members are finite, histogram equals MACD minus signal', citation: REFERENCE },
  'ta.supertrend': { assertion: 'tuple arity is two, trend is numeric-or-na and direction is in the documented direction domain when finite', citation: REFERENCE },
};

const SKIP_REASONS: Record<string, string> = {
  indicator: 'declaration form; output properties belong to the plots/drawings it declares',
  input: 'generic input declaration returns its defval shape; no member-specific property beyond typed input overloads',
  library: 'declaration form, not an executable output value',
  'runtime.error': 'intentional exception surface, not a successful output value',
  string: 'type constructor; no output property beyond successful conversion without a concrete input',
};

function namespaceOf(member: string): string {
  return member.includes('.') ? member.slice(0, member.indexOf('.')) : '(global)';
}

function percent(part: number, total: number): string {
  return total === 0 ? '0.00%' : `${((part / total) * 100).toFixed(2)}%`;
}

function matchesAny(member: string, patterns: readonly RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(member));
}

function isExactConstant(member: string): boolean {
  const colorConstants = member.startsWith('color.') && !['color.b', 'color.from_gradient', 'color.g', 'color.new', 'color.r', 'color.rgb', 'color.t'].includes(member);
  return member === 'false' || member === 'na' || member === 'true' || colorConstants || EXACT_CONSTANT_NAMESPACE_PREFIXES.some((prefix) => member.startsWith(prefix));
}

function collectionCitation(member: string): string {
  if (member.startsWith('matrix.')) return CONCEPTS.matrices;
  if (member.startsWith('map.')) return `${REFERENCE} ${CONCEPTS.arrays}`;
  if (member.startsWith('request.')) return CONCEPTS.otherTimeframes;
  if (member.startsWith('str.')) return CONCEPTS.strings;
  return CONCEPTS.arrays;
}

function handleCitation(member: string): string {
  if (member.startsWith('table') || member.startsWith('table.')) return CONCEPTS.tables;
  if (member.startsWith('label')) return CONCEPTS.textShapes;
  return CONCEPTS.drawings;
}

function addProperty(member: string, properties: MemberProperty[], property: Omit<MemberProperty, 'member'>): void {
  properties.push({ member, ...property });
}

function propertiesForMember(member: string): MemberProperty[] {
  const properties: MemberProperty[] = [];

  if (isExactConstant(member)) {
    addProperty(member, properties, {
      kind: 'enum-constant',
      strength: 'value-bound',
      assertion: 'value equals the documented Pine constant identity',
      citation: REFERENCE,
      appliesWhen: 'always',
    });
  }

  const range = NUMERIC_RANGE[member];
  if (range) {
    addProperty(member, properties, {
      kind: 'numeric-range',
      strength: 'value-bound',
      assertion: range.assertion ?? `finite value is within [${range.min}, ${range.max}]`,
      citation: range.citation,
      appliesWhen: 'when the member returns a finite value',
    });
  }

  if (BOOLEAN_MEMBERS.has(member)) {
    addProperty(member, properties, {
      kind: 'boolean-domain',
      strength: 'value-bound',
      assertion: 'value is boolean or na; it is never a numeric magnitude or object payload',
      citation: member.startsWith('barstate.') ? CONCEPTS.barStates : REFERENCE,
      appliesWhen: 'when the member returns a value',
    });
  }

  if (INTEGER_MEMBERS.has(member)) {
    addProperty(member, properties, {
      kind: 'integer-domain',
      strength: 'value-bound',
      assertion: 'finite value is an integer',
      citation: REFERENCE,
      appliesWhen: 'when the member returns a finite value',
    });
  }

  if (NONNEGATIVE_MEMBERS.has(member)) {
    addProperty(member, properties, {
      kind: 'nonnegative',
      strength: 'value-bound',
      assertion: 'finite value is greater than or equal to zero',
      citation: REFERENCE,
      appliesWhen: 'when the member returns a finite value',
    });
  }

  const tuple = TUPLE_COHERENCE[member];
  if (tuple) {
    addProperty(member, properties, {
      kind: 'tuple-coherence',
      strength: 'value-bound',
      assertion: tuple.assertion,
      citation: tuple.citation,
      appliesWhen: 'when the call emits all relevant tuple members and they are finite',
    });
  }

  if (STRING_MEMBERS.has(member) || member.startsWith('currency.') || member.startsWith('ticker.')) {
    addProperty(member, properties, {
      kind: 'string-domain',
      strength: 'shape-only',
      assertion: 'value is a string or na, matching the documented identifier/text return shape',
      citation: member.startsWith('str.') ? CONCEPTS.strings : REFERENCE,
      appliesWhen: 'when the member returns a value',
    });
  }

  if (/^(ask|bid|box\.get_.*|chart\.(left|right)_visible_bar_time|fixnan|line\.get_.*|label\.get_[xy]|math\.(avg|exp|log|log10|max|min|pow|round_to_mintick|sum|tan|todegrees|toradians)|matrix\.(avg|det|get|max|median|min|mode|sum|trace)|nz|str\.tonumber|timeframe\.multiplier)$/.test(member)) {
    addProperty(member, properties, {
      kind: 'numeric-domain',
      strength: 'shape-only',
      assertion: 'value is numeric or na; exact value requires the concrete input series, object state, provider data, or trace',
      citation: REFERENCE,
      appliesWhen: 'when the member returns a scalar value',
    });
  }

  if (/^(chart\.(bg_color|fg_color)|color\.(from_gradient|new|rgb))$/.test(member)) {
    addProperty(member, properties, {
      kind: 'color-domain',
      strength: 'shape-only',
      assertion: 'value is a Pine color or na; channel components exposed through color.r/g/b/t stay in their documented ranges',
      citation: CONCEPTS.colors,
      appliesWhen: 'when the member returns a color',
    });
  }

  if (member === 'map.get') {
    addProperty(member, properties, {
      kind: 'numeric-domain',
      strength: 'shape-only',
      assertion: 'returned value has the mapped value type or na when the key is absent',
      citation: REFERENCE,
      appliesWhen: 'when reading a map key',
    });
  }

  if (/^array\.(avg|covariance|first|get|last|max|median|min|mode|percentile_linear_interpolation|percentile_nearest_rank|sum)$/.test(member)) {
    addProperty(member, properties, {
      kind: 'numeric-domain',
      strength: 'shape-only',
      assertion: 'value is numeric or na and is derived from the documented array element set',
      citation: CONCEPTS.arrays,
      appliesWhen: 'when the array contains compatible numeric elements',
    });
  }

  if (matchesAny(member, COLLECTION_MEMBERS)) {
    addProperty(member, properties, {
      kind: 'collection-shape',
      strength: 'shape-only',
      assertion: 'returned collection has a nonnegative length/size and preserves documented element container shape',
      citation: collectionCitation(member),
      appliesWhen: 'when the member returns a collection',
    });
  }

  if (matchesAny(member, HANDLE_MEMBERS)) {
    addProperty(member, properties, {
      kind: 'handle-shape',
      strength: 'shape-only',
      assertion: 'returned value is a drawing/table handle or na; getter/setter effects must reference that handle family',
      citation: handleCitation(member),
      appliesWhen: 'when the member returns a handle',
    });
  }

  if (matchesAny(member, VOID_SIDE_EFFECT_MEMBERS)) {
    addProperty(member, properties, {
      kind: 'void-side-effect',
      strength: 'side-effect-only',
      assertion: 'member produces the documented side-effect output and does not create a scalar plot value by itself',
      citation: member.startsWith('strategy.') ? CONCEPTS.strategies : REFERENCE,
      appliesWhen: 'when the member is executed',
    });
  }

  if (member.startsWith('input.') && !properties.length) {
    addProperty(member, properties, {
      kind: 'numeric-domain',
      strength: 'shape-only',
      assertion: 'input result preserves the documented typed defval/options domain for the specific input overload',
      citation: REFERENCE,
      appliesWhen: 'when the input declaration succeeds',
    });
  }

  if (/^(open|high|low|close|hl2|hlc3|hlcc4|ohlc4|ta\.(accdist|alma|atr|cci|change|cog|correlation|covariance|cum|dev|ema|highest|hma|iii|linreg|lowest|max|median|min|mode|mom|nvi|obv|percentile_|percentrank|pivot_point_levels|pivothigh|pivotlow|pvi|pvt|rma|roc|sar|sma|stdev|swma|tr|valuewhen|variance|vwap|vwma|wad|wma|wvad))/.test(member)) {
    addProperty(member, properties, {
      kind: 'numeric-domain',
      strength: 'shape-only',
      assertion: 'value is numeric or na; exact seed, hole, and provider behavior may require a stronger oracle',
      citation: REFERENCE,
      appliesWhen: 'when the member returns a scalar value',
    });
  }

  if (/^strategy\.(avg_|closedtrades\.|convert_|default_entry_qty|equity|gross|netprofit|openprofit|opentrades\.|position_|margin_liquidation_price)/.test(member)) {
    addProperty(member, properties, {
      kind: 'numeric-domain',
      strength: 'shape-only',
      assertion: 'value is numeric or na and belongs to the documented broker-emulator metric family',
      citation: CONCEPTS.strategies,
      appliesWhen: 'when the referenced trade/position exists or the aggregate is defined',
    });
  }

  if (/^(request\.|dividends\.|earnings\.|footprint\.|volume_row\.)/.test(member) && !properties.length) {
    addProperty(member, properties, {
      kind: 'numeric-domain',
      strength: 'shape-only',
      assertion: 'value has the documented provider-return shape; exact payload requires host/provider data or trace',
      citation: CONCEPTS.otherTimeframes,
      appliesWhen: 'when provider data is available',
    });
  }

  return properties;
}

function skipReasonFor(member: string): string {
  if (SKIP_REASONS[member]) return SKIP_REASONS[member];
  if (/^(color|float|int|bool|box|label|line|linefill|table)$/.test(member)) return 'type or namespace constructor; no output property without a concrete constructed value';
  return 'no reference-derived output property recorded; leave unmapped rather than inventing one';
}

function byNamespace<T extends { member: string }>(rows: readonly T[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const row of rows) {
    const namespace = namespaceOf(row.member);
    counts[namespace] = (counts[namespace] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort(([left], [right]) => left.localeCompare(right)));
}

function byKind(rows: readonly MemberProperty[]): Record<PropertyKind, number> {
  const counts = {} as Record<PropertyKind, number>;
  for (const row of rows) counts[row.kind] = (counts[row.kind] ?? 0) + 1;
  return Object.fromEntries(Object.entries(counts).sort(([left], [right]) => left.localeCompare(right))) as Record<PropertyKind, number>;
}

function markdownList(rows: readonly string[]): string {
  if (!rows.length) return '- none';
  return rows.map((row) => `- ${row}`).join('\n');
}

function reportVersionFromOutputBase(outputBase: string): number {
  const match = /-v(\d+)$/.exec(outputBase);
  return match ? Number(match[1]) : 1;
}

export function buildPineMemberPropertyMapReport(version = 1): { json: unknown; markdown: string } {
  const officialMembers = pineV6ReferenceManualBuiltinNames();
  const officialSet = new Set(officialMembers);
  const properties = officialMembers.flatMap(propertiesForMember);
  const propertyMemberSet = new Set(properties.map((property) => property.member));
  const skippedMembers = officialMembers
    .filter((member) => !propertyMemberSet.has(member))
    .map((member): SkippedMember => ({ member, reason: skipReasonFor(member) }));
  const staleProperties = properties.filter((property) => !officialSet.has(property.member));
  if (staleProperties.length) {
    throw new Error(`Property map references non-official members: ${staleProperties.map((row) => row.member).join(', ')}`);
  }

  const valueBoundMembers = new Set(properties.filter((row) => row.strength === 'value-bound').map((row) => row.member));
  const shapeOnlyMembers = new Set(properties.filter((row) => row.strength === 'shape-only').map((row) => row.member));
  const sideEffectOnlyMembers = new Set(properties.filter((row) => row.strength === 'side-effect-only').map((row) => row.member));

  const json = {
    schemaVersion: 1,
    basis: {
      officialMemberDenominator: officialMembers.length,
      source: 'TradingView Pine v6 reference manual index snapshot in src/compat/pineV6ReferenceManualIndex.ts',
      rule: 'Properties are reference-derived checks that can be applied without TradingView traces. Members with no derivable output property stay unmapped.',
    },
    summary: {
      propertyMappedMembers: propertyMemberSet.size,
      propertyMappedPercent: percent(propertyMemberSet.size, officialMembers.length),
      valueBoundMembers: valueBoundMembers.size,
      shapeOnlyMembers: [...shapeOnlyMembers].filter((member) => !valueBoundMembers.has(member)).length,
      sideEffectOnlyMembers: [...sideEffectOnlyMembers].filter((member) => !valueBoundMembers.has(member) && !shapeOnlyMembers.has(member)).length,
      skippedMembers: skippedMembers.length,
      skippedPercent: percent(skippedMembers.length, officialMembers.length),
      propertyRules: properties.length,
    },
    byNamespace: {
      mappedMembers: byNamespace([...propertyMemberSet].map((member) => ({ member }))),
      skippedMembers: byNamespace(skippedMembers),
    },
    byKind: byKind(properties),
    properties,
    skippedMembers,
  };

  const topSkippedNamespaces = Object.entries(byNamespace(skippedMembers))
    .sort(([, left], [, right]) => right - left)
    .slice(0, 12);

  const markdown = [
    `# Pine Member Property Map V${version}`,
    '',
    '## Basis',
    '',
    '- Denominator: 861 names from the committed TradingView Pine v6 reference manual index snapshot.',
    '- Purpose: provide the corpus output-property audit with a single member-to-property lens, instead of re-deriving bounds in the corpus lane.',
    '- Rule: include only properties derivable from the Reference Manual or official concept docs without a TradingView trace.',
    '- Limit: a property is weaker than an exact value oracle. It can catch impossible output, shape, range, and coherence defects; it does not settle exact seed/hole/recovery values.',
    '',
    '## Headline',
    '',
    `- Members with at least one property: ${propertyMemberSet.size}/${officialMembers.length} (${percent(propertyMemberSet.size, officialMembers.length)}).`,
    `- Value-bound members: ${valueBoundMembers.size}.`,
    `- Shape-only members not already value-bound: ${[...shapeOnlyMembers].filter((member) => !valueBoundMembers.has(member)).length}.`,
    `- Side-effect-only members not already covered by value/shape: ${[...sideEffectOnlyMembers].filter((member) => !valueBoundMembers.has(member) && !shapeOnlyMembers.has(member)).length}.`,
    `- Skipped members: ${skippedMembers.length}/${officialMembers.length} (${percent(skippedMembers.length, officialMembers.length)}).`,
    `- Property rules: ${properties.length}.`,
    '',
    '## Property Kinds',
    '',
    '| Kind | Rules |',
    '| --- | ---: |',
    ...Object.entries(byKind(properties)).map(([kind, count]) => `| \`${kind}\` | ${count} |`),
    '',
    '## Skipped Namespace Counts',
    '',
    '| Namespace | Skipped |',
    '| --- | ---: |',
    ...topSkippedNamespaces.map(([namespace, count]) => `| \`${namespace}\` | ${count} |`),
    '',
    '## Skipped Members',
    '',
    markdownList(skippedMembers.map((row) => `\`${row.member}\` - ${row.reason}`)),
    '',
    '## Property Rules',
    '',
    '| Member | Kind | Strength | Assertion | Applies when | Citation |',
    '| --- | --- | --- | --- | --- | --- |',
    ...properties.map((row) => `| \`${row.member}\` | \`${row.kind}\` | \`${row.strength}\` | ${row.assertion} | ${row.appliesWhen} | ${row.citation} |`),
    '',
  ].join('\n');

  return { json, markdown };
}

async function main(): Promise<void> {
  const outputBase = process.argv[2] ?? 'packages/tealscript/reports/pine-member-property-map-v1';
  const { json, markdown } = buildPineMemberPropertyMapReport(reportVersionFromOutputBase(outputBase));
  await mkdir(dirname(outputBase), { recursive: true });
  await writeFile(`${outputBase}.json`, `${JSON.stringify(json, null, 2)}\n`, 'utf8');
  await writeFile(`${outputBase}.md`, markdown, 'utf8');
  process.stdout.write(`${JSON.stringify((json as { summary: unknown }).summary, null, 2)}\n`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error: unknown) => {
    process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
