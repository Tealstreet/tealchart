import type {
  ArrayExpression,
  BinaryExpression,
  CallExpression,
  Expression,
  Identifier,
  IfStatement,
  MemberExpression,
  Program,
  Statement,
  SwitchExpression,
  TypeAnnotation,
  TypeDeclaration,
  VariableDeclaration,
} from '../parser/ast';
import { BUILTIN_GLOBAL_TYPES } from '../builtinMetadata';
import type { SemanticCheckResult, SemanticQualifier, SemanticSymbol, SemanticType, SemanticTypeKind } from './checker';

export type SemanticTypeInvariantCode =
  | 'semantic-type-mismatch'
  | 'semantic-qualifier-mismatch'
  | 'tuple-arity-mismatch';

export interface SemanticTypeInvariantIssue {
  code: SemanticTypeInvariantCode;
  message: string;
  line?: number;
  column?: number;
  symbolName?: string;
  expected?: string;
  actual?: string;
}

interface InvariantScope {
  parent?: InvariantScope;
  symbols: Map<string, SemanticType>;
  typeFields: Map<string, Map<string, SemanticType>>;
}

type InferredType =
  | { kind: 'known'; type: SemanticType }
  | { kind: 'tuple'; elements: SemanticType[] }
  | { kind: 'unknown' };

export interface SemanticTypeInvariantCoverage {
  totalExpressions: number;
  typedExpressions: number;
  knownExpressions: number;
  tupleExpressions: number;
  unknownExpressions: number;
  byExpressionType: Record<string, { total: number; typed: number; unknown: number }>;
  unknownCalls: Record<string, number>;
  unknownMembers: Record<string, number>;
}

const QUALIFIER_ORDER: SemanticQualifier[] = ['const', 'input', 'simple', 'series'];
const NUMERIC_KINDS = new Set<SemanticTypeKind>(['int', 'float']);
const COMPARISON_OPERATORS = new Set(['==', '!=', '<', '>', '<=', '>=']);
const LOGICAL_OPERATORS = new Set(['and', 'or']);
const ARITHMETIC_OPERATORS = new Set(['+', '-', '*', '/', '%']);
const REFERENCE_CONSTRUCTOR_TYPES = new Map<string, SemanticTypeKind>([
  ['box.new', 'box'],
  ['chart.point.new', 'chart.point'],
  ['chart.point.from_index', 'chart.point'],
  ['chart.point.from_time', 'chart.point'],
  ['chart.point.now', 'chart.point'],
  ['label.new', 'label'],
  ['line.new', 'line'],
  ['linefill.new', 'linefill'],
  ['map.new', 'map'],
  ['matrix.new', 'matrix'],
  ['polyline.new', 'polyline'],
  ['table.new', 'table'],
]);
const INPUT_RETURN_TYPES = new Map<string, SemanticTypeKind>([
  ['input.bool', 'bool'],
  ['input.color', 'color'],
  ['input.float', 'float'],
  ['input.int', 'int'],
  ['input.price', 'float'],
  ['input.session', 'string'],
  ['input.string', 'string'],
  ['input.symbol', 'string'],
  ['input.text_area', 'string'],
  ['input.time', 'int'],
  ['input.timeframe', 'string'],
]);
const ARRAY_CONSTRUCTOR_ELEMENT_TYPES = new Map<string, SemanticTypeKind>([
  ['array.new_bool', 'bool'],
  ['array.new_box', 'box'],
  ['array.new_chart_point', 'chart.point'],
  ['array.new_color', 'color'],
  ['array.new_float', 'float'],
  ['array.new_int', 'int'],
  ['array.new_label', 'label'],
  ['array.new_line', 'line'],
  ['array.new_linefill', 'linefill'],
  ['array.new_polyline', 'polyline'],
  ['array.new_string', 'string'],
  ['array.new_table', 'table'],
]);
const COLOR_RETURN_CALLS = new Set(['color.new', 'color.rgb', 'color.from_gradient']);
const STRING_RETURN_CALLS = new Set([
  'str.format',
  'str.lower',
  'str.replace',
  'str.replace_all',
  'str.substring',
  'str.tostring',
  'str.trim',
  'str.upper',
]);
const STRING_INT_RETURN_CALLS = new Set(['str.length', 'str.pos']);
const MATH_FLOAT_RETURN_CALLS = new Set([
  'math.acos',
  'math.asin',
  'math.atan',
  'math.avg',
  'math.cos',
  'math.exp',
  'math.log',
  'math.log10',
  'math.pow',
  'math.random',
  'math.sin',
  'math.sqrt',
  'math.tan',
  'math.todegrees',
  'math.toradians',
]);
const MATH_PRESERVE_NUMERIC_CALLS = new Set(['math.abs', 'math.max', 'math.min']);
const MATH_INT_RETURN_CALLS = new Set(['math.ceil', 'math.floor', 'math.trunc']);
const ARRAY_ELEMENT_READ_METHODS = new Set(['first', 'get', 'last', 'pop', 'remove', 'shift']);
const ARRAY_INT_RETURN_METHODS = new Set([
  'binary_search',
  'binary_search_leftmost',
  'binary_search_rightmost',
  'indexof',
  'lastindexof',
  'size',
]);
const ARRAY_BOOL_RETURN_METHODS = new Set(['every', 'includes', 'some']);
const ARRAY_FLOAT_RETURN_METHODS = new Set([
  'avg',
  'covariance',
  'median',
  'percentile_linear_interpolation',
  'percentile_nearest_rank',
  'percentrank',
  'range',
  'stdev',
  'sum',
  'variance',
]);
const ARRAY_ELEMENT_RETURN_METHODS = new Set(['max', 'min', 'mode']);
const ARRAY_VOID_RETURN_METHODS = new Set(['clear', 'fill', 'insert', 'push', 'reverse', 'set', 'sort', 'unshift']);
const MATRIX_INT_RETURN_METHODS = new Set(['columns', 'elements_count', 'rows']);
const TA_BOOL_RETURN_CALLS = new Set(['ta.cross', 'ta.crossover', 'ta.crossunder', 'ta.falling', 'ta.rising']);
const TA_INT_RETURN_CALLS = new Set(['ta.barssince', 'ta.highestbars', 'ta.lowestbars']);
const TA_FLOAT_RETURN_CALLS = new Set([
  'ta.adx',
  'ta.alma',
  'ta.atr',
  'ta.bbw',
  'ta.cci',
  'ta.cmo',
  'ta.cog',
  'ta.correlation',
  'ta.covariance',
  'ta.cum',
  'ta.dema',
  'ta.dev',
  'ta.ema',
  'ta.hma',
  'ta.linreg',
  'ta.max',
  'ta.mfi',
  'ta.min',
  'ta.obv',
  'ta.percentile_linear_interpolation',
  'ta.percentile_nearest_rank',
  'ta.percentrank',
  'ta.rma',
  'ta.smma',
  'ta.roc',
  'ta.rci',
  'ta.rsi',
  'ta.sar',
  'ta.sma',
  'ta.sum',
  'ta.stdev',
  'ta.stoch',
  'ta.swma',
  'ta.tema',
  'ta.tr',
  'ta.tsi',
  'ta.variance',
  'ta.vwma',
  'ta.wma',
  'ta.wpr',
]);
const TA_SOURCE_RETURN_CALLS = new Map<string, { params: string[]; index: number }>([
  ['ta.change', { params: ['source', 'length'], index: 0 }],
  ['ta.median', { params: ['source', 'length'], index: 0 }],
  ['ta.mode', { params: ['source', 'length'], index: 0 }],
  ['ta.mom', { params: ['source', 'length'], index: 0 }],
  ['ta.range', { params: ['source', 'length'], index: 0 }],
  ['ta.valuewhen', { params: ['condition', 'source', 'occurrence'], index: 1 }],
]);
const TA_DEFAULT_SOURCE_RETURN_CALLS = new Set(['ta.highest', 'ta.lowest', 'ta.pivothigh', 'ta.pivotlow']);

