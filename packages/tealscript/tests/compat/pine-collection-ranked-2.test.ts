import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { executeScript } from '../../src/runtime/compiledOnly';
import { checkProgram } from '../../src/semantic/checker';

const bars = [0, 1, 2].map((index) => ({
  time: (index + 1) * 60_000,
  open: 10,
  high: 12,
  low: 8,
  close: 11,
  volume: 100,
}));

function run(body: string, elementKind: string, elementName?: string) {
  const ast = parse(`//@version=6\nindicator("ranked collection 2")\n${body}\n`);
  const checked = checkProgram(ast);
  expect(checked.diagnostics.filter((diagnostic) => diagnostic.severity === 'error')).toEqual([]);
  const type = checked.symbols.find((symbol) => symbol.name === 'values')?.type;
  expect(type).toMatchObject({ kind: 'array', qualifier: 'series', elementType: { kind: elementKind } });
  if (elementName) expect(type?.elementType?.name).toBe(elementName);
  const result = executeScript(ast, bars);
  expect(result.errors).toEqual([]);
  return result;
}

function assertValues(result: ReturnType<typeof executeScript>, title: string, expected: number[]) {
  expect(result.plots.find((plot) => plot.title === title)?.values).toEqual(expected);
}

// First-party reference overloads, collection-ranked-v1 ranks41-80. CF002
// resolves the erroneous element-return prose: from returns an array. CF008
// permits enum/UDT alternatives, so the prose list is not an exhaustive guard.
// These are bounded type/value/reference contracts, not drawing pixel claims.
describe('ranked collection batch 2 array.from overloads', () => {
  for (const qualifier of ['const', 'input', 'simple', 'series']) {
    it(`accepts ${qualifier} bool arguments and retains ordered boolean elements (41-43)`, () => {
      const expression =
        qualifier === 'input' ? 'input.bool(true)' : qualifier === 'series' ? 'bar_index % 2 == 0' : 'true';
      const result = run(
        `${qualifier} bool source = ${expression}
values = array.from(source, false)
plot(array.get(values, 0) ? 1 : 0, "First")
plot(array.get(values, 1) ? 1 : 0, "Second")
plot(array.size(values), "Size")`,
        'bool',
      );
      assertValues(result, 'First', qualifier === 'series' ? [1, 0, 1] : [1, 1, 1]);
      assertValues(result, 'Second', [0, 0, 0]);
      assertValues(result, 'Size', [2, 2, 2]);
    });

    it(`accepts ${qualifier} string arguments and retains ordered string elements (44-47)`, () => {
      const expression =
        qualifier === 'input'
          ? 'input.string("first")'
          : qualifier === 'series'
            ? 'bar_index == 0 ? "first" : "later"'
            : '"first"';
      const result = run(
        `${qualifier} string source = ${expression}
values = array.from(source, "second")
plot(array.get(values, 0) == "first" ? 1 : 0, "First")
plot(array.get(values, 1) == "second" ? 1 : 0, "Second")
plot(array.size(values), "Size")`,
        'string',
      );
      assertValues(result, 'First', qualifier === 'series' ? [1, 0, 0] : [1, 1, 1]);
      assertValues(result, 'Second', [1, 1, 1]);
      assertValues(result, 'Size', [2, 2, 2]);
    });

    it(`accepts ${qualifier} color arguments and retains ordered color elements (56-59)`, () => {
      const expression =
        qualifier === 'input'
          ? 'input.color(#102030)'
          : qualifier === 'series'
            ? 'bar_index % 2 == 0 ? #102030 : #405060'
            : '#102030';
      const result = run(
        `${qualifier} color source = ${expression}
values = array.from(source, #AABBCC)
plot(color.r(array.get(values, 0)), "First")
plot(color.r(array.get(values, 1)), "Second")
plot(array.size(values), "Size")`,
        'color',
      );
      assertValues(result, 'First', qualifier === 'series' ? [16, 64, 16] : [16, 16, 16]);
      assertValues(result, 'Second', [170, 170, 170]);
      assertValues(result, 'Size', [2, 2, 2]);
    });
  }

  it.each([
    ['label', 'label.new(0, 11)', 'label.new(1, 22)', 'label.set_y(selected, 33)', 'label.get_y'],
    ['line', 'line.new(0, 11, 1, 12)', 'line.new(0, 22, 1, 23)', 'line.set_y1(selected, 33)', 'line.get_y1'],
    ['box', 'box.new(0, 11, 1, 0)', 'box.new(0, 22, 1, 0)', 'box.set_top(selected, 33)', 'box.get_top'],
  ])(
    'retains ordered %s handles and their source object identity (48-55/64-67)',
    (kind, first, second, mutate, read) => {
      const result = run(
        `first = ${first}
second = ${second}
values = array.from(first, second)
selected = array.get(values, 0)
${mutate}
plot(${read}(first), "First")
plot(${read}(array.get(values, 1)), "Second")
plot(array.size(values), "Size")`,
        kind,
      );
      assertValues(result, 'First', [33, 33, 33]);
      assertValues(result, 'Second', [22, 22, 22]);
      assertValues(result, 'Size', [2, 2, 2]);
    },
  );

  it('retains enum members with distinct identities despite equal titles (60-63)', () => {
    const result = run(
      `enum Direction
    up = "Same"
    down = "Same"
values = array.from(Direction.up, Direction.down)
plot(array.get(values, 0) == Direction.up ? 1 : 0, "First")
plot(array.get(values, 1) == Direction.down ? 1 : 0, "Second")
plot(array.size(values), "Size")`,
      'udt',
      'Direction',
    );
    assertValues(result, 'First', [1, 1, 1]);
    assertValues(result, 'Second', [1, 1, 1]);
    assertValues(result, 'Size', [2, 2, 2]);
  });

  it('retains table handles and targets the selected table through its original ID (68-71)', () => {
    const result = run(
      `var first = table.new(position.top_left, 1, 1)
var second = table.new(position.bottom_right, 1, 1)
values = array.from(first, second)
table.cell(array.get(values, 0), 0, 0, "first")
table.cell(array.get(values, 1), 0, 0, "second")
table.set_position(first, position.bottom_left)
plot(array.size(values), "Size")`,
      'table',
    );
    assertValues(result, 'Size', [2, 2, 2]);
    const tables = result.drawings.filter((drawing) => drawing.type === 'table');
    expect(tables).toHaveLength(2);
    expect(tables.find((table) => table.position === 'bottom_left')?.cells[0]?.text).toBe('first');
    expect(tables.find((table) => table.position === 'bottom_right')?.cells[0]?.text).toBe('second');
  });

  it('retains linefill IDs and source line references in argument order (72-75)', () => {
    const result = run(
      `a = line.new(0, 11, 1, 12)
b = line.new(0, 10, 1, 10)
c = line.new(0, 22, 1, 23)
d = line.new(0, 20, 1, 20)
first = linefill.new(a, b, #102030)
second = linefill.new(c, d, #405060)
values = array.from(first, second)
line.set_y1(a, 33)
plot(line.get_y1(linefill.get_line1(array.get(values, 0))), "First")
plot(line.get_y1(linefill.get_line1(array.get(values, 1))), "Second")
plot(array.size(values), "Size")`,
      'linefill',
    );
    assertValues(result, 'First', [33, 33, 33]);
    assertValues(result, 'Second', [22, 22, 22]);
    assertValues(result, 'Size', [2, 2, 2]);
  });
});

