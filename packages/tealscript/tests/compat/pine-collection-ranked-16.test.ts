import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';
import { compatibilityBars, getPlot, runCompatScript } from './fixtures';

// Exact clauses and first-party snapshots: collection-untested-ranked-v1 ranks 601–640.
// Int stdev datasets have integral answers; fractional int-overload semantics are unclaimed.
const header = '//@version=6\nindicator("Ranked collection 16")\n';
const bars = compatibilityBars.slice(0, 3);
function verify(body: string, expected: Array<number | null>) {
  const source = header + body;
  const checked = checkProgram(parse(source));
  expect(checked.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
  const result = runCompatScript(source, { bars });
  expect(result.errors).toEqual([]);
  expect(result.plots.map((p) => p.title)).toEqual(['Witness']);
  expect(getPlot(result, 'Witness').values).toEqual(expected);
  return checked;
}
const qualifiers = ['const', 'input', 'simple', 'series'] as const;
const forms = ['namespace', 'method'] as const;

describe('collection ranked 601–606: array.join', () => {
  for (const form of forms) {
    for (const [kind, values, joined] of [
      ['int', '1, 2, 3', '1|2|3'],
      ['float', '1.5, 2.5, 3.5', '1.5|2.5|3.5'],
      ['string', '"a", "bb", "c"', 'a|bb|c'],
    ] as const) {
      it(`${form} joins all ${kind} elements in order`, () => {
        verify(
          `a = array.from(${values})\njoined = ${form === 'namespace' ? 'array.join(id=a, separator="|")' : 'a.join(separator="|")'}\nplot(joined == "${joined}" ? 1 : 0, title="Witness")`,
          [1, 1, 1],
        );
      });
    }
    for (const qualifier of qualifiers) {
      it(`${form} accepts ${qualifier} separator and returns a string`, () => {
        const value =
          qualifier === 'input' ? 'input.string("|")' : qualifier === 'series' ? 'bar_index == 1 ? ":" : "|"' : '"|"';
        verify(
          `${qualifier} string sep = ${value}\na = array.from("a", "b")\njoined = ${form === 'namespace' ? 'array.join(a, sep)' : 'a.join(sep)'}\nplot(joined == (bar_index == 1 ? "a:b" : "a|b") ? 1 : 0, title="Witness")`,
          qualifier === 'series' ? [1, 1, 1] : [1, 0, 1],
        );
      });
    }
    it(`${form} accepts an omitted separator without certifying its unspecified text`, () => {
      const checked = verify(
        `a = array.from("a", "b")\njoined = ${form === 'namespace' ? 'array.join(a)' : 'a.join()'}\nplot(str.length(joined) >= 2 ? 1 : 0, title="Witness")`,
        [1, 1, 1],
      );
      expect(checked.symbols.find((s) => s.name === 'joined')?.type?.kind).toBe('string');
    });
  }
  it('method join has the documented series string floor', () => {
    const checked = verify(
      'a = array.from("a", "b")\njoined = a.join("|")\nplot(joined == "a|b" ? 1 : 0, title="Witness")',
      [1, 1, 1],
    );
    expect(checked.symbols.find((s) => s.name === 'joined')?.type).toMatchObject({
      kind: 'string',
      qualifier: 'series',
    });
  });
});

describe('collection ranked 607–613: matrix.col', () => {
  for (const form of forms) {
    for (const [kind, first, second, predicate] of [
      ['int', '7', '9', 'array.get(column, 0) == 7 and array.get(column, 1) == 9'],
      ['float', '1.5', '2.5', 'array.get(column, 0) == 1.5 and array.get(column, 1) == 2.5'],
      ['string', '"first"', '"second"', 'array.get(column, 0) == "first" and array.get(column, 1) == "second"'],
      ['bool', 'true', 'false', 'array.get(column, 0) and not array.get(column, 1)'],
    ] as const) {
      it(`${form} preserves a ${kind} matrix column's element type and row order`, () => {
        const checked = verify(
          `m = matrix.new<${kind}>(2, 2, ${first})\nmatrix.set(m, 1, 1, ${second})\ncolumn = ${form === 'namespace' ? 'matrix.col(id=m, column=1)' : 'm.col(column=1)'}\nplot(array.size(column) == 2 and (${predicate}) ? 1 : 0, title="Witness")`,
          [1, 1, 1],
        );
        expect(checked.symbols.find((s) => s.name === 'column')?.type).toMatchObject({
          kind: 'array',
          elementType: { kind },
        });
      });
    }
    for (const qualifier of qualifiers) {
      it(`${form} accepts ${qualifier} zero-based column index`, () => {
        const value = qualifier === 'input' ? 'input.int(0)' : qualifier === 'series' ? 'bar_index % 2' : '0';
        verify(
          `${qualifier} int index = ${value}\nm = matrix.new<int>(2, 2, 10)\nmatrix.set(m, 0, 1, 20)\nmatrix.set(m, 1, 0, 11)\nmatrix.set(m, 1, 1, 21)\ncolumn = ${form === 'namespace' ? 'matrix.col(m, index)' : 'm.col(index)'}\nplot(array.get(column, 0) * 100 + array.get(column, 1), title="Witness")`,
          qualifier === 'series' ? [1011, 2021, 1011] : [1011, 1011, 1011],
        );
      });
    }
  }
});

describe('collection ranked 614–627: string and bool array constructors', () => {
  for (const kind of ['string', 'bool'] as const) {
    const initial = kind === 'string' ? '"seed"' : 'true';
    const changed = kind === 'string' ? '"changed"' : 'false';
    const predicate =
      kind === 'string'
        ? 'array.get(a, 0) == "changed" and array.get(a, 1) == "seed" and array.get(b, 0) == "seed"'
        : 'not array.get(a, 0) and array.get(a, 1) and array.get(b, 0)';
    it(`new_${kind} creates independent typed IDs with zero-based mutable elements`, () => {
      const checked = verify(
        `a = array.new_${kind}(size=2, initial_value=${initial})\nb = array.new_${kind}(2, ${initial})\narray.set(a, 0, ${changed})\nplot(${predicate} ? 1 : 0, title="Witness")`,
        [1, 1, 1],
      );
      expect(checked.symbols.find((s) => s.name === 'a')?.type).toMatchObject({ kind: 'array', elementType: { kind } });
    });
    it(`new_${kind} omitted size creates an empty usable array`, () => {
      verify(`a = array.new_${kind}()\narray.push(a, ${initial})\nplot(array.size(a), title="Witness")`, [1, 1, 1]);
    });
    for (const qualifier of qualifiers) {
      it(`new_${kind} accepts ${qualifier} size`, () => {
        const value = qualifier === 'input' ? 'input.int(2)' : qualifier === 'series' ? 'bar_index + 1' : '2';
        verify(
          `${qualifier} int count = ${value}\na = array.new_${kind}(size=count, initial_value=${initial})\nplot(array.size(a), title="Witness")`,
          qualifier === 'series' ? [1, 2, 3] : [2, 2, 2],
        );
      });
      it(`new_${kind} accepts ${qualifier} initial value`, () => {
        const value =
          qualifier === 'input'
            ? `input.${kind}(${initial})`
            : qualifier === 'series'
              ? kind === 'string'
                ? 'bar_index == 1 ? "changed" : "seed"'
                : 'bar_index != 1'
              : initial;
        const pred =
          kind === 'string'
            ? 'array.get(a, 0) == "seed" and array.get(a, 1) == "seed"'
            : 'array.get(a, 0) and array.get(a, 1)';
        verify(
          `${qualifier} ${kind} seed = ${value}\na = array.new_${kind}(2, seed)\nplot(${pred} ? 1 : 0, title="Witness")`,
          qualifier === 'series' ? [1, 0, 1] : [1, 1, 1],
        );
      });
    }
  }
  it('new_string omitted initial value is missing in every allocated slot', () => {
    verify(
      'a = array.new_string(2)\nplot(na(array.get(a, 0)) and na(array.get(a, 1)) ? 1 : 0, title="Witness")',
      [1, 1, 1],
    );
  });
  it('v6 new_bool omitted initial value is false in every allocated slot', () => {
    verify(
      'a = array.new_bool(2)\nplot(array.get(a, 0) == false and array.get(a, 1) == false ? 1 : 0, title="Witness")',
      [1, 1, 1],
    );
  });
});

describe('collection ranked 628–640: namespace array.stdev', () => {
  for (const kind of ['int', 'float'] as const) {
    const population = kind === 'int' ? '1, 5' : '1.5, 5.5';
    const sample = kind === 'int' ? '1, 3, 5' : '1.5, 3.5, 5.5';
    it(`${kind} population deviation has the documented omitted true default`, () => {
      verify(`a = array.from(${population})\nplot(array.stdev(id=a), title="Witness")`, [2, 2, 2]);
    });
    it(`${kind} sample deviation uses n minus one`, () => {
      verify(`a = array.from(${sample})\nplot(array.stdev(a, biased=false), title="Witness")`, [2, 2, 2]);
    });
    it(`${kind} empty array returns missing`, () => {
      verify(`a = array.new_${kind}()\nplot(array.stdev(a), title="Witness")`, [null, null, null]);
    });
    for (const qualifier of qualifiers) {
      it(`${kind} accepts ${qualifier} biased flag`, () => {
        const value = qualifier === 'input' ? 'input.bool(true)' : qualifier === 'series' ? 'bar_index != 1' : 'true';
        verify(
          `${qualifier} bool population = ${value}\na = population ? array.from(${population}) : array.from(${sample})\nplot(array.stdev(a, biased=population), title="Witness")`,
          [2, 2, 2],
        );
      });
    }
  }
  it('float dataset returns the mathematical population standard deviation', () => {
    const source = header + 'a = array.from(1.5, 3.5, 5.5)\nplot(array.stdev(a, true), title="Witness")';
    const result = runCompatScript(source, { bars });
    expect(result.errors).toEqual([]);
    for (const value of getPlot(result, 'Witness').values) expect(value).toBeCloseTo(Math.sqrt(8 / 3), 12);
  });
});