export function checkSemanticTypeInvariants(program: Program, result: SemanticCheckResult): SemanticTypeInvariantIssue[] {
  const issues: SemanticTypeInvariantIssue[] = [];
  const rootScope = createScope();
  seedTypeDeclarations(program.body, rootScope);
  const checkerSymbols = new Map(result.symbols.map((symbol) => [symbol.name, symbol]));
  const reassignedNames = collectReassignedNames(program.body);
  const taintedNames = new Set<string>(reassignedNames);

  checkStatements(program.body, rootScope, checkerSymbols, reassignedNames, taintedNames, issues);

  return dedupeIssues(issues);
}

export function analyzeSemanticTypeInvariantCoverage(program: Program, _result: SemanticCheckResult): SemanticTypeInvariantCoverage {
  const scope = createScope();
  seedTypeDeclarations(program.body, scope);
  const stats = createCoverageStats();
  collectStatementCoverage(program.body, scope, stats);
  return stats;
}

function checkStatements(
  statements: Statement[],
  scope: InvariantScope,
  checkerSymbols: Map<string, SemanticSymbol>,
  reassignedNames: Set<string>,
  taintedNames: Set<string>,
  issues: SemanticTypeInvariantIssue[],
): void {
  for (const statement of statements) {
    if (statement.type === 'VariableDeclaration') {
      checkVariableDeclaration(statement, scope, checkerSymbols, reassignedNames, taintedNames, issues);
      continue;
    }
    if (statement.type === 'MultiDeclaration') {
      for (const declaration of statement.declarations) checkVariableDeclaration(declaration, scope, checkerSymbols, reassignedNames, taintedNames, issues);
      continue;
    }
  }
}

function collectStatementCoverage(
  statements: Statement[],
  scope: InvariantScope,
  stats: SemanticTypeInvariantCoverage,
): void {
  for (const statement of statements) {
    switch (statement.type) {
      case 'VariableDeclaration':
        collectInitializerCoverage(statement.init, scope, stats);
        checkLocalDeclaration(statement, scope);
        break;
      case 'MultiDeclaration':
        for (const declaration of statement.declarations) {
          collectInitializerCoverage(declaration.init, scope, stats);
          checkLocalDeclaration(declaration, scope);
        }
        break;
      case 'AssignmentStatement':
        collectInitializerCoverage(statement.right, scope, stats);
        break;
      case 'TupleAssignment':
        collectInitializerCoverage(statement.right, scope, stats);
        break;
      case 'ExpressionStatement':
        collectExpressionCoverage(statement.expression, scope, stats);
        break;
      case 'IfStatement':
        collectExpressionCoverage(statement.test, scope, stats);
        collectStatementCoverage(statement.consequent, createScope(scope), stats);
        if (Array.isArray(statement.alternate)) collectStatementCoverage(statement.alternate, createScope(scope), stats);
        else if (statement.alternate) collectStatementCoverage([statement.alternate], createScope(scope), stats);
        break;
      case 'ForStatement':
        if (statement.kind === 'numeric') {
          collectExpressionCoverage(statement.start, scope, stats);
          collectExpressionCoverage(statement.end, scope, stats);
          if (statement.step) collectExpressionCoverage(statement.step, scope, stats);
        } else {
          collectExpressionCoverage(statement.iterable, scope, stats);
        }
        collectStatementCoverage(statement.body, createScope(scope), stats);
        break;
      case 'WhileStatement':
        collectExpressionCoverage(statement.test, scope, stats);
        collectStatementCoverage(statement.body, createScope(scope), stats);
        break;
      case 'OnceStatement':
        if (statement.test) collectExpressionCoverage(statement.test, scope, stats);
        collectStatementCoverage(statement.body, createScope(scope), stats);
        break;
      case 'FunctionDeclaration':
        if (Array.isArray(statement.body)) collectStatementCoverage(statement.body, createScope(scope), stats);
        else collectExpressionCoverage(statement.body, createScope(scope), stats);
        break;
      case 'MultiStatement':
        collectStatementCoverage(statement.statements, scope, stats);
        break;
      default:
        break;
    }
  }
}

function collectInitializerCoverage(
  init: Expression | IfStatement,
  scope: InvariantScope,
  stats: SemanticTypeInvariantCoverage,
): void {
  if (isExpression(init)) {
    collectExpressionCoverage(init, scope, stats);
    return;
  }
  collectExpressionCoverage(init.test, scope, stats);
  collectStatementCoverage(init.consequent, createScope(scope), stats);
  if (Array.isArray(init.alternate)) collectStatementCoverage(init.alternate, createScope(scope), stats);
  else if (init.alternate) collectInitializerCoverage(init.alternate, createScope(scope), stats);
}