describe('ranked collection batch 2 generic array.new creation (76-80)', () => {
  it.each([
    ['int', '11', '33', 'array.get(values, 0)', 'array.get(other, 0)', [33, 33, 33], [11, 11, 11]],
    ['float', '1.5', '3.5', 'array.get(values, 0)', 'array.get(other, 0)', [3.5, 3.5, 3.5], [1.5, 1.5, 1.5]],
    ['bool', 'true', 'false', 'array.get(values, 0) ? 1 : 0', 'array.get(other, 0) ? 1 : 0', [0, 0, 0], [1, 1, 1]],
    [
      'string',
      '"seed"',
      '"changed"',
      'array.get(values, 0) == "changed" ? 1 : 0',
      'array.get(other, 0) == "seed" ? 1 : 0',
      [1, 1, 1],
      [1, 1, 1],
    ],
    [
      'color',
      '#102030',
      '#405060',
      'color.r(array.get(values, 0))',
      'color.r(array.get(other, 0))',
      [64, 64, 64],
      [16, 16, 16],
    ],
  ] as const)(
    'creates independent array<%s> objects with index zero addressing the first element',
    (kind, seed, changed, first, other, expectedFirst, expectedOther) => {
      const result = run(
        `values = array.new<${kind}>(2, ${seed})
other = array.new<${kind}>(2, ${seed})
alias = values
array.set(alias, 0, ${changed})
plot(${first}, "First")
plot(${other}, "Other")
plot(array.size(values), "Size")`,
        kind,
      );
      assertValues(result, 'First', [...expectedFirst]);
      assertValues(result, 'Other', [...expectedOther]);
      assertValues(result, 'Size', [2, 2, 2]);
    },
  );
});
