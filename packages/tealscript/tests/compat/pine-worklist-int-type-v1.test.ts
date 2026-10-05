import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';

function check(body: string) {
  return checkProgram(parse('//@version=6\nindicator("Fundamental type witness")\n' + body));
}

describe('worklist 364: declared int values', () => {
  it('retains type identity through an alias and missing initialization', () => {
    const result = check('int value = -7\nalias = value\nint missing = na');
    expect(result.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    for (const name of ['value', 'alias', 'missing']) {
      expect(result.symbols.find((symbol) => symbol.name === name)?.type?.kind).toBe('int');
    }
  });
  it('accepts compatible reassignment without changing the declared type', () => {
    const result = check('var int value = -7\nvalue := -7');
    expect(result.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    expect(result.symbols.find((symbol) => symbol.name === 'value')?.type?.kind).toBe('int');
  });
  it.each(["2.5", "\"x\"", "true", "color.red"])('refuses incompatible initializer %s', (expression) => {
    const result = check(`int value = ${expression}`);
    expect(result.diagnostics.filter((d) => d.severity === 'error').map((d) => d.code)).toContain('type-mismatch');
  });
  it.each(["2.5", "\"x\"", "true", "color.red"])('refuses incompatible reassignment %s', (expression) => {
    const result = check(`var int value = -7\nvalue := ${expression}`);
    expect(result.diagnostics.filter((d) => d.severity === 'error').map((d) => d.code)).toContain('type-mismatch');
  });
});
