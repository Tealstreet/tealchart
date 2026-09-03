import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { performance } from 'node:perf_hooks';

import { checkProgram } from '../src/semantic/checker.ts';
import { parse } from '../src/parser/parser.ts';
import type {
  AssignmentStatement,
  BinaryExpression,
  CallExpression,
  CollectionForStatement,
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
  TypeAnnotation,
  VariableDeclaration,
  WhileStatement,
} from '../src/parser/ast.ts';
import type { Bar } from '../src/runtime/context.ts';
import { executeScript, TealscriptEngine } from '../src/runtime/engine.ts';
import { executeCompiled, tryCompile } from '../src/runtime/codegen/execute.ts';
import { getArraySize, getArrayValue, isPineArray } from '../src/runtime/arrays.ts';
import { isPineMatrix, matrixRow } from '../src/runtime/matrices.ts';
import { isPineMap, mapEntries } from '../src/runtime/maps.ts';

type EngineAny = Record<string, any>;
type EvalClosure = () => unknown;
type StatementClosure = () => StatementResult;

interface StatementResult {
  hasResult: boolean;
  value?: unknown;
}

interface BindContext {
  functions: Map<string, FunctionDeclaration>;
  runtimeFunctionScopes: Set<EngineAny>;
}

interface BoundProgram {
  runBar: () => boolean;
  unsupported: string[];
}

interface CorpusRow {
  localPath: string;
  declaredVersion: number | 'unknown';
  declarationKind: string;
  byteSize: number;
  validity: { bucket: string };
  outputParity: { status: string };
  executionMode: string;
}

const TARGET_SCRIPT_COUNT = 24;
const BARS_PER_SCRIPT = 160;
const WARMUP_RUNS = 3;
const MEASURE_RUNS = 20;
const T91_BASELINE = {
  handledScripts: 14,
  totalBars: 2240,
  steadyUsPerBar: {
    compiled: 21.7,
    interpreter: 34.8,
    closure: 25.5,
  },
};

const repoRoot = resolve(new URL('../../..', import.meta.url).pathname);
const corpusDir = process.argv[2] ?? '/tmp/pine-corpus-v1';
const outputPath = process.argv[3]
  ? resolve(repoRoot, process.argv[3])
  : resolve(repoRoot, 'packages/tealscript/reports/mobile-codegen-investigation-t92.json');

const NO_RESULT: StatementResult = { hasResult: false };
const BREAK_SIGNAL = Symbol('break');
const CONTINUE_SIGNAL = Symbol('continue');

interface LoopControl {
  signal: typeof BREAK_SIGNAL | typeof CONTINUE_SIGNAL;
}

function currentGitCommit(): string {
  return execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repoRoot, encoding: 'utf8' }).trim();
}

function createBars(count: number): Bar[] {
  const first = Date.UTC(2024, 0, 2, 14, 30, 0);
  const bars: Bar[] = [];
  for (let index = 0; index < count; index++) {
    const wave = Math.sin(index / 7) * 1.7;
    const close = 100 + index * 0.35 + wave;
    const open = close - Math.sin(index / 5) * 0.8;
    const high = Math.max(open, close) + 0.9 + (index % 4) * 0.11;
    const low = Math.min(open, close) - 0.8 - (index % 3) * 0.09;
    bars.push({
      time: first + index * 60_000,
      open,
      high,
      low,
      close,
      volume: 1000 + index * 13 + (index % 9) * 17,
    });
  }
  return bars;
}

