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

function program(body: string) {
  return parse(`//@version=6\nindicator("ranked collection 3")\n${body}\n`);
}

function run(body: string, elementKind = 'float', collectionKind = 'array') {
  const ast = program(body);
  const checked = checkProgram(ast);
  expect(checked.diagnostics.filter((diagnostic) => diagnostic.severity === 'error')).toEqual([]);
  expect(checked.symbols.find((symbol) => symbol.name === 'values')?.type).toMatchObject({
    kind: collectionKind,
    qualifier: 'series',
    elementType: { kind: elementKind },
  });
  const result = executeScript(ast, bars);
  expect(result.errors).toEqual([]);
  return { result, checked };
}

function vector(result: ReturnType<typeof executeScript>, title: string, expected: number[]) {
  expect(result.plots.find((plot) => plot.title === title)?.values).toEqual(expected);
}

const qualifiers = ['const', 'input', 'simple', 'series'] as const;

// Ranked clauses81-120: supplied values and documented defaults/indexing.
// Selected primitive arrays and numeric matrices; no exhaustive type list,
// negative-array migration, realtime lifetime, or native drawing claim.
describe('ranked collection batch 3 constructors', () => {
  for (const constructor of ['array.new<float>', 'array.new_float']) {
    it(`${constructor} defaults size to zero and array.from supplies distinct elements`, () => {
      const { result } = run(`values = ${constructor}()
elements = array.from(11.5, 22.5)
plot(array.size(values), "Empty")
plot(array.get(elements, 0), "First")
plot(array.get(elements, 1), "Second")`);
      vector(result, 'Empty', [0, 0, 0]);
      vector(result, 'First', [11.5, 11.5, 11.5]);
      vector(result, 'Second', [22.5, 22.5, 22.5]);
    });

    it(`${constructor} defaults each explicitly sized float element to na`, () => {
      const { result } = run(`values = ${constructor}(2)
plot(na(array.get(values, 0)) ? 1 : 0, "FirstMissing")
plot(na(array.get(values, 1)) ? 1 : 0, "SecondMissing")
plot(array.size(values), "Size")`);
      vector(result, 'FirstMissing', [1, 1, 1]);
      vector(result, 'SecondMissing', [1, 1, 1]);
      vector(result, 'Size', [2, 2, 2]);
    });

    for (const qualifier of qualifiers) {
      it(`${constructor} accepts ${qualifier} size and float seed arguments`, () => {
        const size = qualifier === 'input' ? 'input.int(2)' : qualifier === 'series' ? 'bar_index + 1' : '2';
        const seed = qualifier === 'input' ? 'input.float(7.5)' : qualifier === 'series' ? '7.5 + bar_index' : '7.5';
        const { result } = run(`${qualifier} int count = ${size}
${qualifier} float seed = ${seed}
values = ${constructor}(initial_value=seed, size=count)
plot(array.size(values), "Size")
plot(array.get(values, 0), "First")
plot(array.get(values, count - 1), "Last")`);
        vector(result, 'Size', qualifier === 'series' ? [1, 2, 3] : [2, 2, 2]);
        vector(result, 'First', qualifier === 'series' ? [7.5, 8.5, 9.5] : [7.5, 7.5, 7.5]);
        vector(result, 'Last', qualifier === 'series' ? [7.5, 8.5, 9.5] : [7.5, 7.5, 7.5]);
      });
    }
  }

  for (const qualifier of qualifiers) {
    it(`array.new_float accepts ${qualifier} int seeds as float elements`, () => {
      const seed = qualifier === 'input' ? 'input.int(7)' : qualifier === 'series' ? '7 + bar_index' : '7';
      const { result } = run(`${qualifier} int seed = ${seed}
values = array.new_float(2, seed)
plot(array.get(values, 0), "First")
plot(array.get(values, 1), "Second")`);
      const expected = qualifier === 'series' ? [7, 8, 9] : [7, 7, 7];
      vector(result, 'First', expected);
      vector(result, 'Second', expected);
    });
  }
});

