import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { checkProgram } from '../../src/semantic/checker';
import { getPlot, runCompatScript } from './fixtures';

// Exact reference clauses and native CF023 scope are archived in
// collection-ranked-8-v1/assigned-rows-v1.json. Equal slice endpoints remain
// authority-conflicted and are intentionally absent from this regression.
const source = (body: string) => `//@version=6\nindicator("Collection ranks 281-320")\n${body}`;
const check = (body: string) => checkProgram(parse(source(body)));
function values(body: string, title = 'result') {
  expect(check(body).diagnostics).toEqual([]);
  const result = runCompatScript(source(body));
  expect(result.errors).toEqual([]);
  return getPlot(result, title).values;
}
function type(body: string, name = 'result') {
  const result = check(body);
  expect(result.diagnostics).toEqual([]);
  return result.symbols.find((symbol) => symbol.name === name)?.type;
}

describe('ranks 281-283: receiver indexof', () => {
  for (const [element, first, second, absent] of [
    ['int', '7', '-3', '29'],
    ['float', '7.5', '-3.5', '29.5'],
    ['bool', 'true', 'false', 'false'],
    ['string', '"first"', '"other"', '"missing"'],
  ]) {
    it(`${element} receiver selects the first duplicate`, () => {
      expect(values(`a = array.from(${first}, ${second}, ${first})\nplot(a.indexof(${first}), "result")`)).toEqual(
        Array(12).fill(0),
      );
    });
    if (element !== 'bool') {
      it(`${element} receiver returns -1 for an absent series search`, () => {
        expect(
          values(
            `a = array.from(${first}, ${second}, ${first})\nneedle = bar_index % 2 == 0 ? ${first} : ${absent}\nplot(a.indexof(needle), "result")`,
          ),
        ).toEqual([0, -1, 0, -1, 0, -1, 0, -1, 0, -1, 0, -1]);
      });
    }
  }
  it('returns an integer and requires the search argument', () => {
    expect(type('a = array.from(7, 3)\nresult = a.indexof(bar_index)')).toMatchObject({ kind: 'int' });
    expect(check('a = array.from(7, 3)\nresult = a.indexof()').diagnostics.length).toBeGreaterThan(0);
  });
});

describe('ranks 284-290 and 303-309: drawing arrays', () => {
  for (const drawing of ['line', 'box']) {
    const construct = drawing === 'line' ? 'line.new(0, 10, 1, 20)' : 'box.new(0, 20, 1, 10)';
    const getter = drawing === 'line' ? 'line.get_y1' : 'box.get_top';
    const setter = drawing === 'line' ? 'line.set_y1' : 'box.set_top';
    const initial = drawing === 'line' ? 10 : 20;
    it(`${drawing} constructor returns an array of drawing IDs`, () => {
      expect(type(`result = array.new_${drawing}()`)).toMatchObject({ kind: 'array', elementType: { kind: drawing } });
    });
    it(`${drawing} omitted size is zero`, () => {
      expect(values(`a = array.new_${drawing}()\nplot(a.size(), "result")`)).toEqual(Array(12).fill(0));
    });
    it(`${drawing} omitted seed creates missing elements from index zero`, () => {
      expect(values(`a = array.new_${drawing}(2)\nplot(na(a.get(0)) and na(a.get(1)) ? 1 : 0, "result")`)).toEqual(
        Array(12).fill(1),
      );
    });
    for (const size of ['2', 'input.int(2)', 'n']) {
      it(`${drawing} admits ${size === 'n' ? 'series' : size} sizes`, () => {
        expect(values(`n = bar_index % 2 + 1\na = array.new_${drawing}(${size})\nplot(a.size(), "result")`)).toEqual(
          size === 'n' ? [1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2] : Array(12).fill(2),
        );
      });
    }
    it(`${drawing} admits a simple integer size`, () => {
      expect(values(`simple int n = 2\na = array.new_${drawing}(n)\nplot(a.size(), "result")`)).toEqual(
        Array(12).fill(2),
      );
    });
    it(`${drawing} named seed initializes every slot to the same reference`, () => {
      expect(
        values(
          `seed = ${construct}\na = array.new_${drawing}(initial_value=seed, size=2)\n${setter}(a.get(0), 99)\nplot(${getter}(a.get(1)), "result")`,
        ),
      ).toEqual(Array(12).fill(99));
    });
    it(`${drawing} default size still applies with an explicit seed`, () => {
      expect(
        values(`seed = ${construct}\na = array.new_${drawing}(initial_value=seed)\nplot(a.size(), "result")`),
      ).toEqual(Array(12).fill(0));
    });
    it(`${drawing} distinct calls create independent array structures`, () => {
      expect(
        values(
          `seed = ${construct}\na = array.new_${drawing}(1, seed)\nb = array.new_${drawing}(1, seed)\na.push(seed)\nplot(a.size() * 10 + b.size(), "result")`,
        ),
      ).toEqual(Array(12).fill(21));
      expect(
        values(`seed = ${construct}\na = array.new_${drawing}(1, seed)\nplot(${getter}(a.get(0)), "result")`),
      ).toEqual(Array(12).fill(initial));
    });
  }
});

