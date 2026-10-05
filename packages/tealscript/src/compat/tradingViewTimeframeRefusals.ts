import type { CallExpression, Expression } from '../parser/ast';

function isTimeframeCall(expression: Expression, name: string): expression is CallExpression {
  return expression.type === 'CallExpression'
    && expression.callee.type === 'MemberExpression'
    && expression.callee.object.type === 'Identifier'
    && expression.callee.object.name === 'timeframe'
    && expression.callee.property.name === name;
}

export function tradingViewTimeframeCompileRefusal(expression: CallExpression, pineVersion: number): string | undefined {
  if (pineVersion !== 6 || !isTimeframeCall(expression, 'in_seconds')) return undefined;
  const timeframe = expression.arguments.find((argument) => argument.name?.name === 'timeframe')?.value
    ?? expression.arguments.find((argument) => !argument.name)?.value;
  if (!timeframe || !isTimeframeCall(timeframe, 'from_seconds')) return undefined;
  const seconds = timeframe.arguments.find((argument) => argument.name?.name === 'seconds')?.value
    ?? timeframe.arguments.find((argument) => !argument.name)?.value;
  if (seconds?.type !== 'NumericLiteral' || seconds.value !== 59) return undefined;
  // TV coverage-time-2-v1.pine:33, v2 attempts 1/2, CE10294.
  return 'TradingView CE10294 refuses timeframe.in_seconds(timeframe.from_seconds(59)): resolution.trim is not a function';
}