describe('ranked collection batch 3 array.set', () => {
  for (const receiver of [false, true]) {
    for (const qualifier of qualifiers) {
      it(`${receiver ? 'method' : 'namespace'} set accepts ${qualifier} index/value and changes only that element`, () => {
        const index = qualifier === 'input' ? 'input.int(1)' : qualifier === 'series' ? 'bar_index' : '1';
        const replacement =
          qualifier === 'input' ? 'input.float(40.5)' : qualifier === 'series' ? '40.5 + bar_index' : '40.5';
        const call = receiver
          ? 'values.set(value=replacement, index=index)'
          : 'array.set(value=replacement, index=index, id=values)';
        const { result } = run(`${qualifier} int index = ${index}
${qualifier} float replacement = ${replacement}
values = array.from(10.0, 20.0, 30.0)
${call}
plot(array.get(values, index), "Selected")
plot(array.get(values, (index + 1) % 3), "Other")
plot(array.size(values), "Size")`);
        vector(result, 'Selected', qualifier === 'series' ? [40.5, 41.5, 42.5] : [40.5, 40.5, 40.5]);
        vector(result, 'Other', qualifier === 'series' ? [20, 30, 10] : [30, 30, 30]);
        vector(result, 'Size', [3, 3, 3]);
      });
    }

    it(`${receiver ? 'method' : 'namespace'} set has a void result that cannot initialize a variable`, () => {
      const call = receiver ? 'values.set(0, 33.5)' : 'array.set(values, 0, 33.5)';
      const checked = checkProgram(
        program(`values = array.from(11.5, 22.5)
answer = ${call}`),
      );
      expect(
        checked.diagnostics.some(
          (diagnostic) =>
            diagnostic.severity === 'error' &&
            diagnostic.code === 'type-mismatch' &&
            diagnostic.message.includes('returns no value'),
        ),
      ).toBe(true);
    });
  }
});

describe('ranked collection batch 3 matrix.get', () => {
  const matrix = `values = matrix.new<int>(2, 3, 0)
matrix.set(values, 0, 0, 10)
matrix.set(values, 0, 1, 11)
matrix.set(values, 0, 2, 12)
matrix.set(values, 1, 0, 20)
matrix.set(values, 1, 1, 21)
matrix.set(values, 1, 2, 22)`;
  for (const receiver of [false, true]) {
    for (const qualifier of qualifiers) {
      it(`${receiver ? 'method' : 'namespace'} get accepts ${qualifier} coordinates and returns the selected int`, () => {
        const row = qualifier === 'input' ? 'input.int(1)' : qualifier === 'series' ? 'bar_index % 2' : '1';
        const column = qualifier === 'input' ? 'input.int(1)' : qualifier === 'series' ? 'bar_index' : '1';
        const call = receiver ? 'values.get(column=column, row=row)' : 'matrix.get(column=column, row=row, id=values)';
        const { result, checked } = run(
          `${qualifier} int row = ${row}
${qualifier} int column = ${column}
${matrix}
selected = ${call}
plot(selected, "Selected")`,
          'int',
          'matrix',
        );
        expect(checked.symbols.find((symbol) => symbol.name === 'selected')?.type?.kind).toBe('int');
        vector(result, 'Selected', qualifier === 'series' ? [10, 21, 12] : [21, 21, 21]);
      });
    }

    for (const [row, column, axis] of [
      [-1, 0, 'row'],
      [0, -1, 'column'],
    ] as const) {
      it(`${receiver ? 'method' : 'namespace'} get refuses negative ${axis} coordinates`, () => {
        const call = receiver ? `values.get(${row}, ${column})` : `matrix.get(values, ${row}, ${column})`;
        const ast = program(`${matrix}\nplot(${call}, "Invalid")`);
        expect(checkProgram(ast).diagnostics.filter((diagnostic) => diagnostic.severity === 'error')).toEqual([]);
        const result = executeScript(ast, bars);
        expect(result.errors.some((error) => error.message.includes(`Matrix ${axis} -1 is out of bounds`))).toBe(true);
      });
    }
  }
});

describe('ranked collection batch 3 array.shift', () => {
  it.each([
    ['int', '11, 22, 33', 'removed', 'array.get(values, 0)', 11, 22],
    ['float', '11.5, 22.5, 33.5', 'removed', 'array.get(values, 0)', 11.5, 22.5],
    ['bool', 'true, false, true', 'removed ? 1 : 0', 'array.get(values, 0) ? 1 : 0', 1, 0],
    [
      'string',
      '"first", "second", "third"',
      'removed == "first" ? 1 : 0',
      'array.get(values, 0) == "second" ? 1 : 0',
      1,
      1,
    ],
    ['color', '#102030, #405060, #AABBCC', 'color.r(removed)', 'color.r(array.get(values, 0))', 16, 64],
  ] as const)(
    'removes and returns the first %s element as a series value',
    (kind, elements, readRemoved, readFirst, removed, first) => {
      const { result, checked } = run(
        `values = array.from(${elements})
removed = array.shift(id=values)
plot(${readRemoved}, "Removed")
plot(${readFirst}, "First")
plot(array.size(values), "Size")`,
        kind,
      );
      expect(checked.symbols.find((symbol) => symbol.name === 'removed')?.type).toMatchObject({
        kind,
        qualifier: 'series',
      });
      vector(result, 'Removed', [removed, removed, removed]);
      vector(result, 'First', [first, first, first]);
      vector(result, 'Size', [2, 2, 2]);
    },
  );
});
