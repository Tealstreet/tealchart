import { importedInternalName } from './importedNames';
import { resolveDependencyMember } from './importedDependencies';
import { isTimeframeSecondsRatio } from '../../compat/legacyHighestTimeframeRatio';
import { tradingViewTimeframeCompileRefusal } from '../../compat/tradingViewTimeframeRefusals';
import type {
  Program, Statement, Expression,
  IndicatorDeclaration,
  LibraryDeclaration,
  IfStatement,
  ForStatement,
  WhileStatement,
  CallExpression,
  CallArgument,
  MemberExpression,
  TypeDeclaration,
  FunctionDeclaration,
  EnumDeclaration,
  TypeAnnotation,
} from '../../parser/ast';
import {
  getOfficialTradingViewLibrary,
} from '../../officialTradingViewLibraries';
import { isPineBuiltinGlobalAvailable, pineVersionRules } from '../../pineVersionRules';
import { checkProgram, type SemanticType } from '../../semantic/checker';
import { DERIVED_PRICE_BUILTINS } from '../../builtinMetadata';
import { canonicalBuiltinArguments } from '../../pineBuiltinParameterRenames';

export interface TACallSite {
  memberName: string;
  className: string;
  ctorArgs: unknown[];
  dynamicCtorArgExprs?: Expression[];
  truncateTimeframeRatioLength?: boolean;
  integerDivisionLength?: boolean;
  captureInitialCtorArgs?: boolean;
  computeArgExprs: Expression[];
  returnsTuple: boolean;
  tupleFields?: string[];
  node: CallExpression;
}

export interface TAVarSite {
  memberName: string;
  seriesName: string;
  className: string;
  node: Expression;
}

export interface VarDeclInfo {
  name: string;
  kind: 'var' | 'varip';
  initExpr: Expression | IfStatement;
}

export interface InputCallSite {
  defaultTitle?: string;
  id: string;
  funcName: string;
  node: CallExpression;
}

export interface PlotCallSite {
  plotCount: number;
  index: number;
  funcCallIndex: number;
  funcName: string;
  node: CallExpression;
}

export interface FuncInfo {
  name: string;
  params: string[];
  paramTypes: FunctionDeclaration['params'][number]['typeAnnotation'][];
  paramDefaults: (Expression | undefined)[];
  paramTypeAnnotations: (TypeAnnotation | null | undefined)[];
  body: Expression | Statement[];
  hasTACalls: boolean;
  hasSeriesVars: boolean;
  callSiteCount: number;
  calledFromLocalScope: boolean;
}

