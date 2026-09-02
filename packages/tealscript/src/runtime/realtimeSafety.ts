import type {
  AssignmentStatement,
  CallExpression,
  Expression,
  FunctionDeclaration,
  Identifier,
  IfStatement,
  IndexExpression,
  MemberExpression,
  Program,
  Statement,
  SwitchCase,
  TypeAnnotation,
  TypeDeclaration,
  VariableDeclaration,
  SourceLocation,
} from '../parser/ast';
import type { RuntimeFallbackDiagnostic } from './engine';

export const COMPILED_REALTIME_STATELESS_FALLBACK_PREFIX = 'compiled-worker-stateless-intrabar-reentry';

export interface CompiledRealtimeSafetyAnalysis {
  safe: boolean;
  fallbackReason?: string;
  diagnostics: RuntimeFallbackDiagnostic[];
  reasons: string[];
}

const COLLECTION_NAMES = new Set(['array', 'map', 'matrix']);
const COLLECTION_CONSTRUCTORS = new Set(['array.new', 'map.new', 'matrix.new']);
const COLLECTION_MUTATORS = new Set([
  'array.clear',
  'array.concat',
  'array.fill',
  'array.insert',
  'array.pop',
  'array.push',
  'array.remove',
  'array.reverse',
  'array.set',
  'array.shift',
  'array.sort',
  'array.unshift',
  'map.clear',
  'map.put',
  'map.remove',
  'matrix.add_col',
  'matrix.add_row',
  'matrix.fill',
  'matrix.remove_col',
  'matrix.remove_row',
  'matrix.reverse',
  'matrix.set',
  'matrix.sort',
  'matrix.swap_columns',
  'matrix.swap_rows',
]);

