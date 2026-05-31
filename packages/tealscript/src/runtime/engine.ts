/**
 * Tealscript Execution Engine
 *
 * Executes parsed Tealscript AST bar-by-bar.
 * This is the interpreter that evaluates expressions and statements.
 */

import type {
  Program,
  Statement,
  Expression,
  IndicatorDeclaration,
  FunctionDeclaration,
  VariableDeclaration,
  AssignmentStatement,
  IfStatement,
  ForStatement,
  WhileStatement,
  Identifier,
  BinaryExpression,
  UnaryExpression,
  ConditionalExpression,
  SwitchExpression,
  CallExpression,
  MemberExpression,
  IndexExpression,
} from '../parser/ast';

import {
  avgArrayValue,
  clearArray,
  concatArray,
  copyArray,
  covarianceArrayValue,
  createPineArray,
  firstArrayValue,
  getArraySize,
  getArrayValue,
  includesArrayValue,
  indexOfArrayValue,
  insertArrayValue,
  isPineArray,
  joinArray,
  lastArrayValue,
  lastIndexOfArrayValue,
  maxArrayValue,
  minArrayValue,
  popArrayValue,
  pushArrayValue,
  removeArrayValue,
  reverseArray,
  setArrayValue,
  shiftArrayValue,
  sliceArray,
  sortArray,
  sumArrayValue,
  unshiftArrayValue,
  type PineArray,
} from './arrays';
import type { BuiltinRegistry } from './builtins/registry';
import { registerBoxBuiltins, registerDrawingConstants, registerLabelBuiltins, registerLineBuiltins, registerLineFillBuiltins, type DrawingBuiltinRuntime } from './builtins/drawings';
import { ExecutionContext, type AlertFrequency, type AlertOutput, type Bar, type DrawingOutput, type InputDefinition, type LineDrawingOutput, type PlotOutput, type PlotStyle } from './context';
import {
  getDrawingValue,
  toDrawingId as toDrawingIdValue,
  toLineWidth as toLineWidthValue,
  withDrawing,
} from './drawings/helpers';
import { Scope, createRootScope } from './scope';

/**
 * Execution result
 */
export interface ExecutionResult {
  plots: PlotOutput[];
  drawings: DrawingOutput[];
  alerts: AlertOutput[];
  inputs: InputDefinition[];
  indicatorTitle: string;
  indicatorMaxBarsBack?: number;
  errors: ExecutionError[];
}

/**
 * Execution error
 */
export interface ExecutionError {
  message: string;
  line?: number;
  column?: number;
}

interface RandomBuiltinState {
  seed: number;
  state: number;
}

const PLANNED_UNSUPPORTED_NAMESPACES = new Set(['request', 'map', 'matrix', 'polyline', 'ticker']);

/**
 * Tealscript Engine - executes AST bar-by-bar
 */
export class TealscriptEngine {
  private static readonly MAX_LOOP_ITERATIONS = 10000;
  private static readonly MAX_BUILTIN_SOURCE_HISTORY = 10000;

  private ctx: ExecutionContext;
  private scope: Scope;
  private builtins: BuiltinRegistry;
  private userFunctions: Map<string, FunctionDeclaration>;
  private functionScopes: Map<string, Scope>;
  private userFunctionCallStack: string[] = [];
  private errors: ExecutionError[] = [];

  constructor() {
    this.ctx = new ExecutionContext();
    this.scope = createRootScope();
    this.builtins = new Map();
    this.userFunctions = new Map();
    this.functionScopes = new Map();

    this.registerBuiltins();
  }

  /**
   * Execute a parsed program on bar data
   */
  execute(ast: Program, bars: Bar[], inputs?: Map<string, unknown>): ExecutionResult {
    this.errors = [];
    this.ctx.reset();
    this.scope = createRootScope();
    this.functionScopes.clear();
    this.userFunctionCallStack = [];
    this.registerUserFunctions(ast);

    // Load bars into context
    this.ctx.loadBars(bars);

    // Set user inputs
    if (inputs) {
      for (const [key, value] of inputs) {
        this.ctx.setInput(key, value);
      }
    }

    // Execute bar by bar
    while (this.ctx.advanceBar()) {
      // Advance scope to new bar
      this.scope.advanceBar();
      for (const functionScope of this.functionScopes.values()) {
        functionScope.advanceBar();
      }
      this.resetPerBarBuiltinState();

      // Execute all statements
      for (const stmt of ast.body) {
        try {
          this.executeStatement(stmt);
        } catch (error) {
          this.errors.push({
            message: error instanceof Error ? error.message : String(error),
            line: stmt.loc?.start.line,
            column: stmt.loc?.start.column,
          });
          if (error instanceof RuntimeErrorException) {
            return this.createExecutionResult();
          }
        }
      }

      // Commit bar — only snapshot on the last bar (for realtime rollback)
      const isLastBar = this.ctx.bar_index === this.ctx.last_bar_index;
      this.scope.commit(isLastBar);
      for (const functionScope of this.functionScopes.values()) {
        functionScope.commit(isLastBar);
      }
      this.ctx.commitBar();
    }

    return this.createExecutionResult();
  }

  private createExecutionResult(): ExecutionResult {
    return {
      plots: this.ctx.getPlots(),
      drawings: this.ctx.getDrawings(),
      alerts: this.ctx.getAlerts(),
      inputs: this.ctx.inputDefinitions.map((def) => ({ ...def })),
      indicatorTitle: this.ctx.indicatorTitle,
      indicatorMaxBarsBack: this.ctx.indicatorMaxBarsBack,
      errors: this.errors,
    };
  }

  /**
   * Execute for realtime bar update
   */
  updateBar(ast: Program, bar: Bar): PlotOutput[] {
    // Rollback to last committed state
    this.scope.rollback();
    for (const functionScope of this.functionScopes.values()) {
      functionScope.rollback();
    }
    this.ctx.rollbackBar();
    this.ctx.bar_index = this.ctx.last_bar_index;

    // Truncate plot arrays to remove the last bar's appended values
    // so re-execution can re-append them cleanly without duplication
    this.ctx.truncatePlots(this.ctx.last_bar_index);
    this.ctx.truncateDrawings(this.ctx.last_bar_index);
    this.ctx.truncateAlerts(this.ctx.last_bar_index);

    // Update current bar data
    this.ctx.updateCurrentBar(bar);
    this.resetPerBarBuiltinState();
    this.registerUserFunctions(ast);

    // Re-execute statements for current bar
    for (const stmt of ast.body) {
      try {
        this.executeStatement(stmt);
      } catch (error) {
        if (error instanceof RuntimeErrorException) {
          throw error;
        }
        // Log error but continue
        console.error('Execution error:', error);
      }
    }

    return this.ctx.getPlots();
  }

  /**
   * Get current alert outputs.
   */
  getAlerts(): AlertOutput[] {
    return this.ctx.getAlerts();
  }

  /**
   * Get current drawing outputs.
   */
  getDrawings(): DrawingOutput[] {
    return this.ctx.getDrawings();
  }

  // ===========================================================================
  // Statement Execution
  // ===========================================================================

  private executeStatement(stmt: Statement): void {
    switch (stmt.type) {
      case 'IndicatorDeclaration':
        this.executeIndicator(stmt);
        break;
      case 'FunctionDeclaration':
        break;
      case 'VariableDeclaration':
        this.executeVariableDeclaration(stmt);
        break;
      case 'AssignmentStatement':
        this.executeAssignment(stmt);
        break;
      case 'ExpressionStatement':
        this.evaluateExpression(stmt.expression);
        break;
      case 'IfStatement':
        this.executeIf(stmt);
        break;
      case 'ForStatement':
        this.executeFor(stmt);
        break;
      case 'WhileStatement':
        this.executeWhile(stmt);
        break;
      case 'BreakStatement':
        throw new BreakException();
      case 'ContinueStatement':
        throw new ContinueException();
    }
  }

  private executeIndicator(stmt: IndicatorDeclaration): void {
    // Only process on first bar
    if (this.ctx.bar_index !== 0) return;

    if (stmt.declarationKind === 'strategy') {
      throw new Error('strategy() declarations are not supported yet');
    }

    if (stmt.title) {
      this.ctx.indicatorTitle = this.evaluateExpression(stmt.title) as string;
    }
    if (stmt.overlay) {
      this.ctx.indicatorOverlay = this.evaluateExpression(stmt.overlay) as boolean;
    }
    if (stmt.precision) {
      this.ctx.indicatorPrecision = this.evaluateExpression(stmt.precision) as number;
    }
    if (stmt.max_bars_back) {
      this.ctx.indicatorMaxBarsBack = this.normalizeMaxBarsBack(this.evaluateExpression(stmt.max_bars_back));
    }
  }

