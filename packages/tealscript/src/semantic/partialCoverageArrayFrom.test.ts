import { describe, expect, it } from 'vitest';

import { parse } from '../parser';
import { executeScript } from '../runtime/compiledOnly';
import { checkProgram } from './checker';

const bars = [2, 3].map((close, index) => ({
  time: (index + 1) * 60000,
  open: close,
  high: close,
  low: close,
  close,
  volume: 1,
}));
const qualifiers = ['const', 'input', 'simple', 'series'] as const;
const kinds = [
  { kind: 'int', expression: '2', input: 'input.int(2)', series: 'bar_index + 2', read: 'a.get(1)', expected: [2, 2] },
  {
    kind: 'float',
    expression: '2.5',
    input: 'input.float(2.5)',
    series: 'close + 0.5',
    read: 'a.get(1)',
    expected: [2.5, 2.5],
  },
  {
    kind: 'bool',
    expression: 'true',
    input: 'input.bool(true)',
    series: 'close > 0',
    read: 'a.get(1) ? 1 : 0',
    expected: [1, 1],
  },
  {
    kind: 'string',
    expression: '"yes"',
    input: 'input.string("yes")',
    series: 'str.tostring(close)',
    read: 'str.length(a.get(1))',
    expected: [3, 3],
  },
] as const;

// pine-v6-reference-v1.json functions[483–489], admitted argument kinds/qualifiers.
describe('PARTIAL 467–479: array.from argument domains', () => {
  it('467: validates builtin element kinds when a parameter is named array', () => {
    const body = 'f(array<int> array) => array.from(1, "bad")\na = f(array.new<int>())';
    const checked = checkProgram(parse(`//@version=6\nindicator("namespace from")\n${body}`));
    expect(checked.diagnostics.some((diagnostic) => diagnostic.code === 'type-mismatch')).toBe(true);
  });

  it.each([
    ['1', '"mixed"'],
    ['true', '1'],
    ['"text"', 'false'],
    ['color.red', '1'],
    ['label.new(0, 7)', 'line.new(0, 7, 1, 9)'],
  ])('refuses incompatible known argument kinds %s / %s', (first, second) => {
    const checked = checkProgram(parse(`//@version=6\nindicator("mixed from")\na = array.from(${first}, ${second})`));
    expect(
      checked.diagnostics.some((diagnostic) => diagnostic.severity === 'error' && diagnostic.code === 'type-mismatch'),
    ).toBe(true);
  });

  it('471: promotes mixed int/float values to a float array', () => {
    const program = parse(
      '//@version=6\nindicator("numeric from")\na = array.from(1, 2.5)\nplot(a.get(0))\nplot(a.get(1))',
    );
    const checked = checkProgram(program);
    expect(checked.diagnostics.filter((diagnostic) => diagnostic.severity === 'error')).toEqual([]);
    expect(checked.symbols.find((symbol) => symbol.name === 'a')?.type).toEqual({
      kind: 'array',
      qualifier: 'series',
      elementType: { kind: 'float' },
    });
    const result = executeScript(program, bars);
    expect(result.errors).toEqual([]);
    expect(result.plots.map((plot) => plot.values)).toEqual([
      [1, 1],
      [2.5, 2.5],
    ]);
  });

  it.each(kinds.flatMap((entry) => qualifiers.map((qualifier) => ({ ...entry, qualifier }))))(
    '$kind $qualifier arguments retain element kind and ordered values',
    (entry) => {
      const expression =
        entry.qualifier === 'input' ? entry.input : entry.qualifier === 'series' ? entry.series : entry.expression;
      const declaration = `${entry.qualifier} ${entry.kind} x = ${expression}`;
      const source = `//@version=6\nindicator("from clauses")\n${declaration}\na = array.from(x, ${entry.expression})\nplot(a.size())\nplot(${entry.read})`;
      const program = parse(source);
      const checked = checkProgram(program);
      expect(checked.diagnostics.filter((diagnostic) => diagnostic.severity === 'error')).toEqual([]);
      expect(checked.symbols.find((symbol) => symbol.name === 'a')?.type).toEqual({
        kind: 'array',
        qualifier: 'series',
        elementType: { kind: entry.kind },
      });
      const result = executeScript(program, bars);
      expect(result.errors).toEqual([]);
      expect(result.plots.map((plot) => plot.values)).toEqual([[2, 2], [...entry.expected]]);
    },
  );

  it.each([
    ['label', 'label.new(0, 7)', 'label.new(1, 11)', 'label.get_y(a.get(0))', 'label.get_y(a.get(1))'],
    ['line', 'line.new(0, 7, 1, 9)', 'line.new(0, 11, 1, 13)', 'line.get_y1(a.get(0))', 'line.get_y1(a.get(1))'],
  ])(
    '477/479: matching series %s handles retain identity and argument order',
    (kind, first, second, readFirst, readSecond) => {
      const program = parse(
        `//@version=6\nindicator("reference from")\nx = ${first}\ny = ${second}\na = array.from(x, y)\nplot(${readFirst})\nplot(${readSecond})`,
      );
      const checked = checkProgram(program);
      expect(checked.diagnostics.filter((diagnostic) => diagnostic.severity === 'error')).toEqual([]);
      expect(checked.symbols.find((symbol) => symbol.name === 'a')?.type).toEqual({
        kind: 'array',
        qualifier: 'series',
        elementType: { kind },
      });
      const result = executeScript(program, bars);
      expect(result.errors).toEqual([]);
      expect(result.plots.map((plot) => plot.values)).toEqual([
        [7, 7],
        [11, 11],
      ]);
    },
  );
});
