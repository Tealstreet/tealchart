import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';

function check(body: string) {
  return checkProgram(parse('//@version=6\nindicator("Fundamental type witness")\n' + body));
}

describe('worklist 365: declared float values', () => {
  it('retains type identity through an alias and missing initialization', () => {
    const result = check('float value = -2.5\nalias = value\nfloat missing = na');
    expect(result.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    for (const name of ['value', 'alias', 'missing']) {
      expect(result.symbols.find((symbol) => symbol.name === name)?.type?.kind).toBe('float');
    }
  });
  it('accepts compatible reassignment without changing the declared type', () => {
    const result = check('var float value = -2.5\nvalue := -2.5');
    expect(result.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    expect(result.symbols.find((symbol) => symbol.name === 'value')?.type?.kind).toBe('float');
  });
  it.each(["\"x\"", "true", "color.red"])('refuses incompatible initializer %s', (expression) => {
    const result = check(`float value = ${expression}`);
    expect(result.diagnostics.filter((d) => d.severity === 'error').map((d) => d.code)).toContain('type-mismatch');
  });
  it.each(["\"x\"", "true", "color.red"])('refuses incompatible reassignment %s', (expression) => {
    const result = check(`var float value = -2.5\nvalue := ${expression}`);
    expect(result.diagnostics.filter((d) => d.severity === 'error').map((d) => d.code)).toContain('type-mismatch');
  });
  it('widens integer initialization and reassignment to float', () => {
    const result = check('float value = 7\nvalue := 9');
    expect(result.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    expect(result.symbols.find((symbol) => symbol.name === 'value')?.type?.kind).toBe('float');
  });
});
