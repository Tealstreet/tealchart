import type { Expression } from '../parser/ast';

export function isTimeframeSecondsRatio(expression: Expression, resolveAlias: (name: string) => boolean): boolean {
  if (expression.type === 'Identifier') return resolveAlias(expression.name);
  if (expression.type !== 'BinaryExpression' || expression.operator !== '/') return false;
  return [expression.left, expression.right].every((operand) => (
    operand.type === 'CallExpression'
    && operand.callee.type === 'MemberExpression'
    && operand.callee.object.type === 'Identifier'
    && operand.callee.object.name === 'timeframe'
    && operand.callee.property.name === 'in_seconds'
  ));
}
