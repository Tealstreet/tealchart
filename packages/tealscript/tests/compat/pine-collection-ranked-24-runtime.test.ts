import { describe, expect, it } from 'vitest';

import { getPlot, runCompatScript } from './fixtures';

function expectValues(source: string, values: number[]) {
  const result = runCompatScript(`//@version=6\nindicator("Collection ranked24")\n${source}`);
  expect(result.errors).toEqual([]);
  values.forEach((value, index) => {
    expect(getPlot(result, `Value ${index}`).values).toEqual(Array(12).fill(value));
  });
}

describe('collection ranks921-926 color array construction', () => {
  it('defaults to an empty color array usable by other array functions', () => {
    expectValues(
      `a = array.new_color()
plot(array.size(a), title="Value 0")
array.push(a, #123456)
plot(array.get(a, 0) == #123456 ? 1 : 0, title="Value 1")`,
      [0, 1],
    );
  });

  it('fills an omitted initial value with missing colors', () => {
    expectValues(
      `a = array.new_color(size=2)
plot(array.size(a), title="Value 0")
plot(na(array.get(a, 0)) and na(array.get(a, 1)) ? 1 : 0, title="Value 1")`,
      [2, 1],
    );
  });

  it('initializes every slot and uses zero-based indices', () => {
    expectValues(
      `a = array.new_color(initial_value=#123456, size=3)
array.set(a, 0, #abcdef)
plot(array.get(a, 0) == #abcdef ? 1 : 0, title="Value 0")
plot(array.get(a, 1) == #123456 and array.get(a, 2) == #123456 ? 1 : 0, title="Value 1")`,
      [1, 1],
    );
  });

  it('creates independent objects for distinct constructor calls', () => {
    expectValues(
      `a = array.new_color(1, #123456)
b = array.new_color(1, #123456)
array.set(a, 0, #abcdef)
plot(array.get(b, 0) == #123456 ? 1 : 0, title="Value 0")`,
      [1],
    );
  });
});

describe('collection ranks927-938 column insertion', () => {
  for (const receiver of [false, true]) {
    const name = receiver ? 'receiver' : 'namespace';
    const insert = (args: string) => (receiver ? `m.add_col(${args})` : `matrix.add_col(m, ${args})`);

    it(`${name} inserts at the start and shifts both existing columns`, () => {
      expectValues(
        `m = matrix.new<int>(2, 2, 7)
${insert('0, array.from(11, 13)')}
plot(matrix.columns(m), title="Value 0")
plot(matrix.get(m, 0, 0), title="Value 1")
plot(matrix.get(m, 1, 0), title="Value 2")
plot(matrix.get(m, 0, 1) + matrix.get(m, 1, 2), title="Value 3")`,
        [3, 11, 13, 14],
      );
    });

    it(`${name} allows insertion at the columns boundary`, () => {
      expectValues(
        `m = matrix.new<int>(2, 1, 7)
${insert('1, array.from(11, 13)')}
plot(matrix.get(m, 0, 0) + matrix.get(m, 1, 0), title="Value 0")
plot(matrix.get(m, 0, 1) + matrix.get(m, 1, 1), title="Value 1")`,
        [14, 24],
      );
    });

    it(`${name} initializes an empty matrix height from the supplied array`, () => {
      expectValues(
        `m = matrix.new<string>()
${insert('0, array.from("first", "second", "third")')}
plot(matrix.rows(m), title="Value 0")
plot(matrix.columns(m), title="Value 1")
plot(matrix.get(m, 2, 0) == "third" ? 1 : 0, title="Value 2")`,
        [3, 1, 1],
      );
    });

    it(`${name} defaults to appending a missing column`, () => {
      const call = receiver ? 'm.add_col()' : 'matrix.add_col(m)';
      expectValues(
        `m = matrix.new<int>(2, 2, 7)
${call}
plot(matrix.columns(m), title="Value 0")
plot(na(matrix.get(m, 0, 2)) and na(matrix.get(m, 1, 2)) ? 1 : 0, title="Value 1")
plot(matrix.get(m, 0, 0), title="Value 2")`,
        [3, 1, 7],
      );
    });
  }
});

describe('collection ranks945-959 matrix addition', () => {
  for (const receiver of [false, true]) {
    for (const kind of ['int', 'float']) {
      for (const otherMatrix of [false, true]) {
        const call = receiver ? 'left.sum(right)' : 'matrix.sum(left, right)';
        const right = otherMatrix ? `matrix.new<${kind}>(2, 2, 3)` : '3';
        it(`${receiver ? 'receiver' : 'namespace'} ${kind} adds a ${otherMatrix ? 'matrix' : 'scalar'} into new storage`, () => {
          expectValues(
            `left = matrix.new<${kind}>(2, 2, 5)
matrix.set(left, 1, 1, 7)
right = ${right}
total = ${call}
plot(matrix.get(total, 0, 0), title="Value 0")
plot(matrix.get(total, 1, 1), title="Value 1")
matrix.set(total, 0, 0, 99)
plot(matrix.get(left, 0, 0), title="Value 2")
${otherMatrix ? 'plot(matrix.get(right, 0, 0), title="Value 3")' : ''}`,
            otherMatrix ? [8, 10, 5, 3] : [8, 10, 5],
          );
        });
      }
    }
  }
});

describe('collection count values', () => {
  it('counts every element of a rectangular matrix', () => {
    expectValues(
      `m = matrix.new<color>(2, 3, #123456)
plot(matrix.elements_count(m), title="Value 0")
plot(m.elements_count(), title="Value 1")`,
      [6, 6],
    );
  });

  it('counts pairs rather than writes or distinct values in a map', () => {
    expectValues(
      `m = map.new<string, int>()
map.put(m, "first", 7)
map.put(m, "second", 7)
map.put(m, "first", 9)
plot(map.size(m), title="Value 0")
plot(m.size(), title="Value 1")`,
      [2, 2],
    );
  });
});
