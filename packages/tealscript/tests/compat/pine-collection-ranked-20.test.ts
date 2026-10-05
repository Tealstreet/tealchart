import type { Bar } from '../../src/runtime';

import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { executeScript } from '../../src/runtime/compiledOnly';
import { checkProgram } from '../../src/semantic/checker';

const bars: Bar[] = [{ time: 1700000000000, open: 10, high: 14, low: 8, close: 12, volume: 100 }];
const source = (body: string, version = 6) => `//@version=${version}\nindicator("Collection ranked batch20")\n${body}`;
const check = (body: string, version = 6) => checkProgram(parse(source(body, version)));
function values(body: string, expressions: string[], version = 6) {
  const result = executeScript(
    parse(source(`${body}\n${expressions.map((e, i) => `plot(${e}, "p${i}")`).join('\n')}`, version)),
    bars,
  );
  expect(result.errors, JSON.stringify(result.errors)).toEqual([]);
  expect(result.profile.swallowedErrors ?? []).toEqual([]);
  return expressions.map((_, i) => result.plots.find((p) => p.title === `p${i}`)?.values);
}
function type(body: string) {
  const checked = check(body);
  expect(checked.diagnostics).toEqual([]);
  return checked.symbols.find((s) => s.name === 'result')?.type;
}
const array = 'a = array.from(17,-8,43,-8,5)';
// Reference v6 methods114/115, functions535/method124, functions495/method84,
// functions472/method73 and functions518. Formula values are hand-derived.
// Native CF003 refuses numeric some in v6 despite its numeric-truthiness remark;
// numeric controls here deliberately use v5. Native CF004 pins rightmost duplicate3,
// overriding the conflicting midpoint remark. Runtime error policy belongs to B.
// Both variance overload records list both receiver kinds: fractional integer-return
// rounding remains native-needed; these integer controls have integral variances.
describe('collection ranked batch20 bounded contracts', () => {
  it.each([
    ['1,4,7', 6, 9],
    ['1.0,3.0,8.0', 26 / 3, 13],
  ])(
    'variance method distinguishes population/sample and defaults biased true: %s (761–768)',
    (elements, population, sample) => {
      const actual = values(`a = array.from(${elements})`, [
        'a.variance()',
        'a.variance(true)',
        'a.variance(biased=false)',
      ]);
      expect(actual[0]?.[0]).toBeCloseTo(Number(population), 12);
      expect(actual[1]?.[0]).toBeCloseTo(Number(population), 12);
      expect(actual[2]?.[0]).toBeCloseTo(Number(sample), 12);
    },
  );
  it.each(['int', 'float'])('empty variance method returns na for %s (762/767)', (kind) => {
    expect(values(`a = array.new<${kind}>()`, ['na(a.variance()) ? 1 : 0', 'na(a.variance(false)) ? 1 : 0'])).toEqual([
      [1],
      [1],
    ]);
  });
  it.each(['true', 'input.bool(true)', 'simpleBias', 'close > 0'])(
    'variance biased accepts bool qualifier %s (763/768)',
    (bias) => {
      const body = `simple bool simpleBias = true\na = array.from(1.0,3.0,8.0)`;
      expect(check(`${body}\nresult = a.variance(${bias})`).diagnostics).toEqual([]);
      expect(values(body, [`a.variance(${bias})`])[0]?.[0]).toBeCloseTo(26 / 3, 12);
    },
  );
  it.each([
    'array.lastindexof(a,-8)',
    'array.lastindexof(value=-8,id=a)',
    'a.lastindexof(-8)',
    'a.lastindexof(value=-8)',
  ])('lastindexof finds final occurrence and absent sentinel: %s (769–778)', (call) => {
    expect(values(array, [call, 'array.lastindexof(a,99)', 'a.lastindexof(99)', 'a.size()'])).toEqual([
      [3],
      [-1],
      [-1],
      [5],
    ]);
  });
  it.each([
    ['"z","a","z"', '"z"'],
    ['false,true,false', 'false'],
    ['1.5,-2.25,1.5', '1.5'],
  ])('lastindexof selects primitive element values: %s (773/778)', (elements, target) => {
    expect(
      values(`a = array.from(${elements})`, [`array.lastindexof(a,${target})`, `a.lastindexof(${target})`]),
    ).toEqual([[2], [2]]);
  });
  it.each([
    ['array.lastindexof(a,-8)', array, 'int'],
    ['a.lastindexof(-8)', array, 'int'],
    ['array.some(a)', 'a = array.from(false,true,false)', 'bool'],
    ['a.some()', 'a = array.from(false,true,false)', 'bool'],
    ['array.binary_search_rightmost(a,5)', 'a = array.from(4,5,5,5,6)', 'int'],
    ['a.binary_search_rightmost(5)', 'a = array.from(4,5,5,5,6)', 'int'],
  ])('scalar result is explicitly series: %s (771/776/793/795/798)', (call, setup, kind) => {
    expect(type(`${setup}\nresult = ${call}`)).toEqual({ kind, qualifier: 'series' });
  });
  it.each([
    ['array.lastindexof(a,-8)', array, 'int'],
    ['a.lastindexof(-8)', array, 'int'],
    ['array.some(a)', 'a = array.from(false,true,false)', 'bool'],
    ['a.some()', 'a = array.from(false,true,false)', 'bool'],
    ['array.binary_search_rightmost(a,5)', 'a = array.from(4,5,5,5,6)', 'int'],
    ['a.binary_search_rightmost(5)', 'a = array.from(4,5,5,5,6)', 'int'],
  ])('series result refuses const annotation: %s (771/776/793/795/798)', (call, setup, kind) => {
    expect(check(`${setup}\nconst ${kind} result = ${call}`).diagnostics).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: 'qualifier-mismatch' })]),
    );
  });
  it.each(['array.lastindexof()', 'array.lastindexof(a)', 'a.lastindexof()'])(
    'lastindexof requires receiver and value: %s (772–773/777–778)',
    (call) => {
      expect(check(`${array}\nresult = ${call}`).diagnostics.length).toBeGreaterThan(0);
    },
  );
  it.each([
    ['array.fill(a,29)', [29, 29, 29, 29, 29]],
    ['a.fill(29)', [29, 29, 29, 29, 29]],
    ['array.fill(a,29,2)', [17, -8, 29, 29, 29]],
    ['a.fill(29,index_from=2)', [17, -8, 29, 29, 29]],
    ['array.fill(index_to=4,value=29,id=a,index_from=1)', [17, 29, 29, 29, 5]],
    ['a.fill(index_to=4,value=29,index_from=1)', [17, 29, 29, 29, 5]],
  ])('fill applies full/suffix/half-open interval and preserves size: %s (779/781/783–791)', (call, expected) => {
    expect(
      values(`${array}\n${call}`, ['a.get(0)', 'a.get(1)', 'a.get(2)', 'a.get(3)', 'a.get(4)', 'a.size()']),
    ).toEqual([...(expected as number[]).map((v) => [v]), [5]]);
  });
  it.each([
    ['float', '1.5', '-2.25', 'a.get(1)', -2.25],
    ['bool', 'false', 'true', 'a.get(1) ? 1 : 0', 1],
    ['string', '"old"', '"new"', 'a.get(1) == "new" ? 1 : 0', 1],
  ])('fill admits selected %s template value (785/789)', (kind, initial, replacement, read, expected) => {
    expect(
      values(`a = array.new<${kind}>(3,${initial})\na.fill(${replacement},1,2)`, [read as string, 'a.size()']),
    ).toEqual([[expected], [3]]);
  });
  it.each(['1', 'input.int(1)', 'simpleIndex', 'bar_index+1'])(
    'fill accepts all int bound qualifiers: %s (786/790–791)',
    (index) => {
      const setup = `simple int simpleIndex = 1\n${array}`;
      expect(
        check(`${setup}\narray.fill(a,29,${index},${index}+2)\na.fill(31,${index},${index}+2)`).diagnostics,
      ).toEqual([]);
      expect(
        values(`${setup}\na.fill(29,${index},${index}+2)`, [
          'a.get(0)',
          'a.get(1)',
          'a.get(2)',
          'a.get(3)',
          'a.size()',
        ]),
      ).toEqual([[17], [29], [29], [-8], [5]]);
    },
  );
  it.each(['array.fill(a,29)', 'a.fill(29)'])('fill void cannot be assigned: %s (782/787)', (call) => {
    expect(check(`${array}\nresult = ${call}`).diagnostics).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: 'type-mismatch' })]),
    );
  });
  it.each(['array.fill()', 'array.fill(a)', 'a.fill()'])(
    'fill requires receiver and replacement: %s (784–785/789)',
    (call) => {
      expect(check(`${array}\n${call}`).diagnostics.length).toBeGreaterThan(0);
    },
  );
  it.each(['array.some(a)', 'array.some(id=a)', 'a.some()'])(
    'some distinguishes mixed/all-false booleans: %s (792–796)',
    (call) => {
      expect(values('a = array.from(false,true,false)', [`${call} ? 1 : 0`])).toEqual([[1]]);
      expect(values('a = array.from(false,false,false)', [`${call} ? 1 : 0`])).toEqual([[0]]);
    },
  );
  it.each(['0,-7,0', '0.0,0.25,0.0'])('v5 some numeric truthiness uses zero/nonzero: %s (794/796)', (elements) => {
    expect(check(`a = array.from(${elements})\nresult = a.some()`, 5).diagnostics).toEqual([]);
    expect(
      values(
        `a = array.from(${elements})\nz = array.from(0,0,0)`,
        ['array.some(a) ? 1 : 0', 'a.some() ? 1 : 0', 'array.some(z) ? 1 : 0'],
        5,
      ),
    ).toEqual([[1], [1], [0]]);
  });
  it('some requires an explicit namespace receiver (794)', () => {
    expect(check('result = array.some()').diagnostics.length).toBeGreaterThan(0);
  });
  it.each(['0,-7,0', '0.0,0.25,0.0'])('native v6 refuses numeric some arrays: %s (794; CF003)', (elements) => {
    for (const call of ['array.some(a)', 'array.some(id=a)', 'a.some()']) {
      expect(check(`a = array.from(${elements})\nresult = ${call}`).diagnostics).toEqual(
        expect.arrayContaining([expect.objectContaining({ code: 'type-mismatch' })]),
      );
    }
  });
  it.each([
    'array.binary_search_rightmost(a,5)',
    'array.binary_search_rightmost(val=5,id=a)',
    'a.binary_search_rightmost(5)',
  ])('rightmost uses native duplicate endpoint, preserving array: %s (797–800; CF004)', (call) => {
    expect(
      values('a = array.from(4,5,5,5,6)', [call, 'array.binary_search(a,5)', 'a.get(0)', 'a.get(4)', 'a.size()']),
    ).toEqual([[3], [2], [4], [6], [5]]);
  });
  it.each(['5', 'input.int(5)', 'simpleTarget', 'bar_index+5', '5.0', 'input.float(5.0)', 'simpleFloat', 'close-7.0'])(
    'rightmost admits numeric target qualifier %s (800)',
    (target) => {
      const setup = 'simple int simpleTarget = 5\nsimple float simpleFloat = 5.0\na = array.from(4.0,5.0,5.0,5.0,6.0)';
      expect(check(`${setup}\nresult = array.binary_search_rightmost(a,${target})`).diagnostics).toEqual([]);
      expect(values(setup, [`array.binary_search_rightmost(a,${target})`])).toEqual([[3]]);
    },
  );
  it.each(['array.binary_search_rightmost()', 'array.binary_search_rightmost(a)', 'a.binary_search_rightmost()'])(
    'rightmost requires ID and target: %s (799–800)',
    (call) => {
      expect(check(`a = array.from(4,5,6)\nresult = ${call}`).diagnostics.length).toBeGreaterThan(0);
    },
  );
});
