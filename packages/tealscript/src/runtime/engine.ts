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
  VariableDeclaration,
  AssignmentStatement,
  IfStatement,
  ForStatement,
  WhileStatement,
  Identifier,
  BinaryExpression,
  UnaryExpression,
  ConditionalExpression,
  CallExpression,
  MemberExpression,
  IndexExpression,
} from '../parser/ast';

import { ExecutionContext, type Bar, type PlotOutput } from './context';
import { Scope, createRootScope } from './scope';

/**
 * Execution result
 */
export interface ExecutionResult {
  plots: PlotOutput[];
  inputs: Array<{
    id: string;
    type: string;
    title: string;
    defval: unknown;
  }>;
  indicatorTitle: string;
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

/**
 * Built-in function signature
 */
type BuiltinFunction = (
  args: unknown[],
  namedArgs: Map<string, unknown>,
  ctx: ExecutionContext,
  scope: Scope,
) => unknown;

/**
 * Tealscript Engine - executes AST bar-by-bar
 */
export class TealscriptEngine {
  private ctx: ExecutionContext;
  private scope: Scope;
  private builtins: Map<string, BuiltinFunction>;
  private errors: ExecutionError[] = [];

  constructor() {
    this.ctx = new ExecutionContext();
    this.scope = createRootScope();
    this.builtins = new Map();

    this.registerBuiltins();
  }

  /**
   * Execute a parsed program on bar data
   */
  execute(ast: Program, bars: Bar[], inputs?: Map<string, unknown>): ExecutionResult {
    this.errors = [];
    this.ctx.reset();
    this.scope = createRootScope();

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
        }
      }

