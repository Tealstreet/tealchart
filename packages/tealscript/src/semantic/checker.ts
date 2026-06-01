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
  TypeFieldDeclaration,
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
  'time_tradingday',
  'timenow',
  'last_bar_time',
  'volume',
]);

const CALENDAR_FUNCTION_NAMES = new Set([
  'year',
  'month',
  'weekofyear',
  'dayofmonth',
  'dayofweek',
  'hour',
  'minute',
  'second',
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
  ...CALENDAR_FUNCTION_NAMES,
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
const PRIMITIVE_TYPE_KINDS = new Set<SemanticTypeKind>(['bool', 'color', 'float', 'int', 'string']);

interface BuiltinSignature {
  params: string[];
  overloads?: string[][];
  minArgs?: number;
  maxArgs?: number;
  allowExtraNamed?: boolean;
}

const BUILTIN_SIGNATURES = new Map<string, BuiltinSignature>([
  ['alert', { params: ['message', 'freq'], minArgs: 1 }],
  ['alertcondition', { params: ['condition', 'title', 'message'], minArgs: 1 }],
  ['barcolor', { params: ['color', 'offset', 'editable', 'show_last', 'title', 'display'], minArgs: 1 }],
  ['bgcolor', { params: ['color', 'offset', 'editable', 'show_last', 'title', 'display', 'force_overlay'], minArgs: 1 }],
  ['color.new', { params: ['color', 'transp'], minArgs: 2, maxArgs: 2 }],
  ['fill', { params: ['hline1', 'hline2', 'color', 'title', 'editable', 'show_last', 'fillgaps', 'display'], minArgs: 3 }],
  ['fixnan', { params: ['source'], minArgs: 1, maxArgs: 1 }],
  ['hline', { params: ['price', 'title', 'color', 'linestyle', 'linewidth', 'editable', 'display'], minArgs: 1 }],
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
        'linestyle',
      ],
      minArgs: 1,
    },
  ],
  [
    'plotbar',
    {
      params: ['open', 'high', 'low', 'close', 'title', 'color', 'editable', 'show_last', 'display', 'format', 'precision', 'force_overlay'],
      minArgs: 4,
    },
  ],
  [
    'plotcandle',
    {
      params: [
        'open',
        'high',
        'low',
        'close',
        'title',
        'color',
        'wickcolor',
        'editable',
        'show_last',
        'bordercolor',
        'display',
        'format',
        'precision',
        'force_overlay',
      ],
      minArgs: 4,
    },
  ],
  [
    'plotshape',
    {
      params: [
        'series',
        'title',
        'style',
        'location',
        'color',
        'offset',
        'text',
        'textcolor',
        'editable',
        'size',
        'show_last',
        'display',
        'format',
        'precision',
        'force_overlay',
      ],
      minArgs: 1,
    },
  ],
  [
    'plotchar',
    {
      params: [
        'series',
        'title',
        'char',
        'location',
        'color',
        'offset',
        'text',
        'textcolor',
        'editable',
        'size',
        'show_last',
        'display',
        'format',
        'precision',
        'force_overlay',
      ],
      minArgs: 1,
    },
  ],
  [
    'plotarrow',
    {
      params: [
        'series',
        'title',
        'colorup',
        'colordown',
        'offset',
        'minheight',
        'maxheight',
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
        'behind_chart',
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
      params: ['defval', 'title', 'options', 'minval', 'maxval', 'step', 'tooltip', 'inline', 'group', 'confirm', 'display', 'active'],
      overloads: [
        ['defval', 'title', 'minval', 'maxval', 'step', 'tooltip', 'inline', 'group', 'confirm', 'display', 'active'],
        ['defval', 'title', 'options', 'tooltip', 'inline', 'group', 'confirm', 'display', 'active'],
      ],
      minArgs: 1,
    },
  ],
  [
    'input.float',
    {
      params: ['defval', 'title', 'options', 'minval', 'maxval', 'step', 'tooltip', 'inline', 'group', 'confirm', 'display', 'active'],
      overloads: [
        ['defval', 'title', 'minval', 'maxval', 'step', 'tooltip', 'inline', 'group', 'confirm', 'display', 'active'],
        ['defval', 'title', 'options', 'tooltip', 'inline', 'group', 'confirm', 'display', 'active'],
      ],
      minArgs: 1,
    },
  ],
  ['input.bool', { params: ['defval', 'title', 'tooltip', 'inline', 'group', 'confirm', 'display', 'active'], minArgs: 1 }],
  ['input.string', { params: ['defval', 'title', 'options', 'tooltip', 'inline', 'group', 'confirm', 'display', 'active'], minArgs: 1 }],
  ['input.color', { params: ['defval', 'title', 'tooltip', 'inline', 'group', 'confirm', 'display', 'active'], minArgs: 1 }],
  [
    'input.price',
    {
      params: ['defval', 'title', 'tooltip', 'inline', 'group', 'confirm', 'display', 'active'],
      minArgs: 1,
    },
  ],
  ['input.time', { params: ['defval', 'title', 'tooltip', 'inline', 'group', 'confirm', 'display', 'active'], minArgs: 1 }],
  ['input.timeframe', { params: ['defval', 'title', 'options', 'tooltip', 'inline', 'group', 'confirm', 'display', 'active'], minArgs: 1 }],
  ['input.symbol', { params: ['defval', 'title', 'tooltip', 'inline', 'group', 'confirm', 'display', 'active'], minArgs: 1 }],
  ['input.session', { params: ['defval', 'title', 'tooltip', 'inline', 'group', 'confirm', 'display', 'active'], minArgs: 1 }],
  ['input.text_area', { params: ['defval', 'title', 'tooltip', 'inline', 'group', 'confirm', 'display', 'active'], minArgs: 1 }],
  ['input.source', { params: ['defval', 'title', 'tooltip', 'inline', 'group', 'confirm', 'display', 'active'], minArgs: 1 }],
  ['na', { params: ['x'], minArgs: 1, maxArgs: 1 }],
  ['nz', { params: ['source', 'replacement'], minArgs: 1, maxArgs: 2 }],
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
  ['timeframe.change', { params: ['timeframe'], minArgs: 0, maxArgs: 1 }],
  ['timeframe.from_seconds', { params: ['seconds'], minArgs: 1, maxArgs: 1 }],
  ['timeframe.in_seconds', { params: ['timeframe'], minArgs: 0, maxArgs: 1 }],
  ['timestamp', { params: ['timezone', 'year', 'month', 'day', 'hour', 'minute', 'second'], minArgs: 1, maxArgs: 7 }],
]);

