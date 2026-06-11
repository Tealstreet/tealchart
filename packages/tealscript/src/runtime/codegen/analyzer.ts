import type {
  Program, Statement, Expression,
  IndicatorDeclaration,
  IfStatement,
  CallExpression,
  CallArgument,
} from '../../parser/ast';

export interface TACallSite {
  memberName: string;
  className: string;
  ctorArgs: unknown[];
  computeArgExprs: Expression[];
  returnsTuple: boolean;
  tupleFields?: string[];
  node: CallExpression;
}

export interface VarDeclInfo {
  name: string;
  kind: 'var' | 'varip';
  initExpr: Expression | IfStatement;
}

export interface InputCallSite {
  id: string;
  funcName: string;
  node: CallExpression;
}

export interface PlotCallSite {
  index: number;
  funcName: string;
  node: CallExpression;
}

export interface FuncInfo {
  name: string;
  params: string[];
  body: Expression | Statement[];
  hasTACalls: boolean;
  hasSeriesVars: boolean;
  callSiteCount: number;
}

export interface DeclarationInfo {
  kind: 'indicator' | 'strategy';
  title: string;
  node: IndicatorDeclaration;
}

export interface AnalysisContext {
  seriesVars: Set<string>;
  taCallSites: TACallSite[];
  taCallSiteMap: Map<CallExpression, TACallSite>;
  varDecls: VarDeclInfo[];
  funcInfos: Map<string, FuncInfo>;
  declarationInfo: DeclarationInfo | null;
  inputSites: InputCallSite[];
  plotSites: PlotCallSite[];
  unsupported: string[];
  barFieldSeriesVars: Set<string>;
}

const BAR_FIELDS = new Set([
  'open', 'high', 'low', 'close', 'volume',
  'time', 'time_close', 'timenow',
  'hl2', 'hlc3', 'ohlc4', 'hlcc4',
]);

const TA_CLASS_MAP: Record<string, { className: string; returnsTuple: boolean; tupleFields?: string[] }> = {
  'ta.sma': { className: 'SMA', returnsTuple: false },
  'ta.ema': { className: 'EMA', returnsTuple: false },
  'ta.rma': { className: 'RMA', returnsTuple: false },
  'ta.rsi': { className: 'RSI', returnsTuple: false },
  'ta.crossover': { className: 'Crossover', returnsTuple: false },
  'ta.crossunder': { className: 'Crossunder', returnsTuple: false },
  'ta.change': { className: 'Change', returnsTuple: false },
  'ta.highest': { className: 'Highest', returnsTuple: false },
  'ta.lowest': { className: 'Lowest', returnsTuple: false },
  'ta.macd': { className: 'MACD', returnsTuple: true, tupleFields: ['macdLine', 'signalLine', 'histogram'] },
  'ta.atr': { className: 'ATR', returnsTuple: false },
  'ta.stoch': { className: 'Stoch', returnsTuple: false },
  'ta.bb': { className: 'BB', returnsTuple: true, tupleFields: ['middle', 'upper', 'lower'] },
  'ta.dema': { className: 'DEMA', returnsTuple: false },
  'ta.tema': { className: 'TEMA', returnsTuple: false },
  'ta.cum': { className: 'Cum', returnsTuple: false },
  'ta.stdev': { className: 'StdDev', returnsTuple: false },
};

const UNSUPPORTED_NAMESPACES = new Set([
  'request', 'label', 'line', 'box', 'polyline', 'linefill', 'table',
  'array', 'matrix', 'map', 'ticker',
]);

const PLOT_FUNCTIONS = new Set([
  'plot', 'plotshape', 'plotchar', 'plotarrow', 'plotbar', 'plotcandle',
  'bgcolor', 'barcolor', 'hline', 'fill',
]);

function resolveCallee(callee: Expression): { funcName: string; namespace?: string; fullName: string } {
  if (callee.type === 'Identifier') {
    return { funcName: callee.name, fullName: callee.name };
  }
  if (callee.type === 'MemberExpression' && callee.object.type === 'Identifier') {
    const ns = callee.object.name;
    const fn = callee.property.name;
    return { funcName: fn, namespace: ns, fullName: `${ns}.${fn}` };
  }
  if (callee.type === 'MemberExpression' && callee.object.type === 'MemberExpression') {
    const parts: string[] = [];
    let cur: Expression = callee;
    while (cur.type === 'MemberExpression') {
      parts.unshift(cur.property.name);
      cur = cur.object;
    }
    if (cur.type === 'Identifier') {
      parts.unshift(cur.name);
    }
    const fullName = parts.join('.');
    return { funcName: parts[parts.length - 1], namespace: parts.slice(0, -1).join('.'), fullName };
  }
  return { funcName: '', fullName: '' };
}

