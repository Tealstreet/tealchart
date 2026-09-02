import type {
  AssignmentStatement,
  BinaryExpression,
  CallExpression,
  CollectionForStatement,
  EnumDeclaration,
  Expression,
  ForStatement,
  FunctionDeclaration,
  Identifier,
  IfStatement,
  IndexExpression,
  IndicatorDeclaration,
  MemberExpression,
  NumericForStatement,
  Program,
  Statement,
  SwitchExpression,
  TupleAssignment,
  TypeAnnotation,
  TypeDeclaration,
  TypeFieldDeclaration,
  VariableDeclaration,
  WhileStatement,
} from '../../parser/ast';
import type { Bar } from '../context';
import type { ExecutionResult, TealscriptEngineOptions } from '../engine';
import type { SourceSeriesAccessor, VarKind } from '../scope';

import { getArraySize, getArrayValue, isPineArray, setArrayValue } from '../arrays';
import { TealscriptEngine } from '../engine';
import { isPineMap, mapEntries } from '../maps';
import { isPineMatrix, matrixRow } from '../matrices';
import { copyUdtObject, createPineUdtObject, getUdtField, isPineUdtObject, setUdtField } from '../objects';

type EngineAny = Record<string, any>;
type EvalClosure = () => unknown;
type StatementClosure = () => StatementResult;

interface KnownSourceValue {
  __tealscriptKnownSource: true;
  value: unknown;
  series: SourceSeriesAccessor;
}

interface StatementResult {
  hasResult: boolean;
  value?: unknown;
}

interface BindContext {
  functions: Map<string, FunctionDeclaration>;
  methods: Map<string, FunctionDeclaration[]>;
  types: Map<string, TypeDeclaration>;
  enumValues: Map<string, Map<string, string>>;
  enumTitles: Map<string, string>;
  importAliases: Set<string>;
  slots: ClosureSlot[];
  slotScopes: Array<Map<string, ClosureSlot>>;
  blockDepth: number;
  suppressSlotBinding: number;
  runtimeFunctionScopes: Set<EngineAny>;
}

interface ClosureSlot {
  name: string;
  kind: VarKind;
  value: unknown;
  initialized: boolean;
  sourceSeries?: SourceSeriesAccessor;
}

interface LeadingArgument {
  value: EvalClosure;
  sourceExpr: Expression;
}

interface RuntimeCallArguments {
  positional: unknown[];
  named: Map<string, unknown>;
  sourceBindings: {
    positional: Array<SourceSeriesAccessor | undefined>;
    named: Map<string, SourceSeriesAccessor>;
  };
  positionalAfterNamed: boolean;
}

interface BoundClosureProgram {
  runBar: () => boolean;
  unsupported: string[];
}

interface BoundStatement {
  run: StatementClosure;
  source: Statement;
  requestReplayable: boolean;
  requestReplayStatements: Statement[];
  line?: number;
  column?: number;
}

export interface ClosureCompiledScript {
  ast: Program;
  success: boolean;
  unsupported: string[];
}

export interface ClosureExecutionOptions extends TealscriptEngineOptions {
  maxUnsupported?: number;
}

const NO_RESULT: StatementResult = { hasResult: false };
const BREAK_SIGNAL = Symbol('break');
const CONTINUE_SIGNAL = Symbol('continue');
const EMPTY_POSITIONAL_ARGS: unknown[] = [];
const EMPTY_NAMED_ARGS = new Map<string, unknown>();

interface LoopControl {
  signal: typeof BREAK_SIGNAL | typeof CONTINUE_SIGNAL;
}

const LEGACY_GLOBAL_TA_ALIASES = new Set([
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
]);

const LEGACY_GLOBAL_MATH_ALIASES = new Set([
  'abs',
  'ceil',
  'floor',
  'round',
  'sqrt',
  'log',
  'log10',
  'pow',
  'sign',
  'max',
  'min',
  'avg',
  'sum',
  'sin',
  'cos',
  'tan',
  'asin',
  'acos',
  'atan',
  'exp',
  'toradians',
  'todegrees',
]);

const LEGACY_GLOBAL_STR_ALIASES = new Set(['tostring', 'tonumber']);
const CALENDAR_PART_BUILTINS = new Set([
  'year',
  'month',
  'weekofyear',
  'dayofmonth',
  'dayofweek',
  'hour',
  'minute',
  'second',
]);

const LEGACY_GLOBAL_TICKER_ALIASES = new Map([
  ['tickerid', 'ticker.new'],
  ['heikinashi', 'ticker.heikinashi'],
  ['renko', 'ticker.renko'],
  ['linebreak', 'ticker.linebreak'],
  ['kagi', 'ticker.kagi'],
  ['pointfigure', 'ticker.pointfigure'],
]);

