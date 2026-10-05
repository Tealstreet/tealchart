import { describe, expect, it } from 'vitest';

import { parse, TealscriptParseError } from './parser';

const script = (body: string) => `//@version=6\nindicator("Token boundary")\n${body}\nplot(1)`;

describe('ledger gaps42 identifier token boundaries (row1662)', () => {
  it.each(['1name', '1_name', '1.5name', '1e2name', '.5name', '1e+2name'])(
    'refuses a numeric prefix joined to identifier %s',
    (name) => {
      expect(() => parse(script(`${name} = 2`))).toThrow(TealscriptParseError);
    },
  );

  it.each([
    ['_a1', '1e-3', 0.001],
    ['A9_', '.5', 0.5],
    ['a1', '1e+2', 100],
  ] as const)('keeps identifier %s and complete number %s', (name, raw, value) => {
    const program = parse(script(`${name} = ${raw}`));
    const declaration = program.body[1];
    expect(declaration.type).toBe('VariableDeclaration');
    if (declaration.type !== 'VariableDeclaration') throw new Error('Missing declaration');
    expect(declaration.names).toMatchObject({ type: 'VariableDeclarator', name: { type: 'Identifier', name } });
    expect(declaration.init).toMatchObject({ type: 'NumericLiteral', raw, value });
    expect(program.body).toHaveLength(3);
  });
});
