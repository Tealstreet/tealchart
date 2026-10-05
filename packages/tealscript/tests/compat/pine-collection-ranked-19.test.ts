import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

// Frozen reference clauses for ranks 721–760, bounded by the fixtures below.
// CF003 native diagnostics override the conflicting numeric-every v6 prose.
// Integer variance fixtures have whole-valued population and sample results;
// no fractional integer-overload rounding or failed-mutation policy is inferred.
const header = (version = 6) => `//@version=${version}\nindicator("Collection batch 19")\n`;
function errors(source: string, version = 6) {
  return checkProgram(parse(header(version) + source)).diagnostics.filter((entry) => entry.severity === 'error');
}
function values(source: string, expected: Record<string, number | number[]>, version = 6) {
  expect(errors(source, version)).toEqual([]);
  const result = runCompatScript(header(version) + source, { bars: compatibilityBars.slice(0, 3) });
  expect(result.errors).toEqual([]);
  for (const [title, value] of Object.entries(expected)) {
    const actual = getPlot(result, title).values;
    const wanted = typeof value === 'number' ? [value, value, value] : value;
    expect(actual).toHaveLength(wanted.length);
    actual.forEach((item, index) => expect(item, title).toBeCloseTo(wanted[index], 12));
  }
}
function refuses(source: string, code: string, version = 6) {
  expect(errors(source, version)).toEqual(expect.arrayContaining([expect.objectContaining({ code })]));
}