const LEGACY_INPUT_TYPE_CONSTANTS = new Map([
  ['bool', 'bool'],
  ['integer', 'int'],
  ['int', 'int'],
  ['float', 'float'],
  ['string', 'string'],
  ['resolution', 'timeframe'],
  ['session', 'session'],
  ['source', 'source'],
  ['symbol', 'symbol'],
  ['timeframe', 'timeframe'],
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

const INPUT_MEMBER_CONSTANTS = new Set([
  'input.bool',
  'input.color',
  'input.float',
  'input.integer',
  'input.int',
  'input.resolution',
  'input.session',
  'input.source',
  'input.string',
  'input.symbol',
  'input.timeframe',
]);

const TUPLE_FIELD_INDEX: Record<string, number> = {
  _1: 0,
  _2: 1,
  _3: 2,
  _4: 3,
  _5: 4,
  _6: 5,
  _7: 6,
  _8: 7,
  _9: 8,
  _10: 9,
};

const DRAWING_ID_BUILTINS = new Set([
  'label.new',
  'label.copy',
  'line.new',
  'line.copy',
  'box.new',
  'box.copy',
  'polyline.new',
  'polyline.copy',
  'linefill.new',
  'linefill.copy',
  'table.new',
]);

const SEQUENTIAL_CALL_ID_BUILTINS = new Set([...DRAWING_ID_BUILTINS, 'barcolor', 'plotbar', 'plotcandle']);

export function tryCompileClosure(ast: Program, options: ClosureExecutionOptions = {}): ClosureCompiledScript {
  const engine = new TealscriptEngine(options) as EngineAny;
  const bound = bindProgram(ast, engine, options.maxUnsupported ?? 50);
  return {
    ast,
    success: bound.unsupported.length === 0,
    unsupported: bound.unsupported,
  };
}

export function executeClosure(
  compiled: ClosureCompiledScript,
  bars: Bar[],
  inputs?: Map<string, unknown>,
  options?: ClosureExecutionOptions,
): ExecutionResult {
  if (!compiled.success) {
    throw new Error(`Closure backend unsupported: ${compiled.unsupported.join('; ')}`);
  }

  const engine = new TealscriptEngine(options) as EngineAny;
  const bound = bindProgram(compiled.ast, engine, options?.maxUnsupported ?? 50);
  if (bound.unsupported.length > 0) {
    throw new Error(`Closure backend unsupported: ${bound.unsupported.join('; ')}`);
  }

  installBoundExecution(engine, bound);
  const result = engine.execute(compiled.ast, bars, inputs) as ExecutionResult;
  result.profile.executionMode = 'closure';
  return result;
}

export function executeClosureScript(
  ast: Program,
  bars: Bar[],
  inputs?: Map<string, unknown>,
  options?: ClosureExecutionOptions,
): ExecutionResult {
  return executeClosure(tryCompileClosure(ast, options), bars, inputs, options);
}

function bindProgram(ast: Program, engine: EngineAny, maxUnsupported: number): BoundClosureProgram {
  const unsupported: string[] = [];
  const context: BindContext = {
    functions: new Map(),
    methods: new Map(),
    types: new Map(),
    enumValues: new Map(),
    enumTitles: new Map(),
    importAliases: new Set(),
    slots: [],
    slotScopes: [new Map()],
    blockDepth: 0,
    suppressSlotBinding: 0,
    runtimeFunctionScopes: new Set(),
  };

  for (const stmt of ast.body) {
    if (stmt.type === 'FunctionDeclaration') {
      if (stmt.isMethod) {
        const overloads = context.methods.get(stmt.name.name) ?? [];
        overloads.push(stmt);
        context.methods.set(stmt.name.name, overloads);
      } else {
        context.functions.set(stmt.name.name, stmt);
      }
    } else if (stmt.type === 'TypeDeclaration') {
      context.types.set(stmt.name.name, stmt);
    } else if (stmt.type === 'EnumDeclaration') {
      context.enumValues.set(stmt.name.name, createLocalEnumValues(stmt, context.enumTitles));
    } else if (stmt.type === 'ImportDeclaration') {
      context.importAliases.add(stmt.alias.name);
    }
  }

  const statements = ast.body.map((stmt) => {
    try {
      return bindStatement(stmt, engine, context);
    } catch (error) {
      if (unsupported.length < maxUnsupported) {
        unsupported.push(`${stmt.type}: ${error instanceof Error ? error.message : String(error)}`);
      }
      return null;
    }
  });

  if (unsupported.length > 0 || statements.some((stmt) => stmt === null)) {
    return { unsupported, runBar: () => false };
  }

  const priorRequestReplayableStatements: Statement[] = [];
  const closures = statements.map((statement, index): BoundStatement => {
    const sourceStatement = ast.body[index]!;
    const requestReplayable = isRequestReplayableStatement(sourceStatement);
    const boundStatement = {
      run: statement as StatementClosure,
      source: sourceStatement,
      requestReplayable,
      requestReplayStatements: selectRequestReplayStatements(sourceStatement, priorRequestReplayableStatements, context.functions),
      line: sourceStatement.loc?.start.line,
      column: sourceStatement.loc?.start.column,
    };
    if (requestReplayable) priorRequestReplayableStatements.push(sourceStatement);
    return boundStatement;
  });
  return {
    unsupported,
    runBar: () => {
      advanceSlots(context);
      for (const functionScope of context.runtimeFunctionScopes) functionScope.advanceBar();
      for (const statement of closures) {
        try {
          if (statement.requestReplayStatements.length > 0) {
            engine.withRequestReplayableStatements(statement.requestReplayStatements, () => statement.run());
          } else {
            statement.run();
          }
        } catch (error) {
          throw new ClosureStatementError(error, statement.line, statement.column);
        }
      }
      for (const functionScope of context.runtimeFunctionScopes) functionScope.commit(false);
      return false;
    },
  };
}

function selectRequestReplayStatements(
  owner: Statement,
  priorStatements: Statement[],
  functions: Map<string, FunctionDeclaration>,
): Statement[] {
  const needed = collectRequestCallReferences(owner);
  if (needed.size === 0 || priorStatements.length === 0) return [];

  const declarationsByName = new Map<string, Statement>();
  for (const stmt of priorStatements) {
    for (const name of variableDeclarationNames(stmt)) declarationsByName.set(name, stmt);
  }

  const included = new Set<Statement>();
  const expandedFunctions = new Set<string>();
  let changed = true;
  while (changed) {
    changed = false;
    for (const name of Array.from(needed)) {
      if (expandedFunctions.has(name)) continue;
      const fn = functions.get(name);
      if (!fn) continue;
      expandedFunctions.add(name);
      for (const reference of collectFunctionBodyReferences(fn)) {
        if (!needed.has(reference)) {
          needed.add(reference);
          changed = true;
        }
      }
    }
    for (const name of Array.from(needed)) {
      const stmt = declarationsByName.get(name);
      if (!stmt || included.has(stmt)) continue;
      included.add(stmt);
      for (const reference of collectStatementReferences(stmt)) {
        if (!needed.has(reference)) {
          needed.add(reference);
          changed = true;
        }
      }
    }
  }

  return priorStatements.filter((stmt) => included.has(stmt));
}

function isRequestReplayableStatement(stmt: Statement): boolean {
  return stmt.type === 'VariableDeclaration'
    && stmt.kind === 'none'
    && stmt.init.type !== 'IfStatement'
    && !nodeContainsRequestCall(stmt.init);
}

function variableDeclarationNames(stmt: Statement): string[] {
  if (stmt.type !== 'VariableDeclaration') return [];
  if (stmt.names.type === 'VariableDeclarator') return [stmt.names.name.name];
  return stmt.names.names.map((name) => name.name).filter((name) => name !== '_');
}

function collectRequestCallReferences(stmt: Statement): Set<string> {
  const references = new Set<string>();
  const visit = (node: unknown): void => {
    if (!node || typeof node !== 'object') return;
    const maybeNode = node as { type?: string; callee?: Expression; arguments?: Array<{ value: Expression }> };
    if (maybeNode.type === 'CallExpression') {
      const fullName = maybeNode.callee ? expressionFullName(maybeNode.callee) : null;
      if (isRequestCallName(fullName)) {
        for (const arg of maybeNode.arguments ?? []) collectExpressionReferences(arg.value, references);
      }
    }
    for (const value of Object.values(node)) {
      if (value === node || typeof value === 'function') continue;
      if (Array.isArray(value)) {
        for (const item of value) visit(item);
      } else {
        visit(value);
      }
    }
  };
  visit(stmt);
  return references;
}

function nodeContainsRequestCall(node: unknown): boolean {
  if (!node || typeof node !== 'object') return false;
  const maybeNode = node as { type?: string; callee?: Expression };
  if (maybeNode.type === 'CallExpression') {
    const fullName = maybeNode.callee ? expressionFullName(maybeNode.callee) : null;
    if (isRequestCallName(fullName)) {
      return true;
    }
  }

  for (const value of Object.values(node)) {
    if (value === node || typeof value === 'function') continue;
    if (Array.isArray(value)) {
      for (const item of value) {
        if (nodeContainsRequestCall(item)) return true;
      }
    } else if (nodeContainsRequestCall(value)) {
      return true;
    }
  }
  return false;
}

function isRequestCallName(fullName: string | null): boolean {
  return fullName === 'security'
    || fullName === 'request.security'
    || fullName === 'request.security_lower_tf'
    || fullName?.startsWith('request.') === true;
}

function expressionFullName(expr: Expression): string | null {
  if (expr.type === 'Identifier') return expr.name;
  if (expr.type === 'MemberExpression') {
    const objectName = expressionFullName(expr.object);
    return objectName ? `${objectName}.${expr.property.name}` : expr.property.name;
  }
  return null;
}

function collectExpressionReferences(expr: Expression, references = new Set<string>()): Set<string> {
  switch (expr.type) {
    case 'Identifier':
      references.add(expr.name);
      return references;
    case 'MemberExpression':
      collectExpressionReferences(expr.object, references);
      return references;
    case 'CallExpression':
      collectExpressionReferences(expr.callee, references);
      for (const arg of expr.arguments) collectExpressionReferences(arg.value, references);
      return references;
    case 'UnaryExpression':
      return collectExpressionReferences(expr.argument, references);
    case 'BinaryExpression':
      collectExpressionReferences(expr.left, references);
      collectExpressionReferences(expr.right, references);
      return references;
    case 'ConditionalExpression':
      collectExpressionReferences(expr.test, references);
      collectExpressionReferences(expr.consequent, references);
      collectExpressionReferences(expr.alternate, references);
      return references;
    case 'ArrayExpression':
      for (const element of expr.elements) collectExpressionReferences(element, references);
      return references;
    case 'IndexExpression':
      collectExpressionReferences(expr.object, references);
      collectExpressionReferences(expr.index, references);
      return references;
    case 'SwitchExpression':
      if (expr.discriminant) collectExpressionReferences(expr.discriminant, references);
      for (const switchCase of expr.cases) {
        if (switchCase.test) collectExpressionReferences(switchCase.test, references);
        if (Array.isArray(switchCase.consequent)) {
          for (const stmt of switchCase.consequent) collectStatementReferences(stmt, references);
        } else {
          collectExpressionReferences(switchCase.consequent, references);
        }
      }
      return references;
    case 'ForStatement':
      collectStatementReferences(expr, references);
      return references;
    case 'WhileStatement':
      collectStatementReferences(expr, references);
      return references;
    case 'LambdaExpression':
      collectExpressionReferences(expr.body, references);
      for (const param of expr.params) references.delete(param.name);
      return references;
    default:
      return references;
  }
}

function collectStatementReferences(stmt: Statement, references = new Set<string>()): Set<string> {
  if (stmt.type === 'VariableDeclaration' && stmt.init.type !== 'IfStatement') {
    collectExpressionReferences(stmt.init, references);
  } else if (stmt.type === 'ExpressionStatement') {
    collectExpressionReferences(stmt.expression, references);
  } else if (stmt.type === 'MultiExpressionStatement') {
    for (const expr of stmt.expressions) collectExpressionReferences(expr, references);
  } else if (stmt.type === 'MultiDeclaration') {
    for (const declaration of stmt.declarations) collectStatementReferences(declaration, references);
  } else if (stmt.type === 'MultiAssignment') {
    for (const assignment of stmt.assignments) collectStatementReferences(assignment, references);
  } else if (stmt.type === 'MultiStatement') {
    for (const child of stmt.statements) collectStatementReferences(child, references);
  } else if (stmt.type === 'TupleAssignment' && stmt.right.type !== 'IfStatement') {
    collectExpressionReferences(stmt.right, references);
  } else if (stmt.type === 'AssignmentStatement' && stmt.right.type !== 'IfStatement') {
    collectExpressionReferences(stmt.right, references);
  } else if (stmt.type === 'IfStatement') {
    collectExpressionReferences(stmt.test, references);
    for (const child of stmt.consequent) collectStatementReferences(child, references);
    if (Array.isArray(stmt.alternate)) {
      for (const child of stmt.alternate) collectStatementReferences(child, references);
    } else if (stmt.alternate) {
      collectStatementReferences(stmt.alternate, references);
    }
  } else if (stmt.type === 'OnceStatement') {
    if (stmt.test) collectExpressionReferences(stmt.test, references);
    for (const child of stmt.body) collectStatementReferences(child, references);
  } else if (stmt.type === 'ForStatement') {
    if (stmt.kind === 'numeric') {
      collectExpressionReferences(stmt.start, references);
      collectExpressionReferences(stmt.end, references);
      if (stmt.step) collectExpressionReferences(stmt.step, references);
    } else {
      collectExpressionReferences(stmt.iterable, references);
    }
    for (const child of stmt.body) collectStatementReferences(child, references);
  } else if (stmt.type === 'WhileStatement') {
    collectExpressionReferences(stmt.test, references);
    for (const child of stmt.body) collectStatementReferences(child, references);
  }
  return references;
}

function collectFunctionBodyReferences(fn: FunctionDeclaration): Set<string> {
  const references = new Set<string>();
  if (Array.isArray(fn.body)) {
    for (const stmt of fn.body) collectStatementReferences(stmt, references);
    for (const stmt of fn.body) {
      for (const name of variableDeclarationNames(stmt)) references.delete(name);
    }
  } else {
    collectExpressionReferences(fn.body, references);
  }

  for (const param of fn.params) references.delete(param.name);
  return references;
}

function bindStatement(stmt: Statement, engine: EngineAny, context: BindContext): StatementClosure {
  switch (stmt.type) {
    case 'IndicatorDeclaration':
      return bindIndicator(stmt, engine, context);
    case 'LibraryDeclaration':
    case 'ImportDeclaration':
    case 'TypeDeclaration':
    case 'EnumDeclaration':
    case 'FunctionDeclaration':
      return () => NO_RESULT;
    case 'VariableDeclaration':
      return bindVariableDeclaration(stmt, engine, context);
    case 'MultiDeclaration': {
      const children = stmt.declarations.map((decl) => bindVariableDeclaration(decl, engine, context));
      return () => {
        for (const child of children) child();
        return NO_RESULT;
      };
    }
    case 'AssignmentStatement':
      return bindAssignment(stmt, engine, context);
    case 'MultiAssignment': {
      const children = stmt.assignments.map((assignment) => bindAssignment(assignment, engine, context));
      return () => {
        for (const child of children) child();
        return NO_RESULT;
      };
    }
    case 'TupleAssignment':
      return bindTupleAssignment(stmt, engine, context);
    case 'ExpressionStatement': {
      const expr = bindExpression(stmt.expression, engine, context);
      return () => ({ hasResult: true, value: expr() });
    }
    case 'MultiExpressionStatement': {
      const expressions = stmt.expressions.map((expr) => bindExpression(expr, engine, context));
      return () => {
        let result: StatementResult = NO_RESULT;
        for (const expr of expressions) result = { hasResult: true, value: expr() };
        return result;
      };
    }
    case 'MultiStatement': {
      const statements = stmt.statements.map((child) => bindStatement(child, engine, context));
      return () => {
        let result: StatementResult = NO_RESULT;
        for (const statement of statements) {
          const statementResult = statement();
          if (statementResult.hasResult) result = statementResult;
        }
        return result;
      };
    }
    case 'IfStatement':
      return bindIf(stmt, engine, context);
    case 'ForStatement':
      return bindFor(stmt, engine, context);
    case 'WhileStatement':
      return bindWhile(stmt, engine, context);
    case 'BreakStatement':
      return () => {
        throw { signal: BREAK_SIGNAL } satisfies LoopControl;
      };
    case 'ContinueStatement':
      return () => {
        throw { signal: CONTINUE_SIGNAL } satisfies LoopControl;
      };
    default:
      throw new Error(`unsupported statement ${stmt.type}`);
  }
}

function bindIndicator(stmt: IndicatorDeclaration, engine: EngineAny, context: BindContext): StatementClosure {
  const title = bindExpression(stmt.title, engine, context);
  const shorttitle = stmt.shorttitle ? bindExpression(stmt.shorttitle, engine, context) : undefined;
  const overlay = stmt.overlay ? bindExpression(stmt.overlay, engine, context) : undefined;
  const format = stmt.format ? bindExpression(stmt.format, engine, context) : undefined;
  const precision = stmt.precision ? bindExpression(stmt.precision, engine, context) : undefined;
  const scale = stmt.scale ? bindExpression(stmt.scale, engine, context) : undefined;
  const maxBarsBack = stmt.max_bars_back ? bindExpression(stmt.max_bars_back, engine, context) : undefined;
  const timeframeGaps = stmt.timeframe_gaps ? bindExpression(stmt.timeframe_gaps, engine, context) : undefined;
  const explicitPlotZOrder = stmt.explicit_plot_zorder
    ? bindExpression(stmt.explicit_plot_zorder, engine, context)
    : undefined;
  const behindChart = stmt.behind_chart ? bindExpression(stmt.behind_chart, engine, context) : undefined;
  const calcBarsCount = stmt.calc_bars_count ? bindExpression(stmt.calc_bars_count, engine, context) : undefined;
  const maxLabelsCount = stmt.max_labels_count ? bindExpression(stmt.max_labels_count, engine, context) : undefined;
  const maxLinesCount = stmt.max_lines_count ? bindExpression(stmt.max_lines_count, engine, context) : undefined;
  const maxBoxesCount = stmt.max_boxes_count ? bindExpression(stmt.max_boxes_count, engine, context) : undefined;
  const maxPolylinesCount = stmt.max_polylines_count
    ? bindExpression(stmt.max_polylines_count, engine, context)
    : undefined;
  const timeframe = stmt.timeframe ? bindExpression(stmt.timeframe, engine, context) : undefined;
  const dynamicRequests = stmt.dynamic_requests ? bindExpression(stmt.dynamic_requests, engine, context) : undefined;
  return () => {
    if (engine.ctx.bar_index !== 0) return NO_RESULT;
    engine.ctx.indicatorTitle = title() as string;
    if (shorttitle) engine.ctx.indicatorShortTitle = toStringValue(shorttitle());
    if (overlay) engine.ctx.indicatorOverlay = isTruthy(overlay());
    if (format) engine.ctx.indicatorFormat = toStringValue(format());
    if (precision) engine.ctx.indicatorPrecision = Math.trunc(Number(precision()));
    if (scale) engine.ctx.indicatorScale = toStringValue(scale());
    if (maxBarsBack) engine.ctx.indicatorMaxBarsBack = engine.normalizeMaxBarsBack(maxBarsBack());
    if (timeframeGaps) engine.ctx.indicatorTimeframeGaps = isTruthy(timeframeGaps());
    if (explicitPlotZOrder) engine.ctx.indicatorExplicitPlotZOrder = isTruthy(explicitPlotZOrder());
    if (behindChart) engine.ctx.indicatorBehindChart = isTruthy(behindChart());
    if (calcBarsCount) {
      engine.ctx.indicatorCalcBarsCount = engine.normalizeNonNegativeInteger(
        calcBarsCount(),
        'indicator calc_bars_count',
      );
    }
    applyDeclarationDrawingLimit(engine, maxLabelsCount, 'label', 'max_labels_count');
    applyDeclarationDrawingLimit(engine, maxLinesCount, 'line', 'max_lines_count');
    applyDeclarationDrawingLimit(engine, maxBoxesCount, 'box', 'max_boxes_count');
    applyDeclarationDrawingLimit(engine, maxPolylinesCount, 'polyline', 'max_polylines_count');
    if (timeframe) engine.applyIndicatorTimeframe(timeframe());
    if (dynamicRequests) engine.indicatorDynamicRequests = isTruthy(dynamicRequests());
    if (stmt.declarationKind === 'strategy') {
      engine.applyStrategyDeclaration(stmt);
      engine.hasStrategyDeclaration = true;
      engine.updateStrategyPropHistories();
    }
    return NO_RESULT;
  };
}

function applyDeclarationDrawingLimit(
  engine: EngineAny,
  expression: EvalClosure | undefined,
  type: 'label' | 'line' | 'box' | 'polyline',
  name: string,
): void {
  if (!expression) return;
  const value = unwrapKnownSourceValue(expression());
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || !Number.isInteger(value)) {
    throw new Error(`indicator ${name} must be a non-negative integer`);
  }
  engine.ctx.setDrawingLimit(type, value);
}

function withBlockScope<T>(context: BindContext, run: () => T): T {
  context.blockDepth++;
  context.slotScopes.push(new Map());
  try {
    return run();
  } finally {
    context.slotScopes.pop();
    context.blockDepth--;
  }
}

function withSuppressedSlotBinding<T>(context: BindContext, run: () => T): T {
  context.suppressSlotBinding++;
  try {
    return run();
  } finally {
    context.suppressSlotBinding--;
  }
}

function withSlotScope<T>(context: BindContext, run: () => T): T {
  context.slotScopes.push(new Map());
  try {
    return run();
  } finally {
    context.slotScopes.pop();
  }
}

function canBindStaticSlot(context: BindContext): boolean {
  return context.suppressSlotBinding === 0;
}

function declareStaticSlot(context: BindContext, name: string, kind: VarKind): ClosureSlot | undefined {
  if (!canBindStaticSlot(context)) return undefined;
  if ((kind === 'var' || kind === 'varip') && context.blockDepth > 0) return undefined;
  const scope = context.slotScopes[context.slotScopes.length - 1]!;
  const existing = scope.get(name);
  if (existing) {
    existing.kind = kind;
    return existing;
  }

  const slot: ClosureSlot = {
    name,
    kind,
    value: undefined,
    initialized: false,
  };
  context.slots.push(slot);
  scope.set(name, slot);
  return slot;
}

function getStaticSlot(context: BindContext, name: string): ClosureSlot | undefined {
  if (!canBindStaticSlot(context)) return undefined;
  for (let index = context.slotScopes.length - 1; index >= 0; index--) {
    const slot = context.slotScopes[index]!.get(name);
    if (slot) return slot;
  }
  return undefined;
}

function getAssignableStaticSlot(context: BindContext, name: string): ClosureSlot | undefined {
  if (context.suppressSlotBinding !== 0) return undefined;
  for (let index = context.slotScopes.length - 1; index >= 0; index--) {
    const slot = context.slotScopes[index]!.get(name);
    if (slot) return slot;
  }
  return undefined;
}

function declareSlotValue(slot: ClosureSlot | undefined, value: unknown, sourceSeries?: SourceSeriesAccessor): void {
  if (!slot) return;
  slot.value = value;
  slot.initialized = true;
  slot.sourceSeries = sourceSeries;
}

function advanceSlots(context: BindContext): void {
  for (const slot of context.slots) {
    if (slot.kind === 'none') {
      slot.value = undefined;
      slot.initialized = false;
      slot.sourceSeries = undefined;
    }
  }
}

function bindVariableDeclaration(stmt: VariableDeclaration, engine: EngineAny, context: BindContext): StatementClosure {
  const kind = stmt.kind;
  const init = bindInitializer(stmt.init, engine, context);
  const typeName = typeAnnotationName(stmt.typeAnnotation);
  if (stmt.names.type === 'TupleDeclarator') {
    const names = stmt.names.names.map((name) => name.name);
    const slots = names.map((name) => (name === '_' ? undefined : declareStaticSlot(context, name, kind)));
    return () => {
      if (
        (kind === 'var' || kind === 'varip') &&
        names.every((name, index) => {
          if (name === '_') return true;
          const slot = slots[index];
          return slot ? slot.initialized : engine.scope.getEntry(name)?.initialized;
        })
      )
        return NO_RESULT;
      const drawingCount = persistentDrawingStart(engine, kind);
      const value = init();
      if (!Array.isArray(value)) throw new Error('Cannot destructure non-array value');
      for (let index = 0; index < names.length; index++) {
        const name = names[index];
        if (name === '_') continue;
        declareSlotValue(slots[index], value[index], undefined);
        engine.scope.declare(name, kind, value[index], typeName);
        markPersistentRuntimeValue(engine, kind, value[index]);
      }
      markPersistentDrawings(engine, kind, drawingCount);
      return NO_RESULT;
    };
  }

  const name = stmt.names.name.name;
  const slot = declareStaticSlot(context, name, kind);
  return () => {
    const existing = engine.scope.getEntry(name);
    if ((kind === 'var' || kind === 'varip') && (slot ? slot.initialized : existing?.initialized)) return NO_RESULT;
    const drawingCount = persistentDrawingStart(engine, kind);
    const raw = init();
    const value = unwrapKnownSourceValue(raw);
    const source = sourceForInitializer(engine, stmt.init, raw);
    declareSlotValue(slot, value, source);
    engine.scope.declare(name, kind, value, typeName, source);
    markPersistentRuntimeValue(engine, kind, value);
    markPersistentDrawings(engine, kind, drawingCount);
    return NO_RESULT;
  };
}

function persistentDrawingStart(engine: EngineAny, kind: VariableDeclaration['kind']): number | undefined {
  return kind === 'var' || kind === 'varip' ? engine.ctx.getDrawingCount() : undefined;
}

function markPersistentDrawings(engine: EngineAny, kind: VariableDeclaration['kind'], start: number | undefined): void {
  if ((kind === 'var' || kind === 'varip') && start !== undefined) engine.ctx.markDrawingsPersistentFrom(start);
}

function markPersistentRuntimeValue(engine: EngineAny, kind: VariableDeclaration['kind'] | undefined, value: unknown): void {
  if (kind !== 'var' && kind !== 'varip') return;
  markPersistentContainedValue(engine, value);
}

function markPersistentContainedValue(engine: EngineAny, value: unknown, seen = new Set<unknown>()): void {
  if (!value || typeof value !== 'object') return;
  if (seen.has(value)) return;
  seen.add(value);
  (value as { persistent?: boolean }).persistent = true;
  if (isPineArray(value)) {
    for (let index = 0; index < getArraySize(value); index++) {
      const element = getArrayValue(value, index);
      markPersistentContainedValue(engine, element, seen);
      markPersistentDrawingHandle(engine, element);
    }
    return;
  }
  if (isPineUdtObject(value)) {
    for (const fieldValue of value.fields.values()) {
      markPersistentContainedValue(engine, fieldValue, seen);
      markPersistentDrawingHandle(engine, fieldValue);
    }
  }
}

function markPersistentArrayDrawing(engine: EngineAny, array: unknown, value: unknown): void {
  if (!isPineArray(array) || !array.persistent) return;
  markPersistentContainedValue(engine, value);
  markPersistentDrawingHandle(engine, value);
}

function markPersistentDrawingHandle(engine: EngineAny, value: unknown): void {
  const drawingId = engine.toDrawingId(value);
  if (drawingId) engine.ctx.markDrawingPersistent(drawingId);
}

function bindAssignment(stmt: AssignmentStatement, engine: EngineAny, context: BindContext): StatementClosure {
  const right = bindInitializer(stmt.right, engine, context);
  const operator = stmt.operator;
  if (stmt.left.type === 'MemberExpression') {
    const object = bindExpression(stmt.left.object, engine, context);
    const fieldName = stmt.left.property.name;
    return () => {
      const raw = right();
      const value = unwrapKnownSourceValue(raw);
      const receiver = unwrapKnownSourceValue(object());
      if (!isPineUdtObject(receiver)) throw new Error('Member assignment expects a user-defined type object');
      const current = getUdtField(receiver, fieldName);
      const next = applyAssignmentOperator(current, value, operator);
      setUdtField(receiver, fieldName, next);
      if (receiver.persistent) {
        markPersistentContainedValue(engine, next);
        markPersistentDrawingHandle(engine, next);
      }
      return NO_RESULT;
    };
  }
  if (stmt.left.type === 'IndexExpression') {
    const object = bindExpression(stmt.left.object, engine, context);
    const index = bindExpression(stmt.left.index, engine, context);
    return () => {
      const raw = right();
      const value = unwrapKnownSourceValue(raw);
      const normalizedIndex = normalizeIndexOffset(index());
      if (normalizedIndex === null) throw new Error('Array assignment index must be a finite non-negative number');
      const array = unwrapKnownSourceValue(object());
      const current = readArrayElement(array, normalizedIndex);
      const next = applyAssignmentOperator(current, value, operator);
      setArrayElement(array, normalizedIndex, next);
      markPersistentArrayDrawing(engine, array, next);
      return NO_RESULT;
    };
  }
  const name = stmt.left.name;
  const slot = getAssignableStaticSlot(context, name);
  return () => {
    const runtimeEntry = slot ? undefined : engine.scope.getEntry(name);
    const targetKind = slot?.kind ?? runtimeEntry?.kind;
    const persistentDrawingStart = targetKind === 'var' || targetKind === 'varip'
      ? engine.ctx.getDrawingCount()
      : undefined;
    const raw = right();
    const value = unwrapKnownSourceValue(raw);
    const current = slot?.initialized ? slot.value : engine.scope.get(name);
    const next = applyAssignmentOperator(current, value, operator);
    const source = operator === ':=' ? sourceForInitializer(engine, stmt.right, raw) : undefined;
    declareSlotValue(slot, next, source);
    engine.scope.set(name, next, source);
    markPersistentRuntimeValue(engine, targetKind, next);
    if (persistentDrawingStart !== undefined) {
      engine.ctx.markDrawingsPersistentFrom(persistentDrawingStart);
    }
    return NO_RESULT;
  };
}

function bindTupleAssignment(stmt: TupleAssignment, engine: EngineAny, context: BindContext): StatementClosure {
  const right = bindInitializer(stmt.right, engine, context);
  const names = stmt.names.map((name) => name.name);
  const slots = names.map((name) => (name === '_' ? undefined : getAssignableStaticSlot(context, name)));
  return () => {
    const value = unwrapKnownSourceValue(right());
    if (!Array.isArray(value)) {
      throw new Error('Tuple assignment expects a tuple (array) value on the right-hand side');
    }
    for (let index = 0; index < names.length; index++) {
      const name = names[index]!;
      if (name === '_') continue;
      declareSlotValue(slots[index], value[index]);
      engine.scope.set(name, value[index]);
    }
    return NO_RESULT;
  };
}

function bindInitializer(init: Expression | IfStatement, engine: EngineAny, context: BindContext): EvalClosure {
  return init.type === 'IfStatement' ? bindIfExpression(init, engine, context) : bindExpression(init, engine, context);
}

function sourceForInitializer(
  engine: EngineAny,
  init: Expression | IfStatement,
  value?: unknown,
): SourceSeriesAccessor | undefined {
  return init.type === 'IfStatement' ? undefined : sourceForExpression(engine, init, value);
}

function bindIf(stmt: IfStatement, engine: EngineAny, context: BindContext): StatementClosure {
  const test = bindExpression(stmt.test, engine, context);
  const consequent = withBlockScope(context, () =>
    stmt.consequent.map((child) => bindStatement(child, engine, context)),
  );
  const alternateBranch = stmt.alternate;
  const alternate = Array.isArray(alternateBranch)
    ? withBlockScope(context, () => alternateBranch.map((child) => bindStatement(child, engine, context)))
    : alternateBranch
      ? [bindIf(alternateBranch, engine, context)]
      : undefined;
  return () => {
    const children = isTruthy(test()) ? consequent : alternate;
    if (!children) return NO_RESULT;
    const childScope = engine.scope.createChild();
    const savedScope = engine.scope;
    engine.scope = childScope;
    try {
      let result: StatementResult = NO_RESULT;
      for (const child of children) {
        const childResult = child();
        if (childResult.hasResult) result = childResult;
      }
      return result;
    } finally {
      engine.scope = savedScope;
      childScope.promoteNewLocalsTo(savedScope);
    }
  };
}

function bindIfExpression(stmt: IfStatement, engine: EngineAny, context: BindContext): EvalClosure {
  const run = bindIf(stmt, engine, context);
  return () => {
    const result = run();
    return result.hasResult ? result.value : Number.NaN;
  };
}

function bindFor(stmt: ForStatement, engine: EngineAny, context: BindContext): StatementClosure {
  return stmt.kind === 'collection' ? bindForIn(stmt, engine, context) : bindNumericFor(stmt, engine, context);
}

function bindNumericFor(stmt: NumericForStatement, engine: EngineAny, context: BindContext): StatementClosure {
  const start = bindExpression(stmt.start, engine, context);
  const end = bindExpression(stmt.end, engine, context);
  const step = stmt.step ? bindExpression(stmt.step, engine, context) : undefined;
  let counterSlot: ClosureSlot | undefined;
  const body = withBlockScope(context, () => {
    counterSlot = declareStaticSlot(context, stmt.counter.name, 'none');
    return stmt.body.map((child) => bindStatement(child, engine, context));
  });
  return () => {
    const startValue = Number(unwrapKnownSourceValue(start()));
    const endValue = Number(unwrapKnownSourceValue(end()));
    const stepValue = step ? Number(unwrapKnownSourceValue(step())) : 1;
    if (stepValue === 0) throw new Error('For loop step cannot be zero');
    const childScope = engine.scope.createChild();
    const savedScope = engine.scope;
    engine.scope = childScope;
    let iterations = 0;
    let result: StatementResult = NO_RESULT;
    try {
      for (let i = startValue; stepValue > 0 ? i <= endValue : i >= endValue; i += stepValue) {
        if (++iterations > 100000) throw new Error('Maximum loop iterations exceeded');
        declareSlotValue(counterSlot, i);
        engine.scope.declare(stmt.counter.name, 'none', i);
        try {
          for (const child of body) {
            const childResult = child();
            if (childResult.hasResult) result = childResult;
          }
        } catch (error) {
          if (isLoopControl(error, BREAK_SIGNAL)) break;
          if (isLoopControl(error, CONTINUE_SIGNAL)) continue;
          throw error;
        }
      }
      return result;
    } finally {
      engine.scope = savedScope;
    }
  };
}

function bindForIn(stmt: CollectionForStatement, engine: EngineAny, context: BindContext): StatementClosure {
  const iterable = bindExpression(stmt.iterable, engine, context);
  let indexSlot: ClosureSlot | undefined;
  let counterSlot: ClosureSlot | undefined;
  const body = withBlockScope(context, () => {
    if (stmt.indexCounter) indexSlot = declareStaticSlot(context, stmt.indexCounter.name, 'none');
    counterSlot = declareStaticSlot(context, stmt.counter.name, 'none');
    return stmt.body.map((child) => bindStatement(child, engine, context));
  });
  return () => {
    const { values, keys } = valuesForCollectionIterable(unwrapKnownSourceValue(iterable()));
    const childScope = engine.scope.createChild();
    const savedScope = engine.scope;
    engine.scope = childScope;
    let result: StatementResult = NO_RESULT;
    try {
      for (let index = 0; index < values.length; index++) {
        if (stmt.indexCounter) {
          const keyValue = keys ? keys[index] : index;
          declareSlotValue(indexSlot, keyValue);
          engine.scope.declare(stmt.indexCounter.name, 'none', keyValue);
        }
        declareSlotValue(counterSlot, values[index]);
        engine.scope.declare(stmt.counter.name, 'none', values[index]);
        try {
          for (const child of body) {
            const childResult = child();
            if (childResult.hasResult) result = childResult;
          }
        } catch (error) {
          if (isLoopControl(error, BREAK_SIGNAL)) break;
          if (isLoopControl(error, CONTINUE_SIGNAL)) continue;
          throw error;
        }
      }
      return result;
    } finally {
      engine.scope = savedScope;
    }
  };
}

function bindWhile(stmt: WhileStatement, engine: EngineAny, context: BindContext): StatementClosure {
  const test = bindExpression(stmt.test, engine, context);
  const body = withBlockScope(context, () => stmt.body.map((child) => bindStatement(child, engine, context)));
  return () => {
    const childScope = engine.scope.createChild();
    const savedScope = engine.scope;
    engine.scope = childScope;
    let iterations = 0;
    let result: StatementResult = NO_RESULT;
    try {
      while (isTruthy(test())) {
        if (++iterations > 100000) throw new Error('Maximum loop iterations exceeded');
        try {
          for (const child of body) {
            const childResult = child();
            if (childResult.hasResult) result = childResult;
          }
        } catch (error) {
          if (isLoopControl(error, BREAK_SIGNAL)) break;
          if (isLoopControl(error, CONTINUE_SIGNAL)) continue;
          throw error;
        }
      }
      return result;
    } finally {
      engine.scope = savedScope;
    }
  };
}

function bindExpression(expr: Expression, engine: EngineAny, context: BindContext): EvalClosure {
  switch (expr.type) {
    case 'NumericLiteral':
    case 'StringLiteral':
    case 'BooleanLiteral':
    case 'ColorLiteral': {
      const value = expr.value;
      return () => value;
    }
    case 'NaExpression':
      return () => Number.NaN;
    case 'Identifier':
      return bindIdentifier(expr, engine, context);
    case 'BinaryExpression':
      return bindBinary(expr, engine, context);
    case 'UnaryExpression':
      return bindUnary(expr, engine, context);
    case 'ConditionalExpression': {
      const test = bindExpression(expr.test, engine, context);
      const consequent = bindExpression(expr.consequent, engine, context);
      const alternate = bindExpression(expr.alternate, engine, context);
      return () => (isTruthy(test()) ? consequent() : alternate());
    }
    case 'SwitchExpression':
      return bindSwitch(expr, engine, context);
    case 'CallExpression':
      return bindCall(expr, engine, context);
    case 'MemberExpression':
      return bindMember(expr, engine, context);
    case 'IndexExpression':
      return bindIndex(expr, engine, context);
    case 'ArrayExpression': {
      const elements = expr.elements.map((element) => bindExpression(element, engine, context));
      return () => elements.map((element) => element());
    }
    case 'ForStatement': {
      const loop = bindFor(expr, engine, context);
      return () => {
        const result = loop();
        return result.hasResult ? result.value : Number.NaN;
      };
    }
    case 'WhileStatement': {
      const loop = bindWhile(expr, engine, context);
      return () => {
        const result = loop();
        return result.hasResult ? result.value : Number.NaN;
      };
    }
    default:
      throw new Error(`unsupported expression ${expr.type}`);
  }
}

function bindSwitch(expr: SwitchExpression, engine: EngineAny, context: BindContext): EvalClosure {
  const discriminant = expr.discriminant ? bindExpression(expr.discriminant, engine, context) : undefined;
  const cases = expr.cases.map((switchCase) => ({
    test: switchCase.test ? bindExpression(switchCase.test, engine, context) : undefined,
    consequent: bindSwitchConsequent(switchCase.consequent, engine, context),
  }));

  if (discriminant) {
    return () => {
      const discriminantValue = unwrapKnownSourceValue(discriminant());
      for (const switchCase of cases) {
        if (!switchCase.test) return switchCase.consequent();
        const testValue = unwrapKnownSourceValue(switchCase.test());
        if (!isNa(discriminantValue) && !isNa(testValue) && discriminantValue === testValue) {
          return switchCase.consequent();
        }
      }
      return Number.NaN;
    };
  }

  return () => {
    for (const switchCase of cases) {
      if (!switchCase.test || isTruthy(switchCase.test())) return switchCase.consequent();
    }
    return Number.NaN;
  };
}

function bindSwitchConsequent(
  consequent: Expression | Statement[],
  engine: EngineAny,
  context: BindContext,
): EvalClosure {
  if (!Array.isArray(consequent)) return bindExpression(consequent, engine, context);
  const statements = consequent.map((statement) => bindStatement(statement, engine, context));
  return () => {
    const childScope = engine.scope.createChild();
    const savedScope = engine.scope;
    engine.scope = childScope;
    try {
      let result: StatementResult = NO_RESULT;
      for (const statement of statements) {
        const statementResult = statement();
        if (statementResult.hasResult) result = statementResult;
      }
      return result.hasResult ? result.value : Number.NaN;
    } finally {
      engine.scope = savedScope;
    }
  };
}

function bindIdentifier(expr: Identifier, engine: EngineAny, context: BindContext): EvalClosure {
  const name = expr.name;
  const slot = getStaticSlot(context, name);
  if (slot) return () => slot.value;

  switch (name) {
    case 'open':
      return () => engine.ctx.open.get(0);
    case 'high':
      return () => engine.ctx.high.get(0);
    case 'low':
      return () => engine.ctx.low.get(0);
    case 'close':
      return () => engine.ctx.close.get(0);
    case 'volume':
      return () => engine.ctx.volume.get(0);
    case 'bid':
      return () => engine.ctx.bid.get(0);
    case 'ask':
      return () => engine.ctx.ask.get(0);
    case 'time':
      return () => engine.ctx.time.get(0);
    case 'time_tradingday':
      return () => engine.getTradingDayTime(engine.ctx.time.get(0), engine.ctx.syminfo.timezone);
    case 'timenow':
      return () => engine.ctx.timenow.get(0);
    case 'time_close':
      return () => engine.getBarCloseTime(engine.ctx.time.get(0), engine.ctx.timeframe.period);
    case 'last_bar_time':
      return () => engine.ctx.getBar(engine.ctx.last_bar_index)?.time ?? Number.NaN;
    case 'bar_index':
      return () => engine.ctx.bar_index;
    case 'last_bar_index':
      return () => engine.ctx.last_bar_index;
    case 'hl2':
      return () => engine.ctx.hl2;
    case 'hlc3':
      return () => engine.ctx.hlc3;
    case 'ohlc4':
      return () => engine.ctx.ohlc4;
    case 'hlcc4':
      return () => engine.ctx.hlcc4;
    case 'tr':
    case 'ta.tr': {
      const callId = `closure:${name}:variable`;
      return () =>
        engine.builtins.get('ta.tr')?.(EMPTY_POSITIONAL_ARGS, EMPTY_NAMED_ARGS, engine.ctx, engine.scope, callId) ??
        Number.NaN;
    }
    default:
      return () => {
        const entry = engine.scope.getEntry(name);
        if (entry) return engine.scope.get(name);
        if (name === 'ticker') return engine.ctx.syminfo.ticker;
        if (name === 'tickerid') return engine.ctx.syminfo.tickerid ?? engine.ctx.syminfo.ticker;
        if (name === 'n') return engine.ctx.bar_index;
        if (LEGACY_INPUT_TYPE_CONSTANTS.has(name)) return LEGACY_INPUT_TYPE_CONSTANTS.get(name);
        if (Object.prototype.hasOwnProperty.call(LEGACY_BARE_COLOR_CONSTANTS, name)) {
          return LEGACY_BARE_COLOR_CONSTANTS[name];
        }
        if (LEGACY_BARE_VISUAL_CONSTANTS.has(name)) return name;
        const builtin = engine.builtins.get(name);
        if (builtin)
          return builtin(EMPTY_POSITIONAL_ARGS, EMPTY_NAMED_ARGS, engine.ctx, engine.scope, `closure:${name}:constant`);
        throw new Error(`Unknown identifier: ${name}`);
      };
  }
}

function bindBinary(expr: BinaryExpression, engine: EngineAny, context: BindContext): EvalClosure {
  const left = bindExpression(expr.left, engine, context);
  const right = bindExpression(expr.right, engine, context);
  const operator = expr.operator;
  if (operator === 'and') return () => (isTruthy(left()) ? isTruthy(right()) : false);
  if (operator === 'or') return () => (isTruthy(left()) ? true : isTruthy(right()));
  return () => {
    const leftValue = unwrapKnownSourceValue(left());
    const rightValue = unwrapKnownSourceValue(right());
    if (isNa(leftValue) || isNa(rightValue)) return isComparisonOperator(operator) ? false : Number.NaN;
    switch (operator) {
      case '+':
        if (typeof leftValue === 'string' || typeof rightValue === 'string')
          return `${toStringValue(leftValue)}${toStringValue(rightValue)}`;
        return (leftValue as number) + (rightValue as number);
      case '-':
        return (leftValue as number) - (rightValue as number);
      case '*':
        return (leftValue as number) * (rightValue as number);
      case '/':
        return (rightValue as number) === 0 ? Number.NaN : (leftValue as number) / (rightValue as number);
      case '%':
        return (rightValue as number) === 0 ? Number.NaN : (leftValue as number) % (rightValue as number);
      case '==':
        return leftValue === rightValue;
      case '!=':
        return leftValue !== rightValue;
      case '<':
        return (leftValue as number) < (rightValue as number);
      case '>':
        return (leftValue as number) > (rightValue as number);
      case '<=':
        return (leftValue as number) <= (rightValue as number);
      case '>=':
        return (leftValue as number) >= (rightValue as number);
    }
  };
}

function bindUnary(
  expr: Extract<Expression, { type: 'UnaryExpression' }>,
  engine: EngineAny,
  context: BindContext,
): EvalClosure {
  const argument = bindExpression(expr.argument, engine, context);
  switch (expr.operator) {
    case '-':
      return () => -(unwrapKnownSourceValue(argument()) as number);
    case '+':
      return () => +(unwrapKnownSourceValue(argument()) as number);
    case 'not':
      return () => !isTruthy(argument());
  }
}

function bindMember(expr: MemberExpression, engine: EngineAny, context: BindContext): EvalClosure {
  const path = memberPath(expr);
  const fullName = path?.join('.');
  if (fullName && INPUT_MEMBER_CONSTANTS.has(fullName)) return () => fullName;
  if (fullName === 'strategy.opentrades.capital_held') return () => engine.evaluateStrategyOpenTradesCapitalHeld();
  if (fullName === 'strategy.closedtrades.first_index') return () => engine.evaluateStrategyClosedTradesFirstIndex();
  if (path?.length === 2) {
    const [namespace, prop] = path;
    if (namespace === 'barstate' && prop in engine.ctx.barstate) {
      return () => engine.ctx.barstate[prop];
    }
    if (namespace === 'syminfo') return () => engine.evaluateSyminfo(prop);
    if (namespace === 'timeframe') return () => engine.evaluateTimeframe(prop);
    if (namespace === 'chart') return () => engine.evaluateChart(prop);
    if (namespace === 'strategy') return () => engine.evaluateStrategy(prop);
    const enumValue = context.enumValues.get(namespace)?.get(prop);
    if (enumValue !== undefined) return () => enumValue;
    if (context.importAliases.has(namespace)) {
      return () => {
        const importedLibrary = engine.importedLibraries.get(namespace);
        if (importedLibrary?.constants.has(prop)) return importedLibrary.constants.get(prop);
        throw new Error(`unsupported member ${fullName}`);
      };
    }
  }
  if (path?.length === 3) {
    const [alias, enumName, fieldName] = path;
    if (alias && enumName && fieldName && context.importAliases.has(alias)) {
      return () => {
        const enumValues = engine.importedLibraries.get(alias)?.enums.get(enumName);
        if (enumValues?.has(fieldName)) return enumValues.get(fieldName);
        throw new Error(`unsupported member ${fullName}`);
      };
    }
  }
  if (fullName && engine.builtins.has(fullName)) {
    const builtin = engine.builtins.get(fullName);
    return () =>
      builtin(EMPTY_POSITIONAL_ARGS, EMPTY_NAMED_ARGS, engine.ctx, engine.scope, `closure:${fullName}:constant`);
  }
  const object = bindExpression(expr.object, engine, context);
  const prop = expr.property.name;
  return () => {
    const value = unwrapKnownSourceValue(object());
    if (isPineUdtObject(value)) return getUdtField(value, prop);
    if (Array.isArray(value)) {
      const index = TUPLE_FIELD_INDEX[prop];
      if (index !== undefined && index < value.length) return value[index];
    }
    throw new Error(`unsupported member ${fullName ?? '<dynamic>'}`);
  };
}

function bindIndex(expr: IndexExpression, engine: EngineAny, context: BindContext): EvalClosure {
  const offset = bindExpression(expr.index, engine, context);
  if (expr.object.type === 'MemberExpression') {
    const path = memberPath(expr.object);
    const fullName = path?.join('.');
    if (fullName?.startsWith('strategy.')) {
      const propName = fullName.slice('strategy.'.length);
      return () => {
        const rawOffset = normalizeIndexOffset(offset());
        if (rawOffset === null) return Number.NaN;
        return engine.evaluateStrategyPropHistory(propName, rawOffset);
      };
    }
  }
  if (expr.object.type === 'Identifier') {
    const name = expr.object.name;
    return () => {
      const rawOffset = normalizeIndexOffset(offset());
      if (rawOffset === null) return Number.NaN;
      if (engine.scope.has(name)) {
        const value = engine.scope.get(name);
        if (Array.isArray(value) || isPineArray(value)) return naIfMissing(readArrayElement(value, rawOffset));
      }
      const source = sourceForKnownIdentifier(engine, name);
      if (source) return naIfMissing(source.get(rawOffset));
      return naIfMissing(engine.scope.getWithOffset(name, rawOffset));
    };
  }
  const object = bindExpression(expr.object, engine, context);
  const historyValues: unknown[] = [];
  let lastHistoryBarIndex = -1;
  return () => {
    const rawOffset = normalizeIndexOffset(offset());
    if (rawOffset === null) return Number.NaN;
    const value = unwrapKnownSourceValue(object());
    if (Array.isArray(value) || isPineArray(value)) return naIfMissing(readArrayElement(value, rawOffset));
    const barIndex = engine.ctx.bar_index;
    if (barIndex !== lastHistoryBarIndex) {
      lastHistoryBarIndex = barIndex;
      historyValues[barIndex] = value;
    } else {
      historyValues[barIndex] = value;
    }
    return naIfMissing(historyValues[barIndex - rawOffset]);
  };
}

function bindUserFunctionBody(fn: FunctionDeclaration, engine: EngineAny, context: BindContext): EvalClosure {
  if (!Array.isArray(fn.body)) return bindExpression(fn.body, engine, context);
  const fnName = fn.name.name;
  const statements = fn.body.map((stmt) => ({
    returnsFunctionName: functionStatementReturnsName(stmt, fnName),
    run: bindStatement(stmt, engine, context),
  }));
  return () => {
    let result: StatementResult = NO_RESULT;
    for (const entry of statements) {
      const statementResult = entry.run();
      if (statementResult.hasResult) result = statementResult;
      if (entry.returnsFunctionName) {
        result = { hasResult: true, value: engine.scope.get(fnName) };
      }
    }
    return result.hasResult ? result.value : undefined;
  };
}

function bindUserFunctionCall(
  expr: CallExpression,
  fn: FunctionDeclaration,
  engine: EngineAny,
  context: BindContext,
  leadingArgs: LeadingArgument[] = [],
): EvalClosure {
  if (fn.isMethod && leadingArgs.length === 0) throw new Error(`unsupported method call ${fn.name.name}`);
  const args = expr.arguments.map((arg) => ({
    name: arg.name?.name,
    value: bindExpression(arg.value, engine, context),
    sourceExpr: arg.value,
  }));
  const defaults = fn.params.map((param) =>
    param.defaultValue ? bindExpression(param.defaultValue, engine, context) : undefined,
  );
  const defaultSourceExprs = fn.params.map((param) => param.defaultValue);
  const paramNames = fn.params.map((param) => parameterName(param.name));
  const fnName = fn.name.name;
  const bodySourceExpr = Array.isArray(fn.body) ? undefined : fn.body;
  const recursive = functionBodyContainsNamedCall(fn, fnName);
  const paramSlots: Array<ClosureSlot | undefined> = [];
  const body = recursive
    ? withSuppressedSlotBinding(context, () => bindUserFunctionBody(fn, engine, context))
    : withSlotScope(context, () => {
        for (const paramName of paramNames) {
          paramSlots.push(declareStaticSlot(context, paramName, 'none'));
        }
        return bindUserFunctionBody(fn, engine, context);
      });
  let functionScope: EngineAny | undefined;
  let activeDepth = 0;

  return () => {
    if (activeDepth >= 100) throw new Error(`Maximum recursion depth exceeded for function: ${fnName}`);
    const callScopeKey = engine.callSiteFunctionScopeKey(fn, expr);
    const positionalValues: unknown[] = [];
    const positionalSources: Array<SourceSeriesAccessor | undefined> = [];
    const namedValues = new Map<string, unknown>();
    const namedSources = new Map<string, SourceSeriesAccessor | undefined>();
    let sawNamed = false;
    let positionalAfterNamed = false;

    for (const arg of leadingArgs) {
      const raw = arg.value();
      positionalValues.push(unwrapKnownSourceValue(raw));
      positionalSources.push(sourceForExpression(engine, arg.sourceExpr, raw));
    }

    for (const arg of args) {
      const raw = arg.value();
      const value = unwrapKnownSourceValue(raw);
      const source = sourceForExpression(engine, arg.sourceExpr, raw);
      if (arg.name) {
        sawNamed = true;
        namedValues.set(arg.name, value);
        namedSources.set(arg.name, source);
      } else {
        if (sawNamed) positionalAfterNamed = true;
        positionalValues.push(value);
        positionalSources.push(source);
      }
    }

    if (positionalAfterNamed)
      throw new Error(`function ${fnName} cannot use positional arguments after named arguments`);
    if (positionalValues.length > paramNames.length)
      throw new Error(
        `Too many arguments for function ${fnName}: expected ${paramNames.length}, got ${positionalValues.length}`,
      );

    const parameterValues: unknown[] = [];
    const parameterSources: Array<SourceSeriesAccessor | undefined> = [];
    for (let index = 0; index < paramNames.length; index++) {
      const paramName = paramNames[index]!;
      if (namedValues.has(paramName)) {
        if (index < positionalValues.length)
          throw new Error(`Argument '${paramName}' for function ${fnName} was supplied multiple times`);
        parameterValues[index] = namedValues.get(paramName);
        parameterSources[index] = namedSources.get(paramName);
      } else if (index < positionalValues.length) {
        parameterValues[index] = positionalValues[index];
        parameterSources[index] = positionalSources[index];
      } else if (defaults[index]) {
        const rawDefault = defaults[index]!();
        parameterValues[index] = unwrapKnownSourceValue(rawDefault);
        parameterSources[index] = sourceForExpression(engine, defaultSourceExprs[index]!, rawDefault);
      } else {
        throw new Error(`function ${fnName} missing required argument '${paramName}'`);
      }
    }
    for (const name of namedValues.keys()) {
      if (!paramNames.includes(name)) throw new Error(`Unknown argument '${name}' for function ${fnName}`);
    }

    if (!functionScope) {
      functionScope = engine.rootScope.createChild();
      context.runtimeFunctionScopes.add(functionScope as EngineAny);
    }
    const savedScope = engine.scope;
    activeDepth++;
    engine.scope = activeDepth === 1 ? functionScope : engine.rootScope.createChild();
    engine.activeFunctionScopeKeys.push(callScopeKey);
    try {
      for (let index = 0; index < paramNames.length; index++) {
        declareSlotValue(paramSlots[index], parameterValues[index], parameterSources[index]);
        engine.scope.declareParameter(paramNames[index]!, parameterValues[index], parameterSources[index]);
      }
      const result = body();
      const source = bodySourceExpr ? sourceForExpression(engine, bodySourceExpr, result) : undefined;
      return source ? toKnownSourceValue(result, source) : result;
    } finally {
      engine.activeFunctionScopeKeys.pop();
      engine.scope = savedScope;
      activeDepth--;
    }
  };
}

function bindCall(expr: CallExpression, engine: EngineAny, context: BindContext): EvalClosure {
  const rawPath = memberPath(expr.callee);
  const rawName = rawPath?.join('.');
  if (rawName && !rawName.includes('.')) {
    const userFunction = context.functions.get(rawName);
    if (userFunction) return bindUserFunctionCall(expr, userFunction, engine, context);
  }
  if (!rawPath) {
    const method = bindMethodCall(expr, '<dynamic>', engine, context);
    if (method) return method;
    throw new Error('unsupported dynamic callee');
  }

  const canonicalFullName = callName(expr);
  const isLegacyColorTransparencyCall = rawName === 'color'
    && (expr.arguments.length <= 2 || expr.arguments.some((arg) => arg.name?.name === 'color' || arg.name?.name === 'transp'));
  const fullName = isLegacyColorTransparencyCall ? 'color.new' : canonicalFullName;
  const constructor = bindTypeConstructor(expr, fullName, engine, context);
  if (constructor) return constructor;

  const request = bindRequestCall(expr, fullName, engine);
  if (request) return request;

  const importedFunction = bindImportedFunctionCall(expr, fullName, engine, context);
  if (importedFunction) return importedFunction;

  if (!engine.builtins.has(fullName)) {
    const method = bindMethodCall(expr, fullName, engine, context);
    if (method) return method;
  }

  if (!engine.builtins.has(fullName)) {
    throw new Error(`unsupported call ${fullName}`);
  }
  const builtinName = fullName;
  const builtin = engine.builtins.get(builtinName);
  if (!builtin) throw new Error(`unsupported call ${fullName}`);
  const args = expr.arguments.map((arg, index) => ({
    name: arg.name?.name,
    value: bindExpression(arg.value, engine, context),
    sourceExpr: arg.value,
    preserveSource: shouldPreserveSourceArgument(builtinName, index, arg.name?.name),
  }));
  const callId = `closure:${expr.loc?.start.offset ?? 0}:${builtinName}`;
  const hasStaticTitle = hasStaticInputTitle(expr.arguments);
  const hasNamedArgs = args.some((arg) => arg.name);
  const preservesSource = args.some((arg) => arg.preserveSource);
  const needsInputMetadata = builtinName === 'input' || builtinName.startsWith('input.');
  const callIdFor = () =>
    SEQUENTIAL_CALL_ID_BUILTINS.has(builtinName) ? engine.nextBuiltinCallId(builtinName) : callId;

  if (!hasNamedArgs && !preservesSource && CALENDAR_PART_BUILTINS.has(builtinName) && args.length <= 2) {
    const timestamp = args[0]?.value;
    const timezone = args[1]?.value;
    return () =>
      engine.getCalendarPart(
        builtinName,
        timestamp ? unwrapKnownSourceValue(timestamp()) : engine.ctx.time.get(0),
        timezone ? engine.toStringValue(unwrapKnownSourceValue(timezone())) : engine.ctx.syminfo.timezone,
      );
  }

  if (!hasNamedArgs && !preservesSource && builtinName === 'timestamp') {
    const values = args.map((arg) => arg.value);
    return () => {
      if (values.length === 0) return Number.NaN;
      const first = unwrapKnownSourceValue(values[0]!());
      if (values.length === 1 && typeof first === 'string') {
        const parsed = Date.parse(first);
        return Number.isFinite(parsed) ? parsed : Number.NaN;
      }

      const hasTimezone = typeof first === 'string';
      const timezone = hasTimezone ? engine.toStringValue(first) : engine.ctx.syminfo.timezone;
      const offset = hasTimezone ? 1 : 0;
      const year = engine.toNumber(offset === 0 ? first : unwrapKnownSourceValue(values[offset]?.()));
      const month = engine.toNumber(unwrapKnownSourceValue(values[offset + 1]?.()));
      const day = engine.toNumber(unwrapKnownSourceValue(values[offset + 2]?.()));
      const hour = engine.toNumber(values[offset + 3] ? unwrapKnownSourceValue(values[offset + 3]!()) : 0);
      const minute = engine.toNumber(values[offset + 4] ? unwrapKnownSourceValue(values[offset + 4]!()) : 0);
      const second = engine.toNumber(values[offset + 5] ? unwrapKnownSourceValue(values[offset + 5]!()) : 0);
      if ([year, month, day, hour, minute, second].some((value) => !Number.isFinite(value))) {
        return Number.NaN;
      }
      return engine.resolveLocalTimestamp(timezone, year, month, day, hour, minute, second);
    };
  }

  if (!hasNamedArgs && !preservesSource && builtinName === 'color.new' && args.length <= 2) {
    const color = args[0]?.value;
    const transparency = args[1]?.value;
    return () => {
      const colorValue = color ? unwrapKnownSourceValue(color()) : undefined;
      const parsedColor = engine.parseColor(colorValue);
      if (!parsedColor) return colorValue;
      return engine.formatColor(
        parsedColor.red,
        parsedColor.green,
        parsedColor.blue,
        transparency ? unwrapKnownSourceValue(transparency()) : 0,
      );
    };
  }

  if (!hasNamedArgs && !preservesSource && builtinName === 'array.get' && args.length === 2) {
    const id = args[0]!.value;
    const index = args[1]!.value;
    return () => {
      const array = unwrapKnownSourceValue(id());
      const rawIndex = unwrapKnownSourceValue(index());
      if (Array.isArray(array)) return array[Math.trunc(engine.toNumber(rawIndex))];
      if (isPineArray(array)) return getArrayValue(array, engine.toNumber(rawIndex));
      throw new Error('Expected array');
    };
  }

  if (!hasNamedArgs && !preservesSource && !needsInputMetadata) {
    switch (args.length) {
      case 0:
        return () => builtin(EMPTY_POSITIONAL_ARGS, EMPTY_NAMED_ARGS, engine.ctx, engine.scope, callIdFor());
      case 1: {
        const arg0 = args[0]!.value;
        return () => builtin([arg0()], EMPTY_NAMED_ARGS, engine.ctx, engine.scope, callIdFor());
      }
      case 2: {
        const arg0 = args[0]!.value;
        const arg1 = args[1]!.value;
        return () => builtin([arg0(), arg1()], EMPTY_NAMED_ARGS, engine.ctx, engine.scope, callIdFor());
      }
      case 3: {
        const arg0 = args[0]!.value;
        const arg1 = args[1]!.value;
        const arg2 = args[2]!.value;
        return () => builtin([arg0(), arg1(), arg2()], EMPTY_NAMED_ARGS, engine.ctx, engine.scope, callIdFor());
      }
      case 4: {
        const arg0 = args[0]!.value;
        const arg1 = args[1]!.value;
        const arg2 = args[2]!.value;
        const arg3 = args[3]!.value;
        return () => builtin([arg0(), arg1(), arg2(), arg3()], EMPTY_NAMED_ARGS, engine.ctx, engine.scope, callIdFor());
      }
    }
  }

  return () => {
    const positional: unknown[] = [];
    const named = hasNamedArgs || needsInputMetadata ? new Map<string, unknown>() : EMPTY_NAMED_ARGS;
    for (const arg of args) {
      const raw = arg.value();
      const source = arg.preserveSource ? sourceForExpression(engine, arg.sourceExpr, raw) : undefined;
      const value = source && arg.preserveSource ? toKnownSourceValue(raw, source) : raw;
      if (arg.name) named.set(arg.name, value);
      else positional.push(value);
    }
    if (needsInputMetadata) {
      named.set('__tealscriptStaticTitle', hasStaticTitle);
    }
    return builtin(positional, named, engine.ctx, engine.scope, callIdFor());
  };
}

function bindImportedFunctionCall(
  expr: CallExpression,
  fullName: string,
  engine: EngineAny,
  context: BindContext,
): EvalClosure | null {
  const path = memberPath(expr.callee);
  if (path?.length !== 2) return null;
  const [alias, functionName] = path;
  if (!alias || !functionName || !context.importAliases.has(alias)) return null;
  const collectArgs = bindRuntimeCallArguments(expr, engine, context);
  return () => {
    const args = collectArgs();
    return engine.evaluateImportedFunction(
      alias,
      functionName,
      args.positional,
      args.named,
      args.positionalAfterNamed,
      expr,
      args.sourceBindings,
    );
  };
}

function bindMethodCall(
  expr: CallExpression,
  fullName: string,
  engine: EngineAny,
  context: BindContext,
): EvalClosure | null {
  if (expr.callee.type !== 'MemberExpression') return null;
  const receiverExpression = expr.callee.object;
  const methodName = expr.callee.property.name;
  const receiver = bindExpression(receiverExpression, engine, context);
  let activeReceiver: unknown;
  const userMethods = (context.methods.get(methodName) ?? []).map((method) => ({
    method,
    invoke: bindUserFunctionCall(expr, method, engine, context, [
      {
        value: () => activeReceiver,
        sourceExpr: expr.callee.type === 'MemberExpression' ? expr.callee.object : expr.callee,
      },
    ]),
  }));
  const args = expr.arguments.map((arg) => ({
    name: arg.name?.name,
    value: bindExpression(arg.value, engine, context),
    sourceExpr: arg.value,
  }));
  const hasNamedMethodArgs = args.some((arg) => arg.name);
  const methodCallId = (builtinName: string) => `closure:${expr.loc?.start.offset ?? 0}:${builtinName}`;

  return () => {
    activeReceiver = receiver();
    const receiverValue = unwrapKnownSourceValue(activeReceiver);
    try {
      const userMethod = userMethods.find(({ method }) => methodReceiverMatches(method, receiverValue, context));
      if (userMethod) return userMethod.invoke();

      const builtinName = isBuiltinMethodReceiver(receiverValue, engine)
        ? engine.getMethodBuiltinName?.(methodName, receiverValue)
        : undefined;
      const builtin = builtinName ? engine.builtins.get(builtinName) : undefined;
      if (builtin) {
        if (!hasNamedMethodArgs && builtinName === 'array.get' && args.length === 1) {
          const rawIndex = unwrapKnownSourceValue(args[0]!.value());
          if (Array.isArray(receiverValue)) return receiverValue[Math.trunc(engine.toNumber(rawIndex))];
          if (isPineArray(receiverValue)) return getArrayValue(receiverValue, engine.toNumber(rawIndex));
          throw new Error('Expected array');
        }
        if (!hasNamedMethodArgs) {
          switch (args.length) {
            case 0:
              return builtin([receiverValue], EMPTY_NAMED_ARGS, engine.ctx, engine.scope, methodCallId(builtinName));
            case 1:
              return builtin(
                [receiverValue, unwrapKnownSourceValue(args[0]!.value())],
                EMPTY_NAMED_ARGS,
                engine.ctx,
                engine.scope,
                methodCallId(builtinName),
              );
            case 2:
              return builtin(
                [receiverValue, unwrapKnownSourceValue(args[0]!.value()), unwrapKnownSourceValue(args[1]!.value())],
                EMPTY_NAMED_ARGS,
                engine.ctx,
                engine.scope,
                methodCallId(builtinName),
              );
            case 3:
              return builtin(
                [
                  receiverValue,
                  unwrapKnownSourceValue(args[0]!.value()),
                  unwrapKnownSourceValue(args[1]!.value()),
                  unwrapKnownSourceValue(args[2]!.value()),
                ],
                EMPTY_NAMED_ARGS,
                engine.ctx,
                engine.scope,
                methodCallId(builtinName),
              );
          }
        }
        const positional: unknown[] = [receiverValue];
        const named = hasNamedMethodArgs ? new Map<string, unknown>() : EMPTY_NAMED_ARGS;
        for (const arg of args) {
          const raw = arg.value();
          const value = unwrapKnownSourceValue(raw);
          if (arg.name) named.set(arg.name, value);
          else positional.push(value);
        }
        return builtin(positional, named, engine.ctx, engine.scope, methodCallId(builtinName));
      }
      const importedMethod =
        engine.findCallableImportedMethod(receiverValue, methodName, [receiverValue], new Map()) ??
        engine.findReceiverMatchingImportedMethod(receiverValue, methodName, [receiverValue], new Map());
      if (importedMethod) {
        const positional: unknown[] = [receiverValue];
        const named = new Map<string, unknown>();
        const receiverSource = sourceForExpression(engine, receiverExpression, activeReceiver);
        const sourceBindings = {
          positional: [receiverSource] as Array<SourceSeriesAccessor | undefined>,
          named: new Map<string, SourceSeriesAccessor>(),
        };
        let sawNamed = false;
        let positionalAfterNamed = false;
        for (const arg of args) {
          const raw = arg.value();
          const value = unwrapKnownSourceValue(raw);
          const source = sourceForExpression(engine, arg.sourceExpr, raw);
          if (arg.name) {
            sawNamed = true;
            named.set(arg.name, value);
            if (source) sourceBindings.named.set(arg.name, source);
          } else {
            if (sawNamed) positionalAfterNamed = true;
            sourceBindings.positional[positional.length] = source;
            positional.push(value);
          }
        }
        return engine.evaluateImportedLibraryFunction(
          importedMethod.library,
          importedMethod.method,
          positional,
          named,
          positionalAfterNamed,
          expr,
          sourceBindings,
        );
      }
      if (methodName === 'title') {
        const enumTitle = engine.evaluateEnumTitleMethod(receiverValue);
        if (enumTitle !== undefined) return enumTitle;
      }
      if (methodName === 'copy' && isPineUdtObject(receiverValue)) {
        if (args.length > 0) throw new Error('copy does not accept arguments');
        return copyUdtObject(receiverValue);
      }

      throw new Error(`unsupported call ${fullName}`);
    } finally {
      activeReceiver = undefined;
    }
  };
}

function bindRuntimeCallArguments(
  expr: CallExpression,
  engine: EngineAny,
  context: BindContext,
): () => RuntimeCallArguments {
  const args = expr.arguments.map((arg) => ({
    name: arg.name?.name,
    value: bindExpression(arg.value, engine, context),
    sourceExpr: arg.value,
  }));
  return () => {
    const positional: unknown[] = [];
    const named = new Map<string, unknown>();
    const sourceBindings: RuntimeCallArguments['sourceBindings'] = { positional: [], named: new Map() };
    let sawNamed = false;
    let positionalAfterNamed = false;
    for (const arg of args) {
      const raw = arg.value();
      const value = unwrapKnownSourceValue(raw);
      const source = sourceForExpression(engine, arg.sourceExpr, raw);
      if (arg.name) {
        sawNamed = true;
        named.set(arg.name, value);
        if (source) sourceBindings.named.set(arg.name, source);
      } else {
        if (sawNamed) positionalAfterNamed = true;
        sourceBindings.positional[positional.length] = source;
        positional.push(value);
      }
    }
    return { positional, named, sourceBindings, positionalAfterNamed };
  };
}

function functionBodyContainsNamedCall(fn: FunctionDeclaration, name: string): boolean {
  const seen = new WeakSet<object>();
  const visit = (node: unknown): boolean => {
    if (!node || typeof node !== 'object') return false;
    if (seen.has(node)) return false;
    seen.add(node);

    if ((node as { type?: unknown }).type === 'CallExpression') {
      const call = node as CallExpression;
      if (call.callee.type === 'Identifier' && call.callee.name === name) return true;
    }

    for (const value of Object.values(node)) {
      if (Array.isArray(value)) {
        for (const entry of value) {
          if (visit(entry)) return true;
        }
      } else if (visit(value)) {
        return true;
      }
    }

    return false;
  };

  return Array.isArray(fn.body) ? fn.body.some((stmt) => visit(stmt)) : visit(fn.body);
}

function methodReceiverMatches(method: FunctionDeclaration, receiver: unknown, context: BindContext): boolean {
  const annotation = typeAnnotationName(method.params[0]?.typeAnnotation);
  if (!annotation) return true;
  if (isPineUdtObject(receiver)) return annotation === receiver.typeName;
  return !context.types.has(annotation);
}

function isBuiltinMethodReceiver(value: unknown, engine: EngineAny): boolean {
  if (isPineArray(value) || isPineMatrix(value) || isPineMap(value)) return true;
  const drawingId = engine.toDrawingId?.(value);
  if (!drawingId) return false;
  if (engine.ctx?.getDrawing?.(drawingId)) return true;
  return /^(line|label|box|table|polyline|linefill)_/.test(drawingId);
}

function bindTypeConstructor(
  expr: CallExpression,
  fullName: string,
  engine: EngineAny,
  context: BindContext,
): EvalClosure | null {
  if (!fullName.endsWith('.new')) return null;
  const typeName = fullName.slice(0, -'.new'.length);
  const declaration = context.types.get(typeName);
  const importedAlias = typeName.split('.')[0];
  if (!declaration && (!importedAlias || !context.importAliases.has(importedAlias))) return null;
  if (!declaration) {
    const collectArgs = bindRuntimeCallArguments(expr, engine, context);
    return () => {
      const args = collectArgs();
      const importedType = engine.findImportedType(typeName);
      if (!importedType?.exported) throw new Error(`Unknown library type: ${typeName}`);
      return engine.evaluateImportedTypeConstructor(
        importedType.library,
        importedType.declaration,
        args.positional,
        args.named,
        args.positionalAfterNamed,
      );
    };
  }

  const args = expr.arguments.map((arg) => ({
    name: arg.name?.name,
    value: bindExpression(arg.value, engine, context),
  }));
  const fieldDefaults = declaration.fields.map((field) =>
    field.defaultValue ? bindExpression(field.defaultValue, engine, context) : undefined,
  );
  const fieldNames = declaration.fields.map((field) => field.name.name);
  const fieldNameSet = new Set(fieldNames);
  const varipFields = declaration.fields.filter((field) => field.varip).map((field) => field.name.name);

  return () => {
    const positional: unknown[] = [];
    const named = new Map<string, unknown>();
    let sawNamed = false;
    let positionalAfterNamed = false;

    for (const arg of args) {
      const value = unwrapKnownSourceValue(arg.value());
      if (arg.name) {
        sawNamed = true;
        named.set(arg.name, value);
      } else {
        if (sawNamed) positionalAfterNamed = true;
        positional.push(value);
      }
    }

    if (positionalAfterNamed) throw new Error(`${typeName}.new cannot use positional arguments after named arguments`);
    if (positional.length > declaration.fields.length) {
      throw new Error(
        `Too many arguments for ${typeName}.new: expected ${declaration.fields.length}, got ${positional.length}`,
      );
    }
    for (const name of named.keys()) {
      if (!fieldNameSet.has(name)) throw new Error(`Unknown field '${name}' for ${typeName}.new`);
    }

    const fieldValues = new Map<string, unknown>();
    declaration.fields.forEach((field, index) => {
      const fieldName = fieldNames[index]!;
      let value: unknown;
      if (index < positional.length) {
        if (named.has(fieldName))
          throw new Error(`Field '${fieldName}' for ${typeName}.new was supplied multiple times`);
        value = positional[index];
      } else if (named.has(fieldName)) {
        value = named.get(fieldName);
      } else {
        value = fieldDefaults[index] ? fieldDefaults[index]!() : defaultUdtFieldValue(field);
      }
      fieldValues.set(fieldName, unwrapKnownSourceValue(value));
    });

    return createPineUdtObject(typeName, fieldValues, varipFields);
  };
}

function bindRequestCall(expr: CallExpression, fullName: string, engine: EngineAny): EvalClosure | null {
  const callId = `closure:${expr.loc?.start.offset ?? 0}:${fullName}`;
  switch (fullName) {
    case 'request.security':
      return () => engine.evaluateRequestSecurity(expr, callId);
    case 'request.security_lower_tf':
      return () => engine.evaluateRequestSecurityLowerTf(expr, callId);
    case 'request.seed':
      return () => engine.evaluateRequestSeed(expr, callId);
    case 'request.currency_rate':
      return () => engine.evaluateRequestCurrencyRate(expr);
    case 'request.economic':
      return () => engine.evaluateRequestEconomic(expr);
    case 'request.dividends':
      return () => engine.evaluateRequestCorporateAction(expr, 'dividends', 'dividends.gross', true);
    case 'request.earnings':
      return () => engine.evaluateRequestCorporateAction(expr, 'earnings', 'earnings.actual', true);
    case 'request.splits':
      return () => engine.evaluateRequestCorporateAction(expr, 'splits', 'splits.denominator', false);
    case 'request.financial':
      return () => engine.evaluateRequestFinancial(expr);
    case 'request.quandl':
      return () => engine.evaluateRequestQuandl(expr);
    case 'request.footprint':
      return () => engine.evaluateRequestFootprint(expr);
    default:
      return null;
  }
}

function installBoundExecution(engine: EngineAny, bound: BoundClosureProgram): void {
  engine.executeHistoricalStatements = () => {
    try {
      return bound.runBar();
    } catch (error) {
      engine.errors.push(createClosureExecutionError(error));
      return false;
    }
  };
}

class ClosureStatementError extends Error {
  readonly line?: number;
  readonly column?: number;

  constructor(error: unknown, line?: number, column?: number) {
    super(error instanceof Error ? error.message : String(error));
    this.name = 'ClosureStatementError';
    this.line = line;
    this.column = column;
  }
}

function createClosureExecutionError(error: unknown): { message: string; line?: number; column?: number } {
  const message = error instanceof Error ? error.message : String(error);
  if (error instanceof ClosureStatementError) {
    return {
      message,
      line: error.line,
      column: error.column,
    };
  }
  return { message };
}

function typeAnnotationName(typeAnnotation: TypeAnnotation | null | undefined): string | undefined {
  if (!typeAnnotation) return undefined;
  return typeAnnotation.baseType === 'udt' ? typeAnnotation.name : typeAnnotation.baseType;
}

function parameterName(name: string | Identifier): string {
  return typeof name === 'string' ? name : name.name;
}

function isNa(value: unknown): boolean {
  return typeof value === 'number' && Number.isNaN(value);
}

function naIfMissing(value: unknown): unknown {
  return value === undefined ? Number.NaN : value;
}

function normalizeIndexOffset(value: unknown): number | null {
  const unwrapped = unwrapKnownSourceValue(value);
  if (typeof unwrapped !== 'number' || !Number.isFinite(unwrapped)) return null;
  const offset = Math.trunc(unwrapped);
  return offset < 0 ? null : offset;
}

function readArrayElement(array: unknown, index: number): unknown {
  if (isPineArray(array)) return getArrayValue(array, index);
  if (Array.isArray(array)) return array[index];
  throw new Error('Index access on non-array/non-series');
}

function setArrayElement(array: unknown, index: number, value: unknown): void {
  if (isPineArray(array)) {
    setArrayValue(array, index, value);
    return;
  }
  if (Array.isArray(array)) {
    if (index < 0 || index >= array.length) {
      throw new Error(`Array index ${index} is out of bounds. Array size is ${array.length}`);
    }
    array[index] = value;
    return;
  }
  throw new Error('Index assignment expects an array');
}

function isTruthy(value: unknown): boolean {
  if (isKnownSourceValue(value)) return isTruthy(value.value);
  if (typeof value === 'number') return !Number.isNaN(value) && value !== 0;
  return Boolean(value);
}

function isComparisonOperator(operator: BinaryExpression['operator']): boolean {
  return ['==', '!=', '<', '>', '<=', '>='].includes(operator);
}

function toStringValue(value: unknown): string {
  if (isNa(value)) return 'na';
  return String(value);
}

function isKnownSourceValue(value: unknown): value is KnownSourceValue {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as { __tealscriptKnownSource?: unknown }).__tealscriptKnownSource === true
  );
}