function collectExpressionCoverage(
  expression: Expression,
  scope: InvariantScope,
  stats: SemanticTypeInvariantCoverage,
): void {
  recordExpressionCoverage(expression, inferExpression(expression, scope), stats);
  switch (expression.type) {
    case 'BinaryExpression':
      collectExpressionCoverage(expression.left, scope, stats);
      collectExpressionCoverage(expression.right, scope, stats);
      return;
    case 'UnaryExpression':
      collectExpressionCoverage(expression.argument, scope, stats);
      return;
    case 'ConditionalExpression':
      collectExpressionCoverage(expression.test, scope, stats);
      collectExpressionCoverage(expression.consequent, scope, stats);
      collectExpressionCoverage(expression.alternate, scope, stats);
      return;
    case 'SwitchExpression':
      if (expression.discriminant) collectExpressionCoverage(expression.discriminant, scope, stats);
      for (const switchCase of expression.cases) {
        if (switchCase.test) collectExpressionCoverage(switchCase.test, scope, stats);
        if (Array.isArray(switchCase.consequent)) collectStatementCoverage(switchCase.consequent, createScope(scope), stats);
        else collectExpressionCoverage(switchCase.consequent, createScope(scope), stats);
      }
      return;
    case 'CallExpression':
      collectExpressionCoverage(expression.callee, scope, stats);
      for (const argument of expression.arguments) collectExpressionCoverage(argument.value, scope, stats);
      return;
    case 'MemberExpression':
      collectExpressionCoverage(expression.object, scope, stats);
      return;
    case 'IndexExpression':
      collectExpressionCoverage(expression.object, scope, stats);
      collectExpressionCoverage(expression.index, scope, stats);
      return;
    case 'ArrayExpression':
      for (const element of expression.elements) collectExpressionCoverage(element, scope, stats);
      return;
    case 'ForStatement':
      if (expression.kind === 'numeric') {
        collectExpressionCoverage(expression.start, scope, stats);
        collectExpressionCoverage(expression.end, scope, stats);
        if (expression.step) collectExpressionCoverage(expression.step, scope, stats);
      } else {
        collectExpressionCoverage(expression.iterable, scope, stats);
      }
      collectStatementCoverage(expression.body, createScope(scope), stats);
      return;
    case 'WhileStatement':
      collectExpressionCoverage(expression.test, scope, stats);
      collectStatementCoverage(expression.body, createScope(scope), stats);
      return;
    case 'LambdaExpression':
      collectExpressionCoverage(expression.body, createScope(scope), stats);
      return;
    default:
      return;
  }
}

function recordExpressionCoverage(
  expression: Expression,
  inferred: InferredType,
  stats: SemanticTypeInvariantCoverage,
): void {
  const typed = inferred.kind !== 'unknown';
  stats.totalExpressions += 1;
  if (typed) stats.typedExpressions += 1;
  if (inferred.kind === 'known') stats.knownExpressions += 1;
  if (inferred.kind === 'tuple') stats.tupleExpressions += 1;
  if (inferred.kind === 'unknown') stats.unknownExpressions += 1;
  const byType = stats.byExpressionType[expression.type] ?? { total: 0, typed: 0, unknown: 0 };
  byType.total += 1;
  if (typed) byType.typed += 1;
  else byType.unknown += 1;
  stats.byExpressionType[expression.type] = byType;
  if (inferred.kind !== 'unknown') return;
  if (expression.type === 'CallExpression') {
    increment(stats.unknownCalls, memberPath(expression.callee).join('.') || expression.callee.type);
  } else if (expression.type === 'MemberExpression') {
    increment(stats.unknownMembers, memberPath(expression).join('.') || expression.property.name);
  }
}

function checkVariableDeclaration(
  declaration: VariableDeclaration,
  scope: InvariantScope,
  checkerSymbols: Map<string, SemanticSymbol>,
  reassignedNames: Set<string>,
  taintedNames: Set<string>,
  issues: SemanticTypeInvariantIssue[],
): void {
  const declaredType = declaration.typeAnnotation ? typeFromAnnotation(declaration.typeAnnotation) : undefined;
  const inferred = inferInitializer(declaration.init, scope);

  if (declaration.names.type === 'VariableDeclarator') {
    const name = declaration.names.name.name;
    const expected = expectedDeclarationType(declaredType, inferred);
    const tainted = initializerReferencesName(declaration.init, taintedNames);
    if (expected) {
      if (!reassignedNames.has(name) && !tainted) {
        compareSymbolType(name, expected, checkerSymbols.get(name)?.type, declaration.names.name, issues);
      }
      scope.symbols.set(name, expected);
    }
    if (tainted) taintedNames.add(name);
    return;
  }

  if (inferred.kind !== 'tuple') return;
  if (declaration.names.names.length !== inferred.elements.length) {
    issues.push({
      code: 'tuple-arity-mismatch',
      message: `Tuple declaration has ${declaration.names.names.length} names but initializer has ${inferred.elements.length} elements`,
      line: declaration.names.loc?.start.line ?? declaration.loc?.start.line,
      column: declaration.names.loc?.start.column ?? declaration.loc?.start.column,
    });
    return;
  }

  const tainted = initializerReferencesName(declaration.init, taintedNames);
  declaration.names.names.forEach((identifier, index) => {
    const expected = inferred.elements[index];
    if (!reassignedNames.has(identifier.name) && !tainted) {
      compareSymbolType(identifier.name, expected, checkerSymbols.get(identifier.name)?.type, identifier, issues);
    }
    scope.symbols.set(identifier.name, expected);
    if (tainted) taintedNames.add(identifier.name);
  });
}

function inferInitializer(init: Expression | IfStatement, scope: InvariantScope): InferredType {
  if (isExpression(init)) return inferExpression(init, scope);
  return inferIfStatement(init, scope);
}

function inferExpression(expression: Expression, scope: InvariantScope): InferredType {
  switch (expression.type) {
    case 'NumericLiteral':
      return known({
        kind: Number.isInteger(expression.value) && !/[.eE]/.test(expression.raw) ? 'int' : 'float',
        qualifier: 'const',
      });
    case 'StringLiteral':
      return known({ kind: 'string', qualifier: 'const' });
    case 'BooleanLiteral':
      return known({ kind: 'bool', qualifier: 'const' });
    case 'ColorLiteral':
      return known({ kind: 'color', qualifier: 'const' });
    case 'Identifier':
      return inferIdentifier(expression, scope);
    case 'MemberExpression':
      return inferMemberExpression(expression, scope);
    case 'UnaryExpression': {
      const argument = inferKnown(expression.argument, scope);
      if (!argument) return unknown();
      if ((expression.operator === '-' || expression.operator === '+') && isNumeric(argument)) return known(argument);
      if (expression.operator === 'not' && argument.kind === 'bool') return known({ kind: 'bool', qualifier: argument.qualifier });
      return unknown();
    }
    case 'BinaryExpression':
      return inferBinaryExpression(expression, scope);
    case 'ConditionalExpression': {
      const test = inferKnown(expression.test, scope);
      const consequent = inferKnown(expression.consequent, scope);
      const alternate = inferKnown(expression.alternate, scope);
      if (!test || !consequent || !alternate) return unknown();
      const merged = mergeValueTypes(consequent, alternate);
      if (!merged) return unknown();
      return known({ ...merged, qualifier: maxQualifier(test, consequent, alternate) });
    }
    case 'SwitchExpression':
      return inferSwitchExpression(expression, scope);
    case 'ArrayExpression':
      return inferArrayExpression(expression, scope);
    case 'CallExpression':
      return inferCallExpression(expression, scope);
    case 'IndexExpression': {
      const object = inferKnown(expression.object, scope);
      if (!object) return unknown();
      return known({ ...object, qualifier: 'series' });
    }
    default:
      return unknown();
  }
}