function isEligibleSource(source: string, row: CorpusRow): boolean {
  return row.validity.bucket === 'supported'
    && row.outputParity.status === 'matched'
    && row.executionMode === 'compiled'
    && !/\bimport\s+/i.test(source)
    && !/\brequest\./i.test(source)
    && !/\bsecurity\s*\(/i.test(source);
}

function memberPath(expr: Expression): string[] | null {
  if (expr.type === 'Identifier') return [expr.name];
  if (expr.type !== 'MemberExpression') return null;
  const left = memberPath(expr.object);
  return left ? [...left, expr.property.name] : null;
}

function callName(expr: CallExpression): string {
  const path = memberPath(expr.callee);
  if (!path) throw new Error('unsupported dynamic callee');
  return canonicalName(path.join('.'));
}

const LEGACY_GLOBAL_TA_ALIASES = new Set([
  'alma', 'atr', 'barssince', 'bb', 'bbw', 'cci', 'change', 'cmo', 'cog',
  'correlation', 'covariance', 'cross', 'crossover', 'crossunder', 'cum', 'dev',
  'dmi', 'ema', 'falling', 'highest', 'highestbars', 'hma', 'kc', 'kcw',
  'linreg', 'lowest', 'lowestbars', 'macd', 'median', 'mfi', 'mode', 'mom',
  'obv', 'percentrank', 'percentile_linear_interpolation',
  'percentile_nearest_rank', 'pivothigh', 'pivotlow', 'range', 'rising', 'rma',
  'roc', 'rsi', 'sar', 'sma', 'stdev', 'stoch', 'supertrend', 'swma', 'tr',
  'tsi', 'valuewhen', 'variance', 'vwap', 'vwma', 'wma', 'wpr',
]);

const LEGACY_GLOBAL_MATH_ALIASES = new Set([
  'abs', 'ceil', 'floor', 'round', 'sqrt', 'log', 'log10', 'pow', 'sign', 'max',
  'min', 'avg', 'sum', 'sin', 'cos', 'tan', 'asin', 'acos', 'atan', 'exp',
  'toradians', 'todegrees',
]);

const LEGACY_GLOBAL_STR_ALIASES = new Set(['tostring', 'tonumber']);
const LEGACY_INPUT_TYPE_CONSTANTS = new Map([
  ['bool', 'bool'],
  ['integer', 'int'],
  ['int', 'int'],
  ['float', 'float'],
  ['string', 'string'],
  ['source', 'source'],
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

function canonicalName(name: string): string {
  if (name === 'security') return 'request.security';
  if (name === 'color') return 'color.rgb';
  if (LEGACY_GLOBAL_TA_ALIASES.has(name)) return `ta.${name}`;
  if (LEGACY_GLOBAL_MATH_ALIASES.has(name)) return `math.${name}`;
  if (LEGACY_GLOBAL_STR_ALIASES.has(name)) return `str.${name}`;
  return name;
}

function typeAnnotationName(typeAnnotation: TypeAnnotation | null | undefined): string | undefined {
  if (!typeAnnotation) return undefined;
  return typeAnnotation.baseType === 'udt' ? typeAnnotation.name : typeAnnotation.baseType;
}

function isNa(value: unknown): boolean {
  return typeof value === 'number' && Number.isNaN(value);
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

function isKnownSourceValue(value: unknown): value is { __tealscriptSource: true; value: unknown; series: { get(offset: number): number | undefined } } {
  return typeof value === 'object' && value !== null && (value as { __tealscriptSource?: unknown }).__tealscriptSource === true;
}

function unwrapKnownSourceValue(value: unknown): unknown {
  return isKnownSourceValue(value) ? value.value : value;
}

function sourceForKnownIdentifier(engine: EngineAny, name: string): { get(offset: number): number | undefined } | undefined {
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
    case 'time':
      return ctx.time;
    case 'hl2':
    case 'hlc3':
    case 'ohlc4':
    case 'hlcc4':
      return engine.getKnownSeriesByName(name, ctx);
    default:
      return undefined;
  }
}

function sourceForExpression(engine: EngineAny, expr: Expression, value?: unknown): { get(offset: number): number | undefined } | undefined {
  if (isKnownSourceValue(value)) return value.series;
  if (expr.type !== 'Identifier') return undefined;
  return engine.scope.getSourceSeries(expr.name) ?? sourceForKnownIdentifier(engine, expr.name);
}

function shouldPreserveSourceArgument(fullName: string, argIndex: number, namedName?: string): boolean {
  const parameter = namedName ?? (argIndex === 0 ? 'source' : undefined);
  if (fullName === 'input' || fullName === 'input.source') return parameter === 'defval';
  if (fullName === 'math.sum') return parameter === 'source';
  if (fullName.startsWith('ta.')) return parameter !== undefined && ['source', 'series', 'source1', 'source2', 'high', 'low'].includes(parameter);
  return false;
}

function bindProgram(ast: Program, engine: EngineAny): BoundProgram {
  const unsupported: string[] = [];
  const context: BindContext = {
    functions: new Map(),
    runtimeFunctionScopes: new Set(),
  };
  for (const stmt of ast.body) {
    if (stmt.type === 'FunctionDeclaration' && !stmt.isMethod) {
      context.functions.set(stmt.name.name, stmt);
    }
  }
  const bindStmtSafe = (stmt: Statement): StatementClosure | null => {
    try {
      return bindStatement(stmt, engine, context);
    } catch (error) {
      unsupported.push(`${stmt.type}: ${error instanceof Error ? error.message : String(error)}`);
      return null;
    }
  };

  const statements = ast.body.map(bindStmtSafe);
  if (unsupported.length > 0 || statements.some((stmt) => stmt === null)) {
    return { unsupported, runBar: () => false };
  }
  const closures = statements as StatementClosure[];
  return {
    unsupported,
    runBar: () => {
      for (const functionScope of context.runtimeFunctionScopes) {
        functionScope.advanceBar();
      }
      let shouldHalt = false;
      for (const statement of closures) {
        const result = statement();
        shouldHalt ||= result.hasResult && result.value === true;
      }
      for (const functionScope of context.runtimeFunctionScopes) {
        functionScope.commit(false);
      }
      return shouldHalt;
    },
  };
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
    case 'ExpressionStatement': {
      const expr = bindExpression(stmt.expression, engine, context);
      return () => ({ hasResult: true, value: expr() });
    }
    case 'MultiExpressionStatement': {
      const expressions = stmt.expressions.map((expr) => bindExpression(expr, engine, context));
      return () => {
        let result: StatementResult = NO_RESULT;
        for (const expr of expressions) {
          result = { hasResult: true, value: expr() };
        }
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
      return () => { throw { signal: BREAK_SIGNAL } satisfies LoopControl; };
    case 'ContinueStatement':
      return () => { throw { signal: CONTINUE_SIGNAL } satisfies LoopControl; };
    default:
      throw new Error(`unsupported statement ${stmt.type}`);
  }
}

function isLoopControl(error: unknown, signal: typeof BREAK_SIGNAL | typeof CONTINUE_SIGNAL): boolean {
  return typeof error === 'object' && error !== null && (error as LoopControl).signal === signal;
}

function bindFor(stmt: ForStatement, engine: EngineAny, context: BindContext): StatementClosure {
  return stmt.kind === 'collection'
    ? bindForIn(stmt, engine, context)
    : bindNumericFor(stmt, engine, context);
}

function bindNumericFor(stmt: NumericForStatement, engine: EngineAny, context: BindContext): StatementClosure {
  const start = bindExpression(stmt.start, engine, context);
  const end = bindExpression(stmt.end, engine, context);
  const step = stmt.step ? bindExpression(stmt.step, engine, context) : undefined;
  const body = stmt.body.map((child) => bindStatement(child, engine, context));
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
    return {
      keys: entries.map(([key]) => key),
      values: entries.map(([_key, entry]) => entry),
    };
  }
  if (isPineMatrix(value)) {
    return {
      values: Array.from({ length: value.rows }, (_entry, row) => matrixRow(value, row)),
      keys: null,
    };
  }
  throw new Error('For-in loop expects an array, map, or matrix');
}

function bindForIn(stmt: CollectionForStatement, engine: EngineAny, context: BindContext): StatementClosure {
  const iterable = bindExpression(stmt.iterable, engine, context);
  const body = stmt.body.map((child) => bindStatement(child, engine, context));
  return () => {
    const { values, keys } = valuesForCollectionIterable(unwrapKnownSourceValue(iterable()));
    const childScope = engine.scope.createChild();
    const savedScope = engine.scope;
    engine.scope = childScope;
    let result: StatementResult = NO_RESULT;

    try {
      for (let index = 0; index < values.length; index++) {
        if (stmt.indexCounter) {
          engine.scope.declare(stmt.indexCounter.name, 'none', keys ? keys[index] : index);
        }
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
  const body = stmt.body.map((child) => bindStatement(child, engine, context));
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

function bindIndicator(stmt: IndicatorDeclaration, engine: EngineAny, context: BindContext): StatementClosure {
  const title = bindExpression(stmt.title, engine, context);
  const shorttitle = stmt.shorttitle ? bindExpression(stmt.shorttitle, engine, context) : undefined;
  const overlay = stmt.overlay ? bindExpression(stmt.overlay, engine, context) : undefined;
  const format = stmt.format ? bindExpression(stmt.format, engine, context) : undefined;
  const precision = stmt.precision ? bindExpression(stmt.precision, engine, context) : undefined;
  const scale = stmt.scale ? bindExpression(stmt.scale, engine, context) : undefined;
  return () => {
    if (engine.ctx.bar_index !== 0) return NO_RESULT;
    engine.ctx.indicatorTitle = title() as string;
    if (shorttitle) engine.ctx.indicatorShortTitle = toStringValue(shorttitle());
    if (overlay) engine.ctx.indicatorOverlay = isTruthy(overlay());
    if (format) engine.ctx.indicatorFormat = toStringValue(format());
    if (precision) engine.ctx.indicatorPrecision = Math.trunc(Number(precision()));
    if (scale) engine.ctx.indicatorScale = toStringValue(scale());
    return NO_RESULT;
  };
}

function bindVariableDeclaration(stmt: VariableDeclaration, engine: EngineAny, context: BindContext): StatementClosure {
  if (stmt.init.type === 'IfStatement') throw new Error('if-expression initializers are outside the prototype');
  const kind = stmt.kind;
  const init = bindExpression(stmt.init, engine, context);
  const typeName = typeAnnotationName(stmt.typeAnnotation);
  if (stmt.names.type === 'TupleDeclarator') {
    const names = stmt.names.names.map((name) => name.name);
    return () => {
      if ((kind === 'var' || kind === 'varip') && names.every((name) => name === '_' || engine.scope.getEntry(name)?.initialized)) return NO_RESULT;
      const value = init();
      if (!Array.isArray(value)) throw new Error('Cannot destructure non-array value');
      for (let index = 0; index < names.length; index++) {
        const name = names[index];
        if (name === '_') continue;
        engine.scope.declare(name, kind, value[index], typeName);
      }
      return NO_RESULT;
    };
  }
  const name = stmt.names.name.name;
  return () => {
    const existing = engine.scope.getEntry(name);
    if ((kind === 'var' || kind === 'varip') && existing?.initialized) return NO_RESULT;
    const raw = init();
    const value = unwrapKnownSourceValue(raw);
    engine.scope.declare(name, kind, value, typeName, sourceForExpression(engine, stmt.init as Expression, raw));
    return NO_RESULT;
  };
}

function bindAssignment(stmt: AssignmentStatement, engine: EngineAny, context: BindContext): StatementClosure {
  if (stmt.left.type !== 'Identifier') throw new Error('non-identifier assignments are outside the prototype');
  if (stmt.right.type === 'IfStatement') throw new Error('if-expression assignment is outside the prototype');
  const name = stmt.left.name;
  const right = bindExpression(stmt.right, engine, context);
  const operator = stmt.operator;
  return () => {
    const raw = right();
    const value = unwrapKnownSourceValue(raw);
    const current = engine.scope.get(name);
    const next = applyAssignmentOperator(current, value, operator);
    engine.scope.set(name, next, operator === ':=' ? sourceForExpression(engine, stmt.right as Expression, raw) : undefined);
    return NO_RESULT;
  };
}

function applyAssignmentOperator(currentValue: unknown, value: unknown, operator: AssignmentStatement['operator']): unknown {
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

function bindIf(stmt: IfStatement, engine: EngineAny, context: BindContext): StatementClosure {
  const test = bindExpression(stmt.test, engine, context);
  const consequent = stmt.consequent.map((child) => bindStatement(child, engine, context));
  const alternate = Array.isArray(stmt.alternate)
    ? stmt.alternate.map((child) => bindStatement(child, engine, context))
    : stmt.alternate
      ? [bindIf(stmt.alternate, engine, context)]
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
      return bindIdentifier(expr, engine);
    case 'BinaryExpression':
      return bindBinary(expr, engine, context);
    case 'UnaryExpression':
      return bindUnary(expr, engine, context);
    case 'ConditionalExpression': {
      const test = bindExpression(expr.test, engine, context);
      const consequent = bindExpression(expr.consequent, engine, context);
      const alternate = bindExpression(expr.alternate, engine, context);
      return () => isTruthy(test()) ? consequent() : alternate();
    }
    case 'CallExpression':
      return bindCall(expr, engine, context);
    case 'MemberExpression':
      return bindMember(expr, engine);
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

function bindIdentifier(expr: Identifier, engine: EngineAny): EvalClosure {
  const name = expr.name;
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
    case 'time':
      return () => engine.ctx.time.get(0);
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
      return () => engine.builtins.get('ta.tr')?.([], new Map(), engine.ctx, engine.scope, callId) ?? Number.NaN;
    }
    default:
      if (LEGACY_INPUT_TYPE_CONSTANTS.has(name)) {
        const value = LEGACY_INPUT_TYPE_CONSTANTS.get(name);
        return () => value;
      }
      if (Object.prototype.hasOwnProperty.call(LEGACY_BARE_COLOR_CONSTANTS, name)) {
        const value = LEGACY_BARE_COLOR_CONSTANTS[name];
        return () => value;
      }
      return () => {
        const entry = engine.scope.getEntry(name);
        if (entry) return entry.series ? entry.series.get(0) : entry.value;
        const builtin = engine.builtins.get(name);
        if (builtin) return builtin([], new Map(), engine.ctx, engine.scope, `closure:${name}:constant`);
        throw new Error(`Unknown identifier: ${name}`);
      };
  }
}

function bindBinary(expr: BinaryExpression, engine: EngineAny, context: BindContext): EvalClosure {
  const left = bindExpression(expr.left, engine, context);
  const right = bindExpression(expr.right, engine, context);
  const operator = expr.operator;
  if (operator === 'and') return () => isTruthy(left()) ? isTruthy(right()) : false;
  if (operator === 'or') return () => isTruthy(left()) ? true : isTruthy(right());
  return () => {
    const leftValue = unwrapKnownSourceValue(left());
    const rightValue = unwrapKnownSourceValue(right());
    if (isNa(leftValue) || isNa(rightValue)) {
      return isComparisonOperator(operator) ? false : Number.NaN;
    }
    switch (operator) {
      case '+':
        if (typeof leftValue === 'string' || typeof rightValue === 'string') return `${toStringValue(leftValue)}${toStringValue(rightValue)}`;
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

function bindUnary(expr: Extract<Expression, { type: 'UnaryExpression' }>, engine: EngineAny, context: BindContext): EvalClosure {
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

function bindMember(expr: MemberExpression, engine: EngineAny): EvalClosure {
  const path = memberPath(expr);
  const fullName = path?.join('.');
  if (fullName === 'input.integer') return () => 'int';
  if (fullName === 'input.float') return () => 'float';
  if (fullName === 'input.bool') return () => 'bool';
  if (fullName === 'input.string') return () => 'string';
  if (fullName === 'input.source') return () => 'source';
  if (fullName === 'barstate.islast') return () => engine.ctx.barstate.islast;
  if (fullName === 'barstate.isconfirmed') return () => engine.ctx.barstate.isconfirmed;
  if (fullName === 'barstate.isnew') return () => engine.ctx.barstate.isnew;
  if (fullName === 'barstate.isrealtime') return () => engine.ctx.barstate.isrealtime;
  if (fullName === 'barstate.ishistory') return () => engine.ctx.barstate.ishistory;
  if (fullName === 'barstate.islastconfirmedhistory') return () => engine.ctx.barstate.islastconfirmedhistory;
  if (fullName && engine.builtins.has(fullName)) {
    const builtin = engine.builtins.get(fullName);
    return () => builtin([], new Map(), engine.ctx, engine.scope, `closure:${fullName}:constant`);
  }
  if (fullName === 'syminfo.ticker') return () => engine.ctx.syminfo.ticker;
  if (fullName === 'syminfo.tickerid') return () => engine.ctx.syminfo.tickerid ?? engine.ctx.syminfo.ticker;
  if (fullName === 'timeframe.period') return () => engine.ctx.timeframe.period;
  if (fullName === 'chart.bg_color') return () => engine.ctx.chart.bgColor;
  throw new Error(`unsupported member ${fullName ?? '<dynamic>'}`);
}

function bindIndex(expr: IndexExpression, engine: EngineAny, context: BindContext): EvalClosure {
  const offset = bindExpression(expr.index, engine, context);
  if (expr.object.type === 'Identifier') {
    const name = expr.object.name;
    return () => {
      const rawOffset = Math.trunc(Number(unwrapKnownSourceValue(offset())));
      const source = sourceForKnownIdentifier(engine, name);
      if (source) return source.get(rawOffset);
      return engine.scope.getWithOffset(name, rawOffset);
    };
  }
  throw new Error('non-identifier index expressions are outside the prototype');
}

function functionStatementReturnsName(stmt: Statement, functionName: string): boolean {
  if (stmt.type === 'VariableDeclaration' && stmt.names.type === 'VariableDeclarator') {
    return stmt.names.name.name === functionName;
  }
  return stmt.type === 'AssignmentStatement' && stmt.left.type === 'Identifier' && stmt.left.name === functionName;
}

function bindUserFunctionBody(fn: FunctionDeclaration, engine: EngineAny, context: BindContext): EvalClosure {
  if (!Array.isArray(fn.body)) {
    return bindExpression(fn.body, engine, context);
  }
  const fnName = fn.name.name;
  const statements = fn.body.map((stmt) => ({
    returnsFunctionName: functionStatementReturnsName(stmt, fnName),
    run: bindStatement(stmt, engine, context),
  }));
  return () => {
    let result: StatementResult = NO_RESULT;
    for (const entry of statements) {
      const statementResult = entry.run();
      if (statementResult.hasResult) {
        result = statementResult;
      }
      if (entry.returnsFunctionName) {
        result = {
          hasResult: true,
          value: engine.scope.get(fnName),
        };
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
): EvalClosure {
  if (fn.isMethod) throw new Error(`unsupported method call ${fn.name.name}`);
  const args = expr.arguments.map((arg) => ({
    name: arg.name?.name,
    value: bindExpression(arg.value, engine, context),
    sourceExpr: arg.value,
  }));
  const defaults = fn.params.map((param) => (
    param.defaultValue ? bindExpression(param.defaultValue, engine, context) : undefined
  ));
  const defaultSourceExprs = fn.params.map((param) => param.defaultValue);
  const paramNames = fn.params.map((param) => param.name);
  const fnName = fn.name.name;
  const bodySourceExpr = Array.isArray(fn.body) ? undefined : fn.body;
  const body = bindUserFunctionBody(fn, engine, context);
  let functionScope: EngineAny | undefined;
  let activeDepth = 0;

  return () => {
    if (activeDepth >= 100) {
      throw new Error(`Maximum recursion depth exceeded for function: ${fnName}`);
    }

    const positionalValues: unknown[] = [];
    const positionalSources: Array<{ get(offset: number): number | undefined } | undefined> = [];
    const namedValues = new Map<string, unknown>();
    const namedSources = new Map<string, { get(offset: number): number | undefined } | undefined>();
    let sawNamed = false;
    let positionalAfterNamed = false;

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

    if (positionalAfterNamed) {
      throw new Error(`function ${fnName} cannot use positional arguments after named arguments`);
    }
    if (positionalValues.length > paramNames.length) {
      throw new Error(`Too many arguments for function ${fnName}: expected ${paramNames.length}, got ${positionalValues.length}`);
    }

    const parameterValues: unknown[] = [];
    const parameterSources: Array<{ get(offset: number): number | undefined } | undefined> = [];
    for (let index = 0; index < paramNames.length; index++) {
      const paramName = paramNames[index]!;
      if (namedValues.has(paramName)) {
        if (index < positionalValues.length) {
          throw new Error(`Argument '${paramName}' for function ${fnName} was supplied multiple times`);
        }
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
      if (!paramNames.includes(name)) {
        throw new Error(`Unknown argument '${name}' for function ${fnName}`);
      }
    }

    if (!functionScope) {
      functionScope = engine.rootScope.createChild();
      context.runtimeFunctionScopes.add(functionScope as EngineAny);
    }

    const savedScope = engine.scope;
    activeDepth++;
    engine.scope = activeDepth === 1 ? (functionScope as EngineAny) : engine.rootScope.createChild();
    try {
      for (let index = 0; index < paramNames.length; index++) {
        engine.scope.declareParameter(paramNames[index]!, parameterValues[index], parameterSources[index]);
      }
      const result = body();
      const source = bodySourceExpr ? sourceForExpression(engine, bodySourceExpr, result) : undefined;
      return source ? { __tealscriptSource: true, value: unwrapKnownSourceValue(result), series: source } : result;
    } finally {
      engine.scope = savedScope;
      activeDepth--;
    }
  };
}

function rawCallName(expr: CallExpression): string {
  const path = memberPath(expr.callee);
  if (!path) throw new Error('unsupported dynamic callee');
  return path.join('.');
}

function bindCall(expr: CallExpression, engine: EngineAny, context: BindContext): EvalClosure {
  const rawName = rawCallName(expr);
  if (!rawName.includes('.')) {
    const userFunction = context.functions.get(rawName);
    if (userFunction) return bindUserFunctionCall(expr, userFunction, engine, context);
  }
  const fullName = callName(expr);
  if (!engine.builtins.has(fullName) && !(fullName === 'color' && expr.arguments.length <= 2)) {
    throw new Error(`unsupported call ${fullName}`);
  }
  const builtinName = fullName === 'color' ? 'color.new' : fullName;
  const builtin = engine.builtins.get(builtinName);
  if (!builtin) throw new Error(`unsupported call ${fullName}`);
  const args = expr.arguments.map((arg, index) => ({
    name: arg.name?.name,
    value: bindExpression(arg.value, engine, context),
    sourceExpr: arg.value,
    preserveSource: shouldPreserveSourceArgument(builtinName, index, arg.name?.name),
  }));
  const callId = `closure:${expr.loc?.start.offset ?? 0}:${builtinName}`;
  const hasStaticTitle = expr.arguments[1]?.value.type === 'StringLiteral' || expr.arguments.some((arg) => arg.name?.name === 'title' && arg.value.type === 'StringLiteral');
  return () => {
    const positional: unknown[] = [];
    const named = new Map<string, unknown>();
    for (const arg of args) {
      const raw = arg.value();
      const source = arg.preserveSource ? sourceForExpression(engine, arg.sourceExpr, raw) : undefined;
      const value = source && arg.preserveSource ? { __tealscriptSource: true, value: unwrapKnownSourceValue(raw), series: source } : raw;
      if (arg.name) {
        named.set(arg.name, value);
      } else {
        positional.push(value);
      }
    }
    if (builtinName === 'input' || builtinName.startsWith('input.')) {
      named.set('__tealscriptStaticTitle', hasStaticTitle);
    }
    return builtin!(positional, named, engine.ctx, engine.scope, callId);
  };
}

function installBoundExecution(engine: EngineAny, bound: BoundProgram): void {
  engine.executeHistoricalStatements = () => {
    try {
      return bound.runBar();
    } catch (error) {
      engine.errors.push({
        message: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  };
}

function runClosurePrototype(ast: Program, bars: Bar[]): ReturnType<typeof executeScript> {
  const engine = new TealscriptEngine() as EngineAny;
  const bound = bindProgram(ast, engine);
  if (bound.unsupported.length > 0) {
    throw new Error(bound.unsupported[0]);
  }
  installBoundExecution(engine, bound);
  return engine.execute(ast, bars);
}

function timeRun(fn: () => void, runs: number): number {
  const start = performance.now();
  for (let i = 0; i < runs; i++) fn();
  return performance.now() - start;
}

async function main(): Promise<void> {
  const report = JSON.parse(await readFile(resolve(repoRoot, 'packages/tealscript/reports/external-pine-corpus-v1.report.json'), 'utf8')) as { rows: CorpusRow[] };
  const candidates: Array<{ row: CorpusRow; source: string; ast: Program }> = [];
  for (const row of report.rows) {
    const source = await readFile(resolve(corpusDir, row.localPath), 'utf8');
    if (!isEligibleSource(source, row)) continue;
    const ast = parse(source, { grammarSource: row.localPath });
    const semantic = checkProgram(ast);
    if (semantic.diagnostics.some((diagnostic) => diagnostic.severity === 'error')) continue;
    if (!tryCompile(ast).success) continue;
    candidates.push({ row, source, ast });
    if (candidates.length >= TARGET_SCRIPT_COUNT) break;
  }

  const bars = createBars(BARS_PER_SCRIPT);
  const handled: typeof candidates = [];
  const unsupported: Array<{ localPath: string; reason: string }> = [];
  for (const candidate of candidates) {
    const engine = new TealscriptEngine() as EngineAny;
    const bound = bindProgram(candidate.ast, engine);
    if (bound.unsupported.length > 0) {
      unsupported.push({ localPath: candidate.row.localPath, reason: bound.unsupported[0] ?? 'unsupported' });
      continue;
    }
    try {
      const result = runClosurePrototype(candidate.ast, bars);
      if (result.errors.length > 0) {
        unsupported.push({ localPath: candidate.row.localPath, reason: result.errors[0]?.message ?? 'runtime error' });
        continue;
      }
      handled.push(candidate);
    } catch (error) {
      unsupported.push({ localPath: candidate.row.localPath, reason: error instanceof Error ? error.message : String(error) });
    }
  }

  const totalBars = handled.length * BARS_PER_SCRIPT;
  const runCompiled = () => {
    for (const { ast } of handled) {
      const compiled = tryCompile(ast);
      if (!compiled.success) throw new Error('compiled sample stopped compiling');
      const result = executeCompiled(compiled, bars);
      if (!result || result.errors.length > 0) throw new Error(result?.errors[0]?.message ?? 'compiled returned no result');
    }
  };
  const runInterpreter = () => {
    for (const { ast } of handled) {
      const result = executeScript(ast, bars);
      if (result.errors.length > 0) throw new Error(result.errors[0]?.message ?? 'interpreter error');
    }
  };
  const runClosure = () => {
    for (const { ast } of handled) {
      const result = runClosurePrototype(ast, bars);
      if (result.errors.length > 0) throw new Error(result.errors[0]?.message ?? 'closure prototype error');
    }
  };

  runCompiled();
  runInterpreter();
  runClosure();

  const compiledCold = timeRun(runCompiled, 1);
  const interpreterCold = timeRun(runInterpreter, 1);
  const closureCold = timeRun(runClosure, 1);
  timeRun(runCompiled, WARMUP_RUNS);
  timeRun(runInterpreter, WARMUP_RUNS);
  timeRun(runClosure, WARMUP_RUNS);
  const compiledSteady = timeRun(runCompiled, MEASURE_RUNS);
  const interpreterSteady = timeRun(runInterpreter, MEASURE_RUNS);
  const closureSteady = timeRun(runClosure, MEASURE_RUNS);

  const result = {
    schemaVersion: 1,
    task: 'T92',
    generatedAt: new Date().toISOString(),
    baseCommit: currentGitCommit(),
    corpus: {
      inputDir: corpusDir,
      targetScripts: TARGET_SCRIPT_COUNT,
      handledScripts: handled.length,
      unsupportedScripts: unsupported.length,
      unsupported,
      barsPerScript: BARS_PER_SCRIPT,
      totalBars,
      declaredVersions: Object.fromEntries([...new Set(handled.map((entry) => String(entry.row.declaredVersion)))].sort().map((version) => [version, handled.filter((entry) => String(entry.row.declaredVersion) === version).length])),
      declarationKinds: Object.fromEntries([...new Set(handled.map((entry) => entry.row.declarationKind))].sort().map((kind) => [kind, handled.filter((entry) => entry.row.declarationKind === kind).length])),
      byteSize: {
        total: handled.reduce((sum, entry) => sum + entry.row.byteSize, 0),
        min: Math.min(...handled.map((entry) => entry.row.byteSize)),
        max: Math.max(...handled.map((entry) => entry.row.byteSize)),
      },
    },
    benchmark: {
      warmupRuns: WARMUP_RUNS,
      measuredRuns: MEASURE_RUNS,
      results: [
        {
          backend: 'current-compiled-new-function',
          coldMs: Number(compiledCold.toFixed(2)),
          steadyMs: Number(compiledSteady.toFixed(2)),
          coldUsPerBar: Number(((compiledCold * 1000) / totalBars).toFixed(1)),
          steadyUsPerBar: Number(((compiledSteady * 1000) / (totalBars * MEASURE_RUNS)).toFixed(1)),
        },
        {
          backend: 'current-interpreter',
          coldMs: Number(interpreterCold.toFixed(2)),
          steadyMs: Number(interpreterSteady.toFixed(2)),
          coldUsPerBar: Number(((interpreterCold * 1000) / totalBars).toFixed(1)),
          steadyUsPerBar: Number(((interpreterSteady * 1000) / (totalBars * MEASURE_RUNS)).toFixed(1)),
        },
        {
          backend: 'bound-expression-closure-prototype',
          coldMs: Number(closureCold.toFixed(2)),
          steadyMs: Number(closureSteady.toFixed(2)),
          coldUsPerBar: Number(((closureCold * 1000) / totalBars).toFixed(1)),
          steadyUsPerBar: Number(((closureSteady * 1000) / (totalBars * MEASURE_RUNS)).toFixed(1)),
        },
      ],
      deltaVsT91: {
        handledScripts: handled.length - T91_BASELINE.handledScripts,
        totalBars: totalBars - T91_BASELINE.totalBars,
        steadyUsPerBar: {
          compiled: Number((((compiledSteady * 1000) / (totalBars * MEASURE_RUNS)) - T91_BASELINE.steadyUsPerBar.compiled).toFixed(1)),
          interpreter: Number((((interpreterSteady * 1000) / (totalBars * MEASURE_RUNS)) - T91_BASELINE.steadyUsPerBar.interpreter).toFixed(1)),
          closure: Number((((closureSteady * 1000) / (totalBars * MEASURE_RUNS)) - T91_BASELINE.steadyUsPerBar.closure).toFixed(1)),
        },
      },
    },
    prototypeProperties: {
      astUse: 'AST nodes are read during construction. Per-bar execution uses statement and expression closures that capture child closures directly; it does not patch evaluateExpression, traverse AST nodes, or look up closures by AST node.',
      coveredNodes: [
        'indicator/study declaration metadata',
        'scalar variable declarations and identifier assignments',
        'if/else blocks with child closure arrays',
        'expression statements',
        'numeric/string/bool/color/na literals',
        'identifier reads for OHLCV/time/bar_index/scope values',
        'binary/unary/conditional expressions',
        'namespace/member constants',
        'direct builtin calls with pre-bound argument closures',
        'user-defined function calls with pre-bound argument/default/body closures and per-callsite function scopes',
        'numeric for loops, for-in loops over JS/Pine arrays/maps/matrices, while loops, break, and continue',
        'identifier history indexing',
        'array literals',
      ],
      limitations: [
        'UDF support is intentionally limited to script-local user functions; imported functions and method-style UDF dispatch remain unsupported.',
        'Loop support covers the loop control flow itself. Loops that depend on unsupported body constructs remain unsupported through those constructs.',
        'No switch expressions, tuple assignment, UDT constructors/mutation, method dispatch, request calls, drawing constructors, or strategy order semantics.',
        'The remaining unsupported scripts are not random: they are rejected because they use non-T92 hard constructs such as visual/chart member access and non-covered dynamic constructs. This means the closure number is still directionally optimistic for a complete backend, though less so than T91 because UDFs and loops are now in the hot path.',
        'The prototype does not delegate any covered expression node back to evaluateExpression; TA and input builtins delegate only to shared builtin implementations after pre-bound argument evaluation, matching the expected shape of a real backend.',
        'The sample is therefore narrower than the T90 24-script target; handledScripts is the honest denominator for the benchmark.',
      ],
      estimate: {
        recommendation: 'A non-eval closure backend remains plausible after binding UDFs and loops: it stays materially closer to current compiled execution than to the interpreter on the harder handled sample.',
        engineeringDays: '18-30',
        mostSensitiveTo: 'Whether imported-library calls, method dispatch, UDT/collection mutation, request-expression subprograms, drawings, and strategy order side effects can keep callsite state and dispatch pre-bound without reintroducing an interpreter-style per-node dispatcher.',
      },
    },
  };

  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify(result, null, 2));
}

await main();
