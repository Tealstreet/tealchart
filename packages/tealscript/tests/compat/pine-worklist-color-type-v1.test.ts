import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';

function check(body: string) {
  return checkProgram(parse('//@version=6\nindicator("Declared type witness")\n' + body));
}

describe('worklist 368: declared color values', () => {
  it('retains declared type identity through aliases', () => {
    const result = check('color value = color.red\nalias = value\ncolor missing = na');
    expect(result.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    for (const name of ['value', 'alias', 'missing']) {
      expect(result.symbols.find((symbol) => symbol.name === name)?.type?.kind).toBe('color');
    }
  });
  it('accepts compatible reassignment without changing the declared type', () => {
    const result = check('var color value = color.red\nvalue := color.blue');
    expect(result.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    expect(result.symbols.find((symbol) => symbol.name === 'value')?.type?.kind).toBe('color');
  });
  it.each(["1", "1.5", "\"x\"", "true"])('refuses incompatible initializer %s', (expression) => {
    const result = check(`color value = ${expression}`);
    expect(result.diagnostics.filter((d) => d.severity === 'error').map((d) => d.code)).toContain('type-mismatch');
  });
  it.each(["1", "1.5", "\"x\"", "true"])('refuses incompatible reassignment %s', (expression) => {
    const result = check(`var color value = color.red\nvalue := ${expression}`);
    expect(result.diagnostics.filter((d) => d.severity === 'error').map((d) => d.code)).toContain('type-mismatch');
  });
});