function inferIfStatement(statement: IfStatement, scope: InvariantScope): InferredType {
  const test = inferKnown(statement.test, scope);
  const consequent = inferStatementBlockValue(statement.consequent, createScope(scope));
  const alternate = Array.isArray(statement.alternate)
    ? inferStatementBlockValue(statement.alternate, createScope(scope))
    : statement.alternate
      ? inferIfStatement(statement.alternate, scope)
      : undefined;
  const consequentType = consequent.kind === 'known' ? consequent.type : undefined;
  const alternateType = alternate?.kind === 'known' ? alternate.type : undefined;
  if (!test || !consequentType || !alternateType) return unknown();
  const merged = mergeValueTypes(consequentType, alternateType);
  if (!merged) return unknown();
  return known({ ...merged, qualifier: maxQualifier(test, consequentType, alternateType) });
}

function inferStatementBlockValue(statements: Statement[], scope: InvariantScope): InferredType {
  let value: InferredType = unknown();
  for (const statement of statements) {
    if (statement.type === 'VariableDeclaration') {
      checkLocalDeclaration(statement, scope);
      value = unknown();
      continue;
    }
    if (statement.type === 'ExpressionStatement') {
      value = inferExpression(statement.expression, scope);
      continue;
    }
    if (statement.type === 'IfStatement') {
      value = inferIfStatement(statement, scope);
      continue;
    }
    value = unknown();
  }
  return value;
}

function checkLocalDeclaration(declaration: VariableDeclaration, scope: InvariantScope): void {
  const declaredType = declaration.typeAnnotation ? typeFromAnnotation(declaration.typeAnnotation) : undefined;
  const inferred = inferInitializer(declaration.init, scope);
  if (declaration.names.type === 'VariableDeclarator') {
    const expected = declaredType ?? (inferred.kind === 'known' ? inferred.type : undefined);
    if (expected) scope.symbols.set(declaration.names.name.name, expected);
    return;
  }
  if (inferred.kind !== 'tuple') return;
  declaration.names.names.forEach((identifier, index) => {
    const expected = inferred.elements[index];
    if (expected) scope.symbols.set(identifier.name, expected);
  });
}

function inferBinaryExpression(expression: BinaryExpression, scope: InvariantScope): InferredType {
  const left = inferKnown(expression.left, scope);
  const right = inferKnown(expression.right, scope);
  if (!left || !right) return unknown();
  const qualifier = maxQualifier(left, right);

  if (COMPARISON_OPERATORS.has(expression.operator) || LOGICAL_OPERATORS.has(expression.operator)) {
    return known({ kind: 'bool', qualifier });
  }

  if (expression.operator === '+' && left.kind === 'string' && right.kind === 'string') {
    return known({ kind: 'string', qualifier });
  }

  if (ARITHMETIC_OPERATORS.has(expression.operator) && isNumeric(left) && isNumeric(right)) {
    return known({
      kind: left.kind === 'float' || right.kind === 'float' || expression.operator === '/' ? 'float' : 'int',
      qualifier,
    });
  }

  return unknown();
}

function inferSwitchExpression(expression: SwitchExpression, scope: InvariantScope): InferredType {
  const controlTypes: SemanticType[] = [];
  if (expression.discriminant) {
    const discriminant = inferKnown(expression.discriminant, scope);
    if (!discriminant) return unknown();
    controlTypes.push(discriminant);
  }
  for (const switchCase of expression.cases) {
    if (!switchCase.test) continue;
    const test = inferKnown(switchCase.test, scope);
    if (!test) return unknown();
    controlTypes.push(test);
  }
  let merged: SemanticType | undefined;

  for (const switchCase of expression.cases) {
    const caseType = Array.isArray(switchCase.consequent)
      ? inferStatementBlockValue(switchCase.consequent, createScope(scope))
      : inferExpression(switchCase.consequent, createScope(scope));
    if (caseType.kind !== 'known') return unknown();
    merged = merged ? mergeValueTypes(merged, caseType.type) : caseType.type;
    if (!merged) return unknown();
  }

  if (!merged) return unknown();
  return known({ ...merged, qualifier: maxQualifier(merged, ...controlTypes) });
}

function inferArrayExpression(expression: ArrayExpression, scope: InvariantScope): InferredType {
  const elements = expression.elements.map((element) => inferKnown(element, scope));
  if (elements.some((element) => !element)) return unknown();
  return { kind: 'tuple', elements: elements as SemanticType[] };
}

function inferCallExpression(expression: CallExpression, scope: InvariantScope): InferredType {
  const calleeName = memberPath(expression.callee).join('.');
  const referenceType = REFERENCE_CONSTRUCTOR_TYPES.get(calleeName);
  if (referenceType) return known({ kind: referenceType, qualifier: 'series' });
  if (calleeName === 'plot') return known({ kind: 'plot', qualifier: 'series' });
  if (calleeName === 'hline') return known({ kind: 'hline', qualifier: 'series' });
  const inputType = inferInputCallExpression(expression, scope, calleeName);
  if (inputType) return known(inputType);
  const collectionType = inferCollectionCallExpression(expression, scope, calleeName);
  if (collectionType) return known(collectionType);
  const udtType = inferUdtConstructorCall(expression, scope);
  if (udtType) return known(udtType);
  const colorType = inferColorCallExpression(expression, scope, calleeName);
  if (colorType) return known(colorType);
  const stringType = inferStringCallExpression(expression, scope, calleeName);
  if (stringType) return known(stringType);
  const mathType = inferMathCallExpression(expression, scope, calleeName);
  if (mathType) return known(mathType);
  const taType = inferTaCallExpression(expression, scope, calleeName);
  if (taType) return known(taType);
  const timeType = inferTimeCallExpression(calleeName);
  if (timeType) return known(timeType);
  if (calleeName === 'na') {
    const argumentTypes = expression.arguments.map((argument) => inferKnown(argument.value, scope));
    return known({ kind: 'bool', qualifier: maxQualifier(...argumentTypes) });
  }
  if (calleeName === 'nz' || calleeName === 'fixnan') {
    const source = callArgumentType(expression, scope, ['source', 'replacement'], 0);
    const replacement = callArgumentType(expression, scope, ['source', 'replacement'], 1);
    if (!source) return unknown();
    if (source && replacement) {
      const merged = mergeValueTypes(source, replacement);
      if (merged) return known(merged);
    }
    if (source) return known(source);
    return unknown();
  }
  if (calleeName === 'int' || calleeName === 'float' || calleeName === 'bool' || calleeName === 'string') {
    const argumentTypes = expression.arguments.map((argument) => inferKnown(argument.value, scope));
    if (argumentTypes.some((argumentType) => !argumentType)) return unknown();
    return known({ kind: calleeName as SemanticTypeKind, qualifier: maxQualifier(...argumentTypes) });
  }
  return unknown();
}