  private normalizeMaxBarsBack(value: unknown): number {
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || !Number.isInteger(value)) {
      throw new Error('indicator max_bars_back must be a non-negative integer');
    }
    return value;
  }

  private registerUserFunctions(ast: Program): void {
    this.userFunctions.clear();
    for (const stmt of ast.body) {
      if (stmt.type === 'FunctionDeclaration') {
        this.userFunctions.set(stmt.name.name, stmt);
        if (!this.functionScopes.has(stmt.name.name)) {
          this.functionScopes.set(stmt.name.name, this.scope.createChild());
        }
      }
    }
  }

  private executeVariableDeclaration(stmt: VariableDeclaration): void {
    const kind = stmt.kind;

    if (stmt.names.type === 'VariableDeclarator') {
      const name = stmt.names.name.name;
      if (this.shouldSkipInitializedPersistentDeclaration(kind, [name])) {
        return;
      }
      const drawingCount = this.ctx.getDrawingCount();
      const value = this.evaluateExpression(stmt.init);
      this.scope.declare(name, kind, value, stmt.typeAnnotation?.baseType);
      this.markPersistentDeclarationDrawings(kind, drawingCount);
    } else if (stmt.names.type === 'TupleDeclarator') {
      const names = stmt.names.names.map((name) => name.name);
      if (this.shouldSkipInitializedPersistentDeclaration(kind, names)) {
        return;
      }
      const drawingCount = this.ctx.getDrawingCount();
      const value = this.evaluateExpression(stmt.init);
      // Tuple destructuring
      if (!Array.isArray(value)) {
        throw new Error('Cannot destructure non-array value');
      }
      const values = value as unknown[];
      for (let i = 0; i < stmt.names.names.length; i++) {
        const name = stmt.names.names[i].name;
        this.scope.declare(name, kind, values[i]);
      }
      this.markPersistentDeclarationDrawings(kind, drawingCount);
    }
  }

  private shouldSkipInitializedPersistentDeclaration(kind: string, names: string[]): boolean {
    if (kind !== 'var' && kind !== 'varip') return false;
    return names.every((name) => this.scope.getEntry(name)?.initialized);
  }

  private markPersistentDeclarationDrawings(kind: string, fromIndex: number): void {
    if (kind === 'var' || kind === 'varip') {
      this.ctx.markDrawingsPersistentFrom(fromIndex);
    }
  }

  private executeAssignment(stmt: AssignmentStatement): void {
    const value = this.evaluateExpression(stmt.right);

    if (stmt.left.type === 'Identifier') {
      const name = stmt.left.name;
      const currentValue = this.scope.get(name);

      const newValue = this.applyAssignmentOperator(currentValue, value, stmt.operator);

      this.scope.set(name, newValue);
    } else if (stmt.left.type === 'IndexExpression') {
      this.executeIndexAssignment(stmt.left, value, stmt.operator);
    } else {
      throw new Error(
        'Member assignment is not supported yet; UDT and reference field assignment are planned for Pine parity Epic 12',
      );
    }
  }

  private executeIndexAssignment(target: IndexExpression, value: unknown, operator: AssignmentStatement['operator']): void {
    const index = this.normalizeIndexOffset(this.evaluateExpression(target.index));
    if (index === null) {
      throw new Error('Array assignment index must be a finite non-negative number');
    }

    const array = this.evaluateExpression(target.object);
    if (!Array.isArray(array) && !isPineArray(array)) {
      throw new Error('Index assignment expects an array');
    }

    const currentValue = this.readArrayElement(array, index);
    const newValue = this.applyAssignmentOperator(currentValue, value, operator);
    this.writeArrayElement(array, index, newValue);
  }

  private applyAssignmentOperator(currentValue: unknown, value: unknown, operator: AssignmentStatement['operator']): unknown {
    if (operator === ':=') return value;

    const numCurrent = currentValue as number;
    const numValue = value as number;
    switch (operator) {
      case '+=':
        return numCurrent + numValue;
      case '-=':
        return numCurrent - numValue;
      case '*=':
        return numCurrent * numValue;
      case '/=':
        return numCurrent / numValue;
      case '%=':
        return numCurrent % numValue;
    }
  }

  private executeIf(stmt: IfStatement): void {
    const condition = this.evaluateExpression(stmt.test);

    if (this.isTruthy(condition)) {
      const childScope = this.scope.createChild();
      const savedScope = this.scope;
      this.scope = childScope;

      try {
        for (const s of stmt.consequent) {
          this.executeStatement(s);
        }
      } finally {
        this.scope = savedScope;
      }
    } else if (stmt.alternate) {
      if (Array.isArray(stmt.alternate)) {
        const childScope = this.scope.createChild();
        const savedScope = this.scope;
        this.scope = childScope;

        try {
          for (const s of stmt.alternate) {
            this.executeStatement(s);
          }
        } finally {
          this.scope = savedScope;
        }
      } else {
        // else-if
        this.executeIf(stmt.alternate);
      }
    }
  }

  private executeFor(stmt: ForStatement): void {
    if (stmt.kind === 'collection') {
      this.executeForIn(stmt);
      return;
    }

    const start = this.evaluateExpression(stmt.start) as number;
    const end = this.evaluateExpression(stmt.end) as number;
    const step = stmt.step ? (this.evaluateExpression(stmt.step) as number) : 1;
    if (step === 0) {
      throw new Error('For loop step cannot be zero');
    }

    const childScope = this.scope.createChild();
    const savedScope = this.scope;
    this.scope = childScope;

    let iterations = 0;

    try {
      for (let i = start; step > 0 ? i <= end : i >= end; i += step) {
        if (++iterations > TealscriptEngine.MAX_LOOP_ITERATIONS) {
          throw new Error('Maximum loop iterations exceeded');
        }

        this.scope.declare(stmt.counter.name, 'none', i);

        try {
          for (const s of stmt.body) {
            this.executeStatement(s);
          }
        } catch (e) {
          if (e instanceof BreakException) break;
          if (e instanceof ContinueException) continue;
          throw e;
        }
      }
    } finally {
      this.scope = savedScope;
    }
  }

  private executeForIn(stmt: Extract<ForStatement, { kind: 'collection' }>): void {
    const iterable = this.evaluateExpression(stmt.iterable);
    let values: unknown[];

    if (Array.isArray(iterable)) {
      values = iterable;
    } else if (isPineArray(iterable)) {
      values = Array.from({ length: getArraySize(iterable) }, (_, index) => getArrayValue(iterable, index));
    } else {
      throw new Error('For-in loop expects an array');
    }

    const childScope = this.scope.createChild();
    const savedScope = this.scope;
    this.scope = childScope;

    let iterations = 0;

    try {
      for (let index = 0; index < values.length; index++) {
        if (++iterations > TealscriptEngine.MAX_LOOP_ITERATIONS) {
          throw new Error('Maximum loop iterations exceeded');
        }

        const value = values[index];
        if (stmt.indexCounter) {
          this.scope.declare(stmt.indexCounter.name, 'none', index);
        }
        this.scope.declare(stmt.counter.name, 'none', value);

        try {
          for (const s of stmt.body) {
            this.executeStatement(s);
          }
        } catch (e) {
          if (e instanceof BreakException) break;
          if (e instanceof ContinueException) continue;
          throw e;
        }
      }
    } finally {
      this.scope = savedScope;
    }
  }

  private executeWhile(stmt: WhileStatement): void {
    const childScope = this.scope.createChild();
    const savedScope = this.scope;
    this.scope = childScope;

    let iterations = 0;

    try {
      while (this.isTruthy(this.evaluateExpression(stmt.test))) {
        if (++iterations > TealscriptEngine.MAX_LOOP_ITERATIONS) {
          throw new Error('Maximum loop iterations exceeded');
        }

        try {
          for (const s of stmt.body) {
            this.executeStatement(s);
          }
        } catch (e) {
          if (e instanceof BreakException) break;
          if (e instanceof ContinueException) continue;
          throw e;
        }
      }
    } finally {
      this.scope = savedScope;
    }
  }

  // ===========================================================================
  // Expression Evaluation
  // ===========================================================================

  private evaluateExpression(expr: Expression): unknown {
    switch (expr.type) {
      case 'NumericLiteral':
        return expr.value;
      case 'StringLiteral':
        return expr.value;
      case 'BooleanLiteral':
        return expr.value;
      case 'ColorLiteral':
        return expr.value;
      case 'NaExpression':
        return NaN; // Tealscript 'na' is represented as NaN

      case 'Identifier':
        return this.evaluateIdentifier(expr);

      case 'BinaryExpression':
        return this.evaluateBinary(expr);

      case 'UnaryExpression':
        return this.evaluateUnary(expr);

      case 'ConditionalExpression':
        return this.evaluateConditional(expr);

      case 'SwitchExpression':
        return this.evaluateSwitch(expr);

      case 'ForStatement':
        return this.evaluateLoopExpression(this.executeFunctionFor(expr));

      case 'WhileStatement':
        return this.evaluateLoopExpression(this.executeFunctionWhile(expr));

      case 'CallExpression':
        return this.evaluateCall(expr);

      case 'MemberExpression':
        return this.evaluateMember(expr);

      case 'IndexExpression':
        return this.evaluateIndex(expr);

      case 'ArrayExpression':
        return expr.elements.map((e) => this.evaluateExpression(e));

      default:
        throw new Error(`Unknown expression type: ${(expr as Expression).type}`);
    }
  }

  private evaluateLoopExpression(result: { hasResult: boolean; value?: unknown }): unknown {
    return result.hasResult ? result.value : NaN;
  }

  private evaluateIdentifier(expr: Identifier): unknown {
    const name = expr.name;

    // Check built-in series first
    switch (name) {
      case 'open':
        return this.ctx.open.get(0);
      case 'high':
        return this.ctx.high.get(0);
      case 'low':
        return this.ctx.low.get(0);
      case 'close':
        return this.ctx.close.get(0);
      case 'volume':
        return this.ctx.volume.get(0);
      case 'time':
        return this.ctx.time.get(0);
      case 'time_close':
        return this.getBarCloseTime(this.ctx.time.get(0), this.ctx.timeframe.period);
      case 'last_bar_time':
        return this.ctx.getBar(this.ctx.last_bar_index)?.time ?? Number.NaN;
      case 'year':
        return this.getCalendarPart('year', this.ctx.time.get(0), this.ctx.syminfo.timezone);
      case 'month':
        return this.getCalendarPart('month', this.ctx.time.get(0), this.ctx.syminfo.timezone);
      case 'weekofyear':
        return this.getCalendarPart('weekofyear', this.ctx.time.get(0), this.ctx.syminfo.timezone);
      case 'dayofmonth':
        return this.getCalendarPart('dayofmonth', this.ctx.time.get(0), this.ctx.syminfo.timezone);
      case 'dayofweek':
        return this.getCalendarPart('dayofweek', this.ctx.time.get(0), this.ctx.syminfo.timezone);
      case 'hour':
        return this.getCalendarPart('hour', this.ctx.time.get(0), this.ctx.syminfo.timezone);
      case 'minute':
        return this.getCalendarPart('minute', this.ctx.time.get(0), this.ctx.syminfo.timezone);
      case 'second':
        return this.getCalendarPart('second', this.ctx.time.get(0), this.ctx.syminfo.timezone);
      case 'bar_index':
        return this.ctx.bar_index;
      case 'last_bar_index':
        return this.ctx.last_bar_index;
      case 'hl2':
        return this.ctx.hl2;
      case 'hlc3':
        return this.ctx.hlc3;
      case 'ohlc4':
        return this.ctx.ohlc4;
    }

    // Check scope
    if (this.scope.has(name)) {
      return this.scope.get(name);
    }

    throw new Error(`Unknown identifier: ${name}`);
  }

  private evaluateBinary(expr: BinaryExpression): unknown {
    const left = this.evaluateExpression(expr.left);

    if (expr.operator === 'and') {
      if (!this.isTruthy(left)) return false;
      return this.isTruthy(this.evaluateExpression(expr.right));
    }

    if (expr.operator === 'or') {
      if (this.isTruthy(left)) return true;
      return this.isTruthy(this.evaluateExpression(expr.right));
    }

    const right = this.evaluateExpression(expr.right);

    // Pine comparison operators return false when either operand is an
    // undefined variable. Arithmetic keeps propagating na.
    if (this.isNa(left) || this.isNa(right)) {
      if (this.isComparisonOperator(expr.operator)) {
        return false;
      }
      return NaN;
    }

    switch (expr.operator) {
      // Arithmetic
      case '+':
        if (typeof left === 'string' || typeof right === 'string') {
          return `${this.toStringValue(left)}${this.toStringValue(right)}`;
        }
        return (left as number) + (right as number);
      case '-':
        return (left as number) - (right as number);
      case '*':
        return (left as number) * (right as number);
      case '/':
        return (left as number) / (right as number);
      case '%':
        return (left as number) % (right as number);

      // Comparison
      case '==':
        return left === right;
      case '!=':
        return left !== right;
      case '<':
        return (left as number) < (right as number);
      case '>':
        return (left as number) > (right as number);
      case '<=':
        return (left as number) <= (right as number);
      case '>=':
        return (left as number) >= (right as number);

      default:
        throw new Error(`Unknown operator: ${expr.operator}`);
    }
  }

  private evaluateUnary(expr: UnaryExpression): unknown {
    const arg = this.evaluateExpression(expr.argument);

    switch (expr.operator) {
      case '-':
        return -(arg as number);
      case '+':
        return +(arg as number);
      case 'not':
        return !this.isTruthy(arg);
      default:
        throw new Error(`Unknown unary operator: ${expr.operator}`);
    }
  }

  private evaluateConditional(expr: ConditionalExpression): unknown {
    const test = this.evaluateExpression(expr.test);
    if (this.isTruthy(test)) {
      return this.evaluateExpression(expr.consequent);
    } else {
      return this.evaluateExpression(expr.alternate);
    }
  }

  private evaluateSwitch(expr: SwitchExpression): unknown {
    if (expr.discriminant) {
      const discriminant = this.evaluateExpression(expr.discriminant);
      for (const switchCase of expr.cases) {
        if (!switchCase.test) {
          return this.evaluateSwitchConsequent(switchCase.consequent);
        }
        const test = this.evaluateExpression(switchCase.test);
        if (this.switchValuesEqual(discriminant, test)) {
          return this.evaluateSwitchConsequent(switchCase.consequent);
        }
      }
      return NaN;
    }

    for (const switchCase of expr.cases) {
      if (!switchCase.test || this.isTruthy(this.evaluateExpression(switchCase.test))) {
        return this.evaluateSwitchConsequent(switchCase.consequent);
      }
    }

    return NaN;
  }

  private evaluateSwitchConsequent(consequent: Expression | Statement[]): unknown {
    if (!Array.isArray(consequent)) {
      return this.evaluateExpression(consequent);
    }

    const result = this.executeFunctionStatements(consequent);
    return result.hasResult ? result.value : Number.NaN;
  }

  private switchValuesEqual(left: unknown, right: unknown): boolean {
    if (this.isNa(left) || this.isNa(right)) return false;
    return left === right;
  }

  private evaluateCall(expr: CallExpression): unknown {
    // Get function name (could be identifier or member expression)
    let funcName: string;
    let namespace: string | undefined;

    if (expr.callee.type === 'Identifier') {
      funcName = expr.callee.name;
    } else if (expr.callee.type === 'MemberExpression') {
      if (expr.callee.object.type === 'Identifier') {
        namespace = expr.callee.object.name;
        funcName = expr.callee.property.name;
      } else {
        throw new Error('Nested member access in call not supported');
      }
    } else {
      throw new Error('Invalid callee type');
    }

    const fullName = namespace ? `${namespace}.${funcName}` : funcName;

    if (namespace === 'strategy') {
      throw new Error(`strategy.* functions are not supported yet: ${fullName}`);
    }
    if (namespace && this.isUnsupportedDrawingNamespace(namespace)) {
      throw new Error(`${namespace}.* functions are not supported yet: ${fullName}`);
    }

    // Evaluate arguments
    const args: unknown[] = [];
    const namedArgs = new Map<string, unknown>();

    for (const arg of expr.arguments) {
      const value = this.evaluateExpression(arg.value);
      if (arg.name) {
        const argName = arg.name.name;
        if (namedArgs.has(argName)) {
          throw new Error(`Duplicate named argument: ${argName}`);
        }
        namedArgs.set(argName, value);
      } else {
        args.push(value);
      }
    }

    // Look up builtin
    const builtin = this.builtins.get(fullName);
    if (builtin) {
      return builtin(args, namedArgs, this.ctx, this.scope, this.nextBuiltinCallId(fullName));
    }

    const methodBuiltinName = namespace ? this.getMethodBuiltinName(funcName) : undefined;
    if (methodBuiltinName && expr.callee.type === 'MemberExpression') {
      const methodBuiltin = this.builtins.get(methodBuiltinName);
      if (methodBuiltin) {
        const receiver = this.evaluateExpression(expr.callee.object);
        return methodBuiltin([receiver, ...args], namedArgs, this.ctx, this.scope, this.nextBuiltinCallId(methodBuiltinName));
      }
    }

    if (namespace && !this.scope.has(namespace) && this.isPlannedUnsupportedNamespace(namespace)) {
      throw new Error(`${namespace}.* functions are not supported yet: ${fullName}`);
    }

    if (!namespace) {
      const userFunction = this.userFunctions.get(funcName);
      if (userFunction) {
        return this.evaluateUserFunction(userFunction, args, namedArgs);
      }
    }

    throw new Error(`Unknown function: ${fullName}`);
  }

  private isUnsupportedDrawingNamespace(namespace: string): boolean {
    return namespace === 'table';
  }

  private isPlannedUnsupportedNamespace(namespace: string): boolean {
    return PLANNED_UNSUPPORTED_NAMESPACES.has(namespace);
  }

  private registerDrawingBuiltins(): void {
    registerLabelBuiltins(this.builtins, this.createDrawingBuiltinRuntime());
    registerLineBuiltins(this.builtins, this.createDrawingBuiltinRuntime());
    registerLineFillBuiltins(this.builtins, this.createDrawingBuiltinRuntime());
    registerBoxBuiltins(this.builtins, this.createDrawingBuiltinRuntime());

    registerDrawingConstants(this.builtins);
  }

  private createDrawingBuiltinRuntime(): DrawingBuiltinRuntime {
    return {
      isNa: (value) => this.isNa(value),
      toNullableNumber: (value) => this.toNullableNumber(value),
      toStringValue: (value) => this.toStringValue(value),
      toNumber: (value) => this.toNumber(value),
      toNullableColor: (value) => this.toNullableColor(value),
      toOptionalString: (value) => this.toOptionalString(value),
      toLineWidth: (value) => this.toLineWidth(value),
      toDrawingId: (value) => this.toDrawingId(value),
      withLine: (value, ctx, fn) => this.withLine(value, ctx, fn),
      getLineValue: (value, ctx, fn) => this.getLineValue(value, ctx, fn),
      interpolateLinePrice: (line, x) => this.interpolateLinePrice(line, x),
    };
  }

  private toDrawingId(value: unknown): string | undefined {
    return toDrawingIdValue(value, (candidate) => this.isNa(candidate));
  }

  private toLineWidth(value: unknown): number {
    return toLineWidthValue(value, (candidate, min, max) => this.clampNumber(candidate, min, max));
  }

  private withLine(value: unknown, ctx: ExecutionContext, fn: (line: LineDrawingOutput) => void): void {
    withDrawing(value, ctx, 'line', (candidate) => this.isNa(candidate), fn);
  }

  private getLineValue<T>(value: unknown, ctx: ExecutionContext, fn: (line: LineDrawingOutput) => T): T | number {
    return getDrawingValue(value, ctx, 'line', (candidate) => this.isNa(candidate), fn);
  }

  private interpolateLinePrice(line: LineDrawingOutput, x: number): number {
    if (line.xloc !== 'bar_index') return Number.NaN;
    if (
      line.x1 === null
      || line.x2 === null
      || line.y1 === null
      || line.y2 === null
      || !Number.isFinite(x)
    ) {
      return Number.NaN;
    }

    if (line.x1 === line.x2) {
      return x === line.x1 ? line.y1 : Number.NaN;
    }

    const slope = (line.y2 - line.y1) / (line.x2 - line.x1);
    return line.y1 + slope * (x - line.x1);
  }

  private getMethodBuiltinName(methodName: string): string | undefined {
    switch (methodName) {
      case 'size':
      case 'get':
      case 'set':
      case 'push':
      case 'pop':
      case 'shift':
      case 'unshift':
      case 'copy':
      case 'first':
      case 'last':
      case 'includes':
      case 'indexof':
      case 'lastindexof':
      case 'insert':
      case 'remove':
      case 'sort':
      case 'reverse':
      case 'join':
      case 'concat':
      case 'slice':
      case 'min':
      case 'max':
      case 'sum':
      case 'avg':
      case 'covariance':
      case 'fill':
      case 'clear':
        return `array.${methodName}`;
      default:
        return undefined;
    }
  }

  private evaluateUserFunction(fn: FunctionDeclaration, args: unknown[], namedArgs: Map<string, unknown>): unknown {
    const functionName = fn.name.name;
    const recursiveIndex = this.userFunctionCallStack.indexOf(functionName);
    if (recursiveIndex !== -1) {
      const cycle = [...this.userFunctionCallStack.slice(recursiveIndex), functionName].join(' -> ');
      throw new Error(`Recursive user function calls are not supported: ${cycle}`);
    }

    if (args.length > fn.params.length) {
      throw new Error(
        `Too many arguments for function ${functionName}: expected ${fn.params.length}, got ${args.length}`,
      );
    }

    const paramNames = new Set(fn.params.map((param) => param.name));
    for (const argName of namedArgs.keys()) {
      if (!paramNames.has(argName)) {
        throw new Error(`Unknown argument '${argName}' for function ${functionName}`);
      }
    }

    const parameterValues = fn.params.map((param, index) => {
      const paramName = param.name;
      if (namedArgs.has(paramName)) {
        if (index < args.length) {
          throw new Error(
            `Argument '${paramName}' for function ${functionName} was supplied multiple times`,
          );
        }
        return namedArgs.get(paramName);
      }
      if (index < args.length) {
        return args[index];
      }
      if (param.defaultValue) {
        return this.evaluateExpression(param.defaultValue);
      }
      return undefined;
    });

    const savedScope = this.scope;
    const functionScope = this.functionScopes.get(functionName) ?? this.scope.createChild();
    this.scope = functionScope;
    this.userFunctionCallStack.push(functionName);

    try {
      for (let i = 0; i < fn.params.length; i++) {
        const paramName = fn.params[i].name;
        const value = parameterValues[i];
        this.scope.declare(paramName, 'none', value);
      }

      if (Array.isArray(fn.body)) {
        let result: unknown = undefined;
        for (const stmt of fn.body) {
          const statementResult = this.executeFunctionStatement(stmt);
          if (statementResult.hasResult) {
            result = statementResult.value;
          }
        }
        return result;
      }

      return this.evaluateExpression(fn.body);
    } finally {
      this.userFunctionCallStack.pop();
      this.scope = savedScope;
    }
  }

  private executeFunctionStatement(stmt: Statement): { hasResult: boolean; value?: unknown } {
    if (stmt.type === 'ExpressionStatement') {
      return { hasResult: true, value: this.evaluateExpression(stmt.expression) };
    }

    if (stmt.type === 'IfStatement') {
      return this.executeFunctionIf(stmt);
    }

    if (stmt.type === 'ForStatement') {
      return this.executeFunctionFor(stmt);
    }

    if (stmt.type === 'WhileStatement') {
      return this.executeFunctionWhile(stmt);
    }

    this.executeStatement(stmt);
    return { hasResult: false };
  }

  private executeFunctionFor(stmt: ForStatement): { hasResult: boolean; value?: unknown } {
    if (stmt.kind === 'collection') {
      return this.executeFunctionForIn(stmt);
    }

    const start = this.evaluateExpression(stmt.start) as number;
    const end = this.evaluateExpression(stmt.end) as number;
    const step = stmt.step ? (this.evaluateExpression(stmt.step) as number) : 1;
    if (step === 0) {
      throw new Error('For loop step cannot be zero');
    }

    const childScope = this.scope.createChild();
    const savedScope = this.scope;
    this.scope = childScope;

    let iterations = 0;
    let result: { hasResult: boolean; value?: unknown } = { hasResult: false };

    try {
      for (let i = start; step > 0 ? i <= end : i >= end; i += step) {
        if (++iterations > TealscriptEngine.MAX_LOOP_ITERATIONS) {
          throw new Error('Maximum loop iterations exceeded');
        }

        this.scope.declare(stmt.counter.name, 'none', i);

        try {
          const statementResult = this.executeFunctionLoopBody(stmt.body);
          if (statementResult.hasResult) {
            result = statementResult;
          }
        } catch (e) {
          if (e instanceof BreakException) break;
          if (e instanceof ContinueException) continue;
          throw e;
        }
      }
      return result;
    } finally {
      this.scope = savedScope;
    }
  }

  private executeFunctionForIn(
    stmt: Extract<ForStatement, { kind: 'collection' }>,
  ): { hasResult: boolean; value?: unknown } {
    const iterable = this.evaluateExpression(stmt.iterable);
    let values: unknown[];

    if (Array.isArray(iterable)) {
      values = iterable;
    } else if (isPineArray(iterable)) {
      values = Array.from({ length: getArraySize(iterable) }, (_, index) => getArrayValue(iterable, index));
    } else {
      throw new Error('For-in loop expects an array');
    }

    const childScope = this.scope.createChild();
    const savedScope = this.scope;
    this.scope = childScope;

    let iterations = 0;
    let result: { hasResult: boolean; value?: unknown } = { hasResult: false };

    try {
      for (let index = 0; index < values.length; index++) {
        if (++iterations > TealscriptEngine.MAX_LOOP_ITERATIONS) {
          throw new Error('Maximum loop iterations exceeded');
        }

        const value = values[index];
        if (stmt.indexCounter) {
          this.scope.declare(stmt.indexCounter.name, 'none', index);
        }
        this.scope.declare(stmt.counter.name, 'none', value);

        try {
          const statementResult = this.executeFunctionLoopBody(stmt.body);
          if (statementResult.hasResult) {
            result = statementResult;
          }
        } catch (e) {
          if (e instanceof BreakException) break;
          if (e instanceof ContinueException) continue;
          throw e;
        }
      }
      return result;
    } finally {
      this.scope = savedScope;
    }
  }

  private executeFunctionWhile(stmt: WhileStatement): { hasResult: boolean; value?: unknown } {
    const childScope = this.scope.createChild();
    const savedScope = this.scope;
    this.scope = childScope;

    let iterations = 0;
    let result: { hasResult: boolean; value?: unknown } = { hasResult: false };

    try {
      while (this.isTruthy(this.evaluateExpression(stmt.test))) {
        if (++iterations > TealscriptEngine.MAX_LOOP_ITERATIONS) {
          throw new Error('Maximum loop iterations exceeded');
        }

        try {
          const statementResult = this.executeFunctionLoopBody(stmt.body);
          if (statementResult.hasResult) {
            result = statementResult;
          }
        } catch (e) {
          if (e instanceof BreakException) break;
          if (e instanceof ContinueException) continue;
          throw e;
        }
      }
      return result;
    } finally {
      this.scope = savedScope;
    }
  }

  private executeFunctionLoopBody(statements: Statement[]): { hasResult: boolean; value?: unknown } {
    let result: { hasResult: boolean; value?: unknown } = { hasResult: false };
    for (const statement of statements) {
      const statementResult = this.executeFunctionStatement(statement);
      if (statementResult.hasResult) {
        result = statementResult;
      }
    }
    return result;
  }

  private executeFunctionStatements(statements: Statement[]): { hasResult: boolean; value?: unknown } {
    const childScope = this.scope.createChild();
    const savedScope = this.scope;
    this.scope = childScope;

    try {
      let result: { hasResult: boolean; value?: unknown } = { hasResult: false };
      for (const statement of statements) {
        const statementResult = this.executeFunctionStatement(statement);
        if (statementResult.hasResult) {
          result = statementResult;
        }
      }
      return result;
    } finally {
      this.scope = savedScope;
    }
  }

  private executeFunctionIf(stmt: IfStatement): { hasResult: boolean; value?: unknown } {
    const condition = this.evaluateExpression(stmt.test);

    if (this.isTruthy(condition)) {
      return this.executeFunctionStatements(stmt.consequent);
    }

    if (!stmt.alternate) {
      return { hasResult: false };
    }

    if (Array.isArray(stmt.alternate)) {
      return this.executeFunctionStatements(stmt.alternate);
    }

    return this.executeFunctionIf(stmt.alternate);
  }

  private evaluateMember(expr: MemberExpression): unknown {
    // Handle namespace.constant patterns (e.g., color.red)
    if (expr.object.type === 'Identifier') {
      const namespace = expr.object.name;
      const prop = expr.property.name;
      const fullName = `${namespace}.${prop}`;

      if (namespace === 'barstate' && prop in this.ctx.barstate) {
        return this.ctx.barstate[prop as keyof typeof this.ctx.barstate];
      }
      if (namespace === 'syminfo') {
        return this.evaluateSyminfo(prop);
      }
      if (namespace === 'timeframe') {
        return this.evaluateTimeframe(prop);
      }

      // Check builtins
      const builtin = this.builtins.get(fullName);
      if (builtin) {
        // It's a constant, call with no args
        return builtin([], new Map(), this.ctx, this.scope, fullName);
      }
    }

    throw new Error('Member access not supported except for namespaced constants');
  }

  private evaluateSyminfo(prop: string): unknown {
    switch (prop) {
      case 'ticker':
      case 'description':
      case 'type':
      case 'currency':
      case 'basecurrency':
      case 'mintick':
      case 'pricescale':
      case 'timezone':
        return this.ctx.syminfo[prop];
      case 'tickerid':
      case 'main_tickerid':
        return this.ctx.syminfo.ticker;
      case 'root':
        return this.ctx.syminfo.basecurrency;
      case 'prefix':
        return '';
      case 'session':
        return 'regular';
      case 'minmove':
        return this.ctx.syminfo.mintick * this.ctx.syminfo.pricescale;
      default:
        throw new Error(`Unknown syminfo property: ${prop}`);
    }
  }

  private evaluateTimeframe(prop: string): unknown {
    switch (prop) {
      case 'period':
      case 'multiplier':
      case 'isminutes':
      case 'isdaily':
      case 'isweekly':
      case 'ismonthly':
      case 'isintraday':
        return this.ctx.timeframe[prop];
      case 'main_period':
        return this.ctx.timeframe.period;
      case 'isdwm':
        return this.ctx.timeframe.isdaily || this.ctx.timeframe.isweekly || this.ctx.timeframe.ismonthly;
      case 'isseconds':
      case 'isticks':
        return false;
      default:
        throw new Error(`Unknown timeframe property: ${prop}`);
    }
  }

  private evaluateIndex(expr: IndexExpression): unknown {
    const offset = this.normalizeIndexOffset(this.evaluateExpression(expr.index));
    if (offset === null) {
      return Number.NaN;
    }

    if (expr.object.type === 'Identifier') {
      const name = expr.object.name;
      if (this.scope.has(name)) {
        const value = this.scope.get(name);
        if (Array.isArray(value) || isPineArray(value)) {
          return this.naIfMissing(this.readArrayElement(value, offset));
        }
      }

      switch (name) {
        case 'open':
          return this.naIfMissing(this.ctx.open.get(offset));
        case 'high':
          return this.naIfMissing(this.ctx.high.get(offset));
        case 'low':
          return this.naIfMissing(this.ctx.low.get(offset));
        case 'close':
          return this.naIfMissing(this.ctx.close.get(offset));
        case 'volume':
          return this.naIfMissing(this.ctx.volume.get(offset));
        case 'time':
          return this.naIfMissing(this.ctx.time.get(offset));
        case 'time_close': {
          const openTime = this.ctx.time.get(offset);
          return openTime === undefined ? Number.NaN : this.naIfMissing(this.getBarCloseTime(openTime, this.ctx.timeframe.period));
        }
      }

      if (this.scope.has(name)) {
        return this.naIfMissing(this.scope.getWithOffset(name, offset));
      }

      throw new Error(`Unknown identifier: ${name}`);
    }

    // Array index access
    const obj = this.evaluateExpression(expr.object);
    if (Array.isArray(obj) || isPineArray(obj)) {
      return this.naIfMissing(this.readArrayElement(obj, offset));
    }

    throw new Error('Index access on non-array/non-series');
  }

  private readArrayElement(array: unknown, index: number): unknown {
    if (isPineArray(array)) {
      return getArrayValue(array, index);
    }
    if (Array.isArray(array)) {
      return array[index];
    }
    throw new Error('Index access on non-array/non-series');
  }

  private writeArrayElement(array: unknown, index: number, value: unknown): void {
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

  // ===========================================================================
  // Helpers
  // ===========================================================================

  private isTruthy(value: unknown): boolean {
    if (this.isNa(value)) return false;
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value !== 0;
    if (typeof value === 'string') return value.length > 0;
    return !!value;
  }

  private isNa(value: unknown): boolean {
    return typeof value === 'number' && isNaN(value);
  }

  private isComparisonOperator(operator: string): boolean {
    return (
      operator === '==' ||
      operator === '!=' ||
      operator === '<' ||
      operator === '>' ||
      operator === '<=' ||
      operator === '>='
    );
  }

  private normalizeIndexOffset(value: unknown): number | null {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      return null;
    }

    const offset = Math.trunc(value);
    return offset < 0 ? null : offset;
  }

  private naIfMissing(value: unknown): unknown {
    return value === undefined ? Number.NaN : value;
  }

  private toPlotValue(value: unknown): number | null {
    if (value === null || value === undefined || this.isNa(value)) {
      return null;
    }
    return value as number;
  }

  private toPlotColor(value: unknown): string | null {
    if (value === null || value === undefined || this.isNa(value)) {
      return null;
    }
    return String(value);
  }

  private setOhlcPlotBar(
    plot: PlotOutput | undefined,
    barIndex: number,
    open: number | null,
    high: number | null,
    low: number | null,
    close: number | null,
    color: string | null,
    wickColor?: string | null,
    borderColor?: string | null,
  ): void {
    if (!plot) return;

    const hasGap = open === null || high === null || low === null || close === null;
    const normalizedOpen = hasGap ? null : open;
    const normalizedHigh = hasGap ? null : high;
    const normalizedLow = hasGap ? null : low;
    const normalizedClose = hasGap ? null : close;
    const normalizedColor = hasGap ? null : color;

    const setAtBar = <T>(values: T[] | undefined, value: T): void => {
      if (!values) return;
      while (values.length < barIndex) {
        values.push(null as T);
      }
      values[barIndex] = value;
    };

    setAtBar(plot.openValues, normalizedOpen);
    setAtBar(plot.highValues, normalizedHigh);
    setAtBar(plot.lowValues, normalizedLow);
    setAtBar(plot.closeValues, normalizedClose);
    setAtBar(plot.values, normalizedClose);
    if (Array.isArray(plot.color)) {
      setAtBar(plot.color, normalizedColor);
    }
    if (Array.isArray(plot.wickColor)) {
      setAtBar(plot.wickColor, hasGap ? null : (wickColor ?? normalizedColor));
    }
    if (Array.isArray(plot.borderColor)) {
      setAtBar(plot.borderColor, hasGap ? null : (borderColor ?? normalizedColor));
    }
  }

  private toStringValue(value: unknown, format?: string): string {
    if (value === null || value === undefined || this.isNa(value)) {
      return 'NaN';
    }
    if (typeof value === 'number') {
      if (format) {
        return this.formatNumber(value, format);
      }
      return String(value);
    }
    return String(value);
  }

  private replaceStringOccurrence(source: string, target: string, replacement: string, occurrenceArg: unknown): string {
    const occurrence = occurrenceArg === undefined ? 0 : Math.trunc(this.toNumber(occurrenceArg));
    if (!Number.isFinite(occurrence) || occurrence < 0) return source;
    if (target === '') return occurrence === 0 ? source.replace(target, replacement) : source;
    if (occurrence === 0) return source.replace(target, replacement);

    let fromIndex = 0;
    for (let index = 0; index <= occurrence; index++) {
      const matchIndex = source.indexOf(target, fromIndex);
      if (matchIndex === -1) return source;
      if (index === occurrence) {
        return source.slice(0, matchIndex) + replacement + source.slice(matchIndex + target.length);
      }
      fromIndex = matchIndex + target.length;
    }
    return source;
  }

  private toOptionalString(value: unknown): string | undefined {
    if (value === null || value === undefined || this.isNa(value)) {
      return undefined;
    }
    return String(value);
  }

  private formatNumber(value: number, format: string): string {
    const decimalMatch = format.match(/\.([0#]+)/);
    if (decimalMatch) {
      return value.toFixed(decimalMatch[1].length);
    }
    if (/^[#0,]+$/.test(format)) {
      return Math.round(value).toString();
    }
    return String(value);
  }

  private clampNumber(value: unknown, min: number, max: number): number {
    const numericValue = typeof value === 'number' ? value : Number(value ?? 0);
    if (!Number.isFinite(numericValue)) return min;
    return Math.min(max, Math.max(min, Math.round(numericValue)));
  }

  private transparencyToAlpha(transparency: unknown): number {
    const normalizedTransparency = this.clampNumber(transparency ?? 0, 0, 100);
    return this.clampNumber(((100 - normalizedTransparency) / 100) * 255, 0, 255);
  }

  private alphaToTransparency(alpha: number): number {
    return this.clampNumber(100 - (alpha / 255) * 100, 0, 100);
  }

  private formatColor(red: unknown, green: unknown, blue: unknown, transparency: unknown = 0): string {
    const channels = [red, green, blue, this.transparencyToAlpha(transparency)];
    return `#${channels.map((channel) => this.clampNumber(channel, 0, 255).toString(16).padStart(2, '0').toUpperCase()).join('')}`;
  }

  private formatTimestamp(timestamp: unknown, format: string, timezone: string): string {
    const value = this.toNumber(timestamp);
    if (!Number.isFinite(value)) return 'NaN';

    const offsetMs = this.parseTimezoneOffsetMinutes(timezone) * 60_000;
    const date = new Date(value + offsetMs);
    const pad = (part: number, length = 2): string => String(part).padStart(length, '0');

    return format.replace(/yyyy|yy|MM|dd|HH|mm|ss|SSS/g, (token) => {
      switch (token) {
        case 'yyyy':
          return String(date.getUTCFullYear());
        case 'yy':
          return pad(date.getUTCFullYear() % 100);
        case 'MM':
          return pad(date.getUTCMonth() + 1);
        case 'dd':
          return pad(date.getUTCDate());
        case 'HH':
          return pad(date.getUTCHours());
        case 'mm':
          return pad(date.getUTCMinutes());
        case 'ss':
          return pad(date.getUTCSeconds());
        case 'SSS':
          return pad(date.getUTCMilliseconds(), 3);
        default:
          return token;
      }
    });
  }

  private parseColor(value: unknown): { red: number; green: number; blue: number; alpha: number } | null {
    if (typeof value !== 'string') return null;

    const match = value.match(/^#([0-9a-fA-F]{6})([0-9a-fA-F]{2})?$/);
    if (!match) return null;

    const hex = match[1];
    return {
      red: parseInt(hex.slice(0, 2), 16),
      green: parseInt(hex.slice(2, 4), 16),
      blue: parseInt(hex.slice(4, 6), 16),
      alpha: match[2] ? parseInt(match[2], 16) : 255,
    };
  }

  private isFiniteNumber(value: unknown): value is number {
    return typeof value === 'number' && Number.isFinite(value);
  }

  private toNumber(value: unknown): number {
    if (typeof value === 'number') return value;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : Number.NaN;
  }

  private toNullableNumber(value: unknown): number | null {
    const numberValue = this.toNumber(value);
    return Number.isFinite(numberValue) ? numberValue : null;
  }

  private toNullableColor(value: unknown): string | null {
    return typeof value === 'string' ? value : null;
  }

  private setBuiltinState(scope: Scope, key: string, value: unknown): void {
    if (scope.has(key)) {
      scope.set(key, value);
    } else {
      scope.declare(key, 'var', value);
    }
  }

  private normalizeLookbackLength(value: unknown): number {
    return typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.trunc(value)) : 0;
  }

  private updateBuiltinSourceHistory(scope: Scope, key: string, source: number, keep: number): number[] {
    const history = (scope.get(key) as number[] | undefined) ?? [];
    const nextHistory = [source, ...history].slice(0, keep);
    this.setBuiltinState(scope, key, nextHistory);
    return nextHistory;
  }

  private getCompleteSourceWindow(scope: Scope, key: string, source: number, length: number): number[] | null {
    if (isNaN(source) || length < 1) return null;
    const maxLengthKey = `${key}_max_length`;
    const previousMaxLength = scope.get(maxLengthKey) as number | undefined;
    const maxLength = Math.max(length, previousMaxLength ?? 0);
    this.setBuiltinState(scope, maxLengthKey, maxLength);

    const keep = Math.min(
      Math.max(maxLength, this.ctx.bar_index + 1),
      TealscriptEngine.MAX_BUILTIN_SOURCE_HISTORY,
    );
    const values = this.updateBuiltinSourceHistory(scope, key, source, keep);
    const window = values.slice(0, length);
    if (window.length < length || window.some((value) => isNaN(value))) return null;
    return window;
  }

  private getCompleteNonNaSourceWindow(scope: Scope, key: string, source: number, length: number): number[] | null {
    if (length < 1) return null;
    const history = (scope.get(key) as number[] | undefined) ?? [];
    const values = [source, ...history].filter((value) => !isNaN(value)).slice(0, length);
    this.setBuiltinState(scope, key, values);
    return values.length < length ? null : values;
  }

  private nextSeededRandom(scope: Scope, key: string, seed: number): number {
    const state = scope.get(key) as RandomBuiltinState | undefined;
    const current = state?.seed === seed ? state.state : this.hashRandomSeed(seed);
    const nextState = (current + 0x6d2b79f5) >>> 0;
    let value = nextState;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    this.setBuiltinState(scope, key, { seed, state: nextState });
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  }

  private hashRandomSeed(seed: number): number {
    let value = seed >>> 0;
    value ^= value >>> 16;
    value = Math.imul(value, 0x7feb352d);
    value ^= value >>> 15;
    value = Math.imul(value, 0x846ca68b);
    value ^= value >>> 16;
    return value >>> 0;
  }

  private toExclusiveUnitRandom(value: number): number {
    if (value <= 0) return Number.EPSILON;
    if (value >= 1) return 1 - Number.EPSILON;
    return value;
  }

  private getCompletePairedSourceWindows(
    scope: Scope,
    leftKey: string,
    rightKey: string,
    leftSource: number,
    rightSource: number,
    length: number,
  ): [number[], number[]] | null {
    if (length < 1 || isNaN(leftSource) || isNaN(rightSource)) return null;
    const leftValues = this.updateBuiltinSourceHistory(scope, leftKey, leftSource, length);
    const rightValues = this.updateBuiltinSourceHistory(scope, rightKey, rightSource, length);
    if (
      leftValues.length < length
      || rightValues.length < length
      || leftValues.some((value) => isNaN(value))
      || rightValues.some((value) => isNaN(value))
    ) {
      return null;
    }
    return [leftValues, rightValues];
  }

  // ===========================================================================
  // Built-in Functions Registration
  // ===========================================================================

  private registerBuiltins(): void {
    // Plot functions
    this.registerPlotBuiltins();

    // Input functions
    this.registerInputBuiltins();

    // Math functions
    this.registerMathBuiltins();

    // String functions
    this.registerStringBuiltins();

    // Drawing object functions
    this.registerDrawingBuiltins();

    // Time/calendar functions
    this.registerTimeBuiltins();

    // Array functions
    this.registerArrayBuiltins();

    // Color constants
    this.registerColorBuiltins();

    // TA functions (basic stubs for now)
    this.registerTaBuiltins();

    // Visual constants (shape, location, size)
    this.registerVisualConstants();

    // Alert functions and constants
    this.registerAlertBuiltins();

    // Runtime helpers
    this.registerRuntimeBuiltins();
  }

  // Plot call ordering is reset on every bar so output arrays align by call site.
  private plotCallIndex = 0;
  private builtinCallCounts = new Map<string, number>();

  private resetPerBarBuiltinState(): void {
    this.plotCallIndex = 0;
    this.builtinCallCounts.clear();
  }

  private registerRuntimeBuiltins(): void {
    this.builtins.set('runtime.error', (args, namedArgs) => {
      const message = namedArgs.has('message') ? namedArgs.get('message') : args[0];
      throw new RuntimeErrorException(this.toStringValue(message ?? ''));
    });
  }

  private nextBuiltinCallId(name: string): string {
    const index = this.builtinCallCounts.get(name) ?? 0;
    this.builtinCallCounts.set(name, index + 1);
    return `${name}_${index}`;
  }

  private registerPlotBuiltins(): void {
    this.builtins.set('plot', (args, namedArgs, ctx) => {
      const value = args[0] as number;
      const callIndex = this.plotCallIndex++;
      const hasExplicitTitle = namedArgs.has('title') || args[1] !== undefined;
      const title = (namedArgs.get('title') ?? args[1] ?? `Plot ${callIndex + 1}`) as string;
      const colorArg = namedArgs.has('color') ? namedArgs.get('color') : args[2] !== undefined ? args[2] : '#2196F3';
      const color = this.toPlotColor(colorArg);
      const linewidth = (namedArgs.get('linewidth') ?? 1) as number;
      const style = (namedArgs.get('style') ?? 'line') as string;

      // Use plot call order for untitled plots so multiple plot(...) calls do
      // not collapse into one "Plot" series across every bar.
      const id = hasExplicitTitle ? `plot_${title}` : `plot_untitled_${callIndex}`;

      if (ctx.bar_index === 0) {
        ctx.registerPlot({
          id,
          type: 'plot',
          title,
          color: [], // Always array for per-bar colors
          linewidth,
          style: style as PlotStyle,
        });
      }

      // Add color to array for this bar (supports dynamic colors)
      const plot = ctx.plots.get(id);
      if (plot && Array.isArray(plot.color)) {
        plot.color.push(color);
      }

      ctx.addPlotValue(id, this.toPlotValue(value));
      return id;
    });

    this.builtins.set('hline', (args, namedArgs, ctx) => {
      const price = args[0] as number;
      const title = (namedArgs.get('title') ?? args[1] ?? 'HLine') as string;
      const color = (namedArgs.get('color') ?? args[2] ?? '#787B86') as string;
      const linewidth = (namedArgs.get('linewidth') ?? 1) as number;

      const id = `hline_${title}`;

      if (ctx.bar_index === 0) {
        ctx.registerPlot({
          id,
          type: 'hline',
          title,
          color,
          linewidth,
          price,
        });
      }

      return id;
    });

    this.builtins.set('bgcolor', (args, namedArgs, ctx) => {
      const color = this.toPlotColor(args[0]);
      const title = (namedArgs.get('title') ?? 'bgcolor') as string;

      const id = `bgcolor_${title}`;

      if (ctx.bar_index === 0) {
        ctx.registerPlot({
          id,
          type: 'bgcolor',
          title,
          color: [],
        });
      }

      const plot = ctx.plots.get(id);
      if (plot && Array.isArray(plot.color)) {
        plot.color.push(color);
      }

      return color;
    });

    this.builtins.set('barcolor', (args, namedArgs, ctx, _scope, callId) => {
      const color = this.toPlotColor(args[0]);
      const title = (namedArgs.get('title') ?? callId) as string;
      const id = `barcolor_${title}`;

      let plot = ctx.plots.get(id);
      if (!plot) {
        ctx.registerPlot({
          id,
          type: 'barcolor',
          title,
          color: [],
        });
        plot = ctx.plots.get(id);
      }

      if (plot && Array.isArray(plot.color)) {
        while (plot.color.length < ctx.bar_index) {
          plot.color.push(null);
        }
        while (plot.values.length < ctx.bar_index) {
          plot.values.push(null);
        }
        plot.color[ctx.bar_index] = color;
      }

      ctx.addPlotValue(id, null);
      return color;
    });

    this.builtins.set('plotbar', (args, namedArgs, ctx, _scope, callId) => {
      const open = this.toPlotValue(namedArgs.has('open') ? namedArgs.get('open') : args[0]);
      const high = this.toPlotValue(namedArgs.has('high') ? namedArgs.get('high') : args[1]);
      const low = this.toPlotValue(namedArgs.has('low') ? namedArgs.get('low') : args[2]);
      const close = this.toPlotValue(namedArgs.has('close') ? namedArgs.get('close') : args[3]);
      const title = (namedArgs.get('title') ?? args[4] ?? callId) as string;
      const color = this.toPlotColor(
        namedArgs.has('color')
          ? namedArgs.get('color')
          : args[5] !== undefined
            ? args[5]
            : close !== null && open !== null && close >= open
              ? '#4CAF50'
              : '#F44336',
      );
      const id = `plotbar_${title}`;

      let plot = ctx.plots.get(id);
      if (!plot) {
        ctx.registerPlot({
          id,
          type: 'plotbar',
          title,
          color: [],
          openValues: [],
          highValues: [],
          lowValues: [],
          closeValues: [],
        });
        plot = ctx.plots.get(id);
      }

      this.setOhlcPlotBar(plot, ctx.bar_index, open, high, low, close, color);
      return close;
    });

    this.builtins.set('plotcandle', (args, namedArgs, ctx, _scope, callId) => {
      const open = this.toPlotValue(namedArgs.has('open') ? namedArgs.get('open') : args[0]);
      const high = this.toPlotValue(namedArgs.has('high') ? namedArgs.get('high') : args[1]);
      const low = this.toPlotValue(namedArgs.has('low') ? namedArgs.get('low') : args[2]);
      const close = this.toPlotValue(namedArgs.has('close') ? namedArgs.get('close') : args[3]);
      const title = (namedArgs.get('title') ?? args[4] ?? callId) as string;
      const defaultColor = close !== null && open !== null && close >= open ? '#4CAF50' : '#F44336';
      const color = this.toPlotColor(
        namedArgs.has('color') ? namedArgs.get('color') : args[5] !== undefined ? args[5] : defaultColor,
      );
      const wickColor = this.toPlotColor(
        namedArgs.has('wickcolor') ? namedArgs.get('wickcolor') : args[6] !== undefined ? args[6] : color,
      );
      const borderColor = this.toPlotColor(
        namedArgs.has('bordercolor') ? namedArgs.get('bordercolor') : color,
      );
      const id = `plotcandle_${title}`;

      let plot = ctx.plots.get(id);
      if (!plot) {
        ctx.registerPlot({
          id,
          type: 'plotcandle',
          title,
          color: [],
          openValues: [],
          highValues: [],
          lowValues: [],
          closeValues: [],
          wickColor: [],
          borderColor: [],
        });
        plot = ctx.plots.get(id);
      }

      this.setOhlcPlotBar(plot, ctx.bar_index, open, high, low, close, color, wickColor, borderColor);
      return close;
    });

    // Plot style constants
    this.builtins.set('plot.style_line', () => 'line');
    this.builtins.set('plot.style_linebr', () => 'linebr');
    this.builtins.set('plot.style_stepline', () => 'stepline');
    this.builtins.set('plot.style_stepline_diamond', () => 'stepline_diamond');
    this.builtins.set('plot.style_histogram', () => 'histogram');
    this.builtins.set('plot.style_circles', () => 'circles');
    this.builtins.set('plot.style_cross', () => 'cross');
    this.builtins.set('plot.style_columns', () => 'columns');
    this.builtins.set('plot.style_area', () => 'area');
    this.builtins.set('plot.style_areabr', () => 'areabr');

    // =========================================================================
    // plotshape - Conditional shape markers
    // =========================================================================
    this.builtins.set('plotshape', (args, namedArgs, ctx) => {
      const series = args[0]; // Can be boolean or number
      const title = (namedArgs.get('title') ?? args[1] ?? 'Shape') as string;
      const style = (namedArgs.get('style') ?? 'circle') as string;
      const location = (namedArgs.get('location') ?? 'abovebar') as string;
      const color = this.toPlotColor(namedArgs.has('color') ? namedArgs.get('color') : '#2196F3');
      const size = (namedArgs.get('size') ?? 'normal') as string;
      const text = (namedArgs.get('text') ?? '') as string;

      const id = `plotshape_${title}`;

      if (ctx.bar_index === 0) {
        ctx.registerPlot({
          id,
          type: 'plotshape',
          title,
          color: [],
          shape: style,
          location: location as 'abovebar' | 'belowbar' | 'top' | 'bottom' | 'absolute',
          size: size as 'tiny' | 'small' | 'normal' | 'large' | 'huge' | 'auto',
          text,
        });
      }

      // Add color to array for this bar
      const plot = ctx.plots.get(id);
      if (plot && Array.isArray(plot.color)) {
        plot.color.push(color);
      }

      // Determine value - true/non-zero means show shape
      let value: number | null = null;
      if (typeof series === 'boolean') {
        value = series ? 1 : null;
      } else if (typeof series === 'number') {
        value = !isNaN(series) && series !== 0 ? series : null;
      }

      ctx.addPlotValue(id, value);
      return series;
    });

    // =========================================================================
    // plotchar - Custom character markers
    // =========================================================================
    this.builtins.set('plotchar', (args, namedArgs, ctx) => {
      const series = args[0]; // Can be boolean or number
      const title = (namedArgs.get('title') ?? args[1] ?? 'Char') as string;
      const char = (namedArgs.get('char') ?? '●') as string;
      const location = (namedArgs.get('location') ?? 'abovebar') as string;
      const color = this.toPlotColor(namedArgs.has('color') ? namedArgs.get('color') : '#2196F3');
      const size = (namedArgs.get('size') ?? 'normal') as string;
      const text = (namedArgs.get('text') ?? '') as string;

      const id = `plotchar_${title}`;

      if (ctx.bar_index === 0) {
        ctx.registerPlot({
          id,
          type: 'plotchar',
          title,
          color: [],
          char,
          location: location as 'abovebar' | 'belowbar' | 'top' | 'bottom' | 'absolute',
          size: size as 'tiny' | 'small' | 'normal' | 'large' | 'huge' | 'auto',
          text,
        });
      }

      // Add color to array for this bar
      const plot = ctx.plots.get(id);
      if (plot && Array.isArray(plot.color)) {
        plot.color.push(color);
      }

      // Determine value
      let value: number | null = null;
      if (typeof series === 'boolean') {
        value = series ? 1 : null;
      } else if (typeof series === 'number') {
        value = !isNaN(series) && series !== 0 ? series : null;
      }

      ctx.addPlotValue(id, value);
      return series;
    });

    // =========================================================================
    // plotarrow - Directional arrows
    // =========================================================================
    this.builtins.set('plotarrow', (args, namedArgs, ctx) => {
      const series = args[0] as number; // Positive = up arrow, negative = down arrow
      const title = (namedArgs.get('title') ?? 'Arrow') as string;
      const colorup = (namedArgs.get('colorup') ?? '#4CAF50') as string;
      const colordown = (namedArgs.get('colordown') ?? '#F44336') as string;

      const id = `plotarrow_${title}`;

      if (ctx.bar_index === 0) {
        ctx.registerPlot({
          id,
          type: 'plotarrow',
          title,
          color: [],
          colorup,
          colordown,
          location: 'abovebar', // Arrows position relative to price
        });
      }

      // Determine color based on value sign
      const plot = ctx.plots.get(id);
      if (plot && Array.isArray(plot.color)) {
        if (isNaN(series) || series === 0) {
          plot.color.push(null);
        } else {
          plot.color.push(series > 0 ? colorup : colordown);
        }
      }

      // Value determines arrow direction and size
      const value = isNaN(series) || series === 0 ? null : series;
      ctx.addPlotValue(id, value);
      return series;
    });

    // =========================================================================
    // fill - Fill area between two plots
    // =========================================================================
    this.builtins.set('fill', (args, namedArgs, ctx) => {
      const plot1Id = this.resolveFillPlotId(args[0], ctx);
      const plot2Id = this.resolveFillPlotId(args[1], ctx);
      const color = (namedArgs.get('color') ?? args[2] ?? 'rgba(33, 150, 243, 0.2)') as string;
      const title = (namedArgs.get('title') ?? 'Fill') as string;

      const id = `fill_${title}`;

      if (ctx.bar_index === 0) {
        ctx.registerPlot({
          id,
          type: 'fill',
          title,
          color: [],
          plot1Id,
          plot2Id,
        });
      }

      // Add color for this bar (supports dynamic colors)
      const plot = ctx.plots.get(id);
      if (plot && Array.isArray(plot.color)) {
        plot.color.push(color);
      }

      // Fill doesn't have a value per se, but we track it for consistency
      ctx.addPlotValue(id, 1);
      return null;
    });
  }

  private resolveFillPlotId(value: unknown, ctx: ExecutionContext): string {
    const reference = String(value);
    if (ctx.plots.has(reference)) {
      return reference;
    }

    for (const prefix of ['plot_', 'hline_']) {
      const id = `${prefix}${reference}`;
      if (ctx.plots.has(id)) {
        return id;
      }
    }

    return reference.startsWith('plot_') || reference.startsWith('hline_') ? reference : `plot_${reference}`;
  }

  private normalizeAlertFrequency(value: unknown): AlertFrequency {
    if (value === 'all' || value === 'once_per_bar_close' || value === 'once_per_bar') {
      return value;
    }
    return 'once_per_bar';
  }

  private registerAlertBuiltins(): void {
    this.builtins.set('alertcondition', (args, namedArgs, ctx, _scope, callId) => {
      const condition = namedArgs.has('condition') ? namedArgs.get('condition') : args[0];
      const title = String(namedArgs.get('title') ?? args[1] ?? callId);
      const message = String(namedArgs.get('message') ?? args[2] ?? '');
      const id = `alertcondition_${title}`;
      const isActive = this.isTruthy(condition);

      if (!ctx.alerts.has(id)) {
        ctx.registerAlert({
          id,
          type: 'alertcondition',
          title,
          message,
        });
      }

      ctx.setAlertConditionValue(id, isActive ? true : null);
      return condition;
    });

    this.builtins.set('alert', (args, namedArgs, ctx, _scope, callId) => {
      const message = String(namedArgs.get('message') ?? args[0] ?? '');
      const frequency = this.normalizeAlertFrequency(namedArgs.get('freq') ?? args[1]);
      const id = `alert_${callId}`;

      ctx.addAlertEvent(id, message, frequency);
      return undefined;
    });

    this.builtins.set('alert.freq_all', () => 'all');
    this.builtins.set('alert.freq_once_per_bar', () => 'once_per_bar');
    this.builtins.set('alert.freq_once_per_bar_close', () => 'once_per_bar_close');
  }

  private registerInputBuiltins(): void {
    const inferInputType = (value: unknown): string => {
      if (typeof value === 'number') return Number.isInteger(value) ? 'int' : 'float';
      if (typeof value === 'boolean') return 'bool';
      if (typeof value === 'string') return 'string';
      return 'source';
    };

    const createInputFunc = (type: string) => {
      return (args: unknown[], namedArgs: Map<string, unknown>, ctx: ExecutionContext) => {
        const defval = args[0];
        const title = (namedArgs.get('title') ?? args[1] ?? type) as string;

        const id = `input_${title}`;

        if (ctx.bar_index === 0) {
          ctx.registerInput({
            id,
            type: type as 'int' | 'float' | 'bool' | 'string' | 'source' | 'color' | 'time' | 'timeframe' | 'symbol' | 'session' | 'text_area',
            title,
            defval,
            minval: namedArgs.get('minval') as number | undefined,
            maxval: namedArgs.get('maxval') as number | undefined,
            step: namedArgs.get('step') as number | undefined,
            options: namedArgs.get('options') as unknown[] | undefined,
            tooltip: namedArgs.get('tooltip') as string | undefined,
            group: namedArgs.get('group') as string | undefined,
            inline: namedArgs.get('inline') as string | undefined,
            confirm: namedArgs.get('confirm') as boolean | undefined,
            display: namedArgs.get('display'),
          });
        }

        return ctx.getInput(id) ?? defval;
      };
    };

    this.builtins.set('input', (args, namedArgs, ctx) => {
      const defval = args[0];
      return createInputFunc(inferInputType(defval))(args, namedArgs, ctx);
    });
    this.builtins.set('input.int', createInputFunc('int'));
    this.builtins.set('input.float', createInputFunc('float'));
    this.builtins.set('input.bool', createInputFunc('bool'));
    this.builtins.set('input.string', createInputFunc('string'));
    this.builtins.set('input.color', createInputFunc('color'));
    this.builtins.set('input.time', createInputFunc('time'));
    this.builtins.set('input.timeframe', createInputFunc('timeframe'));
    this.builtins.set('input.symbol', createInputFunc('symbol'));
    this.builtins.set('input.session', createInputFunc('session'));
    this.builtins.set('input.text_area', createInputFunc('text_area'));

    // input.source is special - it returns a series
    this.builtins.set('input.source', (args, namedArgs, _ctx) => {
      const defval = args[0]; // Should be a series like 'close'
      const _title = (namedArgs.get('title') ?? args[1] ?? 'Source') as string;

      // For now, just return the default value
      // In full implementation, this would allow user to select which series
      return defval;
    });
  }

  private registerMathBuiltins(): void {
    this.builtins.set('math.pi', () => Math.PI);
    this.builtins.set('math.e', () => Math.E);
    this.builtins.set('math.phi', () => (1 + Math.sqrt(5)) / 2);

    this.builtins.set('math.abs', (args) => Math.abs(args[0] as number));
    this.builtins.set('math.max', (args) => Math.max(...(args as number[])));
    this.builtins.set('math.min', (args) => Math.min(...(args as number[])));
    this.builtins.set('math.avg', (args) => {
      if (args.length === 0) return Number.NaN;
      const values = args.map((arg) => this.toNumber(arg));
      if (values.some((value) => Number.isNaN(value))) return Number.NaN;
      return values.reduce((sum, value) => sum + value, 0) / values.length;
    });
    this.builtins.set('math.sum', (args, _namedArgs, _ctx, scope, callId) => {
      const source = this.toNumber(args[0]);
      const length = this.normalizeLookbackLength(args[1]);
      const values = this.getCompleteNonNaSourceWindow(scope, `_math_sum_source_${callId}`, source, length);
      return values ? values.reduce((sum, value) => sum + value, 0) : Number.NaN;
    });
    this.builtins.set('math.random', (args, namedArgs, _ctx, scope, callId) => {
      const min = this.toNumber(namedArgs.has('min') ? namedArgs.get('min') : args[0] ?? 0);
      const max = this.toNumber(namedArgs.has('max') ? namedArgs.get('max') : args[1] ?? 1);
      const seedArg = namedArgs.has('seed') ? namedArgs.get('seed') : args[2];
      if (!Number.isFinite(min) || !Number.isFinite(max) || max <= min) return Number.NaN;

      let randomValue: number;
      if (seedArg === undefined) {
        randomValue = Math.random();
      } else {
        const seed = Math.trunc(this.toNumber(seedArg));
        if (!Number.isFinite(seed)) return Number.NaN;
        randomValue = this.nextSeededRandom(scope, `_math_random_${callId}`, seed);
      }

      return min + this.toExclusiveUnitRandom(randomValue) * (max - min);
    });
    this.builtins.set('math.sqrt', (args) => Math.sqrt(args[0] as number));
    this.builtins.set('math.pow', (args) => Math.pow(args[0] as number, args[1] as number));
    this.builtins.set('math.log', (args) => Math.log(args[0] as number));
    this.builtins.set('math.log10', (args) => Math.log10(args[0] as number));
    this.builtins.set('math.exp', (args) => Math.exp(args[0] as number));
    this.builtins.set('math.round', (args) => {
      const value = this.toNumber(args[0]);
      const precision = args[1] === undefined ? 0 : Math.trunc(this.toNumber(args[1]));
      const factor = 10 ** precision;
      return Math.round(value * factor) / factor;
    });
    this.builtins.set('math.round_to_mintick', (args) => {
      const value = this.toNumber(args[0]);
      const tick = this.ctx.syminfo.mintick;
      if (!Number.isFinite(value) || !Number.isFinite(tick) || tick <= 0) return Number.NaN;
      return Math.round(value / tick) * tick;
    });
    this.builtins.set('math.trunc', (args) => Math.trunc(this.toNumber(args[0])));
    this.builtins.set('math.floor', (args) => Math.floor(args[0] as number));
    this.builtins.set('math.ceil', (args) => Math.ceil(args[0] as number));
    this.builtins.set('math.sign', (args) => Math.sign(args[0] as number));
    this.builtins.set('math.sin', (args) => Math.sin(args[0] as number));
    this.builtins.set('math.cos', (args) => Math.cos(args[0] as number));
    this.builtins.set('math.tan', (args) => Math.tan(args[0] as number));
    this.builtins.set('math.asin', (args) => Math.asin(args[0] as number));
    this.builtins.set('math.acos', (args) => Math.acos(args[0] as number));
    this.builtins.set('math.atan', (args) => Math.atan(args[0] as number));
    this.builtins.set('math.toradians', (args) => this.toNumber(args[0]) * (Math.PI / 180));
    this.builtins.set('math.todegrees', (args) => this.toNumber(args[0]) * (180 / Math.PI));

    // nz - replace na with value
    this.builtins.set('nz', (args) => {
      this.rejectBoolNaHelperArgs('nz', args);
      const value = args[0];
      const replacement = args[1] ?? 0;
      return this.isNa(value) ? replacement : value;
    });

    this.builtins.set('fixnan', (args, _namedArgs, _ctx, scope, callId) => {
      this.rejectBoolNaHelperArgs('fixnan', args);
      const key = `_fixnan_${callId}`;
      const value = args[0];
      if (this.isNa(value)) {
        return scope.has(key) ? scope.get(key) : Number.NaN;
      }
      this.setBuiltinState(scope, key, value);
      return value;
    });

    this.builtins.set('float', (args) => this.toNumber(args[0]));
    this.builtins.set('int', (args) => {
      const value = this.toNumber(args[0]);
      return Number.isNaN(value) ? Number.NaN : Math.trunc(value);
    });
    this.builtins.set('bool', (args) => this.isTruthy(args[0]));
    this.builtins.set('string', (args) => this.toStringValue(args[0]));

    // na function
    this.builtins.set('na', (args) => {
      if (args.length === 0) return NaN;
      const value = args[0];
      return typeof value === 'number' && isNaN(value);
    });
  }

  private rejectBoolNaHelperArgs(functionName: 'nz' | 'fixnan', args: unknown[]): void {
    if (args.some((value) => typeof value === 'boolean')) {
      throw new Error(`${functionName}() does not accept bool arguments in Pine v6`);
    }
  }

  private registerStringBuiltins(): void {
    this.builtins.set('str.tostring', (args) => {
      return this.toStringValue(args[0], args[1] as string | undefined);
    });
    this.builtins.set('str.tonumber', (args) => {
      const source = this.toStringValue(args[0]).trim();
      if (source.length === 0) return Number.NaN;
      const value = Number(source);
      return Number.isFinite(value) ? value : Number.NaN;
    });
    this.builtins.set('str.format_time', (args) => {
      const timestamp = args[0] === undefined ? this.ctx.time.get(0) : this.toNumber(args[0]);
      const format = args[1] === undefined || args[1] === '' ? 'yyyy-MM-dd HH:mm:ss' : this.toStringValue(args[1]);
      const timezone = args[2] === undefined || args[2] === '' ? this.ctx.syminfo.timezone : this.toStringValue(args[2]);
      return this.formatTimestamp(timestamp, format, timezone);
    });

    this.builtins.set('str.format', (args) => {
      const template = this.toStringValue(args[0]);
      return template.replace(/\{(\d+)(?:,[^}:]+)?(?::([^}]+))?\}/g, (_match, index: string, format: string | undefined) => {
        return this.toStringValue(args[Number(index) + 1], format);
      });
    });

    this.builtins.set('str.length', (args) => this.toStringValue(args[0]).length);
    this.builtins.set('str.contains', (args) => this.toStringValue(args[0]).includes(this.toStringValue(args[1])));
    this.builtins.set('str.startswith', (args) => this.toStringValue(args[0]).startsWith(this.toStringValue(args[1])));
    this.builtins.set('str.endswith', (args) => this.toStringValue(args[0]).endsWith(this.toStringValue(args[1])));
    this.builtins.set('str.pos', (args) => {
      const index = this.toStringValue(args[0]).indexOf(this.toStringValue(args[1]));
      return index === -1 ? NaN : index;
    });
    this.builtins.set('str.substring', (args) => {
      const source = this.toStringValue(args[0]);
      const begin = Math.trunc((args[1] as number | undefined) ?? 0);
      const end = args[2] === undefined ? undefined : Math.trunc(args[2] as number);
      return source.substring(begin, end);
    });
    this.builtins.set('str.match', (args) => {
      const match = this.toStringValue(args[0]).match(new RegExp(this.toStringValue(args[1])));
      return match?.[0] ?? '';
    });
    this.builtins.set('str.repeat', (args) => {
      if (this.isNa(args[0])) return Number.NaN;
      const repeat = Math.trunc(this.toNumber(args[1]));
      if (!Number.isFinite(repeat) || repeat < 0) return Number.NaN;
      return Array.from({ length: repeat }, () => this.toStringValue(args[0])).join(this.toStringValue(args[2] ?? ''));
    });
    this.builtins.set('str.split', (args) => {
      const array = createPineArray<string>();
      array.values.push(...this.toStringValue(args[0]).split(this.toStringValue(args[1])));
      return array;
    });
    this.builtins.set('str.upper', (args) => this.toStringValue(args[0]).toUpperCase());
    this.builtins.set('str.lower', (args) => this.toStringValue(args[0]).toLowerCase());
    this.builtins.set('str.trim', (args) => this.toStringValue(args[0]).trim());
    this.builtins.set('str.replace', (args) => {
      return this.replaceStringOccurrence(
        this.toStringValue(args[0]),
        this.toStringValue(args[1]),
        this.toStringValue(args[2]),
        args[3],
      );
    });
    this.builtins.set('str.replace_all', (args) => {
      return this.toStringValue(args[0]).split(this.toStringValue(args[1])).join(this.toStringValue(args[2]));
    });
  }

  private registerArrayBuiltins(): void {
    const createArray = (args: unknown[]) => createPineArray(args[0] as number | undefined, args[1]);
    const readArray = (value: unknown): PineArray | unknown[] => {
      if (Array.isArray(value)) {
        return value;
      }
      if (!isPineArray(value)) {
        throw new Error('Expected array');
      }
      return value;
    };
    const readMutableArray = (value: unknown): PineArray => {
      if (!isPineArray(value)) {
        throw new Error('Expected mutable array');
      }
      return value;
    };
    const copyReadonlyArray = (value: PineArray | unknown[]): PineArray => {
      if (Array.isArray(value)) {
        const array = createPineArray(value.length);
        value.forEach((item, index) => {
          array.values[index] = item;
        });
        return array;
      }
      return value;
    };

    this.builtins.set('array.new_float', createArray);
    this.builtins.set('array.new_int', createArray);
    this.builtins.set('array.new_bool', createArray);
    this.builtins.set('array.new_string', createArray);
    this.builtins.set('array.from', (args) => {
      const array = createPineArray();
      array.values.push(...args);
      return array;
    });
    this.builtins.set('array.copy', (args) => copyArray(copyReadonlyArray(readArray(args[0]))));

    this.builtins.set('array.size', (args) => {
      const array = readArray(args[0]);
      return Array.isArray(array) ? array.length : getArraySize(array);
    });
    this.builtins.set('array.get', (args) => {
      const array = readArray(args[0]);
      return Array.isArray(array) ? array[Math.trunc(args[1] as number)] : getArrayValue(array, args[1] as number);
    });
    this.builtins.set('array.first', (args) => firstArrayValue(copyReadonlyArray(readArray(args[0]))));
    this.builtins.set('array.last', (args) => lastArrayValue(copyReadonlyArray(readArray(args[0]))));
    this.builtins.set('array.includes', (args) => includesArrayValue(copyReadonlyArray(readArray(args[0])), args[1]));
    this.builtins.set('array.indexof', (args) => indexOfArrayValue(copyReadonlyArray(readArray(args[0])), args[1]));
    this.builtins.set('array.lastindexof', (args) => lastIndexOfArrayValue(copyReadonlyArray(readArray(args[0])), args[1]));
    this.builtins.set('array.min', (args) => minArrayValue(copyReadonlyArray(readArray(args[0]))));
    this.builtins.set('array.max', (args) => maxArrayValue(copyReadonlyArray(readArray(args[0]))));
    this.builtins.set('array.sum', (args) => sumArrayValue(copyReadonlyArray(readArray(args[0]))));
    this.builtins.set('array.avg', (args) => avgArrayValue(copyReadonlyArray(readArray(args[0]))));
    this.builtins.set('array.covariance', (args) => covarianceArrayValue(
      copyReadonlyArray(readArray(args[0])),
      copyReadonlyArray(readArray(args[1])),
      args[2] === undefined ? true : this.isTruthy(args[2]),
    ));
    this.builtins.set('array.set', (args) => {
      setArrayValue(readMutableArray(args[0]), args[1] as number, args[2]);
      return null;
    });
    this.builtins.set('array.push', (args) => pushArrayValue(readMutableArray(args[0]), args[1]));
    this.builtins.set('array.pop', (args) => popArrayValue(readMutableArray(args[0])));
    this.builtins.set('array.shift', (args) => shiftArrayValue(readMutableArray(args[0])));
    this.builtins.set('array.unshift', (args) => unshiftArrayValue(readMutableArray(args[0]), args[1]));
    this.builtins.set('array.insert', (args) => insertArrayValue(readMutableArray(args[0]), args[1] as number, args[2]));
    this.builtins.set('array.remove', (args) => removeArrayValue(readMutableArray(args[0]), args[1] as number));
    this.builtins.set('array.sort', (args, namedArgs) => {
      sortArray(readMutableArray(args[0]), namedArgs.get('order') ?? args[1]);
      return null;
    });
    this.builtins.set('array.reverse', (args) => {
      reverseArray(readMutableArray(args[0]));
      return null;
    });
    this.builtins.set('array.join', (args) => joinArray(copyReadonlyArray(readArray(args[0])), args[1]));
    this.builtins.set('array.concat', (args) => concatArray(readMutableArray(args[0]), copyReadonlyArray(readArray(args[1]))));
    this.builtins.set('array.slice', (args) => sliceArray(copyReadonlyArray(readArray(args[0])), args[1] as number, args[2] as number));
    this.builtins.set('array.fill', (args) => {
      const array = readMutableArray(args[0]);
      const size = getArraySize(array);
      const from = args[2] === undefined ? 0 : Math.trunc(this.toNumber(args[2]));
      const to = args[3] === undefined ? size : Math.trunc(this.toNumber(args[3]));
      if (!Number.isFinite(from) || !Number.isFinite(to) || from < 0 || to > size || from > to) {
        throw new Error('Array fill indices are out of bounds');
      }
      for (let index = from; index < to; index++) {
        setArrayValue(array, index, args[1]);
      }
      return null;
    });
    this.builtins.set('array.clear', (args) => {
      clearArray(readMutableArray(args[0]));
      return null;
    });
  }

  private registerColorBuiltins(): void {
    // Color constants
    const colors: Record<string, string> = {
      'color.red': '#F44336',
      'color.green': '#4CAF50',
      'color.blue': '#2196F3',
      'color.orange': '#FF9800',
      'color.yellow': '#FFEB3B',
      'color.purple': '#9C27B0',
      'color.white': '#FFFFFF',
      'color.black': '#000000',
      'color.gray': '#9E9E9E',
      'color.silver': '#B2B5BE',
      'color.maroon': '#880E4F',
      'color.olive': '#808000',
      'color.lime': '#00E676',
      'color.aqua': '#00BCD4',
      'color.teal': '#009688',
      'color.navy': '#0D47A1',
      'color.fuchsia': '#E91E63',
    };

    for (const [name, value] of Object.entries(colors)) {
      this.builtins.set(name, () => value);
    }

    this.builtins.set('color.new', (args) => {
      const parsedColor = this.parseColor(args[0]);
      if (!parsedColor) {
        return args[0];
      }

      return this.formatColor(parsedColor.red, parsedColor.green, parsedColor.blue, args[1]);
    });

    this.builtins.set('color.rgb', (args, namedArgs) =>
      this.formatColor(args[0], args[1], args[2], namedArgs.get('transp') ?? namedArgs.get('transparency') ?? args[3] ?? 0),
    );

    this.builtins.set('color.r', (args) => this.parseColor(args[0])?.red ?? Number.NaN);
    this.builtins.set('color.g', (args) => this.parseColor(args[0])?.green ?? Number.NaN);
    this.builtins.set('color.b', (args) => this.parseColor(args[0])?.blue ?? Number.NaN);
    this.builtins.set('color.t', (args) => {
      const parsedColor = this.parseColor(args[0]);
      return parsedColor ? this.alphaToTransparency(parsedColor.alpha) : Number.NaN;
    });

    this.builtins.set('color.from_gradient', (args) => {
      const value = args[0];
      const bottomValue = args[1];
      const topValue = args[2];
      const bottomColor = this.parseColor(args[3]);
      const topColor = this.parseColor(args[4]);

      if (!this.isFiniteNumber(value) || !this.isFiniteNumber(bottomValue) || !this.isFiniteNumber(topValue) || !bottomColor || !topColor) {
        return Number.NaN;
      }

      const range = topValue - bottomValue;
      const ratio = range === 0 ? 0 : Math.min(1, Math.max(0, (value - bottomValue) / range));
      const interpolate = (from: number, to: number): number => from + (to - from) * ratio;
      return this.formatColor(
        interpolate(bottomColor.red, topColor.red),
        interpolate(bottomColor.green, topColor.green),
        interpolate(bottomColor.blue, topColor.blue),
        this.alphaToTransparency(interpolate(bottomColor.alpha, topColor.alpha)),
      );
    });
  }

  private registerVisualConstants(): void {
    // =========================================================================
    // Shape Constants (for plotshape)
    // =========================================================================
    const shapes: Record<string, string> = {
      'shape.triangleup': 'triangleup',
      'shape.triangledown': 'triangledown',
      'shape.circle': 'circle',
      'shape.cross': 'cross',
      'shape.diamond': 'diamond',
      'shape.arrowup': 'arrowup',
      'shape.arrowdown': 'arrowdown',
      'shape.flag': 'flag',
      'shape.labelup': 'labelup',
      'shape.labeldown': 'labeldown',
      'shape.square': 'square',
      'shape.xcross': 'xcross',
    };

    for (const [name, value] of Object.entries(shapes)) {
      this.builtins.set(name, () => value);
    }

    // =========================================================================
    // Location Constants (for plotshape, plotchar)
    // =========================================================================
    const locations: Record<string, string> = {
      'location.abovebar': 'abovebar',
      'location.belowbar': 'belowbar',
      'location.top': 'top',
      'location.bottom': 'bottom',
      'location.absolute': 'absolute',
    };

    for (const [name, value] of Object.entries(locations)) {
      this.builtins.set(name, () => value);
    }

    // =========================================================================
    // Size Constants (for plotshape, plotchar)
    // =========================================================================
    const sizes: Record<string, string> = {
      'size.tiny': 'tiny',
      'size.small': 'small',
      'size.normal': 'normal',
      'size.large': 'large',
      'size.huge': 'huge',
      'size.auto': 'auto',
    };

    for (const [name, value] of Object.entries(sizes)) {
      this.builtins.set(name, () => value);
    }

    const displayConstants: Record<string, number> = {
      'display.none': 0,
      'display.pane': 1,
      'display.data_window': 2,
      'display.status_line': 4,
      'display.price_scale': 8,
      'display.all': 15,
    };

    for (const [name, value] of Object.entries(displayConstants)) {
      this.builtins.set(name, () => value);
    }

    const formatConstants: Record<string, string> = {
      'format.inherit': 'inherit',
      'format.price': 'price',
      'format.volume': 'volume',
      'format.percent': 'percent',
    };

    for (const [name, value] of Object.entries(formatConstants)) {
      this.builtins.set(name, () => value);
    }

    const scaleConstants: Record<string, string> = {
      'scale.left': 'left',
      'scale.right': 'right',
      'scale.none': 'none',
    };

    for (const [name, value] of Object.entries(scaleConstants)) {
      this.builtins.set(name, () => value);
    }

    const orderConstants: Record<string, string> = {
      'order.ascending': 'ascending',
      'order.descending': 'descending',
    };

    for (const [name, value] of Object.entries(orderConstants)) {
      this.builtins.set(name, () => value);
    }
  }

  /**
   * Get a series accessor for a given source value.
   * Maps current bar values back to their source series.
   */
  private getSeriesForSource(source: number, ctx: ExecutionContext): { get: (offset: number) => number | undefined } {
    // Check if source matches any built-in series at offset 0
    if (source === ctx.close.get(0)) return ctx.close;
    if (source === ctx.high.get(0)) return ctx.high;
    if (source === ctx.low.get(0)) return ctx.low;
    if (source === ctx.open.get(0)) return ctx.open;
    if (source === ctx.volume.get(0)) return ctx.volume;
    // Check derived series
    if (source === ctx.hl2)
      return {
        get: (i) => {
          const h = ctx.high.get(i);
          const l = ctx.low.get(i);
          return h !== undefined && l !== undefined ? (h + l) / 2 : undefined;
        },
      };
    if (source === ctx.hlc3)
      return {
        get: (i) => {
          const h = ctx.high.get(i);
          const l = ctx.low.get(i);
          const c = ctx.close.get(i);
          return h !== undefined && l !== undefined && c !== undefined ? (h + l + c) / 3 : undefined;
        },
      };
    if (source === ctx.ohlc4)
      return {
        get: (i) => {
          const o = ctx.open.get(i);
          const h = ctx.high.get(i);
          const l = ctx.low.get(i);
          const c = ctx.close.get(i);
          return o !== undefined && h !== undefined && l !== undefined && c !== undefined
            ? (o + h + l + c) / 4
            : undefined;
        },
      };
    // Default: fallback to close (most common case)
    return ctx.close;
  }

  private registerTaBuiltins(): void {
    // SMA - Simple Moving Average
    this.builtins.set('ta.sma', (args, _namedArgs, ctx) => {
      const source = args[0] as number;
      const length = args[1] as number;

      // Get the series for the source value
      const series = this.getSeriesForSource(source, ctx);

      // Calculate SMA using history
      let sum = 0;
      let count = 0;

      for (let i = 0; i < length; i++) {
        const val = series.get(i);
        if (val !== undefined && !isNaN(val)) {
          sum += val;
          count++;
        }
      }

      if (count < length) {
        return NaN; // Not enough data
      }

      return sum / count;
    });

    // EMA - Exponential Moving Average
    this.builtins.set('ta.ema', (args, _namedArgs, ctx, scope) => {
      const source = args[0] as number;
      const length = args[1] as number;

      // Get the series for the source value
      const series = this.getSeriesForSource(source, ctx);

      const alpha = 2 / (length + 1);

      // Get previous EMA - use unique key based on source series
      const emaKey = `_ema_${length}_${source}`;
      let prevEma = scope.get(emaKey) as number | undefined;

      if (prevEma === undefined || isNaN(prevEma)) {
        // Initialize with SMA
        let sum = 0;
        let count = 0;
        for (let i = 0; i < length; i++) {
          const val = series.get(i);
          if (val !== undefined && !isNaN(val)) {
            sum += val;
            count++;
          }
        }
        prevEma = count > 0 ? sum / count : source;
      }

      const ema = alpha * source + (1 - alpha) * prevEma;

      // Store for next bar
      scope.declare(emaKey, 'var', ema);

      return ema;
    });

    // RSI - Relative Strength Index
    this.builtins.set('ta.rsi', (args, _namedArgs, ctx, scope) => {
      const source = args[0] as number;
      const length = args[1] as number;

      // Get the series for the source value
      const series = this.getSeriesForSource(source, ctx);

      // Get previous values - use unique key based on source
      const avgGainKey = `_rsi_gain_${length}_${source}`;
      const avgLossKey = `_rsi_loss_${length}_${source}`;

      const prevSource = series.get(1);
      if (prevSource === undefined) return NaN;

      const change = source - prevSource;
      const gain = change > 0 ? change : 0;
      const loss = change < 0 ? -change : 0;

      let avgGain = scope.get(avgGainKey) as number | undefined;
      let avgLoss = scope.get(avgLossKey) as number | undefined;

      if (avgGain === undefined || avgLoss === undefined) {
        // Initialize
        let totalGain = 0;
        let totalLoss = 0;

        for (let i = 0; i < length; i++) {
          const curr = series.get(i);
          const prev = series.get(i + 1);
          if (curr === undefined || prev === undefined) continue;

          const c = curr - prev;
          if (c > 0) totalGain += c;
          else totalLoss -= c;
        }

        avgGain = totalGain / length;
        avgLoss = totalLoss / length;
      } else {
        // Smoothed average
        avgGain = (avgGain * (length - 1) + gain) / length;
        avgLoss = (avgLoss * (length - 1) + loss) / length;
      }

      scope.declare(avgGainKey, 'var', avgGain);
      scope.declare(avgLossKey, 'var', avgLoss);

      if (avgLoss === 0) return 100;
      const rs = avgGain / avgLoss;
      return 100 - 100 / (1 + rs);
    });

    this.builtins.set('ta.barssince', (args, _namedArgs, _ctx, scope, callId) => {
      const condition = this.isTruthy(args[0]);
      const key = `_barssince_${callId}`;
      const previous = scope.get(key) as number | undefined;
      const value = condition ? 0 : previous === undefined || isNaN(previous) ? NaN : previous + 1;
      this.setBuiltinState(scope, key, value);
      return value;
    });

    this.builtins.set('ta.valuewhen', (args, _namedArgs, _ctx, scope, callId) => {
      const condition = this.isTruthy(args[0]);
      const source = args[1] as number;
      const occurrence = Math.max(0, Math.trunc((args[2] as number | undefined) ?? 0));
      const key = `_valuewhen_${callId}`;
      const values = (scope.get(key) as unknown[] | undefined) ?? [];

      if (condition) {
        values.unshift(source);
      }

      this.setBuiltinState(scope, key, values);
      return values[occurrence] ?? NaN;
    });

    // Change - difference from N bars ago
    this.builtins.set('ta.change', (args, _namedArgs, ctx, scope, callId) => {
      const rawSource = args[0];
      const length = Math.max(1, Math.trunc((args[1] ?? 1) as number));

      if (typeof rawSource === 'boolean') {
        const key = `_change_bool_${callId}`;
        const history = (scope.get(key) as boolean[] | undefined) ?? [];
        const previous = history[length - 1];
        this.setBuiltinState(scope, key, [rawSource, ...history].slice(0, length));
        return previous === undefined ? false : rawSource !== previous;
      }

      const source = rawSource as number;

      // Get the series for the source value
      const series = this.getSeriesForSource(source, ctx);
      const prev = series.get(length);
      if (prev === undefined) return NaN;

      return source - prev;
    });

    // Crossover - source1 crosses above source2
    // Uses scope to track previous values of both arguments
    this.builtins.set('ta.crossover', (args, _namedArgs, ctx, scope) => {
      const source1 = args[0] as number;
      const source2 = args[1] as number;

      // Try to get series for source1 (if it's a built-in series)
      const series1 = this.getSeriesForSource(source1, ctx);
      const series2 = this.getSeriesForSource(source2, ctx);

      // Get previous values
      const prev1 = series1.get(1);
      const prev2 = series2.get(1);

      // If we can't get historical values, use scope tracking
      const trackKey1 = `_cross_src1_${source1}`;
      const trackKey2 = `_cross_src2_${source2}`;

      const trackedPrev1 = prev1 ?? (scope.get(trackKey1) as number | undefined);
      const trackedPrev2 = prev2 ?? (scope.get(trackKey2) as number | undefined);

      // Store current values for next bar
      scope.declare(trackKey1, 'var', source1);
      scope.declare(trackKey2, 'var', source2);

      if (trackedPrev1 === undefined || trackedPrev2 === undefined) {
        return false; // Not enough data
      }

      // Crossover: current above, previous at or below
      return source1 > source2 && trackedPrev1 <= trackedPrev2;
    });

    // Crossunder - source1 crosses below source2
    this.builtins.set('ta.crossunder', (args, _namedArgs, ctx, scope) => {
      const source1 = args[0] as number;
      const source2 = args[1] as number;

      // Try to get series for source1 (if it's a built-in series)
      const series1 = this.getSeriesForSource(source1, ctx);
      const series2 = this.getSeriesForSource(source2, ctx);

      // Get previous values
      const prev1 = series1.get(1);
      const prev2 = series2.get(1);

      // If we can't get historical values, use scope tracking
      const trackKey1 = `_crossu_src1_${source1}`;
      const trackKey2 = `_crossu_src2_${source2}`;

      const trackedPrev1 = prev1 ?? (scope.get(trackKey1) as number | undefined);
      const trackedPrev2 = prev2 ?? (scope.get(trackKey2) as number | undefined);

      // Store current values for next bar
      scope.declare(trackKey1, 'var', source1);
      scope.declare(trackKey2, 'var', source2);

      if (trackedPrev1 === undefined || trackedPrev2 === undefined) {
        return false; // Not enough data
      }

      // Crossunder: current below, previous at or above
      return source1 < source2 && trackedPrev1 >= trackedPrev2;
    });

    this.builtins.set('ta.cross', (args, _namedArgs, ctx, scope, callId) => {
      const source1 = args[0] as number;
      const source2 = args[1] as number;
      const trackKey1 = `_cross_any_src1_${callId}`;
      const trackKey2 = `_cross_any_src2_${callId}`;
      const previous1 = scope.get(trackKey1) as number | undefined;
      const previous2 = scope.get(trackKey2) as number | undefined;

      this.setBuiltinState(scope, trackKey1, source1);
      this.setBuiltinState(scope, trackKey2, source2);

      if (previous1 === undefined || previous2 === undefined || isNaN(source1) || isNaN(source2) || isNaN(previous1) || isNaN(previous2)) {
        return false;
      }

      return (source1 > source2 && previous1 <= previous2) || (source1 < source2 && previous1 >= previous2);
    });

    // Highest - returns highest value of source over length bars
    this.builtins.set('ta.highest', (args, _namedArgs, ctx) => {
      const source = args[0] as number;
      const length = args[1] as number;

      // Get the series for the source value (defaults to high if source matches high)
      const series = this.getSeriesForSource(source, ctx);

      let highest = -Infinity;
      for (let i = 0; i < length; i++) {
        const val = series.get(i);
        if (val !== undefined && !isNaN(val) && val > highest) {
          highest = val;
        }
      }

      return highest === -Infinity ? NaN : highest;
    });

    // Lowest - returns lowest value of source over length bars
    this.builtins.set('ta.lowest', (args, _namedArgs, ctx) => {
      const source = args[0] as number;
      const length = args[1] as number;

      // Get the series for the source value (defaults to low if source matches low)
      const series = this.getSeriesForSource(source, ctx);

      let lowest = Infinity;
      for (let i = 0; i < length; i++) {
        const val = series.get(i);
        if (val !== undefined && !isNaN(val) && val < lowest) {
          lowest = val;
        }
      }

      return lowest === Infinity ? NaN : lowest;
    });

    this.builtins.set('ta.range', (args, _namedArgs, ctx) => {
      const source = args[0] as number;
      const length = args[1] as number;
      const series = this.getSeriesForSource(source, ctx);

      let highest = -Infinity;
      let lowest = Infinity;
      for (let i = 0; i < length; i++) {
        const value = series.get(i);
        if (value !== undefined && !isNaN(value)) {
          if (value > highest) highest = value;
          if (value < lowest) lowest = value;
        }
      }

      return highest === -Infinity || lowest === Infinity ? NaN : highest - lowest;
    });

    this.builtins.set('ta.rising', (args, _namedArgs, _ctx, scope, callId) => {
      const source = args[0] as number;
      const length = this.normalizeLookbackLength(args[1]);
      if (isNaN(source) || length < 1) return false;

      const key = `_ta_rising_source_${callId}`;
      const nextHistory = this.updateBuiltinSourceHistory(scope, key, source, length + 1);

      for (let i = 1; i <= length; i++) {
        const value = nextHistory[i];
        if (value === undefined || isNaN(value) || source <= value) {
          return false;
        }
      }

      return true;
    });

    this.builtins.set('ta.falling', (args, _namedArgs, _ctx, scope, callId) => {
      const source = args[0] as number;
      const length = this.normalizeLookbackLength(args[1]);
      if (isNaN(source) || length < 1) return false;

      const key = `_ta_falling_source_${callId}`;
      const nextHistory = this.updateBuiltinSourceHistory(scope, key, source, length + 1);

      for (let i = 1; i <= length; i++) {
        const value = nextHistory[i];
        if (value === undefined || isNaN(value) || source >= value) {
          return false;
        }
      }

      return true;
    });

    this.builtins.set('ta.highestbars', (args, _namedArgs, ctx) => {
      const source = args[0] as number;
      const length = args[1] as number;
      const series = this.getSeriesForSource(source, ctx);

      let highest = -Infinity;
      let offset = NaN;
      for (let i = 0; i < length; i++) {
        const val = series.get(i);
        if (val !== undefined && !isNaN(val) && val > highest) {
          highest = val;
          offset = i;
        }
      }

      return offset;
    });

    this.builtins.set('ta.lowestbars', (args, _namedArgs, ctx) => {
      const source = args[0] as number;
      const length = args[1] as number;
      const series = this.getSeriesForSource(source, ctx);

      let lowest = Infinity;
      let offset = NaN;
      for (let i = 0; i < length; i++) {
        const val = series.get(i);
        if (val !== undefined && !isNaN(val) && val < lowest) {
          lowest = val;
          offset = i;
        }
      }

      return offset;
    });

    this.builtins.set('ta.vwma', (args, _namedArgs, ctx) => {
      const source = args[0] as number;
      const length = args[1] as number;
      const series = this.getSeriesForSource(source, ctx);

      let weightedSum = 0;
      let volumeSum = 0;
      let count = 0;
      for (let i = 0; i < length; i++) {
        const value = series.get(i);
        const volume = ctx.volume.get(i);
        if (value !== undefined && volume !== undefined && !isNaN(value) && !isNaN(volume)) {
          weightedSum += value * volume;
          volumeSum += volume;
          count++;
        }
      }

      return count < length || volumeSum === 0 ? NaN : weightedSum / volumeSum;
    });

    // ATR - Average True Range
    this.builtins.set('ta.atr', (args, _namedArgs, ctx, scope) => {
      const length = args[0] as number;

      // Calculate True Range
      const high = ctx.high.get(0)!;
      const low = ctx.low.get(0)!;
      const prevClose = ctx.close.get(1);

      let tr: number;
      if (prevClose === undefined) {
        tr = high - low;
      } else {
        tr = Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose));
      }

      // Use RMA (Wilder's smoothing) for ATR
      const atrKey = `_atr_${length}`;
      let prevAtr = scope.get(atrKey) as number | undefined;

      let atr: number;
      if (prevAtr === undefined || isNaN(prevAtr)) {
        // Initialize with simple average of TR
        let sum = 0;
        for (let i = 0; i < length; i++) {
          const h = ctx.high.get(i);
          const l = ctx.low.get(i);
          const pc = ctx.close.get(i + 1);
          if (h === undefined || l === undefined) continue;

          let t = h - l;
          if (pc !== undefined) {
            t = Math.max(h - l, Math.abs(h - pc), Math.abs(l - pc));
          }
          sum += t;
        }
        atr = sum / length;
      } else {
        // Wilder's smoothing
        atr = (prevAtr * (length - 1) + tr) / length;
      }

      scope.declare(atrKey, 'var', atr);
      return atr;
    });

    // MACD - returns [macdLine, signalLine, histogram]
    this.builtins.set('ta.macd', (args, _namedArgs, ctx, scope) => {
      const source = args[0] as number;
      const fastLen = (args[1] ?? 12) as number;
      const slowLen = (args[2] ?? 26) as number;
      const signalLen = (args[3] ?? 9) as number;

      // Calculate EMAs
      const fastAlpha = 2 / (fastLen + 1);
      const slowAlpha = 2 / (slowLen + 1);
      const signalAlpha = 2 / (signalLen + 1);

      const fastKey = `_macd_fast_${fastLen}`;
      const slowKey = `_macd_slow_${slowLen}`;
      const signalKey = `_macd_signal_${signalLen}`;

      let fastEma = (scope.get(fastKey) as number) ?? source;
      let slowEma = (scope.get(slowKey) as number) ?? source;

      fastEma = fastAlpha * source + (1 - fastAlpha) * fastEma;
      slowEma = slowAlpha * source + (1 - slowAlpha) * slowEma;

      const macdLine = fastEma - slowEma;

      let signalLine = (scope.get(signalKey) as number) ?? macdLine;
      signalLine = signalAlpha * macdLine + (1 - signalAlpha) * signalLine;

      const histogram = macdLine - signalLine;

      scope.declare(fastKey, 'var', fastEma);
      scope.declare(slowKey, 'var', slowEma);
      scope.declare(signalKey, 'var', signalLine);

      return [macdLine, signalLine, histogram];
    });

    // STDEV - Standard Deviation
    this.builtins.set('ta.stdev', (args, _namedArgs, ctx) => {
      const source = args[0] as number;
      const length = args[1] as number;

      // Get the series for the source value
      const series = this.getSeriesForSource(source, ctx);

      // Collect values
      const values: number[] = [];
      for (let i = 0; i < length; i++) {
        const val = series.get(i);
        if (val !== undefined && !isNaN(val)) {
          values.push(val);
        }
      }

      if (values.length < length) {
        return NaN; // Not enough data
      }

      // Calculate mean
      const mean = values.reduce((a, b) => a + b, 0) / values.length;

      // Calculate variance (population standard deviation)
      const squaredDiffs = values.map((v) => Math.pow(v - mean, 2));
      const variance = squaredDiffs.reduce((a, b) => a + b, 0) / values.length;

      return Math.sqrt(variance);
    });

    this.builtins.set('ta.variance', (args, _namedArgs, ctx) => {
      const source = args[0] as number;
      const length = args[1] as number;
      const series = this.getSeriesForSource(source, ctx);

      const values: number[] = [];
      for (let i = 0; i < length; i++) {
        const value = series.get(i);
        if (value !== undefined && !isNaN(value)) {
          values.push(value);
        }
      }

      if (values.length < length) return NaN;

      const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
      return values.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) / values.length;
    });

    this.builtins.set('ta.dev', (args, _namedArgs, ctx) => {
      const source = args[0] as number;
      const length = args[1] as number;
      const series = this.getSeriesForSource(source, ctx);

      const values: number[] = [];
      for (let i = 0; i < length; i++) {
        const value = series.get(i);
        if (value !== undefined && !isNaN(value)) {
          values.push(value);
        }
      }

      if (values.length < length) return NaN;

      const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
      return values.reduce((sum, value) => sum + Math.abs(value - mean), 0) / values.length;
    });

    this.builtins.set('ta.correlation', (args, _namedArgs, _ctx, scope, callId) => {
      const sourceA = args[0] as number;
      const sourceB = args[1] as number;
      const length = this.normalizeLookbackLength(args[2]);
      const windows = this.getCompletePairedSourceWindows(
        scope,
        `_ta_correlation_source_a_${callId}`,
        `_ta_correlation_source_b_${callId}`,
        sourceA,
        sourceB,
        length,
      );
      if (!windows) return NaN;

      const [leftValues, rightValues] = windows;
      const leftMean = leftValues.reduce((sum, value) => sum + value, 0) / length;
      const rightMean = rightValues.reduce((sum, value) => sum + value, 0) / length;
      let covariance = 0;
      let leftVariance = 0;
      let rightVariance = 0;

      for (let index = 0; index < length; index++) {
        const leftDelta = leftValues[index] - leftMean;
        const rightDelta = rightValues[index] - rightMean;
        covariance += leftDelta * rightDelta;
        leftVariance += leftDelta ** 2;
        rightVariance += rightDelta ** 2;
      }

      const denominator = Math.sqrt(leftVariance * rightVariance);
      return denominator === 0 ? NaN : covariance / denominator;
    });

    this.builtins.set('ta.cog', (args, _namedArgs, _ctx, scope, callId) => {
      const source = args[0] as number;
      const length = this.normalizeLookbackLength(args[1]);
      const values = this.getCompleteSourceWindow(scope, `_ta_cog_source_${callId}`, source, length);
      if (!values) return NaN;

      const sum = values.reduce((total, value) => total + value, 0);
      if (sum === 0) return NaN;

      const weighted = values.reduce((total, value, index) => total + value * (index + 1), 0);
      return -weighted / sum;
    });

    this.builtins.set('ta.median', (args, _namedArgs, _ctx, scope, callId) => {
      const source = args[0] as number;
      const length = this.normalizeLookbackLength(args[1]);
      const values = this.getCompleteSourceWindow(scope, `_ta_median_source_${callId}`, source, length);
      if (!values) return NaN;

      const sorted = [...values].sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
    });

    this.builtins.set('ta.mode', (args, _namedArgs, _ctx, scope, callId) => {
      const source = args[0] as number;
      const length = this.normalizeLookbackLength(args[1]);
      const values = this.getCompleteSourceWindow(scope, `_ta_mode_source_${callId}`, source, length);
      if (!values) return NaN;

      const counts = new Map<number, number>();
      for (const value of values) {
        counts.set(value, (counts.get(value) ?? 0) + 1);
      }

      let mode = values[0];
      let modeCount = counts.get(mode) ?? 0;
      for (const [value, count] of counts) {
        if (count > modeCount || (count === modeCount && value < mode)) {
          mode = value;
          modeCount = count;
        }
      }
      return mode;
    });

    this.builtins.set('ta.percentile_nearest_rank', (args, _namedArgs, _ctx, scope, callId) => {
      const source = args[0] as number;
      const length = this.normalizeLookbackLength(args[1]);
      const percentage = Math.min(100, Math.max(0, this.toNumber(args[2])));
      const values = this.getCompleteSourceWindow(scope, `_ta_percentile_nearest_source_${callId}`, source, length);
      if (!values || isNaN(percentage)) return NaN;

      const sorted = [...values].sort((a, b) => a - b);
      const rank = Math.max(1, Math.ceil((percentage / 100) * sorted.length));
      return sorted[rank - 1];
    });

    this.builtins.set('ta.percentile_linear_interpolation', (args, _namedArgs, _ctx, scope, callId) => {
      const source = args[0] as number;
      const length = this.normalizeLookbackLength(args[1]);
      const percentage = Math.min(100, Math.max(0, this.toNumber(args[2])));
      const values = this.getCompleteSourceWindow(scope, `_ta_percentile_linear_source_${callId}`, source, length);
      if (!values || isNaN(percentage)) return NaN;

      const sorted = [...values].sort((a, b) => a - b);
      const rank = (percentage / 100) * (sorted.length - 1);
      const lower = Math.floor(rank);
      const upper = Math.ceil(rank);
      if (lower === upper) return sorted[lower];

      const fraction = rank - lower;
      return sorted[lower] + (sorted[upper] - sorted[lower]) * fraction;
    });

    this.builtins.set('ta.percentrank', (args, _namedArgs, _ctx, scope, callId) => {
      const source = args[0] as number;
      const length = this.normalizeLookbackLength(args[1]);
      const values = this.getCompleteSourceWindow(scope, `_ta_percentrank_source_${callId}`, source, length);
      if (!values) return NaN;

      const belowOrEqual = values.filter((value) => value <= source).length;
      return (belowOrEqual / values.length) * 100;
    });

    this.builtins.set('ta.cum', (args, _namedArgs, _ctx, scope, callId) => {
      const source = args[0] as number;
      if (isNaN(source)) return NaN;

      const key = `_ta_cum_${callId}`;
      const previous = (scope.get(key) as number | undefined) ?? 0;
      const total = previous + source;
      this.setBuiltinState(scope, key, total);
      return total;
    });

    // VWAP - Volume Weighted Average Price
    // Note: Simplified version - doesn't reset at session boundaries
    this.builtins.set('ta.vwap', (_args, _namedArgs, ctx, scope) => {
      // VWAP = Σ(Typical Price × Volume) / Σ(Volume)
      // Typical Price = (High + Low + Close) / 3

      const high = ctx.high.get(0)!;
      const low = ctx.low.get(0)!;
      const close = ctx.close.get(0)!;
      const volume = ctx.volume.get(0)!;

      const typicalPrice = (high + low + close) / 3;
      const tpv = typicalPrice * volume;

      // Get cumulative values from scope
      const cumTpvKey = '_vwap_cum_tpv';
      const cumVolKey = '_vwap_cum_vol';

      const prevCumTpv = (scope.get(cumTpvKey) as number) ?? 0;
      const prevCumVol = (scope.get(cumVolKey) as number) ?? 0;

      const cumTpv = prevCumTpv + tpv;
      const cumVol = prevCumVol + volume;

      scope.declare(cumTpvKey, 'var', cumTpv);
      scope.declare(cumVolKey, 'var', cumVol);

      return cumVol > 0 ? cumTpv / cumVol : NaN;
    });

    this.builtins.set('ta.stoch', (args, _namedArgs, _ctx, scope, callId) => {
      const source = args[0] as number;
      const highSource = args[1] as number;
      const lowSource = args[2] as number;
      const length = this.normalizeLookbackLength(args[3] ?? 14);
      const windows = this.getCompletePairedSourceWindows(
        scope,
        `_ta_stoch_high_${callId}`,
        `_ta_stoch_low_${callId}`,
        highSource,
        lowSource,
        length,
      );
      if (isNaN(source) || !windows) return NaN;

      const [highValues, lowValues] = windows;
      const highestHigh = Math.max(...highValues);
      const lowestLow = Math.min(...lowValues);
      const range = highestHigh - lowestLow;
      return range === 0 ? NaN : ((source - lowestLow) / range) * 100;
    });

    this.builtins.set('ta.mfi', (args, _namedArgs, ctx, scope, callId) => {
      const source = args[0] as number;
      const length = this.normalizeLookbackLength(args[1] ?? 14);
      const volume = ctx.volume.get(0);
      const sourceKey = `_ta_mfi_source_${callId}`;
      const positiveKey = `_ta_mfi_positive_${callId}`;
      const negativeKey = `_ta_mfi_negative_${callId}`;
      const sourceHistory = (scope.get(sourceKey) as number[] | undefined) ?? [];
      const previousSource = sourceHistory[0];
      this.setBuiltinState(scope, sourceKey, [source, ...sourceHistory].slice(0, length + 1));

      if (length < 1 || isNaN(source) || volume === undefined || isNaN(volume)) return NaN;

      let positiveFlow = 0;
      let negativeFlow = 0;
      if (previousSource !== undefined && !isNaN(previousSource)) {
        const rawFlow = source * volume;
        if (source > previousSource) positiveFlow = rawFlow;
        if (source < previousSource) negativeFlow = rawFlow;
      }

      const positiveFlows = this.updateBuiltinSourceHistory(scope, positiveKey, positiveFlow, length);
      const negativeFlows = this.updateBuiltinSourceHistory(scope, negativeKey, negativeFlow, length);
      if (positiveFlows.length < length || negativeFlows.length < length) return NaN;

      const positiveSum = positiveFlows.reduce((sum, value) => sum + value, 0);
      const negativeSum = negativeFlows.reduce((sum, value) => sum + value, 0);
      if (negativeSum === 0) return positiveSum === 0 ? 50 : 100;
      if (positiveSum === 0) return 0;
      return 100 - 100 / (1 + positiveSum / negativeSum);
    });

    this.builtins.set('ta.wpr', (args, _namedArgs, ctx) => {
      const length = this.normalizeLookbackLength(args[0] ?? 14);
      const close = ctx.close.get(0);
      if (length < 1 || close === undefined || isNaN(close)) return NaN;

      let highestHigh = -Infinity;
      let lowestLow = Infinity;
      for (let offset = 0; offset < length; offset++) {
        const high = ctx.high.get(offset);
        const low = ctx.low.get(offset);
        if (high === undefined || low === undefined || isNaN(high) || isNaN(low)) return NaN;
        if (high > highestHigh) highestHigh = high;
        if (low < lowestLow) lowestLow = low;
      }

      const range = highestHigh - lowestLow;
      return range === 0 ? NaN : ((close - highestHigh) / range) * 100;
    });

    this.builtins.set('ta.cmo', (args, _namedArgs, _ctx, scope, callId) => {
      const source = args[0] as number;
      const length = this.normalizeLookbackLength(args[1] ?? 14);
      const values = this.getCompleteSourceWindow(scope, `_ta_cmo_source_${callId}`, source, length + 1);
      if (!values) return NaN;

      let gains = 0;
      let losses = 0;
      for (let index = 0; index < length; index++) {
        const change = values[index] - values[index + 1];
        if (change > 0) gains += change;
        if (change < 0) losses -= change;
      }

      const total = gains + losses;
      return total === 0 ? 0 : ((gains - losses) / total) * 100;
    });

    this.builtins.set('ta.tsi', (args, _namedArgs, _ctx, scope, callId) => {
      const source = args[0] as number;
      const shortLength = this.normalizeLookbackLength(args[1]);
      const longLength = this.normalizeLookbackLength(args[2]);
      if (isNaN(source) || shortLength < 1 || longLength < 1) return NaN;

      const sourceKey = `_ta_tsi_source_${callId}`;
      const sourceHistory = (scope.get(sourceKey) as number[] | undefined) ?? [];
      const previousSource = sourceHistory[0];
      this.setBuiltinState(scope, sourceKey, [source, ...sourceHistory].slice(0, 2));

      if (previousSource === undefined || isNaN(previousSource)) return NaN;

      const momentum = source - previousSource;
      const absMomentum = Math.abs(momentum);
      const longAlpha = 2 / (longLength + 1);
      const shortAlpha = 2 / (shortLength + 1);

      const ema = (key: string, value: number, alpha: number): number => {
        const previous = scope.get(key) as number | undefined;
        const next = previous === undefined || isNaN(previous) ? value : alpha * value + (1 - alpha) * previous;
        this.setBuiltinState(scope, key, next);
        return next;
      };

      const baseKey = `_ta_tsi_${callId}_${shortLength}_${longLength}`;
      const smoothedMomentum = ema(`${baseKey}_momentum_long`, momentum, longAlpha);
      const smoothedAbsMomentum = ema(`${baseKey}_abs_long`, absMomentum, longAlpha);
      const doubleSmoothedMomentum = ema(`${baseKey}_momentum_short`, smoothedMomentum, shortAlpha);
      const doubleSmoothedAbsMomentum = ema(`${baseKey}_abs_short`, smoothedAbsMomentum, shortAlpha);

      return doubleSmoothedAbsMomentum === 0 ? 0 : doubleSmoothedMomentum / doubleSmoothedAbsMomentum;
    });

    // MOM - Momentum
    this.builtins.set('ta.mom', (args, _namedArgs, ctx) => {
      const source = args[0] as number;
      const length = (args[1] ?? 10) as number;

      // Get the series for the source value
      const series = this.getSeriesForSource(source, ctx);
      const prev = series.get(length);

      if (prev === undefined) return NaN;

      // Momentum = Current - Previous (length bars ago)
      return source - prev;
    });

    this.builtins.set('ta.cci', (args, _namedArgs, _ctx, scope, callId) => {
      const source = args[0] as number;
      const length = this.normalizeLookbackLength(args[1] ?? 20);
      const values = this.getCompleteSourceWindow(scope, `_ta_cci_source_${callId}`, source, length);
      if (!values) return NaN;

      const basis = values.reduce((sum, value) => sum + value, 0) / length;
      const meanDeviation = values.reduce((sum, value) => sum + Math.abs(value - basis), 0) / length;
      return meanDeviation === 0 ? 0 : (source - basis) / (0.015 * meanDeviation);
    });

    // OBV - On-Balance Volume
    this.builtins.set('ta.obv', (_args, _namedArgs, ctx, scope) => {
      const close = ctx.close.get(0)!;
      const prevClose = ctx.close.get(1);
      const volume = ctx.volume.get(0)!;

      const obvKey = '_obv_value';
      let obv = (scope.get(obvKey) as number) ?? 0;

      if (prevClose !== undefined) {
        if (close > prevClose) {
          obv += volume;
        } else if (close < prevClose) {
          obv -= volume;
        }
        // If close == prevClose, OBV stays the same
      }

      scope.declare(obvKey, 'var', obv);
      return obv;
    });

    // =========================================================================
    // Phase 1: Additional TA Functions
    // =========================================================================

    // RMA - Wilder's Smoothed Moving Average (also known as SMMA)
    // Formula: alpha = 1/length, rma = alpha * source + (1 - alpha) * prev_rma
    this.builtins.set('ta.rma', (args, _namedArgs, ctx, scope) => {
      const source = args[0] as number;
      const length = args[1] as number;

      const series = this.getSeriesForSource(source, ctx);
      const alpha = 1 / length;

      const rmaKey = `_rma_${length}_${source}`;
      let prevRma = scope.get(rmaKey) as number | undefined;

      if (prevRma === undefined || isNaN(prevRma)) {
        // Initialize with SMA
        let sum = 0;
        let count = 0;
        for (let i = 0; i < length; i++) {
          const val = series.get(i);
          if (val !== undefined && !isNaN(val)) {
            sum += val;
            count++;
          }
        }
        prevRma = count > 0 ? sum / count : source;
      }

      const rma = alpha * source + (1 - alpha) * prevRma;
      scope.declare(rmaKey, 'var', rma);

      return rma;
    });

    // WMA - Weighted Moving Average
    // Formula: wma = sum(source[i] * weight[i]) / sum(weights) where weight = length - i
    this.builtins.set('ta.wma', (args, _namedArgs, ctx) => {
      const source = args[0] as number;
      const length = args[1] as number;

      const series = this.getSeriesForSource(source, ctx);

      let weightedSum = 0;
      let weightSum = 0;

      for (let i = 0; i < length; i++) {
        const val = series.get(i);
        if (val === undefined || isNaN(val)) return NaN;

        const weight = length - i; // Most recent has highest weight
        weightedSum += val * weight;
        weightSum += weight;
      }

      return weightedSum / weightSum;
    });

    this.builtins.set('ta.swma', (args, _namedArgs, _ctx, scope, callId) => {
      const source = args[0] as number;
      const values = this.getCompleteSourceWindow(scope, `_ta_swma_source_${callId}`, source, 4);
      if (!values) return NaN;

      return (values[0] + values[1] * 2 + values[2] * 2 + values[3]) / 6;
    });

    this.builtins.set('ta.alma', (args, _namedArgs, _ctx, scope, callId) => {
      const source = args[0] as number;
      const length = this.normalizeLookbackLength(args[1]);
      const offset = this.toNumber(args[2]);
      const sigma = this.toNumber(args[3]);
      const useFlooredOffset = this.isTruthy(args[4]);
      const values = this.getCompleteSourceWindow(scope, `_ta_alma_source_${callId}`, source, length);
      if (!values || isNaN(offset) || !Number.isFinite(sigma) || sigma === 0) return NaN;

      const m = useFlooredOffset ? Math.floor(offset * (length - 1)) : offset * (length - 1);
      const s = length / sigma;
      let weightedSum = 0;
      let weightSum = 0;

      for (let i = 0; i < length; i++) {
        const weight = Math.exp(-Math.pow(i - m, 2) / (2 * s * s));
        weightedSum += values[length - 1 - i] * weight;
        weightSum += weight;
      }

      return weightSum === 0 ? NaN : weightedSum / weightSum;
    });

    // HMA - Hull Moving Average
    // Formula: wma(2 * wma(src, len/2) - wma(src, len), sqrt(len))
    this.builtins.set('ta.hma', (args, _namedArgs, ctx, scope) => {
      const source = args[0] as number;
      const length = args[1] as number;

      const series = this.getSeriesForSource(source, ctx);

      // Helper to calculate WMA
      const calcWma = (len: number, offset: number = 0): number => {
        let weightedSum = 0;
        let weightSum = 0;

        for (let i = 0; i < len; i++) {
          const val = series.get(i + offset);
          if (val === undefined || isNaN(val)) return NaN;

          const weight = len - i;
          weightedSum += val * weight;
          weightSum += weight;
        }

        return weightedSum / weightSum;
      };

      const halfLen = Math.floor(length / 2);
      const sqrtLen = Math.round(Math.sqrt(length));

      // Calculate WMA(src, len/2) and WMA(src, len) for current and past bars
      const hmaRawKey = `_hma_raw_${length}`;
      let hmaRawHistory = (scope.get(hmaRawKey) as number[]) ?? [];

      const wmaHalf = calcWma(halfLen);
      const wmaFull = calcWma(length);

      if (isNaN(wmaHalf) || isNaN(wmaFull)) return NaN;

      const rawHma = 2 * wmaHalf - wmaFull;

      hmaRawHistory.push(rawHma);
      if (hmaRawHistory.length > sqrtLen) hmaRawHistory.shift();
      scope.declare(hmaRawKey, 'var', hmaRawHistory);

      // WMA of the raw values
      if (hmaRawHistory.length < sqrtLen) return NaN;

      let weightedSum = 0;
      let weightSum = 0;
      for (let i = 0; i < sqrtLen; i++) {
        const idx = hmaRawHistory.length - 1 - i;
        const weight = sqrtLen - i;
        weightedSum += hmaRawHistory[idx] * weight;
        weightSum += weight;
      }

      return weightedSum / weightSum;
    });

    // BB - Bollinger Bands
    // Returns [middle, upper, lower]
    this.builtins.set('ta.bb', (args, _namedArgs, ctx) => {
      const source = args[0] as number;
      const length = args[1] as number;
      const mult = (args[2] ?? 2.0) as number;

      const series = this.getSeriesForSource(source, ctx);

      // Calculate SMA (middle)
      let sum = 0;
      const values: number[] = [];
      for (let i = 0; i < length; i++) {
        const val = series.get(i);
        if (val === undefined || isNaN(val)) return [NaN, NaN, NaN];
        sum += val;
        values.push(val);
      }

      const middle = sum / length;

      // Calculate standard deviation
      const squaredDiffs = values.map((v) => Math.pow(v - middle, 2));
      const variance = squaredDiffs.reduce((a, b) => a + b, 0) / length;
      const stdev = Math.sqrt(variance);

      const upper = middle + mult * stdev;
      const lower = middle - mult * stdev;

      return [middle, upper, lower];
    });

    // ROC - Rate of Change (percentage)
    // Formula: (current - previous) / previous * 100
    this.builtins.set('ta.roc', (args, _namedArgs, ctx) => {
      const source = args[0] as number;
      const length = (args[1] ?? 1) as number;

      const series = this.getSeriesForSource(source, ctx);
      const prev = series.get(length);

      if (prev === undefined || prev === 0) return NaN;

      return ((source - prev) / prev) * 100;
    });

    // TR - True Range (as a function, can also be accessed as variable)
    this.builtins.set('ta.tr', (_args, _namedArgs, ctx) => {
      const high = ctx.high.get(0)!;
      const low = ctx.low.get(0)!;
      const prevClose = ctx.close.get(1);

      if (prevClose === undefined) {
        return high - low;
      }

      return Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose));
    });

    // SuperTrend - ATR-based trend indicator
    // Returns [supertrend value, direction (1 = up, -1 = down)]
    this.builtins.set('ta.supertrend', (args, _namedArgs, ctx, scope) => {
      const factor = (args[0] ?? 3.0) as number;
      const atrLength = (args[1] ?? 10) as number;

      const high = ctx.high.get(0)!;
      const low = ctx.low.get(0)!;
      const close = ctx.close.get(0)!;

      // Calculate ATR using RMA
      const prevClose = ctx.close.get(1);
      let tr: number;
      if (prevClose === undefined) {
        tr = high - low;
      } else {
        tr = Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose));
      }

      const atrKey = `_st_atr_${atrLength}`;
      let atr = scope.get(atrKey) as number | undefined;

      if (atr === undefined || isNaN(atr)) {
        // Initialize with simple average
        let sum = 0;
        for (let i = 0; i < atrLength; i++) {
          const h = ctx.high.get(i);
          const l = ctx.low.get(i);
          const pc = ctx.close.get(i + 1);
          if (h === undefined || l === undefined) continue;
          let t = h - l;
          if (pc !== undefined) {
            t = Math.max(h - l, Math.abs(h - pc), Math.abs(l - pc));
          }
          sum += t;
        }
        atr = sum / atrLength;
      } else {
        atr = (atr * (atrLength - 1) + tr) / atrLength;
      }
      scope.declare(atrKey, 'var', atr);

      // Calculate basic upper and lower bands
      const hl2 = (high + low) / 2;
      const basicUpperBand = hl2 + factor * atr;
      const basicLowerBand = hl2 - factor * atr;

      // Get previous values
      const prevUpperKey = `_st_upper_${factor}_${atrLength}`;
      const prevLowerKey = `_st_lower_${factor}_${atrLength}`;
      const prevDirKey = `_st_dir_${factor}_${atrLength}`;

      let prevUpper = scope.get(prevUpperKey) as number | undefined;
      let prevLower = scope.get(prevLowerKey) as number | undefined;
      let prevDir = scope.get(prevDirKey) as number | undefined;
      const prevCloseVal = ctx.close.get(1);

      // Final upper band
      let finalUpperBand: number;
      if (prevUpper === undefined || prevCloseVal === undefined) {
        finalUpperBand = basicUpperBand;
      } else {
        finalUpperBand = basicUpperBand < prevUpper || prevCloseVal > prevUpper ? basicUpperBand : prevUpper;
      }

      // Final lower band
      let finalLowerBand: number;
      if (prevLower === undefined || prevCloseVal === undefined) {
        finalLowerBand = basicLowerBand;
      } else {
        finalLowerBand = basicLowerBand > prevLower || prevCloseVal < prevLower ? basicLowerBand : prevLower;
      }

      // Determine direction
      let direction: number;
      if (prevDir === undefined) {
        direction = close > finalUpperBand ? 1 : -1;
      } else {
        if (prevDir === -1 && close > finalUpperBand) {
          direction = 1;
        } else if (prevDir === 1 && close < finalLowerBand) {
          direction = -1;
        } else {
          direction = prevDir;
        }
      }

      // SuperTrend value
      const supertrend = direction === 1 ? finalLowerBand : finalUpperBand;

      scope.declare(prevUpperKey, 'var', finalUpperBand);
      scope.declare(prevLowerKey, 'var', finalLowerBand);
      scope.declare(prevDirKey, 'var', direction);

      return [supertrend, direction];
    });

    // DMI - Directional Movement Index
    // Returns [diPlus, diMinus, adx]
    this.builtins.set('ta.dmi', (args, _namedArgs, ctx, scope) => {
      const length = (args[0] ?? 14) as number;
      const adxSmoothing = (args[1] ?? 14) as number;

      const high = ctx.high.get(0)!;
      const low = ctx.low.get(0)!;
      const prevHigh = ctx.high.get(1);
      const prevLow = ctx.low.get(1);
      const prevClose = ctx.close.get(1);

      // Calculate True Range
      let tr: number;
      if (prevClose === undefined) {
        tr = high - low;
      } else {
        tr = Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose));
      }

      // Calculate +DM and -DM
      let plusDM = 0;
      let minusDM = 0;

      if (prevHigh !== undefined && prevLow !== undefined) {
        const upMove = high - prevHigh;
        const downMove = prevLow - low;

        if (upMove > downMove && upMove > 0) {
          plusDM = upMove;
        }
        if (downMove > upMove && downMove > 0) {
          minusDM = downMove;
        }
      }

      // Smooth with RMA (Wilder's smoothing)
      const alpha = 1 / length;

      const smoothTrKey = `_dmi_tr_${length}`;
      const smoothPlusDmKey = `_dmi_plusdm_${length}`;
      const smoothMinusDmKey = `_dmi_minusdm_${length}`;
      const smoothAdxKey = `_dmi_adx_${length}_${adxSmoothing}`;

      let smoothTr = (scope.get(smoothTrKey) as number) ?? tr;
      let smoothPlusDm = (scope.get(smoothPlusDmKey) as number) ?? plusDM;
      let smoothMinusDm = (scope.get(smoothMinusDmKey) as number) ?? minusDM;

      smoothTr = alpha * tr + (1 - alpha) * smoothTr;
      smoothPlusDm = alpha * plusDM + (1 - alpha) * smoothPlusDm;
      smoothMinusDm = alpha * minusDM + (1 - alpha) * smoothMinusDm;

      scope.declare(smoothTrKey, 'var', smoothTr);
      scope.declare(smoothPlusDmKey, 'var', smoothPlusDm);
      scope.declare(smoothMinusDmKey, 'var', smoothMinusDm);

      // Calculate DI+ and DI-
      const diPlus = smoothTr > 0 ? (smoothPlusDm / smoothTr) * 100 : 0;
      const diMinus = smoothTr > 0 ? (smoothMinusDm / smoothTr) * 100 : 0;

      // Calculate DX and smooth to get ADX
      const diSum = diPlus + diMinus;
      const dx = diSum > 0 ? (Math.abs(diPlus - diMinus) / diSum) * 100 : 0;

      let adx = (scope.get(smoothAdxKey) as number) ?? dx;
      const adxAlpha = 1 / adxSmoothing;
      adx = adxAlpha * dx + (1 - adxAlpha) * adx;
      scope.declare(smoothAdxKey, 'var', adx);

      return [diPlus, diMinus, adx];
    });

    // SAR - Parabolic Stop and Reverse
    this.builtins.set('ta.sar', (args, _namedArgs, ctx, scope) => {
      const start = (args[0] ?? 0.02) as number;
      const increment = (args[1] ?? 0.02) as number;
      const maximum = (args[2] ?? 0.2) as number;

      const high = ctx.high.get(0)!;
      const low = ctx.low.get(0)!;

      const sarKey = '_sar_value';
      const epKey = '_sar_ep'; // Extreme Point
      const afKey = '_sar_af'; // Acceleration Factor
      const trendKey = '_sar_trend'; // 1 = up, -1 = down

      let sar = scope.get(sarKey) as number | undefined;
      let ep = scope.get(epKey) as number | undefined;
      let af = scope.get(afKey) as number | undefined;
      let trend = scope.get(trendKey) as number | undefined;

      if (sar === undefined || ep === undefined || af === undefined || trend === undefined) {
        // Initialize - start with downtrend assumption
        sar = high;
        ep = low;
        af = start;
        trend = -1;
      } else {
        // Calculate new SAR
        sar = sar + af * (ep - sar);

        if (trend === 1) {
          // Uptrend
          // SAR can't be above prior two lows
          const prevLow1 = ctx.low.get(1);
          const prevLow2 = ctx.low.get(2);
          if (prevLow1 !== undefined) sar = Math.min(sar, prevLow1);
          if (prevLow2 !== undefined) sar = Math.min(sar, prevLow2);

          if (low < sar) {
            // Trend reversal
            trend = -1;
            sar = ep;
            ep = low;
            af = start;
          } else {
            if (high > ep) {
              ep = high;
              af = Math.min(af + increment, maximum);
            }
          }
        } else {
          // Downtrend
          // SAR can't be below prior two highs
          const prevHigh1 = ctx.high.get(1);
          const prevHigh2 = ctx.high.get(2);
          if (prevHigh1 !== undefined) sar = Math.max(sar, prevHigh1);
          if (prevHigh2 !== undefined) sar = Math.max(sar, prevHigh2);

          if (high > sar) {
            // Trend reversal
            trend = 1;
            sar = ep;
            ep = high;
            af = start;
          } else {
            if (low < ep) {
              ep = low;
              af = Math.min(af + increment, maximum);
            }
          }
        }
      }

      scope.declare(sarKey, 'var', sar);
      scope.declare(epKey, 'var', ep);
      scope.declare(afKey, 'var', af);
      scope.declare(trendKey, 'var', trend);

      return sar;
    });

    // PivotHigh - Detect pivot highs
    // Returns the pivot high price or na
    this.builtins.set('ta.pivothigh', (args, _namedArgs, ctx) => {
      const source = args[0] as number;
      const leftBars = (args[1] ?? 5) as number;
      const rightBars = (args[2] ?? 5) as number;

      const series = this.getSeriesForSource(source, ctx);

      // We need rightBars of data after the potential pivot
      // The pivot would be at offset = rightBars
      const pivotValue = series.get(rightBars);
      if (pivotValue === undefined) return NaN;

      // Check left side (bars before the pivot, at higher offsets)
      for (let i = 1; i <= leftBars; i++) {
        const val = series.get(rightBars + i);
        if (val === undefined || val >= pivotValue) return NaN;
      }

      // Check right side (bars after the pivot, at lower offsets)
      for (let i = 1; i <= rightBars; i++) {
        const val = series.get(rightBars - i);
        if (val === undefined || val >= pivotValue) return NaN;
      }

      return pivotValue;
    });

    // PivotLow - Detect pivot lows
    // Returns the pivot low price or na
    this.builtins.set('ta.pivotlow', (args, _namedArgs, ctx) => {
      const source = args[0] as number;
      const leftBars = (args[1] ?? 5) as number;
      const rightBars = (args[2] ?? 5) as number;

      const series = this.getSeriesForSource(source, ctx);

      // The pivot would be at offset = rightBars
      const pivotValue = series.get(rightBars);
      if (pivotValue === undefined) return NaN;

      // Check left side (bars before the pivot, at higher offsets)
      for (let i = 1; i <= leftBars; i++) {
        const val = series.get(rightBars + i);
        if (val === undefined || val <= pivotValue) return NaN;
      }

      // Check right side (bars after the pivot, at lower offsets)
      for (let i = 1; i <= rightBars; i++) {
        const val = series.get(rightBars - i);
        if (val === undefined || val <= pivotValue) return NaN;
      }

      return pivotValue;
    });

    this.builtins.set('ta.linreg', (args, _namedArgs, _ctx, scope, callId) => {
      const source = args[0] as number;
      const length = this.normalizeLookbackLength(args[1]);
      const offset = this.toNumber(args[2] ?? 0);
      const values = this.getCompleteSourceWindow(scope, `_ta_linreg_source_${callId}`, source, length);
      if (!values || isNaN(offset)) return NaN;

      const n = length;
      let sumX = 0;
      let sumY = 0;
      let sumXY = 0;
      let sumX2 = 0;

      for (let i = 0; i < n; i++) {
        const x = i;
        const y = values[n - 1 - i];
        sumX += x;
        sumY += y;
        sumXY += x * y;
        sumX2 += x * x;
      }

      const denominator = n * sumX2 - sumX * sumX;
      if (denominator === 0) return NaN;

      const slope = (n * sumXY - sumX * sumY) / denominator;
      const intercept = (sumY - slope * sumX) / n;

      return intercept + slope * (length - 1 - offset);
    });
  }

  private registerTimeBuiltins(): void {
    this.builtins.set('timestamp', (args) => this.evaluateTimestamp(args));
    this.builtins.set('time', (args) => this.evaluateTimeFilter(args, false));
    this.builtins.set('time_close', (args) => this.evaluateTimeFilter(args, true));
    this.builtins.set('timeframe.in_seconds', (args) => {
      const timeframe = args[0] === undefined || args[0] === '' ? this.ctx.timeframe.period : this.toStringValue(args[0]);
      const duration = this.getTimeframeDurationMs(timeframe);
      return duration === null ? Number.NaN : duration / 1000;
    });

    for (const part of ['year', 'month', 'weekofyear', 'dayofmonth', 'dayofweek', 'hour', 'minute', 'second']) {
      this.builtins.set(part, (args) => {
        const timestamp = args[0] === undefined ? this.ctx.time.get(0) : this.toNumber(args[0]);
        const timezone = args[1] === undefined ? this.ctx.syminfo.timezone : this.toStringValue(args[1]);
        return this.getCalendarPart(part, timestamp, timezone);
      });
    }

    this.builtins.set('dayofweek.sunday', () => 1);
    this.builtins.set('dayofweek.monday', () => 2);
    this.builtins.set('dayofweek.tuesday', () => 3);
    this.builtins.set('dayofweek.wednesday', () => 4);
    this.builtins.set('dayofweek.thursday', () => 5);
    this.builtins.set('dayofweek.friday', () => 6);
    this.builtins.set('dayofweek.saturday', () => 7);
  }

  private evaluateTimeFilter(args: unknown[], closeTime: boolean): number {
    const timestamp = this.ctx.time.get(0) ?? Number.NaN;
    const timeframe = args[0] === undefined || args[0] === '' ? this.ctx.timeframe.period : this.toStringValue(args[0]);
    const session = args[1] === undefined || args[1] === '' ? undefined : this.toStringValue(args[1]);
    const timezone = args[2] === undefined || args[2] === '' ? this.ctx.syminfo.timezone : this.toStringValue(args[2]);

    if (!Number.isFinite(timestamp)) return Number.NaN;
    if (session && !this.isTimestampInSession(timestamp, session, timezone)) {
      return Number.NaN;
    }

    return closeTime ? this.getBarCloseTime(timestamp, timeframe) : timestamp;
  }

  private evaluateTimestamp(args: unknown[]): number {
    if (args.length === 0) return Number.NaN;

    let timezone = this.ctx.syminfo.timezone;
    let offset = 0;
    if (typeof args[0] === 'string') {
      timezone = this.toStringValue(args[0]);
      offset = 1;
    }

    const year = this.toNumber(args[offset]);
    const month = this.toNumber(args[offset + 1]);
    const day = this.toNumber(args[offset + 2]);
    const hour = this.toNumber(args[offset + 3] ?? 0);
    const minute = this.toNumber(args[offset + 4] ?? 0);
    const second = this.toNumber(args[offset + 5] ?? 0);

    if ([year, month, day, hour, minute, second].some((value) => !Number.isFinite(value))) {
      return Number.NaN;
    }

    const timezoneOffset = this.parseTimezoneOffsetMinutes(timezone);
    return Date.UTC(Math.trunc(year), Math.trunc(month) - 1, Math.trunc(day), Math.trunc(hour), Math.trunc(minute), Math.trunc(second)) - timezoneOffset * 60000;
  }

  private getCalendarPart(part: string, timestamp: unknown, timezone: string): number {
    const value = this.toNumber(timestamp);
    if (!Number.isFinite(value)) return Number.NaN;

    const date = new Date(value + this.parseTimezoneOffsetMinutes(timezone) * 60000);
    switch (part) {
      case 'year':
        return date.getUTCFullYear();
      case 'month':
        return date.getUTCMonth() + 1;
      case 'weekofyear':
        return this.getIsoWeek(date);
      case 'dayofmonth':
        return date.getUTCDate();
      case 'dayofweek':
        return date.getUTCDay() + 1;
      case 'hour':
        return date.getUTCHours();
      case 'minute':
        return date.getUTCMinutes();
      case 'second':
        return date.getUTCSeconds();
      default:
        return Number.NaN;
    }
  }

  private getBarCloseTime(timestamp: unknown, timeframe: string): number {
    const value = this.toNumber(timestamp);
    const duration = this.getTimeframeDurationMs(timeframe);
    if (!Number.isFinite(value) || duration === null) return Number.NaN;
    return value + duration;
  }

  private getTimeframeDurationMs(timeframe: string): number | null {
    const normalized = timeframe.trim().toUpperCase();
    if (normalized === '') return this.getTimeframeDurationMs(this.ctx.timeframe.period);

    const numericMinutes = Number(normalized);
    if (Number.isFinite(numericMinutes) && numericMinutes > 0) {
      return numericMinutes * 60_000;
    }

    const match = /^(\d+)?([SWDM])$/.exec(normalized);
    if (!match) return null;

    const multiplier = match[1] === undefined ? 1 : Number(match[1]);
    switch (match[2]) {
      case 'S':
        return multiplier * 1_000;
      case 'D':
        return multiplier * 86_400_000;
      case 'W':
        return multiplier * 7 * 86_400_000;
      case 'M':
        return multiplier * 30 * 86_400_000;
      default:
        return null;
    }
  }

  private isTimestampInSession(timestamp: number, session: string, timezone: string): boolean {
    return session.split(',').some((segment) => this.isTimestampInSessionSegment(timestamp, segment.trim(), timezone));
  }

  private isTimestampInSessionSegment(timestamp: number, segment: string, timezone: string): boolean {
    const match = /^(\d{4})-(\d{4})(?::([1-7]+))?$/.exec(segment);
    if (!match) return false;

    const start = this.parseSessionMinute(match[1]);
    const end = this.parseSessionMinute(match[2]);
    if (start === null || end === null) return false;

    const day = this.getCalendarPart('dayofweek', timestamp, timezone);
    const days = match[3];
    if (days && !days.includes(String(day))) return false;

    if (start === end) return true;

    const hour = this.getCalendarPart('hour', timestamp, timezone);
    const minute = this.getCalendarPart('minute', timestamp, timezone);
    const minuteOfDay = hour * 60 + minute;

    return start < end ? minuteOfDay >= start && minuteOfDay < end : minuteOfDay >= start || minuteOfDay < end;
  }

  private parseSessionMinute(value: string): number | null {
    const hour = Number(value.slice(0, 2));
    const minute = Number(value.slice(2, 4));
    if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
    return hour * 60 + minute;
  }

  private parseTimezoneOffsetMinutes(timezone: string): number {
    if (timezone === 'UTC' || timezone === 'GMT' || timezone === 'Etc/UTC') {
      return 0;
    }

    const match = /^(?:UTC|GMT)([+-])(\d{1,2})(?::?(\d{2}))?$/.exec(timezone);
    if (!match) {
      return 0;
    }

    const sign = match[1] === '+' ? 1 : -1;
    const hours = Number(match[2]);
    const minutes = match[3] === undefined ? 0 : Number(match[3]);
    return sign * (hours * 60 + minutes);
  }

  private getIsoWeek(date: Date): number {
    const copy = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
    const day = copy.getUTCDay() || 7;
    copy.setUTCDate(copy.getUTCDate() + 4 - day);
    const yearStart = new Date(Date.UTC(copy.getUTCFullYear(), 0, 1));
    return Math.ceil(((copy.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  }
}

/**
 * Exception for break statement
 */
class BreakException extends Error {
  constructor() {
    super('break');
    this.name = 'BreakException';
  }
}

/**
 * Exception for continue statement
 */
class ContinueException extends Error {
  constructor() {
    super('continue');
    this.name = 'ContinueException';
  }
}

/**
 * Exception for runtime.error().
 */
class RuntimeErrorException extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RuntimeErrorException';
  }
}

/**
 * Create and execute a script
 */
export function executeScript(ast: Program, bars: Bar[], inputs?: Map<string, unknown>): ExecutionResult {
  const engine = new TealscriptEngine();
  return engine.execute(ast, bars, inputs);
}
