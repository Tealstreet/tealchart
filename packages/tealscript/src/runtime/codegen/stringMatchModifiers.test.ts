import { describe, expect, it } from 'vitest';

import { parse } from '../../parser';
import { executeScript } from '../compiledOnly';

// https://www.tradingview.com/pine-script-docs/concepts/strings/#regular-expressions
// Leading i enables ASCII case-insensitive matching; m and s remain independent.
describe('leading ASCII case-insensitive regex modifier', () => {
  it.each([
    ['AbC', '(?i)abc', 'AbC'],
    ['aBc42', '(?i)[A-Z]+\\d+', 'aBc42'],
    ['Z[ab', '(?i)[Z-a]+', 'Z[a'],
    ['A', '(?i)\\x41', 'A'],
    ['A', '(?i)\\u0041', 'A'],
    ['Ab\nc', '(?is)ab.c', 'Ab\nc'],
    ['a\nBc', '(?mi)^bc', 'Bc'],
    ['É', '(?i)é', ''],
    ['é', '(?i)é', 'é'],
    ['ABC', 'abc', ''],
    ['A\nB', '(?m).+', 'A'],
    ['A\nB', '(?s).+', 'A\nB'],
  ])('matches %s against %s', (source, pattern, expected) => {
    const ast = parse(`//@version=6
indicator("Regex modifiers")
label.new(0, 1, str.match(${JSON.stringify(source)}, ${JSON.stringify(pattern)}))
`);
    const result = executeScript(ast, [{ time: 60000, open: 1, high: 2, low: 0, close: 1, volume: 1 }]);
    expect(result.errors).toEqual([]);
    expect(result.profile.compiledBarErrors?.count ?? 0).toBe(0);
    expect(result.drawings.filter((drawing) => drawing.type === 'label').map((drawing) => drawing.text)).toEqual([expected]);
  });
});