function inferInputCallExpression(expression: CallExpression, scope: InvariantScope, calleeName: string): SemanticType | undefined {
  if (calleeName === 'input.source') {
    const source = callArgumentType(expression, scope, ['defval'], 0);
    return { kind: source?.kind === 'int' ? 'int' : 'float' };
  }
  const kind = INPUT_RETURN_TYPES.get(calleeName);
  if (kind) return { kind, qualifier: 'input' };
  return undefined;
}

function inferCollectionCallExpression(expression: CallExpression, scope: InvariantScope, calleeName: string): SemanticType | undefined {
  if (calleeName === 'array.from') {
    return { kind: 'array', qualifier: 'series', elementType: inferArrayElementType(expression.arguments.map((argument) => argument.value), scope) };
  }
  if (calleeName === 'array.new' && expression.typeArguments?.length === 1) {
    return { kind: 'array', qualifier: 'series', elementType: typeFromAnnotationName(expression.typeArguments[0] ?? 'unknown') };
  }
  if (calleeName === 'matrix.new' && expression.typeArguments?.length === 1) {
    return { kind: 'matrix', qualifier: 'series', elementType: typeFromAnnotationName(expression.typeArguments[0] ?? 'unknown') };
  }
  if (calleeName === 'map.new' && expression.typeArguments?.length === 2) {
    return {
      kind: 'map',
      qualifier: 'series',
      keyType: typeFromAnnotationName(expression.typeArguments[0] ?? 'unknown'),
      valueType: typeFromAnnotationName(expression.typeArguments[1] ?? 'unknown'),
    };
  }
  const arrayElementKind = ARRAY_CONSTRUCTOR_ELEMENT_TYPES.get(calleeName);
  if (arrayElementKind) return { kind: 'array', qualifier: 'series', elementType: { kind: arrayElementKind } };
  const methodName = expression.callee.type === 'MemberExpression' ? expression.callee.property.name : undefined;
  if (!methodName) return undefined;
  const receiver = collectionReceiverType(expression, scope);
  if (receiver?.kind === 'array') return inferArrayMethodType(methodName, receiver);
  if (receiver?.kind === 'matrix') return inferMatrixMethodType(methodName, receiver, expression, scope);
  if (receiver?.kind === 'map') return inferMapMethodType(methodName, receiver);
  return undefined;
}

function inferUdtConstructorCall(expression: CallExpression, scope: InvariantScope): SemanticType | undefined {
  const path = memberPath(expression.callee);
  if (path.length !== 2 || path[1] !== 'new' || !path[0]) return undefined;
  if (!lookupTypeFields(scope, path[0])) return undefined;
  return { kind: 'udt', qualifier: 'series', name: path[0] };
}

function inferArrayMethodType(methodName: string, receiver: SemanticType): SemanticType | undefined {
  if (ARRAY_ELEMENT_READ_METHODS.has(methodName)) return receiver.elementType;
  if (ARRAY_INT_RETURN_METHODS.has(methodName)) return { kind: 'int' };
  if (ARRAY_BOOL_RETURN_METHODS.has(methodName)) return { kind: 'bool' };
  if (ARRAY_FLOAT_RETURN_METHODS.has(methodName)) return { kind: 'float' };
  if (ARRAY_ELEMENT_RETURN_METHODS.has(methodName)) return receiver.elementType;
  if (ARRAY_VOID_RETURN_METHODS.has(methodName)) return { kind: 'void' };
  if (methodName === 'join') return { kind: 'string' };
  if (methodName === 'copy' || methodName === 'slice' || methodName === 'concat') return {
    kind: 'array',
    qualifier: 'series',
    elementType: receiver.elementType,
  };
  return undefined;
}

function inferMatrixMethodType(
  methodName: string,
  receiver: SemanticType,
  expression: CallExpression,
  scope: InvariantScope,
): SemanticType | undefined {
  if (methodName === 'get') return receiver.elementType;
  if (MATRIX_INT_RETURN_METHODS.has(methodName)) return { kind: 'int' };
  if (methodName === 'is_valid') return { kind: 'bool' };
  if (methodName === 'row' || methodName === 'col' || methodName === 'column') return {
    kind: 'array',
    qualifier: 'series',
    elementType: receiver.elementType,
  };
  if (methodName === 'copy' || methodName === 'inv' || methodName === 'pinv' || methodName === 'pow') return {
    kind: 'matrix',
    qualifier: 'series',
    elementType: methodName === 'copy' ? receiver.elementType : { kind: 'float' },
  };
  if (methodName === 'eigenvalues') return { kind: 'array', qualifier: 'series', elementType: { kind: 'float' } };
  if (methodName === 'mult') {
    const namespaceCall = expression.callee.type === 'MemberExpression'
      && expression.callee.object.type === 'Identifier'
      && expression.callee.object.name === 'matrix';
    const positional = expression.arguments.filter((argument) => !argument.name);
    const secondExpression = expression.arguments.find((argument) => argument.name?.name === 'id2')?.value
      ?? positional[namespaceCall ? 1 : 0]?.value;
    const second = secondExpression ? inferKnown(secondExpression, scope) : undefined;
    if (!second) return undefined;
    if (second?.kind === 'array') {
      return {
        kind: 'array',
        qualifier: 'series',
        elementType: mergeValueTypes(receiver.elementType ?? { kind: 'unknown' }, second.elementType ?? { kind: 'unknown' }) ?? receiver.elementType ?? { kind: 'unknown' },
      };
    }
    return { kind: 'matrix', qualifier: 'series', elementType: receiver.elementType };
  }
  return undefined;
}

function inferMapMethodType(methodName: string, receiver: SemanticType): SemanticType | undefined {
  if (methodName === 'get' || methodName === 'put' || methodName === 'remove') return receiver.valueType;
  if (methodName === 'contains') return { kind: 'bool' };
  if (methodName === 'copy') return receiver;
  if (methodName === 'keys') return { kind: 'array', qualifier: 'series', elementType: receiver.keyType };
  if (methodName === 'values') return { kind: 'array', qualifier: 'series', elementType: receiver.valueType };
  if (methodName === 'size') return { kind: 'int' };
  if (methodName === 'clear' || methodName === 'put_all') return { kind: 'void' };
  return undefined;
}

function collectionReceiverType(expression: CallExpression, scope: InvariantScope): SemanticType | undefined {
  if (expression.callee.type !== 'MemberExpression') return undefined;
  if (expression.callee.object.type === 'Identifier' && ['array', 'matrix', 'map'].includes(expression.callee.object.name)) {
    return callArgumentType(expression, scope, ['id'], 0);
  }
  return inferKnown(expression.callee.object, scope);
}

function inferColorCallExpression(expression: CallExpression, scope: InvariantScope, calleeName: string): SemanticType | undefined {
  if (!COLOR_RETURN_CALLS.has(calleeName)) return undefined;
  void expression;
  void scope;
  return { kind: 'color' };
}

