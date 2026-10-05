import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

// Independently derived from the frozen Pine v6 reference: array.copy/pop/max,
// matrix.copy/row/rows. Asymmetric contents distinguish order and dimensions.
// These bounded witnesses do not certify all element types or error behavior.
const header = '//@version=6\nindicator("Collection batch 6")\n';
function errors(source: string) {
  return checkProgram(parse(header + source)).diagnostics.filter((entry) => entry.severity === 'error');
}
function values(source: string, expected: Record<string, number>) {
  expect(errors(source)).toEqual([]);
  const result = runCompatScript(header + source, { bars: compatibilityBars.slice(0, 3) });
  expect(result.errors).toEqual([]);
  for (const [title, value] of Object.entries(expected)) {
    expect(getPlot(result, title).values).toEqual([value, value, value]);
  }
}

describe('collection ranked batch 6 bounded contracts', () => {
  it.each(['array.copy(a)', 'array.copy(id=a)', 'a.copy()'])('array copy detaches ordered contents: %s', (call) => {
    values(
      `a = array.from(17, -8, 43)
b = ${call}
b.set(1, 91)
a.set(2, -31)
plot(a.get(1), title="original")
plot(b.get(0), title="first")
plot(b.get(1), title="changed")
plot(b.get(2), title="last")
plot(b.size(), title="size")`,
      { original: -8, first: 17, changed: 91, last: 43, size: 3 },
    );
  });
  it.each(['matrix.copy(m)', 'matrix.copy(id=m)', 'm.copy()'])(
    'matrix copy detaches a rectangular matrix: %s',
    (call) => {
      values(
        `m = matrix.new<int>(2, 3, 17)
m.set(1, 2, -8)
n = ${call}
n.set(0, 1, 91)
m.set(1, 2, -31)
plot(m.get(0, 1), title="original")
plot(n.get(0, 1), title="changed")
plot(n.get(1, 2), title="last")
plot(n.rows(), title="rows")
plot(n.columns(), title="columns")`,
        { original: 17, changed: 91, last: -8, rows: 2, columns: 3 },
      );
    },
  );
  for (const row of [0, 1]) {
    it.each([`matrix.row(m, ${row})`, `matrix.row(row=${row}, id=m)`, `m.row(${row})`, `m.row(row=${row})`])(
      'matrix row selects the zero-based row: %s',
      (call) => {
        const expected = row === 0 ? [17, -8, 43] : [5, 71, -31];
        values(
          `m = matrix.new<int>(2, 3, 0)
m.set(0, 0, 17)
m.set(0, 1, -8)
m.set(0, 2, 43)
m.set(1, 0, 5)
m.set(1, 1, 71)
m.set(1, 2, -31)
array<int> a = ${call}
plot(a.get(0), title="first")
plot(a.get(1), title="middle")
plot(a.get(2), title="last")
plot(a.size(), title="length")`,
          { first: expected[0], middle: expected[1], last: expected[2], length: 3 },
        );
      },
    );
  }
  it.each(['matrix.rows(m)', 'matrix.rows(id=m)', 'm.rows()'])(
    'matrix rows counts rows rather than columns or elements: %s',
    (call) => {
      values(
        `m = matrix.new<float>(2, 3, 1.5)
plot(${call}, title="rows")`,
        { rows: 2 },
      );
    },
  );
  it.each(['array.pop(a)', 'array.pop(id=a)', 'a.pop()'])('pop removes and returns the tail: %s', (call) => {
    values(
      `a = array.from(17, -8, 43)
last = ${call}
plot(last, title="removed")
plot(a.size(), title="size")
plot(a.get(0), title="first")
plot(a.get(1), title="last")`,
      { removed: 43, size: 2, first: 17, last: -8 },
    );
  });
  for (const [type, first, second, condition] of [
    ['float', '1.25', '-8.5', 'b.get(0) == 1.25 and b.get(1) == -8.5'],
    ['bool', 'true', 'false', 'b.get(0) and not b.get(1)'],
    ['string', '"first"', '"last"', 'b.get(0) == "first" and b.get(1) == "last"'],
    ['color', 'color.red', 'color.blue', 'b.get(0) == color.red and b.get(1) == color.blue'],
  ]) {
    it.each(['array.copy(a)', 'a.copy()'])(`copy retains ${type} elements: %s`, (call) => {
      values(
        `a = array.from(${first}, ${second})
array<${type}> b = ${call}
plot(${condition} ? 1 : 0, title="elements")`,
        { elements: 1 },
      );
    });
  }
  for (const [type, value, condition] of [
    ['float', '1.25', 'n.get(1, 2) == 1.25'],
    ['bool', 'true', 'n.get(1, 2)'],
    ['string', '"last"', 'n.get(1, 2) == "last"'],
  ]) {
    it.each(['matrix.copy(m)', 'm.copy()'])(`matrix copy retains ${type} elements: %s`, (call) => {
      values(
        `m = matrix.new<${type}>(2, 3, ${value})
matrix<${type}> n = ${call}
plot(${condition} ? 1 : 0, title="elements")`,
        { elements: 1 },
      );
    });
    it.each(['matrix.row(m, 1)', 'm.row(1)'])(`matrix row returns array<${type}>: %s`, (call) => {
      values(
        `m = matrix.new<${type}>(2, 3, ${value})
array<${type}> a = ${call}
plot(${condition.replaceAll('n.get(1, 2)', 'a.get(2)')} ? 1 : 0, title="elements")`,
        { elements: 1 },
      );
    });
  }
  for (const [type, first, last, condition] of [
    ['float', '1.25', '-8.5', 'removed == -8.5'],
    ['bool', 'true', 'false', 'not removed'],
    ['string', '"first"', '"last"', 'removed == "last"'],
    ['color', 'color.red', 'color.blue', 'removed == color.blue'],
  ]) {
    it.each(['array.pop(a)', 'a.pop()'])(`pop retains ${type} tail type: %s`, (call) => {
      values(
        `a = array.from(${first}, ${last})
series ${type} removed = ${call}
plot(${condition} ? 1 : 0, title="elements")
plot(a.size(), title="remaining")`,
        { elements: 1, remaining: 1 },
      );
    });
  }
  for (const call of ['array.max(a)', 'array.max(id=a, nth=0)']) {
    it(`max returns the greatest fractional value: ${call}`, () => {
      values(
        `a = array.from(-2.5, 9.25, 1.125)
series float result = ${call}
plot(result, title="maximum")`,
        { maximum: 9.25 },
      );
    });
    it(`max of an empty float array is na: ${call}`, () => {
      values(
        `a = array.new<float>(0)
plot(na(${call}) ? 1 : 0, title="missing")`,
        { missing: 1 },
      );
    });
  }
  for (const [call, declaration, type] of [
    ['matrix.rows(m)', 'm = matrix.new<int>(2, 3, 17)', 'int'],
    ['m.rows()', 'm = matrix.new<int>(2, 3, 17)', 'int'],
    ['array.pop(a)', 'a = array.from(17, -8, 43)', 'int'],
    ['a.pop()', 'a = array.from(17, -8, 43)', 'int'],
    ['array.max(a)', 'a = array.from(1.25, -8.5)', 'float'],
  ]) {
    it.each(['const', 'simple'])(`${call} rejects a %s destination: documented series result`, (qualifier) => {
      expect(errors(`${declaration}\n${qualifier} ${type} result = ${call}`)).toEqual(
        expect.arrayContaining([expect.objectContaining({ code: 'qualifier-mismatch' })]),
      );
    });
  }
  it.each([
    'array.copy()',
    'matrix.copy()',
    'matrix.row()',
    'matrix.row(matrix.new<int>(2, 3, 1))',
    'matrix.new<int>(2, 3, 1).row()',
    'matrix.rows()',
    'array.pop()',
  ])('refuses missing required slots: %s', (call) => {
    expect(errors(`result = ${call}`)).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: 'argument-count' })]),
    );
  });
});