for (const name of CALENDAR_FUNCTION_NAMES) {
  BUILTIN_SIGNATURES.set(name, { params: ['time', 'timezone'], minArgs: 1, maxArgs: 2 });
}

export function checkProgram(program: Program): SemanticCheckResult {
  return new SemanticChecker().check(program);
}

class SemanticChecker {
  private diagnostics: SemanticDiagnostic[] = [];
  private rootScope = new SemanticScope();
  private typeDeclarations = new Map<string, TypeDeclaration>();

  check(program: Program): SemanticCheckResult {
    this.diagnostics = [];
    this.rootScope = new SemanticScope();
    this.typeDeclarations = new Map();
    this.checkLibraryExportDeclarations(program.body);
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

  private checkLibraryExportDeclarations(statements: Statement[]): void {
    const libraryDeclaration = statements.find((statement) => statement.type === 'LibraryDeclaration');
    const exportedDeclarations = statements.filter(
      (statement): statement is FunctionDeclaration | TypeDeclaration =>
        (statement.type === 'FunctionDeclaration' || statement.type === 'TypeDeclaration') && !!statement.exported,
    );

    if (libraryDeclaration && exportedDeclarations.length === 0) {
      this.addDiagnostic(
        'library-export',
        'Library scripts must export at least one function, method, or user-defined type',
        libraryDeclaration.loc,
      );
    }

    if (!libraryDeclaration) {
      for (const declaration of exportedDeclarations) {
        this.addDiagnostic(
          'library-export',
          `Exported declarations are only allowed in library scripts: ${declaration.name.name}`,
          declaration.name.loc,
        );
      }
      return;
    }

    for (const declaration of exportedDeclarations) {
      if (declaration.type !== 'FunctionDeclaration') continue;
      this.checkExportedFunctionParameters(declaration);
    }

    const globalVariableQualifiers = this.collectGlobalVariableQualifiers(statements);
    for (const declaration of exportedDeclarations) {
      if (declaration.type !== 'FunctionDeclaration') continue;
      this.checkExportedFunctionScope(declaration, globalVariableQualifiers);
    }
  }

  private checkExportedFunctionParameters(declaration: FunctionDeclaration): void {
    const declarationKind = declaration.isMethod ? 'method' : 'function';
    for (const parameter of declaration.params) {
      if (parameter.typeAnnotation) continue;
      this.addDiagnostic(
        'library-export',
        `Exported ${declarationKind} ${declaration.name.name} parameter ${parameter.name} must declare a type`,
        parameter.loc,
      );
    }
  }

  private collectGlobalVariableQualifiers(statements: Statement[]): Map<string, SemanticQualifier | undefined> {
    const globals = new Map<string, SemanticQualifier | undefined>();
    for (const statement of statements) {
      if (statement.type !== 'VariableDeclaration') continue;
      const type = this.typeFromAnnotation(statement.typeAnnotation);
      for (const name of this.declaredNames(statement)) {
        globals.set(name, type?.qualifier);
      }
    }
    return globals;
  }

  private checkExportedFunctionScope(declaration: FunctionDeclaration, globalVariableQualifiers: Map<string, SemanticQualifier | undefined>): void {
    const functionLocals = new Set<string>(declaration.params.map((parameter) => parameter.name));
    const reportedGlobals = new Set<string>();
    let reportedInputCall = false;
    const declarationKind = declaration.isMethod ? 'method' : 'function';

    const visitExpression = (expression: Expression, localNames: Set<string>): void => {
      if (expression.type === 'Identifier') {
        const qualifier = globalVariableQualifiers.get(expression.name);
        if (globalVariableQualifiers.has(expression.name) && qualifier !== 'const' && !localNames.has(expression.name) && !reportedGlobals.has(expression.name)) {
          reportedGlobals.add(expression.name);
          this.addDiagnostic(
            'library-export',
            `Exported ${declarationKind} ${declaration.name.name} cannot use non-const global variable: ${expression.name}`,
            expression.loc,
          );
        }
        return;
      }

      if (expression.type === 'CallExpression') {
        const calleePath = this.memberPath(expression.callee);
        if (calleePath[0] === 'input' && !reportedInputCall) {
          reportedInputCall = true;
          this.addDiagnostic(
            'library-export',
            `Exported ${declarationKind} ${declaration.name.name} cannot call input.*() functions`,
            expression.callee.loc,
          );
        }
        visitExpression(expression.callee, localNames);
        for (const argument of expression.arguments) visitExpression(argument.value, localNames);
        return;
      }

      switch (expression.type) {
        case 'NumericLiteral':
        case 'StringLiteral':
        case 'BooleanLiteral':
        case 'ColorLiteral':
        case 'NaExpression':
          return;
        case 'BinaryExpression':
          visitExpression(expression.left, localNames);
          visitExpression(expression.right, localNames);
          return;
        case 'UnaryExpression':
          visitExpression(expression.argument, localNames);
          return;
        case 'ConditionalExpression':
          visitExpression(expression.test, localNames);
          visitExpression(expression.consequent, localNames);
          visitExpression(expression.alternate, localNames);
          return;
        case 'SwitchExpression':
          if (expression.discriminant) visitExpression(expression.discriminant, localNames);
          for (const switchCase of expression.cases) {
            if (switchCase.test) visitExpression(switchCase.test, localNames);
            this.visitFunctionScopeNode(switchCase.consequent, new Set(localNames), visitExpression, visitStatement);
          }
          return;
        case 'ForStatement':
        case 'WhileStatement':
          visitStatement(expression, localNames);
          return;
        case 'MemberExpression':
          visitExpression(expression.object, localNames);
          return;
        case 'IndexExpression':
          visitExpression(expression.object, localNames);
          visitExpression(expression.index, localNames);
          return;
        case 'ArrayExpression':
          for (const element of expression.elements) visitExpression(element, localNames);
          return;
      }
    };

    const visitStatement = (statement: Statement, localNames: Set<string>): void => {
      switch (statement.type) {
        case 'VariableDeclaration':
          visitExpression(statement.init, localNames);
          for (const name of this.declaredNames(statement)) localNames.add(name);
          return;
        case 'AssignmentStatement':
          this.visitAssignmentTargetExpression(statement.left, localNames, visitExpression);
          visitExpression(statement.right, localNames);
          return;
        case 'ExpressionStatement':
          visitExpression(statement.expression, localNames);
          return;
        case 'IfStatement':
          visitExpression(statement.test, localNames);
          this.visitFunctionScopeNode(statement.consequent, new Set(localNames), visitExpression, visitStatement);
          if (Array.isArray(statement.alternate)) {
            this.visitFunctionScopeNode(statement.alternate, new Set(localNames), visitExpression, visitStatement);
          } else if (statement.alternate) {
            visitStatement(statement.alternate, new Set(localNames));
          }
          return;
        case 'ForStatement': {
          if (statement.kind === 'collection') {
            visitExpression(statement.iterable, localNames);
          } else {
            visitExpression(statement.start, localNames);
            visitExpression(statement.end, localNames);
            if (statement.step) visitExpression(statement.step, localNames);
          }
          const forLocals = new Set(localNames);
          forLocals.add(statement.counter.name);
          if (statement.kind === 'collection' && statement.indexCounter) forLocals.add(statement.indexCounter.name);
          this.visitFunctionScopeNode(statement.body, forLocals, visitExpression, visitStatement);
          return;
        }
        case 'WhileStatement':
          visitExpression(statement.test, localNames);
          this.visitFunctionScopeNode(statement.body, new Set(localNames), visitExpression, visitStatement);
          return;
        case 'FunctionDeclaration':
        case 'TypeDeclaration':
        case 'IndicatorDeclaration':
        case 'LibraryDeclaration':
        case 'ImportDeclaration':
        case 'BreakStatement':
        case 'ContinueStatement':
          return;
      }
    };

    for (const parameter of declaration.params) {
      if (parameter.defaultValue) visitExpression(parameter.defaultValue, functionLocals);
    }
    this.visitFunctionScopeNode(declaration.body, functionLocals, visitExpression, visitStatement);
  }

  private visitFunctionScopeNode(
    node: Expression | Statement[],
    localNames: Set<string>,
    visitExpression: (expression: Expression, localNames: Set<string>) => void,
    visitStatement: (statement: Statement, localNames: Set<string>) => void,
  ): void {
    if (Array.isArray(node)) {
      for (const statement of node) visitStatement(statement, localNames);
    } else {
      visitExpression(node, localNames);
    }
  }

  private visitAssignmentTargetExpression(
    target: AssignmentStatement['left'],
    localNames: Set<string>,
    visitExpression: (expression: Expression, localNames: Set<string>) => void,
  ): void {
    if (target.type === 'Identifier') {
      visitExpression(target, localNames);
      return;
    }
    if (target.type === 'MemberExpression') {
      visitExpression(target.object, localNames);
      return;
    }
    if (target.type === 'IndexExpression') {
      visitExpression(target.object, localNames);
      visitExpression(target.index, localNames);
    }
  }

  private declaredNames(statement: VariableDeclaration): string[] {
    if (statement.names.type === 'TupleDeclarator') return statement.names.names.map((name) => name.name);
    return [statement.names.name.name];
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
    this.typeDeclarations.set(statement.name.name, statement);
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
    if (statement.left.type === 'MemberExpression') {
      this.checkUdtFieldAssignmentType(statement.left, statement.right, scope);
    }
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
    this.checkUdtConstructorSignature(expression, scope);
    this.checkMapCallTypes(expression, scope);
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

    if (callee.type === 'MemberExpression') {
      this.checkExpression(callee.object, scope);
      return;
    }

    this.checkExpression(callee, scope);
  }

  private checkMemberExpression(expression: MemberExpression, scope: SemanticScope): void {
    if (expression.object.type === 'Identifier' && BUILTIN_NAMESPACES.has(expression.object.name)) {
      return;
    }
    if (expression.object.type === 'Identifier') {
      const objectSymbol = scope.lookup(expression.object.name);
      if (objectSymbol?.kind === 'type' || objectSymbol?.kind === 'import') {
        return;
      }
    }
    this.checkExpression(expression.object, scope);

    const objectType = this.inferExpressionType(expression.object, scope);
    if (objectType.kind !== 'udt' || !objectType.name || !this.typeDeclarations.has(objectType.name)) {
      return;
    }
    if (!this.findUdtField(objectType.name, expression.property.name)) {
      this.addDiagnostic(
        'unknown-field',
        `Unknown field '${expression.property.name}' on type ${objectType.name}`,
        expression.property.loc,
      );
    }
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

  private checkUdtConstructorSignature(expression: CallExpression, scope: SemanticScope): void {
    const calleePath = this.memberPath(expression.callee);
    if (calleePath.length !== 2 || calleePath[1] !== 'new') return;

    const typeName = calleePath[0];
    if (!typeName) return;
    const declaration = this.typeDeclarations.get(typeName);
    if (!declaration) return;

    const displayName = `${typeName}.new`;
    const fields = declaration.fields.map((field) => field.name.name);
    const positionalCount = this.leadingPositionalCount(expression.arguments);

    this.checkArgumentOrder(expression.arguments, displayName);

    if (positionalCount > fields.length) {
      this.addDiagnostic(
        'argument-count',
        `${displayName}() expects at most ${fields.length} argument${fields.length === 1 ? '' : 's'}`,
        expression.arguments[fields.length]?.loc,
      );
    }

    const seenNames = new Set<string>();
    let positionalIndex = 0;
    let hasNamedArgument = false;
    for (const argument of expression.arguments) {
      if (!argument.name) {
        if (hasNamedArgument) {
          positionalIndex += 1;
          continue;
        }
        const field = declaration.fields[positionalIndex];
        if (field) {
          this.checkUdtFieldValueType(typeName, field, argument.value, scope);
        }
        positionalIndex += 1;
        continue;
      }

      hasNamedArgument = true;
      const fieldName = argument.name.name;
      const field = this.findUdtField(typeName, fieldName);
      if (!field) {
        this.addDiagnostic('unknown-field', `Unknown field '${fieldName}' for ${displayName}()`, argument.name.loc);
        continue;
      }

      if (seenNames.has(fieldName) || fields.indexOf(fieldName) < positionalCount) {
        this.addDiagnostic('duplicate-argument', `Field '${fieldName}' for ${displayName}() was supplied multiple times`, argument.name.loc);
        continue;
      }

      seenNames.add(fieldName);
      this.checkUdtFieldValueType(typeName, field, argument.value, scope);
    }
  }

  private checkUdtFieldAssignmentType(target: MemberExpression, value: Expression, scope: SemanticScope): void {
    const objectType = this.inferExpressionType(target.object, scope);
    if (objectType.kind !== 'udt' || !objectType.name || !this.typeDeclarations.has(objectType.name)) {
      return;
    }

    const field = this.findUdtField(objectType.name, target.property.name);
    if (!field) return;

    this.checkUdtFieldValueType(objectType.name, field, value, scope);
  }

  private checkUdtFieldValueType(typeName: string, field: TypeFieldDeclaration, value: Expression, scope: SemanticScope): void {
    const targetType = this.typeFromAnnotation(field.typeAnnotation ?? undefined);
    if (!targetType) return;

    const sourceType = this.inferExpressionType(value, scope);
    if (this.isAssignableType(targetType, sourceType)) return;

    this.addDiagnostic(
      'type-mismatch',
      `Cannot assign ${sourceType.kind} value to ${targetType.kind} field ${typeName}.${field.name.name}`,
      value.loc,
    );
  }

  private checkMapCallTypes(expression: CallExpression, scope: SemanticScope): void {
    const mapCall = this.resolveMapCall(expression, scope);
    if (!mapCall) return;

    switch (mapCall.operation) {
      case 'put':
        this.checkMapArgumentType(mapCall.mapType.keyType, mapCall.keyArgument, 'map key', scope);
        this.checkMapArgumentType(mapCall.mapType.valueType, mapCall.valueArgument, 'map value', scope);
        break;
      case 'get':
      case 'contains':
      case 'remove':
        this.checkMapArgumentType(mapCall.mapType.keyType, mapCall.keyArgument, 'map key', scope);
        break;
    }
  }

  private resolveMapCall(
    expression: CallExpression,
    scope: SemanticScope,
  ): { operation: 'contains' | 'get' | 'put' | 'remove'; mapType: SemanticType; keyArgument?: Expression; valueArgument?: Expression } | null {
    if (expression.callee.type !== 'MemberExpression') return null;

    const methodName = expression.callee.property.name;
    if (!this.isCheckedMapOperation(methodName)) return null;

    const receiverType = this.inferExpressionType(expression.callee.object, scope);
    if (receiverType.kind === 'map') {
      return {
        operation: methodName,
        mapType: receiverType,
        keyArgument: expression.arguments[0]?.value,
        valueArgument: expression.arguments[1]?.value,
      };
    }

    if (expression.callee.object.type !== 'Identifier' || expression.callee.object.name !== 'map') return null;

    const mapArgument = expression.arguments[0]?.value;
    if (!mapArgument) return null;
    const mapType = this.inferExpressionType(mapArgument, scope);
    if (mapType.kind !== 'map') return null;

    return {
      operation: methodName,
      mapType,
      keyArgument: expression.arguments[1]?.value,
      valueArgument: expression.arguments[2]?.value,
    };
  }

  private isCheckedMapOperation(operation: string): operation is 'contains' | 'get' | 'put' | 'remove' {
    return operation === 'contains' || operation === 'get' || operation === 'put' || operation === 'remove';
  }

  private checkMapArgumentType(expectedType: SemanticType | undefined, argument: Expression | undefined, role: 'map key' | 'map value', scope: SemanticScope): void {
    if (!expectedType || !argument) return;

    const actualType = this.inferExpressionType(argument, scope);
    if (this.isAssignableType(expectedType, actualType)) return;

    this.addDiagnostic(
      'type-mismatch',
      `Cannot use ${actualType.kind} value as ${expectedType.kind} ${role}`,
      argument.loc,
    );
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
    const allowed = new Set(this.resolveSignatureParams(args, signature));
    for (const arg of args) {
      if (arg.name && !allowed.has(arg.name.name)) {
        this.addDiagnostic('unknown-argument', `Unknown argument '${arg.name.name}' for ${displayName}()`, arg.name.loc);
      }
    }
  }

  private checkArgumentCount(args: CallArgument[], signature: BuiltinSignature, displayName: string): void {
    const params = this.resolveSignatureParams(args, signature);
    const positionalCount = this.leadingPositionalCount(args);
    const suppliedNames = new Set(args.flatMap((arg) => (arg.name ? [arg.name.name] : [])));
    const boundParamCount = params.filter((param, index) => index < positionalCount || suppliedNames.has(param)).length;
    const minArgs = signature.minArgs ?? 0;
    const maxArgs = signature.maxArgs ?? params.length;

    if (boundParamCount < minArgs) {
      this.addDiagnostic('argument-count', `${displayName}() expects at least ${minArgs} argument${minArgs === 1 ? '' : 's'}`, args[0]?.loc);
    }
    if (positionalCount > maxArgs) {
      this.addDiagnostic('argument-count', `${displayName}() expects at most ${maxArgs} argument${maxArgs === 1 ? '' : 's'}`, args[maxArgs]?.loc);
    }
  }

  private checkDuplicateArgumentBindings(args: CallArgument[], signature: BuiltinSignature, displayName: string): void {
    const params = this.resolveSignatureParams(args, signature);
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

      const positionalIndex = params.indexOf(name);
      if (positionalIndex !== -1 && positionalIndex < positionalCount) {
        this.addDiagnostic('duplicate-argument', `Argument '${name}' for ${displayName}() was supplied multiple times`, arg.name.loc);
      }
    }
  }

  private resolveSignatureParams(args: CallArgument[], signature: BuiltinSignature): string[] {
    if (!signature.overloads) return signature.params;

    const suppliedNames = new Set(args.flatMap((arg) => (arg.name ? [arg.name.name] : [])));
    const thirdPositional = args.filter((arg) => !arg.name)[2]?.value;
    const usesOptionsOverload = suppliedNames.has('options') || thirdPositional?.type === 'ArrayExpression';
    const optionsOverload = signature.overloads.find((params) => params.includes('options'));
    const rangeOverload = signature.overloads.find((params) => params.includes('minval'));

    return (usesOptionsOverload ? optionsOverload : rangeOverload) ?? signature.params;
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
      if (!TYPE_QUALIFIER_NAMES.has(annotation.keyType) && !MAP_KEY_TYPE_NAMES.has(annotation.keyType)) {
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
        return this.inferMemberExpressionType(expression, scope);
      case 'IndexExpression':
        return { kind: 'unknown', qualifier: 'series' };
      default:
        return { kind: 'unknown' };
    }
  }

  private inferIdentifierType(identifier: Identifier, scope: SemanticScope): SemanticType {
    if (['close', 'high', 'hl2', 'hlc3', 'low', 'ohlc4', 'open', 'time', 'time_close', 'time_tradingday', 'timenow', 'last_bar_time', 'volume'].includes(identifier.name)) {
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
    if (namespace === 'request' || namespace === 'ta' || namespace === 'time' || namespace === 'time_close' || calleePath.join('.') === 'timeframe.change') {
      return { kind: 'unknown', qualifier: 'series' };
    }
    if (calleePath.join('.') === 'timeframe.in_seconds') return { kind: 'int', qualifier: 'simple' };
    if (calleePath.join('.') === 'timeframe.from_seconds') return { kind: 'string', qualifier: 'simple' };
    if (CALENDAR_FUNCTION_NAMES.has(calleePath.join('.'))) return { kind: 'int', qualifier: 'series' };
    if (calleePath.join('.') === 'timestamp') return { kind: 'int', qualifier: 'const' };
    if (calleePath.length === 2 && calleePath[1] === 'new' && calleePath[0] && this.typeDeclarations.has(calleePath[0])) {
      return { kind: 'udt', name: calleePath[0] };
    }
    return { kind: 'unknown', qualifier: this.inferMaxQualifier(expression.arguments.map((argument) => argument.value), scope) };
  }

  private inferMemberExpressionType(expression: MemberExpression, scope: SemanticScope): SemanticType {
    const objectType = this.inferExpressionType(expression.object, scope);
    if (objectType.kind !== 'udt' || !objectType.name) return objectType;

    const field = this.findUdtField(objectType.name, expression.property.name);
    return this.typeFromAnnotation(field?.typeAnnotation ?? undefined) ?? { kind: 'unknown', qualifier: objectType.qualifier };
  }

  private memberPath(expression: Expression): string[] {
    if (expression.type === 'Identifier') return [expression.name];
    if (expression.type !== 'MemberExpression') return [];
    return [...this.memberPath(expression.object), expression.property.name];
  }

  private findUdtField(typeName: string, fieldName: string): TypeFieldDeclaration | undefined {
    return this.typeDeclarations.get(typeName)?.fields.find((field) => field.name.name === fieldName);
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

  private isAssignableType(targetType: SemanticType, sourceType: SemanticType): boolean {
    if (targetType.kind === 'unknown' || sourceType.kind === 'unknown') return true;

    if (!PRIMITIVE_TYPE_KINDS.has(targetType.kind) || !PRIMITIVE_TYPE_KINDS.has(sourceType.kind)) return true;

    return targetType.kind === sourceType.kind || (targetType.kind === 'float' && sourceType.kind === 'int');
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