function inferStringCallExpression(expression: CallExpression, scope: InvariantScope, calleeName: string): SemanticType | undefined {
  void expression;
  void scope;
  if (STRING_RETURN_CALLS.has(calleeName)) return { kind: 'string' };
  if (STRING_INT_RETURN_CALLS.has(calleeName)) return { kind: 'int' };
  return undefined;
}

function inferMathCallExpression(expression: CallExpression, scope: InvariantScope, calleeName: string): SemanticType | undefined {
  const argumentTypes = expression.arguments.map((argument) => inferKnown(argument.value, scope));
  if (MATH_FLOAT_RETURN_CALLS.has(calleeName)) return { kind: 'float' };
  if (MATH_INT_RETURN_CALLS.has(calleeName)) return { kind: 'int', qualifier: maxQualifier(...argumentTypes) };
  if (calleeName === 'math.round') {
    const precision = callArgumentType(expression, scope, ['number', 'precision'], 1);
    return { kind: precision ? 'float' : 'int', qualifier: maxQualifier(...argumentTypes) };
  }
  if (!MATH_PRESERVE_NUMERIC_CALLS.has(calleeName)) return undefined;
  if (argumentTypes.some((argumentType) => !argumentType)) return undefined;
  const knownArguments = argumentTypes.filter((argumentType): argumentType is SemanticType => !!argumentType);
  if (knownArguments.length === 0) return undefined;
  if (knownArguments.some((argumentType) => argumentType.kind === 'float')) return { kind: 'float' };
  return { kind: 'int' };
}

function inferTaCallExpression(expression: CallExpression, scope: InvariantScope, calleeName: string): SemanticType | undefined {
  if (TA_BOOL_RETURN_CALLS.has(calleeName)) return { kind: 'bool', qualifier: 'series' };
  if (TA_INT_RETURN_CALLS.has(calleeName)) return { kind: 'int', qualifier: 'series' };
  if (TA_FLOAT_RETURN_CALLS.has(calleeName)) return { kind: 'float', qualifier: 'series' };
  const sourceRule = TA_SOURCE_RETURN_CALLS.get(calleeName);
  if (sourceRule) {
    const source = callArgumentType(expression, scope, sourceRule.params, sourceRule.index);
    return source ? { ...source, qualifier: 'series' } : undefined;
  }
  if (!TA_DEFAULT_SOURCE_RETURN_CALLS.has(calleeName)) return undefined;
  const positionalArguments = expression.arguments.filter((argument) => !argument.name);
  const hasSource = expression.arguments.some((argument) => argument.name?.name === 'source') || positionalArguments.length === 3;
  if (!hasSource) return { kind: 'float', qualifier: 'series' };
  const source = callArgumentType(expression, scope, ['source', 'leftbars', 'rightbars'], 0)
    ?? callArgumentType(expression, scope, ['source', 'length'], 0);
  return source ? { ...source, qualifier: 'series' } : undefined;
}

function inferTimeCallExpression(calleeName: string): SemanticType | undefined {
  if (calleeName === 'time' || calleeName === 'time_close') return { kind: 'int', qualifier: 'series' };
  if (calleeName === 'timeframe.change') return { kind: 'bool', qualifier: 'series' };
  if (calleeName === 'timeframe.in_seconds' || calleeName === 'timeframe.to_seconds') return { kind: 'int' };
  if (calleeName === 'timeframe.from_seconds') return { kind: 'string' };
  return undefined;
}

function seedTypeDeclarations(statements: Statement[], scope: InvariantScope): void {
  for (const statement of statements) {
    if (statement.type === 'TypeDeclaration') {
      scope.typeFields.set(statement.name.name, fieldsFromTypeDeclaration(statement));
    }
  }
}

function fieldsFromTypeDeclaration(declaration: TypeDeclaration): Map<string, SemanticType> {
  const fields = new Map<string, SemanticType>();
  for (const field of declaration.fields) {
    if (field.typeAnnotation) fields.set(field.name.name, typeFromAnnotation(field.typeAnnotation));
  }
  return fields;
}

function inferIdentifier(identifier: Identifier, scope: InvariantScope): InferredType {
  const scoped = lookup(scope, identifier.name);
  if (scoped) return known(scoped);
  const builtin = BUILTIN_GLOBAL_TYPES.get(identifier.name);
  return builtin ? known({ kind: builtin.kind, qualifier: builtin.qualifier }) : unknown();
}

function inferMemberExpression(expression: MemberExpression, scope: InvariantScope): InferredType {
  const path = memberPath(expression).join('.');
  const builtin = BUILTIN_GLOBAL_TYPES.get(path);
  if (builtin) return known({ kind: builtin.kind, qualifier: builtin.qualifier });
  if (path === 'math.pi' || path === 'math.e' || path === 'math.phi' || path === 'math.rphi') return known({ kind: 'float', qualifier: 'const' });
  if (path.startsWith('color.')) return known({ kind: 'color', qualifier: 'const' });
  const objectType = inferKnown(expression.object, scope);
  const fieldType = objectType?.kind === 'udt' && objectType.name
    ? lookupTypeField(scope, objectType.name, expression.property.name)
    : undefined;
  if (fieldType) return known({ ...fieldType, qualifier: maxQualifier(objectType, fieldType) });
  return unknown();
}

function typeFromAnnotation(annotation: TypeAnnotation): SemanticType {
  const qualifier = annotation.qualifier;
  if (annotation.baseType === 'array') {
    return {
      kind: 'array',
      qualifier: 'series',
      elementType: typeFromAnnotationName(annotation.elementType),
    };
  }
  if (annotation.baseType === 'matrix') {
    return {
      kind: 'matrix',
      qualifier: 'series',
      elementType: typeFromAnnotationName(annotation.elementType),
    };
  }
  if (annotation.baseType === 'map') {
    return {
      kind: 'map',
      qualifier: 'series',
      keyType: typeFromAnnotationName(annotation.keyType),
      valueType: typeFromAnnotationName(annotation.valueType),
    };
  }
  if (annotation.baseType === 'udt' && isSemanticTypeKind(annotation.name)) {
    return { kind: annotation.name, qualifier: qualifier ?? (isReferenceTypeKind(annotation.name) ? 'series' : undefined) };
  }
  if (annotation.baseType === 'series' || annotation.baseType === 'simple' || annotation.baseType === 'const' || annotation.baseType === 'input') {
    return { kind: 'unknown', qualifier: annotation.baseType };
  }
  return {
    kind: annotation.baseType === 'udt' ? 'udt' : annotation.baseType,
    qualifier: qualifier ?? (annotation.baseType === 'udt' ? 'series' : undefined),
    name: 'name' in annotation ? annotation.name : undefined,
  };
}