export interface DeclarationInfo {
  kind: 'indicator' | 'strategy' | 'library';
  title: string;
  node: IndicatorDeclaration | LibraryDeclaration;
  constantExpressions?: ReadonlyMap<string, Expression>;
  constantExpressionTypes?: WeakMap<Expression, SemanticType>;
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

export interface LocalMethodOverloadInfo {
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
  independentRequestCaptures?: Map<string, Expression>;
  expressionLocalStatements?: Statement[];
  expressionTupleArity?: number;
  importedAliasContext?: string;
  ownerFunctionName?: string;
  requiresDynamicRequestsReason?: 'local-scope' | 'conditional-operand' | 'nested-request';
}

export interface RequestSourceSite {
  id: number;
  ownerFunctionName?: string;
  expression: Expression;
  params: string[];
  locals: Statement[];
}

export interface AnalysisContext {
  recordedExpressionTypes?: WeakMap<Expression | IfStatement, SemanticType>;
  loopResultTypes?: WeakMap<ForStatement | WhileStatement, SemanticType[]>;
  pineVersion: number;
  discardedFootprintCalls?: Set<Expression>;
  seriesVars: Set<string>;
  taCallSites: TACallSite[];
  taCallSiteMap: Map<CallExpression, TACallSite>;
  taVarSites: TAVarSite[];
  taVarSiteMap: Map<Expression, TAVarSite>;
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
  requestSourceSites: Map<Expression, RequestSourceSite>;
  requestSourceCaptures: Map<Expression, { params: string[]; locals: Statement[] }>;
  importedNamespaces: Set<string>;
  officialLibraryFunctions: Map<string, string>;
  importedFunctions: Map<string, string>;
  importedLocalFunctions: Map<string, string>;
  importedFunctionOwners: Map<string, string>;
  importedDependencyScopes: Map<string, Map<string, string>>;
  userFunctionOverloads: Map<string, string[]>;
  resolvedUserFunctionCalls: Map<CallExpression, string>;
  importedMethods: Map<string, string>;
  localMethodOverloads: Map<string, LocalMethodOverloadInfo[]>;
  importedMethodOverloads: Map<string, ImportedMethodOverloadInfo[]>;
  importedLocalMethods: Map<string, ImportedMethodOverloadInfo[]>;
  importedLocalTypes: Map<string, string>;
  importedConstants: Map<string, Expression>;
  importDiagnostics: string[];
  importedAliasContext?: string;
  enumValues: Map<string, string>;
  enumTitles: Map<string, string>;
  importedEnumValues: Map<string, string>;
  importedEnumTitles: Map<string, string>;
  maxStaticHistoryOffset: number;
  maxBarsBackHints: Map<string, number>;
}

export interface SemanticTypeAnalysis {
  ast: Program;
  libraries?: Map<string, Program>;
  result: ReturnType<typeof checkProgram>;
  recordedExpressionTypes: WeakMap<Expression | IfStatement, SemanticType>;
  loopResultTypes: WeakMap<ForStatement | WhileStatement, SemanticType[]>;
}

export interface AnalyzeOptions {
  semanticTypes?: SemanticTypeAnalysis;
  libraries?: Map<string, Program>;
  capturedParams?: Set<string>;
  importedAliasContext?: string;
}

const BAR_FIELDS = new Set([
  'open', 'high', 'low', 'close', 'volume', 'bid', 'ask',
  'time', 'time_close', 'timenow',
  'hl2', 'hlc3', 'ohlc4', 'hlcc4',
]);

const TA_CLASS_MAP: Record<string, { className: string; returnsTuple: boolean; tupleFields?: string[] }> = {
  'ta.sma': { className: 'SMA', returnsTuple: false },
  'ta.sum': { className: 'Sum', returnsTuple: false },
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
  'ta.pivot_point_levels': { className: 'PivotPointLevels', returnsTuple: false },
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
  'ta.obv': 'OBV',
  'ta.vwap': 'VWAP',
  'ta.wad': 'WilliamsAccumulationDistribution',
  'ta.wvad': 'WilliamsVariableAccumulationDistribution',
};

function canonicalTAVarName(name: string, pineVersion: number): string | undefined {
  if (name.includes('.') || pineVersion > 4) return undefined;
  const taName = `ta.${name}`;
  return Object.prototype.hasOwnProperty.call(TA_VAR_CLASS_MAP, taName) ? taName : undefined;
}

const LEGACY_GLOBAL_MATH_ALIASES = new Set([
  'abs', 'ceil', 'floor', 'round', 'round_to_mintick', 'sqrt',
  'log', 'log10', 'pow', 'sign', 'max', 'min', 'avg', 'sum',
  'sin', 'cos', 'tan', 'asin', 'acos', 'atan', 'exp',
  'toradians', 'todegrees', 'random',
]);

function canonicalTACallName(fullName: string): string {
  if (fullName.includes('.') || LEGACY_GLOBAL_MATH_ALIASES.has(fullName)) return fullName;
  const taName = `ta.${fullName}`;
  return Object.prototype.hasOwnProperty.call(TA_CLASS_MAP, taName) ? taName : fullName;
}

const REQUIRED_STATIC_TA_CTOR_ARG_COUNTS: Record<string, number> = {
  'ta.sma': 1,
  'ta.sum': 1,
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
  'ta.supertrend': 1,
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

export function extractStaticNumber(expr: Expression | undefined): number | null {
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

function readAliasedOrderedArg(args: CallArgument[], namesByIndex: readonly (readonly string[])[], index: number): Expression | undefined {
  const names = namesByIndex[index] ?? [];
  const named = args.find((arg) => arg.name && names.includes(arg.name.name))?.value;
  if (named) return named;
  const positional = args.filter((arg) => !arg.name).map((arg) => arg.value);
  const priorNamedCount = namesByIndex
    .slice(0, index)
    .filter((priorNames) => args.some((arg) => arg.name && priorNames.includes(arg.name.name))).length;
  return positional[index - priorNamedCount];
}

function isDefinedExpression(expr: Expression | undefined): expr is Expression {
  return expr !== undefined;
}

function vwapHasStdevMult(args: CallArgument[]): boolean {
  return Boolean(readOrderedArg(args, ['source', 'anchor', 'stdev_mult'], 'stdev_mult', 2));
}

export function analyze(ast: Program, options: AnalyzeOptions = {}): AnalysisContext {
  const highestTimeframeRatioNames = new Set<string>();
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
    requestSourceSites: new Map(),
    requestSourceCaptures: new Map(),
    importedNamespaces: new Set(),
    officialLibraryFunctions: new Map(),
    importedFunctions: new Map(),
    importedLocalFunctions: new Map(),
    importedFunctionOwners: new Map(),
    importedDependencyScopes: new Map(),
    userFunctionOverloads: new Map(),
    resolvedUserFunctionCalls: new Map(),
    importedMethods: new Map(),
    localMethodOverloads: new Map(),
    importedMethodOverloads: new Map(),
    importedLocalMethods: new Map(),
    importedLocalTypes: new Map(),
    importedConstants: new Map(),
    importDiagnostics: [],
    importedAliasContext: options.importedAliasContext,
    enumValues: new Map(),
    enumTitles: new Map(),
    importedEnumValues: new Map(),
    importedEnumTitles: new Map(),
    maxStaticHistoryOffset: 0,
    maxBarsBackHints: new Map(),
  };

  // Retain structural matching for cloned request expressions, but serialize
  // each immutable body/target only once during this analysis.
  const serializedNodes = new WeakMap<object, string>();
  function serializedNode(node: object): string {
    let json = serializedNodes.get(node);
    if (json === undefined) {
      json = JSON.stringify(node);
      serializedNodes.set(node, json);
    }
    return json;
  }

  function callPosition(node: CallExpression): string | undefined {
    const start = node.loc?.start?.offset;
    const end = node.loc?.end?.offset;
    return Number.isFinite(start) && Number.isFinite(end) ? `${start}:${end}` : undefined;
  }

  type BodyMembership = {
    nodes: WeakSet<object>;
    calls: CallExpression[];
    positions: Set<string>;
    names: Set<string>;
    hasUnlocatedCalls: boolean;
  };
  const bodyMembership = new WeakMap<object, BodyMembership>();
  function membership(body: Expression | Statement[]): BodyMembership {
    const cached = bodyMembership.get(body);
    if (cached) return cached;
    const nodes = new WeakSet<object>();
    const calls: CallExpression[] = [];
    const positions = new Set<string>();
    const names = new Set<string>();
    let hasUnlocatedCalls = false;
    const visit = (value: unknown): void => {
      if (!value || typeof value !== 'object' || nodes.has(value)) return;
      nodes.add(value);
      if (Array.isArray(value)) {
        for (const child of value) visit(child);
        return;
      }
      if ((value as { type?: string }).type === 'CallExpression') {
        const call = value as CallExpression;
        calls.push(call);
        const position = callPosition(call);
        if (position === undefined) hasUnlocatedCalls = true;
        else positions.add(position);
      }
      for (const key of Object.keys(value)) {
        if (key === 'loc') continue;
        const child = (value as Record<string, unknown>)[key];
        if (key === 'name' && typeof child === 'string' && !names.has(child) && JSON.stringify(child) === `"${child}"`) {
          names.add(child);
        }
        visit(child);
      }
    };
    visit(body);
    const result = { nodes, calls, positions, names, hasUnlocatedCalls };
    bodyMembership.set(body, result);
    return result;
  }

  function containsNode(body: Expression | Statement[], target: CallExpression): boolean {
    const index = membership(body);
    if (index.nodes.has(target)) return true;
    const position = callPosition(target);
    if (position !== undefined && !index.hasUnlocatedCalls && !index.positions.has(position)) return false;
    const json = serializedNode(body);
    const targetJson = serializedNode(target);
    return json.includes(targetJson);
  }

  function hasSeriesAccess(body: Expression | Statement[], seriesVars: Set<string>): boolean {
    const names = membership(body).names;
    for (const name of seriesVars) {
      if (names.has(name)) return true;
    }
    return false;
  }

  let taIndex = 0;
  const taVarSitesByName = new Map<string, TAVarSite>();
  let plotIndex = 0;
  const plotCallCounts = new Map<string, number>();
  const functionBodies = new Map<string, Expression | Statement[]>();
  const registeredImportKeys = new Set<string>();
  const dependencyAliases = new Map<string, Set<string>>();
  const inspectedLibraries = new Set<string>();
  function collectDependencyAliases(program: Program): void {
    for (const statement of program.body) {
      if (statement.type !== 'ImportDeclaration') continue;
      const paths = dependencyAliases.get(statement.alias.name) ?? new Set<string>();
      paths.add(statement.path);
      dependencyAliases.set(statement.alias.name, paths);
      if (inspectedLibraries.has(statement.path)) continue;
      inspectedLibraries.add(statement.path);
      const library = getOfficialTradingViewLibrary(statement.path)?.program ?? options.libraries?.get(statement.path);
      if (library) collectDependencyAliases(library);
    }
  }
  collectDependencyAliases(ast);
  const scopedDependencyNames = new Map<string, string>();
  function dependencyNamespace(alias: string, path: string): string {
    if ((dependencyAliases.get(alias)?.size ?? 0) < 2) return alias;
    const key = `${alias}\u0000${path}`;
    let name = scopedDependencyNames.get(key);
    if (!name) {
      name = `$dependency${scopedDependencyNames.size}`;
      scopedDependencyNames.set(key, name);
    }
    return name;
  }

  const userFunctionCounts = new Map<string, number>();
  const rootDeclaredNames = new Set<string>();
  const builtinDeclarationScopes = isPineBuiltinGlobalAvailable(ast.version, 'bar_index')
    ? undefined
    : [new Set<string>()];
  const addRootDeclaredNames = (statements: Statement[]): void => {
    for (const statement of statements) {
      if (statement.type === 'VariableDeclaration') {
        for (const name of localDeclarationNames(statement)) rootDeclaredNames.add(name);
      } else if (statement.type === 'MultiDeclaration') {
        for (const declaration of statement.declarations) {
          for (const name of localDeclarationNames(declaration)) rootDeclaredNames.add(name);
        }
      } else if (statement.type === 'IfStatement') {
        addRootDeclaredNames(statement.consequent);
        if (Array.isArray(statement.alternate)) addRootDeclaredNames(statement.alternate);
        else if (statement.alternate) addRootDeclaredNames([statement.alternate]);
      }
    }
  };
  for (const statement of ast.body) {
    if (statement.type === 'FunctionDeclaration') {
      if (!statement.isMethod) userFunctionCounts.set(statement.name.name, (userFunctionCounts.get(statement.name.name) ?? 0) + 1);
    } else if (statement.type === 'VariableDeclaration') {
      for (const name of localDeclarationNames(statement)) rootDeclaredNames.add(name);
    } else if (statement.type === 'MultiDeclaration') {
      for (const declaration of statement.declarations) {
        for (const name of localDeclarationNames(declaration)) rootDeclaredNames.add(name);
      }
    } else if (statement.type === 'IfStatement') {
      addRootDeclaredNames(statement.consequent);
      if (Array.isArray(statement.alternate)) addRootDeclaredNames(statement.alternate);
      else if (statement.alternate) addRootDeclaredNames([statement.alternate]);
    }
  }
  const userFunctionNames = new Map<FunctionDeclaration, string>();
  const arityCounts = new Map<string, number>();
  for (const statement of ast.body) {
    if (statement.type !== 'FunctionDeclaration' || statement.isMethod) continue;
    const name = statement.name.name;
    const arityName = `${name}$arity${statement.params.length}`;
    arityCounts.set(arityName, (arityCounts.get(arityName) ?? 0) + 1);
  }
  const arityIndices = new Map<string, number>();
  for (const statement of ast.body) {
    if (statement.type !== 'FunctionDeclaration' || statement.isMethod) continue;
    const name = statement.name.name;
    const arityName = `${name}$arity${statement.params.length}`;
    const ordinal = arityIndices.get(arityName) ?? 0;
    arityIndices.set(arityName, ordinal + 1);
    userFunctionNames.set(statement, (userFunctionCounts.get(name) ?? 0) === 1
      ? name
      : (arityCounts.get(arityName) ?? 0) === 1 ? arityName : `${arityName}$overload${ordinal}`);
  }
  if ([...userFunctionCounts.values()].some((count) => count > 1)) {
    const semantic = checkProgram(ast, { libraries: options.libraries });
    for (const diagnostic of semantic.diagnostics) {
      if (diagnostic.code === 'ambiguous-call') ctx.unsupported.push(diagnostic.message);
    }
    for (const [call, declaration] of semantic.userFunctionCallDeclarations) {
      const name = userFunctionNames.get(declaration);
      if (name) ctx.resolvedUserFunctionCalls.set(call, name);
    }
  }
  let activeFunctionName: string | null = null;
  let activeFunctionParams: Set<string> | null = null;
  let activeFunctionLocals: Set<string> | null = null;
  let activeFunctionPriorLocalStatements: Statement[] | null = null;
  let localScopeDepth = 0;
  const localNameScopeStack: Set<string>[] = [];
  const loopExpressionForbiddenStack: Set<string>[] = [];
  let conditionalOperandDepth = 0;
  let requestExpressionDepth = 0;
  const versionRules = pineVersionRules(ast.version);

  function addUnsupported(message: string): void {
    if (!ctx.unsupported.includes(message)) ctx.unsupported.push(message);
  }

  const reservedImportedNames = new Set([...userFunctionNames.values(), ...ast.body.flatMap(statement =>
    statement.type === 'TypeDeclaration' || statement.type === 'EnumDeclaration' ? [statement.name.name] : [])]);

  function importedExportName(alias: string, exportName: string): string {
    return importedInternalName([alias, exportName], reservedImportedNames);
  }

  function importedMethodInternalName(alias: string, receiverType: string | null, exportName: string, paramCount: number): string {
    return importedInternalName(receiverType ? [alias, receiverType, exportName, String(paramCount)] : [alias, exportName, String(paramCount)], reservedImportedNames);
  }

  function importedTypeName(alias: string, typeName: string): string {
    return importedInternalName([alias, 'type', typeName], reservedImportedNames);
  }

  function currentImportedAlias(): string | undefined {
    return (activeFunctionName ? ctx.importedFunctionOwners.get(activeFunctionName) : undefined) ?? options.importedAliasContext;
  }

  function sameImportedLibraryFunctionName(calleeName: string): string | undefined {
    const alias = currentImportedAlias();
    if (!alias) return undefined;
    return ctx.importedLocalFunctions.get(`${alias}.${calleeName}`);
  }

  function sameImportedLibraryMethodOverloads(methodName: string): ImportedMethodOverloadInfo[] | undefined {
    const alias = currentImportedAlias();
    if (!alias) return undefined;
    const overloads = ctx.importedLocalMethods.get(`${alias}.${methodName}`);
    return overloads && overloads.length > 0 ? overloads : undefined;
  }

  function receiverTypeName(fn: FunctionDeclaration): string | null {
    const annotation = fn.params[0]?.typeAnnotation;
    if (!annotation) return null;
    return annotation.baseType === 'udt' ? annotation.name : annotation.baseType;
  }

  function registerFunctionInfo(name: string, fn: FunctionDeclaration, importedAlias?: string): void {
    if (importedAlias) ctx.importedFunctionOwners.set(name, importedAlias);
    const params = fn.params.map((p) => p.name);
    const paramDefaults = fn.params.map((p) => p.defaultValue);
    // Defaults are emitted even when the caller supplies no expression to walk.
    // Capture their bar dependencies before onBar decides which fields to push.
    for (const defaultExpr of paramDefaults) {
      if (defaultExpr) walkExpr(defaultExpr);
    }
    functionBodies.set(name, fn.body);
    ctx.funcInfos.set(name, {
      name,
      params,
      paramTypes: fn.params.map((p) => p.typeAnnotation),
      paramDefaults,
      paramTypeAnnotations: fn.params.map((param) => param.typeAnnotation),
      body: fn.body,
      hasTACalls: false,
      hasSeriesVars: false,
      callSiteCount: 0,
      calledFromLocalScope: false,
    });
  }

  const localMethodSignatures = new Map<string, Map<string, string>>();

  function localMethodInternalName(receiverType: string | null, methodName: string, declaration: FunctionDeclaration): string {
    const baseName = `${receiverType ?? 'any'}__${methodName}__${declaration.params.length}`;
    const signature = JSON.stringify(declaration.params.map((parameter) => parameter.typeAnnotation), (key, value) => key === 'loc' ? undefined : value);
    const signatures = localMethodSignatures.get(baseName) ?? new Map<string, string>();
    const existingName = signatures.get(signature);
    if (existingName) return existingName;
    const internalName = signatures.size === 0 ? baseName : `${baseName}$overload${signatures.size}`;
    signatures.set(signature, internalName);
    localMethodSignatures.set(baseName, signatures);
    return internalName;
  }

  function userFunctionInternalName(functionName: string, paramCount: number): string {
    return userFunctionCounts.get(functionName) && userFunctionCounts.get(functionName)! > 1
      ? `${functionName}$arity${paramCount}`
      : functionName;
  }

  function inferReturnedTupleArity(node: Expression | IfStatement | Statement[]): number | undefined {
    if (Array.isArray(node)) {
      const tail = node.at(-1);
      return tail?.type === 'ExpressionStatement' ? inferReturnedTupleArity(tail.expression)
        : tail?.type === 'IfStatement' ? inferReturnedTupleArity(tail) : undefined;
    }
    if (node.type === 'ArrayExpression') return node.elements.length;
    const arities = node.type === 'IfStatement'
      ? [inferReturnedTupleArity(node.consequent), node.alternate ? inferReturnedTupleArity(node.alternate) : undefined]
      : node.type === 'SwitchExpression' ? node.cases.map((entry) => inferReturnedTupleArity(entry.consequent)) : [];
    return arities[0] && arities.every((arity) => arity === arities[0]) ? arities[0] : undefined;
  }

  function inferExpressionTupleArity(expr: Expression): number | undefined {
    const directArity = inferReturnedTupleArity(expr);
    if (directArity !== undefined) return directArity;
    if (expr.type !== 'CallExpression') return undefined;

    const fullName = resolveDependencyMember(resolveCallee(expr.callee).fullName, activeFunctionName, ctx.importedDependencyScopes);
    const functionName = ctx.resolvedUserFunctionCalls.get(expr) ?? ctx.importedFunctions.get(fullName)
      ?? (expr.callee.type === 'Identifier' ? userFunctionInternalName(fullName, expr.arguments.length) : undefined);
    const body = functionName ? functionBodies.get(functionName) : undefined;
    if (!body) return undefined;
    return inferReturnedTupleArity(body);
  }

  function walkFunctionBody(name: string, params: string[], body: Expression | Statement[]): void {
    const previousFunctionName = activeFunctionName;
    const previousFunctionParams = activeFunctionParams;
    const previousFunctionLocals = activeFunctionLocals;
    const previousFunctionPriorLocalStatements = activeFunctionPriorLocalStatements;
    activeFunctionName = name;
    activeFunctionParams = new Set(params);
    activeFunctionLocals = Array.isArray(body) ? collectFunctionLocalNames(body) : new Set();
    activeFunctionPriorLocalStatements = [];
    builtinDeclarationScopes?.push(new Set(params));
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
      builtinDeclarationScopes?.pop();
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
      ...ctx.capturedParams,
      ...(activeFunctionParams ?? []),
      ...(activeFunctionLocals ?? []),
      ...activeLoopExpressionForbiddenNames(),
    ]);
  }

