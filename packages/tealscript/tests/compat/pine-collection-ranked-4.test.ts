import type { Bar } from '../../src/runtime';

import { describe, expect, it } from 'vitest';

import { parse } from '../../src/parser';
import { executeScript } from '../../src/runtime/compiledOnly';
import { checkProgram } from '../../src/semantic/checker';

const bars: Bar[] = [{ time: 1700000000000, open: 10, high: 14, low: 8, close: 12, volume: 100 }];
const source = (body: string) => `//@version=6\nindicator("Collection ranked batch4")\n${body}`;
const check = (body: string) => checkProgram(parse(source(body)));
const type = (body: string, name = 'result') => {
  const checked = check(body);
  expect(checked.diagnostics).toEqual([]);
  return checked.symbols.find((symbol) => symbol.name === name)?.type;
};
function values(body: string, expressions: string[]) {
  const result = executeScript(
    parse(source(`${body}\n${expressions.map((expression, i) => `plot(${expression}, "p${i}")`).join('\n')}`)),
    bars,
  );
  expect(result.errors, JSON.stringify(result.errors)).toEqual([]);
  expect(result.profile.swallowedErrors ?? []).toEqual([]);
  return expressions.map((_, i) => result.plots.find((plot) => plot.title === `p${i}`)?.values);
}
// All expected arithmetic below is derived by hand, not copied from engine output.
// CF022 native capture adjudicates the vector overload as array-returning.
const left = `m = matrix.new<int>(2, 3, 0)
m.set(0, 0, 2)
m.set(0, 1, -3)
m.set(0, 2, 5)
m.set(1, 0, 7)
m.set(1, 1, 11)
m.set(1, 2, -13)`;
const right = `n = matrix.new<int>(3, 2, 0)
n.set(0, 0, 17)
n.set(0, 1, 19)
n.set(1, 0, -23)
n.set(1, 1, 29)
n.set(2, 0, 31)
n.set(2, 1, -37)`;

