import type {
  Program, Statement, Expression,
  VariableDeclaration,
  AssignmentStatement,
  TupleAssignment,
  IfStatement,
  ForStatement,
  WhileStatement,
  CallExpression,
  MemberExpression,
  IndexExpression,
  Identifier,
  SwitchExpression,
} from '../../parser/ast';
import type { AnalysisContext, TACallSite } from './analyzer';

const BAR_FIELDS: Record<string, string> = {
  open: '_s_open', high: '_s_high', low: '_s_low', close: '_s_close',
  volume: '_s_volume', time: '_s_time',
};

const BARSTATE_FIELDS = new Set([
  'isfirst', 'islast', 'ishistory', 'isrealtime', 'isnew', 'isconfirmed',
  'islastconfirmedhistory',
]);

const SYMINFO_FIELDS = new Set([
  'ticker', 'tickerid', 'prefix', 'root', 'currency', 'basecurrency',
  'description', 'type', 'timezone', 'session', 'pricescale', 'mintick',
  'pointvalue', 'volumetype',
]);

const TIMEFRAME_FIELDS = new Set([
  'period', 'multiplier', 'isminutes', 'isdaily', 'isweekly', 'ismonthly',
  'isintraday', 'isseconds',
]);

const MATH_FUNCS: Record<string, string> = {
  'math.abs': 'Math.abs', 'math.ceil': 'Math.ceil', 'math.floor': 'Math.floor',
  'math.round': 'Math.round', 'math.sqrt': 'Math.sqrt', 'math.pow': 'Math.pow',
  'math.log': 'Math.log', 'math.log10': 'Math.log10', 'math.exp': 'Math.exp',
  'math.sign': 'Math.sign', 'math.sin': 'Math.sin', 'math.cos': 'Math.cos',
  'math.tan': 'Math.tan', 'math.asin': 'Math.asin', 'math.acos': 'Math.acos',
  'math.atan': 'Math.atan',
  'math.max': 'Math.max', 'math.min': 'Math.min',
  'math.random': 'Math.random',
  'math.pi': 'Math.PI', 'math.e': 'Math.E',
  'math.phi': '1.618033988749895',
  'math.rphi': '0.618033988749895',
};

const PLOT_FUNCTIONS = new Set([
  'plot', 'plotshape', 'plotchar', 'plotarrow', 'plotbar', 'plotcandle',
  'bgcolor', 'barcolor', 'hline', 'fill',
]);

const ITERATION_CAP = 10000;