function extractStaticNumber(expr: Expression): number | null {
  if (expr.type === 'NumericLiteral') return expr.value;
  if (expr.type === 'UnaryExpression' && expr.operator === '-' && expr.argument.type === 'NumericLiteral') {
    return -expr.argument.value;
  }
  return null;
}

export function analyze(ast: Program): AnalysisContext {
  const ctx: AnalysisContext = {
    seriesVars: new Set(),
    taCallSites: [],
    taCallSiteMap: new Map(),
    varDecls: [],
    funcInfos: new Map(),
    declarationInfo: null,
    inputSites: [],
    plotSites: [],
    unsupported: [],
    barFieldSeriesVars: new Set(),
  };

  let taIndex = 0;
  let plotIndex = 0;
  const functionBodies = new Map<string, Expression | Statement[]>();

  function walkExpr(expr: Expression): void {
    switch (expr.type) {
      case 'IndexExpression': {
        walkExpr(expr.index);
        walkExpr(expr.object);
        if (expr.object.type === 'Identifier') {
          const name = expr.object.name;
          if (BAR_FIELDS.has(name)) {
            ctx.barFieldSeriesVars.add(name);
          } else {
            ctx.seriesVars.add(name);
          }
        }
        break;
      }
      case 'CallExpression': {
        const { fullName, namespace } = resolveCallee(expr.callee);

        if (namespace && UNSUPPORTED_NAMESPACES.has(namespace)) {
          const msg = `${namespace}.* not yet supported by transpiler`;
          if (!ctx.unsupported.includes(msg)) ctx.unsupported.push(msg);
        }

        if (fullName in TA_CLASS_MAP) {
          const info = TA_CLASS_MAP[fullName];
          const site: TACallSite = {
            memberName: `_ta_${info.className.toLowerCase()}_${taIndex++}`,
            className: info.className,
            ctorArgs: extractCtorArgs(fullName, expr.arguments),
            computeArgExprs: extractComputeArgs(fullName, expr.arguments),
            returnsTuple: info.returnsTuple,
            tupleFields: info.tupleFields,
            node: expr,
          };
          ctx.taCallSites.push(site);
          ctx.taCallSiteMap.set(expr, site);
        }

        if (namespace === 'input') {
          const argName = getNamedArgString(expr.arguments, 'title')
            ?? getPositionalArgString(expr.arguments, fullName === 'input.source' ? 1 : 0);
          ctx.inputSites.push({
            id: argName ?? `input_${ctx.inputSites.length}`,
            funcName: fullName,
            node: expr,
          });
        }

        if (PLOT_FUNCTIONS.has(fullName)) {
          ctx.plotSites.push({
            index: plotIndex++,
            funcName: fullName,
            node: expr,
          });
        }

        if (ctx.funcInfos.has(fullName)) {
          const fi = ctx.funcInfos.get(fullName)!;
          fi.callSiteCount++;
        }

        for (const arg of expr.arguments) {
          walkExpr(arg.value);
        }
        if (expr.callee.type === 'MemberExpression') {
          walkExpr(expr.callee);
        }
        break;
      }
      case 'BinaryExpression':
        walkExpr(expr.left);
        walkExpr(expr.right);
        break;
      case 'UnaryExpression':
        walkExpr(expr.argument);
        break;
      case 'ConditionalExpression':
        walkExpr(expr.test);
        walkExpr(expr.consequent);
        walkExpr(expr.alternate);
        break;
      case 'SwitchExpression':
        if (expr.discriminant) walkExpr(expr.discriminant);
        for (const c of expr.cases) {
          if (c.test) walkExpr(c.test);
          if (Array.isArray(c.consequent)) {
            for (const s of c.consequent) walkStmt(s);
          } else {
            walkExpr(c.consequent);
          }
        }
        break;
      case 'MemberExpression':
        walkExpr(expr.object);
        break;
      case 'ArrayExpression':
        for (const el of expr.elements) walkExpr(el);
        break;
      case 'LambdaExpression': {
        const msg = 'Lambda expressions not yet supported by transpiler';
        if (!ctx.unsupported.includes(msg)) ctx.unsupported.push(msg);
        walkExpr(expr.body);
        break;
      }
      case 'ForStatement':
      case 'WhileStatement':
        walkStmt(expr as unknown as Statement);
        break;
      case 'Identifier':
      case 'NumericLiteral':
      case 'StringLiteral':
      case 'BooleanLiteral':
      case 'ColorLiteral':
      case 'NaExpression':
        break;
    }
  }

  function walkStmt(stmt: Statement): void {
    switch (stmt.type) {
      case 'IndicatorDeclaration': {
        let title = '';
        if (stmt.title.type === 'StringLiteral') title = stmt.title.value;
        ctx.declarationInfo = {
          kind: stmt.declarationKind,
          title,
          node: stmt,
        };
        break;
      }
      case 'VariableDeclaration': {
        if (stmt.kind === 'var' || stmt.kind === 'varip') {
          if (stmt.names.type === 'VariableDeclarator') {
            ctx.varDecls.push({
              name: stmt.names.name.name,
              kind: stmt.kind,
              initExpr: stmt.init,
            });
          }
        }
        if (stmt.init.type === 'IfStatement') {
          walkStmt(stmt.init);
        } else {
          walkExpr(stmt.init);
        }
        break;
      }
      case 'AssignmentStatement':
        if (stmt.right.type === 'IfStatement') {
          walkStmt(stmt.right);
        } else {
          walkExpr(stmt.right);
        }
        if (stmt.left.type !== 'Identifier') {
          walkExpr(stmt.left);
        }
        break;
      case 'TupleAssignment':
        walkExpr(stmt.right);
        break;
      case 'ExpressionStatement':
        walkExpr(stmt.expression);
        break;
      case 'IfStatement':
        walkExpr(stmt.test);
        for (const s of stmt.consequent) walkStmt(s);
        if (stmt.alternate) {
          if (Array.isArray(stmt.alternate)) {
            for (const s of stmt.alternate) walkStmt(s);
          } else {
            walkStmt(stmt.alternate);
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
          const msg = 'Collection for-in loops not yet supported by transpiler';
          if (!ctx.unsupported.includes(msg)) ctx.unsupported.push(msg);
        }
        for (const s of stmt.body) walkStmt(s);
        break;
      case 'WhileStatement':
        walkExpr(stmt.test);
        for (const s of stmt.body) walkStmt(s);
        break;
      case 'FunctionDeclaration': {
        const params = stmt.params.map((p) => p.name);
        functionBodies.set(stmt.name.name, stmt.body);
        ctx.funcInfos.set(stmt.name.name, {
          name: stmt.name.name,
          params,
          body: stmt.body,
          hasTACalls: false,
          hasSeriesVars: false,
          callSiteCount: 0,
        });
        if (Array.isArray(stmt.body)) {
          for (const s of stmt.body) walkStmt(s);
        } else {
          walkExpr(stmt.body);
        }
        break;
      }
      case 'ImportDeclaration': {
        const msg = 'Import declarations not yet supported by transpiler';
        if (!ctx.unsupported.includes(msg)) ctx.unsupported.push(msg);
        break;
      }
      case 'LibraryDeclaration': {
        const msg = 'Library declarations not yet supported by transpiler';
        if (!ctx.unsupported.includes(msg)) ctx.unsupported.push(msg);
        break;
      }
      case 'TypeDeclaration': {
        const msg = 'User-defined types not yet supported by transpiler';
        if (!ctx.unsupported.includes(msg)) ctx.unsupported.push(msg);
        break;
      }
      case 'MultiDeclaration':
        for (const d of stmt.declarations) walkStmt(d);
        break;
      case 'MultiAssignment':
        for (const a of stmt.assignments) walkStmt(a);
        break;
      case 'MultiExpressionStatement':
        for (const e of stmt.expressions) walkExpr(e);
        break;
      case 'EnumDeclaration':
      case 'BreakStatement':
      case 'ContinueStatement':
        break;
    }
  }

  for (const stmt of ast.body) {
    walkStmt(stmt);
  }

  // Mark functions that have TA calls or series vars in their bodies
  for (const [_name, fi] of ctx.funcInfos) {
    fi.hasTACalls = ctx.taCallSites.some((site) => containsNode(fi.body, site.node));
    fi.hasSeriesVars = hasSeriesAccess(fi.body, ctx.seriesVars);
  }

  return ctx;
}

function containsNode(body: Expression | Statement[], target: CallExpression): boolean {
  const json = JSON.stringify(body);
  const targetJson = JSON.stringify(target);
  return json.includes(targetJson);
}

function hasSeriesAccess(body: Expression | Statement[], seriesVars: Set<string>): boolean {
  const json = JSON.stringify(body);
  for (const name of seriesVars) {
    if (json.includes(`"name":"${name}"`)) return true;
  }
  return false;
}

function getNamedArgString(args: CallArgument[], name: string): string | null {
  for (const arg of args) {
    if (arg.name?.name === name && arg.value.type === 'StringLiteral') {
      return arg.value.value;
    }
  }
  return null;
}

function getPositionalArgString(args: CallArgument[], index: number): string | null {
  let posIndex = 0;
  for (const arg of args) {
    if (!arg.name) {
      if (posIndex === index && arg.value.type === 'StringLiteral') {
        return arg.value.value;
      }
      posIndex++;
    }
  }
  return null;
}

function extractCtorArgs(fullName: string, args: CallArgument[]): unknown[] {
  const positional = args.filter((a) => !a.name).map((a) => a.value);
  switch (fullName) {
    case 'ta.sma':
    case 'ta.ema':
    case 'ta.rma':
    case 'ta.rsi':
    case 'ta.highest':
    case 'ta.lowest':
    case 'ta.stdev':
    case 'ta.dema':
    case 'ta.tema':
    case 'ta.atr': {
      const lengthExpr = args.find((a) => a.name?.name === 'length')?.value ?? positional[1];
      if (lengthExpr) {
        const v = extractStaticNumber(lengthExpr);
        if (v !== null) return [v];
      }
      return [];
    }
    case 'ta.macd': {
      const fast = extractStaticNumber(args.find((a) => a.name?.name === 'fastlen')?.value ?? positional[1]);
      const slow = extractStaticNumber(args.find((a) => a.name?.name === 'slowlen')?.value ?? positional[2]);
      const sig = extractStaticNumber(args.find((a) => a.name?.name === 'siglen')?.value ?? positional[3]);
      if (fast !== null && slow !== null && sig !== null) return [fast, slow, sig];
      return [];
    }
    case 'ta.bb': {
      const len = extractStaticNumber(args.find((a) => a.name?.name === 'length')?.value ?? positional[1]);
      const mult = extractStaticNumber(args.find((a) => a.name?.name === 'mult')?.value ?? positional[2]);
      if (len !== null) return mult !== null ? [len, mult] : [len];
      return [];
    }
    case 'ta.stoch': {
      const len = extractStaticNumber(args.find((a) => a.name?.name === 'length')?.value ?? positional[3]);
      if (len !== null) return [len];
      return [];
    }
    case 'ta.change': {
      const len = extractStaticNumber(args.find((a) => a.name?.name === 'length')?.value ?? positional[1]);
      return len !== null ? [len] : [1];
    }
    case 'ta.crossover':
    case 'ta.crossunder':
    case 'ta.cum':
      return [];
    default:
      return [];
  }
}

function extractComputeArgs(fullName: string, args: CallArgument[]): Expression[] {
  const positional = args.filter((a) => !a.name).map((a) => a.value);
  switch (fullName) {
    case 'ta.sma':
    case 'ta.ema':
    case 'ta.rma':
    case 'ta.rsi':
    case 'ta.highest':
    case 'ta.lowest':
    case 'ta.stdev':
    case 'ta.dema':
    case 'ta.tema':
    case 'ta.cum':
      return [args.find((a) => a.name?.name === 'source')?.value ?? positional[0]].filter(Boolean) as Expression[];
    case 'ta.macd':
      return [args.find((a) => a.name?.name === 'source')?.value ?? positional[0]].filter(Boolean) as Expression[];
    case 'ta.bb':
      return [args.find((a) => a.name?.name === 'series')?.value ?? positional[0]].filter(Boolean) as Expression[];
    case 'ta.crossover':
    case 'ta.crossunder': {
      const a = args.find((a) => a.name?.name === 'source1')?.value ?? positional[0];
      const b = args.find((a) => a.name?.name === 'source2')?.value ?? positional[1];
      return [a, b].filter(Boolean) as Expression[];
    }
    case 'ta.change': {
      return [args.find((a) => a.name?.name === 'source')?.value ?? positional[0]].filter(Boolean) as Expression[];
    }
    case 'ta.atr':
      return []; // ATR reads high/low/close from bar directly
    case 'ta.stoch': {
      const src = args.find((a) => a.name?.name === 'source')?.value ?? positional[0];
      const high = args.find((a) => a.name?.name === 'high')?.value ?? positional[1];
      const low = args.find((a) => a.name?.name === 'low')?.value ?? positional[2];
      return [src, high, low].filter(Boolean) as Expression[];
    }
    default:
      return positional;
  }
}