describe('collection ranked batch 19 bounded contracts', () => {
  for (const [kind, elements] of [
    ['int', '-8, 5, 5, 17'],
    ['float', '-8.5, 5.25, 5.25, 17.75'],
  ]) {
    for (const [index, rank] of [
      [0, 25],
      [1, 75],
      [2, 75],
      [3, 100],
    ]) {
      it.each([`a.percentrank(${index})`, `a.percentrank(index=${index})`])(
        `${kind} receiver percentrank selects the index and includes ties: %s`,
        (call) => values(`a = array.from(${elements})\nplot(${call}, title="rank")`, { rank }),
      );
    }
    it(`empty ${kind} receiver percentrank returns na`, () => {
      values(`a = array.new<${kind}>(0)\nplot(na(a.percentrank(index=0)) ? 1 : 0, title="missing")`, { missing: 1 });
    });
    for (const [qualifier, declaration, expected] of [
      ['const', 'const int index = 1', [75, 75, 75]],
      ['input', 'index = input.int(1)', [75, 75, 75]],
      ['simple', 'simple int index = 1', [75, 75, 75]],
      ['series', 'series int index = bar_index', [25, 75, 75]],
    ] as const) {
      it(`${kind} receiver percentrank accepts ${qualifier} int indexes`, () => {
        values(`${declaration}\na = array.from(${elements})\nplot(a.percentrank(index=index), title="rank")`, {
          rank: [...expected],
        });
      });
    }
    it.each(['1.5', '"1"', 'true'])(`${kind} receiver percentrank refuses non-integer index %s`, (index) => {
      refuses(`a = array.from(${elements})\nresult = a.percentrank(index=${index})`, 'type-mismatch');
    });
  }
  it('receiver percentrank requires the index', () => {
    refuses('a = array.from(17, -8)\nresult = a.percentrank()', 'argument-count');
  });

  const everyCalls = ['array.every(a)', 'array.every(id=a)', 'a.every()'];
  for (const [elements, expected] of [
    ['true, true, true', 1],
    ['false, true, true', 0],
    ['true, true, false', 0],
    ['false, false', 0],
  ] as const) {
    it.each(everyCalls)(`every examines all bool elements ${elements}: %s`, (call) => {
      values(`a = array.from(${elements})\nseries bool result = ${call}\nplot(result ? 1 : 0, title="all")`, {
        all: expected,
      });
    });
  }
  for (const [kind, nonzero, zero] of [
    ['int', '-3, 2, 7', '-3, 0, 7'],
    ['float', '-3.5, 2.25, 7.5', '-3.5, 0.0, 7.5'],
  ]) {
    it.each(everyCalls)(`v5 ${kind} every uses numeric nonzero truth: %s`, (call) => {
      values(`a = array.from(${nonzero})\nplot(${call} ? 1 : 0, title="all")`, { all: 1 }, 5);
      values(`a = array.from(${zero})\nplot(${call} ? 1 : 0, title="all")`, { all: 0 }, 5);
    });
    it.each(everyCalls)(`native CF003 v6 refuses ${kind} every: %s`, (call) => {
      refuses(`a = array.from(${zero})\nresult = ${call}`, 'type-mismatch');
    });
  }
  it('every requires an array argument', () => refuses('result = array.every()', 'argument-count'));

  const matrixSetup = `m = matrix.new<int>(2, 2, 17)
m.set(0, 1, -8)
m.set(1, 0, 5)
m.set(1, 1, 43)
a = array.from(91, -31)`;
  for (const row of [0, 1, 2]) {
    it.each([
      `matrix.add_row(m, ${row}, a)`,
      `matrix.add_row(array_id=a, row=${row}, id=m)`,
      `m.add_row(${row}, a)`,
      `m.add_row(array_id=a, row=${row})`,
    ])(`add_row inserts at inclusive boundary ${row} and shifts later rows: %s`, (call) => {
      const before = [
        [17, -8],
        [5, 43],
      ];
      const after = [...before.slice(0, row), [91, -31], ...before.slice(row)];
      // Literal slots independently distinguish prepend, middle, and append.
      values(
        `${matrixSetup}\n${call}\na.set(0, 777)
plot(m.rows(), title="rows")
plot(m.columns(), title="columns")
plot(m.get(0, 0), title="r0c0")
plot(m.get(0, 1), title="r0c1")
plot(m.get(1, 0), title="r1c0")
plot(m.get(1, 1), title="r1c1")
plot(m.get(2, 0), title="r2c0")
plot(m.get(2, 1), title="r2c1")`,
        {
          rows: 3,
          columns: 2,
          r0c0: after[0][0],
          r0c1: after[0][1],
          r1c0: after[1][0],
          r1c1: after[1][1],
          r2c0: after[2][0],
          r2c1: after[2][1],
        },
      );
    });
  }
  it.each(['matrix.add_row(m, array_id=a)', 'matrix.add_row(id=m, array_id=a)', 'm.add_row(array_id=a)'])(
    'omitted row appends the supplied array: %s',
    (call) => {
      values(
        `${matrixSetup}\n${call}\nplot(m.get(0, 0), title="first")\nplot(m.get(2, 1), title="appended")\nplot(m.rows(), title="rows")`,
        { first: 17, appended: -31, rows: 3 },
      );
    },
  );
  it.each(['matrix.add_row(m)', 'matrix.add_row(id=m)', 'm.add_row()'])(
    'native CF017 omitted array and row append a full na row: %s',
    (call) => {
      values(
        `${matrixSetup}\n${call}
plot(m.rows(), title="rows")
plot(m.columns(), title="columns")
plot(m.get(1, 1), title="previous")
plot(na(m.get(2, 0)) ? 1 : 0, title="first_missing")
plot(na(m.get(2, 1)) ? 1 : 0, title="last_missing")`,
        { rows: 3, columns: 2, previous: 43, first_missing: 1, last_missing: 1 },
      );
    },
  );
  it.each(['matrix.add_row(m, row=1)', 'm.add_row(row=1)'])(
    'omitted array inserts na at the specified row: %s',
    (call) => {
      values(
        `${matrixSetup}\n${call}\nplot(na(m.get(1, 0)) ? 1 : 0, title="missing")\nplot(m.get(2, 1), title="shifted")`,
        { missing: 1, shifted: 43 },
      );
    },
  );
  for (const [kind, elements, condition] of [
    ['int', '17, -8, 43', 'm.get(0, 0) == 17 and m.get(0, 2) == 43'],
    ['float', '1.25, -8.5, 4.75', 'm.get(0, 0) == 1.25 and m.get(0, 2) == 4.75'],
    ['bool', 'true, false, true', 'm.get(0, 0) and not m.get(0, 1) and m.get(0, 2)'],
    ['string', '"first", "middle", "last"', 'm.get(0, 0) == "first" and m.get(0, 2) == "last"'],
  ]) {
    it.each(['matrix.add_row(m, 0, a)', 'matrix.add_row(id=m, array_id=a)', 'm.add_row(array_id=a)'])(
      `empty ${kind} matrix takes its width from the supplied row: %s`,
      (call) => {
        values(
          `m = matrix.new<${kind}>()\na = array.from(${elements})\n${call}\nplot(m.rows(), title="rows")\nplot(m.columns(), title="columns")\nplot(${condition} ? 1 : 0, title="contents")`,
          { rows: 1, columns: 3, contents: 1 },
        );
      },
    );
  }
  for (const [qualifier, declaration] of [
    ['const', 'const int row = 1'],
    ['input', 'row = input.int(1)'],
    ['simple', 'simple int row = 1'],
    ['series', 'series int row = bar_index'],
  ]) {
    it(`add_row accepts a ${qualifier} int insertion index`, () => {
      values(`${declaration}\n${matrixSetup}\nm.add_row(row=row, array_id=a)\nplot(m.get(row, 0), title="inserted")`, {
        inserted: 91,
      });
    });
  }
  it.each(['1.5', '"1"', 'true'])('add_row refuses non-integer row %s', (row) => {
    refuses(`${matrixSetup}\nm.add_row(row=${row}, array_id=a)`, 'type-mismatch');
  });
  it('add_row requires the matrix ID', () => refuses('matrix.add_row()', 'argument-count'));

  for (const [kind, elements, population, sample] of [
    // int: mean 4, squared deviations total 36; float: mean 1.25, total 5.
    ['int', '1, 1, 7, 7', 9, 12],
    ['float', '-0.25, 0.75, 1.75, 2.75', 1.25, 5 / 3],
  ] as const) {
    for (const [call, expected] of [
      ['array.variance(a)', population],
      ['array.variance(id=a)', population],
      ['array.variance(a, true)', population],
      ['array.variance(biased=false, id=a)', sample],
      ['a.variance()', population],
      ['a.variance(false)', sample],
      ['a.variance(biased=true)', population],
    ] as const) {
      it(`${kind} variance honors population default and sample option: ${call}`, () => {
        values(`a = array.from(${elements})\nplot(${call}, title="variance")\nplot(a.size(), title="size")`, {
          variance: expected,
          size: 4,
        });
      });
    }
    it.each(['array.variance(a)', 'array.variance(id=a, biased=false)', 'a.variance()'])(
      `empty ${kind} variance returns na: %s`,
      (call) => {
        values(`a = array.new<${kind}>(0)\nplot(na(${call}) ? 1 : 0, title="missing")`, { missing: 1 });
      },
    );
    for (const [qualifier, declaration, expected] of [
      ['const', 'const bool biased = false', [sample, sample, sample]],
      ['input', 'biased = input.bool(false)', [sample, sample, sample]],
      ['simple', 'simple bool biased = false', [sample, sample, sample]],
      ['series', 'series bool biased = bar_index == 1', [sample, population, sample]],
    ] as const) {
      it(`${kind} variance accepts a ${qualifier} bool option`, () => {
        values(`${declaration}\na = array.from(${elements})\nplot(a.variance(biased=biased), title="variance")`, {
          variance: [...expected],
        });
      });
    }
  }
  it.each(['array.variance(a, 1)', 'array.variance(id=a, biased="true")', 'a.variance(biased=1.5)'])(
    'v6 variance refuses a non-bool biased option: %s',
    (call) => {
      refuses(`a = array.from(1.25, 2.75)\nresult = ${call}`, 'type-mismatch');
    },
  );
  it.each(['false, true', '"first", "last"'])('variance requires numeric array elements: %s', (elements) => {
    refuses(`a = array.from(${elements})\nresult = a.variance()`, 'type-mismatch');
  });
  it('variance requires the array ID', () => refuses('result = array.variance()', 'argument-count'));

  for (const [declaration, call, kind] of [
    ['a = array.from(true, false)', 'array.every(a)', 'bool'],
    ['a = array.from(true, false)', 'a.every()', 'bool'],
    ['a = array.from(1.25, -8.5)', 'array.variance(a)', 'float'],
    ['a = array.from(1.25, -8.5)', 'a.variance()', 'float'],
  ]) {
    it.each(['const', 'simple'])(`${call} rejects a %s destination: documented series result`, (qualifier) => {
      refuses(`${declaration}\n${qualifier} ${kind} result = ${call}`, 'qualifier-mismatch');
    });
  }
});