export function analyzeCompiledRealtimeSafety(ast: Program): CompiledRealtimeSafetyAnalysis {
  const reasons = new Set<string>();
  const diagnostics = new Map<string, RuntimeFallbackDiagnostic>();
  const userTypes = new Set<string>();
  const persistentMutableNames = new Set<string>();
  const persistentMutableOrigins = new Map<string, RuntimeFallbackDiagnostic>();
  let hasHistoryReference = false;
  let firstHistoryReference: RuntimeFallbackDiagnostic | undefined;

  const addReason = (reason: string, node?: { loc?: SourceLocation }, construct = reason): void => {
    reasons.add(reason);
    if (diagnostics.has(reason)) return;
    diagnostics.set(reason, {
      reason,
      construct,
      message: describeReason(reason, construct),
      ...(node?.loc ? { line: node.loc.start.line, column: node.loc.start.column } : {}),
    });
  };

  const visitStatement = (statement: Statement): void => {
    switch (statement.type) {
      case 'TypeDeclaration':
        userTypes.add(statement.name.name);
        for (const field of statement.fields) {
          if (field.varip) addReason('varip-udt-field', field, `varip UDT field ${statement.name.name}.${field.name.name}`);
        }
        for (const field of statement.fields) {
          if (field.defaultValue) visitExpression(field.defaultValue);
        }
        break;
      case 'FunctionDeclaration':
        visitFunction(statement);
        break;
      case 'VariableDeclaration':
        visitVariableDeclaration(statement);
        break;
      case 'MultiDeclaration':
        statement.declarations.forEach(visitVariableDeclaration);
        break;
      case 'AssignmentStatement':
        visitAssignment(statement);
        break;
      case 'MultiAssignment':
        statement.assignments.forEach(visitAssignment);
        break;
      case 'TupleAssignment':
        visitExpressionOrIf(statement.right);
        break;
      case 'ExpressionStatement':
        visitExpression(statement.expression);
        break;
      case 'MultiExpressionStatement':
        statement.expressions.forEach(visitExpression);
        break;
      case 'IfStatement':
        visitIfStatement(statement);
        break;
      case 'OnceStatement':
        if (statement.test) visitExpression(statement.test);
        statement.body.forEach(visitStatement);
        break;
      case 'ForStatement':
        if (statement.kind === 'numeric') {
          visitExpression(statement.start);
          visitExpression(statement.end);
          if (statement.step) visitExpression(statement.step);
        } else {
          visitExpression(statement.iterable);
        }
        statement.body.forEach(visitStatement);
        break;
      case 'WhileStatement':
        visitExpression(statement.test);
        statement.body.forEach(visitStatement);
        break;
      case 'IndicatorDeclaration':
      case 'LibraryDeclaration':
        visitExpression(statement.title);
        break;
      case 'ImportDeclaration':
      case 'EnumDeclaration':
      case 'BreakStatement':
      case 'ContinueStatement':
        break;
    }
  };

  const visitFunction = (statement: FunctionDeclaration): void => {
    if (Array.isArray(statement.body)) {
      statement.body.forEach(visitStatement);
    } else {
      visitExpression(statement.body);
    }
  };

  const visitVariableDeclaration = (statement: VariableDeclaration): void => {
    if (statement.kind === 'varip') addReason('varip-declaration', statement, `varip declaration ${variableDeclarationName(statement)}`);
    if (statement.typeAnnotation && isMutableTypeAnnotation(statement.typeAnnotation)) {
      addPersistentMutableName(statement);
    }
    if (isMutableConstructorExpression(statement.init) || isUserTypeConstructorExpression(statement.init, userTypes)) {
      addPersistentMutableName(statement);
    }
    visitExpressionOrIf(statement.init);
  };

  const addPersistentMutableName = (statement: VariableDeclaration): void => {
    if (statement.kind !== 'var' && statement.kind !== 'varip') return;
    if (statement.names.type === 'VariableDeclarator') {
      persistentMutableNames.add(statement.names.name.name);
      persistentMutableOrigins.set(statement.names.name.name, {
        reason: 'persistent-mutable-state',
        construct: `persistent mutable declaration ${statement.names.name.name}`,
        message: 'Persistent mutable state can retain intrabar mutations across realtime updates.',
        ...(statement.loc ? { line: statement.loc.start.line, column: statement.loc.start.column } : {}),
      });
    } else {
      addReason('persistent-mutable-tuple-state', statement, 'persistent mutable tuple declaration');
    }
  };

  const visitAssignment = (statement: AssignmentStatement): void => {
    if (statement.operator !== ':=') {
      const root = rootIdentifier(statement.left);
      if (root && persistentMutableNames.has(root)) {
        addReason('persistent-compound-mutation', statement, `compound mutation of persistent state ${root}`);
      }
    }
    visitAssignmentLeft(statement.left);
    visitExpressionOrIf(statement.right);
  };

  const visitAssignmentLeft = (left: Identifier | MemberExpression | IndexExpression): void => {
    if (left.type === 'MemberExpression') {
      visitExpression(left.object);
    } else if (left.type === 'IndexExpression') {
      visitExpression(left.object);
      visitExpression(left.index);
    }
  };

  const visitExpressionOrIf = (value: Expression | IfStatement): void => {
    if (value.type === 'IfStatement') {
      visitIfStatement(value);
    } else {
      visitExpression(value);
    }
  };

  const visitIfStatement = (statement: IfStatement): void => {
    visitExpression(statement.test);
    statement.consequent.forEach(visitStatement);
    if (Array.isArray(statement.alternate)) {
      statement.alternate.forEach(visitStatement);
    } else if (statement.alternate) {
      visitIfStatement(statement.alternate);
    }
  };

  const visitExpression = (expression: Expression): void => {
    switch (expression.type) {
      case 'BinaryExpression':
        visitExpression(expression.left);
        visitExpression(expression.right);
        break;
      case 'UnaryExpression':
        visitExpression(expression.argument);
        break;
      case 'ConditionalExpression':
        visitExpression(expression.test);
        visitExpression(expression.consequent);
        visitExpression(expression.alternate);
        break;
      case 'SwitchExpression':
        if (expression.discriminant) visitExpression(expression.discriminant);
        expression.cases.forEach(visitSwitchCase);
        break;
      case 'CallExpression':
        visitCall(expression);
        break;
      case 'MemberExpression':
        visitExpression(expression.object);
        break;
      case 'IndexExpression':
        hasHistoryReference = true;
        firstHistoryReference ??= {
          reason: 'history-with-intrabar-state',
          construct: 'history reference []',
          message: 'History references composed with stateful intrabar constructs depend on incremental realtime state.',
          ...(expression.loc ? { line: expression.loc.start.line, column: expression.loc.start.column } : {}),
        };
        visitIndex(expression);
        break;
      case 'ArrayExpression':
        expression.elements.forEach(visitExpression);
        break;
      case 'LambdaExpression':
        visitExpression(expression.body);
        break;
      case 'ForStatement':
      case 'WhileStatement':
        visitStatement(expression);
        break;
      case 'Identifier':
      case 'NumericLiteral':
      case 'StringLiteral':
      case 'BooleanLiteral':
      case 'ColorLiteral':
      case 'NaExpression':
        break;
    }
  };

  const visitSwitchCase = (switchCase: SwitchCase): void => {
    if (switchCase.test) visitExpression(switchCase.test);
    if (Array.isArray(switchCase.consequent)) {
      switchCase.consequent.forEach(visitStatement);
    } else {
      visitExpression(switchCase.consequent);
    }
  };

  const visitCall = (expression: CallExpression): void => {
    const path = memberPath(expression.callee).join('.');
    if (COLLECTION_MUTATORS.has(path)) addReason('collection-mutation', expression, `collection mutator ${path}`);
    const receiver = persistentMutationReceiver(expression, path, persistentMutableNames);
    if (receiver) {
      addReason('persistent-collection-mutation', expression, `persistent collection mutation ${path}(${receiver})`);
      const origin = persistentMutableOrigins.get(receiver);
      if (origin && !diagnostics.has(origin.reason)) diagnostics.set(origin.reason, origin);
    }
    visitExpression(expression.callee);
    expression.arguments.forEach((argument) => visitExpression(argument.value));
  };

  const visitIndex = (expression: IndexExpression): void => {
    visitExpression(expression.object);
    visitExpression(expression.index);
  };

  ast.body.forEach(visitStatement);

  if (hasHistoryReference && reasons.size > 0) {
    if (firstHistoryReference) diagnostics.set(firstHistoryReference.reason, firstHistoryReference);
    addReason('history-with-intrabar-state', undefined, 'history reference []');
  }

  const sorted = [...reasons].sort();
  return {
    safe: sorted.length === 0,
    fallbackReason: sorted.length === 0 ? undefined : `${COMPILED_REALTIME_STATELESS_FALLBACK_PREFIX}: ${sorted.join('; ')}`,
    diagnostics: [...diagnostics.values()].filter((diagnostic) => sorted.includes(diagnostic.reason)),
    reasons: sorted,
  };
}