function toKnownSourceValue(value: unknown, series: SourceSeriesAccessor): KnownSourceValue {
  return {
    __tealscriptKnownSource: true,
    value: unwrapKnownSourceValue(value),
    series,
  };
}

function unwrapKnownSourceValue(value: unknown): unknown {
  return isKnownSourceValue(value) ? value.value : value;
}

function sourceForKnownIdentifier(engine: EngineAny, name: string): SourceSeriesAccessor | undefined {
  const ctx = engine.ctx;
  switch (name) {
    case 'open':
      return ctx.open;
    case 'high':
      return ctx.high;
    case 'low':
      return ctx.low;
    case 'close':
      return ctx.close;
    case 'volume':
      return ctx.volume;
    case 'bid':
      return ctx.bid;
    case 'ask':
      return ctx.ask;
    case 'time':
      return ctx.time;
    case 'time_tradingday':
      return {
        get: (offset) => {
          const value = ctx.time.get(offset);
          return value === undefined ? undefined : engine.getTradingDayTime(value, ctx.syminfo.timezone);
        },
      };
    case 'timenow':
      return ctx.timenow;
    case 'time_close':
      return {
        get: (offset) => {
          const value = ctx.time.get(offset);
          return value === undefined ? undefined : engine.getBarCloseTime(value, ctx.timeframe.period);
        },
      };
    case 'last_bar_time':
      return {
        get: (offset) => {
          const rawOffset = Math.trunc(Number(offset));
          return Number.isFinite(rawOffset) && rawOffset <= ctx.bar_index
            ? ctx.getBar(ctx.last_bar_index)?.time
            : undefined;
        },
      };
    case 'bar_index':
    case 'n':
      return {
        get: (offset) => {
          const value = ctx.bar_index - offset;
          return value >= 0 ? value : undefined;
        },
      };
    case 'hl2':
    case 'hlc3':
    case 'ohlc4':
    case 'hlcc4':
      return engine.getKnownSeriesByName(name, ctx);
    default:
      return undefined;
  }
}

