import type {
  AssignmentStatement,
  CallExpression,
  Expression,
  ForStatement,
  FunctionDeclaration,
  Identifier,
  IfStatement,
  ImportDeclaration,
  IndexExpression,
  MemberExpression,
  Program,
  SourceLocation,
  Statement,
  SwitchCase,
  SwitchExpression,
  TupleDeclarator,
  TypeDeclaration,
  VariableDeclaration,
  WhileStatement,
} from '../parser/ast';

export type SemanticDiagnosticSeverity = 'error' | 'warning';

export interface SemanticDiagnostic {
  code: string;
  message: string;
  severity: SemanticDiagnosticSeverity;
  line?: number;
  column?: number;
}

export type SemanticSymbolKind = 'variable' | 'function' | 'parameter' | 'type' | 'import' | 'loop';

export interface SemanticSymbol {
  name: string;
  kind: SemanticSymbolKind;
  loc?: SourceLocation;
}

export interface SemanticCheckResult {
  diagnostics: SemanticDiagnostic[];
  symbols: SemanticSymbol[];
}

class SemanticScope {
  private readonly symbols = new Map<string, SemanticSymbol>();

  constructor(private readonly parent?: SemanticScope) {}

  declare(symbol: SemanticSymbol): SemanticSymbol | null {
    const existing = this.symbols.get(symbol.name);
    if (existing) return existing;
    this.symbols.set(symbol.name, symbol);
    return null;
  }

  lookup(name: string): SemanticSymbol | null {
    return this.symbols.get(name) ?? this.parent?.lookup(name) ?? null;
  }

  allSymbols(): SemanticSymbol[] {
    return [...this.symbols.values()];
  }
}

const BUILTIN_GLOBALS = new Set([
  'bar_index',
  'close',
  'hl2',
  'hlc3',
  'high',
  'last_bar_index',
  'low',
  'na',
  'ohlc4',
  'open',
  'time',
  'time_close',
  'timenow',
  'volume',
]);

const BUILTIN_FUNCTIONS = new Set([
  'alert',
  'alertcondition',
  'barcolor',
  'bgcolor',
  'fill',
  'fixnan',
  'hline',
  'indicator',
  'label',
  'line',
  'na',
  'nz',
  'plot',
  'plotbar',
  'plotcandle',
  'plotchar',
  'plotshape',
  'runtime',
  'strategy',
  'time',
  'time_close',
  'timestamp',
]);

const BUILTIN_NAMESPACES = new Set([
  'adjustment',
  'array',
  'barmerge',
  'barstate',
  'box',
  'chart',
  'color',
  'currency',
  'display',
  'extend',
  'format',
  'hline',
  'input',
  'label',
  'line',
  'linefill',
  'location',
  'map',
  'math',
  'matrix',
  'order',
  'plot',
  'polyline',
  'position',
  'request',
  'runtime',
  'scale',
  'session',
  'shape',
  'size',
  'str',
  'strategy',
  'syminfo',
  'ta',
  'table',
  'ticker',
  'timeframe',
  'xloc',
  'yloc',
]);

export function checkProgram(program: Program): SemanticCheckResult {
  return new SemanticChecker().check(program);
}

class SemanticChecker {
  private diagnostics: SemanticDiagnostic[] = [];
  private rootScope = new SemanticScope();

  check(program: Program): SemanticCheckResult {
    this.diagnostics = [];
    this.rootScope = new SemanticScope();
    this.checkStatements(program.body, this.rootScope);
    return {
      diagnostics: this.diagnostics,
      symbols: this.rootScope.allSymbols(),
    };
  }

  private checkStatements(statements: Statement[], scope: SemanticScope): void {
    for (const statement of statements) {
      this.checkStatement(statement, scope);
    }
  }

