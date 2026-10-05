import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';

function check(body: string) {
  return checkProgram(parse('//@version=6\nindicator("Fundamental type witness")\n' + body));
}

describe('worklist 367: declared string values', () => {
  it('retains type identity through an alias and missing initialization', () => {
    const result = check('string value = "Pine 文本"\nalias = value\nstring missing = na');
    expect(result.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    for (const name of ['value', 'alias', 'missing']) {
      expect(result.symbols.find((symbol) => symbol.name === name)?.type?.kind).toBe('string');
    }
  });
  it('accepts compatible reassignment without changing the declared type', () => {
    const result = check('var string value = "Pine 文本"\nvalue := "Pine 文本"');
    expect(result.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    expect(result.symbols.find((symbol) => symbol.name === 'value')?.type?.kind).toBe('string');
  });
  it.each(["2", "2.5", "true", "color.red"])('refuses incompatible initializer %s', (expression) => {
    const result = check(`string value = ${expression}`);
    expect(result.diagnostics.filter((d) => d.severity === 'error').map((d) => d.code)).toContain('type-mismatch');
  });
  it.each(["2", "2.5", "true", "color.red"])('refuses incompatible reassignment %s', (expression) => {
    const result = check(`var string value = "Pine 文本"\nvalue := ${expression}`);
    expect(result.diagnostics.filter((d) => d.severity === 'error').map((d) => d.code)).toContain('type-mismatch');
  });
});