  function localDeclarationNames(stmt: Statement): string[] {
    if (stmt.type !== 'VariableDeclaration') return [];
    if (stmt.names.type === 'VariableDeclarator') return [stmt.names.name.name];
    return stmt.names.names.map((name) => name.name).filter((name) => name !== '_');
  }

  function collectBlockLocalNames(body: Statement[], extras: string[] = []): Set<string> {
    const locals = new Set(extras);
    for (const stmt of body) {
      for (const name of localDeclarationNames(stmt)) locals.add(name);
    }
    return locals;
  }

  function hasActiveLocalName(name: string): boolean {
    for (let i = localNameScopeStack.length - 1; i >= 0; i--) {
      if (localNameScopeStack[i].has(name)) return true;
    }
    return false;
  }

  function hasUserDeclarationName(name: string): boolean {
    return hasActiveLocalName(name)
      || rootDeclaredNames.has(name)
      || Boolean(activeFunctionParams?.has(name))
      || Boolean(activeFunctionLocals?.has(name));
  }

  function isUnavailableBuiltinReference(name: string): boolean {
    return !isPineBuiltinGlobalAvailable(ast.version, name)
      && !builtinDeclarationScopes?.some((scope) => scope.has(name));
  }

  function walkScopedStatements(body: Statement[], extras: string[] = []): void {
    localNameScopeStack.push(collectBlockLocalNames(body, extras));
    const priorStatementCount = activeFunctionPriorLocalStatements?.length ?? 0;
    builtinDeclarationScopes?.push(new Set(extras));
    try {
      for (const stmt of body) walkStmt(stmt);
    } finally {
      localNameScopeStack.pop();
      if (activeFunctionPriorLocalStatements) activeFunctionPriorLocalStatements.length = priorStatementCount;
      builtinDeclarationScopes?.pop();
    }
  }

  function localWrittenNames(stmt: Statement): string[] {
    switch (stmt.type) {
      case 'VariableDeclaration':
        return localDeclarationNames(stmt);
      case 'AssignmentStatement':
        return stmt.left.type === 'Identifier' ? [stmt.left.name] : [];
      case 'TupleAssignment':
        return stmt.names.map(name => name.name);
      case 'MultiDeclaration':
        return stmt.declarations.flatMap(localWrittenNames);
      case 'IfStatement':
        return [
          ...stmt.consequent.flatMap(localWrittenNames),
          ...(Array.isArray(stmt.alternate)
            ? stmt.alternate.flatMap(localWrittenNames)
            : stmt.alternate ? localWrittenNames(stmt.alternate) : []),
        ];
      case 'ForStatement':
      case 'WhileStatement':
      case 'OnceStatement':
        return stmt.body.flatMap(localWrittenNames);
      default:
        return [];
    }
  }

