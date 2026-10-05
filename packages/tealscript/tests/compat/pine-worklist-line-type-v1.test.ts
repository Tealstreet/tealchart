import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';

function check(body: string) {
  return checkProgram(parse('//@version=6\nindicator("Declared type witness")\n' + body));
}

describe('worklist 369: declared line values', () => {
  it('retains declared type identity through aliases', () => {
    const result = check('line value = line.new(0, 1, 1, 2)\nalias = value\nline missing = na');
    expect(result.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    for (const name of ['value', 'alias', 'missing']) {
      expect(result.symbols.find((symbol) => symbol.name === name)?.type?.kind).toBe('line');
    }
  });
  it('accepts compatible reassignment without changing the declared type', () => {
    const result = check('var line value = line.new(0, 1, 1, 2)\nvalue := line.new(1, 2, 2, 3)');
    expect(result.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    expect(result.symbols.find((symbol) => symbol.name === 'value')?.type?.kind).toBe('line');
  });
  it.each(["1", "1.5", "\"x\"", "true", "label.new(0, 1)"])('refuses incompatible initializer %s', (expression) => {
    const result = check(`line value = ${expression}`);
    expect(result.diagnostics.filter((d) => d.severity === 'error').map((d) => d.code)).toContain('type-mismatch');
  });
  it.each(["1", "1.5", "\"x\"", "true", "label.new(0, 1)"])('refuses incompatible reassignment %s', (expression) => {
    const result = check(`var line value = line.new(0, 1, 1, 2)\nvalue := ${expression}`);
    expect(result.diagnostics.filter((d) => d.severity === 'error').map((d) => d.code)).toContain('type-mismatch');
  });
});
