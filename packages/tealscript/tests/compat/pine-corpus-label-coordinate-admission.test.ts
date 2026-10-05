import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { compile } from '../../src/runtime/codegen/compile';
import { checkProgram } from '../../src/semantic/checker';

const errors = (version: number, body: string) =>
  checkProgram(parse(`//@version=${version}\nindicator("Coordinate admission")\n${body}`)).diagnostics.filter(
    (diagnostic) => diagnostic.severity === 'error',
  );

// Published Leviathan v5 and AVWAP v6 contain these exact expression shapes.
// Admission evidence does not settle coordinate rounding.
describe('Corpus label coordinate admission', () => {
  it.each([
    ['v5 series midpoint', 5, 'float leftMax = bar_index[1]\nlabel.new((bar_index - 1 + int(leftMax)) / 2, high)'],
    ['v5 named series midpoint', 5, 'float leftMax = bar_index[1]\nlabel.new(y=high, x=(bar_index - 1 + int(leftMax)) / 2)'],
    ['v5 UDF midpoint', 5, 'draw(startBar) =>\n    label.new((bar_index - 1 + int(startBar)) / 2, high)\ndraw(bar_index[1])'],
    ['v6 composite integral initializer', 6, 'KDE_BINS = 40\nDIST_X_START = 15\nint readoutX = bar_index + DIST_X_START + KDE_BINS / 2\nlabel.new(readoutX, high)'],
  ])('admits %s', (_name, version, body) => {
    expect(errors(Number(version), String(body))).toEqual([]);
    const result = compile(parse(`//@version=${version}\nindicator("Coordinate admission")\n${body}`));
    expect(result.success).toBe(true);
    expect(result.unsupported).toEqual([]);
  });

  // Native-backed d79356eef1; drawing-division-w8-b00b-v1/REPORT-v1.md.
  it.each([
    [5, 'label.new((bar_index + 1) / input.int(2), high)'],
    [5, 'line.new((bar_index + 1) / 2, high, bar_index, low)'],
    [6, 'label.new((bar_index + 1) / 2, high)'],
  ])('admits integer-derived division coordinate v%s: %s', (version, body) => {
    expect(errors(Number(version), String(body))).toEqual([]);
    const result = compile(parse(`//@version=${version}\nindicator("Coordinate admission")\n${body}`));
    expect(result.success).toBe(true);
    expect(result.unsupported).toEqual([]);
  });

  it.each([
    [5, 'label.new(bar_index + 1.5, high)'],
    [5, 'label.new((close + bar_index) / 2, high)'],
    [5, 'label.new((bar_index + 1) / 2.0, high)'],
    [6, 'int x = bar_index + 41 / 2\nplot(x)'],
    [6, 'int x = bar_index + 40.0 / 2\nplot(x)'],
    [6, 'int x = bar_index + close / 2\nplot(x)'],
    [6, 'int x = bar_index + input.int(40) / 2\nplot(x)'],
  ])('retains unrelated refusal v%s: %s', (version, body) => {
    expect(errors(Number(version), String(body)).map((diagnostic) => diagnostic.code)).toContain('type-mismatch');
  });
});