  function registerPriorLocalStatement(stmt: Statement): void {
    if (activeFunctionPriorLocalStatements && localWrittenNames(stmt).length > 0) {
      activeFunctionPriorLocalStatements.push(stmt);
    }
  }

  function collectRequestCaptures(expression: Expression): { params: string[]; locals: Statement[] } {
    if (!activeFunctionName && loopExpressionForbiddenStack.length === 0 && ctx.capturedParams.size === 0) return { params: [], locals: [] };
    const params = new Set([...ctx.capturedParams, ...(activeFunctionParams ?? []), ...activeLoopExpressionForbiddenNames()]);
    const localStatements = activeFunctionPriorLocalStatements ?? [];
    const captureNames = activeRequestCaptureNames();
    const pending = [...collectReferencedNames(expression, captureNames)];
    const paramNames = new Set<string>();
    const visitedNames = new Set<string>();
    const selectedStatements = new Set<Statement>();

    while (pending.length > 0) {
      const name = pending.pop()!;
      if (visitedNames.has(name)) continue;
      visitedNames.add(name);
      if (params.has(name)) {
        paramNames.add(name);
        continue;
      }
      for (const stmt of localStatements) {
        if (!localWrittenNames(stmt).includes(name)) continue;
        selectedStatements.add(stmt);
        for (const dependency of collectReferencedNames([stmt], captureNames)) {
          if (!visitedNames.has(dependency)) pending.push(dependency);
        }
      }
    }

    return {
      params: [...paramNames].sort(),
      locals: localStatements.filter(stmt => selectedStatements.has(stmt)),
    };
  }

  function activeLoopExpressionForbiddenNames(): Set<string> {
    const names = new Set<string>();
    for (const scopeNames of loopExpressionForbiddenStack) {
      for (const name of scopeNames) names.add(name);
    }
    return names;
  }

  function collectLoopMutableNames(body: Statement[], counters: string[]): Set<string> {
    const names = new Set(counters);
    const visit = (stmt: Statement): void => {
      if (stmt.type === 'VariableDeclaration') {
        for (const name of localDeclarationNames(stmt)) names.add(name);
        if (stmt.init.type === 'IfStatement') visit(stmt.init);
        return;
      }
      if (stmt.type === 'MultiDeclaration') {
        for (const declaration of stmt.declarations) visit(declaration);
        return;
      }
      if (stmt.type === 'AssignmentStatement') {
        if (stmt.left.type === 'Identifier') names.add(stmt.left.name);
        if (stmt.right.type === 'IfStatement') visit(stmt.right);
        return;
      }
      if (stmt.type === 'MultiAssignment') {
        for (const assignment of stmt.assignments) visit(assignment);
        return;
      }
      if (stmt.type === 'IfStatement') {
        for (const child of stmt.consequent) visit(child);
        if (Array.isArray(stmt.alternate)) {
          for (const child of stmt.alternate) visit(child);
        } else if (stmt.alternate) {
          visit(stmt.alternate);
        }
        return;
      }
      if (stmt.type === 'OnceStatement') {
        for (const child of stmt.body) visit(child);
        return;
      }
      if (stmt.type === 'ForStatement') {
        names.add(stmt.counter.name);
        if (stmt.kind === 'collection' && stmt.indexCounter) names.add(stmt.indexCounter.name);
        for (const child of stmt.body) visit(child);
        return;
      }
      if (stmt.type === 'WhileStatement') {
        for (const child of stmt.body) visit(child);
      }
    };
    for (const stmt of body) visit(stmt);
    return names;
  }