const ARRAY_FUNC_MAP: Record<string, string> = {
  'array.new': 'create', 'array.new_float': 'create', 'array.new_int': 'create',
  'array.new_bool': 'create', 'array.new_string': 'create', 'array.new_color': 'create',
  'array.new_line': 'create', 'array.new_label': 'create', 'array.new_box': 'create',
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

const MAP_FUNC_MAP: Record<string, string> = {
  'map.new': 'create',
  'map.put': 'put', 'map.get': 'get',
  'map.contains': 'contains', 'map.remove': 'remove',
  'map.clear': 'clear', 'map.copy': 'copy',
  'map.keys': 'keys', 'map.values': 'values',
  'map.size': 'size', 'map.put_all': 'putAll',
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
  'matrix.add_row': 'addRow', 'matrix.add_col': 'addCol',
  'matrix.remove_row': 'removeRow', 'matrix.remove_col': 'removeCol',
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

export function emit(ast: Program, ctx: AnalysisContext): string {
  const lines: string[] = [];
  const indent = (n: number) => '  '.repeat(n);
  let fixnanIndex = 0;

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
            return `(_and(${left}, ${right}))`;
          case 'or':
            return `(_or(${left}, ${right}))`;
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
        return `[${expr.elements.map(emitExpr).join(', ')}]`;
      case 'LambdaExpression':
        return `(${expr.params.map((p) => p.name).join(', ')}) => ${emitExpr(expr.body)}`;
      case 'ForStatement':
      case 'WhileStatement':
        return 'NaN';
      default:
        return 'NaN';
    }
  }

  function emitIdentifier(id: Identifier): string {
    const name = id.name;
    if (name in BAR_FIELDS) return `this.${BAR_FIELDS[name]}.get(0)`;
    if (name === 'hl2') return '((ctx.bar.high + ctx.bar.low) / 2)';
    if (name === 'hlc3') return '((ctx.bar.high + ctx.bar.low + ctx.bar.close) / 3)';
    if (name === 'ohlc4') return '((ctx.bar.open + ctx.bar.high + ctx.bar.low + ctx.bar.close) / 4)';
    if (name === 'hlcc4') return '((ctx.bar.high + ctx.bar.low + ctx.bar.close + ctx.bar.close) / 4)';
    if (name === 'bar_index') return 'ctx.barIndex';
    if (name === 'last_bar_index') return 'ctx.lastBarIndex';
    if (name === 'na') return 'NaN';
    if (name === 'true') return 'true';
    if (name === 'false') return 'false';
    if (name === 'math') return 'Math';
    if (ctx.seriesVars.has(name)) return `this._sv_${name}.get(0)`;
    if (ctx.varDecls.some((v) => v.name === name)) return `this._v_${name}`;
    return name;
  }

  function emitMemberExpr(expr: MemberExpression): string {
    if (expr.object.type === 'Identifier') {
      const ns = expr.object.name;
      const prop = expr.property.name;
      const fullName = `${ns}.${prop}`;

      if (ns === 'barstate' && BARSTATE_FIELDS.has(prop)) return `ctx.barstate.${prop}`;
      if (ns === 'syminfo' && SYMINFO_FIELDS.has(prop)) return `ctx.syminfo.${prop}`;
      if (ns === 'timeframe' && TIMEFRAME_FIELDS.has(prop)) return `ctx.timeframe.${prop}`;
      if (ns === 'math' && fullName in MATH_FUNCS) return MATH_FUNCS[fullName];
      if (ns === 'strategy') return `ctx.strategyProp("${prop}")`;
      if (ns === 'color') return `"${prop}"`;
      if (ns === 'shape') return `"${prop}"`;
      if (ns === 'location') return `"${prop}"`;
      if (ns === 'size') return `"${prop}"`;
      if (ns === 'plot') return `"${prop}"`;
      if (ns === 'display') return `"${prop}"`;
      if (ns === 'format') return `"${prop}"`;
      if (ns === 'scale') return `"${prop}"`;
      if (ns === 'currency') return `"${prop}"`;
      if (ns === 'xloc') return `"${prop}"`;
      if (ns === 'yloc') return `"${prop}"`;
      if (ns === 'text') return `"${prop}"`;
      if (ns === 'extend') return `"${prop}"`;
      if (ns === 'line') return `"${prop}"`;
      if (ns === 'label') return `"${prop}"`;
      if (ns === 'box') return `"${prop}"`;
      if (ns === 'polyline') return `"${prop}"`;
      if (ns === 'linefill') return `"${prop}"`;
      if (ns === 'table') return `"${prop}"`;
      if (ns === 'adjust') return `"${prop}"`;
      if (ns === 'alert') return `"${prop}"`;
      if (ns === 'order') return `"${prop}"`;
      if (ns === 'dayofweek') return `"${prop}"`;
    }
    return `_getField(${emitExpr(expr.object)}, "${expr.property.name}")`;
  }

  function emitIndexExpr(expr: IndexExpression): string {
    const idx = emitExpr(expr.index);
    if (expr.object.type === 'Identifier') {
      const name = expr.object.name;
      if (name in BAR_FIELDS) return `this.${BAR_FIELDS[name]}.get(${idx})`;
      if (name === 'hl2' || name === 'hlc3' || name === 'ohlc4' || name === 'hlcc4') {
        return `this._s_${name}.get(${idx})`;
      }
      if (ctx.seriesVars.has(name)) return `this._sv_${name}.get(${idx})`;
    }
    return `_idx(${emitExpr(expr.object)}, ${idx})`;
  }

  function emitCallExpr(expr: CallExpression): string {
    const taSite = ctx.taCallSiteMap.get(expr);
    if (taSite) return emitTACall(taSite, expr);

    const callee = expr.callee;
    let fullName = '';
    let namespace = '';
    if (callee.type === 'Identifier') {
      fullName = callee.name;
    } else if (callee.type === 'MemberExpression' && callee.object.type === 'Identifier') {
      namespace = callee.object.name;
      fullName = `${namespace}.${callee.property.name}`;
    }

    const posArgs = expr.arguments.filter((a) => !a.name).map((a) => emitExpr(a.value));

    // Math functions
    if (fullName in MATH_FUNCS) {
      const fn = MATH_FUNCS[fullName];
      if (fullName === 'math.avg') {
        return posArgs.length > 0
          ? `((${posArgs.join(' + ')}) / ${posArgs.length})`
          : 'NaN';
      }
      if (fullName === 'math.sum') {
        return `ctx.mathSum(${posArgs.join(', ')})`;
      }
      if (fullName === 'math.todegrees') return `(${posArgs[0]} * 180 / Math.PI)`;
      if (fullName === 'math.toradians') return `(${posArgs[0]} * Math.PI / 180)`;
      return `${fn}(${posArgs.join(', ')})`;
    }

    // nz / na
    if (fullName === 'nz') return posArgs.length > 1 ? `_nz(${posArgs[0]}, ${posArgs[1]})` : `_nz(${posArgs[0]})`;
    if (fullName === 'na') return posArgs.length > 0 ? `_isNa(${posArgs[0]})` : 'NaN';
    if (fullName === 'fixnan') {
      const fnIdx = fixnanIndex++;
      return `(_isNa(${posArgs[0]}) ? this._fixnan_${fnIdx} : (this._fixnan_${fnIdx} = ${posArgs[0]}))`;
    }

    // Type casts
    if (fullName === 'int') return `Math.trunc(${posArgs[0]})`;
    if (fullName === 'float') return `+(${posArgs[0]})`;
    if (fullName === 'bool') return `!!(${posArgs[0]})`;
    if (fullName === 'string' || fullName === 'str.tostring') return `String(${posArgs[0]})`;
    if (fullName === 'str.tonumber') return `Number(${posArgs[0]})`;

    // String functions
    if (fullName === 'str.length') return `${posArgs[0]}.length`;
    if (fullName === 'str.contains') return `${posArgs[0]}.includes(${posArgs[1]})`;
    if (fullName === 'str.startswith') return `${posArgs[0]}.startsWith(${posArgs[1]})`;
    if (fullName === 'str.endswith') return `${posArgs[0]}.endsWith(${posArgs[1]})`;
    if (fullName === 'str.substring') return `${posArgs[0]}.substring(${posArgs[1]}${posArgs[2] ? ', ' + posArgs[2] : ''})`;
    if (fullName === 'str.replace') return `${posArgs[0]}.replace(${posArgs[1]}, ${posArgs[2]})`;
    if (fullName === 'str.replace_all') return `${posArgs[0]}.replaceAll(${posArgs[1]}, ${posArgs[2]})`;
    if (fullName === 'str.lower') return `${posArgs[0]}.toLowerCase()`;
    if (fullName === 'str.upper') return `${posArgs[0]}.toUpperCase()`;
    if (fullName === 'str.trim') return `${posArgs[0]}.trim()`;
    if (fullName === 'str.pos') return `${posArgs[0]}.indexOf(${posArgs[1]})`;
    if (fullName === 'str.repeat') return `${posArgs[0]}.repeat(${posArgs[1]})`;
    if (fullName === 'str.split') return `${posArgs[0]}.split(${posArgs[1]})`;
    if (fullName === 'str.format') return `ctx.strFormat(${posArgs.join(', ')})`;
    if (fullName === 'str.format_time') return `ctx.strFormatTime(${posArgs.join(', ')})`;

    // Color functions
    if (fullName === 'color.new') return `ctx.colorNew(${posArgs.join(', ')})`;
    if (fullName === 'color.rgb') return `ctx.colorRgb(${posArgs.join(', ')})`;
    if (fullName === 'color.r') return `ctx.colorR(${posArgs[0]})`;
    if (fullName === 'color.g') return `ctx.colorG(${posArgs[0]})`;
    if (fullName === 'color.b') return `ctx.colorB(${posArgs[0]})`;
    if (fullName === 'color.t') return `ctx.colorT(${posArgs[0]})`;

    // Array functions
    if (namespace === 'array') {
      return emitArrayCall(fullName, expr);
    }

    // Map functions
    if (namespace === 'map') {
      const mapped = MAP_FUNC_MAP[fullName];
      if (mapped) return `deps._map.${mapped}(${posArgs.join(', ')})`;
      return `deps._map.${fullName.replace('map.', '')}(${posArgs.join(', ')})`;
    }

    // Ticker functions
    if (namespace === 'ticker') {
      if (fullName === 'ticker.new') return `ctx.tickerNew(${posArgs.join(', ')})`;
      if (fullName === 'ticker.modify') return `ctx.tickerModify(${posArgs.join(', ')})`;
      if (fullName === 'ticker.standard') return `ctx.tickerStandard(${posArgs.join(', ')})`;
      if (fullName === 'ticker.heikinashi') return `ctx.tickerHeikinashi(${posArgs.join(', ')})`;
      if (fullName === 'ticker.renko') return `ctx.tickerRenko(${posArgs.join(', ')})`;
      if (fullName === 'ticker.kagi') return `ctx.tickerKagi(${posArgs.join(', ')})`;
      if (fullName === 'ticker.linebreak') return `ctx.tickerLinebreak(${posArgs.join(', ')})`;
      if (fullName === 'ticker.pointfigure') return `ctx.tickerPointfigure(${posArgs.join(', ')})`;
      return `ctx.tickerNew(${posArgs.join(', ')})`;
    }

    // Drawing functions — delegate to context
    if (namespace === 'label' || namespace === 'line' || namespace === 'box' ||
        namespace === 'polyline' || namespace === 'linefill' || namespace === 'table') {
      const namedObj = emitNamedArgsObj(expr.arguments);
      return `ctx.callBuiltin("${fullName}", [${posArgs.join(', ')}], ${namedObj})`;
    }

    // Matrix functions
    if (namespace === 'matrix') {
      const mapped = MATRIX_FUNC_MAP[fullName];
      if (mapped) return `deps._mtx.${mapped}(${posArgs.join(', ')})`;
      return `deps._mtx.${fullName.replace('matrix.', '')}(${posArgs.join(', ')})`;
    }

    // Request.security
    if (fullName === 'request.security' || fullName === 'security') {
      const secSite = ctx.securitySites.find((s) => s.node === expr);
      if (secSite) {
        const symExpr = emitExpr(secSite.symbolExpr);
        const tfExpr = emitExpr(secSite.timeframeExpr);
        const gapsExpr = secSite.gapsExpr ? emitExpr(secSite.gapsExpr) : '"barmerge.gaps_off"';
        const laExpr = secSite.lookaheadExpr ? emitExpr(secSite.lookaheadExpr) : '"barmerge.lookahead_off"';
        return `ctx.requestSecurity(${secSite.id}, ${symExpr}, ${tfExpr}, ${gapsExpr}, ${laExpr})`;
      }
    }

    // Plot functions
    if (PLOT_FUNCTIONS.has(fullName)) {
      return emitPlotCall(fullName, expr);
    }

    // Input functions
    if (namespace === 'input') {
      return emitInputCall(fullName, expr);
    }

    // Alert
    if (fullName === 'alert') return `ctx.alert(${posArgs.join(', ')})`;
    if (fullName === 'alertcondition') return `ctx.alertCondition(${posArgs.join(', ')})`;

    // Log
    if (fullName === 'log.info') return `ctx.logInfo(${posArgs.join(', ')})`;
    if (fullName === 'log.warning') return `ctx.logWarning(${posArgs.join(', ')})`;
    if (fullName === 'log.error') return `ctx.logError(${posArgs.join(', ')})`;

    // Runtime
    if (fullName === 'runtime.error') return `ctx.runtimeError(${posArgs.join(', ')})`;

    // Strategy functions
    if (fullName === 'strategy.entry') return emitStrategyCall('entry', expr);
    if (fullName === 'strategy.exit') return emitStrategyCall('exit', expr);
    if (fullName === 'strategy.close') return emitStrategyCall('close', expr);
    if (fullName === 'strategy.close_all') return emitStrategyCall('closeAll', expr);
    if (fullName === 'strategy.cancel') return emitStrategyCall('cancel', expr);
    if (fullName === 'strategy.cancel_all') return emitStrategyCall('cancelAll', expr);
    if (fullName === 'strategy.order') return emitStrategyCall('order', expr);

    // Strategy risk
    if (namespace === 'strategy' && expr.callee.type === 'MemberExpression') {
      const prop = expr.callee.property.name;
      if (prop === 'risk') return 'undefined';
    }

    // UDT constructor: MyType.new(field1=val1, ...)
    if (namespace && ctx.typeDecls.has(namespace) && expr.callee.type === 'MemberExpression' && expr.callee.property.name === 'new') {
      return emitUdtConstructor(namespace, expr);
    }

    // User-defined function
    if (ctx.funcInfos.has(fullName)) {
      return `this._fn_${fullName}(${posArgs.join(', ')})`;
    }

    return `ctx.callBuiltin("${fullName}", [${posArgs.join(', ')}])`;
  }

  function emitUdtConstructor(typeName: string, expr: CallExpression): string {
    const typeInfo = ctx.typeDecls.get(typeName)!;
    const namedArgs = new Map<string, string>();
    const positionalArgs: string[] = [];
    for (const arg of expr.arguments) {
      if (arg.name) {
        namedArgs.set(arg.name.name, emitExpr(arg.value));
      } else {
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

  function emitTACall(site: TACallSite, _expr: CallExpression): string {
    const args = site.computeArgExprs.map(emitExpr);
    const member = `this.${site.memberName}`;

    if (site.className === 'ATR') {
      return `(ctx.isFirstTick ? ${member}.compute(ctx.bar.high, ctx.bar.low, ctx.bar.close) : ${member}.recompute(ctx.bar.high, ctx.bar.low, ctx.bar.close))`;
    }

    const argStr = args.join(', ');
    return `(ctx.isFirstTick ? ${member}.compute(${argStr}) : ${member}.recompute(${argStr}))`;
  }

  function emitNamedArgsObj(args: { name?: Identifier; value: Expression }[]): string {
    const entries = args.filter((a) => a.name).map((a) => `${a.name!.name}: ${emitExpr(a.value)}`);
    return entries.length > 0 ? `{${entries.join(', ')}}` : '{}';
  }

  function emitPlotCall(funcName: string, expr: CallExpression): string {
    const site = ctx.plotSites.find((p) => p.node === expr);
    const idx = site?.index ?? 0;
    const posArgs = expr.arguments.filter((a) => !a.name).map((a) => emitExpr(a.value));
    const namedObj = emitNamedArgsObj(expr.arguments);
    return `ctx.plot(${idx}, "${funcName}", ${posArgs[0] ?? 'NaN'}, ${namedObj}, [${posArgs.slice(1).join(', ')}])`;
  }

  function emitInputCall(funcName: string, expr: CallExpression): string {
    const site = ctx.inputSites.find((s) => s.node === expr);
    const id = site?.id ?? 'unknown';
    const posArgs = expr.arguments.filter((a) => !a.name).map((a) => emitExpr(a.value));
    const namedObj = emitNamedArgsObj(expr.arguments);
    return `ctx.input("${id}", "${funcName}", ${posArgs[0] ?? 'NaN'}, ${namedObj}, [${posArgs.slice(1).join(', ')}])`;
  }

  function emitStrategyCall(method: string, expr: CallExpression): string {
    const posArgs = expr.arguments.filter((a) => !a.name).map((a) => emitExpr(a.value));
    const namedObj = emitNamedArgsObj(expr.arguments);
    return `ctx.strategy${method.charAt(0).toUpperCase() + method.slice(1)}(${posArgs.join(', ')}, ${namedObj})`;
  }

  function emitArrayCall(fullName: string, expr: CallExpression): string {
    const posArgs = expr.arguments.filter((a) => !a.name).map((a) => emitExpr(a.value));
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
    return 'NaN';
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
        lines.push(`${pad}${emitExpr(stmt.expression)};`);
        break;
      case 'IfStatement':
        emitIf(stmt, depth);
        break;
      case 'ForStatement':
        emitFor(stmt, depth);
        break;
      case 'WhileStatement':
        emitWhile(stmt, depth);
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

  function emitVarDecl(stmt: VariableDeclaration, depth: number): void {
    const pad = indent(depth);
    if (stmt.names.type === 'TupleDeclarator') {
      if (stmt.init.type === 'IfStatement') return;
      const rhs = emitExpr(stmt.init);
      const tmpVar = `_tup_${stmt.names.names.map((n) => n.name).join('_')}`;
      lines.push(`${pad}const ${tmpVar} = ${rhs};`);
      for (let i = 0; i < stmt.names.names.length; i++) {
        const name = stmt.names.names[i].name;
        if (ctx.seriesVars.has(name)) {
          lines.push(`${pad}this._sv_${name}.push(${tmpVar}[${i}]);`);
        } else {
          lines.push(`${pad}let ${name} = ${tmpVar}[${i}];`);
        }
      }
      return;
    }

    const name = stmt.names.name.name;

    if (stmt.kind === 'var' || stmt.kind === 'varip') {
      if (stmt.init.type === 'IfStatement') {
        lines.push(`${pad}if (ctx.barIndex === 0) {`);
        lines.push(`${pad}  this._v_${name} = NaN;`);
        emitIf(stmt.init, depth + 1, `this._v_${name}`);
        lines.push(`${pad}}`);
      } else {
        lines.push(`${pad}if (ctx.barIndex === 0) this._v_${name} = ${emitExpr(stmt.init)};`);
      }
      return;
    }

    // Regular variable
    if (stmt.init.type === 'IfStatement') {
      lines.push(`${pad}let ${name} = NaN;`);
      emitIf(stmt.init, depth, name);
      if (ctx.seriesVars.has(name)) {
        lines.push(`${pad}this._sv_${name}.push(${name});`);
      }
      return;
    }

    const rhs = emitExpr(stmt.init);

    const taSite = stmt.init.type === 'CallExpression' ? ctx.taCallSiteMap.get(stmt.init) : null;
    if (taSite?.returnsTuple && stmt.names.type === 'VariableDeclarator') {
      lines.push(`${pad}const ${name} = ${rhs};`);
      return;
    }

    if (ctx.seriesVars.has(name)) {
      lines.push(`${pad}this._sv_${name}.push(${rhs});`);
    } else {
      lines.push(`${pad}let ${name} = ${rhs};`);
    }
  }

  function emitAssignment(stmt: AssignmentStatement, depth: number): void {
    const pad = indent(depth);
    if (stmt.right.type === 'IfStatement') {
      const target = stmt.left.type === 'Identifier' ? emitIdentifier(stmt.left) : emitExpr(stmt.left);
      emitIf(stmt.right, depth, target);
      return;
    }

    const rhs = emitExpr(stmt.right);

    if (stmt.left.type === 'Identifier') {
      const name = stmt.left.name;
      if (ctx.seriesVars.has(name)) {
        if (stmt.operator === ':=') {
          lines.push(`${pad}this._sv_${name}.update(${rhs});`);
        } else {
          const op = stmt.operator.charAt(0);
          lines.push(`${pad}this._sv_${name}.update(this._sv_${name}.get(0) ${op} ${rhs});`);
        }
        return;
      }
      if (ctx.varDecls.some((v) => v.name === name)) {
        if (stmt.operator === ':=') {
          lines.push(`${pad}this._v_${name} = ${rhs};`);
        } else {
          lines.push(`${pad}this._v_${name} ${stmt.operator} ${rhs};`);
        }
        return;
      }
      if (stmt.operator === ':=') {
        lines.push(`${pad}${name} = ${rhs};`);
      } else {
        lines.push(`${pad}${name} ${stmt.operator} ${rhs};`);
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
      return;
    }
    lines.push(`${pad}${emitExpr(stmt.left)} ${stmt.operator === ':=' ? '=' : stmt.operator} ${rhs};`);
  }

  function emitTupleAssignment(stmt: TupleAssignment, depth: number): void {
    const pad = indent(depth);
    const rhs = emitExpr(stmt.right);
    const tmpVar = `_tup_${stmt.names.map((n) => n.name).join('_')}`;
    lines.push(`${pad}const ${tmpVar} = ${rhs};`);
    for (let i = 0; i < stmt.names.length; i++) {
      const name = stmt.names[i].name;
      if (ctx.seriesVars.has(name)) {
        lines.push(`${pad}this._sv_${name}.update(${tmpVar}[${i}]);`);
      } else if (ctx.varDecls.some((v) => v.name === name)) {
        lines.push(`${pad}this._v_${name} = ${tmpVar}[${i}];`);
      } else {
        lines.push(`${pad}${name} = ${tmpVar}[${i}];`);
      }
    }
  }

  function emitIf(stmt: IfStatement, depth: number, assignTarget?: string): void {
    const pad = indent(depth);
    lines.push(`${pad}if (_isTruthy(${emitExpr(stmt.test)})) {`);
    if (assignTarget && stmt.consequent.length > 0) {
      const lastStmt = stmt.consequent[stmt.consequent.length - 1];
      for (let i = 0; i < stmt.consequent.length - 1; i++) {
        emitStmt(stmt.consequent[i], depth + 1);
      }
      if (lastStmt.type === 'ExpressionStatement') {
        lines.push(`${indent(depth + 1)}${assignTarget} = ${emitExpr(lastStmt.expression)};`);
      } else {
        emitStmt(lastStmt, depth + 1);
      }
    } else {
      for (const s of stmt.consequent) emitStmt(s, depth + 1);
    }
    if (stmt.alternate) {
      if (Array.isArray(stmt.alternate)) {
        lines.push(`${pad}} else {`);
        if (assignTarget && stmt.alternate.length > 0) {
          const lastStmt = stmt.alternate[stmt.alternate.length - 1];
          for (let i = 0; i < stmt.alternate.length - 1; i++) {
            emitStmt(stmt.alternate[i], depth + 1);
          }
          if (lastStmt.type === 'ExpressionStatement') {
            lines.push(`${indent(depth + 1)}${assignTarget} = ${emitExpr(lastStmt.expression)};`);
          } else {
            emitStmt(lastStmt, depth + 1);
          }
        } else {
          for (const s of stmt.alternate) emitStmt(s, depth + 1);
        }
        lines.push(`${pad}}`);
      } else {
        lines.push(`${pad}} else`);
        emitIf(stmt.alternate, depth, assignTarget);
      }
    } else {
      lines.push(`${pad}}`);
    }
  }

  function emitFor(stmt: ForStatement, depth: number): void {
    const pad = indent(depth);
    if (stmt.kind === 'numeric') {
      const counter = stmt.counter.name;
      const start = emitExpr(stmt.start);
      const end = emitExpr(stmt.end);
      const step = stmt.step ? emitExpr(stmt.step) : '1';
      lines.push(`${pad}for (let ${counter} = ${start}, _end = ${end}, _step = ${step}, _iter = 0; _step > 0 ? ${counter} <= _end : ${counter} >= _end; ${counter} += _step, _iter++) {`);
      lines.push(`${indent(depth + 1)}if (_iter >= ${ITERATION_CAP}) break;`);
      for (const s of stmt.body) emitStmt(s, depth + 1);
      lines.push(`${pad}}`);
    } else {
      const counter = stmt.counter.name;
      const iterable = emitExpr(stmt.iterable);
      const iterVar = `_iter_${counter}`;
      if (stmt.indexCounter) {
        const entriesVar = `_entries_${counter}`;
        lines.push(`${pad}{ const ${iterVar} = ${iterable}; const ${entriesVar} = _iterEntries(${iterVar});`);
        lines.push(`${pad}for (let _i = 0; _i < ${entriesVar}.length && _i < ${ITERATION_CAP}; _i++) {`);
        lines.push(`${indent(depth + 1)}let ${stmt.indexCounter.name} = ${entriesVar}[_i][0];`);
        lines.push(`${indent(depth + 1)}let ${counter} = ${entriesVar}[_i][1];`);
      } else {
        lines.push(`${pad}{ const ${iterVar} = ${iterable}; for (let _i = 0; _i < _iterSize(${iterVar}) && _i < ${ITERATION_CAP}; _i++) {`);
        lines.push(`${indent(depth + 1)}let ${counter} = _iterGet(${iterVar}, _i);`);
      }
      for (const s of stmt.body) emitStmt(s, depth + 1);
      lines.push(`${pad}}}`)
    }
  }

  function emitWhile(stmt: WhileStatement, depth: number): void {
    const pad = indent(depth);
    lines.push(`${pad}for (let _iter = 0; _iter < ${ITERATION_CAP} && _isTruthy(${emitExpr(stmt.test)}); _iter++) {`);
    for (const s of stmt.body) emitStmt(s, depth + 1);
    lines.push(`${pad}}`);
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
    lines.push(`    this._sv_${name} = new deps.NumericSeries(deps.maxBarsBack);`);
  }

  // Var/varip
  for (const v of ctx.varDecls) {
    lines.push(`    this._v_${v.name} = NaN;`);
  }

  // TA members
  for (const site of ctx.taCallSites) {
    const argsStr = site.ctorArgs.map((a) => JSON.stringify(a)).join(', ');
    lines.push(`    this.${site.memberName} = new deps.${site.className}(${argsStr});`);
  }

  // Placeholder for fixnan members (filled after body emission)
  const fixnanPlaceholderIdx = lines.length;
  lines.push('  }');

  // User-defined functions
  for (const [name, fi] of ctx.funcInfos) {
    lines.push(`  _fn_${name}(${fi.params.join(', ')}) {`);
    if (Array.isArray(fi.body)) {
      for (const s of fi.body) emitStmt(s, 2);
    } else {
      lines.push(`    return ${emitExpr(fi.body)};`);
    }
    lines.push('  }');
  }

  // onBar method
  lines.push('  onBar(ctx) {');

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
    lines.push(`      _sv_${name}: this._sv_${name}.save(),`);
  }
  for (const v of ctx.varDecls) {
    lines.push(`      _v_${v.name}: this._v_${v.name},`);
  }
  for (const site of ctx.taCallSites) {
    lines.push(`      ${site.memberName}: this.${site.memberName}.save(),`);
  }
  for (let i = 0; i < fixnanIndex; i++) {
    lines.push(`      _fixnan_${i}: this._fixnan_${i},`);
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
    lines.push(`    this._sv_${name}.restore(snap._sv_${name});`);
  }
  for (const v of ctx.varDecls) {
    if (v.kind !== 'varip') {
      lines.push(`    this._v_${v.name} = snap._v_${v.name};`);
    }
  }
  for (const site of ctx.taCallSites) {
    lines.push(`    this.${site.memberName}.restore(snap.${site.memberName});`);
  }
  for (let i = 0; i < fixnanIndex; i++) {
    lines.push(`    this._fixnan_${i} = snap._fixnan_${i};`);
  }
  lines.push('  }');

  lines.push('};');

  return lines.join('\n');
}

export const RUNTIME_HELPERS = `
function _isNa(v) { return v !== v || v === undefined || v === null; }
function _isTruthy(v) { return v !== false && v !== 0 && !_isNa(v); }
function _eq(a, b) { return _isNa(a) || _isNa(b) ? false : a === b; }
function _neq(a, b) { return _isNa(a) || _isNa(b) ? true : a !== b; }
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
function _getField(obj, name) {
  if (obj && obj.__tealscriptUdt) return deps._udt.getField(obj, name);
  if (obj && typeof obj === 'object') return obj[name];
  return undefined;
}
function _setField(obj, name, val) {
  if (obj && obj.__tealscriptUdt) { deps._udt.setField(obj, name, val); return; }
  if (obj && typeof obj === 'object') obj[name] = val;
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
