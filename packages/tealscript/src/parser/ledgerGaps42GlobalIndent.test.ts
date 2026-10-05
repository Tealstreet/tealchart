import { describe, expect, it } from 'vitest';

import { parse, TealscriptParseError } from './parser';

const script = (body: string) => `//@version=6\nindicator("Global indentation")\n${body}`;

describe('ledger gaps42 global statements start at column zero (row1654)', () => {
  it.each([' value = 1\nplot(value)', '\tvalue = 1\nplot(value)', '  plot(1)'])(
    'refuses indentation before a global statement %j',
    (body) => {
      expect(() => parse(script(body))).toThrow(TealscriptParseError);
    },
  );

  it('keeps nested tabs, wrapped expressions, comments and comma chains', () => {
    const source = script(`  // An indented comment is allowed.
first = 1, second = 2
sum() =>
\tvalue = (first +
        second)
\tvalue
plot(sum())`);
    expect(() => parse(source)).not.toThrow();
    const program = parse(source);
    expect(program.body.map((statement) => statement.type)).toEqual([
      'IndicatorDeclaration',
      'VariableDeclaration',
      'VariableDeclaration',
      'FunctionDeclaration',
      'ExpressionStatement',
    ]);
    const fn = program.body[3];
    expect(fn.type).toBe('FunctionDeclaration');
    if (fn.type !== 'FunctionDeclaration') throw new Error('Missing function');
    expect(fn.body).toHaveLength(2);
  });
});