  private checkStatement(statement: Statement, scope: SemanticScope): void {
    switch (statement.type) {
      case 'IndicatorDeclaration':
        this.checkExpressions(scope, [
          statement.title,
          statement.shorttitle,
          statement.overlay,
          statement.format,
          statement.precision,
          statement.scale,
          statement.max_bars_back,
          statement.max_labels_count,
          statement.max_lines_count,
          statement.max_boxes_count,
          statement.max_polylines_count,
          statement.timeframe,
          statement.timeframe_gaps,
          statement.dynamic_requests,
          statement.initial_capital,
          statement.currency,
          statement.default_qty_type,
          statement.default_qty_value,
          statement.pyramiding,
          statement.commission_type,
          statement.commission_value,
          statement.slippage,
          statement.margin_long,
          statement.margin_short,
          statement.calc_on_order_fills,
          statement.calc_on_every_tick,
          statement.process_orders_on_close,
        ]);
        break;
      case 'LibraryDeclaration':
        this.checkExpressions(scope, [statement.title, statement.overlay, statement.dynamic_requests]);
        break;
      case 'ImportDeclaration':
        this.declareImport(statement, scope);
        break;
      case 'TypeDeclaration':
        this.declareType(statement, scope);
        break;
      case 'FunctionDeclaration':
        this.declareFunction(statement, scope);
        break;
      case 'VariableDeclaration':
        this.checkVariableDeclaration(statement, scope);
        break;
      case 'AssignmentStatement':
        this.checkAssignment(statement, scope);
        break;
      case 'ExpressionStatement':
        this.checkExpression(statement.expression, scope);
        break;
      case 'IfStatement':
        this.checkIf(statement, scope);
        break;
      case 'ForStatement':
        this.checkFor(statement, scope);
        break;
      case 'WhileStatement':
        this.checkWhile(statement, scope);
        break;
      case 'BreakStatement':
      case 'ContinueStatement':
        break;
    }
  }

  private declareImport(statement: ImportDeclaration, scope: SemanticScope): void {
    this.declare(scope, { name: statement.alias.name, kind: 'import', loc: statement.alias.loc });
  }

  private declareType(statement: TypeDeclaration, scope: SemanticScope): void {
    this.declare(scope, { name: statement.name.name, kind: 'type', loc: statement.name.loc });
    const typeScope = new SemanticScope(scope);
    for (const field of statement.fields) {
      this.declare(typeScope, { name: field.name.name, kind: 'variable', loc: field.name.loc });
      if (field.defaultValue) this.checkExpression(field.defaultValue, typeScope);
    }
  }

  private declareFunction(statement: FunctionDeclaration, scope: SemanticScope): void {
    this.declare(scope, { name: statement.name.name, kind: 'function', loc: statement.name.loc });
    const functionScope = new SemanticScope(scope);

    for (const parameter of statement.params) {
      this.declare(functionScope, { name: parameter.name, kind: 'parameter', loc: parameter.loc });
      if (parameter.defaultValue) this.checkExpression(parameter.defaultValue, scope);
    }

    if (Array.isArray(statement.body)) {
      this.checkStatements(statement.body, functionScope);
    } else {
      this.checkExpression(statement.body, functionScope);
    }
  }

  private checkVariableDeclaration(statement: VariableDeclaration, scope: SemanticScope): void {
    this.checkExpression(statement.init, scope);
    if (statement.names.type === 'TupleDeclarator') {
      this.declareTuple(statement.names, scope);
      return;
    }

    this.declare(scope, {
      name: statement.names.name.name,
      kind: 'variable',
      loc: statement.names.name.loc,
    });
  }

  private declareTuple(tuple: TupleDeclarator, scope: SemanticScope): void {
    const seen = new Set<string>();
    for (const name of tuple.names) {
      if (seen.has(name.name)) {
        this.addDiagnostic('duplicate-symbol', `Duplicate declaration: ${name.name}`, name.loc);
        continue;
      }
      seen.add(name.name);
      this.declare(scope, { name: name.name, kind: 'variable', loc: name.loc });
    }
  }

  private checkAssignment(statement: AssignmentStatement, scope: SemanticScope): void {
    this.checkExpression(statement.right, scope);
    this.checkAssignmentTarget(statement, scope);
  }

  private checkAssignmentTarget(statement: AssignmentStatement, scope: SemanticScope): void {
    if (statement.left.type === 'Identifier') {
      if (!scope.lookup(statement.left.name) && !this.isKnownIdentifier(statement.left.name)) {
        this.addDiagnostic('unknown-assignment-target', `Cannot assign to undeclared identifier: ${statement.left.name}`, statement.left.loc);
      }
      return;
    }

    if (statement.left.type === 'MemberExpression') {
      this.checkMemberExpression(statement.left, scope);
      return;
    }

    this.checkIndexExpression(statement.left, scope);
  }

  private checkIf(statement: IfStatement, scope: SemanticScope): void {
    this.checkExpression(statement.test, scope);
    this.checkStatements(statement.consequent, new SemanticScope(scope));
    if (Array.isArray(statement.alternate)) {
      this.checkStatements(statement.alternate, new SemanticScope(scope));
    } else if (statement.alternate) {
      this.checkIf(statement.alternate, scope);
    }
  }

  private checkFor(statement: ForStatement, scope: SemanticScope): void {
    const loopScope = new SemanticScope(scope);
    this.declare(loopScope, { name: statement.counter.name, kind: 'loop', loc: statement.counter.loc });
    if (statement.kind === 'collection') {
      if (statement.indexCounter) {
        this.declare(loopScope, { name: statement.indexCounter.name, kind: 'loop', loc: statement.indexCounter.loc });
      }
      this.checkExpression(statement.iterable, scope);
    } else {
      this.checkExpressions(scope, [statement.start, statement.end, statement.step]);
    }
    this.checkStatements(statement.body, loopScope);
  }

