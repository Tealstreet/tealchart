import { describe, expect, it } from 'vitest';

import { parse } from '../parser';
import { executeScript } from '../runtime/compiledOnly';
import { checkProgram } from './checker';

const program = (body: string) => parse(`//@version=6\nindicator("Array constructor clauses")\n${body}`);
const errors = (body: string) =>
  checkProgram(program(body)).diagnostics.filter((diagnostic) => diagnostic.severity === 'error');
const bars = [2, 3].map((close, index) => ({
  time: (index + 1) * 60000,
  open: close,
  high: close,
  low: close,
  close,
  volume: 1,
}));

// pine-v6-reference-v1.json functions[456], signature, size and initial_value.
describe('PARTIAL 428–432: generic array constructor', () => {
  it.each([
    ['float', '"bad"'],
    ['bool', '2'],
  ])('432: validates builtin %s seeds when a parameter is named array', (kind, seed) => {
    const body = `f(array<int> array) => array.new<${kind}>(size=2, initial_value=${seed})\na = f(array.new<int>())`;
    expect(errors(body).some((diagnostic) => diagnostic.code === 'type-mismatch')).toBe(true);
  });

  it.each(['2.5', 'true', '"2"', 'color.red', 'array.new<int>()'])('431: refuses non-int size %s', (size) => {
    expect(errors(`a = array.new<float>(size=${size})`).some((diagnostic) => diagnostic.code === 'type-mismatch')).toBe(
      true,
    );
  });

  it.each([
    ['int', '2.5'],
    ['float', '"seed"'],
    ['bool', '2'],
    ['string', 'false'],
    ['color', '"red"'],
    ['label', 'line.new(0, 1, 1, 2)'],
  ])('432: refuses %s initial_value %s', (kind, seed) => {
    expect(
      errors(`a = array.new<${kind}>(initial_value=${seed}, size=2)`).some(
        (diagnostic) => diagnostic.code === 'type-mismatch',
      ),
    ).toBe(true);
  });

  it.each([
    ['const', 'const int n = 2', [2, 2]],
    ['input', 'n = input.int(2)', [2, 2]],
    ['simple', 'simple int n = 2', [2, 2]],
    ['series', 'series int n = bar_index + 2', [2, 3]],
  ])('428–432: %s size, defaults, uniform seed and zero-based indices', (_qualifier, declaration, sizes) => {
    const body = `${declaration}\nempty = array.new<float>()\nmissing = array.new<float>(n)\nseeded = array.new<float>(initial_value=7, size=n)\nplot(empty.size())\nplot(missing.size())\nplot(na(missing.get(0)) ? 1 : 0)\nplot(seeded.get(0))\nplot(seeded.get(n - 1))`;
    const checked = checkProgram(program(body));
    expect(checked.diagnostics.filter((diagnostic) => diagnostic.severity === 'error')).toEqual([]);
    expect(checked.symbols.find((symbol) => symbol.name === 'seeded')?.type).toEqual({
      kind: 'array',
      qualifier: 'series',
      elementType: { kind: 'float' },
    });
    const result = executeScript(program(body), bars);
    expect(result.errors).toEqual([]);
    expect(result.plots.map((plot) => plot.values)).toEqual([[0, 0], sizes, [1, 1], [7, 7], [7, 7]]);
  });

  it.each([
    ['int', '3', 'seeded.get(1)', 3],
    ['float', '3', 'seeded.get(1)', 3],
    ['bool', 'true', 'seeded.get(1) ? 1 : 0', 1],
    ['string', '"seed"', 'str.length(seeded.get(1))', 4],
    ['color', 'color.red', 'seeded.get(1) == color.red ? 1 : 0', 1],
    ['label', 'label.new(0, 11)', 'label.get_y(seeded.get(1))', 11],
    ['line', 'line.new(0, 13, 1, 17)', 'line.get_y1(seeded.get(1))', 13],
  ])('432: accepts matching %s seeds and explicit missing defaults', (kind, seed, read, expected) => {
    const body = `seeded = array.new<${kind}>(2, ${seed})\nmissing = array.new<${kind}>(2, na)\nplot(${read})\nplot(missing.size())`;
    expect(errors(body)).toEqual([]);
    const result = executeScript(program(body), bars);
    expect(result.errors).toEqual([]);
    expect(result.plots.map((plot) => plot.values)).toEqual([
      [expected, expected],
      [2, 2],
    ]);
  });
});