function sourceForExpression(engine: EngineAny, expr: Expression, value?: unknown): SourceSeriesAccessor | undefined {
  const engineSource = engine.getSourceSeriesForExpression?.(expr, value);
  if (engineSource) return engineSource;
  if (isKnownSourceValue(value)) return value.series;
  if (expr.type !== 'Identifier') return undefined;
  return engine.scope.getSourceSeries(expr.name) ?? sourceForKnownIdentifier(engine, expr.name);
}

function shouldPreserveSourceArgument(fullName: string, argIndex: number, namedName?: string): boolean {
  const parameter =
    namedName ??
    (argIndex === 0 ? (fullName === 'input' || fullName === 'input.source' ? 'defval' : 'source') : undefined);
  if (fullName === 'input' || fullName === 'input.source') return parameter === 'defval';
  if (fullName === 'math.sum') return parameter === 'source';
  if (fullName.startsWith('ta.'))
    return parameter !== undefined && ['source', 'series', 'source1', 'source2', 'high', 'low'].includes(parameter);
  return false;
}

function createLocalEnumValues(declaration: EnumDeclaration, enumTitles: Map<string, string>): Map<string, string> {
  const values = new Map<string, string>();
  for (const field of declaration.fields) {
    const key = `${declaration.name.name}.${field.name.name}`;
    values.set(field.name.name, key);
    enumTitles.set(key, field.title?.value ?? field.name.name);
  }
  return values;
}