function typeFromAnnotationName(name: string): SemanticType {
  if (isSemanticTypeKind(name)) return { kind: name };
  return { kind: 'udt', name };
}

function isSemanticTypeKind(name: string): name is SemanticTypeKind {
  return [
    'array',
    'bool',
    'box',
    'chart.point',
    'color',
    'float',
    'hline',
    'int',
    'label',
    'line',
    'linefill',
    'map',
    'matrix',
    'plot',
    'polyline',
    'string',
    'table',
    'unknown',
    'void',
  ].includes(name);
}

function isReferenceTypeKind(name: SemanticTypeKind): boolean {
  return ['box', 'chart.point', 'hline', 'label', 'line', 'linefill', 'plot', 'polyline', 'table'].includes(name);
}

function compareSymbolType(
  name: string,
  expected: SemanticType,
  actual: SemanticType | undefined,
  loc: Identifier,
  issues: SemanticTypeInvariantIssue[],
): void {
  if (!actual) return;
  if (expected.kind !== 'unknown' && actual.kind !== expected.kind) {
    issues.push({
      code: 'semantic-type-mismatch',
      message: `${name} expected ${formatType(expected)} from documented type rules, got ${formatType(actual)}`,
      line: loc.loc?.start.line,
      column: loc.loc?.start.column,
      symbolName: name,
      expected: formatType(expected),
      actual: formatType(actual),
    });
    return;
  }
  if (expected.qualifier && actual.qualifier !== expected.qualifier) {
    issues.push({
      code: 'semantic-qualifier-mismatch',
      message: `${name} expected ${formatType(expected)} from documented qualifier rules, got ${formatType(actual)}`,
      line: loc.loc?.start.line,
      column: loc.loc?.start.column,
      symbolName: name,
      expected: formatType(expected),
      actual: formatType(actual),
    });
  }
}

function expectedDeclarationType(declaredType: SemanticType | undefined, inferred: InferredType): SemanticType | undefined {
  if (!declaredType) return inferred.kind === 'known' ? inferred.type : undefined;
  return declaredType;
}

function collectReassignedNames(statements: Statement[]): Set<string> {
  const names = new Set<string>();
  visitStatements(statements, (statement) => {
    if (statement.type === 'AssignmentStatement' && statement.left.type === 'Identifier') names.add(statement.left.name);
    if (statement.type === 'TupleAssignment') {
      for (const name of statement.names) names.add(name.name);
    }
  });
  return names;
}

function visitStatements(statements: Statement[], visit: (statement: Statement) => void): void {
  for (const statement of statements) {
    visit(statement);
    if (statement.type === 'IfStatement') {
      visitStatements(statement.consequent, visit);
      if (Array.isArray(statement.alternate)) visitStatements(statement.alternate, visit);
      else if (statement.alternate) visitStatements([statement.alternate], visit);
      continue;
    }
    if (statement.type === 'ForStatement' || statement.type === 'WhileStatement' || statement.type === 'OnceStatement') {
      visitStatements(statement.body, visit);
      continue;
    }
    if (statement.type === 'FunctionDeclaration' && Array.isArray(statement.body)) {
      visitStatements(statement.body, visit);
      continue;
    }
    if (statement.type === 'ExpressionStatement') {
      visitNestedStatementsInExpression(statement.expression, visit);
      continue;
    }
    if (statement.type === 'MultiStatement') visitStatements(statement.statements, visit);
  }
}

function visitNestedStatementsInExpression(expression: Expression, visit: (statement: Statement) => void): void {
  switch (expression.type) {
    case 'ConditionalExpression':
      visitNestedStatementsInExpression(expression.test, visit);
      visitNestedStatementsInExpression(expression.consequent, visit);
      visitNestedStatementsInExpression(expression.alternate, visit);
      return;
    case 'SwitchExpression':
      if (expression.discriminant) visitNestedStatementsInExpression(expression.discriminant, visit);
      for (const switchCase of expression.cases) {
        if (switchCase.test) visitNestedStatementsInExpression(switchCase.test, visit);
        if (Array.isArray(switchCase.consequent)) visitStatements(switchCase.consequent, visit);
        else visitNestedStatementsInExpression(switchCase.consequent, visit);
      }
      return;
    case 'CallExpression':
      visitNestedStatementsInExpression(expression.callee, visit);
      for (const argument of expression.arguments) visitNestedStatementsInExpression(argument.value, visit);
      return;
    case 'MemberExpression':
      visitNestedStatementsInExpression(expression.object, visit);
      return;
    case 'IndexExpression':
      visitNestedStatementsInExpression(expression.object, visit);
      visitNestedStatementsInExpression(expression.index, visit);
      return;
    case 'ArrayExpression':
      for (const element of expression.elements) visitNestedStatementsInExpression(element, visit);
      return;
    case 'ForStatement':
      visitStatements(expression.body, visit);
      return;
    case 'WhileStatement':
      visitStatements(expression.body, visit);
  }
}

function initializerReferencesName(init: Expression | IfStatement, names: Set<string>): boolean {
  let found = false;
  visitInitializerExpressions(init, (expression) => {
    if (expression.type === 'Identifier' && names.has(expression.name)) found = true;
  });
  return found;
}

function visitInitializerExpressions(init: Expression | IfStatement, visit: (expression: Expression) => void): void {
  if (isExpression(init)) {
    visitExpression(init, visit);
    return;
  }
  visitExpression(init.test, visit);
  for (const statement of init.consequent) visitStatementExpressions(statement, visit);
  if (Array.isArray(init.alternate)) {
    for (const statement of init.alternate) visitStatementExpressions(statement, visit);
  } else if (init.alternate) {
    visitInitializerExpressions(init.alternate, visit);
  }
}

function visitStatementExpressions(statement: Statement, visit: (expression: Expression) => void): void {
  if (statement.type === 'VariableDeclaration') {
    visitInitializerExpressions(statement.init, visit);
    return;
  }
  if (statement.type === 'AssignmentStatement') {
    visitInitializerExpressions(statement.right, visit);
    return;
  }
  if (statement.type === 'TupleAssignment') {
    visitInitializerExpressions(statement.right, visit);
    return;
  }
  if (statement.type === 'ExpressionStatement') {
    visitExpression(statement.expression, visit);
    return;
  }
  if (statement.type === 'IfStatement') {
    visitInitializerExpressions(statement, visit);
    return;
  }
  if (statement.type === 'ForStatement') {
    if (statement.kind === 'numeric') {
      visitExpression(statement.start, visit);
      visitExpression(statement.end, visit);
      if (statement.step) visitExpression(statement.step, visit);
    } else {
      visitExpression(statement.iterable, visit);
    }
    for (const child of statement.body) visitStatementExpressions(child, visit);
    return;
  }
  if (statement.type === 'WhileStatement') {
    visitExpression(statement.test, visit);
    for (const child of statement.body) visitStatementExpressions(child, visit);
    return;
  }
  if (statement.type === 'OnceStatement') {
    if (statement.test) visitExpression(statement.test, visit);
    for (const child of statement.body) visitStatementExpressions(child, visit);
    return;
  }
  if (statement.type === 'MultiStatement') {
    for (const child of statement.statements) visitStatementExpressions(child, visit);
  }
}