  private checkWhile(statement: WhileStatement, scope: SemanticScope): void {
    this.checkExpression(statement.test, scope);
    this.checkStatements(statement.body, new SemanticScope(scope));
  }

  private checkExpression(expression: Expression, scope: SemanticScope): void {
    switch (expression.type) {
      case 'Identifier':
        this.checkIdentifier(expression, scope);
        break;
      case 'NumericLiteral':
      case 'StringLiteral':
      case 'BooleanLiteral':
      case 'ColorLiteral':
      case 'NaExpression':
        break;
      case 'BinaryExpression':
        this.checkExpression(expression.left, scope);
        this.checkExpression(expression.right, scope);
        break;
      case 'UnaryExpression':
        this.checkExpression(expression.argument, scope);
        break;
      case 'ConditionalExpression':
        this.checkExpressions(scope, [expression.test, expression.consequent, expression.alternate]);
        break;
      case 'SwitchExpression':
        this.checkSwitchExpression(expression, scope);
        break;
      case 'ForStatement':
        this.checkFor(expression, scope);
        break;
      case 'WhileStatement':
        this.checkWhile(expression, scope);
        break;
      case 'CallExpression':
        this.checkCallExpression(expression, scope);
        break;
      case 'MemberExpression':
        this.checkMemberExpression(expression, scope);
        break;
      case 'IndexExpression':
        this.checkIndexExpression(expression, scope);
        break;
      case 'ArrayExpression':
        this.checkExpressions(scope, expression.elements);
        break;
    }
  }

  private checkSwitchExpression(expression: SwitchExpression, scope: SemanticScope): void {
    if (expression.discriminant) this.checkExpression(expression.discriminant, scope);
    for (const switchCase of expression.cases) {
      this.checkSwitchCase(switchCase, scope);
    }
  }

  private checkSwitchCase(switchCase: SwitchCase, scope: SemanticScope): void {
    if (switchCase.test) this.checkExpression(switchCase.test, scope);
    if (Array.isArray(switchCase.consequent)) {
      this.checkStatements(switchCase.consequent, new SemanticScope(scope));
    } else {
      this.checkExpression(switchCase.consequent, scope);
    }
  }

  private checkCallExpression(expression: CallExpression, scope: SemanticScope): void {
    this.checkCallee(expression.callee, scope);
    for (const argument of expression.arguments) {
      this.checkExpression(argument.value, scope);
    }
  }

  private checkCallee(callee: Expression, scope: SemanticScope): void {
    if (callee.type === 'Identifier') {
      if (!BUILTIN_FUNCTIONS.has(callee.name) && !scope.lookup(callee.name)) {
        this.addDiagnostic('unknown-function', `Unknown function: ${callee.name}`, callee.loc);
      }
      return;
    }

    this.checkExpression(callee, scope);
  }

  private checkMemberExpression(expression: MemberExpression, scope: SemanticScope): void {
    if (expression.object.type === 'Identifier' && BUILTIN_NAMESPACES.has(expression.object.name)) {
      return;
    }
    this.checkExpression(expression.object, scope);
  }

  private checkIndexExpression(expression: IndexExpression, scope: SemanticScope): void {
    this.checkExpression(expression.object, scope);
    this.checkExpression(expression.index, scope);
  }

  private checkIdentifier(identifier: Identifier, scope: SemanticScope): void {
    if (this.isKnownIdentifier(identifier.name) || scope.lookup(identifier.name)) return;
    this.addDiagnostic('unknown-identifier', `Unknown identifier: ${identifier.name}`, identifier.loc);
  }

  private checkExpressions(scope: SemanticScope, expressions: Array<Expression | undefined>): void {
    for (const expression of expressions) {
      if (expression) this.checkExpression(expression, scope);
    }
  }

  private declare(scope: SemanticScope, symbol: SemanticSymbol): void {
    const existing = scope.declare(symbol);
    if (!existing) return;
    this.addDiagnostic('duplicate-symbol', `Duplicate declaration: ${symbol.name}`, symbol.loc);
  }

  private isKnownIdentifier(name: string): boolean {
    return BUILTIN_GLOBALS.has(name) || BUILTIN_NAMESPACES.has(name);
  }

  private addDiagnostic(code: string, message: string, loc?: SourceLocation): void {
    this.diagnostics.push({
      code,
      message,
      severity: 'error',
      line: loc?.start.line,
      column: loc?.start.column,
    });
  }
}