function defaultUdtFieldValue(field: TypeFieldDeclaration): unknown {
  return field.typeAnnotation?.baseType === 'bool' ? false : Number.NaN;
}

function memberPath(expr: Expression): string[] | null {
  if (expr.type === 'Identifier') return [expr.name];
  if (expr.type !== 'MemberExpression') return null;
  const left = memberPath(expr.object);
  return left ? [...left, expr.property.name] : null;
}

function rawCallName(expr: CallExpression): string {
  const path = memberPath(expr.callee);
  if (!path) throw new Error('unsupported dynamic callee');
  return path.join('.');
}

function callName(expr: CallExpression): string {
  const path = memberPath(expr.callee);
  if (!path) throw new Error('unsupported dynamic callee');
  return canonicalName(path.join('.'));
}

function canonicalName(name: string): string {
  if (name === 'security') return 'request.security';
  if (name === 'color') return 'color.rgb';
  if (LEGACY_GLOBAL_TA_ALIASES.has(name)) return `ta.${name}`;
  if (LEGACY_GLOBAL_MATH_ALIASES.has(name)) return `math.${name}`;
  if (LEGACY_GLOBAL_STR_ALIASES.has(name)) return `str.${name}`;
  return LEGACY_GLOBAL_TICKER_ALIASES.get(name) ?? name;
}