function describeReason(reason: string, construct: string): string {
  switch (reason) {
    case 'varip-declaration':
      return `${construct} keeps intrabar state between realtime ticks.`;
    case 'varip-udt-field':
      return `${construct} keeps field state between realtime ticks.`;
    case 'persistent-mutable-tuple-state':
      return `${construct} can retain mutable state across realtime ticks.`;
    case 'collection-mutation':
      return `${construct} mutates collection state during realtime execution.`;
    case 'persistent-collection-mutation':
      return `${construct} mutates persistent collection state during realtime execution.`;
    case 'persistent-compound-mutation':
      return `${construct} uses compound assignment on persistent mutable state.`;
    case 'history-with-intrabar-state':
      return `${construct} is composed with stateful intrabar execution.`;
    default:
      return `${construct} requires interpreter realtime execution to preserve Pine intrabar semantics.`;
  }
}

function variableDeclarationName(statement: VariableDeclaration): string {
  if (statement.names.type === 'VariableDeclarator') return statement.names.name.name;
  return statement.names.names.map((name) => name.name).join(', ');
}

function isMutableTypeAnnotation(annotation: TypeAnnotation): boolean {
  return annotation.baseType === 'array' || annotation.baseType === 'map' || annotation.baseType === 'matrix' || annotation.baseType === 'udt';
}

function isMutableConstructorExpression(value: Expression | IfStatement): boolean {
  if (value.type !== 'CallExpression') return false;
  return COLLECTION_CONSTRUCTORS.has(memberPath(value.callee).join('.'));
}

function isUserTypeConstructorExpression(value: Expression | IfStatement, userTypes: Set<string>): boolean {
  if (value.type !== 'CallExpression') return false;
  const path = memberPath(value.callee);
  return path.length === 2 && path[1] === 'new' && userTypes.has(path[0]!);
}

function persistentMutationReceiver(
  expression: CallExpression,
  path: string,
  persistentMutableNames: Set<string>,
): string | undefined {
  if (!COLLECTION_MUTATORS.has(path)) return undefined;
  const receiver = expression.arguments[0]?.value;
  return receiver?.type === 'Identifier' && persistentMutableNames.has(receiver.name) ? receiver.name : undefined;
}

function memberPath(expression: Expression): string[] {
  if (expression.type === 'Identifier') return [expression.name];
  if (expression.type === 'MemberExpression') return [...memberPath(expression.object), expression.property.name];
  return [];
}

function rootIdentifier(expression: Expression): string | undefined {
  if (expression.type === 'Identifier') return expression.name;
  if (expression.type === 'MemberExpression' || expression.type === 'IndexExpression') {
    return rootIdentifier(expression.object);
  }
  return undefined;
}