describe('collection ranked batch4 bounded documented contracts', () => {
  it('shift METHOD removes and returns the first element while preserving remaining order (121–123)', () => {
    expect(
      values(`a = array.from(17, -8, 43)\nremoved = a.shift()`, ['removed', 'a.size()', 'a.get(0)', 'a.get(1)']),
    ).toEqual([[17], [2], [-8], [43]]);
  });
  it.each(['int', 'float', 'string', 'color'])(
    'matrix.new<%s> retains its template in returned ID (124–127)',
    (kind) => {
      expect(type(`result = matrix.new<${kind}>()`)).toEqual({
        kind: 'matrix',
        qualifier: 'series',
        elementType: { kind },
      });
    },
  );
  it('new named dimensions bind to different axes and fills every cell with the seed (128–130)', () => {
    expect(
      values('m = matrix.new<int>(initial_value=-31, columns=3, rows=2)', [
        'm.rows()',
        'm.columns()',
        'm.get(0,0)',
        'm.get(0,2)',
        'm.get(1,0)',
        'm.get(1,2)',
      ]),
    ).toEqual([[2], [3], [-31], [-31], [-31], [-31]]);
  });
  it.each([
    ['matrix.new<float>()', [0, 0, 0]],
    ['matrix.new<float>(rows=2)', [2, 0, 0]],
    ['matrix.new<float>(columns=3)', [0, 3, 0]],
  ])('omitted dimensions default independently to zero: %s (128–129)', (call, expected) => {
    expect(values(`m = ${call}`, ['m.rows()', 'm.columns()', 'm.elements_count()'])).toEqual(expected.map((x) => [x]));
  });
  it('omitted numeric matrix seed is missing in every allocated cell (130)', () => {
    expect(
      values('m = matrix.new<float>(2,3)', [
        'na(m.get(0,0)) ? 1:0',
        'na(m.get(0,2)) ? 1:0',
        'na(m.get(1,0)) ? 1:0',
        'na(m.get(1,2)) ? 1:0',
      ]),
    ).toEqual([[1], [1], [1], [1]]);
  });
  it.each(['1', 'input.int(1)', 'simpleSize', 'bar_index+1'])(
    'new accepts integer dimension qualifier %s with exact sizes (128–129)',
    (size) => {
      const body = `simple int simpleSize = 1\nm = matrix.new<int>(rows=${size}, columns=${size}+1, initial_value=17)`;
      expect(check(body).diagnostics).toEqual([]);
      expect(values(body, ['m.rows()', 'm.columns()', 'm.get(0,1)'])).toEqual([[1], [2], [17]]);
    },
  );
  for (const method of [false, true]) {
    const form = method ? 'METHOD' : 'namespace';
    it(`mult ${form} is left times right, creates independent rectangular product (131–139/148–153)`, () => {
      const call = method ? 'm.mult(n)' : 'matrix.mult(m,n)';
      const body = `${left}\n${right}\np = ${call}\np.set(0,0,97)`;
      expect(
        values(body, [
          'p.rows()',
          'p.columns()',
          'p.get(0,0)',
          'p.get(0,1)',
          'p.get(1,0)',
          'p.get(1,1)',
          'm.get(0,0)',
          'n.get(0,0)',
        ]),
      ).toEqual([[2], [2], [97], [-234], [-537], [933], [2], [17]]);
    });
    it(`mult ${form} vector returns ordered array and leaves both inputs unchanged (140–147/154–159)`, () => {
      const call = method ? 'm.mult(v)' : 'matrix.mult(m,v)';
      const body = `${left}\nv = array.from(17,-23,31)\np = ${call}\nfirst = array.get(p,0)\narray.set(p,0,97)`;
      expect(type(`${left}\nv = array.from(17,-23,31)\nresult = ${call}`)).toEqual({
        kind: 'array',
        qualifier: 'series',
        elementType: { kind: 'int' },
      });
      expect(
        values(body, [
          'first',
          'array.size(p)',
          'array.get(p,0)',
          'array.get(p,1)',
          'v.get(0)',
          'v.get(1)',
          'v.get(2)',
          'm.get(0,0)',
        ]),
      ).toEqual([[258], [2], [97], [-537], [17], [-23], [31], [2]]);
    });
    it(`mult ${form} float scalar retains integer metadata and scales every element without changing source (135/139/150/153)`, () => {
      const call = method ? 'm.mult(-0.5)' : 'matrix.mult(m,-0.5)';
      expect(type(`${left}\nresult = ${call}`)).toEqual({
        kind: 'matrix',
        qualifier: 'series',
        elementType: { kind: 'int' },
      });
      expect(
        values(`${left}\np = ${call}`, [
          'p.rows()',
          'p.columns()',
          'p.get(0,0)',
          'p.get(0,1)',
          'p.get(1,2)',
          'm.get(0,0)',
        ]),
      ).toEqual([[2], [3], [-1], [1.5], [6.5], [2]]);
    });
  }
  it.each([
    ['2', 'int', 34],
    ['input.int(2)', 'int', 34],
    ['simpleFactor', 'int', 34],
    ['bar_index+2', 'int', 34],
    ['0.5', 'int', 8.5],
    ['input.float(0.5)', 'int', 8.5],
    ['simpleFloat', 'int', 8.5],
    ['close/24', 'int', 8.5],
  ])('scalar mult accepts %s qualifier and selects %s matrix result (135/139/150/153)', (factor, kind, expected) => {
    const setup = `simple int simpleFactor = 2\nsimple float simpleFloat = 0.5\nm = matrix.new<int>(1,1,17)`;
    expect(type(`${setup}\nresult = matrix.mult(m,${factor})`)).toEqual({
      kind: 'matrix',
      qualifier: 'series',
      elementType: { kind },
    });
    expect(values(`${setup}\np = m.mult(${factor})`, ['matrix.get(p,0,0)', 'm.get(0,0)'])).toEqual([[expected], [17]]);
  });
  it.each([
    ['int', 'float', '17.0,-23.0,31.0'],
    ['float', 'int', '17,-23,31'],
    ['float', 'float', '17.0,-23.0,31.0'],
  ])('matrix<%s> times vector<%s> returns float array (146–147/157–159)', (matrixKind, _vectorKind, vector) => {
    const setup = left.replace('matrix.new<int>', `matrix.new<${matrixKind}>`);
    expect(type(`${setup}\nv = array.from(${vector})\nresult = matrix.mult(m,v)`)).toEqual({
      kind: 'array',
      qualifier: 'series',
      elementType: { kind: 'float' },
    });
    expect(
      values(`${setup}\nv = array.from(${vector})\np = m.mult(v)`, [
        'array.size(p)',
        'array.get(p,0)',
        'array.get(p,1)',
      ]),
    ).toEqual([[2], [258], [-537]]);
  });
  it('matrix.set is void and changes only the addressed cell (160)', () => {
    expect(
      values(`${left}\nmatrix.set(id=m,value=43,row=1,column=0)`, [
        'm.get(0,0)',
        'm.get(0,2)',
        'm.get(1,0)',
        'm.get(1,1)',
        'm.rows()',
        'm.columns()',
      ]),
    ).toEqual([[2], [5], [43], [11], [2], [3]]);
    expect(check(`${left}\nresult = matrix.set(m,1,0,43)`).diagnostics).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: 'type-mismatch' })]),
    );
  });
});