function visitExpression(expression: Expression, visit: (expression: Expression) => void): void {
  visit(expression);
  switch (expression.type) {
    case 'BinaryExpression':
      visitExpression(expression.left, visit);
      visitExpression(expression.right, visit);
      return;
    case 'UnaryExpression':
      visitExpression(expression.argument, visit);
      return;
    case 'ConditionalExpression':
      visitExpression(expression.test, visit);
      visitExpression(expression.consequent, visit);
      visitExpression(expression.alternate, visit);
      return;
    case 'SwitchExpression':
      if (expression.discriminant) visitExpression(expression.discriminant, visit);
      for (const switchCase of expression.cases) {
        if (switchCase.test) visitExpression(switchCase.test, visit);
        if (Array.isArray(switchCase.consequent)) {
          for (const statement of switchCase.consequent) {
            visitStatementExpressions(statement, visit);
          }
        } else {
          visitExpression(switchCase.consequent, visit);
        }
      }
      return;
    case 'CallExpression':
      visitExpression(expression.callee, visit);
      for (const argument of expression.arguments) visitExpression(argument.value, visit);
      return;
    case 'MemberExpression':
      visitExpression(expression.object, visit);
      return;
    case 'IndexExpression':
      visitExpression(expression.object, visit);
      visitExpression(expression.index, visit);
      return;
    case 'ArrayExpression':
      for (const element of expression.elements) visitExpression(element, visit);
      return;
    case 'ForStatement':
      if (expression.kind === 'numeric') {
        visitExpression(expression.start, visit);
        visitExpression(expression.end, visit);
        if (expression.step) visitExpression(expression.step, visit);
      } else {
        visitExpression(expression.iterable, visit);
      }
      for (const statement of expression.body) visitStatementExpressions(statement, visit);
      return;
    case 'WhileStatement':
      visitExpression(expression.test, visit);
      for (const statement of expression.body) visitStatementExpressions(statement, visit);
  }
}

function mergeValueTypes(left: SemanticType, right: SemanticType): SemanticType | undefined {
  if (left.kind === right.kind) return { kind: left.kind, qualifier: maxQualifier(left, right), name: left.name };
  if (isNumeric(left) && isNumeric(right)) return { kind: 'float', qualifier: maxQualifier(left, right) };
  return undefined;
}

function maxQualifier(...types: Array<SemanticType | undefined>): SemanticQualifier | undefined {
  if (types.some((type) => !type?.qualifier)) return undefined;
  let max = -1;
  for (const type of types) {
    const qualifier = type?.qualifier;
    if (!qualifier) return undefined;
    max = Math.max(max, QUALIFIER_ORDER.indexOf(qualifier));
  }
  return max >= 0 ? QUALIFIER_ORDER[max] : undefined;
}

function isNumeric(type: SemanticType): boolean {
  return NUMERIC_KINDS.has(type.kind);
}

function inferKnown(expression: Expression, scope: InvariantScope): SemanticType | undefined {
  const inferred = inferExpression(expression, scope);
  return inferred.kind === 'known' ? inferred.type : undefined;
}

function known(type: SemanticType): InferredType {
  return { kind: 'known', type };
}

function unknown(): InferredType {
  return { kind: 'unknown' };
}

function createScope(parent?: InvariantScope): InvariantScope {
  return { parent, symbols: new Map(), typeFields: new Map() };
}

function lookup(scope: InvariantScope, name: string): SemanticType | undefined {
  return scope.symbols.get(name) ?? (scope.parent ? lookup(scope.parent, name) : undefined);
}

function lookupTypeField(scope: InvariantScope, typeName: string, fieldName: string): SemanticType | undefined {
  return scope.typeFields.get(typeName)?.get(fieldName) ?? (scope.parent ? lookupTypeField(scope.parent, typeName, fieldName) : undefined);
}

function lookupTypeFields(scope: InvariantScope, typeName: string): Map<string, SemanticType> | undefined {
  return scope.typeFields.get(typeName) ?? (scope.parent ? lookupTypeFields(scope.parent, typeName) : undefined);
}

function createCoverageStats(): SemanticTypeInvariantCoverage {
  return {
    totalExpressions: 0,
    typedExpressions: 0,
    knownExpressions: 0,
    tupleExpressions: 0,
    unknownExpressions: 0,
    byExpressionType: {},
    unknownCalls: {},
    unknownMembers: {},
  };
}

function increment(counts: Record<string, number>, key: string): void {
  counts[key] = (counts[key] ?? 0) + 1;
}

function callArgumentType(
  expression: CallExpression,
  scope: InvariantScope,
  parameterNames: string[],
  position: number,
): SemanticType | undefined {
  const positional = expression.arguments.filter((argument) => !argument.name);
  const named = expression.arguments.find((argument) => argument.name?.name === parameterNames[position]);
  const argument = named ?? positional[position];
  return argument ? inferKnown(argument.value, scope) : undefined;
}

function inferArrayElementType(elements: Expression[], scope: InvariantScope): SemanticType {
  let elementType: SemanticType | undefined;
  for (const element of elements) {
    const inferred = inferKnown(element, scope);
    if (!inferred) return { kind: 'unknown' };
    const normalized = collectionElementType(inferred);
    elementType = elementType ? mergeValueTypes(elementType, normalized) : normalized;
    if (!elementType) return { kind: 'unknown' };
  }
  return elementType ?? { kind: 'unknown' };
}

function collectionElementType(type: SemanticType): SemanticType {
  if (type.kind === 'udt' && type.name) return { kind: 'udt', name: type.name };
  if (type.kind === 'array' || type.kind === 'matrix' || type.kind === 'map') return { kind: 'unknown' };
  return { kind: type.kind };
}

function memberPath(expression: Expression): string[] {
  if (expression.type === 'Identifier') return [expression.name];
  if (expression.type !== 'MemberExpression') return [];
  return [...memberPath(expression.object), expression.property.name];
}

function isExpression(value: Expression | IfStatement): value is Expression {
  return value.type !== 'IfStatement';
}

function formatType(type: SemanticType): string {
  return [type.qualifier, type.kind === 'udt' && type.name ? type.name : type.kind].filter(Boolean).join(' ');
}

function dedupeIssues(issues: SemanticTypeInvariantIssue[]): SemanticTypeInvariantIssue[] {
  const seen = new Set<string>();
  return issues.filter((issue) => {
    const key = `${issue.code}:${issue.line}:${issue.column}:${issue.symbolName}:${issue.expected}:${issue.actual}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