function hasStaticInputTitle(args: CallExpression['arguments']): boolean {
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

function applyAssignmentOperator(
  currentValue: unknown,
  value: unknown,
  operator: AssignmentStatement['operator'],
): unknown {
  if (operator === ':=') return value;
  const current = currentValue as number;
  const next = value as number;
  switch (operator) {
    case '+=':
      return current + next;
    case '-=':
      return current - next;
    case '*=':
      return current * next;
    case '/=':
      return next === 0 ? Number.NaN : current / next;
    case '%=':
      return next === 0 ? Number.NaN : current % next;
  }
}

function isLoopControl(error: unknown, signal: typeof BREAK_SIGNAL | typeof CONTINUE_SIGNAL): boolean {
  return typeof error === 'object' && error !== null && (error as LoopControl).signal === signal;
}

function valuesForCollectionIterable(value: unknown): { values: unknown[]; keys: unknown[] | null } {
  if (Array.isArray(value)) return { values: value, keys: null };
  if (isPineArray(value)) {
    return {
      values: Array.from({ length: getArraySize(value) }, (_entry, index) => getArrayValue(value, index)),
      keys: null,
    };
  }
  if (isPineMap(value)) {
    const entries = mapEntries(value);
    return { keys: entries.map(([key]) => key), values: entries.map(([_key, entry]) => entry) };
  }
  if (isPineMatrix(value)) {
    return { values: Array.from({ length: value.rows }, (_entry, row) => matrixRow(value, row)), keys: null };
  }
  throw new Error('For-in loop expects an array, map, or matrix');
}

function functionStatementReturnsName(stmt: Statement, functionName: string): boolean {
  if (stmt.type === 'VariableDeclaration' && stmt.names.type === 'VariableDeclarator') {
    return stmt.names.name.name === functionName;
  }
  return stmt.type === 'AssignmentStatement' && stmt.left.type === 'Identifier' && stmt.left.name === functionName;
}