      // Commit bar — only snapshot on the last bar (for realtime rollback)
      const isLastBar = this.ctx.bar_index === this.ctx.last_bar_index;
      this.scope.commit(isLastBar);
      this.ctx.commitBar();
    }

    return {
      plots: this.ctx.getPlots(),
      inputs: this.ctx.inputDefinitions.map((def) => ({
        id: def.id,
        type: def.type,
        title: def.title,
        defval: def.defval,
      })),
      indicatorTitle: this.ctx.indicatorTitle,
      errors: this.errors,
    };
  }

  /**
   * Execute for realtime bar update
   */
  updateBar(ast: Program, bar: Bar): PlotOutput[] {
    // Rollback to last committed state
    this.scope.rollback();
    this.ctx.rollbackBar();

    // Truncate plot arrays to remove the last bar's appended values
    // so re-execution can re-append them cleanly without duplication
    this.ctx.truncatePlots(this.ctx.last_bar_index);

    // Update current bar data
    this.ctx.updateCurrentBar(bar);
    this.resetPerBarBuiltinState();

    // Re-execute statements for current bar
    for (const stmt of ast.body) {
      try {
        this.executeStatement(stmt);
      } catch (error) {
        // Log error but continue
        console.error('Execution error:', error);
      }
    }

    return this.ctx.getPlots();
  }

  // ===========================================================================
  // Statement Execution
  // ===========================================================================

  private executeStatement(stmt: Statement): void {
    switch (stmt.type) {
      case 'IndicatorDeclaration':
        this.executeIndicator(stmt);
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

    if (stmt.title) {
      this.ctx.indicatorTitle = this.evaluateExpression(stmt.title) as string;
    }
    if (stmt.overlay) {
      this.ctx.indicatorOverlay = this.evaluateExpression(stmt.overlay) as boolean;
    }
    if (stmt.precision) {
      this.ctx.indicatorPrecision = this.evaluateExpression(stmt.precision) as number;
    }
  }

  private executeVariableDeclaration(stmt: VariableDeclaration): void {
    const kind = stmt.kind;
    const value = this.evaluateExpression(stmt.init);

    if (stmt.names.type === 'VariableDeclarator') {
      const name = stmt.names.name.name;
      this.scope.declare(name, kind, value, stmt.typeAnnotation?.baseType);
    } else if (stmt.names.type === 'TupleDeclarator') {
      // Tuple destructuring
      if (!Array.isArray(value)) {
        throw new Error('Cannot destructure non-array value');
      }
      const values = value as unknown[];
      for (let i = 0; i < stmt.names.names.length; i++) {
        const name = stmt.names.names[i].name;
        this.scope.declare(name, kind, values[i]);
      }
    }
  }

  private executeAssignment(stmt: AssignmentStatement): void {
    const value = this.evaluateExpression(stmt.right);

    if (stmt.left.type === 'Identifier') {
      const name = stmt.left.name;
      const currentValue = this.scope.get(name);

      let newValue = value;
      if (stmt.operator !== ':=') {
        // Compound assignment
        const numCurrent = currentValue as number;
        const numValue = value as number;
        switch (stmt.operator) {
          case '+=':
            newValue = numCurrent + numValue;
            break;
          case '-=':
            newValue = numCurrent - numValue;
            break;
          case '*=':
            newValue = numCurrent * numValue;
            break;
          case '/=':
            newValue = numCurrent / numValue;
            break;
          case '%=':
            newValue = numCurrent % numValue;
            break;
        }
      }

      this.scope.set(name, newValue);
    } else {
      // Member or index assignment - not supported in MVP
      throw new Error('Member/index assignment not yet supported');
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
    const start = this.evaluateExpression(stmt.start) as number;
    const end = this.evaluateExpression(stmt.end) as number;
    const step = stmt.step ? (this.evaluateExpression(stmt.step) as number) : 1;

    const childScope = this.scope.createChild();
    const savedScope = this.scope;
    this.scope = childScope;

    try {
      for (let i = start; i <= end; i += step) {
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

  private executeWhile(stmt: WhileStatement): void {
    const childScope = this.scope.createChild();
    const savedScope = this.scope;
    this.scope = childScope;

    let iterations = 0;
    const maxIterations = 10000; // Safety limit

    try {
      while (this.isTruthy(this.evaluateExpression(stmt.test))) {
        if (++iterations > maxIterations) {
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
    const right = this.evaluateExpression(expr.right);

    // Handle na (NaN)
    if (this.isNa(left) || this.isNa(right)) {
      if (expr.operator === '==' || expr.operator === '!=') {
        // na == na is false in Tealscript
        if (this.isNa(left) && this.isNa(right)) {
          return expr.operator === '!=';
        }
        return expr.operator === '!=';
      }
      return NaN;
    }

    switch (expr.operator) {
      // Arithmetic
      case '+':
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

      // Logical
      case 'and':
        return this.isTruthy(left) && this.isTruthy(right);
      case 'or':
        return this.isTruthy(left) || this.isTruthy(right);

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

    // Evaluate arguments
    const args: unknown[] = [];
    const namedArgs = new Map<string, unknown>();

    for (const arg of expr.arguments) {
      const value = this.evaluateExpression(arg.value);
      if (arg.name) {
        namedArgs.set(arg.name.name, value);
      } else {
        args.push(value);
      }
    }

    // Look up builtin
    const builtin = this.builtins.get(fullName);
    if (builtin) {
      return builtin(args, namedArgs, this.ctx, this.scope);
    }

    throw new Error(`Unknown function: ${fullName}`);
  }

  private evaluateMember(expr: MemberExpression): unknown {
    // Handle namespace.constant patterns (e.g., color.red)
    if (expr.object.type === 'Identifier') {
      const namespace = expr.object.name;
      const prop = expr.property.name;
      const fullName = `${namespace}.${prop}`;

      // Check builtins
      const builtin = this.builtins.get(fullName);
      if (builtin) {
        // It's a constant, call with no args
        return builtin([], new Map(), this.ctx, this.scope);
      }
    }

    throw new Error('Member access not supported except for namespaced constants');
  }

  private evaluateIndex(expr: IndexExpression): unknown {
    const offset = this.evaluateExpression(expr.index) as number;

    // If object is an identifier, use history access
    if (expr.object.type === 'Identifier') {
      const name = expr.object.name;

      // Check built-in series first
      switch (name) {
        case 'open':
          return this.ctx.open.get(offset);
        case 'high':
          return this.ctx.high.get(offset);
        case 'low':
          return this.ctx.low.get(offset);
        case 'close':
          return this.ctx.close.get(offset);
        case 'volume':
          return this.ctx.volume.get(offset);
        case 'time':
          return this.ctx.time.get(offset);
      }

      // Check scope for series variable
      return this.scope.getWithOffset(name, offset);
    }

    // Array index access
    const obj = this.evaluateExpression(expr.object);
    if (Array.isArray(obj)) {
      return obj[offset];
    }

    throw new Error('Index access on non-array/non-series');
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

    // Color constants
    this.registerColorBuiltins();

    // TA functions (basic stubs for now)
    this.registerTaBuiltins();

    // Visual constants (shape, location, size)
    this.registerVisualConstants();
  }

  // Plot ID counters - reset when engine is created
  private plotCounter = 0;
  private plotCallIndex = 0;
  private hlineCounter = 0;
  private bgcolorCounter = 0;

  private resetPerBarBuiltinState(): void {
    this.plotCallIndex = 0;
  }

  private registerPlotBuiltins(): void {
    // Reset counters for each registration (new engine)
    this.plotCounter = 0;
    this.hlineCounter = 0;
    this.bgcolorCounter = 0;

    this.builtins.set('plot', (args, namedArgs, ctx) => {
      const value = args[0] as number;
      const callIndex = this.plotCallIndex++;
      const hasExplicitTitle = namedArgs.has('title') || args[1] !== undefined;
      const title = (namedArgs.get('title') ?? args[1] ?? `Plot ${callIndex + 1}`) as string;
      const color = (namedArgs.get('color') ?? args[2] ?? '#2196F3') as string;
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
          style: style as 'line' | 'stepline' | 'histogram' | 'cross' | 'circles' | 'columns' | 'area' | 'areabr',
        });
      }

      // Add color to array for this bar (supports dynamic colors)
      const plot = ctx.plots.get(id);
      if (plot && Array.isArray(plot.color)) {
        plot.color.push(color);
      }

      ctx.addPlotValue(id, this.isNa(value) ? null : value);
      return value;
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

      return price;
    });

    this.builtins.set('bgcolor', (args, namedArgs, ctx) => {
      const color = args[0] as string;
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

    // Plot style constants
    this.builtins.set('plot.style_line', () => 'line');
    this.builtins.set('plot.style_stepline', () => 'stepline');
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
      const color = (namedArgs.get('color') ?? '#2196F3') as string;
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
      const color = (namedArgs.get('color') ?? '#2196F3') as string;
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
      // In PineScript, fill() takes plot IDs returned from plot() calls
      // For our implementation, we'll use the plot titles to reference them
      const plot1Id = args[0] as string;
      const plot2Id = args[1] as string;
      const color = (namedArgs.get('color') ?? args[2] ?? 'rgba(33, 150, 243, 0.2)') as string;
      const title = (namedArgs.get('title') ?? 'Fill') as string;

      const id = `fill_${title}`;

      if (ctx.bar_index === 0) {
        // Reference the actual plot IDs
        const actualPlot1Id = `plot_${plot1Id}`;
        const actualPlot2Id = `plot_${plot2Id}`;

        ctx.registerPlot({
          id,
          type: 'fill',
          title,
          color: [],
          plot1Id: actualPlot1Id,
          plot2Id: actualPlot2Id,
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

  private registerInputBuiltins(): void {
    const createInputFunc = (type: string) => {
      return (args: unknown[], namedArgs: Map<string, unknown>, ctx: ExecutionContext) => {
        const defval = args[0];
        const title = (namedArgs.get('title') ?? args[1] ?? type) as string;

        const id = `input_${title}`;

        if (ctx.bar_index === 0) {
          ctx.registerInput({
            id,
            type: type as 'int' | 'float' | 'bool' | 'string' | 'source' | 'color',
            title,
            defval,
            minval: namedArgs.get('minval') as number | undefined,
            maxval: namedArgs.get('maxval') as number | undefined,
            step: namedArgs.get('step') as number | undefined,
          });
        }

        return ctx.getInput(id) ?? defval;
      };
    };

    this.builtins.set('input.int', createInputFunc('int'));
    this.builtins.set('input.float', createInputFunc('float'));
    this.builtins.set('input.bool', createInputFunc('bool'));
    this.builtins.set('input.string', createInputFunc('string'));
    this.builtins.set('input.color', createInputFunc('color'));

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
    this.builtins.set('math.abs', (args) => Math.abs(args[0] as number));
    this.builtins.set('math.max', (args) => Math.max(...(args as number[])));
    this.builtins.set('math.min', (args) => Math.min(...(args as number[])));
    this.builtins.set('math.sqrt', (args) => Math.sqrt(args[0] as number));
    this.builtins.set('math.pow', (args) => Math.pow(args[0] as number, args[1] as number));
    this.builtins.set('math.log', (args) => Math.log(args[0] as number));
    this.builtins.set('math.log10', (args) => Math.log10(args[0] as number));
    this.builtins.set('math.exp', (args) => Math.exp(args[0] as number));
    this.builtins.set('math.round', (args) => Math.round(args[0] as number));
    this.builtins.set('math.floor', (args) => Math.floor(args[0] as number));
    this.builtins.set('math.ceil', (args) => Math.ceil(args[0] as number));
    this.builtins.set('math.sign', (args) => Math.sign(args[0] as number));
    this.builtins.set('math.sin', (args) => Math.sin(args[0] as number));
    this.builtins.set('math.cos', (args) => Math.cos(args[0] as number));
    this.builtins.set('math.tan', (args) => Math.tan(args[0] as number));
    this.builtins.set('math.asin', (args) => Math.asin(args[0] as number));
    this.builtins.set('math.acos', (args) => Math.acos(args[0] as number));
    this.builtins.set('math.atan', (args) => Math.atan(args[0] as number));

    // nz - replace na with value
    this.builtins.set('nz', (args) => {
      const value = args[0] as number;
      const replacement = (args[1] ?? 0) as number;
      return isNaN(value) ? replacement : value;
    });

    // na function
    this.builtins.set('na', (args) => {
      if (args.length === 0) return NaN;
      const value = args[0];
      return typeof value === 'number' && isNaN(value);
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

    // color.new(color, transparency)
    this.builtins.set('color.new', (args) => {
      const baseColor = args[0] as string;
      const transparency = (args[1] ?? 0) as number;

      // Convert to rgba
      // For simplicity, just return color with alpha
      const alpha = Math.round(((100 - transparency) / 100) * 255);
      const alphaHex = alpha.toString(16).padStart(2, '0');

      if (baseColor.startsWith('#') && baseColor.length === 7) {
        return baseColor + alphaHex;
      }
      return baseColor;
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

    // Change - difference from N bars ago
    this.builtins.set('ta.change', (args, _namedArgs, ctx) => {
      const source = args[0] as number;
      const length = (args[1] ?? 1) as number;

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

    // STOCH - Stochastic Oscillator
    // Returns [%K, %D]
    this.builtins.set('ta.stoch', (args, _namedArgs, ctx, scope) => {
      const length = (args[0] ?? 14) as number;
      const smoothK = (args[1] ?? 3) as number;
      const smoothD = (args[2] ?? 3) as number;

      const close = ctx.close.get(0)!;

      // Calculate highest high and lowest low over length
      let highestHigh = -Infinity;
      let lowestLow = Infinity;

      for (let i = 0; i < length; i++) {
        const h = ctx.high.get(i);
        const l = ctx.low.get(i);
        if (h !== undefined && h > highestHigh) highestHigh = h;
        if (l !== undefined && l < lowestLow) lowestLow = l;
      }

      // Calculate raw %K
      const range = highestHigh - lowestLow;
      const rawK = range > 0 ? ((close - lowestLow) / range) * 100 : 50;

      // Smooth %K using SMA
      const rawKKey = `_stoch_rawK_${length}`;
      const rawKHistory = (scope.get(rawKKey) as number[]) ?? [];
      rawKHistory.push(rawK);
      if (rawKHistory.length > smoothK) rawKHistory.shift();
      scope.declare(rawKKey, 'var', rawKHistory);

      const k = rawKHistory.reduce((a, b) => a + b, 0) / rawKHistory.length;

      // Calculate %D as SMA of %K
      const kHistoryKey = `_stoch_k_${length}`;
      const kHistory = (scope.get(kHistoryKey) as number[]) ?? [];
      kHistory.push(k);
      if (kHistory.length > smoothD) kHistory.shift();
      scope.declare(kHistoryKey, 'var', kHistory);

      const d = kHistory.reduce((a, b) => a + b, 0) / kHistory.length;

      return [k, d];
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

    // CCI - Commodity Channel Index
    this.builtins.set('ta.cci', (args, _namedArgs, ctx) => {
      const length = (args[0] ?? 20) as number;

      // Calculate typical prices for the period
      const typicalPrices: number[] = [];
      for (let i = 0; i < length; i++) {
        const h = ctx.high.get(i);
        const l = ctx.low.get(i);
        const c = ctx.close.get(i);
        if (h !== undefined && l !== undefined && c !== undefined) {
          typicalPrices.push((h + l + c) / 3);
        }
      }

      if (typicalPrices.length < length) {
        return NaN; // Not enough data
      }

      const currentTP = typicalPrices[0];

      // Calculate SMA of typical prices
      const sma = typicalPrices.reduce((a, b) => a + b, 0) / typicalPrices.length;

      // Calculate Mean Deviation
      const meanDev = typicalPrices.reduce((sum, tp) => sum + Math.abs(tp - sma), 0) / typicalPrices.length;

      if (meanDev === 0) return 0;

      // CCI = (Typical Price - SMA) / (0.015 × Mean Deviation)
      return (currentTP - sma) / (0.015 * meanDev);
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

    // LinReg - Linear Regression Value
    this.builtins.set('ta.linreg', (args, _namedArgs, ctx) => {
      const source = args[0] as number;
      const length = args[1] as number;
      const offset = (args[2] ?? 0) as number;

      const series = this.getSeriesForSource(source, ctx);

      // Collect values
      const values: number[] = [];
      for (let i = 0; i < length; i++) {
        const val = series.get(i);
        if (val === undefined || isNaN(val)) return NaN;
        values.push(val);
      }

      // Linear regression: y = mx + b
      // Using least squares method
      const n = length;
      let sumX = 0;
      let sumY = 0;
      let sumXY = 0;
      let sumX2 = 0;

      for (let i = 0; i < n; i++) {
        const x = n - 1 - i; // x goes from n-1 to 0 (oldest to newest)
        const y = values[i];
        sumX += x;
        sumY += y;
        sumXY += x * y;
        sumX2 += x * x;
      }

      const denominator = n * sumX2 - sumX * sumX;
      if (denominator === 0) return NaN;

      const slope = (n * sumXY - sumX * sumY) / denominator;
      const intercept = (sumY - slope * sumX) / n;

      // Calculate value at offset (0 = current bar, negative = future, positive = past)
      return intercept + slope * -offset;
    });
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
 * Create and execute a script
 */
export function executeScript(ast: Program, bars: Bar[], inputs?: Map<string, unknown>): ExecutionResult {
  const engine = new TealscriptEngine();
  return engine.execute(ast, bars, inputs);
}
