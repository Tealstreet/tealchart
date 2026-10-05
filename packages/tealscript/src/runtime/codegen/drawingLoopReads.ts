import type { CallExpression, Expression, ForStatement, Identifier } from '../../parser/ast';
import type { SemanticType } from '../../semantic/checker';

type LineRead = { array: Identifier; index: Identifier };

export function invariantLineReads(
  loop: ForStatement,
  typeOf: (expression: Expression) => SemanticType | undefined,
): Map<CallExpression, LineRead> {
  const reads = new Map<CallExpression, LineRead>();
  const assigned = new Set<string>();
  let safe = true;
  const visit = (value: unknown): void => {
    if (!value || typeof value !== 'object' || !safe) return;
    const node = value as Record<string, unknown>;
    if (node.type === 'AssignmentStatement') {
      const left = node.left as Expression;
      if (left.type !== 'Identifier') safe = false;
      else assigned.add(left.name);
    }
    if (node.type === 'VariableDeclarator') assigned.add((node.name as Identifier).name);
    if (node.type === 'ForStatement') assigned.add((node.counter as Identifier).name);
    if (node.type === 'FunctionDeclaration' || node.type === 'TupleAssignment') safe = false;
    if (node.type === 'CallExpression') {
      const call = value as CallExpression;
      const callee = call.callee;
      if (callee.type !== 'MemberExpression' || callee.object.type !== 'Identifier') safe = false;
      else {
        const name = `${callee.object.name}.${callee.property.name}`;
        if (name === 'line.get_y1') {
          const argument = call.arguments.length === 1 && !call.arguments[0].name ? call.arguments[0].value : undefined;
          if (
            argument?.type === 'CallExpression' &&
            argument.callee.type === 'MemberExpression' &&
            argument.callee.object.type === 'Identifier' &&
            argument.callee.object.name === 'array' &&
            argument.callee.property.name === 'get' &&
            argument.arguments.length === 2 &&
            argument.arguments.every((arg) => !arg.name)
          ) {
            const [array, index] = argument.arguments.map((arg) => arg.value);
            if (
              array.type === 'Identifier' &&
              index.type === 'Identifier' &&
              typeOf(array)?.elementType?.kind === 'line' &&
              typeOf(index)?.kind === 'int'
            ) {
              reads.set(call, { array, index });
            }
          }
        } else if (name === 'array.set') {
          const receiver = call.arguments[0]?.value;
          const kind = receiver && typeOf(receiver)?.elementType?.kind;
          if (
            call.arguments.some((arg) => arg.name) ||
            !kind ||
            !['int', 'float', 'bool', 'string', 'color', 'label'].includes(kind)
          )
            safe = false;
        } else if (!['array.get', 'array.size', 'label.get_text', 'label.set_text', 'math.abs'].includes(name)) {
          safe = false;
        }
      }
    }
    for (const [key, child] of Object.entries(node)) {
      if (key === 'loc') continue;
      if (Array.isArray(child)) child.forEach(visit);
      else visit(child);
    }
  };
  visit(loop);
  if (!safe) return new Map();
  for (const [call, read] of reads) if (assigned.has(read.array.name)) reads.delete(call);
  return reads;
}
