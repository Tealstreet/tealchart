import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { compile } from '../../src/runtime/codegen/compile';
import { checkProgram } from '../../src/semantic/checker';

const errors = (version: number, body: string) =>
  checkProgram(parse(`//@version=${version}\nindicator("Published coordinate admission")\n${body}`)).diagnostics.filter(
    (diagnostic) => diagnostic.severity === 'error',
  );

// Exact published MA Sabres/BackQuant expressions have integer operands, whose
// division is inferred as float. Publication proves admission, not rounding.
describe('Published integer-derived drawing coordinate expressions', () => {
  it.each([
    [
      'v5 chart point positional',
      5,
      'len = input.int(50)\np = chart.point.from_index(bar_index + (len / 2 - 1), close)\nplot(p.price)',
    ],
    [
      'v5 chart point named',
      5,
      'len = input.int(50)\np = chart.point.from_index(price=close, index=bar_index + (len / 2 - 1))\nplot(p.price)',
    ],
    [
      'v6 label positional',
      6,
      'int X_START = 40\nint X_END = 200\nid = label.new(bar_index + (X_START + X_END) / 2, close)\nplot(label.get_y(id))',
    ],
    [
      'v6 label named',
      6,
      'int X_START = 40\nint X_END = 200\nid = label.new(y=close, x=bar_index + (X_START + X_END) / 2)\nplot(label.get_y(id))',
    ],
  ])('admits %s without changing arithmetic', (_name, version, body) => {
    expect(errors(Number(version), String(body))).toEqual([]);
    const compiled = compile(parse(`//@version=${version}\nindicator("Published coordinate admission")\n${body}`));
    expect(compiled.success).toBe(true);
    expect(compiled.unsupported).toEqual([]);
  });

  it.each([
    'label.new(bar_index + 1.5, close)',
    'chart.point.from_index(bar_index + 1.5, close)',
    'label.new(bar_index + input.float(40.0) / 2, close)',
    'chart.point.from_index(bar_index + input.float(50.0) / 2, close)',
    'label.new(true, close)',
    'chart.point.from_index("not an index", close)',
  ])('retains the unproven coordinate/other-slot refusal: %s', (call) => {
    expect(errors(6, `${call}\nplot(close)`).map((diagnostic) => diagnostic.code)).toContain('type-mismatch');
  });

  it.each(["label.new(bar_index + (40 + 201) / 2, close)", "chart.point.from_index(bar_index + input.int(5) / 2, close)", "label.new(bar_index / 2, close)", "label.set_x(label.new(bar_index, close), bar_index / 2)"])('admits captured integer-derived coordinate provenance: %s', (call) => {
    expect(errors(6, `${call}\nplot(close)`)).toEqual([]);
  });

  it.each(['label.new(bar_index, close)', 'chart.point.from_index(bar_index, close)'])(
    'preserves integer coordinate control %s',
    (call) => {
      expect(errors(6, `${call}\nplot(close)`)).toEqual([]);
    },
  );

  it('retains integer division provenance after integer operand reassignment', () => {
    expect(errors(6, 'int left = 40\nint right = 200\nright := 201\nlabel.new(bar_index + (left + right) / 2, close)\nplot(close)')).toEqual([]);
  });

  it('retains the declared float operand guard despite an integral default', () => {
    expect(
      errors(6, 'float left = 40\nint right = 200\nlabel.new(bar_index + (left + right) / 2, close)\nplot(close)').map(
        (diagnostic) => diagnostic.code,
      ),
    ).toContain('type-mismatch');
  });
});
