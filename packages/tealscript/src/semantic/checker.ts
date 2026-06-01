import type {
  AssignmentStatement,
  CallArgument,
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
  TypeAnnotation,
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
export type SemanticQualifier = 'const' | 'input' | 'simple' | 'series';

export type SemanticTypeKind =
  | 'array'
  | 'bool'
  | 'box'
  | 'chart.point'
  | 'color'
  | 'float'
  | 'hline'
  | 'int'
  | 'label'
  | 'line'
  | 'linefill'
  | 'map'
  | 'matrix'
  | 'plot'
  | 'polyline'
  | 'string'
  | 'table'
  | 'udt'
  | 'unknown'
  | 'void';

export interface SemanticType {
  kind: SemanticTypeKind;
  qualifier?: SemanticQualifier;
  name?: string;
  elementType?: SemanticType;
  keyType?: SemanticType;
  valueType?: SemanticType;
}

export interface SemanticSymbol {
  name: string;
  kind: SemanticSymbolKind;
  type?: SemanticType;
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

const QUALIFIER_RANK: Record<SemanticQualifier, number> = {
  const: 0,
  input: 1,
  simple: 2,
  series: 3,
};

const TYPE_QUALIFIER_NAMES = new Set(['const', 'input', 'simple', 'series']);
const MAP_KEY_TYPE_NAMES = new Set(['int', 'float', 'bool', 'string', 'color']);

interface BuiltinSignature {
  params: string[];
  minArgs?: number;
  maxArgs?: number;
  allowExtraNamed?: boolean;
}

const BUILTIN_SIGNATURES = new Map<string, BuiltinSignature>([
  ['alert', { params: ['message', 'freq'], minArgs: 1 }],
  ['alertcondition', { params: ['condition', 'title', 'message'], minArgs: 1 }],
  ['barcolor', { params: ['color', 'offset', 'editable', 'show_last', 'title', 'display'], minArgs: 1 }],
  ['bgcolor', { params: ['color', 'offset', 'editable', 'show_last', 'title', 'display'], minArgs: 1 }],
  ['color.new', { params: ['color', 'transp'], minArgs: 2, maxArgs: 2 }],
  ['fill', { params: ['hline1', 'hline2', 'color', 'title', 'editable', 'show_last', 'fillgaps', 'display'], minArgs: 3 }],
  ['fixnan', { params: ['source'], minArgs: 1, maxArgs: 1 }],
  ['hline', { params: ['price', 'title', 'color', 'linestyle', 'linewidth', 'editable', 'display'], minArgs: 1 }],
  [
    'indicator',
    {
      params: [
        'title',
        'shorttitle',
        'overlay',
        'format',
        'precision',
        'scale',
        'max_bars_back',
        'timeframe',
        'timeframe_gaps',
        'explicit_plot_zorder',
        'max_lines_count',
        'max_labels_count',
        'max_boxes_count',
        'calc_bars_count',
        'max_polylines_count',
        'dynamic_requests',
      ],
      minArgs: 1,
    },
  ],
  [
    'input.int',
    {
      params: ['defval', 'title', 'minval', 'maxval', 'step', 'tooltip', 'inline', 'group', 'confirm', 'display', 'active'],
      minArgs: 1,
    },
  ],
  [
    'input.float',
    {
      params: ['defval', 'title', 'minval', 'maxval', 'step', 'tooltip', 'inline', 'group', 'confirm', 'display', 'active'],
      minArgs: 1,
    },
  ],
  ['input.bool', { params: ['defval', 'title', 'tooltip', 'inline', 'group', 'confirm', 'display', 'active'], minArgs: 1 }],
  ['input.string', { params: ['defval', 'title', 'options', 'tooltip', 'inline', 'group', 'confirm', 'display', 'active'], minArgs: 1 }],
  ['na', { params: ['x'], minArgs: 1, maxArgs: 1 }],
  ['nz', { params: ['source', 'replacement'], minArgs: 1, maxArgs: 2 }],
  [
    'plot',
    {
      params: [
        'series',
        'title',
        'color',
        'linewidth',
        'style',
        'trackprice',
        'histbase',
        'offset',
        'join',
        'editable',
        'show_last',
        'display',
        'format',
        'precision',
        'force_overlay',
      ],
      minArgs: 1,
    },
  ],
  ['request.security', { params: ['symbol', 'timeframe', 'expression', 'gaps', 'lookahead', 'ignore_invalid_symbol', 'currency', 'calc_bars_count'], minArgs: 3 }],
  ['request.security_lower_tf', { params: ['symbol', 'timeframe', 'expression', 'ignore_invalid_symbol', 'currency', 'ignore_invalid_timeframe', 'calc_bars_count'], minArgs: 3 }],
  ['runtime.error', { params: ['message'], minArgs: 1, maxArgs: 1 }],
  ['ta.atr', { params: ['length'], minArgs: 1, maxArgs: 1 }],
  ['ta.ema', { params: ['source', 'length'], minArgs: 2, maxArgs: 2 }],
  ['ta.rsi', { params: ['source', 'length'], minArgs: 2, maxArgs: 2 }],
  ['ta.sma', { params: ['source', 'length'], minArgs: 2, maxArgs: 2 }],
  ['ta.stdev', { params: ['source', 'length', 'biased'], minArgs: 2, maxArgs: 3 }],
  ['ta.vwap', { params: ['source', 'anchor', 'stdev_mult'], minArgs: 1, maxArgs: 3 }],
  ['time', { params: ['timeframe', 'session', 'timezone'], minArgs: 0, maxArgs: 3 }],
  ['time_close', { params: ['timeframe', 'session', 'timezone'], minArgs: 0, maxArgs: 3 }],
  ['timestamp', { params: ['timezone', 'year', 'month', 'day', 'hour', 'minute', 'second'], minArgs: 1, maxArgs: 7 }],
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
    this.declare(scope, {
      name: statement.name.name,
      kind: 'type',
      type: { kind: 'udt', name: statement.name.name },
      loc: statement.name.loc,
    });
    const typeScope = new SemanticScope(scope);
    for (const field of statement.fields) {
      this.checkTypeAnnotation(statement.name.name, field.typeAnnotation ?? undefined, field.name.loc);
      this.declare(typeScope, {
        name: field.name.name,
        kind: 'variable',
        type: this.typeFromAnnotation(field.typeAnnotation ?? undefined),
        loc: field.name.loc,
      });
      if (field.defaultValue) this.checkExpression(field.defaultValue, typeScope);
    }
  }

  private declareFunction(statement: FunctionDeclaration, scope: SemanticScope): void {
    this.declare(scope, { name: statement.name.name, kind: 'function', loc: statement.name.loc });
    const functionScope = new SemanticScope(scope);

    for (const parameter of statement.params) {
      this.checkTypeAnnotation(statement.name.name, parameter.typeAnnotation ?? undefined, parameter.loc);
      this.declare(functionScope, {
        name: parameter.name,
        kind: 'parameter',
        type: this.typeFromAnnotation(parameter.typeAnnotation ?? undefined),
        loc: parameter.loc,
      });
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
    this.checkTypeAnnotation('variable declaration', statement.typeAnnotation, statement.loc);
    this.checkTypeCompatibility(statement.typeAnnotation, statement.init, scope, statement.loc);
    if (statement.names.type === 'TupleDeclarator') {
      this.declareTuple(statement.names, scope);
      return;
    }

    this.declare(scope, {
      name: statement.names.name.name,
      kind: 'variable',
      type: this.typeFromAnnotation(statement.typeAnnotation ?? undefined) ?? this.inferExpressionType(statement.init, scope),
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
      this.declare(scope, { name: name.name, kind: 'variable', type: { kind: 'unknown' }, loc: name.loc });
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
    this.checkBuiltinSignature(expression);
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

  private checkBuiltinSignature(expression: CallExpression): void {
    const displayName = this.memberPath(expression.callee).join('.');
    const signature = BUILTIN_SIGNATURES.get(displayName);
    if (!signature) return;

    this.checkArgumentOrder(expression.arguments, displayName);
    this.checkArgumentNames(expression.arguments, signature, displayName);
    this.checkArgumentCount(expression.arguments, signature, displayName);
    this.checkDuplicateArgumentBindings(expression.arguments, signature, displayName);
  }

  private checkArgumentOrder(args: CallArgument[], displayName: string): void {
    let hasNamedArgument = false;
    for (const arg of args) {
      if (arg.name) {
        hasNamedArgument = true;
        continue;
      }
      if (hasNamedArgument) {
        this.addDiagnostic('argument-order', `${displayName}() cannot use positional arguments after named arguments`, arg.loc);
      }
    }
  }

  private checkArgumentNames(args: CallArgument[], signature: BuiltinSignature, displayName: string): void {
    if (signature.allowExtraNamed) return;
    const allowed = new Set(signature.params);
    for (const arg of args) {
      if (arg.name && !allowed.has(arg.name.name)) {
        this.addDiagnostic('unknown-argument', `Unknown argument '${arg.name.name}' for ${displayName}()`, arg.name.loc);
      }
    }
  }

  private checkArgumentCount(args: CallArgument[], signature: BuiltinSignature, displayName: string): void {
    const positionalCount = this.leadingPositionalCount(args);
    const suppliedNames = new Set(args.flatMap((arg) => (arg.name ? [arg.name.name] : [])));
    const boundParamCount = signature.params.filter((param, index) => index < positionalCount || suppliedNames.has(param)).length;
    const minArgs = signature.minArgs ?? 0;
    const maxArgs = signature.maxArgs ?? signature.params.length;

    if (boundParamCount < minArgs) {
      this.addDiagnostic('argument-count', `${displayName}() expects at least ${minArgs} argument${minArgs === 1 ? '' : 's'}`, args[0]?.loc);
    }
    if (positionalCount > maxArgs) {
      this.addDiagnostic('argument-count', `${displayName}() expects at most ${maxArgs} argument${maxArgs === 1 ? '' : 's'}`, args[maxArgs]?.loc);
    }
  }

  private checkDuplicateArgumentBindings(args: CallArgument[], signature: BuiltinSignature, displayName: string): void {
    const positionalCount = this.leadingPositionalCount(args);
    const seenNames = new Set<string>();

    for (const arg of args) {
      if (!arg.name) continue;

      const name = arg.name.name;
      if (seenNames.has(name)) {
        this.addDiagnostic('duplicate-argument', `Argument '${name}' for ${displayName}() was supplied multiple times`, arg.name.loc);
        continue;
      }
      seenNames.add(name);

      const positionalIndex = signature.params.indexOf(name);
      if (positionalIndex !== -1 && positionalIndex < positionalCount) {
        this.addDiagnostic('duplicate-argument', `Argument '${name}' for ${displayName}() was supplied multiple times`, arg.name.loc);
      }
    }
  }

  private leadingPositionalCount(args: CallArgument[]): number {
    let count = 0;
    for (const arg of args) {
      if (arg.name) return count;
      count += 1;
    }
    return count;
  }

  private checkIdentifier(identifier: Identifier, scope: SemanticScope): void {
    if (this.isKnownIdentifier(identifier.name) || scope.lookup(identifier.name)) return;
    this.addDiagnostic('unknown-identifier', `Unknown identifier: ${identifier.name}`, identifier.loc);
  }

  private checkTypeAnnotation(owner: string, annotation?: TypeAnnotation | null, loc?: SourceLocation): void {
    if (!annotation) return;

    if (annotation.baseType === 'array' || annotation.baseType === 'matrix') {
      this.checkTemplateTypeName(annotation.elementType, `${annotation.baseType} element`, loc ?? annotation.loc);
      return;
    }

    if (annotation.baseType === 'map') {
      this.checkTemplateTypeName(annotation.keyType, 'map key', loc ?? annotation.loc);
      this.checkTemplateTypeName(annotation.valueType, 'map value', loc ?? annotation.loc);
      if (!MAP_KEY_TYPE_NAMES.has(annotation.keyType)) {
        this.addDiagnostic('invalid-type-template', `Map key type must be int, float, bool, string, or color in ${owner}`, loc ?? annotation.loc);
      }
    }
  }

  private checkTemplateTypeName(typeName: string, role: string, loc?: SourceLocation): void {
    if (TYPE_QUALIFIER_NAMES.has(typeName)) {
      this.addDiagnostic('invalid-type-template', `Invalid ${role} type '${typeName}'; qualifiers cannot be used as template types`, loc);
    }
  }

  private checkExpressions(scope: SemanticScope, expressions: Array<Expression | undefined>): void {
    for (const expression of expressions) {
      if (expression) this.checkExpression(expression, scope);
    }
  }

  private typeFromAnnotation(annotation?: TypeAnnotation | null): SemanticType | undefined {
    if (!annotation) return undefined;

    const qualifier = annotation.qualifier;
    if (annotation.baseType === 'array' || annotation.baseType === 'matrix') {
      return {
        kind: annotation.baseType,
        qualifier,
        elementType: this.typeFromName(annotation.elementType),
      };
    }

    if (annotation.baseType === 'map') {
      return {
        kind: 'map',
        qualifier,
        keyType: this.typeFromName(annotation.keyType),
        valueType: this.typeFromName(annotation.valueType),
      };
    }

    if (annotation.baseType === 'udt') {
      return { kind: 'udt', qualifier, name: annotation.name };
    }

    return this.typeFromName(annotation.baseType, qualifier);
  }

  private inferExpressionType(expression: Expression, scope: SemanticScope = this.rootScope): SemanticType {
    switch (expression.type) {
      case 'NumericLiteral':
        return Number.isInteger(expression.value) ? { kind: 'int', qualifier: 'const' } : { kind: 'float', qualifier: 'const' };
      case 'StringLiteral':
        return { kind: 'string', qualifier: 'const' };
      case 'BooleanLiteral':
        return { kind: 'bool', qualifier: 'const' };
      case 'ColorLiteral':
        return { kind: 'color', qualifier: 'const' };
      case 'NaExpression':
        return { kind: 'unknown' };
      case 'ArrayExpression':
        return { kind: 'array', qualifier: this.inferMaxQualifier(expression.elements, scope), elementType: { kind: 'unknown' } };
      case 'Identifier':
        return this.inferIdentifierType(expression, scope);
      case 'BinaryExpression':
        return { kind: 'unknown', qualifier: this.maxQualifier(this.inferExpressionType(expression.left, scope), this.inferExpressionType(expression.right, scope)) };
      case 'UnaryExpression':
        return { kind: 'unknown', qualifier: this.inferExpressionType(expression.argument, scope).qualifier };
      case 'ConditionalExpression':
        return {
          kind: 'unknown',
          qualifier: this.maxQualifier(
            this.inferExpressionType(expression.test, scope),
            this.inferExpressionType(expression.consequent, scope),
            this.inferExpressionType(expression.alternate, scope),
          ),
        };
      case 'CallExpression':
        return this.inferCallType(expression, scope);
      case 'MemberExpression':
        if (expression.object.type === 'Identifier' && BUILTIN_NAMESPACES.has(expression.object.name)) {
          return { kind: 'unknown', qualifier: 'const' };
        }
        return this.inferExpressionType(expression.object, scope);
      case 'IndexExpression':
        return { kind: 'unknown', qualifier: 'series' };
      default:
        return { kind: 'unknown' };
    }
  }

  private inferIdentifierType(identifier: Identifier, scope: SemanticScope): SemanticType {
    if (['close', 'high', 'hl2', 'hlc3', 'low', 'ohlc4', 'open', 'time', 'time_close', 'timenow', 'volume'].includes(identifier.name)) {
      return { kind: 'unknown', qualifier: 'series' };
    }
    if (['bar_index', 'last_bar_index'].includes(identifier.name)) {
      return { kind: 'int', qualifier: 'series' };
    }
    const symbol = scope.lookup(identifier.name);
    return symbol?.type ?? { kind: 'unknown' };
  }

  private inferCallType(expression: CallExpression, scope: SemanticScope): SemanticType {
    const calleePath = this.memberPath(expression.callee);
    const namespace = calleePath[0];
    if (namespace === 'input') return { kind: 'unknown', qualifier: 'input' };
    if (namespace === 'request' || namespace === 'ta' || namespace === 'time' || namespace === 'time_close') {
      return { kind: 'unknown', qualifier: 'series' };
    }
    if (calleePath.join('.') === 'timestamp') return { kind: 'int', qualifier: 'const' };
    return { kind: 'unknown', qualifier: this.inferMaxQualifier(expression.arguments.map((argument) => argument.value), scope) };
  }

  private memberPath(expression: Expression): string[] {
    if (expression.type === 'Identifier') return [expression.name];
    if (expression.type !== 'MemberExpression') return [];
    return [...this.memberPath(expression.object), expression.property.name];
  }

  private inferMaxQualifier(expressions: Expression[], scope: SemanticScope): SemanticQualifier | undefined {
    return this.maxQualifier(...expressions.map((expression) => this.inferExpressionType(expression, scope)));
  }

  private maxQualifier(...types: SemanticType[]): SemanticQualifier | undefined {
    let max: SemanticQualifier | undefined;
    for (const type of types) {
      if (!type.qualifier) continue;
      if (!max || QUALIFIER_RANK[type.qualifier] > QUALIFIER_RANK[max]) {
        max = type.qualifier;
      }
    }
    return max;
  }

  private typeFromName(name: string, qualifier?: SemanticQualifier): SemanticType {
    switch (name) {
      case 'int':
      case 'float':
      case 'bool':
      case 'string':
      case 'color':
        return { kind: name, qualifier };
      case 'void':
      case 'array':
      case 'matrix':
      case 'map':
      case 'label':
      case 'line':
      case 'box':
      case 'polyline':
      case 'table':
      case 'chart.point':
      case 'linefill':
      case 'plot':
      case 'hline':
        return { kind: name, qualifier };
      default:
        return { kind: 'udt', qualifier, name };
    }
  }

  private checkTypeCompatibility(annotation: TypeAnnotation | undefined | null, init: Expression, scope: SemanticScope, loc?: SourceLocation): void {
    const targetType = this.typeFromAnnotation(annotation);
    if (!targetType?.qualifier) return;

    const initType = this.inferExpressionType(init, scope);
    if (!initType.qualifier) return;

    if (QUALIFIER_RANK[initType.qualifier] > QUALIFIER_RANK[targetType.qualifier]) {
      this.addDiagnostic(
        'qualifier-mismatch',
        `Cannot assign ${initType.qualifier} value to ${targetType.qualifier} ${targetType.kind}`,
        loc,
      );
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
