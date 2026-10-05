import { describe, expect, it } from 'vitest';

import { parse } from '../parser';
import { checkProgram } from './checker';

const check = (body: string) => checkProgram(parse(`//@version=6\nindicator("Scope")\n${body}`));

describe('ledger gaps42 declaration and scope rules', () => {
  it.each([
    ['case-sensitive spelling (1664)', 'Value = 1\nplot(value)'],
    ['declaration order (1668)', 'plot(later)\nlater = 1'],
    ['discard cannot be read (1671)', '[_, kept] = [1, 2]\nplot(_)'],
    ['conditional locals stay in their block (1679)', 'if close > open\n    local = 1\nplot(local)'],
  ])('refuses unavailable identifiers: %s', (_rule, body) => {
    expect(check(body).diagnostics.map((diagnostic) => diagnostic.code)).toEqual(['unknown-identifier']);
  });

  it('requires tuple arity to match the initializer (1670)', () => {
    expect(check('[first, second] = [1, 2, 3]').diagnostics).toEqual([
      expect.objectContaining({ code: 'builtin-shadow', severity: 'warning', message: "Variable 'second' shadows a Pine builtin" }),
      expect.objectContaining({ code: 'tuple-shape-mismatch', severity: 'error' }),
    ]);
  });

  it('infers scalar kinds and retains distinct case-sensitive names (1664/1665)', () => {
    const result = check('Value = 1\nvalue = 1.5\nflag = true\nmessage = "ok"');
    expect(result.diagnostics).toEqual([]);
    expect(result.symbols.map((symbol) => [symbol.name, symbol.type?.kind])).toEqual([
      ['Value', 'int'],
      ['value', 'float'],
      ['flag', 'bool'],
      ['message', 'string'],
    ]);
  });

  it('refuses an incompatible explicitly typed initializer (1666)', () => {
    expect(check('int value = "bad"').diagnostics.map((diagnostic) => diagnostic.code)).toEqual(['type-mismatch']);
  });
});
