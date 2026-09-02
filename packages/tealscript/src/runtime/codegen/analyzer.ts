import type {
  Program, Statement, Expression,
  IndicatorDeclaration,
  IfStatement,
  CallExpression,
  CallArgument,
  MemberExpression,
  TypeDeclaration,
  FunctionDeclaration,
  EnumDeclaration,
} from '../../parser/ast';

export interface TACallSite {
  memberName: string;
  className: string;
  ctorArgs: unknown[];
  dynamicCtorArgExprs?: Expression[];
  computeArgExprs: Expression[];
  returnsTuple: boolean;
  tupleFields?: string[];
  node: CallExpression;
}

export interface TAVarSite {
  memberName: string;
  seriesName: string;
  className: string;
  node: MemberExpression;
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
  funcCallIndex: number;
  funcName: string;
  node: CallExpression;
}

export interface FuncInfo {
  name: string;
  params: string[];
  paramDefaults: (Expression | undefined)[];
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

export interface TypeDeclInfo {
  name: string;
  fields: { name: string; defaultExpr: Expression | null; varip: boolean }[];
  node: TypeDeclaration;
}

export interface ImportedMethodOverloadInfo {
  receiverType: string | null;
  internalName: string;
}

export interface SecurityCallSite {
  id: number;
  kind: 'security' | 'security_lower_tf' | 'seed';
  sourceExpr: Expression | null;
  symbolExpr: Expression;
  timeframeExpr: Expression;
  expressionExpr: Expression;
  gapsExpr: Expression | null;
  lookaheadExpr: Expression | null;
  ignoreInvalidSymbolExpr: Expression | null;
  currencyExpr: Expression | null;
  ignoreInvalidTimeframeExpr: Expression | null;
  calcBarsCountExpr: Expression | null;
  taCallSites: TACallSite[];
  node: CallExpression;
  expressionSourceParam?: string;
  expressionCaptureParams?: string[];
  expressionLocalStatements?: Statement[];
}

export interface AnalysisContext {
  pineVersion: number;
  seriesVars: Set<string>;
  taCallSites: TACallSite[];
  taCallSiteMap: Map<CallExpression, TACallSite>;
  taVarSites: TAVarSite[];
  taVarSiteMap: Map<MemberExpression, TAVarSite>;
  varDecls: VarDeclInfo[];
  funcInfos: Map<string, FuncInfo>;
  declarationInfo: DeclarationInfo | null;
  inputSites: InputCallSite[];
  plotSites: PlotCallSite[];
  unsupported: string[];
  barFieldSeriesVars: Set<string>;
  usedBarFields: Set<string>;
  typeDecls: Map<string, TypeDeclInfo>;
  securitySites: SecurityCallSite[];
  capturedParams: Set<string>;
  importedNamespaces: Set<string>;
  importedFunctions: Map<string, string>;
  importedMethods: Map<string, string>;
  importedMethodOverloads: Map<string, ImportedMethodOverloadInfo[]>;
  importedConstants: Map<string, Expression>;
  enumValues: Map<string, string>;
  enumTitles: Map<string, string>;
  importedEnumValues: Map<string, string>;
  importedEnumTitles: Map<string, string>;
}

export interface AnalyzeOptions {
  libraries?: Map<string, Program>;
  capturedParams?: Set<string>;
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
  'ta.smma': { className: 'RMA', returnsTuple: false },
  'ta.rsi': { className: 'RSI', returnsTuple: false },
  'ta.barssince': { className: 'BarsSince', returnsTuple: false },
  'ta.valuewhen': { className: 'ValueWhen', returnsTuple: false },
  'ta.cross': { className: 'Cross', returnsTuple: false },
  'ta.crossover': { className: 'Crossover', returnsTuple: false },
  'ta.crossunder': { className: 'Crossunder', returnsTuple: false },
  'ta.change': { className: 'Change', returnsTuple: false },
  'ta.highest': { className: 'Highest', returnsTuple: false },
  'ta.lowest': { className: 'Lowest', returnsTuple: false },
  'ta.highestbars': { className: 'HighestBars', returnsTuple: false },
  'ta.lowestbars': { className: 'LowestBars', returnsTuple: false },
  'ta.pivothigh': { className: 'PivotHigh', returnsTuple: false },
  'ta.pivotlow': { className: 'PivotLow', returnsTuple: false },
  'ta.range': { className: 'Range', returnsTuple: false },
  'ta.rising': { className: 'Rising', returnsTuple: false },
  'ta.falling': { className: 'Falling', returnsTuple: false },
  'ta.max': { className: 'Max', returnsTuple: false },
  'ta.min': { className: 'Min', returnsTuple: false },
  'ta.variance': { className: 'Variance', returnsTuple: false },
  'ta.dev': { className: 'Dev', returnsTuple: false },
  'ta.covariance': { className: 'Covariance', returnsTuple: false },
  'ta.correlation': { className: 'Correlation', returnsTuple: false },
  'ta.cog': { className: 'COG', returnsTuple: false },
  'ta.median': { className: 'Median', returnsTuple: false },
  'ta.mode': { className: 'Mode', returnsTuple: false },
  'ta.percentile_nearest_rank': { className: 'PercentileNearestRank', returnsTuple: false },
  'ta.percentile_linear_interpolation': { className: 'PercentileLinearInterpolation', returnsTuple: false },
  'ta.percentrank': { className: 'PercentRank', returnsTuple: false },
  'ta.linreg': { className: 'LinReg', returnsTuple: false },
  'ta.macd': { className: 'MACD', returnsTuple: true, tupleFields: ['macdLine', 'signalLine', 'histogram'] },
  'ta.atr': { className: 'ATR', returnsTuple: false },
  'ta.tr': { className: 'TrueRange', returnsTuple: false },
  'ta.stoch': { className: 'Stoch', returnsTuple: false },
  'ta.wma': { className: 'WMA', returnsTuple: false },
  'ta.vwma': { className: 'VWMA', returnsTuple: false },
  'ta.swma': { className: 'SWMA', returnsTuple: false },
  'ta.alma': { className: 'ALMA', returnsTuple: false },
  'ta.hma': { className: 'HMA', returnsTuple: false },
  'ta.mom': { className: 'Mom', returnsTuple: false },
  'ta.roc': { className: 'ROC', returnsTuple: false },
  'ta.cci': { className: 'CCI', returnsTuple: false },
  'ta.cmo': { className: 'CMO', returnsTuple: false },
  'ta.mfi': { className: 'MFI', returnsTuple: false },
  'ta.tsi': { className: 'TSI', returnsTuple: false },
  'ta.rci': { className: 'RCI', returnsTuple: false },
  'ta.wpr': { className: 'WPR', returnsTuple: false },
  'ta.obv': { className: 'OBV', returnsTuple: false },
  'ta.bar_index': { className: 'BarIndex', returnsTuple: false },
  'ta.bb': { className: 'BB', returnsTuple: true, tupleFields: ['middle', 'upper', 'lower'] },
  'ta.bbw': { className: 'BBW', returnsTuple: false },
  'ta.kc': { className: 'KC', returnsTuple: true, tupleFields: ['middle', 'upper', 'lower'] },
  'ta.kcw': { className: 'KCW', returnsTuple: false },
  'ta.dmi': { className: 'DMI', returnsTuple: true, tupleFields: ['plus', 'minus', 'adx'] },
  'ta.adx': { className: 'ADX', returnsTuple: false },
  'ta.supertrend': { className: 'Supertrend', returnsTuple: true, tupleFields: ['supertrend', 'direction'] },
  'ta.sar': { className: 'SAR', returnsTuple: false },
  'ta.kst': { className: 'KST', returnsTuple: true, tupleFields: ['kst', 'signal'] },
  'ta.vwap': { className: 'VWAP', returnsTuple: false },
  'ta.dema': { className: 'DEMA', returnsTuple: false },
  'ta.tema': { className: 'TEMA', returnsTuple: false },
  'ta.cum': { className: 'Cum', returnsTuple: false },
  'ta.stdev': { className: 'StdDev', returnsTuple: false },
};

const TA_VAR_CLASS_MAP: Record<string, string> = {
  'ta.accdist': 'AccumulationDistribution',
  'ta.iii': 'IntradayIntensityIndex',
  'ta.nvi': 'NegativeVolumeIndex',
  'ta.pvi': 'PositiveVolumeIndex',
  'ta.pvt': 'PriceVolumeTrend',
  'ta.wad': 'WilliamsAccumulationDistribution',
  'ta.wvad': 'WilliamsVariableAccumulationDistribution',
};

const DIRECT_TA_FUNCS = new Set([
  'ta.pivot_point_levels',
]);

const LEGACY_GLOBAL_MATH_ALIASES = new Set([
  'abs', 'ceil', 'floor', 'round', 'sqrt',
  'log', 'log10', 'pow', 'sign', 'max', 'min', 'avg', 'sum',
  'sin', 'cos', 'tan', 'asin', 'acos', 'atan', 'exp',
  'toradians', 'todegrees',
]);

function canonicalTACallName(fullName: string): string {
  if (fullName.includes('.') || LEGACY_GLOBAL_MATH_ALIASES.has(fullName)) return fullName;
  const taName = `ta.${fullName}`;
  return taName in TA_CLASS_MAP || DIRECT_TA_FUNCS.has(taName) ? taName : fullName;
}

const REQUIRED_STATIC_TA_CTOR_ARG_COUNTS: Record<string, number> = {
  'ta.sma': 1,
  'ta.ema': 1,
  'ta.rma': 1,
  'ta.smma': 1,
  'ta.rsi': 1,
  'ta.highest': 1,
  'ta.lowest': 1,
  'ta.highestbars': 1,
  'ta.lowestbars': 1,
  'ta.pivothigh': 2,
  'ta.pivotlow': 2,
  'ta.range': 1,
  'ta.rising': 1,
  'ta.falling': 1,
  'ta.variance': 1,
  'ta.dev': 1,
  'ta.covariance': 1,
  'ta.correlation': 1,
  'ta.cog': 1,
  'ta.median': 1,
  'ta.mode': 1,
  'ta.percentile_nearest_rank': 2,
  'ta.percentile_linear_interpolation': 2,
  'ta.percentrank': 1,
  'ta.linreg': 2,
  'ta.stdev': 1,
  'ta.dema': 1,
  'ta.tema': 1,
  'ta.atr': 1,
  'ta.tr': 1,
  'ta.change': 1,
  'ta.stoch': 1,
  'ta.wma': 1,
  'ta.vwma': 1,
  'ta.alma': 3,
  'ta.hma': 1,
  'ta.mom': 1,
  'ta.roc': 1,
  'ta.cci': 1,
  'ta.cmo': 1,
  'ta.mfi': 1,
  'ta.tsi': 2,
  'ta.rci': 1,
  'ta.valuewhen': 1,
  'ta.wpr': 1,
  'ta.macd': 3,
  'ta.bbw': 2,
  'ta.bb': 2,
  'ta.kc': 2,
  'ta.kcw': 2,
  'ta.dmi': 2,
  'ta.adx': 1,
  'ta.supertrend': 2,
  'ta.sar': 3,
  'ta.kst': 9,
  'ta.vwap': 2,
};

const UNSUPPORTED_REQUEST_FUNCS = new Set<string>([]);

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

function orderedCallExprArg(args: CallArgument[], names: readonly string[], index: number): Expression | undefined {
  const named = args.find((arg) => arg.name?.name === names[index])?.value;
  if (named) return named;
  const positional = args.filter((arg) => !arg.name).map((arg) => arg.value);
  const positionalIndex = index - names.slice(0, index).filter((name) => args.some((arg) => arg.name?.name === name)).length;
  return positional[positionalIndex];
}

function extractStaticNumber(expr: Expression | undefined): number | null {
  if (!expr) return null;
  if (expr.type === 'NumericLiteral') return expr.value;
  if (expr.type === 'UnaryExpression' && expr.operator === '-' && expr.argument.type === 'NumericLiteral') {
    return -expr.argument.value;
  }
  return null;
}

function extractStaticBoolean(expr: Expression | undefined): boolean | null {
  if (!expr) return null;
  if (expr.type === 'BooleanLiteral') return expr.value;
  return null;
}

function readOrderedArg(args: CallArgument[], names: string[], name: string, index: number): Expression | undefined {
  const named = args.find((arg) => arg.name?.name === name)?.value;
  if (named) return named;
  const positional = args.filter((arg) => !arg.name).map((arg) => arg.value);
  const positionalIndex = index - names.slice(0, index).filter((param) => args.some((arg) => arg.name?.name === param)).length;
  return positional[positionalIndex];
}

function vwapHasStdevMult(args: CallArgument[]): boolean {
  return Boolean(readOrderedArg(args, ['source', 'anchor', 'stdev_mult'], 'stdev_mult', 2));
}

export function analyze(ast: Program, options: AnalyzeOptions = {}): AnalysisContext {
  const ctx: AnalysisContext = {
    pineVersion: ast.version,
    seriesVars: new Set(),
    taCallSites: [],
    taCallSiteMap: new Map(),
    taVarSites: [],
    taVarSiteMap: new Map(),
    varDecls: [],
    funcInfos: new Map(),
    declarationInfo: null,
    inputSites: [],
    plotSites: [],
    unsupported: [],
    barFieldSeriesVars: new Set(),
    usedBarFields: new Set(),
    typeDecls: new Map(),
    securitySites: [],
    capturedParams: new Set(options.capturedParams ?? []),
    importedNamespaces: new Set(),
    importedFunctions: new Map(),
    importedMethods: new Map(),
    importedMethodOverloads: new Map(),
    importedConstants: new Map(),
    enumValues: new Map(),
    enumTitles: new Map(),
    importedEnumValues: new Map(),
    importedEnumTitles: new Map(),
  };

  let taIndex = 0;
  const taVarSitesByName = new Map<string, TAVarSite>();
  let plotIndex = 0;
  const plotCallCounts = new Map<string, number>();
  const functionBodies = new Map<string, Expression | Statement[]>();
  const registeredImportKeys = new Set<string>();
  let activeFunctionName: string | null = null;
  let activeFunctionParams: Set<string> | null = null;
  let activeFunctionLocals: Set<string> | null = null;
  let activeFunctionPriorLocalStatements: Map<string, Statement> | null = null;

  function addUnsupported(message: string): void {
    if (!ctx.unsupported.includes(message)) ctx.unsupported.push(message);
  }

  function importedExportName(alias: string, exportName: string): string {
    return `${alias}__${exportName}`;
  }

  function importedMethodExportName(alias: string, receiverType: string | null, exportName: string): string {
    return receiverType ? `${alias}__${receiverType}__${exportName}` : importedExportName(alias, exportName);
  }

  function receiverTypeName(fn: FunctionDeclaration): string | null {
    const annotation = fn.params[0]?.typeAnnotation;
    if (!annotation) return null;
    return annotation.baseType === 'udt' ? annotation.name : annotation.baseType;
  }

  function registerFunctionInfo(name: string, fn: FunctionDeclaration): void {
    const params = fn.params.map((p) => p.name);
    const paramDefaults = fn.params.map((p) => p.defaultValue);
    functionBodies.set(name, fn.body);
    ctx.funcInfos.set(name, {
      name,
      params,
      paramDefaults,
      body: fn.body,
      hasTACalls: false,
      hasSeriesVars: false,
      callSiteCount: 0,
    });
  }

  function walkFunctionBody(name: string, params: string[], body: Expression | Statement[]): void {
    const previousFunctionName = activeFunctionName;
    const previousFunctionParams = activeFunctionParams;
    const previousFunctionLocals = activeFunctionLocals;
    const previousFunctionPriorLocalStatements = activeFunctionPriorLocalStatements;
    activeFunctionName = name;
    activeFunctionParams = new Set(params);
    activeFunctionLocals = Array.isArray(body) ? collectFunctionLocalNames(body) : new Set();
    activeFunctionPriorLocalStatements = new Map();
    try {
      if (Array.isArray(body)) {
        for (const s of body) walkStmt(s);
      } else {
        walkExpr(body);
      }
    } finally {
      activeFunctionName = previousFunctionName;
      activeFunctionParams = previousFunctionParams;
      activeFunctionLocals = previousFunctionLocals;
      activeFunctionPriorLocalStatements = previousFunctionPriorLocalStatements;
    }
  }

  function collectFunctionLocalNames(body: Statement[]): Set<string> {
    const locals = new Set<string>();
    const visitStmt = (stmt: Statement): void => {
      if (stmt.type === 'VariableDeclaration') {
        if (stmt.names.type === 'VariableDeclarator') {
          locals.add(stmt.names.name.name);
        } else {
          for (const name of stmt.names.names) {
            if (name.name !== '_') locals.add(name.name);
          }
        }
        if (stmt.init.type === 'IfStatement') visitStmt(stmt.init);
        return;
      }
      if (stmt.type === 'IfStatement') {
        for (const child of stmt.consequent) visitStmt(child);
        if (Array.isArray(stmt.alternate)) {
          for (const child of stmt.alternate) visitStmt(child);
        } else if (stmt.alternate) {
          visitStmt(stmt.alternate);
        }
        return;
      }
      if (stmt.type === 'OnceStatement') {
        for (const child of stmt.body) visitStmt(child);
      }
    };
    for (const stmt of body) visitStmt(stmt);
    return locals;
  }

  function collectReferencedNames(node: Expression | Statement[], names: Set<string>): Set<string> {
    const found = new Set<string>();
    const visit = (value: unknown): void => {
      if (!value || typeof value !== 'object') return;
      if ((value as { type?: unknown }).type === 'Identifier') {
        const name = (value as { name?: unknown }).name;
        if (typeof name === 'string' && names.has(name)) found.add(name);
      }
      for (const child of Object.values(value)) {
        if (Array.isArray(child)) {
          for (const item of child) visit(item);
        } else {
          visit(child);
        }
      }
    };
    visit(node);
    return found;
  }

  function activeRequestCaptureNames(): Set<string> {
    return new Set([
      ...(activeFunctionParams ?? []),
      ...(activeFunctionLocals ?? []),
    ]);
  }

  function localDeclarationNames(stmt: Statement): string[] {
    if (stmt.type !== 'VariableDeclaration') return [];
    if (stmt.names.type === 'VariableDeclarator') return [stmt.names.name.name];
    return stmt.names.names.map((name) => name.name).filter((name) => name !== '_');
  }

  function registerPriorLocalStatement(stmt: Statement): void {
    if (!activeFunctionPriorLocalStatements || stmt.type !== 'VariableDeclaration') return;
    if (stmt.kind === 'var' || stmt.kind === 'varip') return;
    if (stmt.init.type === 'IfStatement') return;
    for (const name of localDeclarationNames(stmt)) {
      activeFunctionPriorLocalStatements.set(name, stmt);
    }
  }

  function collectRequestCaptures(expression: Expression): { params: string[]; locals: Statement[] } {
    if (!activeFunctionName) return { params: [], locals: [] };
    const params = activeFunctionParams ?? new Set<string>();
    const localStatements = activeFunctionPriorLocalStatements ?? new Map<string, Statement>();
    const pending = [...collectReferencedNames(expression, activeRequestCaptureNames())];
    const paramNames = new Set<string>();
    const localNames = new Set<string>();

    while (pending.length > 0) {
      const name = pending.pop()!;
      if (params.has(name)) {
        paramNames.add(name);
        continue;
      }
      const stmt = localStatements.get(name);
      if (!stmt || localNames.has(name)) continue;
      for (const localName of localDeclarationNames(stmt)) localNames.add(localName);
      if (stmt.type === 'VariableDeclaration' && stmt.init.type !== 'IfStatement') {
        for (const dependency of collectReferencedNames(stmt.init, activeRequestCaptureNames())) {
          if (!paramNames.has(dependency) && !localNames.has(dependency)) pending.push(dependency);
        }
      }
    }

    const locals: Statement[] = [];
    const seen = new Set<Statement>();
    for (const stmt of localStatements.values()) {
      if (seen.has(stmt)) continue;
      if (localDeclarationNames(stmt).some((name) => localNames.has(name))) {
        locals.push(stmt);
        seen.add(stmt);
      }
    }
    return { params: [...paramNames].sort(), locals };
  }

  function registerImportedLibrary(stmt: Extract<Statement, { type: 'ImportDeclaration' }>): void {
    const importKey = `${stmt.alias.name}\u0000${stmt.path}`;
    if (registeredImportKeys.has(importKey)) return;
    registeredImportKeys.add(importKey);

    const libraryAst = options.libraries?.get(stmt.path);
    if (!libraryAst) {
      addUnsupported('Import declarations not yet supported by transpiler');
      return;
    }

    for (const libraryStmt of libraryAst.body) {
      if (libraryStmt.type === 'ImportDeclaration') registerImportedLibrary(libraryStmt);
    }

    ctx.importedNamespaces.add(stmt.alias.name);
    for (const libraryStmt of libraryAst.body) {
      if (libraryStmt.type === 'FunctionDeclaration' && libraryStmt.exported) {
        if (libraryStmt.isMethod) {
          const receiverType = receiverTypeName(libraryStmt);
          const internalName = importedMethodExportName(stmt.alias.name, receiverType, libraryStmt.name.name);
          ctx.importedMethods.set(libraryStmt.name.name, internalName);
          const overloads = ctx.importedMethodOverloads.get(libraryStmt.name.name) ?? [];
          overloads.push({
            receiverType: receiverType ? `${stmt.alias.name}.${receiverType}` : null,
            internalName,
          });
          ctx.importedMethodOverloads.set(libraryStmt.name.name, overloads);
          registerFunctionInfo(internalName, libraryStmt);
          walkFunctionBody(internalName, libraryStmt.params.map((p) => p.name), libraryStmt.body);
        } else {
          const internalName = importedExportName(stmt.alias.name, libraryStmt.name.name);
          ctx.importedFunctions.set(`${stmt.alias.name}.${libraryStmt.name.name}`, internalName);
          registerFunctionInfo(internalName, libraryStmt);
          walkFunctionBody(internalName, libraryStmt.params.map((p) => p.name), libraryStmt.body);
        }
        continue;
      }

      if (libraryStmt.type === 'TypeDeclaration' && libraryStmt.exported) {
        const typeName = `${stmt.alias.name}.${libraryStmt.name.name}`;
        const fields = libraryStmt.fields.map((f) => ({
          name: f.name.name,
          defaultExpr: f.defaultValue ?? null,
          varip: f.varip ?? false,
        }));
        const typeInfo = { name: typeName, fields, node: libraryStmt };
        ctx.typeDecls.set(typeName, typeInfo);
        ctx.typeDecls.set(libraryStmt.name.name, typeInfo);
        for (const f of libraryStmt.fields) {
          if (f.defaultValue) walkExpr(f.defaultValue);
        }
        continue;
      }

      if (libraryStmt.type === 'EnumDeclaration' && libraryStmt.exported) {
        registerImportedEnum(stmt.path, stmt.alias.name, libraryStmt);
        continue;
      }

      if (libraryStmt.type === 'VariableDeclaration' && libraryStmt.exported && libraryStmt.names.type === 'VariableDeclarator') {
        if (libraryStmt.init.type === 'IfStatement') {
          continue;
        }
        ctx.importedConstants.set(`${stmt.alias.name}.${libraryStmt.names.name.name}`, libraryStmt.init);
      }
    }
  }

  function registerImportedEnum(libraryPath: string, alias: string, declaration: EnumDeclaration): void {
    for (const field of declaration.fields) {
      const name = `${alias}.${declaration.name.name}.${field.name.name}`;
      ctx.importedEnumValues.set(
        name,
        `${libraryPath}.${declaration.name.name}.${field.name.name}`,
      );
      ctx.importedEnumTitles.set(name, field.title?.value ?? field.name.name);
    }
  }

  function registerLocalEnum(declaration: EnumDeclaration): void {
    for (const field of declaration.fields) {
      const name = `${declaration.name.name}.${field.name.name}`;
      ctx.enumValues.set(name, name);
      ctx.enumTitles.set(name, field.title?.value ?? field.name.name);
    }
  }

  function isImportedEnumPrefix(fullName: string): boolean {
    const prefix = `${fullName}.`;
    for (const name of ctx.importedEnumValues.keys()) {
      if (name.startsWith(prefix)) return true;
    }
    return false;
  }

  function walkExpr(expr: Expression): void {
    switch (expr.type) {
      case 'IndexExpression': {
        walkExpr(expr.index);
        if (expr.object.type === 'MemberExpression' && expr.object.object.type === 'Identifier') {
          const fullName = `${expr.object.object.name}.${expr.object.property.name}`;
          if (fullName in TA_VAR_CLASS_MAP) {
            registerTAVarSite(expr.object, fullName);
            break;
          }
        }
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
        const isBareUserFunctionCall = expr.callee.type === 'Identifier' && ctx.funcInfos.has(fullName);
        const taFullName = isBareUserFunctionCall ? fullName : canonicalTACallName(fullName);
        const taNamespace = taFullName.split('.')[0] ?? '';

        if (
          namespace
          && ctx.importedNamespaces.has(namespace)
          && !ctx.importedFunctions.has(fullName)
          && !(expr.callee.type === 'MemberExpression' && expr.callee.property.name === 'new' && ctx.typeDecls.has(resolveCallee(expr.callee.object).fullName))
        ) {
          addUnsupported(`Imported library function ${fullName} not yet supported by transpiler`);
        }

        if (UNSUPPORTED_REQUEST_FUNCS.has(fullName)) {
          addUnsupported(`${fullName} not yet supported by transpiler`);
        }

        if (fullName === 'request.security' || fullName === 'security' || fullName === 'request.security_lower_tf') {
          const isLowerTf = fullName === 'request.security_lower_tf';
          const requestArgs = isLowerTf
            ? ['symbol', 'timeframe', 'expression', 'ignore_invalid_symbol', 'currency', 'ignore_invalid_timeframe', 'calc_bars_count'] as const
            : ['symbol', 'timeframe', 'expression', 'gaps', 'lookahead', 'ignore_invalid_symbol', 'currency', 'calc_bars_count'] as const;
          const symbolExpr = orderedCallExprArg(expr.arguments, requestArgs, 0);
          const timeframeExpr = orderedCallExprArg(expr.arguments, requestArgs, 1);
          const expressionExpr = orderedCallExprArg(expr.arguments, requestArgs, 2);
          const gapsExpr = isLowerTf ? null : orderedCallExprArg(expr.arguments, requestArgs, 3) ?? null;
          const lookaheadExpr = isLowerTf ? null : orderedCallExprArg(expr.arguments, requestArgs, 4) ?? null;
          const ignoreInvalidSymbolExpr = orderedCallExprArg(expr.arguments, requestArgs, isLowerTf ? 3 : 5) ?? null;
          const currencyExpr = orderedCallExprArg(expr.arguments, requestArgs, isLowerTf ? 4 : 6) ?? null;
          const ignoreInvalidTimeframeExpr = isLowerTf ? orderedCallExprArg(expr.arguments, requestArgs, 5) ?? null : null;
          const calcBarsCountExpr = orderedCallExprArg(expr.arguments, requestArgs, isLowerTf ? 6 : 7) ?? null;
          if (symbolExpr && timeframeExpr && expressionExpr) {
            const secId = ctx.securitySites.length;
            const taCallSitesBefore = ctx.taCallSites.length;
            walkExpr(symbolExpr);
            walkExpr(timeframeExpr);
            walkExpr(expressionExpr);
            if (gapsExpr) walkExpr(gapsExpr);
            if (lookaheadExpr) walkExpr(lookaheadExpr);
            if (ignoreInvalidSymbolExpr) walkExpr(ignoreInvalidSymbolExpr);
            if (currencyExpr) walkExpr(currencyExpr);
            if (ignoreInvalidTimeframeExpr) walkExpr(ignoreInvalidTimeframeExpr);
            if (calcBarsCountExpr) walkExpr(calcBarsCountExpr);
            const expressionSourceParam = activeFunctionName
              && expressionExpr.type === 'Identifier'
              && activeFunctionParams?.has(expressionExpr.name)
                ? expressionExpr.name
                : undefined;
            const expressionCaptures = expressionSourceParam ? { params: [], locals: [] } : collectRequestCaptures(expressionExpr);
            const securityTASites = ctx.taCallSites.slice(taCallSitesBefore)
              .filter((site) => containsNode(expressionExpr, site.node));
            // Remove security-expression TAs from global list — they belong
            // only in the security evaluator, not the main class
            const securityNodeSet = new Set(securityTASites.map((s) => s.node));
            ctx.taCallSites = ctx.taCallSites.filter((s) => !securityNodeSet.has(s.node));
            for (const s of securityTASites) ctx.taCallSiteMap.delete(s.node);
            ctx.securitySites.push({
              id: secId,
              kind: isLowerTf ? 'security_lower_tf' : 'security',
              sourceExpr: null,
              symbolExpr,
              timeframeExpr,
              expressionExpr,
              gapsExpr,
              lookaheadExpr,
              ignoreInvalidSymbolExpr,
              currencyExpr,
              ignoreInvalidTimeframeExpr,
              calcBarsCountExpr,
              taCallSites: securityTASites,
              node: expr,
              expressionSourceParam,
              expressionCaptureParams: expressionCaptures.params.length > 0 ? expressionCaptures.params : undefined,
              expressionLocalStatements: expressionCaptures.locals.length > 0 ? expressionCaptures.locals : undefined,
            });
          }
          break;
        }

        if (fullName === 'request.seed') {
          const requestArgs = ['source', 'symbol', 'expression', 'ignore_invalid_symbol', 'calc_bars_count'] as const;
          const sourceExpr = orderedCallExprArg(expr.arguments, requestArgs, 0);
          const symbolExpr = orderedCallExprArg(expr.arguments, requestArgs, 1);
          const expressionExpr = orderedCallExprArg(expr.arguments, requestArgs, 2);
          const ignoreInvalidSymbolExpr = orderedCallExprArg(expr.arguments, requestArgs, 3) ?? null;
          const calcBarsCountExpr = orderedCallExprArg(expr.arguments, requestArgs, 4) ?? null;
          if (sourceExpr && symbolExpr && expressionExpr) {
            const secId = ctx.securitySites.length;
            const taCallSitesBefore = ctx.taCallSites.length;
            walkExpr(sourceExpr);
            walkExpr(symbolExpr);
            walkExpr(expressionExpr);
            if (ignoreInvalidSymbolExpr) walkExpr(ignoreInvalidSymbolExpr);
            if (calcBarsCountExpr) walkExpr(calcBarsCountExpr);
            const expressionSourceParam = activeFunctionName
              && expressionExpr.type === 'Identifier'
              && activeFunctionParams?.has(expressionExpr.name)
                ? expressionExpr.name
                : undefined;
            const expressionCaptures = expressionSourceParam ? { params: [], locals: [] } : collectRequestCaptures(expressionExpr);
            const securityTASites = ctx.taCallSites.slice(taCallSitesBefore)
              .filter((site) => containsNode(expressionExpr, site.node));
            const securityNodeSet = new Set(securityTASites.map((s) => s.node));
            ctx.taCallSites = ctx.taCallSites.filter((s) => !securityNodeSet.has(s.node));
            for (const s of securityTASites) ctx.taCallSiteMap.delete(s.node);
            ctx.securitySites.push({
              id: secId,
              kind: 'seed',
              sourceExpr,
              symbolExpr,
              timeframeExpr: symbolExpr,
              expressionExpr,
              gapsExpr: null,
              lookaheadExpr: null,
              ignoreInvalidSymbolExpr,
              currencyExpr: null,
              ignoreInvalidTimeframeExpr: null,
              calcBarsCountExpr,
              taCallSites: securityTASites,
              node: expr,
              expressionSourceParam,
              expressionCaptureParams: expressionCaptures.params.length > 0 ? expressionCaptures.params : undefined,
              expressionLocalStatements: expressionCaptures.locals.length > 0 ? expressionCaptures.locals : undefined,
            });
          }
          break;
        }

        if (taNamespace === 'ta' && !(taFullName in TA_CLASS_MAP) && !DIRECT_TA_FUNCS.has(taFullName)) {
          addUnsupported(`${taFullName} not yet supported by transpiler`);
        }

        if (taFullName in TA_CLASS_MAP) {
          const info = TA_CLASS_MAP[taFullName];
          const ctorArgs = extractCtorArgs(taFullName, expr.arguments);
          const requiredCtorArgCount = REQUIRED_STATIC_TA_CTOR_ARG_COUNTS[taFullName] ?? 0;
          const dynamicCtorArgExprs = ctorArgs.length < requiredCtorArgCount
            ? extractCtorArgExprs(taFullName, expr.arguments)
            : undefined;
          if (ctorArgs.length < requiredCtorArgCount && (dynamicCtorArgExprs?.length ?? 0) < requiredCtorArgCount) {
            addUnsupported(`${taFullName} with dynamic constructor parameters not yet supported by transpiler`);
          }
          const returnsTuple = taFullName === 'ta.vwap' ? vwapHasStdevMult(expr.arguments) : info.returnsTuple;
          const site: TACallSite = {
            memberName: `_ta_${info.className.toLowerCase()}_${taIndex++}`,
            className: info.className,
            ctorArgs,
            dynamicCtorArgExprs,
            computeArgExprs: extractComputeArgs(taFullName, expr.arguments),
            returnsTuple,
            tupleFields: taFullName === 'ta.vwap' ? ['middle', 'upper', 'lower'] : info.tupleFields,
            node: expr,
          };
          ctx.taCallSites.push(site);
          ctx.taCallSiteMap.set(expr, site);
        }

        if (fullName === 'input' || namespace === 'input') {
          ctx.inputSites.push({
            id: `input_${ctx.inputSites.length}`,
            funcName: fullName,
            node: expr,
          });
        }

        if (PLOT_FUNCTIONS.has(fullName)) {
          const funcCallIndex = plotCallCounts.get(fullName) ?? 0;
          plotCallCounts.set(fullName, funcCallIndex + 1);
          ctx.plotSites.push({
            index: plotIndex++,
            funcCallIndex,
            funcName: fullName,
            node: expr,
          });
        }

        const methodNames = expr.callee.type === 'MemberExpression' && !ctx.funcInfos.has(expr.callee.property.name)
          ? (ctx.importedMethodOverloads.get(expr.callee.property.name)?.map((overload) => overload.internalName)
            ?? (ctx.importedMethods.has(expr.callee.property.name) ? [ctx.importedMethods.get(expr.callee.property.name)!] : []))
          : [];
        const callableNames = methodNames.length > 0
          ? methodNames
          : [ctx.importedFunctions.get(fullName) ?? fullName];
        for (const callableName of callableNames) {
          if (ctx.funcInfos.has(callableName)) {
            const fi = ctx.funcInfos.get(callableName)!;
            fi.callSiteCount++;
          }
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
        if (expr.object.type === 'Identifier') {
          const fullName = `${expr.object.name}.${expr.property.name}`;
          if (fullName in TA_VAR_CLASS_MAP) {
            registerTAVarSite(expr, fullName);
            break;
          }
          if (
            ctx.importedNamespaces.has(expr.object.name)
            && !ctx.importedConstants.has(fullName)
            && !ctx.importedFunctions.has(fullName)
            && !ctx.typeDecls.has(fullName)
            && !isImportedEnumPrefix(fullName)
          ) {
            addUnsupported(`Imported library member ${fullName} not yet supported by transpiler`);
          }
        }
        walkExpr(expr.object);
        break;
      case 'ArrayExpression':
        for (const el of expr.elements) walkExpr(el);
        break;
      case 'LambdaExpression': {
        walkExpr(expr.body);
        break;
      }
      case 'ForStatement':
      case 'WhileStatement':
        walkStmt(expr as unknown as Statement);
        break;
      case 'Identifier':
        if (BAR_FIELDS.has(expr.name)) {
          ctx.usedBarFields.add(expr.name);
        }
        break;
      case 'NumericLiteral':
      case 'StringLiteral':
      case 'BooleanLiteral':
      case 'ColorLiteral':
      case 'NaExpression':
        break;
    }
  }

  function registerTAVarSite(node: MemberExpression, fullName: string): void {
    let site = taVarSitesByName.get(fullName);
    if (!site) {
      const className = TA_VAR_CLASS_MAP[fullName];
      const memberName = `_ta_${className.toLowerCase()}_${taIndex++}`;
      site = {
        memberName,
        seriesName: `${memberName}_series`,
        className,
        node,
      };
      taVarSitesByName.set(fullName, site);
      ctx.taVarSites.push(site);
    }
    ctx.taVarSiteMap.set(node, site);
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
        registerPriorLocalStatement(stmt);
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
        if (stmt.right.type === 'IfStatement') {
          walkStmt(stmt.right);
        } else {
          walkExpr(stmt.right);
        }
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
      case 'OnceStatement':
        if (stmt.test) walkExpr(stmt.test);
        for (const s of stmt.body) walkStmt(s);
        break;
      case 'ForStatement':
        if (stmt.kind === 'numeric') {
          walkExpr(stmt.start);
          walkExpr(stmt.end);
          if (stmt.step) walkExpr(stmt.step);
        } else {
          walkExpr(stmt.iterable);
        }
        for (const s of stmt.body) walkStmt(s);
        break;
      case 'WhileStatement':
        walkExpr(stmt.test);
        for (const s of stmt.body) walkStmt(s);
        break;
      case 'FunctionDeclaration': {
        registerFunctionInfo(stmt.name.name, stmt);
        walkFunctionBody(stmt.name.name, stmt.params.map((p) => p.name), stmt.body);
        break;
      }
      case 'ImportDeclaration': {
        registerImportedLibrary(stmt);
        break;
      }
      case 'LibraryDeclaration': {
        const msg = 'Library declarations not yet supported by transpiler';
        addUnsupported(msg);
        break;
      }
      case 'TypeDeclaration': {
        const fields = stmt.fields.map((f) => ({
          name: f.name.name,
          defaultExpr: f.defaultValue ?? null,
          varip: f.varip ?? false,
        }));
        ctx.typeDecls.set(stmt.name.name, { name: stmt.name.name, fields, node: stmt });
        for (const f of stmt.fields) {
          if (f.defaultValue) walkExpr(f.defaultValue);
        }
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
        registerLocalEnum(stmt);
        break;
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

function recursiveUserFunctionMessages(statements: Statement[]): string[] {
  const functions = new Map<string, FunctionDeclaration>();
  for (const statement of statements) {
    if (statement.type === 'FunctionDeclaration' && !statement.isMethod) {
      functions.set(statement.name.name, statement);
    }
  }

  const names = new Set(functions.keys());
  const graph = new Map<string, Set<string>>();
  for (const [name, fn] of functions) {
    graph.set(name, userFunctionCallsInNode(fn.body, names));
  }

  const messages: string[] = [];
  const reported = new Set<string>();
  const visit = (name: string, stack: string[]): void => {
    const stackIndex = stack.indexOf(name);
    if (stackIndex !== -1) {
      const cycle = [...stack.slice(stackIndex), name];
      const cycleKey = [...new Set(cycle)].sort().join('|');
      if (!reported.has(cycleKey)) {
        reported.add(cycleKey);
        messages.push(`Recursive user-defined function calls are not allowed: ${cycle.join(' -> ')}`);
      }
      return;
    }

    for (const next of graph.get(name) ?? []) {
      visit(next, [...stack, name]);
    }
  };

  for (const name of names) {
    visit(name, []);
  }
  return messages;
}

function userFunctionCallsInNode(node: Expression | IfStatement | Statement[], functionNames: Set<string>): Set<string> {
  if (Array.isArray(node)) return mergeStringSets(node.map((statement) => userFunctionCallsInStatement(statement, functionNames)));
  if (node.type === 'IfStatement') return userFunctionCallsInStatement(node, functionNames);
  return userFunctionCallsInExpression(node, functionNames);
}

function userFunctionCallsInStatement(statement: Statement, functionNames: Set<string>): Set<string> {
  if (statement.type === 'VariableDeclaration') return userFunctionCallsInNode(statement.init, functionNames);
  if (statement.type === 'AssignmentStatement') {
    return mergeStringSets([
      userFunctionCallsInExpression(statement.left, functionNames),
      userFunctionCallsInNode(statement.right, functionNames),
    ]);
  }
  if (statement.type === 'TupleAssignment') return userFunctionCallsInNode(statement.right, functionNames);
  if (statement.type === 'ExpressionStatement') return userFunctionCallsInExpression(statement.expression, functionNames);
  if (statement.type === 'IfStatement') {
    return mergeStringSets([
      userFunctionCallsInExpression(statement.test, functionNames),
      ...statement.consequent.map((child) => userFunctionCallsInStatement(child, functionNames)),
      ...(Array.isArray(statement.alternate)
        ? statement.alternate.map((child) => userFunctionCallsInStatement(child, functionNames))
        : statement.alternate
          ? [userFunctionCallsInStatement(statement.alternate, functionNames)]
          : []),
    ]);
  }
  if (statement.type === 'OnceStatement') {
    return mergeStringSets([
      ...(statement.test ? [userFunctionCallsInExpression(statement.test, functionNames)] : []),
      ...statement.body.map((child) => userFunctionCallsInStatement(child, functionNames)),
    ]);
  }
  if (statement.type === 'ForStatement') {
    return mergeStringSets([
      ...(statement.kind === 'numeric'
        ? [
          userFunctionCallsInExpression(statement.start, functionNames),
          userFunctionCallsInExpression(statement.end, functionNames),
          ...(statement.step ? [userFunctionCallsInExpression(statement.step, functionNames)] : []),
        ]
        : [userFunctionCallsInExpression(statement.iterable, functionNames)]),
      ...statement.body.map((child) => userFunctionCallsInStatement(child, functionNames)),
    ]);
  }
  if (statement.type === 'WhileStatement') {
    return mergeStringSets([
      userFunctionCallsInExpression(statement.test, functionNames),
      ...statement.body.map((child) => userFunctionCallsInStatement(child, functionNames)),
    ]);
  }
  if (statement.type === 'MultiDeclaration') return mergeStringSets(statement.declarations.map((declaration) => userFunctionCallsInStatement(declaration, functionNames)));
  if (statement.type === 'MultiAssignment') return mergeStringSets(statement.assignments.map((assignment) => userFunctionCallsInStatement(assignment, functionNames)));
  if (statement.type === 'MultiExpressionStatement') return mergeStringSets(statement.expressions.map((expression) => userFunctionCallsInExpression(expression, functionNames)));
  return new Set();
}

function userFunctionCallsInExpression(expression: Expression, functionNames: Set<string>): Set<string> {
  if (expression.type === 'CallExpression') {
    const refs = expression.callee.type === 'Identifier' && functionNames.has(expression.callee.name)
      ? new Set([expression.callee.name])
      : userFunctionCallsInExpression(expression.callee, functionNames);
    for (const argument of expression.arguments) {
      for (const ref of userFunctionCallsInExpression(argument.value, functionNames)) refs.add(ref);
    }
    return refs;
  }
  if (expression.type === 'BinaryExpression') return mergeStringSets([userFunctionCallsInExpression(expression.left, functionNames), userFunctionCallsInExpression(expression.right, functionNames)]);
  if (expression.type === 'UnaryExpression') return userFunctionCallsInExpression(expression.argument, functionNames);
  if (expression.type === 'ConditionalExpression') {
    return mergeStringSets([
      userFunctionCallsInExpression(expression.test, functionNames),
      userFunctionCallsInExpression(expression.consequent, functionNames),
      userFunctionCallsInExpression(expression.alternate, functionNames),
    ]);
  }
  if (expression.type === 'SwitchExpression') {
    return mergeStringSets([
      ...(expression.discriminant ? [userFunctionCallsInExpression(expression.discriminant, functionNames)] : []),
      ...expression.cases.flatMap((switchCase) => [
        ...(switchCase.test ? [userFunctionCallsInExpression(switchCase.test, functionNames)] : []),
        ...(Array.isArray(switchCase.consequent)
          ? switchCase.consequent.map((statement) => userFunctionCallsInStatement(statement, functionNames))
          : [userFunctionCallsInExpression(switchCase.consequent, functionNames)]),
      ]),
    ]);
  }
  if (expression.type === 'MemberExpression') return userFunctionCallsInExpression(expression.object, functionNames);
  if (expression.type === 'IndexExpression') return mergeStringSets([userFunctionCallsInExpression(expression.object, functionNames), userFunctionCallsInExpression(expression.index, functionNames)]);
  if (expression.type === 'ArrayExpression') return mergeStringSets(expression.elements.map((element) => userFunctionCallsInExpression(element, functionNames)));
  if (expression.type === 'ForStatement' || expression.type === 'WhileStatement') return userFunctionCallsInStatement(expression, functionNames);
  if (expression.type === 'LambdaExpression') return userFunctionCallsInExpression(expression.body, functionNames);
  return new Set();
}

function mergeStringSets(sets: Set<string>[]): Set<string> {
  const merged = new Set<string>();
  for (const set of sets) {
    for (const value of set) merged.add(value);
  }
  return merged;
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

function extractCtorArgs(fullName: string, args: CallArgument[]): unknown[] {
  const positional = args.filter((a) => !a.name).map((a) => a.value);
  switch (fullName) {
    case 'ta.sma':
    case 'ta.ema':
    case 'ta.rma':
    case 'ta.smma':
    case 'ta.rsi':
    case 'ta.range':
    case 'ta.rising':
    case 'ta.falling':
    case 'ta.dev':
    case 'ta.cog':
    case 'ta.median':
    case 'ta.mode':
    case 'ta.stdev':
    case 'ta.dema':
    case 'ta.tema':
    case 'ta.wma':
    case 'ta.vwma':
    case 'ta.swma':
    case 'ta.hma':
    {
      const lengthExpr = args.find((a) => a.name?.name === 'length')?.value
        ?? positional[args.some((a) => a.name?.name === 'source') ? 0 : 1];
      if (lengthExpr) {
        const v = extractStaticNumber(lengthExpr);
        if (v !== null) return [v];
      }
      return [];
    }
    case 'ta.atr': {
      const lengthExpr = args.find((a) => a.name?.name === 'length')?.value ?? positional[0];
      if (lengthExpr) {
        const v = extractStaticNumber(lengthExpr);
        if (v !== null) return [v];
      }
      return [];
    }
    case 'ta.highest':
    case 'ta.lowest': {
      const usesExplicitSource = args.some((a) => a.name?.name === 'source') || positional.length >= 2;
      const names = usesExplicitSource ? ['source', 'length'] : ['length'];
      const readArg = (name: string, index: number): Expression | undefined => {
        const named = args.find((a) => a.name?.name === name)?.value;
        if (named) return named;
        const positionalIndex = index - names.slice(0, index).filter((param) => args.some((a) => a.name?.name === param)).length;
        return positional[positionalIndex];
      };
      const lengthExpr = readArg('length', usesExplicitSource ? 1 : 0);
      if (lengthExpr) {
        const v = extractStaticNumber(lengthExpr);
        if (v !== null) return [v];
      }
      return [];
    }
    case 'ta.cci':
    case 'ta.cmo': {
      const names = ['source', 'length'];
      const readArg = (name: string, index: number): Expression | undefined => {
        const named = args.find((a) => a.name?.name === name)?.value;
        if (named) return named;
        const positionalIndex = index - names.slice(0, index).filter((param) => args.some((a) => a.name?.name === param)).length;
        return positional[positionalIndex];
      };
      const lengthExpr = readArg('length', 1);
      const fallback = fullName === 'ta.cci' ? 20 : 14;
      if (!lengthExpr) return [fallback];
      const v = extractStaticNumber(lengthExpr);
      return v !== null ? [v] : [];
    }
    case 'ta.mom':
    case 'ta.roc': {
      const names = ['source', 'length'];
      const readArg = (name: string, index: number): Expression | undefined => {
        const named = args.find((a) => a.name?.name === name)?.value;
        if (named) return named;
        const positionalIndex = index - names.slice(0, index).filter((param) => args.some((a) => a.name?.name === param)).length;
        return positional[positionalIndex];
      };
      const lengthExpr = readArg('length', 1);
      const fallback = fullName === 'ta.mom' ? 10 : 1;
      if (!lengthExpr) return [fallback];
      const v = extractStaticNumber(lengthExpr);
      return v !== null ? [v] : [];
    }
    case 'ta.rci': {
      const hasNamedSource = args.some((a) => a.name?.name === 'source');
      const lengthExpr = args.find((a) => a.name?.name === 'length')?.value ?? positional[hasNamedSource ? 0 : 1];
      if (lengthExpr) {
        const v = extractStaticNumber(lengthExpr);
        if (v !== null) return [v];
      }
      return [];
    }
    case 'ta.mfi': {
      const hasNamedSource = args.some((a) => a.name?.name === 'source' || a.name?.name === 'series');
      const lengthExpr = args.find((a) => a.name?.name === 'length')?.value ?? positional[hasNamedSource ? 0 : 1];
      if (lengthExpr) {
        const v = extractStaticNumber(lengthExpr);
        if (v !== null) return [v];
      }
      return [];
    }
    case 'ta.tsi': {
      const hasNamedSource = args.some((a) => a.name?.name === 'source');
      const shortLen = extractStaticNumber(args.find((a) => a.name?.name === 'short_length')?.value ?? positional[hasNamedSource ? 0 : 1]);
      const longLen = extractStaticNumber(args.find((a) => a.name?.name === 'long_length')?.value ?? positional[hasNamedSource ? 1 : 2]);
      if (shortLen !== null && longLen !== null) return [shortLen, longLen];
      return [];
    }
    case 'ta.valuewhen': {
      const hasNamedCondition = args.some((a) => a.name?.name === 'condition');
      const occurrenceExpr = args.find((a) => a.name?.name === 'occurrence')?.value ?? positional[hasNamedCondition ? 1 : 2];
      if (!occurrenceExpr) return [0];
      const occurrence = extractStaticNumber(occurrenceExpr);
      return occurrence === null ? [] : [occurrence];
    }
    case 'ta.variance': {
      const len = extractStaticNumber(args.find((a) => a.name?.name === 'length')?.value ?? positional[1]);
      const biasedArg = args.find((a) => a.name?.name === 'biased')?.value ?? positional[2];
      const biased = biasedArg ? extractStaticBoolean(biasedArg) : true;
      if (len !== null && biased !== null) return [len, biased];
      return [];
    }
    case 'ta.covariance':
    case 'ta.correlation': {
      const len = extractStaticNumber(args.find((a) => a.name?.name === 'length')?.value ?? positional[2]);
      if (len !== null) return [len];
      return [];
    }
    case 'ta.percentile_nearest_rank':
    case 'ta.percentile_linear_interpolation': {
      const len = extractStaticNumber(args.find((a) => a.name?.name === 'length')?.value ?? positional[1]);
      const percentage = extractStaticNumber(args.find((a) => a.name?.name === 'percentage')?.value ?? positional[2]);
      if (len !== null && percentage !== null) return [len, percentage];
      return [];
    }
    case 'ta.percentrank': {
      const len = extractStaticNumber(args.find((a) => a.name?.name === 'length')?.value ?? positional[1]);
      if (len !== null) return [len];
      return [];
    }
    case 'ta.linreg': {
      const len = extractStaticNumber(args.find((a) => a.name?.name === 'length')?.value ?? positional[1]);
      const offset = extractStaticNumber(args.find((a) => a.name?.name === 'offset')?.value ?? positional[2]);
      if (len !== null && offset !== null) return [len, offset];
      return [];
    }
    case 'ta.highestbars':
    case 'ta.lowestbars': {
      const lengthExpr = args.find((a) => a.name?.name === 'length')?.value
        ?? positional[1]
        ?? positional[0];
      if (lengthExpr) {
        const v = extractStaticNumber(lengthExpr);
        if (v !== null) return [v];
      }
      return [];
    }
    case 'ta.pivothigh':
    case 'ta.pivotlow': {
      const usesExplicitSource = args.some((a) => a.name?.name === 'source') || positional.length >= 3;
      const params = usesExplicitSource ? ['source', 'leftbars', 'rightbars'] : ['leftbars', 'rightbars'];
      const readArg = (name: string, index: number): Expression | undefined => {
        const named = args.find((a) => a.name?.name === name)?.value;
        if (named) return named;
        const positionalIndex = index - params.slice(0, index).filter((param) => args.some((a) => a.name?.name === param)).length;
        return positional[positionalIndex];
      };
      const leftExpr = readArg('leftbars', usesExplicitSource ? 1 : 0);
      const rightExpr = readArg('rightbars', usesExplicitSource ? 2 : 1);
      const left = leftExpr ? extractStaticNumber(leftExpr) : 5;
      const right = rightExpr ? extractStaticNumber(rightExpr) : 5;
      if (left !== null && right !== null) return [left, right];
      return [];
    }
    case 'ta.alma': {
      const len = extractStaticNumber(args.find((a) => a.name?.name === 'length')?.value ?? positional[1]);
      const offset = extractStaticNumber(args.find((a) => a.name?.name === 'offset')?.value ?? positional[2]);
      const sigma = extractStaticNumber(args.find((a) => a.name?.name === 'sigma')?.value ?? positional[3]);
      const floorArg = args.find((a) => a.name?.name === 'floor')?.value ?? positional[4];
      const useFloor = floorArg ? extractStaticBoolean(floorArg) : true;
      if (len !== null && offset !== null && sigma !== null && useFloor !== null) return [len, offset, sigma, useFloor];
      return [];
    }
    case 'ta.macd': {
      const names = ['source', 'fastlen', 'slowlen', 'siglen'];
      const readArg = (name: string, index: number): Expression | undefined => {
        const named = args.find((a) => a.name?.name === name)?.value;
        if (named) return named;
        const positionalIndex = index - names.slice(0, index).filter((param) => args.some((a) => a.name?.name === param)).length;
        return positional[positionalIndex];
      };
      const fast = extractStaticNumber(readArg('fastlen', 1));
      const slow = extractStaticNumber(readArg('slowlen', 2));
      const sig = extractStaticNumber(readArg('siglen', 3));
      if (fast !== null && slow !== null && sig !== null) return [fast, slow, sig];
      return [];
    }
    case 'ta.bb': {
      const len = extractStaticNumber(args.find((a) => a.name?.name === 'length')?.value ?? positional[1]);
      const mult = extractStaticNumber(args.find((a) => a.name?.name === 'mult')?.value ?? positional[2]);
      if (len !== null) return mult !== null ? [len, mult] : [len];
      return [];
    }
    case 'ta.bbw': {
      const hasNamedSeries = args.some((a) => a.name?.name === 'series');
      const len = extractStaticNumber(args.find((a) => a.name?.name === 'length')?.value ?? positional[hasNamedSeries ? 0 : 1]);
      const mult = extractStaticNumber(args.find((a) => a.name?.name === 'mult')?.value ?? positional[hasNamedSeries ? 1 : 2]);
      if (len !== null && mult !== null) return [len, mult];
      return [];
    }
    case 'ta.kc':
    case 'ta.kcw': {
      const names = ['series', 'length', 'mult', 'useTrueRange'];
      const readArg = (name: string, index: number): Expression | undefined => {
        const named = args.find((a) => a.name?.name === name)?.value;
        if (named) return named;
        const positionalIndex = index - names.slice(0, index).filter((param) => args.some((a) => a.name?.name === param)).length;
        return positional[positionalIndex];
      };
      const len = extractStaticNumber(readArg('length', 1));
      const mult = extractStaticNumber(readArg('mult', 2));
      const useTrueRangeArg = readArg('useTrueRange', 3);
      const useTrueRange = useTrueRangeArg ? extractStaticBoolean(useTrueRangeArg) : true;
      if (len !== null && mult !== null && useTrueRange !== null) return [len, mult, useTrueRange];
      return [];
    }
    case 'ta.dmi':
    case 'ta.adx': {
      const names = ['diLength', 'adxSmoothing'];
      const readArg = (name: string, index: number): Expression | undefined => {
        const named = args.find((a) => a.name?.name === name)?.value;
        if (named) return named;
        const positionalIndex = index - names.slice(0, index).filter((param) => args.some((a) => a.name?.name === param)).length;
        return positional[positionalIndex];
      };
      const diLength = extractStaticNumber(readArg('diLength', 0));
      const adxSmoothingExpr = readArg('adxSmoothing', 1);
      const adxSmoothing = adxSmoothingExpr
        ? extractStaticNumber(adxSmoothingExpr)
        : (fullName === 'ta.adx' ? 14 : null);
      if (diLength !== null && adxSmoothing !== null) return [diLength, adxSmoothing];
      return [];
    }
    case 'ta.supertrend': {
      const names = ['factor', 'atrPeriod'];
      const readArg = (name: string, index: number): Expression | undefined => {
        const named = args.find((a) => a.name?.name === name)?.value;
        if (named) return named;
        const positionalIndex = index - names.slice(0, index).filter((param) => args.some((a) => a.name?.name === param)).length;
        return positional[positionalIndex];
      };
      const factor = extractStaticNumber(readArg('factor', 0));
      const atrPeriod = extractStaticNumber(readArg('atrPeriod', 1));
      if (factor !== null && atrPeriod !== null) return [factor, atrPeriod];
      return [];
    }
    case 'ta.sar': {
      const names = ['start', 'inc', 'max'];
      const readArg = (name: string, index: number): Expression | undefined => {
        const named = args.find((a) => a.name?.name === name)?.value;
        if (named) return named;
        const positionalIndex = index - names.slice(0, index).filter((param) => args.some((a) => a.name?.name === param)).length;
        return positional[positionalIndex];
      };
      const start = extractStaticNumber(readArg('start', 0));
      const inc = extractStaticNumber(readArg('inc', 1));
      const max = extractStaticNumber(readArg('max', 2));
      if (start !== null && inc !== null && max !== null) return [start, inc, max];
      return [];
    }
    case 'ta.kst': {
      const names = ['source', 'roclength1', 'roclength2', 'roclength3', 'roclength4', 'smalen1', 'smalen2', 'smalen3', 'smalen4', 'signalLength'];
      const defaults = [undefined, 10, 15, 20, 30, 10, 10, 10, 15, 9] as const;
      const readArg = (name: string, index: number): Expression | undefined => {
        const named = args.find((a) => a.name?.name === name)?.value;
        if (named) return named;
        const positionalIndex = index - names.slice(0, index).filter((param) => args.some((a) => a.name?.name === param)).length;
        return positional[positionalIndex];
      };
      const ctorArgs: number[] = [];
      for (let index = 1; index < names.length; index += 1) {
        const arg = readArg(names[index], index);
        const value = arg ? extractStaticNumber(arg) : defaults[index];
        if (value === null || value === undefined) return [];
        ctorArgs.push(value);
      }
      return ctorArgs;
    }
    case 'ta.vwap': {
      const stdevMultArg = readOrderedArg(args, ['source', 'anchor', 'stdev_mult'], 'stdev_mult', 2);
      if (!stdevMultArg) return [false, NaN];
      const stdevMult = extractStaticNumber(stdevMultArg);
      return stdevMult === null ? [] : [true, stdevMult];
    }
    case 'ta.stoch': {
      const len = extractStaticNumber(args.find((a) => a.name?.name === 'length')?.value ?? positional[3]);
      if (len !== null) return [len];
      return [];
    }
    case 'ta.wpr': {
      const lengthArg = args.find((a) => a.name?.name === 'length')?.value ?? positional[0];
      if (!lengthArg) return [14];
      const len = extractStaticNumber(lengthArg);
      return len !== null ? [len] : [];
    }
    case 'ta.tr': {
      const handleNaArg = args.find((a) => a.name?.name === 'handle_na')?.value ?? positional[0];
      if (!handleNaArg) return [false];
      const handleNa = extractStaticBoolean(handleNaArg);
      return handleNa === null ? [] : [handleNa];
    }
    case 'ta.change': {
      const lengthArg = args.find((a) => a.name?.name === 'length')?.value ?? positional[1];
      if (!lengthArg) return [1];
      const len = extractStaticNumber(lengthArg);
      return len !== null ? [len] : [];
    }
    case 'ta.crossover':
    case 'ta.cross':
    case 'ta.crossunder':
    case 'ta.cum':
    case 'ta.obv':
    case 'ta.bar_index':
      return [];
    default:
      return [];
  }
}

function extractCtorArgExprs(fullName: string, args: CallArgument[]): Expression[] {
  const positional = args.filter((a) => !a.name).map((a) => a.value);
  const numericLiteral = (value: number): Expression => ({ type: 'NumericLiteral', value, raw: String(value) });
  const booleanLiteral = (value: boolean): Expression => ({ type: 'BooleanLiteral', value });
  const readAliasedArg = (names: readonly string[], name: string, index: number): Expression | undefined => {
    const named = args.find((a) => a.name?.name === name)?.value;
    if (named) return named;
    const positionalIndex = index - names.slice(0, index).filter((param) => args.some((a) => a.name?.name === param)).length;
    return positional[positionalIndex];
  };
  switch (fullName) {
    case 'ta.sma':
    case 'ta.ema':
    case 'ta.rma':
    case 'ta.smma':
    case 'ta.rsi':
    case 'ta.range':
    case 'ta.rising':
    case 'ta.falling':
    case 'ta.dev':
    case 'ta.cog':
    case 'ta.median':
    case 'ta.mode':
    case 'ta.stdev':
    case 'ta.dema':
    case 'ta.tema':
    case 'ta.wma':
    case 'ta.vwma':
    case 'ta.swma':
    case 'ta.hma':
    {
      const lengthExpr = args.find((a) => a.name?.name === 'length')?.value
        ?? positional[args.some((a) => a.name?.name === 'source') ? 0 : 1];
      return lengthExpr ? [lengthExpr] : [];
    }
    case 'ta.atr': {
      const lengthExpr = args.find((a) => a.name?.name === 'length')?.value ?? positional[0];
      return lengthExpr ? [lengthExpr] : [];
    }
    case 'ta.highest':
    case 'ta.lowest': {
      const usesExplicitSource = args.some((a) => a.name?.name === 'source') || positional.length >= 2;
      const names = usesExplicitSource ? ['source', 'length'] : ['length'];
      const readArg = (name: string, index: number): Expression | undefined => {
        const named = args.find((a) => a.name?.name === name)?.value;
        if (named) return named;
        const positionalIndex = index - names.slice(0, index).filter((param) => args.some((a) => a.name?.name === param)).length;
        return positional[positionalIndex];
      };
      const lengthExpr = readArg('length', usesExplicitSource ? 1 : 0);
      return lengthExpr ? [lengthExpr] : [];
    }
    case 'ta.highestbars':
    case 'ta.lowestbars': {
      const lengthExpr = args.find((a) => a.name?.name === 'length')?.value
        ?? positional[1]
        ?? positional[0];
      return lengthExpr ? [lengthExpr] : [];
    }
    case 'ta.pivothigh':
    case 'ta.pivotlow': {
      const usesExplicitSource = args.some((a) => a.name?.name === 'source') || positional.length >= 3;
      const params = usesExplicitSource ? ['source', 'leftbars', 'rightbars'] : ['leftbars', 'rightbars'];
      const readArg = (name: string, index: number): Expression | undefined => {
        const named = args.find((a) => a.name?.name === name)?.value;
        if (named) return named;
        const positionalIndex = index - params.slice(0, index).filter((param) => args.some((a) => a.name?.name === param)).length;
        return positional[positionalIndex];
      };
      return [
        readArg('leftbars', usesExplicitSource ? 1 : 0) ?? numericLiteral(5),
        readArg('rightbars', usesExplicitSource ? 2 : 1) ?? numericLiteral(5),
      ];
    }
    case 'ta.cci':
    case 'ta.cmo':
    case 'ta.mom':
    case 'ta.roc':
    case 'ta.rci': {
      const names = ['source', 'length'];
      const fallback = fullName === 'ta.cci' ? 20 : fullName === 'ta.mom' ? 10 : fullName === 'ta.roc' ? 1 : null;
      const lengthExpr = readAliasedArg(names, 'length', 1) ?? (fallback === null ? undefined : numericLiteral(fallback));
      return [lengthExpr].filter(Boolean) as Expression[];
    }
    case 'ta.mfi': {
      const names = ['source', 'length'];
      const sourceNamed = args.find((a) => a.name?.name === 'source')?.value ?? args.find((a) => a.name?.name === 'series')?.value;
      const lengthExpr = args.find((a) => a.name?.name === 'length')?.value
        ?? positional[sourceNamed ? 0 : 1]
        ?? undefined;
      return [lengthExpr].filter(Boolean) as Expression[];
    }
    case 'ta.tsi': {
      const names = ['source', 'short_length', 'long_length'];
      return [
        readAliasedArg(names, 'short_length', 1),
        readAliasedArg(names, 'long_length', 2),
      ].filter(Boolean) as Expression[];
    }
    case 'ta.variance': {
      const names = ['source', 'length', 'biased'];
      const lengthExpr = readAliasedArg(names, 'length', 1);
      const biasedExpr = readAliasedArg(names, 'biased', 2) ?? booleanLiteral(true);
      return [lengthExpr, biasedExpr].filter(Boolean) as Expression[];
    }
    case 'ta.covariance':
    case 'ta.correlation': {
      const names = ['source1', 'source2', 'length'];
      const lengthExpr = readAliasedArg(names, 'length', 2);
      return lengthExpr ? [lengthExpr] : [];
    }
    case 'ta.percentile_nearest_rank':
    case 'ta.percentile_linear_interpolation': {
      const names = ['source', 'length', 'percentage'];
      return [
        readAliasedArg(names, 'length', 1),
        readAliasedArg(names, 'percentage', 2),
      ].filter(Boolean) as Expression[];
    }
    case 'ta.percentrank': {
      const names = ['source', 'length'];
      const lengthExpr = readAliasedArg(names, 'length', 1);
      return lengthExpr ? [lengthExpr] : [];
    }
    case 'ta.linreg': {
      const names = ['source', 'length', 'offset'];
      return [
        readAliasedArg(names, 'length', 1),
        readAliasedArg(names, 'offset', 2),
      ].filter(Boolean) as Expression[];
    }
    case 'ta.alma': {
      const names = ['source', 'length', 'offset', 'sigma', 'floor'];
      return [
        readAliasedArg(names, 'length', 1),
        readAliasedArg(names, 'offset', 2),
        readAliasedArg(names, 'sigma', 3),
        readAliasedArg(names, 'floor', 4) ?? booleanLiteral(true),
      ].filter(Boolean) as Expression[];
    }
    case 'ta.bbw': {
      const names = ['series', 'length', 'mult'];
      return [
        readAliasedArg(names, 'length', 1),
        readAliasedArg(names, 'mult', 2),
      ].filter(Boolean) as Expression[];
    }
    case 'ta.valuewhen': {
      const names = ['condition', 'source', 'occurrence'];
      return [readAliasedArg(names, 'occurrence', 2) ?? numericLiteral(0)];
    }
    case 'ta.stoch': {
      const names = ['source', 'high', 'low', 'length'];
      const lengthExpr = readAliasedArg(names, 'length', 3);
      return lengthExpr ? [lengthExpr] : [];
    }
    case 'ta.wpr': {
      const names = ['length'];
      return [readAliasedArg(names, 'length', 0) ?? numericLiteral(14)];
    }
    case 'ta.tr': {
      const names = ['handle_na'];
      return [readAliasedArg(names, 'handle_na', 0) ?? booleanLiteral(false)];
    }
    case 'ta.change': {
      const names = ['source', 'length'];
      return [readAliasedArg(names, 'length', 1) ?? numericLiteral(1)];
    }
    case 'ta.vwap': {
      const names = ['source', 'anchor', 'stdev_mult'];
      const stdevMult = readAliasedArg(names, 'stdev_mult', 2);
      return stdevMult ? [booleanLiteral(true), stdevMult] : [];
    }
    case 'ta.macd': {
      const names = ['source', 'fastlen', 'slowlen', 'siglen'];
      const readArg = (name: string, index: number): Expression | undefined => {
        const named = args.find((a) => a.name?.name === name)?.value;
        if (named) return named;
        const positionalIndex = index - names.slice(0, index).filter((param) => args.some((a) => a.name?.name === param)).length;
        return positional[positionalIndex];
      };
      const fast = readArg('fastlen', 1);
      const slow = readArg('slowlen', 2);
      const sig = readArg('siglen', 3);
      return [fast, slow, sig].filter(Boolean) as Expression[];
    }
    case 'ta.bb': {
      const len = args.find((a) => a.name?.name === 'length')?.value ?? positional[1];
      const mult = args.find((a) => a.name?.name === 'mult')?.value ?? positional[2];
      return [len, mult].filter(Boolean) as Expression[];
    }
    case 'ta.kc':
    case 'ta.kcw': {
      const names = ['series', 'length', 'mult', 'useTrueRange'];
      const readArg = (name: string, index: number): Expression | undefined => {
        const named = args.find((a) => a.name?.name === name)?.value;
        if (named) return named;
        const positionalIndex = index - names.slice(0, index).filter((param) => args.some((a) => a.name?.name === param)).length;
        return positional[positionalIndex];
      };
      const len = readArg('length', 1);
      const mult = readArg('mult', 2);
      const useTrueRange = readArg('useTrueRange', 3);
      return [len, mult, useTrueRange].filter(Boolean) as Expression[];
    }
    case 'ta.supertrend': {
      const names = ['factor', 'atrPeriod'];
      const readArg = (name: string, index: number): Expression | undefined => {
        const named = args.find((a) => a.name?.name === name)?.value;
        if (named) return named;
        const positionalIndex = index - names.slice(0, index).filter((param) => args.some((a) => a.name?.name === param)).length;
        return positional[positionalIndex];
      };
      return [readArg('factor', 0), readArg('atrPeriod', 1)].filter(Boolean) as Expression[];
    }
    case 'ta.dmi':
    case 'ta.adx': {
      const names = ['diLength', 'adxSmoothing'];
      const readArg = (name: string, index: number): Expression | undefined => {
        const named = args.find((a) => a.name?.name === name)?.value;
        if (named) return named;
        const positionalIndex = index - names.slice(0, index).filter((param) => args.some((a) => a.name?.name === param)).length;
        return positional[positionalIndex];
      };
      const diLength = readArg('diLength', 0);
      const adxSmoothing = readArg('adxSmoothing', 1) ?? (fullName === 'ta.adx' ? numericLiteral(14) : undefined);
      return [diLength, adxSmoothing].filter(Boolean) as Expression[];
    }
    case 'ta.sar': {
      const names = ['start', 'inc', 'max'];
      const readArg = (name: string, index: number): Expression | undefined => {
        const named = args.find((a) => a.name?.name === name)?.value;
        if (named) return named;
        const positionalIndex = index - names.slice(0, index).filter((param) => args.some((a) => a.name?.name === param)).length;
        return positional[positionalIndex];
      };
      return [readArg('start', 0), readArg('inc', 1), readArg('max', 2)].filter(Boolean) as Expression[];
    }
    case 'ta.kst': {
      const names = ['source', 'roclength1', 'roclength2', 'roclength3', 'roclength4', 'smalen1', 'smalen2', 'smalen3', 'smalen4', 'signalLength'];
      const defaults = [undefined, 10, 15, 20, 30, 10, 10, 10, 15, 9] as const;
      const readArg = (name: string, index: number): Expression | undefined => {
        const named = args.find((a) => a.name?.name === name)?.value;
        if (named) return named;
        const positionalIndex = index - names.slice(0, index).filter((param) => args.some((a) => a.name?.name === param)).length;
        return positional[positionalIndex];
      };
      const ctorArgs: Expression[] = [];
      for (let index = 1; index < names.length; index += 1) {
        const arg = readArg(names[index], index);
        const defaultValue = defaults[index];
        if (arg) {
          ctorArgs.push(arg);
        } else if (defaultValue !== undefined) {
          ctorArgs.push(numericLiteral(defaultValue));
        }
      }
      return ctorArgs;
    }
    default:
      return [];
  }
}

function extractComputeArgs(fullName: string, args: CallArgument[]): Expression[] {
  const positional = args.filter((a) => !a.name).map((a) => a.value);
  switch (fullName) {
    case 'ta.barssince':
      return [args.find((a) => a.name?.name === 'condition')?.value ?? positional[0]].filter(Boolean) as Expression[];
    case 'ta.valuewhen': {
      const hasNamedCondition = args.some((a) => a.name?.name === 'condition');
      const condition = args.find((a) => a.name?.name === 'condition')?.value ?? positional[0];
      const source = args.find((a) => a.name?.name === 'source')?.value ?? positional[hasNamedCondition ? 0 : 1];
      return [condition, source].filter(Boolean) as Expression[];
    }
    case 'ta.sma':
    case 'ta.ema':
    case 'ta.rma':
    case 'ta.smma':
    case 'ta.rsi':
    case 'ta.range':
    case 'ta.rising':
    case 'ta.falling':
    case 'ta.variance':
    case 'ta.dev':
    case 'ta.cog':
    case 'ta.median':
    case 'ta.mode':
    case 'ta.percentile_nearest_rank':
    case 'ta.percentile_linear_interpolation':
    case 'ta.percentrank':
    case 'ta.linreg':
    case 'ta.stdev':
    case 'ta.dema':
    case 'ta.tema':
    case 'ta.wma':
    case 'ta.vwma':
    case 'ta.swma':
    case 'ta.alma':
    case 'ta.hma':
    case 'ta.bbw':
    case 'ta.mom':
    case 'ta.roc':
    case 'ta.cci':
    case 'ta.cmo':
    case 'ta.mfi':
    case 'ta.tsi':
    case 'ta.rci':
    case 'ta.cum':
    case 'ta.kst':
      return [args.find((a) => a.name?.name === 'source')?.value ?? args.find((a) => a.name?.name === 'series')?.value ?? positional[0]].filter(Boolean) as Expression[];
    case 'ta.vwap': {
      const source = readOrderedArg(args, ['source', 'anchor', 'stdev_mult'], 'source', 0);
      const anchor = readOrderedArg(args, ['source', 'anchor', 'stdev_mult'], 'anchor', 1);
      return [source, anchor].filter(Boolean) as Expression[];
    }
    case 'ta.highest':
    case 'ta.lowest': {
      const source = args.find((a) => a.name?.name === 'source')?.value ?? (positional.length >= 2 ? positional[0] : undefined);
      return [source].filter(Boolean) as Expression[];
    }
    case 'ta.obv': {
      const source = args.find((a) => a.name?.name === 'source')?.value ?? positional[0];
      const volume = args.find((a) => a.name?.name === 'volume')?.value ?? positional[1];
      return [source, volume].filter(Boolean) as Expression[];
    }
    case 'ta.bar_index':
      return [args.find((a) => a.name?.name === 'source')?.value ?? positional[0]].filter(Boolean) as Expression[];
    case 'ta.macd':
      return [args.find((a) => a.name?.name === 'source')?.value ?? positional[0]].filter(Boolean) as Expression[];
    case 'ta.bb':
      return [args.find((a) => a.name?.name === 'series')?.value ?? positional[0]].filter(Boolean) as Expression[];
    case 'ta.kc':
    case 'ta.kcw':
      return [args.find((a) => a.name?.name === 'series')?.value ?? positional[0]].filter(Boolean) as Expression[];
    case 'ta.crossover':
    case 'ta.cross':
    case 'ta.crossunder': {
      const a = args.find((a) => a.name?.name === 'source1')?.value ?? positional[0];
      const b = args.find((a) => a.name?.name === 'source2')?.value ?? positional[1];
      return [a, b].filter(Boolean) as Expression[];
    }
    case 'ta.max':
    case 'ta.min': {
      const a = args.find((a) => a.name?.name === 'source1')?.value ?? positional[0];
      const hasNamedSource1 = args.some((a) => a.name?.name === 'source1');
      const b = args.find((a) => a.name?.name === 'source2')?.value ?? positional[hasNamedSource1 ? 0 : 1];
      return [a, b].filter(Boolean) as Expression[];
    }
    case 'ta.covariance':
    case 'ta.correlation': {
      const a = args.find((a) => a.name?.name === 'source1')?.value ?? positional[0];
      const b = args.find((a) => a.name?.name === 'source2')?.value ?? positional[1];
      return [a, b].filter(Boolean) as Expression[];
    }
    case 'ta.change': {
      return [
        args.find((a) => a.name?.name === 'source')?.value ?? positional[0],
        args.find((a) => a.name?.name === 'length')?.value ?? positional[1],
      ].filter(Boolean) as Expression[];
    }
    case 'ta.atr':
    case 'ta.tr':
    case 'ta.wpr':
    case 'ta.dmi':
    case 'ta.adx':
    case 'ta.supertrend':
    case 'ta.sar':
      return []; // OHLC classes read high/low/close from bar directly
    case 'ta.highestbars':
    case 'ta.lowestbars': {
      const source = args.find((a) => a.name?.name === 'source')?.value ?? (positional[1] ? positional[0] : undefined);
      return [source].filter(Boolean) as Expression[];
    }
    case 'ta.pivothigh':
    case 'ta.pivotlow': {
      const source = args.find((a) => a.name?.name === 'source')?.value ?? (positional.length >= 3 ? positional[0] : undefined);
      return [source].filter(Boolean) as Expression[];
    }
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