  function registerImportedLibrary(stmt: Extract<Statement, { type: 'ImportDeclaration' }>): void {
    const importKey = `${stmt.alias.name}\u0000${stmt.path}`;
    if (registeredImportKeys.has(importKey)) return;
    registeredImportKeys.add(importKey);

    const officialLibrary = getOfficialTradingViewLibrary(stmt.path);
    const libraryAst = officialLibrary?.program ?? options.libraries?.get(stmt.path);
    if (officialLibrary && !officialLibrary.program) {
      ctx.importedNamespaces.add(stmt.alias.name);
      for (const fn of officialLibrary.functions.values()) {
        if (fn.runtimeName) ctx.officialLibraryFunctions.set(`${stmt.alias.name}.${fn.name}`, fn.runtimeName);
      }
      return;
    }

    if (!libraryAst) {
      ctx.importDiagnostics.push(`import not found in deterministic library registry: ${stmt.path} as ${stmt.alias.name}`);
      ctx.importedNamespaces.add(stmt.alias.name);
      return;
    }

    const dependencyScope = new Map<string, string>();
    for (const libraryStmt of libraryAst.body) {
      if (libraryStmt.type !== 'ImportDeclaration') continue;
      const alias = dependencyNamespace(libraryStmt.alias.name, libraryStmt.path);
      dependencyScope.set(libraryStmt.alias.name, alias);
      registerImportedLibrary({ ...libraryStmt, alias: { ...libraryStmt.alias, name: alias } });
    }

    ctx.importedNamespaces.add(stmt.alias.name);
    if (officialLibrary) {
      for (const fn of officialLibrary.functions.values()) {
        if (fn.runtimeName?.startsWith('TradingView.')) {
          ctx.officialLibraryFunctions.set(`${stmt.alias.name}.${fn.name}`, fn.runtimeName);
        }
      }
    }

    for (const libraryStmt of libraryAst.body) {
      if (libraryStmt.type === 'TypeDeclaration') {
        const fields = libraryStmt.fields.map((f) => ({
          name: f.name.name,
          defaultExpr: f.defaultValue ?? null,
          varip: f.varip ?? false,
        }));
        const runtimeName = `${stmt.alias.name}.${libraryStmt.name.name}`;
        const typeInfo = { name: runtimeName, fields, node: libraryStmt };
        const localKey = importedTypeName(stmt.alias.name, libraryStmt.name.name);
        ctx.typeDecls.set(localKey, typeInfo);
        ctx.importedLocalTypes.set(`${stmt.alias.name}.${libraryStmt.name.name}`, localKey);
        if (libraryStmt.exported) {
          ctx.typeDecls.set(runtimeName, typeInfo);
        }
      }
    }

    const importedFunctionNames = new Map<FunctionDeclaration, string>();
    const importedFunctionCounts = new Map<string, number>();
    for (const declaration of libraryAst.body) {
      if (declaration.type === 'FunctionDeclaration' && !declaration.isMethod) {
        importedFunctionCounts.set(declaration.name.name, (importedFunctionCounts.get(declaration.name.name) ?? 0) + 1);
      }
    }
    const importedFunctionIndices = new Map<string, number>();
    for (const declaration of libraryAst.body) {
      if (declaration.type !== 'FunctionDeclaration' || declaration.isMethod) continue;
      const name = declaration.name.name;
      const ordinal = importedFunctionIndices.get(name) ?? 0;
      importedFunctionIndices.set(name, ordinal + 1);
      const base = importedExportName(stmt.alias.name, name);
      importedFunctionNames.set(
        declaration,
        importedFunctionCounts.get(name) === 1 ? base : `${base}$overload${ordinal}`,
      );
    }

    for (const libraryStmt of libraryAst.body) {
      if (libraryStmt.type === 'FunctionDeclaration') {
        if (libraryStmt.isMethod) {
          const receiverType = receiverTypeName(libraryStmt);
          const internalName = importedMethodInternalName(
            stmt.alias.name,
            receiverType,
            libraryStmt.name.name,
            libraryStmt.params.length,
          );
          const localOverload = {
            receiverType: receiverType ? importedTypeName(stmt.alias.name, receiverType) : null,
            internalName,
          };
          const publicOverload = {
            receiverType: receiverType ? `${stmt.alias.name}.${receiverType}` : null,
            internalName,
          };
          const localOverloads = ctx.importedLocalMethods.get(`${stmt.alias.name}.${libraryStmt.name.name}`) ?? [];
          localOverloads.push(localOverload);
          ctx.importedLocalMethods.set(`${stmt.alias.name}.${libraryStmt.name.name}`, localOverloads);
          if (libraryStmt.exported) {
            ctx.importedMethods.set(libraryStmt.name.name, internalName);
            const overloads = ctx.importedMethodOverloads.get(libraryStmt.name.name) ?? [];
            overloads.push(publicOverload);
            ctx.importedMethodOverloads.set(libraryStmt.name.name, overloads);
          }
          registerFunctionInfo(internalName, libraryStmt, stmt.alias.name);
        } else {
          const internalName = importedFunctionNames.get(libraryStmt)!;
          ctx.importedLocalFunctions.set(`${stmt.alias.name}.${libraryStmt.name.name}`, internalName);
          if (libraryStmt.exported) {
            ctx.importedFunctions.set(`${stmt.alias.name}.${libraryStmt.name.name}`, internalName);
          }
          registerFunctionInfo(internalName, libraryStmt, stmt.alias.name);
        }
      }
    }

    if ([...importedFunctionCounts.values()].some((count) => count > 1) || dependencyScope.size > 0) {
      for (const program of [ast, libraryAst]) {
        const declarations = checkProgram(program, { libraries: options.libraries }).userFunctionCallDeclarations;
        for (const [call, declaration] of declarations) {
          let name = importedFunctionNames.get(declaration);
          if (!name && program === libraryAst) {
            const namespace = resolveCallee(call.callee).namespace;
            const dependencyOwner = namespace ? dependencyScope.get(namespace) : undefined;
            if (dependencyOwner) {
              name = [...ctx.funcInfos].find(([internalName, info]) =>
                ctx.importedFunctionOwners.get(internalName) === dependencyOwner && info.body === declaration.body
              )?.[0];
            }
          }
          if (name) ctx.resolvedUserFunctionCalls.set(call, name);
        }
      }
    }

    for (const libraryStmt of libraryAst.body) {
      if (libraryStmt.type === 'FunctionDeclaration') {
        const internalName = libraryStmt.isMethod
          ? importedMethodInternalName(stmt.alias.name, receiverTypeName(libraryStmt), libraryStmt.name.name, libraryStmt.params.length)
          : importedFunctionNames.get(libraryStmt)!;
        const localNames = Array.isArray(libraryStmt.body) ? collectFunctionLocalNames(libraryStmt.body) : new Set<string>();
        for (const parameter of libraryStmt.params) localNames.add(parameter.name);
        ctx.importedDependencyScopes.set(internalName, new Map([...dependencyScope].filter(([alias]) => !localNames.has(alias))));
        walkFunctionBody(internalName, libraryStmt.params.map((p) => p.name), libraryStmt.body);
        continue;
      }

      if (libraryStmt.type === 'TypeDeclaration') {
        for (const f of libraryStmt.fields) {
          if (f.defaultValue) walkExpr(f.defaultValue);
        }
        continue;
      }

      if (libraryStmt.type === 'EnumDeclaration' && libraryStmt.exported) {
        registerImportedEnum(stmt.path, stmt.alias.name, libraryStmt);
        continue;
      }

      if (
        libraryStmt.type === 'VariableDeclaration' &&
        libraryStmt.exported &&
        libraryStmt.names.type === 'VariableDeclarator'
      ) {
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
    if (expr.type === 'CallExpression') {
      for (const arg of expr.arguments) ctx.requestSourceCaptures.set(arg.value, collectRequestCaptures(arg.value));
    }
    switch (expr.type) {
      case 'IndexExpression': {
        walkExpr(expr.index);
        const staticOffset = extractStaticNumber(expr.index);
        if (staticOffset !== null && Number.isFinite(staticOffset) && staticOffset >= 0) {
          ctx.maxStaticHistoryOffset = Math.max(ctx.maxStaticHistoryOffset, Math.trunc(staticOffset));
        }
        if (expr.object.type === 'MemberExpression' && expr.object.object.type === 'Identifier') {
          const fullName = `${expr.object.object.name}.${expr.object.property.name}`;
          if (Object.prototype.hasOwnProperty.call(TA_VAR_CLASS_MAP, fullName)) {
            registerTAVarSite(expr.object, fullName);
            break;
          }
        }
        walkExpr(expr.object);
        if (expr.object.type === 'Identifier') {
          const name = expr.object.name;
          const taVarName = canonicalTAVarName(name, ast.version);
          if (taVarName && !hasUserDeclarationName(name)) {
            registerTAVarSite(expr.object, taVarName);
          } else if (hasUserDeclarationName(name)) {
            ctx.seriesVars.add(name);
          } else if (BAR_FIELDS.has(name)) {
            ctx.barFieldSeriesVars.add(name);
          } else {
            ctx.seriesVars.add(name);
          }
        }
        break;
      }
      case 'CallExpression': {
        const resolved = resolveCallee(expr.callee);
        const fullName = resolveDependencyMember(resolved.fullName, activeFunctionName, ctx.importedDependencyScopes);
        const namespace = fullName.split('.')[0] ?? '';
        if (!hasUserDeclarationName('timeframe')) {
          const refusal = tradingViewTimeframeCompileRefusal(expr, ast.version);
          if (refusal) addUnsupported(refusal);
        }
        if (fullName === 'max_bars_back') {
          const target = orderedCallExprArg(expr.arguments, ['var', 'num'], 0);
          const depth = extractStaticNumber(orderedCallExprArg(expr.arguments, ['var', 'num'], 1));
          if (target?.type === 'Identifier' && DERIVED_PRICE_BUILTINS.has(target.name) && !hasUserDeclarationName(target.name)) {
            addUnsupported(`max_bars_back cannot target derived builtin ${target.name}; size its underlying series instead`);
          }
          if (target?.type === 'Identifier' && depth !== null && Number.isFinite(depth) && depth >= 0) {
            ctx.maxBarsBackHints.set(
              target.name,
              Math.max(ctx.maxBarsBackHints.get(target.name) ?? 0, Math.trunc(depth)),
            );
          }
        }
        const isBareUserFunctionCall = expr.callee.type === 'Identifier' && ctx.funcInfos.has(fullName);
        const importedFunctionName = ctx.resolvedUserFunctionCalls.get(expr) ?? ctx.importedFunctions.get(fullName);
        const officialRuntimeName = ctx.officialLibraryFunctions.get(fullName);
        const taFullName = isBareUserFunctionCall || importedFunctionName ? fullName : canonicalTACallName(officialRuntimeName ?? fullName);
        const taNamespace = taFullName.split('.')[0] ?? '';

        if (UNSUPPORTED_REQUEST_FUNCS.has(fullName)) {
          addUnsupported(`${fullName} not yet supported by transpiler`);
        }

        if (fullName === 'request.security' || fullName === 'security' || fullName === 'request.security_lower_tf') {
          const isLowerTf = fullName === 'request.security_lower_tf';
          const requestArgs = isLowerTf
            ? ['symbol', 'timeframe', 'expression', 'ignore_invalid_symbol', 'currency', 'ignore_invalid_timeframe', 'calc_bars_count'] as const
            : ['symbol', 'timeframe', 'expression', 'gaps', 'lookahead', 'ignore_invalid_symbol', 'currency', 'calc_bars_count'] as const;
          const routingArgs = fullName === 'security' && pineVersionRules(ast.version).allowsLegacyGlobalBuiltinAliases
            ? expr.arguments.map((arg) => arg.name?.name === 'resolution' ? { ...arg, name: { ...arg.name, name: 'timeframe' } } : arg)
            : expr.arguments;
          const symbolExpr = orderedCallExprArg(routingArgs, requestArgs, 0);
          const timeframeExpr = orderedCallExprArg(routingArgs, requestArgs, 1);
          const expressionExpr = orderedCallExprArg(routingArgs, requestArgs, 2);
          const gapsExpr = isLowerTf ? null : orderedCallExprArg(routingArgs, requestArgs, 3) ?? null;
          const lookaheadExpr = isLowerTf ? null : orderedCallExprArg(routingArgs, requestArgs, 4) ?? null;
          const ignoreInvalidSymbolExpr = orderedCallExprArg(routingArgs, requestArgs, isLowerTf ? 3 : 5) ?? null;
          const currencyExpr = orderedCallExprArg(routingArgs, requestArgs, isLowerTf ? 4 : 6) ?? null;
          const ignoreInvalidTimeframeExpr = isLowerTf ? orderedCallExprArg(routingArgs, requestArgs, 5) ?? null : null;
          const calcBarsCountExpr = orderedCallExprArg(routingArgs, requestArgs, isLowerTf ? 6 : 7) ?? null;
          if (symbolExpr && timeframeExpr && expressionExpr) {
            const taCallSitesBefore = ctx.taCallSites.length;
            walkExpr(symbolExpr);
            walkExpr(timeframeExpr);
            requestExpressionDepth += 1;
            try {
              walkExpr(expressionExpr);
            } finally {
              requestExpressionDepth -= 1;
            }
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
            if (loopExpressionForbiddenStack.length > 0) {
              const loopDeps = collectReferencedNames(expressionExpr, activeLoopExpressionForbiddenNames());
              if (loopDeps.size > 0) {
                addUnsupported('request.* expression in loop scopes cannot depend on loop variables or loop-mutated values');
              }
            }
            const expressionCaptures = expressionSourceParam ? { params: [], locals: [] } : collectRequestCaptures(expressionExpr);
            const securityTASites = ctx.taCallSites.slice(taCallSitesBefore)
              .filter((site) => containsNode(expressionExpr, site.node));
            // Remove security-expression TAs from global list — they belong
            // only in the security evaluator, not the main class
            const securityNodeSet = new Set(securityTASites.map((s) => s.node));
            ctx.taCallSites = ctx.taCallSites.filter((s) => !securityNodeSet.has(s.node));
            for (const s of securityTASites) ctx.taCallSiteMap.delete(s.node);
            const wrappedFunctionRequestAllowed = activeFunctionName !== null
              && options.importedAliasContext === undefined
              && versionRules.allowsNonExportedFunctionRequestsWithoutDynamicRequests;
            const requiresDynamicRequestsReason =
              requestExpressionDepth > 0 ? 'nested-request'
                : localScopeDepth > 0 && !wrappedFunctionRequestAllowed ? 'local-scope'
                  : conditionalOperandDepth > 0 && !versionRules.allowsConditionalOperandRequestsWithoutDynamicRequests ? 'conditional-operand'
                    : undefined;
            const secId = ctx.securitySites.length;
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
              ownerFunctionName: activeFunctionName ?? undefined,
              expressionSourceParam,
              expressionCaptureParams: expressionCaptures.params.length > 0 ? expressionCaptures.params : undefined,
              expressionLocalStatements: expressionCaptures.locals.length > 0 ? expressionCaptures.locals : undefined,
              expressionTupleArity: inferExpressionTupleArity(expressionExpr),
              importedAliasContext: currentImportedAlias(),
              requiresDynamicRequestsReason,
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
            if (loopExpressionForbiddenStack.length > 0) {
              const loopDeps = collectReferencedNames(expressionExpr, activeLoopExpressionForbiddenNames());
              if (loopDeps.size > 0) {
                addUnsupported('request.* expression in loop scopes cannot depend on loop variables or loop-mutated values');
              }
            }
            const expressionCaptures = expressionSourceParam ? { params: [], locals: [] } : collectRequestCaptures(expressionExpr);
            const securityTASites = ctx.taCallSites.slice(taCallSitesBefore)
              .filter((site) => containsNode(expressionExpr, site.node));
            const securityNodeSet = new Set(securityTASites.map((s) => s.node));
            ctx.taCallSites = ctx.taCallSites.filter((s) => !securityNodeSet.has(s.node));
            for (const s of securityTASites) ctx.taCallSiteMap.delete(s.node);
            const secId = ctx.securitySites.length;
            ctx.securitySites.push({
              id: secId,
              kind: 'seed',
              sourceExpr,
              symbolExpr,
              timeframeExpr: symbolExpr,
              expressionExpr,
              expressionTupleArity: inferExpressionTupleArity(expressionExpr),
              gapsExpr: null,
              lookaheadExpr: null,
              ignoreInvalidSymbolExpr,
              currencyExpr: null,
              ignoreInvalidTimeframeExpr: null,
              calcBarsCountExpr,
              taCallSites: securityTASites,
              node: expr,
              ownerFunctionName: activeFunctionName ?? undefined,
              expressionSourceParam,
              expressionCaptureParams: expressionCaptures.params.length > 0 ? expressionCaptures.params : undefined,
              expressionLocalStatements: expressionCaptures.locals.length > 0 ? expressionCaptures.locals : undefined,
              importedAliasContext: currentImportedAlias(),
            });
          }
          break;
        }

        if (taNamespace === 'ta' && !importedFunctionName && !Object.prototype.hasOwnProperty.call(TA_CLASS_MAP, taFullName) && !ctx.officialLibraryFunctions.has(taFullName)) {
          addUnsupported(`${taFullName} not yet supported by transpiler`);
        }

        if (Object.prototype.hasOwnProperty.call(TA_CLASS_MAP, taFullName)) {
          const info = TA_CLASS_MAP[taFullName];
          const canonicalArgs = canonicalBuiltinArguments(expr.arguments, taFullName, ast.version);
          const ctorArgs = extractCtorArgs(taFullName, canonicalArgs);
          const requiredCtorArgCount = REQUIRED_STATIC_TA_CTOR_ARG_COUNTS[taFullName] ?? 0;
          const dynamicCtorArgExprs = ctorArgs.length < requiredCtorArgCount
            ? extractCtorArgExprs(taFullName, canonicalArgs)
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
            computeArgExprs: extractComputeArgs(taFullName, canonicalArgs, ast.version),
            truncateTimeframeRatioLength: ctx.pineVersion === 5 && taFullName === 'ta.highest'
              && !activeFunctionName && Boolean(dynamicCtorArgExprs?.[0]
                && isTimeframeSecondsRatio(dynamicCtorArgExprs[0], (name) => highestTimeframeRatioNames.has(name))),
            returnsTuple,
            tupleFields: taFullName === 'ta.vwap' ? ['middle', 'upper', 'lower'] : info.tupleFields,
            node: expr,
          };
          for (const arg of site.computeArgExprs) {
            if (arg.type === 'Identifier' && !BAR_FIELDS.has(arg.name)) {
              ctx.seriesVars.add(arg.name);
            }
          }
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
            plotCount: fullName === 'hline' ? 0 : 1,
            funcCallIndex,
            funcName: fullName,
            node: expr,
          });
        }

        const sameLibraryFunction = expr.callee.type === 'Identifier'
          ? sameImportedLibraryFunctionName(fullName)
          : undefined;
        const methodNames = expr.callee.type === 'MemberExpression' && !ctx.funcInfos.has(expr.callee.property.name)
          ? ((sameImportedLibraryMethodOverloads(expr.callee.property.name) ?? ctx.importedMethodOverloads.get(expr.callee.property.name))?.map((overload) => overload.internalName)
            ?? (ctx.importedMethods.has(expr.callee.property.name) ? [ctx.importedMethods.get(expr.callee.property.name)!] : []))
          : [];
        const callableNames =
          methodNames.length > 0
          ? methodNames
            : [
                ctx.resolvedUserFunctionCalls.get(expr) ??
                  ctx.importedFunctions.get(fullName) ??
                  sameLibraryFunction ??
                  fullName,
              ];
        for (const callableName of callableNames) {
          if (ctx.funcInfos.has(callableName)) {
            const fi = ctx.funcInfos.get(callableName)!;
            fi.callSiteCount++;
            fi.calledFromLocalScope ||= localScopeDepth > 0;
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
        if (expr.operator === 'and' || expr.operator === 'or') {
          conditionalOperandDepth += 1;
          try {
            walkExpr(expr.left);
            walkExpr(expr.right);
          } finally {
            conditionalOperandDepth -= 1;
          }
          break;
        }
        walkExpr(expr.left);
        walkExpr(expr.right);
        break;
      case 'UnaryExpression':
        walkExpr(expr.argument);
        break;
      case 'ConditionalExpression':
        walkExpr(expr.test);
        conditionalOperandDepth += 1;
        try {
          walkExpr(expr.consequent);
          walkExpr(expr.alternate);
        } finally {
          conditionalOperandDepth -= 1;
        }
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
          if (Object.prototype.hasOwnProperty.call(TA_VAR_CLASS_MAP, fullName)) {
            registerTAVarSite(expr, fullName);
            break;
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
        {
          if (isUnavailableBuiltinReference(expr.name)) {
            addUnsupported(`Unknown identifier: ${expr.name}`);
            break;
          }
          const taVarName = canonicalTAVarName(expr.name, ast.version);
          if (taVarName && !hasUserDeclarationName(expr.name)) {
            registerTAVarSite(expr, taVarName);
            break;
          }
        }
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

  function registerTAVarSite(node: Expression, fullName: string): void {
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
    const priorStatementCount = activeFunctionPriorLocalStatements?.length ?? 0;
    walkStatementContents(stmt);
    if (activeFunctionPriorLocalStatements) activeFunctionPriorLocalStatements.length = priorStatementCount;
    registerPriorLocalStatement(stmt);
  }

  function walkStatementContents(stmt: Statement): void {
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
        const inputSiteStart = ctx.inputSites.length;
        if (!activeFunctionName && stmt.names.type === 'VariableDeclarator') {
          const name = stmt.names.name.name;
          if (!stmt.typeAnnotation && stmt.init.type !== 'IfStatement'
            && isTimeframeSecondsRatio(stmt.init, (alias) => highestTimeframeRatioNames.has(alias))) {
            highestTimeframeRatioNames.add(name);
          } else highestTimeframeRatioNames.delete(name);
        }
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
        if (stmt.names.type === 'VariableDeclarator') {
          for (const site of ctx.inputSites.slice(inputSiteStart)) site.defaultTitle ??= stmt.names.name.name;
        }
        registerPriorLocalStatement(stmt);
        if (builtinDeclarationScopes) {
          for (const name of localDeclarationNames(stmt)) builtinDeclarationScopes.at(-1)?.add(name);
        }
        break;
      }
      case 'AssignmentStatement':
        if (stmt.left.type === 'Identifier') highestTimeframeRatioNames.delete(stmt.left.name);
        if (stmt.right.type === 'IfStatement') {
          walkStmt(stmt.right);
        } else {
          walkExpr(stmt.right);
        }
        if (stmt.left.type !== 'Identifier') {
          walkExpr(stmt.left);
        } else if (isUnavailableBuiltinReference(stmt.left.name)) {
          addUnsupported(`Unknown identifier: ${stmt.left.name}`);
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
        localScopeDepth += 1;
        try {
          walkScopedStatements(stmt.consequent);
          if (stmt.alternate) {
            if (Array.isArray(stmt.alternate)) {
              walkScopedStatements(stmt.alternate);
            } else {
              walkStmt(stmt.alternate);
            }
          }
        } finally {
          localScopeDepth -= 1;
        }
        break;
      case 'OnceStatement':
        if (stmt.test) walkExpr(stmt.test);
        localScopeDepth += 1;
        try {
          walkScopedStatements(stmt.body);
        } finally {
          localScopeDepth -= 1;
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
        localScopeDepth += 1;
        loopExpressionForbiddenStack.push(collectLoopMutableNames(
          stmt.body,
          stmt.kind === 'collection' && stmt.indexCounter
            ? [stmt.counter.name, stmt.indexCounter.name]
            : [stmt.counter.name],
        ));
        try {
          walkScopedStatements(
            stmt.body,
            stmt.kind === 'collection' && stmt.indexCounter
              ? [stmt.counter.name, stmt.indexCounter.name]
              : [stmt.counter.name],
          );
        } finally {
          loopExpressionForbiddenStack.pop();
          localScopeDepth -= 1;
        }
        break;
      case 'WhileStatement':
        walkExpr(stmt.test);
        localScopeDepth += 1;
        try {
          walkScopedStatements(stmt.body);
        } finally {
          localScopeDepth -= 1;
        }
        break;
      case 'FunctionDeclaration': {
        if (stmt.isMethod) {
          const receiverType = receiverTypeName(stmt);
          const internalName = localMethodInternalName(receiverType, stmt.name.name, stmt);
          const overloads = ctx.localMethodOverloads.get(stmt.name.name) ?? [];
          overloads.push({ receiverType, internalName });
          ctx.localMethodOverloads.set(stmt.name.name, overloads);
          registerFunctionInfo(internalName, stmt);
          walkFunctionBody(internalName, stmt.params.map((p) => p.name), stmt.body);
        } else {
          const internalName = userFunctionNames.get(stmt)!;
          if (internalName !== stmt.name.name) {
            const overloads = ctx.userFunctionOverloads.get(stmt.name.name) ?? [];
            overloads.push(internalName);
            ctx.userFunctionOverloads.set(stmt.name.name, overloads);
          }
          registerFunctionInfo(internalName, stmt);
          walkFunctionBody(internalName, stmt.params.map((p) => p.name), stmt.body);
        }
        break;
      }
      case 'ImportDeclaration': {
        registerImportedLibrary(stmt);
        break;
      }
      case 'LibraryDeclaration': {
        let title = '';
        if (stmt.title.type === 'StringLiteral') title = stmt.title.value;
        ctx.declarationInfo = {
          kind: 'library',
          title,
          node: stmt,
        };
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

  const declarationConstants = new Map<string, Expression>();
  for (const stmt of ast.body) {
    if (stmt.type === 'VariableDeclaration' && stmt.typeAnnotation?.qualifier === 'const'
      && stmt.names.type === 'VariableDeclarator' && stmt.init.type !== 'IfStatement') {
      declarationConstants.set(stmt.names.name.name, stmt.init);
    }
    walkStmt(stmt);
  }
  if (ctx.declarationInfo) ctx.declarationInfo.constantExpressions = declarationConstants;

  for (const site of ctx.securitySites) {
    if (!site.ownerFunctionName || versionRules.allowsNonExportedFunctionRequestsWithoutDynamicRequests) continue;
    const owner = ctx.funcInfos.get(site.ownerFunctionName);
    if (owner?.calledFromLocalScope && !site.requiresDynamicRequestsReason) {
      site.requiresDynamicRequestsReason = 'local-scope';
    }
  }

  // Confirm actual descendants first; retain structural matching for cloned sites.
  const knownTANodes = new WeakSet(ctx.taCallSites.map((site) => site.node));
  for (const [_name, fi] of ctx.funcInfos) {
    fi.hasTACalls = membership(fi.body).calls.some((node) => knownTANodes.has(node))
      || ctx.taCallSites.some((site) => containsNode(fi.body, site.node));
    fi.hasSeriesVars = hasSeriesAccess(fi.body, ctx.seriesVars);
  }

  const legacyDeclarationDivision = !!ctx.declarationInfo && ast.version >= 4
    && !versionRules.constIntDivisionCanReturnFractional;
  if (legacyDeclarationDivision || ctx.taCallSites.some(site => ['Highest', 'Lowest', 'SMA', 'EMA', 'WMA'].includes(site.className))) {
    const prepared = options.semanticTypes?.ast === ast && options.semanticTypes.libraries === options.libraries
      ? options.semanticTypes : undefined;
    const recordedExpressionTypes = prepared?.recordedExpressionTypes ?? new WeakMap<Expression | IfStatement, SemanticType>();
    const loopResultTypes = prepared?.loopResultTypes ?? new WeakMap<ForStatement | WhileStatement, SemanticType[]>();
    const types = (prepared?.result ?? checkProgram(ast, { libraries: options.libraries, expressionTypes: recordedExpressionTypes, loopResultTypes })).expressionTypes;
    ctx.recordedExpressionTypes = recordedExpressionTypes;
    ctx.loopResultTypes = loopResultTypes;
    if (legacyDeclarationDivision && ctx.declarationInfo) ctx.declarationInfo.constantExpressionTypes = types;
    let v6Types: typeof types;
    for (const site of ctx.taCallSites) {
      if (!['Highest', 'Lowest', 'SMA', 'EMA', 'WMA'].includes(site.className)) continue;
      const args = extractCtorArgExprs(`ta.${site.className.toLowerCase()}`, canonicalBuiltinArguments(site.node.arguments, `ta.${site.className.toLowerCase()}`, ast.version));
      site.integerDivisionLength = !!args[0] && types?.get(args[0])?.integerDivision === true;
      if (ast.version === 5 && site.className === 'EMA' && site.dynamicCtorArgExprs
        && args[0] && types?.get(args[0])?.qualifier === 'const') {
        v6Types ??= checkProgram({ ...ast, version: 6 }, { libraries: options.libraries }).expressionTypes;
        site.captureInitialCtorArgs = v6Types?.get(args[0])?.qualifier === 'series';
      }
      if (site.integerDivisionLength && !site.dynamicCtorArgExprs) site.ctorArgs[0] = Math.trunc(Number(site.ctorArgs[0]));
    }
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

function extractCtorArgs(fullName: string, args: CallArgument[]): unknown[] {
  const positional = args.filter((a) => !a.name).map((a) => a.value);
  switch (fullName) {
    case 'ta.sma':
    case 'ta.sum':
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
        if (v !== null) return fullName === 'ta.ema' ? [v, true, true] : (fullName === 'ta.wma' || fullName === 'ta.rma') ? [v, true] : [v];
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
    case 'ta.stdev': {
      const names = ['source', 'length', 'biased'];
      const lengthArg = readOrderedArg(args, names, 'length', 1);
      const len = extractStaticNumber(lengthArg);
      const biasedArg = readOrderedArg(args, names, 'biased', 2);
      const biased = biasedArg ? extractStaticBoolean(biasedArg) : true;
      if (len !== null && biased !== null) return [len, biased];
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
      const useFloor = floorArg ? extractStaticBoolean(floorArg) : false;
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
      const atrPeriod = extractStaticNumber(readArg('atrPeriod', 1));
      if (atrPeriod !== null) return [atrPeriod];
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
      const names = ['source', 'anchor', 'stdev_mult'];
      const hasExplicitAnchor = Boolean(readOrderedArg(args, names, 'anchor', 1));
      const stdevMultArg = readOrderedArg(args, names, 'stdev_mult', 2);
      const ctorArgs = stdevMultArg ? [true, extractStaticNumber(stdevMultArg) ?? NaN] : [false, NaN];
      return hasExplicitAnchor ? [...ctorArgs, true] : ctorArgs;
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
      const lengthArg = readOrderedArg(args, ['source', 'length'], 'length', 1);
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
    case 'ta.sum':
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
    case 'ta.dema':
    case 'ta.tema':
    case 'ta.wma':
    case 'ta.vwma':
    case 'ta.swma':
    case 'ta.hma':
    {
      const lengthExpr = args.find((a) => a.name?.name === 'length')?.value
        ?? positional[args.some((a) => a.name?.name === 'source') ? 0 : 1];
      if (!lengthExpr) return [];
      return fullName === 'ta.ema'
        ? [lengthExpr, booleanLiteral(true), booleanLiteral(true)]
        : (fullName === 'ta.wma' || fullName === 'ta.rma') ? [lengthExpr, booleanLiteral(true)] : [lengthExpr];
    }
    case 'ta.stdev': {
      const names = ['source', 'length', 'biased'];
      const lengthExpr = readAliasedArg(names, 'length', 1);
      const biasedExpr = readAliasedArg(names, 'biased', 2) ?? booleanLiteral(true);
      return [lengthExpr, biasedExpr].filter(isDefinedExpression);
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
      const fallback = fullName === 'ta.cci' ? 20 : fullName === 'ta.mom' ? 10 : fullName === 'ta.roc' ? 1 : null;
      const namesByIndex = fullName === 'ta.cmo'
        ? [['source', 'series'], ['length']]
        : [['source'], ['length']];
      const lengthExpr = readAliasedOrderedArg(args, namesByIndex, 1) ?? (fallback === null ? undefined : numericLiteral(fallback));
      return [lengthExpr].filter(isDefinedExpression);
    }
    case 'ta.mfi': {
      const names = ['source', 'length'];
      const sourceNamed = args.find((a) => a.name?.name === 'source')?.value ?? args.find((a) => a.name?.name === 'series')?.value;
      const lengthExpr = args.find((a) => a.name?.name === 'length')?.value
        ?? positional[sourceNamed ? 0 : 1]
        ?? undefined;
      return [lengthExpr].filter(isDefinedExpression);
    }
    case 'ta.tsi': {
      const names = ['source', 'short_length', 'long_length'];
      return [
        readAliasedArg(names, 'short_length', 1),
        readAliasedArg(names, 'long_length', 2),
      ].filter(isDefinedExpression);
    }
    case 'ta.variance': {
      const names = ['source', 'length', 'biased'];
      const lengthExpr = readAliasedArg(names, 'length', 1);
      const biasedExpr = readAliasedArg(names, 'biased', 2) ?? booleanLiteral(true);
      return [lengthExpr, biasedExpr].filter(isDefinedExpression);
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
      ].filter(isDefinedExpression);
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
      ].filter(isDefinedExpression);
    }
    case 'ta.alma': {
      const names = [['source', 'series'], ['length'], ['offset'], ['sigma'], ['floor']] as const;
      return [
        readAliasedOrderedArg(args, names, 1),
        readAliasedOrderedArg(args, names, 2),
        readAliasedOrderedArg(args, names, 3),
        readAliasedOrderedArg(args, names, 4) ?? booleanLiteral(false),
      ].filter(isDefinedExpression);
    }
    case 'ta.bbw': {
      const names = ['series', 'length', 'mult'];
      return [
        readAliasedArg(names, 'length', 1),
        readAliasedArg(names, 'mult', 2),
      ].filter(isDefinedExpression);
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
      return [fast, slow, sig].filter(isDefinedExpression);
    }
    case 'ta.bb': {
      const len = args.find((a) => a.name?.name === 'length')?.value ?? positional[1];
      const mult = args.find((a) => a.name?.name === 'mult')?.value ?? positional[2];
      return [len, mult].filter(isDefinedExpression);
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
      return [len, mult, useTrueRange].filter(isDefinedExpression);
    }
    case 'ta.supertrend': {
      const names = ['factor', 'atrPeriod'];
      const readArg = (name: string, index: number): Expression | undefined => {
        const named = args.find((a) => a.name?.name === name)?.value;
        if (named) return named;
        const positionalIndex = index - names.slice(0, index).filter((param) => args.some((a) => a.name?.name === param)).length;
        return positional[positionalIndex];
      };
      return [readArg('atrPeriod', 1)].filter(isDefinedExpression);
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
      return [diLength, adxSmoothing].filter(isDefinedExpression);
    }
    case 'ta.sar': {
      const names = ['start', 'inc', 'max'];
      const readArg = (name: string, index: number): Expression | undefined => {
        const named = args.find((a) => a.name?.name === name)?.value;
        if (named) return named;
        const positionalIndex = index - names.slice(0, index).filter((param) => args.some((a) => a.name?.name === param)).length;
        return positional[positionalIndex];
      };
      return [readArg('start', 0), readArg('inc', 1), readArg('max', 2)].filter(isDefinedExpression);
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

function extractComputeArgs(fullName: string, args: CallArgument[], pineVersion: number): Expression[] {
  const positional = args.filter((a) => !a.name).map((a) => a.value);
  switch (fullName) {
    case 'ta.pivot_point_levels': {
      const names = ['type', 'anchor', 'developing'];
      const developing: Expression = readOrderedArg(args, names, 'developing', 2)
        ?? { type: 'BooleanLiteral', value: false };
      return [
        readOrderedArg(args, names, 'type', 0),
        readOrderedArg(args, names, 'anchor', 1),
        developing,
      ].filter(isDefinedExpression);
    }
    case 'ta.barssince':
      return [args.find((a) => a.name?.name === 'condition')?.value ?? positional[0]].filter(isDefinedExpression);
    case 'ta.valuewhen': {
      const hasNamedCondition = args.some((a) => a.name?.name === 'condition');
      const condition = args.find((a) => a.name?.name === 'condition')?.value ?? positional[0];
      const source = args.find((a) => a.name?.name === 'source')?.value ?? positional[hasNamedCondition ? 0 : 1];
      return [condition, source].filter(isDefinedExpression);
    }
    case 'ta.sma':
    case 'ta.sum':
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
      return [readAliasedOrderedArg(args, [['source', 'series']], 0)].filter(isDefinedExpression);
    case 'ta.vwap': {
      const sourceName = pineVersion <= 4 ? 'x' : 'source';
      const source = readOrderedArg(args, [sourceName, 'anchor', 'stdev_mult'], sourceName, 0);
      const anchor = readOrderedArg(args, ['source', 'anchor', 'stdev_mult'], 'anchor', 1);
      return [source, anchor].filter(isDefinedExpression);
    }
    case 'ta.highest':
    case 'ta.lowest': {
      const source = args.find((a) => a.name?.name === 'source')?.value ?? (positional.length >= 2 ? positional[0] : undefined);
      return [source].filter(isDefinedExpression);
    }
    case 'ta.obv': {
      const source = readOrderedArg(args, ['source', 'volume'], 'source', 0);
      const volume = readOrderedArg(args, ['source', 'volume'], 'volume', 1);
      return [source, volume].filter(isDefinedExpression);
    }
    case 'ta.bar_index':
      return [readOrderedArg(args, ['source'], 'source', 0)].filter(isDefinedExpression);
    case 'ta.macd':
      return [readOrderedArg(args, ['source', 'fastlen', 'slowlen', 'siglen'], 'source', 0)].filter(isDefinedExpression);
    case 'ta.bb':
      return [readOrderedArg(args, ['series', 'length', 'mult'], 'series', 0)].filter(isDefinedExpression);
    case 'ta.kc':
    case 'ta.kcw':
      return [readOrderedArg(args, ['series', 'length', 'mult', 'useTrueRange'], 'series', 0)].filter(isDefinedExpression);
    case 'ta.crossover':
    case 'ta.cross': {
      const a = readOrderedArg(args, ['source1', 'source2'], 'source1', 0);
      const b = readOrderedArg(args, ['source1', 'source2'], 'source2', 1);
      return [a, b].filter(isDefinedExpression);
    }
    case 'ta.crossunder': {
      const a = readAliasedOrderedArg(args, [['source1', 'x'], ['source2', 'y']], 0);
      const b = readAliasedOrderedArg(args, [['source1', 'x'], ['source2', 'y']], 1);
      return [a, b].filter(isDefinedExpression);
    }
    case 'ta.max':
    case 'ta.min': {
      const a = readAliasedOrderedArg(args, [['source1', 'source'], ['source2']], 0);
      const b = readAliasedOrderedArg(args, [['source1', 'source'], ['source2']], 1);
      return [a, b].filter(isDefinedExpression);
    }
    case 'ta.covariance':
    case 'ta.correlation': {
      const a = readOrderedArg(args, ['source1', 'source2', 'length'], 'source1', 0);
      const b = readOrderedArg(args, ['source1', 'source2', 'length'], 'source2', 1);
      return [a, b].filter(isDefinedExpression);
    }
    case 'ta.change': {
      return [
        readOrderedArg(args, ['source', 'length'], 'source', 0),
        readOrderedArg(args, ['source', 'length'], 'length', 1),
      ].filter(isDefinedExpression);
    }
    case 'ta.supertrend':
      return [readOrderedArg(args, ['factor', 'atrPeriod'], 'factor', 0)].filter(isDefinedExpression);
    case 'ta.atr':
    case 'ta.tr':
    case 'ta.wpr':
    case 'ta.dmi':
    case 'ta.adx':
    case 'ta.sar':
      return []; // OHLC classes read high/low/close from bar directly
    case 'ta.highestbars':
    case 'ta.lowestbars': {
      const source = args.find((a) => a.name?.name === 'source')?.value ?? (positional.length >= 2 ? positional[0] : undefined);
      return [source].filter(isDefinedExpression);
    }
    case 'ta.pivothigh':
    case 'ta.pivotlow': {
      const source = args.find((a) => a.name?.name === 'source')?.value ?? (positional.length >= 3 ? positional[0] : undefined);
      return [source].filter(isDefinedExpression);
    }
    case 'ta.stoch': {
      const src = readOrderedArg(args, ['source', 'high', 'low', 'length'], 'source', 0);
      const high = readOrderedArg(args, ['source', 'high', 'low', 'length'], 'high', 1);
      const low = readOrderedArg(args, ['source', 'high', 'low', 'length'], 'low', 2);
      return [src, high, low].filter(isDefinedExpression);
    }
    default:
      return positional;
  }
}
