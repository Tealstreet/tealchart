import { describe, expect, it } from 'vitest';

import { parse } from '../parser';
import { checkProgram } from './checker';

// Pine v6 reference kw_if, detailedDesc[0]: value-returning branches must have compatible types.
describe('value-returning if branch types', () => {
  it.each([
    ['integer and string', '3', '"three"'],
    ['float and boolean', '3.5', 'true'],
    ['color and float', 'color.red', '3.5'],
    ['distinct collection elements', 'array.new<int>()', 'array.new<string>()'],
  ])('rejects incompatible %s branches', (_name, consequent, alternate) => {
    const result = checkProgram(parse(`//@version=6
indicator("Branch types")
value = if close > open
    ${consequent}
else
    ${alternate}`));

    expect(result.diagnostics).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'conditional-branch-type-mismatch', severity: 'error' }),
    ]));
  });

  it.each([
    ['numeric widening', '3', '3.5', 'float'],
    ['matching strings', '"first"', '"second"', 'string'],
    ['matching array elements', 'array.new<int>()', 'array.from(3)', 'array'],
  ])('accepts %s and retains its inferred type', (_name, consequent, alternate, kind) => {
    const result = checkProgram(parse(`//@version=6
indicator("Branch types")
value = if close > open
    ${consequent}
else
    ${alternate}`));

    expect(result.diagnostics.filter((diagnostic) => diagnostic.severity === 'error')).toEqual([]);
    expect(result.symbols.find((symbol) => symbol.name === 'value')?.type).toMatchObject({ kind, qualifier: 'series' });
  });
});