describe('ranks 291-296: map values', () => {
  for (const method of [false, true]) {
    const call = method ? 'm.values()' : 'map.values(m)';
    it(`${call} preserves element type and insertion order`, () => {
      expect(type(`m = map.new<string, float>()\nresult = ${call}`)).toMatchObject({
        kind: 'array',
        elementType: { kind: 'float' },
      });
      expect(
        values(
          `m = map.new<string, float>()\nm.put("third", 3.5)\nm.put("first", 1.5)\nm.put("third", 4.5)\na = ${call}\nplot(a.get(0) * 10 + a.get(1), "result")`,
        ),
      ).toEqual(Array(12).fill(46.5));
    });
    it(`${call} copies array structure independently of the map`, () => {
      expect(
        values(
          `m = map.new<string, int>()\nm.put("a", 7)\na = ${call}\na.set(0, 99)\na.push(11)\nplot(m.get("a") * 100 + m.size() * 10 + a.size(), "result")`,
        ),
      ).toEqual(Array(12).fill(712));
    });
    it(`${call} shares referenced UDT state (native CF023)`, () => {
      expect(
        values(
          `type Number\n    float value\nm = map.new<string, Number>()\nm.put("a", Number.new(7))\na = ${call}\nobject = a.get(0)\nobject.value := 99\na.push(Number.new(11))\noriginal = m.get("a")\nplot(original.value + m.size(), "result")`,
        ),
      ).toEqual(Array(12).fill(100));
    });
    it(`${call} returns a defined empty array from an empty map`, () => {
      expect(values(`m = map.new<int, string>()\na = ${call}\nplot(a.size(), "result")`)).toEqual(Array(12).fill(0));
    });
  }
});

describe('ranks 297-302: array last', () => {
  for (const method of [false, true]) {
    const call = method ? 'a.last()' : 'array.last(a)';
    for (const [element, content, expected] of [
      ['int', '7, -3, 2', 2],
      ['float', '7.5, -3.5, 2.5', 2.5],
      ['bool', 'true, false', 0],
      ['string', '"first", "last"', 1],
    ] as const) {
      it(`${call} returns the last ${element} and preserves its series type`, () => {
        expect(type(`a = array.from(${content})\nresult = ${call}`)).toMatchObject({
          kind: element,
          qualifier: 'series',
        });
        const output =
          element === 'bool' ? `${call} ? 1 : 0` : element === 'string' ? `${call} == "last" ? 1 : 0` : call;
        expect(values(`a = array.from(${content})\nplot(${output}, "result")`)).toEqual(Array(12).fill(expected));
      });
    }
    it(`${call} refuses an empty array at runtime`, () => {
      const body = `a = array.new<int>()\nplot(${call}, "result")`;
      expect(check(body).diagnostics).toEqual([]);
      const result = runCompatScript(source(body));
      expect(result.errors.some((error) => /empty|bounds|size.*0/i.test(error.message))).toBe(true);
    });
  }
});

describe('ranks 310-317: matrix columns', () => {
  for (const method of [false, true]) {
    const call = method ? 'm.columns()' : 'matrix.columns(m)';
    for (const [element, seed] of [
      ['int', '7'],
      ['float', '7.5'],
      ['bool', 'true'],
      ['string', '"cell"'],
    ]) {
      it(`${call} returns columns rather than rows for a ${element} matrix`, () => {
        expect(type(`m = matrix.new<${element}>(2, 3, ${seed})\nresult = ${call}`)).toMatchObject({
          kind: 'int',
          qualifier: 'series',
        });
        expect(values(`m = matrix.new<${element}>(2, 3, ${seed})\nplot(${call}, "result")`)).toEqual(Array(12).fill(3));
      });
    }
    it(`${call} observes column insertion and deletion`, () => {
      expect(
        values(
          `m = matrix.new<int>(2, 3, 7)\nm.add_col(1, array.from(8, 9))\nfirst = ${call}\nm.remove_col(0)\nplot(first * 10 + ${call}, "result")`,
        ),
      ).toEqual(Array(12).fill(43));
    });
    it(`${call} reports zero for a defined empty matrix`, () => {
      expect(values(`m = matrix.new<int>()\nplot(${call}, "result")`)).toEqual(Array(12).fill(0));
    });
  }
});

describe('rank 318: slice sharing', () => {
  for (const method of [false, true]) {
    const call = method ? 'a.slice(1, 3)' : 'array.slice(a, 1, 3)';
    it(`${call} shares element changes in both directions`, () => {
      expect(
        values(
          `a = array.from(10, 20, 30, 40)\ns = ${call}\ns.set(0, 99)\na.set(2, 88)\nplot(a.get(1) * 100 + s.get(1), "result")`,
        ),
      ).toEqual(Array(12).fill(9988));
    });
    it(`${call} inserts and removes inside the covered parent range`, () => {
      expect(
        values(
          `a = array.from(10, 20, 30, 40)\ns = ${call}\ns.insert(1, 77)\ninserted = a.get(2)\ns.remove(0)\nplot(inserted * 100 + a.get(1), "result")`,
        ),
      ).toEqual(Array(12).fill(7777));
    });
  }
});
