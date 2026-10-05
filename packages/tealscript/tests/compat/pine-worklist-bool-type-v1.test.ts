import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';

function check(body: string) {
  return checkProgram(parse('//@version=6\nindicator("Declared type witness")\n' + body));
}

describe('worklist 366: declared bool values', () => {
  it('retains declared type identity through aliases', () => {
    const result = check('bool value = true\nalias = value');
    expect(result.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    for (const name of ['value', 'alias']) {
      expect(result.symbols.find((symbol) => symbol.name === name)?.type?.kind).toBe('bool');
    }
  });
  it('accepts compatible reassignment without changing the declared type', () => {
    const result = check('var bool value = true\nvalue := false');
    expect(result.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    expect(result.symbols.find((symbol) => symbol.name === 'value')?.type?.kind).toBe('bool');
  });
  it.each(["1", "1.5", "\"x\"", "color.red"])('refuses incompatible initializer %s', (expression) => {
    const result = check(`bool value = ${expression}`);
    expect(result.diagnostics.filter((d) => d.severity === 'error').map((d) => d.code)).toContain('type-mismatch');
  });
  it.each(["1", "1.5", "\"x\"", "color.red"])('refuses incompatible reassignment %s', (expression) => {
    const result = check(`var bool value = true\nvalue := ${expression}`);
    expect(result.diagnostics.filter((d) => d.severity === 'error').map((d) => d.code)).toContain('type-mismatch');
  });
});
