import type { Expression, FunctionDeclaration, Program, Statement, TypeAnnotation, CallExpression } from '../../parser/ast';
import type { TypeDeclInfo } from './analyzer';

type UdtValueType = { object?: string; array?: string; matrix?: string };
type TypeScope = { values: Map<string, UdtValueType | undefined>; parent?: TypeScope };

export function inferUdtArrayExpressions(ast: Program, types: ReadonlyMap<string, TypeDeclInfo>,
  resolvedUserMethods?: WeakMap<CallExpression, FunctionDeclaration | null>): WeakSet<Expression> {
  const arrays = new WeakSet<Expression>();
  if (types.size === 0) return arrays;
  const functionReturns = new Map<string, UdtValueType>();
  const declarationReturns = new Map<FunctionDeclaration, UdtValueType>();
  const functionCounts = new Map<string, number>();
  for (const node of ast.body) {
    if (node.type === 'FunctionDeclaration') functionCounts.set(node.name.name, (functionCounts.get(node.name.name) ?? 0) + 1);
  }
  const name = (expr: Expression): string | undefined => expr.type === 'Identifier'
    ? expr.name
    : expr.type === 'MemberExpression' ? [name(expr.object), expr.property.name].filter(Boolean).join('.') : undefined;
  const annotationType = (annotation?: TypeAnnotation | null): UdtValueType | undefined => {
    if (annotation?.baseType === 'udt' && types.has(annotation.name)) return { object: annotation.name };
    if (annotation?.baseType === 'matrix' && types.has(annotation.elementType)) return { matrix: annotation.elementType };
    if (annotation?.baseType === 'array') {
      if (types.has(annotation.elementType)) return { array: annotation.elementType };
    }
    return undefined;
  };
  const lookup = (scope: TypeScope, key: string): UdtValueType | undefined => {
    for (let cursor: TypeScope | undefined = scope; cursor; cursor = cursor.parent) {
      if (cursor.values.has(key)) return cursor.values.get(key);
    }
    return undefined;
  };
  const argument = (expr: Extract<Expression, { type: 'CallExpression' }>, key: string, index: number): Expression | undefined =>
    expr.arguments.find((arg) => arg.name?.name === key)?.value ?? expr.arguments.filter((arg) => !arg.name)[index]?.value;
  const methodAcceptsArguments = (node: FunctionDeclaration, expr: Extract<Expression, { type: 'CallExpression' }>): boolean => {
    const parameters = node.params.slice(1);
    const supplied = new Set<string>();
    let positionalIndex = 0;
    let sawNamed = false;
    for (const arg of expr.arguments) {
      if (!arg.name && sawNamed) return false;
      const parameter = arg.name
        ? parameters.find((value) => value.name === arg.name!.name)
        : parameters[positionalIndex++];
      if (!parameter || supplied.has(parameter.name)) return false;
      supplied.add(parameter.name);
      if (arg.name) sawNamed = true;
    }
    return parameters.every((parameter) => supplied.has(parameter.name) || parameter.defaultValue !== undefined);
  };
  const infer = (expr: Expression, scope: TypeScope): UdtValueType | undefined => {
    if (expr.type === 'Identifier') return lookup(scope, expr.name);
    if (expr.type === 'ConditionalExpression') return infer(expr.consequent, scope) ?? infer(expr.alternate, scope);
    if (expr.type === 'IndexExpression') return infer(expr.object, scope);
    if (expr.type === 'MemberExpression') {
      const receiver = infer(expr.object, scope);
      const field = receiver?.object ? types.get(receiver.object)?.node.fields.find((value) => value.name.name === expr.property.name) : undefined;
      return annotationType(field?.typeAnnotation);
    }
    if (expr.type !== 'CallExpression') return undefined;
    const fullName = name(expr.callee);
    if (fullName === 'matrix.new' && types.has(expr.typeArguments?.[0] ?? '')) return { matrix: expr.typeArguments![0] };
    if (fullName === 'array.new' && types.has(expr.typeArguments?.[0] ?? '')) return { array: expr.typeArguments![0] };
    if (fullName === 'array.from') {
      const element = expr.arguments.map((arg) => infer(arg.value, scope)).find((value) => value?.object);
      return element?.object ? { array: element.object } : undefined;
    }
    if (expr.callee.type === 'Identifier') return functionReturns.get(expr.callee.name);
    if (expr.callee.type !== 'MemberExpression') return undefined;
    const method = expr.callee.property.name;
    const constructor = name(expr.callee.object);
    if (method === 'new' && constructor && types.has(constructor)) return { object: constructor };
    const receiverKey = constructor === 'matrix' && method === 'concat' ? 'id1' : 'id';
    const receiver = constructor === 'array' || constructor === 'matrix'
      ? infer(argument(expr, receiverKey, 0) ?? expr.callee.object, scope)
      : infer(expr.callee.object, scope);
    if (constructor !== 'matrix' && receiver?.matrix) {
      const resolvedMethod = resolvedUserMethods?.get(expr);
      const methods = resolvedUserMethods?.has(expr)
        ? resolvedMethod ? [resolvedMethod] : []
        : ast.body.filter((node): node is FunctionDeclaration =>
        node.type === 'FunctionDeclaration' && node.isMethod === true && node.name.name === method
        && annotationType(node.params[0]?.typeAnnotation)?.matrix === receiver.matrix && methodAcceptsArguments(node, expr)
      );
      if (methods.length === 1) return declarationReturns.get(methods[0]!);
    }
    if (method === 'copy' || method === 'slice' || method === 'submatrix') return receiver;
    if (receiver?.matrix && (method === 'transpose' || method === 'concat')) return receiver;
    if (receiver?.matrix && ['row', 'col', 'column'].includes(method)) return { array: receiver.matrix };
    if (receiver?.matrix && method === 'get') return { object: receiver.matrix };
    if (receiver?.array && ['get', 'first', 'last', 'pop', 'shift', 'remove'].includes(method)) return { object: receiver.array };
    return undefined;
  };
  const visit = (value: unknown, scope: TypeScope): UdtValueType | undefined => {
    if (!value || typeof value !== 'object') return undefined;
    if (Array.isArray(value)) {
      const block: TypeScope = { values: new Map(), parent: scope };
      for (const node of value === ast.body ? value as Statement[] : []) {
        if (node.type === 'VariableDeclaration' && node.names.type === 'VariableDeclarator') {
          const type = annotationType(node.typeAnnotation);
          if (type) block.values.set(node.names.name.name, type);
        }
      }
      let result: UdtValueType | undefined;
      for (const child of value) result = visit(child, block);
      return result;
    }
    const node = value as Statement | Expression | Program;
    if (node.type === 'FunctionDeclaration') {
      const local: TypeScope = { values: new Map(), parent: scope };
      for (const parameter of node.params) local.values.set(parameter.name, annotationType(parameter.typeAnnotation));
      const result = visit(node.body, local);
      if (result) declarationReturns.set(node, result);
      if (result && functionCounts.get(node.name.name) === 1) functionReturns.set(node.name.name, result);
      return undefined;
    }
    if (node.type === 'VariableDeclaration') {
      const expected = annotationType(node.typeAnnotation);
      const inferred = visit(node.init, scope);
      const type = expected ?? inferred;
      if (expected?.array && node.init.type !== 'IfStatement') arrays.add(node.init);
      if (node.names.type === 'VariableDeclarator') scope.values.set(node.names.name.name, type);
      return type;
    }
    for (const [key, child] of Object.entries(node)) {
      if (key !== 'loc' && key !== 'typeAnnotation') visit(child, scope);
    }
    if (node.type === 'ExpressionStatement') return infer(node.expression, scope);
    const result = infer(node as Expression, scope);
    if (result?.array) arrays.add(node as Expression);
    return result;
  };
  let knownReturns: number;
  do {
    knownReturns = functionReturns.size + declarationReturns.size;
    visit(ast, { values: new Map() });
  } while (functionReturns.size + declarationReturns.size > knownReturns);
  return arrays;
}
